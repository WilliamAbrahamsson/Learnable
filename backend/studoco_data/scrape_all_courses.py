#!/usr/bin/env python3
"""
Studocu Multi-University Scraper (Stable + Memory Safe)
-------------------------------------------------------
✅ Handles SIGTRAP / Aw Snap crashes
✅ Restarts Chromium every 25 universities
✅ Blocks image requests to save memory
✅ Logs failed universities to failed.json
✅ Skips already scraped ones
✅ Resumes automatically
"""

import json
import os
import re
import time
import random
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError

# -------------------------------
# SETTINGS
# -------------------------------
INPUT_FILE = "universities.json"
COURSES_DIR = Path("courses")
FAILED_FILE = "failed.json"
HEADLESS = False
NAV_TIMEOUT = 60000

# pacing
SCROLL_PAUSE = (0.8, 1.5)
COURSE_PAUSE = (1.8, 3.5)
UNI_COOLDOWN = (4.0, 8.0)
RETRY_COOLDOWN = (10, 20)
BROWSER_RESET_INTERVAL = 25   # restart every 25 unis

# -------------------------------
# HELPERS
# -------------------------------
def rdelay(a, b):
    """Random human-like delay."""
    d = random.uniform(a, b)
    time.sleep(d)
    return d


def slugify(name: str) -> str:
    name = name.lower()
    name = re.sub(r"[^a-z0-9åäöüéèêëïíìîçñ ]+", "", name)
    name = re.sub(r"\s+", "-", name.strip())
    return name


def accept_cookies(page):
    """Accept cookie popup if it appears."""
    selectors = [
        "button:has-text('Acceptera alla')",
        "button:has-text('Tillåt alla')",
        "button:has-text('Accept all')",
        "button:has-text('OK')",
    ]
    for sel in selectors:
        try:
            if page.locator(sel).is_visible():
                page.click(sel)
                print(f"🍪 Clicked cookie button ({sel})")
                time.sleep(1.5)
                return True
        except Exception:
            continue
    print("🍪 No cookie popup found")
    return False


def scroll_to_bottom(page):
    """Scroll until no new content appears."""
    last_height = page.evaluate("document.body.scrollHeight")
    while True:
        page.mouse.wheel(0, random.randint(800, 2000))
        rdelay(*SCROLL_PAUSE)
        new_height = page.evaluate("document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height


def scrape_courses(page):
    """Extract all course names, codes, and URLs."""
    anchors = page.query_selector_all("a[href*='/course/']")
    courses = []
    for a in anchors:
        href = a.get_attribute("href")
        if not href:
            continue
        text_nodes = a.evaluate("""(el) => {
            return Array.from(el.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent.trim())
                .filter(Boolean);
        }""")

        name, code = None, None
        if len(text_nodes) >= 2:
            name, code = text_nodes[0], text_nodes[1]
        elif len(text_nodes) == 1:
            raw = text_nodes[0].strip()
            match = re.match(r"^(.*?)([A-Za-zÅÄÖåäö]?\d{1,2}[A-Za-zÅÄÖåäö]?\d{3,4})$", raw)
            if match:
                name, code = match.group(1).strip(), match.group(2).strip()
            else:
                name = raw
        if name:
            courses.append({"name": name, "code": code, "url": href})
    return courses


def save_university_courses(uni_id, uni_name, courses):
    """Save courses to per-university file."""
    COURSES_DIR.mkdir(exist_ok=True)
    slug = slugify(uni_name)
    file_path = COURSES_DIR / f"{uni_id}_{slug}.json"
    tmp = file_path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({
            "university_id": uni_id,
            "university_name": uni_name,
            "courses": courses
        }, f, indent=2, ensure_ascii=False)
    os.replace(tmp, file_path)
    print(f"💾 Saved {len(courses)} courses → {file_path.name}")


def log_failed(uni_id, uni_name, reason):
    """Append to failed.json file."""
    failed = []
    if Path(FAILED_FILE).exists():
        with open(FAILED_FILE, "r", encoding="utf-8") as f:
            failed = json.load(f)
    failed.append({
        "id": uni_id,
        "name": uni_name,
        "reason": str(reason)
    })
    with open(FAILED_FILE, "w", encoding="utf-8") as f:
        json.dump(failed, f, indent=2, ensure_ascii=False)
    print(f"⚠️ Logged failed university {uni_name} ({uni_id})")


def setup_browser(p):
    """Create a fresh browser and page with safe flags."""
    browser = p.chromium.launch(
        headless=HEADLESS,
        args=[
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-features=IsolateOrigins,site-per-process,TranslateUI",
            "--disable-blink-features=AutomationControlled"
        ]
    )
    context = browser.new_context(locale="en-US")

    # Block images to save memory
    context.route("**/*", lambda route: route.abort() if route.request.resource_type == "image" else route.continue_())

    page = context.new_page()
    return browser, context, page


# -------------------------------
# MAIN
# -------------------------------
def main():
    if not Path(INPUT_FILE).exists():
        print(f"❌ Missing {INPUT_FILE}")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        universities = json.load(f)

    COURSES_DIR.mkdir(exist_ok=True)
    existing_files = {p.stem.split("_")[0] for p in COURSES_DIR.glob("*.json")}
    print(f"📚 Loaded {len(universities)} universities, {len(existing_files)} already done.\n")

    with sync_playwright() as p:
        browser, context, page = setup_browser(p)
        cookies_accepted = False
        counter = 0

        for uni in universities:
            uni_data = uni.get("data", {})
            uni_id = str(uni_data.get("id"))
            uni_name = uni_data.get("name")
            region = uni_data.get("region", {}).get("code", "en")

            if not uni_id or not uni_name:
                continue
            if uni_id in existing_files:
                continue  # skip already scraped

            slug = slugify(uni_name)
            url = f"https://www.studocu.com/{region}/institution/{slug}/{uni_id}"
            print(f"\n🏫 {uni_name} ({uni_id}) → {url}")

            # Restart browser periodically to avoid memory leaks
            if counter > 0 and counter % BROWSER_RESET_INTERVAL == 0:
                print("🧹 Restarting browser to free memory...")
                browser.close()
                rdelay(10, 15)
                browser, context, page = setup_browser(p)
                cookies_accepted = False

            counter += 1

            # Navigate safely
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT)
            except Exception as e:
                print(f"💥 Page crash or timeout for {uni_name}: {e}")
                log_failed(uni_id, uni_name, e)
                try:
                    page.close()
                except:
                    pass
                page = context.new_page()
                rdelay(*RETRY_COOLDOWN)
                continue

            if not cookies_accepted:
                cookies_accepted = accept_cookies(page)

            print("⬇️ Scrolling slowly through page...")
            scroll_to_bottom(page)
            rdelay(*COURSE_PAUSE)

            try:
                courses = scrape_courses(page)
                print(f"  → Found {len(courses)} courses")
                save_university_courses(uni_id, uni_name, courses)
            except Exception as e:
                print(f"❌ Error scraping {uni_name}: {e}")
                log_failed(uni_id, uni_name, e)
                continue

            cooldown = rdelay(*UNI_COOLDOWN)
            print(f"😴 Cooling down for {cooldown:.1f}s before next university...")

        browser.close()

    print("\n✅ Finished scraping all universities!")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Studocu University Course Scraper — Popular Tab Only
---------------------------------------------------------
• Opens a Studocu university page.
• Accepts cookies automatically.
• Scrolls through the 'Populära' tab (which lists all courses).
• Extracts clean course names, codes, and URLs.
• Handles merged or split name/code text.
• Saves results to JSON safely.
---------------------------------------------------------
"""

import json
import os
import re
import time
from playwright.sync_api import sync_playwright, TimeoutError

# -------------------------------
# SETTINGS
# -------------------------------
UNIVERSITY_URL = "https://www.studocu.com/nl/institution/universiteit-van-amsterdam/4"
OUTPUT_FILE = "amsterdam_courses.json"
HEADLESS = False
NAV_TIMEOUT = 60000
SCROLL_PAUSE = 0.5


# -------------------------------
# FILE HELPERS
# -------------------------------
def save_data(data):
    """Safely save JSON data."""
    tmp = OUTPUT_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp, OUTPUT_FILE)


# -------------------------------
# SCRAPER HELPERS
# -------------------------------
def accept_cookies(page):
    """Click 'Accept all cookies' if popup appears."""
    try:
        page.wait_for_selector("button:has-text('Acceptera alla')", timeout=5000)
        page.click("button:has-text('Acceptera alla')")
        print("🍪 Accepted cookies")
        time.sleep(1)
    except TimeoutError:
        print("🍪 No cookie popup found")


def scroll_to_bottom(page):
    """Scroll until no new content appears."""
    last_height = page.evaluate("document.body.scrollHeight")
    while True:
        page.mouse.wheel(0, 2500)
        time.sleep(SCROLL_PAUSE)
        new_height = page.evaluate("document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height


def scrape_courses(page):
    """Extract all course names, codes, and URLs (handles merged and split text nodes)."""
    courses = []
    anchors = page.query_selector_all("a[href*='/course/']")
    for a in anchors:
        href = a.get_attribute("href")
        if not href:
            continue

        # Extract text nodes only (skip icons etc.)
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
            # Handle cases like "Adaptive Software Systems4DV610"
            match = re.match(r"^(.*?)([A-Za-zÅÄÖåäö]?\d{1,2}[A-Za-zÅÄÖåäö]?\d{3,4})$", raw)
            if match:
                name, code = match.group(1).strip(), match.group(2).strip()
            else:
                name = raw
        else:
            continue

        if name:
            courses.append({
                "name": name,
                "code": code,
                "url": href
            })

    return courses


# -------------------------------
# MAIN SCRAPER
# -------------------------------
def main():
    print(f"🌍 Opening {UNIVERSITY_URL}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS, args=["--no-sandbox"])
        context = browser.new_context(locale="sv-SE")
        page = context.new_page()

        try:
            page.goto(UNIVERSITY_URL, wait_until="domcontentloaded", timeout=NAV_TIMEOUT)
        except Exception as e:
            print(f"⚠️ Timeout while loading: {e}, retrying...")
            page.goto(UNIVERSITY_URL, wait_until="domcontentloaded", timeout=NAV_TIMEOUT)

        accept_cookies(page)
        time.sleep(2)

        print("⬇️ Scrolling through all courses...")
        scroll_to_bottom(page)
        courses = scrape_courses(page)

        unique = []
        seen = set()
        for c in courses:
            key = (c["name"], c.get("code"))
            if key not in seen:
                seen.add(key)
                unique.append(c)

        save_data(unique)
        browser.close()
        print(f"\n✅ Done! Saved {len(unique)} unique courses to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

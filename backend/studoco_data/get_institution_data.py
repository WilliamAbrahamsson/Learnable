#!/usr/bin/env python3
"""
Studocu University Scraper — Playwright Chrome bot
Fetches all valid university JSON responses directly from the browser network.
Continues until 1000 consecutive failed IDs, and resumes from last saved ID.
If rate-limited (invalid JSON or blocked), it closes the browser, waits 5s, restarts, and continues.
"""

import json
import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_FILE = "universities.json"
MAX_FAILED = 10000     # stop after this many consecutive invalid IDs
DELAY = 0.1           # seconds between normal requests
RATE_LIMIT_DELAY = 5  # seconds to sleep after restarting browser
HEADLESS = False      # set True for background scraping


# -------------------------------
# File helpers
# -------------------------------
def load_existing():
    """Load already saved results (if any)."""
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_data(data):
    """Save safely after every update."""
    tmp = OUTPUT_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp, OUTPUT_FILE)


def get_last_id(data):
    """Return the highest successfully saved university ID."""
    ids = [d.get("data", {}).get("id") for d in data if isinstance(d, dict) and "data" in d]
    return max(ids) if ids else 1


def create_browser(playwright):
    """Launch a new browser and return page instance."""
    browser = playwright.chromium.launch(headless=HEADLESS, args=["--no-sandbox"])
    context = browser.new_context(locale="en-US")
    page = context.new_page()
    return browser, context, page


# -------------------------------
# Main logic
# -------------------------------
def main():
    data = load_existing()
    existing_ids = {d.get("data", {}).get("id") for d in data if isinstance(d, dict) and "data" in d}
    start_id = get_last_id(data) + 1

    with sync_playwright() as p:
        browser, context, page = create_browser(p)

        print(f"Resuming from ID {start_id}, already have {len(existing_ids)} valid entries\n")

        failed_in_a_row = 0
        uid = start_id

        while True:
            if uid in existing_ids:
                print(f"Skipping {uid}")
                uid += 1
                continue

            url = f"https://www.studocu.com/rest-api/v1/universities/{uid}"
            print(f"Fetching {url} ...", end=" ", flush=True)

            try:
                with page.expect_response(url) as resp_info:
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)
                response = resp_info.value
                status = response.status
                text = response.text()

                # Try parsing the JSON
                try:
                    payload = json.loads(text)
                except json.JSONDecodeError:
                    print("⚠️ Invalid JSON (rate-limited). Restarting browser...")
                    failed_in_a_row += 1

                    # Restart browser
                    browser.close()
                    time.sleep(RATE_LIMIT_DELAY)
                    browser, context, page = create_browser(p)

                    uid += 1
                    continue

                # Valid JSON but check content
                if "data" in payload and isinstance(payload["data"], dict):
                    data.append(payload)
                    print(f"✅ ID {uid} OK (saved)")
                    failed_in_a_row = 0
                    existing_ids.add(uid)
                else:
                    print(f"❌ ID {uid} invalid ({status})")
                    failed_in_a_row += 1

                save_data(data)
                time.sleep(DELAY)

                if failed_in_a_row >= MAX_FAILED:
                    print(f"\n⛔ Stopping — {failed_in_a_row} consecutive failed IDs.")
                    break

                uid += 1

            except Exception as e:
                print(f"⚠️ Error fetching {uid}: {e}")
                failed_in_a_row += 1

                # Restart browser in case of browser crash / network block
                try:
                    browser.close()
                except Exception:
                    pass

                time.sleep(RATE_LIMIT_DELAY)
                browser, context, page = create_browser(p)
                uid += 1

                if failed_in_a_row >= MAX_FAILED:
                    print(f"\n⛔ Stopping — {failed_in_a_row} consecutive failed IDs.")
                    break

        browser.close()
        print(f"\n✅ Done! Saved {len(data)} valid entries to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

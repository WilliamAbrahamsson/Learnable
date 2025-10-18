#!/usr/bin/env python3
"""
Count unique objects in a JSON file (e.g. universities_browser.json)
by their "id" or any other unique key.
"""

import json
import sys
from collections import Counter

# ----------------------------
# Config
# ----------------------------
DEFAULT_FILE = "universities.json"
KEY = "id"  # which field to treat as unique identifier


def main(filename=DEFAULT_FILE):
    try:
        with open(filename, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Error reading {filename}: {e}")
        sys.exit(1)

    print(f"Loaded {len(data)} total entries from {filename}")

    ids = []
    for item in data:
        # Handles both direct and nested {"data": {...}} structures
        if isinstance(item, dict):
            if KEY in item:
                ids.append(item[KEY])
            elif "data" in item and isinstance(item["data"], dict) and KEY in item["data"]:
                ids.append(item["data"][KEY])

    counts = Counter(ids)
    unique = len(counts)
    duplicates = [i for i, c in counts.items() if c > 1]

    print(f"✅ Unique {KEY}s: {unique}")
    print(f"📦 Total objects: {len(ids)}")

    if duplicates:
        print(f"⚠️ Found {len(duplicates)} duplicate IDs:")
        print(duplicates[:20], "..." if len(duplicates) > 20 else "")
    else:
        print("🎉 No duplicates found.")

    print("\nDone.")


if __name__ == "__main__":
    # Allow passing filename as argument: python count_unique_json.py mydata.json
    if len(sys.argv) > 1:
        main(sys.argv[1])
    else:
        main()

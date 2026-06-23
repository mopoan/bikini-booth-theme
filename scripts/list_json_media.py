import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
shopify_media = set()
external = []

for path in ROOT.rglob("*.json"):
    text = path.read_text(encoding="utf-8", errors="replace")
    start = text.find("{")
    if start < 0:
        continue
    try:
        data = json.loads(text[start:])
    except json.JSONDecodeError:
        continue

    def walk(obj):
        if isinstance(obj, dict):
            for v in obj.values():
                walk(v)
        elif isinstance(obj, list):
            for v in obj:
                walk(v)
        elif isinstance(obj, str):
            for m in re.findall(r"shopify://[^\s\"\\]+", obj):
                if "/videos/" in m or "/shop_images/" in m or "/files/" in m:
                    shopify_media.add(m)
            for m in re.findall(r"https?://[^\s\"\\]+", obj):
                if any(
                    x in m
                    for x in (
                        "unsplash",
                        "dropbox",
                        "vercel",
                        "0692/4022",
                        "cdn.shopify.com/s/files",
                    )
                ):
                    external.append((path.relative_to(ROOT).as_posix(), m))

    walk(data)

print("=== shopify:// images & videos in JSON templates ===")
for item in sorted(shopify_media):
    print(item)

print("\n=== external / hardcoded CDN in JSON ===")
seen = set()
for file, url in sorted(external):
    key = (file, url)
    if key in seen:
        continue
    seen.add(key)
    print(f"{file}\n  {url}")

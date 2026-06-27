import json
from pathlib import Path

NEW_CDN_BASE = "https://cdn.shopify.com/s/files/1/1006/3341/1874/files/"
OLD_CDN_BASE = "https://cdn.shopify.com/s/files/1/0692/4022/5894/files/"
NEW_MARQUEE_QUERY = "v=1782216160"
BANNER_1_URL = "https://cdn.shopify.com/s/files/1/1006/3341/1874/files/Banner_1.png?v=1782216162"
BANNER_2_URL = "https://cdn.shopify.com/s/files/1/1006/3341/1874/files/Banner_2.png?v=1782216160"

# Original index.json content from user (JSON only)
INDEX = r"""
PASTE_MARKER
"""

HEADER = """/*
 * ------------------------------------------------------------
 * IMPORTANT: The contents of this file are auto-generated.
 *
 * This file may be updated by the Shopify admin theme editor
 * or related systems. Please exercise caution as any changes
 * made to this file may be overwritten.
 * ------------------------------------------------------------
 */
"""


def walk(obj):
    if isinstance(obj, dict):
        for k, v in list(obj.items()):
            if isinstance(v, str):
                obj[k] = transform_string(k, v)
            else:
                walk(v)
    elif isinstance(obj, list):
        for item in obj:
            walk(item)


def transform_string(key: str, value: str) -> str:
  if not value:
    return value

  # Old store CDN → new store CDN (same filename)
  if OLD_CDN_BASE in value:
    return value.replace(OLD_CDN_BASE, NEW_CDN_BASE)

  # Remove external fallbacks when primary media uses Shopify assets
  if key in {
      "hero_image_url",
      "logo_image_url",
      "image_url",
      "external_video_url",
      "video_url",
  }:
    lower = value.lower()
    if any(
        x in lower
        for x in (
            "vercel-storage",
            "unsplash.com",
            "dropbox.com",
            "youtube.com",
            "youtu.be",
        )
    ):
      return ""
    # Maps links stored in image_url are not image assets
    if key == "image_url" and ("maps.app.goo.gl" in lower or "google.com/maps" in lower):
      return ""

  return value


def main():
    src = Path(__file__).resolve().parents[1] / "templates" / "index.source.json"
    out = Path(__file__).resolve().parents[1] / "templates" / "index.json"
    data = json.loads(src.read_text(encoding="utf-8"))
    walk(data)

    # Marquee strip cache-bust query for numbered files on new store
    marquee = data.get("sections", {}).get("bb_sf_marquee", {}).get("settings", {})
    if marquee.get("use_shopify_files_urls"):
        marquee["files_base_url"] = NEW_CDN_BASE
        marquee["files_url_query"] = NEW_MARQUEE_QUERY

    # Promo banners use uploaded Files CDN URLs on the new store
    promo = data.get("sections", {}).get("bb_sf_promo_full", {}).get("settings", {})
    if promo:
        promo["image_url"] = BANNER_1_URL

    media = data.get("sections", {}).get("bb_media_banner_2", {}).get("settings", {})
    if media:
        media["image_url"] = BANNER_2_URL

    out.write_text(HEADER + json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

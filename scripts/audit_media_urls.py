import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", "node_modules", "scripts"}
EXTS = {".json", ".liquid", ".css", ".js", ".html"}

OLD_STORE = "0692/4022/5894"
NEW_STORE = "1006/3341/1874"

url_re = re.compile(r"https?://[^\s\"'<>\\]+")
shopify_re = re.compile(r"shopify://[^\s\"'<>\\]+")

findings = []


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def add(path, kind, value, note=""):
    findings.append({"file": rel(path), "kind": kind, "value": value, "note": note})


def walk_strings(obj, path: Path, key_path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            walk_strings(v, path, f"{key_path}.{k}" if key_path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk_strings(v, path, f"{key_path}[{i}]")
    elif isinstance(obj, str):
        for m in url_re.findall(obj):
            classify_http(path, m, key_path)
        for m in shopify_re.findall(obj):
            classify_shopify(path, m, key_path)


def classify_http(path, url, key_path):
    lower = url.lower()
    if OLD_STORE in url:
        add(path, "OLD_STORE_CDN", url, key_path)
        return
    if "cdn.shopify.com/s/files" in url and NEW_STORE not in url:
        add(path, "OTHER_SHOPIFY_CDN", url, key_path)
        return
    if "vercel-storage" in lower or "blob.vercel" in lower:
        add(path, "VERCEL_BLOB", url, key_path)
        return
    if "dropbox.com" in lower:
        add(path, "DROPBOX", url, key_path)
        return
    if "unsplash.com" in lower:
        add(path, "UNSPLASH", url, key_path)
        return
    if any(x in lower for x in (".mp4", ".mov", ".webm", ".m4v", "youtube.com", "youtu.be", "vimeo.com")):
        add(path, "EXTERNAL_VIDEO", url, key_path)
        return
    if any(
        x in lower
        for x in (
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
            ".gif",
            ".svg",
            ".avif",
            "images.",
            "/files/",
        )
    ):
        if "maps." in lower or "google.com/maps" in lower:
            return
        if "help.shopify.com" in lower:
            return
        if "shopifycloud" in lower:
            return
        if "fonts.shopify" in lower:
            return
        add(path, "EXTERNAL_IMAGE", url, key_path)


def classify_shopify(path, url, key_path):
    if "/videos/" in url or url.endswith(".mp4") or url.endswith(".mov") or url.endswith(".webm"):
        add(path, "SHOPIFY_VIDEO", url, key_path)
    elif "/shop_images/" in url or "/files/" in url:
        add(path, "SHOPIFY_IMAGE", url, key_path)
    else:
        add(path, "SHOPIFY_OTHER", url, key_path)


def scan_file(path: Path):
    text = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix == ".json":
        start = text.find("{")
        if start == -1:
            start = text.find("[")
        if start != -1:
            try:
                walk_strings(json.loads(text[start:]), path)
                return
            except json.JSONDecodeError:
                pass
    for m in url_re.findall(text):
        classify_http(path, m, "inline")
    for m in shopify_re.findall(text):
        classify_shopify(path, m, "inline")


for path in ROOT.rglob("*"):
    if not path.is_file():
        continue
    if any(part in SKIP_DIRS for part in path.parts):
        continue
    if path.suffix.lower() not in EXTS:
        continue
    scan_file(path)

ORDER = [
    "OLD_STORE_CDN",
    "OTHER_SHOPIFY_CDN",
    "VERCEL_BLOB",
    "DROPBOX",
    "EXTERNAL_VIDEO",
    "EXTERNAL_IMAGE",
    "UNSPLASH",
    "SHOPIFY_VIDEO",
    "SHOPIFY_IMAGE",
]

by_kind = {k: [] for k in ORDER}
for f in findings:
    by_kind.setdefault(f["kind"], []).append(f)

for kind in ORDER:
    items = by_kind.get(kind, [])
    if not items:
        continue
    seen = set()
    print(f"\n=== {kind} ({len(items)}) ===")
    for item in items:
        key = (item["file"], item["value"])
        if key in seen:
            continue
        seen.add(key)
        note = f" [{item['note']}]" if item["note"] else ""
        print(f"  {item['file']}{note}")
        print(f"    {item['value']}")

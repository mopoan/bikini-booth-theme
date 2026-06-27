import json
import re
import sys

if len(sys.argv) > 1 and sys.argv[1] != "-":
    with open(sys.argv[1], encoding="utf-8-sig") as f:
        text = f.read()
else:
    text = sys.stdin.read()

json_start = text.find("{")
data = json.loads(text[json_start:])

urls = set()


def walk(o):
    if isinstance(o, dict):
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)
    elif isinstance(o, str):
        for m in re.findall(r"https?://[^\s\"\\]+", o):
            urls.add(m)
        for m in re.findall(r"shopify://[^\s\"\\]+", o):
            urls.add(m)


walk(data)
for u in sorted(urls):
    print(u)

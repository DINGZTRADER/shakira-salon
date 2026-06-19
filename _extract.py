import json, re, os, sys

SRC = r"E:/projects/shakira/import anthropic.txt"
ROOT = r"E:/projects/shakira"

text = open(SRC, encoding="utf-8").read()

# Locate the messages=[ ... ] list and parse it as JSON via raw_decode.
i = text.index("messages=")
br = text.index("[", i)
messages, _ = json.JSONDecoder().raw_decode(text, br)

# Collect assistant text blocks in order.
blocks = []
for m in messages:
    if m.get("role") != "assistant":
        continue
    content = m.get("content", [])
    if isinstance(content, str):
        blocks.append(content)
        continue
    for c in content:
        if c.get("type") == "text":
            blocks.append(c["text"])

# Regex: "## `path`" header followed by a fenced code block.
pat = re.compile(r"^## `([^`]+)`\s*?\n+```[\w.+-]*\n(.*?)\n```", re.M | re.S)

written = {}
order = []
for b in blocks:
    for mo in pat.finditer(b):
        path = mo.group(1).strip()
        code = mo.group(2)
        if path not in written:
            order.append(path)
        written[path] = code  # later (higher step) supersedes

for path in order:
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8", newline="\n") as f:
        f.write(written[path])
        if not written[path].endswith("\n"):
            f.write("\n")

print(f"Wrote {len(written)} files:")
for p in order:
    print(f"  {p}  ({len(written[p])} bytes)")

"""Each of the key's text sheets read alone, no template and no constants: as a lone sheet on Load.
    docker cp fx-suite-updates/drives/sheet-key.py intelcost-bench-api-1:/tmp/sk.py
    docker compose exec -T api sh -lc "cd /srv && PYTHONPATH=/srv:/srv/drives:/tmp python -" < lone-key.py
"""

import importlib.util
import json
import pathlib
import sys

sys.argv = ["sk"]
spec = importlib.util.spec_from_file_location("sk", "/tmp/sk.py")
sk = importlib.util.module_from_spec(spec)
src = pathlib.Path("/tmp/sk.py").read_text(encoding="utf-8").split("if __name__")[0]
exec(compile(src, "/tmp/sk.py", "exec"), sk.__dict__)
root = pathlib.Path("/tmp/sheet-key")
manifest = {m["sheet"]: m for m in json.loads((root / "manifest.json").read_text())}
key = json.loads((root / "key.json").read_text())
right = wrong_n = none = 0
rows = []
for k in key["sheets"]:
    m = manifest.get(k["sheet"])
    if m is None or k.get("title") is None:
        continue
    doc, page, page_text, pieces = sk._page(root / m["file"])
    if not pieces:
        continue
    w, h = page.rect.width or 1, page.rect.height or 1
    got = sk.naming.locate(sk.naming.spans(page, page_text), w, h, sk.naming.file_number(m["file_name"]))
    ok = sk._norm_title(got.title) == sk._norm_title(k["title"])
    right += ok
    none += not got.title
    rows.append(f"{'ok ' if ok else 'BAD'} {k['title'][:44]!r:48} got {got.number!r} {(got.title or '')[:70]!r}")
print(f"lone sheets with a title: {len(rows)}, title right {right}, no title {none}")
print("\n".join(r for r in rows if r.startswith("BAD")))

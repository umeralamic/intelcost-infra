#!/usr/bin/env bash
# GPS Export's free-reader check (D-664, G6), run by hand like the quantity table: not a test suite.
#
#   ./gps-check.sh <folder or .zip of a GPS Export>
#
# In a throwaway python container (nothing installed on the bench):
#   - every .xml against the LandXML 1.2 schema (xmllint, the schema from landxml.org);
#   - every .dxf through ezdxf (MIT): version AC1009, audit() clean, only the entities GPS Export writes
#     (3D POLYLINE, 3DFACE, TEXT), every polyline 3D;
#   - every .csv: five fields a row, numbers where numbers go, no header row.
# Prints one line a file and a last line "gps check: passed" or "gps check: FAILED".
set -euo pipefail

src="${1:?a folder or a .zip of a GPS Export}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
# A zip is unzipped in the container.
if [[ "$src" == *.zip ]]; then cp "$src" "$work/"; else cp -r "$src"/. "$work/"; fi

cat > "$work/.check.sh" <<'EOF'
set -e
apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq libxml2-utils unzip >/dev/null 2>&1
pip install -q ezdxf==1.4.2 >/dev/null 2>&1
cd /gps
for z in *.zip; do [ -e "$z" ] && unzip -qo "$z" && rm "$z"; done
python - <<'PY'
import csv, glob, subprocess, sys, urllib.request
ok = True
schema = "/tmp/LandXML-1.2.xsd"
open(schema, "wb").write(urllib.request.urlopen("http://www.landxml.org/schema/LandXML-1.2/LandXML-1.2.xsd", timeout=60).read())
for f in sorted(glob.glob("*.xml")):
    r = subprocess.run(["xmllint", "--noout", "--schema", schema, f], capture_output=True, text=True)
    good = r.returncode == 0
    ok &= good
    print(f"{'ok  ' if good else 'FAIL'} {f}: LandXML 1.2 schema {'valid' if good else r.stderr.strip()[-300:]}")
import ezdxf
from ezdxf import recover
for f in sorted(glob.glob("*.dxf")):
    doc, _ = recover.readfile(f)
    audit = doc.audit()
    types = {}
    for e in doc.modelspace():
        types[e.dxftype()] = types.get(e.dxftype(), 0) + 1
    flat = [e for e in doc.modelspace() if e.dxftype() == "POLYLINE" and not e.is_3d_polyline]
    good = doc.dxfversion == "AC1009" and not audit.errors and set(types) <= {"POLYLINE", "3DFACE", "TEXT"} and not flat
    ok &= good
    print(f"{'ok  ' if good else 'FAIL'} {f}: {doc.dxfversion}, audit errors {len(audit.errors)}, entities {types}, 2D polylines {len(flat)}")
for f in sorted(glob.glob("*.csv")):
    rows = list(csv.reader(open(f, newline="")))
    def num(v):
        try:
            float(v)
            return True
        except ValueError:
            return False
    bad = [i + 1 for i, r in enumerate(rows) if len(r) != 5 or not all(num(v) for v in r[:4])]
    good = bool(rows) and not bad
    ok &= good
    print(f"{'ok  ' if good else 'FAIL'} {f}: {len(rows)} rows{', bad rows ' + str(bad[:5]) if bad else ''}")
print(f"gps check: {'passed' if ok else 'FAILED'}")
sys.exit(0 if ok else 1)
PY
EOF
MSYS_NO_PATHCONV=1 docker run --rm -v "$(cygpath -w "$work" 2>/dev/null || echo "$work"):/gps" python:3.14-slim bash /gps/.check.sh 2>&1 | grep -vE "^debconf|^\s*$"

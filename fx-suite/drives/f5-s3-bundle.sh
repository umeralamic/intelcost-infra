#!/bin/sh
# F5-S3 AC2: in the production bundle, the takeoff page and its canvas are their own
# chunk, and nothing of pdf.js or the canvas is in the entry the dashboard loads.
#
#   sh intelcost-infra/drives/f5-s3-bundle.sh
#
# Run from the host, against the app container, because `dist/` lives in the app image
# and only `src` is bind-mounted (see f3-s13-bundle.sh).
#
# A contrast, not an absence: each canvas pattern must be in the SOURCE, absent from the
# ENTRY chunk and present in the TAKEOFF chunk, so a typo cannot pass by finding nothing.
# pdf.js is checked the same way once it is a dependency; until then the drive says so.
set -eu
cd "$(dirname "$0")/.."

fail=0
count() { docker compose exec -T app sh -lc "$1" | tr -dc '0-9'; }

echo "=== f5-s3 AC2: takeoff code only in the takeoff chunks ==="
docker compose exec -T app sh -lc "npm run build >/dev/null 2>&1"
entry=$(docker compose exec -T app sh -lc "ls /app/dist/assets/index-*.js | head -1" | tr -d '\r')
takeoff=$(docker compose exec -T app sh -lc "ls /app/dist/assets/ProjectTakeoff-*.js | head -1" | tr -d '\r')
[ -n "$takeoff" ] || { echo "FAIL  no ProjectTakeoff chunk"; exit 1; }
echo "      entry $(basename "$entry") · takeoff $(basename "$takeoff")"

check() {  # check "label" "pattern" source-file
  src=$(count "grep -c '$2' /app/src/$3 || true")
  in_entry=$(count "grep -o '$2' '$entry' | wc -l")
  in_takeoff=$(count "grep -o '$2' '$takeoff' | wc -l")
  if [ "${src:-0}" -gt 0 ] && [ "${in_entry:-0}" -eq 0 ] && [ "${in_takeoff:-0}" -gt 0 ]; then
    printf 'PASS  %-34s source %s · entry %s · takeoff %s\n' "$1" "$src" "$in_entry" "$in_takeoff"
  else
    printf 'FAIL  %-34s source %s · entry %s · takeoff %s\n' "$1" "$src" "$in_entry" "$in_takeoff"
    fail=1
  fi
}

check "the canvas (SheetCanvas)" 'Drawing sheet' features/takeoff/components/SheetCanvas.tsx
check "colleagues' drafts (DraftLayer)" 'data-draft' features/takeoff/components/DraftLayer.tsx

if docker compose exec -T app sh -lc "test -d /app/node_modules/pdfjs-dist"; then
  in_entry=$(count "grep -o 'GlobalWorkerOptions' '$entry' | wc -l")
  anywhere=$(count "grep -lo 'GlobalWorkerOptions' /app/dist/assets/*.js | wc -l")
  if [ "${in_entry:-0}" -eq 0 ] && [ "${anywhere:-0}" -gt 0 ]; then
    printf 'PASS  %-34s entry %s · lazy chunks %s\n' "pdf.js only in lazy chunks" "$in_entry" "$anywhere"
  else
    printf 'FAIL  %-34s entry %s · lazy chunks %s\n' "pdf.js only in lazy chunks" "$in_entry" "$anywhere"
    fail=1
  fi
else
  echo "NOTE  pdf.js is not a dependency yet (Block B's Choose pages brings it); nothing of it can be in the entry"
fi

exit "$fail"

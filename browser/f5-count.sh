#!/usr/bin/env bash
# F5 Block B, first subtask: a Load counts a 519 MB PDF's pages by ranged reads, never
# downloading it (drives/f5-count.py). No browser.
#
#   ./browser/f5-count.sh      (from intelcost-infra/; regress.sh runs it too)

set -u
cd "$(dirname "$0")/.."
echo "=== f5-count ==="
out=$(docker compose exec -T api sh -lc "cd /srv && python drives/f5-count.py" 2>&1)
status=$?
grep -E '^(made|loaded|counted|broken|FAIL)|Traceback|Error' <<<"$out" | sed 's/^/      /'
if [ $status -eq 0 ] && ! grep -q '^FAIL' <<<"$out"; then echo "PASS  1. page counts by ranged reads"; echo "1/1 passed"; exit 0; fi
echo "FAIL  1. page counts by ranged reads"; echo "0/1 passed"; exit 1

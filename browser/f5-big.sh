#!/usr/bin/env bash
# F5, the Block B check: Choose pages on a 400 MB+ PDF and a small one.
#
#   ./browser/f5-big.sh      (from intelcost-infra/; regress.sh runs it too)
#
#   1. drives/f5-big.py, in the api container: a throwaway account's project with
#      "Big set.pdf" (about 520 MB) and "Small set.pdf" (a few MB)
#   2. f5-big.mjs: opens each through Choose pages, then with the reads blocked

set -u
cd "$(dirname "$0")/.."

out=$(docker compose exec -T api sh -lc "cd /srv && python drives/f5-big.py" 2>&1)
made=$(grep '^made' <<<"$out")
world=$(sed -n 's/^world //p' <<<"$out")
if [ -z "$world" ]; then
  echo "=== f5-big ==="
  grep -E '^FAIL|Traceback|Error' <<<"$out" | sed 's/^/      /'
  echo "FAIL  setup: the files were not made"
  echo "0/1 passed"
  exit 1
fi
big=$(sed -n 's/.*Big set.pdf \([0-9]*\) bytes.*/\1/p' <<<"$made")
small=$(sed -n 's/.*Small set.pdf \([0-9]*\) bytes.*/\1/p' <<<"$made")
echo "setup: $made"

docker compose --profile browser run --rm \
  -e F5_BIG="$world" -e F5_BIG_BYTES="$big" -e F5_SMALL_BYTES="$small" \
  browser node scripts/f5-big.mjs 2>&1 | grep -v '^ *Container '
exit "${PIPESTATUS[0]}"

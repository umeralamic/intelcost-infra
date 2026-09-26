#!/usr/bin/env bash
# F5-S9: Project Home's Sheets block retired, and the seed moved to /drawing/load.
#
#   ./browser/f5-s9.sh      (from intelcost-infra/; regress.sh runs it too)
#
#   1. f5-s9.mjs      Project Home without the block (AC1)
#   2. seed.py --reset, in the api container: a fresh account's Riverside with two
#      prepared sheets and page 1 calibrated (AC2); that account's workspace removed after
#   3. AC3, the F8 regression on the new seed, is the full regression itself

set -u
cd "$(dirname "$0")/.."

status=0
docker compose --profile browser run --rm browser node scripts/f5-s9.mjs 2>&1 | grep -v '^ *Container ' || true
[ "${PIPESTATUS[0]}" -eq 0 ] || status=1

echo
echo "=== f5-s9 seed ==="
out=$(docker compose exec -T api sh -lc "cd /srv && python scripts/seed.py --reset --storage-host host.docker.internal:9000" 2>&1)
email=$(grep -oE 'estimator\+[0-9]+@bench\.intelcost\.io' <<<"$out" | head -1)
if grep -q "2 sheet(s) ready" <<<"$out" && grep -q "feet_per_norm = 200.0000" <<<"$out"; then
  echo "PASS  2. AC2: seed.py --reset loads Riverside through /drawing/load: 2 sheets prepared, page 1 at 200 ft per unit"
else
  echo "FAIL  2. AC2: the seed"
  tail -8 <<<"$out" | sed 's/^/      /'
  status=1
fi
[ -n "$email" ] && docker compose exec -T api sh -lc "cd /srv && python drives/bench-workspaces.py purge-owner '$email'" 2>&1 | grep -E '^purged' | sed 's/^/      /'
echo
[ $status -eq 0 ] && echo "2/2 passed" || echo "not all passed"
exit $status

#!/usr/bin/env bash
# F7 Block A: the engine's hit rules, the api's analytic quantities and deducts, the
# shapes transaction, capabilities on the canvas. The shared quantity table goes through
# the api's engine in the api container, then through the browser's in the fixture.
#
#   ./browser/f7-a.sh      (from intelcost-infra/; regress.sh runs it too)

set -u
cd "$(dirname "$0")/.."

# Hard rule 2: takeoff-core carries no React import and no network call (F7-S1 AC4).
if docker compose exec -T app sh -lc "grep -rlE 'from .(react|@tanstack|axios)|fetch\\(|XMLHttpRequest|new WebSocket' src/lib/takeoff" >browser/.f7-impure.txt; then
  echo "FAIL  0. lib/takeoff imports React or reaches the network: $(tr '\n' ' ' <browser/.f7-impure.txt)"
  echo "0/1 passed"
  rm -f browser/.f7-impure.txt
  exit 1
fi
rm -f browser/.f7-impure.txt

docker compose --profile browser run --rm -e GEN=1 browser node scripts/f7-a.mjs 2>&1 | grep -v '^ *Container '
if [ ! -s browser/.f7-cases.json ]; then
  echo "FAIL  0. GEN wrote no cases"
  echo "0/1 passed"
  exit 1
fi
if ! docker compose exec -T api sh -lc "cd /srv && python drives/f7-quantity.py" \
  <browser/.f7-cases.json >browser/.f7-python.json; then
  echo "FAIL  0. the api's engine did not read the table"
  echo "0/1 passed"
  exit 1
fi
docker compose --profile browser run --rm browser node scripts/f7-a.mjs 2>&1 | grep -v '^ *Container '
status=${PIPESTATUS[0]}
rm -f browser/.f7-cases.json browser/.f7-python.json
exit "$status"

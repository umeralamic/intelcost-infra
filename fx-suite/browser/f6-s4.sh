#!/usr/bin/env bash
# F6-S4: the formula engine, twice and equal. The table goes through the api's engine in
# the api container, then through the browser's in the fixture, which compares them.
#
#   ./browser/f6-s4.sh      (from intelcost-infra/; regress.sh runs it too)

set -u
cd "$(dirname "$0")/.."

docker compose --profile fx run --rm -e GEN=1 browser-fx node scripts/f6-s4.mjs 2>&1 | grep -v '^ *Container '
if [ ! -s browser/.f6-cases.json ]; then
  echo "FAIL  0. GEN wrote no cases"
  echo "0/1 passed"
  exit 1
fi
if ! docker compose exec -T api-fx sh -lc "cd /srv && python drives/f6-formula.py" \
  <browser/.f6-cases.json >browser/.f6-python.json; then
  echo "FAIL  0. the api's engine did not read the table"
  echo "0/1 passed"
  exit 1
fi
docker compose --profile fx run --rm browser-fx node scripts/f6-s4.mjs 2>&1 | grep -v '^ *Container '
status=${PIPESTATUS[0]}
rm -f browser/.f6-cases.json browser/.f6-python.json
exit "$status"

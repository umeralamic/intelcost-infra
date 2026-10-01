#!/usr/bin/env bash
# The shared quantity table (D-68): run after the gates at the end of every block.
# Hard rule 2's purity check on lib/takeoff, then the same shapes through the api's engine
# (in the api container) and the browser's (in the bench's Chromium), compared row by row
# and against the answers worked by hand. Then F9's cost rows (browser/lib/cost-cases.mjs):
# rate × quantity, wastage, cost components, the shared-equipment spread and F9b's bid
# summary (with its workbook sheet), each against a hand-worked answer to the cent. Then F12's earthwork
# rows (browser/lib/earthwork-cases.mjs): legacy's TIN, volume and Site Feature fixtures and D-136's shrink
# rows. Takes seconds; needs the bench's app and api up.
#
#   ./quantity-table.sh      (from intelcost-infra/)

set -u
cd "$(dirname "$0")"
trap 'rm -f browser/.qt-cases.json browser/.qt-python.json browser/.qt-register.json browser/.qt-register-py.json browser/.qt-impure.txt' EXIT

# Hard rule 2: takeoff-core carries no React import and no network call.
if docker compose exec -T app sh -lc "grep -rlE 'from .(react|@tanstack|axios)|fetch\(|XMLHttpRequest|new WebSocket' src/lib/takeoff" >browser/.qt-impure.txt; then
  echo "FAIL  lib/takeoff imports React or reaches the network: $(tr '\n' ' ' <browser/.qt-impure.txt)"
  exit 1
fi

docker compose --profile browser run --rm -e GEN=1 browser node scripts/quantity-table.mjs 2>&1 | grep -v '^ *Container '
[ -s browser/.qt-cases.json ] || { echo "FAIL  GEN wrote no cases"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py" \
  <browser/.qt-cases.json >browser/.qt-python.json || { echo "FAIL  the api's engine did not read the table"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py register"   <browser/.qt-register.json >browser/.qt-register-py.json || { echo "FAIL  the api's registration did not read its rows"; exit 1; }
docker compose --profile browser run --rm browser node scripts/quantity-table.mjs 2>&1 | grep -v '^ *Container '
exit "${PIPESTATUS[0]}"

#!/usr/bin/env bash
# The shared quantity table (D-68): run after the gates at the end of every block.
# Hard rule 2's purity check on lib/takeoff, then the same shapes through the api's engine
# (in the api container) and the browser's (in the bench's Chromium), compared row by row
# and against the answers worked by hand. Then F9's cost rows (browser/lib/cost-cases.mjs):
# rate × quantity, wastage, cost components, the shared-equipment spread and F9b's bid
# summary (with its workbook sheet), each against a hand-worked answer to the cent. Then F12's earthwork
# rows (browser/lib/earthwork-cases.mjs): legacy's TIN, volume and Site Feature fixtures and D-136's shrink
# rows. Then F14's credit rows (browser/lib/credit-cases.mjs) through the api's meter: metering, the
# estimate, holds, settlement, refunds, the minimum and rounding (D-236). Then the scale undo rows
# (browser/lib/scale-undo-cases.mjs, D-642): undo and redo of a scale give every figure back bit for bit. Takes seconds; needs the bench's app and api up.
#
#   ./quantity-table.sh      (from intelcost-infra/)

set -u
cd "$(dirname "$0")"
trap 'rm -f browser/.qt-cases.json browser/.qt-python.json browser/.qt-register.json browser/.qt-register-py.json browser/.qt-site.json browser/.qt-site-py.json browser/.qt-impure.txt browser/.qt-credits.json browser/.qt-credits-py.json browser/.qt-seed.json browser/.qt-seed-py.json browser/.qt-subitems.json browser/.qt-subitems-py.json browser/.qt-fxsystem.json browser/.qt-fxsystem-py.json browser/.qt-scaleundo.json browser/.qt-scaleundo-py.json browser/.qt-eqlib.json' EXIT

# Hard rule 2: takeoff-core carries no React import and no network call.
if docker compose exec -T app sh -lc "grep -rlE 'from .(react|@tanstack|axios)|fetch\(|XMLHttpRequest|new WebSocket' src/lib/takeoff" >browser/.qt-impure.txt; then
  echo "FAIL  lib/takeoff imports React or reaches the network: $(tr '\n' ' ' <browser/.qt-impure.txt)"
  exit 1
fi

# The equipment library (F33): release 1's national rows are the catalog's, counted against the
# converter's file (D-718), and dumped for the browser's equipment rows (lib/equipment-cases.mjs).
EQ_COUNTS=$(docker compose exec -T postgres psql -U intelcost -d intelcost -At -c "select (select count(*) from eqlib.eq_class)||' '||(select count(*) from eqlib.eq_activity)||' '||(select count(*) from eqlib.eq_production)||' '||(select count(*) from eqlib.eq_transport_class)||' '||(select count(*) from eqlib.eq_setting)||' '||(select count(*) from eqlib.eq_soil_conversion)||' '||(select count(*) from eqlib.eq_source)||' '||(select count(*) from eqlib.eq_class where rent_day = 0 or rent_week = 0 or rent_4wk = 0)")
if [ "$EQ_COUNTS" != "628 104 592 9 33 4 157 0" ]; then
  echo "FAIL  eqlib release 1 counts (classes activities production transport settings soils sources zero-rents): $EQ_COUNTS, expected 628 104 592 9 33 4 157 0"
  exit 1
fi
docker compose exec -T postgres psql -U intelcost -d intelcost -At -c "select json_build_object(
  'classes', (select json_agg(c order by c.seq) from eqlib.eq_class c),
  'production', (select json_agg(p order by p.seq) from eqlib.eq_production p),
  'activities', (select json_agg(a order by a.seq) from eqlib.eq_activity a),
  'transport', (select json_agg(t order by t.seq) from eqlib.eq_transport_class t),
  'settings', (select json_agg(s order by s.seq) from eqlib.eq_setting s),
  'soils', (select json_agg(s order by s.seq) from eqlib.eq_soil_conversion s))" >browser/.qt-eqlib.json

docker compose --profile browser run --rm -e GEN=1 browser node scripts/quantity-table.mjs 2>&1 | grep -v '^ *Container '
[ -s browser/.qt-cases.json ] || { echo "FAIL  GEN wrote no cases"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py" \
  <browser/.qt-cases.json >browser/.qt-python.json || { echo "FAIL  the api's engine did not read the table"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py register"   <browser/.qt-register.json >browser/.qt-register-py.json || { echo "FAIL  the api's registration did not read its rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py site" <browser/.qt-site.json >browser/.qt-site-py.json || { echo "FAIL  the api's site join did not read its rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py credits" <browser/.qt-credits.json >browser/.qt-credits-py.json || { echo "FAIL  the api's meter did not read the credit rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py seed" <browser/.qt-seed.json >browser/.qt-seed-py.json || { echo "FAIL  the api's assembly copy did not read the seed rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py subitems" <browser/.qt-subitems.json >browser/.qt-subitems-py.json || { echo "FAIL  the api's formula engine did not read the sub-item rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py fxsystem" <browser/.qt-fxsystem.json >browser/.qt-fxsystem-py.json || { echo "FAIL  the api's formula system did not read the Phase E rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py scaleundo" <browser/.qt-scaleundo.json >browser/.qt-scaleundo-py.json || { echo "FAIL  the api did not store the scale undo rows"; exit 1; }
docker compose --profile browser run --rm browser node scripts/quantity-table.mjs 2>&1 | grep -v '^ *Container '
exit "${PIPESTATUS[0]}"

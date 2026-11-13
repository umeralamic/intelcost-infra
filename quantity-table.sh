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
# Each run has its own folder (D-891): two runs side by side never read or delete each other's files.
QT_RUN="qt-run.$$.$(date +%s)"
QT="browser/.$QT_RUN"
mkdir -p "$QT"
trap 'rm -rf "$QT"' EXIT

# Hard rule 2: takeoff-core carries no React import and no network call.
# The equipment library's engine is held to the same rule (F33, plan §3.1).
if docker compose exec -T app sh -lc "grep -rlE 'from .(react|@tanstack|axios)|fetch\(|XMLHttpRequest|new WebSocket' src/lib/takeoff src/lib/estimate/equipment" >$QT/impure.txt; then
  echo "FAIL  lib/takeoff or lib/estimate/equipment imports React or reaches the network: $(tr '\n' ' ' <$QT/impure.txt)"
  exit 1
fi

# The equipment library (F33): release 1's national rows are the catalog's, counted against the
# converter's file (D-718), and dumped for the browser's equipment rows (lib/equipment-cases.mjs).
# D-988: one source more, Washington DES rental contract 22823.
EQ_COUNTS=$(docker compose exec -T postgres psql -U intelcost -d intelcost -At -c "select (select count(*) from eqlib.eq_class)||' '||(select count(*) from eqlib.eq_activity)||' '||(select count(*) from eqlib.eq_production)||' '||(select count(*) from eqlib.eq_transport_class)||' '||(select count(*) from eqlib.eq_setting)||' '||(select count(*) from eqlib.eq_soil_conversion)||' '||(select count(*) from eqlib.eq_source)||' '||(select count(*) from eqlib.eq_class where rent_day = 0 or rent_week = 0 or rent_4wk = 0)")
# D-1035: 6 haul-cycle settings in release 35 (haul distance, payload, dump and load minutes, loaded and empty speed).
# D-1043, release 39: the dump queue / scale minutes per load, one setting more (63 + 1 = 64); the speeds move in place.
if [ "$EQ_COUNTS" != "642 104 592 9 65 4 159 0" ]; then
  echo "FAIL  eqlib release 1 counts (classes activities production transport settings soils sources zero-rents): $EQ_COUNTS, expected 642 104 592 9 65 4 159 0"
  exit 1
fi
# The first material release (M10, D-916): its keys by grade, the core set priced, its 14 gaps left out;
# with the paving, flatwork and fill addition (D-943): 162 more, A56 B35 C71.
MAT_COUNTS=$(docker compose exec -T postgres psql -U intelcost -d intelcost -At -c "select string_agg(g, ' ' order by g) from (select grade||count(*) g from matlib.mat_default d join matlib.release r on r.id=d.release_id where r.title='Q4 2026' group by grade) x")
# B4 (D-964): 156 fence, erosion control and site keys added.
# D-973: online retail at x0.50 and grade D, the keep rule again (9 keys B to C or D), one commercial gate (D).
# D-976: 20 section keys (aggregates by name, geosynthetics, mesh, 8 in filler, two mixes, a binder premium).
# D-983: hydrant water for moisture conditioning (C).
# D-998: 11 structures at installed public bid prices (A4 B7).
# D-999: bentonite as an undercut amendment (C).
# D-1001: MJ compact tees 6-12 in, DI and C900 (B20).
# D-1007..D-1009: engineered fill and GCL installed (A2), PG 70-28 and PG 76-28 premiums (B2).
# D-1035: 8 disposal fallback fees by material type (C).
# D-1043: topsoil, unsuitable soil and vegetation corrected in place (still C): counts unchanged.
# D-1080: 13 RCP gaskets and 12 CMP coupling bands, estimates (D).
# D-1083: two liner tests (B); clay for a liner repriced in place (still C).
# D-1084: cement-stabilized sand for paved trench backfill (C).
# D-1085 (B9b): 169 pipe keys the sweep found missing (13 B, 130 C, 26 D) and 18 in PVC sewer D to C.
# D-1091: 110 pipe keys to their bulk base (supply contracts A and B, list prices / 1.10 D, the rest C).
# D-1096: 76 water and sewer keys from utility supply bids (A5, B6; the list-price D rows gone), the rest C.
# D-1111: ductile iron PC 350 4 in from Louisville Water's supply bid, C to A.
# D-1120: CMP 14 ga 42 in between its sourced neighbours, A to C (CMP 12 ga 42 in and HDPE 8, 10 in stay C).
# D-1129: HDPE dual wall 4 in from the City of Tulsa supply bid (B, a new key).
if [ "$MAT_COUNTS" != "A171 B171 C428 D81 F32" ]; then
  echo "FAIL  Q4 2026 keys by grade: $MAT_COUNTS, expected A171 B171 C428 D81 F32"
  exit 1
fi
# The earthwork production starter (release 2, D-751, and release 3, D-806: dozer push and scraper): its counts
# as the workbook's and release 3's files, a blank never loaded as 0 (the 13 open-ended tiers and the 15
# open-ended defaults stay open), and every default
# production inside one of its activity's tiers (the workbook's "Tier it lands in", inclusive ends).
ST_COUNTS=$(docker compose exec -T postgres psql -U intelcost -d intelcost -At -c "select (select count(*) from eqlib.ew_activity)||' '||(select count(*) from eqlib.ew_tier)||' '||(select count(*) from eqlib.ew_tier_machine)||' '||(select count(*) from eqlib.ew_tier_crew)||' '||(select count(*) from eqlib.ew_default)||' '||(select count(*) from eqlib.ew_line_map)||' '||(select count(*) from eqlib.ew_tier_machine where optional = 'Y')||' '||(select count(*) from eqlib.ew_tier where to_per_day is null)||' '||(select count(*) from eqlib.ew_default where qty_to is null)||' '||((select count(*) from eqlib.ew_tier where to_per_day = 0 or from_per_day = 0) + (select count(*) from eqlib.ew_tier_machine where units = 0) + (select count(*) from eqlib.ew_tier_crew where count = 0) + (select count(*) from eqlib.ew_default where prod_per_day = 0 or qty_to = 0))||' '||(select count(*) from eqlib.ew_default d where not exists (select 1 from eqlib.ew_tier t where t.activity_key = d.activity_key and t.tier_no = d.tier_no and d.prod_per_day >= t.from_per_day and (t.to_per_day is null or d.prod_per_day <= t.to_per_day)))")
# Release 15 (D-947): the founder's crew sheet, paving and clearing crews; A18 and A19 replaced.
# Release 16 (D-948): a Site Feature section's 14 line types mapped to their crews.
# Release 17 (D-950): production by job size; A61 the small-box structure crew; the clearing haul.
# Release 18 (D-954): the research-checked tier file; A11 and A56 take its tiers, 172 defaults.
# Release 21 (D-957): A62, proof roll by a pneumatic roller.
# Release 22 (D-958): clearing by class; trees and stumps by diameter; debris grinding and burning (A63).
# Release 24 (D-962): valves (A64) and hydrants (A65) set by the water crew.
# Release 25 (D-964): crews for fence, erosion control and site items (A66 to A86).
# Release 26 (D-971): A28's and A32's short-run tier (2 tiers, 6 machines, 4 crew rows).
# Release 28 (D-982, D-983): A87 to A90 (conventional saw, joint sealing, moisture conditioning, agent spreading), A36's
# grader, and 7 roles mapped (the four, early-entry sawing, scarifying, the stabilized layer's compaction).
# Release 29 (D-984, D-985): A91 to A93 (patching, crack sealing, sweeping), tack and prime rows and milling and its
# haul mapped (7 roles).
# Release 30 (D-987, D-989): A94 (construction layout, own crew), hydrant and valve assemblies and layout mapped.
# Release 34 (D-998): A90's spreader truck (a tri-axle dump truck, operated).
# Release 36 (D-1037): the cut that leaves the site, cut_export → A2, one line-map row.
# Release 37 (D-1039): A56's and A57's excavator, its grapple or thumb and the chainsaws (6 machines); their
# laborers raised to 2 and 3 in place (no crew row added); clearing_haul remapped to A6 in place (no line-map row).
# Release 38 (D-1040): a small-quantity threshold on A3, A4 and A7 in place (a column, no row added): counts unchanged.
# Release 39 (D-1043): A95, the clearing debris's load and haul off, A6's 11 tiers, 22 machines, 6 defaults and its
# 11 foreman rows without the 11 spotter rows: activities 104 + 1 = 105, tiers 205 + 11 = 216, machines 480 + 22 = 502,
# crew 323 + 11 = 334, defaults 220 + 6 = 226; A6's open top tier and open top band copied, open tiers 102 + 1 = 103,
# open defaults 104 + 1 = 105; clearing_haul remapped to A95 in place (line-map 112).
# D-1085 (release 41): the short-run crew's foreman on A28 and A32, crew 334 + 2 = 336.
# D-1091 (release 42): the pipe crews A12, A18, A19, A28 and A32 replaced, 15 tiers for 15: machines 502 - 79 + 60 = 483
# (none optional: 30 - 8 = 22), crew 336 - 39 + 48 = 345, defaults 226 - 16 + 30 = 240 (six run-length bands each).
# D-1105 (release 43): the pressure crews A18 and A19 on two tiers each for three: tiers 216 - 2 = 214, machines
# 483 - 24 + 12 = 471, crew 345 - 21 + 14 = 338 (A19 keeps its fuser); defaults six bands each, 240.
if [ "$ST_COUNTS" != "105 214 471 338 240 112 22 103 105 0 0" ]; then
  echo "FAIL  earthwork starter (activities tiers machines crew defaults line-map optional open-tiers open-defaults zeros outside-tier): $ST_COUNTS, expected 105 214 471 338 240 112 22 103 105 0 0"
  exit 1
fi
# No software competitor named in the three repos' tracked text files or the workspace files (hard rule 9, D-328,
# D-342). D-1050: equipment maker and model names are allowed, so D-1043 item 5's seed maker-name gate is gone.
node browser/lib/competitor-gate.mjs .. || exit 1
docker compose exec -T postgres psql -U intelcost -d intelcost -At -c "select json_build_object(
  'classes', (select json_agg(c order by c.seq) from eqlib.eq_class c),
  'production', (select json_agg(p order by p.seq) from eqlib.eq_production p),
  'activities', (select json_agg(a order by a.seq) from eqlib.eq_activity a),
  'transport', (select json_agg(t order by t.seq) from eqlib.eq_transport_class t),
  'settings', (select json_agg(s order by s.seq) from eqlib.eq_setting s),
  'soils', (select json_agg(s order by s.seq) from eqlib.eq_soil_conversion s),
  'starter_machines', (select json_agg(m order by m.seq) from eqlib.ew_tier_machine m),
  'starter_crew', (select json_agg(c order by c.seq) from eqlib.ew_tier_crew c),
  'line_map', (select json_agg(l order by l.seq) from eqlib.ew_line_map l))" >$QT/eqlib.json

docker compose --profile browser run --rm -e QT_RUN="$QT_RUN" -e GEN=1 browser node scripts/quantity-table.mjs 2>&1 | grep -v '^ *Container '
[ -s $QT/cases.json ] || { echo "FAIL  GEN wrote no cases"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py" \
  <$QT/cases.json >$QT/python.json || { echo "FAIL  the api's engine did not read the table"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py register"   <$QT/register.json >$QT/register-py.json || { echo "FAIL  the api's registration did not read its rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py site" <$QT/site.json >$QT/site-py.json || { echo "FAIL  the api's site join did not read its rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py credits" <$QT/credits.json >$QT/credits-py.json || { echo "FAIL  the api's meter did not read the credit rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py seed" <$QT/seed.json >$QT/seed-py.json || { echo "FAIL  the api's assembly copy did not read the seed rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py subitems" <$QT/subitems.json >$QT/subitems-py.json || { echo "FAIL  the api's formula engine did not read the sub-item rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py fxsystem" <$QT/fxsystem.json >$QT/fxsystem-py.json || { echo "FAIL  the api's formula system did not read the Phase E rows"; exit 1; }
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py scaleundo" <$QT/scaleundo.json >$QT/scaleundo-py.json || { echo "FAIL  the api did not store the scale undo rows"; exit 1; }
# The wage roles a determination lists (D-753 option C): the api's wage engine against the hand-worked rows.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py roles" </dev/null || { echo "FAIL  wage roles (above)"; exit 1; }
# The wage core (D-1032): Harris County open shop (W1), its foremen (W7) and the ECI escalation (W12).
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py wages" </dev/null || { echo "FAIL  wages (above)"; exit 1; }
# D-1091: order-size tiers and the pipe crew's compactor, by hand.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py orders" </dev/null || { echo "FAIL  order sizes (above)"; exit 1; }
# Prevailing wage by classification (D-1038): Mohave Highway WD, operators by machine, a licensed trade not covered, the foreman.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py prevailing" </dev/null || { echo "FAIL  prevailing (above)"; exit 1; }
# Union agreements (D-1041): an agreement's craft through the engine, cash vs plan fringe, a craft not in it location-adjusted.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py union" </dev/null || { echo "FAIL  union (above)"; exit 1; }
# Typed values on a site machine across Apply tier (D-758 follow-up): carried, or named in the notice.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py typed" </dev/null || { echo "FAIL  site typed values (above)"; exit 1; }
# Small quantities on machines already on site (D-1040, release 38): under and over the threshold, with and without a machine.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py onsite" </dev/null || { echo "FAIL  machines on site (above)"; exit 1; }
# One equipment pool per job (D-1115): kind, size, the pipe cap, one sub, the cost guard, hosts only, rental periods, the leftover hour.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py pool" </dev/null || { echo "FAIL  equipment pool (above)"; exit 1; }
# An earthwork activity hidden from suggestions (D-759): every starter role prices through the same activity, default and tier.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py hidden" </dev/null || { echo "FAIL  hidden activities (above)"; exit 1; }
# A line Calculate turns into a parent (D-764 B0): its automatic components go, a person's stay, shown not counted.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py parents" </dev/null || { echo "FAIL  parents (above)"; exit 1; }
# One Calculate settles the bid (D-1110): a choice applied in the results panel keeps every line the Calculate wrote.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py rebuild" </dev/null || { echo "FAIL  rebuild (above)"; exit 1; }
# Sheet preparation retries a passing error (D-1255): each kind of error classified, and one page whose first store
# fails on DNS prepared by the retry (a one-page drawing on zz MyEq project, removed afterwards).
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py prepare" </dev/null >$QT/prepare.txt 2>&1
PREPARE=$?
# The task's own warning on the injected DNS failure is expected; every other line is shown.
grep -v "hit a passing error, again in" $QT/prepare.txt
[ "$PREPARE" -eq 0 ] || { echo "FAIL  prepare retry (above)"; exit 1; }
docker compose --profile browser run --rm -e QT_RUN="$QT_RUN" browser node scripts/quantity-table.mjs 2>&1 | grep -v '^ *Container '
STATUS="${PIPESTATUS[0]}"
# Benchmark A (D-1028): the last check of its copy's export against the local expectations, outside
# every repo (D-1025). Its line names no figure; a wrong check fails the table.
BENCH_A=../test-data-local/benchmark-a/last-check.json
if [ -f "$BENCH_A" ]; then
  node -e 'const c = require(process.argv[1]); console.log(`Benchmark A: ${c.lines} lines, ${c.wrong.length ? "WRONG (" + c.wrong.length + " figures)" : "right"} (checked ${c.checked_at.slice(0, 16)}Z)`); process.exit(c.wrong.length ? 1 : 0)' "$(cd "$(dirname "$BENCH_A")" && (pwd -W 2>/dev/null || pwd))/last-check.json" || STATUS=1
else
  echo "Benchmark A: skipped (no local expectations)"
fi
exit "$STATUS"

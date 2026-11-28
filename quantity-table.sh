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
#   ./quantity-table.sh                       (from intelcost-infra/)
#   QT_OWNER=D-1368 ./quantity-table.sh       (the locks under your D-number; adopted if you already hold them)
#
# D-1367: the run takes the heavy and app locks itself (lock.sh, E:\Intelcost\.locks\) before its first step and
# drops them on exit, a failure or an interrupt included (a lock its owner already held is adopted and left held).
# While it runs, the founder gate hook refuses every app or api save. A held lock is waited on up to QT_LOCK_WAIT
# seconds (default 3600). A run killed outright leaves its marks STALE: `./lock.sh status` shows it and the next
# acquire or `./lock.sh clear-stale` removes it. Its output is kept: any FAIL line turns exit 0 into exit 1. A run
# that exits 0 writes the QT pass stamp an infra commit touching the QT's inputs needs (qt-key.sh).

set -u
cd "$(dirname "$0")"
# Each run has its own folder (D-891): two runs side by side never read or delete each other's files.
QT_RUN="qt-run.$$.$(date +%s)"
QT="browser/.$QT_RUN"
mkdir -p "$QT"
QT_OWNER="${QT_OWNER:-qt-$$}"
QT_HELD=()
QT_START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
QT_TEE=''
# Back to the terminal, and wait until tee has written its last line.
qt_untee() {
  [ -n "$QT_TEE" ] || return 0
  exec 1>&3 2>&4
  wait "$QT_TEE" 2>/dev/null
  local n=0
  while [ -d "/proc/$QT_TEE" ] && [ "$n" -lt 50 ]; do sleep 0.1; n=$((n + 1)); done
  QT_TEE=''
}
qt_exit() {
  local rc=$? i
  # A signal's own code wins (an interrupted run never reads as exit 0).
  [ -n "$QT_SIG" ] && rc="$QT_SIG"
  qt_untee
  for ((i = ${#QT_HELD[@]} - 1; i >= 0; i--)); do
    echo "lock: $(bash ./lock.sh qt-drop "${QT_HELD[$i]}" "$QT_OWNER" $$)"
  done
  # Started as ./quantity-table.sh, Git Bash runs it through /usr/bin/env, and a caller's `wait` can read a signalled
  # run as exit 0; this line makes `grep -c FAIL` count it whatever the caller reads. No pass stamp is written.
  [ -n "$QT_SIG" ] && echo "FAIL  the quantity table was interrupted (signal, exit $rc): its rows did not all run"
  rm -rf "$QT"
  exit "$rc"
}
QT_SIG=''
trap qt_exit EXIT
trap 'QT_SIG=130; exit 130' INT
trap 'QT_SIG=143; exit 143' TERM
trap 'QT_SIG=129; exit 129' HUP
for l in heavy app; do
  out=$(bash ./lock.sh qt-hold "$l" "$QT_OWNER" $$ "${QT_LOCK_WAIT:-3600}") || {
    echo "FAIL  the quantity table could not take the $l lock: $out"
    exit 1
  }
  QT_HELD+=("$l")
  echo "lock: $out ($QT_OWNER, QT pid $$)"
done
QT_KEY0="$(bash ./qt-key.sh --worktree)"
# Every line also goes to $QT/out.txt, read for FAIL lines at the end.
exec 3>&1 4>&2
exec > >(tee "$QT/out.txt") 2>&1
QT_TEE=$!

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
# D-1260: 174 utility type keys (new pipe families, add-ons, taps, wyes and tie-ins): B20 C102 D52.
# D-1261: 27 bell-joint restraint keys (C900 / C909 / C905 4-36, DI 4-24, IPS 4-12): C24 D3.
# D-1267: 10 C909 MJ restraint keys (4-24): C7 D3.
# D-1268: D2241 SDR 21 4, 6, 8 in B to C (repriced by weight from C900 DR 18), pull string D to C, three minimum-charge
# keys (C): B191 - 3 = 188, C561 + 3 + 1 + 3 = 568, D139 - 1 = 138.
# D-1269: 69 crossing keys: casing walls 13 (C), jack and bore 12 (C10 D2), HDD 13 + its pits 2 (D), spacers 10 (D),
# end seals 12 (D), annulus grout (D), backstops 2 (D), pump a day (C), trench box a pit-week (C), slide rail (D), sheet
# piling (C): C568 + 26 = 594, D138 + 43 = 181; the 19 casing keys repriced at $1.00/lb stay C.
# D-1276: the 10 C909 MJ restraint keys removed (C7 D3); casing spacers 4-16 in D to C (7) and 18-24 in repriced D (3); end
# seals 8-30 in D to C (9) and 36-48 in repriced D (3); 15 keys added: curb stops and CTS couplings C8 D2, duct bank spacers
# C2 D3: C594 - 7 + 7 + 9 + 8 + 2 = 613, D181 - 3 - 7 - 9 + 2 + 3 = 167.
# D-1279: spacers and seals at list x 0.74, grade D (the 7 spacers and 9 seals at C go to D); 5 insert stiffeners (D);
# C900 restraint 14 and 18 in (F): C613 - 16 = 597, D167 + 16 + 5 = 188, F32 + 2 = 34.
# D-1289 (migration d1289e5b3c40, the D-1290 picks): CSS C to B; RCP 30 in A to B; C900 DR 18 6, 8, 12 in A to B;
# SDR-26 8 and 12 in A to B, 10 and 15 in C to B: A171 - 6 = 165, B188 + 9 = 197, C597 - 3 = 594.
# D-1296 (migration d1296a7c4e21): the fire line's test and flush, one a system (D): D188 + 1 = 189.
if [ "$MAT_COUNTS" != "A165 B197 C594 D189 F34" ]; then
  echo "FAIL  Q4 2026 keys by grade: $MAT_COUNTS, expected A165 B197 C594 D189 F34"
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
# D-1269: a bore or receiving pit's own line on A24 "Bore pit" (`utility_structure_pit`): line map 112 + 1 = 113.
# D-1275 (release 45): A96, the large storm RCP crew (48 in and up), one open tier, 4 machines, 3 crew rows, six
# run-length bands (one open), `utility_pipe_storm_large` mapped: 106 215 475 341 246 114, open tiers 104, defaults 106.
# D-1297 (release 48): a pit's refill and shoring, three line-map rows (`undercut_replace_pit` and `wall_backfill` on A3C,
# `pit_shoring` by hand): line map 114 + 3 = 117.
if [ "$ST_COUNTS" != "106 215 475 341 246 117 22 104 106 0 0" ]; then
  echo "FAIL  earthwork starter (activities tiers machines crew defaults line-map optional open-tiers open-defaults zeros outside-tier): $ST_COUNTS, expected 106 215 475 341 246 117 22 104 106 0 0"
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
GEN_STATUS="${PIPESTATUS[0]}"
[ "$GEN_STATUS" -eq 0 ] || { echo "FAIL  GEN exited $GEN_STATUS"; exit 1; }
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
# D-1412 (viewports Run A): the viewport rows through the api's own viewport.py, compared by the browser's second pass.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-viewports-d1412.py pure" <$QT/viewports.json >$QT/viewports-py.json || { echo "FAIL  the api's viewport engine did not read its rows"; exit 1; }
# The wage roles a determination lists (D-753 option C): the api's wage engine against the hand-worked rows.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py roles" </dev/null || { echo "FAIL  wage roles (above)"; exit 1; }
# The wage core (D-1032): Harris County open shop (W1), its foremen (W7) and the ECI escalation (W12).
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py wages" </dev/null || { echo "FAIL  wages (above)"; exit 1; }
# D-1091: order-size tiers and the pipe crew's compactor, by hand.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py orders" </dev/null || { echo "FAIL  order sizes (above)"; exit 1; }
# D-1268: the corrected prices (tracer, pull string, the three minimums, D2241 below C900 at its weight ratio), the line
# cost at them, and the minimum charges' top-up per estimate (short and long runs, two sheets, per system).
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py prices" </dev/null || { echo "FAIL  price corrections (above)"; exit 1; }
# D-1276 (Part 4a): the minimums a subcontract at the flat figure, the pits on the job's pool, the duct bank's pace, the
# carrier pull-in on its run's crew or alone, each by hand.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py answers" </dev/null || { echo "FAIL  Part 4a answers (above)"; exit 1; }
# Prevailing wage by classification (D-1038): Mohave Highway WD, operators by machine, a licensed trade not covered, the foreman.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py prevailing" </dev/null || { echo "FAIL  prevailing (above)"; exit 1; }
# D-1350 (wage rules 7): the county's own WD lines matched exactly (Athens on OH20260001), prevailing never under the
# open-shop base, the local metro's BLS figures, the elevator mechanic's own code and line, the Building WD line for a
# craft the governing WD lacks, a helper on its journeyman's line; each by hand, read only.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1350.py" </dev/null || { echo "FAIL  wage rules 7 (above)"; exit 1; }
# D-1352 (wage rules 8): each machine on its own WD line (the Athens dozer on Group 2), a helper on its own trade's
# tender line (the journeyman's only where there is none); each by hand, read only.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1352.py" </dev/null || { echo "FAIL  wage rules 8 (above)"; exit 1; }
# D-1359 (wage rules 9): a WD line names a machine by its whole name (the Athens loader and scraper on Group 2), open shop
# reads each machine's own survey line (else BLS) and the pipelayer its own beside BLS, the wages_9 note key; by hand.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1359.py" </dev/null || { echo "FAIL  wage rules 9 (above)"; exit 1; }
# D-1368 (wage rules 10): on open shop a craft's own row drops a survey line that names one machine (BLS instead), and a
# machine's premium is dropped only when its own survey line is used (the Yuma and Florida split pairs are no split);
# the wages_10 note key; by hand.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1368.py" </dev/null || { echo "FAIL  wage rules 10 (above)"; exit 1; }
# D-1374 (wage rules 11): on open shop a craft's own row drops any survey line that names machines, one or several
# (Utah's shared backhoe/excavator/trackhoe line no longer sets its Equipment Operator; the backhoe and the excavator
# still read it as their own line, no premium); the split pairs as rules 10; the wages_11 note key; by hand.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1374.py" </dev/null || { echo "FAIL  wage rules 11 (above)"; exit 1; }
# D-1361 (the founder's Q4): the breakdown's words. A WD fringe reads "Fringe per WD" (the Athens carpenter helper's
# 14.45, not "Raised to minimum"); "Raised to minimum" only when the base was raised; the parts add to every rate.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1361.py" </dev/null || { echo "FAIL  wage breakdown words (above)"; exit 1; }
# D-1354 (the founder's Q6): the project's own work week beside "Work starts" with no rate set: which week rules (the
# rate set's, else the project's, else 5), what a save refuses (not 5, 6 or 7; any while a rate set rules) and the
# first rate set's days a week; each by hand, pure (no database).
docker compose exec -T api sh -lc "cd /srv && python drives/qt-workweek-d1354.py" </dev/null || { echo "FAIL  work week (above)"; exit 1; }
# D-1362 (the founder's Q7): a 4 to 7 day week beside "Work starts" and on the rate set's own days a week (4 and 7
# accepted, 3 and 8 refused on both), which week rules, a saved set read as stored, the model's check; by hand, pure.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-workweek-d1362.py" </dev/null || { echo "FAIL  work week 4 to 7 (above)"; exit 1; }
# D-1360 (the founder's Q3/Q6): which wage note a rate set's move owes, wage rules 8's own key among them (one note per
# move, re-saves skipped, other inputs owe nothing; Real bid A's chain); each by hand, pure (no database).
docker compose exec -T api sh -lc "cd /srv && python drives/qt-rulenote-d1360.py" </dev/null || { echo "FAIL  rule notes (above)"; exit 1; }
# D-1369 (the founder's Q6): every move of a rate set not yet shown keeps its note through later moves (6 -> 8 -> 10 with
# no open owes both; Real bid A's stored chain then Update rates owes "wages" and "wage rules 9"; each key once, re-saves
# skipped, other inputs end the walk); the sets' subtype rates read for the note's pass (Q7); each by hand, pure.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-rulenote-d1369.py" </dev/null || { echo "FAIL  rule notes kept through moves (above)"; exit 1; }
# D-1375 part b (the founder's D-1371 Q4b, D-1378 1): the owed wage note named by its cause (no rule changed a figure:
# "Rates updated"; a rule's own change taken off the after set for its dollars) and its foreman priced from the stored
# rows (the api's own foreman to the cent, half to even); the record keeps the rule's part and the move's time; by hand.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-rulenote-d1375b.py" </dev/null || { echo "FAIL  wage note by its cause (above)"; exit 1; }
# D-1382 (wage rules 12, local wage areas): BLS's May 2025 area definitions as loaded (every county in one area, Southern
# Ohio's 12 counties, no micro area, Connecticut by planning region); Gallia's laborer 23.96 on its nonmetro area by 12 and
# Ohio statewide by 11; the state scaled by the area's ratio; Harris the same by 11 and 12; a pre-2022 Connecticut county
# on its ZIP's planning region; rules-11 figures unmoved by the load; a newly loaded metro; the wages_12 note; by hand.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1382.py" </dev/null || { echo "FAIL  local wage areas (above)"; exit 1; }
# D-1383 (wage rules 13, shared machine lines): a split pair whose class line names several machines is no split (Florida's
# backhoe/excavator/trackhoe line against its bulldozer line: the Miami dozer at its class level, $29.01, by 13; a real
# pair by 12); a single-machine class line and a real pair as before; the wages_13 note and its cause key; by hand.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1383.py" </dev/null || { echo "FAIL  shared machine lines (above)"; exit 1; }
# D-1385, D-1386 (BLS): every request packed to 50 series (171 metros 233 calls, not 240; a full survey 790); a packed
# load stopped by the daily limit keeps the whole areas asked before it; the BLS data file in the api's tree matches its
# checksum and the bench's tables (counts and digests), a tampered copy refused; BLS refused off the bench; no request.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-bls-d1386.py" </dev/null || { echo "FAIL  BLS packed calls and data file (above)"; exit 1; }
# D-1396 (NOAA normals from NCEI's by-station archive): the archive read whole (15,616 stations); every stored station
# equals it (9,248, 776,832 cells; the 43 stored before the load 3,612 cells), 0 differ; 9,248 stations x 12 months
# stored, sources file 9,205 / seed 34 / ads 9, one load row with the archive's sha256; reads with fetch for a file, a
# seeded and an ads station and a Houston point's snow and frost series make 0 NOAA calls; the fallback, stubbed, 1 call.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-noaa-d1396.py" </dev/null || { echo "FAIL  NOAA normals from the archive (above)"; exit 1; }
# D-1403 (the founder's parts a and b): who may share a project, through the api in its own process on a throwaway
# workspace with an owner, an admin, an estimator, a collaborator and a viewer, removed at the end: the default
# (everyone but the viewer, refused 403), owner and admins only, specific members (a viewer cannot be ticked),
# Members may share pricing off (a member's Show pricing on refused), the list of links, an admin's Turn off.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-share-d1403.py" </dev/null || { echo "FAIL  who may share a project (above)"; exit 1; }
# D-1407 (the founder's D-1404 item 5): account and workspace deletion, through the api in its own process on
# throwaways removed at the end, billing at the bench's Stripe fake, one probe file in the bench bucket under the
# throwaway workspace's prefix: owner-with-members refused, member and wrong name refused, deleted at once (billing,
# links, members), restored, erased after a forced grace end (file, rows gone, record kept); an account deleted,
# restored, erased; another workspace's work kept with the account anonymized; a failed file delete retried and the
# admins told once at the third night (captured and rolled back).
docker compose exec -T api sh -lc "cd /srv && python drives/qt-deletion-d1407.py" </dev/null || { echo "FAIL  account and workspace deletion (above)"; exit 1; }
# D-1412 (viewports Run A): through the real routes on a throwaway removed at the end (a blank page in the bench bucket,
# its files cleared): a new unscaled viewport moves nothing; each viewport's scale recomputes only its shapes; the inner
# of two nested boxes wins; a partial overlap refused 422; the crossing line flagged, counted on its row and measured at
# the sheet scale; a box resized so its line crosses; a box deleted, its line back to the box around it; one viewport's
# scale undone alone; no sheet scale (outside 0 and stale); a sheet with no viewport as before.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-viewports-d1412.py api" </dev/null || { echo "FAIL  viewports through the api (above)"; exit 1; }
# Union agreements (D-1041): an agreement's craft through the engine, cash vs plan fringe, a craft not in it location-adjusted.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py union" </dev/null || { echo "FAIL  union (above)"; exit 1; }
# Typed values on a site machine across Apply tier (D-758 follow-up): carried, or named in the notice.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py typed" </dev/null || { echo "FAIL  site typed values (above)"; exit 1; }
# Small quantities on machines already on site (D-1040, release 38): under and over the threshold, with and without a machine.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py onsite" </dev/null || { echo "FAIL  machines on site (above)"; exit 1; }
# One equipment pool per job (D-1115): kind, size, the pipe cap, one sub, the cost guard, hosts only, rental periods, the leftover hour.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py pool" </dev/null || { echo "FAIL  equipment pool (above)"; exit 1; }
# D-1286 (B7, B6): every rate-date text form through migration d1286b7c4f30's parse and the bench's stored dates equal to it;
# the EIA catch-up (over 8 days) and amber (over 10) at their edges, the series by state, the off-road deduction, the fallback.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py d1286" </dev/null || { echo "FAIL  rate dates and diesel (above)"; exit 1; }
# D-1287 (B2, B3, B8): the rental tax state table as migration d1287c6e2a91 loaded it, the bundle's rule for TX, GA, an
# unlisted state and none, the extras' figures in code, the job type a state rule may name, the ratios at the medians.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py d1287" </dev/null || { echo "FAIL  rental tax and extras (above)"; exit 1; }
# D-1289 (migration d1289e5b3c40 and the api): the Texas fee grade B, CSS at $42.14 and its name, the 18 pipe rows as
# MATERIAL-PICKS-FINAL §5 lists them, delivery by transport class, the FEMA edition on each class, the state's origin
# in the bundle's rule, and the project jurisdiction setting.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py d1289" </dev/null || { echo "FAIL  D-1289 library rows (above)"; exit 1; }
# D-1296 (migration d1296a7c4e21 and the api): the fire line's test and flush row ($1,350 a system, D), nothing priced for
# the Quote needed items, the counted fittings' crew-hours (0.5 / 1.0 / 2.0 by size) and their keys, the PIV and FDC on
# the valve crew (A64; on a fire run its crew), the project's backfill under pavement.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py d1296" </dev/null || { echo "FAIL  D-1296 library row and api (above)"; exit 1; }
# An earthwork activity hidden from suggestions (D-759): every starter role prices through the same activity, default and tier.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py hidden" </dev/null || { echo "FAIL  hidden activities (above)"; exit 1; }
# A line Calculate turns into a parent (D-764 B0): its automatic components go, a person's stay, shown not counted.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py parents" </dev/null || { echo "FAIL  parents (above)"; exit 1; }
# One Calculate settles the bid (D-1110): a choice applied in the results panel keeps every line the Calculate wrote.
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py rebuild" </dev/null || { echo "FAIL  rebuild (above)"; exit 1; }
# Sheet preparation retries a passing error (D-1255): each kind of error classified, and one page whose first store
# fails on DNS prepared by the retry (a one-page drawing on zz MyEq project, removed afterwards). A timeout is tried
# once more with twice the limits (D-1263): classified, then five more pages through the real task (a timeout then
# prepared; twice, failed; while fetching; a refusal failed at once; a timeout then DNS, 30 s as before).
# D-1270: the page by its uuid (an old integer id with a warning); the message; a kill at the hard limit (the hook,
# killed once and again, the sweep's send, a dead running row) and Choose pages' thumbnails killed or stopped, once and twice.
# QT_SKIP_PREPARE=1 (night run 2026-11-21): skips only this step, when the bench bucket's host does not resolve (the
# router's DNS failing, 2026-11-17). It says so; every other row still runs. A release or close-out runs it in full.
if [ "${QT_SKIP_PREPARE:-0}" = "1" ]; then
  echo "SKIPPED  prepare retry (QT_SKIP_PREPARE=1: the bench bucket host does not resolve)"
else
docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py prepare" </dev/null >$QT/prepare.txt 2>&1
PREPARE=$?
# The task's own warnings on the injected errors are expected (the rows silence its log since D-1263; the filter
# stays for an older drive); every other line is shown.
grep -v "hit a passing error, again in" $QT/prepare.txt
[ "$PREPARE" -eq 0 ] || { echo "FAIL  prepare retry (above)"; exit 1; }
fi
# D-1325 (the founder's D-1321 10a): the nightly purge's retry of the same files fails on DNS (injected) four
# times and then clears; the platform admins are told at the third failed retry only, once per log row. Storage is
# never reached and the run is rolled back (no notification is left), so it runs under QT_SKIP_PREPARE too.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-purge-alert.py" </dev/null || { echo "FAIL  purge alert (above)"; exit 1; }
# D-1339 (the founder's D-1335 Q7): the shared mail path's log lines name the user id (an invitee's keyed stand-in),
# never an address: the real queue -> outbox -> send_mail -> send path with SMTP captured in-process, every log record
# checked, a database error through the installed redaction filter; rolled back, nothing delivered, no address printed.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-mail-log.py" </dev/null || { echo "FAIL  mail log (above)"; exit 1; }
# D-1348 (the founder's D-1342 Q5): SQL_LOG_PARAMS_DEV, the dev-only switch that shows bound SQL parameters. Separate
# python processes in the api container, each with its own environment (the running api untouched): off by default
# hidden on both engines; on under local and development shown, the address filter still on; on under production,
# staging and PRODUCTION=true refused at settings load. One failing read per engine, nothing written, no value printed.
docker compose exec -T api sh -lc "cd /srv && python drives/qt-sql-params.py" </dev/null || { echo "FAIL  sql params (above)"; exit 1; }
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
# D-1367: the exit code and the FAIL lines agree, and a pass leaves its stamp for an infra commit.
qt_untee
FAILS="$(grep -c FAIL "$QT/out.txt")"
if [ "$STATUS" -eq 0 ] && [ "$FAILS" -gt 0 ]; then
  echo "FAIL  the run exited 0 but printed $FAILS FAIL lines (above)"
  STATUS=1
fi
if [ "$STATUS" -eq 0 ]; then
  QT_KEY1="$(bash ./qt-key.sh --worktree)"
  if [ "$QT_KEY1" = "$QT_KEY0" ]; then
    PASS_DIR="$(cd .. && pwd)/.private/gate-pass"
    mkdir -p "$PASS_DIR"
    # D-1400: the key already holds the gate scripts; the gates line is for the record.
    printf 'QT pass %s to %s, owner %s, pid %s, QT_SKIP_PREPARE=%s, 0 FAIL\ngates %s\n' "$QT_START" \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$QT_OWNER" $$ "${QT_SKIP_PREPARE:-0}" "$(bash ./qt-key.sh --gates)" >"$PASS_DIR/qt-$QT_KEY1"
    # Worded without the word the FAIL count reads.
    echo "QT pass stamp: qt-${QT_KEY1:0:12} (exit 0, no failure lines)"
  else
    echo "QT inputs changed during the run: no pass stamp (run it again for an infra commit)"
  fi
fi
exit "$STATUS"

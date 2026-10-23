# Night report, 2026-10-23 → 24: the Equipment Library (F33)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 06:26 UTC. Updated after every block.

## Blocks

| Block | Status | Commit(s) | Quantity table | Check: expected → got |
|---|---|---|---|---|
| Part 1 | Done 06:44 UTC | infra ba75734 (mirror) | not run (no code) | answers applied, D-718 to D-729, rule 9 scan clean |
| 1.1 (D-730) | Done 06:55 UTC | api 522670a | passed: 344 rows …, plus eqlib counts 628 104 592 9 33 4 157 and 0 zero rents | psql: classes 628 → 628; EX-CRAWL-20T 1040/2927/7950/97.76/2.78 → same; DZ-CRAWL-D1 rent NULL, owned 41.18 → same; EX-CRAWL-20T EW-CUTLOAD 163.344 → 163.344; CR-TOWER rental → rental. Smoke: throwaway fx.equip.202610230651@ signed in after the migrations, workspace "zz Equip Night" made, api health ok |
| 1.2 (D-731) | Done 07:08 UTC | api 9a54a16 | passed (unchanged rows; api only) | GET EX-CRAWL-20T rent_day: 1040 national A → 1040, national, A; PUT 980 → 980, workspace, U, national 1040, set by Equip Night; DELETE → 1040 national. Extra: fuel price 0 refused (422); confirm none on AW-AB-EL-60 fuel → value null, confirmed_none true (not 0). Bundle 750 KB, ~80 ms |
| 2.1 (D-732) | Done 07:36 UTC | app 277b4ff, infra (below) | passed; 23 equipment rows right (628 classes mob and demob equal to the catalog) | Equipment settings: fuel diesel empty "No data, enter a value" → same; US average click → 6.276 tagged User ("This estimate U") → same, kept after reload; location 1.00 "No wage set" → "No wage set: 1.00" (first showed "No wage set location", fixed); haul 50 → 50; work day 8 → 8. Rows: ex. 1 $8,022.13, owned $8,153.05, lift $3,895.13, owned $4,497.21, EL-60 null, spread at machine level $16,699.56 / $20,324.46 / $11,841.56 / $21,112.56 → all equal |
| 2.2 (D-733) | Done 07:52 UTC | app a2197f3, api 7c71a8f | passed; 33 equipment rows right (628 mob pairs and 965 production formula cells equal to the workbook) | 965 cells recomputed → all equal to 1e-9; 228 D rows blank → 228 blank, 0 not; EX-CRAWL-20T EW-CUTLOAD at E 0.75: 147.60 → 147.6 (C); CCY → LCY 1000 → 1390; BCY → LCY 1000 → 1250; 10,000 BCY at 163.344 → 61.2205 hr. Browser: efficiency 0.75 typed in Equipment settings → 147.6 from the api bundle; revert → 0.83, 163.344. **Found and fixed:** two first writes of one override at once gave a 500 (unique index); now 3 concurrent → 200 ×3, one row |
| 3.1 (D-734) | Done 08:22 UTC | api 77d391e, app 8e081e7 | passed; 41 equipment rows right, 29 cost rows right (unchanged) | Cut 10,000 BCY + EX-CRAWL-20T (made through the api): Total Equipment $8,022.13 → $8,022.13. Spread (TEST, 1,000 BCY/day, 2 × EX-CRAWL-20T, 2 TEST operators following it): 8-hr $16,699.56, crew 80 hr → $16,699.56, 160 MH = 80 crew-hr × 2; 10-hr $20,324.46, 100 → $20,324.46, 200 MH; back to 8 → $16,699.56. Rows: hand-entered host bit for bit; snapshot holds $8,022.13 after the company raises its rates, marked changed |
| 3.2 (D-735) | Done 08:44 UTC | app 61a3690 | passed; 41 equipment rows, 29 cost rows | Through the row menu on a TEST Cut 10,000 BCY: search "excavator 20", 20-25 t: A, $1,040 / $2,927 / $7,950 → same; cut and load 163.3 BCY/hr C, 61.22 hr, 2 weeks, $8,022.13 → same (against 1 week + 3 days $6,047, one 4-week $7,950); Owned $8,153.05 + ceiling → same; Low fuel $837.60 → same; production 1,000/day and 2 machines: capacity "2 × … ≈ 2,613 BCY/day" → **≈ 2,614** (see Disputed), $16,699.56 → same, operator row count 2 following the machine → same (wage blank until a craft: "Missing data: operator wage"), 80 crew-hr Linked → same; Unlink, 12.5 → "Crew 800.0 hr, spread 80.0 hr" → same, Link → 80. Lift on a TEST MEP item with a 64 crew-hr crew: no activity step, 64 hr, 2 weeks, $3,895.13 → same; EL-60: fuel "No data, enter a value", total "—", saved and flagged → same (flag still reads "Formula error" until Block 3.4) |
| 3.3 (D-736) | Done 09:16 UTC | api 9c1b657, app e3666c9 | passed; 43 equipment rows (shared split to the cent), 29 cost rows | TEST Shared A 10,000 BCY (division 31) priced as shared from the picker, TEST Shared B 20 usage hr: rental 2 weeks + 1 day $6,894.00 → same, fuel $1,417.08 → same, mob $1,100.00 → same, total $9,411.08 → same, shares $7,093.66 / $2,317.42 → same (75.38 %), unallocated $0.00 → same; B excluded: H 61.22, $8,022.13 all on A → same. Two own EX-CRAWL-20T in division 31 (C, D): "Mob/demob counted 2 times: price as one shared machine?" on both → same; totals unchanged ($4,561.07 each, worked by hand) |
| 3.4 (D-737) | Done 09:36 UTC | app d6b21ba | passed; 29 cost rows, 10 exported-formula rows, 43 equipment rows | Filter Equipment: the library rows with basis labels → "Shared machine · 61.2 machine-hr", "Rental 1 week · 30.6 hr B", "2 × Rental 2 weeks · 80 hr B"; **found and fixed:** a line whose only equipment was missing data dropped out of the Equipment report; now kept ("Rental 2 weeks · 64 hr D Missing data", "—"). Needs attention: the EL-60 line with its fuel reason → same; bid "incomplete (1 line)" → "Incomplete: 1 line has missing data". Export (`morning-report-2026-10-24/block-3.4-export-…xlsx`): Equipment basis sheet with the library rows and grades → 7 rows, the shared machine $9,411.08, settings; the banner on the sheet with the EL-60 line → "INCOMPLETE: 1 line has missing equipment data, not in the totals". The plan's "excavator row reads Rental · 2 wk · 61.22 hr · $8,022.13" is not on this project any more (that machine is shared since 3.3); the Equipment basis rows read e.g. "rental | 2 weeks | 2 | 80 | … | 16,699.56" |
| 3.5 (D-738) | Done 11:05 UTC (code 10:40, coverage 11:05) | api 1b4f5ba, 3b0b642 (zero-line fix); app be68166; infra b7fa997, 002e9b9 | passed; 45 equipment rows (tier 500 and scaled 3-of-2 spreads), 29 cost rows | On zz Equip 10000 BCY, TEST activity "TEST Cut to fill": production 1,000 attaches 2 × EX + 2 operators → $16,699.56, 160 MH → same; 10-hr day $20,324.46, 200 MH → same; production 500 → 1 × EX one 4-week $11,841.56 → same; back to 1,000 → $16,699.56; 3 → 2 machines: exact tier match takes 1,000 → same; 2 → 3: 1,500 BCY/day, "Production updated to 1,500 BCY/day (3 … instead of 2).", $21,112.56, 53.33 hr → same; a hand-added 0.5 water truck adds $2,149.44 (line $23,262.00) and production stays → same. Recalculate (synthetic Calculate) at 4,000 BCY: the edited line keeps 3 × EX at 1,500 and reads "Default production for this quantity is now in the 200–799 tier" with Apply tier → same; Apply tier → 1 × EX at 500/day, 8 days, 64 hr, labour 64 MH, line $13,825.95, the water truck kept → same. **Found and fixed:** a tier swap deleted the open dialog's component (the dialog now closes); a tier machine with no activity was not taken as pacing; the note's en dash was stored as "N{EN DASH}"; crew-hours of a division item drew on a library shared machine ($23,102.15 instead of $16,699.56); an edited tier component lost its automatic mark, so Apply tier left it beside the new one; on the test copy, a line that reads 0 kept its automatic machine ($2,150.40 each, two lines). Coverage: HV copy 90 lines and 10,000 BCY 8 lines, every component priced, second lists empty (see Coverage) |
| 4.1 (D-739) | Done 11:35 UTC | app c11db81 | passed (no engine change; 45 equipment rows, 29 cost rows) | On a fresh TEST Cut 4.1 10,000 BCY priced from the picker (1 × EX-CRAWL-20T, cut and load): $8,022.13 → same. Settings › Equipment library › Earthwork › Hydraulic excavator, 20-25 t day 980: U badge and "national $1,040" → "$980 U national $1,040", grid U. Component: notice library rates changed → "Library rates changed since this machine was priced"; Update → 2 weeks $5,854 (against 1 week + 3 days $5,867), $8,022.13 → same. Week 3,200: before Update $8,022.13 (snapshot); after, 1 week + 3 days $6,140.00 against 2 weeks $6,400.00, $8,308.13 → same. Revert both ("Revert all 2 company values"), Update → $8,022.13 → same. Settings tab: 23 company defaults; release banner "National library release 1 is in use", Mark as seen → "National library release 1." |
| 4.2 (D-740) | Done 12:20 UTC | api 1234e06, app eebc3d9, infra (mirror) | passed; 47 equipment rows (the company machine $7,929.82 and the five machine-list matches added) | Add custom "Excavator 20-25 t, company unit" (renamed "TEST Excavator 20-25 t" for the night) owned $85.00/hr, fuel 2.78 med, EW-CUTLOAD 150 BCY/hr; in a component on TEST Cut 4.2 10,000 BCY: 66.67 hr, owned $5,666.67 + fuel $1,163.15 + mob (lowboy-legal) $1,100 = **$7,929.82** → same. Export company rates (629 machines, `morning-report-2026-10-24/block-4.2-Company equipment rates - release 1.xlsx`); EX-CRAWL-20T week 3,000, other cells left empty (`block-4.2-company-rates-edited.xlsx`): diff "1 changed", empty = no value → "Company rates: 1 changed, 0 back to national"; Apply → grid U, "$3,000 U national $2,927". Machine list of 5 (`block-4.2-TEST-machine-list.xlsx`): Excavator04, CAT 330 → 30-36 t excavator; Truck, 30 Ton Artic → ADT 30 t payload; Dozer 12, CAT D6 → D6 class; Loader 3, CAT 972 → Cat 972 class; Roller 7, 84 in smooth drum → 84 in smooth; all 5 listed, landed as U workspace values → same. **Found and fixed:** the rate unit doubled ("BCY/hr/hr"); company values graded B/none instead of U; the fuel column read from "Owned $/hr (no fuel)" (120 and 150 gal/hr, re-imported right: 4.4 and 4.8); the 84 in roller tie. Afterwards the 10 imported TEST values were reverted (so 4.3 and 5.1 run on catalog rates) and the WT-2000 TEST fuel 4 put back |

## Step A: earthwork lines (change 4)

Recorded in full in `EQUIPMENT_LIBRARY_PLAN.md` §1.8.
- **Updated in place:** Calculate's lines are `takeoff_item` rows keyed by (region, role, variant) and updated in place.
- **Components survive:** a line no longer produced but carrying a cost component is kept at 0, "Not in the last
  Calculate", never deleted.
- **The founder's list:** it matches the code except "→ Re-use", which the code writes in BCY (topsoil) or CCY (fill),
  not LCY.
- **The code also has:** cut (BCY), fill (CCY), soil export and import (LCY), rock hard dig, over-excavation,
  replacement fill, subgrade prep (SF), geosynthetics (SY), stockpile, and ten utility roles.
- **The follow-up's known lines, confirmed on the test copy's own Calculate:**
  - Strip Topsoil BCY: `strip`, "Strip Topsoil (6") — Strip Area (bank)" 3,583.27 BCY.
  - → Haul Off LCY: `strip_haul`, 4,120.77 LCY.
  - → Re-use: `strip_reuse_topsoil`, **39.11 BCY, not LCY** (as above).
  - Undercut BCY: `undercut`, Building Pad 146.40 BCY.
  - Undercut Spoil LCY: `undercut_haul`, 168.35 LCY.
  - Native undercut CY: `undercut_native`, 9.25 CY.
  - Replacement Fill CCY: `undercut_replace`, 146.40 and 20.66 CCY.
  - Stabilization SY: `stabilize`, 177.78 SY, with Mix and Compact SY (`stabilize_mix`) and cement 2.67, fly ash 4.00 and
    lime 5.28 TON (`stabilize_agent_1/2`) as its sub-items.
  - Every one of these keeps its components across a recalculation (Coverage, below).

## The test copy of "Hidden Valley Rebid — 3D test" (follow-up)

- **Copied before Block 3.5** by `intelcost-infra/drives/copy-3d-test.py` (the app's own cross-workspace copier) into
  "zz Equip HV copy", owned by the throwaway `fx.equip.202610230651@bench.intelcost.io`: project "Hidden Valley Rebid —
  3D test (shared copy)", 129 stored files and 607 takeoff rows. Nothing was written to the original or its workspace;
  the founder's account was never used.
- **The original, before the copy → after the copy → at 10:58 UTC, after all of tonight's work on the copy:** drawing_sheet
  29, takeoff_item 121 (11 sub-items), takeoff_cost_component 1, estimate_line_item 1, earthwork_result 1, strip areas 2,
  soil layers 3, bores 4, assumptions 1, utility runs 3, utility structures 3; latest updated_at 2026-10-20
  03:47:47.511941+00. Equal all three times.

## Coverage: every test quantity priced

**TEST data on the copy** (none of it a catalog or company number; the machines and their rates are the catalog's):
- Activities in the copy's workspace, each one tier from 0 up and one default for every quantity:
  - "TEST Excavate and load" BCY 500/day, 1 × EX-CRAWL-20T + TEST Operator: cut, undercut, rock_hard_dig, utility_trench_excavation.
  - "TEST Place and compact" CCY 400/day, DZ-CRAWL-D6 + CP-SD-84-HVY + 2 operators: fill, undercut_replace, undercut_native, utility_backfill, utility_bedding_pipe_zone.
  - "TEST Strip topsoil" BCY 800/day, DZ-CRAWL-D6 + operator: strip, strip_reuse_topsoil.
  - "TEST Load and haul" LCY 600/day, WL-MED-45Y + 2 × ADT-30T + operators following them: strip_haul, undercut_haul, soil_export, spoils_export, soil_import.
  - "TEST Fine grade" SF 20,000/day, GR-12FT-140: prep. "TEST Mix and compact" SY 1,500/day, CP-SD-84-HVY: stabilize, stabilize_mix.
  - "TEST Dewater trench" LF 200/day, PMP-SP-6D + 1 TEST Laborer: dewatering. "TEST Shore trench" LF 150/day, TB-STL-8x20 + 2 TEST Laborers: trench_protection. "TEST Lay pipe" LF 200/day, EX-CRAWL-17T + operator + 2 TEST Pipe layers: utility_pipe.
- Wages: TEST Operator $50/hr, TEST Laborer $40/hr, TEST Pipe layer $45/hr. Diesel: the US average suggestion 6.276 as this estimate's value.
- Materials and subcontracts: TEST select borrow $14/LCY, TEST replacement fill $22/CCY, TEST bedding $38/CCY, TEST agent
  $160/TON (cement and lime) and $70/TON (fly ash), TEST pipe $30/LF (utility lines) and $28/LF (drawn pipes), TEST stud
  $6/EA, TEST drywall sheet $14/EA, TEST insulation $0.85/SF, TEST wall $12/LF, TEST trench in rock subcontract $85/LF (the
  two "Trench in Rock" lines are LF, which cannot convert to the BCY activity); crews TEST Crew at a TEST production rate.
- On the 10,000 BCY project: AW-AB-EL-60 fuel 0.5 gal/hr as this estimate's value (TEST; the catalog has none), so the
  Block 3.4 missing-data line prices now.

**Calculate and recalculate (through the app, as the throwaway):** the first Calculate attached 173 automatic components
(each line's tier); the hand components (materials, subcontracts) on earthwork lines stayed. Recalculated: 240
components, the same UUIDs and values (fingerprint equal). **Found and fixed** (D-738 addendum): a line that fell to 0
(T6 Cut, 4e-11 BCY from the engine; Rock T4, 0.000127 BCY, reads 0) kept its automatic excavator, billing a day and its
mob, $2,150.40 each; an automatic line that reads 0 now gives its tier spread back. After the fix: 201 components (169
automatic, 32 by hand), recalculated twice more with an equal fingerprint, the hand components bit for bit throughout.

**Not estimate lines, so not in the table:** the 16 Site Features (pavements, Building Pad, T1–T7), the 3 utility runs
(SS-1, ST-1, ST-2) and the 3 structures (MH-1–3) are headings in Estimating, never lines (`lib/estimate/lines.ts:247`);
contours, boundaries and spots are geometry. I had priced the features, runs and structures too; those 35 components
never reached a total, so I removed them. See Questions.

Exports in `morning-report-2026-10-24/`: `block-3.5-coverage-hv-copy.xlsx` (full estimate $799,621.31: labor
$85,005.33, material $183,285.35, equipment $485,977.96, subcontract $45,352.67) and `block-3.5-coverage-10000-bcy.xlsx`
($92,785.13). Both tables below are read from those files.

### HV copy: 90 estimate lines with a quantity

| No. | Line | Qty | Components | Line cost |
|---|---|---|---|---|
| 1 | LF 28 | 15 LF | Labor, TEST pipe, TEST Crew | $492.19 |
| 87 | Exterior Wall | 521.31 LF | (sub-items carry it) | $9,063.59 |
| 88 | ↳ Metal Studs | 391.96 EA | TEST stud | $2,351.76 |
| 89 | ↳ Drywal 4x8 | 162.91 EA | TEST drywall sheet | $2,280.72 |
| 90 | ↳ Insulation | 5,213.07 SF | TEST insulation | $4,431.11 |
| 91 | Exterior Wall (2) | 153.21 LF | (sub-items carry it) | $2,663.68 |
| 92 | ↳ Metal Studs | 115.19 EA | TEST stud | $691.16 |
| 93 | ↳ Drywal 4x8 | 47.88 EA | TEST drywall sheet | $670.28 |
| 94 | ↳ Insulation | 1,532.06 SF | TEST insulation | $1,302.25 |
| 11 | Trench Dewatering — Sanitary Sewer | 35.78 LF | Pump 6 in trash/self-priming, diesel trailer (~1,425 GPM) · Rental 1 day · 1.4 hr, Crew | $856.33 |
| 19 | Trench Dewatering — Storm | 13.72 LF | Pump 6 in trash/self-priming, diesel trailer (~1,425 GPM) · Rental 1 day · 0.5 hr, Crew | $811.62 |
| 12 | Utility Spoils Export, Rock (71.62 BCY) — Sanitary Sewer | 96.69 LCY | Wheel loader 4.5 yd (~225-250 hp) · Rental 1 day · 1.3 hr, Articulated dump truck (ADT) 30 t payload · 2 × Rental 1 day · 1.3 hr, Crew | $14,370.93 |
| 23 | Utility Spoils Export, Rock (107.90 BCY) — Storm | 145.67 LCY | Wheel loader 4.5 yd (~225-250 hp) · Rental 1 day · 1.9 hr, Articulated dump truck (ADT) 30 t payload · 2 × Rental 1 day · 1.9 hr, Crew | $14,517.17 |
| 82 | Rock Excavation, Layer 3 (bank) — Storm | 107.9 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 1.7 hr, Crew | $2,266.84 |
| 83 | Trench in Rock — Storm | 266.89 LF | TEST trench in rock | $22,685.94 |
| 84 | Rock Excavation, Layer 3 (bank) — Sanitary Sewer | 71.62 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 1.1 hr, Crew | $2,227.69 |
| 85 | Trench in Rock — Sanitary Sewer | 266.67 LF | TEST trench in rock | $22,666.73 |
| 71 | Rock Excavation, Layer 3 (bank) — Standard Duty Asphalt Pavement | 921.77 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 2 days · 14.7 hr, Crew | $4,195.53 |
| 74 | Rock Excavation, Layer 3 (bank) — Heavy Duty Asphalt Pavement | 924.6 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 2 days · 14.8 hr, Crew | $4,198.58 |
| 68 | Rock Excavation, Layer 3 (bank) — Concrete Sidewalk | 18.74 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 0.3 hr, Crew | $2,170.63 |
| 48 | Rock Excavation, Layer 3 (bank) — T7 Overlap test (over T6) | 23.69 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 0.4 hr, Crew | $2,175.96 |
| 59 | Rock Excavation, Layer 3 (bank) — T3 Lime stabilized (6 %) | 13.07 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 0.2 hr, Crew | $2,164.51 |
| 51 | Rock Excavation, Layer 3 (bank) — T6 Imported undercut (Select Fill) | 4.35 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 0.1 hr, Crew | $2,155.10 |
| 45 | Rock Excavation, Layer 3 (bank) — Remaining Site | 4,106.55 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 2 weeks · 65.7 hr, Crew | $11,444.15 |
| 26 | Strip Topsoil (6") — Strip Area (bank) | 3,583.27 BCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 week · 35.8 hr, Crew | $9,762.89 |
| 27 | Strip Topsoil — Strip Area → Haul Off (loose) | 4,120.77 LCY | Wheel loader 4.5 yd (~225-250 hp) · Rental 1 week + 2 days · 54.9 hr, Articulated dump truck (ADT) 30 t payload · 2 × Rental 1 week + 2 days · 54.9 hr, Crew | $48,126.08 |
| 24 | Strip Topsoil (4") — Strip Area 2 (reuse) (bank) | 39.11 BCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 0.4 hr, Crew | $3,263.50 |
| 25 | Strip Topsoil — Strip Area 2 (reuse) → Re-use as Topsoil Fill (Landscape) (bank) | 39.11 BCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 0.4 hr, Crew | $3,263.50 |
| 65 | Heavy Duty Aggregate Pavement Cut | 1,225.34 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 week · 19.6 hr, Crew | $5,378.60 |
| 66 | Heavy Duty Aggregate Pavement Fill | 1,246.27 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 week · 24.9 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 week · 24.9 hr, Crew | $15,478.46 |
| 70 | Standard Duty Asphalt Pavement Cut | 792.51 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 2 days · 12.7 hr, Crew | $4,056.04 |
| 72 | Standard Duty Asphalt Pavement Fill | 2,409.68 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 week + 2 days · 48.2 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 week + 2 days · 48.2 hr, Crew | $25,818.29 |
| 73 | Heavy Duty Asphalt Pavement Cut | 620.9 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 2 days · 9.9 hr, Crew | $3,870.85 |
| 75 | Heavy Duty Asphalt Pavement Fill | 498.52 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 2 days · 10 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 2 days · 10 hr, Crew | $10,549.90 |
| 79 | Building Pad Fill | 2,398.9 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 week + 1 day · 48 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 week + 1 day · 48 hr, Crew | $22,357.07 |
| 31 | Undercut Excavation (48") — Building Pad (bank) | 146.4 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 2.3 hr, Crew | $2,308.38 |
| 34 | Undercut Replacement Fill: Structural Fill, 48" in 12" lifts (4 lifts) — Building Pad (compacted in place) | 146.4 CCY | TEST replacement fill, Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 2.9 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 2.9 hr, Crew | $9,287.79 |
| 32 | Undercut Spoil — Building Pad → Haul Off (loose) | 168.35 LCY | Wheel loader 4.5 yd (~225-250 hp) · Rental 1 day · 2.2 hr, Articulated dump truck (ADT) 30 t payload · 2 × Rental 1 day · 2.2 hr, Crew | $14,584.92 |
| 76 | Heavy Duty Concrete Pavement Cut | 100.42 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 1.6 hr, Crew | $2,258.77 |
| 77 | Heavy Duty Concrete Pavement Fill | 81.76 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 1.6 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 1.6 hr, Crew | $5,873.65 |
| 67 | Concrete Sidewalk Cut | 41.56 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 0.7 hr, Crew | $2,195.24 |
| 69 | Concrete Sidewalk Fill | 395.47 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 7.9 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 7.9 hr, Crew | $6,812.53 |
| 62 | T2 Scarify, moisture condition and compact Fill | 211.05 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 4.2 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 4.2 hr, Crew | $6,260.58 |
| 42 | T2 Scarify, moisture condition and compact — Scarify, Moisture Condition & Compact, 8" in 4" lifts (2 lifts, 95% Std Proctor) | 1,600 SF | Motor grader 12 ft (Cat 140) · Rental 1 day · 0.6 hr, Crew | $3,114.67 |
| 49 | T7 Overlap test (over T6) Fill | 22.29 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 0.4 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 0.4 hr, Crew | $5,695.67 |
| 58 | T3 Lime stabilized (6 %) Cut | 36.77 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 0.6 hr, Crew | $2,190.08 |
| 60 | T3 Lime stabilized (6 %) Fill | 118.74 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 2.4 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 2.4 hr, Crew | $5,984.33 |
| 39 | T3 Lime stabilized (6 %) — Soil Stabilization, Lime 6%, 12" | 177.78 SY | (sub-items carry it) | $3,307.43 |
| 41 | ↳ Lime (6% of dry wt @ 110 pcf) | 5.28 TON | TEST agent | $844.80 |
| 40 | ↳ Mix and Compact | 177.78 SY | Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 0.9 hr, Crew | $2,462.63 |
| 54 | T5 Native undercut, recompacted Fill | 147.74 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 3 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 3 hr, Crew | $6,071.12 |
| 30 | T5 Native undercut, recompacted — Undercut & Recompact Native Soil, 24" in 6" lifts (4 lifts) | 9.25 CY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 0.2 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 0.2 hr, Crew | $5,656.64 |
| 63 | T1 Compacted subgrade Cut | 223.26 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 3.6 hr, Crew | $2,391.33 |
| 43 | T1 Compacted subgrade — Compacted Subgrade, 12" (95% Std Proctor) | 1,600 SF | Motor grader 12 ft (Cat 140) · Rental 1 day · 0.6 hr, Crew | $3,114.67 |
| 55 | T4 Cement and fly ash blend (lb/SY) Cut | 0.06 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 0 hr, Crew | $2,150.47 |
| 57 | T4 Cement and fly ash blend (lb/SY) Fill | 85.02 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 1.7 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 1.7 hr, Crew | $5,883.40 |
| 35 | T4 Cement and fly ash blend (lb/SY) — Soil Stabilization, Cement 30 lb/SY + Fly ash 45 lb/SY, 8" | 177.78 SY | (sub-items carry it) | $3,169.30 |
| 37 | ↳ Cement (30 lb/SY) | 2.67 TON | TEST agent | $426.67 |
| 38 | ↳ Fly ash (45 lb/SY) | 4 TON | TEST agent | $280.00 |
| 36 | ↳ Mix and Compact | 177.78 SY | Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 0.9 hr, Crew | $2,462.63 |
| 52 | T6 Imported undercut (Select Fill) Fill | 62.17 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 1.2 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 1.2 hr, Crew | $5,815.02 |
| 28 | Undercut Excavation (18") — T6 Imported undercut (Select Fill) (bank) | 20.66 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 0.3 hr, Crew | $2,172.70 |
| 33 | Undercut Replacement Fill: Select Fill, 18" in 6" lifts (3 lifts) — T6 Imported undercut (Select Fill) (compacted in place) | 20.66 CCY | TEST replacement fill, Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 0.4 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 0.4 hr, Crew | $6,145.40 |
| 29 | Undercut Spoil — T6 Imported undercut (Select Fill) → Haul Off (loose) | 23.76 LCY | Wheel loader 4.5 yd (~225-250 hp) · Rental 1 day · 0.3 hr, Articulated dump truck (ADT) 30 t payload · 2 × Rental 1 day · 0.3 hr, Crew | $14,153.20 |
| 44 | Remaining Site Cut | 2,534.53 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 week + 1 day · 40.6 hr, Crew | $7,841.82 |
| 46 | Remaining Site Fill | 1,836.59 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 week · 36.7 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 week · 36.7 hr, Crew | $17,245.19 |
| 81 | Rock Export, Layer 3 (6,013 BCY) | 8,117.25 LCY | Wheel loader 4.5 yd (~225-250 hp) · Rental one 4-week · 108.2 hr, Articulated dump truck (ADT) 30 t payload · 2 × Rental one 4-week · 108.2 hr, Crew | $76,791.25 |
| 80 | Soil Import — Select Borrow (4,688 BCY) | 5,391.03 LCY | TEST select borrow, Wheel loader 4.5 yd (~225-250 hp) · Rental 2 weeks · 71.9 hr, Articulated dump truck (ADT) 30 t payload · 2 × Rental 2 weeks · 71.9 hr, Crew | $131,786.68 |
| 8 | Trench Protection, Sloped 1:1 0–6 ft — Sanitary Sewer | 10.06 LF | Trench box / shield Steel trench box 8x20 · Rental 1 day · 0.5 hr, Crew | $1,064.11 |
| 9 | Trench Protection, Sloped 1½:1 0–6 ft — Sanitary Sewer | 29.94 LF | Trench box / shield Steel trench box 8x20 · Rental 1 day · 1.6 hr, Crew | $1,148.93 |
| 10 | Trench Protection, Vertical 0–6 ft — Sanitary Sewer | 549.37 LF | Trench box / shield Steel trench box 8x20 · Rental 1 week · 29.3 hr, Crew | $3,785.33 |
| 18 | Trench Protection, Vertical 0–6 ft — Storm | 383.05 LF | Trench box / shield Steel trench box 8x20 · Rental 1 week · 20.4 hr, Crew | $3,075.70 |
| 22 | Trench Protection, Benched 1:1 0–6 ft — Storm | 40 LF | Trench box / shield Steel trench box 8x20 · Rental 1 day · 2.1 hr, Crew | $1,191.86 |
| 2 | 10" PVC SDR-35 Pipe, 0–6 ft deep — Sanitary Sewer | 589.37 LF | TEST pipe, Hydraulic excavator 16-18 t (~38,000-40,000 lb) · Rental 1 week · 23.6 hr, Crew | $25,008.62 |
| 13 | 8" HDPE Dual Wall Pipe, 0–6 ft deep — Storm | 112.79 LF | TEST pipe, Hydraulic excavator 16-18 t (~38,000-40,000 lb) · Rental 1 day · 4.5 hr, Crew | $6,062.94 |
| 20 | 24" PVC SDR-35 Pipe, 0–6 ft deep — Storm | 310.26 LF | TEST pipe, Hydraulic excavator 16-18 t (~38,000-40,000 lb) · Rental 2 days · 12.4 hr, Crew | $14,103.72 |
| 5 | Pipe Bedding, #57 stone (compacted) — Sanitary Sewer | 33.25 CCY | TEST bedding, Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 0.7 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 0.7 hr, Crew | $6,992.03 |
| 6 | Pipe Zone, Sand (compacted) — Sanitary Sewer | 120.63 CCY | TEST bedding, Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 2.4 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 2.4 hr, Crew | $10,574.10 |
| 7 | Trench Backfill, Native (compacted) — Sanitary Sewer | 77.19 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 1.5 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 1.5 hr, Crew | $5,859.98 |
| 15 | Pipe Bedding, #57 stone (compacted) — Storm | 34.67 CCY | TEST bedding, Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 0.7 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 0.7 hr, Crew | $7,050.19 |
| 16 | Pipe Zone, Sand (compacted) — Storm | 156.76 CCY | TEST bedding, Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 3.1 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 3.1 hr, Crew | $12,055.02 |
| 17 | Trench Backfill, Native (compacted) — Storm | 82.01 CCY | Crawler dozer D6 class (~215-240 hp, ~50k lb) · Rental 1 day · 1.6 hr, Single-drum vibratory roller 84 in heavy (CS74/CS19 class, to ~41,600 lb) · Rental 1 day · 1.6 hr, Crew | $5,874.40 |
| 3 | Trench Excavation, Layer 1 (bank) — Sanitary Sewer | 132.21 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 2.1 hr, Crew | $2,293.07 |
| 4 | Trench Excavation, Layer 2 (bank) — Sanitary Sewer | 40.38 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 0.6 hr, Crew | $2,193.97 |
| 14 | Trench Excavation, Layer 1 (bank) — Storm | 204.11 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 3.3 hr, Crew | $2,370.66 |
| 21 | Trench Excavation, Layer 2 (bank) — Storm | 1.78 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 1 day · 0 hr, Crew | $2,152.33 |
| 86 | Wall Type B | 522.7 LF | TEST wall, TEST Crew | $8,363.16 |
| 95 | SF 67 | 28,429.58 SF | TEST surface, TEST Crew | $31,272.54 |
| 96 | LF 68 | 220.81 LF | TEST pipe, TEST Crew | $6,977.75 |
| 97 | 12 dia pipe (215.6 LF @ 8%) | 216.34 LF | TEST pipe, TEST Crew | $6,836.28 |
**Second list (no component, or a component that prices to nothing):** empty.

### zz Equip 10000 BCY: 8 lines with a quantity

| No. | Line | Qty | Components | Line cost |
|---|---|---|---|---|
| 5 | TEST Shared A 10,000 BCY | 10,000 BCY | Hydraulic excavator 20-25 t · Shared machine · 61.2 machine-hr, Shared — Hydraulic excavator 20-25 t | $7,093.66 |
| 6 | TEST Shared B 2,000 BCY | 2,000 BCY | Shared — Hydraulic excavator 20-25 t | $2,317.42 |
| 7 | TEST Own C 5,000 BCY | 5,000 BCY | Hydraulic excavator 20-25 t · Rental 1 week · 30.6 hr | $4,561.07 |
| 8 | TEST Own D 5,000 BCY | 5,000 BCY | Hydraulic excavator 20-25 t · Rental 1 week · 30.6 hr | $4,561.07 |
| 1 | TEST Cut (Calculate) 10,000 BCY | 4,000 BCY | Water truck / tank 2,000 gal on-highway · 0.5 × Rental 2 weeks · 64 hr, Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 2 weeks · 64 hr, Crew | $13,825.95 |
| 2 | TEST Cut 10,000 BCY | 10,000 BCY | Excavator 20-25 t · 2 × Rental 2 weeks · 80 hr, TEST Operators | $24,699.56 |
| 3 | TEST Cut picker 10,000 BCY | 10,000 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · 2 × Rental 2 weeks · 80 hr, Operators | $24,699.56 |
| 4 | TEST MEP rough-in 6,400 SF | 6,400 SF | TEST Electricians, Boom lift, articulating 60 ft electric/hybrid jib (Genie Z-60 DC/FE) · Rental 2 weeks · 64 hr | $11,026.83 |
**Second list (no component, or a component that prices to nothing):** empty.

## Disputed numbers

- **The plan said 33 settings from the catalog; the catalog has 32.** The 33rd is "hours per work day" (8, D-724), which is not a catalog value. Nothing was changed to make the count fit.

- **Capacity check, "≈ 2,613 BCY/day" in the brief:** 2 × 163.344 BCY/hr × 8 hr = 2,613.5; the app rounds to the nearest, 2,614. Built to round; truncating would give the brief's 2,613. A display choice only, no money.

Every number in the brief was checked against its rule before building:
- 8 hr: $16,699.56;
- 10 hr: $20,324.46;
- production 500: $11,841.56;
- 3 excavators: $21,112.56.

## Decisions taken overnight

1. **Rule 9, who is a competitor** (D-726).
   - **Taken:** estimating, takeoff and construction-software products, and the equipment rate-data and cost-data
     publishers sold to estimators.
   - In the design document they became product A–H, "a rate-data publisher" and "a cost-data publisher". Links whose
     address names one are withheld.
   - The catalog's text that names the two publishers is written generically into the seed files (text only).
   - **Alternative:** software products only, keeping the publishers' names.
2. **"Neither rate → Operated" (D-720).**
   - **Taken:** this applies to types the catalog sells operated (a type with at least one operated row); a row of
     another type with no rate opens Rental, showing "No data".
   - "A usable owned rate" means the owned rate without fuel: `CR-AT-35T` and `CR-AT-60T` have only a fuel-included owned
     rate, so they are "neither", as the brief's examples say.
   - **Alternative:** every row with no rate opens Operated, including a plate compactor.
3. **Overtime for a mixed rental (D-724 rule 6).**
   - **Taken:** overtime hours = max(0, hours − 8 × billed days). The rate is the hourly equivalents of the periods
     covering the billed days, weighted by the days each covers, filled from the longest period down. With one period
     kind it is that period's rate, which gives the brief's $7,317.50.
   - **Alternative:** overtime counted per work day (hours above 8 on each worked day).
4. **Library writes take `canManageWorkspaceLibrary`** ("Manage workspace library", D-731), not the Crews capability `canManageWorkspace`: the name fits the company list; owners and admins hold both. Alternative: the Crews capability.
5. **Fuel gal/hr grades** (D-731): the catalog has no fuel confidence column; graded D blank, C where it says "Derived (C)", else B (single source, README legend). Alternative: show no grade on fuel.
6. **Dual, hybrid and propane/diesel fuel types price at diesel** (D-732). Alternative: ask for the fuel type on each such machine.
7. **Overtime counted on the total** (hours − 8 × billed days, D-732), weighted by the billed days each period covers. Alternative: per worked day.
8. **A missing value prices as 0 with a "Missing data" error and no last good total** (D-734), so totals add up and every error marker shows it; the component and its line are flagged (in full from Block 3.4). Alternative: carry a null through every total.
9. **A snapshot holds the library values (national and company); this estimate's own values stay live** (D-734): a fuel price or work day the estimator types for this job moves the money at once; a release or a company edit waits for Update. Alternative: freeze everything at pick time.
10. **Mob counted twice reads "…counted N times: price as one shared machine?"** with a colon, not the brief's em dash (house prose rule, D-736); items with no classification are not treated as one division. Alternative: the em dash.
11. **One shared machine per division and class:** "Price as a shared machine…" reuses the division's machine of the same class, else makes one homed on the item's division (D-736). Alternative: always a new machine.
12. **The follow-up's test copy** (D-729): recorded in the plan; applied from Block 3.5.

## Questions for the founder

- **Components on Site Features, utility runs and structures are accepted but never priced.** Estimating leaves those items out (they are headings over their Calculate lines, `lib/estimate/lines.ts:247`), yet the api takes a cost component on them and the Takeoff panel lists it, priced "—". Tonight 35 TEST components sat there unseen by every total. Should the api refuse them (409, as it does for a parent with sub-items), or should Estimating show them? Not changed tonight.
- `alembic check` reports an index drift that predates tonight (`ix_renderer_report_created_at`, from D-694): the migration lacks the index the model declares, or the reverse. Not touched; worth one line of migration.

## Left undone

_To be filled at the end._

## Morning checklist

_To be filled at the end._

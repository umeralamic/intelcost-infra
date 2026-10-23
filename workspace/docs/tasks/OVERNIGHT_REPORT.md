# Night report, 2026-10-23 → 24: the Equipment Library (F33)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 06:26 UTC; all 14 blocks done by 13:00 UTC; end-of-run coverage
13:10 UTC. Updated after every block.

**In one paragraph.** Every block of the build order is built, checked in the browser on a throwaway account, and
pushed on `umer-dev` in the api, app and infra (D-730 to D-743). Every number the plan and the brief gave came out
as given (the one display difference, capacity ≈ 2,614 against 2,613, is under Disputed numbers). The quantity table
passes with 50 equipment rows. The founder's 3D test project was copied into a throwaway workspace and never written:
its row counts and latest `updated_at` are the same before the copy, after it and at the end. On the copy (90 estimate
lines) and on the 10,000 BCY test project (13 lines), every line with a quantity is priced and the second list is
empty, at 3.5 and again at the end. Every defect the smokes found is fixed and named under "Found and fixed" in its
block's row; two of them are older than tonight (an assembly's component could not be added in the template editor;
Duplicate project dropped an estimate's own library values).

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
| 3.5 (D-738) | Done 11:10 UTC (code 10:29, coverage 11:10) | api 1b4f5ba, 3b0b642 (zero-line fix); app be68166; infra b7fa997, 002e9b9 | passed; 45 equipment rows (tier 500 and scaled 3-of-2 spreads), 29 cost rows | On zz Equip 10000 BCY, TEST activity "TEST Cut to fill": production 1,000 attaches 2 × EX + 2 operators → $16,699.56, 160 MH → same; 10-hr day $20,324.46, 200 MH → same; production 500 → 1 × EX one 4-week $11,841.56 → same; back to 1,000 → $16,699.56; 3 → 2 machines: exact tier match takes 1,000 → same; 2 → 3: 1,500 BCY/day, "Production updated to 1,500 BCY/day (3 … instead of 2).", $21,112.56, 53.33 hr → same; a hand-added 0.5 water truck adds $2,149.44 (line $23,262.00) and production stays → same. Recalculate (synthetic Calculate) at 4,000 BCY: the edited line keeps 3 × EX at 1,500 and reads "Default production for this quantity is now in the 200–799 tier" with Apply tier → same; Apply tier → 1 × EX at 500/day, 8 days, 64 hr, labour 64 MH, line $13,825.95, the water truck kept → same. **Found and fixed:** a tier swap deleted the open dialog's component (the dialog now closes); a tier machine with no activity was not taken as pacing; the note's en dash was stored as "N{EN DASH}"; crew-hours of a division item drew on a library shared machine ($23,102.15 instead of $16,699.56); an edited tier component lost its automatic mark, so Apply tier left it beside the new one; on the test copy, a line that reads 0 kept its automatic machine ($2,150.40 each, two lines). Coverage: HV copy 90 lines and 10,000 BCY 8 lines, every component priced, second lists empty (see Coverage) |
| 4.1 (D-739) | Done 11:27 UTC | app c11db81 | passed (no engine change; 45 equipment rows, 29 cost rows) | On a fresh TEST Cut 4.1 10,000 BCY priced from the picker (1 × EX-CRAWL-20T, cut and load): $8,022.13 → same. Settings › Equipment library › Earthwork › Hydraulic excavator, 20-25 t day 980: U badge and "national $1,040" → "$980 U national $1,040", grid U. Component: notice library rates changed → "Library rates changed since this machine was priced"; Update → 2 weeks $5,854 (against 1 week + 3 days $5,867), $8,022.13 → same. Week 3,200: before Update $8,022.13 (snapshot); after, 1 week + 3 days $6,140.00 against 2 weeks $6,400.00, $8,308.13 → same. Revert both ("Revert all 2 company values"), Update → $8,022.13 → same. Settings tab: 23 company defaults; release banner "National library release 1 is in use", Mark as seen → "National library release 1." |
| 4.2 (D-740) | Done 11:57 UTC | api 1234e06, app eebc3d9, infra (mirror) | passed; 47 equipment rows (the company machine $7,929.82 and the five machine-list matches added) | Add custom "Excavator 20-25 t, company unit" (renamed "TEST Excavator 20-25 t" for the night) owned $85.00/hr, fuel 2.78 med, EW-CUTLOAD 150 BCY/hr; in a component on TEST Cut 4.2 10,000 BCY: 66.67 hr, owned $5,666.67 + fuel $1,163.15 + mob (lowboy-legal) $1,100 = **$7,929.82** → same. Export company rates (629 machines, `morning-report-2026-10-24/block-4.2-Company equipment rates - release 1.xlsx`); EX-CRAWL-20T week 3,000, other cells left empty (`block-4.2-company-rates-edited.xlsx`): diff "1 changed", empty = no value → "Company rates: 1 changed, 0 back to national"; Apply → grid U, "$3,000 U national $2,927". Machine list of 5 (`block-4.2-TEST-machine-list.xlsx`): Excavator04, CAT 330 → 30-36 t excavator; Truck, 30 Ton Artic → ADT 30 t payload; Dozer 12, CAT D6 → D6 class; Loader 3, CAT 972 → Cat 972 class; Roller 7, 84 in smooth drum → 84 in smooth; all 5 listed, landed as U workspace values → same. **Found and fixed:** the rate unit doubled ("BCY/hr/hr"); company values graded B/none instead of U; the fuel column read from "Owned $/hr (no fuel)" (120 and 150 gal/hr, re-imported right: 4.4 and 4.8); the 84 in roller tie. Afterwards the 10 imported TEST values were reverted (so 4.3 and 5.1 run on catalog rates) and the WT-2000 TEST fuel 4 put back |
| 4.3 (D-741) | Done 12:13 UTC | api a45cf9a, app 23f27e0, infra (fixture + mirror) | passed; 47 equipment rows (run with the fixture rolled back) | Bench-only release 2 (`drives/eqlib-release-fixture.sh apply`), EX-CRAWL-20T day 1,040 → 1,100. zz Equip Night with company day 980: "national value changed under your override: was $1,040, now $1,100" → "… was $1,040, now $1,100 (yours $980)", and the change listed. zz Equip HV copy (no value of its own): sees the new national value → "Day $1,100 A", change listed. Existing components show the notice, totals unmoved until Update → TEST Cut 4.1 $8,022.13 and HV copy Remaining Site Cut $5,814.20 (line $7,841.82), each "Library rates changed: Update". Rolled back → release 1, day 1,040, 0 change rows; the 980 reverted |
| P1 (D-742) | Done 12:37 UTC | api bbb7039, app fd95203, infra (mirror) | passed; 49 equipment rows (two P1 seed rows: linked loader $3,300.00 / $1,650.00 each; made loader $1,650.00) | In zz Equip 10000 BCY: shared "Loader 3 yd" ($825/day, basis day, mob $0) on 03 Concrete; TEST Pad prep 1 with a TEST crew of 16 crew-hours saved as assembly "TEST Pad prep" → link kept (Loader 3 yd, $825/day); TEST Pad prep 2 in 03 Concrete, Link assembly → Shared equipment lists both at 16 h → same; rental ⌈32 ÷ 8⌉ = 4 days = $3,300.00 → same; $1,650.00 each → same; unallocated $0.00 → same. Renamed "Loader 3yd", applied to TEST Pad prep 3 → linked to the same machine, no second one → same. Beyond the plan: with no machine of that name, apply made "Loader 3 yd" at $825/day, mob $0, homed on the item's division (Masonry); removed afterwards. Template editor: Costs… lists the link; a usage formula saved and cleared |
| 5.1 (D-743) | Done 13:00 UTC | api 8331115, app 79f6268, infra (mirror) | passed; 50 equipment rows (the applied Mass cut $4,452.48 added) | Saved TEST Shared A 10,000 BCY (library excavator on the shared machine) as "TEST Mass cut": component EX-CRAWL-20T, EW-CUTLOAD, rental, 1 machine, shared "Hydraulic excavator 20-25 t", no rate, no snapshot; link kept (class EX-CRAWL-20T, no rate). Second throwaway project "zz Equip 5.1 second project" (a duplicate of zz Equip 10000 BCY stripped to one TEST Cut 5,000 BCY, no shared machines) with this estimate's fuel $5.00 (the plan's TEST value); Link assembly: 30.61 hr → 30.61 machine-hr; rental 1 week ($2,927) against 4 days ($4,160) → "Rental 1 week $2,927.00"; fuel 2.78 × 30.6102 × 5.00 = $425.48 → same; the link made "Hydraulic excavator 20-25 t" in that project with mob $1,100 counted once → same; share 100 % → same; **$4,452.48** → same. **Found and fixed:** adding a component to an assembly in the template editor failed (every `ComponentFields` key was passed to the template row); Duplicate project dropped the estimate's own library values (the copy's water truck read "Missing data"); checked by an in-process duplicate: 3 values carried |

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

### End of the run (13:05 UTC)

- **HV copy:** Calculate at 13:04:59 and again at 13:05:45, through the app as the throwaway: 201 components (169
  automatic, 32 by hand), the same UUIDs and values as after Block 3.5 (fingerprints equal). Exported
  (`morning-report-2026-10-24/final-coverage-hv-copy.xlsx`): full estimate $799,621.31, the same 90 lines with the same
  components and costs as the 3.5 table above; **second list empty**. Its 7 "Needs attention" are the lines that read 0,
  with no component (left out by design).
- **zz Equip 10000 BCY** (`final-coverage-10000-bcy.xlsx`): 13 lines with a quantity, full estimate $117,527.08, Needs
  attention 0, **second list empty**. On the way: TEST Cut 4.2 read "Missing data" (a company machine's rename had
  reset its "hours from", fixed: D-740 addendum, api 8ff86d0); the crews applied from "TEST Pad prep" priced $0 (an
  assembly's crew is makeup, and "TEST Laborer" has no project rate: given TEST $40 on those two lines; see
  Questions); the water truck's "Library rates changed" accepted with Update ($2,555.33 before and after).

| No. | Line | Qty | Components | Line cost |
|---|---|---|---|---|
| 11 | TEST Pad prep 1 5,000 BCY | 5,000 BCY | TEST Crew, Shared — Loader 3yd | $2,930.00 |
| 12 | TEST Pad prep 2 5,000 BCY | 5,000 BCY | TEST Crew, Shared — Loader 3yd | $2,930.00 |
| 13 | TEST Pad prep 3 5,000 BCY | 5,000 BCY | TEST Crew, Shared — Loader 3yd | $2,930.00 |
| 5 | TEST Shared A 10,000 BCY | 10,000 BCY | Hydraulic excavator 20-25 t · Shared machine · 61.2 machine-hr, Shared — Hydraulic excavator 20-25 t | $7,093.66 |
| 6 | TEST Shared B 2,000 BCY | 2,000 BCY | Shared — Hydraulic excavator 20-25 t | $2,317.42 |
| 7 | TEST Own C 5,000 BCY | 5,000 BCY | Hydraulic excavator 20-25 t · Rental 1 week · 30.6 hr | $4,561.07 |
| 8 | TEST Own D 5,000 BCY | 5,000 BCY | Hydraulic excavator 20-25 t · Rental 1 week · 30.6 hr | $4,561.07 |
| 1 | TEST Cut (Calculate) 10,000 BCY | 4,000 BCY | Water truck / tank 2,000 gal on-highway · 0.5 × Rental 2 weeks · 64 hr, Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 2 weeks · 64 hr, Crew | $13,825.95 |
| 2 | TEST Cut 10,000 BCY | 10,000 BCY | Excavator 20-25 t · 2 × Rental 2 weeks · 80 hr, TEST Operators | $24,699.56 |
| 3 | TEST Cut picker 10,000 BCY | 10,000 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · 2 × Rental 2 weeks · 80 hr, Operators | $24,699.56 |
| 4 | TEST MEP rough-in 6,400 SF | 6,400 SF | TEST Electricians, Boom lift, articulating 60 ft electric/hybrid jib (Genie Z-60 DC/FE) · Rental 2 weeks · 64 hr | $11,026.83 |
| 9 | TEST Cut 4.1 10,000 BCY | 10,000 BCY | Hydraulic excavator 20-25 t (~48,500-62,800 lb) · Rental 2 weeks · 61.2 hr | $8,022.13 |
| 10 | TEST Cut 4.2 10,000 BCY | 10,000 BCY | Excavator 20-25 t company unit · Owned · 66.7 hr | $7,929.82 |
**Second list (no component, or a component that prices to nothing):** empty.

- **The original "Hidden Valley Rebid — 3D test"** at 13:07 UTC: the same counts and latest `updated_at` as before the
  copy (drawing_sheet 29, takeoff_item 121 of which 11 sub-items, cost components 1, line items 1, results 1, strip 2,
  layers 3, bores 4, assumptions 1, runs 3, structures 3; 2026-10-20 03:47:47.511941+00).

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
13. **A tier keeps its machines and crew as JSON on the tier row** (D-738): copied, never priced from there. Alternative: child tables per tier.
14. **Editing a tier's component marks the line edited, not the component** (D-738), so Apply tier puts the whole tier back. Alternative: an edited component becomes a person's and survives Apply tier.
15. **An exact tier match after a count change takes the activity's default production if it falls in that tier, else the tier's start** (D-738). Alternative: keep the scaled production.
16. **A line that reads 0 at two decimals gives its tier spread back** (D-738 addendum); a person's edited line keeps it. Alternative: stored precision (six decimals), which left a 0.000127 BCY line billing $2,150.40.
17. **The TEST default "under 5,000 BCY → 500/day" is mine** (D-738), made to reach the Apply-tier check; listed as TEST.
18. **Import: an empty rate cell is "no company value"**, so a company value the file leaves empty is reverted (D-740). Alternative: an empty cell leaves the value alone.
19. **A company machine's values grade U** (blank D) (D-740). Alternative: no grade.
20. **Machine-list matching by type words, model numbers and sizes**, with a size-class word as tie-break (D-740); a suggestion only.
21. **The release fixture is a bench script, not a migration** (D-741), so nothing of it can ship; no second banner in Estimating, the component notice and Needs attention carry it.
22. **An assembly's hand-entered shared machine keeps its typed rates; a library one its choice only** (D-742); a linked machine gains the item's division as an extra when it does not cover it; an unclassified item is not linked, with a warning.
23. **Library components in templates keep no snapshot and no automatic mark** (D-743); the template editor's picker is read only.
24. **Duplicate project now copies an estimate's own library values** (`eq_override` with a project, D-743), beyond the plan; found in the 5.1 smoke.

## Questions for the founder

- **Components on Site Features, utility runs and structures are accepted but never priced.** Estimating leaves those items out (they are headings over their Calculate lines, `lib/estimate/lines.ts:247`), yet the api takes a cost component on them and the Takeoff panel lists it, priced "—". Tonight 35 TEST components sat there unseen by every total. Should the api refuse them (409, as it does for a parent with sub-items), or should Estimating show them? Not changed tonight.
- **An assembly's crew role with no project rate prices at $0 without a word** (D-298's makeup: the wage is looked up at
  the project's rates when the assembly is applied; "TEST Laborer" has none). A library operator with no wage says
  "Missing data: operator wage" (D-735). Should a makeup role with no rate say the same? Not changed tonight.
- **Earthwork tiers attach a full machine with its own mob to every line** of the activity, so the test copy's 70-odd
  small lines carry $485,977.96 of equipment (TEST tiers). A real company would price the site's spread once. Should an
  activity be able to attach its tier as the division's shared machine instead? Not changed tonight (D-727 says
  components).
- `alembic check` reports an index drift that predates tonight (`ix_renderer_report_created_at`, from D-694): the migration lacks the index the model declares, or the reverse. Not touched; worth one line of migration.

## Left undone

- **The full fixture-suite run** restored from the tag: required before any deploy to testers or promotion to `main`
  (CLAUDE.md); not part of tonight.
- **Plan §6, "a class key that no longer exists applies as a hand-entered component":** it applies as a library
  component that reads "Missing data: Library class not found" with no total (the engine's rule since D-734). The money
  is the same (none until fixed); converting it to a hand-entered row was not built.
- **The tier lookup and scaling (3.5) and the name matching of machine links (P1)** are api logic; the quantity table
  checks the engine's spreads and allocations for them, and the smoke checked the api.
- **The template editor's picker** reads values only; overrides there were not built (no project to hold them).
- **PARITY lines:** none of tonight's blocks has a PARITY line (F33 is new, not a legacy port).

## Morning checklist

1. Read Questions (four) and Disputed numbers (two), and the 24 decisions above; each names its D-NN.
2. Accept or reject D-738 to D-743 (all logged Accepted for the night, to the plan).
3. Open Settings › Equipment library as any library manager: Library, Settings, Earthwork production, the release
   banner.
4. To see the night's data, sign in as `fx.equip.202610230651@bench.intelcost.io` (a throwaway; its password lives in the
   one browser session only, so a bench session sign-in is needed: `browser/bench-session-serve.mjs`). Workspaces:
   **zz Equip Night** (zz Equip 10000 BCY; zz Equip 5.1 second project; a duplicate in the trash) and **zz Equip HV
   copy** (the 3D test copy). All of it is TEST data; delete both workspaces when done.
5. `morning-report-2026-10-24/` holds: block-3.4-export…, block-3.5-coverage-hv-copy.xlsx,
   block-3.5-coverage-10000-bcy.xlsx, block-4.2-Company equipment rates - release 1.xlsx,
   block-4.2-company-rates-edited.xlsx, block-4.2-TEST-machine-list.xlsx, final-coverage-hv-copy.xlsx,
   final-coverage-10000-bcy.xlsx.
6. The bench fixture for release notices is rolled back (release 1, 0 change rows); `drives/eqlib-release-fixture.sh
   status` shows it.
7. Before testers: the full fixture-suite run from the tag.

## Day fixes 2026-10-23

The founder's review of the night: accepted, with six changes, logged as D-744 to D-748 and built to the same standard
(gates in containers, the quantity table, a browser smoke as the throwaway `fx.equip.202610230651@bench.intelcost.io`,
commit and push on `umer-dev`, mirror). Commits: api `a373540`, app `d56485e`, infra (this report, the mirror and the
quantity table rows) in the commit that carries this section.

| Change | D-NN | Status | Quantity table | Check |
|---|---|---|---|---|
| 1. Site spread (Block 3.6) | D-744 | Done 16:45 UTC | passed; 56 equipment rows (6 new: the site spread, three per-line rows, two for D-747) | Below. **Found and fixed:** a line a recalculation retires never reached the attach, so its automatic machine stayed at 0 BCY (D-738's addendum rule did not run for it); the pacing count's "Production updated to …" note was wiped by the repricing after it |
| 2. Import: empty leaves, "national" reverts | D-745 | Done | unchanged (app only) | The 4.2 file (`block-4.2-company-rates-edited.xlsx`): "Company rates: 1 changed, 0 back to national", EX-CRAWL-20T week 2,927 → 3,000; the TEST WT-2000 fuel 4.0 kept (the old rule had reverted it). A file with two machines' rows (`day-d745-TEST-two-machines.xlsx`): "1 changed, 1 back to national" (DZ-CRAWL-D6 day 2,111 → 1,500 TEST; EX-CRAWL-20T week 3,000 → national, "the cell says national"); afterwards the workspace's company values were WT-2000 and the DZ TEST day only, nothing else changed. DZ TEST taken back: the values equal the signature from before the import |
| 3. No components on features, runs, structures | D-746 | Done | unchanged | On the HV copy: Building Pad (Site Feature), SS-1 (run), MH-1 (structure) → 409 "A Site Feature is not an estimate line: Estimating prices the lines its Calculate writes. Price the lines under this feature instead." (run and structure name themselves); their Takeoff menus have no "Add cost component" and no "Costs…"; a pipe line keeps both. **None to remove:** the 35 the night put there were removed in the night; today's query over every workspace finds 0 |
| 4. Assembly crew with no rate | D-747 | Done | 2 rows (missing; typed $0 unchanged) | "TEST Pad prep" applied onto TEST Shared B 2,000 BCY (zz Equip 3.6 site spread): component "TEST Crew · Missing data", line marked, Needs attention "Labor: missing data: wage for TEST Laborer"; the night's TEST Pad prep 1–3 with their typed TEST $40 (no mark) still $1,280.00 each |
| 5. `alembic check` | D-748 | Done | – | No new upgrade operations. The index is declared on the model, not dropped: D-694's migration made it on purpose and the platform report filters on `created_at` (see Decisions) |
| 6. Tidy | – | Done | – | The second, empty "Morning checklist" heading is gone |

### Block 3.6 check (zz Equip 3.6 site spread, a copy of zz Equip 10000 BCY)

Two Cut lines by a synthetic Calculate, both filed under 31.04.01 (division 31); TEST Cut to fill as in the night
(800+ tier 2 × EX-CRAWL-20T + 2 TEST operators, 200–799 tier 1 × + 1; defaults 5,000+ → 1,000 and under 5,000 → 500
BCY/day), 8-hr day, diesel 6.276, location 1.00. Read in Estimating and the Shared equipment dialog.

| | Expected | Got |
|---|---|---|
| Total quantity, tier | 10,000 BCY, 800+ | 10,000 BCY over 2 lines, tier 800+, default 1,000/day |
| Shared machine | 2 × EX-CRAWL-20T | "TEST Cut to fill: Hydraulic excavator 20-25 t …", 2 machines, home division 31 |
| Hours per machine | 80 | 160 machine-hr, 10 work days a machine |
| Rental | 2 × 2 weeks $11,708.00 | 2 weeks $5,854.00 × 2 = $11,708.00 |
| Fuel | $2,791.56 | $1,395.78 × 2 = $2,791.56 |
| Mob | $2,200.00 | $1,100.00 × 2 = $2,200.00 |
| Spread total | $16,699.56 | $16,699.56 |
| Line hours | 48 and 32 | 96 and 64 machine-hr (48 and 32 hr × 2) |
| Shares | $10,019.74 and $6,679.82 | $10,019.74 (60 %) and $6,679.82 (40 %) |
| Unallocated | $0.00 | $0.00 |
| Crew-hours, 2 operators | 48 and 32 | 48 and 32 crew-hr: 96.00 and 64.00 man-hours, $4,800.00 and $3,200.00 at TEST $50 |
| Per line | $11,808.94 and $8,070.63 ($19,879.57), corrected (see Disputed numbers) | $11,808.94 and $8,070.63 ($19,879.57) |
| Back to site spread | $16,699.56 | $10,019.74 + $6,679.82 = $16,699.56 |

Also driven: recalculation keeps the site lines' components (same rows); the pacing count 2 → 3 in Equipment settings:
production 1,500 BCY/day, lines $12,667.54 + $8,445.02 = $21,112.56 (the night's scaled 3-of-2 figure); 3 → 2: "Production
set to 1,000 BCY/day: the spread matches the 800+ tier."; Apply tier: automatic again, $16,699.56. "Price this line on its
own" on the 4,000 line: it prices per line ($8,070.63) and the 6,000 line carries the site spread alone ($11,808.94, as a
6,000 line); "Back to the site spread": $10,019.74 + $6,679.82 again.

### The HV copy on one site spread

Calculate through the app at 16:29:57 UTC and again at 16:31 (every TEST activity on the company's default, one site
spread): 9 activities, 11 shared machines, no line left on its own for want of a division; 201 components (169 automatic,
32 by hand) with the same fingerprint after the second Calculate, and the site machines' too.

| | Per line (the night, 13:05) | One site spread (now) |
|---|---|---|
| Equipment | $485,977.96 | **$197,021.98** |
| Full estimate | $799,621.31 | $510,665.32 |
| Labor, material, subcontract | $85,005.33, $183,285.35, $45,352.67 | the same |

Coverage (`morning-report-2026-10-24/day-3.6-coverage-hv-copy.xlsx`, Expand components, All rows, All columns): 90 lines
with a quantity, every one priced, **second list empty**; no Unallocated row; Needs attention 7 (the lines that read 0,
as before).

### Disputed numbers (day)

- **Per line, the 4,000 BCY line: corrected by the founder.** The brief's $9,170.63 (that line at 1,000 BCY/day on the
  800+ tier's 2 machines) was wrong; the expected value is **$8,070.63**: the 500 BCY/day TEST default (under 5,000 BCY,
  D-738), 1 machine, 8 days, rental 2 weeks $5,854.00 + fuel $1,116.63 + mob $1,100.00. Got $8,070.63. Recorded as the
  expected value in the quantity table (`eq-3.6-per-line-4000`; the row that held $9,170.63 is withdrawn with it) and in
  the check above. Resolved.

### Decisions taken (day)

1. **The site spread's shared machines are made and kept by the activity** (`eq_site_activity_id`, one per tier machine,
   named "<activity>: <machine>"), homed on the division of the activity's biggest line; kept while the tier's machines
   stay the same, made again when they change. Alternative: reuse a division's existing shared machine of the class.
2. **A line with no classification is priced on its own** ("No division: priced on its own"): no shared machine can reach
   it (D-736).
3. **"Price as" lives on the company's activity (default one site spread) and an estimate can choose its own.**
4. **Apply tier in Equipment settings leaves lines a person edited**; each keeps its own Apply tier.
5. **Switching to Per line removes the activity's shared machines;** a machine of an edited line that drew on one prices
   on its own again with its mob.
6. **The pacing machine in the site spread is the tier's marked machine, else its first.**
7. **A line in a site spread cannot have its production typed on the line** (409 from the api, field disabled in the
   app): the production is the site's.
8. **D-747's mark is `rate_missing` on the crew row**, set when an assembly places a role with no rate; a crew typed by
   hand is never marked, so it prices as before ($0 included).
9. **D-748 declares the index on the model instead of a migration:** the drift was the model's (D-694 made the index on
   purpose, and the platform report filters on `created_at`), so a migration to quiet `alembic check` would have dropped a
   used index. Alternative: the one-line migration the review named (`op.drop_index`).
10. **Every project's earthwork activities move to one site spread at their next Calculate** (or an Equipment settings
    change); until then a project keeps the per-line components it has. zz Equip 10000 BCY was not recalculated today.

### The original, today

The founder's own account (estimator@, "Bench Estimator") worked in "Hidden Valley Rebid — 3D test" today, 15:16–16:07
UTC: five equipment settings of the estimate and sub-item edits; its takeoff items are 120 now (121 at the night's end)
and its latest `updated_at` 15:38:38. Nothing of this work wrote to it: every audit row and work session on it since
14:00 UTC is Bench Estimator's, none the throwaway's, and its workspace has no earthwork activity, so the site spread
changes nothing there.

### TEST data added today

- **zz Equip 3.6 site spread** (zz Equip Night): a duplicate of zz Equip 10000 BCY, with the two synthetic Calculate lines
  TEST Cut A 6,000 and TEST Cut B 4,000 BCY, its site machine, and TEST Pad prep applied onto TEST Shared B 2,000 BCY.
- **HV copy:** its 9 activities' settings and 11 site machines from the Calculate.
- The DZ-CRAWL-D6 TEST day of the import check was taken back.

### Invitations inside the app (D-749)

Commits: api `e9896b0`, app `f2bd614`. Gates green; quantity table passed (55 equipment rows, unchanged).

- **Found first:** the app does email an invitation, on create and on Resend. On the bench, an address on the mail
  guard's allowlist goes out through the live relay and every other address is captured in MailHog. The two Admin
  invitations to the founder's address (17:21 UTC) went to the founder's real inbox; their links died when new ones
  were made for the founder at their request.
- **Bench mail rule:** the founder's address stays on the allowlist. **Smoke tests invite throwaway addresses only
  (`fx.…@bench.intelcost.io`, captured in MailHog), never the founder's.** Today's smoke sent nothing to a real
  address (worker log: every message "captured (guard)").
- **Built:** the invited person's pending invitations by their verified address (`GET /api/invitation/mine`), Accept
  and Decline by id, `declined_at` (migration `d749a1b2c3d4`); a banner under the header (on bare pages too, since a
  member's home is the takeoff) and "Invitations (n)" in the profile menu, both listing every pending invitation newest
  first; on the inviter's list "Declined", "Resend email (earlier links stop working)" and "Copy a new link (the old
  one stops working)", which copies it.
- **Smoke** (throwaways A `fx.invite.a.202610231747@…`, B and U; workspaces "zz Invite test 1" and "zz Invite test 2",
  owned by A):
  1. A invited B to both: B's banner "You have 2 invitations", test 2 above test 1 (newest first); the profile menu
     "Invitations (2)", its dialog in the same order → same.
  2. Accept test 1 from the dialog → B joined it and landed on its home; audited `invitation.accepted` `{"via":
     "app"}` → same.
  3. Decline test 2 from the banner → banner gone, menu without Invitations; audited `invitation.declined`; A's list
     reads "Declined" → same (the list first read "Waiting": the api did not return `declined_at`, fixed).
  4. A's "Copy a new link" → the link in the box, the offer "Waiting" again; A opening B's link → "Wrong account …
     You are signed in as fx.invite.a…" → same.
  5. B sees test 2 again; A withdraws it → B's banner gone → same.
  6. A invited U's address before U had an account; U signed up on the ordinary sign-up page (no link): unverified, no
     banner, `/mine` empty, Accept by id 403 "Confirm your email address first" → same; after the MailHog verification
     link, the banner "Invite A invited you to zz Invite test 2 as Viewer" and "Invitations (1)" → same.
- **Also today (the founder's asks):** the email footer reads "IntelCost, Takeoff and Estimating Cloud." (checked in
  MailHog on a resend to U); the cost component dialog and Equipment settings are wider (768 px), with no sideways
  scroll and nothing cut off, checked on zz Equip 3.6 site spread.
- **Left:** the copy box under the inviter's list still says "The link is on its way to them" after "Copy a new link",
  which mails nothing (wording from before today, not changed). TEST data: the three fx.invite accounts and the two
  "zz Invite test" workspaces; U's invitation to test 2 is left pending.

### Shared equipment: a new resource from the library (D-750)

Commit: app `ab75250`. Gates green. Smoke (zz Equip 3.6 site spread, the equipment throwaway): Shared equipment › New
resource › name "excavator 30" lists "Use … as my own machine" and the library matches with their day rates; picking
EX-CRAWL-30T fills name, rate $1,424 per day (greyed), basis day and mob/demob $3,600; home division searched "31" and
picked "31 Earthwork"; saved, it prices from the engine ($1,424.00 + $3,600.00 = $5,038.24 with no hours yet), then
deleted. "Own machine" clears the library choice and opens the typed rates. Divisions, extras and the subcontractor are
searchable pickers.

### Earthwork production starter (D-751)

Commits: api `9199f9d`, app `8d290c7`, infra (the quantity table's starter gate and rows) in the commit that carries
this section. Gates green; `alembic check` clean; quantity table passed: **60 equipment rows** (5 new) and the starter
gate below.

- **Loaded as release 2** from committed CSVs (`seed/earthwork_1/`, written from the workbook read with formulas and
  values; sha256 in `release.json`), counts checked by the converter, the migration and the quantity table:

  | | File | Loaded |
  |---|---|---|
  | Activities | 13 | 13 |
  | Tiers | 79 | 79 (13 open-ended, stored open, never 0) |
  | Tier machines | 165, 19 optional | 165, 19 optional |
  | Tier crew | 127 (182 less 55 Operator rows) | 127 |
  | Default production | 63 | 63 (13 open-ended), every one in its tier: the file's "Tier it lands in" is never 0, and recomputed equal (63 formulas) |
  | Line mapping | 26 keys | 27 role rows (two keys name two roles each); "stockpile" skipped |

- **Line mapping:** over-excavation → `over_excavation`, replacement fill → `replacement_fill`, geosynthetics →
  `geosynthetics` (none, as the file says). **"stockpile" has no Calculate role** (the Calculate has `strip_stockpile`
  and `undercut_stockpile`, neither a cut to stock): recorded and skipped.
- **Crew roles with no Wage Calculator craft: Foreman, Grade checker, Pipelayer.** They read "Missing data: wage for
  <role>" (D-747), never $0. Laborer, Laborer (spotter) and Laborer (dump spotter) → Laborer; operators per machine by
  its catalog class → Equipment Operator (Operating Engineer), Truck Driver; the hired tri-axle (operated) and
  attachments have none.
- **Read live:** every workspace takes the starter up on its first read or Calculate. **This includes the founder's own
  workspace "Intelcost Team"**: taken up at 18:52 UTC during the founder's own session there (nothing of this work drove
  it), before a fix to the operator rows (below); those rows refresh themselves on their next read.
- **Found and fixed in the smoke:** operator rows were built with no craft (their role went through the bracket-stripping
  name match and came out "Operator"), so every operator read "Missing data: operator wage". Fixed; an unedited starter
  activity taken up with the old rows is treated as stale and taken up again. The throwaway workspaces' starter rows were
  reset for a fresh take-up (bench repair, throwaways only).

**HV copy on the starter** ("zz Equip HV copy": the 9 TEST activities deleted, so the starter's 13 and its mapping
apply; Calculate through the app twice, 19:26 and 19:27 UTC, fingerprints equal: 263 components, 231 automatic and 32
by hand, 24 site machines):

| | TEST activities, site spread (16:31) | Starter (19:27) |
|---|---|---|
| Equipment | $197,021.98 | **$361,146.19** |
| Labour | $85,005.33 | **$16,052.87** |
| Full estimate | $510,665.32 | **$605,837.08** |

Coverage (`morning-report-2026-10-24/day-751-coverage-hv-copy.xlsx`): 86 lines with a quantity (the same set as before);
**no line without a component; no "No data" from the starter** (no machine short of catalog data; the optional water
trucks are out). **Labour: every one of the 47 starter crews on these lines has a Foreman**, which has no craft, so all 47
read "Missing data: wage for Foreman" and carry no total; the $16,052.87 is the TEST crews kept on lines a person edited
and the 32 components by hand. Needs attention 54 = those 47 + the 7 lines that read 0.

**Worked check** (zz Equip 751 starter check, a throwaway copy in zz Equip Night; a project line map sends cut to the
starter's A1, since that workspace maps cut to its TEST activity; one synthetic Calculate line of 10,000 BCY; diesel
6.276; location factor set to 1.00 for this estimate, as its wage set gave 1.01):

| | By hand | App |
|---|---|---|
| Default production, tier | 1,000 BCY/day (8,000–19,999), tier 900–1,399 | 1,000, tier 900–1,399 |
| Spread | 1 × EX-CRAWL-30T + 2 × ADT-30T | same |
| Days, hours | 10 days × 10 hr = 100 hr a machine | 100 machine-hr EX, 200 ADT (10 work days a machine) |
| EX rental | 2 weeks 2 × $4,019 = $8,038.00 | |
| EX overtime | 20 hr: $8,038 × 20 / 80 = $2,009.50 | rental with overtime $10,047.50 |
| EX fuel | 100 × 4.5 × 6.276 = $2,824.20 | $2,824.20 |
| EX mob/demob | $1,800 + $1,800 = $3,600.00 | $3,600.00 |
| EX total | **$16,471.70** | **$16,471.70** |
| ADT rental + overtime (each) | $11,528.00 + $2,882.00 = $14,410.00 | $14,410.00 |
| ADT fuel (each) | 100 × 4.38 × 6.276 = $2,748.89 | $2,748.89 |
| ADT mob/demob (each) | $3,600.00 | $3,600.00 |
| ADT total (× 2) | **$41,517.78** | **$41,517.78** |
| Line equipment | **$57,989.48** | **$57,989.48** |
| Labour | 0.5 Foreman (no craft) + 0.5 Laborer + 3 operators, 100 crew-hr | "Missing data" (wage for Foreman) |

At the project's own location factor (1.01 from its wage set) the app reads $16,572.18 and $41,805.98: 1 % of rental
more, as the factor applies to bare rental only.

### Correction to D-751's coverage

D-751's report said "no starter machine reads No data" and the D-753 check below would have read 0 "Missing data":
both looked at the lines, not at the shared machines. **Three of the starter's site machines cannot price:** the hired
operated tri-axles (DT-OP-3AXLE × 5) of Load and haul off (A6), Haul off (A7) and Haul in (A8) read "MISSING: Mob/demob
(self-propelled: enter a quote or confirm none)" on the export's Equipment basis sheet, so they have no total and their
lines carry $0 for them with nothing on the line (a shared machine's missing data does not reach its hosts). **$136,947.25
of trucks is not in the equipment total.** See D-754 and the question below.

### Missing crafts (D-753)

Commits: api `a0b6e94`, app `2425b97`. Gates green; quantity table passed (60 equipment rows; the foreman's pricing is
the api's, not the shared engine's, so it is checked in the smoke).

- **Foreman** is a crew row marked foreman: the crew's highest-paid other craft × (1 + premium), the Laborer rate when it
  is alone, or a wage determination's FOREMAN rate when the project's set came from one (marked up as the set marks up
  its Laborer). **Foreman premium:** Settings › Wage Calculator › Advanced (blank = 10 %), and the project's own on its
  Wage Calculator page (on its current set, carried to the next).
- **Grade checker and Pipelayer are not added yet** (D-753): the gap fill's documented ratios do not reach them, and the
  helper rule gives Grade checker $34.66 and Pipelayer $26.63 (wage and benefits, Commercial & Public), both below
  Laborer's $38.04. Their rows read "Missing data: wage for …" until you choose (Questions). Neither occurs on the HV copy.
- **HV copy recalculated** (twice, 20:10 and 20:11 UTC; 263 components, 24 site machines, equal fingerprints):

  | | Before the crafts (19:27) | Now |
  |---|---|---|
  | Labour | $16,052.87 | **$299,143.65** |
  | Equipment | $361,146.19 | **$361,146.19** (unchanged; the trucks above are not in it) |
  | Full estimate | $605,837.08 | **$888,927.86** |

  Coverage (`day-753-coverage-hv-copy.xlsx`): 86 lines with a quantity, **second list empty**; **crews missing a wage: 0**
  (every Foreman at $119.79 = Equipment Operator $108.90 × 1.10). Needs attention 7, the lines that read 0. **But the
  three truck machines above are missing data** (not counted by the line checks).
- Smoke: the project premium set to 15 % → every foreman $125.24 ($108.90 × 1.15), back to blank → 10 %; the company
  field shows in Settings › Wage Calculator › Advanced (placeholder 10 %).

### Equipment by activity on the HV copy (D-754, report only)

From `day-753-coverage-hv-copy.xlsx` (Equipment basis). Each activity's site machines run the same hours (its total ÷
production × 10-hr day); rental is the billed cover at catalog rates × location 1.01 × machines; overtime the rest.

| Activity | Total | Production /day | Tier | Machines | Days | Hours a machine | Rental | Overtime | Fuel | Mob/demob | Equipment | $ per unit | Not priced |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Excavate and load (on-site haul) | 5,575.35 BCY | 700 | 600–899 | 1 x EX-CRAWL-20T + 2 x ADT-30T | 7.96 | 79.65 | $29,199.10 | $5,711.28 | $5,768.50 | $8,300.00 | $48,978.89 | $8.78/BCY |  |
| Excavate and load (direct to haul-off trucks) | 167.06 BCY | 250 | 200–599 | 1 x EX-CRAWL-20T | 0.67 | 6.68 | $1,050.40 | $0.00 | $116.59 | $1,100.00 | $2,266.99 | $13.57/BCY |  |
| Place and compact | 9,690.51 CCY | 900 | 850–1,299 | 1 x DZ-CRAWL-D6 + 1 x AT-GPS-DOZER + 1 x DZ-CRAWL-D5 + 1 x CP-SD-84-SM | 10.77 | 107.67 | $32,442.21 | $7,252.44 | $8,007.66 | $4,100.00 | $51,802.32 | $5.35/CCY |  |
| Strip topsoil (push to stockpile) | 3,622.38 BCY | 700 | 500–999 | 1 x DZ-CRAWL-D5 | 5.17 | 51.75 | $5,821.64 | $454.62 | $1,338.06 | $1,100.00 | $8,714.32 | $2.41/BCY |  |
| Respread topsoil (from stockpile) | 39.11 BCY | 300 | 200–499 | 1 x CTL-LARGE + 1 x DZ-CRAWL-D3 | 0.13 | 1.3 | $1,388.75 | $0.00 | $42.79 | $2,100.00 | $3,531.54 | $90.30/BCY |  |
| Load and haul off (from stockpile) | 4,363.13 LCY | 700 | 561–700 | 1 x WL-SMALL-3Y + 5 x DT-OP-3AXLE | 6.23 | 62.33 | $3,737.00 | $422.43 | $825.40 | $1,100.00 | $6,084.83 | $1.39/LCY | trucks $33,078.70 not priced (no mob) |
| Haul off (loaded by excavator) | 8,309.36 LCY | 700 | 561–700 | 5 x DT-OP-3AXLE | 11.87 | 118.71 | $0.00 | $0.00 | $0.00 | $0.00 | — | — | trucks $62,996.85 not priced (no mob) |
| Haul in (import) | 5,391.03 LCY | 700 | 561–700 | 5 x DT-OP-3AXLE | 7.7 | 77.01 | $0.00 | $0.00 | $0.00 | $0.00 | — | — | trucks $40,871.70 not priced (no mob) |
| Rock excavation (break and load) | 6,192.29 BCY | 200 | 150–299 | 2 x EX-CRAWL-30T + 2 x AT-BRK-36T + 1 x EX-CRAWL-30T | 30.96 | 309.61 | $100,834.36 | $25,052.00 | $26,232.42 | $12,400.00 | $164,518.79 | $26.57/BCY |  |
| Fine grade / subgrade prep | 3,200 SF | 5,000 | 2,000–7,999 | 1 x CTL-LARGE + 0.5 x CP-SD-84-SM | 0.64 | 6.4 | $858.50 | $0.00 | $190.99 | $1,550.00 | $2,599.49 | $0.81/SF |  |
| Pipe crew, gravity storm/sewer (excavate, lay, backfill) | 1,012.42 LF | 250 | 200–349 | 1 x EX-CRAWL-30T + 1 x EX-CRAWL-20T + 1 x WL-COMPACT-1Y + 1 x DZ-CRAWL-D3 | 4.05 | 40.5 | $10,882.75 | $135.17 | $2,531.41 | $6,800.00 | $20,349.33 | $20.10/LF |  |
| Trench box with pipe crew | 1,012.42 LF | 250 | 200+ | 2 x TB-STL-8x20 | 4.05 | 40.5 | $1,282.70 | $15.94 | $0.00 | $1,600.00 | $2,898.63 | $2.86/LF |  |

Site machines price **$311,745.13**; the other **$49,401.06** of the $361,146.19 is the 32 components entered by hand on the
night's TEST lines (priced per line). Rip rock (A10) and over-excavation have no line on the HV copy.

The five most expensive machines (share of $361,146.19):

| Machine | Activity | Total | Share |
|---|---|---|---|
| 2 × EX-CRAWL-30T | Rock excavation | $75,912.37 | 21.0 % |
| 2 × AT-BRK-36T (breaker) | Rock excavation | $50,650.24 | 14.0 % |
| 2 × ADT-30T | Excavate and load (on-site) | $39,420.23 | 10.9 % |
| 1 × EX-CRAWL-30T (the loading excavator) | Rock excavation | $37,956.18 | 10.5 % |
| 1 × DZ-CRAWL-D6 | Place and compact | $21,127.97 | 5.9 % |

Rock excavation alone is $164,518.79 (46 %): 6,192.29 BCY at the starter's 200 BCY/day is 31 days of 3 excavators and 2
breakers.

### Stockpile roles (D-755)

`strip_stockpile` and `undercut_stockpile` are destination lines: the volume their strip or undercut line digs, loose
(bank × swell), when "Stockpile on site" is chosen. No line of either exists on the bench (on the HV copy every strip and
undercut is hauled off or re-used: e.g. Strip Area 3,583.27 BCY → Haul Off 4,120.77 LCY; a stockpile line would carry the
same 4,120.77 LCY). **Both stay unmapped:** `strip_stockpile` → none (A4, the strip line's own activity, already pushes
to the stockpile; respreading is `strip_reuse_topsoil` → A5); `undercut_stockpile` → none (mapping it to A1 would price
the excavator twice; a project that stockpiles undercut maps its undercut line to A1, on-site haul).

### One owned workspace (D-752, revised)

Built, **not committed: the platform-admin half of the smoke could not run.** Gates green (api ruff, mypy, alembic
check; app lint, typecheck, build).

- `POST /api/workspace` refuses an account that already owns one (409 "You already own a workspace.") unless a platform
  admin allowed more (`user.extra_owned_workspaces`, migration `d752a1b2c3d4`). A first workspace's trial runs from the
  account's **signup**, never from creation; an allowed extra one opens with a window that has already closed (view-only
  until its own Checkout; no trial AI credits). Developer › Billing tiers › Overrides › Owned workspaces: find an account,
  "Allow one more owned workspace" (audit: `platform.extra_workspace_allowed` in its first workspace's log).
- **Smoke run:** a throwaway account's first workspace 201, its second 409 "You already own a workspace."; the first
  workspace's trial started at the signup (20:39:24), not at creation (20:39:29).
- **Not run:** the grant and the allowed second workspace. They need a platform admin; making the throwaway one (a database
  flag, as earlier admin smokes did) was refused by this session's permissions, and the founder's own account is not used.

### Questions (day, continued)

- **The hired tri-axles' mob/demob** (DT-OP-3AXLE, operated): enter a quote, confirm "none" (the truck drives itself and
  its hourly rate includes the driver), or should an operated hired machine carry no mob by rule? Until then $136,947.25
  of trucks is unpriced. And should a shared machine's missing data be flagged on every line it serves (today it is not)?
- **Grade checker and Pipelayer:** A) the helper rule as computed; B) the group journeyman's rate (Equipment Operator
  $49.51, Laborer $38.04); C) a ratio you state.
- **D-752's admin smoke:** allow a platform-admin throwaway for it (or run "Allow one more owned workspace" yourself),
  then I finish the smoke and push.

### Morning checklist (day)

1. The 4,000 BCY per-line figure is resolved ($8,070.63, the founder's correction); D-744 to D-748 and the decisions are
   accepted.
2. Accept or reject D-744 to D-748.
3. See the site spread: as the throwaway, zz Equip 3.6 site spread › Estimating › Equipment settings › Earthwork
   production, and the HV copy's.
4. Exports added: `day-3.6-coverage-hv-copy.xlsx`, `day-d745-TEST-two-machines.xlsx`.
5. Before testers: the full fixture-suite run from the tag (still required).

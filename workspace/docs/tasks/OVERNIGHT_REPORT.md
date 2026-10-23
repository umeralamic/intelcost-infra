# Night report, 2026-10-23 → 24: the Equipment Library (F33)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 06:26 UTC. Updated after every block.

## Blocks

| Block | Status | Commit(s) | Quantity table | Check: expected → got |
|---|---|---|---|---|
| Part 1 | Done 06:44 UTC | infra ba75734 (mirror) | not run (no code) | answers applied, D-718 to D-729, rule 9 scan clean |
| 1.1 (D-730) | Done 06:55 UTC | api 522670a | passed: 344 rows …, plus eqlib counts 628 104 592 9 33 4 157 and 0 zero rents | psql: classes 628 → 628; EX-CRAWL-20T 1040/2927/7950/97.76/2.78 → same; DZ-CRAWL-D1 rent NULL, owned 41.18 → same; EX-CRAWL-20T EW-CUTLOAD 163.344 → 163.344; CR-TOWER rental → rental. Smoke: throwaway fx.equip.202610230651@ signed in after the migrations, workspace "zz Equip Night" made, api health ok |
| 1.2 (D-731) | Done 07:08 UTC | api 9a54a16 | passed (unchanged rows; api only) | GET EX-CRAWL-20T rent_day: 1040 national A → 1040, national, A; PUT 980 → 980, workspace, U, national 1040, set by Equip Night; DELETE → 1040 national. Extra: fuel price 0 refused (422); confirm none on AW-AB-EL-60 fuel → value null, confirmed_none true (not 0). Bundle 750 KB, ~80 ms |
| 2.1 (D-732) | Done 07:36 UTC | app 277b4ff, infra (below) | passed; 23 equipment rows right (628 classes mob and demob equal to the catalog) | Equipment settings: fuel diesel empty "No data, enter a value" → same; US average click → 6.276 tagged User ("This estimate U") → same, kept after reload; location 1.00 "No wage set" → "No wage set: 1.00" (first showed "No wage set location", fixed); haul 50 → 50; work day 8 → 8. Rows: ex. 1 $8,022.13, owned $8,153.05, lift $3,895.13, owned $4,497.21, EL-60 null, spread at machine level | 1.2 (D-731) | Done 07:08 UTC | api 9a54a16 | passed (unchanged rows; api only) | GET EX-CRAWL-20T rent_day: 1040 national A → 1040, national, A; PUT 980 → 980, workspace, U, national 1040, set by Equip Night; DELETE → 1040 national. Extra: fuel price 0 refused (422); confirm none on AW-AB-EL-60 fuel → value null, confirmed_none true (not 0). Bundle 750 KB, ~80 ms |
| 2.2 (D-733) | Done 07:52 UTC | app a2197f3, api 7c71a8f | passed; 33 equipment rows right (628 mob pairs and 965 production formula cells equal to the workbook) | 965 cells recomputed → all equal to 1e-9; 228 D rows blank → 228 blank, 0 not; EX-CRAWL-20T EW-CUTLOAD at E 0.75: 147.60 → 147.6 (C); CCY → LCY 1000 → 1390; BCY → LCY 1000 → 1250; 10,000 BCY at 163.344 → 61.2205 hr. Browser: efficiency 0.75 typed in Equipment settings → 147.6 from the api bundle; revert → 0.83, 163.344. **Found and fixed:** two first writes of one override at once gave a 500 (unique index); now 3 concurrent → 200 ×3, one row |
| 3.1 (D-734) | Done 08:22 UTC | api 77d391e, app 8e081e7 | passed; 41 equipment rows right, 29 cost rows right (unchanged) | Cut 10,000 BCY + EX-CRAWL-20T (made through the api): Total Equipment $8,022.13 → $8,022.13. Spread (TEST, 1,000 BCY/day, 2 × EX-CRAWL-20T, 2 TEST operators following it): 8-hr | 2.2 (D-733) | Done 07:52 UTC | app a2197f3, api 7c71a8f | passed; 33 equipment rows right (628 mob pairs and 965 production formula cells equal to the workbook) | 965 cells recomputed → all equal to 1e-9; 228 D rows blank → 228 blank, 0 not; EX-CRAWL-20T EW-CUTLOAD at E 0.75: 147.60 → 147.6 (C); CCY → LCY 1000 → 1390; BCY → LCY 1000 → 1250; 10,000 BCY at 163.344 → 61.2205 hr. Browser: efficiency 0.75 typed in Equipment settings → 147.6 from the api bundle; revert → 0.83, 163.344. **Found and fixed:** two first writes of one override at once gave a 500 (unique index); now 3 concurrent → 200 ×3, one row |
| 3.2 (D-735) | Done 08:44 UTC | app 61a3690 | passed; 41 equipment rows, 29 cost rows | Through the row menu on a TEST Cut 10,000 BCY: search "excavator 20", 20-25 t: A, | 3.1 (D-734) | Done 08:22 UTC | api 77d391e, app 8e081e7 | passed; 41 equipment rows right, 29 cost rows right (unchanged) | Cut 10,000 BCY + EX-CRAWL-20T (made through the api): Total Equipment $8,022.13 → $8,022.13. Spread (TEST, 1,000 BCY/day, 2 × EX-CRAWL-20T, 2 TEST operators following it): 8-hr | 2.2 (D-733) | Done 07:52 UTC | app a2197f3, api 7c71a8f | passed; 33 equipment rows right (628 mob pairs and 965 production formula cells equal to the workbook) | 965 cells recomputed → all equal to 1e-9; 228 D rows blank → 228 blank, 0 not; EX-CRAWL-20T EW-CUTLOAD at E 0.75: 147.60 → 147.6 (C); CCY → LCY 1000 → 1390; BCY → LCY 1000 → 1250; 10,000 BCY at 163.344 → 61.2205 hr. Browser: efficiency 0.75 typed in Equipment settings → 147.6 from the api bundle; revert → 0.83, 163.344. **Found and fixed:** two first writes of one override at once gave a 500 (unique index); now 3 concurrent → 200 ×3, one row |
| 3.3 (D-736) | Done 09:16 UTC | api 9c1b657, app e3666c9 | passed; 43 equipment rows (shared split to the cent), 29 cost rows | TEST Shared A 10,000 BCY (division 31) priced as shared from the picker, TEST Shared B 20 usage hr: rental 2 weeks + 1 day $6,894.00 → same, fuel | 3.2 (D-735) | Done 08:44 UTC | app 61a3690 | passed; 41 equipment rows, 29 cost rows | Through the row menu on a TEST Cut 10,000 BCY: search "excavator 20", 20-25 t: A, | 3.1 (D-734) | Done 08:22 UTC | api 77d391e, app 8e081e7 | passed; 41 equipment rows right, 29 cost rows right (unchanged) | Cut 10,000 BCY + EX-CRAWL-20T (made through the api): Total Equipment $8,022.13 → $8,022.13. Spread (TEST, 1,000 BCY/day, 2 × EX-CRAWL-20T, 2 TEST operators following it): 8-hr | 2.2 (D-733) | Done 07:52 UTC | app a2197f3, api 7c71a8f | passed; 33 equipment rows right (628 mob pairs and 965 production formula cells equal to the workbook) | 965 cells recomputed → all equal to 1e-9; 228 D rows blank → 228 blank, 0 not; EX-CRAWL-20T EW-CUTLOAD at E 0.75: 147.60 → 147.6 (C); CCY → LCY 1000 → 1390; BCY → LCY 1000 → 1250; 10,000 BCY at 163.344 → 61.2205 hr. Browser: efficiency 0.75 typed in Equipment settings → 147.6 from the api bundle; revert → 0.83, 163.344. **Found and fixed:** two first writes of one override at once gave a 500 (unique index); now 3 concurrent → 200 ×3, one row |
,417.08 → same, mob | 3.2 (D-735) | Done 08:44 UTC | app 61a3690 | passed; 41 equipment rows, 29 cost rows | Through the row menu on a TEST Cut 10,000 BCY: search "excavator 20", 20-25 t: A, | 3.1 (D-734) | Done 08:22 UTC | api 77d391e, app 8e081e7 | passed; 41 equipment rows right, 29 cost rows right (unchanged) | Cut 10,000 BCY + EX-CRAWL-20T (made through the api): Total Equipment $8,022.13 → $8,022.13. Spread (TEST, 1,000 BCY/day, 2 × EX-CRAWL-20T, 2 TEST operators following it): 8-hr | 2.2 (D-733) | Done 07:52 UTC | app a2197f3, api 7c71a8f | passed; 33 equipment rows right (628 mob pairs and 965 production formula cells equal to the workbook) | 965 cells recomputed → all equal to 1e-9; 228 D rows blank → 228 blank, 0 not; EX-CRAWL-20T EW-CUTLOAD at E 0.75: 147.60 → 147.6 (C); CCY → LCY 1000 → 1390; BCY → LCY 1000 → 1250; 10,000 BCY at 163.344 → 61.2205 hr. Browser: efficiency 0.75 typed in Equipment settings → 147.6 from the api bundle; revert → 0.83, 163.344. **Found and fixed:** two first writes of one override at once gave a 500 (unique index); now 3 concurrent → 200 ×3, one row |
,100.00 → same, total $9,411.08 → same, shares $7,093.66 / $2,317.42 → same (75.38 %), unallocated $0.00 → same; B excluded: H 61.22, $8,022.13 all on A → same. Two own EX-CRAWL-20T in division 31 (C, D): "Mob/demob counted 2 times: price as one shared machine?" on both → same; totals unchanged ($4,561.07 each, worked by hand) |
,040 / $2,927 / $7,950 → same; cut and load 163.3 BCY/hr C, 61.22 hr, 2 weeks, $8,022.13 → same (against 1 week + 3 days $6,047, one 4-week $7,950); Owned $8,153.05 + ceiling → same; Low fuel $837.60 → same; production 1,000/day and 2 machines: capacity "2 × … ≈ 2,613 BCY/day" → **≈ 2,614** (see Disputed), | 3.1 (D-734) | Done 08:22 UTC | api 77d391e, app 8e081e7 | passed; 41 equipment rows right, 29 cost rows right (unchanged) | Cut 10,000 BCY + EX-CRAWL-20T (made through the api): Total Equipment $8,022.13 → $8,022.13. Spread (TEST, 1,000 BCY/day, 2 × EX-CRAWL-20T, 2 TEST operators following it): 8-hr | 2.2 (D-733) | Done 07:52 UTC | app a2197f3, api 7c71a8f | passed; 33 equipment rows right (628 mob pairs and 965 production formula cells equal to the workbook) | 965 cells recomputed → all equal to 1e-9; 228 D rows blank → 228 blank, 0 not; EX-CRAWL-20T EW-CUTLOAD at E 0.75: 147.60 → 147.6 (C); CCY → LCY 1000 → 1390; BCY → LCY 1000 → 1250; 10,000 BCY at 163.344 → 61.2205 hr. Browser: efficiency 0.75 typed in Equipment settings → 147.6 from the api bundle; revert → 0.83, 163.344. **Found and fixed:** two first writes of one override at once gave a 500 (unique index); now 3 concurrent → 200 ×3, one row |
6,699.56 → same, operator row count 2 following the machine → same (wage blank until a craft: "Missing data: operator wage"), 80 crew-hr Linked → same; Unlink, 12.5 → "Crew 800.0 hr, spread 80.0 hr" → same, Link → 80. Lift on a TEST MEP item with a 64 crew-hr crew: no activity step, 64 hr, 2 weeks, $3,895.13 → same; EL-60: fuel "No data, enter a value", total "—", saved and flagged → same (flag still reads "Formula error" until Block 3.4) |
6,699.56, crew 80 hr → | 2.2 (D-733) | Done 07:52 UTC | app a2197f3, api 7c71a8f | passed; 33 equipment rows right (628 mob pairs and 965 production formula cells equal to the workbook) | 965 cells recomputed → all equal to 1e-9; 228 D rows blank → 228 blank, 0 not; EX-CRAWL-20T EW-CUTLOAD at E 0.75: 147.60 → 147.6 (C); CCY → LCY 1000 → 1390; BCY → LCY 1000 → 1250; 10,000 BCY at 163.344 → 61.2205 hr. Browser: efficiency 0.75 typed in Equipment settings → 147.6 from the api bundle; revert → 0.83, 163.344. **Found and fixed:** two first writes of one override at once gave a 500 (unique index); now 3 concurrent → 200 ×3, one row |
6,699.56, 160 MH = 80 crew-hr × 2; 10-hr $20,324.46, 100 → $20,324.46, 200 MH; back to 8 → | 2.2 (D-733) | Done 07:52 UTC | app a2197f3, api 7c71a8f | passed; 33 equipment rows right (628 mob pairs and 965 production formula cells equal to the workbook) | 965 cells recomputed → all equal to 1e-9; 228 D rows blank → 228 blank, 0 not; EX-CRAWL-20T EW-CUTLOAD at E 0.75: 147.60 → 147.6 (C); CCY → LCY 1000 → 1390; BCY → LCY 1000 → 1250; 10,000 BCY at 163.344 → 61.2205 hr. Browser: efficiency 0.75 typed in Equipment settings → 147.6 from the api bundle; revert → 0.83, 163.344. **Found and fixed:** two first writes of one override at once gave a 500 (unique index); now 3 concurrent → 200 ×3, one row |
6,699.56. Rows: hand-entered host bit for bit; snapshot holds $8,022.13 after the company raises its rates, marked changed |
6,699.56 / $20,324.46 / | 1.2 (D-731) | Done 07:08 UTC | api 9a54a16 | passed (unchanged rows; api only) | GET EX-CRAWL-20T rent_day: 1040 national A → 1040, national, A; PUT 980 → 980, workspace, U, national 1040, set by Equip Night; DELETE → 1040 national. Extra: fuel price 0 refused (422); confirm none on AW-AB-EL-60 fuel → value null, confirmed_none true (not 0). Bundle 750 KB, ~80 ms |
1,841.56 / $21,112.56 → all equal |

## Step A: earthwork lines (change 4)

Recorded in full in `EQUIPMENT_LIBRARY_PLAN.md` §1.8.
- **Updated in place:** Calculate's lines are `takeoff_item` rows keyed by (region, role, variant) and updated in place.
- **Components survive:** a line no longer produced but carrying a cost component is kept at 0, "Not in the last
  Calculate", never deleted.
- **The founder's list:** it matches the code except "→ Re-use", which the code writes in BCY (topsoil) or CCY (fill),
  not LCY.
- **The code also has:** cut (BCY), fill (CCY), soil export and import (LCY), rock hard dig, over-excavation,
  replacement fill, subgrade prep (SF), geosynthetics (SY), stockpile, and ten utility roles.

## Disputed numbers

- **The plan said 33 settings from the catalog; the catalog has 32.** The 33rd is "hours per work day" (8, D-724), which is not a catalog value. Nothing was changed to make the count fit.

- **Capacity check, "≈ 2,613 BCY/day" in the brief:** 2 × 163.344 BCY/hr × 8 hr = 2,613.5; the app rounds to the nearest, 2,614. Built to round; truncating would give the brief`s 2,613. A display choice only, no money.

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
4. **Library writes take `canManageWorkspaceLibrary`** ("Manage workspace library", D-731), not Crews` `canManageWorkspace`: the name fits the company list; owners and admins hold both. Alternative: Crews` capability.
5. **Fuel gal/hr grades** (D-731): the catalog has no fuel confidence column; graded D blank, C where it says "Derived (C)", else B (single source, README legend). Alternative: show no grade on fuel.
6. **Dual, hybrid and propane/diesel fuel types price at diesel** (D-732). Alternative: ask for the fuel type on each such machine.
7. **Overtime counted on the total** (hours − 8 × billed days, D-732), weighted by the billed days each period covers. Alternative: per worked day.
8. **A missing value prices as 0 with a "Missing data" error and no last good total** (D-734), so totals add up and every error marker shows it; the component and its line are flagged (in full from Block 3.4). Alternative: carry a null through every total.
9. **A snapshot holds the library values (national and company); this estimate's own values stay live** (D-734): a fuel price or work day the estimator types for this job moves the money at once; a release or a company edit waits for Update. Alternative: freeze everything at pick time.
10. **Mob counted twice reads "…counted N times: price as one shared machine?"** with a colon, not the brief`s em dash (house prose rule, D-736); items with no classification are not treated as one division. Alternative: the em dash.
11. **One shared machine per division and class:** "Price as a shared machine…" reuses the division`s machine of the same class, else makes one homed on the item`s division (D-736). Alternative: always a new machine.
12. **The follow-up's test copy** (D-729): recorded in the plan; applied from Block 3.5.

## Questions for the founder

- `alembic check` reports an index drift that predates tonight (`ix_renderer_report_created_at`, from D-694): the migration lacks the index the model declares, or the reverse. Not touched; worth one line of migration.

## Left undone

_To be filled at the end._

## Morning checklist

_To be filled at the end._

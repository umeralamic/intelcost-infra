# Night report, 2026-10-23 → 24: the Equipment Library (F33)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 06:26 UTC. Updated after every block.

## Blocks

| Block | Status | Commit(s) | Quantity table | Check: expected → got |
|---|---|---|---|---|
| Part 1 | Done 06:44 UTC | infra ba75734 (mirror) | not run (no code) | answers applied, D-718 to D-729, rule 9 scan clean |
| 1.1 (D-730) | Done 06:55 UTC | api 522670a | passed: 344 rows …, plus eqlib counts 628 104 592 9 33 4 157 and 0 zero rents | psql: classes 628 → 628; EX-CRAWL-20T 1040/2927/7950/97.76/2.78 → same; DZ-CRAWL-D1 rent NULL, owned 41.18 → same; EX-CRAWL-20T EW-CUTLOAD 163.344 → 163.344; CR-TOWER rental → rental. Smoke: throwaway fx.equip.202610230651@ signed in after the migrations, workspace "zz Equip Night" made, api health ok |

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
4. **The follow-up's test copy** (D-729): recorded in the plan; applied from Block 3.5.

## Questions for the founder

_None so far._

## Left undone

_To be filled at the end._

## Morning checklist

_To be filled at the end._

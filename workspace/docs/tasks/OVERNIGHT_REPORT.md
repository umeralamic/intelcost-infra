# Night report, 2026-10-23 → 24: the Equipment Library (F33)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 06:26 UTC. Updated after every block.

## Blocks

| Block | Status | Commit(s) | Quantity table | Check: expected → got |
|---|---|---|---|---|
| Part 1 | Done 07:40 UTC | workspace mirror | not run (no code) | answers applied, D-718 to D-729, rule 9 scan clean |

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

_None so far._ Every number in the brief was checked against its rule before building:
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

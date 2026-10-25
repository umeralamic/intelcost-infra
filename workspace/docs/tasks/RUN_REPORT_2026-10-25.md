# Run report: the answers of 2026-10-25 (D-772 to D-776)

Follows [RUN_REPORT_2026-10-24.md](RUN_REPORT_2026-10-24.md), whose stray "EOF / echo ok" lines are removed.
Answers 4 and 5 needed no work: the HV copy's 2,100 CCY/day edit stays, and nothing was pressed on your projects.

## 7. The 14 lines flagged "Mob/demob counted more than once" (D-776: a bug, fixed)

**Which equipment, which lines:**

| Division | Equipment (class) | Lines carrying their own one, each with its own mob/demob |
|---|---|---|
| 31 | Single-drum roller 84" heavy (CP-SD-84-HVY) | Mix and Compact, twice (the two stabilizations' mix lines) |
| 31 | 6" trash pump (PMP-SP-6D) | Trench Dewatering — Sanitary Sewer; Trench Dewatering — Storm |
| 33 | Single-drum roller 84" heavy (CP-SD-84-HVY) | Pipe Bedding, Pipe Zone and Trench Backfill, on both runs (6 lines) |
| 33 | Crawler dozer D6 (DZ-CRAWL-D6) | the same 6 lines |
| 33 | Excavator 20–25 t (EX-CRAWL-20T) | Trench Excavation layers 1 and 2, on both runs (4 lines) |

These are 14 distinct lines. They carried 20 machines and 14 crews (34 automatic components).

**Why none was on one shared spread:**
- **Made by a drive, not by you:** they were priced per line by TEST activities that a fixture drive created on
  2026-10-23 at 10:34 and deleted at 19:09, then replaced with the national activities.
- **The bug:** deleting an activity dropped its site spreads, but left the lines it had priced per line with that
  activity's machines, crew and a spread row naming an activity that no longer existed.
- **Calculate never fixed it:** no activity in the workspace maps these roles today, so Calculate skipped the lines
  and never released or re-spread them.
- **So:** each line kept billing its own rental and its own mob.

**Fixed (api df429de):**
- **Deleting an activity** now releases every unedited line it priced per line, in every project.
- **The next Calculate** releases any spread whose activity is gone.
- **Migration d776** released the ones already there. On the bench that is only this HV copy (fixture workspace):
  14 lines and 34 components.
- **Edited lines:** a line a person edited keeps its machines.
- **Result:** none is flagged now; Needs attention reads 17, down from 21.

**Totals before → after, on the HV copy:**

| Report | Before | After |
|---|---|---|
| Full estimate | $994,208.70 | $943,321.78 |
| Labor | $278,501.32 | $277,015.46 |
| Material | $183,285.35 | $183,285.35 |
| Equipment | $487,069.36 | $437,668.30 |
| Subcontract | $45,352.67 | $45,352.67 |

**Every line that changed:**

| Line | Labor | Equipment | Item cost |
|---|---|---|---|
| Mix and Compact | $47.41 → $0 | $2,415.23 → $0 | $2,462.64 → $0 |
| Mix and Compact (2nd) | $47.41 → $0 | $2,415.23 → $0 | $2,462.64 → $0 |
| Soil stabilization, Lime 6%, 12" (parent of one) | | | $3,307.44 → $844.80 |
| Soil stabilization, Cement + Fly ash, 8" (parent of the other) | | | $3,169.31 → $706.67 |
| Trench Excavation, Layer 1 — Sanitary | $105.76 → $0 | $2,187.31 → $0 | $2,293.07 → $0 |
| Trench Excavation, Layer 2 — Sanitary | $32.30 → $0 | $2,161.67 → $0 | $2,193.97 → $0 |
| Pipe Bedding — Sanitary | $66.50 → $0 | $5,661.96 → $0 | $6,992.03 → $1,263.57 |
| Pipe Zone — Sanitary | $241.27 → $0 | $5,748.72 → $0 | $10,574.10 → $4,584.11 |
| Trench Backfill — Sanitary | $154.38 → $0 | $5,705.59 → $0 | $5,859.97 → $0 |
| Trench Dewatering — Sanitary | $57.25 → $0 | $799.07 → $0 | $856.32 → $0 |
| Trench Excavation, Layer 1 — Storm | $163.29 → $0 | $2,207.38 → $0 | $2,370.67 → $0 |
| Trench Excavation, Layer 2 — Storm | $1.43 → $0 | $2,150.90 → $0 | $2,152.33 → $0 |
| Pipe Bedding — Storm | $69.34 → $0 | $5,663.37 → $0 | $7,050.18 → $1,317.47 |
| Pipe Zone — Storm | $313.52 → $0 | $5,784.59 → $0 | $12,055.02 → $5,956.91 |
| Trench Backfill — Storm | $164.03 → $0 | $5,710.38 → $0 | $5,874.41 → $0 |
| Trench Dewatering — Storm | $21.96 → $0 | $789.66 → $0 | $811.62 → $0 |

**Two lines moved by a hundredth:** Undercut replacement fill, Structural Fill (3.48 → 3.49 MH) and Rock Export,
Layer 3 (labour $4,732.36 → $4,732.35). That is D-772's cent balancing: when the set of rows changes, a cent moves
to the row with the largest remainder. Their own figures did not change.

**What is left for you:** these 14 lines now carry no machines or crew.
- **Their material stays.**
- **To price them:** map their roles to an activity in Equipment settings, for example "Pipe crew, gravity
  storm/sewer" or "Trench box with pipe crew", which already price the pipe lines as one site spread. Or type rates.
- **Mapped roles:** Calculate then puts them on that activity's site spread, so each machine and its mob count once.

## 1. Totals add up as shown (D-772; app dea1df2)

**The bid total:** it is now the sum of the rounded cost-type totals. The sidebar's Full estimate, the grid's TOTAL,
the bid summary's Direct cost and Bid total, and the export all read **$994,208.70**. The four types are unchanged.

**Rounding:**
- **One balancing everywhere:** the grid's rows are balanced to whole cents together, the export's method, now
  used on screen.
- **Rows:** each row's Item Cost is its shown types added.
- **Totals:** each group and the TOTAL are their rows added.
- **Cost components:** the lists show their balanced cents, and the Full estimate list's TOTAL is its four sections
  added.
- **Side effect:** a line can read a cent apart from its own figure rounded alone (the two lines above).

**The guest page's fallback (a gap from B1, fixed):**
- **The gap:** it priced every line under the old rules, though new projects price under rules 2.
- **Now:** the share bundle carries the project's and each line's rules, and the fallback adds a parent's own
  components.
- **Checked:** on a throwaway line (1,000 SF, 10 % wastage, rules 2) the guest's Estimating read $2,000 labor,
  $1,650 material, $3,650, equal to Estimating. Under the old rules it would read $3,850.
- **Not driven:** the fallback page itself only opens when a guest session cannot be issued. It was not driven;
  it shares the engine that was.

## 2. Renaming Calculate lines (D-773)

- **The api** accepts a new name on a Calculate line.
- **The Takeoff panel** renames it on a double-click; its tooltip says Calculate keeps the name.
- **Checked on the HV copy:** I renamed "Trench Dewatering — Storm" to "Storm pump-out (renamed)" and ran Calculate.
  It kept the name; every other line took its new name.

## 3. Utility work names (D-774)

**On the HV copy's Calculate, the lines read:**
- `10" PVC SDR-35, 0–6 ft deep`
- `Trench excavation, Layer 1`
- `Pipe bedding, #57 stone`
- `Pipe zone, Sand`
- `Trench backfill, Native`
- `Trench protection, Sloped 1:1 0–6 ft`
- `Trench dewatering`
- `Trench in rock`
- `Utility spoils export, rock (71.62 BCY)`

**The Feature:**
- **Grid and export:** the Feature column reads Sanitary Sewer or Storm.
- **Classification:** the run is the heading.

**Unchanged:** no money moved; the totals were $943,321.78 before and after that Calculate.

**My call:** pipe lines keep their depth range in the name (`, 0–6 ft deep`), because Calculate splits them by it.
Without it, two lines would read the same.

## 6. Equipment › Cost components (D-775)

**Layout:**
- **The top level:** one row per library class (any mode, shared or not) or per typed equipment.
- **Under it:**
  - each activity that uses it
  - each shared spread ("Place and compact (shared spread)"), with any Unallocated part
- **Counted once:** a shared machine's count and days.

**On the HV copy:** 15 rows, each class once, TOTAL $437,668.30 = the Equipment report. For example, Excavator
30–36 t reads 4 machines: 1 in the pipe crew's spread, 2 in rock excavation's and 1 more there as "(2)".

## Checks

- **Gates:** app lint, typecheck and build; api ruff, format, mypy and alembic check. All pass.
- **Quantity table:** passes, with 45 cost rows (new: `shown-adds-up`, `equipment-once`) and 88 utility rows (names
  updated under D-774).
- **Smoke tests:** the HV copy (the totals, Calculate, rename, the Feature column, Equipment and Full Cost
  components) and a throwaway line on zz Equip 10000 BCY for the guest. Cleaned up: the line deleted, the link
  revoked, the downloads removed.
- **Fixtures:** see below.

## Fixtures on the new build (app dea1df2, api df429de; infra 351f0df)

- **Run:** 18 fixtures. The 15 estimate and earthwork-name ones from yesterday, plus c34-my-equipment,
  c36-earthwork-link (Calculate's equipment attach) and r5-drags (utilities).
- **First run, 3 at a time:** 14 of 18 passed.
  - **c36:** a fixture still on the old screen, clicking "Equipment settings" where it used to be (D-766). Updated
    under D-771, as c32, c35 and c38 were yesterday.
  - **Three load-timing misses,** each passing alone:
    - f9-estimating's slow-load step 12
    - c10's New Measurement fields and grid rows
    - c34's "first open" figure, which waits for the total to hold 3 s while reads land
- **Rerun one at a time:** c36 6/6, f9-estimating 12/12, c10 6/6, c34 7/7.
- **Result: 18 of 18 pass.**

## Decisions taken along the way
- **Unit rates:** a row's unit rates stay as priced. Only its amounts are balanced to cents.
- **The guest fallback:** a parent with library-priced components of its own shows no figure, as its sub-items
  already did.
- **Edited lines (D-776):** a line a person edited keeps its machines when its activity is deleted. Its spread
  then still names the deleted activity.

## Questions for you
1. **The 14 released HV-copy lines** now have no machines or crew. Do you want their roles mapped to a pipe-crew
   activity on the copy, so they price as one site spread, or left as they are for your next check?

## Left
- **Testers:** a full fixture run restored from the tag is still required before any deploy to testers or a
  promotion to `main`.

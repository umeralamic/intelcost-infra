# Plan: the answers of 2026-10-25, second round (D-777 to D-782)

**Built 2026-10-27 as D-796..D-801** (the plan's D-777..D-782 had been taken by then): 6 → D-796, 3 → D-797, 5 → D-798,
4 → D-799, 1 → D-800, 2 → D-801. Questions A–E answered by the recommendations; see each decision. Fixtures written, not run.

## Order
1. **6, the fixture waits:** first, so every later rerun means something.
2. **3, bottom-up rounding:** it changes every money figure, so everything after is checked on it.
3. **5, the rock excavation label.**
4. **4, edited lines of a deleted activity.**
5. **1, mapping "none" with a reason.**
6. **2, confirm before removing pricing.**

After each one: gates, quantity table, browser smoke on a throwaway, push `umer-dev`, rerun its fixtures 3 at a
time.

---

## 6. Fixture waits that hold in parallel (D-782)
**Waits on what the page shows, never on a clock:**
- **The signal:** Estimating's root gets `data-estimate-ready` once its costs, components, equipment and usage
  reads have all landed.
- **f9-estimating step 12:** today the read is held for a fixed 5 s, which can elapse before the typing under
  load. The held read will be released by the fixture after the typing, not by a timer.
- **c10 step 4:** waits for the New Measurement form's Folder and Classification fields to be visible before
  counting them.
- **c10 step 6:** waits for `data-estimate-ready`, then the rows, not 15 s.
- **c34 `machineTotal`:** waits for `data-estimate-ready` in place of "the figure that holds 3 s".

**Files:**
- app `features/estimate/EstimatingView.tsx` (the attribute)
- infra overlays `fx-suite-updates/browser/{f9-estimating,c10-two-trees,c34-my-equipment}.mjs`

**Migration:** none. **Fixtures:** those three, run 3 at a time, twice.

## 3. Bottom-up rounding (D-779, supersedes D-772's balancing)
**Each line rounds once:**
- **A line's types:** labour, equipment, material and subcontract are each rounded to the cent once, from the
  line's own figures. Item Cost is their sum.
- **Everything above the line:** every parent, group, report total, Cost components total, the bid's Direct cost
  and the export's TOTAL is the sum of the rounded lines.
- **No balancing:** a line's figure never depends on another line.

**Removed:** `balancedCosts` and the `moneyMap` balancing (EstimatingView); `balancedRows` (summaries);
`balancedLeaves` (workbook). Each becomes "round the line, then add".

**Files:**
- app `lib/estimate/{costing,summaries,workbook}.ts`
- app `features/estimate/{EstimatingView,CostComponentsTable}.tsx`
- app `pages/GuestProject.tsx`
- infra `browser/lib/cost-cases.mjs`: `shown-adds-up`, `components-cents` and `export-stored-values` restated
  under D-779

**Migration:** none. **Report:** the HV copy's five totals before and after.

**Fixtures:** f9-estimating, f9-exports, c10, c14, c15, c16, c31, c32, c34, c35, c37, c38, n11.

## 5. Excavator 30–36 t "(2)" in rock excavation (D-781)
**Read-only query (done tonight):** the HV copy has **one** rock excavation spread (activity "Rock excavation
(break and load)", division 31). Its tier 150–300/day lists three machine rows:

| Position | Machine | Count | Paces |
|---|---|---|---|
| 0 | Excavator 30–36 t | 2 | yes |
| 1 | Breaker for ~36 t | 2 | no |
| 2 | Excavator 30–36 t | 1 | no (the loader) |

**So it is correct:** a second row of the same class in the same spread. There is nothing to fix and no change in
mob or total.

**The rename:** "(2)" becomes what the row is: "Excavator 30–36 t, not pacing" in the resource name and the Cost
components row. See question C.

**Files:**
- api `app/features/equipment/production.py` (where `(n)` is appended)
- app `lib/estimate/summaries.ts`

**Migration:** d781, renames existing "… (n)" resources by their tier row. Name only.

**Fixtures:** c35, c36; quantity table `equipment-once`.

## 4. Edited lines of a deleted activity (D-780)
**The change:** `delete_activity` converts an edited line's machines instead of leaving them on a deleted
activity's spread.
- **Own pricing:** each machine drawing on that site spread becomes the line's own. Its own count from the spread,
  its own rental and its own mob, shown on the line.
- **The spread row:** it stops naming the activity and records `deleted_activity` (the name).
- **Needs attention:** a new category, "Activity deleted: check mob/demob".

**Files:**
- api `app/features/equipment/production.py` (`delete_activity`, `drop_site`)
- api `app/features/estimate/models.py`
- app `features/estimate/EstimatingView.tsx` (the category)

**Migration:** d780, adds `estimate_item_spread.deleted_activity` (text, null).

**The bench check (read only, run at build):** edited spreads naming a missing activity, and edited lines' machines
on a resource whose activity is gone. Expected none.

**Fixtures:** c32, c36.

## 1. Line mapping "none" with a reason (D-777)
**Two reasons:**
- **"Included in: <activity>":** the line reads "Included in Pipe crew" (Estimating's Item Cost note and the Takeoff
  row).
  - Not flagged No rate for labour or equipment.
  - Material components can still be added by hand and count.
- **"Price by hand":** the line stays flagged No rate until priced.

**Starter defaults:**
- **Included in Pipe crew:** trench excavation, bedding/pipe zone and backfill.
- **Price by hand:** dewatering, stabilize mix (and its undercut variant).
- **Where they apply:** to a workspace only where the role has no mapping of its own.
- **The HV copy:** set by hand in Equipment settings during the smoke test, a throwaway workspace.

**Files:**
- api `app/features/equipment/{models,production,routes,schemas}.py` (`set_line_map`, `adopt_starter`)
- app `features/equipment-library/EarthworkProduction.tsx` (the picker: an activity, "Included in…", or "Price by
  hand")
- app `features/estimate/EstimatingView.tsx` (the No rate rule and the note)
- app `features/takeoff/components/ItemRow.tsx`

**Migration:** d777, adds `eq_activity_line_map.none_reason` (`included` | `by_hand`, null) and
`included_in_activity_id` (bigint, null).

**Fixtures:** c15 (Needs attention counts), c17, c32, c36; a quantity-table row for the No rate rule.

## 2. Ask before removing pricing (D-778)
**The prompt:** deleting an activity, or setting a mapping to none, first shows "Deleting <activity> removes pricing
from N lines ($X). Delete?", with the lines listed (project, line).

**Where the figures come from:**
- **The lines:** a new api read gives them.
- **The dollars:** computed in the browser from the open project's estimate. See question A.

**Files:**
- api `app/features/equipment/{production,routes}.py` (`GET …/activity/{uuid}/impact`, `GET …/line-map/{role}/impact`)
- app `features/equipment-library/EarthworkProduction.tsx` (the dialog)

**Migration:** none. **Fixtures:** none delete an activity or clear a mapping today (grep); c36 is rerun since it
sets mappings.

---

## Questions before building
- **A. The $X in "removes pricing from N lines ($X)":**
  - **The problem:** money is computed in the browser per project, so the api can't total it across projects.
  - **My recommendation:** N lines across every project, and $X for the open project only, worded "N lines (this
    project $X)".
  - **The alternative:** $X across all projects, which means opening each project's estimate in the browser first.
- **B. "Qty × unit rate equals the amount shown"** holds exactly for typed rates. For a line priced by components,
  the shown unit rate is amount ÷ qty (e.g. 10,000 BCY at $0.7094 = $7,094.00 against an amount of $7,093.66).
  - **My recommendation:** show a derived unit rate with as many decimals as Qty × rate needs to equal the amount
    (up to 6).
  - **The alternative:** compute such lines' amounts from the rate rounded to 4 places. That changes money.
- **C. The rock excavation label:** the tier records only "paces" or not, not a role.
  - **My recommendation:** "not pacing" now.
  - **Later:** an optional role on a tier machine ("loading", "breaking"), set in the tier editor, would read
    better.
- **D. The Sheet view:** a parent split over two sheets rounds once per sheet row. Its Sheet view TOTAL can then
  differ from the Classification TOTAL by a cent.
  - **My recommendation:** accept it. The bid total stays the line view's.
  - **The alternative:** derive sheet rows from the line's rounded amount, at the cost of Qty × rate on those rows.
- **E. Cost components lists:** to tie a list to its report exactly, each component's share of a line is rounded
  once.
  - **My recommendation:** a line's type is then the sum of its rounded components, and each component is its own
    Qty × rate rounded once.
  - **Do you agree?**

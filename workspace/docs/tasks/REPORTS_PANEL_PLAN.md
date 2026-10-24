# Estimating reports and side panel: review and plan

2026-10-24. Review and plan only: no code changed, no data changed. Builds nothing until the founder answers
the questions at the end.

The report controls built in A5 (D-762: By line / Summary per report, a "Then by" level) were audited on the
HV copy (read only) and on "zz Equip 10000 BCY", both owned by the throwaway `fx.equip.202610230651@`.

## 1. Audit

### Method

Each scenario was opened in the browser, then read from the screen and exported to Excel:
- every report (Full estimate, Labor, Material, Equipment, Subcontract, Quantities only)
- in each mode (By line, Summary; Quantities only has no Summary)
- with nine groupings: the five Group by choices with Then by = None, plus four pairs:
  - Classification › Sheet
  - Classification › Subcontractor
  - Subcontractor › Scope
  - Custom Folder › Classification

That is 99 scenarios per project, 198 in all. For each one, the run read:
- the sidebar figure, and the Summary footer's own sum against the report total
- every heading and row in the export

Every view used "All layers in one tab", so one export holds the whole estimate.

The audit changed no data:
- no item, shape or cost component in either project was updated in the window
- the audit log has no entry for either workspace
- the saved views and the export counter were put back afterwards

An item measured on two sheets exists in neither project, nor in any throwaway project. It was therefore
**simulated in the browser only**, by rewriting two read responses: the item list and the per-sheet
quantities. Nothing was stored.

### Results

| | HV copy | zz Equip 10000 BCY |
|---|---|---|
| Report totals | Full $994,208.69 · Labor $278,501.32 · Material $183,285.35 · Equipment $487,069.36 · Subcontract $45,352.67 · 93 lines | Full $117,527.08 · Labor $30,720.00 · Equipment $86,807.08 · Material and Subcontract none · 13 lines |
| TOTAL ties to the sidebar figure | Yes, in every report, mode and grouping (90 scenarios with money) | Yes in the 54 with money; the 36 Material and Subcontract scenarios are empty |
| Summary rows add up to the report total | Yes, everywhere | Yes, everywhere |
| Same crew / material / machine under more than one heading (Summary) | Labor: 9 of 16 crews, up to ×13 · Equipment: 20 machines, ×13 · Material: 3–4, up to ×5 · Full estimate: each cost type ×32 | Full estimate: Labor ×3, Equipment ×4 under Classification; none in Labor or Equipment (one crew, one fleet) |
| Same item in more than one row (By line) | None (no item sits on two sheets) | None |

The index workbook gives the per-scenario figures, the headings, and what each sheet shows.

### How an item measured on two sheets is handled (simulated)

The plain item is "LF 28": 15 LF, $492.19, split 60/40 over P101 and C-100. The parent is "Exterior Wall":
521.31 LF, $9,063.59, three sub-items, split 50/50 over A101 and C-100.

| Grouping | Plain item | Parent with sub-items |
|---|---|---|
| Group by Sheet | **Split:** a row on each sheet with that sheet's quantity and share. P101 reads 9 LF, $295.31; C-100 reads 6 LF, $196.88. They add up to $492.19. | **Duplicated:** the parent row appears under both sheets, each time at the full 521.31 LF and $9,063.59. The sub-items, which carry the money, appear only under its first sheet (A101, D-88 Q9). C-100 shows a parent with no sub-items, and its money is not in C-100's total. TOTAL is still right. |
| Then by Sheet (any Group by) | Assigned once, to a heading named after the item's sheet list | **Assigned once,** under one combined heading "A101, C-100", at the full quantity, not split |
| Summary under Group by Sheet | Each sheet's summary carries its share; ties to $278,501.32 | Sub-items' crews only under the first sheet |

### How the filters combine

- **Subcontractor filter:** it removes lines before grouping and before Summary.
  - With Subcontractor = Sitework, the Labor table and its Summary read $231,591.54.
  - The sidebar still reads $278,501.32, by design: it holds project totals (D-126).
  - Nothing on the table says it is filtered.
  - Group by Subcontractor with the filter on leaves a single heading.
  - Subcontract › Subcontractor › Scope filtered to "Unassigned" is empty, and reads "No rows match this view."
- **User filter:** it keeps lines by creator.
  - On the HV copy it lists one person ("Equip N."), so it has no effect there.
  - It is still shown.
- **Export:** "Visible rows" exports with the filters. "All rows" silently drops the filters and the search.
  - The workbook's banner names the report ("FILTERED — LABOR ONLY") but not the subcontractor or user filter.

### Discrepancies, contradictions and confusing combinations

| # | What | Where it shows | Kind |
|---|---|---|---|
| R1 | **Summary adds up only within the lowest heading, never across the project:** the same crew, material or machine repeats under every heading. | Labor, Classification: "Crew (0.5 Foreman, 0.5 Grade checker, 4 Operators)" under 13 headings. Equipment: each "Place and compact" machine ×13. | Design |
| R2 | **Full estimate's Summary** lists Labor / Material / Equipment / Subcontract under each of 32 headings. It adds almost nothing to By line. | Full estimate, Summary, every grouping | Design |
| R3 | **"Then by" offers every Group by choice but the current one,** so it allows pairs that contradict or add nothing:<br>• Classification › Sheet: 84 headings for 97 lines; every earthwork feature gets a "C-200" heading of its own.<br>• Sheet › Classification: the Sheet pivot already has its own Grading and feature groups.<br>• Scope › Subcontractor and Subcontractor › Scope: the same two keys in either order. | All pairs | Design |
| R4 | **Bug: under any "Then by", each earthwork heading repeats inside its own sub-group.** Example: "Stripping (196,697 SF) › Excavation & Backfill › Stripping (196,697 SF)". | HV: 24 headings under Classification › Subcontractor, 25 under Subcontractor › Scope, 24 under Custom Folder › Classification | Bug |
| R5 | **The two Sheet groupings contradict each other.** Group by Sheet splits a two-sheet item by sheet; Then by Sheet files it whole under a combined heading "A101, C-100". | Simulation | Contradiction |
| R6 | **Group by Sheet duplicates a two-sheet parent** at full quantity and cost on each sheet, with its sub-items only under the first sheet. | Simulation; follows D-88 Q9 | Confusing; needs a decision to change |
| R7 | **"Unassigned › Unassigned"** means no subcontractor, then no scope: one word for two meanings. | 10000 BCY, Subcontractor › Scope | Confusing |
| R8 | **A filtered table has no marker:** the table total moves, the sidebar does not, nothing says "filtered", and the export banner leaves the filter out. | Subcontractor = Sitework, every report | Confusing |
| R9 | **Summary + Group by Sheet drops a shared machine's unspread cost.** The Unallocated group exists only in By line, and the Summary export leaves out the Unallocated rows. Its total would fall short of the Equipment and Full totals. | Code: neither project has unspread cost today, so it was not seen | Bug (latent) |
| R10 | **The Equipment summary keys a machine by class and mode but labels it with one line's component name,** which carries an activity ("Place and compact: Crawler dozer D5 class"). Once summed across the project, D5s from two activities would read under one activity's name. | HV, Equipment Summary | Bug (latent) |
| R11 | **Expand components shows greyed out, without a reason,** in every filtered report (they always show their rows) and in Summary. | Labor, Material, Equipment, Subcontract; Summary | Confusing |
| R12 | **Show levels counts the Group by and Then by levels together** (up to 6). The numbers don't say what each level is; with all layers, level 1 is the layer. | Any Then by | Confusing |
| R13 | **Layer tabs are hidden in the Group by menu;** the export has its own Layers choice, which its description says "always follows the tab". | Group by menu, Export dialog | Contradiction |
| R14 | **Each filtered export repeats its money:** "Total Labor Cost" and "Labor cost" are the same figures, and the capitals differ between reports ("Equipment cost", "Labor Cost"). | Every filtered report's export | Cosmetic |
| R15 | **An empty report reads "No rows match this view."**, as if a filter hid something. | 10000 BCY, Material and Subcontract | Confusing |
| R16 | **Three counters for overlapping things:** Needs attention (7), Not in the last Calculate (0) and the Incomplete banner. Two row flags count in none of them: "Mob/demob counted N times" and a shared machine used outside its divisions. | HV sidebar | Design |
| R17 | **The panel does not fit:** its controls need 812 px of height and get 480 at 1295 × 880. The bid summary is pinned at the foot, so Filter, Table and Setup sit below the fold. | HV, standard window | Design |
| R18 | **Group by has no choice that sums cost components across the project.** | Group by menu | Missing |

## 2. Exports

Written to `intelcost-infra/morning-report-2026-10-24/reports-review/` (24 workbooks and the index):
- **11 per project,** one per report and mode, named `<project> - <report> - <mode>.xlsx`. Each holds nine sheets,
  one per grouping, named by the grouping (e.g. "Classification › Sheet").
- **`HV copy - two-sheet item simulation.xlsx`:** five sheets, each marked as simulated in the index.
- **`index.xlsx`:** a row for every file and sheet, giving:
  - the project, report, mode, Group by and Then by
  - the counts of headings and rows
  - TOTAL, the sidebar figure, the Summary's own sum, and whether they tie
  - what repeats, and what the sheet shows

Each sheet is the app's own export of that scenario: values, not formulas; all layers; visible rows and columns.
Copying them into one book kept the values, outline levels and column widths, but not the colours, so the
headings and the TOTAL row are styled again.

## 3. Report design

### a. Today's controls, fixed

**What the user sees:** the same three controls (mode switch, Group by, Then by), with these changes:
- Then by offers only sensible pairs:
  - under Classification or Custom Folder: Sheet, Subcontractor
  - under Subcontractor: Scope
  - under Scope: Subcontractor
  - under Sheet: none
- Summary adds up across the whole project unless a level is chosen to work "within".

**What it removes:** R1, R3, R4, and R5 once Then by Sheet splits by share.

**What stays:**
- three controls that interact
- a Summary that is a second meaning of the same Group by
- Show levels counting two kinds of level
- R2 and R11–R13

**Cost:** about 1½ days.

### b. Simpler: Group by gets "Cost component"; no Then by, no mode switch

**What the user sees:** one Group by list.
- **Line groupings:** Classification, Custom Folder, Scope, Subcontractor, Sheet.
- **"Cost component":** components summed across the whole project.
  - Labor: crew, then craft
  - Material: item name + unit, then Usage, with To order
  - Equipment: machine
  - Subcontract: subcontractor
- **"Within":** an optional choice under "Cost component": Whole project / Division / Subcontractor.
- **Classification:** keeps its own levels through Show levels.

**What it removes:**
- R1, R3–R5, R11 (no mode switch), R12 (one kind of level per grouping) and R18
- R2, once Full estimate's choice is defined

**Cost:** about 2 days. It also leaves "Cost component" undefined for Full estimate and Quantities only.

### c. Recommended: b, with the roll-up named by what it lists and Then by's work moved to filters

**What the user sees:** one **Group by** select in two sections.
- **Lines:** Classification, Custom Folder, Scope, Subcontractor, Sheet.
- **Totals:** one entry, named for the report:

  | Report | Totals entry | What it lists, project-wide |
  |---|---|---|
  | Labor | Crews | crew, then craft; man-hours, average wage, cost |
  | Material | Materials | item name + unit, then Usage; quantity, To order, cost |
  | Equipment | Machines | one row per machine (library class and mode, a typed machine, a shared machine once): machines, hours, days, rental, fuel, mob, cost |
  | Subcontract | Subcontractors | subcontractor, then scope |
  | Full estimate | Cost types | Labor, Material, Equipment, Subcontract, each opening to its report's Totals (crews, materials, machines, subcontractors): the whole estimate's resources on one page |
  | Quantities only | Items | item name + unit, quantities summed (the same item measured in many places, as one row) |

- **Within** appears only under Totals: Whole project (default) / Division / Subcontractor / Sheet. Sheet splits by
  each sheet's share, the same way Group by Sheet does.
- **Show levels** appears only when the grouping has levels:
  - Classification and Custom Folder: as deep as their tree
  - Totals: 1 = crew, 2 = crew and craft
- **Then by** goes. Each pair it served becomes a Group by plus a filter (see 4):
  - "Classification › Sheet" becomes Classification with Sheet = C-200.
  - "Subcontractor › Scope" becomes Subcontractor with Scope as a filter.
  - Every line's own sheet and scope already show in its Takeoff Ref. and Scope columns.

**Why c over b:**
- **Labels:** the roll-up reads in the estimator's words for each report, never "Cost component".
- **Full estimate and Quantities only:** both get a useful Totals view.
- **Two-sheet items:** Within Sheet uses the share, so they are never treated two ways.

**What it removes:**
- R1–R5: no Then by, no per-heading summary, one Sheet rule
- R7: no Unassigned › Unassigned
- R11 and R12, and R18

**What it keeps:**
- **By line:** every line view there is today, with the four test pairs answered by a grouping and a filter.
- **Summary:** every summary there is today, now summed project-wide or within a chosen level.
- **Saved views:**
  - "Summary" maps to Totals
  - a Then by maps to the matching filter where one exists, and is otherwise dropped

**Cost:** about 2½ days, including the filters in 4. It needs the fixes listed under "Fixes that hold under any
option" below.

**Recommendation: c.** a keeps the three interacting controls the founder found confusing. b leaves Full
estimate and Quantities only without a Totals meaning and keeps a word estimators don't use.

### Fixes that hold under any option

R9, R10, R14 and R15:
- **R9:** Unallocated in Summary and its export.
- **R10:** a machine labelled by its class, not by one line's component name.
- **R14:** one money column per filtered export, with consistent capitals.
- **R15:** an empty report says "No material cost in this estimate".

About 2 hours.

R4 goes with Then by under c. Under a, it needs its own fix: `thenGroup` must stop running the earthwork step
again.

## 4. Side panel

### Proposed

From top to bottom:
1. **REPORTS:** the six reports with their totals. The By line / Summary switch goes.
2. **GROUP BY:** the one select from 3c.
   - Within, under it, only for Totals.
   - Show levels only when the grouping has levels.
3. **FILTER:** one "+ Add filter" row.
   - Its menu: Subcontractor, User (only when more than one person made lines), Sheet, Division, Scope, Layer.
   - Each active filter shows as a removable chip: "Subcontractor: Sitework ×".
   - While any filter is on, the table's toolbar reads "Filtered · Clear".
   - The export banner names the filters.
4. **"Needs attention (n)":** one status line. It opens a list in categories, each with its count. Picking a
   category shows only those lines. The categories:
   - Missing data
   - Not in the last Calculate, with its Delete these and Undo
   - Needs recalculating
   - Library rates changed
   - Production warnings (outside the DOT band and the spread's other warnings)
   - No rate
   - No quantity
   - Subcontract cost with no subcontractor
   - On a sheet with no scale
   - Parent components not counted
   - Mob/demob counted more than once
   - Shared machine used outside its divisions
5. **BID SUMMARY:** at the foot, as today. "Incomplete: 2 lines have missing data · Review" is its first line, and
   Review opens the Missing data category.

**On the table's own toolbar,** beside Search and Export:
- icons for Columns, Format and Expand/Collapse components
- Expand/Collapse is hidden where it does nothing (filtered reports, Totals)
- a **Setup** button with a menu: Shared equipment, Manage subcontractors…, Equipment settings…
  - hidden for a view-only seat, as the section is today

**Layer tabs** move to the tab strip, as an "All layers" toggle at its end.

**Height:** about 420 px, against the 480 available at 1295 × 880, so it no longer scrolls.

### Each control: where it goes; nothing is lost

| Control today | Goes to | Kept |
|---|---|---|
| Reports (6, with totals) | Top of the panel, unchanged | All |
| By line / Summary | Group by: Lines or Totals | Both views |
| Group by | Group by, Lines section | All five choices |
| Group by › Layer tabs | "All layers" toggle on the tab strip | Both modes |
| Then by | Group by plus a filter; Within for Totals | Every useful pair (the four tested ones included) |
| Expand / Collapse components | Table toolbar icon | Same action; hidden where it is inert |
| Show levels | Under Group by, only with levels | Same buttons |
| Needs attention (toggle, count) | Needs attention line, "All" category | Same filter and count |
| Not in the last Calculate (toggle, count, Delete, Undo) | Needs attention category | Same filter, count, Delete and Undo |
| Incomplete banner | First line of Bid summary, linking to Missing data | Same text |
| Filter: Subcontractor | "+ Add filter" chip | Same filter |
| Filter: User | "+ Add filter" chip (offered when there is more than one person) | Same filter |
| Table: Columns, Format | Table toolbar icons | Same popovers |
| Setup: Shared equipment, Manage subcontractors, Equipment settings | Setup menu on the table toolbar | Same dialogs, same view-only rule |
| Bid summary | Foot, unchanged | All |
| Collapsed strip (Columns, Format) | Strip keeps Show the sidebar; Columns and Format are on the toolbar already | Both |

**Added:** the Sheet, Division, Scope and Layer filters, a "Filtered" marker, and filter names in the export
banner. All four filters read fields every line already has.

**Cost:** about 1 day.

## 5. Blocks and time

| Block | What | Time |
|---|---|---|
| F0 | The fixes that hold under any option: R9, R10, R14, R15 | 2 h |
| F1 | Report design c: Group by Lines / Totals, Within, the six Totals, Show levels rules, the export, saved views mapped, cost-cases `summary-ties` rows for Within | 1½ days |
| F2 | Side panel: filters and chips with the Filtered marker and banner, Needs attention categories, the toolbar icons and Setup menu, the layer toggle | 1 day |
| F3 | Only if the founder changes D-88 Q9: a two-sheet parent shown once per sheet at that sheet's share, its sub-items scaled with it | 3 h |

**Total:** about 3 days (F3 adds 3 h).

**Checks after each block:** the gates, the quantity table, and one smoke on a throwaway. The smoke must show the
same sidebar totals as section 1 and Summary totals that tie to them.

## Questions for the founder

1. **Option:** a, b or c (recommended: c).
2. **Within:** Whole project / Division / Subcontractor / Sheet. Keep Sheet, or only the three named?
3. **Full estimate Totals:** cost types, each opening to its report's Totals (recommended). Or cost type, then
   item, as today?
4. **Quantities only Totals:** item name + unit, summed? Or no Totals for that report?
5. **A parent on two sheets** (R6, D-88 Q9): keep "sub-items under the first sheet", or show the parent once per
   sheet at that sheet's share (F3)?
6. **The sidebar's figures under a filter:** keep them as project totals, with the new Filtered marker on the table
   (recommended)? Or make them follow the filters?

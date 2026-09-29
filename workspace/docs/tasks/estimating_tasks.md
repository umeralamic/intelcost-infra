# F9: Estimating tab and export

> **Adopted overnight 2026-09-28 (D-88), from the draft of 2026-09-27.** The ten questions at
> the end are answered in legacy's favour, decided overnight and pending the founder's
> review (D-88). Written from legacy's source (`ProjectEstimatingView.tsx`, **PEV** below;
> `src/lib/estimate/`) and, since the draft, from **live legacy** (the `UmeralamDEV` branch,
> 161 commits past the local checkout; see "Live legacy since the draft").

## The problem

Takeoff ends at quantities. An estimator needs to turn those into a price: man-hours,
wages, material, equipment and subcontract per line, wastage, the multipliers F6 stored
beside each quantity (D-57), totals per group and for the bid, and a workbook to send.
Legacy does all of that in one screen, the **Estimating** tab, computed in the browser
from takeoff rows. The new app has the estimate line model (D-09, D-50) and nothing on
screen.

**Problem → solution.** The Estimating tab is missing, so no bid leaves the product. →
Legacy's Estimating tab, its columns, grouping, cost entry, wastage, multipliers,
subcontractor packages, comments, custom columns and Excel export, on the api's line
model, with the cost arithmetic in takeoff-core so the screen, the api and the export
agree to the cent.

## What legacy does

### The screen (PEV:4351-4592)

- Title "Estimating", subtitle "Synced live from Takeoff."; a search ("Search…") over
  item no, sheet ref, detail ref, classification, scope, assembly, description and unit.
- **Group by:** "Classification" | "Custom Folder" | "Scope" | "Sub-scope" | "Level 4" |
  "Subcontractor" | "Sheet"; **Layer tabs:** "Main layer per tab" | "All layers in one
  tab". One tab per main layer that has items; a null layer reads as the base layer,
  "Base Bid".
- Filters: subcontractor ("All subcontractors"), user ("All users", by who made the
  item). Buttons "Format", "Columns", "Export"; "Manage subcontractors…" when grouping by
  subcontractor.
- Empty: "No takeoff measurements yet." (Sheet) / "No line items yet."; a spinner on the
  first load; no error state (a failed read shows empty, a legacy fault).

### Columns (PEV:204-234, in order)

Item No. · Layer · Takeoff Ref. · Details Ref. · Classification · SCOPE · Sub-scope ·
Level 4 · Assembly · Qty · Unit · Color · Wastage · Qty with Wastage · Multiplier ·
Total Qty · Unit Man Hours · Total Man Hours · Per Hour Wage · Total Labor Cost · Unit
Equipment · Total Equipment · Unit Material Cost · Total Material Cost · Subcontract ·
Item Cost · Created by · Modified by · Comments, then custom columns.

Hidden by default: Comments, Details Ref., Classification, SCOPE, Sub-scope, Level 4,
Created by, Modified by. Multiplier and Total Qty show only when some line's multiplier
is above 1. Visibility, width (drag, double-click to fit) and order (drag) per project
in the browser; header right-click "Freeze Header" / "Unfreeze Header".

### Rows

- One per takeoff item, parents and sub-items alike, **excluding** rough measurements,
  boundaries, contours, spot elevations, earthwork markups, and depth-bearing SF items
  on a contour sheet (they would double-count against cut and fill).
- Ordered folder position → item position → created. Item No. runs 1..N.
- Qty is the item's effective quantity, unit the item's. A parent with sub-items shows no
  Qty or Unit and no rates: it rolls up its sub-items' costs, and is left out of group and
  grand totals so nothing counts twice.
- Classification, Scope, Sub-scope, Level 4 from the item's classification (F6-S14),
  else the folder chain's.
- Manual lines: "Insert row above/below" makes a zero-geometry count item with a
  quantity override "Manual line" (legacy's workaround).

### The arithmetic (`lib/estimate/costing.ts:120-164`)

```
wastage %      = line override ?? project default for the unit ?? 0
qty w/ wastage = qty × (1 + wastage/100)
total qty      = qty w/ wastage × multiplier          (layer chain × folder chain, D-57)
total MH       = total qty × unit MH
labour         = total MH × wage
equipment      = unit equipment × total qty, or the lump (exclusive; typing one clears the other)
material       = total qty × unit material
subcontract    = the lump typed
item cost      = labour + equipment + material + subcontract
```

No rounding in the arithmetic; display rounds (2 decimals, USD, 0 shows "—"). No unit
conversion anywhere. **No markups**: no overhead, profit, contingency, bond, tax or
insurance (the retired `BidWaterfall.tsx` had them; the live tab does not).

### Editing

- Editable cells: Unit Man Hours, Per Hour Wage, Unit Equipment, Total Equipment (lump),
  Unit Material Cost, Subcontract. Commit on blur or Enter; "$", "," and "%" stripped.
- **Wastage** by dialog: "Set a wastage percentage for each unit type, then choose where
  it applies." Apply to "All line items" (the project's per-unit default) | "This line
  item only" | "Classification — {d}" | "Scope — {s}" (per-line overrides). "A line
  item's own percentage always wins over the unit default."
- **Multiplier** popover "How this multiplier is built": one editable row per layer and
  folder step, "a × b = n".
- **Costs…** from a takeoff item's menu (items with a quantity and no sub-items), and a
  **costs view** inside Manage sub-items: the same rates, "Rates are shared with the
  Estimating tab and save as you leave each field."
- **Unit change on a sub-item** clears its unit rates and marks them for review (they
  blink amber): "Unit rates cleared".
- Row menu: "Insert row above" / "Insert row below", "Add Sub-item", "Add comment…"
  (appends "{text} — {name}, {date}"), "Go To Page {sheet}".
- Double-click a sub-item's Assembly, Qty or Unit: "Edit sub-item" (name, formula, unit).
- Custom columns: "Add custom column…", rename, "Remove the column "X"? Everything typed
  into it on this project is deleted."; free-text cells.
- Every edit goes on the page's undo history.

### Subcontractor packages

Grouping by Subcontractor resolves each line's node up the tree: the project's override
first, then the workspace default (F6-S15); nothing found is "Unassigned". The
"Subcontractors" dialog edits "This project" or "Workspace defaults" (admins only),
"Reset to workspace default" per node. The Subcontract $ column is typed, not tied to the
package; no quotes, no bid levelling.

### Format and export

- **Format** themes: Default (read-only), Workspace (owners, admins), My formatting,
  teammates' published themes; row heights, fills, fonts, zebra, grid lines, decimals.
- **Export** to Excel only ("Export to Excel"): visible or all columns and rows, layers
  per tab or one, with or without formulas, grid lines, grouping. Live formulas
  (`=Qty*(1+Wastage)`, `=QW*Mult`, …, parent rows `SUM()`), sub-item quantities as Excel
  expressions of their formulas; "<Project> - Estimate V<n> - YYYY-MM-DD.xlsx".

### Permissions and realtime

Legacy checks none of its pricing capabilities in the tab; its row-level rules let the
takeoff and QA seats write rates while their role text says they cannot. Realtime covers
takeoff item and folder updates and cost rows, not layers, wastage, custom columns or
subcontractors; item inserts and deletes arrive when the tab is reopened.

## What exists today

| Piece | State |
|---|---|
| `estimate_line_item` (D-09, D-50) | One row per measured item (partial unique), or a manual line (`takeoff_item_id` null); `unit_rate`, `waste_factor` (a fraction), `manual_quantity`, `classification_ref_id` (still text), `position`; quantity read through, never copied; no extended cost stored |
| `app/features/estimate/` | Routes for lines (list, create, update) from before F6 |
| F6 | Items, sub-items, classification (FK, D-36 Q2), subcontractor defaults, multipliers beside the quantity (D-57, `service.multipliers`) |
| Screen | None |

## Design

### Where the arithmetic lives (hard rule 2)

`src/lib/estimate/costing.ts`, data in and out, no React, no network: the formulas above,
the roll-up, the group totals. Its Python twin, `app/features/estimate/costing.py`,
computes the same numbers for the export and for any total the api reports, proved equal
by one shared table the way F6-S4 proved the formula engines. Money in `Decimal` on the
api, and in integer cents or a decimal library in the browser (Q3).

### Data model

- `estimate_line_item` gains legacy's cost columns: `unit_man_hours`, `hourly_wage`,
  `unit_material_cost`, `unit_equipment_cost`, `equipment_cost` (lump), `subcontract_cost`,
  `wastage_pct_override`, `notes`, `comment_text`, `rate_review`; `unit_rate` retires
  (D-09's single rate is legacy's material rate, Q4). A line is made the first time a
  measured item is priced, and read through otherwise.
- `estimate_unit_wastage (project, unit, pct)`, unique per project and unit.
- `estimate_custom_column (project, name, position)`, `estimate_custom_value (column,
  line, value)`.
- `project_subcontractor_scope_override (project, classification, subcontractor null =
  unassigned here)`, unique per project and node.
- `estimate_format_theme (workspace, owner null = the workspace's, name, format, published)`.
- Manual lines stay first-class (`takeoff_item_id` null, D-09), not legacy's fake count
  items (Q5).

### Realtime (D-13)

`estimate.line.changed` (cost, comment, custom value), `estimate.settings.changed`
(wastage defaults, custom columns, project subcontractor overrides), on the project topic;
takeoff's item, geometry, folder and layer events already reach the tab. Beyond legacy:
every one of them is live, inserts and deletes included.

### Permissions (D-21, D-26)

| Act | Capability |
|---|---|
| Open the tab, group, filter, search, format for oneself, export | membership (`canExportProposals` for export, Q6) |
| Rates, wastage, subcontract, manual lines, custom columns | `canEditEstimates` (the pricing and estimator seats), refused 403 by the api |
| Comments | any seat that can comment (`canComment`) |
| Multipliers from the popover | `canEditTakeoff` (it writes F6's folders and layers) |
| Workspace format theme, workspace subcontractor defaults | `canManageWorkspace` / `canManageTrades` |

## Subtasks

# Block A: The grid

### F9-S1: Rows from takeoff
**Acceptance criteria.** 1. Every measured item and sub-item is a row; rough
measurements, earthwork markups and the double-counting SF items are not. 2. A parent
with sub-items shows no Qty and no rates. 3. Classification, Scope, Sub-scope and Level 4
read from F6's classification. 4. A second window's new item appears without a reload.

### F9-S2: Columns, grouping, layer tabs, search and filters
**Acceptance criteria.** Legacy's columns in legacy's order and defaults; the seven
groupings; "Main layer per tab" and "All layers in one tab"; Multiplier and Total Qty
only when a multiplier is above 1; search and the two filters; the column choices
remembered per project.

# Block B: Pricing

### F9-S3: The arithmetic, twice and equal
The shared table through `costing.ts` and `costing.py`, every column, to the cent.

### F9-S4: Rates in the grid, the Costs… dialog and the sub-items costs view
**Acceptance criteria.** Typing a rate saves on blur, shows at once in a second window,
and totals follow; unit and lump equipment exclude each other; a parent rolls up; a
sub-item's unit change clears and marks its rates.

### F9-S5: Wastage
The dialog's four targets; a line's own percentage wins over the unit default.

### F9-S6: Multipliers from the grid
The popover, editing F6's folder and layer multipliers.

# Block C: Lines and columns

### F9-S7: Manual lines, sub-items and comments from the row menu
### F9-S8: Custom columns

# Block D: Packages

### F9-S9: Subcontractor packages per project
The project overrides over F6's defaults, "Reset to workspace default", grouping and the
filter by resolved package.

# Block E: Format and export

### F9-S10: Format themes
### F9-S11: Excel export with live formulas
**Acceptance criteria.** The dialog's six choices; one sheet per main layer; the
workbook's cells recompute in Excel to the grid's figures; the file name.

# Block F: Collaboration

### F9-S12: The two-window live check
A prices while B edits the quantity; both end on the same item cost. In One at a time,
the item's hold covers its line's rates.

## Not in F9

| Legacy behaviour | Owner |
|---|---|
| Link assembly, Save as assembly, assembly rates | F10 |
| Evidence snippets (Details Ref.) | F11 |
| Item history (Modified by's dialog) | F11 (D-36 Q5) |
| Earthwork cut and fill lines | F12 |
| Markups, bid total, proposal | Q1, Q2 |

## Questions for the founder

1. **Markups and a bid total.** Legacy's live tab stops at the summed Item Cost; its
   retired `BidWaterfall` compounded sales tax (materials), contingency, overhead and
   profit on the running subtotal, then a permit allowance, bond and insurance.
   Recommendation: **legacy's**, no markups in F9; a bid summary is its own feature.
2. **Proposal, PDF, CSV.** Legacy exports Excel only. Recommendation: **Excel only in F9**;
   a proposal is a later feature.
3. **Money in the browser.** Recommendation: a decimal type in `costing.ts` (integer cents
   drift on unit rates with four decimals), so the twin engines agree to the cent.
4. **`unit_rate` on the line (D-09).** Legacy has no single rate: it has material,
   equipment, labour and subcontract. Recommendation: **retire `unit_rate`** for legacy's
   columns (only bench data has one).
5. **Manual lines.** Legacy fakes them as zero-geometry count items with an override.
   Recommendation: **keep D-09's first-class manual line**; "Insert row" makes one, in the
   anchor's group.
6. **Who may price.** Legacy's row rules let takeoff and QA seats write rates, against its
   own role text. Recommendation: **`canEditEstimates`**, as the role text says, enforced
   by the api; export on `canExportProposals`.
7. **Where presentation state lives.** Legacy keeps column choices, group-by, layer tab,
   export options, the theme choice and the "V<n>" export counter in the browser.
   Recommendation: column and view choices per browser (a view, as layer eyes, D-36 Q7);
   **the export counter on the project**, so V3 is V3 on every machine.
8. **Same-name merge.** Legacy merges sibling groups with the same name even when they are
   different nodes. Recommendation: **group by node, not by name.**
9. **The Sheet pivot's prorating.** Legacy prorates lump equipment and subcontract by a
   sheet's share but shows parents' whole roll-up on every sheet, and sub-items only on
   the parent's first sheet. Recommendation: prorate every column by the sheet's share of
   the parent's quantity, and show sub-items on each sheet the parent is on.
10. **Currency and locale.** Legacy is USD, en-US. Recommendation: USD in F9, the currency
    a workspace setting later.

## Answers (D-88, decided overnight, pending founder review)

Every answer is legacy's behaviour, as the overnight instructions ask; the draft's
recommendation is noted where it differed.

1. **Markups and a bid total:** none in F9; the tab stops at the summed Item Cost.
2. **Proposal, PDF, CSV:** Excel only.
3. **Money in the browser:** legacy's plain numbers (IEEE doubles), unrounded in the
   arithmetic, rounded for display; the Python twin uses floats in the same order, so the
   two agree exactly. *(Draft: a decimal type.)*
4. **`unit_rate`:** retired for legacy's columns (material, equipment, labour,
   subcontract).
5. **Manual lines:** legacy's: "Insert row above/below" makes a takeoff item with no
   shape and a quantity override "Manual line", in the anchor's folder, so it also shows
   in the Takeoff panel. *(Draft: D-09's first-class manual line.)*
6. **Who may price:** legacy's reach: every seat that can edit takeoff or estimates
   (`canEditTakeoff` or `canEditEstimates`), refused 403 otherwise; export for every
   member. *(Draft: `canEditEstimates` only; export on `canExportProposals`.)*
7. **Presentation state:** in the browser, per project, as legacy: column choices and
   widths, group-by, layer mode, the cost filter, export options, the theme choice and
   the "V<n>" export counter. *(Draft: the counter on the project.)*
8. **Same-name groups:** legacy's: sibling groups with the same name merge.
   *(Draft: by node.)*
9. **The Sheet pivot:** legacy's: lump equipment and subcontract prorated by the sheet's
   share, parents' roll-up whole on every sheet, sub-items on the parent's first sheet.
10. **Currency and locale:** USD, en-US.

## Live legacy since the draft (compared 2026-09-28)

Driven in the Bench comparison project at 1440 × 900, and read from `UmeralamDEV`:

- The tab sits in the takeoff screen's tab strip (Takeoff · Earthwork · Collaborator ·
  **Estimating** · Community), `?tab=estimating`, under the takeoff header.
- Toolbar: "Search…", "Group by" (a select with two sections, "Group rows by" and "Layer
  tabs"), **"Shared equipment"**, "All subcontractors", "All users", a **cost filter**
  "All | Labor | Material | Equipment | Subcontract" (`costFilter.ts`: other types' columns
  hide, Item Cost becomes "{Type} cost", a banner "FILTERED — {TYPE} ONLY — not a
  complete estimate", rows without that type drop out), **"Expand components"**, then
  Format, Columns, Export.
- The table: a dark header row in capitals; one light group row per group ("—" when the
  item has no classification, "No custom folder", "Unassigned", "Sheet {ref} – {name}")
  with its count "(7)" and "MH {h} · {cost}"; a dark TOTAL row.
- Columns menu (checked by default): Item No., Takeoff Ref., Assembly, Qty, Unit, Color,
  Wastage, Qty with Wastage, Unit Man Hours, Total Man Hours, Per Hour Wage, Total Labor
  Cost, Unit Equipment, Total Equipment, Unit Material Cost, Total Material Cost,
  Subcontract, Item Cost; unchecked: Details Ref., Classification, SCOPE, Sub-scope,
  Level 4, Created by, Modified by, Comments. Layer shows only with all layers in one tab.
- Row menu: Insert row above, Insert row below, Add Sub-item, **Add cost component**, Add
  comment…, Go To Page {sheet}. Header menu: Freeze Header, Unfreeze Header.
- **Cost components** (`components.ts`) and **shared equipment** (`sharedEquipment.ts`,
  `equipmentAllocation.ts`) are new since the draft: they belong to Block B.

## Progress

| Block | State | Check |
|---|---|---|
| **A: The grid** | Built 2026-09-28 (night). S1: rows from takeoff in `lib/estimate/lines.ts` (legacy's exclusions, order, Takeoff Ref., classification path, a parent with sub-items without Qty, a parent following its sub-items into another group). S2: `features/estimate/EstimatingView.tsx` in the takeoff screen's tab strip (`?tab=estimating`): legacy's columns, defaults and Columns menu, the seven groupings and both layer modes, layer tabs, search, the subcontractor, user and cost-type filters (banner, columns, rows), group rows with their count, TOTAL; the view kept per project in the browser (D-88 Q7). **Not yet:** the cost figures (Block B), Format, Export, Shared equipment, Expand components, the row menu (Blocks B to E), column widths by drag, Freeze Header | Smoke test through the Playwright MCP (D-70): 16 rows as the Takeoff panel; each grouping; the Labor banner; search; Columns; a classification set from outside regrouped live; Rebar under 03 took a bold Slab |
| **B: Pricing** | In progress 2026-09-28 (night). Built: D-89, the rates on the line and wastage per unit (api), legacy's `costing.ts` ported whole, rate cells, the Wastage dialog, the cost filter's projection, group chips and TOTAL, live between windows. S3's Python twin waits for a need (D-89). Then S6, legacy's multiplier popover, and S4's "Costs…" from a takeoff item's menu. Cost components built (D-91): legacy's four kinds, the dialog, Add cost component, read-only derived types, Expand components. **Not yet:** the costs view inside Manage sub-items, a sub-item's unit change clearing its rates, shared equipment | Smoke test through the Playwright MCP (D-70), two windows: $1,020.00, then $1,112.00 with LF 10 %, both windows |
| **C: Lines and columns** | Built 2026-09-28 (night). S7: the row menu (Insert row above and below as legacy's manual line, Add Sub-item, Add comment… with the Comments column, Go To Page). S8: custom columns (add, rename, remove, free-text cells). **Not yet:** Add cost component (with the components), Go to markup | Smoke test through the Playwright MCP (D-70): the inserted row next to Doors, a comment read back, Add Sub-item over the tab; a custom column added, typed into, renamed and removed |
| **D: Packages** | Built 2026-09-28 (night). S9: `project_subcontractor_override`; legacy's "Manage subcontractors…" (This project, Workspace defaults as F6's editor, Show the whole list, Reset to workspace default); resolution reads the project's row before the default at each level | Smoke test through the Playwright MCP (D-70): Masonry for the project, reset to Concrete |
| **E: Format and export** | In progress 2026-09-28 (night). S11 built (D-90): legacy's Export to Excel, its six choices, live formulas, SUM parents, TOTAL of the lines, outline grouping, file name and counter. S10 built (D-92): legacy's themes and a reduced panel, the grid and the workbook both following. **Not yet:** borders' weight and colour; sub-item formulas as Excel expressions; components in the workbook | Smoke test through the Playwright MCP (D-70): the file read back with its formulas |
| **F: Collaboration** | S12 driven 2026-09-28 (night): A on api priced Wall's material while B on api-b (Sara Wells) set its quantity to 50 LF; both windows ended on the same row, $1,475.00 (A in 0.5 s, B in 1.2 s). **Not driven:** One at a time's hold over a line's rates | Smoke test through the Playwright MCP (D-70), two windows across Redis |

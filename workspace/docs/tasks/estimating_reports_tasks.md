# F9c: Estimating sidebar, Reports and working tools

> **Picked up 2026-09-30** from the plan agreed in session ("yes to all"): blocks A and B. Beyond legacy throughout; decisions D-126 (block A) and D-127 (block B).
> Builds on F9 ([estimating_tasks.md](estimating_tasks.md)); F9b's bid summary (P-22) is
> block C and waits for its own spec.

## The problem

The Estimating tab's controls sit in one long row over the table: search, Group by, Shared
equipment, two filters, the cost filter (All, Labor, Material, Equipment, Subcontract),
Expand components, Format, Columns and Export. Most are set once per visit; they take the
width the table needs, and the cost filter reads as a filter when it is really a choice of
report. Pricing a large estimate is one cell at a time, and nothing points at the lines that
still need work.

**Problem → solution.** A crowded top row and a filter that is really a report. → A left
sidebar holding the view, the filters, the table settings and setup; Reports in place of the
cost filter, each with its total; the top keeps only the title, Search and Export. Then the
working tools: Needs attention, collapse to a level, and changing many rows at once.

## Block A: the sidebar and Reports (D-126)

### Layout

- **Top:** "Estimating", the active report's name and, off the full estimate, a tag
  ("Partial estimate", or "No prices" for Quantities only); the subtitle "Synced live from
  Takeoff."; Search; Export.
- **Left sidebar** (about 224 px, its own scroller), sections top to bottom:
  - **Reports:** Full estimate, Labor, Material, Equipment, Subcontract, Quantities only.
    Each money report shows its project total (all layers, no search or filters); Quantities
    only shows its line count.
  - **View:** Group by (the grouped menu, Layer tabs in it), Expand or Collapse components.
  - **Filter:** Subcontractor, User.
  - **Table:** Columns, Format (their existing popovers, opening beside the sidebar).
  - **Setup:** Shared equipment, Manage subcontractors (now always listed).
  - **Foot:** Direct cost (the full estimate's total). F9b's bid summary lands here.
- **Collapse:** the sidebar folds to a 40 px strip (expand, Columns, Format), remembered in
  this browser for every project.
- The table fills the main area (D-120's fill column still applies).
- The TOTAL row stays at the foot of the table's scroller while frozen (sticky).

### Reports

- The five cost reports are the old cost filter, unchanged in arithmetic, columns and
  export. `view.filter` keeps its values, so a saved view opens on the same report.
- **Quantities only** (new): every line, no money. The cost columns (man-hours, wage, every
  cost and Item Cost) are hidden; Qty, Unit, Wastage, Qty with Wastage, Multiplier and Total
  Qty stay. No component or shared rows, no Unallocated lines, no MH and cost on group
  headers, TOTAL shows its label only. The export's banner is "QUANTITIES ONLY — no prices"
  and its file name carries "Quantities".
- The in-table "FILTERED — … ONLY" line goes; the title's tag says it instead. The workbook
  keeps its banner.

### Acceptance

- Every control that was in the top row works from the sidebar, with the same effect.
- Picking a report changes the table as the cost filter did; Quantities only as above.
- The report totals match the TOTAL row on the full estimate with all layers in one tab.
- Collapsing the sidebar is kept after a reload.

## Block B: working tools (D-127)

### B1. Needs attention

A sidebar entry with a count, and a toggle that narrows the table to the lines that need
work (it combines with the report and filters). A line needs attention when it is a priced
leaf (no sub-items, not a context or Unallocated row) and any of:
- **No rate:** its full-estimate Item Cost is 0.
- **No quantity:** its quantity is 0 or missing.
- **No subcontractor:** it carries subcontract cost and its classification resolves to no
  subcontractor.
- **Unscaled sheet:** one of its sheets has no scale.

Each flagged row shows a small marker in Item No. whose tooltip lists the reasons.

### B2. Collapse to a level

Buttons 1, 2, 3 and All in the sidebar's View: level N shows group headers down to depth N
with their totals, and folds everything below. All expands every group. The chevrons keep
working per group afterwards.

### B3. Change many rows at once

- **Select:** a checkbox column at the far left (not a data column; never exported). Click
  selects one; Shift-click a range; the header checkbox selects every row shown. Selection
  clears on a report, tab or grouping change.
- **Bar:** with rows selected, a bar over the table: "N selected", Set values…, Clear.
- **Set values…:** a dialog with Unit Man Hours, Per Hour Wage, Unit Material Cost, Unit
  Equipment, Subcontract and Wastage, each left blank to keep. Apply writes only the filled
  fields, to priced leaves only, through the existing per-line saves (no new api), with one
  undo step for the batch. Rows priced by components keep their component types.
- **Fill down:** the row menu's "Use this row's rates…" opens Set values… prefilled with
  that row's typed rates, to apply to the selected rows.

### Acceptance

- The Needs attention count matches the rows it shows; each reason can be produced on the
  bench.
- Collapse to level 1 shows only depth-0 headers with correct totals.
- Setting a wage on 10 selected rows changes those 10 and nothing else; one undo restores them.

## Not in F9c

- The bid summary (F9b, block C). Saved custom reports shared across the project, estimate
  revisions and compare, and a workspace price book (block D, needs the api).
- A bulk endpoint on the api (D-117 holds the api's umer-dev).

## Progress

- [~] Block A: sidebar, Reports, Quantities only, sticky TOTAL (D-126). Built 2026-09-30,
  gates and quantity table green; the Playwright MCP did not connect, awaiting the browser
  check on the bench. Files: `estimate/EstimateSidebar.tsx`, `estimate/reports.ts`,
  `estimate/EstimatingView.tsx`.
- [ ] Block B1: Needs attention (D-127)
- [ ] Block B2: Collapse to a level (D-127)
- [ ] Block B3: Change many rows at once (D-127)

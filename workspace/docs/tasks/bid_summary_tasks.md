# F9b: Bid summary (markups, overhead, profit, bond, tax, bid total)

> **Specced 2026-09-30, blocked on D-117** (the api's `umer-dev` cannot be pulled or pushed
> until staging's settings and storage agree). Answers in session: compounding markups, sales
> tax on material only, workspace defaults (D-128). P-22 in FEATURES.md; block C of F9c's plan
> ([estimating_reports_tasks.md](estimating_reports_tasks.md)). Beyond legacy: legacy's tab
> stops at the summed Item Cost (D-88 Q1).

## The problem

The Estimating tab ends at Direct cost, the sum of every line's Item Cost. A contractor's
bid adds sales tax, overhead, profit and a bond on top, and today that happens in a
spreadsheet after the export, so the number sent to the owner is never in the product.

**Problem → solution.** No bid total in the product. → A bid summary at the foot of the
Estimating sidebar: Direct cost, then sales tax on material, overhead, any extra markups,
profit and bond, compounding to the **Bid total**; rates per project, starting from the
workspace's defaults; the same figures in the Excel export.

## The arithmetic (`lib/estimate/bidSummary.ts`, pure, hard rule 2)

Inputs: the full estimate's totals (Direct cost and Total Material Cost, all layers, no
search or filters, the figures the sidebar's Reports already show, D-126) and the rates.

| Step | Line | Amount | Running subtotal |
|---|---|---|---|
| 1 | Direct cost | D | D |
| 2 | Sales tax (on material) | M × tax% | S1 = D + tax |
| 3 | Overhead | S1 × overhead% | S2 = S1 + overhead |
| 4 | Each extra markup, in order (contingency, escalation, …) | S(prev) × rate% | S3 |
| 5 | Profit | S3 × profit% | S4 = S3 + profit |
| 6 | Bond | S4 × bond% | Bid total = S4 + bond |

- **Compounding** (D-128): each line is taken on the running subtotal above it.
- **Tax first** (proposed, to confirm): sales tax on material is a cost the contractor pays,
  so it sits in the cost before overhead and profit are taken. The alternative, tax last on
  material only, changes steps 2 and 6 only.
- Every amount rounds to the cent as it is made; the total is the sum of the rounded lines.
- A rate of 0 or blank shows the line at $0.00, not hidden, so the sheet always reads the same.
- **Cost per SF** (optional, from F9c's plan): when the project names a reference area item,
  the Bid total ÷ its quantity, shown under the total.

## Data model (api, `app/features/estimate/`)

- **`workspace_bid_default`**: one row per workspace. `tax_pct`, `overhead_pct`,
  `profit_pct`, `bond_pct` (Decimal, 0 to 100), `extra` (JSON list of `{name, pct}`).
- **`project_bid_summary`**: one row per project, the same columns, plus
  `reference_item_id` (nullable, for cost per SF). No row means the project still reads the
  workspace's defaults; the first save writes the row (copying the defaults it started from),
  and a later change to the defaults never moves a project that has its own row.
- Migration: both tables, workspace-scoped (`WorkspaceScopedMixin`), `ON DELETE CASCADE`.

## Api

- `GET  /api/workspace/{ws}/bid-defaults` and `PUT` (`canManageWorkspace`).
- `GET  /api/workspace/{ws}/project/{p}/estimate/bid` → the project's rates, or the
  workspace's with `inherited: true`; `PUT` (`canEditEstimates`); `DELETE` goes back to
  inheriting the defaults.
- A change emits `estimate.bid.updated` on the project channel (D-13), so a second window's
  summary follows.

## The screen

- **Sidebar foot** (replaces D-126's Direct cost): each line as "Label  rate%  amount",
  Direct cost and Bid total in bold, "From workspace defaults" under the heading while
  inherited. **Edit…** opens the dialog; seats without `canEditEstimates` see it read-only.
- **Bid summary dialog:** tax, overhead, profit and bond as percentages; extra markups
  added, renamed, reordered and removed; a live preview of every line and the total; "Reset
  to workspace defaults". Save, Cancel, Escape and backdrop as every dialog.
- **Workspace settings, a new Estimating page** (`SettingsEstimating.tsx`, beside
  Subcontractors): "Bid defaults", the same fields, for new projects.
- **Export:** a "Bid Summary" sheet after the layer sheets, the lines with live formulas
  (`=D*rate` style) over the estimate sheets' totals, and the rates in their own cells.

## Acceptance

- Direct $100,000 with $40,000 material, tax 8%, overhead 10%, profit 10%, bond 1%:
  tax $3,200.00; overhead $10,320.00; profit $11,352.00; bond $1,248.72; Bid total
  $126,120.72. A row in the shared quantity table (D-78) carries this case.
- A new project shows the workspace's defaults, marked inherited; saving writes its own row;
  changing the defaults afterwards leaves it alone.
- A second window sees a saved change without reloading.
- The export's Bid Summary sheet recomputes in Excel when a rate cell is changed.

## Not in F9b

- Alternates (add or deduct options) and allowances. Tax on equipment or on the whole
  subtotal (a later option on the tax line). Per-division markups.

## Progress

- [ ] Blocked on D-117. Start: `git pull origin umer-dev` in `intelcost-app-fastapi` once the
  staging settings, storage and the bench compose file agree.

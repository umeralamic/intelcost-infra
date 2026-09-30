# F9b: Bid summary (markups, overhead, profit, bond, tax, bid total)

> **Specced 2026-09-30.** Was blocked on D-117; unblocked the same day when D-129 merged and
> reconciled the api's staging branch (eb0f104). Answers in session: compounding markups, sales
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
- **Tax first** (confirmed 2026-09-30, D-128): sales tax on material is a cost the
  contractor pays, so it sits in the cost before overhead and profit are taken.
- Every amount rounds to the cent as it is made; the total is the sum of the rounded lines.
- A rate of 0 or blank shows the line at $0.00, not hidden, so the sheet always reads the same.
- **Cost per SF** (optional, from F9c's plan): when the project names a reference area item,
  the Bid total ÷ its quantity, shown under the total.

## Data model (api, `app/features/estimate/`)

- **`estimate_bid_rates`** (as built: one table in place of two): `tax_pct`, `overhead_pct`,
  `profit_pct`, `bond_pct` (Numeric(7,4), 0 to 100), `extra` (JSONB list of `{name, pct}`),
  and `project_id`: **null for the workspace's defaults**, set for a project's own row. Two
  partial unique indexes keep one defaults row per workspace and one row per project.
- No project row means the project reads the workspace's defaults (`inherited`); the first
  save writes its row, and a later change to the defaults never moves it. Reset deletes it.
- Migration `b7e3c9a1d5f2`, workspace-scoped (`WorkspaceScopedMixin`), `ON DELETE CASCADE`.
- Cost per SF is **not built** in this block (no `reference_item_id`).

## Api

- `GET  /api/workspace/{ws}/estimate-bid-defaults` and `PUT` (`canManageWorkspace`).
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
- **Export:** a "Bid Summary" sheet after the layer sheets, on the Full estimate report only:
  Direct cost and the material total as values, each line's rate in its own cell, its amount
  `ROUND(base × rate, 2)` and a running Subtotal column, so a rate changed in Excel
  recomputes the chain to the Bid total.

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

- [~] Built 2026-09-30, awaiting the browser check (the Playwright MCP did not connect).
  - api: `estimate/models.py` (`EstimateBidRates`), migration `b7e3c9a1d5f2`, `estimate/bid.py`,
    `estimate/routes.py` (`/bid` GET, PUT, DELETE), `estimate/bid_routes.py` (defaults),
    `estimate.bid.changed`. Driven with a throwaway account: inherit, save, defaults change
    leaves the project alone, reset, 101 % refused.
  - app: `lib/estimate/bidSummary.ts`, `features/estimate/{api.ts,useBid.ts,BidSummary.tsx}`,
    the sidebar's foot, `pages/SettingsEstimating.tsx` (Settings › Project Setup ›
    Estimating), `lib/estimate/workbook.ts` (`appendBidSheet`).
  - Quantity table: `bid-compounding` (the acceptance case), `bid-cents-and-extra`,
    `bid-workbook-sheet`; 28 cost rows right to the cent.

# F9b — Markups, overhead, profit, bond, tax and the bid total (DRAFT)

Status: **draft, not built** (the founder's round 4 C10, 2026-09-29). Questions at the end
wait on the founder.

## What legacy has (read on `UmeralamDEV`, not driven live)

Legacy's live Estimating tab (`components/estimate/ProjectEstimatingView.tsx`) has **no**
markups, overhead, profit, bond, tax or bid total: it ends at the lines' cost totals. The
behaviour lives only in legacy's **retired** estimate (`src/retired/…`, still routed from
`App.tsx` for the old wizard, scenarios and schedule pages):

- **Where the rates live.** Columns on `projects` (migration `20260419201340`):
  `contingency_pct` 5.00, `gc_overhead_pct` 8.00, `gc_profit_pct` 5.00, `bond_pct` 1.00;
  later `permit_allowance` (a lump sum) and `insurance_pct`. Defaults are per project, not
  per workspace.
- **Sales tax.** A reference table `sales_tax_rates` (by state, migration `20260612135712`),
  passed to the retired `EstimateResults` as `salesTaxPct` and applied to materials.
- **The bid total** (`retired/lib/export/proposalPdf.ts`), compounded, in this order, each
  on the running total, excluded lines left out:
  1. direct cost (sum of the included lines),
  2. + contingency %,
  3. + GC overhead %,
  4. + GC profit %,
  5. + permit allowance (lump sum),
  6. + bond %,
  7. + insurance %.
  Then a bid per SF when the project has `gross_sf` and the bid is a GC's, not a sub's.
- **Where it shows.** The retired results page and the bid proposal PDF
  (`exportProposalPdf`, gated by `canExportProposals`), which shows the bid total and a CSI
  rollup by line count only ("no $ leaked" per division).

## What we have

The Estimating tab's lines, groups and TOTAL with components (F9). No project-level
percentages, no tax table, no proposal PDF.

## Proposed scope (for the founder to confirm)

- A **Bid summary** block under the Estimating table: direct cost, each markup as a row
  with its % and amount, the running total, and the **bid total** (and per SF when known).
- The rates per project, edited in that block (Pricing capability), defaults from legacy.
- The api computes the summary (the api owns the money, D-03); the browser shows it.
- The quantity table gains cost rows for the compounding, to the cent.

## Questions for the founder

1. **Order and compounding.** Keep legacy's compounded order (contingency, overhead,
   profit, permit, bond, insurance), or apply each to direct cost (simple, not compounded)?
2. **Which markups.** All six of legacy's, or a user-defined list (name, %, applies to)?
3. **Sales tax.** On materials only (legacy's) or on a chosen set of cost types? From a
   state table (legacy's reference data) or typed per project?
4. **Defaults.** Legacy's per-project defaults (5 / 8 / 5 / 1), or workspace defaults a
   new project copies?
5. **Per layer (bid package).** Does each layer (Base Bid, alternates) get its own bid
   total with the same rates, or rates per layer?
6. **The proposal PDF.** In scope with F9b, or its own feature later?
7. **Subcontractor bids.** Legacy hides per SF on a sub's bid; is "GC or sub" a project
   setting we need now?

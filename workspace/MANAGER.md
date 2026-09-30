# IntelCost — Manager
_**The project board.** Three sections — In Progress, Blocked, Planned — so a glance
says which feature is under development right now._
_Updated: 2026-09-29_

**Backlog:** [FEATURES.md](FEATURES.md) · **Rules of engagement:** [DECISIONS.md](DECISIONS.md) · **Parity checklist:** [docs/PARITY.md](docs/PARITY.md)

> Each row is a **2-3 line problem → solution** story, the compressed version only.
> The full task description lives in its spec under [docs/tasks/](docs/tasks/).

> **Status legend:** ☐ Planned · ◐ In Progress · ⛔ Blocked · ☑ Shipped→archived
> **Scope legend:** `Be` = Backend · `Fe` = Frontend · `Infra`
> **Owners (D-11):** Umer ports every feature on `umer-dev`. Abdullah owns infra,
> AWS, data migration and promotion to `main`.

---

## In Progress

| # | Story (problem → solution) | Scope | Owner | Spec |
|---|----------------------------|-------|-------|------|
| P-20a | A scanned or landscape sheet that arrives turned has no fix today. → Legacy's "Rotate Pages…" from the panel's ⋮ menu: the current, selected or all pages, filtered by layout and rotation ("All pages + Landscape" in one click), turned by a relative turn or set to an absolute one, stored in `view_rotation` (the PDF's own `/Rotate` stays in `rotation`). The page box turns by CSS as legacy's, so coordinates, quantities and calibration are untouched; the pointer maps back through the turn; thumbnails turn too; one `drawing.sheet.changed` turns a colleague's view live, beyond legacy. **Specced and built 2026-09-27 (overnight), `p20a` 8/8; awaiting the founder's click check.** | Be Fe | Umer | [rotate_pages_tasks.md](docs/tasks/rotate_pages_tasks.md) |
| F6 | An item today is only its shapes: no height, pitch, sub-items, variables or classification, and F3 left the classification block here. → The New Measurement and Properties dialog, height and pitch modifiers, named dimensions, sub-items with a formula engine run in both the browser and the api (kept equal by one shared table), workspace variables, folders with multipliers, legacy's three seeded layers with show and hide and the last one never deleted, the item tree listing every item in the project (D-54), and F3-S14 to S18 (systems, the tree, archive, the CSI seed, subcontractors). Every item write keeps F8-S9's lock and the collaboration mode. Duplicates count up "(2)", "(3)" (D-36). **Specced overnight 2026-09-26; built overnight 2026-09-27, Blocks A to E (D-55 to D-60); full tier 100 green. Awaiting the founder's click check (the morning report's list), then archive.** | Be Fe | Umer | [item_model_tasks.md](docs/tasks/item_model_tasks.md) |
| F7 | Today's canvas has Linear, Area and Count only: no modes, no selection or editing, no deducts, no undo, and Count makes an item per click. → Every measure tool and canvas interaction ported to the pdf.js canvas: draw modes, Segment, Count adding to the selected item (one row per mark), inline arcs analytic, snap and ortho, select and vertex editing, box select, move, copy, deducts as rows cascading from their area (`shapely` on the api), auto-merge of one's own shapes only, Resume and Extend as new rows (D-32), undo recording every act, menus, hover, mouse and keys, canvas settings on the user; colleagues' cursors, and drafts drawn solid in the item's colour by default (D-38). Crop as New Page; the other page acts are P-20. **Specced 2026-09-26, answers D-39. Built overnight 2026-09-28: Block A and S4 to S19 (D-61 to D-67); in the day, Block D (S20, S21) and Block E (S22) (D-69, D-71, D-72); after the founder's review (D-73) the snapshot restore, Delete's ask, the undoable box delete and paste's dialog, then S23 and S24 (D-74, D-75), each smoke-tested through the Playwright MCP (D-70). The founder's click check of 2026-09-28: group A, the canvas (wheel, fit, pans, deducts, D-76) and group B, the panels and item rows (P-21 brought forward, D-77) built and smoke-tested; round 2's groups A to E (D-78 to D-83) overnight 2026-09-28; then S25 to S31 (D-84 to D-86): hover, reticle, keys, colleagues' cursors, drafts as shapes, the two-window check, Crop as New Page. Round 3 (D-97, D-98, 2026-09-29): legacy's unbounded pan, selected look, vertex points, move handle inside an area, count symbols at their sizes, Dimension brought forward from F11, narrower panels, the Sheets + menu, and the collaboration settings split. Built, awaiting founder click check; closed in speed mode (D-70), spec not archived.** | Be Fe | Umer | [canvas_tools_tasks.md](docs/tasks/canvas_tools_tasks.md) |
| F9 | Takeoff ends at quantities and no bid leaves the product: there is no Estimating tab. → Legacy's Estimating tab in the takeoff screen: rows from takeoff, legacy's columns, groupings, layer tabs, search and filters, then pricing (labour, material, equipment, subcontract, wastage, multipliers, cost components), lines and columns, packages, format and the Excel export, the arithmetic in the browser's pure `lib/estimate/` (the Python twin waits for a need, D-89). **Spec adopted overnight 2026-09-28 with the ten answers in legacy's favour (D-88, pending founder review). Built overnight 2026-09-28 to 29: Blocks A to F (D-88 to D-94), each smoke-tested through the Playwright MCP with the quantity table green, compared with live legacy (`UmeralamDEV`) on the grid, the Format panel and the export; S12 driven in two windows and in One at a time. Built, awaiting founder click check; closed in speed mode (D-70), spec not archived.** | Be Fe | Umer | [estimating_tasks.md](docs/tasks/estimating_tasks.md) |
| F9c | The Estimating tab's controls crowd one row over the table, the cost filter is really a choice of report, and pricing is one cell at a time. → A left sidebar (view, filters, table, setup), Reports with their totals and a Quantities only report, the top down to title, Search and Export (block A, D-126); then Needs attention, collapse to a level and change many rows at once (block B, D-127). | Fe | Umer | [estimating_reports_tasks.md](docs/tasks/estimating_reports_tasks.md) |
| F9b | A priced estimate stops at the summed Item Cost: no markups, overhead, profit, bond or tax, so no bid total. → **The next estimating block after F9** (the founder, D-95): a bid summary at the foot of the Estimating sidebar, sales tax on material first, overhead, extra markups, profit and bond compounding to the Bid total, per project from workspace defaults (Settings › Estimating), in the export's Bid Summary sheet (P-22, D-128). **Built 2026-09-30, awaiting the browser check.** | Be Fe | Umer | [bid_summary_tasks.md](docs/tasks/bid_summary_tasks.md) |

---

## Blocked

| # | Story (problem → solution) | Scope | Blocked on | Spec |
|---|----------------------------|-------|-----------|------|

---

## Planned

| # | Story (problem → solution) | Scope | Owner | Spec |
|---|----------------------------|-------|-------|------|
| F10 | Assemblies, Starter Pack, Library. Emits realtime events (D-13). | Be Fe | Umer | _not yet specced_ |
| F11 | Collaborator markup, print, find text, snippets and bookmarks. Emits realtime events (D-13). **Also owns, from F7 (D-39 Q9): the Legend and Print.** Dimension was brought forward and built in round 3 (D-97); the AI-verified witness layer came with the scale check (D-131). | Be Fe | Umer | _not yet specced_ |
| F12 | Earthwork and Auto Trace | Be Fe | Umer | _not yet specced_; starting point drafted from live legacy (D-96): [earthwork_tasks.DRAFT.md](docs/tasks/drafts/earthwork_tasks.DRAFT.md) |
| F13 | Auto Count | Be Fe | Umer | _not yet specced_ |
| F14 | AI tools and AI credits. **Inherits from F3:** the AI Credits tab — the workspace wallet, per-workspace and per-member credit limits, and returning a member to the workspace default (F3 S23). The Stripe top-up checkout inside that tab belongs to F16. | Be Fe | Umer | _not yet specced_ |
| F15 | Sharing, guest view, Reports, time tracking, Community. **Inherits from F3:** the Shifts tab and the Time Tracking tab (F3 S21–S22), and with shifts, the one thing that makes PARITY §2's "Members — list with role, shift and last activity" tick. That line is **partial** until a member has a shift to show; role and last activity already ship. | Be Fe | Umer | _not yet specced_ |
| F16 | Billing, trials, admin panel. **Inherits from F3:** the plan value itself. F3 built and drove the plan and trial capability masks, but `Plan` is a constant `pro` everywhere, so PARITY §3's "a collaborator-plan workspace loses the measure tools" cannot be reached end to end — **re-drive that line here**, once a workspace can actually be on the collaborator plan. Also the Stripe top-up checkout in the AI Credits tab, and the platform-admin screens behind the F3 S4 gate (D-23). | Be Fe | Umer | _not yet specced_ |
| F17 | Legacy data migration and cutover. Legacy passwords are Supabase bcrypt. Verify bcrypt on login and rehash to Argon2, or every migrated user must reset. Password length rule applies on set/change only, never on login. Legacy custom roles resolve absent capabilities through their base role. Migration must write each legacy custom role's full effective map, or migrated roles silently lose access. | Infra | Abdullah | _not yet specced_ |

---

## Workflow

| File | Role | Holds |
|---|---|---|
| [DECISIONS.md](DECISIONS.md) | Rules of engagement | Calls already made, binding until superseded |
| [FEATURES.md](FEATURES.md) | Backlog | Every feature: Live, Working, Planned |
| MANAGER.md | Project board | The tasks in flight, blocked, or queued |
| [docs/PARITY.md](docs/PARITY.md) | Parity checklist | Every legacy behaviour, ticked as it is ported |
| [docs/tasks/](docs/tasks/) | Task descriptions | One `<name>_tasks.md` spec per feature in flight |

- **Picking up a feature:** write `docs/tasks/<name>_tasks.md` from its PARITY.md
  section, move the row to In Progress, move the feature to 🔨 Working.
- **Done:** every PARITY.md line for that surface ticked and driven on the bench.
  Move the spec to [docs/archive/](docs/archive/), drop the row here, move the feature
  to ✅ Live.
- **Decision:** log it in [DECISIONS.md](DECISIONS.md) as the next `D-NN` **before**
  implementing it.

# Overnight report, 2026-09-27 to 2026-09-28

_Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Last night's report:
[docs/archive/OVERNIGHT_REPORT_2026-09-27.md](../archive/OVERNIGHT_REPORT_2026-09-27.md).
Run started 2026-09-27 16:33 CDT; ends about 2026-09-28 08:30 CDT._

## Progress checklist

- [x] 0. Archive F5 (spec and block reports to docs/archive, Live row, board)
- [x] 0a. F5 follow-up (founder's addition): (a) items under each sheet row in the panel;
      (b) legacy's scale button and dropdown. (c) is written into F6's spec, built in S9
- [x] 1. Rotate pages (P-20a): specced ([rotate_pages_tasks.md](rotate_pages_tasks.md)),
      built, awaiting your click check
- [x] 2. F6, all blocks, with the two-window live check: A to E built
- [x] 3. Close F6 (built, awaiting your click check): full tier 95/100 first time, the 5
      fixed or explained and green on rerun; backup `E:\Intelcost-backup\2026-09-28_0010-f6-built`
- [x] 4. F9 estimating draft spec ([drafts/estimating_tasks.DRAFT.md](drafts/estimating_tasks.DRAFT.md))
- [x] 5. F7 Block A (`f7-a` 8/8)
- [ ] 6. F7 Block B onwards: S4 to S10, S12 and S17 built (`f7-b`, `f7-c`, `f7-d`); S11,
      S13 to S16 and Blocks D to H not started
- [x] 7. Proof backlog (PARITY ported, not driven): every line marked **ported** tonight
      names the fixture that drives it; 14 of them had been left unticked and are ticked.
      The one unticked **ported** line left is §24's fit-tier baseline (a measurement)
- [x] 8. F10 and F11 draft specs ([drafts/assemblies_tasks.DRAFT.md](drafts/assemblies_tasks.DRAFT.md),
      [drafts/markup_print_tasks.DRAFT.md](drafts/markup_print_tasks.DRAFT.md)), written
      beside the tiers

## Tasks

| # | Task | Status | Start | End | Duration |
|---|---|---|---|---|---|
| 0 | Archive F5 | Done: the spec and both block reports in `docs/archive/`, F5 ✅ Live with its flow and files, the board's F5 row dropped, PARITY's F5 note says shipped | 16:33 | 16:55 | 22 m |
| 1 (spec) | P-20a spec | Written, [rotate_pages_tasks.md](rotate_pages_tasks.md); on the board In Progress | 16:55 | 17:10 | 15 m |
| 1 | P-20a Rotate pages | **Built**, awaiting your click check: `p20a` 8/8; the quick tier plus the canvas fixtures, 26 fixtures, 24 passed first time, the 2 failures found and rerun green (below) | 17:10 | 18:05 | 55 m (with the spec) |
| 2A | F6 Block A (S1 to S3): New Measurement and Properties, height and pitch, named dimensions | **Built**: `f6-a` 9/9; quick tier plus 10 touched fixtures, 27: 25 first time, 2 failed from an api restart I caused mid-run, rerun green. D-55 | 18:05 | 19:00 | 55 m |
| 2B | F6 Block B (S4 to S6): the formula engine twice and equal, sub-items, variables | **Built**: `f6-s4` 3/3 (965 rows equal), `f6-b` 9/9; quick tier plus 7, all 24 pass. D-56 | 19:00 | 20:05 | 1 h 05 |
| 2C | F6 Block C (S7 to S9): folders and multipliers, layers, the item tree (with the founder's (c)) | **Built**: `f6-c` 10/10 (third run; two product faults and two fixture faults found on the way, below); quick tier plus 21 touched fixtures, all 38 pass first time (25 m 26 s). D-57 | 20:05 | 21:00 | 55 m |
| 2D | F6 Block D (S10 to S15): classification systems, trees, archive, the seed, filing by classification, subcontractors | **Built**: `f6-d` 9/9 (fourth run; the first three failed on fixture faults, below); quick tier plus 9 touched, 24 of 26 first time: `f6-c` (a race in the fixture, fixed) and `p19` (the tab row overflow, fixed by D-60), both green on rerun. D-58, D-59, D-60 | 21:00 | 21:55 | 55 m |
| 2E | F6 Block E (S16): the two-window check across F6 | **Built**: `f6-e` 3/3 (third run; two product faults found and fixed, below); quick tier plus 14 touched, 31: 29 first time; `f6-c` (a fixture race, fixed) and `f6-a` (a page load timeout, below) green on rerun | 21:55 | 22:45 | 50 m |
| 3 | Close F6 | **Built, awaiting your click check** (spec not archived, as asked). Full tier: 100 fixtures, 95 first time (72 m); `f5-s15` and `f5-s19` were a real regression from Block C (below, fixed), `f4-s10` a fixture assumption (fixed), `f8-s15` and `f8-s12` a connect timeout (not explained); all five green on rerun. Board, backlog, PARITY, mirror, dated backup | 22:55 | 00:10 | 1 h 15 |
| 5 | F7 Block A (S1 to S3): hit rules, analytic quantities, deducts, the shapes transaction, capabilities | **Built**: `f7-a` 8/8 (fourth run: my fixture's world twice, and a formula name I had wrong); quick tier plus 25 touched, 42: 40 first time; `p20a` (a live turn late) and `f8-s9` (a connect timeout, found and fixed, below) green on rerun. D-61 | 00:15 | 01:10 | 55 m |
| 6 | F7 Block B (S4 to S8): Linear and Area modes, Segment, Count joins the selected item, finishing and the draw menu | **Built** (S9 inline arcs, S10 snap, S11 past the edge not started): `f7-b` 7/7 (third run; a product fault found on the way, below); quick tier plus 26 touched, the four service-restart fixtures among them, 43: 42 pass, `p20a`'s live turn open (below). D-62 | 01:10 | 02:10 | 1 h |
| 6b | F7 S9 inline arcs, S10 snap and Ortho, S12 select a section and the hole cycle, S17 Delete | **Built**: `f7-c` 5/5, `f7-d` 4/4 first run; the shared table caught a gap of mine in both engines (an area closed by an arc from two points), fixed; quick tier plus touched, 41: 38 pass; `f8-s18` and `f8-s9` caught a regression of mine (below) and `f7-a` the overlapping-holes row written ahead of its code, all three fixed in 6c. D-63 | 02:10 | 02:53 | 43 min |
| 6c | F7 S13 vertices (insert, delete, legacy's refusal), S15 Move (a section carries its deducts, a deduct moved off is refused), S18 deducts drawn on the canvas (legacy's refusals, overlapping holes merged) | **Built**: `f7-e` 6/6, `f7-f` 3/3; `f7-d` caught the move handle swallowing the hole cycle's click (fixed: a click on the handle is a click on the sheet); quick tier plus 15 touched, 32: all pass. D-64, D-65 | 02:53 | 03:39 | 46 min |
| 6d | F7 S14 box select, Ctrl+A and the selection menu, legacy's Pan tool back (H, V); S15 AC5 Move from the menu; S19 AC4; a product fault found on the way (shapes on the wrong sheet) | **Built**: `f7-h` 8/8, `f7-g` 4/4 (after fixture fixes: a section found by role, not order; a press off the new handle; a sheet switch the F6 panel makes); `proof-backlog`'s §7 and §8 steps brought up to date; quick tier plus 22 touched, 39: all pass. D-66 | 03:39 | 04:41 | 1 h 2 min |
| 4 | F9 estimating draft spec | **Done**: [drafts/estimating_tasks.DRAFT.md](drafts/estimating_tasks.DRAFT.md), from legacy's `ProjectEstimatingView.tsx` and `lib/estimate/`, ten questions at the end | 21:45 | 22:10 | 25 m (beside the tier) |
| 8 | F10 and F11 draft specs | **Done** (brought forward to fill tier time): [assemblies](drafts/assemblies_tasks.DRAFT.md), nine questions; [markups, Dimension, Legend, Print, Find Text, snapshots, history](drafts/markup_print_tasks.DRAFT.md), eight questions | 22:20 | 22:50 | 30 m (beside the tiers) |
| 0a | F5 follow-up (a) and (b), the founder's addition; (c) written into F6-S9 | **Done:** built, `f5-sheet-items` 5/5, `f5-scale-button` 4/4, the quick tier plus 8 touched fixtures all 25 pass (16 m 47 s). D-53, D-54 | 17:10 | 17:35 | 25 m |

## The founder's addition (a), (b), (c)

Placed first: P-20a had only its spec when the addition arrived.

**(a) Items under each sheet row** (legacy's `SheetItemList` in `SheetTree`):
- A sheet row with measurements has legacy's chevron, "Show items on this sheet" and "Hide
  items on this sheet". Open, it lists that sheet's items: colour, name and **this sheet's
  quantity** (its shapes there, on its scale, with height, pitch and multipliers). A count
  counts its marks even on an unscaled sheet; a run there reads "—".
- A click on an item selects it and opens that sheet. Selecting an item anywhere opens the
  sheets carrying it; searching an item's name opens its sheets.
- The ⋮ menu gains legacy's **Default Expand Level** (None, Page (Default), Page >
  Takeoff), **Hide Search Box** and **Hide Takeoffs**, kept per browser and workspace.
- The api's `GET …/drawing/sheet/items` now answers each item's colour, type, unit and
  per-sheet quantity. A scale change refreshes the rows live.
- Not yet (they arrive with F6-S9's shared item row): the row's kebab menu, inline rename,
  the eye, multi-select.

**(b) Legacy's Scale button:** in the toolbar after Select and before Linear, a ruler over
the word "Scale", title "Scale — {label}". It opens the same menu as the canvas chip
(Calibrate Scale, Add Custom Scale, the three lists, the current one ticked), and reads
pressed while a calibration runs. The old "Scale" tool, which started a calibration on a
click, is gone.

**(c) The Takeoff panel, all sheets:** legacy's `QuantityTable` lists every item in the
project and has **no current-sheet filter**. It has "Also measured on: …" in the Resume
tooltip and "Delete on this sheet only". Written into F6-S9 as AC0, D-54, and built there.

**Fixtures:** `f5-sheet-items` (5 steps) and `f5-scale-button` (4) are new. `f5-s15`,
`f5-s19` and `proof-backlog` now calibrate through the menu. `f5-s13` and `f5-s14` find a
row's label by `[data-sheet-label]`, because the chevron is now the row's first button.
`f5-s18` accepts the Scale button's own title as "no reason".

## Commits

## Overnight decisions to review

- **D-53** (the F5 follow-up): each sheet's items show that sheet's share; legacy's default
  Page, so sheets start closed; a count counts on an unscaled sheet; the item row is a
  viewer until F6-S9; the toolbar's Scale is a dropdown and the old calibrate-on-click
  tool is gone.
- **D-55** (F6 Block A): New Measurement asks when the tool is picked, in legacy's words
  ("Name this LF measurement", "LF 3"), and one tool run is one item (so three count
  clicks are one item, 3 EA); the suffix reads "40.0 LF" (legacy's formatter); the api
  computes the slope factor; a count needs no scale; the WBS choice is on the person.
- **D-56** (F6 Block B): sub-items one level only (the spec), read in order like legacy;
  the two engines proved equal on the bench; a variable change recomputed on the api and
  pushed live; variables managed from the sub-items editor's Insert menu.
- **D-57** (F6 Block C): folder and layer multipliers extend a quantity, as legacy's
  ("Takeoff always shows the measured quantity"); the api used to fold them in.
- **D-58** (F6 Block D): legacy's five classification templates copied verbatim (CSI
  1,833 nodes, UniFormat 635, NRM 1 401, NRM 2 361, CESMM 254, and the 54 default
  subcontractors with their packages); each system seeds the first time it is read or
  turned on (D-36 Q8), never twice; all five start on, as legacy; one duplicate rule,
  "That code already exists in this system.", ignoring case (legacy had two wordings);
  a new scope's code is the next free `.NN` (legacy's could collide after a delete);
  gated on Manage classification; live to other tabs, beyond legacy.
- **D-59** (F6 Block D): filing under a classification happens on the api (legacy did it
  in the browser), so two estimators filing at once share one folder; the picker adds a
  search box (the spec asks for one; legacy's picker had none); legacy's "Change
  classification system" unlock dialog is not built in F6.
- **D-60** (F6 Block D): Settings follows legacy's grouping: one "Project Setup" tab with
  Classification, Subcontractors and Statuses inside it, so the tab row still fits the
  desktop column (P-19); the row's gap is 14 px instead of 16.
- **D-61** (F7 Block A): legacy's hit rules (0.008 of the page for runs, 14 px floor
  for count marks, positives before deducts, topmost first); ellipses, arcs and
  rectangles measured from their parameters on both sides, dropping legacy's `circle`
  shortcut (it is wrong on a non-square page); a deduct wholly inside its sections
  subtracts its own exact area (legacy clipped a circle as a 64-gon, 313.65 SF instead of
  314.16); only a deduct crossing an edge is clipped (`shapely`); the other engine
  modules land with the blocks that use them.
- **D-62** (F7 Block B): legacy's modes, hints and draw menu (with Close on an area);
  Count with a count item selected adds to it with no dialog; deferred: the default-mode
  setting (S27) and a sheet switch ending a count session (S22).
- **D-63** (F7-S10): the canvas bar shows Ortho and Snap only; Snap PDF, Auto Merge and
  Auto Scroll join it when their features exist, rather than as toggles that do nothing.
- **D-54**: the Takeoff panel will list every item, with legacy's cues and no sheet
  filter, because legacy has none. If you want a "This sheet only" filter beyond legacy,
  say so and it is a small addition to F6-S9.

## Failures and findings

- **Product fault, found while building S14 and fixed (6d): a shape added on one sheet to
  an item begun on another went to the item's first sheet.** Since F6 the Takeoff panel
  lists every sheet's items and Count joins the chosen one. But the api stored every new
  shape on the item's own sheet, listed a sheet's items by where they began, and returned
  all of an item's shapes to every sheet's canvas. So a mark placed on sheet B could be
  saved to A, drawn on A, and never shown on B. Now a new shape carries the sheet it is
  drawn on (a deduct takes its section's). A sheet lists every item with a shape on it,
  with only that sheet's shapes, and each shape names its own sheet. `f7-g` step 4 proves
  it: a mark placed on M2 for an item begun on M1 is stored and drawn on M2.
- **`proof-backlog` has gone stale (not in any tier).** Run tonight for its §9 Pan step,
  7 of its 13 steps failed on screens F5 and F6 have since changed (the Sheets panel's
  "Open", the layers panel, the upload input, the zoom ceiling of 4000% against the line's
  3000%, figures read before D-51). None of the failures touches F7. It is on the list to
  bring up to date.

- **A regression of mine, caught by the tier (6b):** to keep a handle off a count mark
  when it is merely selected (S12), I kept count handles out entirely, and "Edit
  vertices" on a count item then showed none: `f8-s18` step 2 and `f8-s9` step 3 timed out
  waiting for the handle to drag. Not a flake. Count handles now show under "Edit
  vertices" again and stay off a mark that is only selected.
- **The shared quantity table's overlapping-holes row failed (6b)** because I added it
  before the code that merges holes in both engines; that code came in 6c.

- **`f5-s14` AC2 read the api's sheet order before the write had answered** (P-20a's tier).
  The panel moves a dragged sheet at once and writes after; the fixture checked the api
  as soon as the panel showed the new order, and on a busy bench it read the old one.
  The fixture now waits for the `PUT …/sheet/order` answer first. Not a product fault.
- **`f8-s13` and `f8-s14` failed in F6 Block A's tier, both at the same second, waiting for
  the sheet.** I had saved a new api module mid-run, which restarts the api and the worker.
  Rerun alone with nothing changing: both pass. My fault, not the product's; from then on
  api code waited in the scratchpad while a tier ran.
- **Found in F6 Block A (product faults, fixed):** a Count on an unscaled sheet was stored
  as 0 and stale (legacy counts marks without a scale); an item update that moved a folder
  or layer never recomputed; Enter in the New Measurement dialog reopened it; a context
  menu opened on a row a panel had just scrolled into view closed at once.
- **`f5-sheet-items`' setup: a connect timeout from the fixture to the api** (P-20a's
  tier, once). The api's log shows no stall in that run (no gap over 10 s in the
  parallel group), so the connection from the browser container to the host gateway
  timed out, not the api. **Not reproduced**: rerun beside the three heaviest fixtures,
  all 5 passed. **Cause not found.** `apiCall` now names the request and how long it
  waited when a fetch fails, so a repeat says which call it was.

- **Found in F6 Block C (product faults, fixed):** a click then a Ctrl-click in the Takeoff
  panel selected one item, not two (the clicked row now joins the selection, as in
  legacy's tree); the delete-layer dialog read "This layer hold 1 item" (now "holds").
  **Fixture faults, fixed:** `f6-c` read Unfiled's absence the instant window B had
  updated, before window A's own refetch (it now waits for Unfiled to go); and a drag
  made with Playwright's `dragTo` onto a header scrolled out of the short tree never
  dropped (the fixture now drags in steps and scrolls the target in mid-drag, as the
  tree does under a hand).
- **The connect timeouts, cause found and fixed (bench, not product):** a fixture's own
  request to the api (`GET …/folder`, a login) timed out connecting four times tonight,
  always with three fixtures running. In F7 A's tier the api logs were intact: both apis
  served steadily through the minute (60 to 90 log lines every 10 s, no gap), and the
  failed request never arrived. The path it took was the host gateway and the published
  port (Docker Desktop's port proxy). The harness's own calls now go over the compose
  network by service name (`api:8000`, `api-b:8000`, `mailhog:8025`); the page still uses
  the published ports, as a person's browser does. `lib/bench.mjs` `fromNode`,
  `lib/realtime.mjs` `call`. The service-restart fixtures ran in Block B's tier to prove
  it (below).
- **Open: `p20a` step 8, a turn not reaching the second window, twice in parallel tiers
  (F7 A's and B's), passing alone.** The api logged the rotation `PUT` (06:42:11 UTC) and
  no failed publish; api-b logged no missing subscribe confirmation; and window B made
  **no request at all** afterwards, so the event never reached it or was not acted on.
  Not found. The fixture now reports which events B's socket heard when it fails, which
  is the evidence missing. It passed in both F6 tiers and the F6 full tier; what changed
  since is F7's canvas and the api's geometry code, neither of which touches rotation or
  realtime, so I have not tied it to them.
- **Found in F7 Block B (a product fault, fixed):** the Escape that closes the draw menu
  also reached the canvas and dropped the run, so the next Stop had nothing to keep. The
  canvas now leaves a key a menu has handled.
- **Found in F7 Block A (product faults, fixed):** the Sheets panel's per-sheet figure
  still multiplied by the folder and layer multipliers, against D-57 (Block C changed the
  item's figure and missed this one); it now shows the measured quantity, as the item and
  legacy do. The sub-item environment measured an ellipse or arc from its (empty)
  vertices, so `AREA_SF` and `PERIMETER` read 0 on a curved parent; it now reads the
  analytic figures and deducts like the item.
- **`poetry.lock` is behind `pyproject.toml`**: `shapely` was added to the dependencies
  and the image rebuilt with it (pip reads `pyproject.toml`), but Poetry is not in the
  container, so the lock was not regenerated. Run `poetry lock` once on a machine that
  has it.
- **Found by the F6 close's full tier (a regression of mine, fixed):** since Block C the
  Takeoff panel reads the project's items (D-54), but a colleague's scale change
  (`sheet.calibration.changed`) refreshed only the open sheet's items, so window B's
  panel kept the old quantities until something else refreshed it. `f5-s15` and `f5-s19`
  caught it; the quick tier does not run them. The event now refreshes the project's
  list too; both pass.
- **`f4-s10` step 1, a fixture assumption (fixed):** it read the api the moment both
  assignee chips showed, but since F4 Block E a chip shows the tick before its save
  answers. Step 2 found both saved, so nothing was lost; the fixture now waits for the
  stored list.
- **`f8-s15` and `f8-s12`: a connect timeout from the fixture to the api** (a plain
  `GET …/folder`, 10 s), the same failure as `f5-sheet-items` in P-20a's tier. Rerun: both
  pass. **Cause not found**, and the api's log for those minutes is gone (the serial
  fixtures recreate the api container). Proposed: keep the api's log on a volume across
  recreations, so the next one can be read.
- **Found in F6 Block E (product faults, fixed):** the Takeoff panel of the window that
  made a change did not show it: the panel lists every project item (D-54) from a
  project-wide query, but the page and the item-mutation hook refreshed only the open
  sheet's query after their own writes, and a tab ignores its own realtime echo. Only
  the other window updated. Both now refresh the project's items. And in One at a time
  the tree's double-click rename and drag ignored a colleague's hold (the menu already
  honoured it; the api refused the write); both now honour it.
- **Found in F6 Block D's tier: a list read can straddle a commit.** `f6-c` saw Wall
  unfiled but still "×2" right after its folder was deleted: `GET …/item` reads items,
  then folders, then each folder's uuid in separate statements under read committed, so
  a delete committing between them mixes the two states. The next read is right (every
  change is followed by an event and a refetch), so a screen shows it for one refetch at
  most. **Not fixed overnight** (a change to how every read transaction begins);
  proposed: read-only requests at REPEATABLE READ, one snapshot per request. The fixture
  now waits for the settled state. Only in parallel runs; the cause is the one above.
- **`f6-a` step 9: `/login` did not finish loading in 30 s** (Block D and E's tier, three
  fixtures in parallel). No app or api file was saved during that run. Rerun alone and
  beside `f6-c`: 9/9. **Cause not found**; like the connect timeout in P-20a's tier it
  looks like the bench's dev server under load, but that is a guess, not a finding. If
  it repeats, the next step is the app container's request log for that minute.
- **`f6-c` step 9, a fixture race, fixed:** the second Duplicate opened before the panel
  listed the first copy, so it suggested "(2)" again. The suggestion reads the names the
  panel shows, which is legacy's behaviour; the fixture now waits for the row.
- **Settings tab row overflow (P-19), fixed by D-60:** the two new settings screens as
  their own tabs overflowed the desktop row by 201 px; the Subcontractors screen scrolled
  sideways by 149 px on a phone (the "inherited from" note widened its column). Now
  legacy's "Project Setup" tab and a truncating note; `p19` measures both screens.
- **My error, recorded:** I saved two page files while Block D's tier was running
  (hot reload can disturb a running fixture). The fixtures that ran after it passed; I
  have not done it again.
- **F6 Block D, fixture faults only, fixed:** `f6-d` first used the estimator seat as the
  one without Manage classification, but the estimator holds the library capabilities
  (F3's map), so the takeoff seat is the one; it closed an area with Enter where the
  canvas closes on a double click; and it counted "Locks after first save" before the
  workspace's systems had loaded (it now waits for the words). No product fault found.
- **Legacy faults not carried over (D-58):** legacy's picker and Settings disagreed on
  the duplicate-code words and on case; a scope added after a delete could collide with
  a sibling's code and fail silently; a new division's sort key sorted it before the
  seeded ones. One rule, the next free code, and the code as sort key here.
- **The F6 fixtures were not in the full tier.** `regress.sh`'s full list globbed f2 to
  f5 and f8; it now includes `f6-*` (edited between runs, with no run in progress).

- **Two panel fixtures broke on the chevron** (`f5-s13` AC3, `f5-s14` AC3). Both took a
  row's first button to be its label. The fixtures were wrong, not the panel; they now
  use `[data-sheet-label]`.

## Click-only checks for the founder

### F5 follow-up (a): items under each sheet (IDM irrelevant)

1. Open a project's takeoff on a sheet with measurements. In the Sheets panel, a small ▸
   sits left of that sheet's name. Hover it: "Show items on this sheet".
2. Click ▸. The sheet's items appear under it, each with its colour dot, name and quantity
   on this sheet, like "60 LF". Click ▾ to fold them.
3. Open ▸ on a **different** sheet and click one of its items. The canvas moves to that
   sheet and the item is highlighted.
4. ⋮ (Panel options) → Page > Takeoff: every sheet with items opens. Reload: still open.
   ⋮ → None: the folders fold. ⋮ → Page (Default): back to normal.
5. ⋮ → Hide Takeoffs: the ▸ marks go. ⋮ → Hide Search Box: the search box goes. Undo both.
6. Type an item's name in "Search sheets…": its sheet shows, already open at that item.

### F5 follow-up (b): the Scale button

1. In the toolbar, between Select and Linear, there is a **Scale** button (a ruler over
   the word). Click it: the scale menu opens, the same as the green or amber chip's.
2. Pick `1/4" = 1'-0"`. The chip turns green and reads it; hover the button: "Scale —
   1/4" = 1'-0"". Open it again: that scale is ticked.
3. Scale → Calibrate Scale: the "Calibrate" toast appears and the Scale button stays
   highlighted until you finish.

### P-20a: Rotate pages (IDM on is fine: nothing new is downloaded)

1. Open a project with several sheets. In the Sheets panel, ⋮ (Panel options) →
   **Rotate Pages…** (under "Page layout").
2. It opens on "All pages (N)". Set Layout to Landscape: only landscape pages stay
   ticked, and the line reads "2 of 3 pages match · 2 ticked" (your numbers).
3. Set to → 90°: the footer reads "Rotate 2 pages to 90°." Pick Turn by → 180° instead:
   "Turn 2 pages by 180°." Press Apply: "Rotated 2 pages".
4. Open a turned sheet. It stands turned, filling the width, and your existing
   measurements sit on the same drawing features as before; their quantities are
   unchanged.
5. Draw a Linear run on the turned sheet across a known dimension. It reads the right
   length.
6. Zoom in far (400% and more). The drawing stays sharp where you are looking.
7. ⋮ → Thumbnails: the turned sheet's thumbnail is turned too.
8. With a second window open on the same sheet, turn it in the first: the second turns
   within a second, no reload.

### F6 Block A: New Measurement, height and pitch, dimensions (IDM irrelevant)

1. On a scaled sheet, click **Linear**. A dialog asks "Name this LF measurement", with a
   name like "LF 3" already filled. Press Enter. Draw two runs: both land in one item
   (legacy's way; before, each shape was its own item).
2. Click **Count**, name it "Doors", pick a colour from the swatch (or Randomize), set
   Opacity to 50, Symbol "Square", "Fixed size", Create, then click three doors: one item,
   3 EA.
3. Click **Area**, open "Work Breakdown Structure (WBS)", choose "Preset Classification":
   Create greys out (no classifications yet). Tick "Rough measurement": Create works, and
   the area lands in a "Rough Measurements" folder. Reload and click a tool again: the WBS
   is still open on Preset (it remembers you). Switch back to Custom Folder.
4. Right-click an item in the Takeoff panel → **Properties**: it says "Current folder:
   Unfiled" (or its folder) and saves with Save.
5. Make a Linear with "Convert to area using a height" of `7'-6"` and draw a 40 ft run: it
   reads about 300 SF, named "… (40.0 LF, 7'-6\"H)".
6. On an area, Properties → "Apply a slope factor" 6/12: 100 SF reads 111.80 SF. Try
   Degrees 95: "Angle must be between 0 and 90 degrees", and Save greys out.
7. Properties → "+ Depth" twice: "Depth" and "Depth (2)". Remove the first and add "+
   Width": it is named Width, and the item's own quantity never moves.

### F6 Block B: sub-items and variables (IDM irrelevant)

1. Right-click an area item → **Create sub-item**. Description "Mesh", Formula
   `PARENT * 1.05`: the Qty column shows 5% more than the area straight away. **Add
   sub-item**, "Perimeter form", `PERIMETER`, unit LF. Save: both appear under the item
   in the Takeoff panel.
2. Manage sub-items again: add a row with a formula but no name, and the footer says "Name
   this sub-item to continue"; name it and type `PARENT *`: "Fix the formula to continue".
3. Stretch the parent's shape (Edit vertices): the sub-items' numbers follow, and a second
   window shows them within a second.
4. In Manage sub-items, **Insert → Manage variables… → Add Variables**: "Wall Height",
   Single quantity, default 10, Save, Done. Add a row "Wall" with `{Wall Height} * 2`: 20.
   Back in Manage variables, set "This project" to 12: Wall reads 24. Another project
   using it still reads the default.
5. Archive the variable: it leaves the Insert menu, and "Wall" still reads 24.
6. Properties on the parent: a dimension a sub-item reads says "used by 1", and removing
   it refuses: "Can't delete … It's used by: …".

### F6 Block C: folders, layers, the item tree (IDM irrelevant)

1. Open a project with items on two sheets. The Takeoff panel lists **all** of them,
   whichever sheet is open; one measured on another sheet says "Also measured on: …".
   Click it: that sheet opens.
2. Right-click a folder header → **Folder Properties**. Type 0 in Multiplier: "Enter a
   number greater than 0." and Save greys out. Type 2, Save: the folder shows "×2" and
   each row in it "30 LF × 2 = 60 LF" (the measured figure stays; Estimating uses the
   total).
3. Right-click a folder with a sub-folder and items → **Delete folder**: "Delete folder?
   … Deleting it will remove all subfolders and move line items to Unfiled." Confirm: the
   items are under Unfiled. An empty folder asks "This folder is empty. Are you sure you
   want to delete it?"
4. Right-click **Unfiled** → Rename → "Sitework": it becomes a real folder holding what
   was unfiled. A second window shows it without a reload.
5. Make a **new project**: the layer box at the top of the panel lists Base Bid,
   Alternate and Deferred Submittals. Pick **Alternate**; draw a count: it files under
   Alternate, and only Alternate's items list. Base Bid's shapes leave the sheet; open the
   box and click Base Bid's eye: they return. Reload: both choices are kept.
6. In the box, the bin beside **Alternate**: "Move contents and delete layer" to Base Bid,
   or "Delete layer and all its measurements", which stays grey until you type DELETE.
   Delete layers until one is left: the last one refuses, "A project must keep at least
   one layer".
7. Right-click an item with a sub-item → **Duplicate**: it suggests "Wall (2)", with
   "Include sub-items (1)". Duplicate: the copy has a new colour and the sub-item. Do it
   again: it suggests "Wall (3)".
8. Click one row, Ctrl-click another: "2 selected — right-click for actions". Right-click
   → a folder: both move. Drag a single row onto a folder header: it moves. Drag a normal
   item onto **Rough Measurements**: refused, "Only rough measurements go in Rough
   Measurements. Tick or untick Rough measurement in Properties to move an item across."
9. Double-click a row: its name edits in place; Enter saves.

### F6 Block D: classifications and subcontractors (IDM irrelevant)

1. **Settings → Classification.** The card lists CSI MasterFormat, UniFormat, NRM 1
   (Elemental), NRM 2 (Work Sections) and CESMM, all ticked. Untick all five: "At least
   one system must remain enabled." and Save greys out. Untick one only, Save: "Classification
   systems saved", and it stays unticked after a reload. Tick it back.
2. Below it, System: CSI MasterFormat. The Division column lists "DIV 01 — General
   Requirements" onward (legacy's 1,833-row CSI list, already there). Click "DIV 03 —
   Concrete": its scopes show on the right; expand one with its chevron.
3. **+ Add division**, Code 03, Name anything, Add: "That code already exists in this
   system." Change the code to 99, Add: it appears and is selected. **+ Add scope**
   "Framing", Enter. Its ⋮ → Add sub-scope "Studs". ⋮ → Rename "Framing" to "Wood
   Framing".
4. Open a project's takeoff, click **Area**, open WBS, choose **Preset Classification**:
   Create is grey. Type "Wood Framing" in the search, click it: "Selected: DIV 99 — … ›
   Wood Framing". Create, draw an area: the Takeoff panel shows it under folders "DIV 99
   — …" / "Wood Framing". Click Area again: the picker now says "Locked for this project".
5. Right-click that item → Properties → Current folder → **Change**, click DIV 03 and a
   scope, Save: the item moves to "DIV 03 — Concrete" / that scope.
6. Back in Settings → Classification, DIV 99 → Wood Framing's ⋮ → **Delete**: "This one
   is in use" with the count; **Archive instead**: it leaves the list and the picker.
   "Show archived" shows it faded; ⋮ → Restore. Delete "Studs": `Delete "Studs"?` …
   "Delete permanently".
7. **Settings → Subcontractors.** Legacy's 54 defaults are listed (GC first). Add "My
   Glazier". Search "Fixture" or your division 99 on the right, set it to My Glazier; its
   scopes below read "Inherit (My Glazier)". Delete My Glazier from the list: it asks
   first ("Scopes packaged to it become Unassigned …"), and after, the scope is
   Unassigned.
8. With a second window on Settings → Classification, add a division in the first: the
   second shows it without a reload.
9. Settings: the tab row now reads "… Ownership · Project Setup · Collaboration …";
   Project Setup opens Classification, with Classification · Subcontractors · Statuses
   under it (legacy's grouping, D-60).

### F6 Block E: two windows (IDM irrelevant; needs a second account in the workspace)

1. **Work together.** Two windows on the same sheet, one per person. In A, Count a new
   item and click once: B's Takeoff panel lists it. Double-click it in A and rename it:
   B shows the new name. Drag it onto a folder in A: B shows it there. No reload in B.
   A's own panel shows each change too (it did not, before tonight's fix).
2. **One at a time** (Settings → Collaboration). In A, right-click an item → Add a shape
   (don't draw). In B, right-click the same item: Properties, Rename, Create sub-item and
   Duplicate are grey with "{A's name} is editing this item right now."; double-clicking
   its row does not open a rename. Press Escape in A: B's entries come back.
3. **Work together** again. Give an item a Depth and a sub-item reading it.
   In A open
   Manage sub-items and change the formula; at the same moment in B open Properties and
   change the Depth; save both: both windows end on the same sub-item figure.

### F7 Block A: picking shapes, curved shapes, deducts (IDM irrelevant)

There is no circle, arc or deduct tool on the canvas until Blocks B and D; these checks
use what the canvas has.

1. Draw a thin Linear run. With Select, click a couple of pixels beside the line (not on
   it): the run is selected. Click a finger's width away on bare paper: nothing changes.
2. Click inside an area: it is selected. Click just outside its edge: still selected.
3. Put a count mark down. Click near it, not on the dot: it is selected. Zoom in once and
   try again: same.
4. Right-click near a run (not on it): its menu opens, for that run.
5. As a Viewer seat: Linear, Area and Count are grey with "View only…"; right-click an
   item: Rename and the other edit entries are grey with "Your role cannot create & edit
   measurements."; clicking a shape still selects it.
6. The Sheets panel's figure for an item in a folder with a multiplier now matches the
   Takeoff panel's measured figure, not the multiplied one.

### F7 Block B: the measure tools (IDM irrelevant)

1. The small ▾ beside **Linear**: Point to Point, Rectangle, Ellipse / Circle and Arc,
   each with a line saying how it works, the current one with a dot. Hover Linear: "Linear
   — Point to Point (change mode with ▾)".
2. Pick **Rectangle**, name it, click two corners: a closed box, its perimeter in LF.
   **Ellipse / Circle**: two clicks, a circle or ellipse, its perimeter. **Arc**: click
   start, a point on the curve, end: a curve, its length. Three clicks in a straight line
   give a two-piece line.
3. In Rectangle or Ellipse, press and drag instead of clicking: the shape in one move.
4. The same under **Area**'s ▾ (Point to Point, Rectangle, Ellipse / Circle): areas in SF.
   In Area's Point to Point, press and drag also places a rectangle.
5. **Segment**: every two clicks make one piece, and the next click starts the next piece;
   all pieces are one item.
6. Select a count item in the Takeoff panel, then click **Count**: no dialog; each click
   adds a mark to that item. Right-click a mark (with Select): "Delete this point" and
   "Delete all points on this sheet".
7. Mid-run with Linear: **Backspace** takes the last point back; **Enter** finishes.
   **Escape** once keeps the run (if it has two points) and the tool; Escape again puts the
   tool down.
8. Mid-run, **right-click**: New Section, Stop, Discard (and Close on an area, grey until
   three points). Escape closes only the menu; the run is still there.

### F7 S9, S10, S12, S17: arcs, snap, selecting a section, Delete (IDM irrelevant)

1. Bottom-left of the sheet: "Ortho: Off" and "Snap: On". Hover each for its note; click
   to flip.
2. With Snap on, start a Linear run and move near a corner of an existing run: a small
   square shows where the point will land; click, and it lands exactly on the corner.
   Near the middle of an edge it lands on the midpoint; near where two of your lines cross,
   on the crossing.
3. Mid-run, press **O**: the bar reads "Ortho: On" and the line locks to 45° steps (hold
   Alt for 22.5°). **S** flips Snap the same way.
4. Mid-run with Linear, press **A**, click a point the curve should pass through, then its
   end: the edge bends and the run carries on. Backspace before the end click takes the
   through point back. The figure counts the true curve.
5. With Select, click one section of an item that has several: only that section is
   highlighted, with its corner handles; the item's row is selected in the Takeoff panel,
   and scrolled to if needed.
6. An area with a hole: click inside the hole three times: the area, then the hole, then
   the area again.
7. Select a section and press **Delete** (or Backspace): that section alone goes, with no
   question. Select a count item's mark and press Delete: its marks on this sheet go.

### F7 S13, S15, S18: vertices, Move, deducts (IDM irrelevant)

1. Select an area section. Double-click one of its edges: a new corner appears there.
   Right-click an edge, "Insert point here": the same.
2. Right-click a corner, "Delete this point": it goes. On a triangle it is refused: "Can't
   delete point", "A SF run needs at least 3 points. Delete the whole run instead."
3. A round handle sits in the middle of the selected section. Rest on it: the item's name
   and quantity. Drag it: the section follows the cursor and drops where you let go, with
   any holes it has, and the quantity stays the same. A tiny nudge moves nothing.
4. Select a hole on its own (click inside it until the hole is highlighted) and drag its
   handle off the area: "Move rejected", "The moved subtraction no longer overlaps any
   positive region. Original position restored.", and it goes back.
5. Right-click an area, "Subtract from section", "Rectangle": draw a box inside it:
   "Subtracted", "Applied to "{name}".", and the figure drops by the box. Draw another
   without re-arming: it cuts again. A box outside: "Subtract has no overlap". A box
   over the whole area: "Deduction covers the whole area". Two holes that overlap count
   their overlap once.
6. "Edit vertices" on a count item still shows a handle on each mark to drag.
7. Right-click an area on the sheet, "Move" (its line reads "Press and drag the markup to
   its new position"): a toast says the same; press anywhere on the area and drag; it
   moves once, and the next press does not.

### F7 S14: box select, the selection menu, Pan (IDM irrelevant)

1. The toolbar starts with **Pan** ("Pan (H) — drag to move the sheet") and **Select**.
   With Select, drag across empty sheet: a dashed box follows; what it wholly encloses is
   highlighted when you let go, what it only crosses is not.
2. A box over nothing selects nothing and opens nothing. A click off every markup, or
   Escape, lets the selection go.
3. **Ctrl+A** selects everything on the sheet. Right-click anywhere on the sheet: "{n}
   selected", Copy, Paste (greyed), Move, Rotate Left 90°, Rotate Right 90°, Flip
   Horizontal, Flip Vertical, Lock, Delete. Bottom-left, a **Delete** button, "Delete
   everything in the selection".
4. Rotate and flip: the shapes turn about their middle, nothing stretches (try a wide
   sheet), and every quantity stays the same: "Rotated — quantities unchanged".
5. Arrow keys nudge the selection a hair; Shift nudges ten times further.
6. Copy: "Copied 2 markups", the copies just below and right of the originals, in the
   same items.
7. **H** arms Pan and **V** Select; Pan's drag moves the sheet, Select's no longer does
   (space-drag and the middle button pan with any tool).
8. On a second sheet, choose an item from the first sheet in the Takeoff panel (it opens
   the first sheet), go back to the second, and Count: the marks stay on the second sheet.

## Questions

1. D-54: legacy has no "this sheet only" filter in the Takeoff panel. Keep legacy's (no
   filter, "Also measured on", and the Sheets panel's per-sheet list), or add one?

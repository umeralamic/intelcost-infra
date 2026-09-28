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
- [ ] 2. F6, all blocks, with the two-window live check: A, B, C built; D (classifications,
      subcontractors) and E (two-window check) to go
- [ ] 3. Close F6 (built, awaiting founder click check)
- [ ] 4. F9 estimating draft spec
- [ ] 5. F7 Block A
- [ ] 6. F7 Block B onwards
- [ ] 7. Proof backlog (PARITY ported, not driven)
- [ ] 8. F10 and F11 draft specs

## Tasks

| # | Task | Status | Start | End | Duration |
|---|---|---|---|---|---|
| 0 | Archive F5 | Done: the spec and both block reports in `docs/archive/`, F5 ✅ Live with its flow and files, the board's F5 row dropped, PARITY's F5 note says shipped | 16:33 | 16:55 | 22 m |
| 1 (spec) | P-20a spec | Written, [rotate_pages_tasks.md](rotate_pages_tasks.md); on the board In Progress | 16:55 | 17:10 | 15 m |
| 1 | P-20a Rotate pages | **Built**, awaiting your click check: `p20a` 8/8; the quick tier plus the canvas fixtures, 26 fixtures, 24 passed first time, the 2 failures found and rerun green (below) | 17:10 | 18:05 | 55 m (with the spec) |
| 2A | F6 Block A (S1 to S3): New Measurement and Properties, height and pitch, named dimensions | **Built**: `f6-a` 9/9; quick tier plus 10 touched fixtures, 27: 25 first time, 2 failed from an api restart I caused mid-run, rerun green. D-55 | 18:05 | 19:00 | 55 m |
| 2B | F6 Block B (S4 to S6): the formula engine twice and equal, sub-items, variables | **Built**: `f6-s4` 3/3 (965 rows equal), `f6-b` 9/9; quick tier plus 7, all 24 pass. D-56 | 19:00 | 20:05 | 1 h 05 |
| 2C | F6 Block C (S7 to S9): folders and multipliers, layers, the item tree (with the founder's (c)) | **Built**: `f6-c` 10/10 (third run; two product faults and two fixture faults found on the way, below); quick tier plus 21 touched fixtures, all 38 pass first time (25 m 26 s). D-57 | 20:05 | 21:00 | 55 m |
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
- **D-54**: the Takeoff panel will list every item, with legacy's cues and no sheet
  filter, because legacy has none. If you want a "This sheet only" filter beyond legacy,
  say so and it is a small addition to F6-S9.

## Failures and findings

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

## Questions

1. D-54: legacy has no "this sheet only" filter in the Takeoff panel. Keep legacy's (no
   filter, "Also measured on", and the Sheets panel's per-sheet list), or add one?

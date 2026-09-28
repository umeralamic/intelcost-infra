# Overnight report, 2026-09-27 to 2026-09-28

_Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Last night's report:
[docs/archive/OVERNIGHT_REPORT_2026-09-27.md](../archive/OVERNIGHT_REPORT_2026-09-27.md).
Run started 2026-09-27 16:33 CDT; ends about 2026-09-28 08:30 CDT._

## Progress checklist

- [x] 0. Archive F5 (spec and block reports to docs/archive, Live row, board)
- [x] 0a. F5 follow-up (founder's addition): (a) items under each sheet row in the panel;
      (b) legacy's scale button and dropdown. (c) is written into F6's spec, built in S9
- [ ] 1. Rotate pages (P-20a): specced ([rotate_pages_tasks.md](rotate_pages_tasks.md))
- [ ] 2. F6, all blocks, with the two-window live check
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

## Questions

1. D-54: legacy has no "this sheet only" filter in the Takeoff panel. Keep legacy's (no
   filter, "Also measured on", and the Sheets panel's per-sheet list), or add one?

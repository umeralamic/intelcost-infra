# Row virtualisation: Estimating and the Takeoff panel (plan)

_Plan only, no code (day run 2026-10-17, item 11). N4 (2026-10-15): "row virtualisation stays its own block, later."_

## The problem

**Measured (D-494, night run 2026-10-15),** on a project with about 1,000 items (500 Area, 500 Linear, two sheets):
- **Estimating:** opens in 2.9–3.2 s in the production build, 9 s in dev. Switching Group by takes 2–3.8 s.
- **Opening the sheet** with the Takeoff panel full: 13–24 s in dev.

D-494 already removed the data costs (api reads, formula environments, formatters). What remains is React
rendering, and the browser laying out, every row of a 1,000-row table and a 1,000-row tree. A real job
with 3,000–5,000 items, a large civil set, would be several times worse.

## Baseline (night run 2026-10-19, item 8)

Measured in the production build (the bench's `app-prod`, port 5175, against the bench api), signed in as window-b. Each run:
Chromium at 1600 × 1000, one tab, cold (from Account settings). Wall time runs to the end state shown and then until 15
frames in a row each come within 25 ms. Script, layout and style are Chrome's own counters over the same span.

**The machine was not quiet:** five fixture runs on the fx stack shared it for most of the night. Read the figures as
"at least this slow", and their growth with size as the finding.

**The projects** (all throwaway, all purged at wrap-up):
- **Real data:** a BENCH DUP of the 3D test copy, 190 items on 29 sheets, measured on A101.
- **Sheet-heavy:** a copy of Test 3, 46 sheets, 5 items.
- **Generated:** a second BENCH DUP with Linear items added on A101 in 50 folders, to 5,000 and then 20,000 items.
- **Riverside** is in a workspace the bench's browser account does not belong to, so it was not copied. The DUP above
  is the largest real project that account can reach.

| Measure | Test 3 copy (5 items) | Real (190) | 5,000 | 20,000 |
|---|---|---|---|---|
| First open: sheet and Takeoff panel drawn | 2.2 s | 2.1 s | 34.0 s | 189–251 s |
| Expand every level of the panel | 1.0 s | 1.6 s (179 rows) | 24.7 s (4,989 rows) | not accepted within 15 min |
| Panel scroll | — (no scroll) | 40 fps, worst frame 383 ms | **7 fps**, p95 frame 250 ms | not reached |
| Search the tree, no match | 0.5 s | 0.4 s | 3.7 s | not reached |
| Clear the search, every row back | 0.3 s | 0.7 s | 11.4 s | not reached |
| Ctrl+A on the sheet | 0.4 s | 0.5 s | 11.2 s | not reached |
| Estimating: first row drawn | 4.5 s | 4.7 s (147 rows) | 47.6 s (4,958 rows) | 239.8 s (19,958 rows) |
| Estimating scroll | — | 34 fps | **5 fps**, frame 500 ms | **2 fps**, frame 1.5 s |
| Calculate on C-200 | — | 4.2 s | 7.1 s | 16.0 s |
| DOM nodes after open | 1,546 | 1,541 (9,038 expanded) | 359,420 | 1,454,420 |
| JS heap after open | 67 MB | 71 MB | 317 MB | 1,014 MB |

**Where the time goes:**
- **The main thread, not the network.**
  - First open at 5,000 items: 29.3 s of tasks in 34.0 s of wall time.
  - Of those 29.3 s: script 15.0 s, style 5.4 s, layout 3.6 s.
  - At 20,000: 231 s of tasks in 251 s, of which script 154 s and style 33 s.
- **Rows in the DOM.**
  - The panel draws every row, about 72 DOM nodes an item: 359,000 nodes at 5,000 items, 1.45 million at 20,000.
  - Estimating draws about 190 nodes a row: 931,000 nodes at 5,000 items, 2.4 million at 20,000, with a 1.85 GB heap.
  - Scrolling then spends 250 ms to 1.5 s a frame, re-laying-out a page that tall.
- **Expand and search re-render the whole tree:**
  - expand at 5,000 took 24.4 s of tasks for 24.7 s of wall time;
  - clearing a search re-mounts every row (11.4 s, nodes from 361,000 to 517,000).
- **Ctrl+A grows with items, not sheets:** 11.2 s at 5,000. It selects shapes, but the panel re-renders each selected row.
- **Estimating has a floor of about 4.5 s** at any size, with about 0.4 s of script: the reads (`costs`, `components`,
  items, folders, bid) before the first row. Above that it grows with rows: 47.6 s at 5,000, 240 s at 20,000 (158 s
  script).
- **Calculate grows mildly** (4.2 s, then 7.1 s, then 16.0 s), with little script (2.6 s at 20,000). Why it grows with
  items on another sheet is not measured here; it is not the virtualisation's target.
- **Writing items** for the generated projects ran at about 10 items a second with 12 requests in flight (4,811 in
  489 s): a bulk path would matter for imports, separately.

**What this sets for the targets below:**
- **At 5,000 items:** the panel's 7 fps and Estimating's 5 fps are the pain to fix.
- **At 20,000 items:** a project of that size cannot be used today. Opening it takes 3 to 4 minutes, and the page then
  stops answering.
- **Both views draw every row,** so the virtualised body should take the node count from hundreds of thousands to a
  few hundred, whatever the size.

## The approach

Draw only the rows in view, plus a margin, with **`@tanstack/react-virtual`**. It is already a dependency, used by
the Load dialog's folder pane (`components/load/FolderPane.tsx`) and `load/LoadProgressDialog.tsx`.

1. **Flatten first.** Both views already build a flat list:
   - Estimating's `lines` (`lib/estimate/lines.ts`), with group rows, context rows and the sub-item rows;
   - the Takeoff panel's folder → item → sub-item tree, with its expanded state.
   Make each one an array of rows `{ key, kind, depth, … }`, so the virtualiser sees one list. The tree's
   collapse and expand only change that array.
2. **Estimating's table.**
   - **Body:** keep `<table>` for the header, `<tfoot>` (TOTAL) and column widths (`table-fixed`, frozen header
     and footer). Render only the visible `<tr>`s, with a spacer row above and below sized from the
     virtualiser (`getTotalSize`, `getVirtualItems`).
   - **Row height:** rows are a fixed 22–24 px today. The group header and a wrapped assembly name are the
     exceptions: measure them (`measureElement`), or pin wrapping off and use a fixed height (decision D2).
3. **The Takeoff panel** (`components/QuantityPanel.tsx`, rows in `ItemRow.tsx`): the same, as a `<div>` list with
   absolute rows. The panel is already a scroll container.
4. **What must keep working:**
   - **Scroll to a row:** jump from the canvas, Find, "Jump to this row", and Earthwork's error chips. Today they
     use `scrollIntoView` on a row that might not exist. Replace with `virtualizer.scrollToIndex` on the row's
     index.
   - **Keyboard:** arrow keys and Tab through rows, and focus kept when the row scrolls out.
   - **Box and Shift selection** across rows not drawn: selection is held in state by uuid, not DOM. Check
     both views.
   - **Drag and drop** of items into folders: the drop target may be scrolled off. Auto-scroll at the edges
     while dragging.
   - **Print and Export** read data, not the DOM; to confirm. Estimating's "Print view" may need every row:
     render unvirtualised when printing.
   - **The guest view's titles pass** (`useViewOnlyTitles`) walks the DOM for greyed controls. It must run
     on rows as they mount: it already listens for changes, to confirm.

## Files touched (expected)

| File | Change |
|---|---|
| `features/estimate/EstimatingView.tsx` | body rows virtualised; scroll-to-row via index; print path unvirtualised |
| `lib/estimate/lines.ts` | the flat row list with stable keys (it is close to this today) |
| `features/takeoff/components/QuantityPanel.tsx` | tree flattened, rows virtualised, drag auto-scroll |
| `features/takeoff/components/ItemRow.tsx` | a fixed row height; no layout that measures its neighbours |
| `pages/ProjectTakeoff.tsx` | the jump-to-row callers use the index API |
| `features/share/view-only.ts` | check that the titles pass runs on mount (likely no change) |

## Risks

- **Sticky header and footer inside a virtual body.** Spacer rows keep native table layout, which is the safest
  way. A CSS-grid rewrite of the table would be a much larger change, and is not proposed.
- **Rows of variable height:** measured rows reflow while scrolling fast. The fallback is a fixed height with
  wrapped names truncated, with a tooltip.
- **Find in page (Ctrl+F)** no longer finds rows not drawn. The app's own search box still filters, and that is
  how estimators search. To decide (D3).
- **Fixtures** that count `<tr>` or row elements would read only the visible ones: SINCE_ARCHIVE gets a row.

## What I need you to decide

| # | Question | Recommendation |
|---|---|---|
| D1 | Virtualise both views in one block, or Estimating first (the measured pain)? | Estimating first, the Takeoff panel second, same block |
| D2 | Wrapped assembly names in Estimating: measure rows, or one line with an ellipsis and a tooltip? | One line and a tooltip (faster, steadier) |
| D3 | Browser Ctrl+F finds only drawn rows. Accept, given the app's own search? | Accept |
| D4 | From how many rows does virtualising apply? | Always, so there is one path to test |

## Paper hours

| Piece | Hours |
|---|---|
| Estimating: flat rows, virtual body, spacers, frozen header and footer, scroll-to-row, print path | 6 |
| Takeoff panel: flattened tree, virtual rows, expand and collapse, drag auto-scroll, jump-to-row | 5 |
| Keyboard, selection and guest checks; gates; a 1,000- and a 5,000-item smoke on a BENCH DUP, timed | 3 |
| **Total** | **about 14 h (two days)** |

**Target:** Estimating opens under 1 s with 1,000 items in production, and the Takeoff panel scrolls at 60 fps with
5,000.

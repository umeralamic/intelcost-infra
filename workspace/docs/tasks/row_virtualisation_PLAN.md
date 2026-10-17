# Row virtualisation: Estimating and the Takeoff panel (plan)

_Plan only, no code (day run 2026-10-17, item 11). N4 (2026-10-15): "row virtualisation stays its own block, later."_

## The problem

**Measured (D-494, night run 2026-10-15),** on a project with about 1,000 items (500 Area, 500 Linear, two sheets):
- **Estimating:** opens in 2.9–3.2 s in the production build, 9 s in dev. Switching Group by takes 2–3.8 s.
- **Opening the sheet** with the Takeoff panel full: 13–24 s in dev.

D-494 already removed the data costs (api reads, formula environments, formatters). What remains is React
rendering, and the browser laying out, every row of a 1,000-row table and a 1,000-row tree. A real job
with 3,000–5,000 items, a large civil set, would be several times worse.

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

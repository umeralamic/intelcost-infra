# Overnight report, 2026-09-28 to 2026-09-29

_Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Last night's report:
[docs/archive/OVERNIGHT_REPORT_2026-09-28.md](../archive/OVERNIGHT_REPORT_2026-09-28.md).
Run started 2026-09-28 19:10 CDT; ends by 2026-09-29 05:30 CDT (moved by the founder from 10:10)._

## Progress checklist

| # | Task | Status | Start | End | Duration |
|---|---|---|---|---|---|
| 0 | CLAUDE.md: quantity table outside the no-scripts rule (D-78); run it | Done | 18:55 | 19:00 | 5 min |
| R2-A | Round 2 group A: canvas (zoom, box-drag, selection, Enter/Esc, merge, Ortho tolerance) | Done | 19:00 | 19:40 | 40 min |
| R2-B | Round 2 group B: toolbar icons, action group, bottom-left buttons, Dashboard | In progress | 19:40 | | |
| R2-C | Round 2 group C: row ⋮ menu, totals footer, bookmarks by date | Not started | | | |
| R2-D | Round 2 group D: the takeoff Settings dialog | Not started | | | |
| R2-E | Round 2 group E: whole-page comparison | Not started | | | |
| 2 | Rest of F7 (hover, mouse and reticle, keys and settings, cursors, drafts, two windows, Crop as New Page) | Not started | | | |
| 3 | Close F7 in speed mode | Not started | | | |
| 4 | Legacy comparison: Settings tabs, sign-in, sign-up | Not started | | | |
| 5 | F9 Block A | Not started | | | |
| 6 | F9 Block B onwards | Not started | | | |

## Commits

- react `7bc517f` round 2 group A (D-79); infra: CLAUDE.md D-78, workspace mirror

## Decisions to review (decided overnight, pending founder review)

- **D-78** (the founder's, logged): the quantity table runs after every group.
- **D-79** round 2 group A: matched legacy; the Ortho tolerance is the founder's (default 15°); the pan left bounded (below).

## F9 answers to review

## Legacy differences fixed

- Round 2 A: no scrollbars on the canvas; box-drag for Linear and Segment (Area had it), with legacy's green dashed band; draw menu without "Close"; an empty-sheet click deselects the item.

## Legacy differences left, with reasons

- **Pan is bounded** by the page and its gutter; legacy's is unbounded. Ours is a scroll container (the raster windowing, D-42, reads it); a transform pan is a rewrite for no measuring gain.
- **Zoom buttons hold the view's middle**; legacy's hold the page's top-left or centre and jump between the two.
- **Enter after a Resume**: legacy ends the resumed item's session, so the next run asks for a new item (a race in its code decides when). Ours keeps joining the item until the tool is put down.

## Failures and findings

- **Quantity table, first run under D-78 (19:00):** 325 rows, both engines equal to 1e-9 on
  the 321 comparable rows; the other 4 are self-crossing shapes both engines refuse; 18
  worked answers right; passed.

## Ideas

- Legacy's Snapping hint says Ortho is "horizontal / vertical"; it steps by 45°. Ours says so.

## Click-only checks (most important first)

**Round 2 A**
1. Arm Area, press and drag on the sheet: a green dashed box follows, and a rectangle is measured on release. Same with Linear (a closed box run).
2. Zoom in with the wheel: no scrollbars at the right or bottom.
3. Select an item, click empty sheet: it is let go. Select it again, press Escape: it stays.
4. With Ortho on, draw a line about 10° off level: it lands level. About 30° off: it stays where you put it.

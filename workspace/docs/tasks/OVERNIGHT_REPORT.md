# Overnight report, 2026-09-28 to 2026-09-29

_Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Last night's report:
[docs/archive/OVERNIGHT_REPORT_2026-09-28.md](../archive/OVERNIGHT_REPORT_2026-09-28.md).
Run started 2026-09-28 19:10 CDT; ends by 2026-09-29 05:30 CDT (moved by the founder from 10:10)._

## Progress checklist

| # | Task | Status | Start | End | Duration |
|---|---|---|---|---|---|
| 0 | CLAUDE.md: quantity table outside the no-scripts rule (D-78); run it | Done | 18:55 | 19:00 | 5 min |
| R2-A | Round 2 group A: canvas (zoom, box-drag, selection, Enter/Esc, merge, Ortho tolerance) | Done | 19:00 | 19:28 | 28 min |
| R2-B | Round 2 group B: toolbar icons, action group, bottom-left buttons, Dashboard | Done | 19:28 | 19:42 | 14 min |
| R2-C | Round 2 group C: row ⋮ menu, totals footer, bookmarks by date | Done | 19:42 | 19:51 | 9 min |
| R2-D | Round 2 group D: the takeoff Settings dialog | Done | 19:51 | 20:04 | 13 min |
| R2-E | Round 2 group E: whole-page comparison | Done | 20:04 | 20:13 | 9 min |
| 2 | Rest of F7 (hover, mouse and reticle, keys and settings, cursors, drafts, two windows, Crop as New Page) | In progress | 20:13 | | |
| 3 | Close F7 in speed mode | Not started | | | |
| 4 | Legacy comparison: Settings tabs, sign-in, sign-up | Not started | | | |
| 5 | F9 Block A | Not started | | | |
| 6 | F9 Block B onwards | Not started | | | |

## Commits

- react `7bc517f` round 2 group A (D-79); infra: CLAUDE.md D-78, workspace mirror
- react `7eb6f31` round 2 group B (D-80)
- react (group C) and fastapi `bookmarked_at` (D-81)
- react group D, the Settings dialog (D-82)
- react group E, the whole-page match (D-83)
- react `c52efcf` and fastapi `a95ed9b`: F7-S25 to S27 (D-84)

## Decisions to review (decided overnight, pending founder review)

- **D-78** (the founder's, logged): the quantity table runs after every group.
- **D-79** round 2 group A: matched legacy; the Ortho tolerance is the founder's (default 15°); the pan left bounded (below).
- **D-80** round 2 group B. **Pending review:** the item's session ends on Enter or a committing Escape (legacy's), and the next run asks for a new item after the draw; the takeoff screen now has legacy's own header instead of the app's (the email banner is not shown there).
- **D-82** round 2 group D: legacy's Settings dialog; which settings are in force now and which wait for their features.
- **D-83** round 2 group E: the whole page against legacy's, what was fixed and what is left.
- **D-84** F7-S25 to S27. **Pending review:** the hover panel is hidden when another tool is picked or a pan begins (legacy leaves it up).

## F9 answers to review

## Legacy differences fixed

- Round 2 A: no scrollbars on the canvas; box-drag for Linear and Segment (Area had it), with legacy's green dashed band; draw menu without "Close"; an empty-sheet click deselects the item.
- Round 2 B: toolbar glyphs and sizes (24/48/11 px, 16 px carets) and mode menus; action group icon sizes, no Close, Delete in text colour, mode split; group states; sheet stepper; takeoff header with Open, theme toggle and Dashboard.
- Round 2 C: row cluster order (⋮ last), legacy's row menu, no totals footer, Bookmarks newest first.
- Round 2 D: the takeoff Settings dialog, separate from the workspace's, from the header's gear.
- Round 2 E: tab strip, Sheets header and ladder, muted panel bands, the open sheet's items shown, Takeoff panel width, status bar always, 9 px quantities.

## Legacy differences left, with reasons

- **Pan is bounded** by the page and its gutter; legacy's is unbounded. Ours is a scroll container (the raster windowing, D-42, reads it); a transform pan is a rewrite for no measuring gain.
- **Zoom buttons hold the view's middle**; legacy's hold the page's top-left or centre and jump between the two.
- **Header:** legacy's Share (project sharing), Upgrade and work timer are not built (no feature owns them yet); the Open dialog's "Set up takeoff on existing project" tab is Project Home's load flow here; its list shows every project (the list carries no sheet count).
- **Settings waiting for their features:** Trace (F12), Snap PDF, the legend, Ctrl+F browser find, main tab text size, two-line sheet names, folder/sheet/bookmark row text, Rendering; Hover and Cursor are taken up tonight with S25 and S26.
- **Whole page (E):** the toolbar's Print, Find Text, Dimension, Snapshot, Dock, Overlay, Highlight, Note, Fullscreen, Split; the Earthwork, Collaborator, Estimating and Community tabs; Snap PDF; "Takeoff | Assemblies"; Share; the Sheets panel's folder actions and tree guides: each waits for the feature that owns it (D-83).
- **Action group at 1440 px:** legacy folds it under "More ▾" (its toolbar has ten more tools); ours has room and shows it.

## Failures and findings

- **Throwaway scripts in two infra commits (found 20:13).** The mirror helper staged all of `intelcost-infra` with `git add -A`, so `browser/legacy-r2a.mjs` and `legacy-r2b.mjs` rode along in `ac87ad5` and `ff506c9` and were deleted in `e329299`. They hold no credentials (they read `process.env.LEGACY_*`). The helper now stages `workspace/` only.

- **Quantity table, first run under D-78 (19:00):** 325 rows, both engines equal to 1e-9 on
  the 321 comparable rows; the other 4 are self-crossing shapes both engines refuse; 18
  worked answers right; passed.

## Ideas

- Legacy's Snapping hint says Ortho is "horizontal / vertical"; it steps by 45°. Ours says so.

## Click-only checks (most important first)

**Round 2 E**
1. Open a takeoff at 1440×900 next to legacy's: header, tab strip, toolbar, Sheets and Takeoff panels, corners and the status bar line up; the differences left are the tools and tabs of unbuilt features.

**Round 2 D**
1. The gear in the takeoff header opens Settings: ten sections on the left; change something and press Cancel: it asks "Close without saving?".
2. Settings › Panels › Takeoff off, Save: the Takeoff panel goes; the right edge tab brings it back.
3. Settings › Snapping › Ortho tolerance: 15° by default.

**Round 2 C**
1. Hover a Takeoff panel row: the dot, the eye, then ⋮ at the far right; ⋮ offers Properties, Override quantity, Duplicate, Move to layer ▸, Create sub-item, Delete.
2. Bookmark two pages: the last one bookmarked is on top.

**Round 2 B**
1. Arm Area, name it: the amber group shows Stop, Discard, New Section, Arc, Undo and "Point to Point ▾" at once. Draw and finish with Enter; draw again and press Enter: the group turns to Properties, Start, Resume, Deduct, Copy, Delete. Draw a third: it asks for a new name.
2. The toolbar's Linear, Segment, Area and Count glyphs and the Start disc are legacy's, all the same size.
3. Bottom-left arrows go to the previous and next sheet; the header's Dashboard button goes home; the moon switches to dark.

**Round 2 A**
1. Arm Area, press and drag on the sheet: a green dashed box follows, and a rectangle is measured on release. Same with Linear (a closed box run).
2. Zoom in with the wheel: no scrollbars at the right or bottom.
3. Select an item, click empty sheet: it is let go. Select it again, press Escape: it stays.
4. With Ortho on, draw a line about 10° off level: it lands level. About 30° off: it stays where you put it.

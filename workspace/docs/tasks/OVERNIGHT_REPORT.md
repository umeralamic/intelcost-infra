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
| 2 | Rest of F7 (hover, mouse and reticle, keys and settings, cursors, drafts, two windows, Crop as New Page) | Done | 20:13 | 21:17 | 64 min |
| 3 | Close F7 in speed mode | **Built, awaiting your click check** (spec not archived, as asked). S1 to S31 built, every block smoke-tested through the MCP with the quantity table green (D-70, D-78); PARITY §10 35 ticked, 21 open (Snap PDF, deduct pairing by click, vertex handles, zoom glitches, reference pane and the other lines each waiting for their owner); board, backlog, mirror, backup `E:\Intelcost-backup\2026-09-28_2125-f7-built`. Not driven: the vertex conflict, six-section paste, three-item box delete, S31 AC3 in two windows | 21:17 | 21:27 | 10 min |
| 4 | Legacy comparison: Settings tabs, sign-in, sign-up | Done (D-87). Legacy's mark, auth frame and words; Settings' own bar, heading, Editing workspace card, pill tabs with inner rows; legacy's cards for General, Members, Roles, Ownership and the Project Setup screens | 21:27 | 21:50 | 23 min |
| 5 | F9 Block A | Done. Spec adopted as `estimating_tasks.md` with the ten answers (D-88); live legacy compared (its newer cost components, shared equipment and cost filter written into the spec); the Estimating tab's grid built and smoke-tested | 21:50 | 22:20 | 30 min |
| 6 | F9 Block B onwards | In progress | 22:20 | | |

## Commits

- react `7bc517f` round 2 group A (D-79); infra: CLAUDE.md D-78, workspace mirror
- react `7eb6f31` round 2 group B (D-80)
- react (group C) and fastapi `bookmarked_at` (D-81)
- react group D, the Settings dialog (D-82)
- react group E, the whole-page match (D-83)
- react `c52efcf` and fastapi `a95ed9b`: F7-S25 to S27 (D-84)
- react `5b3298d` and fastapi `ec3408b`: F7-S28 to S30 (D-85)
- react `ae16713` and fastapi `298a8a6`: F7-S31 Crop as New Page (D-86)
- infra `c5062a6`: F7 closed (board, backlog, PARITY), workspace mirror
- react `9e8917b`: sign-in, sign-up and Settings matched to legacy (D-87)
- infra `30be921`: task 4 docs, workspace mirror
- react `0026d5f`, `2e78dca`: F9 Block A, the Estimating tab's grid (D-88)
- fastapi `a2ed9f5` and react `f5bf339`: F9 Block B pricing (D-89)
- react `0105b1e`: F9-S6 multiplier popover; `975fdee`: S4 Costs…; fastapi `4278ad3` and react `f49a1d2`: S7 row menu and comments
- fastapi `07b7d11` and react `2d5e9a0`: F9-S8 custom columns
- fastapi `5c1c127` and react `574b32e`: F9-S9 packages per project
- react `335d48a`: F9-S11 Export to Excel (D-90)
- fastapi `19bbdb5` and react `a56d259`: F9 cost components (D-91)
- fastapi `4fe7e8a` and react `0893afb`: F9-S10 format themes (D-92)
- react `e12b0af`: column widths and Freeze Header; fastapi `94c6277` and react `b09707a`: shared equipment (D-93)
- fastapi `ec82bde` and react `a931329`: Edit sub-item and rate review
- react `88090c7`: Costs… in Manage sub-items; dialog title ids unique
- react `3a6f2da`: the grid at legacy's Default density (side by side with live legacy); `5c05895`: component, shared and unallocated rows in the workbook
- react `407bcd4`: Estimating undo; takeoff keys kept to their tab
- react `11f27d5`: a group row's summary follows its header's text colour; `2e92bcb`: legacy's spacer rows, TOTAL in the column headers' colours
- react `5f628ac`: Go To Page selects the item on the sheet it opens (legacy's "Go to markup")
- react `20aaa38`: a sub-item's Qty exports as a live Excel expression (legacy's `toExcelExpression`)
- react `53899e9`: the frozen header draws its own dividers (legacy's flicker fix)
- react `878e6e6`: Format's Grid & borders, empty and total row heights, tab colour
- react `ea65f6f`: Format row heights per header species and for sub-items
- react `d69f120`: Unallocated rows in their machine's home group (D-94)
- fastapi `d48d44d`: in One at a time an item's hold covers its line's rates and cost components (F9-S12)
- react `2383eb8`: the workbook carries the Format's heights and number format; Tab header, Freeze main header and "What Export carries" in the panel; Escape closes it

## Decisions to review (decided overnight, pending founder review)

- **D-78** (the founder's, logged): the quantity table runs after every group.
- **D-79** round 2 group A: matched legacy; the Ortho tolerance is the founder's (default 15°); the pan left bounded (below).
- **D-80** round 2 group B. **Pending review:** the item's session ends on Enter or a committing Escape (legacy's), and the next run asks for a new item after the draw; the takeoff screen now has legacy's own header instead of the app's (the email banner is not shown there).
- **D-82** round 2 group D: legacy's Settings dialog; which settings are in force now and which wait for their features.
- **D-83** round 2 group E: the whole page against legacy's, what was fixed and what is left.
- **D-84** F7-S25 to S27. **Pending review:** the hover panel is hidden when another tool is picked or a pan begins (legacy leaves it up).
- **D-85** F7-S28 to S30 (beyond legacy, the founder's F8). **Pending review:** the two-window check drove cursors, drafts, a deduct, an undo and a shared count; the vertex conflict, six-section paste and three-item box delete were not driven tonight.
- **D-86** F7-S31 Crop as New Page. **Pending review:** legacy's placement (after the last sheet of the source's folder) and legacy's uncalibrated crop replace the spec's AC1 and AC2 (after the source, at the source's scale); only Crop is built of legacy's region box entries.
- **D-87** sign-in, sign-up and Settings at 1440×900. **Pending review:** the settings pages lose the app's top bar and the email banner (legacy's settings page has neither); Account sits as a fifth tab (legacy has no personal page); the sign-in refusal stays inline in the card, not legacy's toast; ten-character passwords stay.
- **D-89** F9 pricing. **Pending review:** the arithmetic in the browser only, no Python twin yet (nothing on the api computes a cost until export, and D-70 forbids a new proof script); `unit_rate` and `waste_factor` kept, unread, until F9 closes.
- **D-90** F9 export. **Pending review:** built in the browser with legacy's `xlsx-js-style` (a new dependency, loaded only on export); the workbook's colours are legacy's constants in `workbook.ts`, not tokens (a file cannot read CSS).
- **D-91** F9 cost components (legacy's since the draft). **Pending review:** `QTY` added to F6's formula engine for component envs only; shared equipment not built.
- **D-92** F9 format themes. **Pending review:** the Default theme is the app's token look (legacy's Default is fixed hex); only colours a person picks are stored; a reduced panel (no border weight or colour yet).
- **D-93** F9 shared equipment (legacy's since the draft). Its one departure, Unallocated rows gathered at the foot, was undone by D-94.
- **D-94** Unallocated rows sit in their machine's home group in every pivot, as legacy's; the Sheet pivot keeps their own group at the end.

## F9 answers to review

All ten in legacy's favour, D-88, decided overnight and pending your review. Where the draft recommended otherwise it is said:

1. **Markups and a bid total:** none in F9 (legacy's tab stops at the summed Item Cost). Same as the draft.
2. **Proposal, PDF, CSV:** Excel only. Same as the draft.
3. **Money in the browser:** plain numbers as legacy, unrounded until display; the Python twin in floats, same order. *Draft: a decimal type.*
4. **`unit_rate`:** retired for legacy's four cost columns. Same as the draft.
5. **Manual lines:** legacy's, a takeoff item with no shape and an override "Manual line", also in the Takeoff panel. *Draft: D-09's first-class manual line.*
6. **Who may price:** every seat that can edit takeoff or estimates, as legacy lets them; export for every member. *Draft: `canEditEstimates` only, export on `canExportProposals`.*
7. **View state:** in the browser per project, the V<n> export counter included. *Draft: the counter on the project.*
8. **Same-name groups:** merge, as legacy. *Draft: by node.*
9. **Sheet pivot:** legacy's prorating as it is. *Draft: prorate every column, sub-items on each sheet.*
10. **Currency:** USD, en-US. Same as the draft.

Also: live legacy is the `UmeralamDEV` branch, 161 commits past our local `intelcost/` checkout; its cost components, shared equipment and cost-type filter are in the spec now (Block B).

## Legacy differences fixed

- Round 2 A: no scrollbars on the canvas; box-drag for Linear and Segment (Area had it), with legacy's green dashed band; draw menu without "Close"; an empty-sheet click deselects the item.
- Round 2 B: toolbar glyphs and sizes (24/48/11 px, 16 px carets) and mode menus; action group icon sizes, no Close, Delete in text colour, mode split; group states; sheet stepper; takeoff header with Open, theme toggle and Dashboard.
- Round 2 C: row cluster order (⋮ last), legacy's row menu, no totals footer, Bookmarks newest first.
- Round 2 D: the takeoff Settings dialog, separate from the workspace's, from the header's gear.
- Round 2 E: tab strip, Sheets header and ladder, muted panel bands, the open sheet's items shown, Takeoff panel width, status bar always, 9 px quantities.
- Task 4, sign-in and sign-up: legacy's mark and "Intelcost" top left over the warm wash, the heading inside the card, "Welcome back" / "Sign in to your workspace.", "Forgot password?" beside the label, "New to Intelcost? Create an account"; "Start your free trial" and legacy's field order with a muted "(optional)".
- Task 4, Settings: its own bar with "← Dashboard"; "Workspace settings" and legacy's subtitle; "Editing workspace" card; pill tabs General · People & Access · Project Setup · Trash with inner rows; General as Logo, Workspace name, Company info and "Save settings" (toast "Settings saved"); Members as "Members & Roles" with "Invite someone" (Takeoff by default) after the list; Roles in legacy's card and column, fixed roles first with a lock, orange ticks; Ownership opens with the current owner; every card legacy's padding, shadow and heading.
- F7-S31: a Select box over empty sheet opens the region box menu (legacy's 25 px); Crop as New Page with legacy's name, placement, toasts and switch to the new sheet.

## Legacy differences left, with reasons

- **Pan is bounded** by the page and its gutter; legacy's is unbounded. Ours is a scroll container (the raster windowing, D-42, reads it); a transform pan is a rewrite for no measuring gain.
- **Zoom buttons hold the view's middle**; legacy's hold the page's top-left or centre and jump between the two.
- **Header:** legacy's Share (project sharing), Upgrade and work timer are not built (no feature owns them yet); the Open dialog's "Set up takeoff on existing project" tab is Project Home's load flow here; its list shows every project (the list carries no sheet count).
- **Settings waiting for their features:** Trace (F12), Snap PDF, the legend, Ctrl+F browser find, main tab text size, two-line sheet names, folder/sheet/bookmark row text, Rendering; Hover and Cursor are taken up tonight with S25 and S26.
- **Whole page (E):** the toolbar's Print, Find Text, Dimension, Snapshot, Dock, Overlay, Highlight, Note, Fullscreen, Split; the Earthwork, Collaborator, Estimating and Community tabs; Snap PDF; "Takeoff | Assemblies"; Share; the Sheets panel's folder actions and tree guides: each waits for the feature that owns it (D-83).
- **Estimating (F9 Block A):** Format, Export, Shared equipment, Expand components, the row and header menus, column widths by drag, and every cost figure wait for Blocks B to E; the group row's "MH · cost" reads "—" until Block B; legacy's per-theme fonts and fills are Block E's Format.
- **Estimating toolbar:** legacy's runs in one row that goes off the screen at 1440 px (Expand components cut, Format, Columns and Export beyond it); ours wraps to a second row, so every control is on screen (kept).
- **Workbook sub-item expressions:** the Estimating tab holds no sheet scales, so a formula's measured length, area or count is taken from the owning item's quantity; `PERIMETER` and an area parent's `LINEAR` keep the plain number where legacy writes them out. Each expression is also checked against our evaluator, so none can be wrong; legacy checks only plain arithmetic.
- **Format panel against live legacy (02:28):** legacy's text sizes are ±0.5 px nudges over each text's own size, ours set the header and data sizes directly (the same effect, since every text in our grid shares them); legacy lists per-column widths with "Reset column widths" in the panel, ours are dragged at the header and kept per viewer; legacy splits Sub-scope and Custom folder top/nested colours, our groupings have one of each; legacy's Freeze main header belongs to the theme, ours to each viewer.
- **Keep this rate (the tick):** not built; live legacy's unit change always clears the rate, so its tick cannot show there either (its own comment: "A cleared rate has nothing to keep").
- **Settings (task 4):** Shifts and Time Tracking (F15), AI Credits (F14), Brand accent color (the proposal PDF, F10), the members' Shift column (F15) are not built; the transfer keeps F3's type-the-name confirmation instead of legacy's click-to-choose list; our members rows keep email and last activity (F3-S11); Collaboration, Activity and Account are ours, beyond legacy; the sign-in refusal is inline (F2's `AuthFormError` tells a network block from a wrong password) rather than a toast; ten-character passwords (F2); no "Clear cached session" (D-17). The app bar on the dashboard and project pages (out of scope tonight) still differs from legacy's (Library, Settings, email).
- **Region box menu (S31):** legacy's tool strip (name an item from the box), Page Name, Sheet #, Scale, Ask AI, Extract Schedule, Auto Count, Copy as Text / Image, Search as Text and New Snapshot are not built; their owners are F11 to F14 (spec, "Not in F7"). A box that encloses markups selects them (S14) instead of opening the menu.
- **Action group at 1440 px:** legacy folds it under "More ▾" (its toolbar has ten more tools); ours has room and shows it.

## Failures and findings

- **A Format edit was lost once (01:58):** Classification header 32 then Sub-item rows 28, back to back in the smoke; the first held, the second showed 20. Tried again (Scope 26 then Sub-item 30, and Sub-item 34 alone) it held every time; the panel keeps a draft at once and saves 400 ms after the last edit, so no cause was found. Watch for it in the click check.
- **"Group headers" could not be retyped (02:00):** once the species differed it still showed the old shared height, so typing that same number changed nothing. It now reads "mixed" when they differ (`ea65f6f`).

- **Colleagues' pointers were sent but never drawn (found 20:40).** F8 wired the sending; nothing rendered them on the new canvas. Built as S28.
- **app-b was stale (20:45):** its image predated `polygon-clipping` and showed a Vite error; rebuilt.
- **A shared count settled late on B (20:57):** with both marking one count item, A read 11 EA at once and B read 1 EA until its own count session's refetch 3.5 to 8.5 s later; both ended on 11 EA.

- **Our `intelcost/` checkout is not live legacy (21:55).** Live legacy runs the `UmeralamDEV` branch, 161 commits past the local `umer-dev`/`main` at `12dd119b` (2026-09-24): the Estimating tab there has cost components, shared equipment and a cost-type filter the local source lacks. Read tonight with `git show origin/UmeralamDEV:<path>` after a fetch, no branch moved. Worth deciding which branch is the "source of truth" in CLAUDE.md.
- **Takeoff keys acted under the Estimating tab (01:05):** the page's Delete, tool letters, Ctrl+A and undo, and the canvas's arrows, Escape and Enter, listened on the window while the canvas was hidden under Estimating: L opened a naming dialog, arrows could nudge a hidden selection. Guarded by the tab and the canvas's visibility (`407bcd4`).
- **The workbook library warns in dev (01:05):** `xlsx-js-style` references Node's `stream` and `fs`, which Vite stubs in the browser ("Module … has been externalized"). Harmless: the download works and legacy ships the same library.
- **Stacked dialogs shared one title id (00:50):** every `Dialog` labelled itself `#dialog-title`, so a second dialog opened over a first (Costs over Manage sub-items) was announced with the first one's title. Fixed with `useId` (`88090c7`).
- **The browser tab's title ignores the sheet name (21:14):** it reads the sheet number, else "Page {n}", so a crop's tab says "Page 1". Predates tonight; left as it is.
- **Estimating rates ignored One at a time (02:18):** the rates and cost component writes never asked for the item's hold, so S12's second half could not pass. They now call F8's guard (`d48d44d`).
- **Legacy's "What Export carries" promises a worksheet tab colour and a frozen top row (02:28):** its code sets `!tabColor` and `!views`, but the workbook library (`xlsx-js-style`) writes neither, so legacy's files have neither. Ours says so in the panel instead of promising them.
- **Escape did not close the Format popover (02:33):** fixed; it now closes wherever focus is (`2383eb8`).
- **S31 AC3 not driven in two windows:** the crop publishes `drawing.sheet.changed` like every Load; B's panel was not watched tonight.

- **Throwaway scripts in two infra commits (found 20:13).** The mirror helper staged all of `intelcost-infra` with `git add -A`, so `browser/legacy-r2a.mjs` and `legacy-r2b.mjs` rode along in `ac87ad5` and `ff506c9` and were deleted in `e329299`. They hold no credentials (they read `process.env.LEGACY_*`). The helper now stages `workspace/` only.

- **Quantity table, first run under D-78 (19:00):** 325 rows, both engines equal to 1e-9 on
  the 321 comparable rows; the other 4 are self-crossing shapes both engines refuse; 18
  worked answers right; passed.

## Ideas

- Legacy's Snapping hint says Ortho is "horizontal / vertical"; it steps by 45°. Ours says so.

## Click-only checks (most important first)

**F9 Blocks B and C (more)**
1. Click a ×2 in the Multiplier column: "How this multiplier is built" lists the layer and folders; change a folder's figure and the row follows.
2. In the Takeoff panel, ⋮ on an item → "Costs…": legacy's five fields and Notes; the figures show in Estimating.
3. Right-click an Estimating row: Insert row above/below (a manual line, also in the Takeoff panel), Add Sub-item, Add comment…, Go To Page.
4. Columns → Add custom column…: a free-text column; type into it, rename it with the pencil, remove it with the bin (legacy's warning).
5. Group by Subcontractor → "Manage subcontractors…": This project repackages a scope for this project only; the ↺ puts back the workspace default.
6. Export → "Export to Excel": open the file in Excel; change a rate cell and the row, its parent and TOTAL recalculate.
7. Right-click a row → Add cost component → Labor: a crew, a production rate, the total as you type; the row's labour becomes read-only; "Expand components" lists it under the row.
8. Two browsers, two people: one types a rate while the other changes the quantity; both rows end on the same Item Cost.
9. Format → Customise as My formatting → change the font, a header colour, zebra: the grid follows at once and after a reload; Export carries the same look.
10. Shared equipment → a machine over a division: usage per item ("8", "2d" or a formula), the total spread to the cent; what is not spread shows as "Unallocated — {machine}" and in TOTAL.
11. Drag a column edge; double-click it to fit; right-click the header for Freeze / Unfreeze Header.
12. Double-click a sub-item's Unit in Estimating, change it: the warning, then "Unit rates cleared" and the rate cells blink until retyped.
13. Format → My formatting → a Column headers fill: the TOTAL row takes it too; the grid shows a thin blank above each parent block and above a header that follows rows.
14. Takeoff → ⋮ on a parent → Create sub-item: each saved sub-item has a $ button opening its Costs.
15. In Estimating, change a rate, then Ctrl+Z and Ctrl+Y; pressing L or Delete there does nothing to the takeoff.
16. Right-click an Estimating row → Go To Page: the Takeoff tab opens on that sheet with the item selected and Select armed.
17. Export with formulas, open in Excel: a sub-item's Qty cell is a formula (a derived volume reads like 165.95*2*4/27); change a number in it and the row, its parent and TOTAL follow.
18. With the header frozen, scroll a long estimate quickly: the header's column lines stay steady, no white flashes.
19. Format → My formatting → Grid & borders: Line weight Medium, a Line color, the three switches; the grid follows at once, and an export carries the weight and colour. Colours → Layer tab colours the open tab.
20. Format → Row heights: change Classification header or Sub-item rows alone; only those rows move. "Group headers" reads "mixed" until you set them all.
21. Shared equipment → a machine with nothing spread: its "Unallocated — {machine}" row sits in its home classification's group (and its subcontractor's), with the group's chip and TOTAL including it; in the Sheet pivot it has its own group at the end.
22. Settings → Collaboration → One at a time; one person resumes a measurement while another types a rate on that item in Estimating: refused with "{name} is editing this item right now.", and it goes through once they finish.
23. Format → What Export carries: read the list, export, and check the file's row heights and quantity decimals follow the panel. Escape closes the panel.

**F9 Block B (pricing)**
1. Click a Unit Man Hours, Per Hour Wage, Unit Material Cost or Subcontract cell, type a figure, press Enter: the row, its group chip and TOTAL follow at once; a second window follows too.
2. Click a Wastage cell: legacy's dialog; LF 10 % to All line items lifts every LF line.
3. Type Unit Equipment, then the Total Equipment lump: the other clears.

**F9 Block A (Estimating tab)**
1. In a takeoff, click the "Estimating" tab: "Estimating / Synced live from Takeoff.", the slate header, a "Base Bid" tab, one row per item with Item No. 1..N, the TOTAL row. Compare with legacy's tab side by side.
2. Group by each choice; "All layers in one tab" adds the Layer column and the layer as the outer group.
3. File one sub-item under a classification: its parent follows it there in bold.
4. Click "Labor": the FILTERED banner, the other cost columns hide.

**Task 4 (sign-in, sign-up, Settings)**
1. Sign out and open the sign-in page: the orange IC tile and "Intelcost" top left, "Welcome back" in the card, "Forgot password?" beside Password. Sign up reads "Start your free trial" with Job title second.
2. Open Settings: "← Dashboard" top right, "Workspace settings", the "Editing workspace" buttons, and pill tabs; People & Access shows Members, Roles & Permissions, Ownership, Collaboration, Activity in a second row.
3. General: Logo, Workspace name, Company info, "Save settings" bottom right; saving says "Settings saved".
4. Members: "Members & Roles", the members, then "Invite someone" with Takeoff chosen.

**F7-S31**
1. With Select, drag a box over empty paper: a menu with "Crop as New Page". Choose it: "Cropped page added", the new sheet "{name} (Crop)" opens at the end of the folder, uncalibrated, with the drawing crisp.

**F7-S25 to S30**
1. Rest the pointer on an area for a second: a cream panel with "This section", the sheet total and "Marked by"; move and it goes. The area turns blue at once.
2. Over the canvas the pointer is legacy's reticle (square ring, ticks, crosshair); with Pan it is the hand.
3. Press L, A, N: each opens its naming dialog. With Linear armed, S and O flip Snap and Ortho in the bar.
4. Two browsers, two people on one sheet: each sees the other's pointer with their name, and a box grow as a box while it is dragged.

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

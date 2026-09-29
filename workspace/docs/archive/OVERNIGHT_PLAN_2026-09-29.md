# Overnight plan, 2026-09-28 to 2026-09-29

_The founder's instructions, saved verbatim below (received 2026-09-28 about 19:10 CDT; away
15 hours; **the founder moved the end to 2026-09-29 05:30 CDT**, 3:30 PM Pakistan time). Previous plans are in
[docs/archive/](../archive/). Progress: [OVERNIGHT_REPORT_2026-09-29.md](OVERNIGHT_REPORT_2026-09-29.md)._

**After any compaction:** re-read CLAUDE.md, this file, OVERNIGHT_REPORT.md and
docs/legacy_comparison.md, then continue from the report's checklist.

## Round 2 first (the founder's click-check findings, round 2)

Same method as before for every item: read legacy's source and the relevant
intelcost/.lovable/plan/*.md files (latest wins), drive live legacy, then fix. Match
legacy; put better options under "Ideas".

FIRST: correct CLAUDE.md so the shared quantity table (./quantity-table.sh) is explicitly
NOT covered by the no-scripted-tests rule; it runs after every group with the gates. Run it
now and report.

A. CANVAS BEHAVIOUR
1. Zoom: re-check legacy. Zoom should be centred on the cursor, and when zoomed in legacy
   shows NO scrollbars at right or bottom. Match both.
2. With Area or Linear armed: a LEFT-button press and drag draws a rectangle in one gesture
   (legacy's box-drag, about 5 px threshold, not in Arc mode); a RIGHT-button drag pans; a
   right-click without dragging opens the draw menu. Drive legacy to confirm each of the
   three and match exactly.
3. Selection: clicking empty canvas and pressing Escape: does each deselect in legacy?
   Match.
4. A measurement in progress (continuing a run): what do Enter and Escape do in legacy?
   Match.
5. Area merge: when a new area overlaps one area of the SAME item and one of a DIFFERENT
   item, check what legacy merges and what it leaves. Match.
6. Ortho: add a tolerance setting in takeoff Settings (Snapping), default 15 degrees; within
   it Ortho snaps, outside it the point is free.

B. TOOLBAR AND ACTION GROUP
7. Linear, Segment, Area and Count icons in the toolbar do not match legacy's. Match them
   exactly (icon, size, label, dropdown arrow).
8. The action group's "Start" shows a plain green circle; use legacy's icon. Check every
   action group icon and label against legacy.
9. Action group behaviour: how it changes when an item is selected, when a new tool is
   armed, mid-draw, and after commit. Match legacy in each state.
10. The bottom-left canvas buttons are still missing. Build legacy's.
11. The Dashboard button in takeoff: is it built? If not, build it where legacy shows it.

C. PANELS
12. The ⋮ More options menu on item rows does not match legacy, and it sits at the far
    right; match legacy's position and contents.
13. Remove "Edit vertices" and the Resume entries from the row ⋮ menu.
14. Remove the Takeoff panel totals footer (legacy has none).
15. Bookmarks: store when bookmarked, sort newest first, as legacy.

D. SETTINGS
16. Takeoff settings must be separate from workspace settings, as in legacy (the takeoff
    Settings dialog with General, Hover, Mouse, Cursor, Snapping, Takeoffs, Toolbar,
    Panels, Rendering). Build or match it.

E. WHOLE-PAGE COMPARISON
17. With the takeoff screen open, compare the ENTIRE page with legacy: the top bars and
    menus (takeoff tabs and every bar above the canvas), the toolbar, both panels, canvas
    corners, footers. Screenshot both at 1440x900 and list every difference, then fix them.

After each group: gates, quantity table, a throwaway smoke check, commit and push. (The
"stop after group E" of round 2 is superseded below.)

## The overnight instructions

**End time changed (the founder, 2026-09-28 about 19:20 CDT):** stop by 2026-09-29 05:30 CDT
(3:30 PM Pakistan time), not 10:10 CDT. Same task order; when the time is up, finish the
current block cleanly (commit, push, mirror), complete the morning report and end.

Change of plan: I will be away 15 hours, counted from this message. Do NOT stop after group
E. Finish round 2 (groups A to E) as instructed, then continue in the same turn with the
tasks below.

HARD RULES
- Never stop to report, never ask me anything, never wait for me. Where you would normally
  ask, choose legacy's behaviour, log a D-NN marked "decided overnight, pending founder
  review", and continue.
- After 3 failed attempts on one item, record the evidence and move on.
- Only end your turn when about 15 hours have passed since this message, or every task
  below including KEEP GOING is done, or something blocks ALL remaining tasks.
- Save these instructions to docs/tasks/OVERNIGHT_PLAN.md (replace the old one), start a
  new docs/tasks/OVERNIGHT_REPORT.md (archive the old one to docs/archive/ with its date)
  with a progress checklist at the top, updated after every task. After any compaction,
  re-read CLAUDE.md, OVERNIGHT_PLAN.md, OVERNIGHT_REPORT.md and docs/legacy_comparison.md,
  then continue from the checklist.

METHOD for every change: read legacy's source and the relevant
intelcost/.lovable/plan/*.md files (latest wins), drive live legacy with the bench's
Playwright container (credentials in intelcost-infra/.env.legacy; never print or commit
them), then match legacy. Better options go under "Ideas" in the report; build legacy's.

TESTING (speed mode): after each group or block run the gates, the shared quantity table
(./quantity-table.sh, always), and a throwaway Playwright smoke check. Fix failures before
moving on. No fixture files. Delete throwaway scripts and screenshots. Update
SINCE_ARCHIVE.md. Commit and push to umer-dev with the mirror after each group or block.

TASKS after round 2:
2. The rest of F7 in the spec's order (hover, mouse and reticle, keys and the settings F7
   owns, colleagues' cursors, drafts for every tool, the two-window check, Crop as New
   Page), each compared with legacy first.
3. Close F7 in speed mode: report, PARITY, board, mirror, dated backup; mark "built,
   awaiting founder click check"; do not archive the spec.
4. Legacy comparison of these built screens only: every Settings tab, and sign-in and
   sign-up, at 1440x900. List every difference and fix behaviour, layout, wording and
   icons. Do not compare the dashboard, New project, or Project Home and its files.
5. F9 estimating Block A (foundations), from docs/tasks/drafts/estimating_tasks.DRAFT.md:
   adopt the draft as docs/tasks/estimating_tasks.md, answer each of its open questions in
   legacy's favour as a D-NN decided overnight, compare legacy's Estimating tab first, then
   build.

KEEP GOING (until 15 hours or done):
6. F9 Block B onwards, one block at a time, same method.

MORNING REPORT (docs/tasks/OVERNIGHT_REPORT.md): tasks with status, start, end and
duration; commits; every overnight decision to review (list the F9 answers separately,
since I will want to check them); legacy differences fixed and left (with reasons); failures
and findings; Ideas; and short click-only checks grouped by task, most important first.

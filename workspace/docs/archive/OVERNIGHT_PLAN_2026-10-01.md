# Overnight plan (2026-09-30 to 2026-10-01, the founder's words, verbatim)

Change of plan: I am going to sleep. Work autonomously until 11:00 UTC
(06:00 CDT, 4:00 PM Pakistan time) on the next such time from now. Do
not stop after Block G; carry on through the tasks below. Skip anything
already done.

HARD RULES
- Never stop to report, never ask me anything, never wait for me. For
  build items, where you would normally ask, choose legacy's behaviour
  and log a D-NN marked "decided overnight, pending founder review".
  For SPEC-ONLY items, never decide open questions yourself: list them
  for me.
- Keep working until 11:00 UTC. If the tasks are finished earlier, work
  on the FALLBACK until 11:00 UTC. End earlier only if something blocks
  ALL remaining work.
- At 10:45 UTC stop starting new work: commit, push to umer-dev, refresh
  the mirror, finish the report, then end.
- After 3 failed attempts on one item, record the evidence and move on.
- Save these instructions verbatim to docs/tasks/OVERNIGHT_PLAN.md
  (replace the old one) and start a new docs/tasks/OVERNIGHT_REPORT.md
  (archive the old one to docs/archive/ with its date) with a progress
  checklist at the top, updated after every task. After any compaction,
  re-read CLAUDE.md, OVERNIGHT_PLAN.md, OVERNIGHT_REPORT.md and
  docs/legacy_comparison.md, then continue from the checklist.
- Never touch main. Never force-push. Never run docker compose down -v.
- Clean up ONLY rows your own checks created; never delete other
  sessions' data or history.

TEST PROJECT: "Hidden Valley Spec" in "F5 Block A demo 15:16", as
estimator@bench.intelcost.io. Remove throwaway markups after each check;
touch no other project.

METHOD: legacy source on UmeralamDEV, its plan files, drive live legacy
(credentials in intelcost-infra/.env.legacy; never print or commit
them), then match legacy. Better options go under "Ideas".

TESTING (speed mode): after each item or block run the gates, the
quantity table (./quantity-table.sh, always), and a throwaway Playwright
smoke check. Fix failures before moving on. No fixture files. Commit and
push per item or block.

TASKS, in order:
1. F12 Block F (estimate lines) and Block G (Auto Trace), with the CSI
   decision (two new nodes under 31.04, "Import Borrow" and
   "Export / Disposal"; haul-off lines to Export / Disposal) and legacy's
   hand-worked cases in the quantity table.
2. Auto Trace on the real sheet: in Hidden Valley Spec, open
   "C-200 – Site Grade Plan" (scaled 1" = 30'), run Auto Trace for EG and
   FG contours, compare with live legacy on the same kind of sheet, and
   fix what differs. Then Calculate cut and fill on C-200 and record the
   numbers. Remove what you created afterwards.
3. Close F12 in speed mode: report, PARITY, board, mirror, dated backup;
   mark "built, awaiting founder click check"; do not archive the spec.
4. Snap PDF (vector snapping to the drawing's own lines, the D toggle
   mid-draw), as legacy.
5. SPEC ONLY: F13 Auto Count. Write docs/tasks/drafts/auto_count_tasks
   .DRAFT.md from legacy on UmeralamDEV and its plan files (every mode,
   panel control, scoring option, review flow and warning; PARITY §17)
   and drive legacy's Auto Count. List every open question for me with
   legacy's behaviour and your recommendation. Build nothing.
6. From F15, as legacy: Reports (time, takeoff progress, AI usage as far
   as data exists), and Time Tracking and Shifts in Settings plus the
   members' Shift column.

KEEP GOING:
7. SPEC ONLY: F14 AI tools (name and scale from region, Ask AI, Extract
   Schedule, OCR title block, AI credits) and Community, each as a draft
   in docs/tasks/drafts/ with open questions for me. Build nothing.

FALLBACK (only if everything above is done before 11:00 UTC): drive the
takeoff, estimating and earthwork screens side by side with live legacy
at 2048x1050 and 1440x900, list every remaining difference, and fix them
one by one, most visible first, until 11:00 UTC.

MORNING REPORT (docs/tasks/OVERNIGHT_REPORT.md): tasks with status,
start, end and duration; the final CSI table; C-200 cut/fill numbers;
commits; decisions to review; the Auto Count, AI tools and Community
questions; legacy differences fixed and left; failures and findings;
Ideas; and short click-only checks, most important first.

## Addition (received 2026-09-30 23:58 UTC, the founder's words, verbatim)

Addition to tonight's plan, for tasks 1 and 2 (Auto Trace and C-200).
Do not stop; fit it in and continue.

C-200 – Site Grade Plan (Hidden Valley Spec, scaled 1" = 30') reading:
- Dashed contours are EXISTING grade (EG); solid contours with elevation
  labels in small boxes (e.g. 702, 703) are PROPOSED grade (FG). Spot
  elevations like 704.00 (F/F elev. = 704.00) and 703.95 are FG spots.
- The engineer's own table on the sheet is the benchmark: unadjusted
  excavation 14,263 CY, embankment 8,727 CY; shrink 1.10, swell 1.15;
  adjusted 16,402 CY and 9,599 CY; net 6,803 CY export; stripped topsoil
  not included. Compare our Calculate on C-200 with these numbers,
  explain any difference, and check that our shrink and swell method can
  reproduce the engineer's adjusted figures (excavation x swell,
  embankment x shrink). Report the comparison.

Auto Trace must be better than legacy. Legacy traced the lines but
produced overlapping points that caused problems (self-overlaps,
duplicate or back-tracking vertices, crossing segments). Before building
Block G, research how others do this well (search the web: contour
extraction from vector PDFs, dash-pattern classification, polyline
stitching across label gaps, snapping and de-duplication, Douglas-Peucker
simplification, removing self-intersections, assigning elevations from
nearby label text), then build the improved version:
- classify EG vs FG by dash pattern, as on C-200;
- stitch contours across the gaps where labels break them;
- no duplicate, overlapping or back-tracking vertices, and no
  self-intersecting contours; closed contours stay closed;
- assign each contour's elevation from its label text where the PDF has
  it, and flag contours it cannot label instead of guessing;
- crossings between EG and FG are expected; crossings within one
  surface are errors to fix or flag.
Measure on C-200 against live legacy: contours found per surface,
vertices, overlaps and self-intersections, gaps left, contours with an
elevation, and time. Ours must beat legacy on overlaps and gaps without
losing contours. Record the research sources and choices as a D-NN.
Remove what you create on C-200 afterwards.

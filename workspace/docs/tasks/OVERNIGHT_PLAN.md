# Overnight plan (2026-10-01 to 2026-10-02, the founder's words, verbatim)

I am going to sleep. Work autonomously until 11:30 UTC (4:30 PM Pakistan
time) on the next such time from now. Start now.

READ FIRST: CLAUDE.md, MANAGER.md, FEATURES.md, DECISIONS.md (latest
most relevant, through D-187), docs/PARITY.md, docs/legacy_comparison.md,
docs/tasks/SINCE_ARCHIVE.md, docs/tasks/OVERNIGHT_REPORT.md (the last
run), docs/tasks/earthwork_tasks.md or its draft,
docs/tasks/drafts/eg_from_survey_tasks.DRAFT.md and
docs/tasks/drafts/auto_count_tasks.DRAFT.md.
Where things stand: F2 to F12 are built (F12 earthwork awaiting my click
check); snap, Backspace-as-undo, mid-draw Ctrl+Z, whole-shape snap,
Earthwork's own toggles and Ortho on contours are done and checked (D-182
to D-187); Community is decided global (D-180), its other questions wait
for me; AI tools' questions wait for me.

HARD RULES
- Never stop to report, never ask me anything, never wait for me. For
  build items, where you would normally ask, choose legacy's behaviour
  and log a D-NN marked "decided overnight, pending founder review".
  For SPEC-ONLY items, never decide open questions yourself: list them.
- Keep working until 11:30 UTC. If the tasks are finished earlier, work
  on the FALLBACK until 11:30 UTC. End earlier only if something blocks
  ALL remaining work.
- At 11:15 UTC stop starting new work: commit, push to umer-dev, refresh
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

0. TEST PROJECT CLASSIFICATION. Hidden Valley Spec's classification
   system became CSI during an earlier earthwork check, and its earlier
   value is unknown. Look for the earlier value in the audit log,
   history, or database (read-only first). If found, restore it and
   report what it was; if not found, leave it as CSI and report that.

1. AUTO COUNT ANSWERS (docs only). Log as the next D-NN and adopt
   docs/tasks/drafts/auto_count_tasks.DRAFT.md as
   docs/tasks/auto_count_tasks.md with them written in; rewrite PARITY
   §17 against the code as the draft lists. Accept the recommendation
   for Q1 to Q5 and Q7 to Q27, with these notes:
   - Q6 CHANGED: Vector mode searches rotations in v1, at least 0, 90,
     180 and 270 degrees, plus mirror (symbols rotate with the wall they
     sit on; a receptacle on a vertical wall is turned 90 degrees).
     Image mode's "8" searches all 8 angles.
   - Q2: Vector first (Blocks A to D and F), Image as Block E right
     after, with a speed target measured on real scans.
   - Q11: keep the saturation block, with a message telling the user to
     select the symbol more tightly.
   - Q12: the control reads "Overlap allowed" (higher keeps more), and
     the Layers re-filter uses the setting.
   - Q13: Create honours every dialog field.
   - Q17: one undo removes exactly the batch's marks; a new item goes
     with them; manual marks added since stay.
   - Q18: yes, "Add to the selected count item" when one is selected.
   - Q27: out of F13; the reference editor and multiple references go
     under Ideas.

2. EG FROM ANOTHER SHEET, link approach.
   a) If not already logged, log these founder decisions and adopt
      docs/tasks/drafts/eg_from_survey_tasks.DRAFT.md as
      docs/tasks/eg_from_survey_tasks.md with them written in: Q1 A,
      read through the link. Q2 label transfer later. Q3 allow "fit the
      scale too" with a warning on every result. Q4 warn at 0.5%, require
      the fitted-scale choice at 2%. Q5 the datum offset field, proposed
      by the tie-in check. Q6 merge both sheets' EG into one TIN, with
      chips naming the sheet on crossings. Q7 several source sheets per
      grading sheet in v1. Q8 show the match score, warn under 30%. Q9
      anyone who may edit earthwork. Q10 Overlay will share these
      registrations. Q11 entry on both the Earthwork row and the sheet's
      ⋮ menu. Q12 acceptance check on C-200 against the engineer's
      14,263 cut and 8,727 fill, tolerance ±5% each. Q13 do not migrate
      legacy's sheet_overlays.
   b) Behaviour: the link covers the source sheet's whole existing grade
      (EG added, edited or deleted later is included automatically);
      any such change, a change to the control points, or a
      recalibration marks the grading sheet stale; recalculation stays
      manual; the grading sheet's own EG is merged in; the Takeoff panel
      shows the EG item only on its own sheet, and the grading sheet's
      earthwork section shows "Existing grade: linked from {sheet}"; no
      copied items.
   c) Build Blocks A and B (not C): the engine (register.ts and its
      Python twin), the sheet_registration table with several sources
      per grading sheet, routes, event, version key, the spec's
      quantity-table rows; the dialog with Split-view point picking
      (Snap PDF on), distance check, residuals, rotation read-out, datum
      offset with the tie-in proposal, ghost contours, match score and
      warning, fitted-scale choice; Calculate through the link; stale
      across sheets; both entry points.
   d) Acceptance check: register page 3 to C-200, trace and adopt EG on
      page 3 and FG on C-200, draw C-200's boundary, Calculate, and
      compare our cut, fill and export with the engineer's 14,263 cut
      and 8,727 fill (±5% each). Add it as a quantity-table row and
      explain any difference. Keep the registration and traced contours
      on page 3 and C-200 for my check; remove anything else you create.

3. SPEC ONLY, build nothing: SITE STITCHING. Write
   docs/tasks/drafts/site_stitching_tasks.DRAFT.md with this founder
   design written in as decided:
   - The user draws the match line on one sheet, then the same match
     line on the other sheet; the second sheet joins onto the first,
     aligned by the two lines (their ends give position and rotation;
     each sheet's calibration gives scale).
   - ONE CONTINUOUS DRAWING: the joined sheets show as one seamless
     canvas to pan and zoom across.
   - Each joined sheet is the ACTUAL sheet, not an overlay picture: its
     own PDF page drawn live by pdf.js, placed and clipped, with its
     real vector lines and text, so Auto Trace, Snap PDF, Find Text and
     measuring work on every joined sheet's side.
   - Everything beyond each sheet's match line is hidden, so the
     overlap is never shown or counted twice.
   - One boundary and contours across the joined sheets; one Calculate
     gives one cut, fill and one site balance (import or export once for
     the whole site).
   - Auto Trace on the stitched drawing traces each sheet's visible
     part, joins contours that meet at the match line when elevations
     agree, and flags unpartnered or mismatched contours.
   - It reuses the registration engine from task 2.
   - Acceptance test: crop C-200 into overlapping west and east halves
     (Crop as New Page), draw the match line on both, stitch, trace and
     Calculate; cut, fill and export must equal C-200 as one sheet.
   Include data and api, the engine, fast rendering with several large
   sheets, editing across the join, interaction with the survey link,
   quantity-table rows, and every remaining question for me with your
   recommendation.

4. BUILD AUTO COUNT (F13) from docs/tasks/auto_count_tasks.md, block by
   block: A (entry and panel shell), B (vector matcher with rotations 0,
   90, 180, 270 and mirror, layers, provenance), C (review), D (Create,
   one undo, append to the selected count item), F (settings and
   persistence), then E (image matcher in workers, all 8 angles,
   measured time per page). Add quantity-table rows for the vector score
   on synthetic symbols, including the same symbol rotated 90, 180 and
   270 degrees and mirrored, each found. Test on Hidden Valley Spec's
   electrical sheets where repeated symbols exist.

KEEP GOING (in order, only after task 4):
5. OVERLAY, as legacy (Overlay dialog, transparency and compare
   colours, two-point alignment, nudge, rotate and scale keys), built on
   the sheet_registration table from task 2 (Q10: one alignment serves
   both the survey link and Overlay). Overlay stays a picture: it does
   not feed calculations.
6. CACHE AUTO TRACE RESULTS in IndexedDB, keyed by the sheet's document
   and the trace settings, so reopening a sheet skips the 1 to 2 s read;
   invalidate when the document or settings change. Report before/after
   times on C-200.
7. DEFAULT DIALOG WIDTH: match legacy's 448 px default app-wide (ours is
   512 px); check every dialog still fits its content and the short
   window (1280x650) and phone checks still pass.

FALLBACK (only if everything above is done before 11:30 UTC): drive the
takeoff, estimating and earthwork screens side by side with live legacy
at 2048x1050 and 1440x900, list every remaining difference, and fix them
one by one, most visible first, until 11:30 UTC.

MORNING REPORT (docs/tasks/OVERNIGHT_REPORT.md): tasks with status,
start, end and duration; the classification finding; the C-200
acceptance numbers; Auto Count's time per page and how many rotated
symbols it found; commits; decisions to review; the stitching spec's
questions; legacy differences fixed and left; failures and findings;
Ideas; and short click-only checks, most important first.

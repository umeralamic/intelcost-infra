# Overnight plan, 2026-09-27

_The founder's plan, saved verbatim, then the adjustments from the review in
[OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md) and the founder's later instruction. After
any compaction, re-read `CLAUDE.md`, this file and `OVERNIGHT_REPORT.md` before
continuing. Last night's plan and report are in
[docs/archive/](../archive/OVERNIGHT_PLAN_2026-09-26.md)._

---

## The plan, verbatim

Queue this: start only after the bench speed-up work is finished,
committed and pushed.

First review this overnight plan: (1) your time estimate per task using
the new bench speed, (2) the actual F5 block list from the spec and
whether it fits, (3) risks, dependencies and ordering problems, (4)
anything that cannot be verified without me (for example IDM) and how you
will handle it, (5) anything missing. Write the review at the top of
docs/tasks/OVERNIGHT_REPORT.md. Then, unless something truly blocks the
whole plan, adjust the plan, save it verbatim to
docs/tasks/OVERNIGHT_PLAN.md (replace the old one) and run it without
waiting for me. I will be away about 14 hours.

Keep a progress checklist at the top of OVERNIGHT_REPORT.md, below the
review, updated after every task. After any compaction, re-read
CLAUDE.md, OVERNIGHT_PLAN.md and OVERNIGHT_REPORT.md before continuing.

TASKS, in order:
1. F5 Block C: pdf.js on the canvas per D-14, D-35, D-41, D-42, D-43 and
   D-45. Sheets draw sharp from 50% to 4000%, fit image first then pdf.js
   on top, two-stage re-raster. Target: a loaded sheet's first sharp
   paint close to legacy's ~4 s (it is ~12 s today). Keep D-42's fetch
   shape (bytes into getDocument({data}), vnd.intelcost.sheet, no .pdf,
   no Content-Disposition, no Range) so IDM never reacts.
2. The remaining F5 blocks in the spec's order (sheets panel, calibration
   and scale, and everything else F5 owns), including the two-window live
   check, channel 1 events and rendering colleagues' live drawing.
3. Close F5 per CLAUDE.md: full regression, report, PARITY, board,
   mirror, dated backup. Mark it "built, awaiting founder click check";
   do not archive the spec.
4. F6 Block A (item model foundations) per docs/tasks/item_model_tasks.md
   and D-36.
5. If time remains: draft docs/tasks/drafts/estimating_tasks.DRAFT.md (F9,
   spec only, questions at the end), then the proof backlog (drive PARITY
   lines marked ported but not driven; tick passes; record failures, no
   behaviour change).
6. Morning report.

RULES
- After each block: gates, the quick test tier, then commit and push to
  umer-dev with the mirror. Full tier at F5 close.
- Where you would normally ask me, choose the option most faithful to the
  legacy app and my logged decisions, log it as the next D-NN marked
  "decided overnight, pending founder review", and continue.
- If something fails 3 times, stop that item, write down what you tried
  and the evidence, and move on. Do not loop. If a block's failure blocks
  the next block, skip ahead to task 5.
- A failure that only happens in parallel is never a flake: find what it
  shares or races with and fix the cause.
- Never touch main. Never force-push. Never run docker compose down -v or
  delete bench volumes. Never touch estimator@bench.intelcost.io's data
  or my projects "Umer plans test" and the JHS sets.
- Keep every fixture's full log. Delete screenshots when done.

MORNING REPORT (docs/tasks/OVERNIGHT_REPORT.md): the review, then a table
of tasks with status, start, end and duration; commits; every overnight
decision to review; failures and findings; click-only checks for me,
grouped by feature, with IDM-on checks marked; and any questions.

NEXT BATCH (if everything above is done before I return):
Start a second batch of about 4 hours, same rules, and stop at a clean
block boundary when the 4 hours are up.
7. F6 Block B onwards, in the spec's order, one block at a time (quick
   tier, commit and push after each).
8. If F6 is blocked or finished: F7 Block A only (the engine ported as
   data in, data out, the shape roles and transaction, the api's
   analytic quantities with the shared table, capabilities on the
   canvas), per docs/tasks/canvas_tools_tasks.md and D-39.
Add the batch to the progress checklist and the morning report, with its
own click-only checks.

---

## Adjustments

**The founder's later instruction (2026-09-27, morning), which takes precedence:** the
plan starts after the bench work, the f8-s13 fix and the parallel measurement are
committed and pushed, and it **stops after F5 Block C**, with click-only checks (IDM-on
checks marked). Tasks 2 to 8 are not run this session.

**From the review** (OVERNIGHT_REPORT.md, "Review"):
1. **Block C is S10, S11 and S12.** S12's AC2 ("before preparation, the same page opens
   from the whole file by range requests") contradicts D-41: the browser never reads a
   plan set. It is replaced by D-41's behaviour (an unprepared page shows "Preparing the
   sheet" over nothing, then draws itself when the worker is done), logged as the next
   D-NN, decided overnight.
2. **S12's AC3 ("one call signs every sheet")** is kept, shaped by D-42. Today the app
   signs one sheet at a time (`GET …/drawing/sheet/{uuid}/asset`). It gains one call that
   signs every sheet of the project (fit image, thumbnail and the `…/pages/{file}/{page}`
   source), cached until shortly before expiry. The app still fetches the source's bytes
   and never hands a URL to pdf.js.
3. **The ~4 s target is measured on the founder's JHS set's copy and on Riverside**, from
   "Load 1 page" to the first pdf.js paint, three runs each, and on a cold open of an
   already prepared sheet.
4. **Order inside Block C:** S11's zoom module first (every clamp reads it), then S10's
   renderer and caches on it, then S11's tiers and re-raster, then S12.
</content>
</invoke>

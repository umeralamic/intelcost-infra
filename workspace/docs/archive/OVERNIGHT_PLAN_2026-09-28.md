# Overnight plan, 2026-09-27 to 2026-09-28

_The founder's plan, saved verbatim. Started 2026-09-27 16:33 CDT. After any compaction,
re-read `CLAUDE.md`, this file and [OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md), then
continue from the report's checklist._

---

I will be away 16 hours. Work autonomously the whole time. Start now.

HARD RULES FOR THIS RUN (the last overnight run wasted the whole night by
stopping early; do not repeat it):
- Never stop to report, never ask me anything, never wait for me. There
  is no "STOP" anywhere in this plan. Where you would normally ask, choose
  the option most faithful to the legacy app and my logged decisions, log
  it as the next D-NN marked "decided overnight, pending founder review",
  and continue.
- Only end your turn when (a) about 16 hours have passed, or (b) every
  task below, including the whole KEEP GOING list, is done, or (c)
  something blocks ALL remaining tasks. A single failure never blocks
  everything: after 3 failed attempts on an item, write down what you
  tried and the evidence, and move to the next task.
- Before starting, save this prompt verbatim to
  docs/tasks/OVERNIGHT_PLAN.md (replace the old one) and start a new
  docs/tasks/OVERNIGHT_REPORT.md (archive the old one to docs/archive/
  with its date). Keep a progress checklist at the top of the report,
  updated after every task. After any compaction, re-read CLAUDE.md,
  OVERNIGHT_PLAN.md and OVERNIGHT_REPORT.md, then continue from the
  checklist.

READ FIRST: CLAUDE.md, MANAGER.md, FEATURES.md, DECISIONS.md (all D-NN,
latest most relevant), docs/PARITY.md, docs/tasks/takeoff_shell_tasks.md
(F5: built, Block F founder-checked PASS), docs/tasks/item_model_tasks.md
(F6), docs/tasks/canvas_tools_tasks.md (F7). The bench runs per the infra
README (regress.sh, 3 at a time, quick and full tiers, timing fixtures
serial, prod profile on 5175; fixtures use their own throwaway accounts).

TASKS, in order:
0. Block F checked by the founder: PASS, no issues. Archive F5 per
   CLAUDE.md.
1. Rotate pages (P-20a, stored rotation) per its board row.
2. F6, all blocks in the spec's order, per D-36 (answers) and the
   findings written into it (layers show/hide, never delete the last
   layer, seed legacy's three default layers, classification, duplicates
   count up). Include the F6 two-window live check.
3. Close F6 per CLAUDE.md: full tier, report, PARITY, board, mirror,
   dated backup. Mark it "built, awaiting founder click check"; do not
   archive the spec.
4. Draft docs/tasks/drafts/estimating_tasks.DRAFT.md (F9, spec only,
   from legacy's estimating tab, questions at the end).
5. F7 Block A per docs/tasks/canvas_tools_tasks.md and D-39.

KEEP GOING (in order, until 16 hours or done):
6. F7 Block B onwards, one block at a time.
7. The proof backlog: drive PARITY lines marked ported but not driven;
   tick passes; record failures as findings, no behaviour change.
8. Draft specs only, in docs/tasks/drafts/: F10 (assemblies, Starter
   Pack, library), then F11 (markup, print, Find Text, Dimension). Spec
   only, questions at the end.

RULES
- After each block: gates, the quick tier plus the block's fixtures,
  then commit and push to umer-dev with the mirror. Full tier at each
  feature close.
- A failure that only happens in parallel is never a flake: find the
  cause. Timing fixtures run serial.
- Never touch main. Never force-push. Never run docker compose down -v or
  delete bench volumes. Never touch estimator@bench.intelcost.io's data
  beyond what fixtures already do, nor my projects "Umer plans test" and
  the JHS sets.
- Never edit the test runner while a run is in progress.
- Keep every fixture's full log. Delete screenshots when done.

MORNING REPORT (docs/tasks/OVERNIGHT_REPORT.md): a table of tasks with
status, start, end and duration; commits; every overnight decision to
review; failures and findings; click-only checks for me grouped by
feature and block, IDM-on checks marked, simple steps; and any
questions.

---

## Addition from the founder, received 2026-09-27 ~17:10 CDT (verbatim)

Addition to tonight's plan. Do not stop; fit these in and continue.

Founder findings (match legacy exactly; read legacy's source for each):
a) Sheets panel: it must list the measurements (items) under each sheet
   row, as legacy does. Fix it as an F5 follow-up before Rotate pages if
   not already past it, otherwise right after the current block.
b) Scale control: it must be legacy's scale button with its dropdown of
   scales, as legacy shows it, not only the chip menu. Same timing as a).
c) Takeoff panel: it must show items from ALL sheets, as legacy does,
   with whatever filter legacy offers for the current sheet. Note it in
   the F6 spec now and build it in F6's item tree.

For each: add or update PARITY lines, add a fixture that proves it,
commit and push with the mirror, and list it in the morning report with
click-only checks. Log any design choice as the next D-NN marked
"decided overnight, pending founder review". Then continue the plan.

_Placed: P-20a had only its spec written when this arrived, so (a) and (b) are built
first, as an F5 follow-up, then P-20a, then F6 with (c) in its item tree (S9)._

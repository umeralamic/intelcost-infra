# Overnight plan (2026-09-30, the founder's words, verbatim)

I am going to sleep. Work autonomously until 11:30 UTC (4:30 PM Pakistan
time) on the next such time from now. Start now.

HARD RULES
- Never stop to report, never ask me anything, never wait for me. Where
  you would normally ask, choose legacy's behaviour and log a D-NN marked
  "decided overnight, pending founder review", then continue.
- Keep working until 11:30 UTC. If the task list is finished earlier,
  continue with the FALLBACK section until 11:30 UTC. End earlier only if
  something blocks ALL remaining work.
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

TEST PROJECT: for every smoke check, measurement and comparison on the
bench, use the project "Hidden Valley Spec" in the workspace "F5 Block A
demo 15:16", signed in as estimator@bench.intelcost.io. You may add,
change and delete markups, sheets and settings in that project for
testing; remove throwaway markups you add when each check is done, and
keep its original sheets and measurements intact. Do not touch any other
project in that workspace, including "Umer plans test" and the JHS sets.

METHOD for every change: legacy source on UmeralamDEV, its plan files,
drive live legacy (credentials in intelcost-infra/.env.legacy; never
print or commit them), then match legacy. Better options go under
"Ideas"; build legacy's behaviour.

TESTING (speed mode): after each item or block run the gates, the
quantity table (./quantity-table.sh, always), and a throwaway Playwright
smoke check on the test project. Fix failures before moving on. No
fixture files. Delete throwaway scripts and screenshots. Update
SINCE_ARCHIVE.md. Commit and push per item or block.

TASKS, in order:
1. ZOOM, from your diagnosis:
   a) Item 3: after a zoom or pan settles, snap the whole stage (sheet
      and markups together) so the page starts on a whole device pixel.
      Measure text sharpness at 25%, 29%, 35%, 50% and 100% at DPR 1.25,
      before and after.
   b) Item 1: clip the raster to the page box so it never overhangs the
      paper's right or bottom edge.
   c) Item 2: supersample by drawing density (below about 1 device pixel
      per PDF point), so Fit reads light when Fit is far out. Guard: it
      must not make text at 29% softer than after (a); measure both. If
      it would, keep (a)'s crisp drawing at that zoom and log the
      trade-off.
2. SPLIT VIEW, as legacy: the second read-only canvas with its own sheet
   picker.
3. PUBLIC SHARE LINKS, as legacy: the link in the Share dialog, the api
   for share links, and the guest view.
4. MARKUP TOOLS AND THE COLLABORATOR TAB, as legacy, one tool at a time,
   from docs/tasks/drafts/markup_print_tasks.DRAFT.md (adopt it, log its
   open questions in legacy's favour): Highlight, Note, Snapshot, Dock,
   cloud, callout, arrow and any other markup legacy has, then the
   Collaborator tab.

KEEP GOING (in order):
5. F10: assemblies, Starter Pack and Library, from
   docs/tasks/drafts/assemblies_tasks.DRAFT.md (adopt it, log its open
   questions in legacy's favour), block by block.
6. The rest of F11: Print, Find Text, Snippets, item history, and any
   other part of the markup spec not built in task 4.

FALLBACK (only if everything above is done before 11:30 UTC): drive the
takeoff and estimating screens side by side with live legacy at 2048x1050
and 1440x900, list every remaining difference, and fix them one by one,
most visible first, until 11:30 UTC.

Do not build F9b (markups, bid total); it waits for my answers.

MORNING REPORT (docs/tasks/OVERNIGHT_REPORT.md): tasks with status,
start, end and duration; before/after numbers for task 1; commits;
decisions to review; legacy differences fixed and left (with reasons);
failures and findings; Ideas; and short click-only checks, most important
first, with the 29% crispness check on my real monitor at the top.

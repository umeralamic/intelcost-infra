# Overnight plan (2026-10-03, the founder's words, verbatim)

I am going to sleep. Work autonomously on the tasks below until they are
all done, then finish the report and stop. Hard limit: stop by 11:30 UTC
(4:30 PM Pakistan time) on the next such time from now, even if not done.

READ FIRST: CLAUDE.md, MANAGER.md, FEATURES.md, DECISIONS.md (latest
most relevant, through D-237), docs/PARITY.md, docs/legacy_comparison.md,
docs/tasks/SINCE_ARCHIVE.md, and the last overnight report in
docs/archive/ for the differences left with reasons.
Where things stand: F2 to F16a and F18 Blocks A and B are built; F19
site stitching waits for another night (do not start it). Hidden Valley
Spec's earthwork is the founder's own test: do not add, change or remove
any of it.

HARD RULES
- Never stop to report, never ask me anything, never wait for me until
  every task is done. Where you would normally ask, choose legacy's
  behaviour and log a D-NN marked "decided overnight, pending founder
  review".
- After 3 failed attempts on one item, record the evidence and move on.
- At 11:15 UTC, if still working, stop starting new work: commit, push,
  refresh the mirror, finish the report, then end.
- Save these instructions verbatim to docs/tasks/OVERNIGHT_PLAN.md
  (replace the old one) and start a new docs/tasks/OVERNIGHT_REPORT.md
  (archive the old one to docs/archive/ with its date) with a progress
  checklist at the top, updated after every task. After any compaction,
  re-read CLAUDE.md, OVERNIGHT_PLAN.md, OVERNIGHT_REPORT.md and
  docs/legacy_comparison.md, then continue from the checklist.
- Never touch main. Never force-push. Never run docker compose down -v.
- Clean up ONLY rows your own checks created. Never click Print in the
  MCP browser.

TEST PROJECT: "Hidden Valley Spec" in "F5 Block A demo 15:16", as
estimator@bench.intelcost.io, outside its earthwork. Remove throwaway
data after each check.

METHOD for every item: legacy source on UmeralamDEV, its plan files,
drive live legacy (credentials in intelcost-infra/.env.legacy; never
print or commit them), list every visible control, label, menu entry,
default and state change, then build to match legacy exactly. Any
improvement beyond legacy you notice goes under "Ideas" in the report,
not built.

TESTING (speed mode): after each item run the gates, the quantity table
(./quantity-table.sh, always), and a throwaway Playwright smoke check.
Fix failures before moving on. No fixture files. Commit and push per
item.

TASKS, in order:
1. SUB-ITEMS EDITOR, exactly as legacy's: its full editor (about 829 px)
   with the Formulas and Costs tabs, the classification column, "Seed
   from…", variables, and the Insert menu with every entry legacy has
   (dimensions, variables, parent quantities, sibling sub-items, and
   anything else). Match its layout, columns, row actions, validation
   messages, live preview, keyboard behaviour and save rules. Replace
   our formula table with it (D-208 left this difference; it is now
   to be closed). Keep the quantity table green: sub-item formulas must
   compute exactly as before.
2. OVERLAY SUB-ROWS in the Sheets panel: overlays listed under their
   base sheet as legacy shows them, with legacy's row actions.
3. NAME FROM PAGE REGION: legacy's in-dialog Draw and Redraw buttons.
4. CUSTOM SNAPSHOT TYPES as workspace rows, as legacy (shared across the
   workspace's projects, managed where legacy manages them), migrating
   any project labels we already store.
5. PHONE-WIDTH TAKEOFF LAYOUT (a founder request, beyond legacy): below a
   tablet width, collapse the Sheets and Takeoff panels so the canvas is
   usable (legacy keeps both panels and squeezes the canvas to about
   60 px at 375 px). Panels open as overlays from their edge tabs. Log
   it as a D-NN beyond legacy. Check at 375x740 and 768x1024 that
   drawing, Calibrate and the panels work.

When all five are done, finish and stop. Do not start anything else.

MORNING REPORT (docs/tasks/OVERNIGHT_REPORT.md): tasks with status,
start, end and duration; commits; decisions to review; legacy
differences fixed and any left with reasons; failures and findings;
Ideas; and short click-only checks, most important first.

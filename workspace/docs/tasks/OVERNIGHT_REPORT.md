# Overnight report, 2026-09-26

_Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 00:04 CDT. This file is the
progress checklist while the night runs, and the morning report when it ends._

## Progress

| # | Task | Status | Started | Finished | Commits |
|---|---|---|---|---|---|
| 0 | Setup: permissions in `.claude/settings.json`, rule 7 hook kept, reading | ✅ Done | 00:04 | 00:15 | (workspace file, mirrored with task 1) |
| 1 | F8 Block D: live drawing channel, Collaboration preferences | ✅ Done | 00:15 | 00:32 | api, app, infra: "F8 Block D" |
| 2 | F8 Block E: F3 and F4 events wired precisely | ✅ Done | 00:33 | 00:53 | api, app, infra: "F8 Block E" |
| 3 | F8 Block F: Caddy note, STATUS, PARITY, full regression, close F8, backup | ✅ Done. Regression 46/46. F8 closed and archived; backup `E:\Intelcost-backup\2026-09-26_0148-f8-closed` | 00:54 | 01:50 | api, app, infra: "F8 close-out" |
| 4 | F5 spec (`takeoff_shell_tasks.md`) | ✅ Done. 19 subtasks in 6 blocks, 9 questions; F5 on the board as Blocked on the answers | 00:58 | 01:52 | infra: "F5 specced" (mirror) |
| 5 | Proof backlog fixtures | ✅ Done. 15 lines driven by `browser/proof-backlog.mjs`: 9 pass and are ticked, 6 are real gaps recorded as findings and their PARITY status corrected. Three fixture faults fixed on the way (a selector, a click below the window, a collapsed list); no app change | 01:53 | 02:02 | infra: "Proof backlog" |
| 6 | P-19: phone width | ✅ Done. `p19` 2/2 at 375×667 and 1440×900 (was: top bar 222 px over, pages 474 px sideways, tab row 57 px over at desktop). Touched fixtures 8/8 | 02:03 | 02:23 | app, infra: "P-19" |
| 7 | P-18: route-level code splitting | ✅ Done. **Main chunk 664.74 → 231.87 kB; the dashboard's first load 664.74 → 454.72 kB (gzip 196 → ~141 kB)**. No behaviour change beyond a brief "Loading" while a page's chunk arrives. Three F2 fixtures read the page a moment too early once pages loaded lazily; their waits fixed (f2-s10, s12, s14), all pass; stale-chunk f2-s13 4/4; bundle drives pass | 02:24 | 02:40 | app, infra: "P-18" |
| 8 | F6 spec | ✅ Done. `item_model_tasks.md`: 16 subtasks in 5 blocks, 9 questions; F6 on the board as Blocked on the answers and on F5 | 01:02 | 02:42 | infra: "F6 specced" (mirror) |
| 9 | `docs/flows.md` | ☐ | | | |
| 10 | Final regression, morning report | ☐ | | | |

## Overnight decisions to review

| D-NN | Call | Why |
|---|---|---|
| D-34 | Today's canvas **draws** colleagues' drafts now (`DraftLayer.tsx`), rather than only carrying the frames as the F8 spec read; F5 lifts the layer | Your B/C check found nothing to see; this makes Block D checkable by clicking. Cursors still F7's |

## Failures and findings

| # | Found in | Finding | State |
|---|---|---|---|
| 2 | Task 5 (proof backlog) | **Count makes a new item per click, and names collide.** Three quick clicks with the Count tool made three items, each one mark, all named "Count 11" (the name is computed from a list the page has not refetched yet). Legacy places marks one by one into one item | Recorded; PARITY §9 Count line corrected to partial. Owner F7 (canvas), or a small fix sooner |
| 3 | Task 5 | **Zoom stops at 800%**, not legacy's 3000%, with a ×1.25 step throughout rather than +0.25 below 2× | PARITY §9 zoom line corrected to partial; F5-S11 carries it |
| 4 | Task 5 | **No deducts exist**, yet §10's "pairing is not quantity" line was marked ported | Corrected to missing; F7 |
| 5 | Task 5 | **Layers:** no show or hide control; the api refuses deleting only the *default* layer, so a project's last layer can be deleted (legacy: "A project must keep at least one layer"); a new project has no layers (legacy seeds three) | §8 layers line corrected to partial; F6-S8 carries it |
| 6 | Task 5 | **No sheets panel in takeoff** (the §7 "current row in blue" line), and **no classification** to file an item under (§8 create line) | Both corrected to partial; F5-S13 and F6-S14 |
| 7 | Task 6 (P-19) | **Dashboard project rows are cramped at 375 px**: the name truncates to "F8-S8 ..." beside the status and action icons. Not the top bar or the tab row, so outside P-19 as written | Recorded for a follow-up; no change made |
| 1 | Task 9 (flows.md) | **D-27's 24-hour sweep of abandoned uploads is not built.** D-27 says "a `ProjectFile` still unfinished after 24 hours is aborted in S3 and removed by the nightly job"; `worker/tasks/maintenance.py` has only the Trash purge, which aborts a purged project's open uploads. Abandoned parts in live projects stay until the bucket's lifecycle rule (Abdullah's) removes them | Recorded, not fixed (no behaviour change overnight). Wants a small task: a nightly `abort_stale_uploads` beside the purge |

## Click-only checks for the founder

_None yet._

## F5 and F6 questions

_Filled in by tasks 4 and 8._

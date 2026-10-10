# Overnight plan, 2026-10-10 (00:01 → 11:30 UTC)

The founder's brief, in order. Each block: gates (lint, typecheck, build; ruff, mypy, alembic
check), quantity table, one Playwright MCP smoke on a throwaway account, commit and push on
`umer-dev` (the workspace mirror in the same commit), then [OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md)
updated. Unfinished work goes to a named stash `overnight-<block>`. The 2026-10-09 run's files
are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-09.md`.

Browser tool: the Playwright MCP connects and drives the app (checked 00:02 UTC).

| # | Block | Plan | Budget |
|---|---|---|---|
| 1 | Settings speed | Measure first/second visit per tab, dev and prod (`app-prod` started), before. One layout route for settings: the frame (header, title, both tab rows) renders once, tabs are child routes, a Suspense placeholder only in the content area. Prefetch the other tabs' chunks at idle on entering settings, and on tab hover. Settings queries fresh for 60 s; mutations invalidate what they change (check each page). Classification `?system=csi`: profile, cache server side, ETag / long client cache, target < 100 ms. Measure after. Report only: the Linux filesystem estimate. | 00:05–03:00 |
| 2 | D-324 follow-ups | Prepare stage on a pool (one page a task, a cap by CPU and memory), the first-ticked sheet prepared and read first, then tree order; 40-sheet wall time before/after on one set. Scale parsing computed: any architectural, engineering, metric scale to a ratio, displayed as printed; metric and engineering test sheets in the smoke. Sizing note for Abdullah. | 03:00–06:00 |
| 3 | P-23 drift | Declare the three indexes in their models as their migrations define them; alembic check clean; P-23 closed. | 06:00–06:30 |
| 4 | Auto Count part 1 | One kept OpenCV worker everywhere, 2-minute release (D-316 updated). Benchmark protocol: prod build, four fixed fixtures with sheet copies, truth table at 70% and 38%, first/next scan, memory; a one-click dev page. Run before and after. | 06:30–10:00 |
| 5 | Competitor names | The standing rule in CLAUDE.md and DECISIONS; list every hit, change nothing. | 10:00–10:30 |
| 6 | P-24 | Only with time left. | 10:30–11:15 |
| — | Final report | Purge throwaway workspaces, list their prefixes empty. | 11:15–11:30 |

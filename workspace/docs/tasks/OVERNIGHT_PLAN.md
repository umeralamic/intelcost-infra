# Overnight plan, 2026-10-11 (00:10 → 11:30 UTC)

The founder's brief, in order. Each block: gates (format, lint, typecheck, build; ruff, mypy,
alembic check), quantity table, one Playwright MCP smoke on a throwaway account, commit and push on
`umer-dev` (the workspace mirror in the same session), then [OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md)
updated with the hashes. Unfinished work goes to a named stash `overnight-<block>`. The 2026-10-10
run's files are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-10.md`.

Browser tool: the Playwright MCP connects and drives the app (checked 00:13 UTC). On arrival the
worker, page pool and beat had exited (the file watcher hit "Cannot allocate memory"); restarted.
Mail guard on (`MAIL_GUARD=true`, allowlist the founder only). Founder projects read only.

| # | Block | Plan | Budget |
|---|---|---|---|
| 1a | Competitor names | Reword every D-328 hit to describe the behaviour (code and CSS comments, docs, DESIGN/STATUS/PARITY, drafts, DECISIONS, the archived report line), meaning kept; CLAUDE.md's opening line; delete the competitor screenshot in `docs/tasks/`; no history rewrite; re-scan to zero outside history and legacy. | 00:15–01:00 |
| 1b | Wage Calculator warm-up | Time first visit after an api restart; load the crafts reference data at api start; time again. | 00:15–01:00 |
| 2 | Auto Count accuracy | Benchmark before (prod build). Per missed truth point: where, which stage dropped it, score vs cut, why (instrumented copy of the pipeline on the saved fixtures). Fix only what that supports; contract: no new wrong at 70 %/38 %, right never down, times and memory reported. `?opencv=2`. Benchmark after. | 01:00–05:30 |
| 3 | Orphans in "U.'s workspace" | Report only: key, size, created, area/feature, why unreferenced, bug or not. Investigated alongside block 2. | alongside |
| 4 | Dense-sheet read speed | Profile A0.00B and two other dense copies; speed the dimension check without changing any result on the D-321–D-326 test set; before/after per sheet and identical-result comparison. | 05:30–09:00 |
| 5 | Revision sets | Spec only: `docs/tasks/revision_sets_spec.md` (pairing, carry-over, compare, reads, Estimating, data model, block plan, open questions). Drafted alongside. | alongside |
| 6 | Auto Count speed part 2 | Only after block 2 is committed, with time left: compiled module once per tab, compressed + long cache, IndexedDB cache; then SIMD retry from `overnight-simd`. | 09:00–11:00 |
| — | Final report | Purge throwaway workspaces through the guarded purge, list their prefixes empty. | 11:00–11:30 |

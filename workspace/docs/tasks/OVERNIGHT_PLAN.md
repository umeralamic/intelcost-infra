# Day plan, 2026-10-11 (04:47 → 13:00 UTC)

The founder's day brief, in order, then the stretch list. Each block: gates (format, lint,
typecheck, build; ruff, mypy, alembic check), quantity table, one Playwright MCP smoke on a
throwaway account, commit and push on `umer-dev` (the workspace mirror in the same session), then
[OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md) updated with the hashes. Unfinished work goes to a named
stash `overnight-<block>`. Last night's files are archived as
`docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-11.md`. Next decision: D-346.

Bench at 04:47: api healthy, worker / page pool / previews answer a Celery ping, beat scheduling;
`app-prod` stopped (started for measurements). Browser tool connects. Mail guard on.

| # | Block | Plan | Budget |
|---|---|---|---|
| 1 | Sheet delete storage | `delete_sheets` gathers each doomed sheet's `takeoff/…/<sheet>/` prefix and its `source_key` (unless a surviving sheet shares it) before the rows go, queued through `storage_clear` in the same transaction; a re-prepare queues the version it replaces; the comment at `routes.py:609`; then the 19 orphans deleted with their keys listed. Smoke: sheet delete, Cancel remaining, re-prepare. | 04:50–06:30 |
| 2 | "C" next-scan re-measure | Quiet machine, production build: shipped vs `?exact=0&solo=off`, 3 runs each, all four tests. If the change costs, find and cut it without changing results. | 06:30–07:30 |
| 3 | Auto Count fill check | Interior ink density (and hatch) of each candidate against the sample; drop or down-rank clear mismatches. Contract: no right lost, no new wrong, suggestions equal or fewer; E200 A1 6/0 with no hatched-A suggestion; E200 A must not suggest empty A1. | 07:30–09:30 |
| 4 | First page before the whole file | Prepare the first ticked page from ranged reads of the source; fall back to the full download when the PDF cannot be read so; identical output; time-to-first-sheet before/after (throttled and normal). | 09:30–12:00 |
| 5 | Drop stashes | `overnight-simd`, `overnight-simd2`, `overnight-cnl` (app). | with block 1 |
| 6 | Stretch: Duplicate project | Only with time left. | 12:00– |
| — | Final report | Purge throwaway workspaces through the guarded purge, list their prefixes. | 12:45–13:00 |

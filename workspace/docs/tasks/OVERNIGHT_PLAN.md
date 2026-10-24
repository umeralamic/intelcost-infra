# Night plan, 2026-10-24 (from 01:42 UTC, no end time): My equipment (F34), then the full fixture suite

The founder's brief: (1) build "My equipment" from [MY_EQUIPMENT_PLAN.md](MY_EQUIPMENT_PLAN.md) (D-759, Q1–Q7 as
recommended), blocks A to E; then (2) restore the fixture suite from tag `fixtures-archive-2026-09-28`, run it in full,
classify every failure, add fixtures for what was built since the archive, and run the D-758 follow-up browser check.
No end time: keep going until both parts are complete. The previous plan and report are archived as
`docs/archive/OVERNIGHT_PLAN_2026-10-23.md` and `docs/archive/OVERNIGHT_REPORT_2026-10-23.md`. Results:
[OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md), updated after every block. A restarted session continues from the first
row below that is not ☑.

**Every block (Part 1):**
1. Any change found while building logged as a later D-NN first (D-759 covers the plan itself).
2. The gates in the containers: app lint, typecheck, build; api ruff, mypy (and `alembic check` for A). No prettier;
   no `from __future__ import annotations`.
3. `./quantity-table.sh`, with its line reported.
4. One Playwright MCP smoke on a throwaway account and workspace, with the block's by-hand check.
5. Commit and push `umer-dev`; update `SINCE_ARCHIVE.md`; refresh the workspace mirror; update this file and the report.

**Part 2 standard (the brief):** every failure is one of (a) an app bug: fix the app, never the test; (b) outdated by a
logged decision: update the test, citing the D-number; (c) retired: remove it, citing the retirement. Never weaken an
assertion, skip a test or change an expected number without a D-number. After each fix: gates, quantity table, commit
and push `umer-dev`.

**How Part 2 runs:** the suite lives only in `intelcost-infra` (the api and app tags carry no test files). It runs on
the fx stack (D-611): `./fx-suite.sh setup`, `prod`, `run full`. Updated fixtures go in `fx-suite-updates/` (D-614,
D-619); new ones there too, as `c<NN>-<slug>.mjs` (D-636). This brief is the founder's named exception to hard rule 8
for tonight.

**Rules for the night:**
- Throwaway accounts and workspaces only. Never the founder's account (estimator@, umeralam.q@), the founder's
  workspaces, "Hidden Valley Spec" or "Bench Construction Test" (and its 3D test project).
- No invented rates; TEST data named "TEST …" and listed in the report.
- Questions for the founder go in the report; the most reasonable reading is taken and recorded under "Decisions taken
  overnight" with the alternative.
- A block that fails after a solid attempt: `umer-dev` stays at the last good commit, the failure goes in the report,
  the next independent block goes on, and the failed one is retried at the end.

| # | Block | Depends on | Status | Commit |
|---|---|---|---|---|
| 0 | Plan, report, archive of last night's | — | ☑ | (workspace) |
| A | Data and api: migration, models, routes, bundle, joins, audit | — | ☑ | api 8cdabab |
| B | Library page: On my list, bulk, header toggle, filter, starting list, bulk-off warning | A | ☑ | app 539084e |
| C | Pickers: `suggest.ts`, Picker, MachineName, template editor, tier class list, Add to my equipment | A | ☑ | app a71d085, infra 0753b3c |
| D | Earthwork activities' Show in suggestions; Not in your equipment list; release banner line | A, C | ☐ | |
| E | Close-out: FEATURES, SINCE_ARCHIVE, mirror, full gates and table, end-to-end smoke | A–D | ☐ | |
| 2.1 | Restore the suite on the fx stack (setup, prod, check) | — | ☐ | |
| 2.2 | Full run; classify every failure (a/b/c); fix | 2.1 | ☐ | |
| 2.3 | New fixtures for what was built since the archive (list in the report) | 2.1 | ☐ | |
| 2.4 | D-758 follow-up browser check (Playwright, throwaway) | — | ☐ | |
| 2.5 | Final full run, report, clean-up | 2.2, 2.3 | ☐ | |

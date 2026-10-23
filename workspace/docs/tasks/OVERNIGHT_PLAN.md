# Night plan, 2026-10-23 → 24 (06:26 UTC → 08:00 UTC on the 24th): the Equipment Library (F33)

The founder's brief: apply the answers to `EQUIPMENT_LIBRARY_PLAN.md` (D-718 to D-729), then build every block in order.
The previous plan (night of 2026-10-22) is archived as `docs/archive/OVERNIGHT_PLAN_2026-10-22.md`, and the previous
report as `docs/archive/OVERNIGHT_REPORT_2026-10-12.md`. Results: [OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md), updated
after every block. A restarted session continues from the first block below that is not ☑.

**Every block:**
1. Its D-NN in DECISIONS.md first.
2. The gates in the containers: app lint, typecheck, build; api ruff, mypy. No prettier; no
   `from __future__ import annotations`.
3. `./quantity-table.sh`, with its line reported.
4. One Playwright MCP smoke on a throwaway account and a throwaway project, including the block's by-hand check, with
   the numbers got recorded beside the expected ones.
5. Commit and push `umer-dev`; update `SINCE_ARCHIVE.md`; refresh the workspace mirror; update this file and the report.

**Rules for the night:**
- Never use "Hidden Valley Spec". Never sign in as the founder's account (estimator@, umeralam.q@).
- **Follow-up of 2026-10-23 (D-729):** "Bench Construction Test" and its project "Hidden Valley Rebid — 3D test"
  (042c8817) are a read-only source.
  - Before Block 3.5 the project is copied into a new workspace of a throwaway account, by a one-off script that reads
    the source and writes only there. The original's row counts and latest `updated_at` are recorded before and after
    the copy, and must match.
  - No write of any kind to the original or its workspace.
- Never change the catalog's numbers or invent rates, production, tiers or defaults. TEST data is named "TEST …" and
  listed in the report.
- Never weaken a gate or edit an expected number. Disputes go to the report's "Disputed numbers".
- Hand-entered components and resources price bit for bit as before (quantity table).
- Questions for the founder go in the report; the most reasonable reading is taken and recorded.
- A block that fails after a solid attempt: `umer-dev` stays at the last good commit, the failure goes in the report,
  the next independent block goes on, and the failed block is retried at the end.

| # | Block | Depends on | Status | Commit |
|---|---|---|---|---|
| 0 | Part 1: answers applied to the plan, D-718 to D-729, rule 9 rewording, Step A | — | ☑ | (workspace) |
| 1.1 | Converter, national schema, release 1 load | — | ☑ | api 522670a |
| 1.2 | Overrides, custom rows, resolve and read API | 1.1 | ☑ | api 9a54a16 |
| 2.1 | Engine core (work-day solver, overtime, location, fuel, operated, mob) and estimate settings | 1.2 | ☑ | app 277b4ff |
| 2.2 | Production engine (11 families, soil, units, guardrails) | 2.1 | ☑ | app a2197f3, api 7c71a8f |
| 3.1 | Component columns, the spread, evaluation | 2.2 | ☑ | api 77d391e, app 8e081e7 |
| 3.2 | The picker and the spread UI | 3.1 | ☑ | app 61a3690 |
| 3.3 | Shared resources from the library; mob counted twice | 3.1 | ☐ | |
| 3.4 | Estimating rows, Needs attention, filter, export | 3.1 | ☐ | |
| 3.5 | Earthwork production tiers, the two-way link, the 3D test copy, coverage | 3.2 | ☐ | |
| 4.1 | Library page: browse, overrides, revert, release banner | 1.2 | ☐ | |
| 4.2 | Custom rows, import/export, a company's machine list | 4.1 | ☐ | |
| 4.3 | Release upgrades and notices | 4.1, 3.1 | ☐ | |
| P1 | Assemblies link shared equipment | — | ☐ | |
| 5.1 | Library components in assemblies | P1, 3.1 | ☐ | |
| End | Coverage run again on the copy; report; clean-up (throwaway workspaces, scratch) | all | ☐ | |

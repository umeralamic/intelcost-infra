# Overnight plan, 2026-10-11 → 12 (23:35 → 11:30 UTC)

The founder's brief: currency, the measurement system (metric) and the dialog titles. Steps in
order; what time does not reach is left for the next session. The day's plan and report are archived
as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-11-day.md`.

**Every step:** log its decision in DECISIONS.md first; gates (app lint, typecheck, build; api ruff,
format, mypy, `alembic upgrade head`); the quantity table; one Playwright MCP smoke on the throwaway
account (`estimator+1790627038@bench.intelcost.io`, project "zz switching"), never the seeded account,
never the founder projects ("Hidden Valley Spec", "Waxing City", "Hidden Valley Spec Building Rebid"),
which are read only. Commit and push on `umer-dev`, refresh the workspace mirror, update
[OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md). Unfinished work goes into a named stash, recorded in the
report. Mail guard stays on.

| Step | What | Ships as |
|---|---|---|
| 0 | Browser check: the Playwright MCP connects and drives the app | report line |
| 1 | Dialog titles by tool: Name this Linear / Segment / Area / Count Measurement; Properties unchanged | commit |
| 2 | Inventory of every hard-coded unit and money label, by area | report section |
| 3 | Currency: workspace default (Settings › Estimating, USD), project override (Edit project), one money formatter, symbol only, never converted; Wage Calculator and crew wages stay USD with a notice in a non-USD project | commit |
| 4 | Measurement system, Phase A: workspace default (Settings › General, Imperial), project override, feature flag (platform admins only until Phase E), the "Metric · CA$" tag, display only | commit |
| 5 | Phase B, display: m / m² / m³ at 2 decimals across the inventory except Estimating rates and the export; metric scale presets confirmed | commit |
| 6 | Phase C, entry: metres and millimetres in every length field, exact round trips (150 mm stays 150 mm), the zero rule in both systems | commit |
| 7 | `METRIC_PHASE_DE_PLAN.md`: Phases D and E designed, files, quantity-table rows, questions | doc commit |
| 8 | Phase D: Estimating, export and every unit rate converted at display and entry only; totals identical to the cent | commit only if every total matches; else stash `overnight-metric-phase-d` |
| 9 | Phase E: sub-item formulas in the project's units, template unit-system tag and warning, quantity-table rows | **stash `overnight-metric-phase-e`, not committed** |

After Step 9: no new feature work; re-verify Steps 1–8 in the browser and tighten the report.

**Principles carried through every step:** storage stays imperial (feet, SF, CY) everywhere, in both
engines and the quantity table; metric is a display and entry layer; switching a project's system or
currency never writes a stored quantity, rate or amount.

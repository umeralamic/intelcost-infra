# Overnight report, 2026-10-09

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after every block. The 2026-10-08 run's
files are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-08.md`.

## Pre-flight

- **Browser tool:** Playwright MCP connects to the bench and drives the app (04:56 UTC).
- **D-259 bucket CORS:** already recorded as resolved in DECISIONS.md (D-259) and
  docs/flows.md; no harness workaround existed to drop.
- **Mail guard:** on (`MAIL_GUARD=true`, allowlist set).

## Blocks

| Block | State | Commits | Smoke |
|---|---|---|---|
| 1 (A4, A6, A7, A8) | Done | app `c32c366`, infra `BLOCK1-INFRA` | One-page rows show no "n/m selected", the 3-page set "3/3 selected", tooltips on every name; search tags "Archived", "Cancelled", "No sheets yet". Passed |

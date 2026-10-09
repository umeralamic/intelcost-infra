# Overnight report, 2026-10-09

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after every block. The 2026-10-08 run's
files are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-08.md`.

## Pre-flight

- **Browser tool:** Playwright MCP connects to the bench and drives the app (04:56 UTC).
- **D-259 bucket CORS:** already recorded as resolved in DECISIONS.md (D-259) and
  docs/flows.md; no harness workaround existed to drop.
- **Mail guard:** on (`MAIL_GUARD=true`, allowlist set).

## Blocks

Every block's gates: lint, typecheck, build, ruff, mypy clean; `alembic check` shows only P-23's
drift (removed index `ix_takeoff_cost_component_item`, `uq_estimate_format_theme_workspace`,
`uq_project_equipment_resource_name`); the quantity table passed (329 rows).

| Block | State | Commits | Smoke |
|---|---|---|---|
| 1 (A4, A6, A7, A8) | Done | app `c32c366`, infra `d884742` | One-page rows show no "n/m selected", the 3-page set "3/3 selected", tooltips on every name; search tags "Archived", "Cancelled", "No sheets yet". Passed |
| 2 (A1, A2) | Done | app `1cf0d4b` | Settings → change → close → "Close without saving?" → Escape: the confirm closed, Settings stayed (2 dialogs → 1). Add sheets open, 12 files queued into Building A/Architecture and Building A/Electrical at 5 Mbps: the pane's line and the tray agreed ("Uploading 8 of 24 files"), tray hidden while the dialog was open, back on Cancel, hidden again on reopen; tree "(n files)" rose as files landed; rows on their way showed "Uploading…" with Cancel. Passed |
| 3 (A5) | Done | app `7fe7c67` | Open → "Night Files" (files, no sheets) → `/project/…/takeoff` in the takeoff shell (header, 5 tabs, Open, name) with the first-run load screen; Skip → "No sheets yet" + Add sheets on the canvas, Sheets panel + present; refresh did not ask again; panel + → Add Pages opened the load screen; a project with sheets at `/takeoff?tab=estimating` went to its first sheet with the tab kept. Not driven: the dated-name rename offer (needs an empty workspace drop; same code path moved as is). Passed |
| 4 (A3) | Done | app `8a22552`, api `ec6ae1a` | Focusing Building A (no files of its own) showed Architecture 24 and Electrical 24 tiles under their headings, all thumbnails, no per-file page requests; files queued into Building A/Electrical at 5 Mbps showed grey tiles "Uploading…" → "Preparing…" → a real tile. 500-tile check (5 subfolders × 100): stuttered unvirtualized (wheel p50 33 ms, 28/93 frames > 50 ms), so `@tanstack/react-virtual` per the ruling: wheel p50 17 ms, p95 50 ms, 1/144 frames > 50 ms, 48 tiles in the DOM, first draw 671 ms, tick all 373 ms. Passed |

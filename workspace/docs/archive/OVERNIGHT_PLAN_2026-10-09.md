# Overnight plan, 2026-10-09 (04:56 → 11:30 UTC)

The founder's brief, in order. Each block: gates (lint, typecheck, build; ruff, mypy, alembic
check with the P-23 line), quantity table, one Playwright MCP smoke on a throwaway account,
commit and push on `umer-dev`, then the report updated. Unfinished work goes to a named stash
`overnight-<block>`. Mail guard on (checked: `MAIL_GUARD=true`, allowlist set). Founder
projects (Hidden Valley Spec, Waxing City, Hidden Valley Spec Building Rebid) read only.

## Pre-flight

- Browser tool: Playwright MCP connects and drives `localhost:5173` (checked 04:56).
- D-259 bucket CORS: already recorded resolved in DECISIONS (D-259, 2026-10-08) and
  `docs/flows.md` (:97, :352); the harness workaround was never committed, nothing to drop.

## 1. App shell, Part A (D-313)

| Block | Contents |
|---|---|
| 1 | A4 one-page notes off, name room + tooltip; A6 Archived / Cancelled tags; A7 `list-storage` drive, stale MinIO/fakes docs; A8 alembic check in the gates |
| 2 | A1 dialog stack (only the top dialog takes Escape and the backdrop), tray hidden under any modal, progress line in the load screen; A2 one counting function |
| 3 | A5 no-sheets projects in the takeoff shell; TakeoffStart deleted |
| 4 | A3 recursive folder pane grouped by subfolder, placeholders, batched thumbnails, 500-tile check (react-virtual only if it stutters) |

## 2. Auto Count

- Drop stash `overnight-part2a-outline-symmetry` (shipped as D-305).
- OpenCV worker policy: 4 workers at ≥ 8 GB, else 1; kept warm, released after 2 min idle;
  memory before / peak / between / +3 min; timings for office, "C", E200 A, E200 A1 at 70 % and
  38 %, 4 and 1 workers, first and back-to-back, in host Chrome.
- SIMD opencv.js under the same-checked-set contract; ship only if faster.

## 3. App shell, Parts B and C (D-314, D-315)

| Block | Contents |
|---|---|
| 5 | B1 Reports in the avatar menu, gated as the reports page |
| 6 | B2 All projects dialog (status tabs as today, search across tabs, Takeoff / Files buttons, ⋯ Edit / rename / archive / unarchive / Trash, footer Trash link), `previous_status` column, `/projects` redirect |
| 7 | C1 Edit project (edit mode of New project, status, scope, notes, Discard prompt, from the list without switching) |
| 8 | C2 file housekeeping in the tree + Files-from-list mode |
| 9 | C3–C6 Wage Calculator in Estimating, final Open menu, project page deleted, redirects |

## End

Purge throwaway workspaces, list their S3 prefixes (empty), final report.

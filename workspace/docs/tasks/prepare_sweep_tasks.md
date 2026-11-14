# Sheet preparation: a page killed at the hard limit, the timeout message, `prepare_sheet` by uuid (F47, D-1270)

> The founder's brief, 2026-11-14 night run, Part 4 (D-1265 18–20). Follows D-1263 (`docs/archive/prepare_timeout_tasks.md`),
> which retries a page stopped by its **soft** limit. This is the **hard** limit: the worker's child is killed, so no
> code in the task can catch it.

## Problem

- A page whose run is killed at the hard limit (1800 s) stays "Preparing". Ten minutes on, the sweep sends its file
  again at the same limits; the page is killed again, for ever.
- Choose pages' thumbnails: a stop at the soft limit inside a page was caught as that page's error and the job ran on
  to the hard kill; a kill left the file "preparing" and the sweep sent it again at the same limits, for ever.
- The failure text after twice the time, "Couldn't prepare this page. It took too long, even with twice the time.",
  tells the estimator nothing to do.
- `prepare_sheet` took the sheet's integer id (api rule 6: uuids cross boundaries).

## Tasks

| # | Task | Where |
|---|---|---|
| 1 | The message "Couldn't prepare this page. Try again, or split the PDF." (`TOO_LONG`), every place it shows: the sheet's `render_error` (Load progress, the sheet's failed view, the Sheets panel), Choose pages' `error` | api `worker/tasks/prepare.py`; app `PageChooser.tsx` `Problem`, `core/api/types.ts` |
| 2 | `prepare_sheet(sheet, then, slow)` by uuid; `start_prepare` and `then` by uuid; the Load route sends uuids; an integer id accepted for one release with a deprecation warning | api `prepare.py` (`_sheet_id`), `features/drawing/routes.py` (`_prepare_sheets`) |
| 3 | The job row: `sheet_render_job` per page, `running` with `started_at` while a run holds the page; done / failed / queued when it ends | api `prepare.py` (`_job`, `_run_started`, `_run_ended`) |
| 4 | The hard-kill hook: a base class whose `on_failure` sends `prepare_killed(sheet, slow, then)` for `TimeLimitExceeded` | api `prepare.py` (`KilledAtHardLimit`, `prepare_killed`) |
| 5 | `prepare_killed`: killed without twice the time, attempts + 1, back to "Preparing", sent again in 130 s with `slow` and 3000/3600 s; killed with it, failed with the message, the row poisoned; `then` sent on | api `prepare.py` |
| 6 | The sweep: `prepare_drawing_file` sends a page with a kill on its row with twice the limits; a row `running` past its run's hard limit and the lease counts as killed | api `prepare.py` (`prepare_drawing_file`, `sweep_unprepared_drawings`, `_dead_runs`) |
| 7 | Choose pages' thumbnails, the same rule: `prepare_file_pages(slow=)`, a soft stop anywhere (no longer caught per page) or a kill → "slow" and once more with twice the limits; again → "too_long"; served as "preparing" / "failed" with `error`; the sweep sends a stale "slow" job with twice the limits | api `prepare.py` (`prepare_file_pages`, `file_pages_killed`), `features/project/routes.py`, `schemas.py` |
| 8 | Quantity-table rows for each of the above | infra `drives/quantity-table.py prepare` |
| 9 | Smoke: a real hard kill on the bench's page worker on a throwaway page (killed once → prepared with twice the time; killed with twice the time → the message in the app), and Choose pages' thumbnails the same | MCP + a throwaway drive |

## Built (2026-11-15 night run Part 4, D-1270)

Tasks 1–9 built. No migration. Smoke on the bench's own workers with messages sent at a 1 s hard limit (K4 killed,
prepared by its retry 130 s later; K5 killed with twice the time, failed with the message; Choose pages' thumbnails
killed once → "slow" → ready, killed with twice the time → "too_long", the message in Choose pages).

## Not in this build

- Choose pages offers no Retry of its own: a file left "too_long" is not sent again by opening the dialog.

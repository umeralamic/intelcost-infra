# F47 — Sheet preparation: a page that times out is tried once more with twice the time

**Decision:** D-1263. **Repos:** api, infra. **Brief:** the founder, 2026-11-13 (night run, part 4): "SHEET PREPARATION
TIMEOUT: A page that times out gets one retry with double the time limit before 'Couldn't prepare this page'; other
real errors still fail at once. Quantity-table row."

## Problem → solution

A page stopped by its time limit fails at once (D-1255 counts the time limit a real error), so a heavy page that needed
a little longer than 25 minutes reads "This page took too long to prepare." with nothing tried again. → One retry for a
timeout, sent with twice the limits (soft 50 min, hard 60 min); a second timeout fails with "Couldn't prepare this
page." Every other real error still fails at once, and D-1255's back-off for passing errors is unchanged.

## Readings (made unattended, the founder to confirm)

1. **What "times out" means.** Sheet preparation has no per-page limit of its own (no render or rasterize timeout in
   `prepare.py`, `ranged_page.py` or `pymupdf` calls). The page task's limit is Celery's: `task_soft_time_limit` 1500 s
   (it raises `SoftTimeLimitExceeded` in the task, also seen wrapped by MuPDF) and `task_time_limit` 1800 s (the hard
   kill). A timeout is the soft limit, in either step of the page: fetching the drawing's file or making and storing
   the page. The hard kill leaves no code running to retry; the sweep's re-send takes that page as before.
2. **How the doubled limit is carried.** `prepare_sheet` gains a keyword `slow` (default False). The timeout's retry is
   `task.retry(kwargs={"slow": True}, soft_time_limit=3000, time_limit=3600, countdown=10)`: Celery puts the limits in
   the message's `timelimit` header, and the worker applies them to that run. A passing error on the doubled run is
   retried by D-1255's own call, which keeps the run's kwargs (`slow`) and sends the doubled limits itself
   (`_limits(slow)`), so they hold for the page's remaining tries without relying on Celery's carry-over (which an
   eager run in the quantity table cannot show). 10 s: long enough for the stopped run to let go of the
   page's lease (else the retry finds it held and returns "taken").
3. **Exactly one retry for a timeout, apart from the back-off.** `slow` is the marker: a timeout on a run with
   `slow` set fails. The timeout's retry counts in Celery's `request.retries`, so D-1255's waits are indexed by
   `retries - slow` (the page still gets 30 s, 2 min, 5 min), and `max_retries` is `len(RETRY_AFTER) + 1`.
4. **The message.** A second timeout fails with "Couldn't prepare this page. It took too long, even with twice the
   time." (the founder's words first, then why), in place of "This page took too long to prepare.". A timeout while
   fetching the drawing now reads the same, not "Couldn't open this file. It may be damaged."
5. **Real errors fail at once** (unreadable PDF, a refusal, not found while storing): no timeout retry, no back-off.
   Passing errors keep D-1255's back-off unchanged; the file not in storage yet while fetching keeps its retry.
6. **Idempotent, as before.** The page task claims its page by its lease, skips a prepared page, and commits nothing
   of a failed try. The task takes the sheet's internal id, as it did before (not a uuid; unchanged here, an open
   question).
7. **Only `prepare_sheet`.** Choose pages' thumbnails (`prepare_file_pages`, its own retry) and the reads are not
   changed.

## Tasks

1. `prepare.py`: `SLOW_LIMITS` (twice the configured soft and hard limits), `SLOW_RETRY_AFTER = 10`,
   `again_slower(exc, slow)`, `_limits(slow)`, `_retry_slower`, `prepare_sheet(..., slow=False)` carried through `_prepare_one` and `_prepare_held`;
   both excepts of `_prepare_held` try `again_slower` first, then D-1255's `retry_after` on `retries - slow`; the time
   limit's failure message changed.
2. Quantity table, `drives/quantity-table.py prepare`: `again_slower` rows over each kind of error; real-task rows on
   one-page drawings of zz MyEq project: a timeout then prepared with twice the time; a timeout twice, failed with the
   message; a timeout fetching the drawing then prepared; a refusal fails at once with no retry; a timeout then a DNS
   failure on the doubled run, which still waits 30 s and is prepared. `quantity-table.sh` filters the new warning.
3. Gates (ruff, ruff format, mypy, alembic check; no migration), the quantity table, D-1263, FEATURES and MANAGER
   rows, SINCE_ARCHIVE, the workspace mirror.

## Also in this run (part 4, task B)

D-1260 follow-up: the pressure runs' tees and the "Bend between structures" flag read the run's base through a named
predicate in the pure library (`fittings.buysFittings`), with quantity-table rows (`util-1260-fitted-*`). See D-1260's
follow-up line.

# Measuring the save-to-second-window path on staging (plan, not run)

_Night run 2026-10-22, Step 3 (Q3, D-696). Written for Umer and Abdullah. Nothing here has been run._

## Why

On the bench, f6-a step 8 (a save in window A shown in window B) took 1.8–2.0 s. The day session of 2026-10-21
(Step 7) found most of it in the commit: Postgres's `COMMIT` took 0.43–1.87 s, because every commit waits for the
disk flush, and one 8 kB `fdatasync` on Docker Desktop's virtual disk takes about 0.54 s. The bench now runs with
`synchronous_commit = off` (D-699), so the bench no longer shows the cost. That says nothing about staging or
production, whose disks are different. Before testers, the same path is measured on Abdullah's staging stack, with
`synchronous_commit` left **on**.

## What is measured

The same five stages as the bench measurement, eight saves 1.5 s apart, two runs:

| Stage | How |
|---|---|
| The PATCH's answer in window A | the browser's own timing of the request |
| The event's stamp on the server | the realtime event's `at` |
| The frame's arrival in window B | B's socket message handler, B's clock |
| The row painted in window B | the first frame after the row's text changes |
| The commit itself | Postgres's statement log for `COMMIT`, sessions of the test account only |

And once, on the database host: `pg_test_fsync` (8 kB `fdatasync`), to read the disk's flush time directly.

## How, step by step

1. **Ask Abdullah first.** Staging is his stack. Agree a window and whether `log_min_duration_statement` may be set
   on the staging database for that window (it is reset after).
2. **Accounts:** two throwaway accounts on staging, a workspace of their own and one small project (a sheet, one
   linear item). Never a real customer's or the founder's data.
3. **Logging:** `ALTER DATABASE <staging db> SET log_min_duration_statement = 100` for the window, then `RESET`.
   Lock waits with `log_lock_waits = on` if Abdullah allows it.
4. **The drive:** the bench's throwaway f6-a step 8 drive (Step 7's method), pointed at the staging app and api,
   from one browser on one machine so the two windows share a clock.
5. **The flush:** `pg_test_fsync` on the staging database host, if Abdullah can run it (managed Postgres usually
   cannot; then the commit times from the log stand in).
6. **Clean up:** the throwaway accounts and their workspace deleted; logging reset; nothing else changed.

## What would follow

| Finding on staging | What it means |
|---|---|
| `COMMIT` under about 20 ms | The bench's slow disk was the cause; nothing to change in the app or the api |
| `COMMIT` of hundreds of ms | Staging's disk or its Postgres settings need a look before testers (Abdullah's call); `synchronous_commit` stays on in production either way, unless Umer decides otherwise |
| Window B's own part over about 200 ms | The app's repaint (Step 4's work, D-700) is checked again there |

## Not in this plan

- No change to any staging or production configuration.
- No load test: one person, eight saves.

# Overnight report, 2026-09-27

_Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Last night's report:
[docs/archive/OVERNIGHT_REPORT_2026-09-26.md](../archive/OVERNIGHT_REPORT_2026-09-26.md)._

## Review of the plan

Written before starting, as the plan asks. Since then the founder has cut the run to
**F5 Block C and a stop**, so tasks 2 to 8 are reviewed for the record but are not run.

### 1. Time per task, at the new bench speed

The bench now runs fixtures 4 at a time (D-44):
- the quick tier (16 fixtures) takes about **5 to 6 minutes**, where it once took about
  25 minutes one at a time;
- the full tier takes **_measured below, "Bench"_**, where the last full run took
  **about 1.5 hours** one at a time.

Building, not testing, is now most of each block.

| Task | Estimate | Basis |
|---|---|---|
| 1. F5 Block C (S10 to S12) | **7 to 9 h** | Port legacy's `PdfPageRenderer` (464 lines), doc cache (151), memory budget (44), bitmap cache and prerender queue (370) into `lib/takeoff/pdf`. One zoom module and the 50% to 4000% range (D-35). The two-stage re-raster and windowing above 2.5×. One call signing every sheet. The first-paint target, measured three runs each. Four new fixtures, then the quick tier |
| 2. F5 Blocks D, E, F (S13 to S19) | 10 to 13 h | The panel's tree and its acts (two subtasks, the largest UI in F5), calibration's words and presets, then the live duties and the two-window check |
| 3. Close F5 | 1.5 h | The full tier, PARITY, board, report, mirror, backup |
| 4. F6 Block A | 5 to 7 h | Per item_model_tasks.md |
| 5. F9 draft, proof backlog | 2 to 4 h | |
| 7, 8. Second batch | 4 h | |

### 2. The F5 block list, and whether it fits

Six blocks: A (S1 to S3) and B (S20, S4 to S9) are closed. **C: rendering, S10 to S12.
D: the sheets panel, S13 and S14. E: calibration and scale, S15 and S16. F: collaboration,
S17 to S19.**

**It does not fit.** C to F plus the close is about 19 to 24 hours against 14. The
founder's instruction to stop after Block C settles it: Block C alone fills a working
session.

### 3. Risks, dependencies, ordering

- **S12's AC2 contradicts D-41.** It asks for an unprepared page to open from the whole
  file by range requests, which is exactly what IDM took (D-40, D-41).
  - Replaced by D-41's behaviour: "Preparing the sheet", then it draws when ready.
  - Logged as the next D-NN, decided overnight.
- **S12's AC3 needs a new api call.** Today the app signs one sheet at a time.
- **The zoom module goes first.** Every clamp (wheel, buttons, Fit) reads it, and the
  re-raster keys its bitmaps on it.
- **The target: first sharp paint close to legacy's ~4 s (~12 s today).** Today's path:
  - fetch the page's PDF;
  - draw it 3072 px wide;
  - PNG-encode it (`toBlob`);
  - load that as an image.

  The encode and the decode of a 3072 px PNG are likely several of those seconds. The
  port draws straight into the canvas, as legacy does. What's left is the worker's
  preparation, which D-43 and D-45 already shortened. Measured; if the api side still
  dominates, that goes in the findings, not a patch.
- **Hard rule 2.** The renderer, caches and zoom module go in `lib/takeoff/pdf` with no
  React and no network. The fetch stays in `features/takeoff/pdf`.
- **F8's drafts and cursors draw over the new canvas** (DraftLayer). Its overlay
  coordinates must stay normalised through every zoom tier; f8-s13, f8-s14 and f8-s18 are
  in the quick tier for Block C.
- **The bench's Chromium runs at dpr 1.** S10's "sharp on a dpr-2 display" is driven with
  a `deviceScaleFactor: 2` context.

### 4. What only the founder can check, and how it's handled

- **IDM.** Block C changes how a sheet's bytes are drawn, not how they're fetched: one GET
  of `…/pages/{file}/{page}`, `application/vnd.intelcost.sheet`, no `.pdf`, no
  Content-Disposition, no Range, bytes into `getDocument({ data })`.
  - f5-big's step already asserts that shape. It stays in the quick tier for Block C.
  - The founder's IDM-on click check is listed and marked.
- **"Sharp" by eye at 4000%** on a real dpr-2 screen. The fixture checks backing size and
  line width; the eye check is listed.
- **Feel of the zoom** (wheel steps, the interim frame). Listed as a click check.

### 5. Missing from the plan

- **The founder's data rule vs D-45.** Before the rule arrived, I dispatched two
  preparation jobs on the founder's JHS VOL 4 set while diagnosing D-45. They only
  prepared pages the founder had loaded, and changed nothing else. Nothing of theirs is
  touched from here on.
- **Legacy's Block C numbers (PARITY §24)** are cold-open medians on legacy's own sheets,
  which the bench doesn't have. They're measured on Riverside and a copy of the JHS set
  and recorded beside legacy's, as the spec says.

## Progress

| # | Task | Status | Start | End | Duration |
|---|---|---|---|---|---|
| 0a | Bench: parallel fixtures, tiers (D-44), D-45, /health/code | Done, pushed | 2026-09-26 20:30 | 2026-09-27 05:10 | |
| 0b | f8-s13 dropped frames (D-46) | Done, pushed | 05:10 | 06:25 | 1 h 15 |
| 0c | The five full-run failures, timeboxed 1.5 h | Done: 4 fixed with causes, 1 open (see Findings) | 06:45 | 07:20 | 35 min |
| 0d | Full tier measured at 4, then 3; runner hardened | Done: **3 at a time, all 81 standing fixtures pass, 57 m 25 s** | 07:18 | 09:20 | 2 h |
| 1 | F5 Block C | Not started | | | |

## The five full-run failures (timeboxed)

| Failure | Kind | Cause | Fix |
|---|---|---|---|
| f2-close: an invitee who signs up is seated | **(b) product** | The session turns authenticated while `signUp` resolves, and a render then sent the invitee to the dashboard before `setAccountCreated` ran. The seat landed 1.03 s later, with the page gone, so a failed accept would have had nowhere to be reported | `Signup.tsx`: `creating` is set before the request, so the guard holds from the first render. 7/7 |
| f3-s1: the roster rendered no rows | (a) fixture | Read the roster, its own query, as soon as the invite picker drew | Waits for the roster rows. 5/5 |
| f3-s10: a renamed workspace read back as another | (a) fixture and **(b) product** | `enterWorkspace` skipped choosing a workspace already shown, so nothing was stored. **Product:** a workspace shown only as "first by name" was never kept, so renaming it so it sorted after another moved the person into that other workspace on reload | The helper always chooses. `session.tsx` stores the workspace it falls back to. 4/4 |
| f8-s9: B never heard A's move | (a) fixture | The socket recorder's `at` (when the page heard a frame) was overwritten by the event's own `at`, the api's ISO time. So any "after this moment" test on events compared a string with a number. **f8-s15's "hears nothing after the revoke" was passing vacuously for the same reason** | `lib/realtime.mjs` keeps the page's time as `at`, the api's as `server_at`. f8-s9 5/5; f8-s15 6/6 with its check now able to fail |
| f8-s13 AC4: window A's socket not ready in 20 s | **Open** | Not reproduced. Under 4 parallel fixtures every socket readied in under 0.4 s (below) | `readySocket` now reports every socket's frames and close code when it fails, so a recurrence carries its own evidence |

**Measured under 4 parallel fixtures (b): api, socket and event times.** 30 samples each,
a probe running beside 8 heavy fixtures.

| | Idle | 4 in parallel, before | 4 in parallel, after |
|---|---|---|---|
| `GET /api/auth/me` | median 13 ms, p90 19, max 21 | median 47, **p90 743, max 1,303** | median 42, **p90 206, max 329** |
| Socket open → ready | median 23 ms, p90 35, max 39 | median 66, p90 453, max 1,297 | median 75, p90 114, max 372 |
| PATCH → event heard | median 33 ms, p90 45, max 53 | median 84, p90 334, max 705 | median 90, p90 504, max 1,645 |
| The 8 fixtures | | 6 m 22 s | **4 m 58 s**, all pass |

**The fix: the bench api was logging for the libraries, not for us.** `DEBUG=true` put the
root logger at DEBUG and turned on SQLAlchemy's echo. So every SQL statement was written
to stdout twice, and every S3 call logged in full, from inside the event loop. SQL echo is
now its own switch (`sql_echo`, off), and botocore, SQLAlchemy and the like stay at
WARNING even in debug. Production runs with `debug` off, so its users never paid this, but
the bench measured an api slower than production.

**Open: event delivery's tail** (p90 504 ms, max 1.6 s under load) includes the PATCH's
own write, publish and fan-out. It didn't improve with the logging fix and is left as a
finding with these numbers.

## Bench

| Full list (81 standing fixtures) | Wall clock | Host CPU | Result |
|---|---|---|---|
| One at a time, before D-44 | about 1 h 30 (the last known run) | | |
| **3 at a time, now the default** | **57 m 25 s** (parallel 38 m, serial 19 m) | mean 81%, 90th percentile 96%, above 90% in 44% of samples | **all 81 pass** |
| 4 at a time | parallel group about 33 m | mean 91%, above 90% in 81% of samples | f4-s10 (fixture, fixed) and f8-s16 (a 1.6 s live update, the open finding) |

**The runner itself had three faults, found during these runs and fixed:**
1. **It hung with CPU sampling on.** A bare `wait` also waited for the sampler, which
   never ends. Two runs hung after their parallel group.
2. **Two runs could overlap.** Releasing those hung runs let two serial groups (api
   restarts, Redis and worker stops) and two clean-ups run at once. That produced a false
   batch of serial failures (f4-s27, f5-s2, f8-s12, f8-s2, f8-s3). Now one run at a time,
   by a lock.
3. **A serial fixture could start against a half-started api.** `docker compose restart`
   returns before the api inside has finished its start (migrations). Now each serial
   fixture waits for both apis' `/health` and current code.

The 3-at-a-time run also carried the three Block C fixtures, then written but not yet
deployed, so its time is slightly high.

## Findings

- **Event delivery's tail under load.** PATCH → event heard: p90 504 ms, max 1.6 s with
  4 fixtures running (idle: 45 ms, 53 ms). f8-s16's "within 1.5 s" failed once at 4 at a
  time (1,617 ms) and passes at 3. Not chased inside the timebox. The logging fix below
  did not move it.
- **`waitFor` let a probe's error escape.** A fetch refused while the api restarted ended
  the wait at once. It now counts as "not yet", and the last error is named on timeout.

## Commits

## Decisions to review

## Click-only checks

## Questions
</content>

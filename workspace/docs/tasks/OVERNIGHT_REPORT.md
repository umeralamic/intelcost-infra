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
| 1 | F5 Block C (S10 to S12) | Built and driven; **checked by the founder** (PASS, D-47 accepted) | 09:25 | 10:15 | 50 min (plus design and fixtures written during the runs) |
| 2 | F5 Block D (S13, S14) with legacy's prerender; a production build on the bench (D-49) | **Built and driven; stopped here for the founder's click check** | 10:50 | | about 2 h, the regression run included |

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

## F5 Block C

**pdf.js now draws every sheet, sharp from 50% to 4000%, over the worker's fit image.**
A page loaded through Add sheets is drawn sharp in **a median of 3.9 to 5.0 s across runs,
from ~12 s**, legacy's being ~4 s. The fetch is unchanged from D-42: one GET of the page's
own file, bytes into `getDocument({ data })`, so IDM has nothing new to react to.

| Subtask | Proof |
|---|---|
| **S10** pdf.js on the canvas | `f5-s10` 5/5, on a dpr-2 window:<br>• at 100%, 400%, 2000% and 4000% the settled picture is a pdf.js raster, its backing twice its CSS size, windowed above 2.5× (3808 × 2524 device px at 4000%);<br>• **a hairline is 1 device pixel wide at 4000%**;<br>• the raster sits exactly under the measurement overlay at 100% and 400%, and a 0.2 × 0.2 square reads 1,600 SF;<br>• two sheets, back and forth twice: 2 opens;<br>• 64 MB of bitmaps on a 4 GB machine |
| **S11** Fit tier, zoom rule, re-raster | `f5-s11` 6/6, run alone:<br>• the fit image paints first, then pdf.js over it; back to an open sheet, no image is fetched;<br>• the buttons step +0.25 below 2× and ×1.25 above, 100% to 4000% in 19 presses; buttons and wheel stop exactly at 50% and 4000%;<br>• after a zoom, a half pass (8 to 9 ms) then a full one (39 to 43 ms), windowed above 2.5×;<br>• cold open: first pdf.js paint median 1.9 to 2.4 s (see Findings);<br>• Load to sharp: 3.9 to 5.0 s |
| **S12** Split source, signing | `f5-s12` 4/4:<br>• page 90 of a 150-page set opens from its own split, one GET, the set never requested;<br>• **D-47**: an unprepared page reads "Preparing the sheet", asks nothing of the set, then draws;<br>• one call signs every sheet, and switching sheets signs nothing more |

**Carried on the new canvas, unchanged:** f5-big 6/6 (the IDM stand-in: no request for
the set, nothing answered as a PDF, and with the sheet's PDF blocked the fit image stays),
f8-s13 5/5 and f8-s14 4/4 (colleagues' drafts), f8-s9, f8-s12, d37-links. **Quick tier
plus Block C's fixtures: 27 of 28 at 3 in parallel.** The one failure was f5-s11's timing
step, 4.0 s under load against 1.9 s alone, so timing fixtures now run in the serial
group, and f5-s11 passes there.

**Gates:** ruff, mypy, lint, typecheck, build (pdf.js stays in its own chunk; the takeoff
route is 65 kB).

## F5 Block D

**The sheets panel is in takeoff, left of the canvas.** Its "+" is Add sheets, which left
the canvas bar. Legacy's prerender queue came with it from Block C. The production build
you asked for now runs on the bench (D-49), and the timings are measured there.

| Subtask | Proof |
|---|---|
| **S13** The tree, search and rows | `f5-s13` 7/7, on the dev server and again on the production build:<br>• sheets nest under the folders mirrored from the project's files (Plans / Architectural / Arch);<br>• a sheet moved out of every folder sits "At root", and the panel followed that move without a reload;<br>• the open sheet's row is highlighted and follows a click;<br>• "Search sheets…" matches number ("a-101"), name ("foundation") and an item's name ("window w2"); "zzz" reads No sheets match "zzz no such";<br>• rows read "A-101  –  Foundation Plan" or "Page 3", with the scale chip `1/8"=1'-0"` or none, the item count (2) and the star;<br>• Thumbnails: 3 of 10 fetched on open, the 7 below the fold only when scrolled to |
| **Prerender** (from Block C) | `f5-s13`:<br>• the open sheet's neighbours are drawn once it has painted, never before, so they don't race its download;<br>• a row held 150 ms is drawn too; a row never hovered is never fetched;<br>• opening a sheet drawn ahead shows no fit image and doesn't fetch its PDF again. **First sharp paint: 9 ms** on the production build (about 0.5 s cold) |
| **S14** Rename, move, reorder, bookmark, delete | `f5-s14` 6/6, two windows (B on app-b and api-b):<br>• double-click, "A-101" and "Sheet name", Save: persisted, and **B's panel followed in 837 ms with no reload**;<br>• a drag within a folder, persisted in one write, the other folder untouched;<br>• Thumbnails reads "Switch to List view to reorder pages" and doesn't drag;<br>• Ctrl adds and Shift selects a range. "3 sheets selected": Bookmark selected, then Move selected to Root, all three, in the api too;<br>• "Delete 2 sheets?": "…2 items lose their measurements on these pages. 2 of them have measurements nowhere else and will be deleted entirely: Door D1, Window W2. This cannot be undone.". Then "Deleted 2 sheets", A moves on to the next sheet, and B's rows go;<br>• a viewer sees the panel and opens sheets, but cannot rename, drag or delete; the api answers 403 to all three |
| **D-48** re-homing | By hand, as the app can't yet put one item on two sheets: an item with a shape on a second sheet survived the delete of its home, moved to that sheet with its one shape; the api reported 0 items deleted |

**Timings on the production build** (`f5-s11`, run alone, `FX_APP=http://localhost:5175`):

| | Dev server | **Production build** | Legacy |
|---|---|---|---|
| Cold open, first pdf.js paint (median of 3) | 1.9 s | **480 ms and 544 ms** (two runs) | ~200 ms |
| A page loaded through Add sheets, drawn sharp (median of 3, preparation included) | 4.6 to 5.1 s | **1.2 to 2.1 s** | ~4 s |
| A sheet the prerender drew ahead | 21 ms | **9 ms** | |

**The production build found two races the dev server hid, both fixed:**
- **A zoom's own scroll was taken for a pan.** Zooming holds the point under the cursor
  by scrolling. Above 2.5× that scroll started a pan's re-draw of the same window, a
  second half-resolution pass included. `f5-s11` AC3 caught it on the production build.
  The canvas now tells its own scroll from a person's.
- **The panel flashed every sheet "At root"** in the moment between the sheets arriving
  and the folders arriving. It now waits for both.

**Found on the way:**
- **Block C's "skip the fit image" check never fired.** It ran before the canvas was
  measured, so it looked for the wrong width. `f5-s11` passed only because the browser
  had cached the image. It now asks at the width the last canvas drew at.
- **Our cascade would have broken legacy's delete rule.** An item's home sheet is
  `ON DELETE CASCADE`, so deleting a sheet would have taken the item's shapes on other
  sheets. D-48 keeps legacy's rule in the api.
- **The sheet list made one query per sheet** to find its file. It now makes one query in
  all.
- **Four fixtures found the quantity panel as "the aside".** It is now
  `data-quantity-panel`.

**Not ported in Block D.** The panel offers only what S13 and S14 name. Everything below
waits for the feature that owns it ("Not in F5"):
- Auto-Name, Name from region, Duplicate, Print, Preview, Rotate, New Blank Page.
- Folder create, rename and move.
- The collapse ladder and Default Expand Level.
- Item lists under a row, and the sheet naming format setting.

**The quick tier plus every F5 fixture and the F8 fixtures on the takeoff page, 35 in
all: 34 pass at 3 in parallel, in 28 m 34 s.** Host CPU averaged 90%, the most this bench
has run.
- **f8-s13 failed** on the "aside" locator above. Fixed, it passes 5/5.
- **f8-s18 AC2** then once saw an edit reach B in 1,318 ms against its 1 s bound, beside
  two other fixtures. Alone it took 172 ms. That is the event-delivery tail under load
  already in Findings. To keep Block D from adding to it, the panel's item counts now
  refetch once a burst of events settles, not once per event. f8-s18, f8-s14 and f5-s13
  then pass together.

**Gates:** ruff, ruff format, mypy (84 files), lint, typecheck, build. No migration.

## Estimates from actual pace

| | Planned | Actual |
|---|---|---|
| Block C | 7 to 9 h | about 3 to 4 h |
| Block D | about 4 to 5 h (its share of D to F's 10 to 13 h) | about 2 h |

Building is running at about 40% of the plan. Revised estimates:

| Next | Estimate | What it holds |
|---|---|---|
| **Block E** (S15, S16) | **2 to 3 h** | Calibration in legacy's words; the Architectural, Engineering and Metric presets; custom scales, which need a table and an api; the guards; the green or amber chip. Two fixtures, plus B seeing the new scale in a second |
| **Block F** (S17 to S19) | **1.5 to 2 h** | Mostly driving what exists on the new canvas: the F8 fixtures and `useLiveItems`. F3's `can()` promise in takeoff, and the two-window check, one new fixture |
| **F5 close** | **1.5 h** | The full tier (about 1 h at 3 at a time), PARITY, the board, the archive, the mirror |
| **E, F and the close** | **5 to 6.5 h** | Against 7 to 9 h on the old pace |

## Findings

- **Cold open was the dev server (resolved by D-49).** On the production build the first
  pdf.js paint on a cold page is a median of about 0.5 s, of which 0.3 to 0.5 s is
  fetching and opening the page's PDF. Legacy's ~200 ms is still about twice as fast.
  The rest is the page's own GET and pdf.js starting its worker. The fit image covers the
  wait, and the prerender takes it to 9 ms for the next sheets.
- **Most of the old ~12 s was a PNG.** The old path drew the page 3072 px wide,
  PNG-encoded it and loaded it back as an image. Now it draws straight into the canvas.
- **Legacy's prerender queue** moved from Block C to Block D, where it is built.
- **The panel reads "1,600 SF", not "1,600.00 SF".** The quantity is exact; its format is
  F6's.
- **Event delivery's tail under load.** PATCH → event heard: p90 504 ms, max 1.6 s with
  4 fixtures running (idle: 45 ms, 53 ms). f8-s16's "within 1.5 s" failed once at 4 at a
  time (1,617 ms) and passes at 3. Not chased inside the timebox. The logging fix below
  did not move it.
- **`waitFor` let a probe's error escape.** A fetch refused while the api restarted ended
  the wait at once. It now counts as "not yet", and the last error is named on timeout.

## Commits (all on `umer-dev`, pushed; `main` untouched)

| Repo | Commit | What |
|---|---|---|
| infra | `fd74c4a` | Fixtures run in parallel, in two tiers (D-44); D-45 logged; mirror |
| api | `6a4a07a` | D-45: one preparation job per file, in slices; `/health/code` serialised |
| api | `526ba6a` | D-46: draft and cursor frames limited by rate over time |
| infra | `79abbcf` | f8-s13's flood step; mirror |
| app | `61ae2a7` | The invited signup holds for its seat; the default workspace is kept |
| api | `5d6025e` | The bench api logs our code at debug, not the libraries |
| infra | `3076742` | 3 at a time, measured; the runner hardened; fixture causes; mirror |
| app | `429686e` | **F5 Block C** |
| api | `c4dd888` | One call signs every sheet |
| infra | `420bd57` | Block C's fixtures, timing fixtures serial, docs, mirror |
| api | `a2c5194` | **F5 Block D**: the panel's calls; sheet deletes keep the last-shape rule (D-48) |
| app | `876a2e5` | **F5 Block D**: the sheets panel, legacy's prerender, the production image (D-49) |
| infra | the commit carrying this report | `f5-s13`, `f5-s14`, the `prod` profile, `FX_APP`, docs, mirror |

## Decisions to review

- **D-44** (the founder's instruction): parallel runs and two tiers. Default 3 at a time,
  as measured.
- **D-45:** one preparation job per drawing file, in slices of 5 minutes. A page the soft
  time limit stops is marked failed. Found on your JHS VOL 4 set; see "Missing" above.
- **D-46:** draft and cursor frames limited by a token bucket (10 a second, up to 10 at
  once) instead of a strict one-second window.
- **D-47:** S12's AC2 amended. An unprepared page waits for the worker and is never read
  from the set, as D-41 requires. **Accepted by the founder, 2026-09-27.**
- **D-48, decided in Block D following legacy, pending your review:** deleting sheets keeps
  legacy's last-shape rule. The shapes on them go. An item with shapes elsewhere stays,
  moved there. An item with none left goes, its last quantity handed to the estimate.
  Emptied folders go. Deleting needs Edit takeoff and Upload documents.
- **D-49** (your instruction): the built app behind nginx on :5175, the `prod` profile.
  Timing fixtures report there.

## Click-only checks

Sign in at http://localhost:5173 as estimator@bench.intelcost.io and switch to "F5 Block A
demo 15:16". Use any project with loaded sheets that aren't your JHS sets, or load a page
from any PDF with Add sheets. (Your Bench Construction Riverside has old PNG sheets, which
show the fit image only.) **IDM-on** marks the checks to make with IDM running and its
extension on.

**F5 Block D** (the panel is on the left of takeoff). Block C's list below is kept for
the record; you passed it.

1. **The tree.** Open a project whose files sit in folders. The panel shows those
   folders, nested, with the open sheet's row highlighted. Click another row: that sheet
   opens and the highlight moves.
2. **Search.** Type part of a sheet number, then part of a name, then the name of
   something you measured: each time only the matching sheets remain. Type nonsense: it
   reads No sheets match "…". The × clears it.
3. **Rows.** A calibrated sheet shows its scale chip, a sheet with measurements a green
   count, and a bookmarked one a star.
4. **Thumbnails.** ⋮ → Thumbnails. The pictures fill in as you scroll, not all at once.
   Hovering a tile says "Switch to List view to reorder pages". ⋮ → List to go back.
5. **IDM-on. Next sheet instantly.** Open a sheet and wait a couple of seconds. Click the
   row below it: it appears crisp at once, with no blurry stage. Hover a row further down
   for a moment, then click it: the same. IDM doesn't pop up.
6. **Rename.** Double-click a row: two fields, "A-101" and "Sheet name". Type, then Save.
   The row reads the new name, and it survives a reload.
7. **Two windows** (A on 5173, B on 5174, the same project). Rename in A: B's panel
   changes within a second, with no reload.
8. **Drag.** In List view, drag a sheet above another in the same folder. The order
   holds after a reload.
9. **Select several.** Ctrl-click two rows, then Shift-click a third: a range is
   selected. Right-click one of them: "N sheets selected", with Bookmark selected, Remove
   bookmark from selected, Move selected to (Root and every folder), Clear selection and
   Delete selected pages. Esc clears the selection.
10. **Delete.** On a throwaway project, select two sheets with measurements → Delete
    selected pages. The dialog names how many items lose measurements, and those that
    will be deleted entirely, and ends "This cannot be undone.". Confirm: "Deleted 2
    sheets". If one was open, takeoff moves to the next sheet.
11. **The production build.** http://localhost:5175 is the built app, as production will
    serve it. A cold sheet turns crisp in about half a second there. Sign in again there,
    since each port keeps its own session.

**F5 Block C** (passed)

1. **IDM-on. Open a loaded sheet.** It shows at once, then turns crisp within a second or
   two as pdf.js draws over it. IDM does not pop up, and nothing downloads.
2. **Zoom with Ctrl and the wheel, all the way in.**
   - Every time you stop, lines and text turn crisp within a moment.
   - It stops at 4000%. At 4000% a thin line is still one crisp pixel wide, not a blur.
3. **The buttons.** "+" goes 125%, 150%, 175%, 200%, then 250%, 313%… up to 4000%. "−"
   comes back down and stops at 50%.
4. **Pan at 4000%** (drag with Select). When you let go, the newly shown part turns crisp a
   moment later.
5. **Switch to another sheet and back** (address bar or Add sheets). Coming back is
   instant and crisp, with no blurry stage.
6. **IDM-on. Add sheets → load one new page.** "Preparing the sheet" for a few seconds,
   then the page, crisp in about 4 to 5 seconds from the Load. IDM does not pop up.
7. **Measure on a calibrated sheet at 400%.** Draw a line along a drawn edge: it sits on
   the edge, and the quantity matches what it read at 100%.
8. **Two windows** (A on 5173, B on 5174, the same sheet). A draws slowly: B sees the
   draft over the crisp page, in the item's colour.

## Questions

1. **D-48.** Deleting a sheet takes the items with no measurements left anywhere, and
   the confirm names them first, as legacy did. Keep that, or should deleting a sheet
   never delete an item?
2. **Block D's scope.** The panel offers only S13 and S14's acts; legacy's Auto-Name,
   Duplicate, Print, Rotate and folder editing wait for their features. Is anything
   there needed sooner?

_Answered 2026-09-27: yes to a production build sooner (D-49, done); D-47 accepted._
</content>

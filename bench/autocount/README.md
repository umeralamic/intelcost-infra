# The Auto Count benchmark (D-327)

The standing benchmark for Auto Count's Image mode: four fixed samples on two fixed sheet copies,
each scanned twice (a first scan from cold, the next straight after) and reviewed at 70 % and
38 % against the truth.

## Run it

1. Start the production preview: `docker compose --profile prod up -d --build app-prod` (from
   `intelcost-infra/`). It is built with `VITE_BENCH=1`, which adds the page, and serves this
   folder at `/bench-fixtures/`. Never the dev server: its numbers are not production's.
2. Open <http://localhost:5175/bench/autocount> in Chrome and press **Run**. No sign-in.
3. The table: per test the review at 70 % and 38 % as *checked right / checked wrong*, then any
   true symbols missed and the suggestions shown unchecked; "Same as truth"; the first-scan and
   next-scan times; the page's peak JavaScript heap. Also on `window.__autocountBench` and in
   the console (`console.table`). `window.__autocountBenchDetail` holds every checked and
   suggested box with its score, and the true symbols missed.

Options: `?opencv=4` runs with another OpenCV worker count (the shipped one is 1, D-316 as
amended); `?only=c` runs one test; `?only=c&box=x,y,w,h` tries another sample box for it.

Memory beyond the page's heap (the scan's workers live in the tab's renderer): sample the
renderer processes' private bytes from the OS while it runs, as the overnight reports do.

## The fixtures

- `E101.sheet`: page 25 of the Hidden Valley Spec Building bid set (Electric Lighting Plan),
  a read-only copy of the founder's sheet. `E200.sheet`: Waxing City's only page (E200,
  Lighting Plan / Schedules / Notes). PDFs, named `.sheet` and served as
  `application/vnd.intelcost.sheet`, as the app serves sheets (D-42): a download manager on the
  bench host takes anything that looks like a PDF and answers the page with an empty 204.
- `manifest.json`: the four tests, each a sample box and its truth points. Boxes and points
  are fractions of the sheet as it shows (its rotation applied: E101 is turned 270°).

| Test | Sample | Truth |
|---|---|---|
| E101 office "A" | one fixture of the A8 office plan with its "A" (inside a room) | the plan's 68 "A" tags (the two border grid letters left out) |
| E101 "C" with tag | one circle with its "C" in the E8 shop bay plan | 26 tags: 24 "C" + 2 "C/NL" |
| E200 A (hatched) | one type A 2×4 in the plan | 12 type A outlines (two inner lines round the hatched lamp) |
| E200 A1 (empty) | one type A1 2×4 in the plan | 6 type A1 outlines (the inner outline only) |

A checked match counts as right when its box, a fifth wider each way, holds a truth point not
already counted (E101: the tag's centre; E200: the outline's centre). The truth was read off the
sheets' text and drawings; the samples were chosen on 2026-10-10 by trying instances and keeping
the one each test reviewed best with (D-327). Change a sample only deliberately, and say so:
the point of the benchmark is that every run uses the same ones.

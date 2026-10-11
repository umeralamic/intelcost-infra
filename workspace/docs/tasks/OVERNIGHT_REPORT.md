# Day report, 2026-10-11

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after every block. Last night's files are
archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-11.md`.

**Bench at 04:47 UTC:** api healthy; worker, page pool and previews answer a Celery ping; beat
scheduling; nothing had died. `app-prod` was stopped (started for measurements). **Browser tool:**
the Playwright MCP connects and drives the app; smokes run on the throwaway
`fx.day1011.a@bench.intelcost.io`.

| # | Block | State | Commits |
|---|---|---|---|
| 5 | Drop stashes | **done**: `overnight-simd`, `overnight-simd2`, `overnight-cnl` dropped (app has no stash) | — |
| 2 | "C" next-scan re-measure | **done**: machine load; the change's own cost cut where it was largest | app `1148f60`, infra `3b1a49a` |
| 1 | Sheet delete storage | **done**, 19 orphans deleted | api `ce1ea15`, infra `22d3094` |
| 3 | Auto Count fill check | **done**, contract met | see block 3 |
| 4 | First page before the whole file | not started | |
| 6 | Stretch: Duplicate project | not started | |

## 1. Sheet delete storage (D-347)

- **Sheet delete** (`drawing/service.py` `_queue_sheet_storage`, called from `delete_sheets` before
  the rows go): each sheet's `takeoff/{ws}/{project}/{sheet}/` prefix (every `v<n>` image and
  `symbols/*`) and its split `pages/{file}/{page}`, unless a sheet that stays reads the same split,
  are logged with `storage_clear.queue` in the delete's transaction: D-341's dispatch clears them
  after the commit and nightly pass 0 if that is lost. The Sheets panel's delete and the Load's
  Cancel remaining share this route.
- **Re-prepare** (`prepare._prepare_page`): writing `v<n+1>` logs `v<n>/` and the Auto Count index
  built on it (`symbols/*-t<n>`, listed) for clearing in the same transaction.
- *(call, not in the brief)* **A page cancelled while it was being prepared:** the task had already
  written its split and images when its commit failed, so they had no row and the delete's clear
  could have run first. It now logs a clear of what it wrote (`_clear_abandoned`).
- **Comment fixed** at `drawing/routes.py` (`_symbol_index_key`): says which code clears the index.
- **The 19 orphans deleted** (15,026,435 bytes) with a new `--workspace <uuid>` option on
  `drives/delete-orphans.py` (lists unless `--delete`): the 13 sheet images and the index of the six
  deleted sheets and their 6 splits, exactly last night's list; re-run shows 0. Every key is in
  `E:\bench-backups\orphans-deleted-2026-10-11-u-workspace.txt`:
  `takeoff/60edce3e-…/6ce25834-…/{033e23c2,29ab5a2c,40834193,4c2648c4,689fc6a3,7ff620d2}-…/v2/{fit,thumb}.webp`,
  `…/7ff620d2-…/symbols/symbols-1-t2`, `…/pages/{8ebf44cc,9bbd5644,9e38cf95,b1c442ba,daac240c,e89886a5}-…/1`.

**Smoke** (throwaway, dev app and bench worker):
- *Re-prepare:* the E200 copy at v2 with `symbols-1-t2`, put back to pending and prepared again as
  Retry does: afterwards only `v3/fit.webp`, `v3/thumb.webp` and the split; the clear ran 2 s after
  the commit (`failed: 0`).
- *Sheet delete:* the same sheet (now `v3/` and `symbols-1-t3`) deleted from its row menu ("Delete 1
  sheet?"): its prefix and its split gone 2 s later; the project file's preview stays (it is the
  file's).
- *Cancel remaining:* a 16-page throwaway PDF loaded, cancelled when page 1 was Ready (page 2
  preparing, 3–4 being read, 5–16 queued): the 3 sheets that stayed (pages 1, 3, 4) keep their images
  and splits; page 2, whose prepare finished 8 s after the cancel ("gone"), left no prefix and no
  split; the queued pages wrote nothing. **Passed.**

**Gates:** ruff format, ruff check, mypy (203 files) clean; alembic check clean; quantity table 329
rows, passed.

## 3. Auto Count fill check (D-348)

**Interior ink share** (the middle half of the window; production build, `?fill=off`):

| Test | Sample | True matches | Look-alikes |
|---|---|---|---|
| office "A" | 0.243 | 0.188–0.302 | — |
| "C" | 0.301 | 0.270–0.345 | — |
| E200 A (hatched) | 0.185 | 0.180–0.189 | its 4 suggestions at 38 % (0.50): 0.000, the empty outlines |
| E200 A1 (empty) | 0.000 | 0.000 | the 5 hatched type A at 0.75: 0.169–0.183; more under the cap: 0.188–0.197 |

**Built:** `fillCheck.ts` (pure): a clear mismatch differs by ≥ 0.12 **and** by a ratio ≥ 2.5 (0.03
added to each share). True matches differ by ≤ 0.059 (ratio ≤ 1.25), look-alikes by ≥ 0.169 (ratio ≥
6.6). A mismatch is treated like lettering by the review: never checked or suggested, in the drawer.

**Benchmark, production build** (right / wrong, missed, suggestions; first / next scan):

| Test | Before 70 % | Before 38 % | **After 70 %** | **After 38 %** | Before | After (run 1; run 2) |
|---|---|---|---|---|---|---|
| office | 68/0 | 68/0 | 68/0 | 68/0 | 16.2 / 15.2 s | 14.7 / 13.3; 14.4 / 12.7 s |
| "C" | 24/0, 2 missed | 24/0, 2 missed | 24/0, 2 missed | 24/0, 2 missed | 24.1 / 21.5 | 22.2 / 21.3; 23.5 / 21.8 |
| E200 A | 12/0 | 12/0, 4 sugg. | 12/0 | **12/0, 0 sugg.** | 33.6 / 31.0 | 33.1 / 30.5; 32.8 / 31.0 |
| E200 A1 | 6/0, 5 sugg. | 6/0, 5 sugg. | **6/0, 0 sugg.** | **6/0, 0 sugg.** | 9.3 / 7.9 | 8.9 / 7.5; 8.4 / 7.1 |

(These runs were on a working bench, so the times sit above block 2's quiet ones.) `?fill=off` on
the same build reproduced the old review exactly, at the same times: no measurable cost. **Contract:**
checked sets identical box by box and score by score with `?fill=off` on all 8 test × sensitivity
pairs; every remaining suggestion is in the fill-off set; nothing kept out on office or "C". Target
met: A1 6/0 with no hatched-A suggestion, and A suggests no empty A1.

**Gates:** app lint, typecheck, build OK; quantity table passed (8 Auto Count rows right). **Smoke**
(dev app, throwaway): the E200 copy, one A1 boxed, Image mode → Create (6), five 100 % and one 97 %,
and no 75 % suggestions (the hatched A are in the drawer): **passed**.

## 2. Auto Count "C" next-scan re-measure (D-346)

Run first, on a quiet machine: the dev server, api, workers, beat and marketing stopped for the
measurement (they poll the Windows share; the Docker VM sat at a load of 10–11), only `app-prod`
serving, host near idle. Production build, 3 runs each, interleaved:

| Median (range) | "C" first | **"C" next** | office next | E200 A first / next | A1 next |
|---|---|---|---|---|---|
| Shipped (D-343) | 15.2 s | **13.6 s** (13.2–14.5) | 8.0 s | 23.8 / 21.0 s | 4.4 s |
| `?exact=0&solo=off` (before D-343) | 14.3 s | **12.6 s** (12.6–13.0) | 7.9 s | 22.0 / 19.7 s | 4.0 s |

**Verdict: machine load.** Quiet, every scan runs about twice as fast as last night's figures, and
"C" next is 12.6–14.5 s either way, not 17.5 → 23.9. **The change has a cost of its own**, though:
on "C" alone, 3 × 3 runs isolate it to the exact search (shipped 13.6 s, `?exact=0` 13.0 s, the
one-size consensus nothing), and E200 A pays about 1.3 s.

**Cut, results unchanged:** the exact search now skips, per size, the strong peaks where the grid
already found a hit of that size within the peak's error. Box-by-box and score-by-score comparison
with the D-343 search (`?exactall=1`), 3 runs each, all four tests, 70 % and 38 %: **identical**.

| Next scan, median of 3 | E200 A | office | "C" | A1 |
|---|---|---|---|---|
| D-343 search everywhere | 20.8 s | 8.1 s | 12.9 s | 4.0 s |
| **Skip where found** | **19.9 s** | **7.7 s** | 13.0 s | 4.2 s |

"C" and A1 are within the ±0.5 s noise. Reviews on every run: office 68/0, "C" 24/0 (2 C/NL),
E200 A 12/0, A1 6/0 (5 suggestions).

**Gates:** app lint, typecheck, build OK; quantity table 329 rows, passed. **Smoke** (dev app,
throwaway): an E200 copy dropped on the empty start, boxed one A1, Image mode → Create (6), five at
100 % and one at 97 %, the same as last night: **passed**.

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
| 3 | Auto Count fill check | **done**, contract met | app `c32575b`, infra `a31c71a` |
| 4 | First page before the whole file | **done**: first sheet 225 → 45 s on a 117 MB set | see block 4 |
| 6 | Stretch: Duplicate project | **done** | api `ea15889`, app `ae9c6a3`, infra `f4617be` |

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

## 4. First page ready before the whole file downloads (D-350)

**Built:** the first ticked page of a stored PDF is prepared from ranged reads: pypdf (strict) reads
through ranged GETs only what MuPDF needs to open the file and split that page, into a sparse copy on
the worker's disk, and the page is prepared from it by the same MuPDF code as from the whole file.
After preparing, if MuPDF repaired the file or touched any object not read, or pypdf warned, the
result is dropped and the page comes from the whole file. The rest of the pages as before (the whole
file fetched once onto the disk, now after page 1). `RangedObject` fetches a contiguous run in one GET
and can prefetch side by side.

**Time to the first sheet ready** (Load to page 1 ready; "before" = the whole-file fetch + page 1):

| File | Size / pages | Link | Before | **After** | Read for page 1 |
|---|---|---|---|---|---|
| Vol2 plan set (bench copy) | 117.4 MB / 96 | bench S3, ≈0.45 MB/s ("throttled") | 225.3 s | **45.3 s** (page 48: 18.8 s) | 17.5 MB, 34 requests |
| Vol1 plan set (bench copy) | 114.5 MB / 41 | bench S3 | 234.6 s | **55.3 s** | 16.5 MB, 25 requests |
| Office Building set | 24.7 MB / 28 | bench S3 | 36.7 s | **17.3 s** | 2.5 MB, 18 requests |
| Dense test file (three sets joined) | 155.0 MB / 95 | local MinIO ("normal", fast) | 3.9 s | 5.2–7.2 s | 22.2 MB, 111 requests |
| Same, with object streams | 154.9 MB / 95 | local MinIO | 3.8 s | 3.2 s | 16.1 MB, 18 requests |
| Vol2 / Vol1 | 117 / 114 MB | local MinIO | 2.5 / 3.6 s | 7.4 / 5.2 s | |

On a fast link the ranged path is 1–4 s slower (pypdf and the requests: the floor); on the bench's
real link it saves roughly the file size over the page's bytes. All-pages-ready comes later by the
ranged time. *(The bench's Vol1/Vol2 are copies in the "Test 3" project; nothing of the founder's was
read.)*

**Identity** (repo code, ranged against whole-file): 34 pages of 9 PDFs — the dense file (pages 1,
20 rotated 90, 41, 45, 60 and 80 rotated 270, 95), its object-stream version, the office set (incl.
rotated), Hendrick (rotated 270), an incremental save that changed a rotation, scanned image-only
pages, Elec Vol 4, Vol1, Vol2 (incremental save with dangling references): identical split (but its
fresh `/ID`, which differs between two whole-file runs too), fit and thumb bytes, decoded pixels,
size, rotation, text layer and name/scale read.

**Falls back to the whole file:** encrypted PDFs, broken cross-references (tested), image uploads
(wrapped first), a source already on the disk, misplaced objects (pypdf's whole-file hunt blocked),
any pypdf warning but the incremental-save one, and anything MuPDF repaired or read beyond what was
fetched (proved by leaving `/Outlines` out: "MuPDF parsed 38 objects not read"). Linearized PDFs: not
tested (no tool on the bench to make one); the check covers them.

**Smoke** (dev app, throwaway): a new 20-page file (benchmark fixture copies) loaded; the worker
logged "page 1 … from ranges, 2.0 of 9.5 MB in 25 requests, 11.3 s"; page 1 Ready 23 s after Load,
all 20 in 87 s; page 1 (ranged) and page 3 (the same drawing, whole file) have byte-identical fit and
thumb images and identical splits by size and rendering; sheet numbers, sizes, rotation (270) and
text layer as expected: **passed**.

**Gates:** ruff format, ruff check, mypy (206 files) clean; alembic check clean; quantity table
passed. **Separate finding, not changed:** the page-count read (`_ranged_sizes`) falls back to the
whole file on Vol2 (its lenient pass hunts the file for dangling references); treating a missing
object as null, as here, would fix it.

## 6. Stretch: Duplicate project (D-349)

**Built:** All projects ⋯ › **Duplicate project** (anyone who may create projects; the plan's project
cap as New project). The request decides the workspace's first active status and queues a Celery
job; a toast shows "Reading", "Copying files N %", "Copying takeoff N %"; when it is done the copy
opens. The job (`project/duplicate.py`) is one generic copier over the model metadata:
- **Copied:** the project ("<name> (copy)", then "(copy 2)", …; status reset, no submitted / awarded /
  lost / follow-up history), project folders, files and their pages, drawing folders, files, sheets,
  naming templates, calibrations, markups, registrations, sites, earthwork assumptions, results,
  reviews, strip areas, takeoff layers, folders, items, dimensions, geometries, cost components,
  variable values, snippets and links, estimate lines, bid rates, custom columns and values, unit
  wastage, equipment, fill materials, subcontractor overrides, wage sets, craft and crew rates, wage
  determination imports, assignees.
- **Not copied:** visits (Recent), item events and work sessions (activity), AI calls and schedule
  reads, share links, render jobs, and the estimate lines' comments *(call: the only comment field a
  project has; notes are kept)*.
- **How:** every foreign key into a copied table remapped (self references in a second pass); every
  string and JSON value has each copied row's uuid replaced by its new one, which rewrites the
  storage keys (all sit under their project's uuid: checked on all 3,765 key values the bench's project rows hold) and JSON references;
  objects copied inside S3 first (orphans skipped), then all rows in one transaction; on failure the
  copied objects are logged for clearing. Seen working: the first UI run failed on a NULL-binding bug;
  its copied objects were cleared (`failed: 0`) and nothing half-made appeared.

**Check of a copy** (script on the bench, throwaway project with 3 sheets from a 16-page file, an
Auto Count item and a priced estimate line): every table's row count equal (layers 3, folders 1,
project files 2, drawing files 2, file pages 17, sheets 3, items 1, geometries 6, estimate lines 1);
no foreign key of the copy points into the original; no value of the copy names the original project;
29 objects → 29, all 30 keys the copy names present; the estimate line equal in every value but its
own uuid references.

**Smoke** (dev app, throwaway): ⋯ › Duplicate project → toast progress → "E200 day copy (copy 2)"
opened in 12.6 s on its first sheet, drawn; the same 3 sheets and "A1 fixtures dup smoke" 6 EA;
Estimating total $75.00 in both; unit cost changed to $20 in the copy → copy $120.00, original still
$12.50 / $75.00; the copy trashed and deleted permanently from Settings › Trash → its prefixes 0
objects, the original's 29 untouched: **passed**.

**Hardening after the commit** (`read_rows` split out so a dry run reuses it): the copier's rows run
inside a transaction and rolled back, no objects copied, on the bench's richest non-founder
projects. Marketing Demo – Site 231 rows (an earthwork result, assumptions, review and strip area),
Riverside Medical Center 135 (cost components, wage sets with 68 craft and 208 crew rates), Marketing
Demo – Office Building 358 (28 sheets, markups, a registration), Test 3 228, Minmar 358, Hendrick Honda
66, Mirammar Cove 28 (a snippet): every table's count equal, no foreign key into the original, no
value naming the original: **no problems**. 27 of the 40 tables were exercised; these 12 hold no row
anywhere on the bench, so they are copied by the same rules but untested on real data: sites and
site members, site results, estimate custom columns and values, equipment resources and usage, fill
materials, subcontractor overrides, takeoff variable values, wage determination imports, snippet
links. UI smoke again after the change: "E200 day copy (copy)" duplicated in 14.9 s, opened: passed.

**Gates** (on the staged snapshot, the page-pool agent's unfinished files left out): ruff format, ruff
check, mypy (205 files) clean; alembic check clean; app lint, typecheck, build OK; quantity table
passed.

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

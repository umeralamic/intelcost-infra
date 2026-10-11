# Day report, 2026-10-11

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after every block. Last night's files are
archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-11.md`. **Every block of the brief and the
stretch item were done and pushed by 07:10 UTC**; the time after went to hardening what shipped
(Duplicate project dry runs on seven bench projects, Choose pages' sizes from ranges, a work-disk leak
the cancel smoke found). Closed at about 08:05 UTC. *(call)* Nothing in the brief was left, so I did
not start features it did not ask for.

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
| 4 | First page before the whole file | **done**: first sheet 225 → 45 s on a 117 MB set | api `1da98e2`, infra `82355e6` |
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

**Found later in the day, fixed (D-347 5):** the cancel smoke left the 16-page file's whole source on
the page pool's disk: a page cancelled mid-prepare returned before the "no page left, drop the source"
step (the sweep's day-old clear would have taken it). That page now drops the source when its file
has none left to prepare. Smoke on a second throwaway account: a 16-page Load cancelled with pages 2–5
preparing and 6–16 queued; the disk was empty 4 s after the last in-flight prepare ended ("gone"):
**passed**. Gates and quantity table passed. api `598472d`, infra `0c805b0`.

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
passed.

**Follow-up, Choose pages' sizes (D-351):** the page-count and size read fell back to the whole file
on the big sets (pypdf's lenient open reads every object's header: most of a 115 MB file). Now strict
first, no whole-file hunt through ranges, missing references null, and boxes read exactly as MuPDF
reads them, which also fixed a wrong stored crop box on pages whose media box does not start at 0.
Identical to the full read on all nine PDFs (api `1ffbd14`, infra `affd7de`). Bench link: **Vol2 191 s of ranges + the whole file (~225
s) → 1.16 MB, 16 requests, 7.8 s; Vol1 243 s + the whole file → 0.65 MB, 8 requests, 4.1 s.** Smoke: a
new 20-page upload listed with 20 pages 21 s after it was chosen, sizes and rotations right: passed.
Gates clean.

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
value naming the original: **no problems**. Then, in the throwaway project, an estimate custom
column with a value and a shared equipment resource made through Estimating, and the dry run again:
104 rows, no problems. 31 of the 40 tables exercised; these 9 hold no row anywhere on the bench, so
they are copied by the same rules but untested on real data: sites and site members, site results,
equipment usage, fill materials, subcontractor overrides, takeoff variable values, wage determination
imports, snippet links. UI smoke again after the change: "E200 day copy (copy)" duplicated in 14.9 s, opened: passed.

**Gates** (on the staged snapshot, the page-pool agent's unfinished files left out): ruff format, ruff
check, mypy (205 files) clean; alembic check clean; app lint, typecheck, build OK; quantity table
passed.

## Cleanup

- **Throwaway workspaces purged** through the guarded script (`bench-workspaces.py purge-owner`):
  `fx.day1011.a@…` (workspace `2306d429-88fc-4cc4-844f-8978e768b27c`, with the duplicated copies in
  it) and `fx.day1011.b@…` (`193239d0-19a0-4a95-8eda-44c277626c7d`). Both list every prefix at 0
  objects: project-file, takeoff, intake, scope-doc, trade-scope-doc, subquote, assembly-screenshot,
  workspace-logo (open multipart uploads not visible to our IAM).
- **Founder projects never written.** Auto Count used the benchmark fixtures and throwaway copies;
  block 4 read copies in Test 3 and the marketing demos; Duplicate project's dry runs (rolled back)
  used only non-founder projects.
- **Scratch removed:** tonight's MCP files and smoke PDFs under `E:\Intelcost`, scripts in the api and
  worker containers, the page pool's work disk (empty), the scratchpad. `app-prod` stopped; the bench
  services stopped for block 2's quiet measurement were started again at 05:19.
- **Stashes:** none (block 5 dropped the three). All four repos clean on `umer-dev`, even with origin.

## Decisions made on your behalf (all in DECISIONS; closed 2026-10-11, confirmed by Umer)

- **D-346:** the quiet machine for block 2 meant stopping the bench's dev server, api, workers, beat and
  marketing for the measurement (restarted after); the exact search's cut keeps results identical box
  by box rather than trading any.
- **D-347:** a page deleted *while* it is being prepared (Cancel remaining mid-prepare) also clears what
  its task wrote: not in the brief, the same gap. The 19 orphans deleted through a new
  `delete-orphans.py --workspace` option; every key kept in `E:\bench-backups\`.
- **D-348:** a fill mismatch is treated as lettering is (never checked, never suggested, in the drawer)
  rather than scored down; thresholds 0.12 and ×2.5, about 2× from each side of the measured data.
- **D-349 (stretch):** what "settings" covers (bid rates, wastage, custom columns, wage sets and rates,
  equipment, fill materials, subcontractor overrides, naming templates, assignees); comments = the
  estimate lines' `comment_text`, left empty; share links, AI history, render jobs and activity not
  copied; a copy of "X" is "X (copy)", then "(copy 2)"; created by the person who duplicates; the plan's
  project cap applies.
- **D-350:** only the first page takes the ranged path (the rest still need the whole file, which now
  starts after page 1, so all-pages-ready is later by the ranged time); any doubt falls back.

- **D-351 (follow-up, not in the brief):** Choose pages' sizes read strictly first and never hunted
  through ranges; page boxes now read exactly as MuPDF does, which fixed stored crop boxes on pages
  whose media box does not start at 0.

## For your click check

1. **Sheet delete:** in a throwaway project, delete a sheet; within seconds the bucket holds nothing
   under its `takeoff/<ws>/<project>/<sheet>/` prefix and its split page is gone (the worker logs
   `clear_storage_log … {'failed': 0}`).
2. **Auto Count, E200 A1:** box one empty A1, Image mode: 6 checked, no 75 % hatched suggestions (they
   are in "Show N low-confidence matches"). E200 A: no empty-outline suggestions at 38 %. Bench:
   `?fill=off` shows the old behaviour.
3. **Duplicate project:** All projects ⋯ › Duplicate project on a project of yours (not a founder
   project if you want to keep them untouched): the toast counts up, the copy opens; change something
   in the copy and the original stays.
4. **A big Load:** the first sheet you tick shows Ready long before the rest (a 117 MB set: 45 s, not
   4 minutes, on the bench's link).

## For Abdullah

- **A new Celery task**, `app.worker.tasks.projects.duplicate_project`, on the default queue (the main
  worker). It copies objects inside S3 with 16 threads (`CopyObject`, same bucket): the IAM user needs
  `s3:GetObject` and `s3:PutObject` on the bucket for server-side copies (it already lists and deletes).
- **Ranged reads:** the page pool now opens a Load's first page with ranged GETs (up to 8 in parallel,
  about 25–35 requests for a page); the bucket must allow `Range` requests (it does today).
- The 19 orphan objects in "U.'s workspace" are deleted (15.0 MB); the weekly report should now list
  none there.

---

# Follow-ups, 2026-10-11 afternoon (14:00 → 16:10 UTC)

Run in the order asked: item 3 first (its copy served item 0's smoke), then 0, 1, 2. Every block passed
its gates (ruff format, ruff check, mypy 206 files, alembic check; app lint, typecheck, build) and the
quantity table (329 rows, passed).

| # | Item | State | Commits |
|---|---|---|---|
| 3 | Duplicate project with earthwork | **done**; found and fixed a real bug (D-354); copy deleted, original identical | api `a50773d`, app `01a4ca1` |
| 0 | Earthwork rows: icon, Resume, guards | **done** (D-352) | api `ac863f5`, app `01a4ca1` |
| 1 | Ranged first page only where it helps | **done** (D-353) | api `027ae8d` |
| 2 | Crop-box backfill | **done**: 83 rows fixed, 17 reported only | data only (no code) |

Workspace: D-352 to D-354, CLAUDE.md rule 10, SINCE_ARCHIVE rows (infra `b7b8dc1` and the close-out commit).

## 3. Duplicate project with earthwork

- **Fingerprint first**, read only: every copied table's rows hashed exactly and by content, the
  earthwork result (cut 11,483.74, fill 9,596.09 CY), the 27 items' quantities and the 17 lines' stale
  flags, the storage key list with sizes and ETags (118 objects).
- **One copy**, made in the UI as Bench Estimator: "Hidden Valley Spec Building Rebid (copy)". Against
  the original: every one of the 40 tables the same rows by content, the earthwork result, sites (none),
  fill materials (none), equipment usage (none), the item quantities and the lines' stale flags equal;
  118 objects copied. Estimate: the project has no estimate lines.
- **Bug found and fixed (D-354):** opening the copy marked all 17 lines "Needs recalculating", which the
  original never does. The version key hashes row uuids (Site Features, Strip Areas, linked sheets), and a
  copy has new ones. The copier now writes each copied result's aliases (new uuid → old) and the app
  reads the key through them; the next Calculate clears them. Proved on the copy put back in a fresh
  copy's state (the original's key, the 36 aliases, the original's swell): all 17 lines stayed current.
- **The 9 untested tables:** this project has no rows in any of them, so, as agreed, test rows were made
  for the copy inside one transaction (site, 2 members, a site result, equipment resource and usage, fill
  material, subcontractor override, a variable value with the one workspace variable it needs, a wage
  determination import, a snippet and its link), the copier read and inserted the copy in the same
  transaction, and everything was **rolled back**. Every table 1 → 1 (members 2 → 2), no foreign key into
  the source, no value naming its rows, the site result's key and JSON rewritten with 36 aliases, the
  usage pointing at the new item, the variable value keeping the workspace's variable. Afterwards none
  of the test rows exists.
- **Deleted at the end:** Trash, then Delete permanently, as Bench Estimator. Its 8 storage prefixes list
  **0 objects** (`clear_purged_storage … {'failed': 0}`).
- **The original after:** identical to its first fingerprint (all 40 tables row for row, 118 objects by
  size and ETag) but for two things outside it: the two new columns (`placed_by_hand` false,
  `key_aliases` null) that today's migrations added to every row, and **two Auto Count index caches**
  (`symbols/symbols-1-t2` on C-200 and on E101). *(incident)* The app opened the original twice: sign-in
  landed on its last sheet (C-200), and a later visit to `/signup` while signed in redirected to its E101.
  Each open builds that sheet's index. The DB was untouched both times. Per your decision they are left
  and excluded; after the second I signed in with `?next=` straight to the copy.

## 0. Earthwork rows (D-352)

**Why it happened:** the new app had no notion of a calculated item. `TypeGlyph` drew every unknown
type as Linear, and only the inputs' types were kept from Resume.

**Now:**
- **Icon:** the excavator (legacy's `EarthworkIcon`) on every earthwork row, 4 inputs and 17 lines on C-200,
  never a button. Site Features keep the area glyph and Resume, as legacy.
- **A calculated line** (`isCalculated`, by `source_type`, so Prepare Subgrade counts):
  - no Resume, and the name is read only;
  - ⋮ offers Details, Link Screenshot, Move to layer, Add cost component, Costs… and History;
  - the right-click now offers Change classification;
  - a double-click opens a read-only view: what wrote it, when, its quantity, the surfaces read (here the
    boundary, existing grade linked from V-100, FG Spots and Proposed Grade), and Open earthwork site.
- **The api refuses** rename, override, delete (single and bulk), duplicate, Make Site Feature, dimensions,
  sub-items (so Link assembly), Save as assembly, any geometry write and a client-made calculated item.
  Each gets a 409 "Calculated by earthwork. Change it from the earthwork site." Colour, notes, folder,
  code, layer, lock and review go through.
- *(call)* **A person's move survives Calculate:** a new `placed_by_hand` flag. Without it, the next Calculate
  re-filed the line, which would have undone the move you asked to allow.

**0f, the other places that act on items:**

| Place | Gap | Done |
|---|---|---|
| Bulk Duplicate / Delete everywhere | took calculated lines | leaves them out, says how many |
| Estimating "Add Sub-item" | offered on a line | hidden (api refuses too) |
| Make Site Feature (right-click) | offered on Prepare Subgrade lines | hidden (api refuses too) |
| Earthwork site's draw-target list | offered Prepare Subgrade lines as areas | leaves them out |
| Assemblies: Link, Save as | no check | api refuses; menu hidden |
| Calculate overwrote a person's folder/code | — | kept (`placed_by_hand`) |
| Duplicate project | copy's lines turned stale | fixed (D-354) |
| Auto Count | targets count items only | no gap |
| Copy/paste, Delete key, box delete | act on shapes; lines have none | no gap (api refuses geometry anyway) |
| Sheet delete | deletes the sheet's lines with it | intended, unchanged |
| Cost components, Estimating fields, snippet links | allowed by your list | unchanged |

Existing overrides on lines: none on the bench (0 rows), so nothing to migrate.

**Smoke** (MCP, the copy's C-200, as Bench Estimator):
- icons right for inputs and outputs, no Resume;
- a double-click on the name opened the details view, not a rename;
- ⋮ and the right-click menu hide the right entries;
- Change classification moved Remaining Site Cut from 31.04.01 to 31.04.02;
- 9 forced api writes got a 409 and colour got a 200;
- Calculate with swell 1.15 → 1.25 updated Haul Off 4,167.01 → 4,529.36 LCY and Soil Export 1,067.25 →
  1,160.05 LCY, cleared every stale flag, and kept the moved line on 31.04.02 and its colour.

**Passed.**

## 1. Ranged first page only where it helps (D-353)

The head of a Load takes ranges only when the whole file would come slower, on the link's measured rate.
That rate is timed from whole-file fetches, including the thumbnail task's on upload, so a Load nearly
always has one. A one-page file always goes whole. With no rate known, only a file over 50 MB takes ranges.

| link | file | before (whole) | ranged | chosen now |
|---|---|---|---|---|
| bench S3 | 4.5 MB, 1 page | 62.6 s | 19.4 s | whole (one page: ranges fetch it all) |
| bench S3 | 24.7 MB, 28 pages | 76.3 s | 13.1 s | ranged |
| bench S3 | 117 MB, 96 pages | 137.4 s | 67.1 s | ranged |
| local MinIO | 4.5 / 24.7 / 117 MB | 5.2 / 2.3 / 2.7 s | 4.5 / 6.6 / 6.0 s | whole, every size |

On the fast link "after" is the whole-file path, so it is no slower than before D-350.

**Smoke** (MCP, throwaway `fx.followup1011.a`):
- the rate was set by the upload's thumbnail task (0.28 MB/s);
- a 1-page Load prepared from the whole file in 12.6 s;
- a 28-page Load's page 1 came from ranges, 2.5 of 24.7 MB, ready 32 s after Load (the whole file was
  estimated at 83 s).

*(found by the smoke)* The first version estimated one page at 15 % of any file. A one-page 4.5 MB sheet
then went by ranges and fetched the whole file (21 s, against about 16 s whole); the page-count rule fixes
that.

**Passed.**

## 2. Crop-box backfill (D-351)

All 1,429 stored page measurements of 314 files, every workspace, were re-read with the current code:
**100 differ, every one on the crop box only, every one on a page whose media box is not at 0** (e.g.
media `[-1512, -1080, 1512, 1080]` stored as `[0, 0, 3024, 2160]`, now `[-1512, 0, 1512, 2160]`).

| Workspace / project | Rows | Done |
|---|---|---|
| U.'s workspace / Building A | 14 | fixed |
| MIKE's workspace / 01-PLANS | 35 | fixed |
| MIKE's workspace / Test | 17 | fixed |
| Mike's workspace / Building B | 17 | fixed |
| Bench Construction Test / Minmar | 17 | **reported only** *(call: your item 3 rule, nothing else written in that workspace)* |
| Founder projects (Hidden Valley Spec, Rebid, Waxing City) | 0 | none affected |

**Images:** nothing renders from this column (sheet images come from MuPDF reading the PDF itself; the
app ignores `crop_box`), so none needed re-preparing. A re-scan shows only Minmar's 17. The list as it
was before is in `E:\bench-backups\crop-backfill-2026-10-11-before.json`. *(incident)* The first apply
pass did not exclude that workspace. I stopped it, and its process, before it committed, and confirmed a
row unchanged; the pass that ran excluded it.

## Incidents

- **Prettier churn:** a stray `npx prettier` rewrote nine app files. They were confirmed free of anyone
  else's work, restored from HEAD and my edits re-applied by hand; CLAUDE.md rule 10 now forbids it.
- **The original opened twice:** two cache objects, as above.
- **The backfill's first apply:** stopped before committing, as above.

## Cleanup

- **Throwaway workspace purged** through the guarded script: `fx.followup1011.a@…` (workspace
  `827ae034-93ac-476a-b268-276866a676bd`). Every prefix lists 0 objects.
- **The copy:** deleted, its prefixes 0. **Scratch removed:** the smoke PDFs, MCP snapshots and container
  scripts. All repos are clean on `umer-dev`.

## Decisions made on your behalf (closed 2026-10-11, confirmed by Umer)

- **D-352:**
  - a person's placement of a calculated line survives Calculate (`placed_by_hand`);
  - Change classification is offered on lines;
  - Estimating's Add Sub-item and Make Site Feature are hidden on lines, and refused by the api;
  - bulk actions leave lines out;
  - Site Features keep their area glyph.
- **D-353:** the cost model (4 s plus 1 MB plus the page's share, 15 % or one page's), the thumbnail task timing the rate, and a
  one-page file always going whole.
- **D-354:** the copy-stale fix, beyond the brief, because it made every copy's earthwork look stale.
- **Backfill:** Minmar left as it is, being in the founder's workspace.

## For your click check

1. On a project with earthwork, C-200: the outputs show an excavator, clicking the icon does nothing,
   double-clicking a line opens its details, and ⋮ has no Delete.
2. Duplicate a project with earthwork: open the copy's grading sheet; its lines are not "Needs recalculating".

## For Abdullah

- **Two migrations:** `d352a4c1b7e9` (`takeoff_item.placed_by_hand`) and `d354b2e8c4a1` (`key_aliases` on both
  earthwork result tables). Both are applied on the bench.
- **A new Redis key**, `prepare:download_rate`, expires after 7 days; the page pool reads it before a Load's
  first page.
- **The crop-box backfill** was a one-off on the bench data; production needs the same re-read if it holds
  pages measured between 2026-10-08 and the D-351 fix. *(superseded below: use `drives/crop-backfill.py`)*

## Minmar's 17 crop boxes (D-355)

**Step 1, before the write:** the list is
[minmar_cropbox_before.csv](minmar_cropbox_before.csv). Seven of the 17 pages have a set scale or
measurements:
- six have a set scale: A1.01, A1.02B, A4.00, A4.01B, A9.20, A9.30;
- A4.00 also has 5 shapes, LF 1 241.70 LF and SLAB 1,335.22 SF.

I stopped there and reported. You approved the 17 boxes.

**Who reads the stored box** (searched in the api and the app):

| Where | What it does with it |
|---|---|
| `intelcost-app-fastapi/app/features/project/models.py:322` | the column |
| `intelcost-app-fastapi/app/worker/tasks/prepare.py:894` | written by the thumbnail task, from MuPDF |
| `intelcost-app-fastapi/app/worker/tasks/prepare.py:1151`, `:1161` | written by the size measure (Choose pages) |
| `intelcost-app-fastapi/app/features/project/routes.py:683` | returned in a file's pages |
| `intelcost-app-fastapi/app/features/project/schemas.py:362` | that response's field |
| `intelcost-app-react/src/core/api/types.ts:547` | the type |
| `intelcost-app-react/src/features/takeoff/components/load/LoadSheetsDialog.tsx:354` | set to `[]` on page entries the dialog builds itself |

No code computes a position, quantity or scale from it, so the write went ahead.

**The write:** `drives/crop-backfill.py --project <Minmar> --pages <the 17> --apply`, the crop box only. The
script's dry run first reproduced the before-list byte for byte. The value written is MuPDF's
single-precision box, `[-1512.1199951171875, 0, 1512.1199951171875, 2160]`, shown as
`[-1512.12 0 1512.12 2160]`. That is the same value the other 83 pages got and the one new uploads
store. No re-prepare, no new image, no bucket write.

**Checked through the api** (logged in as Bench Estimator; the project never opened in the app), against a
snapshot taken before the write:
- all 17 pages report the new box;
- the other 27 files' pages read the same (thumbnail links aside, which are fresh each read), and
  their 27 stored rows are byte-for-byte unchanged;
- the 17 rows changed in `crop_box` only;
- A4.00 reads 241.70 LF and 1,335.22 SF, as before;
- its 5 shapes' coordinates, shape data and versions are unchanged;
- all six scales are unchanged.

The after-list is
[minmar_cropbox_after.csv](minmar_cropbox_after.csv). A dry run on Minmar now lists 0 pages.

**For Abdullah, prod:** run the script from the api container. It lists only, by default:
`python drives/crop-backfill.py > before.csv`, optionally scoped with `--workspace`, `--project` or `--pages`,
and `--skip-workspace` or `--skip-project` to protect a customer. Review the list, then run it with
`--apply`. Its measurements and scales columns say which pages have takeoff on them; the stored box
changes none of those.

**Final checks:**

1. **The final, linted script against the before state.** One transaction set the 17 boxes back to the
   before-snapshot's stored values, then the script's dry run ran on that same session. Its output equals
   `minmar_cropbox_before.csv` byte for byte (`diff` and `cmp`). Then the transaction was rolled back; the
   17 rows still hold the corrected box. A dry run on the current state finds **0 pages**.
2. **Where the two writers get the box:**
   - **`prepare.py:894`, the thumbnail task:** opens the whole file with MuPDF and stores MuPDF's
     `page.cropbox` as is.
   - **`prepare.py:1151`/`:1161`, the size measure:** stores `_ranged_sizes`, which is pypdf reading the box
     as MuPDF does (`_page_size`, D-351). If that read fails it uses `_whole_sizes`, which is MuPDF's
     `page.cropbox`.
   - **One writer per row:** the measure runs first, and the thumbnail task skips pages already stored.

   **Proof:** hard rule 8 forbids writing tests, so this was the re-prepare route, never Minmar or the
   founder projects. A0.00B, the same drawing as Minmar's (media box `[-1512.12 -1080 1512.12 1080]`),
   was uploaded to a throwaway account, `fx.cropcheck1011.a`. Its page row was then cleared and each
   writer run on its own:

   | Source | Box stored |
   |---|---|
   | upload flow (size measure) | `[-1512.12 0 1512.12 2160]` |
   | `measure_file_pages` alone | `[-1512.12 0 1512.12 2160]` |
   | `prepare_file_pages` (thumbnail task) alone | `[-1512.12 0 1512.12 2160]` |
   | `_ranged_sizes` / `_whole_sizes` (read) | `[-1512.12 0 1512.12 2160]` |
   | the pre-D-351 formula, for reference | `[0 0 3024.24 2160]` (what Minmar held) |

   Every value is exactly MuPDF's `[-1512.1199951171875, 0, 1512.1199951171875, 2160]`. Neither writer
   can store the old value, so nothing needed fixing.

   The throwaway workspace (`dd252668-f0da-431b-bf7f-66f2957ae6e6`) is purged through the guarded script.
   Every prefix lists 0 objects.

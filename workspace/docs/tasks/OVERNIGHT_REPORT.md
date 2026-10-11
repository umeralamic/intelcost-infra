# Overnight report, 2026-10-11

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after every block. The 2026-10-10 run's
files are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-10.md`.

**Browser tool:** the Playwright MCP connects and drives the app (checked 00:13 UTC); every smoke
below ran through it, on the throwaway `fx.overnight1011.a@bench.intelcost.io`.
**On arrival** the worker, the page pool and beat had exited two hours earlier: their file watcher
failed with "Cannot allocate memory" (os error 12). Restarted at 00:12; nothing else touched.

| # | Block | State | Commits |
|---|---|---|---|
| 1 | Competitor names + Wage Calculator warm-up | **done** | app `7985c69`, api `9018702`, infra `ca9dd6a` |
| 2 | Auto Count accuracy | **done** (3 of 4 at truth; "C" 24 of 26, the 2 C/NL left) | app `dc7ca84`, infra `f7d3597` |
| 3 | Orphans in "U.'s workspace" | **done** (report only) | — |
| 4 | Dense-sheet read speed | **done** (same results, ~2× faster on dense sheets) | see block 4 |
| 5 | Revision sets | **done** (spec) | with block 1's mirror |
| 6 | Auto Count speed part 2 | not started | |

## 1. Competitor names + Wage Calculator warm-up (D-342)

**a. Names.** Every hit D-328 listed is reworded to describe the behaviour, meaning kept:

| Where | Now reads |
|---|---|
| `CLAUDE.md:3-4` opening | "…specialty subs: the desktop takeoff and plan-markup tool estimators already know, rebuilt for the web." Rule 9's last sentence now says the hits were reworded (D-342). |
| `DECISIONS.md` zoom and image comparisons (11 lines, around D-102 and D-119) | "the reference viewer" (compared against), "A zoom menu opens from the zoom percentage" |
| `DECISIONS.md` ~6190 | "fine dotted tree-connector guides" |
| `docs/code_style/design.md:71`, `intelcost-app-react/design.md:23, 40`, `STATUS.md:202`, `src/index.css:38` | "standard blue selection bar" |
| `src/index.css:86, 481` | "as in the reference viewer", "fine dotted rails and stubs" (comments only) |
| `src/lib/takeoff/overlay/alignment.ts:1` | "Two-point overlay alignment math (pick two matching points on each sheet)." |
| `ZoomCluster.tsx:6`, `zoomMenu.ts:2`, `pdf/zoom.ts:6` | the product's name dropped from the comment |
| `docs/tasks/drafts/zoom_hybrid_images.DRAFT.md:8, 40, 123` | "the reference viewer" |
| `docs/PARITY.md:1291` | the legacy screenshot named by description, not by its file name |
| `docs/archive/OVERNIGHT_REPORT_2026-10-10.md` block 5 | the hit list keeps every location, labels by behaviour |
| `docs/tasks/zz-notes-29.webp` | **deleted** |
| `docs/tasks/d119-notes-29.png` | **deleted** *(call)*: D-119's side-by-side, the other product's crop with its name in the header; ours alone stays (`ours-notes-29.webp`); both are in the mirror's history |

`docs/archive/OVERNIGHT_REPORT_2026-09-27.md:187` already had no name in it. Git history left
alone: one commit body (`intelcost-app-react bfaad75`) still names a product.

**Re-scan** (case-insensitive, every repo but legacy, the root files, `docs/`, `.claude/`; mirror,
`node_modules`, `.git`, `dist`, `.venv` left out): the product names, their short forms and
abbreviations, and file names → **zero hits**. What remains for "stack"/"swift"/"zz" is generic
(tech/call/modal stack, three place names in the wage seed, smoke names like "zz switching", a
pandas variable).

**b. Wage Calculator first visit after an api restart** (MCP, dev app, click Project Setup ›
Wage Calculator until settled):

| | Before | After |
|---|---|---|
| First visit after restart | **6.4 s** (`/burden-profile` answered at 6,390 ms) | **0.20 s** (155 ms) |

The reference data takes ~9 s to load in a fresh process; `lifespan` now starts it as a task at
boot (the api reports healthy at once) and a lock makes a request that arrives mid-load share that
load. A visit within ~9 s of boot waits only for the remainder.

**Gates:** ruff format, ruff check, mypy (203 files): clean; alembic check: clean. App lint,
typecheck, build: OK (the app has no separate formatter; eslint is its format gate). Quantity table:
329 rows, passed. **Smoke:** Wage Calculator first visit after an api restart settled in 0.2 s with
the craft and state pickers filled: **passed**.

## 2. Auto Count accuracy (D-343)

**a. Diagnosis.** The benchmark page has a new `?diagnose=1`: one scan per test with the scan
recording OpenCV's peaks and the fine pass's hits before the sizes' consensus, plus an exhaustive
probe (every 2 px origin round each truth point, every size, no floor). For each true symbol missed
it names the furthest stage reached. Same misses at 70 % and 38 %:

| Test | Missed (sheet fraction) | Stage that dropped it | Score vs the cut | Why |
|---|---|---|---|---|
| E200 A1 | (0.288, 0.375) | fine score: never scored | OpenCV peak 1.00; probe 1.00 at size 1.00, 0.98 at 1.05; floor 0.45 | the stride-5 grid refines a window only if it already scores 0.7 × floor (0.315); the empty outline 2 px off scores nearly 0, so its true spot was never refined |
| E200 A1 | (0.247, 0.375) | sizes' consensus | 1.00 at 1.00; 0.33 at 0.95; 1.05 gated | 2-of-3 sizes needed, only one size there |
| E200 A | (0.330, 0.462), (0.303, 0.462) | sizes' consensus | 0.75 at 1.00; probe 0.49 at 0.95 (≥ floor) | the 0.95 peer exists but, as above, the grid never refined it |
| E101 "C" | (0.235, 0.318) | sizes' consensus | 0.85 at 1.00; probe 0.41 / 0.42 at 0.95 / 1.05 | a thin circle is scale-sensitive: its other sizes fall under the floor |
| E101 "C" | (0.321, 0.318), (0.661, 0.318) | fine score under the floor | best 0.41 at any size and angle (peaks 0.67) | the two **C/NL** tags against a "C" sample |

Candidate generation (OpenCV peaks), overlap suppression and the review's cut lost nothing. Every
test's misses share a row: symbols in one row sit at one phase of the stride-5 grid.

**b. Fixes** (only what the diagnosis supports):
1. **Exact search at strong peaks.** At each OpenCV peak of 0.6 or more, each size's window is also
   scored at every 2 px within the peak's own error of where that size starts; it only adds to the
   grid's hits. *(Tried first and dropped: scoring whole peak regions at 2 px — E200 to truth, but
   E200 A 33 → 142 s and "C" 23 → 20, because the 1.05 peers had come from the refinement reaching
   past the region. And widening tiny regions to hold a grid point: no change, which is what showed
   the cause was the refinement bar, not the grid.)*
2. **A one-size hit of 0.8 or more passes the sizes' consensus.** 0.7 gave the identical review on
   all four tests, so 0.8 has margin.
3. **C/NL not attempted:** 0.41 at best, under `CHECK_MIN` 0.6 where look-alikes live; checking them
   from a "C" sample would need a bar that admits wrong matches. A "C/NL" sample counts them.

**d. Benchmark, production build, 1 kept OpenCV worker** (right / wrong; first / next scan):

| Test | Before 70 % | Before 38 % | **After 70 %** | **After 38 %** | Before first / next | After first / next |
|---|---|---|---|---|---|---|
| E101 office "A" (68) | 68 / 0 | 68 / 0 | **68 / 0** | **68 / 0** | 20.9 / 15.0 s | 20.5 / 14.8 s |
| E101 "C" (24 + 2 C/NL) | 23 / 0, 3 missed | 23 / 0, 3 missed | **24 / 0**, 2 missed | **24 / 0**, 2 missed | 26.8 / 17.5 s | 27.7 / 23.9 s |
| E200 A (12) | 10 / 0, 2 missed | 10 / 0, 2 missed, 1 sugg. | **12 / 0** | **12 / 0**, 4 sugg. | 32.9 / 29.5 s | 37.2 / 32.9 s |
| E200 A1 (6) | 4 / 0, 2 missed | 4 / 0, 2 missed | **6 / 0**, 5 sugg. | **6 / 0**, 5 sugg. | 9.6 / 6.5 s | 10.8 / 7.9 s |
| Peak heap (page) | | | | | 113–176 MB | 125–224 MB |
| Largest browser process (OS) | | | | | 862 MB | 896 MB |

Contract: no new wrong checked match on any test at either sensitivity; no right count went down.
Both scans of each test reviewed the same. The new unchecked suggestions: E200 A1's five at about
0.75 are the hatched type A fixtures; E200 A's four at 38 % score 0.50. "C"'s next scan reads 23.9 s
against 17.5 s before; a run tonight whose search was the old one (the region-widening try, same
results as before) read 21.2 s, so most of that is load on this machine (the block-4 profiling ran
alongside), not the change. E200 A's +4 s first scan is the extra search.

**c. `?opencv=2`:** the page already took any count; documented in the bench README, and run once:
office 18.8 / 12.0 s, "C" 28.1 / 20.9, E200 A 38.0 / 32.4, A1 11.4 / 7.7; same review as 1.

**Gates:** app lint, typecheck, build OK; quantity table 329 rows, passed (8 Auto Count rows right).
**Smoke** (dev app, throwaway): an E200 copy uploaded and loaded; boxed one A1 fixture, Auto Count in
Image mode → 6 checked (five 100 %, one 97 %) and five 75 % suggestions; Create (6) made "A1 fixtures
smoke" 6 EA: **passed**.

## 3. Orphans in "U.'s workspace" (report only; nothing changed)

**All 19 come from one Load and one live bug.** Project "Building A" (id 6321, uuid
`6ce25834-…`, workspace 3289 `60edce3e-…`, live). Written 2026-10-09 03:02:47–03:03:44 UTC while a
45-file Load prepared its first six sheets (A0.00A, A1.01, A1.02A, A4.00, A4.01A, A4.02). Those six
sheets were then deleted through `POST /sheet/delete`, which does not clear storage for a sheet of
an uploaded file. P = `takeoff/60edce3e-…/6ce25834-…/`:

| Key | Size | Created (10-09) | Written by | Why no row names it |
|---|---|---|---|---|
| P`689fc6a3-…/v2/fit.webp`, `thumb.webp` | 105 KB, 16 KB | 03:02:49–50 | sheet images, `worker/tasks/prepare.py:556, 560` | sheet row deleted |
| P`29ab5a2c-…/v2/fit.webp`, `thumb.webp` | 157 KB, 23 KB | 03:02:54–55 | same | sheet row deleted |
| P`7ff620d2-…/v2/fit.webp`, `thumb.webp` | 187 KB, 21 KB | 03:02:54–55 | same | sheet row deleted |
| P`7ff620d2-…/symbols/symbols-1-t2` | 4.0 MB | 03:03:16 | Auto Count vector index (D-304), `drawing/routes.py:646` | never stored on a row; the report spares it only while its sheet lives |
| P`033e23c2-…/v2/fit.webp`, `thumb.webp` | 124 KB, 14 KB | 03:03:00–01 | sheet images | sheet row deleted |
| P`4c2648c4-…/v2/fit.webp`, `thumb.webp` | 158 KB, 22 KB | 03:03:04–05 | sheet images | sheet row deleted |
| P`40834193-…/v2/fit.webp`, `thumb.webp` | 141 KB, 14 KB | 03:03:38–44 | sheet images | sheet row deleted |
| `…/pages/<file>/1` × 6 (files 1454–1459) | 0.33–6.1 MB | 03:02:47–03:03:25 | split page, `prepare.py:77, 549` | only `drawing_sheet.source_key` named it; the drawing files remain with 0 sheets |

About 15.0 MB in all. Evidence: the project has 45 project files and 45 drawing files but 39
sheets; files 1454–1459 have none; the six sheet uuids appear nowhere in a full data dump; no
clear log, purge log or audit row; the sheets' objects are the first in the bucket's timeline,
interleaved with the surviving 39 (first ticked first, D-326). Exactly when and from which button
(the Sheets panel's delete or the Load's "cancel remaining") is unknown: the api's logs went with
its restart and nothing records sheet deletes.

**Bug (live since `a2c5194`, 2026-09-27; not covered by D-341):** `drawing/service.py:225`
`delete_sheets` removes the rows but queues storage only for generated files (D-134). For a sheet of
an uploaded file, `takeoff/<ws>/<project>/<sheet>/` stays (every `v<n>` image and `symbols/*`), and
so does its split page. The comment at `drawing/routes.py:609` ("deleting the sheet deletes its
index") is not true for those. **Suggested fix** (not made): in `delete_sheets`, gather each doomed
sheet's `takeoff/…/<sheet>/` prefix and its `source_key` (unless a surviving sheet shares it)
before the rows go, and `storage_clear.queue(...)` them in the same transaction, as `delete_file`
does, so D-341's log and nightly pass 0 cover it. **Related risk, not seen here:** a re-prepare
writes `v<n+1>` and never deletes `v<n>`. The 19 are safe to delete; none should be restored.

## 4. Dense-sheet read speed (D-345)

**Profile, before** (cProfile, read run in-process in the api container on copies):

| | A0.00B (331,711 items, 2 dims) | S0.04 (232,904, 5 dims, 2 scales) | A9.30 (180,903, 5 dims) |
|---|---|---|---|
| Merging collinear lines, whole page | 17.4 s of 32.4 | ~7 s | ~0.1 s |
| Drawing items → lines (Python loop) | 4.7 s | ~3.5 s | — |
| PyMuPDF `get_cdrawings` | 3.9–5 s | 3.6–8 s | 4–5 s |
| Dimension measure (grids over every line) | 3.3 s | 0.5 s | < 0.1 s |
| Page text read twice | 1.3 s | 0.6–1.3 s | — |

So "the dimension check" was really the merge of all ~130,000 lines to answer 2–5 places.

**Change:** lines are split into groups no merged chain can span (an end within 0.4 pt and a
direction within 1.25°, wider than the merge's own 0.35 pt / 1.2°), and only the groups whose box
reaches a place the check looks at are merged, in drawing order; that yields exactly the chains of a
whole-page merge. Plus exact small speedups (inline transform, cached lengths and angles, the grid
holding only near-level/plumb lines, the page text read once). *(Rejected, because they can change
which dimensions are measured: limiting the search to the printed scale's region, and stopping at
the first proven scale.)*

**Read time, CPU seconds, median of 3** (old and new interleaved on the same pages; the bench was
busy, an earlier quiet run gave A0.00B 11.4 → 5.7 before the last grouping speedup):

| Sheet | Before | After |
|---|---|---|
| A0.00B | 19.6 | **9.1** |
| S0.04 | 15.3 | **8.8** |
| A9.30 (mostly curves, never merged) | 4.9 | 4.0 |
| Office Building p10 | 4.9 | 3.6 |
| 14 Minmar sheets | — | 1.2–6× faster each (P1.02 4.7 → 0.76) |
| Generated sheets | 0.007–0.042 | 0.005–0.024 |

**Result comparison: identical.** Old against new, every field (names, scales, verified /
unverified, proving dimension and witness, bands, every merged line), on 119 sheets: 103 prepared
bench pages (Minmar 44, the Office Building marketing demo 28, Hendrick Honda 26, others 5; none of
the founder's projects) and 16 generated sheets. *(call)* The D-321–D-326 test copies no longer
existed anywhere, so the set was rebuilt by a generator: engineering (C-101 `1" = 30'`, C-102
`1 IN = 50 FT`, C-103 band only), inch (A-121 `3/64"`, A-122 `1-1/2"`), metric (M-101 `1:100`, M-103
`1:1250`), two scales (M-102 `1:200` + `1:50`), reduced print (R-101, R-102), NTS (N-101, N-102),
conflict (X-101), full size (F-101), rotated (T-101, T-102). The shipped `read_page` matched the old
engine on A0.00B, A1.02B, C-101, M-102, T-102. What is left on a dense sheet is PyMuPDF's drawing
extraction (3–5 s) and the loop over its items.

**Gates:** ruff format, ruff check, mypy (203 files) clean; alembic check clean; quantity table 329
rows, passed. **Smoke** (dev app, throwaway): C-101 and M-102 loaded; C-101 applied `1" = 30'`,
verified by vector with its witness; M-102 offered `1:200` verified and `1:50`, applied neither:
**passed**.

## 5. Revision sets (spec only)

[revision_sets_spec.md](revision_sets_spec.md). In short: a revision loads through the existing
Load and is read for names and scales exactly as on load; each new sheet pairs to the one it
replaces by normalised sheet number, with title and a thumbnail hash as checks, each pair High /
Check / Low and same / renumbered / split / duplicate / new / not in this revision, editable on a
pairing screen. Carry-over **moves** each measurement (it keeps its id, so its estimate line and
history follow) through the pair's Overlay alignment, found automatically from words printed once
on both pages, else identity, else the Overlay's two-point step; quantities recompute analytically
on the new sheet's scale. The old sheet stays as a read-only earlier revision shown from an archive
of its rows (live old shapes would double quantities). "May have moved" flags from linework match,
changed dimension text, revision clouds and an image difference under each shape, shown with the
existing red Review mark. Estimating: quantities follow the current revision; old → new per item
per revision; a "Revision changes" report. Data model, api, UI states, risks, 18 open questions
with recommended defaults; eight blocks, ~15 days (A–D, ~8.5 days, is the first useful cut).
Not adopted, so no FEATURES or MANAGER row and no decision yet.

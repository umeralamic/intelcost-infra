# Overnight report, 2026-10-11

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after every block. The 2026-10-10 run's
files are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-10.md`.

**Browser tool:** the Playwright MCP connects and drives the app (checked 00:13 UTC); every smoke
below ran through it, on the throwaway `fx.overnight1011.a@bench.intelcost.io`.
**On arrival** the worker, the page pool and beat had exited two hours earlier: their file watcher
failed with "Cannot allocate memory" (os error 12). Restarted at 00:12; nothing else touched.

| # | Block | State | Commits |
|---|---|---|---|
| 1 | Competitor names + Wage Calculator warm-up | **done** | see below |
| 2 | Auto Count accuracy | in progress | |
| 3 | Orphans in "U.'s workspace" | **done** (report only) | — |
| 4 | Dense-sheet read speed | not started | |
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

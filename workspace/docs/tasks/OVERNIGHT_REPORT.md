# Overnight report, 2026-10-10

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after every block. The 2026-10-09 run's
files are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-09.md`.

**Browser tool:** the Playwright MCP connects and drives the app (checked 00:02 UTC); every
smoke below ran through it.

| # | Block | State | Commits |
|---|---|---|---|
| 1 | Settings speed | **done** | app `bc40cbb`, api `9b4aabb`, infra `9a2b894` |
| 2 | D-324 follow-ups | **done** | api `c7e6f08`, app `2897c51`, infra `2cb66f4` |
| 3 | P-23 alembic drift | **done** | api `806d3c4`, infra `9a2b894` |
| 4 | Auto Count part 1 | **done** | app `68eeaaf`, infra `d01a2b8`, `8c1f0c0` |
| 5 | Competitor-name scan | **done** (rule added, hits listed, nothing changed) | infra `8c1f0c0` |
| 6 | P-24 | **done** | app `eb23ece` and the row step (below), infra `65d5413` |

## 1. Settings speed (D-325)

- **One frame:** `/settings` is a layout route; header, heading and both tab rows render once;
  every tab is a child route with a placeholder only in the content area (after 150 ms).
- **Prefetch:** entering settings fetches the other pages' code one at a time at idle; a tab's
  on hover or focus. Not at app start.
- **Fresh for 60 s** while settings is open (the settings pages' key prefixes); any save made
  there marks them stale, so it shows at once. *(call)* Scoped to the open frame, because
  several of the keys are also read on the takeoff; leaving settings restores them.
- **Classification tree:** the cause of 1.2 s was 568 KB of uncompressed JSON (1,835 CSI
  nodes) on every read, 110 ms to build and the rest to cross Docker Desktop's port
  forwarding; the first read of a new workspace also seeds the tree. Now built once per
  version per workspace, gzipped once, ETag + `private, no-cache`: an unchanged tree is a
  304. From the browser 1.05–1.5 s → **60–84 ms**; in the api 110 → 30 ms. *(call)* Per
  endpoint rather than app-wide gzip, because the AI tools stream NDJSON.

**Timings** (every tab and section, twice, from a fresh load of General; marked = the tab shows
selected, settled = no spinner):

| | Before | After |
|---|---|---|
| Prod, tab marked | 118–203 ms | **43–84 ms** |
| Prod, first visit settled | 123–1,283 ms | 64–763 ms (one 4.5 s: Wage Calculator's crafts reference data, loaded once per api process after a reload; reopened 238 ms) |
| Prod, second visit | 44–231 ms, api calls repeated | 47–175 ms, no api calls |
| Prod, frame disappears | on the first click | never |
| Dev (cold), tab marked | 2.6–11.9 s | **43–86 ms** |
| Dev (cold), first visit settled | 2.6–14.7 s | 2.1–9.9 s clicked at once; **64–366 ms** once the idle prefetch finished (~80 s after first load on a cold dev server) |
| Dev, second visit | 56–244 ms | 48–239 ms |
| Dev, first page load (cold server) | 38.5 s | 23–26 s |

**Smoke** (prod and dev): every tab clicked twice, the tab marked at once, the frame never
left; a phone number saved on General and a new CSI division showed after switching tabs and
back (the division after a reload too): **passed**.

**Report only: the repos on the Linux filesystem.** Measured inside the app container (same
Node, same CPU), the polled Windows share against a copy on the container's own disk:

| | Windows share (today) | Container disk |
|---|---|---|
| Read all 515 source files | 6,834 ms | 37 ms |
| One stat pass over `src` (what each poll does, every 200 ms) | 2,410 ms | 7 ms |
| Cold Vite compile of all 513 modules | **456 s** (median 3 ms, slowest 6.3 s) | **9.9 s** (median 7 ms, slowest 0.6 s) |

So a cold dev server would be roughly 40× faster to warm up, and the bench would stop paying
for polling: the Docker VM sits at a load average of 15–17 with the bench idle, because the
api, the three workers, beat and the app each poll the share (`WATCHFILES_FORCE_POLLING`,
`DEV_WATCH_POLL`). **What moving involves:** clone the repos inside WSL2 (e.g.
`~/intelcost/…` in an Ubuntu distro) and run Docker Desktop's WSL2 integration from there;
the bind mounts then carry native file events, so `DEV_WATCH_POLL` and
`WATCHFILES_FORCE_POLLING` come off; edit with VS Code's WSL remote. Cost: the workspace
files and the hook (`.claude/`) move too or are reached through `\\wsl$`; Windows tools that
read the repos directly (Explorer, the MCP's upload folder under `E:\Intelcost`) go through
`\\wsl$`, which is slow the other way. Not done; a decision for you.

## 3. P-23 alembic drift

The three indexes are declared on their models exactly as their migrations made them
(`app/features/estimate/models.py`); no migration was needed. `alembic check`: **clean**. P-23
moved to ✅ Live in FEATURES. Gates now report "alembic check clean".

## Gates (blocks 1 and 3)

App lint, typecheck, build: OK. Ruff, mypy: clean. `alembic check`: **clean**. Quantity table:
329 rows, passed.

## 2. D-324 follow-ups (D-326)

**Was preparation one page at a time? Yes:** one job a file, page after page (files side by
side up to the main worker's 2 processes). Now each page is its own task on one capped **page
pool** (`worker-pages`, `-Q prepare,reads`, `PAGE_WORKERS`, default 4) that also does the reads,
so preparation and reading together never pass the cap.
- **First ticked first:** a Load sends its pages in tick order; the first goes alone, and once
  it is ready its read and then the rest go. Broker priorities put a Load's first page (and its
  read) ahead of another Load's backlog: checked with the pool paused, six tasks at the default
  then one urgent; the pool took the urgent one first. A ready row in the progress view has
  **Open**.
- **Found and fixed on the way:** a page task's claim went stale while a 178 MB source took 13
  minutes to fetch, and the sweep sent the page again; now a Redis lease renewed every 30 s,
  whose beat also keeps the file's heartbeat.
- **Scales computed** from what is printed, labelled as printed: `3/64" = 1'-0"`, `1 IN = 40 FT`,
  `1:1250` all read; one scale printed two ways is one finding.

**40-sheet timings** (the worker's own code, storage taken out):

| Set | Before (1 preparer + 4 readers) | After, 4 | After, 6 | After, 8 |
|---|---|---|---|---|
| 40 × A0.00B (dense) | 231–252 s | 248 s | 210 s | 186 s |
| 40 × A1.01 (light) | 51 s | 50 s | 43 s | — |

On compute alone reading dominates (dense: ~5 s to prepare, ~20 s to read a page), so at equal
process count the new layout matches the old and scales with processes. What was serial was a
page's uploads; a real Load of the 40 dense pages on the bench's slow bucket link: source on disk
→ 40 prepared and 37 read in about 7 minutes, against about 9.5 minutes for the same set before
(indicative: two worker restarts cut into it; the last 3 reads were re-sent by the sweep). **A clean run, later** (no restarts, 04:19 UTC): Load to the first page ready 10.6 minutes (the 178 MB source fetch, on a link shared with the page-thumbnail job), then all 40 ready and read **6.9 minutes** after it, against about 9.5 minutes before.

**For Abdullah, sizing:** `PAGE_WORKERS` = min(cores ÷ 2, (RAM − reserve) ÷ 700 MB). One page
process peaks near **600 MB** on the densest sheet seen (A0.00B, 133,000 lines), about 220 MB on
a light one. The main worker (coordinators, mail, the rest) keeps 2 processes, the previews
worker 1. Production needs the same split: a worker on `-Q prepare,reads`.

**Smoke:** C-101 `1" = 30'` and C-102 `1" = 50'` (dimensioned) and A-121 `3/64" = 1'-0"`
verified and applied with their printed labels; M-101 `1:100` amber, Approve set it (ratio
100); M-102 `1:200` + `1:50` two boxes, nothing applied; a 5-page Load's first ticked (A-121)
ready while the other four prepared, Open opened it: **passed**.

## 4. Auto Count part 1 (D-327)

- **One kept OpenCV worker** on every machine, released after 2 minutes idle (D-316 amended).
- **The standing benchmark** (`intelcost-infra/bench/autocount/`, README there): production
  build only; four fixed samples with sheet copies and truth points; first and next scan, each
  reviewed at 70 % and 38 %, scored right / wrong against the truth; heap and renderer memory.
  **One click for you:** `docker compose --profile prod up -d --build app-prod`, then open
  <http://localhost:5175/bench/autocount> and press Run (no sign-in). `?opencv=4` compares four
  workers.
- *(calls)* The samples from the earlier runs were not kept, so I chose them tonight by trying
  instances and keeping the best-reviewing one per test; "right" = a checked match whose box
  (a fifth wider) holds a truth point. Fixtures are served as the app serves sheets: a download
  manager on this host answered PDFs with an empty 204.

| Test | Review at 70 % and 38 % | 4 kept, first / next | **1 kept, first / next** |
|---|---|---|---|
| E101 office "A" | 68 / 0 (the truth) | 18.9 / 11.2 s | **18.2 / 14.4 s** |
| E101 "C" with tag | 23 / 0, 3 missed | 27.2 / 20.3 s | **27.1 / 23.3 s** |
| E200 A | 10 / 0, 2 missed, 1 suggestion at 38 % | 35.2 / 29.8 s | **35.2 / 31.1 s** |
| E200 A1 | 4 / 0, 2 missed | 11.0 / 7.4 s | **10.6 / 7.2 s** |
| Renderer memory, peak | | 1,939 MB | **1,319 MB** |

One kept: same first scans, **620 MB less**; next scans 3 s slower on the E101 pair here (your
earlier numbers had one kept tying four). The misses on "C", E200 A and A1 are the engine's,
now visible against the truth for part 2.

## 5. Competitor names (D-328, report only)

The rule is CLAUDE.md hard rule 9 and D-328. **Nothing was changed.** Searched every repo and the
workspace files (legacy `intelcost/` and the `workspace/` mirror, which duplicates the root
files, left out) for "zz", "zzTakeoff", "PlanSwift", "Bluebeam", "STACK", "On-Screen Takeoff",
"OST" (and lower-case forms of the product names):

- **Competitor names:**
  - `CLAUDE.md:4` (the opening line names three products)
  - `DECISIONS.md:1594, 4068, 4204, 4768, 4773, 4788, 4790, 4793, 4799, 4815, 4862` (zzTakeoff,
    zoom and image comparisons), `DECISIONS.md:6190` (PlanSwift-style guides)
  - `docs/code_style/design.md:71`, `intelcost-app-react/design.md:23, 40`,
    `intelcost-app-react/STATUS.md:202` (PlanSwift blue selection bar)
  - `intelcost-app-react/src/index.css:38, 481` (PlanSwift-style), `src/index.css:86` (zzTakeoff)
  - `intelcost-app-react/src/lib/takeoff/overlay/alignment.ts:1` (PlanSwift-style)
  - `intelcost-app-react/src/features/takeoff/components/ZoomCluster.tsx:6`,
    `src/features/takeoff/components/zoomMenu.ts:2`, `src/lib/takeoff/pdf/zoom.ts:6` (zzTakeoff)
  - `docs/tasks/drafts/zoom_hybrid_images.DRAFT.md:8, 40, 123` (zzTakeoff)
  - `docs/archive/OVERNIGHT_REPORT_2026-09-27.md:187` (PlanSwift)
  - `docs/PARITY.md:1291` (a legacy screenshot name containing "planswift")
  - `docs/tasks/zz-notes-29.webp` (a file named zz-…, likely a competitor screenshot)
  - commit `intelcost-app-react bfaad75` (body names zzTakeoff)
- **"zz" that is not the competitor** (smoke names prefixed zz, "zzz"/"zzq" no-match searches,
  a pandas variable): `docs/tasks/SINCE_ARCHIVE.md:20, 100, 104, 156, 183, 185, 249, 277, 279,
  280`, `docs/tasks/takeoff_first_tasks.md:81`, `docs/tasks/ZOOM_GLITCH_STATUS.md:75, 76`
  (`zz-e101.pdf` uploads and `zz run` markups), `intelcost-app-fastapi/docs/wage-calculator/
  validate_seed.py:31, 32`, `intelcost-infra/.regress/f5-s13.log:12`,
  `intelcost-infra/.regress/full-f5-close/f5-s13.log:12`.
- "STACK" (as a product), "On-Screen Takeoff", "OST": no other hits.

## 6. P-24 (D-329)

**Why the panel redrew:** each prepared page refetches the sheet list, the signed assets and the
scales (at most once a second); the takeoff page redraws for each, and the panel took dozens of
inline callbacks plus `sites`/`overlayActions` rebuilt every render; and every assets read signs
every thumbnail URL anew (SigV4 carries the time), so the thumbnails map was always new (in
thumbnail view each image was fetched again).

**Now:** the panel is memoized behind `useStableProps` (stable callers of the page's latest
callbacks; none goes stale), `sites` memoized, thumbnail URLs kept while the object is the same
and the signature young, and each row memoized (`SheetRow`: drawn from plain props, its handlers
through a ref to the panel's latest).

| Dev build, a 40-page Load, panel open | Before | Panel memoized | **And its rows** |
|---|---|---|---|
| Panel redraws over 1 ms | 96 (0.83 a second) | 46 | 49 |
| One redraw, median / max | 19 / 34 ms | 18 / 27 ms | **5 / 11 ms** |
| Redraws over 16 ms | 79 | 38 | **0** |
| Time redrawing | 1.8 s | 0.87 s | **0.27 s** |

**Smoke:** open, Ctrl/Shift range, the selection ⋮ menu and the row ⋮ menu, right-click, plain
click clears, rename in place, drag to reorder (saved), Thumbnails view (40 tiles, a tile opens),
items open/close, an item selects and right-clicks, Name from page region opens the page's
dialog: **passed**. Also, the new page pool with an image upload (a PNG wrapped, prepared, ready
in 25 s, its kept source cleaned up): **passed**.

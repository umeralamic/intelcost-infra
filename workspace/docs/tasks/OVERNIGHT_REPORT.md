# Overnight report, 2026-10-09

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after every block. The 2026-10-08 run's
files are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-08.md`.

## Pre-flight

- **Browser tool:** Playwright MCP connects to the bench and drives the app (04:56 UTC).
- **D-259 bucket CORS:** already recorded as resolved in DECISIONS.md (D-259) and
  docs/flows.md; no harness workaround existed to drop.
- **Mail guard:** on (`MAIL_GUARD=true`, allowlist set).

## Blocks

Every block's gates: lint, typecheck, build, ruff, mypy clean; `alembic check` shows only P-23's
drift (removed index `ix_takeoff_cost_component_item`, `uq_estimate_format_theme_workspace`,
`uq_project_equipment_resource_name`); the quantity table passed (329 rows).

| Block | State | Commits | Smoke |
|---|---|---|---|
| 1 (A4, A6, A7, A8) | Done | app `c32c366`, infra `d884742` | One-page rows show no "n/m selected", the 3-page set "3/3 selected", tooltips on every name; search tags "Archived", "Cancelled", "No sheets yet". Passed |
| 2 (A1, A2) | Done | app `1cf0d4b` | Settings → change → close → "Close without saving?" → Escape: the confirm closed, Settings stayed (2 dialogs → 1). Add sheets open, 12 files queued into Building A/Architecture and Building A/Electrical at 5 Mbps: the pane's line and the tray agreed ("Uploading 8 of 24 files"), tray hidden while the dialog was open, back on Cancel, hidden again on reopen; tree "(n files)" rose as files landed; rows on their way showed "Uploading…" with Cancel. Passed |
| 3 (A5) | Done | app `7fe7c67` | Open → "Night Files" (files, no sheets) → `/project/…/takeoff` in the takeoff shell (header, 5 tabs, Open, name) with the first-run load screen; Skip → "No sheets yet" + Add sheets on the canvas, Sheets panel + present; refresh did not ask again; panel + → Add Pages opened the load screen; a project with sheets at `/takeoff?tab=estimating` went to its first sheet with the tab kept. Not driven: the dated-name rename offer (needs an empty workspace drop; same code path moved as is). Passed |
| 4 (A3) | Done | app `8a22552`, api `ec6ae1a` | Focusing Building A (no files of its own) showed Architecture 24 and Electrical 24 tiles under their headings, all thumbnails, no per-file page requests; files queued into Building A/Electrical at 5 Mbps showed grey tiles "Uploading…" → "Preparing…" → a real tile. 500-tile check (5 subfolders × 100): stuttered unvirtualized (wheel p50 33 ms, 28/93 frames > 50 ms), so `@tanstack/react-virtual` per the ruling: wheel p50 17 ms, p95 50 ms, 1/144 frames > 50 ms, 48 tiles in the DOM, first draw 671 ms, tick all 373 ms. Passed |
| Auto Count 1: OpenCV worker policy (D-316) | Done | app `a0a41d9` | Stash `overnight-part2a-outline-symmetry` dropped. 4 workers at ≥ 8 GB (this browser reports 32), 1 below; kept warm, released after 2 min idle; one loads at a time. Every configuration found the identical raw candidate set on all four tests (so the same checked / unchecked sets at 70 % and 38 %). Timings and memory in the Auto Count table below. Passed |
| 5 (B1) | Done | app `67f2b5f` | Avatar menu: Account settings, Billing & plan, Workspace & team, **Reports**, Community, Sign out; Reports → `/reports` (Time & Activities) → Back to takeoff → the last sheet; no Reports card on the list. Passed |
| 6 (B2) | Done | app `c9742ba`, api `1c3c352` | Open → All projects over the sheet (`?projects=open`); tabs Active 5 / Submitted 1 / Won 1 / Lost 0 / Archived 2 / All 8; search "night sub" from Active found the Submitted project with its status; Won → Archive → in Archived with its tag → Unarchive → back in Won; Rename typed then × → saved; Escape and an outside click close; ⋯ Move to Trash → footer "Trash" → Settings › Trash lists it; `/projects` → Home's landing with the dialog open; a row's Takeoff on a files-no-sheets project → closed and opened the load screen. Passed |
| 7 (C1) | Done | app `7cf6eac` | In Night Beta: All projects → ⋯ Edit project on Night Files → Project Notes typed → Save → closed, still Night Beta on the same sheet, the note saved; again with Client changed → instant click outside → "Discard changes?" → Keep editing → "← All projects" → Discard → the list; Escape → back in Night Beta, Recent unchanged; Open → Project details → Night Beta's, no back button. First run missed the prompt on a click straight after typing (fixed: a layout effect). Passed |
| 8 (C2) | Done | app `3bc79b0`, api `621be5d` | In Night Beta: All projects → Files on Night Files → "Night Files — Project files", nothing ticked, Perform Takeoff, no Estimating / Wage → × → still Night Beta, same sheet; Files → "← All projects" → the list; Files → Perform Takeoff → Night Files (load screen); Files → tick → Load 1 page → Night Files on the new sheet. In the tree: New folder "Specs"; Upload notes.txt (greyed, "unsupported type", menu kept); Rename → spec-notes.txt; Move… → into Specs; Download → a new tab on the file's presigned link; Delete → "spec-notes.txt will be permanently removed…" → gone; Delete F-101.pdf (loaded) → "1 sheet from this file is in takeoff. Remove it first.", file kept; Delete Specs → "Specs and everything in it … 0 files" → gone. Passed |
| 9 (C3–C6) | Done | app `f2ab6b1` | New no-sheets project "Night Wage": Estimating → Wage Calculator pane renders ("Labor rates not set", Project info…); `/project/<id>/wage-calculator` → `?tab=estimating&pane=wage`, the Wage pane selected; Open menu: Search, Recent, All projects, New project, Project details (Switch workspace hidden with one workspace); `/project/<id>` and `/projects/<id>` → that project's takeoff with Edit project open, Escape → the takeoff. Passed |
| Auto Count 2: SIMD opencv.js | Stashed (`overnight-simd`, app) | — | Built (opencv 4.12.0, emsdk 3.1.64, `--simd`); identical results on office; next scan 24.4 → 20.2 s but first scan 43.4 → 155.4 s (load 135.6 s). Not faster, not shipped |

## Auto Count (D-316)

Measured in the MCP's Chromium on the Windows host (Intel UHD 630 via ANGLE D3D11, 32 GB,
`navigator.deviceMemory` 32), the dev server, 6 matching workers; throwaway copies of E101 and
E200 ("Night AC copies"; the old harness and sample boxes were never kept, so the samples were
placed again from the sheets: office fixture "A", the "C" fixture with its tag, E200's hatched
2×4 "A" and empty "A1"). **Every configuration found the identical raw candidate set on all four
tests**, so the checked and unchecked sets at 70 % and 38 % are the same everywhere (raw counts
at ≥ 70 % / ≥ 38 %: office 365 / 899, "C" 74 / 250, E200 A 36 / 154, E200 A1 19 / 46). This
browser is slower than the one behind the founder's baseline (office 16.4 s there, 38.5 s
here with the same shipped code; opencv.js takes 14–25 s to load into a fresh worker here), so
the comparison is within this browser. "First" is the first scan after a page reload;
"next" is the same scan again at once.

| Test | Baseline (Oct 8, other browser) | Shipped here (1, ended each scan) | 1 kept, first / next | 4 kept, all loading at once, first / next | **Shipped now: 4 kept, one loads at a time, first / next** |
|---|---|---|---|---|---|
| E101 office | 16.4 s | 38.5 s | 37.7 / 21.9 s | 61.7 / 19.5 s | **43.4 / 24.4 s** |
| E101 "C" | 21.2 s | 45.6 s | 46.4 / 28.9 s | 64.6 / 21.6 s | **46.3 / 29.4 s** |
| E200 A | 13.5 s | 80.2 s | 81.1 / 62.9 s | 96.7 / 62.3 s | **84.1 / 62.7 s** |
| E200 A1 | 27.6 s | 54.5 s | 55.3 / 36.6 s | 73.0 / 36.8 s | **54.9 / 42.8 s** |

**Memory** (the tab's renderer process, private MB, workers included):

| | Before a scan | Peak | Between back-to-back scans |
|---|---|---|---|
| Shipped (1, ended) | 540–600 | 1,070–1,370 | 800–980 |
| 1 kept | 550–620 | 1,150–1,350 | 1,090–1,175 |
| 4 kept, all at once | 560–720 | 1,680–2,260 | 1,650–1,860 |
| 4 kept, one at a time | 520–720 | 1,180–2,015 | 1,070–1,675 |

Released: after two office scans (4 kept) the tab held 1,655 MB for two minutes, then 869 MB at
2:05 and 850 MB at 3:20 (617 MB before: the 6 matching workers stay between scans, D-289).

**Read:** keeping the workers is the gain (a next scan 30–45 % faster); four only help once all
four are loaded, and on a fresh tab the second scan still has workers loading in turn. Shipped
as the brief set it; one kept worker gives nearly the same next-scan times for ~600 MB less.

**SIMD: not shipped** (stash `overnight-simd`): office, identical results, next scan 24.4 → 20.2
s, but first scan 43.4 → 155.4 s (the 13.7 MB SIMD file took 135.6 s to load into a worker).

## Decisions made on the founder's behalf (all logged in D-313 to D-316)

- **A7:** the bench's IAM user cannot list open multipart uploads (`s3:ListBucketMultipartUploads`
  denied), so `list-storage` reports them "n/a"; a lifecycle rule aborting incomplete uploads on
  the bucket would cover them (the bucket owner's to set).
- **A3:** the 500 files for the tile check were copies of one landed file made in the database
  (uploading 500 to the real bucket ran ~6 s a file); `@tanstack/react-virtual` added, as ruled,
  after the check stuttered; tile rows memoized so a scroll only moves them.
- **B1:** the Reports entry shows to every workspace member, since the reports page itself is open
  to all (Takeoff Progress always) and gates its own tabs.
- **B2:** the dialog's tab, sort and filters are its own state, not the URL's (takeoff's `?tab=`
  is not a status tab); a rename's own Escape cancels the rename, not the dialog.
- **C1:** Editing another project's details is not a visit (Recent unchanged).
- **C2:** the tree's Upload takes any file, not only drawings: the project page's uploads had no
  other home.
- **D-316:** one OpenCV worker loads at a time (four at once made a first scan ~20 s slower).
- **SIMD:** measured on office only; its first scan (155 s) already decides it.

## Left for the founder's click check

- Real folder drag-and-drop onto the empty state (yours, as before).
- Everything above in your own Chrome: the timings in this browser run 2–5× the October 8
  baseline's, so the Auto Count table compares configurations, not machines.
- The dated-name rename offer after a drop on the empty state (moved into the takeoff page in
  block 3, not driven: it needs an empty workspace).

## Clean-up

- Purged the night's throwaway workspace (`fx.night.1791522322849@bench.intelcost.io`, "<Night
  Owner>'s workspace", uuid `d6d6138f-…`) and listed its 8 storage prefixes: 0 objects left in
  each (open multipart uploads not visible to the bench's IAM user). The October 8 session's two
  purged workspaces were listed the same way at the start: 0 objects.
- Removed: the harness and memory sampler, the sheet copies (`public/__smoke`, deleted before the
  first commit after their use), screenshots, the SIMD build folder, the emsdk 2.0.10 image.
  Kept: the emsdk 3.1.64 image (2.7 GB) for a SIMD retry; the SIMD build is in the stash.
- Stashes: app `overnight-simd` (new); the superseded `overnight-part2a-outline-symmetry` dropped.
  All three repos clean and pushed on `umer-dev`.
- The founder projects were only read (E101's and E200's sheet sources copied for the tests).

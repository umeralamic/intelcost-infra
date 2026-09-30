# Overnight report (2026-09-30, 00:36 to 11:30 UTC)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Test project: "Hidden Valley Spec" in
"F5 Block A demo 15:16", as estimator@bench.intelcost.io (the founder's instruction for
this run). Everything below was checked on the bench.

**Read first:** [D-117](../../DECISIONS.md). Abdullah merged a "staging" branch into the
api's `umer-dev` at 07:17 UTC. I did not pull it. That merge by itself would break the
api on the bench, so one api commit is held locally (details under Decisions).

## Follow-up after your review (11:09 to 11:26)

- **Decisions:** D-106 to D-116 are accepted. D-105 is amended: the whole-pixel snap stays at
  every ratio. D-117 waits for Abdullah, and `7ad2c10` stays held.
- **The `devicePixelContentBoxSize` attempt did not help; nothing in the app changed.**
  - The bench's emulated 1.25 was not a real device scale.
  - At a real 1.25 (`--force-device-scale-factor`) the backing store already equals the
    device box.
  - Numbers and the lead for next time are in D-105.
  - At a real 1.25, 29% / 50% read 0.752 / 0.930; at DPR 1, 1.003 / 1.018.

## Progress

- [x] 1a Snap the stage to whole device pixels: solved at DPR 1, not solved on the bench at DPR 1.25 (D-105)
- [x] 1b Clip the raster to the page box (D-105)
- [x] 1c Supersample by drawing density; the guard passed (D-106)
- [x] 2 Split view (D-107)
- [x] 3 Public share links (D-108)
- [x] 4 Markup tools and the Collaborator tab (D-109, D-110, D-111)
- [x] 5 F10 assemblies, Starter Pack and Library, template editing included (D-112)
- [x] 6 The rest of F11: Find Text (D-113), Print (D-114), item History (D-115), region text actions
- [x] Fallback: side by side with live legacy, 21 rounds (D-116)
- [x] Close-out: gates, quantity table, report, mirror, memory

## Tasks

| Task | Status | Start | End | Duration |
|---|---|---|---|---|
| 1a, 1b | Done at DPR 1; not solved at DPR 1.25 on the bench after 3+ attempts (evidence in D-105) | 00:36 | 01:45 | 1 h 09 |
| 1c | Done; the guard passed | 01:45 | 02:00 | 0 h 15 |
| 2 Split view | Done | 02:00 | 02:11 | 0 h 11 |
| 3 Public share links | Done; guest presence shows nothing (see below) | 02:11 | 02:32 | 0 h 21 |
| 4a Markups and the Collaborator tab | Done | 02:32 | 02:59 | 0 h 27 |
| 4b Carets, visibility, markups in Split, Snapshot, Snippets, Dock | Done | 02:59 | 03:44 | 0 h 45 |
| 5 F10 assemblies: library, Save as, Link, Use on sheet, Starter Pack read side | Done | 03:44 | 04:09 | 0 h 25 |
| 6a Find Text | Done | 04:09 | 04:28 | 0 h 19 |
| 6b Print | Done | 04:28 | 04:44 | 0 h 16 |
| 6c Item history | Done | 04:44 | 04:58 | 0 h 14 |
| 6d Open at snapshot zooms to its box, Dock this snapshot, the library updates live | Done | 04:58 | 05:07 | 0 h 09 |
| 5b F10-S3: template Properties, sub-items and Costs | Done | 05:07 | 05:24 | 0 h 17 |
| 6e Region Copy/Search as Text, Estimating's Modified by, Change classification | Done | 05:24 | 05:45 | 0 h 21 |
| Fallback rounds 1–7 (layout, menus, glyphs, dialogs) | Done | 05:47 | 07:13 | 1 h 26 |
| Fallback round 8: Duplicate page (api half held, D-117) | Done | 07:13 | 07:28 | 0 h 15 |
| Fallback rounds 9–18 (Legend, Assemblies, Dock properties, markup undo, naming and scale from a box, snapshot, bookmark and multi-select menus) | Done | 07:32 | 09:25 | 1 h 53 |
| Regression smoke, first draft of this report | Done | 09:25 | 09:40 | 0 h 15 |
| Fallback rounds 19–21 (Scale · All pages, Show on a found scale, Estimating's Group by) | Done | 09:40 | 09:56 | 0 h 16 |
| Close-out: report, cleanup, memory, mirror | Done | 09:56 | 11:15 | 1 h 19 |

## Task 1 numbers

**1a: text sharpness on screen, measured against the raster's own pixels.** 1.00 means
shown 1:1. Test project, 2 sheets, window 2048 × 1050.

| Zoom | DPR 1 before | DPR 1 after | DPR 1.25 before | DPR 1.25 after |
|---|---|---|---|---|
| 25% | 0.69 | 1.01 | 0.65 | 0.71 |
| 29% | 0.77 | 1.00 | 0.61 | 0.57 |
| 35% | 0.87 | 1.01 | 0.72 | 0.76 |
| 50% | 0.99 | 1.01 | 0.85 | 0.91 |
| 100% | 0.97 | 1.00 | 1.00 | 0.98 |

- **The checkerboard test:** a 1 px checkerboard painted into the raster was 0% exact on
  screen before, at both ratios. After the fix it is 100% exact at DPR 1 and still 0% at
  DPR 1.25.
- **The three causes found and removed:**
  - the stage's translation was off the device grid;
  - the canvas's CSS size was not exact in layout units;
  - the settled frame's scale was a hair off 1.
- **Still open:** at DPR 1.25 the bench's software compositor still resamples the canvas,
  and I did not find why (D-105).

**1b:** the raster's rounded-up bitmap stood 0 to 1 CSS px past the paper's right and
bottom edges, and up to 3 px with 1a's rounding. It is now clipped to the page box
exactly.

**1c** (D-106), at Fit in a 1440 × 900 window:

| Measure | Before | After |
|---|---|---|
| Mean luminance, sheet 1 | 241.9 | 247.4 |
| Mean luminance, sheet 2 | 238.0 | 243.9 |
| Dark pixels, sheet 1 | 3.5% | 0.9% |
| Dark pixels, sheet 2 | 3.9% | 1.2% |

- **Acutance at 29%** (edge strength per unit of ink) rose at every point: 0.726 → 0.875
  and 0.862 → 1.022 at DPR 1; 0.885 → 0.957 and 0.737 → 0.955 at DPR 1.25.
- **Cost:** landing at 25–29% takes 0 to 540 ms longer.

## Commits

All app commits are on `origin/umer-dev`. All api commits are too, except the last.

- **app** (`intelcost-app-react`), 38 commits:
  - `e43d484` 1a, 1b · `ec78384` 1c · `1fd112a` Split view · `9f67dcc` share links
  - `63ce6d1` markups · `260ce0a` carets and visibility · `0dd98a5` Snapshot · `f79fdcf` Dock
  - `17af197` assemblies · `f2e954c` Find Text · `264786b` Print · `5522454` History
  - `5829d9e` snapshot zoom, Dock this snapshot, live library · `500d582` template editing
  - `9b45f70` region text · `ed4116a` Modified by · `3c45b04` Change classification
  - side-by-side rounds: `e37da1f`, `57c7ba0`, `58fea03`, `68113cc`, `5498d9e`, `2799251`,
    `dc1c8c2`, `d502762`, `85ac5d4`, `56f3a9b`, `fc7b3f5`, `2b4661a`, `ea7ba15`, `8b97281`,
    `bde3a14`, `3697324`, `a5c7095`, `c723099`, `c240147`, `d7a8034`, `42a9945`
- **api** (`intelcost-app-fastapi`), 9 commits:
  - pushed: `f33c191` share links · `3d7854c` markups · `fcd014a` snippets · `0d967aa` dock
    kind · `2633473` assemblies · `e4dddc2` item history · `6046f88` template editing ·
    `30bc846` Modified by
  - **held locally:** `7ad2c10` Duplicate page (D-117)
- **mirror** (`intelcost-infra`): a workspace-file commit after every change (last one
  "Close-out").
- **Migrations on the bench:** `a7d3e9c15b20` share links, `b4e8f2a61c37` markups,
  `c1f7a9d24e58` snippets, `d2b8e4f73a91` assemblies, `e4c9a1b7d352` item history.

## Decisions to review

All are marked "decided overnight, pending founder review".

- **D-117 (urgent): the api's `umer-dev` moved during the run and I did not merge it.**
  - At 07:17 UTC Abdullah pushed "staging init" and a merge of `staging` into `umer-dev`
    (8ff495a, 8c2bf9a). A dry-run merge is textually clean.
  - The merged head is inconsistent on its own. `app/config.py` drops `s3_access_key_id`,
    `s3_secret_access_key`, `s3_force_path_style`, `s3_signing_endpoint`,
    `sync_database_url` and `is_local`. `app/core/storage.py` still reads them.
  - It also requires `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, which the bench's
    compose file does not set.
  - Pulling it would have stopped the api on the bench, so `7ad2c10` (Duplicate page) is
    held on the local `umer-dev` (1 ahead, 2 behind). The app's Duplicate page, already
    pushed, needs it.
  - **Your call:** fix staging's settings and storage, and the compose variables. Then run
    `git pull origin umer-dev` and push.
- **D-116: side by side with live legacy, 18 rounds.** The full list is in the decision
  and summarised below.
- **D-115: item History as legacy's.**
  - The api writes the history in the same transaction as each item write.
  - Estimating's Modified by opens it.
  - Legacy's "calibration changed" and "quantity recalculated" rows are not written.
- **D-114: Print as legacy's.** The browser rasters each page and hands it to
  `window.print()`; there is no server PDF. The takeoff prints only when shown; markups
  always print. A dock prints as its border, as legacy's does.
- **D-113: Find Text as legacy's**, its search module ported unchanged.
  - Create › Measurement opens New Measurement without placing marks, as legacy does.
  - Choose Pages is a flat list, not legacy's folder tree.
- **D-112: Assemblies as legacy's**, the draft's nine questions answered in legacy's
  favour.
  - Writes need `canEditTakeoff`; legacy checks nothing.
  - Use on sheet from the Starter Pack applies its sub-items; legacy probably does not.
  - Starter Pack authoring and the Properties dialog's WBS, height and pitch fields are
    not built.
- **D-111: Dock** as legacy's, now with Dock this snapshot and Dock properties.
- **D-110: Snapshot, Snippets and Link Screenshot.** A custom tag is a free label. The
  floating preview window is a dialog.
- **D-109: markups** in one live table, with legacy's Collaborator tab. Markup undo is
  now built.
- **D-108: public share links.** Guest presence is stored but shows nothing: our presence
  has no page beacons.
- **D-107: Split view.** Its zoom uses the canvas's steps. The zoom keys act on the main
  canvas only.
- **D-106: supersampling by drawing density.** Lines read lighter; landing is up to 0.5 s
  slower at 25%.
- **D-105: whole-device-pixel placement.** A wheel zoom now holds the cursor's point to
  0.5 device px, where it held 0.02 before.

## Legacy differences fixed and left

Everything below was driven side by side with live legacy's "Bench comparison" project, at
2048 × 1050 and 1440 × 900.

### Fixed

- **Takeoff panel header.** "Takeoff | Assemblies" is now two words with a bar, as
  legacy's. The Assemblies panel has:
  - the "My Assemblies ▾" library dropdown;
  - collapse and expand one level;
  - classification groups ("Unclassified" when none).
- **Toolbar.**
  - One cluster from Linear to Note.
  - Legacy's own glyphs, with their red accents.
  - Print ▾ and Find Text beside Select.
- **Menus.**
  - Sheet row: Preview window, Print selected page, Duplicate page, Open in new tab.
  - Canvas: Print This Page.
  - Bookmark: legacy's seven entries.
  - Snapshot: legacy's seven entries, including Link to measurement and Copy image.
  - Multi-select: Print selected pages, Duplicate selected pages.
  - Region box: Page Name, Sheet #, their "All pages…" preview, Scale (with Show) and
    Scale · All pages, Copy as Text, Copy as Image, Search as Text, New Snapshot.
- **Dialogs.**
  - A close × on every dialog.
  - Settings' compact header.
  - The scale prompt fits one row.
  - Share › Project Users is legacy's list with "Add person".
  - The measurement dialog's Named dimensions row and note.
  - Native checkboxes, radios and sliders are orange.
- **Canvas.**
  - A fitted page stays fitted when the window or a panel resizes (legacy's zoom is
    relative).
  - Split's reference pane stands beside the whole canvas column.
  - The Legend shows "· perim N LF".
  - Markup undo and redo work.
  - Dock properties.
- **Estimating.**
  - The TOTAL row is bold with legacy's rule and borders.
  - Group by is legacy's grouped dropdown ("Group rows by", then "Layer tabs"), with the
    same options.

### Left, with reasons

- **No Earthwork or Community tab, and no Overlay tool.** Earthwork is F12, Community is
  not ported, and sheet overlay has no spec.
- **No "Snap PDF" chip.** Vector snapping is not built.
- **AI entries:** Ask AI, Extract Schedule, Auto-Name, the OCR fallback in naming, and
  Scale's AI fallback. These are F14.
- **Auto Count** from a box is not built.
- **Scale from a box does not verify** the printed scale against drawn dimensions. In the
  sweep, a sheet that already has a scale therefore starts unticked, rather than being
  judged by verification as legacy does.
- **The Sub-items section inside the create dialog** is not built; sub-items are added
  from the item's menu.
- **Estimating's control row** wraps at 1440, where legacy's runs off the screen.
- **Guest presence**, and **Starter Pack authoring** by platform admins.
- **Reference pane zoom** reads absolute, "6%" where legacy's reads "100%" at Fit (D-102).
- **Our unchecked checkboxes** are the browser's. Legacy's orange-bordered ones are its
  shadcn `Checkbox` (`border-primary`), which it uses only in some places. Its other boxes
  are native, like ours, so a global change would go beyond legacy.

## Failures and findings

- **1a at DPR 1.25 was not solved on the bench** after more than three attempts; the
  evidence is in D-105.
  - Each of the three causes was proven in a bare page and removed, and a bare-page canvas
    at 125% shows 1:1.
  - In the app at 125% the display is still resampled, and no quarter-pixel offset
    cancels it.
  - Your GPU compositor decides it: the first click check below.
- **The api moved under the run (D-117).** It was not merged, and one api commit is held.
- **Vite missed one file change.** `LegendOverlay.tsx`'s new version was on disk and in
  the container, but Vite served the old module until `docker compose restart app`. After
  the restart everything served fresh. If a change seems not to land, restart `app`.
- **Deleting a cropped or duplicated sheet leaves its generated file in Files.** This is
  already true of Crop as New Page. The files the checks made were deleted by hand; there
  are 0 left in the test project.
- **Every check left the test project as it was:** 29 sheets, 6 items, no markups, no
  snippets, no throwaway assemblies, and its sheet names and bookmarks restored.

## Ideas

- **A "relative zoom" option.** Legacy's zoom follows the canvas width. Ours follows
  D-102 and only keeps a fitted page fitted.
- **A server-side PDF print** (Q4's alternative): paper sizes, and no browser dialog.
- **A shared Checkbox component** with legacy's orange border, in place of native boxes.
- **Remove a sheet's generated file with the sheet**, when nothing else uses it.
- **Scale verification against drawn dimensions** (legacy's "a printed scale is a
  claim"). The parser is ready in `lib/takeoff/scaleText.ts`.
- **The item history is ready for more kinds**, such as calibration changes on items.

## Click-only checks

Most important first.

1. **29% crispness on your real monitor (DPR 1.25).**
   - Open Hidden Valley Spec › Page 1. Zoom menu › 29%.
   - Is the small text as crisp as at 50%? If not, D-105 is still open for your GPU.
2. **D-117.** Look at the api's `umer-dev` (Abdullah's staging merge) and decide the merge.
3. **Resize the browser window at Fit.** The page should stay fitted, as legacy's does.
4. **Takeoff | Assemblies.**
   - Right-click an item › Save as assembly….
   - Switch to Assemblies. Click the new row's swatch, then click on the sheet.
   - A new item appears with the assembly's sub-items.
5. **Ctrl+F › "PLAN" › All Pages.** Click a hit: its sheet opens framed on it.
6. **Print ▾ › Print Current Page.** The browser's dialog shows the page with its takeoff.
7. **Highlight.** Drag one, press Ctrl+Z (it goes), then Ctrl+Y (it returns).
8. **Snapshot.** Press S and drag a box; Save. In Snippets, right-click › Link to
   measurement.
9. **Name from page region.**
   - Drag a Select box over a title block's sheet number.
   - Choose Sheet # · All pages…. The preview reads every page; press Cancel.
10. **Share › Allow "Anyone with Link".** Open the link in a private window.
11. **Split.** The reference pane opens beside the canvas; pick another sheet in it.
12. **Duplicate page** from a sheet's menu. This works on the bench only until D-117 is
    settled.
13. **Estimating › Columns › Modified by.** Click a name to open its Change history.

# Overnight report (2026-09-30, 00:36 to 11:30 UTC)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Test project: "Hidden Valley Spec" in
"F5 Block A demo 15:16", as estimator@bench.intelcost.io (the founder's instruction for
this run).

## Progress

- [x] 1a Snap the stage to whole device pixels — DPR 1 solved, DPR 1.25 not solved on the bench (D-105)
- [x] 1b Clip the raster to the page box (D-105)
- [x] 1c Supersample by drawing density, guard passed (D-106)
- [x] 2 Split view (D-107)
- [x] 3 Public share links (D-108)
- [x] 4 Markup tools and the Collaborator tab (D-109, D-110, D-111)
- [x] 5 F10 assemblies, Starter Pack, Library (D-112; template properties/costs editing and Starter authoring left)
- [ ] 6 The rest of F11
- [ ] Fallback: side by side with live legacy

## Tasks

| Task | Status | Start | End | Duration |
|---|---|---|---|---|
| 1a, 1b | Done at DPR 1; DPR 1.25 not solved on the bench (3+ attempts, evidence in D-105) | 00:36 | 01:45 | 1 h 09 |
| 1c | Done, guard passed | 01:45 | 02:00 | 0 h 15 |
| 2 Split view | Done | 02:00 | 02:11 | 0 h 11 |
| 3 Public share links | Done (guest presence left empty) | 02:11 | 02:32 | 0 h 21 |
| 4a Markups and Collaborator tab | Done | 02:32 | 02:59 | 0 h 27 |
| 4b Carets, visibility, Split markups, Snapshot, Snippets, Dock | Done | 02:59 | 03:44 | 0 h 45 |
| 5 F10 assemblies | Done (library, Save as, Link, Use on sheet, Starter Pack read side; S3 template editing and Starter authoring left) | 03:44 | 04:09 | 0 h 25 |

## Task 1 numbers

**1a: text sharpness on screen against the raster's own pixels** (1.00 = shown 1:1; test project, 2 sheets, 2048 × 1050):

| Zoom | DPR 1 before | DPR 1 after | DPR 1.25 before | DPR 1.25 after |
|---|---|---|---|---|
| 25% | 0.69 | 1.01 | 0.65 | 0.71 |
| 29% | 0.77 | 1.00 | 0.61 | 0.57 |
| 35% | 0.87 | 1.01 | 0.72 | 0.76 |
| 50% | 0.99 | 1.01 | 0.85 | 0.91 |
| 100% | 0.97 | 1.00 | 1.00 | 0.98 |

A 1 px checkerboard painted into the raster: 0% exact on screen before at both ratios; after, 100% exact at DPR 1, still 0% at 1.25. Three causes found and removed (stage translation off the device grid; canvas CSS size not exact in layout units; settled frame scale a hair off 1); at 1.25 the bench's software compositor still resamples, cause not found (D-105).

**1b:** the raster's rounded-up bitmap stood 0 to 1 CSS px past the paper's right and bottom edges (up to 3 px with 1a's rounding); now clipped to the page box exactly.

**1c** (D-106): Fit at 1440 × 900, mean luminance 241.9 → 247.4 and 238.0 → 243.9, dark pixels 3.5% → 0.9% and 3.9% → 1.2%. 29% acutance (edge strength per unit of ink): 0.726 → 0.875, 0.862 → 1.022 (DPR 1); 0.885 → 0.957, 0.737 → 0.955 (DPR 1.25). Landing at 25–29%: + 0 to 540 ms.

## Commits

- app `e43d484` 1a, 1b (D-105); `ec78384` 1c (D-106); `1fd112a` Split view (D-107); `9f67dcc` share links (D-108); `63ce6d1` markups (D-109); `260ce0a` carets and visibility; `0dd98a5` Snapshot (D-110); `f79fdcf` Dock (D-111); `17af197` assemblies (D-112)
- api `f33c191` share links (D-108); `3d7854c` markups (D-109); `fcd014a` snippets (D-110); `0d967aa` dock (D-111); `2633473` assemblies (D-112)

## Decisions to review

- **D-112** (pending): assemblies as legacy's, the draft's nine questions answered in legacy's favour. Writes need `canEditTakeoff` (legacy checks nothing). Use on sheet from the Starter Pack applies its sub-items (legacy probably does not). Template properties and costs editing (F10-S3), Starter authoring and live panel refresh are not built.
- **D-105** (pending): the stage is placed on whole device pixels; a wheel zoom now holds the cursor's point to 0.5 device px instead of 0.02. The raster is clipped to the paper.
- **D-111** (pending): Dock as legacy's; its "Dock this snapshot" shortcut and properties popover not built.
- **D-110** (pending): Snapshot, Snippets and Link Screenshot as legacy's; custom tags are a free label; Open at snapshot does not zoom to the box yet.
- **D-109** (pending): markups in one live table; the draft spec's eight questions answered in legacy's favour; the Collaborator tab as legacy's.
- **D-108** (pending): public share links as legacy's; guest presence is stored but shows nothing (our presence has no page beacons); the link uses the app's own origin.
- **D-107** (pending): Split view's zoom uses the canvas's steps and range, not legacy's + 0.25 to 1200%; zoom keys act on the main canvas only.
- **D-106** (pending): supersampling below about 34% at 125% (42% at 100%), not only below Fit; lines read thinner and lighter; landing up to 0.5 s slower at 25%.

## Legacy differences fixed and left

- **Fixed:** Split view (legacy's `ReferenceCanvasPane`), ported from source.
- **Fixed:** Highlight, Note, Cloud, Callout, Arrow and the Collaborator tab; the Highlight and Note carets; the Markups toggle and Annotations visibility; Snapshot, Snippets, Link Screenshot; Dock.
- **Left:** a Properties panel per markup kind, and undo of markup edits (legacy's undo covers markup placement).
- **Fixed:** public share links (legacy's `ShareLinkBlock`, `guest-project`, `GuestProject`).
- **Left:** guest presence (cursors and pages of the team) — legacy's page beacons have no counterpart yet.
- **Left:** Split view was built from legacy's source, not driven live side by side (time); the pane's zoom buttons stop at 10% where a sheet's fit in the narrow pane is below it (Fit still reaches it).

## Failures and findings

- **1a at DPR 1.25 not solved on the bench** after more than three attempts: evidence in D-105. Each of the three causes was proven in a bare page (a fractional layer translation; a canvas size not exact in layout units; a scale a hair off 1) and removed, and a bare-page canvas at 125% shows 1:1; in the app at 125% the display is still resampled, and no quarter-pixel offset of the stage cancels it (a scale-like resample). The founder's GPU compositor decides it: the 29% check on the real monitor.

## Ideas

## Click-only checks

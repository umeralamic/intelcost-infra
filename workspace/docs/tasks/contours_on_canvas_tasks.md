# Earthwork contours drawn on a canvas (D-1310 g): SPEC ONLY

> Written 2026-11-18 in the night run (morning-report-2026-11-21, task 1g). **Not built:** the brief builds it only once
> D-1310 a–f are done and proved, and the night's time went to them. The FEATURES Planned row "Earthwork contours drawn
> on canvas/WebGL (like measured shapes)" points here. Estimate at the end, in hours.

## Why

D-1294 took React out of a contour's pointer path. What is left at 4× CPU is Chrome painting the sheet's earthwork SVG:
one `<g>` per run (a hit stroke, a halo when selected, the line and its label pill), about 600 SVG paths on V-100 of the
P01 copy (97 existing contours, 1,683 vertices). Any change that dirties the layer (the live band, a hover, a pan step)
repaints and rasterises those paths: about 16 ms a frame at 4× before any code of ours runs (D-1294, frame p50 49.9 ms
on the dev build). D-1310 f draws fewer points when zoomed out; it does not change the count of elements.

## What

The sheet's earthwork runs (existing and proposed contours, spots, the work boundary, their labels) drawn on one canvas
over the sheet, as `ShapeGL` already does for measured shapes, instead of one SVG group each. The selected run, its
handles and anything live (a drawing run, a drag) stay on the small SVG live layer.

### 1. The surface

- One `<canvas data-earthwork-canvas>` the size of the **visible view** × devicePixelRatio, not of the page (a page at
  4000 % is tens of thousands of px). It sits where `EarthworkLayer`'s SVG sits, under the live layer.
- Drawn in one animation frame from the view's matrix (page points → device px: zoom, pan, turn), on every view change
  and on every runs or look change. No React commit per frame: the canvas reads the view from the canvas's own refs, as
  the D-1294 live layer does.
- Each run's outline is a `Path2D` in page points, built once per runs change (and per D-1310 f zoom bucket, from the
  simplified points), cached by geometry uuid and version. A pan only re-strokes the cached paths through a new matrix.
- Strokes keep their screen width (`lineWidth = px / scale`), dashes likewise; the index contours heavier (D-473); blue
  for a crossing or a flagged elevation (D-292), from the same tokens (`--earthwork-eg`, `--earthwork-fg`,
  `--earthwork-error`, read once with `tokenRgb`), never a hex.
- Culling: a run whose bounding box misses the view is not stroked (the boxes kept with the paths).

### 2. Labels

- The label placement (`labelled`: zoom-scaled pills, overlapping ones left out, the selected one always) is kept as it
  is and its result drawn on the canvas: pill, border, text (the app's sans at 600, from the CSS font already loaded).
- Text is drawn at device resolution after the geometry, so it stays crisp at any zoom.

### 3. Hit-testing

- A spatial index over every run's segments in page points (a uniform grid sized to the sheet, as D-656's snapping
  index; rebuilt with the paths). `hitRun(at, tolPx)`: the nearest run within 5 screen px (the SVG hit stroke was 10 px
  wide), spots by their 8 px circle.
- One `pointerdown` / `pointermove` / `contextmenu` listener on the layer box replaces the per-run SVG hit strokes; it
  calls the same `press`, `onHover` and `openMenu` the SVG events call today (`EarthworkLayer.tsx`), so selection, the
  D-1310 c nearest-vertex rule, Alt-drag, the hover card and the menu do not change.
- The pointer move's hover hit-test runs at most once per animation frame (the pointer kept in a ref).

### 4. The selected run and the live layer

- The selected run is drawn on the SVG live layer (its halo, line, handles, notes), not on the canvas, so its handles
  stay DOM elements: the D-1310 c press logic and the fixtures that press `[data-earthwork-handle]` keep working.
- A drag (D-1310 e) already paints on the live layer; the canvas leaves the dragged run out while it is held.
- Drafts (dashed until saved, "not saved · Retry") stay SVG: few, and they carry a button.

### 5. What fixtures and other code read

- `[data-earthwork-run="<uuid>"]`, `[data-kind]` and `[data-selected="1"]` are read by fixtures (r5, r6, f7-m, c53) and
  by the D-1310 harness. Each run keeps an empty, unpainted `<g data-earthwork-run …>` in a hidden SVG (no children, no
  paint cost), and the selected one its real group on the live layer, so those selectors still match.
- Split view's Reference pane (`split/ReferencePane.tsx`) draws `EarthworkLayer` too, read only: it takes the same canvas with no events.
- The 3D view and the TIN layer are separate; unchanged.

### 6. Results

Display only: no quantity, check or TIN reads the canvas. The quantity table and a cut/fill comparison on a P01 copy,
before and after, to the cent (as D-1294 and D-1310).

## Measured to accept

The D-1310 harness on V-100 of a P01 copy, dev and production, 1× and 4×: frames during the contour path and a pan,
frame p95 and dropped at 4×, against D-1310's after figures. Target: frame p50 at 4× under 25 ms on the contour path
(today 49.9 ms dev), no frame drop at rest.

## Estimate

| Part | Hours |
|---|---|
| Canvas surface, matrix, paths, culling, colours from tokens | 4 |
| Labels on the canvas | 2 |
| Hit index and the one listener (press, hover, menu) | 3 |
| Selected run on the live layer; drafts; hidden markers for fixtures | 2 |
| Gates, quantity table, smoke, before/after harness on dev and production | 2.5 |
| **Total** | **13.5** |

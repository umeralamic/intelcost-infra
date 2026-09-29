# Zoom handover glitch: status (2026-09-29)

The founder's report: after a wheel zoom, the sheet visibly moves and glitches when
the sharp redraw replaces the stretched frame. The fix is committed as **work in
progress**: `intelcost-app-react` `7b21b4a` on `umer-dev`. The gates are green and the
quantity table passes. Not yet driven by hand.

## Causes found

1. **Markups popped at the commit.** During the gesture the stage is scaled on the GPU,
   so every size in screen px (stroke widths, count marks, vertex dots, the Dimension
   layer) grew with it, then snapped back when the zoom was committed. Count marks
   reached 2.1× their final size.
2. **Three swaps after every zoom, not one:** the commit (stretched frame), then a
   half-resolution pass (a visible blur, and often blurrier than the stretched frame),
   then the sharp frame.
3. **The raster was placed from rounded sizes.** `renderPage` rounded the page size up
   to whole px, but drew the bitmap at the exact scale. The CSS box stretched it by
   exact / rounded: 0.2 to 0.5 px off the markups, a different amount at every zoom.
4. **The commit placed the view from a model of the layout** (gutter, centring), not
   the layout itself: 0.63 px jump at the commit when zooming from the fit.
5. **Windowed edges:** above 2.5× the raster covers the view plus 35% per side. A zoom
   out below 0.59× showed edges with no sharp raster. The fit image lay underneath only
   when the sheet had not opened from cache.

Legacy (live, `UmeralamDEV`, same three gestures) is not invisible either. Its
markups stay a blurred, thickened bitmap until a redraw, and a "Loading page…" chip
appears during the handover.

## What is fixed (in `7b21b4a`)

- **Markup sizes through the gesture** (`SheetCanvas.tsx`):
  - A `gestureScale` state is set each frame with `flushSync`, then the stage transform
    is written in the same frame.
  - Sizes read the zoom on screen (`sizeZoom`), and px-to-page conversions use the page
    on screen (`pagePxW` × scale).
  - The markup SVG (and `DimensionLayer`) is laid out at the on-screen size and scaled
    back by exactly 1 / scale. The geometry stays on the one stage transform.
- **Measured commit** (`SheetCanvas.tsx`):
  - At gesture start the footprint's box is measured (`stagePx`), giving the page point
    under the cursor.
  - At the commit the layout effect turns the stage transform off, measures the new
    layout (before paint), and puts that page point back under the cursor.
- **Exact raster placement** (`raster.ts`): `pageWidth` and `pageHeight` are exact, and
  each frame carries `pixelRatio`. The canvas is placed at its own size
  (`canvas.width / pixelRatio × frameScale`).
- **One swap, double buffered** (`use-page-raster.ts`): no half-resolution pass once a
  frame is on screen. The stretched frame stays until the sharp one is fully drawn.
  After a wheel commit the sharp frame starts at once (`settleMs: 0`, legacy's
  settleFast).
- **Edges:**
  - The window margin is half a view per side (`renderWindow`; legacy's is 0.35).
  - The fit image always lies under a windowed raster.

## Numbers (bench, E101 sheet, headless Chromium)

Three wheel gestures: fit → 2.46×, 2.46× → 5.2× (windowed), 5.2× → 3.3× (zoom out). DOM
recorded on every animation frame, plus a CDP screencast of every painted frame. "Before"
is the same bench with `7b21b4a` stashed.

| Measure | Before (DPR 1 / 1.25) | After (DPR 1 / 1.25) |
|---|---|---|
| Visible swaps after the gesture | 3 / 3 | **2 / 2** (commit, sharp) |
| Half-resolution frames | 1 per zoom | **0** |
| Page jump at a swap (DOM) | 0.64 / 0.54 px | **≤ 0.027 / 0.020 px** |
| Raster vs markup mismatch (DOM) | 0.49 / 0.41 px | **≤ 0.010 / 0.012 px** |
| Count-mark size in the gesture vs final | up to 2.12× / 1.82× | **1.00× / 1.00×** |
| Frames with no picture | 0 | 0 |
| View not covered by the sharp raster (DOM) | up to 4.7% (zoom out) | 0% |
| Frame time during the gesture, mean ms | 17.7–19.9 / 16.9–22.7 | 19.6–27.5 / 17.9–21.7 |

## Still open

1. **The screencast analysis still shows markup shift after the gesture** in 2 of 6
   runs:
   - 4.3 px in the fit → 2.46× run at DPR 1;
   - 9.3 px in the zoom out at DPR 1.25.
   The DOM puts the markups within 0.01 px of the raster in every frame. So either a
   frame shows the counter-scale and the stage scale out of step, or the analysis still
   mixes in a frame from the gesture's tail. The frame dumps were not inspected for
   these runs.
2. **Frame time:** the fit → 2.46× gesture at DPR 1 rose from 17.7 to 27.5 ms mean.
   That's probably the synchronous canvas render (`flushSync`) every frame on a sheet
   with many markups. The other five runs are within ±2 ms.
3. **One soft-edge frame in the zoom out:** blank-looking area 4.7% (DPR 1) and 7.3%
   (DPR 1.25). That's the fit-image underlay (low resolution), not empty; the DOM shows
   0% uncovered.
4. **Not driven by hand yet**, and not measured on a GPU browser (the bench's Chromium
   renders in software).

## Exact next step

Rebuild the throwaway measurement script:
- **Where:** `intelcost-infra/browser/`, deleted after use per `docs/legacy_comparison.md`.
- **How it measured:**
  - a CDP `Page.startScreencast` (PNG) plus a per-`requestAnimationFrame` DOM record
    (stage transform, raster rect and data attributes, SVG rect, `[data-count-symbol]`
    width);
  - shift estimated against the settled frame on 16 textured patches, SSD with a
    structure-tensor gate.
- **Sheet:** smoke project `e370e723…`, E101 sheet `c10d71e6-c9f1-430e-9693-ec1de51a5ef3`,
  which carries markups `zz run`, `zz area`, `zz count`.

Then:
1. Dump the frames of the fit → 2.46× run at DPR 1 and look at the frames the analysis
   flags. That settles open item 1: either a real one-frame desync between the markups
   and the stage, or an analysis artefact.
2. If a desync is real, move the stage transform write into a `useLayoutEffect` keyed on
   `gestureScale`, so both land in one React commit.
3. If frame time matters, split the markup SVG into a memoised component, so a gesture
   frame re-renders only it.
4. Drive a wheel zoom by hand on a GPU browser (a DPR 1.25 laptop), then close out.
   Close-out means:
   - log the decisions (drop the half-resolution pass, margin 0.5, fit underlay while
     windowed) as a D-NN;
   - tick PARITY;
   - drop the WIP label.

## Left on the bench

- **Smoke project:** two uploads named `zz-e101.pdf` that the api won't delete while
  the E101 sheet reads from them, and the three `zz` markups on that sheet.
- **`intelcost-infra/docker-compose.yml`** already mounts `vite.config.ts` (round 4 A1).

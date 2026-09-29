# Zoom handover glitch: status (2026-09-29)

**Done** (D-100). After a wheel zoom the handover is one swap, stretched to sharp, with
nothing moving. The one remaining visible change is the frame sharpening, which a
stretched frame cannot avoid.
- **Commits:** the work-in-progress commit `7b21b4a`, then the landing commit that
  follows it on `umer-dev`.
- **Checks:** gates green; quantity table passes; bench measurement and an MCP smoke
  check.

## Causes found

1. **Markups popped at the commit.** During the gesture the stage is scaled on the GPU,
   so every size in screen px grew with it, then snapped back at the commit. Count marks
   reached 2.1× their size.
2. **Three changes after every zoom:**
   - the commit, where the stretched picture moved from a GPU-scaled layer to a
     CSS-stretched canvas and its resampling changed visibly;
   - a half-resolution pass;
   - the sharp frame.
3. **The raster was placed from rounded sizes.** The page size was rounded up to whole
   px, but the bitmap was drawn at the exact scale: 0.2 to 0.5 px against the markups.
4. **The commit placed the view from a model of the layout:** 0.63 px jump from the
   fit.
5. **Windowed edges:** a 35% margin, and no underlay when the sheet opened from cache.

The frame analysis also reported stretched frames 1–1.6 px "off" the sharp one, and one
markup patch 9 px off. Magnified crops showed the same structures at the same pixels:
that's blur read as shift, and sheet lines seen through the translucent Area fill.

## What changed

- `SheetCanvas.tsx`:
  - When the wheel stops, the gesture stays on screen while `prepare` draws the landing
    zoom's sharp frame. The zoom is committed with that frame (`handoff`) in one React
    commit.
  - A tick cancels the draw. A press lands at once.
  - `gestureScale` is rendered with `flushSync` in the same frame as the stage scale:
    the markup SVG and `DimensionLayer` are counter-scaled, and sizes read the zoom on
    screen.
  - The commit is placed from the measured layout (`stagePx`).
- `use-page-raster.ts`:
  - `prepare(zoom, signal)`, with the window read from the screen (`windowFor`).
  - No half-resolution pass once a frame is shown.
  - `settleMs` is 0 after a wheel commit.
- `raster.ts`:
  - Exact `pageWidth` and `pageHeight`, and `pixelRatio`: the bitmap is placed at its
    own size.
  - Window margin 0.5.
- Fit image under any windowed raster.

## Numbers (bench, E101 sheet, headless Chromium, software rendering)

| Measure | Before (DPR 1 / 1.25) | After (DPR 1 / 1.25) |
|---|---|---|
| Changes after the gesture (DOM) | 3 / 3 | **1 / 1** |
| Visible image changes after the gesture | 4 / 4 | **1 / 1** (0 in one run) |
| Page jump at a swap | 0.64 / 0.54 px | **≤ 0.019 / 0.013 px** |
| Raster vs markup mismatch | 0.49 / 0.41 px | **≤ 0.011 / 0.012 px** |
| Count-mark size in the gesture vs final | up to 2.12× / 1.82× | **1.00× / 1.00×** |
| View not covered by the sharp raster | up to 4.7% | **0%** |
| Frames with no picture | 0 | 0 |
| Settled frame vs final (image) | — | 0.02–0.10 px |
| Gesture frame time, mean | 17.7–22.7 ms | 18.1–22.9 ms |
| Sharp frame after the last tick | 330–620 ms | 300–505 ms |

The MCP smoke check:
- Ticks during the landing draw carried the gesture on, and it landed once (212%).
- A left press mid-gesture landed at once, 92 ms after the last tick.

## Left

- **Not driven on a GPU browser or at 125% display scale by hand.** The bench renders
  in software. This is the founder's click check.
- **Smoke project:** two uploads named `zz-e101.pdf` that the api will not delete while
  the E101 sheet reads from them, and the markups `zz run`, `zz area` and `zz count` on
  that sheet.

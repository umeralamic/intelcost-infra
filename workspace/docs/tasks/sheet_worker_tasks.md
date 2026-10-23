# Sheet drawing in a worker: tasks

**State:** parked (2026-10-22, Umer). The plan is approved in principle and waits for his go
(pending_umer.md). Follows D-708. Not started: no code, no D-NN yet.

## Problem

At and below Fit the sheet is drawn ×4 within 20 M px, else ×2 (D-708 left today's rule there). On
text-heavy sheets, dpr 1.25 lands on ×2, which measures 4.2–5.2 against the reference on the r1-raster-text
sheet (6.5–8.6 on the real CCCP notes); ×4 is within 4 at every dpr. The r1-raster-text fixture exempts Fit
and below until this is fixed. ×4 on A010.3 takes about 5 s, and on the main thread that draw drops the page
from 61 to 14 fps, with one stall of 1.8 s.

## What the measurements showed (2026-10-22, bench browser, BENCH DUPs of A010.3 and C-200, purged)

The draws were done in the app's page with its pdf.js, at a Fit 1224 CSS px wide, ×4 halved down as `raster.ts` does.

**The cost is per glyph, not per canvas pixel.** A010.3's Fit draw at ×4 takes about 5 s whether it is one
canvas or tiles under 6 M px (or 4 M). A fixed 1500 × 1000 window takes about 0.3 s at any glyph size, so the
time follows how many glyphs are drawn larger than about 6 device px. Drawing glyphs as paths
(`disableFontFace`) takes about 5 s at every size. **D-708's explanation, a canvas cliff past about 6–8 M px,
was a confound.** Its decision text and the `FIT_BUDGET` comment in `raster.ts` say so; correct both in this
block's decision.

Fit draw times, ×4, in ms (two runs each where shown):

| dpr | A010.3, one canvas | A010.3, tiled 6 M | C-200, one canvas | C-200, tiled 6 M |
|---|---|---|---|---|
| 1 | 5,050–5,130 | 4,850–5,140 | 1,146 | 1,018 |
| 1.25 | 4,970–5,370 | 5,240–5,310 | 1,536 | 1,051 |
| 1.5 | 5,190–5,360 | 4,810–5,550 | 1,587 | 1,327 |
| 2 | 5,190–6,580 | 5,310–5,640 | 2,000 | 1,763 |

Today's rule (×2), A010.3: dpr 1 950–1,080 ms; dpr 1.25 5,490–5,600; 1.5 4,800–4,950; 2 5,280–5,380.
C-200 ×2: 706–1,047 ms. Recheck the earlier figure of 0.3 s for ×2 at dpr 1.25 (it disagrees with these).

**During a main-thread ×4 draw** (A010.3, dpr 1): 61 fps idle, 14 fps during, frame gaps p50 17 ms, p95
117 ms, worst 1,832 ms.

**Tiles against one canvas** (A010.3, glyph paths, ×4): mean difference 0.002–0.005 levels, but a few px
differ by up to 16–38 levels.

## The plan

1. **The draw in a worker (the main fix).** pdf.js 5.7 has no supported in-worker drawing, but its drawing
   code takes replaceable parts:
   - OffscreenCanvas page canvases (a `CanvasFactory`);
   - the worker's own font set (`self.fonts`) in place of the document's;
   - a no-op `FilterFactory` in place of the SVG filters (the rare PDFs using transfer functions lose them);
   - `useWorkerFetch` passed explicitly, since its default reads `document.baseURI`.

   The worker opens its own copy of each one-page sheet PDF, draws, and returns an ImageBitmap. The frame's
   geometry (origin, size, the device-px grid, D-105) stays in `raster.ts` and only the drawing moves.
   Cancellation goes by message, and the cache keys are unchanged. If the worker cannot start (no 2D
   OffscreenCanvas: needs Firefox 105+ or Safari 16.4+), the draw falls back to today's main-thread one.
2. **Fit and below at ×4 at every dpr**, drawn in the worker while the current frame stays on screen, then
   swapped in. The page stays at 60 fps. The sharp frame stays about 5 s on A010.3 and 1.0–1.8 s on C-200:
   the worker removes the freeze, not the cost. Once drawn, the Fit frame is cached as today.
3. **Tiles inside the worker, to cap memory only.** ×4 at dpr 2 is a 64 M px, 256 MB canvas; tiles keep
   each piece about 24 MB, and they trim C-200 by 10–30 %. Tile edges go on whole supersampled px, with a
   2 px overlap that is cropped. If tiled and one-canvas draws cannot be held to a maximum difference of 1
   level, no tiles.
4. **C-200's sharp frame after a wheel zoom** (550–1065 ms at every dpr, before D-708 too; pending_umer):
   profile it in this block. The worker stops it freezing the page but will not shorten it.

## Checks

- r1-raster-text with `EXEMPT_AT_OR_BELOW_FIT` dropped: every case within 4 at every dpr. A worker draw is
  compared against the main-thread draw, and tiled against one canvas (maximum difference 1 level) on
  A010.3, C-200 and the test sheet.
- m6-position 5/5, run alone.
- Fit sharp-frame time and fps during the draw, per dpr (1, 1.25, 1.5, 2), on BENCH DUPs of A010.3 and C-200.
- The gates and the quantity table.

## Risks

- **Position (m6-position):** low, since the geometry stays in `raster.ts`.
- **Seams:** handled by the edge alignment and overlap above, with the check as the gate.
- **Font rendering in a worker:** it may differ from the main thread's; r1-raster-text compares the two.
- **Memory:** each open sheet's PDF is held twice (main thread for text and snapping, worker for drawing).
  Sheets are one-page PDFs, so this is small.

## Estimate

The worker is about 1–1.5 days, with tiles inside it about half a day more: about 2 days in all.

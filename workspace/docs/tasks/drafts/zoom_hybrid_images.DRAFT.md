# Hybrid zoom: pre-made images during gestures, pdf.js once settled (DRAFT)

Status: **proposal, not built** (the founder's round 5, item 5, 2026-09-29). Questions at
the end wait on the founder.

## The ask

zzTakeoff zoomed in August with about 918 MB against our 5.1 GB. Proposed: pdf.js first
paint as now; during a zoom gesture, the GPU scales pre-made images at a few zoom levels,
made by `worker-previews` after upload; the sharp pdf.js raster only once the zoom settles.

## What we measured first (round 5, the bench)

A zoom dance on a dense electrical sheet (34 × 22 in): Fit to 400% by the wheel and back,
10 cycles, a 2048 × 1050 window at DPR 1.25, production builds, Chromium's software
renderer (the bench has no GPU).

| | Round start | Now (items 1 to 4) |
|---|---|---|
| Renderer memory after each cycle, collected | 296 to 375 MB | 343 to 440 MB |
| Renderer peak within a cycle | 358 to 458 MB | 408 to 537 MB |
| GPU process | 58 to 66 MB | 59 to 67 MB |
| Canvases holding pixels after a cycle | 5 (30 MB) | 6 (40 MB) |
| Decoded images (ImageBitmap) open | 0 | 3 (31 MB): this sheet's fit image and two neighbours' |
| Bitmap cache | 17 MB of its 128 MB budget | 17 MB of 128 MB |
| Frame time in gestures: mean, p95 | 17.4 ms, 16.8 ms | 17.5 ms, 16.8 ms |
| Frames over 50 ms | 5 | 11 (10 of them in cycle 1, while the fit images were fetched ahead) |

- **No leak.** Memory falls over the 10 cycles in both builds. The count of live canvases
  and bitmaps is flat. Every canvas the cache drops is zeroed. The supersampled canvas
  (D-104) and the held picture (D-101) are zeroed when they are done. Evicted fit bitmaps
  are closed.
- **The ~65 MB more** is round 5's switching (D-101): 3 decoded fit images (31 MB), the fit
  canvas (11 MB), and the encoded fit images fetched ahead (about 20 MB for 113 sheets).
- **The 5.1 GB is not reproduced.** Every memory figure above is under 0.6 GB. The August
  figure was on a real GPU. There, Chrome's GPU process holds a texture for every
  composited layer and canvas. The bench's software renderer has no such memory, so this
  table cannot show it. **Step 0 of this proposal is to measure on the founder's machine.**
  Use Chrome's Task Manager (Shift+Esc): the tab's memory footprint and the GPU process,
  on the same sheet and dance, ours against zzTakeoff. If the GPU process is where the
  gigabytes are, the cheapest win is below (Ideas), not this proposal.

## The proposal

1. **After a page is ready,** a low-priority `worker-previews` job makes two more levels of
   the page image, beside today's 2048 px fit image. Each is WebP in 1024 × 1024 tiles:
   - 4096 px wide: 120 px per inch on a 34 in sheet, sharp to about 70% at DPR 1;
   - 8192 px wide: 241 px per inch, sharp to about 140%.

   Tiles, because an 8192 px page decoded whole is 170 MB. Keyed like the fit image, by
   sheet and version:
   `takeoff/{ws}/{project}/pages/{file}/{page}@{level}/{x}_{y}.webp`.
2. **During a gesture** (the wheel, a pinch, the zoom menu's jump), the canvas shows the
   tiles of the smallest level at or above the screen's density. They are GPU-scaled, and
   under them lies the next level down, already on screen. Only the tiles in view plus a
   ring are fetched and decoded, off the main thread (`createImageBitmap`). They sit in a
   tile LRU with its own budget.
3. **Once the zoom settles,** the sharp pdf.js raster for the view, as now (D-100's one
   swap). Past 140% the settled picture is pdf.js alone. The tiles are the gesture's
   picture, never the settled one: D-35's "sharp at every zoom" stands.
4. **Without tiles** (a page still preparing, a failed job), today's path, unchanged.

### Expected memory in the browser

| | Now | Hybrid |
|---|---|---|
| Sharp pdf.js raster (400%, windowed, cached and its on-screen copy) | 2 × 27 MB | the same |
| Bitmap cache (full / ≤ 8 GB / ≤ 4 GB) | 256 / 128 / 64 MB | 128 / 64 / 32 MB, since gestures no longer lean on it |
| Tiles in view (2560 × 1312 device px, two levels) | none | about 12 tiles a level × 4 MB = 50 MB a level |
| Tile LRU (full / ≤ 8 GB / ≤ 4 GB) | none | 96 / 48 / 24 MB |
| Fit images (D-101) | about 60 MB | the same |

Net: roughly the same peak on an 8 GB machine (the bitmap cache's budget moves to the tile
cache). The gain is a sharp picture while zooming, and at once after a jump. Today, after
a jump from the menu, the stretched last frame shows until pdf.js draws the new one: 650
to 880 ms for the dense sheet at 10% or 25% on the bench. The gain is not less memory. Less memory,
if the founder's machine shows it is needed, comes from the ideas below.

### The cost of the extra images

Measured on the bench's `worker-previews`, on the dense sheet (source 1.9 MB):

| Level | Raster | Encode | Stored |
|---|---|---|---|
| 2048 px, the fit image today | 0.61 s | 0.30 s | 277 KB |
| 4096 px, 12 tiles | 0.76 s | 0.86 s | 771 KB |
| 8192 px, 48 tiles | 1.69 s | 2.21 s | 1.8 MB |

- **Per sheet, extra:** about 5.5 s of one worker's CPU and 2.6 MB of storage. That is 10
  times the fit image's bytes.
- **Per 113-sheet set:** about 10 minutes of one worker in the background, and about
  290 MB stored. A 625-sheet set (the bench's largest) is about 1 hour and 1.6 GB.
- **Egress:** only the tiles in view are ever fetched, about 12 tiles (1 MB or less) for a
  zoom into one area.
- Deleting a drawing or bumping its version must remove the tiles too. They are keyed by
  version, so a new version never serves old tiles.

### IDM impact

The founder's Internet Download Manager already took the sheet PDFs when they were served
as `.pdf`. That is why sources are served as `application/vnd.intelcost.sheet` with no
extension (D-42). IDM's default capture list is extensions and types of downloads, and it
has no image type. So tiles served as `image/webp`, with a `.webp` key and no
`Content-Disposition: attachment`, fetched by `fetch()`, should pass by as the fit images
do today: 113 of them were fetched in round 5's smoke check without a failure. Tiles make
many small requests; IDM does not act on request counts. To confirm on the founder's
machine: a zoom into a tiled sheet with IDM running, and IDM's download list stays empty.

## Ideas (cheaper, first)

- **Show the cached raster, not a copy of it.** The canvas draws every frame into its own
  visible canvas, so each frame on screen exists twice: 27 MB more at 400%. Moving the
  cached canvas into the page would halve the raster memory. It is a change to the
  handover (D-100), so it needs the same measurements again.
- **A lower bitmap budget on a GPU machine,** if the founder's measurement shows the GPU
  process growing with the cache.
- **Supersampling at a low Fit** (D-104 left it): at 1440 × 900 a dense sheet's Fit is
  13.6% and still draws dark.

## Questions for the founder

1. **Measure first?** Run step 0 on your machine (Chrome's Task Manager, ours and
   zzTakeoff, the same sheet and dance) before any of this is built?
2. **Which levels?** 4096 and 8192, or one level (8192 tiled) only?
3. **When to make them?** Every page as it is prepared, or only a set's pages once opened
   in takeoff (less storage for sets never measured)?
4. **Storage and CPU:** is about 1 hour of worker time and 1.6 GB for a 625-sheet set
   acceptable, or is this a paid-plan feature?

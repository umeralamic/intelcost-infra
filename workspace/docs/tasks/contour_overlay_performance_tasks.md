# Contour and overlay performance (D-1310)

The founder's top priority in the night run of 2026-11-17/18 (morning-report-2026-11-21, brief task 1). Built
unattended; awaiting the founder's check. Spec, findings and figures; the canvas spec (task g) is
[contours_on_canvas_tasks.md](contours_on_canvas_tasks.md).

## The brief (task 1)

Test on throwaway copies of a dense contour sheet (P01's V-100 copy, as in D-1294) with 1, 2 and 3 overlays; measure
before and after on dev and production builds at 1× and 4× CPU: Chrome memory, frame p95, dropped frames and time per
action. (a) 3 overlays under ~500 MB and no frame drop at rest; (b) Ortho per tool, Contour starting off; (c) a drag
moves one point, the nearest, with a screen-pixel tolerance, the whole contour only by a deliberate action; (d) breaking
a contour local and instant, the recalculation after it debounced and off the main thread; (e) D-1294's approach for
editing, the TIN in a worker after an edit ends; (f) display simplification at low zoom; (g) contours on canvas, spec
first. Quantities to the cent before and after.

## Where it was measured

- A throwaway account (`fx.d1310.20261117224542`, purged at the end) and its own workspace, with a copy of P01 made the
  way D-1294 made it (`drives/copy-3d-test.py`, the guard list's test copy; the bucket's DNS failures that night needed
  S3 retries for the copier, no code change). Sheet V-100: 97 existing contours, 1,683 vertices, 2448 × 1584 pt.
  Overlays C-200, C-100 and C-300 laid over it page on page, Highlight changes (the dialog's default); 0 to 3 of them.
- Builds: "before" is umer-dev at e2050eb, "after" is e2050eb with this change, both from scratch trees, never the
  bench's app: the Vite dev server on 5175, and `vite build` served by `vite preview` on the same port (one origin, one
  session; never both at once). Each series under the `heavy` lock, alone.
- A headed Chromium of our own (the MCP's build, 1440 × 900 at DPR 1.25), guarded like the bench's browsers. Memory:
  Chrome's memory-infra dumps, the private footprint of every process (Chrome total), of the tab's renderer and of the
  GPU process, at load and after each action; the peak is the largest. Frames: `requestAnimationFrame` intervals,
  dropped over 25 ms. Actions: four wheel steps in, a 450 px middle-drag pan, four more steps in, eight out, Zoom to fit;
  the time an action takes is until the overlays' picture for the new view has landed (`overlay:sharp`). Then D-1294's
  contour pointer path (900 moves, 10 clicks, taken back). The bench bucket answered CORS for 5173 only and its name
  failed to resolve half the time that night: the harness adds the CORS header and pins the bucket's name to one S3
  address in its own browser and process (no bench change).
- Editing: the same sheet, no overlays, zoomed in three wheel steps; one vertex of a contour pressed on its line 6 px from
  the point (inside the line's 10 px hit stroke, outside the 7 px handle) and dragged 60 moves; then "Break contour at
  this point" from that vertex's menu. React commits counted by a DevTools hook stub, as D-1294's.
- Harness and figures: `intelcost-infra/morning-report-2026-11-21/d1310/` (JSON per run, MEASUREMENTS.md).

## Findings and fixes

### a. Overlays: why 2–3 overlays pass 1.2 GB

The dumps on the dev build before, 1×: Chrome total at load 851 MB with no overlay, 1,819 with one, 1,863 with two,
2,318 with three (2,652 back at Fit after the zooms). Of the tab's 1,572 MB with three: `partition_alloc` (array buffers:
read-back pixels, masks, painted images, picture copies) 727 MB against 121 with none; `malloc` (pdf.js drawing the
overlays' PDFs) 357 against 71; `canvas` and `gpu/mapped_memory` 173 against 14; six PDFs open against three.

What the code did, per overlay, every time the view rested:

1. **Every Highlight changes overlay was worked out and drawn, though its picture is opaque.** With three, the two under
   the top one could not be seen, yet each had its fit difference, its view pass and its canvases.
2. **The view pass worked up to 8 MP even at Fit** (`MAX_COMPUTE_PX`): 7.75 MP at factor 4 for a 0.48 MP picture, about
   25 bytes a pixel at its peak, so about 200 MB a pass; the overlays' passes ran at the same time, each drawing the base
   sheet's PDF again.
3. **The pictures sent to the worker were copied and never freed:** `postMessage` with no transfer list cloned both
   ImageBitmaps (2 × 31 MB a pass) and the worker never closed its copies; its OffscreenCanvas (31 MB, with a CPU copy for
   `willReadFrequently`) stayed for the next job.
4. **The worker kept four worked differences at full resolution** (3 bytes a worked pixel), up to 23 MB each.
5. **The page kept 96 MB of old views' pictures** (8 entries), and copied each painted array again for `ImageData`.
6. **As drawn overlays were one SVG image each under a colour-matrix filter**, rasterised per overlay.

The fixes:

- `OverlayLayer.tsx:OverlayLayer`: only the topmost Highlight changes picture and what lies over it is mounted; those it
  hides are neither worked out nor kept (status none). `ProjectTakeoff.tsx:barRow` speaks for the topmost overlay, the
  one seen (it spoke for the first).
- `OverlayLayer.tsx:DrawnBlend`, `paperCleared`: every As drawn overlay blended once into one canvas at the fit images'
  2048 px, each image's paper cleared once by the SVG filter's own alpha rule and kept (4 at most); drawn again only when
  an overlay, its matrix or its opacity changes. One being nudged stays a live SVG picture.
- `useSharpDifference.ts`: the view worked at no more than 4 MP (`VIEW_MAX_PX`, about a full-HD view with its margin,
  passed to the planner, whose own default and quantity-table rows are unchanged), one view job at a time across all
  overlays (`oneAtATime`), its two pictures handed to the worker rather than copied, old views kept within 32 MB and 4
  entries. (Dropping the overlay PDF page's drawing data after each render was tried and taken out: re-reading it made
  every view slower.)
- `difference.worker.ts`: both pictures closed and the drawing surface dropped after every job.
- `differenceJob.ts`, `lib/takeoff/overlay/difference.ts:compactDifference`, `paintCompact`: a difference is kept at the
  size it is painted (4 bytes a painted pixel: the darkest added and removed coverage and the summed unchanged coverage
  per block), from which any Fade repaints as `paintChangesDown` paints.
- `OverlayLayer.tsx:ChangesPicture`: the worker's array put on the canvas without a copy.
- `useOverlayDifference.ts`: a fit picture whose fetch stalled past its limit is asked again twice, 1.5 s apart, instead
  of leaving the overlay blank until the sheet is opened again (seen in the harness while the page was busy).

### b. Ortho per tool

Ortho was one switch per tab (`takeoffOrtho`, `earthOrtho`): on for Contour meant on for every earthwork tool, and the
Takeoff tab's was Settings' for every tool. `ProjectTakeoff.tsx` (`orthoByTool`, `orthoTool`, `ortho`, `setOrtho`) keeps
it per tool (`earth:contour`, `earth:boundary`, `earth:utility`, `earth:strip`, `earth:site-feature`, `takeoff:lf`,
`takeoff:sf`, …). Contour always starts off; the other earthwork tools start off (D-186); a takeoff tool starts from
Settings › Snapping (on by default). Toggled with no tool armed it sets the tab's start for tools not yet toggled
(Contour's stays off). Kept for the session, as before.

### c. Dragging a contour point

What was wrong (`EarthworkLayer.tsx:press`): on the selected contour, a press on its **line** dragged the **whole
contour**. The line's hit stroke is 10 px wide and a handle 7 px, so a press 4–5 px from a point along the line missed the
handle and every point moved. Where two handles overlapped (points closer than 7 px at the zoom) the one drawn last took
the press, not the nearest, and a run drawn later than the selected one took presses meant for its handles.

Now a press on the selected run, handle or line, drags the **one vertex nearest it within 10 screen px**
(`VERTEX_HIT_PX`, `nearestVertex`); a press on the line away from every vertex moves nothing; the whole contour or
boundary moves only with **Alt held at the press** (Alt-drag: no new mark on a dense sheet; the menu's Move is as it was).
The selected run is drawn last (`order`), so its handles lie over every other run. Fixture `c53-contour-vertex-drag`.

### d. Breaking a contour

Before, "Break contour at this point" showed the two halves only after the api's write and the items' refetch, and the
checks then ran on the main thread. Now `useEarthwork.tsx:breakRun` puts the halves into the project's items at once
(`queryClient.setQueryData`; the refetch after the write puts the stored rows in place, a failure's refetch the old
one), and the checks follow off the main thread (e).

### e. Editing speed

- The vertex drag on a live layer of its own (`EarthworkLayer.tsx`: `livePath`, `liveHandle`, `paint`, `move`,
  `svg[data-earthwork-live-layer]`): each move notes the pointer; one animation frame writes the outline and the handle;
  the run's own drawing is hidden while its copy follows. No React commit until the release (D-1294's way).
- The live checks in a worker after an edit ends (`useLiveChecks.ts`, `liveChecks.worker.ts`, `liveChecksWork.ts`):
  the crossing check, the elevation check (D-292) and the TINs the toggles show, `SETTLE_MS` (120 ms) after the runs stop
  changing, in one worker, the latest inputs winning, the last answer kept until the next. Not incremental: the sheet's
  checks are run whole, off the main thread.

### f. Display simplification

`displaySimplify.ts:simplifyForDisplay` (Douglas–Peucker) for contours while a page point is smaller than a screen
pixel: no point left out further than 0.7 screen px from the line drawn, worked again only when the zoom crosses a power
of two (`simplifyBucket`). On V-100 at Fit the drawn contour points fall from 1,683 to 951. Display only: the runs keep
every vertex for their handles, labels, checks, TINs and quantities (hard rule 3).

### g. Contours on canvas

Spec only, with hours: [contours_on_canvas_tasks.md](contours_on_canvas_tasks.md).

## Results

Full tables: `intelcost-infra/morning-report-2026-11-21/d1310/MEASUREMENTS.md`. Before: e2050eb. After: the files of
app 6127378 and 1d9c69d on e2050eb.

| Dev, 1× | Chrome total at load / peak | Tab at load / peak | Zoom in frames p95 / dropped |
|---|---|---|---|
| 0 overlays, before → after | 851 / 1,632 → 750 / 750 | 435 / 728 → 364 / 364 | 66.6 / 11 → 33.2 / 7 |
| 1 overlay | 1,819 / 1,819 → 1,070 / 1,303 | 1,144 / 1,144 → 629 / 636 | 49.9 / 24 → 16.8 / 20 |
| 2 overlays | 1,863 / 1,863 → 942 / 1,045 | 1,339 / 1,339 → 548 / 615 | 49.9 / 34 → 16.8 / 20 |
| 3 overlays | 2,318 / 2,652 → 963 / 1,137 | 1,572 / 1,856 → 542 / 689 | 66.6 / 39 → 16.8 / 19 |

At rest, frame p95 16.7–16.8 ms before and after with overlays. What three overlays add over the bare sheet falls from
about 1,800 MB to about 390 MB at peak. Production at 1× with one overlay: peak 1,224 → 1,154 MB total, 667 → 529 MB tab.

| Editing, dev | React commits / 60 moves | Move p95 | What moved | Break: two runs drawn |
|---|---|---|---|---|
| 1× before → after | 59 → 2 | 78 → 35 ms | whole contour (refused, crossing) → the one vertex | 2,962 → 605 ms |
| 4× before → after | 59 → 2 | 455 → 206 ms | whole contour → the one vertex | 14,199 → 4,686 ms |

Display simplification: 951 contour points drawn at Fit for the runs' 1,683.

Quantities: Calculate on C-200 of the copy before and after, identical in all 4,419 stored values (cut 11,588.13 CY, fill
9,514.21 CY, net −2,073.92 CY). Quantity table 0 FAIL (prepare skipped: the bucket's DNS).

Not measured, left for a rerun when the bucket answers again (it slowed from about 04:30 UTC until the pictures no
longer loaded in either build): the after series at 4× (dev), production after with 2 and 3 overlays and at 4×, and the
time to the overlay's view picture with the committed code (the after runs still re-read the overlay PDF on each view).

### The re-measure (D-1330, night run 2026-11-23/24; founder to confirm)

From a local copy of V-100's overlay pictures (91 objects, 0 misses; 32 valid runs, dev and production, 1× and 4×, 0–3
overlays). Full tables: `intelcost-infra/morning-report-2026-11-24/d1330/MEASUREMENTS.md`. Before e2050eb, after d047034.

- Production, 3 overlays: peak tab 1,402 → 711 MB; peak Chrome total 2,188 → 1,352 MB; overlay sharp after load 20–31 s →
  15–17 s; at 4× zoom frames dropped 314 → 83.
- **Regression found and fixed (app c2d20d7):** the first zoom from Fit kept the blurred fit picture, because the 4 MP
  cap pushed `planSharp` to factor 1, under the fit picture × `SHARPER_BY`. The need is now judged at the planner's own
  `MAX_COMPUTE_PX`; the 4 MP cap only lowers the work. After the fix the zoom picture lands in 6.1–10.7 s against
  9.3–27.5 s before, memory still below before.

## Files

App: `src/features/takeoff/overlay/OverlayLayer.tsx`, `useOverlayDifference.ts`, `useSharpDifference.ts`,
`differenceJob.ts`, `difference.worker.ts`; `src/lib/takeoff/overlay/difference.ts` (`compactDifference`,
`paintCompact`, pure); `src/features/takeoff/earthwork/EarthworkLayer.tsx`, `useEarthwork.tsx`, `useLiveChecks.ts`,
`liveChecks.worker.ts`, `liveChecksWork.ts`, `displaySimplify.ts`; `src/pages/ProjectTakeoff.tsx`. Infra: fixture
`fx-suite/browser/c53-contour-vertex-drag.mjs` (and its `fx-suite-updates` copy). No api change, no migration, no new
setting.

## Open for the founder

- The overlay bar now speaks for the topmost overlay (the one seen) instead of the first: right?
- Alt-drag for moving a whole contour (proposed over a handle): right?
- With several Highlight changes overlays only the top one is shown and worked out (as before, the others were hidden
  under it but still worked out). Should the overlays' order be changeable from the bar, so another can come on top?
- The rerun left above (about 1 h on a bench with a reachable bucket), and contours on canvas (13.5 h).

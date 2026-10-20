# Canvas speed: pan, zoom and Ctrl+A at 5,000 and 20,000 shapes (plan)

_Plan written in the night run of 2026-10-19 (R4 in `pending_umer.md`). Answered by Umer on 2026-10-20 (C1 WebGL with an SVG fallback; C2 steps A, B, C, each committed and measured; C3 yes; C4 yes, as the floor; C5 no); steps A (D-654) and B (D-656) built that night; step C not started._

## The problem and the target

**The row virtualisation run measured (D-646, D-647):**

| Shapes on one sheet | Pan | Zoom |
|---|---|---|
| 1,000 | 5.2 fps | 4.2 fps |
| 5,000 | 1.6 fps | 1.2 fps |
| 20,000 | 0.5 fps | 0.3 fps |

Ctrl+A on 20,000 shapes took 14.7 s.

**Target:**
- Pan and zoom at 55–60 fps with 5,000 shapes on one sheet.
- Usable at 20,000: at least 30 fps while moving, a hover or click answered within 100 ms.
- Ctrl+A on 20,000 shapes under 1 s.
- **At 1,600 × 1,000, 1920 × 1080 and 2560 × 1440** (Umer, 2026-10-20: estimators use big monitors; every target
  applies at all three, and every step is measured at all three).

## Where the time goes (profiled tonight)

**How it was measured:**
- **Build and size:** the production build (`app-prod`, port 5175), 1,600 × 1,000 at 125 % (2,000 × 1,250 device pixels). The bench machine's integrated GPU, the class most office laptops have.
- **Project:** a BENCH DUP of the 3D test copy, grown to 5,000 and then 20,000 Linear items on A101 (`drives/gen-items.py`).
- **Tools:** Chrome's trace and CPU profile over each gesture: 3 s of middle-drag, wheel, hover, or a Ctrl+A.
- **Caveat:** on this port the sheet's PDF layer does not load (the bench bucket's CORS), so the drawing is the fit image. The shapes are what is measured.

| | 5,000 shapes | 20,000 shapes |
|---|---|---|
| Pan | 1.3 fps, worst frame 3.6 s | 0.1 fps, worst frame 12.9 s |
| Zoom | 1.4 fps, worst frame 2.5 s | 0.9 fps, worst frame 5.7 s |
| Hover (mouse moving over the sheet) | 44 fps, worst frame 0.6 s | 31 fps, worst frame 1.9 s |
| Ctrl+A: main thread / GPU | 1.3 s / 6.5 s, one 4.8 s frame | 4.8 s / 18 s |
| GPU time to draw one 256 px tile of shapes | about 145 ms | 0.8–1.35 s |

### 1. The GPU drawing the SVG: most of the time

- **How the shapes are drawn:** in one SVG over the drawing (`SheetCanvas.tsx`), every one an anti-aliased path with a non-scaling stroke.
- **What it costs:** Chrome draws that SVG into tiles on the GPU. Every tile replays every path that crosses it, and any change that needs new tiles waits for that drawing:
  - a pan that brings new tiles into view;
  - a zoom, which changes the scale;
  - a hover or a selection, which changes a style.
- **5,000 shapes:** a 3 s pan drew 54 tiles at about 145 ms of GPU each. The main thread worked 1.2 s of the 8.5 s.
- **20,000 shapes:** the main thread spent 16 s of a pan blocked, waiting for the GPU to finish the commit.
- **The proof, on the 20,000 sheet:**
  - **Shapes hidden:** pan at 43 fps, with 0.25 s of GPU.
  - **Anti-aliasing turned off on the shape layer** (`shape-rendering: optimizeSpeed`, set in the browser, no code change):
    - pan at 40 fps and zoom at 34 fps;
    - a tile drawn in 33 ms instead of 1,350 ms;
    - Ctrl+A's worst frame 2.0 s.
- **Window size matters:** the same 5,000-shape pan ran at 52 fps in a 1,036 × 703 window, where the visible tiles were already drawn.

### 2. React redrawing every shape: the next cost

- **Shapes are drawn inline** in `SheetCanvas`'s render (lines 2789–2910), with no memo. Every render rebuilds every path string.
- **These all re-render every shape:**
  - pan start and end (`setPanning`, lines 1275 and 1296);
  - every wheel frame (`flushSync(() => setGestureScale(...))`, line 1049);
  - each change of the hovered shape;
  - every move of a drag or a box selection;
  - every frame of a colleague's draft (up to 8 a second);
  - Ctrl+A (`ProjectTakeoff.tsx` lines 3845–3853).
- **The cost:** about 0.1 s a render at 5,000 shapes and 0.5 s at 20,000, script and style together.
- **With anti-aliasing off at 20,000, this is what is left:**
  - zoom spends 3.8 s of script on 3 s of wheel;
  - hover drops to 17 fps (3.7 s of script).

### 3. Scans of every shape on every move

- **Hover:** `hitAt` (line 1860) rebuilds every shape's outline on each mouse move.
- **Snapping** rebuilds its source from every shape and scans it four times.
- **Box selection** tests every shape on release.
- **Ctrl+A** adds one dashed `<rect>` per shape, sized with `Math.min(...xs)`: 20,000 more DOM nodes.

**There is no spatial index:** only Snap PDF has a grid.

### 4. What the alternatives cost on this machine

A blank-page benchmark at the same size, outside the app:

| Drawing N polylines (2–6 vertices, 12 colours) | 5,000 | 20,000 |
|---|---|---|
| 2D canvas, one path each (GPU or CPU canvas alike) | 0.16–0.23 s | 0.6–1.0 s |
| 2D canvas, one Path2D per colour | 0.28–0.32 s | 1.3–1.4 s |
| WebGL, one draw call per colour (15,000 and 60,000 segments) | 9–21 ms | 17–24 ms |

**A 2D canvas would still miss the target:** a redraw of a full sheet takes 0.2 s at 5,000 shapes. WebGL can redraw 20,000 shapes every frame.

## The approach

Three steps. Each can ship on its own and is measured at 5,000 and 20,000 before the next one starts.

**A. Stop redrawing what did not change (React)**
- **Shapes are memoised per geometry:** keyed by uuid, `geometry_version` and style. Path strings and bounds are computed once per change, not per render. Item clones from `canvasItems` stop mattering.
- **Short-lived state moves out of `SheetCanvas`'s render** into a small store and its own overlay layer: hover, the box band, drag and move previews, the panning flag and the wheel's live scale. This is the store pattern the earthwork hover already uses (`hoverStore.ts`).
  - Pan start and end, and wheel frames, never re-render shapes.
  - The wheel's live scale stays a CSS transform on the stage, with no `flushSync` render.
- **Ctrl+A and box selection draw one outline layer,** not a `<rect>` per shape.
- **Colleagues' drafts and cursors** draw in their own layer.

**B. A spatial index, pure, in `lib/takeoff/engine`**
- A packed tree of every shape's bounds (`flatbush`, ISC licence, a few KB), rebuilt when shapes change.
- Hit testing, snapping (only the vertices and segments within reach), box selection and culling all query it.

**C. Measured shapes drawn with WebGL**
- **One canvas the size of the view,** under the existing SVG overlays.
  - Lines are instanced quads, anti-aliased in the shader, at today's screen-pixel widths and taper (`markupSize.ts`).
  - Areas are triangles (`earcut`, already a dependency) with today's fill opacity; deducts cut out as today.
  - Count marks are instanced symbols from `countSymbol.ts`'s shapes.
- **One draw call per style batch,** redrawn every frame of a pan or zoom.
- **Only shapes in view are drawn** (the index).
- **Level of detail when zoomed out:**
  - a shape under a pixel is drawn as a dot;
  - a polyline is simplified to the pixel grid;
  - count symbols become dots below a size.
- **These stay SVG or HTML on top:** the selected item's handles, draw and drag previews, chips, dimensions, HoverPanel, Find highlights and the earthwork layers. They are few nodes, and the earthwork layers are already memoised.
- **Fallback when WebGL is unavailable or lost:** today's SVG, with anti-aliasing off while moving.

**Not proposed:** turning anti-aliasing off on today's SVG as a stopgap.
- It gives 34–40 fps at 20,000, but lines look jagged while moving.
- Switching back to smooth at rest redraws every tile: seconds at 20,000.
- C replaces it.

## What must keep working, and how it is checked

| Behaviour | Kept by | Checked by |
|---|---|---|
| **Hover:** highlight and HoverPanel, topmost first, same tolerances (0.008 of the page for lines, at least 14 px for marks) | `hit.ts` rules, queried through the index | smoke; the Takeoff fixtures (c03, c05, c10 to c13, f6, f7) when you ask for them, as in the virtualisation run |
| **Select:** click, Shift and Ctrl, box (enclosed), Ctrl+A, the panel's jump to row (D-646), handles | the same state, drawn by the new layers | smoke at 5,000 and 20,000 |
| **Snap:** vertex, midpoint, crossing, edge, Snap PDF; same reach | `snap.ts` on the index's candidates | smoke on a drawn line |
| **Edit:** vertex drag, move, rotate, paste, the live chip and its live quantity | the overlay layer; the quantity from `quantity.ts` | smoke, and the chip's figure against the panel's |
| **Measurement accuracy** | **Quantities never come from the renderer:** `vertices_json` through `lib/takeoff/quantity.ts` and the api's `quantity.py`, untouched | the quantity table after every step. A pixel probe also checks a vertex lands on its page point at 25 %, 100 % and 800 % |
| **Labels** (drag chip, move chip, dimensions; there are no labels on shapes today) | the HTML/SVG overlay | smoke |
| **Look:** count symbols, area opacity, deducts, stroke taper, locked and stale styling | the shaders, from the same tokens | screenshots side by side, before and after |
| **Print, Overlay, guest view, split view, realtime drafts** | Print already draws with a 2D canvas (`printSheets.ts`), unchanged | smoke each once |
| **`lib/takeoff` stays pure (hard rule 2)** | the index and culling hold no React and no network | lint (`eslint.config.js` rule) |

## Risks

- **WebGL on weak or remote machines:** driver blocklists, lost contexts, remote desktops. The SVG fallback covers them, but two paths must stay in step, so the fallback stays minimal.
- **Look:** shader anti-aliasing is close to, not identical to, SVG's. Dashes and symbols need care.
- **Size of the change:** `SheetCanvas.tsx` is 3,277 lines and `ProjectTakeoff.tsx` 9,818. Taking it in steps, with a smoke and the quantity table after each, keeps a regression small and findable.
- **The PDF layer** also redraws on zoom (pdf.js on the main thread). It was not measured tonight, because the bench bucket refuses the production build's port. It will be measured on the dev port during the block.
- **The figures are this machine's.** A discrete GPU would be faster with today's SVG. Estimators' laptops are mostly like this one, so it is the right floor.

## Paper hours

| Step | Hours |
|---|---|
| A: per-geometry memo, short-lived state out of the render, wheel without a render per frame, one selection layer | 8 |
| B: spatial index, with hit test, snap, box selection and culling on it | 6 |
| C: WebGL lines, areas, deducts and counts, styles, culling, level of detail, fallback | 16 |
| Checks: gates, quantity table, smokes, timing at 1,000, 5,000 and 20,000 after each step | 6 |
| **Total** | **about 36 h (4–5 days)** |

## Questions, answered (Umer, 2026-10-20)

All five as recommended, plus: measure pan and zoom at 1920 × 1080 and 2560 × 1440 too.

| # | Question | Answer |
|---|---|---|
| C1 | Renderer for measured shapes: WebGL with an SVG fallback, or a 2D canvas? | **WebGL.** A 2D canvas measured 0.2 s a redraw at 5,000 here, so it cannot hold 55–60 fps through a zoom. |
| C2 | Build in steps A, B, C, each committed and measured, or all at once? | **Steps.** A and B alone fix hover, Ctrl+A's script and the drag cost, and are worth having even if C takes longer. |
| C3 | While moving, may far-out shapes draw simplified (dots, simplified lines) if the full drawing is back within 100 ms of stopping? | **Yes.** |
| C4 | Is this bench machine (integrated GPU, 1,600 × 1,000 at 125 %) the machine the targets are judged on? | **Yes, as the floor.** Add one run on a discrete GPU if you have one. |
| C5 | Ship the anti-aliasing-off stopgap first? | **No.** It looks jagged and C replaces it. |

# Overlay: one flow, "As drawn" or "Highlight changes" (PLAN ONLY, revised after the founder's review)

> Written 2026-11-12 (the run's item 4) and revised the same day after the founder's review (follow-up C). Nothing here
> is built. On approval it becomes the next D-NN and an `F` row. (Since built: §5, D-1231 and D-1262; the row is F46.)
>
> **Approved in the review:**
> - the real difference;
> - Fade unchanged;
> - reuse of `sheet_registration` and the fit;
> - existing Compare and Comparative rows read as the new view.
>
> **Changed in the review:**
> - one Overlay flow, with no separate tool;
> - no automatic feature matching;
> - pure blue, red and black;
> - tolerance as a distance on paper;
> - Adopt revision out of this build;
> - the estimate in hours.

## 1. Today: three modes

The Overlay button opens a three-step dialog: type, sheet, then colour plus "Skip alignment" or "Match points"
(`overlay/OverlayDialog.tsx:50-185`). The open sheet is always the base; the picked sheet is laid over it.

| Mode | Decision | What is drawn | Problem |
|---|---|---|---|
| **Compare sheets** (default) | D-931 | The base sheet tinted red, the other green, multiplied on white paper | Unchanged linework comes out red or olive, never neutral (§2) |
| **Standard** | D-195 | The other sheet's ink in one colour at an opacity | A reference picture only |
| **Comparative** | D-195 | Additions in the colour, deletions in its complement, each masked by the other sheet's paper; opacity fixed at 0.86 | Unchanged ink leaks colour at every edge and slight offset |

**Shared mechanics:**
- **The picture:** a 2048 px raster of each sheet, placed with an SVG matrix. It blurs at high zoom.
- **Alignment:** matched point pairs (Stitch's fit, scale free), then nudges.
- **Storage:** `sheet_registration.overlay` (JSONB: mode, colour, opacity, hidden, matrix).
- **No effect on takeoff or the estimate** (D-195).

## 2. Why unchanged linework is coloured

**Nothing compares the two sheets.** Each one is recoloured pixel by pixel and the two are composited.

- **The tint** (`OverlayLayer.tsx:37-40`): every pixel becomes the full colour, and only its alpha follows its
  darkness. Grey anti-aliasing reads as pale pure colour.
- **Compare:**
  - At 100 % opacity, a line in both sheets multiplies red × green into a dark olive (#342E11).
  - At the default 50 % it reads clearly red. The dialog saves 50 % even for Compare, which shows no slider.
- **Any misregistration** leaves red and green fringes on every unchanged line.
- **Comparative:** unchanged ink is hidden only where the other sheet is fully dark, so edges leak.

**In short:** the colours say which sheet a pixel came from, not what changed.

## 3. Proposed: one Overlay flow

```
 Overlay
 ┌ Step 1 ─ Other sheet ───────────────────────────┐
 │  C-200 rev 1 ▾   (the sheet laid over this one) │
 ├ Step 2 ─ Line them up ──────────────────────────┤
 │  ○ Already lined up (same size and position)     │
 │      residual 0.4 ft ✓   (over the tolerance: [Match points])
 │  ● Match points  (in split view)                  │
 ├ Step 3 ─ How to show it ────────────────────────┤
 │  ○ As drawn          ● Highlight changes          │
 │                                     [Show]        │
 └──────────────────────────────────────────────────┘

 On the sheet, Highlight changes, with the bar:
 ┌───────────────────────────────────────────────────────────────┐
 │ Blue added · Red removed · Black unchanged     [As drawn ⇄]  │
 │ Fade unchanged ■■■■■■□□  (black → grey → hidden)  ⓘ           │
 │ Tolerance 0.01 in (0.4 ft at 1" = 40')        [Line up again] │
 └───────────────────────────────────────────────────────────────┘
   ⓘ "Fading unchanged ink to grey helps where red is hard to tell from black."
```

### Step 1: pick the other sheet

Any sheet of the project. The open sheet stays the base, as today.

### Step 2: line them up

**"Already lined up (same size and position)":**
- The page is laid on the page, or on the pair's saved registration (D-297) if there is one.
- The residual is shown (below).
- If the residual is over the tolerance, "Match points" is offered.

**"Match points":**
- Done in split view, as today (D-931), picking as D-1162 does.
- It is the default when the two sheets differ in size or name.

**Shared:**
- Nudges stay (arrows and brackets).
- No automatic feature matching in this build.

**The residual:**
- With matched points, it is their fit's (`fitOverlay`).
- Lined up page on page, it is measured on the two title blocks' corner marks where the vector text gives them; else
  it is not shown.

### Step 3: how to show it

| View | What is drawn |
|---|---|
| **As drawn** | Both sheets in their own ink colours, the top one see-through at an opacity (today's Standard, both sheets) |
| **Highlight changes** | Added ink pure blue #0000FF, removed ink pure red #FF0000, unchanged ink black, as drawn. "Fade unchanged" takes the black through grey to hidden. Legend "Blue added · Red removed · Black unchanged"; its tooltip says that fading to grey helps if red is hard to tell from black. |

- The two views switch from the bar at any time, without lining the sheets up again (the matrix is kept).
- Today's Standard rows open as "As drawn". Compare and Comparative rows open as "Highlight changes".

The three colours are pure by the founder's choice. They come from three design tokens defined once, so no hex sits
in a component.

### 3.1 The difference (Highlight changes)

Worked in a worker, in the base sheet's frame after alignment, on the two rasters already loaded:

1. Turn each raster into an ink mask by luminance, under a threshold that ignores paper and scan noise.
2. Widen each mask by the tolerance.
3. Classify each pixel:
   - new ink with no old ink within the tolerance: **added**;
   - old ink with no new ink within it: **removed**;
   - otherwise: **unchanged**.
4. Paint one image in the three colours.

**Tolerance on paper.**
- It is a distance on the drawing, default 0.01 in. The bar shows it in feet at the sheet's scale: 0.4 ft at 1" = 40'.
- It is not pixels. (My first draft's "2 px ≈ 0.3 ft" was wrong: on a 36 in sheet at 2048 px, 2 px is about 0.035 in,
  1.4 ft at 1" = 40'.)
- At the sheet's fit image (2048 px across), 0.01 in is under one pixel on a 36 in sheet, so the fit view uses at
  least one pixel.

**Zoomed in.** The difference is worked again for the visible area at screen resolution: the visible part of each
sheet rendered from its PDF at the zoom. The tolerance then holds its paper distance, and the result is sharp instead
of the 2048 px blur.

### 3.2 Reuse and remove

| | What |
|---|---|
| **Reuse** | `sheet_registration` and its `overlay` JSONB (a `view: "drawn" | "changes"` field, `fade`, `tolerance_in`: no migration); `OverlayLayer`'s placement matrix; `fitOverlay` / `useOverlayMatch` and split view's matching; the sub-rows under a sheet; the guest show/hide (D-509) |
| **Remove** | The three-way type step, Comparative's masks, and Compare's red/green multiply (`OverlayLayer.tsx:37-116`); the 50 % opacity saved for Compare |

### 3.3 Out of this build

**Adopt revision** (takeoff moved to the new sheet, change flags, the old sheet archived, the estimate's change record)
gets its own plan later. D-856's REVISIONS_PLAN stands as its starting point.

## 4. Estimate, hours of my own work, by task

| # | Task | Hours | In the first slice |
|---|---|---|---|
| 1 | Dialog step 1 (other sheet) and step 3 (As drawn / Highlight changes); `overlay` JSONB fields `view`, `fade`, `tolerance_in` read and written | 1.5 | yes |
| 2 | Dialog step 2 (Already lined up / Match points into today's split-view matching); old Compare/Comparative rows open as Highlight changes, Standard as As drawn | 1.5 | yes |
| 3 | The bar: view switch without re-aligning, Fade unchanged slider, legend and tooltip, the three colour tokens | 1.5 | yes |
| 4 | Difference worker: ink masks by luminance with a paper/noise threshold | 1.5 | yes |
| 5 | Difference worker: tolerance widening (dilation by the paper distance at the fit image, at least 1 px), classify added / removed / unchanged | 1.5 | yes |
| 6 | Paint the result image and place it with today's matrix; Fade unchanged applied in the paint | 1 | yes |
| 7 | Tolerance on paper: the default 0.01 in, the bar's value in ft at the sheet's scale | 0.5 | yes |
| 8 | Residual for "Already lined up": the fit's residual; title-block corner marks from the vector text; "Match points" offered over the tolerance | 2 | no (the slice shows the fit residual only, after Match points) |
| 9 | Zoom recompute: render the visible part of each sheet from its PDF at screen resolution, rework the difference for the visible area, cache by view | 4 | no. **Done 2026-11-14 (D-1262)**, see below |
| 10 | Remove the old multiply, masks and the 50 % Compare opacity | 0.5 | yes |
| 11 | Checks: hand-worked masks (a line added, removed, offset within and beyond the tolerance) as quantity-table rows; gates; smoke | 2 | yes (1.5 h without the zoom rows) |
| | **Total** | **about 17.5 hours** | |

**First slice** (the difference, the new dialog and the legend; no zoom recompute, no title-block residual): tasks 1–7,
10 and 11 without its zoom rows = 1.5 + 1.5 + 1.5 + 1.5 + 1.5 + 1 + 0.5 + 0.5 + 1.5 = **about 11 hours**. At high zoom
the result is the fit image's (2048 px across), as today's overlay is; tasks 8 and 9 follow as the second slice (about
6.5 hours).

## 5. Built

- **First slice** (tasks 1–7, 10, 11 without the zoom rows): D-1231, 2026-11-12.
- **Task 9, zoom recompute:** D-1262, 2026-11-14 (night run part 3). Once the view rests (300 ms after a pan or zoom,
  never mid-drag), the visible area plus 12 % is drawn from both PDFs at the screen's resolution bucket, finer by a
  whole factor where one pixel per tolerance needs it (cap 8 MP), the difference worked in the existing worker and
  painted down with changed ink kept in full colour; cached by pair, bucket and area. App
  `lib/takeoff/overlay/{zoomView,difference}.ts`, `features/takeoff/overlay/{useSharpDifference,OverlayLayer,
  differenceJob,useOverlayDifference}.ts(x)`, `SheetCanvas.tsx` (`subscribeView`), `ProjectTakeoff.tsx`,
  `ReferencePane.tsx`; infra six `overlay-zoom-*` quantity-table rows (task 11's zoom rows).
- **Still open:** task 8 (the title-block residual for "Already lined up").

# Overlay: one Compare flow (PLAN ONLY, for the founder's review)

> Written 2026-11-12, the founder's run item 4: "Overlay is plan only — build it after I review." Nothing here is
> built. Nothing here is a decision yet: on approval it becomes the next D-NN and an `F` row.

## 1. Today: three modes

The Overlay button opens a three-step dialog: type, sheet, then colour plus "Skip alignment" or "Match points"
(`overlay/OverlayDialog.tsx:50-185`). The open sheet is always the base; the picked sheet is laid over it. Each
overlay is a sub-row under its base sheet (`sheets/OverlaySubRows.tsx`).

| Mode | Decision | What is drawn | Problem |
|---|---|---|---|
| **Compare sheets** (default) | D-931 | The base sheet tinted red, the other green, multiplied on white paper; Swap flips which is "new" | Unchanged linework comes out red or olive, never neutral (§2) |
| **Standard** | D-195 | The other sheet's ink in one colour at an opacity | A reference picture only: shows nothing about what changed |
| **Comparative** | D-195 | Additions in the colour, deletions in its complement, each masked by the other sheet's paper; opacity fixed at 0.86 | Unchanged ink leaks colour at every edge and slight offset |

**Shared mechanics:**
- **The picture:** a 2048 px raster of each sheet, placed with an SVG matrix. It is never vector, so it blurs at high
  zoom.
- **Alignment:** two or more matched point pairs (Stitch's fit, scale free), then arrow and bracket nudges; nothing
  automatic.
- **Storage:** `sheet_registration.overlay` (JSONB: mode, colour, opacity, hidden, matrix), one row per pair of sheets.

**What the overlay does not touch:** takeoff and the estimate. It feeds no calculation (D-195). There is no
new-revision flow: "a revised sheet loads as a new sheet" (D-991). D-856's REVISIONS_PLAN is a plan only.

## 2. Why unchanged linework is coloured

**Nothing compares the two sheets.** Each one is recoloured pixel by pixel and the two are composited.

- **The tint** (`OverlayLayer.tsx:37-40`): every pixel becomes the full colour, and only its alpha follows its
  darkness (alpha = 1.2 − 0.4·(R+G+B)). Grey anti-aliasing and off-white paper therefore come out as pale pure
  colour.
- **Compare:**
  - At 100 % opacity, a line present in both sheets multiplies red × green into a dark olive (#342E11), not black.
  - At the default 50 % it reads clearly red (about rgb(153, 54, 33)). The dialog saves 50 % even for Compare, which
    shows no slider.
- **Any misregistration** leaves red and green fringes along every unchanged line. The causes: two 2048 px rasters
  resampled by a matrix with scale and turn, plus the fit's residual.
- **Comparative:** unchanged ink is hidden only where the other sheet is fully dark. Edges and small offsets leak.

**In short:** the colours mean "which sheet this pixel came from", not "what changed".

## 3. Proposed: one flow, "Compare revision"

**One button, one flow, three outcomes on the sheet.** Unchanged ink is drawn neutral grey, added ink green, removed
ink red. That is a true difference, tolerant of small misregistration.

```
 Overlay ▸ Compare with…            ┌──────────────────────────────────────────────┐
 ┌──────────────────────────────┐   │  C-200 rev 2  vs  C-200 rev 1     [Swap] [×] │
 │ Compare C-200 rev 2 with:    │   │  ■ added  ■ removed  ■ unchanged (grey)      │
 │  ○ C-200 rev 1  (same name)  │   │  Fade unchanged ▬▬▬▬▬○──   Tolerance 2 px ▾   │
 │  ○ another sheet…            │   │  Alignment: auto ✓  (residual 0.4 ft) [Fix…] │
 │ Alignment: ● auto  ○ points  │   │  [Adopt revision…]                           │
 │            [Compare]          │   └──────────────────────────────────────────────┘
 └──────────────────────────────┘
```

On the sheet:
```
   ───────────────  grey: in both
   ═══════════════  green: only in the new sheet (added)
   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  red: only in the old sheet (removed)
```

### 3.1 The difference

Done in a worker on the two rasters already loaded, in the base sheet's frame after alignment:

1. Turn each raster into an ink mask by luminance, under a threshold that ignores paper and scan noise.
2. Widen each mask by the tolerance (default 2 px, about 0.3 ft at a 1" = 40' scale on a 2048 px sheet).
3. Classify each pixel:
   - new ink with no old ink within the tolerance: **added**;
   - old ink with no new ink within it: **removed**;
   - otherwise: **unchanged**.
4. Paint one image: grey, green and red, with design tokens for the colours.

**Fade unchanged** dims the grey, down to hidden, so only the changes show.

### 3.2 Alignment

- **Auto first.** Sheets with the same name or number, or a revision pair: start from the existing registration
  (D-297) or the page-to-page scale. Then refine by matching the title-block corners and the densest ink features.
  Stitch's `fitPoints` is reused with the found pairs.
- **Show the residual.** If it is over the tolerance, offer **Fix…**, which opens today's point matching (D-931,
  D-1190) in split view.
- **Nudges stay** (arrows and brackets).

### 3.3 Reuse, remove, keep

| | What |
|---|---|
| **Reuse** | `sheet_registration` and its `overlay` JSONB (a `mode: "revision"` value: no migration); `OverlayLayer`'s placement matrix; `fitOverlay` / `useOverlayMatch`; split view's Reference pane; the sub-rows under a sheet; the guest show/hide (D-509) |
| **Remove** | The three-way type step, Comparative mode, and Compare's red/green multiply. Existing Compare and Comparative rows read as the new Compare. Standard rows stay as they are: see below. |
| **Keep, renamed** | **Standard** becomes **Reference overlay**, a separate small option: "lay another sheet over this one" (one colour, opacity) for site and survey work, where nothing is a revision. It is not part of the revision flow. |

### 3.4 Adopt revision: takeoff and the estimate

Nothing changes in takeoff or the estimate until **Adopt revision…**. Then (D-856's plan, made concrete):

1. **Takeoff moves to the new sheet** through the alignment matrix: every measurement, earthwork input and markup.
   Each is flagged:
   - **"may have changed"** where added or removed ink lies within its tolerance band (a measurement over a changed
     area);
   - **"carried"** where only unchanged ink lies under it.
2. **The old sheet is archived:** read-only and kept, shown as the overlay's "old" side.
3. **The estimate keeps a change record:** each item's quantity before and after (from the moved takeoff once each
   flagged item is confirmed or redrawn), the delta, and who adopted it. No line is repriced silently: Calculate runs
   on the estimator's own command, as today.
4. **Undo** within the session puts the takeoff back on the old sheet. After that, the archive keeps both.

**Estimate:** about 4 to 5 days in all. The difference and the new Compare bar about 1.5 days; auto alignment and the
residual about 1 day; Adopt revision with the takeoff move and flags about 2 days; the change record about 0.5 day;
checks, the quantity table and a smoke test besides.

## 4. Questions for the founder

1. Is grey, green and red with Fade unchanged the look you want, or should unchanged ink stay black?
2. Keep Standard as "Reference overlay", or remove it with the rest?
3. Should Adopt revision move takeoff in the same build, or come later (Compare first, ships alone)?
4. Tolerance: 2 px by default, with the choice in the bar. Or a fixed distance in feet?

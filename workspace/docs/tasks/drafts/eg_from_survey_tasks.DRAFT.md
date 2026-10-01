# F12 (addition): Existing grade from another sheet (draft spec, questions open)

> **Draft, written 2026-10-01 at the founder's request. SPEC ONLY: nothing is built.** The
> founder's answers to the questions at the end come before any code, logged as a `D-NN`.
> - **Sources:**
>   - legacy's source on `UmeralamDEV`: Overlay, `alignment.ts`, `sheet_overlays`, the
>     earthwork Calculate path, "Paste on another sheet…", and its 295 plan files;
>   - D-144's finding on Hidden Valley's C-200 and page 3;
>   - the shrink and units decision, D-177.
> - **Not driven live:** legacy has no such feature to drive (below).

## The problem

**The two sheets are separate.** On real jobs the existing-grade survey and the grading plan
are different sheets, at different scales, placements and often rotations.
- On Hidden Valley, **page 3** (the boundary and topographic survey) carries 47 labelled EG
  contours, 697 to 729.
- **C-200** (the grading plan, 1" = 30') prints the same ground as 195 dashed EG lines with
  **no elevations** (D-144).

**So Calculate cannot run on C-200.** It is per sheet (D-136 Q14) and needs EG and FG on that
sheet. Today an estimator has two ways out:
- type about 55 EG elevations on C-200 by hand, reading them off page 3;
- not bid it in the product.

**Problem → solution.** EG lives on the survey sheet, the grade on the grading sheet. →
Register the survey sheet to the grading sheet once, with two (or more) clicked control
points both sheets show. C-200's Calculate then reads page 3's existing grade through that
registration. Nothing is retyped, and the result stays per sheet (Q14 holds).

## Legacy today

**Legacy cannot do this.** Its earthwork is strictly per sheet:
- **One sheet only.**
  - `earthworkLayers` keeps the active sheet's geometries only (`ProjectTakeoff.tsx`
    4879–4884), and `roles.ts:69` skips any other sheet.
  - Calculate takes the boundary, calibration and runs from the active sheet (5133–5160).
  - The results are keyed `(project_id, sheet_id)` (`resultsStore.ts:56`).
  - Nothing under `lib/takeoff/earthwork/` reads another sheet or imports a surface.
- **Overlay is a picture, not a link.**
  - What it does: Overlay (`OverlayDialog.tsx`, toolbar `Toolbar.tsx:558`) draws another
    sheet's PDF over the open one, as a transparency or in compare colours.
  - How it aligns: by two point pairs, "the overlay will be translated, rotated and scaled
    to match". `lib/takeoff/alignment.ts` gives a 2D similarity matrix (overlay pixels to
    base pixels) through `similarityFromPairs`, `rotateScaleAround`, `applyMatrix`,
    `invertMatrix`, arrow-key nudges, `[` `]` to rotate and `-` `+` to scale.
  - Where it is kept: in `sheet_overlays.transform_json`.
  - What uses it: **nothing but the render.** The matrix only draws a non-interactive canvas
    (`PdfCanvas.tsx` 3021–3055). No markup, contour, spot or quantity passes through it.
  - It is checked by eye only: no residual and no distance check.
- **"Paste on another sheet…"** moves a copy by one clicked anchor, scaled by the
  calibration ratio (`feetPerNorm` source / target), **with no rotation**.
  - It is offered only for Linear, Area and Count items.
  - The contour, spot and boundary menus have no Copy.
- **The plans** (`.lovable/plan/`) never mention a survey sheet, registration, control
  points or a cross-sheet EG. The site-feature and strip-area plans are per sheet
  throughout.
- **The new app** has Split view, Snap PDF (D-145), Auto Trace on any sheet (D-143) and the
  per-sheet engine. Overlay is F11 and not built.

## The flow (proposed)

1. **Trace each surface on its own sheet.** On page 3, Auto Trace and "Adopt N labelled" as
   **EG** (it reads labels on any sheet). On C-200, trace or adopt the **FG**. Both are
   built today.
2. **Link the sheets.** On C-200's Earthwork row, **"Existing grade from another sheet…"**
   opens a dialog: pick the source sheet (page 3), then **Pick points**.
3. **Pick the control points, in Split view.** C-200 sits on one side and page 3 on the
   other, the same reference-only Split view the toolbar already has.
   - Click a point on page 3, then the same point on C-200 (a property corner, a benchmark,
     a building corner, a monument). Repeat for a second point, or more.
   - Snap PDF is on by default, so a click lands on the printed vertex.
   - Each pair is numbered on both sheets. A pair can be dragged or deleted.
4. **Check it.** As soon as two pairs exist, the dialog shows its checks (below) and draws
   page 3's EG contours on C-200 as a ghost, through the registration. On C-200 the ghost
   should lie on the sheet's own dashed EG lines. Confirm saves the link.
5. **Calculate on C-200** as today. The EG surface is page 3's EG runs mapped onto C-200,
   plus any EG C-200 holds itself (Q6). The boundary, FG, Site Features, Strip Areas, the
   lines and their CSI nodes are C-200's, exactly as today.
6. **Stale works across the link.** An edit to page 3's EG, to the control points, or to
   either sheet's calibration changes C-200's version key. C-200 then shows stale when
   opened.

## The registration (the math)

**Done in real-world feet, not pixels.**
- Each sheet's normalized points are first taken to feet through **its own calibration**
  (`feetPerNorm`, page width and height).
- In feet, the same ground on two correctly calibrated sheets differs only by a rotation and
  a translation: a rigid motion, with **no scale**. That is stronger than legacy's free
  similarity, and it gives a check legacy has no way to make.

**The checks.** With n pairs, solve the rotation and translation by least squares (two pairs
pin it exactly; more average it). Then show:
- **The distance check, from two pairs.** The ground distance between the two points, on
  each sheet: "Point 1 to point 2: 412.3 ft on page 3, 411.8 ft on C-200 (0.1 %)". Over a
  tolerance (Q4), say which: **a sheet's scale is wrong, or a point is**. The estimator can
  then fix the calibration or the point, or accept a fitted scale (Q3).
- **Residuals, from three pairs.** Each pair's miss in feet after the fit, and the worst one
  flagged. Three pairs also catch a mirrored sheet, which is refused.
- **Rotation.** The fitted rotation, as "page 3 is turned 12.4° to C-200", for a sanity
  read. Each sheet's view rotation (P-20a, `view_rotation`) is display only and plays no
  part. The math uses the page's own coordinates.

**Elevations carry over unchanged.** They are stored in canonical feet
(`earthwork/elevation.ts`), plus an optional **datum offset** (Q5). A survey on an assumed
datum (100.00) under a grading plan on NAVD88 is the case it covers.
- **The tie-in check:** where C-200's labelled FG contours end on an EG line (D-144's
  tie-ins), the mapped page-3 EG elevation there should equal the FG label. A consistent
  difference suggests a datum offset, and the dialog offers it.

**A match score, beyond legacy (Q8).** The share of the mapped page-3 contour length lying
within a few points of C-200's own dashed vector lines. D-144's sampling already reads those
lines, so this is cheap. A wrong registration scores near zero, which is visible before any
volume is trusted.

## Two ways to carry the existing grade (Q1)

| | **A. Read through the link (recommended)** | **B. Copy across** |
|---|---|---|
| What C-200 holds | the link only | new EG runs, "EG from page 3", transformed once |
| An edit on page 3 | flows into C-200 (C-200 shows stale) | does nothing until copied again |
| Linework used | page 3's contours | page 3's contours |
| Cost | the engine maps runs at Calculate (microseconds) | a write of ~50–200 runs; then a normal C-200 |
| Risk | two sheets must stay calibrated | copies drift silently from the survey |

**Variant B′, label transfer: give C-200's own dashed EG lines the elevations of the page-3
contours they coincide with.** This keeps the grading plan's linework, which is the
engineer's base. But it hangs on matching each line. It would reuse D-144's suggestion
machinery: a matched line gets "suggested 709 (from page 3)", confirmed one by one or all
at once. It is better as a later step than as the first one (Q2).

## Data and api (proposed)

- **Table `sheet_registration`:**
  - `project_id`, `source_sheet_id`, `target_sheet_id` (they differ);
  - `purpose` (`earthwork_eg` now; F11's Overlay could share the table later, Q10);
  - `pairs` (jsonb: each pair's source and target points, normalized to its own sheet);
  - `fit` (jsonb: rotation, translation in feet, any fitted scale, residuals, made by the
    engine and stored for display);
  - `elevation_offset_ft` (default 0), `created_by`, `updated_at`.
  - Unique on `(target_sheet_id, purpose)`: one survey per grading sheet in v1 (Q7).
- **Routes:** `GET/PUT/DELETE …/earthwork/registration/{target_sheet}`. `PUT` is refused when
  either sheet has no calibration.
  - Event `earthwork.registration.changed` refreshes colleagues.
  - Deleting either sheet deletes the link.
- **The api owns writes (hard rule 6).** The fit is computed by the pure engine in the
  browser and checked again by the api: the Python twin of the registration, kept equal by
  the quantity table, as the TIN is.

## Engine (pure, hard rule 2)

`lib/takeoff/earthwork/register.ts`, data in and data out, with no React and no network:
- `toFeet(point, calibration)` and back;
- `fitRigid(pairs, calS, calT)`, which returns rotation, translation, distance check,
  residuals and mirrored;
- `mapRuns(runs, fit, calS, calT, offsetFt)`, which returns runs in the target sheet's
  normalized space;
- `matchScore(mappedRuns, targetVectorLines)`.

`earthworkVersionKey` folds in the link: its pairs, its offset, both calibrations and the
source sheet's EG runs.

**Quantity-table rows** (hand-worked):
- a square surveyed on a sheet at 1" = 20', turned 90°, against the same square on a sheet
  at 1" = 30': the fit gives 90.000° and residual 0;
- the distance check off by a known 5 %;
- a mirrored third pair, refused;
- **a volume through a registration equal to the same surfaces drawn on one sheet**, to the
  cent;
- a datum offset of +2.00 ft changing a known cut by its area × 2 / 27.

## What it does not do (v1)

- **No automatic registration.** D-144's Hough vote over ten scale ratios found no reliable
  overlay. Two clicks are fast and sure, and the match score covers the doubt.
- **No multi-sheet sites.** Calculate stays per sheet (Q14). One source survey per grading
  sheet.
- **No Overlay picture.** That is F11. The ghost contours are the check here.

## Questions for the founder

1. **Read through the link (A) or copy across (B)?** *Recommend A:* the survey stays the
   one source, and an edit on it marks the grading sheet stale.
2. **Label transfer (B′)**, giving C-200's own dashed EG lines page 3's elevations: in v1, or
   later? *Recommend later,* as an extra source of suggestions (D-144).
3. **When the distance check fails:** refuse until fixed, or allow "fit the scale too"
   (legacy's free similarity) with a warning on every result? *Recommend allow it, with
   the warning.* Some surveys are printed not to scale.
4. **The distance tolerance.** *Recommend 0.5 %* (about 2 ft over 400 ft) for a warning,
   2 % to need the fitted-scale choice.
5. **The datum offset:** a field (default 0) the tie-in check can propose, or never offered?
   *Recommend the field.*
6. **EG on both sheets:** when C-200 also holds EG runs of its own (spot shots, tie-ins),
   merge them with page 3's into one TIN, or use one source only? *Recommend merge.*
   Crossings between the two sources would be the usual TIN errors, with chips naming the
   sheet.
7. **One survey or several:** v1 takes one source sheet per grading sheet. Is a survey split
   over two pages common on your jobs? If so, several sources in v1.
8. **The match score:** show it, and warn under a floor (say 30 %)? *Recommend show it and
   warn.*
9. **Who may link:** anyone who may edit earthwork (as Calculate), or estimators and above
   only?
10. **Share with F11's Overlay:** when Overlay is built, should it draw from these same
    registrations, so one alignment serves both? *Recommend yes;* it decides the table's
    name now.
11. **Where the entry lives:** on the Earthwork row ("Existing grade from another sheet…"),
    in the sheet's ⋮ menu, or both?
12. **Hidden Valley:** once built, may the C-200 cut and fill be computed from page 3 and
    compared with the engineer's table (14,263 cut, 8,727 fill) as the acceptance check?
    It would be a quantity-table row on the real sheets, with a tolerance you set.
13. **Legacy's overlays:** migrate `sheet_overlays` (F17) into registrations? They hold a
    pixel similarity with no checks. *Recommend not:* they are pictures, and redoing two
    clicks is cheap.

## Blocks (when answered)

- **A. Engine and table:** `register.ts`, its Python twin, the table, the routes, the version
  key; quantity-table rows.
- **B. The dialog:** Split-view point picking with Snap PDF, the checks, the ghost
  contours, the match score; Calculate through the link; stale across sheets.
- **C. (if Q2) Label transfer:** suggestions on the grading sheet's own EG lines.

# F18 (F12 addition): Existing grade from other sheets

> **Spec, adopted 2026-10-01 with the founder's answers (D-188) and the link's behaviour
> (D-190).** **Blocks A and B built overnight 2026-10-01 (D-192); Block C later.** The
> acceptance check on C-200 is not met yet: the link is exact, C-200's FG inputs are short
> (D-192). **The acceptance on C-200 is the founder's own test, by hand (D-232).** The draft
> on closing the gap is parked as reference, nothing in it built:
> [c200_acceptance_tasks.DRAFT.md](drafts/c200_acceptance_tasks.DRAFT.md). Hidden Valley
> Spec's earthwork data is left exactly as it is unless the founder asks.
> - **Sources:**
>   - legacy's source on `UmeralamDEV`: Overlay, `alignment.ts`, `sheet_overlays`, the
>     earthwork Calculate path, "Paste on another sheet…", and its 295 plan files;
>   - D-144's finding on Hidden Valley's C-200 and page 3;
>   - the shrink and units decision, D-177.
> - **Not driven live:** legacy has no such feature to drive (below).
> - **Written from the draft** `docs/tasks/drafts/eg_from_survey_tasks.DRAFT.md` (removed). The
>   main change is Q7: **several source sheets per grading sheet in v1.**

## The problem

**The sheets are separate.** On real jobs the existing-grade survey and the grading plan are
different sheets, at different scales, placements and often rotations. A topographic survey
is often split over two or more sheets.
- On Hidden Valley, **page 3** (the boundary and topographic survey) carries 47 labelled EG
  contours, 697 to 729.
- **C-200** (the grading plan, 1" = 30') prints the same ground as 195 dashed EG lines with
  **no elevations** (D-144).

**So Calculate cannot run on C-200.** It is per sheet (D-136 Q14) and needs EG and FG on that
sheet. Today an estimator has two ways out:
- type about 55 EG elevations on C-200 by hand, reading them off page 3;
- not bid it in the product.

**Problem → solution.** EG lives on the survey sheets, the grade on the grading sheet. →
Register each survey sheet to the grading sheet once, with two (or more) clicked control
points both sheets show. C-200's Calculate then reads every linked sheet's existing grade
through its registration. Nothing is retyped, and the result stays per sheet (Q14 holds).

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

## The answers (D-188)

| # | Question | Answer |
|---|---|---|
| 1 | Read through the link, or copy across? | **A, read through the link.** |
| 2 | Label transfer onto the grading sheet's own EG lines | **Later** (Block C). |
| 3 | A failed distance check | **Allow "Fit the scale too", with a warning on every result.** |
| 4 | The distance tolerance | **Warn at 0.5 %; at 2 % the fitted-scale choice is required.** |
| 5 | A datum offset | **Yes: a field, proposed by the tie-in check.** |
| 6 | EG on the grading sheet as well | **Merge it with the linked sheets' EG into one TIN,** with chips naming the sheet on crossings. |
| 7 | One survey sheet or several | **Several source sheets per grading sheet, in v1.** |
| 8 | The match score | **Show it; warn under 30 %.** |
| 9 | Who may link | **Anyone who may edit earthwork,** the same as Calculate. |
| 10 | Share with F11's Overlay | **Yes:** Overlay will draw from these same registrations. |
| 11 | Where the entry lives | **Both:** the Earthwork row and the sheet's ⋮ menu. |
| 12 | Hidden Valley as the acceptance check | **Yes:** C-200 computed from page 3 against the engineer's 14,263 cut and 8,727 fill, **±5 % each**, recorded as a quantity-table row when built. |
| 13 | Migrate legacy's `sheet_overlays` | **No.** |

## The flow

1. **Trace each surface on its own sheet.** On each survey sheet (page 3, and any other page
   the survey runs onto), Auto Trace and "Adopt N labelled" as **EG** (it reads labels on any
   sheet). On C-200, trace or adopt the **FG**. Both are built today.
2. **Link the sheets (Q11).** Two entries open the same dialog:
   - C-200's Earthwork row: **"Existing grade from other sheets…"**;
   - C-200's ⋮ menu in the Sheets panel: the same row.
3. **The dialog lists C-200's source sheets (Q7).** Each row shows the sheet, its checks and
   its datum offset, with Edit points and Remove. **Add a source sheet** picks one more.
   A sheet can be a source once per grading sheet, and never its own source.
4. **Pick the control points, in Split view,** one source at a time. C-200 sits on one side
   and the source on the other, the same reference-only Split view the toolbar already has.
   - Click a point on the source, then the same point on C-200 (a property corner, a
     benchmark, a building corner, a monument). Repeat for a second point, or more.
   - Snap PDF is on by default here, so a click lands on the printed vertex.
   - Each pair is numbered on both sheets. A pair can be dragged or deleted.
5. **Check it.** As soon as two pairs exist, the dialog shows that source's checks (below)
   and draws its EG contours on C-200 as a ghost, through the registration. Each source's
   ghost is labelled with its sheet. On C-200 the ghosts should lie on the sheet's own dashed
   EG lines. Confirm saves that source's link.
6. **Calculate on C-200** as today. The EG surface is one TIN (Q6) made of:
   - every source's EG runs, mapped onto C-200;
   - any EG that C-200 holds itself (spot shots, tie-ins).

   The boundary, FG, Site Features, Strip Areas, the lines and their CSI nodes are C-200's,
   exactly as today.
7. **Crossings name their sheets (Q6).** A crossing between EG lines is the usual TIN
   error, with chips that say which sheet each line came from: "page 3 · EG 709 crosses
   page 4 · EG 709". That is also how an overlap between two survey sheets shows (their
   match line). The estimator trims the duplicated lines on one of the source sheets.
8. **Stale works across the links.** C-200's version key changes, and C-200 then shows stale
   when opened, on an edit to:
   - any source's EG;
   - any source's control points or offset;
   - any of the sheets' calibrations;
   - a source added or removed.

## The registration (the math), per source

**Done in real-world feet, not pixels.**
- Each sheet's normalized points are first taken to feet through **its own calibration**
  (`feetPerNorm`, page width and height).
- In feet, the same ground on two correctly calibrated sheets differs only by a rotation and
  a translation: a rigid motion, with **no scale**. That is stronger than legacy's free
  similarity, and it gives a check legacy has no way to make.

**The checks.** With n pairs, solve the rotation and translation by least squares (two pairs
pin it exactly; more average it). Then show:
- **The distance check, from two pairs (Q3, Q4).** The ground distance between the two
  points, on each sheet: "Point 1 to point 2: 412.3 ft on page 3, 411.8 ft on C-200
  (0.1 %)".
  - **Under 0.5 %:** a quiet tick.
  - **0.5 % up to 2 %:** a warning, which says which it is: **a sheet's scale is wrong, or a
    point is.** Confirm is still allowed.
  - **2 % or more:** Confirm needs a choice: fix the calibration or the point, or **"Fit
    the scale too"** (legacy's free similarity).
  - **A fitted scale warns on every result.** The scale it fitted is stored on the link.
    "EG scale fitted on page 3 (+2.4 %)" then shows wherever C-200's result shows:
    - the volume panel;
    - the Calculate dialog;
    - the sheet's result row;
    - the source chip of the Estimating lines that result makes.
- **Residuals, from three pairs.** Each pair's miss in feet after the fit, and the worst one
  flagged. Three pairs also catch a mirrored sheet, which is refused.
- **Rotation.** The fitted rotation, as "page 3 is turned 12.4° to C-200", for a sanity
  read. Each sheet's view rotation (P-20a, `view_rotation`) is display only and plays no
  part. The math uses the page's own coordinates.

**Elevations carry over unchanged.** They are stored in canonical feet
(`earthwork/elevation.ts`), plus that source's **datum offset (Q5)**. A survey on an assumed
datum (100.00) under a grading plan on NAVD88 is the case it covers.
- **The offset is a field on each source,** in feet, default 0.
- **The tie-in check proposes it.** Where C-200's labelled FG contours end on an EG line
  (D-144's tie-ins), the mapped EG elevation there should equal the FG label. A consistent
  difference is offered as the offset: "FG labels sit 2.00 ft above page 3's EG at 6
  tie-ins. Use +2.00 ft?". The estimator accepts it or types another.

**The match score (Q8), beyond legacy.** The share of a source's mapped contour length that
lies within a few points of C-200's own dashed vector lines. D-144's sampling already reads
those lines, so this is cheap.
- It is shown for each source, as a percentage.
- **Under 30 %, it warns:** "Only 18 % of page 3's contours lie on C-200's lines. Check the
  points." Confirm is still allowed.

## The link's behaviour (D-190, the founder)

- **The whole source grade.** A link carries every EG contour and spot on its source sheet,
  including EG added, edited or deleted after the link was made. Nothing is picked run by
  run.
- **Stale** on the grading sheet after: a change to a source's EG; a change to a link's
  points or offset; a recalibration of either sheet; a source added or removed.
- **Recalculation stays manual.**
- **The grading sheet's own EG is merged in** (Q6).
- **Shown where it lives:** the Takeoff panel shows an EG item only on its own sheet. The
  grading sheet's earthwork section shows **"Existing grade: linked from {sheet}"**, one line
  per source.
- **No copied items** (Q1).

## Carrying the existing grade: read through the link (Q1)

- **C-200 holds the links only.** It never holds copies of the sources' runs.
- An edit on a source flows into C-200, and C-200 shows stale.
- The engine maps the runs at Calculate, which takes microseconds.
- The risk accepted is that every sheet involved must stay calibrated. The checks and the
  stale rule cover it.

**Label transfer (Q2) comes later, as Block C.** It gives C-200's own dashed EG lines the
elevations of the source contours they coincide with, which keeps the engineer's linework. It
reuses D-144's suggestion machinery: a matched line gets "suggested 709 (from page 3)",
confirmed one by one or all at once.

## Data and api

- **Table `sheet_registration`.** One row per pair of sheets, shared with F11's Overlay
  (Q10):
  - `project_id`, `source_sheet_id`, `target_sheet_id` (they differ);
  - `pairs` (jsonb: each pair's source and target points, normalized to its own sheet);
  - `fit` (jsonb: rotation, translation in feet, any fitted scale, residuals, the match
    score; made by the engine and stored for display);
  - `scale_fitted` (bool, default false): set by "Fit the scale too";
  - `eg_source` (bool): C-200's Calculate reads this source's EG. Overlay can use a row
    without it;
  - `elevation_offset_ft` (default 0), `created_by`, `updated_at`.
  - **Unique on `(target_sheet_id, source_sheet_id)`.** One alignment per pair of sheets,
    so the earthwork link and a later Overlay of the same two sheets are one row. A target
    can have **several sources (Q7)**.
- **Routes:**
  - `GET …/sheet/{target}/registrations`: the list of the target's sources;
  - `PUT …/sheet/{target}/registrations/{source}`: create or replace one;
  - `DELETE …/sheet/{target}/registrations/{source}`.
  - `PUT` is refused when either sheet has no calibration, or when source and target are
    the same sheet.
  - The event `earthwork.registration.changed` (sheet-scoped) refreshes colleagues.
  - Deleting either sheet deletes its links.
- **Who may write (Q9):** the same as Calculate. In the app that is `canEditTakeoff`; in the
  api, the write-workspace guard that `PUT /result` uses. Everyone else sees the links and
  their checks read-only.
- **The api owns writes (hard rule 6).** The fit is computed by the pure engine in the
  browser and checked again by the api. The api uses the Python twin of the registration,
  kept equal to the browser's by the quantity table, as the TIN is.
- **No migration of legacy's `sheet_overlays` (Q13).** They are pixel similarities with no
  checks, kept for a picture. Redoing two clicks is cheap. F17 leaves the table behind.

## Engine (pure, hard rule 2)

`lib/takeoff/earthwork/register.ts`, data in and data out, with no React and no network:
- `toFeet(point, calibration)` and back;
- `fitRigid(pairs, calS, calT, { fitScale })`, which returns the rotation, translation, any
  fitted scale, the distance check, the residuals and whether the sheet is mirrored;
- `mapRuns(runs, fit, calS, calT, offsetFt)`, which returns runs in the target sheet's
  normalized space, each tagged with its source sheet;
- `mergeEg(targetRuns, mappedBySource)`, which returns the one EG run list the TIN takes,
  keeping each run's sheet for the crossing chips;
- `matchScore(mappedRuns, targetVectorLines)`;
- `tieInOffset(mappedEg, targetFgTieIns)`, which returns the proposed datum offset and how
  many tie-ins agree.

`earthworkVersionKey` folds in every link: its pairs, its fit and offset, both
calibrations, and the source's EG runs.

**Quantity-table rows** (hand-worked):
- a square surveyed on a sheet at 1" = 20', turned 90°, against the same square on a sheet
  at 1" = 30': the fit gives 90.000° and residual 0;
- the distance check off by a known 5 %, which needs the fitted-scale choice; with
  "Fit the scale too" the fit gives 0.95 and residual 0;
- a 1 % distance miss: a warning, not a refusal;
- a mirrored third pair, refused;
- **a volume through a registration equal to the same surfaces drawn on one sheet**, to the
  cent;
- **two sources**, each half of a surveyed square on its own sheet: the merged volume equals
  the one-sheet volume, to the cent;
- a datum offset of +2.00 ft changing a known cut by its area × 2 / 27;
- the tie-in check proposing a known +2.00 ft from six tie-ins;
- **the acceptance row (Q12):** C-200 computed from page 3 against the engineer's table,
  14,263 cut and 8,727 fill, **within ±5 % each.** It is recorded when Block B is built,
  on the real Hidden Valley sheets.

## What it does not do (v1)

- **No automatic registration.** D-144's Hough vote over ten scale ratios found no reliable
  overlay. Two clicks are fast and sure, and the match score covers the doubt.
- **No multi-sheet sites.** Calculate stays per grading sheet (Q14). Several survey sheets
  feed one grading sheet (Q7); one survey does not feed a site drawn over several grading
  sheets as one calculation.
- **No Overlay picture.** That is F11. It will draw from these registrations (Q10). The ghost
  contours are the check here.
- **No label transfer** until Block C (Q2).

## Ideas (not v1)

- **A clip outline per source:** an area drawn on a source sheet, past which its EG is left
  out. It would trim a match-line overlap without editing the survey's runs. v1 relies on
  the crossing chips and a trim on the source sheet.

## Blocks

- **A. Engine and table (next):**
  - `register.ts` and its Python twin;
  - the `sheet_registration` table and its migration, the routes, the event;
  - the version key over every link;
  - the quantity-table rows above, except the acceptance row.
- **B. The dialog and Calculate through the links (next):**
  - both entries (the Earthwork row and the ⋮ menu);
  - the sources list; Split-view point picking with Snap PDF;
  - the checks per source: the distance check with its 0.5 % and 2 % rules and "Fit the
    scale too", the residuals, the rotation, the match score with its 30 % warning;
  - the datum offset field and the tie-in proposal;
  - the ghost contours per source;
  - Calculate through the links: one merged EG TIN, crossing chips naming the sheet, the
    fitted-scale warning on every result, stale across sheets;
  - the acceptance row on C-200 and page 3 (Q12).
- **C. Label transfer (later, Q2):** suggested elevations on the grading sheet's own EG
  lines, from the linked sources, through D-144's suggestion machinery.

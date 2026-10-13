# Earthwork 3D view and Grading report: what exists, and a plan

_Written 2026-10-13 for the founder; adopted with its defaults (D-422). **Built overnight 2026-10-13:** 3D-1 to 3D-7 (D-423 to D-429), R-1 to R-7 (D-430 to D-436), Calculate in a worker (D-437, D-438). The input comparison: [kcp_input_comparison.md](kcp_input_comparison.md)._

The ask: (1) a 3D view on the Earthwork tab with existing, proposed and cut/fill surfaces,
vertical exaggeration and colour keys; (2) a "Grading report" that opens beside the work like
split view, exports, and is more detailed than the reference report yet simple to read.

The reference (a 3D cut/fill screenshot and a grading report PDF for the same Rebid project, from
another program) is used here for numbers only. Its name, layout, wording and colours stay out of
the repos (rule 9).

---

## Part 1: what exists today

### 1. Earthwork data: surfaces, Calculate, what is stored

**Inputs.**
- Contours, spot elevations and the work boundary are takeoff items, one container per kind and
  surface ("Existing Ground", "Proposed Grade", "EG Spots", "FG Spots", "Work Boundary"). Each
  drawn run is one geometry row, with `shape_meta {surface, elevation}` and elevation in feet
  (`lib/takeoff/earthwork/surfaces.ts`).
- **Linked EG (F18).** Another sheet's EG runs are mapped in through a stored rigid fit
  (`register.ts` `linkedEg` / `mapRuns`, table `sheet_registration`). Calculate appends them to
  the sheet's own runs.
- **Site Features.** These are `sf` items with `is_site_feature`. Each carries a subgrade depth
  (`role_depth_ft`), undercut, and prep/stabilization fields. The newest feature wins an overlap
  (`siteFeatures.ts`).
- **Strip Areas.** These live in their own table, `earthwork_strip_area`: depth, source
  (features, boundary, remaining or drawn), disposition and reuse.

**Surfaces.**
- Each surface is a pure TIN, with no grid anywhere.
  - Every drawn vertex is a point.
  - Each contour has one z, and its segments are the only breaklines.
  - There is no densification or resampling: point count = drawn vertices.
  - Triangulation is Delaunator followed by Constrainautor (`tin/compute.ts`).
  - xy stay page-normalised. They are scaled to true proportions for triangulation (D-272), and z
    is in feet.
  - The boundary is never triangulated; it only clips the render.
- **Mesh shape:** `TinMesh {points: Float64Array, triangles: Uint32Array, elevations:
  Float64Array, hull, bounds{minZ,maxZ}, clippedBoundary, constraints}` (`tin/types.ts`).

**Calculate** (`useVolumes.tsx` → `computeVolumes`, `volume/index.ts`) runs in the browser, on the
main thread.
1. It builds a union "difference TIN": the EG and FG points and breaklines merge, and EG×FG
   contour crossings are inserted as points.
2. Δz is sampled at each vertex, and a constrained Delaunay is built over the union.
3. Each triangle is clipped to the boundary and split among Site Features (newest/top wins), then
   among Strip Areas.
4. Each triangle is shifted by (strip depth − feature depth) and split at Δz = 0.
5. Volume = area × mean Δz.
6. The output is `prisms[]`: `{a,b,c, dzA,dzB,dzC, areaSF, volumeCF, regionId}`. Prisms carry
   **Δz only, no absolute EG or FG z**.

**What is stored.**
- `earthwork_result` has one row per sheet (`earthwork_site_result` one per joined site). Its
  `result` JSONB holds:
  - `cutCY`, `fillCY`, `netCY` (after strip)
  - `regions[]`, one per Site Feature plus the remainder: cut, fill, `areaSF`, `avgEgFt`,
    `avgFgFt`, `depthFt`, `stripFt`
  - `withoutStrip` (totals and per-region cut/fill)
  - `strip` and `stripAreas[]`: area, depth and volume per strip area
  - `features[]`: undercut and prep per feature, as flat area × depth
  - `uncovered` (rings and areas by kind) and `coverage`
  - `warnings`, `elevationWarnings`, `stripMeta`
- The Division 31 lines are written as `earthwork_computed` items (`earthwork/lines.py`).
- **Not stored:**
  - **Balance:** recomputed from regions and assumptions into the Soil Export/Import line.
  - **Contour interval.**
  - **The TIN meshes.**
  - **The prisms:** Calculate strips them before saving.

**Can a 3D view use exactly Calculate's data with no second calculation?** Not today.
- **Storage:** the server has no meshes and no prisms.
- **In the browser after a Calculate:** the prisms stay in memory for the session. The EG and FG
  meshes Calculate built are thrown away.
- **After a reload:** the prisms are gone too.
- **The 2D EXIST./PROP. GRADE layers** build their own TINs from the same items with the same
  algorithm. That is a second computation, and it can differ because Calculate re-fetches the
  items first.
- **What this plan does about it:** keep Calculate's meshes and prisms (block 3D-1). After a
  reload, rebuild them from the inputs only when the stored `version_key` matches the current
  inputs. Rebuilding is deterministic, so that is the same calculation on the same data and gives
  identical numbers.

### 2. Today's 2D views

| View | Drawn as | Colour scale | Legend | Hover |
|---|---|---|---|---|
| EXIST. GRADE / PROP. GRADE (`TinLayer.tsx`) | SVG, one filled path per TIN triangle, clipped to the boundary | One hue per surface (EG red, FG green); lightness 50 % → 5 % from low to high across that surface's own range | None | None |
| CUT & FILL (`IsochoreLayer.tsx`) | SVG, one path per prism triangle, flat colour by mean Δz | Continuous: red for cut, blue for fill; lightness 65 % → 15 % up to the sheet's peak \|Δz\| | None (tooltip text only) | None |
| Coverage (`CoverageLayer.tsx`) | Hatched SVG over the uncovered parts | eg / fg / both / edge | The Coverage block in Earthwork Volumes | None |

- Only one of the three layers shows at a time, in 2D VIEW (D-417). Contours hide while one is on
  (D-418).
- **Hover:** the only earthwork hover is the card on a contour, spot or boundary run (its typed
  elevation). **There is no value under the cursor for elevation or depth.** `sampleZAt(mesh, x,
  y)` (`volume/interp.ts`) already does the lookup.
- **3D VIEW** is a stub today (D-416): it shows "coming".

### 3. Per-feature numbers versus the reference's per-element table

| Reference row | Ours today |
|---|---|
| Cut volume, fill volume, net | **Yes**: `regions[].cutCY / fillCY` (net derived) |
| 2D area | **Partly**: the region's total plan area (`areaSF`). The cut area and fill area are **not** split |
| Range: average and max cut depth, average and max fill height | **No** (derivable from prisms in session; not stored) |
| Levels: min to max elevation in the cut and fill parts | **No** (only area-weighted `avgEgFt` / `avgFgFt`) |
| 3D (surface) area | **No.** Nothing in either repo computes it |
| Ground levels min / max / average, per surface | **No** (the mesh has `bounds.minZ/maxZ` in memory; not stored or shown) |

Ours has things the reference lacks: subgrade depth per feature, strip per strip area,
undercut/prep/stabilization, with/without-strip comparison, coverage gaps, balance with
shrink/swell and Soil Export/Import, and CSI lines.

### 4. 3D library and load size

- **There is no 3D library and no WebGL in the app.** All earthwork layers are SVG, and every
  canvas is 2D.
- **Code-splitting:** pages load with `React.lazy`, and xlsx and pdf.js are imported dynamically.
- **Current chunk sizes (raw):** ProjectTakeoff 1.22 MB, xlsx 0.86 MB, pdf 0.47 MB, entry 0.47 MB,
  plus the opencv wasm (8 MB).
- **Adding three.js** (general figures, not measured here) costs about 150–170 KB gzip for the
  core, and about 40 KB more for a React binding. Loaded only when 3D VIEW opens, it is a
  separate chunk smaller than xlsx or pdf.js today. The takeoff chunk and first load don't grow.

### 5. Split view

- **Today:** split view is a plain flex row. Beside the canvas column sit a `role="separator"`
  (pointer capture, arrow keys) and a pane with `flexBasis = splitPct` (15–85 %, not persisted).
  The pane holds `ReferencePane`.
- **For a report:** the pane is an ordinary flex child with nothing canvas-specific, so a report
  panel can sit there the same way. The separator logic is inline and would be extracted into a
  small component to share.
- **Pattern for 3D:** `SiteView` is an `absolute inset-0` overlay inside the canvas area, with the
  side panels and toolbar staying. That is the model for showing 3D in place of the sheet.

### 6. Export today

- **PDF:** there is no PDF library on either side. Takeoff Print renders each sheet to an
  offscreen canvas (`renderSheetForPrint`), places the PNGs in a print-only element and calls
  `window.print()`. The browser makes the PDF.
  - Images already travel this way.
  - The SVG earthwork layers are not drawn by the print renderer today, so a grading image needs
    its own drawing step.
- **Excel:** `xlsx-js-style` 1.2.0, in the browser (the estimate workbook with formulas and the
  Dimensions sheet, D-249). **It cannot embed images**: the SheetJS community build has no
  picture support.
- **Image capture exists:** Snapshot (`captureRegion` → PNG), "Copy as image", and the AI region
  crop.
- **Report patterns:** the Earthwork Volumes panel (`VolumePanel.tsx`) is the natural base. The
  estimate reports sidebar and `pages/Reports.tsx` (time report with an Excel download) are UI
  patterns.

### 7. The Rebid project ("Hidden Valley Spec Building Rebid", Bench Construction Test)

Read through the database in read-only transactions; nothing written.

**Inputs.**

| Sheet | Scale | Earthwork on it |
|---|---|---|
| V-100 Existing Conditions | 1" = 60' | Existing Ground: 97 contours, 696–729 ft, 1,683 vertices |
| C-200 Site Grade Plan | 1" = 30' | Proposed Grade: 42 contours, 696–709 ft, 969 vertices; FG Spots: 27 spots, 703–704 ft; Work Boundary: 1 (22 vertices) |

- V-100 is linked to C-200 as its existing grade (a survey link, offset 0, scale not fitted).
- **Site Features, all on C-200** (subgrade depth):
  - Building Pad: 1.00 ft, plus undercut 4 ft (offset 5 ft, Structural Fill, 12" lifts, haul off)
  - Concrete Sidewalk: 0.67 ft
  - Heavy Duty Aggregate Pavement: 0.67 ft
  - Heavy Duty Asphalt Pavement: 1.00 ft
  - Heavy Duty Concrete Pavement: 1.17 ft
  - Standard Duty Asphalt Pavement: 0.82 ft
  - No prep or stabilization on any of them.
- **Strip Areas:** one, "Strip Area": 0.5 ft over the boundary, haul off.
- **Assumptions:** native suitable, swell 1.15, shrink 1.10, Select Borrow.
- **Calculate result:** one row (C-200, 2026-10-13 02:20). Coverage is 93.8 %.
  - **Totals after strip:** cut 11,483.74 CY, fill 9,596.09 CY, net cut 1,887.65 CY.
  - **Totals without strip:** cut 13,261.54, fill 7,956.47.
  - **Strip:** 3,642.53 CY.
  - **Building Pad undercut:** 2,599.79 CY, its own line.
  - **Soil Export:** 928 BCY / 1,067 LCY.

**Totals versus the reference.**

| | Reference | Ours (after strip) | Difference |
|---|---|---|---|
| Cut | 11,689.54 | 11,483.74 | −205.80 (−1.8 %) |
| Fill | 9,329.73 | 9,596.09 | +266.36 (+2.9 %) |
| Net cut | 2,359.81 | 1,887.65 | −472.16 |
| Topsoil (0.5 ft) | 5,244.59 over 283,208 SF | 3,642.53 over 196,697 SF | −1,602.06 |
| Area computed | 195,527 SF (disturbance) | 184,541 SF of a 196,697 SF boundary | −10,986 SF |

**Per element.** The reference's two building slabs are compared as our one Building Pad.

| Element | Ref area SF | Our area SF | Ref cut / fill | Our cut / fill |
|---|---|---|---|---|
| Remainder ("Features") | 92,963 | 77,715 | 7,189 / 3,650 | 6,900 / 2,540 |
| Building Pad (6" + 4" slabs) | 14,877 | 14,806 | 0 / 2,346 | 0 / 2,397 |
| Standard Duty Asphalt | 15,127 | 20,596 | 970 / 1,756 | 1,749 / 2,366 |
| Heavy Duty Asphalt | 19,789 | 20,879 | 1,666 / 442 | 1,638 / 531 |
| Heavy Duty Aggregate | 44,768 | 42,561 | 1,684 / 754 | 1,042 / 1,250 |
| Heavy Duty Concrete | 5,335 | 5,377 | 118 / 69 | 95 / 118 |
| Concrete Sidewalk | 2,669 | 2,607 | 62 / 312 | 60 / 394 |

**Causes, largest first.**
1. **Topsoil: the area basis, not the method.** Same depth, but the reference stripped 283,208 SF,
   the whole existing-ground extent (its first phase covers the entire site). Ours strips inside
   the work boundary, 196,697 SF, which is within 0.6 % of the reference's own disturbance area.
   (283,208 − 196,697) × 0.5 / 27 = 1,602.06 CY, the whole difference.
2. **Coverage gap, 12,156 SF.** 6.2 % of our boundary has no EG, no FG or neither under it, and
   counts as zero:
   - EG missing: 3,605 SF
   - FG missing: 5,422 SF
   - both missing: 2,805 SF
   - edge: 325 SF

   The reference computed its whole disturbance area. This falls mostly in the remainder (77,715
   versus 92,963 SF), where our fill is 1,110 CY lower. It is the main cause of the totals' gap,
   and the stored warning already says so.
3. **Overlap attribution moves volume between features, not totals.** _(Corrected by
   [kcp_input_comparison.md](kcp_input_comparison.md) §2.5: the features overlap by 69 SF here
   and 44 SF there; the per-feature shifts are differently drawn outlines, and the overlap order
   moves 0.09 CY. The comparison splits the whole gap into inputs and method.)_ Ours gives an
   overlap to the top (newest) feature. The reference gives it to the element lowest in its order. That explains
   the per-feature area shifts (Standard Duty Asphalt +5,469 SF, Aggregate −2,207 SF) and their
   volume swaps. Where features don't overlap much, the numbers agree closely: Building Pad fill
   +2.1 %, Heavy Duty Asphalt cut −1.7 %, Sidewalk cut −2 %.
4. **Surface modelling.**
   - **Ours:** EG is 97 traced contours with no densification, linked from a 1" = 60' sheet. Δz is
     linear on the union TIN, an approximation of an exact overlay.
   - **The reference:** builds its own surface, by a method we can't see.
   - **Size of the effect:** an average difference of 0.03 ft over 196,000 SF is about 220 CY, the
     size of the remaining gap.
5. **Strip basis is consistent.** The reference's second phase matches our after-strip numbers
   (our without-strip cut is 13,262, far from its 11,690). So it measured from stripped ground, as
   ours does.
6. **Subgrade depths: probably applied the same way, not proven.** Our features lower the
   subgrade by 0.67–1.17 ft. The Building Pad's close fill match suggests the reference did the
   same, but the PDF doesn't state its depths.
7. **Undercut is not in the cut total.** Our 2,599.79 CY Building Pad undercut is its own line;
   the reference has none.

Nothing was changed to make the numbers match.

---

## Part 2: the plan

### Blocks: 3D view (about 38 h)

| Block | What | Hours |
|---|---|---|
| 3D-1 | **One source of truth.** Calculate keeps its EG/FG meshes and prisms (not only the prisms). After a reload, rebuild them from the inputs only when the stored `version_key` matches; otherwise 3D says "Calculate first". The 2D grade layers switch to the same meshes, so 2D and 3D show exactly what was calculated. Emit absolute EG and FG z on prism vertices (already computed inside, not emitted) | 5 |
| 3D-2 | **Viewer.** three.js, lazy-loaded when 3D VIEW opens, in an overlay over the canvas area (the SiteView pattern). Existing, proposed and cut/fill surfaces; one shown at a time, matching the 2D buttons (D-417). Orbit, pan, zoom and fit; **rotatable to any view (the founder, 2026-10-13): all the way round and from below, with Plan / Front / Back / Left / Right / angled views and rotate and tilt buttons**; the boundary outline; feature outlines on the proposed surface | 12 |
| 3D-3 | **Vertical exaggeration** (1×–10×, a slider) and **colour keys:** an elevation key for the grade surfaces and a diverging depth key for cut/fill, with values at the ends and midpoints, in our own tokens | 5 |
| 3D-4 | **Hover readout.** Raycast to the point; show EG, FG and Δz there. The same readout in 2D, using `sampleZAt` on the shared meshes | 6 |
| 3D-5 | **Drape the sheet image** on the proposed surface (toggle). Uses the sheet raster already loaded | 4 |
| 3D-6 | **Joined sites (F19).** Build the scene from the site frame (1 ft per unit) | 4 |
| 3D-7 | **Fallback and limits.** No WebGL: a clear message. Above a vertex budget: decimate the display mesh (numbers untouched) | 2 |

### Blocks: Grading report (about 42 h)

| Block | What | Hours |
|---|---|---|
| R-1 | **Per-region statistics** in `computeVolumes`, stored with the result: cut area and fill area apart; average and max cut depth; average and max fill height; min/max level in the cut and fill parts; 3D area (sum of true triangle areas on the proposed surface, and on existing); ground levels min/max/average per surface. New quantity-table rows with worked answers | 10 |
| R-2 | **Report pane.** Opens in the split-view slot beside the canvas (the separator extracted into a shared component); same width behaviour; toggled from the Earthwork row | 5 |
| R-3 | **Report content,** one scrolling page with plain headings: summary (cut, fill, net, strip, balance in one line each); surfaces (sources, contour counts, interval, levels); the per-feature table (range, levels, 2D and 3D area, cut, fill, net); strip by strip area; undercut, prep and stabilization; balance and Soil Export/Import; coverage with its map; warnings; assumptions; the Division 31 lines with CSI | 10 |
| R-4 | **Images.** 2D: render the sheet with the chosen layer to a canvas (extend the print renderer with the TIN, cut/fill and coverage layers). 3D: a snapshot of the current camera (canvas `toDataURL`) | 6 |
| R-5 | **PDF export** through the print path: a print-only report root, images inline, page breaks between sections | 5 |
| R-6 | **Excel export** with xlsx-js-style: Summary, Per feature, Strip, Lines and Inputs sheets. No images (the library can't); the PDF carries them | 4 |
| R-7 | **Site report** for a joined site: the same report from `earthwork_site_result` | 2 |

**Total about 80 h**, plus gates, quantity-table rows and the smoke test per block.

### What the reference has that we lack, and what we add beyond it

- **We lack, and R-1 / 3D-3 add:**
  - 3D surface area
  - cut and fill areas apart
  - depth range and levels per element
  - ground-level statistics per surface
  - a colour key
  - an element diagram above each table
- **We add beyond it:**
  - subgrade depth per feature
  - undercut, prep and stabilization (with agent tonnage)
  - strip per strip area with its disposition
  - the with/without-strip comparison
  - coverage gaps mapped and quantified
  - the balance with shrink/swell and Soil Export/Import
  - the Division 31 lines with CSI codes
  - assumptions
  - linked-sheet sources and fit quality
  - metric output
  - hover readout in 2D and 3D

### Risks

- **Performance on big sites.**
  - Calculate runs on the main thread, and the union step is O(n²) for deduplication, with a
    brute-force `sampleZAt`. Fine at bid scale (≤ ~2,000 points per surface); slow on a densely
    traced or joined site.
  - **Mitigation:** move Calculate to a Web Worker (about 6 h, not in the totals), and give
    `sampleZAt` a spatial index.
  - The 3D display mesh is small (it is the TIN, not a grid).
- **Numbers not matching other tools.** Coverage gaps, overlap attribution and surface method
  (Part 1, §7) will keep producing differences of a few percent. The report should show coverage
  and the overlap rule plainly, so a difference has a visible cause.
- **2D and 3D disagreeing with the numbers.** Today the 2D grade layers are a second computation.
  3D-1 closes that; without it, 3D could show a surface Calculate didn't use.
- **Load size.** three.js adds about 200 KB gzip, but only when 3D opens. Keep it out of the
  takeoff chunk.
- **WebGL availability.** Some locked-down machines have none; 3D-7 gives a message, and the
  report still works.
- **Excel images.** Not possible with the current library; switching libraries for that alone isn't
  worth it.

### Open questions, each with a default

1. **Store meshes and prisms on the server?** Default: **no**. Rebuild them in the browser on
   demand, gated by `version_key`. Storing them (a few MB per sheet) is the fallback if rebuilds
   prove slow.
2. **Which 3D library?** Default: **plain three.js**, without a React binding (smaller, and the
   scene is simple).
3. **Where does 3D show?** Default: **in place of the sheet** (overlay in the canvas area) when 3D
   VIEW is selected; the report goes in the split pane.
4. **Drape the sheet image in 3D?** Default: **available, off by default**.
5. **3D area of which surface?** Default: **both**, proposed as the headline (the finished area),
   existing beside it.
6. **Overlap rule in the report?** Default: **keep top/newest wins** (today's rule) and state it in
   the report.
7. **Coverage gaps:** extrapolate? Default: **no**. Report and map them; the estimator extends the
   contours.
8. **Report per sheet or per site?** Default: **per sheet**, or per site when the sheet's result is
   superseded by a site.
9. **Excel images?** Default: **none in Excel**; the PDF has them.
10. **Colours and wording.** Default: **ours**: the existing EG red, FG green and CUT & FILL purple
    tokens, plain labels. Nothing taken from the reference.

### For testing later (not created yet)

- Duplicate "Hidden Valley Spec Building Rebid" in Bench Construction Test as **"Hidden Valley
  Rebid — 3D test"**. Use the app's project copy, with a throwaway-safe path and no founder
  project touched.
- On the copy only, add test features:
  - a stabilized Option 2 feature (lime at 6 %)
  - a native-reuse undercut (D-407)
  - a scarify-and-compact feature with lifts
  - a second strip area with reuse
  - a deliberate overlap
- Recalculate there.
- Each report block is checked against hand-worked values for the copy. The original Rebid stays
  read-only.

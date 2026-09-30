# F12: Earthwork and Auto Trace (spec, questions open)

> **Answered 2026-09-30 (D-136); being built block by block.** Specced 2026-09-30 from legacy's source on `UmeralamDEV` (e99cddcb; no earthwork change
> since 2026-09-27) and live legacy's Earthwork tab. Nothing is built. The founder's
> answers to the questions at the end come before any code.** Supersedes the draft of
> 2026-09-29 (D-96), which covered Strip Areas and Site Features only. PARITY §16 is
> rewritten to this spec when it is adopted.

## The problem

Takeoff measures lengths, areas and counts, but a site contractor bids earthwork: how much
soil is cut and filled between the existing ground and the proposed grade, what is
stripped, undercut, hauled, stockpiled or re-used. None of that exists in the new app.

**Problem → solution.** No earthwork. → Legacy's Earthwork tab: existing (EG) and proposed
(FG) surfaces from contours and spot elevations, traced by hand or by Auto Trace from the
drawing's own linework; a work boundary; Site Features that set the subgrade depth,
undercut and subgrade preparation; Strip Areas; a Calculate that differences the two
surfaces inside the boundary into cut and fill; and the estimate lines it writes (strip,
haul, stockpile, re-use, undercut, replacement, preparation, cut, fill, export, import),
with swell and shrink and CSI codes, priced in Estimating like any other item.

## How legacy was read and driven

- **Source:** `src/lib/takeoff/earthwork/` (volume, tin, trace, roles, siteFeatures,
  computeToItems, versionKey, containers, defaultFolder, ensureMarkupFolder, sortRank),
  `EarthworkToolbarGroup.tsx`, `SiteFeatureDialog.tsx`, `StripAreaDialog.tsx`,
  `StripAreaLayer.tsx`, `EarthworkCalculateDialog.tsx`, `EarthworkVolumePanel.tsx`,
  `ElevationPopover.tsx`, `pdf/pdfPolylines.ts`, the handlers in `ProjectTakeoff.tsx`, and
  the migrations 20260707012858 to 20260927210520.
- **Plans:** site-features-and-strip-area-earthwork (2026-09-27), auto-trace-stage-1-5,
  auto-trace-stop-the-freeze, trace-settings-one-profile-per-surface,
  show-intersecting-contours-in-blue, choose-earthwork-markups…, earthwork-markups-folder…,
  fix-area-tool-from-earthwork…, why-the-scope-column-is-empty…; `docs/earthwork-acceptance.md`.
- **Driven live** (the "Bench comparison" project, 1440 × 900): the Earthwork toolbar row
  and every tooltip; the Site Features dialog with both options open (five default
  materials and "+ Add material…"); the Strip Area dialog with each source and "Re-use as
  fill"'s two choices ("Draw a work boundary on this sheet first." on a sheet without one);
  the Earthwork assumptions dialog (fill types Select Borrow / Engineering Fill / Structural
  Fill, swell 1.25, shrink 1.00, Calculate disabled until "Is native soil suitable for
  fill?" is answered). The comparison sheets carry no surfaces, so no volume was computed
  live; the numbers below are legacy's own hand-worked tests.

## What exists in the new app

- Item types `contour`, `spot_elevation`, `boundary`, `cy`; `source_type`
  `earthwork_computed`; `is_stale`; `is_earthwork_markup` on items (api `takeoff/models.py`).
- Estimating already leaves out contour, boundary and spot items and the Earthwork Markups
  folder (`lib/estimate/lines.ts`, F9-S1).
- The pdf.js walk of a sheet's stroked segments (`find/sheetStrokes.ts`, D-131), the base
  of Auto Trace's reader.
- `MeasurementDialog.tsx` reserves "Finish-to-Subgrade Depth" and "Earthwork markup" for F12.

## Design

- **Hard rule 2.** Everything that computes is pure TypeScript under
  `lib/takeoff/earthwork/{tin,volume,trace,roles,siteFeatures,lines}`: data in, data out, no
  React, no network, so the same code can later run in a worker. The browser runs
  Calculate on the open sheet (as legacy); the api stores surfaces, features, strips, the
  assumptions, the saved result and the written lines, and validates what it stores.
- **The shared quantity table** (D-78) gains every hand-worked case below, each checked to
  1e-9 against legacy's expected value; the Python twin waits for a need (as D-89).
- **Tokens** for every colour legacy hard-codes (`--earthwork-eg`, `--earthwork-fg`,
  `--earthwork-boundary`, `--earthwork-error`, the strip hatch, the status dots, the markup
  folder), hard rule 4.
- **Realtime** (D-13): `earthwork.strip.changed`, `earthwork.result.changed`, and the
  existing `takeoff.item.changed` for containers, features and lines.

## Data model (api)

- **Items:** `role_depth_ft` (Site Feature subgrade depth), `is_site_feature`,
  `undercut_depth_ft`, `undercut_offset_ft` (≥ 0, default 0), `undercut_fill_material`,
  `undercut_disposition`, `prep_depth_ft`, `prep_lifts` (≥ 1); `earthwork_region_id`,
  `earthwork_role` with a unique partial index on `(project, sheet, region, role)`. Runs keep
  `shape_meta` `{kind, surface, elevation}`.
- **Projects:** `earthwork_native_suitable_for_fill` (null until asked),
  `earthwork_fill_type`, `earthwork_swell_factor` (1.25), `earthwork_shrink_factor` (1.00).
- **`earthwork_strip_area`:** sheet, name, `depth_ft` > 0, `source` (features, boundary,
  remaining, drawn), `feature_ids`, drawn `vertices_json`/`shape_meta`, colour,
  `disposition`, `reuse_kind`, `is_hidden`, `version` (bumped on update). Deleting a Site
  Feature removes it from strips and deletes a features-only strip left empty.
- **`project_fill_material`:** per project, unique by trimmed lower-case name.
- **`earthwork_result`:** one per (project, sheet): version key, result JSON, the prep rows.
- The value sets for dispositions are Q1's answer.

## The blocks

Each block is one or more stories; each story is gated, quantity-tabled and smoke-checked (D-68, D-78) when built.

### Block A: the surfaces (EG, FG, contours, spots, the boundary)

**What legacy does.**
- **The Earthwork tab** (legacy gates it behind the `earthwork_takeoff_e1` flag, on) adds a
  second toolbar row, in order: **EG** "Existing ground surface (contours + spots you tag as
  EG)", **FG** "Proposed grade surface (contours + spots you tag as FG)", **Contour** "Trace
  a contour line (elevation entered on Enter)", **Trace** (Block G), **Spot** "Place a spot
  elevation (elevation entered per click)", **Boundary** "Draw the work boundary (one per
  sheet — replaces if present)", the interval (Δ, default 1) with **Ascending** "next
  contour pre-fills at last + interval" / **Descending** "… last − interval", **Site
  Features** (Block D), **EG TIN** / **FG TIN** "Toggle EG TIN (run Calculate first)",
  **Isochore** "Toggle isochore depth map — red=cut, blue=fill (from the same prisms as
  Cut/Fill/Net)" (disabled until a result), **Calculate** "Compute TINs + volumes (EG − FG)
  on the active sheet", **Strip Area** (Block E).
- **Elevation popover** after a contour or per spot: "Elevation", "Enter to commit",
  placeholder "0.0", ft or m, the EG/FG chip; pre-filled with the last value ± interval;
  "Enter an elevation.", "Numeric value required.", "Out of range (-2000 – 30000 ft)"
  (-600 – 9000 m). The first Esc makes the draft dormant, Enter reopens it, a second Esc
  drops it ("Contour discarded").
- **Containers, not items per line:** one item per (sheet, kind, surface): "Existing
  Ground" / "Proposed Grade" (type `contour`), "EG Spots" / "FG Spots"
  (`spot_elevation`), "Work Boundary" (`boundary`, one run, replaced when redrawn). Each
  contour or spot is a run on its container, `shape_meta` `{kind, surface, elevation}`;
  containers are found by surface, then by type if renamed; EG red `#ef4444`, FG green
  `#22c55e`. Commits are serialised per (container, sheet) (a halted lane says "Contour
  didn't save", Retry or Discard).
- **Filing:** the first earthwork input on a blank project files under DIV 31 Earthwork ›
  Earthwork & Grading (or the system's equivalent), never over a folder the user chose;
  contours, spots, the boundary and Site Features live in the **Earthwork Markups** folder
  (one per project, last, unclassified), which Estimating never shows.
- **New Measurement's "Earthwork markup"** checkbox ("Files this measurement into the
  Earthwork Markups folder — a drawing input for earthwork calculations, never an
  estimating line."), exclusive with Rough measurement; the WBS becomes the chip "Earthwork
  Markups · classification bypassed". The Area tool used from the Earthwork tab stays on
  Earthwork.
- **The Markups folder is closed:** nothing moves in or out ("Earthwork Markups is a closed
  folder" / "Markups can't be moved in or out. Right-click the item and choose "Duplicate"
  to create an estimating copy under a classification."). Its rows read "N contours", "N
  spots", "N regions", children "Contour · EL x (EG)", "Spot · EL x (FG)", with an inline
  elevation edit; a run's delete asks "Delete this run?" / "Removes {label} on {sheet}. The
  rest of the item is kept."
- **Boundary replace:** "Replace work boundary on this sheet?" / "{name} already exists on
  this sheet. Only one work boundary per sheet is allowed — replacing will delete the
  existing one." Cancel / Replace.
- **Canvas:** contours in the surface colour (tokens `--earthwork-eg` red, `--earthwork-fg`
  green), 1.75 px (2.75 selected), elevation labels at the midpoint, decluttered; spots a
  10 px crosshair and dot with the label; the boundary dashed 8/5, 2 px (legacy draws it
  amber `#f59e0b` although its token is grey, Q29). No earthwork shortcuts; the Δ group
  reads "Auto-increment step between successive contours (per sheet). Direction sets
  ascending or descending."
- **Crossing contours** of one surface are flagged blue with the toast "{EG|FG} contour
  overlap — … Calculate will fail until fixed." (checked after every earthwork write).
- Elevations are meant to be stored in canonical feet (legacy stores the typed value:
  defect, Q).

**Stories**
- F12-A1 The Earthwork tab and its toolbar row, legacy's order, glyphs and words.
- F12-A2 Contour and Spot with the elevation popover, the interval and direction.
- F12-A3 Boundary, one per sheet.
- F12-A4 Containers and the per-lane commit queue; `shape_meta` runs; canonical feet.
- F12-A5 Earthwork Markups folder and default filing; the New Measurement toggle.
- F12-A6 Inline elevation edit from the Takeoff panel, same range and parse.
- F12-A7 Crossing contours in blue.

### Block B: the TIN (legacy's `earthwork/tin/`)

- **Collect** per surface: contour and spot runs split on the run sentinel, one constant z
  per run; contour runs give constraint edges between consecutive vertices (open, no
  closing edge); spots none; the boundary is kept apart for warnings, never triangulated.
- **Preflight, in order:** absent (no points) → at least 3 points ("Need at least 3 points
  to triangulate — have {n}.") → not all one location ("All points are at the same
  location — cannot triangulate.") → not collinear ("All points are collinear — cannot
  triangulate.") → duplicate merge within 5e-5 of the page, a conflicting elevation over
  0.01 an error ("{S}: Conflicting elevations at the same location: …") → again → crossing
  constraints ("{S}: … crosses itself — edit the trace so it does not self-intersect.",
  "{S}: … crosses … — contours must not intersect.") → the flat warning.
- **Warnings that still render:** "Surface is flat (all elevations equal) — rendered without
  gradient.", "{n} point(s) outside boundary — excluded from render.", "No boundary — TIN
  extends to input hull. Add a boundary to clip."
- **Build:** Delaunay with constraints (legacy: Delaunator + Constrainautor);
  "Triangulation engine failed: {err}" on a failure after preflight.
- **Cache** per sheet under the version key (Block C); **EG TIN / FG TIN** toggles draw it.

**Stories:** F12-B1 collect and preflight (pure); F12-B2 the constrained triangulation
(pure; the library is a choice, Q); F12-B3 the toggles and their render.

### Block C: cut and fill, the assumptions, the panel

**The volume engine** (`computeVolumes`, pure):
1. Guards: no boundary of 3 points → "Boundary required to compute volumes — draw a
   boundary polygon on this sheet."; a surface absent → absent; a surface in error → that
   error (EG first).
2. EG and FG points merged (dedupe 5e-5); the planar arrangement: an EG edge crossing an FG
   edge gets a vertex and both split; an edge endpoint on the other surface's edge splits
   it (T-junction); a same-surface crossing is an error.
3. Δz = FG − EG at every union vertex, barycentric on each mesh; a vertex outside either
   hull is dropped and counted; fewer than 3 left: "Surfaces do not overlap enough to
   compute a difference — extend EG or FG to cover the boundary."
4. A constrained Delaunay on (x, y, Δz); each triangle clipped to the boundary, partitioned
   by Site Feature depth areas (top first, the rest "Remaining Site") and by Strip Area
   pieces, each piece triangulated with ear clipping (a fan over-counts a concave ring),
   Δz interpolated at the new vertices, then shifted:
   `Δz_eff = FG − EG + strip depth − subgrade depth`.
5. Every mixed-sign triangle split at Δz = 0, no threshold; prism `V = area SF × mean Δz`;
   fill when V > 0, cut when < 0. Area in page points × (feet per point)², x by the page
   width and y by its height.
6. CY = CF / 27, m³ = CF / 35.31466672148859; bank labels `BCY`/`BCM`; full precision,
   rounded only on screen.
7. Coverage under 98 %: "Volumes cover {n}% of the area within the boundary; EG or FG
   doesn't extend to the limit of work. Adjust boundary or contours as required."
8. Overlapping Site Features: "Overlapping role areas: A ↔ B, … — top item wins the
   overlap."

**The assumptions dialog** (Calculate opens it every time; verbatim): "Earthwork
assumptions" / "Saved on the project and pre-filled next time."; "Is native soil suitable
for fill?" Yes / No, no default the first time (Calculate disabled until picked), "Yes: cut
offsets fill (net drives Export/Import). No: all cut exported, all fill imported."; "Fill
type required" Select Borrow / Engineering Fill / Structural Fill, default Engineering
Fill; "Swell factor (bank → loose)" default 1.25, "Applied to Soil Export, Soil Import,
and Topsoil Export. Default 1.25."; "Shrink factor (bank → compacted)" default 1.00,
"Applied to strip or undercut soil re-used as general fill. Default 1.00 (no change).";
Cancel, Calculate. Saved on the project (`earthwork_native_suitable_for_fill`,
`earthwork_fill_type`, `earthwork_swell_factor`, `earthwork_shrink_factor`). The old
"Scarify, moisture condition & compact subgrade?" question is gone (each Site Feature's
Prepare subgrade replaces it).

**Calculate** runs on the open sheet only, then writes that sheet's lines (Block F).

**The volume panel** "Earthwork Volumes" (draggable, resizable, its box per sheet; the
isochore toggle and ×): Cut / Fill / Net in BCY, Net red when negative; by region when more
than one ("C x · F y", "Remaining Site", "Regions sum to totals structurally."); the
assumptions and Soil Export / Import with the arithmetic written out; Subgrade Preparation;
warnings. States: "Press Calculate to compute EG − FG volumes for this sheet.", "No authored
surfaces on this sheet — nothing to difference.", an error with buttons to the offending
item, stale "Boundary, contours, elevations, or area features changed — recalculate to
update values." (dimmed).

**Isochore:** the depth map from the same prisms, red cut, blue fill.

**Results and staleness:** one saved result per (project, sheet) with its version key;
the key folds the sheet's contour, spot and boundary geometry versions, each Site
Feature's parameters, and each Strip Area's id, version, depth, disposition, re-use kind
and features. A changed key marks the sheet's lines stale after 120 s (legacy's debounce).

**Stories:** F12-C1 `computeVolumes` (pure, takeoff-core) with every legacy hand-worked case
in the quantity table; F12-C2 the assumptions on the project (api, migration) and the
dialog; F12-C3 Calculate, results per sheet, the version key and staleness; F12-C4 the
panel; F12-C5 the isochore.

### Block D: Site Features, the only source of subgrade depth

- **Site Features** button, then the dialog (verbatim): "Site Features" / "A Site Feature
  sets subgrade depth for grading. It adds no area line to Estimating."; Name (placeholder
  "Building Pad") and colour (default `#8B5E3C`); "Proposed Grade to Subgrade Depth" in (or
  cm), "Lowers the cut/fill surface inside this feature (pavement or slab section).";
  **Option 1: Undercut subgrade**: Undercut depth (in / cm), Extend beyond edge (ft / m,
  default 0), Undercut replacement fill (Engineered Fill, Select Fill, Crushed Stone /
  Aggregate Base, Structural Fill, Flowable Fill, the project's own, "+ Add material…"),
  Undercut spoil goes to (Haul off / Stockpile on site / Re-use as general fill);
  **Option 2: Prepare subgrade** "Scarify, moisture condition and compact.": Depth, Compacted
  in N lifts (≥ 1, default 1); Cancel, **Draw**. Messages: "Enter a name.", "Depth must be a
  number.", "Enter an undercut depth.", "Extend beyond edge must be 0 or more.", "Choose a
  replacement fill.", "Enter a prepare depth.", "Lifts must be 1 or more."
- **Draw** arms the Area tool with the feature's values; the item (`sf`,
  `is_site_feature`) lands in Earthwork Markups. An option switched off nulls its columns.
- **Depth only from Site Features** with a depth over 0; a plain area's `role_depth_ft`
  is ignored by grading. Legacy has **not** fully removed the old field: New Measurement
  still shows "Finish-to-Subgrade Depth" for an area ticked "Earthwork markup", and the
  status line has a "+ Finish-to-Subgrade Depth" chip for an area on the Earthwork tab; both
  write a depth grading ignores (Q7). Our dialog reserves the field for F12.
- **Dialog modes:** create "Site Features" (Draw); edit "Site Feature properties" (Save,
  from the item's menu "Site Feature properties…" on the tree and the canvas); convert
  "Make Site Feature" (Create copy). "+ Add material…" swaps the list for a "Material name"
  input with Add / Cancel.
- **Undercut footprint:** each outline offset outward in real feet (x by the page width's
  scale, y by the height's), mitred corners, a mitre past 4·d bevelled; unioned with the
  outline, clipped to the boundary; overlapping features: the top one wins. Volume = area ×
  undercut depth (a flat prism, apart from grading).
- **Prepare subgrade:** the outline clipped to the boundary, top wins, area only.
- **Make Site Feature** (right-click an area; legacy: "Only area items can become Site
  Features."): copies the geometry into a new flagged item in Earthwork Markups; the source
  is never written.
- Project materials in `project_fill_materials` (unique by name, case-blind).

**Stories:** F12-D1 the columns and the dialog; F12-D2 Draw and filing; F12-D3 the offset and
top-wins geometry (pure, quantity-table rows from legacy's `siteFeatures.test.ts`); F12-D4
Make Site Feature (one api call, atomic); F12-D5 remove Finish-to-Subgrade Depth.

### Block E: Strip Areas

- **Strip Area** button, then the dialog (verbatim): "Strip Area" / "Topsoil stripped before
  grading. Where Strip Areas overlap, the newest one counts."; Name ("Strip Area") and
  colour (`#6B8E23`); Depth in (default 6, or 15 cm); "Where to strip": Selected Site
  Features / Within boundary / Remaining Site within Boundary / Draw "(draw the area after
  you click Draw)", with the sheet's Site Features ticked below ("No Site Features on this
  sheet yet."); "Stripped soil goes to": Haul off / Stockpile on site / Re-use as fill
  (then General fill (goes to grading) / Fill for topsoil (landscape)); Cancel, Create (Draw
  when drawing). Messages: "Choose at least one Site Feature.", "Draw a work boundary on this
  sheet first." Default source: Within boundary when a boundary exists, else Selected Site
  Features.
- **Sources:** chosen features; the whole boundary; the boundary less the unticked features
  ("Remaining Site"); a drawn outline kept on the strip's own row, never a takeoff item.
- **The engine:** newest first; each strip's polygons unioned, less exclusions, clipped to
  the boundary, less what newer strips took; each piece carries its depth; a newest strip
  over the whole boundary takes the uniform path. Per strip: area SF and area × depth.
- **Storage:** `earthwork_strip_areas` (name, depth_ft > 0, source, feature_ids, drawn
  vertices, colour, disposition, reuse_kind, is_hidden, version bumped on each update).
  Deleting a Site Feature removes it from strips and deletes a features-only strip left
  empty.
- **Screens:** a hatched (45°, 8 px), dashed (6/3) overlay in the strip's colour, its name
  as the tooltip, hidden with the markups; a drawn strip is captured point to point (click,
  double-click or Enter to finish, Backspace to drop a point, Esc to cancel; toast "Draw
  the Strip Area" / "Click points on the sheet. Double-click or Enter to finish, Esc to
  cancel."); virtual rows under Earthwork Markups for the open sheet ("Strip 6"",
  "Strip Area — right-click for Properties, Hide, Delete"), menu "{name} · Strip Area",
  Properties…, Hide / Show, Delete…; edit is "Strip Area properties" (Save; a drawn strip
  cannot change source); undo covers create and edit; delete asks "Delete Strip Area?" /
  "{names} will be deleted with any outline drawn for it. Its strip lines leave Estimating
  after you recalculate. This can't be undone." and is final;
  then "Earthwork quantities have changed" / "Recalculate grading? Until you do, the
  earthwork lines in Estimating stay as last calculated." with Later / Recalculate (which
  opens the assumptions dialog); the same prompt when a Site Feature is deleted.
- **Breaking change:** a sheet with no Strip Area strips nothing; `strip_thickness_ft` is
  not read.

**Stories:** F12-E1 the table and api (realtime, version); F12-E2 the dialog and Draw;
F12-E3 the engine's strip partition (pure; legacy's e4 rows); F12-E4 overlay, tree rows,
undo, delete, the recalculate prompt.

### Block F: the estimate lines (legacy's `computeToItems.ts`)

Calculate on a sheet writes that sheet's earthwork lines as engine-owned items
(`source_type = earthwork_computed`, keyed `(project, sheet, region_id, role)`), which the
Estimating tab prices like any other item. Units follow the sheet's system: bank
`BCY`/`BCM`, loose `LCY`/`LCM`, compacted `CCY`/`CCM`, area `SF`/`M²`; CF ÷ 27 (or
÷ 35.3146667), SF × 0.09290304. Depth labels: inches to 0.1 with whole numbers `6"`, or
`15cm`.

| Role | Name (verbatim, `—` and `→` literal) | Quantity | Unit | CSI | When |
|---|---|---|---|---|---|
| `strip` | `Strip Topsoil ({depth}) — {name} (bank)` | strip volume | bank | 31.01.04 | per Strip Area with volume > 0 |
| `strip_haul` | `Strip Topsoil — {name} → Haul Off (loose)` | bank × swell | loose | 31.03.05 | disposition Haul off |
| `strip_stockpile` | `Strip Topsoil — {name} → Stockpile on Site (loose)` | bank × swell | loose | 31.01.04 | Stockpile on site |
| `strip_reuse_topsoil` | `Strip Topsoil — {name} → Re-use as Topsoil Fill (Landscape) (bank)` | bank | bank | 31.01.04 | Re-use, Fill for topsoil |
| `strip_reuse_fill` | `Strip Topsoil — {name} → Re-use as General Fill (compacted)` | bank × shrink | compacted | 31.03.03 | Re-use, General fill; the bank joins the re-use supply |
| `undercut` | `Undercut Excavation ({depth}) — {label} (bank)` | undercut volume | bank | 31.05.03 | a feature with an undercut volume > 0 |
| `undercut_haul` / `_stockpile` / `_reuse_fill` | `Undercut Spoil — {label} → …` (the strip suffixes) | as the strip rows | as the strip rows | 31.03.05 / 31.01.04 / 31.03.03 | the undercut's spoil destination (no topsoil re-use) |
| `undercut_replace` | `Undercut Replacement Fill: {material} — {label} (compacted in place)` | the undercut's bank volume, no factor | compacted | 31.05.03, or 31.05.04 when the material names "aggregate" or "crushed stone" | every undercut |
| `prep` | `Prepare Subgrade ({depth}, {N} lift{s}) — {label}` | area | area | 31.05.02 | a feature's prep area > 0.5 |
| `cut` / `fill` | `{label} Cut` / `{label} Fill`; the rest is `Remaining Site` | region cut / fill | bank | the scope (31.03) | every region, even 0 |
| `soil_export` | `Soil Export` | see the balance | loose | the scope | assumptions given |
| `soil_import` | `Soil Import — {fill type}` | see the balance | loose | the scope | assumptions given |

**The balance** (the sheet's regions, bank measure; `reuseSupply = reuseBank × shrink`):
- Native soil suitable: `net = cut + reuseSupply − fill`; Soil Export `net × swell` when
  net > 0.5, Soil Import `|net| × swell` when net < −0.5, else neither.
- Not suitable: `importNeed = fill − reuseSupply`; `export = cut + max(0, −importNeed)`;
  Soil Export `export × swell` when > 0.5; Soil Import `importNeed × swell` when > 0.5; both
  can show.
- Shrink is not applied to native cut used as fill (legacy's plan defers it).

**CSI:** on a project whose system is CSI, a role's code is looked up among the workspace's
classification nodes (the CSI template carries 31.01.04 Topsoil Strip & Stockpile, 31.03.03
Cut & Fill, 31.03.05 Export / Haul-Off, 31.05.02 Subgrade Proof Roll & Compaction, 31.05.03
Undercut & Replace, 31.05.04 Aggregate Base). Not found, or another system: the scope
("Grading", 31.03 under DIV 31, or its equivalent per system).

**Writing:** select-then-update-or-insert on the key; an update keeps the row's id and
patches name, unit, quantity, folder, classification and `is_stale = false`. Folder: DIV 31
› the scope folder (`defaultFolder.ts`). Colour `#8B5E3C` (a token here). Rows whose key is
not in this Calculate's set are deleted: a removed region, strip or feature, a changed
disposition, export flipping to import. Only a successful Calculate retires rows.

**Estimating:** earthwork rows are ordinary rows (effective quantity, the unit through),
ordered by `earthworkRank`; contour, boundary and spot items and the Earthwork Markups
folder never show (already true, F9-S1).

**Stories**
- F12-F1 The pure projection `lib/takeoff/earthwork/computeToItems.ts` (desired rows from a
  volume result, the strips, the features and the assumptions), no network (hard rule 2).
- F12-F2 The api's write: one endpoint takes a sheet's desired rows and applies them in one
  transaction (upsert on the key, retire the rest), with `takeoff.item.changed` per sheet.
- F12-F3 Units `CCY`, `LCM`, `BCM`, `CCM` in both unit registries (legacy lacks them, Q).
- F12-F4 Sort rank for the new names.
- F12-F5 Quantity-table rows: each disposition, the balance both ways, metric.

### Block G: Auto Trace (legacy's `earthwork/trace/`)

**Flow, in legacy's words.**
- **Trace** (wand glyph) beside Contour. Tooltip "Auto-Trace — hover a contour on the
  drawing to highlight it, click to adopt it as a traced contour. Needs a vector (not
  scanned) sheet." No shortcut.
- While armed, the hint: "Auto-Trace {EG|FG} — reading the linework on {sheet} — the rest of
  the set is untouched, and you can keep working while it reads", then "hover a contour to
  highlight it, click to adopt it · Shift+click to add a piece the trace left out · Alt+click
  to ask what's under the cursor", or "no traceable contours on this sheet — use the Contour
  tool to trace by hand"; **Done (Esc)**.
- Arming toasts: "No vector linework on this sheet" (a scan), "No vector linework to trace"
  (only the border is vector), "No traceable contours found", "Couldn't read this sheet's
  lines".
- Hover lights the whole stitched line in the surface's colour (EG red, FG green): a 3 px
  core over a 7 px white halo, 4 px dots at both ends.
- Click adopts it and opens the Contour tool's elevation popover ("Elevation", "Enter to
  commit", pre-filled last ± interval by the Ascending/Descending toggle). The elevation is
  always typed, never read from labels. Shift+click adds the piece to a buffer that the next
  click commits with it; Alt+click probes ("N traceable line(s) within 20pt", or why
  nothing is there).
- The adopted line is one more run on the sheet's surface container, exactly as a hand
  contour.

**Algorithm.**
- Reads the sheet's one-page PDF (D-42) with pdf.js: one polyline per stroked subpath with
  colour, width and dash; fills dropped; curves flattened to 8 chords; caps 60,000
  polylines and 1.2 M points.
- Drops two-point exactly horizontal or vertical lines, then **stitches**: greedy
  nearest-first over a grid of ends; a join needs the same style family (colour and dash)
  unless "join across styles", a gap within the profile's tolerance, end tangents (over
  10 pt) anti-parallel within the angle tolerance, and for gaps over 0.5 pt the bridge
  itself within the angle of both tangents (the guard against zipping parallel contours).
  Score `gap + 0.05·angle (+0.25·gapTol for a width change)`; the heavier pen kept.
- **Dashes:** a gap within 1 pt of the dash period takes a looser angle (tol + 8°, at most
  30°). Auto-detect from the histogram of refused near-gaps (3 to 18 pt, 12 samples, 30 %,
  a local maximum 3× prominent), then a full re-stitch.
- The length floor after stitching; closure never inferred.
- Hit test: a uniform grid (12 pt cells), pick within 6 pt; probe within 20 pt.
- Adoption simplifies with Ramer–Douglas–Peucker in sheet points, endpoints kept.
- All on the main thread, in chunks of 8 ms under an abort signal (the freeze fix); the
  read is warmed 1.2 s after opening the Earthwork tab; extractions cached in IndexedDB
  (`intelcost-trace`, newest 60), stitched pages in memory (4).

**Settings** (Settings › Trace, tabs Existing grade (EG) and Proposed grade (FG); legacy
keeps them per device):

| Field | EG | FG |
|---|---|---|
| Point detail: Fine — recommended 0.5 / Normal — may shorten lines 1.2 / Coarse — will shorten lines 3 | 0.5 | 0.5 |
| Bridge label gaps up to (pt, 0–160) | 60 | 60 |
| Tangent tolerance (°, 2–45) | 22 | 14 |
| Shortest line kept (pt, 4–60) | 12 | 24 |
| Rejoin dashed contours | on | off |
| Measure dash spacing from the sheet | on | off |
| Dash spacing (pt, when not measured) | 10 | 0 |
| Join across line styles | on | off |

**Crossing contours in blue** is not Trace's: after any earthwork write, each surface's
crossings are checked; the toast "{EG|FG} contour overlap — the crossing lines are
highlighted in blue on the sheet. Calculate will fail until fixed." and the offending runs
stroked blue.

**Stories**
- F12-G1 `lib/takeoff/earthwork/trace/` (stitch, simplify, hitTest) pure; the pdf.js walk
  beside the scale check's (`find/sheetStrokes.ts`, D-131), extended to colour, width, dash
  and curves.
- F12-G2 The Trace tool: hover, click, Shift+click, Alt+click, the hint and toasts.
- F12-G3 Settings › Trace, two profiles.
- F12-G4 The IndexedDB cache and the warm-up.
- F12-G5 Crossings in blue (with Block A's contours).

## Hand-worked cases for the quantity table (legacy's tests)

Unless noted: the boundary is the unit square, `feet per point = s`, a page 1 × 1 point,
values in CY.

| Case | Input | Expected |
|---|---|---|
| F1 flat pad | s 100, EG 100, FG 105 | fill 50000/27, cut 0 |
| F2 one corner up | s 30, EG 100 with NE 106, FG 103 | fill 1125/27, cut 225/27 (depends on the diagonal chosen for 4 cocircular points, Q4) |
| F3 single triangle | (0,0)(1,0)(0.5,1), s 30, Δz +3 +3 −3 | fill 562.5/27, cut 112.5/27 |
| F5 inner boundary | [0.25, 0.75]², s 20, Δz +5 | fill 500/27 |
| F6 / F7 | FG absent; no boundary | absent; "Boundary required…" |
| F8 partial FG | FG on [0.25, 0.75]², s 20 | fill 500/27, coverage 25 % with the message |
| F9 / F10 / F11 | EG × FG contour cross, serpentine, T-junction; s 30, Δz +3 | fill 100 each, with the crossing vertices |
| Metric pad | s 100/0.3048, FG +1.5 m | 15000 m³; imperial 529720/27 CY |
| Remaining Site | strip 0.5 ft over the boundary less [0, 0.25] × [0, 1], flat pad | area 7500 SF, strip 3750/27, fill 3750/27 |
| e4 F1 | strip 0.5 ft over the boundary | strip 5000/27, fill 5000/27 |
| e4 F2a/b/c | pavement [0.25, 0.75]² at 0.5 ft, strip 0.5 / 8/12 / 4/12 | as legacy's e4.test.ts:168-257 |
| e4 F3 | detention [0.05, 0.35]² at 1 ft, parking [0.5, 0.9]² at 8/12, strip 0.5 | cut 450/27 + (1600/6)/27, fill 3750/27; regions sum to totals |
| e4 F4 | a feature straddling the boundary | fill 3750/27 |
| e4 F6 overlap | A [0.2, 0.7]² 1 ft over B [0.4, 0.9]² 0.5 ft, strip 0.5 | cut 1250/27, fill 2950/27, the overlap warning |
| e4 F7 U boundary | the U ring, Δz +1 | fill 8800/27 (a fan gives 1.24 for 0.88) |
| Undercut offset | 10 × 20 ft rectangle, 2 ft, page 200 × 100 pt | 14 × 24 = 336 SF |
| Undercut top wins | two 10 × 10 squares 5 apart | 100 and 50 SF |
| Balance | swell 1.25, shrink 1: cut 100, fill 300, strip 50 re-used | import 187.5 |
| Balance | cut 300, fill 100, re-used | export 312.5 |
| Balance | haul off | `strip_haul` 62.5, export 250 |

## Legacy defects found (facts, each with a question below)

1. Re-use can never be saved: the code writes `reuse_fill` / `general_fill`, the database
   allows `reuse` / `general` / `reuse_general`; the failure is only logged (Q1).
2. Metric elevations are stored as typed (metres), not canonical feet, so metric volumes
   come out 3.28 × low (Q5).
3. Site Feature "top wins" sorts by an item `z_index` that does not exist (id order), while
   undercut and prep use the drawing order (Q6).
4. "Finish-to-Subgrade Depth" still writes a depth grading ignores, and on a contour sheet
   hides the area from Estimating (Q7).
5. The volume panel and the written lines disagree (re-use supply, topsoil rows, the prep
   name) (Q9).
6. `is_stale` reaches no screen, and a failed Calculate clears it (Q10).
7. `CCY`, `LCM`, `BCM`, `CCM` are not in the unit registry (Q11).
8. An EG spot on an FG contour is an "engine failure" in developer words (Q30).
9. Auto Trace: the dash default is never used when auto-detect finds nothing; an adopted
   line can be adopted again; a closed contour broken by a label stays open; `v`/`y` curves
   are flattened as quadratics (Q26).
10. Hide on a strip is not saved; the strip drawn on screen is not clipped to the boundary
    and paints subtract runs, unlike what Calculate uses (Q19, Q20).
11. The recalculate prompt fires on others' deletes, on undo and on a project switch (Q18).

## Not in F12

- Auto Count (F13); AI reading of elevations from labels (legacy's Stage 2, not built);
  Trace's style filter ("Match lines like…", a type only in legacy); a Web Worker for Trace.
- A project-wide Calculate across sheets (Q14).
- Migrating legacy projects' `strip_thickness_ft` and plain-area depths (F17, Q2).

## Questions for the founder

Each with legacy's behaviour today and my recommendation. None is decided.

**Data and correctness**
- **Q1 Disposition values.** Legacy: the UI writes `reuse_fill` (and `general_fill`), the
  database accepts `reuse` + `general|topsoil` for strips and `reuse_general` for undercut,
  so every re-use choice fails silently and no re-use line is ever written.
  *Recommend:* one set end to end, strips `haul_off | stockpile | reuse` with `reuse_kind
  general | topsoil`, undercut spoil `haul_off | stockpile | reuse`; re-use works.
- **Q2 Old projects.** Legacy: no backfill; a sheet's `strip_thickness_ft` and a plain
  area's depth are simply ignored, so an old project loses its strip and depths on the next
  Calculate. *Recommend:* nothing to migrate inside the new app (no project has them); F17
  seeds a "Within boundary" Strip Area from each sheet's thickness and a Site Feature copy
  of each area that carried a depth.
- **Q3 Where Calculate runs.** Legacy: in the browser only. *Recommend:* the pure
  TypeScript engine in takeoff-core, run in the browser on Calculate; the api stores the
  result and the lines; a Python twin only when a worker needs it (as D-89).
- **Q4 The triangulator.** Legacy: Delaunator with Constrainautor; its F2 test depends on
  which diagonal it picks for four cocircular points. *Recommend:* the same two libraries,
  with the tie-break pinned so a square of spots always splits the same way.
- **Q5 Metric elevations.** Legacy: stored as typed (metres on a metric sheet), treated as
  feet by Calculate. *Recommend:* always stored in feet, converted at entry and display.
- **Q6 Which Site Feature wins an overlap.** Legacy: grading sorts by item id in practice;
  undercut and prep by drawing order; the two can disagree. *Recommend:* drawing order for
  all three, the top one winning, ties by id.
- **Q7 Finish-to-Subgrade Depth.** Legacy: still offered on an Earthwork-markup area and as
  a status-line chip, writing a depth grading ignores. *Recommend:* remove both; the only
  depth is a Site Feature's "Proposed Grade to Subgrade Depth".
- **Q30 A spot on the other surface's contour.** Legacy: "Arrangement invariant … violated"
  (an engine failure). *Recommend:* split the contour at the spot, as a T-junction.

**The estimate lines**
- **Q8 Export and import per sheet.** Legacy: each sheet balances on its own (cut on one
  sheet and fill on another give both an export and an import), while swell, shrink and
  suitability are project-wide and changing them rewrites only the sheet recalculated.
  *Recommend:* keep per-sheet lines (Calculate is per sheet) and put the assumptions into
  the version key so every other sheet shows stale; a project-wide balance is a later
  option.
- **Q9 Panel and lines.** Legacy: the panel's Soil Export/Import leave out re-used soil, it
  shows Topsoil Export rows no line matches, and names prep differently. *Recommend:* the
  panel shows exactly the lines written.
- **Q10 Stale lines.** Legacy: the flag is set but no screen shows it, and a failed
  Calculate clears it. *Recommend:* a stale mark on the sheet's earthwork rows in the
  Takeoff panel and Estimating; a failed Calculate leaves it set.
- **Q11 Units.** Legacy: `CCY`, `LCM`, `BCM`, `CCM` missing; metric volumes typed `cy`.
  *Recommend:* add the four to both unit registries.
- **Q12 CSI for Soil Import / Export.** Legacy: they fall back to the Grading scope (31.03),
  though the CSI template has 31.03.04 Import Fill and 31.03.05 Export / Haul-Off; undercut
  stockpile maps to 31.01.04 Topsoil Strip & Stockpile. *Recommend:* map import and export
  to their nodes; keep the rest as legacy.
- **Q13 "Engineering Fill" and "Engineered Fill".** Legacy: the assumptions say
  Engineering, the materials Engineered. *Recommend:* "Engineered Fill" in both.
- **Q14 One sheet at a time.** Legacy: Calculate covers the open sheet only. *Recommend:*
  keep; a "Calculate all sheets" later if asked.
- **Q15 Deleting a strip or feature.** Legacy: its lines stay until a recalculation, with
  the "Recalculate grading?" prompt. *Recommend:* keep, with Q10's stale mark.
- **Q16 The layer of the lines.** Legacy: every Calculate moves the sheet's lines to the
  active layer. *Recommend:* a new line takes the active layer; an existing one keeps its
  own.
- **Q31 Shrink on native cut used as fill.** Legacy: not applied (its plan defers it).
  *Recommend:* keep legacy's.
- **Q32 Row order.** Legacy: the new names (Strip Topsoil, Undercut, Prepare Subgrade) all
  fall to one default rank. *Recommend:* inputs, strips, undercut, replacement, prep, cut
  and fill, export and import.
- **Q33 Keeping features out of Estimating.** Legacy: by the Markups folder only.
  *Recommend:* by the folder and by `is_site_feature`.

**Screens and flows**
- **Q17 Undo.** Legacy: contour, spot and boundary commits and Site Feature edits push no
  undo; strips undo create and edit; deletes are final. *Recommend:* every earthwork write
  in the session history (F7-S22), a strip delete included.
- **Q18 The recalculate prompt.** Legacy: fires on others' deletes, on undo and on a
  project switch. *Recommend:* only on this person's own delete.
- **Q19 Hiding a strip.** Legacy: session only (the column is never written).
  *Recommend:* saved on the strip, as the column intends.
- **Q20 What the strip overlay shows.** Legacy: not clipped to the boundary, subtract runs
  painted. *Recommend:* draw exactly what Calculate uses.
- **Q21 Make Site Feature.** Legacy: two writes (a failure leaves a plain copy), the default
  colour rather than the source's, the plain name. *Recommend:* one api call, the source's
  colour, the plain name.
- **Q22 Deleting a Site Feature.** Legacy's plan wants the confirm to name the Strip Areas
  it changes; not built. *Recommend:* build it.
- **Q23 Site Feature Draw.** Legacy: skips the scale check and may jump to the Takeoff tab.
  *Recommend:* ask for a scale as Area does, stay on Earthwork.
- **Q24 Materials.** Legacy: five defaults in code, additions per project. *Recommend:*
  keep.
- **Q28 Who sees the Earthwork tab.** Legacy: a feature flag (`earthwork_takeoff_e1`, on).
  *Recommend:* everyone who can measure; a plan gate is F16's.
- **Q29 The boundary's colour.** Legacy: a grey token, drawn amber. *Recommend:* amber, as
  seen, from a token.

**Auto Trace**
- **Q25 Trace settings scope.** Legacy: per device (its plan said per workspace).
  *Recommend:* per device, with our other Takeoff Settings (same store, D-82).
- **Q26 Trace's defects.** *Recommend:* use the profile's dash spacing when auto-detect
  finds none; refuse to adopt a line already adopted; keep a closed contour closed across
  a label gap; flatten `v`/`y` curves as the cubics they are. Legacy's "Point detail" values
  (0.5 / 1.2 / 3) kept.
- **Q27 Where Trace reads.** Legacy: pdf.js on the main thread in 8 ms slices.
  *Recommend:* the same on the sheet's one-page PDF (D-42); a Web Worker later if a sheet
  proves slow.

## Progress

- [x] Specced 2026-09-30 (this file); PARITY §16 to be rewritten on adoption.
- [x] The founder's answers (D-136).
- [x] Block A, the surfaces (D-137): tab, row, contours, spots, boundary, containers, the popover, Earthwork Markups, the New Measurement checkbox; crossings in blue move to Block B, the panel's per-run rows wait.
- [x] Block B, the TIN (D-138): legacy's preflight and triangulation, the toggles and layer, crossings in blue; 13 quantity-table rows.
- [x] Block C, cut and fill, the assumptions, the panel (D-139): legacy's volume engine, Q30 and Q31, the per-sheet result and its content key, the panel and the isochore; 31 more quantity-table rows.
- [ ] Block D, Site Features.
- [ ] Block E, Strip Areas.
- [ ] Block F (the CSI mapping table goes to the founder first, Q12).
- [ ] Block G, Auto Trace.

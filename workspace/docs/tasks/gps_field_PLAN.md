# GPS Export, revised from a contractor's field feedback (plan)

**Status:** plan only, not built. Waiting for the founder's approval and the answers at the end. Revises section C
(D-805, D-808) and `gps_export_PLAN.md`.

**Rule 9:** no maker or product names anywhere in this work: code, labels, help text, README, fixtures. Field
software is "a rover", "a machine", "the field's office software".

**Testing (h):** every GPS check runs on "Hidden Valley Rebid — 3D test (shared copy)" in the zz Equip HV copy
workspace, through a throwaway seat that is removed afterwards. Never Hidden Valley Spec, never the original 3D test
project. Fixtures build their own throwaway world.

---

## What the field told us, and what changes

| | Today | After |
|---|---|---|
| a. Surfaces | Machine control writes proposed subgrade and finished grade | **Proposed finished grade (top of paving) by default**; subgrade optional, unticked (the field applies section offsets). Every surface clipped to the grading limits |
| b. Trenches | Trench linework only | **Trench-bottom surfaces per utility system**, as their own files, meant to load behind the linework |
| c. Linework | IntelCost's own 3D linework | **2D by default (3D optional)**, and **the whole drawing**: the registered PDF's vector linework and text on its own PDF layers, title block and border clipped out, moved onto the grid by the control points. IntelCost's linework on its own layers |
| d. Points | Structures, bores, spots, control | **Control points only**; the others later |
| e. Presets | Machine control (lead), GPS stakeout, CAD | **"GPS rover (surface + linework)"** leads |
| f. Help | — | "Some field systems convert these files to their own formats in their office software." |
| g. Engineer's DXF | — | Sized below, not built |

---

## a. Surfaces: finished grade by default, clipped to the grading limits

- The rover and machine-control presets tick **Proposed finished grade** only. Proposed subgrade stays in the list,
  unticked, with the line "Optional: the field usually applies the section offsets itself."
- **Clipping:** every surface (finished grade, subgrade, existing grade, soil layers, trench bottoms) is cut to the
  grading limits, the work boundary (or the site's boundary on a site). Triangles crossing the boundary are cut at
  it, not dropped, so the surface's edge is the boundary's line. Today a surface can run past the boundary to the
  hull of its contours.
- The README names the limits ("Clipped to the work boundary, 12,345 SF").
- **Engine:** a polygon clip of each TIN face against the boundary (the same clipper D-803 hardened), the cut
  faces re-triangulated, elevations interpolated on the face's plane. Data in, data out; a quantity-table row with a
  hand-worked square TIN cut by a triangle.

## b. Utility trench-bottom surfaces, per system

- **One surface per system** (storm, sanitary, water, and so on, as the Utilities runs name them): a strip along
  each run of that system, **as wide as the trench** (editable per system in the dialog, default 2 ft), at the
  run's **flow line** elevation, interpolated along the run from its inverts.
  - **Option: bottom of bedding** = flow line − pipe wall − bedding depth, from the run's pipe and its bedding
    material (D-774).
- **Shape:** a ribbon of two points per station (±half the width across the run, the same elevation across), mitred
  at bends. Where two runs meet at a structure, the strips overlap and the lower elevation wins; a structure's own
  pit is not drawn (its linework is).
- **Files:** one LandXML per system ("Storm trench bottom"), and a DXF of 3D faces on a layer per system
  (`TRENCH-BOTTOM-STORM`). The README: "Trench bottoms: load behind the linework; they are the flow line (or bottom
  of bedding), not the finished trench."
- **Clipped** to the grading limits as every surface (a).
- **Engine:** from the runs' profiles (D-572); a quantity-table row: a 100 ft run falling 1 % at 2 ft wide gives a
  4-point ribbon 100 × 2 ft, its ends 1 ft apart in elevation.

## c. Linework: 2D, the whole drawing, on its own layers

- **2D by default:** polylines at elevation 0. "Linework in 3D" is a checkbox (today's behaviour), off for the rover
  preset.
- **The whole drawing:** the registered sheet's own vector linework and text, read as Auto Trace reads a sheet
  (`trace/readSheet.ts`: every stroked piece with its pen, and the printed text with its position, size and
  rotation).
  - **PDF layers kept:** the PDF's optional content groups become DXF layers by name (the walk follows each path's
    marked content). Linework outside any layer goes on `PDF-0`. Names go through the R12 layer-name rules
    (D-808's transliteration, 31 characters).
  - **Text** as DXF TEXT: the string (transliterated, D-808), height from the font size × the sheet's scale, its
    rotation.
  - **Title block and border clipped out:** a box per sheet (or several), drawn once on the sheet in the GPS Export
    dialog, kept with the sheet and reused on every export. **Auto-suggested:** the largest closed rectangle near
    the page edge is the border; the title block is the rectangle of lines nearest the bottom-right (or right
    edge) that holds the sheet number, starting from the AI tools' bottom-right 30 % × 22 % guess (D-323). The
    person moves or redraws it. "Apply to every sheet of this set" copies it (a set's sheets share one layout).
  - **Placed on the grid** by the same fit as every other file (the sheet's control points, or its link or site).
- **IntelCost's own linework on its own layers,** prefixed so a crew can turn them off together: `IC-BREAKLINE`,
  `IC-PAD`, `IC-BOUNDARY`, `IC-UTIL-<SYSTEM>`, `IC-CONTROL`.
- **Scanned or raster PDFs:** a sheet with no vector paths (or one image covering the page) says so in the dialog:
  "This sheet is a scan: only the takeoff's own linework can be exported." The drawing's layers are not offered.
- **Size:** a dense sheet reaches Auto Trace's caps (60,000 pieces, 1.2 million points); past them the export says
  the drawing was cut short and where. The DXF is zipped as now.

## d. Points: control points only

- The CSV carries the control points (`CONTROL PC-n`), nothing else. The structures, bores and spots choices leave
  the dialog for now (kept in code, off); they come back with a later stakeout preset.

## e. The lead preset: "GPS rover (surface + linework)"

- Writes: the finished-grade surface(s) (split by area as today), the trench-bottom surface(s) per system, the full
  2D linework DXF (the drawing on its layers + IntelCost's), the control CSV, the README.
- The dialog opens on it. Machine control and CAD stay as the other two (stakeout folds into the rover).
- File names as today, with `_NOT-FOR-MACHINE-USE` and the D-805/D-808 checks unchanged: four control points with
  elevations, the residuals on paper, the scale, the shift confirmed.

## f. Help text

- In the dialog under the presets and in the README: "Some field systems convert these files to their own formats in
  their office software before they go to the rover or the machine." No product named (rule 9).

## g. Later: the engineer's DXF for control points and linework (sized, not built)

- **What:** the person uploads the engineer's DXF (DWG is a closed format: ask for DXF). Its linework is already in
  site coordinates, so it is placed on the PDF sheet by three or more matching points (the Stitch machinery,
  `fitPoints` with the scale fitted), and its POINT entities (or a chosen layer's) become the control points.
- **Pieces:**
  - a DXF reader, ASCII R12 to 2018 (LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE, TEXT, MTEXT, POINT, INSERT with
    blocks), units from `$INSUNITS`: **3 to 4 days** with its own quantity-table rows;
  - placing it on the sheet by matching points, and an overlay to check it: **2 days**;
  - control points from its points or a layer; its linework written to the export in place of the PDF's: **1 day**;
  - fixtures and the HV copy check: **1 day**.
- **About 1.5 to 2 weeks.** Risks: binary DXF and DWG (refused, said so), xrefs (not followed), very large files
  (read in a worker, capped as the PDF read is), engineers' DXFs in a local grid unlike the survey's (the fit's
  scale and rotation say so).

---

## Build order and size

| Step | What | Size |
|---|---|---|
| 1 | a: finished grade by default; every surface clipped to the limits | 1 day |
| 2 | d, e, f: control points only; the rover preset; the help text | half a day |
| 3 | c: 2D linework; IntelCost's layers prefixed | half a day |
| 4 | c: the PDF's vector linework and text on its layers, placed on the grid; the scan message | 2 to 3 days |
| 5 | c: the title-block and border box per sheet, auto-suggested, "apply to every sheet" | 2 days |
| 6 | b: trench-bottom surfaces per system, width and bedding options | 2 days |
| 7 | Gates, quantity table, a fixture (c47) on a throwaway world, the smoke on the HV copy | 1 day |

**About 9 to 10 working days.** g is separate (1.5 to 2 weeks).

**Migrations:** step 5 adds the sheet's clip box (a nullable column on the sheet, empty on every existing row: no data
changes). Step 6 keeps the widths in the export's choices, so no migration. Listed in the report with row counts
before they run, per the standing rule.

## Questions for the founder

1. Trench width default 2 ft for every system, or by pipe size (for example outside diameter + 2 ft)?
2. Bottom of bedding: an option per export, or per system?
3. 2D linework at elevation 0, or at each line's own elevation where IntelCost knows it (contours, breaklines) and 0
   elsewhere?
4. The clip box: one per sheet, or one per set by default with "this sheet differs"?
5. Stakeout preset: fold into the rover now, or keep it until the other points (d) come back?

# Plan: Stitch sheets, earthwork choices, GPS control, Collaboration settings

Plan only (2026-10-27). Nothing is built until approved. Rule 9 applies; in-app text and examples stay generic.
Standing rules: a migration that changes data in the Intelcost Team workspace is listed in the report before it runs;
smoke tests drive the UI.

## E. What already joins sheets (searched first)

| What | Does | State | Overlap with A | Recommendation |
|---|---|---|---|---|
| **F19 Sites** (`site`, `site_member`; `useSiteJoin.tsx`, `SiteView.tsx`, `lib/takeoff/earthwork/site.ts` + `earthwork/site.py`) | Joins grading sheets at a drawn match line into one stitched drawing: draw, Trace, Calculate and the estimate across it | Built (D-271..D-276, D-402, D-429..D-440) | It *is* A: the sheets panel's site rows, the join, the stitched view | **Merge: Stitch sheets is F19, extended.** A match line is the 2-point case of A4's point join. |
| **F18 Sheet registration** (`sheet_registration`, `register.ts` / `register.py`, Linked EG panel, Split-view picking) | Places a survey sheet over a grading sheet by clicked control points, so Calculate reads EG through the link | Blocks A, B built (D-190..D-192), C planned | Same act as A4 (click matching points on two sheets, fit), but the sheets overlap rather than sit side by side | **Merge the picking and the fit into the Stitch dialog** (one point picker, one fit engine). A survey sheet becomes a member placed "over" rather than "beside". Keep reading EG through it. Remove the separate Linked EG picking UI. Existing rows: see Q1. |
| **F30 Coordinates** (`sheet_georef`, `georef.py`, `gps/CoordinatesPanel.tsx`) | Control points with N/E per sheet or site, fitted on both engines, used by GPS Export; read through links and sites (D-672) | Built (D-672..D-680) | A6 and C are this | **Merge: one control-point store.** A6 writes `sheet_georef`; the Stitch dialog's "Control points" step and the GPS Coordinates panel edit the same points. |
| **Legacy** | No sheet joining (only PDF tile stitching and dashed-line rejoin in Auto Count, unrelated) | n/a | none | Nothing to port. |

**Removed by A:**
- The site block above the sheets search, and its repeated member list.
- The "Match line" name.
- F18's own picking UI.

**Kept:**
- Each table, for now (Q1).

## A. Stitch sheets (about 14 h)

1. **Bug, the site entry opens nothing:** the click path is wired (`SheetsPanel` → `setSiteViewUuid` → `SiteView` in `ProjectTakeoff.tsx`). I did not reproduce it within the timebox. The first build step is to reproduce it on a throwaway site through the UI. Likely causes to check first:
   - the view mounts under the sheet canvas (z-order)
   - it mounts only while a sheet's canvas exists
   - it renders but stays empty until a member raster loads.

   The fix goes in with the repro.
2. **One site row in the tree:**
   - The anchor sheet's row gets a site icon and "Site · N sheets", which opens the joined drawing.
   - Member rows sit indented under it with "in site".
   - The block above the search is removed; search stays at the top. File: `features/takeoff/sheets/SheetsPanel.tsx`.
3. **Rename and help text:**
   - "Match line" becomes "Stitch sheets", with the tooltip and the in-dialog guidance as worded in the request.
   - Files: `EarthworkToolbar.tsx`, the sheet ⋮ menu, `useSiteJoin.tsx`.
4. **Join by points:**
   - On each of two sheets the person clicks 2+ matching points (a match line's two ends still work), then presses Join. The similarity fit is the existing `register.ts` / `register.py`.
   - Chains are allowed; the first sheet stays the anchor.
   - Each join shows its fit (RMS in ft), and a chain shows its accumulated fit (the root sum of squares along the path).
   - **Migration:** `site_member` gains its point pairs; existing match-line joins become 2-point pairs. That is a data migration; the Intelcost Team site (1) is listed before it runs.
5. **Scale check on join:**
   - The fit's scale is compared with each sheet's calibration; anything over 0.5 % is flagged (Q3).
   - The sheet whose calibration disagrees with the others and with any printed-dimension check is named as the likely one, with "Recalibrate this sheet".
   - Recalibrating updates every quantity on that sheet: quantities are recomputed from vertices and scale, the existing behaviour.
6. **Control points:**
   - A sheet can be placed by N/E(/Z) points in place of a neighbour; it lands in real coordinates with no chain.
   - These are the same `sheet_georef` points as GPS Export and F18.
7. **Printed-dimension check:**
   - On any sheet: click a line with a printed length, type the length, and see the % error against the calibration, with an offer to recalibrate.
   - The Stitch dialog offers it before Join. It reuses the calibration tool's two-click input.

**Fixtures to write later:** a new c42 (join by points, chain fit, scale flag, site row opens the drawing), plus the f19-* and f18-* rows that pick points.

## B. Earthwork (about 12 h)

1. **Native suitability from bores:**
   - With soil layers from bores, the default is "Per soil layers (from bores)", with a one-line suitability summary per layer and an edit link.
   - "All suitable" and "None suitable" remain as overrides; without bores, the yes/no stays.
   - Files: `CalculateDialog.tsx`, the assumptions in `earthwork/schemas.py`. Migration: `native_suitable` becomes text (`layers` | `all` | `none`); the old true/false maps across.
2. **Import material:**
   - "Fill type required" becomes "Import material (if the site is short of fill)": required only when Calculate finds an import, otherwise optional and greyed.
   - A note in the dialog says it differs from a Site Feature's replacement fill, which is placed in its undercut whatever the balance.
3. **Surplus destinations:**
   - Each surplus material (each soil layer incl. rock and unsuitable, net surplus cut, undercut spoil) gets Haul off / Stockpile on site / Re-use as fill / Waste on site.
   - Rock and unsuitable default to Haul off.
   - The dialog shows how each prices. Stockpile and Waste on site use load, on-site haul and spread, with no highway trucks or tipping; Re-use goes to Place and compact.
   - Files: `linesFor.ts`, `earthwork/lines.py` (the lines per destination), the line types in `LineRole` (a stockpile and a waste role), and the starter map. Migration: an assumptions column (JSON per material).
4. **How cut reaches fill:**
   - An Earthwork assumptions setting with a per-Site-Feature override: Dozer push / Scraper / Excavator and trucks (A1, the default).
   - **Starters:**
     - Dozer push is a new starter activity from the catalog's "Dozer push / bulk doze, 100 ft". Its push distance is adjustable by picking the 200 or 300 ft production.
     - Scraper needs one too, from "Scraper load-haul-dump, 1,000 ft one-way".
   - Fill stays Place and compact.
   - The report gives the price of a generic 4,000 BCY balanced pad under each method, computed on the bench at build.
   - The starter's new activities ship as a release (eqlib), not a migration.

**Fixtures to write later:** c43 (assumptions with and without bores, Import greyed), c44 (destinations price as stated), c45 (method per Site Feature); quantity-table rows for the dozer-push and scraper production.

## C. GPS / machine control (about 8 h)

`gps_export_PLAN.md` is updated with these (no code); F30 is built, so these are changes to it.

1. **At least 4 control points, each N, E and Z:**
   - With fewer, every file is labelled "NOT FOR MACHINE USE".
   - Residuals per point, horizontal and vertical; the worst point is named when out of tolerance.
   - Tolerances: 0.10 ft horizontal, 0.05 ft vertical (Q4).
2. **Property corners as the default controls:** click a corner (snapped to the boundary vertex, D-680), type its N/E/Z, labelled PC-1, PC-2 and so on.
3. **Control points in the export:** in the CSV (P,N,E,Z,D) and on a CONTROL layer in the DXF.
4. **The fit:**
   - Rotation and shift only; scale fixed at 1, or within 0.02 % (Q4). If the fit needs more, export stops: "The sheet scale is likely wrong; check it with a printed dimension (A7)."
   - Vertical: one shift from the control elevations, with residuals.
5. **One coordinate system per project:**
   - A mix is refused.
   - Units (US survey ft / International ft), the system and the vertical datum go in every file header and the README.
6. **Reuse:**
   - The same `sheet_georef` points as A6 and F18.
   - Reading the engineer's DXF for coordinates (a later option) would mean importing its CONTROL / boundary entities and fitting to them. That is about 1–2 days, and depends on the DXF using real coordinates.

**Fixtures to write later:** the gps-* rows for under 4 points, the scale stop, residuals and the CONTROL layer.

## D. Takeoff Settings › Collaboration (about 3 h)

1. **Order:** Others' work, Colour others by, Drawing in progress, Live drawing line, Cursors, Names.
2. **Only mine:**
   - Greys out every other Display option, keeping their stored values; switching back restores them.
   - Note: "Off while Others' work is Only mine". Colleagues' cursors and live drawing are hidden as well (`CursorLayer`, `DraftLayer`).
3. **Toolbar chip:** "Hiding N colleagues' work" on the takeoff toolbar while Only mine is on; one click switches back to All.
4. **Drawing in progress = Off** greys out Live drawing line.
5. **Labels:**
   - The delete-protection section is labelled "Your account".
   - The Display options are stored on the person too (`user.collaboration_prefs`), so they get the same label; to be checked at build, and if any is per project it says "This project".
   - Files: `TakeoffSettingsDialog`, `SettingsCollaboration.tsx`.

**Fixtures to write later:** c39 and c40 rows for the grey-outs and the chip.

## Order

1. **D** first: small, and it settles the account labels.
2. **A1 and A2:** the bug and the tree.
3. **A3–A7 with E's merges.**
4. **C:** shares A6's points.
5. **B.**

About 37 paper hours.

## Questions (recommended answers first)

1. **F18's existing links (3 in Intelcost Team, incl. the 3D test original):** leave the rows as they are and read them through the new dialog, with no data migration (recommended, given D-232); or convert them into site members (a data migration on your projects, listed before it runs).
2. **The existing match-line site (1 in Intelcost Team):** convert its join to 2 point pairs in the A4 migration (recommended; the geometry stays the same), or keep match-line joins as their own kind.
3. **Scale tolerance on join:** 0.5 % (recommended: it catches a sheet calibrated about 1 % off its neighbours), or 1 %.
4. **GPS tolerances:** 0.10 ft horizontal, 0.05 ft vertical, scale within 0.02 % (recommended), or the values your machine-control contractor uses.
5. **Scraper starter:** add it now beside dozer push (recommended, so B4 compares all three), or dozer push only.
6. **Waste on site:** price it like a stockpile (load, on-site haul, spread; recommended), or as push-only with a dozer.

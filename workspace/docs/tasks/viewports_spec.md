# Sheet viewports: several scaled areas on one sheet (D-1408, SPEC ONLY)

**Status:** APPROVED with changes (D-1410, 2026-11-28): Q1 to Q4 answered in §13, full nesting allowed (§3, §4),
additions (a) and (b) in §5 and §6. Built in two runs: **Run A** (migration, models, routes, scoped recompute, per-shape
scale lookup in `_measure` / `sheet_items` / sub-items / deducts, the crossing flag, the `lib/takeoff` functions, QT
rows on both engines) and **Run B** (viewport tool, boxes, list, calibrate per viewport, tips, legend, Sheets tooltip,
paste rescale, print, read-on-load suggestions, smoke). Written by builder A, run 2026-12-05 (D-1408), from the code as
it is today (file:line below) and FEATURES.md's "Sheet viewports" Planned row.

## 1. The estimator's need
A civil or architectural sheet often prints several drawings at different scales: a plan at 1" = 30', an enlarged
detail at 1" = 10', a section at 1/4" = 1'-0". Today a sheet has exactly one scale, so the estimator either measures the
detail at the plan's scale (wrong quantities) or copies the page and calibrates the copy (two sheets, two sets of
markups, a confusing Sheets panel). They need to draw a box around each drawing on the sheet, give each box its own
scale, and have every measurement inside a box use that box's scale.

## 2. Today (one scale per sheet)
- **Storage:** `sheet_calibration` (api `app/features/drawing/models.py:224-265`), `UniqueConstraint(sheet_id)` at :232:
  one row per sheet with p1/p2 (page fractions), `real_distance_ft`, `feet_per_norm` (really feet per PDF point, D-51),
  `unit` ft/m, `label`, verify fields. No history table; undo is `restore_calibration`.
- **Writes:** `PUT .../calibration` (two-point, `drawing/routes.py:816`), `PUT .../scale` (preset, :837),
  `PUT .../calibration/restore` (undo/redo, the only clear, :855); each ends in `recompute_sheet`.
- **Quantities:** `takeoff_service.sheet_scales` (`takeoff/service.py:2714`) gives `{sheet_id: (feet_per_pt, page)}`;
  `_measure` (:2508-2553) and `drawing/service.py:sheet_items` (:172-206) multiply every shape on the sheet by it; an
  unscaled sheet gives quantity 0 and `is_stale` (count needs no scale).
- **App:** `feetPerPt = calibration.data?.feet_per_norm ?? 0` (`pages/ProjectTakeoff.tsx:1731`) is passed to the canvas
  (live quantities, labels, dimensions, hover panel, cursor tips D-1293), the legend's perimeter, copy/paste rescale,
  Resume's scale guard, sub-items, print, and every earthwork library (`{feetPerNorm, widthPt, heightPt}`).
  `lib/takeoff/quantity.ts:quantityFor` takes one feet-per-point. Snapping does not read the scale.
- **Read on load:** the printed-scale reader already finds several printed scales with their regions
  (`drawing/reading.py:ScaleRead.boxes`), but applies only one (`auto()`, :2234).

## 3. The model
- **A viewport** is a named rectangle on the sheet, in page fractions (x0, y0, x1, y1, axis-aligned in the page's own
  frame, rotation-proof as all geometry is), with its own calibration: the same fields as `sheet_calibration` today.
- **The sheet scale stays** and means "everywhere not inside a viewport". A sheet may have a sheet scale, viewports,
  both, or neither. Existing sheets keep exactly what they have: no data moves (see §9).
- **One table:** `sheet_calibration` loses its one-per-sheet constraint and gains `viewport_uuid` (null = the sheet
  scale). A new table `sheet_viewport` (uuid, sheet_id, name, box JSONB [x0,y0,x1,y1], sort, created_by, timestamps).
  Unique: one calibration per (sheet, viewport) and one null-viewport row per sheet (a partial unique index).
- **Overlap (D-1410 Q2):** a box may sit **fully inside** another (a detail drawn inside a plan's area); inside it, the
  inner box wins. Partial overlaps are refused on save ("Viewports can't partly overlap: move or resize Detail A, or
  put it fully inside Plan"). So every point still has one answer: the innermost box that holds it.

## 4. Which scale a shape takes
- **The rule:** a shape takes the scale of the **innermost** viewport that contains **all** of its points (an arc's or
  circle's extent included). None contains it: the sheet scale. A shape inside a plan box that also reaches into a
  nested detail box is a crossing shape (some of its points are in the detail, some only in the plan). A count mark: the viewport its point sits in (counts need no
  scale, but a count's size readout does).
- **The shape records it:** `takeoff_geometry.viewport_uuid` (null = sheet scale) is written when the shape is saved
  and re-derived when a shape moves, is reshaped, or a viewport's box changes. The api derives it (one function in
  `takeoff/quantity.py`, the same in `lib/takeoff`), so both engines agree; the quantity table checks them.
- **Crossing a viewport edge** (some points inside, some out, or in two viewports): the shape is **flagged**, not
  split. It is measured at the sheet scale if there is one, else counted 0 and stale, like an unscaled shape today.
  The flag shows on the shape (an amber edge), in its hover panel ("Crosses Detail A's edge: measured at the sheet
  scale"), on the item's row ("1 shape crosses a viewport") and in the Estimating unscaled list. While drawing, the
  live quantity says the same as soon as the pointer leaves the box the first point was in.
- **Why not split at the edge:** a detail and the plan show the same object twice at different scales; adding the two
  halves would double count or mix scales. The estimator decides; the flag makes it visible.

## 5. Measuring, snapping, legends, quantities
- **Measuring:** the draft takes the viewport of its first point; the cursor tip, live quantity, dimension tool and
  hover panel read that viewport's scale. "Sheet not scaled" (cursorTip.ts:124) becomes "Not scaled here" when the
  cursor is outside every calibrated viewport and the sheet has no sheet scale.
- **Calibrate inside a viewport:** the Calibrate tool and the Scale menu act on the viewport under the first click
  (or the one selected in the Viewports list); outside every viewport they act on the sheet scale, as today. Undo and
  redo per viewport (the restore route gains `viewport_uuid`).
- **Snapping:** unchanged; snapping works in page points and never reads the scale. A snap across a viewport edge is
  allowed; the result is flagged as in §4.
- **Legends:** one card per sheet as today; each row's quantity is the item's total on the sheet, each shape at its
  own viewport's scale. With viewports present, a row whose shapes sit in more than one scale shows the scales in its
  tooltip ("Plan 1" = 30' · Detail A 1" = 10'"). A crossing shape's item carries the amber mark.
- **Quantities:** `sheet_scales` becomes `{(sheet_id, viewport_uuid|None): (feet_per_pt, page)}`; `_measure`,
  `sheet_items` and `area_on_sheet` look a shape's scale up by its `viewport_uuid`. Deducts clip against positives of
  the same viewport only (a deduct in another viewport is flagged). Sub-items, Estimating, exports and Excel read the
  stored quantities and need no change.
- **Copy and paste:** a shape pasted into another viewport is rescaled from its source viewport's scale to the
  target's, as paste between sheets does today (ProjectTakeoff.tsx:3086-3122).
- **Earthwork:** contours, spots, boundary, Site Features, strips, utilities, links and site joins keep using one
  frame. They take the **sheet scale**; a sheet with viewports but no sheet scale shows Sitework's "Set the sheet's
  scale first" as an unscaled sheet does today. Grading inside a detail viewport is out of scope (§10).
- **Print:** draws each viewport's box and label.
- **GPS Export (D-1410 addition b):** reads the sheet scale only and **leaves out every shape inside a viewport**, and
  says so in its dialog and in the export's notes: "n shapes in viewports not exported".
- **A new viewport over shapes already drawn (D-1410 addition a):** creating a viewport (or moving or resizing one)
  re-derives the viewport of every shape it now holds, and the api answers with each touched item's quantity before
  and after. The app shows that list ("Pipe A: 240.0 LF → 80.0 LF") and the whole change (the box and every re-derived
  shape) is one undo step. Run A builds the scoped re-derive and its before/after answer; Run B the dialog and undo.

## 6. UI
- **Sheets panel:** the ruler icon's tooltip lists every scale ("Sheet 1" = 30' · Detail A 1" = 10' · Section B
  1/4" = 1'-0""); the icon is amber when some viewport has no scale.
- **Viewport tool** (Scale group, beside Scale and Dimension): drag a rectangle; a small popover asks its name
  (default "Viewport 1") and offers "Set its scale" (the preset menu, or Calibrate inside it). Boxes are drawn as a
  thin dashed outline with the name and scale in a corner tag, hidden with Markups.
- **Viewports list** (from the Scale menu, "Viewports on this sheet"): name, scale, shapes inside; rename, rescale,
  show, delete. Delete asks first; its shapes fall back to the sheet scale (or unscaled), with the quantities shown
  before and after.
- **Moving or resizing a box** re-derives its shapes' viewports and recomputes; shapes that now cross are flagged; the
  change is one undo step.
- **Read on load:** when the reader finds several printed scales with regions, it offers them as suggested viewports
  ("3 scales found: create Plan, Detail A, Detail B?") instead of applying one; nothing is created without a click.
- Viewer and guest seats see the boxes and scales, read only.

## 7. API
- `GET/POST/PATCH/DELETE .../drawing/sheet/{uuid}/viewport[/{vp}]` (name, box, sort); overlap refused 422.
- The calibration routes gain an optional `viewport_uuid` (body or query); absent = the sheet scale (today's calls are
  unchanged). `SheetRead` gains `viewports: [{uuid, name, box, has_calibration, calibration_label}]`.
- A box change or a viewport's scale change recomputes only the shapes it touches (`recompute_sheet` scoped).
- Realtime: `drawing.viewport.changed` so open tabs redraw.

## 8. Items crossing a viewport (summary)
Flagged, never split; measured at the sheet scale if any, else 0 and stale; shown on the shape, its hover panel, its
item row, the legend row and Estimating's unscaled list; cleared when the shape is moved fully inside one box or the box
is resized to hold it.

## 9. Migration (migration before code, D-1252)
- Create `sheet_viewport`; add `sheet_calibration.viewport_uuid` (nullable) and `takeoff_geometry.viewport_uuid`
  (nullable, indexed); drop the `UniqueConstraint(sheet_id)` and add the partial unique indexes of §3.
- **No data changes:** every existing calibration stays the sheet scale (viewport null), every shape stays null, so
  every quantity is the same to the cent. The before/after compare runs the founder fingerprint and the quantity table
  (every row equal). Nothing in the founder's projects changes.
- Downgrade refused while any viewport exists (it would lose scales); otherwise it drops the columns and table.

## 10. Out of scope (later, if asked)
Rotated or non-rectangular viewports; earthwork in a viewport (a detail's own grading); a shape split at a viewport
edge; one viewport spanning two sheets; auto-assigning existing shapes to suggested viewports.

## 11. Proof when built
- Quantity table rows (both engines, hand-worked): a line, an area with a deduct and a count inside a 1" = 10'
  viewport on a 1" = 30' sheet; the same shapes at the sheet scale; a crossing shape (flagged, sheet scale); a sheet
  with viewports and no sheet scale (outside = 0, stale); a box moved so a shape crosses; delete a viewport (falls back).
- Smoke on a throwaway copy: draw two viewports, calibrate each, measure in each, see the legend, the tooltip, the
  crossing flag and the Estimating figures; undo a calibration in one viewport.

## 12. Hours (one builder, with gates, QT rows and a smoke)
| Part | Hours |
|---|---|
| Migration and models, schemas, routes, scoped recompute, realtime (api) | 7 |
| Scale lookup per shape in `_measure`, `sheet_items`, sub-items, deducts by viewport, crossing flag (api) | 6 |
| `lib/takeoff`: viewport of a shape, crossing test, scale per shape in `quantityFor` callers (app, pure) | 4 |
| Viewport tool, boxes on the canvas, list, calibrate/Scale menu per viewport, undo (app) | 9 |
| Cursor tips, live quantity, hover panel, legend tooltip, Sheets panel tooltip, paste rescale, print (app) | 6 |
| Read-on-load suggestions as viewports | 3 |
| Quantity table rows, smoke, report | 4 |
| **Total** | **39 h** (about 5 working days; two night runs) |

## 13. The founder's answers (D-1410)
1. Crossing shapes: **flag them** and measure at the sheet scale (else 0 and stale), as written.
2. Overlapping viewports: **full nesting allowed**, the inner box wins inside it; **partial overlaps refused**.
3. Earthwork inside a detail viewport: **out of scope**, as written.
4. Read on load: **offer** the found scales as viewports, **never auto-create**, as written.
Added: (a) a new viewport re-derives the shapes already inside it, with before/after quantities and one undo step;
(b) GPS Export leaves out shapes inside viewports and says "n shapes in viewports not exported".

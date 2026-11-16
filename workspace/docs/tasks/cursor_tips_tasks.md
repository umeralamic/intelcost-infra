# Cursor tips while measuring, and the sheets panel's scale icon (D-1293)

The founder's request (morning-report-2026-11-19/BRIEF.md, added 2026-11-16 ~07:50 UTC, and the coordinator's
addition the same morning). Wording and look are our own (hard rule 9); colours from tokens (rule 4).

## Part 1: cursor tips

While Linear, Segment, Area or Count is measuring an item, a small tip beside the pointer shows the tool's icon,
what the next click does, and the run so far, read at the snapped or Ortho point the click would land on.

| Tool | Prompt (ours) | Value boxes |
|---|---|---|
| Linear, Point to Point | "Click to start the run", then "Click to add a point, double-click to finish"; with an A-arc "Click a point on the arc" / "Click the arc's end" | `segment · total`, e.g. `6'-3" · total 16'-3"` |
| Linear, Rectangle / Ellipse / Arc | "Click the first corner" / "Click the opposite corner"; Arc: start, a point on the arc, end | the shape's length |
| Segment | "Click the segment's start" / "Click the segment's end" | the segment's length |
| Area, Point to Point | "Click the first corner", "Click the next corner", then "…, double-click to close" | `Perimeter …` (the run so far) and `Area … SF` (closed back to the first point) |
| Area, Rectangle / Ellipse | first / opposite corner | perimeter and area of the shape |
| Count | "Click to place" | the marks the count in hand has on this sheet, none before this session's first |

- A sheet with no scale: "Sheet not scaled" in place of a length or area (Count keeps its number).
- Lengths read as the Dimension tool's (`formatFeetInches`, `formatMeters`); areas as the panel's (`formatDisplayQuantity`,
  Settings › General's places). Metric with a metric scale or a metric project, as the Dimension tool.
- Hidden: no measure tool, a pick (link, coordinate, join, overlay), an earthwork tool, while the sheet pans, under a
  dialog or a menu, and off the sheet (over the panels).
- Performance: one fixed node owned by a ref; the pointer handler hands over the pointer and the pen; one
  requestAnimationFrame writes `transform` and `textContent`. No React state per move.
- Preference: Settings › Cursor › "Show cursor tips", on by default, in the per-device takeoff settings
  (`takeoff.settings.v1`, `cursor.tipShow`). No api field, no migration.

Files: `src/lib/takeoff/engine/cursorTip.ts` (pure, `cursorTipText`), `src/features/takeoff/components/CursorTip.tsx`
(the overlay), `SheetCanvas.tsx` (`tip` prop, `handleMove`, the overlay), `ProjectTakeoff.tsx` (`cursorTip`: when, and
Count's figure), `settings.ts` and `TakeoffSettingsDialog.tsx` (the preference). Quantity table:
`intelcost-infra/browser/lib/tip-cases.mjs` (13 rows).

## Part 2: the sheets panel's scale icon

The scale's words (`1" = 30'`) took the sheet name's room on every row. A scaled sheet now shows a small ruler
(lucide `Ruler`, the app's icon set); hovering or focusing it shows the scale in a tip, as it read before (with the
half-size note where there is one). No icon on a sheet with no scale; a "Check scale" flag stays as it was. Under the
pointer the row's hover buttons cover its end, as they cover the hidden-markups eye (D-1175), and carry the focusable
ruler whose tip reads the scale.

Files: `src/components/ui/tooltip.tsx` (new: the app had no tooltip component; a portalled one-line tip on hover and
focus, Escape hides it), `src/features/takeoff/sheets/SheetsPanel.tsx`.

Legacy (`SheetTree.tsx` `SheetStatusChips`) shows the scale as a text chip, as we did; the change is the founder's.

## Left

- The archived fixture `f5-s13.mjs` reads the chip's text (`[data-scale-chip]` innerText); the attribute now carries
  the scale as its value. Its next restore needs that line read from the attribute.

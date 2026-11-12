# F40: Saved dimensions, and split view drawing what the main view draws

> **Adopted 2026-11-12 (D-1196)** with the founder's three answers, as proposed: everyone on the project sees a
> dimension, anyone who may annotate moves or deletes it (the markups' rule), and it prints with the sheet when
> markups print.

## The problem

- **Dimensions vanish.** The Dimension tool's lines live only in the open sheet's canvas (round 3 B11, legacy's
  "a check, never saved"): a sheet switch, a reload or another session loses them, and a colleague never sees them.
- **Split view draws a different sheet.** The Reference pane hands every item to the plain takeoff drawing: contours
  come out as thick lines and boundaries as filled areas in their item colours, and it draws no overlays and no
  dimensions (the founder's C-200 screenshot of 2026-11-11).

**Problem → solution.** Dimensions are saved with their sheet and drawn wherever the sheet is drawn; the Reference
pane draws the sheet as the main view does, view-only.

## The design

### A dimension is a markup

`sheet_markup` already stores every annotation kind in one table, with its style, live events, undo, print, guest
reads and the annotations permission. Its `kind` is a 32-character string checked only by the schema's `Literal`, so a
new kind needs **no migration**.

- **Kind** `dimension`. **Geometry** `{x1, y1, x2, y2}` in page fractions (0..1), as the canvas's
  `PlacedDimension` holds them now. **Style**: none stored; every dimension is drawn in the Dimension settings' style
  as it is now (`useDimensionStyle`), as before F40 (changed at build: one look for all of a sheet's dimensions, and
  print reads the same settings).
- **Text**: none stored. The length is worked out on the sheet's scale when drawn, so a rescaled sheet reads its new
  length (as the canvas does now).
- **Permission:** the markups' (`canUseAnnotations`), the same gate the Dimension tool already has.

### Blocks

| Block | What | Where |
|---|---|---|
| **1. api** | `dimension` in `MarkupKind`; geometry validated (four finite numbers, 0..1, the two ends apart); the guest and print reads include it. | `features/markup/schemas.py`, its service's checks |
| **2. Saved in the main view** | The canvas's dimension state becomes the sheet's dimension markups: drawn → created (optimistic, `client_uuid`), dragged or stretched → one update on release, Delete and the action bar's Delete → deleted, each an undo and redo step through the markups' history; colleagues see them live. `undoDimension` (the action bar's Undo while the tool is armed) deletes the last one this session drew. Existing selection, drag and stretch kept. | `SheetCanvas.tsx` (dimension state), `DimensionLayer`, `ProjectTakeoff.tsx` (markups query and writes) |
| **3. Print** | `renderSheetForPrint` draws the sheet's dimensions with its markups. | `print/printSheets` |
| **4. Split view** | The Reference pane: items without the earthwork inputs, the inputs through the Earthwork layer (the main view's runs, colours, widths and grade fills), the sheet's overlays at their colour and opacity, its markups and its dimensions on its own scale; view-only, its Show markups toggle hiding them all. | `split/ReferencePane.tsx`, `EarthworkLayer`, the overlay layer |
| **5. Checks** | The smoke below; the quantity table (no quantity moves); the gates. | |

### Out of scope

- A dimension's own Properties panel (its style follows the Dimension settings, as now).
- Dimensions in Estimating or any export other than print.
- Measuring along a run (a dimension is two points).

## Acceptance (the smoke, through the Playwright MCP, a throwaway account)

1. Draw two dimensions on a sheet; reload: both are there, same ends, same lengths.
2. Switch sheets and back: both are there. A second session on the project sees them, and sees a third one appear.
3. Drag one by its line and stretch the other's end; reload: the moved ones hold. Ctrl+Z puts the stretch back,
   Ctrl+Y redoes it.
4. Select one, Delete: gone after a reload; Ctrl+Z brings it back.
5. Rescale the sheet: the lengths read on the new scale.
6. Split view on the same sheet: the dimensions, the overlays and the earthwork inputs drawn as in the main view
   (contours thin in the Earthwork colours, the boundary not filled), view-only.
7. A Viewer seat sees the dimensions and cannot select, move or delete one.
8. Print the sheet with markups: the dimensions print.

## Estimate

About a day: Block 1 an hour, Block 2 three to four hours, Block 3 an hour, Block 4 two to three hours, the checks an
hour.

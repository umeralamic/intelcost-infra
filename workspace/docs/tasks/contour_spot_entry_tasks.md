# F41: Contour and spot entry: the entry chip, the dialogs, TC spots

> **Adopted 2026-11-12 (D-1206)**, the founder's brief; this spec is the one D-1206 asks for before Part C's code (it
> moves cut and fill). Part D (report only) is done: D-1208.

## The problem

- **The toolbar carries entry state that only matters while drawing.** The Proposed/Existing toggle and the +/−
  interval stepper sit in the Sitework row all the time, crowd it, and are far from the sheet where the estimator is
  looking when the next elevation matters.
- **Spot Elev. arms straight away** with no choice of surface, no way to read the value off the drawing, and no idea
  what the number means (top of pavement, finished grade, top of curb).
- **A TC spot is taken at face value.** "TC 12.30" is the top of the curb; the pavement beside it is 6 in lower. Used
  as pavement level it raises the proposed grade and moves cut and fill (D-1208 found none on the test projects; the
  rule must hold before one appears).

**Problem → solution.** The entry state moves to a chip on the sheet while Contour or Spot Elev. is on; both tools
open a dialog first; a spot carries its label type, and a TC spot is converted to pavement level unless a G spot sits
beside it.

## Part A: the chip and the Contour dialog

- The surface toggle and the interval stepper leave the Sitework toolbar.
- While Contour or Spot Elev. is on, a chip on the sheet (top left of the canvas) reads
  **"Existing · next 12.0 · +1 ft"**: the surface, the next elevation the popover will pre-fill (blank: "next —"),
  the direction and the interval. Hidden when the tool is off.
- Keys while the tool is on and no field has focus: **E** / **P** switch the surface; **+** / **−** set the direction
  up / down; **a digit** starts typing the next elevation in the chip (Enter keeps it, Esc drops it).
- A click on the chip opens its editor: surface, next elevation, interval (ft), direction.
- The **Contour dialog** adds **First elevation** (blank: asked on the first contour, as now) and **Direction**
  (up / down), and shows "ft" after Interval. Starting sets the chip's surface, interval, direction and next.
- The next elevation after a contour is saved is the last one ± the interval, as now (`nextElevation`); a typed next
  is used once.

## Part B: the Spot Elev. dialog

- Spot Elev. opens a dialog like Contour's; the tool stays on until Esc.
- **Surface:** Existing / Proposed.
- **Input:** *Type each value* (the popover per click, as now) or *Pick the label on the drawing*: the click reads the
  elevation text under it on a vector sheet and places the spot there with that value, no popover. Greyed with
  "This sheet has no vector text" on a scan.
- **Label type** (a proposed spot): TP, FG, G, TC, FFE. A picked label's own prefix wins ("TC 12.30" is a TC spot
  whatever was chosen).

## Part C: TC spots

- A spot keeps its label type and printed value in `shape_meta` (`label`, `curb_in`); no migration. Its stored
  `elevation` stays the printed value, so the drawing's own number is never lost.
- **A TC spot is used at pavement level:** printed − curb height (default 6 in, editable on the spot): "TC 12.30" at
  6 in is used at 11.80. The spot's label reads "TC 12.30 → 11.80".
- **The TC/G pair rule:** where a G spot (same surface) lies within 3 ft of a TC spot, the G spot is used and the TC is
  not (the same curb; no duplicate point). The TC spot stays drawn, its label reads "TC 12.30 (G used)".
- Applied in `takeoff-core` (data in, data out): `sheetRuns` gives a TC spot its used elevation; `collectTinInputs`
  drops a paired TC. Every view (the TIN, 3D, the elevation check, GPS export) reads the run's used elevation.
- **Quantity-table rows:** a paving area graded by four TC spots at 12.30 with a 6 in curb gives a proposed surface at
  11.80; the same with a G spot at 11.70 within 3 ft of one TC uses 11.70 there and drops that TC.

## Blocks

| Block | What | Where |
|---|---|---|
| 1. Core | Spot label and curb on `SurfaceRun`; TC used elevation; the pair rule in `collectTinInputs` (frame for feet) | `lib/takeoff/earthwork/surfaces.ts`, `tin/collect.ts`, `tin/index.ts` |
| 2. Spot dialog | Surface, input mode, label type; pick from the vector text; prefix read | `earthwork/SpotDialog.tsx`, `useEarthwork.tsx` |
| 3. Chip | The chip, its keys and editor; the toolbar loses the toggle and stepper; Contour dialog's First elevation and Direction | `earthwork/EntryChip.tsx`, `EarthworkToolbar.tsx`, `ContourDialog.tsx`, `useEarthwork.tsx` |
| 4. Labels | A spot's label with its type and used value | `TinLayer.tsx` / the run label |
| 5. Checks | Quantity-table rows; gates; the smoke | `intelcost-infra` |

## Out of scope

- Converting existing founder data (D-232, D-1208: report only).
- Label types on existing spots (they read as untyped, used as stored).

## Acceptance (the smoke, a throwaway account)

1. Contour: the dialog takes First elevation 100, Direction down, Interval 2; the chip reads "Existing · next 100.0 ·
   −2 ft"; the first contour pre-fills 100, the next 98. P switches the chip to Proposed; typing 50 sets next 50.
2. The toolbar has no surface toggle or interval stepper; the chip hides when the tool is off.
3. Spot Elev.: the dialog with Proposed, Type, label TC; a spot typed 12.30 reads "TC 12.30 → 11.80".
4. Pick on a vector sheet: a click on printed "TC 12.30" places a TC spot at 12.30 used 11.80; on a scan Pick is greyed.
5. A G spot at 11.70 placed 2 ft from that TC: the TC reads "(G used)"; Calculate moves accordingly.
6. The quantity table passes with the new rows.

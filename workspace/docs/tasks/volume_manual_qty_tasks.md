# F22 — Convert to volume and Manual quantity (D-360)

_Picked up 2026-10-11 on Umer's request. Decision: D-360._

## Problem

An estimator measuring a footing, a trench or a slab needs cubic yards, and today an item can
only end in LF, SF or EA: the volume is worked out by hand off the takeoff. And when the drawn
quantity is not the number to carry (an allowance, a figure off a schedule), the only way in is
the row menu's override, not the dialog where the item is named.

## Solution

| # | What | Where |
|---|------|-------|
| 1 | **Convert to volume** under "This measurement", after the slope factor and the height. A run (Linear, Segment): Width and Depth, each typed as a length (`2'-0"` or `1.5`). An area: Depth. Both values above zero, or Create stays disabled | app `features/takeoff/items/MeasurementDialog.tsx` |
| 2 | Quantity in **CY**: run = length × width × depth ÷ 27; area = area × depth ÷ 27. The slope factor applies first (a sloped slab's area, a sloped run's length). Volume and "Convert to area using a height" exclude each other, as height and slope already do | api `takeoff/quantity.py` `apply_modifiers`; app engine twin |
| 3 | Stored on the item: `volume_width_ft`, `volume_width_raw` (runs only), `volume_depth_ft`, `volume_depth_raw`. Depth set is what turns volume on. The unit follows: `CY` | api migration, `models.py`, `schemas.py`, `service.py` (validation beside height and pitch), `naming.unit_for` |
| 4 | The app labels a volume item CY wherever it labels a height item SF (rows, hover, quantity panel, Estimating, the export) | app `lib/takeoff/engine/calibration.ts` `effectiveTypeFor` and its callers |
| 5 | **Manual quantity** under "This measurement", above Rough measurement, on all four tools (Linear, Segment, Area, Count): a tick and a number in the item's unit. On Create or Save it writes the item's existing override (`PUT …/item/{uuid}/quantity`, reason "Manual quantity"); unticked on an item that had one clears it. The drawn geometry stays, so unticking brings the measured quantity back | app dialog, `pages/ProjectTakeoff.tsx` |
| 6 | Copies, duplicates and assemblies carry the volume fields as they carry the height | api copy paths |
| 7 | The quantity table gains volume rows on both engines, with hand-worked answers | `intelcost-infra` quantity table cases |

## Out of scope

Metric (CM). A volume on a count. Width or depth from a named dimension.

## Check

Gates; quantity table; one smoke through the Playwright MCP: a Linear item with volume
(width 2', depth 1') drawn 27 ft long reads 2.00 CY; an Area item 10 × 27 ft with depth 1' reads
10.00 CY; a Count with Manual quantity 12 reads 12 EA.

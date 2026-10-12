# Metric Phases D and E — plan (overnight 2026-10-12, Step 7)

Phases A–C shipped tonight (D-374 to D-376): the setting, display, entry. Storage stays imperial
everywhere. This plan covers the two phases left: **D**, Estimating, the export and every unit
rate; **E**, sub-item formulas. Both follow one rule: **a figure is stored per imperial unit and
converted only where it is shown or typed.**

## The one conversion for rates

A rate is money (or hours) **per unit**. A quantity converts by `f` (LF → m: × 0.3048), so its rate
converts by `1 / f`:

| Stored | Shown in metric | Typed in metric → stored |
|---|---|---|
| $5.00 / SF | 5.00 ÷ 0.09290304 = **$53.82 / m²** | $54 / m² → 54 × 0.09290304 = **$5.016764 / SF** (full precision) |
| 0.25 MH / LF | 0.25 ÷ 0.3048 = **0.8202 MH / m** | 0.82 MH / m → 0.249936 MH / LF |
| 10 LF / hr (output) | 10 × 0.3048 = **3.048 m / hr** | 3 m / hr → 9.8425 LF / hr |

An extended total is `stored quantity × stored rate`. Neither changes with the system, so **every
total is identical in both systems to the cent**: nothing is recomputed from shown figures. Toggling
writes nothing. A rate is written only when a person types one, and then once, at full precision.

`f` comes from `lib/measure.ts` `metricFactor(unit)`, the line's own stored unit, so a row in EA, LS,
HR, % or a weight has `f = null` and is shown and typed as stored. A row already in a metric unit (an
earthwork line on a metric sheet: BCM, M²) also has `f = null`.

## Phase D — Estimating, export, rates (Step 8: built and committed only if every total matches)

### Rates per unit (shown ÷ f, typed × f)

| Field | Per | Where shown and typed |
|---|---|---|
| `unit_man_hours` | hours per unit | Estimating grid "Unit Man Hours" (`EstimatingView.tsx` `RateCell`), Set values, Item costs, sub-item edit, sub-items editor cost cells, assembly template costs |
| `unit_material_cost` | money per unit | the same places |
| `unit_equipment_cost` | money per unit | the same places |
| Cost component `unit_price` (material) | money per component unit | `ComponentDialog.tsx` |
| Cost component `unit_rate` (subcontract by unit) | money per component unit | `ComponentDialog.tsx` |
| Cost component `production_rate` (labour, "units / hr", "units / crew-day") | **units per time: × f, not ÷ f** | `ComponentDialog.tsx`, `CrewRows.tsx` |

**Not per unit, unaffected:** `hourly_wage`, `equipment_cost` (a total), `subcontract_cost` (a lump),
quote amounts, mob/demob, equipment hourly/daily rates, lump sums, wastage %, multipliers, bid
markups.

### Quantities and units

- Grid "Qty", "Qty with Wastage" and "Total Qty" are shown × f, at 2 decimals. "Unit" is shown through
  `displayUnit` (m, m², m³, BCM…). Item names go through `displayName`, and Estimating's names read
  back typed lengths as typed (closing Step 6's Estimating check).
- The Unit picker on a row (`RowDialogs`, `SubItemEditDialog`, the grid's unit cell) shows metric
  labels for the convertible imperial codes and stores the code. Picking "m" stores LF.
- `QuantityPopover.tsx` (how the quantity is derived) shows its figures through `displayQuantity` /
  `formatMetricLength`.
- `ComponentDialog` host quantity ("Host quantity (net): N {unit}") is shown in metric.

### Excel export (`lib/estimate/workbook.ts`)

- Quantity cells: the shown figure (stored × f) at full precision. Rate cells: stored ÷ f. Unit cells:
  the metric label. With formulas on, `=Qty × Rate` gives (q·f)(r/f) = q·r, equal to the imperial
  export's product to within 1e-12, so every total rounds to the same cent. Totals written as values
  are the stored totals.
- The Dimensions sheet: values in metres with unit "m" (D-376 2's read-back), not "FT".
- The Bid Summary sheet is money only and needs no change.

### Quantity-table rows (both engines where both compute; the app's `lib/estimate` otherwise)

1. $5.00/SF on 1,000 SF: shown $53.82/m² on 92.90 m²; total $5,000.00 both ways.
2. Typed $54/m² → stored 5.016764/SF; total on 1,000 SF = $5,016.76.
3. 0.25 MH/LF × 400 LF = 100 MH both ways; shown 0.8202 MH/m × 121.92 m.
4. A labour component at 10 LF/hr on 400 LF = 40 h; shown 3.048 m/hr on 121.92 m = 40 h.
5. EA, LS and BCM rows: f = null, shown as stored.
6. The export of a priced line: each money cell equal in both systems to the cent.

### Browser check (Step 8)

On a priced throwaway project: record every extended total and the bid total in Imperial; switch to
Metric; every total must match to the cent; switch back; every stored rate is byte-identical (read
from the api). Export in both systems and compare every money cell. **Commit only if all of that
holds; otherwise stash `overnight-metric-phase-d` and report what differed.**

## Phase E — sub-item formulas (merged 2026-10-12 as D-378: each formula is read in the system it was written in)

### Evaluation in the project's units

Formulas evaluate in **both engines**: the app's `lib/takeoff/subItems/formula.ts` (the editor's
preview) and the api's `takeoff/formula.py` + `sub_items.py` (what is stored on recompute). In a metric
project:

1. **Inputs in metric:** `PARENT` = the parent's effective quantity × f(parent unit) (m, m², m³, EA);
   `LINEAR` / `PERIMETER` × 0.3048; `AREA` and its siblings × 0.09290304; named dimensions `{dim:dN}`
   in metres; `{qty:…@UNIT}` tokens already carry explicit units and convert as they do today.
   Variables keep their own stated unit (a variable in FT is converted like a dimension).
2. **Result back to imperial storage:** the sub-item's stored unit decides it: a result in m for a
   sub-item stored in LF is ÷ 0.3048; m² ÷ 0.09290304; m³ for CY ÷ 0.764554857984; EA / LS / anything
   without a metric form is stored as computed.
3. **Imperial projects are byte-identical:** the conversion is skipped entirely (f = 1 is not
   multiplied in; the code path is not taken), and the quantity table's 34 sub-item rows must stay
   exactly as they are.

The api needs the project's `unit_system` in `sub_items.recompute` (read from the project row).
Both engines take a `unitSystem` on the env.

### Assembly templates: a unit-system tag

- `assembly_template.unit_system` (`imperial` default; every existing template is imperial). A
  template saved from a metric project is tagged metric.
- Applying a template to a project of the other system shows a warning that names **each formula
  that contains a numeric constant** (`PARENT * 0.5`, `PARENT / 2`, `{dim:d1} * 1.2`), because a
  constant cannot be converted automatically (0.5 m is not 0.5 ft). Formulas made only of tokens
  convert themselves and are not listed.

### Quantity-table rows (both engines, Phase E)

1. `PARENT * 0.5`, parent 100 LF, metric: PARENT = 30.48 m, result 15.24 m, stored 50 LF (= the
   imperial result: a pure scale factor is system-neutral).
2. `PARENT / 2`: the same, 50 LF.
3. `PARENT + 1` (a constant **added**), parent 100 LF: metric 30.48 + 1 = 31.48 m → stored 103.2808
   LF. Imperial is 101 LF. This is the row that shows why constants warn.
4. `{dim:d1} * PARENT`, d1 = 2 ft (0.6096 m), parent 100 SF (9.290304 m²): metric 5.6634 m³ → stored
   200 CF for a sub-item in CF. A named dimension converts.
5. `PARENT * 2^2` (^ before *, D-251): 400 LF both ways for a scale factor.
6. A cross-system template apply: an imperial template with `PARENT * 0.5` and `PARENT + 1` applied
   to a metric project → the warning lists only `PARENT + 1`.
7. Every one of the existing 34 sub-item rows, unchanged, in an imperial project.

## Questions for the founder

1. **A sub-item's unit in a metric project.** This plan shows a metric label (m) and stores the
   imperial code (LF), as Phase C does for manual quantities. The alternative is to store the metric
   unit itself (M), which keeps the formula's result as typed but puts metric units in storage. Which?
2. **Wastage per unit** (the Wastage dialog keys by unit code). Stay keyed by the stored code, shown with
   metric labels? (Recommended: yes.)
3. **A constant in a formula** (`PARENT + 1`) means a different thing in each system. Is the warning on
   apply enough, or should a metric project refuse an imperial template whose formulas add constants
   until they are reviewed?
4. **Variables** carry their own unit. Should a workspace variable typed in FT be offered to a metric
   project's formulas in metres (converted), or as it is?
5. **Earthwork in a metric project with imperial sheets:** Calculate still stores lines in the sheet's
   unit (CY). Should a metric project make Calculate store BCM (a storage change), or keep CY and show
   BCM (the display-only rule)? This plan keeps CY.

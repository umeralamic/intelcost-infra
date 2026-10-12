// The shared table's metric rows (D-375, D-376): what a metric project shows for a stored quantity,
// and what it stores and reads back for a length typed in it. Storage stays imperial: every row
// checks a figure in feet, SF or CY against its metric reading, worked by hand from 1 ft = 0.3048 m.

const M = 0.3048;

/** Typed in a metric project: the feet stored, the text read back (D-376 2). */
export const ENTRY_CASES = [
  { id: "entry-150mm", raw: "150 mm", feet: 150 / 304.8, readback: "150 mm" },
  { id: "entry-2.5m", raw: "2.5 m", feet: 2.5 / M, readback: "2.50 m" },
  { id: "entry-1200mm", raw: "1200 mm", feet: 1200 / 304.8, readback: "1200 mm" },
  { id: "entry-0.3m", raw: "0.3 m", feet: 0.3 / M, readback: "300 mm" },
  // Imperial typed in a metric project: read in feet, read back in metres (2.286 m).
  // Under 1 m reads in whole mm however typed (day run Block 2): 4" = 101.6 mm → "102 mm".
  { id: "entry-4in", raw: '4"', feet: 4 / 12, readback: "102 mm" },
  { id: "entry-imperial-7-6", raw: `7' - 6"`, feet: 7.5, readback: "2.29 m" },
  // A bare number is metres in a metric project.
  { id: "entry-bare-metres", raw: "2.5", feet: 2.5 / M, readback: "2.50 m" },
  { id: "entry-25cm", raw: "25 cm", feet: 25 / 30.48, readback: "250 mm" },
  // The zero rule holds in metric: zero is zero.
  { id: "entry-zero-mm", raw: "0 mm", feet: 0, readback: "0 mm", zero: true },
];

/** A stored quantity shown in a metric project (D-375 1). */
export const DISPLAY_CASES = [
  { id: "show-lf", value: 100, unit: "LF", shown: 100 * M, label: "m" },
  { id: "show-sf", value: 1000, unit: "SF", shown: 1000 * M * M, label: "m²" },
  { id: "show-sy", value: 9, unit: "SY", shown: 9 * 9 * M * M, label: "m²" },
  { id: "show-cy", value: 27, unit: "CY", shown: 27 * 27 * M * M * M, label: "m³" },
  { id: "show-bcy", value: 12, unit: "BCY", shown: 12 * 27 * M * M * M, label: "BCM" },
  { id: "show-ea", value: 5, unit: "EA", shown: 5, label: "EA" },
  // Already metric (an earthwork line calculated on a metric sheet): shown as stored, never twice.
  { id: "show-bcm-as-is", value: 3, unit: "BCM", shown: 3, label: "BCM" },
];

/** Sub-item formulas in a metric project (metric Phase E): inputs in metric, the result stored in the
 *  sub-item's imperial unit. Both engines (inSystem.ts, formula_system.py). `expect` is the stored
 *  figure, worked by hand. */
export const FORMULA_SYSTEM_CASES = [
  // A pure scale is system-neutral: 100 LF = 30.48 m, × 0.5 = 15.24 m = 50 LF.
  { id: "fx-half", formula: "PARENT * 0.5", parent: 100, parentUnit: "LF", resultUnit: "LF", system: "metric", expect: 50 },
  { id: "fx-divide", formula: "PARENT / 2", parent: 100, parentUnit: "LF", resultUnit: "LF", system: "metric", expect: 50 },
  // A constant added is not: 30.48 + 1 = 31.48 m = 103.2808… LF (imperial reads 101).
  { id: "fx-plus-one", formula: "PARENT + 1", parent: 100, parentUnit: "LF", resultUnit: "LF", system: "metric", expect: 31.48 / M },
  // The same formula written in imperial reads 101 in any project: the formula's system decides,
  // never the project's, so a switch never moves it.
  { id: "fx-plus-one-imperial", formula: "PARENT + 1", parent: 100, parentUnit: "LF", resultUnit: "LF", system: "imperial", expect: 101 },
  // A named dimension converts: 2 ft = 0.6096 m × 9.290304 m² = 5.6634… m³ = 200 CF.
  { id: "fx-dim", formula: "{dim:d1} * PARENT", parent: 100, parentUnit: "SF", resultUnit: "CF", dims: { d1: 2 }, system: "metric", expect: 200 },
  // ^ before * (D-251): 30.48 × 4 = 121.92 m = 400 LF.
  { id: "fx-power", formula: "PARENT * 2^2", parent: 100, parentUnit: "LF", resultUnit: "LF", system: "metric", expect: 400 },
  // A sub-item in EA takes its figure as computed (no metric form): 30.48 m / 2 = 15.24 EA.
  // A sibling converts by its own unit, not the parent's: Edge 40 LF = 12.192 m, × 2 + 1 = 25.384 m
  // = 83.2808… LF (read with the parent's SF factor it would be 8.43 LF).
  { id: "fx-sibling", formula: "[Edge] * 2 + 1", parent: 100, parentUnit: "SF", resultUnit: "LF", subs: { edge: 40 }, subUnits: { edge: "LF" }, system: "metric", expect: 25.384 / M },
  // A rough measurement converts by its own unit: 100 LF = 30.48 m, + 1 = 31.48 m = 103.2808… LF.
  { id: "fx-ref", formula: "{ref:0f0e0d0c-0000-4000-8000-000000000001} + 1", parent: 50, parentUnit: "SF", resultUnit: "LF", refs: { "0f0e0d0c-0000-4000-8000-000000000001": 100 }, refUnits: { "0f0e0d0c-0000-4000-8000-000000000001": "LF" }, system: "metric", expect: 31.48 / M },
  // A sibling in EA has no metric form and is read as stored: 12 EA × 0.5 = 6, LF result = 6 m = 19.685… LF.
  { id: "fx-sibling-ea", formula: "[Posts] * 0.5", parent: 100, parentUnit: "LF", resultUnit: "LF", subs: { posts: 12 }, subUnits: { posts: "EA" }, system: "metric", expect: 6 / M },
  { id: "fx-ea-result", formula: "PARENT / 2", parent: 100, parentUnit: "LF", resultUnit: "EA", system: "metric", expect: 15.24 },
];

/** The cross-system apply's warning: only formulas that add or subtract a constant to something
 *  that varies (app only). A pure scale converts correctly and is not listed. */
export const CONSTANT_CASES = [
  {
    id: "fx-template-warning",
    rows: [
      { name: "Half", formula: "PARENT * 0.5" },
      { name: "Plus one", formula: "PARENT + 1" },
      { name: "Dim", formula: "{dim:d1} * PARENT" },
      { name: "Token", formula: "{qty:LINEAR.d1@CY}" },
    ],
    expect: ["Plus one"],
  },
  {
    id: "fx-constant-detector",
    rows: [
      { name: "a", formula: "PARENT * 0.5" },
      { name: "b", formula: "PARENT / 2" },
      { name: "c", formula: "PARENT + 1" },
      { name: "d", formula: "1 + PARENT" },
      { name: "e", formula: "PARENT * 2^2" },
      { name: "f", formula: "PARENT * (1 + 0.05)" },
      { name: "g", formula: "{dim:d1} - 0.5" },
      { name: "h", formula: "PARENT * -1" },
      { name: "i", formula: "(PARENT + 2) * 3" },
      { name: "j", formula: "PARENT * (1 + round(0.05, 2))" },
      { name: "k", formula: "ROUNDUP(PARENT, 0) + 1" },
      { name: "l", formula: "[Wall] + [Door]" },
      { name: "m", formula: "PARENT - [Door] * 2" },
      { name: "n", formula: "-1 + PARENT" },
      { name: "o", formula: "PARENT * PI" },
    ],
    expect: ["c", "d", "g", "i", "k", "n"],
  },
];

/** A manual quantity typed in metric, stored in the tool's imperial unit, shown back (D-376 3). */
export const MANUAL_CASES = [
  { id: "manual-10m", typed: 10, tool: "LF", stored: 10 / M, shownText: "10.00 m" },
  { id: "manual-50m2", typed: 50, tool: "SF", stored: 50 / (M * M), shownText: "50.00 m²" },
];

/** Calculate's line names (day run Block 2): the bank bracket rebuilt from the stored bank volume,
 *  so it agrees with the panel; depths under 1 m in whole mm. `displayName` in either system. */
const EW = { source_type: "earthwork_computed", type: "cy", calculated_quantity: 0 };
export const NAME_CASES = [
  // D-407: names in metric. 40 lb/SY x 0.542492 = 21.70 kg/m²; 24" = 610 mm, 8" = 203 mm.
  { id: "ew-agent-lb-sy-metric", item: { ...EW, name: "Hydrated Lime (40 lb/SY)", unit: "TON" }, system: "metric", expect: "Hydrated Lime (21.7 kg/m²)" },
  { id: "ew-undercut-native-metric", item: { ...EW, name: 'Pad — Undercut & Recompact Native Soil, 24" in 8" lifts (3 lifts)', unit: "CY" }, system: "metric", expect: "Pad — Undercut & Recompact Native Soil, 610 mm in 203 mm lifts (3 lifts)" },
  // D-406: a stabilization line's name in metric: 24" = 610 mm, 12" = 305 mm, 110 pcf = 1,762 kg/m³.
  { id: "ew-stabilize-metric", item: { ...EW, name: 'Pad — Soil Stabilization, Hydrated Lime 6%, 24" in 12" lifts (2 lifts)', unit: "SY" }, system: "metric", expect: "Pad — Soil Stabilization, Hydrated Lime 6%, 610 mm in 305 mm lifts (2 lifts)" },
  { id: "ew-agent-metric", item: { ...EW, name: "Hydrated Lime (6% of dry wt @ 110 pcf)", unit: "TON" }, system: "metric", expect: "Hydrated Lime (6% of dry wt @ 1,762 kg/m³)" },
  { id: "ew-export-imperial", item: { ...EW, name: "Soil Export (23 BCY)", unit: "LCY", earthwork_bank_quantity: 22.6949 }, system: "imperial", expect: "Soil Export (23 BCY)" },
  // 22.6949 BCY × 0.764555 = 17.35 BCM: 17, as the panel shows (the old rounded name gave 18).
  { id: "ew-export-metric", item: { ...EW, name: "Soil Export (23 BCY)", unit: "LCY", earthwork_bank_quantity: 22.6949 }, system: "metric", expect: "Soil Export (17 BCM)" },
  { id: "ew-export-no-bank", item: { ...EW, name: "Soil Export (23 BCY)", unit: "LCY" }, system: "metric", expect: "Soil Export (18 BCM)" },
  // 1,234.4 BCY × 0.764555 = 943.77 → 944.
  { id: "ew-import-fill", item: { ...EW, name: "Soil Import — Select Fill (1,234 BCY)", unit: "LCY", earthwork_bank_quantity: 1234.4 }, system: "metric", expect: "Soil Import — Select Fill (944 BCM)" },
  // A metric sheet's line is already metric: rebuilt from its own figure, never converted twice.
  { id: "ew-export-metric-sheet", item: { ...EW, name: "Soil Export (17 BCM)", unit: "LCM", earthwork_bank_quantity: 17.3515 }, system: "imperial", expect: "Soil Export (17 BCM)" },
  { id: "ew-strip-depth", item: { ...EW, name: 'Strip Topsoil (6") — Site (bank)', unit: "BCY" }, system: "metric", expect: "Strip Topsoil (152 mm) — Site (bank)" },
];

/** The Dimension tool on a metric sheet or project: under 1 m in whole mm. */
export const DIMENSION_TOOL_CASES = [
  { id: "dim-4in", feet: 4 / 12, expect: "102 mm" },
  { id: "dim-12-6", feet: 12.5, expect: "3.81 m" },
];

/** Unit pickers in both systems (day run Block 2). A unit from the project's own system follows the
 *  normal rule; one from the other system is shown exactly as stored, with no factor for its rates. */
export const PINNED_CASES = [
  // LF picked in a metric project: stored LF, pinned; reads 100 LF in either system, $2.50/LF stays.
  { id: "pin-lf-in-metric", value: 100, ref: { unit: "LF", unit_pinned: true }, system: "metric", shown: 100, label: "LF", factor: null },
  { id: "pin-lf-in-imperial", value: 100, ref: { unit: "LF", unit_pinned: true }, system: "imperial", shown: 100, label: "LF", factor: null },
  // m picked in a metric project: stored LF, not pinned; converts as usual.
  { id: "own-m-in-metric", value: 100, ref: { unit: "LF", unit_pinned: false }, system: "metric", shown: 100 * M, label: "m", factor: M },
  { id: "own-m-in-imperial", value: 100, ref: { unit: "LF", unit_pinned: false }, system: "imperial", shown: 100, label: "LF", factor: null },
  // m picked in an imperial project: stored as the metric code M, read "m" in either system, never converted.
  { id: "metric-code-m", value: 12, ref: { unit: "M", unit_pinned: false }, system: "metric", shown: 12, label: "m", factor: null },
  { id: "metric-code-m2-imperial", value: 12, ref: { unit: "M2", unit_pinned: false }, system: "imperial", shown: 12, label: "m²", factor: null },
  // D-406 6: a Calculate's tonnage reads in tonnes in metric (13.8421 x 0.90718474); a TON a
  // person picked, pinned or not, stays TON in either system.
  { id: "ton-calculated-metric", value: 13.8421, ref: { unit: "TON", source_type: "earthwork_computed" }, system: "metric", shown: 13.8421 * 0.90718474, label: "t", factor: 0.90718474 },
  { id: "ton-calculated-imperial", value: 13.8421, ref: { unit: "TON", source_type: "earthwork_computed" }, system: "imperial", shown: 13.8421, label: "TON", factor: null },
  { id: "ton-hand-metric", value: 12, ref: { unit: "TON", unit_pinned: false }, system: "metric", shown: 12, label: "TON", factor: null },
  { id: "ton-hand-pinned-metric", value: 12, ref: { unit: "TON", unit_pinned: true }, system: "metric", shown: 12, label: "TON", factor: null },
];

/** What each pick stores: `unitChoices` in each system, by the label a person picks. */
export const PICK_CASES = [
  { id: "pick-metric-m", system: "metric", label: "m", group: "own", code: "LF", pinned: false },
  { id: "pick-metric-m2", system: "metric", label: "m²", group: "own", code: "SF", pinned: false },
  { id: "pick-metric-lf", system: "metric", label: "LF", group: "other", code: "LF", pinned: true },
  { id: "pick-metric-sy", system: "metric", label: "SY", group: "other", code: "SY", pinned: true },
  { id: "pick-imperial-lf", system: "imperial", label: "LF", group: "own", code: "LF", pinned: false },
  { id: "pick-imperial-m", system: "imperial", label: "m", group: "other", code: "M", pinned: false },
];

// Block 2 of 2026-10-12 (D-397): what was still imperial inside a metric project.

const SF_M2 = M * M;
const CY_M3 = 27 * M * M * M;

/** A cost component's formulas in the system they were written in (Phase E's rule): QTY and PARENT
 *  read in metric, the result back in the component's stored unit; the total to the cent. */
const component = (o) => ({
  kind: "material", qty_formula: null, unit: "LF", unit_pinned: false, pricing_mode: "unit", unit_price: 2, crew: null, production_rate: null,
  production_basis: null, crew_day_hours: null, equip_rate: null, equip_basis: null, duration_formula: null, mob_demob: null, sub_calc: null,
  quote_amount: null, unit_rate: null, formula_unit_system: "metric", ...o,
});
export const COMPONENT_SYSTEM_CASES = [
  // A scale is system-neutral: 30.48 m × 1.1 = 33.528 m = 110 LF, × $2 = $220.00.
  { id: "cc-scale-metric", c: component({ qty_formula: "QTY * 1.1" }), qty: 100, hostUnit: "LF", expect: 220 },
  // A constant is not: 30.48 + 1 = 31.48 m = 103.2808… LF, × $2 = $206.56.
  { id: "cc-plus-metric", c: component({ qty_formula: "QTY + 1" }), qty: 100, hostUnit: "LF", expect: 206.56 },
  // The same formula written in imperial: 101 LF, $202.00, in any project.
  { id: "cc-plus-imperial", c: component({ qty_formula: "QTY + 1", formula_unit_system: "imperial" }), qty: 100, hostUnit: "LF", expect: 202 },
  // A pinned unit is never converted: 31.48 taken as LF, × $2 = $62.96.
  { id: "cc-pinned", c: component({ qty_formula: "QTY + 1", unit_pinned: true }), qty: 100, hostUnit: "LF", expect: 62.96 },
  // An area: 1,000 SF = 92.90304 m², × 0.5 = 46.45152 m² = 500 SF, × $1.50 = $750.00.
  { id: "cc-area", c: component({ qty_formula: "QTY * 0.5", unit: "SF", unit_price: 1.5 }), qty: 1000, hostUnit: "SF", expect: 750 },
  // A duration is time: QTY / 10 reads 30.48 m / 10 = 3.048 h, × $50 = $152.40 (imperial: 10 h, $500.00).
  { id: "cc-duration-metric", c: component({ kind: "equipment", equip_basis: "hr", equip_rate: 50, duration_formula: "QTY / 10" }), qty: 100, hostUnit: "LF", expect: 152.4 },
  { id: "cc-duration-imperial", c: component({ kind: "equipment", equip_basis: "hr", equip_rate: 50, duration_formula: "QTY / 10", formula_unit_system: "imperial" }), qty: 100, hostUnit: "LF", expect: 500 },
  // A blank formula is QTY as stored, in any system: 100 LF × $2 = $200.00.
  { id: "cc-blank", c: component({}), qty: 100, hostUnit: "LF", expect: 200 },
];

/** The Quantity popover told in metric: a parent's figures and units, a sub-item's substitution. */
const parentItem = (o) => ({
  unit: "SF", calculated_quantity: 1000, effective_quantity: 1000, manual_quantity_override: null, override_reason: null, height_ft: null, height_raw: null,
  pitch_factor: null, pitch_mode: null, pitch_entry: null, volume_depth_ft: null, volume_width_ft: null, multiplier: 1, ...o,
});
export const EXPLAIN_METRIC_CASES = [
  // 1,000 SF = 92.90304 m²; the 100 SF deduct 9.290304 m²; × 2 told in m².
  {
    id: "ex-parent-metric", parent: parentItem({ multiplier: 2 }), sheets: [{ sheet: "A1", shapes: 1, deducts: 1, deductArea: 100, quantity: 1000 }],
    expect: { measured: 1000 * SF_M2, unit: "m²", deductArea: 100 * SF_M2, areaUnit: "m²", lengthUnit: "m", multiplied: "92.903 m² × 2 = 185.8061 m²" },
  },
  // A volume: 10 CY = 7.64555 m³, its 6" depth 0.1524 m, reached as m² × m.
  {
    id: "ex-volume-metric", parent: parentItem({ unit: "CY", calculated_quantity: 10, effective_quantity: 10, volume_depth_ft: 0.5 }), sheets: [],
    expect: { measured: 10 * CY_M3, unit: "m³", depth: 0.5 * M, volumeIn: "in m³" },
  },
  // A sub-item written in metric: PARENT 100 LF read as 30.48 m.
  { id: "ex-sub-metric", formula: "PARENT * 0.5", parent: 100, parentUnit: "LF", expect: { substituted: "30.48 × 0.5", value: 15.24 } },
  // A dimension read in metres: 2 ft = 0.6096 m, × 100 SF = 9.290304 m².
  { id: "ex-sub-dim", formula: "{dim:d1} * PARENT", parent: 100, parentUnit: "SF", dims: { d1: 2 }, expect: { substituted: "0.6096 × 9.2903", value: 0.6096 * 100 * SF_M2, dimUnit: "m" } },
];

/** The export in metric: a sub-item's live expression read on the metric environment against the
 *  metric cell, the parent's Qty and the Dimensions sheet in metric; null keeps the number. */
export const EXCEL_METRIC_CASES = [
  { id: "xm-scale", formula: "PARENT * 0.5", parent: 100, parentUnit: "LF", cell: 50 * M, live: true },
  { id: "xm-dim", formula: "{dim:d1} * PARENT", parent: 100, parentUnit: "SF", dims: { d1: 2 }, cell: 200 * M * M * M, live: true },
  // Written in imperial with a constant: 101 LF = 30.7848 m in the cell, but read in metric it is
  // 31.48: it keeps its number.
  { id: "xm-plus-imperial", formula: "PARENT + 1", parent: 100, parentUnit: "LF", cell: 101 * M, live: false },
];

// D-399…D-404: the six imperial spots closed. Each row names the screen it stands for.
export const CLOSE_CASES = [
  // D-399, the guest view: the shared project's quantities through the project's own format.
  { id: "guest-sf", kind: "guest-format", value: 1000, unit: "SF", expect: "92.90 m²" },
  { id: "guest-lf-waste", kind: "guest-quantity", value: 44 * 1.1, unit: "LF", expect: 44 * 1.1 * M },
  { id: "guest-ea", kind: "guest-format", value: 11, unit: "EA", expect: "11 EA" },
  // D-400, the sub-items Insert menu: PARENT and PERIMETER as a metric formula reads them, and a
  // dimension typed in inches (36 in = 3 ft = 0.9144 m, under 1 m in whole mm).
  { id: "insert-parent", kind: "guest-format", value: 100, unit: "LF", expect: "30.48 m" },
  { id: "insert-perimeter", kind: "guest-format", value: 50, unit: "LF", expect: "15.24 m" },
  { id: "insert-dim-in", kind: "dim-length", dim: { local_key: "d1", name: "Height", kind: "vertical", value: 36, unit: "IN" }, expect: "914 mm" },
  { id: "insert-dim-ft", kind: "dim-length", dim: { local_key: "d1", name: "Height", kind: "vertical", value: 12, unit: "FT" }, expect: "3.66 m" },
  // D-401, the link panel: a stored 0.5 ft offset reads 0.1524 m, and 0.1524 m typed stores 0.5 ft;
  // 1.25 m stores 4.1010… ft; imperial is as typed.
  { id: "offset-shown", kind: "offset-shown", feet: 0.5, metric: true, expect: "0.1524" },
  { id: "offset-feet", kind: "offset-feet", typed: "0.1524", metric: true, expect: 0.5 },
  { id: "offset-feet-125", kind: "offset-feet", typed: "1.25", metric: true, expect: 1.25 / M },
  { id: "offset-imperial", kind: "offset-feet", typed: "2", metric: false, expect: 2 },
  // D-402, the site join check: 120 ft = 36.58 m; a 0.25 ft miss = 0.076 m; imperial as before.
  { id: "join-line", kind: "join-length", feet: 120, places: 2, metric: true, expect: "36.58 m" },
  { id: "join-miss", kind: "join-length", feet: 0.25, places: 3, metric: true, expect: "0.076 m" },
  { id: "join-imperial", kind: "join-length", feet: 12.34, places: 1, metric: false, expect: "12.3 ft" },
  // D-403, the assembly library preview: 30 m typed = 98.4252 LF held; QTY * 1.1 read in metric is
  // 33 m = 108.2677 LF, × $3.048/LF ($10/m) = $330.00. Imperial: 100 LF → 110 LF → $335.28.
  { id: "tpl-preview-metric", kind: "template-preview", typed: 30, unit: "LF", system: "metric", c: component({ qty_formula: "QTY * 1.1", unit_price: 3.048 }), expect: 330 },
  { id: "tpl-preview-imperial", kind: "template-preview", typed: 100, unit: "LF", system: "imperial", c: component({ qty_formula: "QTY * 1.1", unit_price: 3.048, formula_unit_system: "imperial" }), expect: 335.28 },
  // The Phase D rate rule: $3.048 per LF reads $10 per m; $10 per m typed stores $3.048 per LF; $2 per m²
  // stores $0.185806 per SF.
  { id: "rate-shown-lf", kind: "rate-shown", stored: 3.048, f: M, expect: 10 },
  { id: "rate-stored-lf", kind: "rate-stored", typed: 10, f: M, expect: 3.048 },
  { id: "rate-stored-sf", kind: "rate-stored", typed: 2, f: SF_M2, expect: 0.185806 },
  // D-404, shared equipment usage: QTY / 10 on a 100 LF host reads 30.48 m / 10 = 3.048 h when written
  // in metric, 10 h in imperial; a constant: 3.048 + 1 = 4.048 h. Hours are never converted.
  { id: "eq-usage-metric", kind: "usage", qty: 100, unit: "LF", formula: "QTY / 10", system: "metric", expect: 3.048 },
  { id: "eq-usage-imperial", kind: "usage", qty: 100, unit: "LF", formula: "QTY / 10", system: "imperial", expect: 10 },
  { id: "eq-usage-plus", kind: "usage", qty: 100, unit: "LF", formula: "QTY / 10 + 1", system: "metric", expect: 4.048 },
];

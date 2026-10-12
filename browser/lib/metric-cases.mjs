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

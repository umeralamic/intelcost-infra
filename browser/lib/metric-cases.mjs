// The shared table's metric rows (D-375, D-376): what a metric project shows for a stored quantity,
// and what it stores and reads back for a length typed in it. Storage stays imperial: every row
// checks a figure in feet, SF or CY against its metric reading, worked by hand from 1 ft = 0.3048 m.

const M = 0.3048;

/** Typed in a metric project: the feet stored, the text read back (D-376 2). */
export const ENTRY_CASES = [
  { id: "entry-150mm", raw: "150 mm", feet: 150 / 304.8, readback: "150 mm" },
  { id: "entry-2.5m", raw: "2.5 m", feet: 2.5 / M, readback: "2.50 m" },
  { id: "entry-1200mm", raw: "1200 mm", feet: 1200 / 304.8, readback: "1200 mm" },
  { id: "entry-0.3m", raw: "0.3 m", feet: 0.3 / M, readback: "0.30 m" },
  // Imperial typed in a metric project: read in feet, read back in metres (2.286 m).
  { id: "entry-imperial-7-6", raw: `7' - 6"`, feet: 7.5, readback: "2.29 m" },
  // A bare number is metres in a metric project.
  { id: "entry-bare-metres", raw: "2.5", feet: 2.5 / M, readback: "2.50 m" },
  { id: "entry-25cm", raw: "25 cm", feet: 25 / 30.48, readback: "25 cm" },
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
  { id: "fx-plus-one-imperial", formula: "PARENT + 1", parent: 100, parentUnit: "LF", resultUnit: "LF", system: "imperial", expect: 101 },
  // A named dimension converts: 2 ft = 0.6096 m × 9.290304 m² = 5.6634… m³ = 200 CF.
  { id: "fx-dim", formula: "{dim:d1} * PARENT", parent: 100, parentUnit: "SF", resultUnit: "CF", dims: { d1: 2 }, system: "metric", expect: 200 },
  // ^ before * (D-251): 30.48 × 4 = 121.92 m = 400 LF.
  { id: "fx-power", formula: "PARENT * 2^2", parent: 100, parentUnit: "LF", resultUnit: "LF", system: "metric", expect: 400 },
  // A sub-item in EA takes its figure as computed (no metric form): 30.48 m / 2 = 15.24 EA.
  { id: "fx-ea-result", formula: "PARENT / 2", parent: 100, parentUnit: "LF", resultUnit: "EA", system: "metric", expect: 15.24 },
];

/** The cross-system apply's warning: which formulas hold a numeric constant (app only). */
export const CONSTANT_CASES = [
  {
    id: "fx-template-warning",
    rows: [
      { name: "Half", formula: "PARENT * 0.5" },
      { name: "Plus one", formula: "PARENT + 1" },
      { name: "Dim", formula: "{dim:d1} * PARENT" },
      { name: "Token", formula: "{qty:LINEAR.d1@CY}" },
    ],
    expect: ["Half", "Plus one"],
  },
];

/** A manual quantity typed in metric, stored in the tool's imperial unit, shown back (D-376 3). */
export const MANUAL_CASES = [
  { id: "manual-10m", typed: 10, tool: "LF", stored: 10 / M, shownText: "10.00 m" },
  { id: "manual-50m2", typed: 50, tool: "SF", stored: 50 / (M * M), shownText: "50.00 m²" },
];

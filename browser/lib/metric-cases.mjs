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

/** A manual quantity typed in metric, stored in the tool's imperial unit, shown back (D-376 3). */
export const MANUAL_CASES = [
  { id: "manual-10m", typed: 10, tool: "LF", stored: 10 / M, shownText: "10.00 m" },
  { id: "manual-50m2", typed: 50, tool: "SF", stored: 50 / (M * M), shownText: "50.00 m²" },
];

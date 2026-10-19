// Scale undo rows (D-642): Ctrl+Z after a scale change brings every quantity on the sheet back
// exactly. Each row is an item's shapes (a row of the main table, by `base`) on a sheet first
// calibrated (`a`: two points in page fractions and the feet between them, worked out as the api's
// set_calibration does), then given a preset scale (`b`, feet per point), then undone and redone.
//
// The api's pass (drives/quantity-table.py scaleundo) stores each scale through the calibration's
// own column type, numeric(24,12), on the app's own driver, reads it back as the recompute does,
// sends the undo's value through the restore schema and JSON as the app does, and stores it again;
// then each figure through the api's engine. The browser's engine reads the same stored values.
// Undo must give the first figures bit for bit, redo the second; both engines agree to 1e-9; and
// `expectA` / `expectB` are the hand-worked figures.

export const SCALE_UNDO_CASES = [
  // 10 ft over 100 pt (0.1 ft/pt), then 1/4 ft per point.
  { id: "scale-undo-rect-linear", base: "rect-linear-10x20", a: { points: [[0.1, 0.1], [0.2, 0.1]], feet: 10 }, b: { fpp: 0.25 }, expectA: 60, expectB: 150 },
  { id: "scale-undo-circle-area", base: "circle-area-r10", a: { points: [[0.1, 0.1], [0.2, 0.1]], feet: 10 }, b: { fpp: 0.25 }, expectA: Math.PI * 100, expectB: Math.PI * 625 },
  { id: "scale-undo-area-less-circle", base: "rect-less-circle", a: { points: [[0.1, 0.1], [0.1, 0.2]], feet: 10 }, b: { fpp: 0.05 }, expectA: 6400 - Math.PI * 100, expectB: (6400 - Math.PI * 100) / 4 },
  // C-200's page at 1" = 30' (30 ft over 72 pt), then 1" = 20'.
  { id: "scale-undo-true-arc", base: "arc-true-c200-quarter-r20", a: { points: [[0.1, 0.5], [0.1 + 72 / 2448, 0.5]], feet: 30 }, b: { fpp: 20 / 72 }, expectA: 10 * Math.PI, expectB: (10 * Math.PI * 20) / 30 },
  { id: "scale-undo-arc-run", base: "arc-run-and-straight", a: { points: [[0.2, 0.3], [0.3, 0.3]], feet: 10 }, b: { fpp: 1 / 6 }, expectA: Math.PI * 10 + 10, expectB: ((Math.PI * 10 + 10) * (1 / 6)) / 0.1 },
  // An awkward calibration on a landscape page (37.77 ft along a slant), then 1/8" = 1': no hand
  // figure, only the exact round trip and the engines' agreement.
  { id: "scale-undo-awkward", base: "two-sections-one-hole", a: { points: [[0.123, 0.456], [0.789, 0.321]], feet: 37.77 }, b: { fpp: 8 / 72 } },
];

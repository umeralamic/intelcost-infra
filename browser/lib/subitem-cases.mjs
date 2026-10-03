// The shared table's sub-item formula rows (D-244, D-245): a sub-item's formula read
// against its parent the way both engines read it, the browser's `lib/takeoff/subItems`
// (env.ts, formula.ts) and the api's (`sub_items.py`, `formula.py`), equal to 1e-9 and equal
// to the answer worked by hand in the comment beside each.
//
// `type` is the parent's (lf, sf, count); `shapes` its runs in normalised page units on
// `page` points at `fpp` feet per point, or `count` marks; `dims` its named dimensions in
// feet by local key. `before`, where given, is what the New Measurement dialog's editor
// shows before the measurement is drawn (D-244): "pending" (no figure yet, Create
// allowed), "value" (a figure that does not need the drawing) or "error" (Create blocked).
// `parse` rows read a typed dimension value into feet (the browser's parser only).

const SQUARE = [1000, 1000];
// 40 ft at 0.1 ft per point.
const RUN_40 = [[[0.1, 0.5], [0.5, 0.5]]];
// A 10 × 10 ft square at 0.1 ft per point: 100 SF, perimeter 40 ft.
const SQUARE_10 = [[[0.1, 0.1], [0.2, 0.1], [0.2, 0.2], [0.1, 0.2]]];

export const SUBITEM_CASES = [
  // --- D-244: sub-items typed before the measurement is drawn ---------------------------
  // PARENT × 1.05 waits for the drawing; over a 40 ft run it is 42.
  { id: "draft-parent-waste", type: "lf", page: SQUARE, fpp: 0.1, shapes: RUN_40, dims: {}, formula: "PARENT*1.05", before: "pending", expect: 42 },
  // A derived volume, Linear × Width × Depth, waits too: 40 × 3 × 2.5 = 300 CF = 11.1111 CY.
  { id: "draft-linear-volume", type: "lf", page: SQUARE, fpp: 0.1, shapes: RUN_40, dims: { d1: 3, d2: 2.5 }, formula: "{qty:LINEAR.d1.d2@CY}", before: "pending", expect: 300 / 27 },
  // A figure from the dimension alone has it before drawing: 3 × 2 = 6.
  { id: "draft-dimension-only", type: "lf", page: SQUARE, fpp: 0.1, shapes: RUN_40, dims: { d1: 3 }, formula: "{dim:d1}*2", before: "value", expect: 6 },
  // An area's perimeter × Height waits: 40 × 8 = 320.
  { id: "draft-perimeter-height", type: "sf", page: SQUARE, fpp: 0.1, shapes: SQUARE_10, dims: { d1: 8 }, formula: "PERIMETER*{dim:d1}", before: "pending", expect: 320 },
  // A count's marks × 2: 3 marks, 6.
  { id: "draft-count-double", type: "count", count: 3, dims: {}, formula: "PARENT*2", before: "pending", expect: 6 },
  // Broken formulas still block Create, before and after drawing.
  { id: "draft-broken-syntax", type: "lf", page: SQUARE, fpp: 0.1, shapes: RUN_40, dims: {}, formula: "PARENT*", before: "error" },
  { id: "draft-unknown-name", type: "lf", page: SQUARE, fpp: 0.1, shapes: RUN_40, dims: {}, formula: "PARENT*FOO", before: "error" },
];

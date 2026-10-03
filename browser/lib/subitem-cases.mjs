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

// --- D-245: Dia, a round section on any item and along a run ------------------------------
// 14.5" is 14.5 / 12 = 1.2083 ft; so is 1'-2.5"; plain feet stay feet.
const DIA = 14.5 / 12;
// π·Dia²/4 at 14.5": π × 1.2083² / 4 = 1.1467 SF.
const SECTION = (Math.PI * DIA * DIA) / 4;
// 117.69 LF at 0.25 ft per point: one Linear run of three points, or three Segment runs.
const LINEAR_117 = [[[0.1, 0.3], [0.3, 0.3], [0.57076, 0.3]]];
const SEGMENTS_117 = [[[0.1, 0.3], [0.26, 0.3]], [[0.1, 0.4], [0.26, 0.4]], [[0.1, 0.5], [0.25076, 0.5]]];
SUBITEM_CASES.push(
  { id: "dia-parse-inches", parse: '14.5"', expect: DIA },
  { id: "dia-parse-feet-inches", parse: "1'-2.5\"", expect: DIA },
  { id: "dia-parse-feet", parse: "1.21", expect: 1.21 },
  // Area (π·Dia²/4) needs no drawing: it has its figure in the New Measurement dialog.
  { id: "dia-section-area", type: "lf", page: SQUARE, fpp: 0.25, shapes: LINEAR_117, dims: { d1: DIA }, formula: "{qty:SECTION.CIRC_AREA.d1@SF}", before: "value", expect: SECTION },
  // Volume (Linear × π·Dia²/4): 117.69 × 1.1467 = 134.96 CF = 4.9985 CY ("about 5.0").
  { id: "dia-linear-volume", type: "lf", page: SQUARE, fpp: 0.25, shapes: LINEAR_117, dims: { d1: DIA }, formula: "{qty:LINEAR.CIRC_AREA.d1@CY}", before: "pending", expect: (117.69 * SECTION) / 27 },
  { id: "dia-segment-volume", type: "lf", page: SQUARE, fpp: 0.25, shapes: SEGMENTS_117, dims: { d1: DIA }, formula: "{qty:LINEAR.CIRC_AREA.d1@CY}", before: "pending", expect: (117.69 * SECTION) / 27 },
  // The trench's pipe zone with the round section deducted: 117.69 × (3 × 2.5 − 1.1467) / 27
  // = 117.69 × 6.3533 / 27 = 27.6931 CY.
  { id: "dia-trench-zone-less-section", type: "lf", page: SQUARE, fpp: 0.25, shapes: LINEAR_117, dims: { d1: 3, d2: 2.5, d3: DIA }, formula: "PARENT*({dim:d1}*{dim:d2}-{qty:SECTION.CIRC_AREA.d3@SF})/27", before: "pending", expect: (117.69 * (3 * 2.5 - SECTION)) / 27 },
  // 3 round footings, Dia 4 ft, Depth 5 ft: 3 × π × 4² / 4 × 5 = 188.50 CF = 6.98 CY.
  { id: "dia-round-footings", type: "count", count: 3, dims: { d1: 4, d2: 5 }, formula: "{qty:COUNT.CIRC_VOL.d1.d2@CY}", before: "pending", expect: (3 * Math.PI * 16 * 5) / 4 / 27 },
  // Every Derived label says what its token makes (D-245 e).
  {
    id: "dia-labels-linear",
    offers: { bases: ["LINEAR"], dims: [["d1", "Width", "width"], ["d2", "Depth", "vertical"], ["d3", "Dia", "diameter"], ["d4", "Dia (2)", "diameter"]] },
    expect: [
      "Volume 1 (Linear × Width × Depth) {qty:LINEAR.d1.d2@CY}",
      "Volume 2 (Linear × π·Dia²/4) {qty:LINEAR.CIRC_AREA.d3@CY}",
      "Volume 3 (Linear × π·Dia (2)²/4) {qty:LINEAR.CIRC_AREA.d4@CY}",
      "Area 1 (Linear × Width) {qty:LINEAR.d1@SF}",
      "Area 2 (Linear × Depth) {qty:LINEAR.d2@SF}",
      "Area 3 (π·Dia²/4) {qty:SECTION.CIRC_AREA.d3@SF}",
      "Area 4 (π·Dia (2)²/4) {qty:SECTION.CIRC_AREA.d4@SF}",
    ],
  },
  {
    id: "dia-labels-circle-count",
    offers: { bases: ["COUNT"], countShape: "circle", dims: [["d1", "Dia", "diameter"], ["d2", "Depth", "vertical"]] },
    expect: [
      "Volume (Count × π·Dia²/4 × Depth) {qty:COUNT.CIRC_VOL.d1.d2@CY}",
      "Area 1 (Count × π·Dia²/4) {qty:COUNT.CIRC_AREA.d1@SF}",
      "Area 2 (Count × π·Dia × Depth) {qty:COUNT.CIRC_SIDE.d1.d2@SF}",
      "Area 3 (π·Dia²/4) {qty:SECTION.CIRC_AREA.d1@SF}",
      "Length 1 (Count × Dia) {qty:COUNT.PROD.d1@LF}",
      "Length 2 (Count × Depth) {qty:COUNT.PROD.d2@LF}",
    ],
  },
  {
    id: "dia-labels-square-count",
    offers: { bases: ["COUNT"], countShape: "square", dims: [["d1", "Length", "width"], ["d2", "Width", "width"], ["d3", "Height", "vertical"]] },
    expect: [
      "Volume (Count × Length × Width × Height) {qty:COUNT.BOX_VOL.d1.d2.d3@CY}",
      "Area 1 (Count × Length × Width) {qty:COUNT.BOX_AREA.d1.d2@SF}",
      "Area 2 (Count × 2·(Length + Width) × Height) {qty:COUNT.BOX_SIDE.d1.d2.d3@SF}",
      "Length 1 (Count × Length) {qty:COUNT.PROD.d1@LF}",
      "Length 2 (Count × Width) {qty:COUNT.PROD.d2@LF}",
      "Length 3 (Count × Height) {qty:COUNT.PROD.d3@LF}",
    ],
  },
  {
    id: "dia-labels-area",
    offers: { bases: ["AREA", "PERIM"], dims: [["d1", "Thickness", "vertical"], ["d2", "Width", "width"]] },
    expect: [
      "Volume 1 (Area × Thickness) {qty:AREA.d1@CY}",
      "Volume 2 (Perimeter × Thickness × Width) {qty:PERIM.d1.d2@CY}",
      "Area (Perimeter × Thickness) {qty:PERIM.d1@SF}",
    ],
  },
);

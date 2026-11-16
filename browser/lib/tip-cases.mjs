// The cursor tip's rows (D-1293): `cursorTipText` (src/lib/takeoff/engine/cursorTip.ts) on a run in hand and a pen,
// each against the words and figures worked by hand. The figures are the quantity engine's (hard rule 3); the lengths
// read as the Dimension tool's (ft-in to the sixteenth, or metres), an area as the panel's (SF to its places, or m²).
//
// Square page, 1000 × 1000 pt at 0.1 ft per point: 0.1 of the page is 10 ft.
//   Linear: (0.1, 0.1) → (0.2, 0.1) is 10 ft; the pen at (0.2, 0.1625) adds 6.25 ft: 6'-3" · total 16'-3".
//   Segment: from (0.1, 0.1) to (0.175, 0.2) is 7.5 by 10 ft: 12.5 ft, 12'-6".
//   The perimeter includes the closing edge back to the first point (the founder, 2026-11-16 11:06), as the area does:
//   Area: (0.1, 0.1), (0.4, 0.1), the pen at (0.4, 0.3): 30 + 20 + √(30² + 20²) = 86.055513 ft = 86'-0 11/16" (to the
//   sixteenth: 0.055513 ft = 0.666 in = 10.66/16); a triangle ½ × 30 × 20 = 300 SF.
//   Area: three corners of a 30 × 20 ft box and the pen at the fourth: 30 + 20 + 30 + 20 = 100 ft; 600 SF.
//   Area, Rectangle mode: one corner and the pen at the other: perimeter 2 × (30 + 20) = 100 ft, 600 SF.
//   Linear with an A-arc (pen-cases' quarter circle, r 10 ft, 90°): a 10 ft lead, then the arc through its middle to
//   the pen: the arc is π / 2 × 10 = 15.707963 ft = 15'-8 1/2" (to the sixteenth), the run 25.707963 ft = 25'-8 1/2".
//   Metric: the 12.5 ft segment is 3.81 m.
//   Count: 2 placed reads "2"; none placed, no box. No scale: "Sheet not scaled" in place of the figures (Count keeps
//   its number, a count needs no scale).

const SQUARE = { widthPt: 1000, heightPt: 1000 };
const base = { feetPerPt: 0.1, page: SQUARE, metric: false, decimals: 2 };
const p = (x, y) => ({ x, y });

const R = 0.1;
const on = (deg) => p(0.5 + R * Math.cos((deg * Math.PI) / 180), 0.5 + R * Math.sin((deg * Math.PI) / 180));
const [START, THROUGH, END] = [on(32.5), on(77.5), on(122.5)];
const LEAD = p(START.x - 0.1, START.y);

export const TIP_CASES = [
  {
    id: "tip-linear-segment-total",
    input: { ...base, tool: "lf", mode: "continuous", points: [p(0.1, 0.1), p(0.2, 0.1)], pen: p(0.2, 0.1625) },
    expect: { prompt: "Click to add a point, double-click to finish", values: [`6'-3" · total 16'-3"`], note: null },
  },
  {
    id: "tip-linear-before-first-click",
    input: { ...base, tool: "lf", mode: "continuous", points: [], pen: p(0.2, 0.2) },
    expect: { prompt: "Click to start the run", values: [], note: null },
  },
  {
    id: "tip-linear-a-arc-end",
    input: { ...base, tool: "lf", mode: "continuous", points: [LEAD, START], arc: { through: THROUGH }, pen: END },
    expect: { prompt: "Click the arc's end", values: [`15'-8 1/2" · total 25'-8 1/2"`], note: null },
  },
  {
    id: "tip-segment",
    input: { ...base, tool: "segment", points: [p(0.1, 0.1)], pen: p(0.175, 0.2) },
    expect: { prompt: "Click the segment's end", values: [`12'-6"`], note: null },
  },
  {
    id: "tip-segment-metric",
    input: { ...base, metric: true, tool: "segment", points: [p(0.1, 0.1)], pen: p(0.175, 0.2) },
    expect: { prompt: "Click the segment's end", values: ["3.81 m"], note: null },
  },
  {
    id: "tip-area-triangle-so-far",
    input: { ...base, tool: "sf", mode: "polygon", points: [p(0.1, 0.1), p(0.4, 0.1)], pen: p(0.4, 0.3) },
    expect: { prompt: "Click the next corner, double-click to close", values: [`Perimeter 86'-0 11/16"`, "Area 300 SF"], note: null },
  },
  {
    id: "tip-area-box-closing-edge",
    input: { ...base, tool: "sf", mode: "polygon", points: [p(0.1, 0.1), p(0.4, 0.1), p(0.4, 0.3)], pen: p(0.1, 0.3) },
    expect: { prompt: "Click the next corner, double-click to close", values: [`Perimeter 100'-0"`, "Area 600 SF"], note: null },
  },
  {
    id: "tip-area-rectangle-mode",
    input: { ...base, tool: "sf", mode: "rectangle", points: [p(0.1, 0.1)], pen: p(0.4, 0.3) },
    expect: { prompt: "Click the opposite corner", values: [`Perimeter 100'-0"`, "Area 600 SF"], note: null },
  },
  {
    id: "tip-count-two",
    input: { ...base, tool: "count", points: [], pen: p(0.3, 0.3), count: 2 },
    expect: { prompt: "Click to place", values: ["2"], note: null },
  },
  {
    id: "tip-count-none-yet",
    input: { ...base, tool: "count", points: [], pen: p(0.3, 0.3), count: null },
    expect: { prompt: "Click to place", values: [], note: null },
  },
  {
    id: "tip-linear-not-scaled",
    input: { ...base, feetPerPt: 0, tool: "lf", mode: "continuous", points: [p(0.1, 0.1), p(0.2, 0.1)], pen: p(0.2, 0.1625) },
    expect: { prompt: "Click to add a point, double-click to finish", values: [], note: "Sheet not scaled" },
  },
  {
    id: "tip-area-not-scaled",
    input: { ...base, feetPerPt: 0, tool: "sf", mode: "polygon", points: [p(0.1, 0.1), p(0.4, 0.1)], pen: p(0.4, 0.3) },
    expect: { prompt: "Click the next corner, double-click to close", values: [], note: "Sheet not scaled" },
  },
  {
    id: "tip-count-not-scaled-keeps-number",
    input: { ...base, feetPerPt: 0, tool: "count", points: [], pen: p(0.3, 0.3), count: 3 },
    expect: { prompt: "Click to place", values: ["3"], note: null },
  },
];

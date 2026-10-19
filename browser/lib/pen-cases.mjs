// The pen's rows (D-620, D-632): a shape drawn by its clicks through the app's own pen
// (`orthoPen`, then `shapeFrom`, then the quantity engine), with Ortho on and off.
//
// D-632's rows click more than twice: `clicks` in place of `a` and `b`, `armed` the clicks taken while an
// A-arc is armed (its through point and end), `through` the index of an A-arc's through point (it is
// not a vertex: the edge before the end bends through it). Every click must land exactly as picked.
//
// Each row: `tool` (lf, sf), `mode`, `page` in points, `fpp` feet per point, the clicks `a` and
// `b` in page fractions, `ortho`, and `expect`, worked by hand. The view is the page at half a
// pixel per point, so the screen's 45° is the page's. Ortho's tolerance is the default 15°. Where the
// pen lands is checked too: `end`, or, for a box, the far corner `b` exactly as picked.
//
// Square page, 1000 × 1000 pt at 0.1 ft per point: 0.1 of the page is 10 ft.
//   20 × 30 ft rectangle: 0.2 × 0.3 of the page; area 20 × 30 = 600 SF; perimeter 2 × (20 + 30) = 100 LF.
//   Its diagonal is atan(30 / 20) = 56.3° from across, 11.3° off the 45° ray, inside the 15° tolerance:
//   the case Ortho pulled before D-620 (to a 25.5 ft square, 650 SF).
//   20 × 30 ft ellipse in that box: π × 10 × 15 = 471.238898 SF.
// Landscape page, 1224 × 792 pt at 0.25 ft per point: 20 ft is 80 pt, 30 ft is 120 pt.
// The control, a Linear run of two points 37° off across, with Ortho on, lands on 45°: its
// length is the pen's distance on screen, kept, 0.25 of the square page's width on the diagonal
// from 0.2 × 0.15 of the page: hypot(200, 150) = 250 pt = 25 ft, exact, as Ortho keeps the distance.

const SQUARE = [1000, 1000];
const LANDSCAPE = [1224, 792];

const sq = (id, tool, mode, a, b, ortho, expect) => ({ id, tool, mode, page: SQUARE, fpp: 0.1, a, b, ortho, expect });

// D-632's arcs, on the square page: a 10 ft radius is 0.1 of the page. A quarter circle centred on
// (0.5, 0.5) from 32.5° to 122.5°, through 77.5°: its chords run at 145° and 190°, each 10° off a 45°
// ray, so the old pen pulled both the through point and the end. Length π / 2 × 10 = 15.707963 LF.
// The same arc as an A-arc after a 10 ft straight edge ending at its start (the edge drawn across,
// on a ray, so Ortho leaves it): 10 + 15.707963 = 25.707963 LF. As an area, the arc closed by its
// chord: the segment r² / 2 × (π / 2 − 1) = 28.539816 SF.
const R = 0.1;
const on = (deg) => [0.5 + R * Math.cos((deg * Math.PI) / 180), 0.5 + R * Math.sin((deg * Math.PI) / 180)];
const [START, THROUGH, END] = [on(32.5), on(77.5), on(122.5)];
const LEAD = [START[0] - 0.1, START[1]];
const arcRows = (ortho) => {
  const tag = ortho ? "on" : "off";
  return [
    { id: `pen-arc-mode-r10-90deg-ortho-${tag}`, tool: "lf", mode: "arc", page: SQUARE, fpp: 0.1, clicks: [START, THROUGH, END], ortho, expect: (Math.PI / 2) * 10 },
    { id: `pen-linear-run-a-arc-ortho-${tag}`, tool: "lf", mode: "continuous", page: SQUARE, fpp: 0.1, clicks: [LEAD, START, THROUGH, END], armed: [2, 3], through: 2, ortho, expect: 10 + (Math.PI / 2) * 10 },
    { id: `pen-area-a-arc-ortho-${tag}`, tool: "sf", mode: "polygon", page: SQUARE, fpp: 0.1, clicks: [START, THROUGH, END], armed: [1, 2], through: 1, ortho, expect: 50 * (Math.PI / 2 - 1) },
  ];
};

export const PEN_CASES = [
  // Area rectangle, 20 wide and 30 tall, then 30 wide and 20 tall, Ortho on and off.
  sq("pen-rect-20x30-ortho-on", "sf", "rectangle", [0.1, 0.1], [0.3, 0.4], true, 600),
  sq("pen-rect-20x30-ortho-off", "sf", "rectangle", [0.1, 0.1], [0.3, 0.4], false, 600),
  sq("pen-rect-30x20-ortho-on", "sf", "rectangle", [0.1, 0.1], [0.4, 0.3], true, 600),
  sq("pen-rect-30x20-ortho-off", "sf", "rectangle", [0.1, 0.1], [0.4, 0.3], false, 600),
  // Drawn the other way, far corner up and to the left.
  sq("pen-rect-20x30-reversed-ortho-on", "sf", "rectangle", [0.5, 0.6], [0.3, 0.3], true, 600),
  sq("pen-rect-30x20-reversed-ortho-on", "sf", "rectangle", [0.5, 0.6], [0.2, 0.4], true, 600),
  // Linear rectangle: its perimeter.
  sq("pen-rect-linear-20x30-ortho-on", "lf", "rectangle", [0.1, 0.1], [0.3, 0.4], true, 100),
  sq("pen-rect-linear-30x20-ortho-on", "lf", "rectangle", [0.1, 0.1], [0.4, 0.3], true, 100),
  // An ellipse is drawn in the same box: unchanged by Ortho too.
  sq("pen-ellipse-20x30-ortho-on", "sf", "ellipse", [0.1, 0.1], [0.3, 0.4], true, Math.PI * 10 * 15),
  sq("pen-ellipse-20x30-ortho-off", "sf", "ellipse", [0.1, 0.1], [0.3, 0.4], false, Math.PI * 10 * 15),
  sq("pen-ellipse-30x20-ortho-on", "sf", "ellipse", [0.1, 0.1], [0.4, 0.3], true, Math.PI * 10 * 15),
  sq("pen-ellipse-30x20-ortho-off", "sf", "ellipse", [0.1, 0.1], [0.4, 0.3], false, Math.PI * 10 * 15),
  // Linear rectangles with Ortho off, and the Linear ellipse's perimeter (the integral, worked to
  // 1e-12: 79.327198 LF for semi-axes 10 and 15).
  sq("pen-rect-linear-20x30-ortho-off", "lf", "rectangle", [0.1, 0.1], [0.3, 0.4], false, 100),
  sq("pen-rect-linear-30x20-ortho-off", "lf", "rectangle", [0.1, 0.1], [0.4, 0.3], false, 100),
  sq("pen-ellipse-linear-20x30-ortho-on", "lf", "ellipse", [0.1, 0.1], [0.3, 0.4], true, 79.32719794645432),
  sq("pen-ellipse-linear-20x30-ortho-off", "lf", "ellipse", [0.1, 0.1], [0.3, 0.4], false, 79.32719794645432),
  sq("pen-ellipse-linear-30x20-ortho-on", "lf", "ellipse", [0.1, 0.1], [0.4, 0.3], true, 79.32719794645432),
  // A 10 ft circle: π × 10 = 31.415927 LF, π × 5² = 78.539816 SF.
  sq("pen-circle-10-linear-ortho-on", "lf", "ellipse", [0.2, 0.2], [0.3, 0.3], true, Math.PI * 10),
  sq("pen-circle-10-linear-ortho-off", "lf", "ellipse", [0.2, 0.2], [0.3, 0.3], false, Math.PI * 10),
  sq("pen-circle-10-area-ortho-on", "sf", "ellipse", [0.2, 0.2], [0.3, 0.3], true, Math.PI * 25),
  sq("pen-circle-10-area-ortho-off", "sf", "ellipse", [0.2, 0.2], [0.3, 0.3], false, Math.PI * 25),
  ...arcRows(true),
  ...arcRows(false),
  // A landscape page, where a page fraction is not the same length both ways.
  { id: "pen-rect-landscape-20x30-ortho-on", tool: "sf", mode: "rectangle", page: LANDSCAPE, fpp: 0.25, a: [0.1, 0.1], b: [0.1 + 80 / 1224, 0.1 + 120 / 792], ortho: true, expect: 600 },
  { id: "pen-rect-landscape-30x20-ortho-on", tool: "sf", mode: "rectangle", page: LANDSCAPE, fpp: 0.25, a: [0.1, 0.1], b: [0.1 + 120 / 1224, 0.1 + 80 / 792], ortho: true, expect: 600 },
  // The control: a run's edge still goes onto the 45° ray, at the pen's distance.
  { ...sq("pen-run-ortho-on-still-45", "lf", "continuous", [0.1, 0.1], [0.3, 0.25], true, 25), end: [0.1 + 0.25 / Math.SQRT2, 0.1 + 0.25 / Math.SQRT2] },
];

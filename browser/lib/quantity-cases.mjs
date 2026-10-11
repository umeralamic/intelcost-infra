// The shared table for F7-S2 (D-61): shapes and the figures both engines must give.
//
// Each row is one sheet's shapes of one item: `type` (lf, sf, count), `page` in points,
// `fpp` feet per point, and `shapes`, each `{ vertices, meta, role }` in normalised page
// units. `expect`, where given, is the exact figure worked by hand. `crossing` rows have a
// deduct across an edge: only the api clips (the browser returns null until F7-S18).

const SQUARE = [1000, 1000];
const LANDSCAPE = [1224, 792];
const PORTRAIT = [792, 1224];

const ellipse = (cx, cy, rx, ry) => ({ vertices: [], meta: { kind: "ellipse", cx, cy, rx, ry } });
const rect = (x0, y0, x1, y1, closedLinear = false) => {
  const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  return { vertices: closedLinear ? [...corners, corners[0]] : corners, meta: { kind: "rectangle", corners } };
};
const arc = (cx, cy, r, a0, sweep) => ({ vertices: [], meta: { kind: "arc", cx, cy, r, a0, sweep } });
/** An arc stored true (D-275): centre in page fractions, radius `rPt` in points on `page`. */
const radiiT = (cx, cy, rPt, [w, h]) => ({ cx, cy, rx: rPt / w, ry: rPt / h });
const arcT = (cx, cy, rPt, page, a0, sweep) => ({ vertices: [], meta: { kind: "arc", ...radiiT(cx, cy, rPt, page), a0, sweep } });
const poly = (points, meta = null) => ({ vertices: points, meta });
const hole = (shape) => ({ ...shape, role: "subtract" });

export const CASES = [
  // The spec's three (F7-S2 AC1, AC2), on a square page at 0.1 ft per point.
  { id: "circle-area-r10", type: "sf", page: SQUARE, fpp: 0.1, shapes: [ellipse(0.5, 0.5, 0.1, 0.1)], expect: Math.PI * 100 },
  { id: "rect-linear-10x20", type: "lf", page: SQUARE, fpp: 0.1, shapes: [rect(0.2, 0.2, 0.3, 0.4, true)], expect: 60 },
  { id: "circle-linear-d10", type: "lf", page: SQUARE, fpp: 0.1, shapes: [ellipse(0.5, 0.5, 0.05, 0.05)], expect: Math.PI * 10 },
  // A true circle on a landscape page is unequal in page units (legacy's `circle` trap).
  { id: "circle-landscape", type: "lf", page: LANDSCAPE, fpp: 0.25, shapes: [ellipse(0.5, 0.5, 40 / 1224, 40 / 792)], expect: 2 * Math.PI * 10 },
  { id: "circle-landscape-area", type: "sf", page: LANDSCAPE, fpp: 0.25, shapes: [ellipse(0.5, 0.5, 40 / 1224, 40 / 792)], expect: Math.PI * 100 },
  { id: "arc-quarter", type: "lf", page: SQUARE, fpp: 0.1, shapes: [arc(0.5, 0.5, 0.2, 0, Math.PI / 2)], expect: 0.2 * 1000 * (Math.PI / 2) * 0.1 },
  { id: "arc-negative-sweep", type: "lf", page: SQUARE, fpp: 0.1, shapes: [arc(0.5, 0.5, 0.2, 1, -Math.PI)], expect: 0.2 * 1000 * Math.PI * 0.1 },
  { id: "arc-landscape", type: "lf", page: LANDSCAPE, fpp: 1 / 6, shapes: [arc(0.4, 0.4, 0.1, 0, Math.PI)] },
  { id: "rect-area", type: "sf", page: LANDSCAPE, fpp: 1 / 6, shapes: [rect(0.1, 0.1, 0.6, 0.5)] },
  { id: "rect-linear-portrait", type: "lf", page: PORTRAIT, fpp: 1 / 6, shapes: [rect(0.1, 0.1, 0.6, 0.5, true)] },
  // Deducts wholly inside: their own analytic area comes off.
  { id: "rect-less-circle", type: "sf", page: SQUARE, fpp: 0.1, shapes: [rect(0.1, 0.1, 0.9, 0.9), hole(ellipse(0.5, 0.5, 0.1, 0.1))], expect: 6400 - Math.PI * 100 },
  { id: "rect-less-rect", type: "sf", page: SQUARE, fpp: 0.1, shapes: [rect(0.1, 0.1, 0.9, 0.9), hole(rect(0.4, 0.4, 0.6, 0.6))], expect: 6400 - 400 },
  { id: "two-sections-one-hole", type: "sf", page: LANDSCAPE, fpp: 0.25, shapes: [rect(0.05, 0.05, 0.3, 0.3), rect(0.5, 0.5, 0.9, 0.9), hole(ellipse(0.7, 0.7, 0.05, 0.05))] },
  { id: "circle-less-circle", type: "sf", page: SQUARE, fpp: 0.1, shapes: [ellipse(0.5, 0.5, 0.3, 0.3), hole(ellipse(0.5, 0.5, 0.1, 0.1))], expect: Math.PI * 900 - Math.PI * 100 },
  { id: "polygon-less-triangle", type: "sf", page: PORTRAIT, fpp: 1 / 6, shapes: [poly([[0.1, 0.1], [0.8, 0.15], [0.7, 0.8], [0.15, 0.7]]), hole(poly([[0.4, 0.4], [0.5, 0.4], [0.45, 0.5]]))] },
  // Crossing an edge: clipped against the union, once (api only).
  { id: "cross-rect", type: "sf", page: SQUARE, fpp: 0.1, crossing: true, shapes: [rect(0, 0, 0.4, 0.4), hole(rect(0.3, 0.3, 0.5, 0.5))], expect: 1600 - 100 },
  { id: "cross-two-sections", type: "sf", page: SQUARE, fpp: 0.1, crossing: true, shapes: [rect(0, 0, 0.4, 0.4), rect(0.4, 0, 0.8, 0.4), hole(rect(0.3, 0.1, 0.5, 0.2))], expect: 3200 - 200 },
  // Two holes overlapping merge, and the overlap comes off once (legacy's merge).
  { id: "overlapping-holes", type: "sf", page: SQUARE, fpp: 0.1, crossing: true, shapes: [rect(0.1, 0.1, 0.9, 0.9), hole(rect(0.2, 0.2, 0.4, 0.4)), hole(rect(0.3, 0.2, 0.5, 0.4))], expect: 6400 - 600 },
  { id: "outside-entirely", type: "sf", page: SQUARE, fpp: 0.1, crossing: true, shapes: [rect(0, 0, 0.4, 0.4), hole(rect(0.6, 0.6, 0.8, 0.8))], expect: 1600 },
  // Inline arcs (F7-S9, D-39 Q5): the edge from vertex i bends along its circle.
  { id: "arc-run-half-circle", type: "lf", page: SQUARE, fpp: 0.1, shapes: [poly([[0.3, 0.5], [0.5, 0.5]], { arcs: [{ i: 0, cx: 0.4, cy: 0.5, r: 0.1, a0: Math.PI, sweep: Math.PI }] })], expect: Math.PI * 10 },
  { id: "arc-run-and-straight", type: "lf", page: SQUARE, fpp: 0.1, shapes: [poly([[0.3, 0.5], [0.5, 0.5], [0.6, 0.5]], { arcs: [{ i: 0, cx: 0.4, cy: 0.5, r: 0.1, a0: Math.PI, sweep: Math.PI }] })], expect: Math.PI * 10 + 10 },
  { id: "arc-area-half-disc", type: "sf", page: SQUARE, fpp: 0.1, shapes: [poly([[0.3, 0.5], [0.5, 0.5]], { closed: true, arcs: [{ i: 1, cx: 0.4, cy: 0.5, r: 0.1, a0: 0, sweep: Math.PI }] })], expect: (Math.PI * 100) / 2 },
  { id: "arc-area-landscape", type: "sf", page: LANDSCAPE, fpp: 0.25, shapes: [poly([[0.3, 0.5], [0.5, 0.5], [0.5, 0.7]], { closed: true, arcs: [{ i: 2, cx: 0.4, cy: 0.6, r: Math.hypot(0.1, 0.1), a0: Math.atan2(0.1, 0.1), sweep: Math.PI }] })] },
  { id: "arc-run-landscape", type: "lf", page: LANDSCAPE, fpp: 1 / 6, shapes: [poly([[0.2, 0.2], [0.4, 0.2], [0.5, 0.3]], { arcs: [{ i: 1, cx: 0.4, cy: 0.3, r: 0.1, a0: -Math.PI / 2, sweep: Math.PI / 2 }] })] },
  // Arcs stored true (D-275): a circle in feet, rx·W = ry·H. A quarter of a 20 ft radius on
  // C-200's page at 1" = 30' is 10π ft, and the same on a square page.
  { id: "arc-true-c200-quarter-r20", type: "lf", page: [2448, 1584], fpp: 30 / 72, shapes: [arcT(0.5, 0.5, 48, [2448, 1584], 0, Math.PI / 2)], expect: 10 * Math.PI },
  { id: "arc-true-square-quarter-r20", type: "lf", page: [1584, 1584], fpp: 30 / 72, shapes: [arcT(0.5, 0.5, 48, [1584, 1584], 0, Math.PI / 2)], expect: 10 * Math.PI },
  // Inline arcs stored true on a landscape page: a half circle of 10 ft radius, as a run and
  // closed as a half disc.
  { id: "arc-true-run-landscape", type: "lf", page: LANDSCAPE, fpp: 0.25, shapes: [poly([[0.5 - 40 / 1224, 0.5], [0.5 + 40 / 1224, 0.5]], { arcs: [{ i: 0, ...radiiT(0.5, 0.5, 40, LANDSCAPE), a0: Math.PI, sweep: Math.PI }] })], expect: 10 * Math.PI },
  { id: "arc-true-area-landscape", type: "sf", page: LANDSCAPE, fpp: 0.25, shapes: [poly([[0.5 - 40 / 1224, 0.5], [0.5 + 40 / 1224, 0.5]], { closed: true, arcs: [{ i: 1, ...radiiT(0.5, 0.5, 40, LANDSCAPE), a0: 0, sweep: Math.PI }] })], expect: 50 * Math.PI },
  { id: "count-marks", type: "count", page: SQUARE, fpp: 0.1, shapes: [poly([[0.1, 0.1], [0.2, 0.2], [0.3, 0.3]])], expect: 3 },
  // The item's modifiers (`mods`) on the measured figure (D-360). A 27 ft run, a 10 × 27 ft area.
  // A wall: 27 LF × 8 ft = 216 SF.
  { id: "mod-height-wall", type: "lf", page: SQUARE, fpp: 0.1, shapes: [poly([[0.1, 0.5], [0.37, 0.5]])], mods: { heightFt: 8 }, expect: 216 },
  // A footing: 27 LF × 2 ft × 1 ft = 54 CF = 2 CY.
  { id: "mod-volume-run", type: "lf", page: SQUARE, fpp: 0.1, shapes: [poly([[0.1, 0.5], [0.37, 0.5]])], mods: { volumeWidthFt: 2, volumeDepthFt: 1 }, expect: 2 },
  // A trench 1'-6" wide, 6" deep: 27 × 1.5 × 0.5 = 20.25 CF = 0.75 CY.
  { id: "mod-volume-run-inches", type: "lf", page: SQUARE, fpp: 0.1, shapes: [poly([[0.1, 0.5], [0.37, 0.5]])], mods: { volumeWidthFt: 1.5, volumeDepthFt: 0.5 }, expect: 0.75 },
  // A slab: 270 SF × 1 ft = 270 CF = 10 CY.
  { id: "mod-volume-area", type: "sf", page: SQUARE, fpp: 0.1, shapes: [rect(0.1, 0.1, 0.2, 0.37)], mods: { volumeDepthFt: 1 }, expect: 10 },
  // A slab 4" deep on a slope ×1.25: 270 × 1.25 × (1/3) / 27 = 4.1666… CY.
  { id: "mod-volume-area-slope", type: "sf", page: SQUARE, fpp: 0.1, shapes: [rect(0.1, 0.1, 0.2, 0.37)], mods: { pitchFactor: 1.25, volumeDepthFt: 1 / 3 }, expect: (270 * 1.25) / 3 / 27 },
  // A slab with a 5 × 5 ft deduct: (270 − 25) × 1 / 27 CY.
  { id: "mod-volume-area-deduct", type: "sf", page: SQUARE, fpp: 0.1, shapes: [rect(0.1, 0.1, 0.2, 0.37), hole(rect(0.12, 0.12, 0.17, 0.17))], mods: { volumeDepthFt: 1 }, expect: 245 / 27 },
  // Height and volume exclude each other; were both stored, the height stands (LF → SF).
  { id: "mod-height-over-volume", type: "lf", page: SQUARE, fpp: 0.1, shapes: [poly([[0.1, 0.5], [0.37, 0.5]])], mods: { heightFt: 8, volumeWidthFt: 2, volumeDepthFt: 1 }, expect: 216 },
];

// A few hundred more, generated the same way every run (a fixed seed), across page shapes.
let seed = 20260927;
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pages = [SQUARE, LANDSCAPE, PORTRAIT];
for (let i = 0; i < 300; i++) {
  const page = pages[i % 3];
  const fpp = [0.1, 0.25, 1 / 6, 1 / 48][i % 4];
  const cx = 0.3 + rand() * 0.4;
  const cy = 0.3 + rand() * 0.4;
  const rx = 0.05 + rand() * 0.2;
  const ry = 0.05 + rand() * 0.2;
  const k = i % 5;
  if (k === 0) CASES.push({ id: `gen-ellipse-lf-${i}`, type: "lf", page, fpp, shapes: [ellipse(cx, cy, rx, ry)] });
  if (k === 1) CASES.push({ id: `gen-ellipse-sf-${i}`, type: "sf", page, fpp, shapes: [ellipse(cx, cy, rx, ry)] });
  if (k === 2) CASES.push({ id: `gen-arc-${i}`, type: "lf", page, fpp, shapes: [arc(cx, cy, rx, rand() * 6, (rand() - 0.5) * 12)] });
  if (k === 3) CASES.push({ id: `gen-rect-hole-${i}`, type: "sf", page, fpp, shapes: [rect(cx - rx, cy - ry, cx + rx, cy + ry), hole(ellipse(cx, cy, rx / 3, ry / 3))] });
  if (k === 4) CASES.push({ id: `gen-rect-lf-${i}`, type: "lf", page, fpp, shapes: [rect(cx - rx, cy - ry, cx + rx, cy + ry, true)] });
}

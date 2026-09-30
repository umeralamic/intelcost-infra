// F12's rows in the shared quantity table (D-78, D-136): the app's own lib/takeoff/earthwork
// on legacy's hand-worked fixtures (`earthwork/tin/__tests__/tin.test.ts`,
// `volume/__tests__/{volume,e4}.test.ts`, `__tests__/siteFeatures.test.ts`) and on the shrink
// rows of D-136 Q31, each against the answer worked by hand. Only the fields in `expect` are
// compared; numbers to 1e-9 relative.
//
// A run is { item, label, kind: "contour" | "spot_elevation" | "boundary", surface, elevation,
// points: [[x, y], …] } in fractions of the page, elevation in feet.

const c = (item, label, surface, elevation, points) => ({ item, label, kind: "contour", surface, elevation, points });
const s = (item, label, surface, elevation, x, y) => ({ item, label, kind: "spot_elevation", surface, elevation, points: [[x, y]] });
const b = (points) => ({ item: "boundary", label: "Work Boundary", kind: "boundary", surface: null, elevation: null, points });

export const EARTHWORK_CASES = [
  // --- Block B: the TIN (legacy's tin.test.ts) -----------------------------------------
  {
    id: "tin-min-points",
    kind: "tin",
    surface: "EG",
    runs: [s("a", "EG a", "EG", 100, 0.1, 0.1), s("b", "EG b", "EG", 101, 0.9, 0.1)],
    expect: { ok: false, code: "min_points", message: "Need at least 3 points to triangulate — have 2." },
  },
  { id: "tin-absent", kind: "tin", surface: "FG", runs: [s("a", "EG a", "EG", 100, 0.1, 0.1)], expect: { ok: "absent" } },
  {
    id: "tin-collinear",
    kind: "tin",
    surface: "EG",
    runs: [s("a", "EG a", "EG", 100, 0.1, 0.1), s("b", "EG b", "EG", 101, 0.5, 0.5), s("c", "EG c", "EG", 102, 0.9, 0.9)],
    expect: { ok: false, code: "collinear", message: "All points are collinear — cannot triangulate." },
  },
  {
    id: "tin-flat-warning",
    kind: "tin",
    surface: "EG",
    runs: [s("a", "EG a", "EG", 100, 0.1, 0.1), s("b", "EG b", "EG", 100, 0.9, 0.1), s("c", "EG c", "EG", 100, 0.5, 0.9)],
    expect: { ok: true, warnings: ["flat_surface", "no_boundary"] },
  },
  {
    id: "tin-merge-inside-tolerance",
    kind: "tin",
    surface: "EG",
    runs: [s("a", "EG a", "EG", 100, 0.1, 0.1), s("a2", "EG a2", "EG", 100, 0.1 + 4.9e-5, 0.1), s("b", "EG b", "EG", 105, 0.9, 0.1), s("c", "EG c", "EG", 110, 0.5, 0.9)],
    expect: { ok: true, points: 3 },
  },
  {
    id: "tin-keep-outside-tolerance",
    kind: "tin",
    surface: "EG",
    runs: [s("a", "EG a", "EG", 100, 0.1, 0.1), s("a2", "EG a2", "EG", 100, 0.1, 0.1 + 5.1e-5), s("b", "EG b", "EG", 105, 0.9, 0.1), s("c", "EG c", "EG", 110, 0.5, 0.9)],
    expect: { ok: true, points: 4 },
  },
  {
    id: "tin-elevation-conflict",
    kind: "tin",
    surface: "EG",
    runs: [s("A", "EG 100", "EG", 100, 0.5, 0.5), s("B", "EG 105", "EG", 105, 0.5, 0.5), s("c", "EG c", "EG", 101, 0.1, 0.1), s("d", "EG d", "EG", 102, 0.9, 0.2)],
    expect: { ok: false, code: "elevation_conflict", message: "EG: Conflicting elevations at the same location: EG 105 run 1 (Z=105) vs EG 100 run 1 (Z=100)." },
  },
  {
    id: "tin-crossing-contours",
    kind: "tin",
    surface: "EG",
    runs: [c("A", "EG 100", "EG", 100, [[0, 0], [1, 1]]), c("B", "EG 105", "EG", 105, [[0, 1], [1, 0]])],
    expect: { ok: false, code: "crossing_constraints", message: "EG: EG 100 (run 1) crosses EG 105 (run 1) — contours must not intersect.", crossingRuns: 2 },
  },
  {
    id: "tin-self-intersecting",
    kind: "tin",
    surface: "EG",
    runs: [c("A", "EG 100", "EG", 100, [[0, 0], [1, 1], [1, 0], [0, 1]]), s("x", "EG x", "EG", 104, 0.5, 0.95)],
    expect: { ok: false, code: "self_intersecting_contour", message: "EG: EG 100 (run 1) crosses itself — edit the trace so it does not self-intersect.", crossingRuns: 1 },
  },
  {
    id: "tin-diagonal-constraint-kept",
    kind: "tin",
    surface: "EG",
    runs: [c("diag", "EG diag", "EG", 100, [[0, 0], [1, 1]]), s("s1", "EG s1", "EG", 105, 1, 0), s("s2", "EG s2", "EG", 105, 0, 1)],
    expect: { ok: true, triangles: 2, constraintsKept: true },
  },
  {
    id: "tin-parallel-contours-kept",
    kind: "tin",
    surface: "EG",
    runs: [c("c100", "EG 100", "EG", 100, [[0.1, 0.2], [0.5, 0.25], [0.9, 0.2]]), c("c105", "EG 105", "EG", 105, [[0.1, 0.8], [0.5, 0.75], [0.9, 0.8]])],
    expect: { ok: true, constraints: 4, constraintsKept: true },
  },
  {
    id: "tin-no-boundary-warning",
    kind: "tin",
    surface: "EG",
    runs: [s("s1", "EG s1", "EG", 100, 0.1, 0.1), s("s2", "EG s2", "EG", 105, 0.9, 0.1), s("s3", "EG s3", "EG", 110, 0.5, 0.9)],
    expect: { ok: true, warnings: ["no_boundary"] },
  },
  {
    id: "tin-points-outside-boundary",
    kind: "tin",
    surface: "EG",
    runs: [s("s1", "EG s1", "EG", 100, 0.3, 0.5), s("s2", "EG s2", "EG", 105, 0.7, 0.4), s("s3", "EG s3", "EG", 110, 0.95, 0.05), b([[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]])],
    expect: { ok: true, outside: 1 },
  },
];

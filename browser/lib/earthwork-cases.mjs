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
const UNIT = [[0, 0], [1, 0], [1, 1], [0, 1]];
const PAVEMENT = [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]];
/** Spots at the unit square's corners SW, SE, NE, NW (legacy's order). */
const corners = (surface, z) =>
  [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y], i) => s(`${surface.toLowerCase()}${i + 1}`, `${surface.toLowerCase()}${i + 1}`, surface, z[i], x, y));
/** Legacy's flat pad: EG and FG flat at the corners, the boundary the unit square. */
const pad = (eg, fg, withBoundary = true) => [...corners("EG", [eg, eg, eg, eg]), ...corners("FG", [fg, fg, fg, fg]), ...(withBoundary ? [b(UNIT)] : [])];

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
  // --- Block C: cut and fill (legacy's volume.test.ts and e4.test.ts) -------------------
  // side: feet per point on a 1 x 1 point page, so the unit square is side x side feet.
  { id: "vol-f1-flat-pad", kind: "volume", side: 100, boundary: UNIT, runs: pad(100, 105), expect: { ok: true, cutCY: 0, fillCY: 50000 / 27, netCY: 50000 / 27 } },
  {
    id: "vol-f2-one-corner-up",
    kind: "volume",
    side: 30,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 106, 100]), ...corners("FG", [103, 103, 103, 103])],
    expect: { ok: true, fillCY: 1125 / 27, cutCY: 225 / 27, netCY: 900 / 27 },
  },
  {
    id: "vol-f3-mixed-triangle-split",
    kind: "volume",
    side: 30,
    boundary: [[0, 0], [1, 0], [0.5, 1]],
    runs: [s("egA", "egA", "EG", 100, 0, 0), s("egB", "egB", "EG", 100, 1, 0), s("egC", "egC", "EG", 100, 0.5, 1), s("fgA", "fgA", "FG", 103, 0, 0), s("fgB", "fgB", "FG", 103, 1, 0), s("fgC", "fgC", "FG", 97, 0.5, 1)],
    expect: { ok: true, fillCY: 562.5 / 27, cutCY: 112.5 / 27, netCY: 450 / 27 },
  },
  {
    id: "vol-f4-prism-in-cube",
    kind: "volume",
    side: 10,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [100, 100, 100, 100]), s("i1", "i1", "FG", 103, 0.25, 0.25), s("i2", "i2", "FG", 103, 0.75, 0.25), s("i3", "i3", "FG", 103, 0.75, 0.75), s("i4", "i4", "FG", 103, 0.25, 0.75)],
    expect: { ok: true, cutCY: 0, fillWithin: true },
    fillWithin: [75 / 27, 300 / 27],
  },
  { id: "vol-f5-inner-boundary", kind: "volume", side: 20, boundary: [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]], runs: pad(100, 105, false), expect: { ok: true, fillCY: 500 / 27, cutCY: 0 } },
  { id: "vol-f6-absent-surface", kind: "volume", side: 100, boundary: UNIT, runs: corners("EG", [100, 100, 100, 100]), expect: { ok: "absent" } },
  {
    id: "vol-f7-no-boundary",
    kind: "volume",
    side: 100,
    boundary: null,
    runs: [s("e1", "e1", "EG", 100, 0, 0), s("e2", "e2", "EG", 100, 1, 0), s("e3", "e3", "EG", 100, 0.5, 1), s("f1", "f1", "FG", 105, 0, 0), s("f2", "f2", "FG", 105, 1, 0), s("f3", "f3", "FG", 105, 0.5, 1)],
    expect: { ok: false, code: "missing_boundary", message: "Boundary required to compute volumes — draw a boundary polygon on this sheet." },
  },
  {
    id: "vol-f8-partial-coverage",
    kind: "volume",
    side: 20,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), s("f1", "f1", "FG", 105, 0.25, 0.25), s("f2", "f2", "FG", 105, 0.75, 0.25), s("f3", "f3", "FG", 105, 0.75, 0.75), s("f4", "f4", "FG", 105, 0.25, 0.75)],
    expect: {
      ok: true,
      fillCY: 500 / 27,
      cutCY: 0,
      coverage: 0.25,
      coverageSurfaces: ["FG"],
      coverageMessage: "Volumes cover 25% of the area within the boundary; EG or FG doesn't extend to the limit of work. Adjust boundary or contours as required.",
    },
  },
  {
    id: "vol-f9-contours-cross",
    kind: "volume",
    side: 30,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [103, 103, 103, 103]), c("egc", "egc", "EG", 100, [[0.2, 0.5], [0.8, 0.5]]), c("fgc", "fgc", "FG", 103, [[0.5, 0.2], [0.5, 0.8]])],
    vertices: [[0.5, 0.5]],
    expect: { ok: true, fillCY: 100, cutCY: 0, vertices: [true] },
  },
  {
    id: "vol-f10-serpentine",
    kind: "volume",
    side: 30,
    boundary: UNIT,
    runs: [
      ...corners("EG", [100, 100, 100, 100]),
      ...corners("FG", [103, 103, 103, 103]),
      c("egH", "egH", "EG", 100, [[0.05, 0.5], [0.95, 0.5]]),
      c("fgS", "fgS", "FG", 103, [[0.1, 0.2], [0.25, 0.8], [0.5, 0.2], [0.75, 0.8], [0.9, 0.2]]),
    ],
    vertices: [[0.175, 0.5], [0.375, 0.5], [0.625, 0.5], [0.825, 0.5]],
    expect: { ok: true, fillCY: 100, cutCY: 0, vertices: [true, true, true, true] },
  },
  {
    id: "vol-f11-t-junction",
    kind: "volume",
    side: 30,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [103, 103, 103, 103]), c("egH", "egH", "EG", 100, [[0.1, 0.5], [0.9, 0.5]]), c("fgT", "fgT", "FG", 103, [[0.5, 0.5], [0.5, 0.9]])],
    vertices: [[0.5, 0.5]],
    expect: { ok: true, fillCY: 100, cutCY: 0, vertices: [true] },
  },
  {
    // D-136 Q30: a spot of one surface on the other's contour splits it (legacy: an engine failure).
    id: "vol-q30-spot-on-contour",
    kind: "volume",
    side: 30,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [103, 103, 103, 103]), c("egH", "egH", "EG", 100, [[0.1, 0.5], [0.9, 0.5]]), s("fgS", "fgS", "FG", 103, 0.5, 0.5)],
    vertices: [[0.5, 0.5]],
    expect: { ok: true, fillCY: 100, cutCY: 0, vertices: [true] },
  },
  { id: "vol-metric-pad", kind: "volume", side: 100 / 0.3048, units: "m3", boundary: UNIT, runs: pad(0, 1.5 / 0.3048), expect: { ok: true, units: "m3", fillCY: 15000, cutCY: 0 } },
  { id: "vol-imperial-same-pad", kind: "volume", side: 100 / 0.3048, boundary: UNIT, runs: pad(0, 1.5 / 0.3048), expect: { ok: true, units: "CY", fillCY: ((100 / 0.3048) ** 2 * (1.5 / 0.3048)) / 27 } },
  {
    id: "vol-strip-remaining-site",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: pad(100, 100),
    stripAreas: [{ id: "remaining", label: "Remaining Site within Boundary", depthFt: 0.5, polygons: [UNIT], excludedPolygons: [[[0, 0], [0.25, 0], [0.25, 1], [0, 1]]] }],
    expect: { ok: true, "strip:0:areaSF": 7500, "strip:0:volumeCY": 3750 / 27, fillCY: 3750 / 27, cutCY: 0 },
  },
  {
    id: "vol-e4-f1-strip-whole",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: pad(100, 100),
    stripFt: 0.5,
    expect: { ok: true, stripCY: 5000 / 27, fillCY: 5000 / 27, cutCY: 0, "region:remainder:fillCY": 5000 / 27, regions: 1 },
  },
  {
    id: "vol-e4-f2a-strip-equals-depth",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: pad(100, 100),
    stripFt: 0.5,
    roleAreas: [{ itemId: "pavement", label: "Pavement", depthFt: 0.5, polygon: PAVEMENT }],
    expect: { ok: true, cutCY: 0, fillCY: 3750 / 27, "region:pavement:fillCY": 0, "region:pavement:cutCY": 0, "region:remainder:fillCY": 3750 / 27 },
  },
  {
    id: "vol-e4-f2b-strip-deeper",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: pad(100, 100),
    stripFt: 8 / 12,
    roleAreas: [{ itemId: "p", label: "Pavement", depthFt: 0.5, polygon: PAVEMENT }],
    expect: { ok: true, cutCY: 0, fillCY: (2500 * (8 / 12 - 0.5) + 7500 * (8 / 12)) / 27, "region:p:fillCY": (2500 * (8 / 12 - 0.5)) / 27, stripCY: (10000 * (8 / 12)) / 27 },
  },
  {
    id: "vol-e4-f2c-strip-shallower",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: pad(100, 100),
    stripFt: 4 / 12,
    roleAreas: [{ itemId: "p", label: "Pavement", depthFt: 0.5, polygon: PAVEMENT }],
    expect: { ok: true, cutCY: 2500 / 6 / 27, fillCY: 2500 / 27, "region:p:cutCY": 2500 / 6 / 27 },
  },
  {
    id: "vol-e4-f3-two-features",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: pad(100, 100),
    stripFt: 0.5,
    roleAreas: [
      { itemId: "det", label: "Detention Pond", depthFt: 1, polygon: [[0.05, 0.05], [0.35, 0.05], [0.35, 0.35], [0.05, 0.35]] },
      { itemId: "park", label: "Parking Lot", depthFt: 8 / 12, polygon: [[0.5, 0.5], [0.9, 0.5], [0.9, 0.9], [0.5, 0.9]] },
    ],
    expect: { ok: true, cutCY: 450 / 27 + 1600 / 6 / 27, fillCY: 3750 / 27, "region:det:cutCY": 450 / 27, "region:park:cutCY": 1600 / 6 / 27, "region:remainder:fillCY": 3750 / 27, regionsSumToTotals: true },
  },
  {
    id: "vol-e4-f4-feature-straddles",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: pad(100, 100),
    stripFt: 0.5,
    roleAreas: [{ itemId: "s", label: "Straddle", depthFt: 0.5, polygon: [[-0.5, 0.25], [0.5, 0.25], [0.5, 0.75], [-0.5, 0.75]] }],
    expect: { ok: true, cutCY: 0, fillCY: 3750 / 27, "region:s:fillCY": 0 },
  },
  {
    id: "vol-e4-f6-overlap-top-wins",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: pad(100, 100),
    stripFt: 0.5,
    roleAreas: [
      { itemId: "A", label: "Top", depthFt: 1, polygon: [[0.2, 0.2], [0.7, 0.2], [0.7, 0.7], [0.2, 0.7]] },
      { itemId: "B", label: "Bottom", depthFt: 0.5, polygon: [[0.4, 0.4], [0.9, 0.4], [0.9, 0.9], [0.4, 0.9]] },
    ],
    expect: { ok: true, cutCY: 1250 / 27, fillCY: 2950 / 27, "region:A:cutCY": 1250 / 27, "region:B:cutCY": 0, overlap: [["Top", "Bottom"]] },
  },
  {
    id: "vol-e4-f7-concave-boundary",
    kind: "volume",
    side: 100,
    boundary: [[0, 0], [1, 0], [1, 1], [0.6, 1], [0.6, 0.4], [0.4, 0.4], [0.4, 1], [0, 1]],
    runs: [s("e1", "e1", "EG", 100, -1, -1), s("e2", "e2", "EG", 100, 3, -1), s("e3", "e3", "EG", 100, 1, 3), s("f1", "f1", "FG", 101, -1, -1), s("f2", "f2", "FG", 101, 3, -1), s("f3", "f3", "FG", 101, 1, 3)],
    expect: { ok: true, cutCY: 0, fillCY: 8800 / 27 },
  },
  // --- The soil balance (D-136 Q31) -----------------------------------------------------
  // Shrink 1: legacy's balance exactly (legacy's siteFeatures.test.ts, swell 1.25).
  { id: "bal-legacy-import", kind: "balance", input: { cut: 100, fill: 300, reuseBank: 50, suitable: true, swell: 1.25, shrink: 1 }, expect: { exportLoose: null, importLoose: 187.5 } },
  { id: "bal-legacy-export", kind: "balance", input: { cut: 300, fill: 100, reuseBank: 50, suitable: true, swell: 1.25, shrink: 1 }, expect: { exportLoose: 312.5, importLoose: null } },
  { id: "bal-legacy-haul-off", kind: "balance", input: { cut: 300, fill: 100, reuseBank: 0, suitable: true, swell: 1.25, shrink: 1 }, expect: { exportLoose: 250, importLoose: null } },
  // Shrink 0.9 (Q31, by hand):
  // suitable, C 300 F 100: net = 300 x 0.9 - 100 = 170 compacted; 170 / 0.9 = 188.888... bank; x 1.25.
  { id: "bal-shrink-suitable-export", kind: "balance", input: { cut: 300, fill: 100, reuseBank: 0, suitable: true, swell: 1.25, shrink: 0.9 }, expect: { exportLoose: (170 / 0.9) * 1.25, importLoose: null } },
  // suitable, C 100 F 300 R 50: net = 150 x 0.9 - 300 = -165; 165 / 0.9 x 1.25 = 229.1666...
  { id: "bal-shrink-suitable-import", kind: "balance", input: { cut: 100, fill: 300, reuseBank: 50, suitable: true, swell: 1.25, shrink: 0.9 }, expect: { exportLoose: null, importLoose: (165 / 0.9) * 1.25 } },
  // not suitable, C 100 F 300 R 50: need = 300 - 45 = 255; import 255 / 0.9 x 1.25; export 100 x 1.25.
  { id: "bal-shrink-unsuitable-both", kind: "balance", input: { cut: 100, fill: 300, reuseBank: 50, suitable: false, swell: 1.25, shrink: 0.9 }, expect: { exportLoose: 125, importLoose: (255 / 0.9) * 1.25 } },
  // not suitable, C 300 F 20 R 50: need = 20 - 45 = -25 (re-use left over); export (300 + 25 / 0.9) x 1.25.
  { id: "bal-shrink-unsuitable-surplus", kind: "balance", input: { cut: 300, fill: 20, reuseBank: 50, suitable: false, swell: 1.25, shrink: 0.9 }, expect: { exportLoose: (300 + 25 / 0.9) * 1.25, importLoose: null } },
  // suitable, C 100 F 90: 100 x 0.9 = 90 fills 90 exactly: neither line (legacy, unshrunk, would export 12.5).
  { id: "bal-shrink-exact-balance", kind: "balance", input: { cut: 100, fill: 90, reuseBank: 0, suitable: true, swell: 1.25, shrink: 0.9 }, expect: { exportLoose: null, importLoose: null } },
];

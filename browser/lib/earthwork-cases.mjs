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
/** Points along a circular arc in sheet points (legacy's stitch.test.ts stand-in for a
 *  curving contour). */
const arc = (cx, cy, r, a0, a1, n = 20) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(a0 + ((a1 - a0) * i) / n), cy + r * Math.sin(a0 + ((a1 - a0) * i) / n)]);
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
  // Shrink typed as printed (D-177): "fill needs x more cut", k bank per compacted. These rows
  // were worked in the old bank-to-compacted form s = 0.9, so k = 1 / 0.9; the answers are
  // the same numbers. A compacted CY of fill needs 1 / 0.9 = 1.111... bank.
  // suitable, C 300 F 100: surplus = 300 - 100 / 0.9 = 188.888... bank; x 1.25.
  { id: "bal-shrink-suitable-export", kind: "balance", input: { cut: 300, fill: 100, reuseBank: 0, suitable: true, swell: 1.25, shrink: 1 / 0.9 }, expect: { exportLoose: (170 / 0.9) * 1.25, importLoose: null, exportBank: 170 / 0.9 } },
  // suitable, C 100 F 300 R 50: surplus = 150 - 300 / 0.9 = -183.333... = -165 / 0.9; x 1.25 = 229.1666...
  { id: "bal-shrink-suitable-import", kind: "balance", input: { cut: 100, fill: 300, reuseBank: 50, suitable: true, swell: 1.25, shrink: 1 / 0.9 }, expect: { exportLoose: null, importLoose: (165 / 0.9) * 1.25, importBank: 165 / 0.9 } },
  // not suitable, C 100 F 300 R 50: need = 300 / 0.9 - 50 = 255 / 0.9 bank; import x 1.25; export 100 x 1.25.
  { id: "bal-shrink-unsuitable-both", kind: "balance", input: { cut: 100, fill: 300, reuseBank: 50, suitable: false, swell: 1.25, shrink: 1 / 0.9 }, expect: { exportLoose: 125, importLoose: (255 / 0.9) * 1.25 } },
  // not suitable, C 300 F 20 R 50: need = 20 / 0.9 - 50 = -25 / 0.9 (re-use left over); export (300 + 25 / 0.9) x 1.25.
  { id: "bal-shrink-unsuitable-surplus", kind: "balance", input: { cut: 300, fill: 20, reuseBank: 50, suitable: false, swell: 1.25, shrink: 1 / 0.9 }, expect: { exportLoose: (300 + 25 / 0.9) * 1.25, importLoose: null } },
  // suitable, C 100 F 90: 90 / 0.9 = 100 bank, exactly the cut: neither line (legacy, unshrunk, would export 12.5).
  { id: "bal-shrink-exact-balance", kind: "balance", input: { cut: 100, fill: 90, reuseBank: 0, suitable: true, swell: 1.25, shrink: 1 / 0.9 }, expect: { exportLoose: null, importLoose: null } },
  // The C-200 engineer's table (Hidden Valley, the founder's benchmark, D-142, D-177), typed
  // as printed: excavation 14,263 BCY, embankment 8,727 CCY, shrink 1.10, swell 1.15. The
  // embankment needs 8,727 x 1.10 = 9,599.7 BCY; the surplus is 14,263 - 9,599.7 = 4,663.3
  // BCY; it exports 4,663.3 x 1.15 = 5,362.795 LCY (5,363). The table's "net 6,803" subtracts
  // the bank 9,599.7 from the excavation's loose 16,402.45 and overstates the haul.
  { id: "bal-c200-printed", kind: "balance", input: { cut: 14263, fill: 8727, reuseBank: 0, suitable: true, swell: 1.15, shrink: 1.1 }, expect: { fillBank: 9599.7, exportBank: 4663.3, exportLoose: 5362.795, importLoose: null, importBank: null } },
  // Legacy's old form (bank to compacted, s = 1 / 1.10 = 0.9091) converted by D-177's
  // migration to k = round(1 / 0.9091, 4) = 1.1: the same export, to the cent.
  { id: "bal-c200-old-form-converted", kind: "balance", input: { cut: 14263, fill: 8727, reuseBank: 0, suitable: true, swell: 1.15, shrink: Math.round((1 / 0.9091) * 1e4) / 1e4 }, expect: { exportLoose: 5362.795 } },
  // --- Site Features (F12 Block D; legacy's siteFeatures.test.ts, and D-136 Q6, Q7) --------
  // A 10 x 20 ft rectangle on a 200 x 100 pt page at 1 ft/pt, pushed out 2 ft with square
  // corners: 14 x 24 = 336 SF (the x and y scales apart).
  { id: "sf-undercut-offset-miter", kind: "offset", ring: [[0.1, 0.2], [0.15, 0.2], [0.15, 0.4], [0.1, 0.4]], offsetFt: 2, scale: { feetPerNorm: 1, widthPt: 200, heightPt: 100 }, expect: { areaSF: 336 } },
  // Two 10 x 10 ft squares 5 ft apart, undercut 1 ft. Q6: the one drawn last (B) keeps the
  // overlap: B 100 SF, A 100 - 5 x 10 = 50 SF; volumes area x 1 ft.
  {
    id: "sf-undercut-drawn-last-wins",
    kind: "features",
    scale: { feetPerNorm: 1, widthPt: 100, heightPt: 100 },
    items: [
      { uuid: "A", name: "A", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 0, undercut_depth_ft: 1, undercut_fill_material: "Select Fill", polygons: [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]]] },
      { uuid: "B", name: "B", created_at: "2026-09-30T11:00:00Z", is_site_feature: true, role_depth_ft: 0, undercut_depth_ft: 1, undercut_fill_material: "Select Fill", polygons: [[[0.05, 0], [0.15, 0], [0.15, 0.1], [0.05, 0.1]]] },
    ],
    expect: { order: "B,A", roleAreas: "", "B:undercutSF": 100, "A:undercutSF": 50, "B:undercutCF": 100, "A:undercutCF": 50 },
  },
  // Prep on the same two, the boundary x in [0, 0.12]: B clipped to 0.05..0.12 = 7 x 10 =
  // 70 SF; A is 0..0.1 less B's 0.05..0.1 = 50 SF.
  {
    id: "sf-prep-clipped-drawn-last-wins",
    kind: "features",
    scale: { feetPerNorm: 1, widthPt: 100, heightPt: 100 },
    boundary: [[0, 0], [0.12, 0], [0.12, 1], [0, 1]],
    items: [
      { uuid: "A", name: "A", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 0.5, prep_depth_ft: 1, prep_lifts: 1, polygons: [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]]] },
      { uuid: "B", name: "B", created_at: "2026-09-30T11:00:00Z", is_site_feature: true, role_depth_ft: 0.5, prep_depth_ft: 1, prep_lifts: 1, polygons: [[[0.05, 0], [0.15, 0], [0.15, 0.1], [0.05, 0.1]]] },
    ],
    expect: { order: "B,A", roleAreas: "B,A", "B:prepSF": 70, "A:prepSF": 50 },
  },
  // Q7: depth comes only from Site Features; a plain area with a depth, a feature at depth
  // 0 (no section) and a line give grading nothing. Same times: ties by uuid, last first.
  {
    id: "sf-depth-only-from-features",
    kind: "features",
    items: [
      { uuid: "plain", name: "P", created_at: "2026-09-30T10:00:00Z", is_site_feature: false, role_depth_ft: 1, polygons: [[[0, 0], [1, 0], [1, 1]]] },
      { uuid: "copy", name: "P (Site Feature)", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 1, polygons: [[[0, 0], [1, 0], [1, 1]]] },
      { uuid: "flat", name: "Lawn", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 0, polygons: [[[0, 0], [1, 0], [1, 1]]] },
      { uuid: "line", name: "L", type: "lf", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 1, polygons: [[[0, 0], [1, 0], [1, 1]]] },
    ],
    expect: { order: "flat,copy", roleAreas: "copy" },
  },
  // Remaining Site: the unit square at 100 ft less [0, 0.25] x [0, 1] = 7500 SF.
  { id: "sf-remaining-site", kind: "remaining", boundary: [[0, 0], [1, 0], [1, 1], [0, 1]], excluded: [[[0, 0], [0.25, 0], [0.25, 1], [0, 1]]], scale: { feetPerNorm: 1, widthPt: 100, heightPt: 100 }, expect: { areaSF: 7500 } },
  // --- Strip Areas (F12 Block E): the rows as the engine takes them, and the pieces the
  // sheet draws (Q20: exactly what Calculate strips). The unit square at 100 ft. ----------
  // Two drawn strips, A older [0, 0.6]², B newer [0.4, 1]²: the newest wins, so B keeps
  // 60 x 60 = 3600 SF and A 3600 - 20 x 20 = 3200 SF. On a flat pad (EG = FG = 100) each
  // stripped foot is refilled: B 3600 x 0.5 = 1800 CF, A 3200 x 1 = 3200 CF, fill 5000/27.
  {
    id: "strips-drawn-newest-wins",
    kind: "strips",
    side: 100,
    boundary: UNIT,
    rows: [
      { uuid: "A", name: "A", depth_ft: 1, source: "drawn", vertices_json: [[0, 0], [0.6, 0], [0.6, 0.6], [0, 0.6]], created_at: "2026-09-30T10:00:00Z" },
      { uuid: "B", name: "B", depth_ft: 0.5, source: "drawn", vertices_json: [[0.4, 0.4], [1, 0.4], [1, 1], [0.4, 1]], created_at: "2026-09-30T11:00:00Z" },
    ],
    runs: pad(100, 100),
    expect: { order: "B,A", "piece:B": 3600, "piece:A": 3200, "strip:B:areaSF": 3600, "strip:A:areaSF": 3200, "strip:B:volumeCY": 1800 / 27, "strip:A:volumeCY": 3200 / 27, fillCY: 5000 / 27 },
  },
  // Within boundary, newest: it takes the whole boundary (the engine's uniform path) and
  // the older strip owns nothing: 10000 SF x 0.5 ft = 5000/27, as legacy's e4 F1.
  {
    id: "strips-boundary-newest-takes-all",
    kind: "strips",
    side: 100,
    boundary: UNIT,
    rows: [
      { uuid: "A", name: "A", depth_ft: 1, source: "drawn", vertices_json: [[0, 0], [0.6, 0], [0.6, 0.6], [0, 0.6]], created_at: "2026-09-30T10:00:00Z" },
      { uuid: "W", name: "Whole", depth_ft: 0.5, source: "boundary", created_at: "2026-09-30T11:00:00Z" },
    ],
    runs: pad(100, 100),
    expect: { order: "W,A", pieces: "W", "piece:W": 10000, "strip:W:volumeCY": 5000 / 27, fillCY: 5000 / 27 },
  },
  // Selected Site Features: f1 [0, 0.25] x [0, 1] only, 2500 SF; a feature past the
  // boundary is clipped: f2 [0.9, 1.2] x [0, 1] gives 10 x 100 = 1000 SF.
  {
    id: "strips-features-clipped",
    kind: "strips",
    side: 100,
    boundary: UNIT,
    features: [
      { id: "f1", polygons: [[[0, 0], [0.25, 0], [0.25, 1], [0, 1]]] },
      { id: "f2", polygons: [[[0.9, 0], [1.2, 0], [1.2, 1], [0.9, 1]]] },
    ],
    rows: [
      { uuid: "S1", name: "S1", depth_ft: 0.5, source: "features", feature_uuids: ["f1"], created_at: "2026-09-30T10:00:00Z" },
      { uuid: "S2", name: "S2", depth_ft: 0.5, source: "features", feature_uuids: ["f2"], created_at: "2026-09-30T09:00:00Z" },
    ],
    expect: { order: "S1,S2", "piece:S1": 2500, "piece:S2": 1000 },
  },
  // Remaining Site within Boundary, f1 unticked (cut out), f2 ticked (kept in): the
  // boundary less f1 = 7500 SF (legacy's Remaining Site row, through the rows this time).
  {
    id: "strips-remaining-site",
    kind: "strips",
    side: 100,
    boundary: UNIT,
    features: [
      { id: "f1", polygons: [[[0, 0], [0.25, 0], [0.25, 1], [0, 1]]] },
      { id: "f2", polygons: [[[0.5, 0], [0.75, 0], [0.75, 1], [0.5, 1]]] },
    ],
    rows: [{ uuid: "R", name: "Remaining", depth_ft: 0.5, source: "remaining", feature_uuids: ["f2"], created_at: "2026-09-30T10:00:00Z" }],
    runs: pad(100, 100),
    expect: { "piece:R": 7500, "strip:R:areaSF": 7500, "strip:R:volumeCY": 3750 / 27, fillCY: 3750 / 27 },
  },
  // --- The lines (legacy's buildDesired; Q9 the panel shows them, Q31 shrink, Q32 order) ---
  // Legacy's strip re-use rows (siteFeatures.test.ts), shrink 1: cut 100, fill 300, strip
  // 50 re-used: import (300 - 150) x 1.25 = 187.5; the re-use line 50 x 1 CCY.
  {
    id: "lines-strip-reuse-import",
    kind: "lines",
    input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 100, fillCY: 300 }], stripAreas: [{ id: "s1", label: "S", depthFt: 0.5, areaSF: 1, volumeCY: 50 }], stripMeta: [{ id: "s1", name: "S", disposition: "reuse", reuseKind: "general" }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1 } },
    expect: {
      roles: "strip:s1 strip_reuse_fill:s1 cut:remainder fill:remainder soil_import:__soil_import__",
      "strip:s1:name": 'Strip Topsoil (6") — S (bank)',
      "strip_reuse_fill:s1": 50,
      "soil_import:__soil_import__": 187.5,
      // D-177: the import's bank figure in brackets, 300 - 150 = 150 BCY; fill is compacted.
      "soil_import:__soil_import__:name": "Soil Import — Engineered Fill (150 BCY)",
      "soil_import:__soil_import__:unit": "LCY",
      "cut:remainder:unit": "BCY",
      "fill:remainder:unit": "CCY",
    },
  },
  // Cut 300, fill 100, strip 50 re-used: export (350 - 100) x 1.25 = 312.5.
  {
    id: "lines-strip-reuse-export",
    kind: "lines",
    input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 300, fillCY: 100 }], stripAreas: [{ id: "s1", label: "S", depthFt: 0.5, areaSF: 1, volumeCY: 50 }], stripMeta: [{ id: "s1", name: "S", disposition: "reuse", reuseKind: "general" }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1 } },
    expect: { "soil_export:__soil_export__": 312.5 },
  },
  // Hauled off: loose 50 x 1.25 = 62.5, and the balance untouched: export 200 x 1.25 = 250.
  {
    id: "lines-strip-haul-off",
    kind: "lines",
    input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 300, fillCY: 100 }], stripAreas: [{ id: "s1", label: "S", depthFt: 0.5, areaSF: 1, volumeCY: 50 }], stripMeta: [{ id: "s1", name: "S", disposition: "haul_off", reuseKind: null }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1 } },
    expect: { "strip_haul:s1": 62.5, "strip_haul:s1:unit": "LCY", "soil_export:__soil_export__": 250 },
  },
  // A pad: undercut 270 CF = 10 BCY re-used, 2 ft; prep 135 SF, 12 in, 2 lifts; shrink as
  // printed 1 / 0.9 (D-177; the old form's 0.9), swell 1.25, cut 100, fill 300, suitable.
  // Re-use line 10 / (1 / 0.9) = 9 CCY; replacement 10 CCY; surplus = 100 + 10 - 300 / 0.9 =
  // -201 / 0.9; import 201 / 0.9 x 1.25 = 279.1666...
  {
    id: "lines-undercut-reuse-shrink",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 100, fillCY: 300 }],
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 2, offsetFt: 0, areaSF: 135, volumeCF: 270, material: "Select Fill", disposition: "reuse" }, prep: { depthFt: 1, lifts: 2, areaSF: 135 } }],
      assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1 / 0.9 },
    },
    expect: {
      roles: "undercut:pad undercut_reuse_fill:pad undercut_replace:pad prep:pad cut:remainder fill:remainder soil_import:__soil_import__",
      "undercut:pad": 10,
      "undercut:pad:name": 'Undercut Excavation (24") — Pad (bank)',
      "undercut_reuse_fill:pad": 9,
      "undercut_reuse_fill:pad:unit": "CCY",
      "undercut_replace:pad": 10,
      "undercut_replace:pad:name": "Undercut Replacement Fill: Select Fill — Pad (compacted in place)",
      "prep:pad": 135,
      "prep:pad:name": 'Prepare Subgrade (12", 2 lifts) — Pad',
      "soil_import:__soil_import__": (201 / 0.9) * 1.25,
    },
  },
  // Metric, hauled off, assumptions never asked: 353.146667 CF = 10 BCM, 12.5 LCM hauled;
  // prep 100 SF = 9.290304 M²; 0.5 ft = 15.24 cm, labelled 15.2cm; no export or import.
  {
    id: "lines-undercut-metric-haul",
    kind: "lines",
    input: {
      units: "m3",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 0.5, offsetFt: 0, areaSF: 706.293334, volumeCF: 353.146667, material: "Engineered Fill", disposition: "haul_off" }, prep: { depthFt: 0.5, lifts: 1, areaSF: 100 } }],
      assumptions: null,
    },
    expect: {
      roles: "undercut:pad undercut_haul:pad undercut_replace:pad prep:pad cut:remainder fill:remainder",
      "undercut:pad": 10,
      "undercut:pad:unit": "BCM",
      "undercut_haul:pad": 12.5,
      "undercut_haul:pad:unit": "LCM",
      "undercut:pad:name": "Undercut Excavation (15.2cm) — Pad (bank)",
      "prep:pad": 9.290304,
      "prep:pad:unit": "M²",
      "prep:pad:name": "Prepare Subgrade (15.2cm, 1 lift) — Pad",
    },
  },
  // --- Block F (D-142): what the api writes, in Q32's order -------------------------------
  // Two strips (stockpiled, re-used as topsoil), a crushed-stone undercut stockpiled, two
  // regions, not suitable: every cut exported, every fill imported. Strip 100 CY x 1.25 =
  // 125 LCY stockpiled; topsoil 40 BCY as is; undercut 270 CF = 10 BCY, 12.5 LCY stockpiled,
  // 10 CCY of "Crushed Stone" (31.05.04 on the api); export (60 + 40) x 1.25 = 125; import
  // (30 + 50) x 1.25 = 100.
  {
    id: "lines-block-f-order",
    kind: "lines",
    input: {
      units: "CY",
      regions: [
        { id: "park", label: "Parking", cutCY: 60, fillCY: 30 },
        { id: null, label: "Remainder", cutCY: 40, fillCY: 50 },
      ],
      stripAreas: [
        { id: "s1", label: "S1", depthFt: 0.5, areaSF: 5400, volumeCY: 100 },
        { id: "s2", label: "S2", depthFt: 4 / 12, areaSF: 3240, volumeCY: 40 },
      ],
      stripMeta: [
        { id: "s1", name: "North", disposition: "stockpile", reuseKind: null },
        { id: "s2", name: "Lawn", disposition: "reuse", reuseKind: "topsoil" },
      ],
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 2, offsetFt: 0, areaSF: 135, volumeCF: 270, material: "Crushed Stone #57", disposition: "stockpile" }, prep: null }],
      assumptions: { suitable: false, fillType: "Select Borrow", swell: 1.25, shrink: 1 },
    },
    expect: {
      roles: "strip:s1 strip_stockpile:s1 strip:s2 strip_reuse_topsoil:s2 undercut:pad undercut_stockpile:pad undercut_replace:pad cut:park fill:park cut:remainder fill:remainder soil_export:__soil_export__ soil_import:__soil_import__",
      "strip_stockpile:s1": 125,
      "strip_stockpile:s1:name": "Strip Topsoil — North → Stockpile on Site (loose)",
      "strip_reuse_topsoil:s2": 40,
      "strip_reuse_topsoil:s2:unit": "BCY",
      "strip:s2:name": 'Strip Topsoil (4") — Lawn (bank)',
      "undercut_stockpile:pad": 12.5,
      "undercut_replace:pad:name": "Undercut Replacement Fill: Crushed Stone #57 — Pad (compacted in place)",
      "cut:park:name": "Parking Cut",
      "fill:remainder:name": "Remaining Site Fill",
      "soil_export:__soil_export__": 125,
      "soil_export:__soil_export__:name": "Soil Export (100 BCY)",
      "soil_import:__soil_import__": 100,
      "soil_import:__soil_import__:name": "Soil Import — Select Borrow (80 BCY)",
    },
  },
  // --- D-177: the factors as printed; each line in its true unit; the bank figure named ---
  // C-200 (the founder's numbers): cut 14,263 BCY, fill 8,727 CCY, shrink 1.10, swell 1.15:
  // the fill needs 9,599.7 BCY, the surplus is 4,663.3 BCY, the export 5,362.795 LCY. The
  // name rounds the bank figure to the whole yard: 4,663.
  {
    id: "lines-c200-export",
    kind: "lines",
    input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 14263, fillCY: 8727 }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.15, shrink: 1.1 } },
    expect: {
      roles: "cut:remainder fill:remainder soil_export:__soil_export__",
      "cut:remainder": 14263,
      "cut:remainder:unit": "BCY",
      "fill:remainder": 8727,
      "fill:remainder:unit": "CCY",
      "soil_export:__soil_export__": 5362.795,
      "soil_export:__soil_export__:unit": "LCY",
      "soil_export:__soil_export__:name": "Soil Export (4,663 BCY)",
    },
  },
  // A shortfall: cut 100 BCY, fill 300 CCY, shrink 1.10: the fill needs 330 BCY, 230 short;
  // import 230 x 1.25 = 287.5 LCY, named with its 230 BCY.
  {
    id: "lines-import-bank-name",
    kind: "lines",
    input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 100, fillCY: 300 }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.1 } },
    expect: {
      "soil_import:__soil_import__": 287.5,
      "soil_import:__soil_import__:unit": "LCY",
      "soil_import:__soil_import__:name": "Soil Import — Engineered Fill (230 BCY)",
    },
  },
  // Metric, thousands separated: cut 2,500.4 BCM, no fill, swell 1.2: export 3,000.48 LCM,
  // named "(2,500 BCM)"; the fill line in CCM.
  {
    id: "lines-metric-export-name",
    kind: "lines",
    input: { units: "m3", regions: [{ id: null, label: "Remainder", cutCY: 2500.4, fillCY: 0 }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.2, shrink: 1 } },
    expect: {
      "fill:remainder:unit": "CCM",
      "soil_export:__soil_export__": 3000.48,
      "soil_export:__soil_export__:unit": "LCM",
      "soil_export:__soil_export__:name": "Soil Export (2,500 BCM)",
    },
  },
  // --- Block G, Auto Trace (D-143): legacy's stitch.test.ts cases, page 1000 x 1000 pt, ---
  // and ours. Straight pieces are drawn with a slight slope: a two-point exactly level or
  // plumb line over 30 pt is a rule (border, title block) and is never offered (legacy's).
  // Legacy's "bridges a label gap in a curving contour": ~47 pt of arc removed at a bend.
  // Ours bridges it where its label sits in the gap, and reads the label.
  { id: "trace-curve-label-gap", kind: "trace", pieces: [{ pts: arc(500, 500, 300, Math.PI, Math.PI * 1.35) }, { pts: arc(500, 500, 300, Math.PI * 1.4, Math.PI * 1.8) }], labels: [{ str: "705", at: [385.2, 222.8], angle: -0.3927 }], masks: [[375, 213, 395, 233]], expect: { lines: 1, bridges: 1, elevations: "705", FG: 1 } },
  // The same gap with nothing in it: legacy zipped it blind; ours leaves it (D-143).
  { id: "trace-curve-bare-gap", kind: "trace", pieces: [{ pts: arc(500, 500, 300, Math.PI, Math.PI * 1.35) }, { pts: arc(500, 500, 300, Math.PI * 1.4, Math.PI * 1.8) }], expect: { lines: 2, bridges: 0 } },
  // "Refuses a gap wider than the tolerance": 75 pt > 60 pt, even with a label in it.
  { id: "trace-gap-too-wide", kind: "trace", pieces: [{ pts: [[100, 100], [200, 110]] }, { pts: [[275, 117.5], [375, 127.5]] }], labels: [{ str: "700", at: [237.5, 113.75], angle: 0.0997 }], expect: { lines: 2 } },
  // A 59 pt label gap with its label: one line at the label's elevation.
  { id: "trace-label-gap-59", kind: "trace", pieces: [{ pts: [[100, 100], [200, 110]] }, { pts: [[258.7, 115.87], [358.7, 125.87]] }], labels: [{ str: "700", at: [229.35, 112.94], angle: 0.0997 }], masks: [[219, 106, 240, 120]], expect: { lines: 1, bridges: 1, elevations: "700" } },
  // "Does NOT zip two parallel neighbouring contours together."
  { id: "trace-parallel", kind: "trace", pieces: [{ pts: [[100, 100], [300, 110]] }, { pts: [[100, 140], [300, 150]] }], labels: [{ str: "700", at: [100, 120], angle: 1.5708 }], expect: { lines: 2, bridges: 0 } },
  // "Refuses a join when the tangents disagree": a hard 90° turn.
  { id: "trace-hard-turn", kind: "trace", pieces: [{ pts: [[100, 100], [200, 110]] }, { pts: [[210, 111], [221, 311]] }], labels: [{ str: "700", at: [205, 110.5] }], expect: { lines: 2 } },
  // "Does not join across different dash families": solid FG, natively dashed EG.
  { id: "trace-solid-vs-dashed", kind: "trace", pieces: [{ pts: [[100, 100], [200, 110]] }, { pts: [[220, 112], [320, 122]], dash: [4, 4] }], labels: [{ str: "700", at: [210, 111], angle: 0.0997 }], expect: { lines: 2, EG: 1, FG: 1 } },
  // "Joins across a width change (index contour)": ours across its label.
  { id: "trace-width-change", kind: "trace", pieces: [{ pts: [[100, 100], [200, 110]], width: 1 }, { pts: [[240, 114], [340, 124]], width: 3 }], labels: [{ str: "705", at: [220, 112], angle: 0.0997 }], masks: [[208, 105, 232, 119]], expect: { lines: 1, elevations: "705" } },
  // "Zips a long dashed run into one polyline": 30 dashes with a PDF dash array.
  { id: "trace-native-dashes", kind: "trace", pieces: Array.from({ length: 30 }, (_, i) => ({ pts: [[i * 10, 500], [i * 10 + 6, 500]], dash: [4, 4] })), expect: { lines: 1, EG: 1 } },
  // Ours: the same run exploded (no dash array, as C-200 is): one line, read as EG by its
  // regular 4 pt gaps.
  { id: "trace-exploded-dashes", kind: "trace", pieces: Array.from({ length: 30 }, (_, i) => ({ pts: [[i * 10, 500 + i * 0.5], [i * 10 + 6, 500 + i * 0.5 + 0.3]] })), expect: { lines: 1, EG: 1, FG: 0 } },
  // "Leaves a closed ring untouched."
  { id: "trace-closed-ring", kind: "trace", pieces: [{ pts: [[100, 100], [200, 100], [200, 200], [100, 200]], closed: true }], expect: { lines: 1, closed: 1 } },
  // Ours: a line drawn out and back over itself is kept once, with no back-tracking point.
  { id: "trace-retrace", kind: "trace", pieces: [{ pts: [[100, 100], [300, 120], [200, 110]] }], expect: { lines: 1, backtracks: 0, repeated: 0 } },
  // Ours: one contour drawn twice (two pens) is offered once.
  { id: "trace-drawn-twice", kind: "trace", pieces: [{ pts: [[100, 100], [200, 110], [300, 130]] }, { pts: [[100, 100], [200, 110], [300, 130]] }], expect: { lines: 1 } },
  // Ours (C-200's case): the label's frame is dropped, the bridge runs through the box, and
  // the line takes the label.
  {
    id: "trace-label-frame",
    kind: "trace",
    pieces: [{ pts: [[100, 100], [190, 109]] }, { pts: [[230, 113], [320, 122]] }, { pts: [[195, 104], [225, 104.3]] }, { pts: [[225, 104.3], [225, 118]] }, { pts: [[225, 118], [195, 117.7]] }, { pts: [[195, 117.7], [195, 104]] }],
    labels: [{ str: "702", at: [210, 111], angle: 0.0997 }],
    masks: [[196, 105, 224, 117]],
    expect: { lines: 1, bridges: 1, elevations: "702" },
  },
  // Ours: a two-decimal number is a spot, never a contour's label.
  { id: "trace-spot-not-label", kind: "trace", pieces: [{ pts: [[100, 100], [200, 110]] }, { pts: [[230, 113], [330, 123]] }], labels: [{ str: "703.95", at: [215, 111.5], angle: 0.0997 }], expect: { elevations: "", spots: "703.95" } },
  // D-144, suggestions for unlabelled EG lines: three dashed EG lines 40 pt apart; a
  // labelled FG line ends on the first (700, a tie-in) and another on the third (702). The
  // middle one lies between them: 701 from its neighbours, confirmed by the second tie-in.
  {
    id: "trace-suggest-tie-and-neighbours",
    kind: "trace",
    suggest: "EG",
    pieces: [
      { pts: [[100, 500], [400, 503]], dash: [4, 4] },
      { pts: [[100, 540], [400, 543]], dash: [4, 4] },
      { pts: [[100, 580], [400, 583]], dash: [4, 4] },
      { pts: [[200, 501], [205, 380]] },
      { pts: [[300, 582], [305, 700]] },
    ],
    labels: [
      { str: "700", at: [202.5, 440], angle: -1.5295 },
      { str: "702", at: [302.5, 641], angle: 1.5284 },
    ],
    expect: { EG: 3, FG: 2, elevations: "700 702", suggested: "700:tie-in 701:neighbours 702:tie-in" },
  },
  // One tie-in alone: its line is suggested, its neighbours are not (no second seed to say
  // which way the ground goes up).
  {
    id: "trace-suggest-one-seed",
    kind: "trace",
    suggest: "EG",
    pieces: [
      { pts: [[100, 500], [400, 503]], dash: [4, 4] },
      { pts: [[100, 540], [400, 543]], dash: [4, 4] },
      { pts: [[200, 501], [205, 380]] },
    ],
    labels: [{ str: "700", at: [202.5, 440], angle: -1.5295 }],
    expect: { suggested: "700:tie-in" },
  },
  // --- Snap PDF (legacy's pdfSnapGeometry filters, D-145), page 1000 x 1000 pt ----------
  // A 1 pt tick is dropped (under 2 pt); a segment drawn twice, once each way, is one; 30
  // short parallel hatch strokes in one 12 pt cell keep 24; an isolated line stays: 1 + 24 + 1.
  {
    id: "pdfsnap-filters",
    kind: "pdfsnap",
    segments: [
      [100, 100, 101, 100],
      [200, 200, 300, 200],
      [300, 200, 200, 200],
      ...Array.from({ length: 30 }, (_, i) => [492 + i * 0.3, 500, 492 + i * 0.3, 503]),
      [700, 700, 800, 760],
    ],
    around: [[[0.25, 0.2], 12], [[0.9, 0.9], 12]],
    expect: { count: 26, aroundSegments: "1 0", isEmpty: false },
  },
  // Legacy's TraceIndex: the nearest line within 6 pt is picked, nothing 100 pt away.
  { id: "trace-pick", kind: "trace", pieces: [{ pts: [[100, 100], [400, 130]] }, { pts: [[100, 300], [400, 330]] }], pick: [[250, 118, 6], [250, 215, 6]], expect: { pick: "hit miss" } },
  // --- Editing a drawn run (D-181, legacy's contour edits; the guard is the founder's) ---
  // "Add point here" on edge 0 at its middle; on the edge's own end it adds nothing.
  { id: "ewedit-insert-mid", kind: "ewedit", op: "insert", points: [[0, 0], [1, 0], [2, 0]], i: 0, at: [0.5, 0], expect: { points: "0,0 0.5,0 1,0 2,0" } },
  { id: "ewedit-insert-on-vertex", kind: "ewedit", op: "insert", points: [[0, 0], [1, 0], [2, 0]], i: 0, at: [1, 0], expect: { points: "0,0 1,0 2,0" } },
  // "Delete this point": a contour keeps two points, a spot one, the boundary three; with
  // fewer the run itself goes (legacy's "That section had too few points left").
  { id: "ewedit-remove-keeps", kind: "ewedit", op: "remove", runKind: "contour", points: [[0, 0], [1, 0], [2, 0]], index: 1, expect: { points: "0,0 2,0" } },
  { id: "ewedit-remove-drops-contour", kind: "ewedit", op: "remove", runKind: "contour", points: [[0, 0], [1, 0]], index: 0, expect: { drop: true } },
  { id: "ewedit-remove-boundary-min", kind: "ewedit", op: "remove", runKind: "boundary", points: [[0, 0], [1, 0], [1, 1]], index: 2, expect: { drop: true } },
  { id: "ewedit-remove-spot", kind: "ewedit", op: "remove", runKind: "spot_elevation", points: [[0.5, 0.5]], index: 0, expect: { drop: true } },
  // "Break contour at this point": both halves share the vertex, which is not repeated
  // (legacy's at-vertex break repeats it: a defect not copied).
  { id: "ewedit-split-vertex", kind: "ewedit", op: "split", points: [[0, 0], [1, 0], [2, 0], [3, 0]], vertex: 1, expect: { a: "0,0 1,0", b: "1,0 2,0 3,0" } },
  // "Break contour here" mid-edge: the point joins both halves.
  { id: "ewedit-split-edge", kind: "ewedit", op: "split", points: [[0, 0], [1, 0], [2, 0], [3, 0]], edge: 1, at: [1.5, 0], expect: { a: "0,0 1,0 1.5,0", b: "1.5,0 2,0 3,0" } },
  // A break "here" that lands on a vertex is the break at that vertex.
  { id: "ewedit-split-edge-on-vertex", kind: "ewedit", op: "split", points: [[0, 0], [1, 0], [2, 0], [3, 0]], edge: 0, at: [1, 0], expect: { a: "0,0 1,0", b: "1,0 2,0 3,0" } },
  // At an end, one half would have a single point: refused ("Can't break here").
  { id: "ewedit-split-end-refused", kind: "ewedit", op: "split", points: [[0, 0], [1, 0], [2, 0]], vertex: 0, expect: { refused: true } },
  // The guard: the last point dragged to (0.5, −1) makes segment 2 cross segment 0
  // (at x = 0.75): the line would cross itself.
  { id: "ewedit-guard-self", kind: "ewedit", op: "guard", points: [[0, 0], [1, 0], [1, 1], [2, 1]], after: [[0, 0], [1, 0], [1, 1], [0.5, -1]], expect: { refusal: "self" } },
  // A point raised to y = 2 makes the line cross the contour along y = 1 twice.
  { id: "ewedit-guard-other", kind: "ewedit", op: "guard", points: [[0, 0], [2, 0]], after: [[0, 0], [1, 2], [2, 0]], others: [[[0, 1], [2, 1]]], expect: { refusal: "other:0" } },
  // Already crossing once, still once after the edit: editable, so it can be fixed.
  { id: "ewedit-guard-already-crossing", kind: "ewedit", op: "guard", points: [[0, 0], [1, 2]], after: [[0, 0], [1.1, 2]], others: [[[0, 1], [2, 1]]], expect: { refusal: "none" } },
  // A closed boundary moved whole stays clean.
  { id: "ewedit-guard-boundary-move", kind: "ewedit", op: "guard", closed: true, points: [[0, 0], [1, 0], [1, 1], [0, 1]], after: [[0.2, 0.2], [1.2, 0.2], [1.2, 1.2], [0.2, 1.2]], expect: { refusal: "none" } },
];

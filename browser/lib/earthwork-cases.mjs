// F12's rows in the shared quantity table (D-78, D-136): the app's own lib/takeoff/earthwork
// on legacy's hand-worked fixtures (`earthwork/tin/__tests__/tin.test.ts`,
// `volume/__tests__/{volume,e4}.test.ts`, `__tests__/siteFeatures.test.ts`) and on the shrink
// rows of D-136 Q31, each against the answer worked by hand. Only the fields in `expect` are
// compared; numbers to 1e-9 relative.
//
// A run is { item, label, kind: "contour" | "spot_elevation" | "boundary", surface, elevation,
// points: [[x, y], …] } in fractions of the page, elevation in feet.

import { readFileSync } from "node:fs";

/** F18 acceptance inputs, snapshotted from Hidden Valley (page 3 and C-200). */
const C200 = JSON.parse(readFileSync(new URL("./c200-acceptance.json", import.meta.url), "utf8"));

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
    expect: { ok: false, code: "elevation_conflict", message: "Existing grade: Conflicting elevations at the same location: EG 105 run 1 (Z=105) vs EG 100 run 1 (Z=100)." },
  },
  {
    id: "tin-crossing-contours",
    kind: "tin",
    surface: "EG",
    runs: [c("A", "EG 100", "EG", 100, [[0, 0], [1, 1]]), c("B", "EG 105", "EG", 105, [[0, 1], [1, 0]])],
    expect: { ok: false, code: "crossing_constraints", message: "Existing grade: EG 100 (run 1) crosses EG 105 (run 1) — contours must not intersect.", crossingRuns: 2 },
  },
  {
    id: "tin-self-intersecting",
    kind: "tin",
    surface: "EG",
    runs: [c("A", "EG 100", "EG", 100, [[0, 0], [1, 1], [1, 0], [0, 1]]), s("x", "EG x", "EG", 104, 0.5, 0.95)],
    expect: { ok: false, code: "self_intersecting_contour", message: "Existing grade: EG 100 (run 1) crosses itself — edit the trace so it does not self-intersect.", crossingRuns: 1 },
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
  // --- F29 Block 1 (D-533): the layer model and design water, worked by hand (plan §3.2-§3.5)
  // 1.4: TP-1 (0, 0) D 6.0, TP-2 (100, 0) D 8.0, TP-3 (0, 100) D 4.0. Inside, D = 6 + 0.02x - 0.02y.
  // Outside the hull, the nearest point of its boundary: (50, -30) from edge TP-1-TP-2 at (50, 0)
  // = 7.00; (-20, 50) from edge TP-3-TP-1 at (0, 50) = 5.00; (150, -50) from vertex TP-2 = 8.00.
  {
    id: "geo-1.4-extrapolation",
    kind: "geo-field",
    points: [[0, 0, 6], [100, 0, 8], [0, 100, 4]],
    box: { minX: -300, minY: -300, maxX: 400, maxY: 400 },
    at: [[50, -30], [-20, 50], [150, -50], [20, 30]],
    expect: { "D(50,-30)": 7, "D(-20,50)": 5, "D(150,-50)": 8, "D(20,30)": 5.8 },
  },
  // 1.5: Fill's bottom 1.0 at B-1 (-20, -20), B-2 (100, 0), B-3 (0, 100); Clay's bottom 5.0 at the
  // same three. TP-4 (100, 100) stopped at 7.0 ft still in Fill: the others give 1.0 there, so it
  // adds a point at 7.0 (Q2). On triangle B-2, TP-4, B-3 Fill is 1 + 6λ (λ TP-4's share), over 5.0
  // where λ > 2/3: a third-scale triangle, 5,000 / 9 = 555.56 SF; deepest 7.0 - 5.0 = 2.00 at TP-4.
  // The work: the box -20..100 each way, so nothing beyond the hull at TP-4.
  {
    id: "geo-1.5-clamp",
    kind: "geo-clamp",
    layers: [["fill", "Fill"], ["clay", "Clay"], ["sand", "Sand"]],
    bores: [
      { id: "b1", code: "B-1", x: -20, y: -20, total: 10, rows: [{ layerId: "fill", top: 0, bottom: 1 }, { layerId: "clay", top: 1, bottom: 5 }, { layerId: "sand", top: 5, bottom: 10 }] },
      { id: "b2", code: "B-2", x: 100, y: 0, total: 10, rows: [{ layerId: "fill", top: 0, bottom: 1 }, { layerId: "clay", top: 1, bottom: 5 }, { layerId: "sand", top: 5, bottom: 10 }] },
      { id: "b3", code: "B-3", x: 0, y: 100, total: 10, rows: [{ layerId: "fill", top: 0, bottom: 1 }, { layerId: "clay", top: 1, bottom: 5 }, { layerId: "sand", top: 5, bottom: 10 }] },
      { id: "t4", code: "TP-4", x: 100, y: 100, total: 7, rows: [{ layerId: "fill", top: 0, bottom: 7 }] },
    ],
    box: { minX: -20, minY: -20, maxX: 100, maxY: 100 },
    expect: {
      clamps: 1, "clamp0:layer": "Clay", "clamp0:under": "Fill", "clamp0:areaSF": 5000 / 9, "clamp0:maxFt": 2, "clamp0:near": "TP-4",
      "clamp0:text": "Clay kept under Fill over 555.56 SF, up to 2.00 ft, near TP-4", ordered: true, atLeastPoints: "TP-4",
    },
  },
  // 1.1: Midway's pits (pp.23-25), TP-1 (0, 0), TP-2 (100, 0), TP-3 (0, 100): topsoil to 0.5 ft in each,
  // fill to 1.0, 1.5 and 1.0, natural granular below. EG level 100.00, FG level 98.80 (a 1.20 ft cut),
  // no strip, the work the pits' triangle (5,000 SF). Fill's bottom D = 1.0 + 0.005x.
  // Total 5,000 x 1.20 = 6,000 CF = 222.22 CY; topsoil 5,000 x 0.50 = 92.59 CY; granular where 1.2 > D
  // (x < 40): the integral of (0.2 - 0.005x)(100 - x) from 0 to 40 = 346.67 CF = 12.84 CY; fill the rest,
  // 116.79 CY (0.7 x 5,000 - 346.67 = 3,153.33 CF agrees).
  {
    id: "geo-1.1-midway-cut-by-layer",
    kind: "volume",
    side: 100,
    boundary: [[0, 0], [1, 0], [0, 1]],
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [98.8, 98.8, 98.8, 98.8])],
    geo: {
      layers: [["top", "Topsoil"], ["fill", "Fill"], ["gran", "Granular"]],
      bores: [
        { id: "tp1", code: "TP-1", x: 0, y: 0, total: 7.5, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.0 }, { layerId: "gran", top: 1.0, bottom: 7.5 }] },
        { id: "tp2", code: "TP-2", x: 100, y: 0, total: 7.0, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.5 }, { layerId: "gran", top: 1.5, bottom: 7.0 }] },
        { id: "tp3", code: "TP-3", x: 0, y: 100, total: 6.0, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.0 }, { layerId: "gran", top: 1.0, bottom: 6.0 }] },
      ],
      box: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    },
    expect: { ok: true, cutCY: 6000 / 27, "geo:Topsoil:CY": 2500 / 27, "geo:Fill:CY": (3500 - 1040 / 3) / 27, "geo:Granular:CY": 1040 / 3 / 27, "geo:sum-equals-cut": true },
  },
  // 1.1 under the fixtures' six-layer list: Asphalt and base on top and Fat clay between Fill and the
  // granular soil, neither logged at Midway, so both have no thickness (a layer missing from a log that
  // goes on below it, plan §3.1): 0.00 CY each, and the other three exactly as 1.1.
  {
    id: "geo-1.1b-zero-thickness-layers",
    kind: "volume",
    side: 100,
    boundary: [[0, 0], [1, 0], [0, 1]],
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [98.8, 98.8, 98.8, 98.8])],
    geo: {
      layers: [["asph", "Asphalt"], ["top", "Topsoil"], ["fill", "Fill"], ["clay", "Fat clay"], ["gran", "Granular"], ["sand", "Sand"]],
      bores: [
        { id: "tp1", code: "TP-1", x: 0, y: 0, total: 7.5, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.0 }, { layerId: "gran", top: 1.0, bottom: 7.5 }] },
        { id: "tp2", code: "TP-2", x: 100, y: 0, total: 7.0, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.5 }, { layerId: "gran", top: 1.5, bottom: 7.0 }] },
        { id: "tp3", code: "TP-3", x: 0, y: 100, total: 6.0, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.0 }, { layerId: "gran", top: 1.0, bottom: 6.0 }] },
      ],
      box: { minX: -500, minY: -500, maxX: 600, maxY: 600 },
    },
    expect: { ok: true, cutCY: 6000 / 27, "geo:Asphalt:CY": 0, "geo:Topsoil:CY": 2500 / 27, "geo:Fill:CY": (3500 - 1040 / 3) / 27, "geo:Fat clay:CY": 0, "geo:Granular:CY": 1040 / 3 / 27, "geo:Sand:CY": 0, "geo:sum-equals-cut": true },
  },
  // 1.2: the same with a 0.50 ft strip (stripping wins): the strip 92.59 CY; the cut below it 129.63 CY =
  // fill 116.79 + granular 12.84; no topsoil left in the cut.
  {
    id: "geo-1.2-midway-strip-wins",
    kind: "volume",
    side: 100,
    boundary: [[0, 0], [1, 0], [0, 1]],
    stripFt: 0.5,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [98.8, 98.8, 98.8, 98.8])],
    geo: {
      layers: [["top", "Topsoil"], ["fill", "Fill"], ["gran", "Granular"]],
      bores: [
        { id: "tp1", code: "TP-1", x: 0, y: 0, total: 7.5, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.0 }, { layerId: "gran", top: 1.0, bottom: 7.5 }] },
        { id: "tp2", code: "TP-2", x: 100, y: 0, total: 7.0, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.5 }, { layerId: "gran", top: 1.5, bottom: 7.0 }] },
        { id: "tp3", code: "TP-3", x: 0, y: 100, total: 6.0, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.0 }, { layerId: "gran", top: 1.0, bottom: 6.0 }] },
      ],
      box: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    },
    expect: { ok: true, cutCY: 3500 / 27, stripCY: 2500 / 27, "geo:Topsoil:CY": 0, "geo:Fill:CY": (3500 - 1040 / 3) / 27, "geo:Granular:CY": 1040 / 3 / 27, "geo:sum-equals-cut": true },
  },
  // 1.3: the work the square 0-100 each way: beyond the hypotenuse the fill bottom takes the hypotenuse's
  // values, D = 1.25 + 0.0025(x - y). Total 444.44 = topsoil 185.19 + fill 242.47 + granular 16.79
  // ((346.67 + 106.67) CF).
  {
    id: "geo-1.3-midway-square-extrapolated",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [98.8, 98.8, 98.8, 98.8])],
    geo: {
      layers: [["top", "Topsoil"], ["fill", "Fill"], ["gran", "Granular"]],
      bores: [
        { id: "tp1", code: "TP-1", x: 0, y: 0, total: 7.5, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.0 }, { layerId: "gran", top: 1.0, bottom: 7.5 }] },
        { id: "tp2", code: "TP-2", x: 100, y: 0, total: 7.0, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.5 }, { layerId: "gran", top: 1.5, bottom: 7.0 }] },
        { id: "tp3", code: "TP-3", x: 0, y: 100, total: 6.0, rows: [{ layerId: "top", top: 0, bottom: 0.5 }, { layerId: "fill", top: 0.5, bottom: 1.0 }, { layerId: "gran", top: 1.0, bottom: 6.0 }] },
      ],
      box: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    },
    expect: { ok: true, cutCY: 12000 / 27, "geo:Topsoil:CY": 5000 / 27, "geo:Fill:CY": (7000 - 1360 / 3) / 27, "geo:Granular:CY": 1360 / 3 / 27, "geo:sum-equals-cut": true },
  },
  // 1.8: Bidwell (pp.45-50): B-1, B-2, B-4, B-5, B-6 log 8, 7, 8, 4 and 3 in of topsoil, 6.0 in on
  // average, so 0.50 ft; B-3 has asphalt at the surface and is left out.
  {
    id: "geo-1.8-topsoil-suggestion",
    kind: "geo-topsoil",
    topsoil: ["top"],
    bores: [
      { code: "B-1", rows: [{ layerId: "top", top: 0, bottom: 8 / 12 }] },
      { code: "B-2", rows: [{ layerId: "top", top: 0, bottom: 7 / 12 }] },
      { code: "B-3", rows: [{ layerId: "asphalt", top: 0, bottom: 2 / 12 }] },
      { code: "B-4", rows: [{ layerId: "top", top: 0, bottom: 8 / 12 }] },
      { code: "B-5", rows: [{ layerId: "top", top: 0, bottom: 4 / 12 }] },
      { code: "B-6", rows: [{ layerId: "top", top: 0, bottom: 3 / 12 }] },
    ],
    expect: { depthFt: 0.5, bores: "B-1,B-2,B-4,B-5,B-6" },
  },
  // Spec §8: the Utah template (Midway p.9) on a project with Fat clay (Type B) and a granular soil
  // (Type C). Cohesive 0.5:1 is under B's 1:1, granular 0.5:1 and 1:1 under C's 1.5:1: "Steeper than
  // federal OSHA" on the first three; the shoring row says nothing.
  {
    id: "geo-slope-rule-template-steeper",
    kind: "geo-slope",
    layers: [{ soil_group: "clay", osha_type: "B" }, { soil_group: "gravel", osha_type: "C" }],
    expect: { "row0:steeper": true, "row1:steeper": true, "row2:steeper": true, "row3:steeper": false },
  },
  // 1.6 and 1.7: each bore's design water level (plan §3.5).
  {
    id: "geo-1.6-1.7-design-water",
    kind: "geo-water",
    buffer: 1,
    bores: [
      // W-1: while drilling 7.50; at completion 6.00; after 24 h 5.20; seasonal high 4.00.
      { id: "W-1", total: 15, readings: [{ kind: "while_drilling", depth_ft: 7.5 }, { kind: "at_completion", depth_ft: 6 }, { kind: "after_hours", depth_ft: 5.2, hours: 24 }, { kind: "seasonal_high", depth_ft: 4 }] },
      // W-1 without its seasonal high: 5.20 - 1.00.
      { id: "W-1 no seasonal", total: 15, readings: [{ kind: "while_drilling", depth_ft: 7.5 }, { kind: "at_completion", depth_ft: 6 }, { kind: "after_hours", depth_ft: 5.2, hours: 24 }] },
      // Deland B-1 (p.21, p.8): 6.0 ft after 24 h or more; NRCS published 18-24 in (p.4), not used.
      { id: "Deland B-1", total: 20, readings: [{ kind: "after_hours", depth_ft: 6, hours: 24 }, { kind: "published", depth_ft: 1.5, source: "NRCS" }] },
      // Maricopa (p.8): no groundwater to 31.5 ft; ADWR published 81.80 ft.
      { id: "Maricopa", total: 31.5, readings: [{ kind: "at_completion", depth_ft: null }, { kind: "published", depth_ft: 81.8, source: "ADWR site 330001112004301" }] },
      // Plain City B-13 (p.36): 5.0 at drilling. B-12 (p.35, p.12): 7.0 in PVC after 12 days.
      { id: "Plain City B-13", total: 20, readings: [{ kind: "while_drilling", depth_ft: 5 }] },
      { id: "Plain City B-12", total: 20, readings: [{ kind: "stabilized", depth_ft: 7 }] },
      // Midway TP-3 (p.25, p.12): not encountered 10/2; 4.0 ft on 10/11 (216 h).
      { id: "Midway TP-3", total: 6, readings: [{ kind: "at_completion", depth_ft: null }, { kind: "after_hours", depth_ft: 4, hours: 216 }] },
    ],
    expect: { "W-1": 4, "W-1 no seasonal": 4.2, "Deland B-1": 5, Maricopa: 81.8, "Plain City B-13": 4, "Plain City B-12": 6, "Midway TP-3": 3 },
  },
  // Manila Creek B-1 (p.24): not encountered to 41.5 ft, no other source: below 41.5, no point.
  {
    id: "geo-1.7-manila-below",
    kind: "geo-water",
    bores: [{ id: "Manila Creek B-1", total: 41.5, readings: [{ kind: "at_completion", depth_ft: null }] }],
    expect: { "Manila Creek B-1": 41.5 },
  },
  // --- Q13 (D-526 Block 0.5, D-528): an undercut counts existing ground only -------------
  // A 100 x 70 ft pad (7,000 SF) on a 100 x 100 ft site, undercut 6.5 ft below the subgrade.
  // Fill area: EG 100, FG 102, so the subgrade is 2.0 ft above existing ground. Dug: 6.5 - 2.0 =
  // 4.5 ft, 7,000 x 4.5 = 31,500 CF = 1,166.67 CY; flat, as before: 7,000 x 6.5 = 1,685.19 CY.
  {
    id: "q13-undercut-fill-area",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [102, 102, 102, 102])],
    undercut: { id: "pad", undercutFt: 6.5, polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 31500 / 27, "undercutFlat:CY": 45500 / 27 },
  },
  // Cut area: EG 102, FG 100, the subgrade below existing ground: unchanged, 1,685.19 CY.
  {
    id: "q13-undercut-cut-area-unchanged",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [102, 102, 102, 102]), ...corners("FG", [100, 100, 100, 100])],
    undercut: { id: "pad", undercutFt: 6.5, polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 45500 / 27, "undercutFlat:CY": 45500 / 27 },
  },
  // Both in one pad: EG 100, FG rising 99 to 103 west to east, so dz = 4x - 1 (x across, 0 to 1).
  // Fill east of x = 0.25; the mean of max(0, dz) over x is the integral of 4x - 1 from 0.25 to 1 =
  // 1.125 ft. Dug: 6.5 - 1.125 = 5.375 ft over 7,000 SF = 37,625 CF = 1,393.52 CY.
  {
    id: "q13-undercut-cut-and-fill",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [99, 103, 103, 99])],
    undercut: { id: "pad", undercutFt: 6.5, polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 37625 / 27, "undercutFlat:CY": 45500 / 27 },
  },
  // The pad's own 0.5 ft section: FG 102.5 less 0.5 = a subgrade at 102, 2.0 ft above EG 100:
  // the fill-area answer again, 1,166.67 CY.
  {
    id: "q13-undercut-under-a-section",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [102.5, 102.5, 102.5, 102.5])],
    roleAreas: [{ itemId: "pad", label: "Pad", depthFt: 0.5, polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] }],
    undercut: { id: "pad", depthFt: 0.5, undercutFt: 6.5, polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 31500 / 27, "undercutFlat:CY": 45500 / 27 },
  },
  // --- F26 R-1: the grading report's statistics (D-430), on planes worked by hand -------
  // 100 x 100 ft, EG flat at 100; FG a plane rising 2 ft west to east: all fill, height 0 to 2,
  // average 1; the proposed surface's true area 100 x sqrt(100^2 + 2^2).
  {
    id: "stats-plane-fill",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [100, 102, 102, 100])],
    expect: {
      ok: true, cutCY: 0, fillCY: 10000 / 27,
      "stats:remainder:fill:areaSF": 10000, "stats:remainder:fill:avgFt": 1, "stats:remainder:fill:maxFt": 2,
      "stats:remainder:fill:egMin": 100, "stats:remainder:fill:egMax": 100, "stats:remainder:fill:fgMin": 100, "stats:remainder:fill:fgMax": 102,
      "stats:remainder:cut:areaSF": 0, "stats:remainder:cut:avgFt": 0, "stats:remainder:cut:maxFt": 0,
      "stats:remainder:area3d:fg": 100 * Math.sqrt(100 * 100 + 4), "stats:remainder:area3d:eg": 10000,
      "stats:areaSF": 10000, "stats:eg:min": 100, "stats:eg:max": 100, "stats:eg:avg": 100, "stats:fg:min": 100, "stats:fg:max": 102, "stats:fg:avg": 101,
      "stats:fg:area3d": 100 * Math.sqrt(100 * 100 + 4), "stats:eg:area3d": 10000,
    },
  },
  // F26 3D-4: the readout on the rising plane under a 0.5 ft feature, worked by hand. At x = 0.75:
  // EG 100, FG 101.5, depth 1.5 - 0.5 = 1.0 (fill); at x = 0.1: FG 100.2, depth 0.2 - 0.5 = -0.3 (cut).
  {
    id: "readout-plane-feature",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [100, 102, 102, 100])],
    roleAreas: [{ itemId: "pad", label: "Pad", depthFt: 0.5, polygon: UNIT }],
    readout: [[0.75, 0.5], [0.1, 0.3]],
    expect: {
      ok: true,
      "readout:0:eg": 100, "readout:0:fg": 101.5, "readout:0:depth": 1,
      "readout:1:eg": 100, "readout:1:fg": 100.2, "readout:1:depth": -0.3,
    },
  },
  // FG from 99 to 101: cut on the west half, fill on the east, each 5,000 SF at 0.5 average, 1 deepest.
  {
    id: "stats-plane-cut-fill",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [99, 101, 101, 99])],
    expect: {
      ok: true, cutCY: 2500 / 27, fillCY: 2500 / 27,
      "stats:remainder:cut:areaSF": 5000, "stats:remainder:cut:avgFt": 0.5, "stats:remainder:cut:maxFt": 1, "stats:remainder:cut:fgMin": 99, "stats:remainder:cut:fgMax": 100,
      "stats:remainder:fill:areaSF": 5000, "stats:remainder:fill:avgFt": 0.5, "stats:remainder:fill:maxFt": 1, "stats:remainder:fill:fgMin": 100, "stats:remainder:fill:fgMax": 101,
      "stats:remainder:area3d:fg": 100 * Math.sqrt(100 * 100 + 4),
    },
  },
  // F26 depth bands (D-445 5), by hand on the same plane: depth |−1 + x / 50| over 100 ft north
  // to south. Cut: 0–0.5 ft at x 25–50 (2,500 SF, 100 x ∫(1 − x/50) = 625 CF), 0.5–1 ft at x 0–25
  // (2,500 SF, 1,875 CF); fill the mirror. Nothing deeper; the bands sum to the cut and fill.
  {
    id: "bands-plane-cut-fill",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [99, 101, 101, 99])],
    bands: [0.5, 1, 2],
    expect: {
      ok: true,
      "band:0:cut:areaSF": 2500, "band:0:cut:volumeCF": 625, "band:0:fill:areaSF": 2500, "band:0:fill:volumeCF": 625,
      "band:1:cut:areaSF": 2500, "band:1:cut:volumeCF": 1875, "band:1:fill:areaSF": 2500, "band:1:fill:volumeCF": 1875,
      "band:2:cut:areaSF": 0, "band:2:cut:volumeCF": 0, "band:3:fill:areaSF": 0,
      bandsSumToTotals: true,
    },
  },
  // The first plane under a feature 0.5 ft deep: the zero line moves to x = 25 ft. Cut 2,500 SF,
  // 0.25 average, 0.5 deepest; fill 7,500 SF, 0.75 average, 1.5 highest, proposed 100.5 to 102.
  {
    id: "stats-plane-feature-depth",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [100, 102, 102, 100])],
    roleAreas: [{ itemId: "pad", label: "Pad", depthFt: 0.5, polygon: UNIT }],
    expect: {
      ok: true, cutCY: 625 / 27, fillCY: 5625 / 27,
      "stats:pad:cut:areaSF": 2500, "stats:pad:cut:avgFt": 0.25, "stats:pad:cut:maxFt": 0.5, "stats:pad:cut:fgMin": 100, "stats:pad:cut:fgMax": 100.5,
      "stats:pad:fill:areaSF": 7500, "stats:pad:fill:avgFt": 0.75, "stats:pad:fill:maxFt": 1.5, "stats:pad:fill:fgMin": 100.5, "stats:pad:fill:fgMax": 102,
      "stats:pad:area3d:fg": 100 * Math.sqrt(100 * 100 + 4), "stats:pad:area3d:eg": 10000,
    },
  },
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
      coverageMessage: "Volumes cover 25% of the area within the boundary; the existing or proposed grade doesn't extend to the limit of work. Adjust boundary or contours as required.",
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
  // D-471 (N2): a newer feature that only grades (a depth, no undercut or prep of its own) takes the
  // overlap of an older one's undercut and prep, as for cut and fill. A 10 x 10 ft square A (undercut
  // 1 ft, offset 0; prep 1 ft) and a newer 10 x 10 ft B 5 ft east, grading 0.5 ft: they overlap by
  // 5 x 10 = 50 SF, so A keeps 100 - 50 = 50 SF of undercut (50 CF) and 50 SF of prep. Before, B
  // took nothing (it has no work of its own) and A kept 100 SF of each.
  {
    id: "sf-n2-newer-grading-takes-undercut-and-prep",
    kind: "features",
    scale: { feetPerNorm: 1, widthPt: 100, heightPt: 100 },
    items: [
      { uuid: "A", name: "A", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 0, undercut_depth_ft: 1, undercut_fill_material: "Select Fill", prep_depth_ft: 1, prep_lifts: 1, polygons: [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]]] },
      { uuid: "B", name: "B", created_at: "2026-09-30T11:00:00Z", is_site_feature: true, role_depth_ft: 0.5, polygons: [[[0.05, 0], [0.15, 0], [0.15, 0.1], [0.05, 0.1]]] },
    ],
    expect: { order: "B,A", roleAreas: "B", "A:undercutSF": 50, "A:undercutCF": 50, "A:prepSF": 50 },
  },
  // D-471: the older undercut's offset fringe outside its own outline stays its own. A 10 x 10 ft
  // square A, undercut 1 ft, offset 1 ft: 12 x 12 = 144 SF (square corners). A newer grading-only
  // B, x 10-20 ft, touches A's east edge and covers 1 x 10 ft of A's fringe but none of A's outline:
  // A keeps all 144 SF.
  {
    id: "sf-n2-fringe-stays",
    kind: "features",
    scale: { feetPerNorm: 1, widthPt: 100, heightPt: 100 },
    items: [
      { uuid: "A", name: "A", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 0, undercut_depth_ft: 1, undercut_offset_ft: 1, undercut_fill_material: "Select Fill", polygons: [[[0.02, 0.02], [0.12, 0.02], [0.12, 0.12], [0.02, 0.12]]] },
      { uuid: "B", name: "B", created_at: "2026-09-30T11:00:00Z", is_site_feature: true, role_depth_ft: 0.5, polygons: [[[0.12, 0.02], [0.22, 0.02], [0.22, 0.12], [0.12, 0.12]]] },
    ],
    expect: { order: "B,A", roleAreas: "B", "A:undercutSF": 144, "A:undercutCF": 144 },
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
  // D-405 Soil Stabilization, by hand: 10,000 SF = 1,111.1 SY; tons = SF x ft x pcf x % / 2000.
  // 10,000 x 1 x 110 x 0.06 / 2000 = 33.0; at 8 % 44.0; 16" (4/3 ft) at 6 % 44.0;
  // a blend 3 % + 10 % = 16.5 + 55.0. The parent and Mix and Compact both read the SY.
  ...[
    { id: "lines-stabilize-lime-6", depthFt: 1, agents: [["Hydrated Lime", 6]], tons: [33], depth: '12"' },
    { id: "lines-stabilize-lime-8", depthFt: 1, agents: [["Hydrated Lime", 8]], tons: [44], depth: '12"' },
    { id: "lines-stabilize-16in", depthFt: 16 / 12, agents: [["Hydrated Lime", 6]], tons: [44], depth: '16"' },
    { id: "lines-stabilize-blend", depthFt: 1, agents: [["Hydrated Lime", 3], ["Fly Ash, Class C", 10]], tons: [16.5, 55], depth: '12"' },
  ].map((c) => ({
    id: c.id,
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [{ itemId: "pad", label: "Pad", undercut: null, prep: { depthFt: c.depthFt, lifts: 1, areaSF: 10000, method: "stabilize", agents: c.agents.map(([agent, pct]) => ({ agent, pct })), dryPcf: null } }],
      assumptions: null,
      soilDryPcf: 110,
    },
    expect: {
      roles: ["stabilize:pad", "stabilize_mix:pad", ...c.agents.map((_, k) => `stabilize_agent_${k + 1}:pad`), "cut:remainder", "fill:remainder"].join(" "),
      "stabilize:pad": 10000 / 9,
      "stabilize:pad:unit": "SY",
      // A count stored before D-406 reads as its thickness, depth / count: here the depth itself.
      "stabilize:pad:name": `Pad — Soil Stabilization, ${c.agents.map(([a, p]) => `${a} ${p}%`).join(" + ")}, ${c.depth} in ${c.depth} lifts (1 lift)`,
      "stabilize_mix:pad": 10000 / 9,
      "stabilize_mix:pad:unit": "SY",
      "stabilize_mix:pad:name": "Mix and Compact",
      ...Object.fromEntries(
        c.agents.flatMap(([a, p], k) => [
          [`stabilize_agent_${k + 1}:pad`, c.tons[k]],
          [`stabilize_agent_${k + 1}:pad:unit`, "TON"],
          [`stabilize_agent_${k + 1}:pad:name`, `${a} (${p}% of dry wt @ 110 pcf)`],
        ]),
      ),
    },
  })),
  // The feature's own dry unit weight wins over the project's: 10,000 x 1 x 100 x 0.06 / 2000 = 30.
  {
    id: "lines-stabilize-feature-dry",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [{ itemId: "pad", label: "Pad", undercut: null, prep: { depthFt: 1, lifts: 1, areaSF: 10000, method: "stabilize", agents: [{ agent: "Hydrated Lime", pct: 6 }], dryPcf: 100 } }],
      assumptions: null,
      soilDryPcf: 120,
    },
    expect: { "stabilize_agent_1:pad": 30, "stabilize_agent_1:pad:name": "Hydrated Lime (6% of dry wt @ 100 pcf)" },
  },
  // A sheet in metres: 10,000 SF = 929.0304 M²; 33 TON x 0.90718474 = 29.93709642 TONNE;
  // 110 pcf x 16.0184634 = 1,762.03 kg/m³, named 1,762; 1 ft = 30.48 cm, labelled 30.5cm.
  {
    id: "lines-stabilize-metric",
    kind: "lines",
    input: {
      units: "m3",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [{ itemId: "pad", label: "Pad", undercut: null, prep: { depthFt: 1, lifts: 1, areaSF: 10000, method: "stabilize", agents: [{ agent: "Hydrated Lime", pct: 6 }], dryPcf: null } }],
      assumptions: null,
    },
    expect: {
      "stabilize:pad": 929.0304,
      "stabilize:pad:unit": "M²",
      "stabilize:pad:name": "Pad — Soil Stabilization, Hydrated Lime 6%, 30.5cm in 30.5cm lifts (1 lift)",
      "stabilize_agent_1:pad": 29.93709642,
      "stabilize_agent_1:pad:unit": "TONNE",
      "stabilize_agent_1:pad:name": "Hydrated Lime (6% of dry wt @ 1,762 kg/m³)",
    },
  },
  // The other two methods stay one SF line each (D-405 7), named as D-406 3 has them:
  // Compacted Subgrade carries no lifts; a count stored before D-406 reads as depth / count.
  {
    id: "lines-prep-methods",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [
        { itemId: "a", label: "Pad", undercut: null, prep: { depthFt: 1, lifts: 2, areaSF: 135, method: "compact" } },
        { itemId: "b", label: "Drive", undercut: null, prep: { depthFt: 0.5, lifts: 1, areaSF: 200, method: "scarify_compact" } },
      ],
      assumptions: null,
    },
    expect: {
      roles: "prep:a prep:b cut:remainder fill:remainder",
      "prep:a": 135,
      "prep:a:unit": "SF",
      "prep:a:name": 'Pad — Compacted Subgrade, 12"',
      "prep:b": 200,
      "prep:b:name": 'Drive — Scarify, Moisture Condition & Compact, 6" in 6" lifts (1 lift)',
    },
  },
  // D-406 2, by hand: lifts = depth / thickness rounded up. 24 / 8 = 3; 20 / 8 = 2.5 → 3;
  // 12 / 12 = 1. Quantities stay the area (SF) or SY and tons, untouched by the lifts.
  {
    id: "lines-lifts-by-thickness",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [
        { itemId: "a", label: "Pad", undercut: null, prep: { depthFt: 2, lifts: 3, liftFt: 8 / 12, areaSF: 900, method: "scarify_compact" } },
        { itemId: "b", label: "Drive", undercut: null, prep: { depthFt: 20 / 12, lifts: 3, liftFt: 8 / 12, areaSF: 900, method: "scarify_compact", compaction: "95% Standard Proctor" } },
        { itemId: "c", label: "Lot", undercut: null, prep: { depthFt: 1, lifts: 1, liftFt: 1, areaSF: 10000, method: "stabilize", agents: [{ agent: "Hydrated Lime", pct: 6 }], dryPcf: null } },
        { itemId: "d", label: "Yard", undercut: null, prep: { depthFt: 2, lifts: 2, liftFt: 1, areaSF: 20595.540231, method: "stabilize", agents: [{ agent: "Hydrated Lime", pct: 6 }], dryPcf: null } },
      ],
      assumptions: null,
      soilDryPcf: 110,
    },
    expect: {
      "prep:a": 900,
      "prep:a:name": 'Pad — Scarify, Moisture Condition & Compact, 24" in 8" lifts (3 lifts)',
      "prep:b:name": 'Drive — Scarify, Moisture Condition & Compact, 20" in 8" lifts (3 lifts, 95% Std Proctor)',
      "stabilize:c:name": 'Lot — Soil Stabilization, Hydrated Lime 6%, 12" in 12" lifts (1 lift)',
      "stabilize:c": 10000 / 9,
      "stabilize_agent_1:c": 33,
      // The founder's row: 2,288.39 SY = 20,595.54 SF; x 2 ft x 110 x 0.06 / 2000 = 135.93 TON.
      "stabilize:d:name": 'Yard — Soil Stabilization, Hydrated Lime 6%, 24" in 12" lifts (2 lifts)',
      "stabilize:d": 20595.540231 / 9,
      "stabilize_mix:d": 20595.540231 / 9,
      "stabilize_agent_1:d": (20595.540231 * 2 * 110 * 0.06) / 2000,
    },
  },
  // F26 balance steps (D-445 4), by hand. Native soil suitable: cut 1,000 BCY, strip 100 BCY
  // re-used as fill: 1,100 available. Fill 800 CCY x 1.10 = 880 BCY; a native undercut of 2,700
  // CF = 100 BCY short by 100 x 0.10 = 10: 890 needed. Surplus 210 BCY, x 1.25 = 262.5 LCY out.
  // T2's prep, 0.67 ft in 0.33 ft lifts (8" in 4"): 2 lifts (D-445 1), not 3.
  {
    id: "lines-balance-steps-suitable",
    kind: "lines",
    steps: true,
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 1000, fillCY: 800 }],
      stripAreas: [{ id: "s1", label: "Strip", depthFt: 0.5, areaSF: 5400, volumeCY: 100 }],
      stripMeta: [{ id: "s1", name: "Strip", disposition: "reuse", reuseKind: "general" }],
      features: [
        { itemId: "u", label: "Pad", undercut: { depthFt: 1, offsetFt: 0, areaSF: 2700, volumeCF: 2700, material: null, disposition: "haul_off", native: "compacted", liftFt: 0.5 }, prep: null },
        { itemId: "t2", label: "T2", undercut: null, prep: { depthFt: 0.67, lifts: 3, liftFt: 0.33, areaSF: 1600, method: "scarify_compact", compaction: "95% Standard Proctor" } },
      ],
      assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.1 },
    },
    expect: {
      steps: "cut reuse supply fill shrink fill_bank native demand net export_bank swell export",
      "step:cut": 1000, "step:reuse": 100, "step:supply": 1100, "step:fill": 800, "step:shrink": 1.1, "step:fill_bank": 880,
      "step:native": 10, "step:demand": 890, "step:net": 210, "step:export_bank": 210, "step:swell": 1.25, "step:export": 262.5,
      net: 210,
      "soil_export:__soil_export__": 262.5,
      "prep:t2:name": 'T2 — Scarify, Moisture Condition & Compact, 8" in 4" lifts (2 lifts, 95% Std Proctor)',
    },
  },
  // Not suitable: all 500 BCY of cut leaves (x 1.3 = 650 LCY); fill 300 CCY x 1.2 = 360 BCY comes
  // in (x 1.3 = 468 LCY). Net after shrink 500 − 360 = 140 BCY.
  {
    id: "lines-balance-steps-unsuitable",
    kind: "lines",
    steps: true,
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 500, fillCY: 300 }],
      assumptions: { suitable: false, fillType: "Engineered Fill", swell: 1.3, shrink: 1.2 },
    },
    expect: {
      steps: "fill shrink fill_bank cut export_bank swell export import_bank swell_in import",
      "step:fill_bank": 360, "step:export_bank": 500, "step:export": 650, "step:import_bank": 360, "step:import": 468,
      net: 140,
      "soil_export:__soil_export__": 650, "soil_import:__soil_import__": 468,
    },
  },
  // D-407, by hand: 10,000 SF x 24" = 20,000 CF = 740.7407 CY; shrink 1.10, swell 1.25.
  // Imported Engineered Fill: as before. 740.74 BCY out, hauled 740.74 x 1.25 = 925.93 LCY,
  // replaced 740.74 CCY; nothing else on site, so no export or import line.
  {
    id: "lines-undercut-imported-unchanged",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 2, offsetFt: 0, areaSF: 10000, volumeCF: 20000, material: "Engineered Fill", disposition: "haul_off" }, prep: null }],
      assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.1 },
    },
    expect: {
      roles: "undercut:pad undercut_haul:pad undercut_replace:pad cut:remainder fill:remainder",
      "undercut:pad": 20000 / 27,
      "undercut_haul:pad": (20000 / 27) * 1.25,
      "undercut_replace:pad": 20000 / 27,
      "undercut_replace:pad:name": "Undercut Replacement Fill: Engineered Fill — Pad (compacted in place)",
    },
  },
  // The same, imported with an 8" lift thickness: the lifts join the fill line's name.
  {
    id: "lines-undercut-imported-lifts",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 2, offsetFt: 0, areaSF: 10000, volumeCF: 20000, material: "Engineered Fill", disposition: "haul_off", native: null, liftFt: 8 / 12 }, prep: null }],
      assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.1 },
    },
    expect: { "undercut_replace:pad:name": 'Undercut Replacement Fill: Engineered Fill, 24" in 8" lifts (3 lifts) — Pad (compacted in place)' },
  },
  // Native, moisture conditioned: one 740.74 CY line, no undercut export or import. Suitable,
  // cut 1,000: surplus = 1,000 - 740.74 x 0.10 = 925.926 BCY, exported x 1.25 = 1,157.41 LCY.
  {
    id: "lines-undercut-native-compacted",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 1000, fillCY: 0 }],
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 2, offsetFt: 0, areaSF: 10000, volumeCF: 20000, material: null, disposition: "haul_off", native: "compacted", liftFt: 8 / 12 }, prep: null }],
      assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.1 },
    },
    expect: {
      roles: "undercut_native:pad cut:remainder fill:remainder soil_export:__soil_export__",
      "undercut_native:pad": 20000 / 27,
      "undercut_native:pad:unit": "CY",
      "undercut_native:pad:name": 'Pad — Undercut & Recompact Native Soil, 24" in 8" lifts (3 lifts)',
      "soil_export:__soil_export__": (1000 - (20000 / 27) * 0.1) * 1.25,
    },
  },
  // Not suitable, nothing cut or filled: the shortfall alone comes in, 74.074 BCY x 1.25 = 92.59 LCY.
  {
    id: "lines-undercut-native-shortfall-import",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 2, offsetFt: 0, areaSF: 10000, volumeCF: 20000, material: null, disposition: "haul_off", native: "compacted", liftFt: 8 / 12 }, prep: null }],
      assumptions: { suitable: false, fillType: "Engineered Fill", swell: 1.25, shrink: 1.1 },
    },
    expect: {
      roles: "undercut_native:pad cut:remainder fill:remainder soil_import:__soil_import__",
      "soil_import:__soil_import__": (20000 / 27) * 0.1 * 1.25,
    },
  },
  // Native, stabilized, Lime 6 %, 110 pcf: 10,000 x 2 x 110 x 0.06 / 2000 = 66.0 TON; Excavate &
  // Recompact 740.74 CY; 24" in 12" lifts = 2 lifts.
  {
    id: "lines-undercut-native-stabilized",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 2, offsetFt: 0, areaSF: 10000, volumeCF: 20000, material: null, disposition: "haul_off", native: "stabilized", liftFt: 1, agents: [{ agent: "Hydrated Lime", pct: 6 }], dryPcf: null }, prep: null }],
      assumptions: null,
      soilDryPcf: 110,
    },
    expect: {
      roles: "undercut_stabilize:pad undercut_stabilize_mix:pad undercut_agent_1:pad cut:remainder fill:remainder",
      "undercut_stabilize:pad": 20000 / 27,
      "undercut_stabilize:pad:name": 'Pad — Undercut & Stabilize Native Soil, Hydrated Lime 6%, 24" in 12" lifts (2 lifts)',
      "undercut_stabilize_mix:pad": 20000 / 27,
      "undercut_stabilize_mix:pad:name": "Excavate & Recompact",
      "undercut_agent_1:pad": 66,
      "undercut_agent_1:pad:unit": "TON",
      "undercut_agent_1:pad:name": "Hydrated Lime (6% of dry wt @ 110 pcf)",
    },
  },
  // On a sheet in metres: 20,000 CF = 566.337 m³; 66 TON x 0.90718474 = 59.8742 t; 2 ft = 61cm.
  {
    id: "lines-undercut-native-stabilized-metric",
    kind: "lines",
    input: {
      units: "m3",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 2, offsetFt: 0, areaSF: 10000, volumeCF: 20000, material: null, disposition: "haul_off", native: "stabilized", liftFt: 1, agents: [{ agent: "Hydrated Lime", pct: 6 }], dryPcf: null }, prep: null }],
      assumptions: null,
      soilDryPcf: 110,
    },
    expect: {
      "undercut_stabilize:pad": 20000 / 35.3146667,
      "undercut_stabilize:pad:unit": "M3",
      "undercut_stabilize:pad:name": "Pad — Undercut & Stabilize Native Soil, Hydrated Lime 6%, 61cm in 30.5cm lifts (2 lifts)",
      "undercut_agent_1:pad": 66 * 0.90718474,
      "undercut_agent_1:pad:unit": "TONNE",
    },
  },
  // D-407 4: a rate in lb/SY. 10,000 SF = 1,111.11 SY x 40 lb / 2000 = 22.22 TON, whatever the
  // depth or dry weight.
  {
    id: "lines-stabilize-lb-sy",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [{ itemId: "pad", label: "Pad", undercut: null, prep: { depthFt: 1, lifts: 1, liftFt: 1, areaSF: 10000, method: "stabilize", agents: [{ agent: "Hydrated Lime", lb_sy: 40 }], dryPcf: 100 } }],
      assumptions: null,
      soilDryPcf: 110,
    },
    expect: {
      "stabilize:pad:name": 'Pad — Soil Stabilization, Hydrated Lime 40 lb/SY, 12" in 12" lifts (1 lift)',
      "stabilize_agent_1:pad": ((10000 / 9) * 40) / 2000,
      "stabilize_agent_1:pad:name": "Hydrated Lime (40 lb/SY)",
    },
  },
  // D-406 3: Compacted Subgrade with a compaction spec, and one typed.
  {
    id: "lines-compacted-proctor",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }],
      features: [
        { itemId: "a", label: "Pad", undercut: null, prep: { depthFt: 1, lifts: null, areaSF: 500, method: "compact", compaction: "95% Standard Proctor" } },
        { itemId: "b", label: "Walk", undercut: null, prep: { depthFt: 0.5, lifts: null, areaSF: 300, method: "compact", compaction: "100% Standard Proctor" } },
      ],
      assumptions: null,
    },
    expect: {
      "prep:a": 500,
      "prep:a:name": 'Pad — Compacted Subgrade, 12" (95% Std Proctor)',
      "prep:b:name": 'Walk — Compacted Subgrade, 6" (100% Standard Proctor)',
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
  // --- F18: existing grade read through a registration (D-188, D-190) ------------------
  // The target sheet is the unit square at 100 ft a side (feet per point 100 on a 1 × 1 pt
  // page), FG flat 103 inside the unit boundary. EG is the plane z = 100 + 2x + 2y (x, y in
  // fractions of the target), so cut = ∫ over x + y > 1.5 of (2x + 2y − 3) = 1/24 of a
  // 100 ft square in ft, and fill − cut = 1: cut 10,000 / 24 / 27, fill 250,000 / 24 / 27 CY.
  // `oneSheet` draws the same EG on the target itself, and the rows say the two agree.
  {
    // One source at 200 ft a side, turned 90°: its feet (20,150) (20,50) (120,50) (120,150)
    // are the target's corners SW, SE, NE, NW.
    id: "regvol-turned-plane-equals-one-sheet",
    kind: "regvolume",
    side: 100,
    runs: [...corners("FG", [103, 103, 103, 103]), b(UNIT)],
    sources: [
      {
        side: 200,
        pairs: [[[0.1, 0.75], [0, 0]], [[0.1, 0.25], [1, 0]], [[0.6, 0.25], [1, 1]], [[0.6, 0.75], [0, 1]]],
        runs: [s("e1", "EG", "EG", 100, 0.1, 0.75), s("e2", "EG", "EG", 102, 0.1, 0.25), s("e3", "EG", "EG", 104, 0.6, 0.25), s("e4", "EG", "EG", 102, 0.6, 0.75)],
      },
    ],
    oneSheet: corners("EG", [100, 102, 104, 102]),
    expect: { ok: true, cutCY: 10000 / 24 / 27, fillCY: 250000 / 24 / 27, equalsOneSheet: true },
  },
  {
    // Two sources, each half of the survey: the west half on a sheet at 100 ft a side moved
    // 0.2 across, the east half on a sheet at 200 ft a side turned 180°. Merged, they are the
    // one-sheet plane to the cent.
    id: "regvol-two-sources-merge",
    kind: "regvolume",
    side: 100,
    runs: [...corners("FG", [103, 103, 103, 103]), b(UNIT)],
    sources: [
      {
        side: 100,
        pairs: [[[0.2, 0], [0, 0]], [[0.7, 0], [0.5, 0]], [[0.7, 1], [0.5, 1]]],
        runs: [s("w1", "EG", "EG", 100, 0.2, 0), s("w2", "EG", "EG", 101, 0.7, 0), s("w3", "EG", "EG", 103, 0.7, 1), s("w4", "EG", "EG", 102, 0.2, 1)],
      },
      {
        side: 200,
        pairs: [[[0.35, 0.55], [0.5, 0]], [[0.1, 0.55], [1, 0]], [[0.1, 0.05], [1, 1]]],
        runs: [s("x1", "EG", "EG", 101, 0.35, 0.55), s("x2", "EG", "EG", 102, 0.1, 0.55), s("x3", "EG", "EG", 104, 0.1, 0.05), s("x4", "EG", "EG", 103, 0.35, 0.05)],
      },
    ],
    oneSheet: corners("EG", [100, 102, 104, 102]),
    expect: { ok: true, cutCY: 10000 / 24 / 27, fillCY: 250000 / 24 / 27, equalsOneSheet: true },
  },
  {
    // A survey on an assumed datum 2.00 ft under the grading plan's: EG flat 100 + 2 against
    // FG flat 105 gives 3 ft of fill over the 100 ft square, not 5.
    id: "regvol-datum-offset-plus-2",
    kind: "regvolume",
    side: 100,
    runs: [...corners("FG", [105, 105, 105, 105]), b(UNIT)],
    sources: [
      {
        side: 100,
        offsetFt: 2,
        pairs: [[[0.1, 0], [0, 0]], [[0.6, 0], [0.5, 0]], [[0.6, 1], [0.5, 1]]],
        runs: [s("d1", "EG", "EG", 100, 0.1, 0), s("d2", "EG", "EG", 100, 1.1, 0), s("d3", "EG", "EG", 100, 1.1, 1), s("d4", "EG", "EG", 100, 0.1, 1)],
      },
    ],
    expect: { ok: true, cutCY: 0, fillCY: 30000 / 27 },
  },
  {
    // Six FG contours, 702 to 707, each ending on the mapped EG contour 2.00 ft lower (EG
    // verticals at x = 100 … 600 pt): the tie-ins propose +2.00 ft, all six agreeing.
    id: "regtie-six-propose-plus-2",
    kind: "tiein",
    eg: [0, 1, 2, 3, 4, 5].map((i) => c(`eg${i}`, "EG", "EG", 700 + i, [[0.1 * (i + 1), 0.1], [0.1 * (i + 1), 0.9]])),
    fg: [0, 1, 2, 3, 4, 5].map((i) => c(`fg${i}`, "FG", "FG", 702 + i, [[0.1 * (i + 1), 0.5], [0.1 * (i + 1) + 0.05, 0.5]])),
    expect: { offsetFt: 2, agree: 6, found: 6 },
  },
  {
    // The match score: one 200 pt contour lying on a printed line, one 10 pt off it: half.
    id: "regmatch-half-on-the-lines",
    kind: "regmatch",
    segments: [[100, 100, 300, 100]],
    runs: [c("on", "EG", "EG", 700, [[0.1, 0.1], [0.3, 0.1]]), c("off", "EG", "EG", 701, [[0.1, 0.11], [0.3, 0.11]])],
    expect: { score: 0.5 },
  },
  // D-191: a difference triangle with one corner at Δz = 0 and the other two on opposite
  // sides splits at the zero line. The plane z = 100 + 2x + 2y with spots at the edges'
  // midpoints too (the (0.5, 1) spot is on FG 103, Δz 0) against FG flat 103: legacy's split
  // lost that triangle's cut and fill (cut 0, fill 370.37); the answer is the plane's.
  {
    id: "vol-zero-corner-split",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [
      ...corners("FG", [103, 103, 103, 103]),
      ...[[0, 0], [0.5, 0], [1, 0], [1, 1], [0.5, 1], [0, 1]].map(([x, y], i) => s(`zc${i}`, `zc${i}`, "EG", 100 + 2 * x + 2 * y, x, y)),
    ],
    expect: { ok: true, cutCY: 10000 / 24 / 27, fillCY: 250000 / 24 / 27 },
  },
  // F18's acceptance on the real sheets (D-188 Q12): Hidden Valley's page 3 (1" = 60', 47
  // adopted EG contours) linked to C-200 (1" = 30') by four control points, C-200's FG as
  // adopted (15 contours, 58 spot grades) and its boundary, snapshotted 2026-10-01
  // (`c200-acceptance.json`). The engineer's table: 14,263 cut and 8,727 fill. This row pins
  // what our engine computes from those inputs; the gap (cut −35.6 %, fill −11.7 %) is the
  // inputs', explained in the overnight report: 22 of C-200's 37 FG labels were not adopted
  // (the pond, parts of the outer ring), and no pavement or pad subgrade is modelled.
  // In true feet (D-272): was 9185 / 7706 (-35.6 / -11.7 %) triangulated in the page's proportions.
  { id: "regaccept-c200-from-page-3", kind: "regaccept", data: C200, expect: { ok: true, cutCY: 9312, fillCY: 8072, cutVsEngineerPct: -34.7, fillVsEngineerPct: -7.5 } },

  // --- The synthetic site (the founder's investigation, 2026-10-07; D-292 to D-296) ---------
  // Calculate as the app runs it (useVolumes): the target sheet C at 1" = 30', the existing
  // grade on a survey sheet V at 1" = 60' turned 90° and read through a three-point link,
  // Site Features newest-wins, a Strip Area. Ground feet, the boundary 400 × 200 (80,000 SF):
  //   pavement x 20–120, y 20–80 (6,000 SF), 12"; building pad x 200–350, y 50–150, 6";
  //   sidewalk x 340–380, y 50–150 (4,000 SF), 4", newer than the pad, so the pad owns
  //   14,000 SF; a drawn strip x 0–300 (60,000 SF), 6". Remaining site 56,000 SF.
  //   Stripped: pavement 6,000, pad 10,000, remaining 44,000; unstripped: pad 4,000,
  //   sidewalk 4,000, remaining 12,000.
  // Δz = (FG − depth) − (EG − strip). Hand answers in cubic feet / 27.
  ...synthRows(),
  ...realShapeRows(),
];

/**
 * D-470: Calculate reads every shape as the takeoff measures it, arcs bent in and subtract
 * shapes as holes. Each row goes in as stored (`vertices_json` with `shape_meta.arcs`, a
 * subtract shape's role), through the app's own sheetRuns, sheetFeatures and computeVolumes.
 * The unit page at 100 ft a side (1 normalised unit = 100 ft). EG and FG flat from four corner
 * spots, so a volume is an area times a height. Answers rounded to 0.1 (an arc is read every
 * 1°, which is short of the true curve by 0.016 SF on a 20 ft semicircle: 628.3027 against
 * 628.3185).
 */
function realShapeRows() {
  const geo = (vertices_json, shape_meta = null, role = "add") => ({ sheet_uuid: "s", vertices_json, shape_meta, role });
  const spots = (surface, z) =>
    [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y], i) => ({ uuid: `${surface}${i}`, type: "spot_elevation", name: `${surface} spots`, geometries: [geo([[x, y]], { kind: "spot", surface, elevation: z })] }));
  const boundary = (vertices_json, shape_meta = { kind: "boundary", closed: true }) => ({ uuid: "b", type: "boundary", name: "Work Boundary", geometries: [geo(vertices_json, shape_meta)] });
  // The square x 0.2–0.6, y 0.2–0.6 (40 × 40 ft = 1,600 SF) with its east edge, (0.6, 0.2) to
  // (0.6, 0.6), bent out as a semicircle of radius 0.2 (20 ft) about (0.6, 0.4): a0 −90°, sweep
  // +180°, through (0.8, 0.4). Area 1,600 + π × 20² / 2 = 1,600 + 628.3185 = 2,228.3185 SF.
  // Read as straight lines it was the square alone, 1,600 SF.
  const D_SQUARE = [[0.2, 0.2], [0.6, 0.2], [0.6, 0.6], [0.2, 0.6]];
  const EAST_ARC = { i: 1, cx: 0.6, cy: 0.4, rx: 0.2, ry: 0.2, a0: -Math.PI / 2, sweep: Math.PI };
  const feature = (uuid, depth, geometries) => ({ uuid, type: "sf", name: uuid, created_at: "2026-10-14T00:00:00Z", is_site_feature: true, role_depth_ft: depth, geometries });
  return [
    // 1. A Site Feature with an arc, 1 ft deep, on a flat pad (EG = FG = 100) inside the unit
    // boundary: its area 2,228.3 SF and its cut 2,228.3 SF × 1 ft = 2,228.3 CF.
    {
      id: "real-shape-feature-arc",
      kind: "realshape",
      side: 100,
      items: [...spots("EG", 100), ...spots("FG", 100), boundary([[0, 0], [1, 0], [1, 1], [0, 1]]), feature("arc", 1, [geo(D_SQUARE, { closed: true, arcs: [EAST_ARC] })])],
      expect: { "feature:arc:areaSF": 2228.3, cutCF: 2228.3, fillCF: 0 },
    },
    // 2. A Site Feature with a subtract shape: x 0.2–0.8, y 0.2–0.8 (60 × 60 = 3,600 SF) less
    // x 0.4–0.6, y 0.4–0.6 (20 × 20 = 400 SF) = 3,200 SF; 1 ft deep on the flat pad, so its cut
    // is 3,200 CF. Read without the hole it was 3,600.
    {
      id: "real-shape-feature-subtract",
      kind: "realshape",
      side: 100,
      items: [
        ...spots("EG", 100),
        ...spots("FG", 100),
        boundary([[0, 0], [1, 0], [1, 1], [0, 1]]),
        feature("hole", 1, [geo([[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]], { closed: true }), geo([[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]], { closed: true }, "subtract")]),
      ],
      expect: { "feature:hole:areaSF": 3200, cutCF: 3200, fillCF: 0 },
    },
    // 3. A boundary with an arc: the square with the semicircle above as the work boundary, EG
    // 100 and FG 101 (1 ft of fill everywhere): fill 2,228.3 SF × 1 ft = 2,228.3 CF; the
    // boundary's own area 2,228.3 SF. Read as straight lines it was 1,600.
    {
      id: "real-shape-boundary-arc",
      kind: "realshape",
      side: 100,
      items: [...spots("EG", 100), ...spots("FG", 101), boundary(D_SQUARE, { kind: "boundary", closed: true, arcs: [EAST_ARC] })],
      expect: { boundarySF: 2228.3, cutCF: 0, fillCF: 2228.3 },
    },
    // 4. A contour with an arc: an EG contour at 110 from (0.6, 0.2) to (0.6, 0.6) along the same
    // semicircle, beside the four EG corner spots at 100. The surface takes the curve: the arc is
    // read every 1°, 180 steps, so the contour gives 181 points (its two ends and 179 between)
    // and 180 kept edges; with the four spots the TIN has 185 points. One of them is the
    // semicircle's far point (0.8, 0.4), at 110. Read as straight lines the contour was 2 points
    // and 1 edge (a TIN of 6 points), and (0.8, 0.4) was not on it.
    {
      id: "real-shape-contour-arc",
      kind: "realshape",
      side: 100,
      items: [...spots("EG", 100), { uuid: "eg", type: "contour", name: "Existing Ground", geometries: [geo([[0.6, 0.2], [0.6, 0.6]], { kind: "polyline", surface: "EG", elevation: 110, arcs: [EAST_ARC] })] }],
      tinOnly: { surface: "EG", at: [0.8, 0.4] },
      expect: { egPoints: 185, egConstraints: 180, egZAt: 110 },
    },
  ];
}

/** The synthetic site's rows: each worked by hand in its comment. */
function synthRows() {
  const cy = (cf) => cf / 27;
  const rows = [];
  // CUT: EG 100, FG 98 (Δz −2). Pavement −2.5 × 6,000 = 15,000; pad −2 × 10,000 + −2.5 ×
  // 4,000 = 30,000; sidewalk −(2 + 1/3) × 4,000 = 28,000/3; remaining −1.5 × 44,000 − 2 ×
  // 12,000 = 90,000. Strip 0.5 × 60,000 = 30,000. Without strip: pavement 18,000, pad
  // 35,000, sidewalk 28,000/3, remaining 112,000.
  const cutTotal = 15000 + 30000 + 28000 / 3 + 90000;
  rows.push({
    id: "synth-cut-base",
    kind: "synthsite",
    site: { fgZ: 98 },
    expect: {
      ok: true, cutCY: cy(cutTotal), fillCY: 0, stripCY: cy(30000), coverage: 1, uncoveredSF: 0,
      "region:pave:cutCY": cy(15000), "region:pad:cutCY": cy(30000), "region:walk:cutCY": cy(28000 / 3), "region:remainder:cutCY": cy(90000),
      "region:pad:areaSF": 14000, "region:pad:avgEgFt": 100, "region:pad:avgFgFt": 98, "region:pad:depthFt": 0.5, "region:pad:stripFt": (10000 * 0.5) / 14000,
      "region:remainder:areaSF": 56000, "region:remainder:stripFt": (44000 * 0.5) / 56000, "region:pave:stripFt": 0.5, "region:walk:stripFt": 0,
      cut0CY: cy(18000 + 35000 + 28000 / 3 + 112000), fill0CY: 0, "region0:pad:cutCY": cy(35000),
      flags: "",
    },
  });
  // Each depth 12" deeper moves the cut by its own area / 27, more cut.
  rows.push({ id: "synth-cut-pavement-plus-12", kind: "synthsite", site: { fgZ: 98, pave: 2 }, expect: { cutCY: cy(cutTotal + 6000), "region:pave:cutCY": cy(21000) } });
  rows.push({ id: "synth-cut-pad-plus-12", kind: "synthsite", site: { fgZ: 98, pad: 1.5 }, expect: { cutCY: cy(cutTotal + 14000), "region:pad:cutCY": cy(44000) } });
  rows.push({ id: "synth-cut-sidewalk-plus-12", kind: "synthsite", site: { fgZ: 98, walk: 4 / 12 + 1 }, expect: { cutCY: cy(cutTotal + 4000) } });
  // The strip 12" deeper over its 60,000 SF: 60,000 / 27 less cut, as much more strip.
  rows.push({ id: "synth-cut-strip-plus-12", kind: "synthsite", site: { fgZ: 98, strip: 1.5 }, expect: { cutCY: cy(cutTotal - 60000), stripCY: cy(90000), cut0CY: cy(18000 + 35000 + 28000 / 3 + 112000) } });
  // A whole-boundary strip: the 20,000 SF unstripped before gain 0.5 ft, so 10,000 less cut;
  // the strip is the boundary's 80,000 × 0.5.
  rows.push({ id: "synth-cut-whole-boundary-strip", kind: "synthsite", site: { fgZ: 98, stripWhole: true }, expect: { cutCY: cy(cutTotal - 10000), stripCY: cy(40000) } });
  // FILL: FG 103 (Δz +3). Pavement 2.5 × 6,000 = 15,000; pad 3 × 10,000 + 2.5 × 4,000 =
  // 40,000; sidewalk (3 − 1/3) × 4,000 = 32,000/3; remaining 3.5 × 44,000 + 3 × 12,000 =
  // 190,000. Without strip: 12,000 + 35,000 + 32,000/3 + 168,000.
  const fillTotal = 15000 + 40000 + 32000 / 3 + 190000;
  rows.push({
    id: "synth-fill-base",
    kind: "synthsite",
    site: { fgZ: 103 },
    expect: {
      ok: true, cutCY: 0, fillCY: cy(fillTotal), stripCY: cy(30000),
      "region:pave:fillCY": cy(15000), "region:pad:fillCY": cy(40000), "region:walk:fillCY": cy(32000 / 3), "region:remainder:fillCY": cy(190000),
      "region:pad:avgFgFt": 103, cut0CY: 0, fill0CY: cy(12000 + 35000 + 32000 / 3 + 168000),
    },
  });
  rows.push({ id: "synth-fill-pavement-plus-12", kind: "synthsite", site: { fgZ: 103, pave: 2 }, expect: { fillCY: cy(fillTotal - 6000) } });
  rows.push({ id: "synth-fill-pad-plus-12", kind: "synthsite", site: { fgZ: 103, pad: 1.5 }, expect: { fillCY: cy(fillTotal - 14000) } });
  rows.push({ id: "synth-fill-sidewalk-plus-12", kind: "synthsite", site: { fgZ: 103, walk: 4 / 12 + 1 }, expect: { fillCY: cy(fillTotal - 4000) } });
  rows.push({ id: "synth-fill-strip-plus-12", kind: "synthsite", site: { fgZ: 103, strip: 1.5 }, expect: { fillCY: cy(fillTotal + 60000), stripCY: cy(90000) } });
  // The link's sensitivity: EG a 2 % slope rising east (z = 100 + 0.02 x), FG flat 110, all
  // fill. Pavement (x̄ 70) 8.1 × 6,000 = 48,600; pad 5.0 × 10,000 + 3.1 × 4,000 = 62,400;
  // sidewalk (x̄ 360) (2.8 − 1/3) × 4,000; remaining 340,400 + 34,400 = 374,800.
  const slope = 48600 + 62400 + (2.8 - 1 / 3) * 4000 + 374800;
  rows.push({ id: "synth-slope-base", kind: "synthsite", site: { fgZ: 110, egSlope: 0.02 }, expect: { ok: true, cutCY: 0, fillCY: cy(slope), "region:pave:avgEgFt": 101.4, "region:pave:avgFgFt": 110 } });
  // The link's clicks on the grading sheet 1 ft east: the EG lands 1 ft east, 0.02 ft lower
  // everywhere: 0.02 × 80,000 more fill. 5 ft east, five times that. 5 ft north: along the
  // contours, no change.
  rows.push({ id: "synth-slope-link-1ft-east", kind: "synthsite", site: { fgZ: 110, egSlope: 0.02, linkShift: [1, 0] }, expect: { fillCY: cy(slope + 1600) } });
  rows.push({ id: "synth-slope-link-5ft-east", kind: "synthsite", site: { fgZ: 110, egSlope: 0.02, linkShift: [5, 0] }, expect: { fillCY: cy(slope + 8000) } });
  rows.push({ id: "synth-slope-link-5ft-north", kind: "synthsite", site: { fgZ: 110, egSlope: 0.02, linkShift: [0, 5] }, expect: { fillCY: cy(slope) } });
  // Turned 0.5° about the ground's origin: EG at q is 100 + 0.02 (cos θ qx + sin θ qy);
  // its mean over the boundary rises by 0.02 ((cos θ − 1) 200 + sin θ 100), × 80,000 less fill.
  const t = (0.5 * Math.PI) / 180;
  rows.push({ id: "synth-slope-link-turned-half-degree", kind: "synthsite", site: { fgZ: 110, egSlope: 0.02, linkTurnDeg: 0.5 }, expect: { fillCY: cy(slope - 0.02 * ((Math.cos(t) - 1) * 200 + Math.sin(t) * 100) * 80000) } });
  // Coverage (D-296): the FG spots stop at x 300, so x 300–400 (20,000 SF) has no proposed
  // grade; the EG covers it. Coverage 75 %.
  rows.push({ id: "synth-coverage-fg-short", kind: "synthsite", site: { fgZ: 103, fgEastX: 300 }, expect: { coverage: 0.75, "uncovered:fg": 20000, "uncovered:eg": 0, "uncovered:both": 0 } });

  // --- The elevation check on the synthetic site (D-292): deliberate typos ----------------
  // EG as contours on the survey sheet, every 1 ft (x = −50 … 450 every 50 ft on the 2 %
  // slope, 99 … 109): clean, nothing flagged, the interval 1.
  rows.push({ id: "synth-check-clean", kind: "synthsite", site: { fgZ: 110, egContours: true }, expect: { ok: true, flags: "", intervalEG: 1 } });
  // 104 typed 140 (the x = 200 contour): out of sequence between 103 and 105. Its correct
  // neighbours are not flagged with it.
  rows.push({ id: "synth-check-contour-typo", kind: "synthsite", site: { fgZ: 110, egContours: true, egTypo: { at: 200, z: 140 } }, expect: { flags: "V:EG:contour:out_of_sequence:103,105:140" } });
  // 105 typed 150 and 104 typed 401: both flagged, worst first. With 401 set aside, the
  // 150 contour’s west neighbour is 103, so it is out of sequence between 103 and 106.
  rows.push({ id: "synth-check-two-typos", kind: "synthsite", site: { fgZ: 110, egContours: true, egTypo: { at: 250, z: 150 }, egTypo2: { at: 200, z: 401 } }, expect: { flags: "V:EG:contour:out_of_sequence:103,150:401|V:EG:contour:out_of_sequence:103,106:150" } });
  // A proposed spot 103 typed 10.3 among four at 103 (±40 ft): outside their range by more
  // than 3 ft.
  rows.push({ id: "synth-check-spot-typo", kind: "synthsite", site: { fgZ: 103, fgTypo: 10.3 }, expect: { flags: "C:FG:spot_elevation:spot_outlier:103,103:10.3" } });
  // Within the threshold, not flagged: 101 among 103s (2 ft); with the threshold at 1 ft it is.
  rows.push({ id: "synth-check-spot-within", kind: "synthsite", site: { fgZ: 103, fgTypo: 101 }, expect: { flags: "" } });
  rows.push({ id: "synth-check-spot-threshold-1", kind: "synthsite", site: { fgZ: 103, fgTypo: 101, threshold: 1 }, expect: { flags: "C:FG:spot_elevation:spot_outlier:103,103:101" } });
  // A ridge (100 101 102 101 100) and index contours only (every 5 ft) are not typos.
  rows.push({ id: "synth-check-ridge", kind: "elevcheck", contours: [100, 101, 102, 101, 100], expect: { flags: "", interval: 1 } });
  rows.push({ id: "synth-check-index-contours", kind: "elevcheck", contours: [100, 105, 110, 115, 120], expect: { flags: "", interval: 5 } });
  return rows;
}

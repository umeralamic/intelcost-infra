// F29 Block 2's rows in the shared quantity table (plan §6, D-526): the app's own
// lib/takeoff/earthwork/utilities on the plan's worked examples (§3.6–§3.10, §3.16, at the D-555
// figures) and the catalog's rules (D-560, D-563 to D-565, D-568), each against the answer worked
// by hand. Only the fields in `expect` are compared: numbers to 1e-9 relative; volumes as CY to
// 0.01, the way the plan prints them.
//
// A "catalog" row asks `resolvePipe` (and the catalog) about one pick. A "run" row is a run on a
// profile: `ground` and `depth` give the start surface and the trench depth at each end (or
// `inverts` the inverts), every layer is given by its depth below the start surface (constant
// along the run), the water by its depth. The harness builds the knots.

const CLAY_B = { name: "Clay", group: "clay", uscs: "CH", osha: "B", unsuitable: false, reuseBackfill: true, alwaysExported: false, shrink: 1.1 };
const SAND_C = { name: "Sand", group: "sand", uscs: "SP", osha: "C", unsuitable: false, reuseBackfill: true, alwaysExported: false, shrink: 1.05 };
const ASSUMED_C = { name: "Assumed soil", group: "fill_engineered", uscs: null, osha: "C", unsuitable: false, reuseBackfill: true, alwaysExported: false, shrink: 1.1 };
/** The slope template (D-552), as Block 1 ships it. */
const TEMPLATE = {
  mode: "geotech",
  source: "",
  rows: [
    { soils: "cohesive", water: "either", upToFt: 8, slopeH: 0.5, shoring: false },
    { soils: "granular", water: "above", upToFt: 4, slopeH: 0.5, shoring: false },
    { soils: "granular", water: "above", upToFt: 8, slopeH: 1, shoring: false },
    { soils: "granular", water: "below", upToFt: null, slopeH: null, shoring: true },
  ],
};
const BOX_6x8 = { id: "b6", name: "Box 6x8", insideFt: 5, outsideFt: 6, heightFt: 8 };
const SDR35_8 = "pvc_d3034_sdr35:8";

/** Case (a) of plan §3.6: 100 LF of 8" SDR-35 in clay (Type B), 8.00 ft trench, Auto bucket. */
const caseA = (over = {}) => ({
  kind: "run",
  pipe: SDR35_8,
  length: 100,
  ground: [100, 100],
  depth: [8, 8],
  layers: [{ ...CLAY_B, depth: null }],
  protection: "auto",
  ...over,
});

/** Block 4's ground: a 300 ft square in two prisms, existing ground `eg`, proposed `fg`, Δz `dz`
 *  everywhere (the strip is Δz − (FG − EG)). */
const SQUARE = (eg, fg, dz) => [
  { pts: [[-50, -50], [300, -50], [300, 300]], eg: [eg, eg, eg], fg: [fg, fg, fg], dz: [dz, dz, dz] },
  { pts: [[-50, -50], [300, 300], [-50, 300]], eg: [eg, eg, eg], fg: [fg, fg, fg], dz: [dz, dz, dz] },
];
/** A bottom piece covering every case. */
const BIG = [[-100, -100], [400, -100], [400, 400], [-100, 400]];

export const UTILITY_CASES = [
  // --- Part A: the catalog (D-568) -----------------------------------------------------------
  {
    // A1: an RCP's trench width and displacement use the barrel, ID + 2 × wall, never the bell.
    id: "util-A1-rcp-barrel-od",
    kind: "catalog",
    pick: "rcp_c76_wall_b:12",
    expect: { od: 16, wall: 2, id: 12, bellOd: 23, pipeWidthIn: 40 },
  },
  {
    // A2: a CMP's OD is derived, ID + 2 × corrugation depth + 2 × thickness, and pickable.
    id: "util-A2-cmp-od-derived",
    kind: "catalog",
    pick: "cmp_16ga:12",
    expect: { od: 13.128, wall: 0.064, odMark: "derived_corrugation", pickable: true, unverified: true },
  },
  { id: "util-A2-cmp-od-3x1", kind: "catalog", pick: "cmp_8ga:96", expect: { od: 98.336, odMark: "derived_corrugation" } },
  {
    // A3: RCP Wall C 12–21 in by ACPA's rule, which first reproduces every printed Wall C at 24–96 in.
    id: "util-A3-rcp-wall-c-rule",
    kind: "catalog",
    pick: "rcp_c76_wall_c:12",
    expect: { wall: 2.75, od: 17.5, odMark: "derived_acpa_rule", rulePrintedWallC: "all agree" },
  },
  {
    // A4: Wall B is ACPA's (association citing the standard), Rinker the cross-check.
    id: "util-A4-rcp-wall-b-acpa",
    kind: "catalog",
    pick: "rcp_c76_wall_b:33",
    expect: { wall: 3.75, wallMark: "association_citing", unverified: false },
  },
  {
    // D-560: a wall-only blank takes the same class's wall at the nearest size, the thicker on a tie.
    id: "util-D560-c909-14-wall-only",
    kind: "catalog",
    pick: "pvco_c909_235:14",
    expect: { od: 15.3, wall: 0.557, flags: ["Wall not published for this size: 0.557 in from 16 in C909 Class 235 used."] },
  },
  {
    // D-560: …or the same size in the nearest class that prints one.
    id: "util-D560-c909-165-nearest-class",
    kind: "catalog",
    pick: "pvco_c909_165:8",
    expect: { od: 9.05, wall: 0.29, flags: ["Wall not published for this size: 0.290 in from C909 Class 235 used."] },
  },
  {
    // D-560: an OD typed by the user.
    id: "util-D560-od-typed",
    kind: "catalog",
    pick: null,
    typed: { od: 10, by: "Sara W." },
    expect: { od: 10, flags: ["OD typed by Sara W."] },
  },
  {
    // D-563: the current D3034 by default at 18 in; F679 per run, on the same OD.
    id: "util-D563-d3034-default-f679-alternate",
    kind: "catalog",
    pick: "pvc_d3034_sdr35:18",
    alternate: "pvc_f679_ps46:18",
    expect: { od: 18.701, wall: 0.536, alternateOd: 18.701, alternateWall: 0.499, alternateOf: "pvc_d3034_sdr35" },
  },
  { id: "util-D565-no-33-in-sewer", kind: "catalog", pick: "pvc_d3034_sdr35:33", expect: { resolved: false } },

  // --- §3.6, the trench section (checks 2a–2d, 2p) -------------------------------------------
  {
    id: "util-2a-sloped-bucket",
    ...caseA(),
    expect: {
      widthText: "Width 36 in — bucket",
      excavationCY: 325.93,
      beddingCY: 6.48,
      zoneCY: 34.46,
      backfillCY: 283.56,
      pipeLF: [{ range: "6–8 ft", lf: 100 }],
      protectionLF: [{ method: "sloped", slope: 1, range: "8–10 ft", lf: 100 }],
      maxTopWidthFt: 19,
      invertStart: 92.5212,
    },
  },
  { id: "util-2a2-bucket-24-pipe-governs", ...caseA({ bucket: 24 }), expect: { widthText: "Width 32.4 in — pipe width", excavationCY: 317.04, beddingCY: 5.93, zoneCY: 32.57, backfillCY: 277.11, maxTopWidthFt: 18.7 } },
  {
    id: "util-2b-box-from-list",
    ...caseA({ protection: "box", boxes: [BOX_6x8], boxRef: "b6" }),
    expect: { widthText: "Width 6.00 ft — box", excavationCY: 177.78, beddingCY: 11.11, zoneCY: 36.35, backfillCY: 128.89, maxTopWidthFt: 6 },
  },
  { id: "util-2b2-box-not-set", ...caseA({ protection: "box" }), expect: { hasFlag: "Box width not set: pick a box or type its outside width." } },
  {
    // Spec §9.2 (D-580): a box shorter than the trench is noted; stacked boxes are not modelled.
    id: "util-2b3-box-shorter-than-trench",
    ...caseA({ protection: "box", boxes: [BOX_6x8], boxRef: "b6", depth: [10, 10] }),
    expect: { hasNote: "Box 6x8 is 8.0 ft high, shorter than the trench: stacked boxes are not modelled.", excavationCY: 222.22 },
  },
  { id: "util-2c-benched-b", ...caseA({ protection: "benched" }), expect: { excavationCY: 207.41, maxTopWidthFt: 11, beddingCY: 5.56, zoneCY: 17.46, backfillCY: 182.96 } },
  {
    id: "util-2c2-benched-a-14ft",
    ...caseA({ protection: "benched", depth: [14, 14], layers: [{ ...CLAY_B, osha: "A", depth: null }] }),
    expect: { areaSF: 139.5, maxTopWidthFt: 16.5 },
  },
  {
    id: "util-2d-sand-benching-refused",
    ...caseA({ protection: "benched", layers: [{ ...SAND_C, depth: null }] }),
    expect: { hasFlag: "Benching isn't allowed in this soil.", excavationCY: 444.44, beddingCY: 6.94, zoneCY: 42.96, backfillCY: 393.11, maxTopWidthFt: 27 },
  },
  {
    id: "util-2p-spec-max-30",
    ...caseA({ specMaxIn: 30 }),
    expect: { hasFlag: "Wider than spec max — pay width may be limited", excavationCY: 325.93, specExcavationCY: 311.11 },
  },
  { id: "util-3.6-invert-depth-8", ...caseA({ invertDepth: [8, 8], depth: null }), expect: { areaSF: 98.17, excavationCY: 363.61 } },

  // --- §3.7, choosing the slope (2e–2k) --------------------------------------------------------
  {
    id: "util-2e-dewatering-half",
    ...caseA({ layers: [{ ...SAND_C, depth: null }], water: [9, 7], boxes: [BOX_6x8] }),
    expect: { dewateringLF: 50, dewatering: [[50, 100]], hasFlag: "Box forced: the bottom is below the design water in granular soil.", boxLF: 50 },
  },
  { id: "util-2e2-dewatering-full", ...caseA({ water: [7, 7] }), expect: { dewateringLF: 100 } },
  { id: "util-2f-clay-over-sand", ...caseA({ layers: [{ ...CLAY_B, depth: 3 }, { ...SAND_C, depth: null }] }), expect: { excavationCY: 444.44, beddingCY: 6.94, zoneCY: 42.96, backfillCY: 393.11 } },
  {
    id: "util-2g-slope-template",
    ...caseA({ rule: TEMPLATE }),
    expect: { excavationCY: 207.41, beddingCY: 6.02, zoneCY: 25.96, backfillCY: 174, maxTopWidthFt: 11, hasNote: "Steeper than federal OSHA — confirm with the geotech report and your state's rules." },
  },
  {
    // GT-08 TP-1 (p.23, p.12): silty clay fill to 1.0 ft, GM gravel below; design water 4.20 ft.
    id: "util-2h-gt08-tp1-4ft",
    ...caseA({
      rule: TEMPLATE,
      protection: "sloped",
      depth: [4, 4],
      water: [4.2, 4.2],
      layers: [
        { name: "Fill", group: "fill_non_engineered", uscs: "CL", osha: "C", unsuitable: true, reuseBackfill: false, alwaysExported: false, shrink: 1.1, depth: 1 },
        { name: "Gravel", group: "gravel", uscs: "GM", osha: "C", unsuitable: false, reuseBackfill: true, alwaysExported: false, shrink: 1.05, depth: null },
      ],
    }),
    expect: { areaSF: 20, dewateringLF: 0 },
  },
  {
    id: "util-2h2-gt08-tp1-5ft-box-forced",
    ...caseA({
      rule: TEMPLATE,
      protection: "sloped",
      depth: [5, 5],
      water: [4.2, 4.2],
      boxOutsideFt: 3,
      layers: [
        { name: "Fill", group: "fill_non_engineered", uscs: "CL", osha: "C", unsuitable: true, reuseBackfill: false, alwaysExported: false, shrink: 1.1, depth: 1 },
        { name: "Gravel", group: "gravel", uscs: "GM", osha: "C", unsuitable: false, reuseBackfill: true, alwaysExported: false, shrink: 1.05, depth: null },
      ],
    }),
    expect: { areaSF: 15, boxLF: 100, hasFlag: "Box forced: the bottom is below the design water in granular soil." },
  },
  {
    // GT-06 B-1 (CL to 10 ft, p.43), set to C as the report says (p.20); 24 in bucket; published water 81.80 ft.
    id: "util-2i-gt06-b1-type-c",
    kind: "run",
    pipe: "pvc_d3034_sdr35:4",
    sideClearanceIn: 6,
    length: 100,
    ground: [100, 100],
    depth: [6, 6],
    water: [81.8, 81.8],
    layers: [{ name: "Lean clay", group: "clay", uscs: "CL", osha: "C", unsuitable: false, reuseBackfill: true, alwaysExported: false, shrink: 1.1, depth: null }],
    protection: "auto",
    expect: { widthText: "Width 24 in — bucket", areaSF: 66, excavationCY: 244.44, dewateringLF: 0 },
  },
  {
    // GT-07 B-2 (fill 0.5–4.0, limestone from 4.0 ft, p.30), in a box 3.0 ft outside, 8.0 ft deep.
    id: "util-2j-gt07-b2-rock-shored",
    ...caseA({
      protection: "box",
      boxOutsideFt: 3,
      water: [5, 5],
      layers: [
        { name: "Fill", group: "fill_non_engineered", uscs: null, osha: "C", unsuitable: false, reuseBackfill: true, alwaysExported: false, shrink: 1.1, depth: 4 },
        { name: "Limestone", group: "weathered_rock", uscs: null, osha: "C", unsuitable: false, reuseBackfill: false, alwaysExported: true, shrink: 0.9, depth: null },
      ],
    }),
    expect: { excavationCY: 88.89, layerCY: [44.44, 44.44], rockCY: 44.44, rockLF: 100, dewateringLF: 100 },
  },
  {
    // GT-01 B-1: CH, the report's Class B (p.17); cave-in at 7.0 ft after the tools came out (p.45).
    id: "util-2k-gt01-b1-6ft-sloped",
    ...caseA({ depth: [6, 6], caveInFt: 7, layers: [{ ...CLAY_B, name: "Fat clay", depth: null }] }),
    expect: { methods: ["sloped"], areaSF: 54 },
  },
  {
    id: "util-2k2-gt01-b1-8ft-box-forced",
    ...caseA({ caveInFt: 7, boxOutsideFt: 4, layers: [{ ...CLAY_B, name: "Fat clay", depth: null }] }),
    expect: { methods: ["box"], hasFlag: "Box forced: the bottom is below the cave-in depth (7.0 ft)." },
  },

  // --- §3.9, §3.10: spoils, ranges, the exact rule (2l–2n) --------------------------------------
  {
    id: "util-2l-lf-by-invert-depth",
    ...caseA({ length: 200, invertDepth: [6, 10], depth: null }),
    expect: { pipeLF: [{ range: "6–8 ft", lf: 100 }, { range: "8–10 ft", lf: 100 }] },
  },
  { id: "util-2m-spoils", ...caseA(), expect: { nativeBankCY: 311.91, spoilsSuitableCY: 14.01 } },
  {
    // U-UT28's metric ranges (D-580): invert depth 7.48 ft = 2.28 m and trench depth 8.00 ft = 2.44 m
    // both fall in 2–2.5 m.
    id: "util-metric-ranges",
    ...caseA({ metricRanges: true }),
    expect: { pipeLF: [{ range: "2–2.5 m", lf: 100 }], protectionLF: [{ method: "sloped", slope: 1, range: "2–2.5 m", lf: 100 }] },
  },
  {
    // Segments (spec §9.2, D-577): case (a) with 0+00–0+40 near the building, no gravel bedding and
    // clay in the zone and backfill. There the bottom is 0.5 ft higher (h 7.5): A 78.75, zone
    // 7.99 − pipe, backfill 70.76 SF/LF over 40 ft; case (a) over the other 60 ft.
    id: "util-segment-near-building",
    ...caseA({ segments: [{ fromFt: 0, toFt: 40, beddingIn: 0, materials: { zone: { name: "Clay", source: "native" }, backfill: { name: "Clay", source: "native" } } }] }),
    expect: {
      excavationCY: 312.22,
      materialsCY: [
        ["backfill", "Clay", "native", 104.83],
        ["backfill", "Native", "native", 170.13],
        ["bedding", "#57 stone", "imported", 3.89],
        ["zone", "Clay", "native", 11.27],
        ["zone", "Sand", "imported", 20.68],
      ],
    },
  },
  {
    // Plan §5.1 and the §4.12 mock: case (a)'s lines, one per role and variant (D-572).
    id: "util-lines-case-a",
    ...caseA(),
    lines: true,
    expect: {
      lines: [
        ["8\" PVC SDR-35 Pipe, 6–8 ft deep — Sanitary Sewer", "LF", 100, "utility_pipe", "site_utilities.sanitary"],
        ["Trench Excavation, Clay (bank) — Sanitary Sewer", "BCY", 325.93, "utility_trench_excavation", "site_utilities.sanitary"],
        ["Pipe Bedding, #57 stone (compacted) — Sanitary Sewer", "CCY", 6.48, "utility_bedding_pipe_zone", "site_utilities.sanitary"],
        ["Pipe Zone, Sand (compacted) — Sanitary Sewer", "CCY", 34.46, "utility_bedding_pipe_zone", "site_utilities.sanitary"],
        ["Trench Backfill, Native (compacted) — Sanitary Sewer", "CCY", 283.56, "utility_backfill", "site_utilities.sanitary"],
        ["Trench Protection, Sloped 1:1 8–10 ft — Sanitary Sewer", "LF", 100, "trench_protection", "earthwork.trench_protection"],
      ],
    },
  },
  {
    id: "util-2n-exact-vs-average-end-area",
    ...caseA({ protection: "sloped", depth: [6, 10] }),
    aea: [100, 5],
    expect: { aeaOverCF: [266.67, 0.67] },
  },

  // --- The profile (breakpoints.ts): a run read from the surfaces, a Site Feature and typed grades -
  {
    // FG = 100 + 0.04x over the run (0,0)→(100,0), so h runs 6 → 10 ft (2n's run, exact 8,933.33 CF);
    // a Site Feature 1.0 ft deep over x 40–60 lowers h by 1 there: −(2·20 + 2·∫h) = −360 CF.
    id: "util-profile-fg-with-feature",
    kind: "profile",
    pipe: SDR35_8,
    path: [[0, 0], [100, 0]],
    fg: { plane: [100, 0.04, 0], box: [-50, -50, 150, 50] },
    features: [{ poly: [[40, -30], [60, -30], [60, 30], [40, 30]], depthFt: 1 }],
    trenchBottom: 94,
    layers: [{ ...CLAY_B, depth: null }],
    expect: { excavationCY: 317.53, notes: [] },
  },
  {
    // Q7: from the existing grade, EG = 99 + 0.02x meets the flat FG 100 at x = 50. The fill side
    // (x < 50) starts at EG, h 7 → 8: 50·(3·7.5 + 56.33) = 3,941.67 CF; the cut side counts only
    // below the subgrade, h = 8: 50·88 = 4,400 CF. 8,341.67 CF = 308.95 CY.
    id: "util-profile-existing-in-cut-area",
    kind: "profile",
    pipe: SDR35_8,
    path: [[0, 0], [100, 0]],
    eg: { plane: [99, 0.02, 0], box: [-50, -50, 150, 50] },
    fg: { plane: [100, 0, 0], box: [-50, -50, 150, 50] },
    startSurface: "existing",
    trenchBottom: 92,
    layers: [{ ...CLAY_B, depth: null }],
    expect: { excavationCY: 308.95, notes: [] },
  },
  {
    id: "util-profile-existing-only",
    kind: "profile",
    pipe: SDR35_8,
    path: [[0, 0], [100, 0]],
    eg: { plane: [100, 0.04, 0], box: [-50, -50, 150, 50] },
    trenchBottom: 94,
    layers: [{ ...CLAY_B, depth: null }],
    expect: { excavationCY: 330.86, notes: ["No proposed surface: trench from existing grade, 0+00 to 1+00."] },
  },
  {
    // §3.16 through the profile: no surface at all, the ground typed at the ends, 100.00 to 99.00.
    id: "util-profile-typed-grades",
    kind: "profile",
    pipe: SDR35_8,
    path: [[0, 0], [60, 80]],
    ends: [100, 99],
    inverts: [92, 91],
    noBores: true,
    layers: [{ ...ASSUMED_C, depth: null }],
    expect: { excavationCY: 498.07, notes: ["Grade from rims: no surface here."] },
  },

  {
    // A section across a run (D-579): the run (0,0)→(60,80)→(160,80) crosses the line (100,60)→(100,100)
    // 20 ft along the line and 140 ft along the run (100 + 40).
    id: "util-section-crossing",
    kind: "crossing",
    path: [[0, 0], [60, 80], [160, 80]],
    a: [100, 60],
    b: [100, 100],
    expect: { crossings: [[20, 140]] },
  },
  {
    // 3D (D-583): origin (10, 20) at level 90. An 8" pipe (ID 0.6667 ft) along (10,20)→(110,20)→(110,60),
    // 140 ft, inverts 92.00 at 0, 91.50 at 50, 90.60 at 140. Its centre is the invert plus 0.3333:
    // 2.33 at 0; 1.83 at 50; at the bend (100 ft) 91.50 − 0.9 × 50/90 = 91.00, so 1.33; at the end 0.93.
    // A 48" manhole (outside radius 2.4167) at (110, 60), rim 100.00, base bottom 89.50: 9.50 to 10.00.
    id: "util-3d-scene",
    kind: "scene",
    origin: { x: 10, y: 20, z: 90 },
    pipes: [{ name: "SS-1", color: null, path: [[10, 20], [110, 20], [110, 60]], knots: [{ s: 0, invert: 92 }, { s: 50, invert: 91.5 }, { s: 140, invert: 90.6 }], odFt: 0.7, idFt: 8 / 12 }],
    structures: [{ name: "MH-1", color: null, x: 110, y: 60, top: 100, bottom: 89.5, shape: { kind: "round", r: 2 + 5 / 12 } }],
    expect: { pipePoints: [[[0, 2.33, 0], [50, 1.83, 0], [100, 1.33, 0], [100, 0.93, 40]]], structureSpans: [[100, 40, -0.5, 10, 2.42]] },
  },

  // --- §3.11: structure pits (Block 3, checks 3a–3c; D-581) -----------------------------------------
  {
    // A 48" sanitary manhole, Type B, sloped 1:1: inside 4.00 ft, wall 5 in, over-dig 2 ft (R0 4.417);
    // rim 100.00, lowest invert 90.00, floor 90.00, slab 0.50, stone 0.50: E_b 89.00, h 11.00.
    id: "util-3a-manhole-48",
    kind: "pit",
    shape: { kind: "round", insideDiaFt: 4, wallFt: 5 / 12 },
    G: 100, rim: 100, floor: 90, slab: 0.5, stone: 0.5, overdig: 2, lowestInvert: 90,
    layers: [{ ...CLAY_B }],
    // The plan printed the stone as 1.14 from R0 rounded to 4.417 (30.646 CF); exactly it is
    // π × 4.41667² × 0.5 = 30.641 CF = 1.1349 CY (D-581).
    expect: { excavationCY: 138.77, stoneCY: 1.13, structureCF: 192.65, backfillCY: 130.5, vf: 10, vfRange: "10–12 ft" },
  },
  {
    // A rectangular lift station, outside 10 × 12 ft, over-dig 2 ft (bottom 14 × 16); floor 86, slab
    // 1.0, stone 1.0 (h 16.00); clay, the design water at 92.00, so the clay counts C (1½:1).
    id: "util-3b-lift-station-clay",
    kind: "pit",
    shape: { kind: "rect", insideLFt: 10, insideWFt: 12, wallFt: 0 },
    G: 100, rim: 100, floor: 86, slab: 1, stone: 1, overdig: 2, lowestInvert: 86, waterElev: 92,
    layers: [{ ...CLAY_B }],
    expect: { excavationCY: 1014.52, stoneCY: 8.3, backfillCY: 939.56, method: "sloped", dewatering: true },
  },
  {
    id: "util-3b2-lift-station-sand",
    kind: "pit",
    shape: { kind: "rect", insideLFt: 10, insideWFt: 12, wallFt: 0 },
    G: 100, rim: 100, floor: 86, slab: 1, stone: 1, overdig: 2, lowestInvert: 86, waterElev: 92,
    layers: [{ ...SAND_C }],
    expect: { excavationCY: 132.74, backfillCY: 57.78, method: "box" },
  },
  {
    // Case (a)'s trench leaving the 48" manhole: invert 90.00, trench bottom 89.4788, h 10.5212, 1:1,
    // W 3.0. Its own length beyond the outline is 95.58 ft; the slices inside the pit's sides, 31.82 CY.
    id: "util-3c-trench-into-manhole",
    kind: "pits-run",
    pipe: SDR35_8,
    length: 100,
    ground: [100, 100],
    inverts: [90, 90],
    layers: [{ ...CLAY_B, depth: null }],
    pits: { start: { shape: { kind: "round", insideDiaFt: 4, wallFt: 5 / 12 }, rim: 100, floor: 90, slab: 0.5, stone: 0.5, overdig: 2 } },
    expect: { overlapCY: [31.82, 0], trenchCY: 471.79, pitsAndTrenchCY: 610.56 },
  },
  {
    // §3.16 between two 48" manholes, no grading: rims 100.00; floors and inverts 92.00; slab and stone
    // 0.5 ft each; 100 ft centre to centre; no bores, Type C (1½:1); a 36 in bucket.
    id: "util-2q-two-manholes",
    kind: "pits-run",
    pipe: SDR35_8,
    length: 100,
    ground: [100, 100],
    inverts: [92, 92],
    noBores: true,
    bucket: 36,
    layers: [{ ...ASSUMED_C, depth: null }],
    pits: {
      start: { shape: { kind: "round", insideDiaFt: 4, wallFt: 5 / 12 }, rim: 100, floor: 92, slab: 0.5, stone: 0.5, overdig: 2 },
      end: { shape: { kind: "round", insideDiaFt: 4, wallFt: 5 / 12 }, rim: 100, floor: 92, slab: 0.5, stone: 0.5, overdig: 2 },
    },
    expect: { pitCY: [146.48, 146.48], pitVF: [8, 8], overlapCY: [37.52, 37.52], pitsAndTrenchCY: 672.02, backfillGapCY: 0 },
  },

  // --- §3.16: a project with no grading (2q, the run) -------------------------------------------
  {
    id: "util-2q-typed-grades-no-bores",
    kind: "run",
    pipe: SDR35_8,
    length: 100,
    ground: [100, 99],
    inverts: [92, 91],
    noBores: true,
    layers: [{ ...ASSUMED_C, depth: null }],
    protection: "auto",
    expect: {
      excavationCY: 498.07,
      areaSF: 134.48,
      pipeLF: [{ range: "8–10 ft", lf: 100 }],
      protectionLF: [{ method: "sloped", slope: 1.5, range: "8–10 ft", lf: 100 }],
      hasNote: "No bores: Type C assumed.",
    },
  },

  // --- §3.12, §3.13: over-excavation and treatment (Block 4, D-585) --------------------------------
  {
    // GT-04 (pp.17–18): the slab 90 × 60 ft, 5 ft beyond (100 × 70 = 7,000 SF), 6.5 ft below the slab,
    // whose bottom is put at existing grade. 45,500 CF = 1,685.19 CY. The stack: 3.5 ft reconditioned
    // native (24,500 CF, 907.41) under select fill, the rest (3.0 ft, 21,000 CF, 777.78).
    id: "overex-4a-gt04-pad",
    kind: "overex",
    prisms: SQUARE(100, 100, 0),
    outline: [[[50, 50], [140, 50], [140, 110], [50, 110]]],
    extendFt: 5,
    bottom: { kind: "fixed", depthFt: 6.5 },
    stack: [3.5, null],
    expect: { totalCY: 1685.19, stackCY: [907.41, 777.78], dMax: 6.5, extendFt: 5 },
  },
  {
    // GT-04's ½" PVM variant: 8.5 ft over the same 7,000 SF, 59,500 CF = 2,203.70 CY.
    id: "overex-4a-gt04-pvm-half",
    kind: "overex",
    prisms: SQUARE(100, 100, 0),
    outline: [[[50, 50], [140, 50], [140, 110], [50, 110]]],
    extendFt: 5,
    bottom: { kind: "fixed", depthFt: 8.5 },
    expect: { totalCY: 2203.7 },
  },
  {
    // GT-01 Option B (p.22): 24 in under an assumed 150 × 200 ft pavement, 60,000 CF = 2,222.22 CY,
    // and as much cap.
    id: "overex-4b-gt01-cap",
    kind: "overex",
    prisms: SQUARE(100, 100, 0),
    outline: [[[0, 0], [150, 0], [150, 200], [0, 200]]],
    bottom: { kind: "fixed", depthFt: 2 },
    expect: { totalCY: 2222.22, stackCY: [2222.22] },
  },
  {
    // GT-08 (p.8): remove fill to natural soil over the pits' triangle (5,000 SF), no grading. Topsoil
    // 0.5 ft; fill bottoms 1.0, 1.5 and 1.0 ft at the corners: 5,000 × mean = 5,833.33 CF = 216.05 CY,
    // topsoil 2,500 CF (92.59), fill 3,333.33 CF (123.46). The deepest along the outline is 1.5 ft.
    id: "overex-4d-gt08-to-natural",
    kind: "overex",
    prisms: [{ pts: [[0, 0], [100, 0], [0, 100]], eg: [100, 100, 100], fg: [100, 100, 100], dz: [0, 0, 0] }],
    outline: [[[0, 0], [100, 0], [0, 100]]],
    extent: [[[[0, 0], [100, 0], [0, 100]]]],
    layers: 3,
    bottoms: [[{ poly: BIG, a: 0.5, b: 0, c: 0 }], [{ poly: BIG, a: 1, b: 0.005, c: 0 }]],
    bottom: { kind: "layer", index: 1 },
    expect: { totalCY: 216.05, byLayerCY: [92.59, 123.46, 0], dMax: 1.5 },
  },
  {
    // GT-01's footing (p.25, Figure 4): b 1.5 ft, d 5.0 ft at ½H:1V, so it reaches 2.5 ft out each side
    // at the bottom; the box (Q12) 6.5 × 5 = 32.50 SF/LF, 3,250 CF = 120.37 CY per 100 LF.
    id: "overex-4e-gt01-footing-box",
    kind: "overex",
    prisms: SQUARE(100, 100, 0),
    outline: [[[0, 0], [100, 0], [100, 1.5], [0, 1.5]]],
    slopeH: 0.5,
    extent: [[[[0, -2.5], [100, -2.5], [100, 4], [0, 4]]]],
    bottom: { kind: "fixed", depthFt: 5 },
    expect: { totalCY: 120.37, extendFt: 2.5 },
  },
  {
    // Q13 in a fill area, by the new engine: 7,000 SF whose subgrade is 2.0 ft above existing ground,
    // 6.5 ft below subgrade: existing ground only, 7,000 × 4.5 = 31,500 CF = 1,166.67 CY (D-528's row).
    id: "overex-q13-in-fill",
    kind: "overex",
    prisms: SQUARE(100, 102, 2),
    outline: [[[0, 0], [100, 0], [100, 70], [0, 70]]],
    bottom: { kind: "fixed", depthFt: 6.5 },
    expect: { totalCY: 1166.67 },
  },
  {
    // The strip wins: 0.5 ft of topsoil stripped over the GT-04 footprint (S at existing grade), 6.5 ft
    // below subgrade. The dig starts below the strip: 6.0 ft × 7,000 = 42,000 CF = 1,555.56 CY, none of
    // it topsoil.
    id: "overex-strip-first",
    kind: "overex",
    prisms: SQUARE(100, 100, 0.5),
    outline: [[[50, 50], [140, 50], [140, 110], [50, 110]]],
    extendFt: 5,
    layers: 2,
    bottoms: [[{ poly: BIG, a: 0.5, b: 0, c: 0 }]],
    bottom: { kind: "fixed", depthFt: 6.5 },
    expect: { totalCY: 1555.56, byLayerCY: [0, 1555.56] },
  },
  {
    // Down to elevation 95.00 under ground rising 0.02 ft/ft (100.00 at x = 0), no grading, 50 × 50 ft:
    // the depth runs 5.0 to 6.0 ft, 2,500 × 5.5 = 13,750 CF = 509.26 CY; deepest below subgrade along the
    // outline 6.0 ft, so a 1:1 slope reaches 6.0 ft out.
    id: "overex-elevation",
    kind: "overex",
    prisms: [
      { pts: [[0, 0], [300, 0], [300, 300]], eg: [100, 106, 106], fg: [100, 106, 106], dz: [0, 0, 0] },
      { pts: [[0, 0], [300, 300], [0, 300]], eg: [100, 106, 100], fg: [100, 106, 100], dz: [0, 0, 0] },
    ],
    outline: [[[0, 0], [50, 0], [50, 50], [0, 50]]],
    extent: [[[[0, 0], [50, 0], [50, 50], [0, 50]]]],
    slopeH: 1,
    bottom: { kind: "elevation", elevationFt: 95 },
    expect: { totalCY: 509.26, dMax: 6, extendFt: 6 },
  },
  // --- §3.14: the site balance (Block 5A, D-588) ---------------------------------------------------
  {
    // 5a: swell 1.25, shrink 1.10. Before: 1,000 − 900 × 1.10 = 10.00 BCY, 12.50 LCY. With trench (a)
    // (325.93 BCY of suitable clay, 283.56 CCY native backfill) and GT-08's undocumented fill
    // (123.46 BCY, unsuitable): (1,325.93 ÷ 1.10 − 1,183.56) × 1.10 = 24.01 BCY, 30.02 LCY; always
    // exported 123.46 × 1.25 = 154.32 LCY.
    id: "balance-5a-before-after",
    kind: "balance",
    before: { cut: 1000, fill: 900, reuseBank: 0, suitable: true, swell: 1.25, shrink: 1.1 },
    after: {
      supplies: [
        { name: "Site cut", bank: 1000, shrink: 1.1, swell: 1.25, kind: "suitable" },
        { name: "Trench, clay", bank: 325.93, shrink: 1.1, swell: 1.25, kind: "suitable" },
        { name: "Fill, undocumented", bank: 123.46, shrink: 1.1, swell: 1.25, kind: "unsuitable" },
      ],
      fill: 900 + 283.56,
      suitable: true,
      shrink: 1.1,
      swell: 1.25,
    },
    expect: { beforeBank: 10, beforeLoose: 12.5, afterBank: 24.01, afterLoose: 30.02, always: [["Fill, undocumented", 123.46, 154.32]] },
  },
  {
    // Each layer its own factors: 100 BCY at 1.10 / 1.25 and 200 BCY at 1.00 / 1.30 against 250 CCY.
    // Yield 90.91 + 200 = 290.91 CCY; surplus 40.91 × k̄ (300 ÷ 290.91 = 1.03125) = 42.19 BCY; swell
    // (125 + 260) ÷ 300 = 1.2833, so 54.14 LCY.
    id: "balance-layer-factors",
    kind: "balance",
    before: { cut: 300, fill: 250, reuseBank: 0, suitable: true, swell: 1.25, shrink: 1.1 },
    after: {
      supplies: [
        { name: "Clay", bank: 100, shrink: 1.1, swell: 1.25, kind: "suitable" },
        { name: "Sand", bank: 200, shrink: 1.0, swell: 1.3, kind: "suitable" },
      ],
      fill: 250,
      suitable: true,
      shrink: 1.1,
      swell: 1.25,
    },
    expect: { afterBank: 42.19, afterLoose: 54.14, importBank: null },
  },
  {
    // Native soil not suitable reduces to today's: 1,000 BCY cut and 50 BCY strip re-used against 900
    // CCY at 1.10: need 990 − 50 = 940 BCY imported; all 1,000 BCY of cut exported, 1,250 LCY.
    id: "balance-not-suitable-as-today",
    kind: "balance",
    before: { cut: 1000, fill: 900, reuseBank: 50, suitable: false, swell: 1.25, shrink: 1.1 },
    after: {
      supplies: [
        { name: "Site cut", bank: 1000, shrink: 1.1, swell: 1.25, kind: "suitable" },
        { name: "Strip re-used", bank: 50, shrink: 1.1, swell: 1.25, kind: "suitable", reuse: true },
      ],
      fill: 900,
      suitable: false,
      shrink: 1.1,
      swell: 1.25,
    },
    expect: { beforeBank: 1000, beforeLoose: 1250, afterBank: 1000, afterLoose: 1250, importBank: 940 },
  },
  {
    // GT-01 lime (p.21), 8 % at 16 in over 10,000 SF at the project's 110 pcf: 1,111.11 SY, 58.67 TON;
    // GT-03 (p.11) 5 % quicklime 36.67, 7 % lime kiln dust 51.33. Geotextile at 10 %: 1,222.22 SY (4g).
    id: "overex-4c-4g-treatment",
    kind: "treatment",
    areaSF: 10000,
    depthFt: 16 / 12,
    dryPcf: 110,
    agents: [8, 5, 7],
    overlaps: [10],
    expect: { tons: [58.67, 36.67, 51.33], sy: 1111.11, geoSY: [1222.22] },
  },
  {
    // D-595, a run that is short (as SS-3 on the 3D test copy's duplicate): 767.05 CCY of native
    // backfill at shrink 1.10 needs 767.05 × 1.10 = 843.76 BCY; the trench digs 767.43 BCY of reusable
    // clay, all of it reused. Short 843.76 − 767.43 = 76.33 BCY, which is 76.33 ÷ 1.10 = 69.39 CCY the
    // site must supply; no spoil.
    id: "native-short-run",
    kind: "native",
    layers: [{ name: "Clay", shrink: 1.1, swell: 1.25, reuseBackfill: true }],
    byLayerCY: [767.43],
    nativeCCY: 767.05,
    expect: { needBCY: 843.76, reusedBCY: 767.43, shortCCY: 69.39, spoils: [] },
  },
  {
    // D-595, a run with surplus: 700 CCY native at 1.10 needs 770 BCY of the 1,000 BCY dug; the other
    // 230 BCY is spoil, at clay's own factors.
    id: "native-surplus-run",
    kind: "native",
    layers: [{ name: "Clay", shrink: 1.1, swell: 1.25, reuseBackfill: true }],
    byLayerCY: [1000],
    nativeCCY: 700,
    expect: { needBCY: 770, reusedBCY: 770, shortCCY: 0, spoils: [["Clay", 230, 1.1, 1.25]] },
  },
  {
    // D-595, D-596, two reusable layers and rock: clay 500 BCY (1.10 / 1.25), sand 300 BCY (1.00 / 1.30),
    // rock 50 BCY. The shrink, bank-weighted: (1.10 × 500 + 1.00 × 300) ÷ 800 = 1.0625; 600 CCY needs
    // 637.50 BCY, taken 637.5 ÷ 800 = 79.6875 % of each. Spoil: clay 500 × 0.203125 = 101.56 BCY, sand
    // 300 × 0.203125 = 60.94 BCY, each at its own factors; the rock always leaves, never spoil.
    id: "native-layers-own-factors",
    kind: "native",
    layers: [
      { name: "Clay", shrink: 1.1, swell: 1.25, reuseBackfill: true },
      { name: "Sand", shrink: 1.0, swell: 1.3, reuseBackfill: true },
      { name: "Rock", shrink: 1.0, swell: 1.5, reuseBackfill: false, alwaysExported: true },
    ],
    byLayerCY: [500, 300, 50],
    nativeCCY: 600,
    expect: { needBCY: 637.5, reusedBCY: 637.5, shortCCY: 0, spoils: [["Clay", 101.56, 1.1, 1.25], ["Sand", 60.94, 1, 1.3]], rockBCY: 50 },
  },
  {
    // D-594, the Summary, the Balance and the Truckloads agree with the lines. Cut 1,200 BCY: clay 1,000
    // (1.10 / 1.25) and rock 200 (1.00 / 1.50); trench spoil 100 BCY of clay; 50 CCY of native backfill the
    // trenches could not supply; fill 1,100 CCY; the project at 1.10 / 1.25.
    // Yield 1,000 ÷ 1.10 + 100 ÷ 1.10 = 1,000.00 CCY; needed 1,100 + 50 = 1,150 CCY; short 150 CCY,
    // × 1.10 = 165 BCY imported, × 1.25 = 206.25 LCY (18 loads of 12). The rock leaves apart:
    // 200 × 1.50 = 300 LCY (25 loads). Net after shrink −165 BCY.
    id: "final-balance-agrees",
    kind: "final",
    regions: [{ id: null, label: "Remaining Site", cutCY: 1200, fillCY: 1100 }],
    layers: [
      { regionId: null, layerId: "L1", name: "Clay", bank: 1000, shrink: 1.1, swell: 1.25, kind: "suitable" },
      { regionId: null, layerId: "L3", name: "Rock", bank: 200, shrink: 1.0, swell: 1.5, kind: "rock" },
    ],
    spoilsByLayer: [{ source: "utility", name: "Clay", bank: 100, shrink: 1.1, swell: 1.25 }],
    nativeShort: 50,
    assumptions: { suitable: true, fillType: "", swell: 1.25, shrink: 1.1 },
    truck: 12,
    expect: { net: -165, importBank: 165, importLoose: 206.25, exportBank: null, rockLoose: 300, lastSteps: [206.25, 300], lineImport: 206.25, lineRock: 300, loads: [18, 25], agree: true },
  },
  {
    // D-595, over-excavation's native rows: 120 CY dug, 15 CY of it rock, against a stack whose native
    // row puts back 100 CCY at 1.10. It needs 110 BCY; the suitable 105 BCY is all reused, no spoil; the
    // site supplies 110 − 105 = 5 BCY. (Before D-595: 100 reused, 5 spoiled and 10 more needed.)
    id: "overex-native-rows-shrink",
    kind: "oxspoil",
    volumeCY: 120,
    byLayer: [{ cf: 105 * 27, rock: false, unsuitable: false }, { cf: 15 * 27, rock: true, unsuitable: false }],
    stack: [{ native: true, cf: 100 * 27, material: "Native" }],
    shrink: 1.1,
    expect: { reusedBCY: 105, spoilBCY: 0, badBCY: 15, shortBCY: 5 },
  },
  {
    // O2 (D-599): benching can apply only where every soil passed is Type A, or Type B and cohesive.
    // Case (a) in clay, Type B, cohesive: benchable along all 100 LF.
    ...caseA(),
    id: "o2-benchable-clay-b",
    expect: { benchableLF: 100 },
  },
  {
    // O2 (D-599): the same run in sand, Type C: benching can apply nowhere, so "Benched" is greyed.
    ...caseA({ layers: [{ ...SAND_C, depth: null }] }),
    id: "o2-not-benchable-sand-c",
    expect: { benchableLF: 0 },
  },
];

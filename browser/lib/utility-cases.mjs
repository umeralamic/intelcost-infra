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
];

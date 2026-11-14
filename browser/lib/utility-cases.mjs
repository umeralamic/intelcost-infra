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
      zoneCY: 17.46,
      backfillCY: 300.56,
      pipeLF: [{ range: "6–8 ft", lf: 100 }],
      protectionLF: [{ method: "sloped", slope: 1, range: "8–10 ft", lf: 100 }],
      maxTopWidthFt: 19,
      invertStart: 92.5212,
    },
  },
  // D-610: the open trench drawn from the section the volumes integrate: top = W + 2k·h when sloped
  // (19 = 3 + 2 × 1 × 8), the box's outside (6), benched B's last level (11 = 3 + 2 × 1 × 4), sand's
  // 1½:1 (27 = 3 + 2 × 1.5 × 8); a trench 6.4, 8 and 9.6 ft deep at 10, 50, 90 ft (15.8, 19, 22.2).
  { id: "util-610-trench-at-sloped", ...caseA(), trenchAt: [10, 50, 90], expect: { trench: [[19, 3, 8], [19, 3, 8], [19, 3, 8]], trenchTopGap: 0 } },
  { id: "util-610-trench-at-box", ...caseA({ protection: "box", boxes: [BOX_6x8], boxRef: "b6" }), trenchAt: [10, 50, 90], expect: { trench: [[6, 6, 8], [6, 6, 8], [6, 6, 8]], trenchTopGap: 0 } },
  { id: "util-610-trench-at-benched", ...caseA({ protection: "benched" }), trenchAt: [10, 50, 90], expect: { trench: [[11, 3, 8], [11, 3, 8], [11, 3, 8]], trenchTopGap: 0 } },
  { id: "util-610-trench-at-sand", ...caseA({ protection: "benched", layers: [{ ...SAND_C, depth: null }] }), trenchAt: [10, 50, 90], expect: { trench: [[27, 3, 8], [27, 3, 8], [27, 3, 8]], trenchTopGap: 0 } },
  { id: "util-610-trench-at-deepening", ...caseA({ depth: [6, 10] }), trenchAt: [10, 50, 90], expect: { trench: [[15.8, 3, 6.4], [19, 3, 8], [22.2, 3, 9.6]], trenchTopGap: 0 } },
  // D-613: the cross-section pane's trench, square to the run. [top, bottom, depth, bedding SF, pipe
  // zone SF with the pipe, backfill SF, pipe centre above TB, its radius]. Bedding 0–0.5 ft, the zone
  // to 0.5 + 0.7 (8.4 in OD) + 1 = 2.2 ft, backfill to the top. Sloped 1:1: 3·0.5 + 0.5² = 1.75,
  // 3·1.7 + (2.2² − 0.5²) = 9.69, 3·5.8 + (8² − 2.2²) = 76.56, 88 in all. The box: 6 wide all the way.
  // Benched B: 3 wide to 4 ft, then 11: 1.5, 5.1, 3·1.8 + 11·4 = 49.4. Deepening, 6.4 and 9.6 ft deep:
  // backfill 3·4.2 + (6.4² − 2.2²) = 48.72 and 3·7.4 + (9.6² − 2.2²) = 109.52. The pipe rests on the bedding.
  // D-615: a 100 ft run of 8 in SDR-35 in a 6 ft box on flat ground (G 100), continued 50 ft from one
  // end, then worked out like any run. Box walls are vertical, so the volume is 6 × the mean depth ×
  // the length / 27. Inverts, 8 then 9 ft deep (the invert falls 0.01 ft a foot): from the end, the new
  // end is carried on 0.5 ft lower, 9.5 ft deep: 6 · 8.75 · 150 / 27 = 291.67; from the start, the new
  // start is carried back 0.5 ft higher, 7.5 ft deep: 6 · 8.25 · 150 / 27 = 275.00. Start + slope 1 %
  // the same, the start invert moved back up the slope only when continued from the start. Cover 6.8 ft
  // over an 8.4 in OD with 6 in of bedding is 8.0 ft deep all along: 6 · 8 · 150 / 27 = 266.67. An
  // end on a structure leaves it, with a note.
  { id: "util-615-continue-inverts-end", kind: "continue", mode: "inverts", depth: [8, 9], end: "end", expect: { lengthFt: 150, addedFt: 50, depthsFt: [8, 9.5], excavationCY: 291.67, notes: ["end_invert_projected"], corners: [100, 200, 250] } },
  { id: "util-615-continue-inverts-start", kind: "continue", mode: "inverts", depth: [8, 9], end: "start", expect: { lengthFt: 150, addedFt: 50, depthsFt: [7.5, 9], excavationCY: 275, notes: ["start_invert_projected"], corners: [50, 100, 200] } },
  { id: "util-615-continue-slope-start", kind: "continue", mode: "slope", depth: [8, 9], end: "start", expect: { lengthFt: 150, depthsFt: [7.5, 9], excavationCY: 275, notes: ["start_invert_projected"] } },
  { id: "util-615-continue-slope-end", kind: "continue", mode: "slope", depth: [8, 9], end: "end", expect: { lengthFt: 150, depthsFt: [8, 9.5], excavationCY: 291.67, notes: [] } },
  { id: "util-615-continue-cover-end", kind: "continue", mode: "cover", depth: [8, 8], cover: 6.8, end: "end", expect: { lengthFt: 150, depthsFt: [8, 8], excavationCY: 266.67, notes: [] } },
  { id: "util-615-continue-detached", kind: "continue", mode: "inverts", depth: [8, 9], end: "end", endOn: "MH-2", expect: { notes: ["end_invert_projected", "end_detached"] } },
  // D-615: three manholes counted in a row after MH-1 and MH-2 (BENCH-MH-4 and SMH-9 are other
  // kinds), each with the box's settings; then Count more like this from the second numbers on.
  // The box's settings come from the last one placed, less its own rim and floor.
  {
    id: "util-615-count-three",
    kind: "count",
    type: "sanitary_manhole",
    settings: { inside_dia_in: 60, wall_in: 8 },
    existing: ["MH-1", "MH-2", "BENCH-MH-4", "SMH-9"],
    clicks: 3,
    likeIndex: 1,
    expect: { names: ["MH-3", "MH-4", "MH-5"], more: "MH-6", sameSettings: true, settings: ["sanitary_manhole", 60, 8, 6, "auto"], rimFloor: [null, null] },
  },
  // D-616 (U-UT32 changed): trenches that cross or join, on flat ground (G 100), 8 in SDR-35, each run
  // straight at a constant trench depth. The shared ground is dug once, by the deeper there; the other
  // loses it from its excavation, bedding (0.5 ft), pipe zone (OD 0.7 + 1.0 ft, less its pipe, 0.3848 SF)
  // and backfill. Rows: [loser, keeper, CY, bedding CF, zone CF, backfill CF].
  // 1. A 6 ft box 10 ft deep along x; another 8 ft deep crossing it at 60°. The shared footprint is
  //    6 · 6 / sin 60° = 41.5692 SF, 8 ft high (the shallower): 332.554 CF = 12.32 CY. Bedding 41.5692 · 0.5
  //    = 20.78; zone 41.5692 · 1.7 − 0.3848 · (6 / sin 60°) = 70.668 − 2.666 = 68.00; backfill the rest,
  //    241.10. After: A 6 · 10 · 100 / 27 = 222.22 CY, B (4800 − 332.554) / 27 = 165.46.
  {
    id: "util-616-cross-60",
    kind: "overlap",
    runs: [
      { name: "A", path: [[0, 0], [100, 0]], depth: 10, protection: "box" },
      { name: "B", path: [[25, -43.30127018922193], [75, 43.30127018922193]], depth: 8, protection: "box" },
    ],
    expect: { overlaps: [["B", "A", 12.32, 20.78, 68, 241.1]], afterCY: [222.22, 165.46] },
  },
  // 2. A tee: an 8 ft lateral (6 ft box) runs 40 ft into a 10 ft main's centreline, no structure. The
  //    shared part is the lateral's last 3 ft, 6 · 3 · 8 = 144 CF = 5.33 CY; bedding 9.00, zone 18 · 1.7 −
  //    0.3848 · 3 = 29.45, backfill 104.40. After: the lateral (1920 − 144) / 27 = 65.78.
  {
    id: "util-616-tee",
    kind: "overlap",
    runs: [
      { name: "A", path: [[0, 0], [100, 0]], depth: 10, protection: "box" },
      { name: "B", path: [[50, 40], [50, 0]], depth: 8, protection: "box" },
    ],
    expect: { overlaps: [["B", "A", 5.33, 9, 29.45, 104.4]], afterCY: [222.22, 65.78] },
  },
  // 3. Two 6 ft boxes leaving one manhole 30° apart, each starting at the pit's bottom radius 4.5 ft (a
  //    vertical pit, so no slice of either was given up to it). Their strips overlap in a rhombus;
  //    beyond both starts it is the quadrilateral (4.5, 1.2058), (4.5, 3), (11.1962, 3), (5.3971, −0.3481):
  //    12.0144 SF by the shoelace, 8 ft high: 96.115 CF = 3.56 CY. Bedding 6.01; zone 20.4245 − 0.3848 ·
  //    (6 − 4.5 / cos 30°) = 20.12; backfill 69.68. After: B 95.5 · 48 = 4584 CF less 96.115: 166.22 CY.
  {
    id: "util-616-two-from-one-structure",
    kind: "overlap",
    runs: [
      { name: "A", path: [[4.5, 0], [100, 0]], depth: 10, protection: "box" },
      { name: "B", path: [[3.897114317029974, 2.25], [86.60254037844386, 50]], depth: 8, protection: "box" },
    ],
    pits: [{ x: 0, y: 0, R0: 4.5, k: 0, bottom: 89, top: 100 }],
    expect: { overlaps: [["B", "A", 3.56, 6.01, 20.12, 69.68]], afterCY: [212.22, 166.22] },
  },
  // 4. Two parallel 8 ft trenches 8 ft apart, sloped 1:1 in Type B clay, 3 ft at the bottom. Their
  //    inner walls meet 2.5 ft up; the shared wedge is (3 − 8 + 2 · 8)² / 4 = 30.25 SF, 100 ft long:
  //    3025 CF = 112.04 CY, all of it above the bedding and the zone (2.2 ft): backfill. Equal depth:
  //    the run drawn first keeps it. After: A (3 · 8 + 8²) · 100 / 27 = 325.93, B (8800 − 3025) / 27 = 213.89.
  // D-628: "Trench from" never carries over. Existing grade at 100.00, proposed subgrade at 98.00 (2 ft of
  // cut). The last run, 12 in PVC SDR-35 storm with 3 ft of cover, was dug from existing grade; the new run
  // takes its type, pipe and size but digs from proposed subgrade: its trench bottom is 98.00 - 3 (cover)
  // - 12.50 / 12 (the pipe's OD, 1.042 ft) - 6 / 12 (bedding) = 93.46, not 95.46 from existing grade.
  // D-1100: water, fire water and force main on bank sand, bedding and zone, no stone; the project's or the company's
  // "bedding and zone above" gives the project's back. D-1101: flexible gravity pipe (PVC sewer, HDPE, CMP) with #57
  // stone through the zone (ASTM D2321 Class I to the crown); rigid RCP the project's.
  { id: "util-1100-water-sand", kind: "embedment", type: "water", catalogKey: "pvc_c900_dr18:8", expect: { bedding: "Sand", zone: "Sand" } },
  { id: "util-1100-force-main-sand", kind: "embedment", type: "force_main", catalogKey: "pvc_c900_dr18:6", expect: { bedding: "Sand", zone: "Sand" } },
  { id: "util-1100-fire-di-sand", kind: "embedment", type: "fire_water", catalogKey: "di_c151_pc350:8", expect: { bedding: "Sand", zone: "Sand" } },
  { id: "util-1100-project-choice", kind: "embedment", type: "water", catalogKey: "pvc_c900_dr18:8", settings: { pressureEmbedment: "project" }, expect: { bedding: "project's", zone: "project's" } },
  { id: "util-1100-company-choice", kind: "embedment", type: "water", catalogKey: "pvc_c900_dr18:8", settings: { companyEmbedment: { pressure: "project", flexible: "stone" } }, expect: { bedding: "project's", zone: "project's" } },
  { id: "util-1101-hdpe-stone", kind: "embedment", type: "storm", catalogKey: "hdpe_f2648_dual_wall:24", expect: { bedding: "project's", zone: "#57 stone" } },
  { id: "util-1101-pvc-sewer-stone", kind: "embedment", type: "sanitary", catalogKey: "pvc_d3034_sdr26:8", expect: { bedding: "project's", zone: "#57 stone" } },
  { id: "util-1101-cmp-stone", kind: "embedment", type: "storm", catalogKey: "cmp_16ga:24", expect: { bedding: "project's", zone: "#57 stone" } },
  { id: "util-1101-gas-pe-project", kind: "embedment", type: "gas", catalogKey: "hdpe_ips_dr11:4", expect: { bedding: "project's", zone: "project's" } },
  { id: "util-1101-rcp-project", kind: "embedment", type: "storm", catalogKey: "rcp_c76_wall_b:24", expect: { bedding: "project's", zone: "project's" } },
  { id: "util-1101-flexible-project", kind: "embedment", type: "storm", catalogKey: "hdpe_f2648_dual_wall:24", settings: { flexibleEmbedment: "project", companyEmbedment: { pressure: "sand", flexible: "stone" } }, expect: { bedding: "project's", zone: "project's" } },
  // D-1108: PVC sewer keeps #57 stone; the project's "cement-stabilized sand" (a local spec) takes it for bedding and zone.
  { id: "util-1108-pvc-sewer-css", kind: "embedment", type: "sanitary", catalogKey: "pvc_d3034_sdr26:8", settings: { flexibleEmbedment: "css" }, expect: { bedding: "Cement-stabilized sand", zone: "Cement-stabilized sand" } },
  { id: "util-1108-company-css", kind: "embedment", type: "sanitary", catalogKey: "pvc_d3034_sdr26:8", settings: { companyEmbedment: { pressure: "sand", flexible: "css" } }, expect: { bedding: "Cement-stabilized sand", zone: "Cement-stabilized sand" } },
  // D-1106: water, fire water and force main dig 6 in a side and 18 in at least (OD + 12 in), lie at 4 ft cover with no
  // depth typed (the company's over it) and start by their cover; storm keeps 12 in and 24 in and starts by its inverts.
  { id: "util-1106-water-section", kind: "pressure-section", type: "water", expect: { section: [6, 18], cover: 4, vertical: "cover" } },
  { id: "util-1106-force-main-company-cover", kind: "pressure-section", type: "force_main", settings: { companyPressureCoverFt: 5 }, expect: { section: [6, 18], cover: 5, vertical: "cover" } },
  { id: "util-1106-fire-project-trench", kind: "pressure-section", type: "fire_water", settings: { pressureSideClearanceIn: 9, pressureMinWidthIn: 24 }, expect: { section: [9, 24], cover: 4, vertical: "cover" } },
  { id: "util-1106-storm-keeps", kind: "pressure-section", type: "storm", expect: { section: [12, 24], cover: null, vertical: "inverts" } },
  { id: "util-628-new-run-from-proposed", kind: "newrun", type: "storm", catalogKey: "pvc_d3034_sdr35:12", nominalIn: 12, coverFt: 3, beddingIn: 6, groundFt: { existing: 100, proposed: 98 },
    expect: { lastFrom: "existing", newFrom: "proposed", newGroundFt: 98, newTrenchBottomFt: 93.46, carried: "storm pvc_d3034_sdr35:12 12" } },
  {
    id: "util-616-parallel",
    kind: "overlap",
    runs: [
      { name: "A", path: [[0, 0], [100, 0]], depth: 8, protection: "sloped" },
      { name: "B", path: [[0, 8], [100, 8]], depth: 8, protection: "sloped" },
    ],
    expect: { overlaps: [["B", "A", 112.04, 0, 0, 3025]], afterCY: [325.93, 213.89], widths: [3, 3] },
  },
  { id: "util-613-cut-sloped", ...caseA(), trenchCut: [50], expect: { cut: [[19, 3, 8, 1.75, 5.1, 81.15, 0.85, 0.35]], cutZoneGap: 0 } },
  { id: "util-613-cut-box", ...caseA({ protection: "box", boxes: [BOX_6x8], boxRef: "b6" }), trenchCut: [50], expect: { cut: [[6, 6, 8, 3, 10.2, 34.8, 0.85, 0.35]], cutZoneGap: 0 } },
  { id: "util-613-cut-benched", ...caseA({ protection: "benched" }), trenchCut: [50], expect: { cut: [[11, 3, 8, 1.5, 5.1, 49.4, 0.85, 0.35]], cutZoneGap: 0 } },
  { id: "util-613-cut-deepening", ...caseA({ depth: [6, 10] }), trenchCut: [10, 90], expect: { cut: [[15.8, 3, 6.4, 1.75, 5.1, 53.31, 0.85, 0.35], [22.2, 3, 9.6, 1.75, 5.1, 114.11, 0.85, 0.35]], cutZoneGap: 0 } },
  { id: "util-2a2-bucket-24-pipe-governs", ...caseA({ bucket: 24 }), expect: { widthText: "Width 32.4 in — pipe width", excavationCY: 317.04, beddingCY: 5.93, zoneCY: 15.57, backfillCY: 294.11, maxTopWidthFt: 18.7 } },
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
    expect: { hasFlag: "Benching isn't allowed in this soil.", excavationCY: 444.44, beddingCY: 6.94, zoneCY: 17.46, backfillCY: 418.61, maxTopWidthFt: 27 },
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
  { id: "util-2f-clay-over-sand", ...caseA({ layers: [{ ...CLAY_B, depth: 3 }, { ...SAND_C, depth: null }] }), expect: { excavationCY: 444.44, beddingCY: 6.94, zoneCY: 17.46, backfillCY: 418.61 } },
  {
    id: "util-2g-slope-template",
    ...caseA({ rule: TEMPLATE }),
    expect: { excavationCY: 207.41, beddingCY: 6.02, zoneCY: 17.46, backfillCY: 182.5, maxTopWidthFt: 11, hasNote: "Steeper than federal OSHA — confirm with the geotech report and your state's rules." },
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
  { id: "util-2m-spoils", ...caseA(), expect: { nativeBankCY: 325.93, spoilsSuitableCY: 0 } },
  // D-1084 (B8c): under pavement the backfill stops 12 in below the surface. Case (a), 8 ft deep at 1:1 on a 3 ft bottom:
  // the top foot is (17 + 19) / 2 × 1 = 18 SF a foot, 1,800 CF over 100 LF = 66.67 CY off the backfill, 300.56 − 66.67.
  { id: "util-1084-paved-cap", ...caseA({ pavedCapIn: 12 }), expect: { excavationCY: 325.93, zoneCY: 17.46, backfillCY: 233.89 } },
  // D-1084 (B7b): Type A short-term ½:1 to 12 ft. Case (a) in Type A soil (¾:1 without it), 8 ft deep: top width
  // 3 + 2 × 0.5 × 8 = 11 ft; the dig (3 + 11) / 2 × 8 = 56 SF a foot, 5,600 CF = 207.41 CY.
  { id: "util-1084-type-a-short-term", ...caseA({ layers: [{ ...CLAY_B, osha: "A", depth: null }], rule: { mode: "osha", rows: [], source: "", typeAShortTerm: true } }), expect: { excavationCY: 207.41, maxTopWidthFt: 11 } },
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
        ["backfill", "Clay", "native", 109.11],
        ["backfill", "Native", "native", 180.33],
        ["bedding", "#57 stone", "imported", 3.89],
        ["zone", "Clay", "native", 6.99],
        ["zone", "Sand", "imported", 10.48],
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
        ["8\" PVC SDR-35, 6–8 ft deep", "LF", 100, "utility_pipe", "site_utilities.sanitary"],
        ["Trench excavation, Clay", "BCY", 325.93, "utility_trench_excavation", "site_utilities.sanitary"],
        ["Pipe bedding, #57 stone", "CCY", 6.48, "utility_bedding_pipe_zone", "site_utilities.sanitary"],
        ["Pipe zone, Sand", "CCY", 17.46, "utility_bedding_pipe_zone", "site_utilities.sanitary"],
        ["Trench backfill, Native", "CCY", 300.56, "utility_backfill", "site_utilities.sanitary"],
        // D-1068 a: a sloped trench is its own protection: no line (it was "Trench protection, Sloped 1:1 8–10 ft", 100 LF).
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
    bottom: { kind: "fixed", depthFt: 6.5, from: "subgrade" },
    expect: { totalCY: 1166.67 },
  },
  {
    // D-895, the rule: the same fill area, bottom below existing ground: 7,000 × 6.5 = 45,500 CF = 1,685.19 CY.
    id: "d895-overex-lower-in-fill",
    kind: "overex",
    prisms: SQUARE(100, 102, 2),
    outline: [[[0, 0], [100, 0], [100, 70], [0, 70]]],
    bottom: { kind: "fixed", depthFt: 6.5 },
    expect: { totalCY: 1685.19 },
  },
  {
    // D-895, a cut area, ground 2.0 ft above the subgrade: below subgrade, all of it, 1,685.19 CY.
    id: "d895-overex-lower-in-cut",
    kind: "overex",
    prisms: SQUARE(102, 100, -2),
    outline: [[[0, 0], [100, 0], [100, 70], [0, 70]]],
    bottom: { kind: "fixed", depthFt: 6.5 },
    expect: { totalCY: 1685.19 },
  },
  {
    // The override "below existing" in that cut: 4.5 ft, 1,166.67 CY.
    id: "d895-overex-existing-in-cut",
    kind: "overex",
    prisms: SQUARE(102, 100, -2),
    outline: [[[0, 0], [100, 0], [100, 70], [0, 70]]],
    bottom: { kind: "fixed", depthFt: 6.5, from: "existing" },
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
    bottom: { kind: "fixed", depthFt: 6.5, from: "subgrade" },
    expect: { totalCY: 1555.56, byLayerCY: [0, 1555.56] },
  },
  {
    // D-895: the same strip under the rule. The stripped grade is the lower surface, so 6.5 ft below it,
    // 45,500 CF = 1,685.19 CY, none of it topsoil.
    id: "d895-overex-strip-first",
    kind: "overex",
    prisms: SQUARE(100, 100, 0.5),
    outline: [[[50, 50], [140, 50], [140, 110], [50, 110]]],
    extendFt: 5,
    layers: 2,
    bottoms: [[{ poly: BIG, a: 0.5, b: 0, c: 0 }]],
    bottom: { kind: "fixed", depthFt: 6.5 },
    expect: { totalCY: 1685.19, byLayerCY: [0, 1685.19] },
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
  // D-898: a pipe line's crew by its kind and joining; the role stays utility_pipe.
  { ...caseA(), id: "d898-crew-water-c900", lines: true, lineType: "water", lineKey: "pvc_c900_dr18:10", expect: { crew: "pressure" } },
  { ...caseA(), id: "d898-crew-fire-ductile", lines: true, lineType: "fire_water", lineKey: "di_c151_pc350:8", expect: { crew: "pressure" } },
  { ...caseA(), id: "d898-crew-force-hdpe", lines: true, lineType: "force_main", lineKey: "hdpe_ips_dr11:8", expect: { crew: "fused" } },
  { ...caseA(), id: "d898-crew-sewer-gravity", lines: true, lineType: "sanitary", lineKey: "pvc_d3034_sdr35:8", expect: { crew: null } },
  { ...caseA(), id: "d898-crew-gas-hdpe-gravity-crew", lines: true, lineType: "gas", lineKey: "hdpe_ips_dr11:4", expect: { crew: null } },
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
  // --- D-1260 (F44): utility types by group. Each row is a type's defaults, then its run through the lines and their
  // materials, every figure worked by hand: one row a group, a duct bank of 4 encased conduits, a water service with
  // its tap, and 6 in Sch 40 DWV against 6 in SDR-35.
  {
    // Gravity: a new sanitary main takes SDR-35 8 in by inverts and TV inspection; D-1268: no warning tape on a
    // gravity type's defaults (was "tape cctv", a:cctv+tape, and warning_tape among the keys).
    id: "util-1260-gravity-sanitary-main",
    kind: "type-lines",
    type: "sanitary",
    label: '8" PVC SDR-35',
    lf: 100,
    expect: {
      group: "gravity",
      base: "sanitary",
      pipe: "pvc_d3034_sdr35:8",
      vertical: "inverts",
      cover: null,
      addons: "cctv",
      connection: null,
      production: "main",
      install: "trench",
      roles: "utility_pipe utility_trench_excavation utility_bedding_pipe_zone utility_bedding_pipe_zone utility_backfill",
      variant: "pvc_d3034_sdr35:8|1|0–6 ft||a:cctv",
      lf: 100,
      keys: "pipe:pvc_d3034_sdr35:8 fit:pipe:pvc_d3034_sdr35:8 addon:cctv",
      "addon:cctv:qty": "QTY",
      "addon:cctv:unit": "LF",
    },
  },
  {
    // Pressure: a new water main, C900 DR 18 8 in at the company's cover, tracer, tape, test and disinfection.
    id: "util-1260-pressure-water-main",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    expect: {
      group: "pressure",
      base: "water",
      pipe: "pvc_c900_dr18:8",
      vertical: "cover",
      cover: null,
      addons: "tracer tape test_disinfect",
      production: "main",
      variant: "pvc_c900_dr18:8|1|0–6 ft||a:tape+test_disinfect+tracer",
      keys: "pipe:pvc_c900_dr18:8 fit:pipe:pvc_c900_dr18:8 tracer_wire warning_tape addon:test_disinfect",
      "fit:pipe:pvc_c900_dr18:8:name": "Fittings allowance, 20 %",
      "addon:test_disinfect:qty": "QTY",
    },
  },
  {
    // A water service with its tap: 1 in PE CTS SDR 9, short-run production (its own line), one tap at the main.
    id: "util-1260-water-service-tap",
    kind: "type-lines",
    type: "water_service",
    label: '1" PE CTS SDR 9',
    lf: 60,
    expect: {
      group: "pressure",
      base: "water",
      pipe: "pe_cts_sdr9:1",
      vertical: "cover",
      cover: null,
      connection: "tap",
      production: "short",
      // D-1267: a type other than its base a line of its own (`t:`), its own scope.
      variant: "pe_cts_sdr9:1|1|0–6 ft||short|t:water_service|a:tape+test_disinfect+tracer",
      name: '1" PE CTS SDR 9, 0–6 ft deep, short run',
      lf: 60,
      keys: "pipe:pe_cts_sdr9:1 fit:pipe:pe_cts_sdr9:1 tracer_wire warning_tape addon:test_disinfect tap:water:1",
      "tap:water:1:qty": "1",
      "tap:water:1:unit": "EA",
      "tap:water:1:name": 'Service tap at the main (saddle and corporation stop), 1"',
    },
  },
  {
    // Gas: a gas service, 1 in gas PE CTS at 2 ft (49 CFR 192.361), priced on the gas key, a service tee at the main.
    id: "util-1260-gas-service",
    kind: "type-lines",
    type: "gas_service",
    label: '1" Gas PE CTS',
    lf: 45,
    expect: {
      group: "gas",
      base: "gas",
      pipe: "pe_gas_cts:1",
      vertical: "cover",
      cover: 2,
      connection: "tap",
      production: "short",
      keys: "gas:pe_cts:1 fit:gas:pe_cts:1 tracer_wire warning_tape addon:pressure_test tap:gas:1",
      "fit:gas:pe_cts:1:name": "Fittings allowance, 5 %",
      "tap:gas:1:qty": "1",
    },
  },
  {
    // Dry: a duct bank, 4 x 4 in Sch 40 conduit (OD 4.500) at 3 in apart in a 30 x 12 in encasement, 100 LF of run:
    // (30 x 12 − 4 x π x 4.5² / 4) / 144 / 27 = 0.076230 CY a LF of run, 7.62 CY; on the 400 LF line 0.019058 a LF.
    id: "util-1260-dry-duct-bank-encased",
    kind: "type-lines",
    type: "electric",
    label: '4" PVC Conduit Sch 40',
    lf: 100,
    run: { pipes: 4, pipe_gap_in: 3 },
    section: { encasement: { width_in: 30, height_in: 12 } },
    expect: {
      group: "dry",
      base: "electric",
      pipe: "conduit_sch40:4",
      vertical: "cover",
      cover: 3,
      addons: "tape pull_string",
      encCyPerLf: 0.07623013085514575,
      variant: "conduit_sch40:4|4|0–6 ft||enc:30x12|a:pull_string+tape",
      // D-1267: the trench's length in the name of a line of several pipes.
      name: '4" PVC Conduit Sch 40, 4 pipes x 100 LF, 0–6 ft deep, encased 30 x 12 in',
      lf: 400,
      keys: "pipe:conduit_sch40:4 fit:pipe:conduit_sch40:4 warning_tape concrete:encasement addon:pull_string",
      "concrete:encasement:qty": "QTY * 0.019058",
      "concrete:encasement:unit": "CY",
      "addon:pull_string:qty": "QTY",
    },
  },
  {
    // Crossings: a bored casing, 16 in steel 0.375 wall at 4 ft: its pipe line only (no trench), no tracer or tape.
    id: "util-1260-crossing-casing-bored",
    kind: "type-lines",
    type: "casing",
    label: '16" Steel Casing 0.375 wall',
    lf: 80,
    expect: {
      group: "crossing",
      base: "other",
      pipe: "steel_casing_375:16",
      vertical: "cover",
      cover: 4,
      install: "bore",
      roles: "utility_pipe",
      variant: "steel_casing_375:16|1|0–6 ft||bore|t:casing|a:none",
      keys: "pipe:steel_casing_375:16 fit:pipe:steel_casing_375:16",
    },
  },
  {
    // Crossings: an encasement over 8 in SDR-35 (OD 8.400) already taken off, OD + 12 in square, 20.4 x 20.4 in:
    // (20.4² − π x 8.4² / 4) / 3888 = 0.092784 CY a LF; it buys the concrete only, no pipe and no trench.
    id: "util-1260-crossing-encasement-only",
    kind: "type-lines",
    type: "encasement",
    label: '8" PVC SDR-35',
    lf: 30,
    expect: {
      group: "crossing",
      install: "none",
      roles: "utility_pipe",
      encCyPerLf: 0.09278351481241669,
      keys: "concrete:encasement",
      "concrete:encasement:qty": "QTY * 0.092784",
    },
  },
  {
    // Other: every pipe, nothing bought beyond what Other bought before (none).
    id: "util-1260-other",
    kind: "type-lines",
    type: "other",
    label: '8" PVC SDR-35',
    lf: 50,
    expect: { group: "other", base: "other", pipe: "pvc_d3034_sdr35:8", vertical: "inverts", addons: "", keys: "" },
  },
  // --- D-1260 follow-up (night run part 4): tees and bends by the run's base (`buysFittings`). A hydrant lead or a
  // water service is water: its bend is a fitting, not "Bend between structures"; a storm lead's bend is flagged. A
  // base key is its own base, so a run stored before D-1260 reads as it did.
  // A 6 in hydrant lead, 20 ft then a right angle 15 ft to the hydrant: one 90, not flagged.
  { id: "util-1260-fitted-hydrant-lead-bend", kind: "fitted", type: "hydrant_lead", path: [[0, 0], [20, 0], [20, 15]], expect: { base: "water", fitted: true, bends: "90x1", flagged: false } },
  // A water service ending on a water main between structures: the main's tee.
  { id: "util-1260-fitted-water-service-tee", kind: "fitted", type: "water_service", runs: [{ id: "main", type: "water", path: [[0, 0], [200, 0]] }, { id: "service", type: "water_service", path: [[100, 0.5], [100, 60]] }], expect: { base: "water", fitted: true, tees: "mainx1" } },
  // A storm lead with the same right angle: no fitting bought, the bend flagged for a person to read.
  { id: "util-1260-fitted-storm-lead-flagged", kind: "fitted", type: "storm_lead", path: [[0, 0], [20, 0], [20, 15]], expect: { base: "storm", fitted: false, bends: "90x1", flagged: true } },
  // A water main stored with the base key, as before D-1260: unchanged.
  { id: "util-1260-fitted-water-base-key", kind: "fitted", type: "water", path: [[0, 0], [20, 0], [20, 15]], expect: { base: "water", fitted: true, bends: "90x1", flagged: false } },
  // --- D-1261 (F45): restrained joints on water, fire and force-main runs, one bell restraint per 20 ft joint:
  // sets = pipes x ceil(run LF x pct / 100 / 20), on the library's key by family and size, the run a line of its own.
  {
    // A 200 LF 8 in C900 water main, the whole line: ceil(200 / 20) = 10 sets of restraint_joint:pvc_c900:8.
    id: "util-1261-water-whole",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    section: { restrained_pct: 100 },
    expect: {
      restrainedPct: 100,
      restrainedJoints: 10,
      // D-1267 (D-1265 13): the sets on the shared pipe line, no line of its own.
      variant: "pvc_c900_dr18:8|1|0–6 ft||a:tape+test_disinfect+tracer",
      name: '8" PVC C900 DR 18, 0–6 ft deep',
      lf: 200,
      keys: "pipe:pvc_c900_dr18:8 fit:pipe:pvc_c900_dr18:8 tracer_wire warning_tape addon:test_disinfect restraint_joint:pvc_c900:8",
      "restraint_joint:pvc_c900:8:qty": "10",
      "restraint_joint:pvc_c900:8:unit": "EA",
      "restraint_joint:pvc_c900:8:name": 'Bell joint restraint, 8" (a set per 20 ft joint)',
    },
  },
  {
    // The same main at 35 %: 70 LF restrained, ceil(70 / 20) = ceil(3.5) = 4 sets.
    id: "util-1261-water-35pct",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    section: { restrained_pct: 35 },
    expect: {
      restrainedPct: 35,
      restrainedJoints: 4,
      variant: "pvc_c900_dr18:8|1|0–6 ft||a:tape+test_disinfect+tracer",
      name: '8" PVC C900 DR 18, 0–6 ft deep',
      "restraint_joint:pvc_c900:8:qty": "4",
    },
  },
  {
    // A 6 in ductile iron fire line of 95 LF, whole: ceil(95 / 20) = ceil(4.75) = 5 sets of restraint_joint:ductile_iron:6.
    id: "util-1261-fire-di-whole",
    kind: "type-lines",
    type: "fire_water",
    label: '6" Ductile Iron PC 350',
    lf: 95,
    run: { catalog_key: "di_c151_pc350:6", nominal_in: 6 },
    section: { restrained_pct: 100 },
    // D-1267 (D-1265 12): ductile iron at its own 18 ft joint: ceil(95 / 18) = ceil(5.28) = 6 (was 5 at 20 ft).
    expect: { restrainedPct: 100, restrainedJoints: 6, "restraint_joint:ductile_iron:6:qty": "6", "restraint_joint:ductile_iron:6:unit": "EA", "restraint_joint:ductile_iron:6:name": 'Bell joint restraint, 6" (a set per 18 ft joint)' },
  },
  {
    // Irrigation (base water) in 4 in D2241 SDR 21, 90 LF at 50 %: 45 LF, ceil(2.25) = 3 sets on the IPS restraint.
    id: "util-1261-irrigation-d2241-half",
    kind: "type-lines",
    type: "irrigation",
    label: '4" PVC SDR 21',
    lf: 90,
    run: { catalog_key: "pvc_d2241_sdr21:4", nominal_in: 4 },
    section: { restrained_pct: 50 },
    // D-1268: irrigation is a pressure type, tape on by default (was a:pressure_test).
    expect: { restrainedPct: 50, restrainedJoints: 3, variant: "pvc_d2241_sdr21:4|1|0–6 ft||t:irrigation|a:pressure_test+tape", "restraint_joint:pvc_ips:4:qty": "3" },
  },
  {
    // A fused HDPE force main, whole line asked: fused joints have no bell to restrain, so no sets and no line of its own.
    id: "util-1261-force-hdpe-none",
    kind: "type-lines",
    type: "force_main",
    label: '8" HDPE DR 11',
    lf: 200,
    run: { catalog_key: "hdpe_ips_dr11:8", nominal_in: 8 },
    section: { restrained_pct: 100 },
    expect: { restrainedPct: 100, restrainedJoints: 0, variant: "hdpe_ips_dr11:8|1|0–6 ft||a:pressure_test+tape+tracer" },
  },
  {
    // Off, the default: a water main buys no restraint and keeps D-1260's line.
    id: "util-1261-water-off",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    expect: { restrainedPct: 0, restrainedJoints: 0, variant: "pvc_c900_dr18:8|1|0–6 ft||a:tape+test_disinfect+tracer", keys: "pipe:pvc_c900_dr18:8 fit:pipe:pvc_c900_dr18:8 tracer_wire warning_tape addon:test_disinfect" },
  },
  {
    // A sanitary main is never offered it: a stored 100 reads as off.
    id: "util-1261-sanitary-never",
    kind: "type-lines",
    type: "sanitary",
    label: '8" PVC SDR-35',
    lf: 100,
    section: { restrained_pct: 100 },
    // D-1268: no tape on a gravity type's defaults (was a:cctv+tape).
    expect: { restrainedPct: 0, restrainedJoints: 0, variant: "pvc_d3034_sdr35:8|1|0–6 ft||a:cctv" },
  },
  // 6 in Sch 40 DWV against 6 in SDR-35: IPS OD 6.625, wall 0.280, ID 6.065 (S18), 30.625 in of pipe width at 12 in a
  // side; the sewer pipe's OD 6.275, wall 0.180, ID 5.893 (S1), 30.275 in.
  { id: "util-1260-dwv-6", kind: "catalog", pick: "pvc_dwv_sch40:6", expect: { od: 6.625, wall: 0.28, id: 6.065, odMark: "standard", pipeWidthIn: 30.625 } },
  { id: "util-1260-sdr35-6", kind: "catalog", pick: "pvc_d3034_sdr35:6", expect: { od: 6.275, wall: 0.18, id: 5.893, pipeWidthIn: 30.275 } },
  // IPS ODs for the Schedule families (4 in 4.500, 6 in 6.625) and the D2241 wall by its rule, OD / SDR: 4.5 / 21.
  { id: "util-1260-sch80-4", kind: "catalog", pick: "pvc_sch80:4", expect: { od: 4.5, wall: 0.337, id: 3.826 } },
  { id: "util-1260-d2241-sdr21-4", kind: "catalog", pick: "pvc_d2241_sdr21:4", expect: { od: 4.5, wall: 0.214, wallMark: "derived_sdr" } },
  // --- D-1267: F44–F47 acceptance fixes. The ESTIMATE LINE: each material's sold quantity as Estimating prices it
  // (`:sold`: its formula on the line's QTY, its waste, its purchase unit, pipe in whole joints in the bid).
  {
    // The part1 smoke's duct bank: 4 x 4 in Sch 40 conduit, 100 LF of trench, 30 x 12 in encased. The line carries
    // 4 x 100 = 400 LF of conduit, named with its trench. Conduit 400 x 1.02 = 408 -> 41 joints of 10 ft = 410 LF;
    // pull string 400 LF (a conduit's own); tape one a trench, 400 / 4 x 1.05 / 1000 = 0.105 -> 1 roll; concrete
    // 400 x 0.019058 = 7.6232 CY (0.076230 a LF of trench x 100), x 1.05 waste = 8.0044.
    id: "util-1267-duct-bank-100lf-line",
    kind: "type-lines",
    type: "electric",
    label: '4" PVC Conduit Sch 40',
    lf: 100,
    run: { pipes: 4, pipe_gap_in: 3 },
    section: { encasement: { width_in: 30, height_in: 12 } },
    expect: {
      lf: 400,
      name: '4" PVC Conduit Sch 40, 4 pipes x 100 LF, 0–6 ft deep, encased 30 x 12 in',
      "pipe:conduit_sch40:4:sold": 410,
      "addon:pull_string:sold": 400,
      "warning_tape:qty": "QTY / 4 * 1.05 / 1000",
      "warning_tape:sold": 1,
      "concrete:encasement:sold": 8.0044,
    },
  },
  {
    // The founder's reading, 400 LF of trench: 1600 LF of conduit. 1600 x 1.02 = 1632 -> 164 joints = 1640 LF; pull
    // string 1600 LF; tape 1600 / 4 x 1.05 / 1000 = 0.42 -> 1 roll (2 before D-1267: 1.68 a pipe's LF); concrete
    // 1600 x 0.019058 = 30.4928 CY (0.076230 x 400 = 30.49), x 1.05 = 32.0174 sold.
    id: "util-1267-duct-bank-400lf-line",
    kind: "type-lines",
    type: "electric",
    label: '4" PVC Conduit Sch 40',
    lf: 400,
    run: { pipes: 4, pipe_gap_in: 3 },
    section: { encasement: { width_in: 30, height_in: 12 } },
    expect: {
      lf: 1600,
      name: '4" PVC Conduit Sch 40, 4 pipes x 400 LF, 0–6 ft deep, encased 30 x 12 in',
      "pipe:conduit_sch40:4:sold": 1640,
      "addon:pull_string:sold": 1600,
      "warning_tape:sold": 1,
      "concrete:encasement:sold": 32.0174,
      "fit:pipe:conduit_sch40:4:pct": 5,
    },
  },
  {
    // Two 1 in PE CTS services in one trench, 60 LF: a tap a pipe (2), tracer a pipe's own (120 x 1.1 / 500 = 0.264 ->
    // 1 roll), tape one a trench (120 / 2 x 1.05 / 1000 = 0.063 -> 1); the water service's own scope.
    id: "util-1267-water-service-two-pipes",
    kind: "type-lines",
    type: "water_service",
    label: '1" PE CTS SDR 9',
    lf: 60,
    run: { pipes: 2, pipe_gap_in: 6 },
    expect: {
      lf: 120,
      variant: "pe_cts_sdr9:1|2|0–6 ft||short|t:water_service|a:tape+test_disinfect+tracer",
      workScope: "site_utilities.water_service",
      utility: "water_service",
      "tap:water:1:qty": "2",
      "tracer_wire:sold": 1,
      "warning_tape:qty": "QTY / 2 * 1.05 / 1000",
      "addon:test_disinfect:sold": 120,
    },
  },
  {
    // The part4 hydrant lead: 6 in DI, a 90 bend counted, its MJ restraint set: the allowance 0 % (was 10 %).
    id: "util-1267-hydrant-lead-bend-allowance",
    kind: "type-lines",
    type: "hydrant_lead",
    label: '6" Ductile Iron PC 350',
    lf: 35,
    bends: [{ angle: 90, count: 1 }],
    expect: {
      workScope: "site_utilities.hydrant_lead",
      "fit:pipe:di_c151_pc350:6:name": "Fittings allowance, 0 % (fittings counted on this line)",
      "fit:pipe:di_c151_pc350:6:pct": 0,
      "bend:ductile_iron:90:6:qty": "1",
      "restraint:ductile_iron:6:qty": "1",
    },
  },
  {
    // The part2 restrained main, 8 in C900, 200 LF whole: the sets on the shared line (10 at 20 ft), the allowance 0 %.
    id: "util-1267-restrained-c900-shared-allowance",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    section: { restrained_pct: 100 },
    expect: {
      variant: "pvc_c900_dr18:8|1|0–6 ft||a:tape+test_disinfect+tracer",
      name: '8" PVC C900 DR 18, 0–6 ft deep',
      workScope: "site_utilities.water",
      utility: "water",
      "restraint_joint:pvc_c900:8:sold": 10,
      // D-1267 correction: restraint sets are never counted fittings: the allowance stays 20 %.
      "fit:pipe:pvc_c900_dr18:8:pct": 20,
      "fit:pipe:pvc_c900_dr18:8:name": "Fittings allowance, 20 %",
    },
  },
  {
    // A water main of 200 LF restrained at 35 % (through the lines): 4 sets (ceil(70 / 20)), the allowance kept at 20 %.
    id: "util-1267-restrained-35-allowance-kept",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    section: { restrained_pct: 35 },
    expect: { "restraint_joint:pvc_c900:8:qty": "4", "fit:pipe:pvc_c900_dr18:8:pct": 20, "fit:pipe:pvc_c900_dr18:8:name": "Fittings allowance, 20 %" },
  },
  {
    // A water service's tap at the main is a connection, never a counted fitting: 1 in PE CTS, 60 LF, the allowance 20 %.
    id: "util-1267-tap-not-counted",
    kind: "type-lines",
    type: "water_service",
    label: '1" PE CTS SDR 9',
    lf: 60,
    expect: { "tap:water:1:qty": "1", "fit:pipe:pe_cts_sdr9:1:pct": 20, "fit:pipe:pe_cts_sdr9:1:name": "Fittings allowance, 20 %" },
  },
  {
    // A plain water main keeps its 20 %; a sanitary main its 5 % (nothing counted).
    id: "util-1267-water-main-allowance-kept",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    expect: { "fit:pipe:pvc_c900_dr18:8:pct": 20, "fit:pipe:pvc_c900_dr18:8:name": "Fittings allowance, 20 %" },
  },
  {
    id: "util-1267-sanitary-allowance-kept",
    kind: "type-lines",
    type: "sanitary",
    label: '8" PVC SDR-35',
    lf: 100,
    expect: { "fit:pipe:pvc_d3034_sdr35:8:pct": 5, "fit:pipe:pvc_d3034_sdr35:8:name": "Fittings allowance, 5 %", workScope: "site_utilities.sanitary" },
  },
  {
    // A C909 main with a 45: the C900 (DI MJ) bend key; its MJ restraint on C909's own key (D-1265 16).
    id: "util-1267-c909-bend-restraint",
    kind: "type-lines",
    type: "water",
    label: '8" PVCO C909 Class 235',
    lf: 120,
    run: { catalog_key: "pvco_c909_235:8", nominal_in: 8 },
    bends: [{ angle: 45, count: 1 }],
    expect: { "bend:pvc_c900:45:8:qty": "1", "restraint:pvco_c909:8:qty": "1" },
  },
  {
    // D-1265 (1): a water main stored before F44 (no add-ons in its section) buys D-1080's tracer and tape only.
    id: "util-1267-pre-f44-run-no-addons",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    legacy: true,
    section: {},
    expect: {
      addons: "",
      variant: "pvc_c900_dr18:8|1|0–6 ft",
      keys: "pipe:pvc_c900_dr18:8 fit:pipe:pvc_c900_dr18:8 tracer_wire warning_tape",
    },
  },
  // D-1265 (10): Schedule 80 on every pressure type (12 in and under, the entry's sizes); PP sanitary on the service.
  { id: "util-1267-sch80-water-service", kind: "offers", type: "water_service", entry: "pvc_sch80", expect: { offered: true } },
  { id: "util-1267-sch80-hydrant-lead", kind: "offers", type: "hydrant_lead", entry: "pvc_sch80", expect: { offered: true } },
  { id: "util-1267-sch80-fire-line", kind: "offers", type: "fire_water", entry: "pvc_sch80", expect: { offered: true } },
  { id: "util-1267-sch40-hydrant-lead-not", kind: "offers", type: "hydrant_lead", entry: "pvc_sch40", expect: { offered: false } },
  { id: "util-1267-sch80-sanitary-not", kind: "offers", type: "sanitary", entry: "pvc_sch80", expect: { offered: false } },
  { id: "util-1267-pp-sanitary-service", kind: "offers", type: "sanitary_service", entry: "pp_sanitary", expect: { offered: true } },
  // D-1265 (11, 12): the MH a set by size (14 with 16, 18 with 20–24, 30–36 at 1.0) and the joint by family.
  {
    id: "util-1267-restraint-mh-and-joint",
    kind: "restraint-mh",
    sizes: [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 30, 36],
    keys: ["pvc_c900_dr18:8", "di_c151_pc350:8", "pvco_c909_235:8", "pvc_c905_dr18:16", "pvc_d2241_sdr21:4", "hdpe_ips_dr11:8"],
    expect: {
      mh: "4:0.2 6:0.2 8:0.25 10:0.35 12:0.35 14:0.5 16:0.5 18:0.75 20:0.75 24:0.75 30:1 36:1",
      jointFt: "pvc_c900_dr18:8:20 di_c151_pc350:8:18 pvco_c909_235:8:20 pvc_c905_dr18:16:20 pvc_d2241_sdr21:4:20 hdpe_ips_dr11:8:null",
    },
  },
  // --- D-1268: price library corrections. A new storm main's pipe, warning tape on for pressure types and off for
  // gravity (a new run's stored add-ons), the estimate line's sold quantities the new prices ride on (priced in
  // drives/quantity-table.py prices).
  {
    // A new storm sewer main: 18 in RCP Class III (ASTM C76 Wall B), no tape. 100 LF x 1.01 waste = 101 -> 13 joints of
    // 8 ft = 104 LF; a gasket a joint, ceil(100 / 8) = 13; the gravity allowance 5 %.
    id: "util-1268-storm-main-default",
    kind: "type-lines",
    type: "storm",
    label: '18" RCP Wall B',
    lf: 100,
    expect: {
      pipe: "rcp_c76_wall_b:18",
      vertical: "inverts",
      addons: "",
      variant: "rcp_c76_wall_b:18|1|0–6 ft||a:none",
      keys: "pipe:rcp_c76_wall_b:18 fit:pipe:rcp_c76_wall_b:18 gasket:rcp:18",
      "pipe:rcp_c76_wall_b:18:sold": 104,
      "gasket:rcp:18:qty": "ceil(QTY / 8)",
      "gasket:rcp:18:sold": 13,
      "fit:pipe:rcp_c76_wall_b:18:pct": 5,
    },
  },
  {
    // The storm lead keeps HDPE dual wall 12 in, tied in at the structure; no tape now (gravity).
    id: "util-1268-storm-lead-hdpe",
    kind: "type-lines",
    type: "storm_lead",
    label: '12" HDPE Dual Wall',
    lf: 40,
    expect: { pipe: "hdpe_f2648_dual_wall:12", addons: "", connection: "tie_in", variant: "hdpe_f2648_dual_wall:12|1|0–6 ft||short|t:storm_lead|a:none" },
  },
  {
    // A new water main, 200 LF: tape on (pressure). Tape 200 x 1.05 / 1000 = 0.21 -> 1 roll; tracer 200 x 1.1 / 500 =
    // 0.44 -> 1 roll (priced $95.00 now); test and disinfection 200 LF by the foot.
    id: "util-1268-water-tape-on",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    expect: {
      addons: "tracer tape test_disinfect",
      keys: "pipe:pvc_c900_dr18:8 fit:pipe:pvc_c900_dr18:8 tracer_wire warning_tape addon:test_disinfect",
      "warning_tape:sold": 1,
      "tracer_wire:sold": 1,
      "addon:test_disinfect:sold": 200,
    },
  },
  {
    // A new sanitary main, 300 LF: tape off (gravity), CCTV by the foot 300 LF.
    id: "util-1268-sanitary-tape-off",
    kind: "type-lines",
    type: "sanitary",
    label: '8" PVC SDR-35',
    lf: 300,
    expect: { addons: "cctv", variant: "pvc_d3034_sdr35:8|1|0–6 ft||a:cctv", keys: "pipe:pvc_d3034_sdr35:8 fit:pipe:pvc_d3034_sdr35:8 addon:cctv", "addon:cctv:sold": 300 },
  },
  {
    // A new sanitary service: no add-on at all now (tape was its only one); its wye at the main.
    id: "util-1268-sanitary-service-tape-off",
    kind: "type-lines",
    type: "sanitary_service",
    label: '6" PVC SDR-35',
    lf: 35,
    expect: { addons: "", connection: "wye", variant: "pvc_d3034_sdr35:6|1|0–6 ft||short|t:sanitary_service|a:none", keys: "pipe:pvc_d3034_sdr35:6 fit:pipe:pvc_d3034_sdr35:6 wye:sewer:6" },
  },
  {
    // Irrigation and chilled water are pressure types: tape on now (they had none). 120 x 1.05 / 1000 -> 1 roll.
    id: "util-1268-irrigation-tape-on",
    kind: "type-lines",
    type: "irrigation",
    label: '2" PVC Sch 40',
    lf: 120,
    expect: { addons: "tape pressure_test", keys: "pipe:pvc_sch40:2 fit:pipe:pvc_sch40:2 warning_tape addon:pressure_test", "warning_tape:sold": 1, "addon:pressure_test:sold": 120 },
  },
  { id: "util-1268-chilled-tape-on", kind: "type-lines", type: "chilled_water", label: '6" HDPE DR 11', lf: 80, expect: { addons: "tape pressure_test" } },
  {
    // A duct bank, 4 x 4 in conduit over 100 LF of trench: pull string 400 LF sold (a conduit's own), at $0.08 now.
    id: "util-1268-duct-bank-pull-string",
    kind: "type-lines",
    type: "electric",
    label: '4" PVC Conduit Sch 40',
    lf: 100,
    run: { pipes: 4, pipe_gap_in: 3 },
    expect: { "addon:pull_string:qty": "QTY", "addon:pull_string:sold": 400, "warning_tape:sold": 1 },
  },
  // --- D-1269 (F48): encasement, casing and trenchless crossings. Each run on a level profile (ground 100.00 ft, cover
  // 4 ft, Type B clay, a 6 ft box), its trench through the real engine, the crossing's stretch blended in by its share.
  // The spacer rule: one within 2 ft of each end and one every 8 ft, read additively, 2 + ceil(LF / 8): 8 LF 2 + 1 = 3;
  // 80 LF 2 + 10 = 12 (a placement reading, ends at 2 and 78 ft and 76 ft between at 8 ft, gives 11: the founder's
  // 12 is the additive reading); 81 LF 2 + 11 = 13; 600 LF 2 + 75 = 77.
  { id: "util-1269-spacer-rule", kind: "spacers", lfs: [8, 80, 81, 600], expect: { counts: "8:3 80:12 81:13 600:77" } },
  {
    // 600 LF of 8 in C900 DR 18 with an 80 LF jack and bore. Casing: bell 9.05 x 1.20 = 10.86, + 4 = 14.86 in; 14 in x
    // 0.250 has ID 13.50 (short); 16 in x 0.375 ID 15.25: 16 in x 0.375 (16-24 in wall 0.375). On the stretch's line
    // (80 LF): the carrier 80 x 1.02 = 81.6 -> 5 joints of 20 ft = 100 LF; tracer 80 x 1.1 / 500 -> 1 roll; test and
    // disinfection 80 LF; restraint ceil(80 / 20) = 4 sets (pressure pipe, restrained by default in the casing); the
    // casing 80 LF (20 ft lengths, 80 even); spacers 2 + ceil(80 / 8) = 12; 2 end seals; the bore subcontract 80 LF. No
    // fittings allowance and no tape in the casing. Trench 600 -> 520 LF (-80), excavation and spoils x 520 / 600.
    // Its bore pit: the carrier's centre at 96 - 9.05 / 24 ft, the casing's bottom 16 / 24 ft below, the pit 1.5 ft
    // below that: depth 4 + 9.05 / 24 + 16 / 24 + 1.5 = 6.54375 ft (a trench box, to 8 ft); 12 x 32 = 384 SF: dug
    // 384 x 6.54375 = 2,512.80 CF = 93.07 BCY; pad 384 x 0.5 = 192 CF = 7.11 CCY; backfill 2,320.80 CF = 85.96 CCY;
    // pump days ceil(80 / 40) + 1 = 3.
    id: "util-1269-jack-bore-80-of-600",
    kind: "trenchless",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 600,
    section: { crossing: { kind: "jack_bore", lf: 80 } },
    pit: { type: "bore_pit" },
    expect: {
      kind: "jack_bore",
      lf: 80,
      casing: '16" x 0.375',
      casingKey: "steel_casing_375:16",
      bellIn: 10.86,
      casingIdIn: 15.25,
      casedLf: 80,
      casedCrew: "pressure",
      openLf: 520,
      casedKeys: "pipe:pvc_c900_dr18:8 tracer_wire addon:test_disinfect restraint_joint:pvc_c900:8 casing:steel_casing_375:16 casing:spacer:8 casing:end_seal:16 bore:jack_bore:16",
      "cased:pipe:pvc_c900_dr18:8": 100,
      "cased:tracer_wire": 1,
      "cased:addon:test_disinfect": 80,
      "cased:restraint_joint:pvc_c900:8": 4,
      "cased:casing:steel_casing_375:16": 80,
      "cased:casing:spacer:8": 12,
      "cased:casing:end_seal:16": 2,
      "cased:bore:jack_bore:16": 80,
      "cased:bore:jack_bore:16:kind": "subcontract",
      restraintCased: 4,
      restraintOpen: 0,
      trenchLfBefore: 600,
      trenchLf: 520,
      excavationRatio: 0.866667,
      spoilsRatio: 0.866667,
      pitDepthFt: 6.5438,
      pitShoring: "box",
      pitExcavationBCY: 93.07,
      pitPadCCY: 7.11,
      pitBackfillCCY: 85.96,
      pitLines: "pit|bore|12x32|6.54|own=1 pit:bore:Clay=93.07 pit_shoring|box|bore=1 pit_pad:bore|imported=7.11 pit_backstop|small=1 pit_pump|bore=3 pit:bore:native|native=85.96",
      pitBuys: "pit_shoring:trench_box_week stone:_57_stone pit:backstop:small rent:pump_3in_day",
      pitBySubNames: false,
    },
  },
  {
    // The same pit by the bore sub: every line kept at its quantity, $0, nothing bought, each named "(by the bore sub)".
    id: "util-1269-pits-by-sub",
    kind: "trenchless",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 600,
    section: { crossing: { kind: "jack_bore", lf: 80 } },
    pit: { type: "bore_pit", bySub: true },
    expect: {
      pitLines: "pit|bore|12x32|6.54|sub=1 pit:bore:Clay=93.07 pit_shoring|box|bore=1 pit_pad:bore|imported=7.11 pit_backstop|small=1 pit_pump|bore=3 pit:bore:native|native=85.96",
      pitBuys: "",
      pitBySubNames: true,
    },
  },
  {
    // Its receiving pit, 10 x 10, backfilled with CSS: dug 100 x 6.54375 = 654.375 CF = 24.24 BCY, pad 50 CF = 1.85
    // CCY, CSS 604.375 CF = 22.38 CCY; every yard dug hauled off loose: 654.375 x 1.2 / 27 = 29.08 LCY; no backstop.
    id: "util-1269-receiving-pit-css",
    kind: "trenchless",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 600,
    section: { crossing: { kind: "jack_bore", lf: 80 } },
    pit: { type: "receiving_pit", backfill: "css" },
    expect: {
      pitExcavationBCY: 24.24,
      pitPadCCY: 1.85,
      pitBackfillCCY: 22.38,
      pitLines: "pit|receiving|10x10|6.54|own=1 pit:receiving:Clay=24.24 pit_shoring|box|receiving=1 pit_pad:receiving|imported=1.85 pit_pump|receiving=3 pit:receiving:css|imported=22.38 pit_haul:receiving=29.08",
      pitBuys: "pit_shoring:trench_box_week stone:_57_stone rent:pump_3in_day stone:cement_stabilized_sand disposal:clean_soil",
    },
  },
  {
    // The same run cased open cut: the same casing, spacers and seals; no bore subcontract and no pits; the tape kept
    // (dug); the whole run trenched (600 LF). In this row's 6 ft box the width is the box's either way (the casing needs
    // 16 + 2 x 12 = 40 in, under 72 in), but the casing's bottom is (16 - 9.05) / 2 = 3.475 in below the carrier's: the
    // trench 0.289583 ft deeper over 80 LF of a 5.254167 ft trench (4 ft cover + 9.05 / 12 + 0.5 ft bedding):
    // excavation x 1 + (80 / 600) x (0.289583 / 5.254167) = 1.007349.
    id: "util-1269-cased-open-80-of-600",
    kind: "trenchless",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 600,
    section: { crossing: { kind: "cased_open", lf: 80 } },
    expect: {
      kind: "cased_open",
      casing: '16" x 0.375',
      casedLf: 80,
      openLf: 520,
      casedKeys: "pipe:pvc_c900_dr18:8 tracer_wire warning_tape addon:test_disinfect restraint_joint:pvc_c900:8 casing:steel_casing_375:16 casing:spacer:8 casing:end_seal:16",
      "cased:casing:spacer:8": 12,
      "cased:casing:end_seal:16": 2,
      trenchLf: 600,
      wider: true,
      excavationRatio: 1.007349,
    },
  },
  {
    // A 300 LF 6 in HDPE DR 11 water line by HDD: no trench at all; the carrier 300 x 1.02 = 306 -> 8 x 40 ft = 320 LF;
    // tracer 300 x 1.1 / 500 = 0.66 -> 1; test 300 LF; the HDD subcontract 300 LF at the 6 in rate; the entry and exit
    // pits one lump sum (to 12 in); no crew of ours, no restraint (fused), no allowance, no tape.
    id: "util-1269-hdd-300-hdpe-6",
    kind: "trenchless",
    type: "water",
    label: '6" HDPE DR 11',
    lf: 300,
    run: { catalog_key: "hdpe_ips_dr11:6", nominal_in: 6 },
    section: { crossing: { kind: "hdd" } },
    expect: {
      kind: "hdd",
      flags: "",
      casedLf: 300,
      casedCrew: "none",
      openLf: 0,
      casedKeys: "pipe:hdpe_ips_dr11:6 tracer_wire addon:test_disinfect hdd:sub:6 hdd:pits:small",
      "cased:pipe:hdpe_ips_dr11:6": 320,
      "cased:hdd:sub:6": 300,
      "cased:hdd:pits:small": 1,
      trenchLf: 0,
      excavationRatio: 0,
      spoilsCY: 0,
    },
  },
  {
    // A 200 LF 12 in C900 water main in CLSM (bedding and zone, sand by default): the bedding and zone lines go (0 CY),
    // the CLSM bought is their CY + 5 %; a sand zone is imported, so the spoils balance does not move.
    id: "util-1269-clsm-12-sand-zone",
    kind: "trenchless",
    type: "water",
    label: '12" PVC C900 DR 18',
    lf: 200,
    run: { catalog_key: "pvc_c900_dr18:12", nominal_in: 12 },
    section: { crossing: { kind: "clsm" } },
    expect: { kind: "clsm", beddingCY: 0, zoneCY: 0, clsmCheck: 1, spoilsRatio: 1, trenchLf: 200 },
  },
  {
    // The same with a native pipe zone (D-1265 7): the CLSM takes the native zone's place, so the trench's native need
    // falls by the zone x the clay's shrink 1.1 and its spoils to the balance rise by as much: delta / zone = 1.1.
    id: "util-1269-clsm-12-native-zone",
    kind: "trenchless",
    type: "water",
    label: '12" PVC C900 DR 18',
    lf: 200,
    run: { catalog_key: "pvc_c900_dr18:12", nominal_in: 12 },
    section: { crossing: { kind: "clsm" } },
    zoneNative: true,
    expect: { zoneCY: 0, spoilsDeltaOverZone: 1.1 },
  },
  {
    // A run changed to the Casing / sleeve type keeps the encasement its section had as another type: a sleeve is its
    // own jack and bore over its whole length, whatever kind and length it kept (the smoke's finding, fixed).
    id: "util-1269-sleeve-ignores-kept-kind",
    kind: "trenchless",
    type: "casing",
    label: '16" Steel Casing 0.375 wall',
    lf: 60,
    section: { crossing: { kind: "concrete", lf: 30 } },
    expect: { kind: "sleeve", lf: 60, casing: '16" x 0.375', casedKeys: "pipe:steel_casing_375:16 bore:jack_bore:16" },
  },
  {
    // A standalone sleeve (the Casing / sleeve type), 60 LF of 16 in x 0.375: its own pipe is the casing, 60 x 1.02 =
    // 61.2 -> 4 x 20 ft = 80 LF; the bore subcontract 60 LF; no spacers or seals (no carrier), no trench, no crew. Its
    // bore pit: the casing's outside bottom at 100 - 4 - 16 / 12 ft, the pit 1.5 ft below: 6.8333 ft deep; 384 x
    // 6.83333 = 2,624 CF = 97.19 BCY, backfill 2,432 CF = 90.07 CCY; pump days ceil(60 / 40) + 1 = 3.
    id: "util-1269-sleeve-60-with-pits",
    kind: "trenchless",
    type: "casing",
    label: '16" Steel Casing 0.375 wall',
    lf: 60,
    pit: { type: "bore_pit" },
    expect: {
      kind: "sleeve",
      casing: '16" x 0.375',
      casedLf: 60,
      casedCrew: "none",
      openLf: 0,
      casedKeys: "pipe:steel_casing_375:16 bore:jack_bore:16",
      "cased:pipe:steel_casing_375:16": 80,
      "cased:bore:jack_bore:16": 60,
      trenchLf: 0,
      pitDepthFt: 6.8333,
      pitShoring: "box",
      pitExcavationBCY: 97.19,
      pitBackfillCCY: 90.07,
      pitLines: "pit|bore|12x32|6.83|own=1 pit:bore:Clay=97.19 pit_shoring|box|bore=1 pit_pad:bore|imported=7.11 pit_backstop|small=1 pit_pump|bore=3 pit:bore:native|native=90.07",
    },
  },
];

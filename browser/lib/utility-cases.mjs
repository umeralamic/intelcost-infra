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
  // D-1311 (Q15): a bored or drilled stretch digs no trench, so it never enters the overlap step. A (8 ft deep, 6 ft box,
  // along x) is crossed square at its station 0+50 by B (6 ft box, along y from -50 to 50), deeper (12 ft) unless said.
  // 1. B bored over its whole run takes nothing from A: A keeps 6 · 8 · 100 / 27 = 177.78 CY; B digs none. Before, B,
  //    deeper, kept the shared 6 · 6 · 8 = 288 CF (10.67 CY) and A lost it: 167.11 (D-1303's smoke: ST-2 46.32 BCY off
  //    SS-1).
  // 2. B bored 0+00 to 0+40 (y -50 to -10): its open stretch still crosses A and keeps the 10.67 CY (bedding 6 · 6 · 0.5
  //    = 18, zone 6 · 6 · 1.7 less A's pipe 0.3848 · 6 = 58.89, backfill 208.8). B's trench, 6 · 12 · 100 = 7200 CF, at
  //    its open share 0.6: 160.00 CY.
  // 3. B bored 0+30 to 0+70, over A's trench (B's stations 0+47 to 0+53): nothing taken.
  // 4. B bored 0+00 to 0+48: its open part from 0+48 (y -2) shares 5 · 6 · 8 = 240 CF = 8.89 CY (bedding 15, zone 51 less
  //    2.309 = 48.69, backfill 174); A 168.89; B 7200 · 0.52 = 138.67.
  // 5. B 6 ft deep, shallower, bored 0+00 to 0+40: its open stretch loses 6 · 6 · 6 = 216 CF = 8.00 CY to A (bedding 18,
  //    zone 61.2 less its pipe 2.309 = 58.89, backfill 136.8). Its loss is taken whole after the open share: 3600 · 0.6 −
  //    216 = 1944 CF = 72.00 CY. Before: taken first, then scaled, (3600 − 216) · 0.6 = 2030.4 = 75.20.
  {
    id: "d1311-bored-takes-nothing",
    kind: "overlap",
    runs: [
      { name: "A", path: [[0, 0], [100, 0]], depth: 8, protection: "box" },
      { name: "B", path: [[50, -50], [50, 50]], depth: 12, protection: "box", crossing: { kind: "jack_bore" } },
    ],
    expect: { overlaps: [], afterCY: [177.78, 0] },
  },
  {
    id: "d1311-bored-takes-nothing-before",
    kind: "overlap",
    before: true,
    runs: [
      { name: "A", path: [[0, 0], [100, 0]], depth: 8, protection: "box" },
      { name: "B", path: [[50, -50], [50, 50]], depth: 12, protection: "box", crossing: { kind: "jack_bore" } },
    ],
    expect: { overlaps: [["A", "B", 10.67, 18, 58.89, 208.8]], afterCY: [167.11, 0] },
  },
  {
    id: "d1311-part-bored-open-stretch-overlaps",
    kind: "overlap",
    runs: [
      { name: "A", path: [[0, 0], [100, 0]], depth: 8, protection: "box" },
      { name: "B", path: [[50, -50], [50, 50]], depth: 12, protection: "box", crossing: { kind: "jack_bore", lf: 40, from_ft: 0 } },
    ],
    expect: { overlaps: [["A", "B", 10.67, 18, 58.89, 208.8]], afterCY: [167.11, 160] },
  },
  {
    id: "d1311-part-bored-over-the-crossing",
    kind: "overlap",
    runs: [
      { name: "A", path: [[0, 0], [100, 0]], depth: 8, protection: "box" },
      { name: "B", path: [[50, -50], [50, 50]], depth: 12, protection: "box", crossing: { kind: "jack_bore", lf: 40, from_ft: 30 } },
    ],
    expect: { overlaps: [], afterCY: [177.78, 160] },
  },
  {
    id: "d1311-part-bored-cut-in-the-crossing",
    kind: "overlap",
    runs: [
      { name: "A", path: [[0, 0], [100, 0]], depth: 8, protection: "box" },
      { name: "B", path: [[50, -50], [50, 50]], depth: 12, protection: "box", crossing: { kind: "hdd", lf: 48, from_ft: 0 } },
    ],
    expect: { overlaps: [["A", "B", 8.89, 15, 48.69, 174]], afterCY: [168.89, 138.67] },
  },
  {
    id: "d1311-part-bored-loses-on-open-stretch",
    kind: "overlap",
    runs: [
      { name: "A", path: [[0, 0], [100, 0]], depth: 8, protection: "box" },
      { name: "B", path: [[50, -50], [50, 50]], depth: 6, protection: "box", crossing: { kind: "jack_bore", lf: 40, from_ft: 0 } },
    ],
    expect: { overlaps: [["B", "A", 8, 18, 58.89, 136.8]], afterCY: [177.78, 72] },
  },
  {
    id: "d1311-part-bored-loses-on-open-stretch-before",
    kind: "overlap",
    before: true,
    runs: [
      { name: "A", path: [[0, 0], [100, 0]], depth: 8, protection: "box" },
      { name: "B", path: [[50, -50], [50, 50]], depth: 6, protection: "box", crossing: { kind: "jack_bore", lf: 40, from_ft: 0 } },
    ],
    expect: { overlaps: [["B", "A", 8, 18, 58.89, 136.8]], afterCY: [177.78, 75.2] },
  },
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
  // D-1331: its governing station: the bottom 8 ft down, the water 7 ft down, 1.0 ft above the bottom, in the clay (CH).
  { id: "util-2e2-dewatering-full", ...caseA({ water: [7, 7] }), expect: { dewateringLF: 100, dewaterBottomFt: 8, dewaterWaterFt: 7, dewaterHeightFt: 1, dewaterUscs: "CH" } },
  // D-1331: a clay layer with no USCS typed reads its group's CL (GROUP_USCS), so its method can be chosen.
  { id: "util-2e4-group-uscs", ...caseA({ water: [7, 7], layers: [{ ...CLAY_B, uscs: null, depth: null }] }), expect: { dewateringLF: 100, dewaterHeightFt: 1, dewaterUscs: "CL" } },
  // D-1331: no water above the bottom: no governing station.
  { id: "util-2e3-no-dewater-site", ...caseA({ water: [9, 9] }), expect: { dewateringLF: 0, dewaterHeightFt: null } },
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
      "fit:pipe:pvc_c900_dr18:8:name": "Fittings allowance, 12 %",
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
      // D-1276 (D-1272 9): a PE CTS service's curb stop too (60 LF, one coil: no coupling); D-1279 (Q8) its 2 stiffeners.
      keys: "pipe:pe_cts_sdr9:1 fit:pipe:pe_cts_sdr9:1 tracer_wire warning_tape addon:test_disinfect tap:water:1 curb_stop:cts:1 stiffener:cts:1",
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
      // D-1276 (D-1272 6): a duct bank's spacer sets every 5 ft (util-1276-duct-bank-100-spacers).
      keys: "pipe:conduit_sch40:4 fit:pipe:conduit_sch40:4 warning_tape duct_spacer:4 concrete:encasement addon:pull_string",
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
      // D-1267 correction: restraint sets are never counted fittings: the allowance stays at the pressure base (12 %, D-1296; was 20 %).
      "fit:pipe:pvc_c900_dr18:8:pct": 12,
      "fit:pipe:pvc_c900_dr18:8:name": "Fittings allowance, 12 %",
    },
  },
  {
    // A water main of 200 LF restrained at 35 % (through the lines): 4 sets (ceil(70 / 20)), the allowance kept at 12 % (D-1296; was 20 %).
    id: "util-1267-restrained-35-allowance-kept",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    section: { restrained_pct: 35 },
    expect: { "restraint_joint:pvc_c900:8:qty": "4", "fit:pipe:pvc_c900_dr18:8:pct": 12, "fit:pipe:pvc_c900_dr18:8:name": "Fittings allowance, 12 %" },
  },
  {
    // A water service's tap at the main is a connection, never a counted fitting: 1 in PE CTS, 60 LF. D-1276 (D-1272 9):
    // a PE CTS service buys its couplings, corporation stop and curb stop only, so its allowance is 0 % (was 20 %).
    id: "util-1267-tap-not-counted",
    kind: "type-lines",
    type: "water_service",
    label: '1" PE CTS SDR 9',
    lf: 60,
    expect: { "tap:water:1:qty": "1", "fit:pipe:pe_cts_sdr9:1:pct": 0, "fit:pipe:pe_cts_sdr9:1:name": "Fittings allowance, 0 % (PE CTS service: couplings, corporation stop and curb stop counted)" },
  },
  {
    // A plain water main keeps its 12 %; a sanitary main its 2 % (nothing counted; D-1296, were 20 % and 5 %).
    id: "util-1267-water-main-allowance-kept",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    expect: { "fit:pipe:pvc_c900_dr18:8:pct": 12, "fit:pipe:pvc_c900_dr18:8:name": "Fittings allowance, 12 %" },
  },
  {
    id: "util-1267-sanitary-allowance-kept",
    kind: "type-lines",
    type: "sanitary",
    label: '8" PVC SDR-35',
    lf: 100,
    // D-1296 (Q5): sanitary 2 % (was 5 %).
    expect: { "fit:pipe:pvc_d3034_sdr35:8:pct": 2, "fit:pipe:pvc_d3034_sdr35:8:name": "Fittings allowance, 2 %", workScope: "site_utilities.sanitary" },
  },
  {
    // A C909 main with a 45: the C900 (DI MJ) bend key; D-1276 (D-1272 8): its MJ restraint on C900's key too (the same
    // CIOD; C909's own 0.573-ratio keys removed; was "restraint:pvco_c909:8").
    id: "util-1267-c909-bend-restraint",
    kind: "type-lines",
    type: "water",
    label: '8" PVCO C909 Class 235',
    lf: 120,
    run: { catalog_key: "pvco_c909_235:8", nominal_in: 8 },
    bends: [{ angle: 45, count: 1 }],
    expect: { "bend:pvc_c900:45:8:qty": "1", "restraint:pvc_c900:8:qty": "1" },
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
      // D-1296 (Q5): storm RCP 0 % (its joints are the gaskets, its junctions structures; was 5 %).
      "fit:pipe:rcp_c76_wall_b:18:pct": 0,
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
  // The spacer rule, D-1276 (D-1272 10) by placement: one within 2 ft of each end and one every 8 ft between, so no gap
  // over 8 ft: 1 + ceil((LF - 4) / 8). 8 LF: ends at 2 and 6 ft, 1 + 1 = 2; 80 LF: ends at 2 and 78 ft, 76 ft between in
  // 8 ft steps, 1 + ceil(9.5) = 11 (was 12, D-1269's additive 2 + ceil(LF / 8)); 81 LF 1 + ceil(9.625) = 11 (was 13);
  // 600 LF 1 + ceil(74.5) = 76 (was 77); 3 LF one spacer.
  { id: "util-1269-spacer-rule", kind: "spacers", lfs: [3, 8, 80, 81, 600], expect: { counts: "3:1 8:2 80:11 81:11 600:76" } },
  {
    // 600 LF of 8 in C900 DR 18 with an 80 LF jack and bore. Casing: bell 9.05 x 1.20 = 10.86, + 4 = 14.86 in; 14 in x
    // 0.250 has ID 13.50 (short); 16 in x 0.375 ID 15.25: 16 in x 0.375 (16-24 in wall 0.375). On the stretch's line
    // (80 LF): the carrier 80 x 1.02 = 81.6 -> 5 joints of 20 ft = 100 LF; tracer 80 x 1.1 / 500 -> 1 roll; test and
    // disinfection 80 LF; restraint ceil(80 / 20) = 4 sets (pressure pipe, restrained by default in the casing); the
    // casing 80 LF (20 ft lengths, 80 even); spacers 1 + ceil((80 - 4) / 8) = 11 (D-1276; was 12); 2 end seals; the bore subcontract 80 LF. No
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
      "cased:casing:spacer:8": 11,
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
    // D-1319 (Q6), D-1144's pattern, one a crossing (the founder's correction): the same run at 22 ft cover, its bore pit 22 + 9.05 / 24 + 16 / 24 + 1.5 =
    // 24.54375 ft deep (sheet piling past 20 ft: 2 x (32 + 12) x 24.54375 = 2,159.85 SF): dug 384 x 24.54375 = 9,424.80 CF
    // = 349.07 BCY; backfill 9,232.80 CF = 341.96 CCY. Past 20 ft its crossing's one PE-designed protective system line, the service
    // `service:pe_shoring_design` (the stated $5,000, flagged in Needs attention).
    id: "d1319-bore-pit-pe-design",
    kind: "trenchless",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 600,
    coverFt: 22,
    section: { crossing: { kind: "jack_bore", lf: 80 } },
    pit: { type: "bore_pit" },
    expect: {
      pitShoring: "sheet_pile",
      pitLines: "pit|bore|12x32|24.54|own=1 pit:bore:Clay=349.07 pit_shoring|sheet_pile|bore=2159.85 pe_design|crossing=1 pit_pad:bore|imported=7.11 pit_backstop|small=1 pit_pump|bore=3 pit:bore:native|native=341.96",
      pitBuys: "pit_shoring:sheet_pile service:pe_shoring_design stone:_57_stone pit:backstop:small rent:pump_3in_day",
    },
  },
  {
    // The same deep pit by the bore sub: its design is the sub's too, no PE line.
    id: "d1319-bore-pit-pe-by-sub",
    kind: "trenchless",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 600,
    coverFt: 22,
    section: { crossing: { kind: "jack_bore", lf: 80 } },
    pit: { type: "bore_pit", bySub: true },
    expect: {
      pitLines: "pit|bore|12x32|24.54|sub=1 pit:bore:Clay=349.07 pit_shoring|sheet_pile|bore=2159.85 pit_pad:bore|imported=7.11 pit_backstop|small=1 pit_pump|bore=3 pit:bore:native|native=341.96",
      pitBuys: "",
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
      "cased:casing:spacer:8": 11,
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
  // D-1275 (docs/tasks/large_rcp_tasks.md §2, §3, §6): the depth rule and the cover over the crown. A 100 ft run at a
  // flat G = 100, Type B clay, 6 in bedding unless the row says, 12 in a side and 24 in at least (pressure 6 and 18).
  // `cover` lays it at a cover (the invert (OD + ID)/2 under G − cover); `invertDepth` types the invert; `trench` types
  // the trench (invert = G − trench + wall + bedding, as the bid-tab harness lays one). trench and width ft to 1e-4.
  // Large RCP at storm's 2 ft minimum: 2 + OD + 0.5. 48 in Wall B OD 58: 7.3333, width (58 + 24)/12 = 6.8333.
  { id: "util-1275-rcp48-cover2", kind: "depth-rule", type: "storm", pipe: "rcp_c76_wall_b:48", cover: 2, expect: { trenchFt: 7.3333, widthFt: 6.8333, coverFt: 2, flags: [] } },
  // 60 in OD 72: 2 + 6 + 0.5 = 8.5; width 96/12 = 8.
  { id: "util-1275-rcp60-cover2", kind: "depth-rule", type: "storm", pipe: "rcp_c76_wall_b:60", cover: 2, expect: { trenchFt: 8.5, widthFt: 8, coverFt: 2, flags: [] } },
  // 72 in OD 86: 2 + 7.1667 + 0.5 = 9.6667; width 110/12 = 9.1667.
  { id: "util-1275-rcp72-cover2", kind: "depth-rule", type: "storm", pipe: "rcp_c76_wall_b:72", cover: 2, expect: { trenchFt: 9.6667, widthFt: 9.1667, coverFt: 2, flags: [] } },
  // Gravity: (G − invert) + bottom wall + bedding. 48 in Wall B, invert 8 ft down: 8 + 5/12 + 0.5 = 8.9167; cover
  // 8 − (58 + 48)/24 = 3.5833.
  { id: "util-1275-gravity-wall-b", kind: "depth-rule", type: "storm", pipe: "rcp_c76_wall_b:48", invertDepth: 8, expect: { trenchFt: 8.9167, coverFt: 3.5833, flags: [] } },
  // Wall C (5.75 in, OD 59.5): 8 + 5.75/12 + 0.5 = 8.9792; width (59.5 + 24)/12 = 6.9583.
  { id: "util-1275-gravity-wall-c", kind: "depth-rule", type: "storm", pipe: "rcp_c76_wall_c:48", invertDepth: 8, expect: { trenchFt: 8.9792, widthFt: 6.9583, flags: [] } },
  // No bedding: 8 + 5/12 + 0 = 8.4167.
  { id: "util-1275-gravity-no-bedding", kind: "depth-rule", type: "storm", pipe: "rcp_c76_wall_b:48", invertDepth: 8, beddingIn: 0, expect: { trenchFt: 8.4167, flags: [] } },
  // Pressure: cover + OD + bedding. 8 in C900 DR 18 (OD 9.05) at 4 ft, bedding 0: 4 + 9.05/12 = 4.7542; width the
  // 24 in bucket over 9.05 + 12 = 21.05 in: 2.0; cover 4 = the company's 4 ft, no flag.
  { id: "util-1275-pressure-no-bedding", kind: "depth-rule", type: "water", pipe: "pvc_c900_dr18:8", cover: 4, beddingIn: 0, pressure: true, expect: { trenchFt: 4.7542, widthFt: 2, coverFt: 4, flags: [] } },
  // The same with 6 in bedding: 4 + 0.7542 + 0.5 = 5.2542.
  { id: "util-1275-pressure-bedding", kind: "depth-rule", type: "water", pipe: "pvc_c900_dr18:8", cover: 4, pressure: true, expect: { trenchFt: 5.2542, flags: [] } },
  // The cover warning. 48 in RCP in a 6.5 ft trench: 6.5 − 0.5 − 4.8333 = 1.1667 under storm's 2 ft.
  {
    id: "util-1275-cover-under-min",
    kind: "depth-rule",
    type: "storm",
    pipe: "rcp_c76_wall_b:48",
    trench: 6.5,
    expect: { trenchFt: 6.5, coverFt: 1.1667, flags: ["Cover over the crown 1.17 ft at its shallowest, under the 2 ft minimum for Storm sewer main (Houston-area drainage criteria: 24 in, C)."] },
  },
  // 72 in RCP in a 6.5 ft trench (the bug): 6.5 − 0.5 − 7.1667 = −1.1667, the crown above the ground.
  {
    id: "util-1275-crown-above-ground",
    kind: "depth-rule",
    type: "storm",
    pipe: "rcp_c76_wall_b:72",
    trench: 6.5,
    expect: { coverFt: -1.1667, flags: ["Cover over the crown -1.17 ft at its shallowest: the pipe's crown is above the ground. Check the inverts or the grade."] },
  },
  // Water at 3 ft against the company's 4 ft (D-1106).
  { id: "util-1275-water-under-company", kind: "depth-rule", type: "water", pipe: "pvc_c900_dr18:8", cover: 3, pressure: true, expect: { coverFt: 3, flags: ["Cover over the crown 3.00 ft at its shallowest, under the 4 ft minimum for Water main (the company's pressure cover (D-1106))."] } },
  // The company's cover at 3 ft: the same run is not flagged.
  { id: "util-1275-water-company-3", kind: "depth-rule", type: "water", pipe: "pvc_c900_dr18:8", cover: 3, pressure: true, company: 3, expect: { coverFt: 3, flags: [] } },
  // Gas main at 2 ft: 49 CFR 192.327(b)'s 24 in, not flagged; at 1.5 ft flagged.
  { id: "util-1275-gas-2ft", kind: "depth-rule", type: "gas", pipe: "pe_gas_sdr11:4", cover: 2, pressure: true, expect: { coverFt: 2, flags: [] } },
  // The storm and sanitary minimums are library settings (D-1275, the founder's answers): 2 and 3 ft unless set.
  // 24 in RCP Wall B (OD 30, ID 24) at 1.5 ft cover: under storm's 2 ft by default; not flagged with the setting at 1 ft.
  { id: "util-1275-storm-default-2ft", kind: "depth-rule", type: "storm", pipe: "rcp_c76_wall_b:24", cover: 1.5, expect: { coverFt: 1.5, flags: ["Cover over the crown 1.50 ft at its shallowest, under the 2 ft minimum for Storm sewer main (Houston-area drainage criteria: 24 in, C)."] } },
  { id: "util-1275-storm-setting-1ft", kind: "depth-rule", type: "storm", pipe: "rcp_c76_wall_b:24", cover: 1.5, mins: { storm: 1, sanitary: 3 }, expect: { coverFt: 1.5, flags: [] } },
  // 8 in SDR 35 at 2.5 ft: under sanitary's 3 ft by default; the setting at 4 ft flags it against 4 ft, its source named.
  { id: "util-1275-sanitary-default-3ft", kind: "depth-rule", type: "sanitary", pipe: "pvc_d3034_sdr35:8", cover: 2.5, expect: { coverFt: 2.5, flags: ["Cover over the crown 2.50 ft at its shallowest, under the 3 ft minimum for Sanitary sewer main (common practice, C)."] } },
  { id: "util-1275-sanitary-setting-4ft", kind: "depth-rule", type: "sanitary", pipe: "pvc_d3034_sdr35:8", cover: 2.5, mins: { sanitary: 4 }, expect: { coverFt: 2.5, flags: ["Cover over the crown 2.50 ft at its shallowest, under the 4 ft minimum for Sanitary sewer main (Library settings)."] } },
  { id: "util-1275-gas-18in", kind: "depth-rule", type: "gas", pipe: "pe_gas_sdr11:4", cover: 1.5, pressure: true, expect: { coverFt: 1.5, flags: ["Cover over the crown 1.50 ft at its shallowest, under the 2 ft minimum for Gas main (49 CFR 192.327(b): 24 in, A)."] } },
  // --- D-1276 (Part 4a, night run 2026-11-15): the founder's pricing and engine answers (D-1272 4-10, D-1277 2, 3, 5).
  // A new crossing's defaults: a jack and bore's casing sub-furnished, its pits (and a pit placed alone) by the bore sub;
  // a run stored before keeps what it has (no casing_by: owner-furnished; a stored choice kept); a new sleeve's casing
  // sub-furnished.
  {
    id: "util-1276-crossing-defaults",
    kind: "crossing-defaults",
    // D-1279 (Q11): a pit placed alone now starts self-performed (pitBySub false); one made with a jack and bore by the sub.
    expect: { pitBySub: false, newJackBore: "sub", keptOwner: "owner", storedBefore: "owner", sleeveCasingBy: "sub", pitsText: "Pits by the bore sub: the bore price includes them", bellGrade: "grade D, maker table later" },
  },
  {
    // A new 60 LF sleeve, 16 in x 0.375, its casing sub-furnished: its own pipe line the bore sub's (a subcontract at the
    // same key), 60 x 1.02 = 61.2 -> 80 LF in 20 ft lengths, as before; the bore 60 LF.
    id: "util-1276-sleeve-casing-sub",
    kind: "trenchless",
    type: "casing",
    label: '16" Steel Casing 0.375 wall',
    lf: 60,
    expect: { kind: "sleeve", casedKeys: "pipe:steel_casing_375:16 bore:jack_bore:16", "cased:pipe:steel_casing_375:16": 80, "cased:pipe:steel_casing_375:16:kind": "subcontract", "cased:bore:jack_bore:16": 60 },
  },
  {
    // A.8: a C909 main restrained at the bends: C900's MJ key (no pvco_c909 key left in the list).
    id: "util-1276-c909-on-c900-keys",
    kind: "type-lines",
    type: "water",
    label: '12" PVCO C909 Class 235',
    lf: 200,
    run: { catalog_key: "pvco_c909_235:12", nominal_in: 12 },
    bends: [{ angle: 90, count: 2 }],
    tees: 1,
    expect: { "bend:pvc_c900:90:12:qty": "2", "tee:pvc_c900:12x12:qty": "1", "restraint:pvc_c900:12:qty": "3", keys: "pipe:pvco_c909_235:12 fit:pipe:pvco_c909_235:12 tracer_wire warning_tape addon:test_disinfect bend:pvc_c900:90:12 tee:pvc_c900:12x12 restraint:pvc_c900:12" },
  },
  {
    // A.9: a 60 LF 1 in PE CTS water service with a 90 on its path: no MJ bend or restraint; its tap at the main (the
    // saddle and corporation stop), a curb stop, no coupling (60 LF on one 100 ft coil: ceil(0.6) - 1 = 0); allowance 0 %.
    id: "util-1276-pe-cts-service-60",
    kind: "type-lines",
    type: "water_service",
    label: '1" PE CTS SDR 9',
    lf: 60,
    bends: [{ angle: 90, count: 1 }],
    expect: { keys: "pipe:pe_cts_sdr9:1 fit:pipe:pe_cts_sdr9:1 tracer_wire warning_tape addon:test_disinfect tap:water:1 curb_stop:cts:1 stiffener:cts:1", "curb_stop:cts:1:qty": "1", "stiffener:cts:1:qty": "2", "fit:pipe:pe_cts_sdr9:1:pct": 0 },
  },
  {
    // A 150 LF one: two coils, one compression coupling (ceil(1.5) - 1 = 1).
    id: "util-1276-pe-cts-service-150",
    kind: "type-lines",
    type: "water_service",
    label: '1" PE CTS SDR 9',
    lf: 150,
    expect: { keys: "pipe:pe_cts_sdr9:1 fit:pipe:pe_cts_sdr9:1 tracer_wire warning_tape addon:test_disinfect tap:water:1 curb_stop:cts:1 coupling:cts_compression:1 stiffener:cts:1", "coupling:cts_compression:1:qty": "1", "curb_stop:cts:1:qty": "1", "stiffener:cts:1:qty": "2" },
  },
  {
    // A.6: the duct bank's spacer sets every 5 ft of trench, one at each end, a spacer a conduit: 100 LF of trench x 4
    // conduits (400 LF on the line) 4 x (ceil(400 / 4 / 5) + 1) = 4 x 21 = 84 spacers.
    id: "util-1276-duct-bank-100-spacers",
    kind: "type-lines",
    type: "electric",
    label: '4" PVC Conduit Sch 40',
    lf: 100,
    run: { pipes: 4, pipe_gap_in: 3 },
    expect: { lf: 400, "duct_spacer:4:qty": "4 * (ceil(QTY / 4 / 5) + 1)", "duct_spacer:4:sold": 84 },
  },
  {
    // 400 LF of trench (1,600 on the line): 4 x (80 + 1) = 324 spacers.
    id: "util-1276-duct-bank-400-spacers",
    kind: "type-lines",
    type: "electric",
    label: '4" PVC Conduit Sch 40',
    lf: 400,
    run: { pipes: 4, pipe_gap_in: 3 },
    expect: { lf: 1600, "duct_spacer:4:sold": 324 },
  },
  {
    // A.10: tracer and tape rounded once over the project. Two water mains, 200 and 250 LF: tracer 200 x 1.1 / 500 = 0.44
    // and 0.55 rolls, 0.99 -> 1 roll for the project (2 before, one a line), the 0.01 added spread by share: 0.4444 and
    // 0.5556; tape 200 x 1.05 / 1000 = 0.21 and 0.2625, 0.4725 -> 1 roll (2 before): 0.4444 and 0.5556.
    id: "util-1276-project-rolls",
    kind: "project-rolls",
    lines: [
      { qty: 200, materials: [{ key: "tracer_wire", qty: "QTY * 1.1 / 500" }, { key: "warning_tape", qty: "QTY * 1.05 / 1000" }] },
      { qty: 250, materials: [{ key: "tracer_wire", qty: "QTY * 1.1 / 500" }, { key: "warning_tape", qty: "QTY * 1.05 / 1000" }] },
    ],
    expect: { tracer_wire: "0.4444 + 0.5556 = 1", warning_tape: "0.4444 + 0.5556 = 1", "tracer_wire:note": "0.44 of 1 ROLL for the project (whole rolls, rounded once)" },
  },
  {
    // D-1279 (the late pass): geotextile in whole rolls once per project, shared across lines (tracer and tape's rule).
    // Two dewatered stretches' trench-bottom geotextile, 20 and 10 SY (500 SY a roll): 0.04 and 0.02 roll, priced as is
    // before (no whole roll), now 1 roll for the project, the 0.94 added spread by share: 0.6667 and 0.3333. Two site
    // geotextile layers, 300 and 450 SY: 0.6 + 0.9 = 1.5 -> 2 rolls (one a line before), 0.8 and 1.2. A geogrid layer keeps
    // its rolls a line: 300 SY, 0.6 -> 1.
    id: "util-1279-geotextile-project-rolls",
    kind: "geotextile-rolls",
    lines: [{ sy: 20, qty: 100 }, { sy: 10, qty: 100 }, { site: "geotextile", qty: 300 }, { site: "geotextile", qty: 450 }, { site: "geogrid", qty: 300 }],
    expect: {
      "geotextile:trench": "0.6667 + 0.3333 = 1",
      "geotextile:trench:scope": "project",
      "geotextile:site": "0.8 + 1.2 = 2",
      "geotextile:site:scope": "project",
      // D-1285 Q11: geogrid in whole rolls per project too: one line of 300 SY is 0.6 of a 500 SY roll, 1 for the project.
      "geogrid:site": "1 = 1",
      "geogrid:site:scope": "project",
    },
  },
  // D-1285 Q11 (the founder's answer 5): geogrid rounds once over the project, as geotextile (D-1279) and tracer and tape
  // (D-1276). Three site geogrid lines of 300, 450 and 150 SY in 500 SY rolls: 0.6 + 0.9 + 0.3 = 1.8 -> 2 whole rolls, each
  // line its share x 2 / 1.8: 0.6667 + 1 + 0.3333 = 2 (per line before: 1 + 1 + 1 = 3 rolls).
  {
    id: "util-1285-geogrid-project-rolls",
    kind: "geotextile-rolls",
    lines: [{ site: "geogrid", qty: 300 }, { site: "geogrid", qty: 450 }, { site: "geogrid", qty: 150 }],
    expect: { "geogrid:site": "0.6667 + 1 + 0.3333 = 2", "geogrid:site:scope": "project" },
  },
  // --- D-1279 (the founder's answers to the 2026-11-15 report's §10). Q4: the bore line says the pits are in its price.
  // Q11: a pit placed alone self-performed; one made with a jack and bore, or linked to a bored run (jack and bore,
  // sleeve, HDD) while placed, by the bore sub. Q8: two insert stiffeners a PE CTS service. Q10: a share of a project roll
  // with two decimals when fractional (0.3245 -> 0.32), whole when whole (2; 1.9999 -> 2), 12.5 -> 12.50.
  // Q7: a 14 in C909 main restrained at two 90s takes C900's 14 in restraint key, added by migration d1279a3c5e71 (the
  // fit of the C900 4, 20 and 24 in keys, grade F); 18 in the same.
  {
    id: "util-1279-c909-14-on-c900-key",
    kind: "type-lines",
    type: "water",
    label: '14" PVCO C909 Class 235',
    lf: 200,
    run: { catalog_key: "pvco_c909_235:14", nominal_in: 14 },
    bends: [{ angle: 90, count: 2 }],
    expect: { "restraint:pvc_c900:14:qty": "2" },
  },
  {
    id: "util-1279-c909-18-on-c900-key",
    kind: "type-lines",
    type: "water",
    label: '18" PVCO C909 Class 235',
    lf: 200,
    run: { catalog_key: "pvco_c909_235:18", nominal_in: 18 },
    bends: [{ angle: 90, count: 2 }],
    expect: { "restraint:pvc_c900:18:qty": "2" },
  },
  {
    id: "util-1279-answers",
    kind: "answers-1279",
    expect: {
      boreName: 'Jack and bore, 16" casing (subcontract: machine, jacking, casing install, pits included)',
      pitStandalone: false,
      pitMadeWithBore: true,
      bored: "jack_bore:true hdd:true cased_open:false concrete:false none:false casing:true legacy:true",
      stiffeners: 2,
      shares: "0.32 2 2 12.50",
    },
  },
  // --- D-1280: pipe section layers, night 1 (D-1278 plan §5) ---------------------------------------------------------
  // The layered engine (layers.ts, sectionPresets.ts, section.ts:layerAreas, runQuantities' `layered`) on the plan's 26
  // hand-worked rows, a "section-layers" kind: 100 LF at a constant depth (G = 100), vertical walls typed, bucket Auto,
  // Type B clay, unpaved unless stated. Volumes net of the barrel and the bell. `layersCYLF` is each layer's CY/LF to
  // 4 places and `layersCY` its 100 LF CY to 0.01, bottom up (the paved cap last, as "surface"); `widthIn` the bottom
  // width; `hFt` the trench depth; `gapCY` the excavation less every layer, the surface, the pipe and the bell (0).
  // The plan's pipes: DI 8 PC 350 (OD 9.05, ID 8.55, bell 1.25 × OD, 0.5 ft a 18 ft joint), C900 8 DR 18 (9.05, 8.044,
  // 1.20 ×, 0.5 / 20), SDR 35 8 (8.40, **7.92 as the plan's table**: the catalog's ID is 7.891, which moves the trench
  // 0.0012 ft and two figures a cent, so the three SDR 35 rows type the plan's ID), RCP 36 Wall B (44, 36, Rinker's bell
  // 50.25, 1.0 / 8), conduit 4 Sch 40 and PE 4 DR 11 (no bell: solvent-weld, fused).
  {
    // Section layers absent: today's code path, every field of util-2a (case (a)); and the layered engine on the legacy
    // stack gives the same excavation, bedding, zone and backfill to 1e-9.
    id: "sect-legacy",
    kind: "section-layers",
    type: "sanitary",
    pipe: SDR35_8,
    depth: 8,
    protection: "auto",
    preset: null,
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
      legacyEqual: true,
    },
  },
  // The legacy equality again where it is hardest: sloped 1:1, 6 to 10 ft deep, paved (the cap, D-1084).
  { id: "sect-legacy-sloped-paved", kind: "section-layers", type: "sanitary", pipe: SDR35_8, depth: [6, 10], protection: "sloped", paved: true, preset: null, expect: { legacyEqual: true } },
  // AWWA C600, DI 8 PC 350 at 4.0 ft cover: the rule 9.05 + 12 = 21.05 in, the 24 in bucket.
  { id: "sect-c600-t1", kind: "section-layers", type: "water", pipe: "di_c151_pc350:8", cover: 4, preset: "c600_t1", expect: { widthIn: 24, hFt: 4.7542, layersCYLF: [["final", 0.3354]], layersCY: [["final", 33.54]], excavationCY: 35.22, bellBelowSF: 0.001, gapCY: 0 } },
  { id: "sect-c600-t2", kind: "section-layers", type: "water", pipe: "di_c151_pc350:8", cover: 4, preset: "c600_t2", expect: { widthIn: 24, hFt: 4.7542, layersCYLF: [["haunch", 0.0196], ["final", 0.3158]], layersCY: [["haunch", 1.96], ["final", 31.58]], excavationCY: 35.22, gapCY: 0 } },
  { id: "sect-c600-t3", kind: "section-layers", type: "water", pipe: "di_c151_pc350:8", cover: 4, preset: "c600_t3", expect: { widthIn: 24, hFt: 5.0875, layersCYLF: [["bedding", 0.0247], ["embedment", 0.0391], ["final", 0.2963]], layersCY: [["bedding", 2.47], ["embedment", 3.91], ["final", 29.63]], excavationCY: 37.69, gapCY: 0, materials: [["bedding", "Native", "native"], ["embedment", "Native", "native"], ["final", "Native", "native"]] } },
  { id: "sect-c600-t4", kind: "section-layers", type: "water", pipe: "di_c151_pc350:8", cover: 4, preset: "c600_t4", expect: { widthIn: 24, hFt: 5.0875, layersCYLF: [["bedding", 0.0247], ["embedment", 0.0391], ["final", 0.2963]], layersCY: [["bedding", 2.47], ["embedment", 3.91], ["final", 29.63]], excavationCY: 37.69, gapCY: 0, materials: [["bedding", "Sand", "imported"], ["embedment", "Sand", "imported"], ["final", "Native", "native"]], compaction: [["bedding", "≈ 80 % Standard Proctor"], ["embedment", "≈ 80 % Standard Proctor"], ["final", "Per the project's spec"]] } },
  { id: "sect-c600-t5", kind: "section-layers", type: "water", pipe: "di_c151_pc350:8", cover: 4, preset: "c600_t5", expect: { widthIn: 24, hFt: 5.0875, layersCYLF: [["bedding", 0.0247], ["haunch", 0.0196], ["embedment", 0.0196], ["final", 0.2963]], layersCY: [["bedding", 2.47], ["haunch", 1.96], ["embedment", 1.96], ["final", 29.63]], excavationCY: 37.69, gapCY: 0 } },
  // AWWA C605, C900 8 DR 18 at 4.0 ft cover.
  { id: "sect-c605-t1", kind: "section-layers", type: "water", pipe: "pvc_c900_dr18:8", cover: 4, preset: "c605_t1", expect: { widthIn: 24, hFt: 4.7542, layersCYLF: [["final", 0.3355]], layersCY: [["final", 33.55]], excavationCY: 35.22, gapCY: 0 } },
  { id: "sect-c605-t2", kind: "section-layers", type: "water", pipe: "pvc_c900_dr18:8", cover: 4, preset: "c605_t2", expect: { widthIn: 24, hFt: 4.7542, layersCYLF: [["haunch", 0.0196], ["final", 0.3159]], layersCY: [["haunch", 1.96], ["final", 31.59]], excavationCY: 35.22, gapCY: 0 } },
  { id: "sect-c605-t3", kind: "section-layers", type: "water", pipe: "pvc_c900_dr18:8", cover: 4, preset: "c605_t3", expect: { widthIn: 24, hFt: 5.0875, layersCYLF: [["bedding", 0.0247], ["embedment", 0.0392], ["final", 0.2963]], layersCY: [["bedding", 2.47], ["embedment", 3.92], ["final", 29.63]], excavationCY: 37.69, gapCY: 0 } },
  // C605 T4 against today's legacy sand (bedding 6 in + zone 12 in over the crown): 0.1504 CY/LF in a 5.2542 ft trench.
  { id: "sect-c605-t4", kind: "section-layers", type: "water", pipe: "pvc_c900_dr18:8", cover: 4, preset: "c605_t4", legacyToo: true, expect: { widthIn: 24, hFt: 5.0875, layersCYLF: [["bedding", 0.0247], ["embedment", 0.0392], ["final", 0.2963]], layersCY: [["bedding", 2.47], ["embedment", 3.92], ["final", 29.63]], excavationCY: 37.69, gapCY: 0, legacySandCYLF: 0.1504, legacyExcavationCY: 38.92, legacyHFt: 5.2542 } },
  { id: "sect-c605-t5", kind: "section-layers", type: "water", pipe: "pvc_c900_dr18:8", cover: 4, preset: "c605_t5", expect: { widthIn: 24, hFt: 5.0875, layersCYLF: [["bedding", 0.0247], ["haunch", 0.0196], ["embedment", 0.0196], ["final", 0.2963]], layersCY: [["bedding", 2.47], ["haunch", 1.96], ["embedment", 1.96], ["final", 29.63]], excavationCY: 37.69, gapCY: 0 } },
  // ASTM D2321, SDR 35 8 with its invert 8.00 ft below G: max(8.4 + 16, 1.25 × 8.4 + 12) = 24.4 in, the 30 in bucket.
  { id: "sect-d2321", kind: "section-layers", type: "sanitary", pipe: SDR35_8, idIn: 7.92, invertDepth: 8, preset: "d2321", expect: { widthIn: 30, hFt: 8.3533, layersCYLF: [["bedding", 0.0308], ["haunch", 0.0252], ["embedment", 0.0715], ["final", 0.6315]], layersCY: [["bedding", 3.08], ["haunch", 2.52], ["embedment", 7.15], ["final", 63.15]], excavationCY: 77.35, gapCY: 0 } },
  // 30 TAC §217.54: bedding 6 + (10.08 − 8.4)/2 = 6.84 in, the embedment to 12 in over the crown.
  { id: "sect-d2321-tx", kind: "section-layers", type: "sanitary", pipe: SDR35_8, idIn: 7.92, invertDepth: 8, preset: "d2321_tx", expect: { widthIn: 30, hFt: 8.59, layersCYLF: [["bedding", 0.0527], ["haunch", 0.0252], ["embedment", 0.1178], ["final", 0.5852]], layersCY: [["bedding", 5.27], ["haunch", 2.52], ["embedment", 11.78], ["final", 58.52]], excavationCY: 79.54, gapCY: 0 } },
  // ASTM C1479, RCP 36 Wall B, invert 10.00 ft: 44 + 2 × 44/6 = 58.67 in, the 60 in bucket; bedding max(44/24, 3) = 3 in,
  // its loose middle 44/3 = 14.67 in wide (0.3056 SF gross, 1.13 CY).
  { id: "sect-c1479-t1", kind: "section-layers", type: "storm", pipe: "rcp_c76_wall_b:36", invertDepth: 10, preset: "c1479_t1", expect: { widthIn: 60, hFt: 10.5833, layersCYLF: [["bedding", 0.0447], ["haunch", 0.1382], ["final", 1.3711]], layersCY: [["bedding", 4.47], ["haunch", 13.82], ["final", 137.11]], excavationCY: 195.99, middleLooseCY: 1.13, gapCY: 0, compaction: [["bedding", "Middle third loose, the outer bedding compacted with the haunch"], ["haunch", "Haunch and outer bedding 95 % Cat I, 90 % Cat II, 100 % Cat III; lower side 90 % Cat I"], ["final", "Overfill native"]] } },
  { id: "sect-c1479-t2", kind: "section-layers", type: "storm", pipe: "rcp_c76_wall_b:36", invertDepth: 10, preset: "c1479_t2", expect: { widthIn: 60, hFt: 10.5833, layersCYLF: [["bedding", 0.0447], ["haunch", 0.1382], ["final", 1.3711]], layersCY: [["bedding", 4.47], ["haunch", 13.82], ["final", 137.11]], excavationCY: 195.99, gapCY: 0, compaction: [["bedding", "Middle third loose, the outer bedding compacted with the haunch"], ["haunch", "Haunch and outer bedding 90 % Cat I, 95 % Cat II, 100 % Cat III; lower side 85 % Cat I"], ["final", "Overfill native"]] } },
  { id: "sect-c1479-t3", kind: "section-layers", type: "storm", pipe: "rcp_c76_wall_b:36", invertDepth: 10, preset: "c1479_t3", expect: { widthIn: 60, hFt: 10.5833, layersCYLF: [["bedding", 0.0447], ["haunch", 0.1382], ["final", 1.3711]], layersCY: [["bedding", 4.47], ["haunch", 13.82], ["final", 137.11]], excavationCY: 195.99, gapCY: 0, compaction: [["bedding", "Middle third loose, the outer bedding compacted with the haunch"], ["haunch", "Haunch and outer bedding 85 % Cat I, 90 % Cat II, 95 % Cat III; lower side 85 % Cat I"], ["final", "Overfill native"]] } },
  // Type 4, no bedding: the bell's part below the bottom is a hand-dug bell hole, not counted. With no bedding all of
  // the bell's segment under the barrel is below the bottom, 0.0445 SF/LF (0.16 CY), as Class B's bedding takes it; the
  // plan's row printed 0.0441, Type 1's bedding figure (the same segment less its 0.0004 under Type 1's 3 in).
  { id: "sect-c1479-t4", kind: "section-layers", type: "storm", pipe: "rcp_c76_wall_b:36", invertDepth: 10, preset: "c1479_t4", expect: { widthIn: 60, hFt: 10.3333, layersCYLF: [["haunch", 0.1382], ["final", 1.3711]], layersCY: [["haunch", 13.82], ["final", 137.11]], excavationCY: 191.36, bellBelowSF: 0.0445, bellBelowCY: 0.16, gapCY: 0, materials: [["haunch", "Native", "native"], ["final", "Native", "native"]] } },
  // Bedding classes, RCP 36, invert 10.00 ft: OD + 24 = 68 in (wider than the largest bucket, so the pipe width).
  { id: "sect-class-b", kind: "section-layers", type: "storm", pipe: "rcp_c76_wall_b:36", invertDepth: 10, preset: "class_b", expect: { widthIn: 68, hFt: 10.7917, layersCYLF: [["bedding", 0.0945], ["haunch", 0.1834], ["initial", 0.3917], ["final", 1.1893]], layersCY: [["bedding", 9.45], ["haunch", 18.34], ["initial", 39.17], ["final", 118.93]], excavationCY: 226.49, gapCY: 0 } },
  { id: "sect-class-c", kind: "section-layers", type: "storm", pipe: "rcp_c76_wall_b:36", invertDepth: 10, preset: "class_c", expect: { widthIn: 68, hFt: 10.7917, layersCYLF: [["bedding", 0.0945], ["haunch", 0.0828], ["initial", 0.3874], ["final", 1.2942]], layersCY: [["bedding", 9.45], ["haunch", 8.28], ["initial", 38.74], ["final", 129.42]], excavationCY: 226.49, gapCY: 0 } },
  // Class A: the cradle is the bedding (max(44/4, 4) = 11 in) and the haunch to 11 in above the pipe's bottom, both
  // concrete: `cradleCYLF` is their sum.
  { id: "sect-class-a", kind: "section-layers", type: "storm", pipe: "rcp_c76_wall_b:36", invertDepth: 10, preset: "class_a_cradle", expect: { widthIn: 68, hFt: 11.25, cradleCYLF: 0.3032, cradleCY: 30.32, layersCYLF: [["bedding", 0.1907], ["haunch", 0.1124], ["embedment", 0.071], ["initial", 0.3917], ["final", 1.1893]], layersCY: [["bedding", 19.07], ["haunch", 11.24], ["embedment", 7.1], ["initial", 39.17], ["final", 118.93]], excavationCY: 236.11, gapCY: 0 } },
  // NEC, 4 in Sch 40 conduit at 1.5 ft cover (column 3): 4.5 + 6 = 10.5 in, the 12 in minimum and bucket; no bell.
  { id: "sect-nec-col3", kind: "section-layers", type: "elec_secondary", pipe: "conduit_sch40:4", cover: 1.5, preset: "nec", expect: { widthIn: 12, hFt: 1.875, layersCYLF: [["final", 0.0654]], layersCY: [["final", 6.54]], excavationCY: 6.94, bellCY: 0, gapCY: 0 } },
  // ASTM D2774, PE 4 in DR 11 gas at 3.0 ft cover: 16.5 in, the 18 in minimum and bucket.
  { id: "sect-d2774", kind: "section-layers", type: "gas", pipe: "pe_gas_sdr11:4", cover: 3, preset: "d2774", expect: { widthIn: 18, hFt: 3.7083, layersCYLF: [["bedding", 0.0185], ["embedment", 0.0445], ["final", 0.1389]], layersCY: [["bedding", 1.85], ["embedment", 4.45], ["final", 13.89]], excavationCY: 20.6, bellCY: 0, gapCY: 0 } },
  // Houston CSS, SDR 35 8 at 8.00 ft, paved: the project's OD + 24 = 32.4 in, the 36 in bucket; CSS to 12 in under the
  // pavement, the 12 in cap the restoration's.
  { id: "sect-houston-css", kind: "section-layers", type: "sanitary", pipe: SDR35_8, idIn: 7.92, invertDepth: 8, paved: true, preset: "houston_css", expect: { widthIn: 36, hFt: 8.52, layersCYLF: [["bedding", 0.0555], ["embedment", 0.1744], ["final", 0.5911], ["surface", 0.1111]], layersCY: [["bedding", 5.55], ["embedment", 17.44], ["final", 59.11], ["surface", 11.11]], excavationCY: 94.67, gapCY: 0, materials: [["bedding", "Cement-stabilized sand", "imported"], ["embedment", "Cement-stabilized sand", "imported"], ["final", "Cement-stabilized sand", "imported"]] } },
  // Full-trench CLSM, C900 8 at 4.0 ft cover, paved.
  { id: "sect-clsm", kind: "section-layers", type: "water", pipe: "pvc_c900_dr18:8", cover: 4, paved: true, preset: "clsm_full", expect: { widthIn: 24, hFt: 4.7542, layersCYLF: [["final", 0.2614], ["surface", 0.0741]], layersCY: [["final", 26.14], ["surface", 7.41]], excavationCY: 35.22, gapCY: 0, materials: [["final", "CLSM (flowable fill)", "imported"]] } },
  // Concrete encasement 6 in against the walls, 4 in conduit at 2.0 ft cover: 0.0723 CY/LF of concrete (D-1260's formed
  // 16.5 × 16.5 box: 0.0659).
  { id: "sect-encasement-6", kind: "section-layers", type: "encasement", pipe: "conduit_sch40:4", cover: 2, preset: "encasement_6", expect: { widthIn: 18, hFt: 2.875, layersCYLF: [["bedding", 0.0278], ["embedment", 0.0445], ["final", 0.0833]], layersCY: [["bedding", 2.78], ["embedment", 4.45], ["final", 8.33]], excavationCY: 15.97, concreteCYLF: 0.0723, gapCY: 0 } },
  // The mock-up's case: C900 8 at 3.0 ft cover (under the water main's 4 ft, the company's pressure cover), C605 T4,
  // paved; the check 0.0741 + 0.1481 + 0.0392 + 0.0247 + (0.4467 + 0.0049)/27 = 0.3028.
  { id: "sect-mockup", kind: "section-layers", type: "water", pipe: "pvc_c900_dr18:8", cover: 3, paved: true, preset: "c605_t4", expect: { widthIn: 24, hFt: 4.0875, layersCYLF: [["bedding", 0.0247], ["embedment", 0.0392], ["final", 0.1481], ["surface", 0.0741]], layersCY: [["bedding", 2.47], ["embedment", 3.92], ["final", 14.81], ["surface", 7.41]], excavationCY: 30.28, excavationCYLF: 0.3028, coverBelowMin: true, gapCY: 0 } },
  // Beyond the plan's 26: the founder's house pressure preset (D-1278 answer 1), Type 4 bedding with the embedment to
  // 12 in over the crown, worked by hand the same way: C900 8 and DI 8 at 4.0 ft cover; and C1479 T2 on a rock bottom,
  // max(44/12, 6) = 6 in of bedding.
  { id: "sect-c605-t4-house", kind: "section-layers", type: "water", pipe: "pvc_c900_dr18:8", cover: 4, preset: "c605_t4_house", expect: { widthIn: 24, hFt: 5.0875, layersCYLF: [["bedding", 0.0247], ["embedment", 0.1132], ["final", 0.2222]], layersCY: [["bedding", 2.47], ["embedment", 11.32], ["final", 22.22]], excavationCY: 37.69, gapCY: 0 } },
  { id: "sect-c600-t4-house", kind: "section-layers", type: "water", pipe: "di_c151_pc350:8", cover: 4, preset: "c600_t4_house", expect: { widthIn: 24, hFt: 5.0875, layersCYLF: [["bedding", 0.0247], ["embedment", 0.1132], ["final", 0.2222]], layersCY: [["bedding", 2.47], ["embedment", 11.32], ["final", 22.22]], excavationCY: 37.69, gapCY: 0 } },
  { id: "sect-c1479-t2-rock", kind: "section-layers", type: "storm", pipe: "rcp_c76_wall_b:36", invertDepth: 10, rock: true, preset: "c1479_t2", expect: { widthIn: 60, hFt: 10.8333, layersCYLF: [["bedding", 0.0909], ["haunch", 0.1382], ["final", 1.3711]], layersCY: [["bedding", 9.09], ["haunch", 13.82], ["final", 137.11]], excavationCY: 200.62, rockLF: 100, gapCY: 0 } },
  // The defaults by type and pipe (plan §3.2 with the founder's answers 1 and 2), and the presets' sources and grades.
  {
    id: "sect-defaults",
    kind: "section-defaults",
    picks: [
      ["water", "pvc_c900_dr18:8", "TX", {}],
      ["water", "di_c151_pc350:8", null, {}],
      ["water_service", "pe_cts_sdr9:1", null, {}],
      ["force_main", "pvc_c900_dr18:6", null, { pressureEmbedment: "project" }],
      ["sanitary", "pvc_d3034_sdr35:8", null, {}],
      ["sanitary", "pvc_d3034_sdr35:8", "TX", {}],
      ["sanitary_service", "pvc_d3034_sdr35:6", "Texas", {}],
      ["grease_waste", "pvc_dwv_sch40:6", "TX", {}],
      ["sanitary", "vcp_c700:8", "TX", {}],
      ["sanitary", "pvc_d3034_sdr35:8", "TX", { flexibleEmbedment: "css" }],
      ["storm", "rcp_c76_wall_b:36", "TX", {}],
      ["storm", "hdpe_f2648_dual_wall:24", null, {}],
      ["roof_drain", "pvc_dwv_sch40:6", null, {}],
      ["gas", "pe_gas_sdr11:4", null, {}],
      ["electric", "conduit_sch40:4", null, {}],
      ["encasement", "conduit_sch40:4", null, {}],
      ["casing", "steel_casing_375:16", null, {}],
    ],
    expect: {
      ids: "c605_t4_house c600_t4_house d2774 legacy d2321 d2321_tx d2321_tx d2321 class_b+tac houston_css+tac c1479_t2 d2321 d2321 d2774 nec encasement_6 legacy",
      presets: 27,
      sourced: 27,
      legacyAbsent: "legacy true",
      autoTitle: "AWWA C605 Type 4, house: 12 in over crown, edited: bedding",
    },
  },
  // --- independent check (founder, D-1280): eight edge cases worked by hand by the checker, not by the builder --------
  // Same row format and harness as the section-layers rows above (100 LF, constant depth, vertical typed unless stated).
  // (a) Rock foundation with undercut: D2321, SDR 35 8 (catalog ID 7.891), invert 8 ft, bedrock bottom (the rock rule's
  //     6 in bedding) and a 12 in #57 foundation added by the run. h = 8 + 0.0212 + 1 + 0.5 = 9.5212; W 24.4 -> 30 in.
  { id: "chk-rock-undercut", kind: "section-layers", type: "sanitary", pipe: SDR35_8, invertDepth: 8, rock: true, preset: "d2321", edits: { foundation: { thickness: { kind: "fixed", in: 12 }, material: "stone" } }, expect: { widthIn: 30, hFt: 9.5212, layersCYLF: [["foundation", 0.0926], ["bedding", 0.0463], ["haunch", 0.0252], ["embedment", 0.0715], ["final", 0.6316]], layersCY: [["foundation", 9.26], ["bedding", 4.63], ["haunch", 2.52], ["embedment", 7.15], ["final", 63.16]], excavationCY: 88.16, rockLF: 100, gapCY: 0 } },
  // (b) Bell hole on large DI: DI 24 PC 350 (OD 25.8, bell 1.25 x = 32.25, 0.75 ft a 18 ft joint), C600 Type 1 at 5 ft
  //     cover: no bedding, so the bell's 3.225 in below the barrel is a bell hole, 0.0123 SF/LF, not counted.
  { id: "chk-di24-bellhole", kind: "section-layers", type: "water", pipe: "di_c151_pc350:24", cover: 5, preset: "c600_t1", expect: { widthIn: 42, hFt: 7.15, layersCYLF: [["final", 0.7897]], layersCY: [["final", 78.97]], excavationCY: 92.69, bellBelowSF: 0.0123, bellBelowCY: 0.05, gapCY: 0 } },
  // (c) A wide trench at a manhole: the row format has no typed bucket or box, so the wide case is 1:1 sloped clay at a
  //     10 ft deep end; the bands stay over the 30 in bottom width and every wedge goes to the final backfill
  //     (total 2.5 x 10 + 10^2 = 125 SF; final 125 - 0.8333 - 0.875 - 2.125 = 121.1667 SF).
  { id: "chk-wide-sloped", kind: "section-layers", type: "sanitary", pipe: SDR35_8, depth: 10, protection: "sloped", preset: "d2321", expect: { widthIn: 30, hFt: 10, layersCYLF: [["bedding", 0.0308], ["haunch", 0.0252], ["embedment", 0.0715], ["final", 4.4877]], layersCY: [["bedding", 3.08], ["haunch", 2.52], ["embedment", 7.15], ["final", 448.77]], excavationCY: 462.96, gapCY: 0 } },
  // (d) 30 TAC §217.54 at 14 ft, by the default: a Texas sanitary main, "auto", SDR 35 12 (OD 12.5, ID 11.737, bell 15.0,
  //     0.5 / 14): bedding 6 + (15 - 12.5)/2 = 7.25 in, the embedment 12 in over the crown, W max(28.5, 27.625, 27) -> 30.
  { id: "chk-tac-14ft", kind: "section-layers", type: "sanitary", state: "TX", pipe: "pvc_d3034_sdr35:12", invertDepth: 14, preset: "auto", expect: { widthIn: 30, hFt: 14.636, layersCYLF: [["bedding", 0.0559], ["haunch", 0.0323], ["embedment", 0.1248], ["final", 1.1102]], layersCY: [["bedding", 5.59], ["haunch", 3.23], ["embedment", 12.48], ["final", 111.02]], excavationCY: 135.52, gapCY: 0 } },
  // (e) C605 Type 4 and Type 5 on one pipe, C905 DR 18 36 in (OD 38.3, bell 1.2 x = 45.96, 1.0 ft a 20 ft joint), 4 ft
  //     cover, W 50.3 -> 60 in. T4 bedding max(38.3/8, 4) = 4.7875 in, to the top; T5 4 in, haunch to the centerline.
  { id: "chk-c605-t4-36", kind: "section-layers", type: "water", pipe: "pvc_c905_dr18:36", cover: 4, preset: "c605_t4", expect: { widthIn: 60, hFt: 7.5906, layersCYLF: [["bedding", 0.073], ["embedment", 0.2899], ["final", 0.7399]], layersCY: [["bedding", 7.3], ["embedment", 28.99], ["final", 73.99]], excavationCY: 140.57, gapCY: 0 } },
  { id: "chk-c605-t5-36", kind: "section-layers", type: "water", pipe: "pvc_c905_dr18:36", cover: 4, preset: "c605_t5", expect: { widthIn: 60, hFt: 7.525, layersCYLF: [["bedding", 0.0609], ["haunch", 0.145], ["embedment", 0.145], ["final", 0.7399]], layersCY: [["bedding", 6.09], ["haunch", 14.5], ["embedment", 14.5], ["final", 73.99]], excavationCY: 139.35, gapCY: 0 } },
  // (f) CLSM embedment: C605 T4 on C900 8 at 4 ft cover, the bedding and the embedment edited to CLSM, the embedment to
  //     12 in over the crown.
  { id: "chk-clsm-embedment", kind: "section-layers", type: "water", pipe: "pvc_c900_dr18:8", cover: 4, preset: "c605_t4", edits: { bedding: { material: "clsm" }, embedment: { material: "clsm", top: { kind: "above_crown", in: 12 } } }, expect: { widthIn: 24, hFt: 5.0875, layersCYLF: [["bedding", 0.0247], ["embedment", 0.1132], ["final", 0.2222]], layersCY: [["bedding", 2.47], ["embedment", 11.32], ["final", 22.22]], excavationCY: 37.69, gapCY: 0, materials: [["bedding", "CLSM (flowable fill)", "imported"], ["embedment", "CLSM (flowable fill)", "imported"], ["final", "Native", "native"]] } },
  // (g) Encasement on a belled pipe: encasement_6 on C900 8 at 3 ft cover, W 21.05 -> 24 in; concrete (0.9994 + 2.0574)/27.
  { id: "chk-encase-c900", kind: "section-layers", type: "encasement", pipe: "pvc_c900_dr18:8", cover: 3, preset: "encasement_6", expect: { widthIn: 24, hFt: 4.2542, layersCYLF: [["bedding", 0.037], ["embedment", 0.0762], ["final", 0.1852]], layersCY: [["bedding", 3.7], ["embedment", 7.62], ["final", 18.52]], excavationCY: 31.51, concreteCYLF: 0.1132, gapCY: 0 } },
  // (h) A casing run, "auto": the type's default is legacy (no bell), steel casing 16 x 0.375 at 4 ft cover, the project's
  //     16 + 24 = 40 -> 42 in, bedding 6 in, zone 12 in over the crown.
  { id: "chk-casing-auto", kind: "section-layers", type: "casing", pipe: "steel_casing_375:16", cover: 4, preset: "auto", expect: { widthIn: 42, hFt: 5.8333, layersCYLF: [["bedding", 0.0648], ["embedment", 0.2508], ["final", 0.3889]], layersCY: [["bedding", 6.48], ["embedment", 25.08], ["final", 38.89]], excavationCY: 75.62, bellCY: 0, gapCY: 0 } },
  // --- D-1282 (D-1278 tasks 5 and 6, night 2): the section wired into Calculate, its lines, the project setting ----------
  // Each a 100 LF run as Calculate works it (`section-lines`): its stored section and the project's settings through
  // `calculate.ts:runLayered`, `runMaterials`, the engine, `utilityLines` and `lineWrites`. Worked by hand from the plan's
  // §3.1 / §3.3 / §5 and the standards it cites, not from the code; the walls vertical in a cemented layer (the plan's
  // "vertical typed") unless the row says clay.
  //
  // (1) A new water run (C900 8 DR 18: OD 9.05, ID 8.044, bell 1.20 x = 10.86, 0.5 ft a 20 ft joint), 4 ft cover, Texas,
  //     the new run's stored "auto": C605 Type 4, house (D-1278 answer 1). W: 9.05 + 12 = 21.05, least 18 -> bucket 24 in.
  //     Bedding max(9.05/8, 4) = 4 in: 2 x 0.3333 = 0.6667 SF less the bell's 0.0754 ft below the barrel (segment 0.0256
  //     SF x 0.5/20) = 0.6660 -> 0.0247 CY/LF, 2.47 CY. Embedment to 12 in over the crown, 1.7542 ft x 2 = 3.5083 less the
  //     barrel 0.4467 less the bell annulus above the bottom (0.1710 x 0.025) = 3.0573 -> 0.1132, 11.32 CY. Final native
  //     3.0 ft x 2 = 6.0 SF -> 0.2222, 22.22 CY. Excavation 2 x (4 + 0.7542 + 0.3333) = 10.175 SF -> 37.69 CY. Lines by role:
  //     bedding and zone on `utility_bedding_pipe_zone` (bedding:/zone: Sand, the preset's bank sand), the final backfill on
  //     `utility_backfill`; compaction in the note (T4 ~ 80 % SP, plan §3.1), never the identity. Kept sections: the three
  //     the same at a constant depth, h 5.0875, W 2, the same CY/LF as the lines.
  {
    id: "sect-lines-c900-new",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    state: "TX",
    expect: {
      preset: "c605_t4_house",
      flag: null,
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.32",
        "utility_backfill|Native|native|Trench backfill, Native|22.22",
      ],
      notes: ["bedding:Sand|imported=Bedding: ≈ 80 % Standard Proctor", "zone:Sand|imported=Embedment: ≈ 80 % Standard Proctor", "Native|native=Final backfill: Per the project's spec"],
      notesSent: 3,
      sections: "average deepest shallowest",
      avgH: 5.0875,
      avgW: 2,
      sectionLayers: [["bedding", 0.0247], ["embedment", 0.1132], ["final", 0.2222]],
      sectionCheck: true,
    },
  },
  // (2) A foundation added on a new sanitary run: SDR 35 8 (OD 8.40, ID 7.92 typed as the plan's §5, bell 10.08, 0.5 ft a
  //     14 ft joint), invert 8.00 ft below G, outside Texas: D2321 (plan §3.2), a 6 in #57 foundation added by the run.
  //     W max(8.4 + 16, 1.25 x 8.4 + 12) = 24.4 -> 30 in. h = 8 + 0.02 + 0.5 + 0.3333 = 8.8533. Foundation 2.5 x 0.5 = 1.25
  //     SF (the bell's bottom 0.07 ft under the barrel stays above it) -> 0.0463, 4.63 CY, its own line `foundation:#57
  //     stone|imported` "Trench foundation, #57 stone" (plan §3.3), apart from the bedding of the same stone: 0.8333 less
  //     the bell's segment 0.0221 x 0.5/14 = 0.8325 -> 3.08 CY. Haunch 0.6803 + embedment to 6 in over 1.9296 = 2.6099 SF
  //     -> 9.67 CY on one zone line. Final 6.82 ft x 2.5 = 17.05 -> 63.15 CY. Excavation 2.5 x 8.8533 = 22.1333 -> 81.98 CY.
  {
    id: "sect-lines-foundation",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    section: { addons: ["cctv"], layers: { v: 1, preset: "auto", edits: { foundation: { material: "stone", thickness: { kind: "fixed", in: 6 } } } } },
    expect: {
      preset: "d2321",
      title: "ASTM D2321, edited: foundation",
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|81.98",
        "utility_bedding_pipe_zone|foundation:#57 stone|imported|Trench foundation, #57 stone|4.63",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|3.08",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|9.67",
        "utility_backfill|Native|native|Trench backfill, Native|63.15",
      ],
      noteLayers: ["foundation:#57 stone|imported=Foundation", "bedding:#57 stone|imported=Bedding", "zone:#57 stone|imported=Haunch+Embedment", "Native|native=Final backfill"],
      avgH: 8.8533,
      avgW: 2.5,
      sectionCheck: true,
    },
  },
  // (3) A run stored before the layers (no `section.layers`): today's path, unchanged. Case (a) of F29: SDR 35 8 in Type B
  //     clay, trench 8 ft (invert 8 - 0.5 - 0.509/24 below G), Auto (sloped 1:1), the project's 6 in #57 bedding and its
  //     zone in #57 (D-1101, flexible pipe) to 12 in over the crown: util-2a's 6.48 / 17.46 / 300.56 / 325.93 CY. No note.
  {
    id: "sect-lines-legacy",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    invertDepth: 8 - 0.5 - 0.509 / 24,
    protection: "auto",
    section: { addons: ["cctv"] },
    expect: {
      preset: "legacy",
      flag: null,
      lines: [
        "utility_trench_excavation|trench:Clay|Trench excavation, Clay|325.93",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|6.48",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|17.46",
        "utility_backfill|Native|native|Trench backfill, Native|300.56",
      ],
      notesSent: 0,
      todayPath: true,
    },
  },
  // (4) The project's setting picks the preset for a type: `section_presets` { water: "c605_t4" } on a new C900 8 water
  //     run at 4 ft cover takes pure Type 4 (embedment to the top of the pipe), not its default (the house preset). The
  //     plan's sect-c605-t4 row: bedding 2.47, embedment to the top 1.5083 - 0.4467 - 0.0036 = 1.0580 SF -> 3.92, final
  //     8.0 - 0.0006 (the bell above the top) = 7.9994 -> 29.63, excavation 37.69 CY.
  {
    id: "sect-lines-setting",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    settings: { sectionPresets: { water: "c605_t4" } },
    expect: {
      preset: "c605_t4",
      why: "the project's section for this type (Utility settings)",
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|3.92",
        "utility_backfill|Native|native|Trench backfill, Native|29.63",
      ],
    },
  },
  // (5) The setting in Texas: { sanitary: "d2321" } on a new SDR 35 8 sanitary main, invert 8 ft: 30 TAC §217.54 still lies
  //     over it (the founder's answer 2), so it is the plan's sect-d2321-tx: bedding 6 + (10.08 - 8.4)/2 = 6.84 in -> 1.4242
  //     SF, 5.27 CY; haunch 0.6803 + embedment to 12 in over 3.1796 = 3.8599 SF -> 14.30 CY; final 6.32 ft x 2.5 = 15.80 SF
  //     -> 58.52 CY; W max(24.4, 10.08 + 12) -> 30 in; excavation 2.5 x 8.59 = 21.475 -> 79.54 CY.
  {
    id: "sect-lines-setting-tx",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    state: "TX",
    settings: { sectionPresets: { sanitary: "d2321" } },
    expect: {
      preset: "d2321",
      title: "ASTM D2321, 30 TAC §217.54",
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|79.54",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|5.27",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|14.3",
        "utility_backfill|Native|native|Trench backfill, Native|58.52",
      ],
    },
  },
  // (6) The setting never moves a run stored before: { water: "c605_t4" } and a C900 8 water run with no layers at 4 ft
  //     cover keeps today's pressure section (D-1106: 6 in a side, 18 in least -> 24 in bucket; D-1100 sand bedding 6 in and
  //     zone 12 in over the crown): h 4 + 0.7542 + 0.5 = 5.2542; bedding 1.0 SF -> 3.70; zone 3.5083 - 0.4467 = 3.0616 ->
  //     11.34; backfill 3.0 x 2 -> 22.22; excavation 10.5083 -> 38.92 CY (the plan's legacy figure, sect-c605-t4).
  {
    id: "sect-lines-setting-legacy",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: ["tracer", "tape", "test_disinfect"] },
    settings: { sectionPresets: { water: "c605_t4" } },
    expect: {
      preset: "legacy",
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|38.92",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|3.7",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.34",
        "utility_backfill|Native|native|Trench backfill, Native|22.22",
      ],
      notesSent: 0,
      todayPath: true,
    },
  },
  // (7) A poured layer's lines buy the concrete: { water: "encasement_6" } on a new C900 8 at 3 ft cover (the checker's
  //     chk-encase-c900): bedding 6 in concrete 1.0 - 0.0006 = 0.9994 SF -> 3.70 CY, embedment concrete to 6 in over the
  //     crown 2.5083 - 0.4467 - 0.0043 = 2.0573 -> 7.62 CY, final 2.5 ft x 2 = 5.0 -> 18.52 CY, excavation 2 x 4.2542 ->
  //     31.51 CY. Concrete is bought as D-1260's encasement concrete (readymix 3000, by the CY placed), not as a stone.
  {
    id: "sect-lines-concrete",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 3,
    settings: { sectionPresets: { water: "encasement_6" } },
    expect: {
      preset: "encasement_6",
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|31.51",
        "utility_bedding_pipe_zone|bedding:Concrete|imported|Pipe bedding, Concrete|3.7",
        "utility_bedding_pipe_zone|zone:Concrete|imported|Pipe zone, Concrete|7.62",
        "utility_backfill|Native|native|Trench backfill, Native|18.52",
      ],
      keys: ["bedding:Concrete|imported=concrete:layer>readymix:readymix_3000:CY", "zone:Concrete|imported=concrete:layer>readymix:readymix_3000:CY", "Native|native="],
    },
  },
  // (8) What a new run stores (plan §3.3, "A new run writes layers: { v: 1, preset: 'auto' }"): after a run drawn before
  //     the layers, the new run takes "auto" and keeps the other fields it copies (its add-ons); after a run with its own
  //     preset, that preset; a type's defaults for every type, a casing too (its default is then the project's section).
  {
    id: "sect-lines-newrun",
    kind: "section-lines",
    newRuns: true,
    expect: {
      afterLegacy: '{"v":1,"preset":"auto"}',
      afterLegacyKeeps: '["cctv"]',
      afterChosen: '{"v":1,"preset":"c605_t4"}',
      fresh: '{"v":1,"preset":"auto"}',
      byType: '{"v":1,"preset":"auto"} {"v":1,"preset":"auto"} {"v":1,"preset":"auto"} {"v":1,"preset":"auto"} {"v":1,"preset":"auto"}',
    },
  },
  // --- Independent check of D-1282 (chk2-*): worked by hand from the plan (§2, §3, §5) and the standards, not the code ---
  // chk2-1: a foundation on a layered run in sloped clay. SDR 35 8 (OD 8.40, ID 7.92, bell 1.20 x = 10.08, 0.5 ft a 14 ft
  //   joint), invert 8.00 ft, Type B clay, Auto -> sloped 1:1 from the bottom; D2321 with a 6 in #57 foundation added.
  //   W max(24.4, 22.5) -> 30 in. h = 8 + 0.02 + 0.3333 + 0.5 = 8.8533. Area 2.5 x 8.8533 + 8.8533^2 = 100.5148 SF -> 372.28
  //   CY. Bands over the bottom width only (D-1080 B4): foundation 1.25 SF (4.63), bedding 0.8333 - 0.0008 bell = 0.8325
  //   (3.08), haunch 0.6803 + embedment 1.9296 = 2.6099 (9.67). Final takes the slope: 100.5148 - 2.5 x 2.0333 = 95.4315
  //   SF -> 353.45 CY.
  {
    id: "chk2-1-foundation-sloped-clay",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    protection: "auto",
    section: { addons: ["cctv"], layers: { v: 1, preset: "auto", edits: { foundation: { material: "stone", thickness: { kind: "fixed", in: 6 } } } } },
    expect: {
      preset: "d2321",
      flag: null,
      lines: [
        "utility_trench_excavation|trench:Clay|Trench excavation, Clay|372.28",
        "utility_bedding_pipe_zone|foundation:#57 stone|imported|Trench foundation, #57 stone|4.63",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|3.08",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|9.67",
        "utility_backfill|Native|native|Trench backfill, Native|353.45",
      ],
    },
  },
  // chk2-2: a run's own stored preset is not moved by the project's setting (plan §3.3: the setting is for "auto").
  //   Stored { preset: "c605_t4" }, setting { water: "encasement_6" }: C605 T4 as the plan's sect-c605-t4, C900 8 at 4 ft
  //   cover: W 21.05 -> 24 in, h 5.0875; bedding 0.6660 SF (2.47), embedment to the top 1.5083 - 0.4467 - 0.0036 = 1.0580
  //   (3.92), final 8.0 - 0.0006 = 7.9994 (29.63), excavation 10.175 SF (37.69).
  {
    id: "chk2-2-run-preset-over-setting",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: ["tracer", "tape", "test_disinfect"], layers: { v: 1, preset: "c605_t4" } },
    settings: { sectionPresets: { water: "encasement_6" } },
    expect: {
      preset: "c605_t4",
      title: "AWWA C605 Type 4",
      flag: null,
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|3.92",
        "utility_backfill|Native|native|Trench backfill, Native|29.63",
      ],
    },
  },
  // chk2-3: a Texas sanitary main whose project setting points at the project's own section ({ sanitary: "legacy" }):
  //   30 TAC is not laid over legacy, the run takes today's path. SDR 35 8 (ID 7.92), invert 8: W 8.4 + 24 = 32.4 -> 36 in;
  //   h 8 + 0.02 + 0.5 = 8.52; bedding 6 in #57 3 x 0.5 = 1.5 SF (5.56); zone #57 to 12 in over 3 x 1.7 - 0.3848 = 4.7152
  //   (17.46); backfill 3 x 6.32 = 18.96 (70.22); excavation 25.56 SF (94.67). No bell (legacy), no note.
  {
    id: "chk2-3-tx-setting-legacy",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    state: "TX",
    settings: { sectionPresets: { sanitary: "legacy" } },
    expect: {
      preset: "legacy",
      flag: null,
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|94.67",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|5.56",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|17.46",
        "utility_backfill|Native|native|Trench backfill, Native|70.22",
      ],
      notesSent: 0,
    },
  },
  // chk2-4: a setting naming an unknown preset falls back to the type and pipe's default (C605 T4 house), never throws.
  //   Figures as sect-lines-c900-new: 2.47 / 11.32 / 22.22, excavation 37.69.
  {
    id: "chk2-4-setting-unknown-preset",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    settings: { sectionPresets: { water: "c605_t9" } },
    expect: {
      preset: "c605_t4_house",
      flag: null,
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.32",
        "utility_backfill|Native|native|Trench backfill, Native|22.22",
      ],
    },
  },
  // chk2-5: Texas gravity ductile iron sanitary (plan §3.2: DI on gravity -> C600 T4, house per answer 1, 30 TAC over it).
  //   DI 8 PC 350: OD 9.05, ID 8.55, bell 1.25 x = 11.3125, 0.5 ft a 18 ft joint. Bedding max(OD/8 = 1.13, 4, 30 TAC
  //   6 + (11.3125 - 9.05)/2 = 7.1313) = 7.1313 in = 0.5943 ft; h = 8 + 0.0208 + 0.5943 = 8.6151. W max(9.05 + 12,
  //   11.3125 + 12 = 23.31) -> 24 in. Bedding 1.1885 - bell segment below the barrel (R 0.4714, t 0.0943: 0.0363 SF x
  //   0.0278 = 0.0010) = 1.1875 (4.40); embedment to 12 in over (house and 30 TAC agree) 3.5083 - 0.4467 - 0.0060 = 3.0557
  //   (11.32); final 2 x 6.2667 = 12.5333 (46.42); excavation 17.2302 SF (63.82).
  {
    id: "chk2-5-tx-gravity-di",
    kind: "section-lines",
    type: "sanitary",
    pipe: "di_c151_pc350:8",
    idIn: 8.55,
    invertDepth: 8,
    state: "TX",
    expect: {
      preset: "c600_t4_house",
      title: "AWWA C600 Type 4, house: 12 in over crown, 30 TAC §217.54",
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|63.82",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|4.4",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.32",
        "utility_backfill|Native|native|Trench backfill, Native|46.42",
      ],
    },
  },
  // chk2-6: a Texas grease waste line (a private building sewer, not a main or public lateral: the founder's answer 2 in
  //   D-1278) takes plain D2321, no 30 TAC. The plan's sect-d2321: h 8.3533, W 30 in; bedding 0.8325 (3.08), haunch 0.6803
  //   + embedment 1.9296 = 2.6099 (9.67), final 17.05 (63.15), excavation 20.8833 SF (77.35).
  {
    id: "chk2-6-tx-grease-no-tac",
    kind: "section-lines",
    type: "grease_waste",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    state: "TX",
    expect: {
      preset: "d2321",
      title: "ASTM D2321",
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|77.35",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|3.08",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|9.67",
        "utility_backfill|Native|native|Trench backfill, Native|63.15",
      ],
    },
  },
  // chk2-7: a very shallow new run: C900 8 at 0.5 ft cover, C605 T4 house. The embedment's top (12 in over the crown,
  //   2.0875 ft) lies above the surface (h = 0.5 + 0.7542 + 0.3333 = 1.5875): clipped to the surface (plan §2.1), no final
  //   backfill, so no backfill line. Bedding 0.6660 (2.47); embedment 2 x 1.2542 - 0.4467 - 0.0043 = 2.0574 (7.62);
  //   excavation 3.175 SF (11.76).
  {
    id: "chk2-7-shallow-clipped",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 0.5,
    expect: {
      preset: "c605_t4_house",
      lines: [
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|11.76",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|7.62",
      ],
    },
  },
  // chk2-8: a layered run whose depth varies, sloped clay: D2321 SDR 35 8, trench depth 6 -> 10 ft over 100 LF, Type B 1:1.
  //   Area(h) = 2.5 h + h^2; mean over the run 2.5 x 8 + (36 + 60 + 100)/3 = 85.3333 SF -> 316.05 CY (the prismoidal rule is
  //   exact). Bands constant over the bottom width: bedding 3.08, haunch 2.52, embedment 7.15 (2.5 x 1.5333 = 3.8333 SF gross
  //   with the pipe and bell); final 85.3333 - 3.8333 = 81.5 SF -> 301.85 CY.
  { id: "chk2-8-varying-depth-sloped", kind: "section-layers", type: "sanitary", pipe: SDR35_8, depth: [6, 10], protection: "sloped", preset: "d2321", expect: { widthIn: 30, layersCY: [["bedding", 3.08], ["haunch", 2.52], ["embedment", 7.15], ["final", 301.85]], excavationCY: 316.05, gapCY: 0 } },
  // --- D-1283 (D-1278 tasks 7 and 10, night 3): the run panel's section edits, as Calculate works them ----------------
  // Worked by hand from the plan (§2.4, §3.1, §3.3, §5) and the standards, not from the code. 100 LF, constant depth,
  // G = 100, walls vertical in a cemented layer, bucket Auto. C900 8 DR 18: OD 9.05 (0.754167 ft), ID 8.044, bell 1.20 x
  // = 10.86 (0.905 ft), 0.5 ft a 20 ft joint (share 0.025); barrel pi x 0.754167^2 / 4 = 0.446707 SF; bell circle
  // 0.643261 SF, its annulus 0.196554; the bell's segment below (and above) the barrel, height 0.075417 ft on r 0.4525:
  // 0.4525^2 acos(0.833333) - 0.377083 sqrt(0.062564) = 0.025605 SF.
  //
  // (1) Switch from legacy (plan §3.3, "Switch to <standard>" shows the CY change by layer): a water run drawn before the
  //     layers, C900 8 at 4 ft cover, the project's 6 in bedding and zone 12 in over the crown in sand (D-1100, pressure
  //     sand), W 9.05 + 12 = 21.05 -> 24 in. Legacy: bedding 2 x 0.5 = 1.0 SF -> 3.70 CY; zone 2 x 1.754167 - 0.446707 =
  //     3.061626 -> 11.34; backfill 2 x 3.0 = 6.0 -> 22.22; excavation 2 x 5.254167 -> 38.92. Switched to AWWA C605 Type 4
  //     (the plan's sect-c605-t4): bedding 4 in 0.666667 - 0.025605 x 0.025 = 0.666027 -> 2.47; embedment to the top
  //     1.508333 - 0.446707 - (0.643261 - 2 x 0.025605 - 0.446707) x 0.025 = 1.057992 -> 3.92; final 8.0 - 0.000640 ->
  //     29.63; excavation 2 x 5.0875 -> 37.69. Change by line: bedding -1.2369 -> -1.24, zone -7.4209 -> -7.42, backfill
  //     +7.4050 -> +7.41, excavation -1.2346 -> -1.23 (the plan's -58 % sand: 0.1504 -> 0.0639 CY/LF).
  {
    id: "p3-switch-legacy-c605-t4",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: [] },
    switchTo: { v: 1, preset: "c605_t4" },
    expect: {
      preset: "legacy",
      switchPreset: "c605_t4",
      switchRows: ["excavation|||38.92|37.69|-1.23", "bedding|Sand|Sand|3.7|2.47|-1.24", "zone|Sand|Sand|11.34|3.92|-7.42", "backfill|Native|Native|22.22|29.63|7.41"],
      switchLines: [
        "utility_backfill|Native|native|Trench backfill, Native|29.63",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|3.92",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
      ],
      todayPath: true,
    },
  },
  // (2) A layer edit (Edit layers: material, thickness, top, compaction): a new C900 8 water run at 4 ft cover, "auto"
  //     (C605 Type 4 house), its bedding edited to 6 in #57 stone at 95 % Standard Proctor and its embedment to 6 in over
  //     the crown. h 4 + 0.754167 + 0.5 = 5.254167; bedding 2 x 0.5 = 1.0 less the bell below the barrel 0.025605 x
  //     0.025 = 0.999360 -> 3.70 CY; embedment 0.5 to 1.754167, 2 x 1.254167 = 2.508333 - 0.446707 - (0.196554 - 0.025605)
  //     x 0.025 = 2.057352 -> 7.62; final 2 x 3.5 = 7.0 -> 25.93; excavation 10.508333 -> 38.92. The bedding's line is its
  //     edited stone, the embedment keeps the preset's sand; compaction words on the notes only.
  {
    id: "p3-layer-edit",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: [], layers: { v: 1, preset: "auto", edits: { bedding: { material: "stone", thickness: { kind: "fixed", in: 6 }, compaction: { pct: 95, test: "SP" } }, embedment: { top: { kind: "above_crown", in: 6 } } } } },
    expect: {
      preset: "c605_t4_house",
      title: "AWWA C605 Type 4, house: 12 in over crown, edited: bedding, embedment",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|25.93",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|3.7",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|7.62",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|38.92",
      ],
      notes: ["bedding:#57 stone|imported=Bedding: 95 % Standard Proctor", "zone:Sand|imported=Embedment: ≈ 80 % Standard Proctor", "Native|native=Final backfill: Per the project's spec"],
      sectionCheck: true,
    },
  },
  // (3) A segment override on a layered run (departure 1 of D-1282's check): the same new C900 8 water run, "auto" (C605
  //     Type 4 house), a segment 0+00 to 0+40 with its bedding 6 in and its zone in #57 stone. In the segment: bedding
  //     0.999360 -> 0.037013 CY/LF; embedment 0.5 to 2.254167 ft (12 in over the crown kept), 2 x 1.754167 - 0.446707 -
  //     0.004274 = 3.057352 -> 0.113235 in #57 stone; final 2 x 3.0 -> 0.222222; excavation 2 x 5.254167 -> 0.389198. Past
  //     it (60 LF) the preset: bedding 0.666027 -> 0.024668, embedment 3.057352 -> 0.113235 in sand, final 0.222222,
  //     excavation 10.175 -> 0.376852. Totals: bedding 1.48053 + 1.48006 = 2.96; zone #57 40 x 0.113235 = 4.53, sand 60 x
  //     = 6.79; backfill 22.22; excavation 15.56790 + 22.61111 = 38.18.
  {
    id: "p3-segment-layered",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    segments: [{ from_ft: 0, to_ft: 40, overrides: { note: "", bedding_in: 6, zone: { name: "#57 stone", source: "imported" } } }],
    expect: {
      preset: "c605_t4_house",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|22.22",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.96",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|4.53",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|6.79",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|38.18",
      ],
    },
  },
  // (3b) The same segment on a run drawn before (legacy): today's path, unchanged (bedding 9 in in the segment). Segment
  //     bedding 2 x 0.75 = 1.5 -> 0.055556, zone 3.061626 -> 0.113394 in #57 stone, backfill 0.222222, excavation 2 x
  //     5.504167 -> 0.407716; past it 0.037037 / 0.113394 sand / 0.222222 / 0.389198. Totals: bedding 2.22222 + 2.22222 =
  //     4.44; zone #57 4.53574 -> 4.54, sand 6.80361 -> 6.8; backfill 22.22; excavation 16.30864 + 23.35185 = 39.66.
  {
    id: "p3-segment-legacy",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: [] },
    segments: [{ from_ft: 0, to_ft: 40, overrides: { note: "", bedding_in: 9, zone: { name: "#57 stone", source: "imported" } } }],
    expect: {
      preset: "legacy",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|22.22",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|4.44",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|4.54",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|6.8",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|39.66",
      ],
      todayPath: true,
    },
  },
  // (4) A cased open cut takes the carrier's preset (departure 3 of D-1282's check): RCP 12 Wall B storm (OD 16, ID 12,
  //     bell 23 Rinker), its casing by the rule bell + 4 = 27 in -> 30 in x 0.500 (ID 29.0, wall 26-36 in 0.500), laid
  //     open cut centred on the carrier (casing invert = carrier invert + (12 - 29) / 24), the carrier's invert 6.00 ft
  //     below G. The carrier's family (RCP) keeps ASTM C1479 Type 2 on the casing (not D2321), with no bell (steel). On OD
  //     30: bedding max(30/24, 3) = 3 in; haunch to the springline 15 in in sand (Cat II, the founder's N4 of 2026-11-15,
  //     keeping D-1168; it was #57 Cat I: the CY unchanged, the line's material moved); overfill native; width ACPA 30 +
  //     2 x 30/6 = 40 -> 42 in bucket. h = 6 + 0.708333 + 0.041667 + 0.25 = 7.0. Bedding 3.5 x 0.25 = 0.875 SF -> 3.24 CY;
  //     haunch 3.5 x 1.25 - pi x 1.25^2 / 2 = 1.920631 -> 7.11; final 3.5 x 5.5 - 2.454369 = 16.795631 -> 62.21;
  //     excavation 3.5 x 7 = 24.5 -> 90.74 (with the casing's 4.908739 SF, 18.18 CY).
  {
    id: "p3-cased-carrier-preset",
    kind: "section-lines",
    type: "storm",
    pipe: "rcp_c76_wall_b:12",
    invertDepth: 6,
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    casing: { odIn: 30, idIn: 29 },
    expect: {
      carrierPreset: "c1479_t2",
      preset: "c1479_t2",
      bellCY: 0,
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|62.21",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|3.24",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|7.11",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|90.74",
      ],
      avgH: 7,
      avgW: 3.5,
      sectionCheck: true,
    },
  },
  // --- D-1283 item 4 (the founder, 2026-11-15): "Old runs switched to new sections: keep the user's explicit bedding/zone
  // picks; only defaults move to presets." A pick is explicit when the run stores it (`section.bedding_choice` /
  // `section.zone_choice`: the run panel writes the key only on a pick and drops it on "the project's default"). Switch
  // carries the bedding pick onto the bedding layer and the zone pick onto the haunch, embedment and initial (plan §3.3's
  // pipe zone line), as material edits; thickness and top rules stay the preset's, so every CY below is the plain
  // preset's and only the line's material moves. `switchCarry`: the driver stores what Switch stores (`carryPicks`).
  // Worked by hand from the plan and the standards (figures as the p3 rows above and chk3-1), before the run.
  //
  // (5a) C900 8 water at 4 ft drawn before, its zone picked #57 stone (bedding the D-1100 pressure default, sand), switched
  //     to AWWA C605 Type 4: legacy bedding sand 3.70, zone #57 11.34, backfill 22.22, excavation 38.92 (as p3-switch);
  //     after, bedding 4 in sand (the preset's: no pick) 0.666027 -> 2.47, embedment to the top 1.057992 -> 3.92 in #57
  //     (the pick), final 29.63, excavation 37.69. Change -1.23 / -1.24 / -7.42 / +7.41.
  {
    id: "p3b-switch-zone-pick-c605-t4",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: [], zone_choice: "stone" },
    switchTo: { v: 1, preset: "c605_t4" },
    switchCarry: true,
    expect: {
      preset: "legacy",
      todayPath: true,
      switchLayers: '{"v":1,"preset":"c605_t4","edits":{"embedment":{"material":"stone"}}}',
      switchPreset: "c605_t4",
      switchRows: ["excavation|||38.92|37.69|-1.23", "bedding|Sand|Sand|3.7|2.47|-1.24", "zone|#57 stone|#57 stone|11.34|3.92|-7.42", "backfill|Native|Native|22.22|29.63|7.41"],
      switchLines: [
        "utility_backfill|Native|native|Trench backfill, Native|29.63",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|3.92",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
      ],
    },
  },
  // (5b) SDR 35 8 sanitary, invert 8.00 ft, drawn before, its bedding picked bank sand (the zone the D-1101 flexible
  //     default, #57), switched to ASTM D2321, walls vertical. Legacy: W 36 in, h 8 + 0.02 + 0.5 = 8.52; bedding 3 x 0.5 =
  //     1.5 SF -> 5.56 sand; zone 3 x 1.7 - 0.384845 = 4.715155 -> 17.46 #57; backfill 3 x 8.52 - 1.5 - 5.1 = 18.96 ->
  //     70.22; excavation 25.56 -> 94.67. D2321 (sect-d2321): W 30, h 8.353333; bedding 4 in 0.833333 - 0.000788 = 0.832546
  //     -> 3.08 in sand (the pick); haunch 0.680341 + embedment 6 in over the crown 1.929554 = 2.609895 -> 9.67 in #57 (the
  //     preset's: no zone pick); final 2.5 x 6.82 = 17.05 -> 63.15; excavation 20.883333 -> 77.35. Change -17.32 / -2.47 /
  //     -7.80 / -7.07.
  {
    id: "p3b-switch-bedding-pick-d2321",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    section: { addons: [], bedding_choice: "bank_sand" },
    switchTo: { v: 1, preset: "d2321" },
    switchCarry: true,
    expect: {
      preset: "legacy",
      todayPath: true,
      switchLayers: '{"v":1,"preset":"d2321","edits":{"bedding":{"material":"bank_sand"}}}',
      switchPreset: "d2321",
      switchRows: ["excavation|||94.67|77.35|-17.32", "bedding|Sand|Sand|5.56|3.08|-2.47", "zone|#57 stone|#57 stone|17.46|9.67|-7.8", "backfill|Native|Native|70.22|63.15|-7.07"],
      switchLines: [
        "utility_backfill|Native|native|Trench backfill, Native|63.15",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|3.08",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|9.67",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|77.35",
      ],
    },
  },
  // (5c) No pick of the run's own: the switch stores the plain preset (no edits) and every material is the preset's, the
  //     figures p3-switch-legacy-c605-t4's exactly.
  {
    id: "p3b-switch-no-pick",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: [] },
    switchTo: { v: 1, preset: "c605_t4" },
    switchCarry: true,
    expect: {
      preset: "legacy",
      todayPath: true,
      switchLayers: '{"v":1,"preset":"c605_t4"}',
      switchPreset: "c605_t4",
      switchRows: ["excavation|||38.92|37.69|-1.23", "bedding|Sand|Sand|3.7|2.47|-1.24", "zone|Sand|Sand|11.34|3.92|-7.42", "backfill|Native|Native|22.22|29.63|7.41"],
      switchLines: [
        "utility_backfill|Native|native|Trench backfill, Native|29.63",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|3.92",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
      ],
    },
  },
  // (5d) Both picks: C900 8 water at 4 ft drawn before, bedding #57 stone and zone cement-stabilized sand, switched to AWWA
  //     C605 Type 5 (bedding 4 in, haunch to the centerline, embedment to the top: the zone pick goes on both). h 5.0875,
  //     W 24. Bedding 0.666027 -> 2.47 #57; haunch 2 x 0.377083 - 0.223353 - (0.321631 - 0.025605 - 0.223353) x 0.025 =
  //     0.528997, embedment the same 0.528997 (the bell's upper half less its segment above the crown), zone 1.057994 ->
  //     3.92 CSS on one line; final 8.0 - 0.000640 -> 29.63; excavation 37.69. Legacy: bedding #57 3.70, zone CSS 11.34,
  //     backfill 22.22, excavation 38.92.
  {
    id: "p3b-switch-both-picks-c605-t5",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: [], bedding_choice: "stone", zone_choice: "css" },
    switchTo: { v: 1, preset: "c605_t5" },
    switchCarry: true,
    expect: {
      preset: "legacy",
      todayPath: true,
      switchLayers: '{"v":1,"preset":"c605_t5","edits":{"bedding":{"material":"stone"},"haunch":{"material":"css"},"embedment":{"material":"css"}}}',
      switchPreset: "c605_t5",
      switchRows: ["excavation|||38.92|37.69|-1.23", "bedding|#57 stone|#57 stone|3.7|2.47|-1.24", "zone|Cement-stabilized sand|Cement-stabilized sand|11.34|3.92|-7.42", "backfill|Native|Native|22.22|29.63|7.41"],
      switchLines: [
        "utility_backfill|Native|native|Trench backfill, Native|29.63",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|2.47",
        "utility_bedding_pipe_zone|zone:Cement-stabilized sand|imported|Pipe zone, Cement-stabilized sand|3.92",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
      ],
    },
  },
  // --- Independent check of D-1283 (chk3-*): worked by hand from the plan (§2, §3, §5) and the standards, not the code ---
  // Pipes: SDR 35 8 OD 8.40 ID 7.92 (wall 0.02 ft), bell 1.20 x = 10.08, 0.5 ft a 14 ft joint (share 0.035714); bell
  //   segment below/above the barrel (R 0.42, t 0.07) 0.022058 SF, so 0.000788 in the bedding; haunch net 0.680341, a 6 in
  //   over-crown embedment 1.929554, a 12 in one 3.179554. C900 8: as the p3 rows (bell share 0.025, segment 0.025605).
  // chk3-1: Switch from legacy on a sloped clay run (Type B, 1:1 from the bottom: area = W h + h^2). Legacy SDR 35 sanitary,
  //   invert 8: W 36, h 8.52, total 98.1504 SF (363.52); bedding full width 3 x 0.5 + 0.25 = 1.75 (6.48); zone 3 x 1.7 -
  //   0.384845 = 4.715155 (17.46); backfill 98.1504 - 1.75 - 5.1 = 91.3004 (338.15). D2321: W 30, h 8.353333, total 20.883333
  //   + 69.778178 = 90.661511 (335.78); bedding 0.832546 (3.08); zone 2.609895 (9.67); final 90.661511 - 2.5 x 1.533333 =
  //   86.828178 (321.59). Change: -27.74 / -3.40 / -7.80 / -16.56.
  {
    id: "chk3-1-switch-sloped-clay",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    protection: "auto",
    section: { addons: ["cctv"] },
    switchTo: { v: 1, preset: "d2321" },
    expect: {
      preset: "legacy",
      todayPath: true,
      switchRows: ["excavation|||363.52|335.78|-27.74", "bedding|#57 stone|#57 stone|6.48|3.08|-3.4", "zone|#57 stone|#57 stone|17.46|9.67|-7.8", "backfill|Native|Native|338.15|321.59|-16.56"],
      switchLines: [
        "utility_backfill|Native|native|Trench backfill, Native|321.59",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|3.08",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|9.67",
        "utility_trench_excavation|trench:Clay|Trench excavation, Clay|335.78",
      ],
    },
  },
  // chk3-2: a layer turned off (Edit layers, "on" unticked): C900 8 water, cover 4, auto (C605 T4 house), bedding off. The
  //   pipe sits on the trench bottom: h 4.754167, W 24. Embedment 0 to 1.754167: 3.508333 - 0.446707 - (0.643261 - 0.025605
  //   - 0.446707) x 0.025 = 3.057352 (11.32); the bell's segment below the bottom is the bell hole, not counted. Final 2 x 3
  //   = 6 (22.22); excavation 9.508333 (35.22); bell in the trench 0.004274 SF (0.02 CY). No bedding line.
  {
    id: "chk3-2-bedding-off",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: [], layers: { v: 1, preset: "auto", edits: { bedding: { off: true } } } },
    expect: {
      preset: "c605_t4_house",
      title: "AWWA C605 Type 4, house: 12 in over crown, edited: bedding",
      bellCY: 0.02,
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|22.22",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.32",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|35.22",
      ],
      sectionCheck: true,
    },
  },
  // chk3-3: a typed material (Edit layers, "Other, typed…"): C900 8 water, cover 4, C605 Type 4 chosen, its embedment in
  //   "Pea gravel", imported. Figures as sect-c605-t4: bedding 2.47 sand, embedment 3.92 on its own zone line, final 29.63,
  //   excavation 37.69.
  {
    id: "chk3-3-typed-material",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: [], layers: { v: 1, preset: "c605_t4", edits: { embedment: { material: { name: "Pea gravel", source: "imported", density_pcf: 100 } } } } },
    expect: {
      preset: "c605_t4",
      title: "AWWA C605 Type 4, edited: embedment",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|29.63",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:Pea gravel|imported|Pipe zone, Pea gravel|3.92",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
      ],
    },
  },
  // chk3-4: a segment override on a layered run that changes the bedding's thickness and material at once: SDR 35 8
  //   sanitary, invert 8, D2321 (auto), segment 0+00 to 0+50 bedding 8 in of Sand. In it: bedding 2.5 x 0.666667 - 0.000788
  //   = 1.665879 (50 LF: 3.08 Sand); zone 2.609895; final 6.82 x 2.5 = 17.05; excavation 2.5 x 8.686667 = 21.716667. Past it
  //   D2321: bedding 0.832546 (50 LF: 1.54 #57), zone, final as above, excavation 20.883333. Totals: zone 9.67, backfill
  //   63.15, excavation (1085.8333 + 1044.1667) / 27 = 78.89.
  {
    id: "chk3-4-segment-material-thickness",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    section: { addons: ["cctv"], layers: { v: 1, preset: "auto" } },
    segments: [{ from_ft: 0, to_ft: 50, overrides: { note: "", bedding_in: 8, bedding: { name: "Sand", source: "imported" } } }],
    expect: {
      preset: "d2321",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|63.15",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|1.54",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|3.08",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|9.67",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|78.89",
      ],
    },
  },
  // chk3-5: Switch from legacy to Auto on a Texas sanitary main (30 TAC by default, the founder's answer 2). Legacy as
  //   chk2-3: 5.56 / 17.46 / 70.22, excavation 94.67. D2321 + 30 TAC as sect-d2321-tx: bedding 6 + 0.84 = 6.84 in, 1.424212
  //   (5.27); zone 0.680341 + 3.179554 = 3.859895 (14.30); final 6.32 x 2.5 = 15.8 (58.52); excavation 21.475 (79.54).
  //   Change: -15.13 / -0.28 / -3.17 / -11.70.
  {
    id: "chk3-5-switch-tx-auto",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    state: "TX",
    section: { addons: ["cctv"] },
    switchTo: { v: 1, preset: "auto" },
    expect: {
      preset: "legacy",
      todayPath: true,
      switchRows: ["excavation|||94.67|79.54|-15.13", "bedding|#57 stone|#57 stone|5.56|5.27|-0.28", "zone|#57 stone|#57 stone|17.46|14.3|-3.17", "backfill|Native|Native|70.22|58.52|-11.7"],
      switchLines: [
        "utility_backfill|Native|native|Trench backfill, Native|58.52",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|5.27",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|14.3",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|79.54",
      ],
    },
  },
  // chk3-6: a cased open cut of gravity DI sanitary keeps the carrier's AWWA C600 (house) on its casing. DI 8 PC 350 bell
  //   1.25 x 9.05 = 11.31 + 4 = 15.31 -> a 16 x 0.250 steel casing (ID 15.5), centred: its invert 8 + (15.5 - 8.55)/24 =
  //   8.289583 below G; wall 0.020833; bedding max(16/8, 4) = 4 in; embedment to 12 in over the crown; width 16 + 12 = 28
  //   -> 30 in. h 8.64375. Bedding 0.833333 (3.09); embedment 2.5 x 2.333333 - 1.396263 = 4.437070 (16.43); final 2.5 x
  //   5.977083 = 14.942708 (55.34); excavation 21.609375 (80.03); no bell.
  {
    id: "chk3-6-cased-di-sanitary-c600",
    kind: "section-lines",
    type: "sanitary",
    pipe: "di_c151_pc350:8",
    idIn: 8.55,
    invertDepth: 8,
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    casing: { odIn: 16, idIn: 15.5 },
    expect: {
      carrierPreset: "c600_t4_house",
      preset: "c600_t4_house",
      bellCY: 0,
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|55.34",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|3.09",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|16.43",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|80.03",
      ],
      sectionCheck: true,
    },
  },
  // chk3-7: a segment's zone above the crown on a stack with no embedment (C1479 Type 2, overfill native): RCP 36 Wall B
  //   storm, invert 10, segment 0+00 to 0+50 zone 12 in over the crown -> an embedment of the haunch's material (sand
  //   since the founder's N4 of 2026-11-15, keeping D-1168; it was #57: the CY unchanged) from the
  //   springline to 12 in over the crown. Sect-c1479-t2 figures: bedding 1.205884, haunch 3.730720, overfill 37.019577,
  //   excavation 52.916667 SF. Segment embedment 5 x 2.833333 - 5.279621 - 0.200802 = 8.686244; its final 5 x 5.666667 =
  //   28.333333. Totals: bedding 4.47; zone (373.0720 + 434.3122) / 27 = 29.90; backfill (1850.98 + 1416.67) / 27 = 121.02;
  //   excavation 195.99 (no change: the depth is the bedding's).
  {
    id: "chk3-7-segment-zone-on-c1479",
    kind: "section-lines",
    type: "storm",
    pipe: "rcp_c76_wall_b:36",
    invertDepth: 10,
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    segments: [{ from_ft: 0, to_ft: 50, overrides: { note: "", zone_above_crown_in: 12 } }],
    expect: {
      preset: "c1479_t2",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|121.02",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|4.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|29.9",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|195.99",
      ],
    },
  },
  // chk3-8: Texas 30 TAC with Edit layers below its minimum: TX sanitary SDR 35 8, auto, bedding edited to 4 in and the
  //   embedment to 6 in over the crown. 30 TAC is a floor: the bedding stays 6.84 in under the barrel (6 in under the bell)
  //   and the embedment 12 in over the crown, so the figures are chk3-5's after: 5.27 / 14.30 / 58.52, excavation 79.54.
  {
    id: "chk3-8-tx-edit-below-min",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    state: "TX",
    section: { addons: ["cctv"], layers: { v: 1, preset: "auto", edits: { bedding: { thickness: { kind: "fixed", in: 4 } }, embedment: { top: { kind: "above_crown", in: 6 } } } } },
    expect: {
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|58.52",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|5.27",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|14.3",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|79.54",
      ],
      sectionCheck: true,
    },
  },
  // --- The founder's rerun decisions (2026-11-15, founder to confirm; D-1283 "Rerun decisions"), worked by hand from the
  // plan's rows (§5) and the standards before the run. 100 LF, constant depth, vertical typed, the section-lines drive.
  // rerun-1 (N2, unpaved): Houston on a gravity run is 6 in CSS bedding and CSS to 12 in over the crown, then native to
  //   the surface. SDR 35 8 (ID 7.92), invert 8, not Texas: W project OD + 24 = 32.4 -> 36 in; h 8 + 0.02 + 0.5 = 8.52.
  //   Bedding 3 x 0.5 - 0.0008 = 1.4992 -> 5.55; embedment 3 x 1.7 - 0.3848 - 0.0053 = 4.7099 -> 17.44; final native
  //   3 x (8.52 - 0.5 - 1.7) = 18.96 -> 70.22 (sect-houston-css's 59.11 CSS + its 11.11 cap, now native to the surface);
  //   excavation 3 x 8.52 = 25.56 -> 94.67.
  {
    id: "rerun-houston-sanitary-unpaved",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    section: { addons: [], layers: { v: 1, preset: "houston_css" } },
    expect: {
      preset: "houston_css",
      title: "City of Houston, CSS bedding and embedment",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|70.22",
        "utility_bedding_pipe_zone|bedding:Cement-stabilized sand|imported|Pipe bedding, Cement-stabilized sand|5.55",
        "utility_bedding_pipe_zone|zone:Cement-stabilized sand|imported|Pipe zone, Cement-stabilized sand|17.44",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|94.67",
      ],
      sectionCheck: true,
    },
  },
  // rerun-2 ((b) water): Houston on a water run is bank sand, 6 in bedding and to 12 in over the crown, native above. C900 8
  //   DR 18 (OD 9.05, ID 8.044, bell 10.86, 0.5 ft a 20 ft joint) at 4.0 ft cover: W pressure OD + 12 = 21.05 -> 24 in;
  //   h 4 + 0.7542 + 0.5 = 5.2542. The bell's part under the barrel (circle segment 0.0754 ft deep, 0.025604 SF x 0.025 =
  //   0.00064) is in the bedding. Bedding 2 x 0.5 - 0.00064 = 0.99936 -> 3.70; embedment 2 x 1.754167 - 0.446707 -
  //   (0.004914 - 0.00064) = 3.057352 -> 11.32; final 2 x 3.0 = 6.0 -> 22.22; excavation 2 x 5.2542 -> 38.92.
  {
    id: "rerun-houston-water-unpaved",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    section: { addons: [], layers: { v: 1, preset: "houston_css" } },
    expect: {
      preset: "houston_css",
      title: "City of Houston, bank sand embedment (water, force main)",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|22.22",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|3.7",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.32",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|38.92",
      ],
      sectionCheck: true,
    },
  },
  // rerun-3 (N2 under pavement): the same water run in a street ("Limited width"): the final backfill is bank sand (D-1289,
  //   the founder's Q4; it was CSS) from the embedment's top to 12 in below the surface (the cap, D-1084): 2 x (5.2542 - 1 -
  //   2.2542) = 4.0 -> 14.81; the rest as rerun-2. (The sanitary paved case is sect-houston-css, unchanged: CSS 59.11.)
  {
    id: "rerun-houston-water-paved",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    limitedWidth: true,
    section: { addons: [], layers: { v: 1, preset: "houston_css" } },
    expect: {
      linesSorted: [
        "utility_backfill|Sand|imported|Trench backfill, Sand|14.81",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|3.7",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.32",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|38.92",
      ],
    },
  },
  // --- D-1289 (the founder's Q2, Q4, Q5): the Houston preset by the project's jurisdiction and the pipe, each a 100 LF run
  // on houston_css, "Limited width" for a street (paved) where named. Only the preset, its title and the fills' materials
  // are read here (the volumes are the rows above'; the materials are what moved):
  // - Harris County: CSS to the subgrade on gravity pipe below 54 in (24 and 48 in), select backfill with a 12 in select cap
  //   from 54 in (60 in); the City of Houston from 42 in (48 in takes select, 36 in CSS).
  // - Water under pavement bank sand (Q4) at 8 in, any jurisdiction; with one, from 24 in select (02317 §3.09.B).
  // - HDPE storm: flowable fill under pavement in every layer, CSS outside it (Q5).
  ...[
    ["q2-county-rcp24-paved", "storm", "rcp_c76_wall_b:24", { invertDepth: 8 }, "harris_county", true, "City of Houston, CSS bedding and embedment", ["utility_backfill|Cement-stabilized sand", "utility_bedding_pipe_zone|bedding:Cement-stabilized sand", "utility_bedding_pipe_zone|zone:Cement-stabilized sand"]],
    ["q2-county-rcp48-paved", "storm", "rcp_c76_wall_b:48", { invertDepth: 10 }, "harris_county", true, "City of Houston, CSS bedding and embedment", ["utility_backfill|Cement-stabilized sand", "utility_bedding_pipe_zone|bedding:Cement-stabilized sand", "utility_bedding_pipe_zone|zone:Cement-stabilized sand"]],
    ["q2-county-rcp60-paved", "storm", "rcp_c76_wall_b:60", { invertDepth: 12 }, "harris_county", true, "Harris County, CSS bedding and embedment; select under pavement from 54 in", ["utility_backfill|Select fill", "utility_bedding_pipe_zone|bedding:Cement-stabilized sand", "utility_bedding_pipe_zone|zone:Cement-stabilized sand"]],
    ["q2-city-rcp48-paved", "storm", "rcp_c76_wall_b:48", { invertDepth: 10 }, "city_of_houston", true, "City of Houston, CSS bedding and embedment; select under pavement from 42 in", ["utility_backfill|Select fill", "utility_bedding_pipe_zone|bedding:Cement-stabilized sand", "utility_bedding_pipe_zone|zone:Cement-stabilized sand"]],
    ["q2-city-rcp36-paved", "storm", "rcp_c76_wall_b:36", { invertDepth: 10 }, "city_of_houston", true, "City of Houston, CSS bedding and embedment", ["utility_backfill|Cement-stabilized sand", "utility_bedding_pipe_zone|bedding:Cement-stabilized sand", "utility_bedding_pipe_zone|zone:Cement-stabilized sand"]],
    ["q2-other-rcp60-paved", "storm", "rcp_c76_wall_b:60", { invertDepth: 12 }, null, true, "City of Houston, CSS bedding and embedment", ["utility_backfill|Cement-stabilized sand", "utility_bedding_pipe_zone|bedding:Cement-stabilized sand", "utility_bedding_pipe_zone|zone:Cement-stabilized sand"]],
    ["q4-county-water8-paved", "water", "pvc_c900_dr18:8", { cover: 4 }, "harris_county", true, "City of Houston, bank sand embedment (water, force main)", ["utility_backfill|Sand", "utility_bedding_pipe_zone|bedding:Sand", "utility_bedding_pipe_zone|zone:Sand"]],
    ["q2-city-water24-paved", "water", "di_c151_pc350:24", { cover: 5 }, "city_of_houston", true, "City of Houston, bank sand embedment; select under pavement from 24 in", ["utility_backfill|Select fill", "utility_bedding_pipe_zone|bedding:Sand", "utility_bedding_pipe_zone|zone:Sand"]],
    ["q5-county-hdpe24-paved", "storm", "hdpe_f2648_dual_wall:24", { invertDepth: 8 }, "harris_county", true, "City of Houston, flexible storm pipe: flowable fill under pavement, CSS outside", ["utility_backfill|CLSM (flowable fill)", "utility_bedding_pipe_zone|bedding:CLSM (flowable fill)", "utility_bedding_pipe_zone|zone:CLSM (flowable fill)"]],
    ["q5-county-hdpe24-unpaved", "storm", "hdpe_f2648_dual_wall:24", { invertDepth: 8 }, "harris_county", false, "City of Houston, flexible storm pipe: flowable fill under pavement, CSS outside", ["utility_backfill|Cement-stabilized sand", "utility_bedding_pipe_zone|bedding:Cement-stabilized sand", "utility_bedding_pipe_zone|zone:Cement-stabilized sand"]],
  ].map(([id, type, pipe, depth, jurisdiction, paved, title, fills]) => ({
    id,
    kind: "section-lines",
    type,
    pipe,
    ...depth,
    ...(paved ? { limitedWidth: true } : {}),
    ...(jurisdiction ? { settings: { jurisdiction } } : {}),
    section: { addons: [], layers: { v: 1, preset: "houston_css" } },
    // A select backfill is dug and placed (native); every other material is bought (imported).
    expect: { preset: "houston_css", title, fills: fills.map((x) => x + "|" + (x.endsWith("Select fill") ? "native" : "imported")) },
  })),
  // rerun-4 ((b) through the setting): force main with the project's section { force_main: houston_css } on an Auto run in
  //   Texas: the pressure variant, the figures of rerun-2, no flag (force main is not 30 TAC's in the code).
  {
    id: "rerun-houston-force-main-setting",
    kind: "section-lines",
    type: "force_main",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    state: "TX",
    settings: { sectionPresets: { force_main: "houston_css" } },
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    expect: {
      preset: "houston_css",
      title: "City of Houston, bank sand embedment (water, force main)",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|22.22",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|3.7",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.32",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|38.92",
      ],
      geoFlags: [],
    },
  },
  // rerun-5 ((b) Texas sanitary through the setting): 30 TAC laid over Houston: bedding max(6, 6 + (10.08 - 8.4)/2) = 6.84
  //   in; W max(36, 10.08 + 12) = 36 in; h 8 + 0.02 + 0.57 = 8.59. Bedding 3 x 0.57 - 0.0008 = 1.7092 -> 6.33; embedment
  //   as rerun-1 17.44; final 3 x (8.59 - 0.57 - 1.7) = 18.96 -> 70.22; excavation 3 x 8.59 = 25.77 -> 95.44. No flag.
  {
    id: "rerun-houston-sanitary-tx-setting",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    state: "TX",
    settings: { sectionPresets: { sanitary: "houston_css" } },
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    expect: {
      title: "City of Houston, CSS bedding and embedment, 30 TAC §217.54",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|70.22",
        "utility_bedding_pipe_zone|bedding:Cement-stabilized sand|imported|Pipe bedding, Cement-stabilized sand|6.33",
        "utility_bedding_pipe_zone|zone:Cement-stabilized sand|imported|Pipe zone, Cement-stabilized sand|17.44",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|95.44",
      ],
      geoFlags: [],
      attention: 0,
    },
  },
  // rerun-6 (N4, keeping D-1168): RCP 36 Wall B storm, Auto = C1479 Type 2, invert 10: sect-c1479-t2's CY (bedding 4.47,
  //   haunch 13.82, overfill 137.11, excavation 195.99) with the haunch in sand (it was #57), the bedding #57.
  {
    id: "rerun-c1479-t2-sand-haunch",
    kind: "section-lines",
    type: "storm",
    pipe: "rcp_c76_wall_b:36",
    invertDepth: 10,
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    expect: {
      preset: "c1479_t2",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|137.11",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|4.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|13.82",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|195.99",
      ],
    },
  },
  // rerun-7 (30 TAC): a hand-picked D2321 on a Texas sanitary run is kept (sect-d2321's figures: bedding 3.08, haunch 2.52 +
  //   embedment 7.15 = 9.67, final 63.15, excavation 77.35) and flagged for Needs attention: its 4 in bedding is under 6 +
  //   (10.08 - 8.4)/2 = 6.84 in, its embedment 6 in over the crown under 12 in; its 30 in width is over 10.08 + 12.
  {
    id: "rerun-tac-flag-picked-d2321",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    state: "TX",
    section: { addons: ["cctv"], layers: { v: 1, preset: "d2321" } },
    expect: {
      preset: "d2321",
      title: "ASTM D2321",
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|63.15",
        "utility_bedding_pipe_zone|bedding:#57 stone|imported|Pipe bedding, #57 stone|3.08",
        "utility_bedding_pipe_zone|zone:#57 stone|imported|Pipe zone, #57 stone|9.67",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|77.35",
      ],
      geoFlags: ["Below 30 TAC §217.54: bedding 4.00 in under the barrel, 6.84 in needed (6 in under the bell); embedment 6.00 in over the crown, 12 in needed. The section picked on this Texas sanitary run is kept as picked; tick 30 TAC §217.54 to raise it."],
      attention: 1,
    },
  },
  // rerun-8 (30 TAC, the control): the same run on Auto takes d2321_tx (5.27 / 14.30 / 58.52, 79.54) and no flag.
  {
    id: "rerun-tac-auto-no-flag",
    kind: "section-lines",
    type: "sanitary",
    pipe: SDR35_8,
    idIn: 7.92,
    invertDepth: 8,
    state: "TX",
    section: { addons: ["cctv"], layers: { v: 1, preset: "auto" } },
    expect: { preset: "d2321_tx", geoFlags: [], attention: 0 },
  },
  // rerun-9 (the project's backfill): a project backfill of Select fill (imported, 120 pcf) on an Auto C900 8 water run at 4
  //   ft cover (C605 Type 4 house: bedding 4 in, h 5.0875, W 24 in): bedding 2 x 0.3333 - 0.00064 -> 2.47; zone 3.057352 ->
  //   11.32; final 2 x (5.0875 - 2.0875) = 6.0 -> 22.22 in Select fill (not Native); excavation 2 x 5.0875 -> 37.69.
  {
    id: "rerun-project-backfill-honoured",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    settings: { backfill: { name: "Select fill", source: "imported", densityPcf: 120, compaction: null } },
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    expect: {
      preset: "c605_t4_house",
      linesSorted: [
        "utility_backfill|Select fill|imported|Trench backfill, Select fill|22.22",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.32",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
      ],
    },
  },
  // rerun-10 (CSS required under pavement): the same run in a street: the preset's paved CSS wins over the setting, from
  //   the embedment's top to 12 in below the surface: 2 x (4.0875 - 2.0875) = 4.0 -> 14.81 CSS.
  {
    id: "rerun-css-under-pavement-over-setting",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    limitedWidth: true,
    settings: { backfill: { name: "Select fill", source: "imported", densityPcf: 120, compaction: null } },
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    expect: {
      linesSorted: [
        "utility_backfill|Cement-stabilized sand|imported|Trench backfill, Cement-stabilized sand|14.81",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.32",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
      ],
    },
  },
  // rerun-11 (the run's edit over the setting): rerun-9 with the final backfill edited to Native on the run: Native 22.22.
  {
    id: "rerun-edit-over-project-backfill",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    settings: { backfill: { name: "Select fill", source: "imported", densityPcf: 120, compaction: null } },
    section: { addons: [], layers: { v: 1, preset: "auto", edits: { final: { material: "native" } } } },
    expect: {
      linesSorted: [
        "utility_backfill|Native|native|Trench backfill, Native|22.22",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|2.47",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.32",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|37.69",
      ],
    },
  },
  // rerun-12 (a run drawn before keeps today's path, the setting included): C900 8 water, no layers, project backfill Select
  //   fill: today's section (bedding 6 in sand 3.70, zone 11.34, backfill 22.22 in the project's Select fill, 38.92).
  {
    id: "rerun-legacy-unchanged",
    kind: "section-lines",
    type: "water",
    pipe: "pvc_c900_dr18:8",
    cover: 4,
    settings: { backfill: { name: "Select fill", source: "imported", densityPcf: 120, compaction: null } },
    section: { addons: [] },
    expect: {
      preset: "legacy",
      linesSorted: [
        "utility_backfill|Select fill|imported|Trench backfill, Select fill|22.22",
        "utility_bedding_pipe_zone|bedding:Sand|imported|Pipe bedding, Sand|3.7",
        "utility_bedding_pipe_zone|zone:Sand|imported|Pipe zone, Sand|11.34",
        "utility_trench_excavation|trench:Cemented, cut vertical|Trench excavation, Cemented, cut vertical|38.92",
      ],
      todayPath: true,
    },
  },
  // --- D-1285 Q7 (the founder's answer 4, 2026-11-15): vertical walls only where the trench is 4.5 ft deep or less (a
  // margin under OSHA 1926.652(a)(1)'s 5 ft); deeper, the normal rule (sloped on an open site, a box where the width is
  // limited). Worked by hand before the change. 100 LF at G = 100, Type B clay with no bores (federal OSHA 1:1), the
  // section-lines drive. C900 6 DR 18: OD 6.90 in (0.575 ft), ID 6.134. Auto = AWWA C605 Type 4 house: bedding max(OD/8
  // = 0.8625, 4) = 4 in (0.333333 ft); W = OD + 2 x 6 = 18.90 in -> the 24 in bucket, W 2 ft. h = cover + 0.575 + 0.333333.
  // Excavation = (W h + k h^2) x 100 / 27 (vertical: k 0).
  // q7-1: the 6 in force main at 4 ft cover (the rerun's case): h = 4.908333, over 4.5: sloped 1:1:
  //   2 x 4.908333 + 4.908333^2 = 9.816667 + 24.091736 = 33.908403 SF -> 125.59 CY (vertical before: 9.816667 -> 36.36).
  {
    id: "q7-force-main-6-at-4ft-sloped",
    kind: "section-lines",
    type: "force_main",
    pipe: "pvc_c900_dr18:6",
    cover: 4,
    protection: "auto",
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    expect: {
      preset: "c605_t4_house",
      walls: "sloped 1",
      excavationCY: 125.59,
      autoNote: "Protection: sloped walls for the whole run (Auto: deepest 4.9 ft, over 4.5 ft, open site).",
    },
  },
  // q7-2: a 4.4 ft trench (cover 4.4 - 0.575 - 0.333333 = 3.491667): vertical, 2 x 4.4 = 8.8 SF -> 32.59 CY.
  {
    id: "q7-trench-4.4-vertical",
    kind: "section-lines",
    type: "force_main",
    pipe: "pvc_c900_dr18:6",
    cover: 4.4 - 6.9 / 12 - 4 / 12,
    protection: "auto",
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    expect: {
      walls: "vertical",
      excavationCY: 32.59,
      autoNote: "Protection: vertical walls, none needed for the whole run (Auto: deepest 4.4 ft, 4.5 ft or less, a margin under OSHA 1926.652(a)(1)'s 5 ft).",
    },
  },
  // q7-3: exactly 4.5 ft: still vertical, 2 x 4.5 = 9.0 SF -> 33.33 CY.
  {
    id: "q7-trench-4.5-vertical",
    kind: "section-lines",
    type: "force_main",
    pipe: "pvc_c900_dr18:6",
    cover: 4.5 - 6.9 / 12 - 4 / 12,
    protection: "auto",
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    expect: {
      walls: "vertical",
      excavationCY: 33.33,
      autoNote: "Protection: vertical walls, none needed for the whole run (Auto: deepest 4.5 ft, 4.5 ft or less, a margin under OSHA 1926.652(a)(1)'s 5 ft).",
    },
  },
  // q7-4: 4.6 ft: sloped 1:1, 2 x 4.6 + 4.6^2 = 9.2 + 21.16 = 30.36 SF -> 112.44 CY (vertical before: 9.2 -> 34.07).
  {
    id: "q7-trench-4.6-sloped",
    kind: "section-lines",
    type: "force_main",
    pipe: "pvc_c900_dr18:6",
    cover: 4.6 - 6.9 / 12 - 4 / 12,
    protection: "auto",
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    expect: {
      walls: "sloped 1",
      excavationCY: 112.44,
      autoNote: "Protection: sloped walls for the whole run (Auto: deepest 4.6 ft, over 4.5 ft, open site).",
    },
  },
  // q7-5: 4.6 ft with "Vertical" picked on the run: the rule holds for a pick too (vertical only to 4.5 ft), so sloped as
  //   q7-4: 112.44 CY. (Reading, founder away: as a vertical pick from 5 ft already was.)
  {
    id: "q7-trench-4.6-vertical-pick-sloped",
    kind: "section-lines",
    type: "force_main",
    pipe: "pvc_c900_dr18:6",
    cover: 4.6 - 6.9 / 12 - 4 / 12,
    protection: "vertical",
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    expect: { walls: "sloped 1", excavationCY: 112.44 },
  },
  // q7-6: 4.6 ft in a street ("Limited width"): over 4.5 ft, the normal rule's box (before: vertical under 5 ft).
  {
    id: "q7-trench-4.6-limited-box",
    kind: "section-lines",
    type: "force_main",
    pipe: "pvc_c900_dr18:6",
    cover: 4.6 - 6.9 / 12 - 4 / 12,
    protection: "auto",
    limitedWidth: true,
    section: { addons: [], layers: { v: 1, preset: "auto" } },
    expect: {
      walls: "box",
      autoNote: "Protection: trench box for the whole run (Auto: deepest 4.6 ft, over 4.5 ft, limited width).",
    },
  },
  // --- D-1296 (the founder's REPORT_2026-11-19 §1 answers, Q2, Q5, Q6) ----------------------------------------------
  // Q2: the backfill under pavement, an explicit choice (CSS to the subgrade / select fill / compacted native) on the run,
  // with the project's default by its jurisdiction preset: the City and Harris County keep the Houston preset's built rules
  // ("preset"), "other" takes compacted native. "Limited width / in street" only boxes the walls: under compacted native
  // and no paved restoration the run is unpaved (no 12 in cap). A run drawn before D-1296 keeps the section's own rule
  // (CSS on a legacy run, the preset's paved material on a layered one) unless the project sets a default.
  // Each: pick, cap (in), the final backfill under pavement (name|source), what a new run stores, a run after an old one.
  ...[
    ["d1296-paved-other-default", { type: "sanitary", pipe: "pvc_d3034_sdr35:8", limitedWidth: true }, ["native", 0, "Native|native"]],
    ["d1296-paved-county-default", { type: "sanitary", pipe: "pvc_d3034_sdr35:8", limitedWidth: true, jurisdiction: "harris_county", preset: "houston_css" }, ["preset", 12, "Cement-stabilized sand|imported"]],
    ["d1296-paved-city-rcp48-default", { type: "storm", pipe: "rcp_c76_wall_b:48", limitedWidth: true, jurisdiction: "city_of_houston", preset: "houston_css" }, ["preset", 12, "Select fill|native"]],
    ["d1296-paved-county-water8-default", { type: "water", pipe: "pvc_c900_dr18:8", limitedWidth: true, jurisdiction: "harris_county", preset: "houston_css" }, ["preset", 12, "Sand|imported"]],
    ["d1296-paved-other-css-on-run", { type: "water", pipe: "pvc_c900_dr18:8", limitedWidth: true, pick: "css" }, ["css", 12, "Cement-stabilized sand|imported"]],
    ["d1296-paved-other-select-on-run", { type: "sanitary", pipe: "pvc_d3034_sdr35:8", limitedWidth: true, pick: "select" }, ["select", 12, "Select fill|native"]],
    ["d1296-paved-county-native-on-run", { type: "sanitary", pipe: "pvc_d3034_sdr35:8", limitedWidth: true, jurisdiction: "harris_county", preset: "houston_css", pick: "native" }, ["native", 0, "Native|native"]],
    ["d1296-paved-project-css", { type: "sanitary", pipe: "pvc_d3034_sdr35:8", limitedWidth: true, projectPaved: "css" }, ["css", 12, "Cement-stabilized sand|imported"]],
    ["d1296-paved-other-asphalt-native", { type: "sanitary", pipe: "pvc_d3034_sdr35:8", restoration: { kind: "asphalt", width_ft: null } }, ["native", 12, "Native|native"]],
    ["d1296-paved-legacy-run-kept", { type: "sanitary", pipe: "pvc_d3034_sdr35:8", limitedWidth: true, legacy: true }, ["preset", 12, "Cement-stabilized sand|imported"]],
    ["d1296-paved-layered-before-kept", { type: "sanitary", pipe: "pvc_d3034_sdr35:8", limitedWidth: true, pick: null }, ["preset", 12, "Cement-stabilized sand|imported"]],
    ["d1296-paved-unpaved-css-pick", { type: "sanitary", pipe: "pvc_d3034_sdr35:8", pick: "css" }, ["css", 0, "Native|native"]],
  ].map(([id, c, [pick, capIn, backfill]]) => ({ id, kind: "d1296-paved", ...c, expect: { pick, capIn, backfill, newRun: "project", fromLast: "project" } })),
  // Q5 and Q6 (a): the fittings allowance by kind (water and force main 12 %, fire water 30 %, sanitary 2 %, storm RCP 0 %,
  // flexible storm, gas and conduit 5 %; a water service as water); the counted fittings' crew-hours on the run's pipe crew
  // (8 in and under 0.5, 10-16 in 1.0, over 16 in 2.0; A22's work, grade D); the fire line's default pipe C900 DR 14 (Q6 b).
  // Q6 (d): a fire run's free (building) end, one a run: F1 comes off the main (its start on W) and ends free; F2 has
  // both ends free (the main not drawn) and counts one; F3 ends at an assembly (a PIV's mark), none.
  {
    id: "d1296-fittings-allowance-hours",
    kind: "d1296-fittings",
    lines: [["water", "pvc_c900"], ["fire_water", "pvc_c900"], ["force_main", "ductile_iron"], ["sanitary", "pvc_sewer"], ["storm", "rcp_c76"], ["storm", "hdpe_dual_wall"], ["gas", "pe_gas"], ["electric", "conduit"], ["telecom", "conduit"], ["water_service", "pe_cts"]],
    sizes: [4, 6, 8, 10, 12, 16, 18, 24],
    runs: [
      { id: "W", path: [[0, 0], [200, 0]] },
      { id: "F1", fire: true, path: [[100, 0], [100, 80]] },
      { id: "F2", fire: true, path: [[300, 0], [300, 50]] },
      { id: "F3", fire: true, path: [[120, 0], [150, 80]] },
    ],
    marks: [{ x: 150, y: 80, r: 5 }],
    expect: {
      allowance: { "water:pvc_c900": 12, "fire_water:pvc_c900": 30, "force_main:ductile_iron": 12, "sanitary:pvc_sewer": 2, "storm:rcp_c76": 0, "storm:hdpe_dual_wall": 5, "gas:pe_gas": 5, "electric:conduit": 5, "telecom:conduit": 5, "water_service:pe_cts": 12 },
      hours: { 4: 0.5, 6: 0.5, 8: 0.5, 10: 1, 12: 1, 16: 1, 18: 2, 24: 2 },
      freeEnds: "F1x1 F2x1",
      firePipe: "pvc_c900_dr14:8",
    },
  },
  // Q6 (d): the PIV is its gate valve (priced) and its indicator post; the FDC its yard connection; backflow 8 in reads
  // Quote needed, with its enclosure; 6 in keeps its public-bid installed price and buys a vault. Neither the PIV nor the
  // FDC is a "no price" type now: what is unpriced says Quote needed on its own part.
  { id: "d1296-piv-parts", kind: "d1296-fittings", structure: "piv", spec: { valveSizeIn: 8 }, expect: { parts: ['valve:gate:8|PIV valve, gate, 8"', "piv:post|Indicator post, adjustable, for the PIV: Quote needed"], noPrice: false } },
  { id: "d1296-fdc-parts", kind: "d1296-fittings", structure: "fdc", spec: { valveSizeIn: 4 }, expect: { parts: ['fdc:yard:4|Fire department connection, yard, 2-1/2 x 2-1/2 x 4" with check valve and ball drip: Quote needed'], noPrice: false } },
  { id: "d1296-backflow-8-enclosure", kind: "d1296-fittings", structure: "backflow", spec: { valveSizeIn: 8, housing: "enclosure" }, expect: { parts: ['struct:backflow:8:installed|Backflow preventer, 8", installed: Quote needed (no public price found, D-1296)', 'backflow:enclosure:8|Backflow enclosure, insulated, on its pad, 8": Quote needed'], noPrice: false } },
  { id: "d1296-backflow-6-vault", kind: "d1296-fittings", structure: "backflow", spec: { valveSizeIn: 6, housing: "vault" }, expect: { parts: ['struct:backflow:6:installed|Backflow preventer, 6", installed (public bids)', 'backflow:vault:6|Backflow vault, precast, 6": Quote needed'], noPrice: false } },
  // Q6 (a, c, d) through the lines: a new 150 LF fire line on its default C900 DR 14 8 in with its add-ons (tracer, tape,
  // test): no bend, so 30 %; the test and flush one a system (1 EA, not $2.25/LF: no addon:test_disinfect line); its free
  // building end a riser / lead-in spool, Quote needed.
  {
    id: "d1296-fire-line-plain",
    kind: "type-lines",
    type: "fire_water",
    label: '8" PVC C900 DR 14',
    lf: 150,
    freeEnds: 1,
    expect: {
      pipe: "pvc_c900_dr14:8",
      addons: "tracer tape test_disinfect",
      keys: "pipe:pvc_c900_dr14:8 fit:pipe:pvc_c900_dr14:8 tracer_wire warning_tape test:fire_nfpa24 spool:fire_riser:8",
      "fit:pipe:pvc_c900_dr14:8:pct": 30,
      "fit:pipe:pvc_c900_dr14:8:name": "Fittings allowance, 30 %",
      "test:fire_nfpa24:qty": "1",
      "test:fire_nfpa24:unit": "EA",
      "test:fire_nfpa24:name": "Hydrostatic test (NFPA 24, 200 psi for 2 h) and flush, a system",
      "spool:fire_riser:8:qty": "1",
      "spool:fire_riser:8:name": 'Riser / lead-in spool, 8" (flanged, at the building end): Quote needed',
    },
  },
  // The same line with two drawn 45s: its fittings counted, so 0 %; the bends and their restraint sets bought.
  {
    id: "d1296-fire-line-counted",
    kind: "type-lines",
    type: "fire_water",
    label: '8" PVC C900 DR 14',
    lf: 150,
    freeEnds: 1,
    bends: [{ angle: 45, count: 2 }],
    expect: {
      keys: "pipe:pvc_c900_dr14:8 fit:pipe:pvc_c900_dr14:8 tracer_wire warning_tape test:fire_nfpa24 spool:fire_riser:8 bend:pvc_c900:45:8 restraint:pvc_c900:8",
      "fit:pipe:pvc_c900_dr14:8:pct": 0,
      "fit:pipe:pvc_c900_dr14:8:name": "Fittings allowance, 0 % (fittings counted on this line)",
      "bend:pvc_c900:45:8:qty": "2",
    },
  },
  // A ductile iron fire line (the option, Q6 b): its own key, 30 %, the same test.
  {
    id: "d1296-fire-line-di",
    kind: "type-lines",
    type: "fire_water",
    label: '8" Ductile Iron PC 350',
    lf: 150,
    run: { catalog_key: "di_c151_pc350:8", nominal_in: 8 },
    expect: { "fit:pipe:di_c151_pc350:8:pct": 30, "test:fire_nfpa24:qty": "1" },
  },
  // Q5: a new sanitary main at 2 %, a new storm RCP main at 0 % (its name says why), a water main at 12 % keeps its
  // per-LF test and disinfection (only fire lines test once a system).
  {
    id: "d1296-sanitary-2",
    kind: "type-lines",
    type: "sanitary",
    label: '8" PVC SDR-35',
    lf: 100,
    expect: { "fit:pipe:pvc_d3034_sdr35:8:pct": 2, "fit:pipe:pvc_d3034_sdr35:8:name": "Fittings allowance, 2 %" },
  },
  {
    id: "d1296-storm-rcp-0",
    kind: "type-lines",
    type: "storm",
    label: '18" RCP Wall B',
    lf: 100,
    expect: { "fit:pipe:rcp_c76_wall_b:18:pct": 0, "fit:pipe:rcp_c76_wall_b:18:name": "Fittings allowance, 0 % (storm RCP: joints priced as gaskets, junctions at structures)" },
  },
  {
    id: "d1296-water-12-test-per-lf",
    kind: "type-lines",
    type: "water",
    label: '8" PVC C900 DR 18',
    lf: 200,
    expect: { "fit:pipe:pvc_c900_dr18:8:pct": 12, "addon:test_disinfect:qty": "QTY" },
  },
  // --- D-1301: the plan's pipe at its true width, and the depth guard -------------------------------------------------
  // The cause: D-826 drew a run's pipe at its OD over the page's width in feet, (width_pt || 1) x feet per pt. On a reopen
  // where the scale, the items and the runs arrive before the sheet list, the width is not yet known and was read as 1 pt:
  // `before` is that share of the page's width (a 6 in pipe 1.88 pages wide, a disc round the run). `share` is the fix's:
  // none without the page's width or a scale, none past 0.25 of the page.
  { id: "d1301-pipe-share-no-page-width", kind: "d1301-share", odIn: 6.275, widthPt: 0, feetPerPt: 20 / 72, expect: { share: "none", before: 1.8825 } },
  { id: "d1301-pipe-share-36in-sheet", kind: "d1301-share", odIn: 6.275, widthPt: 2592, feetPerPt: 20 / 72, expect: { share: 0.000726, before: 0.000726 } },
  { id: "d1301-pipe-share-bench-ss1", kind: "d1301-share", odIn: 9.1, widthPt: 0, feetPerPt: 30 / 72, expect: { share: "none", before: 1.82 } },
  { id: "d1301-pipe-share-bench-ss1-loaded", kind: "d1301-share", odIn: 9.1, widthPt: 2448, feetPerPt: 30 / 72, expect: { share: 0.000743, before: 0.000743 } },
  { id: "d1301-pipe-share-past-max", kind: "d1301-share", odIn: 240, widthPt: 216, feetPerPt: 20 / 72, expect: { share: "none", before: 0.333333 } },
  { id: "d1301-pipe-share-no-scale", kind: "d1301-share", odIn: 6.275, widthPt: 2592, feetPerPt: 0, expect: { share: "none", before: "none" } },
  // The guard: ST-1's look-alike (6 in SDR-35, start invert 668.52 at 1 %, 49.9 LF, about 3.5 ft deep) is drawn; an invert
  // read as 0 under 671 ft ground is past 40 ft: "Check depth", no band; a ground read as 0 under 668 ft inverts leaves no
  // depth at all (the trench cannot widen from it); 41.5 ft is past the limit, 39 ft is not.
  { id: "d1301-st1-lookalike", kind: "d1301-depth", odIn: 6.275, idIn: 5.915, length: 49.9, ground: [671.5, 671.0], inverts: [668.52, 668.021], layers: [ASSUMED_C], expect: { flag: "none", bands: 1 } },
  { id: "d1301-invert-read-as-zero", kind: "d1301-depth", odIn: 6.275, idIn: 5.915, length: 49.9, ground: [671.5, 671.0], inverts: [0, 0], layers: [ASSUMED_C], expect: { flag: "Check depth", bands: 0 } },
  { id: "d1301-ground-read-as-zero", kind: "d1301-depth", odIn: 6.275, idIn: 5.915, length: 49.9, ground: [0, 0], inverts: [668.52, 668.021], layers: [ASSUMED_C], expect: { flag: "none", bands: 1 } },
  { id: "d1301-depth-41ft", kind: "d1301-depth", odIn: 6.275, idIn: 5.915, length: 100, ground: [700, 700], inverts: [659, 659], layers: [ASSUMED_C], expect: { flag: "Check depth" } },
  { id: "d1301-depth-39ft", kind: "d1301-depth", odIn: 6.275, idIn: 5.915, length: 100, ground: [700, 700], inverts: [661.5, 661.5], layers: [ASSUMED_C], expect: { flag: "none" } },
  // D-1303 (1): the guard per stretch. Open cut: 40 ft deep and 150 ft wide at the top; bored or drilled (jack and bore,
  // HDD, a sleeve): 100 ft deep, no width. Bored over the whole run: 99 ft worked, 101 ft "Check depth", and at 60 ft its
  // trench-section top past 150 ft is ignored where the same run open cut is "Check depth". A mixed run, open 0+00 to
  // 0+50 then bored 0+50 to 1+00 at 80 ft: open at 30 ft is worked; open at 45 ft is "Check depth" on the open stretch.
  // D-1311 (Q17): a part-bored run is bored at its crossing's own stations (`section.crossing.from_ft`, then `lf` on), pits
  // or none; it was bored over its deepest LF with no pits placed (D-1303). The part-bored row now gives its stations
  // (0+50 to 1+00, the deepest LF too, so the same answer); bored 0+00 to 0+50 instead leaves the 80 ft stretch open cut
  // ("Check depth" there, where the deepest LF read it as bored); a length stored with no stations reads from the start,
  // flagged.
  { id: "d1303-trenchless-99ft", kind: "d1301-depth", trenchless: true, protection: "sloped", odIn: 6.275, idIn: 5.915, length: 100, ground: [700, 700], inverts: [601.6, 601.6], layers: [ASSUMED_C], expect: { flag: "none", over100: false, over150: true } },
  { id: "d1303-trenchless-101ft", kind: "d1301-depth", trenchless: true, protection: "sloped", odIn: 6.275, idIn: 5.915, length: 100, ground: [700, 700], inverts: [599, 599], layers: [ASSUMED_C], expect: { flag: "Check depth", over100: true, stretch: "bored 0-100" } },
  { id: "d1303-trenchless-60ft-wide", kind: "d1301-depth", trenchless: true, protection: "sloped", odIn: 6.275, idIn: 5.915, length: 100, ground: [700, 700], inverts: [640.6, 640.6], layers: [ASSUMED_C], expect: { flag: "none", over150: true } },
  { id: "d1303-open-60ft-wide", kind: "d1301-depth", protection: "sloped", odIn: 6.275, idIn: 5.915, length: 100, ground: [700, 700], inverts: [640.6, 640.6], layers: [ASSUMED_C], expect: { flag: "Check depth", over150: true, stretch: "open 0-100" } },
  { id: "d1303-mixed-open30-bored80", kind: "d1301-depth", odIn: 6.275, idIn: 5.915, profile: [[0, 700, 670.5], [50, 700, 670.5], [50, 700, 620.5], [100, 700, 620.5]], bored: [[50, 100]], layers: [ASSUMED_C], expect: { flag: "none", stretch: "none" } },
  { id: "d1303-mixed-open45-bored80", kind: "d1301-depth", odIn: 6.275, idIn: 5.915, profile: [[0, 700, 655.5], [50, 700, 655.5], [50, 700, 620.5], [100, 700, 620.5]], bored: [[50, 100]], layers: [ASSUMED_C], expect: { flag: "Check depth", stretch: "open 0-50" } },
  { id: "d1303-part-bored-no-pits", kind: "d1301-depth", odIn: 6.275, idIn: 5.915, profile: [[0, 700, 670.5], [50, 700, 670.5], [50, 700, 620.5], [100, 700, 620.5]], crossing: { kind: "jack_bore", lf: 50, from_ft: 50 }, layers: [ASSUMED_C], expect: { flag: "none", boredAt: "50-100", crossingFlags: "none" } },
  { id: "d1311-part-bored-own-stations", kind: "d1301-depth", odIn: 6.275, idIn: 5.915, profile: [[0, 700, 670.5], [50, 700, 670.5], [50, 700, 620.5], [100, 700, 620.5]], crossing: { kind: "jack_bore", lf: 50, from_ft: 0 }, layers: [ASSUMED_C], expect: { flag: "Check depth", stretch: "open 50-100", boredAt: "0-50", crossingFlags: "none" } },
  { id: "d1311-part-bored-no-stations", kind: "d1301-depth", odIn: 6.275, idIn: 5.915, profile: [[0, 700, 670.5], [50, 700, 670.5], [50, 700, 620.5], [100, 700, 620.5]], crossing: { kind: "jack_bore", lf: 50 }, layers: [ASSUMED_C], expect: { flag: "Check depth", stretch: "open 50-100", boredAt: "0-50", crossingFlags: "Bored length has no stations: read from the run's start; set From in Encasement / casing" } },
  // D-1311 (Q16): bore and receiving pits (12 x 32 and 10 x 10 ft, shored) against the pit limit: past 40 ft "Check depth"
  // (not dug, drawn or priced), as other pits; past 20 ft the PE note (OSHA 1926.652(b)(4), (c)(4)). D-1303's smoke had
  // them 64 ft deep under a 61 ft bore.
  { id: "d1311-bore-pit-45ft", kind: "d1311-pit", pit: "bore_pit", depthFt: 45, expect: { flag: "Check depth", note: "none" } },
  { id: "d1311-bore-pit-64ft", kind: "d1311-pit", pit: "bore_pit", depthFt: 64, expect: { flag: "Check depth", note: "none" } },
  { id: "d1311-receiving-pit-40ft", kind: "d1311-pit", pit: "receiving_pit", depthFt: 40, expect: { flag: "none", note: "Over 20 ft deep", shoring: "sheet_pile" } },
  { id: "d1311-receiving-pit-40.5ft", kind: "d1311-pit", pit: "receiving_pit", depthFt: 40.5, expect: { flag: "Check depth", note: "none" } },
  { id: "d1311-receiving-pit-25ft", kind: "d1311-pit", pit: "receiving_pit", depthFt: 25, expect: { flag: "none", note: "Over 20 ft deep", shoring: "sheet_pile" } },
  { id: "d1311-bore-pit-20ft", kind: "d1311-pit", pit: "bore_pit", depthFt: 20, expect: { flag: "none", note: "none", shoring: "slide_rail" } },
  // D-1311 (Q17): "Bore pits not placed" on a jack and bore (a sleeve too) short of its bore pit, its receiving pit or
  // both, by the pits linked to it; its stations never depend on them. HDD's entry and exit pits are its subcontract's
  // lump sum: no flag. Needs attention names it on the run's pipe line.
  { id: "d1311-pits-none", kind: "d1311-pits-flag", crossing: { kind: "jack_bore" }, linked: [], expect: { flag: "Bore pits not placed: add a bore pit and a receiving pit (Encasement / casing)", attention: true } },
  { id: "d1311-pits-no-receiving", kind: "d1311-pits-flag", crossing: { kind: "jack_bore", lf: 40, from_ft: 30 }, linked: ["bore_pit"], expect: { flag: "Bore pits not placed: add a receiving pit (Structures)", attention: true } },
  { id: "d1311-pits-no-bore", kind: "d1311-pits-flag", crossing: { kind: "jack_bore" }, linked: ["receiving_pit"], expect: { flag: "Bore pits not placed: add a bore pit (Structures)", attention: true } },
  { id: "d1311-pits-both", kind: "d1311-pits-flag", crossing: { kind: "jack_bore", lf: 40, from_ft: 30 }, linked: ["bore_pit", "receiving_pit"], expect: { flag: "none", attention: false } },
  { id: "d1311-pits-hdd", kind: "d1311-pits-flag", crossing: { kind: "hdd" }, linked: [], expect: { flag: "none", attention: false } },
  { id: "d1311-pits-sleeve", kind: "d1311-pits-flag", type: "casing", catalogKey: "steel_casing_375:16", crossing: {}, linked: ["bore_pit"], expect: { flag: "Bore pits not placed: add a receiving pit (Structures)", attention: true } },
  // D-1319 (Q7): a bored length worked at its own stations, not D-1269's average section. A 100 ft run in a 6 ft box,
  // its trench 6 ft deep at 0+00 to 16 ft at 1+00 (6 x 11 x 100 = 6,600 CF = 244.44 CY). Bored 40 LF:
  // - at 0+00 to 0+40 (the shallow end): the open 0+40 to 1+00, 10 to 16 ft: 6 x 13 x 60 = 4,680 CF = 173.33 CY;
  // - at 0+60 to 1+00 (the deep end): the open 0+00 to 0+60, 6 to 12 ft: 6 x 9 x 60 = 3,240 CF = 120.00 CY;
  // - at 0+30 to 0+70 (the middle): 6 x 7.5 x 30 + 6 x 14.5 x 30 = 1,350 + 2,610 = 3,960 CF = 146.67 CY, the average;
  // the average section was 6,600 x 0.6 = 3,960 CF = 146.67 CY for all three. On level ground (8 ft) both agree,
  // 6 x 8 x 60 = 2,880 CF = 106.67 CY. The pipe stays 100 LF; the trench (and its box) is the 60 open LF.
  { id: "d1319-bored-shallow-end", kind: "d1319-stations", profile: [[0, 6], [100, 16]], crossing: { kind: "jack_bore", lf: 40, from_ft: 0 }, expect: { wholeCY: 244.44, averageCY: 146.67, stationsCY: 173.33, trenchLf: 60, pipeLf: 100, stations: "0-40", openPieces: "40-100" } },
  { id: "d1319-bored-deep-end", kind: "d1319-stations", profile: [[0, 6], [100, 16]], crossing: { kind: "jack_bore", lf: 40, from_ft: 60 }, expect: { averageCY: 146.67, stationsCY: 120, trenchLf: 60, pipeLf: 100, stations: "60-100", openPieces: "0-60" } },
  { id: "d1319-bored-middle", kind: "d1319-stations", profile: [[0, 6], [100, 16]], crossing: { kind: "hdd", lf: 40, from_ft: 30 }, expect: { averageCY: 146.67, stationsCY: 146.67, trenchLf: 60, pipeLf: 100, stations: "30-70", openPieces: "0-30,70-100" } },
  // A run drawn the other way (its start at the deep end): its stations run from its own start, so boring 0+00 to 0+40
  // bores the deep end, the open 0+40 to 1+00 at 12 to 6 ft: 6 x 9 x 60 = 3,240 CF = 120.00 CY; boring 0+60 to 1+00
  // bores the shallow end, the open 0+00 to 0+60 at 16 to 10 ft: 6 x 13 x 60 = 4,680 CF = 173.33 CY (the mirror of the
  // rows above).
  { id: "d1319-reverse-bored-deep-start", kind: "d1319-stations", profile: [[0, 16], [100, 6]], crossing: { kind: "jack_bore", lf: 40, from_ft: 0 }, expect: { wholeCY: 244.44, averageCY: 146.67, stationsCY: 120, trenchLf: 60, stations: "0-40", openPieces: "40-100" } },
  { id: "d1319-reverse-bored-shallow-end", kind: "d1319-stations", profile: [[0, 16], [100, 6]], crossing: { kind: "jack_bore", lf: 40, from_ft: 60 }, expect: { averageCY: 146.67, stationsCY: 173.33, trenchLf: 60, stations: "60-100", openPieces: "0-60" } },
  // D-1323 (D-1321 6): a part-bored run takes the protection rule a run not bored takes along its length: Auto, one
  // method for the run by its deepest point (D-1080: vertical walls to 4.5 ft, deeper sloped on an open site, a box where
  // the width is limited), the deepest of its dug length. Open 0+00 to 0+40 at 4 ft and 0+60 to 1+00 at 10 ft: sloped on
  // both (each part on its own read 4 ft as vertical); all at 4 ft: vertical.
  { id: "d1323-part-bored-auto-one-method", kind: "d1319-stations", protection: "auto", profile: [[0, 4], [40, 4], [60, 10], [100, 10]], crossing: { kind: "jack_bore", lf: 20, from_ft: 40 }, expect: { methods: "sloped", trenchLf: 80, openPieces: "0-40,60-100" } },
  { id: "d1323-part-bored-auto-shallow", kind: "d1319-stations", protection: "auto", profile: [[0, 4], [100, 4]], crossing: { kind: "jack_bore", lf: 20, from_ft: 40 }, expect: { methods: "vertical", trenchLf: 80 } },
  // D-1323 (D-1321 8, the founder's priority): the pits at the bored stretch's From and To, each dug to the casing's
  // bottom + 1.5 ft there. 8 in C900 DR 18 (ID 8.0444 in) in a 16 in casing; ground 100, the invert 70 at 0+00 to 90 at
  // 3+00. Depth = ground - invert - 8.0444 / 24 + 16 / 24 + 1.5 = ground - invert + 1.8315.
  // - bored 1+50 to 2+50: the bore pit at 1+50 (invert 80) 21.83 ft, the receiving pit at 2+50 (invert 86.67) 15.16 ft;
  // - bored 0+00 to 1+00: 31.83 ft at 0+00, 25.16 ft at 1+00 (invert 76.67);
  // - bored over the whole run: 31.83 ft at 0+00, 11.83 ft at 3+00.
  { id: "d1323-pits-at-stretch-150-250", kind: "d1323-pit-station", length: 300, inverts: [70, 90], crossing: { kind: "jack_bore", lf: 100, from_ft: 150 }, expect: { boreAt: 150, boreFt: 21.83, receivingAt: 250, receivingFt: 15.16 } },
  { id: "d1323-pits-at-stretch-0-100", kind: "d1323-pit-station", length: 300, inverts: [70, 90], crossing: { kind: "jack_bore", lf: 100, from_ft: 0 }, expect: { boreAt: 0, boreFt: 31.83, receivingAt: 100, receivingFt: 25.16 } },
  { id: "d1323-pits-at-run-ends", kind: "d1323-pit-station", length: 300, inverts: [70, 90], crossing: { kind: "jack_bore" }, expect: { boreAt: 0, boreFt: 31.83, receivingAt: 300, receivingFt: 11.83 } },
  // D-1323 (D-1321 5): one PE-designed protective system a run covers its trench AND its structures; a structure past
  // 20 ft gets its own only when none of its runs' trenches has one (D-1144's line: a box past 20 ft).
  { id: "d1323-pe-trench-covers-manhole", kind: "d1323-pe-plan", runs: [{ id: "R", bands: [{ method: "box", maxDepthFt: 22 }] }], items: [{ key: "MH", runs: ["R"], depthFt: 25, bySub: false }], expect: { runsWithPe: "R", ownLines: "none" } },
  { id: "d1323-pe-manhole-own-line", kind: "d1323-pe-plan", runs: [{ id: "R", bands: [{ method: "box", maxDepthFt: 15 }] }], items: [{ key: "MH", runs: ["R"], depthFt: 25, bySub: false }], expect: { runsWithPe: "none", ownLines: "0" } },
  { id: "d1323-pe-manhole-shared-covered", kind: "d1323-pe-plan", runs: [{ id: "R1", bands: [{ method: "box", maxDepthFt: 22 }] }, { id: "R2", bands: [{ method: "box", maxDepthFt: 10 }] }], items: [{ key: "MH", runs: ["R1", "R2"], depthFt: 25, bySub: false }], expect: { runsWithPe: "R1", ownLines: "none" } },
  { id: "d1323-pe-manhole-by-others", kind: "d1323-pe-plan", runs: [{ id: "R", bands: [{ method: "box", maxDepthFt: 15 }] }], items: [{ key: "MH", runs: ["R"], depthFt: 25, bySub: true }], expect: { ownLines: "none" } },
  { id: "d1323-pe-crossing-covered-by-trench", kind: "d1323-pe-plan", runs: [{ id: "R", bands: [{ method: "box", maxDepthFt: 22 }] }], items: [{ key: "R", runs: ["R"], depthFt: 35, bySub: false }, { key: "R", runs: ["R"], depthFt: 25, bySub: false }], expect: { ownLines: "none" } },
  { id: "d1323-pe-crossing-own-line", kind: "d1323-pe-plan", runs: [{ id: "R", bands: [{ method: "sloped", maxDepthFt: 12 }] }], items: [{ key: "R", runs: ["R"], depthFt: 35, bySub: false }, { key: "R", runs: ["R"], depthFt: 25, bySub: false }], expect: { runsWithPe: "none", ownLines: "0" } },
  // D-1332 (D-1328.1, OSHA 1926.652(b)(4), (c)): one PE-designed protective system a run when the trench is over 20 ft
  // deep (a piece's deepest h, the depth its protection is chosen from) and it is sloped, benched, or boxed past the
  // box's tabulated depth (D-1144's stated 20 ft stands in for every box); a box within it gets no PE line and its line
  // the note "within manufacturer's tabulated data (20 ft assumed: confirm against the box's tabulated data)". 8 in
  // SDR-35 in Type B clay, the invert 22 ft down (the trench 22.52 ft), 15 ft (15.52 ft) or 19 ft (19.52 ft).
  { id: "d1332-sloped-over-20", kind: "d1332-pe-lines", runs: [{ protection: "sloped", invertFt: [22, 22] }], expect: { pe: 1, peName: "PE-designed protective system (OSHA 1926.652), trench deeper than 20 ft", protection: "none", walls: "sloped", deepest: "22.52", over20: "true" } },
  { id: "d1332-benched-over-20", kind: "d1332-pe-lines", runs: [{ protection: "benched", invertFt: [22, 22] }], expect: { pe: 1, protection: "none", walls: "benched", deepest: "22.52", over20: "true" } },
  { id: "d1332-box-past-tabulated", kind: "d1332-pe-lines", runs: [{ protection: "box", invertFt: [22, 22] }], expect: { pe: 1, protection: "box|0|16+ ft=cleared", walls: "box", deepest: "22.52", over20: "true" } },
  { id: "d1332-box-within-tabulated", kind: "d1332-pe-lines", runs: [{ protection: "box", invertFt: [15, 15] }], expect: { pe: 0, peName: "none", protection: "box|0|14–16 ft=within manufacturer's tabulated data (20 ft assumed: confirm against the box's tabulated data)", walls: "box", deepest: "15.52", over20: "false" } },
  { id: "d1332-box-within-19.52", kind: "d1332-pe-lines", runs: [{ protection: "box", invertFt: [19, 19] }], expect: { pe: 0, protection: "box|0|16+ ft=within manufacturer's tabulated data (20 ft assumed: confirm against the box's tabulated data)", deepest: "19.52", over20: "false" } },
  { id: "d1332-sloped-under-20", kind: "d1332-pe-lines", runs: [{ protection: "sloped", invertFt: [15, 15] }], expect: { pe: 0, protection: "none", walls: "sloped", deepest: "15.52", over20: "false" } },
  { id: "d1332-benched-under-20", kind: "d1332-pe-lines", runs: [{ protection: "benched", invertFt: [15, 15] }], expect: { pe: 0, walls: "benched", deepest: "15.52", over20: "false" } },
  // One a run: a box run from 12 to 26 ft has one PE line, and every band of its box line is cleared (the run's box goes
  // past); a sloped run the same; two deep runs of a type, two; a 16+ ft box line shared by a run at 17.52 ft and one at
  // 22.52 ft is cleared (one run uses it past), with one PE line.
  { id: "d1332-box-12-to-26-one-line", kind: "d1332-pe-lines", runs: [{ protection: "box", invertFt: [12, 26] }], expect: { pe: 1, protection: "box|0|12–14 ft=cleared | box|0|14–16 ft=cleared | box|0|16+ ft=cleared", deepest: "26.52", over20: "true" } },
  { id: "d1332-sloped-12-to-26-one-line", kind: "d1332-pe-lines", runs: [{ protection: "sloped", invertFt: [12, 26] }], expect: { pe: 1, protection: "none", deepest: "26.52" } },
  { id: "d1332-two-deep-runs-two-lines", kind: "d1332-pe-lines", runs: [{ protection: "sloped", invertFt: [22, 22] }, { protection: "box", invertFt: [23, 23] }], expect: { pe: 2, protection: "box|0|16+ ft=cleared", walls: "sloped box", deepest: "22.52 23.52", over20: "true true" } },
  { id: "d1332-box-band-shared", kind: "d1332-pe-lines", runs: [{ protection: "box", invertFt: [17, 17] }, { protection: "box", invertFt: [22, 22] }], expect: { pe: 1, protection: "box|0|16+ ft=cleared", deepest: "17.52 22.52", over20: "false true" } },
  // D-1332 with D-1323 (D-1321 5): the run's one PE line covers its structures and its crossing's pits, so a structure
  // past 20 ft on a sloped or benched run over 20 ft loses its own line; 20.0 ft is not over; vertical walls (stable rock)
  // get none.
  { id: "d1332-pe-sloped-covers-manhole", kind: "d1323-pe-plan", runs: [{ id: "R", bands: [{ method: "sloped", maxDepthFt: 22.52 }] }], items: [{ key: "MH", runs: ["R"], depthFt: 25, bySub: false }], expect: { runsWithPe: "R", ownLines: "none" } },
  { id: "d1332-pe-benched-covers-pits", kind: "d1323-pe-plan", runs: [{ id: "R", bands: [{ method: "benched", maxDepthFt: 22.52 }] }], items: [{ key: "R", runs: ["R"], depthFt: 35, bySub: false }, { key: "R", runs: ["R"], depthFt: 25, bySub: false }], expect: { runsWithPe: "R", ownLines: "none" } },
  { id: "d1332-pe-sloped-at-20", kind: "d1323-pe-plan", runs: [{ id: "R", bands: [{ method: "sloped", maxDepthFt: 20 }] }], items: [{ key: "MH", runs: ["R"], depthFt: 25, bySub: false }], expect: { runsWithPe: "none", ownLines: "0" } },
  { id: "d1332-pe-vertical-rock", kind: "d1323-pe-plan", runs: [{ id: "R", bands: [{ method: "vertical", maxDepthFt: 25 }] }], items: [{ key: "MH", runs: ["R"], depthFt: 25, bySub: false }], expect: { runsWithPe: "none", ownLines: "0" } },
  { id: "d1332-pe-box-within-manhole-own", kind: "d1323-pe-plan", runs: [{ id: "R", bands: [{ method: "box", maxDepthFt: 19.52 }] }], items: [{ key: "MH", runs: ["R"], depthFt: 25, bySub: false }], expect: { runsWithPe: "none", ownLines: "0" } },
  // D-1319 (Q6, the founder's correction): one PE-designed protective system a crossing, covering its bore and receiving
  // pits together, when one of its self-performed pits is past 20 ft; it goes with the first such pit. A pit by the bore
  // sub is the sub's, its design too.
  { id: "d1319-pe-two-deep-pits", kind: "d1319-pe-crossing", pits: [{ key: "A", type: "bore_pit", depthFt: 35, bySub: false }, { key: "A", type: "receiving_pit", depthFt: 25, bySub: false }], expect: { peLines: 1, carriedBy: "0", variants: "pe_design|crossing" } },
  { id: "d1319-pe-one-deep-one-shallow", kind: "d1319-pe-crossing", pits: [{ key: "A", type: "bore_pit", depthFt: 12, bySub: false }, { key: "A", type: "receiving_pit", depthFt: 25, bySub: false }], expect: { peLines: 1, carriedBy: "1" } },
  { id: "d1319-pe-both-shallow", kind: "d1319-pe-crossing", pits: [{ key: "A", type: "bore_pit", depthFt: 20, bySub: false }, { key: "A", type: "receiving_pit", depthFt: 15, bySub: false }], expect: { peLines: 0, carriedBy: "", variants: "none" } },
  { id: "d1319-pe-deep-by-sub", kind: "d1319-pe-crossing", pits: [{ key: "A", type: "bore_pit", depthFt: 35, bySub: true }, { key: "A", type: "receiving_pit", depthFt: 15, bySub: false }], expect: { peLines: 0 } },
  { id: "d1319-pe-two-crossings", kind: "d1319-pe-crossing", pits: [{ key: "A", type: "bore_pit", depthFt: 35, bySub: false }, { key: "A", type: "receiving_pit", depthFt: 30, bySub: false }, { key: "B", type: "bore_pit", depthFt: 22, bySub: false }, { key: "B", type: "receiving_pit", depthFt: 10, bySub: false }], expect: { peLines: 2, carriedBy: "0,2" } },
  { id: "d1319-bored-level", kind: "d1319-stations", profile: [[0, 8], [100, 8]], crossing: { kind: "jack_bore", lf: 40, from_ft: 0 }, expect: { averageCY: 106.67, stationsCY: 106.67, trenchLf: 60, pipeLf: 100 } },
  // A result stored before the guard: a band 2,007 ft wide is never drawn; a 3 ft one is.
  { id: "d1301-stored-band-absurd", kind: "d1301-bands", path: [[0, 0], [49.9, 0]], stations: [[0, 1003.5, "sloped", 1.5], [49.9, 1003.5, "sloped", 1.5]], expect: { bands: 0 } },
  { id: "d1301-stored-band-sane", kind: "d1301-bands", path: [[0, 0], [49.9, 0]], stations: [[0, 1.5, "vertical", 0], [49.9, 1.5, "vertical", 0]], expect: { bands: 1 } },
];

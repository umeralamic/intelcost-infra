// F12's rows in the shared quantity table (D-78, D-136): the app's own lib/takeoff/earthwork
// on legacy's hand-worked fixtures (`earthwork/tin/__tests__/tin.test.ts`,
// `volume/__tests__/{volume,e4}.test.ts`, `__tests__/siteFeatures.test.ts`) and on the shrink
// rows of D-136 Q31, each against the answer worked by hand. Only the fields in `expect` are
// compared; numbers to 1e-9 relative.
//
// A run is { item, label, kind: "contour" | "spot_elevation" | "boundary", surface, elevation,
// points: [[x, y], …] } in fractions of the page, elevation in feet.
// Updated 2026-10-24 (D-768): Calculate's lines are named by their work, never their feature ("Cut", "Fill",
// "Strip topsoil (6\")"); the feature is the line's heading and Feature column. Every name expected below follows.

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

// F39 (D-1126, D-1131): one balance per job, by hand. Shrink 1.10, swell 1.25, native soil suitable. A has 1,000 BCY
// of cut and no fill; B 600 CCY of fill and no cut: B's fill takes 600 x 1.10 = 660 BCY of A's cut, the rest, 340 BCY,
// leaves as 340 x 1.25 = 425 LCY, no import. Both short (A 100 BCY cut, 300 CCY fill; B 200 CCY fill): one import of
// 500 x 1.10 - 100 = 450 BCY, 562.5 LCY. A with a muck layer (200 BCY at swell 1.30, unsuitable): it always leaves
// (260 LCY); the clay (800 BCY) yields 800 / 1.10 = 727.27 CCY against B's 600: 127.27 x 1.10 = 140 BCY, 175 LCY;
// A's Cut to export carries both, 340 BCY.
const JOB_A = { suitable: true, fillType: "Select Borrow", swell: 1.25, shrink: 1.1, choices: null };
const jobSheet = (key, cut, fill, site) => ({ key, label: key, inputs: { units: "CY", regions: [{ id: `pad${key}`, label: `Pad ${key}`, cutCY: cut, fillCY: fill }], assumptions: JOB_A, ...(site ? { site } : {}) } });
const SQ = (x, y, s = 100) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
export const JOB_CASES = [
  { id: "job-two-sheets", kind: "job", members: [jobSheet("A", 1000, 0), jobSheet("B", 0, 600)], expect: { "A:cut_export:padA": 340, "A:cut:padA": 660, "B:fill:padB": 600, "job:soil_export:": 425, "job:soil_import:": undefined } },
  { id: "job-both-short", kind: "job", members: [jobSheet("A", 100, 300), jobSheet("B", 0, 200)], expect: { "A:cut:padA": 100, "A:fill:padA": 300, "B:fill:padB": 200, "job:soil_import:": 562.5, "job:soil_export:": undefined } },
  {
    id: "job-unsuitable-layer",
    kind: "job",
    members: [jobSheet("A", 1000, 0, { layers: [{ regionId: "padA", layerId: "L1", name: "Clay", bank: 800, shrink: 1.1, swell: 1.25, kind: "suitable" }, { regionId: "padA", layerId: "L2", name: "Muck", bank: 200, shrink: 1.1, swell: 1.3, kind: "unsuitable" }] }), jobSheet("B", 0, 600)],
    expect: { "A:cut_export:padA": 340, "A:cut:padA": 660, "B:fill:padB": 600, "job:soil_export:": 175, "job:soil_export:unsuitable:Muck": 260 },
  },
  // One member (a sheet marked Separate job, or a project of one sheet): its lines exactly as today's.
  { id: "job-one-member-as-today", kind: "job", same: true, members: [jobSheet("A", 1000, 0)], expect: { same: true } },
  // Overlap (D-1131): C-4 covers 62 % of C-3 (squares 100 ft, 38 ft apart): left out; included, in; not registered, in.
  { id: "job-overlap-left-out", kind: "job", places: [{ key: "c3", label: "C-3", boundary: SQ(0, 0) }, { key: "c4", label: "C-4", boundary: SQ(38, 0) }], expect: { members: "c3", leftOut: "C-4 overlaps C-3 by 62%: left out of the job balance — include it or mark Separate job", unchecked: "" } },
  { id: "job-overlap-included", kind: "job", included: ["c4"], places: [{ key: "c3", label: "C-3", boundary: SQ(0, 0) }, { key: "c4", label: "C-4", boundary: SQ(38, 0) }], expect: { members: "c3 c4", leftOut: "" } },
  { id: "job-overlap-unregistered", kind: "job", places: [{ key: "c3", label: "C-3", boundary: SQ(0, 0) }, { key: "c4", label: "C-4", boundary: null }], expect: { members: "c3 c4", leftOut: "", unchecked: "c4" } },
  // Anchor (D-1131 c): the first member marked Separate job, the job's lines go to the next.
  { id: "job-anchor-moves", kind: "job", places: [{ key: "c1", label: "C-1", boundary: null, separate: true }, { key: "c2", label: "C-2", boundary: null }, { key: "c3", label: "C-3", boundary: null }], expect: { members: "c2 c3", anchor: "c2", separate: "c1" } },
  // D-1136 (D-1132 reverted): the import material is only the shortfall after cut fills fill. Native Yes: A's 34,000 BCY
  // surplus fills B's 8,000 at shrink 1.0, 26,000 BCY (32,500 LCY) out, no import. B's region ticked Specified import:
  // B buys its own 8,000 BCY (10,000 LCY) of select borrow on B, A exports all 34,000. Native No: all out, all in.
  { id: "job-native-yes-offsets", kind: "job", assume: {native_suitable: "layers",fill_type: "Select Borrow",swell_factor: 1.25,shrink_factor: 1,site_choices: null}, members: [jobSheet("A", 34000, 0), jobSheet("B", 0, 8000)], expect: { "A:cut:padA": 8000, "A:cut_export:padA": 26000, "B:fill:padB": 8000, "job:soil_export:": 32500, "job:soil_import:": undefined } },
  { id: "job-specified-import", kind: "job", assume: {native_suitable: "layers",fill_type: "Select Borrow",swell_factor: 1.25,shrink_factor: 1,site_choices: {specified_import: {padB: "Select Borrow"}}}, members: [jobSheet("A", 34000, 0), jobSheet("B", 0, 8000)], expect: { "A:cut_export:padA": 34000, "A:cut:padA": undefined, "B:fill:padB": 8000, "B:soil_import:padB": 10000, "job:soil_export:": 42500, "job:soil_import:": undefined } },
  { id: "job-native-no", kind: "job", assume: {native_suitable: "none",fill_type: "Select Borrow",swell_factor: 1.25,shrink_factor: 1,site_choices: null}, members: [jobSheet("A", 34000, 0), jobSheet("B", 0, 8000)], expect: { "A:cut_export:padA": 34000, "job:soil_export:": 42500, "job:soil_import:": 10000 } },
  // One sheet, Select Borrow named as the import, native Yes: its cut fills its fill (1,000 BCY cut, 300 CCY fill at 1.1:
  // 670 BCY, 837.5 LCY out, no import).
  { id: "sheet-select-borrow-offsets", kind: "job", assume: {native_suitable: "layers",fill_type: "Select Borrow",swell_factor: 1.25,shrink_factor: 1.1,site_choices: null}, members: [jobSheet("A", 1000, 300)], expect: { "A:cut_export:padA": 670, "job:soil_export:": 837.5, "job:soil_import:": undefined } },
  // 6e (D-1133): B's drawing edited (fill 600 -> 800 CCY), A calculated alone: B is named stale and the job prices B's
  // last result (660 BCY of A's cut to B, 340 exported, 425 LCY). Calculate job: B calculated, the job settles (880 to
  // B, 120 BCY out, 150 LCY). A second Calculate job writes the same lines.
  {
    id: "job-stale-calculate-job",
    kind: "jobstale",
    assume: { native_suitable: "layers", fill_type: "Engineered Fill", swell_factor: 1.25, shrink_factor: 1.1, site_choices: null },
    a: { cut: 1000, fill: 0 },
    b: { before: 600, after: 800 },
    expect: { "1:stale": "B", "1:A:cut_export:padA": 340, "1:A:soil_export:__soil_export__": 425, "1:B:fill:padB": 600, "2:stale": "", "2:A:cut:padA": 880, "2:A:cut_export:padA": 120, "2:A:soil_export:__soil_export__": 150, "2:B:fill:padB": 800, "3:same": true },
  },
  // D-1150: a boundary from the picked features (100 x 100 ft each, 1,000 x 1,000 ft page): touching, one boundary of
  // 20,000 SF; 1 ft apart, the gap closed (20,100 SF); 200 ft apart, two pieces, or one over both and the ground between
  // (40,000 SF). Offset 5 ft out: 12,100 SF, 2,100 SF outside the grade; 5 ft in: 8,100 SF.
  { id: "boundary-touching", kind: "boundary-from", scale: { feetPerNorm: 1, widthPt: 1000, heightPt: 1000 }, features: [[0, 0, 0.1, 0.1], [0.1, 0, 0.1, 0.1]], offsetFt: 5, expect: { pieces: 1, areaSF: "20000", joinedSF: 20000, offsetSF: 12100, outsideSF: 2100 } },
  { id: "boundary-1ft-gap", kind: "boundary-from", scale: { feetPerNorm: 1, widthPt: 1000, heightPt: 1000 }, features: [[0, 0, 0.1, 0.1], [0.101, 0, 0.1, 0.1]], offsetFt: -5, expect: { pieces: 1, areaSF: "20100", joinedSF: 20100, offsetSF: 8100 } },
  { id: "boundary-200ft-apart", kind: "boundary-from", scale: { feetPerNorm: 1, widthPt: 1000, heightPt: 1000 }, features: [[0, 0, 0.1, 0.1], [0.3, 0, 0.1, 0.1]], expect: { pieces: 2, areaSF: "10000 10000", joinedSF: 40000 } },
  // D-1152: the edge slope at 3:1 to flat existing at 100.00. A 100 x 100 pad 2.5 ft up: four wedges 100 x 7.5 x 2.5 / 2
  // (3,750 CF) and four hip corners 7.5 x 7.5 x 2.5 / 3 (187.5 CF), 3,937.5 CF; 2.5 ft down the same in cut. An L of
  // the same 2.5 ft: the inside corner's overlap counted once, the same 3,937.5. A 20 ft drive sharing the pad's east
  // edge: no slope on that edge, 120 x 100 outer, 4,312.5. Pad 2 ft inside the boundary: its west slope clipped at 2 ft
  // (100 x (2.5 x 2 - 2^2 / 6) = 433.33, the other three 2,812.5, two corners 93.75, the two clipped ones 36.61),
  // 3,376.19, flagged 7.5 - 2 = 5.5 ft past. A drive 200 x 20, +1 at its west end to -1 at its east, the boundary on its
  // ends: each long edge's section 3 h^2 / 2 with h = 1 - x / 100, 50 CF over the raised half, so 100 CF fill and 100 CF
  // cut. Two pads 5 ft apart inside a boundary flush with their north and south edges: the facing slopes overlap,
  // counted once, 2,916.67.
  { id: "edge-slope-square-pad", kind: "edge-slope", features: [{ ring: [[0, 0], [100, 0], [100, 100], [0, 100]], z: [102.5, 102.5, 102.5, 102.5] }], boundary: [[-500, -500], [1000, -500], [1000, 1000], [-500, 1000]], expect: { fillCF: 3937.5, cutCF: 0, pastFt: "" } },
  { id: "edge-slope-cut-pad", kind: "edge-slope", features: [{ ring: [[0, 0], [100, 0], [100, 100], [0, 100]], z: [97.5, 97.5, 97.5, 97.5] }], boundary: [[-500, -500], [1000, -500], [1000, 1000], [-500, 1000]], expect: { fillCF: 0, cutCF: 3937.5, pastFt: "" } },
  { id: "edge-slope-l-pad", kind: "edge-slope", features: [{ ring: [[0, 0], [100, 0], [100, 50], [50, 50], [50, 100], [0, 100]], z: [102.5, 102.5, 102.5, 102.5, 102.5, 102.5] }], boundary: [[-500, -500], [1000, -500], [1000, 1000], [-500, 1000]], expect: { fillCF: 3937.5, cutCF: 0, pastFt: "" } },
  { id: "edge-slope-shared-edge", kind: "edge-slope", features: [{ ring: [[0, 0], [100, 0], [100, 100], [0, 100]], z: [102.5, 102.5, 102.5, 102.5] }, { ring: [[100, 0], [120, 0], [120, 100], [100, 100]], z: [102.5, 102.5, 102.5, 102.5] }], boundary: [[-500, -500], [1000, -500], [1000, 1000], [-500, 1000]], expect: { fillCF: 4312.5, cutCF: 0, pastFt: "" } },
  { id: "edge-slope-past-boundary", kind: "edge-slope", features: [{ ring: [[2, 0], [102, 0], [102, 100], [2, 100]], z: [102.5, 102.5, 102.5, 102.5] }], boundary: [[0, -500], [1000, -500], [1000, 1000], [0, 1000]], expect: { fillCF: 3376.19, cutCF: 0, pastFt: "5.5" } },
  { id: "edge-slope-edge-crossing", kind: "edge-slope", features: [{ ring: [[0, 0], [200, 0], [200, 20], [0, 20]], z: [101, 99, 99, 101] }], boundary: [[0, -50], [200, -50], [200, 70], [0, 70]], expect: { fillCF: 100, cutCF: 100, pastFt: "" } },
  { id: "edge-slope-two-pads-5ft", kind: "edge-slope", features: [{ ring: [[0, 0], [100, 0], [100, 100], [0, 100]], z: [102.5, 102.5, 102.5, 102.5] }, { ring: [[105, 0], [205, 0], [205, 100], [105, 100]], z: [102.5, 102.5, 102.5, 102.5] }], boundary: [[-50, 0], [255, 0], [255, 100], [-50, 100]], expect: { fillCF: 2916.67, cutCF: 0, pastFt: "" } },
  // D-1155: a square pond's contour (100 x 100 ft) at 9.00 on flat existing at 10.00, the boundary 10 ft outside it.
  // Without an offset contour the pond's cut alone, 10,000 / 27 = 370.37 CY, and the 4,400 SF ring between it and the
  // boundary lies outside the proposed grade ("not in cut/fill"). Offset 10 ft out at 9.00 (corners mitered, 120 x 120,
  // one closed contour inside the boundary): the berm cuts 4,400 x 1.0 / 27 = 162.96 CY, 533.33 in all, nothing outside.
  {
    id: "offset-contour-pond-berm",
    kind: "offset-contour",
    side: 1000,
    runs: [s("eg1", "EG", "EG", 10, 0, 0), s("eg2", "EG", "EG", 10, 0.4, 0), s("eg3", "EG", "EG", 10, 0.4, 0.4), s("eg4", "EG", "EG", 10, 0, 0.4), c("pond", "Pond HB", "FG", 9, [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2], [0.1, 0.2], [0.1, 0.1]])],
    boundary: [[0.09, 0.09], [0.21, 0.09], [0.21, 0.21], [0.09, 0.21]],
    offset: { run: 4, ft: 10, elevation: 9 },
    expect: { pieces: 1, closed: true, withoutCutCY: 370.37, withCutCY: 533.33, bermCutCY: 162.96, outsideWithoutSF: 4400, outsideWithSF: 0 },
  },
  // D-1159: what 100 LCY of each import soil buys at the pit (shrink 1.0, swell 1.25): common fill by the ton at 1.28
  // t/LCY, select fill by the CY, fill sand by the ton at 1.43 t/LCY (damp, D-1160), a custom soil at 1.9 t a compacted CY over shrink
  // x swell (152 TON); an older project's "Engineered Fill" reads as Select fill, flagged, and "Select Borrow" plainly.
  {
    id: "import-fill-materials",
    kind: "import-fill",
    cases: [
      ["common", "Common fill"],
      ["select", "Select fill"],
      ["sand", "Fill sand"],
      ["engineered", "Engineered Fill"],
      ["structural", "Structural Fill"],
      ["borrow", "Select Borrow"],
      ["custom", "zz Caliche", { name: "zz Caliche", unit: "TON", price: 14.25, tons_per_ccy: 1.9, mat_key: "custom:x" }],
    ],
    expect: {
      common: "Common fill | fill:common_borrow:fob | 128 TON",
      select: "Select fill | fill:select:fob | 100 CY",
      sand: "Fill sand | fill:sand:fob | 143 TON",
      engineered: "Select fill (spec term) | fill:select:fob | 100 CY",
      structural: "Select fill (spec term) | fill:select:fob | 100 CY",
      borrow: "Select fill | fill:select:fob | 100 CY",
      custom: "zz Caliche | custom | 152 TON",
    },
  },
  // D-1159: a 200 x 100 ft boundary, a 100 x 100 ft feature graded by its own spots, existing everywhere. Graded only
  // inside the features, the other half is proposed as existing and counts as covered; graded everywhere, the proposed
  // grade reaches half the boundary and says so.
  {
    id: "coverage-inside-features",
    kind: "coverage-inside",
    side: 100,
    boundary: [[0, 0], [2, 0], [2, 1], [0, 1]],
    runs: [s("eg1", "EG", "EG", 10, 0, 0), s("eg2", "EG", "EG", 10, 2, 0), s("eg3", "EG", "EG", 10, 2, 1), s("eg4", "EG", "EG", 10, 0, 1), s("fg1", "FG", "FG", 10.5, 0, 0), s("fg2", "FG", "FG", 10.5, 1, 0), s("fg3", "FG", "FG", 10.5, 1, 1), s("fg4", "FG", "FG", 10.5, 0, 1)],
    roleAreas: [{ itemId: "pad", label: "Pad", depthFt: 0, polygon: [[0, 0], [1, 0], [1, 1], [0, 1]] }],
    expect: { inside: "covered", everywhere: "50% warned" },
  },
  // D-1158: a proposed point just outside the boundary keeps its triangle. The pond above with its 120 ft contour at
  // 9.00 drawn by hand, one corner 0.01 ft (and 0.1 ft) past the boundary: 14,400 SF x 1.0 / 27 = 533.33 CY either way.
  // At 0.1 ft the clipper threw on that corner's piece and the engine had dropped it (511.11 CY, 600 SF short).
  ...[0.01, 0.1].map((ft) => ({
    id: `volume-point-${ft}-ft-outside-boundary`,
    kind: "volume",
    side: 1000,
    boundary: [[0.09, 0.09], [0.21, 0.09], [0.21, 0.21], [0.09, 0.21]],
    runs: [s("eg1", "EG", "EG", 10, 0, 0), s("eg2", "EG", "EG", 10, 0.4, 0), s("eg3", "EG", "EG", 10, 0.4, 0.4), s("eg4", "EG", "EG", 10, 0, 0.4), c("pond", "Pond HB", "FG", 9, [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2], [0.1, 0.2], [0.1, 0.1]]), c("berm", "Berm", "FG", 9, [[0.21, 0.09], [0.21, 0.21], [0.09, 0.21], [0.09, 0.09 - ft / 1000], [0.21, 0.09]])],
    expect: { ok: true, cutCY: 14400 / 27, fillCY: 0 },
  })),
  // D-1154: the slope typed as 4 H:V or as 25 % is one slope: the pad 2.5 ft up gives four wedges 100 x 10 x 2.5 / 2
  // (5,000 CF) and four corners 10 x 10 x 2.5 / 3 (333.33), 5,333.33 either way. The drive +1 to -1 with 3:1 in fill and
  // 2:1 in cut: each long edge's section H h^2 / 2 over its half, H x 100 / 6, so fill 2 x 50 = 100 and cut 2 x 33.33 =
  // 66.67.
  { id: "edge-slope-4-to-1", kind: "edge-slope", features: [{ ring: [[0, 0], [100, 0], [100, 100], [0, 100]], z: [102.5, 102.5, 102.5, 102.5], slope: ["4", "hv"] }], boundary: [[-500, -500], [1000, -500], [1000, 1000], [-500, 1000]], expect: { fillCF: 5333.33, cutCF: 0, pastFt: "" } },
  { id: "edge-slope-25-pct", kind: "edge-slope", features: [{ ring: [[0, 0], [100, 0], [100, 100], [0, 100]], z: [102.5, 102.5, 102.5, 102.5], slope: ["25", "pct"] }], boundary: [[-500, -500], [1000, -500], [1000, 1000], [-500, 1000]], expect: { fillCF: 5333.33, cutCF: 0, pastFt: "" } },
  { id: "edge-slope-cut-2-fill-3", kind: "edge-slope", features: [{ ring: [[0, 0], [200, 0], [200, 20], [0, 20]], z: [101, 99, 99, 101], slope: ["3", "hv"], cutSlope: ["2", "hv"] }], boundary: [[0, -50], [200, -50], [200, 70], [0, 70]], expect: { fillCF: 100, cutCF: 66.67, pastFt: "" } },
  // D-1137: a stitched site (A and B, no site result) is one member; marked Separate job, its sheets still balance
  // together: A's 1,000 BCY cut fills B's 300 CCY (330 BCY at 1.1), 670 out (837.5 LCY on A); C, alone in the job,
  // imports its 600 CCY (660 BCY, 825 LCY).
  {
    id: "job-site-separate-together",
    kind: "jobsite",
    assume: { native_suitable: "layers", fill_type: "Engineered Fill", swell_factor: 1.25, shrink_factor: 1.1, site_choices: null },
    rows: [{ key: "A", cut: 1000, fill: 0, site: true }, { key: "B", cut: 0, fill: 300, site: true }, { key: "C", cut: 0, fill: 600 }],
    expect: { views: "Site A–B|C", "A:cut:padA": 330, "A:cut_export:padA": 670, "A:soil_export:__soil_export__": 837.5, "C:soil_import:__soil_import__": 825, "B:soil_import:__soil_import__": undefined, "B:soil_export:__soil_export__": undefined },
  },
  // D-1142: a pocket id ("cut-1") is each sheet's own. B's 10 BCY pocket chosen dozer push must not push A's 1,000 BCY
  // pocket of the same id: the dozer's share is B's 10 of the job's 1,010 BCY (before, every pocket "cut-1" was dozer).
  {
    id: "job-pocket-ids-per-sheet",
    kind: "job",
    members: ["A", "B"].map((key) => ({
      key,
      label: key,
      inputs: {
        units: "CY",
        regions: [{ id: `pad${key}`, label: `Pad ${key}`, cutCY: key === "A" ? 1000 : 10, fillCY: key === "A" ? 0 : 600 }],
        assumptions: { ...JOB_A, choices: { surplus: {}, method: "excavator", push_ft: 100, method_by_feature: {}, pocket_methods: { "cut-1": { method: "dozer", cells: ["5,5"], cy: 10 } } } },
        figures: { pockets: [{ id: "cut-1", kind: "cut", cy: key === "A" ? 1000 : 10, areaSF: key === "A" ? 9000 : 90, avgFt: 3, deepestFt: 4, at: { x: 0, y: 0, z: 0 }, cells: key === "A" ? ["1,1", "1,2", "1,3"] : ["5,5"] }], hauls: [], steepPct: 0 },
      },
    })),
    expect: { "A:cut:padA": 643.564356, "A:cut_push:padA": 6.435644, "A:cut_export:padA": 350, "B:fill:padB": 594.059406, "job:soil_export:": 437.5 },
  },
  // One item drawn on two sheets (D-1133): its region on A cuts 1,000 BCY, on B fills 600 CCY; each sheet keeps its own
  // share under the item's id, as two regions would.
  {
    id: "job-shared-region-id",
    kind: "job",
    members: [
      { key: "A", label: "A", inputs: { units: "CY", regions: [{ id: "padX", label: "Pad X", cutCY: 1000, fillCY: 0 }], assumptions: JOB_A } },
      { key: "B", label: "B", inputs: { units: "CY", regions: [{ id: "padX", label: "Pad X", cutCY: 0, fillCY: 600 }], assumptions: JOB_A } },
    ],
    expect: { "A:cut_export:padX": 340, "A:cut:padX": 660, "B:fill:padX": 600, "B:cut:padX": undefined, "job:soil_export:": 425 },
  },
  // Distance between areas (D-1131 b): two 100 ft boundaries 2,000 ft apart, centroid to centroid.
  { id: "job-distance-2000ft", kind: "job", between: [SQ(0, 0), SQ(2000, 0)], expect: { distanceFt: 2000 } },
];

/** D-1149: a 100 x 70 ft undercut 6.5 ft deep has sloped sides past 4 ft: the wedge round its 340 ft edge,
 *  340 x 6.5 x 6.5 / 2 = 7,182.5 CF, is dug too. The Q13 and D-895 rows test the clamp; this is added to each. */
const UC_SIDES_CY = (340 * 6.5 * 6.5) / 2 / 27;

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
  // 1.1: GT-08's pits (pp.23-25), TP-1 (0, 0), TP-2 (100, 0), TP-3 (0, 100): topsoil to 0.5 ft in each,
  // fill to 1.0, 1.5 and 1.0, natural granular below. EG level 100.00, FG level 98.80 (a 1.20 ft cut),
  // no strip, the work the pits' triangle (5,000 SF). Fill's bottom D = 1.0 + 0.005x.
  // Total 5,000 x 1.20 = 6,000 CF = 222.22 CY; topsoil 5,000 x 0.50 = 92.59 CY; granular where 1.2 > D
  // (x < 40): the integral of (0.2 - 0.005x)(100 - x) from 0 to 40 = 346.67 CF = 12.84 CY; fill the rest,
  // 116.79 CY (0.7 x 5,000 - 346.67 = 3,153.33 CF agrees).
  {
    id: "geo-1.1-gt08-cut-by-layer",
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
  // granular soil, neither logged at GT-08, so both have no thickness (a layer missing from a log that
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
    expect: {
      ok: true, cutCY: 6000 / 27, "geo:Asphalt:CY": 0, "geo:Topsoil:CY": 2500 / 27, "geo:Fill:CY": (3500 - 1040 / 3) / 27, "geo:Fat clay:CY": 0, "geo:Granular:CY": 1040 / 3 / 27, "geo:Sand:CY": 0, "geo:sum-equals-cut": true,
      // D-559: three layers, "or" before the last.
      "geo:notes": "No bore logs Asphalt, Fat clay or Sand, so they take nothing.",
    },
  },
  // 1.2: the same with a 0.50 ft strip (stripping wins): the strip 92.59 CY; the cut below it 129.63 CY =
  // fill 116.79 + granular 12.84; no topsoil left in the cut.
  {
    id: "geo-1.2-gt08-strip-wins",
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
    id: "geo-1.3-gt08-square-extrapolated",
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
  // B5 (D-545): one layer by depth over one by elevation, on a sloping ground. EG = 100 + 0.01x over the
  // 100 ft square, FG = EG - 6 (a 6 ft cut, 60,000 CF = 2,222.22 CY). B-1 (0, 0) and B-2 (0, 100), ground
  // 100.00, log topsoil 0-1 ft, clay 1-4 ft (its bottom at elevation 96.00) and rock 4-20 ft. Topsoil by
  // depth, 1 ft everywhere: 10,000 CF = 370.37 CY. Clay by elevation: its bottom level at 96.00, so
  // 4 + 0.01x below the ground: the integral of (3 + 0.01x) = 35,000 CF = 1,296.30 CY; rock (2 - 0.01x),
  // 15,000 CF = 555.56 CY. Read by depth, the clay's bottom would be 4 ft everywhere (30,000 and 20,000 CF);
  // before B5 the clay had no thickness and the rock took all 50,000 CF below the topsoil. No clamp.
  {
    id: "geo-B5-depth-over-elevation",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 101, 101, 100]), ...corners("FG", [94, 95, 95, 94])],
    geo: {
      layers: [["top", "Topsoil"], ["clay", "Clay", "elevation"], ["rock", "Rock"]],
      bores: [
        { id: "b1", code: "B-1", x: 0, y: 0, ground: 100, total: 20, rows: [{ layerId: "top", top: 0, bottom: 1 }, { layerId: "clay", top: 1, bottom: 4 }, { layerId: "rock", top: 4, bottom: 20 }] },
        { id: "b2", code: "B-2", x: 0, y: 100, ground: 100, total: 20, rows: [{ layerId: "top", top: 0, bottom: 1 }, { layerId: "clay", top: 1, bottom: 4 }, { layerId: "rock", top: 4, bottom: 20 }] },
      ],
      box: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    },
    expect: { ok: true, cutCY: 60000 / 27, "geo:Topsoil:CY": 10000 / 27, "geo:Clay:CY": 35000 / 27, "geo:Rock:CY": 15000 / 27, "geo:sum-equals-cut": true, "geo:clamps": "" },
  },
  // B5: the clay's bottom, level at 98.50, rises above the topsoil's on a falling ground. EG = 100 - 0.01x,
  // FG = EG - 2 (a 2 ft cut, 20,000 CF = 740.74 CY). B-1 (0, 50), ground 100.00: topsoil 0-1, clay 1-1.5,
  // rock 1.5-20. The clay's bottom is 1.5 - 0.01x below the ground, above the topsoil's 1 ft where x > 50:
  // kept under it over 5,000 SF, up to 0.50 ft (at x = 100), near B-1. Topsoil 10,000 CF = 370.37 CY; clay
  // the integral of (0.5 - 0.01x) for x < 50, 1,250 CF = 46.30 CY; rock 3,750 + 5,000 = 8,750 CF = 324.07 CY.
  {
    id: "geo-B5-elevation-clamped-under-depth",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 99, 99, 100]), ...corners("FG", [98, 97, 97, 98])],
    geo: {
      layers: [["top", "Topsoil"], ["clay", "Clay", "elevation"], ["rock", "Rock"]],
      bores: [{ id: "b1", code: "B-1", x: 0, y: 50, ground: 100, total: 20, rows: [{ layerId: "top", top: 0, bottom: 1 }, { layerId: "clay", top: 1, bottom: 1.5 }, { layerId: "rock", top: 1.5, bottom: 20 }] }],
      box: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    },
    expect: {
      ok: true, cutCY: 20000 / 27, "geo:Topsoil:CY": 10000 / 27, "geo:Clay:CY": 1250 / 27, "geo:Rock:CY": 8750 / 27, "geo:sum-equals-cut": true,
      "geo:clamps": "Clay kept under Topsoil over 5000.00 SF, up to 0.50 ft, near B-1",
    },
  },
  // B1a (D-551): a layer no bore logs takes nothing, by elevation too. The ground and the cut as in
  // geo-B5-depth-over-elevation (EG = 100 + 0.01x, a 6 ft cut, 60,000 CF); B-1 (0, 0) and B-2 (0, 100), ground
  // 100.00, log topsoil 0-1 ft and rock 1-20 ft; clay, by elevation, lies between them in the list and no bore logs
  // it. Topsoil 1 ft everywhere, 10,000 CF = 370.37 CY; clay 0; rock the other 50,000 CF = 1,851.85 CY. Before
  // the rule, the clay's bottom stood at the bores' 99.00 (zero thickness there) and, read by elevation, took the
  // ground above it: 0.01x thick, 5,000 CF.
  {
    id: "geo-B1a-unlogged-elevation-layer-between-logged",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 101, 101, 100]), ...corners("FG", [94, 95, 95, 94])],
    geo: {
      layers: [["top", "Topsoil"], ["clay", "Clay", "elevation"], ["rock", "Rock"]],
      bores: [
        { id: "b1", code: "B-1", x: 0, y: 0, ground: 100, total: 20, rows: [{ layerId: "top", top: 0, bottom: 1 }, { layerId: "rock", top: 1, bottom: 20 }] },
        { id: "b2", code: "B-2", x: 0, y: 100, ground: 100, total: 20, rows: [{ layerId: "top", top: 0, bottom: 1 }, { layerId: "rock", top: 1, bottom: 20 }] },
      ],
      box: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    },
    expect: {
      ok: true, cutCY: 60000 / 27, "geo:Topsoil:CY": 10000 / 27, "geo:Clay:CY": 0, "geo:Rock:CY": 50000 / 27, "geo:sum-equals-cut": true, "geo:clamps": "",
      // D-559: one layer, "it takes".
      "geo:notes": "No bore logs Clay, so it takes nothing.",
    },
  },
  // 1.8: GT-01 (pp.45-50): B-1, B-2, B-4, B-5, B-6 log 8, 7, 8, 4 and 3 in of topsoil, 6.0 in on
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
  // Spec §8: the slope template (D-552) on a project with Fat clay (Type B) and a granular soil
  // (Type C). Cohesive 0.5:1 is under B's 1:1, granular 0.5:1 and 1:1 under C's 1.5:1: "Steeper than
  // federal OSHA" on the first three; the shoring row says nothing.
  {
    id: "geo-slope-rule-template-steeper",
    kind: "geo-slope",
    layers: [{ soil_group: "clay", osha_type: "B" }, { soil_group: "gravel", osha_type: "C" }],
    expect: { "row0:steeper": true, "row1:steeper": true, "row2:steeper": true, "row3:steeper": false },
  },
  // Bores through a link and on a joined site (plan §2.6, U-UT42, D-540): row 1.5's bores moved 20 ft,
  // so the work is 0..120 ft each way, B-1 (0, 0), B-2 (120, 20), B-3 (20, 120), TP-4 (120, 120).
  // Through a link: B-1..B-3 on the grading sheet (120 ft square); TP-4 on a survey sheet (also 120 ft,
  // 0.2 ft a point) at its (120, 0) ft, linked turned 90 degrees: grading = (120 - sy, sx). Pairs:
  // (0, 0) > (120, 0), (120, 0) > (120, 120), (0, 120) > (0, 0). TP-4 lands at (120, 120): row 1.5's
  // clamp again, 555.56 SF, up to 2.00 ft, near TP-4.
  {
    id: "geo-link-bore-through-link",
    kind: "geo-link",
    expect: { mappedX: 1, mappedY: 1, placed: "B-1,B-2,B-3,TP-4", clamps: 1, "clamp0:areaSF": 5000 / 9, "clamp0:maxFt": 2, "clamp0:near": "TP-4" },
  },
  // On a site of two 140 ft sheets: A, moved -10 ft each way (site = a - 10), shows its left half (site
  // x up to 60) with B-1 at its (10, 10) ft and B-3 at (30, 130); B, turned 90 degrees and moved
  // (130, -10) (site = (130 - by, bx - 10)), shows the rest, with B-2 at its (30, 10) ft, TP-4 at (130, 10)
  // and X-9 at (20, 120), which lands at site (10, 10), in A's part: kept (a Bore ID is unique, so it is
  // no copy of A's), and outside triangle B-2, TP-4, B-3, so the clamp is row 1.5's.
  {
    id: "geo-site-bores-joined",
    kind: "geo-site",
    expect: { placed: "B-1,B-3,B-2,TP-4,X-9", tp4X: 1, tp4Y: 1, clamps: 1, "clamp0:areaSF": 5000 / 9, "clamp0:maxFt": 2, "clamp0:near": "TP-4" },
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
      // GT-02 B-1 (p.21, p.8): 6.0 ft after 24 h or more; NRCS published 18-24 in (p.4), not used.
      { id: "GT-02 B-1", total: 20, readings: [{ kind: "after_hours", depth_ft: 6, hours: 24 }, { kind: "published", depth_ft: 1.5, source: "NRCS" }] },
      // GT-06 (p.8): no groundwater to 31.5 ft; ADWR published 81.80 ft.
      { id: "GT-06", total: 31.5, readings: [{ kind: "at_completion", depth_ft: null }, { kind: "published", depth_ft: 81.8, source: "ADWR" }] },
      // GT-09 B-13 (p.36): 5.0 at drilling. B-12 (p.35, p.12): 7.0 in PVC after 12 days.
      { id: "GT-09 B-13", total: 20, readings: [{ kind: "while_drilling", depth_ft: 5 }] },
      { id: "GT-09 B-12", total: 20, readings: [{ kind: "stabilized", depth_ft: 7 }] },
      // GT-08 TP-3 (p.25, p.12): not encountered 10/2; 4.0 ft on 10/11 (216 h).
      { id: "GT-08 TP-3", total: 6, readings: [{ kind: "at_completion", depth_ft: null }, { kind: "after_hours", depth_ft: 4, hours: 216 }] },
    ],
    expect: { "W-1": 4, "W-1 no seasonal": 4.2, "GT-02 B-1": 5, "GT-06": 81.8, "GT-09 B-13": 4, "GT-09 B-12": 6, "GT-08 TP-3": 3 },
  },
  // GT-05 B-1 (p.24): not encountered to 41.5 ft, no other source: below 41.5, no point.
  {
    id: "geo-1.7-gt05-below",
    kind: "geo-water",
    bores: [{ id: "GT-05 B-1", total: 41.5, readings: [{ kind: "at_completion", depth_ft: null }] }],
    expect: { "GT-05 B-1": 41.5 },
  },
  // --- D-1163 (AB): an Area's layers lose a line feature's footprint where it lies inside --------------------------
  // A 100 x 100 ft paving (10,000 SF) on a 200 x 200 ft page; 100 LF of curb and gutter, 2.5 ft across (6 in curb +
  // 24 in pan). Inside: 100 x 2.5 = 250 SF off, 9,750. On the edge: the band centred on the line, half inside, 125 SF
  // off, 9,875 (it had been 9,750). Unticked: 10,000. Striping inside: a line item takes nothing off, 10,000.
  { id: "ab-curb-inside", kind: "line-deduct", line: "curb", at: "inside", deduct: true, expect: { footprintFt: 2.5, areaSf: 9750 } },
  { id: "ab-curb-on-edge", kind: "line-deduct", line: "curb", at: "edge", deduct: true, expect: { footprintFt: 2.5, areaSf: 9875 } },
  { id: "ab-curb-unticked", kind: "line-deduct", line: "curb", at: "inside", deduct: false, expect: { footprintFt: 2.5, areaSf: 10000 } },
  { id: "ab-striping-inside", kind: "line-deduct", line: "striping", at: "inside", deduct: true, expect: { footprintFt: 2.5, areaSf: 10000 } },
  // --- D-1160: a job member an older engine worked out is stale (Calculate job calculates it first) ----------------
  // The engine is v11 a sheet's and a site's (D-1163): a v8, v9 or v10 sheet is behind, "u2" or not; v11 is current;
  // a site's v9 and v8 are behind; an empty or unreadable key is not behind.
  {
    id: "d1160-behind-engine",
    kind: "behind-engine",
    cases: [["v8u2:abc", "sheet"], ["v9:abc", "sheet"], ["v10u2:abc", "sheet"], ["v10:abc", "sheet"], ["v11u2:abc", "sheet"], ["v11:abc", "sheet"], ["v9:abc", "site"], ["v8:abc", "site"], ["", "sheet"], ["x:abc", "sheet"]],
    expect: { engine: "11/11", "sheet:v8u2:abc": true, "sheet:v9:abc": true, "sheet:v10u2:abc": true, "sheet:v10:abc": true, "sheet:v11u2:abc": false, "sheet:v11:abc": false, "site:v9:abc": true, "site:v8:abc": true, "sheet:": false, "sheet:x:abc": false },
  },
  // --- D-1160: an undercut measured from the section's bottom (a liner), on a pad in fill -------------------------
  // A 100 x 100 ft pad with a 0.5 ft section, EG 100, FG 102: the region fills 10,000 x 1.5 = 15,000 CF = 555.56 CY.
  // Its 0.5 ft below the section lies wholly above existing ground (subgrade 101.5, bottom 101.0): nothing is dug.
  // Lime-stabilized in place, it adds no soil: nothing displaced, the fill line (and the import) keeps 555.56 CY; it
  // had taken 10,000 x 0.5 = 185.19 CY off. A clay liner still places its 185.19 CY in the fill's place: 370.37 left.
  ...[
    ["d1160-stabilized-in-place-in-fill", { native: "stabilized" }, 0, 15000 / 27],
    ["d1160-clay-liner-in-fill", { material: "Clay liner (compacted, low-permeability)" }, 5000 / 27, 10000 / 27],
  ].map(([id, extra, displaced, lineFill]) => ({
    id,
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [102, 102, 102, 102])],
    roleAreas: [{ itemId: "pad", label: "Pad", depthFt: 0.5, polygon: UNIT }],
    undercut: { id: "pad", depthFt: 0.5, undercutFt: 0.5, liner: true, polygon: UNIT, ...extra },
    expect: { ok: true, "region:pad:fillCY": 15000 / 27, "undercut:displacedCY": displaced, "lineFill:CY": lineFill },
  })),
  // --- Q13 (D-528), now the "below subgrade" override (D-895): existing ground only ---------
  // A 100 x 70 ft pad (7,000 SF) on a 100 x 100 ft site, undercut 6.5 ft below the subgrade.
  // Fill area: EG 100, FG 102, so the subgrade is 2.0 ft above existing ground. Dug: 6.5 - 2.0 =
  // 4.5 ft, 7,000 x 4.5 = 31,500 CF = 1,166.67 CY; flat, as before: 7,000 x 6.5 = 1,685.19 CY.
  {
    id: "q13-undercut-fill-area",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [102, 102, 102, 102])],
    undercut: { id: "pad", undercutFt: 6.5, from: "subgrade", polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 31500 / 27 + UC_SIDES_CY, "undercutFlat:CY": 45500 / 27 + UC_SIDES_CY},
  },
  // Cut area: EG 102, FG 100, the subgrade below existing ground: unchanged, 1,685.19 CY.
  {
    id: "q13-undercut-cut-area-unchanged",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [102, 102, 102, 102]), ...corners("FG", [100, 100, 100, 100])],
    undercut: { id: "pad", undercutFt: 6.5, from: "subgrade", polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 45500 / 27 + UC_SIDES_CY, "undercutFlat:CY": 45500 / 27 + UC_SIDES_CY},
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
    undercut: { id: "pad", undercutFt: 6.5, from: "subgrade", polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 37625 / 27 + UC_SIDES_CY, "undercutFlat:CY": 45500 / 27 + UC_SIDES_CY},
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
    undercut: { id: "pad", depthFt: 0.5, undercutFt: 6.5, from: "subgrade", polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 31500 / 27 + UC_SIDES_CY, "undercutFlat:CY": 45500 / 27 + UC_SIDES_CY},
  },
  // --- D-895: an undercut's bottom is the lower of stripped existing grade and subgrade, less d ---
  // The same 7,000 SF pad, 6.5 ft. In fill (EG 100, FG 102) the bottom is 93.5, below existing: 45,500 CF.
  {
    id: "d895-lower-in-fill",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [102, 102, 102, 102])],
    undercut: { id: "pad", undercutFt: 6.5, polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 45500 / 27 + UC_SIDES_CY},
  },
  // In cut (EG 102, FG 100) the bottom is 93.5, below subgrade: 45,500 CF.
  {
    id: "d895-lower-in-cut",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [102, 102, 102, 102]), ...corners("FG", [100, 100, 100, 100])],
    undercut: { id: "pad", undercutFt: 6.5, polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 45500 / 27 + UC_SIDES_CY},
  },
  // Cut and fill in one pad, dz = 4x - 1: 6.5 ft all over, 45,500 CF.
  {
    id: "d895-lower-cut-and-fill",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [99, 103, 103, 99])],
    undercut: { id: "pad", undercutFt: 6.5, polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 45500 / 27 + UC_SIDES_CY},
  },
  // The override "below existing", in cut: EG 102 less 6.5 is 95.5; the 2.0 ft down to the subgrade is cut, so 4.5 ft is undercut: 31,500 CF.
  {
    id: "d895-existing-in-cut",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [102, 102, 102, 102]), ...corners("FG", [100, 100, 100, 100])],
    undercut: { id: "pad", undercutFt: 6.5, from: "existing", polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 31500 / 27 + UC_SIDES_CY},
  },
  // The override "below existing", in fill: from existing ground, the full 6.5 ft.
  {
    id: "d895-existing-in-fill",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [102, 102, 102, 102])],
    undercut: { id: "pad", undercutFt: 6.5, from: "existing", polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 45500 / 27 + UC_SIDES_CY},
  },
  // The override "below existing", dz = 4x - 1: d + min(dz, 0); the cut side x < 0.25 loses 0.125 ft of mean depth: 6.375 ft over 7,000 SF = 44,625 CF.
  {
    id: "d895-existing-cut-and-fill",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...corners("EG", [100, 100, 100, 100]), ...corners("FG", [99, 103, 103, 99])],
    undercut: { id: "pad", undercutFt: 6.5, from: "existing", polygon: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
    expect: { ok: true, "undercut:CY": 44625 / 27 + UC_SIDES_CY},
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
    // D-1147: a feature of depth 0 owns its area too: both are role areas.
    expect: { order: "B,A", roleAreas: "B,A", "B:undercutSF": 100, "A:undercutSF": 50, "B:undercutCF": 100, "A:undercutCF": 50 },
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
    expect: { order: "B,A", roleAreas: "B,A", "A:undercutSF": 50, "A:undercutCF": 50, "A:prepSF": 50 },
  },
  // D-1147: laid on top. A pond (depth 0, Subgrade Prep) and a newer erosion control blanket over its east half: the
  // blanket is no earthwork feature, takes none of the pond's prep (100 SF stays) and is no role area; the pond owns
  // its own area. Before, the newer blanket took 50 SF of the pond's prep (C16's slope ring).
  {
    id: "sf-overlay-erosion-ring",
    kind: "features",
    scale: { feetPerNorm: 1, widthPt: 100, heightPt: 100 },
    items: [
      { uuid: "P", name: "Pond", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 0, prep_depth_ft: 1, prep_lifts: 1, polygons: [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]]] },
      { uuid: "E", name: "Erosion Control", created_at: "2026-09-30T11:00:00Z", is_site_feature: true, role_depth_ft: 0, prep_depth_ft: 1, prep_lifts: 1, site_section: { mode: "area", kind: "site_item", item: "erosion_blanket", byOthers: false }, polygons: [[[0.05, 0], [0.15, 0], [0.15, 0.1], [0.05, 0.1]]] },
    ],
    expect: { order: "P", roleAreas: "P", "P:prepSF": 100, "E:prepSF": undefined },
  },
  // Asphalt (0.5 ft) and a newer striping crosshatch over part of it: the crosshatch takes nothing; the asphalt keeps
  // its whole area and prep.
  {
    id: "sf-overlay-striping-on-asphalt",
    kind: "features",
    scale: { feetPerNorm: 1, widthPt: 100, heightPt: 100 },
    items: [
      { uuid: "A", name: "Asphalt", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 0.5, prep_depth_ft: 1, prep_lifts: 1, polygons: [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]]] },
      { uuid: "S", name: "Striping", created_at: "2026-09-30T11:00:00Z", is_site_feature: true, role_depth_ft: 0, site_section: { mode: "area", kind: "site_item", item: "crosshatch", byOthers: false }, polygons: [[[0.02, 0.02], [0.06, 0.02], [0.06, 0.06], [0.02, 0.06]]] },
    ],
    expect: { order: "A", roleAreas: "A", "A:prepSF": 100 },
  },
  // Two sections overlapping (both own their area): the newer takes the overlap, as before.
  {
    id: "sf-two-sections-newer-takes",
    kind: "features",
    scale: { feetPerNorm: 1, widthPt: 100, heightPt: 100 },
    items: [
      { uuid: "A", name: "Concrete", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 0.5, prep_depth_ft: 1, prep_lifts: 1, polygons: [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]]] },
      { uuid: "B", name: "Asphalt", created_at: "2026-09-30T11:00:00Z", is_site_feature: true, role_depth_ft: 0.5, prep_depth_ft: 1, prep_lifts: 1, polygons: [[[0.05, 0], [0.15, 0], [0.15, 0.1], [0.05, 0.1]]] },
    ],
    expect: { order: "B,A", roleAreas: "B,A", "B:prepSF": 100, "A:prepSF": 50 },
  },
  // D-1149: "equal to the undercut depth, whichever is greater": a 10 x 10 ft square, undercut 2 ft, offset 0 ticked
  // at depth: 2 ft beyond the edge, 14 x 14 = 196 SF (square corners), 392 CF.
  {
    id: "sf-undercut-offset-at-depth",
    kind: "features",
    scale: { feetPerNorm: 1, widthPt: 100, heightPt: 100 },
    items: [{ uuid: "A", name: "A", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 0, undercut_depth_ft: 2, undercut_offset_ft: 0, undercut_offset_at_depth: true, undercut_fill_material: "Select Fill", polygons: [[[0.02, 0.02], [0.12, 0.02], [0.12, 0.12], [0.02, 0.12]]] }],
    expect: { order: "A", "A:undercutSF": 196, "A:undercutCF": 392 },
  },
  // D-1149: deeper than 4 ft the sides slope 1:1: a 10 x 10 ft square undercut 5 ft digs 500 CF plus the wedge round its
  // 40 ft edge, 40 x 5 x 5 / 2 = 500 CF: 1,000 CF; at 4 ft, vertical sides, 400 CF.
  {
    id: "sf-undercut-sloped-sides",
    kind: "features",
    scale: { feetPerNorm: 1, widthPt: 100, heightPt: 100 },
    items: [
      { uuid: "A", name: "A", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 0, undercut_depth_ft: 5, undercut_fill_material: "Select Fill", polygons: [[[0.02, 0.02], [0.12, 0.02], [0.12, 0.12], [0.02, 0.12]]] },
      { uuid: "B", name: "B", created_at: "2026-09-30T09:00:00Z", is_site_feature: true, role_depth_ft: 0, undercut_depth_ft: 4, undercut_fill_material: "Select Fill", polygons: [[[0.5, 0.5], [0.6, 0.5], [0.6, 0.6], [0.5, 0.6]]] },
    ],
    expect: { order: "A,B", "A:undercutSF": 100, "A:undercutCF": 1000, "B:undercutCF": 400 },
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
    expect: { order: "B,A", roleAreas: "B,A", "A:undercutSF": 144, "A:undercutCF": 144 },
  },
  // Q7: depth comes only from Site Features; a plain area with a depth and a line give grading nothing. D-1147: a
  // feature at depth 0 (a Zone) owns its area, so it is a role area too. Same times: ties by uuid, last first.
  {
    id: "sf-depth-only-from-features",
    kind: "features",
    items: [
      { uuid: "plain", name: "P", created_at: "2026-09-30T10:00:00Z", is_site_feature: false, role_depth_ft: 1, polygons: [[[0, 0], [1, 0], [1, 1]]] },
      { uuid: "copy", name: "P (Site Feature)", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 1, polygons: [[[0, 0], [1, 0], [1, 1]]] },
      { uuid: "flat", name: "Lawn", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 0, polygons: [[[0, 0], [1, 0], [1, 1]]] },
      { uuid: "line", name: "L", type: "lf", created_at: "2026-09-30T10:00:00Z", is_site_feature: true, role_depth_ft: 1, polygons: [[[0, 0], [1, 0], [1, 1]]] },
    ],
    expect: { order: "flat,copy", roleAreas: "flat,copy" },
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
  // --- F38 M0 (D-902): pipe in full joints within each bid; tons from CCY ---
  // 100 + 400 LF at 2 %: 510 LF, 37 joints of 14 ft = 518 LF, the 8 LF spread 1 : 4. The alternate rounds alone: 10.2 LF, 1 joint.
  {
    id: "m0-joints-per-bid",
    kind: "pipe-order",
    input: [
      { id: "a", bid: "base", matKey: "pipe:pvc:8", lf: 100, wastePct: 2, jointFt: 14 },
      { id: "b", bid: "base", matKey: "pipe:pvc:8", lf: 400, wastePct: 2, jointFt: 14 },
      { id: "c", bid: "alt 1", matKey: "pipe:pvc:8", lf: 10, wastePct: 2, jointFt: 14 },
    ],
    expect: { "a:sold": 103.6, "b:sold": 414.4, "a:order": 518, "a:joints": 37, "c:sold": 14, "c:joints": 1 },
  },
  // Exactly full joints buy none extra: 100 LF at 0 % on 20 ft.
  { id: "m0-exact-joint", kind: "pipe-order", input: [{ id: "a", bid: "base", matKey: "pipe:x:8", lf: 100, wastePct: 0, jointFt: 20 }], expect: { "a:sold": 100, "a:joints": 5 } },
  // 100 CCY of #57 at 111 pcf: 100 x 27 x 111 / 2000 = 149.85 TON, the plan's 1.50 t per CCY.
  { id: "m0-tons", kind: "tons", input: { ccy: 100, pcf: 108 }, expect: { tons: 145.8 } },
  { id: "m0-tons-sand", kind: "tons", input: { ccy: 100, pcf: 110 }, expect: { tons: 148.5 } },
  // Blank density: no tons, sold by the CY.
  { id: "m0-no-tons", kind: "tons", input: { ccy: 100, pcf: null }, expect: { tons: null } },
  // --- F38 M3 (D-905): what a line buys ---
  // 8" SDR-35 sanitary: the pipe, 5 % allowance, tape; no tracer on gravity.
  { id: "m3-gravity-pipe", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "pvc_d3034_sdr35:8|1|0-6", name: '8" PVC SDR-35, 0-6 ft deep', utility: "sanitary" }, expect: { keys: "pipe:pvc_d3034_sdr35:8 fit:pipe:pvc_d3034_sdr35:8 warning_tape", "pipe:pvc_d3034_sdr35:8:waste": 2, "warning_tape:unit": "ROLL" } },
  // C900 water: 20 % allowance, tracer and tape.
  { id: "m3-pressure-pipe", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "pvc_c900_dr18:8|1|0-6", name: '8" PVC C900 DR 18, 0-6 ft deep', utility: "water" }, expect: { keys: "pipe:pvc_c900_dr18:8 fit:pipe:pvc_c900_dr18:8 tracer_wire warning_tape", "tracer_wire:qty": "QTY * 1.1 / 500" } },
  // Ductile iron: metal, so no tracer and no tape; encasement.
  { id: "m3-di", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "di_c151_pc350:8|1|0-6", name: '8" DI, 0-6 ft deep', utility: "water" }, expect: { keys: "pipe:di_c151_pc350:8 fit:pipe:di_c151_pc350:8 encasement:di:8", "encasement:di:8:qty": "QTY * 1.1" } },
  // RCP storm: a gasket per joint, 1 % waste.
  { id: "m3-rcp", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "rcp_c76_wall_b:24|1|0-6", name: '24" RCP, 0-6 ft deep', utility: "storm" }, expect: { "pipe:rcp_c76_wall_b:24:waste": 1, "gasket:rcp:24:qty": "ceil(QTY / 8)" } },
  // Bedding at 111 pcf in tons with 10 %, by the CY with a blank density; native backfill buys nothing.
  { id: "m3-bedding-tons", kind: "line-materials", pcf: 111, input: { role: "utility_bedding_pipe_zone", unit: "CCY", variant: "bedding:#57 stone|imported", name: "Pipe bedding", utility: "sanitary" }, expect: { keys: "stone:_57_stone", "stone:_57_stone:unit": "TON", "stone:_57_stone:qty": "QTY * 27 * 111 / 2000", "stone:_57_stone:waste": 10 } },
  { id: "m3-bedding-cy", kind: "line-materials", input: { role: "utility_bedding_pipe_zone", unit: "CCY", variant: "bedding:Pea gravel|imported", name: "Pipe bedding", utility: "sanitary" }, expect: { "stone:pea_gravel:unit": "CY" } },
  // A saved blank on #57 or sand fills at the sourced density (D-915).
  { id: "q8-blank-fills", kind: "line-materials", input: { role: "utility_bedding_pipe_zone", unit: "CCY", variant: "bedding:#57 stone|imported", name: "Pipe bedding", utility: "sanitary" }, expect: { "stone:_57_stone:unit": "TON", "stone:_57_stone:qty": "QTY * 27 * 108 / 2000" } },
  { id: "m3-native-backfill", kind: "line-materials", input: { role: "utility_backfill", unit: "CCY", variant: "Native|native", name: "Trench backfill", utility: "sanitary" }, expect: { keys: "" } },
  // Every structure: one Whole structure.
  { id: "m3-structure", kind: "line-materials", input: { role: "utility_structure", unit: "EA", variant: 'sanitary_manhole|48"|6-8', name: "Sanitary Manhole", utility: "sanitary" }, expect: { keys: 'struct:sanitary_manhole:48"' } },
  // --- F38 M9 (D-907): services ---
  { id: "m9-gravity-wye", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "pvc_d3034_sdr35:8|1|0-6", name: '8" PVC SDR-35', utility: "sanitary", services: [{ count: 12, sizeIn: 4 }] }, expect: { keys: "pipe:pvc_d3034_sdr35:8 fit:pipe:pvc_d3034_sdr35:8 warning_tape wye:pvc_d3034_sdr35:8x4", "wye:pvc_d3034_sdr35:8x4:qty": "12", "wye:pvc_d3034_sdr35:8x4:unit": "EA" } },
  { id: "m9-pressure-tap", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "pvc_c900_dr18:8|1|0-6", name: '8" C900', utility: "water", services: [{ count: 3, sizeIn: 1 }] }, expect: { keys: "pipe:pvc_c900_dr18:8 fit:pipe:pvc_c900_dr18:8 tracer_wire warning_tape tap:pvc_c900_dr18:8x1", "tap:pvc_c900_dr18:8x1:qty": "3" } },
  // --- F38 M4a (D-908): bends, tees, restraint, the water stretches ---
  // A right angle, then 45: one of each; a 3 degree kink is no bend.
  { id: "m4a-bends", kind: "bends", path: [[0, 0], [100, 0], [100, 100], [170, 170], [270, 275.3]], expect: { bends: "45x1 90x1" } },
  // A vertex inside a structure is not a fitting.
  { id: "m4a-bend-at-structure", kind: "bends", path: [[0, 0], [100, 0], [100, 100]], marks: [{ x: 100, y: 0, r: 4 }], expect: { bends: "" } },
  // A run ending on another: one tee on the run met; end to end, none; at a structure, none.
  { id: "m4a-tee", kind: "bends", path: [], runs: [{ id: "main", path: [[0, 0], [200, 0]] }, { id: "branch", path: [[100, 0.5], [100, 80]] }], expect: { tees: "mainx1" } },
  { id: "m4a-end-to-end", kind: "bends", path: [], runs: [{ id: "a", path: [[0, 0], [100, 0]] }, { id: "b", path: [[100, 0], [200, 0]] }], expect: { tees: "" } },
  { id: "m4a-tee-at-structure", kind: "bends", path: [], marks: [{ x: 100, y: 0, r: 5 }], runs: [{ id: "main", path: [[0, 0], [200, 0]] }, { id: "branch", path: [[100, 0.5], [100, 80]] }], expect: { tees: "" } },
  // Pressure: a bend and a restraint for each; one more restraint for the tee.
  { id: "m4a-restraint", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "pvc_c900_dr18:8|1|0-6", name: '8" C900', utility: "water", fittings: { bends: [{ angle: 45, count: 2 }], tees: 1 } }, expect: { "bend:pvc_c900:45:8:qty": "2", "restraint:pvc_c900:8:qty": "3" } },
  // Thrust blocks: a zero CY to type, one per angle and one for the tee.
  { id: "m4a-thrust", kind: "line-materials", restraint: "thrust", input: { role: "utility_pipe", unit: "LF", variant: "pvc_c900_dr18:8|1|0-6", name: '8" C900', utility: "water", fittings: { bends: [{ angle: 90, count: 1 }], tees: 1 } }, expect: { "thrust:90:8:qty": "0.59", "thrust:90:8:unit": "CY", "thrust:tee:8:unit": "CY", "thrust:tee:8:qty": "0.42" } },
  // 12 in 90: T = 2 × 150 × 113.1 × sin 45 = 23,994 lb; × 1.5 ÷ 2,000 = 18 SF (12.0 at Sf 1.0, the research's table); × 2 ft ÷ 27.
  // D-926: a 16 in block is 3 ft deep: 12" is 2 ft. 22.5° at 16 in: 2 x 150 x 201.06 x sin 11.25° = 11,767 lb; x 1.5 / 2,000 = 8.83 SF; x 3 / 27 = 0.98.
  { id: "d926-thrust-depth", kind: "line-materials", restraint: "thrust", input: { role: "utility_pipe", unit: "LF", variant: "pvc_c900_dr18:16|1|0-6", name: "16 in water", utility: "water", fittings: { bends: [{ angle: 22.5, count: 1 }], tees: 0 } }, expect: { "thrust:22.5:16:qty": "0.98" } },
  { id: "q19-thrust-table", kind: "line-materials", restraint: "thrust", input: { role: "utility_pipe", unit: "LF", variant: "pvc_c900_dr18:12|1|0-6", name: '12" C900', utility: "water", fittings: { bends: [{ angle: 90, count: 2 }], tees: 0 } }, expect: { "thrust:90:12:qty": "2.66" } },
  // A bend counted: the allowance is 10 %; none counted, 20 % (D-915).
  { id: "q21-allowance-counted", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "pvc_c900_dr18:8|1|0-6", name: '8" C900', utility: "water", fittings: { bends: [{ angle: 45, count: 1 }], tees: 0 } }, expect: { "fit:pipe:pvc_c900_dr18:8:name": "Fittings allowance, 10 %" } },
  { id: "q21-allowance-none", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "pvc_c900_dr18:8|1|0-6", name: '8" C900', utility: "water" }, expect: { "fit:pipe:pvc_c900_dr18:8:name": "Fittings allowance, 20 %" } },
  // Valves and hydrants are counted, never in the % (D-915).
  { id: "c-valves-hydrants", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "pvc_c900_dr18:8|1|0-6", name: '8" C900', utility: "water", services: [{ count: 3, sizeIn: 8, kind: "valve" }, { count: 2, sizeIn: 6, kind: "hydrant" }] }, expect: { "valve:gate:8:qty": "3", "valve:box:qty": "3", "hydrant:assembly:qty": "2" } },
  // Gravity buys no bend.
  { id: "m4a-gravity-no-bend", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "pvc_d3034_sdr35:8|1|0-6", name: '8" SDR-35', utility: "sanitary", fittings: { bends: [{ angle: 45, count: 2 }], tees: 0 } }, expect: { keys: "pipe:pvc_d3034_sdr35:8 fit:pipe:pvc_d3034_sdr35:8 warning_tape" } },
  // 100 CCY of foundation at 111 pcf: 149.85 TON; 1,000 SY of geotextile is 2 rolls.
  { id: "m4a-water", kind: "line-materials", pcf: 108, input: { role: "dewatering", unit: "LF", variant: "trench", name: "Trench dewatering", utility: "sanitary", water: { foundationCCY: 100, geotextileSY: 1000 } }, expect: { "stone:foundation:unit": "TON", "stone:foundation:qty": "145.8", "geotextile:trench:qty": "2" } },
  // --- F38 M4b (D-909): structures by their parts ---
  // 48" manhole, 9.5 VF: base 4, cone 3; 2.5 left: 2 VF of riser and 6 in of rings; 8 steps; two 8" boots.
  { id: "m4b-manhole", kind: "structure-parts", input: { structureType: "sanitary_manhole", shape: "round", diaIn: 48, lengthFt: null, widthFt: null, wallIn: 5, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8, 8], vf: 9.5 }, expect: { keys: "mh:base:48 mh:48:riser rings mh:cone:48 casting:mh_sanitary boot:8 mh:step", "mh:48:riser": 2, rings: 6, "boot:8": 2, "mh:step": 8 } },
  // Under 7 ft a flat top, 8 in; under 6 ft a 2 ft base (D-915): 4.5 less 2.667 leaves 1 VF of riser and 10 in of rings.
  { id: "m4b-flat-top", kind: "structure-parts", input: { structureType: "sanitary_manhole", shape: "round", diaIn: 48, lengthFt: null, widthFt: null, wallIn: 5, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8, 8], vf: 4.5 }, expect: { keys: "mh:base:48 mh:48:riser rings mh:flat:48 casting:mh_sanitary boot:8 mh:step" } },
  // 6.49 VF: flat top under 7 ft, the 4 ft base from 6 ft (D-915): no longer taller than the manhole.
  { id: "q22-flat-under-7", kind: "structure-parts", input: { structureType: "sanitary_manhole", shape: "round", diaIn: 48, lengthFt: null, widthFt: null, wallIn: 5, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8, 8], vf: 6.49 }, expect: { keys: "mh:base:48 mh:48:riser rings mh:flat:48 casting:mh_sanitary boot:8 mh:step" } },
  // Stocked heights: 16.5 less 7 is 9.5: 2 of 4 ft, 1 rest 1.5: no 3, no 2, 18 in of rings.
  { id: "m4b-stocked", kind: "structure-parts", input: { structureType: "sanitary_manhole", shape: "round", diaIn: 48, lengthFt: null, widthFt: null, wallIn: 5, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8, 8], vf: 16.5, riserMode: "stocked" }, expect: { "mh:48:riser:4ft": 2, rings: 18 } },
  // Catch basin: box, 2 VF over its 4 ft, top slab, grate by default, a hood.
  { id: "m4b-catch-basin", kind: "structure-parts", input: { structureType: "sanitary_manhole", shape: "round", diaIn: 48, lengthFt: null, widthFt: null, wallIn: 5, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8, 8], structureType: "catch_basin", shape: "rect", diaIn: null, lengthFt: 4, widthFt: 4, vf: 6, hood: true, pipesIn: [15] }, expect: { keys: "catch_basin:box:4x4 catch_basin:4x4:riser catch_basin:top:4x4 casting:inlet_grate boot:15-18 inlet:hood", "catch_basin:4x4:riser": 2 } },
  // Cleanout: riser at its own 6 in the run's family, the wye run x cleanout.
  { id: "m4b-cleanout", kind: "structure-parts", input: { structureType: "sanitary_manhole", shape: "round", diaIn: 48, lengthFt: null, widthFt: null, wallIn: 5, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8, 8], structureType: "cleanout", diaIn: 6, vf: 7.25, pipesIn: [8], runCatalogKey: "pvc_d3034_sdr35:8" }, expect: { keys: "pipe:pvc_d3034_sdr35:6 wye:pvc_d3034_sdr35:8x6 cleanout:cap cleanout:box", "pipe:pvc_d3034_sdr35:6": 7.25 } },
  // Whole: EA to 6 ft and 2.5 VF past it; a headwall is whole whatever it says.
  { id: "m4b-whole", kind: "structure-parts", input: { structureType: "sanitary_manhole", shape: "round", diaIn: 48, lengthFt: null, widthFt: null, wallIn: 5, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8, 8], pricing: "whole", vf: 8.5 }, expect: { 'struct:sanitary_manhole:48': 1, 'struct:sanitary_manhole:48:vf': 2.5 } },
  { id: "m4b-headwall", kind: "structure-parts", input: { structureType: "sanitary_manhole", shape: "round", diaIn: 48, lengthFt: null, widthFt: null, wallIn: 5, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8, 8], structureType: "headwall", vf: 3 }, expect: { keys: "struct:headwall:48" } },
  // Cast in place, a 4 x 4 box, 6 VF, 6 in wall, 12 in slab: footprint 5 x 5 = 25 SF. Base 25, walls at mid-wall 18 x 0.5 x 6 = 54, top 25 x 8/12 = 16.67: 95.67 CF = 3.543 CY; rebar 354.3 lb; forms (16 + 20) x 6 = 216 SFCA.
  { id: "m4b-cast", kind: "structure-parts", input: { structureType: "sanitary_manhole", shape: "round", diaIn: 48, lengthFt: null, widthFt: null, wallIn: 5, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8, 8], structureType: "junction_box", shape: "rect", diaIn: null, lengthFt: 4, widthFt: 4, wallIn: 6, baseSlabIn: 12, construction: "cast_in_place", vf: 6, pipesIn: [] }, expect: { "cip:concrete": 3.5432098765432097, "cip:rebar": 354.320987654321, "cip:forms": 216 } },
  // --- F38 M5 (D-910): what a site line buys ---
  { id: "m5-borrow", kind: "site-materials", input: { role: "soil_import", unit: "LCY", name: "Soil Import" }, expect: { keys: "fill:common_borrow:fob", "fill:common_borrow:fob:qty": "QTY * 1.28", "fill:common_borrow:fob:unit": "TON" } },
  // D-1035: tipping keys are the material type's disposal fee (disposal:<type>); rock pays its own, at 1.35 t/LCY.
  { id: "m5-tipping-clean", kind: "site-materials", input: { role: "soil_export", unit: "LCY", name: "Soil Export" }, expect: { keys: "disposal:clean_soil" } },
  { id: "m5-tipping-unsuitable", kind: "site-materials", input: { role: "soil_export", unit: "LCY", variant: "unsuitable:Layer 2", name: "Unsuitable Export" }, expect: { keys: "disposal:unsuitable_soil" } },
  // Rock is inert: the clean fee (D-916).
  { id: "m10-spoils-rock", kind: "site-materials", input: { role: "spoils_export", unit: "LCY", name: "Utility spoils export, rock (107.90 BCY)" }, expect: { keys: "disposal:rock" } },
  { id: "m10-rock-clean", kind: "site-materials", input: { role: "soil_export", unit: "LCY", variant: "rock:Layer 3", name: "Rock Export" }, expect: { keys: "disposal:rock" } },
  { id: "m5-aggregate", kind: "site-materials", input: { role: "undercut_replace", unit: "CCY", name: "Undercut replacement fill", material: "Crushed Aggregate" }, expect: { keys: "aggregate_base", "aggregate_base:qty": "QTY * 1.98", "aggregate_base:waste": 5 } },
  { id: "m5-select-fill", kind: "site-materials", input: { role: "undercut_replace", unit: "CCY", name: "Undercut replacement fill", material: "Select Fill" }, expect: { keys: "select_fill", "select_fill:qty": "QTY * 1.62" } },
  { id: "m5-engineered-fill", kind: "site-materials", input: { role: "undercut_replace", unit: "CCY", name: "Undercut replacement fill", material: "Engineered Fill" }, expect: { keys: "engineered_fill", "engineered_fill:qty": "QTY * 1.62" } },
  { id: "m5-compacted-soil", kind: "site-materials", input: { role: "replacement_fill", unit: "CCY", name: "Replacement fill", material: "Compacted Soil" }, expect: { keys: "fill:compacted_soil", "fill:compacted_soil:qty": "QTY * 1.8" } },
  // D-940: Structural Fill takes engineered fill's key; rock's tipping tons use rock's 1.35 t/LCY, soil's stay 1.28.
  { id: "d940-structural-fill", kind: "site-materials", input: { role: "replacement_fill", unit: "CCY", name: "Replacement fill", material: "Structural Fill" }, expect: { keys: "engineered_fill", "engineered_fill:qty": "QTY * 1.62" } },
  { id: "d940-rock-tipping", kind: "site-materials", input: { role: "soil_export", unit: "LCY", variant: "rock:Layer 3", name: "Rock Export" }, expect: { keys: "disposal:rock", "disposal:rock:qty": "QTY * 1.35" } },
  { id: "d940-rock-spoils", kind: "site-materials", input: { role: "spoils_export", unit: "LCY", name: "Utility spoils export, rock (107.90 BCY)" }, expect: { keys: "disposal:rock", "disposal:rock:qty": "QTY * 1.35" } },
  { id: "d940-soil-tipping", kind: "site-materials", input: { role: "soil_export", unit: "LCY", name: "Soil Export" }, expect: { keys: "disposal:clean_soil", "disposal:clean_soil:qty": "QTY * 1.28" } },
  // D-1007 (Q198): flowable fill buys its CY as CLSM; D-1004 (Q196): clay liner and pit run by the project's shrink x swell.
  { id: "m5-flowable", kind: "site-materials", input: { role: "replacement_fill", unit: "CCY", name: "Replacement fill", material: "Flowable Fill" }, expect: { keys: "flowable:flowable_fill_clsm", "flowable:flowable_fill_clsm:qty": "QTY * 1" } },
  { id: "d1004-clay-liner", kind: "site-materials", input: { role: "replacement_fill", unit: "CCY", name: "Replacement fill", material: "Clay liner (compacted, low-permeability)", matFactor: 1.4375 }, expect: { keys: "fill:clay", "fill:clay:qty": "QTY * 1.4375", "fill:clay:unit": "CY" } },
  { id: "d1004-pit-run", kind: "site-materials", input: { role: "undercut_replace", unit: "CCY", name: "Undercut replacement fill", material: "Pit run gravel", matFactor: 1.4375 }, expect: { keys: "agg:pit_run_gravel:delivered", "agg:pit_run_gravel:delivered:qty": "QTY * 1.84" } },
  // D-1008 (Q199): a GCL is priced furnished and installed, by the SF.
  { id: "d1008-gcl", kind: "site-materials", input: { role: "geosynthetics", unit: "SY", variant: "layer:1|installed", name: "Geosynthetic clay liner (GCL), 10 % overlap, installed (public bids)", matKey: "site:gcl" }, expect: { keys: "site:gcl:installed", "site:gcl:installed:qty": "QTY * 9", "site:gcl:installed:unit": "SF" } },
  // D-1135: a Soil Import buys the material its fill type names (at the pit, the line's own trucks haul it);
  // hydrated lime and portland cement are the library's agent:lime and agent:cement.
  { id: "m5-import-select", kind: "site-materials", input: { role: "soil_import", unit: "LCY", name: "Soil Import — Select Borrow (8,065 BCY)" }, expect: { keys: "fill:select:fob", "fill:select:fob:qty": "QTY", "fill:select:fob:unit": "CY" } },
  { id: "m5-import-sand", kind: "site-materials", input: { role: "soil_import", unit: "LCY", name: "Soil Import — Sand (100 BCY)" }, expect: { keys: "fill:sand:fob", "fill:sand:fob:qty": "QTY * 1.28", "fill:sand:fob:unit": "TON" } },
  { id: "m5-import-engineered", kind: "site-materials", input: { role: "soil_import", unit: "LCY", name: "Soil Import — Engineered Fill (100 BCY)" }, expect: { keys: "fill:common_borrow:fob" } },
  { id: "m5-agent-hydrated", kind: "site-materials", input: { role: "undercut_agent_1", unit: "TON", name: "Hydrated Lime (6% of dry wt @ 110 pcf)" }, expect: { keys: "agent:lime" } },
  { id: "m5-agent-cement", kind: "site-materials", input: { role: "stabilize_agent_1", unit: "TON", name: "Portland Cement (5%, 110 pcf)" }, expect: { keys: "agent:cement" } },
  // D-1144: past 20 ft a PE's design of the protective system, one a run, at its stated price.
  { id: "m5-pe-design", kind: "line-materials", input: { role: "trench_pe_design", unit: "EA", variant: "pe_design", name: "PE-designed protective system (OSHA 1926.652), trench deeper than 20 ft", utility: "sanitary" }, expect: { "service:pe_shoring_design:unit": "EA", "service:pe_shoring_design:qty": "QTY" } },
  { id: "m5-agent", kind: "site-materials", input: { role: "stabilize_agent_1", unit: "TON", name: "Lime (5%, 110 pcf)" }, expect: { keys: "agent:lime", "agent:lime:waste": 3 } },
  { id: "m5-fabric", kind: "site-materials", input: { role: "geosynthetics", unit: "SY", variant: "geogrid", name: "Geogrid, 10% overlap" }, expect: { keys: "geogrid:site", "geogrid:site:qty": "QTY / 500", "geogrid:site:unit": "ROLL" } },
  { id: "m5-metric", kind: "site-materials", input: { role: "soil_import", unit: "LCM", name: "Soil Import" }, expect: { "fill:common_borrow:fob:qty": "QTY / 0.764554857984 * 1.28" } },
  // --- F38 M8 (D-912): fusion hours from joints: 15.5 min per inch of wall, 40 ft joints ---
  // 8" DR 11: wall 0.784 in (8.625 / 11): 12.152 min a joint.
  // The machine is on A19's tiers, rented (D-914): the pipe line buys none, and carries its joint for the check.
  { id: "m8-fusion", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "hdpe_ips_dr11:8|1|0-6", name: '8" HDPE DR 11', utility: "force_main" }, expect: { keys: "pipe:hdpe_ips_dr11:8 fit:pipe:hdpe_ips_dr11:8 tracer_wire warning_tape" } },
  // Joints a 10-hour day inside McElroy's published ranges (D-914): 8 in 24–48, 12 in 12–24, 24 in 10–16.
  { id: "q31-joints-per-day", kind: "fusion-joints", keys: ["hdpe_ips_dr11:8", "hdpe_ips_dr11:12", "hdpe_ips_dr11:24"], expect: { "hdpe_ips_dr11:8": 27.1, "hdpe_ips_dr11:12": 18.2, "hdpe_ips_dr11:24": 11.1, inside: true } },
  // A gasketed pipe buys no fusion.
  { id: "m8-no-fusion", kind: "line-materials", input: { role: "utility_pipe", unit: "LF", variant: "pvc_c900_dr18:8|1|0-6", name: '8" C900', utility: "water" }, expect: { keys: "pipe:pvc_c900_dr18:8 fit:pipe:pvc_c900_dr18:8 tracer_wire warning_tape" } },
  // Undercut methods (D-922): 100 BCY, swell 1.25. Dozer and a haul: the dig, the load, the haul, the refill.
  { id: "d922-dozer-haul", kind: "lines", input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }], features: [{ itemId: "pad", undercut: { volumeCF: 2700, depthFt: 1.5, areaSF: 1800, material: "Select Fill", disposition: "haul_off" } }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.25, choices: { surplus: {}, method: "excavator", push_ft: 100, method_by_feature: {}, undercuts: { pad: { dig: "dozer", goes: "haul_off" } } } } }, expect: { "undercut_push:pad": 100, "undercut_load:pad": 125, "undercut_haul:pad": 125, "undercut_replace:pad": 100 } },
  // Treated in place: no dig, no spoil, no refill; 1,800 SF is 200 SY.
  { id: "d922-in-place", kind: "lines", input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }], features: [{ itemId: "pad", undercut: { volumeCF: 2700, depthFt: 1.5, areaSF: 1800, material: "Select Fill", disposition: "haul_off" } }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.25, choices: { surplus: {}, method: "excavator", push_ft: 100, method_by_feature: {}, undercuts: { pad: { goes: "in_place" } } } } }, expect: { "treat_in_place:pad": 200, "undercut:pad": undefined, "undercut_replace:pad": undefined } },
  // Problem 4: the surplus chosen for undercut spoil reaches a simple undercut.
  { id: "d922-problem-4", kind: "lines", input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }], features: [{ itemId: "pad", undercut: { volumeCF: 2700, depthFt: 1.5, areaSF: 1800, material: "Select Fill", disposition: "haul_off" } }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.25, choices: { surplus: { undercut_spoil: "waste" }, method: "excavator", push_ft: 100, method_by_feature: {}, undercuts: null } } }, expect: { "undercut:pad": 100, "soil_waste:pad": 100, "undercut_haul:pad": undefined } },
  { id: "d922-dig-shallow", kind: "suggest-dig", input: { depthFt: 1.5, areaSF: 20432, widthFt: 143 }, expect: { dig: "dozer" } },
  { id: "d922-dig-deep", kind: "suggest-dig", input: { depthFt: 4, areaSF: 14831, widthFt: 121 }, expect: { dig: "excavator" } },
  { id: "d922-dig-between", kind: "suggest-dig", input: { depthFt: 2.5, areaSF: 14831, widthFt: 121 }, expect: { dig: null } },
  { id: "d922-dig-confined", kind: "suggest-dig", input: { depthFt: 1.5, areaSF: 900, widthFt: 15 }, expect: { dig: "excavator" } },
  // The bottom of the hole (D-923): 1,800 SF is 200 SY; geotextile with 10 % overlap, 220; prep keeps the feature's other 1,200 SF.
  { id: "d923-bottom", kind: "lines", input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }], features: [{ itemId: "pad", undercut: { volumeCF: 2700, depthFt: 1.5, areaSF: 1800, material: "Select Fill", disposition: "haul_off", belowWater: true }, prep: { areaSF: 3000, depthFt: 0.5 } }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.25, choices: { surplus: {}, method: "excavator", push_ft: 100, method_by_feature: {}, undercuts: { pad: { proofRoll: true, geotextile: true } } } } }, expect: { "proof_roll:pad": 200, "geosynthetics:pad": 220, "dewatering:pad": 1, "prep:pad": 1200 } },
  { id: "d923-prep-whole-under", kind: "lines", input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }], features: [{ itemId: "pad", undercut: { volumeCF: 2700, depthFt: 1.5, areaSF: 1800, material: "Select Fill", disposition: "haul_off" }, prep: { areaSF: 1800, depthFt: 0.5 } }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.25, choices: { surplus: {}, method: "excavator", push_ft: 100, method_by_feature: {}, undercuts: null } } }, expect: { "prep:pad": undefined } },
  { id: "d923-in-place-is-prep", kind: "lines", input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 0, fillCY: 0 }], features: [{ itemId: "pad", undercut: { volumeCF: 2700, depthFt: 1.5, areaSF: 1800, material: "Select Fill", disposition: "haul_off" }, prep: { areaSF: 3000, depthFt: 0.5 } }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.25, choices: { surplus: {}, method: "excavator", push_ft: 100, method_by_feature: {}, undercuts: { pad: { goes: "in_place" } } } } }, expect: { "prep:pad": undefined, "treat_in_place:pad": 200 } },
  // Item b: a trench line on a pressure run reads its own crew: HDPE the fused crew's A19, else A18; gravity keeps A12.
  { id: "b-trench-hdpe", kind: "crew-none", line: { name: "Trench excavation", earthwork_region_id: "util:water" }, items: [{ name: '8" HDPE', earthwork_region_id: "util:water", earthwork_role: "utility_pipe" }], expect: { included: "fused" } },
  { id: "b-trench-pvc", kind: "crew-none", line: { name: "Trench excavation", earthwork_region_id: "util:water" }, items: [{ name: '8" PVC C900', earthwork_region_id: "util:water", earthwork_role: "utility_pipe" }], expect: { included: "pressure" } },
  { id: "b-trench-gravity", kind: "crew-none", line: { name: "Trench excavation", earthwork_region_id: "util:sanitary" }, items: [], expect: { included: "gravity" } },
  // Group by Assembly (D-938): a system line shared by two runs at their own quantities; a pipe's LF drives each run; a
  // structure is 1 EA with its VF; a plain item is its own parent; export and import together show a total only.
  { id: "d938-runs-and-structure", kind: "assembly-group", items: [{ uuid: "a", name: "Trench excavation", unit: "BCY", effective_quantity: 300, earthwork_role: "utility_trench_excavation", earthwork_region_id: "util:storm", earthwork_variant: "trench:L1" }, { uuid: "b", name: '8" pipe', unit: "LF", effective_quantity: 500, earthwork_role: "utility_pipe", earthwork_region_id: "util:storm", earthwork_variant: "p" }, { uuid: "c", name: "Structure base", unit: "EA", effective_quantity: 1, earthwork_role: "utility_structure", earthwork_region_id: "util:storm", earthwork_variant: "s" }], owners: [{ id: "r1", name: "Run 1", lines: [{ regionId: "util:storm", role: "utility_trench_excavation", variant: "trench:L1", quantity: 200 }, { regionId: "util:storm", role: "utility_pipe", variant: "p", quantity: 310 }] }, { id: "r2", name: "Run 2", lines: [{ regionId: "util:storm", role: "utility_trench_excavation", variant: "trench:L1", quantity: 100 }, { regionId: "util:storm", role: "utility_pipe", variant: "p", quantity: 190 }] }, { id: "s1", name: "MH-1", structure: true, vf: 8.5, lines: [{ regionId: "util:storm", role: "utility_structure", variant: "s", quantity: 1 }] }], expect: { "Run 1": "310 LF", "Run 2": "190 LF", "MH-1": "1 EA 8.5 VF" } },
  { id: "d938-plain-item", kind: "assembly-group", items: [{ uuid: "a", name: "Door", unit: "EA", effective_quantity: 6 }], expect: { Door: "6 EA" } },
  { id: "d938-mixed-total-only", kind: "assembly-group", items: [{ uuid: "a", name: "Export", unit: "LCY", effective_quantity: 900, earthwork_role: "soil_export", earthwork_region_id: "balance" }, { uuid: "b", name: "Import", unit: "LCY", effective_quantity: 100, earthwork_role: "soil_import", earthwork_region_id: "balance" }], expect: { Export: "900 LCY", Import: "100 LCY" } },
  // Suggestions (D-920): 180 ft pushes, 800 ft scrapes, 4,000 ft trucks; rock is excavator whatever is above it; a steep pocket is noted.
  // A choice of scraper on the second pocket (its cell "1") of 100 and 300 CY soil, the first keeping dozer: 25 % dozer, 75 % scraper.
  { id: "d920-suggest", kind: "suggest", pockets: [{ cy: 100, ft: 180 }, { cy: 300, ft: 800, steep: 12 }, { cy: 500, ft: 4000, rock: 200 }], expect: { methods: "cut-1:soil:dozer cut-2:soil:scraper cut-3:soil:excavator cut-3:rock:excavator", notes: 1, shares: '{"excavator":0.5714285714285714,"scraper":0.42857142857142855}' } },
  // Site figures (D-918): a 100 × 100 ft cut 10 ft deep, its fill 300 ft east, 5 ft down at the centroids (105 to 95): -3.33 %.
  // A second cut on ground at 40 % reads 40 % and all steep; a 1 ft sliver of 3.7 CY is no pocket.
  { id: "d918-pockets", kind: "site-figures", expect: { pockets: 3, cy: 3703.7, avg: 10, deepest: 10, dist: 300, grade: -3.33, slope: 40, steep: 100 } },
  // D-899: the method is out of the key; a result saved with choices keeps them as its held key, whatever the method is now.
  { id: "d899-held-key", kind: "held-key", expect: { method: true, held: true, differs: true } },
  // Every structure type's parts (M4b): 6 VF, 2 ft of riser over a 4 ft box.
  { id: "s1-curb-inlet", kind: "structure-parts", input: { structureType: "curb_inlet", shape: "rect", diaIn: null, lengthFt: 4, widthFt: 4, wallIn: 6, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8], vf: 6 }, expect: { keys: "curb_inlet:box:4x4 curb_inlet:4x4:riser curb_inlet:top:4x4 casting:inlet_curb boot:8" } },
  { id: "s1-area-drain", kind: "structure-parts", input: { structureType: "area_drain", shape: "rect", diaIn: null, lengthFt: 4, widthFt: 4, wallIn: 6, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8], vf: 6 }, expect: { keys: "area_drain:box:4x4 area_drain:4x4:riser area_drain:top:4x4 casting:inlet_grate boot:8" } },
  { id: "s1-junction-box", kind: "structure-parts", input: { structureType: "junction_box", shape: "rect", diaIn: null, lengthFt: 4, widthFt: 4, wallIn: 6, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8], vf: 6 }, expect: { keys: "box:4x4 box:4x4:riser box:top:4x4 casting:box boot:8" } },
  { id: "s1-valve-vault", kind: "structure-parts", input: { structureType: "valve_vault", shape: "rect", diaIn: null, lengthFt: 4, widthFt: 4, wallIn: 6, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8], vf: 6 }, expect: { keys: "vault:4x4 vault:4x4:riser vault:top:4x4 boot:8" } },
  { id: "s1-lift-station", kind: "structure-parts", input: { structureType: "lift_station", shape: "rect", diaIn: null, lengthFt: 4, widthFt: 4, wallIn: 6, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8], vf: 8 }, expect: { keys: "struct:lift_station:4x4 struct:lift_station:4x4:vf" } },
  { id: "s1-whole-custom", kind: "structure-parts", input: { structureType: "custom", shape: "rect", diaIn: null, lengthFt: 4, widthFt: 4, wallIn: 6, baseSlabIn: 8, construction: "precast", pricing: "parts", inletKind: null, hood: false, top: null, riserMode: "per_vf", pipesIn: [8], pricing: "whole", vf: 5 }, expect: { keys: "struct:custom:4x4" } },
  // --- F38 M7 (D-913): a supplier's names against the catalog; nothing near, no match ---
  { id: "m7-match", kind: "material-match", names: ['8" PVC SDR-35 (ASTM D3034)', "#57 stone", "Unobtainium gasket kit", "8 in PVC SDR35 (ASTM D3034)", "8-inch PVC SDR 35 (ASTM D3034)"], expect: { '8" PVC SDR-35 (ASTM D3034)': "pipe:pvc_d3034_sdr35:8", "#57 stone": "stone:_57_stone", "Unobtainium gasket kit": null, "8 in PVC SDR35 (ASTM D3034)": "pipe:pvc_d3034_sdr35:8", "8-inch PVC SDR 35 (ASTM D3034)": "pipe:pvc_d3034_sdr35:8" } },
  // --- D-901: the fill's shares: soil cut over its shrink, by method, the rest by truck ---
  // 1,000 BCY pushed / 1.25 = 800 CCY of 2,000: 40 %, the other 1,200 by truck.
  {
    id: "d901-push-share",
    kind: "lines",
    input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 1000, fillCY: 2000 }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.25, choices: { surplus: {}, method: "dozer", push_ft: 100, method_by_feature: {} } } },
    expect: { roles: "cut_push:remainder fill_push:remainder fill:remainder soil_import:__soil_import__", "fill_push:remainder": 800, "fill:remainder": 1200 },
  },
  // More cut than fill: the whole fill by the scraper. D-1037: the fill needs 500 x 1.25 = 625 BCY, scraped; the other
  // 375 BCY leaves, loaded straight into the haul-off trucks.
  {
    id: "d901-cut-past-fill",
    kind: "lines",
    input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 1000, fillCY: 500 }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.25, choices: { surplus: {}, method: "scraper", push_ft: 100, method_by_feature: {} } } },
    expect: { roles: "cut_export:remainder cut_scraper:remainder fill_scraper:remainder soil_export:__soil_export__", "fill_scraper:remainder": 500, "cut_export:remainder": 375, "cut_scraper:remainder": 625 },
  },
  // A feature's own method: 500 BCY by dozer, 750 by scraper, fill 1,000: 40 % and 60 %, nothing by truck.
  {
    id: "d901-two-methods",
    kind: "lines",
    input: { units: "CY", regions: [{ id: "pad", label: "Pad", cutCY: 500, fillCY: 0 }, { id: null, label: "Remainder", cutCY: 750, fillCY: 1000 }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.25, choices: { surplus: {}, method: "scraper", push_ft: 100, method_by_feature: { pad: "dozer" }, fill_shares: null } } },
    expect: { roles: "cut_push:pad cut_scraper:remainder fill_push:remainder fill_scraper:remainder", "fill_push:remainder": 400, "fill_scraper:remainder": 600 },
  },
  // Typed: 25 % pushed whatever the cut says; the haul-road water follows the scraper's share at 1,000 ft.
  {
    id: "d901-typed",
    kind: "lines",
    input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 1000, fillCY: 1000 }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.25, choices: { surplus: {}, method: "excavator", push_ft: 100, method_by_feature: {}, scraper_haul_ft: 1000, fill_shares: { push: 25, scraper: 50 } } } },
    expect: { roles: "cut:remainder fill_push:remainder fill_scraper:remainder fill:remainder haul_road_water:haul-road soil_import:__soil_import__", "fill_push:remainder": 250, "fill_scraper:remainder": 500, "fill:remainder": 250, "haul_road_water:haul-road": 500 },
  },
  // --- D-896: one haul on an over-excavation; rock re-used writes its line and joins the balance ---
  // 100 CY dug, 80 clay and 20 rock, all hauled off: every yard of the dig on A2, nothing on A1. Export (1,000 - 500) x 1.25 = 625.
  {
    id: "d896-overex-all-leaves",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 1000, fillCY: 500 }],
      features: [{ itemId: "pad", label: "Pad", prep: null, undercut: { depthFt: 4, offsetFt: 0, areaSF: 1, volumeCF: 2700, material: "Select Fill", disposition: "haul_off", overex: { mode: "fixed", layer: null, elevationFt: null, slopeH: 0, dMaxFt: 4, uncoveredSF: 0, notes: [], byLayer: [{ layerId: "L1", name: "Clay", cf: 2160, unsuitable: false, rock: false }, { layerId: "L3", name: "Rock", cf: 540, unsuitable: false, rock: true }], stack: [{ material: "Select Fill", native: false, thicknessFt: null, cf: 2700 }] } } }],
      assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1, choices: { surplus: {}, method: "excavator", push_ft: 100, method_by_feature: {} } },
    },
    expect: {
      // D-1037: the 500 BCY of surplus leaves from the cut, the other 500 goes to fill.
      roles: "over_excavation:pad over_excavation:pad undercut_haul:pad undercut_haul:pad replacement_fill:pad cut_export:remainder cut:remainder fill:remainder soil_export:__soil_export__",
      "soil_export:__soil_export__": 625,
      "cut_export:remainder": 500,
      "cut:remainder": 500,
    },
  },
  // The clay stockpiled, the rock hauled: 80 on A1 kept on site, 20 on A2.
  {
    id: "d896-overex-clay-stays",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 1000, fillCY: 500 }],
      features: [{ itemId: "pad", label: "Pad", prep: null, undercut: { depthFt: 4, offsetFt: 0, areaSF: 1, volumeCF: 2700, material: "Select Fill", disposition: "stockpile", overex: { mode: "fixed", layer: null, elevationFt: null, slopeH: 0, dMaxFt: 4, uncoveredSF: 0, notes: [], byLayer: [{ layerId: "L1", name: "Clay", cf: 2160, unsuitable: false, rock: false }, { layerId: "L3", name: "Rock", cf: 540, unsuitable: false, rock: true }], stack: [{ material: "Select Fill", native: false, thicknessFt: null, cf: 2700 }] } } }],
      assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1, choices: { surplus: {}, method: "excavator", push_ft: 100, method_by_feature: {} } },
    },
    expect: {
      roles: "over_excavation_onsite:pad over_excavation:pad undercut_stockpile:pad undercut_haul:pad replacement_fill:pad cut_export:remainder cut:remainder fill:remainder soil_export:__soil_export__",
      "over_excavation_onsite:pad": 80,
      "over_excavation_onsite:pad:name": "Undercut excavation, Pad, Clay, kept on site",
      "over_excavation:pad": 20,
    },
  },
  // The 20 CY of rock re-used: its line, 20 CCY, and the balance takes it as cut: (1,020 - 500) x 1.25 = 650.
  {
    id: "d896-overex-rock-reused",
    kind: "lines",
    input: {
      units: "CY",
      regions: [{ id: null, label: "Remainder", cutCY: 1000, fillCY: 500 }],
      features: [{ itemId: "pad", label: "Pad", prep: null, undercut: { depthFt: 4, offsetFt: 0, areaSF: 1, volumeCF: 2700, material: "Select Fill", disposition: "haul_off", overex: { mode: "fixed", layer: null, elevationFt: null, slopeH: 0, dMaxFt: 4, uncoveredSF: 0, notes: [], byLayer: [{ layerId: "L1", name: "Clay", cf: 2160, unsuitable: false, rock: false }, { layerId: "L3", name: "Rock", cf: 540, unsuitable: false, rock: true }], stack: [{ material: "Select Fill", native: false, thicknessFt: null, cf: 2700 }] } } }],
      assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1, choices: { surplus: { undercut_spoil: "reuse" }, method: "excavator", push_ft: 100, method_by_feature: {} } },
    },
    expect: {
      // D-1037: 520 BCY leaves, all of it from the cut (1,000 BCY; the rock fills too): 520 to export, 480 to fill.
      roles: "over_excavation:pad over_excavation_onsite:pad undercut_haul:pad undercut_reuse_fill:pad replacement_fill:pad cut_export:remainder cut:remainder fill:remainder soil_export:__soil_export__",
      "cut_export:remainder": 520,
      "cut:remainder": 480,
      "over_excavation:pad": 80,
      "over_excavation_onsite:pad": 20,
      "undercut_reuse_fill:pad": 20,
      "undercut_reuse_fill:pad:unit": "CCY",
      "soil_export:__soil_export__": 650,
    },
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
      "strip:s1:name": 'Strip topsoil (6")',
      "strip_reuse_fill:s1": 50,
      "soil_import:__soil_import__": 187.5,
      // D-177: the import's bank figure in brackets, 300 - 150 = 150 BCY; fill is compacted.
      "soil_import:__soil_import__:name": "Soil Import — Select fill (low-PI clay), 1.35 t/LCY loose, 1.66 t/CY compacted (spec term — confirm the material) (150 BCY)",
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
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 2, offsetFt: 0, areaSF: 0, volumeCF: 270, material: "Select Fill", disposition: "reuse" }, prep: { depthFt: 1, lifts: 2, areaSF: 135 } }],
      assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1 / 0.9 },
    },
    expect: {
      roles: "undercut:pad undercut_reuse_fill:pad undercut_replace:pad prep:pad cut:remainder fill:remainder soil_import:__soil_import__",
      "undercut:pad": 10,
      "undercut:pad:name": 'Undercut excavation, Pad (24")',
      "undercut_reuse_fill:pad": 9,
      "undercut_reuse_fill:pad:unit": "CCY",
      "undercut_replace:pad": 10,
      "undercut_replace:pad:name": "Undercut replacement fill, Select Fill",
      "prep:pad": 135,
      "prep:pad:name": 'Prepare subgrade (12", 2 lifts)',
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
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 0.5, offsetFt: 0, areaSF: 0, volumeCF: 353.146667, material: "Engineered Fill", disposition: "haul_off" }, prep: { depthFt: 0.5, lifts: 1, areaSF: 100 } }],
      assumptions: null,
    },
    expect: {
      roles: "undercut:pad undercut_haul:pad undercut_replace:pad prep:pad",
      "undercut:pad": 10,
      "undercut:pad:unit": "BCM",
      "undercut_haul:pad": 12.5,
      "undercut_haul:pad:unit": "LCM",
      "undercut:pad:name": "Undercut excavation, Pad (15.2cm)",
      "prep:pad": 9.290304,
      "prep:pad:unit": "M²",
      "prep:pad:name": "Prepare subgrade (15.2cm, 1 lift)",
    },
  },
  // D-405 Soil Stabilization, by hand: 10,000 SF = 1,111.1 SY; tons = SF x ft x pcf x % / 2000.
  // 10,000 x 1 x 110 x 0.06 / 2000 = 33.0; at 8 % 44.0; 16" (4/3 ft) at 6 % 44.0;
  // a blend 3 % + 10 % = 16.5 + 55.0. The parent and the mix read the SY. D-983 (Q155): the agents' tons spread
  // ahead of the mixer (one line, their sum) and the mixed layer compacted (the SF).
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
      roles: ["stabilize:pad", "stabilize_mix:pad", "stabilize_spread:pad", "stabilize_compact:pad", ...c.agents.map((_, k) => `stabilize_agent_${k + 1}:pad`)].join(" "),
      "stabilize:pad": 10000 / 9,
      "stabilize:pad:unit": "SY",
      // A count stored before D-406 reads as its thickness, depth / count: here the depth itself.
      "stabilize:pad:name": `Soil stabilization, ${c.agents.map(([a, p]) => `${a} ${p}%`).join(" + ")}, ${c.depth} in ${c.depth} lifts (1 lift)`,
      "stabilize_mix:pad": 10000 / 9,
      "stabilize_mix:pad:unit": "SY",
      "stabilize_mix:pad:name": "Mix in place (reclaimer)",
      "stabilize_spread:pad": c.tons.reduce((a, b) => a + b, 0),
      "stabilize_spread:pad:unit": "TON",
      "stabilize_compact:pad": 10000,
      "stabilize_compact:pad:unit": "SF",
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
      "stabilize:pad:name": "Soil stabilization, Hydrated Lime 6%, 30.5cm in 30.5cm lifts (1 lift)",
      "stabilize_agent_1:pad": 29.93709642,
      "stabilize_agent_1:pad:unit": "TONNE",
      "stabilize_agent_1:pad:name": "Hydrated Lime (6% of dry wt @ 1,762 kg/m³)",
    },
  },
  // The other two methods stay one SF line each (D-405 7), named as D-406 3 has them:
  // Compacted Subgrade carries no lifts; a count stored before D-406 reads as depth / count. D-974: deeper than one
  // 8 in lift it is taken out and put back in lifts (135 SF x 1 ft = 5 BCY, 5 CY), the top rolled.
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
      // D-983 (Q155): a scarify's own pass and its water (110 pcf x 3 % x 0.5 ft x 9 / 8.33 = 1.78 gal/SY).
      roles: "undercut_native_dig:a undercut_native:a prep:a prep_scarify:b prep_moisture:b prep:b",
      "prep_scarify:b": 200,
      "prep_scarify:b:unit": "SF",
      "prep_moisture:b": 200,
      "prep_moisture:b:name": 'Moisture condition subgrade, 6" (water truck; +3 % moisture, 1.78 gal/SY)',
      "undercut_native_dig:a": 5,
      "undercut_native:a": 5,
      "prep:a": 135,
      "prep:a:unit": "SF",
      "prep:a:name": "Compact subgrade, top surface",
      "prep:b": 200,
      "prep:b:name": 'Scarify, moisture condition and compact, 6" in 6" lifts (1 lift)',
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
      "prep:a:name": 'Scarify, moisture condition and compact, 24" in 8" lifts (3 lifts)',
      "prep:b:name": 'Scarify, moisture condition and compact, 20" in 8" lifts (3 lifts, 95% Std Proctor)',
      "stabilize:c:name": 'Soil stabilization, Hydrated Lime 6%, 12" in 12" lifts (1 lift)',
      "stabilize:c": 10000 / 9,
      "stabilize_agent_1:c": 33,
      // The founder's row: 2,288.39 SY = 20,595.54 SF; x 2 ft x 110 x 0.06 / 2000 = 135.93 TON.
      "stabilize:d:name": 'Soil stabilization, Hydrated Lime 6%, 24" in 12" lifts (2 lifts)',
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
      "prep:t2:name": 'Scarify, moisture condition and compact, 8" in 4" lifts (2 lifts, 95% Std Proctor)',
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
      roles: "undercut:pad undercut_haul:pad undercut_replace:pad",
      "undercut:pad": 20000 / 27,
      "undercut_haul:pad": (20000 / 27) * 1.25,
      "undercut_replace:pad": 20000 / 27,
      "undercut_replace:pad:name": "Undercut replacement fill, Engineered Fill",
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
    expect: { "undercut_replace:pad:name": 'Undercut replacement fill, Engineered Fill, 24" in 8" lifts (3 lifts)' },
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
      // D-1037: the 74.07 BCY the native undercut is short stays as cut; the rest, 925.93 BCY, leaves.
      roles: "undercut_native_dig:pad undercut_native:pad cut_export:remainder cut:remainder soil_export:__soil_export__",
      "cut_export:remainder": 1000 - (20000 / 27) * 0.1,
      "cut:remainder": (20000 / 27) * 0.1,
      "undercut_native_dig:pad": 20000 / 27,
      "undercut_native_dig:pad:unit": "BCY",
      "undercut_native:pad": 20000 / 27,
      "undercut_native:pad:unit": "CY",
      "undercut_native:pad:name": 'Undercut and recompact native soil, 24" in 8" lifts (3 lifts)',
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
      roles: "undercut_native_dig:pad undercut_native:pad soil_import:__soil_import__",
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
      roles: "undercut_stabilize:pad undercut_stabilize_mix:pad undercut_agent_1:pad",
      "undercut_stabilize:pad": 20000 / 27,
      "undercut_stabilize:pad:name": 'Undercut and stabilize native soil, Hydrated Lime 6%, 24" in 12" lifts (2 lifts)',
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
      "undercut_stabilize:pad:name": "Undercut and stabilize native soil, Hydrated Lime 6%, 61cm in 30.5cm lifts (2 lifts)",
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
      "stabilize:pad:name": 'Soil stabilization, Hydrated Lime 40 lb/SY, 12" in 12" lifts (1 lift)',
      "stabilize_agent_1:pad": ((10000 / 9) * 40) / 2000,
      "stabilize_agent_1:pad:name": "Hydrated Lime (40 lb/SY)",
    },
  },
  // D-406 3: Compacted Subgrade with a compaction spec, and one typed. D-974: the 12 in one in lifts, its top line named so.
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
      "prep:a:name": "Compact subgrade, top surface (95% Std Proctor)",
      "prep:b:name": 'Compacted subgrade, 6" (100% Standard Proctor)',
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
      // D-1037: not suitable, all the cut leaves, each region's straight into the trucks: no "Cut" line.
      roles: "strip:s1 strip_stockpile:s1 strip:s2 strip_reuse_topsoil:s2 undercut:pad undercut_stockpile:pad undercut_replace:pad cut_export:park fill:park cut_export:remainder fill:remainder soil_export:__soil_export__ soil_import:__soil_import__",
      "cut_export:park": 60,
      "cut_export:remainder": 40,
      "strip_stockpile:s1": 125,
      "strip_stockpile:s1:name": "Strip topsoil, stockpile on site",
      "strip_reuse_topsoil:s2": 40,
      "strip_reuse_topsoil:s2:unit": "BCY",
      "strip:s2:name": 'Strip topsoil (4")',
      "undercut_stockpile:pad": 12.5,
      "undercut_replace:pad:name": "Undercut replacement fill, Crushed Stone #57",
      "cut_export:park:name": "Cut to export, Parking",
      "fill:remainder:name": "Fill, Remainder",
      "soil_export:__soil_export__": 125,
      "soil_export:__soil_export__:name": "Soil Export (100 BCY)",
      "soil_import:__soil_import__": 100,
      "soil_import:__soil_import__:name": "Soil Import — Select fill (low-PI clay), 1.35 t/LCY loose, 1.66 t/CY compacted (80 BCY)",
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
      // D-1037: the 4,663.3 BCY surplus is cut loaded straight into the trucks; the 9,599.7 the fill needs stays "Cut".
      roles: "cut_export:remainder cut:remainder fill:remainder soil_export:__soil_export__",
      "cut_export:remainder": 4663.3,
      "cut:remainder": 9599.7,
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
      "soil_import:__soil_import__:name": "Soil Import — Select fill (low-PI clay), 1.35 t/LCY loose, 1.66 t/CY compacted (spec term — confirm the material) (230 BCY)",
    },
  },
  // Metric, thousands separated: cut 2,500.4 BCM, no fill, swell 1.2: export 3,000.48 LCM,
  // named "(2,500 BCM)"; no fill, so no Fill line at 0 (D-1068 c).
  {
    id: "lines-metric-export-name",
    kind: "lines",
    input: { units: "m3", regions: [{ id: null, label: "Remainder", cutCY: 2500.4, fillCY: 0 }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.2, shrink: 1 } },
    expect: {
      "fill:remainder": undefined,
      "soil_export:__soil_export__": 3000.48,
      "soil_export:__soil_export__:unit": "LCM",
      "soil_export:__soil_export__:name": "Soil Export (2,500 BCM)",
    },
  },
  // --- D-1037: the cut split by where it goes, cut to export loaded straight into the haul-off trucks (A2, no ADTs) ---
  // All export: cut 1,200 BCY, no fill: the whole cut leaves, one "Cut to export" line of 1,200 BCY and no "Cut"; the
  // trucks carry 1,200 x 1.25 = 1,500 LCY. Priced, A2's excavator hours equal the A7 trucks' days x hours (the api's
  // pacing, not read here).
  {
    id: "d1037-all-export",
    kind: "lines",
    input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 1200, fillCY: 0 }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.1 } },
    expect: {
      roles: "cut_export:remainder soil_export:__soil_export__",
      "cut_export:remainder": 1200,
      "cut_export:remainder:unit": "BCY",
      "cut_export:remainder:name": "Cut to export",
      "cut:remainder": undefined,
      "soil_export:__soil_export__": 1500,
    },
  },
  // Balanced: cut 1,100 BCY, fill 1,000 CCY x 1.10 = 1,100 BCY: nothing leaves, no "Cut to export".
  {
    id: "d1037-balanced",
    kind: "lines",
    input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 1100, fillCY: 1000 }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1.1 } },
    expect: { roles: "cut:remainder fill:remainder", "cut:remainder": 1100, "cut_export:remainder": undefined },
  },
  // --- D-1069 c: the fill's cut is held back before any cut leaves ---
  // Cut 1,000 BCY, fill 200 CCY at shrink 1.00, the trenches' suitable spoils 50 BCY. The site exports 1,000 + 50 - 200
  // = 850 BCY (1,062.5 LCY). The cut held for the fill is 200 x 1.00 = 200 BCY; the spoils do not take its place, so
  // 800 BCY of cut leaves and 200 stays for the fill (before: 850 left and 150 stayed, the spoils filling the rest).
  {
    id: "d1069-hold-back",
    kind: "lines",
    input: { units: "CY", regions: [{ id: null, label: "Remainder", cutCY: 1000, fillCY: 200 }], assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1 }, site: { utilitySpoils: 50 } },
    expect: { roles: "cut_export:remainder cut:remainder fill:remainder soil_export:__soil_export__", "cut_export:remainder": 800, "cut:remainder": 200, "fill:remainder": 200, "soil_export:__soil_export__": 1062.5 },
  },
  // --- D-1069 a, b: a liner measured below finished grade, 2 ft thick on a 2 ft section, all in cut ---
  // Pad 2,700 SF: its region cuts 300 BCY to subgrade, of which the liner's band is 2,700 x 2 / 27 = 200 BCY (inCutCF
  // 5,400). The undercut line is 200 BCY, its spoil hauled off 200 x 1.25 = 250 LCY; the cut to grade left is
  // 300 - 200 = 100 BCY, exported (125 LCY). The clay is placed at its whole thickness, 200 CCY. The liner sits on the
  // subgrade, so the subgrade under it is still prepared: 2,700 SF.
  {
    id: "d1069-liner",
    kind: "lines",
    input: {
      units: "CY",
      regions: [
        { id: "pad", label: "Pad", cutCY: 300, fillCY: 0 },
        { id: null, label: "Remainder", cutCY: 0, fillCY: 0 },
      ],
      features: [{ itemId: "pad", label: "Pad", undercut: { depthFt: 2, offsetFt: 0, areaSF: 2700, volumeCF: 5400, material: "Clay liner (compacted, low-permeability)", disposition: "haul_off", replaceCF: 5400, displacedCF: 0, inCutCF: 5400, onSubgrade: true }, prep: { depthFt: 0.5, lifts: null, areaSF: 2700 } }],
      assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1 },
    },
    expect: {
      // D-1083: a clay liner is tested: 2,700 SF is 0.06 acre, at least 2 density and 1 permeability tests a lift, 24 in
      // in 6 in lifts (none given) is 4 lifts: 8 + 4.
      roles: "undercut:pad undercut_haul:pad undercut_replace:pad liner_testing:pad prep:pad cut_export:pad soil_export:__soil_export__",
      "liner_testing:pad:name": "Liner testing (permeability and field density): 8 density + 4 permeability tests",
      "undercut:pad": 200,
      "undercut:pad:name": 'Undercut excavation, Pad (24")',
      "undercut_haul:pad": 250,
      "undercut_replace:pad": 200,
      "undercut_replace:pad:name": 'Clay liner, place and compact, 24"',
      "prep:pad": 2700,
      "cut_export:pad": 100,
      "soil_export:__soil_export__": 125,
    },
  },
  // Mixed, shrink 1: Pad cut 600 fill 0, Park cut 300 fill 0, Remainder cut 100 fill 600. Cut 1,000, fill 600: 400 BCY
  // leaves (x 1.25 = 500 LCY), from the regions with a surplus over their own fill, by volume, Pad 600 and Park 300:
  // Pad 400 x 600 / 900 = 266.667, Park 400 x 300 / 900 = 133.333. The rest is cut to fill: Pad 333.333, Park
  // 166.667, Remainder 100 (it has no surplus).
  {
    id: "d1037-mixed",
    kind: "lines",
    input: {
      units: "CY",
      regions: [
        { id: "pad", label: "Pad", cutCY: 600, fillCY: 0 },
        { id: "park", label: "Park", cutCY: 300, fillCY: 0 },
        { id: null, label: "Remainder", cutCY: 100, fillCY: 600 },
      ],
      assumptions: { suitable: true, fillType: "Engineered Fill", swell: 1.25, shrink: 1 },
    },
    expect: {
      roles: "cut_export:pad cut:pad cut_export:park cut:park cut:remainder fill:remainder soil_export:__soil_export__",
      "cut_export:pad": 800 / 3,
      "cut:pad": 1000 / 3,
      "cut_export:park": 400 / 3,
      "cut:park": 500 / 3,
      "cut:remainder": 100,
      "soil_export:__soil_export__": 500,
      "soil_export:__soil_export__:name": "Soil Export (400 BCY)",
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
  // Re-baselined for the exact overlay (N9, D-683): was 9312 / 8072 (−34.7 / −7.5 %). The new figures equal a
  // 600 × 600 sampling of the same two TINs inside the boundary to 0.1 CY (9,601.7 / 8,161.0), an independent check.
  { id: "regaccept-c200-from-page-3", kind: "regaccept", data: C200, expect: { ok: true, cutCY: 9602, fillCY: 8161, cutVsEngineerPct: -32.7, fillVsEngineerPct: -6.5 } },
  // --- The exact overlay (N9, D-683; calculate_exact_overlay_SPEC.md §8), every answer by hand -----------------
  // A 100 ft square. EG a ridge: 0 ft along both sides (the four corners), 10 ft along the centre line (x = 50 ft).
  // FG flat at 10 ft, with two FG spots at 10 ft at (30, 50) and (70, 50) ft that pull a union triangulation across
  // the ridge. EG averages 5 ft, so the fill is 100 × 100 × (10 − 5) = 50,000 CF = 1,851.852 CY, cut 0. The engine
  // before this read 52,666.667 CF.
  {
    id: "vol-exact-ridge",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...[[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y], i) => s(`eg${i}`, "EG", "EG", 0, x, y)), s("egr0", "EG", "EG", 10, 0.5, 0), s("egr1", "EG", "EG", 10, 0.5, 1), ...corners("FG", [10, 10, 10, 10]), s("fgp0", "FG", "FG", 10, 0.3, 0.5), s("fgp1", "FG", "FG", 10, 0.7, 0.5)],
    expect: { ok: true, cutCY: 0, fillCY: 50000 / 27 },
  },
  // The same without the two pulling spots: 50,000 CF, as the engine before also gave.
  {
    id: "vol-exact-ridge-no-pull",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...[[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y], i) => s(`eg${i}`, "EG", "EG", 0, x, y)), s("egr0", "EG", "EG", 10, 0.5, 0), s("egr1", "EG", "EG", 10, 0.5, 1), ...corners("FG", [10, 10, 10, 10])],
    expect: { ok: true, cutCY: 0, fillCY: 50000 / 27 },
  },
  // The ridge upside down, a valley: EG 10 ft at the four corners, 0 ft along the centre line, under FG flat at 0
  // with the same two pulling spots. EG averages 5 ft above FG: cut 100 × 100 × 5 = 50,000 CF, fill 0. A trough of
  // Δz as the ridge was a crest.
  {
    id: "vol-exact-valley",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...[[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y], i) => s(`eg${i}`, "EG", "EG", 10, x, y)), s("egr0", "EG", "EG", 0, 0.5, 0), s("egr1", "EG", "EG", 0, 0.5, 1), ...corners("FG", [0, 0, 0, 0]), s("fgp0", "FG", "FG", 0, 0.3, 0.5), s("fgp1", "FG", "FG", 0, 0.7, 0.5)],
    expect: { ok: true, cutCY: 50000 / 27, fillCY: 0 },
  },
  // Coverage: EG flat at 0 over x 0–60 ft, FG flat at 1 ft over x 40–100 ft, the boundary the whole 100 ft square.
  // Only where both cover, x 40–60 ft: 20 × 100 = 2,000 SF, fill 2,000 CF = 74.074 CY, cut 0.
  {
    id: "vol-exact-coverage",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...[[0, 0], [0.6, 0], [0.6, 1], [0, 1]].map(([x, y], i) => s(`eg${i}`, "EG", "EG", 0, x, y)), ...[[0.4, 0], [1, 0], [1, 1], [0.4, 1]].map(([x, y], i) => s(`fg${i}`, "FG", "FG", 1, x, y))],
    expect: { ok: true, cutCY: 0, fillCY: 2000 / 27 },
  },
  // A feature over a fold: the pulled ridge, with a Site Feature 1 ft deep over the west half (x 0–50 ft). There
  // the subgrade is 9 ft over EG = 0.2·x: fill ∫₀⁴⁵ (9 − 0.2x) dx × 100 = 20,250 CF, cut ∫₄₅⁵⁰ (0.2x − 9) dx × 100 =
  // 250 CF. The east half is the ridge's: fill 25,000 CF. Totals: fill 45,250 CF = 1,675.926 CY, cut 250 CF =
  // 9.259 CY.
  {
    id: "vol-exact-feature-fold",
    kind: "volume",
    side: 100,
    boundary: UNIT,
    runs: [...[[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y], i) => s(`eg${i}`, "EG", "EG", 0, x, y)), s("egr0", "EG", "EG", 10, 0.5, 0), s("egr1", "EG", "EG", 10, 0.5, 1), ...corners("FG", [10, 10, 10, 10]), s("fgp0", "FG", "FG", 10, 0.3, 0.5), s("fgp1", "FG", "FG", 10, 0.7, 0.5)],
    roleAreas: [{ itemId: "f1", label: "Feature", depthFt: 1, polygon: [[0, 0], [0.5, 0], [0.5, 1], [0, 1]] }],
    expect: { ok: true, cutCY: 250 / 27, fillCY: 45250 / 27 },
  },

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
  ...tcSpotRows(),
  ...labelCheckRows(),
  ...spotPickRows(),

  // --- Clearing class suggested by the trees per acre (D-1039) -------------------------------------------------
  // Medium from 400 trees an acre, heavy over 600 (the tree-density bands); shown only when heavier than the class
  // chosen, never for None. By hand: 1 ac (43,560 SF) at 1 tree per 200 SF = 217.8, 218 trees: under 400, nothing.
  // 1 per 80 SF = 544.5, 545 trees an acre: medium over light, nothing over medium. 600 typed on 1 ac: medium (600 is
  // not over 600). 650 typed on 1 ac: heavy. 1,250 typed on 2 ac (87,120 SF) = 625 an acre: heavy over medium.
  // 700 an acre with None chosen: nothing (the estimator said the site needs no clearing).
  { id: "clearing-suggest-default-light", kind: "clearing-suggest", section: { density: "light", treesPerSf: 200, treeCount: null }, areaSf: 43560, expect: { density: null, treesPerAcre: null } },
  { id: "clearing-suggest-medium", kind: "clearing-suggest", section: { density: "light", treesPerSf: 80, treeCount: null }, areaSf: 43560, expect: { density: "medium", treesPerAcre: 545 } },
  { id: "clearing-suggest-medium-chosen", kind: "clearing-suggest", section: { density: "medium", treesPerSf: 80, treeCount: null }, areaSf: 43560, expect: { density: null, treesPerAcre: null } },
  { id: "clearing-suggest-600-medium", kind: "clearing-suggest", section: { density: "light", treesPerSf: 200, treeCount: 600 }, areaSf: 43560, expect: { density: "medium", treesPerAcre: 600 } },
  { id: "clearing-suggest-heavy", kind: "clearing-suggest", section: { density: "light", treesPerSf: 200, treeCount: 650 }, areaSf: 43560, expect: { density: "heavy", treesPerAcre: 650 } },
  { id: "clearing-suggest-heavy-2ac", kind: "clearing-suggest", section: { density: "medium", treesPerSf: 200, treeCount: 1250 }, areaSf: 87120, expect: { density: "heavy", treesPerAcre: 625 } },
  { id: "clearing-suggest-none", kind: "clearing-suggest", section: { density: "none", treesPerSf: 200, treeCount: 700 }, areaSf: 43560, expect: { density: null, treesPerAcre: null } },
  ...JOB_CASES,
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
    // 5. D-821: a building pad with an FFE. The square x 0.2–0.6, y 0.2–0.6 (1,600 SF) on the flat
    // pad (EG = FG = 100), FFE 102, 0.5 ft FFE to pad subgrade: inside it finished grade is 102 and
    // subgrade 101.5, so Δz = 101.5 − 100 = +1.5: fill 1,600 × 1.5 = 2,400 CF, no cut. Without the
    // FFE the contours' 100 less 0.5 ft cut 800 CF.
    {
      id: "real-shape-pad-ffe",
      kind: "realshape",
      side: 100,
      items: [...spots("EG", 100), ...spots("FG", 100), boundary([[0, 0], [1, 0], [1, 1], [0, 1]]), { ...feature("pad", 0.5, [geo(D_SQUARE, { closed: true })]), building_pad: true, ffe_ft: 102 }],
      expect: { "feature:pad:areaSF": 1600, cutCF: 0, fillCF: 2400 },
    },
    // 6. The same FFE on a feature not ticked Building pad is not read: 800 CF of cut, as before.
    {
      id: "real-shape-ffe-not-a-pad",
      kind: "realshape",
      side: 100,
      items: [...spots("EG", 100), ...spots("FG", 100), boundary([[0, 0], [1, 0], [1, 1], [0, 1]]), { ...feature("slab", 0.5, [geo(D_SQUARE, { closed: true })]), building_pad: false, ffe_ft: 102 }],
      expect: { "feature:slab:areaSF": 1600, cutCF: 800, fillCF: 0 },
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

/**
 * D-1206 C: TC (top of curb) spots, as stored (`shape_meta.label`, `curb_in`), through the app's own sheetRuns, TIN and
 * computeVolumes. The unit page at 100 ft a side (10,000 SF), the boundary the unit square, EG flat at 11.00 from four
 * corner spots. By hand:
 *   A. Four TC spots printed 12.30 at the corners, the 6 in curb: each used at 12.30 - 0.50 = 11.80, FG flat at 11.80;
 *      fill 10,000 x 0.80 = 8,000 CF, no cut. Read at face value it was 13,000.
 *   B. The same at an 8 in curb: 12.30 - 8 / 12 = 11.6333; fill 10,000 x 0.6333 = 6,333.3 CF.
 *   C. Each TC with a G spot printed 11.70 2 ft from it (diagonally outward, 0.02 / sqrt 2 on each axis): the same
 *      curb, so the G spots are used and the TCs left out; FG flat at 11.70 over the boundary; fill 7,000 CF. Kept, the
 *      TCs would put 11.80 at the corners.
 *   D. The G spots 4 ft away: no pair, the TC kept at the corner at its used 11.80 (the proposed TIN's value there).
 */
function tcSpotRows() {
  const geo = (vertices_json, shape_meta) => ({ sheet_uuid: "s", vertices_json, shape_meta, role: "add" });
  const CORNERS = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const eg = CORNERS.map(([x, y], i) => ({ uuid: `EG${i}`, type: "spot_elevation", name: "EG spots", geometries: [geo([[x, y]], { kind: "spot", surface: "EG", elevation: 11 })] }));
  const tc = (curb) => ({ uuid: "TC", type: "spot_elevation", name: "TC spots", geometries: CORNERS.map(([x, y]) => geo([[x, y]], { kind: "spot", surface: "FG", elevation: 12.3, label: "TC", curb_in: curb })) });
  // A G spot `ft` from each corner, diagonally outward (away from the square's centre).
  const g = (ft) => {
    const d = ft / 100 / Math.SQRT2;
    return { uuid: "G", type: "spot_elevation", name: "G spots", geometries: CORNERS.map(([x, y]) => geo([[x === 0 ? -d : 1 + d, y === 0 ? -d : 1 + d]], { kind: "spot", surface: "FG", elevation: 11.7, label: "G", curb_in: 6 })) };
  };
  const boundary = { uuid: "b", type: "boundary", name: "Work Boundary", geometries: [geo(CORNERS, { kind: "boundary", closed: true })] };
  return [
    { id: "tc-spot-pavement", kind: "realshape", side: 100, items: [...eg, tc(6), boundary], expect: { cutCF: 0, fillCF: 8000 } },
    { id: "tc-spot-curb-8in", kind: "realshape", side: 100, items: [...eg, tc(8), boundary], expect: { cutCF: 0, fillCF: 6333.3 } },
    { id: "tc-g-pair-uses-g", kind: "realshape", side: 100, items: [...eg, tc(6), g(2), boundary], expect: { cutCF: 0, fillCF: 7000 } },
    { id: "tc-g-apart-keeps-tc", kind: "realshape", side: 100, items: [...eg, tc(6), g(4), boundary], tinOnly: { surface: "FG", at: [0, 0] }, expect: { egZAt: 11.8 } },
  ];
}

/**
 * D-1213: a typed contour against the printed label beside it. A contour drawn along y = 100 pt from x 100 to 500 pt,
 * its First elevation typed as 100 (the typed value wins); a label "98" printed 10 pt off the line (within the
 * pre-fill's 36 pt reach): the contour stays at 100 and is flagged, label 98. A label "100" beside it: no flag. A label
 * "98" 60 pt away (out of reach): no flag. Two decimals ("98.25") are a spot's, never a contour's: no flag.
 */
function labelCheckRows() {
  const line = [{ x: 100, y: 100 }, { x: 500, y: 100 }];
  const contour = { geometry: "c100", elevation: 100, points: line };
  return [
    { id: "label-check-typed-100-label-98", kind: "labelcheck", contours: [contour], labels: [{ str: "98", c: { x: 300, y: 110 } }], expect: { flagged: 1, "c100:label": 98, "c100:elevation": 100 } },
    { id: "label-check-agrees", kind: "labelcheck", contours: [contour], labels: [{ str: "100", c: { x: 300, y: 110 } }], expect: { flagged: 0 } },
    { id: "label-check-out-of-reach", kind: "labelcheck", contours: [contour], labels: [{ str: "98", c: { x: 300, y: 160 } }], expect: { flagged: 0 } },
    { id: "label-check-spot-value-ignored", kind: "labelcheck", contours: [contour], labels: [{ str: "98.25", c: { x: 300, y: 110 } }], expect: { flagged: 0 } },
  ];
}

/**
 * D-1206 B: Pick reads the elevation printed under a click, with its type (C12's callouts, sheet points): "TC 13.10"
 * printed over "G 12.60" (10 pt apart, 8 pt high, 30 pt wide). A click on the TC reads TC 13.10, and both spots of the
 * callout go to its middle (843, 867) so the TC/G pair rule finds them; a click on the G reads G 12.60, same middle.
 * "TP 12.80" alone: TP, no callout. "8.9": a plain value, no type. "12.30" with "TC" printed apart beside it: TC 12.30.
 * Blank paper 60 pt away: nothing.
 */
function spotPickRows() {
  const L = (str, x, y, w = 30) => ({ str, c: { x, y }, w, h: 8 });
  const callout = [L("TC 13.10", 844, 862), L("G 12.60", 842, 872)];
  return [
    { id: "spot-pick-tc-callout", kind: "spotpick", at: { x: 845, y: 861 }, labels: callout, expect: { value: 13.1, label: "TC", anchorX: 843, anchorY: 867 } },
    { id: "spot-pick-g-callout", kind: "spotpick", at: { x: 841, y: 873 }, labels: callout, expect: { value: 12.6, label: "G", anchorX: 843, anchorY: 867 } },
    { id: "spot-pick-tp", kind: "spotpick", at: { x: 828, y: 667 }, labels: [L("TP 12.80", 828, 667)], expect: { value: 12.8, label: "TP", anchorX: -1 } },
    { id: "spot-pick-plain", kind: "spotpick", at: { x: 802, y: 856 }, labels: [L("8.9", 802, 856, 12)], expect: { value: 8.9, label: "none" } },
    { id: "spot-pick-word-apart", kind: "spotpick", at: { x: 520, y: 400 }, labels: [L("TC", 500, 400, 10), L("12.30", 520, 400, 20)], expect: { value: 12.3, label: "TC" } },
    { id: "spot-pick-blank", kind: "spotpick", at: { x: 900, y: 900 }, labels: [L("TP 12.80", 828, 667)], expect: { value: -1 } },
  ];
}

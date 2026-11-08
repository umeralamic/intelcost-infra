// F6-S4's shared table: formulas and the environments they are read in, run through the
// browser's engine (`lib/takeoff/subItems/formula.ts`) and the api's
// (`app/features/takeoff/formula.py`). The two must give the same number, or the same
// error in the same words, for every row. Inputs only: the answer is whatever the
// browser's engine, legacy's, says, and the api's must equal it.
//
// Rows are formulas × environments, so each formula is read with and without the tokens
// it needs.

const UUID = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";

/** Environments, in the camelCase the browser's `FormulaEnv` uses. */
export const ENVS = {
  bare: { parent: 100 },
  linear: {
    parent: 40,
    linearFT: 40,
    linearBeforeDeductsFT: 40,
    segmentCount: 2,
    pointCount: 5,
    dims: { d1: 1.5, d2: 2, d3: 0.5 },
    subs: { mesh: 42, "vapour barrier": 7.25 },
    vars: { "wall-height": 10, spacing: 1.3333333333333333 },
    refs: { [UUID]: 12.5 },
  },
  area: {
    parent: 1000,
    areaSF: 1000,
    areaBeforeDeductsSF: 1120,
    deductAreaSF: 120,
    perimeter: 130,
    linearFT: 130,
    segmentCount: 1,
    pointCount: 4,
    dims: { d1: 0.5, d2: 4, d10: 0.3333333333333333 },
    subs: { mesh: 1050, "perimeter form": 130 },
    vars: { "wall-height": 12 },
    refs: {},
  },
  count: {
    parent: 12,
    countEA: 12,
    dims: { d1: 2, d2: 3.5, d3: 1.25 },
    subs: { anchors: 48 },
  },
  draft: {
    parent: 0,
    baseUnavailableMessage: "Draw the measurement first",
    dims: { d1: 1 },
  },
};

const FORMULAS = [
  // numbers, precedence, sign
  "1", "0", "1+2*3", "(1+2)*3", "10/4", "10-4-3", "2*3/4", "-5", "+5", "--5", "-(-2)", "2*-3",
  ".5", "1.", "1.25", "007", "1.2.3", "3.14159*2", "1/3", "2/3*3", "0.1+0.2", "1e5", "10 / 0",
  "0/0", "5/(2-2)", "1 +", "*2", "(1+2", "1+2)", "()", "", "   ", "1\t+\n2", "1\r+2", "2 3", "1,2",
  "1 # 2", "√4", "½",
  // functions
  "min(3,1,2)", "max(3,1,2)", "min()", "max()", "min(1)", "round(2.5)", "round(-2.5)", "round(3.14159, 2)",
  "round(2.675, 2)", "round(1234.5678, -2)", "ceil(1.2)", "ceil(-1.2)", "floor(1.8)", "floor(-1.8)",
  "abs(-4)", "abs(4)", "sqrt(16)", "sqrt(2)", "sqrt(-1)", "ceil()", "abs()", "sqrt()", "ROUND(2.4)",
  "Min(4,5)", "pow(2,3)", "min(1,2", "max(,1)", "round(PARENT*1.05, 1)", "ceil(PARENT/4)",
  "max(PARENT, 50)", "min(PARENT, 50)",
  // identifiers
  "PARENT", "parent", "Parent", "PARENT*1.05", "PARENT * 1.05 + 10", "PERIMETER", "perimeter*2",
  "SEGMENT_COUNT", "POINT_COUNT", "segment_count+point_count", "NOPE", "PARENT PARENT", "PARENT(2)",
  // primitives
  "AREA_SF", "AREA_SY", "AREA_M2", "AREA_SQ", "AREA_AC", "AREA_FT", "AREA_XYZ", "AREA_BEFORE_DEDUCTS_SF",
  "DEDUCT_AREA_SY", "LINEAR_FT", "LINEAR_IN", "LINEAR_M", "LINEAR_YD", "LINEAR_SF", "LINEAR_BEFORE_DEDUCTS_LF",
  "WALL_AREA_SF", "VOLUME_CY", "VOLUME_LCY", "LINEAR", "AREA", "_SF", "AREA_", "area_sy*2",
  // siblings
  "[Mesh]", "[mesh]*2", "[ Mesh ]", "[Vapour Barrier]", "[Perimeter form]", "[Nope]", "[Mesh", "[]",
  "PARENT-[Mesh]",
  // variables
  `{var:wall-height}`, `{var:wall-height}*PARENT`, `{var:spacing}`, `{var:missing}`, `{var:wall-height@12.5}`,
  `{var:missing@3}`, `{var:x@-3}`, `{var:x@1.5.2}`, `{var:}`, `{nope}`, `{var:a b}`, "{var:wall-height",
  `{ var:wall-height }`,
  // dimensions
  `{dim:d1}`, `{dim:d2}*PARENT`, `{dim:D1}`, `{dim:d9}`, `{dim:d0}`, `{dim:d10}`, `PARENT*{dim:d1}*{dim:d2}`,
  // rough measurements
  `{ref:${UUID}}`, `{ref:${UUID.toUpperCase()}}`, `{ref:not-a-uuid}`, `{ref:${UUID}}*2`,
  // derived quantities
  "{qty:LINEAR.d1@SF}", "{qty:LINEAR.d1.d2@CY}", "{qty:LINEAR.d2.d1@CY}", "{qty:LINEAR.d1.d2@CF}",
  "{qty:LINEAR.d1@SY}", "{qty:LINEAR.d1@CY}", "{qty:LINEAR.d1.d2.d3@CY}", "{qty:LINEAR.d1@XX}",
  "{qty:linear.d1@sf}", "{qty:AREA.d1@CY}", "{qty:AREA.d1@CF}", "{qty:AREA.d1.d2@CY}", "{qty:AREA.d10@CY}",
  "{qty:PERIM.d2@SF}", "{qty:PERIM.d2.d1@CY}", "{qty:COUNT.CIRC_AREA.d1@SF}", "{qty:COUNT.CIRC_SIDE.d1.d2@SF}",
  "{qty:COUNT.CIRC_VOL.d1.d2@CY}", "{qty:COUNT.BOX_AREA.d1.d2@SF}", "{qty:COUNT.BOX_SIDE.d1.d2.d3@SF}",
  "{qty:COUNT.BOX_VOL.d1.d2.d3@CY}", "{qty:COUNT.PROD.d1@LF}", "{qty:COUNT.PROD.d1@SF}", "{qty:COUNT.d1@SF}",
  "{qty:COUNT.CIRC_AREA.d1.d2@SF}", "{qty:LINEAR.PROD.d1@SF}", "{qty:LINEAR.d1@LCY}", "{qty:AREA.d1@LCY}",
  "{qty:AREA.d1@M3}", "{qty:LINEAR.d1@M2}", "{qty:LINEAR.d9@SF}", "{qty:LINEAR@SF}",
  "{qty:LINEAR.d1@SF}*1.1", "round({qty:AREA.d1@CY}, 2)",
  // combinations an estimator writes
  "PARENT*1.05", "PARENT/100*3", "ceil(PARENT/{var:spacing})+1", "(PARENT+[Mesh])/2", "PERIMETER*{dim:d2}",
  "AREA_SF*{dim:d1}/27", "max([Mesh], PARENT)*1.1", "{qty:AREA.d1@CY}*1.08", "LINEAR_FT*{var:wall-height}",
  "PARENT*1.05-[Mesh]", "round(sqrt(AREA_SF), 3)",
];

/** Attempts to run code: every one must come back as an error value (F6-S4 AC2). */
export const PROBES = ["alert(1)", "constructor", "__proto__", "process.exit(1)", "PARENT;1", "`1`", "globalThis", "eval('1')", "1 + (2"];
FORMULAS.push(...PROBES);

/** Every formula in every environment: the table both engines run. */
export const CASES = Object.keys(ENVS).flatMap((env) =>
  FORMULAS.map((formula, index) => ({ id: `${env}-${index}`, env, formula })),
);

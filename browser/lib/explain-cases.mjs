// The shared table's "How this quantity is derived" rows (D-250): what the Estimating tab's
// Qty popover says (lib/estimate/quantityExplain.ts): the formula with its values, the step
// between, and the result, which must be formula.ts's own figure (the cell's).

const DIA = 14.5 / 12;
export const EXPLAIN_CASES = [
  // Hidden Valley's Laterals Pipe zone: 38.3785 − 1.2559 = 37.1226 CY.
  {
    id: "explain-pipe-zone",
    formula: "{qty:LINEAR.d1.d4@CY}-{qty:LINEAR.CIRC_AREA.d6@CY}",
    env: { parent: 172.703303, linearFT: 172.703303, dims: { d1: 3, d4: 2, d6: 0.5 } },
    substituted: "172.7033 × 3 × 2 ÷ 27 − 172.7033 × (π × 0.5² ÷ 4) ÷ 27",
    steps: ["38.3785 − 1.2559"],
    value: 37.122578,
  },
  // The trench typed with ^: 117.69 × (7.5 − 1.1467) ÷ 27 = 117.69 × 6.3533 ÷ 27 = 27.6932.
  {
    id: "explain-trench-typed",
    formula: "PARENT * ({dim:d1} * {dim:d2} - PI * ({dim:d3} / 2)^2) / 27",
    env: { parent: 117.69, linearFT: 117.69, dims: { d1: 3, d2: 2.5, d3: DIA } },
    substituted: "117.69 × (3 × 2.5 − π × (1.2083 ÷ 2)^2) ÷ 27",
    steps: ["117.69 × 6.3533 ÷ 27"],
    value: 27.693172,
  },
  // 3 round footings: 3 × π × 4² ÷ 4 × 5 = 188.4956 CF ÷ 27 = 6.9813 CY.
  {
    id: "explain-round-footings",
    formula: "{qty:COUNT.CIRC_VOL.d1.d2@CY}",
    env: { parent: 3, countEA: 3, dims: { d1: 4, d2: 5 } },
    substituted: "3 × (π × 4² ÷ 4 × 5) ÷ 27",
    steps: ["188.4956 ÷ 27"],
    value: 6.981317,
  },
  // One step is the result: no step between.
  { id: "explain-waste", formula: "PARENT*1.05", env: { parent: 40, linearFT: 40, dims: {} }, substituted: "40 × 1.05", steps: [], value: 42 },
  // A parent measured 30 LF over two sheets (22.5 and 7.5), multiplied by 2.
  {
    id: "explain-parent-multiplied",
    parent: { unit: "LF", calculated_quantity: 30, effective_quantity: 30, manual_quantity_override: null, override_reason: null, height_ft: null, height_raw: null, pitch_factor: null, pitch_mode: null, pitch_entry: null, multiplier: 2 },
    sheets: [{ sheet: "A101", shapes: 2, deducts: 0, deductArea: null, quantity: 22.5 }, { sheet: "A102", shapes: 1, deducts: 0, deductArea: null, quantity: 7.5 }],
    multiplied: "30 LF × 2 = 60 LF",
    shares: [0.75, 0.25],
  },
];

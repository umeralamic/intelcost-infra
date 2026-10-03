// The shared table's exported-formula rows (D-249): a sub-item's formula as the workbook
// writes it (lib/estimate/exportFormulas.ts), with the parent's Qty cell and the Dimensions
// cells linked, read as Excel reads it, equal to the app's own figure before and after the
// linked cells change. `links` names the cell each link becomes; `change` the new cell
// values and the environment the app would read them with.

const DIA = 14.5 / 12;
const HDPE6 = { parent: 172.703303, linearFT: 172.703303, dims: { d1: 3, d2: 5, d3: 0.5, d4: 2, d5: 2.5, d6: 0.5 } };
const HDPE6_LINKS = { P: "J28", d1: "Dimensions!C9", d2: "Dimensions!C10", d3: "Dimensions!C11", d4: "Dimensions!C12", d5: "Dimensions!C13", d6: "Dimensions!C14" };
const cellsOf = (env, links) => Object.fromEntries([[links.P, env.parent], ...Object.entries(env.dims).filter(([k]) => links[k]).map(([k, v]) => [links[k], v])]);

export const EXCEL_CASES = [
  // Hidden Valley's Laterals Pipe zone: 172.70 × 3 × 2 / 27 − 172.70 × π·0.5²/4 / 27 = 37.1226 CY;
  // with the parent at 200 LF and Width 4: 200 × 4 × 2 / 27 − 200 × π·0.25/4 / 27 = 57.8048.
  {
    id: "excel-pipe-zone-linked",
    formula: "{qty:LINEAR.d1.d4@CY}-{qty:LINEAR.CIRC_AREA.d6@CY}",
    env: HDPE6,
    links: HDPE6_LINKS,
    text: "J28*Dimensions!C9*Dimensions!C12/27-J28*(PI()*Dimensions!C14^2/4)/27",
    value: 37.122578,
    change: { parent: 200, linearFT: 200, dims: { ...HDPE6.dims, d1: 4 } },
    changed: 57.80481821593065,
  },
  // PARENT is the parent's Qty cell.
  { id: "excel-parent-cell", formula: "PARENT", env: HDPE6, links: HDPE6_LINKS, text: "J28", value: 172.703303, change: { ...HDPE6, parent: 150, linearFT: 150 }, changed: 150 },
  // Round footings: 3 × π·4²/4 × 5 / 27 = 6.9813 CY; 5 of them, 11.6355.
  {
    id: "excel-round-footings",
    formula: "{qty:COUNT.CIRC_VOL.d1.d2@CY}",
    env: { parent: 3, countEA: 3, dims: { d1: 4, d2: 5 } },
    links: { P: "J5", d1: "Dimensions!C2", d2: "Dimensions!C3" },
    text: "J5*(PI()*Dimensions!C2^2/4*Dimensions!C3)/27",
    value: (3 * Math.PI * 16 * 5) / 4 / 27,
    change: { parent: 5, countEA: 5, dims: { d1: 4, d2: 5 } },
    changed: (5 * Math.PI * 16 * 5) / 4 / 27,
  },
  // ^ goes out bracketed, since Excel's sign binds first and its ^ chains left to right.
  { id: "excel-unary-minus-power", formula: "-2^2", env: { parent: 0, dims: {} }, links: {}, text: "-(2^2)", value: -4 },
  { id: "excel-right-associative", formula: "2^3^2", env: { parent: 0, dims: {} }, links: {}, text: "2^(3^2)", value: 512 },
  { id: "excel-pi-half-dia-squared", formula: "PI*({dim:d1}/2)^2", env: { parent: 0, dims: { d1: DIA } }, links: { d1: "Dimensions!C2" }, text: "PI()*(Dimensions!C2/2)^2", value: (Math.PI * DIA * DIA) / 4, change: { parent: 0, dims: { d1: 2 } }, changed: Math.PI },
  // The trench typed with ^ over 117.69 LF: 27.6931 CY.
  {
    id: "excel-trench-typed",
    formula: "PARENT * ({dim:d1} * {dim:d2} - PI * ({dim:d3} / 2)^2) / 27",
    env: { parent: 117.69, linearFT: 117.69, dims: { d1: 3, d2: 2.5, d3: DIA } },
    links: { P: "J21", d1: "Dimensions!C2", d2: "Dimensions!C3", d3: "Dimensions!C4" },
    text: "J21*(Dimensions!C2*Dimensions!C3-PI()*(Dimensions!C4/2)^2)/27",
    value: (117.69 * (3 * 2.5 - (Math.PI * DIA * DIA) / 4)) / 27,
  },
  // Excel's ROUND rounds a half away from zero, the app's towards +∞: round(-2.5) is -2 in
  // the app and -3 in Excel, so the cell keeps the number (null: no formula).
  { id: "excel-round-half-keeps-number", formula: "round(-2.5)", env: { parent: 0, dims: {} }, links: {}, verified: null },
];
export { cellsOf };

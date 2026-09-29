// The shared quantity table (D-61, kept by D-68): the browser's engine against the api's
// on the same shapes, and both against the answers worked by hand. No world, no sign-in:
// it imports `lib/takeoff/quantity.ts` from the app's dev server and runs it in Chromium.
//
//   ./quantity-table.sh      (from intelcost-infra/; it runs this twice, around the api's pass)
//
// GEN=1 writes the cases for the api's pass (drives/quantity-table.py); without it, this
// reads the api's answers and compares.

import { readFile, writeFile } from "node:fs/promises";

import { APP, openBrowser } from "./lib/bench.mjs";
import { COST_CASES, ENV_ITEMS, ENV_SHEET } from "./lib/cost-cases.mjs";
import { CASES } from "./lib/quantity-cases.mjs";

const HERE = "/drive/scripts";
if (process.env.GEN === "1") {
  await writeFile(`${HERE}/.qt-cases.json`, JSON.stringify(CASES));
  console.log(`GEN ${CASES.length} cases`);
  process.exit(0);
}

const python = new Map(JSON.parse(await readFile(`${HERE}/.qt-python.json`, "utf8")).map((r) => [r.id, r.value]));
const browser = await openBrowser();
let web;
let costs;
try {
  const page = await browser.newPage();
  await page.goto(`${APP}/login`);
  web = await page.evaluate(async (cases) => {
    const q = await import("/src/lib/takeoff/quantity.ts");
    const pts = (v) => v.map(([x, y]) => ({ x, y }));
    return cases.map((c) => {
      const page = { widthPt: c.page[0], heightPt: c.page[1] };
      if (c.type === "sf") {
        const pos = c.shapes.filter((s) => s.role !== "subtract").map((s) => ({ points: pts(s.vertices), meta: s.meta }));
        const neg = c.shapes.filter((s) => s.role === "subtract").map((s) => ({ points: pts(s.vertices), meta: s.meta }));
        return q.areaOnSheet(pos, neg, c.fpp, page);
      }
      return c.shapes.reduce((sum, s) => sum + q.quantityFor(c.type, pts(s.vertices), c.fpp, s.meta, page), 0);
    });
  }, CASES);
  // The cost rows: F9's money through the app's own lib/estimate.
  costs = await page.evaluate(async ([cases, envItems, envSheet]) => {
    const costing = await import("/src/lib/estimate/costing.ts");
    const comps = await import("/src/lib/estimate/components.ts");
    const alloc = await import("/src/lib/estimate/equipmentAllocation.ts");
    const envs = await import("/src/lib/estimate/componentEnv.ts");
    const workbook = await import("/src/lib/estimate/workbook.ts");
    const removal = await import("/src/lib/estimate/componentRemoval.ts");
    return cases.map((c) => {
      if (c.kind === "alloc") {
        const r = alloc.allocateResource(c.res, c.hosts);
        return { total: r.total, unallocated: r.unallocated, allocations: Object.fromEntries(r.allocations) };
      }
      if (c.kind === "keep") {
        const env = { parent: 0, qty: c.quantity };
        const whole = costing.computeLineCost({ quantity: c.quantity, unit: "SF", input: costing.EMPTY_COST_INPUT, unitWastage: new Map(), components: c.components.map((row) => comps.evaluateComponent(row, env)) });
        return removal.keepRates(c.keepKind, whole);
      }
      if (c.kind === "workbook") {
        const keys = ["qty", "wastage", "qty_wastage", "multiplier", "total_qty", "unit_mh", "total_mh", "wage", "labor_cost", "unit_equipment", "equipment", "unit_material", "total_material", "subcontract", "item_cost"];
        const cols = keys.map((key) => ({ key, label: key, width: 60, kind: key === "wastage" ? "pct" : "money" }));
        const rows = c.rows.map((values, i) => ({ kind: "item", depth: 0, itemKey: String(i), parentKey: null, parent: false, context: false, unitEquipment: false, values, color: null }));
        const ws = Object.values(workbook.buildWorkbook([{ name: "T", banner: null, rows }], cols, { formulas: true, grids: false, grouping: false }).Sheets)[0];
        const at = (key, row) => ws[String.fromCharCode(65 + keys.indexOf(key)) + row];
        return { typedMaterialFormula: Boolean(at("total_material", 2)?.f), typedItemCostFormula: Boolean(at("item_cost", 2)?.f), lumpMaterialFormula: Boolean(at("total_material", 3)?.f), lumpItemCostFormula: Boolean(at("item_cost", 3)?.f), lumpMaterialValue: at("total_material", 3)?.v };
      }
      if (c.kind === "env") {
        const ctx = { items: envItems, scales: envs.sheetScales([envSheet]), vars: new Map(c.vars) };
        const host = envItems.find((i) => i.uuid === c.host);
        const env = envs.componentEnv(c.host, host.effective_quantity, ctx);
        return costing.computeLineCost({ quantity: host.effective_quantity, unit: "SF", input: undefined, unitWastage: new Map(), components: c.components.map((row) => comps.evaluateComponent(row, env)), netQty: host.effective_quantity });
      }
      const env = { parent: 0, qty: c.quantity };
      return costing.computeLineCost({
        quantity: c.quantity,
        unit: c.unit,
        input: c.input,
        unitWastage: new Map(c.unitWastage ?? []),
        share: c.share,
        multiplier: c.multiplier,
        components: (c.components ?? []).map((row) => comps.evaluateComponent(row, env)),
        netQty: c.quantity,
        equipmentAllocation: c.equipmentAllocation ?? null,
      });
    });
  }, [COST_CASES, ENV_ITEMS, ENV_SHEET]);
} finally {
  await browser.close();
}

const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const disagree = [];
const wrong = [];
for (const [i, c] of CASES.entries()) {
  const api = python.get(c.id);
  if (c.crossing) {
    if (web[i] !== null) disagree.push(`${c.id}: the browser clipped (${web[i]})`);
  } else if (web[i] === null || api === undefined || !close(api, web[i])) disagree.push(`${c.id}: api ${api}, browser ${web[i]}`);
  if (c.expect !== undefined && (api === undefined || !close(api, c.expect))) wrong.push(`${c.id}: ${api}, expected ${c.expect}`);
}
if (python.size !== CASES.length) disagree.push(`${python.size} api answers for ${CASES.length} rows`);
// Cost rows: every named figure to the cent against the hand-worked answer.
const cent = (a, b) => typeof a === "number" && Math.abs(a - b) < 0.005;
for (const [i, c] of COST_CASES.entries()) {
  for (const [field, want] of Object.entries(c.expect)) {
    const got = costs[i][field];
    if (want !== null && typeof want === "object") {
      for (const [k, v] of Object.entries(want)) if (!cent(got?.[k], v)) wrong.push(`${c.id}.${field}.${k}: ${got?.[k]}, expected ${v}`);
    } else if (want === null) {
      if (got !== null) wrong.push(`${c.id}.${field}: ${got}, expected null`);
    } else if (typeof want === "boolean") {
      if (got !== want) wrong.push(`${c.id}.${field}: ${got}, expected ${want}`);
    } else if (!cent(got, want)) wrong.push(`${c.id}.${field}: ${got}, expected ${want}`);
  }
}

const worked = CASES.filter((c) => c.expect !== undefined).length;
if (disagree.length || wrong.length) {
  for (const line of [...disagree, ...wrong]) console.log(`FAIL  ${line}`);
  console.log(`quantity table: ${disagree.length} disagree, ${wrong.length} wrong, of ${CASES.length} rows`);
  process.exit(1);
}
console.log(
  `quantity table: ${CASES.length} rows, both engines equal to 1e-9 on ${CASES.filter((c) => !c.crossing).length}; ${worked} worked answers right; ${COST_CASES.length} cost rows right to the cent; passed`,
);

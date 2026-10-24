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
import { CREDIT_CASES } from "./lib/credit-cases.mjs";
import { EARTHWORK_CASES } from "./lib/earthwork-cases.mjs";
import { UTILITY_CASES } from "./lib/utility-cases.mjs";
import { CASES } from "./lib/quantity-cases.mjs";
import { GEOREF_CASES, REGISTER_CASES } from "./lib/register-cases.mjs";
/** F18's links and GPS Export's coordinates (D-672) go through one registration file each way. */
const REG_ROWS = [...REGISTER_CASES, ...GEOREF_CASES];
import { SITE_GROUND, SITE_HALVES, SITE_JOIN_CASES, SITE_SHAPE_CASES } from "./lib/site-cases.mjs";
import { SUBITEM_CASES } from "./lib/subitem-cases.mjs";
import { EXCEL_CASES, cellsOf } from "./lib/excel-cases.mjs";
import { EXPLAIN_CASES } from "./lib/explain-cases.mjs";
import { CLOSE_CASES, COMPONENT_SYSTEM_CASES, CONSTANT_CASES, DIMENSION_TOOL_CASES, DISPLAY_CASES, ENTRY_CASES, EXCEL_METRIC_CASES, EXPLAIN_METRIC_CASES, FORMULA_SYSTEM_CASES, MANUAL_CASES, NAME_CASES, PICK_CASES, PINNED_CASES } from "./lib/metric-cases.mjs";
import { AUTOCOUNT_CASES, AUTOCOUNT_PIPELINE_CASES } from "./lib/autocount-cases.mjs";
import { PEN_CASES } from "./lib/pen-cases.mjs";
import { SCALE_UNDO_CASES } from "./lib/scale-undo-cases.mjs";
import { EQUIPMENT_CASES, checkEquipment, runEquipment } from "./lib/equipment-cases.mjs";

const HERE = "/drive/scripts";
if (process.env.GEN === "1") {
  await writeFile(`${HERE}/.qt-cases.json`, JSON.stringify(CASES));
  await writeFile(`${HERE}/.qt-register.json`, JSON.stringify(REG_ROWS));
  await writeFile(`${HERE}/.qt-site.json`, JSON.stringify(SITE_JOIN_CASES));
  await writeFile(`${HERE}/.qt-credits.json`, JSON.stringify(CREDIT_CASES));
  await writeFile(`${HERE}/.qt-seed.json`, JSON.stringify(COST_CASES.filter((c) => c.kind === "seed")));
  await writeFile(`${HERE}/.qt-subitems.json`, JSON.stringify(SUBITEM_CASES.filter((c) => !c.parse && !c.offers)));
  await writeFile(`${HERE}/.qt-fxsystem.json`, JSON.stringify(FORMULA_SYSTEM_CASES));
  // D-642: each row carries its base row's shapes.
  await writeFile(`${HERE}/.qt-scaleundo.json`, JSON.stringify(SCALE_UNDO_CASES.map((c) => ({ ...CASES.find((r) => r.id === c.base), ...c }))));
  console.log(`GEN ${CASES.length} cases, ${REGISTER_CASES.length} registration rows`);
  process.exit(0);
}

const python = new Map(JSON.parse(await readFile(`${HERE}/.qt-python.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonCredits = new Map(JSON.parse(await readFile(`${HERE}/.qt-credits-py.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonReg = new Map(JSON.parse(await readFile(`${HERE}/.qt-register-py.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonSite = new Map(JSON.parse(await readFile(`${HERE}/.qt-site-py.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonSub = new Map(JSON.parse(await readFile(`${HERE}/.qt-subitems-py.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonScale = new Map(JSON.parse(await readFile(`${HERE}/.qt-scaleundo-py.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonFx = new Map(JSON.parse(await readFile(`${HERE}/.qt-fxsystem-py.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonSeed = Object.fromEntries(JSON.parse(await readFile(`${HERE}/.qt-seed-py.json`, "utf8")).map((r) => [r.id, r.value]));
const browser = await openBrowser();
let web;
let costs;
let equipmentAnswers;
let earth;
let reg;
let site;
let ac;
let util;
let subs;
let xl;
let ex;
let mt;
let scaleWeb;
try {
  const page = await browser.newPage();
  await page.goto(`${APP}/login`);
  web = await page.evaluate(async (cases) => {
    const q = await import("/src/lib/takeoff/quantity.ts");
    const pts = (v) => v.map(([x, y]) => ({ x, y }));
    const measured = (c) => {
      const page = { widthPt: c.page[0], heightPt: c.page[1] };
      if (c.type === "sf") {
        const pos = c.shapes.filter((s) => s.role !== "subtract").map((s) => ({ points: pts(s.vertices), meta: s.meta }));
        const neg = c.shapes.filter((s) => s.role === "subtract").map((s) => ({ points: pts(s.vertices), meta: s.meta }));
        return q.areaOnSheet(pos, neg, c.fpp, page);
      }
      return c.shapes.reduce((sum, s) => sum + q.quantityFor(c.type, pts(s.vertices), c.fpp, s.meta, page), 0);
    };
    // A row with `mods` (D-360): the measured figure through the item's modifiers.
    return cases.map((c) => {
      const base = measured(c);
      return c.mods && base !== null ? q.applyModifiers(base, { geomType: c.type, ...c.mods }) : base;
    });
  }, CASES);
  // D-642: the scale undo rows through the browser's engine, at the scales the api stored.
  scaleWeb = await page.evaluate(async ([cases, stored]) => {
    const q = await import("/src/lib/takeoff/quantity.ts");
    const pts = (v) => v.map(([x, y]) => ({ x, y }));
    const at = (c, fpp) => {
      const page = { widthPt: c.page[0], heightPt: c.page[1] };
      if (c.type === "sf") {
        const pos = c.shapes.filter((s) => s.role !== "subtract").map((s) => ({ points: pts(s.vertices), meta: s.meta }));
        const neg = c.shapes.filter((s) => s.role === "subtract").map((s) => ({ points: pts(s.vertices), meta: s.meta }));
        return q.areaOnSheet(pos, neg, fpp, page);
      }
      return c.shapes.reduce((sum, s) => sum + q.quantityFor(c.type, pts(s.vertices), fpp, s.meta, page), 0);
    };
    return cases.map((c) => {
      const v = stored[c.id];
      return v ? { qA: at(c, v.fppA), qB: at(c, v.fppB), qA2: at(c, v.fppA2), qB2: at(c, v.fppB2) } : null;
    });
  }, [SCALE_UNDO_CASES.map((c) => ({ ...CASES.find((r) => r.id === c.base), ...c })), Object.fromEntries(pythonScale)]);
  // The equipment library rows (F33): the engine against the catalog and the hand-worked answers.
  equipmentAnswers = await runEquipment(page, JSON.parse(await readFile(`${HERE}/.qt-eqlib.json`, "utf8")));
  // The cost rows: F9's money through the app's own lib/estimate.
  costs = await page.evaluate(async ([cases, envItems, envSheet, seedCopies]) => {
    const costing = await import("/src/lib/estimate/costing.ts");
    const comps = await import("/src/lib/estimate/components.ts");
    const alloc = await import("/src/lib/estimate/equipmentAllocation.ts");
    const envs = await import("/src/lib/estimate/componentEnv.ts");
    const workbook = await import("/src/lib/estimate/workbook.ts");
    const removal = await import("/src/lib/estimate/componentRemoval.ts");
    const bid = await import("/src/lib/estimate/bidSummary.ts");
    const formula = await import("/src/lib/takeoff/subItems/formula.ts");
    const sums = await import("/src/lib/estimate/summaries.ts");
    return cases.map((c) => {
      if (c.kind === "seed") {
        // The template at the seeded quantity (its Costs preview: PARENT = QTY), then the
        // sub-item with the api's copies under its real parent.
        const qty = formula.evaluateFormula(c.formula, { parent: c.parentQty }).value;
        const line = (rows, env) => costing.computeLineCost({ quantity: qty, unit: c.unit, input: c.input, unitWastage: new Map(), components: rows.map((row) => comps.evaluateComponent(row, env)), netQty: qty }).itemCost;
        const copies = (seedCopies[c.id] ?? []).map((row, i) => ({ ...row, id: `copy-${i}`, takeoff_item_id: "sub", position: i }));
        return { quantity: qty, assembly: line(c.template, { parent: qty, qty }), seeded: line(copies, { parent: c.parentQty, qty }), copied: copies.length };
      }
      if (c.kind === "bidsheet") {
        const wb = workbook.buildWorkbook([{ name: "T", banner: null, rows: [] }], [{ key: "item_cost", label: "Item Cost", width: 60, kind: "money" }], { formulas: true, grids: false, grouping: false });
        workbook.appendBidSheet(wb, c.totals, c.rates);
        const ws = wb.Sheets["Bid Summary"];
        const last = Object.keys(ws).filter((k) => /^D\d+$/.test(k)).map((k) => Number(k.slice(1))).sort((a, b) => b - a)[0];
        return { taxOnMaterial: ws.C4?.f === "ROUND(C3*B4,2)", overheadOnSubtotal: ws.C5?.f === "ROUND(D4*B5,2)", total: ws[`D${last}`]?.v };
      }
      if (c.kind === "bid") {
        const summary = bid.computeBid(c.totals, c.rates);
        return { ...Object.fromEntries(summary.lines.map((l) => [l.key, l.amount])), total: summary.total };
      }
      if (c.kind === "summary") {
        // D-762 A5: each report's Summary over the line adds back to the line's own type total.
        const env = { parent: 0, qty: c.quantity };
        const evals = c.components.map((row) => comps.evaluateComponent(row, env));
        const cost = costing.computeLineCost({ quantity: c.quantity, unit: "SF", input: c.input, unitWastage: new Map(), multiplier: c.multiplier, components: evals, netQty: c.quantity, equipmentAllocation: c.equipmentAllocation ?? null });
        const line = {
          name: "Wall", unit: "SF", scope: "Framing", subcontractor: "Unassigned", cost, netQty: c.quantity, share: 1,
          components: c.components.map((row, i) => ({ row, eval: evals[i] })),
          shares: c.equipmentAllocation ? [{ resourceId: "r1", name: "Shared loader", alloc: c.equipmentAllocation, hours: 4, machine: null }] : [],
        };
        const of = (r) => sums.summaryTotal(sums.summarise(r, [line]));
        const labor = sums.summarise("labor", [line]);
        return { labor: of("labor"), material: of("material"), equipment: of("equipment"), all: of("all"), laborMh: labor.filter((r) => r.depth === 0).reduce((s, r) => s + Number(r.values.mh ?? 0), 0), line: cost.itemCost };
      }
      if (c.kind === "units") {
        // D-762 A1: a line's (or a parent's, over its own Qty) unit figures read back from its totals.
        const one = (q, rows, input, share) =>
          costing.computeLineCost({ quantity: q, unit: c.unit ?? "SF", input, unitWastage: new Map(), components: (rows ?? []).map((row) => comps.evaluateComponent(row, { parent: 0, qty: q })), netQty: q, equipmentAllocation: share ?? null });
        if (c.parts) {
          const sum = costing.sumCosts(c.parts.map((p) => one(p.quantity, p.components, p.input, p.equipmentAllocation)));
          return { ...costing.derivedUnits(sum, c.parentQty), itemCost: sum.itemCost };
        }
        const r = one(c.quantity, c.components, c.input, c.equipmentAllocation);
        return { ...costing.derivedUnits(r, r.totalQty), itemCost: r.itemCost };
      }
      if (c.kind === "alloc") {
        const r = alloc.allocateResource(c.res, c.hosts);
        return { total: r.total, unallocated: r.unallocated, allocations: Object.fromEntries(r.allocations) };
      }
      if (c.kind === "keep") {
        const env = { parent: 0, qty: c.quantity };
        const whole = costing.computeLineCost({ quantity: c.quantity, unit: "SF", input: costing.EMPTY_COST_INPUT, unitWastage: new Map(), components: c.components.map((row) => comps.evaluateComponent(row, env)) });
        return removal.keepRates(c.keepKind, whole);
      }
      if (c.kind === "stored") {
        // D-766 F0: the numbers the workbook stores, not only their formats.
        const KIND = { qty: "qty", total_mh: "qty", unit_mh: "rate", wage: "money", labor_cost: "money", unit_labor: "unitMoney" };
        const keys = Object.keys(KIND);
        const cols = keys.map((key) => ({ key, label: key, width: 60, kind: KIND[key] }));
        const rows = c.rows.map((values, i) => ({ kind: "item", depth: 0, itemKey: String(i), parentKey: null, parent: false, context: false, unitEquipment: false, values, color: null }));
        const ws = Object.values(workbook.buildWorkbook([{ name: "T", banner: null, rows }], cols, { formulas: false, grids: false, grouping: false }).Sheets)[0];
        const at = (key, row) => ws[String.fromCharCode(65 + keys.indexOf(key)) + row]?.v;
        return { qty: at("qty", 2), total_mh: at("total_mh", 2), unit_mh: at("unit_mh", 2), wage: at("wage", 2), labor_cost: at("labor_cost", 2), unit_labor: at("unit_labor", 2), qty2: at("qty", 3), unit_mh2: at("unit_mh", 3), labor_cost2: at("labor_cost", 3), total: at("labor_cost", 4) };
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
  }, [COST_CASES, ENV_ITEMS, ENV_SHEET, pythonSeed]);
  // Sub-item formula rows (D-244, D-245): lib/takeoff/subItems, before and after drawing.
  subs = await page.evaluate(async (cases) => {
    const envs = await import("/src/lib/takeoff/subItems/env.ts");
    const f = await import("/src/lib/takeoff/subItems/formula.ts");
    const bd = await import("/src/lib/takeoff/subItems/beforeDrawing.ts");
    const pd = await import("/src/lib/takeoff/dimensions/parseDimension.ts");
    const dv = await import("/src/lib/takeoff/subItems/derived.ts");
    return cases.map((c) => {
      if (c.offers) {
        const dims = c.offers.dims.map(([local_key, name, kind]) => ({ local_key, name, kind }));
        const unit = (o) => (o.dimension === "volume" ? "CY" : o.dimension === "area" ? "SF" : "LF");
        return { labels: dv.derivedOffers(c.offers.bases, dims, { countShape: c.offers.countShape ?? null }).map((o) => `${o.label} ${dv.offerToken(o, unit(o))}`) };
      }
      if (c.parse) {
        const r = pd.parseDimension(c.parse, "FT");
        return { feet: "feet" in r ? r.feet : r.error };
      }
      const dims = new Map(Object.entries(c.dims));
      const out = {};
      if (c.before) {
        const [r] = bd.evaluateBeforeDrawing([{ name: "row", formula: c.formula }], { parent: 0, baseUnavailableMessage: "Not until the measurement is drawn", dims }, c.type);
        out.before = !r.ok ? "error" : r.pending ? "pending" : "value";
      }
      const shapes = (c.shapes ?? []).map((s) => ({ sheet: "s", geomType: c.type, vertices: s.map(([x, y]) => ({ x, y })), closed: c.type === "sf", meta: null }));
      const scaleOf = () => ({ feetPerPt: c.fpp, page: { widthPt: c.page[0], heightPt: c.page[1] } });
      const prims = envs.parentPrimitives(c.type, shapes, scaleOf);
      const parent = c.type === "count" ? c.count : c.type === "sf" ? prims.areaSF : prims.linearFT;
      const r = f.evaluateFormula(c.formula, envs.buildFormulaEnv({ parentType: c.type, parentQuantity: parent, shapes, scaleOf, dims, siblings: new Map() }));
      out.value = r.ok ? r.value : null;
      if (!r.ok) out.error = r.error;
      return out;
    });
  }, SUBITEM_CASES);
  // Exported-formula rows (D-249): lib/estimate/exportFormulas, read as Excel reads them.
  xl = await page.evaluate(async ([cases, cells]) => {
    const x = await import("/src/lib/estimate/exportFormulas.ts");
    const f = await import("/src/lib/takeoff/subItems/formula.ts");
    const envOf = (e) => ({ ...e, dims: new Map(Object.entries(e.dims ?? {})) });
    const cellsFn = new Function("env", "links", `return (${cells})(env, links)`);
    return cases.map((c) => {
      if ("verified" in c) return { verified: x.verifiedQtyExpression(c.formula, envOf(c.env), f.evaluateFormula(c.formula, envOf(c.env)).value) };
      const expr = x.toExcelExpression(c.formula, envOf(c.env));
      if (!expr) return { text: null };
      const text = x.resolveLinks(expr, (kind, key) => (kind === "P" ? c.links.P : c.links[key]) ?? null);
      const read = (values) => x.evaluateCellFormula(text, (ref, sheet) => values[sheet ? `${sheet}!${ref}` : ref] ?? null);
      const out = { text, value: read(cellsFn(c.env, c.links)), app: f.evaluateFormula(c.formula, envOf(c.env)).value };
      if (c.change) Object.assign(out, { changed: read(cellsFn(c.change, c.links)), appChanged: f.evaluateFormula(c.formula, envOf(c.change)).value });
      return out;
    });
  }, [EXCEL_CASES, cellsOf.toString()]);
  // "How this quantity is derived" rows (D-250).
  ex = await page.evaluate(async (cases) => {
    const q = await import("/src/lib/estimate/quantityExplain.ts");
    const f = await import("/src/lib/takeoff/subItems/formula.ts");
    const names = { dimension: (k) => k, variable: () => null, rough: () => null, derived: () => null };
    return cases.map((c) => {
      if (c.parent) {
        const p = q.explainParent(c.parent, c.sheets);
        return { multiplied: p.multiplied, shares: p.sheets.map((s) => s.share) };
      }
      const env = { ...c.env, dims: new Map(Object.entries(c.env.dims)) };
      const e = q.explainSubItem(c.formula, env, names);
      return { substituted: e.substituted, steps: e.steps, value: e.value, app: f.evaluateFormula(c.formula, env).value };
    });
  }, EXPLAIN_CASES);
  // Metric rows (D-375, D-376): lib/measure and the dimension parser.
  mt = await page.evaluate(async ([entry, display, manual, names, dims, pinned, picks]) => {
    const u = await import("/src/lib/takeoff/subItems/units.ts");
    const m = await import("/src/lib/measure.ts");
    const n = await import("/src/lib/takeoff/displayName.ts");
    const dt = await import("/src/lib/takeoff/engine/dimension.ts");
    const d = await import("/src/lib/takeoff/dimensions/parseDimension.ts");
    const z = await import("/src/lib/takeoff/dimensions/itemDimensions.ts");
    return {
      entry: entry.map((c) => {
        const feet = d.parseHeightFeet(c.raw, true);
        return { feet, readback: feet === null ? null : m.formatMetricLength(feet, c.raw), zero: feet === null ? null : z.isEmptyOrZeroDimensionValue(feet) };
      }),
      display: display.map((c) => m.displayQuantity(c.value, c.unit, "metric")),
      manual: manual.map((c) => {
        const stored = c.typed / m.metricFactor(c.tool);
        return { stored, shownText: m.formatDisplayQuantity(stored, c.tool, "metric") };
      }),
      names: names.map((c) => n.displayName(c.item, c.system)),
      dims: dims.map((c) => dt.formatMeters(c.feet)),
      pinned: pinned.map((c) => ({ ...m.displayQuantity(c.value, c.ref, c.system), factor: c.system === "metric" ? m.metricFactor(c.ref) : null })),
      picks: picks.map((c) => {
        const g = u.unitChoices(c.system);
        const hit = g[c.group].find((x) => x.label === c.label);
        return hit ? { code: hit.code, pinned: hit.pinned } : null;
      }),
    };
  }, [ENTRY_CASES, DISPLAY_CASES, MANUAL_CASES, NAME_CASES, DIMENSION_TOOL_CASES, PINNED_CASES, PICK_CASES]);
  // Phase E: sub-item formulas in a metric project, and the template warning's constants.
  mt.fx = await page.evaluate(async ([cases, constants]) => {
    const e = await import("/src/lib/takeoff/subItems/inSystem.ts");
    return {
      fx: cases.map((c) => {
        const m = (o) => new Map(Object.entries(o ?? {}));
        const env = { parent: c.parent, dims: m(c.dims), subs: m(c.subs), refs: m(c.refs) };
        const r = e.evaluateInSystem(c.formula, env, { system: c.system, parentUnit: c.parentUnit, resultUnit: c.resultUnit, subUnits: m(c.subUnits), refUnits: m(c.refUnits) });
        return r.ok ? r.value : { error: r.error };
      }),
      constants: constants.map((c) => e.formulasWithAddedConstants(c.rows).map((r) => r.name)),
    };
  }, [FORMULA_SYSTEM_CASES, CONSTANT_CASES]);
  // D-397: cost-component formulas, the Quantity popover and the export in a metric project.
  mt.b2 = await page.evaluate(async ([comps, explainCases, excelCases]) => {
    const cm = await import("/src/lib/estimate/components.ts");
    const qe = await import("/src/lib/estimate/quantityExplain.ts");
    const sy = await import("/src/lib/takeoff/subItems/inSystem.ts");
    const xf = await import("/src/lib/estimate/exportFormulas.ts");
    const map = (o) => new Map(Object.entries(o ?? {}));
    const names = { lengthUnit: "m", dimension: () => "Depth", variable: () => null, rough: () => null, derived: () => null };
    const components = comps.map((c) => {
      const env = { parent: c.qty, qty: c.qty, units: { qty: c.hostUnit, parent: c.hostUnit } };
      const e = cm.evaluateComponent({ ...c.c, id: c.id, takeoff_item_id: "host", position: 0, name: c.id }, env);
      return e.error ? { error: e.error } : e.total;
    });
    const explains = explainsIn(explainCases);
    function explainsIn(list) {
      return list.map((c) => {
        if (c.sheets) {
          const e = qe.parentInMetric(qe.explainParent(c.parent, c.sheets), c.parent.unit);
          return { measured: e.measured, unit: e.unit, deductArea: e.sheets[0]?.deductArea ?? null, areaUnit: e.areaUnit, lengthUnit: e.lengthUnit, multiplied: e.multiplied, depth: e.volume?.depthFt ?? null, volumeIn: e.volumeIn };
        }
        const env = sy.metricEnv({ parent: c.parent, dims: map(c.dims) }, c.parentUnit, {});
        const e = qe.explainSubItem(c.formula, env, names);
        return { substituted: e.substituted, value: e.value, dimUnit: e.inputs.find((i) => i.kind === "dimension")?.unit ?? null };
      });
    }
    const excels = excelCases.map((c) => {
      const env = sy.metricEnv({ parent: c.parent, dims: map(c.dims) }, c.parentUnit, {});
      const expr = xf.verifiedQtyExpression(c.formula, env, c.cell);
      if (!expr) return { live: false };
      const read = xf.evaluateCellFormula(xf.literalExpression(expr), () => null);
      return { live: true, read, expr };
    });
    return { components, explains, excels };
  }, [COMPONENT_SYSTEM_CASES, EXPLAIN_METRIC_CASES, EXCEL_METRIC_CASES]);
  // D-399…D-404: the six spots closed, each through the code its screen calls.
  mt.close = await page.evaluate(async (cases) => {
    const lo = await import("/src/features/project/locale.ts");
    const ms = await import("/src/lib/measure.ts");
    const dm = await import("/src/lib/takeoff/dimensions/itemDimensions.ts");
    const os = await import("/src/features/takeoff/earthwork/registration/offset.ts");
    const jt = await import("/src/features/takeoff/earthwork/site/joinText.ts");
    const se = await import("/src/lib/estimate/sharedEquipment.ts");
    const ce = await import("/src/lib/estimate/componentEnv.ts");
    const cm = await import("/src/lib/estimate/components.ts");
    const metric = lo.measureFormat("metric");
    return cases.map((c) => {
      if (c.kind === "offset-shown") return os.offsetShown(c.feet, c.metric);
      if (c.kind === "join-length") return jt.joinLength(c.feet, c.places, c.metric);
      if (c.kind === "template-preview") {
        const env = ce.templatePreviewEnv(c.typed, c.unit, c.system);
        const e = cm.evaluateComponent({ ...c.c, formula_unit_system: c.system, id: c.id, takeoff_item_id: "t", position: 0, name: c.id }, env);
        return e.error ? { error: e.error } : Math.round(e.total * 100) / 100;
      }
      if (c.kind === "usage") {
        const host = { id: "h", name: "h", effNode: null, qty: c.qty, unit: c.unit, laborCrewHours: null, hasSubcontract: false, env: { parent: c.qty, qty: c.qty, units: { qty: c.unit, parent: c.unit } } };
        const r = se.resolveUsage(host, { resource_id: "r", takeoff_item_id: "h", usage_formula: c.formula, formula_unit_system: c.system, usage_hours_override: null, manual_pct: null, excluded: false, last_share: null });
        return r.error ? { error: r.error } : r.hours;
      }
      if (c.kind === "rate-shown") return ms.perUnitShown(c.stored, c.f);
      if (c.kind === "rate-stored") return ms.perUnitStored(c.typed, c.f);
      if (c.kind === "offset-feet") return os.offsetFeet(c.typed, c.metric);
      if (c.kind === "dim-length") return ms.formatMetricLength(dm.dimensionFeetMap([{ ...c.dim, id: "x", item_id: "i" }]).get(c.dim.local_key) ?? NaN);
      if (c.kind === "guest-format") return metric.format(c.value, c.unit);
      if (c.kind === "guest-quantity") return metric.quantity(c.value, c.unit).value;
      return { error: "unknown kind " + c.kind };
    });
  }, CLOSE_CASES);
  // D-620, D-632: the clicks through the app's own pen (Ortho on or off), then the shape, then its figure.
  mt.pen = await page.evaluate(async (cases) => {
    const sn = await import("/src/lib/takeoff/engine/snap.ts");
    const dr = await import("/src/lib/takeoff/engine/draw.ts");
    const q = await import("/src/lib/takeoff/quantity.ts");
    return cases.map((c) => {
      const page = { widthPt: c.page[0], heightPt: c.page[1] };
      const view = { pxPerNormX: c.page[0] / 2, pxPerNormY: c.page[1] / 2 };
      // Each click from the run's last vertex, as the canvas's pen: an A-arc's through point is
      // not a vertex, so its end is taken from the arc's start too.
      const landed = [];
      const vertices = [];
      for (const [k, p] of (c.clicks ?? [c.a, c.b]).entries()) {
        const at = sn.orthoPen(vertices[vertices.length - 1], { x: p[0], y: p[1] }, view, { ortho: c.ortho, tool: c.tool, mode: c.mode, arcArmed: (c.armed ?? []).includes(k), toleranceDeg: 15 });
        landed.push(at);
        if (k !== c.through) vertices.push(at);
      }
      const drawn = c.mode === "arc" || c.mode === "rectangle" || c.mode === "ellipse" ? landed : vertices;
      const shape = dr.shapeFrom(c.tool, c.mode, drawn, page);
      let meta = shape.meta;
      if (c.through !== undefined) {
        // The canvas's inline arc (F7-S9): the edge from the vertex before the through point bends through it.
        const i = c.through - 1;
        meta = { ...(meta ?? {}), arcs: [{ i, ...dr.arcFrom3(landed[c.through - 1], landed[c.through], landed[c.through + 1], page) }] };
      }
      const value =
        c.tool === "sf"
          ? q.areaOnSheet([{ points: shape.points, meta }], [], c.fpp, page)
          : q.quantityFor("lf", shape.points, c.fpp, meta, page);
      return { value, end: [landed[landed.length - 1].x, landed[landed.length - 1].y], landed: landed.map((p) => [p.x, p.y]) };
    });
  }, PEN_CASES);
  // F13's rows: lib/takeoff/autoCount on synthetic sheets (D-189).
  ac = await page.evaluate(async ([cases, pipe]) => {
    const vm = await import("/src/lib/takeoff/autoCount/vectorMatch.ts");
    const rp = await import("/src/lib/takeoff/autoCount/resultPipeline.ts");
    const vc = await import("/src/lib/takeoff/autoCount/valleyCut.ts");
    const st = await import("/src/lib/takeoff/autoCount/settings.ts");
    const vector = cases.map((c) => {
      const polylines = c.page.map((s) => ({ closed: s.closed, pts: s.pts.map(([x, y]) => ({ x, y })) }));
      const template = vm.buildVectorTemplate(polylines, c.box, []);
      if (!template) return { error: "no template" };
      const raw = vm.matchVectorSymbols(polylines, template, 0.15, undefined, [], { ...c.opts, dropUniqueAnchors: true, aspect: c.aspect });
      const { candidates } = rp.finalizeAutoCountCandidates(raw, { floor: 0.15, iouThreshold: 0.6 });
      const out = {};
      let instancesAboveBar = 0;
      const aboveNames = [];
      let decoyAboveBar = false;
      for (const pr of c.probes) {
        const hit = candidates.find((k) => pr.x >= k.bbox.x && pr.x <= k.bbox.x + k.bbox.w && pr.y >= k.bbox.y && pr.y <= k.bbox.y + k.bbox.h);
        if (!hit) continue;
        const above = rp.isAutoCountChecked(hit.score, 78);
        if (pr.name.startsWith("decoy")) { if (above) decoyAboveBar = true; continue; }
        if (above) {
          instancesAboveBar++;
          aboveNames.push(pr.name);
          out[pr.name] = `${hit.mirrored ? "m" : ""}${hit.turn ?? 0}`;
        }
        if (pr.name === "asDrawn") out.selfScore = Math.round(hit.score * 1e6) / 1e6;
      }
      return { ...out, instancesAboveBar, decoyAboveBar, above: aboveNames.join(",") };
    });
    const pipeline = pipe.map((c) => {
      if (c.kind === "nms") return { survivors: rp.finalizeAutoCountCandidates(c.candidates, { floor: 0 }).candidates.map((k) => k.id).join(",") };
      if (c.kind === "check") return { at78: rp.isAutoCountChecked(0.78, 78), under78: rp.isAutoCountChecked(0.7799, 78), nearOneAt100: rp.isAutoCountChecked(0.9995, 100) };
      if (c.kind === "saturation") {
        return {
          flat: rp.detectSaturation(Array(60).fill(0.9)).saturated,
          separated: rp.detectSaturation([...Array(60).fill(0.95), ...Array(10).fill(0.3)]).saturated,
        };
      }
      if (c.kind === "valley") {
        const r = vc.computeValleyCut(c.scores.map(([score, checked]) => ({ score, checked })), 78);
        return { mode: r.mode, visible: r.visibleUnchecked.map((k) => k.score).join(","), drawer: r.drawer.map((k) => k.score).join(",") };
      }
      if (c.kind === "settings") {
        const n = st.normalizeAutoCountSettings(c.raw);
        return { overlapAllowed: n.overlapAllowed, rotations: n.rotations, vectorRotations: n.vectorRotations, includeMirror: n.includeMirror, sensitivity: n.sensitivity, angles: st.anglesForRotations(n.rotations).length };
      }
      return { error: c.kind };
    });
    return { vector, pipeline };
  }, [AUTOCOUNT_CASES, AUTOCOUNT_PIPELINE_CASES]);
  // F18's registration rows: lib/takeoff/earthwork/register.ts (D-188).
  reg = await page.evaluate(async (cases) => {
    const r = await import("/src/lib/takeoff/earthwork/register.ts");
    const geo = await import("/src/lib/takeoff/earthwork/export/georef.ts");
    const sc = ([feetPerPt, widthPt, heightPt]) => ({ feetPerPt, widthPt, heightPt });
    return cases.map((c) => {
      if (c.kind === "georef") {
        const points = c.points.map(([x, y, n, e, check], i) => ({ label: "CP-" + (i + 1), at: { x, y }, n, e, ...(check ? { check: true } : {}) }));
        const f = geo.fitGeoref(points, sc(c.scale), c.units, { fitScale: c.fitScale !== false });
        if (!f.ok) return { ok: false, reason: f.reason };
        const out = { ok: true, rotationDeg: r.rotationDegrees(f.fit.rotation), scale: f.fit.scale, maxResidual: Math.max(...f.fit.residuals), rms: f.fit.rms };
        // The fourth-monument check (D-674): the largest check point's miss.
        if (points.some((p) => p.check)) out.checkMiss = Math.max(...f.fit.residuals.filter((_, i) => points[i].check));
        if (c.probe) {
          const g = geo.gridOf(f.fit, { x: c.probe[0], y: c.probe[1] }, sc(c.scale));
          out.probe = `${+g.n.toFixed(9)},${+g.e.toFixed(9)}`;
        }
        return out;
      }
      const pairs = c.pairs.map(([[sx, sy], [tx, ty]]) => ({ source: { x: sx, y: sy }, target: { x: tx, y: ty } }));
      const f = r.fitRigid(pairs, sc(c.src), sc(c.tgt), { fitScale: Boolean(c.fitScale) });
      if (!f.ok) return { ok: false, reason: f.reason };
      const out = { ok: true, rotationDeg: r.rotationDegrees(f.fit.rotation), scale: f.fit.scale, maxResidualFt: Math.max(...f.fit.residualsFt) };
      if (f.fit.distance) Object.assign(out, { diffPct: f.fit.distance.diffPct, level: f.fit.distance.level });
      if (c.probe) {
        const m = r.mapPoint({ x: c.probe[0], y: c.probe[1] }, f.fit, sc(c.src), sc(c.tgt));
        out.probe = `${+m.x.toFixed(9)},${+m.y.toFixed(9)}`;
      }
      return out;
    });
  }, REG_ROWS);
  // F19's site rows: lib/takeoff/earthwork/site.ts (D-231).
  site = await page.evaluate(async ([joins, shapes, g, h]) => {
    const st = await import("/src/lib/takeoff/earthwork/site.ts");
    const r = await import("/src/lib/takeoff/earthwork/register.ts");
    const tin = await import("/src/lib/takeoff/earthwork/tin/index.ts");
    const vol = await import("/src/lib/takeoff/earthwork/volume/index.ts");
    const bal = await import("/src/lib/takeoff/earthwork/balance.ts");
    const sf = await import("/src/lib/takeoff/earthwork/surfaces.ts");
    const fe = await import("/src/lib/takeoff/earthwork/siteFeatures.ts");
    const md = await import("/src/lib/takeoff/earthwork/model.ts");
    const sc = ([feetPerPt, widthPt, heightPt]) => ({ feetPerPt, widthPt, heightPt });
    const pt = ([x, y]) => ({ x, y });
    const fmt = (p) => `${+p.x.toFixed(9)},${+p.y.toFixed(9)}`;
    const rad = (d) => (d * Math.PI) / 180;
    const join = joins.map((c) => {
      if (c.kind === "place") {
        const p = st.placeMember({ rotation: rad(c.base.rotationDeg), scale: c.base.scale, tx: c.base.tx, ty: c.base.ty }, { rotation: rad(c.fit.rotationDeg), scale: c.fit.scale, tx: c.fit.tx, ty: c.fit.ty });
        return { rotationDeg: r.rotationDegrees(p.rotation), scale: p.scale, tx: p.tx, ty: p.ty };
      }
      const res = st.fitJoin(c.source.map(pt), sc(c.src), c.target.map(pt), sc(c.tgt), { fitScale: Boolean(c.fitScale), sourceCentre: c.sourceCentre && pt(c.sourceCentre), targetCentre: c.targetCentre && pt(c.targetCentre) });
      if (!res.ok) return { ok: false, reason: res.reason };
      const f = res.join.fit;
      const out = { ok: true, reversed: res.join.reversed, rotationDeg: r.rotationDegrees(f.rotation), scale: f.scale, missFt: res.join.missFt };
      if (f.distance) Object.assign(out, { diffPct: f.distance.diffPct, level: f.distance.level });
      if (c.probe) out.probe = fmt(r.mapPoint(pt(c.probe), f, sc(c.src), sc(c.tgt)));
      return out;
    });
    const A = { sheet: "A", scale: sc(g.S20), placement: st.ANCHOR, region: st.visibleRegion([g.A_LINE.map(pt)], pt(g.A_CENTRE)), sortOrder: 0 };
    const fitB = st.fitJoin(g.B_LINE.map(pt), sc(g.S30), g.A_LINE.map(pt), sc(g.S20), { sourceCentre: pt(g.B_CENTRE), targetCentre: pt(g.A_CENTRE) });
    const B = { sheet: "B", scale: sc(g.S30), placement: st.placeMember(st.ANCHOR, fitB.join.fit), region: st.visibleRegion([g.B_LINE.map(pt)], pt(g.B_CENTRE)), sortOrder: 1 };
    const members = [A, B];
    const lenFt = (pts, m) => pts.slice(1).reduce((t, p, i) => { const a = r.toFeet(pts[i], m.scale); const b = r.toFeet(p, m.scale); return t + Math.hypot(b.x - a.x, b.y - a.y); }, 0);
    const areaFt = (rings, m) => rings.reduce((t, ring, k) => { const a = Math.abs(st.area(ring.map((p) => r.toFeet(p, m.scale)))); return t + (k === 0 ? a : -a); }, 0);
    const six = (v) => +v.toFixed(6);
    const shape = shapes.map((c) => {
      if (c.kind === "region") return { aArea: Math.abs(st.area(A.region)), bArea: Math.abs(st.area(B.region)) };
      if (c.kind === "split") {
        const ps = st.splitAtJoins(c.run.map(pt), members);
        const ls = ps.map((p) => lenFt(p.points, members[p.member]));
        return { pieces: ps.length, members: ps.map((p) => p.member).join(","), lengthsFt: ls.map(six).join(","), totalFt: ls.reduce((a, b) => a + b, 0) };
      }
      if (c.kind === "clip") {
        const as = st.clipAreaToMembers(c.polygon.map(pt), members).map((p) => areaFt(p.rings, members[p.member]));
        const ds = st.clipAreaToMembers(c.deduct.map(pt), members).map((p) => areaFt(p.rings, members[p.member]));
        return { areasSf: as.map(six).join(","), totalSf: as.reduce((a, b) => a + b, 0), deductSf: ds.map(six).join(",") };
      }
      if (c.kind === "rejoin") {
        const ps = st.splitAtJoins(c.run.map(pt), members).map((p) => p.points.map((q) => st.toSite(q, members[p.member])));
        const chains = st.rejoinRuns([[...ps[1]].reverse(), ps[0]]);
        const ch = chains[0];
        const total = ch.slice(1).reduce((t, p, i) => t + Math.hypot(p.x - ch[i].x, p.y - ch[i].y), 0);
        return { chains: chains.length, totalFt: total, ends: [ch[0], ch[ch.length - 1]].sort((p, q) => p.x - q.x).map(fmt).join(" ") };
      }
      if (c.kind === "slide") return { point: fmt(st.slideOnMatchLine(pt(c.point), c.line.map(pt))) };
      if (c.kind === "clipstitch") {
        // Ground to each sheet's points: A 3.6 pt a foot; B 2.4 pt a foot of ground − (50, −20).
        const onA = ([x, y]) => ({ x: x * 3.6, y: y * 3.6 });
        const onB = ([x, y]) => ({ x: (x - 50) * 2.4, y: (y + 20) * 2.4 });
        const traced = (list, on) => list.map((l) => ({ id: l.id, surface: "EG", elevation: l.z, closed: Boolean(l.closed), pts: l.pts.map(on) }));
        const pa = st.clipTrace(traced(c.lines.a, onA), A);
        const pb = st.clipTrace(traced(c.lines.b, onB), B);
        const res = st.stitchTrace([pa, pb], [{ ...A, matchLines: [g.A_LINE.map(pt)] }, { ...B, matchLines: [g.B_LINE.map(pt)] }], 3);
        return { aPieces: pa.length, bPieces: pb.length, joined: res.joined.length, flags: res.flags.map((f) => f.code + ":" + f.message).join("|") };
      }
      if (c.kind === "site-accept") {
        // C-200 as one sheet: page 3's EG through its link, C-200's FG and boundary (as regaccept).
        const d = c.data;
        const src = { feetPerPt: 60 / 72, widthPt: 2448, heightPt: 1584 };
        const tgt = { feetPerPt: 30 / 72, widthPt: 2448, heightPt: 1584 };
        const fit = r.fitRigid(d.pairs.map((pr) => ({ source: pt(pr.source), target: pt(pr.target) })), src, tgt);
        if (!fit.ok) return { ok: false, reason: fit.reason };
        const eg = d.eg.map((x, i) => ({ item: "eg", geometry: "eg" + i, version: 1, kind: "contour", surface: "EG", elevation: x.z, points: x.p.map(pt) }));
        const fg = d.fg.map((x, i) => ({ item: x.kind === "contour" ? "fg" : "fgspots", geometry: "fg" + i, version: 1, kind: x.kind === "contour" ? "contour" : "spot_elevation", surface: "FG", elevation: x.z, points: x.p.map(pt) }));
        const whole = [...fg, { item: "b", geometry: "b", version: 1, kind: "boundary", surface: null, elevation: null, points: d.boundary.map(pt) }, ...r.mapRuns(eg, fit.fit, src, tgt, 0, "p3")];
        const labels = new Map(whole.map((x) => [x.item, x.item]));
        const calc = (rs, calibration) => {
          const b = rs.find((x) => x.kind === "boundary");
          return vol.computeVolumes({ eg: tin.runTinForSurface(rs, "EG", labels, calibration), fg: tin.runTinForSurface(rs, "FG", labels, calibration), boundary: b ? b.points : null, calibration, units: "CY" }, rs, labels);
        };
        // A crop: the runs clipped to x in [x0, x1] of C-200's page, normalised to the crop's own page.
        const crop = ([x0, x1]) => {
          const w = x1 - x0;
          const local = (q) => ({ x: (q.x - x0) / w, y: q.y });
          // Liang–Barsky against the crop's page, [x0, x1] × [0, 1]: the piece of a segment
          // inside it, and whether it entered or left there.
          const clipSeg = (a, b) => {
            let t0 = 0;
            let t1 = 1;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            for (const [pp, qq] of [[-dx, a.x - x0], [dx, x1 - a.x], [-dy, a.y], [dy, 1 - a.y]]) {
              if (pp === 0) {
                if (qq < 0) return null;
                continue;
              }
              const t = qq / pp;
              if (pp < 0) {
                if (t > t1) return null;
                if (t > t0) t0 = t;
              } else {
                if (t < t0) return null;
                if (t < t1) t1 = t;
              }
            }
            return { a: { x: a.x + t0 * dx, y: a.y + t0 * dy }, b: { x: a.x + t1 * dx, y: a.y + t1 * dy }, entered: t0 > 0, left: t1 < 1 };
          };
          const lines = (pts) => {
            const out = [];
            let cur = null;
            for (let k = 1; k < pts.length; k++) {
              const piece = clipSeg(pts[k - 1], pts[k]);
              if (!piece) {
                if (cur) out.push(cur), (cur = null);
                continue;
              }
              if (cur && piece.entered) out.push(cur), (cur = null);
              if (!cur) cur = [piece.a];
              cur.push(piece.b);
              if (piece.left) out.push(cur), (cur = null);
            }
            if (cur) out.push(cur);
            return out.filter((q) => q.length >= 2);
          };
          // Sutherland–Hodgman, one page edge at a time.
          const clipPoly = (poly, keep, cross) => {
            const out = [];
            for (let k = 0; k < poly.length; k++) {
              const a = poly[k];
              const b = poly[(k + 1) % poly.length];
              if (keep(a)) out.push(a);
              if (keep(a) !== keep(b)) out.push(cross(a, b));
            }
            return out;
          };
          const atX = (x) => (a, b) => ({ x, y: a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x) });
          const atY = (y) => (a, b) => ({ x: a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y), y });
          const inPage = (q) => q.x >= x0 && q.x <= x1 && q.y >= 0 && q.y <= 1;
          const runs = [];
          for (const run of whole) {
            if (run.kind === "boundary") {
              let ring = clipPoly(run.points, (q) => q.x >= x0, atX(x0));
              ring = clipPoly(ring, (q) => q.x <= x1, atX(x1));
              ring = clipPoly(ring, (q) => q.y >= 0, atY(0));
              ring = clipPoly(ring, (q) => q.y <= 1, atY(1));
              if (ring.length >= 3) runs.push({ ...run, points: ring.map(local) });
            } else if (run.kind === "spot_elevation") {
              if (inPage(run.points[0])) runs.push({ ...run, points: run.points.map(local) });
            } else lines(run.points).forEach((piece, k) => runs.push({ ...run, geometry: run.geometry + "#" + k, points: piece.map(local) }));
          }
          return { scale: { feetPerPt: tgt.feetPerPt, widthPt: tgt.widthPt * w, heightPt: tgt.heightPt }, runs, line: [pt([(c.line - x0) / w, 0]), pt([(c.line - x0) / w, 1])] };
        };
        // C-200 as one sheet: its own page's linework (page 3's EG runs past it; a trace of C-200
        // sees its page only), triangulated in true geometry, as the site is (a square frame,
        // D-271 20). The sheet engine triangulates in true feet too since D-272; the row keeps
        // its own square frame, unchanged.
        const fw = tgt.widthPt * tgt.feetPerPt;
        const fh = tgt.heightPt * tgt.feetPerPt;
        const L = Math.max(fw, fh);
        const one = calc(
          crop([0, 1]).runs.map((x) => ({ ...x, points: x.points.map((q) => ({ x: (q.x * fw) / L, y: (q.y * fh) / L })) })),
          { feetPerNorm: 1, widthPt: L, heightPt: L },
        );
        if (one.ok !== true) return { ok: false, message: "one sheet: " + (one.error?.message ?? one.ok) };
        const W = crop(c.west);
        const E = crop(c.east);
        const joined = st.fitJoin(E.line, E.scale, W.line, W.scale, { sourceCentre: pt([0.9, 0.5]), targetCentre: pt([0.1, 0.5]) });
        if (!joined.ok) return { ok: false, reason: joined.reason };
        const MW = { sheet: "W", scale: W.scale, placement: st.ANCHOR, region: st.visibleRegion([W.line], pt([0.1, 0.5])), sortOrder: 0 };
        const ME = { sheet: "E", scale: E.scale, placement: st.placeMember(st.ANCHOR, joined.join.fit), region: st.visibleRegion([E.line], pt([0.9, 0.5])), sortOrder: 1 };
        const surface = st.siteRuns([MW, ME], new Map([["W", W.runs], ["E", E.runs]]));
        const two = calc(surface.runs, { feetPerNorm: 1, widthPt: surface.page.widthPt, heightPt: surface.page.heightPt });
        if (two.ok !== true) return { ok: false, message: "site: " + (two.error?.message ?? two.ok) };
        const b = (x) => bal.soilBalance({ cut: x.cutCY, fill: x.fillCY, reuseBank: 0, suitable: true, swell: 1.15, shrink: 1.1 });
        const cents = (a, z) => Math.abs(a - z) < 0.005;
        return {
          ok: true,
          cutEqual: cents(one.cutCY, two.cutCY),
          fillEqual: cents(one.fillCY, two.fillCY),
          exportEqual: cents(b(one).exportLoose ?? 0, b(two).exportLoose ?? 0),
          detail: `one ${one.cutCY.toFixed(4)}/${one.fillCY.toFixed(4)} site ${two.cutCY.toFixed(4)}/${two.fillCY.toFixed(4)}`,
        };
      }
      if (c.kind === "site-volume" || c.kind === "site-balance" || c.kind === "site-extras" || c.kind === "site-kept" || c.kind === "stitch") {
        const SA = { sheet: "A", scale: sc(h.P01), placement: st.ANCHOR, region: st.visibleRegion([h.aLine.map(pt)], pt(h.aCentre)), sortOrder: 0 };
        const SB = { sheet: "B", scale: sc(h.P02), placement: h.bPlacement, region: st.visibleRegion([h.bLine.map(pt)], pt(h.bCentre)), sortOrder: 1 };
        if (c.kind === "stitch") {
          const ms = [{ ...A, matchLines: [g.A_LINE.map(pt)] }, { ...B, matchLines: [g.B_LINE.map(pt)] }];
          const lines = (list) => list.map((l) => ({ ...l, pts: l.pts.map(pt) }));
          const res = st.stitchTrace([lines(c.pieces.a), lines(c.pieces.b)], ms, 3);
          return { joined: res.joined.length, flags: res.flags.map((f) => f.code + ":" + f.message).join("|") };
        }
        const runs = (list, tag) => list.map((x, i) => ({ item: x.item, geometry: tag + i, version: 1, kind: x.kind, surface: x.surface, elevation: x.elevation, points: x.points.map(pt) }));
        const labels = (rs) => new Map(rs.map((x) => [x.item, x.item]));
        const calc = (rs, calibration) => {
          const b = rs.find((x) => x.kind === "boundary");
          const out = vol.computeVolumes({ eg: tin.runTinForSurface(rs, "EG", labels(rs), calibration), fg: tin.runTinForSurface(rs, "FG", labels(rs), calibration), boundary: b ? b.points : null, calibration, units: "CY" }, rs, labels(rs));
          return out.ok === true ? out : { ok: out.ok, cutCY: NaN, fillCY: NaN, error: out.error ? out.error.message : String(out.ok) };
        };
        const ra = runs(c.halves.a, "a");
        const rb = runs(c.halves.b, "b");
        const surface = st.siteRuns([SA, SB], new Map([["A", ra], ["B", rb]]));
        if (c.kind === "site-extras" || c.kind === "site-kept") {
          // The members' drawings as items (sheetRuns and sheetFeatures read them), on sheets A and B.
          const geom = (sheet, points, meta, k) => ({ uuid: sheet + k, sheet_uuid: sheet, vertices_json: points, shape_meta: meta, geometry_version: 1, role: "add" });
          const on = { A: ([gx, gy]) => [gx / 100, gy / 100], B: ([gx, gy]) => [gx / 200, (gy + 50) / 200] };
          const items = [
            ...[["A", c.halves.a], ["B", c.halves.b]].flatMap(([sheet, list]) => list.map((x, k) => ({ uuid: sheet + x.item + k, type: x.kind, name: x.item, created_at: "", geometries: [geom(sheet, x.points, { surface: x.surface, elevation: x.elevation }, k)] }))),
            ...c.features.map((f) => ({
              uuid: f.uuid, type: "sf", name: f.uuid, created_at: "2026-10-06T00:00:00Z", is_site_feature: true, role_depth_ft: 0,
              undercut_depth_ft: f.undercut_depth_ft, undercut_offset_ft: f.undercut_offset_ft, undercut_fill_material: null, undercut_disposition: "haul_off", prep_depth_ft: f.prep_depth_ft, prep_lifts: f.prep_lifts,
              geometries: Object.entries(f.pieces).map(([sheet, pts], k) => geom(sheet, pts.map(on[sheet]), null, k)),
            })),
          ];
          const rows = c.strips.map((x) => ({ name: x.uuid, feature_uuids: [], vertices_json: null, color: "", disposition: "haul_off", reuse_kind: null, is_hidden: false, ...x }));
          const own = st.siteRuns([SA, SB], new Map(["A", "B"].map((s) => [s, sf.sheetRuns(items, s)])));
          const ex = st.siteExtras([SA, SB], items, rows, own);
          const frame = { feetPerNorm: 1, widthPt: own.page.widthPt, heightPt: own.page.heightPt };
          const bnd = own.runs.find((x) => x.kind === "boundary");
          const labels = new Map(items.map((x) => [x.uuid, x.name]));
          if (c.kind === "site-kept") {
            // D-554: the site view's Calculate inputs, kept, sent as JSON, read back, built again.
            const inputs = { runs: own.runs, labels, frame, boundary: bnd ? bnd.points : null, roleAreas: fe.roleAreasOf(ex.features), stripAreas: ex.strips };
            const first = md.buildSiteModel(inputs);
            const back = md.fromKeptSite(JSON.parse(JSON.stringify(md.keptSiteInputs(inputs, own.page, ex.features))));
            if (first.volumes.ok !== true || !back) return { error: first.volumes.ok !== true ? String(first.volumes.ok) : "not read back" };
            const again = md.buildSiteModel(back.inputs);
            return { same: md.sameNumbers(again.volumes, first.volumes), cutCY: again.volumes.cutCY, fillCY: again.volumes.fillCY, keptStrips: (back.inputs.stripAreas ?? []).length, keptRead: back.page.widthPt === own.page.widthPt && back.features.length === ex.features.length };
          }
          const out = vol.computeVolumes({ eg: tin.runTinForSurface(own.runs, "EG", labels, frame), fg: tin.runTinForSurface(own.runs, "FG", labels, frame), boundary: bnd ? bnd.points : null, calibration: frame, units: "CY", roleAreas: fe.roleAreasOf(ex.features), stripAreas: ex.strips }, own.runs, labels);
          if (out.ok !== true) return { error: out.error ? out.error.message : String(out.ok) };
          const fx = fe.computeFeatureExtras(ex.features, bnd ? bnd.points : null, frame);
          const u = fx.find((x) => x.undercut);
          const p = fx.find((x) => x.prep);
          const res = { strips: (out.stripAreas ?? []).filter((x) => x.volumeCY > 0).length, stripCY: (out.stripAreas ?? []).reduce((t, x) => t + x.volumeCY, 0), features: ex.features.length, cutCY: out.cutCY, fillCY: out.fillCY };
          if (u) Object.assign(res, { undercutSF: u.undercut.areaSF, undercutCF: u.undercut.volumeCF });
          if (p) res.prepSF = p.prep.areaSF;
          return res;
        }
        const siteCalc = calc(surface.runs, { feetPerNorm: 1, widthPt: surface.page.widthPt, heightPt: surface.page.heightPt });
        const bnd = surface.runs.find((x) => x.kind === "boundary");
        const boundarySF = bnd ? Math.abs(st.area(bnd.points)) * surface.page.widthPt * surface.page.heightPt : 0;
        if (c.kind === "site-volume") return { ok: siteCalc.ok, cutCY: siteCalc.cutCY, fillCY: siteCalc.fillCY, boundarySF, error: siteCalc.error };
        const west = calc(ra, { feetPerNorm: h.P01[0], widthPt: h.P01[1], heightPt: h.P01[2] });
        const east = calc(rb, { feetPerNorm: h.P02[0], widthPt: h.P02[1], heightPt: h.P02[2] });
        const b = (cut, fill) => bal.soilBalance({ cut, fill, reuseBank: 0, suitable: true, swell: 1, shrink: 1 });
        const w = b(west.cutCY, west.fillCY);
        const e = b(east.cutCY, east.fillCY);
        const s = b(siteCalc.cutCY, siteCalc.fillCY);
        const round = (v) => (v === null || v === undefined ? null : Math.round(v * 1e6) / 1e6);
        return { siteCutCY: siteCalc.cutCY, siteFillCY: siteCalc.fillCY, westExport: round(w.exportLoose), eastImport: round(e.importLoose), siteExport: round(s.exportLoose), siteImport: round(s.importLoose) };
      }
      return { error: c.kind };
    });
    return { join, shape };
  }, [SITE_JOIN_CASES, SITE_SHAPE_CASES, SITE_GROUND, SITE_HALVES]);
  // F12's rows: lib/takeoff/earthwork on legacy's hand-worked fixtures (D-136).
  earth = await page.evaluate(async (cases) => {
    const tin = await import("/src/lib/takeoff/earthwork/tin/index.ts");
    const vol = await import("/src/lib/takeoff/earthwork/volume/index.ts");
    const bal = await import("/src/lib/takeoff/earthwork/balance.ts");
    const sf = await import("/src/lib/takeoff/earthwork/siteFeatures.ts");
    const ln = await import("/src/lib/takeoff/earthwork/lines.ts");
    const st = await import("/src/lib/takeoff/earthwork/strips.ts");
    const tr = await import("/src/lib/takeoff/earthwork/trace/index.ts");
    const inf = await import("/src/lib/takeoff/earthwork/trace/infer.ts");
    const ps = await import("/src/lib/takeoff/engine/pdfSnap.ts");
    const sc = await import("/src/lib/takeoff/earthwork/scene3d.ts");
    const bd = await import("/src/lib/takeoff/earthwork/volume/bands.ts");
    const ed = await import("/src/lib/takeoff/earthwork/edit.ts");
    const rg = await import("/src/lib/takeoff/earthwork/register.ts");
    const ec = await import("/src/lib/takeoff/earthwork/elevationCheck.ts");
    const sx = await import("/src/lib/takeoff/earthwork/surfaces.ts");
    const gw = await import("/src/lib/takeoff/earthwork/geotech/water.ts");
    const gf = await import("/src/lib/takeoff/earthwork/geotech/field.ts");
    const gm = await import("/src/lib/takeoff/earthwork/geotech/model.ts");
    const gc = await import("/src/lib/takeoff/earthwork/geotech/materials.ts");
    const gs = await import("/src/lib/takeoff/earthwork/geotech/slopeRule.ts");
    const gp = await import("/src/features/takeoff/earthwork/geotech/placed.ts");
    const sk = await import("/src/features/takeoff/earthwork/site/siteKey.ts");
    const xy = (poly) => poly.map(([x, y]) => ({ x, y }));
    const ptsText = (pts) => pts.map((p) => `${+p.x.toFixed(6)},${+p.y.toFixed(6)}`).join(" ");
    const runsOf = (runs) => runs.map((r, i) => ({ item: r.item, geometry: `${r.item}-${i}`, version: 1, kind: r.kind, surface: r.surface, elevation: r.elevation, points: r.points.map(([x, y]) => ({ x, y })) }));
    const labelsOf = (runs) => new Map(runs.map((r) => [r.item, r.label]));
    return cases.map((c) => {
      if (c.kind === "tin") {
        const runs = runsOf(c.runs);
        const labels = labelsOf(c.runs);
        const r = tin.runTinForSurface(runs, c.surface, labels);
        const out = { ok: r.ok, crossingRuns: tin.crossingRuns(runs, labels).runIds.size };
        if (r.ok === false) return { ...out, code: r.error.code, message: r.error.message };
        if (r.ok !== true) return out;
        const edges = new Set();
        const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
        for (let t = 0; t < r.mesh.triangles.length; t += 3) {
          const [a, b2, d] = [r.mesh.triangles[t], r.mesh.triangles[t + 1], r.mesh.triangles[t + 2]];
          edges.add(key(a, b2)).add(key(b2, d)).add(key(d, a));
        }
        return {
          ...out,
          points: r.mesh.points.length / 2,
          triangles: r.mesh.triangles.length / 3,
          constraints: r.mesh.constraints.length,
          constraintsKept: r.mesh.constraints.every((e) => edges.has(key(e.a, e.b))),
          warnings: r.warnings.map((w) => w.code),
          outside: r.warnings.find((w) => w.code === "points_outside_boundary")?.count ?? 0,
        };
      }
      if (c.kind === "regvolume") {
        // F18: each source's EG mapped onto the target through its pairs, merged, then the
        // target's Calculate (D-188, D-190).
        const unit = (side) => ({ feetPerPt: side, widthPt: 1, heightPt: 1 });
        const labels = labelsOf(c.runs);
        const mapped = c.sources.map((src, i) => {
          const pairs = src.pairs.map(([[sx, sy], [tx, ty]]) => ({ source: { x: sx, y: sy }, target: { x: tx, y: ty } }));
          const f = rg.fitRigid(pairs, unit(src.side), unit(c.side));
          if (!f.ok) return [];
          for (const run of src.runs) labels.set(`${run.item}@src${i}`, `src${i} · ${run.label}`);
          return rg.mapRuns(runsOf(src.runs), f.fit, unit(src.side), unit(c.side), src.offsetFt ?? 0, `src${i}`);
        });
        const volumeOf = (runs) => {
          const boundary = runs.find((r) => r.kind === "boundary");
          return vol.computeVolumes(
            { eg: tin.runTinForSurface(runs, "EG", labels), fg: tin.runTinForSurface(runs, "FG", labels), boundary: boundary ? boundary.points : null, calibration: { feetPerNorm: c.side, widthPt: 1, heightPt: 1 }, units: "CY" },
            runs,
            labels,
          );
        };
        const r = volumeOf(rg.mergeEg(runsOf(c.runs), mapped));
        if (r.ok !== true) return { ok: r.ok, message: r.error?.message };
        const out = { ok: true, cutCY: r.cutCY, fillCY: r.fillCY };
        if (c.oneSheet) {
          for (const run of c.oneSheet) labels.set(run.item, run.label);
          const one = volumeOf(runsOf([...c.runs, ...c.oneSheet]));
          out.equalsOneSheet = one.ok === true && Math.abs(one.cutCY - r.cutCY) < 0.005 && Math.abs(one.fillCY - r.fillCY) < 0.005;
        }
        return out;
      }
      if (c.kind === "regaccept") {
        // Real sheets: page 3's EG through the link onto C-200, with C-200's FG and boundary.
        const d = c.data;
        const src = { feetPerPt: 60 / 72, widthPt: 2448, heightPt: 1584 };
        const tgt = { feetPerPt: 30 / 72, widthPt: 2448, heightPt: 1584 };
        const pairs = d.pairs.map((pr) => ({ source: { x: pr.source[0], y: pr.source[1] }, target: { x: pr.target[0], y: pr.target[1] } }));
        const f = rg.fitRigid(pairs, src, tgt);
        if (!f.ok) return { ok: false, reason: f.reason };
        const eg = d.eg.map((r, i) => ({ item: "eg", geometry: "eg" + i, version: 1, kind: "contour", surface: "EG", elevation: r.z, points: r.p.map(([x, y]) => ({ x, y })) }));
        const fg = d.fg.map((r, i) => ({ item: r.kind === "contour" ? "fg" : "fgspots", geometry: "fg" + i, version: 1, kind: r.kind === "contour" ? "contour" : "spot_elevation", surface: "FG", elevation: r.z, points: r.p.map(([x, y]) => ({ x, y })) }));
        const boundary = d.boundary.map(([x, y]) => ({ x, y }));
        const runs = [...fg, { item: "b", geometry: "b", version: 1, kind: "boundary", surface: null, elevation: null, points: boundary }, ...rg.mapRuns(eg, f.fit, src, tgt, 0, "p3")];
        const labels = new Map([["eg@p3", "Page 3 · Existing Ground"], ["fg", "Proposed Grade"], ["fgspots", "FG Spots"], ["b", "Work Boundary"]]);
        // The sheet's Calculate: its TINs and the difference on C-200's page, in true feet (D-272).
        const cal = { feetPerNorm: tgt.feetPerPt, widthPt: tgt.widthPt, heightPt: tgt.heightPt };
        const r = vol.computeVolumes({ eg: tin.runTinForSurface(runs, "EG", labels, cal), fg: tin.runTinForSurface(runs, "FG", labels, cal), boundary, calibration: cal, units: "CY" }, runs, labels);
        if (r.ok !== true) return { ok: r.ok, message: r.error?.message };
        return { ok: true, cutCY: Math.round(r.cutCY), fillCY: Math.round(r.fillCY), cutVsEngineerPct: Math.round(((r.cutCY - 14263) / 14263) * 1000) / 10, fillVsEngineerPct: Math.round(((r.fillCY - 8727) / 8727) * 1000) / 10 };
      }
      if (c.kind === "tiein") {
        const p = rg.tieInOffset(runsOf(c.eg), runsOf(c.fg), { widthPt: 1000, heightPt: 1000 });
        return p ?? { none: true };
      }
      if (c.kind === "regmatch") {
        const idx = ps.buildPdfSnapIndex(c.segments.map(([ax, ay, bx, by]) => ({ ax, ay, bx, by })), 1000, 1000);
        return { score: rg.matchScore(runsOf(c.runs), idx, { widthPt: 1000, heightPt: 1000 }) };
      }
      if (c.kind === "balance") return bal.soilBalance(c.input);
      // F29 Block 1 (D-533): a layer's surface, the clamps, a bore's design water.
      if (c.kind === "geo-field") {
        const pieces = gf.fieldPieces(c.points.map(([x, y, v]) => ({ x, y, v })), c.box);
        const out = {};
        for (const [x, y] of c.at) out[`D(${x},${y})`] = gf.valueAt(pieces, x, y);
        return out;
      }
      if (c.kind === "geo-slope") {
        const out = {};
        gs.SLOPE_TEMPLATE.rows.forEach((r, i) => (out[`row${i}:steeper`] = gs.steeperThanOsha(r, c.layers)));
        return out;
      }
      if (c.kind === "geo-topsoil") {
        const s = gc.topsoilSuggestion(c.bores, new Set(c.topsoil));
        return { depthFt: s?.depthFt ?? null, bores: s?.bores.join(",") ?? "" };
      }
      if (c.kind === "geo-water") {
        const out = {};
        for (const b of c.bores) out[b.id] = gw.designWater(b.readings, b.total, c.buffer ?? 1).depthFt;
        return out;
      }
      if (c.kind === "geo-link" || c.kind === "geo-site") {
        // Row 1.5's layers and bores as the api returns them (D-540).
        const row = (id, top, bottom) => ({ soil_layer_uuid: id, depth_top_ft: top, depth_bottom_ft: bottom, open_bottom: false });
        const full = [row("fill", 0, 1), row("clay", 1, 5), row("sand", 5, 10)];
        const bore = (code, sheet, point, total, layers) => ({ uuid: code, code, sheet_uuid: sheet, point, ground_elev_ft: null, total_depth_ft: total, termination: "planned", refusal_reason: null, cave_in_depth_ft: null, perched_water: false, water: [], layers });
        const geo = (bores) => ({ layers: [["fill", "Fill"], ["clay", "Clay"], ["sand", "Sand"]].map(([uuid, name]) => ({ uuid, name, interpolate: "depth", soil_group: "fill", unsuitable: false, color: "x" })), bores, water_buffer_ft: 1 });
        const out = {};
        let placed, frame;
        if (c.kind === "geo-link") {
          const scales = { tgt: { feetPerPt: 0.1, widthPt: 1200, heightPt: 1200 }, src: { feetPerPt: 0.2, widthPt: 600, heightPt: 600 } };
          const pair = (s, t) => ({ source: { x: s[0], y: s[1] }, target: { x: t[0], y: t[1] } });
          const link = { source: "src", target: "tgt", pairs: [pair([0, 0], [1, 0]), pair([1, 0], [1, 1]), pair([0, 1], [0, 0])], scaleFitted: false, offsetFt: 2, egSource: true };
          const linked = rg.linkedEg("tgt", [link], () => [], (s) => scales[s], () => "EG", (s) => s);
          const m = linked.maps[0];
          const at = m.map({ x: 1, y: 0 });
          Object.assign(out, { mappedX: at.x, mappedY: at.y });
          const own = [bore("B-1", "tgt", [0, 0], 10, full), bore("B-2", "tgt", [1, 1 / 6], 10, full), bore("B-3", "tgt", [1 / 6, 1], 10, full)];
          placed = [...own.map((b) => ({ bore: b, at: b.point, ground: null, from: null })), { bore: bore("TP-4", "src", [1, 0], 7, [row("fill", 0, 7)]), at: [at.x, at.y], ground: null, from: "src" }];
          frame = { feetPerNorm: 0.1, widthPt: 1200, heightPt: 1200 };
        } else {
          const scale = { feetPerPt: 0.1, widthPt: 1400, heightPt: 1400 };
          const page = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
          const members = [
            { sheet: "A", scale, placement: { rotation: 0, scale: 1, tx: -10, ty: -10 }, region: [{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 1 }], sortOrder: 0 },
            { sheet: "B", scale, placement: { rotation: Math.PI / 2, scale: 1, tx: 130, ty: -10 }, region: page, sortOrder: 1 },
          ];
          const data = geo([bore("B-1", "A", [1 / 14, 1 / 14], 10, full), bore("B-3", "A", [3 / 14, 13 / 14], 10, full), bore("B-2", "B", [3 / 14, 1 / 14], 10, full), bore("TP-4", "B", [13 / 14, 1 / 14], 7, [row("fill", 0, 7)]), bore("X-9", "B", [2 / 14, 12 / 14], 10, full)]);
          placed = sk.sitePlaced(members, { runs: [], page: { widthPt: 120, heightPt: 120 }, origin: { x: 0, y: 0 } }, data);
          const tp4 = placed.find((p) => p.bore.code === "TP-4");
          Object.assign(out, { tp4X: tp4?.at[0], tp4Y: tp4?.at[1] });
          frame = { feetPerNorm: 1, widthPt: 120, heightPt: 120 };
        }
        out.placed = placed.map((p) => p.bore.code).join(",");
        const m = gp.placedModel(geo(placed.map((p) => p.bore)), placed, frame);
        out.clamps = m.clamps.length;
        m.clamps.forEach((k, i) => Object.assign(out, { [`clamp${i}:areaSF`]: k.areaSF, [`clamp${i}:maxFt`]: k.maxFt, [`clamp${i}:near`]: k.nearBore }));
        return out;
      }
      if (c.kind === "geo-clamp") {
        const m = gm.buildLayerModel({ layers: c.layers.map(([id, name]) => ({ id, name, interpolate: "depth" })), bores: c.bores.map((b) => ({ ...b, ground: null, termination: "planned", refusalReason: null })), box: c.box });
        const out = { clamps: m.clamps.length };
        m.clamps.forEach((k, i) => Object.assign(out, { [`clamp${i}:layer`]: k.layer, [`clamp${i}:under`]: k.under, [`clamp${i}:areaSF`]: k.areaSF, [`clamp${i}:maxFt`]: k.maxFt, [`clamp${i}:near`]: k.nearBore, [`clamp${i}:text`]: k.text }));
        // At every piece corner each bottom is at or below the one above.
        let worst = Infinity;
        for (let L = 1; L < m.bottoms.length; L++) {
          for (const p of m.bottoms[L] ?? []) for (const [x, y] of p.poly) {
            const above = gm.depthAt(m.bottoms[L - 1], x, y);
            if (above != null) worst = Math.min(worst, gf.linearAt(p, x, y) - above);
          }
        }
        out.ordered = worst >= -1e-7;
        out.atLeastPoints = m.points.flat().filter((p) => p.atLeast).map((p) => p.bore).join(",");
        return out;
      }
      if (c.kind === "offset") return { areaSF: sf.mpAreaSqFt(sf.offsetNormRingFt(xy(c.ring), c.offsetFt, c.scale), c.scale) };
      if (c.kind === "remaining") {
        const rings = sf.remainingSiteRings(xy(c.boundary), c.excluded.map(xy));
        return { areaSF: sf.mpAreaSqFt([rings.map((r) => r.map((p) => [p.x, p.y]))], c.scale) };
      }
      if (c.kind === "features") {
        const items = c.items.map((it) => ({ ...it, type: it.type ?? "sf", geometries: it.polygons.map((p) => ({ sheet_uuid: "s", vertices_json: p, role: "add" })) }));
        const feats = sf.sheetFeatures(items, "s");
        const out = { order: feats.map((x) => x.itemId).join(","), roleAreas: sf.roleAreasOf(feats).map((a) => a.itemId).join(",") };
        if (c.scale) {
          for (const x of sf.computeFeatureExtras(feats, c.boundary ? xy(c.boundary) : null, c.scale)) {
            if (x.undercut) Object.assign(out, { [`${x.itemId}:undercutSF`]: x.undercut.areaSF, [`${x.itemId}:undercutCF`]: x.undercut.volumeCF });
            if (x.prep) out[`${x.itemId}:prepSF`] = x.prep.areaSF;
          }
        }
        return out;
      }
      if (c.kind === "realshape") {
        // D-470: shapes as stored, through the app's own readers and Calculate.
        const items = c.items.map((it) => ({ created_at: "", is_site_feature: false, ...it, geometries: it.geometries.map((g, k) => ({ uuid: `${it.uuid}-${k}`, geometry_version: 1, ...g })) }));
        const runs = sx.sheetRuns(items, "s");
        const labels = new Map(items.map((i) => [i.uuid, i.name]));
        const r1 = (v) => Math.round(v * 10) / 10;
        if (c.tinOnly) {
          const t = tin.runTinForSurface(runs, c.tinOnly.surface, labels);
          if (t.ok !== true) return { ok: t.ok, message: t.error?.message };
          const m = t.mesh;
          let z = null;
          for (let k = 0; k < m.points.length / 2; k++) if (Math.hypot(m.points[2 * k] - c.tinOnly.at[0], m.points[2 * k + 1] - c.tinOnly.at[1]) < 1e-9) z = m.elevations[k];
          return { egPoints: m.points.length / 2, egConstraints: m.constraints.length, egZAt: z };
        }
        const scale = { feetPerNorm: c.side, widthPt: 1, heightPt: 1 };
        const feats = sf.sheetFeatures(items, "s");
        const bnd = runs.find((r) => r.kind === "boundary");
        const boundary = bnd ? bnd.points : null;
        const r = vol.computeVolumes(
          { eg: tin.runTinForSurface(runs, "EG", labels), fg: tin.runTinForSurface(runs, "FG", labels), boundary, calibration: scale, units: "CY", roleAreas: sf.roleAreasOf(feats) },
          runs,
          labels,
        );
        if (r.ok !== true) return { ok: r.ok, message: r.error?.message };
        const out = { cutCF: r1(r.cutCY * 27), fillCF: r1(r.fillCY * 27), boundarySF: r1(sf.mpAreaSqFt([[boundary.map((p) => [p.x, p.y])]], scale)) };
        for (const [id, a] of sf.featureOwnAreas(feats, boundary, scale)) out[`feature:${id}:areaSF`] = r1(a);
        return out;
      }
      if (c.kind === "strips") {
        const feature = (f) => ({ itemId: f.id, label: f.id, depthFt: 0, polygons: f.polygons.map(xy), undercutDepthFt: null, undercutOffsetFt: 0, undercutMaterial: null, undercutDisposition: "haul_off", prepDepthFt: null, prepLifts: null });
        const row = (r) => ({ sheet_uuid: "s", feature_uuids: [], vertices_json: null, color: "#000000", disposition: "haul_off", reuse_kind: null, is_hidden: false, ...r });
        const boundary = xy(c.boundary);
        const feats = (c.features ?? []).map(feature);
        const inputs = st.stripInputs(c.rows.map(row), "s", boundary, feats);
        const pieces = st.stripPieces(inputs, boundary);
        const ringArea = (r) => Math.abs(r.reduce((t, p, i) => t + p.x * r[(i + 1) % r.length].y - r[(i + 1) % r.length].x * p.y, 0)) / 2;
        const out = { order: inputs.map((i) => i.id).join(","), pieces: [...pieces.keys()].join(",") };
        for (const [id, rings] of pieces) out[`piece:${id}`] = rings.reduce((t, r) => t + ringArea(r), 0) * c.side * c.side;
        if (c.runs) {
          const runs = runsOf(c.runs);
          const labels = labelsOf(c.runs);
          const r = vol.computeVolumes(
            { eg: tin.runTinForSurface(runs, "EG", labels), fg: tin.runTinForSurface(runs, "FG", labels), boundary, calibration: { feetPerNorm: c.side, widthPt: 1, heightPt: 1 }, units: "CY", stripAreas: inputs },
            runs,
            labels,
          );
          if (r.ok === true) {
            out.fillCY = r.fillCY;
            for (const a of r.stripAreas ?? []) Object.assign(out, { [`strip:${a.id}:areaSF`]: a.areaSF, [`strip:${a.id}:volumeCY`]: a.volumeCY });
          } else out.ok = r.ok;
        }
        return out;
      }
      if (c.kind === "ewedit") {
        // Editing a drawn run (D-181): points in, points (or a refusal) out.
        const pts = xy(c.points);
        if (c.op === "insert") return { points: ptsText(ed.insertPoint(pts, c.i, { x: c.at[0], y: c.at[1] })) };
        if (c.op === "remove") {
          const r = ed.removePoint(pts, c.index, c.runKind);
          return "drop" in r ? { drop: true } : { points: ptsText(r.points) };
        }
        if (c.op === "split") {
          const r = ed.splitRun(pts, c.vertex !== undefined ? { vertex: c.vertex } : { edge: c.edge, point: { x: c.at[0], y: c.at[1] } });
          return r ? { a: ptsText(r.a), b: ptsText(r.b) } : { refused: true };
        }
        if (c.op === "guard") {
          const r = ed.editRefusal(pts, xy(c.after), Boolean(c.closed), (c.others ?? []).map(xy));
          return { refusal: r === null ? "none" : r.why === "self" ? "self" : `other:${r.with}` };
        }
        return { error: `unknown op ${c.op}` };
      }
      if (c.kind === "pdfsnap") {
        const idx = ps.buildPdfSnapIndex(c.segments.map(([ax, ay, bx, by]) => ({ ax, ay, bx, by })), 1000, 1000);
        return { count: idx.count, isEmpty: idx.isEmpty, aroundSegments: c.around.map(([[x, y], r]) => idx.around({ x, y }, r).segments.length).join(" ") };
      }
      if (c.kind === "trace") {
        // Auto Trace (D-143): pieces, labels and label boxes in, lines out.
        const r = tr.traceSheet({
          widthPt: 1000,
          heightPt: 1000,
          pieces: c.pieces.map((p) => ({ pts: xy(p.pts), closed: Boolean(p.closed), width: p.width ?? 1, color: p.color ?? "#000000", dash: p.dash ?? [] })),
          labels: (c.labels ?? []).map((l) => ({ str: l.str, c: { x: l.at[0], y: l.at[1] }, angle: l.angle ?? 0, w: l.w ?? 18, h: l.h ?? 10 })),
          masks: (c.masks ?? []).map(([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 })),
        });
        const count = (f) => r.lines.filter(f).length;
        const out = {
          lines: r.lines.length,
          EG: count((l) => l.surface === "EG"),
          FG: count((l) => l.surface === "FG"),
          closed: count((l) => l.closed),
          bridges: r.lines.reduce((s, l) => s + l.bridges, 0),
          elevations: r.lines.map((l) => l.elevation).filter((e) => e !== null).sort((a, b) => a - b).join(" "),
          flags: r.lines.flatMap((l) => l.flags).sort().join(" "),
          repeated: r.stats.repeatedPoints,
          backtracks: r.stats.backtracks,
          selfCrossings: r.stats.selfCrossings,
          spots: r.spots.map((s) => s.elevation).join(" "),
        };
        if (c.suggest) {
          out.suggested = [...inf.suggestElevations(r.lines, c.suggest, 1).values()].map((v) => `${v.value}:${v.source}`).sort().join(" ");
        }
        if (c.pick) {
          const idx = new tr.TraceHitIndex(r.lines);
          out.pick = c.pick.map(([x, y, rad]) => (idx.pick({ x, y }, rad) ? "hit" : "miss")).join(" ");
        }
        return out;
      }
      if (c.kind === "lines") {
        const lines = ln.earthworkLines(c.input);
        const out = { roles: lines.map((l) => `${l.role}:${l.regionId}`).join(" ") };
        for (const l of lines) Object.assign(out, { [`${l.role}:${l.regionId}`]: l.quantity, [`${l.role}:${l.regionId}:unit`]: l.unit, [`${l.role}:${l.regionId}:name`]: l.name });
        // The report's balance steps (F26, D-445 4): each row, and the net after shrink.
        const input = ln.balanceInputOf(c.input);
        if (c.steps && input) {
          const r = bal.balanceSteps(input);
          out.steps = r.steps.map((s) => s.key).join(" ");
          for (const s of r.steps) out[`step:${s.key}`] = s.value;
          out.net = r.net;
        }
        return out;
      }
      if (c.kind === "volume") {
        const runs = runsOf(c.runs);
        const labels = labelsOf(c.runs);
        const pts = (poly) => poly.map(([x, y]) => ({ x, y }));
        const [egT, fgT] = [tin.runTinForSurface(runs, "EG", labels), tin.runTinForSurface(runs, "FG", labels)];
        const r = vol.computeVolumes(
          {
            eg: egT,
            fg: fgT,
            boundary: c.boundary ? pts(c.boundary) : null,
            calibration: { feetPerNorm: c.side, widthPt: 1, heightPt: 1 },
            units: c.units ?? "CY",
            stripFt: c.stripFt,
            roleAreas: c.roleAreas?.map((a) => ({ ...a, polygon: pts(a.polygon) })),
            stripAreas: c.stripAreas?.map((a) => ({ ...a, polygons: a.polygons.map(pts), excludedPolygons: a.excludedPolygons?.map(pts) })),
          },
          runs,
          labels,
        );
        if (r.ok === false) return { ok: false, code: r.error.code, message: r.error.message };
        if (r.ok !== true) return { ok: r.ok };
        const out = { ok: true, units: r.units, cutCY: r.cutCY, fillCY: r.fillCY, netCY: r.netCY, stripCY: r.strip ? r.strip.volumeCY : null, regions: r.regions.length };
        // F29 step 1c (D-534): the cut split by layer, from bores, exactly.
        if (c.geo) {
          const g = c.geo;
          // B5 (D-545): a layer by elevation (a third field) read against the existing ground the
          // volumes used, its TIN as pieces in feet; a bore's typed ground where it has one.
          const byElevation = g.layers.some(([, , how]) => how === "elevation");
          const m = gm.buildLayerModel({
            layers: g.layers.map(([id, name, how]) => ({ id, name, interpolate: how ?? "depth" })),
            bores: g.bores.map((b) => ({ ...b, ground: b.ground ?? null, termination: "planned", refusalReason: null })),
            box: g.box,
            eg: byElevation && egT.ok === true ? gf.tinPieces(egT.mesh, c.side, c.side) : null,
          });
          out["geo:clamps"] = m.clamps.map((k) => k.text).join(" | ");
          // D-559: the notes, word for word.
          out["geo:notes"] = m.notes.join(" | ");
          const split = gc.cutByLayer(r.prisms, { feetPerNorm: c.side, widthPt: 1, heightPt: 1 }, g.layers.map(([id]) => id), m.bottoms, new Map([[null, 0]]));
          let sum = 0;
          for (const [id, name] of g.layers) {
            const cf = split.reduce((t, reg) => t + (reg.layers.find((l) => l.layerId === id)?.bankCF ?? 0), 0);
            out[`geo:${name}:CY`] = cf / 27;
            sum += cf / 27;
          }
          out["geo:sum-equals-cut"] = Math.abs(sum - r.cutCY) < 1e-6;
        }
        // Q13 (D-528): a feature's undercut against the graded prisms, and flat as before.
        if (c.undercut) {
          const u = c.undercut;
          const feat = { itemId: u.id, label: u.id, depthFt: u.depthFt ?? 0, polygons: [pts(u.polygon)], undercutDepthFt: u.undercutFt, undercutOffsetFt: 0, undercutMaterial: "Select Fill", undercutDisposition: "haul_off", prepDepthFt: null, prepLifts: null };
          const scale = { feetPerNorm: c.side, widthPt: 1, heightPt: 1 };
          const [onSurfaces] = sf.computeFeatureExtras([feat], c.boundary ? pts(c.boundary) : null, scale, r.prisms);
          const [flat] = sf.computeFeatureExtras([feat], c.boundary ? pts(c.boundary) : null, scale);
          out["undercut:CY"] = onSurfaces.undercut.volumeCF / 27;
          out["undercutFlat:CY"] = flat.undercut.volumeCF / 27;
        }
        for (const g of r.regions) {
          out[`region:${g.id ?? "remainder"}:cutCY`] = g.cutCY;
          out[`region:${g.id ?? "remainder"}:fillCY`] = g.fillCY;
        }
        (r.stripAreas ?? []).forEach((a, i) => {
          out[`strip:${i}:areaSF`] = a.areaSF;
          out[`strip:${i}:volumeCY`] = a.volumeCY;
        });
        const sum = (k) => r.regions.reduce((t, g) => t + g[k], 0);
        out.regionsSumToTotals = Math.abs(sum("cutCY") - r.cutCY) < 1e-9 && Math.abs(sum("fillCY") - r.fillCY) < 1e-9;
        // The readout under the cursor (F26 3D-4, D-426): EG, FG and the depth used at each point.
        (c.readout ?? []).forEach(([x, y], k) => {
          const rd = sc.readoutAt({ eg: egT, fg: fgT, boundary: c.boundary ? pts(c.boundary) : null, volumes: r }, { x, y });
          Object.assign(out, { [`readout:${k}:eg`]: rd.eg, [`readout:${k}:fg`]: rd.fg, [`readout:${k}:depth`]: rd.depth });
        });
        // The grading report's statistics (F26 R-1, D-430).
        for (const g of r.regions) {
          if (!g.stats) continue;
          const k = `stats:${g.id ?? "remainder"}`;
          for (const side of ["cut", "fill"]) {
            const s = g.stats[side];
            Object.assign(out, { [`${k}:${side}:areaSF`]: s.areaSF, [`${k}:${side}:avgFt`]: s.avgFt, [`${k}:${side}:maxFt`]: s.maxFt, [`${k}:${side}:egMin`]: s.eg?.min ?? null, [`${k}:${side}:egMax`]: s.eg?.max ?? null, [`${k}:${side}:fgMin`]: s.fg?.min ?? null, [`${k}:${side}:fgMax`]: s.fg?.max ?? null });
          }
          out[`${k}:area3d:fg`] = g.stats.area3dSF.fg;
          out[`${k}:area3d:eg`] = g.stats.area3dSF.eg;
        }
        if (r.stats) {
          out["stats:areaSF"] = r.stats.areaSF;
          for (const s of ["eg", "fg"]) if (r.stats[s]) Object.assign(out, { [`stats:${s}:min`]: r.stats[s].min, [`stats:${s}:max`]: r.stats[s].max, [`stats:${s}:avg`]: r.stats[s].avg, [`stats:${s}:area3d`]: r.stats[s].area3dSF });
        }
        const cov = r.warnings.find((w) => w.code === "partial_coverage");
        if (cov) Object.assign(out, { coverage: cov.ratio, coverageSurfaces: cov.surfaces, coverageMessage: cov.message });
        const ov = r.warnings.find((w) => w.code === "role_overlap");
        if (ov) out.overlap = ov.overlappingLabels;
        if (c.vertices) out.vertices = c.vertices.map(([x, y]) => r.prisms.some((pr) => [pr.a, pr.b, pr.c].some((q) => Math.abs(q.x - x) < 1e-4 && Math.abs(q.y - y) < 1e-4)));
        if (c.fillWithin) out.fillWithin = r.fillCY > c.fillWithin[0] && r.fillCY < c.fillWithin[1];
        // Depth bands (F26, D-445 5): each band's cut and fill area and volume, and their sums.
        if (c.bands) {
          const bands = bd.depthBands(r.prisms, c.bands);
          bands.forEach((b, k) => Object.assign(out, { [`band:${k}:cut:areaSF`]: b.cut.areaSF, [`band:${k}:cut:volumeCF`]: b.cut.volumeCF, [`band:${k}:fill:areaSF`]: b.fill.areaSF, [`band:${k}:fill:volumeCF`]: b.fill.volumeCF }));
          out.bandsSumToTotals = Math.abs(bands.reduce((t, b) => t + b.cut.volumeCF, 0) / 27 - r.cutCY) < 1e-9 && Math.abs(bands.reduce((t, b) => t + b.fill.volumeCF, 0) / 27 - r.fillCY) < 1e-9;
        }
        return out;
      }
      if (c.kind === "synthsite") return synthSite(c.site);
      if (c.kind === "elevcheck") {
        // Parallel contours 30 ft apart on a 1" = 30' page, one elevation each.
        const runs = c.contours.map((z, i) => ({ item: "c", geometry: `c${i}`, version: 1, kind: "contour", surface: "EG", elevation: z, points: [{ x: (100 + i * 72) / 2448, y: 0.1 }, { x: (100 + i * 72) / 2448, y: 0.9 }] }));
        const r = ec.checkElevations(runs, { page: { widthPt: 2448, heightPt: 1584 }, feetPerPt: 30 / 72 });
        return { flags: r.flags.map((f) => `${f.geometry}:${f.reason}`).join("|"), interval: r.interval.EG };
      }
      return { error: `unknown kind ${c.kind}` };
    });

    /** The synthetic site's Calculate, as useVolumes runs it (D-292 to D-296). */
    function synthSite(o) {
      const W = 2448;
      const H = 1584;
      const fT = 30 / 72;
      const fS = 60 / 72;
      const onC = ([gx, gy], shift = [0, 0]) => [(gx + 125 + shift[0]) / (W * fT), (gy + 125 + shift[1]) / (H * fT)];
      const onV = ([gx, gy]) => [(-gy + 400) / (W * fS), (gx + 100) / (H * fS)];
      const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const geo = (sheet, uuid, pts, meta) => ({ uuid, sheet_uuid: sheet, vertices_json: pts, shape_meta: meta, geometry_version: 1, role: "add" });
      const egZ = ([gx]) => 100 + (o.egSlope ?? 0) * gx;
      const east = o.fgEastX ?? 420;
      const fgSpots = [[-20, -20], [east, -20], [east, 220], [-20, 220], [Math.min(200, east - 20), 100]].map((g, i) => [`fg${i}`, g, i === 4 && o.fgTypo !== undefined ? o.fgTypo : o.fgZ]);
      if (o.fgTypo !== undefined) for (const [k, g] of [[160, 100], [240, 100], [200, 60], [200, 140]].entries()) fgSpots.push([`fgn${k}`, g, o.fgZ]);
      const eg = o.egContours
        ? Array.from({ length: 11 }, (_, k) => {
            const x = -50 + 50 * k;
            const typo = [o.egTypo, o.egTypo2].find((t) => t && t.at === x);
            return geo("V", `egc${k}`, [onV([x, -60]), onV([x, 100]), onV([x, 260])], { kind: "polyline", surface: "EG", elevation: typo ? typo.z : 100 + 0.02 * x });
          })
        : [[-60, -60], [460, -60], [460, 260], [-60, 260], [200, 100]].map((g, i) => geo("V", `eg${i}`, [onV(g)], { kind: "spot", surface: "EG", elevation: egZ(g) }));
      const items = [
        { uuid: "eg", type: o.egContours ? "contour" : "spot_elevation", name: "Existing Ground", geometries: eg },
        { uuid: "fg", type: "spot_elevation", name: "FG Spots", geometries: fgSpots.map(([id, g, z]) => geo("C", id, [onC(g)], { kind: "spot", surface: "FG", elevation: z })) },
        { uuid: "b", type: "boundary", name: "Work Boundary", geometries: [geo("C", "b0", rect(0, 0, 400, 200).map((g) => onC(g)), { kind: "boundary" })] },
        { uuid: "pave", type: "sf", name: "Pavement", created_at: "2026-01-01T00:00:01", is_site_feature: true, role_depth_ft: o.pave ?? 1, geometries: [geo("C", "pave0", rect(20, 20, 120, 80).map((g) => onC(g)), null)] },
        { uuid: "pad", type: "sf", name: "Building Pad", created_at: "2026-01-01T00:00:02", is_site_feature: true, role_depth_ft: o.pad ?? 0.5, geometries: [geo("C", "pad0", rect(200, 50, 350, 150).map((g) => onC(g)), null)] },
        { uuid: "walk", type: "sf", name: "Sidewalk", created_at: "2026-01-01T00:00:03", is_site_feature: true, role_depth_ft: o.walk ?? 4 / 12, geometries: [geo("C", "walk0", rect(340, 50, 380, 150).map((g) => onC(g)), null)] },
      ];
      const strips = [{ uuid: "s1", sheet_uuid: "C", name: "Strip", depth_ft: o.strip ?? 0.5, source: o.stripWhole ? "boundary" : "drawn", feature_uuids: [], vertices_json: o.stripWhole ? null : rect(0, 0, 300, 200).map((g) => onC(g)), created_at: "2026-01-01T00:00:04" }];
      const a = ((o.linkTurnDeg ?? 0) * Math.PI) / 180;
      const turn = ([x, y]) => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];
      const pairs = [[0, 0], [400, 0], [400, 200]].map((g) => {
        const [sx, sy] = onV(g);
        const [tx, ty] = onC(turn(g), o.linkShift ?? [0, 0]);
        return { source: { x: sx, y: sy }, target: { x: tx, y: ty } };
      });
      const scales = { C: { feetPerPt: fT, widthPt: W, heightPt: H }, V: { feetPerPt: fS, widthPt: W, heightPt: H } };
      const link = rg.linkedEg("C", [{ source: "V", target: "C", pairs, scaleFitted: false, offsetFt: 0, egSource: true }], (u) => sx.sheetRuns(items, u), (u) => scales[u] ?? null, (i) => i, (u) => u);
      const runs = [...sx.sheetRuns(items, "C"), ...link.runs];
      const labels = new Map(items.map((i) => [i.uuid, i.name]));
      for (const [k, v] of link.labels) labels.set(k, v);
      const features = sf.sheetFeatures(items, "C");
      const cal = { feetPerNorm: fT, widthPt: W, heightPt: H };
      const boundary = sx.findBoundaryRun(runs);
      const r = vol.computeVolumes(
        { eg: tin.runTinForSurface(runs, "EG", labels, cal), fg: tin.runTinForSurface(runs, "FG", labels, cal), boundary: boundary.points, calibration: cal, units: "CY", withoutStrip: true, roleAreas: sf.roleAreasOf(features), stripAreas: st.stripInputs(strips, "C", boundary.points, features) },
        runs,
        labels,
      );
      // The elevation check, each sheet on its own (the survey's runs on the survey).
      const checks = ["V", "C"].map((sheet) => [sheet, ec.checkElevations(sx.sheetRuns(items, sheet), { page: { widthPt: W, heightPt: H }, feetPerPt: scales[sheet].feetPerPt, spotThresholdFt: o.threshold })]);
      const flags = checks.flatMap(([sheet, k]) => k.flags.map((f) => `${sheet}:${f.surface}:${f.kind}:${f.reason}:${f.neighbors.join(",")}:${f.elevation}`)).join("|");
      if (r.ok !== true) return { ok: r.ok, message: r.error?.message, flags };
      const out = { ok: true, cutCY: r.cutCY, fillCY: r.fillCY, stripCY: (r.stripAreas ?? []).reduce((t, s) => t + s.volumeCY, 0), coverage: r.coveredSF / r.boundarySF, flags, intervalEG: checks[0][1].interval.EG };
      const u = r.uncovered.areaSF;
      Object.assign(out, { uncoveredSF: u.eg + u.fg + u.both + u.edge, "uncovered:eg": u.eg, "uncovered:fg": u.fg, "uncovered:both": u.both });
      for (const g of r.regions) for (const k of ["cutCY", "fillCY", "areaSF", "avgEgFt", "avgFgFt", "depthFt", "stripFt"]) out[`region:${g.id ?? "remainder"}:${k}`] = g[k];
      Object.assign(out, { cut0CY: r.withoutStrip.cutCY, fill0CY: r.withoutStrip.fillCY });
      for (const g of r.withoutStrip.regions) out[`region0:${g.id ?? "remainder"}:cutCY`] = g.cutCY;
      return out;
    }
  }, EARTHWORK_CASES);
  // F29 Block 2's rows (plan §6): the utilities engine and the pipe catalog.
  util = await page.evaluate(async (cases) => {
    const cat = await import("/src/lib/takeoff/earthwork/utilities/catalog.ts");
    const tr = await import("/src/lib/takeoff/earthwork/utilities/trench.ts");
    const q = await import("/src/lib/takeoff/earthwork/utilities/quantities.ts");
    const bp = await import("/src/lib/takeoff/earthwork/utilities/breakpoints.ts");
    const ln = await import("/src/lib/takeoff/earthwork/utilities/lines.ts");
    const sx = await import("/src/lib/takeoff/earthwork/utilities/structures.ts");
    const sc = await import("/src/lib/takeoff/earthwork/utilities/scene.ts");
    const tp = await import("/src/lib/takeoff/earthwork/utilities/trenchPlan.ts");
    const sec = await import("/src/lib/takeoff/earthwork/utilities/section.ts");
    const ox = await import("/src/lib/takeoff/earthwork/overex.ts");
    const bal = await import("/src/lib/takeoff/earthwork/balance.ts");
    const sf = await import("/src/lib/takeoff/earthwork/siteFeatures.ts");
    const stab = await import("/src/lib/takeoff/earthwork/stabilization.ts");
    const lines = await import("/src/lib/takeoff/earthwork/lines.ts");
    const cr = await import("/src/lib/takeoff/earthwork/utilities/continueRun.ts");
    const ov = await import("/src/lib/takeoff/earthwork/utilities/overlaps.ts");
    const rd = await import("/src/features/takeoff/earthwork/utilities/runDefaults.ts");
    const r2 = (v) => Math.round(v * 100) / 100;
    // D-615 rows: 8 in SDR-35 in Type B clay, in a 6 ft box (as lib/utility-cases.mjs).
    const SDR35 = "pvc_d3034_sdr35:8";
    const CLAY = { name: "Clay", group: "clay", uscs: "CH", osha: "B", unsuitable: false, reuseBackfill: true, alwaysExported: false, shrink: 1.1 };
    const BOX = { id: "b6", name: "Box 6x8", insideFt: 5, outsideFt: 6, heightFt: 8 };
    return cases.map((c) => {
      // D-615: structures counted in a row, numbered on, each with the box's settings; then Count
      // more like this from one of them.
      if (c.kind === "count") {
        const draft = rd.newStructureFrom({ ...rd.defaultStructure(c.type), ...c.settings, rim_ft: 712, floor_ft: 700 });
        const names = [...c.existing];
        const placed = [];
        for (let i = 0; i < c.clicks; i += 1) {
          const name = rd.nextNumbered(rd.STRUCTURE_PREFIX[draft.structure_type], names);
          names.push(name);
          placed.push({ name, ...draft });
        }
        const like = placed[c.likeIndex];
        const more = rd.nextNumbered(rd.STRUCTURE_PREFIX[like.structure_type], names);
        return {
          names: placed.map((p) => p.name),
          more,
          sameSettings: placed.every((p) => JSON.stringify({ ...p, name: 0 }) === JSON.stringify({ ...placed[0], name: 0 })),
          settings: [draft.structure_type, draft.inside_dia_in, draft.wall_in, draft.base_slab_in, draft.protection],
          rimFloor: [draft.rim_ft, draft.floor_ft],
        };
      }
      // D-615: a straight 100 ft run continued 50 ft from one end, in its depth mode, then worked
      // out by the same engine as any run: length, inverts and volume.
      // D-616: trenches that cross or join, each a straight run on flat ground (G 100) at its own
      // trench depth; the shared ground is dug once, by the deeper.
      if (c.kind === "overlap") {
        const p = cat.resolvePipe(SDR35);
        const drop = (p.od - p.id) / 2 / 12;
        const G = 100;
        const worked = c.runs.map((run) => {
          const L = Math.hypot(run.path[1][0] - run.path[0][0], run.path[1][1] - run.path[0][1]);
          const knot = (sAt) => ({ s: sAt, G, invert: G - run.depth + drop + 0.5, bottoms: [-1e6], water: null, caving: false, caveInFt: null });
          const P = tr.pipeWidthFt(p.od, 1, 0, 12, 24);
          const qq = q.runQuantities({
            knots: [knot(0), knot(L)],
            layers: [{ layerId: null, ...CLAY }],
            noBores: false,
            pipe: { odIn: p.od, idIn: p.id, pipes: 1, gapIn: 0 },
            section: { sideClearanceIn: 12, minWidthIn: 24, beddingIn: 6, zoneAboveCrownIn: 12 },
            bucket: "auto",
            box: run.protection === "box" ? tr.boxFor(P, [BOX], { boxRef: "b6", boxOutsideFt: null }) : null,
            specMaxIn: null,
            protection: run.protection,
            limitedWidth: false,
            rule: null,
            depthRangesFt: [0, 6, 8, 10, 12, 14, 16],
            materials: { bedding: "imported", zone: "imported", backfill: "native" },
            materialNames: { bedding: "#57 stone", zone: "Sand", backfill: "Native" },
            segments: [],
            restoration: null,
          });
          return { run, q: qq };
        });
        const found = ov.trenchOverlaps(
          worked.flatMap(({ run, q: qq }) => ov.placePieces(run.name, qq.shape, run.path)),
          new Map(worked.map(({ run }) => [run.name, { odFt: p.od / 12, count: 1 }])),
          c.pits ?? [],
          c.runs.map((r) => r.name),
        );
        const after = worked.map(({ run, q: qq }) => r2(ov.afterOverlaps(qq, [{ layerId: null, ...CLAY }], found.filter((o) => o.loser === run.name)).excavationCF / 27));
        return {
          overlaps: found.map((o) => [o.loser, o.keeper, r2(o.excavationCF / 27), r2(o.beddingCF), r2(o.zoneCF), r2(o.backfillCF)]),
          afterCY: after,
          widths: worked.map(({ q: qq }) => r2(qq.widthFt)),
        };
      }
      if (c.kind === "newrun") {
        // D-628: a run drawn from existing grade, then a new run from the box: its "Trench from"
        // is the project's, proposed subgrade; type, pipe and size come from the last run.
        const last = { ...rd.defaultRun(c.type), catalog_key: c.catalogKey, nominal_in: c.nominalIn, cover_ft: c.coverFt, start_surface: "existing" };
        const next = rd.newRunFrom(last);
        const ground = { existing: c.groundFt.existing, proposed: c.groundFt.proposed };
        return {
          lastFrom: last.start_surface,
          newFrom: next.start_surface,
          newGroundFt: ground[next.start_surface],
          newTrenchBottomFt: r2(ground[next.start_surface] - next.cover_ft - cat.resolvePipe(next.catalog_key).od / 12 - c.beddingIn / 12),
          carried: [next.utility_type, next.catalog_key, next.nominal_in].join(" "),
        };
      }
      if (c.kind === "continue") {
        const p = cat.resolvePipe(SDR35);
        const drop = (p.od - p.id) / 2 / 12;
        const G = 100;
        const inv = (depth) => G - depth + drop + 0.5;
        const halfSum = (p.od + p.id) / 24;
        const fields = {
          vertical: c.mode,
          start_invert_ft: c.mode === "cover" ? null : inv(c.depth[0]),
          end_invert_ft: c.mode === "inverts" ? inv(c.depth[1]) : null,
          slope_pct: c.mode === "slope" ? ((inv(c.depth[0]) - inv(c.depth[1])) / 100) * 100 : null,
          start_structure_uuid: null,
          end_structure_uuid: null,
          notes: [],
        };
        const frame = { fx: 1000, fy: 1000 };
        const vertices = [[0.1, 0.5], [0.2, 0.5]];
        const drawn = c.end === "end" ? [{ x: 0.2, y: 0.5 }, { x: 0.25, y: 0.5 }] : [{ x: 0.1, y: 0.5 }, { x: 0.05, y: 0.5 }];
        const done = cr.continueRun({ fields, vertices, arcs: [], drawn, drawnArcs: [], end: c.end, frame, lengthFt: 100, endOn: c.endOn ?? null });
        let L = 0;
        for (let i = 1; i < done.vertices.length; i += 1) L += Math.hypot((done.vertices[i][0] - done.vertices[i - 1][0]) * frame.fx, (done.vertices[i][1] - done.vertices[i - 1][1]) * frame.fy);
        const f = done.fields;
        const ends = c.mode === "inverts" ? [f.start_invert_ft, f.end_invert_ft] : c.mode === "slope" ? [f.start_invert_ft, f.start_invert_ft - (f.slope_pct / 100) * L] : [G - c.cover - halfSum, G - c.cover - halfSum];
        const knot = (i) => ({ s: i === 0 ? 0 : L, G, invert: ends[i], bottoms: [-1e6], water: null, caving: false, caveInFt: null });
        const P = tr.pipeWidthFt(p.od, 1, 0, 12, 24);
        const r = q.runQuantities({
          knots: [knot(0), knot(1)],
          layers: [{ layerId: null, ...CLAY }],
          noBores: false,
          pipe: { odIn: p.od, idIn: p.id, pipes: 1, gapIn: 0 },
          section: { sideClearanceIn: 12, minWidthIn: 24, beddingIn: 6, zoneAboveCrownIn: 12 },
          bucket: "auto",
          box: tr.boxFor(P, [BOX], { boxRef: "b6", boxOutsideFt: null }),
          specMaxIn: null,
          protection: "box",
          limitedWidth: false,
          rule: null,
          depthRangesFt: [0, 6, 8, 10, 12, 14, 16],
          materials: { bedding: "imported", zone: "imported", backfill: "native" },
          materialNames: { bedding: "#57 stone", zone: "Sand", backfill: "Native" },
          segments: [],
          restoration: null,
        });
        return {
          lengthFt: r2(L),
          addedFt: r2(done.addedFt),
          depthsFt: ends.map((e) => r2(G - (e - drop - 0.5))),
          excavationCY: r2(r.excavationCF / 27),
          notes: done.fields.notes.map((n) => n.kind),
          corners: done.vertices.map(([x]) => r2(x * 1000)),
        };
      }
      if (c.kind === "catalog") {
        const p = cat.resolvePipe(c.pick, c.typed ?? {});
        if (!p) return { resolved: false };
        const pick = c.pick ? cat.catalogPick(c.pick) : null;
        const out = { resolved: true, od: p.od, id: p.id, wall: p.wall, flags: p.flags };
        if (pick) {
          Object.assign(out, { odMark: pick.size.odMark, wallMark: pick.size.wallMark, pickable: cat.pickable(pick.size), unverified: cat.unverified(pick.size) });
          if (pick.size.bellOd !== undefined) out.bellOd = pick.size.bellOd;
          out.pipeWidthIn = tr.pipeWidthFt(p.od, 1, 0, 12, 24) * 12;
          if (pick.entry.key === "rcp_c76_wall_c") {
            const printed = pick.entry.sizes.filter((z) => z.nominalIn >= 24);
            out.rulePrintedWallC = printed.every((z) => Math.abs(cat.acpaWall(z.nominalIn, "C") - z.wall) < 1e-9) && printed.length === 15 ? "all agree" : "disagree";
          }
        }
        if (c.alternate) {
          const a = cat.catalogPick(c.alternate);
          Object.assign(out, { alternateOd: a.size.od, alternateWall: a.size.wall, alternateOf: a.entry.alternateOf });
        }
        return out;
      }
      if (c.kind === "pit") {
        const Eb = c.floor - c.slab - c.stone;
        const p = sx.pitQuantities({
          shape: c.shape, G: c.G, rim: c.rim, floor: c.floor, baseSlabFt: c.slab, baseStoneFt: c.stone, overdigFt: c.overdig, lowestInvert: c.lowestInvert,
          soil: { bands: c.layers.map((l) => ({ layerId: null, name: l.name, group: l.group, uscs: l.uscs, osha: l.osha, z0: -1e6, z1: c.G - Eb })), waterZ: c.waterElev != null ? c.waterElev - Eb : null, caving: false, caveInFt: null, noBores: false },
          rule: null, protection: "auto", depthRangesFt: [0, 6, 8, 10, 12, 14, 16],
        });
        return { excavationCY: r2(p.excavationCF / 27), stoneCY: r2(p.stoneCF / 27), structureCF: r2(p.structureCF), backfillCY: r2(p.backfillCF / 27), vf: p.vf, vfRange: p.vfRange, method: p.method, dewatering: p.dewatering };
      }
      if (c.kind === "crossing") return { crossings: bp.crossings(c.path, c.a, c.b).map((x) => [r2(x.along), r2(x.atRun)]) };
      // Block 4 (D-585): over-excavation on prisms given in feet (a scale of 1 ft per page unit).
      if (c.kind === "overex") {
        const scale = { feetPerNorm: 1, widthPt: 1, heightPt: 1 };
        const prisms = c.prisms.map((p) => ({ a: { x: p.pts[0][0], y: p.pts[0][1] }, b: { x: p.pts[1][0], y: p.pts[1][1] }, c: { x: p.pts[2][0], y: p.pts[2][1] }, egA: p.eg[0], egB: p.eg[1], egC: p.eg[2], fgA: p.fg[0], fgB: p.fg[1], fgC: p.fg[2], dzA: p.dz[0], dzB: p.dz[1], dzC: p.dz[2], regionId: p.region ?? null, areaSF: 0, volumeCF: 0, parentTriangleIndex: 0, origin: "tin" }));
        const s = ox.overexSurfaces(prisms, scale, new Map(Object.entries(c.depths ?? {})), c.bottoms ?? [], c.layers ?? 1);
        const dMax = ox.overexDMax(s, c.outline, c.bottom);
        const extendFt = (c.extendFt ?? 0) + (c.slopeH ?? 0) * (dMax ?? 0);
        // The extent: the outline offset as the feature's is (mitre, true feet), or as given.
        const extent = c.extent ?? sf.offsetNormRingFt(c.outline[0].map(([x, y]) => ({ x, y })), extendFt, scale);
        const v = ox.overexVolume(s, extent, c.bottom, c.stack ?? [null]);
        return { totalCY: r2(v.totalCF / 27), byLayerCY: v.byLayerCF.map((x) => r2(x / 27)), stackCY: v.stackCF.map((x) => r2(x / 27)), dMax: dMax == null ? null : r2(dMax), extendFt: r2(extendFt), uncoveredSF: r2(v.uncoveredSF) };
      }
      // Block 5A (D-588): the site balance with layers and utilities, against today's.
      if (c.kind === "balance") {
        const before = bal.soilBalance(c.before);
        const after = bal.siteBalance(c.after);
        return { beforeBank: before.exportBank == null ? null : r2(before.exportBank), beforeLoose: before.exportLoose == null ? null : r2(before.exportLoose), afterBank: after.exportBank == null ? null : r2(after.exportBank), afterLoose: after.exportLoose == null ? null : r2(after.exportLoose), importBank: after.importBank == null ? null : r2(after.importBank), always: after.always.map((a) => [a.name, r2(a.bank), r2(a.loose)]) };
      }
      // D-595, D-596: native backfill against the dig, by layer.
      if (c.kind === "native") {
        const layers = c.layers.map((l) => ({ layerId: l.name, name: l.name, group: "clay", uscs: null, osha: "C", unsuitable: false, reuseBackfill: l.reuseBackfill, alwaysExported: Boolean(l.alwaysExported), shrink: l.shrink, swell: l.swell }));
        const n = q.nativeSplit(layers, c.byLayerCY.map((x) => x * 27), c.nativeCCY * 27);
        return { needBCY: r2(n.needBankCF / 27), reusedBCY: r2(n.reusedBankCF / 27), shortCCY: r2(n.shortCF / 27), spoils: n.spoilsByLayer.map((l) => [l.name, r2(l.cf / 27), l.shrink, l.swell]), rockBCY: r2(n.rockCF / 27) };
      }
      if (c.kind === "oxspoil") {
        const o = lines.overexSpoil({ volumeCF: c.volumeCY * 27, overex: { byLayer: c.byLayer, stack: c.stack } }, c.shrink);
        return { reusedBCY: r2(o.nativeCF / 27), spoilBCY: r2(o.spoilCF / 27), badBCY: r2(o.badCF / 27), shortBCY: r2(o.shortBankCF / 27) };
      }
      // D-594: the one balance the report's Summary, Balance and Truckloads read, against the lines.
      if (c.kind === "final") {
        const i = { units: "CY", regions: c.regions, assumptions: c.assumptions, site: { layers: c.layers, spoilsByLayer: c.spoilsByLayer, nativeShort: c.nativeShort } };
        const f = lines.finalBalance(i);
        const all = lines.earthworkLines(i);
        const imp = all.find((l) => l.role === "soil_import");
        const rock = all.filter((l) => l.role === "soil_export" && /^Rock Export/.test(l.name)).reduce((t, l) => t + l.quantity, 0);
        const rockLoose = f.always.filter((a) => a.kind === "rock").reduce((t, a) => t + a.loose, 0);
        const finals = f.steps.filter((x) => x.final).map((x) => r2(x.value));
        const loads = [f.importLoose ?? 0, rockLoose].map((v) => Math.ceil(v / c.truck - 1e-9));
        const agree = Math.abs((imp?.quantity ?? 0) - (f.importLoose ?? 0)) < 1e-9 && Math.abs(rock - rockLoose) < 1e-9 && Math.abs((f.importBank ?? 0) + f.net) < 1e-9;
        return { net: r2(f.net), importBank: f.importBank == null ? null : r2(f.importBank), importLoose: f.importLoose == null ? null : r2(f.importLoose), exportBank: f.exportBank == null ? null : r2(f.exportBank), rockLoose: r2(rockLoose), lastSteps: finals, lineImport: imp ? r2(imp.quantity) : null, lineRock: r2(rock), loads, agree };
      }
      if (c.kind === "treatment") return { tons: c.agents.map((a) => r2(stab.stabilizerTons(c.areaSF, c.depthFt, c.dryPcf, a))), sy: r2(c.areaSF / 9), geoSY: (c.overlaps ?? []).map((o) => r2(ox.geosyntheticSY(c.areaSF, o))) };
      // Block 3D: a pipe and a manhole placed in the 3D view's frame.
      if (c.kind === "scene") {
        const s = sc.utilityScene(c.origin, { pipes: c.pipes, structures: c.structures });
        return { pipePoints: s.pipes.map((p) => p.points.map((pt) => pt.map(r2))), structureSpans: s.structures.map((t) => [r2(t.x), r2(t.z), r2(t.y0), r2(t.y1), t.r == null ? null : r2(t.r)]) };
      }
      // A run read through the profile builder: planes as single pieces, features, typed grades.
      if (c.kind === "profile") {
        const p = cat.resolvePipe(c.pipe);
        const plane = (f) => (f ? [{ poly: [[f.box[0], f.box[1]], [f.box[2], f.box[1]], [f.box[2], f.box[3]], [f.box[0], f.box[3]]], a: f.plane[0], b: f.plane[1], c: f.plane[2] }] : null);
        const below = (p.od - p.id) / 24 + 0.5;
        const inv = c.inverts ?? [c.trenchBottom + below, c.trenchBottom + below];
        const prof = bp.runProfile({
          path: c.path,
          eg: plane(c.eg),
          fg: plane(c.fg),
          features: c.features ?? [],
          startSurface: c.startSurface ?? "proposed",
          ends: c.ends ?? null,
          vertical: { mode: "inverts", start: inv[0], end: inv[1] },
          odIn: p.od,
          idIn: p.id,
          bottoms: [],
          water: null,
          bores: [],
        });
        const r = q.runQuantities({
          knots: prof.knots,
          layers: c.layers.map((l) => ({ layerId: null, ...l })),
          noBores: Boolean(c.noBores),
          pipe: { odIn: p.od, idIn: p.id, pipes: 1, gapIn: 0 },
          section: { sideClearanceIn: 12, minWidthIn: 24, beddingIn: 6, zoneAboveCrownIn: 12 },
          bucket: "auto",
          box: null,
          specMaxIn: null,
          protection: "auto",
          limitedWidth: false,
          rule: null,
          depthRangesFt: [0, 6, 8, 10, 12, 14, 16],
          materials: { bedding: "imported", zone: "imported", backfill: "native" },
          restoration: null,
        });
        return { excavationCY: r2(r.excavationCF / 27), notes: prof.notes, knots: prof.knots.length };
      }
      // A run on a profile: ends at s = 0 and s = length; layers and water by depth below the start surface.
      const p = cat.resolvePipe(c.pipe);
      const drop = (p.od - p.id) / 2 / 12;
      const bedding = 6 / 12;
      const at = (i) => {
        const G = c.ground[i];
        const invert = c.inverts ? c.inverts[i] : c.invertDepth ? G - c.invertDepth[i] : G - c.depth[i] + drop + bedding;
        const bottoms = c.layers.map((l) => (l.depth === null ? -1e6 : G - l.depth));
        return { s: i === 0 ? 0 : c.length, G, invert, bottoms, water: c.water ? G - c.water[i] : null, caving: false, caveInFt: c.caveInFt ?? null };
      };
      const boxes = c.boxes ?? [];
      const P = tr.pipeWidthFt(p.od, 1, 0, c.sideClearanceIn ?? 12, 24);
      const input = {
        knots: [at(0), at(1)],
        layers: c.layers.map((l) => ({ layerId: null, ...l })),
        noBores: Boolean(c.noBores),
        pipe: { odIn: p.od, idIn: p.id, pipes: 1, gapIn: 0 },
        section: { sideClearanceIn: c.sideClearanceIn ?? 12, minWidthIn: 24, beddingIn: 6, zoneAboveCrownIn: 12 },
        bucket: c.bucket ?? "auto",
        box: tr.boxFor(P, boxes, { boxRef: c.boxRef ?? null, boxOutsideFt: c.boxOutsideFt ?? null }),
        specMaxIn: c.specMaxIn ?? null,
        protection: c.protection,
        limitedWidth: false,
        rule: c.rule ?? null,
        depthRangesFt: c.metricRanges ? tr.METRIC_RANGES_FT : [0, 6, 8, 10, 12, 14, 16],
        rangeUnit: c.metricRanges ? "m" : "ft",
        materials: { bedding: "imported", zone: "imported", backfill: "native" },
        materialNames: { bedding: "#57 stone", zone: "Sand", backfill: "Native" },
        segments: c.segments ?? [],
        restoration: null,
      };
      if (c.kind === "pits-run") {
        const pitOf = (pt) => {
          if (!pt) return null;
          const Eb = pt.floor - pt.slab - pt.stone;
          return sx.pitQuantities({
            shape: pt.shape, G: pt.rim, rim: pt.rim, floor: pt.floor, baseSlabFt: pt.slab, baseStoneFt: pt.stone, overdigFt: pt.overdig, lowestInvert: pt.floor,
            soil: { bands: c.layers.map((l) => ({ layerId: null, name: l.name, group: l.group, uscs: l.uscs, osha: l.osha, z0: -1e6, z1: pt.rim - Eb })), waterZ: null, caving: false, caveInFt: null, noBores: Boolean(c.noBores) },
            rule: null, protection: "auto", depthRangesFt: [0, 6, 8, 10, 12, 14, 16],
          });
        };
        const a = pitOf(c.pits.start);
        const b = pitOf(c.pits.end);
        const end = (p) => (p ? { R0: p.R0, kPit: p.k, pitBottom: p.bottomElev } : null);
        const t = sx.runBetweenPits(input, end(a), end(b));
        const pitsCF = (a?.excavationCF ?? 0) + (b?.excavationCF ?? 0);
        return {
          overlapCY: t.overlapCF.map((v) => r2(v / 27)),
          trenchCY: r2(t.excavationCF / 27),
          pitCY: [a, b].filter(Boolean).map((p) => r2(p.excavationCF / 27)),
          pitVF: [a, b].filter(Boolean).map((p) => p.vf),
          pitsAndTrenchCY: r2((pitsCF + t.excavationCF) / 27),
          // The backfill lines are written by material: after the overlap they still add up to the run's.
          backfillGapCY: r2((t.byMaterial.filter((m) => m.zone === "backfill").reduce((s, m) => s + m.cf, 0) - t.backfillCF) / 27),
        };
      }
      const r = q.runQuantities(input);
      const cy = (cf) => r2(cf / 27);
      const out = {
        widthText: r.widthText,
        excavationCY: cy(r.excavationCF),
        areaSF: r2(r.excavationCF / r.lengthFt),
        beddingCY: cy(r.beddingCF),
        zoneCY: cy(r.zoneCF),
        backfillCY: cy(r.backfillCF),
        pipeLF: r.pipeLF.map((x) => ({ range: x.range, lf: r2(x.lf) })),
        protectionLF: r.protectionLF.map((x) => ({ method: x.method, slope: x.slope, range: x.range, lf: r2(x.lf) })),
        methods: [...new Set(r.protectionLF.map((x) => x.method))],
        boxLF: r2(r.protectionLF.filter((x) => x.method === "box").reduce((a, x) => a + x.lf, 0)),
        maxTopWidthFt: r2(r.maxTopWidthFt),
        dewateringLF: r2(r.dewateringLF),
        benchableLF: r2(r.benchableLF ?? 0),
        dewatering: r.dewatering.map(([a, b]) => [r2(a), r2(b)]),
        layerCY: r.byLayer.map((l) => cy(l.cf)),
        rockCY: cy(r.rockCF),
        rockLF: r2(r.rockLF),
        nativeBankCY: cy(r.nativeBankCF),
        materialsCY: r.byMaterial.map((m) => [m.zone, m.name, m.source, cy(m.cf)]).sort((a, b) => `${a[0]}|${a[1]}`.localeCompare(`${b[0]}|${b[1]}`)),
        spoilsSuitableCY: cy(r.spoils.suitableCF),
        specExcavationCY: r.spec ? cy(r.spec.excavationCF) : null,
        invertStart: Math.round(input.knots[0].invert * 1e4) / 1e4,
        hasFlag: r.flags.find((f) => f === c.expect.hasFlag) ?? r.flags,
        hasNote: r.notes.find((n) => n === c.expect.hasNote) ?? r.notes,
      };
      if (c.aea) out.aeaOverCF = c.aea.map((step) => r2(q.averageEndArea(input, step) - r.excavationCF));
      // D-610: the open trench as drawn (trenchAt) at given stations, [top, bottom, depth], and its
      // widest top against the quantities' own (0: the drawing is the section the volumes integrate).
      if (c.trenchAt) {
        const pieceAt = (s) => r.shape.find((p) => s >= p.s0 - 1e-9 && s <= p.s1 + 1e-9);
        out.trench = c.trenchAt.map((s) => {
          const t = q.trenchAt(pieceAt(s), s);
          return [r2(t.top), r2(t.W), r2(t.h)];
        });
        out.trenchTopGap = r2(Math.max(...r.shape.flatMap((p) => [q.trenchAt(p, p.s0).top, q.trenchAt(p, p.s1).top])) - r.maxTopWidthFt);
      }
      // D-613: the cross-section pane's trench (trenchCut) at given stations: [top, bottom, depth] from
      // its drawn walls; the bedding, the pipe zone (with the pipe) and the backfill, SF, from their
      // polygons; the pipe's centre above the trench bottom and its radius. cutZoneGap: the drawn zones
      // against the volumes' own (`zones`) at every piece's ends and middle (0: the section integrated).
      if (c.trenchCut) {
        const pipe = { odFt: p.od / 12, idFt: p.id / 12, pipes: 1, gapFt: 0 };
        const area = (poly) => Math.abs(poly.reduce((a, [x1, y1], i) => a + x1 * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * y1, 0)) / 2;
        const zoneSF = (cut, kind) => area(cut.zones.find((z) => z.kind === kind)?.poly ?? []);
        out.cut = c.trenchCut.map((s) => {
          const cut = tp.trenchCut(r.shape, s, pipe);
          const w = cut.wall;
          return [r2(2 * w[w.length - 1][0]), r2(2 * w[0][0]), r2(w[w.length - 1][1] - w[0][1]), r2(zoneSF(cut, "bedding")), r2(zoneSF(cut, "zone")), r2(zoneSF(cut, "backfill")), r2(cut.pipes[0].y - cut.TB), r2(cut.pipes[0].ro)];
        });
        let gap = 0;
        for (const piece of r.shape) {
          for (const s of [piece.s0, (piece.s0 + piece.s1) / 2, piece.s1]) {
            const cut = tp.trenchCut([piece], s, pipe);
            const t = q.trenchAt(piece, s);
            const z = sec.zones(t.walls, t.W, t.h, t.tb, pipe.odFt, t.tz, 1);
            gap = Math.max(gap, Math.abs(zoneSF(cut, "bedding") - z.bedding), Math.abs(zoneSF(cut, "zone") - z.zone - z.zonePipe), Math.abs(zoneSF(cut, "backfill") - z.backfill));
          }
        }
        out.cutZoneGap = r2(gap);
      }
      if (c.lines) {
        const made = ln.utilityLines([
          {
            type: "sanitary",
            pipeLabel: '8" PVC SDR-35',
            pipeKey: c.pipe,
            pipes: 1,
            q: r,
            swell: c.layers.map(() => 1.3),
            materials: { bedding: { name: "#57 stone", source: "imported" }, zone: { name: "Sand", source: "imported" }, backfill: { name: "Native", source: "native" } },
            restoration: null,
          },
        ]);
        out.lines = made.map((l) => [l.name, l.unit, r2(l.quantity), l.role, l.workScope]);
      }
      return out;
    });
  }, UTILITY_CASES);
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

// Registration rows: the browser's fit against the api's, field by field, and both against
// the hand-worked answer (numbers to 1e-9).
for (const [i, c] of REG_ROWS.entries()) {
  const api = pythonReg.get(c.id);
  const web = reg[i];
  if (!api) disagree.push(`${c.id}: no api answer`);
  else
    for (const key of new Set([...Object.keys(api), ...Object.keys(web)])) {
      const [a, w] = [api[key], web[key]];
      const equal = typeof a === "number" && typeof w === "number" ? close(a, w) : a === w;
      if (!equal) disagree.push(`${c.id}.${key}: api ${JSON.stringify(a)}, browser ${JSON.stringify(w)}`);
    }
  for (const [field, want] of Object.entries(c.expect)) {
    const got = web[field];
    if (typeof want === "number" ? !(typeof got === "number" && close(got, want)) : got !== want) wrong.push(`${c.id}.${field}: ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
  }
}

// Site rows (F19): the join and placement against the api's twin, field by field; every
// row against the hand-worked answer.
for (const [i, c] of SITE_JOIN_CASES.entries()) {
  const api = pythonSite.get(c.id);
  const got = site.join[i];
  if (!api) disagree.push(`${c.id}: no api answer`);
  else
    for (const key of new Set([...Object.keys(api), ...Object.keys(got)])) {
      const [a, w] = [api[key], got[key]];
      const equal = typeof a === "number" && typeof w === "number" ? close(a, w) : a === w;
      if (!equal) disagree.push(`${c.id}.${key}: api ${JSON.stringify(a)}, browser ${JSON.stringify(w)}`);
    }
}
for (const [list, results] of [[SITE_JOIN_CASES, site.join], [SITE_SHAPE_CASES, site.shape]]) {
  for (const [i, c] of list.entries()) {
    for (const [field, want] of Object.entries(c.expect)) {
      const got = results[i]?.[field];
      const ok = typeof want === "number" ? typeof got === "number" && close(got, want) : got === want;
      if (!ok) wrong.push(`${c.id}.${field}: ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
  }
}

// Auto Count rows: each named field against the hand-worked answer.
for (const [list, results] of [[AUTOCOUNT_CASES, ac.vector], [AUTOCOUNT_PIPELINE_CASES, ac.pipeline]]) {
  for (const [i, c] of list.entries()) {
    for (const [field, want] of Object.entries(c.expect)) {
      const got = results[i]?.[field];
      const ok = typeof want === "number" ? typeof got === "number" && close(got, want) : got === want;
      if (!ok) wrong.push(`${c.id}.${field}: ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
  }
}

// Earthwork rows: each named field against the hand-worked answer (numbers to 1e-9).
const same = (got, want) =>
  typeof want === "number" ? typeof got === "number" && close(got, want) : JSON.stringify(got) === JSON.stringify(want);
for (const [i, c] of EARTHWORK_CASES.entries()) {
  for (const [field, want] of Object.entries(c.expect)) {
    if (!same(earth[i]?.[field], want)) wrong.push(`${c.id}.${field}: ${JSON.stringify(earth[i]?.[field])}, expected ${JSON.stringify(want)}`);
  }
}
// Utility rows (F29 Block 2): the same comparison.
for (const [i, c] of UTILITY_CASES.entries()) {
  for (const [field, want] of Object.entries(c.expect)) {
    if (!same(util[i]?.[field], want)) wrong.push(`${c.id}.${field}: ${JSON.stringify(util[i]?.[field])}, expected ${JSON.stringify(want)}`);
  }
}

// Sub-item rows (D-244, D-245): the browser against the api (1e-9), both against the hand
// answer, and what the draft editor shows before drawing.
for (const [i, c] of SUBITEM_CASES.entries()) {
  const web = subs[i];
  if (c.offers) {
    if (JSON.stringify(web.labels) !== JSON.stringify(c.expect)) wrong.push(`${c.id}: ${JSON.stringify(web.labels)}`);
    continue;
  }
  if (c.parse) {
    if (!(typeof web.feet === "number" && close(web.feet, c.expect))) wrong.push(`${c.id}: ${web.feet} ft, expected ${c.expect}`);
    continue;
  }
  const api = pythonSub.get(c.id);
  if (c.before && web.before !== c.before) wrong.push(`${c.id}: before drawing ${web.before}, expected ${c.before}`);
  if (c.expect === undefined) {
    // A refusal: both engines refuse, in the same words, and in the row's when it names them.
    if (web.value !== null || typeof api !== "object" || api === null) wrong.push(`${c.id}: read ${web.value} / ${JSON.stringify(api)}, expected a refusal`);
    else if (api.error !== web.error) disagree.push(`${c.id}: api "${api.error}", browser "${web.error}"`);
    else if (c.error && web.error !== c.error) wrong.push(`${c.id}: "${web.error}", expected "${c.error}"`);
    continue;
  }
  if (typeof api !== "number" || typeof web.value !== "number" || !close(api, web.value)) disagree.push(`${c.id}: api ${api}, browser ${web.value}`);
  if (typeof web.value !== "number" || !close(web.value, c.expect)) wrong.push(`${c.id}: ${web.value}, expected ${c.expect}`);
}

// Exported-formula rows (D-249): the text, Excel's reading equal to the app's and to the
// hand answer, before and after the linked cells change.
for (const [i, c] of EXCEL_CASES.entries()) {
  const got = xl[i];
  if ("verified" in c) {
    if (got.verified !== c.verified) wrong.push(`${c.id}: ${JSON.stringify(got.verified)}, expected ${JSON.stringify(c.verified)}`);
    continue;
  }
  if (got.text !== c.text) wrong.push(`${c.id}: wrote ${got.text}, expected ${c.text}`);
  if (!(typeof got.value === "number" && Math.abs(got.value - got.app) <= 1e-9 * Math.max(1, Math.abs(got.app)))) disagree.push(`${c.id}: Excel ${got.value}, app ${got.app}`);
  if (!(typeof got.value === "number" && Math.abs(got.value - c.value) <= 1e-6 * Math.max(1, Math.abs(c.value)))) wrong.push(`${c.id}: ${got.value}, expected ${c.value}`);
  if (c.change) {
    if (!(typeof got.changed === "number" && Math.abs(got.changed - got.appChanged) <= 1e-9 * Math.max(1, Math.abs(got.appChanged)))) disagree.push(`${c.id} changed: Excel ${got.changed}, app ${got.appChanged}`);
    if (!(typeof got.changed === "number" && Math.abs(got.changed - c.changed) <= 1e-6 * Math.max(1, Math.abs(c.changed)))) wrong.push(`${c.id} changed: ${got.changed}, expected ${c.changed}`);
  }
}

// Explanation rows (D-250): the words exactly, the figure formula.ts's and the hand answer's.
for (const [i, c] of EXPLAIN_CASES.entries()) {
  const got = ex[i];
  if (c.parent) {
    if (got.multiplied !== c.multiplied) wrong.push(`${c.id}: ${got.multiplied}`);
    if (JSON.stringify(got.shares) !== JSON.stringify(c.shares)) wrong.push(`${c.id} shares: ${JSON.stringify(got.shares)}`);
    continue;
  }
  if (got.substituted !== c.substituted) wrong.push(`${c.id}: "${got.substituted}"`);
  if (JSON.stringify(got.steps) !== JSON.stringify(c.steps)) wrong.push(`${c.id} steps: ${JSON.stringify(got.steps)}`);
  if (got.value !== got.app) disagree.push(`${c.id}: popover ${got.value}, formula.ts ${got.app}`);
  if (!(typeof got.value === "number" && Math.abs(got.value - c.value) <= 1e-6 * Math.max(1, Math.abs(c.value)))) wrong.push(`${c.id}: ${got.value}, expected ${c.value}`);
}

// Metric rows (D-375, D-376): exact feet, the read-back text exactly, the zero rule.
const near = (a, b) => typeof a === "number" && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
for (const [i, c] of ENTRY_CASES.entries()) {
  const got = mt.entry[i];
  if (!near(got.feet, c.feet)) wrong.push(`${c.id}: ${got.feet} ft, expected ${c.feet}`);
  if (got.readback !== c.readback) wrong.push(`${c.id}: read back "${got.readback}", expected "${c.readback}"`);
  if (Boolean(c.zero) !== Boolean(got.zero)) wrong.push(`${c.id}: zero rule ${got.zero}`);
}
for (const [i, c] of DISPLAY_CASES.entries()) {
  const got = mt.display[i];
  if (!near(got.value, c.shown) || got.unit !== c.label) wrong.push(`${c.id}: ${got.value} ${got.unit}, expected ${c.shown} ${c.label}`);
}
for (const [i, c] of MANUAL_CASES.entries()) {
  const got = mt.manual[i];
  if (!near(got.stored, c.stored) || got.shownText !== c.shownText) wrong.push(`${c.id}: stored ${got.stored} shown "${got.shownText}"`);
}

for (const [i, c] of NAME_CASES.entries()) if (mt.names[i] !== c.expect) wrong.push(`${c.id}: "${mt.names[i]}", expected "${c.expect}"`);
for (const [i, c] of PINNED_CASES.entries()) {
  const got = mt.pinned[i];
  if (!near(got.value, c.shown) || got.unit !== c.label || (c.factor === null ? got.factor !== null : !near(got.factor, c.factor))) wrong.push(`${c.id}: ${got.value} ${got.unit} factor ${got.factor}`);
}
for (const [i, c] of PICK_CASES.entries()) {
  const got = mt.picks[i];
  if (!got || got.code !== c.code || got.pinned !== c.pinned) wrong.push(`${c.id}: ${JSON.stringify(got)}`);
}
for (const [i, c] of DIMENSION_TOOL_CASES.entries()) if (mt.dims[i] !== c.expect) wrong.push(`${c.id}: "${mt.dims[i]}", expected "${c.expect}"`);

// Phase E rows: both engines equal, each the hand-worked stored figure; the warning's list exactly.
for (const [i, c] of FORMULA_SYSTEM_CASES.entries()) {
  const web = mt.fx.fx[i];
  const api = pythonFx.get(c.id);
  if (!(typeof web === "number" && typeof api === "number" && Math.abs(web - api) <= 1e-9 * Math.max(1, Math.abs(api)))) disagree.push(`${c.id}: app ${JSON.stringify(web)}, api ${JSON.stringify(api)}`);
  if (!near(web, c.expect)) wrong.push(`${c.id}: ${JSON.stringify(web)}, expected ${c.expect}`);
}
for (const [i, c] of CONSTANT_CASES.entries()) {
  if (JSON.stringify(mt.fx.constants[i]) !== JSON.stringify(c.expect)) wrong.push(`${c.id}: ${JSON.stringify(mt.fx.constants[i])}`);
}

// D-397 rows: component totals to the cent; the popover's metric figures and words; the export's
// metric expression live (and read as Excel reads it) or kept as its number.
const cents = (v) => Math.round(v * 100) / 100;
for (const [i, c] of COMPONENT_SYSTEM_CASES.entries()) {
  const got = mt.b2.components[i];
  if (typeof got !== "number" || cents(got) !== c.expect) wrong.push(`${c.id}: ${JSON.stringify(got)}, expected ${c.expect}`);
}
for (const [i, c] of EXPLAIN_METRIC_CASES.entries()) {
  const got = mt.b2.explains[i];
  for (const [field, want] of Object.entries(c.expect)) {
    const ok = typeof want === "number" ? near(got[field], want) : got[field] === want;
    if (!ok) wrong.push(`${c.id}.${field}: ${JSON.stringify(got[field])}, expected ${JSON.stringify(want)}`);
  }
}
for (const [i, c] of EXCEL_METRIC_CASES.entries()) {
  const got = mt.b2.excels[i];
  if (got.live !== c.live || (c.live && !near(got.read, c.cell))) wrong.push(`${c.id}: ${JSON.stringify(got)}`);
}

for (const [i, c] of CLOSE_CASES.entries()) {
  const got = mt.close[i];
  const ok = typeof c.expect === "number" ? near(got, c.expect) : got === c.expect;
  if (!ok) wrong.push(`${c.id}: ${JSON.stringify(got)}, expected ${JSON.stringify(c.expect)}`);
}

for (const [i, c] of PEN_CASES.entries()) {
  const got = mt.pen[i];
  if (!near(got.value, c.expect)) wrong.push(`${c.id}: ${got.value}, expected ${c.expect}`);
  if (c.clicks) {
    // Every click of a shape lands exactly as picked (D-632).
    for (const [k, p] of c.clicks.entries()) if (Math.abs(got.landed[k][0] - p[0]) > 1e-12 || Math.abs(got.landed[k][1] - p[1]) > 1e-12) wrong.push(`${c.id}: click ${k + 1} landed at ${got.landed[k]}, picked ${p}`);
  } else {
    const end = c.end ?? c.b;
    if (Math.abs(got.end[0] - end[0]) > 1e-12 || Math.abs(got.end[1] - end[1]) > 1e-12) wrong.push(`${c.id}: the pen landed at ${got.end}, expected ${end}`);
  }
}

// Scale undo rows (D-642): undo gives the first figures bit for bit and redo the second, on both
// engines; the engines agree; each against its hand-worked figure.
for (const [i, c] of SCALE_UNDO_CASES.entries()) {
  const api = pythonScale.get(c.id);
  const web = scaleWeb[i];
  if (!api || !web) {
    wrong.push(`${c.id}: no answer (api ${JSON.stringify(api)}, browser ${JSON.stringify(web)})`);
    continue;
  }
  if (api.fppA2 !== api.fppA || api.fppB2 !== api.fppB) wrong.push(`${c.id}: the scale came back as ${api.fppA2} (was ${api.fppA}), ${api.fppB2} (was ${api.fppB})`);
  for (const [name, got] of [["api", api], ["browser", web]]) {
    if (got.qA2 !== got.qA) wrong.push(`${c.id}: undo on the ${name} engine gives ${got.qA2}, was ${got.qA}`);
    if (got.qB2 !== got.qB) wrong.push(`${c.id}: redo on the ${name} engine gives ${got.qB2}, was ${got.qB}`);
  }
  if (close(api.qA, api.qB)) wrong.push(`${c.id}: the second scale did not move the figure (${api.qA})`);
  if (!close(api.qA, web.qA) || !close(api.qB, web.qB)) disagree.push(`${c.id}: api ${api.qA} / ${api.qB}, browser ${web.qA} / ${web.qB}`);
  if (c.expectA !== undefined && !close(api.qA, c.expectA)) wrong.push(`${c.id}: ${api.qA}, expected ${c.expectA}`);
  if (c.expectB !== undefined && !close(api.qB, c.expectB)) wrong.push(`${c.id}: ${api.qB} after the second scale, expected ${c.expectB}`);
}

// Credit rows (F14, D-236): the api's meter against the hand-worked answer, field by field.
for (const c of CREDIT_CASES) {
  const got = pythonCredits.get(c.id);
  for (const [field, want] of Object.entries(c.expect)) {
    if (JSON.stringify(got?.[field]) !== JSON.stringify(want)) wrong.push(`${c.id}.${field}: ${JSON.stringify(got?.[field])}, expected ${JSON.stringify(want)}`);
  }
}

checkEquipment(equipmentAnswers, wrong);

const worked = CASES.filter((c) => c.expect !== undefined).length;
if (disagree.length || wrong.length) {
  for (const line of [...disagree, ...wrong]) console.log(`FAIL  ${line}`);
  console.log(`quantity table: ${disagree.length} disagree, ${wrong.length} wrong, of ${CASES.length} rows`);
  process.exit(1);
}
console.log(
  `quantity table: ${CASES.length} rows, both engines equal to 1e-9 on ${CASES.filter((c) => !c.crossing).length}; ${worked} worked answers right; ${COST_CASES.length} cost rows right to the cent; ${EARTHWORK_CASES.length} earthwork rows right; ${UTILITY_CASES.length} utility rows right; ${REGISTER_CASES.length} registration and ${GEOREF_CASES.length} coordinates rows equal on both engines and right; ${SITE_JOIN_CASES.length + SITE_SHAPE_CASES.length} site rows right (${SITE_JOIN_CASES.length} on both engines); ${AUTOCOUNT_CASES.length + AUTOCOUNT_PIPELINE_CASES.length} Auto Count rows right; ${CREDIT_CASES.length} credit rows right; ${SUBITEM_CASES.length} sub-item rows right on both engines; ${EXCEL_CASES.length} exported-formula rows equal to the app in Excel's reading; ${EXPLAIN_CASES.length} explanation rows right; ${ENTRY_CASES.length + DISPLAY_CASES.length + MANUAL_CASES.length + NAME_CASES.length + DIMENSION_TOOL_CASES.length + PINNED_CASES.length + PICK_CASES.length} metric rows right; ${FORMULA_SYSTEM_CASES.length + CONSTANT_CASES.length} metric formula rows right (${FORMULA_SYSTEM_CASES.length} on both engines); ${COMPONENT_SYSTEM_CASES.length} component-formula, ${EXPLAIN_METRIC_CASES.length} metric popover and ${EXCEL_METRIC_CASES.length} metric export rows right; ${CLOSE_CASES.length} closed-spot rows right; ${PEN_CASES.length} pen rows right (Ortho on and off); ${SCALE_UNDO_CASES.length} scale undo rows exact (undo and redo bit for bit, both engines); ${EQUIPMENT_CASES.length} equipment rows right (628 classes' mob and demob and 965 production formula cells equal to the workbook's); passed`,
);

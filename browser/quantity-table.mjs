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
import { CASES } from "./lib/quantity-cases.mjs";
import { REGISTER_CASES } from "./lib/register-cases.mjs";
import { SITE_GROUND, SITE_HALVES, SITE_JOIN_CASES, SITE_SHAPE_CASES } from "./lib/site-cases.mjs";
import { SUBITEM_CASES } from "./lib/subitem-cases.mjs";
import { EXCEL_CASES, cellsOf } from "./lib/excel-cases.mjs";
import { EXPLAIN_CASES } from "./lib/explain-cases.mjs";
import { AUTOCOUNT_CASES, AUTOCOUNT_PIPELINE_CASES } from "./lib/autocount-cases.mjs";

const HERE = "/drive/scripts";
if (process.env.GEN === "1") {
  await writeFile(`${HERE}/.qt-cases.json`, JSON.stringify(CASES));
  await writeFile(`${HERE}/.qt-register.json`, JSON.stringify(REGISTER_CASES));
  await writeFile(`${HERE}/.qt-site.json`, JSON.stringify(SITE_JOIN_CASES));
  await writeFile(`${HERE}/.qt-credits.json`, JSON.stringify(CREDIT_CASES));
  await writeFile(`${HERE}/.qt-seed.json`, JSON.stringify(COST_CASES.filter((c) => c.kind === "seed")));
  await writeFile(`${HERE}/.qt-subitems.json`, JSON.stringify(SUBITEM_CASES.filter((c) => !c.parse && !c.offers)));
  console.log(`GEN ${CASES.length} cases, ${REGISTER_CASES.length} registration rows`);
  process.exit(0);
}

const python = new Map(JSON.parse(await readFile(`${HERE}/.qt-python.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonCredits = new Map(JSON.parse(await readFile(`${HERE}/.qt-credits-py.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonReg = new Map(JSON.parse(await readFile(`${HERE}/.qt-register-py.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonSite = new Map(JSON.parse(await readFile(`${HERE}/.qt-site-py.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonSub = new Map(JSON.parse(await readFile(`${HERE}/.qt-subitems-py.json`, "utf8")).map((r) => [r.id, r.value]));
const pythonSeed = Object.fromEntries(JSON.parse(await readFile(`${HERE}/.qt-seed-py.json`, "utf8")).map((r) => [r.id, r.value]));
const browser = await openBrowser();
let web;
let costs;
let earth;
let reg;
let site;
let ac;
let subs;
let xl;
let ex;
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
  costs = await page.evaluate(async ([cases, envItems, envSheet, seedCopies]) => {
    const costing = await import("/src/lib/estimate/costing.ts");
    const comps = await import("/src/lib/estimate/components.ts");
    const alloc = await import("/src/lib/estimate/equipmentAllocation.ts");
    const envs = await import("/src/lib/estimate/componentEnv.ts");
    const workbook = await import("/src/lib/estimate/workbook.ts");
    const removal = await import("/src/lib/estimate/componentRemoval.ts");
    const bid = await import("/src/lib/estimate/bidSummary.ts");
    const formula = await import("/src/lib/takeoff/subItems/formula.ts");
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
    const sc = ([feetPerPt, widthPt, heightPt]) => ({ feetPerPt, widthPt, heightPt });
    return cases.map((c) => {
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
  }, REGISTER_CASES);
  // F19's site rows: lib/takeoff/earthwork/site.ts (D-231).
  site = await page.evaluate(async ([joins, shapes, g, h]) => {
    const st = await import("/src/lib/takeoff/earthwork/site.ts");
    const r = await import("/src/lib/takeoff/earthwork/register.ts");
    const tin = await import("/src/lib/takeoff/earthwork/tin/index.ts");
    const vol = await import("/src/lib/takeoff/earthwork/volume/index.ts");
    const bal = await import("/src/lib/takeoff/earthwork/balance.ts");
    const sf = await import("/src/lib/takeoff/earthwork/surfaces.ts");
    const fe = await import("/src/lib/takeoff/earthwork/siteFeatures.ts");
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
      if (c.kind === "site-volume" || c.kind === "site-balance" || c.kind === "site-extras" || c.kind === "stitch") {
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
        if (c.kind === "site-extras") {
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
    const ed = await import("/src/lib/takeoff/earthwork/edit.ts");
    const rg = await import("/src/lib/takeoff/earthwork/register.ts");
    const ec = await import("/src/lib/takeoff/earthwork/elevationCheck.ts");
    const sx = await import("/src/lib/takeoff/earthwork/surfaces.ts");
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
        return out;
      }
      if (c.kind === "volume") {
        const runs = runsOf(c.runs);
        const labels = labelsOf(c.runs);
        const pts = (poly) => poly.map(([x, y]) => ({ x, y }));
        const r = vol.computeVolumes(
          {
            eg: tin.runTinForSurface(runs, "EG", labels),
            fg: tin.runTinForSurface(runs, "FG", labels),
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
        const cov = r.warnings.find((w) => w.code === "partial_coverage");
        if (cov) Object.assign(out, { coverage: cov.ratio, coverageSurfaces: cov.surfaces, coverageMessage: cov.message });
        const ov = r.warnings.find((w) => w.code === "role_overlap");
        if (ov) out.overlap = ov.overlappingLabels;
        if (c.vertices) out.vertices = c.vertices.map(([x, y]) => r.prisms.some((pr) => [pr.a, pr.b, pr.c].some((q) => Math.abs(q.x - x) < 1e-4 && Math.abs(q.y - y) < 1e-4)));
        if (c.fillWithin) out.fillWithin = r.fillCY > c.fillWithin[0] && r.fillCY < c.fillWithin[1];
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
for (const [i, c] of REGISTER_CASES.entries()) {
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

// Credit rows (F14, D-236): the api's meter against the hand-worked answer, field by field.
for (const c of CREDIT_CASES) {
  const got = pythonCredits.get(c.id);
  for (const [field, want] of Object.entries(c.expect)) {
    if (JSON.stringify(got?.[field]) !== JSON.stringify(want)) wrong.push(`${c.id}.${field}: ${JSON.stringify(got?.[field])}, expected ${JSON.stringify(want)}`);
  }
}

const worked = CASES.filter((c) => c.expect !== undefined).length;
if (disagree.length || wrong.length) {
  for (const line of [...disagree, ...wrong]) console.log(`FAIL  ${line}`);
  console.log(`quantity table: ${disagree.length} disagree, ${wrong.length} wrong, of ${CASES.length} rows`);
  process.exit(1);
}
console.log(
  `quantity table: ${CASES.length} rows, both engines equal to 1e-9 on ${CASES.filter((c) => !c.crossing).length}; ${worked} worked answers right; ${COST_CASES.length} cost rows right to the cent; ${EARTHWORK_CASES.length} earthwork rows right; ${REGISTER_CASES.length} registration rows equal on both engines and right; ${SITE_JOIN_CASES.length + SITE_SHAPE_CASES.length} site rows right (${SITE_JOIN_CASES.length} on both engines); ${AUTOCOUNT_CASES.length + AUTOCOUNT_PIPELINE_CASES.length} Auto Count rows right; ${CREDIT_CASES.length} credit rows right; ${SUBITEM_CASES.length} sub-item rows right on both engines; ${EXCEL_CASES.length} exported-formula rows equal to the app in Excel's reading; ${EXPLAIN_CASES.length} explanation rows right; passed`,
);

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
import { EARTHWORK_CASES } from "./lib/earthwork-cases.mjs";
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
let earth;
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
    const bid = await import("/src/lib/estimate/bidSummary.ts");
    return cases.map((c) => {
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
  }, [COST_CASES, ENV_ITEMS, ENV_SHEET]);
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
    const xy = (poly) => poly.map(([x, y]) => ({ x, y }));
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
      return { error: `unknown kind ${c.kind}` };
    });
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

// Earthwork rows: each named field against the hand-worked answer (numbers to 1e-9).
const same = (got, want) =>
  typeof want === "number" ? typeof got === "number" && close(got, want) : JSON.stringify(got) === JSON.stringify(want);
for (const [i, c] of EARTHWORK_CASES.entries()) {
  for (const [field, want] of Object.entries(c.expect)) {
    if (!same(earth[i]?.[field], want)) wrong.push(`${c.id}.${field}: ${JSON.stringify(earth[i]?.[field])}, expected ${JSON.stringify(want)}`);
  }
}

const worked = CASES.filter((c) => c.expect !== undefined).length;
if (disagree.length || wrong.length) {
  for (const line of [...disagree, ...wrong]) console.log(`FAIL  ${line}`);
  console.log(`quantity table: ${disagree.length} disagree, ${wrong.length} wrong, of ${CASES.length} rows`);
  process.exit(1);
}
console.log(
  `quantity table: ${CASES.length} rows, both engines equal to 1e-9 on ${CASES.filter((c) => !c.crossing).length}; ${worked} worked answers right; ${COST_CASES.length} cost rows right to the cent; ${EARTHWORK_CASES.length} earthwork rows right; passed`,
);

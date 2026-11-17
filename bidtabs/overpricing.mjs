// Why our direct cost runs high (D-1274, Part 2 of the 2026-11-15 -> 16 night run): analysis only. No engine, api,
// library or bench change, no harness run. It reads Part 1's per-item results (D-1273: the engine's own L/E/M per item
// and its lines by role) and splits each recent item's gap to the tab into:
//   (a) production / crew / mobilization (the pipe line's labour and equipment),
//   (b) trench-section quantities (bedding and embedment volumes, width), re-cut under Part 6's presets with the
//       engine's own section math (imported from the app: section.ts zones/areaBetween, trench.ts widths, catalog.ts
//       sizes, crossings.ts bellOd),
//   material: (i) unit price against public evidence, (ii) quantity drivers, (iii) add-ons.
// No tab figure lives here: every input is read from docs/reference at run time and every output is written there.
//
//   node --import ./bidtabs/engine-hook.mjs bidtabs/overpricing.mjs "<Bid tabs dir>" "<overlay json>" "<out prefix>"
//
// Inputs (in <Bid tabs dir>): why-we-bid-low-2026-11-16-basis-items.json, contract-results-2026-11-16-d1273.json,
// library-snapshot-2026-11-15.json, material-evidence-2026-11-16.json.

import { readFileSync, writeFileSync } from "node:fs";
import { APP_SRC_URL } from "./engine-hook.mjs";

const [, , dir, overlayPath, outPrefix] = process.argv;
const J = (f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
const basis = J("why-we-bid-low-2026-11-16-basis-items.json");
const results = J("contract-results-2026-11-16-d1273.json");
const lib = J("library-snapshot-2026-11-15.json").mat;
const evid = J("material-evidence-2026-11-16.json");
const overlay = JSON.parse(readFileSync(overlayPath, "utf8"));

const U = `${APP_SRC_URL}lib/takeoff/earthwork/utilities/`;
const section = await import(`${U}section.ts`);
const trench = await import(`${U}trench.ts`);
const catalog = await import(`${U}catalog.ts`);
const crossings = await import(`${U}crossings.ts`);
const materials = await import(`${U}materials.ts`);

// ---------- Constants (each named with its source) ----------
const LOC = 0.98737; // Houston 77002 material location factor (D-1267's note; gap-analysis.mjs)
const HEALTHY = { low: 1.2, mid: 1.275, high: 1.35 }; // the founder: healthy median ÷ direct 1.20–1.35 (direct ≈ 75–83 %)
const AGG_WASTE = 0.1; // materials.ts lineMaterials: a zone material's 10 % waste
// materials.ts ALLOWANCE_PCT / allowancePct (D-1296, the founder's Q5 and Q6): pressure (water, force main) 12 %, fire water
// 30 %, sanitary 2 %, storm RCP 0 %, every other kind (HDPE / PP storm, conduit) 5 %.
const ALLOWANCE = { pressure: 0.12, fire: 0.3, sanitary: 0.02, stormRcp: 0, gravity: 0.05 };
const allowanceGroup = (it) => (it.type === "fire_water" ? "fire" : it.type === "water" || it.type === "force_main" ? "pressure" : it.type === "sanitary" ? "sanitary" : it.type === "storm" && /^rcp_c76/.test(it.entry) ? "stormRcp" : "gravity");
const TIER = { // api materials/tiers.py TYPES (defaults; the workspace has no mat_tier_setting row)
  pipe_rigid: { bulk: 600, std: 160, fStd: 1.1, fSmall: 1.2 },
  pipe_plastic: { bulk: 2000, std: 400, fStd: 1.1, fSmall: 1.2 },
};
const SPEC = { pvc_c900: { joint: 20, waste: 0.02 }, ductile_iron: { joint: 18, waste: 0.02 }, rcp_c76: { joint: 8, waste: 0.01 }, hdpe_dual_wall: { joint: 20, waste: 0.02 }, hdpe_ips: { joint: 40, waste: 0.02 }, pvc_sewer: { joint: 14, waste: 0.02 } };
// Machines, read 2026-11-14 from the bench's eqlib.eq_class and eqlib.ew_tier_machine (read-only psql): 4-week rent,
// fuel gph (medium). Gulf Coast diesel $5.903/gal (the library's fuel row, gap-analysis.mjs).
const MACH = { "EX-CRAWL-20T": [7950, 2.78], "EX-CRAWL-13T": [5250, 1.9], "BH-STD-14FT": [3735, 1.46], "WL-COMPACT-1Y": [3240, 0.75], "WL-COMPACT-2Y": [4900, 1.16], "SS-WHEEL-LARGE": [2958, 3.3], "CP-PLATE-REV": [2418, 0.58], "TRK-PU-8808": [1872.61, 3.33] };
const TIER_MACH = { A18: [["BH-STD-14FT", "CP-PLATE-REV", "TRK-PU-8808"], ["EX-CRAWL-13T", "CP-PLATE-REV", "TRK-PU-8808"]], A32: [["EX-CRAWL-20T", "SS-WHEEL-LARGE", "CP-PLATE-REV", "TRK-PU-8808"], ["EX-CRAWL-20T", "WL-COMPACT-1Y", "CP-PLATE-REV", "TRK-PU-8808"], ["EX-CRAWL-20T", "WL-COMPACT-2Y", "CP-PLATE-REV", "TRK-PU-8808"]] };
TIER_MACH.A28 = TIER_MACH.A32; // the sewer crew's machines are the storm crew's, tier for tier (eqlib.ew_tier_machine)
const DIESEL = 5.903;
const DAY_H = 10;
// The floor: a 4-week rental's daily share with the 10 h day's 2 h over the 8 h rental day at the period's hourly
// equivalent (periods.ts: 4-week ÷ 160 h), plus fuel; no mobilization, no period rounding, no minimum.
const floorDay = (act, tier) => TIER_MACH[act][Math.min(tier, TIER_MACH[act].length - 1)].reduce((t, k) => t + (MACH[k][0] / 20) * (DAY_H / 8) + MACH[k][1] * DAY_H * DIESEL, 0);

// ---------- Production, the engine's formula (as gap-analysis.mjs, api production.py) ----------
const DEFAULTS = {
  A28: [[0, 99, 85, 0], [100, 249, 155, 1], [250, 499, 205, 1], [500, 999, 255, 2], [1000, 2499, 310, 2], [2500, Infinity, 340, 2]],
  A32: [[0, 99, 70, 0], [100, 249, 130, 1], [250, 499, 170, 1], [500, 999, 210, 1], [1000, 2499, 255, 2], [2500, Infinity, 285, 2]],
  A18: [[0, 99, 180, 0], [100, 249, 280, 1], [250, 499, 340, 1], [500, 999, 380, 1], [1000, 2499, 400, 1], [2500, Infinity, 420, 1]],
};
const gravityPace = (d) => { const m = Math.min(26, d); return 1 / Math.exp(0.02733 * Math.max(0, m - 8) + 0.10573 * Math.max(0, m - 20)); };
const PRESSURE = { plastic: [[6, 1.06], [8, 1.0], [10, 0.98], [12, 0.97], [16, 0.75], [20, 0.62]], ductile: [[6, 0.63], [8, 0.52], [10, 0.43], [12, 0.34], [16, 0.27], [20, 0.22]] };
function production(it, run) {
  const n = Number(it.nominal);
  if (it.type === "sanitary" || it.type === "storm") {
    const act = it.type === "sanitary" ? "A28" : "A32";
    const [, , base, tier] = DEFAULTS[act].find(([a, b]) => run >= a && run <= b + 0.9999);
    return { act, base, tier, rate: base * (n >= 30 ? 0.68 : 1) * gravityPace(it.depth ?? 6.5) };
  }
  const [, , base, tier] = DEFAULTS.A18.find(([a, b]) => run >= a && run <= b + 0.9999);
  const kind = it.entry.startsWith("di") ? "ductile" : "plastic";
  return { act: "A18", base, tier, rate: base * (PRESSURE[kind].find(([m]) => n <= m) ?? [0, kind === "ductile" ? 0.19 : 0.53])[1] };
}
const bandOf = (d) => { const R = [0, 6, 8, 10, 12, 14, 16]; const i = R.findIndex((r, k) => d - 1e-4 >= r && d - 1e-4 < (R[k + 1] ?? Infinity)); return i < 0 ? "16+" : String(R[i]); };

// ---------- The section: legacy (the engine's zones) and Part 6's presets ----------
const SAND = { key: "stone:sand", pcf: materials.SAND_PCF };
const STONE = { key: "stone:_57_stone", pcf: materials.STONE_PCF };
const cyPrice = (m) => ((lib[m.key]?.price ?? 0) * m.pcf * 27) / 2000 * (1 + AGG_WASTE) * LOC; // $/CCY placed
const segArea = (r, t) => { const c = Math.min(2 * r, Math.max(0, t)); return r * r * Math.acos((r - c) / r) - (r - c) * Math.sqrt(Math.max(0, 2 * r * c - c * c)); };
const bellLenFt = (nom) => (nom <= 12 ? 0.5 : nom <= 30 ? 0.75 : 1.0); // D-1278 §2.4, accepted grade D (founder, Part 6 answer 4)
function pipeGeom(entry, nominal) {
  const pick = catalog.catalogPick(`${entry}:${nominal}`);
  const fam = catalog.catalogEntry(entry)?.family;
  const od = pick.size.od;
  const bellless = fam === "hdpe_ips";
  const bell = bellless ? od : crossings.bellOd(`${entry}:${nominal}`, od).bellIn;
  return { od, id: pick.size.id, wall: pick.size.wall ?? (od - pick.size.id) / 2, bell, fam, jointFt: SPEC[fam]?.joint ?? 20, bellLen: bellless ? 0 : bellLenFt(Number(nominal)) };
}
// Net area of a band [z0, z1] (ft above the trench bottom) over width W, less the barrel and (optionally) the bell
// annulus × bell length ÷ joint length; the bell below the trench bottom is not counted (D-1278 §2.4).
function band(W, z0, z1, g, zb, withBell) {
  if (!(z1 > z0)) return 0;
  const r = g.od / 24;
  const barrel = segArea(r, z1 - zb) - segArea(r, z0 - zb);
  let bell = 0;
  if (withBell && g.bellLen > 0) {
    const rb = g.bell / 24;
    const zbb = zb - (rb - r);
    const lo = Math.max(z0, 0);
    const bellSeg = segArea(rb, z1 - zbb) - segArea(rb, lo - zbb);
    const barSeg = segArea(r, z1 - zb) - segArea(r, lo - zb);
    bell = Math.max(0, bellSeg - barSeg) * (g.bellLen / g.jointFt);
  }
  return W * (z1 - z0) - barrel - bell;
}
const bucketWidth = (pipeFt) => trench.trenchWidth(pipeFt, trench.bucketFt(pipeFt, "auto"), null).widthFt;
function legacySection(it, g) {
  const s = trench.sectionFor(it.type, trench.DEFAULT_UTILITY_SETTINGS);
  const W = bucketWidth(trench.pipeWidthFt(g.od, 1, 0, s.sideClearanceIn, s.minWidthIn));
  const tb = trench.DEFAULT_UTILITY_SETTINGS.beddingIn / 12;
  const tz = trench.DEFAULT_UTILITY_SETTINGS.zoneAboveCrownIn / 12;
  const h = it.type === "water" ? 4 + g.od / 12 + tb : (it.depth ?? 6.5) + g.wall / 12 + tb;
  const z = section.zones({ kind: "vertical" }, W, h, tb, g.od / 12, tz, 1);
  // Materials as the engine picks them for a run with no choice (materials.ts embedmentDefault): pressure sand + sand;
  // flexible gravity the project's #57 bedding + #57 zone; rigid (RCP) the project's #57 bedding + sand zone.
  const flexible = g.fam === "hdpe_dual_wall";
  const bedM = it.type === "water" ? SAND : STONE;
  const zoneM = it.type === "water" ? SAND : flexible ? STONE : SAND;
  return { W, h, layers: [{ name: "bedding", cy: z.bedding / 27, m: bedM }, { name: "zone", cy: z.zone / 27, m: zoneM }], excCy: z.total / 27 };
}
function presetSection(preset, it, g) {
  const odFt = g.od / 12;
  let W;
  let tb;
  let tops; // [[name, top height above the pipe's bottom, material]]
  let bedM = SAND;
  if (preset === "c605_t4_house" || preset === "c605_t4") {
    W = bucketWidth(trench.pipeWidthFt(g.od, 1, 0, 6, 18)); // od_plus 6, min 18 (= today's pressure width)
    tb = Math.max(g.od / 8, 4) / 12;
    tops = [["embedment", preset === "c605_t4_house" ? odFt + 1 : odFt, SAND]];
  } else if (preset === "sand_12") {
    // Today's storm width and thicknesses with bank sand in place of the #57 bedding (the Houston districts' sand
    // embedment, D-1096's note; a variant, not a Part 6 preset), bell out.
    const s = trench.sectionFor(it.type, trench.DEFAULT_UTILITY_SETTINGS);
    W = bucketWidth(trench.pipeWidthFt(g.od, 1, 0, s.sideClearanceIn, s.minWidthIn));
    tb = 0.5;
    tops = [["zone to 12 in over the crown", odFt + 1, SAND]];
  } else if (preset === "c1479_t2") {
    W = bucketWidth((g.od + (2 * g.od) / 6) / 12);
    tb = Math.max(g.od / 24, 3) / 12;
    bedM = STONE;
    tops = [["haunch to springline", odFt / 2, SAND]];
  } else if (preset === "d2321") {
    W = bucketWidth(Math.max(g.od + 16, 1.25 * g.od + 12) / 12);
    tb = 4 / 12;
    bedM = STONE;
    tops = [["haunch to springline", odFt / 2, STONE], ["initial to 6 in over the crown", odFt + 0.5, STONE]];
  } else throw new Error(preset);
  const h = it.type === "water" ? 4 + odFt + tb : (it.depth ?? 6.5) + g.wall / 12 + tb;
  const layers = [{ name: "bedding", cy: band(W, 0, tb, g, tb, true) / 27, m: bedM }];
  let z = tb;
  for (const [name, top, m] of tops) {
    const z1 = Math.min(tb + top, h);
    layers.push({ name, cy: band(W, z, z1, g, tb, true) / 27, m });
    z = z1;
  }
  return { W, h, layers, excCy: (W * h) / 27 };
}
const priceLayers = (s) => s.layers.reduce((t, l) => t + l.cy * cyPrice(l.m), 0);
const cyOf = (s) => s.layers.reduce((t, l) => t + l.cy, 0);

// ---------- Evidence ----------
function evidenceFor(entry, nominal) {
  const e = evid.pipe[entry]?.[nominal];
  if (e) return { ...e, grade: evid.sources[e.src].grade };
  if (entry === "pvc_c900_dr18" || entry === "pvc_c900_dr14") {
    // C900 sizes and DR 14 by the 8 in DR 18 evidence's low/high ratio (grade C).
    const e8 = evid.pipe.pvc_c900_dr18["8"];
    const p = lib[`pipe:${entry}:${nominal}`]?.price;
    if (!p) return null;
    return { low: p * (e8.low / e8.high), high: p, src: "d1096", grade: "C (ratio)" };
  }
  return null;
}

// ---------- Per item ----------
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const ov = overlay.overlay;
const ohp = ov.ohp;
const ind = ov.indirects;
const bidOf = (L, E, M, bond) => (L * (1 + (ind.supervisionPctOfLabourAndEquipment + ind.smallToolsPctOfLabour) / 100) * (1 + ohp.labourPct / 100) + E * (1 + ind.supervisionPctOfLabourAndEquipment / 100) * (1 + ohp.equipmentPct / 100) + M * (1 + ohp.materialPct / 100)) / (1 - ind.glInsurancePctOfBid / 100 - bond);

const rows = [];
const spreads = new Map(); // contract|act → { lab$, eq$, days, floor$ }
for (const c of results) {
  const lk = (it) => `${it.type}|${it.entry}|${it.nominal}|${it.type === "sanitary" || it.type === "storm" ? bandOf(it.depth) : "p"}`;
  const lines = new Map();
  for (const it of c.items) if (it.ours != null) lines.set(lk(it), [...(lines.get(lk(it)) ?? []), it.qty]);
  // Each pipe key's contract total (tier and joint rounding are by the bid's total of the key).
  const keyLf = new Map();
  for (const it of c.items) if (it.ours != null) keyLf.set(`${it.entry}:${it.nominal}`, (keyLf.get(`${it.entry}:${it.nominal}`) ?? 0) + it.qty);
  const waterLf = c.items.filter((it) => it.ours != null && it.type === "water").reduce((t, it) => t + it.qty, 0);
  c.items.forEach((it, i) => {
    const b = basis.find((x) => x.key === c.key && x.i === i);
    if (!b || !b.priced || b.excluded || it.ours == null) return;
    const l = lines.get(lk(it));
    const run = l.reduce((t, x) => t + x, 0) / l.length;
    const p = production(it, run);
    const g = pipeGeom(it.entry, it.nominal);
    const role = it.byRole;
    const mPipeLine = role.utility_pipe.mat + (role.utility_backfill?.mat ?? 0);
    const mBed = role.utility_bedding_pipe_zone.mat;
    const nom = Number(it.nominal);
    // Material model of the pipe line (materials.ts pipeMaterials).
    const price = lib[`pipe:${it.entry}:${it.nominal}`]?.price ?? 0;
    const spec = SPEC[g.fam] ?? { joint: 20, waste: 0.02 };
    const tierType = /^(rcp|di_|ductile)/.test(it.entry) ? "pipe_rigid" : "pipe_plastic";
    const tot = keyLf.get(`${it.entry}:${it.nominal}`) * (1 + spec.waste);
    const tt = TIER[tierType];
    const tier = tot >= tt.bulk ? 1 : tot >= tt.std ? tt.fStd : tt.fSmall;
    const round = (Math.ceil(tot / spec.joint - 1e-9) * spec.joint) / tot;
    const allow = it.allowance === false ? 0 : ALLOWANCE[allowanceGroup(it)];
    const bulk = price * LOC;
    const atTier = bulk * tier;
    const withWaste = atTier * (1 + spec.waste) * round;
    const allowance = withWaste * allow;
    // Add-ons and joint parts (iii).
    const L = (k) => (lib[k]?.price ?? 0) * LOC;
    const addons = {};
    if (it.type === "water") {
      addons.testDisinfect = Math.max(L("addon:test_disinfect") * waterLf, L("addon_min:test_disinfect")) / waterLf;
      if (g.fam !== "ductile_iron") addons.tracer = (L("tracer_wire") * 1.1) / 500;
      if (g.fam !== "ductile_iron") addons.tape = (L("warning_tape") * 1.05) / 1000;
      if (g.fam === "ductile_iron") addons.polyWrap = L(`encasement:di:${it.nominal}`) * 1.1;
      if (it.restrainedPct) addons.restraint = (Math.ceil((it.qty * it.restrainedPct) / 100 / 20) * L(`restraint_joint:pvc_c900:${it.nominal}`)) / it.qty;
    }
    if (g.fam === "rcp_c76") addons.gasket = (Math.ceil(it.qty / 8) * L(`gasket:rcp:${it.nominal}`)) / it.qty;
    if (g.fam === "hdpe_dual_wall") addons.tape = (L("warning_tape") * 1.05) / 1000;
    if (it.type === "sanitary") addons.cctv = L("addon:cctv");
    const addonSum = Object.values(addons).reduce((t, x) => t + x, 0);
    const modelPipeLine = withWaste + allowance + addonSum;
    const other = mPipeLine - modelPipeLine;
    // (i) the unit price against the evidence.
    const ev = evidenceFor(it.entry, it.nominal);
    const mult = LOC * tier * (1 + spec.waste) * round * (1 + allow);
    const priceVsLow = ev ? (price - ev.low) * mult : null;
    const priceVsHigh = ev ? (price - ev.high) * mult : null;
    // (b) the section.
    const leg = legacySection(it, g);
    const legModel = priceLayers(leg);
    const bedScale = legModel > 0 ? mBed / legModel : 1;
    const presets = it.type === "water" ? ["c605_t4_house", "c605_t4"] : g.fam === "rcp_c76" ? ["c1479_t2", "sand_12"] : g.fam === "hdpe_dual_wall" ? ["d2321"] : [];
    const pres = {};
    for (const ps of presets) {
      const s = presetSection(ps, it, g);
      pres[ps] = { W: s.W, cy: cyOf(s), layers: s.layers.map((x) => ({ name: x.name, cy: x.cy, mat: x.m.key })), mat: priceLayers(s) * bedScale, excCy: s.excCy, lab: 0, eq: 0 };
    }
    // (a) labour and equipment per day.
    const labOpen = it.labPerLF;
    const sp = `${c.key}|${p.act}`;
    const fd = floorDay(p.act, p.tier);
    const s0 = spreads.get(sp) ?? { key: c.key, act: p.act, lf: 0, lab: 0, eq: 0, days: 0, floor: 0 };
    s0.lf += it.qty; s0.lab += labOpen * it.qty; s0.eq += it.eqPerLF * it.qty; s0.days += it.qty / p.rate; s0.floor += (fd / p.rate) * it.qty;
    spreads.set(sp, s0);
    const direct = b.L + b.E + b.M;
    const bid = bidOf(b.L, b.E, b.M, b.bondPct);
    rows.push({
      key: c.key, i, type: it.type, entry: it.entry, nominal: nom, depth: it.depth, qty: it.qty, restrainedPct: it.restrainedPct ?? 0,
      bidders: b.bidders, low: b.low, median: b.median, rank: b.rank,
      L: b.L, E: b.E, M: b.M, direct, bid, bidCheck: b.bid,
      healthyTarget: b.median / HEALTHY.mid, gapMedian: direct - b.median / HEALTHY.mid, gapMedianLow: direct - b.median / HEALTHY.low, gapMedianHigh: direct - b.median / HEALTHY.high,
      gapLow: direct - b.low * (direct / bid),
      run, act: p.act, tier: p.tier, lfPerDay: p.rate, labDay: labOpen * p.rate, eqDay: it.eqPerLF * p.rate, eqFloorDay: fd, eqFloorPerLf: fd / p.rate, eqOverPerLf: it.eqPerLF - fd / p.rate,
      mPipeLine, mBed, pipePrice: price, pipeGrade: lib[`pipe:${it.entry}:${it.nominal}`]?.grade, bulk, tierFactor: tier, tierUplift: atTier - bulk, wasteRound: withWaste - atTier, allowancePct: allow, allowance, addons, addonSum, other,
      evidence: ev, priceVsLow, priceVsHigh,
      section: { W: leg.W, cy: cyOf(leg), layers: leg.layers.map((x) => ({ name: x.name, cy: x.cy, mat: x.m.key })), mat: mBed, model: legModel, scale: bedScale, excCy: leg.excCy },
      presets: pres,
    });
  });
}

// Spread fixed cost: per activity, equipment $ = a·days + M over the contracts (least squares).
function fitMob(act) {
  const s = [...spreads.values()].filter((x) => x.act === act);
  const n = s.length, sx = s.reduce((t, x) => t + x.days, 0), sy = s.reduce((t, x) => t + x.eq, 0), sxx = s.reduce((t, x) => t + x.days * x.days, 0), sxy = s.reduce((t, x) => t + x.days * x.eq, 0);
  const a = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { act, n, perDay: a, fixed: (sy - a * sx) / n, spreads: s.map((x) => ({ ...x, eqPerDay: x.eq / x.days, labPerDay: x.lab / x.days, floorPerDay: x.floor / x.days })) };
}
const mob = { A18: fitMob("A18"), A32: fitMob("A32"), A28: fitMob("A28") };

writeFileSync(`${outPrefix}-items.json`, JSON.stringify({ note: "D-1274 per-item split; $/LF direct (labour at the tab's bid-date rate) unless named", healthy: HEALTHY, rows, mob }, null, 1));
console.log(`rows ${rows.length}; mob fit A18 ${mob.A18.perDay.toFixed(0)}/day + ${mob.A18.fixed.toFixed(0)}, A32 ${mob.A32.perDay.toFixed(0)}/day + ${mob.A32.fixed.toFixed(0)}`);
export { rows, mob, median };

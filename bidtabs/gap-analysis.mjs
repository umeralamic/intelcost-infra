// Why we bid low (D-1271, Part 5 of the 2026-11-14 night run): the bid-tab gap item by item, analysis only. Reads the
// corrected 16-contract run (contract-runner.js's results, D-1267 correction, D-1268 prices) and each tab's pay items and
// bidder prices (tab-prices.mjs), and writes the per-item tables. No engine, api or library change; no bid figure lives
// here: every input and output is in docs/reference (outside git).
//
//   node bidtabs/gap-analysis.mjs "<Bid tabs dir>" "<library snapshot json>" "<out prefix>"
//
// Basis (D-1103): ours is the direct cost, labour at the tab's bid-date prevailing rate (the run's open-shop labour x the
// contract's labour ratio), against the tab's median bidder escalated by ECI. "Pipe" = the 162 pipe LF items the harness
// priced; "non-LF" = the water and sewer appurtenance pay items (valves, hydrants, flushing valves, tapping sleeves, wet
// connections, plugs and blow-offs, services, fittings by the ton), priced here from the library and the engine's crews.
//
// Production per pipe line is the engine's own formula (api `production.py`): the crew's default by the line's mean run
// length (A28 sewer, A32 storm, A18 pressure; eqlib.ew_default), x 0.68 at 30 in and over (D-1085), x the gravity depth
// pace 1/exp(0.02733 max(0, d-8) + 0.10573 max(0, d-20)) (D-1141/D-1211), pressure by size (D-1105). The crew is the
// tier the default row names (eqlib.ew_tier_crew / ew_tier_machine).

import { readFileSync, writeFileSync } from "node:fs";

const [, , dir, libPath, outPrefix] = process.argv;
const J = (f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
const results = J("contract-results-2026-11-15-d1267-corrected.json");
const inputs = new Map(J("contracts-16-d1267b-2026-11-15.json").map((c) => [c.key, c]));
const cmp = new Map(J("contract-cmp-all-2026-11-12.json").map((c) => [c.key, c]));
const tabPrices = new Map(J("tab-prices-2026-11-15.json").map((c) => [c.key, c]));
const lib = JSON.parse(readFileSync(libPath, "utf8"));
const MATERIAL_LOCATION = 0.98737; // Houston 77002 material AMF (D-1267's note)
const MARKUP = 1.15; // the band's assumption (rebuild-report.mjs): a bid carries about 15 % over its direct cost

const median = (a) => {
  const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
};
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);

// ---------- Production, the engine's formula ----------
const DEFAULTS = {
  A28: [[0, 99, 85, 0], [100, 249, 155, 1], [250, 499, 205, 1], [500, 999, 255, 2], [1000, 2499, 310, 2], [2500, Infinity, 340, 2]],
  A32: [[0, 99, 70, 0], [100, 249, 130, 1], [250, 499, 170, 1], [500, 999, 210, 1], [1000, 2499, 255, 2], [2500, Infinity, 285, 2]],
  A18: [[0, 99, 180, 0], [100, 249, 280, 1], [250, 499, 340, 1], [500, 999, 380, 1], [1000, 2499, 400, 1], [2500, Infinity, 420, 1]],
};
const CREWS = {
  A28: ["Foreman, pipelayer, laborer; 20 t excavator, skid steer, plate, pickup", "Foreman, pipelayer, laborer; 20 t excavator, 1 yd loader, plate, pickup", "Foreman, pipelayer, 2 laborers; 20 t excavator, 2 yd loader, plate, pickup"],
  A32: ["Foreman, pipelayer, laborer; 20 t excavator, skid steer, plate, pickup", "Foreman, pipelayer, laborer; 20 t excavator, 1 yd loader, plate, pickup", "Foreman, pipelayer, 2 laborers; 20 t excavator, 2 yd loader, plate, pickup"],
  A18: ["Lead, pipelayer, laborer; backhoe loader, plate, pickup", "Lead, pipelayer, 2 laborers; 13-15 t excavator, plate, pickup"],
};
const gravityPace = (d) => {
  const mid = Math.min(26, d);
  return 1 / Math.exp(0.02733 * Math.max(0, mid - 8) + 0.10573 * Math.max(0, mid - 20));
};
const PRESSURE = { plastic: [[6, 1.06], [8, 1.0], [10, 0.98], [12, 0.97], [16, 0.75], [20, 0.62]], ductile: [[6, 0.63], [8, 0.52], [10, 0.43], [12, 0.34], [16, 0.27], [20, 0.22]] };
function production(it, lineRunLf) {
  const n = Number(it.nominal);
  if (it.type === "sanitary" || it.type === "storm") {
    const act = it.type === "sanitary" ? "A28" : "A32";
    const [, , base, tier] = DEFAULTS[act].find(([a, b]) => lineRunLf >= a && lineRunLf <= b + 0.9999);
    const large = n >= 30 ? 0.68 : 1;
    const depth = gravityPace(it.depth);
    return { act, base, tier, crew: CREWS[act][tier], pace: large * depth, rate: base * large * depth };
  }
  const [, , base, tier] = DEFAULTS.A18.find(([a, b]) => lineRunLf >= a && lineRunLf <= b + 0.9999);
  const kind = it.entry.startsWith("di") ? "ductile" : "plastic";
  const bySize = (PRESSURE[kind].find(([m]) => n <= m) ?? [0, kind === "ductile" ? 0.19 : 0.53])[1];
  return { act: "A18", base, tier, crew: CREWS.A18[tier], pace: bySize, rate: base * bySize };
}

// ---------- The tab's own description and its all-bidder median ----------
function tabRow(key, it) {
  const tp = tabPrices.get(key);
  if (!tp) return null;
  const size = new RegExp(`(^|[^\\d])${it.nominal}\\s*(["”″]|IN|-INCH)`, "i");
  const cands = tp.items.filter((x) => x.unit === "LF" && x.qty === it.qty);
  return cands.find((x) => size.test(x.desc)) ?? cands[0] ?? null;
}

// ---------- Pipe LF items ----------
const pipeRows = [];
for (const c of results) {
  const k = cmp.get(c.key);
  const ratio = k?.labourRatio ?? 1;
  const eci = k?.eci ?? 1;
  const inp = inputs.get(c.key);
  // A line: the contract's items of one type, pipe and band (pressure: one band); its run length the items' mean.
  const lineKey = (it) => `${it.type}|${it.entry}|${it.nominal}|${it.type === "sanitary" || it.type === "storm" ? bandOf(it.depth) : "p"}`;
  const lines = new Map();
  for (const it of c.items) if (it.ours != null) lines.set(lineKey(it), [...(lines.get(lineKey(it)) ?? []), it.qty]);
  c.items.forEach((it, i) => {
    const tr = tabRow(c.key, it);
    const base = { key: c.key, i, type: it.type, entry: it.entry, nominal: Number(it.nominal), depth: it.depth, qty: it.qty, restrained: Boolean(it.restrainedPct), allowance: inp?.items[i]?.allowance !== false, desc: tr?.desc ?? null };
    if (it.ours == null || it.median == null) {
      pipeRows.push({ ...base, note: "not priced (no catalog size)", tabMedian: it.median, bidEsc: it.median == null ? null : it.median * eci });
      return;
    }
    const lab = it.labPerLF * ratio;
    const eq = it.eqPerLF;
    const role = it.byRole ?? {};
    const pipeMat = role.utility_pipe?.mat ?? 0;
    const bed = role.utility_bedding_pipe_zone?.mat ?? 0;
    const back = role.utility_backfill?.mat ?? 0;
    // Add-ons on the pipe line, at the library price x the location factor (rolls per LF): sanitary CCTV; water tracer,
    // tape, test and disinfection; restraint sets one a 20 ft joint (C900), never on storm.
    const L = (k2) => (lib.mat[k2]?.price ?? 0) * MATERIAL_LOCATION;
    let addons = 0;
    if (it.type === "sanitary") addons = L("addon:cctv");
    if (it.type === "water") addons = L("addon:test_disinfect") + L("tracer_wire") / 500 + L("warning_tape") / 1000;
    let restraint = 0;
    if (it.restrainedPct) restraint = (Math.ceil(it.qty / 20) * L(`restraint_joint:pvc_c900:${it.nominal}`)) / it.qty;
    const allowancePct = it.type === "water" ? (inp?.items[i]?.allowance === false ? 0 : 0.2) : 0.05;
    const pipeAndAllowance = Math.max(0, pipeMat - addons - restraint);
    const pipeOnly = pipeAndAllowance / (1 + allowancePct);
    const ours = lab + eq + it.matPerLF + (it.dispPerLF ?? 0);
    const bidEsc = it.median * eci;
    const allMedian = tr && tr.prices.length > 0 ? median(tr.prices) : null;
    const lineLfs = lines.get(lineKey(it));
    const lineRunLf = lineLfs.reduce((t, x) => t + x, 0) / lineLfs.length;
    const prod = production(it, lineRunLf);
    // What the median bid leaves for labour and equipment once our material is taken at cost (the band's 15 % markup).
    const needLE = bidEsc / MARKUP - it.matPerLF - (it.dispPerLF ?? 0);
    pipeRows.push({
      ...base,
      ratio,
      eci,
      tabMedian: it.median,
      bidEsc,
      tabMedianAll: allMedian,
      biddersAll: tr?.prices.length ?? null,
      bidEscAll: allMedian == null ? null : allMedian * eci,
      ours,
      lab,
      eq,
      pipe: pipeOnly,
      fittingsAllowance: pipeAndAllowance - pipeOnly,
      addons,
      restraint,
      bedding: bed,
      backfill: back,
      disposal: it.dispPerLF ?? 0,
      material: it.matPerLF,
      gapPct: (ours / bidEsc - 1) * 100,
      gapUsd: (ours - bidEsc) * it.qty,
      band: ours < bidEsc / MARKUP ? "under" : ours > bidEsc ? "over" : "in",
      lineRunLf,
      crewActivity: prod.act,
      crew: prod.crew,
      baseRate: prod.base,
      pace: prod.pace,
      lfPerDay: prod.rate,
      lePerLf: lab + eq,
      needLePerLf: needLE,
      impliedLfPerDay: needLE > 0 ? (prod.rate * (lab + eq)) / needLE : null,
    });
  });
}
function bandOf(d) {
  const R = [0, 6, 8, 10, 12, 14, 16];
  let i = R.findIndex((r, k) => d - 0.0001 >= r && d - 0.0001 < (R[k + 1] ?? Infinity));
  return i < 0 ? "16+" : `${R[i]}-${R[i + 1] ?? "+"}`;
}

// ---------- Non-LF appurtenance items ----------
const ADJ = /^(ADJUST|REMOVE AND OFFSITE|REMOVE & |REMOVE AND DISPOSE OF EXISTING GATE)|TRAFFIC BUTTON|REFLECTORIZED|BLUE BUTTONS/;
function classify(i) {
  if (i.unit === "LF") return null;
  const d = i.desc.toUpperCase().replace(/[“”″]/g, '"');
  if (ADJ.test(d)) return null;
  if (/FITTING/.test(d) && i.unit === "TON") return "di_fittings_ton";
  if (/TAPPING SLEEVE|TS&V/.test(d)) return "tapping_sleeve_valve";
  if (/SERVICE LEAD/.test(d) && /PVC/.test(d) && i.unit === "EA") return "sanitary_service";
  if (/WET CONNECTION|RELOCATE EXISTING .*HYDRANT.*CONNECT/.test(d)) return "wet_connection";
  if (/AUTO ?FLUSH|AUTOMATIC FLUSHING/.test(d)) return "autoflusher";
  if (/FLUSHING VALVE UNIT/.test(d)) return "flushing_valve";
  if (/HYDRANT/.test(d)) return "hydrant";
  if (/PLUG (&|AND) CLAMP|BLOW[- ]?OFF/.test(d)) return "plug_blowoff";
  if (/PLUG/.test(d) && /SANITARY|SEWER|BRICK/.test(d) && !/CONNECT/.test(d)) return "sewer_plug";
  if (/SERVICE/.test(d) && /WATER|CTS|COPPER|METER/.test(d) && i.unit === "EA") return "water_service";
  if (/BUTTERFLY/.test(d)) return "butterfly_valve";
  if (/GATE VALVE|VALVE (&|AND|WITH) BOX/.test(d)) return "valve";
  return null;
}
const SIZE = (d) => Number((d.toUpperCase().replace(/[“”″]/g, '"').match(/(\d{1,2})\s*"/) ?? [])[1] ?? NaN);
// The water-set spread (api D-993): valves at 4 a day (A64), hydrants at 2.5 a day (A65), one crew (pipelayer, laborer,
// the 30 t excavator's operator) and one mobilization of the 30 t for the contract's sets; half a day at least.
const WAGE = { pipelayer: 35, laborer: 34.04, excavator: 48.96 }; // open shop, Harris (wd5-wage-core), burdened $/h
const DAY_H = 10;
const DIESEL = 5.903; // EIA Gulf Coast, the library's fuel row
const EX30 = { day: 1424, week: 4019, gph: 4.5, mobOneWay: 1800 };
// DI MJ fittings by the ton: the library's per-each prices over approximate AWWA C153 compact weights (lb), grade D.
const C153 = [["bend:ductile_iron:90:8", 60], ["bend:ductile_iron:45:8", 50], ["bend:ductile_iron:22.5:8", 47], ["bend:ductile_iron:11.25:8", 45], ["tee:ductile_iron:8x8", 92], ["tee:ductile_iron:8x6", 80], ["bend:ductile_iron:90:12", 116], ["bend:ductile_iron:45:12", 94], ["tee:ductile_iron:12x8", 150], ["bend:ductile_iron:90:6", 41], ["bend:ductile_iron:45:6", 34], ["tee:ductile_iron:6x6", 62]];
const perTon = (() => {
  const usd = C153.reduce((t, [k2]) => t + (lib.mat[k2]?.price ?? 0), 0);
  const lb = C153.reduce((t, [, w]) => t + w, 0);
  return (usd / lb) * 2000;
})();

function partsFor(cat, d) {
  const n = SIZE(d);
  if (cat === "valve") return { parts: [[`valve:gate:${n}`, 1], ["valve:box", 1]], crew: "A64" };
  if (cat === "hydrant" || cat === "flushing_valve")
    // The engine's hydrant assembly (structureTypes.ts assemblyParts): hydrant, 6 in gate valve and box, 20 LF 6 in C900
    // lead, the 8 x 6 tee, 3 restraint sets, a ton of drain stone. A Houston flushing valve unit is the same assembly
    // (its items name the tee, the 6 in valve and box and the lead; two name a hydrant).
    return { parts: [["hydrant:assembly", 1], ["valve:gate:6", 1], ["valve:box", 1], ["pipe:pvc_c900_dr18:6", 20], ["tee:ductile_iron:8x6", 1], ["restraint:pvc_c900:6", 3], ["stone:_57_stone", 1]], crew: "A65" };
  if (cat === "di_fittings_ton") return { parts: [["(DI fittings, $/ton from per-each prices)", 1]], crew: null, perTon: true };
  return null;
}
const WHY = {
  tapping_sleeve_valve: "no tapping sleeve key (the valve and box are priced: valve:gate:N, valve:box); no tapping crew or tap labour",
  wet_connection: "no wet connection / cut-in key: fittings, adapters, plug and clamp removal and the shutdown labour are not in the library",
  plug_blowoff: "no plug and clamp key and no 2 in blow-off valve key (valve:gate starts at 4 in)",
  water_service: "only the tap is keyed (tap:water:N, saddle + corp); no meter box, curb stop or meter setter key, and the service length (short / long side) is not on the tab",
  sanitary_service: "the wye (wye:sewer:6) and 6 in pipe are keyed, but the stack, riser, drop, plug, marker and CSS backfill are not, and the lead's length is not on the tab",
  sewer_plug: "no sewer or brick plug key",
  autoflusher: "no automatic flushing device key",
  butterfly_valve: "no butterfly valve key (valve:butterfly:N is read by the engine but not priced in the library)",
};

const nonLf = [];
for (const [key, tp] of tabPrices) {
  const k = cmp.get(key);
  const ratio = k?.labourRatio ?? 1;
  const eci = k?.eci ?? 1;
  const its = tp.items.map((i) => ({ i, cat: classify(i) })).filter((x) => x.cat);
  // The contract's water-set spread.
  const valves = its.filter((x) => x.cat === "valve" && partsFor("valve", x.i.desc)).reduce((t, x) => t + x.i.qty, 0);
  const hyd = its.filter((x) => x.cat === "hydrant" || x.cat === "flushing_valve").reduce((t, x) => t + x.i.qty, 0);
  const days = Math.max(0.5, valves / 4 + hyd / 2.5);
  const crewDay = (WAGE.pipelayer + WAGE.laborer + WAGE.excavator) * DAY_H * ratio;
  const rent = Math.min(EX30.day * Math.ceil(days), EX30.week * Math.ceil(days / 5));
  const eqTotal = rent + EX30.gph * DAY_H * DIESEL * days + 2 * EX30.mobOneWay;
  for (const { i, cat } of its) {
    const tabMed = median(i.prices);
    // An extra or as-directed item (fittings by the ton above all) is a contingency the bidders often price at a token
    // figure: it is listed, and kept out of the group's gap.
    const contingency = /\bEXTRA\b|ADDITIONAL|AS DIRECTED|DIRECTION OF THE ENGINEER/i.test(i.desc);
    const row = { key, no: i.no, page: i.page, unit: i.unit, qty: i.qty, desc: i.desc, category: cat, contingency, bidders: i.prices.length, tabMedian: tabMed, bidEsc: tabMed == null ? null : tabMed * eci, eci, ratio };
    const p = partsFor(cat, i.desc);
    let missing = [];
    if (p && !p.perTon) missing = p.parts.filter(([k2]) => !(lib.mat[k2]?.price > 0)).map(([k2]) => k2);
    if (!p || missing.length) {
      nonLf.push({ ...row, priced: false, keys: p ? p.parts.map(([k2, q]) => `${k2} x${q}`) : [], why: p ? `no price for ${missing.join(", ")}` : WHY[cat] ?? "no mapping" });
      continue;
    }
    let mat;
    let lab = 0;
    let eq = 0;
    if (p.perTon) {
      mat = perTon * MATERIAL_LOCATION;
    } else {
      mat = p.parts.reduce((t, [k2, q]) => t + (lib.mat[k2]?.price ?? 0) * q, 0) * MATERIAL_LOCATION;
      const dayShare = (p.crew === "A64" ? 1 / 4 : 1 / 2.5) / (valves / 4 + hyd / 2.5);
      const each = days * dayShare; // this item's days a unit, the spread's half-day floor spread by hours
      lab = crewDay * each;
      eq = eqTotal * dayShare;
    }
    const ours = mat + lab + eq;
    nonLf.push({ ...row, priced: true, keys: p.perTon ? ["bend:ductile_iron:* and tee:ductile_iron:* over AWWA C153 compact weights (D)"] : p.parts.map(([k2, q]) => `${k2} x${q}`), crewActivity: p.crew, ours, mat, lab, eq, gapPct: tabMed == null ? null : (ours / row.bidEsc - 1) * 100, gapUsd: tabMed == null ? null : (ours - row.bidEsc) * i.qty });
  }
}

// ---------- Contract totals ----------
const contracts = [];
for (const c of results) {
  const tp = tabPrices.get(c.key);
  const k = cmp.get(c.key);
  const eci = k?.eci ?? 1;
  const pipe = pipeRows.filter((r) => r.key === c.key && r.ours != null);
  const nl = nonLf.filter((r) => r.key === c.key);
  const nlP = nl.filter((r) => r.priced && r.bidEsc != null && !r.contingency);
  // The whole tab: the median bidder's base bid where the text gives each bidder's total, else the sum of every
  // item's median (escalated either way).
  const sumMedians = (tp?.items ?? []).reduce((t, i) => t + (median(i.prices) ?? 0) * i.qty, 0) * eci;
  // (Only when every bidder's total was read: a tab whose base bid is split into parts gives fewer, or more.)
  const baseMedian = tp?.baseTotals?.length === tp?.bidders ? median(tp.baseTotals) * eci : null;
  const sum = (rs, f) => rs.reduce((t, r) => t + f(r), 0);
  contracts.push({
    key: c.key,
    date: k?.date,
    eci,
    ratio: k?.labourRatio,
    bidders: tp?.bidders,
    tabTotal: baseMedian ?? sumMedians,
    tabTotalBasis: baseMedian ? "median bidder's base bid" : "sum of item medians",
    sumItemMedians: sumMedians,
    pipeTab: sum(pipe, (r) => r.bidEsc * r.qty),
    pipeOurs: sum(pipe, (r) => r.ours * r.qty),
    pipeTabAll: sum(pipe, (r) => (r.bidEscAll ?? r.bidEsc) * r.qty),
    nonLfTabAll: sum(nl.filter((r) => r.bidEsc != null), (r) => r.bidEsc * r.qty),
    nonLfTabPriced: sum(nlP, (r) => r.bidEsc * r.qty),
    nonLfOurs: sum(nlP, (r) => r.ours * r.qty),
    nonLfUnpricedTab: sum(nl.filter((r) => !r.priced && r.bidEsc != null && !r.contingency), (r) => r.bidEsc * r.qty),
    nonLfContingencyTab: sum(nl.filter((r) => r.contingency && r.bidEsc != null), (r) => r.bidEsc * r.qty),
    nonLfItems: nl.length,
    nonLfPriced: nlP.length,
  });
}

writeFileSync(`${outPrefix}-pipe-items.json`, JSON.stringify(pipeRows, null, 1));
writeFileSync(`${outPrefix}-nonlf-items.json`, JSON.stringify(nonLf, null, 1));
writeFileSync(`${outPrefix}-contracts.json`, JSON.stringify(contracts, null, 1));
const csv = (rows, cols) => [cols.join(","), ...rows.map((r) => cols.map((c2) => (typeof r[c2] === "number" ? r2(r[c2]) : JSON.stringify(r[c2] ?? ""))).join(","))].join("\n");
writeFileSync(`${outPrefix}-pipe-items.csv`, csv(pipeRows, ["key", "type", "entry", "nominal", "depth", "qty", "restrained", "allowance", "lineRunLf", "crewActivity", "crew", "baseRate", "pace", "lfPerDay", "lab", "eq", "pipe", "fittingsAllowance", "addons", "restraint", "bedding", "disposal", "ours", "tabMedian", "bidEsc", "tabMedianAll", "biddersAll", "bidEscAll", "gapPct", "gapUsd", "band", "needLePerLf", "impliedLfPerDay", "desc", "note"]));
writeFileSync(`${outPrefix}-nonlf-items.csv`, csv(nonLf, ["key", "no", "unit", "qty", "category", "priced", "bidders", "tabMedian", "bidEsc", "ours", "mat", "lab", "eq", "gapPct", "gapUsd", "contingency", "keys", "why", "desc"]));
console.log(`pipe rows ${pipeRows.length}, non-LF rows ${nonLf.length} (priced ${nonLf.filter((r) => r.priced).length}), DI fittings $/ton ${perTon.toFixed(0)}`);

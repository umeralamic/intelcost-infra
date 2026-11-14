// D-1274 tables: reads overpricing.mjs's per-item split and writes the group tables (markdown), a CSV and a summary JSON.
// No tab figure lives here.
//
//   node bidtabs/overpricing-report.mjs "<out prefix>"     (reads <out prefix>-items.json)

import { readFileSync, writeFileSync } from "node:fs";

const [, , prefix] = process.argv;
const { rows: all, mob, healthy } = JSON.parse(readFileSync(`${prefix}-items.json`, "utf8"));
const basis = JSON.parse(readFileSync(`${prefix.replace(/[^/\\]+$/, "")}why-we-bid-low-2026-11-16-basis-items.json`, "utf8"));
const recentKeys = new Set(basis.filter((b) => b.recent).map((b) => b.key));
const rows = all.filter((r) => recentKeys.has(r.key));

const inScope = (r) => r.type === "water" || (r.type === "storm" && r.nominal >= 15 && r.nominal <= 36);
const defaultPreset = (r) => (r.type === "water" ? "c605_t4_house" : r.entry.startsWith("rcp") ? "c1479_t2" : r.entry.startsWith("hdpe_f2648") ? "d2321" : null);
const presetSave = (r, p) => (p && r.presets[p] ? r.mBed - r.presets[p].mat : 0);

// Per item, $ for the item (per LF × LF).
function dollars(r) {
  const q = r.qty;
  const levB = presetSave(r, defaultPreset(r));
  const levBpure = r.type === "water" ? presetSave(r, "c605_t4") : levB;
  const levI = r.priceVsLow != null ? r.priceVsLow : 0;
  const levIhigh = r.priceVsHigh != null ? r.priceVsHigh : 0;
  // The tier's uplift carried through waste, rounding and the allowance (as the line buys it).
  const levTier = r.tierUplift * ((r.wasteRound + r.bulk + r.tierUplift) / Math.max(1e-9, r.bulk + r.tierUplift)) * (1 + r.allowancePct);
  const levEq = Math.max(0, r.E - r.eqFloorPerLf);
  return {
    qty: q, direct: r.direct * q, bid: r.bid * q, low: r.low * q, median: r.median * q, L: r.L * q, E: r.E * q, M: r.M * q,
    target: r.healthyTarget * q, gapMed: r.gapMedian * q, gapLow: r.gapLow * q,
    pipeBulk: r.bulk * q, tier: r.tierUplift * q, wasteRound: r.wasteRound * q, allowance: r.allowance * q, addons: r.addonSum * q, other: r.other * q, bedding: r.mBed * q,
    addTest: (r.addons.testDisinfect ?? 0) * q, addTracerTape: ((r.addons.tracer ?? 0) + (r.addons.tape ?? 0)) * q, addRestraint: (r.addons.restraint ?? 0) * q, addGasket: (r.addons.gasket ?? 0) * q, addOther: ((r.addons.cctv ?? 0) + (r.addons.polyWrap ?? 0)) * q,
    levB: levB * q, levBpure: levBpure * q, levI: levI * q, levIpos: Math.max(0, levI) * q, levIhigh: levIhigh * q, levTier: levTier * q, levEq: levEq * q,
    eqFloor: r.eqFloorPerLf * q, lfDays: q / r.lfPerDay, legCy: r.section.cy * q, presetCy: (r.presets[defaultPreset(r)]?.cy ?? r.section.cy) * q, pureCy: (r.presets.c605_t4?.cy ?? r.presets[defaultPreset(r)]?.cy ?? r.section.cy) * q,
    legExc: r.section.excCy * q, presetExc: (r.presets[defaultPreset(r)]?.excCy ?? r.section.excCy) * q,
  };
}
const sum = (rs) => rs.reduce((t, r) => { const d = dollars(r); for (const k of Object.keys(d)) t[k] = (t[k] ?? 0) + d[k]; t.n = (t.n ?? 0) + 1; return t; }, {});
const $ = (x) => (x == null ? "–" : `${x < 0 ? "−" : ""}$${Math.abs(Math.round(x)).toLocaleString("en-US")}`);
const pc = (x, d = 1) => (x == null || !Number.isFinite(x) ? "–" : `${x < 0 ? "−" : ""}${Math.abs(x * 100).toFixed(d)} %`);
const lf = (x) => Math.round(x).toLocaleString("en-US");
const f2 = (x) => (x == null ? "–" : x.toFixed(2));
const f3 = (x) => (x == null ? "–" : x.toFixed(3));
const table = (head, body) => [`| ${head.join(" | ")} |`, `|${head.map((h, i) => (i === 0 ? "---" : "---:")).join("|")}|`, ...body.map((b) => `| ${b.join(" | ")} |`)].join("\n");

const groupOf = (r) => {
  if (r.type === "water") return `water ${r.entry.replace("pvc_c900_", "C900 ").replace("di_c151_pc350", "DI PC350").replace("hdpe_ips_dr11", "HDPE DR11")} ${r.nominal}"`;
  if (r.type === "storm") return `storm ${r.entry.startsWith("rcp") ? "RCP" : "HDPE"} ${r.nominal}"`;
  return `${r.type}`;
};
const groups = (rs, fn) => { const m = new Map(); for (const r of rs) m.set(fn(r), [...(m.get(fn(r)) ?? []), r]); return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true })); };
const out = [];
const scoped = rows.filter(inScope);

// T1: the gap and its split, by kind and size (in scope).
const t1 = (label, rs) => {
  const s = sum(rs);
  const res = s.gapMed - s.levB - s.levIpos - s.levTier - s.levEq;
  return [label, s.n, lf(s.qty), $(s.direct), $(s.median), pc(s.direct / s.median), $(s.gapMed), pc(s.gapMed / s.direct), $(s.gapLow), $(s.levB), $(s.levBpure), $(s.levI), $(s.levIpos), $(s.levTier), $(s.levEq), $(res), pc(res / s.gapMed)];
};
const kindRows = [...groups(scoped, (r) => (r.type === "water" ? "water" : "storm 15–36\"")).map(([k, rs]) => t1(`**${k}**`, rs)), t1("**in scope**", scoped)];
out.push("### T1. The gap to a healthy direct and what explains it, by kind (recent tabs, $ over the items)\n");
out.push(`Healthy direct = median ÷ ${healthy.mid} (the founder's 1.20–1.35 band, middle). Gap to the item lows = our direct − the direct at which our overlay bid equals each item's lowest unit price (stricter than the low bidder's total, T6). Levers, each a reduction of our direct: (b) the section under the default preset (water: C605 T4 house, 12 in over the crown; RCP: C1479 T2; HDPE: D2321); material (i) our pipe price down to the public evidence's low end where it is above it (0 where ours is already under it); (ii) the order tier up to Bulk; (a) the equipment spread above its rental floor (4-week rates, 10 h day, fuel; no mobilization or minimum). Residual = gap − levers: what production and crew would have to explain, or what stays unexplained.\n`);
out.push(table(["Group", "Items", "LF", "Our direct", "Median", "Direct ÷ median", "Gap to healthy", "Gap ÷ direct", "Gap to the item lows", "(b) section", "(b) water pure T4 (alt.)", "(i) price, signed", "(i) price", "(ii) tier", "(a) eq. overhead", "Residual", "Residual ÷ gap"], kindRows));
out.push("\n### T2. By kind and size\n");
out.push(table(["Group", "Items", "LF", "Our direct", "Median", "Direct ÷ median", "Gap to healthy", "Gap ÷ direct", "Gap to the item lows", "(b) section", "(b) water pure T4 (alt.)", "(i) price, signed", "(i) price", "(ii) tier", "(a) eq. overhead", "Residual", "Residual ÷ gap"], groups(scoped, groupOf).map(([k, rs]) => t1(k, rs))));

// T3: the (b) re-cut, per LF, by size: legacy / presets.
out.push("\n### T3. (b) re-cut under Part 6's presets (per LF; engine section math, bell out of the embedment for the presets)\n");
out.push("Labour and equipment per LF do not move with the section in today's engine (the pipe crew's production is by run length, size and depth, never by volume), so the L and E columns are $0.00 under every preset. Excavation CY/LF moves only through the width (shown); native backfill is unpriced.\n");
const t3 = [];
for (const [k, rs] of groups(scoped, groupOf)) {
  const r = rs.reduce((a, b) => (b.qty > a.qty ? b : a));
  const leg = r.section;
  const cells = (name, s, mat) => [k, name, f2(s.W * 12), f3(s.cy), s.layers.map((l) => `${l.name} ${f3(l.cy)}`).join("; "), `$${f2(mat)}`, `${mat - leg.mat <= 0 ? "−" : "+"}$${f2(Math.abs(mat - leg.mat))}`, "$0.00", "$0.00", f3(s.excCy)];
  t3.push(cells("legacy (today)", leg, leg.mat));
  for (const [p, s] of Object.entries(r.presets)) t3.push(cells(p === "c605_t4_house" ? "C605 T4, house: 12 in over crown" : p === "c605_t4" ? "C605 T4 (to the top of the pipe)" : p === "c1479_t2" ? "C1479 Type 2" : p === "sand_12" ? "variant: today's section, bank sand bedding (no #57)" : "D2321", s, s.mat));
}
out.push(table(["Pipe", "Section", "Bottom W in", "Imported CY/LF", "Layers CY/LF", "Material $/LF", "Δ material", "Δ labour", "Δ equipment", "Excavation CY/LF"], t3));

// T4: material split, all recent kinds.
out.push("\n### T4. Material split, every recent item (all kinds; $ over the items)\n");
out.push("Pipe at bulk = library price × location factor. (ii) tier = the order-size factor over bulk (api `materials/tiers.py`); waste and joint rounding; the fittings allowance (20 % pressure, 5 % gravity of the pipe line). (iii) add-ons. Bedding and zone = the bedding/pipe-zone line. Other = the pipe line's material the model leaves (restrained DR 14 fittings and the like).\n");
const t4 = (label, rs) => { const s = sum(rs); return [label, s.n, lf(s.qty), $(s.M), pc(s.M / s.direct), pc(s.M / s.median), $(s.pipeBulk), $(s.tier), $(s.wasteRound), $(s.allowance), $(s.addTest), $(s.addTracerTape), $(s.addRestraint), $(s.addGasket), $(s.addOther), $(s.bedding), $(s.other), $(s.levIpos), $(s.levIhigh)]; };
out.push(table(["Group", "Items", "LF", "Material", "÷ direct", "÷ median", "Pipe at bulk", "(ii) tier", "(ii) waste + rounding", "(ii) allowance", "(iii) test & disinf.", "(iii) tracer + tape", "(iii) restraint", "(iii) gasket", "(iii) CCTV, poly", "(ii) bedding + zone", "Other", "(i) over evidence low", "(i) over evidence high"], [...groups(rows, (r) => r.type).map(([k, rs]) => t4(k, rs)), ...groups(scoped, groupOf).map(([k, rs]) => t4(k, rs)), t4("**all recent**", rows)]));

// T7 (printed before T5): what the tabs leave for the pipe.
const t7 = groups(scoped, groupOf).map(([k, rs]) => {
  const s = sum(rs);
  const r0 = rs.reduce((a, b) => (b.qty > a.qty ? b : a));
  const bedPreset = s.bedding - s.levB;
  const left = s.target - s.L - s.E - bedPreset - s.addons;
  const oursPipe = s.pipeBulk + s.tier + s.wasteRound + s.allowance;
  const k2 = (1 + r0.allowancePct) * (1 + r0.wasteRound / Math.max(1e-9, r0.bulk + r0.tierUplift));
  const ev = r0.evidence;
  return [k, lf(s.qty), f2(s.target / s.qty), f2((s.L + s.E) / s.qty), f2(bedPreset / s.qty), f2(s.addons / s.qty), f2(left / s.qty), f2(oursPipe / s.qty), f2(left / s.qty / k2 / 0.98737), f2(r0.pipePrice), r0.pipeGrade ?? "–", ev ? `${f2(ev.low)}–${f2(ev.high)} (${ev.grade})` : "none"];
});
out.push("\n### T7. What the tabs leave for the pipe (per LF): healthy direct − our L+E − our bedding under the default preset − our add-ons, against our pipe line and the evidence\n");
out.push("Implied pipe $/LF at the yard = the pipe and fittings budget left ÷ (1 + allowance) ÷ waste ÷ the location factor, to compare with a supplier's price. With our own labour and equipment held, a small or negative figure means the tab cannot be reached on material alone.\n");
out.push(table(["Group", "LF", "Healthy direct", "Our L+E", "Bedding (default preset)", "Add-ons", "Left for pipe + fittings", "Ours: pipe + tier + waste + allowance", "Implied pipe $/LF at the yard", "Library $/LF", "Grade", "Evidence $/LF"], t7));

// T5: production and the equipment spread.
out.push("\n### T5. (a) Production, crew-day and the equipment spread (recent, in scope)\n");
const t5 = groups(scoped, groupOf).map(([k, rs]) => {
  const s = sum(rs);
  const days = s.lfDays;
  const res = s.gapMed - s.levB - s.levIpos - s.levTier - s.levEq;
  const le = s.L + s.E;
  const floorLe = s.L + s.eqFloor;
  const need = floorLe - Math.max(0, res);
  const rate = s.qty / days;
  return [k, lf(s.qty), f2(days), Math.round(rate), $(s.L / days), $(s.E / days), $(s.eqFloor / days), $((s.L + s.E) / s.qty).replace("$", "$") + "/LF", f2(s.L / s.qty), f2(s.E / s.qty), f2(s.eqFloor / s.qty), $(Math.max(0, res)), need > 0 ? Math.round((rate * floorLe) / need) : "n/a"];
});
out.push(table(["Group", "LF", "Crew-days", "LF/day (LF-weighted)", "Labour $/day", "Equipment $/day", "Equipment floor $/day", "L+E $/LF", "L $/LF", "E $/LF", "E floor $/LF", "Residual for (a)", "LF/day that would close it"], t5));
out.push(`\nSpread fixed cost, fitted (equipment $ = a × crew-days + fixed, least squares over the contracts' spreads, all 16 tabs): A18 water ${$(mob.A18.perDay)}/day + ${$(mob.A18.fixed)} a spread; A32 storm ${$(mob.A32.perDay)}/day + ${$(mob.A32.fixed)}; A28 sewer ${$(mob.A28.perDay)}/day + ${$(mob.A28.fixed)} (the A28 intercept is not meaningful: sewer spreads mix depth paces).`);

// T6: bids and the fitted multiplier, before and after the levers (per contract, recent): each contract's low and median
// are Part 1's bidder totals (why-we-bid-low-2026-11-16-basis-contracts.json, with the added items), not sums of item lows.
const fit = (pairs) => Math.exp(pairs.reduce((t, [a, b]) => t + Math.log(a / b), 0) / pairs.length);
const contracts = JSON.parse(readFileSync(`${prefix.replace(/[^/\\]+$/, "")}why-we-bid-low-2026-11-16-basis-contracts.json`, "utf8")).withAdded.filter((c) => c.recent);
const byKey = new Map(groups(rows, (r) => r.key));
// (a) proposals, each $/LF of direct saved on an in-scope item (on the floor equipment where A1 also applies):
//   A1 the equipment spread at its rental floor (levEq);
//   A2 RCP 30–36 in: the large-pipe pace 0.68 -> 0.85 (labour and the floor equipment scale with 1/production);
//   A3 water lines of 1,000 LF and more (mean run): 400 / 420 -> 500 LF a day before the size pace.
const A2 = (r) => (r.type === "storm" && r.entry.startsWith("rcp") && r.nominal >= 30 && r.nominal <= 36 ? (r.L + Math.min(r.E, r.eqFloorPerLf)) * (1 - 0.68 / 0.85) : 0);
const A3 = (r) => { if (r.type !== "water" || r.run < 1000) return 0; const base = r.run >= 2500 ? 420 : 400; return (r.L + Math.min(r.E, r.eqFloorPerLf)) * (1 - base / 500); };
const lever = (r, w) => {
  if (!inScope(r)) return 0;
  const d = dollars(r);
  let t = 0;
  for (const k of w) t += k === "A2" ? A2(r) * r.qty : k === "A3" ? A3(r) * r.qty : k === "levBpureSwap" ? d.levBpure - d.levB : d[k];
  return t;
};
const scen = [
  ["today (Part 1)", []],
  ["(b) section, default presets (water C605 T4 house)", ["levB"]],
  ["(b) with water on pure C605 T4", ["levB", "levBpureSwap"]],
  ["(b) house + (i) C900 at the evidence low", ["levB", "levIpos"]],
  ["(b) house + (i) + (ii) Bulk tier", ["levB", "levIpos", "levTier"]],
  ["… + A1 equipment spread at its rental floor", ["levB", "levIpos", "levTier", "levEq"]],
  ["… + A2 RCP 30–36 in pace 0.85", ["levB", "levIpos", "levTier", "levEq", "A2"]],
  ["… + A3 long water runs 500 LF/day", ["levB", "levIpos", "levTier", "levEq", "A2", "A3"]],
  ["(a) alone: A1 + A2 + A3, no (b) or material", ["levEq", "A2", "A3"]],
];
const kOf = {};
const perC = {};
for (const [name, w] of scen) {
  const pts = contracts.map((c) => { const lev = (byKey.get(c.key) ?? []).reduce((t, r) => t + lever(r, w), 0); const direct = c.direct - lev; return { key: c.key, low: c.low, median: c.median, direct, lev, bid: c.bid * (direct / c.direct) }; });
  perC[name] = pts;
  kOf[name] = { low: fit(pts.map((p) => [p.low, p.direct])), median: fit(pts.map((p) => [p.median, p.direct])), bidVsLow: pts.reduce((t, p) => t + p.bid, 0) / pts.reduce((t, p) => t + p.low, 0) - 1, bidVsMedian: pts.reduce((t, p) => t + p.bid, 0) / pts.reduce((t, p) => t + p.median, 0) - 1, saved: pts.reduce((t, p) => t + p.lev, 0), lowsWon: pts.filter((p) => p.bid < p.low).length, underMedian: pts.filter((p) => p.bid < p.median).length };
}
out.push("\n### T6. Our overlay bid against the low and the median, and the fitted multiplier, today and with the levers (10 recent contracts, every item, the bidders' totals; levers on the in-scope items only)\n");
out.push(table(["Scenario", "Direct saved", "k to the lows", "k to the medians", "Our bid vs lows", "Our bid vs medians", "Contracts we would be low on", "Bid under the median"], scen.map(([n]) => { const k = kOf[n]; return [n, $(k.saved), f3(k.low), f3(k.median), pc(k.bidVsLow), pc(k.bidVsMedian), k.lowsWon, k.underMedian]; })));
out.push(`\nHealthy: k to the medians ${healthy.low}–${healthy.high} (direct ≈ 75–83 % of the median).`);
out.push("\n#### T6b. Per contract: today, and the levers' $ (in-scope items)\n");
const last = scen[7][0];
out.push(table(["Contract", "Bidders", "Our rank today", "Our direct", "Our bid", "Low", "Median", "Bid vs low", "Bid vs median", "(b) house", "(b) pure T4 swap", "(i)+(ii)", "A1", "A2", "A3", "Bid vs low, all levers", "Bid vs median, all levers"], contracts.map((c) => {
  const rs = byKey.get(c.key) ?? [];
  const L = (w) => rs.reduce((t, r) => t + lever(r, w), 0);
  const p = perC[last].find((x) => x.key === c.key);
  return [c.key, c.bidders, `${c.rank} of ${c.bidders + 1}`, $(c.direct), $(c.bid), $(c.low), $(c.median), pc(c.bid / c.low - 1), pc(c.bid / c.median - 1), $(L(["levB"])), $(L(["levBpureSwap"])), $(L(["levIpos", "levTier"])), $(L(["levEq"])), $(L(["A2"])), $(L(["A3"])), pc(p.bid / p.low - 1), pc(p.bid / p.median - 1)];
})));

writeFileSync(`${prefix}-tables.md`, out.join("\n") + "\n");
const csvCols = ["key", "type", "entry", "nominal", "depth", "qty", "bidders", "low", "median", "rank", "L", "E", "M", "direct", "bid", "healthyTarget", "gapMedian", "gapLow", "act", "tier", "lfPerDay", "labDay", "eqDay", "eqFloorDay", "eqOverPerLf", "pipePrice", "pipeGrade", "bulk", "tierFactor", "tierUplift", "wasteRound", "allowancePct", "allowance", "addonSum", "other", "mBed", "priceVsLow", "priceVsHigh"];
const csvRows = all.map((r) => [...csvCols.map((c) => r[c]), r.section.cy, r.presets.c605_t4_house?.cy, r.presets.c605_t4_house?.mat, r.presets.c605_t4?.cy, r.presets.c605_t4?.mat, r.presets.c1479_t2?.cy, r.presets.c1479_t2?.mat, r.presets.d2321?.cy, r.presets.d2321?.mat, recentKeys.has(r.key) ? "recent" : "history"]);
writeFileSync(`${prefix}-items.csv`, [[...csvCols, "legacyCyPerLf", "houseCy", "houseMat", "pureT4Cy", "pureT4Mat", "c1479Cy", "c1479Mat", "d2321Cy", "d2321Mat", "set"].join(","), ...csvRows.map((r) => r.map((x) => (typeof x === "number" ? Math.round(x * 10000) / 10000 : x == null ? "" : JSON.stringify(x))).join(","))].join("\n") + "\n");
const summary = { healthy, scenarios: kOf, kinds: Object.fromEntries(groups(scoped, (r) => r.type).map(([k, rs]) => [k, sum(rs)])), groups: Object.fromEntries(groups(scoped, groupOf).map(([k, rs]) => [k, sum(rs)])), materialByKind: Object.fromEntries(groups(rows, (r) => r.type).map(([k, rs]) => [k, sum(rs)])), allRecent: sum(rows), mob: { A18: { perDay: mob.A18.perDay, fixed: mob.A18.fixed }, A32: { perDay: mob.A32.perDay, fixed: mob.A32.fixed }, A28: { perDay: mob.A28.perDay, fixed: mob.A28.fixed } } };
writeFileSync(`${prefix}-summary.json`, JSON.stringify(summary, null, 1));
console.log(out.join("\n"));

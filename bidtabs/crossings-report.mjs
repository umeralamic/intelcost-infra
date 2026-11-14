// The crossing pay items priced with D-1269 as their own group (D-1277; Part 5 of the 2026-11-15 night run). No bid
// figure lives here: the input (the tab items mapped to crossings, the choices), the runner's results and every output
// are in docs/reference (outside git); every percentage comes from the overlay config (bid-overlay-d1273.json).
//
//   node bidtabs/crossings-report.mjs ct "<Bid tabs dir>" "<crossings input>"
//       the runner's contract list (JSON on stdout): one contract per tab with its crossings, then the sensitivity
//       contracts: `<key>~pits` (each crossing whose pits are by the bore sub, with its pits priced) and `<key>~plain`
//       (each open-cut casing as a plain run of the same carrier and length). Paste it as `list` in the runner's __ct.
//   node bidtabs/crossings-report.mjs score "<Bid tabs dir>" "<overlay config>" "<crossings input>" "<runner results json>" "<out prefix>"
//       each tab item against every bidder, as bid (D-1273): our direct and our bid (the overlay), the low, the 2nd low
//       and the median, per item and per tab, recent and history apart; what each crossing's cost is made of (the bore
//       subcontract, the casing, spacers and seals, the pull-in crew, the restraint, the pits, the trench); the
//       sensitivities; our $/LF against D-1269's bands. Writes <out prefix>.json and <out prefix>-tables.md.
//
// Our cost per item is the engine's: each own line's Estimating columns (labour at the tab's bid-date prevailing rate,
// D-1103's ratio), split by the line's components in proportion to their quantity x price (a line's material column
// shared among its materials, its subcontract column among its subcontracts), so a location factor or a rounding
// stays in the line's own total. Where the tab's item excludes the carrier pipe, the carrier's material comes out.

import { readFileSync, writeFileSync } from "node:fs";

const [, , mode, dir, a1, a2, a3, a4] = process.argv;
const J = (f) => JSON.parse(readFileSync(f.includes("/") || f.includes("\\") ? f : `${dir}/${f}`, "utf8"));

if (mode === "ct") {
  const input = J(a1);
  const byKey = new Map();
  for (const x of input.crossings) (byKey.get(x.key) ?? byKey.set(x.key, []).get(x.key)).push(x);
  const item = (x, over = {}) => ({ xid: x.id, type: x.type, entry: x.entry, nominal: x.nominal, depth: x.depth, qty: x.runLf, crossing: x.crossing, pits: x.pits, ...over });
  const list = [];
  for (const [key, xs] of byKey) list.push({ key, items: xs.map((x) => item(x)) });
  for (const [key, xs] of byKey) {
    const ps = xs.filter((x) => x.pits?.bySub);
    if (ps.length) list.push({ key: `${key}~pits`, items: ps.map((x) => item(x, { pits: { bySub: false, backfill: "native" } })) });
  }
  for (const [key, xs] of byKey) {
    const ps = xs.filter((x) => x.plainTwin);
    if (ps.length) list.push({ key: `${key}~plain`, items: ps.map((x) => item(x, { crossing: { kind: "none" }, pits: null })) });
  }
  console.log(JSON.stringify(list));
  process.exit(0);
}
if (mode !== "score") throw new Error("mode: ct | score");

const cfg = J(a1);
const input = J(a2);
const results = new Map(J(a3).map((r) => [r.key, r]));
const outPrefix = a4;
const tabPrices = new Map(J("tab-prices-2026-11-15.json").map((c) => [c.key, c]));
const cmp = new Map(J("contract-cmp-all-2026-11-12.json").map((c) => [c.key, c]));
const parse = J("why-we-bid-low-2026-11-16-parse.json");

const month = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
};
const cutoff = month(parse.cutoff);
const isRecent = (key) => month(cmp.get(key).date) >= cutoff;
const median = (a) => {
  const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
};
const sum = (rs, f) => rs.reduce((t, r) => t + f(r), 0);
const usd = (x) => (x == null || !Number.isFinite(x) ? "–" : `${x < 0 ? "−" : ""}$${Math.round(Math.abs(x)).toLocaleString("en-US")}`);
const d2 = (x) => (x == null || !Number.isFinite(x) ? "–" : x.toFixed(2));
const d3 = (x) => (x == null || !Number.isFinite(x) ? "–" : x.toFixed(3));
const pc = (x) => (x == null || !Number.isFinite(x) ? "–" : `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(1)} %`);
const out = [];
const p = (s = "") => out.push(s);
const table = (head, rows) => {
  p(`| ${head.join(" | ")} |`);
  p(`|${head.map((_, i) => (i === 0 ? "---" : "---:")).join("|")}|`);
  for (const r of rows) p(`| ${r.join(" | ")} |`);
  p();
};

// ---------- A component's quantity x price, and its category ----------
// A formula as Calculate writes it: numbers, QTY, + − × ÷, brackets and ceil. Anything else reads as null (unsplit).
function evalQty(formula, qty) {
  if (formula == null) return null;
  const f = String(formula).replace(/\bQTY\b/g, `(${qty})`).replace(/\bceil\b/g, "C");
  if (!/^[\d.\s+\-*/()C]*$/.test(f)) return null;
  try {
    const v = Function("C", `return (${f});`)(Math.ceil);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
function rawOf(c, lineQty) {
  const q0 = evalQty(c.qty_formula ?? "QTY", lineQty);
  const price = c.kind === "subcontract" ? (c.unit_rate ?? c.unit_price) : c.unit_price;
  if (q0 == null || price == null) return c.total ?? 0;
  let q = q0 * (1 + (c.wastage_pct ?? 0) / 100);
  if (c.round_to && c.round_to > 0) q = Math.ceil(q / c.round_to - 1e-9) * c.round_to;
  return q * price;
}
const CATS = ["bore", "casing", "spacers", "seals", "grout", "restraint", "carrier", "pullIn", "pits", "trench", "hdd", "other"];
function catOf(c, carrierKey) {
  const k = String(c.mat_key ?? c.auto_key ?? "");
  if (k === `pipe:${carrierKey}`) return "carrier";
  if (/^bore:/.test(k)) return "bore";
  if (/^hdd:/.test(k)) return "hdd";
  if (/steel_casing|^casing:sub:/.test(k)) return "casing";
  if (/^casing:spacer/.test(k)) return "spacers";
  if (/^casing:end_seal/.test(k)) return "seals";
  if (/^grout:/.test(k)) return "grout";
  if (/restrain/i.test(k) || /restrain/i.test(c.name ?? "")) return "restraint";
  return null;
}

// ---------- Each crossing's cost by category (direct, labour at the tab's prevailing rate) ----------
const resultItem = (key, xid) => {
  const r = results.get(key);
  if (!r?.items) return null;
  return r.items.find((it) => it.xid === xid) ?? null;
};
function costOf(x, key, ratio) {
  const it = resultItem(key, x.id);
  if (!it || !it.lines) return null;
  const carrierKey = `${x.entry}:${x.nominal}`;
  const cat = Object.fromEntries(CATS.map((c) => [c, { L: 0, E: 0, M: 0, S: 0, D: 0 }]));
  const unsplit = [];
  for (const l of it.lines) {
    const isPit = /pit\b|pit,|pit \(|Bore pit|Receiving pit/i.test(l.name);
    const isStretch = l.role === "utility_pipe";
    const lab = l.lab * ratio;
    const host = isPit ? "pits" : isStretch ? "pullIn" : "trench";
    cat[host].L += lab;
    cat[host].E += l.eq;
    cat[host].D += l.disp;
    // Material and subcontract: by the line's components, each column shared in proportion to quantity x price.
    const comps = (l.components ?? []).filter((c) => c.kind === "material" || c.kind === "subcontract");
    const lq = l.lineQty ?? l.qty;
    for (const col of ["material", "subcontract"]) {
      const total = col === "material" ? l.mat : l.sub;
      if (!(Math.abs(total) > 1e-9)) continue;
      const cs = comps.filter((c) => c.kind === col).map((c) => ({ c, raw: rawOf(c, lq) }));
      const rawSum = sum(cs, (z) => z.raw);
      if (!(rawSum > 0)) {
        unsplit.push(`${l.name} ${col}`);
        cat[isPit ? "pits" : isStretch ? "other" : "trench"][col === "material" ? "M" : "S"] += total;
        continue;
      }
      for (const { c, raw } of cs) {
        const into = isPit ? "pits" : (catOf(c, carrierKey) ?? (isStretch ? "other" : "trench"));
        cat[into][col === "material" ? "M" : "S"] += (total * raw) / rawSum;
      }
    }
  }
  const casingText = (it.notes?.run?.notes ?? []).find((n) => /^Casing /.test(n)) ?? null;
  const boreKey = it.lines.flatMap((l) => l.components ?? []).find((c) => /^bore:jack_bore:/.test(c.mat_key ?? ""))?.mat_key ?? null;
  return { cat, unsplit, casingText, casingIn: boreKey ? Number(boreKey.split(":")[2]) : null, notes: it.notes, unmatched: it.unmatched ?? [], lines: it.lines.map((l) => ({ name: l.name, role: l.role, qty: l.qty, unit: l.unit, lab: l.lab, eq: l.eq, mat: l.mat, sub: l.sub, disp: l.disp, total: l.total })) };
}
const zero = () => ({ L: 0, E: 0, M: 0, S: 0, D: 0 });
const add = (a, b, k = 1) => ({ L: a.L + b.L * k, E: a.E + b.E * k, M: a.M + b.M * k, S: a.S + b.S * k, D: a.D + b.D * k });
const tot = (c) => c.L + c.E + c.M + c.S + c.D;
const sumCats = (cat, names) => names.reduce((t, n) => add(t, cat[n]), zero());

// ---------- The overlay (D-1273) ----------
const I = cfg.overlay.indirects;
const O = cfg.overlay.ohp;
const pct = (x) => x / 100;
const bondRe = new RegExp(I.bondItemPattern, "i");
const bondOf = (key) => (I.bondOnlyWhenNoBondItem && tabPrices.get(key).items.some((i) => i.unit !== "LF" && bondRe.test(i.desc)) ? 0 : pct(I.bondPctOfBid));
function bidOf(c, key) {
  const M = c.M * (1 + pct(cfg.basis.salesTaxOnMaterialPct ?? 0)) + (O.disposalAs === "material" ? c.D : 0);
  const S = c.S + (O.disposalAs === "subcontract" ? c.D : 0);
  const Lp = c.L * (1 + pct(I.supervisionPctOfLabourAndEquipment) + pct(I.smallToolsPctOfLabour));
  const Ep = c.E * (1 + pct(I.supervisionPctOfLabourAndEquipment));
  return (Lp * (1 + pct(O.labourPct)) + Ep * (1 + pct(O.equipmentPct)) + M * (1 + pct(O.materialPct)) + S * (1 + pct(O.subcontractPct))) / (1 - pct(I.glInsurancePctOfBid) - bondOf(key));
}

// ---------- Per tab item ----------
const CASING_CATS = ["casing", "spacers", "seals"];
const items = [];
for (const t of input.tabItems) {
  const x = input.crossings.find((c) => c.id === t.crossing);
  const k = cmp.get(t.key);
  const T = tabPrices.get(t.key);
  const row = T.items.find((i) => String(i.no) === String(t.no) && i.unit === t.unit && i.qty === t.qty) ?? null;
  const prices = row?.prices ?? [];
  const sorted = [...prices].sort((a, b) => a - b);
  const c = costOf(x, t.key, k.labourRatio);
  const base = { id: t.id, key: t.key, no: t.no, unit: t.unit, qty: t.qty, desc: row?.desc ?? null, date: k.date, recent: isRecent(t.key), method: t.method, includes: t.includes, crossing: x.id, choices: x.choices, carrierIncluded: x.carrierIncluded, bidders: prices.length, prices, low: sorted[0] ?? null, second: sorted[1] ?? null, median: median(prices), rowFull: Boolean(row) && prices.length === T.bidders };
  if (!c) {
    items.push({ ...base, priced: false });
    continue;
  }
  const names = t.allocate === "casing" ? CASING_CATS : t.allocate === "rest" ? CATS.filter((n) => !CASING_CATS.includes(n)) : CATS;
  const kept = names.filter((n) => !(n === "carrier" && !x.carrierIncluded));
  const run = sumCats(c.cat, kept);
  // Per the tab's unit: an LF item per LF of run; an EA item per crossing of the run's LF.
  const per = t.unit === "EA" ? 1 : x.runLf;
  const unitCost = { L: run.L / per, E: run.E / per, M: run.M / per, S: run.S / per, D: run.D / per };
  const direct = tot(unitCost);
  const bid = bidOf(unitCost, t.key);
  const byCat = Object.fromEntries(names.map((n) => [n, tot(c.cat[n]) / per]));
  const carrierOut = !x.carrierIncluded && names.includes("carrier") ? tot(c.cat.carrier) / per : 0;
  items.push({ ...base, priced: true, runLf: x.runLf, direct, bid, L: unitCost.L, E: unitCost.E, M: unitCost.M, S: unitCost.S, D: unitCost.D, byCat, carrierOut, bidOverDirect: bid / direct, vsLow: bid / base.low - 1, vsSecond: base.second ? bid / base.second - 1 : null, vsMedian: bid / base.median - 1, directVsMedian: direct / base.median - 1, rank: 1 + prices.filter((v) => v < bid).length, casingText: c.casingText, casingIn: c.casingIn, unsplit: c.unsplit, unmatched: c.unmatched, notes: c.notes, lines: c.lines });
}

// ---------- Per tab (the group of its crossing items) and the group ----------
function group(rs) {
  const key = rs[0].key;
  const n = rs[0].bidders;
  const totals = Array.from({ length: n }, (_, j) => sum(rs, (r) => r.prices[j] * r.qty));
  const sorted = [...totals].sort((a, b) => a - b);
  const direct = sum(rs, (r) => r.direct * r.qty);
  const bid = sum(rs, (r) => r.bid * r.qty);
  return { key, date: rs[0].date, recent: rs[0].recent, items: rs.map((r) => r.id), bidders: n, direct, bid, low: sorted[0], second: sorted[1] ?? null, median: median(totals), rank: 1 + totals.filter((t) => t < bid).length, vsLow: bid / sorted[0] - 1, vsSecond: sorted[1] ? bid / sorted[1] - 1 : null, vsMedian: bid / median(totals) - 1, directVsMedian: direct / median(totals) - 1 };
}
const priced = items.filter((r) => r.priced);
const keys = [...new Set(priced.map((r) => r.key))].sort((a, b) => month(cmp.get(a).date) - month(cmp.get(b).date));
const groups = keys.map((k) => group(priced.filter((r) => r.key === k)));
const groupTotal = (label, gs) => {
  const direct = sum(gs, (g) => g.direct);
  const bid = sum(gs, (g) => g.bid);
  const low = sum(gs, (g) => g.low);
  const second = sum(gs, (g) => g.second ?? g.low);
  const med = sum(gs, (g) => g.median);
  return { label, tabs: gs.length, direct, bid, low, second, median: med, vsLow: bid / low - 1, vsSecond: bid / second - 1, vsMedian: bid / med - 1, directVsMedian: direct / med - 1, lowTabs: gs.filter((g) => g.rank === 1).length };
};
const totals = [groupTotal("Recent", groups.filter((g) => g.recent)), groupTotal("History", groups.filter((g) => !g.recent)), groupTotal("All", groups)];

// ---------- What each crossing is made of, and the sensitivities ----------
const crossings = input.crossings.map((x) => {
  const k = cmp.get(x.key);
  const c = costOf(x, x.key, k.labourRatio);
  const pits = x.pits?.bySub ? costOf({ ...x }, `${x.key}~pits`, k.labourRatio) : null;
  const plain = x.plainTwin ? costOf({ ...x, crossing: { kind: "none" } }, `${x.key}~plain`, k.labourRatio) : null;
  if (!c) return { id: x.id, key: x.key, priced: false };
  const per = x.runLf;
  const byCat = Object.fromEntries(CATS.map((n) => [n, tot(c.cat[n])]));
  const all = CATS.reduce((t, n) => t + byCat[n], 0);
  const lessCarrier = all - (x.carrierIncluded ? 0 : byCat.carrier);
  return {
    id: x.id,
    key: x.key,
    recent: isRecent(x.key),
    kind: x.crossing.kind,
    pipe: `${x.nominal}" ${x.entry}`,
    runLf: x.runLf,
    count: x.count,
    casingText: c.casingText,
    casingIn: c.casingIn,
    pitsBySub: Boolean(x.pits?.bySub),
    carrierIncluded: x.carrierIncluded,
    byCat,
    directAll: all,
    directLessCarrier: lessCarrier,
    perLfLessCarrier: lessCarrier / per,
    boreAndCasingPerLf: (byCat.bore + byCat.casing) / per,
    pitsPricedAdds: pits ? tot(sumCats(pits.cat, ["pits"])) : null,
    plainTwin: plain ? CATS.reduce((t, n) => t + tot(plain.cat[n]), 0) : null,
    casedOverPlain: plain ? all - CATS.reduce((t, n) => t + tot(plain.cat[n]), 0) : null,
    unsplit: c.unsplit,
  };
});

// ---------- Tables ----------
p(`As bid, every bidder, no escalation (D-1273). Recent = bid ${parse.cutoff} or later. Labour at each tab's bid-date prevailing rate (D-1103's ratio). Overlay from bid-overlay-d1273.json; bond ${I.bondPctOfBid} % only where the tab has no bond item. ${input.phase === "pre-Part-4" ? "**Pre-Part-4 prices** (casing sub-furnished and Pits by bore sub set per item, explicitly)." : ""}`);
p();
p("### C1. The 11 crossing items: tab as bid against ours (per the tab's unit)");
table(
  ["Item", "Tab", "Bid", "Set", "No.", "Unit", "Qty", "Method", "Bidders", "Low", "2nd", "Median", "Our direct", "Our bid", "Rank", "± low", "± median", "Direct vs median"],
  items.map((r) => [r.id, r.key, r.date, r.recent ? "recent" : "history", r.no, r.unit, String(r.qty), r.method, String(r.bidders), d2(r.low), d2(r.second), d2(r.median), d2(r.direct), d2(r.bid), r.priced ? `${r.rank} of ${r.bidders + 1}` : "–", pc(r.vsLow), pc(r.vsMedian), pc(r.directVsMedian)]),
);
p("### C2. Every bidder's price per item (as bid)");
table(["Item", "Tab", "Unit", "Prices, as read (bidder order)"], items.map((r) => [r.id, r.key, r.unit, r.prices.map(d2).join(", ")]));
p("### C3. Per tab (its crossing items together) and the group, recent and history apart");
const gRow = (g) => [g.key, g.date, g.items.join("+"), String(g.bidders), usd(g.direct), usd(g.bid), usd(g.low), usd(g.second), usd(g.median), `${g.rank} of ${g.bidders + 1}`, pc(g.vsLow), pc(g.vsSecond), pc(g.vsMedian), pc(g.directVsMedian)];
const tRow = (t) => [`**${t.label}**`, "", "", `${t.tabs} tabs`, usd(t.direct), usd(t.bid), usd(t.low), usd(t.second), usd(t.median), `${t.lowTabs} low`, pc(t.vsLow), pc(t.vsSecond), pc(t.vsMedian), pc(t.directVsMedian)];
const GH = ["Tab", "Bid", "Items", "Bidders", "Our direct", "Our bid", "Low", "2nd", "Median", "Rank", "± low", "± 2nd", "± median", "Direct vs median"];
table(GH, [...groups.filter((g) => g.recent).map(gRow), tRow(totals[0]), ...groups.filter((g) => !g.recent).map(gRow), tRow(totals[1]), tRow(totals[2])]);
p("### C4. What each crossing costs us (direct, whole crossing, $): by part");
table(
  ["Crossing", "Tab", "Kind", "Carrier", "LF", "Casing", "Bore sub", "Casing $", "Spacers", "Seals", "Restraint", "Pull-in crew", "Pits", "Trench", "Other", "Carrier pipe", "Direct less carrier", "$/LF less carrier"],
  crossings.filter((c) => c.byCat).map((c) => [c.id, c.key, c.kind, `${c.pipe}${c.carrierIncluded ? " (in)" : " (out)"}`, String(c.runLf), c.casingText ? c.casingText.replace(/^Casing /, "").split(":")[0] : "–", usd(c.byCat.bore), usd(c.byCat.casing), usd(c.byCat.spacers), usd(c.byCat.seals), usd(c.byCat.restraint), usd(c.byCat.pullIn), usd(c.byCat.pits), usd(c.byCat.trench), usd(c.byCat.other + c.byCat.grout + c.byCat.hdd), usd(c.byCat.carrier), usd(c.directLessCarrier), d2(c.perLfLessCarrier)]),
);
p("### C5. Sensitivities (same run): pits priced where they are by the bore sub; the open-cut casing over a plain run");
table(
  ["Crossing", "Tab", "Pits by sub", "Pits priced would add ($)", "per LF", "Plain twin direct ($)", "Cased less plain ($)", "per LF"],
  crossings.filter((c) => c.byCat && (c.pitsPricedAdds != null || c.plainTwin != null)).map((c) => [c.id, c.key, c.pitsBySub ? "ON" : "OFF", usd(c.pitsPricedAdds), d2(c.pitsPricedAdds == null ? null : c.pitsPricedAdds / c.runLf), usd(c.plainTwin), usd(c.casedOverPlain), d2(c.casedOverPlain == null ? null : c.casedOverPlain / c.runLf)]),
);
p("### C6. Our jack and bore $/LF against D-1269's bands");
const SB = input.sanityBands;
table(
  ["Crossing", "Casing in", "Our bore sub + casing $/LF", "Library casing-included $/LF", "Our all-in $/LF less carrier", "Tab median $/LF (bore items)"],
  crossings.filter((c) => c.byCat && c.kind === "jack_bore").map((c) => {
    const tabMed = items.filter((r) => r.crossing === c.id && r.unit === "LF").reduce((t, r) => t + (r.median ?? 0), 0);
    const ea = items.find((r) => r.crossing === c.id && r.unit === "EA");
    return [c.id, String(c.casingIn ?? "–"), d2(c.boreAndCasingPerLf), String(SB.libraryCasingIncludedPerLf[String(c.casingIn)] ?? "–"), d2(c.perLfLessCarrier), ea ? `${d2(ea.median / c.runLf)} (EA ÷ ${c.runLf} LF)` : d2(tabMed)];
  }),
);
p(`Bands D-1269's key was set at: ${SB.sources.map((s) => `${s.what}: ${s.perLf != null ? `$${Array.isArray(s.perLf) ? s.perLf.join("–") : s.perLf}/LF` : `$${s.low}–${s.high}/LF`} (${s.basis})`).join("; ")}.`);
p();
const flagged = items.filter((r) => r.priced && (r.unsplit?.length || r.unmatched?.length));
if (flagged.length) p(`Lines not split by component or not matched: ${flagged.map((r) => `${r.id}: ${[...(r.unsplit ?? []), ...(r.unmatched ?? [])].join(", ")}`).join("; ")}.`);
p();

writeFileSync(`${outPrefix}-tables.md`, out.join("\n"));
writeFileSync(`${outPrefix}.json`, JSON.stringify({ decision: "D-1277", phase: input.phase, cutoff: parse.cutoff, config: cfg.overlay, items, groups, totals, crossings }, null, 1));
console.log(out.join("\n"));

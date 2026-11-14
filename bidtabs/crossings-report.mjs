// The crossing pay items priced with D-1269 as their own group (D-1277; Part 5 of the 2026-11-15 night run). No bid
// figure lives here: the input (the tab items mapped to crossings, the choices), the runner's results and every output
// are in docs/reference (outside git); every percentage comes from the overlay config (bid-overlay-d1273.json).
//
//   node bidtabs/crossings-report.mjs ct "<Bid tabs dir>" "<crossings input>" [<key prefix>]
//       the runner's contract list (JSON on stdout): one contract per tab with its crossings (reading A, the input's
//       explicit choices), then the sensitivity contracts: `<key>~pits` (each crossing whose pits are by the bore sub,
//       with its pits priced) and `<key>~plain` (each open-cut casing as a plain run of the same carrier and length).
//       The rerun after Part 4 (D-1276) adds, where the input asks for them:
//         `<key>~b`      the tab's crossings with each one's `post4` choices (Part 4's own defaults, written out);
//         `<key>~inrun`  each jack and bore (with its `post4` choices) as a stretch of a run that has `inRun.restLf`
//                        LF of plain pipe besides (D-1277 answer 3: the pull-in rides the run's crew);
//         `<key>~rest`   that plain pipe alone (the in-run crossing is `~inrun` less `~rest`);
//         a crossing with its own `contract` (e.g. a casing-only item read as open cut, answer 4) in that contract, and
//         its plain twin in `<contract>~plain`.
//       A prefix (e.g. "x:") goes in front of every key, so one runner list can carry these and the 16 tabs' contracts;
//       `score` takes it off again.
//   node bidtabs/crossings-report.mjs score "<Bid tabs dir>" "<overlay config>" "<crossings input>" "<runner results json>" "<out prefix>" [<earlier crossings json>]
//       each tab item against every bidder, as bid (D-1273): our direct and our bid (the overlay), the low, the 2nd low
//       and the median, per item and per tab, recent and history apart, and the multipliers to the medians and to the
//       lows (median ÷ our direct, low ÷ our direct; healthy 1.20-1.35 to the medians); what each crossing's cost is made
//       of (the bore subcontract, the casing, spacers and seals, the pull-in crew, the restraint, the pits, the trench);
//       the sensitivities; our $/LF against D-1269's bands. With the rerun's contracts present, three readings: A (the
//       explicit choices), B (Part 4's defaults, each crossing priced alone) and F (final: B with each jack and bore on
//       its run's crew, and each casing-only item as open cut, the cased run less the plain run). An earlier run's
//       crossings json (the dry run) is set beside them. Writes <out prefix>.json and <out prefix>-tables.md.
//
// Our cost per item is the engine's: each own line's Estimating columns (labour at the tab's bid-date prevailing rate,
// D-1103's ratio), split by the line's components in proportion to their quantity x price (a line's material column
// shared among its materials, its subcontract column among its subcontracts), so a location factor or a rounding
// stays in the line's own total. Where the tab's item excludes the carrier pipe, the carrier's material comes out.

import { readFileSync, writeFileSync } from "node:fs";

const [, , mode, dir, a1, a2, a3, a4, a5] = process.argv;
const J = (f) => JSON.parse(readFileSync(f.includes("/") || f.includes("\\") ? f : `${dir}/${f}`, "utf8"));
const contractOf = (x) => x.contract ?? x.key;

if (mode === "ct") {
  const input = J(a1);
  const prefix = a2 ?? "";
  const byKey = new Map();
  for (const x of input.crossings) (byKey.get(contractOf(x)) ?? byKey.set(contractOf(x), []).get(contractOf(x))).push(x);
  const item = (x, over = {}) => ({ xid: x.id, type: x.type, entry: x.entry, nominal: x.nominal, depth: x.depth, qty: x.runLf, crossing: x.crossing, pits: x.pits, ...over });
  const post4 = (x) => ({ ...x, ...(x.post4 ?? {}), crossing: { ...x.crossing, ...(x.post4?.crossing ?? {}) } });
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
  for (const [key, xs] of byKey) if (xs.some((x) => x.post4)) list.push({ key: `${key}~b`, items: xs.map((x) => item(post4(x))) });
  const rest = input.inRun?.restLf;
  if (rest > 0)
    for (const [key, xs] of byKey) {
      const jb = xs.filter((x) => x.crossing.kind === "jack_bore").map(post4);
      if (!jb.length) continue;
      list.push({ key: `${key}~inrun`, items: jb.map((x) => item(x, { qty: x.runLf + rest, crossing: { ...x.crossing, lf: x.runLf } })) });
      list.push({ key: `${key}~rest`, items: jb.map((x) => item(x, { qty: rest, crossing: { kind: "none" }, pits: null })) });
    }
  console.log(JSON.stringify(list.map((c) => ({ ...c, key: `${prefix}${c.key}` }))));
  process.exit(0);
}
if (mode !== "score") throw new Error("mode: ct | score");

const cfg = J(a1);
const input = J(a2);
// A prefixed key (one runner list with the 16 tabs' contracts) reads as its own.
const results = new Map(J(a3).map((r) => [String(r.key).replace(/^x:/, ""), r]));
const outPrefix = a4;
const earlier = a5 ? J(a5) : null;
const tabPrices = new Map(J("tab-prices-2026-11-15.json").map((c) => [c.key, c]));
const cmp = new Map(J("contract-cmp-all-2026-11-12.json").map((c) => [c.key, c]));
const parse = J("why-we-bid-low-2026-11-16-parse.json");
const [hLo, hHi] = cfg.calibration.healthyToMedian;

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
const health = (k) => (k == null || !Number.isFinite(k) ? "–" : k < hLo ? "direct high" : k > hHi ? "direct low" : "healthy");
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
const zero = () => ({ L: 0, E: 0, M: 0, S: 0, D: 0 });
const add = (a, b, k = 1) => ({ L: a.L + b.L * k, E: a.E + b.E * k, M: a.M + b.M * k, S: a.S + b.S * k, D: a.D + b.D * k });
const tot = (c) => c.L + c.E + c.M + c.S + c.D;
const sumCats = (cat, names) => names.reduce((t, n) => add(t, cat[n]), zero());
function costOf(x, key, ratio) {
  const it = resultItem(key, x.id);
  if (!it || !it.lines) return null;
  const carrierKey = `${x.entry}:${x.nominal}`;
  const cat = Object.fromEntries(CATS.map((c) => [c, zero()]));
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
// One cost less another, category by category (an in-run crossing less its plain rest; a cased run less its plain twin).
function less(a, b) {
  if (!a || !b) return null;
  return { ...a, cat: Object.fromEntries(CATS.map((n) => [n, add(a.cat[n], b.cat[n], -1)])), unsplit: [...a.unsplit, ...b.unsplit], unmatched: [...a.unmatched, ...b.unmatched], lines: [...a.lines, ...b.lines.map((l) => ({ ...l, less: true }))] };
}

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

// ---------- The readings ----------
const CASING_CATS = ["casing", "spacers", "seals"];
const xOf = (id) => input.crossings.find((c) => c.id === id);
const post4 = (x) => ({ ...x, ...(x.post4 ?? {}), crossing: { ...x.crossing, ...(x.post4?.crossing ?? {}) } });
const ratioOf = (key) => cmp.get(key).labourRatio;
const hasRerun = [...results.keys()].some((k) => /~(b|inrun|rest)$/.test(k));
// Each reading gives a tab item's cost (by category) and the categories its price takes.
const READINGS = {
  A: { label: "A: the explicit choices (as the dry run)", cost: (t, x) => ({ c: costOf(x, contractOf(x), ratioOf(t.key)), how: "as the item" }) },
  B: {
    label: "B: Part 4's defaults written out (casing_by sub, pits by the bore sub ON), each crossing priced alone",
    cost: (t, x) => {
      const k = `${contractOf(x)}~b`;
      return results.has(k) ? { c: costOf(post4(x), k, ratioOf(t.key)), how: "post-Part-4 choices" } : { c: costOf(x, contractOf(x), ratioOf(t.key)), how: "as A (the same choices)" };
    },
  },
  F: {
    label: "F (final): B with each jack and bore on its run's crew (in a run of plain pipe, less that pipe alone), each casing-only item as open cut (the cased run less the plain run)",
    cost: (t, x) => {
      const r = ratioOf(t.key);
      if (t.openCut) {
        const o = xOf(t.openCut);
        return { c: less(costOf(o, contractOf(o), r), costOf(o, `${contractOf(o)}~plain`, r)), how: `open cut (${o.id}) less plain`, all: true };
      }
      if (x.plainTwin) return { c: less(costOf(x, contractOf(x), r), costOf(x, `${contractOf(x)}~plain`, r)), how: "cased less plain", all: true };
      if (x.crossing.kind === "jack_bore" && results.has(`${contractOf(x)}~inrun`)) return { c: less(costOf(post4(x), `${contractOf(x)}~inrun`, r), costOf(x, `${contractOf(x)}~rest`, r)), how: "in run less rest" };
      return READINGS.B.cost(t, x);
    },
  },
};
const readingNames = hasRerun ? ["A", "B", "F"] : ["A"];

function priceItems(rk) {
  const items = [];
  for (const t of input.tabItems) {
    const x = xOf(t.crossing);
    const k = cmp.get(t.key);
    const T = tabPrices.get(t.key);
    const row = T.items.find((i) => String(i.no) === String(t.no) && i.unit === t.unit && i.qty === t.qty) ?? null;
    const prices = row?.prices ?? [];
    const sorted = [...prices].sort((a, b) => a - b);
    const { c, how, all } = READINGS[rk].cost(t, x);
    const base = { id: t.id, key: t.key, no: t.no, unit: t.unit, qty: t.qty, desc: row?.desc ?? null, date: k.date, recent: isRecent(t.key), method: t.method, includes: t.includes, crossing: x.id, choices: x.choices, carrierIncluded: x.carrierIncluded, bidders: prices.length, prices, low: sorted[0] ?? null, second: sorted[1] ?? null, median: median(prices), rowFull: Boolean(row) && prices.length === T.bidders, reading: rk, how };
    if (!c) {
      items.push({ ...base, priced: false });
      continue;
    }
    // A cased-less-plain difference carries its own carrier both ways: every category, the carrier cancelling.
    const names = all ? CATS : t.allocate === "casing" ? CASING_CATS : t.allocate === "rest" ? CATS.filter((n) => !CASING_CATS.includes(n)) : CATS;
    const kept = names.filter((n) => !(n === "carrier" && !x.carrierIncluded && !all));
    const run = sumCats(c.cat, kept);
    // Per the tab's unit: an LF item per LF of run; an EA item per crossing of the run's LF.
    const per = t.unit === "EA" ? 1 : x.runLf;
    const unitCost = { L: run.L / per, E: run.E / per, M: run.M / per, S: run.S / per, D: run.D / per };
    const direct = tot(unitCost);
    const bid = bidOf(unitCost, t.key);
    const byCat = Object.fromEntries(names.map((n) => [n, tot(c.cat[n]) / per]));
    const carrierOut = !x.carrierIncluded && !all && names.includes("carrier") ? tot(c.cat.carrier) / per : 0;
    items.push({ ...base, priced: true, runLf: x.runLf, direct, bid, L: unitCost.L, E: unitCost.E, M: unitCost.M, S: unitCost.S, D: unitCost.D, byCat, carrierOut, bidOverDirect: bid / direct, kMedian: base.median / direct, kLow: base.low / direct, vsLow: bid / base.low - 1, vsSecond: base.second ? bid / base.second - 1 : null, vsMedian: bid / base.median - 1, directVsMedian: direct / base.median - 1, rank: 1 + prices.filter((v) => v < bid).length, casingText: c.casingText, casingIn: c.casingIn, unsplit: c.unsplit, unmatched: c.unmatched, notes: c.notes, lines: c.lines });
  }
  return items;
}

// ---------- Per tab (the group of its crossing items) and the group ----------
function group(rs) {
  const key = rs[0].key;
  const n = rs[0].bidders;
  const totals = Array.from({ length: n }, (_, j) => sum(rs, (r) => r.prices[j] * r.qty));
  const sorted = [...totals].sort((a, b) => a - b);
  const direct = sum(rs, (r) => r.direct * r.qty);
  const bid = sum(rs, (r) => r.bid * r.qty);
  const med = median(totals);
  return { key, date: rs[0].date, recent: rs[0].recent, items: rs.map((r) => r.id), bidders: n, direct, bid, low: sorted[0], second: sorted[1] ?? null, median: med, kMedian: med / direct, kLow: sorted[0] / direct, rank: 1 + totals.filter((t) => t < bid).length, vsLow: bid / sorted[0] - 1, vsSecond: sorted[1] ? bid / sorted[1] - 1 : null, vsMedian: bid / med - 1, directVsMedian: direct / med - 1 };
}
const groupTotal = (label, gs) => {
  const direct = sum(gs, (g) => g.direct);
  const bid = sum(gs, (g) => g.bid);
  const low = sum(gs, (g) => g.low);
  const second = sum(gs, (g) => g.second ?? g.low);
  const med = sum(gs, (g) => g.median);
  // The log mean over the tabs of median ÷ direct and low ÷ direct beside the $-weighted ratio.
  const logK = (f) => Math.exp(sum(gs, (g) => Math.log(f(g) / g.direct)) / gs.length);
  return { label, tabs: gs.length, direct, bid, low, second, median: med, kMedian: med / direct, kLow: low / direct, kMedianLog: logK((g) => g.median), kLowLog: logK((g) => g.low), vsLow: bid / low - 1, vsSecond: bid / second - 1, vsMedian: bid / med - 1, directVsMedian: direct / med - 1, lowTabs: gs.filter((g) => g.rank === 1).length };
};
function scoreReading(rk) {
  const items = priceItems(rk);
  const priced = items.filter((r) => r.priced);
  const keys = [...new Set(priced.map((r) => r.key))].sort((a, b) => month(cmp.get(a).date) - month(cmp.get(b).date));
  const groups = keys.map((k) => group(priced.filter((r) => r.key === k)));
  const totals = [groupTotal("Recent", groups.filter((g) => g.recent)), groupTotal("History", groups.filter((g) => !g.recent)), groupTotal("All", groups)];
  return { reading: rk, label: READINGS[rk].label, items, groups, totals };
}
const scored = Object.fromEntries(readingNames.map((rk) => [rk, scoreReading(rk)]));
const { items, groups, totals } = scored.A;

// ---------- What each crossing is made of, and the sensitivities ----------
function crossingRow(x, c, extra = {}) {
  const per = x.runLf;
  const byCat = Object.fromEntries(CATS.map((n) => [n, tot(c.cat[n])]));
  const all = CATS.reduce((t, n) => t + byCat[n], 0);
  const lessCarrier = all - (x.carrierIncluded ? 0 : byCat.carrier);
  return { id: x.id, key: x.key, recent: isRecent(x.key), kind: x.crossing.kind, pipe: `${x.nominal}" ${x.entry}`, runLf: x.runLf, count: x.count, casingText: c.casingText, casingIn: c.casingIn, pitsBySub: Boolean(x.pits?.bySub), carrierIncluded: x.carrierIncluded, byCat, directAll: all, directLessCarrier: lessCarrier, perLfLessCarrier: lessCarrier / per, boreAndCasingPerLf: (byCat.bore + byCat.casing) / per, unsplit: c.unsplit, notes: c.notes, ...extra };
}
const crossings = input.crossings.map((x) => {
  const r = ratioOf(x.key);
  const c = costOf(x, contractOf(x), r);
  if (!c) return { id: x.id, key: x.key, priced: false };
  const pits = x.pits?.bySub ? costOf({ ...x }, `${contractOf(x)}~pits`, r) : null;
  const plain = x.plainTwin ? costOf({ ...x, crossing: { kind: "none" } }, `${contractOf(x)}~plain`, r) : null;
  const plainAll = plain ? CATS.reduce((t, n) => t + tot(plain.cat[n]), 0) : null;
  const row = crossingRow(x, c, { pitsPricedAdds: pits ? tot(sumCats(pits.cat, ["pits"])) : null, plainTwin: plainAll });
  return { ...row, casedOverPlain: plain ? row.directAll - plainAll : null };
});
// The rerun's per-crossing parts under B (alone) and F's in-run reading (jack and bore only).
const crossingsB = hasRerun
  ? input.crossings.flatMap((x) => {
      const r = ratioOf(x.key);
      const k = `${contractOf(x)}~b`;
      const c = results.has(k) ? costOf(post4(x), k, r) : costOf(x, contractOf(x), r);
      return c ? [crossingRow(post4(x), c)] : [];
    })
  : [];
const crossingsInRun = hasRerun
  ? input.crossings.flatMap((x) => {
      if (x.crossing.kind !== "jack_bore" || !results.has(`${contractOf(x)}~inrun`)) return [];
      const r = ratioOf(x.key);
      const c = less(costOf(post4(x), `${contractOf(x)}~inrun`, r), costOf(x, `${contractOf(x)}~rest`, r));
      return c ? [crossingRow(post4(x), c)] : [];
    })
  : [];

// ---------- Tables ----------
p(`As bid, every bidder, no escalation (D-1273). Recent = bid ${parse.cutoff} or later. Labour at each tab's bid-date prevailing rate (D-1103's ratio). Overlay from bid-overlay-d1273.json; bond ${I.bondPctOfBid} % only where the tab has no bond item. ${input.phase === "pre-Part-4" ? "**Pre-Part-4 prices** (casing sub-furnished and Pits by bore sub set per item, explicitly)." : `Phase: ${input.phase ?? "–"}.`} Multipliers: k to the median = median ÷ our direct, k to the low = low ÷ our direct; healthy ${hLo.toFixed(2)}–${hHi.toFixed(2)} to the medians.`);
p();
const kRow = (r) => [r.id, r.key, r.recent ? "recent" : "history", r.unit, String(r.qty), d2(r.low), d2(r.median), d2(r.direct), d3(r.kMedian), d3(r.kLow), health(r.kMedian), d2(r.bid), r.priced ? `${r.rank} of ${r.bidders + 1}` : "–", r.how];
const KH = ["Item", "Tab", "Set", "Unit", "Qty", "Low", "Median", "Our direct", "k to median", "k to low", "Median reading", "Our bid", "Rank", "How priced"];
const gk = (g) => [g.key, g.date, g.items.join("+"), String(g.bidders), usd(g.direct), usd(g.low), usd(g.median), d3(g.kMedian), d3(g.kLow), health(g.kMedian), usd(g.bid), `${g.rank} of ${g.bidders + 1}`];
const tk = (t) => [`**${t.label}**`, "", "", `${t.tabs} tabs`, usd(t.direct), usd(t.low), usd(t.median), `${d3(t.kMedian)} ($), ${d3(t.kMedianLog)} (log)`, `${d3(t.kLow)} ($), ${d3(t.kLowLog)} (log)`, health(t.kMedian), usd(t.bid), `${t.lowTabs} low`];
const GKH = ["Tab", "Bid", "Items", "Bidders", "Our direct", "Low", "Median", "k to median", "k to low", "Median reading", "Our bid", "Rank"];
for (const rk of readingNames) {
  const s = scored[rk];
  p(`### K-${rk}. ${s.label}: per item, as multipliers`);
  table(KH, s.items.map(kRow));
  p(`### G-${rk}. ${s.label}: per tab and the group, as multipliers`);
  table(GKH, [...s.groups.filter((g) => g.recent).map(gk), tk(s.totals[0]), ...s.groups.filter((g) => !g.recent).map(gk), tk(s.totals[1]), tk(s.totals[2])]);
}
if (earlier) {
  const before = new Map(earlier.items.map((r) => [r.id, r]));
  const cols = readingNames.map((rk) => new Map(scored[rk].items.map((r) => [r.id, r])));
  p("### D1. The dry run (pre-Part-4, cc9c152) beside this run: per item, our direct and the multipliers");
  table(
    ["Item", "Median", "Low", "Dry run direct", "k med", "k low", ...readingNames.flatMap((rk) => [`${rk} direct`, `${rk} k med`, `${rk} k low`])],
    input.tabItems.map((t) => {
      const b = before.get(t.id);
      return [t.id, d2(b?.median), d2(b?.low), d2(b?.direct), d3(b ? b.median / b.direct : null), d3(b ? b.low / b.direct : null), ...cols.flatMap((m) => {
        const r = m.get(t.id);
        return [d2(r?.direct), d3(r?.kMedian), d3(r?.kLow)];
      })];
    }),
  );
  const bt = new Map(earlier.totals.map((t) => [t.label, t]));
  p("### D2. The dry run beside this run: the group, as multipliers ($-weighted)");
  table(
    ["Set", "Dry run direct", "k med", "k low", ...readingNames.flatMap((rk) => [`${rk} direct`, `${rk} k med`, `${rk} k low`])],
    ["Recent", "History", "All"].map((label) => {
      const b = bt.get(label);
      return [label, usd(b?.direct), d3(b ? b.median / b.direct : null), d3(b ? b.low / b.direct : null), ...readingNames.flatMap((rk) => {
        const t = scored[rk].totals.find((z) => z.label === label);
        return [usd(t.direct), d3(t.kMedian), d3(t.kLow)];
      })];
    }),
  );
  const bx = new Map(earlier.crossings.filter((c) => c.byCat).map((c) => [c.id, c]));
  p("### D3. What each crossing is made of: the dry run against reading A (same choices; Part 4's engine), whole crossing, $");
  const DC = ["bore", "casing", "spacers", "seals", "restraint", "pullIn", "pits", "trench", "other", "carrier"];
  table(
    ["Crossing", "Run", ...DC, "Direct less carrier"],
    crossings.filter((c) => c.byCat).flatMap((c) => {
      const b = bx.get(c.id);
      const rows = [];
      if (b) rows.push([c.id, "dry run", ...DC.map((n) => usd(n === "other" ? b.byCat.other + b.byCat.grout + b.byCat.hdd : b.byCat[n])), usd(b.directLessCarrier)]);
      rows.push([c.id, "A", ...DC.map((n) => usd(n === "other" ? c.byCat.other + c.byCat.grout + c.byCat.hdd : c.byCat[n])), usd(c.directLessCarrier)]);
      const cb = crossingsB.find((z) => z.id === c.id);
      if (cb && Math.abs(cb.directAll - c.directAll) > 0.5) rows.push([c.id, "B", ...DC.map((n) => usd(n === "other" ? cb.byCat.other + cb.byCat.grout + cb.byCat.hdd : cb.byCat[n])), usd(cb.directLessCarrier)]);
      const ci = crossingsInRun.find((z) => z.id === c.id);
      if (ci) rows.push([c.id, "F in run", ...DC.map((n) => usd(n === "other" ? ci.byCat.other + ci.byCat.grout + ci.byCat.hdd : ci.byCat[n])), usd(ci.directLessCarrier)]);
      return rows;
    }),
  );
}
p("### C1. Reading A: the crossing items, tab as bid against ours (per the tab's unit)");
table(
  ["Item", "Tab", "Bid", "Set", "No.", "Unit", "Qty", "Method", "Bidders", "Low", "2nd", "Median", "Our direct", "Our bid", "Rank", "± low", "± median", "Direct vs median"],
  items.map((r) => [r.id, r.key, r.date, r.recent ? "recent" : "history", r.no, r.unit, String(r.qty), r.method, String(r.bidders), d2(r.low), d2(r.second), d2(r.median), d2(r.direct), d2(r.bid), r.priced ? `${r.rank} of ${r.bidders + 1}` : "–", pc(r.vsLow), pc(r.vsMedian), pc(r.directVsMedian)]),
);
p("### C2. Every bidder's price per item (as bid)");
table(["Item", "Tab", "Unit", "Prices, as read (bidder order)"], items.map((r) => [r.id, r.key, r.unit, r.prices.map(d2).join(", ")]));
p("### C3. Reading A per tab (its crossing items together) and the group, recent and history apart");
const gRow = (g) => [g.key, g.date, g.items.join("+"), String(g.bidders), usd(g.direct), usd(g.bid), usd(g.low), usd(g.second), usd(g.median), `${g.rank} of ${g.bidders + 1}`, pc(g.vsLow), pc(g.vsSecond), pc(g.vsMedian), pc(g.directVsMedian)];
const tRow = (t) => [`**${t.label}**`, "", "", `${t.tabs} tabs`, usd(t.direct), usd(t.bid), usd(t.low), usd(t.second), usd(t.median), `${t.lowTabs} low`, pc(t.vsLow), pc(t.vsSecond), pc(t.vsMedian), pc(t.directVsMedian)];
const GH = ["Tab", "Bid", "Items", "Bidders", "Our direct", "Our bid", "Low", "2nd", "Median", "Rank", "± low", "± 2nd", "± median", "Direct vs median"];
table(GH, [...groups.filter((g) => g.recent).map(gRow), tRow(totals[0]), ...groups.filter((g) => !g.recent).map(gRow), tRow(totals[1]), tRow(totals[2])]);
const partsTable = (rows) =>
  table(
    ["Crossing", "Tab", "Kind", "Carrier", "LF", "Casing", "Bore sub", "Casing $", "Spacers", "Seals", "Restraint", "Pull-in crew", "Pits", "Trench", "Other", "Carrier pipe", "Direct less carrier", "$/LF less carrier"],
    rows.filter((c) => c.byCat).map((c) => [c.id, c.key, c.kind, `${c.pipe}${c.carrierIncluded ? " (in)" : " (out)"}`, String(c.runLf), c.casingText ? c.casingText.replace(/^Casing /, "").split(":")[0] : "–", usd(c.byCat.bore), usd(c.byCat.casing), usd(c.byCat.spacers), usd(c.byCat.seals), usd(c.byCat.restraint), usd(c.byCat.pullIn), usd(c.byCat.pits), usd(c.byCat.trench), usd(c.byCat.other + c.byCat.grout + c.byCat.hdd), usd(c.byCat.carrier), usd(c.directLessCarrier), d2(c.perLfLessCarrier)]),
  );
p("### C4. What each crossing costs us (reading A; direct, whole crossing, $): by part");
partsTable(crossings);
if (hasRerun) {
  p("### C4-B. The same under reading B (Part 4's defaults, each crossing alone)");
  partsTable(crossingsB);
  p("### C4-F. Each jack and bore on its run's crew (F: in a run of plain pipe, less that pipe alone)");
  partsTable(crossingsInRun);
}
p("### C5. Sensitivities (same run): pits priced where they are by the bore sub; the open-cut casing over a plain run");
table(
  ["Crossing", "Tab", "Pits by sub", "Pits priced would add ($)", "per LF", "Plain twin direct ($)", "Cased less plain ($)", "per LF"],
  crossings.filter((c) => c.byCat && (c.pitsPricedAdds != null || c.plainTwin != null)).map((c) => [c.id, c.key, c.pitsBySub ? "ON" : "OFF", usd(c.pitsPricedAdds), d2(c.pitsPricedAdds == null ? null : c.pitsPricedAdds / c.runLf), usd(c.plainTwin), usd(c.casedOverPlain), d2(c.casedOverPlain == null ? null : c.casedOverPlain / c.runLf)]),
);
p("### C6. Our jack and bore $/LF against D-1269's bands (reading A)");
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
for (const rk of readingNames) {
  const flagged = scored[rk].items.filter((r) => r.priced && (r.unsplit?.length || r.unmatched?.length));
  if (flagged.length) p(`Reading ${rk}, lines not split by component or not matched: ${flagged.map((r) => `${r.id}: ${[...new Set([...(r.unsplit ?? []), ...(r.unmatched ?? [])])].join(", ")}`).join("; ")}.`);
}
const notPriced = readingNames.flatMap((rk) => scored[rk].items.filter((r) => !r.priced).map((r) => `${rk} ${r.id}`));
if (notPriced.length) p(`Not priced (a result missing): ${notPriced.join(", ")}.`);
p();

writeFileSync(`${outPrefix}-tables.md`, out.join("\n"));
writeFileSync(`${outPrefix}.json`, JSON.stringify({ decision: "D-1277", phase: input.phase, cutoff: parse.cutoff, config: cfg.overlay, items, groups, totals, crossings, readings: scored, crossingsB, crossingsInRun }, null, 1));
console.log(out.join("\n"));

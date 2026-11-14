// The tables of "why we bid low" (D-1271, Part 5 of the 2026-11-14 night run), from gap-analysis.mjs's outputs: the
// gap by kind, size, depth and run length; the five worst contracts and every sanitary and storm item, decomposed; the
// what-ifs that size each cause; the tiny items; the non-LF group; the three-way gap. Markdown on stdout. No bid figure
// lives here: everything is read from docs/reference (outside git).
//
//   node bidtabs/gap-report.mjs "<Bid tabs dir>" "<prefix of gap-analysis outputs>" "<config json>" > tables.md
//
// The config (in docs/reference) names the contracts decomposed item by item (`worst`), the tiny items (`tiny`: key and
// LF) and the bid date from which a tab counts as recent (`recentFrom`, YYYY-MM).

import { readFileSync } from "node:fs";

const [, , dir, prefix, cfgPath] = process.argv;
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const J = (f) => JSON.parse(readFileSync(f, "utf8"));
const pipeAll = J(`${prefix}-pipe-items.json`);
const P = pipeAll.filter((r) => r.ours != null);
const N = J(`${prefix}-nonlf-items.json`);
const C = J(`${prefix}-contracts.json`);
const tabPrices = J(`${dir}/tab-prices-2026-11-15.json`);
const inputs = J(`${dir}/contracts-16-d1267b-2026-11-15.json`);
const cmp = new Map(J(`${dir}/contract-cmp-all-2026-11-12.json`).map((c) => [c.key, c]));

const usd = (x) => (x == null ? "–" : `${x < 0 ? "−" : ""}$${Math.round(Math.abs(x)).toLocaleString("en-US")}`);
const d2 = (x) => (x == null ? "–" : x.toFixed(2));
const d0 = (x) => (x == null ? "–" : Math.round(x).toLocaleString("en-US"));
const pct = (a, b) => (b ? `${((a / b - 1) * 100).toFixed(1)} %` : "–");
const S = (rs, f) => rs.reduce((t, r) => t + f(r) * r.qty, 0);
const LF = (rs) => S(rs, () => 1);
const short = (r) => Math.max(0, r.bidEsc / 1.15 - r.ours);
const over = (r) => Math.max(0, r.ours - r.bidEsc);
const out = [];
const p = (s = "") => out.push(s);
const table = (head, rows) => {
  p(`| ${head.join(" | ")} |`);
  p(`|${head.map((h, i) => (i === 0 ? "---" : "---:")).join("|")}|`);
  for (const r of rows) p(`| ${r.join(" | ")} |`);
  p();
};

// ---------- 1. Basis ----------
p("## Tables");
p();
p("### T1. The pipe LF items, the basis");
const ours = S(P, (r) => r.ours);
const tab = S(P, (r) => r.bidEsc);
const tabAll = S(P, (r) => r.bidEscAll ?? r.bidEsc);
table(["Basis", "Tab", "Ours (direct)", "Gap", "Ours x 1.15", "Gap at 1.15"], [
  ["Tab median as tonight (first block of bidders)", usd(tab), usd(ours), pct(ours, tab), usd(ours * 1.15), pct(ours * 1.15, tab)],
  ["Tab median of every bidder (this run's read)", usd(tabAll), usd(ours), pct(ours, tabAll), usd(ours * 1.15), pct(ours * 1.15, tabAll)],
]);
p(`Items under the band (ours < tab / 1.15): ${P.filter((r) => r.band === "under").length}, short of the band's floor by ${usd(S(P, short))}; items over the median: ${P.filter((r) => r.band === "over").length}, over it by ${usd(S(P, over))}.`);
p();

// ---------- 2. Groupings ----------
const group = (title, f, sort) => {
  p(`### ${title}`);
  const m = new Map();
  for (const r of P) m.set(f(r), [...(m.get(f(r)) ?? []), r]);
  const rows = [...m].sort(sort ?? ((a, b) => String(a[0]).localeCompare(String(b[0]))));
  table(["Group", "Items", "LF", "Tab", "Ours", "Gap", "Short of floor", "Over median", "Ours L+E $/LF", "Tab leaves for L+E $/LF", "Ours material $/LF", "Our LF/day", "LF/day the tab implies"],
    rows.map(([k, rs]) => [k, rs.length, d0(LF(rs)), usd(S(rs, (r) => r.bidEsc)), usd(S(rs, (r) => r.ours)), pct(S(rs, (r) => r.ours), S(rs, (r) => r.bidEsc)), usd(S(rs, short)), usd(S(rs, over)), d2(S(rs, (r) => r.lePerLf) / LF(rs)), d2(S(rs, (r) => r.needLePerLf) / LF(rs)), d2(S(rs, (r) => r.material) / LF(rs)), d0(S(rs, (r) => r.lfPerDay) / LF(rs)), (() => { const ok = rs.filter((r) => r.impliedLfPerDay > 0); return ok.length ? d0(S(ok, (r) => r.impliedLfPerDay) / LF(ok)) : "–"; })()]));
};
group("T2. By kind", (r) => r.type);
const sizeBand = (r) => `${r.type} ${r.nominal <= 12 ? "≤12 in" : r.nominal <= 24 ? "15–24 in" : r.nominal <= 42 ? "27–42 in" : "48 in +"}`;
group("T3. By kind and size", sizeBand);
group("T4. Storm by size (each size)", (r) => (r.type === "storm" ? `storm ${String(r.nominal).padStart(2, "0")} in` : "water and sanitary"));
group("T5. Sanitary by depth band (tab band middle)", (r) => (r.type === "sanitary" ? `sanitary ${String(r.depth).padStart(4, "0")} ft` : r.type));
group("T6. By the item's length", (r) => `${r.type} ${r.qty < 100 ? "a <100 LF" : r.qty < 250 ? "b 100–249 LF" : r.qty < 1000 ? "c 250–999 LF" : "d 1,000 LF +"}`);
group("T7. By contract", (r) => r.key, (a, b) => S(a[1], (r) => r.ours) / S(a[1], (r) => r.bidEsc) - S(b[1], (r) => r.ours) / S(b[1], (r) => r.bidEsc));

// ---------- 3. Item tables ----------
const itemHead = ["Contract", "Kind", "Pipe", "Depth ft", "LF", "Crew (activity, tier)", "LF/day", "Labour", "Equip.", "Pipe", "Fittings allow.", "Add-ons", "Bedding / zone", "Ours $/LF", "Tab $/LF", "Gap", "Tab leaves for L+E"];
const itemRow = (r) => [r.key, r.type, `${r.nominal}" ${r.entry}`, r.depth ?? "cover", d0(r.qty), `${r.crewActivity}: ${r.crew}`, d0(r.lfPerDay), d2(r.lab), d2(r.eq), d2(r.pipe), d2(r.fittingsAllowance), d2(r.addons + r.restraint), d2(r.bedding), d2(r.ours), d2(r.bidEsc), `${r.gapPct.toFixed(0)} %`, d2(r.needLePerLf)];
p("### T8. The five worst contracts, item by item");
p("Ours is per LF, labour at the tab's prevailing rate; the tab gives a unit price only (its split is ours). \"Tab leaves for L+E\" is the escalated median / 1.15 less our material: what the median bidder's price leaves for labour and equipment if our material is right.");
p();
const worst = cfg.worst;
table(itemHead, P.filter((r) => worst.includes(r.key)).sort((a, b) => worst.indexOf(a.key) - worst.indexOf(b.key)).map(itemRow));
const notPriced = pipeAll.filter((r) => r.ours == null && worst.includes(r.key));
if (notPriced.length) p(`Not priced in those contracts (no catalog size): ${notPriced.map((r) => `${r.key} ${r.nominal}" ${r.entry} ${r.qty} LF`).join("; ")}.`);
p();
p("### T9. Every sanitary and storm item");
table(itemHead, P.filter((r) => r.type !== "water").sort((a, b) => a.type.localeCompare(b.type) || a.nominal - b.nominal || (a.depth ?? 0) - (b.depth ?? 0) || a.key.localeCompare(b.key)).map(itemRow));

// ---------- 4. What-ifs ----------
p("### T10. What-ifs that size each cause (pipe LF items, ours, all 16 contracts)");
const what = [];
const le = (r) => r.lab + r.eq;
// (a) Large storm: TxDOT 0-4416-1's measured RCP crews, 94.92 LF a crew-day for 48-72 in (the api's own LARGE_PIPE_PACE source).
const big = P.filter((r) => r.type === "storm" && r.nominal >= 48);
const aUsd = S(big, (r) => (r.lfPerDay > 94.92 ? le(r) * (r.lfPerDay / 94.92 - 1) : 0));
what.push(["Storm 48 in +: lay at TxDOT 0-4416-1's measured 94.92 LF/day (ours " + d0(S(big, (r) => r.lfPerDay) / LF(big)) + ")", big.length, usd(aUsd)]);
// (b) Large storm depth: a trench to OD + 3 ft cover + 6 in bedding, not the 6.5 ft every storm item is laid at.
const odFt = (n) => (n + 2 * (n / 12 + 1)) / 12; // RCP wall B: about D/12 + 1 in
const pace = (d) => 1 / Math.exp(0.02733 * Math.max(0, Math.min(26, d) - 8) + 0.10573 * Math.max(0, Math.min(26, d) - 20));
const storm = P.filter((r) => r.type === "storm");
const bUsd = S(storm, (r) => { const d = Math.max(r.depth, odFt(r.nominal) + 3.5); return le(r) * (pace(r.depth) / pace(d) - 1); });
what.push(["Storm, every size: trench to the pipe's OD + 3 ft cover + bedding (not a flat 6.5 ft), through the engine's depth pace", storm.length, usd(bUsd)]);
// (c) Storm large-pipe pace steeper: the tabs' own L+E by size (T4), ours scaled to it for 48 in + beyond (a): shown as the gap left.
const cLeft = S(big, (r) => Math.max(0, r.needLePerLf - le(r) * Math.max(1, r.lfPerDay / 94.92) * (pace(r.depth) / pace(Math.max(r.depth, odFt(r.nominal) + 3.5)))));
what.push(["Storm 48 in +: still left to the tab's L+E after (a) and (b) (crew and machine size, handling, not in the engine)", big.length, usd(cLeft)]);
// (d) Sanitary long runs: the 310 and 340 LF/day high-volume rows taken back to the 500-999 LF row's 255.
const san = P.filter((r) => r.type === "sanitary");
const dUsd = S(san, (r) => (r.baseRate > 255 ? le(r) * (r.baseRate / 255 - 1) : 0));
what.push(["Sanitary: the 1,000 LF + rows (310, 340 LF/day) held at the 500–999 LF row's 255", san.filter((r) => r.baseRate > 255).length, usd(dUsd)]);
// (e) Sanitary at TxDOT's measured RCP mean x 1.2 (A28's own plastic factor): 166 LF/day before the depth pace.
const eUsd = S(san, (r) => (r.baseRate > 166.4 ? le(r) * (r.baseRate / 166.4 - 1) : 0));
what.push(["Sanitary: base rate held at TxDOT's measured 138.67 x 1.2 = 166 LF/day (A28's own plastic factor), before depth", san.filter((r) => r.baseRate > 166.4).length, usd(eUsd)]);
// (f) The tab side: every bidder's median.
what.push(["The tab: every bidder's median, not the first block's (raises the tab, so the gap)", P.filter((r) => r.bidEscAll != null && Math.abs(r.bidEscAll - r.bidEsc) > 0.005).length, usd(tabAll - tab)]);
// (g) Small items: ours over the median on items under 250 LF (minimums, crew tiers), the other way.
const small = P.filter((r) => r.qty < 250);
what.push(["Items under 250 LF: ours over the median (half-day minimums, short-run tiers, mobilization): the other way", small.length, usd(-S(small, over))]);
table(["What-if", "Items", "Ours rises by"], what);

// ---------- 5. Tiny items ----------
p("### T11. The tiny items");
for (const { key: k, qty: n } of cfg.tiny) {
  const r = P.find((x) => x.key === k && x.qty === n);
  if (!r) continue;
  p(`- ${k}, ${n} LF ${r.nominal}" ${r.entry}${r.restrained ? " restrained" : ""}: ours ${d2(r.ours)} $/LF (labour ${d2(r.lab)}, equipment ${d2(r.eq)}, material ${d2(r.material)}), tab ${d2(r.bidEsc)}; labour ${usd(r.lab * n)} and equipment ${usd(r.eq * n)} for the item; crew ${r.crewActivity} ${r.crew} at ${d0(r.lfPerDay)} LF/day would take ${(n / r.lfPerDay * 10).toFixed(1)} h.`);
}
p();
// The harness priced only the OCR-filled rows of the OCR'd tabs: the pipe LF rows it left out.
p("Pipe LF pay items on the tab that the harness's contract input left out (OCR'd tabs whose rows OCR did not fill), from this run's read of the tab text:");
p();
const PIPE = /PVC|RCP|R\.C\.P|HDPE|DUCTILE|C-900|C900|SEWER PIPE|WATER LINE|WATERLINE|FORCE MAIN|STORM SEWER|POLYPROPYLENE/;
const NOT = /TRENCH SAFETY|DEWATER|SLEEVE|CASING|BORE|AUGER|TUNNEL|SERVICE|INSPECTION|TELEVIS|VIDEO|CLEANING|WET SAND|EXTRA|ADDITIONAL|ABANDON|REMOVE|FILTER|FENCE|CURB|STABILIZED SAND, |SWALE|IRRIGATION/;
const leftRows = [];
for (const c of inputs) {
  const tp = tabPrices.find((t) => t.key === c.key);
  const eci = cmp.get(c.key)?.eci ?? 1;
  for (const i of tp?.items ?? []) {
    const d = i.desc.toUpperCase();
    if (i.unit !== "LF" || !PIPE.test(d) || NOT.test(d)) continue;
    if (c.items.some((x) => x.qty === i.qty)) continue;
    const med = i.prices.length ? [...i.prices].sort((a, b) => a - b)[Math.floor((i.prices.length - 1) / 2)] : null;
    leftRows.push([c.key, d0(i.qty), i.desc.slice(0, 90), med == null ? "–" : usd(med * eci * i.qty)]);
  }
}
table(["Contract", "LF", "Item", "Tab (escalated, about)"], leftRows);

// ---------- 6. Non-LF ----------
p("### T12. The non-LF group by category");
const cats = new Map();
for (const r of N) cats.set(r.category, [...(cats.get(r.category) ?? []), r]);
table(["Category", "Items", "Qty", "Tab (all)", "Contingency items (tab)", "Priced items", "Tab (priced)", "Ours (priced)", "Gap", "Why not priced"],
  [...cats].map(([k, rs]) => {
    const pr = rs.filter((r) => r.priced && !r.contingency && r.bidEsc != null);
    const t = (xs) => xs.reduce((a, r) => a + (r.bidEsc ?? 0) * r.qty, 0);
    const o = pr.reduce((a, r) => a + r.ours * r.qty, 0);
    return [k, rs.length, +rs.reduce((a, r) => a + r.qty, 0).toFixed(2), usd(t(rs)), `${rs.filter((r) => r.contingency).length} (${usd(t(rs.filter((r) => r.contingency)))})`, pr.length, usd(t(pr)), pr.length ? usd(o) : "–", pr.length ? pct(o, t(pr)) : "–", rs.find((r) => !r.priced)?.why ?? ""];
  }));
p("### T13. The priced non-LF items");
table(["Contract", "Item", "Qty", "Library keys", "Material", "Labour", "Equip.", "Ours each", "Tab each", "Gap"],
  N.filter((r) => r.priced).map((r) => [r.key, `${r.desc.slice(0, 60)}${r.contingency ? " (contingency)" : ""}`, r.qty, r.keys.join(", "), d0(r.mat), d0(r.lab), d0(r.eq), d0(r.ours), d0(r.bidEsc), r.gapPct == null ? "–" : `${r.gapPct.toFixed(0)} %`]));
p("### T14. The non-LF items we cannot price yet");
table(["Contract", "Item", "Qty", "Tab each", "Why"], N.filter((r) => !r.priced).map((r) => [r.key, r.desc.slice(0, 80), r.qty, d0(r.bidEsc), r.why]));

// ---------- 7. Three ways ----------
p("### T15. The gap three ways, and the non-LF share of each tab");
p("Tab total: the median bidder's base bid where every bidder's total was read, else the sum of every item's median (marked *), escalated. Non-LF = the water and sewer appurtenance items above; \"priced\" excludes the contingency items and the ones we cannot price.");
p();
const rows3 = C.map((c) => [
  c.key,
  `${usd(c.tabTotal)}${c.tabTotalBasis === "median bidder's base bid" ? "" : " *"}`,
  usd(c.pipeTab), usd(c.pipeOurs), pct(c.pipeOurs, c.pipeTab),
  usd(c.nonLfTabAll), `${((c.nonLfTabAll / c.tabTotal) * 100).toFixed(1)} %`,
  usd(c.nonLfTabPriced), usd(c.nonLfOurs), c.nonLfTabPriced ? pct(c.nonLfOurs, c.nonLfTabPriced) : "–",
  usd(c.pipeTab + c.nonLfTabPriced), usd(c.pipeOurs + c.nonLfOurs), pct(c.pipeOurs + c.nonLfOurs, c.pipeTab + c.nonLfTabPriced),
]);
const tot = (f) => C.reduce((a, c) => a + f(c), 0);
rows3.push(["All 16", usd(tot((c) => c.tabTotal)), usd(tot((c) => c.pipeTab)), usd(tot((c) => c.pipeOurs)), pct(tot((c) => c.pipeOurs), tot((c) => c.pipeTab)), usd(tot((c) => c.nonLfTabAll)), `${((tot((c) => c.nonLfTabAll) / tot((c) => c.tabTotal)) * 100).toFixed(1)} %`, usd(tot((c) => c.nonLfTabPriced)), usd(tot((c) => c.nonLfOurs)), pct(tot((c) => c.nonLfOurs), tot((c) => c.nonLfTabPriced)), usd(tot((c) => c.pipeTab + c.nonLfTabPriced)), usd(tot((c) => c.pipeOurs + c.nonLfOurs)), pct(tot((c) => c.pipeOurs + c.nonLfOurs), tot((c) => c.pipeTab + c.nonLfTabPriced))]);
table(["Contract", "Tab total", "Pipe: tab", "Pipe: ours", "Pipe gap", "Non-LF: tab (all)", "Non-LF share of tab", "Non-LF priced: tab", "Non-LF priced: ours", "Non-LF gap", "All priced: tab", "All priced: ours", "All gap"], rows3);
// ---------- 8. Crossings on the tabs (D-1269 prices them now) ----------
p("### T16. Crossing pay items on the tabs (bores, augers, casings, trenchless): separate items, not in the pipe comparison");
const XING = /BORE|AUGER|TUNNEL|TRENCHLESS|CASING|JACK/;
const xr = [];
for (const c of inputs) {
  const tp = tabPrices.find((t) => t.key === c.key);
  const eci = cmp.get(c.key)?.eci ?? 1;
  for (const i of tp?.items ?? []) {
    if (!XING.test(i.desc.toUpperCase()) || /IRRIGATION|SERVICE/.test(i.desc.toUpperCase())) continue;
    const med = i.prices.length ? [...i.prices].sort((a, b) => a - b)[Math.floor((i.prices.length - 1) / 2)] : null;
    xr.push([c.key, i.unit, d0(i.qty), i.desc.slice(0, 110), med == null ? "–" : d2(med * eci)]);
  }
}
table(["Contract", "Unit", "Qty", "Item", "Tab each (escalated)"], xr);

// ---------- 9. The bid date ----------
p("### T17. The gap against the bid date (pipe LF items)");
const byKey = new Map(C.map((c) => [c.key, c]));
const dated = [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date));
table(["Contract", "Bid", "ECI factor", "Bidders", "Gap (escalated tab)", "Gap (tab as bid)"], dated.map((c) => {
  const rs = P.filter((r) => r.key === c.key);
  return [c.key, c.date, c.eci.toFixed(3), c.bidders, pct(S(rs, (r) => r.ours), S(rs, (r) => r.bidEsc)), pct(S(rs, (r) => r.ours), S(rs, (r) => r.tabMedian))];
}));
const early = (r) => byKey.get(r.key).date < cfg.recentFrom;
table(["Group", `Bid before ${cfg.recentFrom}: tab`, "ours", "gap", `Bid ${cfg.recentFrom} on: tab`, "ours", "gap"], [
  ["sanitary", (r) => r.type === "sanitary"], ["storm under 48 in", (r) => r.type === "storm" && r.nominal < 48], ["storm 48 in +", (r) => r.type === "storm" && r.nominal >= 48], ["water", (r) => r.type === "water"], ["all", () => true],
].map(([n, f]) => {
  const a = P.filter((r) => f(r) && early(r));
  const b = P.filter((r) => f(r) && !early(r));
  return [n, usd(S(a, (r) => r.bidEsc)), usd(S(a, (r) => r.ours)), pct(S(a, (r) => r.ours), S(a, (r) => r.bidEsc)), usd(S(b, (r) => r.bidEsc)), usd(S(b, (r) => r.ours)), pct(S(b, (r) => r.ours), S(b, (r) => r.bidEsc))];
}));
p(`ECI escalation adds ${usd(S(P, (r) => r.bidEsc - r.tabMedian))} to the 16 tabs' pipe items; against the tabs as bid the gap is ${pct(S(P, (r) => r.ours), S(P, (r) => r.tabMedian))}.`);
console.log(out.join("\n"));

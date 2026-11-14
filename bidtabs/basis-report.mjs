// The bid-tab basis revised (D-1273, revising D-1103; Part 1 of the 2026-11-15 night run): tabs as bid (no ECI
// escalation), every bidder, the recent tabs (within the config's months of the newest tab) as the tuning set and the
// older ones as history, and a bid overlay over our direct cost. No bid figure lives here: every input and output is in
// docs/reference (outside git), and every percentage comes from the overlay config (docs/reference/bid-overlay-d1273.json).
//
//   node bidtabs/basis-report.mjs parse "<Bid tabs dir>" "<overlay config>"
//       the inputs (contracts-16-d1271-2026-11-15.json) read with no pricing: items, LF and tab $ by contract and kind,
//       as bid and on the old escalated basis; the unpriceable items; the added items apart; the items kept out of tuning.
//   node bidtabs/basis-report.mjs score "<Bid tabs dir>" "<overlay config>" "<runner results json>" "<out prefix>"
//       our bid per item from contract-runner.js's lines (labour, equipment, material, disposal, subcontract, each the
//       Estimating table's own column), scored per contract against every bidder on the same items; the calibration
//       multipliers; the sanitary long runs. Writes <out prefix>-items.{json,csv}, -contracts.{json,csv} and -tables.md.
//
// Each bidder's total on a contract is that bidder's unit price x quantity summed over the items we price. A tab row
// read with every bidder's price gives each bidder their own; a row read only in part (or not matched) gives every
// bidder the item's verified median (`median` in the input), and the count of such rows is reported.

import { readFileSync, writeFileSync } from "node:fs";

const [, , mode, dir, cfgPath, resultsPath, outPrefix] = process.argv;
const INPUT = "contracts-16-d1271-2026-11-15.json";
const J = (f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const inputs = J(INPUT);
// The tab's prices (the config names the read, D-1273 re-read), with the rows tab-rows-reread.py recovered put in place
// of the text-layer read where every bidder's price was recovered.
const tabPrices = new Map(J(cfg.basis.tabPrices ?? "tab-prices-2026-11-15.json").map((c) => [c.key, c]));
const reread = cfg.basis.tabRowsReread ? J(cfg.basis.tabRowsReread) : [];
const rereadUsed = [];
for (const r of reread) {
  const T = tabPrices.get(r.key);
  const row = T?.items.find((x) => x.unit === "LF" && x.qty === r.qty && String(x.no) === String(r.itemNo));
  if (!T || r.prices.length !== T.bidders || r.unpaired !== 0) continue;
  // A row the item list never had (a later section of the tab) joins it as read.
  if (!row) T.items.push({ no: r.itemNo, page: r.pages[0], unit: "LF", qty: r.qty, desc: r.rows[0].text, prices: r.prices, reread: true });
  rereadUsed.push({ key: r.key, no: r.itemNo, qty: r.qty, before: row ? row.prices.length : 0, after: r.prices.length, pages: r.pages });
  if (row) row.prices = r.prices;
}
const cmp = new Map(J("contract-cmp-all-2026-11-12.json").map((c) => [c.key, c]));

const median = (a) => {
  const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
};
const usd = (x) => (x == null || !Number.isFinite(x) ? "–" : `${x < 0 ? "−" : ""}$${Math.round(Math.abs(x)).toLocaleString("en-US")}`);
const d0 = (x) => (x == null ? "–" : Math.round(x).toLocaleString("en-US"));
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

// ---------- The tuning window ----------
const month = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
};
const ymOf = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
const dates = inputs.map((c) => cmp.get(c.key)?.date).filter(Boolean);
const newest = Math.max(...dates.map(month));
const cutoff = newest - cfg.basis.recentMonths;
const isRecent = (key) => month(cmp.get(key).date) >= cutoff;

// ---------- Each item's tab row and every bidder's price ----------
const sizeRe = (n) => new RegExp(`(^|[^\\d])${String(n).replace(/[^\dx.]/g, "")}\\s*(["”″]|IN|-INCH)`, "i");
function tabRowOf(key, it) {
  const T = tabPrices.get(key);
  if (!T) return null;
  // An added item names its own row (`tabItem`): its number and words, since a tab numbers each section from 1.
  if (it.tabItem) {
    const hit = T.items.find((x) => String(x.no) === String(it.tabItem.no) && x.desc === it.tabItem.desc && x.qty === it.qty);
    if (hit) return hit;
  }
  const cands = T.items.filter((x) => x.unit === "LF" && x.qty === it.qty);
  return cands.find((x) => sizeRe(it.nominal).test(x.desc)) ?? cands[0] ?? null;
}
function bidderPrices(key, it) {
  const T = tabPrices.get(key);
  const row = tabRowOf(key, it);
  if (row && row.prices.length === T.bidders) return { prices: row.prices, full: true, row };
  return { prices: Array.from({ length: T.bidders }, () => it.median), full: false, row };
}
const excluded = (cfg.excludeFromTuning ?? []).map((x) => {
  const T = tabPrices.get(x.key);
  const re = new RegExp(x.match.descPattern, "i");
  const row = T.items.find((i) => i.unit === x.match.unit && i.qty === x.match.qty && re.test(i.desc)) ?? null;
  return { ...x, row };
});
const isExcluded = (key, it) => excluded.some((x) => x.key === key && x.row && tabRowOf(key, it) === x.row);

const kindOf = (it) => (it.type === "fire_water" ? "water" : it.type);
const sum = (rs, f) => rs.reduce((t, r) => t + f(r), 0);

if (mode === "parse") {
  const rows = [];
  for (const c of inputs) {
    const k = cmp.get(c.key);
    for (const it of c.items) {
      const bp = bidderPrices(c.key, it);
      const asBid = median(bp.prices);
      rows.push({ key: c.key, date: k.date, recent: isRecent(c.key), type: kindOf(it), nominal: it.nominal, entry: it.entry, qty: it.qty, added: Boolean(it.added), unpriceable: it.unpriceable ?? null, excluded: isExcluded(c.key, it), full: bp.full, asBid, tabAsBid: asBid * it.qty, tabOldEsc: it.median * k.eci * it.qty, tabOld: it.median * it.qty });
    }
  }
  const line = (label, rs) => [label, d0(rs.length), d0(sum(rs, (r) => r.qty)), usd(sum(rs, (r) => r.tabAsBid)), usd(sum(rs, (r) => r.tabOldEsc)), pc(sum(rs, (r) => r.tabAsBid) / sum(rs, (r) => r.tabOldEsc) - 1)];
  const head = ["", "Items", "LF", "Tab $ as bid (every bidder's median)", "Tab $ old basis (first-block median x ECI)", "As bid vs old"];
  p(`# Parse of ${INPUT} (no pricing)`);
  p();
  p(`Newest tab bid ${ymOf(newest)}; the tuning set is tabs bid ${ymOf(cutoff)} or later (${cfg.basis.recentMonths} months); older tabs are history.`);
  p(`Tab rows re-read word by word and put in place (tab-rows-reread.py): ${rereadUsed.length}.`);
  p();
  p("## By contract");
  table(["Contract", "Bid", "Set", "Items", "LF", "Tab $ as bid", "Tab $ old escalated", "Added items", "Rows read in part"], inputs.map((c) => {
    const rs = rows.filter((r) => r.key === c.key);
    return [c.key, cmp.get(c.key).date, isRecent(c.key) ? "recent" : "history", d0(rs.length), d0(sum(rs, (r) => r.qty)), usd(sum(rs, (r) => r.tabAsBid)), usd(sum(rs, (r) => r.tabOldEsc)), d0(rs.filter((r) => r.added).length), d0(rs.filter((r) => !r.full).length)];
  }));
  p("## By kind");
  const kinds = [...new Set(rows.map((r) => r.type))].sort();
  table(head, [...kinds.map((k) => line(k, rows.filter((r) => r.type === k))), line("**All**", rows)]);
  p("## Recent and history");
  table(head, [line("Recent", rows.filter((r) => r.recent)), line("History", rows.filter((r) => !r.recent)), line("All", rows)]);
  p("## Priceable, unpriceable, added");
  const pr = rows.filter((r) => !r.unpriceable);
  table(head, [line("All items", rows), line("Unpriceable", rows.filter((r) => r.unpriceable)), line("Priceable", pr), line("Priceable, the added items", pr.filter((r) => r.added)), line("Priceable, the items before", pr.filter((r) => !r.added))]);
  p("### Unpriceable items");
  table(["Contract", "Kind", "Pipe", "LF", "Tab $ as bid", "Why"], rows.filter((r) => r.unpriceable).map((r) => [r.key, r.type, `${r.nominal} ${r.entry}`, d0(r.qty), usd(r.tabAsBid), r.unpriceable]));
  p("### The added items (D-1271 follow-up)");
  const added = rows.filter((r) => r.added && !r.unpriceable);
  table(["Contract", "Set", "Kind", "Pipe", "LF", "$/LF as bid", "Tab $ as bid", "Row read in full"], added.map((r) => [r.key, r.recent ? "recent" : "history", r.type, `${r.nominal}" ${r.entry}`, d0(r.qty), d2(r.asBid), usd(r.tabAsBid), r.full ? "yes" : "no: median"]));
  p("By kind:");
  p();
  table(head, [...kinds.map((k) => line(k, added.filter((r) => r.type === k))).filter((r) => r[1] !== "0"), line("**All added**", added)]);
  p("### Kept out of tuning (D-1272 item 11)");
  table(["Contract", "Tab item", "Pipe", "LF", "$/LF as bid (every bidder's median)", "Tab $ as bid", "In the input", "Why"], excluded.map((x) => [x.key, x.row ? `#${x.row.no}` : "not found", x.pipe, d0(x.match.qty), d2(x.row ? median(x.row.prices) : null), usd(x.row ? median(x.row.prices) * x.match.qty : null), inputs.find((c) => c.key === x.key).items.some((it) => isExcluded(x.key, it)) ? "yes (excluded)" : "no (never added)", x.why]));
  const partial = rows.filter((r) => !r.full);
  p(`Rows read in part or not matched (every bidder at the item's verified median): ${partial.length} — ${partial.map((r) => `${r.key} ${r.nominal}" ${r.type} ${r.qty} LF`).join("; ")}.`);
  p();
  writeFileSync(`${dir}/why-we-bid-low-2026-11-16-parse.json`, JSON.stringify({ input: INPUT, newest: ymOf(newest), cutoff: ymOf(cutoff), rows, excluded: excluded.map((x) => ({ key: x.key, tabNo: x.row?.no ?? null, qty: x.match.qty, pipe: x.pipe, asBid: x.row ? median(x.row.prices) : null, why: x.why })) }, null, 1));
  console.log(out.join("\n"));
  process.exit(0);
}

if (mode !== "score") throw new Error("mode: parse | score");

// ---------- Our bid, item by item ----------
const ov = cfg.overlay;
const I = ov.indirects;
const O = ov.ohp;
const pct = (x) => x / 100;
const bondRe = new RegExp(I.bondItemPattern, "i");
const bondItemOf = (key) => tabPrices.get(key).items.find((i) => i.unit !== "LF" && bondRe.test(i.desc)) ?? null;
const salesTax = pct(cfg.basis.salesTaxOnMaterialPct ?? 0);

const results = new Map(JSON.parse(readFileSync(resultsPath, "utf8")).map((r) => [r.key, r]));
const items = [];
for (const c of inputs) {
  const k = cmp.get(c.key);
  const res = results.get(c.key);
  const bondItem = bondItemOf(c.key);
  const bondPct = I.bondOnlyWhenNoBondItem && bondItem ? 0 : pct(I.bondPctOfBid);
  const divisor = 1 - pct(I.glInsurancePctOfBid) - bondPct;
  c.items.forEach((it, i) => {
    const r = res?.items?.[i];
    const bp = bidderPrices(c.key, it);
    const sorted = [...bp.prices].sort((a, b) => a - b);
    const base = { key: c.key, i, date: k.date, recent: isRecent(c.key), type: kindOf(it), entry: it.entry, nominal: it.nominal, depth: it.depth, qty: it.qty, added: Boolean(it.added), excluded: isExcluded(c.key, it), rowFull: bp.full, bidders: bp.prices.length, prices: bp.prices, low: sorted[0], second: sorted[1] ?? null, median: median(bp.prices), unpriceable: it.unpriceable ?? null };
    if (!r || r.ours == null || it.unpriceable) {
      items.push({ ...base, priced: false, why: it.unpriceable ?? (res ? "the runner did not price it" : "contract not priced") });
      return;
    }
    if (r.qty !== it.qty || r.entry !== it.entry || String(r.nominal) !== String(it.nominal)) throw new Error(`result and input differ at ${c.key} #${i}`);
    const ratio = k.labourRatio;
    const L = r.labPerLF * ratio;
    const E = r.eqPerLF;
    const D = r.dispPerLF ?? 0;
    const S = (r.subPerLF ?? 0) + (O.disposalAs === "subcontract" ? D : 0);
    const M = r.matPerLF * (1 + salesTax) + (O.disposalAs === "material" ? D : 0);
    const direct = L + E + M + S;
    const Lp = L * (1 + pct(I.supervisionPctOfLabourAndEquipment) + pct(I.smallToolsPctOfLabour));
    const Ep = E * (1 + pct(I.supervisionPctOfLabourAndEquipment));
    const bid = (Lp * (1 + pct(O.labourPct)) + Ep * (1 + pct(O.equipmentPct)) + M * (1 + pct(O.materialPct)) + S * (1 + pct(O.subcontractPct))) / divisor;
    const rank = 1 + bp.prices.filter((x) => x < bid).length;
    items.push({ ...base, priced: true, ratio, bondPct, L, E, M, S, D, direct, bid, bidOverDirect: bid / direct, vsLow: bid / base.low - 1, vsMedian: bid / base.median - 1, directVsMedian: direct / base.median - 1, rank, unmatched: r.unmatched ?? [] });
  });
}

// ---------- Per contract ----------
function score(key, filter) {
  const rs = items.filter((r) => r.key === key && r.priced && !r.excluded && filter(r));
  if (!rs.length) return null;
  const n = rs[0].bidders;
  const totals = Array.from({ length: n }, (_, j) => sum(rs, (r) => r.prices[j] * r.qty));
  const sorted = [...totals].sort((a, b) => a - b);
  const bid = sum(rs, (r) => r.bid * r.qty);
  const direct = sum(rs, (r) => r.direct * r.qty);
  return { key, date: cmp.get(key).date, recent: isRecent(key), items: rs.length, lf: sum(rs, (r) => r.qty), partRows: rs.filter((r) => !r.rowFull).length, bidders: n, bid, direct, L: sum(rs, (r) => r.L * r.qty), E: sum(rs, (r) => r.E * r.qty), M: sum(rs, (r) => r.M * r.qty), S: sum(rs, (r) => r.S * r.qty), low: sorted[0], second: sorted[1] ?? null, median: median(totals), high: sorted[n - 1], rank: 1 + totals.filter((t) => t < bid).length, vsLow: bid / sorted[0] - 1, vsSecond: sorted[1] ? bid / sorted[1] - 1 : null, vsMedian: bid / median(totals) - 1, bidOverDirect: bid / direct, directVsMedian: direct / median(totals) - 1, lowOverDirect: sorted[0] / direct, medianOverDirect: median(totals) / direct, bondPct: rs[0].bondPct, bondItem: bondItemOf(key)?.desc?.slice(0, 60) ?? null };
}
const keys = inputs.map((c) => c.key).sort((a, b) => month(cmp.get(a).date) - month(cmp.get(b).date) || a.localeCompare(b));
const withAdded = keys.map((k) => score(k, () => true)).filter(Boolean);
const noAdded = keys.map((k) => score(k, (r) => !r.added)).filter(Boolean);

const contractRows = (cs) =>
  cs.map((c) => [c.key, c.date, d0(c.items), d0(c.lf), String(c.bidders), usd(c.direct), usd(c.bid), usd(c.low), c.second == null ? "–" : usd(c.second), usd(c.median), `${c.rank} of ${c.bidders + 1}`, pc(c.vsLow), pc(c.vsMedian), d3(c.bidOverDirect), pc(c.directVsMedian)]);
const totalRow = (label, cs) => {
  const bid = sum(cs, (c) => c.bid);
  const direct = sum(cs, (c) => c.direct);
  const low = sum(cs, (c) => c.low);
  const med = sum(cs, (c) => c.median);
  const second = sum(cs, (c) => c.second ?? c.low);
  return [`**${label}**`, "", d0(sum(cs, (c) => c.items)), d0(sum(cs, (c) => c.lf)), "", usd(direct), usd(bid), usd(low), usd(second), usd(med), `${cs.filter((c) => c.rank === 1).length} low`, pc(bid / low - 1), pc(bid / med - 1), d3(bid / direct), pc(direct / med - 1)];
};
const HEAD = ["Contract", "Bid", "Items", "LF", "Bidders", "Our direct", "Our bid", "Low", "2nd", "Median", "Our rank", "± low", "± median", "Bid ÷ direct", "Direct vs median"];

// ---------- Calibration ----------
function fit(cs, target) {
  const pts = cs.map((c) => Math.log(c[target] / c.direct));
  const lnK = pts.reduce((t, x) => t + x, 0) / pts.length;
  const resid = Math.sqrt(pts.reduce((t, x) => t + (x - lnK) ** 2, 0) / Math.max(1, pts.length - 1));
  return { k: Math.exp(lnK), spread: resid, weighted: sum(cs, (c) => c[target]) / sum(cs, (c) => c.direct), n: cs.length };
}
const calib = [];
for (const [label, cs] of [["Recent, with the added items", withAdded.filter((c) => c.recent)], ["Recent, without the added items", noAdded.filter((c) => c.recent)], ["History, with the added items", withAdded.filter((c) => !c.recent)], ["History, without the added items", noAdded.filter((c) => !c.recent)], ["All 16, with the added items", withAdded], ["All 16, without the added items", noAdded]]) {
  calib.push({ label, low: fit(cs, "low"), median: fit(cs, "median"), overlay: sum(cs, (c) => c.bid) / sum(cs, (c) => c.direct) });
}

// ---------- Sanitary long runs ----------
const longRuns = items.filter((r) => r.priced && !r.excluded && r.type === "sanitary" && r.qty >= cfg.sanitaryLongRunLf);
const lrLine = (label, rs) => {
  const lf = sum(rs, (r) => r.qty);
  const bid = sum(rs, (r) => r.bid * r.qty);
  const direct = sum(rs, (r) => r.direct * r.qty);
  const low = sum(rs, (r) => r.low * r.qty);
  const med = sum(rs, (r) => r.median * r.qty);
  return [label, d0(rs.length), d0(lf), usd(direct), usd(bid), usd(low), usd(med), pc(bid / low - 1), pc(bid / med - 1), pc(direct / med - 1), d0(rs.filter((r) => r.bid < r.low).length), d0(rs.filter((r) => r.bid > r.median).length)];
};

// ---------- Tables ----------
p(`Newest tab bid ${ymOf(newest)}; recent = bid ${ymOf(cutoff)} or later. Labour at each tab's bid-date prevailing rate (D-1103's ratio); no escalation; sales tax on material ${cfg.basis.salesTaxOnMaterialPct} %. Overlay from bid-overlay-d1273.json: L x ${(1 + pct(I.supervisionPctOfLabourAndEquipment) + pct(I.smallToolsPctOfLabour)).toFixed(2)} x ${(1 + pct(O.labourPct)).toFixed(2)}, E x ${(1 + pct(I.supervisionPctOfLabourAndEquipment)).toFixed(2)} x ${(1 + pct(O.equipmentPct)).toFixed(2)}, M and S x ${(1 + pct(O.materialPct)).toFixed(2)}, ÷ (1 − ${I.glInsurancePctOfBid} % − ${I.bondPctOfBid} % bond where the tab has no bond item).`);
p(`Tab rows re-read word by word and put in place (tab-rows-reread.py): ${rereadUsed.length} (${rereadUsed.map((r) => `${r.key} #${r.no} ${r.qty} LF ${r.before}→${r.after}`).join("; ")}).`);
p();
p("### B1. Recent tabs (the tuning set), per contract, with the added items");
table(HEAD, [...contractRows(withAdded.filter((c) => c.recent)), totalRow("Recent", withAdded.filter((c) => c.recent))]);
p("### B2. History tabs, per contract, with the added items");
table(HEAD, [...contractRows(withAdded.filter((c) => !c.recent)), totalRow("History", withAdded.filter((c) => !c.recent))]);
p("### B3. Recent tabs, without the added items");
table(HEAD, [...contractRows(noAdded.filter((c) => c.recent)), totalRow("Recent", noAdded.filter((c) => c.recent))]);
p("### B4. History tabs, without the added items");
table(HEAD, [...contractRows(noAdded.filter((c) => !c.recent)), totalRow("History", noAdded.filter((c) => !c.recent))]);
p("### B5. Calibration: the single multiplier on our direct cost");
const [hLo, hHi] = cfg.calibration.healthyToMedian;
p(`${cfg.calibration.method}. Spread: the standard deviation of the per-contract log ratio. Healthy is ${hLo.toFixed(2)}–${hHi.toFixed(2)} to the medians (our direct ${Math.round(100 / hHi)}–${Math.round(100 / hLo)} % of the median); under ${hLo.toFixed(2)} our direct is high. The overlay's bid ÷ direct is its own result, not a target.`);
p();
table(["Set", "Contracts", "k to the low (log LS)", "spread", "k to the low ($-weighted)", "k to the median (log LS)", "spread", "k to the median ($-weighted)", "Our overlay's bid ÷ direct", "Direct vs median (1/k − 1)", "k to the median healthy?"], calib.map((c) => [c.label, String(c.low.n), d3(c.low.k), d3(c.low.spread), d3(c.low.weighted), d3(c.median.k), d3(c.median.spread), d3(c.median.weighted), d3(c.overlay), pc(1 / c.median.k - 1), c.median.k < hLo ? "no: direct high" : c.median.k > hHi ? "no: direct low" : "yes"]));
p("### B6. By kind, per item (LF-weighted, as bid, every bidder; recent and history apart)");
{
  const rows = [];
  for (const set of ["recent", "history"])
    for (const kind of ["water", "force_main", "sanitary", "storm"]) {
      const rs = items.filter((r) => r.priced && !r.excluded && r.type === kind && (set === "recent") === r.recent);
      if (!rs.length) continue;
      const lf = sum(rs, (r) => r.qty);
      const bid = sum(rs, (r) => r.bid * r.qty);
      const direct = sum(rs, (r) => r.direct * r.qty);
      const low = sum(rs, (r) => r.low * r.qty);
      const med = sum(rs, (r) => r.median * r.qty);
      rows.push([`${set} ${kind}`, d0(rs.length), d0(lf), usd(direct), usd(bid), usd(low), usd(med), pc(bid / low - 1), pc(bid / med - 1), d3(med / direct), d3(low / direct)]);
    }
  table(["Group", "Items", "LF", "Our direct", "Our bid", "Item lows", "Item medians", "± item lows", "± item medians", "Median ÷ direct", "Low ÷ direct"], rows);
}
p("### B7. Sanitary long runs (an item of " + cfg.sanitaryLongRunLf.toLocaleString("en-US") + " LF and up)");
table(["Set", "Items", "LF", "Our direct", "Our bid", "Item lows", "Item medians", "± lows", "± medians", "Direct vs median", "Under the item's low", "Over the item's median"], [lrLine("Recent", longRuns.filter((r) => r.recent)), lrLine("History", longRuns.filter((r) => !r.recent)), lrLine("All", longRuns)]);
table(["Contract", "Set", "Pipe", "Depth ft", "LF", "Direct $/LF", "Bid $/LF", "Low", "Median", "± low", "± median", "Rank"], longRuns.map((r) => [r.key, r.recent ? "recent" : "history", `${r.nominal}" ${r.entry}`, r.depth == null ? "–" : String(r.depth), d0(r.qty), d2(r.direct), d2(r.bid), d2(r.low), d2(r.median), pc(r.vsLow), pc(r.vsMedian), `${r.rank} of ${r.bidders + 1}`]));
p("### B8. Items not priced or kept out");
table(["Contract", "Pipe", "LF", "Why"], items.filter((r) => !r.priced || r.excluded).map((r) => [r.key, `${r.nominal} ${r.entry}`, d0(r.qty), r.excluded ? "kept out of tuning" : r.why]));
p("Kept out of tuning and never in the input (D-1272 item 11): " + excluded.map((x) => `${x.key} #${x.row?.no ?? "?"} ${x.pipe}, ${x.match.qty} LF, as bid ${usd(x.row ? median(x.row.prices) * x.match.qty : null)}`).join("; ") + ".");
p();
p(`Bond: ${withAdded.filter((c) => c.bondPct === 0).map((c) => `${c.key} (its own bond item)`).join(", ")} carry no bond in the overlay; the rest ${I.bondPctOfBid} %.`);
p();

writeFileSync(`${outPrefix}-tables.md`, out.join("\n"));
writeFileSync(`${outPrefix}-items.json`, JSON.stringify(items, null, 1));
writeFileSync(`${outPrefix}-contracts.json`, JSON.stringify({ newest: ymOf(newest), cutoff: ymOf(cutoff), config: cfg, withAdded, noAdded, calibration: calib }, null, 1));
const csv = (rows, cols) => [cols.join(","), ...rows.map((r) => cols.map((c2) => (typeof r[c2] === "number" ? Math.round(r[c2] * 10000) / 10000 : JSON.stringify(r[c2] ?? ""))).join(","))].join("\n");
writeFileSync(`${outPrefix}-items.csv`, csv(items, ["key", "date", "recent", "type", "entry", "nominal", "depth", "qty", "added", "excluded", "priced", "L", "E", "M", "S", "D", "direct", "bid", "bidOverDirect", "bidders", "low", "second", "median", "rank", "vsLow", "vsMedian", "directVsMedian", "rowFull", "bondPct", "why"]));
writeFileSync(`${outPrefix}-contracts.csv`, csv([...withAdded.map((c) => ({ ...c, set: "with added" })), ...noAdded.map((c) => ({ ...c, set: "without added" }))], ["set", "key", "date", "recent", "items", "lf", "bidders", "partRows", "L", "E", "M", "S", "direct", "bid", "low", "second", "median", "high", "rank", "vsLow", "vsSecond", "vsMedian", "bidOverDirect", "directVsMedian", "lowOverDirect", "medianOverDirect", "bondPct"]));
console.log(out.join("\n"));

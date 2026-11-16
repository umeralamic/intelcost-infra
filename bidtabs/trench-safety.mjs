// D-1296 (R4, the founder's Q1 of REPORT_2026-11-19): each tab's separately paid trench-safety pay items, mapped to the
// compared pipe items they cover, so the comparison can add the tab's trench-safety $ to the item's median (and its low
// to the low), as the separately paid fittings were added (FITTINGS-CHECK.md way (ii)). No bid figure or tab text lives
// here: the tabs, the input and the output are in docs/reference (outside git); only the generic patterns below are.
//
//   node bidtabs/trench-safety.mjs "<Bid tabs dir>" "<out json>" [--input=contracts-16-d1271-2026-11-15.json]
//        [--tabPrices=tab-prices-2026-11-16.json] [--reread=tab-rows-reread-2026-11-16.json]
//
// Found by keyword (TRENCH SAFETY / TRENCH PROTECTION / OSHA trench), every row of every tab, any unit; checked by hand
// on the 16 tabs (2026-11-16: only "TRENCH SAFETY (SYSTEM)" rows, all LF; no shoring, sheeting or OSHA row besides).
// Each item is mapped by the first rule that finds pipe rows:
//   "segment": its text opens with a run's segment ("(M.H. S-20 - M.H. S-12) TRENCH SAFETY ...") and a pipe row of the
//              same section opens with the same segment: that row;
//   "section": the pipe rows of its own section (a tab numbers each section from 1, so a section is the rows between two
//              restarts of the item number) listed before it, or after it when none is before. Its kind words ("FOR
//              WATER LINE", "FOR SANITARY SEWER", "FOR STORM SEWER") are checked against the rows' kinds;
//   "spread":  none of the above: every pipe row of the tab.
// The $ each covered row takes, per LF of pipe: the item's unit price (median of the bidders', and the lowest) times
// min(1, item LF ÷ covered LF). An item longer than the pipe it covers (its LF carries the lateral leads, or a box
// culvert the comparison does not price) adds its unit price per LF of compared pipe, no more; an item shorter than the
// pipe it covers is spread whole over it. The covered LF counts every pipe row the item covers, compared or not (a box
// culvert, an irrigation line); a section's long-side service leads are reported beside it, never counted in it.
// "Whole $" (sensitivity): the item's whole $ spread over the compared rows it covers only.
// A row read with fewer prices than the tab has bidders uses the prices read, and is flagged.

import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const opt = (k, d) => argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=") ?? d;
const [dir, outPath] = argv.filter((a) => !a.startsWith("--"));
const J = (f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));

const TS = /TRENCH\s+SAFETY|TRENCH\s+PROTECTION|OSHA\b[^.]*TRENCH/i;
const PIPE = /(WATER|SEWER|IRRIGATION|COLLECTION)\s+(LINE|PIPE)|WATER\s+PIPE|STORM\s+(\w+\s+)?SEWER|FORCE\s+MAIN|BOX\s+CULVERT/i;
const NOT_PIPE = /TRENCH\s+SAFETY|SERVICE|DEWATER|INSPECTION|T\.\s*V\.|VIDEO|\bTV\b|CASING|AUGER|\bBORE\b|TRENCHLESS|REMOV|ADDITIONAL|EXTRA|WET\s+SAND|SLEEVE|BEDDING\s+FOR|LOW\s+WATER\s+CROSSING|IN\s+LIEU|CLEAN/i;
const LEAD = /SERVICE\s+LEAD/i;
const KIND_WORDS = [
  [/FOR\s+WATER\s+LINE/i, "water"],
  [/FOR\s+SANITARY\s+SEWER/i, "sanitary"],
  [/FOR\s+STORM\s+SEWER/i, "storm"],
  [/FOR\s+FORCE\s+MAIN/i, "force_main"],
];
const kindOfText = (d) => (/FORCE\s+MAIN/i.test(d) ? "force_main" : /STORM|BOX\s+CULVERT|R\.?C\.?P/i.test(d) ? "storm" : /SANITARY|SEWER\s+PIPE/i.test(d) ? "sanitary" : /WATER|IRRIGATION|COLLECTION/i.test(d) ? "water" : null);
const segOf = (d) => (d ?? "").trim().match(/^\(([^)]+)\)/)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
const median = (a) => {
  const s = a.filter(Number.isFinite).sort((x, y) => x - y);
  const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
};

// The tabs as basis-report.mjs reads them, a re-read row the item list never had put in its place in the reading order
// (before the row of the same page numbered one after it whose slot is empty), so sections stay whole.
const tabs = new Map(J(opt("tabPrices", "tab-prices-2026-11-16.json")).map((c) => [c.key, c]));
const rereads = J(opt("reread", "tab-rows-reread-2026-11-16.json"));
for (const r of [...rereads].sort((a, b) => Number(b.itemNo) - Number(a.itemNo))) {
  const T = tabs.get(r.key);
  if (!T) continue;
  const row = T.items.find((x) => x.unit === "LF" && x.qty === r.qty && String(x.no) === String(r.itemNo));
  if (row) {
    if (r.prices?.length === T.bidders && r.unpaired === 0) row.prices = r.prices;
    continue;
  }
  const add = { no: r.itemNo, page: r.pages[0], unit: "LF", qty: r.qty, desc: r.rows[0].text, prices: r.prices ?? [], reread: true };
  const at = T.items.findIndex((x, j) => x.page === add.page && Number(x.no) === Number(add.no) + 1 && (j === 0 || Number(T.items[j - 1].no) !== Number(add.no)));
  if (at >= 0) T.items.splice(at, 0, add);
  else T.items.push(add);
}
const input = J(opt("input", "contracts-16-d1271-2026-11-15.json"));

// An input item's tab row, as basis-report.mjs:tabRowOf finds it.
const sizeRe = (n) => new RegExp(`(^|[^\\d])${String(n).replace(/[^\dx.]/g, "")}\\s*(["”″]|IN|-INCH)`, "i");
function tabRowOf(T, it) {
  if (it.tabItem) {
    const hit = T.items.find((x) => String(x.no) === String(it.tabItem.no) && x.desc === it.tabItem.desc && x.qty === it.qty);
    if (hit) return hit;
  }
  const cands = T.items.filter((x) => x.unit === "LF" && x.qty === it.qty);
  return cands.find((x) => sizeRe(it.nominal).test(x.desc)) ?? cands[0] ?? null;
}

const items = [];
const tabsOut = [];
for (const c of input) {
  const T = tabs.get(c.key);
  if (!T) throw new Error(`no tab prices for ${c.key}`);
  const rows = T.items;
  // Sections: a new one wherever the item number does not go up.
  const sec = [];
  let s = 0;
  rows.forEach((x, j) => {
    if (j > 0 && !(Number(x.no) > Number(rows[j - 1].no))) s++;
    sec.push(s);
  });
  // The compared rows (every input item, priced or not), and the other pipe rows (the covered LF's denominators).
  const compared = new Map();
  c.items.forEach((it, i) => {
    const r = tabRowOf(T, it);
    if (!r) return;
    const j = rows.indexOf(r);
    (compared.get(j) ?? compared.set(j, []).get(j)).push(i);
  });
  const isPipe = (j) => compared.has(j) || (rows[j].unit === "LF" && PIPE.test(rows[j].desc ?? "") && !NOT_PIPE.test(rows[j].desc ?? ""));
  const kindOfRow = (j) => (compared.has(j) ? c.items[compared.get(j)[0]].type : kindOfText(rows[j].desc ?? ""));
  const add = new Map(c.items.map((_, i) => [i, { med: 0, low: 0, wholeMed: 0, wholeLow: 0, ts: [] }]));
  const tsOut = [];
  rows.forEach((x, j) => {
    if (!TS.test(x.desc ?? "")) return;
    const prices = (x.prices ?? []).filter(Number.isFinite);
    const med = median(prices);
    const low = prices.length ? Math.min(...prices) : null;
    const seg = segOf(x.desc);
    const named = KIND_WORDS.find(([re]) => re.test(x.desc ?? ""))?.[1] ?? null;
    const same = rows.map((_, k) => k).filter((k) => k !== j && sec[k] === sec[j] && isPipe(k));
    let rule = null;
    let cover = [];
    if (seg) {
      cover = same.filter((k) => segOf(rows[k].desc) === seg);
      if (cover.length) rule = "segment";
    }
    if (!rule) {
      const before = same.filter((k) => k < j);
      cover = before.length ? before : same.filter((k) => k > j);
      if (cover.length) rule = before.length ? "section (pipe rows before it)" : "section (pipe rows after it)";
    }
    if (!rule) {
      cover = rows.map((_, k) => k).filter((k) => k !== j && isPipe(k));
      rule = "spread (no pipe row in its section: every pipe row of the tab)";
    }
    // The long-side leads of its section, reported only: an item that equals its mains' LF while "including all lateral
    // leads" prices the leads inside its unit price, so the leads never shrink what a main's LF takes.
    const leads = /LATERAL/i.test(x.desc ?? "") && rule !== "segment" ? rows.map((_, k) => k).filter((k) => sec[k] === sec[j] && rows[k].unit === "LF" && LEAD.test(rows[k].desc ?? "")) : [];
    const coveredLF = cover.reduce((t, k) => t + rows[k].qty, 0);
    const scale = coveredLF > 0 ? Math.min(1, x.qty / coveredLF) : 0;
    const comparedRows = cover.filter((k) => compared.has(k));
    const comparedLF = comparedRows.reduce((t, k) => t + rows[k].qty, 0);
    const kinds = [...new Set(cover.map(kindOfRow).filter(Boolean))];
    const flags = [];
    if (prices.length !== T.bidders) flags.push(`read with ${prices.length} of ${T.bidders} bidders' prices`);
    if (named && kinds.some((k) => k !== named && !(named === "water" && k === "force_main"))) flags.push(`its text names ${named}, it covers ${kinds.join(" + ")}`);
    if (Math.abs(x.qty - cover.reduce((t, k) => t + rows[k].qty, 0)) > 0.5) flags.push(`its ${x.qty} LF against ${cover.reduce((t, k) => t + rows[k].qty, 0)} LF of the pipe rows it covers${leads.length ? ` (${leads.reduce((t, k) => t + rows[k].qty, 0)} LF of long-side leads in its section)` : ""}`);
    if (!comparedRows.length) flags.push("covers no compared item");
    for (const k of comparedRows)
      for (const i of compared.get(k)) {
        const a = add.get(i);
        a.med += (med ?? 0) * scale;
        a.low += (low ?? 0) * scale;
        a.wholeMed += comparedLF > 0 ? ((med ?? 0) * x.qty) / comparedLF : 0;
        a.wholeLow += comparedLF > 0 ? ((low ?? 0) * x.qty) / comparedLF : 0;
        a.ts.push(j);
      }
    tsOut.push({ row: j, no: x.no, page: x.page, unit: x.unit, qty: x.qty, bidders: prices.length, medUnit: med, lowUnit: low, medTotal: med == null ? null : med * x.qty, lowTotal: low == null ? null : low * x.qty, kindNamed: named, kinds, rule, coverRows: cover, leadRows: leads, coveredLF, scale, comparedItems: comparedRows.flatMap((k) => compared.get(k)), comparedLF, flags });
  });
  // Sections with compared pipe and no trench-safety item: the tab pays none there (inside the pipe price, or none).
  const tsSecs = new Set(tsOut.map((t) => sec[t.row]));
  const bare = [...new Set([...compared.keys()].map((k) => sec[k]))].filter((x) => !tsSecs.has(x)).map((x) => ({ section: x, items: [...compared.entries()].filter(([k]) => sec[k] === x).flatMap(([, v]) => v), kinds: [...new Set([...compared.entries()].filter(([k]) => sec[k] === x).map(([k]) => kindOfRow(k)))] }));
  const uncoveredItems = c.items.map((_, i) => i).filter((i) => add.get(i).ts.length === 0 && [...compared.values()].some((v) => v.includes(i)));
  tabsOut.push({ key: c.key, bidders: T.bidders, tsItems: tsOut, sectionsWithoutTs: bare, itemsWithoutTs: uncoveredItems, notFound: c.items.map((it, i) => (tabRowOf(T, it) ? null : i)).filter((i) => i != null) });
  c.items.forEach((it, i) => {
    const a = add.get(i);
    items.push({ key: c.key, i, type: it.type, entry: it.entry, nominal: it.nominal, qty: it.qty, unpriceable: it.unpriceable ?? null, tsMedPerLF: a.med, tsLowPerLF: a.low, tsWholeMedPerLF: a.wholeMed, tsWholeLowPerLF: a.wholeLow, tsRows: a.ts });
  });
}

writeFileSync(outPath, JSON.stringify({ decision: "D-1296", rule: "per LF of compared pipe: unit price x min(1, item LF / covered LF); whole $ as sensitivity", tabs: tabsOut, items }, null, 1));

// The summary: per tab, its trench-safety items, the rule each took, the $ and the flags (tabs by number only).
const usd = (x) => (x == null || !Number.isFinite(x) ? "–" : `$${Math.round(x).toLocaleString("en-US")}`);
let tm = 0;
let tl = 0;
let am = 0;
let al = 0;
for (const t of tabsOut) {
  const m = t.tsItems.reduce((s, x) => s + (x.medTotal ?? 0), 0);
  const l = t.tsItems.reduce((s, x) => s + (x.lowTotal ?? 0), 0);
  const im = items.filter((i) => i.key === t.key).reduce((s, i) => s + i.tsMedPerLF * i.qty, 0);
  const il = items.filter((i) => i.key === t.key).reduce((s, i) => s + i.tsLowPerLF * i.qty, 0);
  tm += m;
  tl += l;
  am += im;
  al += il;
  console.log(`${t.key}: ${t.tsItems.length} trench-safety item(s), median ${usd(m)}, low ${usd(l)}; added to the compared items ${usd(im)} / ${usd(il)}; rules ${[...new Set(t.tsItems.map((x) => x.rule.replace(/ \(.*$/, "")))].join(", ") || "–"}`);
  for (const x of t.tsItems) console.log(`   #${x.no} p${x.page} ${x.qty} ${x.unit}: ${x.rule}; covers ${x.coveredLF} LF (${x.kinds.join(" + ") || "?"}), x ${x.scale.toFixed(4)}; compared items ${x.comparedItems.join(",") || "none"}${x.flags.length ? `; FLAG ${x.flags.join("; ")}` : ""}`);
  if (t.sectionsWithoutTs.length) console.log(`   no trench-safety item in: ${t.sectionsWithoutTs.map((b) => `${b.kinds.join("+")} (items ${b.items.join(",")})`).join("; ")}`);
  if (t.notFound.length) console.log(`   items with no tab row: ${t.notFound.join(",")}`);
}
console.log(`All: ${tabsOut.reduce((s, t) => s + t.tsItems.length, 0)} items, median ${usd(tm)}, low ${usd(tl)}; added to the compared items ${usd(am)} / ${usd(al)} -> ${outPath}`);

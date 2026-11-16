// The boxed harness basis (D-1291, option (c) of REPORT_2026-11-18 Q6; reading R11): every tab run is street or
// subdivision work, so the harness marks it limited width (the app's "Limited width / in street": Auto boxes it over
// 4.5 ft and the run is paved), unless its own item text says otherwise ("outside of pavement areas", an open field).
// The harness marks the runs, not the app. No bid figure or tab text lives here: the inputs and the marked list are in
// docs/reference (outside git); only the generic patterns below are.
//
//   node bidtabs/street-marking.mjs "<contract list json>" "<Bid tabs dir>" "<out json>" [--recentFrom=2025-04]
//       <contract list>: the runner's list (the 16 tabs and the crossing contracts, e.g. the 47 of Rerun 2). Each item
//       is found on its tab (`tab-prices-2026-11-16.json` with `tab-rows-reread-2026-11-16.json`'s recovered rows, as
//       basis-report.mjs finds it; a crossing contract's item through its crossing's tab item in
//       `crossings-input-2026-11-16-d1277-rerun.json`), and gets `limitedWidth` (true / false) and `limitedWhy` (the
//       rule that decided, with the words it matched). Writes the list so marked, and prints the counts per set (recent =
//       bid in or after --recentFrom, D-1273) and every run left open with why.
//
// contract-runner.js with `limitedWidth: "items"` reads the marks and refuses a contract with an item unmarked.

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const [listPath, dir, outPath] = args.filter((a) => !a.startsWith("--"));
const RECENT_FROM = opt("recentFrom", "2025-04");
const J = (f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));

// The item text that says a run is not in a street (open), and the text that says it is under pavement (limited, the
// default's reason made explicit). Checked in this order; the first that matches decides.
const OPEN = [
  [/OUTSIDE\s+(OF\s+)?(THE\s+)?PAVE(MENT|D)/i, "the item text puts it outside pavement"],
  [/NOT\s+UNDER\s+PAVE/i, "the item text says not under pavement"],
  [/OPEN\s+FIELD|UNPAVED|CROSS[\s-]?COUNTRY|UNDEVELOPED/i, "the item text puts it in open ground"],
  [/LOW\s+WATER\s+CROSSING/i, "the item text makes it a temporary low-water crossing pipe (a channel, removed after), not a street run"],
];
const PAVED = [[/UNDER\s+(AND\s+WITHIN\s+\S+\s+OF\s+)?PAV(ING|EMENT)/i, "the item text puts it under (or next to) paving"]];

const tabPrices = new Map(J("tab-prices-2026-11-16.json").map((c) => [c.key, c]));
for (const r of J("tab-rows-reread-2026-11-16.json")) {
  const T = tabPrices.get(r.key);
  if (!T) continue;
  const row = T.items.find((x) => x.unit === "LF" && x.qty === r.qty && String(x.no) === String(r.itemNo));
  if (!row) T.items.push({ no: r.itemNo, page: r.pages[0], unit: "LF", qty: r.qty, desc: r.rows[0].text, reread: true });
}
const crossings = J("crossings-input-2026-11-16-d1277-rerun.json");
const cmp = new Map(J("contract-cmp-all-2026-11-12.json").map((c) => [c.key, c]));

// An item's tab row, as basis-report.mjs:tabRowOf finds it.
const sizeRe = (n) => new RegExp(`(^|[^\\d])${String(n).replace(/[^\dx.]/g, "")}\\s*(["”″]|IN|-INCH)`, "i");
function tabRowOf(key, it) {
  const T = tabPrices.get(key);
  if (!T) return null;
  if (it.tabItem) {
    const hit = T.items.find((x) => String(x.no) === String(it.tabItem.no) && x.desc === it.tabItem.desc && x.qty === it.qty);
    if (hit) return hit;
  }
  const cands = T.items.filter((x) => x.unit === "LF" && x.qty === it.qty);
  return cands.find((x) => sizeRe(it.nominal).test(x.desc)) ?? cands[0] ?? null;
}
// A crossing item's tab row: its crossing's tab item(s) (the bore, the casing), by key and item number.
function crossingRows(key, it) {
  const T = tabPrices.get(key);
  const ids = (crossings.tabItems ?? []).filter((t) => t.crossing === it.xid && t.key === key);
  return ids.map((t) => T?.items.find((x) => String(x.no) === String(t.no) && x.unit === t.unit && x.qty === t.qty) ?? null).filter(Boolean);
}

function mark(key, it) {
  const rows = it.crossing ? crossingRows(key, it) : [tabRowOf(key, it)].filter(Boolean);
  const text = rows.map((r) => r.desc).join(" | ");
  if (!text) return { limitedWidth: true, limitedWhy: `street or subdivision work by default (R11): no tab row text found${it.crossing ? " for the crossing" : ""}`, rowNo: null };
  for (const [re, why] of OPEN) {
    const m = text.match(re);
    if (m) return { limitedWidth: false, limitedWhy: `open: ${why} ("${m[0].toLowerCase()}")`, rowNo: rows.map((r) => r.no).join("+") };
  }
  for (const [re, why] of PAVED) {
    const m = text.match(re);
    if (m) return { limitedWidth: true, limitedWhy: `limited width: ${why} ("${m[0].toLowerCase()}")`, rowNo: rows.map((r) => r.no).join("+") };
  }
  return { limitedWidth: true, limitedWhy: `limited width: street or subdivision work by default (R11); the item text names no other place${it.crossing ? " (the crossing's tab item)" : ""}`, rowNo: rows.map((r) => r.no).join("+") };
}

const month = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
};
const list = JSON.parse(readFileSync(listPath, "utf8"));
const rows = [];
const out = list.map((c) => {
  const key = c.key.replace(/^x:/, "").replace(/~.*$/, "");
  const date = cmp.get(key)?.date ?? null;
  const recent = date ? month(date) >= month(RECENT_FROM) : null;
  return {
    ...c,
    items: c.items.map((it, i) => {
      const m = mark(key, it);
      rows.push({ contract: c.key, i, crossing: Boolean(it.crossing), recent, unpriceable: Boolean(it.unpriceable), type: it.type, pipe: `${it.entry}:${it.nominal}`, qty: it.qty, ...m });
      return { ...it, limitedWidth: m.limitedWidth, limitedWhy: m.limitedWhy };
    }),
  };
});
writeFileSync(outPath, JSON.stringify(out, null, 1));

const count = (f) => {
  const rs = rows.filter(f);
  const lim = rs.filter((r) => r.limitedWidth);
  const lf = (xs) => Math.round(xs.reduce((t, r) => t + r.qty, 0)).toLocaleString("en-US");
  return `${lim.length} of ${rs.length} items limited width (${lf(lim)} of ${lf(rs)} LF)`;
};
const tab = (r) => !r.crossing && !r.contract.startsWith("x:");
console.log(`Marked ${rows.length} items in ${list.length} contracts -> ${outPath}`);
console.log(`Tab contracts, priceable items: recent ${count((r) => tab(r) && !r.unpriceable && r.recent)}; history ${count((r) => tab(r) && !r.unpriceable && r.recent === false)}; all ${count((r) => tab(r) && !r.unpriceable)}`);
console.log(`Crossing contracts' items: ${count((r) => !tab(r))}`);
console.log(`Every item: ${count(() => true)}`);
const byWhy = new Map();
for (const r of rows) byWhy.set(r.limitedWhy.replace(/ \("[^"]*"\)$/, ""), (byWhy.get(r.limitedWhy.replace(/ \("[^"]*"\)$/, "")) ?? 0) + 1);
console.log("By reason:");
for (const [w, n] of byWhy) console.log(`  ${n}  ${w}`);
console.log("Left open (not limited width):");
for (const r of rows.filter((x) => !x.limitedWidth)) console.log(`  ${r.contract} #${r.i} (tab item ${r.rowNo}) ${r.type} ${r.pipe} ${r.qty} LF${r.recent ? " recent" : ""}: ${r.limitedWhy}`);

// The boxed-basis rerun's tables (D-1291, step 3 of the night run from 2026-11-16): per kind and group, the multiplier
// to the medians and to the lows for each pass, our direct cost and its change, the trench per LF for the same runs as
// the Part 6 rerun's T1 (and Rerun 2), the section each kind took, the limited-width marks, the CSS each pass bought,
// and the checks. No bid figure lives here: every input and the output are in docs/reference (outside git).
//
//   node bidtabs/boxed-report.mjs "<out md>" "<label>=<items json>,<contract results json>" [...more passes]
//       each items json is basis-report.mjs's `<prefix>-items.json` for one pass (`score` over that pass's contract
//       results), and the results json is the runner's own for the same pass (the trench trace, the marks, the CSS, the
//       settings it ran with). Put the passes in the order the columns should read, e.g. Rerun 2's (a) (open, the last
//       unboxed pass), then (a), (b) and (b′) of the boxed basis. The first pass is the base the $ changes are read from
//       and the one the trench runs are picked from (the pick reads only each item's pipe, size, depth and LF, so it
//       picks the same runs as Part 6's T1 whenever the items are the same 189).
//
// k to the median = Σ median × qty ÷ Σ our direct × qty (k to the low the same with the low), $-weighted; storm RCP
// groups also as the LF-weighted log mean in brackets (D-1275). Healthy is 1.15–1.30 to the medians, centre 1.22
// (D-1295): our direct excludes supervision, small tools, insurance and bond, so k carries those as well as overhead
// and profit.

import { readFileSync, writeFileSync } from "node:fs";

const [outPath, ...specs] = process.argv.slice(2);
const passes = specs.map((s) => {
  const at = s.indexOf("=");
  const [itemsPath, resultsPath] = s.slice(at + 1).split(",");
  const results = resultsPath ? new Map(JSON.parse(readFileSync(resultsPath, "utf8")).map((c) => [c.key, c])) : new Map();
  return { label: s.slice(0, at), items: JSON.parse(readFileSync(itemsPath, "utf8")).filter((i) => i.priced && !i.excluded), results };
});
const BAND = [1.15, 1.3];

const rcp = (i) => i.type === "storm" && /^rcp_/.test(i.entry);
const KINDS = [
  ["water", (i) => i.type === "water"],
  ["force main", (i) => i.type === "force_main"],
  ["sanitary", (i) => i.type === "sanitary"],
  ["storm RCP 18–42 in", (i) => rcp(i) && Number(i.nominal) >= 18 && Number(i.nominal) <= 42],
  ["storm RCP 48 in+", (i) => rcp(i) && Number(i.nominal) >= 48],
  ["storm other (HDPE, RCP < 18 in)", (i) => i.type === "storm" && !(rcp(i) && Number(i.nominal) >= 18)],
  ["storm (all)", (i) => i.type === "storm"],
  ["all pipe", () => true],
];
const SETS = [["recent", (i) => i.recent], ["history", (i) => !i.recent], ["all", () => true]];
const d3 = (x) => (x == null || !Number.isFinite(x) ? "–" : x.toFixed(3));
const d4 = (x) => (x == null || !Number.isFinite(x) ? "–" : x.toFixed(4));
const usd = (x) => (x == null || !Number.isFinite(x) ? "–" : `${x < 0 ? "−" : ""}$${Math.round(Math.abs(x)).toLocaleString("en-US")}`);
const sgn = (x) => (x > 0 ? "+" : "") + usd(x);
const out = [];
const p = (s = "") => out.push(s);
const table = (head, rows) => {
  p(`| ${head.join(" | ")} |`);
  p(`|${head.map((_, i) => (i === 0 ? "---" : "---:")).join("|")}|`);
  for (const r of rows) p(`| ${r.join(" | ")} |`);
  p();
};
const agg = (list) => {
  const dir = list.reduce((t, i) => t + i.direct * i.qty, 0);
  const med = list.reduce((t, i) => t + i.median * i.qty, 0);
  const low = list.reduce((t, i) => t + i.low * i.qty, 0);
  const lf = list.reduce((t, i) => t + i.qty, 0);
  const wl = (f) => (lf > 0 ? Math.exp(list.reduce((t, i) => t + i.qty * Math.log(f(i) / i.direct), 0) / lf) : null);
  return { n: list.length, lf, dir, kMed: dir ? med / dir : null, kLow: dir ? low / dir : null, logMed: wl((i) => i.median), logLow: wl((i) => i.low) };
};
const inBand = (k) => k != null && k >= BAND[0] - 1e-9 && k <= BAND[1] + 1e-9;
const base = passes[0];
const resultOf = (pass, i) => pass.results.get(i.key)?.items?.[i.i] ?? null;
const twin = (pass, i) => pass.items.find((x) => x.key === i.key && x.i === i.i) ?? null;

p(`# The boxed basis (D-1291): ${passes.map((x) => x.label).join(", ")}`);
p();
p(`k to the median = median ÷ our direct, k to the low = low ÷ our direct ($-weighted; storm RCP also LF-weighted log mean in brackets). Healthy: ${BAND[0].toFixed(2)}–${BAND[1].toFixed(2)} to the medians, centre 1.22 (D-1295).`);
p();

// K1: the multipliers, RERUN2.md's layout with a pair of columns per pass.
p("## K1. Multipliers per kind: to the medians and to the lows");
const k1 = [];
for (const [sn, sf] of SETS)
  for (const [kn, kf] of KINDS) {
    const a = passes.map((x) => agg(x.items.filter((i) => sf(i) && kf(i))));
    if (a.every((x) => x.n === 0)) continue;
    const br = /RCP|other/.test(kn);
    const n0 = a.find((x) => x.n > 0);
    k1.push([sn, kn, `${n0.n} / ${Math.round(n0.lf).toLocaleString("en-US")}`, ...a.flatMap((x) => [d3(x.kMed) + (br ? ` (${d3(x.logMed)})` : ""), d3(x.kLow) + (br ? ` (${d3(x.logLow)})` : "")])]);
  }
table(["Set", "Kind / group", "Items / LF", ...passes.flatMap((x) => [`${x.label} k med`, `${x.label} k low`])], k1);
for (const x of passes) {
  const hits = [];
  for (const [sn, sf] of SETS)
    for (const [kn, kf] of KINDS) {
      const a = agg(x.items.filter((i) => sf(i) && kf(i)));
      if (a.n > 0 && inBand(a.kMed)) hits.push(`${sn} ${kn} ${d3(a.kMed)}`);
    }
  p(`- In the healthy band, ${x.label}: ${hits.length ? hits.join("; ") : "none"}.`);
}
p();

// K2: our direct cost and its change against the first pass.
p(`## K2. Our direct cost ($, the pipe items priced), and each pass against ${base.label}`);
const k2 = [];
for (const [sn, sf] of SETS)
  for (const [kn, kf] of KINDS) {
    const a = passes.map((x) => agg(x.items.filter((i) => sf(i) && kf(i))));
    if (a.every((x) => x.n === 0)) continue;
    k2.push([sn, kn, usd(a[0].dir), ...a.slice(1).flatMap((x) => [usd(x.dir), `${sgn(x.dir - a[0].dir)} (${a[0].dir ? (((x.dir / a[0].dir) - 1) * 100).toFixed(1) : "–"} %)`])]);
  }
table(["Set", "Kind", base.label, ...passes.slice(1).flatMap((x) => [x.label, `${x.label} − ${base.label}`])], k2);

// T1: the trench per LF for the same runs as Part 6's T1 (analyse.mjs's pick).
const traced = passes.filter((x) => x.results.size > 0);
p("## T1. The trench per LF (CY/LF): excavation, the bedding and pipe zone bought, the final backfill and the part of it bought; the walls");
p("Picked per kind as Part 6's T1 picked them: the LF-weighted median size and (gravity) depth of the kind's items; the three distinct pipe / size / depth runs closest to it (size first, then depth), one item each (the longest). Pressure runs are at 4 ft cover. \"bought\" is the final backfill bought (CSS under pavement); the 12 in under the surface of a paved run is the restoration's (none on the tabs), so it is in no column.");
p();
const wmedian = (list, f) => {
  const s = [...list].sort((x, y) => f(x) - f(y));
  const tot = s.reduce((t, i) => t + i.qty, 0);
  let c = 0;
  for (const i of s) {
    c += i.qty;
    if (c >= tot / 2) return f(i);
  }
  return null;
};
const wallsOf = (t) => (t?.walls ? Object.keys(t.walls).join("/") : "–");
const trows = [];
const TK = KINDS.filter(([k]) => !["storm (all)", "all pipe"].includes(k));
for (const [kn, kf] of TK) {
  const list = base.items.filter(kf);
  if (!list.length) continue;
  const mn = wmedian(list, (i) => Number(i.nominal));
  const md = list.some((i) => i.depth != null) ? wmedian(list.filter((i) => i.depth != null), (i) => i.depth) : null;
  const byCfg = new Map();
  for (const i of list) {
    const k = `${i.entry}:${i.nominal}:${i.depth}`;
    const b = byCfg.get(k);
    if (!b || i.qty > b.qty) byCfg.set(k, i);
  }
  const picks = [...byCfg.values()].sort((x, y) => Math.abs(Number(x.nominal) - mn) - Math.abs(Number(y.nominal) - mn) || Math.abs((x.depth ?? 0) - (md ?? 0)) - Math.abs((y.depth ?? 0) - (md ?? 0)) || y.qty - x.qty).slice(0, 3);
  for (const i of picks) {
    const t = traced.map((x) => resultOf(x, twin(x, i) ?? i)?.trench ?? null);
    trows.push([kn, `${i.entry} ${i.nominal} in${i.depth != null ? ` at ${i.depth} ft` : " (4 ft cover)"}, ${i.qty} LF (median ${mn} in${md != null ? `, ${md} ft` : ""})`, ...t.flatMap((x) => [d4(x?.excCYLF), d4(x?.impEmbCYLF), d4(x?.backfillCYLF), d4(x?.impBackfillCYLF), wallsOf(x)])]);
  }
}
table(["Kind", "Run", ...traced.flatMap((x) => [`${x.label} exc`, `${x.label} emb`, `${x.label} bf`, `${x.label} bf bought`, `${x.label} walls`])], trows);

// S1: the section each kind took.
p("## S1. The section each kind's runs took (stack titles, items) and the walls");
const srows = [];
for (const [kn, kf] of TK)
  for (const x of traced) {
    const titles = new Map();
    const walls = new Map();
    for (const i of x.items.filter(kf)) {
      const t = resultOf(x, i)?.trench;
      titles.set(t?.title ?? "?", (titles.get(t?.title ?? "?") ?? 0) + 1);
      walls.set(wallsOf(t), (walls.get(wallsOf(t)) ?? 0) + 1);
    }
    if (titles.size) srows.push([kn, x.label, [...titles].map(([t, n]) => `${t} (${n})`).join("; "), [...walls].map(([t, n]) => `${t} ${n}`).join("; ")]);
  }
table(["Kind", "Pass", "Section (items)", "Walls (items)"], srows);

// LW: the limited-width marks, as each pass's results carry them (the first pass with marks).
const marked = traced.find((x) => [...x.results.values()].some((c) => (c.items ?? []).some((it) => typeof it.limitedWidth === "boolean")));
if (marked) {
  p(`## LW. The limited-width marks (R11; street-marking.mjs), the priced pipe items of ${marked.label}`);
  const lw = (i) => resultOf(marked, i)?.limitedWidth === true;
  const rows = [];
  for (const [sn, sf] of SETS)
    for (const [kn, kf] of KINDS) {
      const list = marked.items.filter((i) => sf(i) && kf(i));
      if (!list.length) continue;
      const on = list.filter(lw);
      rows.push([sn, kn, `${on.length} of ${list.length}`, `${Math.round(on.reduce((t, i) => t + i.qty, 0)).toLocaleString("en-US")} of ${Math.round(list.reduce((t, i) => t + i.qty, 0)).toLocaleString("en-US")}`]);
    }
  table(["Set", "Kind", "Items limited width", "LF limited width"], rows);
  const open = marked.items.filter((i) => !lw(i));
  p(`Left open: ${open.length ? open.map((i) => `${i.key} #${i.i} ${i.type} ${i.entry} ${i.nominal} in ${i.qty} LF${i.recent ? " (recent)" : ""}: ${resultOf(marked, i)?.limitedWhy ?? "no mark"}`).join("; ") : "none"}.`);
  p();
}

// CSS: what each pass bought and at what price.
p("## CSS. Cement-stabilized sand each pass bought (the api's components, all contracts of the pass)");
const crow = [];
for (const x of traced) {
  const cs = [...x.results.values()].map((c) => c.css).filter(Boolean);
  if (!cs.length) continue;
  const tons = cs.reduce((t, c) => t + c.tons, 0);
  const total = cs.reduce((t, c) => t + c.total, 0);
  const prices = [...new Set(cs.flatMap((c) => c.unitPrices))].sort((a, b) => a - b);
  const tiers = new Map();
  for (const c of cs) for (const t of c.tiers) tiers.set((t ?? "none").replace(/\s*\(.*$/, ""), (tiers.get((t ?? "none").replace(/\s*\(.*$/, "")) ?? 0) + 1);
  const src = [...new Set(cs.flatMap((c) => c.sources))].join(", ");
  const sec = [...x.results.values()].find((c) => c.section)?.section;
  crow.push([x.label, Math.round(tons).toLocaleString("en-US"), usd(total), prices.length ? `${prices[0].toFixed(4)}–${prices[prices.length - 1].toFixed(4)}` : "–", src || "–", [...tiers].map(([t, n]) => `${t} ${n}`).join("; ") || "–", sec?.cssPrice ? `project ${sec.cssPrice.unitPrice} / ${sec.cssPrice.sellUnit} (${sec.cssPrice.given} ${sec.cssPrice.basis} × ${sec.cssPrice.factor})` : sec?.cssLibrary ? `library ${sec.cssLibrary.unitPrice} / ${sec.cssLibrary.sellUnit} (× ${sec.cssLibrary.factor}, grade ${sec.cssLibrary.grade ?? "–"})` : "–"]);
}
table(["Pass", "Tons", "$", "Unit prices ($/TON)", "Source", "Order tiers (components)", "Price set"], crow);

// C1: the checks.
p("## C1. Checks per pass");
const cr = [];
for (const x of passes) {
  const rs = [...x.results.values()];
  const tabs = rs.filter((c) => !c.key.startsWith("x:"));
  const sec = rs.find((c) => c.section)?.section;
  const failed = rs.filter((c) => c.parityDiffs || c.error || c.interaction);
  const step1 = sec?.step1 ? sec.step1.checks.map((c) => `${c.q} ${c.ok ? "in" : "NOT YET"}`).join(", ") : "–";
  const san = x.items.filter((i) => i.type === "sanitary");
  const tac = san.filter((i) => /30 TAC §217\.54/.test(resultOf(x, i)?.trench?.title ?? "")).length;
  cr.push([x.label, rs.length ? `${tabs.length} tabs, ${rs.length - tabs.length} crossing contracts` : "–", rs.length ? String(failed.length) + (failed.length ? ` (${failed.slice(0, 3).map((c) => c.key).join(", ")})` : "") : "–", `${x.items.length}`, rs.length ? `${tac} of ${san.length}` : "–", step1, sec ? `mode ${sec.mode}; state ${sec.projectState}; jurisdiction ${sec.jurisdiction ?? "–"} (stored ${sec.jurisdictionStored ?? "–"}); presets ${sec.sectionPresets ? Object.entries(sec.sectionPresets).map(([k, v]) => `${k} ${v}`).join(", ") : "none"}; limited width ${sec.limitedWidth ?? "none"}; boxes ${sec.boxes ?? "–"}; backfill ${sec.backfill}` : "–"]);
}
table(["Pass", "Contracts", "Unpriced / parity / interaction / waiting", "Priced pipe items", "Sanitary items with 30 TAC", "Step 1 (Q2, Q4, Q5)", "Settings"], cr);

writeFileSync(outPath, out.join("\n"));
console.log(out.join("\n"));

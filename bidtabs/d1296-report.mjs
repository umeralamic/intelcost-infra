// D-1296 (R4, R10): step 1's harness pass against the 11-19 (a1) pass. Per kind and set (recent / history / all), the
// multiplier to the medians and to the lows, without and with each tab's separately paid trench safety (R4: the tab's
// trench-safety $ added to the item's median, its low to the low; trench-safety.mjs maps it), and the $ of each change
// against (a1), from each item's own components wherever the runner reports them. No bid figure lives here: every
// input and the output are in docs/reference (outside git).
//
//   node bidtabs/d1296-report.mjs "<out md>" --base=<label>=<items json>,<results json> --trenchSafety=<json>
//        [--new=<label>=<items json>,<results json>] [--a2=<results json>] [--materialTaxPct=<n>]
//     items json: basis-report.mjs's `<prefix>-items.json` (score over that pass's results); results json: the runner's.
//     Without --new it reports (a1) both ways and the changes' estimates only (before the pass).
//     --a2: the 11-19 (a2) results (paved, CSS 12 in under the surface), for the paved-backfill estimate.
//
// k to the median = Σ median × LF ÷ Σ our direct × LF ($-weighted; the low the same with each item's low). Healthy is
// 1.15–1.30 to the medians, centre 1.22 (D-1295): our direct excludes supervision, small tools, insurance and bond.
//
// The $ of each change (new − base, our direct as basis-report.mjs builds it: labour × the tab's labour ratio, material ×
// (1 + the material tax), equipment with the rental tax):
//   fittings allowance   each item's `fittings_allowance` material $ (the runner's `matByKeyPerLF`, its pipe line's
//                        `pct_of` component): pressure (water, force main) 20 → 12 %, sanitary 5 → 2 %, storm RCP
//                        5 → 0 %, storm other as it ran;
//   fire water           no fire-water item on the tabs (counted, not assumed);
//   paved backfill       the items marked with a backfill under pavement: their `utility_backfill` line's material;
//   delivery             the rental tax each item's equipment carries (`eqTaxPerLF`; R8: by ownership, a rented
//                        machine's dealer delivery is taxed), and beside it the equipment before tax;
//   A22 labour           a line role new in the pass whose name reads fittings, and each item's labour; every tab item
//                        is a straight two-vertex run (no bend, no tee: contract-runner.js), so it is 0 by construction;
//   other                what is left (material, subcontract and disposal the rows above do not take).
// The estimates (no pass): the allowance at the new %'s on (a1)'s own allowance $ (linear in the %), the paved backfill
// from (a2)'s backfill line on the marked items (CSS to 12 in under the surface, not to the subgrade: an estimate).

import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const opt = (k) => argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const [outPath] = argv.filter((a) => !a.startsWith("--"));
const MAT_TAX = Number(opt("materialTaxPct") ?? 0) / 100;
const BAND = [1.15, 1.3];
const J = (f) => JSON.parse(readFileSync(f, "utf8"));
const passOf = (spec) => {
  if (!spec) return null;
  const at = spec.indexOf("=");
  const [itemsPath, resultsPath] = spec.slice(at + 1).split(",");
  return { label: spec.slice(0, at), items: J(itemsPath).filter((i) => i.priced && !i.excluded), results: new Map(J(resultsPath).map((c) => [c.key, c])) };
};
const base = passOf(opt("base"));
const next = passOf(opt("new"));
const a2 = opt("a2") ? new Map(J(opt("a2")).map((c) => [c.key, c])) : null;
const tsJson = J(opt("trenchSafety"));
const ts = new Map(tsJson.items.map((t) => [`${t.key}|${t.i}`, t]));
const resultOf = (pass, i) => pass.results.get(i.key)?.items?.[i.i] ?? null;
const twin = (pass, i) => pass.items.find((x) => x.key === i.key && x.i === i.i) ?? null;

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
const usd = (x) => (x == null || !Number.isFinite(x) ? "–" : `${x < -0.5 ? "−" : ""}$${Math.round(Math.abs(x)).toLocaleString("en-US")}`);
const sgn = (x) => (x > 0.5 ? "+" : "") + usd(x);
const out = [];
const p = (s = "") => out.push(s);
const table = (head, rows) => {
  p(`| ${head.join(" | ")} |`);
  p(`|${head.map((_, i) => (i === 0 ? "---" : "---:")).join("|")}|`);
  for (const r of rows) p(`| ${r.join(" | ")} |`);
  p();
};
const tsOf = (i) => ts.get(`${i.key}|${i.i}`) ?? null;
const agg = (list, withTs, whole = false) => {
  const dir = list.reduce((t, i) => t + i.direct * i.qty, 0);
  const add = (i, f) => (withTs ? (tsOf(i)?.[f] ?? 0) : 0);
  const med = list.reduce((t, i) => t + (i.median + add(i, whole ? "tsWholeMedPerLF" : "tsMedPerLF")) * i.qty, 0);
  const low = list.reduce((t, i) => t + (i.low + add(i, whole ? "tsWholeLowPerLF" : "tsLowPerLF")) * i.qty, 0);
  return { n: list.length, lf: list.reduce((t, i) => t + i.qty, 0), dir, med, low, kMed: dir ? med / dir : null, kLow: dir ? low / dir : null };
};
const inBand = (k) => k != null && k >= BAND[0] - 1e-9 && k <= BAND[1] + 1e-9;
const passes = [base, next].filter(Boolean);

p(`# D-1296: step 1's harness pass${next ? ` (${next.label})` : ""} against ${base.label}, with and without the tabs' trench safety`);
p();
p(`k to the median = median ÷ our direct, k to the low = low ÷ our direct ($-weighted). Healthy: ${BAND[0].toFixed(2)}–${BAND[1].toFixed(2)} to the medians, centre 1.22 (D-1295). "+TS": each tab's separately paid trench safety added to the items it covers (median to the median, low to the low; trench-safety.mjs: ${tsJson.rule}).`);
p();

// K1: k per kind, each pass without and with the trench safety.
p("## K1. Multipliers per kind: without and with the tabs' trench safety");
const k1 = [];
for (const [sn, sf] of SETS)
  for (const [kn, kf] of KINDS) {
    const cols = passes.flatMap((x) => {
      const l = x.items.filter((i) => sf(i) && kf(i));
      const a = agg(l, false);
      const b = agg(l, true);
      return [d3(a.kMed), d3(a.kLow), d3(b.kMed), d3(b.kLow)];
    });
    const l0 = base.items.filter((i) => sf(i) && kf(i));
    if (!l0.length) continue;
    k1.push([sn, kn, `${l0.length} / ${Math.round(l0.reduce((t, i) => t + i.qty, 0)).toLocaleString("en-US")}`, ...cols]);
  }
table(["Set", "Kind / group", "Items / LF", ...passes.flatMap((x) => [`${x.label} k med`, `${x.label} k low`, `${x.label} +TS k med`, `${x.label} +TS k low`])], k1);
for (const x of passes)
  for (const withTs of [false, true]) {
    const hits = [];
    for (const [sn, sf] of SETS)
      for (const [kn, kf] of KINDS) {
        const a = agg(x.items.filter((i) => sf(i) && kf(i)), withTs);
        if (a.n > 0 && inBand(a.kMed)) hits.push(`${sn} ${kn} ${d3(a.kMed)}`);
      }
    p(`- In the healthy band, ${x.label}${withTs ? " +TS" : ""}: ${hits.length ? hits.join("; ") : "none"}.`);
  }
for (const x of passes) {
  const a = agg(x.items, true, true);
  p(`- Sensitivity, ${x.label}, each trench-safety item's whole $ spread over the compared items it covers: all pipe ${d3(a.kMed)} / ${d3(a.kLow)}.`);
}
p();

// TS: the trench-safety items per tab and the $ the comparison adds.
p("## TS. The tabs' trench-safety pay items (R4)");
const trows = [];
for (const t of tsJson.tabs) {
  const its = base.items.filter((i) => i.key === t.key);
  const addM = its.reduce((s, i) => s + (tsOf(i)?.tsMedPerLF ?? 0) * i.qty, 0);
  const addL = its.reduce((s, i) => s + (tsOf(i)?.tsLowPerLF ?? 0) * i.qty, 0);
  const rules = [...new Set(t.tsItems.map((x) => x.rule.replace(/ \(.*$/, "")))].join(", ") || "–";
  trows.push([t.key, its[0]?.recent ? "recent" : "history", String(t.tsItems.length), usd(t.tsItems.reduce((s, x) => s + (x.medTotal ?? 0), 0)), usd(t.tsItems.reduce((s, x) => s + (x.lowTotal ?? 0), 0)), usd(addM), usd(addL), rules, t.sectionsWithoutTs.map((b) => b.kinds.join("+")).join(", ") || "–", String(t.tsItems.filter((x) => x.flags.length).length)]);
}
table(["Tab", "Set", "Items", "Median $ (whole items)", "Low $ (whole items)", "Added to the priced items, median", "low", "Mapping", "Kinds with no trench-safety item", "Items flagged"], trows);
const krows = [];
for (const [sn, sf] of SETS)
  for (const [kn, kf] of KINDS) {
    const l = base.items.filter((i) => sf(i) && kf(i));
    if (!l.length) continue;
    const m = l.reduce((s, i) => s + (tsOf(i)?.tsMedPerLF ?? 0) * i.qty, 0);
    const lo = l.reduce((s, i) => s + (tsOf(i)?.tsLowPerLF ?? 0) * i.qty, 0);
    const lf = l.filter((i) => (tsOf(i)?.tsRows ?? []).length).reduce((s, i) => s + i.qty, 0);
    krows.push([sn, kn, `${Math.round(lf).toLocaleString("en-US")} of ${Math.round(l.reduce((s, i) => s + i.qty, 0)).toLocaleString("en-US")}`, usd(m), usd(lo), usd(l.reduce((s, i) => s + i.median * i.qty, 0)), m ? `${((m / l.reduce((s, i) => s + i.median * i.qty, 0)) * 100).toFixed(2)} %` : "–"]);
  }
table(["Set", "Kind", "LF covered by a trench-safety item", "Added to the medians", "Added to the lows", "Medians before", "Added, % of the medians"], krows);
const flagged = tsJson.tabs.flatMap((t) => t.tsItems.filter((x) => x.flags.length).map((x) => `${t.key} #${x.no} (${x.qty} LF; ${x.rule}): ${x.flags.join("; ")}`));
if (flagged.length) {
  p("Flags (each item still mapped as the rule says):");
  p();
  for (const f of flagged) p(`- ${f}`);
  p();
}

// D: the $ of each change, per item from the runner's components.
const fa = (r) => r?.matByKeyPerLF?.fittings_allowance ?? 0;
const role = (r, k) => r?.byRole?.[k] ?? { lab: 0, eq: 0, mat: 0, disp: 0, sub: 0, total: 0 };
const marked = (i, pass) => {
  const r = resultOf(pass, i);
  return (r?.underPavementBackfill ?? "native") !== "native";
};
const GROUPS = [
  ["pressure (water, force main)", (i) => i.type === "water" || i.type === "force_main", 12 / 20],
  ["sanitary", (i) => i.type === "sanitary", 2 / 5],
  ["storm RCP", (i) => rcp(i), 0],
  ["storm other (HDPE)", (i) => i.type === "storm" && !rcp(i), 1],
];
const sumOver = (list, f) => list.reduce((t, i) => t + f(i), 0);
const fireItems = [...base.results.values(), ...(next ? [...next.results.values()] : [])].flatMap((c) => c.items ?? []).filter((it) => it.type === "fire_water").length;
p(`## D. The $ of each change against ${base.label} (our direct; recent / history / all)`);
p();
const drows = [];
const est = (label, f, source) => drows.push([label, ...SETS.map(([, sf]) => usd(sumOver(base.items.filter(sf), f))), "–", "–", "–", source]);
const meas = (label, f, source, estF) => drows.push([label, ...SETS.map(([, sf]) => (estF ? usd(sumOver(base.items.filter(sf), estF)) : "–")), ...SETS.map(([, sf]) => sgn(sumOver(next.items.filter(sf), f))), source]);
const allowEst = (gf, factor) => (i) => (gf(i) ? fa(resultOf(base, i)) * (factor - 1) * (1 + MAT_TAX) * i.qty : 0);
const pavedEst = (i) => {
  if (!a2 || !next) return 0;
  const n = twin(next, i);
  if (!n || !marked(n, next)) return 0;
  const r2 = a2.get(i.key)?.items?.[i.i];
  return (role(r2, "utility_backfill").mat - role(resultOf(base, i), "utility_backfill").mat) * (1 + MAT_TAX) * i.qty;
};
if (next) {
  const pair = (f) => (i) => {
    const b = twin(base, i);
    return b ? f(i, b, resultOf(next, i), resultOf(base, b)) : 0;
  };
  const dDirect = pair((i, b) => (i.direct - b.direct) * i.qty);
  const dAllow = (gf) => pair((i, b, rn, rb) => (gf(i) ? (fa(rn) - fa(rb)) * (1 + MAT_TAX) * i.qty : 0));
  const dPaved = pair((i, b, rn, rb) => (marked(i, next) ? (role(rn, "utility_backfill").mat - role(rb, "utility_backfill").mat) * (1 + MAT_TAX) * i.qty : 0));
  const dTax = pair((i, b, rn, rb) => ((rn?.eqTaxPerLF ?? 0) - (rb?.eqTaxPerLF ?? 0)) * i.qty);
  const dEqPre = pair((i, b, rn, rb) => ((rn?.eqPerLF ?? 0) - (rn?.eqTaxPerLF ?? 0) - ((rb?.eqPerLF ?? 0) - (rb?.eqTaxPerLF ?? 0))) * i.qty);
  const dLab = pair((i, b, rn, rb) => ((rn?.labPerLF ?? 0) - (rb?.labPerLF ?? 0)) * (i.ratio ?? 1) * i.qty);
  const newRoles = (rn, rb) => Object.keys(rn?.byRole ?? {}).filter((k) => !(k in (rb?.byRole ?? {})) && /fitting|a22/i.test(k));
  const dA22 = pair((i, b, rn, rb) => newRoles(rn, rb).reduce((t, k) => t + (role(rn, k).lab * (i.ratio ?? 1) + role(rn, k).eq + role(rn, k).mat * (1 + MAT_TAX) + role(rn, k).sub) * i.qty, 0));
  for (const [gl, gf, factor] of GROUPS) meas(`Fittings allowance, ${gl}${factor === 1 ? " (as it ran)" : ` ×${factor.toFixed(2)}`}`, dAllow(gf), "per item: the `fittings_allowance` material $", allowEst(gf, factor));
  drows.push(["Fire water (own 30 %, C900 DR 14, test and flush per system)", "–", "–", "–", ...SETS.map(() => fireItems ? "see note" : "$0"), `${fireItems} fire-water items on the tabs`]);
  meas("Paved backfill choice (the marked items' backfill line, material)", dPaved, "per item: the `utility_backfill` line's material", a2 ? pavedEst : null);
  meas("Delivery by ownership: rental tax on the equipment", dTax, "per item: `eqTaxPerLF`", null);
  meas("Equipment before tax (delivery basis or other)", dEqPre, "per item: `eqPerLF` − `eqTaxPerLF`", null);
  meas("A22 labour for counted fittings (a new fittings line role)", dA22, "per item: line roles new in the pass; 0 counted fittings on every tab item", null);
  meas("Labour, every line (× the tab's labour ratio)", dLab, "per item: `labPerLF`", null);
  const resid = (i) => dDirect(i) - GROUPS.reduce((t, [, gf]) => t + dAllow(gf)(i), 0) - dPaved(i) - dTax(i) - dEqPre(i) - dLab(i);
  meas("Other (material, subcontract, disposal not taken above)", resid, "the rest of the change in our direct", null);
  meas("**Our direct, the pass − " + base.label + "**", dDirect, "basis-report.mjs's direct per item", null);
} else {
  for (const [gl, gf, factor] of GROUPS) est(`Fittings allowance, ${gl} ×${factor.toFixed(2)} (estimate)`, allowEst(gf, factor), "estimate: (a1)'s `fittings_allowance` $ × the new % ÷ the old");
  drows.push(["Fire water", "$0", "$0", "$0", "–", "–", "–", `${fireItems} fire-water items on the tabs`]);
}
table(["Change", ...SETS.map(([s]) => `${s}: estimate`), ...SETS.map(([s]) => `${s}: from the pass`), "Source"], drows);

// The allowance % each pipe line took, per kind, and the under-pavement marks.
if (next) {
  const pct = new Map();
  for (const i of next.items) {
    const r = resultOf(next, i);
    const k = KINDS.find(([n, f]) => n !== "storm (all)" && n !== "all pipe" && f(i))?.[0] ?? "?";
    const v = r?.allowancePct == null ? "none" : String(r.allowancePct);
    pct.set(`${k}|${v}`, (pct.get(`${k}|${v}`) ?? 0) + 1);
  }
  p(`Allowance % per pipe line in ${next.label} (kind: % × items): ${[...pct].map(([k, n]) => `${k.replace("|", " ")} % × ${n}`).join("; ")}.`);
  p();
  const mk = next.items.filter((i) => marked(i, next));
  p(`Backfill under pavement in ${next.label}: ${mk.length} items, ${Math.round(sumOver(mk, (i) => i.qty)).toLocaleString("en-US")} LF: ${mk.map((i) => `${i.key} #${i.i} ${i.entry} ${i.nominal} in ${i.qty} LF (${resultOf(next, i)?.backfillWhy ?? "–"})`).join("; ") || "none"}.`);
  p();
  const sec = [...next.results.values()].find((c) => c.section)?.section;
  if (sec) p(`Settings: under-pavement ${sec.underPavement ? `${sec.underPavement.mode}, project default ${sec.underPavement.projectDefault} (stored ${sec.underPavement.projectDefaultStored ?? "–"}), probe ${sec.upbProbe ? (sec.upbProbe.ok ? "in" : "NOT YET") : "–"}` : "–"}; delivery basis ${sec.deliveryByDealer ?? "the company's"}; limited width ${sec.limitedWidth}; paved ${sec.paved}.`);
  p();
}

writeFileSync(outPath, out.join("\n"));
console.log(out.join("\n"));

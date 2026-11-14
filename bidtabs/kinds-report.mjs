// Every kind's multiplier, and the storm RCP groups, from basis-report.mjs's items (D-1277 rerun after Part 4, the
// 2026-11-15 night run). No bid figure lives here: the inputs and the output are in docs/reference (outside git).
//
//   node bidtabs/kinds-report.mjs "<out md>" "<label>=<items json>" ["<label>=<items json>" ...]
//       each items json is basis-report.mjs's `<prefix>-items.json` (one priced run each: Part 1's, Part 3's crew pass,
//       this run). For each run, per set (recent, history, all) and group:
//         - the kinds (water, force main, sanitary, storm), as Part 1's B6: median ÷ direct and low ÷ direct, $-weighted;
//         - storm RCP 18-42 in and 48 in and up: the LF-weighted log mean of median ÷ direct and low ÷ direct over the
//           items (Part 3's measure, D-1275), with the $-weighted ratio beside it;
//         - the 8 h vs 10 h reading of the storm crews' study day (D-1275, the founder's sensitivity): with the day taken
//           as 10 h (×1.0) instead of 8 h (×1.25, as built), production is slower by 1/1.25, so the pipe crew's labour
//           and equipment (every storm RCP item's L and E sit on its pipe line, the crew's) take ×1.25, except where
//           the crew's time is at the spread's half-day minimum (a line under 0.5 crew day at the 8 h reading stays at
//           its floor, and one crossing it takes only the part above). Equipment is scaled linearly: a rental tier
//           (week, 4 weeks) could make the added days cheaper, so the 10 h figure is the high side. Crew days per item
//           come from its labour: labour ÷ the crew's day cost (`--crewDay`, $ a crew-day, open shop, default 2,090:
//           D-1274's $2,060-2,122 for five).
//       Healthy is 1.20-1.35 to the medians. Writes the markdown file and prints it.

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const crewDayArg = args.find((a) => a.startsWith("--crewDay="));
const CREW_DAY = crewDayArg ? Number(crewDayArg.split("=")[1]) : 2090;
const [outPath, ...runs] = args.filter((a) => !a.startsWith("--"));
const sets = runs.map((s) => {
  const at = s.indexOf("=");
  return { label: s.slice(0, at), items: JSON.parse(readFileSync(s.slice(at + 1), "utf8")).filter((i) => i.priced && !i.excluded) };
});
const HALF_DAY = 0.5;

const d3 = (x) => (x == null || !Number.isFinite(x) ? "–" : x.toFixed(3));
const d0 = (x) => Math.round(x).toLocaleString("en-US");
const out = [];
const p = (s = "") => out.push(s);
const table = (head, rows) => {
  p(`| ${head.join(" | ")} |`);
  p(`|${head.map((_, i) => (i === 0 ? "---" : "---:")).join("|")}|`);
  for (const r of rows) p(`| ${r.join(" | ")} |`);
  p();
};
const sum = (rs, f) => rs.reduce((t, r) => t + f(r), 0);
const rcp = (i) => i.type === "storm" && /^rcp_/.test(i.entry);
const GROUPS = [
  ["water", (i) => i.type === "water"],
  ["force main", (i) => i.type === "force_main"],
  ["sanitary", (i) => i.type === "sanitary"],
  ["storm (all)", (i) => i.type === "storm"],
  ["storm RCP 18-42 in", (i) => rcp(i) && Number(i.nominal) >= 18 && Number(i.nominal) <= 42],
  ["storm RCP 48 in and up", (i) => rcp(i) && Number(i.nominal) >= 48],
];
const SETS = [
  ["recent", (i) => i.recent],
  ["history", (i) => !i.recent],
  ["all", () => true],
];
// The 10 h reading of one item: its pipe crew's L and E at ×1.25, the half-day floor kept.
function tenHour(i) {
  const days8 = (i.L * i.qty) / (i.ratio ?? 1) / CREW_DAY;
  // A crew at its half-day floor shows 0.5 day whatever its true time: kept at the floor (the low side for these).
  const atFloor = Math.abs(days8 - HALF_DAY) < 0.01 * HALF_DAY;
  const f = atFloor ? 1 : Math.max(days8 * 1.25, HALF_DAY) / Math.max(days8, HALF_DAY);
  const L = i.L * f;
  const E = i.E * f;
  return { ...i, L, E, direct: L + E + i.M + (i.S ?? 0), f, days8 };
}
function stats(rs) {
  if (!rs.length) return null;
  const lf = sum(rs, (r) => r.qty);
  const w = (f) => Math.exp(sum(rs, (r) => Math.log(f(r) / r.direct) * r.qty) / lf);
  const direct = sum(rs, (r) => r.direct * r.qty);
  return { n: rs.length, lf, direct, L: sum(rs, (r) => r.L * r.qty), E: sum(rs, (r) => r.E * r.qty), M: sum(rs, (r) => r.M * r.qty), kMedLog: w((r) => r.median), kLowLog: w((r) => r.low), kMed: sum(rs, (r) => r.median * r.qty) / direct, kLow: sum(rs, (r) => r.low * r.qty) / direct, floored: rs.filter((r) => r.f != null && r.f < 1.25 - 1e-9).length };
}

p(`Healthy is 1.20–1.35 to the medians. k = median (or low) ÷ our direct. "$" = Σ median × qty ÷ Σ direct × qty (Part 1's B6); "log" = the LF-weighted log mean over the items (Part 3's measure for 48 in and up).`);
p();
p("### K1. Every kind, recent and history: k to the medians and to the lows ($-weighted, as Part 1's B6)");
table(
  ["Set", "Group", ...sets.flatMap((s) => [`${s.label}: items / LF`, `${s.label}: k med`, `${s.label}: k low`])],
  SETS.flatMap(([sn, sf]) =>
    GROUPS.slice(0, 4).map(([gn, gf]) => [sn, gn, ...sets.flatMap((s) => {
      const st = stats(s.items.filter((i) => sf(i) && gf(i)));
      return st ? [`${st.n} / ${d0(st.lf)}`, d3(st.kMed), d3(st.kLow)] : ["–", "–", "–"];
    })]),
  ),
);
p("### K2. Storm RCP 18–42 in and 48 in and up: k to the medians and to the lows (log, LF-weighted; $ in brackets)");
table(
  ["Set", "Group", ...sets.flatMap((s) => [`${s.label}: items / LF`, `${s.label}: k med`, `${s.label}: k low`])],
  SETS.flatMap(([sn, sf]) =>
    GROUPS.slice(4).map(([gn, gf]) => [sn, gn, ...sets.flatMap((s) => {
      const st = stats(s.items.filter((i) => sf(i) && gf(i)));
      return st ? [`${st.n} / ${d0(st.lf)}`, `${d3(st.kMedLog)} (${d3(st.kMed)})`, `${d3(st.kLowLog)} (${d3(st.kLow)})`] : ["–", "–", "–"];
    })]),
  ),
);
const last = sets[sets.length - 1];
p(`### K3. 8 h vs 10 h study day (calculated from "${last.label}", no extra run): storm RCP, k to the medians and to the lows`);
p(`8 h = as built (TxDOT's figure a crew day × 1.25 on the 10 h basis). 10 h = the figure taken as a 10 h day: the pipe crew's labour and equipment × 1.25, the half-day minimum kept (crew day $${d0(CREW_DAY)}, open shop). Equipment linear (high side).`);
p();
table(
  ["Set", "Group", "LF", "L + E share of direct (8 h)", "8 h: k med (log / $)", "8 h: k low (log / $)", "10 h: k med (log / $)", "10 h: k low (log / $)", "Items at the floor (10 h)"],
  SETS.flatMap(([sn, sf]) =>
    GROUPS.slice(4).map(([gn, gf]) => {
      const rs = last.items.filter((i) => sf(i) && gf(i));
      const a = stats(rs);
      const b = stats(rs.map(tenHour));
      if (!a) return [sn, gn, "–", "–", "–", "–", "–", "–", "–"];
      return [sn, gn, d0(a.lf), `${(((a.L + a.E) / a.direct) * 100).toFixed(1)} %`, `${d3(a.kMedLog)} / ${d3(a.kMed)}`, `${d3(a.kLowLog)} / ${d3(a.kLow)}`, `${d3(b.kMedLog)} / ${d3(b.kMed)}`, `${d3(b.kLowLog)} / ${d3(b.kLow)}`, String(b.floored)];
    }),
  ),
);
writeFileSync(outPath, out.join("\n"));
console.log(out.join("\n"));

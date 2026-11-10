// Gravity sewer depth factors from the Houston LJA bid tabs (D-1141). No bid figure lives here: the contracts are read
// from docs/reference (outside git), the pipe material from the bench's library, passed in.
//
//   node bidtabs/depth-fit.mjs "<path to contracts.json>" <8 in SDR 26 material $/LF after the location factor>
//
// Each banded sanitary line's median less its pipe material (the same at every depth) is its installed cost without
// pipe; within a contract, size and pipe, its ratio from band to band is what depth costs. Model: ln N = a(contract,
// size, pipe) + b * max(0, d - 8) + c * max(0, d - 20), d the band's middle, least squares on the fit half; the check
// half is predicted from its own shallowest band and compared.

import { readFileSync } from "node:fs";

const [, , path, matArg] = process.argv;
const MAT = { "pvc_d3034_sdr26:8": Number(matArg) };
const FIT = new Set(["1680-8215", "2535-2318", "2659-2152", "4683-6203A", "0386-3118A"]);
const BAND = /(\d+)\s*'?\s*-\s*(\d+)\s*'?\s*(CUT|DEPTH)/i;

const contracts = JSON.parse(readFileSync(path, "utf8"));
const points = [];
for (const k of contracts) {
  const seen = new Set();
  for (const i of k.items) {
    if (i.type !== "sanitary" || i.median == null) continue;
    const m = i.desc.match(BAND);
    const mat = MAT[`${i.entry}:${i.nominal}`];
    if (!m || mat === undefined) continue;
    const mid = (Number(m[1]) + Number(m[2])) / 2;
    const key = `${i.entry}:${i.nominal}:${mid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({ contract: k.key, group: `${k.key}|${i.entry}:${i.nominal}`, mid, n: i.median - mat, fit: FIT.has(k.key) });
  }
}
const x = (d) => [Math.max(0, d - 8), Math.max(0, d - 20)];

// Least squares for b, c with a free offset per group: demean within each group.
function fit(ps) {
  const groups = new Map();
  for (const p of ps) groups.set(p.group, [...(groups.get(p.group) ?? []), p]);
  let s11 = 0, s12 = 0, s22 = 0, t1 = 0, t2 = 0;
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const mx = g.map((p) => x(p.mid));
    const my = g.map((p) => Math.log(p.n));
    const m1 = mx.reduce((t, v) => t + v[0], 0) / g.length, m2 = mx.reduce((t, v) => t + v[1], 0) / g.length;
    const mY = my.reduce((t, v) => t + v, 0) / g.length;
    g.forEach((_, j) => {
      const a = mx[j][0] - m1, b = mx[j][1] - m2, y = my[j] - mY;
      s11 += a * a; s12 += a * b; s22 += b * b; t1 += a * y; t2 += b * y;
    });
  }
  const det = s11 * s22 - s12 * s12;
  if (Math.abs(det) < 1e-12) return { b: s11 > 0 ? t1 / s11 : 0, c: 0 };
  return { b: (t1 * s22 - t2 * s12) / det, c: (t2 * s11 - t1 * s12) / det };
}
const f = ({ b, c }, d) => Math.exp(b * x(d)[0] + c * x(d)[1]);

const model = fit(points.filter((p) => p.fit));
const rows = (ps) => {
  const out = [];
  const groups = new Map();
  for (const p of ps) groups.set(p.group, [...(groups.get(p.group) ?? []), p]);
  for (const g of groups.values()) {
    const base = g.reduce((a, p) => (p.mid < a.mid ? p : a));
    for (const p of g) if (p !== base) out.push({ contract: p.contract, from: base.mid, to: p.mid, actual: p.n / base.n, predicted: f(model, p.mid) / f(model, base.mid) });
  }
  return out;
};
const report = (name, rs) => {
  const errs = rs.map((r) => r.predicted / r.actual - 1);
  const worst = errs.reduce((m, e) => Math.max(m, Math.abs(e)), 0);
  const mean = errs.reduce((t, e) => t + Math.abs(e), 0) / (errs.length || 1);
  console.log(`${name}: ${rs.length} band pairs, mean |error| ${(mean * 100).toFixed(1)}%, worst ${(worst * 100).toFixed(1)}%`);
  for (const r of rs) console.log(`  ${r.contract} ${r.from} -> ${r.to} ft: actual x${r.actual.toFixed(3)}, predicted x${r.predicted.toFixed(3)}`);
  return worst;
};
console.log(`model: ln N = a + ${model.b.toFixed(5)} * max(0, d - 8) + ${model.c.toFixed(5)} * max(0, d - 20)`);
console.log("factor on installed cost without pipe, by band middle:");
for (const d of [4, 7, 11, 17, 22, 26]) console.log(`  ${d} ft: x${f(model, d).toFixed(3)}`);
report("fit", rows(points.filter((p) => p.fit)));
const worst = report("check", rows(points.filter((p) => !p.fit)));
console.log(`check within +/-10%: ${worst <= 0.1 ? "yes" : "no"}`);

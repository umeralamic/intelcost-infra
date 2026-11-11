// The 10-contract bid-tab rebuild's table (D-1103, D-1165): each contract priced whole by contract-runner.js (pool on
// within the contract, the bench's open-shop Harris rates), then as D-1103 compares it: labour at the tab's bid-date
// prevailing rates (the crew-hour ratio to open shop), the tab's median bidder escalated by ECI to today. No bid figure
// lives here: the results and each contract's ratio and ECI are read from docs/reference (outside git).
//
//   node bidtabs/rebuild-report.mjs "<results.json>" "<contract-cmp.json (for each contract's labour ratio and ECI)>"
//
// In band: bid / 1.15 <= ours <= bid, i.e. our direct cost from 13 % under the escalated median to level with it (a bid
// carries about 15 % over its direct cost, so a direct cost in band is a bid at or a little over the median).
//
// Labour by depth: the Estimating view carries one crew row per pipe group and shows each line the group's labour per
// LF, so every line of a group reads the same. The engine's hours are the lines' own (D-1141: each line at its band's
// pace); here a group's labour is shared back by each line's own depth factor, LF x factor. Its machines stay spread
// evenly (they follow the same pace, so a deep line's figure here is a little low and a shallow one's a little high).

import { readFileSync } from "node:fs";

const [, , resultsPath, cmpPath] = process.argv;
const results = JSON.parse(readFileSync(resultsPath, "utf8"));
const cmp = new Map(JSON.parse(readFileSync(cmpPath, "utf8")).map((c) => [c.key, c]));

// D-1141's factor and the line's band: the runner lays a gravity line's invert ~0.6 ft above the tab's depth, so its
// trench lies in the 2 ft range below it (6.5 ft reads 0-6, 10 reads 8-10, 26 reads 24-26).
const RANGES = [0, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
const [B, C] = [0.0267, 0.10438];
const bandMid = (d) => {
  const t = d - 0.6;
  let i = RANGES.findIndex((r, k) => t >= r && t < (RANGES[k + 1] ?? Infinity));
  if (i < 0) i = RANGES.length - 2;
  return (RANGES[i] + RANGES[i + 1]) / 2;
};
const factor = (d) => {
  const mid = Math.min(26, bandMid(d));
  return Math.exp(B * Math.max(0, mid - 8) + C * Math.max(0, mid - 20));
};
const depthBand = (d) => (d < 8 ? "<8 ft" : d <= 14 ? "8-14 ft" : d <= 20 ? "14-20 ft" : ">20 ft");
const bandOf = (ours, bid) => (ours < bid / 1.15 ? "under" : ours > bid ? "over" : "IN");
const pct = (a, b) => Math.round((a / b - 1) * 100);

const rows = [];
for (const c of results) {
  const k = cmp.get(c.key);
  const ratio = k?.labourRatio ?? 1;
  const eci = k?.eci ?? 1;
  const items = c.items.map(([type, entry, nominal, depth, qty, median, ours, lab]) => ({ type, entry, nominal, depth, qty, median, ours, lab }));
  // Each gravity group's labour shared back by depth (a group: the contract's lines of one type).
  for (const type of ["sanitary", "storm"]) {
    const g = items.filter((i) => i.type === type && i.ours != null && i.depth != null);
    const total = g.reduce((t, i) => t + i.lab * i.qty, 0);
    const weight = g.reduce((t, i) => t + i.qty * factor(i.depth), 0);
    for (const i of g) {
      const lab = weight > 0 ? (total * factor(i.depth)) / weight : i.lab;
      i.ours += lab - i.lab;
      i.lab = lab;
    }
  }
  for (const i of items) {
    if (i.ours == null || i.median == null) {
      rows.push({ key: c.key, ...i, note: "not priced (no catalog size)" });
      continue;
    }
    const ours = i.ours + i.lab * (ratio - 1);
    const bid = i.median * eci;
    rows.push({ key: c.key, ...i, oursPw: ours, bidEsc: bid, pct: pct(ours, bid), band: bandOf(ours, bid) });
  }
}

const priced = rows.filter((r) => r.note == null);
const sum = (rs, f) => rs.reduce((t, r) => t + f(r) * r.qty, 0);
const line = (label, rs) => {
  if (rs.length === 0) return `  ${label.padEnd(22)} -`;
  const ps = rs.map((r) => r.pct).sort((a, b) => a - b);
  const inBand = rs.filter((r) => r.band === "IN").length;
  const under = rs.filter((r) => r.band === "under").length;
  const over = rs.filter((r) => r.band === "over").length;
  const dollars = pct(sum(rs, (r) => r.oursPw), sum(rs, (r) => r.bidEsc));
  return `  ${label.padEnd(22)} items ${String(rs.length).padStart(3)}  in band ${String(inBand).padStart(2)}  under ${String(under).padStart(2)}  over ${String(over).padStart(2)}  median gap ${String(ps[Math.floor(ps.length / 2)]).padStart(4)} %  LF-weighted ${String(dollars).padStart(4)} %`;
};

console.log("Per contract (direct cost, prevailing at the bid date, against the escalated median):");
for (const c of results) {
  const rs = priced.filter((r) => r.key === c.key);
  console.log(`  ${c.key.padEnd(11)} ours $${Math.round(sum(rs, (r) => r.oursPw)).toLocaleString().padStart(9)}  tab $${Math.round(sum(rs, (r) => r.bidEsc)).toLocaleString().padStart(9)}  ${String(pct(sum(rs, (r) => r.oursPw), sum(rs, (r) => r.bidEsc))).padStart(4)} %${c.missing.length ? `  (not priced: ${c.missing.join(", ")})` : ""}`);
}
console.log("\nBy kind:");
const kinds = [
  ["Water, PVC", (r) => r.type === "water" && r.entry.startsWith("pvc")],
  ["Water, ductile iron", (r) => r.type === "water" && r.entry.startsWith("di")],
  ["Sanitary, all", (r) => r.type === "sanitary"],
  ...["<8 ft", "8-14 ft", "14-20 ft", ">20 ft"].map((b) => [`  sanitary ${b}`, (r) => r.type === "sanitary" && depthBand(r.depth) === b]),
  ["Storm, RCP", (r) => r.type === "storm" && r.entry.startsWith("rcp")],
  ["Storm, HDPE", (r) => r.type === "storm" && r.entry.startsWith("hdpe")],
];
for (const [label, f] of kinds) console.log(line(label, priced.filter(f)));
console.log(line("All", priced));
console.log("\nIn band: bid / 1.15 <= ours <= bid (13 % under the escalated median to level with it).");
console.log("\nSanitary items:");
for (const r of priced.filter((x) => x.type === "sanitary")) {
  console.log(`  ${r.key.padEnd(11)} ${String(r.nominal).padStart(2)}" ${r.entry.padEnd(16)} ${String(r.depth).padStart(4)} ft  ${depthBand(r.depth).padEnd(8)} ${String(r.qty).padStart(5)} LF  ${String(r.pct).padStart(4)} %  ${r.band}`);
}

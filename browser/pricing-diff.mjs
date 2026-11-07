// Benchmark A's before/after line report (PRICING_FIX_PLAN item 8, D-1028). Reads two Estimating
// exports (mcp-export.js: all columns, all rows, all layers in one tab, without formulas) and writes,
// line by line and per cost kind, before, after and the difference, and the Bid Summary's lines.
// The figures are a real bid's: every path given must be under the workspace's untracked
// test-data-local/ (D-1025); nothing is written anywhere else, and nothing prints a figure but the
// report it writes there.
//
//   node browser/pricing-diff.mjs <before.xlsx> <after.xlsx> <report.md> [--item "5 Disposal"]
//   node browser/pricing-diff.mjs --check <export.xlsx> <expected.json>   (writes last-check.json beside it)
//   node browser/pricing-diff.mjs --expect <export.xlsx> <expected.json>  (the export becomes the expectation)
//
// The xlsx reader is the app's own (intelcost-app-react's xlsx-js-style).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const LOCAL = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../../test-data-local");
const X = createRequire(path.resolve(LOCAL, "../intelcost-app-react/package.json"))("xlsx-js-style");
const KINDS = [
  ["labor", "Total Labor Cost"],
  ["equipment", "Total Equipment"],
  ["material", "Total Material Cost"],
  ["disposal", "Total Disposal Cost"],
  ["subcontract", "Subcontract"],
  ["line", "Item Cost"],
];

const local = (p) => {
  const full = path.resolve(p);
  if (!full.toLowerCase().startsWith(LOCAL.toLowerCase() + path.sep)) {
    console.error(`pricing-diff: refused, ${p} is not under test-data-local/ (D-1025)`);
    process.exit(1);
  }
  return full;
};

/** An export's priced lines, by takeoff reference and assembly, and its Bid Summary. */
function read(file) {
  const wb = X.readFile(local(file));
  const rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false });
  const head = rows[0];
  const col = (name) => head.indexOf(name);
  const lines = {};
  for (const r of rows.slice(1)) {
    const ref = r[col("Takeoff Ref.")];
    if (!ref) continue;
    const key = `${ref} ${String(r[col("Assembly")] ?? "").split(/[:(]/)[0].trim()}`;
    lines[key] = Object.fromEntries(KINDS.map(([k, name]) => [k, col(name) < 0 ? 0 : Number(r[col(name)] ?? 0) || 0]));
  }
  const summary = {};
  for (const r of X.utils.sheet_to_json(wb.Sheets["Bid Summary"], { header: 1, blankrows: false }).slice(1)) {
    summary[String(r[0])] = Number(r[2] ?? r[3] ?? 0) || 0;
  }
  return { lines, summary, bid: summary["Bid total"] ?? 0 };
}

const money = (x) => (Math.round(x * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const args = process.argv.slice(2);

if (args[0] === "--expect") {
  const out = read(args[1]);
  fs.writeFileSync(local(args[2]), JSON.stringify(out, null, 1));
  console.log(`pricing-diff: expectations written (${Object.keys(out.lines).length} lines)`);
} else if (args[0] === "--check") {
  const got = read(args[1]);
  const want = JSON.parse(fs.readFileSync(local(args[2]), "utf8"));
  const wrong = [];
  for (const key of new Set([...Object.keys(want.lines), ...Object.keys(got.lines)])) {
    for (const [k] of KINDS) {
      const a = want.lines[key]?.[k], b = got.lines[key]?.[k];
      if (a === undefined || b === undefined || Math.abs(a - b) > 0.005) wrong.push(`${key} ${k}`);
    }
  }
  if (Math.abs(want.bid - got.bid) > 0.005) wrong.push("bid total");
  const result = { checked_at: new Date().toISOString(), lines: Object.keys(want.lines).length, wrong };
  fs.writeFileSync(path.join(path.dirname(local(args[2])), "last-check.json"), JSON.stringify(result, null, 1));
  console.log(`Benchmark A: ${result.lines} lines, ${wrong.length ? `WRONG (${wrong.length} figures)` : "right"}`);
  process.exit(wrong.length ? 1 : 0);
} else {
  const [beforeFile, afterFile, reportFile] = args;
  const item = args[args.indexOf("--item") + 1] && args.includes("--item") ? args[args.indexOf("--item") + 1] : "";
  const a = read(beforeFile), b = read(afterFile);
  const out = [`# Benchmark A before/after${item ? `: item ${item}` : ""} (${new Date().toISOString().slice(0, 16)}Z, local only)`, ""];
  out.push(`Before: ${path.basename(beforeFile)}; after: ${path.basename(afterFile)}.`, "");
  out.push("| Line | Kind | Before | After | Difference |", "|---|---|---|---|---|");
  for (const key of new Set([...Object.keys(a.lines), ...Object.keys(b.lines)])) {
    for (const [k] of KINDS) {
      const x = a.lines[key]?.[k] ?? 0, y = b.lines[key]?.[k] ?? 0;
      if (Math.abs(x) < 0.005 && Math.abs(y) < 0.005) continue;
      out.push(`| ${key} | ${k} | ${money(x)} | ${money(y)} | ${money(y - x)} |`);
    }
  }
  out.push("", "| Bid Summary | Before | After | Difference |", "|---|---|---|---|");
  for (const name of new Set([...Object.keys(a.summary), ...Object.keys(b.summary)])) {
    const x = a.summary[name] ?? 0, y = b.summary[name] ?? 0;
    out.push(`| ${name} | ${money(x)} | ${money(y)} | ${money(y - x)} |`);
  }
  out.push("", `Bid: ${money(a.bid)} → ${money(b.bid)} (${(((b.bid - a.bid) / a.bid) * 100).toFixed(1)} %).`);
  fs.writeFileSync(local(reportFile), out.join("\n") + "\n");
  console.log(`pricing-diff: report written to ${path.basename(reportFile)}`);
}

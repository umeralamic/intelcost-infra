// The software-competitor-name gate (CLAUDE.md hard rule 9, D-328, D-342, D-1050), run by quantity-table.sh on the host:
//
//   node browser/lib/competitor-gate.mjs <workspace root>
//
// Fails if a software competitor's name appears in a tracked text file of the three repos (intelcost-app-fastapi,
// intelcost-app-react, intelcost-infra: `git ls-files`, binaries and node_modules skipped) or in the workspace files
// (<root>/*.md and <root>/docs/**/*.md, docs/reference left out). Equipment maker and model names are allowed (D-1050)
// and are not on the list.
//
// The list is kept encoded so this file does not itself carry the names. It is the set D-342 reworded out and scanned
// for (the 2026-10-10 report's search terms: the browser takeoff products, the desktop takeoff products and the PDF
// markup product). Published cost books and data sources (D-328's scope) are not on it: D-1050 keeps the gate to
// software competitors. Patterns are matched word-bounded, any case. A bare three-letter product abbreviation and a common English word that is also a
// product name are matched only with the product's qualifier, so ordinary text does not trip the gate. Git history is
// not read (D-342 leaves it alone).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PATTERNS = Buffer.from(
  "enpccyp0YWtlb2ZmCnBsYW5ccypzd2lmdApibHVlXHMqYmVhbQpvblstXHNdP3NjcmVlblxzK3Rha2VvZmYKc3RhY2tccysoPzp0YWtlb2ZmfGNvbnN0cnVjdGlvbnxlc3RpbWF0aW5nKQ==",
  "base64",
)
  .toString("utf8")
  .split("\n")
  .filter(Boolean);
const RE = new RegExp(`\\b(?:${PATTERNS.join("|")})\\b`, "i");
const REPOS = ["intelcost-app-fastapi", "intelcost-app-react", "intelcost-infra"];
const MAX_BYTES = 8 * 1024 * 1024;

const root = path.resolve(process.argv[2] ?? "..");
const files = [];
for (const repo of REPOS) {
  const dir = path.join(root, repo);
  const out = execFileSync("git", ["-C", dir, "ls-files", "-z"], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
  for (const f of out.split("\0")) {
    if (!f || f.split("/").includes("node_modules")) continue;
    files.push({ abs: path.join(dir, f), rel: `${repo}/${f}` });
  }
}
for (const e of fs.readdirSync(root, { withFileTypes: true })) {
  if (e.isFile() && e.name.endsWith(".md")) files.push({ abs: path.join(root, e.name), rel: e.name });
}
const walk = (dir, rel) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = `${rel}/${e.name}`;
    if (e.isDirectory()) {
      if (r !== "docs/reference") walk(path.join(dir, e.name), r);
    } else if (e.name.endsWith(".md")) files.push({ abs: path.join(dir, e.name), rel: r });
  }
};
if (fs.existsSync(path.join(root, "docs"))) walk(path.join(root, "docs"), "docs");

const hits = [];
let read = 0;
for (const { abs, rel } of files) {
  let buf;
  try {
    const st = fs.statSync(abs);
    if (!st.isFile() || st.size > MAX_BYTES) continue;
    buf = fs.readFileSync(abs);
  } catch {
    continue; // deleted in the tree but still in the index
  }
  if (buf.subarray(0, 8192).includes(0)) continue; // binary
  read++;
  const lines = buf.toString("utf8").split("\n");
  lines.forEach((line, i) => {
    if (RE.test(line)) hits.push(`${rel}:${i + 1}`);
  });
}
if (hits.length) {
  console.log(`FAIL  software competitor names (hard rule 9): ${hits.length} line${hits.length === 1 ? "" : "s"}: ${hits.slice(0, 20).join(", ")}${hits.length > 20 ? ", ..." : ""}`);
  process.exit(1);
}
console.log(`Competitor names: none in ${read} text files (three repos and the workspace files)`);

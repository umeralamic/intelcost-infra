// The maker-name gate (D-1043 item 5), run by quantity-table.sh on the host:
//
//   node browser/lib/maker-gate.mjs <api repo> <eq_source rows as JSON>
//
// 1. The catalog's sources hold no equipment maker's name: release 1's eq_source.csv and the bench's
//    eqlib.eq_source, in their words (title, publisher, edition, supports). The key (source_id) and
//    the URL are identifiers, not words, and are not read.
// 2. Every other seed file under app/features/*/seed holds no more maker-name mentions than
//    maker-baseline.json records for it: the founder approved rewording eq_source only; the others are
//    held at their count so none is added.
//
// The list is kept encoded so this file does not itself carry the names (word-boundary, any case;
// "case" only as a brand: "case ce", "case construction"). The sources' check also reads two short
// two short brand words the baseline leaves out, which elsewhere in the seeds are too common
// to hold at a count.
import fs from "node:fs";
import path from "node:path";

const decode = (b64) => Buffer.from(b64, "base64").toString("utf8").split("|");
const MAKERS = decode(
  "Y2F0ZXJwaWxsYXJ8a29tYXRzdXxqb2huIGRlZXJlfGJvYmNhdHxrdWJvdGF8bGllYmhlcnJ8amNifGRvb3Nhbnx0YWtldWNoaXxrb2JlbGNvfHRlcmV4fGJvbWFnfGR5bmFwYWN8aGFtbXxzYWthaXx3YWNrZXJ8dmVybWVlcnxkaXRjaCB3aXRjaHxnZW5pZXxza3lqYWNrfGpsZ3xoaXRhY2hpfHZvbHZvfGNhc2UgY2V8Y2FzZSBjb25zdHJ1Y3Rpb258aHl1bmRhaQ==",
);
const SOURCE_EXTRA = decode("Y2F0fGRlZXJl");
const pattern = (words) => new RegExp(`\\b(?:${words.map((w) => w.replace(/ /g, "\\s+")).join("|")})\\b`, "gi");
const count = (text, re) => (text.match(re) ?? []).length;

const [, , apiRepo, sourceJson] = process.argv;
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const baseline = JSON.parse(fs.readFileSync(path.join(here, "maker-baseline.json"), "utf8")).files;
const features = path.join(apiRepo, "app", "features");
const SOURCE_FILE = "equipment/seed/release_1/eq_source.csv";
const WORDS = ["title", "publisher", "edition", "supports"];
const fail = [];

function parseCsv(t) {
  const rows = [];
  let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') { f += '"'; i++; } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
    else if (c !== "\r") f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [h, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ""])));
}

// 1. The sources, file and table.
const sourceRe = pattern([...MAKERS, ...SOURCE_EXTRA]);
const sourceHits = (rows, where) => {
  for (const r of rows) {
    const n = WORDS.reduce((t, k) => t + count(r[k] ?? "", sourceRe), 0);
    if (n) fail.push(`${where} ${r.source_id}: ${n} maker name${n === 1 ? "" : "s"}`);
  }
};
sourceHits(parseCsv(fs.readFileSync(path.join(features, SOURCE_FILE), "utf8")), "eq_source.csv");
sourceHits(JSON.parse(fs.readFileSync(sourceJson, "utf8")) ?? [], "eqlib.eq_source");

// 2. Every other seed file, at most its baseline.
const makerRe = pattern(MAKERS);
const seen = {};
for (const feature of fs.readdirSync(features)) {
  const seed = path.join(features, feature, "seed");
  if (!fs.existsSync(seed)) continue;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "__pycache__") walk(p); continue; }
      const rel = path.relative(features, p).split(path.sep).join("/");
      if (rel === SOURCE_FILE) continue;
      const n = count(fs.readFileSync(p, "utf8"), makerRe);
      if (n) seen[rel] = n;
      if (n > (baseline[rel] ?? 0)) fail.push(`${rel}: ${n} maker-name mentions, baseline ${baseline[rel] ?? 0}`);
    }
  };
  walk(seed);
}
const total = Object.values(seen).reduce((t, n) => t + n, 0);
if (fail.length) {
  console.log(`FAIL  maker names in the seeds: ${fail.join("; ")}`);
  process.exit(1);
}
console.log(`Maker names: none in the catalog's sources; ${total} mentions in ${Object.keys(seen).length} other seed files, none over the baseline`);

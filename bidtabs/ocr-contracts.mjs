// The OCR'd bid tabs as contracts (D-1169's 9 scrambled tabs, D-1211): each tab's pipe rows that OCR filled and checked
// (every bidder's unit cost times the quantity gives its printed total), classified as contracts.json's items are, so
// contract-runner.js prices them and rebuild-report.mjs puts them in the depth-band table. No bid figure lives here: the
// tabs are read from docs/reference (outside git) and the contracts written back there.
//
//   node bidtabs/ocr-contracts.mjs "<tabs-ocr-filled.json>" "<contracts.json>" "<out contracts-ocr.json>"
//
// The classifier is checked first against contracts.json's own 10 contracts: every item there must classify as it was.
// Left out, as before: service leads (EA, off the main), casings, sleeves, bore and jack, and rows without prices.

import { readFileSync, writeFileSync } from "node:fs";

const [, , tabsPath, contractsPath, outPath] = process.argv;
const tabs = JSON.parse(readFileSync(tabsPath, "utf8"));
const known = JSON.parse(readFileSync(contractsPath, "utf8"));

/** A row's pipe: { type, entry, nominal, depth } or null (not a pipe the comparison prices). */
export function classify(descRaw) {
  const d = descRaw.toUpperCase().replace(/[“”]/g, '"').replace(/\s+/g, " ");
  if (/SERVICE LEAD|CASING|SLEEVE|BORE AND JACK|AUGER|TUNNEL|ABANDON|REMOVE/.test(d)) return null;
  const size = d.match(/(\d{1,2})\s*"/);
  if (!size) return null;
  const nominal = size[1];
  const band = d.match(/(\d+)\s*'?\s*-\s*(\d+)\s*'?\s*(?:CUT|DEPTH)/);
  const deeper = /(\d+)\s*'?\s*AND DEEPER/.exec(d);
  // A description cut off after its band's top ("SDR 26, 24'-", "24'-28"): the tabs' 4 ft band.
  const cut = band ? null : d.match(/(\d+)\s*'\s*-\s*(\d+)?\s*'?\s*$/);
  if (cut) return { type: "sanitary", entry: /SDR\s*35/.test(d) ? "pvc_d3034_sdr35" : "pvc_d3034_sdr26", nominal, depth: Number(cut[1]) + 2 };
  const gravityDepth = band ?(Number(band[1]) === 0 ? 6.5 : (Number(band[1]) + Number(band[2])) / 2) : deeper ? Number(deeper[1]) + 2 : null;
  if (/FORCE MAIN/.test(d)) return { type: "force_main", entry: /DR\s*-?\s*14/.test(d) ? "pvc_c900_dr14" : "pvc_c900_dr18", nominal, depth: null };
  // contracts.json reads a C-900 collection line as water.
  if (/WATER|COLLECTION LINE/.test(d)) {
    if (/DUCTILE IRON/.test(d)) return { type: "water", entry: "di_c151_pc350", nominal, depth: null };
    return { type: "water", entry: /DR\s*-?\s*14/.test(d) ? "pvc_c900_dr14" : "pvc_c900_dr18", nominal, depth: null };
  }
  if (/STORM/.test(d)) {
    const entry = /R\.?C\.?P\b/.test(d) ? "rcp_c76_wall_b" : /H\.?D\.?P\.?E/.test(d) ? "hdpe_f2648_dual_wall" : null;
    return entry ? { type: "storm", entry, nominal, depth: gravityDepth ?? 6.5 } : null;
  }
  if (/SEWER PIPE|SANITARY/.test(d)) {
    if (gravityDepth == null) return null;
    const entry = /C-?900/.test(d) ? (/DR\s*-?\s*14/.test(d) ? "pvc_c900_dr14" : "pvc_c900_dr18") : /SDR\s*35/.test(d) ? "pvc_d3034_sdr35" : "pvc_d3034_sdr26";
    return { type: "sanitary", entry, nominal, depth: gravityDepth };
  }
  return null;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 1e4) / 1e4;
};

// The check: contracts.json's items classify as they were.
let bad = 0;
for (const k of known)
  for (const i of k.items) {
    const c = classify(i.desc);
    const want = `${i.type}|${i.entry}|${i.nominal}|${i.depth}`;
    const got = c ? `${c.type}|${c.entry}|${c.nominal}|${c.depth}` : "null";
    if (want !== got) {
      bad++;
      console.log(`CHECK  ${k.key}  ${want}  got ${got}  ${i.desc.slice(0, 90)}`);
    }
  }
console.log(`classifier on contracts.json: ${known.reduce((n, k) => n + k.items.length, 0) - bad} of ${known.reduce((n, k) => n + k.items.length, 0)} as before`);
if (bad > 0) process.exit(1);

const already = new Set(known.map((k) => k.key));
const out = [];
for (const t of tabs) {
  if (already.has(t.key)) continue;
  const seen = new Set();
  const items = [];
  const left = [];
  for (const p of t.pipes) {
    if (!p.ocr || !p.prices?.length || !(p.qty > 0)) continue;
    const id = `${p.no}|${p.qty}|${p.desc}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const c = classify(p.desc);
    if (!c) {
      left.push(p.desc.slice(0, 70));
      continue;
    }
    items.push({ no: p.no, section: (p.section ?? "").replace(/\s+\$[\d,.]+.*$/, "").trim(), desc: p.desc, ...c, qty: p.qty, median: median(p.prices), bidders: p.prices.length, pricesRaw: p.prices, ocr: true, hand: Boolean(p.ocr.hand) });
  }
  console.log(`${t.key}  ${t.date}  ${items.length} items${left.length ? `  left out: ${left.join(" | ")}` : ""}`);
  if (items.length) out.push({ key: t.key, agency: t.agency, date: t.date, types: t.types, items });
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`${out.length} contracts, ${out.reduce((n, k) => n + k.items.length, 0)} items -> ${outPath}`);

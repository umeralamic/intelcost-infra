// Every pay item's bidder unit prices and each tab's base-bid totals, read from the tab PDFs' text layer (D-1271, Part 5
// of the 2026-11-14 night run). The pipe items were read before (tabs-ocr-filled, contracts*.json); this reads the rest,
// so the non-LF items (valves, hydrants, flushing valves, tapping sleeves, wet connections, plugs and blow-offs,
// services, fittings by the ton) can be compared as their own group, and each item's share of its tab worked out.
// No bid figure lives here: the PDFs and tab-items-2026-11-12.json are read from docs/reference (outside git) and the
// result written back there.
//
//   node bidtabs/tab-prices.mjs "<Bid tabs dir>" "<out tab-prices.json>"
//
// Needs xpdf's `pdftotext` on the PATH: its -table mode keeps each row's unit, quantity and the bidders' unit costs and
// totals on one line, but the text layer often displaces a row's description by a line or two, so rows are matched by
// order, not by their words. Each block of bidders (four to a page; bidders 5-8 on later pages) is a sequence of money
// rows in item order; the tab's item list (tab-items) is aligned to it by dynamic programming: a row matches an item
// when it prints the item's unit and quantity, or prints no quantity but its amounts pair as unit x quantity = total for
// the item's quantity. A unit price counts only when its total is on the same row (each bidder prints both), so a stray
// figure is never taken. An item that matches no row in any block is left without prices and listed.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [, , dir, outPath] = process.argv;
const items = JSON.parse(readFileSync(`${dir}/tab-items-2026-11-12.json`, "utf8"));
const keys = JSON.parse(readFileSync(`${dir}/contracts-16-d1267b-2026-11-15.json`, "utf8")).map((c) => c.key);

const UNIT_QTY = /\b(LF|EA|TON|VF|SY|CY|LS|AC|SF|MO|DAY)\s+([\d,]+(?:\.\d+)?)\b(?!\.\d{2}\b)/;
const money = (s) => [...s.matchAll(/\$\s?([\d,]+\.\d{2})/g)].map((m) => Number(m[1].replace(/,/g, "")));
const pdfOf = (k) => [`${dir}/tabs-pdf/${k}.pdf`, `${dir}/${k}.pdf`].find(existsSync);
const near = (a, b) => Math.abs(a - b) <= Math.max(0.011, 0.0005 * Math.abs(b));

/** The unit prices on a row for a quantity: each amount whose unit x quantity is also on the row, each amount once. */
function pricesFor(amounts, qty) {
  const used = new Set();
  const out = [];
  for (let a = 0; a < amounts.length; a++) {
    if (used.has(a)) continue;
    const u = amounts[a];
    const t = amounts.findIndex((v, z) => z > a && !used.has(z) && near(v, u * qty));
    if (t < 0) continue;
    used.add(a);
    used.add(t);
    out.push(u);
  }
  return out;
}

const out = [];
for (const key of keys) {
  const run = spawnSync("pdftotext", ["-table", "-q", pdfOf(key), "-"], { encoding: "utf8", maxBuffer: 64 << 20 });
  const pages = run.stdout.split("\f").map((p) => p.split(/\r?\n/));
  // Blocks of bidders: each page's header numbers its bidders ("1) ...  2) ..."), four to a page; a page's block is
  // its lowest number's group of four (the text layer sometimes drops a name, so "234" is still the first block), a
  // page without one keeps the page before's.
  const numbers = (lines) => [...lines.slice(0, 45).join("\n").matchAll(/(?:^|\s)(\d)\)\s+[A-Z]/gm)].map((m) => Number(m[1]));
  const blockOf = [];
  let block = 0;
  let most = 0;
  pages.forEach((lines, i) => {
    const ns = numbers(lines);
    most = Math.max(most, ...ns);
    if (ns.length > 0) block = Math.floor((Math.min(...ns) - 1) / 4);
    blockOf[i] = block;
  });
  const tabItems = items[key].items.map((it) => ({ ...it, q: Number(String(it.qty).replace(/,/g, "")) }));
  const firstItemPage = Math.min(...tabItems.map((i) => i.page)) - 1;
  const blocks = [...new Set(blockOf)].sort((a, b) => a - b);
  const prices = tabItems.map(() => []);

  for (const b of blocks) {
    // The block's money rows in order (from the first item's page: the cover sheet totals every bidder).
    const rows = [];
    blockOf.forEach((x, p) => {
      if (x !== b || p < firstItemPage) return;
      for (const line of pages[p]) {
        if (/SUBTOTAL|TOTAL AMOUNT|TOTAL BASE|TOTAL ALTERNATE/i.test(line)) continue;
        const amounts = money(line);
        if (amounts.length < 2) continue;
        const uq = line.match(UNIT_QTY);
        rows.push({ unit: uq?.[1] ?? null, qty: uq ? Number(uq[2].replace(/,/g, "")) : null, amounts });
      }
    });
    // Align: score[i][r] = best matches of items[i..] against rows[r..].
    const I = tabItems.length;
    const R = rows.length;
    const fit = (it, row) => {
      if (row.unit === it.unit && row.qty != null && near(row.qty, it.q)) return pricesFor(row.amounts, it.q).length > 0 ? 3 : 1;
      if (row.qty == null && pricesFor(row.amounts, it.q).length > 0) return 2;
      return 0;
    };
    const S = Array.from({ length: I + 1 }, () => new Float64Array(R + 1));
    for (let i = I - 1; i >= 0; i--)
      for (let r = R - 1; r >= 0; r--) {
        const f = fit(tabItems[i], rows[r]);
        S[i][r] = Math.max(S[i + 1][r], S[i][r + 1], f > 0 ? f + S[i + 1][r + 1] : 0);
      }
    let i = 0;
    let r = 0;
    while (i < I && r < R) {
      const f = fit(tabItems[i], rows[r]);
      if (f > 0 && S[i][r] === f + S[i + 1][r + 1]) {
        prices[i].push(...pricesFor(rows[r].amounts, tabItems[i].q));
        i++;
        r++;
      } else if (S[i][r] === S[i][r + 1]) r++;
      else i++;
    }
  }
  const parsed = tabItems.map((it, i) => ({ no: it.no, page: it.page, unit: it.unit, qty: it.q, desc: it.desc, prices: prices[i] }));

  // The base bid's total, each bidder's: the figures on "TOTAL AMOUNT BASE BID" lines (an overprinted line's stray
  // subtotal is dropped: a total is at least half the largest).
  const totals = new Set();
  for (const lines of pages) for (const l of lines) if (/TOTAL AMOUNT (OF )?BASE BID|TOTAL BASE BID/i.test(l) && !/SUBTOTAL/i.test(l)) for (const v of money(l)) totals.add(v);
  const tv = [...totals];
  const top = Math.max(0, ...tv);
  const baseTotals = tv.filter((v) => v >= top / 2).sort((a, b) => a - b);
  out.push({ key, bidders: most || null, blocks: blocks.length, baseTotals, items: parsed });
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
for (const c of out) {
  const n = c.items.length;
  const full = c.items.filter((i) => i.prices.length >= (c.bidders ?? 99)).length;
  const some = c.items.filter((i) => i.prices.length > 0).length;
  const over = c.items.filter((i) => i.prices.length > (c.bidders ?? 99)).length;
  console.log(`${c.key.padEnd(11)} bidders ${String(c.bidders).padStart(2)} blocks ${c.blocks}  items ${String(n).padStart(3)}  all bidders ${String(full).padStart(3)}  some ${String(some).padStart(3)}  more than bidders ${over}  base totals ${c.baseTotals.length}`);
}

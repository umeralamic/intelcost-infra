// The shared quantity table (D-61, kept by D-68): the browser's engine against the api's
// on the same shapes, and both against the answers worked by hand. No world, no sign-in:
// it imports `lib/takeoff/quantity.ts` from the app's dev server and runs it in Chromium.
//
//   ./quantity-table.sh      (from intelcost-infra/; it runs this twice, around the api's pass)
//
// GEN=1 writes the cases for the api's pass (drives/quantity-table.py); without it, this
// reads the api's answers and compares.

import { readFile, writeFile } from "node:fs/promises";

import { APP, openBrowser } from "./lib/bench.mjs";
import { CASES } from "./lib/quantity-cases.mjs";

const HERE = "/drive/scripts";
if (process.env.GEN === "1") {
  await writeFile(`${HERE}/.qt-cases.json`, JSON.stringify(CASES));
  console.log(`GEN ${CASES.length} cases`);
  process.exit(0);
}

const python = new Map(JSON.parse(await readFile(`${HERE}/.qt-python.json`, "utf8")).map((r) => [r.id, r.value]));
const browser = await openBrowser();
let web;
try {
  const page = await browser.newPage();
  await page.goto(`${APP}/login`);
  web = await page.evaluate(async (cases) => {
    const q = await import("/src/lib/takeoff/quantity.ts");
    const pts = (v) => v.map(([x, y]) => ({ x, y }));
    return cases.map((c) => {
      const page = { widthPt: c.page[0], heightPt: c.page[1] };
      if (c.type === "sf") {
        const pos = c.shapes.filter((s) => s.role !== "subtract").map((s) => ({ points: pts(s.vertices), meta: s.meta }));
        const neg = c.shapes.filter((s) => s.role === "subtract").map((s) => ({ points: pts(s.vertices), meta: s.meta }));
        return q.areaOnSheet(pos, neg, c.fpp, page);
      }
      return c.shapes.reduce((sum, s) => sum + q.quantityFor(c.type, pts(s.vertices), c.fpp, s.meta, page), 0);
    });
  }, CASES);
} finally {
  await browser.close();
}

const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const disagree = [];
const wrong = [];
for (const [i, c] of CASES.entries()) {
  const api = python.get(c.id);
  if (c.crossing) {
    if (web[i] !== null) disagree.push(`${c.id}: the browser clipped (${web[i]})`);
  } else if (web[i] === null || api === undefined || !close(api, web[i])) disagree.push(`${c.id}: api ${api}, browser ${web[i]}`);
  if (c.expect !== undefined && (api === undefined || !close(api, c.expect))) wrong.push(`${c.id}: ${api}, expected ${c.expect}`);
}
if (python.size !== CASES.length) disagree.push(`${python.size} api answers for ${CASES.length} rows`);

const worked = CASES.filter((c) => c.expect !== undefined).length;
if (disagree.length || wrong.length) {
  for (const line of [...disagree, ...wrong]) console.log(`FAIL  ${line}`);
  console.log(`quantity table: ${disagree.length} disagree, ${wrong.length} wrong, of ${CASES.length} rows`);
  process.exit(1);
}
console.log(`quantity table: ${CASES.length} rows, both engines equal to 1e-9 on ${CASES.filter((c) => !c.crossing).length}; ${worked} worked answers right; passed`);

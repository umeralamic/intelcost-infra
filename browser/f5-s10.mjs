// F5-S10: pdf.js on the canvas (D-14, D-35, D-42).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s10.mjs
//
// A run's own two-sheet PDF: page 1 landscape with a zero-width hairline down its middle,
// calibrated at 100 ft over 612 pt, with a 0.2 x 0.2 area item that reads 1,035.29 SF
// (measured in points, D-51).
//
// The canvas's contract: the worker's fit image is `img[alt="Drawing sheet"]`, and pdf.js
// draws into `canvas[data-sheet-raster]` over it, carrying the frame's zoom, resolution
// scale, window origin and page width as data attributes. `window.__intelcostPdf()` gives
// the document and bitmap caches' counts.

import { APP, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { call } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S10 raster");
const project = await makeProject(token, base, { name: "Raster" });
const PAGES = [
  { width: 1224, height: 792, label: "S10 1", hairline: true },
  { width: 1224, height: 792, label: "S10 2" },
];
const BAR = { p1_x_norm: 0.1, p1_y_norm: 0.9, p2_x_norm: 0.6, p2_y_norm: 0.9, real_distance_ft: 100, unit: "ft" };
let sheets;
const takeoff = `${base}/${project.uuid}/takeoff`;
const url = (sheet) => `${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`;

/** The frame on screen, as the canvas describes it. */
const raster = (page) =>
  page.locator("canvas[data-sheet-raster]").evaluate((c) => {
    const box = c.getBoundingClientRect();
    return {
      zoom: Number(c.dataset.rasterZoom),
      res: Number(c.dataset.rasterRes),
      windowed: c.dataset.rasterWindow === "1",
      key: c.dataset.rasterKey,
      width: c.width,
      height: c.height,
      css: { left: box.left, top: box.top, width: box.width, height: box.height },
    };
  });

/** The canvas's exact zoom, 1 = fit width. */
const canvasZoom = (page) => page.locator("[data-sheet-scroller]").evaluate((el) => Number(el.dataset.zoom));

/** Wait until the sharp frame for the zoom on screen (about `zoom`) is drawn. */
async function settledAt(page, zoom, timeout = 30000) {
  await page.waitForFunction(
    (z) => {
      const scroller = document.querySelector("[data-sheet-scroller]");
      const c = document.querySelector("canvas[data-sheet-raster]");
      const now = Number(scroller?.dataset.zoom);
      return c && Math.abs(now - z) / z < 0.02 && Number(c.dataset.rasterZoom) === now && c.dataset.rasterRes === "1";
    },
    zoom,
    { timeout },
  );
}

/** Ctrl + wheel at a window point until the zoom is `target` (within 1%). The wheel is
 *  exp(-deltaY * 0.0015) of CSS pixels, and on a dpr-2 display one event's delta arrives
 *  halved, so it is repeated on what is left rather than computed once. */
async function wheelTo(page, target, at) {
  await page.mouse.move(at.x, at.y);
  // What fraction of a sent delta reaches the page: 1 at dpr 1, a half at dpr 2. Learned
  // from each event and corrected for, so it lands in two or three events.
  let gain = 1;
  for (let i = 0; i < 6; i += 1) {
    const current = await canvasZoom(page);
    if (Math.abs(current - target) / target < 0.01) return;
    const wanted = Math.log(target / current);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -wanted / 0.0015 / gain);
    await page.keyboard.up("Control");
    await page.waitForFunction((was) => Number(document.querySelector("[data-sheet-scroller]").dataset.zoom) !== was, current, { timeout: 5000 });
    const got = Math.log((await canvasZoom(page)) / current);
    if (Math.abs(got) > 1e-6) gain *= got / wanted;
  }
  const reached = await canvasZoom(page);
  if (Math.abs(reached - target) / target >= 0.01) {
    throw new Error(`the wheel did not reach ${target * 100}% (at ${(reached * 100).toFixed(1)}%)`);
  }
}

async function open(page, sheet) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(url(sheet));
  await settledAt(page, 1);
}

/**
 * Dark device pixels across the raster's row where the page's own (normX, normY) falls,
 * `span` either side. The point is first scrolled to the middle of the view, and the
 * windowed raster waited for until it covers it, so this reads the pixels the frame's own
 * origin and scale say are there, not whatever is under the pointer.
 */
async function darkAtPage(page, normX, normY, span = 12) {
  await page.locator("[data-sheet-scroller]").evaluate(
    (el, [nx, ny]) => {
      const pageBox = el.querySelector(":scope > div > div").getBoundingClientRect();
      const view = el.getBoundingClientRect();
      el.scrollLeft += pageBox.left + nx * pageBox.width - (view.left + view.width / 2);
      el.scrollTop += pageBox.top + ny * pageBox.height - (view.top + view.height / 2);
    },
    [normX, normY],
  );
  // The point in the frame's own CSS pixels: page position minus the window's origin.
  await page.waitForFunction(
    ([nx, ny, sp]) => {
      const c = document.querySelector("canvas[data-sheet-raster]");
      if (!c || c.dataset.rasterRes !== "1") return false;
      const d = c.dataset;
      const x = nx * Number(d.rasterPageWidth) - Number(d.rasterOriginX);
      const y = ny * Number(d.rasterPageHeight) - Number(d.rasterOriginY);
      return x > sp && x < Number(d.rasterCssWidth) - sp && y > 0 && y < Number(d.rasterCssHeight);
    },
    [normX, normY, span],
    { timeout: 20000 },
  );
  return page.locator("canvas[data-sheet-raster]").evaluate(
    (c, [nx, ny, sp]) => {
      const d = c.dataset;
      const scale = c.width / Number(d.rasterCssWidth);
      const x = Math.round((nx * Number(d.rasterPageWidth) - Number(d.rasterOriginX)) * scale);
      const y = Math.round((ny * Number(d.rasterPageHeight) - Number(d.rasterOriginY)) * scale);
      const row = c.getContext("2d").getImageData(Math.max(0, x - sp), y, sp * 2, 1).data;
      let dark = 0;
      for (let i = 0; i < row.length; i += 4) if (row[i] + row[i + 1] + row[i + 2] < 3 * 128) dark += 1;
      return dark;
    },
    [normX, normY, span],
  );
}

/** Dark pixels across the raster's row at a window point, `span` device px either side. */
const darkRun = (page, at, span = 30) =>
  page.locator("canvas[data-sheet-raster]").evaluate(
    (c, { at, span }) => {
      const box = c.getBoundingClientRect();
      const sx = c.width / box.width;
      const x = Math.round((at.x - box.left) * sx);
      const y = Math.round((at.y - box.top) * sx);
      const row = c.getContext("2d").getImageData(Math.max(0, x - span), y, span * 2, 1).data;
      let dark = 0;
      for (let i = 0; i < row.length; i += 4) if (row[i] + row[i + 1] + row[i + 2] < 3 * 128) dark += 1;
      return dark;
    },
    { at, span },
  );

await run("f5-s10", [
  {
    title: "setup: two pages loaded and prepared; page 1 calibrated; a 0.2 x 0.2 area item",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "S10.pdf", buffer: makePdf(PAGES), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["S10.pdf"].uuid, [1, 2]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      sheets = (await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid)).sort((a, b) => a.page_number - b.page_number);
      const calibrated = await call(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheets[0].uuid}/calibration`, BAR);
      expect(calibrated.status === 200, `calibrate: ${calibrated.status}`);
      const square = [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]];
      const made = await call(token, "POST", `${takeoff}/item`, {
        name: "S10 square",
        type: "sf",
        unit: "SF",
        sheet_uuid: sheets[0].uuid,
        geometry: { geom_type: "sf", vertices_json: square, shape_meta: null, client_uuid: crypto.randomUUID() },
      });
      expect(made.status === 201, `item: ${made.status} ${JSON.stringify(made.body)}`);
      return "S10.pdf pages 1 and 2 prepared; 100 ft over 612 pt; S10 square";
    },
  },
  {
    title: "AC1: on a dpr-2 display the settled picture is a pdf.js raster at 100%, 400%, 2000% and 4000%; a hairline stays one to two device pixels wide at 4000%",
    run: async ({ context }) => {
      const sharp = await context.browser().newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
      try {
        const page = await sharp.newPage();
        await open(page, sheets[0]);
        // The hairline runs down the page's middle: the wheel is anchored there, so it
        // stays under the pointer at every zoom.
        const img = await page.locator('img[alt="Drawing sheet"]').boundingBox();
        const view = await page.locator("[data-sheet-scroller]").boundingBox();
        const at = { x: img.x + img.width / 2, y: Math.min(img.y + img.height / 2, view.y + view.height / 2) };
        const seen = [];
        for (const z of [1, 4, 20, 40]) {
          if (z !== 1) await wheelTo(page, z, at);
          await settledAt(page, z);
          const r = await raster(page);
          const expectW = r.css.width * 2;
          expect(Math.abs(r.width - expectW) <= 2, `at ${z * 100}%: backing ${r.width} px for ${r.css.width} CSS px (want ${expectW})`);
          expect(z <= 2.5 ? !r.windowed : r.windowed, `at ${z * 100}%: windowed ${r.windowed}`);
          seen.push(`${z * 100}% ${r.width}x${r.height}${r.windowed ? " window" : ""}`);
        }
        // The hairline: page x = 0.5, from 20% to 91% of the page's height.
        const line = await darkAtPage(page, 0.5, 0.5);
        expect(line >= 1 && line <= 2, `the hairline is ${line} device px wide at 4000%`);
        return `${seen.join(" · ")} · hairline ${line} device px at 4000%`;
      } finally {
        await sharp.close();
      }
    },
  },
  {
    title: "AC2: measurements land where they did: the square reads 1,035.29 SF (in points, D-51), the raster sits exactly under the overlay, and the page's border falls where the PDF put it",
    run: async ({ page }) => {
      await open(page, sheets[0]);
      const row = await page.locator("[data-quantity-panel] li button", { hasText: "S10 square" }).first().textContent();
      // The quantity is the check; the panel's number format is F6's. Measured in points
      // (D-51): 0.2 × 0.2 of a 1224 × 792 pt page is 244.8 × 158.4 pt, at 100 ft per
      // 612 pt, so 1,035.29 SF. The old 1,600 treated a normalised unit as the same
      // length across and down the page.
      expect(/1,035\.29 SF/.test(row), `the row reads "${row}"`);
      const checks = [];
      for (const z of [1, 4]) {
        if (z !== 1) {
          const img = await page.locator('img[alt="Drawing sheet"]').boundingBox();
          await wheelTo(page, z, { x: img.x + 40, y: img.y + 40 });
          await settledAt(page, z);
        }
        const r = await raster(page);
        const svg = await page.locator('svg[role="presentation"]').boundingBox();
        const origin = await page.locator("canvas[data-sheet-raster]").evaluate((c) => ({ x: Number(c.dataset.rasterOriginX), y: Number(c.dataset.rasterOriginY), w: Number(c.dataset.rasterPageWidth) }));
        const s = svg.width / origin.w;
        expect(Math.abs(r.css.left - (svg.x + origin.x * s)) <= 1 && Math.abs(r.css.top - (svg.y + origin.y * s)) <= 1, `at ${z * 100}%: raster at ${r.css.left},${r.css.top}, overlay puts it at ${svg.x + origin.x * s},${svg.y + origin.y * s}`);
        checks.push(`${z * 100}% on the overlay`);
      }
      // The border's left edge, 72 pt in on a 1224 pt page, at mid height, at 100%.
      await page.getByRole("button", { name: /^Zoom \d+ percent/ }).click();
      await settledAt(page, 1);
      const svg = await page.locator('svg[role="presentation"]').boundingBox();
      const edge = await darkRun(page, { x: svg.x + svg.width * (72 / 1224), y: svg.y + svg.height * 0.5 }, 3);
      expect(edge >= 1, "no border under the overlay's x = 72/1224");
      return `row "${row.replace("S10 square", "").trim()}" · ${checks.join(" · ")} · the border under x = 72/1224`;
    },
  },
  {
    title: "AC3: switching sheets opens each file once: the document cache shows one open per sheet",
    run: async ({ page }) => {
      await open(page, sheets[0]);
      const go = async (sheet) => {
        await page.evaluate((path) => {
          window.history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, new URL(url(sheet)).pathname);
        await page.waitForFunction((uuid) => document.querySelector("canvas[data-sheet-raster]")?.dataset.rasterKey?.startsWith(uuid), sheet.uuid, { timeout: 20000 });
      };
      for (const sheet of [sheets[1], sheets[0], sheets[1], sheets[0]]) await go(sheet);
      const stats = await page.evaluate(() => window.__intelcostPdf());
      expect(stats.documents.opens === 2, `opened ${stats.documents.opens} times for two sheets`);
      return `two sheets, back and forth twice: ${stats.documents.opens} opens, ${stats.documents.open} open`;
    },
  },
  {
    title: "AC4: on a 4 GB deviceMemory profile the bitmap budget is 64 MB",
    run: async ({ page }) => {
      await page.addInitScript(() => Object.defineProperty(navigator, "deviceMemory", { get: () => 4 }));
      await open(page, sheets[0]);
      const { bitmaps } = await page.evaluate(() => window.__intelcostPdf());
      expect(bitmaps.budget === 64 * 1024 * 1024, `budget ${bitmaps.budget}`);
      return `budget ${bitmaps.budget / 1024 / 1024} MB`;
    },
  },
]);

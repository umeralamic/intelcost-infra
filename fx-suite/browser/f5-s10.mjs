// F5-S10: pdf.js on the canvas (D-14, D-35, D-42).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s10.mjs
//
// A run's own two-sheet PDF: page 1 landscape with a zero-width hairline down its middle,
// calibrated at 100 ft over 612 pt, with a 0.2 x 0.2 area item that reads 1,035.29 SF
// (measured in points, D-51).
//
// The canvas's contract: the worker's fit image is `[data-sheet-image="fit"]`, and pdf.js
// draws into `canvas[data-sheet-raster]` over it, carrying the frame's zoom, resolution
// scale, window origin and page width as data attributes. `window.__intelcostPdf()` gives
// the document and bitmap caches' counts.
//
// Updated 2026-10-24 (D-35, D-102, D-76, D-79, D-101, D-103, D-357, D-77):
// - Zoom is absolute (D-35's baseline, D-102 merged into it): 100% is 170 CSS px per inch of sheet, not
//   "the page fitted to the width". AC1's 100%, 400%, 2000% and 4000% are those absolute levels (D-35:
//   "F5-S10 and S11 prove sharpness at 100%, 400%, 2000% and 4000% on a dpr-2 profile"), and a frame is
//   windowed when the page's footprint passes 2.5 times the fitted width (D-35, `isWindowed`), computed
//   from the canvas, not assumed at "above 250%".
// - A sheet opens at its Fit (D-76 A3, D-35), whatever number that is: `settledAt()` with no zoom waits
//   for the sharp frame of the zoom on screen, where the open used to wait for zoom 1.
// - The fit image is a decoded canvas, `[data-sheet-image="fit"]` (D-101); the `<img alt="Drawing sheet">`
//   is only its fallback. The wheel's anchor and AC2's points are read from the page box instead.
// - A bare wheel zooms (D-76 A1; Ctrl is a pinch at 0.0025): `wheelTo` sends a bare wheel, and still
//   learns each event's gain.
// - The canvas does not scroll (D-79: the view is the stage's transform, no scrollbars): the hairline is
//   kept under the wheel's anchor (the page's middle) instead of being scrolled there (harness).
// - AC2: the zoom percentage opens the zoom menu (D-103, only on the cluster since D-357), so the view
//   goes back by its "Zoom to Fit" (the open's picture) rather than by clicking the percentage; 400% is
//   the absolute level. The item's row is the Takeoff panel's `li[data-item-row]` with its figure in
//   `[data-item-qty]` (D-77); 1,035.29 SF is checked at the decimals the row shows.

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

/** Whether D-35's rule windows the frame on screen: the page's footprint past 2.5 times the
 *  fitted width (`isWindowed`: the canvas's width less its 24 px gutters, at least 320). */
const windowRule = (page) =>
  page.evaluate(() => {
    const view = document.querySelector("[data-sheet-scroller]").getBoundingClientRect();
    const box = document.querySelector("[data-page-turn]").getBoundingClientRect();
    return box.width > 2.5 * Math.max(view.width - 48, 320);
  });

/** The canvas's exact zoom (absolute: 1 = 100% = 170 CSS px per inch, D-35). */
const canvasZoom = (page) => page.locator("[data-sheet-scroller]").evaluate((el) => Number(el.dataset.zoom));

/** The page's box on screen. */
const pageBox = (page) => page.locator("[data-page-turn]").boundingBox();

/** Wait until the sharp frame for the zoom on screen (about `zoom`, or whatever it is) is drawn. */
async function settledAt(page, zoom = null, timeout = 30000) {
  await page.waitForFunction(
    (z) => {
      const scroller = document.querySelector("[data-sheet-scroller]");
      const c = document.querySelector("canvas[data-sheet-raster]");
      const now = Number(scroller?.dataset.zoom);
      return c && (z === null || Math.abs(now - z) / z < 0.02) && Number(c.dataset.rasterZoom) === now && c.dataset.rasterRes === "1";
    },
    zoom,
    { timeout },
  );
}

/** The wheel at a window point until the zoom is `target` (within 1%). The wheel is
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
    await page.mouse.wheel(0, -wanted / 0.0015 / gain);
    await page.waitForFunction((was) => Number(document.querySelector("[data-sheet-scroller]").dataset.zoom) !== was, current, { timeout: 5000 });
    const got = Math.log((await canvasZoom(page)) / current);
    if (Math.abs(got) > 1e-6) gain *= got / wanted;
  }
  const reached = await canvasZoom(page);
  if (Math.abs(reached - target) / target >= 0.01) {
    throw new Error(`the wheel did not reach ${target * 100}% (at ${(reached * 100).toFixed(1)}%)`);
  }
}

/** Open the sheet; it opens at its Fit (D-76, D-35). Returns that fit. */
async function open(page, sheet) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(url(sheet));
  await settledAt(page);
  return canvasZoom(page);
}

/**
 * Dark device pixels across the raster's row where the page's own (normX, normY) falls,
 * `span` either side. The canvas does not scroll (D-79), so the caller keeps the point in view
 * (the wheel anchored on it); the windowed raster is waited for until it covers it, so this
 * reads the pixels the frame's own origin and scale say are there, not whatever is under the
 * pointer.
 */
async function darkAtPage(page, normX, normY, span = 12) {
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
        const fit = await open(page, sheets[0]);
        // The hairline runs down the page's middle: the wheel is anchored there, so it
        // stays under the pointer at every zoom.
        const box = await pageBox(page);
        const view = await page.locator("[data-sheet-scroller]").boundingBox();
        const at = { x: box.x + box.width / 2, y: Math.min(box.y + box.height / 2, view.y + view.height / 2) };
        const seen = [`fit ${(fit * 100).toFixed(1)}%`];
        for (const z of [1, 4, 20, 40]) {
          await wheelTo(page, z, at);
          await settledAt(page, z);
          const r = await raster(page);
          const expectW = r.css.width * 2;
          expect(Math.abs(r.width - expectW) <= 2, `at ${z * 100}%: backing ${r.width} px for ${r.css.width} CSS px (want ${expectW})`);
          const rule = await windowRule(page);
          expect(r.windowed === rule, `at ${z * 100}%: windowed ${r.windowed}, D-35's rule says ${rule}`);
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
      const fit = await open(page, sheets[0]);
      const itemRow = page.locator("[data-quantity-panel] li[data-item-row]").filter({ hasText: "S10 square" }).first();
      await itemRow.locator("[data-item-qty]").waitFor();
      const qty = (await itemRow.locator("[data-item-qty]").textContent()).trim();
      const unit = (await itemRow.locator("[data-item-qty] + span").textContent()).trim();
      // The quantity is the check; the panel's number format is F6's. Measured in points
      // (D-51): 0.2 × 0.2 of a 1224 × 792 pt page is 244.8 × 158.4 pt, at 100 ft per
      // 612 pt, so 1,035.29 SF. The old 1,600 treated a normalised unit as the same
      // length across and down the page. Checked at the decimals the row shows.
      const shown = Number(qty.replace(/[,*]/g, ""));
      const decimals = (qty.replace(/\*/g, "").split(".")[1] ?? "").length;
      expect(unit === "SF" && Math.abs(shown - 1035.2941) <= 0.5 * 10 ** -decimals + 1e-9, `the row reads "${qty} ${unit}"`);
      const checks = [];
      for (const z of [null, 4]) {
        if (z !== null) {
          const box = await pageBox(page);
          await wheelTo(page, z, { x: box.x + 40, y: box.y + 40 });
          await settledAt(page, z);
        }
        const r = await raster(page);
        const svg = await page.locator('svg[role="presentation"]').boundingBox();
        const origin = await page.locator("canvas[data-sheet-raster]").evaluate((c) => ({ x: Number(c.dataset.rasterOriginX), y: Number(c.dataset.rasterOriginY), w: Number(c.dataset.rasterPageWidth) }));
        const s = svg.width / origin.w;
        const name = z === null ? `fit ${(fit * 100).toFixed(1)}%` : `${z * 100}%`;
        expect(Math.abs(r.css.left - (svg.x + origin.x * s)) <= 1 && Math.abs(r.css.top - (svg.y + origin.y * s)) <= 1, `at ${name}: raster at ${r.css.left},${r.css.top}, overlay puts it at ${svg.x + origin.x * s},${svg.y + origin.y * s}`);
        checks.push(`${name} on the overlay`);
      }
      // Back to the open's picture by the zoom menu's Zoom to Fit (D-103, D-357), then the
      // border's left edge, 72 pt in on a 1224 pt page, at mid height.
      await page.locator("[data-zoom-menu-trigger]").click();
      await page.getByRole("menuitem", { name: "Zoom to Fit" }).click();
      await settledAt(page, fit);
      const svg = await page.locator('svg[role="presentation"]').boundingBox();
      const edge = await darkRun(page, { x: svg.x + svg.width * (72 / 1224), y: svg.y + svg.height * 0.5 }, 3);
      expect(edge >= 1, "no border under the overlay's x = 72/1224");
      return `row "${qty} ${unit}" · ${checks.join(" · ")} · Zoom to Fit, the border under x = 72/1224`;
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

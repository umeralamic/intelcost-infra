// F5-S11: the fit tier, the zoom rule and the two-stage re-raster (D-35; PARITY §24).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s11.mjs
//
// Timings are read from `window.__intelcostPerf.samples()`: `canvas:first-paint` (the
// sheet opened to the first pdf.js frame), `canvas:zoom-reraster:fast` and
// `canvas:sharp-after-zoom` (a zoom settled to its sharp frame). Legacy's numbers
// (PARITY §24) are printed beside ours; they are recorded, and only a generous ceiling
// is asserted, so a regression shows without the bench's own speed deciding a pass.

import { APP, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S11 tiers");
const project = await makeProject(token, base, { name: "Tiers" });
const later = await makeProject(token, base, { name: "Load timing" });
const LANDSCAPE = [1, 2].map((n) => ({ width: 1224, height: 792, label: `S11 ${n}` }));
let sheets;
let setFile;
const url = (sheet) => `${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`;

const zoomLabel = (page) => page.getByRole("button", { name: /^Zoom \d+ percent/ });
const toolbarZoom = async (page) => Number((await zoomLabel(page).getAttribute("aria-label")).match(/Zoom (\d+) percent/)[1]) / 100;
const perf = (page, label) => page.evaluate((l) => window.__intelcostPerf.samples().filter((s) => s.label === l), label);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function settledAt(page, zoom, timeout = 30000) {
  await page.waitForFunction(
    (z) => {
      const c = document.querySelector("canvas[data-sheet-raster]");
      return c && Math.abs(Number(c.dataset.rasterZoom) - z) < 0.001 && c.dataset.rasterRes === "1";
    },
    zoom,
    { timeout },
  );
}

async function open(page, sheet) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(url(sheet));
  await settledAt(page, 1);
}

await run("f5-s11", [
  {
    title: "setup: a two-page landscape set loaded and prepared",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "S11.pdf", buffer: makePdf(LANDSCAPE), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["S11.pdf"].uuid, [1, 2]]]);
      sheets = (await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid)).sort((a, b) => a.page_number - b.page_number);
      const other = await uploadAll(page, token, base, later.uuid, [{ name: "Timing.pdf", buffer: makePdf(letterPages(4, "Timing")), folder: "Plans" }], workspace.uuid);
      setFile = other["Timing.pdf"];
      return "S11.pdf, 2 sheets · Timing.pdf uploaded to a second project, nothing loaded";
    },
  },
  {
    title: "AC1: a cold open paints the fit image first, then pdf.js over it; back to a sheet whose document is open, no image is fetched",
    run: async ({ page }) => {
      const fits = [];
      page.on("request", (r) => /\/fit\.webp/.test(r.url()) && fits.push({ url: r.url(), at: Date.now() }));
      const order = [];
      await page.exposeFunction("__s11", (what) => order.push(what));
      await page.addInitScript(() => {
        new MutationObserver(() => {
          const img = document.querySelector('img[alt="Drawing sheet"]');
          if (img?.complete && img.naturalWidth && !window.__s11img) {
            window.__s11img = true;
            window.__s11("fit");
          }
          if (document.querySelector("canvas[data-sheet-raster]") && !window.__s11raster) {
            window.__s11raster = true;
            window.__s11("raster");
          }
        }).observe(document, { subtree: true, childList: true, attributes: true });
      });
      await open(page, sheets[0]);
      expect(order[0] === "fit", `painted in the order ${order.join(", ")}`);
      expect(fits.length === 1, `${fits.length} fit images on a cold open`);
      const go = async (sheet) => {
        await page.evaluate((path) => {
          window.history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, new URL(url(sheet)).pathname);
        await page.waitForFunction((uuid) => document.querySelector("canvas[data-sheet-raster]")?.dataset.rasterKey?.startsWith(uuid), sheet.uuid, { timeout: 20000 });
      };
      await go(sheets[1]);
      const before = fits.length;
      await go(sheets[0]);
      expect(fits.length === before, `going back fetched ${fits.length - before} fit image(s)`);
      return `cold: ${order.join(" then ")}, 1 fit image · back to an open document: none fetched`;
    },
  },
  {
    title: "AC2: zoom runs 50% to 4000% from one module: buttons step +0.25 below 2× and ×1.25 above, and the buttons and the wheel stop exactly at 50% and 4000%",
    run: async ({ page }) => {
      await open(page, sheets[0]);
      const zoomIn = page.getByRole("button", { name: "Zoom in" });
      const zoomOut = page.getByRole("button", { name: "Zoom out" });
      const up = [await toolbarZoom(page)];
      while (await zoomIn.isEnabled()) {
        await zoomIn.click();
        up.push(await toolbarZoom(page));
        if (up.length > 40) break;
      }
      expect(up.at(-1) === 40, `the buttons stop at ${up.at(-1) * 100}%`);
      expect(up.slice(0, 5).join() === "1,1.25,1.5,1.75,2", `below 2×: ${up.slice(0, 5).join(", ")}`);
      expect(Math.abs(up[5] - 2.5) < 0.01, `the first step above 2× is ${up[5]}`);
      while (await zoomOut.isEnabled()) await zoomOut.click();
      const floor = await toolbarZoom(page);
      expect(floor === 0.5, `the buttons stop at ${floor * 100}% going down`);
      const box = await page.locator("[data-sheet-scroller]").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.down("Control");
      await page.mouse.wheel(0, -20000);
      const top = await toolbarZoom(page);
      await page.mouse.wheel(0, 40000);
      const bottom = await toolbarZoom(page);
      await page.keyboard.up("Control");
      expect(top === 40 && bottom === 0.5, `the wheel stops at ${top * 100}% and ${bottom * 100}%`);
      return `buttons ${up.length} presses 100%→4000%, down to 50% · wheel ${top * 100}% and ${bottom * 100}%`;
    },
  },
  {
    title: "AC3: after a zoom, a half-resolution pass then a full one; above 2.5× only the visible window",
    run: async ({ page }) => {
      await open(page, sheets[0]);
      const box = await page.locator("[data-sheet-scroller]").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
      const results = [];
      for (const z of [2, 6]) {
        await page.evaluate(() => window.__intelcostPerf.reset());
        await page.keyboard.down("Control");
        await page.mouse.wheel(0, -Math.log(z / (await toolbarZoom(page))) / 0.0015);
        await page.keyboard.up("Control");
        await settledAt(page, z);
        const fast = await perf(page, "canvas:zoom-reraster:fast");
        const sharp = await perf(page, "canvas:sharp-after-zoom");
        expect(fast.length === 1 && sharp.length === 1, `at ${z * 100}%: ${fast.length} fast and ${sharp.length} sharp passes`);
        expect(fast[0].at <= sharp[0].at, `at ${z * 100}%: the sharp pass came before the fast one`);
        expect(sharp[0].detail.windowed === z > 2.5, `at ${z * 100}%: windowed ${sharp[0].detail.windowed}`);
        results.push(`${z * 100}%: fast ${fast[0].ms} ms, sharp ${sharp[0].ms} ms${sharp[0].detail.windowed ? ", window" : ""}`);
      }
      return results.join(" · ");
    },
  },
  {
    title: "AC4: cold open times, three runs, against legacy's (first paint ~200 ms light, settled under 900 ms)",
    run: async ({ context }) => {
      const firsts = [];
      const opens = [];
      for (let i = 0; i < 3; i += 1) {
        const fresh = await context.browser().newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const page = await fresh.newPage();
          await open(page, sheets[i % 2]);
          firsts.push((await perf(page, "canvas:first-paint"))[0].ms);
          opens.push((await perf(page, "canvas:doc-open"))[0].ms);
        } finally {
          await fresh.close();
        }
      }
      // Generous: the bench is a laptop running everything at once. The numbers are the report.
      expect(median(firsts) < 3000, `first paint median ${median(firsts)} ms`);
      return `first pdf.js paint after opening: ${firsts.join(", ")} ms (median ${median(firsts)}); of which fetching and opening the PDF ${opens.join(", ")} ms · legacy: ~200 ms first paint on a light sheet, settled under 900 ms`;
    },
  },
  {
    title: "Target: a page loaded through Add sheets is drawn sharp by pdf.js close to legacy's ~4 s (three runs; ~12 s before Block C)",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      const times = [];
      for (const n of [1, 2, 3]) {
        const loaded = await loadPages(token, base, later.uuid, [[setFile.uuid, [n]]]);
        expect(loaded.status === 200, `load page ${n}: ${loaded.status}`);
        const t0 = Date.now();
        await page.goto(`${APP}/project/${later.uuid}/takeoff/${loaded.body.sheets[0].uuid}`);
        await settledAt(page, 1, 60000);
        times.push(Date.now() - t0);
      }
      expect(median(times) < 10000, `median ${median(times)} ms`);
      return `Load to sharp pdf.js paint: ${times.join(", ")} ms (median ${median(times)}), preparation on the worker included · legacy ~4 s`;
    },
  },
]);

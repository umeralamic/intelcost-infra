// F5-S11: the fit tier, the zoom rule and the two-stage re-raster (D-35; PARITY §24).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s11.mjs
//
// Timings are read from `window.__intelcostPerf.samples()`: `canvas:first-paint` (the
// sheet opened to the first pdf.js frame) and `canvas:doc-open`; a zoom's handover is timed
// in the page. Legacy's numbers (PARITY §24) are printed beside ours; they are recorded, and
// only a generous ceiling is asserted, so a regression shows without the bench's own speed
// deciding a pass.
//
// Updated 2026-10-24 (D-35, D-102, D-76, D-100, D-101, D-103):
// - Zoom is absolute (D-35's baseline, D-102 merged into it: 100% is 170 CSS px per inch) and a sheet
//   opens at its Fit (D-76 A3), so the open waits for the sharp frame of whatever zoom is on screen, not
//   for zoom 1. The zoom is read exactly from the canvas's `data-zoom`; the percentage button is the zoom
//   menu's (D-103), labelled "Zoom N%, open the zoom menu".
// - AC1: the fit image is a decoded canvas, `[data-sheet-image="fit"]` (D-101; the `<img>` is its fallback,
//   either counts). Once the open sheet is sharp the other sheets' fit images are fetched ahead (D-101), so
//   "one fit image on a cold open" counts those fetched before the first pdf.js frame.
// - AC2: D-35's range and steps: 10% to 4000% (the floor lowered to a Fit below 10%), one press × 1.25 at
//   every zoom (no + 0.25 below 2×), the buttons and the wheel stopping exactly at both ends. A wheel's zoom
//   commits when the gesture's sharp frame is drawn (D-100), so the ends are waited for, not read at once;
//   the wheel is bare (D-76 A1).
// - AC3: D-100 retired the half-resolution pass ("No half-resolution pass once a frame is on screen"; one
//   swap): the step now checks that no frame below full resolution is shown after a wheel zoom, that the
//   landing is one swap, and that the frame is windowed exactly when the rule says (D-35's 2.5 × the fitted
//   width, or D-708's window-only supersampled zoom above Fit under 2.4 device px per point). The
//   `canvas:zoom-reraster:fast` sample is gone with the pass; the handover is timed in the page.
// - Step 6 waits for the sharp frame at the sheet's Fit (D-76), not at zoom 1.

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

/** The canvas's exact zoom (absolute, D-35). */
const zoomNow = (page) => page.locator("[data-sheet-scroller]").evaluate((el) => Number(el.dataset.zoom));
const perf = (page, label) => page.evaluate((l) => window.__intelcostPerf.samples().filter((s) => s.label === l), label);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
/** D-35's press: × 1.25, rounded to five places, within 10% (or a lower Fit) and 4000%. */
const pressIn = (z) => Math.min(40, +(z * 1.25).toFixed(5));
const pressOut = (z, floor) => Math.min(z, Math.max(floor, +(z / 1.25).toFixed(5)));

/** The sharp frame of the zoom on screen (or of `zoom`) is drawn. */
async function settledAt(page, zoom = null, timeout = 30000) {
  await page.waitForFunction(
    (z) => {
      const now = Number(document.querySelector("[data-sheet-scroller]")?.dataset.zoom);
      const c = document.querySelector("canvas[data-sheet-raster]");
      return c && (z === null || Math.abs(now - z) < 0.001) && Number(c.dataset.rasterZoom) === now && c.dataset.rasterRes === "1";
    },
    zoom,
    { timeout },
  );
}

/** Opens at the sheet's Fit (D-76); returns it. */
async function open(page, sheet) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(url(sheet));
  await settledAt(page);
  return zoomNow(page);
}

const zoomBecomes = (page, z, timeout = 15000) =>
  page.waitForFunction((want) => Math.abs(Number(document.querySelector("[data-sheet-scroller]")?.dataset.zoom) - want) < 1e-6, z, { timeout });

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
      let rasterAt = null;
      await page.exposeFunction("__s11", (what, at) => {
        order.push(what);
        // The page's own clock at the frame (the same machine's as the request events): the binding
        // reaches here after the fetches the first frame starts (D-101's fetch ahead).
        if (what === "raster" && rasterAt === null) rasterAt = at;
      });
      await page.addInitScript(() => {
        new MutationObserver(() => {
          // The fit image: the decoded canvas (D-101), or its <img> fallback once loaded.
          const canvas = document.querySelector('canvas[data-sheet-image="fit"]');
          const img = document.querySelector('img[data-sheet-image="fit"]');
          const fitShown = (canvas && canvas.width > 0) || (img?.complete && img.naturalWidth);
          if (fitShown && !window.__s11img) {
            window.__s11img = true;
            window.__s11("fit");
          }
          if (document.querySelector("canvas[data-sheet-raster]") && !window.__s11raster) {
            window.__s11raster = true;
            window.__s11("raster", Date.now());
          }
        }).observe(document, { subtree: true, childList: true, attributes: true });
      });
      await open(page, sheets[0]);
      expect(order[0] === "fit", `painted in the order ${order.join(", ")}`);
      // Fetched before the first pdf.js frame; the neighbours' are fetched ahead after it (D-101).
      const cold = fits.filter((f) => rasterAt !== null && f.at <= rasterAt).length;
      const seenFits = fits.map((f) => `${new URL(f.url).pathname.split("/").slice(-3).join("/")} at ${rasterAt === null ? "?" : f.at - rasterAt} ms`).join(", ");
      expect(cold === 1, `${cold} fit images before the first pdf.js frame on a cold open (${seenFits}; sheets ${sheets.map((s) => s.uuid.slice(0, 8)).join(", ")})`);
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
      return `cold: ${order.join(" then ")}, 1 fit image before pdf.js (${fits.length} with the ones fetched ahead) · back to an open document: none fetched`;
    },
  },
  {
    title: "AC2: zoom runs 10% to 4000% from one module (D-35): every press is × 1.25, and the buttons and the wheel stop exactly at 10% and 4000%",
    run: async ({ page }) => {
      const fit = await open(page, sheets[0]);
      const floor = Math.min(0.1, fit);
      const zoomIn = page.getByRole("button", { name: "Zoom in" });
      const zoomOut = page.getByRole("button", { name: "Zoom out" });
      const up = [fit];
      while (up.at(-1) < 40 && up.length < 60) {
        const want = pressIn(up.at(-1));
        await zoomIn.click();
        await zoomBecomes(page, want);
        up.push(await zoomNow(page));
      }
      expect(up.at(-1) === 40, `the buttons stop at ${up.at(-1) * 100}%`);
      const steps = up.slice(1).map((z, i) => z / up[i]);
      expect(steps.slice(0, -1).every((s) => Math.abs(s - 1.25) < 1e-3), `presses: ${steps.map((s) => s.toFixed(4)).join(", ")}`);
      let down = 40;
      let presses = 0;
      while (down > floor && presses < 60) {
        const want = pressOut(down, floor);
        await zoomOut.click();
        await zoomBecomes(page, want);
        down = await zoomNow(page);
        presses += 1;
      }
      expect(down === floor, `the buttons stop at ${down * 100}% going down`);
      const box = await page.locator("[data-sheet-scroller]").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, -20000);
      const top = await zoomBecomes(page, 40).then(() => 40, async () => zoomNow(page));
      await page.mouse.wheel(0, 40000);
      const bottom = await zoomBecomes(page, floor).then(() => floor, async () => zoomNow(page));
      expect(top === 40 && bottom === floor, `the wheel stops at ${top * 100}% and ${bottom * 100}%`);
      return `from Fit ${(fit * 100).toFixed(1)}%: ${up.length - 1} presses × 1.25 to 4000%, ${presses} down to ${floor * 100}% · wheel ${top * 100}% and ${bottom * 100}%`;
    },
  },
  {
    title: "AC3: after a wheel zoom, one swap to a full-resolution frame and never a half-resolution one (D-100); windowed exactly when the rule says (D-35, D-708)",
    run: async ({ page }) => {
      const fit = await open(page, sheets[0]);
      const box = await page.locator("[data-sheet-scroller]").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
      const results = [];
      for (const z of [fit * 2, 6]) {
        const start = await zoomNow(page);
        // Every frame the raster canvas shows from here, and when the wheel last moved.
        await page.evaluate(() => {
          window.__s11frames = [];
          let last = "";
          const note = () => {
            const c = document.querySelector("canvas[data-sheet-raster]");
            if (!c) return;
            const sig = `${c.dataset.rasterZoom}|${c.dataset.rasterRes}|${c.dataset.rasterOriginX}|${c.dataset.rasterOriginY}|${c.width}x${c.height}`;
            if (sig === last) return;
            last = sig;
            window.__s11frames.push({ zoom: Number(c.dataset.rasterZoom), res: Number(c.dataset.rasterRes), at: performance.now() });
          };
          window.__s11obs?.disconnect();
          window.__s11obs = new MutationObserver(note);
          window.__s11obs.observe(document.querySelector("[data-sheet-scroller]"), { subtree: true, childList: true, attributes: true });
          note();
          window.__s11frames.length = 0;
          window.__s11wheel = 0;
          window.addEventListener("wheel", () => (window.__s11wheel = performance.now()), { capture: true });
        });
        await page.mouse.wheel(0, -Math.log(z / start) / 0.0015);
        await page.waitForFunction((was) => Number(document.querySelector("[data-sheet-scroller]").dataset.zoom) !== was, start, { timeout: 15000 });
        await settledAt(page);
        const landed = await zoomNow(page);
        const { frames, wheelAt, windowed, rule, dpr } = await page.evaluate(() => {
          const view = document.querySelector("[data-sheet-scroller]");
          const c = document.querySelector("canvas[data-sheet-raster]");
          const pageBox = document.querySelector("[data-page-turn]").getBoundingClientRect();
          return {
            frames: window.__s11frames,
            wheelAt: window.__s11wheel,
            windowed: c.dataset.rasterWindow === "1",
            rule: pageBox.width > 2.5 * Math.max(view.getBoundingClientRect().width - 48, 320),
            dpr: window.devicePixelRatio || 1,
          };
        });
        const below = frames.filter((f) => f.res !== 1);
        expect(below.length === 0, `at ${(landed * 100).toFixed(0)}%: ${below.length} frame(s) below full resolution (${below.map((f) => f.res).join(", ")})`);
        const landings = frames.filter((f) => f.zoom !== start);
        expect(landings.length === 1, `at ${(landed * 100).toFixed(0)}%: ${landings.length} swaps after the gesture (${landings.map((f) => f.zoom).join(", ")})`);
        // D-708: above Fit and under 2.4 device px per point, only the visible area is drawn too.
        const windowOnly = landed > fit * 1.001 && landed * (170 / 72) * dpr < 2.4;
        expect(windowed === (rule || windowOnly), `at ${(landed * 100).toFixed(0)}%: windowed ${windowed}, the rule says ${rule || windowOnly}`);
        results.push(`${(landed * 100).toFixed(0)}%: one swap, full resolution, ${Math.round(landings[0].at - wheelAt)} ms after the wheel${windowed ? ", window" : ""}`);
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
        await settledAt(page, null, 60000);
        times.push(Date.now() - t0);
      }
      expect(median(times) < 10000, `median ${median(times)} ms`);
      return `Load to sharp pdf.js paint: ${times.join(", ")} ms (median ${median(times)}), preparation on the worker included · legacy ~4 s`;
    },
  },
]);

// R1, the raster text check (D-708): thin CAD stroke text and dense spec text, drawn as the canvas
// draws them, against pdf.js's reference render, at every zoom and pixel ratio the low-zoom fault was
// seen at. By request (Umer, 2026-10-22): a named exception to hard rule 8, run on the fx stack only.
//
//   node fx-run-locked.mjs r1-raster-text
//
// **Run it whenever the sheet's drawing changes** (`lib/takeoff/pdf/raster.ts`, `features/takeoff/pdf/
// use-page-raster.ts`, a CSS rule on `[data-sheet-raster]`): it is the check for the fault it is named
// after, text at 19–50% heavy, blocky and run together (S read as 8, G as 6), and the D-119 filter that
// made it worse.
//
// The world: no account, no project. The test sheet (`lib/raster-text-sheet.mjs`) is made here and
// opened in the app's own page with the app's own modules: pdf.js as the canvas loads it, and
// `rasterPolicy` / `supersampleOf` / `renderPage` exactly as the canvas calls them, for a canvas in a
// 2048 × 1152 window (view 1272 × 1022 CSS px, the sheet's Fit 19.98%); for a lower Fit, a canvas
// narrowed to it in the same proportion.
//
// Per text, per pixel ratio (1, 1.25, 1.5, 2), per zoom (Fit, 19%, 19% above a lower Fit, 25, 31,
// 35, 40, 50, 75, 100%): the 100 × 40 pt area drawn as shipped, and drawn by pdf.js at 8× and halved
// down to the same pixels (the reference). The measure: the mean |difference| in luminance, 0–255.
// Pass: every case above Fit at or under 4. Writes every number to shots/r1-raster-text.json.
//
// **Fit and below are exempt, waiting on tiles (D-708).** There the page keeps today's rule (×4 within
// 20 million px, else ×2), because one larger draw crosses the browser's canvas cliff; at a pixel
// ratio of 1.25 that is ×2, 6.5–8.6 from the reference. Those cases are still measured and reported
// ("exempt"); when the Fit draw is tiled, drop `EXEMPT_AT_OR_BELOW_FIT` and they must pass too.

import { writeFile } from "node:fs/promises";

import { APP, expect, run } from "./lib/bench.mjs";
import { CROPS, PAGE, makeRasterTextPdf } from "./lib/raster-text-sheet.mjs";

const SHOTS = "/drive/scripts/shots";
const LIMIT = 4;
const EXEMPT_AT_OR_BELOW_FIT = true; // waiting on tiles (D-708)
const FIT = 0.19984;
const VIEW = { width: 1272, height: 1022 };
const DPRS = [1, 1.25, 1.5, 2];
// [label, zoom, Fit]: "19*" is 19% where the sheet's Fit is lower (a narrower canvas), so 19% is above it.
const CASES = [["Fit", FIT, FIT], ["19", 0.19, FIT], ["19*", 0.19, 0.15], ...[0.25, 0.31, 0.35, 0.4, 0.5, 0.75, 1].map((z) => [String(Math.round(z * 100)), z, FIT])];
const results = {};

/** Every case of one text, measured in the app's page. */
async function measure(page, text) {
  return page.evaluate(
    async ({ pdf, crop, page: size, cases, dprs, view }) => {
      const pdfjsMod = await import("/src/features/takeoff/pdf/pdfjs.ts");
      const R = await import("/src/lib/takeoff/pdf/raster.ts");
      const Z = await import("/src/lib/takeoff/pdf/zoom.ts");
      const bytes = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
      const pdfjs = await pdfjsMod.loadPdfjs();
      // Helvetica from pdf.js's own font data, drawn as glyph outlines: the fx browser's (Linux) font
      // rasteriser hints small text size by size, so text drawn through it never matches its own
      // 8× render, which is not what this checks; on the bench's browser the sheets' text did (D-708).
      const doc = await pdfjs.getDocument({ data: bytes, ...pdfjsMod.PDF_ASSETS, useSystemFonts: false, disableFontFace: true }).promise;
      const source = { key: "r1", getPage: (n) => doc.getPage(n) };
      const baseWidth = size.width * Z.PX_PER_PT;
      const lum = (canvas) => {
        const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
        const out = new Float32Array(canvas.width * canvas.height);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          const a = data[i + 3] / 255;
          out[j] = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) * a + 255 * (1 - a);
        }
        return out;
      };
      const rows = [];
      for (const dpr of dprs) {
        for (const [label, zoom, fit] of cases) {
          const pw = baseWidth * zoom;
          const ph = (pw * size.height) / size.width;
          const area = { x: crop.x * pw, y: crop.y * ph, w: crop.wPt * Z.PX_PER_PT * zoom, h: crop.hPt * Z.PX_PER_PT * zoom };
          // As the canvas decides it: a window the size of the view (with its margin) above Fit, the
          // whole page at or below it.
          const policy = R.rasterPolicy(zoom, fit, dpr);
          // The canvas a Fit belongs to: a lower Fit is a narrower canvas, in the same proportion.
          const scale = (fit * baseWidth + 48) / view.width;
          const drawn = policy.windowOnly
            ? { w: view.width * scale * (1 + 2 * R.SUPERSAMPLE_WINDOW_MARGIN), h: view.height * scale * (1 + 2 * R.SUPERSAMPLE_WINDOW_MARGIN) }
            : { w: pw, h: ph };
          const supersample = R.supersampleOf(policy, drawn.w * dpr, drawn.h * dpr);
          const request = { pageNumber: 1, baseWidth, zoom, devicePixelRatio: dpr, window: area };
          const shipped = await R.renderPage(source, { ...request, supersample });
          const reference = await R.renderPage(source, { ...request, supersample: 8 });
          const [a, b] = [lum(shipped.canvas), lum(reference.canvas)];
          let sum = 0;
          for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
          rows.push({ dpr, label, zoom, density: +(zoom * Z.PX_PER_PT * dpr).toFixed(2), supersample, window: policy.windowOnly, atOrBelowFit: zoom <= fit * 1.001, mae: +(sum / a.length).toFixed(2) });
          shipped.canvas.width = 0;
          reference.canvas.width = 0;
        }
      }
      // The filter withdrawn (D-708): nothing may lay one over the sheet again.
      const probe = document.createElement("canvas");
      probe.setAttribute("data-sheet-raster", "");
      document.body.append(probe);
      const filter = getComputedStyle(probe).filter;
      probe.remove();
      return { rows, filter };
    },
    { pdf: makeRasterTextPdf().toString("base64"), crop: CROPS[text], page: PAGE, cases: CASES, dprs: DPRS, view: VIEW },
  );
}

const step = (text, title) => ({
  title,
  run: async ({ page }) => {
    await page.goto(`${APP}/login`);
    const { rows, filter } = await measure(page, text);
    results[text] = rows;
    await writeFile(`${SHOTS}/r1-raster-text.json`, JSON.stringify(results, null, 1));
    expect(filter === "none", `a filter is laid over the sheet: ${filter}`);
    const fmt = (r) => `${r.label}% dpr ${r.dpr} ${r.mae} (×${r.supersample})`;
    const exempt = rows.filter((r) => EXEMPT_AT_OR_BELOW_FIT && r.atOrBelowFit);
    const checked = rows.filter((r) => !exempt.includes(r));
    const over = checked.filter((r) => r.mae > LIMIT);
    expect(over.length === 0, `over ${LIMIT}: ${over.map(fmt).join(", ")}`);
    const worst = checked.reduce((w, r) => (r.mae > w.mae ? r : w), checked[0]);
    const exemptOver = exempt.filter((r) => r.mae > LIMIT);
    return `${checked.length} cases, worst ${worst.mae} at ${worst.label}% dpr ${worst.dpr} (×${worst.supersample}); limit ${LIMIT}; exempt at or below Fit (tiles): ${exempt.length}, over ${LIMIT}: ${exemptOver.map(fmt).join(", ") || "none"}`;
  },
});

await run("r1-raster-text", [
  step("cad", "thin CAD stroke text (0.65 pt strokes): every zoom and pixel ratio within 4 of the reference, no filter"),
  step("spec", "dense spec text (Helvetica 5.7 pt): every zoom and pixel ratio within 4 of the reference, no filter"),
]);

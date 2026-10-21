// M6, the canvas position check (D-689): on generated test sheets, in the four page layouts a sheet
// arrives in, every reference cross is drawn exactly where the canvas puts its page point, at every
// zoom step up to 30×, with markup lying past the page's edge; and a line drawn and a count placed at
// the deepest zoom store the same points and quantity as the same ones drawn at Fit.
//
//   node fx-run-locked.mjs m6-position
//
// **Run it whenever the canvas or the zoom changes** (`SheetCanvas.tsx`, `lib/takeoff/pdf/*`,
// `lib/takeoff/rotation.ts`, `useViewport.ts`, the page worker's sizes): it is the check for the two
// old faults it is named after. A landscape sheet whose markup ran 0.22 of the page past its bottom
// (the ZHO Dania Pointe case) and one whose markup ran 0.15 past its right edge (the G101 case, whose
// lengths were stored 31 % long when the canvas grew to take the markup in).
//
// The world: one throwaway workspace and project ("BENCH DUP … — delete me", gone with the fixture's
// workspaces); "Position.pdf" from `lib/position-sheets.mjs`, four pages: L landscape 36 × 24 in,
// P portrait 24 × 36 in, R landscape stored portrait with /Rotate 90, C landscape through a CropBox
// offset in a larger MediaBox. Each sheet at 1/8" = 1'-0" (1/9 ft per point). Snap, Snap PDF and Ortho
// off, so a click stores exactly where it lands; Auto Scroll off, so a pan with a run in hand is the
// check's own.
//
// Per sheet:
//   (a) past the top or bottom edge by 0.22 and (b) past the left or right edge by 0.15: a line and a
//       count drawn at Fit (panned there), read back from the api.
//   Every zoom step from Fit (× 1.25 per press) up to 30×: the view centred on the references beside
//       each bleed, and every reference cross in the middle of the view measured from the screen's
//       pixels against where the canvas maps its page point (the markup layer's page box). Pass: within
//       0.25 px from 3× up (measured: 0.09 at worst); within 1 px below 3×. At Fit and the step
//       above it the sheet image sits up to 0.66 px from the markup layer, display only, no stored
//       value affected: a known item (D-689, pending_umer), not to be read as a regression.
//   At the deepest step: the same line and count drawn again (the line's second point after a pan
//       with the run in hand). Pass: each stored point within one deep-zoom pixel of Fit's (a few
//       thousandths of a point), and the quantity's ratio to Fit's 1.000.
// Writes every measurement to shots/m6-position.json, and screenshots at Fit, a middle step and the
// deepest step.

import { writeFile } from "node:fs/promises";

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs, stamp } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { REFS, SHEETS, makePositionPdf } from "./lib/position-sheets.mjs";
import { armMeasure } from "./lib/takeoff.mjs";

const SHOTS = "/drive/scripts/shots";
const FEET_PER_PT = 1 / 9;
const MAX = 30;
const { token, workspace, base } = await freshWorkspace("M6 position");
const day = new Date().toISOString().slice(0, 16).replace("T", " ");
const project = await makeProject(token, base, { name: `BENCH DUP ${day} — delete me` });
const drawing = `${base}/${project.uuid}/drawing`;
const takeoff = `${base}/${project.uuid}/takeoff`;
const sheets = {}; // key → the api's sheet
const results = {}; // key → measurements

// Which edges each sheet's two cases run past: top and right on L and R, bottom and left on P and C.
const CASES = {
  L: { a: "top", b: "right" },
  R: { a: "top", b: "right" },
  P: { a: "bottom", b: "left" },
  C: { a: "bottom", b: "left" },
};
/** A case's line (two points) and count (one), and the references beside its bleed. */
function shapesFor(edge) {
  switch (edge) {
    case "top":
      return { line: [[0.5, -0.2], [0.56, -0.22]], count: [0.53, -0.22], refs: [[0.5, 0.05], [0.95, 0.05]] };
    case "bottom":
      return { line: [[0.5, 1.2], [0.56, 1.22]], count: [0.53, 1.22], refs: [[0.5, 0.95], [0.05, 0.95]] };
    case "right":
      return { line: [[1.1, 0.48], [1.15, 0.52]], count: [1.15, 0.5], refs: [[0.95, 0.5], [0.95, 0.95]] };
    case "left":
      return { line: [[-0.1, 0.48], [-0.15, 0.52]], count: [-0.15, 0.5], refs: [[0.05, 0.5], [0.05, 0.05]] };
  }
}

const svg = (page) => page.locator('svg[role="presentation"]').first();
const scroller = (page) => page.locator("[data-sheet-scroller]").first();
const zoomOf = async (page) => Number(await scroller(page).getAttribute("data-zoom"));

/** The page box the markups are drawn in, on screen. */
const pageBox = (page) => svg(page).evaluate((el) => {
  const b = el.getBoundingClientRect();
  return { x: b.left, y: b.top, width: b.width, height: b.height };
});
const viewBox = (page) => scroller(page).evaluate((el) => {
  const b = el.getBoundingClientRect();
  return { x: b.left, y: b.top, width: b.width, height: b.height };
});
const screenOf = (box, [u, v]) => ({ x: box.x + box.width * u, y: box.y + box.height * v });

/** Wait until the sharp raster is drawn for this zoom and holds the point (u, v): what the page
 *  shows, read until it stops changing. */
async function settled(page, [u, v]) {
  await page.waitForFunction(
    ([u, v]) => {
      const scroller = document.querySelector("[data-sheet-scroller]");
      const raster = document.querySelector("canvas[data-sheet-raster]");
      if (!scroller || !raster) return false;
      const a = (k) => Number(raster.getAttribute(`data-raster-${k}`));
      if (Math.abs(a("zoom") - Number(scroller.getAttribute("data-zoom"))) > 1e-9) return false;
      // The sharp pass, not the fast one at half resolution that comes first after a zoom.
      if (a("res") !== 1) return false;
      const [px, py] = [u * a("page-width"), v * a("page-height")];
      const inside = px >= a("origin-x") && px <= a("origin-x") + a("css-width") && py >= a("origin-y") && py <= a("origin-y") + a("css-height");
      // A point past the page is never in the raster: then the raster's window is enough.
      const onPage = u >= 0 && u <= 1 && v >= 0 && v <= 1;
      if (onPage && !inside) return false;
      const sig = [...raster.attributes].map((x) => `${x.name}=${x.value}`).join(" ") + scroller.getAttribute("data-zoom");
      const w = window;
      if (w.__m6sig !== sig) {
        w.__m6sig = sig;
        w.__m6same = 0;
        return false;
      }
      w.__m6same = (w.__m6same ?? 0) + 1;
      return w.__m6same >= 3;
    },
    [u, v],
    { polling: 100, timeout: 30000 },
  );
}

/** Pan with the middle button until the page point (u, v) is at the middle of the view. A run in
 *  hand is left as it is (the canvas's own rule). */
async function centreOn(page, at) {
  const view = await viewBox(page);
  const middle = { x: Math.round(view.x + view.width / 2), y: Math.round(view.y + view.height / 2) };
  const [reachX, reachY] = [Math.floor(view.width * 0.8), Math.floor(view.height * 0.8)];
  for (let i = 0; i < 400; i += 1) {
    const p = screenOf(await pageBox(page), at);
    const [dx, dy] = [middle.x - p.x, middle.y - p.y];
    // Near enough: a drag of a pixel or two is not taken as a pan, and every click and measurement
    // reads where the point is, not the middle.
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) break;
    const step = Math.min(1, reachX / Math.max(1e-9, Math.abs(dx)), reachY / Math.max(1e-9, Math.abs(dy)));
    const [mx, my] = [Math.round(dx * step), Math.round(dy * step)];
    if (mx === 0 && my === 0) break;
    await page.mouse.move(middle.x - mx / 2, middle.y - my / 2);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(middle.x + mx / 2, middle.y + my / 2, { steps: 3 });
    await page.mouse.up({ button: "middle" });
  }
  await settled(page, at);
}

/** Fit, the page point (u, v) put in the middle, then `presses` presses of + (each holds the
 *  middle of the view still, so the point stays there): the zoom steps a person takes. */
async function zoomInOn(page, at, presses, each) {
  await page.keyboard.press("0");
  await settled(page, [0.5, 0.5]);
  await centreOn(page, at);
  if (each) await each(0);
  for (let i = 1; i <= presses; i += 1) {
    const want = +(Number(await scroller(page).getAttribute("data-zoom")) * 1.25).toFixed(5);
    await page.keyboard.press("+");
    await page.waitForFunction((z) => Math.abs(Number(document.querySelector("[data-sheet-scroller]")?.getAttribute("data-zoom")) - z) < 1e-6, want, { timeout: 15000 });
    await settled(page, at);
    if (each) await each(i);
  }
  await centreOn(page, at);
}

/**
 * Where the cross of reference (u, v) is drawn, from the screen's own pixels, against where the
 * canvas puts that page point. The vertical hairline is found on the cross's lower arm, the
 * horizontal one on its left arm (the label sits up and right): on each row (column) the darkest
 * pixel near the point and the darkness-weighted centre of the three around it, averaged.
 */
async function crossError(page, box, ref, scale) {
  const want = screenOf(box, ref);
  const half = 40;
  const arm = Math.min(half, Math.max(4, Math.floor(60 * scale)));
  const clip = { x: Math.round(want.x) - half, y: Math.round(want.y) - half, width: half * 2, height: half * 2 };
  const png = await page.screenshot({ clip, animations: "disabled" });
  return page.evaluate(
    async ({ data, half, arm, ring, ox, oy }) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const canvas = new OffscreenCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const { data: px, width } = ctx.getImageData(0, 0, image.width, image.height);
      const dark = (x, y) => {
        const i = (y * width + x) * 4;
        return 255 - (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
      };
      const centre = (samples) => {
        // samples: [position, darkness][] along one row or column; the darkest and its neighbours.
        let peak = 0;
        for (let i = 1; i < samples.length; i += 1) if (samples[i][1] > samples[peak][1]) peak = i;
        // Below Fit the sheet is drawn light (a hairline averages to grey): the line is what stands
        // out of its own row, not a fixed darkness.
        const floor = Math.min(...samples.map((s) => s[1]));
        if (samples[peak][1] - floor < 8) return null;
        let [mass, sum] = [0, 0];
        for (let i = Math.max(0, peak - 1); i <= Math.min(samples.length - 1, peak + 1); i += 1) {
          const m = samples[i][1] - floor;
          mass += m;
          sum += m * (samples[i][0] + 0.5);
        }
        return mass > 0 ? sum / mass : null;
      };
      const xs = [];
      // Not where the ring crosses the arm: there its own pixels sit beside the hairline.
      const clear = (d) => d >= 2 && Math.abs(d - ring) >= 2;
      for (let dy = 2; dy <= arm - 1; dy += 1) {
        if (!clear(dy)) continue;
        const y = Math.floor(oy) + dy;
        const row = [];
        for (let x = Math.max(0, Math.floor(ox) - 3); x <= Math.min(2 * half - 1, Math.floor(ox) + 3); x += 1) row.push([x, dark(x, y)]);
        const c = centre(row);
        if (c !== null) xs.push(c);
      }
      const ys = [];
      for (let dx = 2; dx <= arm - 1; dx += 1) {
        if (!clear(dx)) continue;
        const x = Math.floor(ox) - dx;
        const column = [];
        for (let y = Math.max(0, Math.floor(oy) - 3); y <= Math.min(2 * half - 1, Math.floor(oy) + 3); y += 1) column.push([y, dark(x, y)]);
        const c = centre(column);
        if (c !== null) ys.push(c);
      }
      const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
      const [cx, cy] = [mean(xs), mean(ys)];
      return cx === null || cy === null ? null : { dx: cx - ox, dy: cy - oy, rows: xs.length, columns: ys.length };
    },
    { data: png.toString("base64"), half, arm, ring: 6 * scale, ox: want.x - clip.x, oy: want.y - clip.y },
  );
}

/** Every reference cross well inside the view, measured. */
async function measureVisible(page, scale) {
  // The pointer off the canvas first: its crosshair runs the full width and height of the view.
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => !document.querySelector("[data-sheet-scroller]")?.matches(":hover"), null, { timeout: 5000 });
  const [box, view] = await Promise.all([pageBox(page), viewBox(page)]);
  // The middle 70 % of the canvas: nothing floats over it.
  const inner = { x0: view.x + view.width * 0.15, x1: view.x + view.width * 0.85, y0: view.y + view.height * 0.15, y1: view.y + view.height * 0.85 };
  const out = [];
  for (const { u, v, label } of REFS) {
    const p = screenOf(box, [u, v]);
    if (p.x < inner.x0 || p.x > inner.x1 || p.y < inner.y0 || p.y > inner.y1) continue;
    const e = await crossError(page, box, [u, v], scale);
    expect(e !== null, `cross ${label} not found on screen at ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    out.push({ label, ...e });
  }
  return out;
}

/** Draw a two-point line and place a count with the canvas's own tools; the second line point after
 *  a pan when the view cannot hold both. Clicks land where `screenOf` puts each page point, at Fit on
 *  a whole pixel (the point stored is that pixel's). Returns the api's read of both items. */
async function drawCase(page, sheetKey, tag, shapes, presses = 0) {
  const lineName = `${sheetKey} ${tag} line`;
  const countName = `${sheetKey} ${tag} count`;
  // The first point and the count: zoomed in on from Fit. The line's second point: panned to with
  // the run in hand.
  const click = async (at, zoomIn) => {
    if (zoomIn) await zoomInOn(page, at, presses);
    else await centreOn(page, at);
    const p = screenOf(await pageBox(page), at);
    await page.mouse.click(p.x, p.y);
  };
  await zoomInOn(page, shapes.line[0], presses);
  await armMeasure(page, "Linear", { name: lineName });
  await click(shapes.line[0], false);
  await click(shapes.line[1], false);
  await page.keyboard.press("Enter");
  await zoomInOn(page, shapes.count, presses);
  await armMeasure(page, "Count", { name: countName });
  await click(shapes.count, false);
  await page.keyboard.press("v");
  const read = async (name) => {
    for (let i = 0; i < 100; i += 1) {
      const list = (await apiCall(token, "GET", `${takeoff}/item/detail`)).body;
      const item = list.find((it) => it.name === name);
      if (item && item.geometries?.length) return item;
      await page.waitForTimeout(200);
    }
    throw new Error(`${name} never saved`);
  };
  return { line: await read(lineName), count: await read(countName) };
}

const shotAt = async (page, name) => {
  await page.mouse.move(2, 2);
  const path = `${SHOTS}/m6-${name}.png`;
  await page.screenshot({ path });
  return path;
};

async function openSheet(page, key) {
  await page.context().addInitScript(() => {
    try {
      localStorage.setItem("takeoff.settings.v1", JSON.stringify({ snapping: { snapEnabled: false, snapPdfEnabled: false, orthoEnabled: false, orthoToleranceDeg: 15 }, mouse: { autoScrollEnabled: false } }));
      localStorage.setItem("takeoff.pdfSnap", "0");
    } catch {
      /* the check below fails on a snapped point instead */
    }
  });
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheets[key].uuid}`);
  await svg(page).waitFor({ timeout: 30000 });
  await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 30000 });
  await page.keyboard.press("0");
  await settled(page, [0.5, 0.5]);
}

function sheetStep(sheet) {
  const { key } = sheet;
  const cases = CASES[key];
  return {
    title: `${key} (${sheet.name}): references exact at every zoom to ${MAX}×, with markup ${cases.a} 0.22 and ${cases.b} 0.15 past the page; line and count stored alike at Fit and the deepest zoom`,
    run: async ({ page }) => {
      await openSheet(page, key);
      const fit = await zoomOf(page);
      const r = (results[key] = { fit, zooms: [], drawn: {}, shots: [] });
      const caseShapes = { a: shapesFor(cases.a), b: shapesFor(cases.b) };

      // Fit: the two cases' line and count, panned to, drawn.
      for (const c of ["a", "b"]) r.drawn[c] = { fit: await drawCase(page, key, `fit ${c}`, caseShapes[c]) };

      // Every zoom step from Fit to 30×, zoomed in on each reference beside a bleed in turn.
      const steps = [fit];
      while (+(steps.at(-1) * 1.25).toFixed(5) <= MAX + 1e-9) steps.push(+(steps.at(-1) * 1.25).toFixed(5));
      const presses = steps.length - 1;
      const middleStep = Math.floor(steps.length / 2);
      const byStep = steps.map(() => new Map());
      const scales = [];
      for (const [t, ref] of [...caseShapes.a.refs, ...caseShapes.b.refs].entries()) {
        await zoomInOn(page, ref, presses, async (i) => {
          const scale = (await pageBox(page)).width / sheet.width; // CSS px per point
          scales[i] = scale;
          for (const m of await measureVisible(page, scale)) byStep[i].set(m.label, m);
          if (t === 0 && i === 0) r.shots.push(await shotAt(page, `${key}-fit`));
          if (t === 0 && i === middleStep) r.shots.push(await shotAt(page, `${key}-mid-${(await zoomOf(page)).toFixed(2)}`));
        });
      }
      for (const [i, seen] of byStep.entries()) {
        const all = [...seen.values()];
        expect(all.length > 0, `step ${i}: no reference measured`);
        const worst = Math.max(...all.map((m) => Math.max(Math.abs(m.dx), Math.abs(m.dy))));
        r.zooms.push({ zoom: steps[i], scale: scales[i], refs: all.length, worst, each: all });
      }
      const deepest = r.zooms.at(-1);
      // The deepest zoom on case (a)'s count past the page, before drawing there.
      await zoomInOn(page, caseShapes.a.count, presses);
      r.shots.push(await shotAt(page, `${key}-deep-${deepest.zoom.toFixed(2)}`));

      // The deepest zoom: the same line and count again, aimed at the points Fit stored, so only
      // the zoom differs.
      for (const c of ["a", "b"]) {
        const f = r.drawn[c].fit;
        r.drawn[c].deep = await drawCase(page, key, `deep ${c}`, { line: f.line.geometries[0].vertices_json, count: f.count.geometries[0].vertices_json[0] }, presses);
      }
      await zoomInOn(page, caseShapes.a.count, presses);
      r.shots.push(await shotAt(page, `${key}-deep-drawn`));

      // Compare: stored points (in points of the page) and the quantities.
      const pt = (a, b) => Math.max(Math.abs(a[0] - b[0]) * sheet.width, Math.abs(a[1] - b[1]) * sheet.height);
      const report = [];
      const deepPx = 1 / deepest.scale; // one CSS px at the deepest zoom, in points
      for (const c of ["a", "b"]) {
        const { fit: f, deep: d } = r.drawn[c];
        const fv = f.line.geometries[0].vertices_json;
        const dv = d.line.geometries[0].vertices_json;
        const lineOff = Math.max(pt(fv[0], dv[0]), pt(fv[1], dv[1]));
        const countOff = pt(f.count.geometries[0].vertices_json[0], d.count.geometries[0].vertices_json[0]);
        const ratio = d.line.effective_quantity / f.line.effective_quantity;
        const countRatio = d.count.effective_quantity / f.count.effective_quantity;
        // At Fit the click stores the point it landed on: within one Fit pixel of what was aimed at.
        const fitPx = 1 / r.zooms[0].scale;
        const aimed = Math.max(pt(fv[0], caseShapes[c].line[0]), pt(fv[1], caseShapes[c].line[1]), pt(f.count.geometries[0].vertices_json[0], caseShapes[c].count));
        expect(aimed <= fitPx, `case ${c}: Fit stored ${aimed.toFixed(3)} pt from the point aimed at (one Fit px is ${fitPx.toFixed(3)} pt)`);
        r.drawn[c].compare = { aimed, lineOff, countOff, ratio, countRatio, fitLine: fv, deepLine: dv, fitQty: f.line.effective_quantity, deepQty: d.line.effective_quantity };
        expect(lineOff <= deepPx + 1e-6 && countOff <= deepPx + 1e-6, `case ${c}: stored points differ by ${lineOff.toFixed(4)} / ${countOff.toFixed(4)} pt (one deep px is ${deepPx.toFixed(4)} pt)`);
        expect(ratio.toFixed(3) === "1.000" && countRatio === 1, `case ${c}: quantity ratio ${ratio} (count ${countRatio})`);
        report.push(`${c} ${CASES[key][c]}: line ${f.line.effective_quantity.toFixed(3)} → ${d.line.effective_quantity.toFixed(3)} LF (ratio ${ratio.toFixed(3)}), points within ${Math.max(lineOff, countOff).toFixed(4)} pt`);
      }
      const worstAll = Math.max(...r.zooms.map((z) => z.worst));
      const deepWorst = Math.max(...r.zooms.filter((z) => z.zoom >= 3).map((z) => z.worst));
      const limit = (z) => (z.zoom >= 3 ? 0.25 : 1);
      const over = r.zooms.filter((z) => z.worst > limit(z));
      await writeFile(`${SHOTS}/m6-position.json`, JSON.stringify(results, null, 1));
      expect(over.length === 0, `a reference cross is drawn off its page point: ${over.map((z) => `${z.zoom.toFixed(3)}× ${z.worst.toFixed(2)} px (limit ${limit(z)})`).join(", ")}`);
      return `fit ${fit.toFixed(4)}×, ${r.zooms.length} steps to ${deepest.zoom.toFixed(2)}×, ${r.zooms.reduce((s, z) => s + z.refs, 0)} crosses measured, worst ${worstAll.toFixed(2)} px (from 3×: ${deepWorst.toFixed(2)} px) · ${report.join(" · ")}`;
    },
  };
}

await run("m6-position", [
  {
    title: "setup: Position.pdf (L, P, R /Rotate 90, C CropBox offset) loaded; every sheet's shown size and turn as made; 1/8\" = 1'-0\" on each",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "Position.pdf", buffer: makePositionPdf(), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Position.pdf"].uuid, [1, 2, 3, 4]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      const read = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid, 180000);
      const byPage = Object.fromEntries(read.map((s) => [s.page_number, s]));
      const out = [];
      for (const [i, sheet] of SHEETS.entries()) {
        const s = byPage[i + 1];
        sheets[sheet.key] = s;
        expect(Math.abs(s.width_pt - sheet.width) < 0.01 && Math.abs(s.height_pt - sheet.height) < 0.01, `${sheet.key}: shown ${s.width_pt} × ${s.height_pt} pt, made ${sheet.width} × ${sheet.height}`);
        expect((s.rotation ?? 0) === (sheet.rotate ?? 0), `${sheet.key}: /Rotate ${s.rotation}, made ${sheet.rotate ?? 0}`);
        const scaled = await apiCall(token, "PUT", `${drawing}/sheet/${s.uuid}/scale`, { feet_per_pt: FEET_PER_PT, label: `1/8" = 1'-0"`, unit: "ft" });
        expect(scaled.status === 200, `${sheet.key} scale: ${scaled.status}`);
        out.push(`${sheet.key} ${s.width_pt} × ${s.height_pt} pt, turn ${s.rotation ?? 0}`);
      }
      return `${out.join("; ")} (project "${project.name}", ${stamp()})`;
    },
  },
  ...SHEETS.map(sheetStep),
]);

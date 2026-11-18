// C53, a contour's point dragged moves that one point (D-1310 c).
//
//   ./fx-suite.sh run c53-contour-vertex-drag
//
// What was wrong: on a selected contour a press on its line (a 10 px hit stroke) that missed the 7 px handle dragged the
// whole contour, so a press a few pixels off a point moved every point; and where two handles overlapped the one drawn
// last took the press, not the nearest. Now the nearest single vertex within 10 screen px moves, whatever took the
// press; a press on the line away from every vertex moves nothing; Alt with the press moves the whole contour.
//
// The world: the Riverside throwaway sheet, an existing-grade contour made through the api, the Earthwork tab, Select.
//   1. Pressed on its line 6 px from its third point (outside the handle), dragged: only that point moved, saved and kept.
//   2. Pressed on the line halfway between two points, dragged: nothing moved, nothing saved.
//   3. Alt-pressed on the line, dragged: every point moved by the same step, saved.
//   4. Two points 5 px apart (their handles overlap): pressed 2 px from the first, dragged: the first moved, not the
//      second.

import { APP, expect, run } from "./lib/bench.mjs";
import { call, signInAt } from "./lib/realtime.mjs";
import { riversideWorld } from "./lib/world.mjs";

const world = await riversideWorld();
const { token, r } = world;
const tag = Date.now() % 1000000;

async function api(method, path, body) {
  const res = await call(token, method, path, body);
  if (res.status >= 300) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(res.body).slice(0, 300)}`);
  return res.body;
}
async function makeContour(name, vertices) {
  const item = await api("POST", `${r.takeoff}/item`, {
    sheet_uuid: r.sheet,
    name,
    type: "contour",
    unit: "LF",
    is_earthwork_markup: true,
    geometry: { geom_type: "contour", vertices_json: vertices, shape_meta: { kind: "polyline", surface: "EG", elevation: 100 } },
  });
  const shape = (await api("GET", `${r.takeoff}/item/${item.uuid}`)).geometries[0].uuid;
  return { item: item.uuid, shape };
}
const pointsOf = async (item) => (await api("GET", `${r.takeoff}/item/${item}`)).geometries[0].vertices_json;
const removeItem = (uuid) => call(token, "DELETE", `${r.takeoff}/item/${uuid}`);
const signIn = (page) => signInAt(page, APP, world.owner.email, world.owner.password);

async function open(page) {
  await page.goto(`${r.url(APP)}?tab=earthwork`);
  await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 30000 });
  await page.locator("svg[data-earthwork-layer]").first().waitFor({ state: "attached", timeout: 30000 });
  await page.keyboard.press("Escape");
  await page.locator('[data-tool="select"]').first().click();
}
/** A page point (0–1 fractions) on screen, through the earthwork layer's own box. */
async function at(page, [x, y]) {
  const box = await page.locator("svg[data-earthwork-layer]").first().boundingBox();
  return { x: box.x + box.width * x, y: box.y + box.height * y };
}
const geometrySave = (res) => res.request().method() === "PATCH" && res.url().includes("/takeoff/geometry/") && res.status() < 300;
async function drag(page, from, dx, dy, { alt = false, expectSave = true } = {}) {
  const saved = expectSave ? page.waitForResponse(geometrySave, { timeout: 15000 }) : null;
  const saves = [];
  const onResponse = (res) => geometrySave(res) && saves.push(res.url());
  page.on("response", onResponse);
  if (alt) await page.keyboard.down("Alt");
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 10 });
  await page.mouse.up();
  if (alt) await page.keyboard.up("Alt");
  if (saved) await saved;
  else await page.waitForTimeout(2500);
  page.off("response", onResponse);
  return saves.length;
}
async function select(page, shape, onLine) {
  await page.mouse.click(onLine.x, onLine.y);
  await page.locator(`[data-earthwork-run="${shape}"][data-selected="1"]`).waitFor({ timeout: 10000 });
}
const changed = (a, b) => a.map((p, i) => (p[0] !== b[i][0] || p[1] !== b[i][1] ? i : -1)).filter((i) => i >= 0);

await run("c53-contour-vertex-drag", [
  {
    title: "a press on the line 6 px from a point (outside its handle) drags that one point; the line away from points moves nothing; Alt drags the whole contour",
    run: async ({ page }) => {
      const { item, shape } = await makeContour(`C53 contour ${tag}`, [
        [0.3, 0.8],
        [0.4, 0.78],
        [0.5, 0.8],
        [0.6, 0.78],
      ]);
      try {
        await signIn(page);
        await open(page);
        const start = await pointsOf(item);
        const a = await at(page, start[0]);
        const b = await at(page, start[1]);
        await select(page, shape, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        // 1. On the line, 6 px from the third point toward the fourth: inside the line's 10 px hit stroke, outside the
        //    7 px handle. Before D-1310 this press dragged the whole contour.
        const third = await at(page, start[2]);
        const fourth = await at(page, start[3]);
        const len = Math.hypot(fourth.x - third.x, fourth.y - third.y);
        await drag(page, { x: third.x + (6 * (fourth.x - third.x)) / len, y: third.y + (6 * (fourth.y - third.y)) / len }, 0, -40);
        const one = await pointsOf(item);
        expect(JSON.stringify(changed(start, one)) === "[2]", `only the third point moved: ${JSON.stringify(changed(start, one))} (${JSON.stringify(start)} → ${JSON.stringify(one)})`);
        // Kept after a reload.
        await open(page);
        expect(JSON.stringify(await pointsOf(item)) === JSON.stringify(one), "kept after the reload");
        // 2. Halfway along the last stretch, away from every point: nothing moves, nothing saved.
        const p3 = await at(page, one[2]);
        const p4 = await at(page, one[3]);
        const midLast = { x: (p3.x + p4.x) / 2, y: (p3.y + p4.y) / 2 };
        await select(page, shape, midLast);
        const saves = await drag(page, midLast, 30, 30, { expectSave: false });
        const two = await pointsOf(item);
        expect(saves === 0 && changed(one, two).length === 0, `a press on the line moved nothing: ${saves} saves, ${JSON.stringify(changed(one, two))} moved`);
        // 3. Alt with the press: the whole contour, every point by the same step.
        await drag(page, midLast, 0, 30, { alt: true });
        const three = await pointsOf(item);
        const steps = three.map((p, i) => [+(p[0] - two[i][0]).toFixed(6), +(p[1] - two[i][1]).toFixed(6)]);
        const same = steps.every((s) => s[0] === steps[0][0] && s[1] === steps[0][1]);
        expect(changed(two, three).length === 4 && same && steps[0][1] > 0, `Alt moved every point by one step: ${JSON.stringify(steps)}`);
        return `third point only (${JSON.stringify(start[2])} → ${JSON.stringify(one[2])}), kept; line press: 0 saves; Alt: all 4 by ${JSON.stringify(steps[0])}`;
      } finally {
        await removeItem(item);
      }
    },
  },
  {
    title: "two points 5 px apart (handles overlapping): a press 2 px from the first drags the first, not the second",
    run: async ({ page }) => {
      await signIn(page);
      await open(page);
      const box = await page.locator("svg[data-earthwork-layer]").first().boundingBox();
      const [fx, fy] = [5 / box.width, 0];
      const { item, shape } = await makeContour(`C53 close ${tag}`, [
        [0.3, 0.6],
        [0.45, 0.6],
        [0.45 + fx, 0.6 + fy],
        [0.6, 0.6],
      ]);
      try {
        await open(page);
        const start = await pointsOf(item);
        const a = await at(page, start[0]);
        const b = await at(page, start[1]);
        await select(page, shape, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        // 2 px from the second point toward the third, which is 3 px off: inside both handles; the nearest is the second.
        const second = await at(page, start[1]);
        await drag(page, { x: second.x + 2, y: second.y }, 0, 40);
        const after = await pointsOf(item);
        expect(JSON.stringify(changed(start, after)) === "[1]", `only the nearest (second) point moved: ${JSON.stringify(changed(start, after))}`);
        return `second point only: ${JSON.stringify(start[1])} → ${JSON.stringify(after[1])}; third kept at ${JSON.stringify(after[2])}`;
      } finally {
        await removeItem(item);
      }
    },
  },
]);

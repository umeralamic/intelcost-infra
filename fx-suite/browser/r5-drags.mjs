// R5 (night run 2026-10-20): every drag-to-move on the sheet saves, and the new place is kept
// after a reload (D-648).
//
//   ./fx-suite.sh run r5-drags
//
// R5 was reported as "dragging a count mark sends no save" (f8-s18 step 2). It was not so: the
// drag saves; that step waited for `DELETE …/item/<uuid>`, and the row menu's Delete has gone
// through the undoable batch `POST …/item/delete` since D-635. This fixture holds every other
// drag to the same proof: each object made through the api, dragged with real mouse events on
// today's screens, its save awaited, the page reloaded, and the stored place read back.
//
// Not here, by design: a dimension (never saved, D-254) and the site view's moves (their own
// fixture world). The legend card's place is the browser's own (localStorage), so it is read
// back from the page after the reload.

import { APP, expect, run } from "./lib/bench.mjs";
import { call, signInAt } from "./lib/realtime.mjs";
import { riversideWorld } from "./lib/world.mjs";

const world = await riversideWorld();
const { token, r } = world;
const project = r.takeoff.replace(/\/takeoff$/, "");
const tag = Date.now() % 1000000;

async function api(method, path, body) {
  const res = await call(token, method, path, body);
  if (res.status >= 300) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(res.body).slice(0, 300)}`);
  return res.body;
}

/** A takeoff item with one shape; returns the item and its shape's uuid. */
async function makeItem(body) {
  const item = await api("POST", `${r.takeoff}/item`, { sheet_uuid: r.sheet, ...body });
  const shape = (await shapeOf(item.uuid)).uuid;
  return { item: item.uuid, shape };
}
async function shapeOf(itemUuid) {
  const item = await api("GET", `${r.takeoff}/item/${itemUuid}`);
  if (!item?.geometries?.length) throw new Error(`${itemUuid}: no shape (${JSON.stringify(item).slice(0, 200)})`);
  return item.geometries[0];
}
const removeItem = (uuid) => call(token, "DELETE", `${r.takeoff}/item/${uuid}`);

/** The sheet open on a tab, Select armed, the shapes drawn. */
async function open(page, tab) {
  await page.goto(`${r.url(APP)}${tab ? `?tab=${tab}` : ""}`);
  await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 30000 });
  await page.locator('svg[viewBox="0 0 1 1"]').first().waitFor();
  await page.keyboard.press("Escape");
  await page.locator('[data-tool="select"]').first().click();
}
/** A page point (0–1 fractions) on screen. */
async function at(page, [x, y]) {
  const box = await page.locator('svg[viewBox="0 0 1 1"]').first().boundingBox();
  return { x: box.x + box.width * x, y: box.y + box.height * y };
}
/** Press at `from`, move by (dx, dy) in small steps, release; resolve once `saved` answers. */
async function drag(page, from, dx, dy, saved) {
  const answer = page.waitForResponse((res) => saved(res.url(), res.request().method()) && res.status() < 300, { timeout: 15000 });
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 });
  await page.mouse.up();
  return answer;
}
const geometrySave = (url, method) => method === "PATCH" && url.includes("/takeoff/geometry/");
const moved = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.01;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The common proof: before ≠ after, and after the reload the stored place is still `after`. */
async function keptAfterReload(page, tab, read, before) {
  const after = await read();
  expect(moved(before, after), `the drag moved it: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  await open(page, tab);
  const reloaded = await read();
  expect(same(after, reloaded), `kept after the reload: ${JSON.stringify(after)} vs ${JSON.stringify(reloaded)}`);
  return `${JSON.stringify(before)} → ${JSON.stringify(after)}, kept after the reload`;
}

const signIn = (page) => signInAt(page, APP, world.owner.email, world.owner.password);

await run("r5-drags", [
  {
    title: "A count mark: Select press inside the mark, drag, saved and kept",
    run: async ({ page }) => {
      const { item, shape } = await makeItem({ name: `R5 count ${tag}`, type: "count", unit: "EA", geometry: { geom_type: "count", vertices_json: [[0.4, 0.4]], shape_meta: null } });
      try {
        await signIn(page);
        await open(page);
        const read = async () => (await shapeOf(item)).vertices_json[0];
        const before = await read();
        await drag(page, await at(page, before), 70, 45, geometrySave);
        expect(shape, "shape");
        return await keptAfterReload(page, undefined, read, before);
      } finally {
        await removeItem(item);
      }
    },
  },
  {
    title: "A Linear shape's vertex: Select press on the point, drag, saved and kept",
    run: async ({ page }) => {
      const { item } = await makeItem({ name: `R5 linear ${tag}`, type: "lf", unit: "LF", geometry: { geom_type: "lf", vertices_json: [[0.3, 0.55], [0.6, 0.55]], shape_meta: null } });
      try {
        await signIn(page);
        await open(page);
        const read = async () => (await shapeOf(item)).vertices_json[1];
        const before = await read();
        await drag(page, await at(page, before), 60, 50, geometrySave);
        return await keptAfterReload(page, undefined, read, before);
      } finally {
        await removeItem(item);
      }
    },
  },
  {
    title: "An Area shape's vertex: Select press on the corner, drag, saved and kept",
    run: async ({ page }) => {
      const { item } = await makeItem({ name: `R5 area ${tag}`, type: "sf", unit: "SF", geometry: { geom_type: "sf", vertices_json: [[0.3, 0.3], [0.5, 0.3], [0.5, 0.45], [0.3, 0.45]], shape_meta: { closed: true } } });
      try {
        await signIn(page);
        await open(page);
        const read = async () => (await shapeOf(item)).vertices_json[2];
        const before = await read();
        await drag(page, await at(page, before), 60, 40, geometrySave);
        return await keptAfterReload(page, undefined, read, before);
      } finally {
        await removeItem(item);
      }
    },
  },
  {
    title: "A whole shape: selected, then its Move handle dragged, saved and kept",
    run: async ({ page }) => {
      const { item, shape } = await makeItem({ name: `R5 whole ${tag}`, type: "lf", unit: "LF", geometry: { geom_type: "lf", vertices_json: [[0.3, 0.7], [0.55, 0.7]], shape_meta: null } });
      try {
        await signIn(page);
        await open(page);
        const read = async () => (await shapeOf(item)).vertices_json[0];
        const before = await read();
        // A click on the line picks its section, and the Move handle shows at its centre.
        const mid = await at(page, [0.425, 0.7]);
        await page.mouse.click(mid.x, mid.y);
        const handle = page.locator(`[data-move-handle="${shape}"]`);
        await handle.waitFor({ timeout: 10000 });
        const box = await handle.boundingBox();
        await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 80, -60, (url, method) => method === "POST" && url.includes(`/item/${item}/shapes`));
        return await keptAfterReload(page, undefined, read, before);
      } finally {
        await removeItem(item);
      }
    },
  },
  {
    title: "A utility structure: Select press inside its mark, drag, saved and kept",
    run: async ({ page }) => {
      const { item } = await makeItem({
        name: `R5-MH ${tag}`,
        type: "count",
        unit: "EA",
        is_utility: true,
        structure: { structure_type: "storm_manhole", utility_type: "storm" },
        geometry: { geom_type: "count", vertices_json: [[0.65, 0.35]], shape_meta: null },
      });
      try {
        await signIn(page);
        await open(page);
        const read = async () => (await shapeOf(item)).vertices_json[0];
        const before = await read();
        await drag(page, await at(page, before), -60, 45, geometrySave);
        return await keptAfterReload(page, undefined, read, before);
      } finally {
        await removeItem(item);
      }
    },
  },
  {
    title: "A bore, on the Earthwork tab: pressed and dragged, saved and kept",
    run: async ({ page }) => {
      const code = `R5B${tag % 1000}`;
      const bore = await api("POST", `${project}/earthwork/bore`, { sheet_uuid: r.sheet, point: [0.45, 0.6], code, total_depth_ft: 20 });
      try {
        await signIn(page);
        await open(page, "earthwork");
        const read = async () => (await api("GET", `${project}/earthwork/geotech`)).bores.find((b) => b.code === code).point;
        const before = await read();
        const mark = page.locator(`g[data-bore="${code}"]`).first();
        await mark.waitFor({ timeout: 15000 });
        await drag(page, await at(page, before), 70, -40, (url, method) => method === "PATCH" && url.includes("/earthwork/bore/"));
        return await keptAfterReload(page, "earthwork", read, before);
      } finally {
        await call(token, "DELETE", `${project}/earthwork/bore/${bore.uuid}`);
      }
    },
  },
  {
    title: "A spot elevation, on the Earthwork tab: picked, then dragged, saved and kept",
    run: async ({ page }) => {
      const { item } = await makeItem({ name: `R5 spot ${tag}`, type: "spot_elevation", unit: "EA", is_earthwork_markup: true, geometry: { geom_type: "spot_elevation", vertices_json: [[0.7, 0.6]], shape_meta: { kind: "spot", surface: "EG", elevation: 100 } } });
      try {
        await signIn(page);
        await open(page, "earthwork");
        const read = async () => (await shapeOf(item)).vertices_json[0];
        const before = await read();
        const p = await at(page, before);
        // The first press on a run only picks it; the second drags (EarthworkLayer's press).
        await page.mouse.click(p.x, p.y);
        await page.locator('[data-earthwork-run][data-selected="1"]').first().waitFor({ timeout: 10000 });
        await drag(page, p, -70, 40, geometrySave);
        return await keptAfterReload(page, "earthwork", read, before);
      } finally {
        await removeItem(item);
      }
    },
  },
  {
    title: "A contour's vertex, on the Earthwork tab: picked, its handle dragged, saved and kept",
    run: async ({ page }) => {
      const { item, shape } = await makeItem({ name: `R5 contour ${tag}`, type: "contour", unit: "LF", is_earthwork_markup: true, geometry: { geom_type: "contour", vertices_json: [[0.25, 0.85], [0.4, 0.82], [0.55, 0.85]], shape_meta: { kind: "polyline", surface: "EG", elevation: 100 } } });
      try {
        await signIn(page);
        await open(page, "earthwork");
        const read = async () => (await shapeOf(item)).vertices_json[1];
        const before = await read();
        const p = await at(page, before);
        await page.mouse.click(p.x, p.y);
        await page.locator(`[data-earthwork-run="${shape}"][data-selected="1"]`).waitFor({ timeout: 10000 });
        const handle = page.locator(`[data-earthwork-run="${shape}"] [data-earthwork-handle="1"]`);
        const box = await handle.boundingBox();
        await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 0, -40, geometrySave);
        return await keptAfterReload(page, "earthwork", read, before);
      } finally {
        await removeItem(item);
      }
    },
  },
  {
    title: "A markup (highlight), on the Annotations tab: pressed and dragged, saved and kept",
    run: async ({ page }) => {
      const markup = await api("POST", `${project}/markup`, { sheet_uuid: r.sheet, kind: "highlight", geometry: { x: 0.6, y: 0.2, w: 0.1, h: 0.06 }, style: { color: "#facc15", opacity: 0.35 } });
      try {
        await signIn(page);
        await open(page, "collaborator");
        const read = async () => {
          const list = await api("GET", `${project}/markup?sheet_uuid=${r.sheet}`);
          const found = (Array.isArray(list) ? list : list.items).find((m) => m.uuid === markup.uuid);
          if (!found) throw new Error(`no markup ${markup.uuid} among ${JSON.stringify(list).slice(0, 200)}`);
          const g = found.geometry;
          return [g.x, g.y];
        };
        const before = await read();
        const body = page.locator(`[data-markup="${markup.uuid}"]`).first();
        await body.waitFor({ timeout: 15000 });
        const box = await body.boundingBox();
        await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, -80, 60, (url, method) => method === "PATCH" && url.includes(`/markup/${markup.uuid}`));
        return await keptAfterReload(page, "collaborator", read, before);
      } finally {
        await call(token, "DELETE", `${project}/markup/${markup.uuid}`);
      }
    },
  },
  {
    title: "The legend card: shown, dragged by its title, and in the same place after a reload",
    run: async ({ page }) => {
      const { item } = await makeItem({ name: `R5 legend ${tag}`, type: "count", unit: "EA", geometry: { geom_type: "count", vertices_json: [[0.2, 0.2]], shape_meta: null } });
      try {
        await signIn(page);
        await open(page);
        const empty = await at(page, [0.9, 0.9]);
        await page.mouse.click(empty.x, empty.y, { button: "right" });
        await page.getByRole("menuitem", { name: /Show Legend/ }).click();
        const card = page.locator("[data-legend]").first();
        await card.waitFor({ timeout: 10000 });
        const place = async () => {
          const b = await card.boundingBox();
          return [Math.round(b.x), Math.round(b.y)];
        };
        const before = await place();
        await page.mouse.move(before[0] + 40, before[1] + 10);
        await page.mouse.down();
        await page.mouse.move(before[0] + 40 - 120, before[1] + 10 + 90, { steps: 8 });
        await page.mouse.up();
        const after = await place();
        expect(Math.hypot(after[0] - before[0], after[1] - before[1]) > 30, `the drag moved the card: ${before} → ${after}`);
        // Shown or hidden is not kept (the setting's default decides); its place is.
        await open(page);
        const again = await at(page, [0.9, 0.9]);
        await page.mouse.click(again.x, again.y, { button: "right" });
        await page.getByRole("menuitem", { name: /Show Legend/ }).click();
        await card.waitFor({ timeout: 10000 });
        const reloaded = await place();
        expect(Math.hypot(reloaded[0] - after[0], reloaded[1] - after[1]) <= 2, `kept after the reload: ${after} vs ${reloaded}`);
        return `${before} → ${after}, kept after the reload (${reloaded})`;
      } finally {
        await removeItem(item);
      }
    },
  },
]);

// R6 (2026-11-06, D-1021): nothing of the takeoff shows or acts under Estimating.
//
//   ./fx-suite.sh run r6-hidden-view
//
// The takeoff stays mounted under Estimating, hidden. What it portals into the body (the earthwork
// hover card, floating panels, menus) stayed on screen, and its window-wide keys still acted on it.
// Written at Umer's request, an exception to hard rule 8 as before.
//
// The tab is switched by a click dispatched on it, without moving the pointer: a real move off the
// contour clears its hover card by itself, and the card was seen with the pointer still on it.

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

/** A contour on the existing grade, through the api; returns its item and shape. */
async function makeContour() {
  const item = await api("POST", `${r.takeoff}/item`, {
    sheet_uuid: r.sheet,
    name: `R6 contour ${tag}`,
    type: "contour",
    unit: "LF",
    is_earthwork_markup: true,
    geometry: { geom_type: "contour", vertices_json: [[0.25, 0.85], [0.4, 0.82], [0.55, 0.85]], shape_meta: { kind: "polyline", surface: "EG", elevation: 100 } },
  });
  const shape = (await api("GET", `${r.takeoff}/item/${item.uuid}`)).geometries[0].uuid;
  return { item: item.uuid, shape };
}
const removeItem = (uuid) => call(token, "DELETE", `${r.takeoff}/item/${uuid}`);

/** The sheet's items and every shape's points: what a key under Estimating must not change. */
async function snapshot() {
  const list = await api("GET", `${r.takeoff}/item?sheet_uuid=${r.sheet}`);
  const details = await Promise.all(list.map((i) => api("GET", `${r.takeoff}/item/${i.uuid}`)));
  return JSON.stringify(details.map((d) => [d.uuid, d.name, d.geometries.map((g) => [g.uuid, g.vertices_json])]).sort());
}

const signIn = (page) => signInAt(page, APP, world.owner.email, world.owner.password);
const canvas = (page) => page.locator('svg[viewBox="0 0 1 1"]').first();

/** The sheet open on a tab, Select armed. */
async function open(page, tab) {
  await page.goto(`${r.url(APP)}${tab ? `?tab=${tab}` : ""}`);
  await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 30000 });
  await canvas(page).waitFor();
  await page.keyboard.press("Escape");
  await page.locator('[data-tool="select"]').first().click();
}
async function at(page, [x, y]) {
  const box = await canvas(page).boundingBox();
  return { x: box.x + box.width * x, y: box.y + box.height * y };
}
/** A tab chosen without moving the pointer. */
async function tab(page, name) {
  await page.getByRole("tablist", { name: "Workspace tabs" }).getByRole("tab", { name, exact: true }).dispatchEvent("click");
  if (name === "Estimating") await page.locator("[data-estimating]").first().waitFor({ timeout: 30000 });
  else await canvas(page).waitFor({ state: "visible", timeout: 30000 });
}
/** An Earthwork tool by its button, or from the row's More menu when the row has folded it away. */
async function earthTool(page, selector, label) {
  const button = page.locator(selector).first();
  if (await button.isVisible()) return button.click();
  // The trigger reads "More"; "More earthwork tools" names the menu it opens.
  await page.locator('[data-earthwork-toolbar] button[aria-haspopup="menu"]').filter({ hasText: "More" }).first().click();
  await page.getByRole("menu", { name: "More earthwork tools" }).waitFor({ timeout: 10000 });
  await page.getByRole("menuitem", { name: label, exact: true }).click();
}
/** None of `locator` is visible, now and over the next second (a card rests 300 ms before showing). */
async function noneShows(page, locator, what) {
  const until = Date.now() + 1000;
  do {
    const shown = await locator.evaluateAll((els) => els.filter((e) => e.getClientRects().length > 0).length);
    expect(shown === 0, `${what}: ${shown} on screen`);
    await page.waitForTimeout(100);
  } while (Date.now() < until);
}

await run("r6-hidden-view", [
  {
    title: "The earthwork hover card: shown on a contour, gone under Estimating, not back on the Earthwork tab",
    run: async ({ page }) => {
      const { item } = await makeContour();
      try {
        await signIn(page);
        await open(page, "earthwork");
        const p = await at(page, [0.4, 0.82]);
        await page.mouse.move(p.x - 3, p.y);
        await page.mouse.move(p.x, p.y);
        const card = page.locator("[data-earthwork-hover]");
        await card.first().waitFor({ timeout: 10000 });
        const text = (await card.first().innerText()).replace(/\s+/g, " ").trim();
        await tab(page, "Estimating");
        await noneShows(page, card, "the hover card under Estimating");
        await tab(page, "Earthwork");
        await noneShows(page, card, "the hover card back on the Earthwork tab (pointer not moved)");
        return `"${text}" shown, gone under Estimating, not back after`;
      } finally {
        await removeItem(item);
      }
    },
  },
  {
    title: "A right-click menu: open on the sheet, closed under Estimating, not restored on the Takeoff tab",
    run: async ({ page }) => {
      await signIn(page);
      await open(page);
      const empty = await at(page, [0.9, 0.9]);
      await page.mouse.click(empty.x, empty.y, { button: "right" });
      const menu = page.getByRole("menu");
      await menu.first().waitFor({ timeout: 10000 });
      const label = await menu.first().getAttribute("aria-label");
      await tab(page, "Estimating");
      await noneShows(page, menu, "the menu under Estimating");
      await tab(page, "Takeoff");
      await noneShows(page, menu, "the menu back on the Takeoff tab");
      return `"${label}" open, closed under Estimating, not restored`;
    },
  },
  {
    title: "Two panels and a selected contour: hidden under Estimating, where Delete, Backspace, Ctrl+Z, Ctrl+Y, Enter and Escape change nothing; back as they were",
    run: async ({ page }) => {
      const { item, shape } = await makeContour();
      try {
        await signIn(page);
        await open(page, "earthwork");
        const p = await at(page, [0.4, 0.82]);
        await page.mouse.click(p.x, p.y);
        await page.locator(`[data-earthwork-run="${shape}"][data-selected="1"]`).waitFor({ timeout: 10000 });
        await earthTool(page, "[data-utilities-button]", "Utilities");
        await earthTool(page, "[data-coordinates-button]", "Coordinates");
        const panels = ["takeoff-run-panel-v1", "takeoff-coordinates-panel-v2"].map((key) => page.locator(`[data-floating-panel="${key}"]`).first());
        for (const panel of panels) await panel.waitFor({ timeout: 15000 });
        const look = async () =>
          Promise.all(panels.map(async (panel) => {
            const b = await panel.boundingBox();
            return { box: b && [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)], text: (await panel.innerText()).replace(/\s+/g, " ").trim() };
          }));
        const before = await look();
        const stored = await snapshot();

        await tab(page, "Estimating");
        await noneShows(page, page.locator("[data-floating-panel]"), "a takeoff panel under Estimating");
        for (const key of ["Delete", "Backspace", "Control+z", "Control+y", "Enter", "Escape"]) await page.keyboard.press(key);
        // A key that acted would save through the api: the sheet is read back once its writes settle.
        await page.waitForLoadState("networkidle");
        const after = await snapshot();
        expect(after === stored, "a key under Estimating changed the takeoff");

        await tab(page, "Earthwork");
        for (const panel of panels) await panel.waitFor({ state: "visible", timeout: 10000 });
        const again = await look();
        expect(JSON.stringify(again) === JSON.stringify(before), `the panels came back changed: ${JSON.stringify(before)} vs ${JSON.stringify(again)}`);
        await page.locator(`[data-earthwork-run="${shape}"]`).waitFor({ timeout: 10000 });
        return `Run and Coordinates hidden, 6 keys changed nothing (${JSON.parse(stored).length} items, same shapes), both back at ${again.map((a) => a.box.join("×")).join(" and ")} with the same contents`;
      } finally {
        await removeItem(item);
      }
    },
  },
]);

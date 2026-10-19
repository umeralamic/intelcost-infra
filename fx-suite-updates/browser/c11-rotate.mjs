// C11, the founder's click check "Rotate pages" (P-20a): Sheets ⋮ › Rotate Pages… › Landscape, set to
// 90°. Markups stay on their features with the same quantities, the thumbnails turn, and a second
// window turns live.
//
//   node fx-run-locked.mjs c11-rotate
//
// The world: one throwaway workspace and project; "Turn.pdf", three pages: 1 and 3 landscape
// (1224 × 792 pt), 2 portrait (612 × 792). Page 1 is at 1/8" = 1'-0" (1/6 ft per point) and carries
// three markups: "Run R" a 360 pt run (60 LF), "Slab S" a 240 × 120 pt box (40 × 20 ft = 800 SF) and
// "Posts P" two count marks (2 EA).
//
// Asserts: the dialog flow by its own words (Landscape ticks the 2 landscape pages, Set to 90°,
// "Rotated 2 pages", stored 90/0/90); each markup is drawn where its stored point lands on the
// turned page (within 4 px), its stored vertices and its quantity unchanged, its panel row reads the
// same; the panel's thumbnails of pages 1 and 3 turn, page 2's does not; a second window (window B,
// the other app and api process) on page 3 turns to 90° with no reload, from the click in window A.
//
// Left for the founder's eye: that the turned sheet looks right (text the right way up, no blur,
// no flash), how fast the second window follows, and the thumbnails' look.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { APP_B, joinedTopic, recordSockets, signInAt, waitFor } from "./lib/realtime.mjs";

const W = 1224;
const H = 792;
const { token, workspace, base } = await freshWorkspace("C11 rotate");
const project = await makeProject(token, base, { name: "C11 Rotate pages" });
const drawing = `${base}/${project.uuid}/drawing`;
const takeoff = `${base}/${project.uuid}/takeoff`;
let pages; // by page number
const items = {}; // name → { uuid, geometry uuids, vertices, quantity }
let rowsBefore = {};

const sheetRead = async (n) => (await apiCall(token, "GET", `${drawing}/sheet`)).body.find((s) => s.uuid === pages[n].uuid);
const pageBox = (page) => page.locator("[data-page-turn]");
const svg = (page) => page.locator('svg[role="presentation"]');
const detail = async (uuid) => (await apiCall(token, "GET", `${takeoff}/item/${uuid}`)).body;
const panelRow = (page, name) => page.locator("[data-quantity-panel] li[data-item-row] > [role=row]", { hasText: name }).first();
const rowText = async (page, name) => ((await panelRow(page, name).textContent()) ?? "").replace(/\s+/g, " ").trim();

async function open(page, n) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${pages[n].uuid}`);
  await pageBox(page).waitFor({ timeout: 20000 });
  await page.locator("[data-quantity-panel] li[data-item-row]").first().waitFor({ timeout: 15000 });
}

/** Where a point of the unturned page is on screen, for the page turned `turn`° clockwise. */
async function onScreen(page, [x, y], turn) {
  const box = await svg(page).boundingBox();
  const [u, v] = turn === 90 ? [1 - y, x] : turn === 180 ? [1 - x, 1 - y] : turn === 270 ? [y, 1 - x] : [x, y];
  return { x: box.x + box.width * u, y: box.y + box.height * v };
}

/** The drawn centre of a geometry: the middle of its element's box on screen. */
async function drawnCentre(page, geometryUuid) {
  // A level run's path is zero pixels tall, which Playwright calls hidden: measured by the page.
  const el = page.locator(`[data-geometry="${geometryUuid}"]`).first();
  await el.waitFor({ state: "attached", timeout: 15000 });
  return el.evaluate((node) => {
    const b = node.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
}

const centreOf = (vertices) => [vertices.reduce((s, p) => s + p[0], 0) / vertices.length, vertices.reduce((s, p) => s + p[1], 0) / vertices.length];
const midBox = (vertices) => {
  const xs = vertices.map((p) => p[0]);
  const ys = vertices.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
};

/** Each markup's drawn centre against where its stored shape lands on the page turned `turn`. */
async function markupsOnFeatures(page, turn) {
  const out = [];
  for (const [name, it] of Object.entries(items)) {
    for (const g of it.geometries) {
      const want = await onScreen(page, g.vertices.length > 1 ? midBox(g.vertices) : centreOf(g.vertices), turn);
      const got = await drawnCentre(page, g.uuid);
      const off = Math.hypot(got.x - want.x, got.y - want.y);
      expect(off <= 4, `${name} drawn at ${Math.round(got.x)},${Math.round(got.y)}, its feature at ${Math.round(want.x)},${Math.round(want.y)} (${off.toFixed(1)} px off) on the page turned ${turn}°`);
      out.push(off);
    }
  }
  return Math.max(...out);
}

await run("c11-rotate", [
  {
    title: "setup: Turn.pdf (landscape, portrait, landscape); page 1 at 1/8\" = 1'-0\" with Run R 60 LF, Slab S 800 SF, Posts P 2 EA",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Turn.pdf", buffer: makePdf([{ width: W, height: H, label: "T1" }, { width: 612, height: 792, label: "T2" }, { width: W, height: H, label: "T3" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Turn.pdf"].uuid, [1, 2, 3]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      const sheets = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      pages = Object.fromEntries(sheets.map((s) => [s.page_number, s]));
      const scaled = await apiCall(token, "PUT", `${drawing}/sheet/${pages[1].uuid}/scale`, { feet_per_pt: 1 / 6, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      const make = async (name, type, unit, shapes) => {
        const [first, ...rest] = shapes;
        const made = await apiCall(token, "POST", `${takeoff}/item`, {
          name, type, unit, sheet_uuid: pages[1].uuid,
          geometry: { geom_type: type, vertices_json: first, shape_meta: type === "sf" ? { closed: true } : null, client_uuid: crypto.randomUUID() },
        });
        expect(made.status === 201, `${name}: ${made.status} ${JSON.stringify(made.body)}`);
        for (const more of rest) {
          const added = await apiCall(token, "POST", `${takeoff}/item/${made.body.uuid}/geometry`, { geom_type: type, vertices_json: more, shape_meta: null, client_uuid: crypto.randomUUID(), sheet_uuid: pages[1].uuid });
          expect(added.status === 201 || added.status === 200, `${name} shape: ${added.status} ${JSON.stringify(added.body)}`);
        }
        const d = await detail(made.body.uuid);
        items[name] = { uuid: d.uuid, quantity: d.effective_quantity, geometries: d.geometries.map((g) => ({ uuid: g.uuid, vertices: g.vertices_json })) };
      };
      await make("Run R", "lf", "LF", [[[0.1, 0.5], [0.1 + 360 / W, 0.5]]]);
      const [x0, y0] = [0.55, 0.3];
      await make("Slab S", "sf", "SF", [[[x0, y0], [x0 + 240 / W, y0], [x0 + 240 / W, y0 + 120 / H], [x0, y0 + 120 / H]]]);
      await make("Posts P", "count", "EA", [[[0.3, 0.75]], [[0.8, 0.75]]]);
      const q = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.quantity]));
      expect(Math.abs(q["Run R"] - 60) < 1e-6 && Math.abs(q["Slab S"] - 800) < 1e-6 && q["Posts P"] === 2, `quantities ${JSON.stringify(q)}`);
      return `3 sheets; Run R ${q["Run R"]} LF, Slab S ${q["Slab S"]} SF, Posts P ${q["Posts P"]} EA`;
    },
  },
  {
    title: "before: page 1 unturned, every markup drawn on its feature; the panel rows read",
    run: async ({ page }) => {
      await open(page, 1);
      expect((await pageBox(page).getAttribute("data-page-turn")) === "0", "page 1 opens turned");
      for (const name of Object.keys(items)) await panelRow(page, name).waitFor({ timeout: 15000 });
      const worst = await waitFor(() => markupsOnFeatures(page, 0).catch(() => null), "markups drawn on their features", 15000);
      rowsBefore = {};
      for (const name of Object.keys(items)) rowsBefore[name] = await rowText(page, name);
      return `worst offset ${worst.toFixed(1)} px · rows: ${Object.values(rowsBefore).join(" | ")}`;
    },
  },
  {
    title: "Sheets ⋮ › Rotate Pages… › Landscape, Set to 90°, Apply: \"Rotated 2 pages\", stored 90/0/90; a second window on page 3 turns live, no reload",
    run: async ({ page, context }) => {
      const owner = await fixtureOwner();
      const b = await context.browser().newContext({ viewport: { width: 1440, height: 900 } });
      await recordSockets(b);
      try {
        const bp = await b.newPage();
        await signInAt(bp, APP_B, owner.email, owner.password);
        await enterWorkspace(bp, workspace.uuid);
        await bp.goto(`${APP_B}/project/${project.uuid}/takeoff/${pages[3].uuid}`);
        await pageBox(bp).waitFor({ timeout: 20000 });
        await joinedTopic(bp, `ws:${workspace.uuid}:project:${project.uuid}`);
        const bWas = await pageBox(bp).getAttribute("data-page-turn");

        await open(page, 1);
        await page.getByRole("button", { name: "Panel options" }).click();
        await page.getByRole("menuitem", { name: "Rotate Pages…" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("heading", { name: "Rotate Pages" }).waitFor();
        await dialog.getByLabel("Layout").selectOption("landscape");
        const counts = ((await dialog.locator("[data-rotate-counts]").textContent()) ?? "").trim();
        expect(counts === "2 of 3 pages match · 2 ticked", `counts "${counts}"`);
        await dialog.getByLabel("Set to").selectOption("90");
        const summary = ((await dialog.locator("[data-rotate-summary]").textContent()) ?? "").trim();
        expect(summary === "Rotate 2 pages to 90°.", `summary "${summary}"`);
        const at = Date.now();
        await dialog.getByRole("button", { name: "Apply" }).click();
        await page.getByText("Rotated 2 pages").first().waitFor({ timeout: 10000 });
        const turns = [await sheetRead(1), await sheetRead(2), await sheetRead(3)].map((s) => s.view_rotation);
        expect(turns.join() === "90,0,90", `stored turns ${turns.join()}`);

        await bp.waitForFunction(() => document.querySelector("[data-page-turn]")?.getAttribute("data-page-turn") === "90", null, { timeout: 10000 }).catch(() => {
          throw new Error("window B's page 3 did not turn to 90° within 10 s of Apply in window A");
        });
        const ms = Date.now() - at;
        const reloaded = await bp.evaluate(() => performance.getEntriesByType("navigation").length > 1);
        expect(!reloaded, "window B reloaded");
        return `"${counts}" · "${summary}" · "Rotated 2 pages", stored ${turns.join(", ")} · window B page 3 ${bWas}° → 90° in ${ms} ms, no reload`;
      } finally {
        await b.close();
      }
    },
  },
  {
    title: "after: page 1 draws turned 90°; every markup still on its feature; stored vertices and quantities unchanged; panel rows read the same",
    run: async ({ page }) => {
      await open(page, 1);
      await page.waitForFunction(() => document.querySelector("[data-page-turn]")?.getAttribute("data-page-turn") === "90", null, { timeout: 10000 });
      const box = await svg(page).boundingBox();
      expect(box.height > box.width, `turned page box ${Math.round(box.width)} × ${Math.round(box.height)}: not standing up`);
      const worst = await waitFor(() => markupsOnFeatures(page, 90).catch(() => null), "markups drawn on their features once turned", 15000).catch(async () => markupsOnFeatures(page, 90));
      for (const [name, it] of Object.entries(items)) {
        const d = await detail(it.uuid);
        expect(Math.abs(d.effective_quantity - it.quantity) < 1e-9, `${name}: ${d.effective_quantity}, was ${it.quantity}`);
        const now = Object.fromEntries(d.geometries.map((g) => [g.uuid, JSON.stringify(g.vertices_json)]));
        for (const g of it.geometries) expect(now[g.uuid] === JSON.stringify(g.vertices), `${name}: stored vertices changed`);
      }
      const changed = [];
      for (const name of Object.keys(items)) {
        const now = await rowText(page, name);
        if (now !== rowsBefore[name]) changed.push(`${name}: "${rowsBefore[name]}" → "${now}"`);
      }
      expect(changed.length === 0, `panel rows changed: ${changed.join("; ")}`);
      return `box ${Math.round(box.width)} × ${Math.round(box.height)}, worst offset ${worst.toFixed(1)} px; Run R ${items["Run R"].quantity} LF, Slab S ${items["Slab S"].quantity} SF, Posts P ${items["Posts P"].quantity} EA unchanged`;
    },
  },
  {
    title: "thumbnails: pages 1 and 3 turn to 90°, page 2 stays at 0°",
    run: async ({ page }) => {
      await open(page, 1);
      await page.getByRole("button", { name: "Panel options" }).click();
      await page.getByRole("menuitem", { name: /^Thumbnails/ }).click();
      const turnOf = async (n) => {
        const tile = page.locator(`[data-thumb-tile="${pages[n].uuid}"] [data-thumb-turn]`);
        await tile.waitFor({ timeout: 15000 });
        return tile.getAttribute("data-thumb-turn");
      };
      const t = [await turnOf(1), await turnOf(2), await turnOf(3)];
      // Back to the list, as a person would leave it.
      await page.getByRole("button", { name: "Panel options" }).click();
      await page.getByRole("menuitem", { name: /^List/ }).click();
      expect(t.join() === "90,0,90", `thumbnail turns ${t.join()}`);
      return `thumbnails at ${t.join("°, ")}°`;
    },
  },
]);

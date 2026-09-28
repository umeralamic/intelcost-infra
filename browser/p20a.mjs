// P-20a: Rotate pages. Legacy's "Rotate Pages…", stored in `view_rotation`, followed by
// the canvas, the thumbnails, the measurements and a second window.
//
//   docker compose --profile realtime up -d
//   docker compose --profile browser run --rm browser node scripts/p20a.mjs
//
// The world: "Turn.pdf", three pages: 1 and 3 landscape (1224 × 792 pt), 2 portrait
// (612 × 792). Page 1 is at 1/8" = 1'-0" (1/6 ft per point) with "Run R", a 360 pt run
// across it (60 LF). A viewer is seated to be refused. Nothing assumes the window.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { APP_B, joinedTopic, recordSockets, signInAt, waitFor } from "./lib/realtime.mjs";
import { armMeasure } from "./lib/takeoff.mjs";

const W = 1224;
const H = 792;
const { token, workspace, base } = await freshWorkspace("P-20a rotate");
const project = await makeProject(token, base, { name: "Rotate pages" });
const drawing = `${base}/${project.uuid}/drawing`;
const takeoff = `${base}/${project.uuid}/takeoff`;
let pages; // by page number
let runItem;
let viewer;

const sheetRead = async (n) => (await apiCall(token, "GET", `${drawing}/sheet`)).body.find((s) => s.uuid === pages[n].uuid);
const turn = (updates) => apiCall(token, "PUT", `${drawing}/sheet/rotation`, { sheets: updates });
const pageBox = (page) => page.locator("[data-page-turn]");
const svg = (page) => page.locator('svg[role="presentation"]');

async function open(page, n) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${pages[n].uuid}`);
  await pageBox(page).waitFor({ timeout: 20000 });
}

/** A point of the unturned page, on screen, for a page turned 90° clockwise: page
 *  (x, y) lands at (1 - y, x) of the turned box. */
async function turned90(page, x, y) {
  const box = await svg(page).boundingBox();
  return { x: box.x + box.width * (1 - y), y: box.y + box.height * x };
}

await run("p20a", [
  {
    title: "setup: Turn.pdf, landscape, portrait, landscape; page 1 at 1/8\" = 1'-0\" with Run R (360 pt, 60 LF); a viewer seated",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        {
          name: "Turn.pdf",
          buffer: makePdf([
            { width: W, height: H, label: "T1" },
            { width: 612, height: 792, label: "T2" },
            { width: W, height: H, label: "T3" },
          ]),
          folder: "Plans",
        },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Turn.pdf"].uuid, [1, 2, 3]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      const sheets = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      pages = Object.fromEntries(sheets.map((s) => [s.page_number, s]));
      const scaled = await apiCall(token, "PUT", `${drawing}/sheet/${pages[1].uuid}/scale`, { feet_per_pt: 1 / 6, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      const made = await apiCall(token, "POST", `${takeoff}/item`, {
        name: "Run R", type: "lf", unit: "LF", sheet_uuid: pages[1].uuid,
        geometry: { geom_type: "lf", vertices_json: [[0.1, 0.5], [0.1 + 360 / W, 0.5]], shape_meta: null, client_uuid: crypto.randomUUID() },
      });
      expect(made.status === 201, `item: ${made.status}`);
      runItem = made.body;
      viewer = await seatedMember(token, workspace.uuid, "viewer", "p20a-viewer");
      return `3 sheets; Run R ${runItem.effective_quantity} LF`;
    },
  },
  {
    title: "S1: PUT …/sheet/rotation stores quarter turns in one write; 45 is refused by it and by the PATCH; `rotation` is not writable; a viewer is refused",
    run: async () => {
      const bad = await turn([{ sheet_uuid: pages[1].uuid, view_rotation: 45 }]);
      expect(bad.status === 422, `45 by the bulk call: ${bad.status}`);
      const badPatch = await apiCall(token, "PATCH", `${drawing}/sheet/${pages[1].uuid}`, { view_rotation: 45 });
      expect(badPatch.status === 422, `45 by the PATCH: ${badPatch.status}`);
      const own = await apiCall(token, "PATCH", `${drawing}/sheet/${pages[1].uuid}`, { rotation: 90 });
      const after = await sheetRead(1);
      expect(own.status === 422 || after.rotation === 0, `the PDF's rotation was written: ${own.status}, ${after.rotation}`);
      const refused = await apiCall(viewer.token, "PUT", `${drawing}/sheet/rotation`, { sheets: [{ sheet_uuid: pages[1].uuid, view_rotation: 90 }] });
      expect(refused.status === 403, `viewer: ${refused.status}`);
      const ok = await turn([{ sheet_uuid: pages[1].uuid, view_rotation: 90 }, { sheet_uuid: pages[3].uuid, view_rotation: 270 }]);
      expect(ok.status === 200 && ok.body.length === 2, `turn: ${ok.status} ${JSON.stringify(ok.body)}`);
      expect((await sheetRead(1)).view_rotation === 90 && (await sheetRead(3)).view_rotation === 270, "the turns were not stored");
      const back = await turn([{ sheet_uuid: pages[1].uuid, view_rotation: 0 }, { sheet_uuid: pages[3].uuid, view_rotation: 0 }]);
      expect(back.status === 200, `back: ${back.status}`);
      return `45 → 422 (bulk), ${badPatch.status} (PATCH) · rotation → ${own.status} · viewer → 403 · 90 and 270 stored, then back to 0`;
    },
  },
  {
    title: "S2: \"Rotate Pages…\" under Page layout; All pages + Landscape ticks the two landscape pages; Set to 90° writes only those, \"Rotated 2 pages\"",
    run: async ({ page }) => {
      await open(page, 1);
      await page.getByRole("button", { name: "Panel options" }).click();
      await page.getByRole("menuitem", { name: "Rotate Pages…" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("heading", { name: "Rotate Pages" }).waitFor();
      await dialog.getByText("Turning a page is view only — quantities, deducts and calibration are unchanged.").waitFor();
      const scope = await dialog.getByLabel("Which pages").inputValue();
      expect(scope === "all", `opens on ${scope}`);
      await dialog.getByLabel("Layout").selectOption("landscape");
      const counts = (await dialog.locator("[data-rotate-counts]").textContent()).trim();
      expect(counts === "2 of 3 pages match · 2 ticked", `counts "${counts}"`);
      await dialog.getByLabel("Set to").selectOption("90");
      const summary = (await dialog.locator("[data-rotate-summary]").textContent()).trim();
      expect(summary === "Rotate 2 pages to 90°.", `summary "${summary}"`);
      await dialog.getByLabel("Turn by").selectOption("180");
      const turnWords = (await dialog.locator("[data-rotate-summary]").textContent()).trim();
      expect(turnWords === "Turn 2 pages by 180°.", `turn summary "${turnWords}"`);
      await dialog.getByLabel("Set to").selectOption("90");
      await dialog.getByRole("button", { name: "Apply" }).click();
      await page.getByText("Rotated 2 pages").waitFor({ timeout: 10000 });
      const turns = [await sheetRead(1), await sheetRead(2), await sheetRead(3)].map((s) => s.view_rotation);
      expect(turns.join() === "90,0,90", `stored turns ${turns.join()}`);
      return `opens on All · "${counts}" · "${summary}" · "${turnWords}" · Apply → "Rotated 2 pages", stored ${turns.join(", ")}`;
    },
  },
  {
    title: "S3 AC1, AC3: the turned sheet draws turned and fits the canvas's width; Run R keeps its stored vertices and 60 LF",
    run: async ({ page }) => {
      await open(page, 1);
      await page.waitForFunction(() => document.querySelector("[data-page-turn]")?.getAttribute("data-page-turn") === "90");
      const box = await svg(page).boundingBox();
      const scroller = await page.locator("[data-sheet-scroller]").boundingBox();
      // Turned, the landscape page stands up: taller than wide, by its aspect.
      const ratio = box.height / box.width;
      expect(Math.abs(ratio - W / H) < 0.02, `turned box ${Math.round(box.width)} × ${Math.round(box.height)}, ratio ${ratio.toFixed(3)}`);
      expect(box.width <= scroller.width && box.width > scroller.width * 0.8, `fit: ${Math.round(box.width)} of ${Math.round(scroller.width)}`);
      const transform = await page.locator("[data-page-turn]").evaluate((el) => getComputedStyle(el).transform);
      expect(transform !== "none", "no transform on the turned page");
      const detail = (await apiCall(token, "GET", `${takeoff}/item/${runItem.uuid}`)).body;
      expect(JSON.stringify(detail.geometries[0].vertices_json) === JSON.stringify([[0.1, 0.5], [0.1 + 360 / W, 0.5]]), "Run R's vertices changed");
      expect(Math.abs(detail.effective_quantity - 60) < 1e-6, `Run R ${detail.effective_quantity}`);
      return `turned box ${Math.round(box.width)} × ${Math.round(box.height)} in a ${Math.round(scroller.width)} px canvas · Run R 60 LF, vertices unchanged`;
    },
  },
  {
    title: "S3 AC2: a run drawn on the turned sheet is stored in unturned page space and reads its true length (360 pt, 60 LF)",
    run: async ({ page }) => {
      await open(page, 1);
      await page.waitForFunction(() => document.querySelector("[data-page-turn]")?.getAttribute("data-page-turn") === "90");
      const before = (await apiCall(token, "GET", `${takeoff}/item?sheet_uuid=${pages[1].uuid}`)).body.length;
      await armMeasure(page, "Linear");
      // Across the unturned page at y 0.3: down the screen once turned.
      const a = await turned90(page, 0.2, 0.3);
      const b = await turned90(page, 0.2 + 360 / W, 0.3);
      await page.mouse.click(a.x, a.y);
      await page.mouse.dblclick(b.x, b.y);
      const items = await waitFor(async () => {
        const list = (await apiCall(token, "GET", `${takeoff}/item?sheet_uuid=${pages[1].uuid}`)).body;
        return list.length > before ? list : null;
      }, "the drawn run saved", 10000);
      const drawn = items.find((it) => it.uuid !== runItem.uuid);
      expect(drawn, "no item was drawn");
      const detail = (await apiCall(token, "GET", `${takeoff}/item/${drawn.uuid}`)).body;
      const [[x1, y1], [x2, y2]] = detail.geometries[0].vertices_json;
      expect(Math.abs(y1 - 0.3) < 0.01 && Math.abs(y2 - 0.3) < 0.01, `stored y ${y1.toFixed(4)}, ${y2.toFixed(4)}: not across the unturned page`);
      expect(Math.abs(detail.effective_quantity - 60) / 60 < 0.01, `drawn ${detail.effective_quantity} LF, not 60`);
      return `stored (${x1.toFixed(3)}, ${y1.toFixed(3)}) → (${x2.toFixed(3)}, ${y2.toFixed(3)}) · ${detail.effective_quantity.toFixed(2)} LF`;
    },
  },
  {
    title: "S3 AC1: zoomed past 2.5× on the turned sheet, pdf.js draws only a window, and that window covers the middle of the view",
    run: async ({ page }) => {
      await open(page, 1);
      await page.waitForFunction(() => document.querySelector("[data-page-turn]")?.getAttribute("data-page-turn") === "90");
      await page.locator("[data-sheet-scroller]").click({ position: { x: 5, y: 5 } });
      for (let i = 0; i < 12; i++) {
        const z = Number(await page.locator("[data-sheet-scroller]").getAttribute("data-zoom"));
        if (z >= 4) break;
        await page.keyboard.press("+");
        await page.waitForFunction((was) => Number(document.querySelector("[data-sheet-scroller]")?.getAttribute("data-zoom")) > was, z);
      }
      const zoom = Number(await page.locator("[data-sheet-scroller]").getAttribute("data-zoom"));
      await page.waitForFunction(
        (z) => {
          const c = document.querySelector("canvas[data-sheet-raster]");
          return c && Number(c.dataset.rasterZoom) === z && c.dataset.rasterRes === "1" && c.dataset.rasterWindow === "1";
        },
        zoom,
        { timeout: 30000 },
      );
      const covers = await page.evaluate(() => {
        const view = document.querySelector("[data-sheet-scroller]").getBoundingClientRect();
        const raster = document.querySelector("canvas[data-sheet-raster]").getBoundingClientRect();
        const cx = view.left + view.width / 2;
        const cy = view.top + view.height / 2;
        return raster.left <= cx && cx <= raster.right && raster.top <= cy && cy <= raster.bottom;
      });
      expect(covers, "the windowed raster does not cover the middle of the view");
      return `zoom ${Math.round(zoom * 100)}%: a sharp window, and it covers the view's middle`;
    },
  },
  {
    title: "S3 AC4: the panel's thumbnail turns with the sheet",
    run: async ({ page }) => {
      await open(page, 1);
      await page.getByRole("button", { name: "Panel options" }).click();
      await page.getByRole("menuitem", { name: /^Thumbnails/ }).click();
      const tile = page.locator(`[data-thumb-tile="${pages[1].uuid}"] [data-thumb-turn]`);
      await tile.waitFor();
      const turnAttr = await tile.getAttribute("data-thumb-turn");
      const flat = await page.locator(`[data-thumb-tile="${pages[2].uuid}"] [data-thumb-turn]`).getAttribute("data-thumb-turn");
      expect(turnAttr === "90" && flat === "0", `thumb turns: page 1 ${turnAttr}, page 2 ${flat}`);
      await page.getByRole("button", { name: "Panel options" }).click();
      await page.getByRole("menuitem", { name: /^List/ }).click();
      return `page 1's thumbnail at ${turnAttr}°, page 2's at ${flat}°`;
    },
  },
  {
    title: "S3 AC5: a second window, on the other api process, turns live with no reload",
    run: async ({ page, context }) => {
      const owner = await fixtureOwner();
      const b = await context.browser().newContext();
      await recordSockets(b);
      try {
        const bp = await b.newPage();
        await signInAt(bp, APP_B, owner.email, owner.password);
        await enterWorkspace(bp, workspace.uuid);
        await bp.goto(`${APP_B}/project/${project.uuid}/takeoff/${pages[3].uuid}`);
        await pageBox(bp).waitFor({ timeout: 20000 });
        await joinedTopic(bp, `ws:${workspace.uuid}:project:${project.uuid}`);
        const was = await pageBox(bp).getAttribute("data-page-turn");
        const at = Date.now();
        const sent = await turn([{ sheet_uuid: pages[3].uuid, view_rotation: 180 }]);
        expect(sent.status === 200, `turn: ${sent.status}`);
        await bp.waitForFunction(() => document.querySelector("[data-page-turn]")?.getAttribute("data-page-turn") === "180", null, { timeout: 5000 });
        const ms = Date.now() - at;
        const reloaded = await bp.evaluate(() => performance.getEntriesByType("navigation").length > 1);
        expect(!reloaded, "B reloaded");
        void page;
        return `B's page 3 turned ${was}° → 180° in ${ms} ms, no reload`;
      } finally {
        await b.close();
      }
    },
  },
]);

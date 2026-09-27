// F5-S13: the sheets panel: its tree, search and rows, the thumbnails view, and legacy's
// prerender of the sheets likely to open next (moved here from Block C).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s13.mjs
//
// The world: "Arch.pdf" (8 pages) in Plans/Architectural and "Civil.pdf" (2 pages) in
// Plans, both loaded; the Load mirrors each file's folders and a leaf named after it.
// A-101 is named, calibrated and carries two items; page 2 is bookmarked. Nothing is
// assumed about the window: rows are found by their sheet, not their position.

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S13 panel");
const project = await makeProject(token, base, { name: "Panel" });
const drawing = `${base}/${project.uuid}/drawing`;
const takeoff = `${base}/${project.uuid}/takeoff`;
let arch; // sheets of Arch.pdf by page
let civil;
let folders; // by name
const SCALE = `1/8" = 1'-0"`;

const row = (page, sheet) => page.locator(`[data-sheet-row="${sheet.uuid}"]`);
const panel = (page) => page.locator("[data-sheets-panel]");
const drawn = (page, sheetUuid, timeout = 60000) =>
  page.waitForFunction(
    (uuid) => {
      const c = document.querySelector("canvas[data-sheet-raster]");
      return c && c.dataset.rasterKey?.startsWith(uuid) && c.dataset.rasterRes === "1";
    },
    sheetUuid,
    { timeout },
  );

async function open(page, sheet) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await row(page, sheet).waitFor({ timeout: 20000 });
}

async function item(sheet, name, at) {
  const made = await apiCall(token, "POST", `${takeoff}/item`, {
    name,
    type: "count",
    unit: "EA",
    sheet_uuid: sheet.uuid,
    geometry: { geom_type: "count", vertices_json: [at], shape_meta: null, client_uuid: crypto.randomUUID() },
  });
  expect(made.status === 201, `item ${name}: ${made.status} ${JSON.stringify(made.body)}`);
}

await run("f5-s13", [
  {
    title: "setup: Arch.pdf (8 pages) in Plans/Architectural and Civil.pdf (2) in Plans, loaded; A-101 named, scaled, two items; page 2 bookmarked",
    run: async ({ page }) => {
      const files = await uploadAll(
        page,
        token,
        base,
        project.uuid,
        [
          { name: "Arch.pdf", buffer: makePdf(letterPages(8, "Arch")), folder: "Plans/Architectural" },
          { name: "Civil.pdf", buffer: makePdf(letterPages(2, "Civil")), folder: "Plans" },
        ],
        workspace.uuid,
      );
      const loaded = await loadPages(token, base, project.uuid, [
        [files["Arch.pdf"].uuid, [1, 2, 3, 4, 5, 6, 7, 8]],
        [files["Civil.pdf"].uuid, [1, 2]],
      ]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      const byFile = Object.fromEntries(loaded.body.files.map((f) => [f.project_file_uuid, f.file_uuid]));
      const byPage = (list) => Object.fromEntries(list.map((s) => [s.page_number, s]));
      arch = byPage(await preparedSheets(token, base, project.uuid, byFile[files["Arch.pdf"].uuid]));
      civil = byPage(await preparedSheets(token, base, project.uuid, byFile[files["Civil.pdf"].uuid]));

      const named = await apiCall(token, "PATCH", `${drawing}/sheet/${arch[1].uuid}`, { sheet_number: "A-101", sheet_name: "Foundation Plan" });
      expect(named.status === 200, `rename: ${named.status}`);
      const marked = await apiCall(token, "PATCH", `${drawing}/sheet/${arch[2].uuid}`, { is_bookmarked: true });
      expect(marked.status === 200, `bookmark: ${marked.status}`);
      const scaled = await apiCall(token, "PUT", `${drawing}/sheet/${arch[1].uuid}/calibration`, {
        p1_x_norm: 0.1, p1_y_norm: 0.5, p2_x_norm: 0.9, p2_y_norm: 0.5, real_distance_ft: 80, label: SCALE,
      });
      expect(scaled.status === 200, `calibrate: ${scaled.status}`);
      await item(arch[1], "Door D1", [0.3, 0.3]);
      await item(arch[1], "Window W2", [0.6, 0.3]);

      const listed = await apiCall(token, "GET", `${drawing}/folder`);
      folders = Object.fromEntries(listed.body.map((f) => [f.name, f]));
      expect(folders.Plans && folders.Architectural && folders.Arch && folders.Civil, `folders: ${Object.keys(folders).join(", ")}`);
      return `10 sheets; folders ${Object.keys(folders).join(", ")}`;
    },
  },
  {
    title: "AC1: sheets nest under the mirrored folders, the open sheet's row is highlighted and follows a click; a sheet moved out of every folder sits \"At root\"",
    run: async ({ page }) => {
      await open(page, arch[3]);
      const nested = page.locator(
        `[data-folder="${folders.Plans.uuid}"] [data-folder="${folders.Architectural.uuid}"] [data-folder="${folders.Arch.uuid}"] [data-sheet-row="${arch[3].uuid}"]`,
      );
      expect((await nested.count()) === 1, "page 3 of Arch.pdf is not under Plans / Architectural / Arch");
      const civilNested = page.locator(`[data-folder="${folders.Plans.uuid}"] [data-folder="${folders.Civil.uuid}"] [data-sheet-row="${civil[1].uuid}"]`);
      expect((await civilNested.count()) === 1, "Civil page 1 is not under Plans / Civil");
      expect((await row(page, arch[3]).getAttribute("data-active")) === "1", "the open sheet's row is not highlighted");
      expect((await page.locator('[data-sheet-row][data-active="1"]').count()) === 1, "more than one row highlighted");

      await row(page, civil[1]).getByRole("button", { name: "Page 1" }).click();
      await page.waitForURL(new RegExp(`/takeoff/${civil[1].uuid}$`));
      await page.waitForFunction((u) => document.querySelector(`[data-sheet-row="${u}"]`)?.dataset.active === "1", civil[1].uuid);
      expect((await row(page, arch[3]).getAttribute("data-active")) === "0", "the old row stayed highlighted");

      // Out of every folder, from the api: the panel follows the event, no reload.
      const moved = await apiCall(token, "PUT", `${drawing}/sheet/order`, { folder_uuid: null, sheet_uuids: [civil[2].uuid] });
      expect(moved.status === 200, `order: ${moved.status} ${JSON.stringify(moved.body)}`);
      const atRoot = panel(page).getByText("At root", { exact: true });
      await atRoot.waitFor({ timeout: 10000 });
      const rootRow = await page.evaluate((u) => {
        const r = document.querySelector(`[data-sheet-row="${u}"]`);
        return Boolean(r && !r.closest("[data-folder]"));
      }, civil[2].uuid);
      expect(rootRow, "the moved sheet is still inside a folder");
      return "Plans / Architectural / Arch / page 3 · Plans / Civil · highlight followed the click · \"At root\" holds the moved sheet, live";
    },
  },
  {
    title: "AC2: \"Search sheets…\" matches number, name and item names; no match reads No sheets match \"{q}\"",
    run: async ({ page }) => {
      await open(page, arch[3]);
      const search = page.getByPlaceholder("Search sheets…");
      const visible = () => page.locator("[data-sheet-row]").evaluateAll((rows) => rows.map((r) => r.dataset.sheetRow));
      const cases = [
        ["a-101", "number"],
        ["foundation", "name"],
        ["window w2", "an item's name"],
      ];
      const seen = [];
      for (const [q, what] of cases) {
        await search.fill(q);
        await page.waitForFunction(() => document.querySelectorAll("[data-sheet-row]").length === 1);
        const rows = await visible();
        expect(rows.length === 1 && rows[0] === arch[1].uuid, `"${q}" (${what}) shows ${rows.length} rows`);
        seen.push(`"${q}" → A-101`);
      }
      await search.fill("zzz no such");
      await panel(page).getByText('No sheets match "zzz no such"').waitFor({ timeout: 5000 });
      expect((await visible()).length === 0, "rows still shown for a query with no match");
      await page.getByRole("button", { name: "Clear search" }).click();
      await page.waitForFunction(() => document.querySelectorAll("[data-sheet-row]").length === 10);
      return `${seen.join(" · ")} · "zzz no such" → No sheets match · cleared: 10 rows`;
    },
  },
  {
    title: "AC3: rows show their label (\"A-101  –  Foundation Plan\", else \"Page 3\"), the scale chip or none, the item count, the bookmark star",
    run: async ({ page }) => {
      await open(page, arch[3]);
      const a101 = row(page, arch[1]);
      // The text, not its rendering: HTML collapses legacy's two spaces on screen, as
      // legacy's own panel did.
      const label = (r) => r.locator("button").first().textContent();
      expect((await label(a101)) === "A-101  –  Foundation Plan", `A-101 reads "${await label(a101)}"`);
      expect((await label(row(page, arch[3]))) === "Page 3", `page 3 reads "${await label(row(page, arch[3]))}"`);
      const chip = await a101.locator("[data-scale-chip]").innerText();
      expect(chip === SCALE.replace(/\s+/g, ""), `scale chip "${chip}"`);
      expect((await row(page, arch[3]).locator("[data-scale-chip]").count()) === 0, "an unscaled sheet has a chip");
      const count = await a101.locator("[data-item-count]").getAttribute("data-item-count");
      expect(count === "2", `item count ${count}`);
      expect((await row(page, arch[3]).locator("[data-item-count]").count()) === 0, "a sheet with no items shows a count");
      expect((await row(page, arch[2]).getByLabel("Bookmarked").count()) === 1, "page 2 has no star");
      expect((await a101.getByLabel("Bookmarked").count()) === 0, "A-101 has a star");
      return `"A-101  –  Foundation Plan" · "Page 3" · chip ${chip} · 2 items · star on page 2 only`;
    },
  },
  {
    title: "AC4: Thumbnails view shows the worker's thumbnails, each fetched only once its tile is scrolled into view",
    run: async ({ page }) => {
      const assets = await apiCall(token, "GET", `${drawing}/asset`);
      const thumbPath = new Map(assets.body.filter((a) => a.thumbnail_url).map((a) => [new URL(a.thumbnail_url).pathname, a.sheet_uuid]));
      const fetched = new Set();
      page.on("request", (r) => {
        const sheet = thumbPath.get(new URL(r.url()).pathname);
        if (sheet) fetched.add(sheet);
      });
      await open(page, arch[1]);
      await page.getByRole("button", { name: "Panel options" }).click();
      await page.getByRole("menuitem", { name: /^Thumbnails/ }).click();
      await page.locator("[data-thumb-tile]").first().waitFor();
      await page.waitForFunction(() => document.querySelector('[data-thumb-loaded="1"] img')?.complete);

      // Nothing beyond the list's visible edge (plus the 100 px look-ahead) is loaded.
      const state = await page.evaluate(() => {
        const list = document.querySelector("[data-sheets-panel] .overflow-y-auto");
        const edge = list.getBoundingClientRect().bottom + 100;
        const tiles = [...document.querySelectorAll("[data-thumb-tile]")];
        return tiles.map((t) => ({
          sheet: t.dataset.thumbTile,
          loaded: t.querySelector("[data-thumb-loaded]").dataset.thumbLoaded === "1",
          below: t.getBoundingClientRect().top > edge,
        }));
      });
      const below = state.filter((t) => t.below);
      expect(below.length > 0, "every tile fits the list; the fixture needs more sheets than the panel shows");
      expect(below.every((t) => !t.loaded), `${below.filter((t) => t.loaded).length} tiles below the fold loaded`);
      const loadedFirst = state.filter((t) => t.loaded).map((t) => t.sheet);
      expect(loadedFirst.every((s) => fetched.has(s)) && [...fetched].every((s) => loadedFirst.includes(s)), `fetched ${fetched.size}, shown ${loadedFirst.length}`);

      // Scroll the last tile into view: it loads then, and not before.
      const last = state.at(-1).sheet;
      expect(!fetched.has(last), "the last thumbnail was fetched before it was in view");
      await page.locator(`[data-thumb-tile="${last}"]`).scrollIntoViewIfNeeded();
      await page.waitForFunction((s) => document.querySelector(`[data-thumb-tile="${s}"] [data-thumb-loaded="1"] img`)?.complete, last);
      expect(fetched.has(last), "the last thumbnail never fetched");
      const title = await page.locator("[data-thumb-tile]").first().getAttribute("title");
      await page.getByRole("button", { name: "Panel options" }).click();
      await page.getByRole("menuitem", { name: /^List/ }).click();
      return `${state.length} tiles: ${loadedFirst.length} fetched on open, ${below.length} below the fold waited; the last fetched on scroll · tile title "${title}"`;
    },
  },
  {
    title: "Prerender (legacy's, from Block C): the next sheet is drawn while idle, after the open one paints, so opening it is sharp at once with no fit image and no second open",
    run: async ({ page }) => {
      const splits = [];
      const fits = [];
      page.on("request", (r) => {
        const m = r.url().match(/\/pages\/[^/?]+\/(\d+)/);
        if (m) splits.push({ page: Number(m[1]), at: Date.now() });
        if (/\/fit\.webp/.test(r.url())) fits.push(r.url());
      });
      await open(page, arch[4]);
      await drawn(page, arch[4].uuid);
      const painted = Date.now();
      // The neighbours in panel order are pages 3 and 5; the next one first.
      await page.waitForFunction(() => (window.__intelcostPdf?.().prerender.bySource.neighbour ?? 0) >= 2, null, { timeout: 30000 });
      const neighbourSplits = splits.filter((s) => s.page === 3 || s.page === 5);
      expect(neighbourSplits.length === 2, `neighbour split fetches: ${JSON.stringify(neighbourSplits)}`);
      const fitsBefore = fits.length;
      const fivesBefore = splits.filter((s) => s.page === 5).length;

      await row(page, arch[5]).getByRole("button", { name: "Page 5" }).click();
      await drawn(page, arch[5].uuid);
      const skipped = await page.locator("[data-fit-skipped]").getAttribute("data-fit-skipped");
      const firstPaint = await page.evaluate(() => window.__intelcostPerf.samples().filter((s) => s.label === "canvas:first-paint").at(-1)?.ms);
      // Opening page 5 queues its own neighbours (4, open already, and 6): only page 5's
      // own PDF must not be fetched again.
      const fives = splits.filter((s) => s.page === 5).length - fivesBefore;
      expect(skipped === "1", "page 5 showed the fit image: it was not drawn ahead");
      expect(fits.length === fitsBefore, `page 5 fetched ${fits.length - fitsBefore} fit image(s)`);
      expect(fives === 0, `page 5's PDF fetched ${fives} more time(s)`);
      return `neighbours 3 and 5 fetched after the first paint (${neighbourSplits.map((s) => `+${s.at - painted} ms`).join(", ")}) · page 5: fit skipped, its PDF not fetched again, first pdf.js paint ${firstPaint} ms`;
    },
  },
  {
    title: "Prerender on hover: a row held 150 ms is drawn ahead; opening it is a cache hit",
    run: async ({ page }) => {
      const sevens = [];
      page.on("request", (r) => /\/pages\/[^/?]+\/7(\?|$)/.test(r.url()) && sevens.push(r.url()));
      await open(page, arch[1]);
      await drawn(page, arch[1].uuid);
      await page.waitForFunction(() => (window.__intelcostPdf?.().prerender.bySource.neighbour ?? 0) >= 1, null, { timeout: 30000 });
      const target = arch[7];
      expect(sevens.length === 0, "page 7 was fetched before it was hovered");
      await row(page, target).getByRole("button", { name: "Page 7" }).hover();
      await page.waitForFunction(() => (window.__intelcostPdf?.().prerender.bySource.hover ?? 0) >= 1, null, { timeout: 30000 });
      expect(sevens.length === 1, `hovering fetched page 7 ${sevens.length} times`);
      await row(page, target).getByRole("button", { name: "Page 7" }).click();
      await drawn(page, target.uuid);
      const skipped = await page.locator("[data-fit-skipped]").getAttribute("data-fit-skipped");
      expect(skipped === "1", "page 7 showed the fit image after a hover");
      expect(sevens.length === 1, `opening page 7 fetched its PDF again (${sevens.length} fetches)`);
      return "page 7 untouched until hovered; hovered, it was drawn ahead; opened with no fit image and no second fetch";
    },
  },
]);

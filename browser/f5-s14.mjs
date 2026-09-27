// F5-S14: rename, reorder, bookmark, move and delete in the sheets panel (D-48).
//
//   docker compose --profile realtime up -d
//   docker compose --profile browser run --rm browser node scripts/f5-s14.mjs
//
// Window B is the run's owner in a second browser, on app-b and api-b: what A does
// reaches B across Redis, with no reload. The world: "Arch.pdf" (6 pages) in
// Plans/Architectural and "Civil.pdf" (2 pages) in Plans, loaded; page 1 of Arch
// carries two items that live nowhere else.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { APP_B, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S14 acts");
const project = await makeProject(token, base, { name: "Acts" });
const drawing = `${base}/${project.uuid}/drawing`;
const takeoff = `${base}/${project.uuid}/takeoff`;
const estimate = `${base}/${project.uuid}/estimate/line`;
let arch;
let civil;
const doomedItems = [];

const row = (page, sheet) => page.locator(`[data-sheet-row="${sheet.uuid}"]`);
const label = (page, sheet) => row(page, sheet).locator("[data-sheet-label]");
const url = (app, sheet) => `${app}/project/${project.uuid}/takeoff/${sheet.uuid}`;
const panelOrder = (page) => page.locator("[data-sheet-row]").evaluateAll((rows) => rows.map((r) => r.dataset.sheetRow));
const apiSheets = async () => (await apiCall(token, "GET", `${drawing}/sheet`)).body;
const folderSheets = async (fileUuid) =>
  (await apiSheets()).filter((s) => s.file_uuid === fileUuid).sort((a, b) => a.sort_order - b.sort_order || a.page_number - b.page_number);

async function open(page, sheet, app = APP, email) {
  if (app === APP) await signInAs(page, email ?? (await fixtureOwner()).email);
  else await signInAt(page, app, email ?? (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(url(app, sheet));
  await row(page, sheet).waitFor({ timeout: 20000 });
}

async function select(page, sheets, how = "Control") {
  for (const sheet of sheets) await label(page, sheet).click({ modifiers: [how] });
}

async function selectionMenu(page, sheet) {
  await label(page, sheet).click({ button: "right" });
  await page.getByRole("menu").waitFor();
}

await run("f5-s14", [
  {
    title: "setup: Arch.pdf (6 pages) and Civil.pdf (2), loaded and prepared; two items on Arch page 1",
    run: async ({ page }) => {
      const files = await uploadAll(
        page,
        token,
        base,
        project.uuid,
        [
          { name: "Arch.pdf", buffer: makePdf(letterPages(6, "Arch")), folder: "Plans/Architectural" },
          { name: "Civil.pdf", buffer: makePdf(letterPages(2, "Civil")), folder: "Plans" },
        ],
        workspace.uuid,
      );
      const loaded = await loadPages(token, base, project.uuid, [
        [files["Arch.pdf"].uuid, [1, 2, 3, 4, 5, 6]],
        [files["Civil.pdf"].uuid, [1, 2]],
      ]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      const byFile = Object.fromEntries(loaded.body.files.map((f) => [f.project_file_uuid, f.file_uuid]));
      const byPage = (list) => Object.fromEntries(list.map((s) => [s.page_number, s]));
      arch = byPage(await preparedSheets(token, base, project.uuid, byFile[files["Arch.pdf"].uuid]));
      civil = byPage(await preparedSheets(token, base, project.uuid, byFile[files["Civil.pdf"].uuid]));
      for (const [name, at] of [["Door D1", [0.3, 0.3]], ["Window W2", [0.6, 0.3]]]) {
        const made = await apiCall(token, "POST", `${takeoff}/item`, {
          name, type: "count", unit: "EA", sheet_uuid: arch[1].uuid,
          geometry: { geom_type: "count", vertices_json: [at], shape_meta: null, client_uuid: crypto.randomUUID() },
        });
        expect(made.status === 201, `item ${name}: ${made.status}`);
        doomedItems.push(made.body.uuid);
      }
      // Reading the estimate gives each measured item its line (D-09).
      const lines = (await apiCall(token, "GET", estimate)).body;
      const priced = lines.filter((l) => doomedItems.includes(l.takeoff_item_uuid)).length;
      expect(priced === 2, `${priced} estimate lines for the two items`);
      return "8 sheets; Door D1 and Window W2 on Arch page 1, each with its estimate line";
    },
  },
  {
    title: "AC1: double-click renames with \"A-101\" and \"Sheet name\" fields; Save persists; B's panel follows (drawing.sheet.changed)",
    run: async ({ page, context }) => {
      const b = await secondWindow(context);
      try {
        await open(b.page, arch[4], APP_B);
        await open(page, arch[4]);
        await label(page, arch[2]).dblclick();
        const form = page.locator(`[data-rename-form="${arch[2].uuid}"]`);
        await form.getByPlaceholder("A-101").fill("A-201");
        await form.getByPlaceholder("Sheet name").fill("Roof Plan");
        const saved = Date.now();
        await form.getByRole("button", { name: "Save" }).click();
        await page.waitForFunction((u) => document.querySelector(`[data-sheet-row="${u}"] button`)?.textContent === "A-201  –  Roof Plan", arch[2].uuid);
        const persisted = (await apiSheets()).find((s) => s.uuid === arch[2].uuid);
        expect(persisted.sheet_number === "A-201" && persisted.sheet_name === "Roof Plan", `api reads ${persisted.sheet_number} / ${persisted.sheet_name}`);
        await b.page.waitForFunction((u) => document.querySelector(`[data-sheet-row="${u}"] button`)?.textContent === "A-201  –  Roof Plan", arch[2].uuid, { timeout: 10000 });
        const followed = Date.now() - saved;
        expect(!(await b.page.evaluate(() => performance.getEntriesByType("navigation").length > 1)), "B reloaded");
        return `A: "A-201  –  Roof Plan", persisted · B's panel followed in ${followed} ms, no reload`;
      } finally {
        await b.context.close();
      }
    },
  },
  {
    title: "AC2: drag reorders within a folder, persisted; Thumbnails view says \"Switch to List view to reorder pages\" and does not drag",
    run: async ({ page }) => {
      await open(page, arch[1]);
      const before = (await folderSheets(arch[1].file_uuid)).map((s) => s.page_number);
      // Page 5 dropped on the top half of page 2: it lands before it.
      const target = row(page, arch[2]);
      const box = await target.boundingBox();
      await row(page, arch[5]).dragTo(target, { targetPosition: { x: box.width / 2, y: 2 } });
      const want = [1, 5, 2, 3, 4, 6];
      // The panel's order of Arch's rows, as the page shows it.
      await page.waitForFunction(
        (ids) => {
          const shown = [...document.querySelectorAll("[data-sheet-row]")].map((r) => r.dataset.sheetRow).filter((u) => ids.includes(u));
          return shown.join() === ids.join();
        },
        want.map((p) => arch[p].uuid),
        { timeout: 10000 },
      );
      const after = (await folderSheets(arch[1].file_uuid)).map((s) => s.page_number);
      expect(after.join() === want.join(), `api order ${after.join()} (before ${before.join()})`);
      const civilOrder = (await folderSheets(civil[1].file_uuid)).map((s) => s.page_number);
      expect(civilOrder.join() === "1,2", `another folder moved: ${civilOrder.join()}`);

      await page.getByRole("button", { name: "Panel options" }).click();
      await page.getByRole("menuitem", { name: /^Thumbnails/ }).click();
      const tile = page.locator(`[data-thumb-tile="${arch[3].uuid}"]`);
      await tile.waitFor();
      const title = await tile.getAttribute("title");
      expect(title === "Switch to List view to reorder pages", `tile title "${title}"`);
      const draggable = await row(page, arch[3]).getAttribute("draggable");
      expect(draggable === "false", `a thumbnail row is draggable (${draggable})`);
      await page.getByRole("button", { name: "Panel options" }).click();
      await page.getByRole("menuitem", { name: /^List/ }).click();
      return `Arch ${before.join(",")} → ${after.join(",")} (page 5 before page 2), persisted; Civil untouched · Thumbnails: "${title}", not draggable`;
    },
  },
  {
    title: "AC4: Ctrl and Shift select; the selection's menu bookmarks and moves all of them",
    run: async ({ page }) => {
      await open(page, arch[1]);
      // Ctrl: two rows, then Shift from the last to page 6 widens to a range.
      await select(page, [arch[3], arch[4]]);
      let checked = await page.locator('[data-sheet-row][data-checked="1"]').count();
      expect(checked === 2, `Ctrl selected ${checked}`);
      await label(page, arch[6]).click({ modifiers: ["Shift"] });
      const ranged = await page.locator('[data-sheet-row][data-checked="1"]').evaluateAll((rows) => rows.map((r) => r.dataset.sheetRow));
      const wantRange = [arch[4], arch[6]].map((s) => s.uuid);
      expect(wantRange.every((u) => ranged.includes(u)) && !ranged.includes(arch[3].uuid) && ranged.length === 2, `Shift from page 4 to page 6 selected ${ranged.length}`);
      await label(page, arch[3]).click({ modifiers: ["Control"] });
      checked = await page.locator('[data-sheet-row][data-checked="1"]').count();
      expect(checked === 3, `after Ctrl on page 3: ${checked}`);

      await selectionMenu(page, arch[4]);
      await page.getByRole("menu").getByText("3 sheets selected").waitFor();
      await page.getByRole("menuitem", { name: "Bookmark selected" }).click();
      await page.waitForFunction(
        (ids) => ids.every((u) => document.querySelector(`[data-sheet-row="${u}"] [aria-label="Bookmarked"]`)),
        [arch[3].uuid, arch[4].uuid, arch[6].uuid],
        { timeout: 10000 },
      );
      const marked = (await apiSheets()).filter((s) => s.is_bookmarked).map((s) => s.uuid).sort();
      expect(marked.join() === [arch[3].uuid, arch[4].uuid, arch[6].uuid].sort().join(), `bookmarked in the api: ${marked.length}`);

      // Still selected: move all three out of every folder.
      await selectionMenu(page, arch[4]);
      await page.getByRole("menuitem", { name: "Root" }).click();
      await page.getByText("At root", { exact: true }).waitFor({ timeout: 10000 });
      // The panel moves the rows at once and the write lands after, so the api is asked
      // until it agrees, not the moment the rows move.
      const rootPages = async () => (await apiSheets()).filter((s) => s.folder_uuid === null).map((s) => s.page_number).sort().join();
      await waitFor(async () => (await rootPages()) === "3,4,6", "pages 3, 4 and 6 at root in the api", 10000);
      const atRoot = await rootPages();
      expect(atRoot === "3,4,6", `at root in the api: pages ${atRoot}`);
      const cleared = await page.locator('[data-sheet-row][data-checked="1"]').count();
      expect(cleared === 0, `${cleared} still selected after the move`);
      return "Ctrl 2, Shift range 2, Ctrl +1 = 3 · \"3 sheets selected\": Bookmark selected (3 stars, api), Move selected to Root (\"At root\", api)";
    },
  },
  {
    title: "AC3: \"Delete 2 sheets?\" names what goes, item counts included, and ends \"This cannot be undone.\"; after, \"Deleted 2 sheets\"; B follows",
    run: async ({ page, context }) => {
      const b = await secondWindow(context);
      try {
        await open(b.page, civil[1], APP_B);
        await open(page, arch[1]);
        await select(page, [arch[1], arch[2]]);
        await selectionMenu(page, arch[1]);
        await page.getByRole("menuitem", { name: "Delete selected pages" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        const title = await dialog.locator("h2").textContent();
        const body = await dialog.locator("#confirm-consequence").textContent();
        expect(title === "Delete 2 sheets?", `title "${title}"`);
        expect(body.includes("This removes 2 pages and every measurement, highlight, note and snapshot on them."), `body: ${body}`);
        expect(body.includes("2 items lose their measurements on these pages."), `item count missing: ${body}`);
        expect(body.includes("will be deleted entirely: Door D1, Window W2."), `names missing: ${body}`);
        expect(body.endsWith("This cannot be undone."), `does not end "This cannot be undone.": ${body}`);
        await dialog.getByRole("button", { name: "Delete 2 sheets" }).click();
        await page.getByText("Deleted 2 sheets", { exact: true }).waitFor({ timeout: 15000 });

        // The open sheet was one of them: on to the nearest sheet left.
        await page.waitForURL((u) => !u.pathname.endsWith(arch[1].uuid), { timeout: 10000 });
        const left = await apiSheets();
        expect(!left.some((s) => s.uuid === arch[1].uuid || s.uuid === arch[2].uuid), "a deleted sheet is still listed");
        const items = (await apiCall(token, "GET", `${takeoff}/item`)).body;
        expect(!items.some((i) => i.name === "Door D1" || i.name === "Window W2"), "an item with no shape left survived");
        // D-50: their estimate lines went with them. No line keeps a quantity that
        // nothing measures, not even one naming where it came from.
        const lines = (await apiCall(token, "GET", estimate)).body;
        const outlived = lines.filter((l) => doomedItems.includes(l.origin_takeoff_item_uuid) || doomedItems.includes(l.takeoff_item_uuid));
        expect(outlived.length === 0, `${outlived.length} estimate lines outlived their items: ${JSON.stringify(outlived.map((l) => [l.description, l.quantity]))}`);
        expect(lines.every((l) => l.takeoff_item_uuid || l.is_manual), "a line with no item that is not a typed line");
        await b.page.waitForFunction((ids) => ids.every((u) => !document.querySelector(`[data-sheet-row="${u}"]`)), [arch[1].uuid, arch[2].uuid], { timeout: 10000 });
        return `"${title}" · ${body} · toast "Deleted 2 sheets" · A moved on to the next sheet · items and their estimate lines gone in the api (D-50) · B's panel dropped both rows`;
      } finally {
        await b.context.close();
      }
    },
  },
  {
    title: "A viewer sees the panel and opens sheets, but cannot rename, reorder or delete, on screen or at the api",
    run: async ({ page }) => {
      const viewer = await seatedMember(token, workspace.uuid, "viewer");
      await open(page, civil[1], APP, viewer.email);
      expect((await page.locator("[data-add-sheets]").count()) === 0, "a viewer sees Add sheets");
      expect((await row(page, civil[2]).getAttribute("draggable")) === "false", "a viewer's row is draggable");
      await label(page, civil[2]).dblclick();
      expect((await page.locator("[data-rename-form]").count()) === 0, "a viewer's double-click opened the rename form");
      await page.waitForURL((u) => u.pathname.endsWith(civil[2].uuid));
      await label(page, civil[2]).click({ button: "right" });
      const rename = page.getByRole("menuitem", { name: /Properties \(rename\)/ });
      expect((await rename.getAttribute("aria-disabled")) === "true", "Properties (rename) is enabled for a viewer");
      await page.keyboard.press("Escape");
      const patch = await apiCall(viewer.token, "PATCH", `${drawing}/sheet/${civil[2].uuid}`, { sheet_name: "Nope" });
      const order = await apiCall(viewer.token, "PUT", `${drawing}/sheet/order`, { folder_uuid: null, sheet_uuids: [civil[2].uuid] });
      const del = await apiCall(viewer.token, "POST", `${drawing}/sheet/delete`, { sheet_uuids: [civil[2].uuid] });
      expect([patch.status, order.status, del.status].every((s) => s === 403), `api answered ${patch.status}, ${order.status}, ${del.status}`);
      return `no Add sheets, no drag, no rename form (the double-click opened the sheet), Properties disabled "View only" · api 403 ×3`;
    },
  },
]);

// F5 follow-up (a), the founder's finding of 2026-09-27: the sheets panel lists the
// measurements under each sheet row, as legacy's `SheetItemList` does.
//
//   docker compose --profile browser run --rm browser node scripts/f5-sheet-items.mjs
//
// The world: "Items.pdf", two landscape pages (1224 × 792 pt) in Plans, both loaded.
// Page 1 is set to 1/8" = 1'-0" (1/6 ft per point) and carries "Wall A", a 360 pt run
// (60 LF), and "Beam B", a 180 pt run (30 LF). Page 2 has no scale and carries "Door D1",
// two marks (2 EA: a count needs no scale). Rows are found by their sheet, never their
// position, and nothing is assumed about the window.

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";

const W = 1224;
const H = 792;
const { token, workspace, base } = await freshWorkspace("F5 sheet items");
const project = await makeProject(token, base, { name: "Sheet items" });
const drawing = `${base}/${project.uuid}/drawing`;
const takeoff = `${base}/${project.uuid}/takeoff`;
let p1;
let p2;
const made = {};

const row = (page, sheet) => page.locator(`[data-sheet-row="${sheet.uuid}"]`);
const toggle = (page, sheet) => page.locator(`[data-sheet-items-toggle="${sheet.uuid}"]`);
const list = (page, sheet) => page.locator(`[data-sheet-items="${sheet.uuid}"]`);
const itemRow = (page, sheet, uuid) => list(page, sheet).locator(`[data-sheet-item="${uuid}"]`);
const options = async (page, label) => {
  await page.getByRole("button", { name: "Panel options" }).click();
  await page.getByRole("menuitem", { name: new RegExp(`^${label.replace(/[>()]/g, "\\$&")}`) }).click();
};

async function open(page, sheet) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await row(page, sheet).waitFor({ timeout: 20000 });
}

async function item(sheet, name, type, vertices) {
  const res = await apiCall(token, "POST", `${takeoff}/item`, {
    name,
    type,
    unit: type === "count" ? "EA" : "LF",
    sheet_uuid: sheet.uuid,
    geometry: { geom_type: type, vertices_json: vertices, shape_meta: null, client_uuid: crypto.randomUUID() },
  });
  expect(res.status === 201, `item ${name}: ${res.status} ${JSON.stringify(res.body)}`);
  made[name] = res.body.uuid;
}

const qtyOf = async (page, sheet, uuid) =>
  (await itemRow(page, sheet, uuid).locator("[data-sheet-item-qty]").textContent()).trim();

await run("f5-sheet-items", [
  {
    title: "setup: Items.pdf, two landscape pages; page 1 at 1/8\" = 1'-0\" with Wall A (360 pt) and Beam B (180 pt); page 2 unscaled with Door D1 (2 marks)",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Items.pdf", buffer: makePdf([{ width: W, height: H, label: "I1" }, { width: W, height: H, label: "I2" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Items.pdf"].uuid, [1, 2]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      const sheets = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      [p1, p2] = [1, 2].map((n) => sheets.find((s) => s.page_number === n));
      const scaled = await apiCall(token, "PUT", `${drawing}/sheet/${p1.uuid}/scale`, { feet_per_pt: 1 / 6, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      await item(p1, "Wall A", "lf", [[0.1, 0.5], [0.1 + 360 / W, 0.5]]);
      await item(p1, "Beam B", "lf", [[0.1, 0.7], [0.1 + 180 / W, 0.7]]);
      await item(p2, "Door D1", "count", [[0.3, 0.3], [0.6, 0.3]]);
      const listed = await apiCall(token, "GET", `${drawing}/sheet/items`);
      const byName = Object.fromEntries(listed.body.flatMap((s) => s.items.map((i) => [i.name, { ...i, sheet: s.sheet_uuid }])));
      expect(byName["Wall A"].quantity.toFixed(2) === "60.00" && byName["Wall A"].unit === "LF", `api Wall A ${JSON.stringify(byName["Wall A"])}`);
      expect(byName["Door D1"].quantity === 2 && byName["Door D1"].sheet === p2.uuid, `api Door D1 ${JSON.stringify(byName["Door D1"])}`);
      return `api: Wall A ${byName["Wall A"].quantity} LF, Beam B ${byName["Beam B"].quantity} LF on page 1; Door D1 ${byName["Door D1"].quantity} EA on page 2 (unscaled)`;
    },
  },
  {
    title: "AC1: a row with measurements has legacy's chevron, \"Show items on this sheet\"; it lists them with this sheet's quantity, and folds again",
    run: async ({ page }) => {
      await open(page, p1);
      // Page (Default): sheets are closed until asked.
      expect((await list(page, p1).count()) === 0, "page 1's items are showing before the chevron");
      expect((await toggle(page, p1).getAttribute("title")) === "Show items on this sheet", `title ${await toggle(page, p1).getAttribute("title")}`);
      await toggle(page, p1).click();
      await list(page, p1).waitFor();
      const names = await list(page, p1).locator("[data-sheet-item]").allTextContents();
      expect(names.length === 2, `page 1 lists ${names.length}: ${names.join(" | ")}`);
      const wall = await qtyOf(page, p1, made["Wall A"]);
      const beam = await qtyOf(page, p1, made["Beam B"]);
      expect(wall === "60 LF" && beam === "30 LF", `Wall A "${wall}", Beam B "${beam}"`);
      expect((await toggle(page, p1).getAttribute("title")) === "Hide items on this sheet", "the chevron did not flip");
      await toggle(page, p2).click();
      const door = await qtyOf(page, p2, made["Door D1"]);
      expect(door === "2 EA", `Door D1 "${door}"`);
      await toggle(page, p1).click();
      await list(page, p1).waitFor({ state: "detached" });
      return `page 1: Wall A ${wall}, Beam B ${beam} · page 2 (no scale): Door D1 ${door} · folded again`;
    },
  },
  {
    title: "AC2: clicking an item under another sheet selects it and opens that sheet",
    run: async ({ page }) => {
      await open(page, p1);
      await toggle(page, p2).click();
      await itemRow(page, p2, made["Door D1"]).click();
      await page.waitForURL(new RegExp(`/takeoff/${p2.uuid}$`));
      await page.waitForFunction(
        ([s, i]) => document.querySelector(`[data-sheet-items="${s}"] [data-sheet-item="${i}"]`)?.dataset.selected === "1",
        [p2.uuid, made["Door D1"]],
      );
      return "Door D1 under page 2 → page 2 open, Door D1 selected";
    },
  },
  {
    title: "AC3: Panel options: Default Expand Level (None, Page (Default), Page > Takeoff), remembered; Hide Takeoffs and Hide Search Box",
    run: async ({ page }) => {
      await open(page, p1);
      await options(page, "Page > Takeoff");
      await list(page, p1).waitFor();
      await list(page, p2).waitFor();
      await page.reload();
      await list(page, p2).waitFor({ timeout: 20000 });
      const remembered = (await list(page, p1).count()) === 1;
      expect(remembered, "Page > Takeoff was not remembered across a reload");

      await options(page, "None");
      await row(page, p1).waitFor({ state: "hidden" });
      await options(page, "Page (Default)");
      await row(page, p1).waitFor();
      expect((await list(page, p1).count()) === 0, "Page (Default) left items open");

      await options(page, "Hide Takeoffs");
      await toggle(page, p1).waitFor({ state: "detached" });
      await options(page, "Hide Takeoffs");
      await toggle(page, p1).waitFor();

      await options(page, "Hide Search Box");
      await page.getByPlaceholder("Search sheets…").waitFor({ state: "hidden" });
      await options(page, "Hide Search Box");
      await page.getByPlaceholder("Search sheets…").waitFor();
      return "Page > Takeoff opens both sheets and survives a reload · None folds the folders · Page closes the sheets · Hide Takeoffs drops the chevrons · Hide Search Box hides the box";
    },
  },
  {
    title: "AC4: searching an item's name opens the sheet that holds it; the rows follow an api change live, no reload",
    run: async ({ page }) => {
      await open(page, p1);
      await page.getByPlaceholder("Search sheets…").fill("door");
      await itemRow(page, p2, made["Door D1"]).waitFor({ timeout: 5000 });
      await page.getByPlaceholder("Search sheets…").fill("");
      await toggle(page, p1).click();
      await itemRow(page, p1, made["Wall A"]).waitFor();
      // 1/12 ft per point: every run on page 1 reads half.
      const rescaled = await apiCall(token, "PUT", `${drawing}/sheet/${p1.uuid}/scale`, { feet_per_pt: 1 / 12, label: `1/16" = 1'-0"`, unit: "ft" });
      expect(rescaled.status === 200, `rescale: ${rescaled.status}`);
      await page.waitForFunction(
        ([s, i]) => document.querySelector(`[data-sheet-items="${s}"] [data-sheet-item="${i}"] [data-sheet-item-qty]`)?.textContent?.trim() === "30 LF",
        [p1.uuid, made["Wall A"]],
        { timeout: 10000 },
      );
      await item(p1, "Pipe P3", "lf", [[0.2, 0.2], [0.2 + 120 / W, 0.2]]);
      await itemRow(page, p1, made["Pipe P3"]).waitFor({ timeout: 10000 });
      const pipe = await qtyOf(page, p1, made["Pipe P3"]);
      expect(pipe === "10 LF", `Pipe P3 "${pipe}"`);
      return `"door" opens page 2 at Door D1 · a new scale: Wall A 60 → 30 LF live · a new item Pipe P3 ${pipe} appears live`;
    },
  },
]);

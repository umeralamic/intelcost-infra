// C14's Format line, the founder's click check of the Estimating tab (F9, D-631): a Format change
// shows in the grid and in the Excel export. f9-estimating and f9-exports cover the rest of C14
// (grid, grouping, pricing, wastage, cost components, the export's figures).
//
//   node fx-run-locked.mjs c14-format
//
// The world: one throwaway workspace and project, one page, one 1,000 SF Slab. Format starts on
// the read-only Default theme, so the run makes "My formatting", sets the font to Serif and the
// column headers' fill to red, sees both on the grid, exports, and finds Cambria (Serif's Excel
// font) and the red fill in the workbook's styles. Reset all to defaults then puts the grid back.
//
// Left for the founder's eye: every other Format control (row heights, borders, zebra, decimals),
// the workspace and teammate themes, and how the exported sheet looks in Excel.

import { readFileSync } from "node:fs";

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { zipParts } from "./lib/xlsx-zip.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6;
const RED = "#ff0000";
const { token, workspace, base } = await freshWorkspace("C14 Format");
const project = await makeProject(token, base, { name: "Format one" });
let sheet;

const grid = (page) => page.locator("table").filter({ has: page.locator("tr[data-estimate-row]") }).first();
const fontOf = (page) => page.locator(`tr[data-estimate-row="Slab"] td`).nth(2).evaluate((td) => getComputedStyle(td).fontFamily);
// The Column headers fill sits on the header row (its cells inherit it when frozen).
const headerFill = (page) => grid(page).locator("thead tr").last().evaluate((tr) => getComputedStyle(tr).backgroundColor);

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating`);
  await page.locator(`tr[data-estimate-row="Slab"]`).waitFor({ timeout: 30000 });
  const show = page.getByRole("button", { name: "Show the sidebar", exact: true });
  if (await show.isVisible()) await show.click();
}

async function formatPanel(page) {
  // Format is on the table's toolbar since D-766 F2.
  await page.locator("[data-table-tools]").getByRole("button", { name: "Format", exact: true }).click();
  const panel = page.locator("[data-format-panel]");
  await panel.waitFor();
  return panel;
}

/** The theme picked is this browser's (localStorage): a fresh browser starts on Default, so a
 *  step in its own browser picks My formatting again. */
async function useMine(page) {
  const panel = await formatPanel(page);
  const mine = panel.getByRole("button", { name: /^My formatting/ });
  await mine.waitFor({ timeout: 10000 });
  if ((await mine.getAttribute("aria-pressed")) !== "true") await mine.click();
  await panel.locator("button[aria-pressed=true]").filter({ hasText: /^My formatting/ }).waitFor({ timeout: 10000 });
  return panel;
}

/** A colour input set as a person's pick lands: the value, then input and change. */
const pickColor = (input, hex) =>
  input.evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, hex);

async function section(panel, title) {
  const toggle = panel.locator(`[data-format-section="${title}"] button[aria-expanded]`).first();
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
}

await run("c14-format", [
  {
    title: "setup: one page at 1/6 ft per point and a 1,000 SF Slab",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "F1.pdf", buffer: makePdf([{ width: W, height: H, label: "F1" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["F1.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      const dx = 40 / FT / W;
      const dy = 25 / FT / H;
      const made = await apiCall(token, "POST", `${base}/${project.uuid}/takeoff/item`, {
        name: "Slab", type: "sf", unit: "SF", sheet_uuid: sheet.uuid, color: "#1d4ed8",
        geometry: { geom_type: "sf", vertices_json: [[0.05, 0.05], [0.05 + dx, 0.05], [0.05 + dx, 0.05 + dy], [0.05, 0.05 + dy]], shape_meta: { closed: true }, client_uuid: crypto.randomUUID() },
      });
      expect(made.status === 201, `Slab: ${made.status} ${JSON.stringify(made.body)}`);
      return `Slab ${made.body.effective_quantity} SF`;
    },
  },
  {
    title: "Format: Default is read-only; My formatting with font Serif and red column headers shows on the grid, and holds after a reload",
    run: async ({ page }) => {
      await open(page);
      const before = { font: await fontOf(page), fill: await headerFill(page) };
      let panel = await formatPanel(page);
      await section(panel, "Text");
      expect(await panel.getByLabel("Font", { exact: true }).isDisabled(), "the Default theme's Font is editable");
      await panel.getByRole("button", { name: /^Create my formatting/ }).click();
      await panel.getByRole("button", { name: /^My formatting/ }).waitFor({ timeout: 10000 });
      await section(panel, "Text");
      const font = panel.getByLabel("Font", { exact: true });
      await waitFor(async () => ((await font.isEnabled()) ? true : null), "My formatting editable", 10000);
      await font.selectOption({ label: "Serif" });
      await section(panel, "Colors");
      // An edit saves 400 ms after the last change: the reload waits for that save to land.
      const saved = page.waitForResponse((r) => r.url().endsWith("/estimate-format/mine") && r.request().method() === "PUT" && (r.request().postData() ?? "").includes(RED), { timeout: 15000 });
      await pickColor(panel.getByLabel("Column headers fill", { exact: true }), RED);
      const put = await saved;
      expect(put.status() === 200, `the format's save: ${put.status()} ${await put.text()}`);
      await waitFor(async () => (/Georgia|serif/i.test(await fontOf(page)) ? true : null), "the grid in Serif", 10000).catch(async () => {
        throw new Error(`grid font "${await fontOf(page)}" (was "${before.font}")`);
      });
      await waitFor(async () => ((await headerFill(page)) === "rgb(255, 0, 0)" ? true : null), "red column headers", 10000).catch(async () => {
        throw new Error(`header fill "${await headerFill(page)}" (was "${before.fill}")`);
      });
      await page.keyboard.press("Escape");
      await page.reload();
      await page.locator(`tr[data-estimate-row="Slab"]`).waitFor({ timeout: 30000 });
      await waitFor(async () => (/Georgia|serif/i.test(await fontOf(page)) && (await headerFill(page)) === "rgb(255, 0, 0)" ? true : null), "the format after a reload", 15000).catch(async () => {
        throw new Error(`after a reload: font "${await fontOf(page)}", header "${await headerFill(page)}"`);
      });
      panel = page.locator("[data-format-panel]");
      return `before: "${before.font.slice(0, 30)}…", ${before.fill}; after: "${(await fontOf(page)).slice(0, 30)}…", red headers; kept after a reload`;
    },
  },
  {
    title: "export: the workbook's styles carry the Serif font (Cambria) and the red header fill (FFFF0000)",
    run: async ({ page }) => {
      await open(page);
      await useMine(page);
      await page.mouse.click(5, 5);
      await waitFor(async () => (/Georgia/i.test(await fontOf(page)) && (await headerFill(page)) === "rgb(255, 0, 0)" ? true : null), "My formatting on the grid", 15000).catch(async () => {
        throw new Error(`My formatting picked, the grid reads font "${await fontOf(page)}", header "${await headerFill(page)}"`);
      });
      await page.getByRole("button", { name: "Export", exact: true }).first().click();
      const dialog = page.getByRole("dialog", { name: "Export to Excel" });
      await dialog.waitFor();
      for (const choice of ["All columns", "All rows", "Without formulas"]) await dialog.getByRole("radio", { name: choice, exact: true }).click();
      const [download] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), dialog.getByRole("button", { name: "Export", exact: true }).click()]);
      const styles = (zipParts(readFileSync(await download.path()))["xl/styles.xml"] ?? "").toString("utf8");
      expect(/<name val="Cambria"\/>/.test(styles), `no Cambria font in styles: ${(styles.match(/<name val="[^"]*"\/>/g) ?? []).join(" ")}`);
      expect(/rgb="FFFF0000"/i.test(styles), `no red fill in styles: ${(styles.match(/<fgColor [^>]*\/>/g) ?? []).slice(0, 8).join(" ")}`);
      return `fonts ${[...new Set(styles.match(/<name val="[^"]*"\/>/g) ?? [])].join(" ")}; red fill present`;
    },
  },
  {
    title: "Reset all to defaults puts the grid's font and header fill back",
    run: async ({ page }) => {
      await open(page);
      const panel = await useMine(page);
      await panel.getByRole("button", { name: "Reset all to defaults" }).click();
      await waitFor(async () => (!/Georgia/i.test(await fontOf(page)) && (await headerFill(page)) !== "rgb(255, 0, 0)" ? true : null), "the defaults back", 10000).catch(async () => {
        throw new Error(`after Reset: font "${await fontOf(page)}", header "${await headerFill(page)}"`);
      });
      return `font "${(await fontOf(page)).slice(0, 30)}…", header ${await headerFill(page)}`;
    },
  },
]);

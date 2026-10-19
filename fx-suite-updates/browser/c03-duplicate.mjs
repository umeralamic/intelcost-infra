// Click check C3 (docs/tasks/pending_umer.md): Duplicate project (D-349). All projects, the row's
// menu (a right-click on the row: the list has no ⋯ button), Duplicate project: a progress toast
// that counts up, then the copy opens. A change in the copy leaves the original as it was. The copy
// goes to Trash from the same menu afterwards.
//
//   node fx-run-locked.mjs c03-duplicate
//
// The world: one throwaway workspace and project "Dup source" with one drawing in storage (a page
// at 1/6 ft per point) and one area item, Slab 40 × 25 ft = 1,000 SF.
//
// Left for the founder's eye: how the toast reads while it counts (its wording and pace on a big
// project such as Test 3), and how long the copy takes there.

import { APP, apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { grading, gradingSheets, openSheet, rect } from "./lib/grading-world.mjs";

const NAME = "Dup source";
const { token, workspace, base } = await freshWorkspace("C3 Duplicate");
const project = await makeProject(token, base, { name: NAME });
const g = grading(token, base, project);
let sheet;
let slab;
let copy;

const projects = async () => {
  const got = await apiCall(token, "GET", `${base}?limit=200`);
  expect(got.status === 200, `projects: ${got.status}`);
  return Array.isArray(got.body) ? got.body : got.body.items;
};
const itemsOf = async (uuid) => {
  const got = await apiCall(token, "GET", `${base}/${uuid}/takeoff/item/detail`);
  expect(got.status === 200, `items of ${uuid}: ${got.status}`);
  return got.body;
};
const qty = (i) => Number(i.effective_quantity ?? i.quantity ?? 0);

/** The row's menu in All projects: a right-click on the row's subtitle. */
async function rowMenu(page, name) {
  const dialog = page.getByRole("dialog", { name: "All projects" });
  const row = dialog.locator(`li[data-project="${name}"]`);
  await row.waitFor({ timeout: 20000 });
  await row.locator("[data-subtitle]").click({ button: "right" });
  const menu = page.getByRole("menu", { name: `Actions for ${name}` });
  await menu.waitFor({ timeout: 5000 });
  return menu;
}

await run("c03-duplicate", [
  {
    title: "setup: project \"Dup source\" with one drawing in storage and Slab 1,000 SF",
    run: async ({ page }) => {
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["D-1"]);
      slab = await g.item(sheet, { name: "Slab", type: "sf", unit: "SF", color: "#1d4ed8", geometry: { geom_type: "sf", vertices_json: rect(0.3, 0.3, 40, 25), shape_meta: { closed: true }, client_uuid: crypto.randomUUID() } });
      expect(Math.abs(qty(slab) - 1000) < 0.01, `Slab ${qty(slab)}`);
      return `sheet ${sheet.uuid}; Slab ${qty(slab).toFixed(2)} SF`;
    },
  },
  {
    title: "All projects, the row's menu, Duplicate project: the toast shows the copy going, then the copy opens",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      // Every toast text the page shows from here, so the progress is seen however fast it runs.
      await page.evaluate(() => {
        window.__toasts = [];
        const seen = new Set();
        const read = () => {
          for (const el of document.querySelectorAll("[data-sonner-toast]")) {
            const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
            if (text && !seen.has(text)) {
              seen.add(text);
              window.__toasts.push(text);
            }
          }
        };
        new MutationObserver(read).observe(document.body, { subtree: true, childList: true, characterData: true });
      });
      const menu = await rowMenu(page, NAME);
      await menu.getByRole("menuitem", { name: "Duplicate project" }).click();
      await page.waitForURL((url) => url.pathname.startsWith("/project/") && !url.pathname.includes(project.uuid), { timeout: 120000 });
      const uuid = new URL(page.url()).pathname.split("/")[2];
      const toasts = await waitFor(
        async () => {
          const all = await page.evaluate(() => window.__toasts);
          return all.some((t) => t.includes(`"${NAME}" duplicated`)) ? all : null;
        },
        "the done toast",
        15000,
      );
      expect(toasts.some((t) => t.startsWith(`Duplicating "${NAME}"`)), `no progress toast: ${toasts.join(" | ")}`);
      copy = (await projects()).find((p) => p.uuid === uuid);
      expect(copy, `the opened project ${uuid} is not in the workspace's list`);
      // The app names it "<name> (copy)"; the bench's copy guard (lib/protected.mjs, D-544) may
      // already have renamed it "BENCH DUP <time> — delete me" by the time it is read.
      expect(copy.name === `${NAME} (copy)` || /^BENCH DUP /.test(copy.name), `the copy is named "${copy.name}"`);
      const steps = toasts.filter((t) => t.startsWith("Duplicating"));
      return `copy "${copy.name}" opened at ${new URL(page.url()).pathname}; toasts: ${toasts.join(" | ")} (${steps.length} progress reading${steps.length === 1 ? "" : "s"})`;
    },
  },
  {
    title: "the copy holds what the original holds: its sheet with its drawing, Slab 1,000 SF",
    run: async ({ page }) => {
      const items = await itemsOf(copy.uuid);
      const copied = items.find((i) => i.name === "Slab");
      expect(copied && copied.uuid !== slab.uuid && Math.abs(qty(copied) - 1000) < 0.01, `copy's items: ${items.map((i) => `${i.name} ${qty(i)}`).join(", ")}`);
      const sheets = await apiCall(token, "GET", `${base}/${copy.uuid}/drawing/sheet`);
      const list = Array.isArray(sheets.body) ? sheets.body : (sheets.body?.items ?? []);
      expect(sheets.status === 200 && list.length === 1, `copy's sheets: ${sheets.status} ${JSON.stringify(sheets.body).slice(0, 200)}`);
      // The drawing renders: the copy's sheet opens with its scale on the canvas.
      await openSheet(page, copy, list[0], "takeoff");
      await page.locator("canvas").first().waitFor({ timeout: 30000 });
      // The row is drawn in both the Sheets panel and the Takeoff panel.
      await page.locator(`[data-quantity-panel] li[data-item-row="${copied.uuid}"]`).first().waitFor({ timeout: 20000 });
      return `copy: 1 sheet (${list[0].name ?? list[0].uuid}), Slab ${qty(copied).toFixed(2)} SF; its sheet opens`;
    },
  },
  {
    title: "a change in the copy: Slab renamed in its Takeoff panel and its quantity overridden; the original keeps Slab at 1,000 SF",
    run: async ({ page }) => {
      const copied = (await itemsOf(copy.uuid)).find((i) => i.name === "Slab");
      const sheetUuid = copied.sheet_uuid;
      await openSheet(page, copy, { uuid: sheetUuid }, "takeoff");
      const row = page.locator(`li[data-item-row="${copied.uuid}"] > [role=row]`).first();
      await row.waitFor({ timeout: 20000 });
      // A double-click on the row opens Properties; the name is changed there and saved.
      await row.locator("[data-item-qty]").dblclick();
      const props = page.getByRole("dialog", { name: "Properties" });
      await props.waitFor({ timeout: 10000 });
      const input = props.getByRole("textbox").first();
      await input.fill("Slab in the copy");
      await props.getByRole("button", { name: "Save", exact: true }).click();
      await props.waitFor({ state: "detached", timeout: 10000 });
      await waitFor(async () => (await itemsOf(copy.uuid)).some((i) => i.uuid === copied.uuid && i.name === "Slab in the copy"), "the rename stored", 15000);
      const over = await apiCall(token, "PUT", `${base}/${copy.uuid}/takeoff/item/${copied.uuid}/quantity`, { manual_quantity_override: 1234, override_reason: "C3" });
      expect(over.status === 200, `override in the copy: ${over.status} ${JSON.stringify(over.body)}`);
      const overridden = true;
      const original = (await itemsOf(project.uuid)).find((i) => i.uuid === slab.uuid);
      expect(original && original.name === "Slab", `the original's Slab is now "${original?.name}"`);
      expect(Math.abs(qty(original) - 1000) < 0.01 && original.manual_quantity_override == null,`the original's Slab reads ${qty(original)} (override ${original?.manual_quantity_override})`);
      expect((await itemsOf(project.uuid)).length === 1, "the original gained items");
      return `copy: "Slab in the copy"${overridden ? ", overridden to 1,234" : ""}; original: Slab ${qty(original).toFixed(2)} SF, no override`;
    },
  },
  {
    title: "the copy to Trash from All projects (the row's menu, Move to Trash, confirm): gone from the list, the original stays",
    run: async ({ page }) => {
      // Its name as it is now (the bench's guard may have renamed it since step 2).
      copy = (await projects()).find((p) => p.uuid === copy.uuid);
      await openDashboard(page, workspace.uuid);
      const menu = await rowMenu(page, copy.name);
      await menu.getByRole("menuitem", { name: "Move to Trash" }).click();
      const confirm = page.getByRole("dialog", { name: "Move project to Trash?" }).or(page.getByRole("alertdialog", { name: "Move project to Trash?" }));
      await confirm.first().waitFor({ timeout: 5000 });
      await confirm.first().getByRole("button", { name: "Move to Trash", exact: true }).click();
      await page.getByRole("dialog", { name: "All projects" }).locator(`li[data-project="${copy.name}"]`).waitFor({ state: "detached", timeout: 15000 });
      const left = await projects();
      expect(!left.some((p) => p.uuid === copy.uuid), "the copy is still in the workspace's list");
      expect(left.some((p) => p.uuid === project.uuid), "the original left the list");
      const original = (await itemsOf(project.uuid)).find((i) => i.uuid === slab.uuid);
      expect(original && original.name === "Slab" && Math.abs(qty(original) - 1000) < 0.01, `the original's Slab: ${JSON.stringify(original && { name: original.name, q: qty(original) })}`);
      return `"${copy.name}" in Trash; "${NAME}" still listed with Slab 1,000 SF`;
    },
  },
]);

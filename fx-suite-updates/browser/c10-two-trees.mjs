// Click check C10 (pending_umer.md; wbs_split_tasks.md, D-336): two trees, your own folders and
// classification.
//
//   node fx-run-locked.mjs c10-two-trees
//
// Asserts: the Takeoff panel's Folders / Classification switch shows each tree (Wall under the
// folder "Structure" in one, under DIV 03 in the other) and remembers the choice; "Change
// classification…" moves Paint from DIV 09 to DIV 03, its folder untouched, and Ctrl+Z puts it
// back; a folder clicked in Folders, and a code clicked in Classification, is where a newly drawn
// item lands; New Measurement shows both the Folder and the Classification field, filled from the
// clicked group; Estimating groups the same items by Classification and by Custom Folder.
//
// The world: a fresh workspace, one landscape page (1224 x 792 pt) at 1/6 ft per point, a custom
// folder "Structure", Wall (LF, Structure, DIV 03) and Paint (SF, no folder, DIV 09).
//
// Left for the founder's eye: how the two trees read side by side with real projects (code folder
// glyphs, "Show all", the Unclassified group), and that a drag never crosses codes.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { MEASURE_TOOLS, sheetPoint } from "./lib/takeoff.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6;
const { token, workspace, base } = await freshWorkspace("C10 two trees");
const wsBase = base.replace(/\/project$/, "");
const project = await makeProject(token, base, { name: "Two trees" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
let structure;
const div = {};

const panel = (page) => page.locator("[data-quantity-panel]");
const row = (page, name) => panel(page).locator("li[data-item-row] > [role=row]").filter({ has: page.getByText(name, { exact: true }) }).first();
const viewTab = (page, label) => panel(page).getByRole("tablist", { name: "Group items by" }).getByRole("tab", { name: label, exact: true });
const group = (page, test) => panel(page).locator("li[data-folder-group]").filter({ has: page.locator(":scope > [data-folder-header]", { hasText: test }) }).first();
const items = async () => (await apiCall(token, "GET", `${takeoff}/item`)).body;
const byName = async (name) => (await items()).find((i) => i.name === name);
const form = (page) => page.locator("[data-measurement-dialog]");
/** Clicks off any field, so Ctrl+Z reaches the page's history (ignored inside an input). */
const blur = (page) => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));

async function open(page, query = "") {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}${query}`);
  if (query.includes("estimating")) return;
  await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
  await row(page, "Wall").waitFor({ timeout: 15000 });
}
async function view(page, label) {
  await viewTab(page, label).click();
  await panel(page).locator(`[data-panel-view="${label === "Folders" ? "folders" : "classification"}"]`).waitFor({ timeout: 10000 });
}
/** The names of the items listed inside a group, read from the tree. */
// A group's items by what each row says it is in (D-646): the panel is one flat, virtual list, so
// an item row is no longer inside its folder's element.
const inside = async (g) => {
  const name = await g.getAttribute("data-folder-group");
  const rows = g.page().locator(`[data-quantity-panel] li[data-in-group="${name}"] li[data-item-row] [data-item-name]`);
  return (await rows.allTextContents()).map((s) => s.trim());
};
/** Opens a group (a click also makes it the landing target). */
async function target(page, g) {
  await g.locator(":scope > [data-folder-header] > button").first().click();
  await g.locator(":scope > [data-folder-header][data-target='1']").waitFor({ timeout: 5000 });
  if ((await g.locator(":scope > [data-folder-header] > button").first().getAttribute("aria-expanded")) !== "true") {
    await g.locator(":scope > [data-folder-header] > button").first().click();
  }
}
async function draw(page, points) {
  for (const [x, y] of points.slice(0, -1)) {
    const p = await sheetPoint(page, x, y);
    await page.mouse.click(p.x, p.y);
  }
  const last = await sheetPoint(page, ...points[points.length - 1]);
  await page.mouse.dblclick(last.x, last.y);
}
async function openWbs(page) {
  const toggle = form(page).locator("[data-wbs]").getByRole("button", { name: /^Work Breakdown Structure/ });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
}

await run("c10-two-trees", [
  {
    title: "setup: one page at 1/6 ft per point; folder Structure; Wall (LF) in Structure and DIV 03, Paint (SF) at the top level and DIV 09",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "T1.pdf", buffer: makePdf([{ width: W, height: H, label: "T1" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["T1.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      const tree = await apiCall(token, "GET", `${wsBase}/classification?system=csi`);
      expect(tree.status === 200, `classification: ${tree.status}`);
      for (const code of ["03", "09"]) div[code] = tree.body.find((n) => n.parent_uuid === null && n.code === code);
      expect(div["03"] && div["09"], "no DIV 03 or DIV 09 in the CSI tree");
      const f = await apiCall(token, "POST", `${takeoff}/folder`, { name: "Structure" });
      expect(f.status === 201, `folder: ${f.status} ${JSON.stringify(f.body)}`);
      structure = f.body;
      const make = async (name, type, unit, vertices, folder, code) => {
        const made = await apiCall(token, "POST", `${takeoff}/item`, {
          name, type, unit, sheet_uuid: sheet.uuid, folder_uuid: folder,
          geometry: { geom_type: type, vertices_json: vertices, shape_meta: { closed: type === "sf" }, client_uuid: crypto.randomUUID() },
        });
        expect(made.status === 201, `${name}: ${made.status} ${JSON.stringify(made.body)}`);
        const filed = await apiCall(token, "PATCH", `${takeoff}/item/${made.body.uuid}`, { classification_ref_id: code });
        expect(filed.status === 200, `${name} code: ${filed.status} ${JSON.stringify(filed.body)}`);
      };
      await make("Wall", "lf", "LF", [[0.05, 0.5], [0.05 + 60 / W, 0.5]], structure.uuid, div["03"].uuid);
      await make("Paint", "sf", "SF", [[0.6, 0.1], [0.6 + 60 / W, 0.1], [0.6 + 60 / W, 0.1 + 60 / H], [0.6, 0.1 + 60 / H]], null, div["09"].uuid);
      const all = await items();
      return all.map((i) => `${i.name} ${i.effective_quantity} ${i.unit}`).join(", ");
    },
  },
  {
    title: "the switch: Folders shows Wall under Structure and Paint at the top; Classification shows Wall under DIV 03 and Paint under DIV 09; the choice survives a reload",
    run: async ({ page }) => {
      await open(page);
      await view(page, "Folders");
      const s = group(page, "Structure");
      await s.waitFor({ timeout: 10000 });
      if ((await s.locator(":scope > [data-folder-header] > button").first().getAttribute("aria-expanded")) !== "true") await s.locator(":scope > [data-folder-header] > button").first().click();
      const inStructure = await inside(s);
      const codesInFolders = await panel(page).locator("li[data-group-kind=code]").count();
      expect(inStructure.join() === "Wall", `Folders: Structure holds ${JSON.stringify(inStructure)}`);
      expect(codesInFolders === 0, `Folders shows ${codesInFolders} code groups`);
      await view(page, "Classification");
      const d03 = panel(page).locator("li[data-group-kind=code]").filter({ has: page.locator(":scope > [data-folder-header]", { hasText: /DIV 03/ }) }).first();
      const d09 = panel(page).locator("li[data-group-kind=code]").filter({ has: page.locator(":scope > [data-folder-header]", { hasText: /DIV 09/ }) }).first();
      await d03.waitFor({ timeout: 10000 });
      for (const g of [d03, d09]) if ((await g.locator(":scope > [data-folder-header] > button").first().getAttribute("aria-expanded")) !== "true") await g.locator(":scope > [data-folder-header] > button").first().click();
      const in03 = await inside(d03);
      const in09 = await inside(d09);
      const structureHere = await group(page, /^Structure/).count();
      expect(in03.join() === "Wall" && in09.join() === "Paint", `Classification: DIV 03 holds ${JSON.stringify(in03)}, DIV 09 ${JSON.stringify(in09)}`);
      expect(structureHere === 0, "Classification still shows the custom folder Structure");
      const saved = await waitFor(async () => {
        const me = await apiCall(token, "GET", "/api/auth/me");
        return me.body?.takeoff_prefs?.panel_view?.[project.uuid] === "classification" ? true : null;
      }, "the view kept on the user", 10000);
      await page.reload();
      await panel(page).locator('[data-panel-view="classification"]').waitFor({ timeout: 20000 });
      await view(page, "Folders");
      return `Folders: Structure → ${inStructure.join()}; Classification: DIV 03 → ${in03.join()}, DIV 09 → ${in09.join()}; kept ${saved} and after a reload`;
    },
  },
  {
    title: "Change classification… moves Paint from DIV 09 to DIV 03 with its folder untouched; Ctrl+Z puts it back in DIV 09; Ctrl+Y moves it again",
    run: async ({ page }) => {
      await open(page);
      await view(page, "Classification");
      const paint = row(page, "Paint");
      if (!(await paint.isVisible())) {
        const d09 = panel(page).locator("li[data-group-kind=code]").filter({ has: page.locator(":scope > [data-folder-header]", { hasText: /DIV 09/ }) }).first();
        await d09.locator(":scope > [data-folder-header] > button").first().click();
      }
      // "Change classification…" is on the row's right-click (quick) menu, not its ⋮.
      await paint.click({ button: "right" });
      await page.getByRole("menuitem", { name: /^Change classification/ }).click();
      const dialog = page.locator("[data-change-classification]");
      await dialog.waitFor({ timeout: 10000 });
      await dialog.getByLabel("Search classifications").fill("Concrete");
      await dialog.locator('[data-pick="03"]').first().click();
      // The footer sits outside [data-change-classification]: find Change by the dialog.
      await page.getByRole("dialog", { name: "Change classification" }).getByRole("button", { name: "Change", exact: true }).click();
      await dialog.waitFor({ state: "detached", timeout: 10000 });
      const moved = await waitFor(async () => {
        const p = await byName("Paint");
        return p.classification_ref_id === div["03"].uuid ? p : null;
      }, "Paint in DIV 03", 10000);
      expect(moved.folder_uuid === null, `Paint's folder changed to ${moved.folder_uuid}`);
      await blur(page);
      await page.keyboard.press("Control+z");
      const back = await waitFor(async () => {
        const p = await byName("Paint");
        return p.classification_ref_id === div["09"].uuid ? p : null;
      }, "Ctrl+Z putting Paint back in DIV 09", 10000).catch(async () => {
        throw new Error(`Ctrl+Z after Change classification left Paint on ${(await byName("Paint")).classification_ref_id} (DIV 03 is ${div["03"].uuid}, DIV 09 ${div["09"].uuid})`);
      });
      const d09 = panel(page).locator("li[data-group-kind=code]").filter({ has: page.locator(":scope > [data-folder-header]", { hasText: /DIV 09/ }) }).first();
      await d09.waitFor({ timeout: 10000 });
      await blur(page);
      await page.keyboard.press("Control+y");
      await waitFor(async () => ((await byName("Paint")).classification_ref_id === div["03"].uuid ? true : null), "Ctrl+Y moving Paint again", 10000);
      // Leave it where it began, for the steps after.
      await blur(page);
      await page.keyboard.press("Control+z");
      await waitFor(async () => ((await byName("Paint")).classification_ref_id === div["09"].uuid ? true : null), "a second Ctrl+Z", 10000);
      return `Paint DIV 09 → DIV 03 (folder still none); Ctrl+Z → DIV 09 (${back.classification_ref_id === div["09"].uuid}); Ctrl+Y → DIV 03; Ctrl+Z again`;
    },
  },
  {
    title: "Folders: Structure clicked, Linear: New Measurement shows Folder and Classification, the folder already Structure; the drawn run lands in Structure",
    run: async ({ page }) => {
      await open(page);
      await view(page, "Folders");
      await target(page, group(page, "Structure"));
      await page.getByRole("group", { name: MEASURE_TOOLS }).getByRole("button", { name: "Linear", exact: true }).click();
      await form(page).waitFor({ timeout: 10000 });
      await openWbs(page);
      const folderField = await form(page).locator("[data-wbs-folder]").count();
      const codeField = await form(page).locator("[data-wbs-classification]").count();
      const folderShown = ((await form(page).locator("[data-wbs-folder]").innerText()) ?? "").replace(/\s+/g, " ");
      expect(folderField === 1 && codeField === 1, `New Measurement fields: Folder ${folderField}, Classification ${codeField}`);
      expect(/Structure/.test(folderShown), `the Folder field reads "${folderShown}", wanted Structure`);
      await form(page).getByLabel("Name", { exact: true }).fill("Beam");
      await form(page).getByRole("button", { name: "Create" }).click();
      await form(page).waitFor({ state: "detached", timeout: 10000 });
      await draw(page, [[0.1, 0.3], [0.3, 0.3]]);
      const beam = await waitFor(() => byName("Beam"), "Beam saved", 10000);
      expect(beam.folder_uuid === structure.uuid, `Beam landed in ${beam.folder_uuid}, wanted Structure ${structure.uuid}`);
      expect(!beam.classification_ref_id, `Beam took a classification ${beam.classification_ref_id}`);
      return `Folder and Classification both shown; Folder "${folderShown.trim()}"; Beam filed in Structure`;
    },
  },
  {
    title: "Classification: DIV 09 clicked, Area: the Classification field already reads DIV 09; the drawn area lands under DIV 09 with no custom folder",
    run: async ({ page }) => {
      await open(page);
      await view(page, "Classification");
      const d09 = panel(page).locator("li[data-group-kind=code]").filter({ has: page.locator(":scope > [data-folder-header]", { hasText: /DIV 09/ }) }).first();
      await d09.waitFor({ timeout: 10000 });
      await target(page, d09);
      await page.getByRole("group", { name: MEASURE_TOOLS }).getByRole("button", { name: "Area", exact: true }).click();
      await form(page).waitFor({ timeout: 10000 });
      await openWbs(page);
      const both = [await form(page).locator("[data-wbs-folder]").count(), await form(page).locator("[data-wbs-classification]").count()];
      const picked = ((await form(page).locator("[data-wbs-classification] [data-picked-classification]").first().textContent().catch(() => "")) ?? "").trim();
      expect(both.join() === "1,1", `New Measurement fields: Folder ${both[0]}, Classification ${both[1]}`);
      expect(/09|Finishes/.test(picked), `the Classification field reads "${picked}", wanted DIV 09`);
      await form(page).getByLabel("Name", { exact: true }).fill("Ceiling");
      await form(page).getByRole("button", { name: "Create" }).click();
      await form(page).waitFor({ state: "detached", timeout: 10000 });
      await draw(page, [[0.3, 0.6], [0.4, 0.6], [0.4, 0.75], [0.3, 0.75]]);
      const ceiling = await waitFor(() => byName("Ceiling"), "Ceiling saved", 10000);
      expect(ceiling.classification_ref_id === div["09"].uuid && ceiling.folder_uuid === null, `Ceiling code ${ceiling.classification_ref_id}, folder ${ceiling.folder_uuid}`);
      return `Classification field "${picked}"; Ceiling filed under DIV 09, no custom folder`;
    },
  },
  {
    title: "Estimating: by Classification, Wall under DIV 03, Beam (no code) outside both, Paint and Ceiling under DIV 09; by Custom Folder, Wall and Beam under Structure",
    run: async ({ page }) => {
      await open(page, "?tab=estimating");
      const estRow = (name) => page.locator(`tr[data-estimate-row="${name}"]`).first();
      await estRow("Wall").waitFor({ timeout: 30000 });
      const show = page.getByRole("button", { name: "Show the sidebar", exact: true });
      if (await show.isVisible()) await show.click();
      const groupBy = async (label) => {
        await page.locator("aside[data-estimate-sidebar=open]").getByRole("button").filter({ hasText: /^(Classification|Custom Folder|Scope|Subcontractor|Sheet)$/ }).first().click();
        await page.getByRole("menu", { name: "Group by" }).getByRole("menuitem", { name: label }).click();
      };
      const order = () => page.locator("table tbody tr[data-estimate-group], table tbody tr[data-estimate-row]").evaluateAll((rows) => rows.map((r) => (r.dataset.estimateGroup !== undefined ? `# ${r.dataset.estimateGroup}` : r.dataset.estimateRow)));
      const groupOf = (list, name) => [...list.slice(0, list.indexOf(name))].reverse().find((e) => e.startsWith("# "));
      await groupBy("Classification");
      const byCode = await waitFor(async () => {
        const o = await order();
        return o.includes("Ceiling") && o.includes("Beam") ? o : null;
      }, "every row in the grid", 15000);
      const g = Object.fromEntries(["Wall", "Beam", "Paint", "Ceiling"].map((n) => [n, groupOf(byCode, n) ?? ""]));
      expect(/03/.test(g.Wall) && /09/.test(g.Paint) && g.Paint === g.Ceiling && !/03|09/.test(g.Beam), `by classification: ${byCode.join(" / ")}`);
      await groupBy("Custom Folder");
      const byFolder = await waitFor(async () => {
        const o = await order();
        return o.some((e) => /Structure/.test(e)) ? o : null;
      }, "a Structure group", 15000);
      const f = Object.fromEntries(["Wall", "Beam", "Paint", "Ceiling"].map((n) => [n, groupOf(byFolder, n) ?? ""]));
      expect(/Structure/.test(f.Wall) && f.Wall === f.Beam && !/Structure/.test(f.Paint) && !/Structure/.test(f.Ceiling), `by folder: ${byFolder.join(" / ")}`);
      return `Classification: Wall "${g.Wall}", Beam "${g.Beam}", Paint and Ceiling "${g.Paint}"; Custom Folder: Wall and Beam "${f.Wall}", Paint "${f.Paint}"`;
    },
  },
]);

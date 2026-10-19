// Click check C12 (pending_umer.md; F6, archive OVERNIGHT_REPORT_2026-09-28.md:435-553 plus the
// 10-03 additions): the item model.
//
//   node fx-run-locked.mjs c12-item-model
//
// Asserts, each through the screen: a Linear with height 7'-6" over a 40 ft run reads about 300 SF;
// pitch 6/12 on a 100 SF area reads 111.80 SF; Create sub-item on a 1,000 SF slab with
// `PARENT * 1.05` reads 1,050; a variable {Wall Height} = 10 made in the sub-items dialog gives
// `{Wall Height} * 2` = 20; Folder Properties x2 shows "x2" on the folder and on its item, the
// stored multiplier 2; a count drawn on the Alternate layer files there and Base Bid's rows leave
// the tree; Duplicate suggests "Slab (2)" and carries the sub-items; Properties files an item under
// DIV 03; the sub-items editor, opened at desktop width, stays on screen with its fields and its
// Save in reach when the window narrows to 375 px (D-386).
//
// The world: a fresh workspace, one landscape page (1224 x 792 pt) at 1/6 ft per point; Slab, a
// 40 x 25 ft area (1,000 SF), and Roof, a 10 x 10 ft area (100 SF), made through the api.
//
// Left for the founder's eye: the dialogs' wording and layout, the editor's feel at phone width on
// a real phone (touch, the on-screen keyboard), the ^ operator and Excel export of sub-items.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { MEASURE_TOOLS, armMeasure, sheetPoint } from "./lib/takeoff.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6;
const { token, workspace, base } = await freshWorkspace("C12 item model");
const wsBase = base.replace(/\/project$/, "");
const project = await makeProject(token, base, { name: "Item model" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
let slab;
let roof;

const tools = (page) => page.getByRole("group", { name: MEASURE_TOOLS });
const form = (page) => page.locator("[data-measurement-dialog]");
const panel = (page) => page.locator("[data-quantity-panel]");
const row = (page, name) => panel(page).locator("li[data-item-row] > [role=row]").filter({ has: page.getByText(name, { exact: true }) }).first();
const header = (page, name) => panel(page).locator(`[data-folder-group="${name}"] > [data-folder-header]`).first();
const subs = (page) => page.locator("[data-sub-items-dialog]");
const items = async () => (await apiCall(token, "GET", `${takeoff}/item`)).body;
const byName = async (name) => (await items()).find((i) => i.name === name);
const startsWith = async (prefix) => (await items()).find((i) => i.name.startsWith(prefix));
const kids = async (parent) => (await items()).filter((i) => i.parent_uuid === parent.uuid);
const layers = async () => (await apiCall(token, "GET", `${takeoff}/layer`)).body;
const rect = (x0, y0, wFt, hFt) => {
  const dx = wFt / FT / W;
  const dy = hFt / FT / H;
  return [[x0, y0], [x0 + dx, y0], [x0 + dx, y0 + dy], [x0, y0 + dy]];
};

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
  await row(page, "Slab").waitFor({ timeout: 15000 });
}
/** An entry of a row's full menu, its ⋮ (a right-click opens the quick menu, D-149). */
async function more(page, name, entry) {
  await row(page, name).hover();
  await panel(page).getByRole("button", { name: `More actions for ${name}`, exact: true }).first().click();
  await page.getByRole("menuitem", { name: entry }).first().click();
}
async function changeType(page, label) {
  await form(page).locator("[data-change-measurement] > button").click();
  await page.getByRole("listbox", { name: "Change Measurement Type" }).getByRole("option").filter({ hasText: label }).getByRole("button").click();
}
const qtyIn = async (page, index) => (await subs(page).locator(`[data-sub-row="${index}"] [data-sub-qty]`).textContent()).trim();

await run("c12-item-model", [
  {
    title: "setup: one page at 1/6 ft per point; Slab 40 x 25 ft (1,000 SF) and Roof 10 x 10 ft (100 SF)",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "M1.pdf", buffer: makePdf([{ width: W, height: H, label: "M1" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["M1.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      const area = async (name, vertices) => {
        const made = await apiCall(token, "POST", `${takeoff}/item`, {
          name, type: "sf", unit: "SF", sheet_uuid: sheet.uuid,
          geometry: { geom_type: "sf", vertices_json: vertices, shape_meta: { closed: true }, client_uuid: crypto.randomUUID() },
        });
        expect(made.status === 201, `${name}: ${made.status} ${JSON.stringify(made.body)}`);
        return made.body;
      };
      slab = await area("Slab", rect(0.05, 0.05, 40, 25));
      roof = await area("Roof", rect(0.6, 0.05, 10, 10));
      expect(Math.abs(slab.effective_quantity - 1000) < 1e-6 && Math.abs(roof.effective_quantity - 100) < 1e-6, `Slab ${slab.effective_quantity}, Roof ${roof.effective_quantity}`);
      return `Slab ${slab.effective_quantity} SF, Roof ${roof.effective_quantity} SF`;
    },
  },
  {
    title: "height: a Linear with height 7'-6\" drawn 40 ft long reads about 300 SF",
    run: async ({ page }) => {
      await open(page);
      await tools(page).getByRole("button", { name: "Linear", exact: true }).click();
      await form(page).waitFor();
      await form(page).getByLabel("Name", { exact: true }).fill("Wall paint");
      await changeType(page, "Convert to Area with Height");
      await form(page).getByLabel("Height", { exact: true }).fill(`7'-6"`);
      await form(page).getByRole("button", { name: "Create" }).click();
      await form(page).waitFor({ state: "detached" });
      const a = await sheetPoint(page, 0.1, 0.8);
      const b = await sheetPoint(page, 0.1 + 40 / FT / W, 0.8);
      await page.mouse.click(a.x, a.y);
      await page.mouse.dblclick(b.x, b.y);
      const item = await waitFor(() => startsWith("Wall paint"), "Wall paint saved", 10000);
      expect(Math.abs(item.effective_quantity - 300) < 3 && item.unit === "SF", `Wall paint reads ${item.effective_quantity} ${item.unit}, wanted about 300 SF`);
      return `"${item.name}", ${item.effective_quantity.toFixed(2)} ${item.unit}`;
    },
  },
  {
    title: "pitch: Roof's Properties, Apply a Slope Factor 6/12: 100 SF reads 111.80 SF",
    run: async ({ page }) => {
      await open(page);
      await more(page, "Roof", /^Properties/);
      await form(page).waitFor();
      await form(page).getByLabel("Apply a Slope Factor").check();
      await form(page).getByLabel("Pitch", { exact: true }).fill("6/12");
      const hint = ((await form(page).locator("[data-pitch-hint]").textContent()) ?? "").trim();
      await form(page).getByRole("button", { name: "Save" }).click();
      await form(page).waitFor({ state: "detached" });
      const r = await waitFor(async () => {
        const all = await items();
        const it = all.find((i) => i.uuid === roof.uuid);
        return it?.pitch_entry === "6/12" ? it : null;
      }, "6/12 stored", 10000);
      expect(Math.abs(r.effective_quantity - 111.8034) < 0.01, `Roof reads ${r.effective_quantity}`);
      return `hint "${hint}"; "${r.name}" ${r.effective_quantity.toFixed(2)} SF`;
    },
  },
  {
    title: "sub-items: Create sub-item on Slab, Mesh `PARENT * 1.05`: the preview and the stored figure read 1,050 SF, nested under Slab",
    run: async ({ page }) => {
      await open(page);
      await more(page, "Slab", "Create sub-item");
      await subs(page).waitFor();
      await subs(page).getByLabel("Description 1").fill("Mesh");
      await subs(page).getByLabel("Formula 1").fill("PARENT * 1.05");
      const preview = await qtyIn(page, 0);
      await subs(page).getByRole("button", { name: "Create", exact: true }).click();
      await subs(page).waitFor({ state: "detached" });
      const mesh = await waitFor(async () => (await kids(slab)).find((k) => k.name === "Mesh"), "Mesh saved", 10000);
      expect(preview === "1,050.00" && Math.abs(mesh.formula_qty - 1050) < 1e-9 && mesh.unit === "SF", `preview "${preview}", stored ${mesh.formula_qty} ${mesh.unit}`);
      await page.locator(`[data-sub-items="${slab.uuid}"]`).locator("[data-sub-item-qty]").filter({ hasText: /^1,050$/ }).waitFor({ timeout: 10000 });
      return `preview ${preview}; stored ${mesh.formula_qty} ${mesh.unit}; the panel shows 1,050 under Slab`;
    },
  },
  {
    title: "variables: in Manage sub-items, Add Variables \"Wall Height\" = 10; a row `{Wall Height} * 2` reads 20",
    run: async ({ page }) => {
      await open(page);
      await more(page, "Slab", "Create sub-item");
      await subs(page).waitFor();
      await subs(page).getByRole("button", { name: "Add Variables" }).click();
      const vf = page.getByRole("dialog", { name: "New variable" });
      await vf.getByLabel("Variable name").fill("Wall Height");
      await vf.getByLabel("Variable unit").selectOption("FT");
      await vf.getByLabel("Default value").fill("10");
      await vf.getByRole("button", { name: "Create" }).click();
      await subs(page).locator('[data-sub-variable="Wall Height"]').waitFor({ timeout: 10000 });
      await subs(page).getByRole("button", { name: "Add another sub-item" }).click();
      const n = await subs(page).locator("[data-sub-row]").count();
      await subs(page).getByLabel(`Description ${n}`).fill("Wall");
      await subs(page).getByLabel(`Formula ${n}`).fill("{Wall Height} * 2");
      const preview = await qtyIn(page, n - 1);
      await subs(page).getByRole("button", { name: "Save changes", exact: true }).click();
      await subs(page).waitFor({ state: "detached" });
      const wall = await waitFor(async () => (await kids(slab)).find((k) => k.name === "Wall"), "Wall saved", 10000);
      expect(wall.formula_qty === 20 && preview === "20.00", `Wall "${wall.formula_text}" = ${wall.formula_qty}, preview ${preview}`);
      return `"{Wall Height} * 2" stored as "${wall.formula_text}" = ${wall.formula_qty} (preview ${preview})`;
    },
  },
  {
    title: "folder x2: Wall paint in Framing; Folder Properties multiplier 2 shows x2 on the folder and on the row; the api stores multiplier 2",
    run: async ({ page }) => {
      const framing = await apiCall(token, "POST", `${takeoff}/folder`, { name: "Framing" });
      expect(framing.status === 201, `folder: ${framing.status}`);
      const wp = await startsWith("Wall paint");
      const filed = await apiCall(token, "PATCH", `${takeoff}/item/${wp.uuid}`, { folder_uuid: framing.body.uuid });
      expect(filed.status === 200, `file: ${filed.status}`);
      await open(page);
      await header(page, "Framing").waitFor({ timeout: 10000 });
      await header(page, "Framing").click({ button: "right" });
      await page.getByRole("menuitem", { name: "Folder Properties" }).click();
      const dialog = page.locator("[data-folder-properties]");
      await dialog.getByLabel("Multiplier").fill("2");
      await dialog.getByRole("button", { name: "Save" }).click();
      await header(page, "Framing").locator("[data-folder-multiplier]").waitFor({ timeout: 10000 });
      const badge = (await header(page, "Framing").locator("[data-folder-multiplier]").textContent()).trim();
      if (!(await row(page, wp.name).isVisible())) await header(page, "Framing").locator("button").first().click();
      await row(page, wp.name).locator("[data-item-multiplier]").waitFor({ timeout: 10000 });
      const chip = (await row(page, wp.name).locator("[data-item-multiplier]").textContent()).trim();
      const stored = await waitFor(async () => {
        const it = (await items()).find((i) => i.uuid === wp.uuid);
        return it.multiplier === 2 ? it : null;
      }, "multiplier 2", 10000);
      expect(badge === "×2" && chip === "×2", `folder "${badge}", row "${chip}"`);
      return `folder "${badge}", row "${chip}"; stored ${stored.effective_quantity.toFixed(2)} SF x ${stored.multiplier}`;
    },
  },
  {
    title: "layers: Base Bid, Alternate, Deferred Submittals; on Alternate a Count mark files under Alternate and Slab leaves the tree; back on Base Bid it returns",
    run: async ({ page }) => {
      const names = (await layers()).sort((a, b) => a.position - b.position).map((l) => l.name);
      expect(names.join() === "Base Bid,Alternate,Deferred Submittals", `layers ${names.join()}`);
      await open(page);
      await panel(page).locator("[data-active-layer]").click();
      await page.getByRole("menu", { name: "Layers" }).getByRole("menuitem", { name: /^Alternate/ }).click();
      await page.waitForFunction(() => document.querySelector("[data-active-layer]")?.getAttribute("data-active-layer") === "Alternate");
      await row(page, "Slab").waitFor({ state: "detached", timeout: 10000 }).catch(() => undefined);
      const slabListed = await row(page, "Slab").count();
      await armMeasure(page, "Count", { name: "Hydrant" });
      const pt = await sheetPoint(page, 0.85, 0.8);
      await page.mouse.click(pt.x, pt.y);
      const hydrant = await waitFor(() => byName("Hydrant"), "Hydrant saved", 10000);
      const alternate = (await layers()).find((l) => l.name === "Alternate");
      expect(hydrant.layer_uuid === alternate.uuid, `Hydrant on ${hydrant.layer_uuid}, Alternate is ${alternate.uuid}`);
      expect(slabListed === 0, "Slab (Base Bid) still listed while Alternate is the layer");
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await panel(page).locator("[data-active-layer]").click();
      await page.getByRole("menu", { name: "Layers" }).getByRole("menuitem", { name: /^Base Bid/ }).click();
      await page.waitForFunction(() => document.querySelector("[data-active-layer]")?.getAttribute("data-active-layer") === "Base Bid");
      await row(page, "Slab").waitFor({ timeout: 10000 });
      return `${names.join(", ")}; Hydrant filed on Alternate; Slab hidden on Alternate, back on Base Bid`;
    },
  },
  {
    title: "Duplicate: Slab's Duplicate suggests \"Slab (2)\" with \"Include sub-items (2)\"; the copy carries Mesh and Wall and reads 1,000 SF",
    run: async ({ page }) => {
      await open(page);
      await more(page, "Slab", "Duplicate");
      const dup = page.locator("[data-duplicate]");
      await dup.waitFor();
      const suggested = await dup.getByLabel("Duplicate name").inputValue();
      const includes = (await dup.getByText(/Include sub-items/).first().textContent())?.trim();
      await dup.getByRole("button", { name: "Duplicate" }).click();
      const copy = await waitFor(() => byName("Slab (2)"), "Slab (2)", 10000);
      const copyKids = (await kids(copy)).map((k) => k.name).sort();
      expect(suggested === "Slab (2)", `suggested "${suggested}"`);
      expect(copyKids.join() === "Mesh,Wall" && Math.abs(copy.effective_quantity - 1000) < 1e-6, `copy sub-items ${copyKids.join()}, ${copy.effective_quantity} SF`);
      return `"${suggested}", "${includes}"; the copy has ${copyKids.join(" and ")}, ${copy.effective_quantity} SF`;
    },
  },
  {
    title: "classification: Roof's Properties, Classification, search Concrete and pick DIV 03, Save: Roof files under DIV 03",
    run: async ({ page }) => {
      const tree = await apiCall(token, "GET", `${wsBase}/classification?system=csi`);
      const d03 = tree.body.find((n) => n.parent_uuid === null && n.code === "03");
      await open(page);
      const name = (await items()).find((i) => i.uuid === roof.uuid).name;
      await more(page, name, /^Properties/);
      await form(page).waitFor();
      const toggle = form(page).locator("[data-wbs]").getByRole("button", { name: /^Work Breakdown Structure/ });
      if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
      const picker = form(page).locator("[data-wbs-classification] [data-classification-picker]");
      await picker.getByLabel("Search classifications").fill("Concrete");
      await picker.locator('[data-pick="03"]').first().click();
      await form(page).getByRole("button", { name: "Save" }).click();
      await form(page).waitFor({ state: "detached" });
      const filed = await waitFor(async () => {
        const it = (await items()).find((i) => i.uuid === roof.uuid);
        return it.classification_ref_id === d03.uuid ? it : null;
      }, "Roof under DIV 03", 10000);
      return `Roof classification ${filed.classification_ref_id === d03.uuid ? "DIV 03" : filed.classification_ref_id}`;
    },
  },
  {
    title: "phone width: Manage sub-items opened, the window narrowed to 375 px: the editor stays on screen, a formula can be typed, and Save changes is in reach",
    run: async ({ page }) => {
      await open(page);
      await more(page, "Slab", "Create sub-item");
      await subs(page).waitFor();
      await page.setViewportSize({ width: 375, height: 812 });
      const inView = async () => {
        const box = await subs(page).boundingBox();
        return box && box.x >= 0 && box.x + box.width <= 375 + 0.5 ? box : null;
      };
      const box = await waitFor(inView, "the editor pulled on screen", 5000).catch(async () => {
        const b = await subs(page).boundingBox();
        throw new Error(`at 375 px the sub-items editor runs off screen: x ${b?.x}, width ${b?.width}`);
      });
      const formula = subs(page).getByLabel("Formula 1");
      await formula.scrollIntoViewIfNeeded();
      const fbox = await formula.boundingBox();
      expect(fbox && fbox.x >= 0 && fbox.x + fbox.width <= 375 + 0.5, `Formula 1 at x ${fbox?.x}, width ${fbox?.width}`);
      await formula.fill("PARENT * 1.10");
      const preview = await qtyIn(page, 0);
      expect(preview === "1,100.00", `preview at 375 px "${preview}"`);
      const save = subs(page).getByRole("button", { name: "Save changes", exact: true });
      await save.scrollIntoViewIfNeeded();
      const sbox = await save.boundingBox();
      expect(sbox && sbox.x >= 0 && sbox.x + sbox.width <= 375 + 0.5 && sbox.y >= 0 && sbox.y + sbox.height <= 812 + 0.5, `Save changes at ${JSON.stringify(sbox)}`);
      await save.click();
      await subs(page).waitFor({ state: "detached" });
      const mesh = await waitFor(async () => {
        const m = (await kids(slab)).find((k) => k.name === "Mesh");
        return Math.abs(m.formula_qty - 1100) < 1e-9 ? m : null;
      }, "Mesh 1,100 saved at 375 px", 10000);
      await page.setViewportSize({ width: 1440, height: 900 });
      return `editor at x ${Math.round(box.x)}, ${Math.round(box.width)} px wide; preview ${preview}; Save changes in reach, Mesh ${mesh.formula_qty}`;
    },
  },
]);

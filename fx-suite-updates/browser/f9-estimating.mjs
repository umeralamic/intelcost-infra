// F9, the Estimating tab (D-631, the founder's Q3 of 2026-10-18): the grid, grouping by
// classification and by custom folder, pricing in the grid, wastage, cost components, Set values,
// undo and redo, and the bid summary against the founder's own check C16.
//
//   ./fx-suite.sh refresh && ./fx-suite.sh run f9-estimating
//
// The world: one throwaway workspace and project, one landscape page (1224 × 792 pt) at 1/6 ft
// per point, three items:
//   Slab     40 × 25 ft = 1,000 SF  DIV 03, folder "Structure"
//   Footing  a 100 ft line = 100 LF DIV 03, folder "Structure"
//   Paint    20 × 10 ft = 200 SF    DIV 09, folder "Finishes"
// Priced in the grid: Slab's material $40 / SF ($40,000) and Footing's 6 MH / LF at $100 / hr
// ($60,000), so the direct cost is $100,000 with $40,000 of material: C16's inputs. With tax 8 %
// on material, overhead 10 %, profit 10 % and bond 1 %, each on the running subtotal:
//   100,000 + 3,200 = 103,200; + 10,320 = 113,520; + 11,352 = 124,872; + 1,248.72 = 126,120.72.

import { APP, apiCall, expect, fixtureOwner, run, serviceUrl, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6;
const { token, workspace, base } = await freshWorkspace("F9 Estimating");
const wsBase = base.replace(/\/project$/, "");
const project = await makeProject(token, base, { name: "Estimating one" });
const takeoff = `${base}/${project.uuid}/takeoff`;
const estimate = `${base}/${project.uuid}/estimate`;
let sheet;
const items = {};

const rect = (x0, y0, wFt, hFt) => {
  const dx = wFt / FT / W;
  const dy = hFt / FT / H;
  return [[x0, y0], [x0 + dx, y0], [x0 + dx, y0 + dy], [x0, y0 + dy]];
};
const num = (s) => Number(String(s).replace(/[^0-9.-]/g, ""));

async function item(name, type, unit, vertices, folder, division) {
  const made = await apiCall(token, "POST", `${takeoff}/item`, {
    name, type, unit, sheet_uuid: sheet.uuid, color: "#1d4ed8", folder_uuid: folder,
    geometry: { geom_type: type, vertices_json: vertices, shape_meta: { closed: type === "sf" }, client_uuid: crypto.randomUUID() },
  });
  expect(made.status === 201, `${name}: ${made.status} ${JSON.stringify(made.body)}`);
  const filed = await apiCall(token, "PATCH", `${takeoff}/item/${made.body.uuid}`, { classification_ref_id: division });
  expect(filed.status === 200, `${name} classification: ${filed.status} ${JSON.stringify(filed.body)}`);
  items[name] = filed.body;
}

const grid = (page) => page.locator("table").filter({ has: page.locator("tr[data-estimate-row]") }).first();
const row = (page, name) => page.locator(`tr[data-estimate-row="${name}"]`).first();

/** A row's cell under a header, as text. Headers are read each time: columns come and go. */
async function cell(page, name, header) {
  const heads = (await grid(page).locator("thead tr").last().locator("th").allTextContents()).map((h) => h.trim());
  const i = heads.indexOf(header);
  expect(i >= 0, `no "${header}" column in ${heads.join(" | ")}`);
  return ((await row(page, name).locator(":scope > td").nth(i).textContent()) ?? "").trim();
}
const money = async (page, name, header) => num(await cell(page, name, header));

/** Waits for a row's cell to read `want` (a number), the grid's live figure after a save. */
async function settles(page, name, header, want) {
  return waitFor(async () => {
    const v = await money(page, name, header);
    return Math.abs(v - want) < 0.005 ? { v } : null;
  }, `${name} ${header} = ${want}`, 15000).then((r) => r.v).catch(async () => {
    throw new Error(`${name} ${header}: "${await cell(page, name, header)}", wanted ${want}`);
  });
}

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating`);
  await row(page, "Slab").waitFor({ timeout: 30000 });
  const show = page.getByRole("button", { name: "Show the sidebar", exact: true });
  if (await show.isVisible()) await show.click();
}

async function rate(page, label, name, value) {
  await page.locator(`[data-rate="${label} for ${name}"]`).click();
  const input = page.getByLabel(`${label} for ${name}`, { exact: true });
  await input.fill(String(value));
  await input.press("Enter");
}

async function groupBy(page, label) {
  await page.locator("aside[data-estimate-sidebar=open]").getByRole("button").filter({ hasText: /^(Classification|Custom Folder|Scope|Subcontractor|Sheet)$/ }).first().click();
  await page.getByRole("menu", { name: "Group by" }).getByRole("menuitem", { name: label }).click();
}

/** The groups and rows in the order shown: "# group" for a group header, the row's name else. */
const order = (page) => grid(page).locator("tbody tr[data-estimate-group], tbody tr[data-estimate-row]").evaluateAll((rows) => rows.map((r) => (r.dataset.estimateGroup !== undefined ? `# ${r.dataset.estimateGroup}` : r.dataset.estimateRow)));

/** Clicks off any field, so Ctrl+Z reaches the grid's history (ignored inside an input). */
const blur = (page) => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));

await run("f9-estimating", [
  {
    title: "setup: one page at 1/6 ft per point; Slab 1,000 SF and Footing 100 LF in DIV 03 / Structure, Paint 200 SF in DIV 09 / Finishes",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "E1.pdf", buffer: makePdf([{ width: W, height: H, label: "E1" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["E1.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      const tree = await apiCall(token, "GET", `${wsBase}/classification?system=csi`);
      expect(tree.status === 200, `classification: ${tree.status}`);
      const div = (code) => tree.body.find((n) => n.parent_uuid === null && n.code === code);
      expect(div("03") && div("09"), `no DIV 03 or 09 in ${tree.body.filter((n) => !n.parent_uuid).map((n) => n.code).join(", ")}`);
      const folder = async (name) => {
        const f = await apiCall(token, "POST", `${takeoff}/folder`, { name });
        expect(f.status === 201, `folder ${name}: ${f.status} ${JSON.stringify(f.body)}`);
        return f.body.uuid;
      };
      const structure = await folder("Structure");
      const finishes = await folder("Finishes");
      await item("Slab", "sf", "SF", rect(0.05, 0.05, 40, 25), structure, div("03").uuid);
      await item("Footing", "lf", "LF", [[0.05, 0.5], [0.05 + 100 / FT / W, 0.5]], structure, div("03").uuid);
      await item("Paint", "sf", "SF", rect(0.6, 0.05, 20, 10), finishes, div("09").uuid);
      const q = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.effective_quantity]));
      expect(Math.abs(q.Slab - 1000) < 1e-6 && Math.abs(q.Footing - 100) < 1e-6 && Math.abs(q.Paint - 200) < 1e-6, `quantities ${JSON.stringify(q)}`);
      return `Slab ${q.Slab} SF, Footing ${q.Footing} LF, Paint ${q.Paint} SF; DIV ${div("03").code} and ${div("09").code}`;
    },
  },
  {
    title: "grid: one row per item with its quantity and unit; nothing priced, every Item Cost and the TOTAL row read $0",
    run: async ({ page }) => {
      await open(page);
      const got = {};
      for (const name of ["Slab", "Footing", "Paint"]) got[name] = `${num(await cell(page, name, "Qty"))} ${await cell(page, name, "Unit")}`;
      expect(got.Slab === "1000 SF" && got.Footing === "100 LF" && got.Paint === "200 SF", `rows ${JSON.stringify(got)}`);
      const total = (await grid(page).locator("tfoot tr").first().textContent()) ?? "";
      expect(/TOTAL/.test(total), `TOTAL row: "${total}"`);
      for (const name of ["Slab", "Footing", "Paint"]) expect((await money(page, name, "Item Cost")) === 0, `${name} Item Cost "${await cell(page, name, "Item Cost")}"`);
      return `Slab ${got.Slab}, Footing ${got.Footing}, Paint ${got.Paint}; Item Cost $0 each`;
    },
  },
  {
    title: "grouping: Classification puts Slab and Footing under DIV 03 and Paint under DIV 09; Custom Folder under Structure and Finishes; a group folds",
    run: async ({ page }) => {
      await open(page);
      await groupBy(page, "Classification");
      const byClass = await order(page);
      const at = (list, name) => list.indexOf(name);
      const groupOf = (list, name) => [...list.slice(0, at(list, name))].reverse().find((e) => e.startsWith("# "));
      const g03 = groupOf(byClass, "Slab");
      expect(g03 && /03/.test(g03) && groupOf(byClass, "Footing") === g03, `by classification: ${byClass.join(" / ")}`);
      expect(/09/.test(groupOf(byClass, "Paint") ?? "") && groupOf(byClass, "Paint") !== g03, `Paint: ${byClass.join(" / ")}`);
      await groupBy(page, "Custom Folder");
      await waitFor(async () => (groupOf(await order(page), "Paint") === "# Finishes" ? true : null), "Custom Folder groups", 10000).catch(async () => {
        throw new Error(`by folder: ${(await order(page)).join(" / ")}`);
      });
      const byFolder = await order(page);
      expect(groupOf(byFolder, "Slab") === "# Structure" && groupOf(byFolder, "Footing") === "# Structure", `by folder: ${byFolder.join(" / ")}`);
      await page.locator(`tr[data-estimate-group="Structure"] button[aria-expanded]`).first().click();
      await row(page, "Slab").waitFor({ state: "detached", timeout: 5000 });
      const folded = await order(page);
      expect(!folded.includes("Footing") && folded.includes("Paint"), `folded: ${folded.join(" / ")}`);
      await page.locator(`tr[data-estimate-group="Structure"] button[aria-expanded]`).first().click();
      await row(page, "Slab").waitFor();
      await groupBy(page, "Classification");
      return `classification: ${byClass.join(" / ")}; folder: ${byFolder.join(" / ")}; Structure folds`;
    },
  },
  {
    title: "pricing: Slab Unit Material Cost 40 gives $40,000; Footing 6 MH / LF at $100 / hr gives 600 MH and $60,000; TOTAL $100,000; the api holds the rates",
    run: async ({ page }) => {
      await open(page);
      await rate(page, "Unit Material Cost", "Slab", 40);
      await settles(page, "Slab", "Total Material Cost", 40000);
      await rate(page, "Unit Man Hours", "Footing", 6);
      await settles(page, "Footing", "Total Man Hours", 600);
      await rate(page, "Per Hour Wage", "Footing", 100);
      await settles(page, "Footing", "Total Labor Cost", 60000);
      await settles(page, "Slab", "Item Cost", 40000);
      await settles(page, "Footing", "Item Cost", 60000);
      const total = await grid(page).locator("tfoot tr").first().locator("td").allTextContents();
      expect(total.some((t) => num(t) === 100000), `TOTAL row: ${total.join(" | ")}`);
      // The grid shows a rate as typed; the api is read once its save has landed.
      let costs = [];
      const of = (name) => costs.find((l) => l.item_uuid === items[name].uuid) ?? {};
      await waitFor(async () => {
        costs = (await apiCall(token, "GET", `${estimate}/costs`)).body.lines;
        return Number(of("Slab").unit_material_cost) === 40 && Number(of("Footing").unit_man_hours) === 6 && Number(of("Footing").hourly_wage) === 100 ? true : null;
      }, "the rates stored", 10000).catch(() => {
        throw new Error(`api: ${JSON.stringify(costs)}`);
      });
      return "Slab $40,000 material; Footing 600 MH, $60,000 labor; TOTAL $100,000; stored";
    },
  },
  {
    title: "bid summary, C16: direct $100,000, material $40,000, tax 8 %, overhead 10 %, profit 10 %, bond 1 % reads $126,120.72",
    run: async ({ page }) => {
      const put = await apiCall(token, "PUT", `${estimate}/bid`, { tax_pct: 8, overhead_pct: 10, profit_pct: 10, bond_pct: 1, extra: [] });
      expect(put.status === 200, `bid: ${put.status} ${JSON.stringify(put.body)}`);
      await open(page);
      const summary = page.locator("[data-bid-summary]");
      await summary.waitFor();
      const amount = async (key) => num(await summary.locator(`[data-bid-line="${key}"] dd`).textContent());
      const total = await waitFor(async () => {
        const t = (await summary.locator("[data-bid-total] dd").textContent())?.trim() ?? "";
        return num(t) === 126120.72 ? t : null;
      }, "bid total", 15000).catch(async () => {
        throw new Error(`bid total "${await summary.locator("[data-bid-total] dd").textContent()}"; ${await summary.textContent()}`);
      });
      const lines = { direct: await amount("direct"), tax: await amount("tax"), overhead: await amount("overhead"), profit: await amount("profit"), bond: await amount("bond") };
      expect(lines.direct === 100000 && lines.tax === 3200 && lines.overhead === 10320 && lines.profit === 11352 && lines.bond === 1248.72, `lines ${JSON.stringify(lines)}`);
      return `direct ${lines.direct}, tax ${lines.tax}, overhead ${lines.overhead}, profit ${lines.profit}, bond ${lines.bond}; Bid total ${total}`;
    },
  },
  {
    title: "wastage: 5 % on Slab alone gives 1,050 SF and $42,000, Paint stays 200; 10 % on every LF line gives Footing 110 LF and $66,000",
    run: async ({ page }) => {
      await open(page);
      await page.locator(`button[data-wastage="Slab"]`).click();
      const dialog = page.getByRole("dialog", { name: "Wastage" });
      await dialog.waitFor();
      await dialog.getByLabel("Wastage for SF", { exact: true }).fill("5");
      await dialog.getByRole("button", { name: "Apply", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
      await settles(page, "Slab", "Qty with Wastage", 1050);
      await settles(page, "Slab", "Total Material Cost", 42000);
      await settles(page, "Paint", "Qty with Wastage", 200);

      await page.locator(`button[data-wastage="Footing"]`).click();
      await dialog.waitFor();
      await dialog.getByLabel("Apply to").selectOption("all");
      await dialog.getByLabel("Wastage for LF", { exact: true }).fill("10");
      await dialog.getByRole("button", { name: "Apply", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
      await settles(page, "Footing", "Qty with Wastage", 110);
      await settles(page, "Footing", "Total Labor Cost", 66000);
      await settles(page, "Slab", "Qty with Wastage", 1050);
      const stored = (await apiCall(token, "GET", `${estimate}/costs`)).body;
      expect(Number(stored.unit_wastage?.LF) === 10, `unit defaults ${JSON.stringify(stored.unit_wastage)}`);
      return "Slab 1,050 SF, $42,000; Paint 200 SF; Footing 110 LF, $66,000; LF default 10 % stored";
    },
  },
  {
    title: "cost components: a Material component on Paint at $2 × QTY gives $400, and Paint's material rate reads From components",
    run: async ({ page }) => {
      await open(page);
      await row(page, "Paint").click({ button: "right" });
      await page.getByRole("menuitem", { name: "Add cost component" }).hover();
      await page.getByRole("menuitem", { name: "Material", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Add Material" });
      await dialog.waitFor();
      await dialog.getByLabel("Name", { exact: true }).fill("Paint gallons");
      await dialog.getByLabel("Quantity formula").fill("QTY");
      await dialog.getByLabel("Unit price").fill("2");
      const preview = (await dialog.locator("[data-component-total]").textContent())?.trim() ?? "";
      await dialog.getByRole("button", { name: "Add", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
      await settles(page, "Paint", "Total Material Cost", 400);
      expect((await page.locator(`[data-rate="Unit Material Cost for Paint"]`).count()) === 0, "Paint's material rate is still editable");
      await page.getByRole("button", { name: "Show cost components" }).first().click();
      await page.locator(`tr[data-component-row="Paint gallons"]`).waitFor({ timeout: 5000 });
      const stored = (await apiCall(token, "GET", `${estimate}/components`)).body;
      return `preview "${preview}"; Paint $400 material from components; component row shown; api ${Array.isArray(stored) ? stored.length : "?"} component(s)`;
    },
  },
  {
    title: "Set values: Subcontract $500 on Slab and Footing in one step; Ctrl+Z takes both back, Ctrl+Y puts both back",
    run: async ({ page }) => {
      await open(page);
      await page.getByLabel("Select Slab", { exact: true }).check();
      await page.getByLabel("Select Footing", { exact: true }).check();
      const bar = page.locator("[data-selection-bar]");
      expect(/2 rows selected/.test((await bar.textContent()) ?? ""), `bar: ${await bar.textContent()}`);
      await bar.getByRole("button", { name: "Set values…" }).click();
      const dialog = page.getByRole("dialog", { name: "Set values on 2 rows" });
      await dialog.waitFor();
      await dialog.getByLabel("Subcontract", { exact: true }).fill("500");
      await dialog.getByRole("button", { name: "Apply to 2 rows" }).click();
      await dialog.waitFor({ state: "detached" });
      await page.getByText("Updated 2 rows").first().waitFor({ timeout: 10000 });
      await settles(page, "Slab", "Subcontract", 500);
      await settles(page, "Footing", "Subcontract", 500);
      await settles(page, "Paint", "Subcontract", 0);

      await blur(page);
      await page.keyboard.press("Control+z");
      await settles(page, "Slab", "Subcontract", 0);
      await settles(page, "Footing", "Subcontract", 0);
      let undone = [];
      await waitFor(async () => {
        undone = (await apiCall(token, "GET", `${estimate}/costs`)).body.lines.filter((l) => l.subcontract_cost != null && Number(l.subcontract_cost) !== 0);
        return undone.length === 0 ? true : null;
      }, "the undo stored", 10000).catch(() => {
        throw new Error(`api after undo: ${JSON.stringify(undone)}`);
      });
      await page.keyboard.press("Control+y");
      await settles(page, "Slab", "Subcontract", 500);
      await settles(page, "Footing", "Subcontract", 500);
      return "Updated 2 rows; Ctrl+Z both back to none (api too); Ctrl+Y both $500 again";
    },
  },
  {
    title: "undo a rate: Slab material 40 to 45 shows $47,250; Ctrl+Z gives back 40 and $42,000",
    run: async ({ page }) => {
      await open(page);
      await rate(page, "Unit Material Cost", "Slab", 45);
      await settles(page, "Slab", "Total Material Cost", 47250);
      await blur(page);
      await page.keyboard.press("Control+z");
      await settles(page, "Slab", "Total Material Cost", 42000);
      let slab = null;
      await waitFor(async () => {
        slab = (await apiCall(token, "GET", `${estimate}/costs`)).body.lines.find((l) => l.item_uuid === items.Slab.uuid);
        return Number(slab?.unit_material_cost) === 40 ? true : null;
      }, "the undo stored", 10000).catch(() => {
        throw new Error(`api ${JSON.stringify(slab)}`);
      });
      return "45 → $47,250; Ctrl+Z → 40, $42,000 (api 40)";
    },
  },
  {
    title: "undo wastage (D-633): 20 % on Paint alone, Ctrl+Z back to 200 SF, Ctrl+Y 240; 8 % on every SF line, Ctrl+Z puts back Slab's own 5 % and Paint's 200",
    run: async ({ page }) => {
      await open(page);
      const dialog = page.getByRole("dialog", { name: "Wastage" });
      const apply = async (name, unit, pct, all = false) => {
        await page.locator(`button[data-wastage="${name}"]`).click();
        await dialog.waitFor();
        if (all) await dialog.getByLabel("Apply to").selectOption("all");
        await dialog.getByLabel(`Wastage for ${unit}`, { exact: true }).fill(String(pct));
        await dialog.getByRole("button", { name: "Apply", exact: true }).click();
        await dialog.waitFor({ state: "detached" });
      };
      await apply("Paint", "SF", 20);
      await settles(page, "Paint", "Qty with Wastage", 240);
      await blur(page);
      await page.keyboard.press("Control+z");
      await settles(page, "Paint", "Qty with Wastage", 200);
      await page.keyboard.press("Control+y");
      await settles(page, "Paint", "Qty with Wastage", 240);
      await page.keyboard.press("Control+z");
      await settles(page, "Paint", "Qty with Wastage", 200);

      await apply("Paint", "SF", 8, true);
      await settles(page, "Slab", "Qty with Wastage", 1080);
      await settles(page, "Paint", "Qty with Wastage", 216);
      await blur(page);
      await page.keyboard.press("Control+z");
      await settles(page, "Slab", "Qty with Wastage", 1050);
      await settles(page, "Paint", "Qty with Wastage", 200);
      await settles(page, "Footing", "Qty with Wastage", 110);
      let stored = null;
      await waitFor(async () => {
        stored = (await apiCall(token, "GET", `${estimate}/costs`)).body;
        const slab = stored.lines.find((l) => l.item_uuid === items.Slab.uuid);
        return Number(slab?.wastage_pct_override) === 5 && Number(stored.unit_wastage?.SF ?? 0) === 0 && Number(stored.unit_wastage?.LF) === 10 ? true : null;
      }, "the undo stored", 10000).catch(() => {
        throw new Error(`api after undo: ${JSON.stringify(stored)}`);
      });
      return "Paint 240 → Ctrl+Z 200 → Ctrl+Y 240 → Ctrl+Z 200; all SF 8 % (Slab 1,080, Paint 216) → Ctrl+Z Slab 1,050 (its 5 % back), Paint 200, LF 10 % kept";
    },
  },
  {
    title: "undo cost components (D-633): an edit ($2 → $3), an add (Primer $1) and a delete (Clear rates) each come back with Ctrl+Z and go again with Ctrl+Y",
    run: async ({ page }) => {
      await open(page);
      const show = page.getByRole("button", { name: "Show cost components" }).first();
      const reveal = async () => {
        if (await show.isVisible().catch(() => false)) await show.click();
      };
      const components = async () => (await apiCall(token, "GET", `${estimate}/components`)).body.map((c) => `${c.name} ${Number(c.unit_price)}`).sort();
      await reveal();
      await page.locator(`button[data-component="Paint gallons"]`).click();
      const editDialog = page.getByRole("dialog", { name: "Material", exact: true });
      await editDialog.waitFor();
      await editDialog.getByLabel("Unit price").fill("3");
      await editDialog.getByRole("button", { name: "Save", exact: true }).click();
      await editDialog.waitFor({ state: "detached" });
      await settles(page, "Paint", "Total Material Cost", 600);
      await blur(page);
      await page.keyboard.press("Control+z");
      await settles(page, "Paint", "Total Material Cost", 400);
      await page.keyboard.press("Control+y");
      await settles(page, "Paint", "Total Material Cost", 600);
      await page.keyboard.press("Control+z");
      await settles(page, "Paint", "Total Material Cost", 400);

      await row(page, "Paint").click({ button: "right" });
      await page.getByRole("menuitem", { name: "Add cost component" }).hover();
      await page.getByRole("menuitem", { name: "Material", exact: true }).click();
      const addDialog = page.getByRole("dialog", { name: "Add Material" });
      await addDialog.waitFor();
      await addDialog.getByLabel("Name", { exact: true }).fill("Primer");
      await addDialog.getByLabel("Quantity formula").fill("QTY");
      await addDialog.getByLabel("Unit price").fill("1");
      await addDialog.getByRole("button", { name: "Add", exact: true }).click();
      await addDialog.waitFor({ state: "detached" });
      await settles(page, "Paint", "Total Material Cost", 600);
      await blur(page);
      await page.keyboard.press("Control+z");
      await settles(page, "Paint", "Total Material Cost", 400);
      const afterAddUndo = await components();
      expect(afterAddUndo.join() === "Paint gallons 2", `components after undoing the add: ${afterAddUndo.join(", ")}`);
      await page.keyboard.press("Control+y");
      await settles(page, "Paint", "Total Material Cost", 600);
      await page.keyboard.press("Control+z");
      await settles(page, "Paint", "Total Material Cost", 400);

      await reveal();
      await page.locator(`button[data-component="Paint gallons"]`).click();
      await editDialog.waitFor();
      await editDialog.getByRole("button", { name: "Delete" }).click();
      const ask = page.getByRole("dialog", { name: /Delete “Paint gallons”\?/ });
      await ask.waitFor();
      await ask.getByRole("button", { name: "Clear rates" }).click();
      await ask.waitFor({ state: "detached" });
      await settles(page, "Paint", "Total Material Cost", 0);
      await blur(page);
      await page.keyboard.press("Control+z");
      await settles(page, "Paint", "Total Material Cost", 400);
      const afterDeleteUndo = await components();
      expect(afterDeleteUndo.join() === "Paint gallons 2", `components after undoing the delete: ${afterDeleteUndo.join(", ")}`);
      await page.keyboard.press("Control+y");
      await settles(page, "Paint", "Total Material Cost", 0);
      await page.keyboard.press("Control+z");
      await settles(page, "Paint", "Total Material Cost", 400);
      return "edit $600 ↔ $400; add Primer $600 → Ctrl+Z $400 (one component) → Ctrl+Y → Ctrl+Z; delete $0 → Ctrl+Z $400 (component back) → Ctrl+Y $0 → Ctrl+Z $400";
    },
  },
  {
    title: "slow load (M3, D-690): on a cold open with the rates' read held 5 s, Paint's Unit Man Hours typed during the load keeps 0.25 after the late read lands, after a reload and in a second window",
    run: async ({ page, context }) => {
      // The first read of the rates is answered by the api at once (the figures as they were before
      // the save) and handed to the page only 5 s later: a slow connection, on an empty cache.
      let held = 0;
      let landedAt = 0;
      let holdError = null;
      await page.route(/\/estimate\/costs(\?|$)/, async (route) => {
        if (route.request().method() !== "GET" || held > 0) return route.fallback();
        held += 1;
        try {
          // Fetched from here, over the compose network (the page's localhost is not this one's).
          const url = route.request().url();
          const response = await route.fetch({ url: serviceUrl(url) ?? url });
          await new Promise((r) => setTimeout(r, 5000));
          await route.fulfill({ response });
        } catch (error) {
          holdError = String(error).slice(0, 200);
          await route.abort().catch(() => undefined);
        }
        landedAt = Date.now();
      });
      const before = (await apiCall(token, "GET", `${estimate}/costs`)).body.lines.find((l) => l.item_uuid === items.Paint.uuid) ?? {};
      expect(Number(before.unit_man_hours ?? 0) !== 0.25, `Paint already holds 0.25 MH: ${JSON.stringify(before)}`);
      await open(page);
      expect(held === 1 && landedAt === 0, `the rates' read was not held: held ${held}, landed ${landedAt}`);
      const saved = page.waitForResponse((r) => r.request().method() === "PATCH" && /\/estimate\/costs\//.test(r.url()) && r.ok());
      await rate(page, "Unit Man Hours", "Paint", 0.25);
      await saved;
      const savedAt = Date.now();
      // The held read lands after the save.
      await waitFor(async () => (landedAt ? true : null), "the held read to land", 15000);
      expect(!holdError, `the held read failed: ${holdError}`);
      expect(landedAt > savedAt, `the held read landed before the save (${landedAt} ≤ ${savedAt}): nothing was tested`);
      const shown = async (p) => num(await p.locator(`[data-rate="Unit Man Hours for Paint"]`).textContent());
      // Read again and again after it: nothing may move the cell off 0.25 once the late read is in.
      const reads = [];
      await waitFor(async () => {
        reads.push(await shown(page));
        return reads.length >= 5 ? true : null;
      }, "five reads of the cell", 10000);
      expect(reads.every((v) => v === 0.25), `Paint's Unit Man Hours after the late read: ${reads.join(", ")}`);
      const stored = (await apiCall(token, "GET", `${estimate}/costs`)).body.lines.find((l) => l.item_uuid === items.Paint.uuid) ?? {};
      expect(Number(stored.unit_man_hours) === 0.25, `api: ${JSON.stringify(stored)}`);
      await page.unroute(/\/estimate\/costs(\?|$)/);
      await page.reload();
      await row(page, "Paint").waitFor({ timeout: 30000 });
      await waitFor(async () => ((await shown(page)) === 0.25 ? true : null), "0.25 after a reload", 15000).catch(async () => {
        throw new Error(`after a reload: ${await shown(page)}`);
      });
      const second = await context.browser().newContext({ viewport: { width: 1440, height: 900 } });
      try {
        const other = await second.newPage();
        await open(other);
        await waitFor(async () => ((await shown(other)) === 0.25 ? true : null), "0.25 in a second window", 15000).catch(async () => {
          throw new Error(`in a second window: ${await shown(other)}`);
        });
      } finally {
        await second.close();
      }
      return `typed during the load; the held read landed ${landedAt - savedAt} ms after the save; the cell read 0.25 five times after it; the api, a reload and a second window hold 0.25`;
    },
  },
]);

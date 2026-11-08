// C15, the founder's click check of the Estimating sidebar and its reports (F9c, D-126, D-127):
// each report's figure equals the full estimate's TOTAL column for its type, the sidebar's fold
// holds after a reload, the Needs attention count matches the rows marked, and Set values on ten
// rows changes only those ten and one Ctrl+Z restores them.
//
//   node fx-run-locked.mjs c15-reports
//
// The world: one throwaway workspace and project, one landscape page at 1/6 ft per point, twelve
// 10 × 10 ft areas (100 SF each), priced through the api:
//   Labor 1-3     1 MH / SF at $50 / hr      $5,000 each   $15,000 labor
//   Material 1-3  $10 / SF                   $1,000 each    $3,000 material
//   Equip 1-2     $5 / SF equipment            $500 each    $1,000 equipment
//   Sub 1-2       $700 subcontract, no subcontractor        $1,400 subcontract (needs attention)
//   Open 1-2      no rate                                   (needs attention)
// So the full estimate is $20,400, and four rows need attention.
//
// Left for the founder's eye: the look of the reports' active state and the folded strip, the
// hover reasons on the attention marker, and how quick Set values and undo feel on a big estimate.

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6;
const { token, workspace, base } = await freshWorkspace("C15 Reports");
const project = await makeProject(token, base, { name: "Reports one" });
const takeoff = `${base}/${project.uuid}/takeoff`;
const estimate = `${base}/${project.uuid}/estimate`;
let sheet;
const items = {};

const NAMES = ["Labor 1", "Labor 2", "Labor 3", "Material 1", "Material 2", "Material 3", "Equip 1", "Equip 2", "Sub 1", "Sub 2", "Open 1", "Open 2"];
const PICKED = NAMES.slice(0, 10);
const LEFT = NAMES.slice(10);
const PRICES = {
  Labor: { unit_man_hours: 1, hourly_wage: 50 },
  Material: { unit_material_cost: 10 },
  Equip: { unit_equipment_cost: 5 },
  Sub: { subcontract_cost: 700 },
};

const rect = (x0, y0, wFt, hFt) => {
  const dx = wFt / FT / W;
  const dy = hFt / FT / H;
  return [[x0, y0], [x0 + dx, y0], [x0 + dx, y0 + dy], [x0, y0 + dy]];
};
const num = (s) => Number(String(s).replace(/[^0-9.-]/g, ""));

const grid = (page) => page.locator("table").filter({ has: page.locator("tr[data-estimate-row]") }).first();
const row = (page, name) => page.locator(`tr[data-estimate-row="${name}"]`).first();
const heads = async (page) => (await grid(page).locator("thead tr").last().locator("th").allTextContents()).map((h) => h.trim());

/** The TOTAL row's figure under a header, as a number. */
async function total(page, header) {
  const h = await heads(page);
  const i = h.indexOf(header);
  expect(i >= 0, `no "${header}" column in ${h.join(" | ")}`);
  return num(await grid(page).locator("tfoot tr").first().locator("td").nth(i).textContent());
}
async function cell(page, name, header) {
  const h = await heads(page);
  const i = h.indexOf(header);
  expect(i >= 0, `no "${header}" column in ${h.join(" | ")}`);
  return ((await row(page, name).locator(":scope > td").nth(i).textContent()) ?? "").trim();
}
/** Every row's cells, by name, as the grid shows them. */
async function snapshot(page) {
  const out = {};
  for (const name of NAMES) out[name] = (await row(page, name).locator(":scope > td").allTextContents()).map((t) => t.trim());
  return out;
}
const sidebar = (page) => page.locator("aside[data-estimate-sidebar]");
const figure = async (page, id) => num(await page.locator(`[data-report="${id}"] span`).last().textContent());

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating`);
  await row(page, "Labor 1").waitFor({ timeout: 30000 });
  // The Takeoff Ref. column fills when the sheet list lands, after the rows: a snapshot taken before
  // it read every ref blank and the next one "changed" (fixture timing, 2026-10-24).
  await page.waitForFunction(() => (document.querySelector('tr[data-estimate-row="Open 1"] td:nth-child(3)')?.textContent ?? "").trim() !== "", null, { timeout: 30000 });
  const show = page.getByRole("button", { name: "Show the sidebar", exact: true });
  if (await show.isVisible()) await show.click();
  await page.locator("aside[data-estimate-sidebar=open]").waitFor();
}

async function report(page, id) {
  await page.locator(`[data-report="${id}"]`).click();
  await page.locator(`[data-report="${id}"][aria-checked="true"]`).waitFor();
}

/** Waits until a probe's figure reads `want`. */
const reads = (probe, want, what) =>
  waitFor(async () => (Math.abs((await probe()) - want) < 0.005 ? true : null), what, 15000).catch(async () => {
    throw new Error(`${what}: read ${await probe()}, wanted ${want}`);
  });

await run("c15-reports", [
  {
    title: "setup: twelve 100 SF areas; three labor, three material, two equipment, two subcontract with no subcontractor, two unpriced",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "R1.pdf", buffer: makePdf([{ width: W, height: H, label: "R1" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["R1.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      for (const [i, name] of NAMES.entries()) {
        const x = 0.03 + (i % 6) * 0.15;
        const y = 0.05 + Math.floor(i / 6) * 0.4;
        const made = await apiCall(token, "POST", `${takeoff}/item`, {
          name, type: "sf", unit: "SF", sheet_uuid: sheet.uuid, color: "#1d4ed8",
          geometry: { geom_type: "sf", vertices_json: rect(x, y, 10, 10), shape_meta: { closed: true }, client_uuid: crypto.randomUUID() },
        });
        expect(made.status === 201, `${name}: ${made.status} ${JSON.stringify(made.body)}`);
        expect(Math.abs(made.body.effective_quantity - 100) < 1e-6, `${name} quantity ${made.body.effective_quantity}`);
        items[name] = made.body;
      }
      const lines = NAMES.filter((n) => PRICES[n.split(" ")[0]]).map((n) => ({ item_uuid: items[n].uuid, changes: PRICES[n.split(" ")[0]] }));
      const priced = await apiCall(token, "PATCH", `${estimate}/costs`, { lines });
      expect(priced.status === 200, `pricing: ${priced.status} ${JSON.stringify(priced.body)}`);
      return `${NAMES.length} items of 100 SF; ${lines.length} priced`;
    },
  },
  {
    title: "reports: Labor, Material, Equipment and Subcontract each read the full estimate's TOTAL column for its type, in the sidebar and in their own TOTAL row; Full estimate reads TOTAL Item Cost",
    run: async ({ page }) => {
      await open(page);
      await report(page, "all");
      const want = { labor: 15000, material: 3000, equipment: 1000, subcontract: 1400, all: 20400 };
      const columns = { labor: "Total Labor Cost", material: "Total Material Cost", equipment: "Total Equipment", subcontract: "Subcontract", all: "Item Cost" };
      const full = {};
      for (const [id, header] of Object.entries(columns)) {
        await reads(() => total(page, header), want[id], `full estimate TOTAL ${header}`);
        full[id] = await total(page, header);
      }
      const seen = [];
      for (const id of ["labor", "material", "equipment", "subcontract"]) {
        const side = await figure(page, id);
        expect(Math.abs(side - full[id]) < 0.005, `${id} in the sidebar ${side}, the full estimate's ${columns[id]} ${full[id]}`);
        await report(page, id);
        await page.locator("[data-report-title]").filter({ hasText: "report" }).waitFor();
        // A cost report has one money column, its own type's (D-766 F0: the repeated "Labor cost" Item Cost
        // column is gone).
        await reads(() => total(page, columns[id]), full[id], `${id} report's TOTAL ${columns[id]}`);
        seen.push(`${id} ${side}`);
      }
      await report(page, "all");
      const all = await figure(page, "all");
      expect(Math.abs(all - full.all) < 0.005, `Full estimate in the sidebar ${all}, TOTAL Item Cost ${full.all}`);
      const sum = full.labor + full.material + full.equipment + full.subcontract;
      expect(Math.abs(sum - full.all) < 0.005, `the four types add to ${sum}, TOTAL Item Cost ${full.all}`);
      return `${seen.join(", ")}; full ${all} = the four types' sum`;
    },
  },
  {
    title: "sidebar: Hide folds it to the strip, a reload keeps it folded, Show opens it and a reload keeps it open",
    run: async ({ page }) => {
      await open(page);
      await page.getByRole("button", { name: "Hide the sidebar", exact: true }).click();
      await page.locator("aside[data-estimate-sidebar=collapsed]").waitFor();
      await page.reload();
      await row(page, "Labor 1").waitFor({ timeout: 30000 });
      const after = await sidebar(page).getAttribute("data-estimate-sidebar");
      expect(after === "collapsed", `after a reload the sidebar is "${after}"`);
      await page.getByRole("button", { name: "Show the sidebar", exact: true }).click();
      await page.locator("aside[data-estimate-sidebar=open]").waitFor();
      await page.reload();
      await row(page, "Labor 1").waitFor({ timeout: 30000 });
      const again = await sidebar(page).getAttribute("data-estimate-sidebar");
      expect(again === "open", `after the second reload the sidebar is "${again}"`);
      return "folded, reload: folded; opened, reload: open";
    },
  },
  {
    title: "Needs attention: the count reads 4, four rows carry the marker (Sub 1, Sub 2, Open 1, Open 2), and its list's Every line shows just those four (D-766)",
    run: async ({ page }) => {
      await open(page);
      const button = page.locator("[data-needs-attention]");
      const count = Number(await button.getAttribute("data-needs-attention"));
      const shownCount = num(await button.locator("span").last().textContent());
      const marked = await grid(page).locator("tr[data-estimate-row]").filter({ has: page.locator("[data-attention]") }).evaluateAll((rs) => rs.map((r) => r.dataset.estimateRow).sort());
      const want = ["Open 1", "Open 2", "Sub 1", "Sub 2"];
      expect(count === marked.length && shownCount === count, `count ${count} (shows ${shownCount}), marked ${marked.length}: ${marked.join(", ")}`);
      expect(marked.join() === want.join(), `marked rows ${marked.join(", ")}, wanted ${want.join(", ")}`);
      // D-766: the line opens its list in categories; "Every line that needs attention" shows just those lines.
      await button.click();
      await page.locator("[data-attention-list] [data-attention-cat=all]").click();
      await page.locator("[data-attention-list]").waitFor({ state: "detached" });
      await waitFor(async () => ((await grid(page).locator("tr[data-estimate-row]").count()) === want.length ? true : null), "only the marked rows", 10000).catch(async () => {
        throw new Error(`with the list's Every line picked: ${await grid(page).locator("tr[data-estimate-row]").evaluateAll((rs) => rs.map((r) => r.dataset.estimateRow).join(", "))}`);
      });
      const shown = await grid(page).locator("tr[data-estimate-row]").evaluateAll((rs) => rs.map((r) => r.dataset.estimateRow).sort());
      expect(shown.join() === want.join(), `with the list's Every line picked: ${shown.join(", ")}`);
      await button.click();
      await page.locator("[data-attention-list]").getByRole("button", { name: "Show every line" }).click();
      await row(page, "Labor 1").waitFor();
      return `count ${count}; marked ${marked.join(", ")}; Every line shows those four, Show every line the rest`;
    },
  },
  {
    title: "Set values: Unit Equipment $3 on ten rows changes only those ten (Equipment $300 each), the two left alone keep every cell; one Ctrl+Z puts all ten back, in the grid and the api",
    run: async ({ page }) => {
      await open(page);
      const before = await snapshot(page);
      for (const name of PICKED) await page.getByLabel(`Select ${name}`, { exact: true }).check();
      const bar = page.locator("[data-selection-bar]");
      expect(/10 rows selected/.test((await bar.textContent()) ?? ""), `bar: ${await bar.textContent()}`);
      await bar.getByRole("button", { name: "Set values…" }).click();
      const dialog = page.getByRole("dialog", { name: "Set values on 10 rows" });
      await dialog.waitFor();
      await dialog.getByLabel("Unit Equipment", { exact: true }).fill("3");
      await dialog.getByRole("button", { name: "Apply to 10 rows" }).click();
      await dialog.waitFor({ state: "detached" });
      await page.getByText("Updated 10 rows").first().waitFor({ timeout: 10000 });
      for (const name of PICKED) await reads(async () => num(await cell(page, name, "Total Equipment")), 300, `${name} Total Equipment`);
      const after = await snapshot(page);
      const h = await heads(page);
      const allowed = new Set(["Unit Equipment", "Total Equipment", "Item Cost", ""].map((x) => h.indexOf(x)).filter((i) => i >= 0));
      for (const name of LEFT) expect(JSON.stringify(after[name]) === JSON.stringify(before[name]), `${name} changed: ${JSON.stringify(before[name])} → ${JSON.stringify(after[name])}`);
      for (const name of PICKED) {
        const moved = after[name].map((v, i) => (v !== before[name][i] ? i : -1)).filter((i) => i >= 0 && !allowed.has(i) && i > 0);
        expect(moved.length === 0, `${name} changed outside equipment: ${moved.map((i) => `${h[i]} "${before[name][i]}" → "${after[name][i]}"`).join("; ")}`);
      }
      await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
      await page.keyboard.press("Control+z");
      for (const name of PICKED) await reads(async () => num(await cell(page, name, "Total Equipment")), name.startsWith("Equip") ? 500 : 0, `${name} Total Equipment after Ctrl+Z`);
      let stored = [];
      await waitFor(async () => {
        stored = (await apiCall(token, "GET", `${estimate}/costs`)).body.lines;
        const eq = (n) => stored.find((l) => l.item_uuid === items[n].uuid)?.unit_equipment_cost;
        return PICKED.every((n) => (n.startsWith("Equip") ? Number(eq(n)) === 5 : eq(n) == null || Number(eq(n)) === 0)) ? true : null;
      }, "the undo stored", 10000).catch(() => {
        throw new Error(`api after undo: ${JSON.stringify(stored.map((l) => [l.item_uuid, l.unit_equipment_cost]))}`);
      });
      const undone = await snapshot(page);
      const differ = NAMES.filter((n) => JSON.stringify(undone[n].slice(1)) !== JSON.stringify(before[n].slice(1)));
      expect(differ.length === 0, `rows not back after Ctrl+Z: ${differ.map((n) => `${n} ${JSON.stringify(before[n])} → ${JSON.stringify(undone[n])}`).join("; ")}`);
      return "Updated 10 rows, each $300 equipment; Open 1 and 2 untouched; one Ctrl+Z: every row as before (api too)";
    },
  },
]);

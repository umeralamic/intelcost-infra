// C16's last line, the founder's click check of the bid summary (F9b, D-128): "the export's Bid
// Summary sheet recalculates in Excel". f9-estimating checks the panel's $126,120.72 and
// f9-exports the sheet's value; this checks the sheet carries live formulas, not typed numbers:
// each markup's amount is ROUND(base × its rate cell, 2) and each subtotal the one above plus it,
// down to the Bid total. The formulas are worked here, by a small evaluator, from the sheet's own
// input cells: they give back the cached $126,120.72, and with the tax rate cell changed from 8 %
// to 10 % they give $127,098.40, as Excel would on recalculating.
//
//   node fx-run-locked.mjs c16-bid-formulas
//
// The world: one throwaway workspace and project, one page at 1/6 ft per point. Slab 40 × 25 ft at
// $40 / SF material ($40,000); Footing 100 LF at 6 MH / LF and $100 / hr ($60,000). Direct $100,000,
// material $40,000; tax 8 %, overhead 10 %, profit 10 %, bond 1 %: C16's inputs.
//
// Left for the founder's eye: opening the file in Excel itself and typing a new rate.

import { readFileSync } from "node:fs";

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { readWorkbook } from "./lib/xlsx-zip.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6;
const { token, workspace, base } = await freshWorkspace("C16 Bid formulas");
const project = await makeProject(token, base, { name: "Bid one" });
const takeoff = `${base}/${project.uuid}/takeoff`;
const estimate = `${base}/${project.uuid}/estimate`;
let sheet;
let bid;

const rect = (x0, y0, wFt, hFt) => {
  const dx = wFt / FT / W;
  const dy = hFt / FT / H;
  return [[x0, y0], [x0 + dx, y0], [x0 + dx, y0 + dy], [x0, y0 + dy]];
};

/** Works one cell: a number, or its formula over the other cells (+ - * /, parentheses, ROUND). */
function evaluator(cells) {
  const seen = new Map();
  const value = (ref) => {
    if (seen.has(ref)) return seen.get(ref);
    const cell = cells[ref];
    if (!cell) return 0;
    const v = cell.formula ? work(cell.formula) : Number(cell.value);
    seen.set(ref, v);
    return v;
  };
  const work = (text) => {
    const tokens = text.match(/[A-Z]+\d+|ROUND|\d+(?:\.\d+)?|[-+*/(),]/g) ?? [];
    let i = 0;
    const peek = () => tokens[i];
    const next = () => tokens[i++];
    const primary = () => {
      const t = next();
      if (t === "(") {
        const v = sum();
        next();
        return v;
      }
      if (t === "-") return -primary();
      if (t === "ROUND") {
        next();
        const a = sum();
        next();
        const d = sum();
        next();
        const k = 10 ** d;
        return Math.round((a + Number.EPSILON) * k) / k;
      }
      if (/^[A-Z]+\d+$/.test(t)) return value(t);
      if (/^\d/.test(t)) return Number(t);
      throw new Error(`cannot read "${text}" at "${t}"`);
    };
    const product = () => {
      let v = primary();
      while (peek() === "*" || peek() === "/") v = next() === "*" ? v * primary() : v / primary();
      return v;
    };
    const sum = () => {
      let v = product();
      while (peek() === "+" || peek() === "-") v = next() === "+" ? v + product() : v - product();
      return v;
    };
    return sum();
  };
  return { value, reset: () => seen.clear() };
}

await run("c16-bid-formulas", [
  {
    title: "setup: Slab $40,000 material and Footing $60,000 labor; C16's bid rates 8 / 10 / 10 / 1 %",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "B1.pdf", buffer: makePdf([{ width: W, height: H, label: "B1" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["B1.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      const item = async (body) => {
        const made = await apiCall(token, "POST", `${takeoff}/item`, { sheet_uuid: sheet.uuid, color: "#1d4ed8", ...body });
        expect(made.status === 201, `${body.name}: ${made.status} ${JSON.stringify(made.body)}`);
        return made.body;
      };
      const slab = await item({ name: "Slab", type: "sf", unit: "SF", geometry: { geom_type: "sf", vertices_json: rect(0.05, 0.05, 40, 25), shape_meta: { closed: true }, client_uuid: crypto.randomUUID() } });
      const footing = await item({ name: "Footing", type: "lf", unit: "LF", geometry: { geom_type: "lf", vertices_json: [[0.05, 0.6], [0.05 + 100 / FT / W, 0.6]], shape_meta: { closed: false }, client_uuid: crypto.randomUUID() } });
      const priced = await apiCall(token, "PATCH", `${estimate}/costs`, {
        lines: [
          { item_uuid: slab.uuid, changes: { unit_material_cost: 40 } },
          { item_uuid: footing.uuid, changes: { unit_man_hours: 6, hourly_wage: 100 } },
        ],
      });
      expect(priced.status === 200, `pricing: ${priced.status} ${JSON.stringify(priced.body)}`);
      const put = await apiCall(token, "PUT", `${estimate}/bid`, { tax_pct: 8, overhead_pct: 10, profit_pct: 10, bond_pct: 1, extra: [] });
      expect(put.status === 200, `bid: ${put.status} ${JSON.stringify(put.body)}`);
      return `Slab ${slab.effective_quantity} SF, Footing ${footing.effective_quantity} LF; 8 / 10 / 10 / 1 %`;
    },
  },
  {
    title: "export With formulas: the Bid Summary sheet's amounts, subtotals and Bid total are formulas over its rate cells, and its cached total is $126,120.72",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating`);
      await page.locator(`tr[data-estimate-row="Slab"]`).waitFor({ timeout: 30000 });
      const show = page.getByRole("button", { name: "Show the sidebar", exact: true });
      if (await show.isVisible()) await show.click();
      await page.locator("[data-bid-summary] [data-bid-total] dd").filter({ hasText: "126,120.72" }).waitFor({ timeout: 15000 });
      await page.getByRole("button", { name: "Export", exact: true }).first().click();
      const dialog = page.getByRole("dialog", { name: "Export to Excel" });
      await dialog.waitFor();
      for (const choice of ["All columns", "All rows", "With formulas"]) await dialog.getByRole("radio", { name: choice, exact: true }).click();
      const [download] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), dialog.getByRole("button", { name: "Export", exact: true }).click()]);
      const book = readWorkbook(readFileSync(await download.path()));
      bid = book.sheets.find((s) => s.name === "Bid Summary");
      expect(bid, `no Bid Summary sheet in ${book.sheets.map((s) => s.name).join(", ")}`);
      const label = (r) => (bid.rows[r - 1]?.[0] ?? "").trim();
      const lines = {};
      for (let r = 1; r <= bid.rows.length; r += 1) lines[label(r)] = r;
      for (const name of ["Direct cost", "Sales tax", "Overhead", "Profit", "Bond", "Bid total"]) {
        const found = Object.keys(lines).find((l) => l.startsWith(name));
        expect(found, `no "${name}" row in ${Object.keys(lines).join(" | ")}`);
        lines[name] = lines[found];
      }
      const formulaOf = (ref) => bid.cells[ref]?.formula ?? null;
      const missing = [];
      for (const name of ["Sales tax", "Overhead", "Profit", "Bond"]) {
        const r = lines[name];
        if (!/ROUND\(.*\*B\d+,\s*2\)/.test(formulaOf(`C${r}`) ?? "")) missing.push(`C${r} (${name} amount) "${formulaOf(`C${r}`)}"`);
        if (!formulaOf(`D${r}`)) missing.push(`D${r} (${name} subtotal)`);
        expect(bid.cells[`B${r}`] && !formulaOf(`B${r}`), `B${r} (${name} rate) is not a plain value`);
      }
      const total = `D${lines["Bid total"]}`;
      if (!formulaOf(total)) missing.push(`${total} (Bid total)`);
      expect(missing.length === 0, `cells with no formula: ${missing.join("; ")}`);
      const cached = Number(bid.cells[total].value);
      expect(Math.abs(cached - 126120.72) < 0.005, `cached Bid total ${cached}`);
      bid.lines = lines;
      bid.total = total;
      return `tax C${lines["Sales tax"]} = ${formulaOf(`C${lines["Sales tax"]}`)}; total ${total} = ${formulaOf(total)}; cached ${cached}`;
    },
  },
  {
    title: "recalculation: worked from the sheet's own cells the formulas give $126,120.72; with the tax rate cell at 10 % they give $127,098.40",
    run: async () => {
      expect(bid?.cells, "the export step did not leave the sheet");
      const cells = JSON.parse(JSON.stringify(bid.cells));
      const book = evaluator(cells);
      const worked = Math.round(book.value(bid.total) * 100) / 100;
      expect(Math.abs(worked - 126120.72) < 0.005, `the formulas work out to ${worked}`);
      const taxRate = `B${bid.lines["Sales tax"]}`;
      const was = cells[taxRate].value;
      cells[taxRate] = { value: "0.1", formula: null };
      const again = evaluator(cells);
      const changed = Math.round(again.value(bid.total) * 100) / 100;
      expect(Math.abs(changed - 127098.4) < 0.005, `with tax at 10 % the formulas give ${changed}`);
      return `worked ${worked}; tax rate ${taxRate} ${was} → 0.1 gives ${changed}`;
    },
  },
]);

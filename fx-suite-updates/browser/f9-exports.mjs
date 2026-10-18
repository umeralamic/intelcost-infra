// F9 and F12, the two Excel exports (D-631, the founder's Q3 of 2026-10-18): the estimate's
// workbook as a member exports it, the grading report's workbook, and the estimate's workbook as a
// share link's guest exports it with pricing off: every money column dropped.
//
//   ./fx-suite.sh refresh && ./fx-suite.sh run f9-exports
//
// The world: one throwaway workspace and project, one landscape page (1224 × 792 pt) at 1/6 ft per
// point. Slab 40 × 25 ft = 1,000 SF at $40 / SF material ($40,000); Footing 100 LF at 6 MH / LF and
// $100 / hr ($60,000). The bid rates are C16's (8 / 10 / 10 / 1 %, no extra), so the workbook's Bid
// Summary sheet ends at $126,120.72. The earthwork: existing grade spots at EL 100.0, proposed at
// 99.0, around a 40 × 25 ft work boundary: 1,000 SF × 1 ft = 37.04 CY of cut, no fill. The workspace
// has no logo, so neither workbook carries a picture (D-625).

import { readFileSync } from "node:fs";

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { allowShareToken } from "./lib/protected.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { readWorkbook } from "./lib/xlsx-zip.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6;
const { token, workspace, base } = await freshWorkspace("F9 Exports");
const project = await makeProject(token, base, { name: "Exports one" });
const takeoff = `${base}/${project.uuid}/takeoff`;
const estimate = `${base}/${project.uuid}/estimate`;
let sheet;
let shareToken;
const items = {};

const rect = (x0, y0, wFt, hFt) => {
  const dx = wFt / FT / W;
  const dy = hFt / FT / H;
  return [[x0, y0], [x0 + dx, y0], [x0 + dx, y0 + dy], [x0, y0 + dy]];
};
const num = (s) => Number(String(s).replace(/[^0-9.-]/g, ""));
const MONEY = ["Unit Man Hours", "Total Man Hours", "Per Hour Wage", "Total Labor Cost", "Unit Equipment", "Total Equipment", "Unit Material Cost", "Total Material Cost", "Subcontract", "Item Cost"];

async function item(body) {
  const made = await apiCall(token, "POST", `${takeoff}/item`, { sheet_uuid: sheet.uuid, ...body });
  expect(made.status === 201, `${body.name}: ${made.status} ${JSON.stringify(made.body)}`);
  return made.body;
}

/** Each spot of one surface: the first makes the item, the rest are its shapes. */
async function spots(surface, elevation, points) {
  const geometry = (p) => ({ geom_type: "spot_elevation", vertices_json: [p], shape_meta: { kind: "spot", surface, elevation }, client_uuid: crypto.randomUUID(), sheet_uuid: sheet.uuid });
  const name = surface === "EG" ? "Existing Grade Spots" : "Proposed Grade Spots";
  const made = await item({ name, type: "spot_elevation", unit: "EA", color: surface === "EG" ? "#ef4444" : "#22c55e", geometry: geometry(points[0]) });
  const rest = await apiCall(token, "POST", `${takeoff}/item/${made.uuid}/shapes`, { create: points.slice(1).map(geometry) });
  expect(rest.status === 200 || rest.status === 201, `${name} shapes: ${rest.status} ${JSON.stringify(rest.body)}`);
}

async function signedIn(page, tab) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=${tab}`);
}

/** Export in the Estimating tab with these choices; the workbook read and its file name. */
async function exportEstimate(page, choices) {
  await page.getByRole("button", { name: "Export", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Export to Excel" });
  await dialog.waitFor();
  for (const choice of choices) await dialog.getByRole("radio", { name: choice, exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), dialog.getByRole("button", { name: "Export", exact: true }).click()]);
  const name = download.suggestedFilename();
  return { name, book: readWorkbook(readFileSync(await download.path())) };
}

/** The sheet's header row (the one with Qty and Unit) and its rows below, as objects. */
function table(sheetRows) {
  const at = sheetRows.findIndex((r) => r && r.includes("Qty") && r.includes("Unit"));
  expect(at >= 0, `no header row in ${JSON.stringify(sheetRows.slice(0, 6))}`);
  const head = sheetRows[at].map((h) => (h ?? "").trim());
  const rows = sheetRows.slice(at + 1).filter(Boolean).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
  return { head, rows };
}

await run("f9-exports", [
  {
    title: "setup: Slab $40,000 material and Footing $60,000 labor, C16's bid rates, EG spots at 100 and FG at 99 around a 40 × 25 ft boundary, a share link with pricing off",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "X1.pdf", buffer: makePdf([{ width: W, height: H, label: "X1" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["X1.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);

      items.Slab = await item({ name: "Slab", type: "sf", unit: "SF", color: "#1d4ed8", geometry: { geom_type: "sf", vertices_json: rect(0.6, 0.05, 40, 25), shape_meta: { closed: true }, client_uuid: crypto.randomUUID() } });
      items.Footing = await item({ name: "Footing", type: "lf", unit: "LF", color: "#1d4ed8", geometry: { geom_type: "lf", vertices_json: [[0.6, 0.6], [0.6 + 100 / FT / W, 0.6]], shape_meta: { closed: false }, client_uuid: crypto.randomUUID() } });
      const priced = await apiCall(token, "PATCH", `${estimate}/costs`, {
        lines: [
          { item_uuid: items.Slab.uuid, changes: { unit_material_cost: 40 } },
          { item_uuid: items.Footing.uuid, changes: { unit_man_hours: 6, hourly_wage: 100 } },
        ],
      });
      expect(priced.status === 200, `pricing: ${priced.status} ${JSON.stringify(priced.body)}`);
      const bid = await apiCall(token, "PUT", `${estimate}/bid`, { tax_pct: 8, overhead_pct: 10, profit_pct: 10, bond_pct: 1, extra: [] });
      expect(bid.status === 200, `bid: ${bid.status} ${JSON.stringify(bid.body)}`);

      // The earthwork: a 40 × 25 ft boundary inside a ring of spots 20 ft out.
      const [x0, y0] = [0.1, 0.2];
      const box = rect(x0, y0, 40, 25);
      await item({ name: "Work Boundary", type: "boundary", unit: "SF", color: "#3b82f6", geometry: { geom_type: "boundary", vertices_json: box, shape_meta: { kind: "boundary", closed: true }, client_uuid: crypto.randomUUID() } });
      const [ox, oy] = [20 / FT / W, 20 / FT / H];
      const ring = rect(x0 - ox, y0 - oy, 80, 65);
      const middle = [x0 + 20 / FT / W, y0 + 12.5 / FT / H];
      await spots("EG", 100, [...ring, middle]);
      await spots("FG", 99, [...ring, middle]);
      const assumed = await apiCall(token, "PUT", `${base}/${project.uuid}/earthwork/assumptions`, { native_suitable: true, fill_type: "Engineered Fill", swell_factor: 1.25, shrink_factor: 1, soil_dry_unit_weight_pcf: 110 });
      expect(assumed.status === 200, `assumptions: ${assumed.status} ${JSON.stringify(assumed.body)}`);

      const link = await apiCall(token, "POST", `${base}/${project.uuid}/share-link`);
      expect(link.status === 201 && link.body.show_pricing === false, `share link: ${link.status} ${JSON.stringify(link.body)}`);
      shareToken = link.body.token;
      // The bench browser refuses every share link but the run's own (D-542).
      allowShareToken(shareToken);
      return `Slab ${items.Slab.effective_quantity} SF, Footing ${items.Footing.effective_quantity} LF; spots 5 + 5; share link, pricing off`;
    },
  },
  {
    title: "estimate Excel, member: every column, values; Slab $40,000 and Footing $60,000 in it, a Bid Summary sheet at $126,120.72, no picture",
    run: async ({ page }) => {
      await signedIn(page, "estimating");
      await page.locator(`tr[data-estimate-row="Slab"]`).waitFor({ timeout: 30000 });
      await page.locator("[data-bid-summary] [data-bid-total] dd").filter({ hasText: "126,120.72" }).waitFor({ timeout: 15000 });
      const { name, book } = await exportEstimate(page, ["All columns", "All rows", "Without formulas"]);
      expect(/^Exports one - Estimate V\d+ - \d{4}-\d{2}-\d{2}\.xlsx$/.test(name), `file name "${name}"`);
      const sheets = book.sheets.map((s) => s.name);
      const { head, rows } = table(book.sheets[0].rows);
      for (const h of ["Wastage", "Qty with Wastage", ...MONEY]) expect(head.includes(h), `no "${h}" in ${head.join(" | ")}`);
      const slab = rows.find((r) => r.Assembly === "Slab");
      const footing = rows.find((r) => r.Assembly === "Footing");
      expect(slab && num(slab["Total Material Cost"]) === 40000 && num(slab["Item Cost"]) === 40000, `Slab ${JSON.stringify(slab)}`);
      expect(footing && num(footing["Total Labor Cost"]) === 60000 && num(footing["Total Man Hours"]) === 600, `Footing ${JSON.stringify(footing)}`);
      const bid = book.sheets.find((s) => s.name === "Bid Summary");
      expect(bid, `no Bid Summary sheet in ${sheets.join(", ")}`);
      const flat = bid.rows.flat().filter((c) => c !== undefined && c !== "");
      expect(flat.some((c) => Math.abs(num(c) - 126120.72) < 0.005), `Bid Summary: ${JSON.stringify(bid.rows)}`);
      expect(book.media.length === 0, `pictures with no logo: ${book.media.join(", ")}`);
      return `"${name}"; sheets ${sheets.join(", ")}; ${head.length} columns; Slab $40,000, Footing $60,000; Bid Summary $126,120.72; no picture`;
    },
  },
  {
    title: "grading report Excel: Calculate, open the report, Excel; the workbook names the project and sheet and carries 37.04 CY of cut",
    run: async ({ page }) => {
      // The earthwork bar folds its last tools into "More earthwork tools" on a narrow window.
      await page.setViewportSize({ width: 1920, height: 1080 });
      await signedIn(page, "earthwork");
      await page.locator("[data-canvas-scale]").waitFor({ timeout: 30000 });
      await page.getByRole("button", { name: "Calculate", exact: true }).first().click();
      const dialog = page.getByRole("dialog", { name: "Earthwork assumptions" });
      await dialog.waitFor();
      await dialog.getByRole("button", { name: "Calculate", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
      const toggle = page.locator("[data-grading-report-toggle]");
      if (await toggle.isVisible()) await toggle.click();
      else {
        await page.getByRole("button", { name: "More earthwork tools" }).click();
        await page.getByRole("menuitem", { name: "Grading report" }).click();
      }
      const excel = page.locator("[data-report-excel]");
      await excel.waitFor({ timeout: 60000 });
      const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), excel.click()]);
      const name = download.suggestedFilename();
      expect(name === "Grading Report, Exports one.xlsx", `file name "${name}"`);
      const book = readWorkbook(readFileSync(await download.path()));
      const cells = book.sheets.flatMap((s) => s.rows.flat()).filter((c) => c !== undefined && c !== "");
      expect(cells.some((c) => /Exports one/.test(c)), `no project name in ${JSON.stringify(cells.slice(0, 20))}`);
      const cut = 1000 / 27;
      expect(cells.some((c) => Math.abs(num(c) - cut) < 0.01 || /37\.04/.test(c)), `no ${cut.toFixed(2)} CY in ${JSON.stringify(cells.slice(0, 80))}`);
      expect(book.media.length === 0, `pictures with no logo: ${book.media.join(", ")}`);
      await page.getByText("Workbook downloaded").first().waitFor({ timeout: 10000 });
      return `"${name}"; sheets ${book.sheets.map((s) => s.name).join(", ")}; cut ${cut.toFixed(2)} CY in it; no picture`;
    },
  },
  {
    title: "guest export, pricing off: the link opens the project; Estimating says pricing is not shown; Export with every column drops all ten money columns and the Bid Summary",
    run: async ({ context }) => {
      const guest = await context.browser().newContext();
      try {
        const page = await guest.newPage();
        await page.goto(`${APP}/s/${shareToken}`);
        await page.waitForURL(new RegExp(`/project/${project.uuid}/takeoff`), { timeout: 30000 }).catch(async (error) => {
          throw new Error(`${error.message.split(String.fromCharCode(10))[0]}; the page reads: ${((await page.locator("body").textContent()) ?? "").slice(0, 400)}`);
        });
        await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating`);
        await page.locator(`tr[data-estimate-row="Slab"]`).waitFor({ timeout: 30000 });
        await page.locator("[data-pricing-hidden]").waitFor({ timeout: 10000 });
        expect((await page.locator("[data-bid-summary]").count()) === 0, "a guest without pricing sees the bid summary");
        const { name, book } = await exportEstimate(page, ["All columns", "All rows", "Without formulas"]);
        const { head, rows } = table(book.sheets[0].rows);
        const leaked = MONEY.filter((h) => head.includes(h));
        expect(leaked.length === 0, `money columns in the guest's workbook: ${leaked.join(", ")}`);
        for (const h of ["Qty", "Unit", "Wastage", "Qty with Wastage"]) expect(head.includes(h), `no "${h}" in ${head.join(" | ")}`);
        const slab = rows.find((r) => r.Assembly === "Slab");
        expect(slab && num(slab.Qty) === 1000, `Slab ${JSON.stringify(slab)}`);
        const sheets = book.sheets.map((s) => s.name);
        expect(!sheets.includes("Bid Summary"), `guest sheets: ${sheets.join(", ")}`);
        const money = book.sheets.flatMap((s) => s.rows.flat()).filter((c) => typeof c === "string" && /40,?000|60,?000|126,?120/.test(c));
        expect(money.length === 0, `prices in the guest's workbook: ${money.join(", ")}`);
        return `"${name}"; ${head.join(" | ")}; no money column, no Bid Summary (sheets ${sheets.join(", ")})`;
      } finally {
        await guest.close();
      }
    },
  },
]);

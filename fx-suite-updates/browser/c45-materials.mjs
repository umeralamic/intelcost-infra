// C45, material components (F38, docs/tasks/materials_tasks.md).
//
//   ./fx-suite.sh run named c45-materials
//
// The world: one throwaway project, one page, one structure.
//   M0 (D-902): a structure takes the settings' defaults, keeps what is saved, and refuses a value outside them.
//   M1 (D-903): a key with no price reads none; the workspace's, then the project's, win; a default takes the location
//      factor's words; a link is http or https; a default is never listed.
//   M3 (D-905): a saved line's materials are written; a person's price and fields are kept, a dismissed one stays gone until
//      restored, a line with a person's own material is left alone, a stale untouched one goes, the pipe rounds per bid.
//   M7 (D-906): Settings › Material prices adds a price with a link; a bad link cannot be saved; Estimating's Setup offers what has no
//      price, Add price fills it at once; an expired quote keeps pricing, flagged.
//   M2 (D-904): a hand-added material with no price reads Missing price, in the row, Needs attention and the bid; a typed 0 does not;
//      user_fields follows a person's save on a Calculate component; a dismissed one stays dismissed until restored.

import { APP, apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { grading, gradingSheets, openSheet } from "./lib/grading-world.mjs";
import { hostSql } from "./lib/host-sql.mjs";

const { token, workspace, base } = await freshWorkspace("C45 Materials");
const project = await makeProject(token, base, { name: "Materials" });
const g = grading(token, base, project);
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
let structure;

const STRUCTURE = { structure_type: "catch_basin", utility_type: "storm", shape: "rect", inside_dia_in: null, inside_l_ft: 4, inside_w_ft: 4, wall_in: 6, base_slab_in: 6, base_stone_in: 6, overdig_ft: 2, protection: "auto", start_surface: "proposed" };
const read = async () => (await apiCall(token, "GET", `${g.earthwork}/utilities`)).body.structures.find((s) => s.item_uuid === structure.uuid);

await run("c45-materials", [
  {
    title: "M0 (D-902): a structure's settings start at the plan's defaults, keep what is saved, and refuse what they do not offer",
    run: async ({ page }) => {
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["U-1"]);
      const made = await apiCall(token, "POST", `${takeoff}/item`, { name: "CB-1", type: "count", unit: "EA", sheet_uuid: sheet.uuid, is_utility: true, structure: STRUCTURE, geometry: { geom_type: "count", vertices_json: [[0.5, 0.5]], shape_meta: {}, client_id: crypto.randomUUID() } });
      expect(made.status === 201, `item: ${made.status} ${JSON.stringify(made.body)}`);
      structure = made.body;
      const fresh = await read();
      expect(fresh.construction === "precast" && fresh.pricing === "parts" && fresh.hood === false && fresh.riser_mode === "per_vf" && fresh.top === null, JSON.stringify(fresh));
      await apiCall(token, "PUT", `${g.earthwork}/utility-structure/${structure.uuid}`, { ...STRUCTURE, pricing: "whole", inlet_kind: "combination", hood: true });
      const saved = await read();
      expect(saved.pricing === "whole" && saved.inlet_kind === "combination" && saved.hood === true, JSON.stringify(saved));
      const refused = await apiCall(token, "PUT", `${g.earthwork}/utility-structure/${structure.uuid}`, { ...STRUCTURE, top: "dome" });
      expect(refused.status === 422, `dome: ${refused.status}`);
      return "precast, parts, per VF; whole, combination, hood kept; a dome refused";
    },
  },
  {
    title: "M1 (D-903): no price, the default, the workspace's, the project's, in that order; a bad link refused; defaults never listed",
    run: async () => {
      const key = `fx:c45:${Date.now()}`;
      const wsPrices = `/api/workspace/${workspace.uuid}/material-prices`;
      const prPrices = `${base}/${project.uuid}/estimate/material-prices`;
      const resolve = async () => (await apiCall(token, "GET", `${prPrices}/resolve?mat_key=${encodeURIComponent(key)}`)).body;
      const none = await resolve();
      expect(none.source === "none" && none.unit_price === null, JSON.stringify(none));
      const release = (await hostSql("INSERT INTO matlib.release (title, released_on) VALUES ('Fixture', current_date) RETURNING id")).match(/\d+/)[0];
      try {
        await hostSql(`INSERT INTO matlib.mat_default (release_id, mat_key, unit_price, sell_unit, grade, source_internal) VALUES (${release}, '${key}', 10, 'LF', 'B', 'INTERNAL NOTE')`);
        const fallback = await resolve();
        expect(fallback.source === "intelcost" && fallback.unit_price === 10 && fallback.location === "No location: national" && !JSON.stringify(fallback).includes("INTERNAL"), JSON.stringify(fallback));
        const listed = (await apiCall(token, "GET", wsPrices)).body;
        expect(listed.length === 0, "a default was listed");
        const bad = await apiCall(token, "POST", wsPrices, { mat_key: key, unit_price: 12, sell_unit: "LF", links: [{ label: "x", url: "javascript:alert(1)" }] });
        expect(bad.status === 422, `javascript link: ${bad.status}`);
        const good = await apiCall(token, "POST", wsPrices, { mat_key: key, unit_price: 12, sell_unit: "LF", supplier: "Fixture Supply", valid_until: "2020-01-01", links: [{ label: "Page", url: "https://example.com/p", checked_on: "2026-10-31" }] });
        expect(good.status === 201 && good.body.expired === true && good.body.links.length === 1, JSON.stringify(good));
        const ws = await resolve();
        expect(ws.source === "workspace" && ws.unit_price === 12 && ws.expired === true && ws.links[0].url === "https://example.com/p", JSON.stringify(ws));
        const own = await apiCall(token, "POST", prPrices, { mat_key: key, unit_price: 0, sell_unit: "LF" });
        expect(own.status === 201, JSON.stringify(own));
        const pr = await resolve();
        expect(pr.source === "project" && pr.unit_price === 0, JSON.stringify(pr));
        return "none, $10 default, $12 workspace (expired, flagged), a project's typed 0 is a price";
      } finally {
        await hostSql(`DELETE FROM matlib.mat_default WHERE release_id = ${release}`);
        await hostSql(`DELETE FROM matlib.release WHERE id = ${release}`);
      }
    },
  },
  {
    title: "M2 (D-904): a material with no price reads Missing price and the bid Incomplete; a typed 0 does not",
    run: async ({ page }) => {
      const comps = `${base}/${project.uuid}/estimate/components`;
      const body = { kind: "material", name: "Riser", qty_formula: "QTY", unit: "EA", pricing_mode: "unit", unit_price: null };
      const host = await apiCall(token, "POST", `${takeoff}/item`, { name: "Hydrant", type: "count", unit: "EA", sheet_uuid: sheet.uuid, geometry: { geom_type: "count", vertices_json: [[0.4, 0.5]], shape_meta: {}, client_id: crypto.randomUUID() } });
      expect(host.status === 201, `item: ${host.status}`);
      const made = await apiCall(token, "POST", comps, { ...body, item_uuid: host.body.uuid });
      expect(made.status === 201, `component: ${made.status} ${JSON.stringify(made.body)}`);
      await openSheet(page, project, sheet, "estimating");
      const row = page.locator('tr[data-estimate-row="Hydrant"]').first();
      await row.waitFor({ timeout: 30000 });
      await row.locator("[data-cost-flag]", { hasText: "Missing price" }).waitFor({ timeout: 15000 });
      const said = await page.locator("body").innerHTML();
      expect(/1 material without a price/.test(said), "the bid does not say 1 material without a price");
      const typed = await apiCall(token, "PUT", `${comps}/${made.body.uuid}`, { ...body, unit_price: 0 });
      expect(typed.status === 200, `typed 0: ${typed.status}`);
      await page.reload();
      await row.waitFor({ timeout: 30000 });
      await page.locator("tr[data-estimate-row]").first().waitFor();
      await page.waitForFunction(() => !document.body.innerText.includes("Missing price"), null, { timeout: 15000 });
      const deleted = await apiCall(token, "DELETE", `${comps}/${made.body.uuid}`);
      return `Missing price and the bid's count; a typed 0 clears both; delete ${deleted.status}`;
    },
  },
  {
    title: "M3 (D-905): Calculate's materials: written, a person's fields kept, a dismissed one not written again until restored, a person's own line left alone",
    run: async ({ page }) => {
      const comps = `${base}/${project.uuid}/estimate/components`;
      const line = (variant, materials) => ({ region_id: "util:sanitary", role: "utility_pipe", name: `8" PVC SDR-35, ${variant}`, quantity: 100, unit: "LF", variant, work_scope: "site_utilities.sanitary", work_kind: null, utility: "sanitary", folder: "utilities", materials });
      const pipe = (key = "pipe:pvc_d3034_sdr35:8") => ({ key, mat_key: key, name: '8" PVC SDR-35', qty_formula: "QTY", unit: "LF", wastage_pct: 2, round_to: 14, round_scope: "bid", sell_unit: "LF" });
      const tape = { key: "warning_tape", mat_key: "warning_tape", name: "Detectable warning tape", qty_formula: "QTY * 1.05 / 1000", unit: "ROLL", wastage_pct: 0, round_to: 1, round_scope: "line", sell_unit: "ROLL" };
      const save = async (lines) => {
        const r = await apiCall(token, "PUT", `${g.earthwork}/result/${sheet.uuid}`, { version_key: `fx-${Date.now()}`, result: { ok: true, units: "CY", cutCY: 0, fillCY: 0, netCY: 0, regions: [], coverage: 1, warnings: [], strip: null }, lines });
        expect(r.status === 200, `save: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
      };
      const auto = async (name) => (await apiCall(token, "GET", comps)).body.filter((c) => c.auto_key && (!name || c.name === name));
      await save([line("a", [pipe(), tape]), line("b", [pipe()])]);
      const first = await auto();
      expect(first.length === 3 && first.every((c) => c.unit_price === null), `${first.length} written`);
      // Two lines of 100 LF in one bid: 204 LF, 15 joints of 14 ft.
      await openSheet(page, project, sheet, "estimating");
      await page.waitForFunction(() => /of 210 LF ordered in .* \(15 JT\)/.test(document.body.innerText), null, { timeout: 30000 });
      const body = (c, extra) => ({ kind: "material", name: c.name, qty_formula: c.qty_formula, unit: c.unit, pricing_mode: "unit", unit_price: c.unit_price, wastage_pct: c.wastage_pct, round_to: c.round_to, ...extra });
      const edited = first.find((c) => c.key !== "x" && c.auto_key === "warning_tape");
      const put = await apiCall(token, "PUT", `${comps}/${edited.uuid}`, body(edited, { unit_price: 9, name: "Tape, our spec" }));
      expect(put.status === 200, `edit: ${put.status}`);
      const dropped = first.filter((c) => c.auto_key !== "warning_tape")[1];
      const gone = await apiCall(token, "POST", `${comps}/${dropped.uuid}/remove`, { choice: "clear" });
      expect(gone.status === 200, `remove: ${gone.status} ${JSON.stringify(gone.body)}`);
      await save([line("a", [pipe(), tape]), line("b", [pipe()])]);
      const again = await auto();
      const kept = again.find((c) => c.auto_key === "warning_tape");
      expect(kept.name === "Tape, our spec" && Number(kept.unit_price) === 9 && kept.price_source === "typed" && kept.user_fields.includes("unit_price"), JSON.stringify(kept));
      expect(again.filter((c) => c.auto_key.startsWith("pipe:")).length === 1, `dismissed came back: ${again.length}`);
      const restored = await apiCall(token, "POST", `${comps}/restore`, { item_uuid: dropped.item_uuid });
      expect(restored.status === 200, `restore: ${restored.status}`);
      await save([line("a", [pipe(), tape]), line("b", [pipe()])]);
      expect((await auto()).filter((c) => c.auto_key.startsWith("pipe:")).length === 2, "not restored");
      // A person's own material on a line: Calculate leaves it alone, and a new key is not written there.
      const a = (await auto()).find((c) => c.auto_key === "warning_tape");
      await apiCall(token, "POST", comps, { kind: "material", name: "Own pipe", qty_formula: "QTY", unit: "LF", pricing_mode: "unit", unit_price: 5, item_uuid: a.item_uuid });
      await save([line("a", [pipe(), tape, { ...tape, key: "extra", mat_key: "extra", name: "Extra" }]), line("b", [pipe()])]);
      expect((await auto("Extra")).length === 0, "written over a person's material");
      // No longer produced: untouched goes.
      await save([line("b", [])]);
      const after = await auto();
      expect(!after.some((c) => c.item_uuid === first.find((x) => x.auto_key.startsWith("pipe:") && x.item_uuid !== a.item_uuid)?.item_uuid), "an untouched component stayed");
      return "3 written, 210 LF = 15 JT in one bid; typed kept; dismissed stayed gone, then restored; a person's line left alone; a stale one gone";
    },
  },
  {
    title: "M7 (D-906): the page saves a price and its link; a bad link is refused; Estimating offers what has no price and Add price fills it at once; an expired quote keeps pricing, flagged",
    run: async ({ page }) => {
      await openSheet(page, project, sheet, "estimating");
      await page.goto(`${APP}/settings/material-prices`);
      await page.locator("[data-material-prices]").waitFor({ timeout: 30000 });
      await page.getByRole("button", { name: "Add a price" }).click();
      const form = page.locator("[data-price-form]");
      await form.getByLabel("Material", { exact: true }).fill("Page stone");
      await form.getByLabel("Price", { exact: true }).fill("41.5");
      await form.getByLabel("Sold per").fill("TON");
      await form.getByRole("button", { name: "Add a link" }).click();
      await form.getByLabel("Link label").fill("Quote");
      await form.getByLabel("Link URL").fill("javascript:alert(1)");
      const save = page.getByRole("button", { name: "Save", exact: true });
      expect(await save.isDisabled(), "a javascript link can be saved");
      await form.getByLabel("Link URL").fill("https://example.com/quote");
      await save.click();
      const link = page.locator('[data-price-row="page_stone"] [data-price-link]');
      await link.waitFor({ timeout: 15000 });
      expect((await link.getAttribute("rel")) === "noopener noreferrer" && (await link.getAttribute("target")) === "_blank", "the link's rel or target");
      // Step 3 left the last pipe line's components; a fresh Missing material on a fresh line.
      const comps = `${base}/${project.uuid}/estimate/components`;
      const key = "stone:c45";
      await apiCall(token, "PUT", `${g.earthwork}/result/${sheet.uuid}`, { version_key: `fx-${Date.now()}`, result: { ok: true, units: "CY", cutCY: 0, fillCY: 0, netCY: 0, regions: [], coverage: 1, warnings: [], strip: null }, lines: [{ region_id: "util:storm", role: "utility_bedding_pipe_zone", name: "Pipe bedding, C45", quantity: 10, unit: "CCY", variant: "bedding:C45|imported", work_scope: "site_utilities.storm", work_kind: null, utility: "storm", folder: "utilities", materials: [{ key, mat_key: key, name: "C45 stone", qty_formula: "QTY * 1.5", unit: "TON", wastage_pct: 10, sell_unit: "TON" }] }] });
      await openSheet(page, project, sheet, "estimating");
      await page.locator("[data-estimate-sidebar]").getByText("Material Prices").click();
      const missing = page.locator("[data-prices-missing]");
      await missing.getByText("C45 stone").waitFor({ timeout: 15000 });
      await missing.locator("li", { hasText: "C45 stone" }).getByRole("button", { name: "Add price" }).click();
      await page.locator("[data-price-form]").getByLabel("Price", { exact: true }).fill("30");
      await page.locator("[data-price-form]").getByLabel("Valid to").fill("2020-01-01");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      const priced = async () => (await apiCall(token, "GET", comps)).body.find((c) => c.auto_key === key);
      const { waitFor } = await import("./lib/realtime.mjs");
      await waitFor(async () => Number((await priced())?.unit_price) === 30, "the price to fill", 15000, 300);
      await page.keyboard.press("Escape");
      await page.reload();
      await page.locator("tr[data-estimate-row]").first().waitFor({ timeout: 30000 });
      await waitFor(async () => /Quote expired 2020-01-01: C45 stone/.test(await page.locator("body").innerHTML()), "the expired flag", 15000, 300);
      return "saved with its link, rel noopener; javascript refused; Add price filled $30 at once; expired flagged";
    },
  },
]);

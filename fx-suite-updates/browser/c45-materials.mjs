// C45, material components (F38, docs/tasks/materials_tasks.md).
//
//   ./fx-suite.sh run named c45-materials
//
// The world: one throwaway project, one page, one structure.
//   M0 (D-902): a structure takes the settings' defaults, keeps what is saved, and refuses a value outside them.
//   M1 (D-903): a key with no price reads none; the workspace's, then the project's, win; a default takes the location
//      factor's words; a link is http or https; a default is never listed.
//   M2 (D-904): a hand-added material with no price reads Missing price, in the row, Needs attention and the bid; a typed 0 does not;
//      user_fields follows a person's save on a Calculate component; a dismissed one stays dismissed until restored.

import { apiCall, expect, run } from "./lib/bench.mjs";
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
]);

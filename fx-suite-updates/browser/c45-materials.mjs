// C45, material components (F38, docs/tasks/materials_tasks.md).
//
//   ./fx-suite.sh run named c45-materials
//
// The world: one throwaway project, one page, one structure.
//   M0 (D-902): a structure takes the settings' defaults, keeps what is saved, and refuses a value outside them.

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { grading, gradingSheets } from "./lib/grading-world.mjs";

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
]);

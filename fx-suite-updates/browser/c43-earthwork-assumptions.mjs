// C43, Earthwork assumptions (SITE_AND_EARTHWORK_PLAN B1, B2; D-806): native soil per soil layer, and the import material.
//
//   ./fx-suite.sh run c43-earthwork-assumptions
//
// The world: one throwaway project, one page (lib/grading-world.mjs), the flat pad (EG 100, FG 99: a cut, no fill).
//   1. Without bores: Yes / No, as before; a true saved before reads Yes; the import material optional ("Not needed yet")
//      while the last Calculate found no import.
//   2. With a soil layer marked unsuitable: "Per soil layers (from bores)" chosen, the layer's line says unsuitable;
//      All suitable and None suitable offered; the choice saved as text ("layers", "all", "none").
//   3. A pad short of fill (EG 99, FG 100): after Calculate the import material reads needed.

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { calculate, flatPad, grading, gradingSheets, openSheet } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C43 Earthwork assumptions");
const project = await makeProject(token, base, { name: "Assumptions" });
const g = grading(token, base, project);
let sheet;
let short;

async function openAssumptions(page, on = sheet) {
  await openSheet(page, project, on, "earthwork");
  await page.getByRole("button", { name: "Calculate", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Earthwork assumptions" });
  await dialog.waitFor();
  return dialog;
}

await run("c43-earthwork-assumptions", [
  {
    title: "setup: the flat pad; a true saved the old way",
    run: async ({ page }) => {
      [sheet, short] = await gradingSheets(page, token, base, workspace, project, ["G-1", "G-2"]);
      await flatPad(g, sheet);
      await g.assume({ native_suitable: true });
      const read = (await apiCall(token, "GET", `${g.earthwork}/assumptions`)).body;
      expect(read.native_suitable === "layers", `a saved true reads ${read.native_suitable}`);
      return "true reads layers";
    },
  },
  {
    title: "D-806 B1/B2: without bores Yes and No; Yes chosen; the import material optional before any import",
    run: async ({ page }) => {
      const dialog = await openAssumptions(page);
      const choices = await dialog.locator("[data-native-suitable]").evaluateAll((e) => e.map((x) => x.getAttribute("data-native-suitable")));
      expect(choices.join() === "all,none", `choices ${choices.join()}`);
      expect(await dialog.locator('[data-native-suitable="all"]').isChecked(), "Yes is not chosen for a saved per-layer");
      expect((await dialog.locator("[data-import-material]").getAttribute("data-import-material")) === "optional", "the import material is required with no import");
      await page.keyboard.press("Escape");
      return "Yes / No; import optional";
    },
  },
  {
    title: "D-806 B1: with an unsuitable soil layer, Per soil layers chosen, the layer's line, the three choices saved as text",
    run: async ({ page }) => {
      const made = await apiCall(token, "POST", `${g.earthwork}/soil-layer`, { name: "Soft clay", soil_group: "clay", osha_type: "C", unsuitable: true, swell_factor: 1.3, shrink_factor: 1.1, color: "#8b5a2b" });
      expect(made.status === 201, `layer: ${made.status} ${JSON.stringify(made.body)}`);
      const layer = made.body.layers.find((l) => l.name === "Soft clay");
      const bore = await apiCall(token, "POST", `${g.earthwork}/bore`, { sheet_uuid: sheet.uuid, code: "B-1", point: [0.2, 0.3], total_depth_ft: 5, layers: [{ soil_layer_uuid: layer.uuid, depth_top_ft: 0, depth_bottom_ft: 5 }] });
      expect(bore.status === 201, `bore: ${bore.status} ${JSON.stringify(bore.body)}`);
      const dialog = await openAssumptions(page);
      await dialog.locator("[data-layer-suitability]").waitFor();
      expect(await dialog.locator('[data-native-suitable="layers"]').isChecked(), "Per soil layers is not chosen");
      expect(/Soft clay: unsuitable/.test(await dialog.locator("[data-layer-suitability]").innerText()), "the layer's line");
      await dialog.locator('[data-native-suitable="none"]').check();
      await dialog.getByRole("button", { name: "Calculate", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
      const read = (await apiCall(token, "GET", `${g.earthwork}/assumptions`)).body;
      expect(read.native_suitable === "none", `saved ${read.native_suitable}`);
      return "layers chosen by default; none saved";
    },
  },
  {
    title: "D-806 B2: a pad short of fill: after Calculate the import material reads needed",
    run: async ({ page }) => {
      await g.assume({ native_suitable: "all" });
      // On a page of its own: beside the first pad it shares one surface, its fill met by that pad's cut.
      const pad = await flatPad(g, short, { eg: 99, fg: 100 });
      expect(pad.boundary, "the short pad");
      await openSheet(page, project, short, "earthwork");
      await calculate(page);
      const dialog = await openAssumptions(page, short);
      expect((await dialog.locator("[data-import-material]").getAttribute("data-import-material")) === "needed", "the import material is not needed after an import");
      await page.keyboard.press("Escape");
      return "needed after an import";
    },
  },
]);

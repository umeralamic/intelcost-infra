// C44, where each surplus goes (SITE_AND_EARTHWORK_PLAN B3; D-806): Haul off, Stockpile on site, Re-use as fill, Waste
// on site; the lines each writes.
//
//   ./fx-suite.sh run c44-surplus-destinations
//
// The world: one throwaway project, one page, the flat pad (EG 100, FG 99): a cut and no fill, so the whole cut is a
// surplus. Each destination chosen in the assumptions, Calculate run, the calculated lines read:
//   - Haul off (the default): a Soil Export line, loose;
//   - Stockpile on site: "Surplus soil, stockpiled on site" (role soil_stockpile), in bank, no Soil Export;
//   - Waste on site: "Surplus soil, wasted on site (spoil area)" (role soil_waste);
//   - Re-use as fill: neither.
// The quantity table's site-choices row holds the arithmetic; this holds the screens and the written lines.

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { flatPad, grading, gradingSheets, openSheet } from "./lib/grading-world.mjs";
import { waitFor } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("C44 Surplus");
const project = await makeProject(token, base, { name: "Surplus" });
const g = grading(token, base, project);
let sheet;

async function calculateWith(page, to, ok) {
  await openSheet(page, project, sheet, "earthwork");
  await page.getByRole("button", { name: "Calculate", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Earthwork assumptions" });
  await dialog.waitFor();
  await dialog.locator('[data-surplus-row="soil"] select').selectOption(to);
  await dialog.getByRole("button", { name: "Calculate", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  await page.getByRole("dialog", { name: "Earthwork Volumes" }).locator("[data-volume-totals]").waitFor({ timeout: 60000 });
  // The panel opens before the lines are saved: the last run's are still live until then.
  let last = [];
  return waitFor(
    async () => {
      const items = await g.items();
      last = items.filter((i) => i.earthwork_role && !i.earthwork_retired).map((i) => i.earthwork_role);
      return last.length && ok(last) ? last : null;
    },
    `the lines for ${to} (last: ${last.join(", ")})`,
    30000,
  );
}

await run("c44-surplus-destinations", [
  {
    title: "setup: the flat pad, all suitable",
    run: async ({ page }) => {
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["G-1"]);
      await flatPad(g, sheet);
      await g.assume({ native_suitable: "layers" });
      return "pad";
    },
  },
  ...[
    ["haul_off", (r) => r.includes("soil_export") && !r.includes("soil_stockpile")],
    ["stockpile", (r) => r.includes("soil_stockpile") && !r.includes("soil_export")],
    ["waste", (r) => r.includes("soil_waste") && !r.includes("soil_export")],
    ["reuse", (r) => !r.includes("soil_export") && !r.includes("soil_stockpile") && !r.includes("soil_waste")],
  ].map(([to, ok]) => ({
    title: `D-806 B3: the surplus to ${to}`,
    run: async ({ page }) => {
      const roles = await calculateWith(page, to, ok);
      const saved = (await apiCall(token, "GET", `${g.earthwork}/assumptions`)).body.site_choices;
      expect(to === "haul_off" ? saved === null || !saved.surplus?.soil : saved?.surplus?.soil === to, `saved ${JSON.stringify(saved)}`);
      return roles.join(", ");
    },
  })),
]);

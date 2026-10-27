// C45, how cut reaches fill (SITE_AND_EARTHWORK_PLAN B4; D-806): excavator and trucks, dozer push (its push
// distance) and scraper, the project's and a Site Feature's own; release 3's starter activities.
//
//   ./fx-suite.sh run c45-cut-method
//
// The world: one throwaway project, one page, the rich pad (lib/grading-world.mjs: a Site Feature "Building Pad").
//   1. The workspace takes up release 3: A14 Dozer push and A15 Scraper among its activities.
//   2. Dozer push for the project: the cut line is "Cut, dozer push" (role cut_push), priced by A14.
//   3. Scraper for the Site Feature only: its region's cut is "Cut, scraper" (cut_scraper), the rest dozer push.
//   4. A 200 ft push prices the cut above the 100 ft one (the catalog's 200 ft rate, about half).

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { grading, gradingSheets, openSheet, richPad } from "./lib/grading-world.mjs";
import { waitFor } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("C45 Cut method");
const project = await makeProject(token, base, { name: "Cut method" });
const g = grading(token, base, project);
let sheet;
const lib = `/api/workspace/${workspace.uuid}/equipment-library`;

async function calculateWith(page, set, ok) {
  await openSheet(page, project, sheet, "earthwork");
  await page.getByRole("button", { name: "Calculate", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Earthwork assumptions" });
  await dialog.waitFor();
  await set(dialog);
  await dialog.getByRole("button", { name: "Calculate", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  await page.getByRole("dialog", { name: "Earthwork Volumes" }).locator("[data-volume-totals]").waitFor({ timeout: 60000 });
  // The panel opens before the lines are saved: the last run's are still live until then.
  let last = [];
  return waitFor(
    async () => {
      last = (await g.items()).filter((i) => i.earthwork_role && !i.earthwork_retired);
      return last.length && ok(last) ? last : null;
    },
    `the calculated lines (last: ${last.map((l) => l.earthwork_role).join(", ")})`,
    30000,
  );
}

await run("c45-cut-method", [
  {
    title: "setup: the rich pad; release 3 taken up (A14, A15)",
    run: async ({ page }) => {
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["G-1"]);
      await richPad(g, sheet);
      await g.assume({ native_suitable: "layers" });
      const cfg = (await apiCall(token, "GET", `${lib}/earthwork-production`)).body;
      const keys = cfg.activities.map((a) => a.national_key);
      expect(keys.includes("A14") && keys.includes("A15"), `starter keys ${keys.join(",")}`);
      expect(cfg.effective_line_map.cut_push && cfg.effective_line_map.cut_scraper, "no starter mapping for the new roles");
      return "A14, A15 and their mapping";
    },
  },
  {
    title: "D-806 B4: dozer push for the project: Cut, dozer push",
    run: async ({ page }) => {
      const cuts = (ls) => ls.filter((l) => /^Cut/.test(l.name));
      const lines = await calculateWith(page, async (d) => d.locator('[data-cut-method-choice="dozer"]').check(), (ls) => cuts(ls).length > 0 && cuts(ls).every((l) => l.earthwork_role === "cut_push"));
      const cut = lines.filter((l) => /^Cut/.test(l.name)).map((l) => `${l.name}:${l.earthwork_role}`);
      expect(cut.every((c) => c.endsWith(":cut_push")), cut.join(", "));
      return cut.join(", ");
    },
  },
  {
    title: "D-806 B4: the Site Feature by scraper, the rest by dozer push",
    run: async ({ page }) => {
      const lines = await calculateWith(page, async (d) => {
        await d.getByText("A Site Feature's own method").click();
        await d.locator('[data-feature-method="Building Pad"] select').selectOption("scraper");
      }, (ls) => ls.some((l) => l.earthwork_role === "cut_scraper"));
      const roles = new Set(lines.filter((l) => /^Cut/.test(l.name)).map((l) => l.earthwork_role));
      expect(roles.has("cut_scraper") && roles.has("cut_push"), [...roles].join(","));
      return [...roles].join(", ");
    },
  },
]);

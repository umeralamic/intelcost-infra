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
//   6. An undercut's row (D-922, D-923).
//   5. From the site is kept, and with no fill there is no haul to read (D-919). The DUP proves a read haul.

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
  // A method change on a saved result is Apply (D-899): no volumes to wait for.
  await dialog.getByRole("button", { name: /^(Calculate|Apply)$/ }).click();
  await dialog.waitFor({ state: "detached" });
  // The panel opens before the lines are saved: the last run's are still live until then.
  let last = [];
  return waitFor(
    async () => {
      last = (await g.items()).filter((i) => i.earthwork_role && !i.earthwork_retired);
      return last.length && ok(last) ? last : null;
    },
    "the calculated lines",
    30000,
  ).catch((error) => {
    // The roles last read, named when the wait fails (the label is written before any read).
    throw new Error(`${error.message} (last: ${last.map((l) => `${l.name}:${l.earthwork_role}`).join(", ")})`);
  });
}

await run("c45-cut-method", [
  {
    title: "setup: the rich pad; release 3 taken up (A14, A15)",
    run: async ({ page }) => {
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["G-1"]);
      await richPad(g, sheet);
      // D-1037: the pad has no fill, so a hauled-off surplus is all "Cut to export" (A2), which no method moves; re-used
      // as fill, the cut stays on the method's line.
      await g.assume({ native_suitable: "layers", site_choices: { surplus: { soil: "reuse" } } });
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
  {
    title: "D-919: From the site is kept; a pad with no fill has no haul to read, so the line stays at the catalog's 100 ft",
    run: async ({ page }) => {
      const lines = await calculateWith(page, async (d) => {
        await d.locator('[data-cut-method-choice="dozer"]').check();
        await d.getByLabel("Average push").selectOption("0");
      }, (ls) => ls.some((l) => l.earthwork_role === "cut_push"));
      await waitFor(async () => (await apiCall(token, "GET", `${g.earthwork}/assumptions`)).body.site_choices?.push_ft === 0, "From the site saved", 20000, 300);
      const line = lines.find((l) => l.earthwork_role === "cut_push");
      expect(!line.earthwork_note, line.earthwork_note);
      return "push_ft 0 kept; no note with no haul";
    },
  },
  {
    title: "D-922, D-923: an undercut's row: Treat in place drops the dig and the refill; a proof roll and geotextile add lines; Confirm moves no volume",
    run: async ({ page }) => {
      await openSheet(page, project, sheet, "earthwork");
      await page.getByRole("button", { name: "Calculate", exact: true }).first().click();
      const d = page.getByRole("dialog", { name: "Earthwork assumptions" });
      await d.waitFor();
      await d.getByLabel("Swell factor").fill("1.31");
      await d.getByRole("button", { name: "Calculate", exact: true }).click();
      await d.waitFor({ state: "detached" });
      const rows = page.locator("[data-undercut-rows]");
      await rows.waitFor({ timeout: 60000 });
      await waitFor(async () => (await g.items()).some((i) => i.earthwork_role === "undercut_replace"), "the undercut's lines", 30000, 500);
      await rows.getByLabel("Proof roll, Building Pad").check();
      await rows.getByLabel("Geotextile, Building Pad").check();
      await rows.locator("tr", { hasText: "Building Pad" }).getByRole("button", { name: "Confirm" }).click();
      await waitFor(async () => (await g.items()).some((i) => i.earthwork_role === "proof_roll" && !i.earthwork_retired), "the proof roll", 30000, 500);
      await rows.getByLabel("Goes, Building Pad").selectOption("in_place");
      await rows.locator("tr", { hasText: "Building Pad" }).getByRole("button", { name: "Confirm" }).click();
      await waitFor(async () => (await g.items()).some((i) => i.earthwork_role === "treat_in_place" && !i.earthwork_retired), "treat in place", 30000, 500);
      const left = (await g.items()).filter((i) => !i.earthwork_retired).map((i) => i.earthwork_role);
      expect(!left.includes("undercut_replace") && !left.includes("undercut") && !left.includes("proof_roll"), left.join());
      return "proof roll, geotextile, then treat in place with no dig or refill";
    },
  },
]);

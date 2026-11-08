// F5-S9: Project Home's Sheets block retired. AC1 here; AC2 (the seed) is the runner's,
// browser/f5-s9.sh; AC3 (the F8 regression on the new seed) is the full regression, whose
// F8 fixtures now measure on a Riverside loaded through /drawing/load (lib/world.mjs).
//
//   ./browser/f5-s9.sh

import { APP, expect, run } from "./lib/bench.mjs";
import { call, signInAt } from "./lib/realtime.mjs";
import { riversideWorld } from "./lib/world.mjs";

const world = await riversideWorld();

// Updated 2026-10-25 (D-770): AC1 is D-315's now. The project page (Project Home) was removed (D-315 C5): its
// old address opens the project's takeoff, and the files are in the load screen. The step checks that,
// and that the seed's two prepared sheets are the takeoff's (no Upload drawings, no PDF input anywhere).
await run("f5-s9", [
  {
    title: "AC1 (D-315): the old project address opens the takeoff, whose Sheets list the seed's two sheets; no Upload drawings",
    run: async ({ page }) => {
      await signInAt(page, APP, world.owner.email, world.owner.password);
      await page.goto(`${APP}/project/${world.r.project}`);
      await page.waitForURL(new RegExp(`/project/${world.r.project}/takeoff`), { timeout: 30000 });
      await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 60000 });
      expect((await page.getByRole("button", { name: "Upload drawings" }).count()) === 0, "the old Upload drawings button");
      expect((await page.locator('input[accept="application/pdf"]').count()) === 0, "the old PDF input");
      await page.getByRole("heading", { name: "Sheets", exact: true }).waitFor();
      // The seed's two sheets, both prepared, and the second opens on the takeoff too.
      const sheets = (await call(world.token, "GET", `${world.r.takeoff.replace(/\/takeoff$/, "")}/drawing/sheet`)).body;
      expect(sheets.length === 2, `${sheets.length} sheets, not 2`);
      expect(sheets.every((sh) => ["ready", "prepared"].includes(sh.render_status)), `render: ${sheets.map((sh) => sh.render_status).join(",")}`);
      await page.goto(`${APP}/project/${world.r.project}/takeoff/${world.r.second}`);
      await page.locator('[data-sheet-image="fit"]').first().waitFor({ timeout: 60000 });
      return `/project/<id> → its takeoff, the Sheets panel; 2 sheets (${sheets.map((sh) => sh.render_status).join(", ")}), the second open too; no Upload drawings, no PDF input`;
    },
  },
]);

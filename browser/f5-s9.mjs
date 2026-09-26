// F5-S9: Project Home's Sheets block retired. AC1 here; AC2 (the seed) is the runner's,
// browser/f5-s9.sh; AC3 (the F8 regression on the new seed) is the full regression, whose
// F8 fixtures now measure on a Riverside loaded through /drawing/load (lib/world.mjs).
//
//   ./browser/f5-s9.sh

import { APP, expect, run } from "./lib/bench.mjs";
import { signInAt } from "./lib/realtime.mjs";
import { riversideWorld } from "./lib/world.mjs";

const world = await riversideWorld();

await run("f5-s9", [
  {
    title: "AC1: Project Home has no Sheets block; its files are the only place to put a drawing",
    run: async ({ page }) => {
      await signInAt(page, APP, world.owner.email, world.owner.password);
      await page.goto(`${APP}/project/${world.r.project}`);
      await page.locator("[data-file-browser]").waitFor({ timeout: 20000 });
      expect((await page.getByRole("heading", { name: "Sheets", exact: true }).count()) === 0, "a Sheets heading");
      expect((await page.getByRole("button", { name: "Upload drawings" }).count()) === 0, "the old Upload drawings button");
      expect((await page.locator('input[accept="application/pdf"]').count()) === 0, "the old PDF input");
      await page.getByRole("button", { name: "Upload files" }).first().waitFor();
      await page.getByText("2 sheets, 0 measurements").waitFor();
      return "no Sheets heading, no Upload drawings; Files with Upload files; \"2 sheets, 0 measurements\"";
    },
  },
]);

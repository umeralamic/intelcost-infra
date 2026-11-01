// C47, IntelCost's quarterly price release (F38 M11, D-917).
//
//   ./fx-suite.sh run named c47-material-release
//
// The world: one throwaway project with a line priced from Q4 2026, its owner made platform staff in the database step.
//   1. Developer › Material prices loads a sheet: the preview lists added and changed, by family, and flags over ±15 %;
//      Publish stays off until each flag is ticked; a release is published once.
//   2. Q1 2027 published: a saved component does not move; the estimate reads "IntelCost prices updated to Q1 2027: Review",
//      with old and new and each line's total before and after; Update takes one, the rest stay.
//   3. A release more than two quarters on: a Q4 2026 price reads may be stale in Needs attention.
// The test releases are deleted at the end: the fx database is shared.

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { grading, gradingSheets, openSheet } from "./lib/grading-world.mjs";
import { hostSql } from "./lib/host-sql.mjs";
import { waitFor } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("C47 Releases");
const project = await makeProject(token, base, { name: "Releases" });
const g = grading(token, base, project);
const comps = `${base}/${project.uuid}/estimate/components`;
const STONE = "stone:_57_stone";
const TAPE = "warning_tape";
let sheet;
let was;

const clean = async () => {
  for (const table of ["release_audit", "mat_default"]) await hostSql(`DELETE FROM matlib.${table} WHERE release_id IN (SELECT id FROM matlib.release WHERE title IN ('Q1 2027','Q4 2027'))`);
  await hostSql("DELETE FROM matlib.mat_item WHERE mat_key = 'fx:new_material'");
  await hostSql("DELETE FROM matlib.release WHERE title IN ('Q1 2027','Q4 2027')");
};

await run("c47-material-release", [
  {
    title: "setup: a line priced from Q4 2026; the owner made platform staff",
    run: async ({ page }) => {
      await clean();
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["R-1"]);
      const m = (key, unit) => ({ key, mat_key: key, name: key, qty_formula: "QTY", unit, wastage_pct: 0, round_to: null, round_scope: "line", sell_unit: unit });
      const put = await apiCall(token, "PUT", `${g.earthwork}/result/${sheet.uuid}`, { version_key: `fx-${Date.now()}`, result: { ok: true, units: "CY", cutCY: 0, fillCY: 0, netCY: 0, regions: [], coverage: 1, warnings: [], strip: null }, lines: [{ region_id: "util:sanitary", role: "utility_bedding_pipe_zone", name: "Pipe bedding", quantity: 100, unit: "CCY", variant: "a", work_scope: "site_utilities.sanitary", work_kind: null, utility: "sanitary", folder: "utilities", materials: [m(STONE, "TON"), m(TAPE, "ROLL")] }] });
      expect(put.status === 200, `save: ${put.status} ${JSON.stringify(put.body).slice(0, 200)}`);
      const list = (await apiCall(token, "GET", comps)).body;
      was = Object.fromEntries(list.filter((c) => c.mat_key).map((c) => [c.mat_key, Number(c.unit_price)]));
      expect(was[STONE] > 0 && was[TAPE] > 0, JSON.stringify(was));
      await hostSql(`UPDATE "user" SET is_platform_admin = true WHERE email = '${(await fixtureOwner()).email}'`);
      return `#57 $${was[STONE]}`;
    },
  },
  {
    title: "Developer › Material prices: the preview, its flags, Publish off until each is ticked",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/platform/material-prices`);
      await page.locator("[data-material-releases]").waitFor({ timeout: 30000 });
      await page.getByLabel("Release", { exact: true }).fill("Q1 2027");
      const csv = `mat_key,family,unit_price,sell_unit,grade,source\n${STONE},aggregate,${(was[STONE] * 1.2).toFixed(2)},TON,A,fixture\n${TAPE},accessory,${(was[TAPE] * 1.03).toFixed(2)},ROLL,D,fixture\nfx:new_material,other,9,EA,C,fixture\n`;
      await page.getByLabel("Release sheet").setInputFiles({ name: "q1.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
      await page.getByRole("button", { name: /^Preview 3 rows/ }).click();
      const view = page.locator("[data-release-preview]");
      await view.waitFor({ timeout: 15000 });
      const text = await view.innerText();
      expect(/1 added, 2 changed/.test(text) && /aggregate/.test(text) && /accessory/.test(text), text);
      expect(!text.includes("fixture"), "a source was shown");
      const publish = page.getByRole("button", { name: "Publish Q1 2027" });
      expect(await publish.isDisabled(), "Publish on with a flag not ticked");
      await page.getByLabel(`Checked ${STONE}`).check();
      expect(await publish.isEnabled(), "Publish off with every flag ticked");
      await publish.click();
      await page.locator("[data-release-list]", { hasText: "Q1 2027: 3 keys" }).waitFor({ timeout: 15000 });
      const again = await apiCall(token, "POST", "/api/platform/material-prices/publish", { title: "Q1 2027", rows: [{ mat_key: STONE, unit_price: 1, sell_unit: "TON" }], ticked: [] });
      expect(again.status === 409, `published twice: ${again.status}`);
      return "1 added, 2 changed, one flag ticked, Q1 2027 published";
    },
  },
  {
    title: "Q1 2027: nothing moved; Review lists old and new with the line's totals; Update takes one",
    run: async ({ page }) => {
      const now = async () => Object.fromEntries((await apiCall(token, "GET", comps)).body.filter((c) => c.mat_key).map((c) => [c.mat_key, Number(c.unit_price)]));
      expect((await now())[STONE] === was[STONE], "a saved price moved");
      await openSheet(page, project, sheet, "estimating");
      const banner = page.locator("[data-release-review]");
      await banner.waitFor({ timeout: 30000 });
      expect(/IntelCost prices updated to Q1 2027: Review/.test(await banner.innerText()), await banner.innerText());
      await banner.click();
      const row = page.locator(`[data-release-row="${STONE}"]`);
      await row.waitFor({ timeout: 15000 });
      const cells = await row.locator("td").allInnerTexts();
      expect(cells[2] !== cells[3] && /\$/.test(cells[2]) && /\$/.test(cells[3]), cells.join(" | "));
      await row.getByRole("button", { name: "Update" }).click();
      await waitFor(async () => Math.abs((await now())[STONE] - was[STONE] * 1.2) < 0.02, "the updated price", 15000, 300);
      expect((await now())[TAPE] === was[TAPE], "the other moved");
      return `line ${cells[2]} to ${cells[3]}; #57 took it, tape stayed`;
    },
  },
  {
    title: "a release more than two quarters on: the old price may be stale",
    run: async ({ page }) => {
      await hostSql("INSERT INTO matlib.release (title, released_on) VALUES ('Q4 2027', '2027-10-01')");
      await openSheet(page, project, sheet, "estimating");
      await waitFor(async () => /may be stale/.test(await page.locator("body").innerHTML()), "the stale flag", 30000, 500);
      return "reads may be stale";
    },
  },
  {
    title: "clean up the test releases",
    run: async () => {
      await clean();
      await hostSql(`UPDATE "user" SET is_platform_admin = false WHERE email = '${(await fixtureOwner()).email}'`);
      return "removed";
    },
  },
]);

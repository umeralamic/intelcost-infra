// C46, what the last queue left unproved.
//
//   ./fx-suite.sh run named c46-proofs
//
// The world: one throwaway project at ZIP 72601 (Boone County, AR), on a blank page.
//   1. The material factor on a real wage set: Save rates, and a Q4 2026 default comes back × (1 + the set's factor).
//   2. A tier swap keeps a person's edit (D-911): the crew edited, the quantity crosses a tier, the edit stays,
//      read as "Your edit, kept after the tier changed" (D-915).
//   3. The whole-fill tier (D-901): 4,000 CCY by truck and 4,000 pushed sit in A3's tier 3 each, tier 4 together.

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { grading, gradingSheets, openSheet } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C46 Proofs");
const project = await makeProject(token, base, { name: "Proofs" });
const g = grading(token, base, project);
const wage = `${base}/${project.uuid}/wage-calculator`;
const comps = `${base}/${project.uuid}/estimate/components`;
const prices = `${base}/${project.uuid}/estimate/material-prices`;
const lib = `/api/workspace/${workspace.uuid}/equipment-library`;
const plib = `${base}/${project.uuid}/estimate/equipment-library`;
const EMPTY = { ok: true, units: "CY", cutCY: 0, fillCY: 0, netCY: 0, regions: [], coverage: 1, warnings: [], strip: null };
let sheet;

const put = async (lines) => {
  const r = await apiCall(token, "PUT", `${g.earthwork}/result/${sheet.uuid}`, { version_key: `fx-${Date.now()}`, result: EMPTY, lines });
  expect(r.status === 200, `save: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
};

await run("c46-proofs", [
  {
    title: "setup: a project at 72601 and its blank page",
    run: async ({ page }) => {
      const patched = await apiCall(token, "PATCH", `${base}/${project.uuid}`, { project_type: "commercial", postal_code: "72601", state: "AR", city: "Harrison" });
      expect(patched.status === 200, `project: ${patched.status} ${JSON.stringify(patched.body).slice(0, 200)}`);
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["P-1"]);
      await apiCall(token, "GET", `${lib}/earthwork-production`);
      return `sheet ${sheet.uuid.slice(0, 8)}`;
    },
  },
  {
    title: "the material factor on a real wage set: a default comes back × (1 + the set's factor), with its words",
    run: async ({ page }) => {
      const key = "stone:_57_stone";
      const one = async () => (await apiCall(token, "GET", `${prices}/resolve?mat_key=${encodeURIComponent(key)}`)).body;
      const before = await one();
      expect(before.factor === 1 && /national/i.test(before.location ?? ""), JSON.stringify(before));
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating&pane=wage`);
      await page.locator("[data-wage-calculator]").waitFor({ timeout: 30000 });
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      // W10 (D-1041): location-adjusted rates always on; with nothing loaded Calculate says so.
      const basis = page.getByRole("region", { name: "Wage basis" });
      await basis.locator("[data-always-on]").waitFor();
      await basis.getByRole("button", { name: "Calculate with location-adjusted rates", exact: true }).click();
      await page.locator("[data-craft-table] tr[data-craft]").first().waitFor({ timeout: 30000 });
      await page.getByRole("button", { name: "Save rates to project", exact: true }).click();
      const confirm = page.getByRole("dialog").filter({ hasText: /labor rates\?/ });
      const toast = page.getByText("Labor rates saved to Proofs.").first();
      await Promise.race([toast.waitFor({ timeout: 30000 }).catch(() => undefined), confirm.waitFor({ timeout: 30000 }).catch(() => undefined)]);
      if (await confirm.isVisible().catch(() => false)) await confirm.getByRole("button", { name: /^(Recalculate|Continue|Save)$/ }).click();
      await toast.waitFor({ timeout: 30000 });
      const after = await one();
      expect(after.factor !== 1 && Math.abs(after.unit_price - before.unit_price * after.factor) < 0.001, `${before.unit_price}: ${JSON.stringify(after)}`);
      expect(/Location factor, ZIP 72601/.test(after.location), after.location);
      return `$${before.unit_price} national × ${after.factor.toFixed(4)} = $${after.unit_price}, "${after.location}"`;
    },
  },
  {
    title: "a tier swap keeps a person's edit, and says so",
    run: async ({ page }) => {
      const line = (quantity) => ({ region_id: "swap", role: "cut", name: "Cut, tier swap", quantity, unit: "BCY" });
      await put([line(2000)]);
      const crew = async () => (await apiCall(token, "GET", comps)).body.find((c) => c.auto_key === "crew" && c.kind === "labor");
      const first = await waitFor(crew, "the line's crew", 20000, 500);
      const edit = await apiCall(token, "PUT", `${comps}/${first.uuid}`, { kind: "labor", name: "Our own crew", pricing_mode: first.pricing_mode, crew: first.crew, production_basis: first.production_basis });
      expect(edit.status === 200 && (edit.body.user_fields ?? []).includes("name"), `edit: ${edit.status} ${JSON.stringify(edit.body).slice(0, 240)}`);
      await put([line(60000)]);
      const kept = await crew();
      expect(kept?.uuid === first.uuid && kept.name === "Our own crew" && kept.tier_kept === true, JSON.stringify(kept).slice(0, 300));
      await openSheet(page, project, sheet, "estimating");
      const row = page.locator('tr[data-estimate-row="Cut, tier swap"]').first();
      await row.waitFor({ timeout: 30000 });
      const open = row.getByRole("button", { name: "Show cost components" });
      if (await open.count()) await open.click();
      await page.locator('[data-msg="tier-kept"]').first().waitFor({ state: "attached", timeout: 15000 });
      return "2,000 to 60,000 BCY: the edited crew stayed, marked";
    },
  },
  {
    title: "the whole-fill tier: two 4,000 CCY spreads read tier 4 together, as 8,000 CCY of fill",
    run: async () => {
      const fill = (role, quantity) => ({ region_id: "__site__", role, name: role, quantity, unit: "CCY" });
      await put([fill("fill", 4000)]);
      const site = async () => (await apiCall(token, "GET", `${plib}/earthwork-production`)).body;
      const tierOf = (cfg, key) => {
        const act = cfg.activities.find((a) => a.national_key === key);
        const row = cfg.site.find((s) => s.activity_uuid === act.uuid || s.name === act.name);
        return [row?.prod_per_day, act.tiers.find((t) => t.id === row?.tier_id || t.uuid === row?.tier_uuid)?.tier_no ?? row?.tier_no];
      };
      const alone = tierOf(await site(), "A3");
      await put([fill("fill", 4000), fill("fill_push", 4000)]);
      const cfg = await site();
      const [truck, push] = [tierOf(cfg, "A3"), tierOf(cfg, "A16")];
      // Q145 (D-1014): every activity on the project's 8-hour day (D-960), so the tier file's 630 and 900 a 10-hour
      // day read 504 and 720.
      expect(alone[0] === 504, `alone: ${JSON.stringify(alone)}`);
      expect(truck[0] === 720 && push[0] === 720, `together: ${JSON.stringify([truck, push])}`);
      return `4,000 CCY alone ${alone[0]} CCY/day; split ${truck[0]} and ${push[0]}, the tier of 8,000`;
    },
  },
]);

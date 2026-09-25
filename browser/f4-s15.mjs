// F4-S15: move a project to Trash from its row, and the activity line it leaves (Block A
// check 5, carried here). Owner and admin only (D-26).
//
//   docker compose --profile browser run --rm browser node scripts/f4-s15.mjs

import { APP, apiCall, expect, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard, rowNames, tabStrip } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S15 trash");
const doomed = await makeProject(token, base, { name: "Doomed job" });
const survivor = await makeProject(token, base, { name: "Survivor job" });
const estimator = await seatedMember(token, workspace.uuid, "estimator", "f4s15");
const all = (strip) => strip.find((t) => t.label === "All")?.count;

await run("f4-s15", [
  {
    title: "AC1/AC2 — trash from the row: asks first, row leaves, toast, count drops; its page is gone",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await rowNames(page);
      const before = all(await tabStrip(page));
      await page.getByRole("button", { name: "Move Doomed job to Trash" }).click();
      await page.getByRole("dialog", { name: "Move project to Trash?" }).waitFor();
      await page.getByText(/Moves "Doomed job" to Trash\. All its folders, files, sheets and takeoff data go with it\./).waitFor();
      await page.getByRole("button", { name: "Move to Trash" }).click();
      await page.getByText("Project moved to Trash").waitFor({ timeout: 10000 });
      const names = await rowNames(page);
      expect(!names.includes("Doomed job") && names.includes("Survivor job"), `rows: ${names}`);
      expect(all(await tabStrip(page)) === before - 1, "All count did not drop");
      await page.goto(`${APP}/project/${doomed.uuid}`);
      await page.getByRole("heading", { name: "Project not found" }).waitFor({ timeout: 15000 });
      // Block E's words (F4-S20), where Block C's page showed the api's "No such project."
      return `All ${before} → ${before - 1} · its page says "Project not found"`;
    },
  },
  {
    title: "Check 5 (from Block A) — Settings, Activity reads \"moved the project Doomed job to Trash\"",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await page.goto(`${APP}/settings/activity`);
      await page.getByText("moved the project Doomed job to Trash").waitFor({ timeout: 20000 });
      return "the line is there, in words";
    },
  },
  {
    title: "AC3 — an estimator has no bin, and a hand-written trash is refused by name",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, estimator.email, "/?tab=all");
      await rowNames(page);
      expect((await page.getByRole("button", { name: /to Trash$/ }).count()) === 0, "estimator sees a bin");
      const refused = await apiCall(estimator.token, "DELETE", `${base}/${survivor.uuid}`);
      expect(refused.status === 403, `estimator DELETE: ${refused.status}`);
      expect(refused.body?.detail === "Your role cannot change workspace settings.", `refusal: ${refused.body?.detail}`);
      return "no bin · 403 in words";
    },
  },
]);

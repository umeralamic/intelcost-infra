// F4-S20: Project Home's header, its entry points, the tab title, and "Project not
// found" for a project that does not resolve or has gone to Trash.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s20.mjs
//
// Updated 2026-10-24 (D-315, D-313, D-314, D-622): Project Home is gone (D-315 C5): `/project/<uuid>`
// redirects to the project's takeoff with Edit Project open.
// AC1/AC2 rewritten against where it lands: the address becomes `/project/<uuid>/takeoff?edit=<uuid>`
// (D-315 C5), the Edit Project dialog names the project and shows its status (Status reads
// Submitted, D-315 1), the takeoff's title bar names the project, and the tab is named for it,
// "<name> · Takeoff — IntelCost" on a project with no sheets (D-313 A5). Retired with the header
// (D-315 C5, the project page and `PerformTakeoffButton` deleted): the header's Edit details, the
// disabled Estimating button with its reason, Perform Takeoff and "Back to Projects" (the redirect
// itself is the takeoff, Estimating is a tab of it, and the Open menu holds All projects, D-315 C4).
// AC3: "Project not found" for both is the route guard's now (D-622); its "Back to Projects" opens
// the All projects dialog (D-314: `/projects` is Home with `?projects=open`), not a "Projects" page.
// Step 3 retired: the project page's loading skeleton (`[data-project-loading]`) was removed with
// ProjectHome by D-315 C5.

import { randomUUID } from "node:crypto";

import { APP, SEEDED, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S20 home");
const job = await makeProject(token, base, { name: "Riverside clinic" }, "submitted");
const binned = await makeProject(token, base, { name: "Binned job" });
await apiCall(token, "DELETE", `${base}/${binned.uuid}`);

async function signIn(page) {
  await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
  await enterWorkspace(page, workspace.uuid);
}

await run("f4-s20", [
  {
    title: "AC1/AC2 — /project/<uuid> lands on its takeoff with Edit Project: name, status Submitted; the takeoff and the tab are named for the project",
    run: async ({ page }) => {
      await signIn(page);
      await page.goto(`${APP}/project/${job.uuid}`);
      const dialog = page.getByRole("dialog", { name: /Edit Project/ });
      await dialog.locator('form[data-edit-project="Riverside clinic"]').waitFor({ timeout: 20000 });
      const url = new URL(page.url());
      expect(url.pathname === `/project/${job.uuid}/takeoff` && url.searchParams.get("edit") === job.uuid, `landed on ${url.pathname}${url.search}`);
      const name = await page.inputValue("#edit-project-name");
      expect(name === "Riverside clinic", `name ${name}`);
      // The statuses arrive on their own query: waited for, not read on opening.
      const picker = dialog.getByLabel("Status");
      await page.waitForFunction((el) => el.selectedIndex >= 0 && el.options.length > 0, await picker.elementHandle(), { timeout: 15000 });
      const status = await picker.evaluate((el) => el.options[el.selectedIndex]?.textContent ?? "");
      expect(status === "Submitted", `status ${status}`);
      await page.getByText("Riverside clinic", { exact: true }).first().waitFor();
      await page.waitForFunction(() => document.title.startsWith("Riverside clinic"), null, { timeout: 15000 });
      const title = await page.title();
      expect(title === "Riverside clinic · Takeoff — IntelCost", `title ${title}`);
      return `"${name}" · ${status} · ${url.pathname}?edit · tab "${title}"`;
    },
  },
  {
    title: "AC3 — a random uuid and a trashed project both read \"Project not found\", with a way back",
    run: async ({ page }) => {
      await signIn(page);
      const seen = [];
      for (const target of [randomUUID(), binned.uuid]) {
        await page.goto(`${APP}/project/${target}`);
        await page.getByRole("heading", { name: "Project not found" }).waitFor({ timeout: 15000 });
        seen.push(await page.locator("[data-not-found]").innerText());
      }
      await page.getByRole("link", { name: "Back to Projects" }).click();
      await page.getByRole("dialog", { name: "All projects" }).waitFor({ timeout: 15000 });
      expect(!seen.some((text) => /Loading/.test(text)), "a spinner in the not-found state");
      return `both not found · back to the All projects list · "${seen[0].replace(/\s+/g, " ").trim()}"`;
    },
  },
]);

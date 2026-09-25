// F4-S20: Project Home's header, its entry points, the tab title, and "Project not
// found" for a project that does not resolve or has gone to Trash.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s20.mjs

import { randomUUID } from "node:crypto";

import { APP, apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openFiles } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S20 home");
const job = await makeProject(token, base, { name: "Riverside clinic" }, "submitted");
const binned = await makeProject(token, base, { name: "Binned job" });
await apiCall(token, "DELETE", `${base}/${binned.uuid}`);

const header = (page) => page.locator("[data-project-header]");

await run("f4-s20", [
  {
    title: "AC1/AC2 — name, status badge, Edit details, Estimating (disabled, with its reason), Perform Takeoff; the tab is named for the project",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      const name = await header(page).getByRole("heading", { level: 1 }).innerText();
      const badge = await header(page).locator("[data-project-status]").innerText();
      expect(name === "Riverside clinic", `name ${name}`);
      expect(badge === "Submitted", `badge ${badge}`);
      await header(page).getByRole("button", { name: "Edit details" }).waitFor();
      const estimating = header(page).getByRole("button", { name: "Estimating" });
      expect(await estimating.isDisabled(), "Estimating is enabled");
      const reason = await header(page).locator("[data-estimating-reason]").innerText();
      expect(reason === "Estimating arrives with the estimating tab.", `reason ${reason}`);
      await header(page).getByRole("button", { name: "Perform Takeoff" }).waitFor();
      await page.getByRole("link", { name: "Back to Projects" }).first().waitFor();
      const title = await page.title();
      expect(title === "Riverside clinic — IntelCost", `title ${title}`);
      return `"${name}" · ${badge} · "${reason}" · tab "${title}"`;
    },
  },
  {
    title: "AC3 — a random uuid and a trashed project both read \"Project not found\", with a way back",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      const seen = [];
      for (const target of [randomUUID(), binned.uuid]) {
        await page.goto(`${APP}/project/${target}`);
        await page.getByRole("heading", { name: "Project not found" }).waitFor({ timeout: 15000 });
        seen.push(await page.locator("[data-not-found]").innerText());
      }
      await page.getByRole("link", { name: "Back to Projects" }).click();
      await page.getByRole("heading", { name: "Projects", exact: true }).waitFor({ timeout: 15000 });
      expect(!seen.some((text) => /Loading/.test(text)), "a spinner in the not-found state");
      return `both not found · back to the dashboard · "${seen[0].replace(/\s+/g, " ").trim()}"`;
    },
  },
  {
    title: "AC4 — while the project loads, the page shows its skeleton, not an empty shell",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      // Hold the project read for two seconds, and look while it is held.
      // The api's read, not the page's own address, which ends the same way.
      await page.route(new RegExp(`:8000/api/.*/project/${job.uuid}$`), async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });
      await page.reload();
      await page.locator("[data-project-loading]").waitFor({ timeout: 5000 });
      const skeletons = await page.locator("[data-project-loading] .animate-pulse").count();
      await header(page).getByRole("heading", { name: "Riverside clinic" }).waitFor({ timeout: 15000 });
      expect(skeletons >= 3, `${skeletons} skeleton blocks`);
      return `${skeletons} skeleton blocks while loading, then the header`;
    },
  },
]);

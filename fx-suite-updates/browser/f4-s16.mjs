// F4-S16: legacy's addresses redirect, so old bookmarks land somewhere useful, and Back
// does not bounce through them.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s16.mjs
//
// Updated 2026-10-24 (D-325, D-87, D-311, D-315):
// - The page each round starts from, Settings › General, is drawn inside the one settings frame,
//   whose heading is "Workspace settings" (D-325 1, D-87); it is waited on by that heading, not by
//   a page heading "General".
// - /app, /files and /takeoff still go Home, and Home is takeoff now (D-311 1): with one project and
//   no sheet visited it goes on, replacing, to that project's takeoff, which is where they land.
// - /projects/:id lands on the project's takeoff with Edit Project (`/project/:id/takeoff?edit=:id`,
//   D-315 C5), the project page being gone. Back skipping the old address is unchanged.

import { APP, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S16 redirects");
const job = await makeProject(token, base, { name: "Bookmarked job" });

await run("f4-s16", [
  {
    title: "AC1/AC2 — /app, /files, /takeoff and /projects/:id land on their targets, with replace",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      const landed = [];
      for (const [from, to] of [
        // Home goes on to the one project's takeoff (D-311 1).
        ["/app", `/project/${job.uuid}/takeoff`],
        ["/files", `/project/${job.uuid}/takeoff`],
        ["/takeoff", `/project/${job.uuid}/takeoff`],
        // Edit Project over its takeoff (D-315 C5).
        [`/projects/${job.uuid}`, `/project/${job.uuid}/takeoff`],
      ]) {
        await page.goto(`${APP}/settings/general`);
        await page.getByRole("heading", { name: "Workspace settings" }).waitFor({ timeout: 15000 });
        await page.goto(`${APP}${from}`);
        await page.waitForURL((url) => url.pathname === to, { timeout: 15000 });
        if (from.startsWith("/projects/")) {
          expect(new URL(page.url()).searchParams.get("edit") === job.uuid, `${from} landed on ${page.url()}, without Edit Project`);
          await page.getByRole("dialog", { name: "Edit Project" }).waitFor({ timeout: 15000 });
        }
        await page.goBack();
        await page.waitForURL((url) => url.pathname === "/settings/general", { timeout: 15000 });
        landed.push(`${from} → ${to}`);
      }
      return `${landed.join(" · ")} · Back skips the old address each time`;
    },
  },
]);

expect(true, "");

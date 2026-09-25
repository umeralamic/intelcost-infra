// F4-S16: legacy's addresses redirect, so old bookmarks land somewhere useful, and Back
// does not bounce through them.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s16.mjs

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
        ["/app", "/"],
        ["/files", "/"],
        ["/takeoff", "/"],
        [`/projects/${job.uuid}`, `/project/${job.uuid}`],
      ]) {
        await page.goto(`${APP}/settings/general`);
        await page.getByRole("heading", { name: "General" }).waitFor({ timeout: 15000 });
        await page.goto(`${APP}${from}`);
        await page.waitForURL((url) => url.pathname === to, { timeout: 15000 });
        await page.goBack();
        await page.waitForURL((url) => url.pathname === "/settings/general", { timeout: 15000 });
        landed.push(`${from} → ${to}`);
      }
      return `${landed.join(" · ")} · Back skips the old address each time`;
    },
  },
]);

expect(true, "");

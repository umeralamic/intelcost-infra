// F8-S10: the collaboration mode setting (D-32).
//
//   docker compose --profile browser run --rm browser node scripts/f8-s10.mjs
//
// Needs the realtime profile (window B on :5174).

import { APP, SEEDED, apiLogin, createWorkspace, expect, firstWorkspace, run } from "./lib/bench.mjs";
import { APP_B, WINDOW_B, call, ensureWindowB, joinedTopic, recordSockets, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";
import { setMode } from "./lib/takeoff.mjs";

const token = await apiLogin();
const workspace = await firstWorkspace(token);
const tokenB = await ensureWindowB();
const checked = (page) => page.$eval('[role="radio"][aria-checked="true"]', (el) => el.getAttribute("data-mode"));

await run("f8-s10", [
  {
    title: "AC1: a new workspace reads Work together",
    run: async () => {
      const made = await createWorkspace(token, `F8-S10 fresh ${Date.now()}`);
      expect(made.collaboration_mode === "work_together", `a new workspace reads ${made.collaboration_mode}`);
      return "work_together";
    },
  },
  {
    title: "AC2, AC4: the owner chooses One at a time; it saves, the activity feed records it, and window B sees it arrive with no reload",
    run: async ({ page, context }) => {
      await setMode(token, workspace.uuid, "work_together");
      await recordSockets(context);
      await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspace.uuid);
      await signInAt(page, APP, SEEDED.email, SEEDED.password);
      const b = await secondWindow(context);
      try {
        await b.page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspace.uuid);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await b.page.goto(`${APP_B}/settings/collaboration`);
        await joinedTopic(b.page, `ws:${workspace.uuid}`);
        expect((await checked(b.page)) === "work_together", "B does not start on Work together");

        await page.goto(`${APP}/settings/collaboration`);
        await page.locator('[data-mode="one_at_a_time"]').click();
        await waitFor(async () => (await checked(page)) === "one_at_a_time", "A's choice to save", 5000);
        await waitFor(async () => (await checked(b.page)) === "one_at_a_time", "B to see the change", 5000);

        const feed = await call(token, "GET", `/api/workspace/${workspace.uuid}/activity?limit=5`);
        const row = feed.body.items.find((r) => (r.target ?? "").includes("collaboration_mode"));
        expect(row, `no activity row: ${JSON.stringify(feed.body.items.slice(0, 2))}`);
        return "saved as one_at_a_time; the feed has it; B's radio moved with no reload";
      } finally {
        await setMode(token, workspace.uuid, "work_together");
        await b.context.close();
      }
    },
  },
  {
    title: "AC3: an estimator sees the mode and cannot change it; a hand-written change is refused with the capability",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspace.uuid);
      await signInAt(page, APP_B, WINDOW_B.email, WINDOW_B.password);
      await page.goto(`${APP_B}/settings/collaboration`);
      await page.getByRole("radiogroup").waitFor();
      const enabled = await page.locator('[role="radio"]:not([disabled])').count();
      const note = await page.getByRole("status").filter({ hasText: "You can read this" }).count();
      const refused = await call(tokenB, "PATCH", `/api/workspace/${workspace.uuid}`, { collaboration_mode: "warn" });
      expect(enabled === 0, `${enabled} options are clickable for an estimator`);
      expect(note === 1, "no read-only note");
      expect(refused.status === 403, `hand-written change: ${refused.status}`);
      return `all three options disabled with a note; hand-written: 403 "${refused.body.detail}"`;
    },
  },
]);

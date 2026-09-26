// F8-S5 AC3: Redis goes away for ten seconds with two windows open.
//
// Not run on its own: browser/f8-s5.sh starts it and, on "PHASE stop-redis", stops Redis
// for 10 s and starts it again.

import { APP, SEEDED, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import {
  APP_B,
  WINDOW_B,
  appSockets,
  call,
  ensureWindowB,
  joinedTopic,
  secondWindow,
  recordSockets,
  signInAt,
  waitFor,
} from "./lib/realtime.mjs";

await ensureWindowB();
const token = await apiLogin();
const workspace = await firstWorkspace(token);
const original = workspace.name;
const topic = `ws:${workspace.uuid}`;
const headerName = (page) => page.$eval("header select", (s) => s.selectedOptions[0]?.text ?? "");
const redisUp = async () => (await call(token, "GET", "/health")).body?.redis === "ok";

await run("f8-s5-outage", [
  {
    title: "AC3: Redis stops for 10 s: nothing crashes, sockets stay open, writes still succeed, and the next event after it returns reaches both windows",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspace.uuid);
      await signInAt(page, APP, SEEDED.email, SEEDED.password);
      const b = await secondWindow(context);
      try {
        await b.page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspace.uuid);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await joinedTopic(page, topic);
        await joinedTopic(b.page, topic);
        const before = [(await appSockets(page)).length, (await appSockets(b.page)).length];

        console.log("PHASE stop-redis");
        await waitFor(async () => !(await redisUp()), "Redis to go down", 20000, 500);
        const during = await call(token, "PATCH", `/api/workspace/${workspace.uuid}`, {
          name: `${original} (outage)`,
        });

        await waitFor(redisUp, "Redis to come back", 40000, 500);
        // The listener retries once a second; give it a moment to resubscribe.
        await page.waitForTimeout(3000);
        const renamed = `${original} (F8-S5 ${Date.now() % 100000})`;
        await call(token, "PATCH", `/api/workspace/${workspace.uuid}`, { name: renamed });
        await waitFor(async () => (await headerName(page)) === renamed, "window A to hear the next event", 8000);
        await waitFor(async () => (await headerName(b.page)) === renamed, "window B to hear the next event", 8000);

        const after = [await appSockets(page), await appSockets(b.page)];
        expect(during.status === 200, `a write during the outage got ${during.status}`);
        expect(
          after[0].length === before[0] && after[1].length === before[1] && after.every((s) => s.at(-1).close === null),
          "a socket closed or was replaced during the outage",
        );
        return `write during the outage: 200; both sockets stayed open; after Redis returned both headers read "${renamed}"`;
      } finally {
        await call(token, "PATCH", `/api/workspace/${workspace.uuid}`, { name: original });
        await b.context.close();
      }
    },
  },
]);

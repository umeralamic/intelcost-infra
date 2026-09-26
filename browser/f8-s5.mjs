// F8-S5: publish after commit, and the Redis fan-out across api processes.
//
//   ./browser/f8-s5.sh      (runs this, the rollback drive, then the Redis outage)
//
// Needs the realtime profile: window A on :5173 talks to `api`, window B on :5174 to
// `api-b`. An event one of them hears from the other's process has crossed Redis.

import { APP, SEEDED, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import {
  APP_B,
  WINDOW_B,
  appSockets,
  call,
  ensureWindowB,
  eventsOn,
  joinedTopic,
  readySocket,
  recordSockets,
  secondWindow,
  signInAt,
  waitFor,
} from "./lib/realtime.mjs";

await ensureWindowB();
const token = await apiLogin();
const workspace = await firstWorkspace(token);
const original = workspace.name;
const headerName = (page) => page.$eval("header select", (s) => s.selectedOptions[0]?.text ?? "");

await run("f8-s5", [
  {
    title: "AC1: one committed change reaches both windows, on two api processes, once each",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspace.uuid);
      await signInAt(page, APP, SEEDED.email, SEEDED.password);
      const b = await secondWindow(context);
      try {
        await b.page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspace.uuid);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        const [sa, sb] = [await readySocket(page), await readySocket(b.page)];
        expect(sa.url.includes(":8000/") && sb.url.includes(":8010/"), `sockets on ${sa.url} and ${sb.url}`);
        // `ready` is not `joined`: a publish before the join lands is, correctly, not heard.
        await joinedTopic(page, `ws:${workspace.uuid}`);
        await joinedTopic(b.page, `ws:${workspace.uuid}`);

        const renamed = `${original} (F8-S5 ${Date.now() % 100000})`;
        const patched = await call(token, "PATCH", `/api/workspace/${workspace.uuid}`, { name: renamed });
        expect(patched.status === 200, `rename: ${patched.status}`);

        await waitFor(async () => (await headerName(page)) === renamed, "window A's header to show the new name", 5000);
        await waitFor(async () => (await headerName(b.page)) === renamed, "window B's header to show the new name", 5000).catch(
          async (error) => {
            const frames = (await appSockets(b.page)).map((s) => ({
              url: s.url,
              sent: s.sent.filter((f) => f.type !== "ping").map((f) => `${f.type} ${f.topic ?? ""}`),
              got: s.received.filter((f) => f.type !== "pong").map((f) => `${f.type} ${f.topic ?? ""} ${f.name ?? ""}`),
            }));
            throw new Error(`${error.message}; B header "${await headerName(b.page)}"; ${JSON.stringify(frames)}`);
          },
        );
        const [ea, eb] = [
          await eventsOn(page, "workspace.settings.updated"),
          await eventsOn(b.page, "workspace.settings.updated"),
        ];
        expect(ea.length === 1 && eb.length === 1, `events: A ${ea.length}, B ${eb.length}`);
        expect(JSON.stringify(eb[0].payload.fields) === '["name"]', `payload ${JSON.stringify(eb[0].payload)}`);
        return `A (api :8000) and B (api-b :8010) each got workspace.settings.updated once; both headers read "${renamed}"`;
      } finally {
        await call(token, "PATCH", `/api/workspace/${workspace.uuid}`, { name: original });
        await b.context.close();
      }
    },
  },
]);

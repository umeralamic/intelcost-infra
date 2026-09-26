// F8-S8: reconnect refetches; no replay.
//
//   ./browser/f8-s8.sh      (restarts api-b on this fixture's cue)
//
// Window B sits on the dashboard on :5174 (api-b). While its api process is restarting,
// changes land through `api`: a new project and a workspace rename. B's socket is down,
// so their events are lost to it by design. When it reconnects it refetches what is on
// screen and shows both, and it never receives an event from the gap.

import { SEEDED, apiLogin, discardProject, expect, firstWorkspace, run } from "./lib/bench.mjs";
import { APP_B, appSockets, call, joinedTopic, recordSockets, signInAt, waitFor } from "./lib/realtime.mjs";

const token = await apiLogin();
const workspace = await firstWorkspace(token);
const original = workspace.name;
const topic = `ws:${workspace.uuid}`;
const headerName = (page) => page.$eval("header select", (s) => s.selectedOptions[0]?.text ?? "");

await run("f8-s8", [
  {
    title: "AC1, AC2, AC3: api-b restarts while changes land elsewhere; B's reconnect refetches both, and no event from the gap arrives",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspace.uuid);
      await signInAt(page, APP_B, SEEDED.email, SEEDED.password);
      await joinedTopic(page, topic);
      const first = (await appSockets(page)).at(-1);

      console.log("PHASE restart-api-b");
      await waitFor(async () => (await appSockets(page))[0].close, "B's socket to close", 30000, 200);
      const downAt = Date.now();

      const name = `F8-S8 made while B was away ${Date.now()}`;
      let created;
      const renamed = `${original} (F8-S8 ${Date.now() % 100000})`;
      try {
        created = await call(token, "POST", `/api/workspace/${workspace.uuid}/project`, { name });
        const patched = await call(token, "PATCH", `/api/workspace/${workspace.uuid}`, { name: renamed });
        expect(created.status === 201 && patched.status === 200, "the writes during the gap failed");

        const back = await waitFor(
          async () => (await appSockets(page)).at(-1).received.find((f) => f.type === "ready" && (f.at ?? 0) > downAt),
          "B to reconnect",
          60000,
          200,
        );
        await waitFor(async () => (await headerName(page)) === renamed, "B's header to show the rename", 4000);
        await page.getByText(name).first().waitFor({ timeout: 4000 });
        const shownAt = Date.now();

        const all = await appSockets(page);
        const fromGap = all.slice(1).flatMap((s) => s.received).filter((f) => f.type === "event");
        const closed = all[0].close;
        expect(all[0].opened === first.opened, "the first socket is not the one that was open");
        expect(closed.code === 1012, `B's socket closed ${closed.code}`);
        expect(fromGap.length === 0, `${fromGap.length} event(s) from the gap arrived after reconnect`);
        return `B's socket closed 1012; after its reconnect it showed the new project and the rename ${((shownAt - back.at) / 1000).toFixed(1)} s later, with no replayed event`;
      } finally {
        await call(token, "PATCH", `/api/workspace/${workspace.uuid}`, { name: original });
        // The project made in the gap does not stay in the seeded workspace.
        if (created?.body?.uuid) await discardProject(token, workspace.uuid, created.body.uuid);
      }
    },
  },
]);

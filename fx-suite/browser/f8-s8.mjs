// F8-S8: reconnect refetches; no replay.
//
//   ./browser/f8-s8.sh      (restarts api-b on this fixture's cue)
//
// Window B sits on the dashboard on :5174 (api-b). While its api process is restarting,
// changes land through `api`: a new project and a workspace rename. B's socket is down,
// so their events are lost to it by design. When it reconnects it refetches what is on
// screen and shows both, and it never receives an event from the gap.
//
// Updated 2026-10-24 (D-311, D-314, D-705, D-566): today's screens; the restart, the two writes in
// the gap, the 4 s each has to show after the reconnect, the 1012 close and "no event from the gap"
// are unchanged.
// - D-311 1, D-314: the dashboard is the "All projects" dialog (`/?projects=open`), as in f8-s15 and
//   f8-s16; B opens it after signing in (sign-ins land on Account settings, D-566), and the project
//   made in the gap is looked for in that dialog. Home opens a project behind the dialog, so the
//   workspace is given one project before B opens it (a workspace with none shows the empty takeoff,
//   whose own refetch would move the tab to the new project instead of drawing it in a list).
// - D-705: there is no header workspace select; the avatar menu names the open workspace as its
//   current Workspaces row (`aria-current`), from the same session workspace list the select drew.
//   After the project shows, the dialog is closed and the avatar menu opened, and the rename is read
//   there, with the same 4 s.

import { SEEDED, apiLogin, discardProject, expect, firstWorkspace, run, ownWorkspace } from "./lib/bench.mjs";
import { APP_B, appSockets, call, joinedTopic, recordSockets, signInAt, waitFor } from "./lib/realtime.mjs";

// Its own account and workspace, never the seeded one.
const { owner, token, workspace } = await ownWorkspace(`F8-S8 ${Date.now()}`);
const original = workspace.name;
const topic = `ws:${workspace.uuid}`;
// The open workspace's name, as the avatar menu's current Workspaces row draws it (D-705). The row
// also carries the role as a tag, so the name is read from the row's text start.
const headerName = async (page) => {
  const current = page.getByRole("menu").locator('[role="menuitem"][aria-current="true"]').first();
  if (!(await current.count())) {
    await page.locator("[data-avatar]").first().click();
    await current.waitFor({ timeout: 2000 });
  }
  return ((await current.textContent()) ?? "").trim();
};
const allProjects = (page) => page.getByRole("dialog", { name: "All projects" });
// A project to open behind the dialog (D-311 1), discarded at the end.
const seed = (await call(token, "POST", `/api/workspace/${workspace.uuid}/project`, { name: `F8-S8 open ${Date.now()}` })).body;

await run("f8-s8", [
  {
    title: "AC1, AC2, AC3: api-b restarts while changes land elsewhere; B's reconnect refetches both, and no event from the gap arrives",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspace.uuid);
      await signInAt(page, APP_B, owner.email, owner.password);
      // The dashboard is the All projects dialog (D-314), over the project Home opens.
      await page.goto(`${APP_B}/?projects=open`);
      await allProjects(page).getByText(seed.name).first().waitFor({ timeout: 20000 });
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
        await allProjects(page).getByText(name).first().waitFor({ timeout: 4000 });
        // The dialog is modal: closed, then the avatar menu read (D-705).
        await page.keyboard.press("Escape");
        await allProjects(page).waitFor({ state: "detached", timeout: 2000 });
        await waitFor(async () => (await headerName(page)).startsWith(renamed), "B's avatar menu to name the renamed workspace", 4000);
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
        if (seed?.uuid) await discardProject(token, workspace.uuid, seed.uuid);
      }
    },
  },
]);

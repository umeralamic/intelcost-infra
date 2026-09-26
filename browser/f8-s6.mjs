// F8-S6: publishing from Celery workers.
//
//   ./browser/f8-s6.sh      (does the database and worker part on this fixture's cues)
//
//   PHASE age <uuid>   the runner puts that project 31 days into Trash
//   PHASE dry          the runner runs the purge as a dry run
//   PHASE purge        the runner runs the purge for real

import { SEEDED, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import { APP_B, call, eventsOn, joinedTopic, recordSockets, signInAt, waitFor } from "./lib/realtime.mjs";

const token = await apiLogin();
const workspace = await firstWorkspace(token);
const base = `/api/workspace/${workspace.uuid}/project`;

/** Wait for the runner to finish a phase: it writes a marker file the fixture can see. */
async function cue(phase, detail = "") {
  console.log(`PHASE ${phase}${detail ? ` ${detail}` : ""}`);
  const { access } = await import("node:fs/promises");
  await waitFor(
    () => access(`/drive/scripts/.f8-s6-${phase}-done`).then(() => true, () => false),
    `the runner to finish ${phase}`,
    90000,
    500,
  );
}

await run("f8-s6", [
  {
    title: "AC1, AC2: the nightly purge on the worker removes a row from an open Trash with no reload; a dry run publishes nothing",
    run: async ({ page, context }) => {
      const name = `F8-S6 purge ${Date.now()}`;
      const created = await call(token, "POST", base, { name });
      expect(created.status === 201, `create: ${created.status}`);
      const trashed = await call(token, "DELETE", `${base}/${created.body.uuid}`);
      expect(trashed.status === 200, `trash: ${trashed.status}`);

      // Window B: the second app, on the second api process.
      await recordSockets(context);
      await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspace.uuid);
      await signInAt(page, APP_B, SEEDED.email, SEEDED.password);
      await page.goto(`${APP_B}/settings/trash`);
      await page.getByText(name).waitFor({ timeout: 15000 });
      await joinedTopic(page, `ws:${workspace.uuid}`);

      await cue("age", created.body.uuid);
      await cue("dry");
      await page.waitForTimeout(3000);
      const afterDry = await eventsOn(page, "project.purged");
      const stillThere = await page.getByText(name).count();

      await cue("purge");
      await waitFor(async () => (await page.getByText(name).count()) === 0, "the row to leave Trash", 15000);
      const events = await eventsOn(page, "project.purged");
      const mine = events.find((e) => e.payload.project_uuid === created.body.uuid);

      expect(afterDry.every((e) => e.payload.project_uuid !== created.body.uuid), "the dry run published");
      expect(stillThere === 1, "the dry run removed the row");
      expect(mine, "no project.purged for this project");
      expect(mine.write_token === null, "a worker's event carried a write token");
      return `dry run: nothing published, row stays · real run: project.purged from the worker, row gone from B's open Trash (api-b) with no reload`;
    },
  },
]);

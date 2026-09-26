// F5-S2: preparation on the worker (D-14, D-20, D-36 Q3).
//
//   ./browser/f5-s2.sh      (the runner stops and starts the worker on this fixture's cues)
//
// A fresh workspace and project, discarded at the end: "Set A.pdf" (3 pages), "Set C.pdf"
// (2 pages) and "Site.png" in Plans. Cues the runner answers, each with a marker file:
//
//   PHASE objects <project>   the drive checks MinIO for each prepared page's objects
//   PHASE stop-worker         the runner stops the worker
//   PHASE start-worker        the runner starts it again
//   PHASE lose-queue          the runner drops the queued jobs, as a killed run loses its own
//   PHASE sweep <file>        the drive ages the file past ten minutes and runs the sweep

import { access } from "node:fs/promises";

import { APP, SEEDED, apiCall, discardProject, expect, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, makePng, preparedSheets, sheetsOf, uploadAll } from "./lib/drawings.mjs";
import { appSockets, recordSockets, waitFor } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S2 prepare");
const project = await makeProject(token, base, { name: "Prepare" });
let files;

let cues = 0;
async function cue(phase, detail = "") {
  cues += 1;
  console.log(`PHASE ${phase}${detail ? ` ${detail}` : ""}`);
  const done = `/drive/scripts/.f5-s2-${cues}-done`;
  for (let i = 0; i < 600; i++) {
    if (await access(done).then(() => true, () => false)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`the runner never answered ${phase}`);
}

await run("f5-s2", [
  {
    title: "setup: two PDFs and a PNG uploaded into Plans",
    run: async ({ page }) => {
      files = await uploadAll(page, token, base, project.uuid, [
        { name: "Set A.pdf", buffer: makePdf(letterPages(3, "A")), folder: "Plans" },
        { name: "Set C.pdf", buffer: makePdf(letterPages(2, "C")), folder: "Plans" },
        { name: "Site.png", buffer: makePng(800, 600), folder: "Plans" },
      ], workspace.uuid);
      return Object.keys(files).join(", ");
    },
  },
  {
    title: "AC4 and AC1: the Load answers with the pages pending; then each gains a split source, a thumbnail and a fit image, and reads prepared",
    run: async () => {
      const started = Date.now();
      const loaded = await loadPages(token, base, project.uuid, [
        [files["Set A.pdf"].uuid, [1, 2]],
        [files["Site.png"].uuid, [1]],
      ]);
      const took = Date.now() - started;
      expect(loaded.status === 200, `load: ${loaded.status} ${JSON.stringify(loaded.body)}`);
      const statuses = loaded.body.sheets.map((s) => s.render_status);
      expect(statuses.every((s) => s === "pending"), `the Load answered with ${statuses.join(",")}`);
      for (const f of loaded.body.files) await preparedSheets(token, base, project.uuid, f.file_uuid);
      await cue("objects", project.uuid);
      const sheets = await sheetsOf(token, base, project.uuid);
      const sized = sheets.filter((s) => s.width_pt > 0 && s.height_pt > 0).length;
      expect(sized === 3, `${sized} of 3 sheets have their size`);
      return `answered in ${took} ms with 3 pending; all 3 prepared (objects checked by the drive, below)`;
    },
  },
  {
    title: "AC2: a window with the sheet open hears drawing.source.changed and shows the prepared page, with no reload",
    run: async ({ page, context }) => {
      await cue("stop-worker");
      const loaded = await loadPages(token, base, project.uuid, [[files["Set A.pdf"].uuid, [3]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      const sheet = loaded.body.sheets[0];

      await recordSockets(context);
      await signInAs(page, SEEDED.email, SEEDED.password);
      await page.selectOption("header select", workspace.uuid).catch(() => {});
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
      await page.getByText("This sheet has no image").waitFor({ timeout: 20000 });
      await page.evaluate(() => {
        window.__sameDocument = true;
      });

      await cue("start-worker");
      const started = Date.now();
      await page.locator('img[alt="Drawing sheet"]').waitFor({ timeout: 90000 });
      const shownAfter = Date.now() - started;
      expect(await page.evaluate(() => window.__sameDocument === true), "the page reloaded");
      const frames = (await appSockets(page)).flatMap((s) => s.received);
      const heard = frames.filter((f) => f.type === "event" && f.name === "drawing.source.changed" && f.payload?.sheet_uuid === sheet.uuid);
      expect(heard.length === 1, `heard ${heard.length} drawing.source.changed for the sheet`);
      return `"This sheet has no image" until the worker came back; the prepared page shown ${(shownAfter / 1000).toFixed(1)} s after, no reload, 1 event`;
    },
  },
  {
    title: "AC3: a job lost with its worker is dispatched again by the sweep, and completes",
    run: async () => {
      await cue("stop-worker");
      const loaded = await loadPages(token, base, project.uuid, [[files["Set C.pdf"].uuid, [1, 2]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      const file = loaded.body.files[0].file_uuid;
      await cue("lose-queue");
      await cue("start-worker");
      await new Promise((r) => setTimeout(r, 4000));
      const still = (await sheetsOf(token, base, project.uuid)).filter((s) => s.file_uuid === file);
      expect(still.every((s) => s.render_status === "pending"), `the lost job ran anyway: ${still.map((s) => s.render_status)}`);
      await cue("sweep", file);
      const done = await preparedSheets(token, base, project.uuid, file);
      return `lost job: both pages still pending; the sweep dispatched it and ${done.length} pages prepared`;
    },
  },
]);

await discardProject(token, workspace.uuid, project.uuid);
console.log(`cleanup: ${project.name} discarded from ${workspace.name}`);

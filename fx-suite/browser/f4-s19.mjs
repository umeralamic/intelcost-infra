// F4-S19: folder counts. Files only, every descendant's included, a zero drawn faded,
// and an upload moves every count on the way up.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s19.mjs
//
// Updated 2026-10-24 (D-309, D-315): a new project has no seed folders (D-309 1), so Plans and Specs
// are POSTed. The file browser's count badge (`FolderCountBadge`) was removed with it by D-315 C5;
// the load screen's tree counts something else, the files takeoff can use (D-313 A2), so the
// counts asserted here are the api's `file_count`, which the badge drew.
// AC1: the badge's text, its "3 files" tooltip and the project root's badge are retired with
// `FolderCountBadge` (D-315 C5); the api's counts (Plans 3 with its subfolder's file, Addenda 1,
// an unfinished upload not counted) are asserted as before.
// Step 2 retired: the faded 0 was `FolderCountBadge`'s drawing, removed by D-315 C5.
// AC3 (now step 2): the upload goes through the load screen tree's Upload into the focused Addenda
// (D-315 2; the destination picker was removed by D-315 C5), the load screen of the project's takeoff,
// a project with files and no sheets (its first-run load screen, or Add sheets, D-313 3);
// Addenda's and Plans' api counts both move, 2 and 4.

import { APP, SEEDED, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, seedFile } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S19 counts");
const job = await makeProject(token, base, { name: "Count house" });
const folderUrl = `${base}/${job.uuid}/folder`;

// No seed folders since D-309.
const plans = (await apiCall(token, "POST", folderUrl, { name: "Plans" })).body;
await apiCall(token, "POST", folderUrl, { name: "Specs" });
const addenda = (await apiCall(token, "POST", folderUrl, { name: "Addenda", parent_uuid: plans.uuid })).body;

const counts = async () =>
  Object.fromEntries((await apiCall(token, "GET", folderUrl)).body.map((f) => [f.name, f.file_count]));

async function signIn(page) {
  await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
  await enterWorkspace(page, workspace.uuid);
}

await run("f4-s19", [
  {
    title: "AC1 — Plans with 2 files and Addenda with 1: Plans counts 3, Addenda 1; a half-uploaded file is not counted",
    run: async ({ page }) => {
      await signIn(page);
      await seedFile(page, token, base, job.uuid, plans.uuid, "A-101.pdf", Buffer.alloc(2048, 1));
      await seedFile(page, token, base, job.uuid, plans.uuid, "A-102.pdf", Buffer.alloc(2048, 2));
      await seedFile(page, token, base, job.uuid, addenda.uuid, "ADD-1.pdf", Buffer.alloc(2048, 3));
      // An upload left unfinished is not a file yet, and is not counted.
      await seedFile(page, token, base, job.uuid, addenda.uuid, "half.pdf", Buffer.alloc(9 * 1024 * 1024, 4), { parts: 1 });
      const read = await counts();
      expect(read.Plans === 3 && read.Addenda === 1 && read.Specs === 0, `api file_count ${JSON.stringify(read)}`);
      return `Plans ${read.Plans} · Addenda ${read.Addenda} · Specs ${read.Specs} · half-uploaded not counted`;
    },
  },
  {
    title: "AC3 — upload a file into Addenda from the load screen's tree: Addenda and Plans both move",
    run: async ({ page }) => {
      await signIn(page);
      // The project's takeoff: with files and no sheets it opens on the load screen (or offers Add
      // sheets), whose tree carries the housekeeping toolbar (D-315 2).
      await page.goto(`${APP}/project/${job.uuid}/takeoff`);
      const add = page.locator("[data-add-sheets-empty]");
      const screen = page.locator("[data-load-dialog]");
      await add.or(screen).first().waitFor({ timeout: 20000 });
      if (!(await screen.isVisible())) await add.click();
      const tree = page.locator("[data-load-tree]");
      const row = tree.locator('[data-load-folder="Addenda"]');
      await row.waitFor({ timeout: 20000 });
      await row.click();
      await waitFor(async () => (await row.getAttribute("data-focused")) !== null || null, "Addenda in focus", 10000);
      await page.locator("[data-tree-upload]").setInputFiles({ name: "ADD-2.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(4096, 5) });
      const read = await waitFor(async () => {
        const now = await counts();
        return now.Addenda === 2 ? now : null;
      }, "Addenda counts 2", 30000);
      await tree.locator('[data-load-file="ADD-2.pdf"]').waitFor({ timeout: 15000 });
      expect(`${read.Addenda}/${read.Plans}` === "2/4", `Addenda/Plans count ${read.Addenda}/${read.Plans}`);
      return `uploaded into the focused Addenda · Addenda 2, Plans 4`;
    },
  },
]);

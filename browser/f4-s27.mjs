// F4-S27: the nightly purge, the browser's part. Run by f4-s27.sh, which puts the
// database and storage steps between these phases:
//
//   setup   a workspace "F4-S27 purge <ts>": "Old trash" with one file and one upload
//           left unfinished, "Recent trash" with one file, both trashed, and "Live".
//   before  after the ages (31 and 5 days): Settings > Trash reads "at the next daily
//           purge" for Old trash and "in 25 days" for Recent trash (F4-S26 AC2).
//   after   after the purge: Old trash is off the Trash tab, Recent trash is on it, and
//           Activity says the nightly job did it.

import { APP, apiCall, createWorkspace, expect, apiLogin, run } from "./lib/bench.mjs";
import { folderPaths, makeProject, openDashboard, seedFile } from "./lib/f4.mjs";

const PHASE = process.argv[2];
const NAME = "F4-S27 purge";
const token = await apiLogin();

/** The newest workspace this fixture made, as the drive picks it. */
async function newest() {
  const found = (await apiCall(token, "GET", "/api/workspace")).body
    .filter((w) => w.name.startsWith(NAME))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .at(-1);
  expect(found, "run setup first");
  return found;
}

async function trashRows(page) {
  await page.goto(`${APP}/settings/trash`);
  await page.locator("[data-trash-list]").or(page.getByText("Trash is empty")).first().waitFor({ timeout: 20000 });
  return page.locator("[data-trash-row]").evaluateAll((rows) =>
    Object.fromEntries(
      rows.map((r) => [r.getAttribute("data-trash-row"), r.querySelector("[data-trash-fate]").textContent]),
    ),
  );
}

if (PHASE === "setup") {
  const workspace = await createWorkspace(token, `${NAME} ${Date.now()}`);
  const base = `/api/workspace/${workspace.uuid}/project`;
  const old = await makeProject(token, base, { name: "Old trash" });
  const recent = await makeProject(token, base, { name: "Recent trash" });
  const live = await makeProject(token, base, { name: "Live" });
  await run("f4-s27 setup", [
    {
      title: "Files into all three, an unfinished upload into Old trash, then two to Trash",
      run: async ({ page }) => {
        await openDashboard(page, workspace.uuid);
        for (const [project, name] of [[old, "old.pdf"], [recent, "recent.pdf"], [live, "live.pdf"]]) {
          const plans = (await folderPaths(token, base, project.uuid)).get("Plans");
          await seedFile(page, token, base, project.uuid, plans.uuid, name, Buffer.alloc(4096, 3));
        }
        const specs = (await folderPaths(token, base, old.uuid)).get("Specs");
        await seedFile(page, token, base, old.uuid, specs.uuid, "half.pdf", Buffer.alloc(9 * 1024 * 1024, 5), { parts: 1 });
        for (const project of [old, recent]) {
          expect((await apiCall(token, "DELETE", `${base}/${project.uuid}`)).status === 200, `trash ${project.name}`);
        }
        return `${workspace.name}: 3 files, 1 unfinished upload, 2 in Trash`;
      },
    },
  ]);
} else if (PHASE === "before") {
  const workspace = await newest();
  await run("f4-s27 before", [
    {
      title: "S26 AC2 — aged 31 days: \"at the next daily purge\"; aged 5 days: \"in 25 days\"",
      run: async ({ page }) => {
        await openDashboard(page, workspace.uuid);
        const rows = await trashRows(page);
        expect(rows["Old trash"] === "Permanently deleted at the next daily purge", `Old: ${rows["Old trash"]}`);
        expect(rows["Recent trash"] === "Permanently deleted in 25 days", `Recent: ${rows["Recent trash"]}`);
        return `Old trash: ${rows["Old trash"]} · Recent trash: ${rows["Recent trash"]}`;
      },
    },
  ]);
} else if (PHASE === "after") {
  const workspace = await newest();
  await run("f4-s27 after", [
    {
      title: "Old trash is off the Trash tab, Recent trash stays, and Activity names the nightly job",
      run: async ({ page }) => {
        await openDashboard(page, workspace.uuid);
        const rows = await trashRows(page);
        expect(Object.keys(rows).join() === "Recent trash", `trash: ${Object.keys(rows).join(", ")}`);
        await page.goto(`${APP}/settings/activity`);
        const line = page.getByText("permanently deleted the project Old trash, 30 days after it went to Trash");
        await line.waitFor({ timeout: 20000 });
        const row = await line.locator("xpath=ancestor::li[1]").innerText().catch(() => "");
        expect(/IntelCost/.test(row), `activity row: ${row}`);
        return "Trash: Recent trash only · Activity: IntelCost permanently deleted the project Old trash, 30 days after it went to Trash";
      },
    },
  ]);
} else {
  console.error("phase: setup | before | after");
  process.exitCode = 2;
}

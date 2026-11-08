// F4-S8, as D-31 left it: "New from folder" is gone. New project is the one way to start
// a project, every project gets its four seed folders, and a folder on the computer goes
// into a project through the file browser's Upload folder, tree preserved.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s8.mjs
//
// The folder is a real directory, written here, handed to the `webkitdirectory` input
// the way a person's folder picker would.
//
// Updated 2026-10-24 (D-314, D-311, D-309, D-315):
// - AC1: the projects list is the All projects dialog (D-314 2), so "no New from folder and no folder
//   picker" is read inside it. Home's empty state, behind it, has Choose folder on purpose (D-311 4).
// - AC2: a new project has no seed folders (D-309 1, superseding D-31's four): seed_folders false
//   still changes nothing, and what it makes is now no folders at all.
// - AC3: the file browser and its Upload folder with "Where should this folder go?" are gone (D-315
//   C5, block 9; the tree's Upload takes files). A folder goes into a project, tree kept, through
//   New project's Choose folder (D-309 2): Maple/ lands as Maple/A/a.pdf and Maple/b.pdf, with no
//   seeds beside it (D-309 1). Landed is the api reading both files uploaded (D-311 6: Create does
//   not wait, so there is no "Folder uploaded" toast).

import { mkdir, rm, writeFile } from "node:fs/promises";

import { apiCall, expect, run } from "./lib/bench.mjs";
import { folderPaths, freshWorkspace, openDashboard } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S8 one way in");
const ROOT = "/tmp/f4-s8";
const MAPLE = `${ROOT}/Maple`;
await rm(ROOT, { recursive: true, force: true });
await mkdir(`${MAPLE}/A`, { recursive: true });
await writeFile(`${MAPLE}/A/a.pdf`, Buffer.alloc(200 * 1024, 1));
await writeFile(`${MAPLE}/b.pdf`, Buffer.alloc(100 * 1024, 2));

// No seed folders since D-309 1.
const SEEDS = [];

await run("f4-s8", [
  {
    title: "AC1 — All projects has New project and no New from folder, and no folder picker",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      const dialog = page.getByRole("dialog", { name: "All projects" });
      await dialog.getByRole("button", { name: "New project" }).waitFor();
      expect((await dialog.getByRole("button", { name: /New from folder/ }).count()) === 0, "New from folder is drawn");
      expect((await dialog.locator("input[webkitdirectory]").count()) === 0, "a folder picker is on the projects list");
      return "New project only";
    },
  },
  {
    title: "AC2 — the create's seedless switch is gone: seed_folders false makes what any create makes, no folders (D-309)",
    run: async () => {
      const made = await apiCall(token, "POST", base, { name: "Asked for none", seed_folders: false });
      expect(made.status === 201, `create ${made.status}`);
      const names = [...(await folderPaths(token, base, made.body.uuid)).keys()].sort();
      expect(names.join() === SEEDS.join(), `folders: ${names.join(", ")}`);
      const plain = await apiCall(token, "POST", base, { name: "Asked for nothing" });
      const plainNames = [...(await folderPaths(token, base, plain.body.uuid)).keys()].sort();
      expect(plainNames.join() === names.join(), `a plain create made ${plainNames.join(", ")}, the seedless one ${names.join(", ")}`);
      return `no folders either way`;
    },
  },
  {
    title: "AC3 — Maple/ through New project's Choose folder: Maple/A/a.pdf and Maple/b.pdf, no seeds",
    run: async ({ page }) => {
      const name = `Maple job ${Date.now()}`;
      await openDashboard(page, workspace.uuid);
      await page.getByRole("dialog", { name: "All projects" }).getByRole("button", { name: "New project" }).click();
      const form = page.getByRole("dialog", { name: "New project" });
      await form.waitFor();
      await page.fill("#new-project-name", name);
      await form.getByRole("button", { name: "Next" }).click();
      await form.getByLabel("Choose a folder").setInputFiles(MAPLE);
      await form.locator('li[data-file="a.pdf"]').getByText("Maple/A").waitFor();
      await form.getByRole("button", { name: "Create", exact: true }).click();
      await page.getByText("Project created").first().waitFor({ timeout: 30000 });

      const until = Date.now() + 30000;
      let job;
      let files = [];
      for (;;) {
        job ??= (await apiCall(token, "GET", `${base}?limit=200`)).body.items.find((p) => p.name === name);
        files = job ? (await apiCall(token, "GET", `${base}/${job.uuid}/file`)).body : [];
        if ((files.length === 2 && files.every((f) => f.uploaded_at)) || Date.now() > until) break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      expect(files.length === 2 && files.every((f) => f.uploaded_at), `${files.length} files, done: ${files.map((f) => Boolean(f.uploaded_at))}`);
      const paths = await folderPaths(token, base, job.uuid);
      const byUuid = new Map([...paths].map(([path, f]) => [f.uuid, path]));
      const where = files.map((f) => `${byUuid.get(f.folder_uuid)}/${f.file_name}`).sort();
      const folders = [...paths.keys()].sort();
      // The chosen folder keeps its own name, as a folder of the project.
      expect(folders.join() === ["Maple", "Maple/A", ...SEEDS].sort().join(), `folders: ${folders.join(", ")}`);
      expect(where.join() === "Maple/A/a.pdf,Maple/b.pdf", `files: ${where.join(", ")}`);
      return `folders [${folders.join(", ")}] · files [${where.join(", ")}]`;
    },
  },
]);

await rm(ROOT, { recursive: true, force: true });

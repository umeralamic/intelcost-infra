// F4-S8, as D-31 left it: "New from folder" is gone. New project is the one way to start
// a project, every project gets its four seed folders, and a folder on the computer goes
// into a project through the file browser's Upload folder, tree preserved.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s8.mjs
//
// The folder is a real directory, written here, handed to the `webkitdirectory` input
// the way a person's folder picker would.

import { mkdir, rm, writeFile } from "node:fs/promises";

import { apiCall, expect, run } from "./lib/bench.mjs";
import { folderPaths, freshWorkspace, openDashboard, openFiles } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S8 one way in");
const ROOT = "/tmp/f4-s8";
const MAPLE = `${ROOT}/Maple`;
await rm(ROOT, { recursive: true, force: true });
await mkdir(`${MAPLE}/A`, { recursive: true });
await writeFile(`${MAPLE}/A/a.pdf`, Buffer.alloc(200 * 1024, 1));
await writeFile(`${MAPLE}/b.pdf`, Buffer.alloc(100 * 1024, 2));

const SEEDS = ["Plans", "Reports", "Site Photos", "Specs"];

await run("f4-s8", [
  {
    title: "AC1 — the dashboard has New project and no New from folder, and no folder picker",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await page.getByRole("button", { name: "New project" }).waitFor();
      expect((await page.getByRole("button", { name: /New from folder/ }).count()) === 0, "New from folder is drawn");
      expect((await page.locator("input[webkitdirectory]").count()) === 0, "a folder picker is on the dashboard");
      return "New project only";
    },
  },
  {
    title: "AC2 — the create's seedless switch is gone: seed_folders false still makes the four seeds",
    run: async () => {
      const made = await apiCall(token, "POST", base, { name: "Asked for none", seed_folders: false });
      expect(made.status === 201, `create ${made.status}`);
      const names = [...(await folderPaths(token, base, made.body.uuid)).keys()].sort();
      expect(names.join() === SEEDS.join(), `folders: ${names.join(", ")}`);
      return names.join(", ");
    },
  },
  {
    title: "AC3 — Maple/ through Upload folder into the root: Maple/A/a.pdf and Maple/b.pdf, beside the seeds",
    run: async ({ page }) => {
      const job = (await apiCall(token, "POST", base, { name: "Maple job" })).body;
      await openFiles(page, workspace.uuid, job.uuid);
      await page.locator("[data-upload-folder]").setInputFiles(MAPLE);
      const picker = page.getByRole("dialog", { name: "Where should this folder go?" });
      await picker.waitFor();
      await picker.getByRole("button", { name: "Confirm upload" }).click();
      await page.getByText("Folder uploaded").first().waitFor({ timeout: 30000 });
      const files = (await apiCall(token, "GET", `${base}/${job.uuid}/file`)).body;
      expect(files.length === 2 && files.every((f) => f.uploaded_at), `${files.length} files, done: ${files.map((f) => Boolean(f.uploaded_at))}`);
      const paths = await folderPaths(token, base, job.uuid);
      const byUuid = new Map([...paths].map(([path, f]) => [f.uuid, path]));
      const where = files.map((f) => `${byUuid.get(f.folder_uuid)}/${f.file_name}`).sort();
      const folders = [...paths.keys()].sort();
      // Upload folder keeps the picked folder's own name, as a folder of the project.
      expect(folders.join() === ["Maple", "Maple/A", ...SEEDS].sort().join(), `folders: ${folders.join(", ")}`);
      expect(where.join() === "Maple/A/a.pdf,Maple/b.pdf", `files: ${where.join(", ")}`);
      return `folders [${folders.join(", ")}] · files [${where.join(", ")}]`;
    },
  },
]);

await rm(ROOT, { recursive: true, force: true });

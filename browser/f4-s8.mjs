// F4-S8: New project from a folder on the computer, tree preserved; Retry never makes a
// second project or a second copy of any folder.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s8.mjs
//
// The folder is a real directory, written here, handed to the `webkitdirectory` input
// the way a person's folder picker would.

import { mkdir, rm, writeFile } from "node:fs/promises";

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, openDashboard } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S8 folder");
const ROOT = "/tmp/f4-s8";
const MAPLE = `${ROOT}/Maple`;
await rm(ROOT, { recursive: true, force: true });
await mkdir(`${MAPLE}/A`, { recursive: true });
await writeFile(`${MAPLE}/A/a.pdf`, Buffer.alloc(200 * 1024, 1));
await writeFile(`${MAPLE}/b.pdf`, Buffer.alloc(100 * 1024, 2));

const projects = async () => (await apiCall(token, "GET", `${base}?limit=200`)).body.items;

/** Where each file landed, as "folder/path/name". */
async function layout(projectUuid) {
  const folders = (await apiCall(token, "GET", `${base}/${projectUuid}/folder`)).body;
  const byUuid = new Map(folders.map((f) => [f.uuid, f]));
  const pathOf = (uuid) => {
    const parts = [];
    for (let f = byUuid.get(uuid); f; f = byUuid.get(f.parent_uuid)) parts.unshift(f.name);
    return parts.join("/");
  };
  const files = (await apiCall(token, "GET", `${base}/${projectUuid}/file`)).body;
  return {
    folders: folders.map((f) => pathOf(f.uuid)).sort(),
    files: files.map((f) => `${f.folder_uuid ? `${pathOf(f.folder_uuid)}/` : ""}${f.file_name}`).sort(),
    done: files.every((f) => f.uploaded_at),
  };
}

async function pickFolder(page) {
  await openDashboard(page, workspace.uuid);
  await page.getByLabel("Choose a folder").setInputFiles(MAPLE);
  await page.getByRole("dialog", { name: "Create project from folder" }).waitFor();
}

await run("f4-s8", [
  {
    title: "AC4 — Cancel before Create makes nothing",
    run: async ({ page }) => {
      const before = (await projects()).length;
      await pickFolder(page);
      await page.getByText("2 files will be uploaded with their original folder structure preserved.").waitFor();
      await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
      expect((await projects()).length === before, "Cancel created a project");
      return "no project made";
    },
  },
  {
    title: "AC1 — the folder's name is suggested; the tree lands under the root, no seed folders",
    run: async ({ page }) => {
      await pickFolder(page);
      expect((await page.inputValue("#from-folder-name")) === "Maple", "name not suggested");
      await page.getByRole("dialog").getByRole("button", { name: "Create project" }).click();
      await page.getByText('Project "Maple" created').waitFor({ timeout: 60000 });
      const maple = (await projects()).find((p) => p.name === "Maple");
      const shape = await layout(maple.uuid);
      expect(shape.folders.join() === "A", `folders: ${shape.folders}`);
      expect(shape.files.join() === "A/a.pdf,b.pdf" && shape.done, `files: ${shape.files}`);
      return `folders [${shape.folders}] · files [${shape.files}] · no Plans/Specs/Reports/Site Photos`;
    },
  },
  {
    title: "AC2 — the same folder again previews \"Maple (2)\" and creates it under that name",
    run: async ({ page }) => {
      await pickFolder(page);
      await page.getByText("A project with that name already exists. This one will be created as").waitFor({ timeout: 15000 });
      expect(/Maple \(2\)/.test(await page.locator("[data-name-preview]").innerText()), "no (2) in the preview");
      await page.getByRole("dialog").getByRole("button", { name: "Create project" }).click();
      await page.getByText('Project "Maple (2)" created').waitFor({ timeout: 60000 });
      return "previewed and created as Maple (2)";
    },
  },
  {
    title: "AC3 — storage failing mid-tree, then Retry: one project, no duplicate folders",
    run: async ({ page }) => {
      await pickFolder(page);
      await page.fill("#from-folder-name", "Maple retry");
      let parts = 0;
      // Let the first file through, then refuse storage: the tree is half-made.
      await page.route(/localhost:9000/, (route) => (parts++ < 1 ? route.continue() : route.abort()));
      await page.getByRole("dialog").getByRole("button", { name: "Create project" }).click();
      await page.getByText(/The project was created, but the upload stopped/).waitFor({ timeout: 60000 });
      await page.unroute(/localhost:9000/);
      await page.getByRole("dialog").getByRole("button", { name: "Retry", exact: true }).click();
      await page.getByText('Project "Maple retry" created').waitFor({ timeout: 60000 });
      const made = (await projects()).filter((p) => p.name === "Maple retry");
      expect(made.length === 1, `${made.length} projects`);
      const shape = await layout(made[0].uuid);
      expect(shape.folders.join() === "A", `folders after retry: ${shape.folders}`);
      expect(shape.files.join() === "A/a.pdf,b.pdf" && shape.done, `files after retry: ${shape.files}`);
      return "one project · one A · both files done";
    },
  },
]);

await rm(ROOT, { recursive: true, force: true });

// F4-S18: the move rules. A folder moves within its project; it cannot move into itself
// or anything under it; a file cannot move into another project. The dialog greys out
// what it cannot take, and the api is the gate a hand-written request meets.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s18.mjs

import { apiCall, expect, run } from "./lib/bench.mjs";
import { folderPaths, freshWorkspace, makeProject, openFiles, seedFile } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S18 move");
const job = await makeProject(token, base, { name: "Pier rebuild", seed_folders: true });
const other = await makeProject(token, base, { name: "Elsewhere", seed_folders: true });
const folderUrl = `${base}/${job.uuid}/folder`;
const fileUrl = `${base}/${job.uuid}/file`;

let paths = await folderPaths(token, base, job.uuid);
const addenda = (await apiCall(token, "POST", folderUrl, { name: "Addenda", parent_uuid: paths.get("Plans").uuid })).body;
const deeper = (await apiCall(token, "POST", folderUrl, { name: "Round 2", parent_uuid: addenda.uuid })).body;

const tree = (page) => page.locator("[data-file-browser] nav");

await run("f4-s18", [
  {
    title: "AC1 — move Plans/Addenda into Specs: it moves, its own subfolder with it",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await tree(page).locator('[data-tree-folder="Plans"]').click();
      await page.locator('[data-row-folder="Addenda"]').waitFor();
      await page.getByRole("button", { name: "Move Addenda" }).click();
      const dialog = page.getByRole("dialog", { name: "Move folder" });
      await dialog.getByText("Pick a destination folder in the same project.").waitFor();
      await dialog.locator('[data-target="Specs"]').click();
      await dialog.getByRole("button", { name: "Move here" }).click();
      await page.getByText("Moved", { exact: true }).waitFor();
      paths = await folderPaths(token, base, job.uuid);
      expect(paths.has("Specs/Addenda") && paths.has("Specs/Addenda/Round 2"), `paths: ${[...paths.keys()].join()}`);
      return [...paths.keys()].filter((p) => p.startsWith("Specs")).join(", ");
    },
  },
  {
    title: "AC2 — moving Specs, the dialog greys out Specs and everything under it",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await tree(page).locator('[data-tree-folder="Specs"]').click({ button: "right" });
      await page.getByRole("menuitem", { name: "Move…" }).click();
      const dialog = page.getByRole("dialog", { name: "Move folder" });
      const state = await dialog.locator("[data-target]").evaluateAll((els) =>
        els.map((el) => `${el.getAttribute("data-target")}:${el.disabled ? "off" : "on"}`),
      );
      const off = state.filter((s) => s.endsWith(":off")).map((s) => s.split(":")[0]);
      expect(off.sort().join() === "Addenda,Round 2,Specs", `disabled: ${off.join()}`);
      expect(state.includes("Pier rebuild:on") && state.includes("Plans:on"), `enabled: ${state.join()}`);
      await dialog.getByRole("button", { name: "Cancel" }).click();
      return `disabled: ${off.sort().join(", ")} · the root and the others offered`;
    },
  },
  {
    title: "AC3 — a hand-written PATCH putting Specs under its own descendant is refused in words",
    run: async () => {
      const specs = paths.get("Specs");
      const intoChild = await apiCall(token, "PATCH", `${folderUrl}/${specs.uuid}`, { parent_uuid: deeper.uuid });
      const intoSelf = await apiCall(token, "PATCH", `${folderUrl}/${specs.uuid}`, { parent_uuid: specs.uuid });
      for (const r of [intoChild, intoSelf]) {
        expect(r.status === 422 && r.body.detail === "Cannot move a folder into its own descendant.", `${r.status} ${r.body.detail}`);
      }
      const still = (await folderPaths(token, base, job.uuid)).has("Specs/Addenda/Round 2");
      expect(still, "the tree changed");
      return `into Round 2: ${intoChild.status} · into itself: ${intoSelf.status} · "${intoChild.body.detail}"`;
    },
  },
  {
    title: "AC4 — a hand-written PATCH moving a file or folder into another project is refused in words",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      const file = await seedFile(page, token, base, job.uuid, paths.get("Plans").uuid, "A-101.pdf", Buffer.alloc(4096, 1));
      const theirs = (await folderPaths(token, base, other.uuid)).get("Plans");
      const fileMove = await apiCall(token, "PATCH", `${fileUrl}/${file.uuid}`, { folder_uuid: theirs.uuid });
      const folderMove = await apiCall(token, "PATCH", `${folderUrl}/${paths.get("Reports").uuid}`, { parent_uuid: theirs.uuid });
      expect(fileMove.status === 422 && fileMove.body.detail === "Files can only move within their own project.", `file: ${fileMove.status} ${fileMove.body.detail}`);
      expect(folderMove.status === 422 && folderMove.body.detail === "Folders can only move within their own project.", `folder: ${folderMove.status} ${folderMove.body.detail}`);
      // And within the project, a file does move, root included.
      const toRoot = await apiCall(token, "PATCH", `${fileUrl}/${file.uuid}`, { folder_uuid: null });
      expect(toRoot.status === 200 && toRoot.body.folder_uuid === null, `to root: ${toRoot.status}`);
      return `file ${fileMove.status} "${fileMove.body.detail}" · folder ${folderMove.status} · to the root ${toRoot.status}`;
    },
  },
]);

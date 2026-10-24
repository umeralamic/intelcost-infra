// F4-S18: the move rules. A folder moves within its project; it cannot move into itself
// or anything under it; a file cannot move into another project. The dialog greys out
// what it cannot take, and the api is the gate a hand-written request meets.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s18.mjs
//
// Updated 2026-10-24 (D-309, D-315): a new project has no seed folders (D-309 1), so Plans, Specs
// and Reports (and the other project's Plans) are POSTed before the run. The file browser is gone
// (D-315 C5): the Move dialog is opened from the load screen's tree (D-315 2), reached by All
// projects' row menu, Files (`?files=<project>&from=projects`), with the folder row's right-click
// Move…; the tree lists folders once the project holds a file, so one is put in Reports first.
// The Move dialog itself, its greyed targets and the api's refusals are unchanged.

import { APP, SEEDED, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { folderPaths, freshWorkspace, makeProject, seedFile } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S18 move");
const job = await makeProject(token, base, { name: "Pier rebuild" });
const other = await makeProject(token, base, { name: "Elsewhere" });
const folderUrl = `${base}/${job.uuid}/folder`;
const fileUrl = `${base}/${job.uuid}/file`;

// No seed folders since D-309: the ones the rules are shown on are made here.
const made = async (url, name, parent = null) => {
  const r = await apiCall(token, "POST", url, { name, parent_uuid: parent });
  expect(r.status === 201, `folder ${name}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
};
const plans = await made(folderUrl, "Plans");
await made(folderUrl, "Specs");
const reports = await made(folderUrl, "Reports");
await made(`${base}/${other.uuid}/folder`, "Plans");
const addenda = await made(folderUrl, "Addenda", plans.uuid);
const deeper = await made(folderUrl, "Round 2", addenda.uuid);
let seeded = false;

let paths = await folderPaths(token, base, job.uuid);

/** Signed in as the owner, on the project's load-screen tree (D-315 2), opened as All projects' Files does. */
async function openTree(page) {
  await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
  await enterWorkspace(page, workspace.uuid);
  if (!seeded) {
    // The tree lists folders once the project holds a file.
    await seedFile(page, token, base, job.uuid, reports.uuid, "R-001.pdf", Buffer.alloc(4096, 2));
    seeded = true;
  }
  await page.goto(`${APP}/?projects=open`);
  const list = page.getByRole("dialog", { name: "All projects" });
  await list.getByRole("tablist", { name: "Project status" }).waitFor({ timeout: 20000 });
  await list.getByRole("tab", { name: /^All/ }).first().click();
  await list.locator(`li[data-project="${job.name}"]`).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Files", exact: true }).click();
  const tree = page.locator("[data-load-tree]");
  await tree.locator('[data-load-folder="Plans"]').waitFor({ timeout: 20000 });
  return tree;
}

await run("f4-s18", [
  {
    title: "AC1 — move Plans/Addenda into Specs: it moves, its own subfolder with it",
    run: async ({ page }) => {
      const tree = await openTree(page);
      await tree.locator('[data-load-folder="Addenda"]').click({ button: "right" });
      await page.getByRole("menuitem", { name: "Move…" }).click();
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
      const tree = await openTree(page);
      await tree.locator('[data-load-folder="Specs"]').click({ button: "right" });
      await page.getByRole("menuitem", { name: "Move…" }).click();
      const dialog = page.getByRole("dialog", { name: "Move folder" });
      await dialog.locator("[data-target]").first().waitFor();
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
      await openTree(page);
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

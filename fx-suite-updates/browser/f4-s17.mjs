// F4-S17: the file browser on Project Home. Folders made, refused, renamed; files and a
// whole folder uploaded through the destination picker; download under the file's own
// name; a folder deleted with its objects; the root that cannot be touched; the
// collaborator and viewer gates (D-26); and S7 AC9, moved here: reload mid-upload, find it
// under "Unfinished uploads", pick it again and only the missing parts go.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s17.mjs
//
// Updated 2026-10-24 (D-315, D-309): the file browser went with Project Home (D-315 C5: `FileBrowser`,
// `FolderTree`, `UnfinishedUploads`, `DestinationPicker` deleted); its housekeeping is the load
// screen's tree (D-315 2): every folder and file row's right-click menu (Download, Rename, Move…,
// Delete; a folder's New subfolder), and above the tree New folder and Upload, into the folder in
// focus. Each step opens that tree as All projects' Files does, `?files=<project>&from=projects` over
// the project's own takeoff. A new project has no folders (D-309 1): Plans, Specs, Reports and Site
// Photos are POSTed, and the tree lists folders once the project holds a file, so one is put in Plans.
// AC1: a new project's tree is empty (D-309 1): no folders in the api, "No files yet" in the tree
//   (it was the project, then the four seed folders).
// AC2: Addenda through Plans' right-click New subfolder; the duplicate, "a/b" and blank refusals
//   through the toolbar's New folder with Plans in focus (it was the contents pane's button).
// AC4: the .docx and the .jpg go in through the tree's Upload with Reports in focus (the destination
//   picker was removed by D-315 C5) and are listed in the tree under Reports; the tree shows no sizes,
//   so their sizes are read from the api (300 KB, 2 MB) instead of the browser's meta line.
// AC6: Download is the file row's menu item (D-315 2), same tab, name and bytes.
// AC3: Rename is the folder row's menu item; after a reload the tree lists Specifications holding
//   Division 03.pdf.
// AC7: the confirmation says what the folder holds in D-315 2's words: "Site Photos and everything in
//   it will be permanently removed: 3 files and 1 folder. This cannot be undone."
// AC8: the root is the tree's project row: its menu is New folder only; the api refusals unchanged.
// AC9: in the tree a collaborator's file menu offers no Rename or Delete (D-315 2: rename, move and
//   delete need Create projects) where the file browser drew them disabled with a reason; the api's
//   403s are unchanged.
// AC10: a viewer's tree has no New folder or Upload toolbar (D-315 2: they need Upload documents) and
//   the file menu offers Download only; download works and the api refuses a folder. The file
//   browser's sentence "Your role cannot upload drawings & documents." went with it (D-315 C5).
// Second tenant: the other project's Plans is POSTed (D-309 1).
// Step 6 retired: AC5, Upload folder into an existing project, was removed by D-315 C5 (the project
//   page's Upload folder and its destination dialog; the tree's Upload takes files, D-315 2).
// Step 11 retired: S7 AC9, resume under "Unfinished uploads", was removed by D-315 C5
//   (`UnfinishedUploads` deleted; an unfinished upload is "Upload unfinished" in the tree, with
//   Discard upload).

import { createHash } from "node:crypto";

import { APP, SEEDED, apiCall, enterWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { folderPaths, freshWorkspace, makeProject, seedFile } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";

const MB = 1024 * 1024;
const bytes = (size, seed) => {
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i += 4096) buf[i] = (i / 4096 + seed) % 251;
  return buf;
};
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

const { token, workspace, base } = await freshWorkspace("F4-S17 files");
const fresh = await makeProject(token, base, { name: "Fresh job" });
const job = await makeProject(token, base, { name: "Harbor school" });
const other = await makeProject(token, base, { name: "Other job" });
const collaborator = await seatedMember(token, workspace.uuid, "collaborator", "f4s17");
const viewer = await seatedMember(token, workspace.uuid, "viewer", "f4s17");
const folderUrl = `${base}/${job.uuid}/folder`;
const fileUrl = `${base}/${job.uuid}/file`;

// No seed folders since D-309: the four the steps work in are made here, and the other project's Plans.
for (const name of ["Plans", "Specs", "Reports", "Site Photos"]) {
  const made = await apiCall(token, "POST", folderUrl, { name });
  expect(made.status === 201, `folder ${name}: ${made.status} ${JSON.stringify(made.body)}`);
}
await apiCall(token, "POST", `${base}/${other.uuid}/folder`, { name: "Plans" });
let seeded = false;

const tree = (page) => page.locator("[data-load-tree]");
const folderRow = (page, name) => tree(page).locator(`[data-load-folder="${name}"]`);
const fileRow = (page, name) => tree(page).locator(`[data-load-file="${name}"]`);

/** Signed in, on the project's load-screen tree (D-315 2), as All projects' Files opens it. */
async function openTree(page, email, project = job) {
  await signInAs(page, email ?? (await fixtureOwner()).email, SEEDED.password);
  await enterWorkspace(page, workspace.uuid);
  if (project === job && !seeded) {
    // The tree lists folders once the project holds a file.
    const plans = (await folderPaths(token, base, job.uuid)).get("Plans");
    await seedFile(page, token, base, job.uuid, plans.uuid, "Cover.pdf", bytes(8 * 1024, 8));
    seeded = true;
  }
  await reopen(page, project);
}

async function reopen(page, project = job) {
  await page.goto(`${APP}/project/${project.uuid}/takeoff?files=${project.uuid}&from=projects`);
  await page.locator("[data-load-dialog]").waitFor({ timeout: 20000 });
  await tree(page).waitFor({ timeout: 20000 });
  await page.getByText("Loading the project's files").waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
}

async function focusFolder(page, name) {
  const row = folderRow(page, name);
  await row.click();
  await waitFor(async () => (await row.getAttribute("data-focused")) !== null || null, `${name} in focus`, 10000);
}

/** The items of a row's right-click menu. */
async function menuOf(page, row) {
  await row.click({ button: "right" });
  await page.getByRole("menuitem").first().waitFor({ timeout: 10000 });
  return page.getByRole("menuitem").allInnerTexts();
}

/** New folder through the dialog; returns the error shown, or null when it saved. */
async function nameFolder(page, name) {
  const dialog = page.getByRole("dialog", { name: "New folder" });
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("button", { name: "Create" }).click();
  const outcome = await Promise.race([
    dialog.waitFor({ state: "detached", timeout: 10000 }).then(() => null),
    dialog.getByRole("alert").waitFor({ timeout: 10000 }).then(() => dialog.getByRole("alert").innerText()),
  ]);
  return outcome;
}

/** The tree's Upload, into the folder in focus; resolves once the api holds every file complete. */
async function uploadInto(page, folder, files, as = token) {
  await focusFolder(page, folder);
  await page.locator("[data-tree-upload]").setInputFiles(files);
  const names = files.map((f) => f.name);
  return waitFor(async () => {
    const listed = (await apiCall(as, "GET", fileUrl)).body.filter((f) => names.includes(f.file_name) && f.uploaded_at);
    return listed.length === names.length ? listed : null;
  }, `${names.join(", ")} uploaded`, 60000);
}

await run("f4-s17", [
  {
    title: "AC1 — a new project's tree is empty (D-309): no folders, \"No files yet\"",
    run: async ({ page }) => {
      await openTree(page, undefined, fresh);
      const folders = (await apiCall(token, "GET", `${base}/${fresh.uuid}/folder`)).body;
      expect(folders.length === 0, `folders: ${folders.map((f) => f.name).join()}`);
      const empty = (await tree(page).locator("[data-load-empty]").innerText()).trim();
      expect(/^No files yet\./.test(empty), `tree reads ${empty}`);
      return `0 folders · "${empty}"`;
    },
  },
  {
    title: "AC2 — Addenda under Plans; again is a duplicate; a/b and a blank name are refused in words",
    run: async ({ page }) => {
      await openTree(page);
      await folderRow(page, "Plans").click({ button: "right" });
      await page.getByRole("menuitem", { name: "New subfolder" }).click();
      expect((await nameFolder(page, "Addenda")) === null, "Addenda did not save");
      await page.getByText("Folder created").first().waitFor();
      await folderRow(page, "Addenda").waitFor({ timeout: 15000 });
      const paths = await folderPaths(token, base, job.uuid);
      expect(paths.has("Plans/Addenda"), `paths: ${[...paths.keys()].join()}`);

      await focusFolder(page, "Plans");
      await tree(page).getByRole("button", { name: "New folder" }).click();
      const dupe = await nameFolder(page, "addenda");
      expect(dupe === "There is already a folder named Addenda here.", `duplicate: ${dupe}`);
      const slash = await nameFolder(page, "a/b");
      expect(slash === "Folder names cannot contain '/'.", `slash: ${slash}`);
      const blank = await nameFolder(page, "   ");
      expect(blank === "Name is required.", `blank: ${blank}`);
      return `created · "${dupe}" · "${slash}" · "${blank}"`;
    },
  },
  {
    title: "AC4 — a .docx and a .jpg into Reports through the tree's Upload: both listed, their sizes stored",
    run: async ({ page }) => {
      await openTree(page);
      const listed = await uploadInto(page, "Reports", [
        { name: "Geotech.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: bytes(300 * 1024, 1) },
        { name: "Site photo (north).jpg", mimeType: "image/jpeg", buffer: bytes(2 * MB, 2) },
      ]);
      await fileRow(page, "Geotech.docx").waitFor({ timeout: 20000 });
      await fileRow(page, "Site photo (north).jpg").waitFor({ timeout: 20000 });
      const reports = (await folderPaths(token, base, job.uuid)).get("Reports");
      const size = (name) => listed.find((f) => f.file_name === name);
      const docx = size("Geotech.docx");
      const jpg = size("Site photo (north).jpg");
      expect(docx.byte_size === 300 * 1024 && docx.folder_uuid === reports.uuid, `docx: ${docx.byte_size} in ${docx.folder_uuid}`);
      expect(jpg.byte_size === 2 * MB && jpg.folder_uuid === reports.uuid, `jpg: ${jpg.byte_size} in ${jpg.folder_uuid}`);
      return `both in Reports · ${docx.byte_size / 1024} KB · ${jpg.byte_size / MB} MB`;
    },
  },
  {
    title: "AC6 — Download opens the file under its own name, with the same bytes",
    run: async ({ page, context }) => {
      await openTree(page);
      await fileRow(page, "Site photo (north).jpg").click({ button: "right" });
      const [tab] = await Promise.all([
        context.waitForEvent("page"),
        page.getByRole("menuitem", { name: "Download" }).click(),
      ]);
      await tab.waitForURL(/192.168.65.254:9000/, { timeout: 15000 });
      const got = await tab.evaluate(async () => {
        const response = await fetch(location.href);
        const body = new Uint8Array(await response.arrayBuffer());
        let bin = "";
        for (let i = 0; i < body.length; i += 1) bin += String.fromCharCode(body[i]);
        return { disposition: response.headers.get("content-disposition"), b64: btoa(bin) };
      });
      const same = sha(Buffer.from(got.b64, "base64")) === sha(bytes(2 * MB, 2));
      expect(/filename\*=UTF-8''Site%20photo%20%28north%29\.jpg/.test(got.disposition ?? ""), `disposition: ${got.disposition}`);
      expect(same, "the bytes differ");
      return `${got.disposition} · sha256 matches`;
    },
  },
  {
    title: "AC3 — rename Specs to Specifications, reload: it holds, and its file is intact",
    run: async ({ page }) => {
      await openTree(page);
      const specs = (await folderPaths(token, base, job.uuid)).get("Specs");
      await seedFile(page, token, base, job.uuid, specs.uuid, "Division 03.pdf", bytes(64 * 1024, 3));
      await reopen(page);
      await folderRow(page, "Specs").click({ button: "right" });
      await page.getByRole("menuitem", { name: "Rename" }).click();
      const dialog = page.getByRole("dialog", { name: "Rename folder" });
      await dialog.getByLabel("Name").fill("Specifications");
      await dialog.getByRole("button", { name: "Rename" }).click();
      await page.getByText("Renamed", { exact: true }).first().waitFor();
      await page.reload();
      await tree(page).waitFor({ timeout: 20000 });
      await folderRow(page, "Specifications").waitFor({ timeout: 20000 });
      await focusFolder(page, "Specifications");
      await fileRow(page, "Division 03.pdf").waitFor();
      const parent = (await apiCall(token, "GET", fileUrl)).body.find((f) => f.file_name === "Division 03.pdf").folder_uuid;
      expect(parent === specs.uuid, "the file left its folder");
      return "Specifications holds after reload, Division 03.pdf inside";
    },
  },
  {
    title: "AC7 — delete a folder holding 3 files: gone, and its 3 objects leave storage within a minute",
    run: async ({ page }) => {
      await openTree(page);
      const paths = await folderPaths(token, base, job.uuid);
      const photos = paths.get("Site Photos");
      const sub = await apiCall(token, "POST", folderUrl, { name: "Day 1", parent_uuid: photos.uuid });
      const made = [
        await seedFile(page, token, base, job.uuid, photos.uuid, "p1.jpg", bytes(10 * 1024, 4)),
        await seedFile(page, token, base, job.uuid, photos.uuid, "p2.jpg", bytes(10 * 1024, 5)),
        await seedFile(page, token, base, job.uuid, sub.body.uuid, "p3.jpg", bytes(10 * 1024, 6)),
      ];
      const urls = [];
      for (const f of made) urls.push((await apiCall(token, "GET", `${fileUrl}/${f.uuid}/download`)).body.url);
      const statuses = () =>
        page.evaluate(async (list) => Promise.all(list.map(async (u) => (await fetch(u)).status)), urls);
      expect((await statuses()).every((s) => s === 200), "objects missing before the delete");

      await reopen(page);
      await fileRow(page, "p3.jpg").waitFor({ timeout: 20000 });
      await folderRow(page, "Site Photos").click({ button: "right" });
      await page.getByRole("menuitem", { name: "Delete" }).click();
      const confirm = page.getByRole("dialog", { name: "Delete folder?" });
      const text = await confirm.innerText();
      expect(/Site Photos and everything in it will be permanently removed: 3 files and 1 folder\. This cannot be undone\./.test(text), `confirm: ${text}`);
      await confirm.getByRole("button", { name: "Delete" }).click();
      await page.getByText("Deleted", { exact: true }).first().waitFor();
      await folderRow(page, "Site Photos").waitFor({ state: "detached" });
      let after = [];
      for (let i = 0; i < 30; i += 1) {
        after = await statuses();
        if (after.every((s) => s === 404)) break;
        await page.waitForTimeout(2000);
      }
      expect(after.every((s) => s === 404), `objects after delete: ${after.join()}`);
      return `3 objects 200 before · ${after.join(",")} after`;
    },
  },
  {
    title: "AC8 — the root's menu has no rename, move or delete; a hand-written PATCH on the root is refused",
    run: async ({ page }) => {
      await openTree(page);
      const items = await menuOf(page, folderRow(page, "Harbor school"));
      expect(items.join() === "New folder", `root menu: ${items.join()}`);
      const patch = await apiCall(token, "PATCH", `${folderUrl}/${job.uuid}`, { name: "Renamed root" });
      const del = await apiCall(token, "DELETE", `${folderUrl}/${job.uuid}`);
      expect(patch.status === 404 && del.status === 404, `root PATCH ${patch.status}, DELETE ${del.status}`);
      const name = (await apiCall(token, "GET", `${base}/${job.uuid}`)).body.name;
      expect(name === "Harbor school", `project renamed to ${name}`);
      return `menu: ${items.join()} · PATCH ${patch.status} "${patch.body.detail}" · DELETE ${del.status}`;
    },
  },
  {
    title: "AC9 — a collaborator uploads, and rename and delete are refused (D-26)",
    run: async ({ page }) => {
      await openTree(page, collaborator.email);
      const collabToken = collaborator.token;
      await uploadInto(page, "Plans", [{ name: "markup.pdf", mimeType: "application/pdf", buffer: bytes(50 * 1024, 7) }], collabToken);
      await reopen(page);
      await fileRow(page, "markup.pdf").waitFor({ timeout: 20000 });
      const items = await menuOf(page, fileRow(page, "markup.pdf"));
      expect(!items.includes("Rename") && !items.includes("Delete"), `collaborator's menu: ${items.join()}`);
      const file = (await apiCall(collabToken, "GET", fileUrl)).body.find((f) => f.file_name === "markup.pdf");
      const patch = await apiCall(collabToken, "PATCH", `${fileUrl}/${file.uuid}`, { file_name: "x.pdf" });
      const del = await apiCall(collabToken, "DELETE", `${fileUrl}/${file.uuid}`);
      expect(patch.status === 403 && del.status === 403, `api: PATCH ${patch.status}, DELETE ${del.status}`);
      return `uploaded · menu "${items.join(", ")}" · api ${patch.status}/${del.status}: ${patch.body.detail}`;
    },
  },
  {
    title: "AC10 — a viewer's tree is read-only, and download works",
    run: async ({ page, context }) => {
      await openTree(page, viewer.email);
      await fileRow(page, "Geotech.docx").waitFor({ timeout: 20000 });
      const toolbar = await tree(page).locator("[data-tree-toolbar]").count();
      expect(toolbar === 0, "New folder and Upload offered to a viewer");
      const items = await menuOf(page, fileRow(page, "Geotech.docx"));
      expect(items.join() === "Download", `viewer's file menu: ${items.join()}`);
      const [tab] = await Promise.all([
        context.waitForEvent("page"),
        page.getByRole("menuitem", { name: "Download" }).click(),
      ]);
      await tab.waitForURL(/192.168.65.254:9000/, { timeout: 15000 }).catch(() => null);
      const viewerFile = (await apiCall(viewer.token, "GET", fileUrl)).body.find((f) => f.file_name === "Geotech.docx");
      const link = await apiCall(viewer.token, "GET", `${fileUrl}/${viewerFile.uuid}/download`);
      const post = await apiCall(viewer.token, "POST", folderUrl, { name: "Nope" });
      expect(link.status === 200, `viewer download ${link.status}`);
      expect(post.status === 403, `viewer folder create ${post.status}`);
      return `no toolbar · menu "${items.join()}" · download ${link.status} · create ${post.status}`;
    },
  },
  {
    title: "Second tenant — another project's folder and files are not reachable through this one",
    run: async () => {
      const otherPlans = (await folderPaths(token, base, other.uuid)).get("Plans");
      const cross = await apiCall(token, "PATCH", `${folderUrl}/${otherPlans.uuid}`, { name: "Hijack" });
      const list = (await apiCall(token, "GET", `${base}/${other.uuid}/folder`)).body.map((f) => f.name);
      expect(cross.status === 404, `cross-project PATCH ${cross.status}`);
      expect(!list.includes("Hijack"), "renamed through the wrong project");
      return `PATCH through the wrong project: ${cross.status}`;
    },
  },
]);

// F4-S17: the file browser on Project Home. Folders made, refused, renamed; files and a
// whole folder uploaded through the destination picker; download under the file's own
// name; a folder deleted with its objects; the root that cannot be touched; the
// collaborator and viewer gates (D-26); and S7 AC9, moved here: reload mid-upload, find it
// under "Unfinished uploads", pick it again and only the missing parts go.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s17.mjs

import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";

import { apiCall, expect, run, seatedMember } from "./lib/bench.mjs";
import { folderPaths, freshWorkspace, makeProject, openFiles, seedFile } from "./lib/f4.mjs";

const MB = 1024 * 1024;
const bytes = (size, seed) => {
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i += 4096) buf[i] = (i / 4096 + seed) % 251;
  return buf;
};
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

const { token, workspace, base } = await freshWorkspace("F4-S17 files");
const job = await makeProject(token, base, { name: "Harbor school" });
const other = await makeProject(token, base, { name: "Other job" });
const collaborator = await seatedMember(token, workspace.uuid, "collaborator", "f4s17");
const viewer = await seatedMember(token, workspace.uuid, "viewer", "f4s17");
const folderUrl = `${base}/${job.uuid}/folder`;
const fileUrl = `${base}/${job.uuid}/file`;

// A real two-level folder for Upload folder.
const TREE = "/tmp/f4-s17/Survey";
await rm("/tmp/f4-s17", { recursive: true, force: true });
await mkdir(`${TREE}/North/Cores`, { recursive: true });
await writeFile(`${TREE}/site.txt`, "site");
await writeFile(`${TREE}/North/n1.txt`, "north one");
await writeFile(`${TREE}/North/Cores/c1.txt`, "core one");

const tree = (page) => page.locator("[data-file-browser] nav");
const contents = (page) => page.locator("[data-file-browser] [aria-label='Folder contents']");

async function openFolder(page, name) {
  await tree(page).locator(`[data-tree-folder="${name}"]`).click();
  await page.locator("[data-breadcrumb]").getByText(name, { exact: true }).waitFor();
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

async function uploadInto(page, files, destination) {
  await page.locator("[data-upload-files]").setInputFiles(files);
  const picker = page.getByRole("dialog", { name: "Where should these files go?" });
  await picker.waitFor();
  if (destination) await picker.locator(`[data-target="${destination}"]`).click();
  await picker.getByRole("button", { name: "Confirm upload" }).click();
}

await run("f4-s17", [
  {
    title: "AC1 — a new project's tree: the project, then Plans, Specs, Reports, Site Photos",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      const root = await tree(page).locator("[data-tree-root]").innerText();
      expect(root.trim() === "Harbor school", `root reads ${root}`);
      const names = await tree(page).locator("[data-tree-folder]").allInnerTexts();
      expect(names.join() === "Plans,Specs,Reports,Site Photos", `tree: ${names.join()}`);
      await contents(page).getByText("This folder is empty.").waitFor({ state: "detached" }).catch(() => {});
      return `root "${root.trim()}" · ${names.join(", ")}`;
    },
  },
  {
    title: "AC2 — Addenda under Plans; again is a duplicate; a/b and a blank name are refused in words",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await tree(page).locator('[data-tree-folder="Plans"]').click({ button: "right" });
      await page.getByRole("menuitem", { name: "New subfolder" }).click();
      expect((await nameFolder(page, "Addenda")) === null, "Addenda did not save");
      await page.getByText("Folder created").waitFor();
      await tree(page).locator('[data-tree-folder="Addenda"]').waitFor();

      await openFolder(page, "Plans");
      await contents(page).getByRole("button", { name: "New folder" }).click();
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
    title: "AC4 — a .docx and a .jpg into Reports through the picker: both listed with their sizes",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await openFolder(page, "Reports");
      await uploadInto(page, [
        { name: "Geotech.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: bytes(300 * 1024, 1) },
        { name: "Site photo (north).jpg", mimeType: "image/jpeg", buffer: bytes(2 * MB, 2) },
      ]);
      await page.getByText("Uploaded 2 files").waitFor({ timeout: 30000 });
      const docx = await contents(page).locator('[data-row-file="Geotech.docx"] [data-file-meta]').innerText();
      const jpg = await contents(page).locator('[data-row-file="Site photo (north).jpg"] [data-file-meta]').innerText();
      expect(/300 KB/.test(docx), `docx meta: ${docx}`);
      expect(/2(\.0)? MB/.test(jpg), `jpg meta: ${jpg}`);
      return `${docx} · ${jpg}`;
    },
  },
  {
    title: "AC6 — Download opens the file under its own name, with the same bytes",
    run: async ({ page, context }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await openFolder(page, "Reports");
      const [tab] = await Promise.all([
        context.waitForEvent("page"),
        contents(page).getByRole("button", { name: "Download Site photo (north).jpg" }).click(),
      ]);
      await tab.waitForURL(/localhost:9000/, { timeout: 15000 });
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
      await openFiles(page, workspace.uuid, job.uuid);
      const specs = (await folderPaths(token, base, job.uuid)).get("Specs");
      await seedFile(page, token, base, job.uuid, specs.uuid, "Division 03.pdf", bytes(64 * 1024, 3));
      await page.reload();
      await tree(page).locator('[data-tree-folder="Specs"]').click({ button: "right" });
      await page.getByRole("menuitem", { name: "Rename" }).click();
      const dialog = page.getByRole("dialog", { name: "Rename folder" });
      await dialog.getByLabel("Name").fill("Specifications");
      await dialog.getByRole("button", { name: "Rename" }).click();
      await page.getByText("Renamed", { exact: true }).waitFor();
      await page.reload();
      await openFolder(page, "Specifications");
      await contents(page).locator('[data-row-file="Division 03.pdf"]').waitFor();
      return "Specifications holds after reload, Division 03.pdf inside";
    },
  },
  {
    title: "AC5 — Upload folder, two levels deep, into the root; again adds no duplicate folders",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      for (const round of [1, 2]) {
        await page.locator("[data-upload-folder]").setInputFiles(TREE);
        const picker = page.getByRole("dialog", { name: "Where should this folder go?" });
        await picker.waitFor();
        await picker.getByRole("button", { name: "Confirm upload" }).click();
        await page.getByText("Folder uploaded").first().waitFor({ timeout: 30000 });
        if (round === 1) await page.getByText("Folder uploaded").first().waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
      }
      const paths = [...(await folderPaths(token, base, job.uuid)).keys()].filter((p) => p.startsWith("Survey"));
      expect(paths.sort().join() === "Survey,Survey/North,Survey/North/Cores", `folders: ${paths.join()}`);
      await tree(page).locator('[data-tree-folder="Survey"]').waitFor();
      const files = (await apiCall(token, "GET", fileUrl)).body.filter((f) => /^(site|n1|c1)\.txt$/.test(f.file_name));
      expect(files.length === 6, `${files.length} files after two uploads (each upload adds its 3)`);
      // The seeds keep their places; a new folder lists after them, not among them.
      const top = (await apiCall(token, "GET", folderUrl)).body.filter((f) => !f.parent_uuid).map((f) => f.name);
      expect(top.at(-1) === "Survey" && top[0] === "Plans", `root order: ${top.join()}`);
      return `${paths.sort().join(", ")} · no second copy of any folder · root order ${top.join(", ")}`;
    },
  },
  {
    title: "AC7 — delete a folder holding 3 files: gone, and its 3 objects leave storage within a minute",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
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

      await page.reload();
      await tree(page).locator('[data-tree-folder="Site Photos"]').click({ button: "right" });
      await page.getByRole("menuitem", { name: "Delete" }).click();
      const confirm = page.getByRole("dialog", { name: "Delete folder?" });
      const text = await confirm.innerText();
      expect(/Site Photos and everything inside it will be permanently removed, 3 files included\. This cannot be undone\./.test(text), `confirm: ${text}`);
      await confirm.getByRole("button", { name: "Delete" }).click();
      await page.getByText("Deleted", { exact: true }).waitFor();
      await tree(page).locator('[data-tree-folder="Site Photos"]').waitFor({ state: "detached" });
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
      await openFiles(page, workspace.uuid, job.uuid);
      await tree(page).locator("[data-tree-root]").click({ button: "right" });
      const items = await page.getByRole("menuitem").allInnerTexts();
      expect(items.join() === "New folder", `root menu: ${items.join()}`);
      await page.keyboard.press("Escape");
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
      await openFiles(page, workspace.uuid, job.uuid, collaborator.email);
      await openFolder(page, "Plans");
      await uploadInto(page, [{ name: "markup.pdf", mimeType: "application/pdf", buffer: bytes(50 * 1024, 7) }]);
      await page.getByText("Uploaded 1 file").waitFor({ timeout: 30000 });
      const rename = contents(page).getByRole("button", { name: "Rename markup.pdf" });
      const remove = contents(page).getByRole("button", { name: "Delete markup.pdf" });
      expect(await rename.isDisabled(), "Rename enabled for a collaborator");
      expect(await remove.isDisabled(), "Delete enabled for a collaborator");
      const reason = await rename.getAttribute("title");
      expect(reason === "Your role cannot create projects.", `reason: ${reason}`);
      const collabToken = collaborator.token;
      const file = (await apiCall(collabToken, "GET", fileUrl)).body.find((f) => f.file_name === "markup.pdf");
      const patch = await apiCall(collabToken, "PATCH", `${fileUrl}/${file.uuid}`, { file_name: "x.pdf" });
      const del = await apiCall(collabToken, "DELETE", `${fileUrl}/${file.uuid}`);
      expect(patch.status === 403 && del.status === 403, `api: PATCH ${patch.status}, DELETE ${del.status}`);
      return `uploaded · buttons disabled "${reason}" · api ${patch.status}/${del.status}: ${patch.body.detail}`;
    },
  },
  {
    title: "AC10 — a viewer's browser is read-only, and download works",
    run: async ({ page, context }) => {
      await openFiles(page, workspace.uuid, job.uuid, viewer.email);
      for (const name of ["New folder", "Upload files", "Upload folder"]) {
        expect(await contents(page).getByRole("button", { name }).isDisabled(), `${name} enabled for a viewer`);
      }
      const sentence = await contents(page).locator("[data-upload-refusal]").innerText();
      expect(sentence === "Your role cannot upload drawings & documents.", `sentence: ${sentence}`);
      await openFolder(page, "Reports");
      const [tab] = await Promise.all([
        context.waitForEvent("page"),
        contents(page).getByRole("button", { name: "Download Geotech.docx" }).click(),
      ]);
      await tab.waitForEvent("download", { timeout: 15000 }).catch(() => null);
      const viewerFile = (await apiCall(viewer.token, "GET", fileUrl)).body.find((f) => f.file_name === "Geotech.docx");
      const link = await apiCall(viewer.token, "GET", `${fileUrl}/${viewerFile.uuid}/download`);
      const post = await apiCall(viewer.token, "POST", folderUrl, { name: "Nope" });
      expect(link.status === 200, `viewer download ${link.status}`);
      expect(post.status === 403, `viewer folder create ${post.status}`);
      return `writes disabled, "${sentence}" · download ${link.status} · create ${post.status}`;
    },
  },
  {
    title: "S7 AC9 — reload mid-upload, find it under Unfinished uploads, pick it again: only the rest is sent",
    run: async ({ page }) => {
      const big = bytes(20 * MB, 9);
      await openFiles(page, workspace.uuid, job.uuid);
      // Part 1 reaches storage; every later part fails, so the upload sits retrying part 2
      // when the page is reloaded under it. (A part held open instead is released by
      // unroute and finishes, which leaves nothing to resume.)
      let puts = 0;
      await page.route(/localhost:9000/, async (route) => {
        if (route.request().method() !== "PUT") return route.continue();
        puts += 1;
        return puts === 1 ? route.continue() : route.abort("failed");
      });
      await uploadInto(page, [{ name: "Plan set.pdf", mimeType: "application/pdf", buffer: big }]);
      for (let i = 0; i < 60 && puts < 2; i += 1) await page.waitForTimeout(500);
      expect(puts >= 2, "the second part never started");
      await page.reload();
      await page.unroute(/localhost:9000/);

      const section = page.locator("[data-unfinished]");
      await section.locator('[data-unfinished-file="Plan set.pdf"]').waitFor({ timeout: 20000 });
      const row = (await apiCall(token, "GET", fileUrl)).body.find((f) => f.file_name === "Plan set.pdf");
      const held = (await apiCall(token, "GET", `${fileUrl}/${row.uuid}/part`)).body;
      expect(held.part_numbers.join() === "1", `parts held before resume: ${held.part_numbers}`);

      // The wrong file first: refused in words, nothing sent.
      await section.getByRole("button", { name: "Resume" }).click();
      await section.locator("input[type=file]").setInputFiles({ name: "Other.pdf", mimeType: "application/pdf", buffer: bytes(MB, 1) });
      const wrong = await section.getByRole("alert").innerText();
      expect(/That is not the same file\. Pick Plan set\.pdf, 20(\.0)? MB\./.test(wrong), `wrong file: ${wrong}`);

      let sent = 0;
      page.on("request", (r) => r.method() === "PUT" && /localhost:9000/.test(r.url()) && (sent += 1));
      await section.getByRole("button", { name: "Resume" }).click();
      await section.locator("input[type=file]").setInputFiles({ name: "Plan set.pdf", mimeType: "application/pdf", buffer: big });
      await page.getByText("Uploaded 1 file").waitFor({ timeout: 60000 });
      await section.waitFor({ state: "detached", timeout: 15000 });
      const done = (await apiCall(token, "GET", fileUrl)).body.find((f) => f.uuid === row.uuid);
      expect(done.uploaded_at, "not completed");
      expect(sent === row.part_count - 1, `${sent} parts sent on resume, of ${row.part_count}`);
      return `held part 1 after reload · wrong file refused · resumed with ${sent} of ${row.part_count} parts · completed`;
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

await rm("/tmp/f4-s17", { recursive: true, force: true });

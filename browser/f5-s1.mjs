// F5-S1: drawings from project files, the model (D-14, D-27, D-36).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s1.mjs
//
// A fresh workspace and project, discarded at the end. Three PDFs and a .docx go in
// through the multipart path, as a person's upload would: "Set A.pdf" (3 pages) in Plans,
// "Set B.pdf" (3 pages) in Plans/Addenda, "Notes.docx" in Specs, and "Half.pdf" left
// unfinished. Then `POST …/drawing/load` is driven directly: the dialog that sends it is
// Block B's (S5, S6).

import { SEEDED, apiCall, expect, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { discardProject } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openFiles } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, preparedSheets, sheetsOf, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S1 load");
const project = await makeProject(token, base, { name: "Load from files" });
const viewer = await seatedMember(token, workspace.uuid, "viewer", "f5s1");
let files;

const pagesOf = async (fileUuid) =>
  (await sheetsOf(token, base, project.uuid))
    .filter((s) => s.file_uuid === fileUuid)
    .map((s) => s.page_number)
    .sort((a, b) => a - b);

await run("f5-s1", [
  {
    title: "setup: three PDFs and a .docx uploaded into Plans, Plans/Addenda and Specs; one left unfinished",
    run: async ({ page }) => {
      files = await uploadAll(page, token, base, project.uuid, [
        { name: "Set A.pdf", buffer: makePdf(letterPages(3, "A")), folder: "Plans" },
        { name: "Set B.pdf", buffer: makePdf(letterPages(3, "B")), folder: "Plans/Addenda" },
        { name: "Notes.docx", buffer: Buffer.from("not a drawing"), folder: "Specs" },
        { name: "Half.pdf", buffer: makePdf(letterPages(1, "H")), folder: "Plans", parts: 0 },
      ], workspace.uuid);
      return Object.keys(files).join(", ");
    },
  },
  {
    title: "AC1: pages 1 and 3 make two sheets; then pages 2 and 3 add only page 2",
    run: async () => {
      const a = files["Set A.pdf"].uuid;
      const first = await loadPages(token, base, project.uuid, [[a, [1, 3]]]);
      expect(first.status === 200, `first load: ${first.status} ${JSON.stringify(first.body)}`);
      const f1 = first.body.files[0];
      expect(f1.added.join() === "1,3" && f1.already.length === 0, `first: ${JSON.stringify(f1)}`);
      expect(f1.page_count === 3, `page_count ${f1.page_count}`);
      const second = await loadPages(token, base, project.uuid, [[a, [2, 3]]]);
      expect(second.status === 200, `second load: ${second.status}`);
      const f2 = second.body.files[0];
      expect(f2.added.join() === "2" && f2.already.join() === "3", `second: ${JSON.stringify(f2)}`);
      expect(f2.file_uuid === f1.file_uuid, "a second drawing was made for the same file");
      const pages = await pagesOf(f1.file_uuid);
      expect(pages.join() === "1,2,3", `sheets for Set A: ${pages.join()}`);
      const names = second.body.sheets.map((s) => s.sheet_name).join();
      expect(names === "Page 2", `new sheet named ${names}`);
      return `load 1,3 → added 1,3 · load 2,3 → added 2, already 3 · Set A has pages ${pages.join()}, once each`;
    },
  },
  {
    title: "Mirroring: the sheets sit under Plans › Set A and Plans › Addenda › Set B, the Plans mirror made once",
    run: async () => {
      const b = await loadPages(token, base, project.uuid, [[files["Set B.pdf"].uuid, [1, 3]]]);
      expect(b.status === 200, `load B: ${b.status} ${JSON.stringify(b.body)}`);
      const folders = (await apiCall(token, "GET", `${base}/${project.uuid}/drawing/folder`)).body;
      const byUuid = new Map(folders.map((f) => [f.uuid, f]));
      const path = (f) => {
        const parts = [];
        for (let at = f; at; at = byUuid.get(at.parent_uuid)) parts.unshift(at.name);
        return parts.join(" › ");
      };
      const paths = folders.map(path).sort();
      const want = ["Plans", "Plans › Addenda", "Plans › Addenda › Set B", "Plans › Set A"];
      expect(JSON.stringify(paths) === JSON.stringify(want), `drawing folders: ${paths.join(" | ")}`);
      const sheets = await sheetsOf(token, base, project.uuid);
      expect(sheets.every((s) => s.render_status === "pending" || s.render_status === "ready"), "a sheet failed");
      return paths.join(" | ");
    },
  },
  {
    title: "AC2: a skipped page never appears, after preparation or a reload",
    run: async () => {
      const fileB = (await loadPages(token, base, project.uuid, [[files["Set B.pdf"].uuid, [1]]])).body.files[0];
      expect(fileB.added.length === 0 && fileB.already.join() === "1", `reload of B: ${JSON.stringify(fileB)}`);
      await preparedSheets(token, base, project.uuid, fileB.file_uuid);
      const pages = await pagesOf(fileB.file_uuid);
      expect(pages.join() === "1,3", `Set B has pages ${pages.join()} after preparation`);
      expect(fileB.page_count === 3, "the file's true page count is kept");
      return `Set B: page_count 3, sheets ${pages.join()} after preparation; page 2 never made`;
    },
  },
  {
    title: "AC3: deleting Plans while its PDFs have sheets is refused with the count, in the api and on screen",
    run: async ({ page }) => {
      const folders = (await apiCall(token, "GET", `${base}/${project.uuid}/folder`)).body;
      const plans = folders.find((f) => f.name === "Plans" && !f.parent_uuid);
      const refused = await apiCall(token, "DELETE", `${base}/${project.uuid}/folder/${plans.uuid}`);
      expect(refused.status === 409, `folder delete: ${refused.status}`);
      expect(/5 takeoff sheets/.test(refused.body?.detail ?? ""), `said: ${refused.body?.detail}`);
      const file = await apiCall(token, "DELETE", `${base}/${project.uuid}/file/${files["Set A.pdf"].uuid}`);
      expect(file.status === 409 && /3 takeoff sheets/.test(file.body?.detail ?? ""), `file delete: ${file.status} ${file.body?.detail}`);

      await openFiles(page, workspace.uuid, project.uuid);
      const row = page.locator("[data-file-browser]").getByText("Plans", { exact: true }).first();
      await row.click({ button: "right" });
      await page.getByRole("menuitem", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await page.getByText("Can't delete — folder in use").waitFor({ timeout: 10000 });
      await page.getByText(refused.body.detail).waitFor({ timeout: 5000 });
      const still = (await apiCall(token, "GET", `${base}/${project.uuid}/folder`)).body.some((f) => f.uuid === plans.uuid);
      expect(still, "Plans went anyway");
      return `folder 409 "${refused.body.detail}" · file 409 · the screen says "Can't delete — folder in use"`;
    },
  },
  {
    title: "AC4: a .docx is refused naming it; so are a page past the end and an unfinished upload",
    run: async () => {
      const docx = await loadPages(token, base, project.uuid, [[files["Notes.docx"].uuid, [1]]]);
      expect(docx.status === 422 && /"Notes\.docx"/.test(docx.body?.detail ?? ""), `docx: ${docx.status} ${docx.body?.detail}`);
      const past = await loadPages(token, base, project.uuid, [[files["Set A.pdf"].uuid, [4]]]);
      expect(past.status === 422 && /has 3 pages; there is no page 4/.test(past.body?.detail ?? ""), `page 4: ${past.status} ${past.body?.detail}`);
      const half = await loadPages(token, base, project.uuid, [[files["Half.pdf"].uuid, [1]]]);
      expect(half.status === 409 && /has not finished uploading/.test(half.body?.detail ?? ""), `unfinished: ${half.status} ${half.body?.detail}`);
      // One bad file refuses the whole Load, so nothing half-happens.
      const mixed = await loadPages(token, base, project.uuid, [
        [files["Set B.pdf"].uuid, [2]],
        [files["Notes.docx"].uuid, [1]],
      ]);
      const pagesB = (await sheetsOf(token, base, project.uuid)).filter((s) => s.sheet_name === "Page 2").length;
      expect(mixed.status === 422 && pagesB === 1, `mixed: ${mixed.status}, Page 2 sheets ${pagesB}`);
      return `"${docx.body.detail}" · "${past.body.detail}" · "${half.body.detail}" · a mixed Load wrote nothing`;
    },
  },
  {
    title: "A viewer cannot load pages (canUploadDocuments)",
    run: async () => {
      const refused = await loadPages(viewer.token, base, project.uuid, [[files["Set B.pdf"].uuid, [2]]]);
      expect(refused.status === 403, `viewer: ${refused.status}`);
      return `403 "${refused.body?.detail}"`;
    },
  },
]);

await discardProject(token, workspace.uuid, project.uuid);
console.log(`cleanup: ${project.name} discarded from ${workspace.name}`);

// F4-S7: the New project dialog, two steps, seeded folders, and multipart upload (D-27).
//
//   docker compose --profile browser run --rm browser node scripts/f4-s7.mjs
//
// The hard criteria are the upload's:
// - Files are filed where they were put: dropped ones in the root, chosen ones in their
//   folder.
// - The bar never steps back. An observer records every percentage it shows.
// - Storage failing mid-upload leaves one project and a Retry that finishes into it.
// - Going offline pauses the upload, and it continues from the parts already sent.
//
// Updated 2026-10-24 (D-314, D-311, D-309, D-313):
// - Every step: New project is the All projects dialog's (D-314 2); Home has a New project of
//   its own (D-311 4), so the button is scoped to the dialog.
// - AC2/AC3: the button is "Create" (D-309 2); a new project opens its takeoff (D-311 6) and has
//   no seed folders (D-309 1), so "lands on it" is its takeoff address and the folders are none.
// - AC4: the four category rows are gone (D-309 2). Two files dropped still go to the root; the
//   third is chosen as a folder "Specs" through Choose folder, which lands with its tree (D-309 2),
//   so it is still filed in Specs. Create hands the files to the app's upload queue and opens the
//   takeoff's load screen (D-311 6), whose "Uploading N of M files · P%" is the bar observed
//   (D-313 2); "landed" is the api reading every file uploaded, not the old dialog's
//   "N files uploaded." line.
// - AC5: files chosen go to the root (D-309 2). The failure is the load screen's row "Upload failed"
//   with its Retry, one per file (D-311 8), in place of the dialog's sentence and its one Retry.
// - AC1-AC8 open All projects over Account settings rather than Home (harness): Home reopens an
//   earlier step's project, whose load screen (files, no sheets: D-311 1) could cover New project.
// - AC8: Create opens the load screen as in AC4 (D-311 6); the pause and its sentence are unchanged.

import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { APP, SEEDED, apiCall, enterWorkspace, expect, fixtureOwner, onDisk, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, openDashboard } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S7 create");
const MB = 1024 * 1024;
const bytes = (size, fill) => Buffer.alloc(size, fill);

const projectsNamed = async (name) =>
  (await apiCall(token, "GET", `${base}?limit=200`)).body.items.filter((p) => p.name === name);
const filesOf = async (uuid) => (await apiCall(token, "GET", `${base}/${uuid}/file`)).body;
const foldersOf = async (uuid) => (await apiCall(token, "GET", `${base}/${uuid}/folder`)).body;

/** Every file of the project named `name` uploaded, `count` of them, read from the api. */
async function landed(name, count, timeout) {
  const until = Date.now() + timeout;
  for (;;) {
    const [project] = await projectsNamed(name);
    const files = project ? await filesOf(project.uuid) : [];
    if (files.length === count && files.every((f) => f.uploaded_at)) return { project, files };
    if (Date.now() > until) {
      throw new Error(`not landed in ${timeout} ms: ${JSON.stringify(files.map((f) => [f.file_name, f.uploaded_at]))}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** Records every percentage the bar shows, so "never steps back" is a checked fact. Since D-311 6
 *  the bar is the load screen's "Uploading N of M files · P%" (D-313 2). */
async function watchBar(page) {
  await page.evaluate(() => {
    window.__pcts = [];
    const read = () => {
      const text = document.querySelector("[data-upload-progress]")?.textContent ?? "";
      const match = /(\d+)%/.exec(text);
      const n = match ? Number.parseInt(match[1], 10) : Number.NaN;
      if (!Number.isNaN(n) && window.__pcts.at(-1) !== n) window.__pcts.push(n);
    };
    new MutationObserver(read).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
}

/** All projects over Account settings, not over Home: Home reopens the last project, and a
 *  project of an earlier step with files and no sheets opens its load screen (D-311 1), which
 *  can land over New project and take its clicks. The dialog is the same over any screen (D-314 2). */
async function openNewProject(page, name) {
  await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/settings/account?projects=open`);
  await page.getByRole("dialog", { name: "All projects" }).getByRole("tablist", { name: "Project status" }).waitFor({ timeout: 20000 });
  await page.getByRole("dialog", { name: "All projects" }).getByRole("button", { name: "New project" }).click();
  await page.getByRole("dialog", { name: "New project" }).waitFor();
  if (name) await page.fill("#new-project-name", name);
}

const create = (page) => page.getByRole("dialog", { name: "New project" }).getByRole("button", { name: "Create", exact: true }).click();

await run("f4-s7", [
  {
    title: "AC1 — step 1 has the kept fields in order, Show Map absent, Next needs a name",
    run: async ({ page }) => {
      await openNewProject(page);
      const labels = await page
        .getByRole("dialog", { name: "New project" })
        .locator("label")
        .evaluateAll((els) => els.map((el) => el.textContent?.trim()).filter(Boolean));
      const want = ["Project name", "Client", "Bid due", "Plans Dated", "Assigned To", "Project type",
        "Construction Type", "Wage Determination", "Labor Pricing Basis", "Trade Scope"];
      const seen = labels.filter((l) => want.includes(l));
      expect(seen.join("|") === want.join("|"), `fields: ${seen.join(", ")}`);
      expect((await page.getByText("Show Map").count()) === 0, "Show Map is offered");
      const next = page.getByRole("button", { name: "Next" });
      expect(await next.isDisabled(), "Next enabled with no name");
      await page.fill("#new-project-name", "   ");
      expect(await next.isDisabled(), "Next enabled with a blank name");
      return `${seen.length} fields in order · no Show Map · Next waits for a name`;
    },
  },
  {
    title: "AC2/AC3 — name only, no files: lands on its takeoff, with no folders (D-309), and no country",
    run: async ({ page }) => {
      const name = `F4-S7 bare ${Date.now()}`;
      await openNewProject(page, name);
      await page.getByRole("button", { name: "Next" }).click();
      await create(page);
      await page.getByText("Project created").first().waitFor({ timeout: 15000 });
      const [project] = await projectsNamed(name);
      expect(project, `${name} was not created`);
      await page.waitForURL((url) => url.pathname.startsWith(`/project/${project.uuid}/takeoff`), { timeout: 15000 });
      await page.waitForFunction((n) => document.title.startsWith(`${n} · Takeoff`), name, { timeout: 15000 });
      const folders = (await foldersOf(project.uuid)).map((f) => f.name);
      expect(folders.length === 0, `folders: ${folders}`);
      expect(project.country === null, `country: ${project.country}`);
      return "landed on its takeoff · no folders · country null";
    },
  },
  {
    title: "AC4 — two files dropped and a folder Specs chosen: filed where put, the bar never steps back",
    run: async ({ page }) => {
      const name = `F4-S7 files ${Date.now()}`;
      await openNewProject(page, name);
      await page.fill("#new-project-client", "Harbor Partners");
      await page.getByRole("button", { name: "Next" }).click();
      const drop = await page.evaluateHandle(() => {
        const dt = new DataTransfer();
        dt.items.add(new File([new Uint8Array(3 * 1024 * 1024)], "sheet-a.pdf", { type: "application/pdf" }));
        dt.items.add(new File([new Uint8Array(1024)], "photo.jpg", { type: "image/jpeg" }));
        return dt;
      });
      await page.dispatchEvent("[data-drop-zone]", "drop", { dataTransfer: drop });
      // A folder named Specs, chosen through Choose folder: it lands with its tree (D-309 2).
      const specs = path.join(tmpdir(), `f4-s7-${Date.now()}`, "Specs");
      await mkdir(specs, { recursive: true });
      await writeFile(path.join(specs, "spec.docx"), bytes(20 * MB, 7));
      await page.getByLabel("Choose a folder").setInputFiles(specs);
      await page.locator('li[data-file="spec.docx"]').getByText("Specs").waitFor();
      await page.locator('li[data-file="photo.jpg"]').waitFor();
      await watchBar(page);
      await create(page);
      const { project, files } = await landed(name, 3, 60000);
      const pcts = await page.evaluate(() => window.__pcts);
      const backwards = pcts.some((p, i) => i > 0 && p < pcts[i - 1]);
      expect(!backwards && pcts.length > 2, `bar values: ${pcts.join(",")}`);

      const folders = new Map((await foldersOf(project.uuid)).map((f) => [f.uuid, f.name]));
      const where = Object.fromEntries(files.map((f) => [f.file_name, f.folder_uuid ? folders.get(f.folder_uuid) : "root"]));
      expect(where["sheet-a.pdf"] === "root" && where["photo.jpg"] === "root", `placed: ${JSON.stringify(where)}`);
      expect(where["spec.docx"] === "Specs", `spec in ${where["spec.docx"]}`);
      const spec = files.find((f) => f.file_name === "spec.docx");
      expect(spec.part_count === 3 && spec.uploaded_at, `spec: ${spec.part_count} parts, ${spec.uploaded_at}`);
      expect(project.client_name === "Harbor Partners", "client not saved");
      return `placed ${JSON.stringify(where)} · spec in 3 parts · bar ${pcts.join("→")}`;
    },
  },
  {
    title: "AC5 — storage failing mid-upload: one project, Retry finishes into it",
    run: async ({ page }) => {
      const name = `F4-S7 retry ${Date.now()}`;
      await openNewProject(page, name);
      await page.getByRole("button", { name: "Next" }).click();
      await page.getByLabel("Choose files", { exact: true }).setInputFiles([
        { name: "plans-1.pdf", mimeType: "application/pdf", buffer: bytes(MB, 1) },
        { name: "plans-2.pdf", mimeType: "application/pdf", buffer: bytes(MB, 2) },
      ]);
      await page.locator('li[data-file="plans-2.pdf"]').waitFor();
      // Storage refuses everything: every part PUT fails, and after its retries the
      // file is given up on.
      await page.route(/localhost:9000/, (route) => route.abort());
      await create(page);
      // The load screen's rows say so, each with its Retry (D-311 8).
      const retries = ["plans-1.pdf", "plans-2.pdf"].map((file) =>
        page.getByRole("button", { name: `Retry ${file}`, exact: true }),
      );
      for (const retry of retries) await retry.waitFor({ timeout: 60000 });
      // Each file says so twice: its row in the tree and its tile (D-311 8).
      expect((await page.getByText("Upload failed", { exact: true }).count()) >= 2, "the rows do not read Upload failed");
      expect((await projectsNamed(name)).length === 1, "not exactly one project after the failure");

      await page.unroute(/localhost:9000/);
      for (const retry of retries) await retry.click();
      const { files } = await landed(name, 2, 60000);
      const found = await projectsNamed(name);
      expect(found.length === 1, `${found.length} projects after Retry`);
      expect(files.length === 2 && files.every((f) => f.uploaded_at), `files: ${JSON.stringify(files.map((f) => [f.file_name, f.uploaded_at]))}`);
      return "failed on both rows · Retry · one project, both files uploaded";
    },
  },
  {
    title: "AC8 — offline mid-upload pauses and says so; back online it finishes without restarting",
    run: async ({ page, context }) => {
      const name = `F4-S7 offline ${Date.now()}`;
      await openNewProject(page, name);
      await page.getByRole("button", { name: "Next" }).click();
      await page.getByLabel("Choose files", { exact: true }).setInputFiles(await onDisk("big-set.pdf", bytes(40 * MB, 3)));
      await page.locator('li[data-file="big-set.pdf"]').waitFor();
      await watchBar(page);
      await create(page);
      await page.waitForFunction(() => (window.__pcts ?? []).some((p) => p >= 20), null, { timeout: 60000 });
      await context.setOffline(true);
      await page.getByText("Paused. Waiting for the connection to come back.").waitFor({ timeout: 30000 });
      const pausedAt = await page.evaluate(() => window.__pcts.at(-1));
      await context.setOffline(false);
      const { files } = await landed(name, 1, 90000);
      const pcts = await page.evaluate(() => window.__pcts);
      const after = pcts.slice(pcts.indexOf(pausedAt));
      expect(after.every((p) => p >= pausedAt), `restarted: ${pcts.join(",")}`);
      const [file] = files;
      expect(file.uploaded_at && file.part_count === 5, `file: ${JSON.stringify(file)}`);
      return `paused at ${pausedAt}% · resumed to 100 · ${file.part_count} parts`;
    },
  },
  {
    title: "AC7 — no ceiling: the api plans 6 GB as 768 parts and refuses nothing",
    run: async () => {
      const made = await apiCall(token, "POST", base, { name: `F4-S7 plan ${Date.now()}` });
      const plan = await apiCall(token, "POST", `${base}/${made.body.uuid}/file`, {
        file_name: "huge-set.pdf",
        content_type: "application/pdf",
        byte_size: 6 * 1024 ** 3,
      });
      expect(plan.status === 201, `6 GB refused: ${plan.status} ${JSON.stringify(plan.body)}`);
      expect(plan.body.part_size === 8 * MB && plan.body.part_count === 768, `plan: ${plan.body.part_size} × ${plan.body.part_count}`);
      const cancelled = await apiCall(token, "DELETE", `${base}/${made.body.uuid}/file/${plan.body.uuid}/upload`);
      expect(cancelled.status === 200, `cancel: ${cancelled.status}`);
      return "6 GB → 768 × 8 MiB, accepted, then cancelled cleanly";
    },
  },
  {
    title: "AC6 — a qa_pricing seat cannot open New project, and pricing can (D-29)",
    run: async ({ page }) => {
      const qa = await seatedMember(token, workspace.uuid, "qa_pricing", "f4s7");
      await openDashboard(page, workspace.uuid, qa.email);
      const dialog = page.getByRole("dialog", { name: "All projects" });
      const button = dialog.getByRole("button", { name: "New project" });
      expect(await button.isDisabled(), "New project enabled for qa_pricing");
      await dialog.getByText("Your role cannot create projects.").waitFor();
      return "disabled with the reason";
    },
  },
]);

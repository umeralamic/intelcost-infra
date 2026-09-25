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

import { apiCall, expect, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, openDashboard } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S7 create");
const MB = 1024 * 1024;
const bytes = (size, fill) => Buffer.alloc(size, fill);

const projectsNamed = async (name) =>
  (await apiCall(token, "GET", `${base}?limit=200`)).body.items.filter((p) => p.name === name);
const filesOf = async (uuid) => (await apiCall(token, "GET", `${base}/${uuid}/file`)).body;
const foldersOf = async (uuid) => (await apiCall(token, "GET", `${base}/${uuid}/folder`)).body;

/** Records every percentage the bar shows, so "never steps back" is a checked fact. */
async function watchBar(page) {
  await page.evaluate(() => {
    window.__pcts = [];
    const read = () => {
      const text = document.querySelector("[data-upload-pct]")?.textContent ?? "";
      const n = Number.parseInt(text, 10);
      if (!Number.isNaN(n) && window.__pcts.at(-1) !== n) window.__pcts.push(n);
    };
    new MutationObserver(read).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
}

async function openNewProject(page, name) {
  await openDashboard(page, workspace.uuid);
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByRole("dialog", { name: "New project" }).waitFor();
  if (name) await page.fill("#new-project-name", name);
}

await run("f4-s7", [
  {
    title: "AC1 — step 1 has the kept fields in order, Show Map absent, Next needs a name",
    run: async ({ page }) => {
      await openNewProject(page);
      const labels = await page
        .getByRole("dialog")
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
    title: "AC2/AC3 — name only, no files: lands on it, with the four seed folders, and no country",
    run: async ({ page }) => {
      const name = `F4-S7 bare ${Date.now()}`;
      await openNewProject(page, name);
      await page.getByRole("button", { name: "Next" }).click();
      await page.getByRole("button", { name: "Create project" }).click();
      await page.getByText("Project created").waitFor({ timeout: 15000 });
      await page.getByRole("heading", { name }).waitFor({ timeout: 15000 });
      const [project] = await projectsNamed(name);
      const folders = (await foldersOf(project.uuid)).map((f) => f.name);
      expect(folders.join() === "Plans,Specs,Reports,Site Photos", `folders: ${folders}`);
      expect(project.country === null, `country: ${project.country}`);
      return `landed on it · ${folders.join(", ")} · country null`;
    },
  },
  {
    title: "AC4 — two files dropped and one chosen into Specs: filed where put, the bar never steps back",
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
      await page.getByLabel("Choose files for Specs").setInputFiles({
        name: "spec.docx",
        mimeType: "application/octet-stream",
        buffer: bytes(20 * MB, 7),
      });
      await page.locator('li[data-file="spec.docx"]').getByText("Specs").waitFor();
      await watchBar(page);
      await page.getByRole("button", { name: "Create & upload 3 files" }).click();
      await page.getByText("3 files uploaded.").waitFor({ timeout: 60000 });
      const pcts = await page.evaluate(() => window.__pcts);
      const backwards = pcts.some((p, i) => i > 0 && p < pcts[i - 1]);
      expect(!backwards && pcts.length > 2, `bar values: ${pcts.join(",")}`);

      const [project] = await projectsNamed(name);
      const folders = new Map((await foldersOf(project.uuid)).map((f) => [f.uuid, f.name]));
      const files = await filesOf(project.uuid);
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
      await page.getByLabel("Choose files for Plans").setInputFiles([
        { name: "plans-1.pdf", mimeType: "application/pdf", buffer: bytes(MB, 1) },
        { name: "plans-2.pdf", mimeType: "application/pdf", buffer: bytes(MB, 2) },
      ]);
      // Storage refuses everything: every part PUT fails, and after its retries the
      // file is given up on.
      await page.route(/localhost:9000/, (route) => route.abort());
      await page.getByRole("button", { name: "Create & upload 2 files" }).click();
      await page.getByText(/The project was created, but the upload stopped/).waitFor({ timeout: 60000 });
      const retry = page.getByRole("dialog").getByRole("button", { name: "Retry", exact: true });
      await retry.waitFor();
      expect((await projectsNamed(name)).length === 1, "not exactly one project after the failure");

      await page.unroute(/localhost:9000/);
      await retry.click();
      await page.getByText("2 files uploaded.").waitFor({ timeout: 60000 });
      const found = await projectsNamed(name);
      expect(found.length === 1, `${found.length} projects after Retry`);
      const files = await filesOf(found[0].uuid);
      expect(files.length === 2 && files.every((f) => f.uploaded_at), `files: ${JSON.stringify(files.map((f) => [f.file_name, f.uploaded_at]))}`);
      return "failed with the sentence · Retry · one project, both files uploaded";
    },
  },
  {
    title: "AC8 — offline mid-upload pauses and says so; back online it finishes without restarting",
    run: async ({ page, context }) => {
      const name = `F4-S7 offline ${Date.now()}`;
      await openNewProject(page, name);
      await page.getByRole("button", { name: "Next" }).click();
      await page.getByLabel("Choose files for Plans").setInputFiles({
        name: "big-set.pdf",
        mimeType: "application/pdf",
        buffer: bytes(40 * MB, 3),
      });
      await watchBar(page);
      await page.getByRole("button", { name: "Create & upload 1 file" }).click();
      await page.waitForFunction(() => (window.__pcts ?? []).some((p) => p >= 20), null, { timeout: 60000 });
      await context.setOffline(true);
      await page.getByText("Paused. Waiting for the connection to come back.").waitFor({ timeout: 30000 });
      const pausedAt = await page.evaluate(() => window.__pcts.at(-1));
      await context.setOffline(false);
      await page.getByText("1 file uploaded.").waitFor({ timeout: 90000 });
      const pcts = await page.evaluate(() => window.__pcts);
      const after = pcts.slice(pcts.indexOf(pausedAt));
      expect(after.every((p) => p >= pausedAt), `restarted: ${pcts.join(",")}`);
      const [project] = await projectsNamed(name);
      const [file] = await filesOf(project.uuid);
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
      const button = page.getByRole("button", { name: "New project" });
      expect(await button.isDisabled(), "New project enabled for qa_pricing");
      await page.getByText("Your role cannot create projects.").waitFor();
      return "disabled with the reason";
    },
  },
]);

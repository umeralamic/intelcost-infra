// F5-S5: From Project Files, the tree (legacy's AddSheetsDialog, first tab).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s5.mjs
//
// "Files": Plans/Set A.pdf, Plans/Addenda/Set B.pdf, Specs/Notes.docx and Site.png at the
// root, nothing loaded. "Partly": the same Set A.pdf with page 1 already in takeoff, so its
// row reads "in takeoff — pick more pages". "Bare": no files.

import { APP, expect, run, SEEDED, signInAs, fixtureOwner } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, makePng, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S5 tree");
const files = await makeProject(token, base, { name: "Files" });
const partly = await makeProject(token, base, { name: "Partly" });
const bare = await makeProject(token, base, { name: "Bare" });

const dialog = (page) => page.getByRole("dialog");
const row = (page, name) => dialog(page).locator(`[data-load-file="${name}"]`);
const folder = (page, name) => dialog(page).locator(`[data-load-folder="${name}"]`);

/** Takeoff empty for a project, then its dialog. */
async function openDialog(page, project) {
  await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
  await page.goto(`${APP}/project/${project.uuid}/takeoff`);
  await page.getByRole("button", { name: "Add sheets" }).first().click();
  await dialog(page).waitFor({ timeout: 15000 });
  await dialog(page).locator("[data-load-tree], [data-load-empty]").first().waitFor({ timeout: 15000 });
}

await run("f5-s5", [
  {
    title: "setup: four files in Files, a loaded page in Partly",
    run: async ({ page }) => {
      await uploadAll(page, token, base, files.uuid, [
        { name: "Set A.pdf", buffer: makePdf(letterPages(2, "A")), folder: "Plans" },
        { name: "Set B.pdf", buffer: makePdf(letterPages(2, "B")), folder: "Plans/Addenda" },
        { name: "Notes.docx", buffer: Buffer.from("not a drawing"), folder: "Specs" },
        { name: "Site.png", buffer: makePng(400, 300), folder: null },
      ], workspace.uuid);
      const made = await uploadAll(page, token, base, partly.uuid, [
        { name: "Set A.pdf", buffer: makePdf(letterPages(3, "A")), folder: "Plans" },
        { name: "Notes.docx", buffer: Buffer.from("not a drawing"), folder: "Specs" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, partly.uuid, [[made["Set A.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      return "Files: 4 files · Partly: Set A page 1 in takeoff";
    },
  },
  {
    title: "AC1: the root is open; ticking Plans ticks every eligible file beneath it and part-ticks the root",
    run: async ({ page }) => {
      await openDialog(page, files);
      await folder(page, "Plans").waitFor();
      await row(page, "Site.png").waitFor();
      // Open Plans and Addenda to see the files the tick reached.
      await folder(page, "Plans").getByRole("button", { name: "Open Plans" }).click();
      await folder(page, "Addenda").getByRole("button", { name: "Open Addenda" }).click();
      await folder(page, "Plans").getByRole("checkbox").check();
      const a = await row(page, "Set A.pdf").getByRole("checkbox").isChecked();
      const b = await row(page, "Set B.pdf").getByRole("checkbox").isChecked();
      const site = await row(page, "Site.png").getByRole("checkbox").isChecked();
      const rootTick = await folder(page, "Files").getByRole("checkbox").evaluate((el) => ({ checked: el.checked, part: el.indeterminate }));
      expect(a && b, "Plans did not reach Set A and Set B (in Addenda)");
      expect(!site, "Plans ticked a file at the root");
      expect(!rootTick.checked && rootTick.part, `the root reads ${JSON.stringify(rootTick)}`);
      const plansCount = (await folder(page, "Plans").textContent()).match(/\((\d+) files?\)/)?.[1];
      expect(plansCount === "2", `Plans says ${plansCount} files`);
      return "Plans ticked → Set A and Set B (Addenda) ticked, Site.png not, the root part-ticked; Plans (2 files)";
    },
  },
  {
    title: "AC2: a .docx is greyed \"unsupported type\"; a PDF already in takeoff reads \"in takeoff — pick more pages\"",
    run: async ({ page }) => {
      await openDialog(page, partly);
      await folder(page, "Specs").getByRole("button", { name: "Open Specs" }).click();
      await folder(page, "Plans").getByRole("button", { name: "Open Plans" }).click();
      const docx = row(page, "Notes.docx");
      expect(await docx.getByRole("checkbox").isDisabled(), "the .docx can be ticked");
      await docx.getByText("unsupported type").waitFor();
      await row(page, "Set A.pdf").getByText("in takeoff — pick more pages").waitFor();
      expect(!(await row(page, "Set A.pdf").getByRole("checkbox").isDisabled()), "a file in takeoff cannot be picked again");
      return "Notes.docx disabled, unsupported type · Set A.pdf in takeoff — pick more pages, still pickable";
    },
  },
  {
    title: "AC3: the footer counts what is in takeoff and what is unsupported; Open project files goes to Project Home",
    run: async ({ page }) => {
      await openDialog(page, partly);
      const footer = (await dialog(page).locator("[data-load-footer]").textContent()).trim();
      expect(footer === "1 already in takeoff · 1 unsupported", `footer reads "${footer}"`);
      const link = dialog(page).getByRole("link", { name: "Open project files" });
      expect((await link.getAttribute("href")) === `/project/${partly.uuid}`, `link: ${await link.getAttribute("href")}`);
      return `"${footer}" · Open project files → /project/…`;
    },
  },
  {
    title: "AC4: Choose pages (n) counts the ticked files, and with none it is disabled",
    run: async ({ page }) => {
      await openDialog(page, files);
      const choose = dialog(page).locator("[data-choose-pages]");
      await dialog(page).getByRole("button", { name: /^Choose pages/ }).waitFor();
      const none = (await page.getByRole("button", { name: /^Choose pages/ }).textContent()).trim();
      expect(none === "Choose pages (0)" && (await page.getByRole("button", { name: /^Choose pages/ }).isDisabled()), `with none: ${none}`);
      await row(page, "Site.png").getByRole("checkbox").check();
      await folder(page, "Plans").getByRole("checkbox").check();
      const three = (await page.getByRole("button", { name: /^Choose pages/ }).textContent()).trim();
      expect(three === "Choose pages (3)", `with three: ${three}`);
      expect(!(await page.getByRole("button", { name: /^Choose pages/ }).isDisabled()), "enabled with three");
      void choose;
      return `"${none}" disabled → "${three}"`;
    },
  },
  {
    title: "AC5: a project with no files says so",
    run: async ({ page }) => {
      await openDialog(page, bare);
      await dialog(page).getByText("No files yet. Upload from the Files page or use the Upload tab.").waitFor();
      return "No files yet. Upload from the Files page or use the Upload tab.";
    },
  },
]);

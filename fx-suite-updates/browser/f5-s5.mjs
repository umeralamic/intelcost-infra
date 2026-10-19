// F5-S5: From Project Files, the tree (legacy's AddSheetsDialog, first tab).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s5.mjs
//
// "Files": Plans/Set A.pdf, Plans/Addenda/Set B.pdf, Specs/Notes.docx and Site.png at the
// root, nothing loaded. "Partly": the same Set A.pdf with page 1 already in takeoff, so it
// is still offered for more pages. "Bare": no files.
//
// Updated 2026-10-19 to today's screens (D-619): the two-step load ("Load project files into
// takeoff", then "Choose pages") is one screen (D-310 1): the tree with ticks on the left, the
// focused item's pages on the right, one Load button. What changed, and the decision behind it:
// - The tree opens with every folder open (D-310, D-313): the "Open Plans" clicks are gone.
// - "Choose pages (n)" counted the ticked files; the one Load button counts their pages (D-310 1).
//   The three ticked files of AC4 are still checked as three ticked rows, and are 5 pages.
// - A partly loaded PDF's row no longer reads "in takeoff — pick more pages": a file's tick reads
//   all, some or none of its pages (D-310 1), and its pages show "loaded", ticked and locked.
//   AC2 checks that instead: still pickable, page 1 locked.
// - AC3 is dropped: the footer ("1 already in takeoff · 1 unsupported") went with the two-step
//   dialog (D-310 1), and "Open project files" went to Project Home, which was removed (D-315).
// - The empty tree's words point at the tree's own Upload now (D-315 C2, files in the load screen).
// - The sizes are waited for (the api's page-sizes) before a tick: a tick takes the pages the
//   sizes say (D-310 2, 3).

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, makePng, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S5 tree");
const files = await makeProject(token, base, { name: "Files" });
const partly = await makeProject(token, base, { name: "Partly" });
const bare = await makeProject(token, base, { name: "Bare" });
const sheetsAt = {};

/** The load screen: the one dialog that carries the tree and the pages (D-310). */
const dialog = (page) => page.getByRole("dialog").filter({ has: page.locator("[data-load-dialog]") });
const row = (page, name) => dialog(page).locator(`[data-load-file="${name}"]`);
const folder = (page, name) => dialog(page).locator(`[data-load-folder="${name}"]`);

/** Every PDF of the project measured (D-310 3), so a tick takes its pages. */
async function measured(project, timeout = 60000) {
  const until = Date.now() + timeout;
  for (;;) {
    const sizes = await apiCall(token, "GET", `${base}/${project.uuid}/file/page-sizes`);
    const waiting = sizes.status === 200 ? sizes.body.filter((e) => e.status !== "failed" && (e.page_count === null || e.pages.length < e.page_count)) : null;
    if (waiting && waiting.length === 0) return sizes.body;
    if (Date.now() > until) throw new Error(`sizes not in after ${timeout / 1000} s: ${sizes.status} ${JSON.stringify(waiting)}`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

/** Takeoff for a project, then the load screen: the empty state's Add sheets, or the Sheets
 *  panel's + → Add Pages when the project has sheets (D-313). */
async function openDialog(page, project) {
  await measured(project);
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  const first = sheetsAt[project.uuid];
  await page.goto(`${APP}/project/${project.uuid}/takeoff${first ? `/${first}` : ""}`);
  // The screen's own sizes answer, before any tick: the tree is tickable before it lands, and a
  // tick then takes no pages (found 2026-10-19, reported; not this fixture's subject).
  const sized = page.waitForResponse((r) => r.url().includes("/file/page-sizes") && r.status() === 200, { timeout: 20000 });
  if (first) {
    await page.locator("[data-add-sheets]").click({ timeout: 20000 });
    await page.getByRole("menuitem", { name: "Add Pages" }).click();
  } else {
    await page.locator("[data-add-sheets-empty]").click({ timeout: 20000 });
  }
  await dialog(page).waitFor({ timeout: 15000 });
  await dialog(page).locator("[data-load-tree] [data-load-file], [data-load-empty]").first().waitFor({ timeout: 15000 });
  await sized;
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
      sheetsAt[partly.uuid] = loaded.body.sheets[0].uuid;
      return "Files: 4 files · Partly: Set A page 1 in takeoff";
    },
  },
  {
    title: "AC1: the root is open; ticking Plans ticks every eligible file beneath it and part-ticks the root",
    run: async ({ page }) => {
      await openDialog(page, files);
      await folder(page, "Plans").waitFor();
      await row(page, "Site.png").waitFor();
      // Every folder is open from the start (D-310, D-313): Set B in Addenda is in view.
      await row(page, "Set B.pdf").waitFor();
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
    title: "AC2: a .docx is greyed \"unsupported type\"; a PDF already in takeoff can still be picked, its loaded page locked",
    run: async ({ page }) => {
      await openDialog(page, partly);
      const docx = row(page, "Notes.docx");
      await docx.waitFor();
      expect(await docx.getByRole("checkbox").isDisabled(), "the .docx can be ticked");
      await docx.getByText("unsupported type").waitFor();
      const setA = row(page, "Set A.pdf");
      expect(!(await setA.getByRole("checkbox").isDisabled()), "a file in takeoff cannot be picked again");
      // Its pages on the right (D-310 1): page 1 loaded, ticked and locked; 2 and 3 offered.
      await setA.getByText("Set A.pdf", { exact: true }).click();
      const section = dialog(page).locator('[data-page-file="Set A.pdf"]');
      const box = (n) => section.locator(`[data-page="${n}"]`).getByRole("checkbox");
      await box(3).waitFor({ timeout: 20000 });
      expect((await box(1).isChecked()) && (await box(1).isDisabled()), "page 1 is not ticked and locked");
      await section.locator('[data-page="1"]').getByText("loaded").waitFor();
      expect(!(await box(2).isDisabled()) && !(await box(3).isDisabled()), "pages 2 and 3 are locked");
      return "Notes.docx disabled, unsupported type · Set A.pdf still pickable: page 1 loaded and locked, 2 and 3 offered";
    },
  },
  // AC3 (the footer "1 already in takeoff · 1 unsupported", and "Open project files" to Project
  // Home) is dropped: the footer went with the two-step dialog (D-310 1), Project Home with D-315.
  {
    title: "AC4: Load counts what is ticked, and with nothing ticked it is disabled",
    run: async ({ page }) => {
      await openDialog(page, files);
      const load = dialog(page).locator("[data-load-pages]");
      await load.waitFor();
      // Add sheets starts with nothing ticked (D-310 2).
      const none = (await load.textContent()).trim();
      expect(none === "Load 0 pages" && (await load.isDisabled()), `with none: ${none}`);
      await row(page, "Site.png").getByRole("checkbox").check();
      await folder(page, "Plans").getByRole("checkbox").check();
      const ticked = await dialog(page).locator('[data-load-file][data-tick="all"]').count();
      expect(ticked === 3, `${ticked} files ticked, not 3`);
      // Three files: Site.png (1) and Set A and Set B (2 pages each), counted as pages (D-310 1).
      const three = (await load.textContent()).trim();
      expect(three === "Load 5 pages", `with three files: ${three}`);
      expect(!(await load.isDisabled()), "enabled with three");
      return `"${none}" disabled → 3 files ticked, "${three}"`;
    },
  },
  {
    title: "AC5: a project with no files says so",
    run: async ({ page }) => {
      await openDialog(page, bare);
      await dialog(page).getByText("No files yet. Upload files here, or use the Upload drawing tab.").waitFor();
      return "No files yet. Upload files here, or use the Upload drawing tab.";
    },
  },
]);

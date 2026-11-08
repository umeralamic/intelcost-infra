// F5-S8: Add sheets, the same screen, not first run.
//
//   docker compose --profile browser run --rm browser node scripts/f5-s8.mjs
//
// "Partly": Four.pdf in Plans with pages 1 and 2 loaded. "Nothing": Four.pdf, nothing
// loaded.
//
// Updated 2026-10-19 to today's screens (D-619). What changed, and the decision behind it:
// - On a sheet, Add sheets is the Sheets panel's + → Add Pages (legacy's menu, C14; D-313): the
//   canvas bar has no Add sheets button.
// - One screen, not two steps (D-310 1): no "Choose pages" button and no "Open Plans" click
//   (every folder is open); Four.pdf is ticked in the tree and put in focus, its pages on the
//   right. AC1 also reads the screen's start: Add sheets starts with nothing ticked (D-310 2).
// - "Added 1 page" is gone: Load opens the progress view (D-321, D-322), which closes itself on
//   the sheet when it is ready.
// - The sizes are waited for (the api's page-sizes) before a tick: a tick takes the pages the
//   sizes say (D-310 2, 3).

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, sheetsOf, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S8 add");
const partly = await makeProject(token, base, { name: "Partly" });
const nothing = await makeProject(token, base, { name: "Nothing" });
let firstSheet;

/** The load screen: the one dialog that carries the tree and the pages (D-310). */
const dialog = (page) => page.getByRole("dialog").filter({ has: page.locator("[data-load-dialog]") });

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

/** On Partly's first sheet, the Sheets panel's + → Add Pages. */
async function addSheets(page) {
  await measured(partly);
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${partly.uuid}/takeoff/${firstSheet.uuid}`);
  // The screen's own sizes answer, before any tick: the tree is tickable before it lands, and a
  // tick then takes no pages (found 2026-10-19, reported; not this fixture's subject).
  const sized = page.waitForResponse((r) => r.url().includes("/file/page-sizes") && r.status() === 200, { timeout: 20000 });
  await page.locator("[data-add-sheets]").click({ timeout: 20000 });
  await page.getByRole("menuitem", { name: "Add Pages" }).click();
  await sized;
}

await run("f5-s8", [
  {
    title: "setup: Four.pdf in both, pages 1 and 2 loaded in Partly",
    run: async ({ page }) => {
      const a = await uploadAll(page, token, base, partly.uuid, [{ name: "Four.pdf", buffer: makePdf(letterPages(4, "Four")), folder: "Plans" }], workspace.uuid);
      await uploadAll(page, token, base, nothing.uuid, [{ name: "Four.pdf", buffer: makePdf(letterPages(4, "Four")), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, partly.uuid, [[a["Four.pdf"].uuid, [1, 2]]]);
      firstSheet = loaded.body.sheets[0];
      return "Partly: pages 1, 2 in takeoff · Nothing: none";
    },
  },
  {
    title: "AC1: Add sheets on the takeoff page opens the same screen titled \"Add sheets\", with no Skip, nothing ticked",
    run: async ({ page }) => {
      await addSheets(page);
      await page.getByRole("dialog", { name: "Add sheets" }).waitFor({ timeout: 15000 });
      await dialog(page).locator('[data-load-dialog="add"]').waitFor();
      expect((await dialog(page).getByRole("button", { name: "Skip" }).count()) === 0, "a Skip outside the first run");
      expect((await dialog(page).getByText("you'll only be asked once").count()) === 0, "the first-run sentence");
      await dialog(page).getByRole("button", { name: "Cancel" }).waitFor();
      const load = dialog(page).locator("[data-load-pages]");
      const label = (await load.textContent()).trim();
      expect(label === "Load 0 pages" && (await load.isDisabled()), `the screen starts with "${label}"`);
      return `"Add sheets", Cancel and "${label}" (disabled), no Skip`;
    },
  },
  {
    title: "AC2: a file already loaded offers only its unloaded pages as new; loading one adds one sheet",
    run: async ({ page }) => {
      await addSheets(page);
      const row = dialog(page).locator('[data-load-file="Four.pdf"]');
      await row.getByRole("checkbox").check({ timeout: 15000 });
      await row.getByText("Four.pdf", { exact: true }).click();
      const section = dialog(page).locator('[data-page-file="Four.pdf"]');
      await section.waitFor({ timeout: 20000 });
      const box = (n) => section.locator(`[data-page="${n}"]`).getByRole("checkbox");
      await box(4).waitFor({ timeout: 20000 });
      expect((await box(1).isDisabled()) && (await box(2).isDisabled()), "pages 1 and 2 are not locked");
      await box(4).uncheck();
      const label = (await dialog(page).locator("[data-load-pages]").textContent()).trim();
      expect(label === "Load 1 page", `button reads ${label}`);
      for (const tick of ["[data-auto-name]", "[data-auto-scale]"]) {
        if (await dialog(page).locator(tick).isChecked()) await dialog(page).locator(tick).uncheck();
      }
      await dialog(page).locator("[data-load-pages]").click();
      await page.locator('[data-load-progress][data-total="1"]').waitFor({ timeout: 15000 });
      await page.locator("[data-load-progress]").waitFor({ state: "detached", timeout: 120000 });
      const pages = (await sheetsOf(token, base, partly.uuid)).map((s) => s.page_number).sort().join();
      expect(pages === "1,2,3", `sheets for pages ${pages}`);
      return "1 and 2 locked · \"Load 1 page\" · the progress view on 1 sheet, closed · sheets 1, 2, 3";
    },
  },
  {
    title: "AC3: the empty state's Add sheets opens it too",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      await enterWorkspace(page, workspace.uuid);
      await page.goto(`${APP}/project/${nothing.uuid}/takeoff`);
      await page.getByRole("heading", { name: "No sheets yet" }).waitFor({ timeout: 15000 });
      await page.getByRole("button", { name: "Add sheets" }).click();
      await page.getByRole("dialog", { name: "Add sheets" }).waitFor({ timeout: 15000 });
      await dialog(page).locator('[data-load-file="Four.pdf"], [data-load-folder="Plans"]').first().waitFor();
      return "the empty state's Add sheets opens \"Add sheets\"";
    },
  },
]);

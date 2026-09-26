// F5-S8: Add sheets, the same dialog, not first run.
//
//   docker compose --profile browser run --rm browser node scripts/f5-s8.mjs
//
// "Partly": Four.pdf in Plans with pages 1 and 2 loaded. "Nothing": Four.pdf, nothing
// loaded. The sheets panel's "+" is Block D's; until then Add sheets is on the canvas bar
// and on the empty state.

import { APP, expect, run, SEEDED, signInAs, fixtureOwner } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, sheetsOf, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S8 add");
const partly = await makeProject(token, base, { name: "Partly" });
const nothing = await makeProject(token, base, { name: "Nothing" });
let firstSheet;

const dialog = (page) => page.getByRole("dialog");

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
    title: "AC1: Add sheets on the takeoff page opens the same dialog titled \"Add sheets\", with no Skip",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
      await page.goto(`${APP}/project/${partly.uuid}/takeoff/${firstSheet.uuid}`);
      await page.getByRole("button", { name: "Add sheets" }).click();
      await page.getByRole("dialog", { name: "Add sheets" }).waitFor({ timeout: 15000 });
      expect((await dialog(page).getByRole("button", { name: "Skip" }).count()) === 0, "a Skip outside the first run");
      expect((await dialog(page).getByText("you'll only be asked once").count()) === 0, "the first-run sentence");
      return "\"Add sheets\", Cancel and Choose pages, no Skip";
    },
  },
  {
    title: "AC2: a file already loaded offers only its unloaded pages as new; loading one adds one sheet",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
      await page.goto(`${APP}/project/${partly.uuid}/takeoff/${firstSheet.uuid}`);
      await page.getByRole("button", { name: "Add sheets" }).click();
      await dialog(page).locator('[data-load-folder="Plans"]').getByRole("button", { name: "Open Plans" }).click();
      await dialog(page).locator('[data-load-file="Four.pdf"]').getByRole("checkbox").check();
      await dialog(page).getByRole("button", { name: /^Choose pages/ }).click();
      const section = dialog(page).locator('[data-page-file="Four.pdf"]');
      await section.waitFor({ timeout: 20000 });
      const box = (n) => section.locator(`[data-page="${n}"]`).getByRole("checkbox");
      expect((await box(1).isDisabled()) && (await box(2).isDisabled()), "pages 1 and 2 are not locked");
      await box(4).uncheck();
      const label = (await dialog(page).locator("[data-load-pages]").textContent()).trim();
      expect(label === "Load 1 page", `button reads ${label}`);
      await dialog(page).locator("[data-load-pages]").click();
      await page.getByText("Added 1 page").waitFor({ timeout: 15000 });
      const pages = (await sheetsOf(token, base, partly.uuid)).map((s) => s.page_number).sort().join();
      expect(pages === "1,2,3", `sheets for pages ${pages}`);
      return "1 and 2 locked · \"Load 1 page\" · Added 1 page · sheets 1, 2, 3";
    },
  },
  {
    title: "AC3: the empty state's Add sheets opens it too",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
      await page.goto(`${APP}/project/${nothing.uuid}/takeoff`);
      await page.getByRole("heading", { name: "No sheets yet" }).waitFor({ timeout: 15000 });
      await page.getByRole("button", { name: "Add sheets" }).click();
      await page.getByRole("dialog", { name: "Add sheets" }).waitFor({ timeout: 15000 });
      await dialog(page).locator('[data-load-file="Four.pdf"], [data-load-folder="Plans"]').first().waitFor();
      return "the empty state's Add sheets opens \"Add sheets\"";
    },
  },
]);

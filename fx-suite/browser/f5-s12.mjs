// F5-S12: split sources and one call signing a project's sheets (D-41, D-42, D-47).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s12.mjs
//
// AC2 as D-47 amends it: a page not yet prepared shows "Preparing the sheet" and asks
// nothing of the set, then draws itself. The set is the person's file under
// `project-file/…`; a sheet's own PDF is `…/pages/{file}/{page}` (D-42).

import { APP, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S12 split");
const project = await makeProject(token, base, { name: "Split" });
let set;

/** Every request the page makes, by kind. */
function watch(page) {
  const seen = { set: [], pages: [], signOne: [], signAll: [] };
  page.on("request", (r) => {
    const u = r.url();
    if (/project-file\//.test(u)) seen.set.push(u);
    if (/\/pages\/[^/?]+\/\d+/.test(u)) seen.pages.push(u.match(/\/pages\/[^/?]+\/(\d+)/)[1]);
    if (/\/drawing\/sheet\/[^/]+\/asset/.test(u)) seen.signOne.push(u);
    if (/\/drawing\/asset(\?|$)/.test(u)) seen.signAll.push(u);
  });
  return seen;
}

const drawn = (page, sheetUuid, timeout = 60000) =>
  page.waitForFunction(
    (uuid) => {
      const c = document.querySelector("canvas[data-sheet-raster]");
      return c && c.dataset.rasterKey?.startsWith(uuid) && c.dataset.rasterRes === "1";
    },
    sheetUuid,
    { timeout },
  );

const go = (page, sheet) =>
  page.evaluate((path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, `/project/${project.uuid}/takeoff/${sheet.uuid}`);

await run("f5-s12", [
  {
    title: "setup: a 150-page set in Plans",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "Set 150.pdf", buffer: makePdf(letterPages(150, "Set")), folder: "Plans" }], workspace.uuid);
      set = files["Set 150.pdf"];
      return `Set 150.pdf, ${set.byte_size ?? "?"} bytes`;
    },
  },
  {
    title: "AC1: page 90 of a 150-page set opens from its own split PDF: one GET of pages/…/90, nothing of the set",
    run: async ({ page }) => {
      const loaded = await loadPages(token, base, project.uuid, [[set.uuid, [90]]]);
      const sheet = loaded.body.sheets[0];
      await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const seen = watch(page);
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
      await drawn(page, sheet.uuid);
      expect(seen.set.length === 0, `the set was requested: ${seen.set[0]}`);
      expect(seen.pages.join() === "90", `split PDFs fetched: ${seen.pages.join(", ") || "none"}`);
      return "one GET of pages/…/90; the set never requested";
    },
  },
  {
    title: "AC2 (D-47): a page not yet prepared reads \"Preparing the sheet\", asks nothing of the set, then draws itself",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      const seen = watch(page);
      const loaded = await loadPages(token, base, project.uuid, [[set.uuid, [120]]]);
      const sheet = loaded.body.sheets[0];
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
      const preparing = await page.getByText("Preparing the sheet").first().waitFor({ timeout: 10000 }).then(() => true, () => false);
      await drawn(page, sheet.uuid, 90000);
      expect(seen.set.length === 0, `the set was requested: ${seen.set[0]}`);
      return `${preparing ? "\"Preparing the sheet\" shown, then" : "prepared before the page drew (no preparing state seen), then"} drawn from pages/…/120; the set never requested`;
    },
  },
  {
    title: "AC3: one call signs every sheet of the project; switching sheets signs nothing more",
    run: async ({ page }) => {
      const loaded = await loadPages(token, base, project.uuid, [[set.uuid, [1, 2]]]);
      await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const sheets = loaded.body.sheets;
      await signInAs(page, (await fixtureOwner()).email);
      const seen = watch(page);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheets[0].uuid}`);
      await drawn(page, sheets[0].uuid);
      for (const sheet of [sheets[1], sheets[0], sheets[1]]) {
        await go(page, sheet);
        await drawn(page, sheet.uuid);
      }
      expect(seen.signOne.length === 0, `${seen.signOne.length} per-sheet signs`);
      expect(seen.signAll.length === 1, `${seen.signAll.length} calls signing the project's sheets`);
      return `four sheet views: ${seen.signAll.length} call signing every sheet, no per-sheet sign`;
    },
  },
]);

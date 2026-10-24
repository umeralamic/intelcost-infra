// F5-S4: Perform Takeoff, one decision (legacy's resolveTakeoffEntry), from the dashboard
// row's ruler and from Project Home's button. Carries F4-S13, whose fixture it replaces.
//
//   docker compose --profile browser run --rm browser node scripts/f5-s4.mjs
//
// A workspace of this run's own with three projects: "Has sheets" (a page loaded), "Has
// files" (a PDF in Plans, nothing loaded) and "Empty" (no files at all).
//
// Updated 2026-10-24 (D-314, D-315, D-310, D-311):
// - AC1-AC3: the dashboard row's ruler is gone (D-314 2: "the ruler icon (the row and Takeoff do
//   it)"); a project is opened by a click on its row in the All projects dialog, through the same
//   one decision (`useOpenProject` then `takeoffEntry`). The list opens over Account settings, not
//   Home: Home reopens the last project (D-311 1), and Has files would ask on its own there.
// - AC1: the first-run screen's sentence is the one load screen's, "Drawing-size pages are ticked.
//   Untick any you don't need — you can add more later." (D-310 1, preselected by page size).
// - AC2: the "next Perform Takeoff" is the row again; Project Home's Perform Takeoff went with the
//   page (D-315 C5, `PerformTakeoffButton` deleted).
// - Step 6 retired: AC4 (F4-S13 AC3), Project Home's Perform Takeoff agreeing with the ruler and a
//   double press navigating once, was removed by D-315 C5 (the project page and its button are
//   deleted) and D-314 2 (the ruler is gone); the row and the Open menu share one decision.

import { APP, expect, quietFor, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S4 entry");
const withSheets = await makeProject(token, base, { name: "Has sheets" });
const withFiles = await makeProject(token, base, { name: "Has files" });
const empty = await makeProject(token, base, { name: "Empty" });
let sheet;

const FIRST_RUN = "Load project files into takeoff";
const firstRun = (page) => page.getByRole("dialog", { name: FIRST_RUN });

/** All projects over Account settings, then a click on the project's row (D-314 2). */
async function performTakeoff(page, name, { signedIn = false } = {}) {
  if (signedIn) {
    // Already signed in, in this workspace: the list opens again without the login page.
    await page.goto(`${APP}/settings/account?projects=open`);
    await page.getByRole("dialog", { name: "All projects" }).getByRole("tab", { name: /^All/ }).first().click();
  } else await openDashboard(page, workspace.uuid, undefined, "/?tab=all", { over: "/settings/account" });
  await page.getByRole("dialog", { name: "All projects" }).locator(`li[data-project="${name}"]`).getByText(name, { exact: true }).click();
}

await run("f5-s4", [
  {
    title: "setup: a loaded page in Has sheets, a PDF (not loaded) in Has files",
    run: async ({ page }) => {
      const a = await uploadAll(page, token, base, withSheets.uuid, [
        { name: "A.pdf", buffer: makePdf(letterPages(2, "A")), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, withSheets.uuid, [[a["A.pdf"].uuid, [1]]]);
      sheet = loaded.body.sheets[0];
      await uploadAll(page, token, base, withFiles.uuid, [
        { name: "B.pdf", buffer: makePdf(letterPages(2, "B")), folder: "Plans" },
      ], workspace.uuid);
      return "Has sheets: Page 1 loaded · Has files: B.pdf in Plans";
    },
  },
  {
    title: "AC1: Has files, from its row (D-314): takeoff opens and asks Load project files into takeoff",
    run: async ({ page }) => {
      await performTakeoff(page, "Has files");
      await page.waitForURL(new RegExp(`/project/${withFiles.uuid}/takeoff$`), { timeout: 15000 });
      await firstRun(page).waitFor({ timeout: 15000 });
      await page.getByText("Drawing-size pages are ticked. Untick any you don't need — you can add more later.").waitFor();
      expect((await firstRun(page).getByRole("button", { name: "Skip" }).count()) === 1, "no Skip on first run");
      return "/project/…/takeoff, the first-run dialog with its sentence and Skip";
    },
  },
  {
    title: "AC2: Skip leaves No sheets yet; a refresh does not ask again; the next Perform Takeoff asks again (D-36 Q2)",
    run: async ({ page }) => {
      await performTakeoff(page, "Has files");
      await firstRun(page).waitFor({ timeout: 15000 });
      await firstRun(page).getByRole("button", { name: "Skip" }).click();
      await page.getByRole("heading", { name: "No sheets yet" }).waitFor();
      await page.reload();
      await page.getByRole("heading", { name: "No sheets yet" }).waitFor({ timeout: 15000 });
      await quietFor(1000); // the dialog must not come back
      expect((await firstRun(page).count()) === 0, "a refresh asked again");
      await performTakeoff(page, "Has files", { signedIn: true });
      await firstRun(page).waitFor({ timeout: 15000 });
      return "Skip → No sheets yet · refresh: no dialog · opened again from its row: asked again (nothing was loaded)";
    },
  },
  {
    title: "AC2: once a page is loaded, Perform Takeoff opens it and never asks",
    run: async ({ page }) => {
      await performTakeoff(page, "Has sheets");
      await page.waitForURL(new RegExp(`/project/${withSheets.uuid}/takeoff/${sheet.uuid}$`), { timeout: 15000 });
      await quietFor(1000); // the dialog must not open
      expect((await firstRun(page).count()) === 0, "asked on a project with sheets");
      return `opened on Page 1 (${sheet.uuid.slice(0, 8)}…), no dialog`;
    },
  },
  {
    title: "AC3: Empty opens takeoff empty: No sheets yet, Add sheets, no dialog",
    run: async ({ page }) => {
      await performTakeoff(page, "Empty");
      await page.waitForURL(new RegExp(`/project/${empty.uuid}/takeoff$`), { timeout: 15000 });
      await page.getByRole("heading", { name: "No sheets yet" }).waitFor();
      await page.getByRole("button", { name: "Add sheets" }).waitFor();
      expect((await firstRun(page).count()) === 0, "asked on a project with no files");
      expect((await page.getByText("Page not found").count()) === 0, "a 404");
      return "No sheets yet, Add sheets, no first-run dialog";
    },
  },
]);

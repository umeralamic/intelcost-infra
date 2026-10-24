// F5-S4: Perform Takeoff, one decision (legacy's resolveTakeoffEntry), from the dashboard
// row's ruler and from Project Home's button. Carries F4-S13, whose fixture it replaces.
//
//   docker compose --profile browser run --rm browser node scripts/f5-s4.mjs
//
// A workspace of this run's own with three projects: "Has sheets" (a page loaded), "Has
// files" (a PDF in Plans, nothing loaded) and "Empty" (no files at all).

import { APP, apiCall, expect, quietFor, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S4 entry");
const withSheets = await makeProject(token, base, { name: "Has sheets" });
const withFiles = await makeProject(token, base, { name: "Has files" });
const empty = await makeProject(token, base, { name: "Empty" });
let sheet;

const FIRST_RUN = "Load project files into takeoff";
const firstRun = (page) => page.getByRole("dialog", { name: FIRST_RUN });

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
    title: "AC1: Has files, from the ruler: takeoff opens and asks Load project files into takeoff",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await page.getByRole("button", { name: "Perform takeoff for Has files" }).click();
      await page.waitForURL(new RegExp(`/project/${withFiles.uuid}/takeoff$`), { timeout: 15000 });
      await firstRun(page).waitFor({ timeout: 15000 });
      await page.getByText("This project has no drawings in takeoff yet. Pick the folders and drawings to open — you'll only be asked once.").waitFor();
      expect((await firstRun(page).getByRole("button", { name: "Skip" }).count()) === 1, "no Skip on first run");
      return "/project/…/takeoff, the first-run dialog with its sentence and Skip";
    },
  },
  {
    title: "AC2: Skip leaves No sheets yet; a refresh does not ask again; the next Perform Takeoff asks again (D-36 Q2)",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await page.getByRole("button", { name: "Perform takeoff for Has files" }).click();
      await firstRun(page).waitFor({ timeout: 15000 });
      await firstRun(page).getByRole("button", { name: "Skip" }).click();
      await page.getByRole("heading", { name: "No sheets yet" }).waitFor();
      await page.reload();
      await page.getByRole("heading", { name: "No sheets yet" }).waitFor({ timeout: 15000 });
      await quietFor(1000); // the dialog must not come back
      expect((await firstRun(page).count()) === 0, "a refresh asked again");
      await page.goto(`${APP}/project/${withFiles.uuid}`);
      await page.getByRole("button", { name: "Perform Takeoff" }).click();
      await firstRun(page).waitFor({ timeout: 15000 });
      return "Skip → No sheets yet · refresh: no dialog · Perform Takeoff again: asked again (nothing was loaded)";
    },
  },
  {
    title: "AC2: once a page is loaded, Perform Takeoff opens it and never asks",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await page.getByRole("button", { name: "Perform takeoff for Has sheets" }).click();
      await page.waitForURL(new RegExp(`/project/${withSheets.uuid}/takeoff/${sheet.uuid}$`), { timeout: 15000 });
      await quietFor(1000); // the dialog must not open
      expect((await firstRun(page).count()) === 0, "asked on a project with sheets");
      return `opened on Page 1 (${sheet.uuid.slice(0, 8)}…), no dialog`;
    },
  },
  {
    title: "AC3: Empty opens takeoff empty: No sheets yet, Add sheets, no dialog",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await page.getByRole("button", { name: "Perform takeoff for Empty" }).click();
      await page.waitForURL(new RegExp(`/project/${empty.uuid}/takeoff$`), { timeout: 15000 });
      await page.getByRole("heading", { name: "No sheets yet" }).waitFor();
      await page.getByRole("button", { name: "Add sheets" }).waitFor();
      expect((await firstRun(page).count()) === 0, "asked on a project with no files");
      expect((await page.getByText("Page not found").count()) === 0, "a 404");
      return "No sheets yet, Add sheets, no first-run dialog";
    },
  },
  {
    title: "AC4 (F4-S13 AC3): Project Home's button agrees with the ruler in every case; a double press navigates once",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      const cases = [
        [withSheets, new RegExp(`/takeoff/${sheet.uuid}$`)],
        [withFiles, /\/takeoff$/],
        [empty, /\/takeoff$/],
      ];
      for (const [project, where] of cases) {
        await page.goto(`${APP}/project/${project.uuid}`);
        const button = page.getByRole("button", { name: "Perform Takeoff" });
        await button.waitFor({ timeout: 15000 });
        const before = await page.evaluate(() => history.length);
        await button.dblclick();
        await page.waitForURL(where, { timeout: 15000 });
        const after = await page.evaluate(() => history.length);
        expect(after - before <= 1, `${project.name}: history grew by ${after - before}`);
      }
      const bodies = await Promise.all(
        [withSheets, withFiles, empty].map((p) => apiCall(token, "GET", `${base}/${p.uuid}/drawing/sheet`)),
      );
      return `the same three destinations as the ruler; sheets ${bodies.map((b) => b.body.length).join("/")}; one navigation per double press`;
    },
  },
]);

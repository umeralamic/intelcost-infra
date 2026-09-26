// D-37: a link opens in its own workspace. The app switches to the linked project's
// workspace when the person is a member there; "Project not found" only to someone who
// truly cannot see it.
//
//   docker compose --profile browser run --rm browser node scripts/d37-links.mjs
//
// This run's own account owns two workspaces, "D37 Home" and "D37 Away". "Loaded" is in
// Away, with a page loaded into takeoff. Every step starts with Home active, as a
// colleague's pasted link finds it.

import { APP, SEEDED, apiCall, apiLogin, apiRegister, createWorkspace, discardProject, expect, ownWorkspace, run, signInAs } from "./lib/bench.mjs";
import { makeProject } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";

const { owner, token, workspace: home } = await ownWorkspace(`D37 Home ${Date.now()}`);
const away = await createWorkspace(token, `D37 Away ${Date.now()}`);
const awayBase = `/api/workspace/${away.uuid}/project`;
const project = await makeProject(token, awayBase, { name: "Loaded" });
let sheet;

const switcher = async (page) => {
  await page.locator("header select").waitFor({ timeout: 20000 });
  return page.$eval("header select", (s) => s.value);
};
const startIn = (page, workspaceUuid) =>
  page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspaceUuid);

await run("d37-links", [
  {
    title: "setup: a page of a PDF loaded into takeoff in Away",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, awayBase, project.uuid, [
        { name: "Set.pdf", buffer: makePdf(letterPages(1, "Away")), folder: "Plans" },
      ], away.uuid);
      const loaded = await loadPages(token, awayBase, project.uuid, [[files["Set.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, awayBase, project.uuid, loaded.body.files[0].file_uuid);
      return `Loaded, Page 1 prepared, in ${away.name}`;
    },
  },
  {
    title: "AC1: with Home active, a link to Loaded's Project Home switches to Away and opens it",
    run: async ({ page }) => {
      await startIn(page, home.uuid);
      await signInAs(page, owner.email, SEEDED.password);
      expect((await switcher(page)) === home.uuid, "did not start in Home");
      await page.goto(`${APP}/project/${project.uuid}`);
      await page.getByRole("heading", { name: "Loaded" }).waitFor({ timeout: 20000 });
      expect((await page.locator("[data-not-found]").count()) === 0, "Project not found was shown");
      expect((await switcher(page)) === away.uuid, "the switcher did not move to Away");
      const stored = await page.evaluate(() => localStorage.getItem("intelcost.workspace"));
      expect(stored === away.uuid, "the switch was not kept");
      return "Project Home drawn, the switcher on Away, kept for the next load";
    },
  },
  {
    title: "AC2: with Home active, a link to Loaded's sheet switches to Away and draws the sheet",
    run: async ({ page }) => {
      await startIn(page, home.uuid);
      await signInAs(page, owner.email, SEEDED.password);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
      await page.locator('img[alt="Drawing sheet"]').waitFor({ timeout: 20000 });
      expect((await switcher(page)) === away.uuid, "the switcher did not move to Away");
      return "the sheet drawn, the switcher on Away";
    },
  },
  {
    title: "AC3: someone with no seat in Away gets Project not found, and the api tells them nothing",
    run: async ({ page }) => {
      const email = `d37-stranger-${Date.now()}@bench.intelcost.io`;
      await apiRegister(email, SEEDED.password, "D37 Stranger");
      const stranger = await apiLogin(email, SEEDED.password);
      await createWorkspace(stranger, `D37 Stranger ${Date.now()}`);
      const theirs = await apiCall(stranger, "GET", `/api/resolve/project/${project.uuid}`);
      const nothing = await apiCall(stranger, "GET", `/api/resolve/project/${crypto.randomUUID()}`);
      expect(theirs.status === 404 && nothing.status === 404, `resolve: ${theirs.status}, ${nothing.status}`);
      expect(JSON.stringify(theirs.body) === JSON.stringify(nothing.body), "a real project and none answer differently");

      await signInAs(page, email, SEEDED.password);
      await page.goto(`${APP}/project/${project.uuid}`);
      await page.locator("[data-not-found]").getByText("Project not found").waitFor({ timeout: 20000 });
      return `Project not found; resolve says the same 404 for it as for a made-up uuid: "${theirs.body.detail}"`;
    },
  },
  {
    title: "A link to a project that does not exist still says Project not found, with no switch",
    run: async ({ page }) => {
      await startIn(page, home.uuid);
      await signInAs(page, owner.email, SEEDED.password);
      await page.goto(`${APP}/project/${crypto.randomUUID()}`);
      await page.locator("[data-not-found]").getByText("Project not found").waitFor({ timeout: 20000 });
      expect((await switcher(page)) === home.uuid, "a dead link moved the switcher");
      return "Project not found, still in Home";
    },
  },
  {
    title: "The resolver answers every link-able kind built so far: project, sheet (items join with F7)",
    run: async () => {
      const bySheet = await apiCall(token, "GET", `/api/resolve/sheet/${sheet.uuid}`);
      const byProject = await apiCall(token, "GET", `/api/resolve/project/${project.uuid}`);
      expect(bySheet.status === 200 && bySheet.body.workspace_uuid === away.uuid, `sheet: ${JSON.stringify(bySheet.body)}`);
      expect(bySheet.body.project_uuid === project.uuid, "the sheet named the wrong project");
      expect(byProject.body.workspace_uuid === away.uuid, `project: ${JSON.stringify(byProject.body)}`);
      const bad = await apiCall(token, "GET", `/api/resolve/estimate/${project.uuid}`);
      expect(bad.status === 422, `an unknown kind gave ${bad.status}`);
      return "sheet and project resolve to Away; an unknown kind is refused 422";
    },
  },
]);

await discardProject(token, away.uuid, project.uuid);

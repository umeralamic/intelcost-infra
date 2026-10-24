// F4-S6, as D-31 left it: the dashboard shows projects only. No Team members, Pending
// invitations or Invite teammates panels, no "Brand your bid proposals" nudge, and the
// subtitle reads "Your projects." Those live in Settings > Members and Settings > General.
// The tab strip is centred, and there is no Customize tabs button.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s6.mjs
//
// Updated 2026-10-24 (D-314, D-87):
// - AC1/AC3, AC4: the projects list is the All projects dialog (D-314 2), so every "absent" check
//   reads inside it. Its heading "<workspace>" and subtitle "Your projects." were dropped by D-314 2
//   ("the dialog is titled All projects"): the subtitle check is now that title, and the old
//   subtitle "Your projects and your team." is still absent. The headings read are the dialog's:
//   one, "All projects", where the page had two ending "Projects". The strip is the dialog's
//   "Project status" tabs, centred as before. A Reports card is still absent from the list; Reports
//   is in the avatar menu (D-314 1).
// - AC2: Settings › Members is legacy's "Members & Roles" card, and General's details card is
//   "Workspace name" (D-87), in place of "In this workspace" and "Details". Invitations
//   ("Invited, not joined") and the Logo are where they were.

import { APP, expect, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, openDashboard } from "./lib/f4.mjs";

const { token, workspace } = await freshWorkspace("F4-S6 projects only");
const estimator = await seatedMember(token, workspace.uuid, "estimator", "f4s6");

const GONE = ["Team members", "Pending invitations", "Invite teammates", "Brand your bid proposals"];

const listOf = (page) => page.getByRole("dialog", { name: "All projects" });

/** The list's sections and headings, by their words. */
const headings = (page) =>
  listOf(page).locator("h1, h2").evaluateAll((els) => els.map((el) => el.textContent.trim()));

/** Every removed panel is absent, by its words and by its old markers. */
async function onlyProjects(page) {
  const list = listOf(page);
  await list.getByRole("tablist", { name: "Project status" }).waitFor();
  for (const words of GONE) {
    expect((await list.getByText(words, { exact: true }).count()) === 0, `"${words}" is still drawn`);
  }
  expect((await list.locator("[data-team-panels], [data-branding-nudge]").count()) === 0, "an old panel marker remains");
  // The page's "Your projects." went with its heading (D-314 2): the dialog is titled All projects.
  await page.getByRole("dialog", { name: "All projects", exact: true }).waitFor();
  expect((await list.getByText("Your projects and your team.").count()) === 0, "the old subtitle remains");
}

await run("f4-s6", [
  {
    title: "AC1/AC3 — owner with no logo: projects only, titled \"All projects\" (D-314), strip centred, no Customize",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await onlyProjects(page);
      const read = await headings(page);
      expect(read.length === 1 && read[0] === "All projects", `headings: ${read.join(" | ")}`);
      const centred = await listOf(page).getByRole("tablist", { name: "Project status" }).evaluate((el) => getComputedStyle(el.parentElement).justifyContent);
      expect(centred === "center", `strip justify ${centred}`);
      expect((await listOf(page).getByText(/Customize tabs/i).count()) === 0, "a Customize tabs control exists");
      expect((await listOf(page).getByText("Reports", { exact: true }).count()) === 0, "a Reports card is drawn (F15's)");
      return `headings: ${read.join(" | ")} · strip centred`;
    },
  },
  {
    title: "AC2 — members and invitations are in Settings > Members, the logo in Settings > General",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await page.goto(`${APP}/settings/members`);
      await page.getByRole("heading", { name: "Members & Roles" }).waitFor({ timeout: 15000 });
      await page.getByRole("heading", { name: "Invited, not joined" }).waitFor();
      await page.goto(`${APP}/settings/general`);
      await page.getByRole("heading", { name: "Workspace name" }).waitFor({ timeout: 15000 });
      await page.getByRole("heading", { name: "Logo", exact: true }).waitFor();
      return "Members lists both · General holds the logo";
    },
  },
  {
    title: "AC4 — an estimator sees the same projects-only page",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, estimator.email);
      await onlyProjects(page);
      return "no team panels, no nudge";
    },
  },
]);

// F4-S6, as D-31 left it: the dashboard shows projects only. No Team members, Pending
// invitations or Invite teammates panels, no "Brand your bid proposals" nudge, and the
// subtitle reads "Your projects." Those live in Settings > Members and Settings > General.
// The tab strip is centred, and there is no Customize tabs button.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s6.mjs

import { APP, expect, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, openDashboard } from "./lib/f4.mjs";

const { token, workspace } = await freshWorkspace("F4-S6 projects only");
const estimator = await seatedMember(token, workspace.uuid, "estimator", "f4s6");

const GONE = ["Team members", "Pending invitations", "Invite teammates", "Brand your bid proposals"];

/** The dashboard's sections and headings, by their words. */
const headings = (page) =>
  page.locator("h1, h2").evaluateAll((els) => els.map((el) => el.textContent.trim()));

/** Every removed panel is absent, by its words and by its old markers. */
async function onlyProjects(page) {
  for (const words of GONE) {
    expect((await page.getByText(words, { exact: true }).count()) === 0, `"${words}" is still drawn`);
  }
  expect((await page.locator("[data-team-panels], [data-branding-nudge]").count()) === 0, "an old panel marker remains");
  await page.getByText("Your projects.", { exact: true }).waitFor();
  expect((await page.getByText("Your projects and your team.").count()) === 0, "the old subtitle remains");
}

await run("f4-s6", [
  {
    title: "AC1/AC3 — owner with no logo: projects only, subtitle \"Your projects.\", strip centred, no Customize",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await onlyProjects(page);
      const read = await headings(page);
      expect(read.length === 2 && read[1] === "Projects", `headings: ${read.join(" | ")}`);
      const centred = await page.getByRole("tablist").evaluate((el) => getComputedStyle(el.parentElement).justifyContent);
      expect(centred === "center", `strip justify ${centred}`);
      expect((await page.getByText(/Customize tabs/i).count()) === 0, "a Customize tabs control exists");
      expect((await page.getByText("Reports", { exact: true }).count()) === 0, "a Reports card is drawn (F15's)");
      return `headings: ${read.join(" | ")} · strip centred`;
    },
  },
  {
    title: "AC2 — members and invitations are in Settings > Members, the logo in Settings > General",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await page.goto(`${APP}/settings/members`);
      await page.getByRole("heading", { name: "In this workspace" }).waitFor({ timeout: 15000 });
      await page.getByRole("heading", { name: "Invited, not joined" }).waitFor();
      await page.goto(`${APP}/settings/general`);
      await page.getByRole("heading", { name: "Details" }).waitFor({ timeout: 15000 });
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

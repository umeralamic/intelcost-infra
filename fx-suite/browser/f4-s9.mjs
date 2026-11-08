// F4-S9: change a project's status from its row; Lost asks why. With S3's carried half:
// a hidden status leaves the picker and a renamed one is offered by its new name.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s9.mjs

import { APP, apiCall, expect, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard, settle, tabStrip } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S9 status");
const statusPath = `/api/workspace/${workspace.uuid}/project-status`;
const moving = await makeProject(token, base, { name: "Moving job" });
const keeper = await makeProject(token, base, { name: "Change order job" }, "change_order");
const estimator = await seatedMember(token, workspace.uuid, "estimator", "f4s9");
const viewer = await seatedMember(token, workspace.uuid, "viewer", "f4s9");

const picker = (page, project) => page.locator(`[data-status-picker="${project.uuid}"]`);
const read = async (project) => (await apiCall(token, "GET", `${base}/${project.uuid}`)).body;
const count = (strip, label) => strip.find((t) => t.label === label)?.count;

await run("f4-s9", [
  {
    title: "AC1 — Bidding to Submitted from the row: badge, \"Marked Submitted\", and the counts move",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await settle(page);
      const before = count(await tabStrip(page), "Submitted");
      await picker(page, moving).click();
      const menu = page.getByRole("menu");
      const groups = await menu.locator('[role="presentation"]').allInnerTexts();
      expect(groups.join(",").toLowerCase() === "active,closed,workspace", `groups: ${groups}`);
      await menu.getByRole("menuitem", { name: "Submitted" }).click();
      await page.getByText("Marked Submitted").waitFor({ timeout: 10000 });
      await picker(page, moving).getByText("Submitted").waitFor({ timeout: 10000 });
      await settle(page);
      expect(count(await tabStrip(page), "Submitted") === before + 1, "Submitted count did not move");
      expect((await read(moving)).status === "submitted", "api does not read submitted");
      return `Submitted ${before} → ${before + 1}`;
    },
  },
  {
    title: "AC2 — Lost asks why: Cancel changes nothing; Save stores the reason and the note",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await picker(page, moving).click();
      await page.getByRole("menuitem", { name: "Lost" }).click();
      await page.getByRole("dialog", { name: "Mark as Lost" }).waitFor();
      await page.getByText("Capture why so future bids learn from it.").waitFor();
      await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
      expect((await read(moving)).status === "submitted", "Cancel changed the status");

      await picker(page, moving).click();
      await page.getByRole("menuitem", { name: "Lost" }).click();
      await page.selectOption("#lost-reason", "too_high");
      await page.fill("#lost-note", "Came in 12% over the low bid.");
      await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
      await page.getByText("Marked Lost").waitFor({ timeout: 10000 });
      const after = await read(moving);
      expect(after.status === "lost" && after.lost_reason === "too_high", `${after.status}/${after.lost_reason}`);
      expect(after.lost_note === "Came in 12% over the low bid.", `note: ${after.lost_note}`);
      expect(after.description === null, "the note overwrote the description (legacy's bug)");
      return "cancel held · lost, too_high, note in its own column";
    },
  },
  {
    title: "AC3 (carried from S3) — hidden Change Order leaves the picker; its project keeps the badge; renamed Bidding offered by name",
    run: async ({ page }) => {
      await apiCall(token, "PATCH", `${statusPath}/change_order`, { is_hidden: true });
      await apiCall(token, "PATCH", `${statusPath}/bidding`, { label: "Out to bid" });
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      expect(/Change Order/.test(await picker(page, keeper).innerText()), "the keeper lost its badge");
      await picker(page, moving).click();
      const offered = await page.getByRole("menuitem").allInnerTexts();
      expect(!offered.some((o) => /Change Order/.test(o)), `hidden offered: ${offered}`);
      expect(offered.some((o) => /Out to bid/.test(o)), `rename not offered: ${offered}`);
      return `offered: ${offered.join(", ")}`;
    },
  },
  {
    title: "AC4 — owner gets Manage statuses and it opens Settings, Statuses; an estimator does not",
    run: async ({ page, context }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await picker(page, moving).click();
      await page.getByRole("menuitem", { name: "Manage statuses" }).click();
      await page.waitForURL(/\/settings\/statuses$/);

      const second = await context.browser().newContext();
      const p2 = await second.newPage();
      await openDashboard(p2, workspace.uuid, estimator.email, "/?tab=all");
      await picker(p2, moving).click();
      const items = await p2.getByRole("menuitem").allInnerTexts();
      await second.close();
      expect(!items.some((i) => /Manage statuses/.test(i)), `estimator sees ${items}`);
      return "owner lands on /settings/statuses · estimator can change status, not manage";
    },
  },
  {
    title: "AC5 — a viewer sees the badge only, and the api refuses a hand-written change",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, viewer.email, "/?tab=all");
      await page.locator('li[data-project="Moving job"]').waitFor();
      expect((await picker(page, moving).count()) === 0, "viewer has a picker");
      await page.locator('li[data-project="Moving job"]').getByText("Lost").waitFor();
      const refused = await apiCall(viewer.token, "PATCH", `${base}/${moving.uuid}`, { status_key: "won" });
      expect(refused.status === 403, `viewer PATCH: ${refused.status}`);
      return "badge, no menu · api 403";
    },
  },
]);

void APP;

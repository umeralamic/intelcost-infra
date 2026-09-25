// F4-S10: assign members, each shown with their role; the row reads "Primary +N"; a
// removed member reads Unassigned; an admin may assign (legacy's RLS refused admins).
//
//   docker compose --profile browser run --rm browser node scripts/f4-s10.mjs

import { APP, apiCall, expect, members, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S10 assign");
const wsPath = `/api/workspace/${workspace.uuid}`;
const alice = await seatedMember(token, workspace.uuid, "estimator", "f4s10-alice");
const bob = await seatedMember(token, workspace.uuid, "takeoff", "f4s10-bob");
const admin = await seatedMember(token, workspace.uuid, "admin", "f4s10");
const viewer = await seatedMember(token, workspace.uuid, "viewer", "f4s10");
// A second "Bench admin", the founder's four-of-a-name case in miniature.
const twin = await seatedMember(token, workspace.uuid, "admin", "f4s10-twin");
const job = await makeProject(token, base, { name: "Assigned job" });
const twins = await makeProject(token, base, { name: "Twins job" });

// A custom role for Bob, so "Name · Role" is proved with a workspace's own label.
const qa = await apiCall(token, "POST", `${wsPath}/custom-role`, {
  label: "Senior QA",
  capabilities: { canReviewTakeoff: true, canComment: true },
});

const roster = await members(token, workspace.uuid);
const uuidOf = (email) => roster.find((m) => m.email === email).user_uuid;
if (qa.status === 201) {
  await apiCall(token, "PUT", `${wsPath}/member/${uuidOf(bob.email)}/custom-role`, {
    custom_role_uuid: qa.body.uuid,
  });
}

async function openJob(page, email) {
  await openDashboard(page, workspace.uuid, email);
  await page.goto(`${APP}/project/${job.uuid}`);
  await page.getByRole("heading", { name: "Assigned job" }).waitFor({ timeout: 20000 });
}

await run("f4-s10", [
  {
    title: "AC1 — assign Alice and Bob on Project Home: \"Name · Role\" in the list, \"Alice +1\" on the row",
    run: async ({ page }) => {
      await openJob(page);
      await page.locator("#project-assignees").click();
      const options = await page.getByRole("option").allInnerTexts();
      const aliceRow = options.find((o) => o.includes("Bench estimator"));
      expect(aliceRow && /Estimator/.test(aliceRow), `Alice row: ${aliceRow}`);
      const bobRow = options.find((o) => o.includes("Bench takeoff"));
      const bobRole = qa.status === 201 ? "Senior QA" : "Takeoff";
      expect(bobRow && bobRow.includes(bobRole), `Bob row: ${bobRow} (want ${bobRole})`);
      // Each tick saves at once; the chip appearing is the saved answer coming back.
      const chips = page.getByRole("list", { name: "Assigned" });
      await page.getByRole("option", { name: /Bench estimator/ }).locator("input").check();
      await chips.getByText("Bench estimator").waitFor({ timeout: 10000 });
      await page.getByRole("option", { name: /Bench takeoff/ }).locator("input").check();
      await chips.getByText("Bench takeoff").waitFor({ timeout: 10000 });
      const read = (await apiCall(token, "GET", `${base}/${job.uuid}`)).body.assignee_uuids;
      expect(read.join() === [uuidOf(alice.email), uuidOf(bob.email)].join(), `assignees ${read}`);

      await page.goto(`${APP}/?tab=all`);
      const who = await page.locator('li[data-project="Assigned job"] [data-assignees]').innerText();
      expect(/Bench estimator \+1/.test(who), `row reads ${who}`);
      return `options "${aliceRow}", "${bobRow}" · row "${who.trim()}"`;
    },
  },
  {
    title: "AC2 — remove Alice with ×: the row reads Bob",
    run: async ({ page }) => {
      await openJob(page);
      await page.getByRole("button", { name: /Remove Bench estimator/ }).click();
      await page
        .getByRole("list", { name: "Assigned" })
        .getByText("Bench estimator")
        .waitFor({ state: "detached", timeout: 10000 });
      await page.goto(`${APP}/?tab=all`);
      const who = await page.locator('li[data-project="Assigned job"] [data-assignees]').innerText();
      expect(/Bench takeoff/.test(who) && !/\+/.test(who), `row reads ${who}`);
      return `row "${who.trim()}"`;
    },
  },
  {
    title: "AC3 — remove Bob from the workspace: the project reads Unassigned, no error, no uuid",
    run: async ({ page }) => {
      const removed = await apiCall(token, "DELETE", `${wsPath}/member/${uuidOf(bob.email)}`);
      expect(removed.status === 200 || removed.status === 204, `remove Bob: ${removed.status}`);
      const read = (await apiCall(token, "GET", `${base}/${job.uuid}`)).body.assignee_uuids;
      expect(read.length === 0, `still assigned: ${read}`);
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      const who = await page.locator('li[data-project="Assigned job"] [data-assignees]').innerText();
      expect(/Unassigned/.test(who) && !/[0-9a-f]{8}-/.test(who), `row reads ${who}`);
      return "Unassigned";
    },
  },
  {
    title: "AC4/AC5 — an admin can assign (legacy refused); a viewer sees chips with no ×, and a disabled picker",
    run: async ({ page }) => {
      const byAdmin = await apiCall(admin.token, "PUT", `${base}/${job.uuid}/assignee`, {
        user_uuids: [uuidOf(alice.email)],
      });
      expect(byAdmin.status === 200, `admin assign: ${byAdmin.status}`);
      await openJob(page, viewer.email);
      expect(await page.locator("#project-assignees").isDisabled(), "viewer picker enabled");
      expect((await page.getByRole("button", { name: /Remove / }).count()) === 0, "viewer sees ×");
      const refused = await apiCall(viewer.token, "PUT", `${base}/${job.uuid}/assignee`, { user_uuids: [] });
      expect(refused.status === 403, `viewer PUT: ${refused.status}`);
      const outsider = await apiCall(token, "PUT", `${base}/${job.uuid}/assignee`, {
        user_uuids: ["00000000-0000-0000-0000-000000000000"],
      });
      expect(outsider.status === 422, `non-member assign: ${outsider.status}`);
      return "admin 200 · viewer read-only, api 403 · a non-member refused 422";
    },
  },
  {
    title: "Two members named \"Bench admin\": each option shows its email; both chips add the email",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await page.goto(`${APP}/project/${twins.uuid}`);
      await page.getByRole("heading", { name: "Twins job" }).waitFor({ timeout: 20000 });
      await page.locator("#project-assignees").click();
      for (const email of [admin.email, twin.email]) {
        const option = page.locator(`[data-assignee-option="${email}"]`);
        expect((await option.locator("[data-assignee-email]").innerText()) === email, `no email under ${email}`);
      }
      const named = await page.getByRole("option", { name: /Bench admin/ }).count();
      expect(named === 2, `${named} Bench admin options`);
      const chips = page.getByRole("list", { name: "Assigned" });
      await page.locator(`[data-assignee-option="${admin.email}"] input`).check();
      // One of the name: no email yet, nothing to tell apart.
      await chips.locator(`[data-assignee-chip="${admin.email}"]`).waitFor({ timeout: 10000 });
      const alone = await chips.locator(`[data-assignee-chip="${admin.email}"]`).innerText();
      expect(alone.trim() === "Bench admin", `a lone chip reads ${alone}`);
      await page.locator(`[data-assignee-option="${twin.email}"] input`).check();
      await chips.locator(`[data-assignee-chip="${twin.email}"]`).waitFor({ timeout: 10000 });
      const read = await chips.locator("[data-assignee-chip]").allInnerTexts();
      expect(
        read.map((t) => t.trim()).join(" | ") === `Bench admin (${admin.email}) | Bench admin (${twin.email})`,
        `chips: ${read.join(" | ")}`,
      );
      await page.getByRole("button", { name: `Remove Bench admin (${twin.email})` }).waitFor();
      return `options show both emails · chips: ${read.map((t) => t.trim()).join(" | ")}`;
    },
  },
]);

// F4-S10: assign members, each shown with their role; the row reads "Primary +N"; a
// removed member reads Unassigned; an admin may assign (legacy's RLS refused admins).
//
//   docker compose --profile browser run --rm browser node scripts/f4-s10.mjs
//
// Updated 2026-10-24 (D-315, D-314, D-566): Project Home and its own assignee picker are gone
// (D-315 C5): `/project/<uuid>` opens the takeoff with Edit Project over it, whose Assigned To
// (`#edit-project-assignees`, D-315 1) is the picker every step drives.
// AC1, AC2, twins: Edit Project has one Save (D-315 1), so a tick no longer saves on its own:
// the ticks (or the ×) are followed by Save and "Project saved", then the stored list is read.
// AC1, AC2, AC3: the row is read in the All projects dialog (`/?projects=open`, D-314) on its
// All tab, not on a `/?tab=all` page; sign-in lands on Account settings (D-566).
// AC4: the viewer's picker is the Edit Project one, disabled with the rest of the form for a
// seat without Create projects (the dialog's refusal); "no ×" is asserted unchanged.

import { APP, SEEDED, apiCall, enterWorkspace, expect, fixtureOwner, members, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";

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

/** Signed in, on `/project/<uuid>`: the takeoff with Edit Project open (D-315 C5). */
async function openEdit(page, project, email) {
  await signInAs(page, email ?? (await fixtureOwner()).email, SEEDED.password);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}`);
  const dialog = page.getByRole("dialog", { name: /Edit Project/ });
  await dialog.locator(`form[data-edit-project="${project.name}"]`).waitFor({ timeout: 20000 });
  return dialog;
}
const openJob = (page, email) => openEdit(page, job, email);

/** Edit Project's one Save (D-315 1). */
async function save(page, dialog) {
  await dialog.locator("[data-edit-save]").click();
  await page.getByText("Project saved").first().waitFor({ timeout: 15000 });
}

/** The job's row in the All projects dialog (D-314), All tab: its "Assigned" text. */
async function rowAssignees(page) {
  await page.goto(`${APP}/?projects=open`);
  const list = page.getByRole("dialog", { name: "All projects" });
  await list.getByRole("tablist", { name: "Project status" }).waitFor({ timeout: 20000 });
  await list.getByRole("tab", { name: /^All/ }).first().click();
  const cell = list.locator('li[data-project="Assigned job"] [data-assignees]');
  await cell.waitFor({ timeout: 15000 });
  return cell.innerText();
}

await run("f4-s10", [
  {
    title: "AC1 — assign Alice and Bob in Edit Project: \"Name · Role\" in the list, \"Alice +1\" on the row",
    run: async ({ page }) => {
      const dialog = await openJob(page);
      await page.locator("#edit-project-assignees").click();
      // The list fills from the members query: waited for, not read on opening.
      await page.getByRole("option", { name: /Bench takeoff/ }).waitFor({ timeout: 20000 });
      const options = await page.getByRole("option").allInnerTexts();
      const aliceRow = options.find((o) => o.includes("Bench estimator"));
      expect(aliceRow && /Estimator/.test(aliceRow), `Alice row: ${aliceRow}`);
      const bobRow = options.find((o) => o.includes("Bench takeoff"));
      const bobRole = qa.status === 201 ? "Senior QA" : "Takeoff";
      expect(bobRow && bobRow.includes(bobRole), `Bob row: ${bobRow} (want ${bobRole})`);
      const chips = dialog.getByRole("list", { name: "Assigned" });
      await page.getByRole("option", { name: /Bench estimator/ }).locator("input").check();
      await chips.getByText("Bench estimator").waitFor({ timeout: 10000 });
      await page.getByRole("option", { name: /Bench takeoff/ }).locator("input").check();
      await chips.getByText("Bench takeoff").waitFor({ timeout: 10000 });
      // Closed by a click elsewhere in the form, not Escape, which is the dialog's own close.
      await page.locator("#edit-project-name").click();
      await save(page, dialog);
      const want = [uuidOf(alice.email), uuidOf(bob.email)].join();
      let read = [];
      await waitFor(async () => {
        read = (await apiCall(token, "GET", `${base}/${job.uuid}`)).body.assignee_uuids;
        return read.join() === want;
      }, "both assignees stored", 10000).catch(() => {});
      expect(read.join() === [uuidOf(alice.email), uuidOf(bob.email)].join(), `assignees ${read}`);

      const who = await rowAssignees(page);
      expect(/Bench estimator \+1/.test(who), `row reads ${who}`);
      return `options "${aliceRow}", "${bobRow}" · row "${who.trim()}"`;
    },
  },
  {
    title: "AC2 — remove Alice with × and Save: the row reads Bob",
    run: async ({ page }) => {
      const dialog = await openJob(page);
      await dialog.getByRole("button", { name: /Remove Bench estimator/ }).click();
      await dialog
        .getByRole("list", { name: "Assigned" })
        .getByText("Bench estimator")
        .waitFor({ state: "detached", timeout: 10000 });
      await save(page, dialog);
      const who = await rowAssignees(page);
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
      await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
      await enterWorkspace(page, workspace.uuid);
      const who = await rowAssignees(page);
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
      const dialog = await openJob(page, viewer.email);
      await dialog.locator("[data-edit-refusal]").waitFor({ timeout: 15000 });
      await dialog.getByRole("list", { name: "Assigned" }).getByText("Bench estimator").waitFor({ timeout: 15000 });
      expect(await page.locator("#edit-project-assignees").isDisabled(), "viewer picker enabled");
      expect((await dialog.getByRole("button", { name: /Remove / }).count()) === 0, "viewer sees ×");
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
      const dialog = await openEdit(page, twins);
      await page.locator("#edit-project-assignees").click();
      await page.locator(`[data-assignee-option="${twin.email}"]`).waitFor({ timeout: 20000 });
      for (const email of [admin.email, twin.email]) {
        const option = page.locator(`[data-assignee-option="${email}"]`);
        expect((await option.locator("[data-assignee-email]").innerText()) === email, `no email under ${email}`);
      }
      const named = await page.getByRole("option", { name: /Bench admin/ }).count();
      expect(named === 2, `${named} Bench admin options`);
      const chips = dialog.getByRole("list", { name: "Assigned" });
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
      await dialog.getByRole("button", { name: `Remove Bench admin (${twin.email})` }).waitFor();
      return `options show both emails · chips: ${read.map((t) => t.trim()).join(" | ")}`;
    },
  },
]);

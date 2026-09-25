// F3-S9 — only the owner grants ownership, and only by transfer.
//
//   docker compose --profile browser run --rm browser node scripts/f3-s9.mjs
//
// The one act in settings with no undo: afterwards the caller is not the owner and
// cannot take it back. Two paths, and they fail differently, so both are driven.
//
// Each step works in a FRESH workspace it creates itself. Transferring away the seeded
// Bench Construction would leave every other fixture signed in as an admin, and a
// fixture that breaks the bench for the next one is worse than no fixture.
//
// AC8 (both paths write an audit event) is driven in f3-s12, because the audit log does
// not exist until then. It is named here so it is not lost.

import {
  APP,
  apiCall,
  apiLogin,
  apiRegister,
  cancelTransfer,
  capabilities,
  clearMail,
  createWorkspace,
  expect,
  invite,
  inviteTokenFromMail,
  apiAccept,
  members,
  pendingTransfer,
  run,
  seatedMember,
  signInAs,
  transferOwnership,
  revokeInvitation,
} from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";
const ownerToken = await apiLogin();

/** A workspace this fixture owns outright, so a transfer breaks nothing else. */
async function freshWorkspace(tag) {
  return createWorkspace(ownerToken, `S9 ${tag} ${Date.now()}`);
}

const uuidOf = async (workspaceUuid, email) =>
  (await members(ownerToken, workspaceUuid)).find((m) => m.email === email).user_uuid;

await run("f3-s9", [
  {
    title: "AC2 — transfer to a member: they become owner, the giver becomes admin, at once",
    run: async () => {
      const ws = await freshWorkspace("Member");
      const heir = await seatedMember(ownerToken, ws.uuid, "admin", "s9-heir");
      const heirUuid = await uuidOf(ws.uuid, heir.email);

      const done = await transferOwnership(ownerToken, ws.uuid, { userUuid: heirUuid }, ws.name);
      expect(done.status === 200, `the transfer gave ${done.status}`);

      const roster = await members(ownerToken, ws.uuid);
      const owners = roster.filter((m) => m.role === "owner");
      // Neither ownerless nor two owners: the whole point of doing it in one
      // transaction rather than as a promote and a demote.
      expect(owners.length === 1, `${owners.length} owners after the transfer`);
      expect(owners[0].email === heir.email, `the owner is ${owners[0].email}`);
      const giver = roster.find((m) => m.email === "estimator@bench.intelcost.io");
      expect(giver.role === "admin", `the outgoing owner is now ${giver.role}`);

      // And the capability map followed: the giver can no longer hand it on.
      const mine = (await capabilities(ownerToken, ws.uuid)).capabilities;
      expect(mine.canTransferOwnership === false, "the outgoing owner can still transfer");
      expect(mine.canManageWorkspace === true, "the outgoing owner lost admin too");
      const theirs = (await capabilities(heir.token, ws.uuid)).capabilities;
      expect(theirs.canTransferOwnership === true, "the new owner cannot transfer");
      return `1 owner (${heir.email}) · giver is admin · capabilities swapped`;
    },
  },
  {
    title: "AC1/AC6 — an admin cannot transfer, and the wrong name is refused",
    run: async () => {
      const ws = await freshWorkspace("Refuse");
      const admin = await seatedMember(ownerToken, ws.uuid, "admin", "s9-admin");
      const adminUuid = await uuidOf(ws.uuid, admin.email);

      // An admin runs the workspace and does not control who owns it. Hand-written,
      // because the screen never offers it.
      const byAdmin = await transferOwnership(admin.token, ws.uuid, { userUuid: adminUuid }, ws.name);
      expect(byAdmin.status === 403, `an admin got ${byAdmin.status}`);
      expect(
        /cannot transfer ownership/i.test(byAdmin.body?.detail ?? ""),
        `the refusal read "${byAdmin.body?.detail}"`,
      );

      // The typed name is checked by the API, not only by the dialog. A dialog is a
      // speed bump a hand-written request drives straight past, and this act has no
      // undo.
      const wrongName = await transferOwnership(
        ownerToken,
        ws.uuid,
        { userUuid: adminUuid },
        "not the workspace name",
      );
      expect(wrongName.status === 409, `a wrong name gave ${wrongName.status}`);
      expect(
        /Type the workspace name exactly/.test(wrongName.body?.detail ?? ""),
        `the refusal read "${wrongName.body?.detail}"`,
      );

      // Nothing moved on the way to either refusal.
      const owners = (await members(ownerToken, ws.uuid)).filter((m) => m.role === "owner");
      expect(owners.length === 1, `${owners.length} owners after two refusals`);
      expect(
        owners[0].email === "estimator@bench.intelcost.io",
        `the owner is now ${owners[0].email}`,
      );
      return "admin 403 · wrong name 409 · still 1 owner, unchanged";
    },
  },
  {
    title: "AC3 — a transfer to an address with no seat waits for the accept, and only then",
    run: async () => {
      const ws = await freshWorkspace("Queued");
      const heirEmail = `s9-queued-${Date.now()}@bench.intelcost.io`;
      await clearMail();

      const queued = await transferOwnership(ownerToken, ws.uuid, { email: heirEmail }, ws.name);
      expect(queued.status === 200, `queueing gave ${queued.status}`);
      expect(
        /become the owner when they accept/.test(queued.body?.detail ?? ""),
        `the answer read "${queued.body?.detail}"`,
      );

      // Nothing has happened yet. This is the whole property: a promise is not a seat.
      const before = (await members(ownerToken, ws.uuid)).filter((m) => m.role === "owner");
      expect(before.length === 1, `${before.length} owners while the transfer waits`);
      expect(
        before[0].email === "estimator@bench.intelcost.io",
        "the workspace changed hands before the accept",
      );
      const waiting = await pendingTransfer(ownerToken, ws.uuid);
      expect(waiting?.email === heirEmail, `the waiting transfer names ${waiting?.email}`);

      // The invitation went out at ADMIN, which is what they hold if they never accept.
      const invitations = await apiCall(
        ownerToken,
        "GET",
        `/api/workspace/${ws.uuid}/invitation`,
      );
      const theirs = invitations.body.find((i) => i.email === heirEmail);
      expect(theirs?.role === "admin", `the invitation carries ${theirs?.role}`);

      // Accept it, and the swap happens now.
      const token = await inviteTokenFromMail(heirEmail);
      await apiRegister(heirEmail, PASSWORD, "S9 Queued Heir");
      const heirToken = await apiLogin(heirEmail, PASSWORD);
      const accepted = await apiAccept(heirToken, token);
      expect(accepted.status === 200, `accepting gave ${accepted.status}`);
      expect(accepted.body?.role === "owner", `they accepted into ${accepted.body?.role}`);

      const after = await members(ownerToken, ws.uuid);
      const owners = after.filter((m) => m.role === "owner");
      expect(owners.length === 1 && owners[0].email === heirEmail, `owners: ${owners.length}`);
      const giver = after.find((m) => m.email === "estimator@bench.intelcost.io");
      expect(giver.role === "admin", `the outgoing owner is ${giver.role}`);
      expect(
        (await pendingTransfer(heirToken, ws.uuid)) === null,
        "the promise outlived the transfer it recorded",
      );
      return `queued → 1 owner unchanged → accepted → owner is ${heirEmail}`;
    },
  },
  {
    title: "AC4/AC5 — one at a time, and cancelling leaves the invitation alone",
    run: async () => {
      const ws = await freshWorkspace("Cancel");
      const first = `s9-cancel-a-${Date.now()}@bench.intelcost.io`;
      const second = `s9-cancel-b-${Date.now()}@bench.intelcost.io`;
      await clearMail();
      await transferOwnership(ownerToken, ws.uuid, { email: first }, ws.name);

      // Two queued transfers would race on accept, and the loser would be an owner
      // demoted by a promise they never saw.
      const again = await transferOwnership(ownerToken, ws.uuid, { email: second }, ws.name);
      expect(again.status === 409, `a second transfer gave ${again.status}`);
      expect(
        /already waiting/.test(again.body?.detail ?? ""),
        `the refusal read "${again.body?.detail}"`,
      );

      const cancelled = await cancelTransfer(ownerToken, ws.uuid);
      expect(cancelled.status === 200, `cancelling gave ${cancelled.status}`);
      expect((await pendingTransfer(ownerToken, ws.uuid)) === null, "the promise survived");

      // The invitation is a real admin seat and stands on its own. Withdrawing it is a
      // separate decision with its own control.
      const invitations = await apiCall(
        ownerToken,
        "GET",
        `/api/workspace/${ws.uuid}/invitation`,
      );
      const theirs = invitations.body.find((i) => i.email === first);
      expect(theirs && theirs.revoked_at === null, "cancelling revoked the invitation too");

      // And with the promise gone, accepting seats them as the admin they were invited
      // as — not as the owner.
      const token = await inviteTokenFromMail(first);
      await apiRegister(first, PASSWORD, "S9 Cancelled Heir");
      const accepted = await apiAccept(await apiLogin(first, PASSWORD), token);
      expect(accepted.body?.role === "admin", `they accepted into ${accepted.body?.role}`);
      return "second queue 409 · cancelled · invitation intact · accepted as admin";
    },
  },
  {
    title: "AC7 — revoking the invitation behind a transfer cancels the transfer too",
    run: async () => {
      const ws = await freshWorkspace("Revoke");
      const heirEmail = `s9-revoke-${Date.now()}@bench.intelcost.io`;
      await clearMail();
      await transferOwnership(ownerToken, ws.uuid, { email: heirEmail }, ws.name);

      const invitations = await apiCall(
        ownerToken,
        "GET",
        `/api/workspace/${ws.uuid}/invitation`,
      );
      const theirs = invitations.body.find((i) => i.email === heirEmail);
      await revokeInvitation(ownerToken, ws.uuid, theirs.uuid);

      // A promise waiting on someone who can never accept is worse than no promise:
      // the owner believes they are handing over, and nothing will ever happen.
      expect(
        (await pendingTransfer(ownerToken, ws.uuid)) === null,
        "the transfer is still waiting on a revoked invitation",
      );
      // And the owner can start again, which is the thing a stuck promise prevented.
      const retry = await transferOwnership(
        ownerToken,
        ws.uuid,
        { email: `s9-revoke-2-${Date.now()}@bench.intelcost.io` },
        ws.name,
      );
      expect(retry.status === 200, `starting again gave ${retry.status}`);
      return "invitation revoked → promise cancelled → a new transfer can be queued";
    },
  },
  {
    title: "AC6 on screen — the button stays shut until the workspace name is typed exactly",
    run: async ({ page }) => {
      const ws = await freshWorkspace("Screen");
      const heir = await seatedMember(ownerToken, ws.uuid, "admin", "s9-screen");
      await signInAs(page, "estimator@bench.intelcost.io");

      // Switch to the fresh workspace, so the pass never transfers Bench Construction.
      await page.selectOption("header select", ws.uuid);
      await page.goto(`${APP}/settings/ownership`);
      await page.waitForSelector("#transfer-target", { timeout: 20000 });

      const submit = page.locator("[data-transfer-submit]");
      expect(await submit.isDisabled(), "the button is live before anyone is chosen");

      // By value: `label` takes a string, not a pattern, and the label carries a
      // timestamp and a role suffix.
      const heirUuid = await uuidOf(ws.uuid, heir.email);
      await page.selectOption("#transfer-target", heirUuid);
      expect(await submit.isDisabled(), "the button is live before the name is typed");

      await page.fill("#transfer-confirm", "nearly the right name");
      expect(await submit.isDisabled(), "a near-miss name unlocks the button");

      await page.fill("#transfer-confirm", ws.name);
      await page.waitForFunction(
        () => !document.querySelector("[data-transfer-submit]")?.hasAttribute("disabled"),
        undefined,
        { timeout: 10000 },
      );

      await submit.click();
      await page.waitForFunction(
        () => /now owns/.test(document.body.textContent ?? ""),
        undefined,
        { timeout: 20000 },
      );

      const owners = (await members(ownerToken, ws.uuid)).filter((m) => m.role === "owner");
      expect(owners.length === 1 && owners[0].email === heir.email, "the screen did not transfer");
      // And the screen now reads as an admin's: the control is gone, with the reason.
      await page.waitForFunction(
        () => /does not control who owns it/.test(document.body.textContent ?? ""),
        undefined,
        { timeout: 20000 },
      );
      return "disabled → disabled → disabled → live on the exact name → transferred, control gone";
    },
  },
  {
    title: "The queued path on screen: 'waiting to be accepted', and cancelling it",
    run: async ({ page }) => {
      const ws = await freshWorkspace("ScreenQueue");
      const heirEmail = `s9-screenq-${Date.now()}@bench.intelcost.io`;
      await signInAs(page, "estimator@bench.intelcost.io");
      await page.selectOption("header select", ws.uuid);
      await page.goto(`${APP}/settings/ownership`);
      await page.waitForSelector("#transfer-target", { timeout: 20000 });

      await page.selectOption("#transfer-target", "__email__");
      await page.waitForSelector("#transfer-email", { timeout: 10000 });
      // The copy has to say the transfer has NOT happened, or the owner believes it has.
      const body = await page.textContent("body");
      expect(
        /Nothing changes until they accept/.test(body),
        "the screen does not say the transfer is still pending",
      );

      await page.fill("#transfer-email", heirEmail);
      await page.fill("#transfer-confirm", ws.name);
      await page.click("[data-transfer-submit]");

      await page.waitForSelector("[data-pending-transfer]", { timeout: 20000 });
      const waiting = await page.textContent("[data-pending-transfer]");
      expect(waiting.includes(heirEmail), `the waiting panel reads "${waiting}"`);
      expect(/Until then you are still the owner/.test(waiting), "the panel does not say who owns it now");

      await page.click("[data-cancel-transfer]");
      await page.waitForFunction(() => !document.querySelector("[data-pending-transfer]"), undefined, {
        timeout: 20000,
      });
      expect(
        (await pendingTransfer(ownerToken, ws.uuid)) === null,
        "the screen said cancelled and the api disagrees",
      );
      return `queued to ${heirEmail} · panel names them · cancelled from the screen`;
    },
  },
]);

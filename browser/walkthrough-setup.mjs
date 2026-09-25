// Bench setup for a founder walkthrough. Not a fixture.
//
//   docker compose --profile browser run --rm browser node scripts/walkthrough-setup.mjs
//
// The roster is a hundred rows of machine-named accounts after F2 and F3's fixture runs,
// which is fine for a fixture and useless for a person clicking through. This seats one
// findable member, and makes a THROWAWAY workspace for the ownership check — because
// handing Bench Construction over would leave every fixture signed in as an admin, and
// the next run would fail for a reason nobody would connect to this.
//
// Re-runnable: it reuses what is already there and resets the roles it cares about.

import {
  apiAccept,
  apiLogin,
  apiRegister,
  clearMail,
  createWorkspace,
  firstWorkspace,
  invite,
  inviteTokenFromMail,
  members,
  setRole,
} from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";
const MEMBER = "walkthrough@bench.intelcost.io";
const HEIR = "walkthrough-heir@bench.intelcost.io";

const ownerToken = await apiLogin();

/** Seat an address in a workspace at a role, through the real invitation path. */
async function seat(workspaceUuid, email, role, name) {
  const already = (await members(ownerToken, workspaceUuid)).find((m) => m.email === email);
  if (already) {
    if (already.role !== role || already.custom_role_uuid) {
      await setRole(ownerToken, workspaceUuid, already.user_uuid, role);
      return `reset ${email} to ${role}`;
    }
    return `already seated: ${email} as ${role}`;
  }
  await clearMail();
  await invite(ownerToken, workspaceUuid, email, role);
  const token = await inviteTokenFromMail(email);
  await apiRegister(email, PASSWORD, name).catch(() => {});
  const accepted = await apiAccept(await apiLogin(email, PASSWORD), token);
  if (accepted.status !== 200) throw new Error(`seating ${email}: ${accepted.status}`);
  return `seated ${email} as ${role}`;
}

const bench = await firstWorkspace(ownerToken);
console.log(await seat(bench.uuid, MEMBER, "takeoff", "Walkthrough Member"));

// The throwaway. A fresh one each run, named for what it is, so there is never a
// question about whether it matters.
const spare = await createWorkspace(ownerToken, `Walkthrough Handover ${Date.now()}`);
console.log(await seat(spare.uuid, HEIR, "admin", "Walkthrough Heir"));
console.log(`handover workspace: ${spare.name}`);

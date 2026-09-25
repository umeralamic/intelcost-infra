// One tidy account for a founder walkthrough, seated through the real invitation path.
//
//   docker compose --profile browser run --rm browser node scripts/walkthrough-setup.mjs
//
// Not a fixture. The bench roster is 99 rows of machine-named accounts by now, and a
// click-through needs one row a person can find. Re-runnable: it reuses the account if
// it already exists.

import { apiLogin, apiRegister, apiAccept, clearMail, firstWorkspace, invite, inviteTokenFromMail, members } from "./lib/bench.mjs";

const EMAIL = "walkthrough@bench.intelcost.io";
const PASSWORD = "bench-password-1";

const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);

const already = (await members(ownerToken, workspace.uuid)).find((m) => m.email === EMAIL);
if (already) {
  console.log(`already seated: ${EMAIL} as ${already.role}`);
  process.exit(0);
}

await clearMail();
await invite(ownerToken, workspace.uuid, EMAIL, "takeoff");
const token = await inviteTokenFromMail(EMAIL);
await apiRegister(EMAIL, PASSWORD, "Walkthrough Member");
const accepted = await apiAccept(await apiLogin(EMAIL, PASSWORD), token);
if (accepted.status !== 200) throw new Error(`seating failed: ${accepted.status}`);
console.log(`seated ${EMAIL} in ${workspace.name} as takeoff`);

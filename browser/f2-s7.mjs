// F2-S7 — a failed signup step leaves no orphaned account.
//
// Legacy's orphan was an auth user with no workspace: the address was burned, and
// `supabase/functions/signup-cleanup/` existed to delete it. Register is one
// transaction here, so that orphan cannot form. What can is the shape one step
// along: an invited signup is register THEN accept, two calls in two transactions,
// and a failure between them leaves an account holding no seat.
//
//   docker compose --profile browser run --rm browser node scripts/f2-s7.mjs
//
// The spec's AC5 (a failure inside register itself) is not in here: it needs the
// database broken underneath the api, which a container cannot do to its neighbour.
// It is run from the host, where the seam is opened and closed by hand:
//
//   docker compose exec -T postgres psql -U intelcost -d intelcost \
//     -c 'alter table auth_token rename to auth_token_hidden'
//   curl -s -o /dev/null -w '%{http_code}\n' localhost:8000/api/auth/register ...
//   docker compose exec -T postgres psql -U intelcost -d intelcost \
//     -c 'alter table auth_token_hidden rename to auth_token'
//   # then the same address again: 201, and one row behind it, not two.
//
// `auth_token` is the right table to hide: register writes the user, flushes, and
// only then mints the verification token, so the statement that fails is one the
// user row is already behind. Nothing is left if the rollback is real.

import {
  APP,
  apiAccept,
  apiLogin,
  apiRegister,
  clearMail,
  expect,
  firstWorkspace,
  invitationSettled,
  invite,
  inviteTokenFromMail,
  members,
  revokeInvitation,
  run,
} from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";

const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);

/** A fresh invitation to an address that has no account yet.
 *
 *  Fresh per step, because every step here spends one. A shared fixture would make
 *  step 3 report "already accepted" about step 2's work. */
async function freshInvitee(tag) {
  const email = `s7-${tag}-${Date.now()}@bench.intelcost.io`;
  await clearMail();
  const invitation = await invite(ownerToken, workspace.uuid, email, "estimator");
  return { email, uuid: invitation.uuid, token: await inviteTokenFromMail(email) };
}

/** Fill the invited signup form and submit it. The address is fixed by the
 *  invitation, so only the two typed fields are ours to supply. */
async function submitInvitedSignup(page, token, name) {
  await page.goto(`${APP}/signup?invite=${encodeURIComponent(token)}`);
  await invitationSettled(page);
  await page.fill("#full_name", name);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
}

/** Stop the accept call reaching the api, the way an extension would.
 *
 *  Returned so the caller can flip it: the retry has to happen on the same page with
 *  exactly one thing changed, or it is not the sequence a person would live. */
async function blockAccept(page) {
  const state = { blocked: true };
  await page.route("**/api/invitation/**/accept", (route) =>
    state.blocked ? route.abort("blockedbyclient") : route.continue(),
  );
  return state;
}

/** The screen F2-S7 exists for: the account happened, the seat did not. */
async function seatFailure(page) {
  await page.waitForSelector('[role="alert"]', { timeout: 20000 });
  const body = await page.textContent("body");
  expect(body.includes("Your account is ready"), "the screen does not say the account exists");
  expect(
    !body.includes("Could not create your account"),
    "the screen blames the account, which was created",
  );
  // "did not attach", not the banner's own title: a blocked request is reported by
  // the network copy ("Can't reach IntelCost") and a refusal by the seat title, and
  // the sentence that holds in both is the subtitle above them.
  expect(body.includes("did not attach"), "the screen does not say the seat is missing");
  expect(
    (await page.$("input#password")) === null,
    "the signup form is still on screen; submitting it again would 409 and bounce them",
  );
  return body;
}

const seatsFor = async (email) =>
  (await members(ownerToken, workspace.uuid)).filter((m) => m.email === email);

await run("f2-s7", [
  {
    title: "AC1 — accept is blocked → the account is made, and the screen says the seat is not",
    run: async ({ page }) => {
      const invitee = await freshInvitee("blocked");
      await blockAccept(page);
      await submitInvitedSignup(page, invitee.token, "S7 Blocked");
      await seatFailure(page);

      const body = await page.textContent("body");
      // A blocked accept is a request that never landed, so it gets the same reading
      // as a blocked sign-in (F2-S3) rather than a made-up reason.
      expect(
        body.includes("Can't reach IntelCost"),
        "a blocked accept is not reported as a network failure",
      );
      expect(
        body.includes("trying again costs nothing"),
        "the screen does not say the retry is safe",
      );
      const retry = await page.textContent('button:has-text("Try again")');
      // The account really is there: a second register of the address is a duplicate.
      const again = await apiRegister(invitee.email, PASSWORD, "S7 Blocked");
      expect(again === 409, `re-registering the address answered ${again}, not 409`);
      // And the seat really is not.
      const seated = await seatsFor(invitee.email);
      expect(seated.length === 0, `the blocked accept seated them anyway: ${seated.length}`);
      return `account exists (register → 409) · 0 seats · button "${retry.trim()}"`;
    },
  },
  {
    title: "AC2 — unblock, press retry → the seat attaches, and no second account was made",
    run: async ({ page }) => {
      const invitee = await freshInvitee("retry");
      const route = await blockAccept(page);
      await submitInvitedSignup(page, invitee.token, "S7 Retry");
      await seatFailure(page);

      route.blocked = false;
      await page.click('button:has-text("Try again")');
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
      await invitationSettled(page);

      const body = await page.textContent("body");
      expect(
        !body.includes("Name your workspace"),
        "the dashboard is still offering onboarding, so no workspace arrived",
      );
      expect(body.includes(workspace.name), "the dashboard does not name the invited workspace");

      const seated = await seatsFor(invitee.email);
      expect(seated.length === 1, `expected one seat, found ${seated.length}`);
      const again = await apiRegister(invitee.email, PASSWORD, "S7 Retry");
      expect(again === 409, `a second account was creatable: register answered ${again}`);
      return `dashboard shows ${workspace.name} · 1 seat (${seated[0].role}) · still one account`;
    },
  },
  {
    title: "AC3 — accepting again after success is the same answer, not a refusal",
    run: async ({ page }) => {
      const invitee = await freshInvitee("idempotent");
      await submitInvitedSignup(page, invitee.token, "S7 Idempotent");
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });

      // The retry a lost reply would produce, made at the api because the screen has
      // already moved on. Twice, since "the second one works too" is the claim.
      const token = await apiLogin(invitee.email, PASSWORD);
      const second = await apiAccept(token, invitee.token);
      const third = await apiAccept(token, invitee.token);
      expect(second.status === 200, `the second accept answered ${second.status}`);
      expect(third.status === 200, `the third accept answered ${third.status}`);
      expect(
        second.body?.uuid === workspace.uuid && third.body?.uuid === workspace.uuid,
        "a repeated accept answered with a different workspace",
      );

      const seated = await seatsFor(invitee.email);
      expect(seated.length === 1, `three accepts left ${seated.length} seats`);
      return `accept ×3 → 200, 200, 200 · still 1 seat · ${workspace.name}`;
    },
  },
  {
    title: "AC4 — a closed invitation keeps the account but offers no retry",
    run: async ({ page }) => {
      // Not in the spec's list, but it is the other half of AC1. The seat can fail to
      // attach because the request never landed, or because the invitation stopped
      // being open while the form was being filled in. Only the first is worth a
      // button: the second would hand back the same sentence however often it is
      // pressed.
      const invitee = await freshInvitee("revoked");
      await page.goto(`${APP}/signup?invite=${encodeURIComponent(invitee.token)}`);
      await invitationSettled(page);
      await revokeInvitation(ownerToken, workspace.uuid, invitee.uuid);

      await page.fill("#full_name", "S7 Revoked");
      await page.fill("#password", PASSWORD);
      await page.click('button[type="submit"]');
      const body = await seatFailure(page);

      expect(
        (await page.$('button:has-text("Try again")')) === null,
        "a closed invitation still offers a retry",
      );
      expect(body.includes("withdrawn"), `the api's own reason is missing: "${body}"`);
      expect(body.includes("send a new link"), "the screen does not say what to do instead");
      const again = await apiRegister(invitee.email, PASSWORD, "S7 Revoked");
      expect(again === 409, `the account was not kept: register answered ${again}`);
      const seated = await seatsFor(invitee.email);
      expect(seated.length === 0, `a withdrawn invitation seated them: ${seated.length}`);
      return `no retry offered · reason carried through · account kept, 0 seats`;
    },
  },
]);

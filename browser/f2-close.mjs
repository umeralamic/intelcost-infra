// F2 close-out — the section 1 lines that were marked "ported" but never driven.
//
//   docker compose --profile browser run --rm browser node scripts/f2-close.mjs
//
// These behaviours were built before F2 opened and their parity lines say so, but a
// line that says "ported" and has never been driven is a claim, not a fact. Ticking
// the checklist is the point of this pass: nothing here is ticked on the strength of
// the code having been read.
//
// The expired-invitation case cannot be reached from a browser, because only time or
// the database can age a row. It runs from the host in three steps:
//
//   T=$(docker compose --profile browser run --rm -e MINT=1 browser node scripts/f2-close.mjs)
//   docker compose exec -T postgres psql -U intelcost -d intelcost \
//     -c "update workspace_invitation set expires_at = now() - interval '1 day' \
//         where token_hash = (select token_hash from workspace_invitation \
//                             order by created_at desc limit 1)"
//   docker compose --profile browser run --rm -e EXPIRED_TOKEN=$T browser node scripts/f2-close.mjs

import {
  APP,
  SEEDED,
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
  requestReset,
  resetTokenFromMail,
  revokeInvitation,
  run,
} from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";

const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);

async function freshInvitee(tag) {
  const email = `close-${tag}-${Date.now()}@bench.intelcost.io`;
  await clearMail();
  const invitation = await invite(ownerToken, workspace.uuid, email, "estimator");
  return { email, uuid: invitation.uuid, token: await inviteTokenFromMail(email) };
}

// --- the two host-driven modes ---------------------------------------------------

if (process.env.MINT === "1") {
  const invitee = await freshInvitee("expired");
  // stdout is the token, so the host can capture it. Everything else goes to stderr.
  console.error(`minted for ${invitee.email}`);
  console.log(invitee.token);
  process.exit(0);
}

if (process.env.EXPIRED_TOKEN) {
  await run("f2-close-expired", [
    {
      title: "An expired invitation says it expired, and not one of the other two",
      run: async ({ page }) => {
        await page.goto(
          `${APP}/accept-invite?token=${encodeURIComponent(process.env.EXPIRED_TOKEN)}`,
        );
        await invitationSettled(page);
        const body = await page.textContent("body");
        expect(body.includes("expired"), `the screen read: "${body}"`);
        expect(!body.includes("withdrawn"), "an expired invitation reads as withdrawn");
        expect(!body.includes("already accepted"), "an expired invitation reads as accepted");
        return `"${(await page.textContent('[role="alert"]')).trim()}"`;
      },
    },
  ]);
  process.exit(process.exitCode ?? 0);
}

await run("f2-close", [
  {
    title: "Sign in with email and password lands on the app, not back on the form",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      await page.fill("#email", SEEDED.email);
      await page.fill("#password", SEEDED.password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
      await page.waitForFunction(
        (name) => document.body.textContent.includes(name),
        workspace.name,
        { timeout: 20000 },
      );
      return `/ · ${workspace.name}`;
    },
  },
  {
    title: "Forgot password answers the same sentence for a registered and an unknown address",
    run: async ({ page }) => {
      const answerFor = async (email) => {
        await page.goto(`${APP}/forgot-password`);
        await page.fill("#email", email);
        await page.click('button[type="submit"]');
        await page.waitForSelector("text=Check your inbox", { timeout: 20000 });
        const heading = (await page.textContent("h1")).trim();
        const subtitle = (await page.textContent("h1 + p")).trim();
        return `${heading} · ${subtitle}`;
      };

      const registered = await answerFor(SEEDED.email);
      const stranger = await answerFor(`nobody-${Date.now()}@bench.intelcost.io`);
      // The whole property: an attacker holding a list of addresses learns nothing
      // about which of them have accounts.
      expect(registered === stranger, `"${registered}" vs "${stranger}"`);
      return `both: "${registered}"`;
    },
  },
  {
    title: "Reset password refuses a mismatch and a short password, then sets it",
    run: async ({ page }) => {
      const email = `close-reset-${Date.now()}@bench.intelcost.io`;
      await apiRegister(email, PASSWORD, "Close Reset");
      await clearMail();
      await requestReset(email);
      const token = await resetTokenFromMail(email);

      await page.goto(`${APP}/reset-password?token=${encodeURIComponent(token)}`);
      await page.waitForSelector("#password", { timeout: 20000 });

      await page.fill("#password", "bench-password-9");
      await page.fill("#confirm", "something-else-entirely");
      await page.click('button[type="submit"]');
      const mismatch = (await page.textContent('p[role="alert"]')).trim();
      expect(mismatch === "Both boxes must match.", `the mismatch read "${mismatch}"`);

      // Ten, not legacy's eight: a deliberate divergence, recorded in the spec's
      // settled questions. What the line is really about is that a length rule is
      // enforced and said out loud, which it is.
      await page.fill("#password", "short");
      await page.fill("#confirm", "short");
      await page.click('button[type="submit"]');
      const tooShort = (await page.textContent('p[role="alert"]')).trim();
      expect(/10 characters/.test(tooShort), `the length refusal read "${tooShort}"`);

      await page.fill("#password", "bench-password-9");
      await page.fill("#confirm", "bench-password-9");
      await page.click('button[type="submit"]');
      await page.waitForSelector("text=Your password is set", { timeout: 20000 });

      // NOT signed in, which is the second divergence and the deliberate one: a reset
      // revokes every session, including any this browser held, so the screen offers
      // sign-in rather than pretending to a session it just destroyed.
      const body = await page.textContent("body");
      expect(body.includes("signed out"), "the screen does not say the sessions ended");
      expect((await page.$('button:has-text("Sign in")')) !== null, "no way on to sign in");

      // And the new credential is the one that works now.
      const token2 = await apiLogin(email, "bench-password-9");
      expect(Boolean(token2), "the new password does not sign in");
      return `mismatch refused · "${tooShort}" · set, sessions ended, new password works`;
    },
  },
  {
    title: "A withdrawn invitation and an accepted one read differently from each other",
    run: async ({ page }) => {
      const withdrawn = await freshInvitee("withdrawn");
      await revokeInvitation(ownerToken, workspace.uuid, withdrawn.uuid);
      await page.goto(`${APP}/accept-invite?token=${encodeURIComponent(withdrawn.token)}`);
      await invitationSettled(page);
      const first = (await page.textContent('[role="alert"]')).trim();
      expect(first.includes("withdrawn"), `a revoked invitation read "${first}"`);

      const accepted = await freshInvitee("accepted");
      await apiRegister(accepted.email, PASSWORD, "Close Accepted");
      await apiAccept(await apiLogin(accepted.email, PASSWORD), accepted.token);
      await page.goto(`${APP}/accept-invite?token=${encodeURIComponent(accepted.token)}`);
      await invitationSettled(page);
      const second = (await page.textContent('[role="alert"]')).trim();
      expect(second.includes("already accepted"), `a spent invitation read "${second}"`);

      expect(first !== second, "the two refusals are the same sentence");
      return `"${first}" ≠ "${second}"`;
    },
  },
  {
    title: "An invitee with no account creates one from the invitation and joins in one go",
    run: async ({ page }) => {
      const invitee = await freshInvitee("newcomer");
      await page.goto(`${APP}/accept-invite?token=${encodeURIComponent(invitee.token)}`);
      await invitationSettled(page);

      // The invitation screen knows there is no account, so it offers the one thing
      // that makes sense rather than asking which of two the visitor is.
      await page.click('button:has-text("Create my account")');
      await page.waitForURL(/\/signup/, { timeout: 15000 });
      await invitationSettled(page);
      await page.fill("#full_name", "Close Newcomer");
      await page.fill("#password", PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });

      const seated = (await members(ownerToken, workspace.uuid)).filter(
        (m) => m.email === invitee.email,
      );
      expect(seated.length === 1, `expected one seat, found ${seated.length}`);
      return `account created and seated as ${seated[0].role}, one submit`;
    },
  },
  {
    title: "An invitee who already has an account signs in on the invitation and joins",
    run: async ({ page }) => {
      const invitee = await freshInvitee("returning");
      await apiRegister(invitee.email, PASSWORD, "Close Returning");

      await page.goto(`${APP}/accept-invite?token=${encodeURIComponent(invitee.token)}`);
      await invitationSettled(page);
      // The password box is on the invitation itself: the account exists, so there is
      // nothing to choose between.
      await page.waitForSelector("#invite-password", { timeout: 15000 });
      const fixed = await page.$("#invite-email");
      expect((await fixed.inputValue()) === invitee.email, "the address is not the invited one");
      expect(await fixed.isDisabled(), "the invited address can be edited");

      await page.fill("#invite-password", PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });

      const seated = (await members(ownerToken, workspace.uuid)).filter(
        (m) => m.email === invitee.email,
      );
      expect(seated.length === 1, `expected one seat, found ${seated.length}`);
      return `signed in below the invitation and seated as ${seated[0].role}`;
    },
  },
  {
    title: "An unknown URL renders the 404 page rather than a blank screen",
    run: async ({ page }) => {
      await page.goto(`${APP}/nope`);
      await page.waitForSelector("h1", { timeout: 15000 });
      const heading = (await page.textContent("h1")).trim();
      expect(heading === "Page not found", `the heading read "${heading}"`);
      const href = await page.getAttribute('a:has-text("Back to projects")', "href");
      expect(href === "/", `the way back points at ${href}`);
      // Blank is the failure being ruled out, so the page is measured, not just read.
      const height = await page.evaluate(() => document.body.getBoundingClientRect().height);
      expect(height > 100, `the page rendered ${height}px tall`);
      return `"${heading}" · way back → ${href} · ${Math.round(height)}px`;
    },
  },
]);

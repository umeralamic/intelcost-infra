// F2-S2 — "?invite=" on sign-in sends the user to the invitation, not the dashboard.
//
// The fixture is an address that ALREADY HAS AN ACCOUNT, which is the whole point of
// the subtask. The seeded user cannot play that part: they own the bench workspace,
// so they cannot be invited to it.

import {
  APP,
  SEEDED,
  apiLogin,
  apiRegister,
  clearMail,
  expect,
  firstWorkspace,
  invite,
  invitationPreview,
  invitationSettled,
  inviteTokenFromMail,
  run,
} from "./lib/bench.mjs";

// Fresh every run. The fixture has to be an address that holds an ACCOUNT but no
// SEAT, and a pass — or a spot-check in a real browser — spends it by joining. A
// fixed address works exactly once and then fails as "already in this workspace",
// which reads like a bug in the screen rather than a used-up fixture.
const INVITEE = {
  email: `s2-existing-${Date.now()}@bench.intelcost.io`,
  password: "bench-password-1",
};

// --- fixture ---------------------------------------------------------------------
await apiRegister(INVITEE.email, INVITEE.password, "S2 Existing User");
const seededToken = await apiLogin();
const workspace = await firstWorkspace(seededToken);
await clearMail();
await invite(seededToken, workspace.uuid, INVITEE.email, "member");
const token = await inviteTokenFromMail(INVITEE.email);

const preview = await invitationPreview(token);
if (!preview.account_exists) throw new Error("fixture wrong: the invitee has no account");

const signIn = async (page, who) => {
  await page.fill("#email", who.email);
  await page.fill("#password", who.password);
  await page.click('button[type="submit"]');
};

await run("f2-s2", [
  {
    title: "AC1 — the fixture is an invitation to an address that already has an account",
    run: async ({ page }) => {
      await page.goto(`${APP}/login?invite=${encodeURIComponent(token)}`);
      await page.waitForSelector("#email");
      return `token ${token.slice(0, 12)}… → ${preview.workspace_name}, role ${preview.role}, account_exists ${preview.account_exists}`;
    },
  },
  {
    title: "AC2 — sign in as the invitee → the invitation, not the dashboard",
    run: async ({ page }) => {
      await page.goto(`${APP}/login?invite=${encodeURIComponent(token)}`);
      await signIn(page, INVITEE);
      await page.waitForURL(/\/accept-invite/, { timeout: 15000 });
      await invitationSettled(page);
      const url = new URL(page.url());
      expect(url.pathname === "/accept-invite", `landed on ${url.pathname}`);
      expect(url.searchParams.get("token") === token, "the token did not survive the hop");
      const body = await page.textContent("body");
      expect(body.includes(workspace.name), "the screen does not name the workspace");
      expect(body.includes(preview.inviter_name), "the screen does not name the inviter");
      expect(body.includes(preview.role), "the screen does not name the role");
      expect(body.includes(INVITEE.email), "the screen does not name the invited address");
      const join = await page.textContent('button:has-text("Join")');
      return `${url.pathname}?token=… · heading names ${workspace.name} · button "${join.trim()}"`;
    },
  },
  {
    title: 'AC3 — "Create one" points at /signup?invite=<token>',
    run: async ({ page }) => {
      await page.goto(`${APP}/login?invite=${encodeURIComponent(token)}`);
      const href = await page.getAttribute('a:has-text("Create one")', "href");
      expect(href === `/signup?invite=${encodeURIComponent(token)}`, `href was ${href}`);
      return href;
    },
  },
  {
    title: "AC4 — invite beats next",
    run: async ({ page }) => {
      await page.goto(
        `${APP}/login?invite=${encodeURIComponent(token)}&next=%2Fsettings%2Faccount`,
      );
      await signIn(page, INVITEE);
      await page.waitForURL(/\/accept-invite/, { timeout: 15000 });
      const url = new URL(page.url());
      expect(url.pathname === "/accept-invite", `landed on ${url.pathname}, not the invitation`);
      return `${url.pathname} · next was ignored, as legacy does`;
    },
  },
  {
    title: "AC5 — a junk token lands on the invitation screen's own refusal",
    run: async ({ page }) => {
      await page.goto(`${APP}/login?invite=not-a-real-token`);
      await signIn(page, SEEDED);
      await page.waitForURL(/\/accept-invite/, { timeout: 15000 });
      await invitationSettled(page);
      const body = await page.textContent("body");
      expect(body.includes("not open"), "no refusal screen; the page may be blank");
      return `${new URL(page.url()).pathname} · "This invitation is not open"`;
    },
  },
]);

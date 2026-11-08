// C33, invitations inside the app (D-749) and one owned workspace per account (D-752), fixtures for
// what was built after the archive (night brief 2026-10-24, Part 2 item 3).
//
//   ./fx-suite.sh run c33-invitations
//
// The world: the run's owner (A) with one workspace; two throwaway people, B and C, registered
// through the api, their addresses confirmed from the verify mail in MailHog. A invites both as
// estimators.
// - D-752: A's second workspace is refused (409, "You already own a workspace"); B, who owns none,
//   makes one, and a second is refused.
// - D-749: an unverified address sees no invitation; once verified, the banner shows "<inviter>
//   invited you to <workspace> as Estimator"; Accept joins (B is a member); C declines from the
//   profile menu's "Invitations (1)", and A's list shows it declined.
//
// Left for the founder's eye: the banner's look, and the mail itself (MailHog only here).

import { APP, MAILHOG, apiCall, apiLogin, apiRegister, expect, fixtureOwner, invite, members, run, serviceUrl, signInAs, stamp } from "./lib/bench.mjs";
import { freshWorkspace } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";

const { token, workspace } = await freshWorkspace("C33 Invitations");
const PASSWORD = "bench-password-1";
const people = {};

/** Register, and (unless `verify` is false) confirm the address from its verify mail. */
async function person(key, verify = true) {
  const email = `fx.c33-${key}.${stamp()}@bench.intelcost.io`;
  await apiRegister(email, PASSWORD, `C33 ${key.toUpperCase()}`);
  const p = { email, token: await apiLogin(email, PASSWORD) };
  people[key] = p;
  if (verify) await confirm(p);
  return p;
}

async function confirm(p) {
  const url = `${MAILHOG}/api/v2/search?kind=to&query=${encodeURIComponent(p.email)}&limit=50`;
  const tok = await waitFor(
    async () => {
      const { items } = await (await fetch(serviceUrl(url) ?? url)).json();
      for (const item of items ?? []) {
        const m = item.Content.Body.replace(/=\r\n/g, "").match(/verify-email\?token=3D([A-Za-z0-9._~-]+)/);
        if (m) return m[1];
      }
      return null;
    },
    `the verify mail for ${p.email}`,
    30000,
    500,
  );
  const done = await apiCall(null, "POST", "/api/auth/email/verify", { token: tok });
  expect(done.status === 200, `verify ${p.email}: ${done.status} ${JSON.stringify(done.body)}`);
}

const mine = async (p) => {
  const got = await apiCall(p.token, "GET", "/api/invitation/mine");
  expect(got.status === 200, `mine: ${got.status} ${JSON.stringify(got.body)}`);
  return got.body;
};

await run("c33-invitations", [
  {
    title: "D-752: an account owns one workspace: the owner's second is refused (409); B, who owns none, makes one and its second is refused",
    run: async () => {
      const again = await apiCall(token, "POST", "/api/workspace", { name: `C33 second ${stamp()}` });
      expect(again.status === 409, `owner's second: ${again.status} ${JSON.stringify(again.body)}`);
      expect(/already own a workspace/i.test(JSON.stringify(again.body)), `refusal: ${JSON.stringify(again.body)}`);
      const b = await person("b", false);
      const first = await apiCall(b.token, "POST", "/api/workspace", { name: `C33 B own ${stamp()}` });
      expect(first.status === 201, `B's first: ${first.status} ${JSON.stringify(first.body)}`);
      const second = await apiCall(b.token, "POST", "/api/workspace", { name: `C33 B second ${stamp()}` });
      expect(second.status === 409, `B's second: ${second.status}`);
      return `owner's second 409 "${again.body.detail}"; B's first 201, second 409`;
    },
  },
  {
    title: "D-749: an invitation to an unverified address is not listed to it; once the address is confirmed it is",
    run: async () => {
      await invite(token, workspace.uuid, people.b.email, "estimator");
      const before = await mine(people.b);
      expect(before.length === 0, `unverified B sees ${before.length}`);
      await confirm(people.b);
      const after = await waitFor(async () => {
        const list = await mine(people.b);
        return list.length ? list : null;
      }, "B's invitation", 15000, 500);
      expect(after[0].workspace_uuid === workspace.uuid && after[0].role === "estimator", JSON.stringify(after[0]));
      return `unverified: 0; verified: ${after.length} (${after[0].workspace_name}, ${after[0].role}, from ${after[0].inviter_name})`;
    },
  },
  {
    title: "the banner says who invited B where and as what; Accept joins B to the workspace",
    run: async ({ page }) => {
      await signInAs(page, people.b.email, PASSWORD);
      const banner = page.locator("[data-invitations-banner]");
      await banner.waitFor({ timeout: 30000 });
      const row = banner.locator(`[data-my-invitation="${workspace.name}"]`);
      const said = ((await row.innerText()) ?? "").replace(/\s+/g, " ");
      const owner = await fixtureOwner();
      expect(said.includes(`${owner.fullName} invited you to ${workspace.name} as Estimator`), `banner: "${said}"`);
      await row.getByRole("button", { name: "Accept" }).click();
      await page.getByText(`You joined ${workspace.name}`).first().waitFor({ timeout: 15000 });
      const list = await members(token, workspace.uuid);
      expect(JSON.stringify(list).includes(people.b.email), "B is not a member");
      expect((await mine(people.b)).length === 0, "B still has an invitation pending");
      return `banner "${said.slice(0, 120)}"; accepted, B is a member`;
    },
  },
  {
    title: "C declines in the app (the profile menu's Invitations where the page has the menu, else the banner); the inviter's list shows it declined",
    run: async ({ page }) => {
      const c = await person("c");
      await invite(token, workspace.uuid, c.email, "estimator");
      await waitFor(async () => (await mine(c)).length === 1, "C's invitation", 15000, 500);
      await signInAs(page, c.email, PASSWORD);
      // The profile menu (top right) where the page has one; else the banner holds the same rows.
      await page.goto(`${APP}/`);
      const menu = page.getByRole("button", { name: "Account", exact: true });
      let via = "banner";
      if (await menu.waitFor({ timeout: 15000 }).then(() => true, () => false)) {
        await menu.click();
        await page.getByRole("menuitem", { name: "Invitations (1)" }).click();
        const dialog = page.getByRole("dialog", { name: "Invitations (1)" });
        await dialog.waitFor();
        await dialog.getByRole("button", { name: "Decline" }).click();
        via = "the profile menu";
      } else {
        await page.locator(`[data-invitations-banner] [data-my-invitation="${workspace.name}"]`).getByRole("button", { name: "Decline" }).click();
      }
      await page.getByText(`Invitation to ${workspace.name} declined`).first().waitFor({ timeout: 15000 });
      const list = await apiCall(token, "GET", `/api/workspace/${workspace.uuid}/invitation`);
      const theirs = list.body.find((i) => i.email === c.email);
      expect(theirs?.declined_at, `inviter's row: ${JSON.stringify(theirs)}`);
      expect((await mine(c)).length === 0, "C still has it pending");
      return `declined from ${via}; the inviter's row declined at ${theirs.declined_at}`;
    },
  },
]);


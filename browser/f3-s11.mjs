// F3-S11 — the members list tells the truth.
//
//   docker compose --profile browser run --rm browser node scripts/f3-s11.mjs
//
// Two parity lines said "ported" and were not. The roster had no last activity, and
// "copy the invite link" could not work at all: the raw token is returned once, at
// creation, and never stored, so there is nothing to read back. D-24 settles that —
// copyable at creation, and a separate "Get new link" that warns before it invalidates.
//
// The failure being ruled out is the silent one. A copy-link button that quietly
// re-mints hands the admin a working link while the one they mailed an hour ago stops
// working, and tells neither of them. So the pass checks both halves of every relink:
// the new link works, AND the old one is dead.

import {
  APP,
  apiCall,
  apiLogin,
  apiRegister,
  apiAccept,
  clearMail,
  createWorkspace,
  expect,
  invite,
  inviteTokenFromMail,
  mailCount,
  members,
  relinkInvitation,
  run,
  seatedMember,
  signInAs,
  tokenFromLink,
} from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";
const SEED = "estimator@bench.intelcost.io";
const ownerToken = await apiLogin();

const invitationsIn = async (workspaceUuid) =>
  (await apiCall(ownerToken, "GET", `/api/workspace/${workspaceUuid}/invitation`)).body;

await run("f3-s11", [
  {
    title: "AC3 — the link is shown once at creation, and the copied link accepts",
    run: async () => {
      const ws = await createWorkspace(ownerToken, `S11 Link ${Date.now()}`);
      const email = `s11-link-${Date.now()}@bench.intelcost.io`;

      const created = await apiCall(ownerToken, "POST", `/api/workspace/${ws.uuid}/invitation`, {
        email,
        role: "estimator",
      });
      expect(created.status === 201, `creating gave ${created.status}`);
      expect(Boolean(created.body?.link), "the creation response carries no link");
      expect(
        created.body.link.includes("/accept-invite?token="),
        `the link reads ${created.body.link}`,
      );

      // And a listing never carries it, because nothing stores it. That is the whole
      // reason "copy it later" has to mint a new one.
      const listed = (await invitationsIn(ws.uuid)).find((i) => i.email === email);
      expect(listed.link === null, `a listing carried a link: ${listed.link}`);

      // The copied link is a working invitation, not a decoration.
      await apiRegister(email, PASSWORD, "S11 Copied");
      const accepted = await apiAccept(
        await apiLogin(email, PASSWORD),
        tokenFromLink(created.body.link),
      );
      expect(accepted.status === 200, `accepting the copied link gave ${accepted.status}`);
      const seated = (await members(ownerToken, ws.uuid)).filter((m) => m.email === email);
      expect(seated.length === 1, `${seated.length} seats after accepting the copied link`);
      return `link at creation · absent from the listing · accepted, 1 seat`;
    },
  },
  {
    title: "AC4/AC6 — a new link works, the old one is dead, and no mail was sent",
    run: async () => {
      const ws = await createWorkspace(ownerToken, `S11 Relink ${Date.now()}`);
      const email = `s11-relink-${Date.now()}@bench.intelcost.io`;
      await clearMail();

      const created = await apiCall(ownerToken, "POST", `/api/workspace/${ws.uuid}/invitation`, {
        email,
        role: "estimator",
      });
      const firstLink = created.body.link;
      // Wait for the mail from creation, so the mailbox count below is a known number.
      await inviteTokenFromMail(email);
      const mailBefore = await mailCount();

      const again = await relinkInvitation(ownerToken, ws.uuid, created.body.uuid);
      expect(again.status === 200, `relinking gave ${again.status}`);
      expect(Boolean(again.body?.link), "the relink response carries no link");
      expect(again.body.link !== firstLink, "the new link is the old link");

      // AC6 — relink sends NO mail. Resend is the action that mails; keeping the two
      // apart is the whole decision.
      expect(
        (await mailCount()) === mailBefore,
        `relinking sent mail: ${mailBefore} → ${await mailCount()}`,
      );

      // Both halves. The new link works…
      await apiRegister(email, PASSWORD, "S11 Relinked");
      const token = await apiLogin(email, PASSWORD);
      const dead = await apiAccept(token, tokenFromLink(firstLink));
      // …and the old one is dead, with the same refusal an unknown token gets.
      expect(dead.status === 404, `the old link gave ${dead.status}, not 404`);
      const live = await apiAccept(token, tokenFromLink(again.body.link));
      expect(live.status === 200, `the new link gave ${live.status}`);
      return `new link accepted · old link 404 · mail count unchanged at ${mailBefore}`;
    },
  },

  {
    title: "AC1/AC2 — the roster says when someone was last active, and has no shift column",
    run: async ({ page }) => {
      const ws = await createWorkspace(ownerToken, `S11 Roster ${Date.now()}`);
      // Two members: one who has signed in (seating requires it) and one invited-then-
      // registered-but-never-signed-in is not reachable, so the never case is driven
      // through the api's own answer below.
      const seat = await seatedMember(ownerToken, ws.uuid, "estimator", "s11-roster");

      const roster = await members(ownerToken, ws.uuid);
      const theirs = roster.find((m) => m.email === seat.email);
      expect("last_sign_in_at" in theirs, "MemberRead does not carry last activity");
      expect(theirs.last_sign_in_at !== null, "a member who just signed in reads as never");

      await signInAs(page, SEED);
      await page.selectOption("header select", ws.uuid);
      await page.goto(`${APP}/settings/members`);
      await page.waitForFunction(
        (email) => document.body.textContent.includes(email),
        seat.email,
        { timeout: 20000 },
      );

      // Every row says something. A blank cell reads as data we lost rather than as
      // someone who has not arrived yet.
      const lines = await page.$$eval("[data-last-activity]", (nodes) =>
        nodes.map((node) => node.textContent.trim()),
      );
      expect(lines.length === roster.length, `${lines.length} activity lines, ${roster.length} rows`);
      expect(
        lines.every((line) => line.length > 0),
        `${lines.filter((l) => !l).length} rows say nothing`,
      );
      expect(
        lines.some((line) => /Active/.test(line)),
        `the lines read ${JSON.stringify(lines)}`,
      );

      // AC2 — no shift column, and its absence is the point. A column of dashes would
      // claim a feature F15 has not built.
      const body = await page.textContent("body");
      expect(!/\bShift\b/.test(body), "the roster shows a shift column");
      return `${lines.length} rows, all with an activity line · no shift column`;
    },
  },
  {
    title: "The screen: the link once on create, and 'Get new link' warns before it acts",
    run: async ({ page }) => {
      const ws = await createWorkspace(ownerToken, `S11 Screen ${Date.now()}`);
      const email = `s11-screen-${Date.now()}@bench.intelcost.io`;
      await signInAs(page, SEED);
      await page.selectOption("header select", ws.uuid);
      await page.goto(`${APP}/settings/members`);
      await page.waitForSelector("#invite-email", { timeout: 20000 });

      await page.fill("#invite-email", email);
      await page.click('button[type="submit"]');
      await page.waitForSelector("[data-invite-link-panel]", { timeout: 20000 });

      const shown = await page.inputValue("[data-invite-link]");
      expect(shown.includes("/accept-invite?token="), `the panel shows "${shown}"`);
      // It says why this is the only moment, which is what stops someone hunting for
      // the link again tomorrow.
      const panel = await page.textContent("[data-invite-link-panel]");
      expect(
        /cannot be shown again/.test(panel),
        `the panel reads "${panel}"`,
      );

      // AC5 — dismissing the warning changes nothing. Driven by cancelling and then
      // using the original link, which must still work.
      const created = (await invitationsIn(ws.uuid)).find((i) => i.email === email);
      await page.click(`[data-relink="${created.uuid}"]`);
      await page.waitForFunction(
        () => /stops working immediately/.test(document.body.textContent ?? ""),
        undefined,
        { timeout: 20000 },
      );
      const dialog = await page.textContent("body");
      expect(/use Resend to email them/.test(dialog), "the dialog does not distinguish resend");

      await page.click('button:has-text("Cancel")');
      await page.waitForFunction(
        () => !/stops working immediately/.test(document.body.textContent ?? ""),
        undefined,
        { timeout: 20000 },
      );
      await apiRegister(email, PASSWORD, "S11 Screen");
      const stillWorks = await apiAccept(
        await apiLogin(email, PASSWORD),
        tokenFromLink(shown),
      );
      expect(stillWorks.status === 200, `after cancelling, the link gave ${stillWorks.status}`);
      return `link shown once · warning names the consequence and Resend · cancel changed nothing`;
    },
  },
]);

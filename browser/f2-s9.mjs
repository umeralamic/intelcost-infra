// F2-S9 — the invited signup previews the workspace it joins.
//
//   docker compose --profile browser run --rm browser node scripts/f2-s9.mjs
//
// Most of this screen was already built; the remaining work was the button naming the
// workspace. The pass covers the whole preview anyway, because the point of the
// subtask is the set: heading, locked address, button, and no bounce to a separate
// invite page. Any one of them on its own is not a preview.
//
// The last criterion is the deliberate divergence. Legacy redirects every invited
// visitor to /invite/:token, which makes its own preview code unreachable — the parity
// line describes a screen legacy cannot render. The new app previews in place, so the
// pass watches every navigation and fails if one of them is that bounce.

import {
  APP,
  apiLogin,
  apiRegister,
  clearMail,
  createWorkspace,
  expect,
  firstWorkspace,
  invitationSettled,
  invite,
  inviteTokenFromMail,
  members,
  run,
} from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";

const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);
const preview = { role: "member" };

/** A fresh invitation to an address with no account, from a named workspace. */
async function freshInvitee(tag, { token = ownerToken, into = workspace } = {}) {
  const email = `s9-${tag}-${Date.now()}@bench.intelcost.io`;
  await clearMail();
  await invite(token, into.uuid, email, preview.role);
  return { email, token: await inviteTokenFromMail(email) };
}

/** Records every navigation, so "no bounce to /invite/:token" is checked rather than
 *  assumed from where the page happened to stop. */
const trackNavigation = (page) => {
  const seen = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) seen.push(new URL(frame.url()).pathname);
  });
  return seen;
};

const noLegacyBounce = (paths) =>
  expect(
    !paths.some((path) => path.startsWith("/invite/")),
    `the page bounced to legacy's invite route: ${paths.join(" → ")}`,
  );

await run("f2-s9", [
  {
    title: "AC1, AC2 — the heading names the workspace, the address is fixed, the inviter is named",
    run: async ({ page }) => {
      const invitee = await freshInvitee("preview");
      const paths = trackNavigation(page);
      await page.goto(`${APP}/signup?invite=${encodeURIComponent(invitee.token)}`);
      await invitationSettled(page);

      const heading = (await page.textContent("h1")).trim();
      const subtitle = (await page.textContent("h1 + p")).trim();
      expect(heading === `Join ${workspace.name}`, `the heading read "${heading}"`);
      expect(subtitle.includes("invited you"), `the subtitle read "${subtitle}"`);
      expect(subtitle.includes(preview.role), `the subtitle does not name the role: "${subtitle}"`);

      const email = await page.$("#email");
      expect((await email.inputValue()) === invitee.email, "the invited address is not filled in");
      expect(await email.isDisabled(), "the address can be edited, so a mismatch can be typed");
      const body = await page.textContent("body");
      expect(body.includes("Fixed by the invitation."), "the locked field does not say why");

      noLegacyBounce(paths);
      return `"${heading}" · "${subtitle}" · ${invitee.email} locked`;
    },
  },
  {
    title: "AC3 — the submit button names the workspace",
    run: async ({ page }) => {
      const invitee = await freshInvitee("button");
      await page.goto(`${APP}/signup?invite=${encodeURIComponent(invitee.token)}`);
      await invitationSettled(page);

      // Read raw, not whitespace-normalised. The label is two elements spaced by
      // `gap-2`, which is CSS: it separates them on screen and puts nothing between
      // them in the text a screen reader announces. Asserting the accessible name is
      // what catches that, and it did.
      const label = (await page.textContent('button[type="submit"]')).trim();
      expect(label === `Create account and join ${workspace.name}`, `the button read "${label}"`);
      const accessible = (await page.getAttribute('button[type="submit"]', "aria-label")) ?? label;
      expect(accessible.includes(`join ${workspace.name}`), `announced as "${accessible}"`);
      return `"${label}"`;
    },
  },
  {
    title: "A long workspace name truncates rather than bursting the button",
    run: async ({ page }) => {
      // A name is allowed 255 characters and the button is whitespace-nowrap inside a
      // 384px card, so this is the case that decides whether the label is a good idea
      // at all. The verb must survive; the name is what gives way.
      const email = `s9-long-${Date.now()}@bench.intelcost.io`;
      await apiRegister(email, PASSWORD, "S9 Long Name Owner");
      const token = await apiLogin(email, PASSWORD);
      const long = await createWorkspace(
        token,
        "Riverside Medical Center Phase Two Mechanical Electrical and Plumbing Package",
      );
      const invitee = await freshInvitee("longname", { token, into: long });

      await page.goto(`${APP}/signup?invite=${encodeURIComponent(invitee.token)}`);
      await invitationSettled(page);

      const button = await page.$('button[type="submit"]');
      const card = await page.$("form");
      const buttonBox = await button.boundingBox();
      const cardBox = await card.boundingBox();
      expect(
        buttonBox.width <= cardBox.width + 1,
        `the button is ${buttonBox.width}px inside a ${cardBox.width}px form`,
      );
      // The verb is what must stay readable, so it is the half that must not shrink.
      const verb = await page.$('button[type="submit"] span:first-child');
      const verbBox = await verb.boundingBox();
      expect(verbBox.width > 100, `the verb was squeezed to ${verbBox.width}px`);
      const overflowed = await page.evaluate(() => {
        const element = document.querySelector('button[type="submit"]');
        return element.scrollWidth > element.clientWidth + 1;
      });
      expect(!overflowed, "the label overflows the button rather than truncating");
      return `button ${Math.round(buttonBox.width)}px in a ${Math.round(cardBox.width)}px form, verb intact`;
    },
  },
  {
    title: "AC4 — submitting creates the account, takes the seat, and selects that workspace",
    run: async ({ page }) => {
      const invitee = await freshInvitee("join");
      const paths = trackNavigation(page);
      await page.goto(`${APP}/signup?invite=${encodeURIComponent(invitee.token)}`);
      await invitationSettled(page);

      await page.fill("#full_name", "S9 Joiner");
      await page.fill("#password", PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
      // Waited for in the text, not with `text=`: the workspace switcher renders the
      // name inside a closed `<select>`, and an option in a closed select is never
      // "visible", so a selector wait sits there until it times out.
      await page.waitForFunction(
        (name) => document.body.textContent.includes(name),
        workspace.name,
        { timeout: 20000 },
      );

      const selected = await page.evaluate(() => localStorage.getItem("intelcost.workspace"));
      expect(
        selected === workspace.uuid,
        `the active workspace is ${selected}, not the one just joined`,
      );
      const seated = (await members(ownerToken, workspace.uuid)).filter(
        (m) => m.email === invitee.email,
      );
      expect(seated.length === 1, `expected one seat, found ${seated.length}`);

      noLegacyBounce(paths);
      return `dashboard · ${workspace.name} selected · 1 seat (${seated[0].role})`;
    },
  },
  {
    title: "AC5 — a junk token gets the refusal screen and no form at all",
    run: async ({ page }) => {
      const paths = trackNavigation(page);
      await page.goto(`${APP}/signup?invite=not-a-real-token`);
      await invitationSettled(page);

      const heading = (await page.textContent("h1")).trim();
      expect(heading === "This invitation is not open", `the heading read "${heading}"`);
      expect(
        (await page.$("#password")) === null,
        "the signup form rendered anyway, so a dead invitation can still make an account",
      );
      const href = await page.getAttribute('a:has-text("create an account without it")', "href");
      expect(href === "/signup", `the way out points at ${href}`);

      noLegacyBounce(paths);
      return `"${heading}" · no form · way out → ${href}`;
    },
  },
  {
    title: "AC6 — /signup with no invitation is untouched",
    run: async ({ page }) => {
      await page.goto(`${APP}/signup`);
      await page.waitForSelector("#email");
      const heading = (await page.textContent("h1")).trim();
      const label = (await page.textContent('button[type="submit"]')).trim();
      expect(heading === "Create your account", `the heading read "${heading}"`);
      expect(label === "Create account", `the button read "${label}"`);
      const email = await page.$("#email");
      expect(!(await email.isDisabled()), "the address is locked on an ordinary signup");
      expect((await email.inputValue()) === "", "the address is prefilled on an ordinary signup");
      return `"${heading}" · "${label}" · address editable and empty`;
    },
  },
]);

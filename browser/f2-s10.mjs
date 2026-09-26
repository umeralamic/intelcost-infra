// F2-S10 — a dead reset link says so before the form is filled in.
//
//   docker compose --profile browser run --rm browser node scripts/f2-s10.mjs
//
// The legacy parity line asked for a 2500ms timeout state, which was an artifact of
// the recovery session arriving in a URL hash. The token is a query parameter here, so
// there is nothing to wait for and that state is deliberately not ported. The real gap
// was the other end: a link that is present but spent, superseded, expired or invented
// was only refused on submit, after a password had been chosen and typed twice.
//
// Every fixture uses its own account. A reset revokes every session and changes a
// password, and doing that to the seeded user would quietly break every other pass.

import {
  APP,
  apiRegister,
  clearMail,
  expect,
  requestReset,
  resetTokenFromMail,
  run,
} from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";
const NEW_PASSWORD = "bench-password-2";

/** An account of this pass's own, with a live reset link waiting for it. */
async function freshLink(tag) {
  const email = `s10-${tag}-${Date.now()}@bench.intelcost.io`;
  await apiRegister(email, PASSWORD, "S10 Reset");
  await clearMail();
  await requestReset(email);
  return { email, token: await resetTokenFromMail(email) };
}

const open = async (page, token) => {
  await page.goto(`${APP}/reset-password?token=${encodeURIComponent(token)}`);
  // The check is a round trip, so the page first reads "Checking your link". Since P-18
  // the page is its own chunk, and before that the route's "Loading" shows: wait for the
  // page's heading as well, or the wait ends before the page has drawn at all.
  await page.waitForFunction(
    () => document.querySelector("h1") !== null && !document.body.textContent.includes("Checking your link"),
    undefined,
    { timeout: 20000 },
  );
};

/** The dead-link screen, and the absence of a form to fill in. */
const expectDead = async (page) => {
  const heading = (await page.textContent("h1")).trim();
  expect(heading === "Link invalid or expired", `the heading read "${heading}"`);
  expect(
    (await page.$("#password")) === null,
    "the password form rendered anyway, which is the whole bug",
  );
  const button = await page.$('button:has-text("Request a new link")');
  expect(button !== null, "there is no way to ask for a new link");
  return heading;
};

const fillAndSubmit = async (page, password = NEW_PASSWORD) => {
  await page.fill("#password", password);
  await page.fill("#confirm", password);
  await page.click('button[type="submit"]');
};

await run("f2-s10", [
  {
    title: "AC1 — a live link renders the form",
    run: async ({ page }) => {
      const link = await freshLink("live");
      await open(page, link.token);
      const heading = (await page.textContent("h1")).trim();
      expect(heading === "Choose a new password", `the heading read "${heading}"`);
      expect((await page.$("#password")) !== null, "no password field");
      expect((await page.$("#confirm")) !== null, "no confirmation field");
      return `"${heading}" · both fields present`;
    },
  },
  {
    title: "AC2 — the same link again, after it was spent → dead, and no form",
    run: async ({ page }) => {
      const link = await freshLink("spent");
      await open(page, link.token);
      await fillAndSubmit(page);
      await page.waitForSelector("text=Your password is set", { timeout: 20000 });

      // The same URL, opened again, the way a person re-clicks the mail.
      await open(page, link.token);
      const heading = await expectDead(page);

      // And the way out works: it reaches the screen that can issue a new one.
      await page.click('button:has-text("Request a new link")');
      await page.waitForURL(/\/forgot-password/, { timeout: 15000 });
      return `"${heading}" → ${new URL(page.url()).pathname}`;
    },
  },
  {
    title: "AC3 — an invented token gets the same screen, saying nothing about any account",
    run: async ({ page }) => {
      await open(page, "obviously-not-real");
      const heading = await expectDead(page);
      const body = await page.textContent("body");
      expect(!body.includes("@"), `the screen names an address: "${body}"`);
      return `"${heading}" · no address, no account state`;
    },
  },
  {
    title: "AC4 — no token at all keeps its own screen",
    run: async ({ page }) => {
      await page.goto(`${APP}/reset-password`);
      await page.waitForSelector("h1");
      const heading = (await page.textContent("h1")).trim();
      expect(heading === "That link is incomplete", `the heading read "${heading}"`);
      expect((await page.$("#password")) === null, "a form rendered for a link with no token");
      // Distinct from the dead-link screen on purpose: "you opened half a link" and
      // "this link is used up" call for different things.
      expect(heading !== "Link invalid or expired", "the two dead ends were merged into one");
      return `"${heading}"`;
    },
  },
  {
    title: "AC5 — asking twice kills the first link, and the second one still works",
    run: async ({ page }) => {
      const first = await freshLink("superseded");
      await clearMail();
      await requestReset(first.email);
      const secondToken = await resetTokenFromMail(first.email);
      expect(secondToken !== first.token, "the second request reissued the same token");

      await open(page, first.token);
      await expectDead(page);

      await open(page, secondToken);
      const heading = (await page.textContent("h1")).trim();
      expect(heading === "Choose a new password", `the newest link read "${heading}"`);
      return `first link dead · newest link live`;
    },
  },
  {
    title: "AC6 — two tabs, reset in one → the other fails on submit with the same sentence",
    run: async ({ page, context }) => {
      const link = await freshLink("race");

      // Both tabs pass the check, because at that moment the link really is live.
      const tabB = await context.newPage();
      await open(page, link.token);
      await open(tabB, link.token);
      expect((await tabB.$("#password")) !== null, "tab B never got a form");

      await fillAndSubmit(page);
      await page.waitForSelector("text=Your password is set", { timeout: 20000 });

      // Tab B submits a token that was live when it was checked and is not now. The
      // check is a courtesy, not a lock: the submit-time refusal is what guarantees
      // this, and it is why it was kept.
      await fillAndSubmit(tabB, "bench-password-3");
      const alert = await tabB.waitForSelector('[role="alert"]', { timeout: 20000 });
      const message = (await alert.textContent()).trim();
      expect(
        message.includes("no longer valid"),
        `tab B said "${message}" rather than the refusal`,
      );
      expect(
        (await tabB.$('a:has-text("Send me a fresh link")')) !== null,
        "tab B has no way to ask for a new link",
      );
      await tabB.close();
      return `tab A set the password · tab B: "${message.replace(/\s+/g, " ")}"`;
    },
  },
]);

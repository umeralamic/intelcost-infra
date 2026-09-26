// F2-S5 — signup refuses disposable mailboxes, at every tier (D-19).
//
// The refusal and the tier are independent. A disposable mailbox is refused wherever
// the visitor appears to be; what the tier still decides is the trial length, and that
// is checked in the database afterwards rather than in the browser, because nothing
// renders a tier until F2-S8 builds the trial-length endpoint.
//
// The bench has no MaxMind key, so geo is inert and every signup is Tier 1 unless a
// country header says otherwise. The tier is driven with `cf-ipcountry`, which is a
// real header the resolver reads in production, not a test hook.
//
// The VPN branch and the provider-outage branches cannot be reached from a browser at
// all: they depend on what MaxMind answers, and the browser never talks to MaxMind.
// Those are driven against fakes/maxmind and are reported separately.

import { API, APP, SEEDED, expect, run } from "./lib/bench.mjs";

/** Adds a country header to the API requests only.
 *
 *  `context.setExtraHTTPHeaders` would add it to every request the page makes,
 *  including the ones to Google Fonts, whose CORS preflight then refuses an
 *  unexpected header and fills the console with failures that have nothing to do
 *  with what is under test. The gate only ever reads this header off an api call. */
const withCountry = (page, code) =>
  page.route(`${API}/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), "cf-ipcountry": code } }),
  );

const stamp = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** Fills and submits the open signup form. */
const signUp = async (page, email) => {
  await page.goto(`${APP}/signup`);
  await page.fill("#full_name", "S5 Browser");
  await page.fill("#email", email);
  await page.fill("#password", "bench-password-1");
  await page.click('button[type="submit"]');
};

/** The error rendered under the email input, if any. */
const emailFieldError = async (page) => {
  const node = await page.$('#email ~ p[role="alert"]');
  return node ? (await node.textContent()).trim() : null;
};

// A run id so the tier each signup resolved to can be read back out of Postgres
// afterwards. The browser cannot see a tier: nothing renders one until F2-S8 builds
// the trial-length endpoint, so what the screen proves is accepted-or-refused, and
// the assignment behind it is checked separately and reported as a database check.
const RUN = process.env.RUN_ID ?? `${Date.now()}`;
console.log(`RUN_ID=${RUN}`);

await run("f2-s5", [
  {
    title: "AC1 (D-19) — a burner with no country header is REFUSED, because tier is not the rule",
    run: async ({ page }) => {
      // Inert geo, so this resolves to Tier 1. Under the legacy rule it was accepted;
      // D-19 refuses a disposable mailbox at every tier.
      const email = `s5ui-t1-${stamp()}@mailinator.com`;
      await signUp(page, email);
      const error = await page.waitForSelector('#email ~ p[role="alert"]', { timeout: 20000 });
      const text = (await error.textContent()).trim();
      expect(text === "Use a permanent email address", `the message was "${text}"`);
      expect((await page.$("#workspace-name")) === null, "the signup went through anyway");
      return `refused at Tier 1: "${text}"`;
    },
  },
  {
    title: "AC2 — the same address at Tier 3 is refused, on the email field",
    run: async ({ page }) => {
      // NG is absent from billing_country_tier, and absent is Tier 3.
      await withCountry(page, "NG");
      const email = `s5ui-t3-${stamp()}@mailinator.com`;
      await signUp(page, email);
      const error = await page.waitForSelector('#email ~ p[role="alert"]', { timeout: 20000 });
      const text = (await error.textContent()).trim();
      expect(
        text === "Use a permanent email address",
        `the message was "${text}", not the parity wording`,
      );
      expect(await page.$("#workspace-name") === null, "the signup went through anyway");
      return `refused on the email field: "${text}"`;
    },
  },
  {
    title: "AC3 — the refused address has no account: signing in fails as unknown credentials",
    run: async ({ page }) => {
      await withCountry(page, "NG");
      const email = `s5ui-orphan-${stamp()}@mailinator.com`;
      await signUp(page, email);
      await page.waitForSelector('#email ~ p[role="alert"]', { timeout: 20000 });

      await page.goto(`${APP}/login`);
      await page.fill("#email", email);
      await page.fill("#password", "bench-password-1");
      await page.click('button[type="submit"]');
      const alert = await page.waitForSelector('[role="alert"]', { timeout: 20000 });
      const text = (await alert.textContent()).trim();
      expect(
        text.includes("That email and password do not match."),
        `sign-in said "${text}", which is not a credentials failure`,
      );
      return "no account exists for the refused address";
    },
  },
  {
    title: "AC4 — a public mailbox at Tier 3 is ACCEPTED (public is not disposable)",
    run: async ({ page }) => {
      await withCountry(page, "NG");
      const email = `s5ui-public-${stamp()}@gmail.com`;
      await signUp(page, email);
      await page.waitForSelector("#workspace-name", { timeout: 20000 });
      expect((await emailFieldError(page)) === null, "an accepted signup showed a field error");
      return `${email} accepted at Tier 3`;
    },
  },
  {
    title: "Tier 2 — DE is a listed Tier 2 country, so an ordinary signup is accepted",
    run: async ({ page }) => {
      await withCountry(page, "DE");
      const email = `s5ui-de-${RUN}@gmail.com`;
      await signUp(page, email);
      await page.waitForSelector("#workspace-name", { timeout: 20000 });
      return `${email} accepted — expect tier 2, 7 days in the database check`;
    },
  },
  {
    title: "Tier 2 (D-19) — a burner at DE is REFUSED too",
    run: async ({ page }) => {
      await withCountry(page, "DE");
      const email = `s5ui-deburner-${RUN}@mailinator.com`;
      await signUp(page, email);
      const error = await page.waitForSelector('#email ~ p[role="alert"]', { timeout: 20000 });
      const text = (await error.textContent()).trim();
      expect(text === "Use a permanent email address", `the message was "${text}"`);
      // The DE signup two steps up, with an ordinary address, was accepted. The tier
      // is identical; the only difference is the mailbox, which is now the whole rule.
      return `refused at Tier 2: "${text}"`;
    },
  },
  {
    title: "Unlisted — BR is in neither list, so it falls back to Tier 3 and is accepted",
    run: async ({ page }) => {
      await withCountry(page, "BR");
      const email = `s5ui-br-${RUN}@gmail.com`;
      await signUp(page, email);
      await page.waitForSelector("#workspace-name", { timeout: 20000 });
      return `${email} accepted — expect tier 3, 5 days in the database check`;
    },
  },
  {
    title: "Unlisted — a burner at BR is refused, as it is everywhere since D-19",
    run: async ({ page }) => {
      await withCountry(page, "BR");
      const email = `s5ui-brburner-${RUN}@mailinator.com`;
      await signUp(page, email);
      const error = await page.waitForSelector('#email ~ p[role="alert"]', { timeout: 20000 });
      const text = (await error.textContent()).trim();
      expect(text === "Use a permanent email address", `the message was "${text}"`);
      return `refused at the Tier 3 fallback: "${text}"`;
    },
  },
  {
    title: "AC8 — the seeded bench user still signs in, unaffected",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      await page.fill("#email", SEEDED.email);
      await page.fill("#password", SEEDED.password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
      // Waited for, not read once: the workspace arrives on its own query, so reading
      // the body the instant the URL changes catches the projects screen mid-skeleton.
      //
      // `p:has-text(...)` and not `text=...`: the workspace name is also an <option>
      // in the closed switcher, that option comes first in the DOM, and an option in a
      // closed select is never "visible", so a bare text match waits on it forever.
      // Since F4 (D-31) the dashboard names the workspace in its h1.
      await page.waitForSelector('h1:has-text("Bench Construction")', { timeout: 20000 });
      // The project list is a third query behind the session and the workspace, so it
      // is waited for too rather than read off the body the moment the name appears.
      await page.waitForSelector('text=Riverside Medical Center', { timeout: 20000 });
      return "signed in, Bench Construction and the seeded project loaded";
    },
  },
]);

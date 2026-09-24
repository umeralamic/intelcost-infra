// F2-S8 — the signup page shows the trial length this visitor would actually get.
//
//   docker compose --profile browser run --rm browser node scripts/f2-s8.mjs
//
// The number is never written down in here. Every step asks the api what it would
// grant and then checks the screen says the same thing, because the whole property
// under test is that the two cannot drift: a fixture carrying its own copy of "14"
// would keep passing after the page stopped reading the resolver at all.
//
// Two of the spec's criteria need the bench changed underneath the api and are driven
// from the host:
//
//   AC4, the number follows the data:
//     docker compose exec -T postgres psql -U intelcost -d intelcost \
//       -c 'update billing_tier_rule set trial_days = 7 where tier = 1'
//     docker compose --profile browser run --rm browser node scripts/f2-s8.mjs
//     # step 1 now expects and finds "7 days free"
//     ... set it back to 14
//
//   AC6, a VPN-forced Tier 3 advertises the Tier 3 number:
//     FAKE_COUNTRY=US FAKE_VPN=1 docker compose --profile fakes up -d maxmind-fake
//     MAXMIND_BASE_URL=http://maxmind-fake:8080 MAXMIND_ACCOUNT_ID=x \
//       MAXMIND_LICENSE_KEY=y docker compose up -d api
//     # US is a Tier 1 country, so a Tier 1 number here would mean the VPN branch is
//     # not reaching the copy. The page must say the Tier 3 number.
//     ... then `docker compose up -d api` and stop the fake

import {
  API,
  APP,
  apiLogin,
  clearMail,
  expect,
  firstWorkspace,
  invitationSettled,
  invite,
  inviteTokenFromMail,
  run,
  trialLength,
} from "./lib/bench.mjs";

const TRIAL_CALL = "/api/auth/trial-length";
const NO_NUMBER = "Start your free trial. No card required.";

/** The subtitle under the heading, which is the only place a length is claimed.
 *  Read from that element and not from the body: the password hint says "At least 10
 *  characters", so a step looking for digits anywhere on the page finds one. */
const subtitle = async (page) => (await page.textContent("h1 + p")).trim();

/** Adds a country header to the api calls only. Same reason as F2-S5: adding it to
 *  every request breaks Google Fonts' CORS preflight. */
const withCountry = (page, code) =>
  page.route(`${API}/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), "cf-ipcountry": code } }),
  );

/** Counts trial-length calls, so "once per tab" is a number and not an impression. */
const countTrialCalls = (page) => {
  const seen = [];
  page.on("request", (request) => {
    if (request.url().includes(TRIAL_CALL)) seen.push(request.url());
  });
  return seen;
};

const expectDays = (text, days) => {
  expect(
    text === `${days} day${days === 1 ? "" : "s"} free. No card required.`,
    `the subtitle read "${text}", not the api's ${days} days`,
  );
  return text;
};

// The spec's AC3 says to stop the api outright. The step below blocks the one call
// instead, which is narrower and needs no neighbour stopped; this mode is the literal
// reading, for when the api really is down and nothing can be asked of it first:
//
//   docker compose stop api
//   docker compose --profile browser run --rm -e API_DOWN=1 browser node scripts/f2-s8.mjs
//   docker compose start api
if (process.env.API_DOWN === "1") {
  await run("f2-s8-apidown", [
    {
      title: "AC3 — the api is stopped → /signup renders, with no number",
      run: async ({ page }) => {
        await page.goto(`${APP}/signup`);
        await page.waitForSelector("#email");
        const text = await subtitle(page);
        expect(text === NO_NUMBER, `the subtitle read "${text}"`);
        expect(!/\d/.test(text), `a number survived an api that is not there: "${text}"`);
        return `"${text}"`;
      },
    },
  ]);
  process.exit(process.exitCode ?? 0);
}

// What the api would grant, asked once here so the steps below can check the screen
// against it rather than against a number somebody typed into this file.
const inert = await trialLength();
const ng = await trialLength({ "cf-ipcountry": "NG" });
const de = await trialLength({ "cf-ipcountry": "DE" });

await run("f2-s8", [
  {
    title: "AC1 — /signup says the length the api would grant",
    run: async ({ page }) => {
      const calls = countTrialCalls(page);
      await page.goto(`${APP}/signup`);
      await page.waitForSelector("#email");
      await page.waitForFunction(
        () => !document.querySelector("h1 + p").textContent.includes("Start your free trial"),
        undefined,
        { timeout: 15000 },
      );
      const text = expectDays(await subtitle(page), inert.trial_days);
      return `"${text}" · tier ${inert.tier}, source ${inert.source}, ${calls.length} call`;
    },
  },
  {
    title: "AC2 — one call per tab: not per render, not per reload, and a second tab asks again",
    run: async ({ page, context }) => {
      const calls = countTrialCalls(page);
      await page.goto(`${APP}/signup`);
      await page.waitForSelector("#email");
      await page.waitForFunction(
        () => !document.querySelector("h1 + p").textContent.includes("Start your free trial"),
        undefined,
        { timeout: 15000 },
      );
      expect(calls.length === 1, `the first load made ${calls.length} calls`);

      // Renders, plenty of them: every keystroke re-renders the form.
      await page.fill("#full_name", "S8 Typing In The Form");
      await page.fill("#email", "s8@bench.intelcost.io");
      await page.fill("#password", "bench-password-1");
      expect(calls.length === 1, `typing took the count to ${calls.length}`);

      // A reload is a new page in the same tab, and sessionStorage is what carries
      // the answer across it.
      await page.reload();
      await page.waitForSelector("#email");
      expectDays(await subtitle(page), inert.trial_days);
      expect(calls.length === 1, `the reload asked again: ${calls.length} calls`);

      const stored = await page.evaluate(() => sessionStorage.getItem("intelcost.trial-length"));
      expect(Boolean(stored), "nothing was cached, so the reload was answered by luck");

      // A second tab is a second sessionStorage, so it asks for itself. Same browser,
      // new context: that is what "open a second tab" means for the cache under test.
      const other = await context.browser().newContext();
      const otherPage = await other.newPage();
      const otherCalls = countTrialCalls(otherPage);
      await otherPage.goto(`${APP}/signup`);
      await otherPage.waitForSelector("#email");
      await otherPage.waitForFunction(
        () => !document.querySelector("h1 + p").textContent.includes("Start your free trial"),
        undefined,
        { timeout: 15000 },
      );
      expect(otherCalls.length === 1, `the second tab made ${otherCalls.length} calls`);
      await other.close();

      return `tab 1: 1 call across a load, three fills and a reload · tab 2: 1 call`;
    },
  },
  {
    title: "AC3 — the lookup cannot be reached → the page renders, with no number at all",
    run: async ({ page }) => {
      // The spec says stop the api. Blocking the one call is the same fact from the
      // page's side and it is narrower: it proves the fallback belongs to this lookup
      // failing rather than to the whole api being gone.
      await page.route(`**${TRIAL_CALL}`, (route) => route.abort("blockedbyclient"));
      await page.goto(`${APP}/signup`);
      await page.waitForSelector("#email");
      const text = await subtitle(page);
      expect(text === NO_NUMBER, `the subtitle read "${text}"`);
      expect(!/\d/.test(text), `a number survived a failed lookup: "${text}"`);
      expect(text.includes("No card required."), "the fallback lost the rest of the copy");
      // And the form is still usable, which is the point of failing this way.
      expect((await page.$("#email")) !== null, "the form did not render");
      return `"${text}"`;
    },
  },
  {
    title: "AC5 — a Tier 3 country advertises the Tier 3 length, and the api names the header",
    run: async ({ page }) => {
      await withCountry(page, "NG");
      await page.goto(`${APP}/signup`);
      await page.waitForSelector("#email");
      await page.waitForFunction(
        () => !document.querySelector("h1 + p").textContent.includes("Start your free trial"),
        undefined,
        { timeout: 15000 },
      );
      const text = expectDays(await subtitle(page), ng.trial_days);
      expect(ng.tier === 3, `NG resolved to tier ${ng.tier}`);
      expect(
        ng.source === "cf-ipcountry",
        `the header did not answer: source was "${ng.source}", so MaxMind was paid for`,
      );
      expect(
        ng.trial_days !== inert.trial_days,
        "NG and the inert bench agree, so this step proves nothing",
      );
      return `"${text}" · tier ${ng.tier}, source ${ng.source}`;
    },
  },
  {
    title: "Tier 2 — a listed Tier 2 country gets the Tier 2 length, not the Tier 1 one",
    run: async ({ page }) => {
      await withCountry(page, "DE");
      await page.goto(`${APP}/signup`);
      await page.waitForSelector("#email");
      await page.waitForFunction(
        () => !document.querySelector("h1 + p").textContent.includes("Start your free trial"),
        undefined,
        { timeout: 15000 },
      );
      const text = expectDays(await subtitle(page), de.trial_days);
      expect(de.tier === 2, `DE resolved to tier ${de.tier}`);
      return `"${text}" · tier ${de.tier}, source ${de.source}`;
    },
  },
  {
    title: "AC7 — an invited signup names the workspace, claims no length, and asks for none",
    run: async ({ page }) => {
      const ownerToken = await apiLogin();
      const workspace = await firstWorkspace(ownerToken);
      const email = `s8-invited-${Date.now()}@bench.intelcost.io`;
      await clearMail();
      await invite(ownerToken, workspace.uuid, email, "member");
      const token = await inviteTokenFromMail(email);

      const calls = countTrialCalls(page);
      await page.goto(`${APP}/signup?invite=${encodeURIComponent(token)}`);
      await invitationSettled(page);
      await page.waitForSelector("#password");

      const text = await subtitle(page);
      expect(text.includes("invited you"), `the subtitle read "${text}"`);
      expect(!/\d+ days? free/.test(text), `a trial length reached an invited signup: "${text}"`);
      const heading = await page.textContent("h1");
      expect(heading.includes(workspace.name), `the heading read "${heading}"`);
      // Not asked for, not merely not shown. The page has no sentence to put it in,
      // and in production this route is a billed lookup per visitor.
      expect(calls.length === 0, `an invited signup still asked for a trial length`);
      return `"${heading.trim()}" · "${text}" · 0 calls`;
    },
  },
]);

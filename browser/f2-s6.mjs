// F2-S6 — signing up with an address that already exists routes to sign-in.
//
// The api is better than legacy here: it answers 409 with the field attached, rather
// than legacy's silent success with an empty `identities` array. So the detection is
// trivial and the whole subtask is about what the screen does next — which was
// nothing, before this: the person was told and left standing on the signup form.

import { APP, SEEDED, expect, run } from "./lib/bench.mjs";

const REGISTERED_COPY = "That address already has an account";

const signUpWith = async (page, email, query = "") => {
  await page.goto(`${APP}/signup${query}`);
  await page.fill("#full_name", "S6 Duplicate");
  await page.fill("#email", email);
  await page.fill("#password", "bench-password-1");
  await page.click('button[type="submit"]');
};

await run("f2-s6", [
  {
    title: "AC1 — signing up with the seeded address lands on /login?email=<address>",
    run: async ({ page }) => {
      await signUpWith(page, SEEDED.email);
      await page.waitForURL(/\/login/, { timeout: 20000 });
      const url = new URL(page.url());
      expect(url.pathname === "/login", `landed on ${url.pathname}`);
      expect(
        url.searchParams.get("email") === SEEDED.email,
        `the address did not survive: ${url.search}`,
      );
      // Encoded, as the criterion spells it out.
      expect(url.search.includes("email=estimator%40bench.intelcost.io"), `search was ${url.search}`);
      return `${url.pathname}${url.search}`;
    },
  },
  {
    title: "AC2 — the email is prefilled, the password is empty and focused",
    run: async ({ page }) => {
      await signUpWith(page, SEEDED.email);
      await page.waitForURL(/\/login/, { timeout: 20000 });
      expect(
        (await page.inputValue("#email")) === SEEDED.email,
        "the email field was not prefilled",
      );
      expect((await page.inputValue("#password")) === "", "the password field is not empty");
      const focused = await page.evaluate(() => document.activeElement?.id);
      expect(focused === "password", `focus was on "${focused}", not the password`);
      return "email prefilled, password empty and focused";
    },
  },
  {
    title: "AC3 — the page says the address is registered and offers both ways forward",
    run: async ({ page }) => {
      await signUpWith(page, SEEDED.email);
      await page.waitForURL(/\/login/, { timeout: 20000 });
      const body = await page.textContent("body");
      expect(body.includes(REGISTERED_COPY), "the page does not say the address is registered");
      expect(body.includes("Sign in with your existing password"), "it does not offer signing in");

      // The reset path has to work, not merely be mentioned.
      await page.click('a:has-text("reset it")');
      await page.waitForURL(/\/forgot-password/, { timeout: 20000 });
      expect(await page.$("#email"), "the forgot-password form did not render");
      return "message shown; the reset link reaches /forgot-password";
    },
  },
  {
    title: "AC4 — typing the password there signs in and reaches the dashboard",
    run: async ({ page }) => {
      await signUpWith(page, SEEDED.email);
      await page.waitForURL(/\/login/, { timeout: 20000 });
      await page.fill("#password", SEEDED.password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
      await page.waitForSelector('p:has-text("Bench Construction")', { timeout: 20000 });
      return `signed in from the prefilled form, landed on ${new URL(page.url()).pathname}`;
    },
  },
  {
    title: "AC5 — ?next= is carried across the hop and still honoured after signing in",
    run: async ({ page }) => {
      await signUpWith(page, SEEDED.email, "?next=%2Fsettings%2Faccount");
      await page.waitForURL(/\/login/, { timeout: 20000 });
      const url = new URL(page.url());
      expect(
        url.searchParams.get("next") === "/settings/account",
        `next did not survive: ${url.search}`,
      );
      await page.fill("#password", SEEDED.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/settings\/account/, { timeout: 20000 });
      return `${url.search} → landed on /settings/account (F2-S1 still holds)`;
    },
  },
  {
    title: "The claim is not craftable: /login?email= alone must not assert an account",
    run: async ({ page }) => {
      // The address is prefilled because that is harmless, but the page must not say
      // "that address already has an account" about an address nobody checked.
      await page.goto(`${APP}/login?email=stranger%40example.com`);
      await page.waitForSelector("#email");
      expect(
        (await page.inputValue("#email")) === "stranger@example.com",
        "the address was not prefilled",
      );
      const body = await page.textContent("body");
      expect(
        !body.includes(REGISTERED_COPY),
        "a hand-written URL made the page assert an account exists",
      );
      return "prefilled, and no claim made about the address";
    },
  },
]);

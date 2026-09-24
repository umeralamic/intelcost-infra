// F2-S3 — a network failure is reported differently from a bad password.
//
// Two modes, because one of the acceptance criteria needs the api genuinely stopped
// and a container cannot stop its neighbour:
//
//   docker compose --profile browser run --rm browser node scripts/f2-s3.mjs
//   docker compose stop api
//   docker compose --profile browser run --rm -e API_DOWN=1 browser node scripts/f2-s3.mjs
//   docker compose start api
//
// The copy exists for the blocked-request case (AC4): an ad blocker eating the auth
// request is indistinguishable from a wrong password unless the screen says so.

import { APP, SEEDED, expect, run } from "./lib/bench.mjs";

const API_DOWN = process.env.API_DOWN === "1";

// The causes the copy must name. A stale cached session is deliberately NOT here:
// D-17 dropped the control that fixed it, so the advice would point nowhere.
const CAUSES = ["ad blocker", "privacy extension"];

const attempt = async (page, { email = SEEDED.email, password = "definitely-wrong" } = {}) => {
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  const alert = await page.waitForSelector('[role="alert"]', { timeout: 20000 });
  return (await alert.textContent()).trim();
};

/** The network banner, whichever way the request was stopped.
 *
 *  `action` is the word the form names as blocked, and it is asserted rather than
 *  waved at: the two forms share one component, so a call site dropping the prop
 *  would silently give the sign-up screen the sign-in wording. */
const expectNetworkBanner = (text, action) => {
  expect(text.includes("Can't reach IntelCost"), `title was not the network one: "${text}"`);
  expect(
    text.includes("Check your internet connection."),
    `the copy does not lead with the connection: "${text}"`,
  );
  for (const cause of CAUSES) {
    expect(text.toLowerCase().includes(cause), `the copy does not name "${cause}": "${text}"`);
  }
  expect(
    text.includes(`blocking the ${action}.`),
    `the copy does not name "${action}" as what was blocked: "${text}"`,
  );
  expect(
    !/password (is |was )?(wrong|incorrect)|do not match/i.test(text),
    `the copy blames the password: "${text}"`,
  );
  // D-17: the control is dropped, so the copy must not send anyone looking for it.
  expect(
    !/cached session|clear (your )?session/i.test(text),
    `the copy still points at the dropped control: "${text}"`,
  );
  // Founder call: no em dashes in this copy.
  expect(!text.includes("—"), `the copy contains an em dash: "${text}"`);
  return text;
};

const blockApi = (page) =>
  page.route("**://localhost:8000/**", (route) => route.abort("blockedbyclient"));

const steps = API_DOWN
  ? [
      {
        title: "AC2 — the api is stopped → the network banner, on /login",
        run: async ({ page }) => {
          await page.goto(`${APP}/login`);
          return expectNetworkBanner(await attempt(page, { password: SEEDED.password }), "sign-in");
        },
      },
      {
        title: "AC2 — the api is stopped → the network banner, on /signup",
        run: async ({ page }) => {
          await page.goto(`${APP}/signup`);
          await page.fill("#full_name", "S3 Api Down");
          await page.fill("#email", `s3-down-${Date.now()}@bench.intelcost.io`);
          await page.fill("#password", "bench-password-1");
          await page.click('button[type="submit"]');
          const alert = await page.waitForSelector('[role="alert"]', { timeout: 20000 });
          return expectNetworkBanner((await alert.textContent()).trim(), "sign-up");
        },
      },
    ]
  : [
      {
        title: "AC1 — a wrong password reads as a credentials failure, carrying the api's message",
        run: async ({ page }) => {
          await page.goto(`${APP}/login`);
          const text = await attempt(page);
          expect(text.includes("Sign in failed"), `title was "${text}"`);
          expect(
            text.includes("That email and password do not match."),
            `the api's own message is missing: "${text}"`,
          );
          for (const cause of CAUSES) {
            expect(
              !text.toLowerCase().includes(cause),
              `a credentials failure should not mention "${cause}"`,
            );
          }
          return text.replace(/\s+/g, " ");
        },
      },
      {
        title: "AC3 — the browser is offline → the network banner",
        run: async ({ page, context }) => {
          await page.goto(`${APP}/login`);
          await context.setOffline(true);
          const text = expectNetworkBanner(await attempt(page, { password: SEEDED.password }), "sign-in");
          await context.setOffline(false);
          return text.replace(/\s+/g, " ");
        },
      },
      {
        title: "AC4 — the api origin is blocked, as an ad blocker blocks it → the network banner",
        run: async ({ page }) => {
          await page.goto(`${APP}/login`);
          await blockApi(page);
          const text = expectNetworkBanner(await attempt(page, { password: SEEDED.password }), "sign-in");
          return text.replace(/\s+/g, " ");
        },
      },
      {
        title: "AC5 — /signup draws the same two messages",
        run: async ({ page }) => {
          // The refusal first. **Not a duplicate address any more**: since F2-S6 that
          // navigates to /login rather than reporting anything here, so it cannot
          // stand for "the api refused and the form said so". A disposable mailbox
          // (F2-S5, D-19) is the refusal that stays on the page, and since F2-S5 a
          // refusal the api attaches to a field renders on that field rather than in
          // the banner.
          //
          // What S3 owns is the distinction between "the api refused" and "the api was
          // never reached" — not which element carries the first one, and not which
          // refusal it is.
          await page.goto(`${APP}/signup`);
          await page.fill("#full_name", "S3 Refused");
          await page.fill("#email", `s3-burner-${Date.now()}@mailinator.com`);
          await page.fill("#password", "bench-password-1");
          await page.click('button[type="submit"]');
          const field = await page.waitForSelector('#email ~ p[role="alert"]', { timeout: 20000 });
          const refusal = (await field.textContent()).trim();
          expect(
            refusal === "Use a permanent email address",
            `the refusal read "${refusal}"`,
          );
          expect(
            !refusal.toLowerCase().includes("ad blocker"),
            "a refused signup should not mention extensions",
          );

          // Then the network one, on the same form.
          await page.goto(`${APP}/signup`);
          await blockApi(page);
          await page.fill("#full_name", "S3 Blocked");
          await page.fill("#email", `s3-blocked-${Date.now()}@bench.intelcost.io`);
          await page.fill("#password", "bench-password-1");
          await page.click('button[type="submit"]');
          const alert = await page.waitForSelector('[role="alert"]', { timeout: 20000 });
          const network = expectNetworkBanner((await alert.textContent()).trim(), "sign-up");
          return `refusal: "${refusal.replace(/\s+/g, " ")}" · network: "${network.replace(/\s+/g, " ")}"`;
        },
      },
    ];

await run(API_DOWN ? "f2-s3-apidown" : "f2-s3", steps);

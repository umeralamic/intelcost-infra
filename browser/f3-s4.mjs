// F3-S4 — platform admin is a separate answer (D-23).
//
//   docker compose --profile browser run --rm -e SETUP=1 browser node scripts/f3-s4.mjs
//   # prints STAFF=<email>
//   docker compose exec -T postgres psql -U intelcost -d intelcost \
//     -c "update \"user\" set is_platform_admin = true where email = '<email>'"
//   docker compose --profile browser run --rm -e STAFF=<email> browser node scripts/f3-s4.mjs
//
// Nothing in the product makes someone staff — that is the point of the column — so the
// flag is set in the database between the two passes, the same shape f2-close.mjs uses
// for an expired invitation.
//
// The behaviour being driven is a negative one: an internal route has to be
// INDISTINGUISHABLE from a wrong URL. So the pass does not merely check for the absence
// of the internal screen; it renders /nope and /platform as the same visitor and
// compares heading, tab title, the way back, and the rendered height. "It looked like a
// 404" is not the claim. The claim is that they are the same page.

import { APP, apiCall, apiLogin, apiRegister, expect, run } from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";

if (process.env.SETUP === "1") {
  const email = `s4-staff-${Date.now()}@bench.intelcost.io`;
  await apiRegister(email, PASSWORD, "S4 Staff");
  console.log(`STAFF=${email}`);
  process.exit(0);
}

const staffEmail = process.env.STAFF;
if (!staffEmail) {
  console.error("Run the SETUP pass first; see the header.");
  process.exit(2);
}

const staffToken = await apiLogin(staffEmail, PASSWORD);
const ownerToken = await apiLogin();

/** Everything that makes the not-found page what it is, as one visitor sees it. */
async function pageShape(page, url) {
  await page.goto(`${APP}${url}`);
  await page.waitForSelector("h1", { timeout: 20000 });
  return {
    heading: (await page.textContent("h1")).trim(),
    title: await page.title(),
    back: await page.getAttribute('a:has-text("Back to projects")', "href"),
    height: Math.round(
      await page.evaluate(() => document.body.getBoundingClientRect().height),
    ),
    path: new URL(page.url()).pathname,
  };
}

async function signIn(page, email) {
  await page.goto(`${APP}/login`);
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
}

await run("f3-s4", [
  {
    title: "AC2/AC3 — a workspace OWNER gets the ordinary 404, byte for byte",
    run: async ({ page }) => {
      // The owner, not a bystander: owning a workspace is the strongest standing a
      // customer has, and it is still not staff.
      await signIn(page, "estimator@bench.intelcost.io");
      const wrong = await pageShape(page, "/nope");
      const internal = await pageShape(page, "/platform");

      expect(internal.heading === wrong.heading, `"${internal.heading}" vs "${wrong.heading}"`);
      expect(internal.title === wrong.title, `"${internal.title}" vs "${wrong.title}"`);
      expect(internal.back === wrong.back, `${internal.back} vs ${wrong.back}`);
      // Still on /platform: a redirect somewhere else is its own answer.
      expect(internal.path === "/platform", `the visitor was moved to ${internal.path}`);
      expect(
        Math.abs(internal.height - wrong.height) < 2,
        `${internal.height}px vs ${wrong.height}px`,
      );
      const body = await page.textContent("body");
      expect(!/access|permission|admin|staff|internal/i.test(body), `the page said: ${body}`);
      return `"${internal.heading}" · ${internal.title} · ${internal.height}px, identical to /nope`;
    },
  },
  {
    title: "AC1/AC4 — the staff member sees it, and the api is the gate, not the guard",
    run: async ({ page }) => {
      // Hiding is not a gate. The customer's own token is refused by the api whether
      // or not the screen ever renders.
      const refused = await apiCall(ownerToken, "GET", "/api/platform/status");
      expect(refused.status === 403, `a workspace owner got ${refused.status}`);
      expect(
        refused.body?.detail === "Platform administrators only.",
        `the refusal read ${JSON.stringify(refused.body)}`,
      );

      const allowed = await apiCall(staffToken, "GET", "/api/platform/status");
      expect(allowed.status === 200, `staff got ${allowed.status}`);
      expect(
        typeof allowed.body?.workspaces === "number" && allowed.body.workspaces > 0,
        `the reading was ${JSON.stringify(allowed.body)}`,
      );

      await signIn(page, staffEmail);
      await page.goto(`${APP}/platform`);
      await page.waitForFunction(() => document.title.startsWith("Platform"), undefined, {
        timeout: 20000,
      });
      const heading = (await page.textContent("h1")).trim();
      expect(heading === "Platform", `staff saw the heading "${heading}"`);
      await page.waitForFunction(
        () => /Workspaces/.test(document.body.textContent ?? ""),
        undefined,
        { timeout: 20000 },
      );
      return `owner 403 · staff 200, ${allowed.body.workspaces} workspaces · the screen renders`;
    },
  },
  {
    title: "AC5 — the two admins are separate values, and neither stands in for the other",
    run: async () => {
      // The staff account belongs to no workspace at all, which is the case that would
      // expose a conflation: if `is_platform_admin` widened anything workspace-side,
      // an account with no membership would be able to reach a workspace.
      const mine = await apiCall(staffToken, "GET", "/api/workspace");
      expect(mine.status === 200, `listing workspaces as staff gave ${mine.status}`);
      expect(
        Array.isArray(mine.body) && mine.body.length === 0,
        `staff with no membership see ${mine.body?.length} workspaces`,
      );

      // And a workspace they are not a member of stays shut, staff or not. Platform
      // admin bypasses the plan and trial masks (F3-S2) and nothing else.
      const owned = await apiCall(ownerToken, "GET", "/api/workspace");
      const target = owned.body[0].uuid;
      const probe = await apiCall(staffToken, "GET", `/api/workspace/${target}/member`);
      expect(probe.status === 403, `staff reached a workspace they do not belong to: ${probe.status}`);
      return "staff: 0 workspaces, 403 on one they do not belong to, 200 on /api/platform";
    },
  },
  {
    title: "An anonymous visitor gets the 404 too, not a redirect to sign in",
    run: async ({ page }) => {
      // A redirect to /login where a wrong URL renders a 404 has already confirmed the
      // route exists, which is the whole thing this is for.
      const shape = await pageShape(page, "/platform");
      expect(shape.path === "/platform", `an anonymous visitor was sent to ${shape.path}`);
      expect(shape.heading === "Page not found", `the heading read "${shape.heading}"`);
      const wrong = await pageShape(page, "/nope");
      expect(shape.title === wrong.title, `"${shape.title}" vs "${wrong.title}"`);
      return `anonymous: "${shape.heading}" at /platform, same as /nope`;
    },
  },
]);

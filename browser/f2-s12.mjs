// F2-S12 — every page sets its own document.title.
//
//   docker compose --profile browser run --rm browser node scripts/f2-s12.mjs
//
// index.html carries one static <title>IntelCost</title>, so every route shared it and
// browser history, pinned tabs and a window of six project tabs were all unreadable.
//
// The hook is called from `AuthLayout` rather than from each auth page, because the
// heading those pages already render IS the title, and several of them have four or
// five states apiece. That is what step 2 checks: the title has to follow a state
// change, not just a route change.

import { APP, apiLogin, clearMail, expect, firstWorkspace, invitationSettled, invite, inviteTokenFromMail, run } from "./lib/bench.mjs";

const SUFFIX = " — IntelCost";

/** Wait for the title to stop being the static one and settle. */
const titleOf = async (page) => {
  await page.waitForFunction(() => document.title !== "IntelCost", undefined, { timeout: 15000 });
  return page.title();
};

const expectTitled = async (page, path) => {
  await page.goto(`${APP}${path}`);
  const title = await titleOf(page);
  expect(title.endsWith(SUFFIX), `"${title}" does not end in the suffix`);
  expect(title !== SUFFIX.trim(), `"${path}" has a suffix and no name`);
  return title;
};

await run("f2-s12", [
  {
    title: "AC1 — the six auth routes each have their own name, none of them shared",
    run: async ({ page }) => {
      const paths = [
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password?token=whatever",
        "/verify-email?token=whatever",
        "/accept-invite?token=whatever",
      ];
      const titles = [];
      for (const path of paths) titles.push(await expectTitled(page, path));

      const unique = new Set(titles);
      expect(
        unique.size === titles.length,
        `two routes share a title: ${titles.join(" | ")}`,
      );
      return titles.map((t) => `"${t}"`).join(" · ");
    },
  },
  {
    title: "AC2 — an invited signup is titled twice: the generic one, then the workspace",
    run: async ({ page }) => {
      const ownerToken = await apiLogin();
      const workspace = await firstWorkspace(ownerToken);
      const email = `s12-${Date.now()}@bench.intelcost.io`;
      await clearMail();
      await invite(ownerToken, workspace.uuid, email, "estimator");
      const token = await inviteTokenFromMail(email);

      // The preview is a round trip, so the screen is titled before it lands and
      // retitled after. Both are recorded, because a title that only ever reads the
      // final state would pass a hook wired to the route instead of to the state.
      const seen = [];
      await page.exposeFunction("__record", (value) => seen.push(value));
      await page.addInitScript(() => {
        const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, "title");
        Object.defineProperty(document, "title", {
          get: () => descriptor.get.call(document),
          set: (value) => {
            descriptor.set.call(document, value);
            window.__record?.(value);
          },
        });
      });

      await page.goto(`${APP}/signup?invite=${encodeURIComponent(token)}`);
      await invitationSettled(page);
      await page.waitForFunction(
        (name) => document.title.startsWith(`Join ${name}`),
        workspace.name,
        { timeout: 15000 },
      );

      const final = await page.title();
      expect(final === `Join ${workspace.name}${SUFFIX}`, `the title settled on "${final}"`);
      expect(
        seen.some((value) => value.startsWith("Checking your invitation")),
        `it never read the loading title: ${seen.join(" → ")}`,
      );
      return seen.map((t) => `"${t}"`).join(" → ");
    },
  },
  {
    title: "AC3 — an unknown URL says the page was not found",
    run: async ({ page }) => {
      const title = await expectTitled(page, "/nope");
      expect(/not found/i.test(title), `the title read "${title}"`);
      return `"${title}"`;
    },
  },
  {
    title: "AC4 — clicking through leaves three distinct history entries",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      const first = await titleOf(page);

      await page.click('a:has-text("Create one")');
      await page.waitForURL(/\/signup/, { timeout: 15000 });
      const second = await titleOf(page);

      await page.goBack();
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await page.click('a:has-text("Forgot your password?")');
      await page.waitForURL(/\/forgot-password/, { timeout: 15000 });
      const third = await titleOf(page);

      expect(new Set([first, second, third]).size === 3, `titles: ${first} | ${second} | ${third}`);

      // And going back restores the earlier title rather than keeping the newest, which
      // is what makes the history dropdown readable in the first place.
      await page.goBack();
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await page.waitForFunction((t) => document.title === t, first, { timeout: 15000 });
      return `"${first}" → "${second}" → "${third}", and back to "${first}"`;
    },
  },
  {
    title: "The app shell is titled too, so no screen wears the last one's name",
    run: async ({ page }) => {
      // Not in the criteria, but the consequence of a hook that restores nothing: a
      // route without one inherits whatever the previous route said. Signing in from
      // /login would have left the dashboard titled "Sign in".
      await page.goto(`${APP}/login`);
      await titleOf(page);
      await page.fill("#email", "estimator@bench.intelcost.io");
      await page.fill("#password", "bench-password-1");
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
      await page.waitForFunction(() => !document.title.startsWith("Sign in"), undefined, {
        timeout: 15000,
      });

      const dashboard = await page.title();
      expect(dashboard.endsWith(SUFFIX), `the dashboard title is "${dashboard}"`);
      expect(!dashboard.startsWith("Sign in"), `the dashboard wears the login title`);
      // And it does not tell an account with six workspaces that it has none while
      // the list is still arriving.
      expect(
        dashboard.startsWith("Projects"),
        `the seeded user's dashboard is titled "${dashboard}"`,
      );

      await page.goto(`${APP}/settings/account`);
      await page.waitForFunction(() => document.title.startsWith("Account"), undefined, {
        timeout: 15000,
      });
      const settings = await page.title();
      return `"${dashboard}" · "${settings}"`;
    },
  },
]);

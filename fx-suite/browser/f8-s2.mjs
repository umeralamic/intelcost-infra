// F8-S2: one socket per tab, tied to the session.
//
//   ./browser/f8-s2.sh      (runs this, then the outage phases in f8-s2-outage.mjs)
//
// AC3, the outage, needs the api stopped and started between browser steps; it is in
// f8-s2-outage.mjs, driven by f8-s2.sh.
//
// Updated 2026-10-24 (D-311, D-566, D-619): today's screens; what each step checks is unchanged.
// - AC2: Sign out is a row of the avatar menu (D-311 5: the avatar replaced the header's Sign out
//   button), so the step opens [data-avatar] and picks the "Sign out" menu item, as f2-s4b does
//   (D-619). Sign-ins land on Account settings (D-566), whose bar ("Back to takeoff") carries no
//   avatar, so the tab goes Home first, which for this run's fresh workspace is the empty takeoff
//   with its own bar and avatar. The reload resets the page's socket record, so "one socket, closed
//   1000, nothing after" is read as before.
// - AC4: the header's Account link went with the app header on Settings (D-311 5); the sign-in
//   already lands on Account settings (D-566), so the step goes on from there to Members by the
//   Settings tab strip's link, as before.

import { APP, SEEDED, expect, quietFor, run, signInAs, ownWorkspace } from "./lib/bench.mjs";
import { appSockets, readySocket, recordSockets, waitFor } from "./lib/realtime.mjs";

// Its own account and workspace, never the seeded one.
const { owner } = await ownWorkspace(`F8-S2 ${Date.now()}`);

await run("f8-s2", [
  {
    title: "AC1: signed out, the login page opens no socket",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await page.goto(`${APP}/login`);
      await page.waitForSelector("#email");
      await quietFor(3000); // no socket may open
      const all = await appSockets(page);
      expect(all.length === 0, `the login page opened ${all.length} socket(s)`);
      return "no socket on /login";
    },
  },
  {
    title: "AC2: sign out closes the socket 1000, and nothing reconnects",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await signInAs(page, owner.email, owner.password);
      // Home: this fresh workspace's empty takeoff, whose bar has the avatar menu (D-311 5).
      await page.goto(`${APP}/`);
      await page.locator("[data-avatar]").first().waitFor({ timeout: 20000 });
      await readySocket(page);
      await page.locator("[data-avatar]").first().click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await page.waitForURL((url) => url.pathname === "/login", { timeout: 10000 });
      const closed = await waitFor(
        async () => (await appSockets(page)).find((s) => s.close),
        "the socket to close",
      );
      await quietFor(5000); // no reconnect may follow
      const all = await appSockets(page);
      expect(closed.close.code === 1000, `closed ${closed.close.code} "${closed.close.reason}"`);
      expect(all.length === 1, `${all.length - 1} socket(s) opened after sign out`);
      return `closed ${closed.close.code} "${closed.close.reason}", no reconnect in 5 s`;
    },
  },
  {
    title: "AC4: a failed refresh signs the tab out, and the socket closes with it",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await signInAs(page, owner.email, owner.password);
      await readySocket(page);

      // The session is spent: the api refuses the next request and the refresh.
      await page.route("**/api/auth/refresh", (route) =>
        route.fulfill({ status: 401, contentType: "application/json", body: '{"detail":"That token is not valid."}' }),
      );
      await page.route("**/api/workspace/*/member", (route) =>
        route.request().method() === "GET"
          ? route.fulfill({ status: 401, contentType: "application/json", body: '{"detail":"Sign in to continue."}' })
          : route.continue(),
      );
      // Already on Account settings (D-566); on to Members by the Settings tab strip, once the
      // shell has stopped redrawing (a click mid-redraw found its link detached, the 2026-09-26
      // regression). Settings has no app header since D-311 5, so no header link is clicked.
      await page.waitForLoadState("networkidle");
      await page.locator('nav[aria-label="Settings"] a[href="/settings/members"]').click();

      await page.waitForURL((url) => url.pathname === "/login", { timeout: 15000 });
      const closed = await waitFor(
        async () => (await appSockets(page)).find((s) => s.close),
        "the socket to close",
      );
      await quietFor(4000); // no reconnect may follow
      const all = await appSockets(page);
      expect(closed.close.code === 1000, `closed ${closed.close.code}`);
      expect(all.length === 1, `${all.length - 1} socket(s) opened after the session ended`);
      const stored = await page.evaluate(() => localStorage.getItem("intelcost.session"));
      expect(stored === null, "the tokens are still in storage");
      return `on /login, socket closed ${closed.close.code}, tokens cleared, no reconnect`;
    },
  },
]);

// F8-S2: one socket per tab, tied to the session.
//
//   ./browser/f8-s2.sh      (runs this, then the outage phases in f8-s2-outage.mjs)
//
// AC3, the outage, needs the api stopped and started between browser steps; it is in
// f8-s2-outage.mjs, driven by f8-s2.sh.

import { APP, SEEDED, expect, run, signInAs } from "./lib/bench.mjs";
import { appSockets, readySocket, recordSockets, waitFor } from "./lib/realtime.mjs";

await run("f8-s2", [
  {
    title: "AC1: signed out, the login page opens no socket",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await page.goto(`${APP}/login`);
      await page.waitForSelector("#email");
      await page.waitForTimeout(3000);
      const all = await appSockets(page);
      expect(all.length === 0, `the login page opened ${all.length} socket(s)`);
      return "no socket on /login";
    },
  },
  {
    title: "AC2: sign out closes the socket 1000, and nothing reconnects",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await signInAs(page, SEEDED.email, SEEDED.password);
      await readySocket(page);
      await page.getByRole("button", { name: "Sign out" }).click();
      await page.waitForURL((url) => url.pathname === "/login", { timeout: 10000 });
      const closed = await waitFor(
        async () => (await appSockets(page)).find((s) => s.close),
        "the socket to close",
      );
      await page.waitForTimeout(5000);
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
      await signInAs(page, SEEDED.email, SEEDED.password);
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
      await page.click(`a[href="/settings/account"]`);
      await page.click(`a[href="/settings/members"]`);

      await page.waitForURL((url) => url.pathname === "/login", { timeout: 15000 });
      const closed = await waitFor(
        async () => (await appSockets(page)).find((s) => s.close),
        "the socket to close",
      );
      await page.waitForTimeout(4000);
      const all = await appSockets(page);
      expect(closed.close.code === 1000, `closed ${closed.close.code}`);
      expect(all.length === 1, `${all.length - 1} socket(s) opened after the session ended`);
      const stored = await page.evaluate(() => localStorage.getItem("intelcost.session"));
      expect(stored === null, "the tokens are still in storage");
      return `on /login, socket closed ${closed.close.code}, tokens cleared, no reconnect`;
    },
  },
]);

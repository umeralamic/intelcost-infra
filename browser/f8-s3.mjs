// F8-S3: re-auth on token refresh, never a rebuild.
//
//   ./browser/f8-s3.sh      (puts the api on 2-minute tokens, runs this, puts it back)
//
// Run against 30-minute tokens this would take an hour, so the runner sets
// ACCESS_TOKEN_MINUTES=2 and the first step refuses to go on if it did not take.

import { APP, SEEDED, apiCall, apiLogin, expect, firstWorkspace, members, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { appSockets, loginPair, rawSocket, readySocket, recordSockets, waitFor } from "./lib/realtime.mjs";

const workspace = await firstWorkspace(await apiLogin());
const topic = `ws:${workspace.uuid}`;

await run("f8-s3", [
  {
    title: "AC1: an idle tab refreshes a minute before expiry and re-auths on the SAME socket, which never closes",
    run: async ({ page, context }) => {
      await recordSockets(context);
      const refreshes = [];
      page.on("request", (r) => r.url().endsWith("/api/auth/refresh") && refreshes.push(Date.now()));
      await signInAs(page, SEEDED.email, SEEDED.password);
      const first = await readySocket(page);
      const life = first.received.find((f) => f.type === "ready").expires_in_ms;
      expect(life <= 125000, `the api is not on 2-minute tokens (${Math.round(life / 1000)} s): run browser/f8-s3.sh`);

      await page.waitForTimeout(150000);
      const all = await appSockets(page);
      const s = all[0];
      const auths = s.sent.filter((f) => f.type === "auth");
      const readies = s.received.filter((f) => f.type === "ready");
      expect(all.length === 1, `${all.length} sockets: the tab rebuilt instead of re-authorising`);
      expect(s.close === null, `the socket closed ${s.close?.code}`);
      expect(refreshes.length >= 2, `${refreshes.length} refreshes in 150 s`);
      expect(auths.length >= 3 && readies.length >= 3, `${auths.length} auth frames, ${readies.length} ready`);
      const gaps = readies.slice(1).map((r, i) => ((r.at - readies[i].at) / 1000).toFixed(0));
      return `1 socket, never closed; ${refreshes.length} refreshes; ${auths.length} auth frames on it, ready every ${gaps.join(", ")} s`;
    },
  },
  {
    title: "AC3: a member removed while their tab is open gets `revoked` at their next re-auth",
    run: async ({ page, context }) => {
      await recordSockets(context);
      // A fresh login: on 2-minute tokens the one taken at the top has expired by now.
      const ownerToken = await apiLogin();
      const seat = await seatedMember(ownerToken, workspace.uuid, "estimator", "f8s3");
      await signInAs(page, seat.email, seat.password);
      // The seat's own workspace may be the active one; point the tab at the owner's.
      await page.evaluate((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspace.uuid);
      await page.goto(`${APP}/`);
      await waitFor(
        async () => (await appSockets(page)).some((s) => s.received.some((f) => f.type === "joined" && f.topic === topic)),
        `joined ${topic}`,
        20000,
      );

      const userUuid = (await members(ownerToken, workspace.uuid)).find((m) => m.email === seat.email).user_uuid;
      const removed = await apiCall(ownerToken, "DELETE", `/api/workspace/${workspace.uuid}/member/${userUuid}`);
      expect(removed.status === 200, `removing the member: ${removed.status}`);
      const at = Date.now();

      const revoked = await waitFor(
        async () =>
          (await appSockets(page)).flatMap((s) => s.received).find((f) => f.type === "revoked" && f.topic === topic),
        "revoked",
        90000,
        500,
      );
      return `revoked ${((revoked.at - at) / 1000).toFixed(0)} s after removal: "${revoked.reason}"`;
    },
  },
  {
    title: "AC2: a token that is never refreshed is closed 4401 at expiry; a tab whose refresh is blocked signs out cleanly",
    run: async ({ page, context }) => {
      // (a) A hand-written socket that pings but never re-auths.
      const probe = await context.newPage();
      await probe.goto(`${APP}/login`);
      const pair = await loginPair(SEEDED.email, SEEDED.password);
      const expiring = rawSocket(
        probe,
        [{ type: "auth", token: pair.access_token, client_id: crypto.randomUUID() }],
        150000,
        400,
        5000,
      );

      // (b) The app, with /api/auth/refresh blocked as DevTools request blocking does.
      await recordSockets(context);
      await signInAs(page, SEEDED.email, SEEDED.password);
      await readySocket(page);
      await page.route("**/api/auth/refresh", (route) => route.abort("blockedbyclient"));
      await page.waitForURL((url) => url.pathname === "/login", { timeout: 90000 });
      const closed = (await appSockets(page)).find((s) => s.close);
      const stored = await page.evaluate(() => localStorage.getItem("intelcost.session"));

      const raw = await expiring;
      expect(raw.code === 4401, `the unrefreshed socket: ${JSON.stringify({ code: raw.code, reason: raw.reason, open: raw.open })}`);
      expect(raw.reason === "Your session has expired. Sign in again.", `reason "${raw.reason}"`);
      expect(closed?.close.code === 1000, `the app's socket: ${closed?.close?.code}`);
      expect(stored === null, "tokens still stored");
      return `unrefreshed socket closed ${raw.code} "${raw.reason}" after ${(raw.afterMs / 1000).toFixed(0)} s · blocked tab: /login, socket closed 1000, tokens cleared`;
    },
  },
]);

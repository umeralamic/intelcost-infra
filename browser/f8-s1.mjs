// F8-S1: the socket endpoint, first-frame auth, heartbeat and limits.
//
//   docker compose --profile browser run --rm browser node scripts/f8-s1.mjs
//
// AC5 (a restart closes 1012 and the app comes back) needs the api restarted between
// browser steps, so it lives in browser/f8-s2.sh with the S2 outage.

import { APP, SEEDED, apiCall, apiLogin, expect, run, signInAs } from "./lib/bench.mjs";
import {
  appSockets,
  loginPair,
  rawSocket,
  readySocket,
  recordSockets,
  shortName,
  upgradeStatus,
} from "./lib/realtime.mjs";

const token = await apiLogin();
const me = (await apiCall(token, "GET", "/api/auth/me")).body;
const expectedName = shortName(me.full_name, me.email);

await run("f8-s1", [
  {
    title: "AC1: one socket, auth first, ready with the short name, a ping and pong every 5 s, no token in the URL",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await signInAs(page, SEEDED.email, SEEDED.password);
      const socket = await readySocket(page);
      await page.waitForTimeout(12000);

      const all = await appSockets(page);
      expect(all.length === 1, `expected one socket, saw ${all.length}`);
      const s = all[0];
      expect(!s.url.includes("?") && !s.url.includes("token"), `the URL carries something: ${s.url}`);
      expect(s.sent[0]?.type === "auth" && s.sent[0].token, "the first frame out was not auth with a token");
      const ready = s.received.find((f) => f.type === "ready");
      expect(ready.name === expectedName, `ready named "${ready.name}", expected "${expectedName}"`);

      const pings = s.sent.filter((f) => f.type === "ping");
      const pongs = s.received.filter((f) => f.type === "pong");
      expect(pings.length >= 2 && pongs.length >= 2, `${pings.length} pings, ${pongs.length} pongs in 12 s`);
      const gaps = pings.slice(1).map((p, i) => (p.at - pings[i].at) / 1000);
      expect(gaps.every((g) => g > 4.5 && g < 5.5), `ping gaps ${gaps.join(", ")} s`);
      expect(socket.close === null, "the socket closed");
      return `ready as "${ready.name}", ${pings.length} pings ${gaps.map((g) => g.toFixed(1)).join("/")} s apart, URL ${s.url}`;
    },
  },
  {
    title: "AC2: three tabs, three sockets, three client ids",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await signInAs(page, SEEDED.email, SEEDED.password);
      await readySocket(page);
      const tabs = [page, await context.newPage(), await context.newPage()];
      for (const tab of tabs.slice(1)) {
        await tab.goto(`${APP}/`);
        await readySocket(tab);
      }
      const ids = new Set();
      for (const tab of tabs) {
        const mine = (await appSockets(tab)).filter((s) => s.close === null);
        expect(mine.length === 1, `a tab holds ${mine.length} open sockets`);
        ids.add(mine[0].sent[0].client_id);
      }
      expect(ids.size === 3, `client ids are not per tab: ${[...ids].join(", ")}`);
      return "3 tabs, 3 open sockets, 3 distinct client ids";
    },
  },
  {
    title: "AC3: silence closes 4401 after 5 s; a refresh token is refused 4401",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      const silent = await rawSocket(page, [], 9000);
      expect(silent.code === 4401, `silent socket: ${JSON.stringify(silent)}`);
      expect(silent.reason === "Sign in to continue.", `silent reason "${silent.reason}"`);
      expect(silent.afterMs > 4500 && silent.afterMs < 6500, `closed after ${silent.afterMs} ms`);

      const pair = await loginPair(SEEDED.email, SEEDED.password);
      const refresh = await rawSocket(
        page,
        [{ type: "auth", token: pair.refresh_token, client_id: crypto.randomUUID() }],
        4000,
      );
      expect(refresh.code === 4401, `refresh-token socket: ${JSON.stringify(refresh)}`);
      expect(
        refresh.reason === "That token is not valid for this request.",
        `refresh reason "${refresh.reason}"`,
      );
      return `silent: 4401 "${silent.reason}" after ${(silent.afterMs / 1000).toFixed(1)} s · refresh token: 4401 "${refresh.reason}"`;
    },
  },
  {
    title: "AC4: a foreign Origin is refused at the handshake; the app's is accepted",
    run: async () => {
      const evil = await upgradeStatus("https://evil.example");
      const ours = await upgradeStatus(APP);
      expect(evil === 403, `evil.example got ${evil}`);
      expect(ours === 101, `${APP} got ${ours}`);
      return `evil.example ${evil} · ${APP} ${ours}`;
    },
  },
]);

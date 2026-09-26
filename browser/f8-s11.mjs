// F8-S11: item focus, and the One at a time claim, on the server (D-32).
//
//   docker compose --profile browser run --rm browser node scripts/f8-s11.mjs
//
// Hand-written sockets opened from a page, because what is under test is the api's
// answer, not a screen. The screen is S12.

import { APP, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import { WS_URL, WS_URL_B, call, ensureWindowB } from "./lib/realtime.mjs";
import { countItem, removeItem, riverside, setMode } from "./lib/takeoff.mjs";

const token = await apiLogin();
const tokenB = await ensureWindowB();
const workspace = await firstWorkspace(token);
const r = await riverside(token, workspace.uuid);
const topic = `ws:${workspace.uuid}:project:${r.project}`;

/**
 * In the page: a tiny client. `open(token, url)` authenticates, joins the project and
 * resolves with a handle whose `frames` fill as they arrive; `send` sends; `wait`
 * resolves with the first frame that matches. Pings only when `ping` is on.
 */
const CLIENT = () => {
  window.__rt = {
    open(token, url, topic, ping = true) {
      return new Promise((resolve) => {
        const ws = new WebSocket(url);
        const client = { ws, frames: [], clientId: crypto.randomUUID(), pinger: null };
        client.send = (f) => ws.readyState === 1 && ws.send(JSON.stringify(f));
        client.wait = (test, ms = 5000) =>
          new Promise((res) => {
            const deadline = Date.now() + ms;
            const tick = () => {
              const hit = client.frames.find(test);
              if (hit) return res(hit);
              if (Date.now() > deadline) return res(null);
              setTimeout(tick, 50);
            };
            tick();
          });
        client.setPing = (on) => {
          if (client.pinger) clearInterval(client.pinger);
          client.pinger = on ? setInterval(() => client.send({ type: "ping" }), 5000) : null;
        };
        ws.onmessage = (e) => client.frames.push({ at: Date.now(), ...JSON.parse(e.data) });
        ws.onopen = async () => {
          client.send({ type: "auth", token, client_id: client.clientId });
          await client.wait((f) => f.type === "ready");
          client.send({ type: "join", topic });
          await client.wait((f) => f.type === "joined");
          client.setPing(ping);
          resolve(client);
        };
      });
    },
  };
};

async function page0(page) {
  await page.goto(`${APP}/login`);
  await page.evaluate(CLIENT);
}

await run("f8-s11", [
  {
    title: "AC1: One at a time: two tabs reach for the same item in the same instant, fifty rounds: exactly one wins each round",
    run: async ({ page }) => {
      await setMode(token, workspace.uuid, "one_at_a_time");
      await page0(page);
      const rounds = await page.evaluate(
        async ({ token, tokenB, url, urlB, topic, sheet }) => {
          const a = await window.__rt.open(token, url, topic);
          const b = await window.__rt.open(tokenB, urlB, topic);
          const out = [];
          for (let i = 0; i < 50; i++) {
            const item = crypto.randomUUID();
            const focus = { type: "item.focus", topic, item_uuid: item, sheet_uuid: sheet };
            a.send(focus);
            b.send(focus);
            const answer = (c) => c.wait((f) => (f.type === "focus.granted" || f.type === "focus.refused") && f.item_uuid === item);
            const [fa, fb] = await Promise.all([answer(a), answer(b)]);
            out.push([fa?.type, fb?.type]);
            a.send({ type: "item.blur", topic });
            b.send({ type: "item.blur", topic });
          }
          a.ws.close();
          b.ws.close();
          return out;
        },
        { token, tokenB, url: WS_URL, urlB: WS_URL_B, topic, sheet: r.sheet },
      );
      const bad = rounds.filter(([x, y]) => [x, y].filter((t) => t === "focus.granted").length !== 1);
      expect(bad.length === 0, `${bad.length} rounds without exactly one winner: ${JSON.stringify(bad.slice(0, 3))}`);
      const aWon = rounds.filter(([x]) => x === "focus.granted").length;
      return `50 rounds across both api processes, one winner each (A ${aWon}, B ${50 - aWon})`;
    },
  },
  {
    title: "AC2, AC3: a holder that stops its heartbeat loses the claim after about 15 s; its late release does not take the new holder's claim",
    run: async ({ page }) => {
      await setMode(token, workspace.uuid, "one_at_a_time");
      await page0(page);
      const result = await page.evaluate(
        async ({ token, tokenB, url, urlB, topic, sheet }) => {
          const item = crypto.randomUUID();
          const focus = { type: "item.focus", topic, item_uuid: item, sheet_uuid: sheet };
          const a = await window.__rt.open(token, url, topic, false); // no heartbeat
          const b = await window.__rt.open(tokenB, urlB, topic);
          a.send(focus);
          await a.wait((f) => f.type === "focus.granted");
          const heldAt = Date.now();
          let grantedAfter = null;
          while (Date.now() - heldAt < 19000) {
            b.frames = b.frames.filter((f) => f.item_uuid !== item);
            b.send(focus);
            const reply = await b.wait((f) => f.item_uuid === item && f.type.startsWith("focus."), 2000);
            if (reply?.type === "focus.granted") {
              grantedAfter = Date.now() - heldAt;
              break;
            }
            await new Promise((r) => setTimeout(r, 500));
          }
          // A comes back: its renew fails, and it is told who holds it now.
          a.send({ type: "ping" });
          const told = await a.wait((f) => f.type === "focus.refused" && f.item_uuid === item, 3000);
          // A's stale release must not take B's claim.
          a.send({ type: "item.blur", topic });
          await new Promise((r) => setTimeout(r, 500));
          const c = await window.__rt.open(token, url, topic);
          c.send(focus);
          const third = await c.wait((f) => f.item_uuid === item && f.type.startsWith("focus."), 3000);
          [a, b, c].forEach((s) => s.ws.close());
          return { grantedAfter, told: told?.reason ?? null, third: third?.type, thirdReason: third?.reason };
        },
        { token, tokenB, url: WS_URL, urlB: WS_URL_B, topic, sheet: r.sheet },
      );
      expect(result.grantedAfter !== null, "B never got the claim");
      expect(result.grantedAfter > 13000 && result.grantedAfter < 17500, `B got it after ${result.grantedAfter} ms`);
      expect(result.told === "Sara W. is editing this item right now.", `A was told "${result.told}"`);
      expect(result.third === "focus.refused" && result.thirdReason?.startsWith("Sara W."), `a third tab got ${JSON.stringify(result)}`);
      return `claim lapsed ${(result.grantedAfter / 1000).toFixed(1)} s after the last heartbeat; A told "${result.told}"; B's claim survived A's late release`;
    },
  },
  {
    title: "AC4: One at a time: while A holds an item, anyone else's write to it is refused by the api, A's other tab included; A's own passes",
    run: async ({ page }) => {
      await setMode(token, workspace.uuid, "one_at_a_time");
      const item = await countItem(token, r, `F8-S11 held ${Date.now()}`);
      await page0(page);
      try {
        const holder = await page.evaluate(
          async ({ token, url, topic, sheet, item }) => {
            const a = await window.__rt.open(token, url, topic);
            window.__holder = a;
            a.send({ type: "item.focus", topic, item_uuid: item, sheet_uuid: sheet });
            await a.wait((f) => f.type === "focus.granted");
            return a.clientId;
          },
          { token, url: WS_URL, topic, sheet: r.sheet, item: item.uuid },
        );
        const path = `${r.takeoff}/item/${item.uuid}`;
        const other = await call(tokenB, "DELETE", path, null, { "X-Client-Id": crypto.randomUUID() });
        const otherTab = await call(token, "PATCH", path, { name: "renamed by another tab" }, { "X-Client-Id": crypto.randomUUID() });
        const own = await call(token, "PATCH", path, { name: "renamed by the holder" }, { "X-Client-Id": holder });
        await page.evaluate(() => window.__holder.ws.close());
        expect(other.status === 409 && other.body.detail === "Bench E. is editing this item right now.", `B's delete: ${other.status} ${JSON.stringify(other.body)}`);
        expect(otherTab.status === 409, `A's other tab: ${otherTab.status}`);
        expect(own.status === 200, `the holder: ${own.status} ${JSON.stringify(own.body)}`);
        return `B: 409 "${other.body.detail}" · A's other tab: 409 · the holder: 200`;
      } finally {
        await setMode(token, workspace.uuid, "work_together");
        await removeItem(token, r, item.uuid);
      }
    },
  },
  {
    title: "AC5: Work together: two tabs hold the same item; both are granted and each sees the other",
    run: async ({ page }) => {
      await setMode(token, workspace.uuid, "work_together");
      await page0(page);
      const seen = await page.evaluate(
        async ({ token, tokenB, url, urlB, topic, sheet }) => {
          const item = crypto.randomUUID();
          const focus = { type: "item.focus", topic, item_uuid: item, sheet_uuid: sheet };
          const a = await window.__rt.open(token, url, topic);
          const b = await window.__rt.open(tokenB, urlB, topic);
          a.send(focus);
          b.send(focus);
          const granted = await Promise.all([a, b].map((c) => c.wait((f) => f.type === "focus.granted" && f.item_uuid === item)));
          const aSeesB = await a.wait((f) => f.type === "presence.changed" && !f.removed && f.entry.client_id === b.clientId);
          const bSeesA = await b.wait((f) => f.type === "presence.changed" && !f.removed && f.entry.client_id === a.clientId);
          a.ws.close();
          b.ws.close();
          return { granted: granted.filter(Boolean).length, aSeesB: aSeesB?.entry.name, bSeesA: bSeesA?.entry.name, exclusive: aSeesB?.entry.exclusive };
        },
        { token, tokenB, url: WS_URL, urlB: WS_URL_B, topic, sheet: r.sheet },
      );
      expect(seen.granted === 2, `${seen.granted} granted`);
      expect(seen.aSeesB === "Sara W." && seen.bSeesA === "Bench E.", JSON.stringify(seen));
      expect(seen.exclusive === false, "a Work together hold is exclusive");
      return `both granted; A sees "${seen.aSeesB}", B sees "${seen.bSeesA}", neither exclusive`;
    },
  },
]);

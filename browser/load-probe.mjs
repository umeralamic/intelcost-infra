// The api under load, as a person's tab meets it: GET /api/auth/me, a socket's open to
// `ready`, and a PATCH to its event heard. 30 samples, medians and tails. Run it beside a
// regression to see what parallel fixtures (or a feature) cost the api (D-44).
//
//   docker compose --profile browser run --rm browser node scripts/load-probe.mjs
import { APP, openBrowser } from "./lib/bench.mjs";
import { WS_URL, call } from "./lib/realtime.mjs";
import { lookup } from "node:dns/promises";
import { riversideWorld } from "./lib/world.mjs";
const world = await riversideWorld();
const host = (await lookup("host.docker.internal")).address;
const browser = await openBrowser();
const page = await (await browser.newContext()).newPage();
await page.goto(`${APP}/login`);
const topic = `ws:${world.workspace.uuid}`;
const me = [], ready = [], deliver = [];
let misses = 0;
for (let i = 0; i < 30; i++) {
  let t = Date.now();
  await fetch(`http://${host}:8000/api/auth/me`, { headers: { authorization: `Bearer ${world.token}` } });
  me.push(Date.now() - t);
  await page.evaluate(({ url, token, topic }) => new Promise((resolve) => {
    const ws = new WebSocket(url); window.__m = { opened: Date.now() };
    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token, client_id: crypto.randomUUID() }));
    ws.onmessage = (e) => { const f = JSON.parse(e.data);
      if (f.type === "ready") { window.__m.ready = Date.now(); ws.send(JSON.stringify({ type: "join", topic })); }
      if (f.type === "joined") { window.__m.joined = Date.now(); resolve(); }
      if (f.type === "event") window.__m.event = Date.now(); };
    window.__ws = ws; setTimeout(resolve, 20000);
  }), { url: WS_URL, token: world.sara.token, topic });
  const sent = await page.evaluate(() => Date.now());
  await call(world.token, "PATCH", `/api/workspace/${world.workspace.uuid}`, { name: `M ${i}` });
  await page.waitForFunction(() => window.__m.event, undefined, { timeout: 15000 }).catch(() => misses++);
  const m = await page.evaluate(() => { window.__ws.close(); return window.__m; });
  if (m.ready) ready.push(m.ready - m.opened); else misses++;
  if (m.event) deliver.push(m.event - sent);
  await new Promise((r) => setTimeout(r, 1500));
}
const stat = (a) => { const s = [...a].sort((x, y) => x - y); return a.length ? `median ${s[s.length >> 1]} ms, p90 ${s[Math.floor(s.length * 0.9)]} ms, max ${s.at(-1)} ms (n ${a.length})` : "none"; };
console.log(`GET /api/auth/me       ${stat(me)}`);
console.log(`socket open -> ready   ${stat(ready)}`);
console.log(`PATCH -> event heard   ${stat(deliver)}`);
console.log(`misses ${misses}`);
await browser.close();

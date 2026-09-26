// F8: what a person reads in DevTools > Network > WS, read by a fixture instead.
//
// An init script wraps the page's WebSocket so every socket the app opens is recorded:
// when it opened, every frame each way, and the close code and reason. Playwright's own
// websocket events carry no close code, and the close code is half of what F8 promises.
//
// Hand-written sockets ("a socket that sends nothing", "a join for someone else's
// workspace") are opened from a page with the NATIVE WebSocket, so they are not counted
// as the app's. The fixture image's Node is 20, which has no WebSocket of its own; the
// one check that needs a forged Origin header uses a raw HTTP upgrade instead.

import { request } from "node:http";
import { lookup } from "node:dns/promises";

import {
  apiAccept,
  apiLogin,
  apiRegister,
  clearMail,
  firstWorkspace,
  invite,
  inviteTokenFromMail,
} from "./bench.mjs";

export const WS_URL = "ws://localhost:8000/api/realtime";

/** Window B of the realtime profile: its own app, on its own api process (F8-S5). */
export const APP_B = "http://localhost:5174";
export const WS_URL_B = "ws://localhost:8010/api/realtime";

/** The seated second estimator for two-window checks, "Sara W." on the socket. */
export const WINDOW_B = { email: "window-b@bench.intelcost.io", password: "bench-password-1" };

/**
 * Window B's account, seated in the owner's workspace if this bench has never had it.
 *
 * Not in the seed, so a fresh bench makes it here, the first time a fixture needs it,
 * through the real invitation path, as `seatedMember` does. Returns its access token.
 */
export async function ensureWindowB() {
  try {
    return await apiLogin(WINDOW_B.email, WINDOW_B.password);
  } catch {
    // Not there yet.
  }
  const owner = await apiLogin();
  const workspace = await firstWorkspace(owner);
  await clearMail();
  await invite(owner, workspace.uuid, WINDOW_B.email, "estimator");
  const inviteToken = await inviteTokenFromMail(WINDOW_B.email);
  await apiRegister(WINDOW_B.email, WINDOW_B.password, "Sara Williams");
  const token = await apiLogin(WINDOW_B.email, WINDOW_B.password);
  const accepted = await apiAccept(token, inviteToken);
  if (accepted.status !== 200) throw new Error(`seating window B: ${accepted.status}`);
  return token;
}

/** Sign in through the UI of either app. */
export async function signInAt(page, app, email, password = "bench-password-1") {
  await page.goto(`${app}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
}

/** A second browser window beside the step's own, recording its sockets. The caller
 *  closes it. */
export async function secondWindow(context) {
  const other = await context.browser().newContext({ viewport: { width: 1440, height: 900 } });
  await recordSockets(other);
  return { context: other, page: await other.newPage() };
}

/** Wait until the app's current socket on this page has `joined` a topic. */
export async function joinedTopic(page, topic, timeout = 20000) {
  try {
    return await waitFor(
      async () => {
        const last = (await appSockets(page)).at(-1);
        return last?.received.find((f) => f.type === "joined" && f.topic === topic);
      },
      `joined ${topic}`,
      timeout,
    );
  } catch (error) {
    const seen = (await appSockets(page)).map((s) => ({
      url: s.url,
      close: s.close,
      sent: s.sent.filter((f) => f.type !== "ping").map((f) => `${f.type} ${f.topic ?? ""}`),
      got: s.received.filter((f) => f.type !== "pong").map((f) => `${f.type} ${f.topic ?? f.reason ?? ""}`),
    }));
    throw new Error(`${error.message} on ${page.url()}; sockets: ${JSON.stringify(seen)}`);
  }
}

/** Every event frame the app's sockets on this page received, optionally by name. */
export async function eventsOn(page, name) {
  return (await appSockets(page))
    .flatMap((s) => s.received)
    .filter((f) => f.type === "event" && (!name || f.name === name));
}

/** A hand-written request with the headers a tab sends, from Node. */
export async function call(token, method, path, body, headers = {}, port = 8000) {
  const host = (await lookup("host.docker.internal")).address;
  const response = await fetch(`http://${host}:${port}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

/** Record every socket this context's pages open. Call before the first navigation. */
export async function recordSockets(context) {
  await context.addInitScript(() => {
    const Native = window.WebSocket;
    window.__icNativeWebSocket = Native;
    window.__icSockets = [];
    window.WebSocket = class extends Native {
      constructor(url, protocols) {
        super(url, protocols);
        const rec = { url: String(url), opened: Date.now(), sent: [], received: [], close: null };
        window.__icSockets.push(rec);
        const send = this.send.bind(this);
        this.send = (data) => {
          rec.sent.push({ at: Date.now(), data: String(data) });
          return send(data);
        };
        this.addEventListener("message", (e) => rec.received.push({ at: Date.now(), data: String(e.data) }));
        this.addEventListener("close", (e) => {
          rec.close = { code: e.code, reason: e.reason, at: Date.now() };
        });
      }
    };
  });
}

/** Every recorded socket on this page, frames parsed. */
export async function sockets(page) {
  const raw = await page.evaluate(() => window.__icSockets ?? []);
  const parse = (list) => list.map((f) => ({ at: f.at, ...JSON.parse(f.data) }));
  return raw.map((s) => ({ ...s, sent: parse(s.sent), received: parse(s.received) }));
}

/** The app's realtime sockets on this page, oldest first. */
export async function appSockets(page) {
  return (await sockets(page)).filter((s) => s.url.endsWith("/api/realtime"));
}

/** Poll until `probe` returns something truthy, or fail naming what was awaited. */
export async function waitFor(probe, what, timeout = 15000, every = 250) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    last = await probe();
    if (last) return last;
    await new Promise((r) => setTimeout(r, every));
  }
  throw new Error(`timed out after ${timeout / 1000}s waiting for ${what}`);
}

/** The newest app socket that has said `ready`. */
export async function readySocket(page, timeout = 20000) {
  return waitFor(
    async () => (await appSockets(page)).reverse().find((s) => s.received.some((f) => f.type === "ready")),
    "the app's socket to be ready",
    timeout,
  );
}

/**
 * A hand-written socket from inside the page. Sends `frames` in order once open
 * (each waiting `gapMs` for the answer), and resolves with everything it heard and how
 * it closed, or with `open: true` if it was still open after `waitMs`.
 */
export async function rawSocket(page, frames, waitMs = 3000, gapMs = 400, pingMs = 0, url = WS_URL) {
  return page.evaluate(
    ({ url, frames, waitMs, gapMs, pingMs }) =>
      new Promise((resolve) => {
        const started = Date.now();
        const Native = window.__icNativeWebSocket ?? window.WebSocket;
        const ws = new Native(url);
        const heard = [];
        let done = false;
        const finish = (result) => {
          if (done) return;
          done = true;
          resolve({ ...result, heard, afterMs: Date.now() - started });
        };
        // A socket that must outlive the api's 20 s silence limit keeps itself alive.
        const pinger = pingMs
          ? setInterval(() => ws.readyState === 1 && ws.send('{"type":"ping"}'), pingMs)
          : null;
        ws.onmessage = (e) => {
          const frame = JSON.parse(e.data);
          if (frame.type !== "pong") heard.push(frame);
        };
        ws.onclose = (e) => {
          if (pinger) clearInterval(pinger);
          finish({ code: e.code, reason: e.reason, open: false });
        };
        ws.onopen = async () => {
          for (const frame of frames) {
            ws.send(JSON.stringify(frame));
            await new Promise((r) => setTimeout(r, gapMs));
          }
        };
        setTimeout(() => {
          if (pinger) clearInterval(pinger);
          finish({ open: true });
          ws.close();
        }, waitMs);
      }),
    { url, frames, waitMs, gapMs, pingMs },
  );
}

/** The HTTP status of a WebSocket upgrade sent with a given Origin, from Node, because
 *  a page cannot forge its own Origin. 101 is accepted; 403 is refused. */
export async function upgradeStatus(origin) {
  const host = (await lookup("host.docker.internal")).address;
  return new Promise((resolve, reject) => {
    const req = request({
      host,
      port: 8000,
      path: "/api/realtime",
      headers: {
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Version": "13",
        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
        Origin: origin,
      },
    });
    req.on("upgrade", (res, socket) => {
      socket.destroy();
      resolve(res.statusCode);
    });
    req.on("response", (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", reject);
    req.end();
  });
}

/** Both tokens, where `apiLogin` returns only the access token. */
export async function loginPair(email, password) {
  const host = (await lookup("host.docker.internal")).address;
  const response = await fetch(`http://${host}:8000/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`login ${email}: ${response.status}`);
  return response.json();
}

/** "Sara W.", the api's rule (D-33), for asserting what the api sent. */
export function shortName(fullName, email) {
  const parts = (fullName ?? "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts.at(-1)[0].toUpperCase()}.`;
  if (parts.length === 1) return parts[0];
  return email.split("@")[0];
}

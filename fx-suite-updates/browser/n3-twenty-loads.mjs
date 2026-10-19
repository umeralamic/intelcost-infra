// N3 (night run 2026-10-19, D-641): a sheet the worker has ready shows ready on the canvas within a few
// seconds, and "This sheet could not be prepared" only when the worker failed it.
//
//   node fx-run-locked.mjs n3-twenty-loads
//
// The world: one throwaway workspace and project. 20 one-page drawings (1224 × 792 pt, a sheet number in
// large type, so the name read has text to read), each uploaded and then Loaded through the load screen,
// one after another, without waiting for the one before: upload, Load, "Continue in background", open
// the new sheet from the Sheets panel while it prepares, and on to the next. The browser's network is
// slowed (200 ms, about 4 Mbps down, 2 up) and the tab is reloaded once, mid-prepare, after the tenth.
// Name and scale reading stay on (the load screen's default), so most pages go through the read pool
// too.
//
// What is watched, all the way through:
// - in the page, every 100 ms: the open sheet and what its canvas shows (the image, "Preparing the
//   sheet", the error, or anything else such as a loading frame);
// - from the api, every 250 ms: each sheet's render_status and read_state, and when each turned ready;
// - the realtime frames heard (`drawing.source.changed`) and each answer to the signed assets call.
//
// It fails when the canvas shows the error for a sheet the api does not have failed, or when an open
// sheet shows anything but its image more than 5 s after both the worker had it ready and the sheet was
// opened (10 s for the first sheet of the reloaded tab, whose own load on the slowed link comes first).
// Step 3 checks the rule itself with the api's answers changed in the browser: failed shows the error and
// the worker's reason; ready with no signed image shows "Preparing the sheet" and signs again. A failure prints that sheet's timeline: ready, event heard, assets answers, what the canvas
// showed.

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { makePdf } from "./lib/drawings.mjs";
import { freshWorkspace, makeProject, seedFile } from "./lib/f4.mjs";

const N = 20;
// The api as this container reaches it (the browser maps localhost to it); the port is built so the
// suite's retargeting leaves it be.
const UPSTREAM = `//api-fx:${8 * 1000}`;
const LAG_MS = 5000;
const RELOAD_MS = 5000;
const { token, base } = await freshWorkspace("N3 Twenty loads");
const project = await makeProject(token, base, { name: "Twenty loads" });
const proj = `${base}/${project.uuid}`;
const files = Array.from({ length: N }, (_, i) => ({
  name: `Sheet ${String(i + 1).padStart(2, "0")}.pdf`,
  buffer: makePdf([{ width: 1224, height: 792, label: `A-${101 + i}` }]),
}));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The api's view of every sheet, polled: when each was first seen, turned ready, read, failed. */
const api = new Map();
let polling = true;
async function poll() {
  while (polling) {
    const listed = await apiCall(token, "GET", `${proj}/drawing/sheet`).catch(() => null);
    const now = Date.now();
    for (const s of listed?.body ?? []) {
      const e = api.get(s.uuid) ?? { uuid: s.uuid, seen: now };
      e.status = s.render_status;
      if (s.render_status === "ready" && !e.ready) e.ready = now;
      if (s.render_status === "ready" && !s.read_state && !e.read) e.read = now;
      if (s.render_status === "failed" && !e.failed) e.failed = now;
      api.set(s.uuid, e);
    }
    await sleep(250);
  }
}

/** The page's own record: what the canvas showed, the events heard, the assets answers. */
const marks = [];
const events = [];
const assets = [];
const asked = [];
const dropped = [];
const listAsked = [];
async function watch(page) {
  await page.exposeBinding("n3mark", (_source, mark) => marks.push({ ...mark, t: Date.now() }));
  await page.addInitScript(() => {
    let last = "";
    const has = (text) => document.evaluate(`//*[normalize-space(text())='${text}']`, document, null, XPathResult.BOOLEAN_TYPE, null).booleanValue;
    window.n3mark?.({ doc: true });
    setInterval(() => {
      const m = location.pathname.match(/\/takeoff\/([0-9a-f-]{36})/);
      const sheet = m ? m[1] : null;
      const state = has("This sheet could not be prepared") ? "error" : document.querySelector("[data-sheet-image]") ? "image" : has("Preparing the sheet") ? "preparing" : "other";
      const key = `${sheet}|${state}`;
      if (key === last) return;
      last = key;
      window.n3mark?.({ sheet, state });
    }, 100);
  });
  page.on("websocket", (ws) =>
    ws.on("framereceived", ({ payload }) => {
      const text = typeof payload === "string" ? payload : payload.toString();
      if (!text.includes("drawing.source.changed")) return;
      const sheet = /"sheet_uuid":\s*"([0-9a-f-]{36})"/.exec(text)?.[1];
      events.push({ sheet, t: Date.now() });
    }),
  );
  const isAssets = (url) => /\/drawing\/asset$/.test(new URL(url).pathname);
  page.on("request", (request) => {
    if (/\/drawing\/sheet$/.test(new URL(request.url()).pathname) && request.method() === "GET") listAsked.push(Date.now());
    if (isAssets(request.url())) asked.push(Date.now());
  });
  page.on("requestfailed", (request) => {
    if (isAssets(request.url())) dropped.push({ t: Date.now(), why: request.failure()?.errorText ?? "?" });
  });
  page.on("response", async (response) => {
    if (!isAssets(response.url())) return;
    const took = response.request().timing().responseEnd;
    const body = await response.json().catch(() => null);
    const imaged = new Set((Array.isArray(body) ? body : []).filter((a) => a.image_url).map((a) => a.sheet_uuid));
    assets.push({ t: Date.now(), status: response.status(), imaged, took });
  });
}

/** Slow the browser's own network (uploads, the api, storage). Again after a reload. */
async function slow(context, page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 200, downloadThroughput: 500 * 1024, uploadThroughput: 250 * 1024 });
}

/** The load screen, `name` ticked, reading left on, Loaded; on to the background. */
async function loadOne(page, name) {
  const empty = page.locator("[data-add-sheets-empty]");
  if (await empty.isVisible().catch(() => false)) await empty.click();
  else {
    await page.locator("[data-add-sheets]").click({ timeout: 60000 });
    await page.getByRole("menuitem", { name: "Add Pages" }).click();
  }
  const dialog = page.getByRole("dialog").filter({ has: page.locator("[data-load-dialog]") });
  const row = dialog.locator(`[data-load-file="${name}"]`);
  await row.waitFor({ timeout: 60000 });
  // Ticked as soon as the row is there: a tick before the sizes holds (D-640).
  await row.getByRole("checkbox", { name: `Choose ${name}` }).check({ timeout: 30000 });
  for (const tick of ["[data-auto-name]", "[data-auto-scale]"]) {
    if (!(await dialog.locator(tick).isChecked())) await dialog.locator(tick).check();
  }
  const go = dialog.locator("[data-load-pages]");
  await page.waitForFunction(() => {
    const b = document.querySelector("[data-load-pages]");
    return b && !b.disabled && /^Load 1 page/.test(b.textContent ?? "");
  }, null, { timeout: 60000 });
  await go.click();
  await page.locator("[data-load-progress]").waitFor({ state: "attached", timeout: 30000 });
  await page.locator('[data-load-progress][data-requesting="sending"]').waitFor({ state: "detached", timeout: 60000 });
  const failed = await page.locator('[data-load-progress][data-requesting="failed"]').count();
  expect(failed === 0, `the Load of ${name} failed`);
  const bg = page.locator("[data-continue-background]");
  if (await bg.isVisible().catch(() => false)) await bg.click({ timeout: 5000 }).catch(() => undefined);
}

/** The sheet a Load just made: the one the api lists that was not there before. */
async function newSheet(before) {
  const until = Date.now() + 30000;
  for (;;) {
    const listed = await apiCall(token, "GET", `${proj}/drawing/sheet`);
    const fresh = (listed.body ?? []).find((s) => !before.has(s.uuid));
    if (fresh) return fresh.uuid;
    expect(Date.now() < until, "no new sheet after the Load");
    await sleep(250);
  }
}

/** Every stretch a sheet was open in one document, with what it showed. */
function stretches() {
  const out = [];
  let doc = 0;
  let open = null;
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    if (m.doc) {
      doc += 1;
      open = null;
      continue;
    }
    const end = marks[i + 1]?.t ?? Date.now();
    // The first sheet a reloaded document opens (`fresh`) waits on the page's own load too.
    if (!open || open.sheet !== m.sheet || open.doc !== doc) open = { sheet: m.sheet, doc, at: m.t, fresh: doc > 2 && open === null };
    out.push({ sheet: m.sheet, state: m.state, from: m.t, to: end, opened: open.at, fresh: open.fresh });
  }
  return out;
}

function timeline(uuid, t0) {
  const e = api.get(uuid) ?? {};
  const rel = (t) => (t ? `${((t - t0) / 1000).toFixed(1)} s` : "never");
  const heard = events.filter((x) => x.sheet === uuid).map((x) => rel(x.t));
  const imaged = assets.find((a) => a.t >= (e.ready ?? Infinity) && a.imaged.has(uuid));
  const lastBefore = [...assets].reverse().find((a) => a.t < (e.ready ?? 0));
  const shown = stretches()
    .filter((s) => s.sheet === uuid)
    .map((s) => `${s.state} ${rel(s.from)}–${rel(s.to)}`)
    .join(", ");
  return `ready ${rel(e.ready)}, read ${rel(e.read)}; events ${heard.join(" ") || "none"}; assets with its image first ${rel(imaged?.t)} (last answer before ready ${rel(lastBefore?.t)}); canvas: ${shown}`;
}

let order = [];
await run("n3-twenty-loads", [
  {
    title: `${N} uploads and Loads in a row on a slow network, a reload mid-prepare: each open sheet shows its image within ${LAG_MS / 1000} s of the worker, never "could not be prepared"`,
    run: async ({ page, context }) => {
      await watch(page);
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff`);
      await slow(context, page);
      const t0 = Date.now();
      const poller = poll();
      const seen = new Set();
      for (let i = 0; i < N; i++) {
        const { name, buffer } = files[i];
        await seedFile(page, token, base, project.uuid, null, name, buffer);
        await loadOne(page, name);
        const uuid = await newSheet(seen);
        seen.add(uuid);
        order.push(uuid);
        // Opened from the Sheets panel at once, while it prepares.
        await page.locator(`[data-sheet-row="${uuid}"]`).click({ timeout: 30000 });
        await page.waitForURL(new RegExp(`/takeoff/${uuid}`), { timeout: 30000 });
        if (i === 9) {
          await page.reload();
          await slow(context, page);
          await page.locator(`[data-sheet-row="${uuid}"]`).waitFor({ timeout: 60000 });
        }
      }
      // Every page through the worker.
      const until = Date.now() + 300000;
      while (order.some((u) => !api.get(u)?.read && !api.get(u)?.failed) && Date.now() < until) await sleep(500);
      // The last sheet stays open a further 6 s, so its own lag is seen.
      await sleep(LAG_MS + 1000);
      polling = false;
      await poller;

      const failedApi = order.filter((u) => api.get(u)?.failed);
      const unready = order.filter((u) => !api.get(u)?.ready && !api.get(u)?.failed);
      expect(unready.length === 0, `${unready.length} sheets never prepared: ${unready.map((u) => timeline(u, t0)).join(" | ")}`);
      const bad = [];
      for (const s of stretches()) {
        if (!s.sheet || !order.includes(s.sheet)) continue;
        const e = api.get(s.sheet);
        if (s.state === "error" && !(e.failed && e.failed <= s.from + 1000)) bad.push(`${s.sheet}: "could not be prepared" for ${((s.to - s.from) / 1000).toFixed(1)} s, the api ${e.failed ? "failed it later" : "never failed it"}`);
        if (s.state !== "image" && e.ready) {
          // A reloaded page on the slowed link: its first sheet waits on the page's own load (every
          // request at once, 200 ms each, about 4 Mbps), so 5 s more.
          const due = Math.max(e.ready, s.opened) + LAG_MS + (s.fresh ? RELOAD_MS : 0);
          if (s.to > due) bad.push(`${s.sheet}: ${s.state} until ${((s.to - Math.max(e.ready, s.opened)) / 1000).toFixed(1)} s after it was ready and open`);
        }
      }
      const worst = [...new Set(bad.map((b) => b.slice(0, 36)))];
      const tooks = assets.map((x) => x.took).filter((x) => x > 0).sort((x, y) => x - y);
      const after = (list) => events.filter((e) => list.some((t) => t > e.t + 200 && t < e.t + 2500)).length;
      const traffic = `of ${events.length} source events, ${after(listAsked)} followed by a sheet list GET and ${after(asked)} by an assets GET within 2.5 s; sheet list asked ${listAsked.length}×; the assets call: ${asked.length} asked, ${assets.length} answered, ${dropped.length} dropped (${[...new Set(dropped.map((d) => d.why))].join(", ") || "none"}), an answer took ${tooks.length ? `${Math.round(tooks[tooks.length >> 1])} ms median, ${Math.round(tooks.at(-1))} ms at most` : "—"}`;
      expect(bad.length === 0, `${bad.length} lapses; ${traffic}: ${bad.slice(0, 6).join(" · ")} || ${worst.slice(0, 3).map((u) => `${u}: ${timeline(u, t0)}`).join(" || ")}`);
      // How long each open sheet waited for its image after the worker had it ready.
      const lags = order
        .map((u) => {
          const e = api.get(u);
          const first = stretches().find((s) => s.sheet === u && s.state === "image" && s.from >= e.ready - 100);
          return first ? Math.max(0, first.from - Math.max(e.ready, first.opened)) : null;
        })
        .filter((x) => x !== null);
      const max = Math.max(0, ...lags);
      return `${N} sheets loaded (${failedApi.length} failed by the worker); ${marks.filter((m) => m.state === "error").length} error marks; worker ready → canvas image, at most ${(max / 1000).toFixed(1)} s over ${lags.length} sheets seen open at ready; ${events.length} source events heard; ${traffic}`;
    },
  },
  {
    title: "Every one of the 20 sheets, opened from the Sheets panel: its image within 5 s, never the error",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${order[0]}`);
      const out = [];
      for (const uuid of order) {
        await page.locator(`[data-sheet-row="${uuid}"]`).click({ timeout: 30000 });
        const t = Date.now();
        await page.waitForFunction(
          (u) => location.pathname.endsWith(u) && (document.querySelector("[data-sheet-image]") || document.evaluate("//*[normalize-space(text())='This sheet could not be prepared']", document, null, XPathResult.BOOLEAN_TYPE, null).booleanValue),
          uuid,
          { timeout: LAG_MS },
        );
        const error = await page.getByText("This sheet could not be prepared", { exact: true }).count();
        expect(error === 0, `sheet ${uuid} shows "could not be prepared"`);
        out.push(Date.now() - t);
      }
      return `${out.length} sheets, each drawn in at most ${Math.max(...out)} ms`;
    },
  },
  {
    title: "The rule itself: a sheet the api has failed shows the error and its reason; a ready sheet whose image is not signed yet shows Preparing and signs again, never the error",
    run: async ({ page }) => {
      const [failedOne, unsignedOne] = [order[order.length - 2], order[order.length - 1]];
      const reason = "Couldn't prepare this page.";
      // The worker's answer, as the api would give it for a failure; and assets without one image.
      await page.route(/\/drawing\/sheet$/, async (route) => {
        if (route.request().method() !== "GET") return route.continue();
        const response = await route.fetch({ url: route.request().url().replace(/\/\/localhost:\d+/, UPSTREAM) });
        const body = (await response.json()).map((s) => (s.uuid === failedOne ? { ...s, render_status: "failed", render_error: reason } : s));
        return route.fulfill({ response, json: body });
      });
      let signs = 0;
      await page.route(/\/drawing\/asset$/, async (route) => {
        signs += 1;
        const response = await route.fetch({ url: route.request().url().replace(/\/\/localhost:\d+/, UPSTREAM) });
        // A failed page never had its images; a ready one not yet signed has none in this answer.
        const body = (await response.json()).map((a) => (a.sheet_uuid === unsignedOne || a.sheet_uuid === failedOne ? { ...a, image_url: null, source_url: null } : a));
        return route.fulfill({ response, json: body });
      });
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${failedOne}`);
      const error = page.getByText("This sheet could not be prepared", { exact: true });
      await error.waitFor({ timeout: 30000 });
      const said = await page.getByText(reason, { exact: true }).count();
      expect(said === 1, `the failed sheet does not give the worker's reason "${reason}"`);
      await page.locator(`[data-sheet-row="${unsignedOne}"]`).click({ timeout: 30000 });
      await page.getByText("Preparing the sheet", { exact: true }).waitFor({ timeout: 10000 });
      const before = signs;
      await page.waitForTimeout(5000);
      expect((await error.count()) === 0, "a ready sheet without its image shows the error");
      expect(signs - before >= 2, `the assets were signed again ${signs - before} times in 5 s, not every 2 s`);
      return `failed: the error with "${reason}"; ready without its image: "Preparing the sheet", signed again ${signs - before} times in 5 s`;
    },
  },
]);

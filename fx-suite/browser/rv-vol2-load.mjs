// Item 8 of the row-virtualisation brief (2026-10-19): D-641's per-page announcements on a big set. A bench
// check, not a fixture: it reports figures.
//
//   cp <the 117 MB Vol2 PDF> fx-suite/browser/tmp/vol2.pdf   (git-ignored; deleted after)
//   node fx-run-locked.mjs rv-vol2-load
//
// The world: a throwaway workspace and project on the fx stack (its own MinIO, nothing reaches AWS). The set is
// uploaded through the api, then every page ticked on the load screen ("Select all") and Loaded, name and
// scale reading on as the screen leaves them.
//
// What it records, from the Load until every sheet's image is there and then 10 s:
// - every realtime frame heard, by event, and the per-page announcements (`drawing.source.changed`);
// - every frame the page drew (requestAnimationFrame), for the frame rate and the stalls;
// - every 8 s, a sheet clicked in the Sheets panel: the time until the canvas shows it (its image, or
//   "Preparing the sheet");
// - the api's render_status of every sheet, polled, and the app's own signed-assets answers: when each sheet
//   first has its image.

import fs from "node:fs";

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, seedFile } from "./lib/f4.mjs";

const FILE = "/drive/scripts/tmp/vol2.pdf";
const NAME = "W912QR26RA012_Plans_Vol2_0000.pdf";
const { token, base } = await freshWorkspace("RV Vol2 load");
const project = await makeProject(token, base, { name: "Vol2 load" });
const proj = `${base}/${project.uuid}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const s = (ms) => `${(ms / 1000).toFixed(1)} s`;

await run("rv-vol2-load", [
  {
    title: "Vol2 (117 MB, 96 pages): every page Loaded; announcements, frame rate, Sheets panel response, time to every image",
    run: async ({ page }) => {
      // Signed in first: the parts go up from the app's own page.
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff`);
      const buffer = fs.readFileSync(FILE);
      const file = await seedFile(page, token, base, project.uuid, null, NAME, buffer);
      expect(file?.uuid, "no file");
      await page.reload();

      // The page's own record.
      const frames = { byEvent: {}, sourceChanged: 0 };
      const heard = [];
      page.on("websocket", (ws) =>
        ws.on("framereceived", ({ payload }) => {
          const text = typeof payload === "string" ? payload : payload.toString();
          const event = /"event":\s*"([a-z_.]+)"/.exec(text)?.[1] ?? /"type":\s*"([a-z_.]+)"/.exec(text)?.[1] ?? "other";
          frames.byEvent[event] = (frames.byEvent[event] ?? 0) + 1;
          if (text.includes("drawing.source.changed")) {
            frames.sourceChanged += 1;
            heard.push(Date.now());
          }
        }),
      );
      const imaged = new Map();
      page.on("response", async (response) => {
        if (!/\/drawing\/asset$/.test(new URL(response.url()).pathname)) return;
        const body = await response.json().catch(() => null);
        for (const a of Array.isArray(body) ? body : []) if (a.image_url && !imaged.has(a.sheet_uuid)) imaged.set(a.sheet_uuid, Date.now());
      });

      // The load screen: the set ticked, every page selected, Loaded.
      const empty = page.locator("[data-add-sheets-empty]");
      await empty.waitFor({ timeout: 60000 });
      await empty.click();
      const dialog = page.getByRole("dialog").filter({ has: page.locator("[data-load-dialog]") });
      const row = dialog.locator(`[data-load-file="${NAME}"]`);
      await row.waitFor({ timeout: 60000 });
      await row.getByRole("checkbox", { name: `Choose ${NAME}` }).check({ timeout: 30000 });
      await row.click();
      const header = dialog.locator(`[data-set-header="${NAME}"]`);
      await header.locator("[data-page-count]").waitFor({ timeout: 300000 });
      await header.getByRole("button", { name: "Select all" }).click();
      const total = Number(/of (\d+) pages/.exec(await header.locator("[data-page-count]").textContent())?.[1]);
      await page.waitForFunction((n) => new RegExp(`^Load ${n} pages`).test(document.querySelector("[data-load-pages]")?.textContent ?? ""), total, { timeout: 60000 });

      await page.evaluate(() => {
        window.__f = [];
        window.__long = [];
        let last = performance.now();
        const tick = (t) => {
          if (t - last > 250) window.__long.push([Math.round(performance.timeOrigin + last), Math.round(t - last)]);
          window.__f.push(t - last);
          last = t;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const t0 = Date.now();
      await dialog.locator("[data-load-pages]").click();
      await page.locator("[data-load-progress]").waitFor({ state: "attached", timeout: 60000 });
      const bg = page.locator("[data-continue-background]");
      await bg.waitFor({ timeout: 60000 }).catch(() => undefined);
      if (await bg.isVisible().catch(() => false)) await bg.click().catch(() => undefined);

      // Until every sheet is ready and the app has its image, clicking a sheet in the Sheets panel every 8 s.
      const ready = new Map();
      const clicks = [];
      const clickLog = [];
      let nextClick = Date.now() + 8000;
      for (;;) {
        const listed = (await apiCall(token, "GET", `${proj}/drawing/sheet`)).body ?? [];
        for (const sh of listed) if (sh.render_status === "ready" && !ready.has(sh.uuid)) ready.set(sh.uuid, Date.now());
        const failed = listed.filter((sh) => sh.render_status === "failed").length;
        if (listed.length >= total && ready.size + failed >= total && listed.every((sh) => sh.render_status !== "ready" || imaged.has(sh.uuid))) break;
        expect(Date.now() - t0 < 25 * 60000, `not done after 25 min: ${ready.size} ready, ${imaged.size} imaged of ${total}`);
        if (Date.now() >= nextClick && listed.length > 1) {
          nextClick = Date.now() + 8000;
          const rows = page.locator("[data-sheets-panel] [data-sheet-row]");
          const n = await rows.count();
          if (n > 1) {
            const target = rows.nth(Math.floor(Math.random() * n));
            const uuid = await target.getAttribute("data-sheet-row");
            const at = Date.now();
            await target.click({ timeout: 30000 }).catch(() => undefined);
            await page
              .waitForFunction(
                (u) => location.pathname.includes(u) && (Boolean(document.querySelector("[data-sheet-image]")) || document.body.innerText.includes("Preparing the sheet")),
                uuid,
                { timeout: 60000 },
              )
              .then(() => clicks.push(Date.now() - at))
              .catch(() => clicks.push(-1));
            clickLog.push(`${s(at - t0)}: ${clicks.at(-1) < 0 ? "no answer" : s(clicks.at(-1))}`);
          }
        }
        await sleep(500);
      }
      const done = Date.now();
      // The images still to come into the app after the last ready, and 10 s more of frames.
      await sleep(10000);
      const f = await page.evaluate(() => window.__f.slice(1));
      // Each stall over 250 ms: when, how long, and the announcements heard in the 2 s before it.
      const long = (await page.evaluate(() => window.__long)).map(([at, ms]) => `${s(at - t0)} ${ms} ms (${heard.filter((h) => h <= at + ms && h > at - 2000).length} heard)`);
      const sorted = [...f].sort((a, b) => a - b);
      const sum = f.reduce((x, y) => x + y, 0);
      const lastReady = Math.max(...ready.values());
      const lastImage = Math.max(...imaged.values());
      const sortedClicks = [...clicks].filter((c) => c >= 0).sort((a, b) => a - b);
      const out = {
        pages: total,
        ready: ready.size,
        announcements: frames.sourceChanged,
        events: frames.byEvent,
        allReady: s(lastReady - t0),
        everyImage: s(lastImage - t0),
        imageAfterReady: s(lastImage - lastReady),
        fps: Math.round((f.length / sum) * 10000) / 10,
        framesOver100ms: f.filter((x) => x > 100).length,
        framesOver250ms: f.filter((x) => x > 250).length,
        worstFrame: Math.round(sorted.at(-1) ?? 0),
        p95Frame: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
        sheetClicks: clicks.length,
        clickMedian: sortedClicks.length ? s(sortedClicks[Math.floor(sortedClicks.length / 2)]) : null,
        clickWorst: sortedClicks.length ? s(sortedClicks.at(-1)) : null,
        clicksUnanswered: clicks.filter((c) => c < 0).length,
        span: s(done - t0),
        stalls: long,
        clicks: clickLog,
      };
      fs.writeFileSync("/drive/scripts/shots/rv-vol2-load.json", JSON.stringify(out, null, 2));
      expect(out.ready === total, `${out.ready} of ${total} ready`);
      return JSON.stringify(out);
    },
  },
]);

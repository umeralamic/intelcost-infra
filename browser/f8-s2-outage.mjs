// F8-S2 AC3 and F8-S1 AC5: the api goes away and comes back, with a tab open.
//
// Not run on its own: browser/f8-s2.sh starts it, waits for each "PHASE" line, and does
// the docker part (stop, start, restart) while this keeps the page open and watches.
//
//   PHASE stop-api      the runner stops the api for 30 s, then starts it
//   PHASE restart-api   the runner restarts the api

import { SEEDED, expect, run, signInAs } from "./lib/bench.mjs";
import { appSockets, readySocket, recordSockets } from "./lib/realtime.mjs";

const EXPECTED_DELAYS = [1, 2, 4, 8, 8];

/** Watch the page until `until` holds, noting when the indicator and any toast show. */
async function watch(page, until, timeout, seen) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const [indicator, toasts] = await Promise.all([
      page.$("[data-realtime-reconnecting]"),
      page.$$("[data-sonner-toast]"),
    ]);
    if (indicator) {
      if (!seen.indicatorFirst && seen.shot) {
        await page.screenshot({ path: seen.shot.replace(".png", "-indicator.png"), clip: { x: 0, y: 0, width: 1440, height: 120 } });
      }
      seen.indicatorFirst ??= Date.now();
      seen.indicatorLast = Date.now();
    }
    if (toasts.length) seen.toasts = Math.max(seen.toasts, toasts.length);
    if (await until()) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`timed out after ${timeout / 1000}s`);
}

await run("f8-s2-outage", [
  {
    title: "S2 AC3: the api stops for 30 s: backoff 1, 2, 4, 8, 8 s, the indicator after the third failure, no toast; S1 AC5: a restart closes 1012 and the tab comes back",
    run: async ({ page, context, shot }) => {
      await recordSockets(context);
      await signInAs(page, SEEDED.email, SEEDED.password);
      const first = await readySocket(page);
      const seen = { toasts: 0, shot };

      console.log("PHASE stop-api");
      // The runner stops the api: the open socket closes, the retries fail, and after 30 s
      // the api comes back and a new socket reaches `ready`.
      await watch(
        page,
        async () => {
          const all = await appSockets(page);
          return all.length > 1 && all.at(-1).received.some((f) => f.type === "ready");
        },
        150000,
        seen,
      );
      const outage = await appSockets(page);
      const stopClose = outage[0].close;
      const delays = outage
        .slice(1)
        .map((s, i) => (s.opened - outage[i].close.at) / 1000)
        .slice(0, EXPECTED_DELAYS.length);
      const failed = outage.slice(1).filter((s) => !s.received.some((f) => f.type === "ready"));
      const thirdFailure = failed[2]?.close?.at;

      // Let the indicator clear on the new `ready`.
      await page.waitForTimeout(500);
      const stillShowing = await page.$("[data-realtime-reconnecting]");

      console.log("PHASE restart-api");
      const beforeRestart = (await appSockets(page)).length;
      await watch(
        page,
        async () => {
          const all = await appSockets(page);
          return all.length > beforeRestart && all.at(-1).received.some((f) => f.type === "ready");
        },
        90000,
        seen,
      );
      const after = await appSockets(page);
      const restartClose = after[beforeRestart - 1].close;
      const back = after.at(-1).received.find((f) => f.type === "ready").at;
      const restartSeconds = ((back - restartClose.at) / 1000).toFixed(1);

      expect(first === outage[0] || first.opened === outage[0].opened, "the first socket is not the one that was open");
      expect(stopClose?.code === 1012, `stopping the api closed the socket ${stopClose?.code}`);
      delays.forEach((d, i) => {
        const want = EXPECTED_DELAYS[i];
        expect(d >= want - 0.05 && d <= want + 1.2, `retry ${i + 1} waited ${d.toFixed(2)} s, expected about ${want}`);
      });
      expect(failed.length >= 3, `only ${failed.length} failed attempts`);
      expect(seen.indicatorFirst, "the indicator never showed");
      expect(
        seen.indicatorFirst >= thirdFailure - 150,
        `the indicator showed ${((thirdFailure - seen.indicatorFirst) / 1000).toFixed(1)} s before the third failure`,
      );
      expect(!stillShowing, "the indicator is still showing after the socket came back");
      expect(seen.toasts === 0, `${seen.toasts} toast(s) appeared`);
      expect(restartClose.code === 1012, `the restart closed the socket ${restartClose.code}`);

      return (
        `stop: closed ${stopClose.code}; retries waited ${delays.map((d) => d.toFixed(1)).join(", ")} s; ` +
        `${failed.length} failed attempts; indicator from the third failure until ready; no toast · ` +
        `restart: closed ${restartClose.code}, ready again ${restartSeconds} s later`
      );
    },
  },
]);

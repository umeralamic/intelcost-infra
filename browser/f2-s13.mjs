// F2-S13 — a stale bundle recovers instead of white-screening.
//
//   docker compose --profile browser run --rm browser node scripts/f2-s13.mjs
//
// The failure being recovered from is a deploy landing under an open tab: the tab
// holds the previous index.html and asks for an asset hash the server no longer has.
// The app has no code splitting today (deliberately, see the module), so the signal
// that reaches us is an unhandled rejection carrying a module-loading error, which is
// also what a failed modulepreload produces. That is what these steps fire.
//
// The property under test is not "it reloads". It is "it reloads AT MOST ONCE",
// because a reload that fails the same way is a tab that reloads forever.

import { APP, expect, run } from "./lib/bench.mjs";

const STALE = "Failed to fetch dynamically imported module: /assets/index-abc123.js";
const GUARD_KEY = "intelcost.stale-chunk-reloaded-at";

/** Counts loads of the page itself, which is how a reload is observed from out here. */
const countLoads = (page) => {
  const seen = [];
  page.on("load", () => seen.push(Date.now()));
  return seen;
};

/** Fire an unhandled rejection the way a failed dynamic import does.
 *
 *  The rejected promise is caught here on purpose: constructing the event with a live
 *  rejected promise would produce a SECOND, genuine unhandled rejection, and a step
 *  that cannot tell one reload from two would be measuring its own noise. */
const fireRejection = (page, message) =>
  page.evaluate((text) => {
    const reason = new Error(text);
    const promise = Promise.reject(reason);
    promise.catch(() => {});
    window.dispatchEvent(new PromiseRejectionEvent("unhandledrejection", { promise, reason }));
  }, message);

/** A reload, or the confident absence of one. Waits rather than assuming. */
const settled = async (page, loads, expected, what) => {
  try {
    await page.waitForFunction(
      (count) => window.performance.getEntriesByType("navigation").length >= 0 && count >= 0,
      loads.length,
      { timeout: 100 },
    );
  } catch {
    /* only a yield */
  }
  await page.waitForTimeout(2500);
  expect(loads.length === expected, `${what}: ${loads.length} loads, expected ${expected}`);
};

await run("f2-s13", [
  {
    title: "AC1 — a module-loading rejection reloads the page, exactly once",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      await page.waitForSelector("#email");
      const loads = countLoads(page);

      await fireRejection(page, STALE);
      await page.waitForEvent("load", { timeout: 15000 });
      await page.waitForSelector("#email", { timeout: 15000 });
      await settled(page, loads, 1, "after one stale-chunk rejection");

      const guard = await page.evaluate((key) => sessionStorage.getItem(key), GUARD_KEY);
      expect(Boolean(guard), "nothing was written to hold the guard across the reload");
      return `1 reload · guard written at ${new Date(Number(guard)).toISOString()}`;
    },
  },
  {
    title: "AC2 — firing again inside the window does not reload a second time",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      await page.waitForSelector("#email");
      const loads = countLoads(page);

      await fireRejection(page, STALE);
      await page.waitForEvent("load", { timeout: 15000 });
      await page.waitForSelector("#email", { timeout: 15000 });

      // The second one is the whole subtask: this is the tab that would otherwise
      // reload forever, because the chunk is still missing after the reload.
      await fireRejection(page, STALE);
      await fireRejection(page, STALE);
      await settled(page, loads, 1, "after three rejections inside the window");
      return `3 rejections, 1 reload`;
    },
  },
  {
    title: "AC3 — past the window, it recovers again",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      await page.waitForSelector("#email");
      const loads = countLoads(page);

      await fireRejection(page, STALE);
      await page.waitForEvent("load", { timeout: 15000 });
      await page.waitForSelector("#email", { timeout: 15000 });

      // Rather than idling for the window, age the stored timestamp. Waiting 15s of
      // real time proves the same thing and makes the pass 15s longer every run.
      await page.evaluate(
        ([key, age]) => sessionStorage.setItem(key, String(Date.now() - age)),
        [GUARD_KEY, 20_000],
      );

      await fireRejection(page, STALE);
      await page.waitForEvent("load", { timeout: 15000 });
      await page.waitForSelector("#email", { timeout: 15000 });
      await settled(page, loads, 2, "after the window expired");
      return `2 reloads, 20s apart in the guard's reckoning`;
    },
  },
  {
    title: "AC4 — an unrelated rejection is left entirely alone",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      await page.waitForSelector("#email");
      const loads = countLoads(page);

      await fireRejection(page, "boom");
      await fireRejection(page, "TypeError: undefined is not a function");
      await settled(page, loads, 0, "after two unrelated rejections");

      const guard = await page.evaluate((key) => sessionStorage.getItem(key), GUARD_KEY);
      expect(guard === null, "an unrelated rejection wrote the reload guard");
      return `0 reloads, no guard written`;
    },
  },
  {
    title: "AC5 — with storage refused, the reload still happens and nothing throws",
    run: async ({ page }) => {
      // A private window with site data blocked: reading sessionStorage throws rather
      // than returning null. The guard must fall back, not fall over.
      await page.addInitScript(() => {
        Object.defineProperty(window, "sessionStorage", {
          configurable: true,
          get() {
            throw new DOMException("The operation is insecure.", "SecurityError");
          },
        });
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));

      await page.goto(`${APP}/login`);
      await page.waitForSelector("#email");
      const loads = countLoads(page);

      await fireRejection(page, STALE);
      await page.waitForEvent("load", { timeout: 15000 });
      await page.waitForSelector("#email", { timeout: 15000 });
      await settled(page, loads, 1, "with storage refused");
      expect(errors.length === 0, `storage refusal threw: ${errors.join(" | ")}`);

      // And the guard still holds across that reload, which is the interesting half.
      // Memory cannot do it, because the reload wipes memory; the timestamp travels
      // in the URL instead. Without this, a private window with a genuinely missing
      // asset reloads for ever.
      await fireRejection(page, STALE);
      await settled(page, loads, 1, "a second rejection after a storage-less reload");

      // The marker is not left in the address bar for anyone to bookmark.
      const url = new URL(page.url());
      expect(url.searchParams.get("_icr") === null, `the marker survived in ${page.url()}`);
      return `1 reload, no uncaught error, guard held across it, URL left clean`;
    },
  },
]);

// F5-S3: the takeoff route in its own chunks (P-18's F5 half).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s3.mjs
//
// The bench serves the dev server, so a "chunk" here is the module the route imports on
// first visit: `/src/pages/ProjectTakeoff.tsx` and the canvas under it. The production
// bundle is checked by `drives/f5-s3-bundle.sh`. It measures on this run's own Riverside
// (lib/world.mjs).
//
// Updated 2026-10-19 to today's screens (D-619): there is no "Projects" dashboard page to start
// from any more. Home is takeoff (D-311 1), so signing in with a project lands on its sheet and
// fetches the takeoff code by design, and the projects list is the All projects dialog over that
// takeoff (D-314). The screen that is not takeoff is now Settings: AC1 measures it (opened as a
// fresh document after sign-in) instead of the dashboard, and AC3 starts from it. An open sheet is
// waited on by [data-canvas-scale], not img "Drawing sheet" (D-101). After the recovery reload the
// takeoff shows its own loading frame (D-330) while the dev server serves the whole takeoff graph
// again, which took over 30 s on the fx dev server: AC3's wait for the sheet is 60 s, and its
// failure message names the refusals, the page loads and the address. The checks are unchanged.

import { APP, expect, quietFor, run, signInAs } from "./lib/bench.mjs";
import { riversideWorld } from "./lib/world.mjs";

// This run's own Riverside, under its own account (lib/world.mjs).
const world = await riversideWorld();
const r = world.r;

const TAKEOFF_CODE = /ProjectTakeoff|SheetCanvas|DraftLayer|pdfjs|pdf\.worker/;

/** Signed in, then a fresh document on Settings › General: a screen that is not takeoff (D-311). */
async function openSettings(page) {
  await signInAs(page, world.owner.email, world.owner.password);
  await page.goto(`${APP}/settings/general`);
  await page.getByRole("heading", { name: "Workspace settings", exact: true }).waitFor({ timeout: 20000 });
}

await run("f5-s3", [
  {
    title: "AC1: a screen that is not takeoff fetches no takeoff page, no canvas and no pdf.js; opening a sheet fetches them",
    run: async ({ page }) => {
      const fetched = [];
      await signInAs(page, world.owner.email, world.owner.password);
      // Counted from the fresh document on: the sign-in itself lands on takeoff (D-311 1).
      page.on("request", (req) => fetched.push(new URL(req.url()).pathname));
      await page.goto(`${APP}/settings/general`);
      await page.getByRole("heading", { name: "Workspace settings", exact: true }).waitFor({ timeout: 20000 });
      await page.waitForLoadState("networkidle");
      const early = fetched.filter((p) => TAKEOFF_CODE.test(p));
      expect(early.length === 0, `Settings fetched ${early.join(", ")}`);
      const before = fetched.length;

      await page.goto(r.url(APP));
      await page.locator("[data-canvas-scale]").waitFor({ timeout: 30000 });
      const later = fetched.slice(before).filter((p) => TAKEOFF_CODE.test(p));
      expect(later.some((p) => p.includes("ProjectTakeoff")), `takeoff fetched ${later.join(", ")}`);
      expect(later.some((p) => p.includes("SheetCanvas")), "the canvas module never arrived");
      return `Settings: ${before} requests, none takeoff's · the sheet: ${later.length} takeoff modules (${later.map((p) => p.split("/").pop()).join(", ")})`;
    },
  },
  {
    title: "AC3: the takeoff chunk gone after a redeploy reloads the tab once, then takeoff opens; never a white screen",
    run: async ({ page }) => {
      await openSettings(page);
      let refused = 0;
      await page.route(/\/src\/pages\/ProjectTakeoff\.tsx/, (route) => {
        if (refused === 0) {
          refused += 1;
          return route.fulfill({ status: 404, body: "gone" });
        }
        return route.continue();
      });
      const loads = [];
      page.on("load", () => loads.push(Date.now()));
      await page.evaluate((url) => {
        window.history.pushState({}, "", url);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, new URL(r.url(APP)).pathname);
      const drew = await page.locator("[data-canvas-scale]").waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
      expect(drew, `the sheet never drew: the chunk refused ${refused}×, ${loads.length} page loads, at ${page.url()}`);
      await quietFor(1500); // no second reload may follow
      expect(refused === 1, `the chunk was refused ${refused} times`);
      expect(loads.length === 1, `${loads.length} page loads, expected exactly 1 reload`);
      const text = (await page.textContent("body")).trim();
      expect(text.length > 0, "white screen");
      return "the missing chunk reloaded the tab once, onto the current code, and the sheet drew";
    },
  },
]);

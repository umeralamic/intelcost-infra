// F5-S3: the takeoff route in its own chunks (P-18's F5 half).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s3.mjs
//
// The bench serves the dev server, so a "chunk" here is the module the route imports on
// first visit: `/src/pages/ProjectTakeoff.tsx` and the canvas under it. The production
// bundle is checked by `drives/f5-s3-bundle.sh`. Riverside in the seeded workspace is
// only read.

import { APP, SEEDED, apiLogin, expect, firstWorkspace, run, signInAs } from "./lib/bench.mjs";
import { riverside } from "./lib/takeoff.mjs";

const token = await apiLogin();
const workspace = await firstWorkspace(token);
const r = await riverside(token, workspace.uuid);

const TAKEOFF_CODE = /ProjectTakeoff|SheetCanvas|DraftLayer|pdfjs|pdf\.worker/;

await run("f5-s3", [
  {
    title: "AC1: the dashboard fetches no takeoff page, no canvas and no pdf.js; opening a sheet fetches them",
    run: async ({ page }) => {
      const fetched = [];
      page.on("request", (req) => fetched.push(new URL(req.url()).pathname));
      await signInAs(page, SEEDED.email, SEEDED.password);
      await page.getByRole("heading", { name: "Projects", exact: true }).waitFor({ timeout: 20000 });
      await page.waitForLoadState("networkidle");
      const early = fetched.filter((p) => TAKEOFF_CODE.test(p));
      expect(early.length === 0, `the dashboard fetched ${early.join(", ")}`);
      const before = fetched.length;

      await page.goto(r.url(APP));
      await page.locator('img[alt="Drawing sheet"]').waitFor({ timeout: 20000 });
      const later = fetched.slice(before).filter((p) => TAKEOFF_CODE.test(p));
      expect(later.some((p) => p.includes("ProjectTakeoff")), `takeoff fetched ${later.join(", ")}`);
      expect(later.some((p) => p.includes("SheetCanvas")), "the canvas module never arrived");
      return `dashboard: ${before} requests, none takeoff's · the sheet: ${later.length} takeoff modules (${later.map((p) => p.split("/").pop()).join(", ")})`;
    },
  },
  {
    title: "AC3: the takeoff chunk gone after a redeploy reloads the tab once, then takeoff opens; never a white screen",
    run: async ({ page }) => {
      await signInAs(page, SEEDED.email, SEEDED.password);
      await page.getByRole("heading", { name: "Projects", exact: true }).waitFor({ timeout: 20000 });
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
      await page.locator('img[alt="Drawing sheet"]').waitFor({ timeout: 30000 });
      await page.waitForTimeout(1500);
      expect(refused === 1, `the chunk was refused ${refused} times`);
      expect(loads.length === 1, `${loads.length} page loads, expected exactly 1 reload`);
      const text = (await page.textContent("body")).trim();
      expect(text.length > 0, "white screen");
      return "the missing chunk reloaded the tab once, onto the current code, and the sheet drew";
    },
  },
]);

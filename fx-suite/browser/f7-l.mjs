// F7: a new item's second run joins it. An item made by the measurement dialog's Create (D-1217: made at once, with
// nothing drawn) takes its first run, ended with Enter (the session ends, the tool stays armed, D-874), and then a
// second run, ended with Escape (the run is kept and the tool put down in one press, D-874, replacing legacy's two
// steps of D-80). Both runs are shapes of the one item: no naming dialog, no second item, the item's quantity the sum
// of both runs.
//
// Written for D-1302 (the close-out of the 2026-11-16 night run): ending a new item's first run with Enter or Escape
// ended its session, so the next run was lost or asked for a new item. Expected to fail until the D-1302 app fix lands.
//
//   docker compose --profile browser run --rm browser node scripts/f7-l.mjs
//
// The world: a fresh workspace, one square page (1000 × 1000 pt) at 0.1 ft per point, so 0.1 of the page is 10 ft.
// Hand-worked: run 1 from x 0.1 to 0.3 is 0.2 × 1000 pt × 0.1 ft = 20 ft; run 2 from x 0.1 to 0.25 is
// 0.15 × 1000 × 0.1 = 15 ft; the item reads 20 + 15 = 35 LF. Clicks land on whole pixels (about 0.125 ft each here),
// so each figure is checked to f7-b's precision.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { armMeasure, sheetPoint } from "./lib/takeoff.mjs";

const FT = 0.1;
const SIDE = 1000;
const { token, workspace, base } = await freshWorkspace("F7 second run");
const project = await makeProject(token, base, { name: "Second run" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;

const items = async () => (await apiCall(token, "GET", `${takeoff}/item/detail`)).body;
const byName = async (name) => (await items()).find((i) => i.name === name);
const settled = (name, test, what) => waitFor(async () => { const i = await byName(name); return i && test(i) ? i : null; }, what ?? name, 10000);
const tools = (page) => page.getByRole("group", { name: /^(Takeoff tools|Measure and annotation tools)$/ });
const near = (a, b) => Math.abs(a - b) <= Math.max(0.5, 0.02 * Math.abs(b));
/** Feet along the page for a share of its width. */
const feet = (share) => share * SIDE * FT;

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
  // Exact points: Snap (on by default, F7-S10) would pull the second run onto the first's ends.
  const snap = page.locator("[data-draw-modifiers]").getByRole("button", { name: /^Snap:/ });
  if ((await snap.innerText()).trim() === "Snap: On") await snap.click();
}
async function click(page, x, y) {
  const p = await sheetPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}

await run("f7-l", [
  {
    title: "setup: one square page at 0.1 ft per point",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Runs.pdf", buffer: makePdf([{ width: SIDE, height: SIDE, label: "R1" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Runs.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: "Custom", unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      return "scaled";
    },
  },
  {
    title: "D-1302: a new item from Create, its first run ended with Enter (20 LF) and a second ended with Escape (15 LF): both join the one item, 2 shapes, 35 LF, no naming dialog, the tool put down",
    run: async ({ page }) => {
      await open(page);
      const before = new Set((await items()).map((i) => i.uuid));
      await armMeasure(page, "Linear", { name: "Two runs" });
      // Run 1: Enter ends the session; the tool stays armed on the item (D-874).
      await click(page, 0.1, 0.3);
      await click(page, 0.3, 0.3);
      await page.keyboard.press("Enter");
      const first = await settled("Two runs", (i) => i.geometries.length === 1 && i.effective_quantity > 0, "the first run on Two runs");
      // Run 2: on the same item, ended with one Escape, which keeps a run with enough points (D-874).
      await click(page, 0.1, 0.5);
      const asked = await page.locator('[data-measurement-dialog="create"]').isVisible();
      await click(page, 0.25, 0.5);
      await page.keyboard.press("Escape");
      const both = await settled("Two runs", (i) => i.geometries.length === 2, "the second run joining Two runs").catch(async () => {
        const mine = (await items()).filter((i) => !before.has(i.uuid));
        throw new Error(`the second run did not join "Two runs": new items ${JSON.stringify(mine.map((i) => [i.name, i.geometries.length, i.effective_quantity]))}`);
      });
      const down = await tools(page).getByRole("button", { name: "Select", exact: true }).getAttribute("aria-pressed");
      const made = (await items()).filter((i) => !before.has(i.uuid));
      const lengths = both.geometries.map((g) => g.vertices_json.length);
      expect(!asked, "the second run asked for a name: it did not stay on the item");
      expect(made.length === 1, `${made.length} new items (${made.map((i) => i.name).join(", ")}), wanted 1`);
      expect(lengths.every((n) => n === 2), `point counts ${lengths.join(", ")}; runs ${JSON.stringify(both.geometries.map((g) => g.vertices_json))}`);
      expect(near(first.effective_quantity, feet(0.2)), `the first run reads ${first.effective_quantity} LF, wanted ${feet(0.2)}`);
      expect(near(both.effective_quantity, feet(0.2) + feet(0.15)), `Two runs reads ${both.effective_quantity} LF, wanted ${feet(0.2) + feet(0.15)}; runs ${JSON.stringify(both.geometries.map((g) => g.vertices_json))}`);
      expect(down === "true", `after Escape Select is pressed ${down}: the tool was not put down (D-874)`);
      return `Two runs: Enter kept ${first.effective_quantity.toFixed(2)} LF, Escape added the second run: ${both.geometries.length} shapes, ${both.effective_quantity.toFixed(2)} LF (hand-worked 35), one item, no name asked, tool put down`;
    },
  },
]);

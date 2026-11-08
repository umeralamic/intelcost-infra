// Click check C28 (pending_umer.md): does a double-click finish a Linear or Area run?
//
//   node fx-run-locked.mjs c28-double-click
//
// Asserts: Linear (Point to Point), one click then a double-click, saves a two-point run of the
// right length, with no doubled end point (D-386); the tool stays armed and the next run, drawn the
// same way, joins the same item. Area (Point to Point), three clicks then a double-click, saves a
// closed four-corner area of the right figure, and the tool stays armed for the next.
//
// The world: a fresh workspace, one square page (1000 x 1000 pt) at 0.1 ft per point, so 0.1 of
// the page is 10 ft. Snap and Ortho are turned off so the clicks land where they are aimed.
//
// Left for the founder's eye: how the double-click feels (no flicker of a stray third point, the
// rubber band letting go at once), and that the hint on the toolbar reads right.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { MEASURE_TOOLS, armMeasure, sheetPoint } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("C28 double-click");
const project = await makeProject(token, base, { name: "Double-click" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;

const items = async () => (await apiCall(token, "GET", `${takeoff}/item/detail`)).body;
const byName = async (name) => (await items()).find((i) => i.name === name);
const near = (a, b) => Math.abs(a - b) <= Math.max(0.5, 0.02 * Math.abs(b));

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
  const bar = page.locator("[data-draw-modifiers]");
  for (const which of ["Snap", "Ortho"]) {
    const button = bar.getByRole("button", { name: new RegExp(`^${which}:`) });
    if ((await button.innerText()).trim() === `${which}: On`) await button.click();
    await waitFor(async () => ((await button.innerText()).trim() === `${which}: Off` ? true : null), `${which} off`, 5000);
  }
}
async function click(page, x, y) {
  const p = await sheetPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}
async function dblclick(page, x, y) {
  const p = await sheetPoint(page, x, y);
  await page.mouse.dblclick(p.x, p.y);
}
/** The armed tool's label, or null once the tool is put down. */
const armed = (page) =>
  page.evaluate((group) => document.querySelector(`[role="group"][aria-label="${group}"] button[aria-pressed="true"]`)?.textContent?.trim() ?? null, MEASURE_TOOLS);
/** An item's own runs, deducts aside. */
const runs = (item) => item.geometries.filter((g) => g.role !== "subtract");

await run("c28-double-click", [
  {
    title: "setup: one square page at 0.1 ft per point",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "C28.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "C28" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["C28.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      return `sheet ${sheet.uuid}`;
    },
  },
  {
    title: "Linear: click, then double-click 30 ft along: the run saves as two points, 30 LF, with no doubled end; Linear stays armed, and a second click and double-click at once add a 20 LF run to the same item with no new name asked",
    run: async ({ page }) => {
      await open(page);
      await armMeasure(page, "Linear", { name: "Run" });
      await click(page, 0.1, 0.2);
      await dblclick(page, 0.4, 0.2);
      const item = await waitFor(async () => {
        const i = await byName("Run");
        return i && runs(i).length === 1 ? i : null;
      }, "Run saved by the double-click", 10000).catch(() => {
        throw new Error("the double-click did not save the Linear run (no item \"Run\" with one run)");
      });
      const verts = runs(item)[0].vertices_json;
      expect(verts.length === 2, `the run has ${verts.length} points (${JSON.stringify(verts)}), wanted 2: a doubled end point is back`);
      expect(near(item.effective_quantity, 30), `Run reads ${item.effective_quantity} LF, wanted 30`);
      const tool = await armed(page);
      expect(tool && tool.includes("Linear"), `after the double-click the armed tool is "${tool}", wanted Linear`);
      const firstLine = `Run ${item.effective_quantity.toFixed(2)} LF, ${verts.length} points; Linear still armed`;

      // The next run, straight away, in the same window (each step opens a fresh page).
      await click(page, 0.1, 0.4);
      await dblclick(page, 0.3, 0.4);
      const named = await page.locator('[data-measurement-dialog="create"]').isVisible();
      expect(!named, "the second run asked for a new name: the tool was not ready for the next");
      const both = await waitFor(async () => {
        const i = await byName("Run");
        return i && runs(i).length === 2 ? i : null;
      }, "the second run joining Run", 10000).catch(async () => {
        throw new Error(`the second double-click did not add a run to "Run": items ${JSON.stringify((await items()).map((i) => [i.name, i.geometries.length]))}`);
      });
      const second = runs(both).map((g) => g.vertices_json.length);
      expect(second.every((n) => n === 2), `point counts ${second.join(", ")}`);
      expect(near(both.effective_quantity, 50), `Run reads ${both.effective_quantity} LF, wanted 50`);
      expect((await items()).length === 1, `${(await items()).length} items, wanted 1`);
      return `${firstLine}; next run at once: Run ${both.effective_quantity.toFixed(2)} LF over ${runs(both).length} runs, one item, no new name asked`;
    },
  },
  {
    title: "Area: three clicks and a double-click, a 20 x 20 ft square: the area saves closed with four corners, 400 SF; Area stays armed, and a 10 x 10 ft square drawn the same way at once joins Pad, 500 SF",
    run: async ({ page }) => {
      await open(page);
      await armMeasure(page, "Area", { name: "Pad" });
      await click(page, 0.5, 0.5);
      await click(page, 0.7, 0.5);
      await click(page, 0.7, 0.7);
      await dblclick(page, 0.5, 0.7);
      const item = await waitFor(async () => {
        const i = await byName("Pad");
        return i && runs(i).length === 1 ? i : null;
      }, "Pad saved by the double-click", 10000).catch(() => {
        throw new Error("the double-click did not save the Area run (no item \"Pad\" with one run)");
      });
      const g = runs(item)[0];
      expect(g.vertices_json.length === 4, `the area has ${g.vertices_json.length} points (${JSON.stringify(g.vertices_json)}), wanted 4`);
      expect(near(item.effective_quantity, 400), `Pad reads ${item.effective_quantity} SF, wanted 400`);
      const tool = await armed(page);
      expect(tool && tool.includes("Area"), `after the double-click the armed tool is "${tool}", wanted Area`);
      const firstLine = `Pad ${item.effective_quantity.toFixed(2)} SF, ${g.vertices_json.length} corners; Area still armed`;

      // The next area, straight away, in the same window.
      await click(page, 0.1, 0.6);
      await click(page, 0.2, 0.6);
      await click(page, 0.2, 0.7);
      await dblclick(page, 0.1, 0.7);
      const both = await waitFor(async () => {
        const i = await byName("Pad");
        return i && runs(i).length === 2 ? i : null;
      }, "the second area joining Pad", 10000).catch(() => {
        throw new Error("the second double-click did not add an area to Pad");
      });
      expect(near(both.effective_quantity, 500), `Pad reads ${both.effective_quantity} SF, wanted 500`);
      expect(runs(both).every((r) => r.vertices_json.length === 4), `corner counts ${runs(both).map((r) => r.vertices_json.length).join(", ")}`);
      return `${firstLine}; next area at once: Pad ${both.effective_quantity.toFixed(2)} SF over ${runs(both).length} areas`;
    },
  },
]);

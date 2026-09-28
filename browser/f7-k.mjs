// F7-S11 AC1: legacy measures past the edge of the paper. With Linear armed, a run begun
// on the sheet can end on the grey margin; its ink off the paper shows, and still does
// after a reload.
//
//   docker compose --profile browser run --rm browser node scripts/f7-k.mjs

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { armMeasure, sheetPoint } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F7 past the edge");
const project = await makeProject(token, base, { name: "Past the edge" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
}
const pageBox = (page) => page.locator("[data-page-footprint]").boundingBox();

await run("f7-k", [
  {
    title: "setup: one scaled sheet",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "E.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "E" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["E.pdf"].uuid, [1]]]);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      return "one sheet at 0.1 ft per point";
    },
  },
  {
    title: "AC1: a Linear run from 0.9 across to the grey margin right of the paper is stored past 1.0 and drawn there, after a reload too",
    run: async ({ page }) => {
      await open(page);
      await armMeasure(page, "Linear", { name: "Edge run" });
      // Snap off: an exact point.
      const snap = page.locator("[data-canvas-bar]").getByRole("button", { name: /^Snap:/ });
      if ((await snap.innerText()).trim() === "Snap: On") await snap.click();
      const a = await sheetPoint(page, 0.9, 0.5);
      const box = await pageBox(page);
      const margin = { x: box.x + box.width + 12, y: a.y };
      await page.mouse.click(a.x, a.y);
      await page.mouse.click(margin.x, margin.y);
      await page.mouse.dblclick(margin.x, margin.y);
      const item = await waitFor(async () => {
        const list = (await apiCall(token, "GET", `${takeoff}/item/detail?sheet_uuid=${sheet.uuid}`)).body;
        return list.find((i) => i.name === "Edge run" && i.geometries.length > 0) ?? null;
      }, "the run saved", 10000);
      const xs = item.geometries[0].vertices_json.map((v) => v[0]);
      await page.reload();
      await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
      // A level line has no height, which Playwright counts as hidden: measure it.
      const ink = page.locator(`[data-geometry="${item.geometries[0].uuid}"]`);
      await ink.waitFor({ state: "attached", timeout: 10000 });
      const drawn = await ink.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, width: r.width }; });
      const after = await pageBox(page);
      expect(Math.max(...xs) > 1, `stored x ${xs}`);
      expect(drawn.x + drawn.width > after.x + after.width + 4, `drawn to ${drawn.x + drawn.width}, the paper ends at ${after.x + after.width}`);
      return `stored to x ${Math.max(...xs).toFixed(3)}; after a reload its ink reaches ${Math.round(drawn.x + drawn.width - after.x - after.width)} px past the paper; ${item.effective_quantity.toFixed(2)} LF`;
    },
  },
]);

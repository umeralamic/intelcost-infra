// F7: a copy waiting to be placed is put down by a click, even on an earthwork run (D-1303, the founder's answer of
// 2026-11-17). An earthwork run takes its own presses above the sheet (to select and drag it), and a paste click that
// landed on one selected the run instead of placing the copy.
//
// Written for D-1303 (D-1302's close-out). Expected to fail until the D-1303 app fix lands.
//
//   docker compose --profile browser run --rm browser node scripts/f7-m.mjs
//
// The world: a fresh workspace, one square page (1000 × 1000 pt) at 0.1 ft per point; "Wall", one 20 ft run from
// (0.1, 0.2) to (0.3, 0.2); "Existing Ground", one contour at 100 ft down the page at x 0.5. The copy hangs from the
// mean of its points (F7-S16, D-1303), so a click at (0.5, 0.6) puts the copy from (0.4, 0.6) to (0.6, 0.6): across
// the contour.
// Hand-worked: Wall reads 20 + 20 = 40 LF in two runs.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { sheetPoint } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F7 paste on a run");
const project = await makeProject(token, base, { name: "Paste on a run" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
const ids = {};

const detail = async (uuid) => (await apiCall(token, "GET", `${takeoff}/item/${uuid}`)).body;

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
  await page.locator("[data-quantity-panel] li[data-item-row]").first().waitFor({ timeout: 15000 });
  await page.locator(`[data-earthwork-run="${ids.contour}"]`).waitFor({ state: "attached", timeout: 15000 });
}
/** Click as a hand does: the pointer comes in, then the click. */
async function clickAt(page, x, y) {
  const p = await sheetPoint(page, x, y);
  await page.mouse.move(p.x - 20, p.y - 20);
  await page.mouse.move(p.x, p.y, { steps: 4 });
  await page.mouse.click(p.x, p.y);
}

await run("f7-m", [
  {
    title: "setup: one square page at 0.1 ft per point; Wall (one 20 ft run) and an Existing Ground contour down x 0.5",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "M.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "M" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["M.pdf"].uuid, [1]]]);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      const wall = await apiCall(token, "POST", `${takeoff}/item`, { name: "Wall", type: "lf", unit: "LF", sheet_uuid: sheet.uuid, geometry: { geom_type: "lf", vertices_json: [[0.1, 0.2], [0.3, 0.2]], shape_meta: null, client_uuid: crypto.randomUUID() } });
      expect(wall.status === 201, `Wall: ${wall.status}`);
      ids.wall = wall.body.uuid;
      const eg = await apiCall(token, "POST", `${takeoff}/item`, {
        name: "Existing Ground",
        type: "contour",
        unit: "LF",
        color: "#ef4444",
        sheet_uuid: sheet.uuid,
        geometry: { geom_type: "contour", vertices_json: [[0.5, 0.1], [0.5, 0.9]], shape_meta: { kind: "polyline", surface: "EG", elevation: 100 }, client_uuid: crypto.randomUUID(), sheet_uuid: sheet.uuid },
      });
      expect(eg.status === 201, `Existing Ground: ${eg.status} ${JSON.stringify(eg.body)}`);
      ids.contour = (await detail(eg.body.uuid)).geometries[0].uuid;
      const w = await detail(ids.wall);
      expect(w.geometries.length === 1 && Math.abs(w.effective_quantity - 20) < 1e-6, `Wall ${w.geometries.length} runs ${w.effective_quantity} LF`);
      return "Wall 20 LF; one EG contour at 100 down x 0.5";
    },
  },
  {
    title: "D-1303: Copy… a Wall run, Paste on this sheet, a click on the contour: the copy is placed (Paste copy asks, Same item adds it at y 0.6) and the contour is not selected",
    run: async ({ page }) => {
      await open(page);
      const p = await sheetPoint(page, 0.2, 0.2);
      await page.mouse.click(p.x, p.y, { button: "right" });
      await page.getByRole("menu", { name: "Item actions" }).getByRole("menuitem", { name: "Copy…" }).click();
      const where = page.getByRole("menu", { name: "Copy destination" });
      await where.waitFor({ timeout: 5000 });
      await where.getByRole("menuitem", { name: "Paste on this sheet" }).click();
      // A level run's ghost has no height, which Playwright counts as hidden: wait for it in the page.
      await page.locator("[data-ghost]").first().waitFor({ state: "attached", timeout: 10000 });
      await clickAt(page, 0.5, 0.6);
      const dialog = page.getByRole("dialog", { name: "Paste copy" });
      const asked = await dialog.waitFor({ timeout: 5000 }).then(
        () => true,
        () => false,
      );
      const selected = await page.locator(`[data-earthwork-run="${ids.contour}"][data-selected="1"]`).count();
      expect(asked, `the click did not place the copy (no "Paste copy"); the contour ${selected ? "was selected" : "was not selected"}`);
      expect(selected === 0, "the contour was selected by the click that placed the copy");
      await dialog.getByRole("button", { name: "Same item" }).click();
      await page.getByText('Into "Wall".').first().waitFor({ timeout: 10000 });
      const wall = await waitFor(async () => {
        const d = await detail(ids.wall);
        return d.geometries.length === 2 ? d : null;
      }, "a second Wall run", 10000);
      // D-1303, F7-S16: the ghost hangs from the mean of the copied points (ProjectTakeoff.tsx `sourceOf`), so the copy is
      // centred on the click: the placed run's midpoint (the mean of its points) is at (0.5, 0.6), its ends at x 0.4 and
      // 0.6. Was: its first point at the click.
      const mid = (g) => [g.vertices_json.reduce((t, p) => t + p[0], 0) / g.vertices_json.length, g.vertices_json.reduce((t, p) => t + p[1], 0) / g.vertices_json.length];
      const fresh = wall.geometries.find((g) => Math.abs(mid(g)[1] - 0.6) < 0.005);
      expect(fresh && Math.abs(mid(fresh)[0] - 0.5) < 0.005 && Math.abs(wall.effective_quantity - 40) < 1e-6, `Wall ${wall.effective_quantity} LF, runs ${JSON.stringify(wall.geometries.map((g) => g.vertices_json))}`); // D-1303, F7-S16
      const after = await page.locator(`[data-earthwork-run="${ids.contour}"][data-selected="1"]`).count();
      expect(after === 0, "the contour was selected after the paste");
      return `the click on the contour placed the copy at (${fresh.vertices_json[0].map((v) => v.toFixed(3)).join(", ")}); Wall 20 → 40 LF in two runs; the contour not selected`;
    },
  },
]);

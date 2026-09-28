// F7-S15 AC5 and F7-S19 AC4: legacy's Move from the right-click menu (press and drag the
// markup itself), and a deduct refused an owner in another item.
//
//   docker compose --profile browser run --rm browser node scripts/f7-g.mjs
//
// The world: a square page at 0.1 ft per point; "Slab", a 20 × 20 ft square area, and
// "Other", another area.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, quietFor, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { sheetPoint } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F7 move mode");
const project = await makeProject(token, base, { name: "Move mode" });
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
}

await run("f7-g", [
  {
    title: "setup: Slab, a 20 × 20 ft square, and Other",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "M.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "M1" }, { width: 1000, height: 1000, label: "M2" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["M.pdf"].uuid, [1, 2]]]);
      [sheet, ids.second] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      for (const s of [sheet, ids.second]) {
        await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${s.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      }
      const make = async (name, vertices) => {
        const res = await apiCall(token, "POST", `${takeoff}/item`, { name, type: "sf", unit: "SF", sheet_uuid: sheet.uuid, geometry: { geom_type: "sf", vertices_json: vertices, shape_meta: { closed: true }, client_uuid: crypto.randomUUID() } });
        expect(res.status === 201, `${name}: ${res.status}`);
        return res.body.uuid;
      };
      ids.slab = await make("Slab", [[0.2, 0.2], [0.4, 0.2], [0.4, 0.4], [0.2, 0.4]]);
      ids.other = await make("Other", [[0.6, 0.6], [0.8, 0.6], [0.8, 0.8], [0.6, 0.8]]);
      return "Slab 400 SF, Other 400 SF";
    },
  },
  {
    title: "S15 AC5: right-click Slab on the sheet, \"Move\" (its hint \"Press and drag the markup to its new position\"): the toast says so, and pressing on Slab away from its handle drags it",
    run: async ({ page }) => {
      await open(page);
      const before = await detail(ids.slab);
      const corner = await sheetPoint(page, 0.25, 0.25);
      await page.mouse.click(corner.x, corner.y, { button: "right" });
      const entry = page.getByRole("menu", { name: "Item actions" }).getByRole("menuitem", { name: /^Move/ });
      const hint = await entry.innerText();
      await entry.click();
      await page.getByText("Press and drag the markup to its new position.").first().waitFor({ timeout: 5000 });
      // Pressed near a corner, well away from the middle handle.
      const to = await sheetPoint(page, 0.35, 0.25);
      await page.mouse.move(corner.x, corner.y);
      await page.mouse.down();
      await page.mouse.move((corner.x + to.x) / 2, corner.y, { steps: 4 });
      await page.mouse.move(to.x, to.y, { steps: 4 });
      await page.mouse.up();
      const after = await waitFor(async () => { const d = await detail(ids.slab); return d.geometries[0].geometry_version > before.geometries[0].geometry_version ? d : null; }, "Slab moved", 10000);
      const shift = after.geometries[0].vertices_json[0][0] - before.geometries[0].vertices_json[0][0];
      expect(Math.abs(shift - 0.1) < 0.01, `moved by ${shift}`);
      expect(Math.abs(after.effective_quantity - before.effective_quantity) < 1e-6, `figure ${before.effective_quantity} → ${after.effective_quantity}`);
      expect(hint.includes("Press and drag the markup to its new position"), `entry reads "${hint}"`);
      // One move ends the mode: a second press on Slab's body (off its middle handle, now
      // at 0.4, 0.3, and off its corners) does not move it.
      const again = await sheetPoint(page, 0.35, 0.25);
      await page.mouse.move(again.x, again.y);
      await page.mouse.down();
      await page.mouse.move(again.x + 40, again.y, { steps: 4 });
      await page.mouse.up();
      await quietFor(1500);
      const still = await detail(ids.slab);
      expect(still.geometries[0].geometry_version === after.geometries[0].geometry_version, "a second press moved it: the mode did not end");
      return `hint "${hint.replace(/\s+/g, " ").trim()}"; toast shown; pressing the body moved Slab by ${shift.toFixed(3)}, ${after.effective_quantity.toFixed(2)} SF before and after; one move ended the mode`;
    },
  },
  {
    title: "S19 AC4: a hand-written request making a deduct's owner a shape of another item is refused",
    run: async () => {
      const otherSection = (await detail(ids.other)).geometries[0].uuid;
      const res = await apiCall(token, "POST", `${takeoff}/item/${ids.slab}/shapes`, {
        create: [{ client_uuid: crypto.randomUUID(), geom_type: "sf", vertices_json: [[0.65, 0.65], [0.7, 0.65], [0.7, 0.7], [0.65, 0.7]], shape_meta: { closed: true }, role: "subtract", owner_uuid: otherSection }],
      });
      const slab = await detail(ids.slab);
      expect(res.status === 409 && JSON.stringify(res.body).includes("A deduct belongs to a section of the same item."), `${res.status} ${JSON.stringify(res.body)}`);
      expect(slab.geometries.length === 1, `Slab has ${slab.geometries.length} shapes`);
      return `409 "A deduct belongs to a section of the same item."; nothing written`;
    },
  },
  {
    title: "a mark added on the second sheet to a count item begun on the first lands on the second (legacy's per-sheet runs; found overnight)",
    run: async ({ page }) => {
      const made = await apiCall(token, "POST", `${takeoff}/item`, { name: "Posts", type: "count", unit: "EA", sheet_uuid: sheet.uuid, geometry: { geom_type: "count", vertices_json: [[0.5, 0.5]], shape_meta: null, client_uuid: crypto.randomUUID() } });
      expect(made.status === 201, `Posts: ${made.status}`);
      await signInAs(page, (await fixtureOwner()).email);
      await enterWorkspace(page, workspace.uuid);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${ids.second.uuid}`);
      await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
      // The Takeoff panel lists every sheet's items (F6, finding c): choose Posts there.
      const row = page.locator("[data-quantity-panel] li[data-item-row]").filter({ hasText: "Posts" }).first();
      await row.waitFor({ timeout: 15000 });
      await row.click();
      // Choosing it opens its own sheet (F6); back to the second in the Sheets panel, the
      // choice kept.
      await page.waitForURL((url) => url.pathname.endsWith(sheet.uuid), { timeout: 10000 });
      await page.locator(`[data-sheet-row="${ids.second.uuid}"] button`).first().click();
      await page.waitForURL((url) => url.pathname.endsWith(ids.second.uuid), { timeout: 10000 });
      await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
      await page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: /^Count/ }).click();
      const spot = await sheetPoint(page, 0.3, 0.3);
      await page.mouse.click(spot.x, spot.y);
      const marks = await waitFor(async () => { const d = await detail(made.body.uuid); return d.geometries.length === 2 ? d.geometries : null; }, "a second mark", 10000);
      const fresh = marks.find((g) => Math.abs(g.vertices_json[0][0] - 0.3) < 0.02);
      expect(fresh, `no mark near 0.3: ${JSON.stringify(marks.map((g) => g.vertices_json))}`);
      expect(fresh.sheet_uuid === ids.second.uuid, `the mark went to ${fresh.sheet_uuid === sheet.uuid ? "the first sheet" : fresh.sheet_uuid}, not the second`);
      await page.locator(`[data-geometry="${fresh.uuid}"]`).first().waitFor({ timeout: 10000 });
      return "Posts begun on M1; a mark placed on M2 is stored on M2 and drawn there";
    },
  },
]);

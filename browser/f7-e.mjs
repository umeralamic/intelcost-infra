// F7-S13 (first part): a selected section's vertices: drag one, insert one by double-click
// or "Insert point here", delete one by "Delete this point", refused below the minimum.
//
//   docker compose --profile browser run --rm browser node scripts/f7-e.mjs
//
// The world: a square page at 0.1 ft per point; "Pad", a 40 × 40 ft square area, and
// "Tri", a triangle.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { sheetPoint } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F7 vertices");
const project = await makeProject(token, base, { name: "Vertices" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
const ids = {};

const detail = async (uuid) => (await apiCall(token, "GET", `${takeoff}/item/${uuid}`)).body;
const pointsOf = async (uuid) => (await detail(uuid)).geometries[0].vertices_json;

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
  await page.locator("[data-quantity-panel] li[data-item-row]").first().waitFor({ timeout: 15000 });
}
async function at(page, x, y) {
  return sheetPoint(page, x, y);
}
async function selectSection(page, x, y, uuid) {
  const p = await at(page, x, y);
  await page.mouse.click(p.x, p.y);
  // The section, not a deduct: the api promises no order among an item's shapes.
  const section = (await detail(uuid)).geometries.find((g) => g.role !== "subtract");
  await page.locator(`[data-handle="${section.uuid}"]`).first().waitFor({ timeout: 5000 });
}

await run("f7-e", [
  {
    title: "setup: Pad, a 40 × 40 ft square, and Tri, a triangle",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "V.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "V" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["V.pdf"].uuid, [1]]]);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      const make = async (name, vertices) => {
        const res = await apiCall(token, "POST", `${takeoff}/item`, { name, type: "sf", unit: "SF", sheet_uuid: sheet.uuid, geometry: { geom_type: "sf", vertices_json: vertices, shape_meta: { closed: true }, client_uuid: crypto.randomUUID() } });
        expect(res.status === 201, `${name}: ${res.status}`);
        return res.body.uuid;
      };
      ids.pad = await make("Pad", [[0.2, 0.2], [0.6, 0.2], [0.6, 0.6], [0.2, 0.6]]);
      ids.tri = await make("Tri", [[0.7, 0.7], [0.9, 0.7], [0.8, 0.9]]);
      return "Pad 1,600 SF, Tri";
    },
  },
  {
    title: "S13 AC1: dragging Pad's corner handle reshapes it and the stored figure follows",
    run: async ({ page }) => {
      await open(page);
      await selectSection(page, 0.4, 0.4, ids.pad);
      const from = await at(page, 0.6, 0.6);
      const to = await at(page, 0.7, 0.6);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move((from.x + to.x) / 2, from.y, { steps: 4 });
      await page.mouse.move(to.x, to.y, { steps: 4 });
      await page.mouse.up();
      const pad = await waitFor(async () => { const d = await detail(ids.pad); return d.effective_quantity > 1700 ? d : null; }, "Pad reshaped", 10000);
      return `Pad ${pad.effective_quantity.toFixed(2)} SF after the drag (a trapezoid, 1,600 before)`;
    },
  },
  {
    title: "S13 AC2: double-clicking the selected section's edge inserts a vertex there; right-click on an edge, \"Insert point here\", does the same",
    run: async ({ page }) => {
      await open(page);
      await selectSection(page, 0.4, 0.4, ids.pad);
      const before = (await pointsOf(ids.pad)).length;
      const top = await at(page, 0.4, 0.2);
      await page.mouse.dblclick(top.x, top.y);
      const five = await waitFor(async () => { const p = await pointsOf(ids.pad); return p.length === before + 1 ? p : null; }, "a vertex inserted", 10000);
      const left = await at(page, 0.2, 0.4);
      await page.mouse.click(left.x, left.y, { button: "right" });
      await page.getByRole("menu", { name: "Point" }).getByRole("menuitem", { name: "Insert point here" }).click();
      const six = await waitFor(async () => { const p = await pointsOf(ids.pad); return p.length === before + 2 ? p : null; }, "a second vertex inserted", 10000);
      expect(five.some(([x, y]) => Math.abs(y - 0.2) < 1e-6 && Math.abs(x - 0.4) < 0.01), `inserted at ${JSON.stringify(five)}`);
      return `${before} → ${five.length} → ${six.length} points`;
    },
  },
  {
    title: "S13 AC3: \"Delete this point\" removes one of Pad's points; on the three-point Tri it is refused: \"Can't delete point\", \"A SF run needs at least 3 points. Delete the whole run instead.\"",
    run: async ({ page }) => {
      await open(page);
      await selectSection(page, 0.4, 0.4, ids.pad);
      const before = (await pointsOf(ids.pad)).length;
      const corner = await at(page, 0.2, 0.6);
      await page.mouse.click(corner.x, corner.y, { button: "right" });
      await page.getByRole("menu", { name: "Point" }).getByRole("menuitem", { name: "Delete this point" }).click();
      await waitFor(async () => (await pointsOf(ids.pad)).length === before - 1, "a point deleted", 10000);
      await selectSection(page, 0.8, 0.75, ids.tri);
      const tip = await at(page, 0.8, 0.9);
      await page.mouse.click(tip.x, tip.y, { button: "right" });
      await page.getByRole("menu", { name: "Point" }).getByRole("menuitem", { name: "Delete this point" }).click();
      await page.getByText("Can't delete point").waitFor({ timeout: 5000 });
      const why = await page.getByText("A SF run needs at least 3 points. Delete the whole run instead.").count();
      const tri = await pointsOf(ids.tri);
      expect(why === 1 && tri.length === 3, `message ${why}, Tri ${tri.length} points`);
      return `Pad ${before} → ${before - 1} points; Tri refused in legacy's words, still 3 points`;
    },
  },
  {
    title: "S15 AC1, AC4, S19 AC2: a selected section shows the move handle at its middle; dragging it moves the section and its deduct together, the figure unchanged; a drag under 4 px moves nothing",
    run: async ({ page }) => {
      const made = await apiCall(token, "POST", `${takeoff}/item`, { name: "Mover", type: "sf", unit: "SF", sheet_uuid: sheet.uuid, geometry: { geom_type: "sf", vertices_json: [[0.05, 0.7], [0.25, 0.7], [0.25, 0.9], [0.05, 0.9]], shape_meta: { closed: true }, client_uuid: crypto.randomUUID() } });
      const section = made.body.uuid && (await detail(made.body.uuid)).geometries[0].uuid;
      await apiCall(token, "POST", `${takeoff}/item/${made.body.uuid}/shapes`, { create: [{ client_uuid: crypto.randomUUID(), geom_type: "sf", vertices_json: [[0.07, 0.72], [0.1, 0.72], [0.1, 0.75], [0.07, 0.75]], shape_meta: { closed: true }, role: "subtract", owner_uuid: section }] });
      const before = await detail(made.body.uuid);
      await open(page);
      await selectSection(page, 0.2, 0.85, made.body.uuid);
      const handle = page.locator(`[data-move-handle="${section}"]`);
      const box = await handle.boundingBox();
      const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
      // A 2 px nudge: nothing moves. (It is a click on the sheet there, which reselects the
      // section; the deduct sits clear of the middle so the handle stays put.)
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 2, cy, { steps: 2 });
      await page.mouse.up();
      const still = await detail(made.body.uuid);
      const to = await at(page, 0.25, 0.8);
      const from = await at(page, 0.15, 0.8);
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + (to.x - from.x) / 2, cy, { steps: 4 });
      await page.mouse.move(cx + (to.x - from.x), cy, { steps: 4 });
      await page.mouse.up();
      const after = await waitFor(async () => { const d = await detail(made.body.uuid); return d.geometries.every((g) => g.geometry_version > 1) ? d : null; }, "moved", 10000);
      const shift = (uuid) => after.geometries.find((g) => g.uuid === uuid).vertices_json[0][0] - before.geometries.find((g) => g.uuid === uuid).vertices_json[0][0];
      const shifts = before.geometries.map((g) => shift(g.uuid));
      expect(still.geometries.every((g) => g.geometry_version === 1), "a 2 px drag moved it");
      expect(shifts.every((s) => Math.abs(s - 0.1) < 0.01), `shifts ${shifts}`);
      expect(Math.abs(after.effective_quantity - before.effective_quantity) < 1e-6, `figure ${before.effective_quantity} → ${after.effective_quantity}`);
      ids.mover = made.body.uuid;
      return `2 px: nothing; the drag moved the section and its deduct by ${shifts.map((s) => s.toFixed(3)).join(" and ")}; ${after.effective_quantity.toFixed(2)} SF before and after`;
    },
  },
  {
    title: "S15 AC6: a deduct moved off its section is refused in legacy's words and stays put",
    run: async () => {
      const before = await detail(ids.mover);
      const hole = before.geometries.find((g) => g.role === "subtract");
      const res = await apiCall(token, "POST", `${takeoff}/item/${ids.mover}/shapes`, {
        update: [{ uuid: hole.uuid, geometry_version: hole.geometry_version, vertices_json: hole.vertices_json.map(([x, y]) => [x + 0.5, y]), shape_meta: hole.shape_meta }],
      });
      const after = (await detail(ids.mover)).geometries.find((g) => g.uuid === hole.uuid);
      const said = JSON.stringify(res.body);
      expect(res.status === 409 && said.includes("The moved subtraction no longer overlaps any positive region."), `${res.status} ${said}`);
      expect(after.geometry_version === hole.geometry_version, "the deduct moved anyway");
      return `409 "The moved subtraction no longer overlaps any positive region. Original position restored."; the deduct unchanged`;
    },
  },
]);

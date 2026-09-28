// F7 Block C, first part: S12 select a section and the deduct cycle, S17 Delete.
//
//   docker compose --profile browser run --rm browser node scripts/f7-d.mjs
//
// The world: a square page at 0.1 ft per point; "Walls" with three sections, "Slab" with
// a deduct (through the shapes transaction), and "Doors" with three marks.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { sheetPoint } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F7 select");
const project = await makeProject(token, base, { name: "Select" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
const ids = {};

const detail = async (uuid) => (await apiCall(token, "GET", `${takeoff}/item/${uuid}`)).body;
const selectedSections = (page) => page.evaluate(() => [...document.querySelectorAll("[data-selected-section]")].map((e) => e.getAttribute("data-geometry")));
const handles = (page) => page.locator("[data-handle]").count();

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
  await page.locator("[data-quantity-panel] li[data-item-row]").first().waitFor({ timeout: 15000 });
}
async function click(page, x, y) {
  const p = await sheetPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}

await run("f7-d", [
  {
    title: "setup: Walls with three sections, Slab with a deduct, Doors with three marks",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Sel.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "C" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Sel.pdf"].uuid, [1]]]);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      const make = async (name, type, vertices, meta = null) => {
        const res = await apiCall(token, "POST", `${takeoff}/item`, { name, type, unit: type === "lf" ? "LF" : type === "sf" ? "SF" : "EA", sheet_uuid: sheet.uuid, geometry: { geom_type: type, vertices_json: vertices, shape_meta: meta, client_uuid: crypto.randomUUID() } });
        expect(res.status === 201, `${name}: ${res.status}`);
        return res.body;
      };
      ids.walls = (await make("Walls", "lf", [[0.1, 0.1], [0.3, 0.1]])).uuid;
      await apiCall(token, "POST", `${takeoff}/item/${ids.walls}/shapes`, {
        create: [
          { client_uuid: crypto.randomUUID(), geom_type: "lf", vertices_json: [[0.1, 0.2], [0.3, 0.2]] },
          { client_uuid: crypto.randomUUID(), geom_type: "lf", vertices_json: [[0.1, 0.3], [0.3, 0.3], [0.3, 0.35]] },
        ],
      });
      ids.slab = (await make("Slab", "sf", [[0.5, 0.5], [0.9, 0.5], [0.9, 0.9], [0.5, 0.9]], { closed: true })).uuid;
      const section = (await detail(ids.slab)).geometries[0].uuid;
      const hole = await apiCall(token, "POST", `${takeoff}/item/${ids.slab}/shapes`, {
        create: [{ client_uuid: crypto.randomUUID(), geom_type: "sf", vertices_json: [[0.65, 0.65], [0.75, 0.65], [0.75, 0.75], [0.65, 0.75]], shape_meta: { closed: true }, role: "subtract", owner_uuid: section }],
      });
      expect(hole.status === 200, `deduct: ${hole.status}`);
      ids.doors = (await make("Doors", "count", [[0.2, 0.7]])).uuid;
      await apiCall(token, "POST", `${takeoff}/item/${ids.doors}/shapes`, {
        create: [[0.25, 0.7], [0.3, 0.7]].map((p) => ({ client_uuid: crypto.randomUUID(), geom_type: "count", vertices_json: [p] })),
      });
      return "Walls ×3, Slab with a deduct, Doors ×3";
    },
  },
  {
    title: "S12 AC1, AC4: a click selects one of Walls' three sections: that section alone is marked, the row is selected, and the section shows its two handles",
    run: async ({ page }) => {
      await open(page);
      const walls = await detail(ids.walls);
      const middle = walls.geometries.find((g) => g.vertices_json[0][1] === 0.2);
      await click(page, 0.2, 0.2);
      await waitFor(async () => (await selectedSections(page)).length === 1, "one section marked", 5000);
      const marked = await selectedSections(page);
      const row = await page.evaluate(() => document.querySelector("[data-quantity-panel] li[data-item-row] > button.bg-row-selected span.text-sm")?.textContent);
      const count = await handles(page);
      expect(marked[0] === middle.uuid && row === "Walls" && count === 2, `marked ${marked}, row ${row}, handles ${count}`);
      return `the middle section alone, the Walls row, ${count} handles`;
    },
  },
  {
    title: "S12 AC3: inside the deduct, the first click selects Slab's section, the second the deduct, the third the section again",
    run: async ({ page }) => {
      await open(page);
      const slab = await detail(ids.slab);
      const [section, hole] = [slab.geometries.find((g) => g.role !== "subtract").uuid, slab.geometries.find((g) => g.role === "subtract").uuid];
      const steps = [];
      for (let i = 0; i < 3; i++) {
        const before = (await selectedSections(page))[0] ?? null;
        await click(page, 0.7, 0.7);
        // Each click changes the marked section: wait for the change, not a clock.
        const now = await waitFor(async () => {
          const marked = await selectedSections(page);
          return marked.length === 1 && marked[0] !== before ? marked[0] : null;
        }, `click ${i + 1} to change the selection`, 5000);
        steps.push(now);
      }
      expect(steps[0] === section && steps[1] === hole && steps[2] === section, `cycle ${steps.map((s) => (s === section ? "section" : s === hole ? "deduct" : s)).join(" → ")}`);
      return "section → deduct → section";
    },
  },
  {
    title: "S17 AC1, AC3, AC4: with a section selected, Delete removes that section only, no confirm; Backspace does the same; with Doors selected, Delete removes its marks on this sheet",
    run: async ({ page }) => {
      await open(page);
      await click(page, 0.2, 0.2);
      await waitFor(async () => (await selectedSections(page)).length === 1, "section selected", 5000);
      await page.keyboard.press("Delete");
      const two = await waitFor(async () => { const w = await detail(ids.walls); return w.geometries.length === 2 ? w : null; }, "Walls down to two", 10000);
      const dialogs = await page.getByRole("dialog").count();
      await click(page, 0.2, 0.3);
      await waitFor(async () => (await selectedSections(page)).length === 1, "another section selected", 5000);
      await page.keyboard.press("Backspace");
      const one = await waitFor(async () => { const w = await detail(ids.walls); return w.geometries.length === 1 ? w : null; }, "Walls down to one", 10000);
      await click(page, 0.25, 0.7);
      await page.keyboard.press("Delete");
      const gone = await waitFor(async () => (await apiCall(token, "GET", `${takeoff}/item/${ids.doors}`)).status === 404, "Doors gone", 10000);
      expect(dialogs === 0, "a confirm appeared");
      expect(two.geometries.every((g) => g.vertices_json[0][1] !== 0.2) && one.geometries[0].vertices_json[0][1] === 0.1, "the wrong section went");
      return `Delete took the middle section (no confirm), Backspace the third, Delete on Doors its three marks (the item went with its last mark: ${gone})`;
    },
  },
]);

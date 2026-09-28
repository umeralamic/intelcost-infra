// F7-S14: legacy's box select, Ctrl+A and the selection menu; and legacy's Pan tool, which
// takes the drag Select now gives the box (D-66).
//
//   docker compose --profile browser run --rm browser node scripts/f7-h.mjs
//
// The world: a page twice as wide as it is tall (so a turn that stretched would show) at
// 0.1 ft per point; "North" and "South", two areas; "Kerb", a linear run; "Posts", a
// count mark.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { sheetPoint } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F7 box select");
const project = await makeProject(token, base, { name: "Box select" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
const ids = {};

const detail = async (uuid) => (await apiCall(token, "GET", `${takeoff}/item/${uuid}`)).body;
const boxed = (page) => page.locator("[data-box-selected]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-geometry")))]);

async function open(page, { items = true } = {}) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
  if (items) await page.locator("[data-quantity-panel] li[data-item-row]").first().waitFor({ timeout: 15000 });
}
async function drag(page, [ax, ay], [bx, by]) {
  const a = await sheetPoint(page, ax, ay);
  const b = await sheetPoint(page, bx, by);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
}
/** Encloses North and South wherever the turn and flip below leave them, and half of Kerb. */
const BOX = [[0.05, 0.05], [0.5, 0.8]];
const boxedCount = (page, n) => waitFor(async () => { const b = await boxed(page); return b.length === n ? b : null; }, `${n} shapes boxed`, 5000);

await run("f7-h", [
  {
    title: "setup: North and South areas, Kerb a run, Posts a mark, on a 2:1 page",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "B.pdf", buffer: makePdf([{ width: 2000, height: 1000, label: "B" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["B.pdf"].uuid, [1]]]);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      const make = async (name, type, unit, vertices, meta) => {
        const res = await apiCall(token, "POST", `${takeoff}/item`, { name, type, unit, sheet_uuid: sheet.uuid, geometry: { geom_type: type, vertices_json: vertices, shape_meta: meta, client_uuid: crypto.randomUUID() } });
        expect(res.status === 201, `${name}: ${res.status} ${JSON.stringify(res.body)}`);
        return res.body.uuid;
      };
      // Placed so the turn below keeps them on the page and inside BOX, and so Kerb is
      // always half in it and Posts always out.
      ids.north = await make("North", "sf", "SF", [[0.1, 0.3], [0.2, 0.3], [0.2, 0.5], [0.1, 0.5]], { closed: true });
      ids.south = await make("South", "sf", "SF", [[0.25, 0.3], [0.35, 0.3], [0.35, 0.5], [0.25, 0.5]], { closed: true });
      ids.kerb = await make("Kerb", "lf", "LF", [[0.4, 0.4], [0.6, 0.4]], null);
      ids.posts = await make("Posts", "count", "EA", [[0.9, 0.15]], null);
      return "North 20 × 20 ft, South the same, Kerb 40 ft, Posts 1";
    },
  },
  {
    title: "AC1: a Select drag over North, South and half of Kerb selects only North and South",
    run: async ({ page }) => {
      await open(page);
      await drag(page, ...BOX);
      const got = await boxedCount(page, 2);
      const want = [(await detail(ids.north)).geometries[0].uuid, (await detail(ids.south)).geometries[0].uuid];
      expect(want.every((u) => got.includes(u)), `boxed ${got}`);
      return "2 boxed: North and South; Kerb, half inside, not";
    },
  },
  {
    title: "AC2, AC7: a drag over empty sheet selects nothing and lets the selection go; so does a click off every markup, and Escape",
    run: async ({ page }) => {
      await open(page);
      await drag(page, ...BOX);
      await boxedCount(page, 2);
      await drag(page, [0.6, 0.6], [0.9, 0.9]);
      await boxedCount(page, 0);
      const menus = await page.getByRole("menu").count();
      await drag(page, ...BOX);
      await boxedCount(page, 2);
      const empty = await sheetPoint(page, 0.8, 0.8);
      await page.mouse.click(empty.x, empty.y);
      await boxedCount(page, 0);
      await drag(page, ...BOX);
      await boxedCount(page, 2);
      await page.keyboard.press("Escape");
      await boxedCount(page, 0);
      expect(menus === 0, `a menu opened on the empty box (${menus})`);
      return "empty box: nothing selected, no menu; a click off every markup and Escape each cleared it";
    },
  },
  {
    title: "AC3, AC4: Ctrl+A selects all four; right-click: \"4 selected\", Copy, Paste, Move, Rotate Left 90°, Rotate Right 90°, Flip Horizontal, Flip Vertical, Lock, Delete; the action group shows Delete alone",
    run: async ({ page }) => {
      await open(page);
      await page.keyboard.press("Control+a");
      await boxedCount(page, 4);
      const inside = await sheetPoint(page, 0.15, 0.2);
      await page.mouse.click(inside.x, inside.y, { button: "right" });
      const menu = page.getByRole("menu", { name: "Selection" });
      await menu.waitFor({ timeout: 5000 });
      const heading = await menu.getByText("4 selected").count();
      const entries = (await menu.getByRole("menuitem").allInnerTexts()).map((t) => t.split("\n")[0].trim());
      await page.keyboard.press("Escape");
      const pill = page.locator("[data-selection-delete]");
      const title = await pill.getAttribute("title");
      const want = ["Copy", "Paste", "Move", "Rotate Left 90°", "Rotate Right 90°", "Flip Horizontal", "Flip Vertical", "Lock", "Delete"];
      expect(heading === 1, "no \"4 selected\" heading");
      expect(JSON.stringify(entries) === JSON.stringify(want), `entries ${JSON.stringify(entries)}`);
      expect(title === "Delete everything in the selection", `pill title "${title}"`);
      return `"4 selected": ${entries.join(", ")}; the pill "Delete", "${title}"`;
    },
  },
  {
    title: "AC5: Rotate Right 90° and Flip Horizontal turn North and South about their middle on a 2:1 page, every figure unchanged, with legacy's toasts",
    run: async ({ page }) => {
      await open(page);
      const before = [await detail(ids.north), await detail(ids.south)];
      await drag(page, ...BOX);
      await boxedCount(page, 2);
      const inside = await sheetPoint(page, 0.15, 0.2);
      await page.mouse.click(inside.x, inside.y, { button: "right" });
      await page.getByRole("menu", { name: "Selection" }).getByRole("menuitem", { name: "Rotate Right 90°" }).click();
      await page.getByText("Rotated — quantities unchanged").first().waitFor({ timeout: 10000 });
      const turned = await waitFor(async () => { const d = [await detail(ids.north), await detail(ids.south)]; return d.every((x) => x.geometries[0].geometry_version === 2) ? d : null; }, "both turned", 10000);
      // Turned about the middle of both in points: North, 20 ft square, still spans 0.1
      // of this 2:1 page across and 0.2 down. A turn in page fractions would swap them.
      const span = (g) => { const xs = g.vertices_json.map((v) => v[0]); const ys = g.vertices_json.map((v) => v[1]); return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; };
      const [w, h] = span(turned[0].geometries[0]);
      await drag(page, ...BOX);
      await boxedCount(page, 2);
      await page.mouse.click(inside.x, inside.y, { button: "right" });
      await page.getByRole("menu", { name: "Selection" }).getByRole("menuitem", { name: "Flip Horizontal" }).click();
      await page.getByText("Flipped — quantities unchanged").first().waitFor({ timeout: 10000 });
      const flipped = await waitFor(async () => { const d = [await detail(ids.north), await detail(ids.south)]; return d.every((x) => x.geometries[0].geometry_version === 3) ? d : null; }, "both flipped", 10000);
      const same = (a, b) => Math.abs(a.effective_quantity - b.effective_quantity) < 1e-6;
      expect(same(before[0], turned[0]) && same(before[1], turned[1]) && same(before[0], flipped[0]) && same(before[1], flipped[1]), `figures ${before.map((d) => d.effective_quantity)} → ${turned.map((d) => d.effective_quantity)} → ${flipped.map((d) => d.effective_quantity)}`);
      // 20 × 20 ft on a 2:1 page is 0.1 across and 0.2 down before; turned, it is 0.1 × 0.2 still (a square).
      expect(Math.abs(w - 0.1) < 1e-6 && Math.abs(h - 0.2) < 1e-6, `North spans ${w} × ${h} after the turn`);
      return `${before[0].effective_quantity.toFixed(2)} SF each before, after the turn and after the flip; North spans ${w.toFixed(3)} × ${h.toFixed(3)} of the page, a square in points`;
    },
  },
  {
    title: "AC6: → nudges the selection 0.001 of the page, Shift+→ 0.01, one write a press",
    run: async ({ page }) => {
      await open(page);
      await page.keyboard.press("Control+a");
      await boxedCount(page, 4);
      const x0 = (await detail(ids.kerb)).geometries[0].vertices_json[0][0];
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Shift+ArrowRight");
      const after = await waitFor(async () => { const g = (await detail(ids.kerb)).geometries[0]; return g.geometry_version === 3 ? g : null; }, "two nudges written", 10000);
      const moved = after.vertices_json[0][0] - x0;
      expect(Math.abs(moved - 0.011) < 1e-9, `moved ${moved}`);
      return `Kerb moved ${moved.toFixed(3)} in two writes`;
    },
  },
  {
    title: "Copy: \"Copied 2 markups\", each area a second section beside the first; then the Delete pill: \"Deleted the selection\"",
    run: async ({ page }) => {
      await open(page);
      await drag(page, ...BOX);
      await boxedCount(page, 2);
      const inside = await sheetPoint(page, 0.225, 0.2);
      await page.mouse.click(inside.x, inside.y, { button: "right" });
      await page.getByRole("menu", { name: "Selection" }).getByRole("menuitem", { name: "Copy" }).click();
      await page.getByText("Copied 2 markups").first().waitFor({ timeout: 10000 });
      const north = await waitFor(async () => { const d = await detail(ids.north); return d.geometries.length === 2 ? d : null; }, "North copied", 10000);
      await waitFor(async () => (await detail(ids.south)).geometries.length === 2, "South copied", 10000);
      const [a, b] = north.geometries.map((g) => g.vertices_json[0]);
      const offset = [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])];
      // Both copies drawn before Ctrl+A takes what is on the sheet.
      await waitFor(async () => (await page.locator("path[data-geometry], circle[data-geometry]").evaluateAll((els) => new Set(els.map((e) => e.getAttribute("data-geometry"))).size)) === 6, "six shapes drawn", 10000);
      await page.keyboard.press("Control+a");
      await boxedCount(page, 6);
      await page.locator("[data-selection-delete]").click();
      await page.getByText("Deleted the selection").first().waitFor({ timeout: 10000 });
      const left = await waitFor(async () => { const r = await apiCall(token, "GET", `${takeoff}/item?sheet_uuid=${sheet.uuid}`); return r.body.length === 0 ? r.body : null; }, "every item gone", 10000);
      expect(offset.every((o) => Math.abs(o - 0.012) < 1e-9), `copy offset ${offset}`);
      return `North ×2, the copy 0.012 across and down; Delete took all six shapes and their items (${left.length} left)`;
    },
  },
  {
    title: "D-66: Pan (H) — drag to move the sheet; with Select the same drag draws a box and does not pan",
    run: async ({ page }) => {
      // The sheet is empty now: the step before deleted everything.
      await open(page, { items: false });
      await page.getByRole("button", { name: "Zoom in" }).click();
      await page.getByRole("button", { name: "Zoom in" }).click();
      const scroller = page.locator("[data-sheet-scroller]");
      const box = await scroller.boundingBox();
      const pos = () => scroller.evaluate((e) => [e.scrollLeft, e.scrollTop]);
      const dragBy = async () => {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - 150, box.y + box.height / 2 - 100, { steps: 8 });
        await page.mouse.up();
      };
      const s0 = await pos();
      await dragBy();
      const s1 = await pos();
      await page.keyboard.press("h");
      const pan = page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: "Pan" });
      await waitFor(async () => (await pan.getAttribute("aria-pressed")) === "true", "H arms Pan", 5000);
      const title = await pan.getAttribute("title");
      await dragBy();
      const s2 = await pos();
      expect(s1[0] === s0[0] && s1[1] === s0[1], `Select's drag panned: ${s0} → ${s1}`);
      // A 2:1 page at this zoom may have no room to scroll down: across is the proof.
      expect(s2[0] > s1[0], `Pan's drag did not pan: ${s1} → ${s2}`);
      expect(title === "Pan (H) — drag to move the sheet", `title "${title}"`);
      return `Select drag: no pan (${s0} → ${s1}); H armed Pan, "${title}"; its drag panned (${s1} → ${s2})`;
    },
  },
]);

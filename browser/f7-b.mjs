// F7 Block B: the measure tools. S4 Linear's modes, S5 Area's, S6 Segment, S7 Count joins
// the selected count item, S8 finishing, cancelling and the draw menu.
//
//   docker compose --profile browser run --rm browser node scripts/f7-b.mjs
//
// The world: a fresh workspace, one square page (1000 × 1000 pt) at 0.1 ft per point, so
// 0.1 of the page is 10 ft.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { armMeasure, confirmMeasure, sheetPoint } from "./lib/takeoff.mjs";

const FT = 0.1;
const { token, workspace, base } = await freshWorkspace("F7 Block B");
const project = await makeProject(token, base, { name: "Tools" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;

const items = async () => (await apiCall(token, "GET", `${takeoff}/item/detail`)).body;
const byName = async (name) => (await items()).find((i) => i.name === name);
const settled = (name, test, what) => waitFor(async () => { const i = await byName(name); return i && test(i) ? i : null; }, what ?? name, 10000);
const tools = (page) => page.getByRole("group", { name: "Takeoff tools" });
// Clicks land on whole pixels, about 0.125 ft each on this page, so a drawn figure is
// checked to that precision; `f7-a` proves the arithmetic exactly.
const near = (a, b) => Math.abs(a - b) <= Math.max(0.5, 0.02 * Math.abs(b));

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
}
async function click(page, x, y) {
  const p = await sheetPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}
/** Pick a mode from the tool's caret, then answer New Measurement. */
async function armMode(page, tool, mode, name) {
  await tools(page).getByRole("button", { name: `Change ${tool} mode` }).click();
  await page.getByRole("menuitem", { name: new RegExp(`^${mode}`) }).click();
  await confirmMeasure(page, { name });
}

await run("f7-b", [
  {
    title: "setup: one square page at 0.1 ft per point",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Tools.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "T1" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Tools.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: "Custom", unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      return "scaled";
    },
  },
  {
    title: "S4 AC1: Linear's caret lists Point to Point, Rectangle, Ellipse / Circle and Arc with legacy's hints, the current one marked; the button's title names the mode",
    run: async ({ page }) => {
      await open(page);
      const linear = tools(page).getByRole("button", { name: "Linear", exact: true });
      const before = await linear.getAttribute("title");
      await tools(page).getByRole("button", { name: "Change Linear mode" }).click();
      const entries = await page.getByRole("menuitem").allInnerTexts();
      await page.keyboard.press("Escape");
      const flat = entries.map((e) => e.replace(/\s+/g, " ").trim());
      expect(flat.length === 4 && flat[0].startsWith("Point to Point Click to place points, Enter/double-click to finish") && flat[0].endsWith("●"), `entries: ${JSON.stringify(flat)}`);
      expect(flat[1].startsWith("Rectangle Two clicks — opposite corners; measures perimeter") && flat[3].startsWith("Arc Three clicks — start, through, end; measures arc length"), `entries: ${JSON.stringify(flat)}`);
      expect(before === "Linear — Point to Point (change mode with ▾)", `title "${before}"`);
      return `title "${before}"; ${flat.map((f) => f.split(" ")[0]).join(", ")}; current marked ●`;
    },
  },
  {
    title: "S4 AC2 to AC4: a Linear rectangle of two clicks, 20 × 10 ft, is 60 LF; a circle 20 ft across by two clicks 62.83 LF; an arc through three clicks, a half circle of radius 10 ft, 31.42 LF; three clicks in a line are a two-segment run",
    run: async ({ page }) => {
      await open(page);
      await armMode(page, "Linear", "Rectangle", "Rect run");
      const title = await tools(page).getByRole("button", { name: "Linear", exact: true }).getAttribute("title");
      await click(page, 0.1, 0.1);
      await click(page, 0.3, 0.2);
      const rect = await settled("Rect run", (i) => i.effective_quantity > 0);
      await armMode(page, "Linear", "Ellipse / Circle", "Circle run");
      await click(page, 0.4, 0.1);
      await click(page, 0.6, 0.3);
      const circle = await settled("Circle run", (i) => i.effective_quantity > 0);
      await armMode(page, "Linear", "Arc", "Arc run");
      await click(page, 0.1, 0.5);
      await click(page, 0.2, 0.4);
      await click(page, 0.3, 0.5);
      const arc = await settled("Arc run", (i) => i.effective_quantity > 0);
      await armMode(page, "Linear", "Arc", "Straight arc");
      await click(page, 0.1, 0.7);
      await click(page, 0.2, 0.7);
      await click(page, 0.3, 0.7);
      const straight = await settled("Straight arc", (i) => i.effective_quantity > 0);
      expect(title === "Linear — Rectangle (change mode with ▾)", `title "${title}"`);
      expect(near(rect.effective_quantity, 60) && rect.geometries[0].shape_meta?.kind === "rectangle", `rectangle ${rect.effective_quantity}`);
      expect(near(circle.effective_quantity, 2 * Math.PI * 10) && circle.geometries[0].shape_meta?.kind === "ellipse", `circle ${circle.effective_quantity}`);
      expect(near(arc.effective_quantity, Math.PI * 10) && arc.geometries[0].shape_meta?.kind === "arc", `arc ${arc.effective_quantity}`);
      expect(near(straight.effective_quantity, 20) && straight.geometries[0].shape_meta === null && straight.geometries[0].vertices_json.length === 3, `straight ${straight.effective_quantity}`);
      return `"${title}"; rectangle ${rect.effective_quantity.toFixed(2)} LF, circle ${circle.effective_quantity.toFixed(2)} LF, arc ${arc.effective_quantity.toFixed(2)} LF, collinear ${straight.effective_quantity.toFixed(2)} LF in 2 segments`;
    },
  },
  {
    title: "S4 AC5, S5 AC1 to AC3: press and drag places a Linear rectangle; Area rectangle 20 × 30 ft is 600 SF, an Area circle of radius 10 ft 314.16 SF; in Area's Point to Point a press and drag places a rectangle",
    run: async ({ page }) => {
      await open(page);
      const drag = async (a, b) => {
        const [p, q] = [await sheetPoint(page, ...a), await sheetPoint(page, ...b)];
        await page.mouse.move(p.x, p.y);
        await page.mouse.down();
        await page.mouse.move((p.x + q.x) / 2, (p.y + q.y) / 2, { steps: 4 });
        await page.mouse.move(q.x, q.y, { steps: 4 });
        await page.mouse.up();
      };
      await armMode(page, "Linear", "Rectangle", "Dragged run");
      await drag([0.6, 0.6], [0.7, 0.7]);
      const dragged = await settled("Dragged run", (i) => i.effective_quantity > 0);
      await armMode(page, "Area", "Rectangle", "Rect area");
      await click(page, 0.1, 0.65);
      await click(page, 0.3, 0.95);
      const rect = await settled("Rect area", (i) => i.effective_quantity > 0);
      await armMode(page, "Area", "Ellipse / Circle", "Circle area");
      await click(page, 0.75, 0.3);
      await click(page, 0.95, 0.5);
      const circle = await settled("Circle area", (i) => i.effective_quantity > 0);
      await armMode(page, "Area", "Point to Point", "Dragged area");
      await drag([0.45, 0.75], [0.55, 0.85]);
      const p2p = await settled("Dragged area", (i) => i.effective_quantity > 0);
      expect(near(dragged.effective_quantity, 40), `dragged run ${dragged.effective_quantity}`);
      expect(near(rect.effective_quantity, 600), `area rectangle ${rect.effective_quantity}`);
      expect(near(circle.effective_quantity, Math.PI * 100), `area circle ${circle.effective_quantity}`);
      expect(near(p2p.effective_quantity, 100) && p2p.geometries[0].shape_meta?.kind === "rectangle", `p2p drag ${p2p.effective_quantity}`);
      return `dragged Linear rectangle ${dragged.effective_quantity.toFixed(2)} LF; Area rectangle ${rect.effective_quantity.toFixed(2)} SF; circle ${circle.effective_quantity.toFixed(2)} SF; Point to Point drag placed a ${p2p.effective_quantity.toFixed(2)} SF rectangle`;
    },
  },
  {
    title: "S6: Segment's title in legacy's words; two clicks commit a segment and the next click starts the next; both are shapes of one item, which reads their sum",
    run: async ({ page }) => {
      await open(page);
      const segment = tools(page).getByRole("button", { name: "Segment", exact: true });
      const title = await segment.getAttribute("title");
      await segment.click();
      await confirmMeasure(page, { name: "Segments" });
      await click(page, 0.1, 0.3);
      await click(page, 0.2, 0.3);
      await settled("Segments", (i) => i.geometries.length === 1, "first segment");
      await click(page, 0.1, 0.35);
      await click(page, 0.1, 0.45);
      const two = await settled("Segments", (i) => i.geometries.length === 2, "second segment");
      expect(title === "Segment — two clicks per segment; auto-commits, then places the next", `title "${title}"`);
      expect(near(two.effective_quantity, 20), `sum ${two.effective_quantity}`);
      return `"${title}"; two segments of one item, ${two.effective_quantity.toFixed(2)} LF`;
    },
  },
  {
    title: "S7: with the count item selected, Count adds five marks to it, 5 EA, no dialog and no new item; with nothing selected, Count asks first; right-click a mark → Delete this point",
    run: async ({ page }) => {
      const made = await apiCall(token, "POST", `${takeoff}/item`, {
        name: "Receptacles", type: "count", unit: "EA", sheet_uuid: sheet.uuid,
        geometry: { geom_type: "count", vertices_json: [[0.5, 0.5]], client_uuid: crypto.randomUUID() },
      });
      expect(made.status === 201, `seed: ${made.status}`);
      await open(page);
      const before = (await items()).length;
      await page.locator("[data-quantity-panel] li[data-item-row] > button").filter({ has: page.getByText("Receptacles", { exact: true }) }).first().click();
      await tools(page).getByRole("button", { name: "Count", exact: true }).click();
      const asked = await page.locator('[data-measurement-dialog="create"]').isVisible();
      for (const [x, y] of [[0.52, 0.5], [0.54, 0.5], [0.56, 0.5], [0.58, 0.5]]) await click(page, x, y);
      const five = await settled("Receptacles", (i) => i.effective_quantity === 5, "5 EA");
      const after = (await items()).length;
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      // Nothing selected: Count asks.
      await page.locator("[data-quantity-panel] li[data-item-row] > button").filter({ has: page.getByText("Segments", { exact: true }) }).first().click();
      await tools(page).getByRole("button", { name: "Count", exact: true }).click();
      await page.locator('[data-measurement-dialog="create"]').waitFor({ timeout: 5000 });
      await page.locator('[data-measurement-dialog="create"]').getByRole("button", { name: "Cancel" }).click();
      await tools(page).getByRole("button", { name: "Select", exact: true }).click();
      const mark = await sheetPoint(page, 0.58, 0.5);
      await page.mouse.click(mark.x, mark.y, { button: "right" });
      await page.getByRole("menuitem", { name: /^Delete this point/ }).click();
      const four = await settled("Receptacles", (i) => i.effective_quantity === 4, "4 EA");
      expect(!asked && after === before, `asked ${asked}; items ${before} → ${after}`);
      return `no dialog; ${five.effective_quantity} EA on Receptacles, still ${after} items; a Linear selected: Count asked first; Delete this point → ${four.effective_quantity} EA`;
    },
  },
  {
    title: "S8: Enter finishes Point to Point; Backspace takes the last point back; the first Escape keeps a run that has enough points, the second puts the tool down; mid-run right-click: New Section, Close (off with two points), Stop, Discard",
    run: async ({ page }) => {
      await open(page);
      await armMeasure(page, "Linear", { name: "Keyed" });
      await click(page, 0.1, 0.15);
      await click(page, 0.2, 0.15);
      await click(page, 0.25, 0.15);
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Enter");
      const keyed = await settled("Keyed", (i) => i.effective_quantity > 0);
      await click(page, 0.1, 0.18);
      await click(page, 0.15, 0.18);
      await page.keyboard.press("Escape");
      const kept = await settled("Keyed", (i) => i.geometries.length === 2, "Escape kept the run");
      const stillArmed = await tools(page).getByRole("button", { name: "Linear", exact: true }).getAttribute("aria-pressed");
      await page.keyboard.press("Escape");
      const down = await tools(page).getByRole("button", { name: "Select", exact: true }).getAttribute("aria-pressed");
      // The draw menu on an area.
      await armMeasure(page, "Area", { name: "Menu area" });
      await click(page, 0.6, 0.4);
      await click(page, 0.7, 0.4);
      const p = await sheetPoint(page, 0.7, 0.45);
      await page.mouse.click(p.x, p.y, { button: "right" });
      const menu = page.getByRole("menu", { name: "Drawing" });
      const entries = await menu.getByRole("menuitem").allInnerTexts();
      const closeOff = (await menu.getByRole("menuitem", { name: "Close" }).getAttribute("aria-disabled")) === "true";
      await page.keyboard.press("Escape");
      await menu.waitFor({ state: "detached" });
      await click(page, 0.7, 0.5);
      await page.mouse.click(p.x, p.y, { button: "right" });
      await page.getByRole("menu", { name: "Drawing" }).getByRole("menuitem", { name: "Stop" }).click();
      const area = await settled("Menu area", (i) => i.effective_quantity > 0);
      const afterStop = await tools(page).getByRole("button", { name: "Select", exact: true }).getAttribute("aria-pressed");
      expect(near(keyed.effective_quantity, 10), `Backspace then Enter: ${keyed.effective_quantity}`);
      expect(kept.geometries.length === 2 && stillArmed === "true" && down === "true", `Escape: armed ${stillArmed}, then Select ${down}`);
      expect(entries.map((e) => e.trim()).join() === "New Section,Close,Stop,Discard" && closeOff, `menu ${JSON.stringify(entries)}, Close off ${closeOff}`);
      expect(near(area.effective_quantity, 50) && afterStop === "true", `Stop: ${area.effective_quantity}, Select ${afterStop}`);
      return `Backspace + Enter: ${keyed.effective_quantity.toFixed(2)} LF; Escape kept the run and the tool, again put it down; menu ${entries.map((e) => e.trim()).join(" · ")}, Close off at two points; Stop committed ${area.effective_quantity.toFixed(2)} SF and returned to Select`;
    },
  },
]);

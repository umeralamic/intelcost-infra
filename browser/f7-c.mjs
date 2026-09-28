// F7-S10: Snap and Ortho (D-63: the canvas bar shows the two; Snap PDF, Auto Merge and
// Auto Scroll join it with their features).
//
//   docker compose --profile browser run --rm browser node scripts/f7-c.mjs
//
// The world: a fresh workspace, one square page at 0.1 ft per point, and an existing run
// "Anchor" from (0.2, 0.2) to (0.6, 0.2) and "Cross" from (0.4, 0.1) to (0.4, 0.3).

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { armMeasure, sheetPoint } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F7 snap");
const project = await makeProject(token, base, { name: "Snap" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;

const bar = (page) => page.locator("[data-canvas-bar]");
const byName = async (name) => (await apiCall(token, "GET", `${takeoff}/item/detail`)).body.find((i) => i.name === name);
const made = (name) => waitFor(() => byName(name), name, 10000);

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
}
/** Click (dx, dy) screen px off a sheet point. */
async function clickOff(page, x, y, dx = 0, dy = 0) {
  const p = await sheetPoint(page, x, y);
  await page.mouse.move(p.x + dx, p.y + dy);
  await page.mouse.click(p.x + dx, p.y + dy);
}
const vertex = (item, i) => item.geometries[0].vertices_json[i];

await run("f7-c", [
  {
    title: "setup: a square page at 0.1 ft per point; the runs Anchor and Cross",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Snap.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "S" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Snap.pdf"].uuid, [1]]]);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      // Anchor's midpoint (0.4, 0.2) and the crossing (0.5, 0.2) are different points.
      for (const [name, a, b] of [["Anchor", [0.2, 0.2], [0.6, 0.2]], ["Cross", [0.5, 0.1], [0.5, 0.4]]]) {
        const res = await apiCall(token, "POST", `${takeoff}/item`, { name, type: "lf", unit: "LF", sheet_uuid: sheet.uuid, geometry: { geom_type: "lf", vertices_json: [a, b], client_uuid: crypto.randomUUID() } });
        expect(res.status === 201, `${name}: ${res.status}`);
      }
      return "two runs";
    },
  },
  {
    title: "S10 AC1: the canvas bar reads \"Ortho: Off\" and \"Snap: On\", each with legacy's title, each toggling on a click",
    run: async ({ page }) => {
      await open(page);
      const ortho = bar(page).getByRole("button", { name: /^Ortho:/ });
      const snap = bar(page).getByRole("button", { name: /^Snap:/ });
      const first = [(await ortho.innerText()).trim(), (await snap.innerText()).trim()];
      const titles = [await ortho.getAttribute("title"), await snap.getAttribute("title")];
      await ortho.click();
      await snap.click();
      const flipped = [(await ortho.innerText()).trim(), (await snap.innerText()).trim()];
      expect(first.join() === "Ortho: Off,Snap: On" && flipped.join() === "Ortho: On,Snap: Off", `${first} → ${flipped}`);
      expect(titles[0] === "Lock lines to 45° increments (hold Alt for 22.5°) — O" && titles[1] === "Snap to nearby points and lines on your own measurements (S)", `titles ${JSON.stringify(titles)}`);
      return `${first.join(", ")} → ${flipped.join(", ")}; titles in legacy's words`;
    },
  },
  {
    title: "S10 AC2: with Snap on, a click a few px from Anchor's end lands on it, near its middle on the midpoint, near where Anchor and Cross cross on the crossing, and near its edge onto the edge",
    run: async ({ page }) => {
      await open(page);
      await armMeasure(page, "Linear", { name: "Snapped" });
      await clickOff(page, 0.6, 0.2, 6, 5);
      await clickOff(page, 0.4, 0.2, 5, -6);
      await clickOff(page, 0.5, 0.2, 6, 5);
      await clickOff(page, 0.3, 0.2, 3, 7);
      await page.keyboard.press("Enter");
      const run = await made("Snapped");
      const [end, mid, cross, edge] = [0, 1, 2, 3].map((i) => vertex(run, i));
      const on = (p, q) => Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9;
      expect(on(end, [0.6, 0.2]), `vertex ${end}`);
      expect(on(mid, [0.4, 0.2]), `midpoint ${mid}`);
      expect(on(cross, [0.5, 0.2]), `crossing ${cross}`);
      expect(Math.abs(edge[1] - 0.2) < 1e-9 && Math.abs(edge[0] - 0.3) > 1e-6, `edge ${edge}`);
      return `vertex ${end}; midpoint ${mid}; crossing ${cross}; onto the edge ${edge.map((v) => v.toFixed(4))}`;
    },
  },
  {
    title: "S10 AC4, AC5: with Ortho on the run locks to 45°; S and O mid-draw toggle Snap and Ortho",
    run: async ({ page }) => {
      await open(page);
      await armMeasure(page, "Linear", { name: "Ortho run" });
      await clickOff(page, 0.2, 0.6);
      await page.keyboard.press("o");
      const orthoOn = (await bar(page).getByRole("button", { name: /^Ortho:/ }).innerText()).trim();
      await page.keyboard.press("s");
      const snapOff = (await bar(page).getByRole("button", { name: /^Snap:/ }).innerText()).trim();
      await clickOff(page, 0.4, 0.75);
      await page.keyboard.press("Enter");
      const r = await made("Ortho run");
      const [a, b] = [vertex(r, 0), vertex(r, 1)];
      const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      expect(orthoOn === "Ortho: On" && snapOff === "Snap: Off", `${orthoOn}, ${snapOff}`);
      expect(Math.abs(angle - 45) < 0.5, `angle ${angle}`);
      return `O → "${orthoOn}", S → "${snapOff}"; a click at 37° landed at ${angle.toFixed(2)}°`;
    },
  },
  {
    title: "S9 AC1, AC2, AC5: mid-run, A arms an arc; two clicks bend the edge through the middle one and the run goes on; Backspace unwinds the through point first; the figure is the arc's own (a half circle of radius 10 ft and 10 ft straight: 41.42 LF); an area closed by an arc reads the half disc, 157.08 SF",
    run: async ({ page }) => {
      await open(page);
      await armMeasure(page, "Linear", { name: "Bent run" });
      await clickOff(page, 0.1, 0.8);
      await page.keyboard.press("a");
      await clickOff(page, 0.15, 0.6);
      await page.keyboard.press("Backspace");
      await clickOff(page, 0.2, 0.7);
      await clickOff(page, 0.3, 0.8);
      await clickOff(page, 0.4, 0.8);
      await page.keyboard.press("Enter");
      const run = await made("Bent run");
      const arcs = run.geometries[0].shape_meta?.arcs ?? [];
      await armMeasure(page, "Area", { name: "Half disc" });
      await clickOff(page, 0.6, 0.8);
      await clickOff(page, 0.8, 0.8);
      await page.keyboard.press("a");
      await clickOff(page, 0.7, 0.9);
      await clickOff(page, 0.6, 0.8);
      await page.keyboard.press("Enter");
      const disc = await made("Half disc");
      const near = (a, b) => Math.abs(a - b) <= Math.max(0.5, 0.02 * b);
      // Start, the arc's end, the last click: the through point shapes the arc only.
      expect(arcs.length === 1 && run.geometries[0].vertices_json.length === 3, `run: ${run.geometries[0].vertices_json.length} points, ${arcs.length} arcs`);
      expect(near(run.effective_quantity, Math.PI * 10 + 10), `run ${run.effective_quantity}`);
      expect(near(disc.effective_quantity, (Math.PI * 100) / 2) && (disc.geometries[0].shape_meta?.arcs ?? []).length === 1, `disc ${disc.effective_quantity}`);
      return `the run: 3 points, one arc, ${run.effective_quantity.toFixed(2)} LF (the through point Backspace took back was not used); the area closed by an arc ${disc.effective_quantity.toFixed(2)} SF`;
    },
  },
]);

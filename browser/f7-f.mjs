// F7-S18: deducts drawn on the canvas ("Subtract from section"), legacy's refusals, and
// overlapping holes merged; the figure from the api (D-61).
//
//   docker compose --profile browser run --rm browser node scripts/f7-f.mjs
//
// The world: a square page at 0.1 ft per point and the seed square, "Seed", 40 × 40 ft
// (1,600 SF) from (0.2, 0.2) to (0.6, 0.6).

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { sheetPoint } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F7 deducts");
const project = await makeProject(token, base, { name: "Deducts" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
let seed;

const qty = async () => (await apiCall(token, "GET", `${takeoff}/item/${seed}`)).body.effective_quantity;
const holes = async () => (await apiCall(token, "GET", `${takeoff}/item/${seed}`)).body.geometries.filter((g) => g.role === "subtract").length;

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
  await page.locator("[data-quantity-panel] li[data-item-row]").first().waitFor({ timeout: 15000 });
  // Exact boxes: Snap would pull a corner onto the seed's edge.
  const snap = page.locator("[data-canvas-bar]").getByRole("button", { name: /^Snap:/ });
  if ((await snap.innerText()).trim() === "Snap: On") await snap.click();
}
async function box(page, a, b) {
  for (const [x, y] of [a, b]) {
    const p = await sheetPoint(page, x, y);
    await page.mouse.click(p.x, p.y);
  }
}
const settle = (test, what) => waitFor(async () => { const q = await qty(); return test(q) ? q : null; }, what, 10000);
const near = (a, b) => Math.abs(a - b) <= Math.max(0.5, 0.01 * b);

await run("f7-f", [
  {
    title: "setup: the seed square, 1,600 SF",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "D.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "D" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["D.pdf"].uuid, [1]]]);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      const made = await apiCall(token, "POST", `${takeoff}/item`, { name: "Seed", type: "sf", unit: "SF", sheet_uuid: sheet.uuid, geometry: { geom_type: "sf", vertices_json: [[0.2, 0.2], [0.6, 0.2], [0.6, 0.6], [0.2, 0.6]], shape_meta: { closed: true }, client_uuid: crypto.randomUUID() } });
      seed = made.body.uuid;
      return `Seed ${made.body.effective_quantity} SF`;
    },
  },
  {
    title: "S18 AC1, AC2: right-click the seed, \"Subtract from section\", \"Rectangle\": a 10 × 10 ft box reads 1,500 SF with \"Subtracted\", \"Applied to \\\"Seed\\\".\"; the tool stays armed and a second box cuts again",
    run: async ({ page }) => {
      await open(page);
      const inside = await sheetPoint(page, 0.4, 0.4);
      await page.mouse.click(inside.x, inside.y, { button: "right" });
      await page.getByRole("menu", { name: "Item actions" }).getByRole("menuitem", { name: /^Rectangle/ }).click();
      await box(page, [0.25, 0.25], [0.35, 0.35]);
      const one = await settle((q) => near(q, 1500), "1,500 SF");
      await page.getByText("Subtracted").first().waitFor({ timeout: 5000 });
      const applied = await page.getByText('Applied to "Seed".').count();
      await box(page, [0.45, 0.45], [0.55, 0.55]);
      const two = await settle((q) => near(q, 1400), "1,400 SF");
      expect(applied >= 1, "no \"Applied to\" line");
      return `${one.toFixed(2)} SF with "Subtracted" / "Applied to "Seed"."; a second box without re-arming: ${two.toFixed(2)} SF`;
    },
  },
  {
    title: "S18 AC3 to AC5: a box outside: \"Subtract has no overlap\", nothing changes; a box over the edge bites only what it covers; a box over all: \"Deduction covers the whole area\"; a hole overlapping another merges, the overlap once",
    run: async ({ page }) => {
      await open(page);
      const inside = await sheetPoint(page, 0.4, 0.4);
      await page.mouse.click(inside.x, inside.y, { button: "right" });
      await page.getByRole("menu", { name: "Item actions" }).getByRole("menuitem", { name: /^Rectangle/ }).click();
      await box(page, [0.7, 0.7], [0.8, 0.8]);
      await page.getByText("Subtract has no overlap").first().waitFor({ timeout: 5000 });
      const unchanged = await qty();
      // Over the right edge: 10 ft wide, 5 ft of it inside, 10 ft tall.
      await box(page, [0.55, 0.3], [0.65, 0.4]);
      const bitten = await settle((q) => near(q, 1400 - 50), "1,350 SF");
      await box(page, [0.1, 0.1], [0.7, 0.7]);
      await page.getByText("Deduction covers the whole area").first().waitFor({ timeout: 5000 });
      // Overlapping the first hole (0.25–0.35) by half: 50 SF new.
      await box(page, [0.3, 0.25], [0.4, 0.35]);
      const merged = await settle((q) => near(q, 1350 - 50), "1,300 SF");
      expect(near(unchanged, 1400), `outside changed it: ${unchanged}`);
      return `outside refused, still ${unchanged.toFixed(2)}; over the edge ${bitten.toFixed(2)}; all refused; overlapping hole ${merged.toFixed(2)} SF (${await holes()} deducts)`;
    },
  },
]);

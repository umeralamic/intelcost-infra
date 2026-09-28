// F7-S16: legacy's copy and paste. "Copy…" on a section, what to take, where to paste,
// the ghost, "Paste copy" with Same item or New item; real-world size kept across sheets
// of another scale and shape (D-67); a section's deduct comes with it; an uncalibrated
// target refused with the copy still in hand.
//
//   docker compose --profile browser run --rm browser node scripts/f7-i.mjs
//
// The world: S1, a square page at 0.1 ft per point: "Wall", three 20 ft runs; "Slab", a
// 20 ft square less a 5 ft square hole, 375 SF. S2, a 2:1 page at 0.05 ft per point (the
// same 100 ft across, half as far down). S3, not calibrated.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { sheetPoint } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F7 copy paste");
const project = await makeProject(token, base, { name: "Copy paste" });
const takeoff = `${base}/${project.uuid}/takeoff`;
const sheets = {};
const ids = {};

const detail = async (uuid) => (await apiCall(token, "GET", `${takeoff}/item/${uuid}`)).body;
const itemsOn = async (sheet) => (await apiCall(token, "GET", `${takeoff}/item/detail?sheet_uuid=${sheet.uuid}`)).body;

async function open(page, sheet) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
  await page.locator("[data-quantity-panel] li[data-item-row]").first().waitFor({ timeout: 15000 });
}
async function rightClick(page, x, y) {
  const p = await sheetPoint(page, x, y);
  await page.mouse.click(p.x, p.y, { button: "right" });
}
async function clickAt(page, x, y) {
  const p = await sheetPoint(page, x, y);
  await page.mouse.move(p.x - 20, p.y - 20);
  await page.mouse.move(p.x, p.y, { steps: 4 });
  await page.mouse.click(p.x, p.y);
}
const entries = async (menu) => (await menu.getByRole("menuitem").allInnerTexts()).map((t) => t.split("\n")[0].trim());

await run("f7-i", [
  {
    title: "setup: S1 with Wall (three runs) and Slab (375 SF with its hole); S2 2:1 at another scale; S3 unscaled",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "C.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "S1" }, { width: 2000, height: 1000, label: "S2" }, { width: 1000, height: 1000, label: "S3" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["C.pdf"].uuid, [1, 2, 3]]]);
      const all = (await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid)).sort((a, b) => a.page_number - b.page_number);
      [sheets.s1, sheets.s2, sheets.s3] = all;
      await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheets.s1.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheets.s2.uuid}/scale`, { feet_per_pt: 0.05, label: "Custom", unit: "ft" });
      const wall = await apiCall(token, "POST", `${takeoff}/item`, { name: "Wall", type: "lf", unit: "LF", sheet_uuid: sheets.s1.uuid, geometry: { geom_type: "lf", vertices_json: [[0.1, 0.2], [0.3, 0.2]], shape_meta: null, client_uuid: crypto.randomUUID() } });
      ids.wall = wall.body.uuid;
      await apiCall(token, "POST", `${takeoff}/item/${ids.wall}/shapes`, {
        create: [0.3, 0.4].map((y) => ({ geom_type: "lf", vertices_json: [[0.1, y], [0.3, y]], shape_meta: null, client_uuid: crypto.randomUUID(), sheet_uuid: sheets.s1.uuid })),
      });
      const slab = await apiCall(token, "POST", `${takeoff}/item`, { name: "Slab", type: "sf", unit: "SF", sheet_uuid: sheets.s1.uuid, geometry: { geom_type: "sf", vertices_json: [[0.5, 0.5], [0.7, 0.5], [0.7, 0.7], [0.5, 0.7]], shape_meta: { closed: true }, client_uuid: crypto.randomUUID() } });
      ids.slab = slab.body.uuid;
      const section = (await detail(ids.slab)).geometries[0].uuid;
      await apiCall(token, "POST", `${takeoff}/item/${ids.slab}/shapes`, { create: [{ geom_type: "sf", vertices_json: [[0.55, 0.55], [0.6, 0.55], [0.6, 0.6], [0.55, 0.6]], shape_meta: { closed: true }, client_uuid: crypto.randomUUID(), role: "subtract", owner_uuid: section }] });
      const w = await detail(ids.wall);
      const s = await detail(ids.slab);
      expect(w.geometries.length === 3 && Math.abs(w.effective_quantity - 60) < 1e-6 && Math.abs(s.effective_quantity - 375) < 1e-6, `Wall ${w.geometries.length} runs ${w.effective_quantity} LF, Slab ${s.effective_quantity} SF`);
      return "Wall 60 LF in three runs, Slab 375 SF";
    },
  },
  {
    title: "AC1 to AC4: right-click a Wall run, \"Copy…\": \"This section only\", \"All sections on this sheet (3)\", \"Choose sections…\", \"Cancel\"; then \"Paste on this sheet\"; the ghost a dashed line; a click asks \"Paste into \"Wall\" or create a new item?\"; Same item adds the run",
    run: async ({ page }) => {
      await open(page, sheets.s1);
      await rightClick(page, 0.2, 0.2);
      await page.getByRole("menu", { name: "Item actions" }).getByRole("menuitem", { name: "Copy…" }).click();
      const scope = page.getByRole("menu", { name: "Copy scope" });
      await scope.waitFor({ timeout: 5000 });
      const scopeEntries = await entries(scope);
      await scope.getByRole("menuitem", { name: "This section only" }).click();
      const where = page.getByRole("menu", { name: "Copy destination" });
      await where.waitFor({ timeout: 5000 });
      const whereEntries = await entries(where);
      await where.getByRole("menuitem", { name: "Paste on this sheet" }).click();
      await page.getByText("Click where you want to place it. Esc to cancel.").first().waitFor({ timeout: 5000 });
      const banner = await page.locator("[data-copy-banner]").innerText();
      const ghostKind = await page.locator("[data-ghost]").first().getAttribute("data-ghost-kind");
      const ghostFill = await page.locator("[data-ghost]").first().getAttribute("fill");
      await clickAt(page, 0.2, 0.6);
      const dialog = page.getByRole("dialog", { name: "Paste copy" });
      await dialog.waitFor({ timeout: 5000 });
      const asks = await dialog.getByText('Paste into "Wall" or create a new item?').count();
      const buttons = (await dialog.getByRole("button").allInnerTexts()).map((t) => t.trim()).filter((t) => ["Back", "Cancel", "New item", "Same item"].includes(t));
      await dialog.getByRole("button", { name: "Same item" }).click();
      await page.getByText('Into "Wall".').first().waitFor({ timeout: 10000 });
      const wall = await waitFor(async () => { const d = await detail(ids.wall); return d.geometries.length === 4 ? d : null; }, "a fourth run", 10000);
      // Put down where the click fell: within a pixel of y 0.6, its length exact.
      const fresh = wall.geometries.find((g) => Math.abs(g.vertices_json[0][1] - 0.6) < 0.005);
      expect(JSON.stringify(scopeEntries) === JSON.stringify(["This section only", "All sections on this sheet (3)", "Choose sections…", "Cancel"]), `scope ${JSON.stringify(scopeEntries)}`);
      expect(JSON.stringify(whereEntries) === JSON.stringify(["Paste on this sheet", "Paste on another sheet…", "Cancel"]), `where ${JSON.stringify(whereEntries)}`);
      expect(/click where you want to place it \(sheet switch allowed\)/.test(banner), `banner "${banner}"`);
      expect(ghostKind === "lf" && ghostFill === "none", `ghost ${ghostKind} fill ${ghostFill}`);
      expect(asks === 1 && JSON.stringify(buttons) === JSON.stringify(["Back", "Cancel", "New item", "Same item"]), `dialog ${asks}, ${JSON.stringify(buttons)}`);
      expect(fresh && Math.abs(fresh.vertices_json[1][0] - fresh.vertices_json[0][0] - 0.2) < 1e-9 && Math.abs(fresh.vertices_json[0][0] - 0.1) < 0.005 && Math.abs(wall.effective_quantity - 80) < 1e-6, `Wall ${wall.effective_quantity} LF, the copy ${JSON.stringify(wall.geometries.map((g) => g.vertices_json))}`);
      return `scope and destination in legacy's words; the ghost a dashed line; "Paste copy" with Back, Cancel, New item, Same item; Wall 60 → 80 LF, the copy at y 0.6`;
    },
  },
  {
    title: "AC5, AC7, S19 AC2: Slab (one section: no scope step) pasted on S2, 2:1 at half the scale, as a New item: \"Slab copy\", its hole with it, still 375 SF; the dialog says the scales differ",
    run: async ({ page }) => {
      await open(page, sheets.s1);
      await rightClick(page, 0.52, 0.52);
      await page.getByRole("menu", { name: "Item actions" }).getByRole("menuitem", { name: "Copy…" }).click();
      const where = page.getByRole("menu", { name: "Copy destination" });
      await where.waitFor({ timeout: 5000 });
      await where.getByRole("menuitem", { name: "Paste on another sheet…" }).click();
      const picker = page.getByRole("menu", { name: "Paste on another sheet" });
      await picker.waitFor({ timeout: 5000 });
      const rows = (await entries(picker)).filter((t) => t !== "Cancel");
      await picker.getByRole("menuitem").first().click();
      await page.waitForURL((url) => url.pathname.endsWith(sheets.s2.uuid), { timeout: 10000 });
      await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
      await page.locator("[data-ghost]").first().waitFor({ timeout: 10000 });
      await clickAt(page, 0.5, 0.5);
      const dialog = page.getByRole("dialog", { name: "Paste copy" });
      await dialog.waitFor({ timeout: 5000 });
      const differs = await dialog.getByText("Target sheet has a different scale — geometry will be rescaled to preserve real-world quantities.").count();
      await dialog.getByRole("button", { name: "New item" }).click();
      await page.getByText('"Slab copy" created.').first().waitFor({ timeout: 10000 });
      const copy = await waitFor(async () => (await itemsOn(sheets.s2)).find((i) => i.name === "Slab copy") ?? null, "Slab copy on S2", 10000);
      const hole = copy.geometries.find((g) => g.role === "subtract");
      const section = copy.geometries.find((g) => g.role !== "subtract");
      expect(rows.length === 2, `the picker lists ${JSON.stringify(rows)}`);
      expect(differs === 1, "the dialog does not say the scales differ");
      expect(hole && section && hole.owner_uuid === section.uuid, `the hole came as ${JSON.stringify(hole)}`);
      expect(Math.abs(copy.effective_quantity - 375) < 1e-6, `Slab copy ${copy.effective_quantity} SF`);
      return `picker: ${rows.join(", ")}; "different scale" shown; "Slab copy" on S2 with its hole re-paired, ${copy.effective_quantity} SF as on S1`;
    },
  },
  {
    title: "AC6: pasted on the unscaled S3: \"Target sheet is not calibrated\", the copy still in hand; Escape lets it go",
    run: async ({ page }) => {
      await open(page, sheets.s1);
      await rightClick(page, 0.52, 0.52);
      await page.getByRole("menu", { name: "Item actions" }).getByRole("menuitem", { name: "Copy…" }).click();
      await page.getByRole("menu", { name: "Copy destination" }).getByRole("menuitem", { name: "Paste on another sheet…" }).click();
      await page.getByRole("menu", { name: "Paste on another sheet" }).getByRole("menuitem").nth(1).click();
      await page.waitForURL((url) => url.pathname.endsWith(sheets.s3.uuid), { timeout: 10000 });
      await page.locator("[data-ghost]").first().waitFor({ timeout: 20000 });
      await clickAt(page, 0.5, 0.5);
      await page.getByText("Target sheet is not calibrated").first().waitFor({ timeout: 5000 });
      const still = await page.getByText("Calibrate this sheet, then click Paste again — the Copy session is still active.").count();
      const banner = await page.locator("[data-copy-banner]").count();
      await page.keyboard.press("Escape");
      await page.locator("[data-copy-banner]").waitFor({ state: "detached", timeout: 5000 });
      const onS3 = (await itemsOn(sheets.s3)).length;
      expect(still >= 1 && banner === 1 && onS3 === 0, `message ${still}, banner ${banner}, items on S3 ${onS3}`);
      return "refused in legacy's words, the banner still up; Escape cleared it; nothing on S3";
    },
  },
  {
    title: "AC1: \"Choose sections…\": the right-clicked run starts chosen, \"(1 selected)\"; a click adds another, \"(2 selected)\"; Enter, Paste on this sheet, Same item: two runs more",
    run: async ({ page }) => {
      await open(page, sheets.s1);
      const before = (await detail(ids.wall)).geometries.length;
      await rightClick(page, 0.2, 0.3);
      await page.getByRole("menu", { name: "Item actions" }).getByRole("menuitem", { name: "Copy…" }).click();
      await page.getByRole("menu", { name: "Copy scope" }).getByRole("menuitem", { name: "Choose sections…" }).click();
      const banner = page.locator("[data-copy-banner]");
      await banner.getByText("(1 selected)").waitFor({ timeout: 5000 });
      const other = await sheetPoint(page, 0.2, 0.4);
      await page.mouse.click(other.x, other.y);
      await banner.getByText("(2 selected)").waitFor({ timeout: 5000 });
      await page.keyboard.press("Enter");
      await page.getByRole("menu", { name: "Copy destination" }).getByRole("menuitem", { name: "Paste on this sheet" }).click();
      await clickAt(page, 0.6, 0.2);
      await page.getByRole("dialog", { name: "Paste copy" }).getByRole("button", { name: "Same item" }).click();
      const after = await waitFor(async () => { const d = await detail(ids.wall); return d.geometries.length === before + 2 ? d : null; }, "two runs more", 10000);
      return `Wall ${before} → ${after.geometries.length} runs, ${after.effective_quantity} LF`;
    },
  },
]);

// The proof backlog (overnight 2026-09-26): every PARITY line marked **ported** but not
// yet driven, driven here against today's app. Nothing in the app was changed for it.
//
//   docker compose --profile browser run --rm browser node scripts/proof-backlog.mjs
//
// A step PASSES only when the whole line holds. Where the line claims more than the app
// does, the step drives what exists, then FAILS naming the gap, so the gap is a finding
// with its evidence rather than a quiet tick. Riverside's first sheet is the seeded,
// calibrated one (feet_per_norm 200: a 0.2 x 0.2 square reads 1,600.00 SF); calibration
// is driven on a fresh workspace so the seed's unscaled second sheet stays unscaled.
//
// Updated 2026-10-24 (D-542, D-601, D-592): it signed in as the seeded account, which is the founder's and is
// never signed in as (the guard refuses it); it now builds the same world on the run's own throwaway owner
// (lib/world.mjs riversideWorld: Riverside Medical Center, page 1 calibrated as the old seed). Nothing it checks
// changed.
//
// Updated 2026-10-24 (D-77, D-81, D-79, D-97, D-35, D-103, D-357, D-315, D-55, D-506, F5-S16, F6-S8): today's screens.
// - Step 2 (D-77, D-81): the inline properties pane is gone; Lock is the canvas's (an area's right-click "Item actions"
//   menu), not the row's, so the step locks and unlocks a small area there. The locked row shows its "Locked" mark and
//   its ⋮ Delete (no longer "Delete item", D-81) is disabled; a hand-written geometry add is still refused.
// - Step 4 (D-77, D-208): Override quantity is the row's ⋮ entry and opens legacy's Override quantity dialog
//   ("Override quantity", "Override reason", Save override, Clear override); the saved reason is read back in that
//   dialog. The "no reason, no save" check is unchanged.
// - Steps 6 and 13 (D-79, D-97): the canvas has no scrollbars and the view is the stage's transform, so where the
//   view is is read from [data-sheet-stage], not scrollLeft/Top. Step 13 keeps Space+drag: D-76 removed it, D-506
//   brought it back in every tool; the placed-point probe is the canvas's [data-draft-point].
// - Step 7 (D-77): a click on a markup selects it (its row is the selected row); its editing is Properties, the
//   dialog from the row's ⋮, whose Name is the item's name.
// - Step 9 (D-35, D-103, D-357): zoom runs to 4000% (was 3000%), 100% is 170 px per inch so Fit is not 100%; the
//   cluster's percentage opens the zoom menu, whose Zoom to Fit returns to the picture the sheet opened with.
// - Step 10 (D-315, D-51, D-55, F5-S16): the project page's file browser is gone, and Riverside is now the run's own,
//   so its unscaled page 2 is calibrated in place. On an unscaled sheet Count needs no scale (D-55) and opens its
//   naming dialog; Linear asks "Set a scale for this sheet" (F5-S16, built with D-51's block) with the reason, and the
//   panel says why. Calibrate now, two clicks, "Real distance" 50, Save calibration: the scale is feet per PDF point
//   (D-51: 50 ft over 612 pt), and Linear goes on to its naming dialog.
// - Step 11 (F6-S8, D-36 F6 Q7): layers are made in the Takeoff panel's layer control (the "Layers" menu): Add layer…,
//   Add sub-layer, Edit (rename), Delete (never offered on the last; the api refuses it), and each row's eye. A new
//   project starts with more than one layer, so the step deletes the others (contents moved) to reach the last.
// - Step 12 (D-55, D-77, D-336): a new area is named "SF n"; its colour is the row's colour dot (legacy's 16 presets,
//   D-77), and it is filed under a classification and a custom folder in Properties' Work Breakdown Structure.

import { apiCall, enterWorkspace, expect, run } from "./lib/bench.mjs";
import { riversideWorld } from "./lib/world.mjs";
import { call, signInAt, waitFor } from "./lib/realtime.mjs";
import { APP } from "./lib/bench.mjs";
import { MEASURE_TOOLS, armMeasure, clickSheet, countItem, menuItem, openSheet, removeItem, row, sheetPoint } from "./lib/takeoff.mjs";

// The run's own Riverside (lib/world.mjs): page 1 calibrated as the old seed, page 2 unscaled.
const world = await riversideWorld();
const { token, workspace, r } = world;
const made = [];

const measureTool = (page, label) => page.getByRole("group", { name: MEASURE_TOOLS }).getByRole("button", { name: label, exact: true });
const scroller = (page) => page.locator("[data-sheet-scroller]");
/** Where the view is: the stage's translate (no scrollbars since D-79; a free offset since D-97). */
const viewAt = (page) =>
  page.locator("[data-sheet-stage]").evaluate((e) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(e).transform);
    return [Math.round(-m.m41), Math.round(-m.m42)];
  });
const zoomLabel = (page) => page.locator("[data-zoom-menu-trigger]").getAttribute("aria-label");
const layerMenu = async (page) => {
  const menu = page.getByRole("menu", { name: "Layers" });
  if (!(await menu.isVisible().catch(() => false))) await page.locator("[data-quantity-panel] [data-active-layer]").click();
  await menu.waitFor({ timeout: 5000 });
  return menu;
};

async function areaItem(name, vertices) {
  const res = await call(token, "POST", `${r.takeoff}/item`, {
    name,
    type: "sf",
    unit: "SF",
    sheet_uuid: r.sheet,
    geometry: { geom_type: "sf", vertices_json: vertices, shape_meta: { closed: true }, client_uuid: crypto.randomUUID() },
  });
  if (res.status !== 201) throw new Error(`area item: ${res.status} ${JSON.stringify(res.body)}`);
  made.push(res.body.uuid);
  return res.body;
}
const detail = async (uuid) => (await call(token, "GET", `${r.takeoff}/item/${uuid}`)).body;
const square = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

async function signedInOnSheet(page) {
  await signInAt(page, APP, world.owner.email, world.password);
  await enterWorkspace(page, workspace.uuid);
  await openSheet(page, r);
}

await run("proof-backlog", [
  {
    title: "§7 Click a sheet to open it on the canvas; the current row is highlighted in blue",
    run: async ({ page }) => {
      // Since F5 the sheets are the takeoff page's own panel (F5-S13): click another row.
      await signedInOnSheet(page);
      const sheets = (await call(token, "GET", `${r.takeoff.replace(/\/takeoff$/, "")}/drawing/sheet`)).body.sort((a, b) => a.page_number - b.page_number);
      const other = sheets.find((s) => s.uuid !== r.sheet);
      expect(other, "Riverside has one sheet");
      await page.locator(`[data-sheet-row="${other.uuid}"] button`).first().click();
      await page.waitForURL((url) => url.pathname.endsWith(other.uuid), { timeout: 15000 });
      await page.locator(`[data-sheet-row="${other.uuid}"][data-active="1"]`).waitFor({ timeout: 10000 });
      const before = await page.locator(`[data-sheet-row="${r.sheet}"]`).getAttribute("data-active");
      expect(before === "0", "the first row is still marked current");
      return "a click on the second row opened it; its row is the current one and the first is not";
    },
  },
  {
    title: "§8 Lock an item so it refuses edits, and unlock it again",
    run: async ({ page }) => {
      const name = `Proof lock ${Date.now() % 100000}`;
      const item = await areaItem(name, square(0.8, 0.2, 0.1, 0.1));
      await signedInOnSheet(page);
      // Lock is the canvas's (D-81): an area's right-click menu.
      const lockFromCanvas = async (label) => {
        const at = await sheetPoint(page, 0.85, 0.25);
        await page.mouse.click(at.x, at.y, { button: "right" });
        await page.getByRole("menu", { name: "Item actions" }).getByRole("menuitem", { name: label, exact: true }).click();
      };
      await lockFromCanvas("Lock");
      await waitFor(async () => ((await detail(item.uuid)).is_locked ? true : null), "the item locked", 10000);
      await row(page, name).getByLabel("Locked").waitFor({ timeout: 10000 });
      const del = await menuItem(page, name, "Delete");
      const disabled = await del.isDisabled();
      await page.keyboard.press("Escape");
      const refused = await call(token, "POST", `${r.takeoff}/item/${item.uuid}/geometry`, {
        geom_type: "sf", vertices_json: square(0.8, 0.35, 0.05, 0.05), shape_meta: { closed: true }, client_uuid: crypto.randomUUID(),
      });
      await lockFromCanvas("Unlock");
      await waitFor(async () => ((await detail(item.uuid)).is_locked ? null : true), "the item unlocked", 10000);
      await row(page, name).getByLabel("Locked").waitFor({ state: "detached", timeout: 10000 });
      const allowed = await call(token, "PATCH", `${r.takeoff}/item/${item.uuid}`, { name: `${name} after` });
      expect(disabled, "Delete was offered on a locked item");
      expect(refused.status >= 400, `a hand-written add to a locked item got ${refused.status}`);
      expect(allowed.status === 200, `a rename after unlocking got ${allowed.status}`);
      return `locked from the canvas: the row's Locked mark, its Delete disabled, api refused an add ${refused.status}; unlocked: rename 200`;
    },
  },
  {
    title: "§8 Quantities are analytic, never sampled, and recompute as geometry changes",
    run: async ({ page }) => {
      const name = `Proof analytic ${Date.now() % 100000}`;
      const item = await areaItem(name, square(0.1, 0.1, 0.2, 0.2));
      const first = Number((await detail(item.uuid)).effective_quantity);
      const geometry = (await detail(item.uuid)).geometries[0];
      const moved = await call(token, "PATCH", `${r.takeoff}/geometry/${geometry.uuid}`, {
        vertices_json: square(0.1, 0.1, 0.3, 0.2),
        shape_meta: { closed: true },
        geometry_version: geometry.geometry_version,
      });
      expect(moved.status === 200, `move: ${moved.status} ${JSON.stringify(moved.body)}`);
      const second = Number((await detail(item.uuid)).effective_quantity);
      // A triangle: half of 0.2 x 0.2, analytically 800.00 SF.
      const tri = await areaItem(`${name} tri`, [[0.5, 0.5], [0.7, 0.5], [0.5, 0.7]]);
      const third = Number((await detail(tri.uuid)).effective_quantity);
      await signedInOnSheet(page);
      const shown = await row(page, name).textContent();
      // The seeded sheet is not square (D-51: feet per point, across and down alike), so
      // the proof is in the ratios: half as wide again reads 1.5 times; the triangle half.
      const close = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, b);
      expect(first > 0 && close(second, first * 1.5) && close(third, first * 0.5), `read ${first}, ${second}, ${third}`);
      const want = second.toLocaleString("en-US", { maximumFractionDigits: 2 });
      expect((shown ?? "").includes(want), `the row reads "${shown}", not ${want}`);
      return `${first} → ${second} SF on a vertex move (×1.5 exactly); a triangle ${third} SF (×0.5 exactly); the row reads ${want}`;
    },
  },
  {
    title: "§8 Override an item's quantity with a typed figure and a reason, and clear it",
    run: async ({ page }) => {
      const name = `Proof override ${Date.now() % 100000}`;
      const item = await areaItem(name, square(0.1, 0.4, 0.2, 0.2));
      const measured = Number((await detail(item.uuid)).effective_quantity);
      await signedInOnSheet(page);
      // The row's ⋮ "Override quantity" opens legacy's dialog (D-77, D-208).
      const openOverride = async () => {
        await (await menuItem(page, name, "Override quantity")).click();
        const dialog = page.getByRole("dialog", { name: "Override quantity" });
        await dialog.waitFor({ timeout: 5000 });
        return dialog;
      };
      let dialog = await openOverride();
      await dialog.getByLabel("Override quantity").fill("1234.5");
      const save = dialog.getByRole("button", { name: "Save override" });
      const blockedWithoutReason = await save.isDisabled();
      await dialog.getByLabel("Override reason").fill("Plan revision B");
      await save.click();
      await dialog.waitFor({ state: "detached", timeout: 5000 });
      const overridden = await waitFor(async () => {
        const q = Number((await detail(item.uuid)).effective_quantity);
        return q === 1234.5 ? q : null;
      }, "the override stored", 10000).catch(async () => Number((await detail(item.uuid)).effective_quantity));
      // The reason stands beside the figure: the dialog reopens with it.
      dialog = await openOverride();
      const reasonShown = await dialog.getByLabel("Override reason").inputValue();
      await dialog.getByRole("button", { name: "Clear override" }).click();
      await dialog.waitFor({ state: "detached", timeout: 5000 });
      const cleared = await waitFor(async () => {
        const q = Number((await detail(item.uuid)).effective_quantity);
        return q === measured ? q : null;
      }, "the override cleared", 10000).catch(async () => Number((await detail(item.uuid)).effective_quantity));
      const rest = `override ${overridden}, reason "${reasonShown}", cleared ${cleared}, measured ${measured}`;
      expect(blockedWithoutReason, `an override could be saved without a reason (Save override is enabled with the reason empty; the api refuses it 409 "An overridden quantity needs a reason."); the rest: ${rest}`);
      expect(overridden === 1234.5 && cleared === measured && reasonShown === "Plan revision B", rest);
      return `no reason, no save; 1,234.5 with its reason shown; Clear override returns the measured ${measured}`;
    },
  },
  {
    title: "§8 One sentinel species per count item; vertices_json and shape_meta stay parallel",
    run: async () => {
      const name = `Proof parallel ${Date.now() % 100000}`;
      const item = await areaItem(name, square(0.6, 0.1, 0.1, 0.1));
      const geometry = (await detail(item.uuid)).geometries[0];
      const alone = await call(token, "PATCH", `${r.takeoff}/geometry/${geometry.uuid}`, {
        vertices_json: square(0.6, 0.1, 0.12, 0.1),
        geometry_version: geometry.geometry_version,
      });
      const count = await countItem(token, r, `${name} count`);
      made.push(count.uuid);
      const species = (await detail(count.uuid)).count_symbol;
      expect(alone.status === 409 || alone.status === 422, `vertices without shape_meta got ${alone.status}`);
      expect(typeof species === "string", "a count item has no symbol");
      return `vertices without their shape_meta refused ${alone.status} ("${alone.body?.detail}"); a count item carries one symbol, "${species}"`;
    },
  },
  {
    title: "§9 Pan (H): drag to move the sheet",
    run: async ({ page }) => {
      await signedInOnSheet(page);
      await page.getByRole("button", { name: "Zoom in" }).click();
      await page.getByRole("button", { name: "Zoom in" }).click();
      // Legacy's Pan tool, armed by H (D-66); Select's drag draws a box instead.
      await page.keyboard.press("h");
      const pan = page.getByRole("group", { name: /^(Takeoff tools|Measure and annotation tools)$/ }).getByRole("button", { name: "Pan" });
      const keyArms = await waitFor(async () => ((await pan.getAttribute("aria-pressed")) === "true" ? "Pan" : null), "H arms Pan", 5000).catch(() => "nothing");
      const before = await viewAt(page);
      const box = await scroller(page).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 - 150, box.y + box.height / 2 - 100, { steps: 8 });
      await page.mouse.up();
      const after = await viewAt(page);
      expect(keyArms === "Pan", `H armed ${keyArms}`);
      expect(after[0] > before[0] && after[1] > before[1], `view ${before} → ${after}`);
      return `H armed ${keyArms}; its drag panned (${before} → ${after})`;
    },
  },
  {
    title: "§9 Select (V): click a markup to select and edit it",
    run: async ({ page }) => {
      const name = `Proof select ${Date.now() % 100000}`;
      await areaItem(name, square(0.4, 0.4, 0.1, 0.1));
      await signedInOnSheet(page);
      await clickSheet(page, 0.45, 0.45);
      // The click selects: its row is the selected row (D-77: no inline pane opens).
      await page.locator("[data-quantity-panel] li[data-item-row] > [role=row][data-selected='1']", { hasText: name }).waitFor({ timeout: 5000 });
      // Its editing is Properties, the dialog (D-77), from the row's ⋮.
      await (await menuItem(page, name, "Properties")).click();
      const form = page.locator('[data-measurement-dialog="edit"]');
      await form.waitFor({ timeout: 5000 });
      const title = await form.getByLabel("Name", { exact: true }).inputValue();
      expect(title === name, `clicking the markup selected "${title}"`);
      return "clicking the markup selected its row; its Properties opened on it";
    },
  },
  {
    title: "§9 Count (N): place count marks one by one",
    run: async ({ page }) => {
      await signedInOnSheet(page);
      const before = (await call(token, "GET", `${r.takeoff}/item?sheet_uuid=${r.sheet}`)).body.map((i) => i.uuid);
      await armMeasure(page, "Count");
      const box = await page.locator('svg[role="presentation"]').boundingBox();
      for (const [x, y] of [[0.8, 0.6], [0.82, 0.62], [0.84, 0.64]]) {
        const saved = page.waitForResponse((res) => res.request().method() === "POST" && /\/item$|\/geometry$/.test(res.url()));
        await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
        await saved;
      }
      await page.waitForTimeout(800);
      const after = (await call(token, "GET", `${r.takeoff}/item?sheet_uuid=${r.sheet}`)).body.filter((i) => !before.includes(i.uuid));
      made.push(...after.map((i) => i.uuid));
      expect(after.length === 1, `three clicks with Count made ${after.length} items, one mark each; legacy places the marks into one item`);
      return "three marks, one item";
    },
  },
  {
    title: "§9 Zoom in, zoom out (to 4000%, D-35), and Fit",
    run: async ({ page }) => {
      await signedInOnSheet(page);
      const opened = await zoomLabel(page);
      const zin = page.getByRole("button", { name: "Zoom in" });
      for (let i = 0; i < 40 && !/Zoom 4000%/.test((await zoomLabel(page)) ?? ""); i += 1) await zin.click();
      const max = await zoomLabel(page);
      await zin.click();
      const past = await zoomLabel(page);
      await page.getByRole("button", { name: "Zoom out" }).click();
      const out = await zoomLabel(page);
      // The percentage opens the zoom menu (D-103, D-357); its Zoom to Fit is the sheet's opening picture.
      await page.locator("[data-zoom-menu-trigger]").click();
      await page.getByRole("menu", { name: "Zoom" }).getByRole("menuitem", { name: "Zoom to Fit" }).click();
      const fit = await waitFor(async () => {
        const now = await zoomLabel(page);
        return now === opened ? now : null;
      }, "Zoom to Fit back at the opening zoom", 5000).catch(() => zoomLabel(page));
      const pct = (label) => Number(/Zoom (\d+)%/.exec(label ?? "")?.[1]);
      expect(/^Zoom 4000%/.test(max ?? "") && past === max, `zoom stops at "${max}" (one more press: "${past}"); D-35 says 4000%`);
      expect(pct(out) < 4000 && pct(out) > 3000, `one Zoom out from 4000% reads "${out}"`);
      expect(fit === opened, `Fit reads "${fit}", the sheet opened at "${opened}"`);
      return `${max} and no further; Zoom out ${out}; the zoom menu's Zoom to Fit back to the opening ${opened}`;
    },
  },
  {
    title: "§9 Calibrate from two points at a declared distance; measure tools wait for a scale, and the panel says why",
    run: async ({ page }) => {
      // Riverside's page 2 is unscaled (lib/world.mjs) and the run's own: calibrated here.
      const base = r.takeoff.replace(/\/takeoff$/, "");
      const sheet = (await apiCall(token, "GET", `${base}/drawing/sheet`)).body.find((s) => s.uuid === r.second);
      const before = (await apiCall(token, "GET", `${base}/drawing/sheet/${sheet.uuid}/calibration`)).body;
      expect(!before, `page 2 already has a scale: ${JSON.stringify(before)}`);
      await signInAt(page, APP, world.owner.email, world.password);
      await enterWorkspace(page, workspace.uuid);
      await page.goto(`${APP}/project/${r.project}/takeoff/${sheet.uuid}`);
      await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
      await page.locator("[data-quantity-panel]").waitFor();
      const why = await page.locator("[data-quantity-panel]").getByText("Set the sheet scale first. Without it a shape has no quantity.").count();
      // A count needs no scale (D-55): its naming dialog opens.
      await measureTool(page, "Count").click();
      const naming = page.locator('[data-measurement-dialog="create"]');
      const countOpens = await naming.waitFor({ timeout: 5000 }).then(() => true, () => false);
      if (countOpens) {
        await page.keyboard.press("Escape");
        await naming.waitFor({ state: "detached", timeout: 5000 });
      }
      // Linear asks for a scale first, and says why (F5-S16).
      await measureTool(page, "Linear").click();
      const ask = page.getByRole("dialog", { name: "Set a scale for this sheet" });
      await ask.waitFor({ timeout: 5000 });
      const reason = await ask.getByText("Measurements need a scale before Linear or Area tools can be used.").count();
      const armedUnscaled = (await measureTool(page, "Linear").getAttribute("aria-pressed")) === "true";
      await ask.getByRole("button", { name: "Calibrate now" }).click();
      await page.getByText("Click two points on the sheet, then enter the real distance.").waitFor({ timeout: 5000 });
      await clickSheet(page, 0.2, 0.2);
      await clickSheet(page, 0.7, 0.2);
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("heading", { name: "Set sheet scale" }).waitFor({ timeout: 5000 });
      await dialog.getByLabel("Real distance").fill("50");
      await dialog.getByRole("button", { name: "Save calibration" }).click();
      await page.getByText("Scale set — verify with a known dimension").first().waitFor({ timeout: 10000 });
      const cal = (await apiCall(token, "GET", `${base}/drawing/sheet/${sheet.uuid}/calibration`)).body;
      // With a scale, Linear goes on to its naming dialog (the tool picked before).
      const linearOn = await naming.waitFor({ timeout: 10000 }).then(() => true, () => false);
      // D-51: feet per PDF point; two clicks half the page apart on the page's width.
      const want = 50 / (0.5 * Number(sheet.width_pt));
      const fpp = Number(cal?.feet_per_norm);
      expect(why === 1, "the empty panel does not say why");
      expect(countOpens, "Count did not open its naming dialog on an unscaled sheet (D-55: a count needs no scale)");
      expect(reason === 1 && !armedUnscaled, `Linear on an unscaled sheet: reason shown ${reason}, armed ${armedUnscaled}`);
      expect(Math.abs(fpp - want) <= 0.005 * want && linearOn, `feet per point ${fpp} (want ${want.toFixed(6)}), Linear went on ${linearOn}`);
      return `the panel says why; Count needs none; Linear asks "Set a scale for this sheet" with the reason; two clicks 0.5 apart at 50 ft → ${fpp.toFixed(6)} ft per point; Linear goes on`;
    },
  },
  {
    title: "§8 Layers: create, sub-layer, rename, delete (never the last), show or hide on the sheet",
    run: async ({ page }) => {
      await signedInOnSheet(page);
      const layers = `${r.takeoff}/layer`;
      const list = async () => (await call(token, "GET", layers)).body;
      const name = `Proof layer ${Date.now() % 100000}`;
      // The layer control at the top of the Takeoff panel (F6-S8): its menu is "Layers".
      let menu = await layerMenu(page);
      await menu.getByRole("menuitem", { name: /^Add layer/ }).click();
      let form = page.locator("[data-add-layer]");
      await form.getByRole("textbox").first().fill(name);
      await form.getByRole("button", { name: "Add layer", exact: true }).click();
      const mine = await waitFor(async () => (await list()).find((l) => l.name === name) ?? null, "the layer made", 10000);
      menu = await layerMenu(page);
      await menu.getByRole("button", { name: `Add sub-layer under ${name}` }).click();
      form = page.locator("[data-add-layer]");
      await form.getByRole("textbox").first().fill(`${name} sub`);
      await form.getByRole("button", { name: "Add sub-layer", exact: true }).click();
      const sub = await waitFor(async () => (await list()).find((l) => l.name === `${name} sub`) ?? null, "the sub-layer made", 10000);
      menu = await layerMenu(page);
      await menu.getByRole("button", { name: `Edit ${name}`, exact: true }).click();
      const edit = page.locator("[data-edit-layer]");
      await edit.getByRole("textbox").first().fill(`${name} renamed`);
      await edit.getByRole("button", { name: "Save" }).click();
      await waitFor(async () => ((await list()).find((l) => l.uuid === mine.uuid)?.name === `${name} renamed` ? true : null), "the rename stored", 10000);
      // Show or hide on the sheet: the row's eye flips.
      menu = await layerMenu(page);
      const eye = menu.locator(`[data-layer="${name} renamed"] [data-layer-eye]`);
      const eyeBefore = await eye.getAttribute("data-layer-eye");
      await eye.click();
      await waitFor(async () => ((await eye.getAttribute("data-layer-eye")) !== eyeBefore ? true : null), "the eye flipped", 5000).catch(() => {});
      const eyeAfter = await eye.getAttribute("data-layer-eye");
      // Delete: the sub-layer, then the layer, then the project's other starting layers down to the default,
      // each through the dialog's Move contents and delete layer (contents kept on another layer).
      const deleteOnScreen = async (target) => {
        menu = await layerMenu(page);
        await menu.getByRole("button", { name: `Delete ${target}`, exact: true }).click();
        await page.locator("[data-delete-layer]").getByRole("button", { name: "Move contents and delete layer" }).click();
        await waitFor(async () => ((await list()).some((l) => l.name === target) ? null : true), `${target} deleted`, 10000);
      };
      for (const target of [`${name} sub`, `${name} renamed`]) await deleteOnScreen(target);
      for (let others = await list(); others.length > 1; others = await list()) {
        await deleteOnScreen((others.find((l) => !l.is_default) ?? others.at(-1)).name);
      }
      const left = await list();
      menu = await layerMenu(page);
      const lastDisabled = left.length === 1 ? await menu.getByRole("button", { name: `Delete ${left[0].name}`, exact: true }).isDisabled() : false;
      const last = left.length === 1 ? await call(token, "DELETE", `${layers}/${left[0].uuid}`) : { status: 0, body: {} };
      expect(sub.parent_uuid === mine.uuid, `the sub-layer's parent ${sub.parent_uuid}`);
      expect(eyeBefore !== eyeAfter, `the eye read ${eyeBefore} before and ${eyeAfter} after a click`);
      expect(left.length === 1 && lastDisabled && last.status === 409, `${left.length} layers left; the last's Delete disabled ${lastDisabled}; the api's delete of it ${last.status} ${JSON.stringify(last.body)}`);
      return `Add layer, Add sub-layer, Edit (rename), the eye ${eyeBefore} → ${eyeAfter}, Delete twice; the last layer's Delete disabled and the api refuses it ${last.status} ("${last.body?.detail}")`;
    },
  },
  {
    title: "§8 Create a takeoff item (SF, LF or EA), naming, colouring, filing under a classification and a custom folder",
    run: async ({ page }) => {
      const wsBase = `/api/workspace/${workspace.uuid}`;
      const folder = await call(token, "POST", `${r.takeoff}/folder`, { name: `Proof folder ${Date.now() % 100000}` });
      expect(folder.status === 201, `folder: ${folder.status} ${JSON.stringify(folder.body)}`);
      await signedInOnSheet(page);
      await armMeasure(page, "Area");
      const created = page.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith("/item"));
      for (const [x, y] of [[0.62, 0.72], [0.72, 0.72], [0.72, 0.8]]) await clickSheet(page, x, y);
      const last = await sheetPoint(page, 0.62, 0.8);
      await page.mouse.dblclick(last.x, last.y);
      const item = await (await created).json();
      made.push(item.uuid);
      // The colour: the row's dot, legacy's 16 presets (D-77).
      const at = row(page, item.name);
      await at.locator("[data-row-color]").click();
      await page.getByRole("button", { name: "#3b82f6", exact: true }).click();
      const colour = await waitFor(async () => {
        const c = (await detail(item.uuid)).color;
        return c?.toLowerCase() === "#3b82f6" ? c : null;
      }, "the colour stored", 10000).catch(async () => (await detail(item.uuid)).color);
      // Filing: Properties' Work Breakdown Structure, a classification and a custom folder (D-336).
      const tree = await call(token, "GET", `${wsBase}/classification?system=csi`);
      const d03 = tree.body.find((n) => n.parent_uuid === null && n.code === "03");
      await (await menuItem(page, item.name, "Properties")).click();
      const form = page.locator('[data-measurement-dialog="edit"]');
      await form.waitFor({ timeout: 5000 });
      const toggle = form.locator("[data-wbs]").getByRole("button", { name: /^Work Breakdown Structure/ });
      if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
      const picker = form.locator("[data-wbs-classification] [data-classification-picker]");
      await picker.getByLabel("Search classifications").fill("Concrete");
      await picker.locator('[data-pick="03"]').first().click();
      await form.locator('[data-search-select="Folder"]').getByRole("button", { name: "Folder", exact: true }).click();
      await form.getByRole("listbox", { name: "Folder" }).getByRole("option", { name: folder.body.name }).click();
      await form.getByRole("button", { name: "Save" }).click();
      await form.waitFor({ state: "detached", timeout: 10000 });
      const filed = await waitFor(async () => {
        const it = await detail(item.uuid);
        return it.classification_ref_id === d03?.uuid && it.folder_uuid === folder.body.uuid ? it : null;
      }, "filed under DIV 03 and the folder", 10000).catch(() => detail(item.uuid));
      expect(/^SF \d+$/.test(item.name) && colour?.toLowerCase() === "#3b82f6", `named "${item.name}", colour ${colour}`);
      expect(filed.classification_ref_id === d03?.uuid && filed.folder_uuid === folder.body.uuid, `named "${item.name}" and recoloured; classification ${filed.classification_ref_id} (DIV 03 is ${d03?.uuid}), folder ${filed.folder_uuid} (wanted ${folder.body.uuid})`);
      return `drawn and named "${item.name}"; recoloured #3b82f6 from its row; filed under DIV 03 and "${folder.body.name}"`;
    },
  },
  {
    title: "§23 Space-drag pans regardless of the armed tool",
    run: async ({ page }) => {
      await signedInOnSheet(page);
      await page.getByRole("button", { name: "Zoom in" }).click();
      await page.getByRole("button", { name: "Zoom in" }).click();
      await armMeasure(page, "Linear");
      const before = await viewAt(page);
      const box = await scroller(page).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.down("Space");
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 - 80, { steps: 8 });
      await page.mouse.up();
      await page.keyboard.up("Space");
      const after = await viewAt(page);
      const drafted = await page.locator("[data-draft-point]").count();
      expect(after[0] > before[0] && after[1] > before[1], `view ${before} → ${after}`);
      expect(drafted === 0, `the drag placed ${drafted} points while Linear was armed`);
      return `Linear armed, space-drag panned (${before} → ${after}) and placed nothing`;
    },
  },
]).finally(async () => {
  for (const uuid of made) await removeItem(token, r, uuid).catch(() => {});
});

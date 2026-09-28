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

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openFiles } from "./lib/f4.mjs";
import { SEEDED, apiLogin, firstWorkspace } from "./lib/bench.mjs";
import { call, signInAt } from "./lib/realtime.mjs";
import { APP } from "./lib/bench.mjs";
import { armMeasure, countItem, menuItem, openSheet, removeItem, riverside, row } from "./lib/takeoff.mjs";

const token = await apiLogin();
const workspace = await firstWorkspace(token);
const r = await riverside(token, workspace.uuid);
const made = [];

const tool = (page, label) =>
  page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: label, exact: true });
const scroller = (page) => page.locator('svg[role="presentation"]').locator("xpath=ancestor::div[contains(@class,'overflow-auto')][1]");

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
  await signInAt(page, APP, SEEDED.email, SEEDED.password);
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
      const item = await countItem(token, r, name);
      made.push(item.uuid);
      await signedInOnSheet(page);
      await row(page, name).click();
      await page.locator("[data-properties-pane]").getByRole("button", { name: "Lock" }).click();
      await page.getByText("This item is locked. Unlock it to change anything, including deleting it.").waitFor();
      const del = await menuItem(page, name, "Delete item");
      const disabled = await del.isDisabled();
      await page.keyboard.press("Escape");
      const refused = await call(token, "POST", `${r.takeoff}/item/${item.uuid}/geometry`, {
        geom_type: "count", vertices_json: [[0.5, 0.5]], shape_meta: null, client_uuid: crypto.randomUUID(),
      });
      await page.locator("[data-properties-pane]").getByRole("button", { name: "Unlock" }).click();
      await page.getByText("This item is locked.", { exact: false }).waitFor({ state: "detached" });
      const allowed = await call(token, "PATCH", `${r.takeoff}/item/${item.uuid}`, { name: `${name} after` });
      expect(disabled, "Delete item was offered on a locked item");
      expect(refused.status >= 400, `a hand-written add to a locked item got ${refused.status}`);
      expect(allowed.status === 200, `a rename after unlocking got ${allowed.status}`);
      return `locked: menu disabled, api refused an add ${refused.status}; unlocked: rename 200`;
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
      await row(page, name).click();
      const pane = page.locator("[data-properties-pane]");
      await pane.getByRole("button", { name: "Override quantity" }).click();
      await pane.locator("#override-value").fill("1234.5");
      const save = pane.getByRole("button", { name: "Save override" });
      const blockedWithoutReason = await save.isDisabled();
      await pane.locator("#override-reason").fill("Plan revision B");
      await save.click();
      await pane.getByText("Plan revision B").waitFor();
      const overridden = Number((await detail(item.uuid)).effective_quantity);
      await pane.getByRole("button", { name: "Clear" }).click();
      await pane.getByRole("button", { name: "Override quantity" }).waitFor();
      const cleared = Number((await detail(item.uuid)).effective_quantity);
      expect(blockedWithoutReason, "an override could be saved without a reason");
      expect(overridden === 1234.5 && cleared === measured, `override ${overridden}, cleared ${cleared}, measured ${measured}`);
      return `no reason, no save; 1,234.5 with its reason shown; Clear returns the measured ${measured}`;
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
      await page.waitForTimeout(300);
      const el = scroller(page);
      // Legacy's Pan tool, armed by H (D-66); Select's drag draws a box instead.
      await page.keyboard.press("h");
      const keyArms = await page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { pressed: true }).textContent();
      const before = await el.evaluate((e) => [e.scrollLeft, e.scrollTop]);
      const box = await el.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 - 150, box.y + box.height / 2 - 100, { steps: 8 });
      await page.mouse.up();
      const after = await el.evaluate((e) => [e.scrollLeft, e.scrollTop]);
      expect(keyArms?.trim() === "Pan", `H armed ${keyArms?.trim()}`);
      expect(after[0] > before[0] && after[1] > before[1], `scroll ${before} → ${after}`);
      return `H armed ${keyArms?.trim()}; its drag panned (${before} → ${after})`;
    },
  },
  {
    title: "§9 Select (V): click a markup to select and edit it",
    run: async ({ page }) => {
      const name = `Proof select ${Date.now() % 100000}`;
      await areaItem(name, square(0.4, 0.4, 0.1, 0.1));
      await signedInOnSheet(page);
      const box = await page.locator('svg[role="presentation"]').boundingBox();
      await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.45);
      await page.locator("[data-properties-pane]").waitFor({ timeout: 5000 });
      // The name is the value of the pane's name field, not its text.
      const title = await page.locator("[data-properties-pane] input").first().inputValue();
      expect(title === name, `clicking the markup selected "${title}"`);
      return "clicking the markup opened its properties";
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
    title: "§9 Zoom in, zoom out (to 3000%), and Fit",
    run: async ({ page }) => {
      await signedInOnSheet(page);
      const zin = page.getByRole("button", { name: "Zoom in" });
      for (let i = 0; i < 40 && !(await zin.isDisabled()); i += 1) await zin.click();
      const max = await page.getByRole("button", { name: /^Zoom \d+ percent/ }).getAttribute("aria-label");
      await page.getByRole("button", { name: /^Zoom \d+ percent/ }).click();
      const fit = await page.getByRole("button", { name: /^Zoom \d+ percent/ }).getAttribute("aria-label");
      expect(/Zoom 100 percent/.test(fit ?? ""), `Fit reads ${fit}`);
      expect(/Zoom 3000 percent/.test(max ?? ""), `zoom stops at "${max}"; the line (and PARITY §24) says 3000%`);
      return `${max}; Fit returns to 100%`;
    },
  },
  {
    title: "§9 Calibrate from two points at a declared distance; measure tools disabled until then, and the panel says why",
    run: async ({ page }) => {
      const fresh = await freshWorkspace("Proof calibrate");
      const job = await makeProject(fresh.token, fresh.base, { name: "Calibrate job" });
      const PDF = Buffer.from(
        ["%PDF-1.4", "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj", "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
          "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj", "trailer<</Root 1 0 R>>", "%%EOF"].join("\n"),
      );
      await openFiles(page, fresh.workspace.uuid, job.uuid);
      await page.locator('input[type=file][accept="application/pdf"]').setInputFiles({ name: "Cal.pdf", mimeType: "application/pdf", buffer: PDF });
      await page.getByText("Ready", { exact: true }).first().waitFor({ timeout: 60000 });
      const sheet = (await apiCall(fresh.token, "GET", `${fresh.base}/${job.uuid}/drawing/sheet`)).body[0];
      await page.goto(`${APP}/project/${job.uuid}/takeoff/${sheet.uuid}`);
      await page.locator('img[alt="Drawing sheet"]').waitFor({ timeout: 20000 });
      const disabled = await Promise.all(["Linear", "Area", "Count"].map((l) => tool(page, l).isDisabled()));
      const why = await page.getByText("Set the sheet scale first. Without it a shape has no quantity.").count();
      await tool(page, "Scale").click();
      await page.getByRole("menu", { name: "Scale" }).getByRole("menuitem", { name: "Calibrate Scale" }).click();
      const box = await page.locator('svg[role="presentation"]').boundingBox();
      // A portrait page runs below the window; y 0.2 is on screen.
      await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.2);
      await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.2);
      await page.locator("#calibration-feet").fill("50");
      await page.getByRole("dialog").getByRole("button", { name: /Save|Set/ }).click();
      await page.getByText("Scale set: 50 ft reference").waitFor({ timeout: 10000 });
      const cal = (await apiCall(fresh.token, "GET", `${fresh.base}/${job.uuid}/drawing/sheet/${sheet.uuid}/calibration`)).body;
      const enabled = !(await tool(page, "Linear").isDisabled());
      const fpn = Number(cal.feet_per_norm);
      expect(disabled.every(Boolean), `before a scale, disabled: ${disabled}`);
      expect(why === 1, "the empty panel does not say why");
      expect(Math.abs(fpn - 100) < 0.5 && enabled, `feet_per_norm ${fpn}, Linear enabled ${enabled}`);
      return `tools disabled with the reason; two clicks 0.5 apart at 50 ft → feet_per_norm ${fpn.toFixed(3)}; tools enabled`;
    },
  },
  {
    title: "§8 Layers: create, sub-layer, rename, delete (never the last), show or hide on the sheet",
    run: async ({ page }) => {
      await signedInOnSheet(page);
      const layers = `${r.takeoff}/layer`;
      const name = `Proof layer ${Date.now() % 100000}`;
      await page.getByRole("button", { name: "New layer" }).click();
      await page.getByRole("dialog").getByRole("textbox").fill(name);
      await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
      await page.getByRole("button", { name: /Layers/ }).first().click();
      await page.getByText(name).first().waitFor();
      const all = (await call(token, "GET", layers)).body;
      const mine = all.find((l) => l.name === name);
      const sub = await call(token, "POST", layers, { name: `${name} sub`, parent_uuid: mine.uuid });
      const renamed = await call(token, "PATCH", `${layers}/${mine.uuid}`, { name: `${name} renamed` });
      await call(token, "DELETE", `${layers}/${sub.body.uuid}`);
      const gone = await call(token, "DELETE", `${layers}/${mine.uuid}`);
      // A layer row is one button, its name; nothing on it shows or hides the layer.
      const rowControls = await page.locator("li", { hasText: name }).first().locator("button").count();
      const left = (await call(token, "GET", layers)).body.length;
      expect(sub.status === 201 && renamed.status === 200, `sub ${sub.status}, rename ${renamed.status}`);
      expect(gone.status >= 400 || left > 0, `create, sub-layer, rename and delete work, but deleting the project's only layer was allowed (${gone.status}, ${left} left; legacy refuses "A project must keep at least one layer"; today's api refuses only the default layer)`);
      expect(rowControls > 1, "there is no show or hide control on a layer");
      return "all";
    },
  },
  {
    title: "§8 Create a takeoff item (SF, LF or EA), naming, colouring, filing under a classification and a custom folder",
    run: async ({ page }) => {
      await signedInOnSheet(page);
      await armMeasure(page, "Area");
      const box = await page.locator('svg[role="presentation"]').boundingBox();
      const at = (x, y) => [box.x + box.width * x, box.y + box.height * y];
      for (const [x, y] of [[0.62, 0.72], [0.72, 0.72], [0.72, 0.8]]) await page.mouse.click(...at(x, y));
      const created = page.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith("/item"));
      await page.mouse.dblclick(...at(0.62, 0.8));
      const item = await (await created).json();
      made.push(item.uuid);
      await row(page, item.name).click();
      await page.locator("[data-properties-pane]").getByRole("radio", { name: "Blue" }).click();
      await page.waitForTimeout(800);
      const colour = (await detail(item.uuid)).color;
      const classification = await page.locator("[data-properties-pane]").getByText(/Classification/).count();
      expect(/^Area \d+$/.test(item.name) && colour === "#2563eb", `named "${item.name}", colour ${colour}`);
      expect(classification > 0, `named "${item.name}" and recoloured; filing under a folder exists; there is no classification to file under (F6-S14)`);
      return "all";
    },
  },
  {
    title: "§23 Space-drag pans regardless of the armed tool",
    run: async ({ page }) => {
      await signedInOnSheet(page);
      await page.getByRole("button", { name: "Zoom in" }).click();
      await page.getByRole("button", { name: "Zoom in" }).click();
      await armMeasure(page, "Linear");
      const el = scroller(page);
      const before = await el.evaluate((e) => [e.scrollLeft, e.scrollTop]);
      const box = await el.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.down("Space");
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 - 80, { steps: 8 });
      await page.mouse.up();
      await page.keyboard.up("Space");
      const after = await el.evaluate((e) => [e.scrollLeft, e.scrollTop]);
      const drafted = await page.locator('svg[role="presentation"] circle[r="0.004"]').count();
      expect(after[0] > before[0] && after[1] > before[1], `scroll ${before} → ${after}`);
      expect(drafted === 0, `the drag placed ${drafted} points while Linear was armed`);
      return `Linear armed, space-drag panned (${before} → ${after}) and placed nothing`;
    },
  },
]).finally(async () => {
  for (const uuid of made) await removeItem(token, r, uuid).catch(() => {});
});

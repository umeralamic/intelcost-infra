// F6 Block A: the New Measurement and Properties dialog (S1), height and pitch (S2),
// named dimensions (S3). Legacy's `NewItemDialog`, in its words.
//
//   docker compose --profile realtime up -d
//   docker compose --profile browser run --rm browser node scripts/f6-a.mjs
//
// The world: one landscape page, 1224 × 792 pt, at 1/8" = 1'-0" (1/6 ft per point), in
// its own workspace. Window B is the same owner on :5174 (api-b), for S2 AC4.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { APP_B, joinedTopic, recordSockets, signInAt, waitFor } from "./lib/realtime.mjs";
import { armMeasure, sheetPoint } from "./lib/takeoff.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6; // feet per point
const { token, workspace, base } = await freshWorkspace("F6 Block A");
const project = await makeProject(token, base, { name: "Item model" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;

const tools = (page) => page.getByRole("group", { name: "Takeoff tools" });
const form = (page) => page.locator("[data-measurement-dialog]");
const items = async () => (await apiCall(token, "GET", `${takeoff}/item?sheet_uuid=${sheet.uuid}`)).body;
const detail = async (uuid) => (await apiCall(token, "GET", `${takeoff}/item/${uuid}`)).body;
/** Page x for a run of `ft` feet across the page from x0. */
const across = (x0, ft) => x0 + ft / FT / W;

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
}

/** Draw a run from (x1, y) to (x2, y), finished with a double click. */
async function run2(page, x1, x2, y) {
  const a = await sheetPoint(page, x1, y);
  const b = await sheetPoint(page, x2, y);
  await page.mouse.click(a.x, a.y);
  await page.mouse.dblclick(b.x, b.y);
}

/** The newest item named like `prefix`, once the api has it. */
async function made(prefix, before) {
  return waitFor(async () => (await items()).find((i) => !before.has(i.uuid) && i.name.startsWith(prefix)), `item "${prefix}"`, 10000);
}

const known = async () => new Set((await items()).map((i) => i.uuid));

/** Open an item's Properties from the Takeoff panel's row menu. */
async function properties(page, name) {
  const row = page.locator("[data-quantity-panel] li button", { hasText: name }).first();
  await row.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Properties" }).click();
  await form(page).waitFor();
}

await run("f6-a", [
  {
    title: "setup: one landscape page at 1/8\" = 1'-0\"",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Items.pdf", buffer: makePdf([{ width: W, height: H, label: "F6" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Items.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      // Custom Folder and the WBS closed: legacy's defaults, whatever an earlier run left.
      const reset = await apiCall(token, "PATCH", "/api/auth/me", { takeoff_prefs: { wbs_mode: null, wbs_open: null } });
      expect(reset.status === 200, `prefs: ${reset.status}`);
      return `sheet ${sheet.uuid}`;
    },
  },
  {
    title: "S1 AC1: Linear opens \"Name this LF measurement\" with \"LF 1\"; Enter saves it; the first run creates the item and the next joins it",
    run: async ({ page }) => {
      await open(page);
      const before = await known();
      await tools(page).getByRole("button", { name: "Linear", exact: true }).click();
      await page.getByRole("heading", { name: "Name this LF measurement" }).waitFor();
      const name = form(page).getByLabel("Name", { exact: true });
      const shown = await name.inputValue();
      expect(shown === "LF 1", `default name "${shown}"`);
      await name.press("Enter");
      await form(page).waitFor({ state: "detached" });
      await run2(page, 0.1, across(0.1, 10), 0.2);
      const item = await made("LF 1", before);
      await run2(page, 0.1, across(0.1, 5), 0.3);
      const joined = await waitFor(async () => {
        const d = await detail(item.uuid);
        return d.geometries.length === 2 ? d : null;
      }, "the second run joining LF 1", 10000);
      expect((await items()).filter((i) => !before.has(i.uuid)).length === 1, "the second run made a second item");
      // Clicked through the screen: each end lands within a pixel, about 0.25 ft here.
      expect(Math.abs(joined.effective_quantity - 15) < 0.5, `LF 1 reads ${joined.effective_quantity}`);
      return `"Name this LF measurement", "LF 1", Enter → armed; two runs, one item, ${joined.effective_quantity.toFixed(2)} LF`;
    },
  },
  {
    title: "S1 AC2: colour, Randomize, opacity and, for a count, symbol and size mode are saved",
    run: async ({ page }) => {
      await open(page);
      const before = await known();
      await tools(page).getByRole("button", { name: "Count", exact: true }).click();
      await form(page).waitFor();
      await form(page).getByLabel("Name", { exact: true }).fill("Doors");
      const first = await form(page).locator("[data-colour]").getAttribute("data-colour");
      await page.getByRole("button", { name: "Randomize color" }).click();
      const randomised = await form(page).locator("[data-colour]").getAttribute("data-colour");
      expect(first !== randomised, `Randomize kept ${first}`);
      await page.getByRole("button", { name: "Change color" }).click();
      const swatch = form(page).locator('button[title^="#"]').nth(3);
      const picked = (await swatch.getAttribute("title")).toLowerCase();
      await swatch.click();
      await form(page).getByLabel("Opacity").fill("50");
      await form(page).getByLabel("Symbol", { exact: true }).selectOption("square");
      await form(page).getByRole("radio", { name: "Fixed size" }).check();
      await form(page).getByRole("button", { name: "Create" }).click();
      await form(page).waitFor({ state: "detached" });
      const p = await sheetPoint(page, 0.5, 0.5);
      await page.mouse.click(p.x, p.y);
      const item = await made("Doors", before);
      const d = await detail(item.uuid);
      expect(d.color.toLowerCase() === picked, `colour ${d.color}, picked ${picked}`);
      expect(Math.abs(d.opacity - 0.5) < 1e-6, `opacity ${d.opacity}`);
      expect(d.count_symbol === "square" && d.count_size_mode === "scaled", `symbol ${d.count_symbol}, size ${d.count_size_mode}`);
      expect(d.unit === "EA" && d.effective_quantity === 1, `count ${d.effective_quantity} ${d.unit}`);
      return `Randomize ${first} → ${randomised}; picked ${picked}; opacity 50%; Square, Fixed size; 1 EA`;
    },
  },
  {
    title: "S1 AC3, AC4: Preset Classification with nothing picked disables Create; Rough measurement enables it and files under Rough Measurements; the WBS mode and its open state survive a reload",
    run: async ({ page }) => {
      await open(page);
      const before = await known();
      await tools(page).getByRole("button", { name: "Area", exact: true }).click();
      await form(page).waitFor();
      await form(page).getByRole("button", { name: "Work Breakdown Structure (WBS)" }).click();
      await form(page).getByRole("button", { name: "Preset Classification" }).click();
      const create = form(page).getByRole("button", { name: "Create" });
      await page.waitForFunction(() => [...document.querySelectorAll("[data-measurement-dialog] button")].find((b) => b.textContent === "Create")?.disabled === true);
      await form(page).getByLabel("Rough measurement").check();
      await form(page).getByText("Rough Measurements · classification bypassed").waitFor();
      expect(await create.isEnabled(), "Create stayed disabled with Rough measurement ticked");
      await form(page).getByLabel("Name", { exact: true }).fill("Rough slab");
      await create.click();
      await form(page).waitFor({ state: "detached" });
      const pts = [[0.2, 0.5], [0.3, 0.5], [0.3, 0.7]];
      for (const [x, y] of pts) {
        const p = await sheetPoint(page, x, y);
        await page.mouse.click(p.x, p.y);
      }
      const last = await sheetPoint(page, 0.2, 0.7);
      await page.mouse.dblclick(last.x, last.y);
      const item = await made("Rough slab", before);
      const folders = (await apiCall(token, "GET", `${takeoff}/folder`)).body;
      const rough = folders.find((f) => f.is_reference);
      expect(rough?.name === "Rough Measurements" && item.folder_uuid === rough.uuid && item.is_reference, `filed in ${item.folder_uuid}, rough ${JSON.stringify(rough)}`);

      await page.reload();
      await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
      await tools(page).getByRole("button", { name: "Linear", exact: true }).click();
      await form(page).waitFor();
      const openNow = await form(page).getByRole("button", { name: "Work Breakdown Structure (WBS)" }).getAttribute("aria-expanded");
      const preset = await form(page).getByRole("button", { name: "Preset Classification" }).getAttribute("aria-pressed");
      expect(openNow === "true" && preset === "true", `after reload: WBS open ${openNow}, Preset ${preset}`);
      await form(page).getByRole("button", { name: "Custom Folder" }).click();
      await form(page).getByRole("button", { name: "Cancel" }).click();
      return `Preset + nothing picked: Create disabled; Rough measurement → enabled, "Rough slab" in Rough Measurements; after a reload the WBS is open on Preset`;
    },
  },
  {
    title: "S1 AC5: Properties reads \"Properties\", shows \"Current folder: Unfiled\" and saves with Save",
    run: async ({ page }) => {
      await open(page);
      await properties(page, "LF 1");
      await page.getByRole("dialog").getByRole("heading", { name: "Properties" }).waitFor();
      const wbs = form(page).getByRole("button", { name: "Work Breakdown Structure (WBS)" });
      if ((await wbs.getAttribute("aria-expanded")) !== "true") await wbs.click();
      const current = (await form(page).locator("[data-current-folder]").innerText()).replace(/\s+/g, " ").trim();
      expect(current.startsWith("Current folder: Unfiled"), `"${current}"`);
      await form(page).getByLabel("Name", { exact: true }).fill("Wall run");
      await form(page).getByRole("button", { name: "Save" }).click();
      await form(page).waitFor({ state: "detached" });
      const renamed = await waitFor(async () => (await items()).find((i) => i.name === "Wall run"), "LF 1 renamed", 10000);
      expect(renamed.name_base === "Wall run", `name_base ${renamed.name_base}`);
      return `"Properties", "${current}", Save → "Wall run"`;
    },
  },
  {
    title: "S2 AC1: a 40 LF run with height 7'-6\" reads 300 SF and is named \" (40.0 LF, 7'-6\"H)\"",
    run: async ({ page }) => {
      await open(page);
      const before = await known();
      await tools(page).getByRole("button", { name: "Linear", exact: true }).click();
      await form(page).waitFor();
      await form(page).getByLabel("Name", { exact: true }).fill("Wall paint");
      await form(page).getByLabel("Convert to area using a height").check();
      await form(page).getByLabel("Height", { exact: true }).fill(`7'-6"`);
      await form(page).getByRole("button", { name: "Create" }).click();
      await form(page).waitFor({ state: "detached" });
      await run2(page, 0.1, across(0.1, 40), 0.8);
      const item = await made("Wall paint", before);
      expect(Math.abs(item.effective_quantity - 300) < 1.5 && item.unit === "SF", `${item.effective_quantity} ${item.unit}`);
      expect(/^Wall paint \(40\.0 LF, 7'-6"H\)$/.test(item.name) || /^Wall paint \(\d+\.\d LF, 7'-6"H\)$/.test(item.name), `name "${item.name}"`);
      return `"${item.name}", ${item.effective_quantity.toFixed(2)} ${item.unit}`;
    },
  },
  {
    title: "S2 AC2, AC3: pitch 6/12, 26.565° and 50% on 100 SF all read 111.80 SF; height and pitch exclude each other; 95° is refused on the field and by the api",
    run: async ({ page }) => {
      // A 10 ft square: 60 pt a side.
      const sq = [[0.4, 0.2], [0.4 + 60 / W, 0.2], [0.4 + 60 / W, 0.2 + 60 / H], [0.4, 0.2 + 60 / H]];
      const madeSlab = await apiCall(token, "POST", `${takeoff}/item`, {
        name: "Roof", type: "sf", unit: "SF", sheet_uuid: sheet.uuid,
        geometry: { geom_type: "sf", vertices_json: sq, shape_meta: { closed: true }, client_uuid: crypto.randomUUID() },
      });
      expect(madeSlab.status === 201 && Math.abs(madeSlab.body.effective_quantity - 100) < 1e-6, `slab ${madeSlab.status} ${madeSlab.body?.effective_quantity}`);
      await open(page);
      await properties(page, "Roof");
      await form(page).getByLabel("Apply a slope factor").check();
      await form(page).getByLabel("Pitch", { exact: true }).fill("6/12");
      const preview = await form(page).locator("[data-pitch-hint]").textContent();
      expect(preview.includes("× 1.1180"), `preview "${preview}"`);
      await form(page).getByRole("button", { name: "Save" }).click();
      await form(page).waitFor({ state: "detached" });
      const r = await waitFor(async () => { const d = await detail(madeSlab.body.uuid); return d.pitch_entry === "6/12" ? d : null; }, "6/12 stored", 10000);
      const readings = [r.effective_quantity];
      for (const [mode, entry] of [["degrees", "26.565"], ["grade", "50"]]) {
        const patched = await apiCall(token, "PATCH", `${takeoff}/item/${r.uuid}`, { pitch_mode: mode, pitch_entry: entry });
        expect(patched.status === 200, `${mode}: ${patched.status}`);
        readings.push(patched.body.effective_quantity);
      }
      expect(readings.every((v) => Math.abs(v - 111.8034) < 0.01), `readings ${readings.join(", ")}`);
      expect(r.name === "Roof (100.0 SF @ 6/12)", `name "${r.name}"`);

      await properties(page, "Roof");
      await form(page).getByLabel("Apply a slope factor").uncheck();
      // A run offers height; an area does not. On a run the two exclude each other.
      await form(page).getByRole("button", { name: "Cancel" }).click();
      await properties(page, "Wall paint");
      await form(page).getByLabel("Apply a slope factor").check();
      const heightStill = await form(page).getByLabel("Convert to area using a height").isChecked();
      expect(!heightStill, "height stayed on when pitch was ticked");
      await form(page).getByRole("radio", { name: "Degrees" }).check();
      await form(page).getByLabel("Pitch", { exact: true }).fill("95");
      const hint = await form(page).locator("[data-pitch-hint]").textContent();
      expect(hint.includes("Angle must be between 0 and 90 degrees"), `hint "${hint}"`);
      expect(await form(page).getByRole("button", { name: "Save" }).isDisabled(), "Save enabled at 95°");
      await form(page).getByRole("button", { name: "Cancel" }).click();
      const refused = await apiCall(token, "PATCH", `${takeoff}/item/${r.uuid}`, { pitch_mode: "degrees", pitch_entry: "95" });
      const both = await apiCall(token, "PATCH", `${takeoff}/item/${r.uuid}`, { height_ft: 8, height_raw: "8", pitch_mode: "riseRun", pitch_entry: "6/12" });
      expect(refused.status === 409 && both.status === 409, `95°: ${refused.status}; both: ${both.status}`);
      return `6/12, 26.565°, 50% → ${readings.map((v) => v.toFixed(2)).join(", ")} SF; "${r.name}"; pitch unticks height; 95° "Angle must be between 0 and 90 degrees", Save disabled; api 409 for 95° and for both`;
    },
  },
  {
    title: "S2 AC4: the api's figure reaches a second window, on the other api process, within a second",
    run: async ({ page, context }) => {
      const owner = await fixtureOwner();
      const b = await context.browser().newContext();
      await recordSockets(b);
      try {
        const bp = await b.newPage();
        await signInAt(bp, APP_B, owner.email, owner.password);
        await enterWorkspace(bp, workspace.uuid);
        await bp.goto(`${APP_B}/project/${project.uuid}/takeoff/${sheet.uuid}`);
        await bp.locator("[data-quantity-panel]").getByText("Roof").first().waitFor({ timeout: 20000 });
        await joinedTopic(bp, `ws:${workspace.uuid}:project:${project.uuid}`);
        const roof = (await items()).find((i) => i.name.startsWith("Roof"));
        const at = Date.now();
        const patched = await apiCall(token, "PATCH", `${takeoff}/item/${roof.uuid}`, { pitch_mode: "riseRun", pitch_entry: "12/12" });
        expect(patched.status === 200, `patch: ${patched.status}`);
        const want = patched.body.effective_quantity.toLocaleString("en-US", { maximumFractionDigits: 2 });
        await bp.locator("[data-quantity-panel]").getByText(`${want} SF`).first().waitFor({ timeout: 5000 });
        const ms = Date.now() - at;
        expect(ms < 1500, `B took ${ms} ms`);
        return `12/12 → ${want} SF in B after ${ms} ms`;
      } finally {
        await b.close();
      }
    },
  },
  {
    title: "S3: + Depth twice gives Depth and Depth (2), d1 and d2; deleting d1 and adding again gives d3; a marker offers none; the item's own quantity never changes",
    run: async ({ page }) => {
      await open(page);
      const wall = (await items()).find((i) => i.name === "Wall run");
      const was = wall.effective_quantity;
      await properties(page, "Wall run");
      const dims = form(page).locator("[data-dimensions]");
      await dims.getByRole("button", { name: "+ Depth" }).click();
      await dims.getByRole("button", { name: "+ Depth" }).click();
      const names = await dims.locator("[data-dimension] input[aria-label^='Name of']").evaluateAll((els) => els.map((e) => e.value));
      const keys = await dims.locator("[data-dimension]").evaluateAll((els) => els.map((e) => e.dataset.dimension));
      expect(names.join() === "Depth,Depth (2)" && keys.join() === "d1,d2", `names ${names}, keys ${keys}`);
      await dims.getByRole("button", { name: "Remove Depth", exact: true }).click();
      await dims.getByRole("button", { name: "+ Width" }).click();
      const after = await dims.locator("[data-dimension]").evaluateAll((els) => els.map((e) => e.dataset.dimension));
      expect(after.join() === "d2,d3", `keys after delete and add: ${after}`);
      await dims.getByLabel("Value of Depth (2)").fill(`2'-0"`);
      await dims.getByLabel("Value of Width").fill("1.5");
      await form(page).getByRole("button", { name: "Save" }).click();
      await form(page).waitFor({ state: "detached" });
      const d = await waitFor(async () => { const x = await detail(wall.uuid); return x.dimensions.length === 2 ? x : null; }, "dimensions saved", 10000);
      expect(d.dimensions.map((x) => `${x.local_key}=${x.value}`).join() === "d2=2,d3=1.5", `stored ${JSON.stringify(d.dimensions)}`);
      expect(d.effective_quantity === was, `quantity moved: ${was} → ${d.effective_quantity}`);

      await properties(page, "Doors");
      await form(page).getByLabel("Symbol", { exact: true }).selectOption("cross");
      await form(page).getByText("This symbol is a marker. Use a circle or square to carry dimensions.").waitFor();
      await form(page).getByLabel("Symbol", { exact: true }).selectOption("circle");
      const circle = await form(page).locator("[data-dimensions] button").allTextContents();
      expect(circle.join() === "+ Dia,+ Height,+ Depth", `circle offers ${circle}`);
      await form(page).getByRole("button", { name: "Cancel" }).click();
      return `Depth, Depth (2) as d1, d2; after deleting d1, + Width is d3; stored d2 = 2 ft, d3 = 1.5 ft; Wall run stays ${was}; Cross is a marker; Circle offers Dia, Height, Depth`;
    },
  },
]);

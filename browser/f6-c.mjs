// F6 Block C: folders with multipliers (S7), layers (S8), the item tree (S9).
//
//   docker compose --profile realtime up -d
//   docker compose --profile browser run --rm browser node scripts/f6-c.mjs
//
// The world: a new project (so it has legacy's three layers) with two landscape pages at
// 1/6 ft per point. Page 1: "Wall" (LF, 30 ft), "Floor" (SF, 10 × 10 ft). Page 2: "Door"
// (count, 2 marks). A folder "Framing" holds Wall. Window B is the same owner on :5174.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { APP_B, joinedTopic, recordSockets, signInAt, waitFor } from "./lib/realtime.mjs";
import { armMeasure, sheetPoint } from "./lib/takeoff.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6;
const { token, workspace, base } = await freshWorkspace("F6 Block C");
const project = await makeProject(token, base, { name: "Tree" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let p1;
let p2;
const made = {};
let framing;

const panel = (page) => page.locator("[data-quantity-panel]");
const row = (page, name) => panel(page).locator("li[data-item-row] > button").filter({ has: page.getByText(name, { exact: true }) }).first();
const detail = async (name) => (await apiCall(token, "GET", `${takeoff}/item/detail`)).body.find((i) => i.name === name);
const items = async () => (await apiCall(token, "GET", `${takeoff}/item`)).body;
const byName = async (name) => (await items()).find((i) => i.name === name);
const folders = async () => (await apiCall(token, "GET", `${takeoff}/folder`)).body;
const layers = async () => (await apiCall(token, "GET", `${takeoff}/layer`)).body;
const header = (page, name) => panel(page).locator(`[data-folder-group="${name}"] > [data-folder-header]`).first();

async function make(sheet, name, type, vertices, meta = null) {
  const res = await apiCall(token, "POST", `${takeoff}/item`, {
    name, type, unit: type === "lf" ? "LF" : type === "sf" ? "SF" : "EA", sheet_uuid: sheet.uuid,
    geometry: { geom_type: type, vertices_json: vertices, shape_meta: meta, client_uuid: crypto.randomUUID() },
  });
  expect(res.status === 201, `${name}: ${res.status} ${JSON.stringify(res.body)}`);
  made[name] = res.body;
  return res.body;
}

async function open(page, sheet = p1) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
  await panel(page).locator("[data-layer-control]").waitFor();
}

/** A row dragged onto a folder header in small steps, as a hand does it; the target is
 *  scrolled into view mid-drag, as the tree scrolls under a hand, so both need not fit. */
async function drag(page, from, to) {
  await from.scrollIntoViewIfNeeded();
  const a = await from.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 8, { steps: 4 });
  await to.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const b = await to.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

async function menuOn(locator, page, entry) {
  await locator.click({ button: "right" });
  await page.getByRole("menuitem", { name: entry }).click();
}

await run("f6-c", [
  {
    title: "setup: a new project, two pages at 1/6 ft per point; Wall and Floor on page 1, Door on page 2; Framing holds Wall",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Tree.pdf", buffer: makePdf([{ width: W, height: H, label: "C1" }, { width: W, height: H, label: "C2" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Tree.pdf"].uuid, [1, 2]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      const sheets = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      [p1, p2] = [1, 2].map((n) => sheets.find((s) => s.page_number === n));
      for (const s of [p1, p2]) {
        const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${s.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
        expect(scaled.status === 200, `scale: ${scaled.status}`);
      }
      await make(p1, "Wall", "lf", [[0.1, 0.5], [0.1 + 180 / W, 0.5]]);
      await make(p1, "Floor", "sf", [[0.5, 0.2], [0.5 + 60 / W, 0.2], [0.5 + 60 / W, 0.2 + 60 / H], [0.5, 0.2 + 60 / H]], { closed: true });
      await make(p2, "Door", "count", [[0.3, 0.3], [0.6, 0.3]]);
      const f = await apiCall(token, "POST", `${takeoff}/folder`, { name: "Framing" });
      framing = f.body;
      const filed = await apiCall(token, "PATCH", `${takeoff}/item/${made.Wall.uuid}`, { folder_uuid: framing.uuid });
      expect(filed.status === 200, `file: ${filed.status}`);
      return `Wall ${made.Wall.effective_quantity} LF, Floor ${made.Floor.effective_quantity} SF, Door ${made.Door.effective_quantity} EA`;
    },
  },
  {
    title: "S8 AC1: a new project has legacy's three layers, Base Bid the default; every item was filed under Base Bid",
    run: async () => {
      const list = await layers();
      const names = list.sort((a, b) => a.position - b.position).map((l) => `${l.name}${l.is_default ? "*" : ""}`);
      expect(names.join() === "Base Bid*,Alternate,Deferred Submittals", `layers ${names.join()}`);
      const base = list.find((l) => l.is_default);
      const all = await items();
      expect(all.every((i) => i.layer_uuid === base.uuid), `layers of items: ${all.map((i) => i.layer_uuid).join()}`);
      return `${names.join(", ")} (* default); Wall, Floor and Door on Base Bid`;
    },
  },
  {
    title: "S9 AC0: the panel lists every item in the project; clicking Door, on page 2, opens page 2",
    run: async ({ page }) => {
      await open(page, p1);
      await row(page, "Door").waitFor({ timeout: 10000 });
      await row(page, "Door").click();
      await page.waitForURL(new RegExp(`/takeoff/${p2.uuid}$`));
      return "Door listed while page 1 is open; the click opened page 2";
    },
  },
  {
    title: "S7 AC1: Folder Properties with multiplier 2: \"×2\" on the folder and Wall's total doubled beside its measured 30 LF; 0 is refused",
    run: async ({ page }) => {
      await open(page, p1);
      await menuOn(header(page, "Framing"), page, "Folder Properties");
      const dialog = page.locator("[data-folder-properties]");
      await dialog.getByLabel("Multiplier").fill("0");
      await dialog.locator("[data-multiplier-error]").waitFor();
      const refusal = (await dialog.locator("[data-multiplier-error]").textContent()).trim();
      const off = await dialog.getByRole("button", { name: "Save" }).isDisabled();
      await dialog.getByLabel("Multiplier").fill("2");
      await dialog.getByRole("button", { name: "Save" }).click();
      await header(page, "Framing").locator("[data-folder-multiplier]").waitFor({ timeout: 10000 });
      const badge = (await header(page, "Framing").locator("[data-folder-multiplier]").textContent()).trim();
      await row(page, "Wall").locator("[data-item-total]").waitFor({ timeout: 10000 });
      const total = (await row(page, "Wall").locator("[data-item-qty]").textContent()).trim();
      const wall = await detail("Wall");
      expect(refusal === "Enter a number greater than 0." && off, `0: "${refusal}", Save disabled ${off}`);
      expect(badge === "×2" && /× 2 = 60(\.0+)? LF$/.test(total), `badge "${badge}", row "${total}"`);
      expect(Math.abs(wall.effective_quantity - 30) < 1e-6 && wall.multiplier === 2, `Wall ${wall.effective_quantity}, multiplier ${wall.multiplier}`);
      return `0 → "${refusal}"; "${badge}"; Wall "${total}"; stored 30 LF with multiplier 2 (D-57)`;
    },
  },
  {
    title: "S7 AC2: \"Delete folder?\" names the sub-folders going and the items moving to Unfiled; an empty folder asks legacy's other question",
    run: async ({ page }) => {
      const child = (await apiCall(token, "POST", `${takeoff}/folder`, { name: "Studs", parent_uuid: framing.uuid })).body;
      const empty = (await apiCall(token, "POST", `${takeoff}/folder`, { name: "Spare" })).body;
      await open(page, p1);
      await menuOn(header(page, "Spare"), page, "Delete folder");
      const dialog = page.getByRole("dialog");
      const emptyWords = await dialog.innerText();
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await menuOn(header(page, "Framing"), page, "Delete folder");
      const words = await page.getByRole("dialog").innerText();
      expect(emptyWords.includes("This folder is empty. Are you sure you want to delete it?"), `empty: ${emptyWords}`);
      expect(words.includes("Delete folder?") && words.includes("1 sub-folder") && words.includes("1 line item") && words.includes("Deleting it will remove all subfolders and move line items to Unfiled."), `framing: ${words}`);
      await page.getByRole("dialog").getByRole("button", { name: /Delete/ }).last().click();
      // Both at once: a read that straddles the delete's commit can show Wall unfiled
      // with Framing's ×2 still on it (read committed across the list's statements;
      // recorded as a finding). The settled state is what the step checks.
      const wall = await waitFor(async () => { const w = await byName("Wall"); return w.folder_uuid === null && w.multiplier === 1 ? w : null; }, "Wall unfiled, ×1", 10000);
      const left = (await folders()).map((f) => f.name);
      expect(!left.includes("Framing") && !left.includes("Studs") && wall.multiplier === 1, `folders ${left.join()}, Wall ×${wall.multiplier}`);
      await apiCall(token, "DELETE", `${takeoff}/folder/${empty.uuid}`);
      void child;
      return `empty: "This folder is empty…"; Framing: "${words.split("\n").find((l) => l.includes("Deleting")) ?? words}"; Wall to Unfiled`;
    },
  },
  {
    title: "S7 AC3, AC4: renaming Unfiled to \"Sitework\" makes a real folder holding the unfiled items; window B follows each folder change live",
    run: async ({ page, context }) => {
      const owner = await fixtureOwner();
      const b = await context.browser().newContext();
      await recordSockets(b);
      try {
        const bp = await b.newPage();
        await signInAt(bp, APP_B, owner.email, owner.password);
        await enterWorkspace(bp, workspace.uuid);
        await bp.goto(`${APP_B}/project/${project.uuid}/takeoff/${p1.uuid}`);
        await bp.locator("[data-quantity-panel] [data-folder-group='Unfiled']").waitFor({ timeout: 20000 });
        await joinedTopic(bp, `ws:${workspace.uuid}:project:${project.uuid}`);
        await open(page, p1);
        await menuOn(header(page, "Unfiled"), page, "Rename");
        await page.getByRole("dialog").getByRole("textbox").fill("Sitework");
        await page.getByRole("dialog").getByRole("button", { name: "Rename" }).click();
        const at = Date.now();
        await bp.locator("[data-quantity-panel] [data-folder-group='Sitework']").waitFor({ timeout: 10000 });
        const ms = Date.now() - at;
        const site = (await folders()).find((f) => f.name === "Sitework");
        const inIt = (await items()).filter((i) => !i.parent_uuid && i.folder_uuid === site.uuid).map((i) => i.name).sort();
        expect(inIt.join() === "Door,Floor,Wall", `Sitework holds ${inIt.join()}`);
        await page.locator("[data-quantity-panel] [data-folder-group='Unfiled']").waitFor({ state: "detached", timeout: 10000 });
        return `Sitework holds ${inIt.join(", ")}; B showed it after ${ms} ms, no reload`;
      } finally {
        await b.close();
      }
    },
  },
  {
    title: "S8 AC2, AC4: on Alternate, a new count files under Alternate and the tree shows Alternate's items only; Base Bid's shapes leave the sheet until its eye is on, kept after a reload",
    run: async ({ page }) => {
      await open(page, p1);
      const paths = () => page.locator('svg[role="presentation"] path, svg[role="presentation"] circle').count();
      // The panel lists items before the canvas has drawn them; on a busy bench the count
      // read 0. Wait for Base Bid's shapes on this sheet (Wall and Floor) first.
      await page.waitForFunction(() => document.querySelectorAll('svg[role="presentation"] path, svg[role="presentation"] circle').length >= 2, null, { timeout: 15000 });
      const before = await paths();
      await panel(page).locator("[data-active-layer]").click();
      await page.getByRole("menu", { name: "Layers" }).getByRole("menuitem", { name: /^Alternate/ }).click();
      await page.waitForFunction(() => document.querySelector("[data-active-layer]")?.getAttribute("data-active-layer") === "Alternate");
      const afterHide = await paths();
      const wallListed = await row(page, "Wall").count();
      await armMeasure(page, "Count", { name: "Hydrant" });
      const pt = await sheetPoint(page, 0.8, 0.8);
      await page.mouse.click(pt.x, pt.y);
      const hydrant = await waitFor(() => byName("Hydrant"), "Hydrant saved", 10000);
      const alternate = (await layers()).find((l) => l.name === "Alternate");
      expect(hydrant.layer_uuid === alternate.uuid, `Hydrant on ${hydrant.layer_uuid}`);
      expect(afterHide < before && wallListed === 0, `shapes ${before} → ${afterHide}; Wall listed ${wallListed}`);
      await panel(page).locator("[data-active-layer]").click();
      await page.getByRole("menu", { name: "Layers" }).getByRole("button", { name: "Show Base Bid" }).click();
      await page.keyboard.press("Escape");
      await page.waitForFunction((n) => document.querySelectorAll('svg[role="presentation"] path, svg[role="presentation"] circle').length > n, afterHide + 1);
      await page.reload();
      await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
      await page.waitForFunction((n) => document.querySelectorAll('svg[role="presentation"] path, svg[role="presentation"] circle').length > n, afterHide + 1, { timeout: 15000 });
      const activeAfter = await panel(page).locator("[data-active-layer]").getAttribute("data-active-layer");
      expect(activeAfter === "Alternate", `after reload the active layer is ${activeAfter}`);
      return `on Alternate: shapes ${before} → ${afterHide}, Wall not in the tree; Hydrant filed on Alternate; Base Bid's eye on shows its shapes, and both survive a reload`;
    },
  },
  {
    title: "S8 AC3: deleting a layer offers \"Move contents and delete layer\", or \"Delete layer and all its measurements\" only once DELETE is typed; the last layer is refused by the api (409), whichever it is",
    run: async ({ page }) => {
      await open(page, p1);
      await panel(page).locator("[data-active-layer]").click();
      await page.getByRole("menu", { name: "Layers" }).getByRole("button", { name: "Delete Alternate" }).click();
      const dialog = page.locator("[data-delete-layer]");
      await dialog.waitFor();
      const words = await dialog.innerText();
      const deleteAll = dialog.getByRole("button", { name: "Delete layer and all its measurements" });
      const offBefore = await deleteAll.isDisabled();
      await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
      const onAfter = await deleteAll.isEnabled();
      const baseBid = (await layers()).find((l) => l.name === "Base Bid");
      await dialog.getByLabel("Move to layer").selectOption(baseBid.uuid);
      await dialog.getByRole("button", { name: "Move contents and delete layer" }).click();
      const hydrant = await waitFor(async () => { const h = await byName("Hydrant"); return h.layer_uuid === baseBid.uuid ? h : null; }, "Hydrant moved", 10000);
      expect(offBefore && onAfter && words.includes("This layer holds 1 item and 0 folders."), `words "${words.split("\n")[0]}", disabled ${offBefore}, enabled ${onAfter}`);
      // Down to one: Deferred Submittals goes with its contents (none), then Base Bid is last.
      const deferred = (await layers()).find((l) => l.name === "Deferred Submittals");
      const gone = await apiCall(token, "DELETE", `${takeoff}/layer/${deferred.uuid}?with_contents=true`);
      const last = await apiCall(token, "DELETE", `${takeoff}/layer/${baseBid.uuid}?move_to=${deferred.uuid}`);
      const lastPlain = await apiCall(token, "DELETE", `${takeoff}/layer/${baseBid.uuid}`);
      expect(gone.status === 200 && last.status === 409 && lastPlain.status === 409 && lastPlain.body.detail === "A project must keep at least one layer", `deferred ${gone.status}, last ${last.status}/${lastPlain.status} ${JSON.stringify(lastPlain.body)}`);
      return `"${words.split("\n")[0]}"; the DELETE box gates the second way; Hydrant moved to Base Bid; the last layer refused 409 "${lastPlain.body.detail}"`;
    },
  },
  {
    title: "S9 AC2, AC3: the item menu offers Properties, Duplicate, Move to layer, Create sub-item, Delete; Duplicate suggests \"Wall (2)\", then \"Wall (3)\", with its sub-items",
    run: async ({ page }) => {
      const sub = await apiCall(token, "PUT", `${takeoff}/item/${made.Wall.uuid}/sub-items`, { sub_items: [{ name: "Plates", formula_text: "PARENT * 2", unit: "LF" }] });
      expect(sub.status === 200, `sub-items: ${sub.status}`);
      await open(page, p1);
      await row(page, "Wall").click({ button: "right" });
      const offered = await page.getByRole("menuitem").allTextContents();
      for (const want of ["Properties", "Duplicate", "Create sub-item", "Manage sub-items"]) void want;
      expect(offered.some((t) => t.startsWith("Properties")) && offered.includes("Duplicate") && offered.some((t) => /sub-item/i.test(t)) && offered.some((t) => t.startsWith("Base Bid")) && offered.some((t) => /^Delete/.test(t)), `menu: ${offered.join(" | ")}`);
      await page.getByRole("menuitem", { name: "Duplicate" }).click();
      const dup = page.locator("[data-duplicate]");
      const suggested = await dup.getByLabel("Duplicate name").inputValue();
      const includes = await dup.getByText("Include sub-items (1)").count();
      await dup.getByRole("button", { name: "Duplicate" }).click();
      const copy = await waitFor(() => byName("Wall (2)"), "Wall (2)", 10000);
      // The next suggestion reads the names the panel lists: wait until it lists the copy.
      await row(page, "Wall (2)").waitFor({ timeout: 10000 });
      await row(page, "Wall").first().click({ button: "right" });
      await page.getByRole("menuitem", { name: "Duplicate" }).click();
      const second = await page.locator("[data-duplicate]").getByLabel("Duplicate name").inputValue();
      await page.locator("[data-duplicate]").getByRole("button", { name: "Cancel" }).click();
      const copyKids = (await items()).filter((i) => i.parent_uuid === copy.uuid).map((i) => i.name);
      expect(suggested === "Wall (2)" && second === "Wall (3)" && includes === 1 && copyKids.join() === "Plates", `first "${suggested}", second "${second}", sub-items ${copyKids.join()}`);
      expect(copy.color !== made.Wall.color && Math.abs(copy.effective_quantity - made.Wall.effective_quantity) < 1e-9, `copy colour ${copy.color}, qty ${copy.effective_quantity}`);
      return `menu: ${offered.join(" · ")}; "${suggested}" then "${second}"; the copy has Plates, a new colour and the same 30 LF`;
    },
  },
  {
    title: "S9 AC4, AC5: Ctrl and Shift select several, and the bulk menu moves them; a drag re-files a row; a drop into Rough Measurements is refused",
    run: async ({ page }) => {
      await apiCall(token, "POST", `${takeoff}/item`, { name: "Rough area", type: "sf", unit: "SF", sheet_uuid: p1.uuid, is_reference: true, geometry: { geom_type: "sf", vertices_json: [[0.7, 0.7], [0.75, 0.7], [0.75, 0.75]], shape_meta: { closed: true }, client_uuid: crypto.randomUUID() } });
      const target = (await apiCall(token, "POST", `${takeoff}/folder`, { name: "Finishes" })).body;
      await open(page, p1);
      await row(page, "Floor").click();
      await row(page, "Wall (2)").click({ modifiers: ["Control"] });
      const picked = await panel(page).locator("p[data-picked]").getAttribute("data-picked");
      await row(page, "Wall (2)").click({ button: "right" });
      await page.getByRole("menu", { name: "Selected items" }).getByRole("menuitem", { name: "Finishes" }).click();
      await waitFor(async () => {
        const all = await items();
        return ["Floor", "Wall (2)"].every((n) => all.find((i) => i.name === n)?.folder_uuid === target.uuid);
      }, "both in Finishes", 10000);
      // Drag Door into Finishes.
      await drag(page, row(page, "Door"), header(page, "Finishes"));
      await waitFor(async () => (await byName("Door")).folder_uuid === target.uuid, "Door re-filed", 10000);
      // A drop of Floor into Rough Measurements is refused by the api, and the page says so.
      await drag(page, row(page, "Floor"), header(page, "Rough Measurements"));
      await page.getByText("Only rough measurements go in Rough Measurements", { exact: false }).waitFor({ timeout: 10000 });
      const floor = await byName("Floor");
      expect(picked === "2" && floor.folder_uuid === target.uuid, `picked ${picked}, Floor in ${floor.folder_uuid}`);
      return "Ctrl selected 2, the bulk menu filed both in Finishes; a drag filed Door; Floor's drop into Rough Measurements refused with the api's words";
    },
  },
]);

// F6 Block B: sub-items (S5), variables (S6), and S3 AC4's refusal, which needs a
// sub-item to read the dimension. S4, the two engines on one table, is `f6-s4`.
//
//   docker compose --profile realtime up -d
//   docker compose --profile browser run --rm browser node scripts/f6-b.mjs
//
// The world: two projects in one workspace, each one landscape page (1224 × 792 pt) at
// 1/6 ft per point. Project 1's "Slab" is a 40 × 25 ft rectangle: 1,000 SF, perimeter
// 130 ft. Window B is the same owner on :5174 (api-b).

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { APP_B, joinedTopic, recordSockets, signInAt, waitFor } from "./lib/realtime.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6;
const { token, workspace, base } = await freshWorkspace("F6 Block B");
const one = await makeProject(token, base, { name: "Sub-items one" });
const two = await makeProject(token, base, { name: "Sub-items two" });
const worlds = {};
let slab;
let other;

const takeoff = (p) => `${base}/${p.uuid}/takeoff`;
const items = async (p) => (await apiCall(token, "GET", `${takeoff(p)}/item?sheet_uuid=${worlds[p.uuid].uuid}`)).body;
const detail = async (p, uuid) => (await apiCall(token, "GET", `${takeoff(p)}/item/${uuid}`)).body;
const children = async (p, parent) => (await items(p)).filter((i) => i.parent_uuid === parent.uuid);
const dialog = (page) => page.locator("[data-sub-items-dialog]");
/** A rectangle w × h feet, at (x0, y0) on the page. */
const rect = (x0, y0, wFt, hFt) => {
  const dx = wFt / FT / W;
  const dy = hFt / FT / H;
  return [[x0, y0], [x0 + dx, y0], [x0 + dx, y0 + dy], [x0, y0 + dy]];
};

async function world(page, project, label) {
  const files = await uploadAll(page, token, base, project.uuid, [
    { name: `${label}.pdf`, buffer: makePdf([{ width: W, height: H, label }]), folder: "Plans" },
  ], workspace.uuid);
  const loaded = await loadPages(token, base, project.uuid, [[files[`${label}.pdf`].uuid, [1]]]);
  expect(loaded.status === 200, `load: ${loaded.status}`);
  const [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
  const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
  expect(scaled.status === 200, `scale: ${scaled.status}`);
  worlds[project.uuid] = sheet;
}

async function area(project, name, vertices) {
  const made = await apiCall(token, "POST", `${takeoff(project)}/item`, {
    name, type: "sf", unit: "SF", sheet_uuid: worlds[project.uuid].uuid, color: "#1d4ed8",
    geometry: { geom_type: "sf", vertices_json: vertices, shape_meta: { closed: true }, client_uuid: crypto.randomUUID() },
  });
  expect(made.status === 201, `${name}: ${made.status} ${JSON.stringify(made.body)}`);
  return made.body;
}

async function open(page, project) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${worlds[project.uuid].uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
}

async function menu(page, name, entry) {
  await page.locator("[data-quantity-panel] li[data-item-row] > button", { hasText: name }).first().click({ button: "right" });
  await page.getByRole("menuitem", { name: entry }).click();
}

const qtyIn = async (page, index) => (await dialog(page).locator(`[data-sub-row="${index}"] [data-sub-qty]`).textContent()).trim();

await run("f6-b", [
  {
    title: "setup: two projects, one page each at 1/6 ft per point; project 1's Slab is 40 × 25 ft (1,000 SF, 130 ft round)",
    run: async ({ page }) => {
      await world(page, one, "B1");
      await world(page, two, "B2");
      slab = await area(one, "Slab", rect(0.1, 0.1, 40, 25));
      other = await area(two, "Deck", rect(0.1, 0.1, 10, 10));
      expect(Math.abs(slab.effective_quantity - 1000) < 1e-6, `slab ${slab.effective_quantity}`);
      return `Slab ${slab.effective_quantity} SF; Deck ${other.effective_quantity} SF`;
    },
  },
  {
    title: "S5 AC1: \"Create sub-items\" on the 1,000 SF slab: Mesh PARENT * 1.05 reads 1,050 SF; Perimeter form PERIMETER reads 130; the api stores both",
    run: async ({ page }) => {
      await open(page, one);
      await menu(page, "Slab", "Create sub-item");
      await page.getByRole("dialog").getByRole("heading", { name: "Create sub-items" }).waitFor();
      await dialog(page).getByLabel("Description 1").fill("Mesh");
      await dialog(page).getByLabel("Formula 1").fill("PARENT * 1.05");
      const mesh = await qtyIn(page, 0);
      await dialog(page).getByRole("button", { name: "Add sub-item" }).click();
      await dialog(page).getByLabel("Description 2").fill("Perimeter form");
      await dialog(page).getByLabel("Formula 2").fill("PERIMETER");
      await dialog(page).getByLabel("Unit 2").selectOption("LF");
      const perimeter = await qtyIn(page, 1);
      expect(mesh === "1,050" && perimeter === "130", `preview Mesh "${mesh}", Perimeter form "${perimeter}"`);
      await dialog(page).getByRole("button", { name: "Save" }).click();
      await dialog(page).waitFor({ state: "detached" });
      const kids = await waitFor(async () => { const k = await children(one, slab); return k.length === 2 ? k : null; }, "two sub-items", 10000);
      const byName = Object.fromEntries(kids.map((k) => [k.name, k]));
      expect(byName.Mesh.formula_qty === 1050 && byName.Mesh.unit === "SF", `Mesh ${JSON.stringify(byName.Mesh)}`);
      expect(Math.abs(byName["Perimeter form"].formula_qty - 130) < 1e-9 && byName["Perimeter form"].unit === "LF", `Perimeter form ${byName["Perimeter form"].formula_qty}`);
      await page.locator(`[data-sub-items="${slab.uuid}"]`).getByText("1,050 SF").waitFor({ timeout: 10000 });
      return `preview Mesh ${mesh}, Perimeter form ${perimeter}; stored 1050 SF and 130 LF; nested under Slab`;
    },
  },
  {
    title: "S5 AC2, AC3: an unnamed row blocks with \"Name this sub-item to continue\", PARENT * with \"Fix the formula to continue\"; a sub-item cannot have sub-items",
    run: async ({ page }) => {
      await open(page, one);
      await menu(page, "Slab", "Manage sub-items");
      await page.getByRole("dialog").getByRole("heading", { name: "Manage sub-items" }).waitFor();
      await dialog(page).getByRole("button", { name: "Add sub-item" }).click();
      await dialog(page).getByLabel("Formula 3").fill("PARENT");
      const unnamed = (await dialog(page).locator("[data-sub-block]").textContent()).trim();
      const saveOff = await dialog(page).getByRole("button", { name: "Save" }).isDisabled();
      await dialog(page).getByLabel("Description 3").fill("Waste");
      await dialog(page).getByLabel("Formula 3").fill("PARENT *");
      const broken = (await dialog(page).locator("[data-sub-block]").textContent()).trim();
      expect(unnamed === "Name this sub-item to continue" && saveOff, `unnamed: "${unnamed}", Save disabled ${saveOff}`);
      expect(broken === "Fix the formula to continue", `broken: "${broken}"`);
      await dialog(page).getByRole("button", { name: "Cancel" }).click();

      const mesh = (await children(one, slab)).find((k) => k.name === "Mesh");
      const nested = await apiCall(token, "PUT", `${takeoff(one)}/item/${mesh.uuid}/sub-items`, { sub_items: [{ name: "Deeper", formula_text: "PARENT", unit: "SF" }] });
      expect(nested.status === 409 && /cannot have sub-items/.test(JSON.stringify(nested.body)), `nested: ${nested.status} ${JSON.stringify(nested.body)}`);
      await page.locator(`[data-sub-item="${mesh.uuid}"] button`).click({ button: "right" });
      const offered = await page.getByRole("menuitem").allTextContents();
      expect(!offered.some((t) => /sub-item/i.test(t)), `a sub-item's menu offers ${offered.join(", ")}`);
      await page.keyboard.press("Escape");
      return `"${unnamed}" with Save disabled; "${broken}"; api 409 "A sub-item cannot have sub-items."; a sub-item's menu offers none`;
    },
  },
  {
    title: "S5 AC5: a sub-item takes the parent's colour, folder, classification and layer",
    run: async () => {
      const parent = await detail(one, slab.uuid);
      const kids = await children(one, slab);
      const same = kids.every((k) => k.color === parent.color && k.folder_uuid === parent.folder_uuid && k.layer_uuid === parent.layer_uuid && k.classification_ref_id === parent.classification_ref_id && k.type === parent.type);
      expect(same, `parent ${JSON.stringify({ c: parent.color, f: parent.folder_uuid, l: parent.layer_uuid })} · kids ${JSON.stringify(kids.map((k) => ({ c: k.color, f: k.folder_uuid, l: k.layer_uuid })))}`);
      return `colour ${parent.color}, folder ${parent.folder_uuid ?? "Unfiled"}, layer ${parent.layer_uuid ?? "none"}, type ${parent.type}: the same on both`;
    },
  },
  {
    title: "S5 AC4: the parent's shape doubles on the api; every sub-item is recomputed there, and a second window on the other api shows 2,100 SF with no reload",
    run: async ({ context }) => {
      const owner = await fixtureOwner();
      const b = await context.browser().newContext();
      await recordSockets(b);
      try {
        const bp = await b.newPage();
        await signInAt(bp, APP_B, owner.email, owner.password);
        await enterWorkspace(bp, workspace.uuid);
        await bp.goto(`${APP_B}/project/${one.uuid}/takeoff/${worlds[one.uuid].uuid}`);
        await bp.locator(`[data-sub-items="${slab.uuid}"]`).getByText("1,050 SF").waitFor({ timeout: 20000 });
        await joinedTopic(bp, `ws:${workspace.uuid}:project:${one.uuid}`);
        const parent = await detail(one, slab.uuid);
        const g = parent.geometries[0];
        const at = Date.now();
        const moved = await apiCall(token, "PATCH", `${takeoff(one)}/geometry/${g.uuid}`, { vertices_json: rect(0.1, 0.1, 80, 25), shape_meta: { closed: true }, geometry_version: g.geometry_version });
        expect(moved.status === 200, `move: ${moved.status} ${JSON.stringify(moved.body)}`);
        await bp.locator(`[data-sub-items="${slab.uuid}"]`).getByText("2,100 SF").waitFor({ timeout: 10000 });
        const ms = Date.now() - at;
        const reloaded = await bp.evaluate(() => performance.getEntriesByType("navigation").length > 1);
        const kids = await children(one, slab);
        const perim = kids.find((k) => k.name === "Perimeter form").formula_qty;
        expect(!reloaded && Math.abs(perim - 210) < 1e-9, `reloaded ${reloaded}, perimeter ${perim}`);
        return `Slab 1,000 → 2,000 SF: Mesh 2,100 SF in B after ${ms} ms, Perimeter form ${perim} LF, no reload`;
      } finally {
        await b.close();
      }
    },
  },
  {
    title: "S3 AC4: a dimension a sub-item reads refuses delete, naming it (\"It's used by: Concrete\"), in the dialog and at the api",
    run: async ({ page }) => {
      const set = await apiCall(token, "PUT", `${takeoff(one)}/item/${slab.uuid}/dimension`, { dimensions: [{ local_key: "d1", name: "Depth", kind: "vertical", value: 0.5, unit: "FT", raw: "0.5" }] });
      expect(set.status === 200, `dimension: ${set.status}`);
      const kids = await children(one, slab);
      const rows = [...kids.map((k) => ({ uuid: k.uuid, name: k.name, formula_text: k.formula_text, unit: k.unit })), { name: "Concrete", formula_text: "{qty:AREA.d1@CY}", unit: "CY" }];
      const saved = await apiCall(token, "PUT", `${takeoff(one)}/item/${slab.uuid}/sub-items`, { sub_items: rows });
      expect(saved.status === 200, `sub-items: ${saved.status} ${JSON.stringify(saved.body)}`);
      const concrete = saved.body.find((k) => k.name === "Concrete");
      expect(Math.abs(concrete.formula_qty - 2000 * 0.5 / 27) < 1e-9, `Concrete ${concrete.formula_qty}`);

      const refused = await apiCall(token, "PUT", `${takeoff(one)}/item/${slab.uuid}/dimension`, { dimensions: [] });
      const zero = await apiCall(token, "PUT", `${takeoff(one)}/item/${slab.uuid}/dimension`, { dimensions: [{ local_key: "d1", name: "Depth", kind: "vertical", value: 0, unit: "FT", raw: "0" }] });
      expect(refused.status === 409 && /Can't delete "Depth".*It's used by: Concrete/.test(refused.body.detail), `delete: ${refused.status} ${JSON.stringify(refused.body)}`);
      expect(zero.status === 409 && /Can't set "Depth" to zero/.test(zero.body.detail), `zero: ${zero.status} ${JSON.stringify(zero.body)}`);

      await open(page, one);
      await menu(page, "Slab", "Properties");
      const used = await page.locator('[data-dimension="d1"] [data-used-by]').textContent();
      await page.locator("[data-dimensions]").getByRole("button", { name: "Remove Depth", exact: true }).click();
      const words = await page.locator("[data-dimension-refusal]").innerText();
      expect(used.trim() === "used by 1" && words.includes(`Can't delete "Depth"`) && words.includes("It's used by: Concrete"), `badge "${used}", words "${words}"`);
      await page.locator("[data-measurement-dialog]").getByRole("button", { name: "Cancel" }).click();
      return `Concrete {qty:AREA.d1@CY} = ${concrete.formula_qty.toFixed(2)} CY; api: "${refused.body.detail}"; zero refused; dialog: "used by 1", "${words.split("\n")[0]}"`;
    },
  },
  {
    title: "S6 AC1: a workspace variable {Wall Height} = 10, made in the dialog, gives its figure; project 1's own value 12 changes only project 1",
    run: async ({ page }) => {
      await open(page, one);
      await menu(page, "Slab", "Manage sub-items");
      await dialog(page).getByRole("button", { name: "Insert" }).click();
      await page.getByRole("menuitem", { name: "Manage variables…" }).click();
      const vars = page.locator("[data-variables-dialog]");
      await vars.waitFor();
      if ((await vars.locator("[data-new-variable]").count()) === 0) await vars.getByRole("button", { name: "Add Variables" }).click();
      await vars.getByLabel("Variable name").fill("Wall Height");
      await vars.getByLabel("Variable unit").selectOption("FT");
      await vars.getByLabel("Default value").fill("10");
      await vars.locator("[data-new-variable]").getByRole("button", { name: "Save" }).click();
      await vars.locator('[data-variable="Wall Height"]').waitFor({ timeout: 10000 });
      await vars.getByRole("button", { name: "Done" }).click();
      await dialog(page).getByRole("button", { name: "Add sub-item" }).click();
      const n = await dialog(page).locator("[data-sub-row]").count();
      await dialog(page).getByLabel(`Description ${n}`).fill("Wall");
      await dialog(page).getByLabel(`Formula ${n}`).fill("{Wall Height} * 2");
      const preview = await qtyIn(page, n - 1);
      await dialog(page).getByRole("button", { name: "Save" }).click();
      await dialog(page).waitFor({ state: "detached" });
      const wall = await waitFor(async () => (await children(one, slab)).find((k) => k.name === "Wall"), "Wall saved", 10000);
      const variable = (await apiCall(token, "GET", `${takeoff(one)}/variable`)).body.find((v) => v.name === "Wall Height");
      expect(wall.formula_text === `{var:${variable.uuid}} * 2` && wall.formula_qty === 20 && preview === "20", `Wall "${wall.formula_text}" = ${wall.formula_qty}, preview ${preview}`);

      // Project 2 reads the same variable.
      const deckKids = await apiCall(token, "PUT", `${takeoff(two)}/item/${other.uuid}/sub-items`, { sub_items: [{ name: "Rail", formula_text: `{var:${variable.uuid}} * 3`, unit: "FT" }] });
      expect(deckKids.status === 200 && deckKids.body[0].formula_qty === 30, `project 2 Rail ${JSON.stringify(deckKids.body)}`);
      const own = await apiCall(token, "PUT", `${takeoff(one)}/variable/${variable.uuid}/value`, { value: 12 });
      expect(own.status === 200 && own.body.project_value === 12, `own value: ${own.status}`);
      const wallAfter = (await children(one, slab)).find((k) => k.name === "Wall").formula_qty;
      const railAfter = (await children(two, other)).find((k) => k.name === "Rail").formula_qty;
      expect(wallAfter === 24 && railAfter === 30, `Wall ${wallAfter}, Rail ${railAfter}`);
      return `stored {var:…} * 2 = 20 (preview ${preview}); project 1 at 12: Wall 24; project 2 still Rail 30`;
    },
  },
  {
    title: "S6 AC2: archiving takes it out of Insert, and existing formulas still resolve",
    run: async ({ page }) => {
      const variable = (await apiCall(token, "GET", `${takeoff(one)}/variable`)).body.find((v) => v.name === "Wall Height");
      await open(page, one);
      await menu(page, "Slab", "Manage sub-items");
      await dialog(page).getByRole("button", { name: "Insert" }).click();
      await page.getByRole("menuitem", { name: "Manage variables…" }).click();
      const vars = page.locator("[data-variables-dialog]");
      await vars.locator('[data-variable="Wall Height"]').getByRole("button", { name: "Archive" }).click();
      const confirm = await vars.locator("[data-archive-confirm]").innerText();
      await vars.locator("[data-archive-confirm]").getByRole("button", { name: "Archive" }).click();
      await vars.getByRole("button", { name: "Done" }).click();
      await waitFor(async () => (await apiCall(token, "GET", `${takeoff(one)}/variable`)).body.find((v) => v.uuid === variable.uuid)?.archived, "archived", 10000);
      await dialog(page).getByRole("button", { name: "Insert" }).click();
      const offered = await page.getByRole("menu", { name: "Insert" }).getByRole("menuitem").allTextContents();
      expect(!offered.some((t) => t.includes("Wall Height")), `Insert still offers it: ${offered.join(", ")}`);
      await dialog(page).getByRole("button", { name: "Cancel" }).click();
      const wall = (await children(one, slab)).find((k) => k.name === "Wall");
      expect(wall.formula_qty === 24 && !wall.formula_error, `Wall ${wall.formula_qty} ${wall.formula_error}`);
      return `"${confirm.split("\n").join(" ")}"; Insert offers ${offered.length} entries, none Wall Height; Wall still 24`;
    },
  },
  {
    title: "S6 AC3: a new default recomputes every sub-item that reads it, in every open window: project 2's Rail 30 → 45 in window B",
    run: async ({ context }) => {
      const variable = (await apiCall(token, "GET", `${takeoff(one)}/variable`)).body.find((v) => v.name === "Wall Height");
      const owner = await fixtureOwner();
      const b = await context.browser().newContext();
      await recordSockets(b);
      try {
        const bp = await b.newPage();
        await signInAt(bp, APP_B, owner.email, owner.password);
        await enterWorkspace(bp, workspace.uuid);
        await bp.goto(`${APP_B}/project/${two.uuid}/takeoff/${worlds[two.uuid].uuid}`);
        await bp.locator(`[data-sub-items="${other.uuid}"]`).getByText("30 FT").waitFor({ timeout: 20000 });
        await joinedTopic(bp, `ws:${workspace.uuid}`);
        const at = Date.now();
        const changed = await apiCall(token, "PATCH", `${takeoff(one)}/variable/${variable.uuid}`, { default_value: 15 });
        expect(changed.status === 200, `default: ${changed.status}`);
        await bp.locator(`[data-sub-items="${other.uuid}"]`).getByText("45 FT").waitFor({ timeout: 10000 });
        const ms = Date.now() - at;
        const wall = (await children(one, slab)).find((k) => k.name === "Wall").formula_qty;
        expect(wall === 24, `project 1 keeps its own 12: Wall ${wall}`);
        return `default 10 → 15: project 2's Rail 45 FT in B after ${ms} ms; project 1's Wall stays 24 (its own 12)`;
      } finally {
        await b.close();
      }
    },
  },
]);

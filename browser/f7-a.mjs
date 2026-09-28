// F7 Block A: foundations. S1 legacy's hit rules on the canvas; S2 the api's analytic
// quantities, deducts clipped once, the shapes transaction; S3 capabilities (D-61).
//
//   ./browser/f7-a.sh      (from intelcost-infra/; regress.sh runs it)
//
// The world: a fresh workspace, one square page (1000 × 1000 pt) at 0.1 ft per point, so
// 0.1 of the page is 10 ft; a viewer seat.

import { readFile, writeFile } from "node:fs/promises";

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { CASES } from "./lib/quantity-cases.mjs";
import { sheetPoint } from "./lib/takeoff.mjs";

const HERE = "/drive/scripts";
if (process.env.GEN === "1") {
  await writeFile(`${HERE}/.f7-cases.json`, JSON.stringify(CASES));
  console.log(`GEN ${CASES.length} cases`);
  process.exit(0);
}

const FT = 0.1;
const { token, workspace, base } = await freshWorkspace("F7 Block A");
const project = await makeProject(token, base, { name: "Shapes" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
let viewer;

const ellipse = (cx, cy, rx, ry) => ({ kind: "ellipse", cx, cy, rx, ry });
async function item(name, type, geometry, extra = {}) {
  const res = await apiCall(token, "POST", `${takeoff}/item`, {
    name, type, unit: type === "lf" ? "LF" : type === "sf" ? "SF" : "EA", sheet_uuid: sheet.uuid, ...extra,
    geometry: { geom_type: type, client_uuid: crypto.randomUUID(), ...geometry },
  });
  expect(res.status === 201, `${name}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}
const detail = async (uuid) => (await apiCall(token, "GET", `${takeoff}/item/${uuid}`)).body;
const qtyText = (page, name) =>
  page.locator("[data-quantity-panel] li[data-item-row] > button").filter({ has: page.getByText(name, { exact: true }) }).first().locator("[data-item-qty]").textContent();
const selectedName = (page) =>
  page.evaluate(() => document.querySelector("[data-quantity-panel] li[data-item-row] > button.bg-row-selected span.text-sm")?.textContent ?? null);

async function open(page, email) {
  await signInAs(page, email ?? (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
  await page.locator("[data-quantity-panel] li[data-item-row]").first().waitFor({ timeout: 15000 });
}

/** Click at a sheet point, shifted by (dx, dy) screen px. */
async function clickNear(page, x, y, dx = 0, dy = 0, button = "left") {
  const p = await sheetPoint(page, x, y);
  await page.mouse.click(p.x + dx, p.y + dy, { button });
}

/** Select an item from the tree, so a canvas click that picks nothing leaves it selected. */
async function pickRow(page, name) {
  await page.locator("[data-quantity-panel] li[data-item-row] > button").filter({ has: page.getByText(name, { exact: true }) }).first().click();
  await page.waitForFunction((n) => document.querySelector("[data-quantity-panel] li[data-item-row] > button.bg-row-selected span.text-sm")?.textContent === n, name);
}

await run("f7-a", [
  {
    title: "setup: one square page at 0.1 ft per point, a viewer seat",
    run: async ({ page }) => {
      viewer = await seatedMember(token, workspace.uuid, "viewer", "f7-a");
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Shapes.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "S1" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Shapes.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: "Custom", unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      return "one page, scaled; viewer seated";
    },
  },
  {
    title: "S2 AC3: the shared table: the browser's engine and the api's agree on every row; every worked answer is right; crossing deducts clip once on the api",
    run: async ({ page }) => {
      const python = new Map(JSON.parse(await readFile(`${HERE}/.f7-python.json`, "utf8")).map((r) => [r.id, r.value]));
      await page.goto(`${APP}/login`);
      const browser = await page.evaluate(async (cases) => {
        const q = await import("/src/lib/takeoff/quantity.ts");
        const pts = (v) => v.map(([x, y]) => ({ x, y }));
        return cases.map((c) => {
          const page = { widthPt: c.page[0], heightPt: c.page[1] };
          if (c.type === "sf") {
            const pos = c.shapes.filter((s) => s.role !== "subtract").map((s) => ({ points: pts(s.vertices), meta: s.meta }));
            const neg = c.shapes.filter((s) => s.role === "subtract").map((s) => ({ points: pts(s.vertices), meta: s.meta }));
            return { id: c.id, value: q.areaOnSheet(pos, neg, c.fpp, page) };
          }
          return { id: c.id, value: c.shapes.reduce((sum, s) => sum + q.quantityFor(c.type, pts(s.vertices), c.fpp, s.meta, page), 0) };
        });
      }, CASES);
      const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
      const disagree = [];
      const wrong = [];
      for (const [i, c] of CASES.entries()) {
        const api = python.get(c.id);
        const web = browser[i].value;
        if (c.crossing) {
          if (web !== null) disagree.push(`${c.id}: the browser clipped (${web})`);
        } else if (web === null || !close(api, web)) disagree.push(`${c.id}: api ${api}, browser ${web}`);
        if (c.expect !== undefined && !close(api, c.expect)) wrong.push(`${c.id}: ${api}, expected ${c.expect}`);
      }
      expect(python.size === CASES.length, `${python.size} api answers for ${CASES.length} rows`);
      expect(disagree.length === 0, `disagree: ${disagree.slice(0, 5).join("; ")}`);
      expect(wrong.length === 0, `wrong: ${wrong.slice(0, 5).join("; ")}`);
      const worked = CASES.filter((c) => c.expect !== undefined).length;
      return `${CASES.length} rows, both engines equal to 1e-9 on ${CASES.filter((c) => !c.crossing).length}; ${worked} worked answers right, the ${CASES.filter((c) => c.crossing).length} crossing deducts among them`;
    },
  },
  {
    title: "S2 AC1, AC2: an Area circle of radius 10 ft reads 314.16 SF, and still does after a reload; a Linear 10 × 20 ft rectangle 60.00 LF; a Linear circle 10 ft across 31.42 LF",
    run: async ({ page }) => {
      await item("Circle area", "sf", { vertices_json: [], shape_meta: ellipse(0.5, 0.5, 0.1, 0.1) });
      const corners = [[0.1, 0.1], [0.2, 0.1], [0.2, 0.3], [0.1, 0.3]];
      await item("Rect run", "lf", { vertices_json: [...corners, corners[0]], shape_meta: { kind: "rectangle", corners } });
      await item("Circle run", "lf", { vertices_json: [], shape_meta: ellipse(0.8, 0.2, 0.05, 0.05) });
      await open(page);
      const first = { area: (await qtyText(page, "Circle area")).trim(), rect: (await qtyText(page, "Rect run")).trim(), circle: (await qtyText(page, "Circle run")).trim() };
      await page.reload();
      await page.locator("[data-quantity-panel] li[data-item-row]").first().waitFor({ timeout: 15000 });
      const after = (await qtyText(page, "Circle area")).trim();
      expect(/^314\.16 SF/.test(first.area) && /^314\.16 SF/.test(after), `area ${first.area} → ${after}`);
      expect(/^60(\.00)? LF/.test(first.rect) && /^31\.42 LF/.test(first.circle), `rect ${first.rect}, circle ${first.circle}`);
      return `"${first.area}" then "${after}" after a reload; "${first.rect}"; "${first.circle}"`;
    },
  },
  {
    title: "S2: a deduct through the shapes transaction: an 80 × 40 ft area less a 10 ft-radius hole is 2,885.84 SF, shown live; deleting the section takes its deduct",
    run: async ({ page }) => {
      const square = [[0.1, 0.5], [0.9, 0.5], [0.9, 0.9], [0.1, 0.9]];
      const slab = await item("Slab", "sf", { vertices_json: [[0.6, 0.6], [0.7, 0.6], [0.7, 0.7]] });
      const first = (await detail(slab.uuid)).geometries[0];
      await open(page);
      const section = crypto.randomUUID();
      const hole = crypto.randomUUID();
      const tx = await apiCall(token, "POST", `${takeoff}/item/${slab.uuid}/shapes`, {
        create: [
          { client_uuid: section, geom_type: "sf", vertices_json: square, shape_meta: null },
          { client_uuid: hole, geom_type: "sf", vertices_json: [], shape_meta: ellipse(0.5, 0.7, 0.1, 0.1), role: "subtract", owner_uuid: section },
        ],
        delete: [{ uuid: first.uuid, geometry_version: first.geometry_version }],
      });
      expect(tx.status === 200, `shapes: ${tx.status} ${JSON.stringify(tx.body)}`);
      const after = await detail(slab.uuid);
      const expected = 80 * 40 - Math.PI * 100;
      expect(Math.abs(after.effective_quantity - expected) < 1e-6, `slab ${after.effective_quantity}, expected ${expected}`);
      expect(after.geometries.find((g) => g.uuid === hole)?.role === "subtract" && after.geometries.find((g) => g.uuid === hole)?.owner_uuid === section, "the deduct's role or owner");
      // The Sheets panel's per-sheet figure and a sub-item reading AREA agree (D-61).
      const perSheet = (await apiCall(token, "GET", `${base}/${project.uuid}/drawing/sheet/items`)).body
        .flatMap((s) => s.items).find((i) => i.uuid === slab.uuid)?.quantity;
      const subs = await apiCall(token, "PUT", `${takeoff}/item/${slab.uuid}/sub-items`, { sub_items: [{ name: "Net area", formula_text: "AREA_SF", unit: "SF" }] });
      expect(Math.abs(perSheet - expected) < 1e-6, `Sheets panel figure ${perSheet}`);
      expect(subs.status === 200 && Math.abs(subs.body[0].effective_quantity - expected) < 1e-6, `sub-item AREA: ${subs.status} ${JSON.stringify(subs.body?.[0]?.effective_quantity)}`);
      const shown = await page.waitForFunction(() => [...document.querySelectorAll("[data-quantity-panel] [data-item-qty]")].some((e) => e.textContent.startsWith("2,885.84")), null, { timeout: 10000 }).then(() => true).catch(() => false);
      const again = await apiCall(token, "POST", `${takeoff}/item/${slab.uuid}/shapes`, { delete: [{ uuid: section, geometry_version: 1 }] });
      const gone = await detail(slab.uuid);
      expect(again.status === 200 && gone.geometries.length === 0, `delete: ${again.status}, ${gone.geometries.length} shapes left`);
      expect(shown, "the panel did not show 2,885.84 SF without a reload");
      return `80 × 40 ft less π·10² = ${after.effective_quantity.toFixed(2)} SF, shown live in the panel; deleting the section left ${gone.geometries.length} shapes`;
    },
  },
  {
    title: "S2 AC4: a transaction with one stale version changes nothing and names who changed the shape",
    run: async () => {
      const wall = await item("Wall", "lf", { vertices_json: [[0.1, 0.95], [0.3, 0.95]] });
      const g = (await detail(wall.uuid)).geometries[0];
      const moved = await apiCall(token, "PATCH", `${takeoff}/geometry/${g.uuid}`, { vertices_json: [[0.1, 0.95], [0.35, 0.95]], geometry_version: g.geometry_version });
      expect(moved.status === 200, `move: ${moved.status}`);
      const stale = await apiCall(token, "POST", `${takeoff}/item/${wall.uuid}/shapes`, {
        create: [{ client_uuid: crypto.randomUUID(), geom_type: "lf", vertices_json: [[0.5, 0.95], [0.6, 0.95]] }],
        update: [{ uuid: g.uuid, geometry_version: g.geometry_version, vertices_json: [[0.1, 0.95], [0.2, 0.95]], shape_meta: null }],
      });
      const now = await detail(wall.uuid);
      expect(stale.status === 409 && /just changed this shape, showing their version\.$/.test(stale.body.detail), `${stale.status} ${JSON.stringify(stale.body)}`);
      expect(now.geometries.length === 1 && now.geometries[0].vertices_json[1][0] === 0.35, `after: ${JSON.stringify(now.geometries.map((x) => x.vertices_json))}`);
      return `409 "${stale.body.detail}"; nothing written (one shape, still the moved one)`;
    },
  },
  {
    title: "S1 AC1, AC2: 2 px beside a hairline run selects it, 30 px away does not; inside a square selects it, and so does 3 px outside its edge",
    run: async ({ page }) => {
      // Along the top, clear of step 3's shapes, so 30 px below it is bare paper.
      await item("Hairline", "lf", { vertices_json: [[0.3, 0.03], [0.7, 0.03]] });
      await item("Box", "sf", { vertices_json: [[0.75, 0.3], [0.85, 0.3], [0.85, 0.4], [0.75, 0.4]] });
      await open(page);
      await pickRow(page, "Wall");
      await clickNear(page, 0.5, 0.03, 0, 30);
      const far = await selectedName(page);
      await clickNear(page, 0.5, 0.03, 0, 2);
      await page.waitForFunction(() => document.querySelector("[data-quantity-panel] li[data-item-row] > button.bg-row-selected span.text-sm")?.textContent === "Hairline", null, { timeout: 5000 }).catch(() => {});
      const near = await selectedName(page);
      await pickRow(page, "Wall");
      await clickNear(page, 0.8, 0.35);
      const inside = await selectedName(page);
      await pickRow(page, "Wall");
      await clickNear(page, 0.75, 0.35, -3, 0);
      const edge = await selectedName(page);
      expect(far === "Wall" && near === "Hairline", `30 px: ${far}; 2 px: ${near}`);
      expect(inside === "Box" && edge === "Box", `inside: ${inside}; 3 px outside the edge: ${edge}`);
      return `30 px away left "${far}" selected; 2 px beside selected "${near}"; inside and 3 px outside the edge both "${edge}"`;
    },
  },
  {
    title: "S1 AC3: a count mark selects from 10 px off its centre (legacy's 14 px floor) at zoom 1 and zoom 2; 25 px off does not",
    run: async ({ page }) => {
      await item("Doors", "count", { vertices_json: [[0.2, 0.7]] });
      await open(page);
      const out = [];
      for (const zoom of [1, 2]) {
        if (zoom === 2) await page.getByRole("button", { name: /^Zoom in/ }).click();
        await pickRow(page, "Wall");
        await clickNear(page, 0.2, 0.7, 25, 0);
        const far = await selectedName(page);
        await clickNear(page, 0.2, 0.7, 10, 0);
        const near = await selectedName(page);
        out.push({ zoom, far, near });
      }
      expect(out.every((o) => o.far === "Wall" && o.near === "Doors"), JSON.stringify(out));
      return out.map((o) => `zoom ${o.zoom}: 10 px "${o.near}", 25 px "${o.far}"`).join("; ");
    },
  },
  {
    title: "S3: a viewer sees every measure tool and the item menu's edit entries disabled with the reason; select still works; a hand-written shapes transaction is refused 403",
    run: async ({ page }) => {
      await open(page, viewer.email);
      const tools = page.getByRole("group", { name: "Takeoff tools" });
      const disabled = {};
      for (const name of ["Linear", "Area", "Count"]) disabled[name] = await tools.getByRole("button", { name, exact: true }).isDisabled().catch(() => null);
      await clickNear(page, 0.8, 0.35);
      const picked = await selectedName(page);
      await page.locator("[data-quantity-panel] li[data-item-row] > button").filter({ has: page.getByText("Box", { exact: true }) }).first().click({ button: "right" });
      const rename = page.getByRole("menuitem", { name: /^Rename/ });
      const renameOff = (await rename.getAttribute("aria-disabled")) === "true";
      const renameWhy = (await rename.textContent()) ?? "";
      await page.keyboard.press("Escape");
      const box = (await apiCall(token, "GET", `${takeoff}/item`)).body.find((i) => i.name === "Box");
      const refused = await apiCall(viewer.token, "POST", `${takeoff}/item/${box.uuid}/shapes`, { create: [{ geom_type: "sf", vertices_json: [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2]] }] });
      expect(Object.values(disabled).every((d) => d === true), `tools: ${JSON.stringify(disabled)}`);
      expect(picked === "Box", `the viewer's click selected ${picked}`);
      expect(renameOff && renameWhy.includes("Your role cannot create & edit measurements."), `Rename: disabled ${renameOff}, "${renameWhy}"`);
      expect(refused.status === 403, `viewer shapes: ${refused.status}`);
      return `tools disabled ${JSON.stringify(disabled)}; the viewer's click selected "${picked}"; Rename "${renameWhy.trim()}"; POST …/shapes 403`;
    },
  },
]);

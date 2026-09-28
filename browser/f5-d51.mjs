// D-51, kept: equal runs across and down a non-square sheet read the same.
//
//   docker compose --profile browser run --rm browser node scripts/f5-d51.mjs
//
// The founder's standing check (2026-09-27), in the quick tier so every block runs it.
// A scale kept in page fractions read a run down a 1224 × 792 sheet 55% longer than the
// same run across it. A scale is feet per PDF point and every quantity is measured in
// points, in the api and in the browser (D-51).
//
// Two sheets, one landscape (1224 × 792 pt) and one portrait (792 × 1224 pt), both at
// 1/8" = 1'-0" (8 ft per inch, 1/9 ft per point). On each:
// - through the api, exact: a 360 pt run across and a 360 pt run down read 40.00 LF each,
//   and a 360 × 360 pt square reads 1,600.00 SF;
// - through the screen, as a person draws: a Linear run across and a Linear run down,
//   each 360 pt on the paper, read the same within 1%, and 40 LF within 1% (a click lands
//   on a pixel; the error this guards against was 55%).

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { armMeasure, sheetPoint } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F5 D-51 orientation");
const project = await makeProject(token, base, { name: "Orientation" });
const takeoff = `${base}/${project.uuid}/takeoff`;
const FEET_PER_PT = 8 / 72;
const RUN = 360; // points on the paper: 5 inches, 40 ft at 1/8" = 1'-0"
const PAGES = [
  { width: 1224, height: 792, label: "Landscape" },
  { width: 792, height: 1224, label: "Portrait" },
];
const sheets = {};

const tool = (page, label) => page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: label, exact: true });

async function item(sheet, name, type, vertices, shapeMeta = null) {
  const made = await apiCall(token, "POST", `${takeoff}/item`, {
    name, type, unit: type === "sf" ? "SF" : "LF", sheet_uuid: sheet.uuid,
    geometry: { geom_type: type, vertices_json: vertices, shape_meta: shapeMeta, client_uuid: crypto.randomUUID() },
  });
  expect(made.status === 201, `${name}: ${made.status} ${JSON.stringify(made.body)}`);
  return Number(made.body.effective_quantity);
}

const itemsOn = async (sheet) => (await apiCall(token, "GET", `${takeoff}/item?sheet_uuid=${sheet.uuid}`)).body;

/** Draw a two-point Linear run on screen and return its saved quantity. */
async function drawRun(page, sheet, from, to) {
  const before = new Set((await itemsOn(sheet)).map((i) => i.uuid));
  await armMeasure(page, "Linear");
  const a = await sheetPoint(page, ...from);
  await page.mouse.click(a.x, a.y);
  const b = await sheetPoint(page, ...to);
  await page.mouse.dblclick(b.x, b.y);
  const made = await waitFor(async () => (await itemsOn(sheet)).find((i) => !before.has(i.uuid)), "the drawn run to be saved", 10000);
  return Number(made.effective_quantity);
}

const near = (value, want, share) => Math.abs(value - want) <= want * share;

await run("f5-d51", [
  {
    title: "setup: a landscape and a portrait sheet, both at 1/8\" = 1'-0\"",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "Orientation.pdf", buffer: makePdf(PAGES), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Orientation.pdf"].uuid, [1, 2]]]);
      const prepared = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      for (const sheet of prepared) {
        const page = PAGES[sheet.page_number - 1];
        expect(Number(sheet.width_pt) === page.width && Number(sheet.height_pt) === page.height, `page ${sheet.page_number}: ${sheet.width_pt} × ${sheet.height_pt}`);
        const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, {
          feet_per_pt: FEET_PER_PT, label: `1/8" = 1'-0"`, unit: "ft",
        });
        expect(scaled.status === 200, `scale: ${scaled.status} ${JSON.stringify(scaled.body)}`);
        sheets[page.label] = { ...sheet, ...page };
      }
      return PAGES.map((p) => `${p.label} ${p.width} × ${p.height} pt`).join(" · ") + ` · 1/8" = 1'-0" on both`;
    },
  },
  ...PAGES.map(({ label }) => ({
    title: `${label}, through the api: 360 pt across and 360 pt down both read 40.00 LF; a 360 pt square reads 1,600.00 SF`,
    run: async () => {
      const s = sheets[label];
      const [w, h] = [RUN / s.width, RUN / s.height];
      const across = await item(s, `${label} across`, "lf", [[0.1, 0.5], [0.1 + w, 0.5]]);
      const down = await item(s, `${label} down`, "lf", [[0.5, 0.1], [0.5, 0.1 + h]]);
      const square = await item(s, `${label} square`, "sf", [[0.1, 0.1], [0.1 + w, 0.1], [0.1 + w, 0.1 + h], [0.1, 0.1 + h]], { closed: true });
      const want = RUN * FEET_PER_PT;
      expect(Math.abs(across - want) < 0.005 && Math.abs(down - want) < 0.005, `across ${across}, down ${down}, expected ${want} both`);
      expect(Math.abs(square - want * want) < 0.05, `square ${square} SF, expected ${want * want}`);
      return `across ${across.toFixed(2)} LF = down ${down.toFixed(2)} LF · square ${square.toFixed(2)} SF`;
    },
  })),
  ...PAGES.map(({ label }) => ({
    title: `${label}, through the screen: a Linear run drawn across and one drawn down, 360 pt each, read the same`,
    run: async ({ page }) => {
      const s = sheets[label];
      const [w, h] = [RUN / s.width, RUN / s.height];
      await signInAs(page, (await fixtureOwner()).email);
      await enterWorkspace(page, workspace.uuid);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${s.uuid}`);
      await page.locator('img[alt="Drawing sheet"]').waitFor({ timeout: 20000 });
      await page.getByText(`Scale: 1/8" = 1'-0"`).waitFor({ timeout: 20000 });
      const across = await drawRun(page, s, [0.2, 0.7], [0.2 + w, 0.7]);
      const down = await drawRun(page, s, [0.8, 0.2], [0.8, 0.2 + h]);
      const want = RUN * FEET_PER_PT;
      expect(near(across, down, 0.01), `across ${across} LF, down ${down} LF: ${(((down - across) / across) * 100).toFixed(1)}% apart`);
      expect(near(across, want, 0.01) && near(down, want, 0.01), `across ${across}, down ${down}, expected ${want} within 1%`);
      return `drawn: across ${across.toFixed(2)} LF, down ${down.toFixed(2)} LF (${(Math.abs(down - across) / across * 100).toFixed(2)}% apart; expected ${want.toFixed(2)})`;
    },
  })),
]);

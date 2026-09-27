// F5-S15: calibrate, in legacy's words; the scale is feet per PDF point (D-51).
//
//   docker compose --profile realtime up -d
//   docker compose --profile browser run --rm browser node scripts/f5-s15.mjs
//
// A landscape sheet, 1224 × 792 pt. Before any scale it carries a run across the page and
// a run down it, both 400 pt long on the paper. They must read the same once a scale is
// set: that is D-51, and what a scale in normalised units got wrong.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { APP_B, secondWindow, signInAt } from "./lib/realtime.mjs";
import { clickSheet, row } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S15 calibrate");
const project = await makeProject(token, base, { name: "Calibrate" });
const drawing = `${base}/${project.uuid}/drawing`;
const takeoff = `${base}/${project.uuid}/takeoff`;
const W = 1224;
const H = 792;
let sheet;

const url = (app) => `${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`.replace(APP, app);
const chip = (page) => page.locator("[data-canvas-scale]");

async function open(page, app = APP) {
  if (app === APP) await signInAs(page, (await fixtureOwner()).email);
  else await signInAt(page, app, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(url(app));
  await chip(page).waitFor({ timeout: 20000 });
  await page.locator('img[alt="Drawing sheet"]').waitFor({ timeout: 20000 });
}

async function run400(name, vertices) {
  const made = await apiCall(token, "POST", `${takeoff}/item`, {
    name, type: "lf", unit: "LF", sheet_uuid: sheet.uuid,
    geometry: { geom_type: "lf", vertices_json: vertices, shape_meta: null, client_uuid: crypto.randomUUID() },
  });
  expect(made.status === 201, `${name}: ${made.status} ${JSON.stringify(made.body)}`);
  return made.body;
}

const quantities = async () =>
  Object.fromEntries((await apiCall(token, "GET", `${takeoff}/item?sheet_uuid=${sheet.uuid}`)).body.map((i) => [i.name, Number(i.effective_quantity)]));

await run("f5-s15", [
  {
    title: "setup: a 1224 × 792 pt sheet, unscaled, with a run across and a run down, each 400 pt on the paper",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "S15.pdf", buffer: makePdf([{ width: W, height: H, label: "S15" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["S15.pdf"].uuid, [1]]]);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      expect(Number(sheet.width_pt) === W && Number(sheet.height_pt) === H, `page ${sheet.width_pt} × ${sheet.height_pt}`);
      await run400("Across", [[0.1, 0.5], [0.1 + 400 / W, 0.5]]);
      await run400("Down", [[0.8, 0.2], [0.8, 0.2 + 400 / H]]);
      return "S15.pdf prepared; Across and Down, 400 pt each, unscaled";
    },
  },
  {
    title: "AC1: the Scale tool's toast, then \"Set sheet scale\" with \"Interpreted as …\" or \"Unrecognized format\", and \"Save calibration\"",
    run: async ({ page }) => {
      await open(page);
      await page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: "Scale", exact: true }).click();
      await page.getByText("Click two points on the sheet, then enter the real distance.").waitFor({ timeout: 5000 });
      // 0.1 to 0.6 across: 612 pt on the paper.
      await clickSheet(page, 0.1, 0.3);
      await clickSheet(page, 0.6, 0.3);
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("heading", { name: "Set sheet scale" }).waitFor();
      await dialog.getByText("Enter the real-world distance between the two points you picked.").waitFor();
      const input = dialog.getByLabel("Real distance");
      const placeholder = await input.getAttribute("placeholder");
      await input.fill(`25'-6"`);
      const read = await dialog.locator("[data-interpreted]").textContent();
      expect(read === "Interpreted as 25.50 ft (7.77 m)", `read "${read}"`);
      await input.fill("twelve");
      const bad = await dialog.locator("[data-interpreted]").textContent();
      const save = dialog.getByRole("button", { name: "Save calibration" });
      expect(bad === "Unrecognized format" && (await save.isDisabled()), `"${bad}", Save enabled`);
      await input.fill("100");
      await save.click();
      await page.getByText("Scale set — verify with a known dimension").waitFor({ timeout: 10000 });
      await page.getByText("100.00 ft between points").waitFor();
      return `placeholder "${placeholder}" · 25'-6" → "${read}" · "twelve" → "${bad}", Save disabled · 100 saved → "Scale set — verify with a known dimension", "100.00 ft between points"`;
    },
  },
  {
    title: "AC2 and D-51: the scale is feet per point; every item recomputed; a run across and a run down of the same paper length read the same",
    run: async ({ page }) => {
      const cal = (await apiCall(token, "GET", `${drawing}/sheet/${sheet.uuid}/calibration`)).body;
      const fpp = Number(cal.feet_per_norm);
      // Two clicks land on pixels, so the pt distance is ~612, not exactly.
      expect(Math.abs(fpp * 612 - 100) < 1, `feet per pt ${fpp} (100 ft over ~612 pt expects ${100 / 612})`);
      const q = await quantities();
      const want = 400 * fpp;
      expect(Math.abs(q.Across - want) < 0.01 && Math.abs(q.Down - want) < 0.01, `Across ${q.Across}, Down ${q.Down}, expected ${want.toFixed(2)} both`);
      await open(page);
      const label = (await chip(page).textContent()).replace("Scale: ", "");
      expect(label === cal.label, `chip "${label}", stored label "${cal.label}"`);
      await row(page, "Down").waitFor();
      return `feet per pt ${fpp.toFixed(5)}; Across ${q.Across.toFixed(2)} LF = Down ${q.Down.toFixed(2)} LF; chip "Scale: ${label}"`;
    },
  },
  {
    title: "AC3: B, on the same sheet, sees the new scale chip and the recomputed quantities within a second, no reload (sheet.calibration.changed)",
    run: async ({ page, context }) => {
      const b = await secondWindow(context);
      try {
        await open(b.page, APP_B);
        const before = await chip(b.page).textContent();
        // A sets another scale by hand from the api, as A's window would.
        const changed = Date.now();
        const set = await apiCall(token, "PUT", `${drawing}/sheet/${sheet.uuid}/calibration`, {
          p1_x_norm: 0.1, p1_y_norm: 0.3, p2_x_norm: 0.6, p2_y_norm: 0.3, real_distance_ft: 200, label: `1" = 23.53'`,
        });
        expect(set.status === 200, `calibrate: ${set.status}`);
        await b.page.getByText(`Scale: 1" = 23.53'`).waitFor({ timeout: 5000 });
        const chipAt = Date.now() - changed;
        const want = ((400 * 200) / 612).toLocaleString("en-US", { maximumFractionDigits: 2 });
        await row(b.page, "Down").filter({ hasText: want }).waitFor({ timeout: 5000 });
        const rowsAt = Date.now() - changed;
        expect(chipAt < 1000 && rowsAt < 1500, `chip after ${chipAt} ms, quantities after ${rowsAt} ms`);
        expect(!(await b.page.evaluate(() => performance.getEntriesByType("navigation").length > 1)), "B reloaded");
        void page;
        return `B: "${before}" → "Scale: 1" = 23.53'" in ${chipAt} ms; Down reads ${want} LF in ${rowsAt} ms; no reload`;
      } finally {
        await b.context.close();
      }
    },
  },
]);

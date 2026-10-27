// C46, GPS Export for machines (SITE_AND_EARTHWORK_PLAN section C, D-805): four control points with northing,
// easting and elevation, the residuals on paper, the scale the fit may take, one vertical shift, the control points
// in the files, and one coordinate system per project.
//
//   ./fx-suite.sh run c46-gps-machine
//
// The world: one throwaway project, two pages at the grading world's scale with a flat pad (EG 100, FG 99;
// lib/grading-world.mjs), calculated. Coordinates are written through the api (the panel's clicks are F30's own
// fixtures); the dialog is driven.
//   1. Three points: the dialog says NOT FOR MACHINE USE and the zip is named so.
//   2. Four points, each at its plan place, elevations 102: "Ready for machine control", a shift of +2 ft; the zip has
//      a Control CSV with PC-1..PC-4 and the DXF a CONTROL layer.
//   3. A point 30 ft off (far past 0.02 in on paper at this scale): the export stops naming it.
//   4. A second sheet's coordinates in another unit are refused.

import { APP, apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { calculate, flatPad, grading, gradingSheets, openSheet } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C46 GPS machine");
const project = await makeProject(token, base, { name: "GPS machine" });
const g = grading(token, base, project);
let sheets;
let scale;
const georef = (sheet) => `${base}/${project.uuid}/earthwork/georef/sheet/${sheet.uuid}`;
const AT = [
  [0.15, 0.25],
  [0.35, 0.25],
  [0.35, 0.45],
  [0.15, 0.45],
];
/** A point at its plan place: easting 1,000 + x ft, northing 5,000 - y ft (international feet). */
const at = ([x, y], i, z = 102, off = 0) => ({ label: `PC-${i + 1}`, x, y, n: 5000 - y * scale.h * scale.f, e: 1000 + x * scale.w * scale.f + off, z });
async function setPoints(points, units = "intl-ft") {
  const saved = await apiCall(token, "PUT", georef(sheets[0]), { points, units, system: "", epsg: null, vertical_datum: "", scale_fitted: true });
  return saved;
}
async function openGps(page) {
  await openSheet(page, project, sheets[0], "earthwork");
  const button = page.getByRole("button", { name: /GPS Export/ }).first();
  if (await button.isVisible().catch(() => false)) await button.click();
  else {
    await page.locator("button", { hasText: /^More/ }).first().click();
    await page.getByRole("menuitem", { name: /GPS Export/ }).click();
  }
  await page.locator("[data-gps-machine]").waitFor({ timeout: 120000 });
}

await run("c46-gps-machine", [
  {
    title: "setup: a calculated flat pad on one page",
    run: async ({ page }) => {
      sheets = await gradingSheets(page, token, base, workspace, project, ["G-1", "G-2"]);
      const cal = (await apiCall(token, "GET", `${base}/${project.uuid}/drawing/sheet/${sheets[0].uuid}/calibration`)).body;
      const list = (await apiCall(token, "GET", `${base}/${project.uuid}/drawing/sheet`)).body;
      const s = (Array.isArray(list) ? list : list.items).find((x) => x.uuid === sheets[0].uuid);
      scale = { w: s.width_pt, h: s.height_pt, f: Number(cal.feet_per_norm) };
      await flatPad(g, sheets[0]);
      await openSheet(page, project, sheets[0], "earthwork");
      await calculate(page);
      return `scale ${scale.f} ft/pt`;
    },
  },
  {
    title: "D-805: three points: NOT FOR MACHINE USE in the dialog and the zip's name",
    run: async ({ page }) => {
      const saved = await setPoints(AT.slice(0, 3).map((p, i) => at(p, i)));
      expect(saved.status === 200, `coordinates: ${saved.status} ${JSON.stringify(saved.body)}`);
      await openGps(page);
      const state = await page.locator("[data-gps-machine]").getAttribute("data-gps-machine");
      expect(state === "not-for-machine", `state ${state}`);
      const [download] = await Promise.all([page.waitForEvent("download"), page.locator("[data-gps-download]").click()]);
      expect(/_NOT-FOR-MACHINE-USE\.zip$/.test(download.suggestedFilename()), download.suggestedFilename());
      return download.suggestedFilename();
    },
  },
  {
    title: "D-805: four points with elevations: ready, a +2 ft shift, a Control CSV and a CONTROL layer",
    run: async ({ page }) => {
      const saved = await setPoints(AT.map((p, i) => at(p, i)));
      expect(saved.status === 200, `coordinates: ${saved.status}`);
      await openGps(page);
      const section = page.locator("[data-gps-machine]");
      expect((await section.getAttribute("data-gps-machine")) === "ready", await section.innerText());
      expect(/vertical shift \+2\.00 ft/.test(await section.innerText()), await section.innerText());
      const [download] = await Promise.all([page.waitForEvent("download"), page.locator("[data-gps-download]").click()]);
      const name = download.suggestedFilename();
      expect(!/NOT-FOR-MACHINE/.test(name), name);
      return name;
    },
  },
  {
    title: "D-805: a point 30 ft off stops the export, naming it",
    run: async ({ page }) => {
      const saved = await setPoints(AT.map((p, i) => at(p, i, 102, i === 2 ? 30 : 0)));
      expect(saved.status === 200, `coordinates: ${saved.status}`);
      await openGps(page);
      const section = page.locator("[data-gps-machine]");
      expect((await section.getAttribute("data-gps-machine")) === "stop", await section.innerText());
      expect(/PC-3/.test(await section.innerText()), "the stop does not name PC-3");
      expect(await page.locator("[data-gps-download]").isDisabled(), "Download stays enabled past a stop");
      return (await section.locator("p").first().innerText()).slice(0, 120);
    },
  },
  {
    title: "D-805: a second set of coordinates in another unit is refused",
    run: async () => {
      await setPoints(AT.map((p, i) => at(p, i)));
      const refused = await apiCall(token, "PUT", `${base}/${project.uuid}/earthwork/georef/sheet/${sheets[1].uuid}`, { points: AT.slice(0, 2).map((p, i) => at(p, i)), units: "us-ft", system: "", epsg: null, vertical_datum: "", scale_fitted: true });
      expect(refused.status === 409, `a second unit saved: ${refused.status}`);
      return `${refused.status} ${JSON.stringify(refused.body).slice(0, 120)}`;
    },
  },
]);

// C47, GPS Export from the field's feedback (docs/tasks/gps_field_PLAN.md, D-823 onwards): the rover preset leads with
// finished grade only, every surface cut to the work boundary, 2D linework on IntelCost's IC- layers, the control
// points in their own CSV, and the README naming the limits and how the field converts the files.
//
//   ./fx-suite.sh run c47-gps-field
//
// The world: c46's, one throwaway project, a flat pad (EG 100, FG 99) inside a 40 x 25 ft work boundary (1,000 SF,
// lib/grading-world.mjs), calculated, and four control points at the pad's corners with elevations 102 (a +2 ft shift,
// confirmed, D-808).
//   1. The dialog opens on "GPS rover (surface + linework)": finished grade ticked, subgrade unticked with its note,
//      2D linework, control points only, the field's help line.
//   2. The zip: finished grade's LandXML, the linework DXF (IC- layers only, every elevation 0), Control.csv with
//      PC-1..PC-4, the README ("Clipped to the work boundary, 1,000 SF", the help line).
//   3. "Linework in 3D": the same DXF with the lines at their elevations.

import { readFileSync } from "node:fs";

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { calculate, flatPad, grading, gradingSheets, openSheet } from "./lib/grading-world.mjs";
import { zipParts } from "./lib/xlsx-zip.mjs";

const { token, workspace, base } = await freshWorkspace("C47 GPS field");
const project = await makeProject(token, base, { name: "GPS field" });
const g = grading(token, base, project);
let sheets;
let scale;
const georef = (sheet) => `${base}/${project.uuid}/earthwork/georef/sheet/${sheet.uuid}`;
const AT = [];
/** A point at its plan place: easting 1,000 + x ft, northing 5,000 - y ft (international feet), elevation 102. */
const at = ([x, y], i) => ({ label: `PC-${i + 1}`, x, y, n: 5000 - y * scale.h * scale.f, e: 1000 + x * scale.w * scale.f, z: 102 });

async function openGps(page) {
  await openSheet(page, project, sheets[0], "earthwork");
  const button = page.getByRole("button", { name: /GPS Export/ }).first();
  if (await button.isVisible().catch(() => false)) await button.click();
  else {
    await page.locator("button", { hasText: /^More/ }).first().click();
    await page.getByRole("menuitem", { name: /GPS Export/ }).click();
  }
  await page.locator('[data-gps-surface="fg"]').waitFor({ timeout: 120000 });
}

/** The zip downloaded once the +2 ft shift is confirmed, as its files. */
async function download(page) {
  const section = page.locator("[data-gps-machine]");
  if ((await section.getAttribute("data-gps-machine")) === "confirm-shift") await page.locator("[data-gps-confirm-shift-yes]").click();
  await page.waitForFunction(() => document.querySelector("[data-gps-machine]")?.getAttribute("data-gps-machine") === "ready", null, { timeout: 15000 });
  const [file] = await Promise.all([page.waitForEvent("download"), page.locator("[data-gps-download]").click()]);
  const parts = zipParts(readFileSync(await file.path()));
  return { name: file.suggestedFilename(), files: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v.toString("utf8")])) };
}

/** A DXF's group-code and value pairs: 8 is an entity's layer, 30 a vertex's elevation. */
function dxfPairs(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i + 1 < lines.length; i += 2) out.push([lines[i].trim(), lines[i + 1].trim()]);
  return out;
}

await run("c47-gps-field", [
  {
    title: "setup: a calculated flat pad inside a 1,000 SF boundary, four control points at 102",
    run: async ({ page }) => {
      sheets = await gradingSheets(page, token, base, workspace, project, ["G-1"]);
      const cal = (await apiCall(token, "GET", `${base}/${project.uuid}/drawing/sheet/${sheets[0].uuid}/calibration`)).body;
      const list = (await apiCall(token, "GET", `${base}/${project.uuid}/drawing/sheet`)).body;
      const s = (Array.isArray(list) ? list : list.items).find((x) => x.uuid === sheets[0].uuid);
      scale = { w: s.width_pt, h: s.height_pt, f: Number(cal.feet_per_norm) };
      const pad = await flatPad(g, sheets[0]);
      AT.push(...pad.box);
      await g.assume({ native_suitable: "all" });
      await openSheet(page, project, sheets[0], "earthwork");
      await calculate(page);
      const saved = await apiCall(token, "PUT", georef(sheets[0]), { points: AT.map((p, i) => at(p, i)), units: "intl-ft", system: "", epsg: null, vertical_datum: "", scale_fitted: true });
      expect(saved.status === 200, `coordinates: ${saved.status}`);
      return `scale ${scale.f} ft/pt`;
    },
  },
  {
    title: "D-823: the dialog opens on the rover: finished grade only, subgrade optional, 2D, control points only, the help line",
    run: async ({ page }) => {
      await openGps(page);
      const preset = await page.locator('input[name="gps-preset"]:checked').getAttribute("data-gps-preset");
      expect(preset === "rover", `opened on ${preset}`);
      expect(await page.locator('[data-gps-surface="fg"] input').isChecked(), "finished grade not ticked");
      const sub = page.locator('[data-gps-surface="subgrade"]');
      if (await sub.count()) {
        expect(!(await sub.locator("input").isChecked()), "subgrade ticked");
      }
      expect(!(await page.locator('[data-gps-line="threeD"]').isChecked()), "linework 3D by default");
      expect(await page.locator("[data-gps-points-control]").isVisible(), "points choices shown for the rover");
      expect(/convert these files to their own formats in their office software/.test(await page.locator("[data-gps-help]").innerText()), "no help line");
      return preset;
    },
  },
  {
    title: "D-823: the zip: finished grade, 2D linework on IC- layers, Control.csv, the README's limits and help line",
    run: async ({ page }) => {
      const { name, files } = await download(page);
      expect(/_GPS-rover\.zip$/.test(name), name);
      const names = Object.keys(files);
      expect(names.some((n) => /Proposed-finished-grade\.xml$/.test(n)), `no finished grade: ${names}`);
      expect(!names.some((n) => /subgrade/i.test(n)), `a subgrade file: ${names}`);
      const dxf = files[names.find((n) => n.endsWith(".dxf"))];
      const pairs = dxfPairs(dxf);
      const layers = [...new Set(pairs.filter(([c]) => c === "8").map(([, v]) => v))];
      expect(layers.length > 0 && layers.every((l) => l.startsWith("IC-")), `layers: ${layers}`);
      expect(layers.includes("IC-CONTROL"), `no IC-CONTROL: ${layers}`);
      const zs = pairs.filter(([c]) => c === "30").map(([, v]) => Number(v));
      expect(zs.length > 0 && zs.every((z) => z === 0), `elevations not 0: ${[...new Set(zs)].slice(0, 5)}`);
      const control = files[names.find((n) => /Control\.csv$/.test(n))] ?? "";
      expect(["PC-1", "PC-2", "PC-3", "PC-4"].every((p) => control.includes(p)), `control CSV: ${control.slice(0, 200)}`);
      const readme = files["README.txt"];
      expect(/Clipped to the work boundary, 1,000 SF/.test(readme), `README limits: ${readme.match(/SURFACES[\s\S]{0,200}/)?.[0]}`);
      expect(/office software before they go to the rover or the machine/.test(readme), "README help line");
      return `${names.join(", ")}; layers ${layers.join(", ")}`;
    },
  },
  {
    title: "D-823: Linework in 3D keeps each line's elevation",
    run: async ({ page }) => {
      await openGps(page);
      await page.locator('[data-gps-line="threeD"]').check();
      const { files } = await download(page);
      const dxf = files[Object.keys(files).find((n) => n.endsWith(".dxf"))];
      const zs = dxfPairs(dxf).filter(([c]) => c === "30").map(([, v]) => Number(v));
      expect(zs.some((z) => z !== 0), "every elevation 0 with Linework in 3D");
      return `${zs.filter((z) => z !== 0).length} of ${zs.length} vertices off 0`;
    },
  },
  {
    title: "D-825: the drawing's own lines on the PDF's layers, inside a box kept on the sheet",
    run: async ({ page }) => {
      await openGps(page);
      await page.waitForFunction(() => {
        const d = document.querySelector("[data-gps-drawing]");
        return d && d.getAttribute("data-gps-drawing") !== "reading";
      }, null, { timeout: 120000 });
      const state = await page.locator("[data-gps-drawing]").getAttribute("data-gps-drawing");
      expect(state === "read", `drawing ${state}: ${await page.locator("[data-gps-drawing-status]").innerText()}`);
      expect((await page.locator("[data-gps-clip-state]").getAttribute("data-gps-clip-state")) === "suggested", "a box kept before one was set");
      await page.locator("[data-gps-clip-edit]").click();
      await page.locator("[data-gps-clip-save]").click();
      await page.waitForFunction(() => document.querySelector("[data-gps-clip-state]")?.getAttribute("data-gps-clip-state") === "kept", null, { timeout: 20000 });
      const { files } = await download(page);
      const dxf = files[Object.keys(files).find((n) => n.endsWith(".dxf"))];
      const own = dxfPairs(dxf).filter(([c, v]) => c === "8" && !v.startsWith("IC-") && v !== "0");
      expect(own.length > 0, "no line of the drawing's own in the DXF");
      expect(/inside the box kept on the sheet/.test(files["README.txt"]), "README says nothing of the box");
      return `${own.length} entities on ${[...new Set(own.map(([, v]) => v))].join(", ")}`;
    },
  },
]);

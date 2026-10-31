// Click check C17 (docs/tasks/pending_umer.md): Earthwork end to end on a grading sheet: contours
// and spots, the boundary, Site Features, Strip Areas, Calculate, the estimate lines; and from
// D-292 to D-297 the elevation check, the breakdown's details, Net in words, "Compare without
// topsoil strip" and the uncovered shading.
//
//   node fx-run-locked.mjs c17-earthwork
//
// The world: one throwaway project, two pages at 1/6 ft per point (lib/grading-world.mjs).
// C-1 (richPad): a 40 × 25 ft boundary; EG spots at 100 and FG at 99 on a ring 20 ft out and in the
//   middle; one EG contour at 100 and one FG contour at 99 outside the boundary; one EG spot at 130
//   40 ft past the ring (the elevation check's outlier, outside the volumes); "Building Pad", a
//   10 × 10 ft Site Feature (subgrade 0.5 ft under FG, undercut 1 ft, Engineered Fill); a Strip
//   Area over the boundary, 6", hauled off. By hand: strip 1,000 SF × 0.5 ft = 18.52 CY; cut from
//   the stripped EG 900 SF × 0.5 + 100 SF × 1.0 = 550 CF = 20.37 CY; without the strip
//   900 × 1 + 100 × 1.5 = 1,050 CF = 38.89 CY; undercut 100 CF = 3.70 CY; no fill.
// C-2: the same boundary and EG ring, FG spots only over the boundary's left 20 ft: coverage
//   50.0 %, 500 SF of proposed grade missing, cut 500 CF = 18.52 CY.
//
// Left for the founder's eye: drawing contours, spots, the boundary, a Site Feature and a Strip
// Area by hand (the fixture writes them through the api, as the tools do); Auto Trace (needs a
// real contour drawing, and its feel); the look of the TIN, the cut and fill map, the strip
// hatch and the uncovered shading; the panel's layout; the grading report's pictures.

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { calculate, flatPad, fx, fy, grading, gradingSheets, num, openSheet, rect, richPad, storedLines } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C17 Earthwork");
const project = await makeProject(token, base, { name: "Earthwork check" });
const g = grading(token, base, project);
let c1;
let c2;
let world;
let lines = [];

const CY = (cf) => cf / 27;
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const text = async (loc) => ((await loc.textContent()) ?? "").replace(/\s+/g, " ").trim();
const q = (i) => Number(i.effective_quantity ?? i.quantity ?? 0);

/** The sheet's stored result, once the api has it (saved a moment after the panel shows). */
const storedResult = (sheet) => waitFor(async () => (await g.results()).find((x) => x.sheet_uuid === sheet.uuid)?.result, "the stored result", 30000, 500);

/** Calculate on a sheet, the panel open after it. */
async function calculated(page, sheet) {
  await openSheet(page, project, sheet, "earthwork");
  return calculate(page);
}

await run("c17-earthwork", [
  {
    title: "setup: C-1 with spots, contours, the boundary, a Site Feature and a Strip Area; C-2 with proposed grade over half the boundary",
    run: async ({ page }) => {
      [c1, c2] = await gradingSheets(page, token, base, workspace, project, ["C-1", "C-2"]);
      // C-1 numbered "G1", so the elevation warning's sheet name can be told from "Page 1" (N9, D-659).
      const numbered = await apiCall(token, "PATCH", `${base}/${project.uuid}/drawing/sheet/${c1.uuid}`, { sheet_number: "G1" });
      expect(numbered.status === 200, `numbering C-1: ${numbered.status}`);
      world = await richPad(g, c1);
      // C-2: the EG ring as on C-1; FG spots on a ring that ends at the boundary's middle.
      const [x0, y0] = [0.1, 0.2];
      await g.boundary(c2, rect(x0, y0, 40, 25));
      await g.spots(c2, "EG", [...rect(x0 - fx(20), y0 - fy(20), 80, 65), [x0 + fx(20), y0 + fy(12.5)]].map(([x, y]) => [x, y, 100]));
      await g.spots(c2, "FG", rect(x0 - fx(20), y0 - fy(20), 40, 65).map(([x, y]) => [x, y, 99]));
      await g.assume();
      void flatPad;
      return `C-1 ${c1.uuid}, C-2 ${c2.uuid}; Site Feature ${world.feature.name}, Strip ${world.strip.name} ${world.strip.depth_ft} ft`;
    },
  },
  {
    title: "the inputs in the Takeoff panel: contours, spots, the boundary and the Site Feature, each with its summary; the strip drawn on the sheet; Site Features and Stripping in the toolbar",
    run: async ({ page }) => {
      await openSheet(page, project, c1, "earthwork");
      const want = [
        [world.egContour, /1 contour/],
        [world.fgContour, /1 contour/],
        [world.eg, /6 spots/],
        [world.fg, /5 spots/],
        [world.boundary, /1 region/],
      ];
      const seen = [];
      for (const [item, summary] of want) {
        const row = page.locator(`li[data-item-row="${item.uuid}"] > [role=row]`).first();
        await row.waitFor({ timeout: 20000 });
        const s = await text(row.locator("[data-item-qty]"));
        expect(summary.test(s), `${item.name}: "${s}"`);
        seen.push(`${item.name} ${s}`);
      }
      const feature = page.locator(`li[data-item-row="${world.feature.uuid}"] > [role=row]`).first();
      await feature.waitFor({ timeout: 10000 });
      const fq = await text(feature.locator("[data-item-qty]"));
      seen.push(`${world.feature.name} ${fq}`);
      await page.locator(`[data-strip-layer] [data-strip-area="${world.strip.uuid}"]`).waitFor({ state: "attached", timeout: 15000 });
      for (const t of ["Site Features —", "Stripping —"]) {
        const b = page.locator(`button[title^="${t}"]`);
        expect((await b.count()) > 0, `no "${t.replace(" —", "")}" button in the earthwork bar`);
      }
      return `${seen.join(" · ")}; the strip drawn; Site Features and Stripping in the bar`;
    },
  },
  {
    title: "Calculate C-1: Cut 20 BCY, Fill 0; Net in words; one elevation warning naming the EG spot; the stored figures match the hand-worked ones",
    run: async ({ page }) => {
      const panel = await calculated(page, c1);
      const cut = await text(panel.locator('[data-volume="cut"]'));
      const fill = await text(panel.locator('[data-volume="fill"]'));
      const direction = await text(panel.locator("[data-volume-direction]"));
      const shrink = (await panel.locator("[data-volume-after-shrink]").count()) ? await text(panel.locator("[data-volume-after-shrink]")) : "";
      const exportLine = (await panel.locator("[data-volume-export]").count()) ? await text(panel.locator("[data-volume-export]")) : "";
      const r = await storedResult(c1);
      const facts = `panel Cut ${cut}, Fill ${fill}; "${direction}"; "${shrink}"; "${exportLine}"; stored cut ${r?.cutCY?.toFixed(2)} fill ${r?.fillCY?.toFixed(2)} strip ${r?.strip?.volumeCY?.toFixed(2)} stripAreas ${JSON.stringify(r?.stripAreas?.map((s) => s.volumeCY.toFixed(2)))} withoutStrip ${r?.withoutStrip?.cutCY?.toFixed(2)} coverage ${r?.coverage}`;
      expect(r, `no stored result for C-1: ${facts}`);
      expect(near(r.cutCY, CY(550)) && near(r.fillCY, 0), `cut and fill: ${facts}`);
      expect(cut === "20" && fill === "0", `the panel: ${facts}`);
      expect(direction.includes("20 CY more cut than fill"), `Net in words: ${facts}`);
      const warnings = panel.locator("[data-elevation-warnings]");
      await warnings.waitFor({ timeout: 5000 });
      const count = await text(warnings.locator("[data-elevation-warning-count]"));
      expect(count === "1 elevation warning", `elevation check: "${count}"`);
      if ((await warnings.locator("[data-elevation-warning]").count()) === 0) await warnings.getByRole("button").first().click();
      const warning = await text(warnings.locator("[data-elevation-warning]").first());
      // The warning names the sheet as the Sheets panel does (N9, D-659): it said "Page 1" where the
      // panel said "G1".
      const row = (await page.locator(`[data-sheet-row="${c1.uuid}"]`).first().innerText()).replace(/\s+/g, " ").trim();
      const named = warning.split(" · ")[0].trim();
      expect(named.startsWith("G1") && row.startsWith(named), `the warning names the sheet "${named}"; its Sheets panel row reads "${row}"`);
      expect(/EG spot/.test(warning) && /130/.test(warning) && /100/.test(warning), `the warning reads "${warning}"`);
      return `${facts}; ${count}: "${warning}"`;
    },
  },
  {
    title: "the breakdown: Building Pad and Remaining Site; Details shows area, average EG and FG, depth, strip, cut and fill for each",
    run: async ({ page }) => {
      const panel = await calculated(page, c1);
      const details = panel.locator("[data-volume-details]");
      await details.waitFor({ timeout: 5000 });
      await details.click();
      const table = panel.locator("[data-region-details]");
      await table.waitFor({ timeout: 5000 });
      const rows = await table.locator("tbody tr").evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => (td.textContent ?? "").replace(/\s+/g, " ").trim())));
      const pad = rows.find((r) => r[0] === "Building Pad");
      const rest = rows.find((r) => r[0] === "Remaining Site");
      expect(pad && rest, `regions: ${JSON.stringify(rows)}`);
      // Region, Area, Avg existing, Avg proposed, Depth, Strip, Cut, Fill.
      expect(pad[1] === "100 SF" && rest[1] === "900 SF", `areas: ${JSON.stringify(rows)}`);
      expect(/^100(\.0+)?/.test(pad[2]) && /^99(\.0+)?/.test(pad[3]) && /^100(\.0+)?/.test(rest[2]) && /^99(\.0+)?/.test(rest[3]), `averages: ${JSON.stringify(rows)}`);
      expect(pad[5] === '6"' && rest[5] === '6"', `strip: ${JSON.stringify(rows)}`);
      // Cut by hand: the pad 100 SF × 1.0 ft = 3.70 CY, the rest 900 SF × 0.5 ft = 16.67 CY; no fill.
      expect(pad[6] === "4" && rest[6] === "17" && pad[7] === "0" && rest[7] === "0", `cut and fill: ${JSON.stringify(rows)}`);
      return rows.map((r) => r.join(" | ")).join(" ;; ");
    },
  },
  {
    title: "Compare without topsoil strip: ticked, the comparison reads Cut 39 without the strip beside 20 saved; the saved figures stay",
    run: async ({ page }) => {
      const panel = await calculated(page, c1);
      const box = panel.locator("[data-volume-compare] input[type=checkbox]");
      await box.waitFor({ timeout: 5000 });
      if (!(await box.isChecked())) await box.check();
      const table = panel.locator("[data-volume-compare-table]");
      await table.waitFor({ timeout: 10000 });
      const without = await text(table.locator('[data-compare-value="cut"]'));
      const saved = await text(panel.locator('[data-volume="cut"]'));
      const said = await text(table);
      expect(without === "39" && saved === "20", `compare: without ${without}, saved ${saved}; "${said}"`);
      await box.uncheck();
      await table.waitFor({ state: "detached", timeout: 5000 });
      return `without strip ${without} CY, saved ${saved} CY; "${said.slice(0, 160)}"`;
    },
  },
  {
    title: "the estimate lines: Calculate wrote the strip, the cut, the undercut and its replacement, and the soil export; the figures match by hand",
    run: async () => {
      lines = await storedLines(g, c1, waitFor);
      await waitFor(async () => {
        const again = (await g.items()).filter((i) => i.source_type === "earthwork_computed" && i.sheet_uuid === c1.uuid);
        const same = again.length === lines.length;
        lines = again;
        return same;
      }, "the lines to settle", 15000, 1000);
      const listed = lines.map((l) => `${l.name} = ${q(l).toFixed(2)} ${l.unit}`);
      const find = (re) => lines.find((l) => re.test(l.name));
      // Named by the work since D-768 (the feature is its own field): "Strip topsoil (6\")", "Cut" on the site
      // and on the pad, "Undercut excavation (12\")", "Undercut replacement fill, Engineered Fill".
      const strip = find(/^Strip topsoil \(/);
      const cuts = lines.filter((l) => l.name === "Cut");
      const undercut = find(/^Undercut excavation/);
      const replacement = find(/^Undercut replacement/);
      const exportLine = find(/^Soil Export/);
      expect(strip && near(q(strip), CY(500)), `strip line: ${listed.join(" · ")}`);
      expect(cuts.length > 0 && near(cuts.reduce((t, l) => t + q(l), 0), CY(550)), `cut lines: ${listed.join(" · ")}`);
      expect(undercut && near(q(undercut), CY(100)), `undercut line: ${listed.join(" · ")}`);
      expect(replacement, `no undercut replacement line: ${listed.join(" · ")}`);
      expect(exportLine, `no soil export line: ${listed.join(" · ")}`);
      expect(lines.every((l) => !l.is_stale), "a fresh line is stale");
      return listed.join(" · ");
    },
  },
  {
    title: "the estimate lines in Estimating: one row each, with Calculate's quantity",
    run: async ({ page }) => {
      await openSheet(page, project, c1, "estimating");
      await page.locator("tr[data-estimate-row]").first().waitFor({ timeout: 30000 });
      const out = [];
      // Two lines may share a name since D-768 (Cut on the site and on the pad): each line takes its own row of
      // that name, the one carrying its quantity.
      const taken = new Map();
      for (const l of lines) {
        const row = page.locator(`tr[data-estimate-row="${l.name.replace(/"/g, '\\"')}"]`);
        await row.first().waitFor({ timeout: 10000 }).catch(async () => {
          const shown = await page.locator("tr[data-estimate-row]").evaluateAll((rows) => rows.map((r) => r.getAttribute("data-estimate-row")));
          throw new Error(`no Estimating row for "${l.name}"; rows: ${shown.join(" | ")}`);
        });
        const used = taken.get(l.name) ?? new Set();
        const want = q(l).toFixed(2);
        const seen = [];
        let hit = -1;
        for (let i = 0; i < (await row.count()) && hit < 0; i++) {
          if (used.has(i)) continue;
          const cells = await row.nth(i).locator("td").allTextContents();
          seen.push(cells.map((c) => c.trim()).filter(Boolean).join(" | "));
          // The grid's Qty rounds to nearest (D-885).
          if (cells.some((c) => near(num(c), Math.round(q(l)), 0.006))) hit = i;
        }
        expect(hit >= 0, `"${l.name}" rows: ${seen.join(" / ")} (want ${Math.round(q(l))} from ${want})`);
        used.add(hit);
        taken.set(l.name, used);
        out.push(`${l.name} ${want}`);
      }
      expect(out.length === lines.length, `${out.length} rows for ${lines.length} lines`);
      return `${out.length} rows: ${out.join(" · ")}`;
    },
  },
  {
    title: "C-2, uncovered: Calculate says Coverage 50.0 % of the boundary, proposed grade missing 500 SF, cut 19 BCY; the shading is on the sheet, off and on again with its tick",
    run: async ({ page }) => {
      const panel = await calculated(page, c2);
      const r = await storedResult(c2);
      const cov = panel.locator("[data-volume-coverage]");
      await cov.waitFor({ timeout: 10000 });
      const said = await text(cov);
      expect(/Coverage 50\.0 % of the boundary/.test(said), `coverage: "${said}" (stored ${r?.coverage})`);
      const fg = await text(cov.locator('[data-coverage-row="fg"]'));
      expect(/Proposed grade missing\s*500 SF/.test(fg), `the missing row: "${fg}"`);
      const cut = await text(panel.locator('[data-volume="cut"]'));
      expect(cut === "19" && near(r.cutCY, CY(500)), `cut ${cut}, stored ${r?.cutCY}`);
      const chip = (await panel.locator("[data-coverage-chip]").count()) ? await text(panel.locator("[data-coverage-chip]")) : "none";
      const layer = page.locator('[data-coverage-layer] [data-coverage="fg"]');
      await layer.waitFor({ state: "attached", timeout: 10000 });
      const shade = cov.getByRole("checkbox");
      await shade.uncheck();
      await layer.waitFor({ state: "detached", timeout: 5000 });
      await shade.check();
      await layer.waitFor({ state: "attached", timeout: 5000 });
      return `"${said.slice(0, 140)}"; warning chip ${chip}; cut ${cut}; shading on, off, on`;
    },
  },
]);

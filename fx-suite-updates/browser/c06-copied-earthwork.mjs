// Click check C6 (docs/tasks/pending_umer.md): a copied project's earthwork reads as current
// (D-354). Duplicate a project whose grading sheet has been Calculated; open the copy's grading
// sheet: no line says "Needs recalculating", the grading report says nothing is out of date, and
// Estimating flags no calculated line.
//
//   node fx-run-locked.mjs c06-copied-earthwork
//
// The world (lib/grading-world.mjs richPad): a 40 × 25 ft boundary, EG and FG spots and contours,
// one outlying EG spot, a Site Feature with an undercut, a Strip Area over the boundary; Calculated
// in the browser, so its lines and its stored result are the app's own. The copy is made by the
// api's Duplicate project job, the same one All projects' menu runs (C3 drives the menu itself).
//
// Left for the founder's eye: the same on a copy of a big real grading sheet (Marketing Demo –
// Site), where linked survey sheets and sites also take part.

import { expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { calculate, duplicateProject, grading, gradingSheets, openSheet, richPad, storedLines } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C6 Copied earthwork");
const project = await makeProject(token, base, { name: "Grading source" });
const g = grading(token, base, project);
let sheet;
let lines = [];
let copy;
let gc;
let copySheet;

/** Every "Needs recalculating" the page shows: the rows' marks, text, Estimating's flags. */
async function staleMarks(page) {
  return {
    rowMarks: await page.locator('[aria-label="Needs recalculating"]').count(),
    text: await page.getByText("Needs recalculating").count(),
    flags: await page.locator('[data-calc-flag="stale"]').count(),
  };
}

await run("c06-copied-earthwork", [
  {
    title: "setup: the grading sheet (boundary, spots, contours, Site Feature, Strip Area), the assumptions saved",
    run: async ({ page }) => {
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["C-1"]);
      await richPad(g, sheet);
      await g.assume();
      return `sheet ${sheet.uuid}`;
    },
  },
  {
    title: "Calculate the original in the Earthwork tab: the api holds its result and lines, none stale",
    run: async ({ page }) => {
      await openSheet(page, project, sheet, "earthwork");
      await calculate(page);
      lines = await storedLines(g, sheet, waitFor);
      // Lines are written a moment after the result: wait until the set stops growing.
      await waitFor(async () => {
        const again = (await g.items()).filter((i) => i.source_type === "earthwork_computed" && i.sheet_uuid === sheet.uuid);
        const same = again.length === lines.length;
        lines = again;
        return same;
      }, "the lines to settle", 15000, 1000);
      const stale = lines.filter((l) => l.is_stale);
      expect(stale.length === 0, `stale in the original: ${stale.map((l) => l.name).join(", ")}`);
      return `${lines.length} lines: ${lines.map((l) => l.name).join(" · ")}`;
    },
  },
  {
    title: "Duplicate project (the api's job): the copy has the same calculated lines, none stale, and a stored result for its sheet",
    run: async () => {
      const uuid = await duplicateProject(token, base, project.uuid, waitFor);
      copy = { uuid };
      gc = grading(token, base, copy);
      const items = await gc.items();
      const copied = items.filter((i) => i.source_type === "earthwork_computed");
      expect(copied.length === lines.length, `copy has ${copied.length} lines, the original ${lines.length}: ${copied.map((l) => l.name).join(", ")}`);
      const names = (xs) => xs.map((l) => l.name).sort().join("|");
      expect(names(copied) === names(lines), `names differ: ${names(copied)} vs ${names(lines)}`);
      const stale = copied.filter((l) => l.is_stale);
      expect(stale.length === 0, `stale in the copy's api: ${stale.map((l) => l.name).join(", ")}`);
      const results = await gc.results();
      expect(results.length === 1, `copy's results: ${results.length}`);
      copySheet = { uuid: results[0].sheet_uuid };
      expect(copySheet.uuid !== sheet.uuid, "the copy's result points at the original's sheet");
      return `copy ${uuid}: ${copied.length} lines, none stale; result for sheet ${copySheet.uuid}${results[0].key_aliases ? `, ${Object.keys(results[0].key_aliases).length} key aliases` : ""}`;
    },
  },
  {
    title: "the copy's grading sheet, Earthwork tab: no \"Needs recalculating\" anywhere, Calculate's dot reads ready, the grading report is not out of date",
    run: async ({ page }) => {
      await openSheet(page, copy, copySheet, "earthwork");
      // The rows' marks come from the items' own state: wait for the calculated rows to be drawn.
      const anyLine = (await gc.items()).find((i) => i.source_type === "earthwork_computed");
      await page.locator(`li[data-item-row="${anyLine.uuid}"]`).waitFor({ timeout: 20000 }).catch(() => undefined);
      const marks = await staleMarks(page);
      expect(marks.rowMarks === 0 && marks.text === 0, `"Needs recalculating" on the copy's sheet: ${JSON.stringify(marks)}`);
      const dot = await page.locator("[data-calc-state]").first().getAttribute("data-calc-state").catch(() => null);
      expect(dot === "ready" || dot === "warning", `Calculate's dot reads ${dot}`);
      const toggle = page.locator("[data-grading-report-toggle]");
      if (await toggle.isVisible()) await toggle.click();
      else {
        await page.getByRole("button", { name: "More earthwork tools" }).click();
        await page.getByRole("menuitem", { name: "Grading report" }).click();
      }
      await page.locator("[data-report-excel]").waitFor({ timeout: 60000 });
      const outOfDate = await page.locator("[data-report-stale]").count();
      const said = outOfDate ? ((await page.locator("[data-report-stale]").first().textContent()) ?? "").trim() : "";
      expect(outOfDate === 0, `the copy's grading report says: ${said}`);
      return `no "Needs recalculating" (${JSON.stringify(marks)}); Calculate dot "${dot}"; the report opens without an out-of-date note`;
    },
  },
  {
    title: "the copy's Estimating tab: every calculated line listed, none flagged \"Needs recalculating\"",
    run: async ({ page }) => {
      await openSheet(page, copy, copySheet, "estimating");
      const copied = (await gc.items()).filter((i) => i.source_type === "earthwork_computed");
      // Rows render by name; the first one up means the grid is drawn.
      await page.locator("tr[data-estimate-row]").first().waitFor({ timeout: 30000 });
      const shown = await page.locator("tr[data-estimate-row]").evaluateAll((rows) => rows.map((r) => r.getAttribute("data-estimate-row")));
      const missing = copied.filter((l) => !shown.includes(l.name)).map((l) => l.name);
      expect(missing.length === 0, `not in Estimating: ${missing.join(", ")} (rows: ${shown.join(" | ")})`);
      const marks = await staleMarks(page);
      expect(marks.flags === 0 && marks.text === 0, `Estimating flags: ${JSON.stringify(marks)}`);
      return `${copied.length} calculated lines in Estimating, no flag`;
    },
  },
]);

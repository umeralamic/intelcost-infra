// C44, fill by delivery (FILL_BY_DELIVERY_PLAN): how cut reaches fill re-prices without a Calculate (Block 4, D-899).
//
//   ./fx-suite.sh run named c44-fill-by-delivery
//
// The world: one throwaway project, two pages, a flat cut on each (EG 100, FG 99).
//   1. Both calculated: each has a Cut line.
//   2. The method changed in the dialog: its button reads Apply, nothing recalculates, the result's key and time stay,
//      and both pages' lines change. Neither page reads stale.
//   3. Changing a factor as well is a Calculate again.

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { calculate, flatPad, grading, gradingSheets, openSheet, storedLines } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C44 Fill by delivery");
const project = await makeProject(token, base, { name: "Delivery" });
const g = grading(token, base, project);
let one;
let two;
let before;

const openDialog = async (page) => {
  await openSheet(page, project, one, "earthwork");
  await page.getByRole("button", { name: "Calculate", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Earthwork assumptions" });
  await dialog.waitFor();
  return dialog;
};
const cutNames = async (sheet) => (await storedLines(g, sheet, waitFor)).filter((l) => /^Cut/.test(l.name) && l.effective_quantity > 0).map((l) => l.name);

await run("c44-fill-by-delivery", [
  {
    title: "setup: two pages calculated, each with a Cut line",
    run: async ({ page }) => {
      [one, two] = await gradingSheets(page, token, base, workspace, project, ["G-1", "G-2"]);
      await flatPad(g, one);
      await flatPad(g, two);
      await g.assume({ native_suitable: "all" });
      for (const sheet of [one, two]) {
        await openSheet(page, project, sheet, "earthwork");
        await calculate(page);
        await storedLines(g, sheet, waitFor);
      }
      expect((await cutNames(one)).join() === "Cut" && (await cutNames(two)).join() === "Cut", "a Cut line on each");
      before = await g.results();
      return `${before.length} results`;
    },
  },
  {
    title: "D-899: the method alone reads Apply; every sheet's lines change, no volume, key or time moves, neither page reads stale",
    run: async ({ page }) => {
      const dialog = await openDialog(page);
      expect((await dialog.locator("[data-lines-only]").count()) === 0, "Apply offered before a change");
      await dialog.locator('[data-cut-method-choice="dozer"]').check();
      await dialog.locator("[data-lines-only]").waitFor();
      await dialog.getByRole("button", { name: "Apply", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
      await waitFor(async () => (await cutNames(one)).join() === "Cut, dozer push" && (await cutNames(two)).join() === "Cut, dozer push", "both pages' lines to change", 20000, 500);
      const after = await g.results();
      for (const was of before) {
        const now = after.find((r) => r.sheet_uuid === was.sheet_uuid);
        expect(now.version_key === was.version_key && now.computed_at === was.computed_at, `result moved on ${was.sheet_uuid}`);
        expect(JSON.stringify(now.result) === JSON.stringify(was.result), "the stored volumes moved");
      }
      const lines = (await g.items()).filter((i) => i.source_type === "earthwork_computed");
      expect(lines.every((l) => !l.is_stale), "a line reads stale");
      await page.reload();
      await page.getByRole("button", { name: "Calculate", exact: true }).first().waitFor();
      expect((await page.getByText(/out of date|Out of date/).count()) === 0, "the page reads out of date");
      return "Cut, dozer push on both pages; key and computed_at unchanged";
    },
  },
  {
    title: "D-899: a factor changed with the method is a Calculate again",
    run: async ({ page }) => {
      const dialog = await openDialog(page);
      await dialog.locator('[data-cut-method-choice="scraper"]').check();
      await dialog.locator("[data-lines-only]").waitFor();
      await dialog.getByLabel("Swell factor").fill("1.3");
      await dialog.locator("[data-lines-only]").waitFor({ state: "detached" });
      expect((await dialog.getByRole("button", { name: "Calculate", exact: true }).count()) === 1, "no Calculate button");
      await page.keyboard.press("Escape");
      const read = (await apiCall(token, "GET", `${g.earthwork}/assumptions`)).body;
      expect(read.site_choices?.method === "dozer", `saved ${read.site_choices?.method}`);
      return "Calculate, with the swell changed";
    },
  },
]);

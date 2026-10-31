// C44, fill by delivery (FILL_BY_DELIVERY_PLAN): how cut reaches fill re-prices without a Calculate (Block 4, D-899).
//
//   ./fx-suite.sh run named c44-fill-by-delivery
//
// The world: one throwaway project, three pages: a flat cut on two (EG 100, FG 99), a flat fill on one.
//   1. Both calculated: each has a Cut line.
//   2. The method changed in the dialog: its button reads Apply, nothing recalculates, the result's key and time stay,
//      and both pages' lines change. Neither page reads stale.
//   3. Changing a factor as well is a Calculate again.
//   4. Fill follows its delivery (D-900): A16 and A17, and the haul-road water line only from 1,000 ft.
//   5. A typed share splits a page's fill (D-901), the lines add to it, and blank goes back to the cut lines.

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { calculate, flatPad, grading, gradingSheets, openSheet, storedLines } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C44 Fill by delivery");
const project = await makeProject(token, base, { name: "Delivery" });
const g = grading(token, base, project);
let one;
let two;
let three;
let before;

const openDialog = async (page, sheet = one) => {
  await openSheet(page, project, sheet, "earthwork");
  await page.getByRole("button", { name: "Calculate", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Earthwork assumptions" });
  await dialog.waitFor();
  return dialog;
};
const fillNames = async (sheet) => (await storedLines(g, sheet, waitFor)).filter((l) => /^(Fill|Haul-road)/.test(l.name) && l.effective_quantity > 0).map((l) => l.name).sort();
const applyMethod = async (page, method, haul) => {
  const dialog = await openDialog(page, three);
  await dialog.locator(`[data-cut-method-choice="${method}"]`).check();
  if (haul !== undefined) {
    await dialog.locator("[data-scraper-haul]").fill(String(haul));
    // This page has no cut to deliver it (D-901): the share typed.
    if (!(await dialog.getByLabel("Scraper share").isVisible())) await dialog.locator("[data-fill-shares] summary").click();
    await dialog.getByLabel("Scraper share").fill("100");
  } else await dialog.getByRole("button", { name: "From the cut lines" }).click();
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
};
const cutNames = async (sheet) => (await storedLines(g, sheet, waitFor)).filter((l) => /^Cut/.test(l.name) && l.effective_quantity > 0).map((l) => l.name);

await run("c44-fill-by-delivery", [
  {
    title: "setup: two pages calculated, each with a Cut line",
    run: async ({ page }) => {
      [one, two, three] = await gradingSheets(page, token, base, workspace, project, ["G-1", "G-2", "G-3"]);
      await flatPad(g, one);
      await flatPad(g, two);
      await flatPad(g, three, { eg: 99, fg: 100 });
      await g.assume({ native_suitable: "all" });
      for (const sheet of [one, two, three]) {
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
  {
    title: "D-900: the fill follows its delivery; a scraper haul of 1,000 ft or more adds the haul-road water, a shorter one does not",
    run: async ({ page }) => {
      const cfg = (await apiCall(token, "GET", `/api/workspace/${workspace.uuid}/equipment-library/earthwork-production`)).body;
      const keys = cfg.activities.map((a) => a.national_key);
      expect(["A16", "A17", "A20"].every((k) => keys.includes(k)), `activities ${keys.join()}`);
      await applyMethod(page, "scraper", 900);
      await waitFor(async () => (await fillNames(three)).join() === "Fill, scraper", "the scraper's fill, no water line", 20000, 500).catch(async (e) => { throw new Error(`${e.message}: ${(await fillNames(three)).join(" | ")}`); });
      await applyMethod(page, "scraper", 1200);
      await waitFor(async () => (await fillNames(three)).join() === "Fill, scraper,Haul-road water, scraper fill", "the water line", 20000, 500).catch(async (e) => { throw new Error(`${e.message}: ${(await fillNames(three)).join(" | ")}`); });
      await applyMethod(page, "excavator");
      await waitFor(async () => (await fillNames(three)).join() === "Fill", "the trucks' fill", 20000, 500);
      return "Fill, scraper; with the water line at 1,200 ft; Fill on excavator and trucks";
    },
  },
  {
    title: "D-901: a typed 40 % splits the fill into two lines that add to it; From the cut lines goes back",
    run: async ({ page }) => {
      const all = async () => (await storedLines(g, three, waitFor)).filter((l) => /^Fill/.test(l.name) && l.effective_quantity > 0);
      const whole = (await all()).reduce((t, l) => t + l.effective_quantity, 0);
      let dialog = await openDialog(page, three);
      await dialog.locator("[data-fill-shares] summary").click();
      await dialog.getByLabel("Dozer push share").fill("40");
      await dialog.getByRole("button", { name: "Apply", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
      await waitFor(async () => (await all()).length === 2, "two fill lines", 20000, 500);
      const lines = await all();
      const push = lines.find((l) => l.name === "Fill, dozer push");
      expect(Math.abs(push.effective_quantity - whole * 0.4) < 1e-6, `push ${push.effective_quantity} of ${whole}`);
      expect(Math.abs(lines.reduce((t, l) => t + l.effective_quantity, 0) - whole) < 1e-6, "the lines do not add to the fill");
      dialog = await openDialog(page, three);
      await dialog.getByRole("button", { name: "From the cut lines" }).click();
      await dialog.getByRole("button", { name: "Apply", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
      await waitFor(async () => (await all()).map((l) => l.name).join() === "Fill", "the trucks' fill alone", 20000, 500);
      return `${whole.toFixed(2)} CCY, 40 % pushed; back to the cut lines`;
    },
  },
]);

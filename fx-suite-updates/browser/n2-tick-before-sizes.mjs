// N2 (night run 2026-10-19, D-640): on the load screen, a file ticked before its page sizes arrive
// stays ticked, and once the sizes come in its pages are chosen by the tick's usual rule (D-310 2:
// drawing-size pages; every page when it has none).
//
//   node fx-run-locked.mjs n2-tick-before-sizes
//
// The world: one throwaway workspace and project with "Mixed set.pdf", three pages: two drawing-size
// (1224 × 792 pt) and one letter (612 × 792). The browser's `GET …/file/page-sizes` is held back
// until the step lets it through, so the tick lands in the gap for certain (in the founder's run it
// was a race).

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { makePdf } from "./lib/drawings.mjs";
import { freshWorkspace, makeProject, seedFile } from "./lib/f4.mjs";

const NAME = "Mixed set.pdf";
const { token, base } = await freshWorkspace("N2 Tick before sizes");
const project = await makeProject(token, base, { name: "Tick before sizes" });
const proj = `${base}/${project.uuid}`;
const pdf = makePdf([
  { width: 1224, height: 792, label: "A-101" },
  { width: 1224, height: 792, label: "A-102" },
  { width: 612, height: 792, label: "Notes" },
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The page sizes, measured by the worker: the answer let through later carries all three. */
async function measured() {
  const until = Date.now() + 90000;
  for (;;) {
    const answer = await apiCall(token, "GET", `${proj}/file/page-sizes`);
    const entry = (answer.body ?? []).find((e) => e.page_count === 3 && e.pages.length === 3);
    if (entry) return entry;
    expect(Date.now() < until, `the sizes never came: ${JSON.stringify(answer.body)}`);
    await sleep(500);
  }
}

/** The load screen on a project with no sheets, the sizes held back until `release()`. */
async function openHeld(page) {
  const held = [];
  let open = true;
  await page.route(/\/file\/page-sizes$/, (route) => (open ? held.push(route) : route.continue()));
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff`);
  await page.locator("[data-add-sheets-empty]").click({ timeout: 30000 });
  const dialog = page.getByRole("dialog").filter({ has: page.locator("[data-load-dialog]") });
  const row = dialog.locator(`[data-load-file="${NAME}"]`);
  await row.waitFor({ timeout: 30000 });
  expect(held.length > 0, "the sizes were not asked for: nothing to hold");
  const release = async () => {
    open = false;
    for (const route of held.splice(0)) await route.continue().catch(() => undefined);
  };
  return { dialog, row, release };
}

const state = (row) => row.evaluate((el) => ({ tick: el.getAttribute("data-tick"), note: el.querySelector("[data-file-note]")?.textContent?.trim() ?? "" }));
const loadButton = (dialog) => dialog.locator("[data-load-pages]").evaluate((b) => ({ text: (b.textContent ?? "").trim(), on: !b.disabled }));

await run("n2-tick-before-sizes", [
  {
    title: "setup: Mixed set.pdf uploaded, its three pages measured by the worker",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff`);
      await seedFile(page, token, base, project.uuid, null, NAME, pdf);
      const entry = await measured();
      return `${NAME}: ${entry.pages.map((p) => `${p.width_pt}×${p.height_pt}`).join(", ")}`;
    },
  },
  {
    title: "ticked before the sizes arrive: it stays ticked (\"Preparing…\", Load waits); once they arrive it takes its 2 drawing pages, not the letter page",
    run: async ({ page }) => {
      const { dialog, row, release } = await openHeld(page);
      await row.getByRole("checkbox", { name: `Choose ${NAME}` }).check();
      const waiting = await state(row);
      expect(waiting.tick === "all", `ticked in the gap, the file reads "${waiting.tick}"`);
      expect(waiting.note === "Preparing…", `its note reads "${waiting.note}"`);
      const held = await loadButton(dialog);
      expect(!held.on && held.text === "Measuring pages…", `the Load button reads "${held.text}" (${held.on ? "on" : "off"})`);
      await release();
      await page.waitForFunction((name) => document.querySelector(`[data-load-file="${name}"]`)?.getAttribute("data-tick") === "some", NAME, { timeout: 30000 });
      const after = await state(row);
      expect(after.note === "2/3 selected", `after the sizes its note reads "${after.note}"`);
      const ready = await loadButton(dialog);
      expect(ready.on && ready.text === "Load 2 pages", `the Load button reads "${ready.text}" (${ready.on ? "on" : "off"})`);
      await dialog.locator("[data-load-pages]").click();
      const until = Date.now() + 60000;
      let sheets = [];
      while (sheets.length < 2 && Date.now() < until) {
        sheets = (await apiCall(token, "GET", `${proj}/drawing/sheet`)).body ?? [];
        await sleep(500);
      }
      const pages = sheets.map((s) => s.page_number).sort();
      expect(pages.join(",") === "1,2", `the Load made sheets for pages ${pages.join(",")}`);
      return `in the gap: "${waiting.tick}", "${waiting.note}", "${held.text}" · sizes in: "${after.tick}", "${after.note}", "${ready.text}" · loaded pages ${pages.join(", ")}`;
    },
  },
  {
    title: "ticked and unticked before the sizes arrive: it stays unticked once they do",
    run: async ({ page }) => {
      // A second file, so the first's sheets (in takeoff now) are out of the way.
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff`);
      const second = "Second set.pdf";
      await seedFile(page, token, base, project.uuid, null, second, pdf);
      const until = Date.now() + 90000;
      for (;;) {
        const answer = await apiCall(token, "GET", `${proj}/file/page-sizes`);
        if ((answer.body ?? []).filter((e) => e.page_count === 3 && e.pages.length === 3).length === 2) break;
        expect(Date.now() < until, "the second file's sizes never came");
        await sleep(500);
      }
      const held = [];
      let open = true;
      await page.route(/\/file\/page-sizes$/, (route) => (open ? held.push(route) : route.continue()));
      await page.reload();
      await page.locator("[data-add-sheets]").click({ timeout: 30000 });
      await page.getByRole("menuitem", { name: "Add Pages" }).click();
      const dialog = page.getByRole("dialog").filter({ has: page.locator("[data-load-dialog]") });
      const row = dialog.locator(`[data-load-file="${second}"]`);
      await row.waitFor({ timeout: 30000 });
      const box = row.getByRole("checkbox", { name: `Choose ${second}` });
      await box.check();
      await box.uncheck();
      const landed = page.waitForResponse((r) => /\/file\/page-sizes$/.test(new URL(r.url()).pathname) && r.status() === 200, { timeout: 30000 });
      open = false;
      for (const route of held.splice(0)) await route.continue().catch(() => undefined);
      await landed;
      await page.waitForTimeout(2000);
      const after = await state(row);
      expect(after.tick === "none", `unticked in the gap, it reads "${after.tick}" ("${after.note}") once the sizes came`);
      return `ticked, unticked in the gap; sizes in: "${after.tick}"`;
    },
  },
]);

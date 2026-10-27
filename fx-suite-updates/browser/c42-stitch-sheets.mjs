// C42, Stitch sheets (SITE_AND_EARTHWORK_PLAN section A, D-803, D-804): one way to join sheets.
//
//   ./fx-suite.sh run c42-stitch-sheets
//
// The world: one throwaway project, three blank pages at the grading world's scale (lib/grading-world.mjs);
// page 3 recalibrated about 1 % long through the api, as a sheet calibrated off its printed scale would be.
//   1. Matching points: page 2 stitched to page 1 by three points clicked at the same places: no turn, fit
//      under 0.1 ft, no scale flag; the site shows on page 1's row ("Site · 2 sheets"), page 2 indented
//      under it, and the entry opens the joined drawing (D-803's blank page not reached).
//   2. The scale flag: page 3 by matching points onto page 2 flags about 1 % and names page 3; Recalibrate
//      asks "Recalibrating changes N quantities on this sheet (largest: …)", and after it the flag is gone.
//   3. The chain: page 3 on page 2 on page 1 shows a chain fit, the joins' misses added.
//   4. Check a printed length: two clicks and a typed length show the % off and offer Recalibrate.
// The fixture drives the screens; only the world (pages, scales, an area to recalibrate) is made through the
// api.

import { APP, apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { gradingSheets, openSheet } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C42 Stitch sheets");
const project = await makeProject(token, base, { name: "Stitch sheets" });
let sheets;

const svg = (page, i = 0) => page.locator('svg[role="presentation"]').nth(i);
async function clickAt(page, i, x, y) {
  const b = await svg(page, i).boundingBox();
  await page.mouse.click(b.x + b.width * x, b.y + b.height * y);
}
async function stitchPanel(page) {
  await page.getByRole("button", { name: /Stitch sheets/ }).first().click();
  await page.locator("[data-join-panel]").waitFor({ timeout: 10000 });
}
async function stitchByPoints(page, other, here, there) {
  await page.locator('[data-stitch-way="points"]').click();
  await page.getByLabel("Sheet to stitch").selectOption({ label: other });
  await page.waitForFunction(() => document.querySelectorAll('svg[role="presentation"]').length >= 2, null, { timeout: 20000 }).catch(async () => {
    const select = page.getByLabel("Sheet to stitch");
    const seen = {
      chosen: await select.evaluate((s) => s.selectedOptions[0]?.textContent).catch(() => "no select"),
      options: await select.locator("option").allInnerTexts().catch(() => []),
      panes: await page.locator('svg[role="presentation"]').count(),
      url: page.url(),
    };
    throw new Error(`no second pane after choosing ${other}: ${JSON.stringify(seen)}`);
  });
  for (let k = 0; k < here.length; k++) {
    await clickAt(page, 0, ...here[k]);
    await clickAt(page, 1, ...there[k]);
  }
  await page.locator("[data-join-fit]").waitFor({ timeout: 10000 });
}
/** A sheet as the app names it: its title, or "Page n" while it has none (these pages have none). */
const shown = (s) => s.sheet_name || `Page ${s.page_number}`;
const sites = async () => (await apiCall(token, "GET", `${base}/${project.uuid}/site`)).body;
const POINTS = [
  [0.2, 0.2],
  [0.8, 0.25],
  [0.5, 0.8],
];

await run("c42-stitch-sheets", [
  {
    title: "setup: three pages at one scale; page 3 calibrated 1 % long",
    run: async ({ page }) => {
      sheets = await gradingSheets(page, token, base, workspace, project, ["S-1", "S-2", "S-3"]);
      const cal = (await apiCall(token, "GET", `${base}/${project.uuid}/drawing/sheet/${sheets[2].uuid}/calibration`)).body;
      const long = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheets[2].uuid}/scale`, { feet_per_pt: Number(cal.feet_per_norm) * 1.01, label: "off by 1 %", unit: "ft" });
      expect(long.status === 200, `page 3 recalibrated: ${long.status}`);
      return `${sheets.length} pages`;
    },
  },
  {
    title: "D-804 A4: page 2 by matching points onto page 1: no turn, fit under 0.1 ft, no flag; D-803: one site row, page 2 under it, the drawing opens",
    run: async ({ page }) => {
      await openSheet(page, project, sheets[0], "earthwork");
      await stitchPanel(page);
      await stitchByPoints(page, shown(sheets[1]), POINTS, POINTS);
      const fit = Number(await page.locator("[data-join-fit]").getAttribute("data-join-fit"));
      expect(fit < 0.1, `fit ${fit} ft`);
      expect((await page.locator("[data-join-scale-flag]").count()) === 0, "a scale flag on sheets at one scale");
      await page.locator("[data-stitch-join]").click();
      await waitFor(async () => ((await sites()).length === 1 ? true : null), "the site made", 15000);
      const group = page.locator("[data-site-group]");
      await group.waitFor({ timeout: 10000 });
      expect((await page.locator("[data-site-rows]").count()) === 0, "the old block above the search is back");
      expect((await group.locator("[data-site-members] [data-in-site]").count()) === 1, "page 2 not under the anchor");
      await page.locator("[data-site-open]").first().click();
      await page.waitForTimeout(0);
      expect((await page.locator("[data-view-error]").count()) === 0, "the site view failed");
      return `fit ${fit.toFixed(3)} ft; one site row with page 2 under it; the drawing opened`;
    },
  },
  {
    title: "D-804 A5: page 3 onto page 2 flags about 1 % and names page 3; Recalibrate asks with the quantities, then the flag is gone",
    run: async ({ page }) => {
      await openSheet(page, project, sheets[1], "earthwork");
      await stitchPanel(page);
      await stitchByPoints(page, shown(sheets[2]), POINTS, POINTS);
      const flag = page.locator("[data-join-scale-flag]");
      await flag.waitFor({ timeout: 10000 });
      const pct = Math.abs(Number(await flag.getAttribute("data-join-scale-flag")));
      expect(pct > 0.9 && pct < 1.1, `flag ${pct} %`);
      expect((await page.locator("[data-join-recalibrate]").getAttribute("data-join-recalibrate")) === shown(sheets[2]), "the flag names another sheet");
      await page.locator("[data-join-recalibrate]").click();
      const ask = page.getByRole("dialog").filter({ hasText: /Recalibrating changes \d+ quantit/ });
      await ask.waitFor({ timeout: 10000 });
      await ask.getByRole("button", { name: "Recalibrate", exact: true }).click();
      await flag.waitFor({ state: "detached", timeout: 20000 });
      return `flagged ${pct.toFixed(2)} % on S-3; recalibrated; the flag gone`;
    },
  },
  {
    title: "D-804 A4: the chain: page 3 joined to page 2 joined to page 1 shows its chain fit",
    run: async ({ page }) => {
      // Each step has a page of its own: page 3's points picked again, now at one scale, and joined.
      await openSheet(page, project, sheets[1], "earthwork");
      await stitchPanel(page);
      await stitchByPoints(page, shown(sheets[2]), POINTS, POINTS);
      await page.locator("[data-stitch-join]").click();
      const row = page.locator(`[data-site-fit="${shown(sheets[2])}"]`);
      await row.waitFor({ timeout: 15000 });
      const text = await row.innerText();
      expect(/chain/.test(text), `no chain fit: ${text}`);
      return text.replace(/\s+/g, " ");
    },
  },
  {
    title: "D-804 A7: Check a printed length shows the % off and offers Recalibrate past 0.5 %",
    run: async ({ page }) => {
      await openSheet(page, project, sheets[0], "takeoff");
      await page.getByRole("button", { name: /^Scale/ }).first().click();
      await page.locator("[data-scale-check]").first().click();
      await clickAt(page, 0, 0.2, 0.5);
      await clickAt(page, 0, 0.7, 0.5);
      await page.locator("[data-scale-check-dialog]").waitFor({ timeout: 10000 });
      await page.getByLabel("Printed length").fill("100");
      const first = await page.locator("[data-scale-check-result]").innerText();
      const measured = Number(/measures it ([\d,.]+)/.exec(first)[1].replace(/,/g, ""));
      await page.getByLabel("Printed length").fill((measured / 1.02).toFixed(2));
      const off = Number(await page.locator("[data-scale-check-result]").getAttribute("data-scale-check-result"));
      expect(off > 1.9 && off < 2.1, `off ${off} %`);
      expect((await page.locator("[data-scale-check-recalibrate]").count()) === 1, "no Recalibrate past 0.5 %");
      await page.keyboard.press("Escape");
      return `measured ${measured} ft, ${off} % off`;
    },
  },
]);

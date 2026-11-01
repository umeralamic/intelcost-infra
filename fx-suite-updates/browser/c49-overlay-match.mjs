// C49, Overlay by matching points (D-931).
//
//   ./fx-suite.sh run c49-overlay-match
//
// The world: two pages of one throwaway project. The second is treated as plotted turned 20 degrees and at 80 %: the
// points clicked on it are the first page's put through that turn and scale, so the fit has a known answer. (The page's
// own drawing is not redrawn: the fit reads only the points.)
//   1. Overlay > Compare sheets > Match points opens the second page beside the first; one pair and Enter says so.
//   2. Three pairs: the counter, then the fit: scale 1.25, turn about 20 degrees the other way; Enter saves it.
//   3. The compare view: its bar, the opacity saved, and Swap changes which sheet is green.

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { gradingSheets, openSheet } from "./lib/grading-world.mjs";
import { waitFor } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("C49 Overlay");
const project = await makeProject(token, base, { name: "Overlay" });
let sheets;

const HERE = [
  [0.3, 0.3],
  [0.6, 0.35],
  [0.45, 0.6],
];
const TURN = (20 * Math.PI) / 180;
const SCALE = 0.8;
const svg = (page, i) => page.locator('svg[role="presentation"]').nth(i);
async function clickAt(page, i, x, y) {
  const b = await svg(page, i).boundingBox();
  await page.mouse.click(b.x + b.width * x, b.y + b.height * y);
}
/** A point of the first page, where the turned and shrunk second page has it, about the page's middle. */
function there([x, y], w, h) {
  const [dx, dy] = [(x - 0.5) * w, (y - 0.5) * h];
  const [X, Y] = [SCALE * (Math.cos(TURN) * dx - Math.sin(TURN) * dy), SCALE * (Math.sin(TURN) * dx + Math.cos(TURN) * dy)];
  return [X / w + 0.5, Y / h + 0.5];
}
const overlayRow = async () => (await apiCall(token, "GET", `${base}/${project.uuid}/earthwork/registration`)).body.find((r) => r.overlay)?.overlay;

await run("c49-overlay-match", [
  {
    title: "two pages: opened beside it, one pair refused; three pairs fit the scale and turn; Enter saves; the compare view, opacity and Swap",
    run: async ({ page }) => {
      await page.setViewportSize({ width: 1800, height: 1000 });
      sheets = await gradingSheets(page, token, base, workspace, project, ["R-1", "R-2"]);
      await openSheet(page, project, sheets[0], "takeoff");
      await page.getByRole("button", { name: "Overlay" }).first().click();
      const dialog = page.locator("[data-overlay-dialog]");
      await dialog.waitFor({ timeout: 10000 });
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByRole("option").first().click();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByRole("button", { name: "Match points" }).click();
      await page.locator("[data-overlay-match]").waitFor({ timeout: 10000 });
      await page.waitForFunction(() => document.querySelectorAll('svg[role="presentation"]').length >= 2, null, { timeout: 20000 });
      await page.waitForTimeout(1500);
      await clickAt(page, 0, ...HERE[0]);
      await clickAt(page, 1, ...there(HERE[0], sheets[1].width_pt, sheets[1].height_pt));
      await page.keyboard.press("Enter");
      await page.getByText("Place at least 2 matching pairs").first().waitFor({ timeout: 5000 });
      const [w, h] = [sheets[1].width_pt, sheets[1].height_pt];
      for (const p of HERE.slice(1)) {
        await clickAt(page, 0, ...p);
        await clickAt(page, 1, ...there(p, w, h));
      }
      const fit = page.locator("[data-overlay-fit]");
      await fit.waitFor({ timeout: 10000 });
      const scale = Number(await fit.getAttribute("data-overlay-scale"));
      const turn = Number(await fit.getAttribute("data-overlay-turn"));
      expect(/3 pairs: Enter to overlay/.test(await page.locator("[data-overlay-pairs]").innerText()), await page.locator("[data-overlay-pairs]").innerText());
      expect(Math.abs(scale - 1.25) < 0.05, `scale ${scale}`);
      expect(Math.abs(Math.abs(turn) - 20) < 2, `turn ${turn}`);
      await page.keyboard.press("Enter");
      await waitFor(async () => ((await overlayRow())?.matrix ? true : null), "the overlay saved", 15000, 300);
      const m = (await overlayRow()).matrix;
      expect(Math.abs(Math.hypot(m.a, m.b) - scale) < 0.01, `stored ${JSON.stringify(m)}`);
      await page.keyboard.press("Enter");
      const bar = page.locator("[data-overlay-compare]");
      await bar.waitFor({ timeout: 15000 });
      expect(await page.locator("[data-overlay-compare-layer]").count() === 1, "no compare layer");
      const was = (await overlayRow()).color;
      await bar.getByLabel("Overlay opacity").fill("80");
      await waitFor(async () => (Math.abs((await overlayRow()).opacity - 0.8) < 0.01 ? true : null), "the opacity saved", 10000, 300);
      await page.locator("[data-overlay-swap]").click();
      await waitFor(async () => ((await overlayRow()).color !== was ? true : null), "the swap saved", 10000, 300);
      return `scale x${scale}, turn ${turn} degrees, saved; bar, layer, opacity 80, swapped`;
    },
  },
]);

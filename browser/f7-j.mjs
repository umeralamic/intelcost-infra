// F7-S11 AC2 to AC4: legacy's Auto Scroll. With a measure tool armed, a cursor resting in
// the canvas's edge band glides the sheet after half a second; leaving the canvas stops
// it at once; "Auto Scroll: Off" and Select leave the sheet still.
//
//   docker compose --profile browser run --rm browser node scripts/f7-j.mjs
//
// The world: one scaled sheet, zoomed in so there is room to glide.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, quietFor, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { armMeasure } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F7 auto scroll");
const project = await makeProject(token, base, { name: "Auto scroll" });
let sheet;

const scroller = (page) => page.locator("[data-sheet-scroller]");
const pos = (page) => scroller(page).evaluate((e) => [e.scrollLeft, e.scrollTop]);

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
  for (let i = 0; i < 3; i += 1) await page.getByRole("button", { name: "Zoom in" }).click();
  // Start in the middle, so there is room both ways.
  await scroller(page).evaluate((e) => {
    e.scrollLeft = (e.scrollWidth - e.clientWidth) / 2;
    e.scrollTop = (e.scrollHeight - e.clientHeight) / 2;
  });
}
/** Rest the cursor 10 px inside the scroller's right edge. */
async function restAtRightEdge(page) {
  const box = await scroller(page).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 5 });
}

await run("f7-j", [
  {
    title: "setup: one scaled sheet",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "A.pdf", buffer: makePdf([{ width: 1000, height: 1000, label: "A" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["A.pdf"].uuid, [1]]]);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      return "one sheet at 0.1 ft per point";
    },
  },
  {
    title: "AC2, AC3: Linear armed, the cursor resting at the right edge glides the sheet right; moved off the canvas onto the Takeoff panel, it stops at once",
    run: async ({ page }) => {
      await open(page);
      await armMeasure(page, "Linear");
      const s0 = await pos(page);
      await restAtRightEdge(page);
      const moving = await waitFor(async () => { const p = await pos(page); return p[0] > s0[0] + 40 ? p : null; }, "the sheet to glide", 5000, 50);
      const bar = await page.locator("[data-canvas-bar]").getByRole("button", { name: /^Auto Scroll:/ });
      const label = (await bar.innerText()).trim();
      const title = await bar.getAttribute("title");
      // Off the canvas: onto the Takeoff panel.
      const panel = await page.locator("[data-quantity-panel]").boundingBox();
      await page.mouse.move(panel.x + panel.width / 2, panel.y + 40, { steps: 3 });
      const stopped = await pos(page);
      await quietFor(1000);
      const later = await pos(page);
      expect(label === "Auto Scroll: On" && title === "Glide the sheet when the cursor nears the edge while a takeoff tool is active", `"${label}", "${title}"`);
      expect(later[0] === stopped[0], `kept gliding off the canvas: ${stopped} → ${later}`);
      return `"${label}"; glided ${s0[0]} → ${moving[0]}; off the canvas it stayed at ${later[0]}`;
    },
  },
  {
    title: "AC4: \"Auto Scroll: Off\", and Select armed, each leave the sheet still at the edge",
    run: async ({ page }) => {
      await open(page);
      await armMeasure(page, "Linear");
      await page.locator("[data-canvas-bar]").getByRole("button", { name: /^Auto Scroll:/ }).click();
      const off = (await page.locator("[data-canvas-bar]").getByRole("button", { name: /^Auto Scroll:/ }).innerText()).trim();
      const s0 = await pos(page);
      await restAtRightEdge(page);
      await quietFor(1500);
      const s1 = await pos(page);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await page.locator("[data-canvas-bar]").getByRole("button", { name: /^Auto Scroll:/ }).click();
      await page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: "Select" }).click();
      await restAtRightEdge(page);
      await quietFor(1500);
      const s2 = await pos(page);
      expect(off === "Auto Scroll: Off" && s1[0] === s0[0], `off: "${off}", ${s0} → ${s1}`);
      expect(s2[0] === s1[0], `Select glided: ${s1} → ${s2}`);
      return `"${off}": still at ${s1[0]}; Select, Auto Scroll on: still at ${s2[0]}`;
    },
  },
]);

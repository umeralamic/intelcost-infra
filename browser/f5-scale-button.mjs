// F5 follow-up (b), the founder's finding of 2026-09-27: legacy's toolbar Scale button,
// with its dropdown of scales, beside the canvas bar's chip (legacy's `ScaleMenu`, in
// `Toolbar.tsx`'s Scale cluster between the history and drawing clusters).
//
//   docker compose --profile browser run --rm browser node scripts/f5-scale-button.mjs
//
// The world: one unscaled landscape page in its own workspace.

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5 scale button");
const project = await makeProject(token, base, { name: "Scale button" });
let sheet;

const tools = (page) => page.getByRole("group", { name: "Takeoff tools" });
const button = (page) => tools(page).getByRole("button", { name: "Scale", exact: true });
const menu = (page) => page.getByRole("menu", { name: "Scale" });
const chip = (page) => page.locator("[data-canvas-scale]");
const preset = (page) => menu(page).getByRole("menuitem", { name: `1/4" = 1'-0"`, exact: true });

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await chip(page).waitFor({ timeout: 20000 });
}

await run("f5-scale-button", [
  {
    title: "setup: one unscaled landscape page",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Scale.pdf", buffer: makePdf([{ width: 1224, height: 792, label: "SB" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Scale.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      return `sheet ${sheet.uuid}`;
    },
  },
  {
    title: "AC1: the toolbar has legacy's Scale button after Select and before Linear; it opens the Scale menu, not a calibration",
    run: async ({ page }) => {
      await open(page);
      const order = await tools(page).getByRole("button").allTextContents();
      const at = (label) => order.findIndex((text) => text.trim() === label);
      expect(at("Select") >= 0 && at("Select") < at("Scale") && at("Scale") < at("Linear"), `toolbar order: ${order.join(", ")}`);
      expect((await button(page).getAttribute("title")) === "Scale — No scale", `title "${await button(page).getAttribute("title")}"`);
      await button(page).click();
      await menu(page).waitFor();
      const first = await menu(page).getByRole("menuitem").allTextContents();
      expect(first[0].trim() === "Calibrate Scale" && first[1].trim() === "Add Custom Scale", `menu opens with ${first.slice(0, 2).join(", ")}`);
      const groups = await menu(page).getByRole("group").evaluateAll((gs) => gs.map((g) => `${g.getAttribute("aria-label")} ${g.querySelectorAll("[data-scale-preset]").length}`));
      expect(groups.join(", ") === "Architectural 15, Engineering 25, Metric 23", `groups ${groups.join(", ")}`);
      expect((await page.getByText("Click two points on the sheet, then enter the real distance.").count()) === 0, "opening the menu started a calibration");
      return `order ${order.map((t) => t.trim()).join(" · ")} · menu: ${first.slice(0, 2).map((t) => t.trim()).join(", ")}, ${groups.join(", ")}`;
    },
  },
  {
    title: "AC2: a preset picked from the toolbar sets the sheet's scale: the chip and the button's title read it, and the menu ticks it",
    run: async ({ page }) => {
      await open(page);
      await button(page).click();
      await preset(page).click();
      await chip(page).filter({ hasText: `Scale: 1/4" = 1'-0"` }).waitFor({ timeout: 10000 });
      await page.waitForFunction(() => document.querySelector("[data-toolbar-scale]")?.getAttribute("title") === `Scale — 1/4" = 1'-0"`);
      await button(page).click();
      const ticked = await preset(page).getAttribute("class");
      expect(ticked.includes("font-medium"), "the current preset is not ticked");
      await page.keyboard.press("Escape");
      const stored = await apiCall(token, "GET", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/calibration`);
      // 1/4" of paper is 18 pt, and stands for 1 ft (D-51).
      expect(Math.abs(stored.body.feet_per_norm - 1 / 18) < 1e-9, `stored ${stored.body.feet_per_norm}`);
      return `chip "Scale: 1/4" = 1'-0"", title "Scale — 1/4" = 1'-0"", ticked, stored ${stored.body.feet_per_norm} ft/pt`;
    },
  },
  {
    title: "AC3: Calibrate Scale from the toolbar starts legacy's calibration, and the button reads pressed while it runs",
    run: async ({ page }) => {
      await open(page);
      await button(page).click();
      await menu(page).getByRole("menuitem", { name: "Calibrate Scale" }).click();
      await page.getByText("Click two points on the sheet, then enter the real distance.").waitFor({ timeout: 5000 });
      expect((await button(page).getAttribute("aria-pressed")) === "true", "the Scale button is not pressed while calibrating");
      return "toast shown, Scale pressed";
    },
  },
]);

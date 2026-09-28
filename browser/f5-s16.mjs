// F5-S16: scale presets, a custom scale, and the guards, in legacy's words (D-51).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s16.mjs
//
// Two 1224 × 792 pt sheets. Page 1 starts unscaled and empty; page 2 starts unscaled with
// a 612 pt run across it, then takes a preset, which the guard must then protect.
// Architectural labels read `1/8" = 1'-0"`, the spec's form, not legacy's `1/8" = 1'` (D-52).

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { armMeasure, confirmMeasure } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S16 presets");
const project = await makeProject(token, base, { name: "Presets" });
const drawing = `${base}/${project.uuid}/drawing`;
const takeoff = `${base}/${project.uuid}/takeoff`;
const W = 1224;
const H = 792;
let one;
let two;

const chip = (page) => page.locator("[data-canvas-scale]");
/** A preset by its exact words: legacy's labels carry quote marks a CSS selector cannot. */
const preset = (scope, label) => scope.getByRole("menuitem", { name: label, exact: true });
const menu = (page) => page.getByRole("menu", { name: "Scale" });
const tool = (page, name) => page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name, exact: true });
const scaleOf = async (sheet) => (await apiCall(token, "GET", `${drawing}/sheet/${sheet.uuid}/calibration`)).body;

async function open(page, sheet, email) {
  await signInAs(page, email ?? (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await chip(page).waitFor({ timeout: 20000 });
}

async function pickPreset(page, label) {
  await chip(page).click();
  await preset(menu(page), label).click();
}

await run("f5-s16", [
  {
    title: "setup: two 1224 × 792 pt sheets, unscaled; a run 612 pt across page 2",
    run: async ({ page }) => {
      const pages = [1, 2].map((n) => ({ width: W, height: H, label: `S16 ${n}` }));
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "S16.pdf", buffer: makePdf(pages), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["S16.pdf"].uuid, [1, 2]]]);
      [one, two] = (await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid)).sort((a, b) => a.page_number - b.page_number);
      const made = await apiCall(token, "POST", `${takeoff}/item`, {
        name: "Wall run", type: "lf", unit: "LF", sheet_uuid: two.uuid,
        geometry: { geom_type: "lf", vertices_json: [[0.25, 0.5], [0.75, 0.5]], shape_meta: null, client_uuid: crypto.randomUUID() },
      });
      expect(made.status === 201, `item: ${made.status}`);
      return "S16.pdf pages 1 and 2; Wall run on page 2";
    },
  },
  {
    title: "AC5 and AC1: an unscaled sheet's chip is amber \"Calibrate scale to compute LF / SF\"; the Scale menu lists Architectural, Engineering and Metric; 1/8\" = 1'-0\" sets the scale and the chip reads it",
    run: async ({ page }) => {
      await open(page, one);
      const before = await chip(page).textContent();
      const unset = await chip(page).getAttribute("data-canvas-scale");
      expect(before === "Calibrate scale to compute LF / SF" && unset === "unset", `chip "${before}" (${unset})`);
      const amber = await chip(page).evaluate((el) => getComputedStyle(el).backgroundColor);
      await chip(page).click();
      const m = menu(page);
      const firsts = await m.getByRole("menuitem").evaluateAll((items) => items.slice(0, 2).map((i) => i.textContent.trim()));
      const counts = {};
      for (const g of ["Architectural", "Engineering", "Metric"]) counts[g] = await m.getByRole("group", { name: g }).getByRole("menuitem").count();
      expect(firsts.join() === "Calibrate Scale,Add Custom Scale", `menu opens with ${firsts.join(", ")}`);
      expect(counts.Architectural === 15 && counts.Engineering === 25 && counts.Metric === 23, `lists ${JSON.stringify(counts)}`);
      await preset(m, `1/8" = 1'-0"`).click();
      await page.getByText("Scale set — verify with a known dimension").waitFor({ timeout: 10000 });
      await page.getByText(`Scale: 1/8" = 1'-0"`).waitFor({ timeout: 10000 });
      const green = await chip(page).evaluate((el) => getComputedStyle(el).backgroundColor);
      const cal = await scaleOf(one);
      expect(Math.abs(Number(cal.feet_per_norm) - 8 / 72) < 1e-9 && cal.label === `1/8" = 1'-0"`, `stored ${cal.feet_per_norm} "${cal.label}"`);
      expect(green !== amber, `the chip stayed ${amber}`);
      return `"${before}" (${amber}) → menu: Calibrate Scale, Add Custom Scale; 15 / 25 / 23 scales → "Scale: 1/8" = 1'-0"" (${green}); stored 8/72 feet per pt`;
    },
  },
  {
    title: "AC2: \"Add Custom Scale\" takes N inches = M feet and its label; the chip reads it",
    run: async ({ page }) => {
      await open(page, one);
      await chip(page).click();
      await menu(page).getByRole("menuitem", { name: "Add Custom Scale" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("heading", { name: "Custom Scale" }).waitFor();
      await dialog.getByLabel("Page inches").fill("1");
      await dialog.getByLabel("Real feet").fill("45");
      await dialog.getByText(`Preview: 1" = 45'`).waitFor();
      await dialog.getByRole("button", { name: "Save" }).click();
      await page.getByText(`Scale: 1" = 45'`).waitFor({ timeout: 10000 });
      const cal = await scaleOf(one);
      expect(Math.abs(Number(cal.feet_per_norm) - 45 / 72) < 1e-9, `stored ${cal.feet_per_norm}`);
      return `1 in = 45 ft, Preview 1" = 45' → "Scale: 1" = 45'", stored 45/72 feet per pt`;
    },
  },
  {
    title: "AC3: Linear on an unscaled sheet opens \"Set a scale for this sheet\"; \"Set scale directly\" then \"Pick a standard scale\" sets it and arms Linear; Count needs no scale",
    run: async ({ page }) => {
      await open(page, two);
      // Count asks for its name (F6-S1), then arms with no scale.
      await armMeasure(page, "Count");
      const countArmed = await tool(page, "Count").getAttribute("aria-pressed");
      await tool(page, "Linear").click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("heading", { name: "Set a scale for this sheet" }).waitFor();
      await dialog.getByText("This sheet hasn't been calibrated yet. Measurements need a scale before Linear or Area tools can be used.").waitFor();
      expect((await tool(page, "Linear").getAttribute("aria-pressed")) === "false", "Linear armed with no scale");
      await dialog.getByRole("button", { name: "Set scale directly" }).click();
      await page.getByRole("dialog").getByRole("heading", { name: "Pick a standard scale" }).waitFor();
      await preset(page.getByRole("dialog"), `1/4" = 1'-0"`).click();
      await page.getByText(`Scale: 1/4" = 1'-0"`).waitFor({ timeout: 10000 });
      // Then Linear's own "Name this LF measurement" (F6-S1), and it arms.
      await confirmMeasure(page);
      await page.waitForFunction(() => document.querySelector('[role="group"][aria-label="Takeoff tools"] button[aria-pressed="true"]')?.textContent?.includes("Linear"), null, { timeout: 5000 });
      // D-51: 612 pt across at 4 ft per inch is 612 × 4 / 72 = 34 ft.
      const wall = (await apiCall(token, "GET", `${takeoff}/item?sheet_uuid=${two.uuid}`)).body.find((i) => i.name === "Wall run");
      expect(Math.abs(Number(wall.effective_quantity) - 34) < 1e-6, `Wall run ${wall.effective_quantity} LF, expected 34`);
      expect(countArmed === "true", "Count did not arm on an unscaled sheet");
      return `Count armed unscaled · Linear → "Set a scale for this sheet" → Set scale directly → Pick a standard scale → 1/4" = 1'-0" → Linear armed; Wall run 34.00 LF`;
    },
  },
  {
    title: "AC4: changing a scale on a sheet with measurements asks \"Change scale on this sheet?\" first; Cancel keeps it, Change scale applies it",
    run: async ({ page }) => {
      await open(page, two);
      await pickPreset(page, `1/8" = 1'-0"`);
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("heading", { name: "Change scale on this sheet?" }).waitFor();
      const body = await dialog.locator("#confirm-consequence").textContent();
      expect(body.startsWith(`This sheet has 1 measurement traced on it. Changing the scale to 1/8" = 1'-0" will rescale their values`), `body: ${body}`);
      await dialog.getByRole("button", { name: "Cancel" }).click();
      const kept = await scaleOf(two);
      expect(kept.label === `1/4" = 1'-0"`, `Cancel changed the scale to ${kept.label}`);
      await pickPreset(page, `1/8" = 1'-0"`);
      await page.getByRole("dialog").getByRole("button", { name: "Change scale" }).click();
      await page.getByText(`Scale: 1/8" = 1'-0"`).waitFor({ timeout: 10000 });
      const wall = (await apiCall(token, "GET", `${takeoff}/item?sheet_uuid=${two.uuid}`)).body.find((i) => i.name === "Wall run");
      expect(Math.abs(Number(wall.effective_quantity) - 68) < 1e-6, `Wall run ${wall.effective_quantity} LF after, expected 68`);
      return `"${body}" · Cancel kept 1/4" = 1'-0" · Change scale → 1/8" = 1'-0", Wall run 34 → 68 LF`;
    },
  },
  {
    title: "A viewer sees the chip but cannot open the Scale menu, and the api refuses a scale",
    run: async ({ page }) => {
      const viewer = await seatedMember(token, workspace.uuid, "viewer");
      await open(page, two, viewer.email);
      const disabled = await chip(page).isDisabled();
      const refused = await apiCall(viewer.token, "PUT", `${drawing}/sheet/${two.uuid}/scale`, { feet_per_pt: 1, label: "Nope" });
      expect(disabled && refused.status === 403, `chip disabled ${disabled}, api ${refused.status}`);
      return `chip "${await chip(page).textContent()}" disabled; PUT …/scale 403`;
    },
  },
]);

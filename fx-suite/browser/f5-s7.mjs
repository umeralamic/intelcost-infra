// F5-S7: Upload drawing, the load screen's second tab. Files go to the project root through
// the app's upload queue (D-27, D-311 6); an image is wrapped into a PDF on the worker
// (D-36 Q3).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s7.mjs
//
// Updated 2026-10-19 to today's screens (D-619). What changed, and the decision behind it:
// - Nothing loads without Load (D-310 5): Upload drawing puts its files in the tree, ticked by
//   size, and no longer loads every page by itself. "Sheets added" is gone. AC1 now checks that
//   nothing was loaded on upload, then ticks both files in the tree and presses Load, so its
//   figures stand: both at the project root, 3 sheets (2 + 1), takeoff on a sheet.
// - Ticked by size (D-310 2): letter pages are not drawing size and an image starts unticked, so
//   both files are ticked by hand; a letter-only PDF's tick takes every page.
// - After Load, the progress view (D-321, D-322) closes itself on the first sheet when every
//   sheet is ready.
// - The tab's note reads "Uploaded files land in the project root and appear in the tree as they
//   arrive, ticked by size." (D-310 5); "file them from the Files page" went with that page (D-315).
// - The project has sheets after AC1, so AC2 opens the screen from the Sheets panel's + → Add
//   Pages (D-313).

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, makePdf, makePng, preparedSheets, sheetsOf } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S7 upload");
const project = await makeProject(token, base, { name: "Upload here" });

/** The load screen: the one dialog that carries the tree and the pages (D-310). */
const dialog = (page) => page.getByRole("dialog").filter({ has: page.locator("[data-load-dialog]") });
const fileRow = (page, name) => dialog(page).locator(`[data-load-file="${name}"]`);

/** Every PDF of the project measured (D-310 3), so a tick takes its pages. */
async function measured(timeout = 60000) {
  const until = Date.now() + timeout;
  for (;;) {
    const sizes = await apiCall(token, "GET", `${base}/${project.uuid}/file/page-sizes`);
    const waiting = sizes.status === 200 ? sizes.body.filter((e) => e.status !== "failed" && (e.page_count === null || e.pages.length < e.page_count)) : null;
    if (waiting && waiting.length === 0) return sizes.body;
    if (Date.now() > until) throw new Error(`sizes not in after ${timeout / 1000} s: ${sizes.status} ${JSON.stringify(waiting)}`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function uploadTab(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  const [first] = await sheetsOf(token, base, project.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff${first ? `/${first.uuid}` : ""}`);
  if (first) {
    await page.locator("[data-add-sheets]").click({ timeout: 20000 });
    await page.getByRole("menuitem", { name: "Add Pages" }).click();
  } else {
    await page.locator("[data-add-sheets-empty]").click({ timeout: 20000 });
  }
  await dialog(page).getByRole("tab", { name: "Upload drawing" }).click();
  await dialog(page).getByText("Drag PDF, PNG, JPG or TIFF here, or click to choose files").waitFor();
  await dialog(page).getByText("Uploaded files land in the project root and appear in the tree as they arrive, ticked by size.").waitFor();
}

await run("f5-s7", [
  {
    title: "AC1: a PDF and a PNG dropped in: both uploaded to the project root, nothing loaded until Load; Load takes every page",
    run: async ({ page }) => {
      await uploadTab(page);
      // The screen's own sizes answers, latest first: a tick before the PDF's sizes reach the
      // screen takes no pages (found 2026-10-19, reported; not this fixture's subject).
      let screenSizes = [];
      page.on("response", async (r) => {
        if (r.url().includes("/file/page-sizes") && r.status() === 200) screenSizes = await r.json().catch(() => screenSizes);
      });
      await dialog(page).locator("[data-upload-input]").setInputFiles([
        { name: "Two pages.pdf", mimeType: "application/pdf", buffer: makePdf(letterPages(2, "Two")) },
        { name: "Site.png", mimeType: "image/png", buffer: makePng(800, 600) },
      ]);
      // Back on the tree, each file there once it lands (D-310 5).
      for (const name of ["Two pages.pdf", "Site.png"]) {
        await fileRow(page, name).getByRole("checkbox").and(page.locator(":enabled")).waitFor({ timeout: 60000 });
      }
      await measured();
      const until = Date.now() + 30000;
      while (!screenSizes.some((e) => e.page_count === 2 && e.pages.length === 2) && Date.now() < until) await page.waitForTimeout(250);
      const files = (await apiCall(token, "GET", `${base}/${project.uuid}/file`)).body;
      const atRoot = files.filter((f) => f.folder_uuid === null).map((f) => f.file_name).sort();
      expect(atRoot.join() === "Site.png,Two pages.pdf", `at the root: ${atRoot.join(", ")}`);
      const before = await sheetsOf(token, base, project.uuid);
      expect(before.length === 0, `${before.length} sheets loaded without Load`);
      await fileRow(page, "Two pages.pdf").getByRole("checkbox").check();
      await fileRow(page, "Site.png").getByRole("checkbox").check();
      const load = dialog(page).locator("[data-load-pages]");
      const label = (await load.textContent()).trim();
      expect(label === "Load 3 pages", `button reads ${label}`);
      for (const tick of ["[data-auto-name]", "[data-auto-scale]"]) {
        if (await dialog(page).locator(tick).isChecked()) await dialog(page).locator(tick).uncheck();
      }
      await load.click();
      await page.locator('[data-load-progress][data-total="3"]').waitFor({ timeout: 15000 });
      await page.locator("[data-load-progress]").waitFor({ state: "detached", timeout: 120000 });
      await page.waitForURL(new RegExp(`/project/${project.uuid}/takeoff/[0-9a-f-]{36}$`), { timeout: 15000 });
      const sheets = await sheetsOf(token, base, project.uuid);
      expect(sheets.length === 3, `${sheets.length} sheets, not 3`);
      return `both at the project root; 0 sheets before Load; "${label}" → 3 sheets (2 + 1); landed on takeoff`;
    },
  },
  {
    title: "AC2: a .dwg is skipped: \"Skipped {name}\", \"Sheets can be PDF, PNG, JPG or TIFF.\"",
    run: async ({ page }) => {
      await uploadTab(page);
      await dialog(page).locator("[data-upload-input]").setInputFiles([
        { name: "Site plan.dwg", mimeType: "application/octet-stream", buffer: Buffer.from("AC1027 not really") },
      ]);
      await page.getByText("Skipped Site plan.dwg").waitFor({ timeout: 10000 });
      await page.getByText("Sheets can be PDF, PNG, JPG or TIFF.").waitFor();
      const files = (await apiCall(token, "GET", `${base}/${project.uuid}/file`)).body;
      expect(!files.some((f) => f.file_name === "Site plan.dwg"), "the .dwg was uploaded");
      return "Skipped Site plan.dwg · Sheets can be PDF, PNG, JPG or TIFF. · nothing uploaded";
    },
  },
  {
    title: "AC3: the PNG becomes a one-page sheet at its own proportions (wrapped into a PDF on the worker)",
    run: async () => {
      const drawings = (await apiCall(token, "GET", `${base}/${project.uuid}/drawing/file`)).body;
      const png = drawings.find((d) => d.display_name === "Site.png");
      expect(png && png.page_count === 1, `the PNG's drawing: ${JSON.stringify(png)}`);
      const [sheet] = await preparedSheets(token, base, project.uuid, png.uuid);
      const ratio = sheet.width_pt / sheet.height_pt;
      expect(Math.abs(ratio - 800 / 600) < 0.01, `the sheet is ${sheet.width_pt} x ${sheet.height_pt}, ratio ${ratio.toFixed(3)}`);
      return `one sheet, ${sheet.width_pt} x ${sheet.height_pt} pt (4:3, as the image)`;
    },
  },
]);

// F5-S7: Upload drawing, the dialog's second tab. Files go to the project root through
// the multipart path (D-27) and every page loads; an image is wrapped into a PDF on the
// worker (D-36 Q3).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s7.mjs

import { APP, apiCall, expect, run, SEEDED, signInAs, fixtureOwner } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, makePdf, makePng, preparedSheets, sheetsOf } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S7 upload");
const project = await makeProject(token, base, { name: "Upload here" });

const dialog = (page) => page.getByRole("dialog");

async function uploadTab(page) {
  await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
  await page.goto(`${APP}/project/${project.uuid}/takeoff`);
  await page.getByRole("button", { name: "Add sheets" }).first().click();
  await dialog(page).getByRole("tab", { name: "Upload drawing" }).click();
  await dialog(page).getByText("Drag PDF, PNG, JPG or TIFF here, or click to choose files").waitFor();
  await dialog(page).getByText("Uploaded files land in the project root — file them from the Files page.").waitFor();
}

await run("f5-s7", [
  {
    title: "AC1: a PDF and a PNG dropped in: both uploaded to the project root, every page loaded, \"Sheets added\"",
    run: async ({ page }) => {
      await uploadTab(page);
      await dialog(page).locator("[data-upload-input]").setInputFiles([
        { name: "Two pages.pdf", mimeType: "application/pdf", buffer: makePdf(letterPages(2, "Two")) },
        { name: "Site.png", mimeType: "image/png", buffer: makePng(800, 600) },
      ]);
      await page.getByText("Sheets added").waitFor({ timeout: 30000 });
      await page.waitForURL(new RegExp(`/project/${project.uuid}/takeoff/[0-9a-f-]{36}$`), { timeout: 15000 });
      const files = (await apiCall(token, "GET", `${base}/${project.uuid}/file`)).body;
      const atRoot = files.filter((f) => f.folder_uuid === null).map((f) => f.file_name).sort();
      expect(atRoot.join() === "Site.png,Two pages.pdf", `at the root: ${atRoot.join(", ")}`);
      const sheets = await sheetsOf(token, base, project.uuid);
      expect(sheets.length === 3, `${sheets.length} sheets, not 3`);
      return `both at the project root; 3 sheets (2 + 1); landed on takeoff`;
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

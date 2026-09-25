// F4-S25: the Sheets block, kept as it was until F5 replaces it. A PDF uploaded there
// still renders to Ready sheets; the same PDF put into Plans through the file browser is
// a file and makes no sheet (D-27).
//
//   docker compose --profile browser run --rm browser node scripts/f4-s25.mjs

import { apiCall, expect, run } from "./lib/bench.mjs";
import { folderPaths, freshWorkspace, makeProject, openFiles } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S25 sheets");
const job = await makeProject(token, base, { name: "Sheets job", seed_folders: true });

// One page, enough for the worker to render. PyMuPDF rebuilds the missing xref.
const PDF = Buffer.from(
  [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj",
    "trailer<</Root 1 0 R>>",
    "%%EOF",
  ].join("\n"),
);
const sheets = async () => (await apiCall(token, "GET", `${base}/${job.uuid}/drawing/sheet`)).body;

await run("f4-s25", [
  {
    title: "AC1 — a PDF through the Sheets block renders to a Ready sheet, as before F4",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await page.locator('input[type=file][accept="application/pdf"]').setInputFiles({
        name: "A1.pdf",
        mimeType: "application/pdf",
        buffer: PDF,
      });
      await page.getByText("Ready", { exact: true }).first().waitFor({ timeout: 60000 });
      const list = await sheets();
      expect(list.length === 1 && list[0].render_status === "ready", JSON.stringify(list.map((s) => s.render_status)));
      return "1 sheet, ready";
    },
  },
  {
    title: "AC2 — the same PDF into Plans through the file browser is a file, and makes no sheet",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await page.locator('[data-file-browser] [data-tree-folder="Plans"]').click();
      await page.locator("[data-upload-files]").setInputFiles({ name: "A1.pdf", mimeType: "application/pdf", buffer: PDF });
      const picker = page.getByRole("dialog", { name: "Where should these files go?" });
      await picker.getByRole("button", { name: "Confirm upload" }).click();
      await page.getByText("Uploaded 1 file").waitFor({ timeout: 30000 });
      await page.waitForTimeout(5000);
      const plans = (await folderPaths(token, base, job.uuid)).get("Plans");
      const files = (await apiCall(token, "GET", `${base}/${job.uuid}/file`)).body.filter((f) => f.folder_uuid === plans.uuid);
      const list = await sheets();
      expect(files.length === 1 && files[0].uploaded_at, `files in Plans: ${files.length}`);
      expect(list.length === 1, `${list.length} sheets after the Plans upload, not 1`);
      return "a file in Plans · still 1 sheet five seconds later";
    },
  },
]);

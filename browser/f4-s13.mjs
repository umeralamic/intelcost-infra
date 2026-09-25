// F4-S13: Perform Takeoff, from the dashboard row and from Project Home, one decision.
// A ready sheet opens takeoff on it; no sheet lands on Project Home with the sentence,
// never on a route with no page.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s13.mjs

import { APP, apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S13 takeoff");
const withSheet = await makeProject(token, base, { name: "Has a sheet" });
const bare = await makeProject(token, base, { name: "No sheets" });

// One page, enough for the worker to render. PyMuPDF rebuilds the missing xref.
const PDF = [
  "%PDF-1.4",
  "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj",
  "trailer<</Root 1 0 R>>",
  "%%EOF",
].join("\n");

/** Upload through the Sheets block's own path, from inside the page (the page, not
 *  Node, can reach the presigned storage host), then wait for the render. */
async function giveItASheet(page) {
  const drawing = `${base}/${withSheet.uuid}/drawing`;
  const ticket = await apiCall(token, "POST", `${drawing}/file`, {
    display_name: "A1.pdf",
    content_type: "application/pdf",
    byte_size: PDF.length,
  });
  expect(ticket.status === 201, `drawing ticket: ${ticket.status}`);
  const put = await page.evaluate(
    async ([url, body]) => (await fetch(url, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body })).status,
    [ticket.body.upload_url, PDF],
  );
  expect(put === 200, `PUT: ${put}`);
  await apiCall(token, "POST", `${drawing}/file/${ticket.body.file.uuid}/complete`);
  for (let i = 0; i < 60; i += 1) {
    const sheets = (await apiCall(token, "GET", `${drawing}/sheet`)).body;
    if (sheets.some((s) => s.render_status === "ready")) return sheets[0];
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("the sheet never rendered");
}

await run("f4-s13", [
  {
    title: "AC1 — a project with a ready sheet: the row's ruler opens takeoff on it",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      const sheet = await giveItASheet(page);
      await page.reload();
      await page.getByRole("button", { name: "Perform takeoff for Has a sheet" }).click();
      await page.waitForURL(new RegExp(`/project/${withSheet.uuid}/takeoff/${sheet.uuid}$`), { timeout: 15000 });
      return `landed on /project/…/takeoff/${sheet.uuid.slice(0, 8)}…`;
    },
  },
  {
    title: "AC2 — a project with no sheet: the ruler lands on Project Home with the sentence, not a 404",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await page.getByRole("button", { name: "Perform takeoff for No sheets" }).click();
      await page.waitForURL(new RegExp(`/project/${bare.uuid}\\?takeoff=no-sheets$`), { timeout: 15000 });
      await page.locator("[data-no-sheets]").waitFor();
      // Exact: the empty Sheets block's own heading reads "No sheets yet".
      await page.getByRole("heading", { name: "No sheets", exact: true }).waitFor();
      expect((await page.getByText("Page not found").count()) === 0, "a 404");
      return "Project Home with the sentence";
    },
  },
  {
    title: "AC3/AC4 — Project Home's button reaches the same place; a double press navigates once",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await page.goto(`${APP}/project/${bare.uuid}`);
      const button = page.getByRole("button", { name: "Perform Takeoff" });
      await button.waitFor({ timeout: 15000 });
      const before = await page.evaluate(() => history.length);
      await button.dblclick();
      await page.locator("[data-no-sheets]").waitFor({ timeout: 15000 });
      const after = await page.evaluate(() => history.length);
      expect(after - before <= 1, `history grew by ${after - before}`);
      await page.goto(`${APP}/project/${withSheet.uuid}`);
      await page.getByRole("button", { name: "Perform Takeoff" }).click();
      await page.waitForURL(new RegExp(`/project/${withSheet.uuid}/takeoff/`), { timeout: 15000 });
      return `same destinations as the row · one navigation for a double press (+${after - before})`;
    },
  },
]);

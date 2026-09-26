// F5-S6: Choose pages, then Load N pages. Thumbnails drawn in the browser with pdf.js
// (D-36 Q1), three at a time.
//
//   docker compose --profile browser run --rm browser node scripts/f5-s6.mjs
//
// "Five": Five.pdf (5 pages). "Big": Big.pdf (150 pages). "Mixed": Good.pdf (2 pages) and
// Broken.pdf (not a PDF inside), both in Plans.

import { APP, apiCall, expect, run, SEEDED, signInAs, fixtureOwner } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, makePdf, sheetsOf, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S6 pages");
const five = await makeProject(token, base, { name: "Five" });
const big = await makeProject(token, base, { name: "Big" });
const mixed = await makeProject(token, base, { name: "Mixed" });

const dialog = (page) => page.getByRole("dialog");
const section = (page, name) => dialog(page).locator(`[data-page-file="${name}"]`);
const pageBox = (page, name, n) => section(page, name).locator(`[data-page="${n}"]`).getByRole("checkbox");

/** Takeoff for a project, the dialog open, `names` ticked (opening Plans), then Choose pages. */
async function choose(page, project, names) {
  await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
  await page.goto(`${APP}/project/${project.uuid}/takeoff`);
  await page.getByRole("button", { name: "Add sheets" }).first().click();
  await dialog(page).locator("[data-load-tree]").waitFor({ timeout: 15000 });
  const plans = dialog(page).locator('[data-load-folder="Plans"]');
  await plans.getByRole("button", { name: "Open Plans" }).click();
  for (const name of names) await dialog(page).locator(`[data-load-file="${name}"]`).getByRole("checkbox").check();
  await dialog(page).getByRole("button", { name: /^Choose pages/ }).click();
}

await run("f5-s6", [
  {
    title: "setup: Five.pdf, Big.pdf (150 pages), Good.pdf and Broken.pdf uploaded into Plans",
    run: async ({ page }) => {
      await uploadAll(page, token, base, five.uuid, [{ name: "Five.pdf", buffer: makePdf(letterPages(5, "Five")), folder: "Plans" }], workspace.uuid);
      await uploadAll(page, token, base, big.uuid, [{ name: "Big.pdf", buffer: makePdf(letterPages(150, "Big")), folder: "Plans" }], workspace.uuid);
      await uploadAll(page, token, base, mixed.uuid, [
        { name: "Good.pdf", buffer: makePdf(letterPages(2, "Good")), folder: "Plans" },
        { name: "Broken.pdf", buffer: Buffer.from("this is not a PDF at all, only its name says so"), folder: "Plans" },
      ], workspace.uuid);
      return "four files";
    },
  },
  {
    title: "AC1: every page a thumbnail, \"Page n\", all ticked; \"{sel} of {pageCount} pages\" follows the ticks; Select all and Clear",
    run: async ({ page }) => {
      await choose(page, five, ["Five.pdf"]);
      await dialog(page).getByRole("heading", { name: "Choose pages to load" }).or(page.getByText("Choose pages to load")).first().waitFor({ timeout: 20000 });
      const count = () => section(page, "Five.pdf").locator("[data-page-count]").textContent();
      expect((await count()) === "5 of 5 pages", `start: ${await count()}`);
      for (let n = 1; n <= 5; n += 1) {
        expect(await pageBox(page, "Five.pdf", n).isChecked(), `page ${n} not ticked`);
        await section(page, "Five.pdf").locator(`[data-page="${n}"]`).getByText(`Page ${n}`).waitFor();
      }
      await section(page, "Five.pdf").locator('[data-thumbnail="drawn"]').nth(4).waitFor({ timeout: 20000 });
      await pageBox(page, "Five.pdf", 2).uncheck();
      expect((await count()) === "4 of 5 pages", `after one untick: ${await count()}`);
      await section(page, "Five.pdf").getByRole("button", { name: "Clear" }).click();
      expect((await count()) === "0 of 5 pages", `after Clear: ${await count()}`);
      await section(page, "Five.pdf").getByRole("button", { name: "Select all" }).click();
      expect((await count()) === "5 of 5 pages", `after Select all: ${await count()}`);
      return "5 thumbnails drawn, all ticked · 5 → 4 → 0 → 5 of 5 pages";
    },
  },
  {
    title: "AC2: untick two of five, \"Load 3 pages\": takeoff opens on the first loaded sheet, \"Added 3 pages\"",
    run: async ({ page }) => {
      await choose(page, five, ["Five.pdf"]);
      await pageBox(page, "Five.pdf", 2).waitFor({ timeout: 20000 });
      await pageBox(page, "Five.pdf", 2).uncheck();
      await pageBox(page, "Five.pdf", 4).uncheck();
      const button = dialog(page).locator("[data-load-pages]");
      expect((await button.textContent()).trim() === "Load 3 pages", `button reads ${await button.textContent()}`);
      await button.click();
      await page.getByText("Added 3 pages").waitFor({ timeout: 15000 });
      await page.waitForURL(new RegExp(`/project/${five.uuid}/takeoff/[0-9a-f-]{36}$`), { timeout: 15000 });
      const sheets = await sheetsOf(token, base, five.uuid);
      const pages = sheets.map((s) => s.page_number).sort().join();
      expect(pages === "1,3,5", `sheets for pages ${pages}`);
      const landed = page.url().split("/").pop();
      expect(landed === sheets.find((s) => s.page_number === 1).uuid, "did not land on the first loaded sheet");
      return "Load 3 pages → Added 3 pages, on Page 1; sheets for pages 1, 3, 5";
    },
  },
  {
    title: "AC3: pages already loaded show \"loaded\", ticked and locked",
    run: async ({ page }) => {
      await choose(page, five, ["Five.pdf"]);
      await pageBox(page, "Five.pdf", 1).waitFor({ timeout: 20000 });
      for (const n of [1, 3, 5]) {
        const box = pageBox(page, "Five.pdf", n);
        expect((await box.isChecked()) && (await box.isDisabled()), `page ${n} not ticked and locked`);
        await section(page, "Five.pdf").locator(`[data-page="${n}"]`).getByText("loaded").waitFor();
      }
      expect(!(await pageBox(page, "Five.pdf", 2).isDisabled()), "page 2 is locked");
      const button = (await dialog(page).locator("[data-load-pages]").textContent()).trim();
      expect(button === "Load 2 pages", `button reads ${button}`);
      return "pages 1, 3, 5 loaded, ticked, locked · Load 2 pages (only the new)";
    },
  },
  {
    title: "AC4: a 150-page set shows its first thumbnails within a second and never draws more than three at a time",
    run: async ({ page }) => {
      await choose(page, big, ["Big.pdf"]);
      const chooser = dialog(page).locator("[data-page-chooser]");
      await chooser.waitFor({ timeout: 20000 });
      const shownAt = Date.now();
      await chooser.locator('[data-thumbnail="drawn"]').first().waitFor({ timeout: 5000 });
      const firstAfter = Date.now() - shownAt;
      // Sample the concurrency while the first dozen draw.
      let peak = 0;
      for (let i = 0; i < 20; i += 1) {
        peak = Math.max(peak, Number(await chooser.getAttribute("data-thumb-peak")));
        await page.waitForTimeout(100);
      }
      const drawn = Number(await chooser.getAttribute("data-thumb-drawn"));
      const count = (await section(page, "Big.pdf").locator("[data-page-count]").textContent()).trim();
      expect(firstAfter <= 1000, `the first thumbnail took ${firstAfter} ms`);
      expect(peak >= 1 && peak <= 3, `the peak was ${peak} at once`);
      expect(count === "150 of 150 pages", `count: ${count}`);
      return `first thumbnail ${firstAfter} ms after the step showed; peak ${peak} at once; ${drawn} drawn in 2 s; ${count}`;
    },
  },
  {
    title: "AC5: a file pdf.js cannot open is named with why (\"Couldn't open Broken.pdf\", not a readable PDF), and the others still load",
    run: async ({ page }) => {
      await choose(page, mixed, ["Good.pdf", "Broken.pdf"]);
      // Since the Block B check: one toast per file, with the reason.
      await page.getByText("Couldn't open Broken.pdf").waitFor({ timeout: 20000 });
      await page.getByText("It isn't a readable PDF.").waitFor();
      await section(page, "Good.pdf").waitFor({ timeout: 15000 });
      expect((await section(page, "Broken.pdf").count()) === 0, "Broken.pdf reached the page step");
      await dialog(page).locator("[data-load-pages]").click();
      await page.getByText("Added 2 pages").waitFor({ timeout: 15000 });
      const sheets = await sheetsOf(token, base, mixed.uuid);
      expect(sheets.length === 2, `${sheets.length} sheets`);
      const listed = await apiCall(token, "GET", `${base}/${mixed.uuid}/drawing/file`);
      return `"Couldn't open Broken.pdf" · "It isn't a readable PDF."; Good.pdf's 2 pages loaded (${listed.body.length} drawing)`;
    },
  },
]);

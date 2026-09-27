// F5-S6: Choose pages, then Load N pages. Thumbnails made by the worker and shown as plain
// images (D-41, which replaced D-36 Q1's pdf.js in the browser).
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
      await section(page, "Five.pdf").locator('[data-thumbnail="shown"] img').nth(4).waitFor({ timeout: 60000 });
      await pageBox(page, "Five.pdf", 2).uncheck();
      expect((await count()) === "4 of 5 pages", `after one untick: ${await count()}`);
      await section(page, "Five.pdf").getByRole("button", { name: "Clear" }).click();
      expect((await count()) === "0 of 5 pages", `after Clear: ${await count()}`);
      await section(page, "Five.pdf").getByRole("button", { name: "Select all" }).click();
      expect((await count()) === "5 of 5 pages", `after Select all: ${await count()}`);
      return "5 thumbnails shown, all ticked · 5 → 4 → 0 → 5 of 5 pages";
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
    title: "AC4: a 150-page set lays out every tile at once and shows its thumbnails, made on upload by the worker, as plain images",
    run: async ({ page }) => {
      await choose(page, big, ["Big.pdf"]);
      const chooser = dialog(page).locator("[data-page-chooser]");
      await chooser.waitFor({ timeout: 20000 });
      const shownAt = Date.now();
      await section(page, "Big.pdf").locator("[data-page]").nth(149).waitFor({ timeout: 5000 });
      const laidOut = Date.now() - shownAt;
      await section(page, "Big.pdf").locator('[data-thumbnail="shown"] img').first().waitFor({ timeout: 5000 });
      const firstAfter = Date.now() - shownAt;
      // Uploaded in setup, so the worker has had its head start; the rest arrive as made.
      // Made, not necessarily fetched: tiles load lazily, as they are scrolled to.
      await section(page, "Big.pdf").locator('[data-thumbnail="shown"] img').nth(149).waitFor({ state: "attached", timeout: 120000 });
      const all = Date.now() - shownAt;
      const count = (await section(page, "Big.pdf").locator("[data-page-count]").textContent()).trim();
      expect(count === "150 of 150 pages", `count: ${count}`);
      const srcs = await section(page, "Big.pdf").locator("[data-thumbnail] img").evaluateAll((imgs) => imgs.map((i) => new URL(i.src).pathname));
      expect(srcs.every((p) => p.endsWith(".webp")), `a thumbnail that is not the worker's WebP: ${srcs.find((p) => !p.endsWith(".webp"))}`);
      return `150 tiles ${laidOut} ms after the step showed; first thumbnail ${firstAfter} ms; all 150 by ${all} ms; ${count}`;
    },
  },
  {
    title: "AC5: a file the worker cannot open says so in its section (\"Couldn't prepare the pages of Broken.pdf\"), and the others still load",
    run: async ({ page }) => {
      await choose(page, mixed, ["Good.pdf", "Broken.pdf"]);
      await section(page, "Broken.pdf").getByText("Couldn't prepare the pages of Broken.pdf. The file may be damaged.").waitFor({ timeout: 30000 });
      await section(page, "Good.pdf").locator('[data-thumbnail="shown"] img').nth(1).waitFor({ timeout: 30000 });
      expect((await section(page, "Broken.pdf").locator("[data-page]").count()) === 0, "Broken.pdf offered pages");
      const button = (await dialog(page).locator("[data-load-pages]").textContent()).trim();
      expect(button === "Load 2 pages", `button reads ${button}`);
      await dialog(page).locator("[data-load-pages]").click();
      await page.getByText("Added 2 pages").waitFor({ timeout: 15000 });
      const sheets = await sheetsOf(token, base, mixed.uuid);
      expect(sheets.length === 2, `${sheets.length} sheets`);
      const listed = await apiCall(token, "GET", `${base}/${mixed.uuid}/drawing/file`);
      return `"Couldn't prepare the pages of Broken.pdf. The file may be damaged."; Good.pdf's 2 pages loaded (${listed.body.length} drawing)`;
    },
  },
]);

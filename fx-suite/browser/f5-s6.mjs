// F5-S6: a file's pages, then Load N pages. Thumbnails made by the worker and shown as plain
// images (D-41, which replaced D-36 Q1's pdf.js in the browser).
//
//   docker compose --profile browser run --rm browser node scripts/f5-s6.mjs
//
// "Five": Five.pdf (5 pages). "Big": Big.pdf (150 pages). "Mixed": Good.pdf (2 pages) and
// Broken.pdf (not a PDF inside), both in Plans.
//
// Updated 2026-10-19 to today's screens (D-619): "Choose pages" is no longer a second step. The
// load screen is one (D-310 1): a file ticked in the tree, then put in focus, shows its pages on
// the right, and the one Load button loads them. What changed, and the decision behind it:
// - No "Open Plans" click: every folder of the tree is open from the start (D-310, D-313).
// - No "Choose pages" button and no "Choose pages to load" heading (D-310 1): the file's section
//   is waited for instead. A letter-size file ticked in the tree takes every page (it has no
//   drawing-size page, D-310 2), so the figures stand: "5 of 5 pages", all ticked.
// - "Added N pages" is gone: Load opens the progress view (D-321, D-322), which closes itself
//   and opens the first sheet when every sheet is ready. The run's count is checked on it.
// - One file in focus at a time (D-310 1): AC5 puts Broken.pdf, then Good.pdf, in focus.
// - The sizes are waited for (the api's page-sizes) before a tick: a tick takes the pages the
//   sizes say (D-310 2, 3).

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { letterPages, makePdf, sheetsOf, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S6 pages");
const five = await makeProject(token, base, { name: "Five" });
const big = await makeProject(token, base, { name: "Big" });
const mixed = await makeProject(token, base, { name: "Mixed" });

/** The load screen: the one dialog that carries the tree and the pages (D-310). */
const dialog = (page) => page.getByRole("dialog").filter({ has: page.locator("[data-load-dialog]") });
const section = (page, name) => dialog(page).locator(`[data-page-file="${name}"]`);
const pageBox = (page, name, n) => section(page, name).locator(`[data-page="${n}"]`).getByRole("checkbox");
const fileRow = (page, name) => dialog(page).locator(`[data-load-file="${name}"]`);

/** Every PDF of the project measured, or failed (D-310 3), so a tick takes its pages. */
async function measured(project, timeout = 120000) {
  const until = Date.now() + timeout;
  for (;;) {
    const sizes = await apiCall(token, "GET", `${base}/${project.uuid}/file/page-sizes`);
    const waiting = sizes.status === 200 ? sizes.body.filter((e) => e.status !== "failed" && (e.page_count === null || e.pages.length < e.page_count)) : null;
    if (waiting && waiting.length === 0) return sizes.body;
    if (Date.now() > until) throw new Error(`sizes not in after ${timeout / 1000} s: ${sizes.status} ${JSON.stringify(waiting?.map((e) => [e.status, e.page_count, e.pages.length]))}`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

/** Takeoff for a project, the load screen open (the empty state's Add sheets, or the Sheets
 *  panel's + → Add Pages), `names` ticked in the tree, the first put in focus. */
async function choose(page, project, names) {
  await measured(project);
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  const [first] = await sheetsOf(token, base, project.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff${first ? `/${first.uuid}` : ""}`);
  // The screen's own sizes answer, before any tick: the tree is tickable before it lands, and a
  // tick then takes no pages (found 2026-10-19, reported; not this fixture's subject).
  const sized = page.waitForResponse((r) => r.url().includes("/file/page-sizes") && r.status() === 200, { timeout: 20000 });
  if (first) {
    await page.locator("[data-add-sheets]").click({ timeout: 20000 });
    await page.getByRole("menuitem", { name: "Add Pages" }).click();
  } else {
    await page.locator("[data-add-sheets-empty]").click({ timeout: 20000 });
  }
  await dialog(page).locator("[data-load-tree]").waitFor({ timeout: 15000 });
  await sized;
  // A click, not check(): a file with no pages to offer (Broken.pdf) stays unticked.
  for (const name of names) await fileRow(page, name).getByRole("checkbox").click({ timeout: 15000 });
  await focus(page, names[0]);
}

/** A file in focus: its pages on the right. */
const focus = (page, name) => fileRow(page, name).getByText(name, { exact: true }).click();

/** No AI read on these sheets (the brief's rule): both load ticks off before a Load. */
async function noAi(page) {
  for (const tick of ["[data-auto-name]", "[data-auto-scale]"]) {
    const box = dialog(page).locator(tick);
    if (await box.isChecked()) await box.uncheck();
  }
}

/** Load, then the progress view (D-321, D-322) on `total` sheets until it closes itself on
 *  the first sheet, every one ready. */
async function loadAndLand(page, project, total) {
  await noAi(page);
  await dialog(page).locator("[data-load-pages]").click();
  await page.locator(`[data-load-progress][data-total="${total}"]`).waitFor({ timeout: 15000 });
  await page.locator("[data-load-progress]").waitFor({ state: "detached", timeout: 120000 });
  await page.waitForURL(new RegExp(`/project/${project.uuid}/takeoff/[0-9a-f-]{36}$`), { timeout: 15000 });
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
      await section(page, "Five.pdf").waitFor({ timeout: 20000 });
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
    title: "AC2: untick two of five, \"Load 3 pages\": takeoff opens on the first loaded sheet, 3 sheets loaded",
    run: async ({ page }) => {
      await choose(page, five, ["Five.pdf"]);
      await pageBox(page, "Five.pdf", 2).waitFor({ timeout: 20000 });
      await pageBox(page, "Five.pdf", 2).uncheck();
      await pageBox(page, "Five.pdf", 4).uncheck();
      const button = dialog(page).locator("[data-load-pages]");
      expect((await button.textContent()).trim() === "Load 3 pages", `button reads ${await button.textContent()}`);
      await loadAndLand(page, five, 3);
      const sheets = await sheetsOf(token, base, five.uuid);
      const pages = sheets.map((s) => s.page_number).sort().join();
      expect(pages === "1,3,5", `sheets for pages ${pages}`);
      const landed = page.url().split("/").pop();
      expect(landed === sheets.find((s) => s.page_number === 1).uuid, "did not land on the first loaded sheet");
      return "Load 3 pages → the progress view on 3 sheets, closed on Page 1; sheets for pages 1, 3, 5";
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
      await section(page, "Big.pdf").waitFor({ timeout: 20000 });
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
      return `150 tiles ${laidOut} ms after the section showed; first thumbnail ${firstAfter} ms; all 150 by ${all} ms; ${count}`;
    },
  },
  {
    title: "AC5: a file the worker cannot open says so in its section (\"Couldn't prepare the pages of Broken.pdf\"), and the others still load",
    run: async ({ page }) => {
      await choose(page, mixed, ["Good.pdf", "Broken.pdf"]);
      await focus(page, "Broken.pdf");
      await section(page, "Broken.pdf").getByText("Couldn't prepare the pages of Broken.pdf. The file may be damaged.").waitFor({ timeout: 30000 });
      expect((await section(page, "Broken.pdf").locator("[data-page]").count()) === 0, "Broken.pdf offered pages");
      await focus(page, "Good.pdf");
      await section(page, "Good.pdf").locator('[data-thumbnail="shown"] img').nth(1).waitFor({ timeout: 30000 });
      const button = (await dialog(page).locator("[data-load-pages]").textContent()).trim();
      expect(button === "Load 2 pages", `button reads ${button}`);
      await loadAndLand(page, mixed, 2);
      const sheets = await sheetsOf(token, base, mixed.uuid);
      expect(sheets.length === 2, `${sheets.length} sheets`);
      const listed = await apiCall(token, "GET", `${base}/${mixed.uuid}/drawing/file`);
      return `"Couldn't prepare the pages of Broken.pdf. The file may be damaged."; Good.pdf's 2 pages loaded (${listed.body.length} drawing)`;
    },
  },
]);

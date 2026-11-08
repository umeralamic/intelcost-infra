// C48, Saved sections (D-831): the section's legend and gridlines, sections saved with the project, their cut
// markers, sharing and delete protection, and the PDF.
//
//   ./fx-suite.sh run c48-saved-sections
//
// The world: one throwaway project, one grading page with the flat pad (lib/grading-world.mjs), calculated.
//   1. A-A′ drawn with two clicks across the pad: the pane opens on "A-A′", the api keeps it, a marker A on
//      the plan; the legend's swatches (Existing grade, Proposed grade), labelled elevation gridlines, the help
//      line.
//   2. "+ New section" draws B-B′; the dropdown switches between them; B-B′ renamed "Pad X-X′"; after a reload
//      both markers are there and clicking the X marker opens it.
//   3. Calculate again: the open section draws again from the new result.
//   4. A colleague (estimator) sees a section the owner draws without a reload (realtime); a viewer sees both,
//      cannot rename or delete them (the buttons off), and the api refuses the viewer's create and delete (403).
//   5. Delete protection: with the owner's work protected ("chosen", nobody allowed), the estimator's delete of
//      the owner's section is refused naming the owner; the owner deletes it.
//   6. PDF: "All" downloads one page per section on the sheet, Letter landscape, vector (no images), with the
//      note "Derived from IntelCost takeoff".

import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";

import { apiCall, apiLogin, expect, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { calculate, flatPad, grading, gradingSheets, openSheet } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C48 Saved sections");
const project = await makeProject(token, base, { name: "Saved sections" });
const g = grading(token, base, project);
let sheet;
let estimator;
let viewer;
const sections = async (t = token) => (await apiCall(t, "GET", `${base}/${project.uuid}/earthwork/section`)).body;
const paneName = (page) => page.locator("[data-section-pane]").getAttribute("data-section-name");

/** The sheet opened; once more if a cold dev server has not drawn it in 30 s. */
const open = (page) => openSheet(page, project, sheet, "earthwork").catch(() => openSheet(page, project, sheet, "earthwork"));

/** Two clicks on the sheet at page fractions, with the sheet's box read after the pane has taken its room. */
async function drawLine(page, a, b) {
  await page.locator("[data-section-drawing]").waitFor({ timeout: 10000 });
  const box = await page.locator("[data-section-layer]").boundingBox();
  await page.mouse.click(box.x + box.width * a[0], box.y + box.height * a[1]);
  await page.mouse.click(box.x + box.width * b[0], box.y + box.height * b[1]);
}
async function waitName(page, name, timeout = 20000) {
  await page.waitForFunction((n) => document.querySelector("[data-section-pane]")?.getAttribute("data-section-name") === n, name, { timeout });
}
async function openMarker(page, end) {
  const line = page.locator(`[data-section-marker="${end}"] line`).first();
  await line.waitFor({ state: "attached", timeout: 20000 });
  // A quarter of the way along: the middle may be where another section crosses it.
  const [a, z] = await line.evaluate((l) => {
    const m = l.getScreenCTM();
    const p = (x, y) => new DOMPoint(x, y).matrixTransform(m);
    const s = p(l.x1.baseVal.value, l.y1.baseVal.value);
    const e = p(l.x2.baseVal.value, l.y2.baseVal.value);
    return [{ x: s.x, y: s.y }, { x: e.x, y: e.y }];
  });
  await page.mouse.click(a.x + (z.x - a.x) * 0.25, a.y + (z.y - a.y) * 0.25);
}

/** A PDF's pages, their sizes, whether any page carries an image, and its words (Flate streams read). */
function readPdf(buffer) {
  const text = buffer.toString("latin1");
  const pages = [...text.matchAll(/\/Type\s*\/Page[^s]/g)].length;
  const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const images = /\/Subtype\s*\/Image/.test(text);
  let words = "";
  for (const m of text.matchAll(/stream\r?\n/g)) {
    const start = m.index + m[0].length;
    const end = text.indexOf("endstream", start);
    try {
      words += inflateSync(buffer.subarray(start, end)).toString("latin1");
    } catch {
      words += text.slice(start, end);
    }
  }
  return { pages, boxes, images, words };
}

await run("c48-saved-sections", [
  {
    title: "setup: a grading page with the flat pad, calculated; an estimator and a viewer seated",
    run: async ({ page }) => {
      // The seats first: a slow first page cannot take their steps with it.
      estimator = await seatedMember(token, workspace.uuid, "estimator");
      viewer = await seatedMember(token, workspace.uuid, "viewer");
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["G-1"]);
      await flatPad(g, sheet);
      await g.assume({ native_suitable: "all" });
      // The first takeoff page compiles on a cold dev server: opened once more if it has not drawn in 30 s.
      await open(page);
      await calculate(page);
      return `${sheet.uuid.slice(0, 8)}; seats ${estimator.email}, ${viewer.email}`;
    },
  },
  {
    title: "D-831 1: A-A′ across the pad is saved, marked on the plan, and drawn with its swatch legend and labelled gridlines",
    run: async ({ page }) => {
      await open(page);
      await page.locator("[data-section-button]").click();
      await drawLine(page, [0.06, 0.3], [0.34, 0.3]);
      await waitName(page, "A-A′");
      await page.waitForFunction(() => document.querySelector("[data-section-select]")?.value !== "local", null, { timeout: 15000 });
      // The calculated surfaces are built for the section first.
      await page.locator('[data-section-pane="view"]').waitFor({ timeout: 120000 });
      const saved = await sections();
      expect(saved.length === 1 && saved[0].name === "A-A′" && saved[0].sheet_uuid === sheet.uuid, `saved ${JSON.stringify(saved)}`);
      expect((await page.locator('[data-section-marker="A"]').count()) === 1, "no marker A on the plan");
      const legend = await page.locator("[data-section-legend-entry]").evaluateAll((e) => e.map((x) => x.getAttribute("data-section-legend-entry")));
      expect(legend[0] === "Existing grade" && legend[1] === "Proposed grade", `legend ${legend}`);
      expect((await page.locator("[data-section-legend] [data-swatch-line]").count()) >= 2, "the legend has no line swatches");
      const grid = await page.locator("[data-section-grid] line").count();
      const labels = await page.locator("[data-section-grid-label]").count();
      expect(grid >= 2 && labels >= 2, `gridlines ${grid}, labels ${labels}`);
      expect(/Hover for elevations/.test(await page.locator("[data-section-help]").innerText()), "no help line");
      return `A-A′ saved; legend ${legend.join(", ")}; ${grid} gridlines, ${labels} labelled`;
    },
  },
  {
    title: "D-831 3: + New section draws B-B′; the dropdown switches; renamed Pad X-X′; after a reload its marker opens it",
    run: async ({ page }) => {
      await open(page);
      await openMarker(page, "A");
      await waitName(page, "A-A′");
      await page.locator("[data-section-new]").click();
      await drawLine(page, [0.2, 0.15], [0.2, 0.45]);
      await waitName(page, "B-B′");
      await page.waitForFunction(() => document.querySelectorAll("[data-section-select] option").length === 2, null, { timeout: 15000 });
      await page.locator("[data-section-select]").selectOption({ label: "A-A′" });
      await waitName(page, "A-A′");
      await page.locator("[data-section-select]").selectOption({ label: "B-B′" });
      await waitName(page, "B-B′");
      await page.locator("[data-section-more]").click();
      await page.getByRole("menuitem", { name: /^Rename/ }).click();
      await page.getByLabel("Section name").fill("Pad X-X′");
      await page.keyboard.press("Enter");
      await waitName(page, "Pad X-X′");
      await waitFor(async () => ((await sections()).some((s) => s.name === "Pad X-X′") ? true : null), "the rename saved", 10000);
      await page.reload();
      await page.locator('[data-section-marker="X"]').waitFor({ state: "attached", timeout: 30000 });
      expect((await page.locator("[data-section-marker]").count()) === 2, "not two markers after the reload");
      await openMarker(page, "X");
      await waitName(page, "Pad X-X′");
      return "A-A′ and Pad X-X′; switched, renamed, reloaded, opened from the plan";
    },
  },
  {
    title: "D-831 3: Calculate again: the open section is drawn again from the new result",
    run: async ({ page }) => {
      await open(page);
      await openMarker(page, "A");
      await waitName(page, "A-A′");
      await page.locator('[data-section-pane="view"]').waitFor({ timeout: 120000 });
      const before = await page.locator("[data-section-figure]").getAttribute("data-section-stations");
      const computed = async () => (await apiCall(token, "GET", `${base}/${project.uuid}/earthwork/result`)).body;
      const was = JSON.stringify(await computed()).match(/"computed_at":"([^"]+)"/)?.[1];
      await calculate(page);
      await waitFor(async () => {
        const now = JSON.stringify(await computed()).match(/"computed_at":"([^"]+)"/)?.[1];
        return now && now !== was ? now : null;
      }, "a new result", 30000);
      await page.locator('[data-section-pane="view"] [data-section-figure="A-A′"]').waitFor({ timeout: 60000 });
      const after = await page.locator("[data-section-figure]").getAttribute("data-section-stations");
      expect(before === after, `stations ${before} then ${after}`);
      return `A-A′ redrawn on the new result (${after})`;
    },
  },
  {
    title: "D-831 4: a colleague sees a new section without a reload; a viewer reads them and cannot change them; the api refuses the viewer",
    run: async ({ page, context }) => {
      // The estimator watches the sheet; the owner draws C-C′ through the api, as the pane does.
      await signInAs(page, estimator.email, estimator.password);
      await open(page);
      await page.locator('[data-section-marker="A"]').waitFor({ state: "attached", timeout: 30000 });
      const made = await apiCall(token, "POST", `${base}/${project.uuid}/earthwork/section`, { sheet_uuid: sheet.uuid, line: [[0.1, 0.38], [0.3, 0.38]] });
      expect(made.status === 201 && made.body.name === "C-C′", `create ${made.status} ${JSON.stringify(made.body)}`);
      const t0 = Date.now();
      await page.locator('[data-section-marker="C"]').waitFor({ state: "attached", timeout: 10000 });
      const seenMs = Date.now() - t0;
      // The viewer: every section listed, Rename gone, Delete off; its own create and delete refused.
      const v = await context.browser().newContext({ viewport: { width: 1440, height: 900 } });
      const vp = await v.newPage();
      await signInAs(vp, viewer.email, viewer.password);
      await open(vp);
      await openMarker(vp, "A");
      await waitName(vp, "A-A′");
      const options = await vp.locator("[data-section-select] option").allInnerTexts();
      expect(options.length === 3, `the viewer sees ${options}`);
      await vp.locator("[data-section-more]").click();
      expect(await vp.getByRole("menuitem", { name: /^Rename/ }).isDisabled(), "Rename on for a viewer");
      expect(await vp.getByRole("menuitem", { name: /^Delete/ }).isDisabled(), "Delete on for a viewer");
      await vp.keyboard.press("Escape");
      const vt = await apiLogin(viewer.email, viewer.password);
      const create = await apiCall(vt, "POST", `${base}/${project.uuid}/earthwork/section`, { sheet_uuid: sheet.uuid, line: [[0.1, 0.1], [0.2, 0.1]] });
      const del = await apiCall(vt, "DELETE", `${base}/${project.uuid}/earthwork/section/${made.body.uuid}`);
      expect(create.status === 403 && del.status === 403, `viewer create ${create.status}, delete ${del.status}`);
      await v.close();
      return `C-C′ on the estimator's plan in ${seenMs} ms; the viewer sees ${options.join(", ")}, read only; api 403 / 403`;
    },
  },
  {
    title: "D-831 5: the owner's work protected: the estimator's delete is refused naming the owner; the owner deletes it",
    run: async () => {
      const list = await sections();
      const c = list.find((s) => s.name === "C-C′");
      const prefs = await apiCall(token, "PATCH", "/api/auth/me", { collaboration_prefs: { delete_protection: "chosen", delete_allowed: [] } });
      expect(prefs.status === 200, `prefs ${prefs.status}`);
      try {
        const et = await apiLogin(estimator.email, estimator.password);
        const refused = await apiCall(et, "DELETE", `${base}/${project.uuid}/earthwork/section/${c.uuid}`);
        expect(refused.status === 409 && /protects their work/.test(JSON.stringify(refused.body)), `estimator delete ${refused.status} ${JSON.stringify(refused.body)}`);
        const gone = await apiCall(token, "DELETE", `${base}/${project.uuid}/earthwork/section/${c.uuid}`);
        expect(gone.status === 200, `owner delete ${gone.status}`);
        expect(!(await sections()).some((s) => s.uuid === c.uuid), "C-C′ still listed");
        return `refused: ${refused.body.detail}; the owner's delete went`;
      } finally {
        await apiCall(token, "PATCH", "/api/auth/me", { collaboration_prefs: { delete_protection: "anyone" } });
      }
    },
  },
  {
    title: "D-831 6: All downloads a vector PDF, one Letter landscape page per section on the sheet, with the note",
    run: async ({ page }) => {
      await open(page);
      await openMarker(page, "A");
      await waitName(page, "A-A′");
      await page.locator('[data-section-pane="view"]').waitFor({ timeout: 120000 });
      const [file] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), (async () => {
          await page.locator("[data-section-export]").click();
          await page.getByRole("menuitem", { name: /^All sections/ }).click();
        })()]);
      const pdf = readPdf(readFileSync(await file.path()));
      expect(pdf.pages >= 2, `${pdf.pages} pages for two sections`);
      expect(pdf.boxes.every(([w, h]) => Math.round(w) === 792 && Math.round(h) === 612), `paper ${JSON.stringify(pdf.boxes)}`);
      expect(!pdf.images, "an image in the PDF: not vector");
      expect(/Derived from IntelCost takeoff/.test(pdf.words), "no note");
      expect(/Section A-A'/.test(pdf.words) && /Section Pad X-X'/.test(pdf.words), "a section's title line missing");
      expect(/V:H \d/.test(pdf.words), "no exaggeration");
      return `${file.suggestedFilename()}: ${pdf.pages} pages, 792 × 612 pt, vector`;
    },
  },
]);

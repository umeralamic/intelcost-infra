// C52, Stitch snapping: one Snap PDF rule for both panes (D-1313, D-1303 item 5; docs/tasks/stitch_snap_rule_tasks.md).
//
//   ./fx-suite.sh run c52-stitch-snap
//
// The world: one throwaway project, two blank pages at the grading world's scale (lib/grading-world.mjs). Each page
// prints makePdf's frame; its top edge is at y = 160 / 792 = 0.2020202 of the page, its nearest corner 540 pt from the
// pick, and the diagonal 280 pt below it, so a pick at x 0.5, 4 px below the top edge, has one printed line in the
// snap's reach (12 + 2 px).
//   1. Snap PDF on (the Earthwork tab's toggle): the pick snaps onto the frame on both panes, the same point.
//   2. Snap PDF off: the same pick lands where it was clicked on both panes, unsnapped.
//   3. Snap PDF on, the sheets' PDFs held back so the lines are still being read: a "snap loading" mark in each pane's
//      bar and at the cursor, the pick waits (no marker yet), and lands snapped on both panes once the lines are read:
//      the same point as step 1.
// The fixture drives the screens; only the world (pages and their scale) is made through the api.

import { expect, run, apiCall } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { gradingSheets, openSheet } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C52 Stitch snap");
const project = await makeProject(token, base, { name: "Stitch snap" });
let sheets;

/** The frame's top edge, as a fraction of the page down (makePdf: 792 − 632 = 160 pt from the top). */
const FRAME_TOP = 160 / 792;
/** The pick: halfway across, this many screen pixels below the frame's top edge (inside the 14 px reach). */
const BELOW_PX = 4;
const PICK_X = 0.5;

const svg = (page, i) => page.locator('svg[role="presentation"]').nth(i);
const shown = (s) => s.sheet_name || `Page ${s.page_number}`;

/** Snap PDF's Earthwork toggle (D-186's own key), set before the page reads it. */
async function snapPdf(page, on) {
  await page.evaluate((v) => localStorage.setItem("takeoff.pdfSnap.earthwork", v), on ? "1" : "0");
  await page.reload();
  await page.locator("[data-canvas-scale]").first().waitFor({ state: "attached", timeout: 30000 });
}

/** The Stitch panel by points, page 2 in the reference pane, both panes settled at one width. */
async function stitchPoints(page) {
  await page.getByRole("button", { name: /Stitch sheets/ }).first().click();
  await page.locator("[data-join-panel]").waitFor({ timeout: 10000 });
  await page.locator('[data-stitch-way="points"]').click();
  await page.getByLabel("Sheet to stitch").selectOption({ label: shown(sheets[1]) });
  await page.waitForFunction(() => document.querySelectorAll('svg[role="presentation"]').length >= 2, null, { timeout: 20000 });
  await page.waitForFunction(
    () => {
      const w = [...document.querySelectorAll('svg[role="presentation"]')].slice(0, 2).map((e) => Math.round(e.getBoundingClientRect().width));
      const key = w.join("/");
      const same = w.length === 2 && w[0] === w[1] && key === window.__c52Panes;
      window.__c52Panes = key;
      return same;
    },
    null,
    { timeout: 20000, polling: 250 },
  );
}

/** Clicks the pick on pane `i` (0 the sheet, 1 the reference pane): x 0.5, BELOW_PX under the frame's top edge. */
async function pick(page, i) {
  const b = await svg(page, i).boundingBox();
  const y = b.y + b.height * FRAME_TOP + BELOW_PX;
  await page.mouse.move(b.x + b.width * PICK_X - 20, y - 20);
  await page.mouse.click(b.x + b.width * PICK_X, y);
  return { heightPx: b.height, widthPx: b.width, clickedY: (y - b.y) / b.height };
}

/** Where point 1 landed on each pane, as stored (page fractions): [the sheet's, the reference pane's]. */
async function landed(page) {
  return page.evaluate(() => {
    const out = { here: null, there: null };
    for (const g of document.querySelectorAll('[data-join-point="1"]')) {
      const at = (g.getAttribute("data-join-at") ?? "").split(",").map(Number);
      if (at.length !== 2) continue;
      out[g.closest("[data-reference-pane]") ? "there" : "here"] = { x: at[0], y: at[1] };
    }
    return out;
  });
}

/** The "snap loading" marks shown: in each pane's bar, and at the cursor with its waiting picks. */
async function marks(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll("[data-snap-loading]")];
    const inRef = (e) => Boolean(e.closest("[data-reference-pane]"));
    return {
      barHere: all.some((e) => e.getAttribute("data-snap-loading") === "toolbar" && !inRef(e)),
      barThere: all.some((e) => e.getAttribute("data-snap-loading") === "toolbar" && inRef(e)),
      cursor: all.filter((e) => e.getAttribute("data-snap-loading") === "cursor").map((e) => ({ waiting: Number(e.getAttribute("data-snap-waiting")), visible: getComputedStyle(e).visibility === "visible", ref: inRef(e) })),
    };
  });
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const fmt = (p) => (p ? `(${p.x.toFixed(5)}, ${p.y.toFixed(5)})` : "none");

await run("c52-stitch-snap", [
  {
    title: "setup: two pages at one scale, each with makePdf's printed frame",
    run: async ({ page }) => {
      sheets = await gradingSheets(page, token, base, workspace, project, ["S-1", "S-2"]);
      return `${sheets.length} pages`;
    },
  },
  {
    title: "D-1313: Snap PDF on: a pick 4 px from the printed frame snaps onto it on both panes, the same point",
    run: async ({ page }) => {
      await openSheet(page, project, sheets[0], "earthwork");
      await snapPdf(page, true);
      await stitchPoints(page);
      // Both panes' lines read (no "snap loading" mark left), so this step is the after-loading case.
      await waitFor(async () => {
        const m = await marks(page);
        return !m.barHere && !m.barThere ? true : null;
      }, "both panes' lines read", 60000, 200);
      const a = await pick(page, 0);
      await pick(page, 1);
      await waitFor(async () => {
        const l = await landed(page);
        return l.here && l.there ? true : null;
      }, "point 1 on both panes", 10000, 100);
      const l = await landed(page);
      const px = 1 / a.heightPx;
      expect(near(l.here.y, FRAME_TOP, 1e-5), `the sheet's pick did not snap: ${fmt(l.here)}, frame ${FRAME_TOP.toFixed(5)}`);
      expect(near(l.there.y, FRAME_TOP, 1e-5), `the reference pane's pick did not snap: ${fmt(l.there)}, frame ${FRAME_TOP.toFixed(5)}`);
      expect(near(l.here.x, l.there.x, 1 / a.widthPx), `the panes' picks differ across: ${fmt(l.here)} / ${fmt(l.there)}`);
      return `both on the frame: ${fmt(l.here)} / ${fmt(l.there)} (clicked ${(a.clickedY - FRAME_TOP) / px} px below)`;
    },
  },
  {
    title: "D-1313: Snap PDF off: the same pick lands where it was clicked on both panes",
    run: async ({ page }) => {
      await openSheet(page, project, sheets[0], "earthwork");
      await snapPdf(page, false);
      await stitchPoints(page);
      const a = await pick(page, 0);
      const m = await marks(page);
      expect(!m.barHere && !m.barThere && m.cursor.length === 0, `a "snap loading" mark with Snap PDF off: ${JSON.stringify(m)}`);
      await pick(page, 1);
      await waitFor(async () => {
        const l = await landed(page);
        return l.here && l.there ? true : null;
      }, "point 1 on both panes", 10000, 100);
      const l = await landed(page);
      const px = 1 / a.heightPx;
      // Unsnapped: about 4 px below the frame on both (a pixel's rounding either way), never on it.
      for (const [name, p] of [["the sheet", l.here], ["the reference pane", l.there]]) {
        expect(p.y - FRAME_TOP > 2 * px && p.y - FRAME_TOP < 6 * px, `${name}'s pick is not where it was clicked: ${fmt(p)}, ${((p.y - FRAME_TOP) / px).toFixed(2)} px below the frame`);
      }
      expect(near(l.here.y, l.there.y, 1.01 * px), `the panes' picks differ: ${fmt(l.here)} / ${fmt(l.there)}`);
      return `both as clicked: ${((l.here.y - FRAME_TOP) / px).toFixed(2)} / ${((l.there.y - FRAME_TOP) / px).toFixed(2)} px below the frame`;
    },
  },
  {
    title: "D-1313: Snap PDF on, the lines still being read: the mark in both bars and at the cursor; the pick waits, then lands as after loading on both panes",
    run: async ({ page, context }) => {
      // The sheets' PDFs (what Snap PDF reads) held back 25 s, so both panes are still reading when the picks are made.
      const assets = (await apiCall(token, "GET", `${base}/${project.uuid}/drawing/asset`)).body;
      const paths = new Set(assets.filter((x) => x.source_url).map((x) => new URL(x.source_url).pathname));
      expect(paths.size > 0, "no source PDFs");
      let held = 0;
      await context.route(
        (url) => paths.has(url.pathname),
        async (route) => {
          held += 1;
          await new Promise((r) => setTimeout(r, 25000));
          await route.continue().catch(() => null);
        },
      );
      await openSheet(page, project, sheets[0], "earthwork");
      await snapPdf(page, true);
      await stitchPoints(page);
      const before = await marks(page);
      expect(before.barHere && before.barThere, `no "snap loading" mark in a pane's bar while reading: ${JSON.stringify(before)}`);
      await pick(page, 0);
      await pick(page, 1);
      const waiting = await marks(page);
      const l0 = await landed(page);
      expect(!l0.here && !l0.there, `a pick landed before the lines were read: ${fmt(l0.here)} / ${fmt(l0.there)}`);
      const cursorHere = waiting.cursor.find((c) => !c.ref);
      const cursorThere = waiting.cursor.find((c) => c.ref);
      expect(cursorHere?.waiting === 1 && cursorThere?.waiting === 1, `the cursor marks: ${JSON.stringify(waiting.cursor)}`);
      expect(waiting.cursor.some((c) => c.visible), `no cursor mark shown: ${JSON.stringify(waiting.cursor)}`);
      await waitFor(async () => {
        const l = await landed(page);
        return l.here && l.there ? true : null;
      }, "the waiting picks placed once the lines were read", 90000, 250);
      const l = await landed(page);
      expect(near(l.here.y, FRAME_TOP, 1e-5) && near(l.there.y, FRAME_TOP, 1e-5), `a waiting pick did not land as after loading: ${fmt(l.here)} / ${fmt(l.there)}`);
      const after = await marks(page);
      expect(!after.barHere && !after.barThere && after.cursor.length === 0, `a mark stayed: ${JSON.stringify(after)}`);
      expect((await page.locator("[data-join-pairs]").innerText()) === "1 pair", "the pair counter");
      return `held ${held} PDF request(s); marks in both bars and at the cursor (1 pick waiting each); landed ${fmt(l.here)} / ${fmt(l.there)}`;
    },
  },
]);

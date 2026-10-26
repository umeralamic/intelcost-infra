// C39, one tag while a colleague draws (D-788), built after the archive (2026-10-26). Window A (this run's
// owner, :5173 on `api`) moves its pointer, then draws an Area run; window B (Sara W., :5174 on `api-b`)
// watches the same sheet.
//
//   ./fx-suite.sh run c39-one-tag-while-drawing
//
// Asserted on B's canvas: A's pointer and its tag while A only points; while A's run is open, the draft's tag
// and no pointer, though A's cursor frames still arrive; the pointer back once the run is saved. Then B turns
// "Show others drawing" off: A's pointer stays shown while A draws. B's prefs are put back at the end.
//
// Written, not run (the founder, 2026-10-26: fixtures added to the archived suite, run with the next full
// restore-from-tag run, hard rule 8).

import { APP, expect, run } from "./lib/bench.mjs";
import { APP_B, WINDOW_B, appSockets, call, readySocket, recordSockets, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";
import { armMeasure, clickSheet, onProjectTopic, openSheet, sheetPoint, sweepSheet } from "./lib/takeoff.mjs";
import { riversideWorld } from "./lib/world.mjs";

const world = await riversideWorld();
const r = world.r;
await call(world.token, "PATCH", `/api/workspace/${r.workspace}`, { collaboration_mode: "work_together" });

const counts = async (page) => ({
  cursor: await page.locator("[data-remote-cursor]").count(),
  cursorTag: await page.locator("[data-cursor-tag]").count(),
  draftTag: await page.locator("[data-draft-tag]").count(),
});

async function twoWindows(page, context) {
  await recordSockets(context);
  const b = await secondWindow(context);
  await signInAt(page, APP, world.owner.email, world.owner.password);
  await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
  await openSheet(page, r);
  await openSheet(b.page, r, APP_B);
  await readySocket(page);
  await readySocket(b.page);
  await onProjectTopic(page, r);
  await onProjectTopic(b.page, r);
  return b;
}

/** B's collaboration prefs, through the api as B. */
async function bPrefs(prefs) {
  const done = await call(world.sara.token, "PATCH", "/api/auth/me", { collaboration_prefs: prefs }, {}, 8030);
  expect(done.status === 200, `B's prefs: ${done.status} ${JSON.stringify(done.body)}`);
}

/** A opens an Area run of three points and keeps the pen moving, so cursor frames keep coming. */
async function openRun(page) {
  await armMeasure(page, "Area");
  for (const [x, y] of [[0.3, 0.3], [0.5, 0.3], [0.5, 0.5]]) await clickSheet(page, x, y);
  await sweepSheet(page, [0.5, 0.5], [0.32, 0.52], 600);
}

await run("c39-one-tag-while-drawing", [
  {
    title: "D-788: pointing shows A's cursor and tag; drawing shows the draft's tag alone; saved, the cursor is back",
    run: async ({ page, context, shot }) => {
      const b = await twoWindows(page, context);
      try {
        await bPrefs({ show_drawing: null, show_cursors: null, show_names: null, others_work: null });
        await sweepSheet(page, [0.3, 0.3], [0.45, 0.3], 400);
        const idle = await waitFor(async () => {
          const now = await counts(b.page);
          return now.cursorTag === 1 ? now : null;
        }, "B to see A's pointer and tag", 5000);
        await openRun(page);
        await b.page.locator("[data-draft-tag]").first().waitFor({ timeout: 5000 });
        const cursorFramesBefore = (await appSockets(b.page)).flatMap((s) => s.received).filter((f) => f.type === "cursor").length;
        await sweepSheet(page, [0.32, 0.52], [0.36, 0.53], 600);
        const cursorFramesAfter = (await appSockets(b.page)).flatMap((s) => s.received).filter((f) => f.type === "cursor").length;
        const drawing = await counts(b.page);
        await b.page.screenshot({ path: shot.replace(".png", "-b-drawing.png") });
        expect(cursorFramesAfter > cursorFramesBefore, "no cursor frames reached B while A drew: the check proves nothing");
        expect(drawing.draftTag === 1 && drawing.cursor === 0 && drawing.cursorTag === 0, `while drawing: ${JSON.stringify(drawing)}`);
        const end = await sheetPoint(page, 0.3, 0.5);
        await page.mouse.dblclick(end.x, end.y);
        await waitFor(async () => (await counts(b.page)).draftTag === 0, "the draft to end on B", 5000);
        await sweepSheet(page, [0.6, 0.6], [0.65, 0.6], 400);
        const after = await waitFor(async () => {
          const now = await counts(b.page);
          return now.cursorTag === 1 ? now : null;
        }, "A's pointer back on B", 5000);
        return `idle ${JSON.stringify(idle)}; drawing ${JSON.stringify(drawing)} with ${cursorFramesAfter - cursorFramesBefore} cursor frames arriving; after ${JSON.stringify(after)}`;
      } finally {
        await page.keyboard.press("Escape").catch(() => {});
        await b.context.close();
      }
    },
  },
  {
    title: "D-788: with 'Show others drawing' off, B keeps A's pointer while A draws",
    run: async ({ page, context }) => {
      const b = await twoWindows(page, context);
      try {
        await bPrefs({ show_drawing: false });
        await b.page.reload();
        await b.page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
        await onProjectTopic(b.page, r);
        await openRun(page);
        const seen = await waitFor(async () => {
          const now = await counts(b.page);
          return now.cursorTag === 1 ? now : null;
        }, "A's pointer on B while A draws, drafts hidden", 5000);
        expect(seen.draftTag === 0, `a draft tag showed with drawing off: ${JSON.stringify(seen)}`);
        await page.keyboard.press("Escape");
        return `drafts hidden: ${JSON.stringify(seen)}`;
      } finally {
        await bPrefs({ show_drawing: null }).catch(() => {});
        await page.keyboard.press("Escape").catch(() => {});
        await b.context.close();
      }
    },
  },
]);

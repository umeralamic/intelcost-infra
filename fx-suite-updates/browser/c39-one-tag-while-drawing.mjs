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
  {
    title: "D-802: Collaboration settings in order, Only mine greys the rest (values kept), Drawing in progress Off greys Live drawing line, 'Your account' labels",
    run: async ({ page }) => {
      await signInAt(page, APP, world.owner.email, world.owner.password);
      await openSheet(page, r);
      await page.getByRole("button", { name: /settings/i }).first().click();
      await page.getByRole("button", { name: /^Collaboration/ }).first().click();
      const order = await page.locator("[data-collaboration-prefs] [data-pref]").evaluateAll((e) => e.map((x) => x.getAttribute("data-pref")));
      expect(order.join() === "others_work,colour_by,show_drawing,live_line,show_cursors,show_names", `order: ${order.join()}`);
      const scopes = await page.locator("[data-collaboration-prefs] [data-setting-scope='Your account']").count();
      expect(scopes === 3, `"Your account" labels: ${scopes}`);
      const colour = await page.locator("[data-pref='colour_by'] [aria-checked='true']").getAttribute("data-value");
      try {
        await page.locator("[data-pref='others_work'] [data-value='only_mine']").click();
        await page.locator("[data-pref='colour_by'][data-off]").waitFor({ timeout: 10000 });
        const off = await page.locator("[data-collaboration-prefs] [data-pref][data-off]").evaluateAll((e) => e.map((x) => x.getAttribute("data-pref")));
        expect(off.length === 5 && !off.includes("others_work"), `greyed under Only mine: ${off.join()}`);
        await page.locator("[data-pref='others_work'] [data-value='all']").click();
        await page.locator("[data-pref='colour_by']:not([data-off])").waitFor({ timeout: 10000 });
        const kept = await page.locator("[data-pref='colour_by'] [aria-checked='true']").getAttribute("data-value");
        expect(kept === colour, `Colour others by came back as ${kept}, was ${colour}`);
        await page.locator("[data-pref='show_drawing'] [data-value='false']").click();
        await page.locator("[data-pref='live_line'][data-off]").waitFor({ timeout: 10000 });
        const offNow = await page.locator("[data-collaboration-prefs] [data-pref][data-off]").count();
        expect(offNow === 1, `with Drawing in progress Off, ${offNow} rows greyed, wanted Live drawing line only`);
        return `order right, 3 account labels, 5 greyed under Only mine and restored, Live drawing line greyed with drawing off`;
      } finally {
        await page.locator("[data-pref='show_drawing'] [data-value='true']").click().catch(() => {});
        await page.locator("[data-pref='others_work'] [data-value='all']").click().catch(() => {});
        await page.keyboard.press("Escape").catch(() => {});
      }
    },
  },
  {
    title: "D-802: Only mine shows 'Hiding 1 colleague's work' on the toolbar while B points on the sheet; one click turns All back on",
    run: async ({ page, context }) => {
      const b = await twoWindows(page, context);
      try {
        await call(world.token, "PATCH", "/api/auth/me", { collaboration_prefs: { others_work: "only_mine" } });
        await page.reload();
        await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
        await onProjectTopic(page, r);
        const chip = page.locator("[data-hiding-colleagues]");
        await chip.waitFor({ timeout: 10000 });
        await sweepSheet(b.page, [0.3, 0.3], [0.6, 0.6], 1500);
        await waitFor(async () => ((await chip.getAttribute("data-hiding-colleagues")) === "1" ? true : null), "the chip counting B", 15000);
        const text = (await chip.innerText()).trim();
        expect(text === "Hiding 1 colleague's work", `chip: "${text}"`);
        const back = page.waitForResponse((res) => res.url().endsWith("/api/auth/me") && res.request().method() === "PATCH");
        await chip.click();
        expect((await back).ok(), "the chip's switch back to All failed");
        await chip.waitFor({ state: "detached", timeout: 10000 });
        return text;
      } finally {
        await call(world.token, "PATCH", "/api/auth/me", { collaboration_prefs: { others_work: null } }).catch(() => {});
        await b.context.close();
      }
    },
  },
]);

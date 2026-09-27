// F8-S13: the live drawing channel (D-33), and its first rendering on today's canvas
// (D-34). Window A (owner, :5173 on `api`) draws a linear run slowly on the first sheet
// of Riverside; window B (Sara W., :5174 on `api-b`) watches.
//
//   docker compose --profile browser run --rm browser node scripts/f8-s13.mjs
//
// What is asserted is what DevTools > Network > WS shows on each side, plus B's canvas:
// A's frames are throttled to 8 a second, under the api's 10 even when the tab is busy,
// B's arrive stamped with A's name and colour,
// A hears none of its own, B on another sheet draws none, a tab closed mid-shape is
// ended for B by the api, and nothing reaches Postgres until A finishes.

import { APP, SEEDED, apiLogin, expect, firstWorkspace, quietFor, run } from "./lib/bench.mjs";
import {
  APP_B,
  WINDOW_B,
  appSockets,
  call,
  ensureWindowB,
  rawSocket,
  readySocket,
  recordSockets,
  secondWindow,
  signInAt,
  waitFor,
} from "./lib/realtime.mjs";
import { clickSheet, onProjectTopic, openSheet, projectTopicOf, removeItem, riverside, setMode, sheetPoint, sweepSheet } from "./lib/takeoff.mjs";
import { riversideWorld } from "./lib/world.mjs";

// This run's own Riverside, under its own account, with Sara W. seated (lib/world.mjs).
const world = await riversideWorld();
const token = world.token;
const workspace = world.workspace;
const r = world.r;
await setMode(token, workspace.uuid, "work_together");

const sheets = await call(token, "GET", `/api/workspace/${workspace.uuid}/project/${r.project}/drawing/sheet`);
const second = sheets.body.sort((a, b) => a.page_number - b.page_number)[1];
const secondUrl = (app) => `${app}/project/${r.project}/takeoff/${second.uuid}`;

/** Every item on the first sheet, and how many shapes they hold between them. */
async function shapesOnSheet() {
  const list = await call(token, "GET", `${r.takeoff}/item?sheet_uuid=${r.sheet}`);
  const details = await Promise.all(list.body.map((i) => call(token, "GET", `${r.takeoff}/item/${i.uuid}`)));
  return { items: list.body.map((i) => i.uuid), shapes: details.reduce((n, d) => n + d.body.geometries.length, 0) };
}

async function drafts(page, direction) {
  return (await appSockets(page)).flatMap((s) => s[direction]).filter((f) => f.type === "draft");
}

/** The most frames in any one second, by when they were sent or received. */
function peakPerSecond(frames) {
  let peak = 0;
  for (const f of frames) peak = Math.max(peak, frames.filter((g) => g.at >= f.at && g.at < f.at + 1000).length);
  return peak;
}

/** A moves the pen across the sheet in small steps, the way a hand does. */
const sweep = sweepSheet;

/** A tool in the toolbar, by its label alone (the tree's rows carry names like
 *  "Linear run 2"). */
const tool = (page, label) => page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: label, exact: true });

const clickAt = (page, [x, y]) => clickSheet(page, x, y);

async function twoWindows(page, context, bUrl) {
  await recordSockets(context);
  const b = await secondWindow(context);
  await signInAt(page, APP, world.owner.email, world.owner.password);
  await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
  await openSheet(page, r);
  if (bUrl) {
    await b.page.goto(bUrl);
    await b.page.locator('img[alt="Drawing sheet"]').waitFor({ timeout: 20000 });
  } else await openSheet(b.page, r, APP_B);
  const ready = await readySocket(page);
  const a = ready.received.find((f) => f.type === "ready");
  await readySocket(b.page);
  // Both on the project topic before a pen goes down.
  await onProjectTopic(page, r);
  await onProjectTopic(b.page, r);
  return { b, aName: a.name, aColour: a.colour };
}

const made = new Set();

await run("f8-s13", [
  {
    title: "AC1, AC2, AC5: A draws a run slowly; B gets throttled, stamped frames and sees the tag; A hears none of its own; Postgres moves only on finish",
    run: async ({ page, context, shot }) => {
      const { b, aName, aColour } = await twoWindows(page, context);
      try {
        const before = await shapesOnSheet();
        await tool(page, "Linear").click();
        await clickAt(page, [0.2, 0.7]);
        await sweep(page, [0.2, 0.7], [0.35, 0.72], 900);
        await clickAt(page, [0.35, 0.72]);
        await sweep(page, [0.35, 0.72], [0.5, 0.8], 900);

        // Mid-shape: B draws it, tagged with A's short name.
        const tag = b.page.locator("[data-draft-tag]", { hasText: aName });
        await tag.waitFor({ timeout: 3000 });
        await b.page.screenshot({ path: shot.replace(".png", "-b-watching.png") });
        const during = await shapesOnSheet();
        expect(during.shapes === before.shapes, `Postgres moved mid-shape: ${before.shapes} to ${during.shapes}`);

        const last = await sheetPoint(page, 0.5, 0.8);
        await page.mouse.dblclick(last.x, last.y);
        const after = await waitFor(async () => {
          const now = await shapesOnSheet();
          return now.shapes > before.shapes ? now : null;
        }, "the finished run to be saved", 5000);
        for (const uuid of after.items.filter((u) => !before.items.includes(u))) made.add(uuid);

        const sent = await drafts(page, "sent");
        const heard = await waitFor(async () => {
          const got = await drafts(b.page, "received");
          return got.some((f) => f.done) ? got : null;
        }, "B to hear the draft end", 3000);
        const live = heard.filter((f) => !f.done);
        const end = heard.find((f) => f.done);
        const ownEcho = await drafts(page, "received");

        expect(live.length >= 5, `B heard only ${live.length} draft frames`);
        const peak = peakPerSecond(sent.filter((f) => !f.done));
        expect(peak <= 8, `A sent ${peak} a second, over the client's 8`);
        expect(live.every((f) => f.name === aName && f.colour === aColour), "a frame was not stamped with A's name and colour");
        expect(live.at(-1).points.length >= 3, "the last frame did not carry the run so far");
        expect(end.saved === true, "the end did not say the run was saved");
        expect(ownEcho.length === 0, `A received ${ownEcho.length} of its own draft frames`);
        await waitFor(async () => (await tag.count()) === 0, "B's tag to hand over to the saved shape", 3000);
        return `B heard ${live.length} frames as "${aName}" (colour ${aColour}), peak ${peakPerSecond(sent.filter((f) => !f.done))}/s sent, then done+saved; A heard 0 of its own; shapes ${before.shapes} → ${before.shapes} mid-shape → ${after.shapes}`;
      } finally {
        await b.context.close();
      }
    },
  },
  {
    title: "Under load: CPU slowed six times and the main thread kept busy, A still sends at most 8 a second, never closer than 125 ms",
    run: async ({ page, context }) => {
      const { b } = await twoWindows(page, context);
      const cdp = await context.newCDPSession(page);
      try {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
        // Long tasks every 70 ms: timers bunch up behind them, as a busy tab's do.
        await page.evaluate(() => {
          window.__busy = setInterval(() => {
            const until = performance.now() + 50;
            while (performance.now() < until);
          }, 70);
        });
        await tool(page, "Linear").click();
        await clickAt(page, [0.2, 0.3]);
        await sweep(page, [0.2, 0.3], [0.6, 0.35], 3000);
        await sweep(page, [0.6, 0.35], [0.3, 0.5], 3000);
        await page.evaluate(() => clearInterval(window.__busy));
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
        await page.keyboard.press("Escape");
        await tool(page, "Select").click();
        // Read once the pen is up and the wire is quiet: a frame still waiting on the
        // throttle goes out after the last move, and B hears it too. Settled when what A
        // sent and what B heard agree on two reads in a row (or the expect below says not).
        let last = "";
        await waitFor(async () => {
          const now = `${(await drafts(page, "sent")).length}/${(await drafts(b.page, "received")).length}`;
          const [s, h] = now.split("/");
          const settled = now === last && s === h;
          last = now;
          return settled;
        }, "A's frames and B's to agree", 8000, 300).catch(() => {});
        const sent = (await drafts(page, "sent")).filter((f) => !f.done);
        const gaps = sent.slice(1).map((f, i) => f.at - sent[i].at);
        const closest = Math.min(...gaps);
        const heard = (await drafts(b.page, "received")).filter((f) => !f.done);
        expect(sent.length >= 10, `A sent only ${sent.length} frames`);
        expect(peakPerSecond(sent) <= 8, `A sent ${peakPerSecond(sent)} a second`);
        expect(closest >= 124, `two frames went ${closest} ms apart`);
        expect(heard.length === sent.length, `B heard ${heard.length} of ${sent.length}: the api dropped some`);
        return `${sent.length} frames under load: peak ${peakPerSecond(sent)}/s, closest ${closest} ms apart; B heard all ${heard.length}, none dropped by the api`;
      } finally {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }).catch(() => {});
        await b.context.close();
      }
    },
  },
  {
    title: "A flood is still cut (D-46): 40 draft frames in one second from a hand-written socket; B hears the burst and one second's rate, no more",
    run: async ({ page, context }) => {
      const { b } = await twoWindows(page, context);
      try {
        const topic = projectTopicOf(r);
        const since = await b.page.evaluate(() => Date.now());
        const frame = (i) => ({
          type: "draft",
          topic,
          sheet_uuid: r.sheet,
          tool: "lf",
          points: [[0.1, 0.1], [0.1 + i / 100, 0.2]],
        });
        const flood = await rawSocket(
          page,
          [{ type: "auth", token, client_id: crypto.randomUUID() }, { type: "join", topic }, ...Array.from({ length: 40 }, (_, i) => frame(i))],
          3000,
          25,
        );
        expect(flood.heard.some((f) => f.type === "joined"), `the flood socket never joined: ${JSON.stringify(flood.heard.slice(0, 3))}`);
        const heard = await waitFor(async () => {
          const got = (await drafts(b.page, "received")).filter((f) => f.at >= since && !f.done);
          return got.length >= 10 ? got : null;
        }, "B to hear the flood's first burst", 5000);
        await quietFor(1500); // anything the api let through has arrived
        const all = (await drafts(b.page, "received")).filter((f) => f.at >= since && !f.done);
        // The api's rule, over the time the flood actually took to arrive (a busy page
        // stretches its 25 ms steps): 10 at once, then 10 a second, plus one for rounding.
        const span = (all.at(-1).at - all[0].at) / 1000;
        const allowed = Math.floor(10 + 10 * span) + 1;
        expect(all.length < 40, `B heard all 40: nothing was cut`);
        expect(all.length <= allowed, `B heard ${all.length} of 40 over ${span.toFixed(2)} s; the rule allows ${allowed}`);
        return `40 sent; B heard ${all.length} over ${span.toFixed(2)} s (the rule allows ${allowed}; first ${heard.length} as a burst), the rest dropped`;
      } finally {
        await b.context.close();
      }
    },
  },
  {
    title: "AC3: B on the second sheet receives A's frames on the project topic but draws none of them",
    run: async ({ page, context }) => {
      const { b, aName } = await twoWindows(page, context, secondUrl(APP_B));
      try {
        await tool(page, "Linear").click();
        await clickAt(page, [0.25, 0.25]);
        await sweep(page, [0.25, 0.25], [0.45, 0.3], 900);
        const heard = await waitFor(async () => {
          const got = await drafts(b.page, "received");
          return got.length > 0 ? got : null;
        }, "B's socket to carry A's frames", 3000);
        const tags = await b.page.locator("[data-draft-tag]").count();
        const layer = await b.page.locator("[data-draft-layer]").count();
        await page.keyboard.press("Escape");
        await tool(page, "Select").click();
        expect(heard.every((f) => f.sheet_uuid === r.sheet), "a frame named the wrong sheet");
        expect(tags === 0 && layer === 0, `B on another sheet drew ${tags} tags`);
        return `B's socket carried ${heard.length} frames for sheet 1 from ${aName}; B, on sheet 2, drew none`;
      } finally {
        await b.context.close();
      }
    },
  },
  {
    title: "AC4: A closes the tab mid-shape; the api ends the draft for B",
    run: async ({ page, context }) => {
      const { b, aName } = await twoWindows(page, context);
      try {
        await tool(page, "Linear").click();
        await clickAt(page, [0.6, 0.2]);
        await sweep(page, [0.6, 0.2], [0.75, 0.3], 700);
        const tag = b.page.locator("[data-draft-tag]", { hasText: aName });
        await tag.waitFor({ timeout: 3000 });
        const closedAt = Date.now();
        await page.close();
        const end = await waitFor(async () => (await drafts(b.page, "received")).find((f) => f.done), "B to hear the draft end", 5000);
        await waitFor(async () => (await tag.count()) === 0, "B's tag to go", 3000);
        expect(end.saved === false, "a closed tab's draft was reported saved");
        return `B heard done (not saved) ${end.at - closedAt} ms after A's tab closed, and the tag went`;
      } finally {
        await b.context.close();
      }
    },
  },
]).finally(async () => {
  for (const uuid of made) await removeItem(token, r, uuid).catch(() => {});
});

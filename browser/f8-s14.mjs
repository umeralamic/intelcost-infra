// F8-S14: the six Collaboration display preferences (D-33, D-38), kept on the account, and
// what they change on today's canvas (D-34).
//
//   docker compose --profile browser run --rm browser node scripts/f8-s14.mjs
//
// Driven as window B's person (Sara W., this run's own account, lib/realtime.mjs), whose
// stored choices are cleared at the start and the end (null puts a preference back on its
// default).

import { APP, SEEDED, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import {
  APP_B,
  WINDOW_B,
  call,
  ensureWindowB,
  readySocket,
  recordSockets,
  secondWindow,
  signInAt,
  waitFor,
} from "./lib/realtime.mjs";
import { clickSheet, onProjectTopic, openSheet, riverside, setMode, sheetPoint, sweepSheet } from "./lib/takeoff.mjs";
import { riversideWorld } from "./lib/world.mjs";

// This run's own Riverside, under its own account, with Sara W. seated (lib/world.mjs).
const world = await riversideWorld();
const saraToken = world.sara.token;
const token = world.token;
const workspace = world.workspace;
const r = world.r;
await setMode(token, workspace.uuid, "work_together");

// D-38: solid lines and item colour are the defaults now.
const DEFAULTS = { show_drawing: true, show_names: "always", show_cursors: true, others_work: "all", colour_by: "item", live_line: "solid" };
const CHANGED = { show_drawing: false, show_names: "hover", show_cursors: false, others_work: "fade", colour_by: "person", live_line: "dashed" };
const LABELS = {
  show_drawing: { false: "Off", true: "On" },
  show_names: { hover: "On hover", always: "Always", off: "Off" },
  show_cursors: { false: "Off", true: "On" },
  others_work: { fade: "Fade others", all: "All", only_mine: "Only mine" },
  colour_by: { item: "Item colour", person: "Each colleague's own colour" },
  live_line: { solid: "Solid", dashed: "Dashed" },
};

// Every stored choice cleared: sparse again, reading as a new person's defaults.
const reset = () =>
  call(saraToken, "PATCH", "/api/auth/me", {
    collaboration_prefs: Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, null])),
  });
await reset();

/** What each of the six radio groups on Settings > Account shows as chosen. */
async function shown(page) {
  const out = {};
  for (const key of Object.keys(DEFAULTS)) {
    const value = await page.locator(`[data-pref="${key}"] [aria-checked="true"]`).getAttribute("data-value");
    out[key] = value === "true" ? true : value === "false" ? false : value;
  }
  return out;
}

const sweep = sweepSheet;

await run("f8-s14", [
  {
    title: "AC1: each preference, changed on Settings > Account, is kept across a reload",
    run: async ({ page }) => {
      await reset();
      await signInAt(page, APP, WINDOW_B.email, WINDOW_B.password);
      await page.goto(`${APP}/settings/account`);
      await page.locator("[data-collaboration-prefs]").waitFor();
      const before = await shown(page);
      expect(JSON.stringify(before) === JSON.stringify(DEFAULTS), `a new person reads ${JSON.stringify(before)}`);
      for (const [key, value] of Object.entries(CHANGED)) {
        const saved = page.waitForResponse((res) => res.url().endsWith("/api/auth/me") && res.request().method() === "PATCH");
        await page.locator(`[data-pref="${key}"]`).getByRole("radio", { name: LABELS[key][String(value)], exact: true }).click();
        expect((await saved).status() === 200, `saving ${key} failed`);
      }
      await page.reload();
      await page.locator("[data-collaboration-prefs]").waitFor();
      const after = await shown(page);
      expect(JSON.stringify(after) === JSON.stringify(CHANGED), `after reload: ${JSON.stringify(after)}`);
      return `defaults read first; all six changed, one PATCH each, and kept across a reload`;
    },
  },
  {
    title: "AC2: the same person signed in on window B's app sees the same preferences",
    run: async ({ page }) => {
      await signInAt(page, APP_B, WINDOW_B.email, WINDOW_B.password);
      await page.goto(`${APP_B}/settings/account`);
      await page.locator("[data-collaboration-prefs]").waitFor();
      const there = await shown(page);
      expect(JSON.stringify(there) === JSON.stringify(CHANGED), `window B reads ${JSON.stringify(there)}`);
      return "window B (another origin, another api process) reads the six as set in window A";
    },
  },
  {
    title: "AC3: an invalid value, or an unknown preference, in a hand-written patch is refused naming the field",
    run: async () => {
      const bad = await call(saraToken, "PATCH", "/api/auth/me", { collaboration_prefs: { show_names: "sometimes" } });
      const unknown = await call(saraToken, "PATCH", "/api/auth/me", { collaboration_prefs: { glow: true } });
      const badField = bad.body?.detail?.[0]?.loc?.at(-1);
      const unknownField = unknown.body?.detail?.[0]?.loc?.at(-1);
      expect(bad.status === 422 && badField === "show_names", `bad value: ${bad.status} ${JSON.stringify(bad.body)}`);
      expect(unknown.status === 422 && unknownField === "glow", `unknown: ${unknown.status} ${JSON.stringify(unknown.body)}`);
      const kept = await call(saraToken, "GET", "/api/auth/me");
      expect(kept.body.collaboration_prefs.show_names === "hover", "a refused patch changed what was stored");
      return `422 naming "show_names" and "glow"; nothing stored changed`;
    },
  },
  {
    title: "On the canvas: B's preferences decide how A's drawing shows (off, names off, names on hover, fade, only mine)",
    run: async ({ page, context }) => {
      await recordSockets(context);
      const b = await secondWindow(context);
      try {
        await signInAt(page, APP, world.owner.email, world.owner.password);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await openSheet(page, r);
        await openSheet(b.page, r, APP_B);
        await onProjectTopic(page, r);
        await onProjectTopic(b.page, r);
        await page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: "Linear", exact: true }).click();
        await clickSheet(page, 0.3, 0.85);
        await sweep(page, [0.3, 0.85], [0.45, 0.88], 500);

        const seen = {};
        const setPrefs = async (prefs) => {
          await call(saraToken, "PATCH", "/api/auth/me", { collaboration_prefs: { ...DEFAULTS, ...prefs } });
          await b.page.reload();
          await b.page.locator('img[alt="Drawing sheet"]').waitFor();
          await onProjectTopic(b.page, r);
          // Keep the pen moving so B hears frames after its reload.
          await sweep(page, [0.45, 0.88], [0.5, 0.86], 400);
          await sweep(page, [0.5, 0.86], [0.45, 0.88], 400);
        };
        const count = (sel) => b.page.locator(sel).count();

        await setPrefs({});
        await waitFor(async () => (await count("[data-draft-tag]")) === 1, "defaults: a tag", 4000);
        // D-38: by default the run is solid, in the item's colour (a new run's is the
        // default measurement colour), never the colleague's.
        const stroke = () => b.page.locator("[data-draft]").evaluate((p) => ({
          dash: p.getAttribute("stroke-dasharray"),
          colour: p.getAttribute("stroke"),
        }));
        const plain = await stroke();
        expect(plain.dash === null, `the default line is dashed (${plain.dash})`);
        expect(!plain.colour.includes("--collab"), `the default colour is the colleague's: ${plain.colour}`);
        seen.defaults = `path and tag, solid, ${plain.colour}`;

        await setPrefs({ live_line: "dashed" });
        await waitFor(async () => (await count("[data-draft]")) === 1, "dashed: the path", 4000);
        const dashed = await stroke();
        expect(dashed.dash === "6 3", `dashed drew "${dashed.dash}"`);
        seen.dashed = `dasharray ${dashed.dash}`;

        await setPrefs({ colour_by: "person" });
        await waitFor(async () => (await count("[data-draft]")) === 1, "colour by person: the path", 4000);
        const person = await stroke();
        expect(person.colour.includes("--collab"), `each colleague's own colour drew ${person.colour}`);
        seen.person = person.colour;

        await setPrefs({ show_drawing: false });
        seen.off = `${await count("[data-draft-layer]")} layers`;
        expect((await count("[data-draft-layer]")) === 0, "drawing off still drew the draft");

        await setPrefs({ show_names: "off" });
        await waitFor(async () => (await count("[data-draft]")) === 1, "names off: the path", 4000);
        expect((await count("[data-draft-tag]")) === 0, "names off still showed the tag");
        seen.namesOff = "path, no tag";

        await setPrefs({ show_names: "hover" });
        await waitFor(async () => (await count("[data-draft]")) === 1, "names on hover: the path", 4000);
        const hiddenAway = (await count("[data-draft-tag]")) === 0;
        const pen = await b.page.locator("[data-draft]").evaluate((p) => p.getAttribute("d").trim().split(/\s+/).slice(1, 3).map(Number));
        const onRun = await sheetPoint(b.page, pen[0], pen[1]);
        await b.page.mouse.move(onRun.x, onRun.y);
        await waitFor(async () => (await count("[data-draft-tag]")) === 1, "names on hover: the tag when B's pointer is on the run", 4000);
        expect(hiddenAway, "names on hover showed the tag with B's pointer away");
        seen.hover = "tag only with B's pointer on the run";

        await setPrefs({ others_work: "fade" });
        await waitFor(async () => (await count("[data-draft-layer]")) === 1, "fade: the layer", 4000);
        const opacity = await b.page.locator("[data-draft-layer]").evaluate((el) => getComputedStyle(el).opacity);
        expect(opacity === "0.4", `fade drew at opacity ${opacity}`);
        seen.fade = `opacity ${opacity}`;

        await setPrefs({ others_work: "only_mine" });
        expect((await count("[data-draft-layer]")) === 0, "only mine still drew A's draft");
        seen.onlyMine = "nothing of A's";

        await page.keyboard.press("Escape");
        return Object.entries(seen).map(([k, v]) => `${k}: ${v}`).join(" · ");
      } finally {
        await b.context.close();
      }
    },
  },
]).finally(reset);

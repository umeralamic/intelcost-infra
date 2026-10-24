// F8-S12: the three collaboration modes on today's takeoff page (D-32).
//
//   ./browser/f8-s12.sh     (runs this, then the restart phase in f8-s12-restart.mjs)
//
// Window A is the owner, "Fixture O.", on :5173 (api). Window B is "Sara W." on :5174
// (api-b). Every step makes its own count item on Riverside's first sheet and removes it.
//
// Updated 2026-10-24 (D-81, D-72, D-98, D-77, D-712): today's screens and today's settings; the
// names, the banner's words, the refusal's words, the one-second free and every hold are read as
// before.
// - D-81, D-72: "Add a shape" left the row menu. A tab takes a count in hand with the row's Resume
//   ("Resume <name>", keep placing markers on it), as f6-e, f8-s15 and f8-s18 do, and lets go with
//   the action group's Stop ("Put the tool away"), where "Add a shape" had Done.
// - D-98: "Warn me" is no longer a workspace mode (the api refuses it, 422); it is each person's
//   "Warn me when someone else is working on my item" (collaboration_prefs.warn_on_shared_item,
//   default on), and the banner shows under Work together for a person whose warning is on. AC2 is
//   Work together with both people's warning on; AC1, Work together with no banner, has both
//   people's warning off (with it on, D-98 shows the banner). Both are set through
//   PATCH /api/auth/me, as the mode is set through the api, and put back to on (the default).
// - D-81, D-77, D-712: AC3's six held actions were the old row menu's. Today the row menu is
//   Properties (where the name is edited, D-77), Override quantity, Duplicate, Move to layer,
//   Create sub-item and Delete; Resume is the row's glyph; a count's shape actions are its canvas
//   menu's ("Item actions": Delete this point, Delete all points on this sheet). Each is read on B
//   as disabled with A's name, as before. Edit vertices and Lock have no entry on a count's menus
//   any more (D-81: the canvas's; a count mark is moved by a drag, f8-s9). Properties is a dialog
//   now (D-77), not a panel with [data-held-by]: "its properties are view-only" is read from the
//   dialog B's selection opens (the action group's Properties), which must be read only.
// - AC4, AC6: B's (tab 2's) Resume is the "Add a shape" whose state is read.

import { APP, SEEDED, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import { A_NAME, APP_B, B_NAME, WINDOW_B, call, ensureWindowB, recordSockets, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";
import { countItem, menuItem, openSheet, removeItem, riverside, row, setMode, sheetPoint } from "./lib/takeoff.mjs";
import { riversideWorld } from "./lib/world.mjs";

// This run's own Riverside, under its own account, with Sara W. seated (lib/world.mjs).
const world = await riversideWorld();
const token = world.token;
const tokenB = world.sara.token;
const workspace = world.workspace;
const r = world.r;
const stamp = () => Date.now() % 1000000;

/** Each person's own "Warn me" (D-98), on or off. */
async function setWarn(on) {
  for (const t of [token, tokenB]) {
    const done = await call(t, "PATCH", "/api/auth/me", { collaboration_prefs: { warn_on_shared_item: on } });
    if (done.status !== 200) throw new Error(`warn ${on}: ${done.status} ${JSON.stringify(done.body)}`);
  }
}

/** Both windows on the sheet, in `mode`, with a fresh item. The caller cleans up. */
async function twoWindows(page, context, mode, label) {
  await setMode(token, workspace.uuid, mode);
  const name = `F8-S12 ${label} ${stamp()}`;
  const item = await countItem(token, r, name);
  await recordSockets(context);
  const b = await secondWindow(context);
  await signInAt(page, APP, world.owner.email, world.owner.password);
  await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
  await openSheet(page, r);
  await openSheet(b.page, r, APP_B);
  return { name, item, b };
}

/** The row's Resume, legacy's "Add a shape" for a count (D-72, D-81). */
const resume = (page, name) => page.locator("[data-quantity-panel]").getByRole("button", { name: `Resume ${name}`, exact: true }).first();

/** Take the item in hand by its row's Resume, and do not place anything yet. */
async function arm(page, name) {
  await resume(page, name).click();
}

/** Resume's state, read as a menu entry's: disabled, and the reason it gives (its tip). */
async function resumeState(page, name) {
  const button = resume(page, name);
  return { disabled: await button.isDisabled(), text: (await button.getAttribute("title")) ?? "" };
}

/** The names shown on the item's row, "Sara W." and so on. */
const tags = async (page, name) => (await row(page, name).locator("[data-people] span").allTextContents()).sort();

/** Close an open menu, by Escape, else a click on the sheet's header bar. */
async function closeMenu(page) {
  await page.keyboard.press("Escape");
  await page
    .getByRole("menu")
    .waitFor({ state: "detached", timeout: 1500 })
    // The sheet's header bar: somewhere a click closes the menu and does nothing else.
    .catch(() => page.mouse.click(700, 75));
}

/** Whether each of these menu actions is disabled, with the reason it shows: one
 *  opening of the menu, read whole, then closed. */
async function menuState(page, name, labels) {
  await menuItem(page, name, labels[0]);
  const out = {};
  for (const label of labels) {
    const entry = page.getByRole("menuitem", { name: new RegExp(`^${label}`) }).first();
    out[label] = { disabled: (await entry.getAttribute("aria-disabled")) === "true", text: await entry.textContent() };
  }
  await closeMenu(page);
  return out;
}

/** The same, for the count mark's own menu on the canvas (D-712, "Item actions"). */
async function canvasMenuState(page, at, labels) {
  const p = await sheetPoint(page, at[0], at[1]);
  await page.mouse.click(p.x, p.y, { button: "right" });
  const menu = page.getByRole("menu", { name: "Item actions" });
  await menu.waitFor({ timeout: 5000 });
  const out = {};
  for (const label of labels) {
    const entry = menu.getByRole("menuitem", { name: new RegExp(`^${label}`) }).first();
    out[label] = { disabled: (await entry.getAttribute("aria-disabled")) === "true", text: await entry.textContent() };
  }
  await closeMenu(page);
  return out;
}

// The held actions of today's row menu and the count's canvas menu (D-81, D-77, D-712).
const HELD_ROW_ACTIONS = ["Properties", "Override quantity", "Duplicate", "Move to layer", "Create sub-item", "Delete"];
const HELD_CANVAS_ACTIONS = ["Delete this point", "Delete all points on this sheet"];
const MARK = [0.3, 0.3]; // countItem's one mark

await run("f8-s12", [
  {
    title: "AC1: Work together: A arms an item and B's row names A; B arms it too and each names the other; no banner, nothing refused",
    run: async ({ page, context }) => {
      // Work together with nobody's warning on (D-98): the banner is each person's own now.
      await setWarn(false);
      const { name, item, b } = await twoWindows(page, context, "work_together", "together");
      try {
        await arm(page, name);
        await waitFor(async () => (await tags(b.page, name)).includes(A_NAME), "B's row to name A", 5000);
        await arm(b.page, name);
        await waitFor(async () => (await tags(page, name)).includes(B_NAME), "A's row to name B", 5000);
        const banners = (await page.locator("[data-also-working]").count()) + (await b.page.locator("[data-also-working]").count());
        const refusals = await b.page.getByRole("alert").count();
        expect(banners === 0, "a Warn me banner showed in Work together");
        expect(refusals === 0, "B was refused");
        return `B's row: ${A_NAME}; A's row: ${B_NAME}; no banner, no refusal`;
      } finally {
        await setWarn(true);
        await b.context.close();
        await removeItem(token, r, item.uuid);
      }
    },
  },
  {
    title: "AC2: Warn me: when both have the item in hand, each sees a banner naming the other",
    run: async ({ page, context }) => {
      // Warn me is each person's own under Work together (D-98): both on.
      await setWarn(true);
      const { name, item, b } = await twoWindows(page, context, "work_together", "warn");
      try {
        await arm(page, name);
        await arm(b.page, name);
        const bannerB = b.page.locator("[data-also-working]");
        const bannerA = page.locator("[data-also-working]");
        await bannerB.waitFor({ timeout: 5000 });
        await bannerA.waitFor({ timeout: 5000 });
        const [ta, tb] = [(await bannerA.textContent()).trim(), (await bannerB.textContent()).trim()];
        expect(tb.replace(/\s+/g, " ") === `${A_NAME} is also working on this item.`, `B's banner: "${tb}"`);
        expect(ta.replace(/\s+/g, " ") === `${B_NAME} is also working on this item.`, `A's banner: "${ta}"`);
        return `B: "${tb.replace(/\s+/g, " ")}" · A: "${ta.replace(/\s+/g, " ")}"`;
      } finally {
        await setMode(token, workspace.uuid, "work_together");
        await b.context.close();
        await removeItem(token, r, item.uuid);
      }
    },
  },
  {
    title: "AC3: One at a time: while A has the item in hand, B's actions on it are disabled with A's name, its properties are view-only, and A's Done frees it within a second",
    run: async ({ page, context }) => {
      const { name, item, b } = await twoWindows(page, context, "one_at_a_time", "one");
      try {
        await arm(page, name);
        await waitFor(async () => (await tags(b.page, name)).includes(A_NAME), "B to see A's hold", 5000);
        const reason = `${A_NAME} is editing this item right now.`;
        const held = {
          ...(await menuState(b.page, name, HELD_ROW_ACTIONS)),
          ...(await canvasMenuState(b.page, MARK, HELD_CANVAS_ACTIONS)),
          Resume: await resumeState(b.page, name),
        };
        const notDisabled = Object.entries(held).filter(([, s]) => !s.disabled || !s.text.includes(reason));
        // Properties is a dialog (D-77): what B's selection opens must be read only.
        await row(b.page, name).click();
        await b.page.getByRole("button", { name: "Properties", exact: true }).click();
        const dialog = b.page.locator("[data-measurement-dialog]");
        await dialog.waitFor({ timeout: 5000 });
        const readOnly = (await dialog.getAttribute("data-read-only")) !== null;
        await b.page.keyboard.press("Escape");
        await dialog.waitFor({ state: "detached", timeout: 3000 }).catch(() => {});

        // A lets go: the action group's Stop puts the tool away (Done, for "Add a shape").
        await page.getByRole("button", { name: "Stop", exact: true }).click();
        const freedAt = Date.now();
        await waitFor(async () => !(await resumeState(b.page, name)).disabled, "B's Resume to re-enable", 5000, 100);
        const took = Date.now() - freedAt;
        expect(notDisabled.length === 0, `not held on B: ${JSON.stringify(notDisabled)}`);
        expect(took < 2000, `B was freed after ${took} ms`);
        expect(readOnly, `B's Properties opened editable while A holds the item (B was freed ${took} ms after Stop)`);
        return `all ${Object.keys(held).length} actions disabled with "${reason}"; properties view-only; freed ${took} ms after Stop`;
      } finally {
        await setMode(token, workspace.uuid, "work_together");
        await b.context.close();
        await removeItem(token, r, item.uuid);
      }
    },
  },
  {
    title: "AC4: One at a time: A closes the tab mid-shape and B is freed at once",
    run: async ({ page, context }) => {
      const { name, item, b } = await twoWindows(page, context, "one_at_a_time", "close");
      try {
        await arm(page, name);
        await waitFor(async () => (await tags(b.page, name)).includes(A_NAME), "B to see A's hold", 5000);
        const closedAt = Date.now();
        await page.close();
        await waitFor(async () => (await tags(b.page, name)).length === 0, "B to be freed", 5000, 100);
        const took = Date.now() - closedAt;
        const s = await resumeState(b.page, name);
        expect(!s.disabled, "B still cannot add");
        return `freed ${took} ms after A's tab closed`;
      } finally {
        await setMode(token, workspace.uuid, "work_together");
        await b.context.close();
        await removeItem(token, r, item.uuid);
      }
    },
  },
  {
    title: "AC6: One at a time, the same person in two tabs: the second tab is held off like anyone else, and says it is you",
    run: async ({ page, context }) => {
      await setMode(token, workspace.uuid, "one_at_a_time");
      const name = `F8-S12 tabs ${stamp()}`;
      const item = await countItem(token, r, name);
      try {
        await recordSockets(context);
        await signInAt(page, APP, world.owner.email, world.owner.password);
        await openSheet(page, r);
        const tab2 = await context.newPage();
        await openSheet(tab2, r);
        await arm(page, name);
        await waitFor(async () => (await tags(tab2, name)).includes(A_NAME), "tab 2 to see tab 1's hold", 5000);
        const s = await resumeState(tab2, name);
        const reason = "You're editing this item in another tab. Finish or close that tab first.";
        expect(s.disabled && s.text.includes(reason), JSON.stringify(s));
        return `tab 2: Resume disabled, "${reason}"`;
      } finally {
        await setMode(token, workspace.uuid, "work_together");
        await removeItem(token, r, item.uuid);
      }
    },
  },
]);

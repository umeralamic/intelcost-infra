// F8-S12: the three collaboration modes on today's takeoff page (D-32).
//
//   ./browser/f8-s12.sh     (runs this, then the restart phase in f8-s12-restart.mjs)
//
// Window A is the owner, "Bench E.", on :5173 (api). Window B is "Sara W." on :5174
// (api-b). Every step makes its own count item on Riverside's first sheet and removes it.

import { APP, SEEDED, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import { APP_B, WINDOW_B, ensureWindowB, recordSockets, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";
import { countItem, menuItem, openSheet, removeItem, riverside, row, setMode } from "./lib/takeoff.mjs";

await ensureWindowB();
const token = await apiLogin();
const workspace = await firstWorkspace(token);
const r = await riverside(token, workspace.uuid);
const stamp = () => Date.now() % 1000000;

/** Both windows on the sheet, in `mode`, with a fresh item. The caller cleans up. */
async function twoWindows(page, context, mode, label) {
  await setMode(token, workspace.uuid, mode);
  const name = `F8-S12 ${label} ${stamp()}`;
  const item = await countItem(token, r, name);
  await recordSockets(context);
  const b = await secondWindow(context);
  await signInAt(page, APP, SEEDED.email, SEEDED.password);
  await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
  await openSheet(page, r);
  await openSheet(b.page, r, APP_B);
  return { name, item, b };
}

/** Arm "Add a shape" on the item from its row menu, and do not draw yet. */
async function arm(page, name) {
  await (await menuItem(page, name, "Add a shape")).click();
}

/** The names shown on the item's row, "Sara W." and so on. */
const tags = async (page, name) => (await row(page, name).locator("[data-people] span").allTextContents()).sort();

/** Whether each of these menu actions is disabled, with the reason it shows: one
 *  opening of the menu, read whole, then closed. */
async function menuState(page, name, labels) {
  await menuItem(page, name, labels[0]);
  const out = {};
  for (const label of labels) {
    const entry = page.getByRole("menuitem", { name: new RegExp(`^${label}`) });
    out[label] = { disabled: (await entry.getAttribute("aria-disabled")) === "true", text: await entry.textContent() };
  }
  await page.keyboard.press("Escape");
  await page
    .getByRole("menu")
    .waitFor({ state: "detached", timeout: 1500 })
    // The sheet's header bar: somewhere a click closes the menu and does nothing else.
    .catch(() => page.mouse.click(700, 75));
  return out;
}

const HELD_ACTIONS = ["Rename", "Edit vertices", "Add a shape", "Lock", "Delete last shape", "Delete item"];

await run("f8-s12", [
  {
    title: "AC1: Work together: A arms an item and B's row names A; B arms it too and each names the other; no banner, nothing refused",
    run: async ({ page, context }) => {
      const { name, item, b } = await twoWindows(page, context, "work_together", "together");
      try {
        await arm(page, name);
        await waitFor(async () => (await tags(b.page, name)).includes("Bench E."), "B's row to name A", 5000);
        await arm(b.page, name);
        await waitFor(async () => (await tags(page, name)).includes("Sara W."), "A's row to name B", 5000);
        const banners = (await page.locator("[data-also-working]").count()) + (await b.page.locator("[data-also-working]").count());
        const refusals = await b.page.getByRole("alert").count();
        expect(banners === 0, "a Warn me banner showed in Work together");
        expect(refusals === 0, "B was refused");
        return "B's row: Bench E.; A's row: Sara W.; no banner, no refusal";
      } finally {
        await b.context.close();
        await removeItem(token, r, item.uuid);
      }
    },
  },
  {
    title: "AC2: Warn me: when both have the item in hand, each sees a banner naming the other",
    run: async ({ page, context }) => {
      const { name, item, b } = await twoWindows(page, context, "warn", "warn");
      try {
        await arm(page, name);
        await arm(b.page, name);
        const bannerB = b.page.locator("[data-also-working]");
        const bannerA = page.locator("[data-also-working]");
        await bannerB.waitFor({ timeout: 5000 });
        await bannerA.waitFor({ timeout: 5000 });
        const [ta, tb] = [(await bannerA.textContent()).trim(), (await bannerB.textContent()).trim()];
        expect(tb.replace(/\s+/g, " ") === "Bench E. is also working on this item.", `B's banner: "${tb}"`);
        expect(ta.replace(/\s+/g, " ") === "Sara W. is also working on this item.", `A's banner: "${ta}"`);
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
        await waitFor(async () => (await tags(b.page, name)).includes("Bench E."), "B to see A's hold", 5000);
        const held = await menuState(b.page, name, HELD_ACTIONS);
        const notDisabled = Object.entries(held).filter(([, s]) => !s.disabled || !s.text.includes("Bench E. is editing this item right now."));
        await row(b.page, name).click();
        const panel = await b.page.locator("[data-held-by]").textContent();

        await page.getByRole("button", { name: "Done" }).click();
        const freedAt = Date.now();
        await waitFor(
          async () => {
            const s = await menuState(b.page, name, ["Add a shape"]);
            return !s["Add a shape"].disabled;
          },
          "B's Add a shape to re-enable",
          5000,
          100,
        );
        const took = Date.now() - freedAt;
        expect(notDisabled.length === 0, `not held on B: ${JSON.stringify(notDisabled)}`);
        expect(panel.includes("Bench E. is editing this item right now."), `panel: "${panel}"`);
        expect(took < 2000, `B was freed after ${took} ms`);
        return `all six actions disabled with "Bench E. is editing this item right now."; properties view-only; freed ${took} ms after Done`;
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
        await waitFor(async () => (await tags(b.page, name)).includes("Bench E."), "B to see A's hold", 5000);
        const closedAt = Date.now();
        await page.close();
        await waitFor(async () => (await tags(b.page, name)).length === 0, "B to be freed", 5000, 100);
        const took = Date.now() - closedAt;
        const s = await menuState(b.page, name, ["Add a shape"]);
        expect(!s["Add a shape"].disabled, "B still cannot add");
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
        await signInAt(page, APP, SEEDED.email, SEEDED.password);
        await openSheet(page, r);
        const tab2 = await context.newPage();
        await openSheet(tab2, r);
        await arm(page, name);
        await waitFor(async () => (await tags(tab2, name)).includes("Bench E."), "tab 2 to see tab 1's hold", 5000);
        const s = await menuState(tab2, name, ["Add a shape"]);
        const reason = "You're editing this item in another tab. Finish or close that tab first.";
        expect(s["Add a shape"].disabled && s["Add a shape"].text.includes(reason), JSON.stringify(s));
        return `tab 2: Add a shape disabled, "${reason}"`;
      } finally {
        await setMode(token, workspace.uuid, "work_together");
        await removeItem(token, r, item.uuid);
      }
    },
  },
]);

// F8-S18: saved shapes live on today's takeoff page (legacy channel 1), and the item
// list that stays visible with properties open.
//
//   docker compose --profile browser run --rm browser node scripts/f8-s18.mjs
//
// Added after the founder's Block B/C check found shapes reaching one window and not the
// other. The cause: no takeoff write published anything, and what looked live was a
// refetch set off by an unrelated workspace event (the owner's mode change), which the
// owner's own window skipped as its echo. Now every item and shape write publishes, and
// both directions are proved here, each within a second, with neither window focused.

import { APP, SEEDED, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import { APP_B, WINDOW_B, ensureWindowB, recordSockets, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";
import { clickSheet, countItem, menuItem, openSheet, removeItem, riverside, row, setMode } from "./lib/takeoff.mjs";

await ensureWindowB();
const token = await apiLogin();
const workspace = await firstWorkspace(token);
const r = await riverside(token, workspace.uuid);
await setMode(token, workspace.uuid, "work_together");

/** Tell the page it is hidden and blurred, as a window behind another is: nothing may
 *  arrive by a refetch on focus. */
async function unfocus(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("blur"));
  });
}

/** The row's quantity line, read from its own element: the row's whole text runs the
 *  name's digits into it. */
const quantity = async (page, name) =>
  ((await row(page, name).locator("span.font-mono").first().textContent()) ?? "").match(/^(\d+) EA/)?.[1];

/** One window adds a shape; how long until the other shows it. */
async function addAndTime(from, to, name, at, expected) {
  await (await menuItem(from, name, "Add a shape")).click();
  const saved = from.waitForResponse((res) => res.url().includes("/geometry") && res.request().method() === "POST");
  await clickSheet(from, at, at);
  await saved;
  const t0 = Date.now();
  await waitFor(async () => (await quantity(to, name)) === String(expected), `the other window to read ${expected} EA`, 3000, 25);
  return Date.now() - t0;
}

await run("f8-s18", [
  {
    title: "AC1: a shape added in either window shows in the other within a second, with neither window focused",
    run: async ({ page, context }) => {
      const name = `F8-S18 both ways ${Date.now() % 1000000}`;
      const item = await countItem(token, r, name);
      await recordSockets(context);
      const b = await secondWindow(context);
      try {
        await signInAt(page, APP, SEEDED.email, SEEDED.password);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await openSheet(page, r);
        await openSheet(b.page, r, APP_B);
        await unfocus(page);
        await unfocus(b.page);

        const aToB = await addAndTime(page, b.page, name, 0.55, 2);
        const bToA = await addAndTime(b.page, page, name, 0.6, 3);
        expect(aToB < 1000, `A to B took ${aToB} ms`);
        expect(bToA < 1000, `B to A took ${bToA} ms`);
        return `A (api) to B (api-b): ${aToB} ms · B to A: ${bToA} ms, both windows hidden and blurred`;
      } finally {
        await b.context.close();
        await removeItem(token, r, item.uuid);
      }
    },
  },
  {
    title: "AC2: an edited shape and a deleted shape each show in the other window within a second",
    run: async ({ page, context }) => {
      const name = `F8-S18 edit ${Date.now() % 1000000}`;
      const item = await countItem(token, r, name, [0.4, 0.4]);
      await recordSockets(context);
      const b = await secondWindow(context);
      try {
        await signInAt(page, APP, SEEDED.email, SEEDED.password);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await openSheet(page, r);
        await openSheet(b.page, r, APP_B);
        await unfocus(page);
        await unfocus(b.page);
        const marksAt = (p) => p.locator('svg[role="presentation"] circle').evaluateAll((cs) => cs.map((c) => `${c.getAttribute("cx")},${c.getAttribute("cy")}`));
        const before = await marksAt(b.page);

        // Edit: A drags the mark.
        await (await menuItem(page, name, "Edit vertices")).click();
        const handle = page.locator("circle.cursor-move").first();
        const box = await handle.boundingBox();
        const saved = page.waitForResponse((res) => res.url().includes("/geometry/") && res.request().method() === "PATCH");
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 80, box.y + 50, { steps: 6 });
        await page.mouse.up();
        await saved;
        const t0 = Date.now();
        await waitFor(async () => JSON.stringify(await marksAt(b.page)) !== JSON.stringify(before), "B to show the moved mark", 3000, 25);
        const edited = Date.now() - t0;
        await page.getByRole("button", { name: "Done" }).click();

        // Delete: A deletes the item.
        await (await menuItem(page, name, "Delete item")).click();
        const gone = page.waitForResponse((res) => res.url().includes(`/item/${item.uuid}`) && res.request().method() === "DELETE");
        await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
        await gone;
        const t1 = Date.now();
        await waitFor(async () => (await row(b.page, name).count()) === 0, "B to drop the deleted item", 3000, 25);
        const deleted = Date.now() - t1;

        expect(edited < 1000, `edit reached B after ${edited} ms`);
        expect(deleted < 1000, `delete reached B after ${deleted} ms`);
        return `edit reached B in ${edited} ms; delete in ${deleted} ms`;
      } finally {
        await b.context.close();
        await removeItem(token, r, item.uuid).catch(() => {});
      }
    },
  },
  {
    title: "Finding 3: with an item selected, the item list still shows rows and the properties scroll on their own",
    run: async ({ page, context, shot }) => {
      const name = `F8-S18 layout ${Date.now() % 1000000}`;
      const item = await countItem(token, r, name);
      try {
        await recordSockets(context);
        await page.setViewportSize({ width: 1280, height: 720 });
        await signInAt(page, APP, SEEDED.email, SEEDED.password);
        await openSheet(page, r);
        await row(page, name).click();
        await page.locator("[data-properties-pane]").waitFor();
        await (await menuItem(page, name, "Add a shape")).click();

        await page.screenshot({ path: shot.replace(".png", "-panel.png") });
        const tree = await page.locator("aside > div.overflow-y-auto").first().boundingBox();
        const pane = page.locator("[data-properties-pane]");
        const scrolls = await pane.evaluate((el) => el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY === "auto");
        const rowBox = await row(page, name).boundingBox();
        const visible = rowBox && tree && rowBox.y >= tree.y - 1 && rowBox.y + rowBox.height <= tree.y + tree.height + 1;
        expect(tree.height >= 128, `the tree is ${tree.height}px tall`);
        expect(visible, "the selected item's row is not visible in the tree");
        expect(scrolls, "the properties do not scroll in their own area");
        return `at 1280x720 with Add a shape armed: tree ${Math.round(tree.height)}px with the row in view; properties scroll on their own`;
      } finally {
        await removeItem(token, r, item.uuid);
      }
    },
  },
]);

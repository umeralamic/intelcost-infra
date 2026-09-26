// F8-S12 AC5: One at a time, A's api restarts while A holds an item; B takes it; A comes
// back to find it taken.
//
// Not run on its own: browser/f8-s12.sh restarts `api` on "PHASE restart-api". Window A
// is on :5173 (api), window B on :5174 (api-b), so only A loses its socket.

import { APP, SEEDED, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import { APP_B, WINDOW_B, appSockets, ensureWindowB, recordSockets, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";
import { clickSheet, countItem, itemDetail, menuItem, openSheet, removeItem, riverside, row, setMode } from "./lib/takeoff.mjs";

await ensureWindowB();
const token = await apiLogin();
const workspace = await firstWorkspace(token);
const r = await riverside(token, workspace.uuid);
const tags = async (page, name) => (await row(page, name).locator("[data-people] span").allTextContents()).sort();

await run("f8-s12-restart", [
  {
    title: "AC5: A holds an item when its api restarts; B takes it; A comes back refused, its tool disarmed, and nothing A draws lands on the item",
    run: async ({ page, context, shot }) => {
      await setMode(token, workspace.uuid, "one_at_a_time");
      const name = `F8-S12 restart ${Date.now() % 1000000}`;
      const item = await countItem(token, r, name);
      await recordSockets(context);
      const b = await secondWindow(context);
      try {
        await signInAt(page, APP, SEEDED.email, SEEDED.password);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await openSheet(page, r);
        await openSheet(b.page, r, APP_B);

        await (await menuItem(page, name, "Add a shape")).click();
        await waitFor(async () => (await tags(b.page, name)).includes("Bench E."), "B to see A's hold", 5000);
        // Not selected first: with the properties panel open the tree above it can shrink
        // to no visible rows (pre-F8 layout, F6's), and the row menu below needs the row.
        await b.page.screenshot({ path: shot.replace(".png", "-held.png") });
        const before = (await appSockets(page)).length;

        console.log("PHASE restart-api");
        // A's socket closes with the api, and its hold goes with it.
        await waitFor(async () => (await tags(b.page, name)).length === 0, "B to see A's hold released", 30000, 200);
        await (await menuItem(b.page, name, "Add a shape")).click();

        // A reconnects, re-asks for the item, and is refused.
        await waitFor(
          async () => (await appSockets(page)).length > before && (await appSockets(page)).at(-1).received.some((f) => f.type === "ready"),
          "A to reconnect",
          60000,
          250,
        );
        const alert = page.getByRole("alert").filter({ hasText: "Sara W. is editing this item right now." });
        await alert.waitFor({ timeout: 10000 });
        const armed = await page.getByText("Draw the extra shape.").count();
        await clickSheet(page, 0.7, 0.2);
        await page.waitForTimeout(1500);
        const shapes = (await itemDetail(token, r, item.uuid)).body.geometries.length;

        expect(armed === 0, "A's Add a shape is still armed");
        expect(shapes === 1, `the item has ${shapes} shapes; A's click landed on it`);
        return 'A reconnected and was told "Sara W. is editing this item right now."; its tool disarmed; its next click added nothing to the item';
      } finally {
        await setMode(token, workspace.uuid, "work_together");
        await b.context.close();
        await removeItem(token, r, item.uuid);
      }
    },
  },
]);

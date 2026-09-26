// F8-S9: shapes as rows, made safe (D-32).
//
//   docker compose --profile browser run --rm browser node scripts/f8-s9.mjs
//
// The three stale-view paths the audit found, each driven where it failed: two adds at
// once leaving the stored quantity short, two edits of one shape both passing the
// version check, and Delete last shape deleting a colleague's newer shape.
//
// Needs the realtime profile: window B is on :5174, and requests go to both api
// processes, so the item lock is proved across processes, not inside one.

import { APP, SEEDED, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import { APP_B, WINDOW_B, call, ensureWindowB, recordSockets, secondWindow, signInAt } from "./lib/realtime.mjs";
import {
  clickSheet,
  countItem,
  itemDetail,
  menuItem,
  openSheet,
  removeItem,
  riverside,
  row,
  setMode,
} from "./lib/takeoff.mjs";

const tokenA = await apiLogin();
const tokenB = await ensureWindowB();
const workspace = await firstWorkspace(tokenA);
const r = await riverside(tokenA, workspace.uuid);
await setMode(tokenA, workspace.uuid, "work_together");
const stamp = () => Date.now() % 1000000;

await run("f8-s9", [
  {
    title: "AC5: fifty adds to one item at once, across both api processes: fifty rows, and the stored quantity is their sum",
    run: async () => {
      const item = await countItem(tokenA, r, `F8-S9 fifty ${stamp()}`);
      try {
        const adds = await Promise.all(
          Array.from({ length: 50 }, (_, i) =>
            call(
              i % 2 ? tokenA : tokenB,
              "POST",
              `${r.takeoff}/item/${item.uuid}/geometry`,
              { geom_type: "count", vertices_json: [[0.1 + i * 0.01, 0.6]], shape_meta: null },
              {},
              i % 2 ? 8000 : 8010,
            ),
          ),
        );
        const detail = (await itemDetail(tokenA, r, item.uuid)).body;
        const refused = adds.filter((a) => a.status !== 201);
        expect(refused.length === 0, `${refused.length} adds refused: ${JSON.stringify(refused[0]?.body)}`);
        expect(detail.geometries.length === 51, `${detail.geometries.length} shapes, expected 51`);
        expect(detail.effective_quantity === 51, `stored quantity ${detail.effective_quantity}, expected 51`);
        return "50 simultaneous adds on two api processes: 51 shapes, quantity 51 EA";
      } finally {
        await removeItem(tokenA, r, item.uuid);
      }
    },
  },
  {
    title: "AC2, AC3: two edits of the same shape at once: one wins and the other is told who; edits of different shapes both stand",
    run: async () => {
      const item = await countItem(tokenA, r, `F8-S9 same shape ${stamp()}`);
      try {
        // Taken while it is the only shape: the api does not promise an order, so reading
        // "the first" after a second exists can hand back either.
        const [g1] = (await itemDetail(tokenA, r, item.uuid)).body.geometries;
        const second = await call(tokenA, "POST", `${r.takeoff}/item/${item.uuid}/geometry`, {
          geom_type: "count",
          vertices_json: [[0.5, 0.5]],
          shape_meta: null,
        });
        const move = (token, g, x, port) =>
          call(token, "PATCH", `${r.takeoff}/geometry/${g.uuid}`, {
            vertices_json: [[x, 0.3]],
            shape_meta: null,
            geometry_version: g.geometry_version,
          }, {}, port);

        const same = await Promise.all([move(tokenA, g1, 0.31, 8000), move(tokenB, g1, 0.32, 8010)]);
        const won = same.filter((s) => s.status === 200);
        const lost = same.filter((s) => s.status === 409);
        const winner = same[0].status === 200 ? "Bench E." : "Sara W.";
        expect(won.length === 1 && lost.length === 1, `statuses ${same.map((s) => s.status).join(", ")}`);
        expect(
          lost[0].body.detail === `${winner} just changed this shape, showing their version.`,
          `loser was told "${lost[0].body.detail}"`,
        );

        const fresh = (await itemDetail(tokenA, r, item.uuid)).body.geometries;
        const [f1, f2] = [fresh.find((g) => g.uuid === g1.uuid), fresh.find((g) => g.uuid === second.body.uuid)];
        const different = await Promise.all([move(tokenA, f1, 0.33, 8000), move(tokenB, f2, 0.52, 8010)]);
        expect(different.every((d) => d.status === 200), `different shapes: ${different.map((d) => `${d.status} ${JSON.stringify(d.body)}`).join(", ")}`);
        return `same shape: one 200, one 409 "${lost[0].body.detail}" · different shapes of one item: both 200`;
      } finally {
        await removeItem(tokenA, r, item.uuid);
      }
    },
  },
  {
    title: "AC2 on screen: A changes a shape while B is mid-drag on it: B's release is refused naming A, and the shape shows A's version",
    run: async ({ page, context }) => {
      const name = `F8-S9 drag ${stamp()}`;
      const item = await countItem(tokenA, r, name, [0.4, 0.4]);
      try {
        await recordSockets(context);
        await signInAt(page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await openSheet(page, r, APP_B);
        await row(page, name).waitFor();
        await (await menuItem(page, name, "Edit vertices")).click();
        const handle = page.locator("circle.cursor-move").first();
        const box = await handle.boundingBox();

        // B is mid-drag when A's move lands. Since F8-S18 a window hears A's change and
        // refetches, so a conflict is no longer "B loaded it long ago": it is two hands
        // on one shape in the same moment, which is what the guard is for.
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 30, box.y + 20, { steps: 3 });
        const [g] = (await itemDetail(tokenA, r, item.uuid)).body.geometries;
        const moved = await call(tokenA, "PATCH", `${r.takeoff}/geometry/${g.uuid}`, {
          vertices_json: [[0.45, 0.45]],
          shape_meta: null,
          geometry_version: g.geometry_version,
        });
        expect(moved.status === 200, `A's move: ${moved.status}`);
        await page.waitForTimeout(500);
        await page.mouse.move(box.x + 60, box.y + 40, { steps: 3 });
        await page.mouse.up();

        const alert = page.getByRole("alert").filter({ hasText: "just changed this shape" });
        await alert.waitFor({ timeout: 8000 });
        const said = (await alert.textContent()) ?? "";
        const after = (await itemDetail(tokenA, r, item.uuid)).body.geometries[0].vertices_json[0];
        expect(said.includes("Bench E. just changed this shape, showing their version."), `B was told "${said}"`);
        expect(after[0] === 0.45 && after[1] === 0.45, `the stored shape is ${JSON.stringify(after)}`);
        return `B saw "Bench E. just changed this shape, showing their version."; the shape stayed where A put it`;
      } finally {
        await removeItem(tokenA, r, item.uuid);
      }
    },
  },
  {
    title: "AC4: a Delete last shape sent from a stale view removes only that shape: a colleague's newer shape and the item stay",
    run: async () => {
      // Proved at the api. Since F8-S18 an open window hears a colleague's add and is no
      // longer stale, so the stale view is the request itself: A asks to delete the one
      // shape it knows of, "and the item if that was the last", after B added another.
      const name = `F8-S9 last ${stamp()}`;
      const item = await countItem(tokenA, r, name, [0.2, 0.2]);
      try {
        const [mine] = (await itemDetail(tokenA, r, item.uuid)).body.geometries;
        const added = await call(tokenB, "POST", `${r.takeoff}/item/${item.uuid}/geometry`, {
          geom_type: "count",
          vertices_json: [[0.25, 0.25]],
          shape_meta: null,
        }, {}, 8010);
        expect(added.status === 201, `B's add: ${added.status}`);

        const removed = await call(tokenA, "DELETE", `${r.takeoff}/geometry/${mine.uuid}?drop_empty_item=true`);
        const after = await itemDetail(tokenA, r, item.uuid);
        expect(removed.status === 200 && removed.body.detail === "Geometry deleted.", `A's delete: ${JSON.stringify(removed.body)}`);
        expect(after.status === 200, `the item is gone (${after.status})`);
        expect(
          after.body.geometries.length === 1 && after.body.geometries[0].uuid === added.body.uuid,
          `left: ${JSON.stringify(after.body.geometries.map((g) => g.uuid))}`,
        );
        return "A's request thought its shape was the last; the api removed only that shape and kept B's and the item";
      } finally {
        await removeItem(tokenA, r, item.uuid);
      }
    },
  },
  {
    title: "AC1: A and B, in two windows, each add a shape to one item within the same second; both survive, and the total counts both",
    run: async ({ page, context }) => {
      const name = `F8-S9 together ${stamp()}`;
      const item = await countItem(tokenA, r, name, [0.15, 0.15]);
      await recordSockets(context);
      const b = await secondWindow(context);
      try {
        await signInAt(page, APP, SEEDED.email, SEEDED.password);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await openSheet(page, r);
        await openSheet(b.page, r, APP_B);
        await (await menuItem(page, name, "Add a shape")).click();
        await (await menuItem(b.page, name, "Add a shape")).click();
        await Promise.all([clickSheet(page, 0.62, 0.62), clickSheet(b.page, 0.66, 0.66)]);
        await page.waitForTimeout(1500);

        await page.reload();
        await b.page.reload();
        await row(page, name).waitFor();
        await row(b.page, name).waitFor();
        const [ta, tb] = [await row(page, name).textContent(), await row(b.page, name).textContent()];
        const detail = (await itemDetail(tokenA, r, item.uuid)).body;
        expect(detail.geometries.length === 3, `${detail.geometries.length} shapes`);
        expect(ta.includes("3 EA") && tb.includes("3 EA"), `rows read "${ta}" and "${tb}"`);
        return "both windows' shapes saved; after reload both rows read 3 EA";
      } finally {
        await b.context.close();
        await removeItem(tokenA, r, item.uuid);
      }
    },
  },
]);

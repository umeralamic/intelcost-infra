// F6 Block E: F6-S16, the MANAGER row's two-window check, across every new F6 write.
//
//   docker compose --profile realtime up -d
//   docker compose --profile browser run --rm browser node scripts/f6-e.mjs
//
// Window A is the owner, "Fixture O.", on :5173 (api). Window B is "Sara W." on :5174
// (api-b), so every "live" is across api processes. The world is this run's own
// Riverside (lib/world.mjs), page 1 calibrated.

import { APP, expect, run } from "./lib/bench.mjs";
import { A_NAME, APP_B, WINDOW_B, call, recordSockets, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";
import { armMeasure, clickSheet, menuItem, openSheet, removeItem, setMode } from "./lib/takeoff.mjs";
import { riversideWorld } from "./lib/world.mjs";

const world = await riversideWorld();
const token = world.token;
const tokenB = world.sara.token;
const workspace = world.workspace;
const r = world.r;
const stamp = () => Date.now() % 1000000;
const held = `${A_NAME} is editing this item right now.`;

const rowOf = (page, name) =>
  page.locator("[data-quantity-panel] li[data-item-row] > button").filter({ has: page.getByText(name, { exact: true }) }).first();
const folderOf = (page, name) => page.locator(`[data-quantity-panel] [data-folder-group="${name}"]`);

async function bothOpen(page, context) {
  await recordSockets(context);
  const b = await secondWindow(context);
  await signInAt(page, APP, world.owner.email, world.owner.password);
  await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
  await openSheet(page, r);
  await openSheet(b.page, r, APP_B);
  return b;
}

/** How long B took to show what `probe` looks for, after A's act. */
async function followed(b, probe, what) {
  const at = Date.now();
  await waitFor(probe, what, 10000, 50);
  return Date.now() - at;
}

await run("f6-e", [
  {
    title: "AC1: Work together: A measures a new item, renames it and files it in a folder; B's tree follows each change without a reload",
    run: async ({ page, context }) => {
      await setMode(token, workspace.uuid, "work_together");
      const name = `E live ${stamp()}`;
      const folder = (await call(token, "POST", `${r.takeoff}/folder`, { name: `E folder ${stamp()}` })).body;
      const b = await bothOpen(page, context);
      try {
        await folderOf(b.page, folder.name).waitFor({ state: "attached", timeout: 10000 }).catch(() => {});
        await armMeasure(page, "Count", { name });
        await clickSheet(page, 0.62, 0.62);
        const made = await followed(b, async () => (await rowOf(b.page, name).count()) > 0, "B to list the new item");
        await rowOf(page, name).dblclick();
        await page.getByLabel(`Rename ${name}`).fill(`${name} renamed`);
        await page.getByLabel(`Rename ${name}`).press("Enter");
        const renamed = await followed(b, async () => (await rowOf(b.page, `${name} renamed`).count()) > 0, "B to show the new name");
        const item = (await call(token, "GET", `${r.takeoff}/item`)).body.find((i) => i.name === `${name} renamed`);
        await rowOf(page, `${name} renamed`).waitFor({ timeout: 10000 });
        const filed = await call(token, "PATCH", `${r.takeoff}/item/${item.uuid}`, { folder_uuid: folder.uuid });
        expect(filed.status === 200, `file: ${filed.status}`);
        const moved = await followed(
          b,
          async () => (await folderOf(b.page, folder.name).locator("li[data-item-row]").filter({ has: b.page.getByText(`${name} renamed`, { exact: true }) }).count()) > 0,
          "B to show it in the folder",
        );
        expect(Math.max(made, renamed, moved) < 5000, `made ${made}, renamed ${renamed}, moved ${moved} ms`);
        await removeItem(token, r, item.uuid);
        return `B listed it ${made} ms after A's click, renamed ${renamed} ms, in "${folder.name}" ${moved} ms, no reload`;
      } finally {
        await b.context.close();
        await call(token, "DELETE", `${r.takeoff}/folder/${folder.uuid}`);
      }
    },
  },
  {
    title: "AC2: One at a time: A holds an item; B's Properties, Rename, sub-item and Duplicate entries are disabled with A's name, B's double-click does not rename, and B's hand-written rename, sub-items, dimension and bulk writes are refused 409",
    run: async ({ page, context }) => {
      await setMode(token, workspace.uuid, "one_at_a_time");
      const name = `E held ${stamp()}`;
      const made = await call(token, "POST", `${r.takeoff}/item`, {
        name, type: "count", unit: "EA", sheet_uuid: r.sheet,
        geometry: { geom_type: "count", vertices_json: [[0.33, 0.33]], shape_meta: null, client_uuid: crypto.randomUUID() },
      });
      const item = made.body;
      const b = await bothOpen(page, context);
      try {
        await (await menuItem(page, name, "Add a shape")).click();
        await waitFor(async () => (await rowOf(b.page, name).locator("[data-people]").textContent().catch(() => ""))?.includes(A_NAME), "B to see A's hold", 8000);
        await rowOf(b.page, name).click({ button: "right" });
        const states = {};
        for (const label of ["Properties", "Rename", "Create sub-item", "Duplicate"]) {
          const entry = b.page.getByRole("menuitem", { name: new RegExp(`^${label}`) });
          states[label] = { disabled: (await entry.getAttribute("aria-disabled")) === "true", text: (await entry.textContent()) ?? "" };
        }
        await b.page.keyboard.press("Escape");
        await rowOf(b.page, name).dblclick();
        const renameBox = await b.page.getByLabel(`Rename ${name}`).count();
        const tries = {
          rename: await call(tokenB, "PATCH", `${r.takeoff}/item/${item.uuid}`, { name: "Taken" }),
          subItems: await call(tokenB, "PUT", `${r.takeoff}/item/${item.uuid}/sub-items`, { sub_items: [{ name: "Grab", formula_text: "PARENT", unit: "EA" }] }),
          dimension: await call(tokenB, "PUT", `${r.takeoff}/item/${item.uuid}/dimension`, { dimensions: [{ local_key: "d1", name: "Depth", kind: "vertical", value: 1 }] }),
          bulk: await call(tokenB, "POST", `${r.takeoff}/item/bulk`, { item_uuids: [item.uuid], to_unfiled: true }),
        };
        const notHeld = Object.entries(states).filter(([label, s]) => (label === "Duplicate" ? !s.disabled : !s.disabled || !s.text.includes(held)));
        const notRefused = Object.entries(tries).filter(([, res]) => res.status !== 409 || !String(res.body?.detail ?? "").includes("is editing this item right now"));
        expect(notHeld.length === 0, `not disabled on B: ${JSON.stringify(notHeld)}`);
        expect(renameBox === 0, "B's double-click opened a rename");
        expect(notRefused.length === 0, `not refused: ${JSON.stringify(Object.fromEntries(notRefused.map(([k, v]) => [k, [v.status, v.body]])))}`);
        await page.keyboard.press("Escape");
        return `B's Properties, Rename, Create sub-item, Duplicate disabled ("${held}"); double-click no rename; rename, sub-items, dimension, bulk each 409 "${tries.rename.body.detail}"`;
      } finally {
        await b.context.close();
        await setMode(token, workspace.uuid, "work_together");
        await removeItem(token, r, item.uuid);
      }
    },
  },
  {
    title: "AC3: Work together: A rewrites a sub-item while B changes the parent's dimension, at once; both save, and both windows end on the same figure (3 EA × 5 × 2 = 30)",
    run: async ({ page, context }) => {
      await setMode(token, workspace.uuid, "work_together");
      const name = `E both ${stamp()}`;
      const item = (await call(token, "POST", `${r.takeoff}/item`, {
        name, type: "count", unit: "EA", sheet_uuid: r.sheet,
        dimensions: [{ local_key: "d1", name: "Depth", kind: "vertical", value: 2 }],
        geometry: { geom_type: "count", vertices_json: [[0.4, 0.4], [0.45, 0.4], [0.5, 0.4]], shape_meta: null, client_uuid: crypto.randomUUID() },
      })).body;
      const first = await call(token, "PUT", `${r.takeoff}/item/${item.uuid}/sub-items`, { sub_items: [{ name: "Fill", formula_text: "PARENT * {dim:d1}", unit: "EA" }] });
      expect(first.status === 200, `sub-item: ${first.status} ${JSON.stringify(first.body)}`);
      const sub = first.body[0];
      const b = await bothOpen(page, context);
      try {
        const [a, bb] = await Promise.all([
          call(token, "PUT", `${r.takeoff}/item/${item.uuid}/sub-items`, { sub_items: [{ uuid: sub.uuid, name: "Fill", formula_text: "PARENT * {dim:d1} * 2", unit: "EA" }] }),
          call(tokenB, "PUT", `${r.takeoff}/item/${item.uuid}/dimension`, { dimensions: [{ local_key: "d1", name: "Depth", kind: "vertical", value: 5 }] }),
        ]);
        expect(a.status === 200 && bb.status === 200, `A ${a.status} ${JSON.stringify(a.body)}, B ${bb.status} ${JSON.stringify(bb.body)}`);
        const stored = (await call(token, "GET", `${r.takeoff}/item/detail`)).body.find((i) => i.uuid === sub.uuid);
        const shown = async (p) => ((await p.locator(`[data-sub-item="${sub.uuid}"] [data-sub-item-qty]`).textContent().catch(() => "")) ?? "").trim();
        await waitFor(async () => /^30(\.0+)? EA$/.test(await shown(page)) && /^30(\.0+)? EA$/.test(await shown(b.page)), "both windows to read 30 EA", 10000);
        expect(Math.abs(stored.effective_quantity - 30) < 1e-9, `stored ${stored.effective_quantity}`);
        return `A's formula and B's depth both saved; stored ${stored.effective_quantity}; A reads "${await shown(page)}", B reads "${await shown(b.page)}"`;
      } finally {
        await b.context.close();
        await removeItem(token, r, item.uuid);
      }
    },
  },
]);

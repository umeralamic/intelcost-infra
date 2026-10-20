// N11 (night run 2026-10-20): a Ctrl+Z pressed while the undo before it is still saving waits its
// turn and runs, never dropped (D-649).
//
//   ./fx-suite.sh run n11-undo-queue
//
// Three moves of a count mark make three undo steps. Three Ctrl+Z pressed back to back, with no
// wait between them, must take all three back: the mark ends where it began, and three writes are
// sent. Before D-649 the second and third presses came while the first was saving and were dropped.

import { APP, expect, run } from "./lib/bench.mjs";
import { call, signInAt } from "./lib/realtime.mjs";
import { allowShareToken } from "./lib/protected.mjs";
import { riversideWorld } from "./lib/world.mjs";

const world = await riversideWorld();
const { token, r } = world;

async function api(method, path, body) {
  const res = await call(token, method, path, body);
  if (res.status >= 300) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(res.body).slice(0, 300)}`);
  return res.body;
}
const markOf = async (item) => (await api("GET", `${r.takeoff}/item/${item}`)).geometries[0].vertices_json[0];

await run("n11-undo-queue", [
  {
    title: "Three Ctrl+Z in quick succession undo three steps",
    run: async ({ page }) => {
      const item = (await api("POST", `${r.takeoff}/item`, { name: `N11 ${Date.now() % 100000}`, type: "count", unit: "EA", sheet_uuid: r.sheet, geometry: { geom_type: "count", vertices_json: [[0.45, 0.45]], shape_meta: null } })).uuid;
      try {
        await signInAt(page, APP, world.owner.email, world.owner.password);
        await page.goto(r.url(APP));
        await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 30000 });
        await page.locator('[data-tool="select"]').first().click();
        const svg = page.locator('svg[viewBox="0 0 1 1"]').first();
        const start = await markOf(item);
        let mark = start;
        // Three moves, each saved before the next: three undo steps.
        for (let i = 0; i < 3; i += 1) {
          const box = await svg.boundingBox();
          const p = { x: box.x + box.width * mark[0], y: box.y + box.height * mark[1] };
          const saved = page.waitForResponse((res) => res.url().includes("/takeoff/geometry/") && res.request().method() === "PATCH");
          await page.mouse.move(p.x, p.y);
          await page.mouse.down();
          await page.mouse.move(p.x + 45, p.y + 30, { steps: 6 });
          await page.mouse.up();
          await saved;
          mark = await markOf(item);
        }
        expect(Math.abs(mark[0] - start[0]) > 0.05, `three moves took the mark away: ${start} → ${mark}`);
        const writes = [];
        page.on("response", (res) => {
          const method = res.request().method();
          if (res.url().includes(r.takeoff.split("/takeoff")[0]) && !["GET", "OPTIONS"].includes(method)) writes.push(`${method} ${res.status()}`);
        });
        // Back to back: the second and third come while the first is still saving.
        const box = await svg.boundingBox();
        await page.mouse.move(box.x + 10, box.y + 10);
        await page.keyboard.press("Control+z");
        await page.keyboard.press("Control+z");
        await page.keyboard.press("Control+z");
        const deadline = Date.now() + 15000;
        let end = await markOf(item);
        while (Date.now() < deadline && (writes.length < 3 || JSON.stringify(end) !== JSON.stringify(start))) {
          await page.waitForTimeout(250);
          end = await markOf(item);
        }
        expect(writes.length === 3, `three undo writes, not ${writes.length}: ${writes.join(", ")}`);
        expect(JSON.stringify(end) === JSON.stringify(start), `the mark is back where it began: ${start} vs ${end}`);
        return `${start} → ${mark} in three moves; three Ctrl+Z back to back sent ${writes.join(", ")} and put it back at ${end}`;
      } finally {
        await call(token, "DELETE", `${r.takeoff}/item/${item}`);
      }
    },
  },
  {
    title: "A guest: three Ctrl+Z and a Ctrl+Y back to back, on Takeoff and on Estimating, send nothing",
    run: async ({ context }) => {
      const link = await api("POST", `${r.takeoff.replace(/\/takeoff$/, "")}/share-link`);
      // The bench browser refuses every share link but the run's own (D-542).
      allowShareToken(link.token);
      const guest = await context.browser().newContext();
      try {
        const page = await guest.newPage();
        const writes = [];
        page.on("request", (q) => {
          if (!["GET", "HEAD", "OPTIONS"].includes(q.method()) && /\/api\//.test(q.url()) && !/\/(session|pass|presence|visit)(\?|$)/.test(q.url())) writes.push(`${q.method()} ${q.url()}`);
        });
        await page.goto(`${APP}/s/${link.token}`);
        await page.waitForURL(new RegExp(`/project/${r.project}/takeoff`), { timeout: 30000 });
        await page.goto(r.url(APP));
        await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 30000 });
        for (const key of ["Control+z", "Control+z", "Control+z", "Control+y"]) await page.keyboard.press(key);
        await page.waitForTimeout(1500);
        await page.goto(`${r.url(APP)}?tab=estimating`);
        await page.locator("[data-estimating]").first().waitFor({ timeout: 30000 });
        for (const key of ["Control+z", "Control+z", "Control+z", "Control+y"]) await page.keyboard.press(key);
        await page.waitForTimeout(1500);
        expect(writes.length === 0, `the guest sent ${writes.join(", ")}`);
        return "Takeoff and Estimating: three Ctrl+Z and a Ctrl+Y, no writes";
      } finally {
        await guest.close();
      }
    },
  },
]);

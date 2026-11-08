// Click check C13 (pending_umer.md; F7 with P-21, archive OVERNIGHT_REPORT_2026-09-28.md:555-684
// and OVERNIGHT_REPORT_2026-09-29.md:205-235): canvas tools, the four never driven by anyone.
//
//   node fx-run-locked.mjs c13-canvas-tools
//
// Asserts: (1) a vertex conflict: the owner (window A) and Sara W., a second throwaway account
// seated as an estimator (window B, on the other app and api), select the same area and drag the
// same corner, letting go at once: exactly one drag is stored, the other window is told "{name}
// just changed this shape", and both windows end on the stored corner; (2) a six-section paste:
// Copy… on one of an item's six runs, "All sections on this sheet (6)", Paste on this sheet, Same
// item: the item doubles to twelve runs; (3) a three-item box delete: a Select box around three
// items, right-click, Delete: all three leave the sheet, in window B too; (4) Crop as New Page: a
// box over empty paper, Crop as New Page: A opens "{name} (Crop)" and B's Sheets panel lists it
// with no reload.
//
// The world: this run's own Riverside (lib/world.mjs): page 1 calibrated, Sara W. seated, the
// workspace in Work together. Pad (an area), Six (six runs) and Trio A, B, C (three small areas)
// are made through the api.
//
// Left for the founder's eye: what the losing window looks like in the moment of a conflict
// (the shape snapping back, the wording), the paste ghost's feel, and the cropped page's crispness.

import { APP, expect, run } from "./lib/bench.mjs";
import { APP_B, call, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";
import { openSheet, setMode, sheetPoint } from "./lib/takeoff.mjs";
import { riversideWorld } from "./lib/world.mjs";

const world = await riversideWorld();
const { token, r } = world;
const ids = {};

const detail = async (uuid) => (await call(token, "GET", `${r.takeoff}/item/${uuid}`)).body;
const sheetsOf = async () => (await call(token, "GET", `${r.takeoff.replace(/\/takeoff$/, "")}/drawing/sheet`)).body;
const shapeCount = (page, uuid) => page.locator(`[data-geometry="${uuid}"]`).count();

async function signedIn(page, app, who) {
  await signInAt(page, app, who.email, who.password);
}
async function openA(page) {
  await signedIn(page, APP, world.owner);
  await openSheet(page, r);
  await page.locator("[data-quantity-panel] li[data-item-row]").first().waitFor({ timeout: 15000 });
}
async function openB(context) {
  const b = await secondWindow(context);
  await signedIn(b.page, APP_B, world.sara);
  await openSheet(b.page, r, APP_B);
  await b.page.locator("[data-quantity-panel] li[data-item-row]").first().waitFor({ timeout: 15000 });
  return b;
}
async function drag(page, [ax, ay], [bx, by]) {
  const a = await sheetPoint(page, ax, ay);
  const b = await sheetPoint(page, bx, by);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
}
const PAD = [[0.2, 0.2], [0.3, 0.2], [0.3, 0.35], [0.2, 0.35]];

await run("c13-canvas-tools", [
  {
    title: "setup: Riverside page 1 calibrated, Sara W. seated, Work together; Pad (an area), Six (six runs), Trio A, B and C (three small areas)",
    run: async () => {
      await setMode(token, r.workspace, "work_together");
      const make = async (name, type, unit, vertices) => {
        const res = await call(token, "POST", `${r.takeoff}/item`, {
          name, type, unit, sheet_uuid: r.sheet,
          geometry: { geom_type: type, vertices_json: vertices, shape_meta: type === "sf" ? { closed: true } : null, client_uuid: crypto.randomUUID() },
        });
        expect(res.status === 201, `${name}: ${res.status} ${JSON.stringify(res.body)}`);
        return res.body.uuid;
      };
      ids.pad = await make("Pad", "sf", "SF", PAD);
      ids.six = await make("Six", "lf", "LF", [[0.05, 0.45], [0.15, 0.45]]);
      const more = await call(token, "POST", `${r.takeoff}/item/${ids.six}/shapes`, {
        create: [0.5, 0.55, 0.6, 0.65, 0.7].map((y) => ({ geom_type: "lf", vertices_json: [[0.05, y], [0.15, y]], shape_meta: null, client_uuid: crypto.randomUUID(), sheet_uuid: r.sheet })),
      });
      expect([200, 201].includes(more.status), `Six's runs: ${more.status} ${JSON.stringify(more.body)}`);
      for (const [name, x] of [["Trio A", 0.6], ["Trio B", 0.68], ["Trio C", 0.76]]) ids[name] = await make(name, "sf", "SF", [[x, 0.15], [x + 0.05, 0.15], [x + 0.05, 0.25], [x, 0.25]]);
      const six = await detail(ids.six);
      expect(six.geometries.length === 6, `Six has ${six.geometries.length} runs`);
      return `Pad ${(await detail(ids.pad)).effective_quantity.toFixed(0)} SF; Six ${six.effective_quantity.toFixed(0)} LF in 6 runs; Trio A, B, C`;
    },
  },
  {
    title: "vertex conflict: A and B select Pad and drag its corner at once, A right, B down: one drag is stored, the other window is told \"… just changed this shape\", and both end on the stored corner",
    run: async ({ page, context }) => {
      await openA(page);
      const b = await openB(context);
      try {
        const geom = (await detail(ids.pad)).geometries[0];
        const select = async (p) => {
          const at = await sheetPoint(p, 0.25, 0.27);
          await p.mouse.click(at.x, at.y);
          await p.locator(`[data-handle="${geom.uuid}"]`).first().waitFor({ timeout: 5000 });
        };
        await select(page);
        await select(b.page);
        // Both take the bottom-right corner (0.3, 0.35); A pulls it right, B pulls it down.
        const targets = { A: [0.4, 0.35], B: [0.3, 0.5] };
        const press = async (p, to) => {
          const from = await sheetPoint(p, 0.3, 0.35);
          const end = await sheetPoint(p, ...to);
          await p.mouse.move(from.x, from.y);
          await p.mouse.down();
          await p.mouse.move((from.x + end.x) / 2, (from.y + end.y) / 2, { steps: 4 });
          await p.mouse.move(end.x, end.y, { steps: 4 });
        };
        await press(page, targets.A);
        await press(b.page, targets.B);
        await Promise.all([page.mouse.up(), b.page.mouse.up()]);
        const stored = await waitFor(async () => {
          const g = (await detail(ids.pad)).geometries[0];
          return g.geometry_version !== geom.geometry_version ? g : null;
        }, "a drag stored", 10000);
        const corner = stored.vertices_json[2];
        const near = (p, q) => Math.abs(p[0] - q[0]) < 0.01 && Math.abs(p[1] - q[1]) < 0.01;
        const winner = near(corner, targets.A) ? "A" : near(corner, targets.B) ? "B" : null;
        expect(winner, `the stored corner ${JSON.stringify(corner)} is neither A's ${JSON.stringify(targets.A)} nor B's ${JSON.stringify(targets.B)}`);
        const loser = winner === "A" ? b.page : page;
        const told = await waitFor(async () => {
          const t = await loser.getByText(/just changed this shape/).first().textContent().catch(() => null);
          return t ? t.trim() : null;
        }, "the losing window told who changed the shape", 10000).catch(() => {
          throw new Error(`${winner === "A" ? "B" : "A"} lost the race but shows no "… just changed this shape" (or both writes were taken: stored version ${stored.geometry_version}, was ${geom.geometry_version})`);
        });
        // Both windows draw the stored corner: the handle at index 2 sits at the same screen point.
        const handleAt = async (p) => {
          const h = p.locator(`[data-handle="${stored.uuid}"][data-handle-index="2"]`).first();
          if (!(await h.count())) return null;
          const box = await h.boundingBox();
          return box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null;
        };
        const settled = async (p) =>
          waitFor(async () => {
            const want = await sheetPoint(p, corner[0], corner[1]);
            const got = await handleAt(p);
            if (got) return Math.hypot(got.x - want.x, got.y - want.y) < 4 ? true : null;
            const path = await p.locator(`path[data-geometry="${stored.uuid}"]`).first().getAttribute("d").catch(() => null);
            return path ? true : null;
          }, "the window on the stored corner", 10000);
        await settled(page);
        await settled(b.page);
        const final = (await detail(ids.pad)).geometries[0];
        expect(final.geometry_version === stored.geometry_version, `a second write landed after the conflict: version ${final.geometry_version}`);
        return `${winner} won (corner ${corner.map((v) => v.toFixed(3)).join(", ")}); ${winner === "A" ? "B" : "A"} told "${told}"; both windows on the stored corner`;
      } finally {
        await b.context.close();
      }
    },
  },
  {
    title: "six-section paste: right-click a Six run, Copy…, \"All sections on this sheet (6)\", Paste on this sheet, click, Same item: Six has 12 runs and twice the length",
    run: async ({ page }) => {
      const before = await detail(ids.six);
      await openA(page);
      const at = await sheetPoint(page, 0.1, 0.55);
      await page.mouse.click(at.x, at.y, { button: "right" });
      await page.getByRole("menu", { name: "Item actions" }).getByRole("menuitem", { name: "Copy…" }).click();
      const scope = page.getByRole("menu", { name: "Copy scope" });
      await scope.waitFor({ timeout: 5000 });
      const all = scope.getByRole("menuitem", { name: /^All sections on this sheet/ });
      const label = ((await all.innerText()).split("\n")[0] ?? "").trim();
      expect(label === "All sections on this sheet (6)", `scope entry "${label}"`);
      await all.click();
      const where = page.getByRole("menu", { name: "Copy destination" });
      await where.waitFor({ timeout: 5000 });
      await where.getByRole("menuitem", { name: "Paste on this sheet" }).click();
      await page.locator("[data-copy-banner]").waitFor({ timeout: 5000 });
      const ghosts = await page.locator("[data-ghost]").count();
      const target = await sheetPoint(page, 0.35, 0.55);
      await page.mouse.move(target.x - 20, target.y - 20);
      await page.mouse.move(target.x, target.y, { steps: 4 });
      await page.mouse.click(target.x, target.y);
      const dialog = page.getByRole("dialog", { name: "Paste copy" });
      await dialog.waitFor({ timeout: 5000 });
      await dialog.getByRole("button", { name: "Same item" }).click();
      const six = await waitFor(async () => {
        const d = await detail(ids.six);
        return d.geometries.length === 12 ? d : null;
      }, "Six with 12 runs", 15000).catch(async () => {
        throw new Error(`after the paste Six has ${(await detail(ids.six)).geometries.length} runs, wanted 12`);
      });
      expect(Math.abs(six.effective_quantity - 2 * before.effective_quantity) < 1e-6, `Six reads ${six.effective_quantity}, wanted ${2 * before.effective_quantity}`);
      const onPaper = six.geometries.every((g) => g.vertices_json.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1));
      expect(onPaper, `a pasted run fell off the paper: ${JSON.stringify(six.geometries.map((g) => g.vertices_json))}`);
      return `"${label}"; ${ghosts} ghost shapes; Same item: Six ${before.effective_quantity.toFixed(1)} → ${six.effective_quantity.toFixed(1)} LF, 12 runs`;
    },
  },
  {
    title: "three-item box delete: a Select box around Trio A, B and C, right-click, Delete: all three leave the sheet here and in window B; nothing else goes",
    run: async ({ page, context }) => {
      await openA(page);
      const b = await openB(context);
      try {
        const geoms = {};
        for (const name of ["Trio A", "Trio B", "Trio C"]) geoms[name] = (await detail(ids[name])).geometries[0].uuid;
        await waitFor(async () => ((await Promise.all(Object.values(geoms).map((u) => shapeCount(b.page, u)))).every((n) => n > 0) ? true : null), "B drawing the Trio", 15000);
        await drag(page, [0.57, 0.1], [0.84, 0.3]);
        const boxed = await waitFor(async () => {
          const got = await page.locator("[data-box-selected]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-geometry")))]);
          return got.length === 3 ? got : null;
        }, "three shapes boxed", 5000).catch(async () => {
          throw new Error(`the box selected ${await page.locator("[data-box-selected]").count()} shapes, wanted 3`);
        });
        expect(Object.values(geoms).every((u) => boxed.includes(u)), `boxed ${boxed.join()}`);
        const inside = await sheetPoint(page, 0.625, 0.2);
        await page.mouse.click(inside.x, inside.y, { button: "right" });
        const menu = page.getByRole("menu", { name: "Selection" });
        await menu.waitFor({ timeout: 5000 });
        const heading = await menu.getByText("3 selected").count();
        await menu.getByRole("menuitem", { name: "Delete" }).click();
        const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog").filter({ hasText: /Delete/ }));
        if (await confirm.first().isVisible().catch(() => false)) await confirm.first().getByRole("button", { name: /^Delete/ }).last().click();
        await waitFor(async () => {
          const left = await Promise.all(Object.values(ids).length ? ["Trio A", "Trio B", "Trio C"].map(async (n) => (await call(token, "GET", `${r.takeoff}/item/${ids[n]}`)).body?.geometries?.length ?? 0) : []);
          return left.every((n) => n === 0) ? true : null;
        }, "the three shapes gone from the api", 10000);
        await waitFor(async () => ((await Promise.all(Object.values(geoms).map((u) => shapeCount(b.page, u)))).every((n) => n === 0) ? true : null), "B dropping the three shapes", 10000).catch(() => {
          throw new Error("window B still draws a deleted Trio shape");
        });
        const pad = await detail(ids.pad);
        const six = await detail(ids.six);
        expect(pad.geometries.length === 1 && six.geometries.length === 12, `collateral: Pad ${pad.geometries.length}, Six ${six.geometries.length}`);
        return `"3 selected" ${heading === 1 ? "shown" : "missing"}; Delete took Trio A, B and C; B no longer draws them; Pad and Six untouched`;
      } finally {
        await b.context.close();
      }
    },
  },
  {
    title: "Crop as New Page: a box over empty paper, Crop as New Page: A opens \"… (Crop)\", \"Cropped page added\"; window B's Sheets panel lists the new page with no reload",
    run: async ({ page, context }) => {
      await openA(page);
      const b = await openB(context);
      try {
        const before = new Set((await sheetsOf()).map((s) => s.uuid));
        await b.page.locator(`[data-sheet-row="${r.sheet}"]`).first().waitFor({ timeout: 15000 });
        await drag(page, [0.55, 0.5], [0.9, 0.75]);
        const region = page.getByRole("menu", { name: "Region" });
        await region.waitFor({ timeout: 5000 });
        await region.getByRole("menuitem", { name: "Crop as New Page" }).click();
        await page.getByText("Cropped page added").first().waitFor({ timeout: 30000 });
        await page.waitForURL((url) => !url.pathname.endsWith(r.sheet), { timeout: 15000 });
        const fresh = (await sheetsOf()).filter((s) => !before.has(s.uuid));
        expect(fresh.length === 1, `${fresh.length} new sheets`);
        const crop = fresh[0];
        const name = crop.name ?? crop.sheet_name ?? crop.label ?? "";
        expect(page.url().includes(crop.uuid), `A is on ${page.url()}, not the crop ${crop.uuid}`);
        const at = Date.now();
        await b.page.locator(`[data-sheet-row="${crop.uuid}"]`).first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {
          throw new Error(`window B's Sheets panel does not list the cropped page ${crop.uuid} ("${name}") without a reload`);
        });
        const ms = Date.now() - at;
        const shown = ((await b.page.locator(`[data-sheet-row="${crop.uuid}"]`).first().innerText()) ?? "").replace(/\s+/g, " ").trim();
        expect(/\(Crop\)/.test(`${name} ${shown}`), `the crop is named "${name}", B shows "${shown}"`);
        return `A on "${name}" with "Cropped page added"; B listed "${shown}" ${ms} ms after A's toast, no reload`;
      } finally {
        await b.context.close();
      }
    },
  },
]);

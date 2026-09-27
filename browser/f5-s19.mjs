// F5-S19: the two-window live check, on the new canvas.
//
//   docker compose --profile realtime up -d
//   docker compose --profile browser run --rm browser node scripts/f5-s19.mjs
//
// Window A is this run's owner on :5173 (api); window B is Sara W. on :5174 (api-b), so
// every event crosses api processes. Both are open on page 1 of a four-page set with
// pages 1 and 2 in takeoff, the workspace in Work together.
//
// 1. A calibrates page 1 with the Scale tool; B, open on it, shows the new scale and the
//    recomputed quantity with no reload (sheet.calibration.changed).
// 2. A draws a run slowly; B watches it grow, tagged with A's short name, then become a
//    saved shape the moment A finishes (D-33's draft channel).
// 3. A loads pages 3 and 4 through Add sheets; B's sheets panel shows them (Q6,
//    drawing.sheet.changed).

import { APP, apiAccept, apiCall, apiLogin, apiRegister, enterWorkspace, expect, fixtureOwner, invite, inviteTokenFromMail, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, sheetsOf, uploadAll } from "./lib/drawings.mjs";
import { A_NAME, APP_B, WINDOW_B, joinedTopic, recordSockets, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";
import { clickSheet, row, sheetPoint, sweepSheet } from "./lib/takeoff.mjs";

const { token, workspace, base } = await freshWorkspace("F5-S19 two windows");
const project = await makeProject(token, base, { name: "Two windows" });
const takeoff = `${base}/${project.uuid}/takeoff`;
const W = 1224;
const H = 792;
let sheet;

const tool = (page, label) => page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: label, exact: true });
const chip = (page) => page.locator("[data-canvas-scale]");
const reloaded = (page) => page.evaluate(() => performance.getEntriesByType("navigation").length > 1);

/** A and B side by side on page 1, both on the project's topic before anything moves. */
async function twoWindows(context, page) {
  await recordSockets(context);
  const b = await secondWindow(context);
  const owner = await fixtureOwner();
  await signInAt(page, APP, owner.email, owner.password);
  await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
  for (const [p, app] of [[page, APP], [b.page, APP_B]]) {
    await enterWorkspace(p, workspace.uuid);
    await p.goto(`${app}/project/${project.uuid}/takeoff/${sheet.uuid}`);
    await p.locator('img[alt="Drawing sheet"]').waitFor({ timeout: 20000 });
    await chip(p).waitFor({ timeout: 20000 });
    await joinedTopic(p, `ws:${workspace.uuid}:project:${project.uuid}`);
  }
  return b;
}

const items = async () => (await apiCall(token, "GET", `${takeoff}/item?sheet_uuid=${sheet.uuid}`)).body;

await run("f5-s19", [
  {
    title: "setup: a four-page set, pages 1 and 2 in takeoff, page 1 unscaled with a 360 pt run; Sara W. seated; Work together",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Set.pdf", buffer: makePdf([1, 2, 3, 4].map((n) => ({ width: W, height: H, label: `Set ${n}` }))), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Set.pdf"].uuid, [1, 2]]]);
      const prepared = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      sheet = prepared.find((s) => s.page_number === 1);
      const made = await apiCall(token, "POST", `${takeoff}/item`, {
        name: "Wall run", type: "lf", unit: "LF", sheet_uuid: sheet.uuid,
        geometry: { geom_type: "lf", vertices_json: [[0.1, 0.5], [0.1 + 360 / W, 0.5]], shape_meta: null, client_uuid: crypto.randomUUID() },
      });
      expect(made.status === 201, `Wall run: ${made.status}`);
      await invite(token, workspace.uuid, WINDOW_B.email, "estimator");
      const inviteToken = await inviteTokenFromMail(WINDOW_B.email);
      await apiRegister(WINDOW_B.email, WINDOW_B.password, WINDOW_B.fullName);
      const accepted = await apiAccept(await apiLogin(WINDOW_B.email, WINDOW_B.password), inviteToken);
      expect(accepted.status === 200, `seating Sara W.: ${accepted.status}`);
      const mode = await apiCall(token, "PATCH", `/api/workspace/${workspace.uuid}`, { collaboration_mode: "work_together" });
      expect(mode.status === 200, `Work together: ${mode.status}`);
      return `Set.pdf, pages 1, 2 loaded (${prepared.length} prepared) · Wall run 360 pt, unscaled · Sara W. estimator · Work together`;
    },
  },
  {
    title: "1: A calibrates page 1 with the Scale tool; B shows the new scale and the recomputed quantity, no reload",
    run: async ({ page, context }) => {
      const b = await twoWindows(context, page);
      try {
        const before = (await chip(b.page).textContent()).trim();
        expect(before === "Calibrate scale to compute LF / SF", `B's chip before: "${before}"`);
        await tool(page, "Scale").click();
        await clickSheet(page, 0.1, 0.3);
        await clickSheet(page, 0.6, 0.3);
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel("Real distance").fill("100");
        const saved = Date.now();
        await dialog.getByRole("button", { name: "Save calibration" }).click();
        await page.getByText("Scale set — verify with a known dimension").waitFor({ timeout: 10000 });
        // The words A saved, from the api: A's own chip follows the same event B's does.
        const cal = (await apiCall(token, "GET", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/calibration`)).body;
        const aChip = `Scale: ${cal.label}`;
        await b.page.locator("[data-canvas-scale]", { hasText: aChip }).waitFor({ timeout: 5000 });
        await page.locator("[data-canvas-scale]", { hasText: aChip }).waitFor({ timeout: 5000 });
        const chipAt = Date.now() - saved;
        const wall = await waitFor(async () => (await items()).find((i) => i.name === "Wall run" && Number(i.effective_quantity) > 0), "Wall run recomputed", 5000);
        // The panel's own figure: up to two decimals, "58.9", not "58.90".
        const figure = Number(wall.effective_quantity).toLocaleString("en-US", { maximumFractionDigits: 2 });
        await row(b.page, "Wall run").filter({ hasText: figure }).waitFor({ timeout: 5000 });
        const rowAt = Date.now() - saved;
        // 612 pt on the paper declared 100 ft; the run is 360 pt. Clicks land on pixels.
        expect(Math.abs(Number(wall.effective_quantity) - (360 * 100) / 612) < 0.5, `Wall run ${wall.effective_quantity}, expected ~${((360 * 100) / 612).toFixed(2)}`);
        expect(chipAt < 2000 && rowAt < 2500, `B's chip after ${chipAt} ms, row after ${rowAt} ms`);
        expect(!(await reloaded(b.page)), "B reloaded");
        return `B: "${before}" → "${aChip}" ${chipAt} ms after Save; Wall run reads ${figure} LF in B after ${rowAt} ms; no reload`;
      } finally {
        await b.context.close();
      }
    },
  },
  {
    title: "2: A draws a run slowly; B watches it grow tagged with A's short name, then sees it as a saved shape the moment A finishes",
    run: async ({ page, context }) => {
      const b = await twoWindows(context, page);
      try {
        const before = (await items()).length;
        const rowsBefore = await b.page.locator("[data-quantity-panel] li button").count();
        await tool(page, "Linear").click();
        await clickSheet(page, 0.2, 0.7);
        await sweepSheet(page, [0.2, 0.7], [0.35, 0.72], 900);
        await clickSheet(page, 0.35, 0.72);
        await sweepSheet(page, [0.35, 0.72], [0.5, 0.8], 900);
        const tag = b.page.locator("[data-draft-tag]", { hasText: A_NAME });
        await tag.waitFor({ timeout: 3000 });
        const midway = (await items()).length;
        expect(midway === before, `saved mid-shape: ${before} → ${midway} items`);
        const last = await sheetPoint(page, 0.5, 0.8);
        const posted = page.waitForResponse((r) => r.request().method() === "POST" && /\/takeoff\/item$/.test(new URL(r.url()).pathname), { timeout: 10000 })
          .then((r) => ({ at: Date.now(), status: r.status(), timing: r.request().timing() }));
        const finished = Date.now();
        await page.mouse.dblclick(last.x, last.y);
        // Measured side by side: the tag going and the saved row arriving are two events.
        const [tagAt, shownAt, save] = await Promise.all([
          waitFor(async () => (await tag.count()) === 0, "B's tag to go", 3000, 20).then(() => Date.now() - finished),
          waitFor(async () => (await b.page.locator("[data-quantity-panel] li button").count()) > rowsBefore, "B's panel to list the saved run", 3000, 20).then(() => Date.now() - finished),
          posted,
        ]);
        expect(save.status === 201, `A's save answered ${save.status}`);
        expect(tagAt < 1000 && shownAt < 1000, `after A finished: tag gone ${tagAt} ms, saved row ${shownAt} ms`);
        const after = (await items()).length;
        expect(after === before + 1, `items ${before} → ${after}`);
        expect(!(await reloaded(b.page)), "B reloaded");
        return `B saw "${A_NAME}" drawing; nothing saved mid-shape; A's save answered ${save.at - finished} ms after the double click; B's tag gone after ${tagAt} ms, the saved row in B's panel after ${shownAt} ms (${before} → ${after} items); no reload`;
      } finally {
        await b.context.close();
      }
    },
  },
  {
    title: "3: A loads pages 3 and 4 through Add sheets; B's sheets panel shows them (Q6)",
    run: async ({ page, context }) => {
      const b = await twoWindows(context, page);
      try {
        const rowsBefore = await b.page.locator("[data-sheet-row]").count();
        const dialog = page.getByRole("dialog");
        await page.getByRole("button", { name: "Add sheets" }).first().click();
        await dialog.locator('[data-load-folder="Plans"]').getByRole("button", { name: "Open Plans" }).click();
        await dialog.locator('[data-load-file="Set.pdf"]').getByRole("checkbox").check();
        await dialog.getByRole("button", { name: /^Choose pages/ }).click();
        const section = dialog.locator('[data-page-file="Set.pdf"]');
        await section.waitFor({ timeout: 20000 });
        // The picker settles its selection after the section appears: wait on the words.
        await dialog.locator("[data-load-pages]", { hasText: /^Load 2 pages$/ }).waitFor({ timeout: 10000 });
        const loaded = Date.now();
        await dialog.locator("[data-load-pages]").click();
        await page.getByText("Added 2 pages").waitFor({ timeout: 15000 });
        const added = (await sheetsOf(token, base, project.uuid)).filter((s) => s.page_number >= 3);
        expect(added.length === 2, `sheets for pages 3 and 4: ${added.length}`);
        for (const s of added) await b.page.locator(`[data-sheet-row="${s.uuid}"]`).waitFor({ timeout: 5000 });
        const shownAt = Date.now() - loaded;
        const rowsAfter = await b.page.locator("[data-sheet-row]").count();
        expect(rowsAfter === rowsBefore + 2, `B's panel ${rowsBefore} → ${rowsAfter} rows`);
        expect(!(await reloaded(b.page)), "B reloaded");
        return `A: "Load 2 pages" → "Added 2 pages"; B's panel ${rowsBefore} → ${rowsAfter} rows, ${shownAt} ms after A's click; no reload`;
      } finally {
        await b.context.close();
      }
    },
  },
]);

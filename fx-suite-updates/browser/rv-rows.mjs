// Row virtualisation (D-646, D-647): the Takeoff panel and Estimating draw only the rows in view, and
// what the plan lists under "What must keep working" still works.
//
//   node fx-run-locked.mjs rv-rows
//
// Asserts, counting data and not DOM (a virtual list draws a few dozen rows whatever the size):
//   - the panel lists all 400 items but draws fewer than 100, and draws the last one once scrolled to;
//   - a mark clicked on the canvas brings its row, far down and not drawn yet, into view, selected;
//   - Shift picks a range across rows not drawn;
//   - a row dragged to the list's top edge scrolls it until the first folder shows, and the drop files it there;
//   - Tab moves focus through the rows and keeps it in the panel; Ctrl+F in the panel focuses "Search items…";
//   - Estimating lists every line, draws fewer than 100, draws the last once scrolled to, draws every line for
//     print, and Ctrl+F focuses its Search box;
//   - a share link's guest sees the view-only tip on greyed row controls, on rows drawn after a scroll too, and
//     Ctrl+Z / Ctrl+Y send nothing.
//
// The world: a fresh workspace, one landscape page (1224 x 792 pt) at 1/6 ft per point, folders F1 to F4, and
// 400 Linear items RV-001 to RV-400, 100 a folder, each a 36 pt line in its own cell of a 20 x 20 grid.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { allowShareToken } from "./lib/protected.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { sheetPoint } from "./lib/takeoff.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6;
const N = 400;
const { token, workspace, base } = await freshWorkspace("RV rows");
const project = await makeProject(token, base, { name: "Virtual rows" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
const folders = {};

const name = (i) => `RV-${String(i).padStart(3, "0")}`;
/** Item i's line: its own cell of a 20 x 20 grid, 36 pt long. */
const lineOf = (i) => {
  const col = (i - 1) % 20;
  const rowAt = Math.floor((i - 1) / 20);
  const x = 0.05 + col * 0.045;
  const y = 0.06 + rowAt * 0.044;
  return [[x, y], [x + 36 / W, y]];
};
const panel = (page) => page.locator("[data-quantity-panel]");
const scroller = (page) => panel(page).locator("[data-panel-rows]");
const row = (page, n) => panel(page).locator("li[data-item-row] > [role=row]").filter({ has: page.getByText(n, { exact: true }) }).first();
const drawnRows = (page) => panel(page).locator("li[data-item-row]").count();
const items = async () => (await apiCall(token, "GET", `${takeoff}/item`)).body;
const blur = (page) => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));

async function open(page, query = "") {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}${query}`);
  if (query.includes("estimating")) {
    await page.locator("[data-estimate-row]").first().waitFor({ timeout: 30000 });
    return;
  }
  await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
  await row(page, name(1)).waitFor({ timeout: 30000 });
}
/** The panel scrolled to its foot until `n`'s row is drawn there (D-701): one scroll to the bottom does not stay at
 *  the bottom while the list is still growing (rows measured larger than estimated, folder headers or the project's
 *  list landing after the sheet's), which under load left RV-400 undrawn. Waits on the page, at most `timeout`. */
async function scrollToRow(page, n, timeout = 20000) {
  const target = row(page, n);
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    await scroller(page).evaluate((el) => (el.scrollTop = el.scrollHeight));
    if ((await target.count()) > 0 && (await inView(page, target))) return target;
    await page.waitForTimeout(100);
  }
  throw new Error(`${n} never drawn at the foot of the list`);
}
/** Whether a row sits wholly inside the panel's scroller. */
async function inView(page, locator) {
  const box = await locator.boundingBox();
  const frame = await scroller(page).boundingBox();
  return Boolean(box && frame && box.y >= frame.y - 1 && box.y + box.height <= frame.y + frame.height + 1);
}

await run("rv-rows", [
  {
    title: "setup: one page at 1/6 ft per point; folders F1 to F4; 400 Linear items, 100 a folder",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "RV.pdf", buffer: makePdf([{ width: W, height: H, label: "RV" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["RV.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      for (const f of ["F1", "F2", "F3", "F4"]) {
        const made = await apiCall(token, "POST", `${takeoff}/folder`, { name: f });
        expect(made.status === 201, `folder ${f}: ${made.status}`);
        folders[f] = made.body;
      }
      // Twelve at a time, in order within each batch's folder.
      for (let start = 1; start <= N; start += 12) {
        await Promise.all(
          Array.from({ length: Math.min(12, N - start + 1) }, (_, k) => start + k).map(async (i) => {
            const made = await apiCall(token, "POST", `${takeoff}/item`, {
              name: name(i),
              type: "lf",
              unit: "LF",
              sheet_uuid: sheet.uuid,
              folder_uuid: folders[`F${Math.ceil(i / 100)}`].uuid,
              geometry: { geom_type: "lf", vertices_json: lineOf(i), shape_meta: { closed: false }, client_uuid: crypto.randomUUID() },
            });
            expect(made.status === 201, `${name(i)}: ${made.status} ${JSON.stringify(made.body)}`);
          }),
        );
      }
      const all = await items();
      expect(all.length === N, `${all.length} items`);
      return `${all.length} items in F1 to F4 on ${sheet.sheet_number ?? "the page"}`;
    },
  },
  {
    title: "the panel lists all 400 but draws fewer than 100; scrolled to the end, it draws RV-400",
    run: async ({ page }) => {
      await open(page);
      const listed = Number(await scroller(page).getAttribute("data-panel-rows"));
      const drawn = await drawnRows(page);
      // Items, folders, and a slot per folder for the rows that are not items (Strip Areas).
      expect(listed >= N + 4, `the list holds ${listed} rows for ${N} items and 4 folders`);
      expect(drawn > 0 && drawn < 100, `${drawn} item rows drawn`);
      await scroller(page).evaluate((el) => (el.scrollTop = el.scrollHeight));
      await row(page, name(N)).waitFor({ timeout: 5000 });
      expect(await inView(page, row(page, name(N))), "RV-400 drawn but not in view at the end");
      return `${listed} rows listed, ${drawn} item rows drawn; RV-400 drawn at the end`;
    },
  },
  {
    title: "a mark clicked on the canvas brings its row, far down and not drawn, into view, selected",
    run: async ({ page }) => {
      await open(page);
      expect((await row(page, name(390)).count()) === 0, "RV-390 drawn before it was asked for");
      await blur(page);
      await page.keyboard.press("v");
      const [[x0, y], [x1]] = lineOf(390);
      const at = await sheetPoint(page, (x0 + x1) / 2, y);
      await page.mouse.click(at.x, at.y);
      await row(page, name(390)).waitFor({ timeout: 5000 });
      await waitFor(async () => ((await row(page, name(390)).getAttribute("data-selected")) === "1" ? true : null), "RV-390 selected in the panel", 5000);
      expect(await inView(page, row(page, name(390))), "RV-390 drawn but not scrolled into view");
      return "RV-390 selected on the canvas: its row drawn, in view and selected";
    },
  },
  {
    title: "Shift picks a range across rows not drawn: RV-001 to RV-400 picks 400",
    run: async ({ page }) => {
      await open(page);
      await row(page, name(1)).locator("[data-item-name]").click();
      await scroller(page).evaluate((el) => (el.scrollTop = el.scrollHeight));
      await row(page, name(N)).locator("[data-item-name]").click({ modifiers: ["Shift"] });
      const picked = Number(await panel(page).locator("[data-picked]").getAttribute("data-picked"));
      expect(picked === N, `${picked} picked`);
      return `${picked} picked`;
    },
  },
  {
    title: "a row held at the list's top edge scrolls it until F1 shows; the drop files RV-400 in F1",
    run: async ({ page }) => {
      await open(page);
      const from = await scrollToRow(page, name(N));
      const a = await from.boundingBox();
      const frame = await scroller(page).boundingBox();
      await page.mouse.move(a.x + 60, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(a.x + 60, a.y + a.height / 2 - 10, { steps: 4 });
      const header = panel(page).locator("li[data-folder-group='F1'] > [data-folder-header]");
      const t0 = Date.now();
      // Held in the edge band: each move is a drag-over, and each one scrolls the list.
      for (let i = 0; Date.now() - t0 < 30000; i += 1) {
        await page.mouse.move(a.x + 60 + (i % 2), frame.y + 6);
        if ((await header.count()) > 0 && (await scroller(page).evaluate((el) => el.scrollTop)) === 0) break;
        await page.waitForTimeout(40);
      }
      const reached = (await header.count()) > 0;
      const took = Date.now() - t0;
      expect(reached, "F1's header never came into view while held at the edge");
      const h = await header.boundingBox();
      await page.mouse.move(h.x + 40, h.y + h.height / 2, { steps: 6 });
      await page.mouse.up();
      await waitFor(async () => ((await items()).find((i) => i.name === name(N))?.folder_uuid === folders.F1.uuid ? true : null), "RV-400 filed in F1", 10000);
      return `scrolled to F1 in ${took} ms while held at the edge; RV-400 now in F1`;
    },
  },
  {
    title: "Tab moves focus through the rows and keeps it in the panel; Ctrl+F in the panel focuses Search items",
    run: async ({ page }) => {
      await open(page);
      await row(page, name(2)).locator("button[data-resume-row]").focus();
      const before = await scroller(page).evaluate((el) => el.scrollTop);
      for (let i = 0; i < 120; i += 1) await page.keyboard.press("Tab");
      const where = await page.evaluate(() => ({
        inPanel: Boolean(document.activeElement?.closest("[data-quantity-panel]")),
        row: document.activeElement?.closest("li[data-item-row]")?.querySelector("[data-item-name]")?.textContent?.trim() ?? null,
      }));
      const moved = (await scroller(page).evaluate((el) => el.scrollTop)) - before;
      expect(where.inPanel && where.row, `focus left the rows: ${JSON.stringify(where)}`);
      expect(moved > 0, "the list did not follow the focus");
      await scroller(page).evaluate((el) => (el.scrollTop = 0));
      await row(page, name(3)).locator("[data-item-name]").click();
      await page.keyboard.press("Control+f");
      const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
      expect(focused === "Search items", `Ctrl+F focused ${focused}`);
      return `120 Tabs: focus on ${where.row}'s row, the list scrolled ${Math.round(moved)} px; Ctrl+F → Search items`;
    },
  },
  {
    title: "Estimating lists every line and draws fewer than 100; scrolled to the end it draws RV-400; print draws every line; Ctrl+F focuses Search",
    run: async ({ page }) => {
      await open(page, "?tab=estimating");
      const body = page.locator("tbody[data-body-rows]");
      const listed = Number(await body.getAttribute("data-body-rows"));
      const drawn = await page.locator("[data-estimate-row]").count();
      expect(listed >= N, `the body holds ${listed} rows`);
      expect(drawn > 0 && drawn < 100, `${drawn} lines drawn`);
      // Whatever scrolls the table: its own frame with the header frozen, else the tab.
      await page.evaluate(() => {
        let el = document.querySelector("[data-estimating] table")?.parentElement ?? null;
        while (el && !(el.scrollHeight > el.clientHeight + 10 && getComputedStyle(el).overflowY !== "visible")) el = el.parentElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
      await page.locator(`[data-estimate-row="${name(N)}"]`).waitFor({ timeout: 5000 });
      await page.emulateMedia({ media: "print" });
      await waitFor(async () => ((await page.locator("[data-estimate-row]").count()) >= N ? true : null), "every line drawn for print", 10000);
      const printed = await page.locator("[data-estimate-row]").count();
      await page.emulateMedia({ media: "screen" });
      await waitFor(async () => ((await page.locator("[data-estimate-row]").count()) < 100 ? true : null), "back to the rows in view", 10000);
      await blur(page);
      await page.keyboard.press("Control+f");
      const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
      expect(focused === "Search", `Ctrl+F focused ${focused}`);
      await page.keyboard.type(name(7));
      await waitFor(async () => ((await page.locator("[data-estimate-row]").count()) === 1 ? true : null), "one line for RV-007", 10000);
      return `${listed} body rows, ${drawn} drawn; RV-400 drawn at the end; ${printed} drawn for print; Ctrl+F → Search, RV-007 found`;
    },
  },
  {
    title: "a guest sees the view-only tip on greyed row controls, also on rows drawn after a scroll; Ctrl+Z and Ctrl+Y send nothing",
    run: async ({ context }) => {
      const link = await apiCall(token, "POST", `${base}/${project.uuid}/share-link`);
      expect(link.status === 200 || link.status === 201, `share link: ${link.status}`);
      // The bench browser refuses every share link but the run's own (D-542).
      allowShareToken(link.body.token);
      const guest = await context.browser().newContext();
      try {
        const page = await guest.newPage();
        const writes = [];
        page.on("request", (r) => {
          if (!["GET", "HEAD", "OPTIONS"].includes(r.method()) && /\/api\//.test(r.url()) && !/\/(session|pass|presence|visit|renderer-report)(\?|$)/.test(r.url())) writes.push(`${r.method()} ${r.url()}`);
        });
        await page.goto(`${APP}/s/${link.body.token}`);
        await page.waitForURL(new RegExp(`/project/${project.uuid}/takeoff`), { timeout: 30000 });
        await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
        await panel(page).locator("li[data-item-row]").first().waitFor({ timeout: 30000 });
        const tips = () =>
          page.evaluate(() => {
            const greyed = [...document.querySelectorAll("[data-quantity-panel] li[data-item-row] button:disabled")];
            return { greyed: greyed.length, tipped: greyed.filter((b) => b.getAttribute("aria-description")).length, names: [...document.querySelectorAll("[data-quantity-panel] li[data-item-row] [data-item-name]")].map((e) => e.textContent.trim()) };
          });
        const top = await tips();
        // RV-399: the last row of F4 (step 5 filed RV-400 in F1).
        await scrollToRow(page, name(N - 1));
        await page.waitForTimeout(300);
        const end = await tips();
        const fresh = end.names.filter((n) => !top.names.includes(n));
        expect(top.greyed > 0 && top.tipped === top.greyed, `at the top ${top.tipped} of ${top.greyed} greyed controls carry the tip`);
        expect(fresh.length > 0 && end.tipped === end.greyed, `after the scroll ${end.tipped} of ${end.greyed} carry it (${fresh.length} rows newly drawn)`);
        await row(page, name(N - 1)).locator("[data-item-name]").click();
        await page.keyboard.press("Control+z");
        await page.keyboard.press("Control+y");
        await page.waitForTimeout(1500);
        expect(writes.length === 0, `the guest sent ${writes.join(", ")}`);
        // Estimating as the guest: pricing off by default, the same virtual body.
        await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating`);
        await page.locator("[data-estimate-row]").first().waitFor({ timeout: 30000 });
        await page.locator("[data-pricing-hidden]").waitFor({ timeout: 10000 });
        const listed = Number(await page.locator("tbody[data-body-rows]").getAttribute("data-body-rows"));
        const drawn = await page.locator("[data-estimate-row]").count();
        expect(listed >= N && drawn < 100, `guest Estimating: ${listed} body rows, ${drawn} drawn`);
        await page.evaluate(() => {
          let el = document.querySelector("[data-estimating] table")?.parentElement ?? null;
          while (el && !(el.scrollHeight > el.clientHeight + 10 && getComputedStyle(el).overflowY !== "visible")) el = el.parentElement;
          if (el) el.scrollTop = el.scrollHeight;
        });
        await page.locator(`[data-estimate-row="${name(N - 1)}"]`).waitFor({ timeout: 5000 });
        await page.keyboard.press("Control+z");
        await page.waitForTimeout(1000);
        expect(writes.length === 0, `the guest sent ${writes.join(", ")}`);
        return `${top.tipped}/${top.greyed} tipped at the top; ${end.tipped}/${end.greyed} after the scroll (${fresh.length} rows newly drawn); Ctrl+Z, Ctrl+Y: no writes; Estimating: ${listed} body rows, ${drawn} drawn, pricing hidden, RV-399 drawn at the end`;
      } finally {
        await guest.close();
      }
    },
  },
]);

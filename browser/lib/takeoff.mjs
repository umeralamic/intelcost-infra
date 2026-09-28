// F8 Block C: the takeoff page, driven with two windows (D-32).
//
// Every fixture measures on Riverside Medical Center's calibrated first sheet, the
// seeded project with ready sheets, and removes the items it made before it ends, so
// the sheet a person opens for the two-window checks is not buried in fixture debris.

import { APP } from "./bench.mjs";
import { call, joinedTopic } from "./realtime.mjs";

export const PROJECT_NAME = "Riverside Medical Center";

/** The project and its first calibrated sheet, found through the api. */
export async function riverside(token, workspaceUuid) {
  let project;
  for (let offset = 0; !project; offset += 200) {
    const page = await call(token, "GET", `/api/workspace/${workspaceUuid}/project?limit=200&offset=${offset}`);
    if (page.status !== 200) throw new Error(`projects: ${page.status}`);
    project = page.body.items.find((p) => p.name === PROJECT_NAME);
    if (!project && offset + 200 >= page.body.total) throw new Error(`no ${PROJECT_NAME}`);
  }
  const sheets = await call(token, "GET", `/api/workspace/${workspaceUuid}/project/${project.uuid}/drawing/sheet`);
  const sheet = sheets.body.sort((a, b) => a.page_number - b.page_number)[0];
  const takeoff = `/api/workspace/${workspaceUuid}/project/${project.uuid}/takeoff`;
  return { project: project.uuid, sheet: sheet.uuid, takeoff, url: (app = APP) => `${app}/project/${project.uuid}/takeoff/${sheet.uuid}` };
}

/** A count item with one mark, named so a fixture can find its row. */
export async function countItem(token, r, name, at = [0.3, 0.3]) {
  const made = await call(token, "POST", `${r.takeoff}/item`, {
    name,
    type: "count",
    unit: "EA",
    sheet_uuid: r.sheet,
    geometry: { geom_type: "count", vertices_json: [at], shape_meta: null, client_uuid: crypto.randomUUID() },
  });
  if (made.status !== 201) throw new Error(`item: ${made.status} ${JSON.stringify(made.body)}`);
  return made.body;
}

export async function itemDetail(token, r, uuid) {
  return call(token, "GET", `${r.takeoff}/item/${uuid}`);
}

export async function removeItem(token, r, uuid) {
  await call(token, "PATCH", `${r.takeoff}/item/${uuid}`, { is_locked: false });
  return call(token, "DELETE", `${r.takeoff}/item/${uuid}`);
}

/** Open the sheet and wait for the drawing and the panel. */
export async function openSheet(page, r, app = APP) {
  await page.goto(r.url(app));
  await page.locator('img[alt="Drawing sheet"]').waitFor({ timeout: 20000 });
  // The quantity panel, by name: since F5 Block D the sheets panel is an aside too.
  await page.locator("[data-quantity-panel]").waitFor();
}

/** The item's row in the takeoff panel. */
export function row(page, name) {
  return page.locator("[data-quantity-panel] li button", { hasText: name }).first();
}

/** Right-click the row and return the open menu's item by label. */
export async function menuItem(page, name, label) {
  await row(page, name).click({ button: "right" });
  const item = page.getByRole("menuitem", { name: new RegExp(`^${label}`) });
  await item.waitFor();
  return item;
}

/**
 * The window point for normalised sheet coordinates, checked to be on screen.
 *
 * A sheet can run past the bottom of the window (Riverside was a portrait page once, and a
 * click at 85% of its height landed below the fold, on nothing). The point is scrolled into
 * the window if it can be, and otherwise this throws naming it, rather than letting a click
 * silently miss.
 */
export async function sheetPoint(page, x, y) {
  const svg = page.locator('svg[role="presentation"]');
  await svg.waitFor();
  const at = async () => {
    const box = await svg.boundingBox();
    return { x: box.x + box.width * x, y: box.y + box.height * y };
  };
  const view = page.viewportSize();
  const inView = (p) => p.x >= 0 && p.y >= 0 && p.x < view.width && p.y < view.height;
  let point = await at();
  if (!inView(point)) {
    await svg.evaluate((el, [fx, fy]) => {
      const box = el.getBoundingClientRect();
      const px = box.left + box.width * fx;
      const py = box.top + box.height * fy;
      for (let node = el.parentElement; node; node = node.parentElement) {
        if (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth) {
          node.scrollBy(px - window.innerWidth / 2, py - window.innerHeight / 2);
        }
      }
    }, [x, y]);
    point = await at();
  }
  if (!inView(point)) {
    throw new Error(`sheet point (${x}, ${y}) is at ${Math.round(point.x)},${Math.round(point.y)}, outside the ${view.width}x${view.height} window`);
  }
  return point;
}

/** Click on the sheet at normalised coordinates. */
export async function clickSheet(page, x, y) {
  const point = await sheetPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

/** Move the pen across the sheet in small steps, the way a hand does, over `ms`. The
 *  16 ms pause is the gesture's own pace (a frame), not a wait for anything. */
export async function sweepSheet(page, from, to, ms) {
  const [a, b] = [await sheetPoint(page, ...from), await sheetPoint(page, ...to)];
  const steps = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await page.mouse.move(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    await page.waitForTimeout(16);
  }
}

/** The run's project topic, as the app names it (`core/realtime/topics.ts`). */
export const projectTopicOf = (r) => `ws:${r.workspace ?? r.takeoff.split("/")[3]}:project:${r.project}`;

/** Wait until this page's socket has joined the sheet's project topic: from then on it
 *  hears a colleague's drafts and changes. What "wait a second first" stood in for. */
export async function onProjectTopic(page, r) {
  await joinedTopic(page, projectTopicOf(r));
}

/** Set the workspace's collaboration mode through the api, as the owner. */
export async function setMode(token, workspaceUuid, mode) {
  const done = await call(token, "PATCH", `/api/workspace/${workspaceUuid}`, { collaboration_mode: mode });
  if (done.status !== 200) throw new Error(`mode ${mode}: ${done.status} ${JSON.stringify(done.body)}`);
}

/**
 * Pick Linear, Area or Count and answer its "Name this … measurement" dialog (F6-S1:
 * legacy asks before anything is drawn). Create arms the tool; the first shape drawn
 * creates the item, and later shapes join it until the tool changes. `name` types a
 * name; otherwise the default ("LF 3") stands. Returns once the tool is armed.
 */
export async function armMeasure(page, label, { name } = {}) {
  const tools = page.getByRole("group", { name: "Takeoff tools" });
  await tools.getByRole("button", { name: label, exact: true }).click();
  await confirmMeasure(page, { name });
  await page.waitForFunction(
    (want) => document.querySelector('[role="group"][aria-label="Takeoff tools"] button[aria-pressed="true"]')?.textContent?.includes(want),
    label,
    { timeout: 5000 },
  );
}

/** Answer an open New Measurement dialog with Create (after a scale was set, say). */
export async function confirmMeasure(page, { name } = {}) {
  const form = page.locator('[data-measurement-dialog="create"]');
  await form.waitFor({ timeout: 10000 });
  if (name) await form.getByLabel("Name", { exact: true }).fill(name);
  await form.getByRole("button", { name: "Create" }).click();
  await form.waitFor({ state: "detached", timeout: 10000 });
}

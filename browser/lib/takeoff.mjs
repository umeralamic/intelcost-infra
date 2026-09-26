// F8 Block C: the takeoff page, driven with two windows (D-32).
//
// Every fixture measures on Riverside Medical Center's calibrated first sheet, the
// seeded project with ready sheets, and removes the items it made before it ends, so
// the sheet a person opens for the two-window checks is not buried in fixture debris.

import { APP } from "./bench.mjs";
import { call } from "./realtime.mjs";

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
  await page.locator("aside").waitFor();
}

/** The item's row in the takeoff panel. */
export function row(page, name) {
  return page.locator("aside li button", { hasText: name }).first();
}

/** Right-click the row and return the open menu's item by label. */
export async function menuItem(page, name, label) {
  await row(page, name).click({ button: "right" });
  const item = page.getByRole("menuitem", { name: new RegExp(`^${label}`) });
  await item.waitFor();
  return item;
}

/** Click on the sheet at normalised coordinates. */
export async function clickSheet(page, x, y) {
  const box = await page.locator('svg[role="presentation"]').boundingBox();
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
}

/** Set the workspace's collaboration mode through the api, as the owner. */
export async function setMode(token, workspaceUuid, mode) {
  const done = await call(token, "PATCH", `/api/workspace/${workspaceUuid}`, { collaboration_mode: mode });
  if (done.status !== 200) throw new Error(`mode ${mode}: ${done.status} ${JSON.stringify(done.body)}`);
}

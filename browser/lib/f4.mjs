// Helpers the F4 dashboard fixtures share. Each builds state through the api, the way
// a person's clicks would end up, so a fixture spends its browser time on the screen
// under test rather than on setting the scene.

import { APP, SEEDED, apiCall, apiLogin, createWorkspace, expect, signInAs } from "./bench.mjs";

/** A throwaway workspace owned by the seeded user, so state never leaks between runs. */
export async function freshWorkspace(tag) {
  const token = await apiLogin();
  const workspace = await createWorkspace(token, `${tag} ${Date.now()}`);
  return { token, workspace, base: `/api/workspace/${workspace.uuid}/project` };
}

/** Make a project, optionally put it on a status by key. Returns the api's read. */
export async function makeProject(token, base, body, statusKey) {
  const made = await apiCall(token, "POST", base, { seed_folders: false, ...body });
  expect(made.status === 201, `create ${body.name}: ${made.status} ${JSON.stringify(made.body)}`);
  if (!statusKey) return made.body;
  const moved = await apiCall(token, "PATCH", `${base}/${made.body.uuid}`, { status_key: statusKey });
  expect(moved.status === 200, `status ${statusKey}: ${moved.status} ${JSON.stringify(moved.body)}`);
  return moved.body;
}

/** Signed in, on this workspace's dashboard, the list drawn. */
export async function openDashboard(page, workspaceUuid, email = SEEDED.email, path = "/") {
  await signInAs(page, email, SEEDED.password);
  await page.selectOption("header select", workspaceUuid).catch(() => {});
  await page.goto(`${APP}${path}`);
  await page.getByRole("heading", { name: "Projects", exact: true }).waitFor({ timeout: 20000 });
  await page.getByRole("tablist", { name: "Project status" }).waitFor({ timeout: 20000 });
}

/** The tab strip as drawn: [{label, count}]. */
export async function tabStrip(page) {
  return page.getByRole("tab").evaluateAll((tabs) =>
    tabs.map((tab) => {
      const count = tab.querySelector("span")?.textContent ?? "";
      return { label: (tab.textContent ?? "").replace(count, "").trim(), count: Number(count) };
    }),
  );
}

/**
 * Wait until the dashboard stops changing: the rows, the tab counts and the badges read
 * the same across several polls.
 *
 * Not `waitForLoadState("networkidle")`: that is a page-load state, reached once and
 * then answered instantly for every later call, so after the first load it waits for
 * nothing at all.
 */
export async function settle(page) {
  await page.waitForFunction(
    () => {
      const snapshot = [
        ...document.querySelectorAll("li[data-project], [role=tab], [data-status-picker]"),
      ]
        .map((el) => el.textContent)
        .join("|");
      const busy = document.querySelector("[aria-busy=true], .animate-pulse") !== null;
      const state = (window.__settle ??= { last: null, same: 0 });
      state.same = snapshot === state.last && !busy ? state.same + 1 : 0;
      state.last = snapshot;
      return state.same >= 4;
    },
    null,
    { polling: 150, timeout: 20000 },
  );
  await page.evaluate(() => {
    window.__settle = undefined;
  });
}

/** The project names listed, in order, once the list has settled after a change. */
export async function rowNames(page) {
  await page
    .locator("[data-project-list]")
    .or(page.getByText("No projects match the current filters."))
    .or(page.getByText("Click New project to start your first estimate."))
    .first()
    .waitFor({ timeout: 15000 });
  await settle(page);
  return page
    .locator("li[data-project]")
    .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-project")));
}

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

/**
 * Put a file into a project through the multipart path (D-27): the api from Node, the
 * part PUTs from inside `page`, because the page and not Node can reach the storage host.
 * `parts` limits how many parts are sent, to leave an upload unfinished on purpose.
 */
export async function seedFile(page, token, base, projectUuid, folderUuid, name, buffer, { parts } = {}) {
  const files = `${base}/${projectUuid}/file`;
  const started = await apiCall(token, "POST", files, {
    file_name: name,
    content_type: name.endsWith(".jpg") ? "image/jpeg" : "application/octet-stream",
    byte_size: buffer.length,
    folder_uuid: folderUuid,
  });
  expect(started.status === 201, `start ${name}: ${started.status} ${JSON.stringify(started.body)}`);
  const file = started.body;
  const count = Math.min(parts ?? file.part_count, file.part_count);
  const numbers = Array.from({ length: count }, (_, i) => i + 1);
  const signed = await apiCall(token, "POST", `${files}/${file.uuid}/part`, { part_numbers: numbers });
  for (const n of numbers) {
    const slice = buffer.subarray((n - 1) * file.part_size, n * file.part_size);
    const status = await page.evaluate(
      async ([url, b64]) => {
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        return (await fetch(url, { method: "PUT", body: bin })).status;
      },
      [signed.body.urls[String(n)], slice.toString("base64")],
    );
    expect(status === 200, `PUT part ${n} of ${name}: ${status}`);
  }
  if (count < file.part_count) return file;
  const done = await apiCall(token, "POST", `${files}/${file.uuid}/complete`);
  expect(done.status === 200, `complete ${name}: ${done.status} ${JSON.stringify(done.body)}`);
  return done.body;
}

/** A project's folders by path ("Plans/Addenda"), from the api. */
export async function folderPaths(token, base, projectUuid) {
  const folders = (await apiCall(token, "GET", `${base}/${projectUuid}/folder`)).body;
  const byUuid = new Map(folders.map((f) => [f.uuid, f]));
  const pathOf = (f) => {
    const parts = [];
    for (let at = f; at; at = byUuid.get(at.parent_uuid)) parts.unshift(at.name);
    return parts.join("/");
  };
  return new Map(folders.map((f) => [pathOf(f), f]));
}

/** Signed in, on a project's Home, the file browser drawn. */
export async function openFiles(page, workspaceUuid, projectUuid, email = SEEDED.email) {
  await signInAs(page, email, SEEDED.password);
  await page.selectOption("header select", workspaceUuid).catch(() => {});
  await page.goto(`${APP}/project/${projectUuid}`);
  await page.locator("[data-file-browser] [data-tree-root]").waitFor({ timeout: 20000 });
  await page.locator("[data-file-browser]").getByText("Loading…").first().waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
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

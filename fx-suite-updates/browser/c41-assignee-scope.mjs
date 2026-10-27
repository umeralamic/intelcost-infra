// C41, a scope per assignee (D-790), built after the archive (2026-10-26). A (this run's owner) assigns B
// (Sara W.) a scope on Riverside; B sees and filters by it.
//
//   ./fx-suite.sh run c41-assignee-scope
//
// The world: a second-level node under a division (the Scope value is its name), a custom folder "Level 2",
// and three count items: one filed under the node, one in the folder, one in neither.
//
// Asserted:
// - the api: the assignee save takes scopes (a node, a Scope value, a folder, a note) and reads them back
//   labelled; a plain list of people keeps everyone's scope; a node of another workspace and a folder of
//   another project are refused (422); B is told when the scope is given, changed and removed;
// - the screen: Edit Project › Assigned To's Scope button and dialog (Classification, Scope, Custom Folder,
//   Note); "Your scope" on B's dashboard row; "Assigned to me" in the Quantities panel (Folders and
//   Classification views) and in Estimating shows the two items in scope and not the third.
//
// Written, not run (the founder, 2026-10-26: fixtures added to the archived suite, run with the next full
// restore-from-tag run, hard rule 8).

import { APP, MAILHOG, apiCall, expect, run, serviceUrl, signInAs } from "./lib/bench.mjs";
import { APP_B, WINDOW_B, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";
import { openSheet } from "./lib/takeoff.mjs";
import { riversideWorld } from "./lib/world.mjs";

const world = await riversideWorld();
const r = world.r;
const A = world.token;
const B = world.sara.token;
const t = r.takeoff;
const projectPath = `/api/workspace/${r.workspace}/project/${r.project}`;
const me = async (token) => (await apiCall(token, "GET", "/api/auth/me")).body;
const aUuid = (await me(A)).uuid;
const bUuid = (await me(B)).uuid;

const nodes = (await apiCall(A, "GET", `/api/workspace/${r.workspace}/classification?system=csi`)).body;
const roots = nodes.filter((n) => !n.parent_uuid);
const second = nodes.find((n) => n.parent_uuid && roots.some((root) => root.uuid === n.parent_uuid));
const division = roots.find((root) => root.uuid === second.parent_uuid);
const folder = (await apiCall(A, "POST", `${t}/folder`, { name: "Level 2", tree: "custom" })).body;
const count = (name, at, extra) =>
  apiCall(A, "POST", `${t}/item`, { name, type: "count", unit: "EA", sheet_uuid: r.sheet, ...extra, geometry: { geom_type: "count", vertices_json: [[at, 0.8]], shape_meta: null, client_uuid: crypto.randomUUID() } }).then((res) => {
    expect(res.status === 201, `${name}: ${res.status}`);
    return res.body;
  });
await count("C41 in node", 0.2, { classification_ref_id: second.uuid });
await count("C41 in folder", 0.3, { folder_uuid: folder.uuid });
await count("C41 elsewhere", 0.4, {});

/** Mail captured for an address by the bench's guard, by template (D-792). */
const mailTo = async (address, template) => {
  // From the browser container MailHog is reached by its service name, not the published port.
  const url = `${MAILHOG}/api/v2/search?kind=to&query=${encodeURIComponent(address)}&limit=50`;
  const found = await (await fetch(serviceUrl(url) ?? url)).json();
  return (found.items ?? []).filter((m) => (m.Content.Headers["X-IntelCost-Template"] ?? []).includes(template)).map((m) => m.Content.Headers.Subject?.[0] ?? "");
};
const assign = (scopes) => apiCall(A, "PUT", `${projectPath}/assignee`, { user_uuids: [aUuid, bUuid], ...(scopes ? { scopes } : {}) });
const latestScopeNotice = async () => (await apiCall(B, "GET", "/api/notifications")).body.rows.find((n) => n.kind === "project.scope");

await run("c41-assignee-scope", [
  {
    title: "D-790 at the api: scopes saved and read back labelled; a plain list keeps them; foreign refs refused; B told of each change",
    run: async () => {
      const given = await assign([{ user_uuid: bUuid, note: "C41 note", parts: [{ kind: "classification", classification_uuid: division.uuid }, { kind: "scope", scope_name: second.name }, { kind: "folder", folder_uuid: folder.uuid }] }]);
      expect(given.status === 200, `save: ${given.status} ${JSON.stringify(given.body)}`);
      const read = given.body.assignee_scopes.find((s) => s.user_uuid === bUuid);
      expect(read.parts.length === 3 && read.parts.every((p) => p.label) && read.note === "C41 note", `read: ${JSON.stringify(read)}`);
      const told = await latestScopeNotice();
      expect(told?.line.includes("assigned you a scope"), `given: ${told?.line}`);

      const kept = await assign(null);
      expect(kept.body.assignee_scopes.find((s) => s.user_uuid === bUuid)?.parts.length === 3, "a plain list dropped the scope");

      const foreignNode = await assign([{ user_uuid: bUuid, note: null, parts: [{ kind: "classification", classification_uuid: crypto.randomUUID() }] }]);
      expect(foreignNode.status === 422, `foreign node: ${foreignNode.status}`);
      const foreignFolder = await assign([{ user_uuid: bUuid, note: null, parts: [{ kind: "folder", folder_uuid: crypto.randomUUID() }] }]);
      expect(foreignFolder.status === 422, `foreign folder: ${foreignFolder.status}`);

      await assign([{ user_uuid: bUuid, note: "C41 note", parts: [{ kind: "folder", folder_uuid: folder.uuid }] }]);
      expect((await latestScopeNotice())?.line.includes("changed your scope"), "changed: not told");
      await assign([]);
      expect((await latestScopeNotice())?.line.includes("removed your scope"), "removed: not told");
      return `labels ${read.parts.map((p) => p.label).join(" | ")}; refused 422 twice; told given, changed, removed`;
    },
  },
  {
    title: "D-790 on screen: Edit Project's Scope dialog; Your scope on B's dashboard; Assigned to me in both panel views and Estimating",
    run: async ({ page, context, shot }) => {
      const b = await secondWindow(context);
      try {
        await signInAs(page, world.owner.email, world.owner.password, `/settings/account?edit=${r.project}`);
        // Step 1 ends with every scope removed: B's row offers "+ Assign scope" (Edit once a scope is set).
        const edit = page.locator(`[data-assignee-scope-assign="${WINDOW_B.email}"], [data-assignee-scope-edit="${WINDOW_B.email}"]`).first();
        await edit.waitFor({ timeout: 20000 });
        await edit.click();
        const dialog = page.locator("[data-scope-dialog]");
        await dialog.locator('input[type="search"]').fill(division.name);
        await dialog.locator(`[data-scope-option="${division.code} ${division.name}"]`).first().check();
        await dialog.locator('input[type="search"]').fill("");
        await dialog.locator('[data-scope-tab="folder"]').click();
        await dialog.locator('[data-scope-option="Level 2"]').check();
        await dialog.locator("[data-scope-note]").fill("C41 screen note");
        await page.locator("[data-scope-save]").click();
        await page.getByRole("button", { name: /^Save( changes)?$/ }).last().click();
        await waitFor(async () => ((await apiCall(A, "GET", projectPath)).body.assignee_scopes ?? []).length === 1, "the scope saved", 8000);

        // In Riverside's workspace, not B's own: the scope is on Riverside's project.
        await b.page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), r.workspace);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password, "/settings/account?projects=open");
        const mine = b.page.locator("[data-my-scope]").first();
        await mine.waitFor({ timeout: 15000 });
        const said = await mine.innerText();
        expect(said.startsWith("Your scope:") && said.includes("Level 2"), `dashboard: ${said}`);

        await openSheet(b.page, r, APP_B);
        const names = async () => (await b.page.locator("[data-quantity-panel] li[data-item-row] [data-item-name]").allInnerTexts()).map((x) => x.trim()).filter((x) => x.startsWith("C41"));
        await b.page.locator("[data-quantity-panel] [data-assigned-to-me]").click();
        const folders = await waitFor(async () => {
          const now = await names();
          return now.length === 2 && !now.includes("C41 elsewhere") ? now : null;
        }, "Folders view filtered", 8000);
        await b.page.getByRole("tab", { name: "Classification" }).click();
        const classified = await waitFor(async () => {
          const now = await names();
          return now.length === 2 && !now.includes("C41 elsewhere") ? now : null;
        }, "Classification view filtered", 8000);
        await b.page.screenshot({ path: shot.replace(".png", "-panel.png") });
        await b.page.getByRole("tab", { name: "Folders" }).click();

        await b.page.goto(`${APP_B}/project/${r.project}/takeoff/${r.sheet}?tab=estimating`);
        const toggle = b.page.locator("[data-assigned-to-me]").last();
        await toggle.waitFor({ timeout: 20000 });
        await toggle.click();
        const lines = await waitFor(async () => {
          const now = [...new Set((await b.page.getByText(/^C41 /).allInnerTexts()).map((x) => x.trim()))];
          return now.length === 2 && !now.includes("C41 elsewhere") ? now : null;
        }, "Estimating filtered", 8000);
        await assign([]);
        return `dashboard "${said}"; Folders ${folders.join(", ")}; Classification ${classified.join(", ")}; Estimating ${lines.join(", ")}`;
      } finally {
        await assign([]).catch(() => {});
        await b.context.close();
      }
    },
  },
  {
    title: "D-792: a scope given, changed and removed is mailed to the assignee (captured in MailHog on the bench)",
    run: async () => {
      await assign([{ user_uuid: bUuid, note: "C41 mail", parts: [{ kind: "folder", folder_uuid: folder.uuid }] }]);
      await assign([{ user_uuid: bUuid, note: "C41 mail changed", parts: [] }]);
      await assign([]);
      const subjects = await waitFor(async () => {
        const got = await mailTo(WINDOW_B.email, "takeoff_notice");
        return ["assigned you a scope", "changed your scope", "removed your scope"].every((w) => got.some((s) => s.includes(w))) ? got : null;
      }, "the three scope mails", 15000);
      return `mailed: ${subjects.filter((s) => s.includes("scope")).slice(0, 3).join(" | ")}`;
    },
  },
  {
    title: "D-793 at the api: a layer pick saved and read back last; a layer of another project refused (422)",
    run: async () => {
      const layer = (await apiCall(A, "POST", `${t}/layer`, { name: "C41 Building 1" })).body;
      const saved = await assign([{ user_uuid: bUuid, note: null, parts: [{ kind: "layer", layer_uuid: layer.uuid }, { kind: "classification", classification_uuid: division.uuid }] }]);
      const parts = saved.body.assignee_scopes.find((x) => x.user_uuid === bUuid).parts;
      expect(parts.at(-1).kind === "layer" && parts.at(-1).label === "C41 Building 1", `layers last: ${JSON.stringify(parts)}`);
      const foreign = await assign([{ user_uuid: bUuid, note: null, parts: [{ kind: "layer", layer_uuid: crypto.randomUUID() }] }]);
      expect(foreign.status === 422, `foreign layer: ${foreign.status}`);
      const told = await latestScopeNotice();
      expect(told?.title.includes("C41 Building 1"), `the notice names the layer: ${told?.title}`);
      await assign([]);
      return `parts ${parts.map((p) => p.label).join(", ")}; foreign 422; notice "${told.title}"`;
    },
  },
  {
    title: "D-793/D-794 on screen: a row per person with + Assign scope lit when added; the dialog makes a folder and a layer and ticks them; Classification + Layer shows only items matching both",
    run: async ({ page, context, shot }) => {
      await apiCall(A, "PUT", `${projectPath}/assignee`, { user_uuids: [aUuid], scopes: [] });
      await signInAs(page, world.owner.email, world.owner.password, `/settings/account?edit=${r.project}`);
      await page.locator(`[data-assignee-row="${world.owner.email}"]`).waitFor({ timeout: 20000 });
      await page.locator("#edit-project-assignees").click();
      await page.locator(`[data-assignee-option="${WINDOW_B.email}"] input`).check();
      await page.locator("#edit-project-assignees").click();
      const assignB = page.locator(`[data-assignee-scope-assign="${WINDOW_B.email}"]`);
      expect(/ring-2/.test((await assignB.getAttribute("class")) ?? ""), "the new row's + Assign scope is not lit");
      expect((await page.locator("[data-scope-dialog]").count()) === 0, "the dialog opened by itself");
      await assignB.click();
      const dialog = page.locator("[data-scope-dialog]");
      await dialog.locator('[data-scope-tab="folder"]').click();
      await dialog.locator('[data-scope-new="folder"]').click();
      await dialog.locator("[data-scope-make-name]").fill("C41 Level 3");
      await dialog.locator("[data-scope-make-create]").click();
      await dialog.locator('[data-scope-option="C41 Level 3"]:checked').waitFor();
      await dialog.locator('[data-scope-option="C41 Level 3"]').uncheck();
      await dialog.locator('[data-scope-tab="layer"]').click();
      await dialog.locator('input[type="search"]').fill("C41 Tower");
      await dialog.locator("[data-scope-create-from-search]").click();
      await dialog.locator("[data-scope-make-create]").click();
      await dialog.locator('[data-scope-option="C41 Tower"]:checked').waitFor();
      await dialog.locator('[data-scope-tab="classification"]').click();
      await dialog.locator('input[type="search"]').fill(division.name);
      await dialog.locator(`[data-scope-option="${division.code} ${division.name}"]`).first().check();
      const rule = await dialog.locator("[data-scope-rule]").innerText();
      expect(rule.includes("C41 Tower"), `rule line: ${rule}`);
      await page.locator("[data-scope-save]").click();
      const rowText = await page.locator(`[data-assignee-row="${WINDOW_B.email}"]`).innerText();
      expect(rowText.includes("Scope:") && rowText.includes("Edit"), `row: ${rowText}`);
      await page.getByRole("button", { name: /^Save( changes)?$/ }).last().click();
      await waitFor(async () => ((await apiCall(A, "GET", projectPath)).body.assignee_scopes ?? []).some((x) => x.user_uuid === bUuid), "saved", 8000);
      const tower = (await apiCall(A, "GET", `${t}/layer`)).body.find((l) => l.name === "C41 Tower");
      await count("C41 both", 0.5, { classification_ref_id: second.uuid, layer_uuid: tower.uuid });
      await count("C41 layer only", 0.55, { layer_uuid: tower.uuid });
      const b = await secondWindow(context);
      try {
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await openSheet(b.page, r, APP_B);
        const panel = b.page.locator("[data-quantity-panel]");
        await panel.getByRole("button", { name: /Base Bid/ }).click();
        await b.page.getByRole("menuitem", { name: /C41 Tower/ }).first().click();
        await panel.locator("[data-assigned-to-me]").click();
        const names = await waitFor(async () => {
          const now = (await panel.locator("li[data-item-row] [data-item-name]").allInnerTexts()).map((x) => x.trim()).filter((x) => x.startsWith("C41"));
          return now.length === 1 ? now : null;
        }, "only the item matching both", 8000);
        expect(names[0] === "C41 both", `shown: ${names}`);
        await b.page.screenshot({ path: shot.replace(".png", "-tower.png") });
        await assign([]);
        return `rule "${rule}"; row "${rowText.replace(/s+/g, " ")}"; shown ${names}`;
      } finally {
        await assign([]).catch(() => {});
        await b.context.close();
      }
    },
  },
]);

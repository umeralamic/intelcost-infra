// F6 Block D: classification systems (S10), the tree (S11), archive (S12), duplicates
// and the seed (S13), filing by classification (S14), subcontractors (S15).
//
//   docker compose --profile realtime up -d
//   docker compose --profile browser run --rm browser node scripts/f6-d.mjs
//
// The world: a fresh workspace (its trees seed on first read, D-58), an estimator seat
// (no Manage classification), a project with one landscape page at 1/6 ft per point.
// Window B is the same owner on :5174.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { APP_B, recordSockets, signInAt, waitFor } from "./lib/realtime.mjs";
import { sheetPoint } from "./lib/takeoff.mjs";

const W = 1224;
const H = 792;
const FT = 1 / 6;
const { token, workspace, base } = await freshWorkspace("F6 Block D");
const ws = `/api/workspace/${workspace.uuid}`;
const project = await makeProject(token, base, { name: "Classified" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
let estimator;

const nodes = async (system) => (await apiCall(token, "GET", `${ws}/classification?system=${system}`)).body;
const byCode = async (system, code) => (await nodes(system)).find((n) => n.code === code);
const editor = (page) => page.locator("[data-classification-editor]");
const division = (page, code) => editor(page).locator(`[data-division="${code}"]`);
const rowMenu = async (page, row, entry) => {
  await row.hover();
  await row.getByRole("button", { name: "Row actions" }).click();
  await page.getByRole("menuitem", { name: entry, exact: true }).click();
};

async function openSettings(page, path, email) {
  await signInAs(page, email ?? (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}${path}`);
}

async function area(name, extra = {}) {
  const res = await apiCall(token, "POST", `${takeoff}/item`, {
    name, type: "sf", unit: "SF", sheet_uuid: sheet.uuid, ...extra,
    geometry: { geom_type: "sf", vertices_json: [[0.2, 0.2], [0.3, 0.2], [0.3, 0.3], [0.2, 0.3]], shape_meta: { closed: true }, client_uuid: crypto.randomUUID() },
  });
  return res;
}

await run("f6-d", [
  {
    title: "setup: a fresh workspace, a takeoff seat, a project with one page at 1/6 ft per point",
    run: async ({ page }) => {
      // The takeoff seat: it measures, and has no Manage classification (the estimator
      // holds the library capabilities, as F3 decided).
      estimator = await seatedMember(token, workspace.uuid, "takeoff", "f6-d");
      const files = await uploadAll(page, token, base, project.uuid, [
        { name: "Classified.pdf", buffer: makePdf([{ width: W, height: H, label: "K1" }]), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Classified.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      return "takeoff seat made; page scaled";
    },
  },
  {
    title: "S13: a new workspace finds legacy's trees seeded on first read (CSI 1,833, UniFormat 635, NRM 1 401, NRM 2 361, CESMM 254), and reading again never doubles them",
    run: async () => {
      const counts = {};
      for (const system of ["csi", "uniformat", "nrm1", "nrm2", "cesmm"]) counts[system] = (await nodes(system)).length;
      const again = (await nodes("csi")).length;
      expect(counts.csi === 1833 && counts.uniformat === 635 && counts.nrm1 === 401 && counts.nrm2 === 361 && counts.cesmm === 254, JSON.stringify(counts));
      expect(again === 1833, `csi read twice: ${again}`);
      const concrete = await byCode("csi", "03");
      expect(concrete?.name === "Concrete" && concrete.is_seed, `03: ${JSON.stringify(concrete)}`);
      const subs = (await apiCall(token, "GET", `${ws}/subcontractor`)).body;
      expect(subs.length === 54 && subs.some((s) => s.name === "GC" && s.scopes > 0), `subs ${subs.length}`);
      return `${JSON.stringify(counts)}; again ${again}; 54 default subcontractors, GC packaged to ${subs.find((s) => s.name === "GC").scopes} scopes`;
    },
  },
  {
    title: "S10: all five systems listed and on; unchecking every one warns and disables Save; the api refuses none (409) and an unknown key (422); NRM 2 off survives a reload; a takeoff seat reads but cannot change (403)",
    run: async ({ page }) => {
      await openSettings(page, "/settings/classification");
      const card = page.locator("[data-systems-card]");
      await card.getByText("CESMM").waitFor({ timeout: 20000 });
      const boxes = card.getByRole("checkbox");
      const n = await boxes.count();
      for (let i = 0; i < n; i++) expect(await boxes.nth(i).isChecked(), `box ${i} off`);
      for (let i = 0; i < n; i++) await boxes.nth(i).uncheck();
      const warning = (await card.locator("[data-systems-warning]").textContent()).trim();
      const off = await card.getByRole("button", { name: "Save classification systems" }).isDisabled();
      expect(warning === "At least one system must remain enabled." && off, `warning "${warning}", disabled ${off}`);
      const none = await apiCall(token, "PUT", `${ws}/classification/systems`, { enabled: [] });
      const unknown = await apiCall(token, "PUT", `${ws}/classification/systems`, { enabled: ["csi", "omniclass"] });
      expect(none.status === 409 && none.body.detail === "Pick at least one classification system" && unknown.status === 422, `none ${none.status} ${JSON.stringify(none.body)}, unknown ${unknown.status}`);
      await page.reload();
      await card.getByText("CESMM").waitFor();
      await card.getByRole("checkbox", { name: "NRM 2 (Work Sections)" }).uncheck();
      await card.getByRole("button", { name: "Save classification systems" }).click();
      await page.getByText("Classification systems saved").waitFor();
      await page.reload();
      await card.getByText("CESMM").waitFor();
      const nrm2 = await card.getByRole("checkbox", { name: "NRM 2 (Work Sections)" }).isChecked();
      const stored = (await apiCall(token, "GET", `${ws}/classification/systems`)).body.filter((s) => s.enabled).map((s) => s.key);
      const refused = await apiCall(estimator.token, "PUT", `${ws}/classification/systems`, { enabled: ["csi"] });
      const readable = await apiCall(estimator.token, "GET", `${ws}/classification?system=csi`);
      expect(!nrm2 && stored.join() === "csi,uniformat,nrm1,cesmm", `after reload NRM 2 ${nrm2}; stored ${stored.join()}`);
      expect(refused.status === 403 && readable.status === 200, `estimator PUT ${refused.status}, GET ${readable.status}`);
      await apiCall(token, "PUT", `${ws}/classification/systems`, { enabled: ["csi", "uniformat", "nrm1", "nrm2", "cesmm"] });
      return `five on; "${warning}", Save disabled; [] 409, "omniclass" 422; NRM 2 off kept after a reload; the takeoff seat 403 on PUT, 200 on GET`;
    },
  },
  {
    title: "S11, S13: add division 99 \"Fixture Works\"; \"03\" again is refused \"That code already exists in this system.\" (and \"03\" in UniFormat is accepted); a scope and a sub-scope get 99.01 and 99.01.01; rename; window B follows live",
    run: async ({ page, context }) => {
      const owner = await fixtureOwner();
      const b = await context.browser().newContext();
      await recordSockets(b);
      try {
        const bp = await b.newPage();
        await signInAt(bp, APP_B, owner.email, owner.password);
        await enterWorkspace(bp, workspace.uuid);
        await bp.goto(`${APP_B}/settings/classification`);
        await bp.locator('[data-classification-editor] [data-division="03"]').waitFor({ timeout: 30000 });

        await openSettings(page, "/settings/classification");
        await division(page, "03").waitFor({ timeout: 30000 });
        const label = (await division(page, "03").innerText()).trim();
        await editor(page).getByRole("button", { name: "+ Add division" }).click();
        const form = editor(page).locator("[data-add-division]");
        await form.getByLabel("Code").fill("03");
        await form.getByLabel("Name").fill("Again");
        await form.getByRole("button", { name: "Add" }).click();
        const dup = (await form.locator("[data-division-error]").textContent()).trim();
        const other = await apiCall(token, "POST", `${ws}/classification`, { system: "uniformat", code: "03", name: "Accepted elsewhere" });
        await form.getByLabel("Code").fill("99");
        await form.getByLabel("Name").fill("Fixture Works");
        await form.getByRole("button", { name: "Add" }).click();
        await division(page, "99").waitFor();
        const at = Date.now();
        await bp.locator('[data-classification-editor] [data-division="99"]').waitFor({ timeout: 10000 });
        const live = Date.now() - at;
        // A scope, then a sub-scope under it.
        await editor(page).getByRole("button", { name: "+ Add scope" }).click();
        await editor(page).getByLabel("Scope name").fill("Framing");
        await editor(page).getByLabel("Scope name").press("Enter");
        await editor(page).locator('[data-node="99.01"]').waitFor();
        await rowMenu(page, editor(page).locator('[data-node="99.01"] > div'), "Add sub-scope");
        await editor(page).getByLabel("Sub-scope name").fill("Studs");
        await editor(page).getByLabel("Sub-scope name").press("Enter");
        await editor(page).locator('[data-node="99.01.01"]').waitFor();
        await rowMenu(page, editor(page).locator('[data-node="99.01"] > div').first(), "Rename");
        await editor(page).getByLabel("Rename Framing").fill("Wood Framing");
        await editor(page).getByLabel("Rename Framing").press("Enter");
        await waitFor(async () => (await byCode("csi", "99.01"))?.name === "Wood Framing", "rename stored", 10000);
        expect(label === "DIV 03 — Concrete", `division label "${label}"`);
        expect(dup === "That code already exists in this system." && other.status === 201, `dup "${dup}", uniformat 03 ${other.status}`);
        return `"${label}"; duplicate refused "${dup}"; 03 in UniFormat ${other.status}; 99, 99.01, 99.01.01 made; renamed; B had 99 in ${live} ms`;
      } finally {
        await b.close();
      }
    },
  },
  {
    title: "S14: Preset Classification: search \"Wood Framing\", pick it, Create, draw: the item files under \"DIV 99 — Fixture Works\" / \"Wood Framing\"; the project locks to CSI and refuses a UniFormat node (409)",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
      await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
      await page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: "Area", exact: true }).click();
      const dialog = page.locator("[data-measurement-dialog]");
      await dialog.waitFor();
      await dialog.getByLabel("Name").fill("Stud wall");
      const wbs = dialog.locator("[data-wbs]");
      if ((await wbs.getByRole("button", { name: "Work Breakdown Structure (WBS)" }).getAttribute("aria-expanded")) !== "true") {
        await wbs.getByRole("button", { name: "Work Breakdown Structure (WBS)" }).click();
      }
      await wbs.getByRole("button", { name: "Preset Classification" }).click();
      const create = dialog.getByRole("button", { name: "Create" });
      const offFirst = await create.isDisabled();
      const picker = wbs.locator("[data-classification-picker]");
      await picker.getByText("Locks after first save").waitFor({ timeout: 10000 });
      const hint = await picker.getByText("Locks after first save").count();
      await picker.getByLabel("Search classifications").fill("Wood Framing");
      await picker.locator('[data-pick="99.01"]').click();
      const selected = (await picker.locator("[data-picked-classification]").textContent()).trim();
      await create.click();
      await dialog.waitFor({ state: "detached" });
      for (const [x, y] of [[0.4, 0.4], [0.5, 0.4], [0.5, 0.5]]) {
        const pt = await sheetPoint(page, x, y);
        await page.mouse.click(pt.x, pt.y);
      }
      const last = await sheetPoint(page, 0.4, 0.5);
      await page.mouse.dblclick(last.x, last.y);
      const item = await waitFor(async () => (await apiCall(token, "GET", `${takeoff}/item`)).body.find((i) => i.name.startsWith("Stud wall")), "Stud wall saved", 10000);
      const folders = (await apiCall(token, "GET", `${takeoff}/folder`)).body;
      const leaf = folders.find((f) => f.uuid === item.folder_uuid);
      const root = folders.find((f) => f.uuid === leaf?.parent_uuid);
      const node = await byCode("csi", "99.01");
      const stamped = (await apiCall(token, "GET", `${base}/${project.uuid}`)).body.classification_system;
      const uni = await byCode("uniformat", "A10");
      const refused = await area("Wrong system", { classification_ref_id: uni.uuid });
      expect(offFirst && hint === 1 && selected === "Selected: DIV 99 — Fixture Works › Wood Framing", `Create off ${offFirst}, hint ${hint}, "${selected}"`);
      expect(leaf?.name === "Wood Framing" && root?.name === "DIV 99 — Fixture Works" && item.classification_ref_id === node.uuid, `filed in ${root?.name} / ${leaf?.name}, ref ${item.classification_ref_id}`);
      expect(stamped === "csi" && refused.status === 409 && refused.body.detail === "This project is locked to CSI MasterFormat.", `stamp ${stamped}; ${refused.status} ${JSON.stringify(refused.body)}`);
      // A second item on the same scope finds the same folders.
      const again = await area("Second wall", { classification_ref_id: node.uuid });
      const same = again.body.folder_uuid === item.folder_uuid && (await apiCall(token, "GET", `${takeoff}/folder`)).body.length === folders.length;
      expect(same, "a second filing made new folders");
      // Reopen: the picker is locked.
      await page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: "Count", exact: true }).click();
      await dialog.locator("[data-system-locked]").waitFor();
      const locked = (await dialog.locator("[data-system-locked]").innerText()).trim();
      await dialog.getByRole("button", { name: "Cancel" }).click();
      return `Create disabled until picked; "${selected}"; filed in "${root.name}" / "${leaf.name}"; project stamped csi; "${locked}"; UniFormat refused "${refused.body.detail}"; a second filing reused the folders`;
    },
  },
  {
    title: "S14 AC3: Properties → Current folder → Change → pick 03's first scope: the item moves to \"DIV 03 — Concrete\" in one step",
    run: async ({ page }) => {
      const concrete = await byCode("csi", "03");
      const scope = (await nodes("csi")).filter((n) => n.parent_uuid === concrete.uuid).sort((a, b) => (a.sort_key < b.sort_key ? -1 : 1))[0];
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
      await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
      const row = page.locator("[data-quantity-panel] li[data-item-row] > button").filter({ has: page.getByText("Second wall", { exact: true }) });
      await row.click({ button: "right" });
      await page.getByRole("menuitem", { name: /^Properties/ }).click();
      const dialog = page.locator("[data-measurement-dialog]");
      await dialog.locator("[data-current-folder]").getByRole("button", { name: "Change" }).click();
      const picker = dialog.locator("[data-classification-picker]");
      await picker.locator('[data-division="03"]').click();
      await picker.locator(`[data-pick="${scope.code}"]`).click();
      await dialog.getByRole("button", { name: "Save" }).click();
      const moved = await waitFor(async () => {
        const it = (await apiCall(token, "GET", `${takeoff}/item`)).body.find((i) => i.name === "Second wall");
        return it.classification_ref_id === scope.uuid ? it : null;
      }, "Second wall reclassified", 10000);
      const folders = (await apiCall(token, "GET", `${takeoff}/folder`)).body;
      const leaf = folders.find((f) => f.uuid === moved.folder_uuid);
      const root = folders.find((f) => f.uuid === leaf.parent_uuid);
      expect(leaf.name === scope.name && root.name === "DIV 03 — Concrete", `in ${root?.name} / ${leaf?.name}`);
      return `moved to "${root.name}" / "${leaf.name}"`;
    },
  },
  {
    title: "S11, S12: deleting 99.01 (an item under it) shows \"This one is in use\" with the count; the api refuses 409; \"Archive instead\" hides it from the picker, the item keeps its classification; Show archived reveals it; Restore; an unused sub-scope deletes with legacy's words",
    run: async ({ page }) => {
      await openSettings(page, "/settings/classification");
      await division(page, "99").waitFor({ timeout: 30000 });
      await division(page, "99").getByRole("button").first().click();
      const framing = editor(page).locator('[data-node="99.01"] > div').first();
      await framing.waitFor();
      await rowMenu(page, framing, "Delete");
      const dialog = page.getByRole("dialog");
      await dialog.getByText("This one is in use").waitFor();
      const words = (await dialog.locator("[data-in-use]").textContent()).trim();
      const node = await byCode("csi", "99.01");
      const api = await apiCall(token, "DELETE", `${ws}/classification/${node.uuid}`);
      await dialog.getByRole("button", { name: "Archive instead" }).click();
      await page.getByText("is hidden from pickers.").waitFor();
      await editor(page).locator('[data-node="99.01"]').waitFor({ state: "detached" });
      const archived = await byCode("csi", "99.01");
      const item = (await apiCall(token, "GET", `${takeoff}/item`)).body.find((i) => i.name.startsWith("Stud wall"));
      const refiled = await area("Into archived", { classification_ref_id: node.uuid });
      await editor(page).locator("[data-scope-column]").getByRole("button", { name: "Show archived" }).click();
      await editor(page).locator('[data-node="99.01"]').waitFor();
      const faded = await editor(page).locator('[data-node="99.01"] > div').first().evaluate((el) => el.className.includes("opacity-50"));
      await rowMenu(page, editor(page).locator('[data-node="99.01"] > div').first(), "Restore");
      await waitFor(async () => (await byCode("csi", "99.01")).archived_at === null, "restored", 10000);
      // Studs is unused: delete it.
      await editor(page).locator('[data-node="99.01"] button[aria-label="Expand"]').click();
      await rowMenu(page, editor(page).locator('[data-node="99.01.01"] > div'), "Delete");
      await page.getByRole("dialog").getByText('Delete "Studs"?').waitFor();
      const confirmWords = (await page.getByRole("dialog").innerText()).includes("This permanently removes \"Studs\". Nothing is filed under it, so no measurements are affected. This can't be undone.");
      await page.getByRole("dialog").getByRole("button", { name: "Delete permanently" }).click();
      await page.getByText('"Studs" was removed.').waitFor();
      expect(words.startsWith('1 folder(s) or measurement(s) are filed under "Wood Framing" or one of its sub-scopes') || words.startsWith("2 folder(s)"), `in use: ${words}`);
      expect(api.status === 409 && api.body.detail.startsWith("This one is in use"), `api ${api.status} ${JSON.stringify(api.body)}`);
      expect(archived.archived_at && item.classification_ref_id === node.uuid && refiled.status === 409, `archived ${archived.archived_at}, item ref ${item.classification_ref_id}, filing into archived ${refiled.status}`);
      expect(faded && confirmWords, `faded ${faded}, confirm words ${confirmWords}`);
      return `"${words.slice(0, 80)}…"; api 409; archived, the item kept its classification, a new filing into it refused; shown faded; restored; Studs deleted in legacy's words`;
    },
  },
  {
    title: "S13: a seeded division deleted stays deleted: the tree is never seeded again",
    run: async () => {
      const cesmm = await byCode("cesmm", "Z");
      const gone = await apiCall(token, "DELETE", `${ws}/classification/${cesmm.uuid}`);
      const after = await nodes("cesmm");
      expect(gone.status === 200 && !after.some((n) => n.code === "Z") && after.length < 254, `delete ${gone.status}; ${after.length} nodes`);
      return `CESMM Z deleted (${gone.status}); reread: ${after.length} nodes, Z not back`;
    },
  },
  {
    title: "S15: 54 default subcontractors; add \"Fixture Glazing\"; package 99 to it and 99.01 inherits \"(inherited from Fixture Works)\"; delete asks first in legacy's words and 99 is Unassigned after",
    run: async ({ page }) => {
      await openSettings(page, "/settings/subcontractors");
      const panel = page.locator("[data-subcontractors]");
      await panel.locator('[data-sub="GC"]').waitFor({ timeout: 30000 });
      const count = await panel.locator("[data-sub]").count();
      await panel.getByLabel("New subcontractor").fill("Fixture Glazing");
      await panel.getByRole("button", { name: "Add", exact: true }).click();
      await page.getByText("Subcontractor added").waitFor();
      await panel.locator('[data-sub="Fixture Glazing"]').waitFor();
      const tree = panel.locator("[data-scope-tree]");
      await tree.getByLabel("Search classifications").fill("Fixture Works");
      await tree.getByLabel("Subcontractor for 99", { exact: true }).selectOption({ label: "Fixture Glazing" });
      const sub = (await apiCall(token, "GET", `${ws}/subcontractor`)).body.find((s) => s.name === "Fixture Glazing");
      await waitFor(async () => (await apiCall(token, "GET", `${ws}/subcontractor/scope?system=csi`)).body.some((s) => s.subcontractor_uuid === sub.uuid), "packaged", 10000);
      await tree.getByLabel("Search classifications").fill("Wood Framing");
      const inherits = tree.locator('[data-scope-row="99.01"]').getByText("Fixture Glazing (inherited from Fixture Works)");
      await inherits.waitFor({ timeout: 10000 });
      const option = await tree.getByLabel("Subcontractor for 99.01").locator("option").first().textContent();
      await panel.locator('[data-sub="Fixture Glazing"]').hover();
      await panel.getByRole("button", { name: "Delete Fixture Glazing" }).click();
      const confirm = await page.getByRole("dialog").innerText();
      await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      await page.getByText("Subcontractor deleted").waitFor();
      const left = (await apiCall(token, "GET", `${ws}/subcontractor/scope?system=csi`)).body.some((s) => s.subcontractor_uuid === sub.uuid);
      expect(count === 54, `listed ${count}`);
      expect(option === "Inherit (Fixture Glazing)", `99.01 first option "${option}"`);
      expect(confirm.includes('Delete "Fixture Glazing"?') && confirm.includes("Scopes packaged to it become Unassigned across the workspace. Projects that overrode those scopes keep their own assignment.") && !left, `confirm: ${confirm}; left ${left}`);
      return `54 listed; added; 99 packaged, 99.01 "${option}"; delete asked in legacy's words; unassigned after`;
    },
  },
]);

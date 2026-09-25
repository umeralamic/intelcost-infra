// F4-S1 — the project record, to parity, and gated by what each act is (D-26).
//
//   docker compose --profile browser run --rm browser node scripts/f4-s1.mjs
//
// Two halves. The record: `bid_status` became legacy's ten statuses, and the first
// Submitted and first Won dates are stamped by the api in the same transaction as the
// change, where a trigger used to do it. The gates: every project write rode
// `canEditTakeoff` before this, so a pricing seat could not add a folder for a spec and
// a takeoff seat could empty the trash. Each act now names its own capability. Since
// D-29 a pricing seat also creates projects; qa_pricing is the seat that may not.
//
// Hiding is not a gate. Every step that finds a control disabled also sends the request
// by hand and expects the api to refuse it, with the same words the screen uses.

import {
  APP,
  activity,
  apiCall,
  apiLogin,
  expect,
  firstWorkspace,
  run,
  SEEDED,
  seatedMember,
  signInAs,
} from "./lib/bench.mjs";

const STATUSES = new Set([
  "bidding",
  "revision_required",
  "waiting_on_quotes",
  "submitted",
  "change_order",
  "won",
  "lost",
  "no_bid",
  "cancelled",
  "archived",
]);

const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);
const base = `/api/workspace/${workspace.uuid}/project`;

const pricing = await seatedMember(ownerToken, workspace.uuid, "pricing", "f4s1");
const qaPricing = await seatedMember(ownerToken, workspace.uuid, "qa_pricing", "f4s1");
const collaborator = await seatedMember(ownerToken, workspace.uuid, "collaborator", "f4s1");
const viewer = await seatedMember(ownerToken, workspace.uuid, "viewer", "f4s1");
const estimator = await seatedMember(ownerToken, workspace.uuid, "estimator", "f4s1");
const admin = await seatedMember(ownerToken, workspace.uuid, "admin", "f4s1");

/** A project made by the owner for one step, so no step depends on another's leftovers. */
async function freshProject(tag) {
  const created = await apiCall(ownerToken, "POST", base, { name: `F4-S1 ${tag} ${Date.now()}` });
  expect(created.status === 201, `create: ${created.status} ${JSON.stringify(created.body)}`);
  return created.body;
}

await run("f4-s1", [
  {
    title: "AC1 — every existing project reads one of the ten statuses, and none reads draft",
    run: async () => {
      const page = await apiCall(ownerToken, "GET", `${base}?limit=200`);
      expect(page.status === 200, `list: ${page.status}`);
      const bad = page.body.items.filter((p) => !STATUSES.has(p.status));
      expect(bad.length === 0, `invalid statuses: ${bad.map((p) => p.status).join(", ")}`);
      expect(page.body.items.every((p) => !("bid_status" in p)), "bid_status still on the wire");
      const fresh = await freshProject("default");
      expect(fresh.status === "bidding", `a new project starts as ${fresh.status}`);
      expect(fresh.status_updated_at, "a new project has no status_updated_at");
      return `${page.body.items.length} projects, all valid · new projects start Bidding`;
    },
  },
  {
    title: "AC2 — Submitted stamps submitted_at once; a bounce and resubmit keeps the first date",
    run: async () => {
      const project = await freshProject("stamps");
      const path = `${base}/${project.uuid}`;

      const submitted = await apiCall(ownerToken, "PATCH", path, { status: "submitted" });
      expect(submitted.status === 200, `submit: ${submitted.status}`);
      const first = submitted.body.submitted_at;
      expect(first, "submitted_at not set on Submitted");

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const back = await apiCall(ownerToken, "PATCH", path, { status: "bidding" });
      const again = await apiCall(ownerToken, "PATCH", path, { status: "submitted" });
      expect(back.status === 200 && again.status === 200, "bounce failed");
      expect(again.body.submitted_at === first, `submitted_at moved: ${first} → ${again.body.submitted_at}`);
      expect(
        again.body.status_updated_at !== submitted.body.status_updated_at,
        "status_updated_at did not move on a change",
      );

      const won = await apiCall(ownerToken, "PATCH", path, { status: "won" });
      expect(won.body.awarded_at, "awarded_at not set on Won");

      // Leaving the status out leaves it alone: an absent field is not "back to Bidding".
      const renamed = await apiCall(ownerToken, "PATCH", path, { client_name: "Harbor Partners" });
      expect(renamed.body.status === "won", `a client edit reset status to ${renamed.body.status}`);
      expect(renamed.body.client_name === "Harbor Partners", "client_name not saved");
      return `submitted_at held at ${first} · awarded_at set · untouched fields untouched`;
    },
  },
  {
    title: "AC2b — the record refuses what it cannot hold: a blank name, an unknown status",
    run: async () => {
      const project = await freshProject("refusals");
      const path = `${base}/${project.uuid}`;
      const blank = await apiCall(ownerToken, "PATCH", path, { name: null });
      const unknown = await apiCall(ownerToken, "PATCH", path, { status: "draft" });
      const attr = await apiCall(ownerToken, "PATCH", path, {
        construction_type: "renovation",
        trade_scope: "general_trades",
        wage_determination: "union_cba",
        labor_pricing_basis: "burdened",
        project_type: "commercial",
        bid_due_date: "2026-10-01",
        address_line_2: "Suite 4",
        county: "Travis",
        country: "US",
      });
      expect(blank.status === 422, `null name: ${blank.status}`);
      expect(unknown.status === 422, `draft status: ${unknown.status}`);
      expect(attr.status === 200, `attributes: ${attr.status} ${JSON.stringify(attr.body)}`);
      expect(attr.body.bid_due_date === "2026-10-01", `bid due read back ${attr.body.bid_due_date}`);
      expect(attr.body.county === "Travis" && attr.body.address_line_2 === "Suite 4", "address fields not patched");
      return "null name 422 · draft 422 · five attributes, bid due and the four once-unpatchable columns saved";
    },
  },
  {
    title: "AC3 — a qa_pricing seat sees New project disabled with the reason, and the api says the same",
    run: async ({ page }) => {
      await signInAs(page, qaPricing.email);
      const button = page.getByRole("button", { name: "New project" });
      await button.waitFor({ timeout: 20000 });
      expect(await button.isDisabled(), "New project is enabled for qa_pricing");
      await page.getByText("Your role cannot create projects.").waitFor({ timeout: 10000 });

      const post = await apiCall(qaPricing.token, "POST", base, { name: "sneak" });
      expect(post.status === 403, `qa_pricing POST: ${post.status}`);
      expect(post.body?.detail === "Your role cannot create projects.", `refusal: ${post.body?.detail}`);
      return "button disabled, reason shown · api 403 with the same sentence";
    },
  },
  {
    title: "AC3b (D-29) — a pricing seat creates a project from the dialog",
    run: async ({ page }) => {
      const map = (await apiCall(pricing.token, "GET", `/api/workspace/${workspace.uuid}/capability`)).body;
      expect(map.capabilities.canCreateProjects === true, "pricing does not hold canCreateProjects");
      await signInAs(page, pricing.email);
      const button = page.getByRole("button", { name: "New project" });
      await button.waitFor({ timeout: 20000 });
      // Disabled while the permission answer is in flight (loading reads false), so this
      // waits for it to open rather than reading it the instant it is drawn.
      await page
        .locator("button:not([disabled])", { hasText: "New project" })
        .waitFor({ timeout: 15000 })
        .catch(() => {});
      expect(!(await button.isDisabled()), "New project is disabled for pricing");
      const name = `F4-S1 by pricing ${Date.now()}`;
      await button.click();
      await page.fill("#new-project-name", name);
      await page.getByRole("button", { name: "Create project" }).click();
      await page.getByRole("heading", { name }).waitFor({ timeout: 15000 });
      return "canCreateProjects true · created through the dialog · landed on it";
    },
  },
  {
    title: "AC4 — a collaborator may add a folder (upload documents) but not rename one (D-26)",
    run: async () => {
      const project = await freshProject("folders");
      const folders = `${base}/${project.uuid}/folder`;
      const made = await apiCall(collaborator.token, "POST", folders, { name: "Photos from site" });
      expect(made.status === 201, `collaborator folder create: ${made.status} ${JSON.stringify(made.body)}`);
      const rename = await apiCall(collaborator.token, "PATCH", `${folders}/${made.body.uuid}`, { name: "x" });
      expect(rename.status === 403, `collaborator rename: ${rename.status}`);
      expect(rename.body?.detail === "Your role cannot create projects.", `refusal: ${rename.body?.detail}`);
      const byOwner = await apiCall(ownerToken, "PATCH", `${folders}/${made.body.uuid}`, { name: "Specs" });
      expect(byOwner.status === 200, `owner rename: ${byOwner.status}`);
      return "create 201 · rename refused 403 · owner renames 200";
    },
  },
  {
    title: "AC5 — trash is owner and admin (canManageWorkspace); restore is canRestoreDeletedItems",
    run: async () => {
      const project = await freshProject("trash");
      const path = `${base}/${project.uuid}`;

      const byEstimator = await apiCall(estimator.token, "DELETE", path);
      expect(byEstimator.status === 403, `estimator trash: ${byEstimator.status}`);
      expect(
        byEstimator.body?.detail === "Your role cannot change workspace settings.",
        `refusal: ${byEstimator.body?.detail}`,
      );
      const byAdmin = await apiCall(admin.token, "DELETE", path);
      expect(byAdmin.status === 200, `admin trash: ${byAdmin.status}`);
      const gone = await apiCall(ownerToken, "GET", path);
      expect(gone.status === 404, `trashed project still reads: ${gone.status}`);

      const restoreByEstimator = await apiCall(estimator.token, "POST", `${path}/restore`);
      expect(restoreByEstimator.status === 403, `estimator restore: ${restoreByEstimator.status}`);
      const restoreByAdmin = await apiCall(admin.token, "POST", `${path}/restore`);
      expect(restoreByAdmin.status === 200, `admin restore: ${restoreByAdmin.status}`);
      const back = await apiCall(ownerToken, "GET", path);
      expect(back.status === 200, `restored project does not read: ${back.status}`);
      return "estimator refused both · admin trashes and restores · the project reads again";
    },
  },
  {
    title: "AC6 — a viewer sees the dashboard and Project Home with every write disabled, with reasons",
    run: async ({ page }) => {
      const project = await freshProject("viewer");
      await signInAs(page, viewer.email);
      const create = page.getByRole("button", { name: "New project" });
      await create.waitFor({ timeout: 20000 });
      expect(await create.isDisabled(), "New project enabled for viewer");
      await page.getByText("Your role cannot create projects.").waitFor();

      await page.goto(`${APP}/project/${project.uuid}`);
      const upload = page.getByRole("button", { name: "Upload drawings" }).first();
      await upload.waitFor({ timeout: 20000 });
      expect(await upload.isDisabled(), "Upload drawings enabled for viewer");
      await page.getByText("Your role cannot create & edit measurements.").waitFor();
      await page.getByRole("heading", { name: project.name }).waitFor();

      const patch = await apiCall(viewer.token, "PATCH", `${base}/${project.uuid}`, { name: "x" });
      expect(patch.status === 403, `viewer PATCH: ${patch.status}`);
      return "both screens render · both controls disabled with reasons · api refuses the edit";
    },
  },
  {
    title: "AC7 — trash and restore each leave one row in the activity feed, in words",
    run: async ({ page }) => {
      const project = await freshProject("audit");
      const path = `${base}/${project.uuid}`;
      await apiCall(ownerToken, "DELETE", path);
      await apiCall(ownerToken, "POST", `${path}/restore`);

      const feed = await activity(ownerToken, workspace.uuid, { limit: 20 });
      expect(feed.status === 200, `activity: ${feed.status}`);
      const rows = feed.body.items.filter((row) => row.target === project.name);
      const actions = rows.map((row) => row.action).sort();
      expect(
        actions.join(",") === "project.restored,project.trashed",
        `feed for ${project.name}: ${actions.join(", ")}`,
      );

      await signInAs(page, SEEDED.email, SEEDED.password);
      await page.goto(`${APP}/settings/activity`);
      await page.getByText(`moved the project ${project.name} to Trash`).waitFor({ timeout: 20000 });
      await page.getByText(`restored the project ${project.name} from Trash`).waitFor();
      return "one project.trashed and one project.restored row · both read as sentences";
    },
  },
]);

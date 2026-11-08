// C30, the founder's click check of billing on the bench's Stripe fake (F16, D-277, D-280, D-356):
// an expired trial's Billing page and Checkout, the portal, seats refused when full, a restricted
// trial's caps, buying an AI pack, and a comp Essentials workspace that loses editing and whose
// refusals name the plan.
//
//   ./browser/c30-billing.sh      (two passes with one database step between; see that file)
//
// The worlds, all the run's own owner's: EXPIRED (a trial aged past its end), PRO (comped
// Professional, one seat), ESS (comped Essentials, one page and one item), CAPPED (a running trial
// on the restricted tier 3: one project). STAFF is a throwaway seat made platform staff in the
// database step, to grant the two comps through the platform api.
//
// Paying: the fx stack has its own Stripe fake (stripe-fake-fx, pages on :12112, webhooks to the fx
// api; N10, D-660), so the run presses Pay on the fake's Checkout: the expired trial becomes
// Professional once the webhook lands, and an AI pack's 1,000 credits land on the workspace's
// purchased balance. Nothing reaches the bench's own fake or database.
// Left for the founder's eye: the Billing page's look, the portal's flow, the Billing tiers console
// where a comp is granted by hand.
//
// Updated 2026-10-24 (D-752): an account owns one workspace, so the four worlds have their own owners (the first
// the run's owner, PRO, ESS and CAPPED fresh throwaways made by createWorkspace); each call and sign-in is made
// as the owner of the workspace it names. The checks and their figures are unchanged.

import { APP, apiCall, apiLogin, createWorkspace, enterWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";

const PASSWORD = "bench-password-1";
const ESTIMATES_PLAN_LOCKED = "Editing estimates isn't included in Essentials. Upgrade to Professional to edit.";
const TAKEOFF_PLAN_LOCKED = "Takeoff isn't included in Essentials. Upgrade to Professional to measure.";

if (process.env.SETUP === "1") {
  const owner = await fixtureOwner();
  const stamp = Date.now();
  const expired = await createWorkspace(owner.token, `C30 Expired ${stamp}`);
  const pro = await createWorkspace(owner.token, `C30 Pro ${stamp}`, { seatAsker: false });
  const ess = await createWorkspace(owner.token, `C30 Essentials ${stamp}`);
  const capped = await createWorkspace(owner.token, `C30 Capped ${stamp}`);
  const staff = await seatedMember(owner.token, expired.uuid, "viewer", "c30-staff");
  console.log(`OWNER=${owner.email}`);
  // D-752: an account owns one workspace, so PRO, ESS and CAPPED each have their own owner (createWorkspace);
  // the run's owner is seated in ESS and CAPPED, not in PRO, whose one seat is its owner's.
  console.log(`OWNERS=${JSON.stringify(Object.fromEntries([[expired.uuid, owner.email], ...[pro, ess, capped].map((w) => [w.uuid, w.extra_owner?.email ?? owner.email])]))}`);
  console.log(`EXPIRED=${expired.uuid}`);
  console.log(`PRO=${pro.uuid}`);
  console.log(`ESS=${ess.uuid}`);
  console.log(`CAPPED=${capped.uuid}`);
  console.log(`STAFF=${staff.email}`);
  process.exit(0);
}

for (const key of ["FX_OWNER", "EXPIRED", "PRO", "ESS", "CAPPED", "STAFF"]) {
  if (!process.env[key]) {
    console.error(`Run the SETUP pass first; ${key} is missing. See c30-billing.sh.`);
    process.exit(2);
  }
}
const owner = await fixtureOwner();
const token = owner.token ?? (await apiLogin(process.env.FX_OWNER, PASSWORD));
const W = { expired: process.env.EXPIRED, pro: process.env.PRO, ess: process.env.ESS, capped: process.env.CAPPED };
const ws = (uuid) => `/api/workspace/${uuid}`;
// Each world's owner (D-752), and its token: a call is made as the owner of the workspace it names.
const OWNERS = JSON.parse(process.env.OWNERS ?? "{}");
const tokens = {};
for (const [uuid, email] of Object.entries(OWNERS)) tokens[uuid] = email === process.env.FX_OWNER ? token : await apiLogin(email, PASSWORD);
const tok = (uuid) => tokens[uuid] ?? token;
const ownerOf = (uuid) => OWNERS[uuid] ?? process.env.FX_OWNER;
const callAs = (_t, method, path, body) => apiCall(tok(path.match(/\/api\/workspace\/([0-9a-f-]{36})/)?.[1]), method, path, body);
const essWorld = {};

async function as(page, workspace, path) {
  await signInAs(page, ownerOf(workspace));
  await enterWorkspace(page, workspace);
  await page.goto(`${APP}${path}`);
}
/** The fake's control route, read from its own page (same origin): the suite's node process
 *  cannot reach the fake's port, the browser can. */
const fakeGet = (page, path) => page.evaluate(async (p) => (await fetch(p)).json(), path);
const said = (r) => JSON.stringify(r.body);

await run("c30-billing", [
  {
    title: "setup: staff comps PRO as Professional with one seat and ESS as Essentials (after ESS gets a page and an item); EXPIRED reads trial_ended, CAPPED is capped",
    run: async ({ page }) => {
      const staff = await apiLogin(process.env.STAFF, PASSWORD);
      const base = `${ws(W.ess)}/project`;
      const project = await makeProject(tok(W.ess), base, { name: "Essentials one" });
      const files = await uploadAll(page, tok(W.ess), base, project.uuid, [{ name: "B1.pdf", buffer: makePdf([{ width: 1224, height: 792, label: "B1" }]), folder: "Plans" }], W.ess);
      const loaded = await loadPages(tok(W.ess), base, project.uuid, [[files["B1.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      const [sheet] = await preparedSheets(tok(W.ess), base, project.uuid, loaded.body.files[0].file_uuid);
      const item = await callAs(token, "POST", `${base}/${project.uuid}/takeoff/item`, {
        name: "Wall", type: "lf", unit: "LF", sheet_uuid: sheet.uuid, color: "#1d4ed8",
        geometry: { geom_type: "lf", vertices_json: [[0.1, 0.5], [0.4, 0.5]], shape_meta: { closed: false }, client_uuid: crypto.randomUUID() },
      });
      expect(item.status === 201, `item: ${item.status} ${said(item)}`);
      Object.assign(essWorld, { base, project, sheet, item: item.body });
      const pro = await apiCall(staff, "PUT", `/api/platform/billing/comp/${W.pro}`, { plan: "professional", seats: 1 });
      expect(pro.status === 200, `comp Professional: ${pro.status} ${said(pro)}`);
      const ess = await apiCall(staff, "PUT", `/api/platform/billing/comp/${W.ess}`, { plan: "essentials", seats: 1 });
      expect(ess.status === 200, `comp Essentials: ${ess.status} ${said(ess)}`);
      const states = {};
      for (const [k, uuid] of Object.entries(W)) states[k] = (await callAs(token, "GET", `${ws(uuid)}/billing`)).body;
      expect(states.expired.state === "trial_ended", `EXPIRED ${states.expired.state}`);
      expect(states.pro.state === "comp" && states.pro.plan === "professional", `PRO ${states.pro.state} ${states.pro.plan}`);
      expect(states.ess.state === "comp" && states.ess.plan === "essentials", `ESS ${states.ess.state} ${states.ess.plan}`);
      return Object.entries(states).map(([k, b]) => `${k} ${b.state}/${b.plan}`).join(", ");
    },
  },
  {
    title: "expired trial: the api refuses a new project; Billing says the trial ended; Start subscription on Professional opens the fake's Checkout for this workspace; Cancel comes back; Pay makes it Professional and a project can be made",
    run: async ({ page }) => {
      const refused = await callAs(token, "POST", `${ws(W.expired)}/project`, { name: "After the trial" });
      expect(refused.status === 403, `a project after the trial: ${refused.status} ${said(refused)}`);
      await as(page, W.expired, "/settings/billing");
      const card = page.locator("[data-billing-state]");
      await card.waitFor({ timeout: 20000 });
      const state = await card.getAttribute("data-billing-state");
      expect(state === "trial_ended", `Billing state ${state}`);
      const status = ((await card.locator("[data-billing-status]").textContent()) ?? "").trim();
      const start = page.locator(`[data-plan-card="professional"]`).getByRole("button", { name: "Start subscription" });
      await start.click();
      await page.waitForURL(/localhost:12112\/checkout\/cs_/, { timeout: 30000 });
      await page.getByRole("heading", { name: "Bench Checkout (Stripe fake)" }).waitFor();
      const lines = (await page.locator("li").allTextContents()).map((t) => t.trim());
      expect(lines.some((l) => /price_bench_professional_monthly × 1/.test(l)), `Checkout lines ${lines.join(" | ")}`);
      const id = /checkout\/(cs_\w+)/.exec(page.url())[1];
      const session = await fakeGet(page, `/_fake/sessions/${id}`);
      const meta = JSON.stringify(session.subscription_data ?? session.metadata ?? {});
      expect(meta.includes(W.expired), `the session does not name the workspace: ${JSON.stringify(session).slice(0, 600)}`);
      expect(session.mode === "subscription" && session.status === "open", `session ${session.mode} ${session.status}`);
      // Cancel on the fake's page: back to Billing, which says Checkout was cancelled.
      await page.getByRole("link", { name: "Cancel" }).click();
      await page.waitForURL(/\/settings\/billing\?checkout=cancelled/, { timeout: 30000 });
      const back = page.locator(`[data-checkout="cancelled"]`);
      await back.waitFor({ timeout: 20000 });
      const backText = ((await back.textContent()) ?? "").trim();
      // Checkout again, and Pay: the fake's webhook reaches the fx api, the trial becomes Professional.
      await page.locator(`[data-plan-card="professional"]`).getByRole("button", { name: "Start subscription" }).click();
      await page.waitForURL(/localhost:12112\/checkout\/cs_/, { timeout: 30000 });
      const paidId = /checkout\/(cs_\w+)/.exec(page.url())[1];
      await page.getByRole("button", { name: "Pay" }).click();
      await page.waitForURL(/\/settings\/billing/, { timeout: 30000 });
      let billing = null;
      const until = Date.now() + 30000;
      while (Date.now() < until) {
        billing = (await callAs(token, "GET", `${ws(W.expired)}/billing`)).body;
        if (billing?.state === "active") break;
        await page.waitForTimeout(500);
      }
      expect(billing?.state === "active" && billing?.plan === "professional", `after Pay: ${JSON.stringify(billing).slice(0, 300)}`);
      await page.reload();
      await page.locator(`[data-billing-state="active"]`).waitFor({ timeout: 20000 });
      const plan = await page.locator("[data-billing-plan]").getAttribute("data-billing-plan");
      expect(plan === "professional", `Billing shows plan ${plan}`);
      const project = await callAs(token, "POST", `${ws(W.expired)}/project`, { name: "After paying" });
      expect(project.status === 201 || project.status === 200, `a project after paying: ${project.status} ${said(project)}`);
      return `refused ${refused.status}; Billing "${status}"; Checkout ${id}: ${lines.join(", ")}; open, for this workspace; Cancel: "${backText}"; paid ${paidId}: Billing active, Professional; a project made ${project.status}`;
    },
  },
  {
    title: "seats: PRO (one seat, the owner's) refuses an Estimator invite with the seats-full notice and a Billing link; a Viewer, who uses no seat, is invited",
    run: async ({ page }) => {
      const seats = (await callAs(token, "GET", `${ws(W.pro)}/billing/seats`)).body;
      expect(seats.used === 1 && seats.limit === 1, `seats ${JSON.stringify(seats)}`);
      await as(page, W.pro, "/settings/billing");
      await page.locator(`[data-billing-plan="professional"]`).waitFor({ timeout: 20000 });
      const shownSeats = await page.locator("[data-billing-seats]").getAttribute("data-billing-seats");
      await page.goto(`${APP}/settings/members`);
      const email = page.locator("#invite-email");
      await email.waitFor({ timeout: 20000 });
      await email.fill(`c30-seat-${Date.now()}@example.com`);
      await page.locator("#invite-role").selectOption("estimator");
      await page.getByRole("button", { name: "Invite", exact: true }).click();
      const full = page.locator("[data-seats-full]");
      await full.waitFor({ timeout: 15000 });
      const notice = ((await full.textContent()) ?? "").trim();
      expect((await full.getByRole("link", { name: "Billing" }).count()) === 1, `notice without a Billing link: "${notice}"`);
      const viewer = await callAs(token, "POST", `${ws(W.pro)}/invitation`, { email: `c30-viewer-${Date.now()}@example.com`, role: "viewer" });
      expect(viewer.status === 201 || viewer.status === 200, `a viewer invite: ${viewer.status} ${said(viewer)}`);
      return `seats ${seats.used}/${seats.limit} (Billing shows ${shownSeats}); "${notice}"; viewer invited`;
    },
  },
  {
    title: "trial caps: CAPPED (tier 3) shows Trial limits on Billing; one project fills the cap and a second is refused",
    run: async ({ page }) => {
      const first = await callAs(token, "POST", `${ws(W.capped)}/project`, { name: "Capped one" });
      expect(first.status === 201, `the first project: ${first.status} ${said(first)}`);
      const second = await callAs(token, "POST", `${ws(W.capped)}/project`, { name: "Capped two" });
      expect(second.status >= 400 && second.status < 500, `the second project: ${second.status} ${said(second)}`);
      await as(page, W.capped, "/settings/billing");
      const caps = page.locator("[data-trial-caps]");
      await caps.waitFor({ timeout: 20000 });
      const projects = ((await caps.locator(`[data-trial-cap="projects"]`).textContent()) ?? "").trim();
      expect(/^1 of 1$/.test(projects), `Projects cap reads "${projects}"`);
      const rows = (await caps.locator("dd").allTextContents()).map((t) => t.trim());
      return `projects "${projects}"; caps ${rows.join(", ")}; the second project refused ${second.status}: ${said(second).slice(0, 160)}`;
    },
  },
  {
    title: "AI pack: on PRO, AI Credits' Buy now on the 1,000 pack opens the fake's Checkout in payment mode for that pack; Pay lands 1,000 purchased credits; a trial workspace's Buy is refused",
    run: async ({ page }) => {
      await as(page, W.pro, "/settings/ai-credits");
      const pack = page.locator(`[data-ai-pack="1000"]`);
      await pack.waitFor({ timeout: 20000 });
      await pack.getByRole("button", { name: "Buy now" }).click();
      await page.waitForURL(/localhost:12112\/checkout\/cs_/, { timeout: 30000 });
      const lines = (await page.locator("li").allTextContents()).map((t) => t.trim());
      expect(lines.some((l) => /price_bench_pack_1000 × 1/.test(l)), `Checkout lines ${lines.join(" | ")}`);
      const id = /checkout\/(cs_\w+)/.exec(page.url())[1];
      const session = await fakeGet(page, `/_fake/sessions/${id}`);
      expect(session.mode === "payment" && JSON.stringify(session.metadata ?? {}).includes(W.pro), `session ${JSON.stringify(session).slice(0, 500)}`);
      // Pay: the pack's credits land on the purchased balance.
      const before = Number((await callAs(token, "GET", `${ws(W.pro)}/ai/credits`)).body?.balance?.purchased ?? 0);
      await page.getByRole("button", { name: "Pay" }).click();
      await page.waitForURL(/localhost:5176/, { timeout: 30000 });
      let after = before;
      const until = Date.now() + 30000;
      while (Date.now() < until) {
        after = Number((await callAs(token, "GET", `${ws(W.pro)}/ai/credits`)).body?.balance?.purchased ?? 0);
        if (after > before) break;
        await page.waitForTimeout(500);
      }
      expect(after - before === 1000, `purchased credits ${before} then ${after}`);
      const packs = (await callAs(token, "GET", `${ws(W.capped)}/ai/packs`)).body;
      const packUuid = Array.isArray(packs) ? packs.find((p) => p.credits === 1000)?.uuid : undefined;
      const refused = packUuid ? await callAs(token, "POST", `${ws(W.capped)}/billing/topup`, { pack: packUuid }) : null;
      expect(!refused || refused.status === 403, `a trial's pack: ${refused?.status} ${refused && said(refused)}`);
      return `Checkout ${id}: ${lines.join(", ")}, payment mode; paid: purchased credits ${before} to ${after}; trial's Buy ${refused ? `${refused.status} "${refused.body?.detail ?? said(refused)}"` : "not tried (no pack list)"}`;
    },
  },
  {
    title: "portal: on PRO (comped, subscribed; Buy now made its Stripe customer), Manage billing opens the fake's portal; Return to IntelCost comes back to Billing",
    run: async ({ page }) => {
      await as(page, W.pro, "/settings/billing");
      const manage = page.getByRole("button", { name: "Manage billing" });
      await manage.waitFor({ timeout: 20000 }).catch(async () => {
        const b = (await callAs(token, "GET", `${ws(W.pro)}/billing`)).body;
        throw new Error(`no Manage billing; api: state ${b?.state}, can_manage ${b?.can_manage}, can_open_portal ${b?.can_open_portal}, can_subscribe ${b?.can_subscribe}`);
      });
      await manage.click();
      await page.waitForURL(/localhost:12112\/portal\/bps_/, { timeout: 30000 });
      await page.getByRole("heading", { name: "Bench billing portal (Stripe fake)" }).waitFor();
      const body = ((await page.locator("body").textContent()) ?? "").replace(/\s+/g, " ");
      await page.getByRole("link", { name: "Return to IntelCost" }).click();
      await page.waitForURL(/\/settings\/billing/, { timeout: 30000 });
      await page.locator("[data-billing-state]").waitFor({ timeout: 20000 });
      return `portal reads "${body.slice(0, 120)}"; returned to Billing`;
    },
  },
  {
    title: "comp Essentials: ESS's Estimating says editing is not included; the api refuses a measurement and a rate with the plan's words, not the role's",
    run: async ({ page }) => {
      const { base, project, sheet, item } = essWorld;
      const caps = (await callAs(token, "GET", `${ws(W.ess)}/capability`)).body;
      const drawn = await callAs(token, "POST", `${base}/${project.uuid}/takeoff/item`, {
        name: "Another", type: "lf", unit: "LF", sheet_uuid: sheet.uuid, color: "#1d4ed8",
        geometry: { geom_type: "lf", vertices_json: [[0.1, 0.6], [0.4, 0.6]], shape_meta: { closed: false }, client_uuid: crypto.randomUUID() },
      });
      expect(drawn.status === 403 && said(drawn).includes(TAKEOFF_PLAN_LOCKED), `a measurement: ${drawn.status} ${said(drawn)}`);
      const priced = await callAs(token, "PATCH", `${base}/${project.uuid}/estimate/costs`, { lines: [{ item_uuid: item.uuid, changes: { unit_material_cost: 5 } }] });
      expect(priced.status === 403 && said(priced).includes(ESTIMATES_PLAN_LOCKED), `a rate: ${priced.status} ${said(priced)}`);
      await signInAs(page, ownerOf(W.ess));
      await enterWorkspace(page, W.ess);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating`);
      const banner = page.locator("[data-plan-view-only]").first();
      await banner.waitFor({ timeout: 30000 });
      const text = ((await banner.textContent()) ?? "").trim();
      expect(text === ESTIMATES_PLAN_LOCKED, `the banner reads "${text}"`);
      expect((await page.locator(`[data-rate="Unit Material Cost for Wall"]`).count()) === 0 || (await page.locator(`[data-rate="Unit Material Cost for Wall"]`).isDisabled()), "Wall's material rate is editable on Essentials");
      return `capabilities edit takeoff ${caps?.capabilities?.canEditTakeoff}; measurement 403 "${drawn.body?.detail}"; rate 403 "${priced.body?.detail}"; banner "${text}"`;
    },
  },
]);

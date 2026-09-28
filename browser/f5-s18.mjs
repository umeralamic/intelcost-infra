// F5-S18: a platform admin's controls (F3-S4 AC6, carried to F5).
//
//   ./browser/f5-s18.sh      (from intelcost-infra/; regress.sh runs it too)
//
// The measure tools are the first takeoff control to ask `can("canEditTakeoff")`, and so
// the first screen that shows a platform admin's unmasked map (D-23). The spec names a
// collaborator-plan workspace, but the plan is a constant `pro` until F16, so no
// workspace reaches that mask end to end. An expired trial masks `canEditTakeoff` the
// same way and reads a real column, so it stands in: the resolver applies both masks in
// one place (`resolve`), and a platform admin skips both.
//
// Two passes with one database step between them, as f3-s2's: nothing in the product
// ages a trial or makes someone staff.
//
//   SETUP=1 pass    makes LOCKED (to be expired) and OPEN (a live trial), each with a
//                   scaled one-sheet project; seats STAFF (takeoff) in LOCKED and VIEWER
//                   in OPEN; prints them and exits
//   database        LOCKED's trial ends yesterday; STAFF becomes a platform admin
//   main pass       the four people below

import { APP, apiCall, apiLogin, enterWorkspace, expect, fixtureOwner, openBrowser, ownWorkspace, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { armMeasure, sheetPoint } from "./lib/takeoff.mjs";

const PASSWORD = "bench-password-1";
const TOOLS = ["Scale", "Linear", "Area", "Count"];

/** A workspace with one scaled landscape sheet, ready to measure on. */
async function scaledSheet(name) {
  const { token, workspace, base } = await ownWorkspace(`${name} ${Date.now()}`);
  const project = await makeProject(token, base, { name });
  const browser = await openBrowser();
  try {
    const page = await (await browser.newContext()).newPage();
    const files = await uploadAll(page, token, base, project.uuid, [
      { name: "S18.pdf", buffer: makePdf([{ width: 1224, height: 792, label: "S18" }]), folder: "Plans" },
    ], workspace.uuid);
    const loaded = await loadPages(token, base, project.uuid, [[files["S18.pdf"].uuid, [1]]]);
    expect(loaded.status === 200, `loading: ${loaded.status}`);
    const [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
    const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, {
      feet_per_pt: 1 / 6, label: `1/8" = 1'-0"`, unit: "ft",
    });
    expect(scaled.status === 200, `scale: ${scaled.status} ${JSON.stringify(scaled.body)}`);
    return `${workspace.uuid}/${project.uuid}/${sheet.uuid}`;
  } finally {
    await browser.close();
  }
}

if (process.env.SETUP === "1") {
  const owner = await fixtureOwner();
  const locked = await scaledSheet("S18 Locked");
  const open = await scaledSheet("S18 Open");
  const staff = await seatedMember(owner.token, locked.split("/")[0], "takeoff", "s18-staff");
  const viewer = await seatedMember(owner.token, open.split("/")[0], "viewer", "s18-viewer");
  console.log(`OWNER=${owner.email}`);
  console.log(`LOCKED=${locked}`);
  console.log(`OPEN=${open}`);
  console.log(`STAFF=${staff.email}`);
  console.log(`VIEWER=${viewer.email}`);
  process.exit(0);
}

for (const key of ["FX_OWNER", "LOCKED", "OPEN", "STAFF", "VIEWER"]) {
  if (!process.env[key]) {
    console.error(`Run the SETUP pass first; ${key} is missing. See the header.`);
    process.exit(2);
  }
}
const place = (value) => {
  const [workspace, project, sheet] = value.split("/");
  return { workspace, project, sheet, base: `/api/workspace/${workspace}/project/${project}` };
};
const LOCKED = place(process.env.LOCKED);
const OPEN = place(process.env.OPEN);

const tool = (page, label) => page.getByRole("group", { name: "Takeoff tools" }).getByRole("button", { name: label, exact: true });

/** Open the sheet as `email`, and wait for the api's answer on what they may do: until
 *  it lands every gate reads false, so a "disabled" seen earlier would prove nothing. */
async function openAs(page, email, at) {
  await signInAs(page, email, PASSWORD);
  await enterWorkspace(page, at.workspace);
  const answered = page.waitForResponse((r) => r.url().includes(`/workspace/${at.workspace}/capability`) && r.ok(), { timeout: 20000 });
  await page.goto(`${APP}/project/${at.project}/takeoff/${at.sheet}`);
  const caps = await (await answered).json();
  await page.locator('img[alt="Drawing sheet"]').waitFor({ timeout: 20000 });
  await page.locator("[data-canvas-scale]").waitFor({ timeout: 20000 });
  return caps;
}

/** An enabled tool gives no view-only reason. Scale, legacy's dropdown button, carries its
 *  own title ("Scale — No scale"), which is not a reason. */
const noReason = (state) => !state.reason?.startsWith("View only");

/** Each measure tool: enabled, and whether it says why not. The reason is the title of
 *  what the pointer lands on over the button: a disabled button takes no pointer events,
 *  so a title on the button itself would never show. */
async function toolStates(page) {
  const out = {};
  for (const label of [...TOOLS, "Select"]) {
    const button = tool(page, label);
    const box = await button.boundingBox();
    const reason = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("[title]")?.getAttribute("title") ?? null, [box.x + box.width / 2, box.y + box.height / 2]);
    out[label] = { enabled: await button.isEnabled(), reason };
  }
  return out;
}

const itemCount = async (token, at) => (await apiCall(token, "GET", `${at.base}/takeoff/item?sheet_uuid=${at.sheet}`)).body.length;

/** Draw a two-point Linear run through the screen, as a person would. */
async function drawRun(page) {
  await armMeasure(page, "Linear");
  const a = await sheetPoint(page, 0.2, 0.4);
  const b = await sheetPoint(page, 0.5, 0.4);
  await page.mouse.click(a.x, a.y);
  await page.mouse.dblclick(b.x, b.y);
}

const owner = await fixtureOwner();

await run("f5-s18", [
  {
    title: "Control: the owner in a live workspace measures; every tool is enabled",
    run: async ({ page }) => {
      const caps = await openAs(page, owner.email, OPEN);
      expect(caps.capabilities.canEditTakeoff === true, "the owner's map says no canEditTakeoff");
      const states = await toolStates(page);
      expect(TOOLS.every((t) => states[t].enabled && noReason(states[t])), `tools ${JSON.stringify(states)}`);
      return `canEditTakeoff true · ${TOOLS.join(", ")} enabled`;
    },
  },
  {
    title: "A viewer sees the measure tools disabled, each saying why; Select stays; the api refuses a hand-written item",
    run: async ({ page }) => {
      const caps = await openAs(page, process.env.VIEWER, OPEN);
      expect(caps.role === "viewer" && caps.capabilities.canEditTakeoff === false, `role ${caps.role}, canEditTakeoff ${caps.capabilities.canEditTakeoff}`);
      const states = await toolStates(page);
      expect(TOOLS.every((t) => !states[t].enabled && states[t].reason?.startsWith("View only")), `tools ${JSON.stringify(states)}`);
      expect(states.Select.enabled, "Select disabled for a viewer");
      // The empty panel does not tell someone who may only look to pick a tool.
      await page.getByText("Measurements appear here as your team draws them.").waitFor({ timeout: 5000 });
      const viewer = await apiLogin(process.env.VIEWER, PASSWORD);
      const refused = await apiCall(viewer, "POST", `${OPEN.base}/takeoff/item`, {
        name: "Viewer run", type: "lf", unit: "LF", sheet_uuid: OPEN.sheet,
        geometry: { geom_type: "lf", vertices_json: [[0.1, 0.5], [0.3, 0.5]], shape_meta: null, client_uuid: crypto.randomUUID() },
      });
      expect(refused.status === 403, `the api answered the viewer's item ${refused.status}`);
      return `${TOOLS.join(", ")} disabled: "${states.Linear.reason}" · Select enabled · the empty panel says "Measurements appear here as your team draws them." · POST item → 403`;
    },
  },
  {
    title: "The owner of a locked workspace (trial expired) is masked: the measure tools are disabled, and the api agrees",
    run: async ({ page }) => {
      const caps = await openAs(page, owner.email, LOCKED);
      expect(caps.role === "owner" && caps.is_platform_admin === false, `role ${caps.role}, staff ${caps.is_platform_admin}`);
      expect(caps.capabilities.canEditTakeoff === false, "an expired trial left the owner canEditTakeoff");
      const states = await toolStates(page);
      expect(TOOLS.every((t) => !states[t].enabled), `tools ${JSON.stringify(states)}`);
      const refused = await apiCall(owner.token, "POST", `${LOCKED.base}/takeoff/item`, {
        name: "Owner run", type: "lf", unit: "LF", sheet_uuid: LOCKED.sheet,
        geometry: { geom_type: "lf", vertices_json: [[0.1, 0.5], [0.3, 0.5]], shape_meta: null, client_uuid: crypto.randomUUID() },
      });
      expect(refused.status === 403, `the api answered the masked owner's item ${refused.status}`);
      return `owner, trial expired: canEditTakeoff false · ${TOOLS.join(", ")} disabled · POST item → 403`;
    },
  },
  {
    title: "F3-S4 AC6: a platform admin in the same locked workspace sees the measure tools enabled, and measures",
    run: async ({ page }) => {
      const caps = await openAs(page, process.env.STAFF, LOCKED);
      expect(caps.is_platform_admin === true && caps.is_workspace_admin === false, `staff ${caps.is_platform_admin}, workspace admin ${caps.is_workspace_admin}`);
      expect(caps.capabilities.canEditTakeoff === true, "the platform admin's map was masked");
      const states = await toolStates(page);
      expect(TOOLS.every((t) => states[t].enabled && noReason(states[t])), `tools ${JSON.stringify(states)}`);
      const staff = await apiLogin(process.env.STAFF, PASSWORD);
      const before = await itemCount(staff, LOCKED);
      await drawRun(page);
      const after = await waitFor(async () => {
        const now = await itemCount(staff, LOCKED);
        return now > before ? now : null;
      }, "the platform admin's run to be saved", 10000);
      expect(after === before + 1, `items ${before} → ${after}`);
      return `role takeoff, platform admin: canEditTakeoff true · ${TOOLS.join(", ")} enabled · drew a Linear run, saved (${before} → ${after} items)`;
    },
  },
]);

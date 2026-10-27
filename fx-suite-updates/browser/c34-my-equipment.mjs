// C34, My equipment (F34, D-759, D-760), built the night of 2026-10-24: the workspace's list of
// machines first in suggestions, "Show my equipment only" with the full library one click away,
// and hiding never changing a price.
//
//   ./fx-suite.sh run c34-my-equipment
//
// The world: one throwaway workspace with a project holding one shared machine (EX-CRAWL-20T, 40
// machine-hours on a count item) and a TEST diesel price of $6.276/gal (the quantity table's), so
// the machine has a total to compare; a second throwaway person, an estimator, with "Manage
// workspace library" turned off for the role.
//
// Left for the founder's eye: the look of the list, the toggle and the starting-list dialog.

import { APP, apiCall, apiLogin, apiRegister, expect, fixtureOwner, invite, inviteTokenFromMail, apiAccept, run, signInAs, stamp } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("C34 My equipment");
const project = await makeProject(token, base, { name: "My equipment check" });
const lib = `/api/workspace/${workspace.uuid}/equipment-library`;
const estimate = `${base}/${project.uuid}/estimate`;
let sheet;
let item;
let resource;
const PASSWORD = "bench-password-1";
const reader = { email: `fx.c34-reader.${stamp()}@bench.intelcost.io` };

const bundle = async () => (await apiCall(token, "GET", `${lib}/bundle`)).body;
/** The estimate's Equipment total as Estimating shows it (the shared machine is all of it). */
async function machineTotal(page) {
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.sheet_uuid}?tab=estimating`);
  const row = page.getByRole("radiogroup", { name: "Reports" }).getByRole("radio").filter({ hasText: /^Equipment/ });
  await row.filter({ hasText: /\$[0-9]/ }).waitFor({ timeout: 30000 });
  // The total moves while the estimate's reads land (a day's rent before the usage hours): read
  // it once every read is in (D-796).
  await page.locator("[data-estimating][data-estimate-ready]").waitFor({ timeout: 60000 });
  return (await row.innerText()).replace(/\s+/g, " ").replace(/^Equipment\s*/, "");
}

async function openLibrary(page, email = null) {
  await signInAs(page, email ?? (await fixtureOwner()).email, PASSWORD);
  await page.goto(`${APP}/settings/equipment`);
  await page.locator("[data-suggest-mode]").waitFor({ timeout: 30000 });
}

let priced = null;

await run("c34-my-equipment", [
  {
    title: "setup: a project with a shared EX-CRAWL-20T on a count item; a TEST diesel price; the list empty, every class offered",
    run: async () => {
      const fuel = await apiCall(token, "PUT", `${lib}/override`, { entity: "setting", entity_key: "fuel_price_diesel", field: "value", value_num: 6.276, note: "TEST fuel price (c34)" });
      expect(fuel.status === 200, `fuel: ${fuel.status} ${JSON.stringify(fuel.body)}`);
      const s = await apiCall(token, "POST", `${base}/${project.uuid}/drawing/sheet/new`, { name: "TEST blank", width_in: 36, height_in: 24 });
      expect(s.status === 201, `sheet: ${s.status}`);
      sheet = s.body;
      const nodes = (await apiCall(token, "GET", `/api/workspace/${workspace.uuid}/classification?system=csi`)).body;
      const div31 = nodes.find((n) => n.code === "31");
      const made = await apiCall(token, "POST", `${base}/${project.uuid}/takeoff/item`, { name: "TEST cut", type: "count", unit: "EA", sheet_uuid: sheet.sheet_uuid, classification_ref_id: div31.uuid });
      expect(made.status === 201, `item: ${made.status} ${JSON.stringify(made.body)}`);
      item = made.body;
      const r = await apiCall(token, "POST", `${estimate}/equipment`, { name: "TEST excavator 20T", home_classification_uuid: div31.uuid, eq_class_key: "EX-CRAWL-20T", eq_units: 1, eq_mode: "rental", eq_period: "auto" });
      expect(r.status === 201, `resource: ${r.status} ${JSON.stringify(r.body)}`);
      resource = r.body.detail;
      const used = await apiCall(token, "PUT", `${estimate}/equipment-usage`, [{ resource_uuid: resource, item_uuid: item.uuid, usage_hours_override: 40 }]);
      expect(used.status === 200, `usage: ${used.status} ${JSON.stringify(used.body)}`);
      const b = await bundle();
      expect(b.classes.length === 628 && b.my_equipment.length === 0 && b.mine_only === false, `bundle: ${b.classes.length} classes, list ${b.my_equipment.length}, mine_only ${b.mine_only}`);
      return `sheet ${sheet.sheet_uuid.slice(0, 8)}, item ${item.uuid.slice(0, 8)}, resource ${resource.slice(0, 8)}; 628 classes, list empty, show all`;
    },
  },
  {
    title: "Settings › Equipment library: three machines ticked \"On my list\" (two in the grid, one in the class detail) → \"My equipment (3)\"; it survives a reload",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email, PASSWORD);
      // Two opens of Estimating before the list changes: the first is the project's first ever.
      const firstOpen = await machineTotal(page);
      priced = await machineTotal(page);
      expect(firstOpen === priced, `Estimating's first open showed ${firstOpen}, the next ${priced}`);
      await page.goto(`${APP}/settings/equipment`);
      await page.locator("[data-suggest-mode]").waitFor({ timeout: 30000 });
      await page.getByRole("button", { name: "Earthwork", exact: true }).click();
      await page.getByRole("button", { name: /^Hydraulic excavator/ }).click();
      await page.locator("[data-class-grid]").waitFor();
      await page.locator('[data-on-my-list="EX-CRAWL-17T"]').check();
      await page.locator('[data-on-my-list="EX-CRAWL-30T"]').check();
      await page.locator('[data-class-row="EX-CRAWL-50T"] td').first().click();
      await page.locator('[data-class-detail="EX-CRAWL-50T"] [data-on-my-list]').check();
      await page.locator("[data-my-equipment-filter]").filter({ hasText: "(3)" }).waitFor({ timeout: 15000 });
      await page.reload();
      await page.locator("[data-my-equipment-filter]").filter({ hasText: "(3)" }).waitFor({ timeout: 30000 });
      const list = (await bundle()).my_equipment.sort();
      expect(JSON.stringify(list) === JSON.stringify(["EX-CRAWL-17T", "EX-CRAWL-30T", "EX-CRAWL-50T"]), `list ${list}`);
      return `list ${list.join(", ")}; Estimating's Equipment total ${priced}`;
    },
  },
  {
    title: "the first switch to \"Show my equipment only\" offers the classes in use (EX-CRAWL-20T, 1 in estimates) for review; saved, the mode is mine-only",
    run: async ({ page }) => {
      await openLibrary(page);
      await page.getByRole("radio", { name: "Show my equipment only" }).click();
      const review = page.locator("[data-starting-list]");
      await review.waitFor();
      const ex20 = review.locator('[data-starting-row="EX-CRAWL-20T"]');
      await ex20.waitFor({ timeout: 15000 });
      const said = (await ex20.innerText()).replace(/\s+/g, " ");
      expect(/1 in estimates/.test(said), `EX-CRAWL-20T row: "${said}"`);
      const rows = await review.locator("[data-starting-row]").count();
      await page.getByRole("button", { name: /^Save \d+ machines and show my equipment only$/ }).click();
      await review.waitFor({ state: "detached" });
      await page.locator('[data-suggest-mode="mine"]').waitFor();
      const b = await bundle();
      expect(b.mine_only && b.starting_list_offered && b.my_equipment.includes("EX-CRAWL-20T"), `bundle mode ${b.mine_only}, offered ${b.starting_list_offered}`);
      return `${rows} rows offered; EX-CRAWL-20T "${said}"; saved ${b.my_equipment.length} on the list, mine-only`;
    },
  },
  {
    title: "bulk \"Take all off\" for Hydraulic excavator warns that 1 of them is used in estimates and keeps pricing; the shared machine's total is unchanged",
    run: async ({ page }) => {
      await openLibrary(page);
      await page.getByRole("button", { name: "Earthwork", exact: true }).click();
      await page.getByRole("button", { name: /^Hydraulic excavator/ }).click();
      const scope = page.locator('[data-bulk-scope="Hydraulic excavator"]');
      await scope.getByRole("button", { name: "Take all off" }).click();
      const ask = page.getByRole("dialog", { name: /Take Hydraulic excavator off my list/ });
      await ask.waitFor();
      const said = (await ask.innerText()).replace(/\s+/g, " ");
      expect(said.includes("1 of these is used in estimates; they keep pricing."), `warning: "${said}"`);
      await ask.getByRole("button", { name: "Take them off" }).click();
      await ask.waitFor({ state: "detached" });
      await scope.filter({ hasText: "0 of" }).waitFor({ timeout: 15000 });
      const after = await machineTotal(page);
      expect(after === priced, `Equipment was ${priced}, now ${after}`);
      return `warning "${said.slice(0, 140)}"; Equipment ${priced} → ${after}`;
    },
  },
  {
    title: "the Equipment component in mine-only mode offers the list only, \"Search the full library\" reaches the rest, and \"Add to my equipment\" adds a picked one",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email, PASSWORD);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.sheet_uuid}?tab=estimating`);
      await page.getByText("TEST cut", { exact: true }).first().click({ button: "right" });
      await page.getByRole("menuitem", { name: "Add cost component" }).hover();
      await page.getByRole("menuitem", { name: "Equipment" }).click();
      const dialog = page.getByRole("dialog").last();
      await dialog.waitFor();
      const fromLib = dialog.getByRole("button", { name: "From library" });
      if (await fromLib.count()) await fromLib.click();
      const picker = page.locator("[data-equipment-picker]");
      await picker.waitFor({ timeout: 30000 });
      const want = (await bundle()).my_equipment.length;
      const mine = await page.locator("[data-my-equipment-list] [data-class]").count();
      expect(mine === Math.min(want, 200), `My equipment lists ${mine}, the list holds ${want}`);
      expect((await page.locator("[data-library-list]").count()) === 0, "the full library shows before it is asked for");
      await page.locator("[data-full-library]").click();
      await picker.getByLabel("Search equipment").fill("loader wheel");
      const first = page.locator("[data-library-list] [data-class]").first();
      await first.waitFor();
      const key = await first.getAttribute("data-class");
      await first.locator("input").check();
      await page.locator(`[data-add-to-mine="${key}"] button`).click();
      await waitFor(async () => (await bundle()).my_equipment.includes(key), `${key} on the list`, 15000, 300);
      await dialog.getByRole("button", { name: "Cancel" }).click();
      return `My equipment ${mine} of ${want}; full library folded; added ${key} from the component`;
    },
  },
  {
    title: "an estimator without \"Manage workspace library\" sees the list but no checkboxes or bulk bar, the toggle disabled with \"ask a workspace admin\"; the api refuses the write (403)",
    run: async ({ page }) => {
      await apiRegister(reader.email, PASSWORD, "C34 Reader");
      await invite(token, workspace.uuid, reader.email, "estimator");
      const inviteToken = await inviteTokenFromMail(reader.email, { timeout: 30000 });
      const rt = await apiLogin(reader.email, PASSWORD);
      const accepted = await apiAccept(rt, inviteToken);
      expect(accepted.status === 200, `accept: ${accepted.status}`);
      const off = await apiCall(token, "PUT", `/api/workspace/${workspace.uuid}/override/estimator`, { capabilities: { canManageWorkspaceLibrary: false } });
      expect(off.status === 200, `role override: ${off.status} ${JSON.stringify(off.body)}`);
      await openLibrary(page, reader.email);
      const mode = (await page.locator("[data-suggest-mode]").innerText()).replace(/\s+/g, " ");
      expect(/ask a workspace admin/.test(mode), `toggle: "${mode}"`);
      const disabled = await page.getByRole("radio").evaluateAll((els) => els.every((e) => e.disabled));
      await page.locator("[data-my-equipment-filter]").click();
      await page.locator("[data-class-grid]").waitFor();
      const boxes = await page.locator("[data-on-my-list]").count();
      const bulk = await page.locator("[data-bulk-on-list]").count();
      const write = await apiCall(rt, "POST", `${lib}/my-equipment/add`, { keys: ["EX-CRAWL-20T"] });
      expect(disabled && boxes === 0 && bulk === 0 && write.status === 403, `disabled ${disabled}, boxes ${boxes}, bulk ${bulk}, write ${write.status}`);
      return `toggle "${mode}"; radios disabled; 0 checkboxes; no bulk bar; write ${write.status}`;
    },
  },
  {
    title: "an earthwork activity off \"Show in suggestions\": its own line role reads \"(not in suggestions)\", no other role offers it; the shared machine still prices the same",
    run: async ({ page }) => {
      await openLibrary(page);
      await page.getByRole("tab", { name: "Earthwork production" }).click();
      await page.locator("[data-activity]").first().waitFor({ timeout: 30000 });
      const cfg = (await apiCall(token, "GET", `${lib}/earthwork-production`)).body;
      const a2 = cfg.activities.find((a) => a.national_key === "A2");
      await page.locator(`[data-in-suggestions="${a2.name}"]`).uncheck();
      await page.locator(`[data-line-map="undercut"] option`).filter({ hasText: "(not in suggestions)" }).waitFor({ state: "attached", timeout: 15000 });
      const own = await page.locator('[data-line-map="undercut"] select option').evaluateAll((els) => els.map((e) => e.textContent));
      const cut = await page.locator('[data-line-map="cut"] select option').evaluateAll((els) => els.map((e) => e.textContent));
      expect(own[0] === `Starter: ${a2.name} (not in suggestions)`, `undercut: ${own[0]}`);
      expect(!cut.some((t) => t.includes(a2.name)), `cut offers ${a2.name}`);
      const total = await machineTotal(page);
      expect(total === priced, `Equipment was ${priced}, now ${total}`);
      return `undercut "${own[0]}"; cut does not offer it; Equipment ${total}`;
    },
  },
]);

// C38, cost components, shared equipment and assemblies as the equipment library changed them, built
// after the archive (night brief 2026-10-24, Part 2 item 3):
// - D-750: Shared equipment's Name searches the library; picking a machine makes the resource a
//   library shared machine with its name filled;
// - D-742 / D-743: Save as assembly keeps an item's library component (its class, never a rate) and the
//   shared machine it draws on (by name); applied in another project, the component comes with its
//   class and a machine of that name is made there;
// - D-747: the assembly's crew row with no rate at the target project (no saved wage set) is marked
//   rate_missing and reads "Missing data: wage for <role>", never $0;
// - D-746: a Site Feature takes no cost component (409 "Price the lines under this feature instead").
//
//   ./fx-suite.sh run c38-components-assemblies
//
// The world: one throwaway workspace with two projects ("C38 source", "C38 target"), each one blank
// page, count items in division 31 and, in the source, a 10 × 10 ft area made a Site Feature.
//
// Left for the founder's eye: the template editor's rows ("library EX-CRAWL-20T, shared: …").

// Shared equipment and Equipment settings open from the table toolbar's Setup menu (D-766 F2).
import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("C38 Components");
const source = await makeProject(token, base, { name: "C38 source" });
const target = await makeProject(token, base, { name: "C38 target" });
const ws = `/api/workspace/${workspace.uuid}`;
const w = {};
let div31;
let assembly;

async function world(project, items) {
  const s = await apiCall(token, "POST", `${base}/${project.uuid}/drawing/sheet/new`, { name: "TEST blank", width_in: 36, height_in: 24 });
  expect(s.status === 201, `sheet: ${s.status}`);
  const out = { sheet: s.body.sheet_uuid };
  for (const name of items) {
    const made = await apiCall(token, "POST", `${base}/${project.uuid}/takeoff/item`, { name, type: "count", unit: "EA", sheet_uuid: out.sheet, classification_ref_id: div31.uuid });
    expect(made.status === 201, `${name}: ${made.status}`);
    out[name] = made.body;
  }
  return out;
}
const resources = async (project) => (await apiCall(token, "GET", `${base}/${project.uuid}/estimate/equipment`)).body.resources;
const components = async (project) => (await apiCall(token, "GET", `${base}/${project.uuid}/estimate/components`)).body;

await run("c38-components-assemblies", [
  {
    title: "setup: two projects with count items in division 31; the source item carries a library Equipment component, a crew from the Wage Calculator's crafts, and draws on a shared library machine",
    run: async () => {
      div31 = (await apiCall(token, "GET", `${ws}/classification?system=csi`)).body.find((n) => n.code === "31");
      w.source = await world(source, ["TEST pad"]);
      w.target = await world(target, ["TEST pad 2"]);
      const pad = w.source["TEST pad"];
      const eq = await apiCall(token, "POST", `${base}/${source.uuid}/estimate/components`, { item_uuid: pad.uuid, kind: "equipment", name: "Hydraulic excavator 20-25 t", pricing_mode: "lump", eq_class_key: "EX-CRAWL-20T", eq_mode: "rental", eq_period: "auto", eq_units: 1 });
      expect(eq.status === 201, `equipment component: ${eq.status} ${JSON.stringify(eq.body).slice(0, 200)}`);
      const crew = await apiCall(token, "POST", `${base}/${source.uuid}/estimate/components`, { item_uuid: pad.uuid, kind: "labor", name: "TEST crew", pricing_mode: "unit", crew: [{ role: "Laborer", count: 2, hourly_wage: 0, craft_code: "CC-16", rate_source: "wage_set" }], production_rate: 10, production_basis: "units_per_hr" });
      expect(crew.status === 201, `labor component: ${crew.status} ${JSON.stringify(crew.body).slice(0, 200)}`);
      const r = await apiCall(token, "POST", `${base}/${source.uuid}/estimate/equipment`, { name: "TEST shared loader", home_classification_uuid: div31.uuid, eq_class_key: "WL-MINI-07Y", eq_units: 1, eq_mode: "owned", eq_period: "hr" });
      expect(r.status === 201, `shared machine: ${r.status}`);
      const used = await apiCall(token, "PUT", `${base}/${source.uuid}/estimate/equipment-usage`, [{ resource_uuid: r.body.detail, item_uuid: pad.uuid, usage_hours_override: 16 }]);
      expect(used.status === 200, `usage: ${used.status}`);
      return "source: EX-CRAWL-20T component, Laborer crew, TEST shared loader (WL-MINI-07Y) 16 hr";
    },
  },
  {
    title: "D-742 / D-743: Save as assembly keeps the library component's class (no rate) and the shared machine by name; applied in the target, the component keeps EX-CRAWL-20T and a machine \"TEST shared loader\" is made there of WL-MINI-07Y",
    run: async () => {
      const saved = await apiCall(token, "POST", `${ws}/assembly/from-item`, { project_uuid: source.uuid, item_uuid: w.source["TEST pad"].uuid, name: `C38 pad ${Date.now()}` });
      expect(saved.status === 201, `save as assembly: ${saved.status} ${JSON.stringify(saved.body).slice(0, 300)}`);
      assembly = saved.body;
      const comps = JSON.stringify(saved.body);
      expect(comps.includes("EX-CRAWL-20T"), "the assembly lost the component's class");
      expect(comps.includes("TEST shared loader"), "the assembly lost the shared machine link");
      const applied = await apiCall(token, "POST", `${ws}/assembly/${assembly.uuid}/apply`, { project_uuid: target.uuid, item_uuid: w.target["TEST pad 2"].uuid });
      expect(applied.status === 200, `apply: ${applied.status} ${JSON.stringify(applied.body)}`);
      expect(applied.body.components_copied >= 2, `components copied ${applied.body.components_copied}`);
      expect(applied.body.equipment_created.includes("TEST shared loader"), `machines made ${JSON.stringify(applied.body.equipment_created)}`);
      const made = (await resources(target)).find((x) => x.name === "TEST shared loader");
      expect(made?.eq_class_key === "WL-MINI-07Y", `target machine ${JSON.stringify(made)}`);
      const eq = (await components(target)).find((c) => c.kind === "equipment" && c.item_uuid === w.target["TEST pad 2"].uuid);
      expect(eq?.eq_class_key === "EX-CRAWL-20T", `target component ${JSON.stringify(eq)?.slice(0, 200)}`);
      return `copied ${applied.body.components_copied}; made ${applied.body.equipment_created.join(", ")} (${made.eq_class_key}); component ${eq.eq_class_key}; warnings ${JSON.stringify(applied.body.warnings)}`;
    },
  },
  {
    title: "D-747: in the target (no saved wage set) the assembly's Laborer row is rate_missing, and Estimating reads \"Missing data: wage for Laborer\", never $0",
    run: async ({ page }) => {
      const labor = (await components(target)).find((c) => c.kind === "labor" && c.item_uuid === w.target["TEST pad 2"].uuid);
      const row = labor?.crew?.find((r) => r.role === "Laborer");
      expect(row?.rate_missing === true && !row.hourly_wage, `crew row ${JSON.stringify(row)}`);
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${target.uuid}/takeoff/${w.target.sheet}?tab=estimating`);
      await page.getByText("TEST pad 2", { exact: true }).first().waitFor({ timeout: 30000 });
      // The row's Needs attention marker names the reasons (D-747 lists the wage as missing data).
      let seen = "";
      const said = await waitFor(async () => {
        seen = await page.evaluate(() => [...document.querySelectorAll("tr")].filter((tr) => tr.textContent?.includes("TEST pad 2")).flatMap((tr) => [...tr.querySelectorAll("[aria-label],[title]")].map((e) => e.getAttribute("aria-label") ?? e.getAttribute("title"))).join(" | "));
        return /wage for Laborer/i.test(seen) ? seen.match(/[^|]*wage for Laborer[^|]*/i)[0].trim() : null;
      }, "the Needs attention reason", 20000, 500).catch(() => { throw new Error(`row labels: ${seen}`); });
      return `crew row rate_missing; "${said}"`;
    },
  },
  {
    title: "D-746: a Site Feature takes no cost component: 409 \"Price the lines under this feature instead\"",
    run: async () => {
      const area = await apiCall(token, "POST", `${base}/${source.uuid}/takeoff/item`, { name: "TEST pad area", type: "sf", unit: "SF", sheet_uuid: w.source.sheet, geometry: { geom_type: "sf", vertices_json: [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2], [0.1, 0.2]], shape_meta: { closed: true }, client_uuid: crypto.randomUUID() } });
      expect(area.status === 201, `area: ${area.status}`);
      const feature = await apiCall(token, "POST", `${base}/${source.uuid}/takeoff/item/${area.body.uuid}/site-feature`, { name: "TEST Building Pad", color: "#8B5E3C", role_depth_ft: 0.5 });
      expect(feature.status === 201, `site feature: ${feature.status} ${JSON.stringify(feature.body).slice(0, 200)}`);
      const refused = await apiCall(token, "POST", `${base}/${source.uuid}/estimate/components`, { item_uuid: feature.body.uuid, kind: "material", name: "TEST", pricing_mode: "unit", unit_price: 10 });
      expect(refused.status === 409 && /Price the lines under this feature instead/.test(JSON.stringify(refused.body)), `component on a Site Feature: ${refused.status} ${JSON.stringify(refused.body)}`);
      return `${refused.status} "${refused.body.detail}"`;
    },
  },
  {
    title: "D-750: Shared equipment › New resource: Name searches the library; picking WL-MINI-07Y fills the name and makes it a library shared machine",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${target.uuid}/takeoff/${w.target.sheet}?tab=estimating`);
      await page.getByText("TEST pad 2", { exact: true }).first().waitFor({ timeout: 30000 });
      await page.locator('[data-setup-line="setup:shared"]').click(); // D-777: the sidebar's Setup
      const dialog = page.getByRole("dialog", { name: "Shared equipment" });
      await dialog.waitFor();
      await dialog.getByRole("button", { name: /New resource/ }).click();
      await dialog.getByLabel("Resource name").fill("loader wheel 0.5");
      await page.locator('[data-name-options] [data-name-option="WL-MINI-07Y"]').click();
      const name = await dialog.getByLabel("Resource name").inputValue();
      await dialog.locator("[data-name-source]").filter({ hasText: "WL-MINI-07Y" }).waitFor();
      const home = dialog.getByRole("combobox", { name: "Home division" }).or(dialog.getByLabel("Home division")).first();
      await home.click();
      await page.getByRole("option").filter({ hasText: /^31/ }).first().click();
      const before = (await resources(target)).length;
      await dialog.getByRole("button", { name: "Create resource", exact: true }).click();
      const made = await waitFor(async () => {
        const list = await resources(target);
        return list.length > before ? list.find((r) => r.name === name) : null;
      }, "the new resource", 15000, 300);
      expect(made?.eq_class_key === "WL-MINI-07Y" && Number(made.eq_units) === 1, `made ${JSON.stringify(made)?.slice(0, 200)}`);
      return `name "${name}"; saved as ${made.eq_class_key}, ${made.eq_units} machine, ${made.eq_mode ?? "default"} mode`;
    },
  },
]);

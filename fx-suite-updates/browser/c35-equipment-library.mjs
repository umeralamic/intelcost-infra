// C35, the equipment library (F33) as an estimate meets it, built after the archive (night brief
// 2026-10-24, Part 2 item 3): the engine and its period solver with overtime (D-730..D-738, D-751's
// worked check), a hired operated machine's mob in its hourly rate and an assembled crane's required
// quote (D-756), a shared machine's missing data flagged on every line it serves (D-756), typed own
// values on a library machine (D-758), and a Company rates import whose empty cells leave the value
// and whose "national" cells revert it (D-745).
//
//   ./fx-suite.sh run c35-equipment-library
//
// The world: one throwaway workspace with a TEST diesel price of $6.276/gal (the quantity table's),
// a project with one blank page and five count items in division 31, and shared machines with usage
// hours typed on the items:
// - EX-CRAWL-30T, one machine on a 10-hour day, 100 hr on "TEST E": by hand (the D-751 check) 2
//   weeks $8,038.00 + overtime 20 hr $2,009.50 + fuel 100 × 4.5 × 6.276 = $2,824.20 + mob
//   $3,600.00 = $16,471.70;
// - DT-OP-3AXLE operated, 100 hr on "TEST E": 100 × $106.14 = $10,614.00, mob in the hourly rate;
// - CR-HYD-165T-OP operated, 6 + 4 hr on "TEST A" and "TEST B": missing its mob quote (both lines
//   flagged); with a TEST quote of $6,000, 10 × $520 + $6,000 = $11,200.00;
// - WT-4000 rental, 24 + 16 hr on "TEST C" and "TEST D": no fuel burn and no mob in the catalog,
//   so both lines stay flagged.
// The import: EX-CRAWL-20T with company values day $1,000 and week $3,000 (TEST), then a workbook
// whose Day cell is empty, Week says "national" and 4 weeks is 9,000.
//
// Left for the founder's eye: the dialog's layout; the export's look in Excel.

// Shared equipment and Equipment settings open from the table toolbar's Setup menu (D-766 F2).
import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { writeWorkbook } from "./lib/xlsx-write.mjs";

const { token, workspace, base } = await freshWorkspace("C35 Equipment library");
const project = await makeProject(token, base, { name: "Equipment library check" });
const lib = `/api/workspace/${workspace.uuid}/equipment-library`;
const estimate = `${base}/${project.uuid}/estimate`;
const PASSWORD = "bench-password-1";
let sheet;
let div31;
const items = {};
const res = {};

async function shared(key, body, usage) {
  const r = await apiCall(token, "POST", `${estimate}/equipment`, { home_classification_uuid: div31.uuid, eq_class_key: key, eq_units: 1, eq_period: "auto", ...body });
  expect(r.status === 201, `${key}: ${r.status} ${JSON.stringify(r.body)}`);
  res[key] = r.body.detail;
  const rows = Object.entries(usage).map(([name, hours]) => ({ resource_uuid: r.body.detail, item_uuid: items[name].uuid, usage_hours_override: hours }));
  const used = await apiCall(token, "PUT", `${estimate}/equipment-usage`, rows);
  expect(used.status === 200, `usage ${key}: ${used.status} ${JSON.stringify(used.body)}`);
}

async function openEstimate(page) {
  await signInAs(page, (await fixtureOwner()).email, PASSWORD);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.sheet_uuid}?tab=estimating`);
  await page.getByText("TEST E", { exact: true }).first().waitFor({ timeout: 30000 });
}

/** Shared equipment's list: each machine's name and total as the dialog lists it. */
async function sharedList(page) {
  await (async () => { await page.getByRole("button", { name: "Setup", exact: true }).click(); await page.getByRole("menuitem", { name: /^Shared equipment$/ }).click(); })();
  const dialog = page.getByRole("dialog", { name: "Shared equipment" });
  await dialog.waitFor();
  await page.waitForTimeout(1500);
  const rows = await dialog.locator("button").filter({ has: page.locator("div.truncate") }).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, " ").trim()));
  return { dialog, rows };
}

/** The Estimating row of an item, as text. */
const rowText = async (page, name) => (await page.getByRole("row").filter({ has: page.getByText(name, { exact: true }) }).first().innerText()).replace(/\s+/g, " ");

await run("c35-equipment-library", [
  {
    title: "setup: a TEST diesel price, five count items in division 31, four shared library machines with usage hours",
    run: async () => {
      const fuel = await apiCall(token, "PUT", `${lib}/override`, { entity: "setting", entity_key: "fuel_price_diesel", field: "value", value_num: 6.276, note: "TEST fuel price (c35)" });
      expect(fuel.status === 200, `fuel: ${fuel.status}`);
      const s = await apiCall(token, "POST", `${base}/${project.uuid}/drawing/sheet/new`, { name: "TEST blank", width_in: 36, height_in: 24 });
      expect(s.status === 201, `sheet: ${s.status}`);
      sheet = s.body;
      div31 = (await apiCall(token, "GET", `/api/workspace/${workspace.uuid}/classification?system=csi`)).body.find((n) => n.code === "31");
      for (const name of ["TEST A", "TEST B", "TEST C", "TEST D", "TEST E"]) {
        const made = await apiCall(token, "POST", `${base}/${project.uuid}/takeoff/item`, { name, type: "count", unit: "EA", sheet_uuid: sheet.sheet_uuid, classification_ref_id: div31.uuid });
        expect(made.status === 201, `${name}: ${made.status}`);
        items[name] = made.body;
      }
      await shared("EX-CRAWL-30T", { name: "TEST excavator 30T", eq_mode: "rental", eq_hours_per_day: 10 }, { "TEST E": 100 });
      await shared("DT-OP-3AXLE", { name: "TEST tri-axle operated", eq_mode: "operated", eq_period: "hr" }, { "TEST E": 100 });
      await shared("CR-HYD-165T-OP", { name: "TEST assembled crane", eq_mode: "operated", eq_period: "hr" }, { "TEST A": 6, "TEST B": 4 });
      await shared("WT-4000", { name: "TEST water truck", eq_mode: "rental" }, { "TEST C": 24, "TEST D": 16 });
      const b = (await apiCall(token, "GET", `${lib}/bundle`)).body;
      expect(b.classes.length === 628 && b.release === 2, `bundle: ${b.classes.length} classes, release ${b.release}`);
      return `628 classes, release 2; ${Object.keys(res).length} shared machines`;
    },
  },
  {
    title: "the engine through Shared equipment: EX-CRAWL-30T at 100 hr on a 10-hour day = $16,471.70 (2 weeks, overtime, fuel, mob); DT-OP-3AXLE 100 hr operated = $10,614.00, mob in the hourly rate",
    run: async ({ page }) => {
      await openEstimate(page);
      const { dialog, rows } = await sharedList(page);
      const ex = rows.find((r) => r.startsWith("TEST excavator 30T"));
      const dt = rows.find((r) => r.startsWith("TEST tri-axle operated"));
      expect(ex?.includes("$16,471.70"), `excavator: "${ex}"`);
      expect(dt?.includes("$10,614.00"), `tri-axle: "${dt}"`);
      await dialog.getByRole("button").filter({ hasText: "TEST excavator 30T" }).first().click();
      const exLine = (await dialog.locator("[data-library-priced]").innerText()).replace(/\s+/g, " ");
      expect(/Rental 2 weeks/.test(exLine) && exLine.includes("$16,471.70"), `excavator breakdown: "${exLine}"`);
      await dialog.getByRole("button").filter({ hasText: "TEST tri-axle operated" }).first().click();
      const dtLine = (await dialog.locator("[data-library-priced]").innerText()).replace(/\s+/g, " ");
      expect(dtLine.includes("mob/demob in the hourly rate"), `tri-axle breakdown: "${dtLine}"`);
      return `"${exLine.slice(0, 160)}" | "${dtLine.slice(0, 120)}"`;
    },
  },
  {
    title: "a shared machine short of data flags every line it serves: the assembled crane (no mob quote) on TEST A and B, the water truck (no fuel burn, no mob) on TEST C and D",
    run: async ({ page }) => {
      await openEstimate(page);
      const out = [];
      for (const name of ["TEST A", "TEST B", "TEST C", "TEST D"]) {
        const t = await waitFor(async () => {
          const s = await rowText(page, name);
          return /Missing data/.test(s) ? s : null;
        }, `${name} flagged`, 20000, 500);
        out.push(`${name}: ${t.slice(0, 60)}`);
      }
      const e = await rowText(page, "TEST E");
      expect(!/Missing data/.test(e), `TEST E flagged: ${e}`);
      return out.join(" | ");
    },
  },
  {
    title: "a typed mob/demob quote on the crane (D-758: own values over the library) prices it: 10 hr × $520 + $6,000 = $11,200.00; its lines are no longer flagged",
    run: async ({ page }) => {
      await openEstimate(page);
      const { dialog } = await sharedList(page);
      await dialog.getByRole("button").filter({ hasText: "TEST assembled crane" }).first().click();
      await dialog.locator('[data-own="mob_quote"]').fill("6000");
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await waitFor(async () => {
        const st = (await apiCall(token, "GET", `${estimate}/equipment`)).body.resources.find((r) => r.uuid === res["CR-HYD-165T-OP"]);
        return st?.eq_snapshot?.own?.mob_quote === 6000;
      }, "the quote saved", 15000, 300);
      await page.reload();
      await page.getByText("TEST E", { exact: true }).first().waitFor({ timeout: 30000 });
      const { rows } = await sharedList(page);
      const crane = rows.find((r) => r.startsWith("TEST assembled crane"));
      expect(crane?.includes("$11,200.00"), `crane: "${crane}"`);
      await page.keyboard.press("Escape");
      for (const name of ["TEST A", "TEST B"]) {
        const t = await rowText(page, name);
        expect(!/Missing data/.test(t), `${name} still flagged: ${t}`);
      }
      return `crane "${crane}"; TEST A and B clear`;
    },
  },
  {
    title: "a Company rates workbook: an empty Day leaves the company's $1,000, Week \"national\" reverts the $3,000, 4 weeks 9,000 is set (D-745)",
    run: async ({ page }) => {
      for (const [field, v] of [["rent_day", 1000], ["rent_week", 3000]]) {
        const set = await apiCall(token, "PUT", `${lib}/override`, { entity: "class", entity_key: "EX-CRAWL-20T", field, value_num: v, note: "TEST company value (c35)" });
        expect(set.status === 200, `${field}: ${set.status}`);
      }
      const book = writeWorkbook([
        ["Company rates", [["Key", "Type", "Size", "Day", "Week", "4 weeks"], ["EX-CRAWL-20T", "Hydraulic excavator", "20-25 t", null, "national", 9000]]],
        ["Machine list", [["Name", "Owned $/hr (no fuel)", "Fuel gal/hr", "Day", "Week", "4 weeks"]]],
      ]);
      await signInAs(page, (await fixtureOwner()).email, PASSWORD);
      await page.goto(`${APP}/settings/equipment`);
      await page.getByRole("button", { name: "Import…" }).click();
      const dialog = page.getByRole("dialog", { name: "Import company rates" });
      await dialog.locator('input[type="file"]').setInputFiles({ name: "TEST rates.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: book });
      const diff = dialog.locator("[data-import-diff]");
      await diff.waitFor({ timeout: 15000 });
      const said = (await diff.innerText()).replace(/\s+/g, " ");
      expect(/1 changed, 1 back to national/.test(said), `diff: "${said}"`);
      await dialog.getByRole("button", { name: "Apply" }).click();
      await dialog.waitFor({ state: "detached", timeout: 15000 });
      const ovs = (await apiCall(token, "GET", `${lib}/bundle`)).body.overrides.filter((o) => o.entity === "class" && o.entity_key === "EX-CRAWL-20T" && o.scope === "workspace");
      const by = Object.fromEntries(ovs.map((o) => [o.field, o.value_num]));
      expect(by.rent_day === 1000 && by.rent_week === undefined && by.rent_4wk === 9000, `after: ${JSON.stringify(by)}`);
      return `diff "${said.slice(0, 200)}"; after ${JSON.stringify(by)}`;
    },
  },
]);

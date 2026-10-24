// C37, the Wage Calculator's role rates (D-753 option C), built after the archive (night brief
// 2026-10-24, Part 2 item 3): a role a wage determination lists is priced at its own line, floor
// against market, under the project's policy; without a line, Grade checker is the Equipment
// Operator rate and Pipelayer the Laborer rate (option B); a Foreman is paid over its crew.
//
//   ./fx-suite.sh run c37-wage-roles
//
// The world: one throwaway workspace and a Public, Davis-Bacon project at ZIP 72601 (Harrison,
// Boone County, AR), as D-753's check "zz WD check (D-753)" was. Its Wage Calculator reads the
// public determination AR20260046 (Arkansas, Heavy; a copy in ./lib/wd/ar46.txt, from the api's
// engine tests), which lists LABORER: PIPELAYER $12.56 + 1.19 and LABORER: COMMON OR GENERAL
// $12.50 + 1.18, and saves the rates. A labour component on a count item then takes the starter's
// crew rows (Laborer, Pipelayer, Grade checker, Foreman), which the api prices on save.
// D-753's figures ("higher of"): Laborer $37.26; Pipelayer floor $17.00, market $37.26 × 12.56 ÷
// 12.50 = $37.44, priced $37.44; Grade checker = Equipment Operator (no line); Foreman = the crew's
// highest-paid other craft × 1.10.
//
// Left for the founder's eye: the Wage Calculator's screens (c31 drives them), the crew table.

import { readFileSync } from "node:fs";

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("C37 Wage roles");
const project = await makeProject(token, base, { name: "Wage roles" });
const wage = `${base}/${project.uuid}/wage-calculator`;
const estimate = `${base}/${project.uuid}/estimate`;
const AR46 = readFileSync(new URL("./lib/wd/ar46.txt", import.meta.url));
let sheet;
let item;
const cents = (x) => Math.round(Number(x) * 100);

async function openCalculator(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.sheet_uuid}?tab=estimating&pane=wage`);
  await page.locator("[data-wage-calculator]").waitFor({ timeout: 30000 });
  await page.getByRole("region", { name: "Project info" }).waitFor();
}

await run("c37-wage-roles", [
  {
    title: "setup: a Public, Davis-Bacon project at 72601 (Boone County, AR) with a blank page and a count item",
    run: async () => {
      const patched = await apiCall(token, "PATCH", `${base}/${project.uuid}`, { project_type: "public", wage_determination: "prevailing_federal", labor_pricing_basis: "burdened", postal_code: "72601", county: "Boone", state: "AR", city: "Harrison" });
      expect(patched.status === 200, `project: ${patched.status} ${JSON.stringify(patched.body)}`);
      const ctx = await apiCall(token, "GET", `${wage}/context`);
      expect(ctx.body?.location?.zip === "72601", `location: ${JSON.stringify(ctx.body?.location)}`);
      const s = await apiCall(token, "POST", `${base}/${project.uuid}/drawing/sheet/new`, { name: "TEST blank", width_in: 36, height_in: 24 });
      expect(s.status === 201, `sheet: ${s.status}`);
      sheet = s.body;
      const div31 = (await apiCall(token, "GET", `/api/workspace/${workspace.uuid}/classification?system=csi`)).body.find((n) => n.code === "31");
      const made = await apiCall(token, "POST", `${base}/${project.uuid}/takeoff/item`, { name: "TEST pipe", type: "count", unit: "EA", sheet_uuid: sheet.sheet_uuid, classification_ref_id: div31.uuid });
      expect(made.status === 201, `item: ${made.status}`);
      item = made.body;
      return `location ${ctx.body.location.zip} ${ctx.body.location.county ?? ""}`;
    },
  },
  {
    title: "My wage data, Upload file: AR20260046 is read with LABORER: PIPELAYER and COMMON OR GENERAL; Calculate and Save rates to project",
    run: async ({ page }) => {
      await openCalculator(page);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByRole("radiogroup", { name: "Wage basis" }).getByRole("radio").filter({ hasText: "My wage data" }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      const data = page.getByRole("region", { name: "Wage data" });
      await data.waitFor();
      await data.getByRole("tab", { name: "Upload file" }).click();
      const [response] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith(`/project/${project.uuid}/wage-calculator/wd`) && r.request().method() === "POST", { timeout: 60000 }),
        data.getByLabel("Wage determination file").setInputFiles({ name: "ar46.txt", mimeType: "text/plain", buffer: AR46 }),
      ]);
      expect(response.status() === 200 || response.status() === 201, `upload: ${response.status()}`);
      const parse = await response.json();
      const names = parse.classifications.map((c) => c.classification ?? c.name ?? "").join(" | ");
      expect(/PIPELAYER/.test(names) && /COMMON OR GENERAL/.test(names), `classifications: ${names.slice(0, 300)}`);
      const laborer = parse.mapping.find((m) => m.craft_name === "Laborer");
      expect(laborer?.classification === "LABORER:  COMMON OR GENERAL" || /COMMON OR GENERAL/.test(laborer?.classification ?? ""), `Laborer mapped to ${laborer?.classification}`);
      for (const id of ["U-02", "U-03"]) {
        const ask = data.locator(`[data-msg="${id}"]`);
        if (await ask.isVisible().catch(() => false)) await ask.getByRole("button").filter({ hasNotText: "Upload another" }).first().click();
      }
      // The data step goes on to review with Continue ("Continue anyway" when it asks about unmatched rows).
      await data.getByRole("button", { name: /^Continue( anyway)?$/ }).last().click();
      const anyway = data.getByRole("button", { name: "Continue anyway" });
      if (await anyway.isVisible().catch(() => false)) await anyway.click();
      await page.locator("[data-craft-table] tr[data-craft]").first().waitFor({ timeout: 30000 });
      await page.getByRole("button", { name: "Save rates to project", exact: true }).click();
      const confirm = page.getByRole("dialog").filter({ hasText: /labor rates\?/ });
      const toast = page.getByText("Labor rates saved to Wage roles.").first();
      await Promise.race([toast.waitFor({ timeout: 30000 }).catch(() => undefined), confirm.waitFor({ timeout: 30000 }).catch(() => undefined)]);
      if (await confirm.isVisible().catch(() => false)) await confirm.getByRole("button", { name: /^(Recalculate|Continue|Save)$/ }).click();
      await toast.waitFor({ timeout: 30000 });
      const current = await apiCall(token, "GET", `${wage}/wage-set/current`);
      expect(current.status === 200 && current.body?.wage_set, `current: ${current.status}`);
      return `${parse.header?.wd_number}: ${parse.classifications.length} classifications; Laborer → ${laborer.classification}; saved`;
    },
  },
  {
    title: "the crew's roles priced on save: Laborer $37.26; Pipelayer $37.44 (its own line, market × 12.56 ÷ 12.50); Grade checker at Equipment Operator; Foreman over the crew × 1.10",
    run: async () => {
      const cfg = (await apiCall(token, "GET", `/api/workspace/${workspace.uuid}/equipment-library/earthwork-production`)).body;
      const rows = cfg.activities.flatMap((a) => a.tiers).flatMap((t) => t.crew);
      const take = (re) => {
        const r = rows.find((c) => re.test(c.role) && !/\(/.test(c.role));
        expect(r, `no starter crew row for ${re}`);
        const { for_machine: _m, ...rest } = r;
        return { ...rest, count: 1, hourly_wage: 0 };
      };
      const crew = [take(/^Laborer$/), take(/^Pipelayer$/), take(/^Grade checker$/), take(/^Foreman$/)];
      const made = await apiCall(token, "POST", `${estimate}/components`, { item_uuid: item.uuid, kind: "labor", name: "TEST pipe crew", pricing_mode: "unit", crew, production_rate: 10, production_basis: "units_per_hr" });
      expect(made.status === 201, `component: ${made.status} ${JSON.stringify(made.body).slice(0, 300)}`);
      const priced = await waitFor(async () => {
        const list = (await apiCall(token, "GET", `${estimate}/components`)).body;
        const c = list.find((x) => x.uuid === made.body.uuid);
        return c?.crew?.every((r) => r.hourly_wage > 0) ? c : null;
      }, "the crew priced", 15000, 500).catch(() => made.body);
      const by = Object.fromEntries(priced.crew.map((r) => [r.role, r.hourly_wage]));
      const set = (await apiCall(token, "GET", `${wage}/wage-set/current/detail`)).body;
      const eo = JSON.stringify(set).match(/"Equipment Operator"[^}]*?"(?:rate|hourly|total)[a-z_]*":\s*([0-9.]+)/)?.[1];
      expect(cents(by.Laborer) === 3726, `Laborer ${by.Laborer}`);
      expect(cents(by.Pipelayer) === 3744, `Pipelayer ${by.Pipelayer}`);
      if (eo) expect(cents(by["Grade checker"]) === cents(eo), `Grade checker ${by["Grade checker"]}, Equipment Operator ${eo}`);
      const top = Math.max(by.Laborer, by.Pipelayer, by["Grade checker"]);
      expect(Math.abs(by.Foreman - top * 1.1) <= 0.011, `Foreman ${by.Foreman}, top other ${top} × 1.10 = ${(top * 1.1).toFixed(2)}`);
      return `Laborer $${by.Laborer}, Pipelayer $${by.Pipelayer}, Grade checker $${by["Grade checker"]}${eo ? ` (EO ${eo})` : ""}, Foreman $${by.Foreman}`;
    },
  },
]);

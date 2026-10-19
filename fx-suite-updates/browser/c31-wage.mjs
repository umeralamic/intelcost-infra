// C31, the founder's click check of the Wage Calculator (F20, BUILD_BRIEF.md; spec.md's acceptance
// table): (1) Location-Adjusted Rates (the basis once called National Average), Calculate, Save;
// (2) ZIP 6604 reads as 06604, Bridgeport, CT; (4) uploading tx115.txt reads 26 classifications;
// (6) Direct Labor saves a "Labor burden" line, its rate shown to 2 decimals; (7) a typed Laborer
// rate of $60 is offered again on the same pricing basis only.
//
//   node fx-run-locked.mjs c31-wage
//
// The world: one throwaway workspace and a Commercial project with one landscape page, so the
// Estimating tab (where the bid summary shows the Labor burden line) can open. tx115.txt is the
// public federal wage determination TX20260115 (Andrews County, Building) that the api's engine
// tests use; a copy sits in ./lib/wd/ because the suite's browser container sees only this folder.
//
// Left for the founder's eye: the words and layout of each screen, the crew table, Advanced
// settings, and steps 3, 5 and 8 to 11 of the brief's list, which this file does not drive (county
// pick, Jefferson County factors, U-06 / U-08 PDF paths, Caddo Parish, R-01 / R-03 notes).

import { readFileSync } from "node:fs";

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";

const W = 1224;
const H = 792;
const { token, workspace, base } = await freshWorkspace("C31 Wage");
const project = await makeProject(token, base, { name: "Wage one" });
const wage = `${base}/${project.uuid}/wage-calculator`;
const estimate = `${base}/${project.uuid}/estimate`;
let sheet;
const TX115 = readFileSync(new URL("./lib/wd/tx115.txt", import.meta.url));

const num = (s) => Number(String(s).replace(/[^0-9.-]/g, ""));

/** The calculator straight on its sheet's address: `/project/:id/wage-calculator` redirects to the
 *  takeoff, which then redirects again to the sheet, and each hop remounts the calculator under a
 *  hand that is typing. Signs in once per step (`again` skips it). */
async function openCalculator(page, again = false) {
  if (!again) await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating&pane=wage`);
  await page.locator("[data-wage-calculator]").waitFor({ timeout: 30000 });
  await page.getByRole("region", { name: "Project info" }).waitFor();
}

/** Project info, a select row: Edit (when set), pick, Save, and wait for the saved value. */
async function setInfo(page, label, option) {
  const row = page.locator(`[data-info-row="${label}"]`);
  const edit = row.getByRole("button", { name: "Edit", exact: true });
  if (await edit.isVisible().catch(() => false)) await edit.click();
  await row.getByRole("combobox", { name: label }).or(row.getByLabel(label, { exact: true })).first().selectOption({ label: option });
  await row.getByRole("button", { name: "Save", exact: true }).click();
  await row.getByText(option, { exact: true }).waitFor({ timeout: 10000 });
}

/** Continue, the basis card, Calculate: the review's craft table up. */
async function calculate(page, card = "Location-Adjusted Rates") {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const basis = page.getByRole("radiogroup", { name: "Wage basis" });
  await basis.waitFor();
  await basis.getByRole("radio").filter({ hasText: card }).click();
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await page.locator("[data-craft-table] tr[data-craft]").first().waitFor({ timeout: 30000 });
}

/** Save rates to project, through whichever confirmation it asks; the S-01 toast. */
async function saveRates(page) {
  await page.getByRole("button", { name: "Save rates to project", exact: true }).click();
  const confirm = page.getByRole("dialog").filter({ hasText: /labor rates\?/ });
  const toast = page.getByText("Labor rates saved to Wage one.").first();
  // Whichever shows first; the other's wait is let go quietly.
  await Promise.race([toast.waitFor({ timeout: 30000 }).catch(() => undefined), confirm.waitFor({ timeout: 30000 }).catch(() => undefined)]);
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.getByRole("button", { name: /^(Recalculate|Continue|Save)$/ }).click();
  }
  await toast.waitFor({ timeout: 30000 });
}

const laborer = (page) => page.locator(`[data-craft-table] tr[data-craft="Laborer"]`);

await run("c31-wage", [
  {
    title: "setup: a Commercial project with one page, so its Estimating tab opens",
    run: async ({ page }) => {
      const typed = await apiCall(token, "PATCH", `${base}/${project.uuid}`, { project_type: "commercial" });
      expect(typed.status === 200, `project type: ${typed.status} ${JSON.stringify(typed.body)}`);
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "W1.pdf", buffer: makePdf([{ width: W, height: H, label: "W1" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["W1.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      expect(TX115.length > 10000, `tx115.txt is ${TX115.length} bytes`);
      return `Commercial; sheet ${sheet.uuid.slice(0, 8)}; tx115.txt ${TX115.length} bytes`;
    },
  },
  {
    title: "(1) Location-Adjusted Rates (once National Average) preselected, Calculate shows the craft rates, Save stores the set",
    run: async ({ page }) => {
      await openCalculator(page);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      const card = page.getByRole("radiogroup", { name: "Wage basis" }).getByRole("radio").filter({ hasText: "Location-Adjusted Rates" });
      await card.waitFor();
      expect((await card.getAttribute("aria-checked")) === "true", "Location-Adjusted Rates is not preselected");
      await page.getByRole("button", { name: "Calculate", exact: true }).click();
      await page.locator("[data-craft-table] tr[data-craft]").first().waitFor({ timeout: 30000 });
      const crafts = await page.locator("[data-craft-table] tr[data-craft]").count();
      const header = ((await page.locator("[data-review-header]").textContent()) ?? "").trim();
      const rate = num(await laborer(page).locator("[data-rate]").textContent());
      expect(crafts > 0 && rate > 0, `${crafts} crafts, Laborer ${rate}`);
      await saveRates(page);
      const current = await apiCall(token, "GET", `${wage}/wage-set/current`);
      expect(current.status === 200 && current.body?.wage_set?.basis === "national_average", `current: ${current.status} ${JSON.stringify(current.body?.wage_set)}`);
      return `${crafts} crafts, Laborer $${rate}; "${header}"; saved (basis ${current.body.wage_set.basis})`;
    },
  },
  {
    title: "(2) ZIP 6604 reads as ZIP 06604, Bridgeport, CT; Yes and Save put it on the project",
    run: async ({ page }) => {
      await openCalculator(page);
      const row = page.locator(`[data-info-row="Location"]`);
      await row.getByRole("button", { name: /^(Add ZIP|Edit)$/ }).click();
      const zip = row.getByLabel("ZIP", { exact: true });
      await zip.fill("6604");
      await zip.blur();
      const l02 = row.locator(`[data-msg="L-02"]`);
      await l02.waitFor({ timeout: 15000 });
      const said = ((await l02.locator("span").first().textContent()) ?? "").trim();
      expect(said === "We read this as ZIP 06604, Bridgeport, CT. Is that right?", `L-02: "${said}"`);
      await l02.getByRole("button", { name: "Yes", exact: true }).click();
      await row.getByRole("button", { name: "Save", exact: true }).click();
      const where = row.locator("[data-location]");
      await where.waitFor({ timeout: 15000 });
      const shown = ((await where.textContent()) ?? "").trim();
      expect(/^06604, Bridgeport, CT/.test(shown), `location shown "${shown}"`);
      return `"${said}"; shown "${shown}"`;
    },
  },
  {
    title: "(4) My wage data, Upload file: tx115.txt is read by the rules as TX20260115 with 26 classifications, no credit prompt",
    run: async ({ page }) => {
      await openCalculator(page);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      const basis = page.getByRole("radiogroup", { name: "Wage basis" });
      await basis.getByRole("radio").filter({ hasText: "My wage data" }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      const data = page.getByRole("region", { name: "Wage data" });
      await data.waitFor();
      await data.getByRole("tab", { name: "Upload file" }).click();
      const [response] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith(`/project/${project.uuid}/wage-calculator/wd`) && r.request().method() === "POST", { timeout: 60000 }),
        data.getByLabel("Wage determination file").setInputFiles({ name: "tx115.txt", mimeType: "text/plain", buffer: TX115 }),
      ]);
      expect(response.status() === 200 || response.status() === 201, `upload: ${response.status()} ${await response.text()}`);
      const parse = await response.json();
      const count = parse.classifications.length;
      expect(count === 26, `${count} classifications parsed`);
      expect(parse.parse_method === "rules", `parse method ${parse.parse_method}`);
      expect((await page.locator(`[data-msg="U-07"]`).count()) === 0, "a credit prompt (U-07) for a text file");
      await data.getByText(parse.header.wd_number ?? "TX20260115").first().waitFor({ timeout: 10000 });
      // The project is in Connecticut: U-02 (another county) and U-03 (another type) ask first.
      for (const id of ["U-02", "U-03"]) {
        const ask = data.locator(`[data-msg="${id}"]`);
        if (await ask.isVisible().catch(() => false)) await ask.getByRole("button").filter({ hasNotText: "Upload another" }).first().click();
      }
      await data.locator("table[data-mapping] tr[data-map-row]").first().waitFor({ timeout: 10000 });
      const matched = await data.locator("table[data-mapping] tr[data-map-row]").filter({ hasText: "Matched" }).count();
      return `${parse.header.wd_number}: ${count} classifications by the rules, no credit prompt; ${matched} crafts matched, ${parse.unmatched.length} other classifications`;
    },
  },
  {
    title: "(6) Direct Labor: D-01 gives the burden to 2 decimals; saved, the bid summary carries a Labor burden line shown as N.NN%",
    run: async ({ page }) => {
      await openCalculator(page);
      await setInfo(page, "Labor pricing basis", "Direct Labor (unburdened)");
      await calculate(page);
      const d01 = ((await page.locator(`[data-msg="D-01"]`).textContent()) ?? "").trim();
      const pct = /est\. (\d+\.\d+)%/.exec(d01)?.[1];
      expect(pct && /^\d+\.\d{2}$/.test(pct), `D-01: "${d01}"`);
      await saveRates(page);
      let line;
      await waitFor(async () => {
        const bid = await apiCall(token, "GET", `${estimate}/bid`);
        line = (bid.body?.extra ?? []).find((e) => e.source === "labor_burden");
        return line ? true : null;
      }, "the Labor burden line stored", 15000).catch(async () => {
        throw new Error(`no labor_burden line: ${JSON.stringify((await apiCall(token, "GET", `${estimate}/bid`)).body)}`);
      });
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating`);
      const show = page.getByRole("button", { name: "Show the sidebar", exact: true });
      await page.locator("aside[data-estimate-sidebar]").waitFor({ timeout: 30000 });
      if (await show.isVisible()) await show.click();
      const shown = page.locator("[data-bid-summary] [data-bid-line]").filter({ hasText: "Labor burden" });
      await shown.waitFor({ timeout: 15000 });
      const text = ((await shown.locator("dt").textContent()) ?? "").replace(/\s+/g, " ").trim();
      const rate = /Labor burden\s*(\d+(?:\.\d+)?)%/.exec(text)?.[1];
      expect(rate && /^\d+\.\d{2}$/.test(rate), `the line reads "${text}"`);
      expect(rate === pct, `the line's ${rate}% and D-01's ${pct}% differ`);
      return `D-01 est. ${pct}%; bid summary "${text}"; stored ${line.pct}`;
    },
  },
  {
    title: "(7) Laborer typed as $60 on Direct and saved: offered again (Your rate) on Direct, not on Burdened",
    run: async ({ page }) => {
      await openCalculator(page);
      await calculate(page);
      await laborer(page).getByRole("button", { name: "Set your rate for Laborer" }).click();
      const input = laborer(page).getByLabel("Your rate for Laborer", { exact: true });
      await input.fill("60");
      await input.press("Enter");
      await laborer(page).locator(`[data-tag="R-04"]`).waitFor({ timeout: 15000 });
      await waitFor(async () => (num(await laborer(page).locator("[data-rate]").textContent()) === 60 ? true : null), "Laborer $60.00", 15000);
      await saveRates(page);

      await openCalculator(page, true);
      await calculate(page);
      const again = num(await laborer(page).locator("[data-rate]").textContent());
      const tagged = await laborer(page).locator(`[data-tag="R-04"]`).count();
      expect(again === 60 && tagged === 1, `on Direct after a reload: Laborer ${again}, Your rate tags ${tagged}`);

      await openCalculator(page, true);
      await setInfo(page, "Labor pricing basis", "Burdened (fully loaded)");
      await calculate(page);
      const burdened = num(await laborer(page).locator("[data-rate]").textContent());
      const tagB = await laborer(page).locator(`[data-tag="R-04"]`).count();
      expect(burdened !== 60 && tagB === 0, `on Burdened: Laborer ${burdened}, Your rate tags ${tagB}`);

      await openCalculator(page, true);
      await setInfo(page, "Labor pricing basis", "Direct Labor (unburdened)");
      await calculate(page);
      const back = num(await laborer(page).locator("[data-rate]").textContent());
      expect(back === 60, `back on Direct: Laborer ${back}`);
      return `Direct: $60 Your rate (after a reload too); Burdened: $${burdened}, no Your rate; Direct again: $${back}`;
    },
  },
]);

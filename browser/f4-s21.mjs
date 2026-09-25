// F4-S21: the Location card on Project Home, edited in place. No map (D-28, P-17).
//
//   docker compose --profile browser run --rm browser node scripts/f4-s21.mjs

import { apiCall, expect, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openFiles } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S21 location");
const job = await makeProject(token, base, { name: "Location job" });
const qa = await seatedMember(token, workspace.uuid, "qa_pricing", "f4s21");

const card = (page) => page.locator("[data-location]");
const read = async () => (await apiCall(token, "GET", `${base}/${job.uuid}`)).body;

async function edit(page) {
  await card(page).locator("[data-location-text]").click();
  await card(page).getByRole("form", { name: "Edit location" }).waitFor();
}

await run("f4-s21", [
  {
    title: "AC1/AC4 — \"No address on file\"; enter a US address, State is a list; Save; a reload keeps it",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      const before = await card(page).locator("[data-location-text]").innerText();
      expect(before.trim() === "No address on file", `before: ${before}`);
      await edit(page);
      await card(page).getByLabel("Address line 1").fill("215 Maple St");
      await card(page).getByLabel("Address line 2").fill("Suite 4");
      await card(page).getByLabel("City").fill("Austin");
      await card(page).locator("#location-country").selectOption("US");
      const stateTag = await card(page).locator("#location-state").evaluate((el) => el.tagName);
      expect(stateTag === "SELECT", `State under US is a ${stateTag}`);
      await card(page).locator("#location-state").selectOption("TX");
      await card(page).getByLabel("Postal Code").fill("78701");
      await card(page).getByRole("button", { name: "Save" }).click();
      await card(page).getByRole("form").waitFor({ state: "detached" });
      await page.reload();
      const shown = (await card(page).locator("[data-location-text]").innerText()).trim();
      expect(shown === "215 Maple St · Suite 4 · Austin, TX · 78701 · United States", `shown: ${shown}`);
      const saved = await read();
      expect(saved.country === "US" && saved.state === "TX", `saved ${saved.country}/${saved.state}`);
      return shown;
    },
  },
  {
    title: "AC4 — another country: State becomes free text, and the US state is cleared",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await edit(page);
      await card(page).locator("#location-country").selectOption("CA");
      const tag = await card(page).locator("#location-state").evaluate((el) => el.tagName);
      const value = await card(page).locator("#location-state").inputValue();
      expect(tag === "INPUT" && value === "", `State is a ${tag} holding "${value}"`);
      await card(page).getByRole("button", { name: "Cancel" }).click();
      return "Canada: State / Region is free text, empty";
    },
  },
  {
    title: "AC2 — Cancel discards the draft",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await edit(page);
      await card(page).getByLabel("City").fill("Somewhere else");
      await card(page).getByRole("button", { name: "Cancel" }).click();
      const shown = await card(page).locator("[data-location-text]").innerText();
      expect(/Austin/.test(shown) && !/Somewhere/.test(shown), `after Cancel: ${shown}`);
      expect((await read()).city === "Austin", "the api changed");
      return "draft gone, Austin kept";
    },
  },
  {
    title: "AC3 — clear every field and Save: \"No address on file\", every column NULL",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await edit(page);
      for (const label of ["Address line 1", "Address line 2", "City", "Postal Code"]) {
        await card(page).getByLabel(label).fill("");
      }
      await card(page).locator("#location-country").selectOption({ label: "No country" });
      await card(page).getByRole("button", { name: "Save" }).click();
      await card(page).getByRole("form").waitFor({ state: "detached" });
      const shown = (await card(page).locator("[data-location-text]").innerText()).trim();
      const saved = await read();
      const columns = ["address", "address_line_2", "city", "state", "postal_code", "country"].map((k) => saved[k]);
      expect(shown === "No address on file", `shown: ${shown}`);
      expect(columns.every((v) => v === null), `columns: ${JSON.stringify(columns)}`);
      return "No address on file · six columns NULL";
    },
  },
  {
    title: "AC5 — as qa_pricing the card is read-only, and the api refuses the edit",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid, qa.email);
      const button = card(page).locator("[data-location-text]");
      expect(await button.isDisabled(), "the card opens for qa_pricing");
      const reason = await button.getAttribute("title");
      const patch = await apiCall(qa.token, "PATCH", `${base}/${job.uuid}`, { city: "Nope" });
      expect(patch.status === 403, `api ${patch.status}`);
      return `disabled "${reason}" · api ${patch.status}`;
    },
  },
]);

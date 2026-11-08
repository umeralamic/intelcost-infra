// F4-S21: the Location card on Project Home, edited in place. No map (D-28, P-17).
//
//   docker compose --profile browser run --rm browser node scripts/f4-s21.mjs
//
// Updated 2026-10-24 (D-315): the Location card went with Project Home (D-315 C5, `LocationCard`
// deleted); "Edit project holds the address", so every step drives the address block of the Edit
// Project dialog that `/project/<uuid>` opens over the takeoff (ids `edit-project-*`), with its one
// Save (D-315 1).
// AC1/AC3: no card text is left to read "No address on file" or the one-line address; the empty
// state is every address field blank, and after Save and a fresh load of `/project/<uuid>` (Save closes the
// dialog and drops `?edit`, so a bare reload has no dialog to show) the fields read back what was typed, as the api holds it.
// AC2: Cancel with changes asks "Discard changes?" (D-315 1): Discard, and the api and a reopened
// dialog still hold Austin.
// AC5: read-only is the dialog's refusal (`[data-edit-refusal]`), the address fields disabled and
// Save disabled for qa_pricing; the api still refuses.

import { APP, SEEDED, apiCall, enterWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S21 location");
const job = await makeProject(token, base, { name: "Location job" });
const qa = await seatedMember(token, workspace.uuid, "qa_pricing", "f4s21");

const read = async () => (await apiCall(token, "GET", `${base}/${job.uuid}`)).body;
const dialogOf = (page) => page.getByRole("dialog", { name: /Edit Project/ });

async function waitForForm(page) {
  const dialog = dialogOf(page);
  await dialog.locator("form[data-edit-project]").waitFor({ timeout: 20000 });
  return dialog;
}

/** `/project/<uuid>` is the takeoff with Edit Project open (D-315 C5). */
async function openEdit(page, email) {
  await signInAs(page, email ?? (await fixtureOwner()).email, SEEDED.password);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${job.uuid}`);
  return waitForForm(page);
}

const ADDRESS = ["Address line 1", "Address line 2"];
async function addressRead(dialog) {
  return {
    line1: await dialog.getByLabel("Address line 1").inputValue(),
    line2: await dialog.getByLabel("Address line 2").inputValue(),
    city: await dialog.locator("#edit-project-city").inputValue(),
    state: await dialog.locator("#edit-project-state").inputValue(),
    postal: await dialog.locator("#edit-project-postal-code").inputValue(),
    country: await dialog.locator("#edit-project-country").inputValue(),
  };
}

async function save(page, dialog) {
  await dialog.locator("[data-edit-save]").click();
  await page.getByText("Project saved").first().waitFor({ timeout: 15000 });
}

await run("f4-s21", [
  {
    title: "AC1/AC4 — no address on file; enter a US address, State is a list; Save; a reload keeps it",
    run: async ({ page }) => {
      let dialog = await openEdit(page);
      const before = await addressRead(dialog);
      expect(Object.values(before).every((v) => v === ""), `before: ${JSON.stringify(before)}`);
      await dialog.getByLabel("Address line 1").fill("215 Maple St");
      await dialog.getByLabel("Address line 2").fill("Suite 4");
      await dialog.locator("#edit-project-city").fill("Austin");
      await dialog.locator("#edit-project-country").selectOption("US");
      const stateTag = await dialog.locator("#edit-project-state").evaluate((el) => el.tagName);
      expect(stateTag === "SELECT", `State under US is a ${stateTag}`);
      await dialog.locator("#edit-project-state").selectOption("TX");
      await dialog.locator("#edit-project-postal-code").fill("78701");
      await save(page, dialog);
      // Save closed the dialog: the project address loaded afresh reopens it on the stored project.
      await page.goto(`${APP}/project/${job.uuid}`);
      dialog = await waitForForm(page);
      const shown = await addressRead(dialog);
      const want = { line1: "215 Maple St", line2: "Suite 4", city: "Austin", state: "TX", postal: "78701", country: "US" };
      expect(JSON.stringify(shown) === JSON.stringify(want), `shown: ${JSON.stringify(shown)}`);
      const saved = await read();
      expect(saved.country === "US" && saved.state === "TX" && saved.address === "215 Maple St", `saved ${saved.address}/${saved.country}/${saved.state}`);
      return Object.values(shown).join(" · ");
    },
  },
  {
    title: "AC4 — another country: State becomes free text, and the US state is cleared",
    run: async ({ page }) => {
      const dialog = await openEdit(page);
      await dialog.locator("#edit-project-country").selectOption("CA");
      const tag = await dialog.locator("#edit-project-state").evaluate((el) => el.tagName);
      const value = await dialog.locator("#edit-project-state").inputValue();
      expect(tag === "INPUT" && value === "", `State is a ${tag} holding "${value}"`);
      return "Canada: State / Region is free text, empty";
    },
  },
  {
    title: "AC2 — Cancel discards the draft",
    run: async ({ page }) => {
      let dialog = await openEdit(page);
      await dialog.locator("#edit-project-city").fill("Somewhere else");
      await dialog.getByRole("button", { name: "Cancel" }).click();
      const ask = page.getByRole("dialog", { name: "Discard changes?" });
      await ask.getByRole("button", { name: "Discard" }).click();
      await dialog.waitFor({ state: "detached", timeout: 10000 });
      expect((await read()).city === "Austin", "the api changed");
      await page.goto(`${APP}/project/${job.uuid}`);
      dialog = await waitForForm(page);
      const city = await dialog.locator("#edit-project-city").inputValue();
      expect(city === "Austin", `after Cancel: ${city}`);
      return "draft gone, Austin kept";
    },
  },
  {
    title: "AC3 — clear every field and Save: no address on file, every column NULL",
    run: async ({ page }) => {
      let dialog = await openEdit(page);
      for (const label of ADDRESS) await dialog.getByLabel(label).fill("");
      await dialog.locator("#edit-project-city").fill("");
      await dialog.locator("#edit-project-postal-code").fill("");
      await dialog.locator("#edit-project-country").selectOption({ label: "No country" });
      await save(page, dialog);
      const saved = await read();
      const columns = ["address", "address_line_2", "city", "state", "postal_code", "country"].map((k) => saved[k]);
      expect(columns.every((v) => v === null), `columns: ${JSON.stringify(columns)}`);
      await page.goto(`${APP}/project/${job.uuid}`);
      dialog = await waitForForm(page);
      const shown = await addressRead(dialog);
      expect(Object.values(shown).every((v) => v === ""), `shown: ${JSON.stringify(shown)}`);
      return "every address field blank · six columns NULL";
    },
  },
  {
    title: "AC5 — as qa_pricing the address is read-only, and the api refuses the edit",
    run: async ({ page }) => {
      const dialog = await openEdit(page, qa.email);
      const refusal = dialog.locator("[data-edit-refusal]");
      await refusal.waitFor({ timeout: 15000 });
      for (const field of [dialog.getByLabel("Address line 1"), dialog.locator("#edit-project-city"), dialog.locator("#edit-project-country")]) {
        expect(await field.isDisabled(), "an address field opens for qa_pricing");
      }
      expect(await dialog.locator("[data-edit-save]").isDisabled(), "Save enabled for qa_pricing");
      const reason = (await refusal.innerText()).trim();
      const patch = await apiCall(qa.token, "PATCH", `${base}/${job.uuid}`, { city: "Nope" });
      expect(patch.status === 403, `api ${patch.status}`);
      return `disabled "${reason}" · api ${patch.status}`;
    },
  },
]);

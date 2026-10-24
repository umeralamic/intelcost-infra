// F4-S14: Edit project details from Project Home. The same fields as New project, less
// Assigned To; what is shown is what is saved, so clearing a field clears it.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s14.mjs
//
// Updated 2026-10-24 (D-315, D-314, D-566): Project Home is gone (D-315 C5): `/project/<uuid>`
// opens the takeoff with the Edit Project dialog over it, so every step opens it there, not
// through an "Edit details" pencil; its title is "Edit Project" and its toast "Project saved".
// AC1: Assigned To is now one of the fields (D-315 1, "the same fields as create, assignees
// included"), so the step asserts it is offered; still no Show Map.
// AC4: the dashboard's filters are no longer in the address (D-314): the All projects dialog's
// Filters panel is opened and Construction type set to Renovation there.
// AC5: no pencil to disable (D-315 C5): the dialog says "Your role cannot edit projects. …"
// (`[data-edit-refusal]`) and its Save is disabled for qa_pricing; the api still refuses.

import { APP, SEEDED, apiCall, enterWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, rowNames } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S14 edit");
const job = await makeProject(token, base, {
  name: "Edit me",
  client_name: "Harbor Partners",
  bid_due_date: "2026-11-02",
  city: "Austin",
  state: "TX",
  country: "US",
  construction_type: "new_construction",
});
const qa = await seatedMember(token, workspace.uuid, "qa_pricing", "f4s14");
const read = async () => (await apiCall(token, "GET", `${base}/${job.uuid}`)).body;

/** `/project/<uuid>` is the takeoff with Edit Project open (D-315 C5). Returns the dialog. */
async function openEdit(page, email) {
  await signInAs(page, email ?? (await fixtureOwner()).email, SEEDED.password);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${job.uuid}`);
  const dialog = page.getByRole("dialog", { name: /Edit Project/ });
  await dialog.locator("form[data-edit-project]").waitFor({ timeout: 20000 });
  return dialog;
}

/** Already signed in: the All projects dialog (D-314), on its All tab. */
async function openList(page) {
  await page.goto(`${APP}/?projects=open`);
  const list = page.getByRole("dialog", { name: "All projects" });
  await list.getByRole("tablist", { name: "Project status" }).waitFor({ timeout: 20000 });
  await list.getByRole("tab", { name: /^All/ }).first().click();
  return list;
}

await run("f4-s14", [
  {
    title: "AC1 — every field carries the current value; Assigned To offered (D-315 1); no Show Map",
    run: async ({ page }) => {
      const dialog = await openEdit(page);
      const values = {
        name: await page.inputValue("#edit-project-name"),
        client: await page.inputValue("#edit-project-client"),
        bid: await page.inputValue("#edit-project-bid-due"),
        city: await page.inputValue("#edit-project-city"),
        state: await page.inputValue("#edit-project-state"),
        construction: await page.inputValue("#edit-project-construction_type"),
      };
      expect(
        values.name === "Edit me" && values.client === "Harbor Partners" && values.bid === "2026-11-02" &&
          values.city === "Austin" && values.state === "TX" && values.construction === "new_construction",
        `values: ${JSON.stringify(values)}`,
      );
      expect((await dialog.locator("#edit-project-assignees").count()) === 1, "Assigned To not offered");
      expect((await page.getByText("Show Map").count()) === 0, "Show Map offered");
      return JSON.stringify(values);
    },
  },
  {
    title: "AC2/AC3 — clearing City saves NULL; a blank name disables Save",
    run: async ({ page }) => {
      const dialog = await openEdit(page);
      await page.fill("#edit-project-name", "  ");
      expect(await dialog.getByRole("button", { name: "Save" }).isDisabled(), "Save enabled on a blank name");
      await dialog.getByText("A project needs a name.").waitFor();
      await page.fill("#edit-project-name", "Edited");
      await page.fill("#edit-project-city", "");
      await dialog.getByRole("button", { name: "Save" }).click();
      await page.getByText("Project saved").waitFor({ timeout: 10000 });
      const after = await read();
      expect(after.city === null && after.name === "Edited" && after.state === "TX", `after: ${after.name}/${after.city}/${after.state}`);
      return "city NULL, state kept, renamed";
    },
  },
  {
    title: "AC4 — a changed Construction Type is what the dashboard filter finds",
    run: async ({ page }) => {
      const dialog = await openEdit(page);
      await page.selectOption("#edit-project-construction_type", "renovation");
      await dialog.getByRole("button", { name: "Save" }).click();
      await page.getByText("Project saved").waitFor({ timeout: 10000 });
      const list = await openList(page);
      await list.getByRole("button", { name: "Filters" }).click();
      await page.selectOption("#filter-construction_type", "renovation");
      expect((await rowNames(page)).join() === "Edited", "filter did not find it");
      return "found under Renovation";
    },
  },
  {
    title: "AC5 — a qa_pricing seat is told it cannot edit, Save is disabled, and the api refuses the edit",
    run: async ({ page }) => {
      const dialog = await openEdit(page, qa.email);
      const refusal = dialog.locator("[data-edit-refusal]");
      await refusal.waitFor({ timeout: 15000 });
      const said = (await refusal.innerText()).trim();
      expect(/^Your role cannot edit projects\./.test(said), `refusal: ${said}`);
      expect(await dialog.locator("[data-edit-save]").isDisabled(), "Save enabled for qa_pricing");
      const refused = await apiCall(qa.token, "PATCH", `${base}/${job.uuid}`, { name: "nope" });
      expect(refused.status === 403, `PATCH: ${refused.status}`);
      return `"${said}" · Save disabled · api 403`;
    },
  },
]);

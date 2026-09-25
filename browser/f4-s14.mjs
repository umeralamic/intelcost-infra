// F4-S14: Edit project details from Project Home. The same fields as New project, less
// Assigned To; what is shown is what is saved, so clearing a field clears it.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s14.mjs

import { APP, apiCall, expect, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard, rowNames } from "./lib/f4.mjs";

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

async function openEdit(page, email) {
  await openDashboard(page, workspace.uuid, email);
  await page.goto(`${APP}/project/${job.uuid}`);
  await page.getByRole("heading", { name: /Edit me|Edited/ }).waitFor({ timeout: 15000 });
}

await run("f4-s14", [
  {
    title: "AC1 — every field carries the current value; no Assigned To; no Show Map",
    run: async ({ page }) => {
      await openEdit(page);
      await page.getByRole("button", { name: "Edit details" }).click();
      await page.getByRole("dialog", { name: "Edit project details" }).waitFor();
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
      expect((await page.locator("#edit-project-assignees").count()) === 0, "Assigned To offered");
      expect((await page.getByText("Show Map").count()) === 0, "Show Map offered");
      return JSON.stringify(values);
    },
  },
  {
    title: "AC2/AC3 — clearing City saves NULL; a blank name disables Save",
    run: async ({ page }) => {
      await openEdit(page);
      await page.getByRole("button", { name: "Edit details" }).click();
      await page.fill("#edit-project-name", "  ");
      expect(await page.getByRole("dialog").getByRole("button", { name: "Save" }).isDisabled(), "Save enabled on a blank name");
      await page.getByText("A project needs a name.").waitFor();
      await page.fill("#edit-project-name", "Edited");
      await page.fill("#edit-project-city", "");
      await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
      await page.getByText("Project details updated").waitFor({ timeout: 10000 });
      const after = await read();
      expect(after.city === null && after.name === "Edited" && after.state === "TX", `after: ${after.name}/${after.city}/${after.state}`);
      return "city NULL, state kept, renamed";
    },
  },
  {
    title: "AC4 — a changed Construction Type is what the dashboard filter finds",
    run: async ({ page }) => {
      await openEdit(page);
      await page.getByRole("button", { name: "Edit details" }).click();
      await page.selectOption("#edit-project-construction_type", "renovation");
      await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
      await page.getByText("Project details updated").waitFor({ timeout: 10000 });
      await page.goto(`${APP}/?tab=all&construction_type=renovation`);
      expect((await rowNames(page)).join() === "Edited", "filter did not find it");
      return "found under Renovation";
    },
  },
  {
    title: "AC5 — a qa_pricing seat has the pencil disabled, and the api refuses the edit",
    run: async ({ page }) => {
      await openEdit(page, qa.email);
      const pencil = page.getByRole("button", { name: "Edit details" });
      await page.waitForFunction(() => !document.querySelector(".animate-pulse"));
      expect(await pencil.isDisabled(), "pencil enabled for qa_pricing");
      const refused = await apiCall(qa.token, "PATCH", `${base}/${job.uuid}`, { name: "nope" });
      expect(refused.status === 403, `PATCH: ${refused.status}`);
      return "disabled · api 403";
    },
  },
]);

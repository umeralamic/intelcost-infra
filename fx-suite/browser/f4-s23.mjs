// F4-S23: Plans Dated on Project Home, saved on change from the S2 date input.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s23.mjs
//
// Updated 2026-10-24 (D-315): Project Home and its Plans Dated card are gone (D-315 C5,
// `PlansDatedCard` deleted; "Edit project holds … Plans Dated"), so the field driven is
// `#edit-project-plans-dated` in the Edit Project dialog `/project/<uuid>` opens over the takeoff.
// AC1/AC3: Edit Project has one Save (D-315 1), so the date is saved by Save ("Project saved"),
// not on change; a fresh load of `/project/<uuid>` then reads it back.
// AC2: the shared-input claim is read from where the field lives now, `ProjectFieldsForm.tsx`
// (New project's and Edit Project's one form), against the dashboard's `FiltersBar.tsx`.
// AC4: read-only is the dialog's refusal (`[data-edit-refusal]`) with the field and Save disabled
// for qa_pricing; the api still refuses.

import { readFile } from "node:fs/promises";

import { APP, SEEDED, apiCall, enterWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S23 plans dated");
const job = await makeProject(token, base, { name: "Dated job" });
const qa = await seatedMember(token, workspace.uuid, "qa_pricing", "f4s23");
const read = async () => (await apiCall(token, "GET", `${base}/${job.uuid}`)).body.plans_dated;
const FIELD = "#edit-project-plans-dated";

/** `/project/<uuid>` is the takeoff with Edit Project open (D-315 C5). */
async function openEdit(page, email) {
  if (email !== null) {
    await signInAs(page, email ?? (await fixtureOwner()).email, SEEDED.password);
    await enterWorkspace(page, workspace.uuid);
  }
  await page.goto(`${APP}/project/${job.uuid}`);
  const dialog = page.getByRole("dialog", { name: /Edit Project/ });
  await dialog.locator("form[data-edit-project]").waitFor({ timeout: 20000 });
  return dialog;
}

async function save(page, dialog) {
  await dialog.locator("[data-edit-save]").click();
  await page.getByText("Project saved").first().waitFor({ timeout: 15000 });
}

await run("f4-s23", [
  {
    title: "AC1 — set Plans Dated: Save stores it, and a fresh load keeps it",
    run: async ({ page }) => {
      const dialog = await openEdit(page);
      await page.fill(FIELD, "2026-08-14");
      await save(page, dialog);
      for (let i = 0; i < 20 && (await read()) !== "2026-08-14"; i += 1) await page.waitForTimeout(250);
      expect((await read()) === "2026-08-14", `api holds ${await read()}`);
      await openEdit(page, null);
      const shown = await page.inputValue(FIELD);
      expect(shown === "2026-08-14", `after reload ${shown}`);
      return `saved with the dialog's Save · reopened shows ${shown}`;
    },
  },
  {
    title: "AC2 — it is the S2 date input, the same one the dashboard's Created filter uses",
    run: async () => {
      const form = await readFile("/src/app/features/project/components/ProjectFieldsForm.tsx", "utf8");
      const filters = await readFile("/src/app/features/project/components/FiltersBar.tsx", "utf8");
      const from = '@/components/ui/date-input"';
      expect(form.includes(from) && filters.includes(from), "not the shared DateInput");
      expect(/<DateInput\s+id=\{id\("plans-dated"\)\}/.test(form), "Plans Dated is not a DateInput");
      return "both import components/ui/date-input";
    },
  },
  {
    title: "AC3 — clear it: NULL is saved",
    run: async ({ page }) => {
      const dialog = await openEdit(page);
      await page.fill(FIELD, "");
      await save(page, dialog);
      for (let i = 0; i < 20 && (await read()) !== null; i += 1) await page.waitForTimeout(250);
      expect((await read()) === null, `api holds ${await read()}`);
      return "plans_dated null";
    },
  },
  {
    title: "AC4 — as qa_pricing it is read-only, and the api refuses",
    run: async ({ page }) => {
      const dialog = await openEdit(page, qa.email);
      await dialog.locator("[data-edit-refusal]").waitFor({ timeout: 15000 });
      expect(await page.locator(FIELD).isDisabled(), "enabled for qa_pricing");
      expect(await dialog.locator("[data-edit-save]").isDisabled(), "Save enabled for qa_pricing");
      const patch = await apiCall(qa.token, "PATCH", `${base}/${job.uuid}`, { plans_dated: "2026-01-01" });
      expect(patch.status === 403, `api ${patch.status}`);
      return `disabled · api ${patch.status}`;
    },
  },
]);

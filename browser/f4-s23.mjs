// F4-S23: Plans Dated on Project Home, saved on change from the S2 date input.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s23.mjs

import { readFile } from "node:fs/promises";

import { apiCall, expect, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openFiles } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S23 plans dated");
const job = await makeProject(token, base, { name: "Dated job" });
const qa = await seatedMember(token, workspace.uuid, "qa_pricing", "f4s23");
const read = async () => (await apiCall(token, "GET", `${base}/${job.uuid}`)).body.plans_dated;

await run("f4-s23", [
  {
    title: "AC1 — set Plans Dated: it saves on change, and a reload keeps it",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await page.fill("#plans-dated", "2026-08-14");
      for (let i = 0; i < 20 && (await read()) !== "2026-08-14"; i += 1) await page.waitForTimeout(250);
      expect((await read()) === "2026-08-14", `api holds ${await read()}`);
      await page.reload();
      await page.locator("#plans-dated").waitFor();
      const shown = await page.inputValue("#plans-dated");
      expect(shown === "2026-08-14", `after reload ${shown}`);
      return `saved without a Save button · reload shows ${shown}`;
    },
  },
  {
    title: "AC2 — it is the S2 date input, the same one the dashboard's Created filter uses",
    run: async () => {
      const card = await readFile("/src/app/features/project/components/PlansDatedCard.tsx", "utf8");
      const filters = await readFile("/src/app/features/project/components/FiltersBar.tsx", "utf8");
      const from = '@/components/ui/date-input"';
      expect(card.includes(from) && filters.includes(from), "not the shared DateInput");
      return "both import components/ui/date-input";
    },
  },
  {
    title: "AC3 — clear it: NULL is saved",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await page.fill("#plans-dated", "");
      for (let i = 0; i < 20 && (await read()) !== null; i += 1) await page.waitForTimeout(250);
      expect((await read()) === null, `api holds ${await read()}`);
      return "plans_dated null";
    },
  },
  {
    title: "AC4 — as qa_pricing it is read-only, and the api refuses",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid, qa.email);
      expect(await page.locator("#plans-dated").isDisabled(), "enabled for qa_pricing");
      const patch = await apiCall(qa.token, "PATCH", `${base}/${job.uuid}`, { plans_dated: "2026-01-01" });
      expect(patch.status === 403, `api ${patch.status}`);
      return `disabled · api ${patch.status}`;
    },
  },
]);

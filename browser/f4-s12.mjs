// F4-S12: the follow-up badge. A project that reports as Submitted, with no follow-up
// date, submitted 7 or more days ago, gets a badge, and "Needs follow-up (N)" filters.
//
// Three phases, because only the database can make a submission eight days old:
//
//   docker compose --profile browser run --rm browser node scripts/f4-s12.mjs setup
//   docker compose exec -T api sh -lc "cd /srv && python drives/f4-s12-age.py"
//   docker compose --profile browser run --rm browser node scripts/f4-s12.mjs check
//
// Setup makes a throwaway workspace named "F4-S12 follow-up" with its projects; the drive
// ages those projects' `submitted_at` by name; check reads the dashboard.

import { apiCall, apiLogin, createWorkspace, expect, run } from "./lib/bench.mjs";
import { makeProject, openDashboard, rowNames } from "./lib/f4.mjs";

const PHASE = process.argv[2];
const NAME = "F4-S12 follow-up";
const token = await apiLogin();

if (PHASE === "setup") {
  const workspace = await createWorkspace(token, NAME);
  const base = `/api/workspace/${workspace.uuid}/project`;
  const sp = `/api/workspace/${workspace.uuid}/project-status`;
  const custom = await apiCall(token, "POST", sp, {
    label: "Sent to GC",
    color: "purple",
    bucket: "active",
    reports_as: "submitted",
  });
  await makeProject(token, base, { name: "Aged 8 days" }, "submitted");
  await makeProject(token, base, { name: "Aged 6 days" }, "submitted");
  await makeProject(token, base, { name: "Aged then won" }, "submitted");
  await makeProject(token, base, { name: "Custom aged 8" }, custom.body.key);
  await makeProject(token, base, { name: "Never submitted" });
  console.log(`setup: ${workspace.uuid}`);
} else if (PHASE === "check") {
  const workspace = (await (await apiCall(token, "GET", "/api/workspace")).body).filter((w) => w.name === NAME).at(-1);
  expect(workspace, "run setup first");
  const base = `/api/workspace/${workspace.uuid}/project`;
  const byName = async (name) =>
    (await apiCall(token, "GET", `${base}?limit=200`)).body.items.find((p) => p.name === name);

  await run("f4-s12", [
    {
      title: "AC1/AC3/AC5 — badges on 8 days (built-in and custom Submitted), none at 6 days",
      run: async ({ page }) => {
        await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
        await rowNames(page);
        const badged = await page
          .locator("li[data-project]:has([data-follow-up])")
          .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-project")).sort());
        expect(
          badged.join() === "Aged 8 days,Aged then won,Custom aged 8",
          `badged: ${badged.join(", ")}`,
        );
        await page.getByRole("button", { name: "Needs follow-up (3)" }).waitFor();
        return `badged: ${badged.join(", ")} · chip reads 3`;
      },
    },
    {
      title: "AC2 — the chip filters to those projects, and pressing it again clears it",
      run: async ({ page }) => {
        await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
        await page.getByRole("button", { name: /Needs follow-up/ }).click();
        const only = (await rowNames(page)).sort().join(", ");
        expect(only === "Aged 8 days, Aged then won, Custom aged 8", `filtered: ${only}`);
        await page.getByRole("button", { name: /Needs follow-up/ }).click();
        expect((await rowNames(page)).length === 5, "chip did not clear");
        return only;
      },
    },
    {
      title: "AC4 — moving a badged project to Won clears its badge",
      run: async ({ page }) => {
        const won = await byName("Aged then won");
        await apiCall(token, "PATCH", `${base}/${won.uuid}`, { status_key: "won" });
        expect((await byName("Aged then won")).needs_follow_up === false, "api still says follow up");
        await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
        await rowNames(page);
        expect(
          (await page.locator('li[data-project="Aged then won"] [data-follow-up]').count()) === 0,
          "badge survived Won",
        );
        await page.getByRole("button", { name: "Needs follow-up (2)" }).waitFor();
        return "badge gone · chip reads 2";
      },
    },
  ]);
} else {
  console.error("phase: setup | check");
  process.exitCode = 2;
}

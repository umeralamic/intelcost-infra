// F4-S11: filters, as the founder settled them. Attributes with Unspecified; Client in
// place of GC; Assigned to matching ANY assignee, never the creator; inclusive date
// bounds; Clear filters.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s11.mjs

import { expect, members, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard, rowNames, settle, tabStrip } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S11 filters");
const alice = await seatedMember(token, workspace.uuid, "estimator", "f4s11-alice");
const bob = await seatedMember(token, workspace.uuid, "takeoff", "f4s11-bob");
const roster = await members(token, workspace.uuid);
const uuidOf = (email) => roster.find((m) => m.email === email).user_uuid;
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

await makeProject(token, base, {
  name: "Reno Harbor",
  construction_type: "renovation",
  client_name: "Harbor Partners",
  bid_due_date: "2026-10-10",
});
await makeProject(token, base, { name: "Reno Two", construction_type: "renovation", bid_due_date: "2026-10-11" });
await makeProject(token, base, {
  name: "New build",
  construction_type: "new_construction",
  // Alice is the SECOND assignee: the filter must find her anyway.
  assignee_uuids: [uuidOf(bob.email), uuidOf(alice.email)],
});
await makeProject(token, base, { name: "Unclassified" });
// Made BY Alice and assigned to nobody: legacy's "Estimator" filter matched this. Ours must not.
await makeProject(alice.token, base, { name: "Alice made it" });

const sorted = async (page) => (await rowNames(page)).sort().join(", ");
const all = (strip) => strip.find((t) => t.label === "All")?.count;

async function openFiltered(page) {
  await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
  await page.getByRole("button", { name: "Filters" }).click();
  await page.locator("[data-filters]").waitFor();
}

await run("f4-s11", [
  {
    title: "AC1/AC2 — Construction Type = Renovation, then Unspecified; the counts follow",
    run: async ({ page }) => {
      await openFiltered(page);
      await page.selectOption("#filter-construction_type", "renovation");
      expect((await sorted(page)) === "Reno Harbor, Reno Two", `renovation: ${await sorted(page)}`);
      expect(all(await tabStrip(page)) === 2, "All count ignores the filter");
      await page.selectOption("#filter-construction_type", "unspecified");
      expect((await sorted(page)) === "Alice made it, Unclassified", `unspecified: ${await sorted(page)}`);
      return "renovation → 2 · unspecified → 2 · All count follows";
    },
  },
  {
    title: "AC3 — Assigned to Alice finds her as a second assignee, and not what she created",
    run: async ({ page }) => {
      await openFiltered(page);
      // Exact: the seeded owner is "Bench Estimator", capital E.
      await page.locator("[data-filters]").getByLabel("Bench estimator", { exact: true }).check();
      const found = await sorted(page);
      expect(found === "New build", `assigned to Alice: ${found}`);
      return found;
    },
  },
  {
    title: "AC4 — Client = Harbor Partners",
    run: async ({ page }) => {
      await openFiltered(page);
      await page.selectOption("#filter-client", "Harbor Partners");
      expect((await sorted(page)) === "Reno Harbor", `client: ${await sorted(page)}`);
      return "Reno Harbor";
    },
  },
  {
    title: "AC5 — date bounds include their end day; no bid due is out once a bound is set",
    run: async ({ page }) => {
      await openFiltered(page);
      await page.fill("#filter-bid-due-from", "2026-10-01");
      await page.fill("#filter-bid-due-to", "2026-10-10");
      expect((await sorted(page)) === "Reno Harbor", `bid due ≤ Oct 10: ${await sorted(page)}`);
      await page.fill("#filter-bid-due-from", "");
      await page.fill("#filter-bid-due-to", "");
      await page.fill("#filter-created-to", today);
      expect((await rowNames(page)).length === 5, "created-to today dropped today's projects");
      await page.fill("#filter-created-from", tomorrow);
      await page.getByText("No projects match the current filters.").waitFor();
      return `bid due Oct 1 to Oct 10 → Reno Harbor · created to ${today} → all 5 · from ${tomorrow} → none`;
    },
  },
  {
    title: "AC6 — filters live in the URL; Clear filters restores the list and goes away",
    run: async ({ page }) => {
      await openFiltered(page);
      await page.selectOption("#filter-construction_type", "renovation");
      await settle(page);
      expect(/construction_type=renovation/.test(page.url()), `url: ${page.url()}`);
      await page.reload();
      await page.locator("[data-filters]").waitFor();
      expect((await page.inputValue("#filter-construction_type")) === "renovation", "filter lost on reload");
      await page.getByRole("button", { name: "Clear filters" }).click();
      expect((await rowNames(page)).length === 5, "Clear filters did not restore the list");
      expect((await page.getByRole("button", { name: "Clear filters" }).count()) === 0, "Clear filters stayed");
      return "in the URL · survives reload · cleared";
    },
  },
]);

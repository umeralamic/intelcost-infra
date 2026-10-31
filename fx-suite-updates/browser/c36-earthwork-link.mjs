// C36, the earthwork production starter (D-751, D-753) and the site spread's two-way link (D-744),
// built after the archive (night brief 2026-10-24, Part 2 item 3).
//
//   ./fx-suite.sh run c36-earthwork-link
//
// The starter, as a new workspace takes it up (D-751's counts, release 3 of D-806): 15 activities, 85 tiers, 69 default
// rows, every one priced as one site spread on a 10-hour day; the 19 optional machines ("Optional
// (catalog gap)") inactive; the crew's Foreman rows marked foreman, Grade checker and Pipelayer
// priced as their journeyman craft (D-753 option B, `rate_as`).
//
// The link, on the c32 pad (150 × 90 ft, EG 100, FG 82: 9,000 BCY of cut; A1 at 1,000 BCY/day, tier
// 900–1,399: EX-CRAWL-30T × 1 + ADT-30T × 2), in Estimating › Equipment settings:
// - production typed 1,500/day → tier 1,400–2,199's machines (ADT-30T × 3);
// - the trucks back to 2 → the spread matches tier 900–1,399 exactly → its production for this
//   quantity, 1,000/day ("Production set to 1,000 BCY/day: the spread matches the 900–1,399 tier.");
// - the pacing excavator to 2 → no tier matches → production scales, 1,000 × 2 = 2,000/day;
// - Apply tier → the default 1,000/day and tier 900–1,399's machines, not edited.
//
// Left for the founder's eye: the Earthwork production page's layout.

// Shared equipment and Equipment settings open from the table toolbar's Setup menu (D-766 F2).
import { APP, apiCall, expect, fixtureOwner, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { calculate, fx, fy, grading, gradingSheets, rect, storedLines } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C36 Earthwork link");
const project = await makeProject(token, base, { name: "Earthwork link" });
const g = grading(token, base, project);
const wlib = `/api/workspace/${workspace.uuid}/equipment-library`;
const plib = `/api/workspace/${workspace.uuid}/project/${project.uuid}/estimate/equipment-library`;
const A1 = "Excavate and load (on-site haul)";
let sheet;
const X0 = fx(27);
const Y0 = fy(21);
const ring = rect(X0 - fx(20), Y0 - fy(20), 190, 130);
const middle = [X0 + fx(75), Y0 + fy(45)];

const signedIn = new WeakSet();
async function signIn(page) {
  if (signedIn.has(page)) return;
  await page.setViewportSize({ width: 1920, height: 1080 });
  const owner = await fixtureOwner();
  for (let attempt = 1; ; attempt++) {
    await page.goto(`${APP}/login?next=${encodeURIComponent("/settings/account")}`);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForFunction(() => location.pathname === "/settings/account" || Boolean(document.querySelector("#email")), null, { timeout: 30000 });
    if (new URL(page.url()).pathname === "/settings/account") break;
    try {
      await page.fill("#email", owner.email, { timeout: 5000 });
      await page.fill("#password", owner.password, { timeout: 5000 });
      await page.keyboard.press("Enter");
      await page.waitForURL((u) => u.pathname === "/settings/account", { timeout: 30000 });
      break;
    } catch (error) {
      if (attempt >= 3) throw error;
    }
  }
  signedIn.add(page);
}

const site = async () => (await apiCall(token, "GET", `${plib}/earthwork-production`)).body.site.find((s) => s.name === A1);
const machines = (a) => a.machines.map((m) => `${m.eq_class_key}×${m.units}`).join(" + ");

/** Estimating › Equipment settings…, A1's row. */
async function settingsRow(page) {
  await signIn(page);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating`);
  await page.locator('[data-setup-line="setup:equipment"]').click(); // D-777: the sidebar's Setup
  const row = page.locator(`[data-site-activity="${A1}"]`);
  await row.waitFor({ timeout: 30000 });
  return row;
}
/** Type into one of the row's number fields and wait for the api to have priced it. */
async function commit(page, row, label, value, settled) {
  const field = row.getByLabel(label);
  await field.fill(String(value));
  await field.press("Enter");
  return waitFor(async () => {
    const a = await site();
    return settled(a) ? a : null;
  }, `${label} = ${value}`, 30000, 500);
}

await run("c36-earthwork-link", [
  {
    title: "the starter a new workspace takes up (D-751, D-806 release 3, D-898 release 8): 17 activities, 91 tiers, 73 defaults, site spreads on a 10-hour day; 22 optional machines; Foreman, Grade checker and Pipelayer rows as D-753",
    run: async ({ page }) => {
      const cfg = (await apiCall(token, "GET", `${wlib}/earthwork-production`)).body;
      const acts = cfg.activities.filter((a) => a.national_key);
      const tiers = acts.flatMap((a) => a.tiers);
      const defaults = acts.reduce((n, a) => n + a.defaults.length, 0);
      const optional = tiers.flatMap((t) => t.machines).filter((m) => m.optional).length;
      const crew = tiers.flatMap((t) => t.crew);
      const foremen = crew.filter((c) => /^Foreman/i.test(c.role));
      const rated = crew.filter((c) => /^(Grade checker|Pipelayer)/i.test(c.role));
      expect(acts.length === 17, `activities ${acts.length}`);
      expect(tiers.length === 91, `tiers ${tiers.length}`);
      expect(defaults === 73, `defaults ${defaults}`);
      expect(acts.every((a) => (a.price_as ?? "site") === "site" && a.hours_per_day === 10), `price_as / hours: ${acts.map((a) => `${a.national_key}:${a.price_as}/${a.hours_per_day}`).join(" ")}`);
      expect(optional === 22, `optional machines ${optional}`);
      expect(foremen.length > 0 && foremen.every((c) => c.foreman), `foreman rows ${foremen.length}, all marked ${foremen.every((c) => c.foreman)}`);
      expect(rated.length > 0 && rated.every((c) => c.rate_as), `grade checker / pipelayer rows ${rated.length}, all rate_as ${rated.every((c) => c.rate_as)}`);
      await signIn(page);
      await page.goto(`${APP}/settings/equipment`);
      await page.getByRole("tab", { name: "Earthwork production" }).click();
      await page.locator("[data-activity]").first().waitFor({ timeout: 30000 });
      const badges = await page.locator("[data-starter]").count();
      expect(badges === 17, `Starter badges on screen ${badges}`);
      return `17 activities, ${tiers.length} tiers, ${defaults} defaults, ${optional} optional, ${foremen.length} foreman rows, ${rated.length} grade checker/pipelayer rows (rate_as ${[...new Set(rated.map((c) => c.rate_as))].join(", ")}); 15 Starter badges`;
    },
  },
  {
    title: "setup: the pad at FG 82 calculates 9,000 BCY of cut; A1's site spread is 1,000/day in tier 900–1,399 (EX-CRAWL-30T × 1 + ADT-30T × 2)",
    run: async ({ page }) => {
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["C-1"]);
      await g.boundary(sheet, rect(X0, Y0, 150, 90));
      await g.spots(sheet, "EG", [...ring, middle].map(([x, y]) => [x, y, 100]));
      await g.spots(sheet, "FG", [...ring, middle].map(([x, y]) => [x, y, 82]));
      await g.assume();
      await signIn(page);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=earthwork`);
      await page.locator("[data-canvas-scale]").first().waitFor({ state: "attached", timeout: 30000 });
      await calculate(page);
      await storedLines(g, sheet, waitFor, 60000);
      const a = await waitFor(async () => {
        const s = await site();
        return s?.machines.length ? s : null;
      }, "A1's site spread", 60000, 1000);
      expect(a.prod_per_day === 1000 && machines(a) === "EX-CRAWL-30T×1 + ADT-30T×2", `A1 ${a.prod_per_day}/day: ${machines(a)}`);
      return `A1 ${a.total_qty} BCY, ${a.prod_per_day}/day, tier ${a.tier_label}: ${machines(a)}`;
    },
  },
  {
    title: "production typed 1,500/day takes tier 1,400–2,199's machines (ADT-30T × 3), the spread edited",
    run: async ({ page }) => {
      const row = await settingsRow(page);
      const a = await commit(page, row, `${A1} production per work day`, 1500, (s) => s.prod_per_day === 1500 && s.machines.some((m) => m.eq_class_key === "ADT-30T" && m.units === 3));
      expect(machines(a) === "EX-CRAWL-30T×1 + ADT-30T×3" && a.user_edited, `${machines(a)}, edited ${a.user_edited}`);
      return `tier ${a.tier_label}: ${machines(a)}; edited`;
    },
  },
  {
    title: "the trucks back to 2: the spread matches tier 900–1,399 exactly, so production is that tier's for 9,000 BCY, 1,000/day, and the note says so",
    run: async ({ page }) => {
      const row = await settingsRow(page);
      const truck = (await site()).machines.find((m) => m.eq_class_key === "ADT-30T");
      const a = await commit(page, row, `${truck.name} count`, 2, (s) => s.prod_per_day === 1000);
      expect(a.note === "Production set to 1,000 BCY/day: the spread matches the 900–1,399 tier.", `note: ${a.note}`);
      return `${a.prod_per_day}/day; note "${a.note}"`;
    },
  },
  {
    title: "the pacing excavator to 2: no tier matches, so production scales with it, 1,000 × 2 = 2,000/day",
    run: async ({ page }) => {
      const row = await settingsRow(page);
      const ex = (await site()).machines.find((m) => m.paces);
      expect(ex?.eq_class_key === "EX-CRAWL-30T", `pacing machine ${JSON.stringify(ex)}`);
      const a = await commit(page, row, `${ex.name} count`, 2, (s) => s.prod_per_day === 2000);
      expect(/^Production updated to 2,000 BCY\/day \(2 .* instead of 1\)\.$/.test(a.note ?? ""), `note: ${a.note}`);
      return `${a.prod_per_day}/day; ${machines(a)}; note "${a.note}"`;
    },
  },
  {
    title: "Apply tier puts the default 1,000/day and tier 900–1,399's machines back, not edited",
    run: async ({ page }) => {
      const row = await settingsRow(page);
      await row.locator("[data-site-apply-tier]").click();
      const a = await waitFor(async () => {
        const s = await site();
        return s.prod_per_day === 1000 && !s.user_edited ? s : null;
      }, "Apply tier", 30000, 500);
      expect(machines(a) === "EX-CRAWL-30T×1 + ADT-30T×2", `machines ${machines(a)}`);
      return `${a.prod_per_day}/day, tier ${a.tier_label}: ${machines(a)}, edited ${a.user_edited}`;
    },
  },
]);

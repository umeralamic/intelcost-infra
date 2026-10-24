// C32, the D-758 follow-up (the founder, 2026-10-23; night brief 2026-10-24, Part 2 item 4): typed
// values on a site-spread machine are never lost silently. On a site-spread activity, a rate typed
// on a site machine marks the spread edited; a recalculation into another tier keeps the tier and
// shows "Apply tier", the typed rate kept; Apply tier with the same classes carries the values; Apply
// tier where a class leaves names it in the notice.
//
//   ./fx-suite.sh run c32-site-typed
//
// The world: one throwaway project, one page at 1/6 ft per point (lib/grading-world.mjs). A 150 × 90
// ft boundary (13,500 SF) inside a ring of spots 20 ft out, EG 100 everywhere; FG on the same ring:
//   - FG 82: cut 18 ft = 9,000 BCY → the starter's A1 (cut, "Excavate and load (on-site haul)")
//     default 1,000 BCY/day → tier 900–1,399: EX-CRAWL-30T × 1 + ADT-30T × 2;
//   - FG 55: 45 ft = 22,500 BCY → 1,500/day → tier 1,400–2,199: EX-CRAWL-30T × 1 + ADT-30T × 3
//     (both classes stay);
//   - FG 10: 90 ft = 45,000 BCY → 2,500/day → tier 2,200–3,199: EX-CRAWL-50T × 1 + ADT-30T × 3
//     (the excavator's class leaves).
// The typed values (TEST, never a rate anyone quoted): the excavator's week $7,000, the truck's day
// $900, typed in Estimating › Shared equipment as a person does.
//
// Left for the founder's eye: the words and layout of Equipment settings' Earthwork production row.

import { APP, apiCall, expect, fixtureOwner, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { calculate, fx, fy, grading, gradingSheets, rect, storedLines } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C32 Site typed");
const project = await makeProject(token, base, { name: "Site typed values" });
const g = grading(token, base, project);
const lib = `/api/workspace/${workspace.uuid}/project/${project.uuid}/estimate/equipment-library`;
const estimate = `${base}/${project.uuid}/estimate`;
let sheet;
let fg = null;
const X0 = fx(27);
const Y0 = fy(21);
const ring = rect(X0 - fx(20), Y0 - fy(20), 190, 130);
const middle = [X0 + fx(75), Y0 + fy(45)];

/** FG on the ring and in the middle at `elevation`, in place of the last FG spots. */
async function setFg(elevation) {
  if (fg) {
    const gone = await apiCall(token, "DELETE", `${g.takeoff}/item/${fg.uuid}`);
    expect(gone.status === 200, `FG spots removed: ${gone.status} ${JSON.stringify(gone.body)}`);
  }
  fg = await g.spots(sheet, "FG", [...ring, middle].map(([x, y]) => [x, y, elevation]));
}

const site = async () => {
  const got = await apiCall(token, "GET", `${lib}/earthwork-production`);
  expect(got.status === 200, `earthwork production: ${got.status}`);
  const a1 = got.body.site.find((s) => s.name === "Excavate and load (on-site haul)");
  expect(a1, `no A1 site row: ${got.body.site.map((s) => s.name).join(", ")}`);
  return a1;
};
const resources = async () => {
  const got = await apiCall(token, "GET", `${estimate}/equipment`);
  expect(got.status === 200, `equipment: ${got.status}`);
  return got.body.resources;
};
const ownOf = (r) => r?.eq_snapshot?.own ?? {};
const machines = (a1) => a1.machines.map((m) => `${m.eq_class_key}×${m.units}`).join(" + ");

/** Signed in once per page: the upload and each step after it reuse the session. */
const signedIn = new WeakSet();
async function signIn(page) {
  if (signedIn.has(page)) return;
  await page.setViewportSize({ width: 1920, height: 1080 });
  // The login page goes on to Account settings at once when a session is held; otherwise its form,
  // which remounts once while it checks for a session: each try waits for the page to settle.
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

/** Calculate in the Earthwork tab, then the stored lines. */
async function recalculate(page) {
  await signIn(page);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=earthwork`);
  await page.locator("[data-canvas-scale]").first().waitFor({ state: "attached", timeout: 30000 });
  await calculate(page);
  return storedLines(g, sheet, waitFor, 60000);
}

/** Estimating › Equipment settings…, the A1 row as the person sees it. */
async function openSettings(page) {
  await signIn(page);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating`);
  await page.getByRole("button", { name: /Equipment settings/ }).click();
  const row = page.locator('[data-site-activity="Excavate and load (on-site haul)"]');
  await row.waitFor({ timeout: 30000 });
  return row;
}

await run("c32-site-typed", [
  {
    title: "setup: the pad at FG 82 calculates 9,000 BCY of cut; A1's site spread is tier 900–1,399 with EX-CRAWL-30T × 1 + ADT-30T × 2",
    run: async ({ page }) => {
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["C-1"]);
      await g.boundary(sheet, rect(X0, Y0, 150, 90));
      await g.spots(sheet, "EG", [...ring, middle].map(([x, y]) => [x, y, 100]));
      await setFg(82);
      await g.assume();
      const lines = await recalculate(page);
      const cut = lines.find((l) => /cut/i.test(l.name) && !/undercut|strip/i.test(l.name));
      expect(cut, `no cut line among ${lines.map((l) => l.name).join(", ")}`);
      const a1 = await waitFor(async () => {
        const s = await site();
        return s.lines > 0 && s.machines.length > 0 ? s : null;
      }, "A1's site spread", 60000, 1000);
      expect(Math.round(a1.total_qty) === 9000, `A1 total ${a1.total_qty}, expected 9,000`);
      expect(a1.prod_per_day === 1000, `production ${a1.prod_per_day}, expected 1,000`);
      expect(machines(a1) === "EX-CRAWL-30T×1 + ADT-30T×2", `machines ${machines(a1)}`);
      return `cut line "${cut.name}"; A1 ${a1.total_qty} BCY, ${a1.prod_per_day}/day, tier ${a1.tier_label}: ${machines(a1)}; edited ${a1.user_edited}`;
    },
  },
  {
    title: "a rate typed on each site machine (Shared equipment: excavator week $7,000, truck day $900) marks the spread edited",
    run: async ({ page }) => {
      await signIn(page);
      const dialog = page.getByRole("dialog", { name: "Shared equipment" });
      const named = await resources();
      for (const [cls, label, value] of [["EX-CRAWL-30T", /^Week/, "7000"], ["ADT-30T", /^Day/, "900"]]) {
        // A fresh page for each machine: a save reselects its own resource when it settles.
        await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=estimating`);
        await page.getByRole("button", { name: /^Shared equipment$/ }).first().click();
        await dialog.waitFor();
        const r = named.find((x) => x.eq_class_key === cls);
        expect(r, `no shared machine of ${cls}: ${named.map((x) => x.name).join(", ")}`);
        await dialog.getByRole("button").filter({ hasText: r.name }).first().click();
        await dialog.locator("[data-name-source]").filter({ hasText: cls }).waitFor();
        const field = dialog.getByRole("spinbutton", { name: label }).or(dialog.getByLabel(label)).first();
        await field.fill(value);
        await dialog.getByRole("button", { name: "Save", exact: true }).click();
        // The api has it (a toast from the save before may still be up).
        const field0 = cls === "EX-CRAWL-30T" ? "rent_week" : "rent_day";
        await waitFor(async () => ownOf((await resources()).find((x) => x.eq_class_key === cls))[field0] === Number(value), `${cls} saved`, 15000, 300);
      }
      const rs = await resources();
      const ex = rs.find((r) => r.eq_class_key === "EX-CRAWL-30T");
      const adt = rs.find((r) => r.eq_class_key === "ADT-30T");
      expect(ownOf(ex).rent_week === 7000, `excavator own ${JSON.stringify(ownOf(ex))}`);
      expect(ownOf(adt).rent_day === 900, `truck own ${JSON.stringify(ownOf(adt))}`);
      const a1 = await site();
      expect(a1.user_edited, "the spread is not marked edited");
      return `saved: ${ex.name} own ${JSON.stringify(ownOf(ex))}; ${adt.name} own ${JSON.stringify(ownOf(adt))}; A1 edited ${a1.user_edited}`;
    },
  },
  {
    title: "recalculated at FG 55 (22,500 BCY): the tier stays 900–1,399, \"Apply tier\" shows, both typed rates kept",
    run: async ({ page }) => {
      await setFg(55);
      await recalculate(page);
      const a1 = await waitFor(async () => {
        const s = await site();
        return Math.round(s.total_qty) === 22500 ? s : null;
      }, "A1 at 22,500 BCY", 60000, 1000);
      expect(machines(a1) === "EX-CRAWL-30T×1 + ADT-30T×2", `machines moved: ${machines(a1)}`);
      expect(/Apply tier$/.test(a1.note ?? ""), `note: ${a1.note}`);
      const row = await openSettings(page);
      const seen = (await row.innerText()).replace(/\s+/g, " ");
      expect(await row.getByRole("button", { name: "Apply tier" }).first().isVisible(), `no Apply tier on screen: ${seen}`);
      const rs = await resources();
      expect(ownOf(rs.find((r) => r.eq_class_key === "EX-CRAWL-30T")).rent_week === 7000, "the excavator's typed week was lost");
      expect(ownOf(rs.find((r) => r.eq_class_key === "ADT-30T")).rent_day === 900, "the truck's typed day was lost");
      return `screen: "${seen.slice(0, 400)}"`;
    },
  },
  {
    title: "Apply tier with the same classes (1,400–2,199: EX-CRAWL-30T × 1 + ADT-30T × 3): both typed values carry, no notice",
    run: async ({ page }) => {
      const row = await openSettings(page);
      await row.getByRole("button", { name: "Apply tier" }).first().click();
      await page.getByText("Tier applied").first().waitFor({ timeout: 30000 });
      const a1 = await site();
      expect(machines(a1) === "EX-CRAWL-30T×1 + ADT-30T×3", `machines ${machines(a1)}`);
      expect(a1.prod_per_day === 1500, `production ${a1.prod_per_day}`);
      expect(!/were not used/.test(a1.note ?? ""), `a notice: ${a1.note}`);
      const rs = await resources();
      const ex = rs.find((r) => r.eq_class_key === "EX-CRAWL-30T");
      const adt = rs.find((r) => r.eq_class_key === "ADT-30T");
      expect(ownOf(ex).rent_week === 7000 && ownOf(adt).rent_day === 900, `carried: ${JSON.stringify(ownOf(ex))} ${JSON.stringify(ownOf(adt))}`);
      return `tier ${a1.tier_label}: ${machines(a1)}; ${ex.name} ${JSON.stringify(ownOf(ex))}; ${adt.name} ${JSON.stringify(ownOf(adt))}; note ${JSON.stringify(a1.note)}; edited ${a1.user_edited}`;
    },
  },
  {
    title: "recalculated at FG 10 (45,000 BCY) and Apply tier (2,200–3,199: EX-CRAWL-50T × 1 + ADT-30T × 3): the truck carries, the notice names the excavator",
    run: async ({ page }) => {
      const exName = (await resources()).find((r) => r.eq_class_key === "EX-CRAWL-30T").name;
      await setFg(10);
      await recalculate(page);
      await waitFor(async () => {
        const s = await site();
        return Math.round(s.total_qty) === 45000 && /Apply tier$/.test(s.note ?? "") ? s : null;
      }, "A1 at 45,000 BCY with Apply tier", 60000, 1000);
      const row = await openSettings(page);
      await row.getByRole("button", { name: "Apply tier" }).first().click();
      await page.getByText("Tier applied").first().waitFor({ timeout: 30000 });
      const a1 = await site();
      expect(machines(a1) === "EX-CRAWL-50T×1 + ADT-30T×3", `machines ${machines(a1)}`);
      const rs = await resources();
      const ex50 = rs.find((r) => r.eq_class_key === "EX-CRAWL-50T");
      const adt = rs.find((r) => r.eq_class_key === "ADT-30T");
      expect(Object.keys(ownOf(ex50)).length === 0, `the new excavator took values: ${JSON.stringify(ownOf(ex50))}`);
      expect(ownOf(adt).rent_day === 900, `the truck's day: ${JSON.stringify(ownOf(adt))}`);
      // D-758: the notice names the machine as its spread does, "<activity>: <type> <size>".
      expect(a1.note === `Your typed values for ${exName} were not used: it is not in the new tier.`, `notice: ${a1.note}`);
      const on = await openSettings(page);
      const seen = (await on.locator("[data-site-note]").innerText().catch(() => "")).replace(/\s+/g, " ");
      expect(/were not used/.test(seen), `the notice is not on screen: "${seen}"`);
      return `tier ${a1.tier_label}: ${machines(a1)}; truck ${JSON.stringify(ownOf(adt))}; screen note "${seen}"`;
    },
  },
]);

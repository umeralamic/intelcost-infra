// P-19: the app at phone width, and the settings tab row at every width.
//
//   docker compose --profile browser run --rm browser node scripts/p19.mjs
//
// At 375 x 667 and 1440 x 900, on the dashboard, every settings tab and Project Home:
// the page never scrolls sideways, the top bar fits the window, each dashboard project
// name has a line of its own at phone width and no short name is cut, every settings tab
// label sits on one line, the active tab is fully in view with its underline, and at
// 1440 every tab is visible without scrolling the row.

import { APP, SEEDED, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import { signInAt } from "./lib/realtime.mjs";
import { riverside } from "./lib/takeoff.mjs";

const token = await apiLogin();
const workspace = await firstWorkspace(token);
const r = await riverside(token, workspace.uuid);

const SETTINGS = ["account", "general", "members", "roles", "ownership", "statuses", "collaboration", "activity", "trash"];

/** What a person would see go wrong, measured. */
async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const header = document.querySelector("header");
    const nav = document.querySelector('nav[aria-label="Settings"]');
    const out = {
      sideways: doc.scrollWidth - window.innerWidth,
      header: header ? Math.round(header.scrollWidth - window.innerWidth) : null,
    };
    // Dashboard rows: how much of its row each project name gets, and which names are
    // cut short. A name that fits the window must not be truncated to a few letters.
    const names = [...document.querySelectorAll("li[data-project] > div > a")];
    if (names.length) {
      out.nameShare = Math.min(...names.map((a) => a.clientWidth / a.closest("li").clientWidth));
      out.cutNames = names
        .filter((a) => a.scrollWidth > a.clientWidth + 1 && (a.textContent ?? "").length <= 30)
        .map((a) => a.textContent);
    }
    if (nav) {
      const tabs = [...nav.querySelectorAll("a")];
      const one = Math.min(...tabs.map((t) => t.getBoundingClientRect().height));
      const active = nav.querySelector('a[aria-current="page"]');
      const nb = nav.getBoundingClientRect();
      const ab = active?.getBoundingClientRect();
      out.wrapped = tabs.filter((t) => t.getBoundingClientRect().height > one + 2).map((t) => t.textContent);
      out.rowOverflow = Math.round(nav.scrollWidth - nav.clientWidth);
      out.activeInView = ab ? ab.left >= nb.left - 1 && ab.right <= nb.right + 1 : null;
      out.underline = active ? getComputedStyle(active).borderBottomWidth : null;
      out.underlineVisible = ab ? ab.bottom <= nb.bottom + 0.5 : null;
    }
    return out;
  });
}

const steps = [];
for (const [w, h] of [[375, 667], [1440, 900]]) {
  steps.push({
    title: `${w}x${h}: dashboard, every settings tab and Project Home fit the window`,
    run: async ({ page, shot }) => {
      await page.setViewportSize({ width: w, height: h });
      await signInAt(page, APP, SEEDED.email, SEEDED.password);
      const problems = [];
      const seen = {};
      const visit = async (label, path) => {
        await page.goto(`${APP}${path}`);
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(600);
        const m = await measure(page);
        seen[label] = m;
        if (m.sideways > 0) problems.push(`${label}: page scrolls sideways by ${m.sideways}px`);
        if (m.header > 0) problems.push(`${label}: top bar overflows by ${m.header}px`);
        if (m.wrapped?.length) problems.push(`${label}: tab labels wrap: ${m.wrapped.join(", ")}`);
        if (m.activeInView === false) problems.push(`${label}: the active tab is out of view`);
        if (m.underlineVisible === false) problems.push(`${label}: the active tab's underline is clipped`);
        if (w >= 1440 && m.rowOverflow > 0) problems.push(`${label}: at desktop the tab row overflows by ${m.rowOverflow}px`);
        if (m.cutNames?.length) problems.push(`${label}: project names cut short: ${m.cutNames.join(", ")}`);
        if (w < 640 && m.nameShare !== undefined && m.nameShare < 0.8) {
          problems.push(`${label}: a project name gets ${Math.round(m.nameShare * 100)}% of its row at ${w}px`);
        }
      };
      await visit("dashboard", "/");
      for (const tab of SETTINGS) await visit(tab, `/settings/${tab}`);
      await page.goto(`${APP}/settings/collaboration`);
      await page.waitForTimeout(500);
      await page.screenshot({ path: shot.replace(".png", "-settings.png") });
      await visit("project home", `/project/${r.project}`);
      await page.screenshot({ path: shot.replace(".png", "-home.png"), fullPage: false });
      await page.goto(`${APP}/`);
      await page.waitForTimeout(500);
      await page.screenshot({ path: shot.replace(".png", "-dashboard.png") });
      expect(problems.length === 0, problems.join(" · "));
      const s = seen.collaboration;
      const d = seen.dashboard;
      return `no sideways scroll, top bar fits; project names get ${Math.round((d.nameShare ?? 0) * 100)}%+ of their row, none cut; settings row overflow ${s.rowOverflow}px (${w < 1440 ? "scrolls" : "none"}), active tab in view, underline ${s.underline}`;
    },
  });
}

await run("p19", steps);

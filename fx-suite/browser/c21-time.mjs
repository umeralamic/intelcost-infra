// C21, the founder's click check of Reports, Shifts, Time Tracking and Clock in (F15 first slice,
// D-146): Settings › Shifts adds a shift and sets it as a role's default (a Takeoff member who
// joins starts on it); Settings › Time Tracking turns manual clock in / out on; the takeoff
// header's Clock in runs, records a minute and clocks out; Reports › Per Project shows the time.
//
//   node fx-run-locked.mjs c21-time
//
// The world: one throwaway workspace and project with one page. Automatic tracking is switched
// off in the same save, so the time Reports shows is the manual timer's alone. The heartbeat
// writes once a minute, so the clock-in step waits for that write (about 60 s), not a clock.
//
// Left for the founder's eye: the shift dialog's preview and timezone list, the Shift time column
// with "Compare to shift schedule" on, the Export of a time report, and idle against active.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";

const W = 1224;
const H = 792;
const { token, workspace, base } = await freshWorkspace("C21 Time");
const wsBase = base.replace(/\/project$/, "");
const project = await makeProject(token, base, { name: "Clocked one" });
let sheet;
let shiftUuid;
const SHIFT = "C21 Day";

async function settings(page, path) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/settings/${path}`);
}

await run("c21-time", [
  {
    title: "setup: one page in the project, so the takeoff header (and its Clock in) opens",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "T1.pdf", buffer: makePdf([{ width: W, height: H, label: "T1" }]), folder: "Plans" }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["T1.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      return `sheet ${sheet.uuid.slice(0, 8)}`;
    },
  },
  {
    title: "Settings › Shifts: New shift C21 Day, 07:00 to 15:30 with a 30 min break, Monday to Friday; listed, and the api holds it",
    run: async ({ page }) => {
      await settings(page, "shifts");
      await page.getByRole("button", { name: "New shift" }).click();
      const dialog = page.getByRole("dialog", { name: "New shift" });
      await dialog.waitFor();
      await dialog.getByPlaceholder("Night Shift").fill(SHIFT);
      await dialog.getByLabel("Start").fill("07:00");
      await dialog.getByLabel("End").fill("15:30");
      await dialog.getByLabel("Break (min)").fill("30");
      const preview = ((await dialog.locator("[data-shift-preview]").textContent()) ?? "").trim();
      await dialog.getByRole("button", { name: "Create shift" }).click();
      await dialog.waitFor({ state: "detached" });
      const row = page.locator(`[data-shift-row="${SHIFT}"]`);
      await row.waitFor({ timeout: 10000 });
      const shifts = await apiCall(token, "GET", `${wsBase}/shift`);
      const made = (shifts.body ?? []).find((s) => s.name === SHIFT);
      expect(made && made.start_time.startsWith("07:00") && made.end_time.startsWith("15:30") && made.break_minutes === 30 && made.working_days.join() === "1,2,3,4,5", `api: ${JSON.stringify(shifts.body)}`);
      shiftUuid = made.uuid;
      return `row "${((await row.textContent()) ?? "").replace(/\s+/g, " ").trim()}"; preview "${preview.replace(/\s+/g, " ")}"`;
    },
  },
  {
    title: "Settings › Shifts, Role defaults: Takeoff starts on C21 Day; kept after a reload; a Takeoff member who joins is on it",
    run: async ({ page }) => {
      await settings(page, "shifts");
      const select = page.getByLabel("Default shift for Takeoff", { exact: true });
      await select.waitFor({ timeout: 15000 });
      await select.selectOption({ label: SHIFT });
      await waitFor(async () => {
        const d = await apiCall(token, "GET", `${wsBase}/shift-default`);
        return (d.body ?? []).some((r) => r.role === "takeoff" && r.shift_uuid === shiftUuid) ? true : null;
      }, "the role default stored", 10000);
      await page.reload();
      await select.waitFor({ timeout: 15000 });
      // The select draws before the defaults load: wait for what it settles on.
      let kept;
      await waitFor(async () => {
        kept = await select.evaluate((s) => s.options[s.selectedIndex]?.text);
        return kept === SHIFT ? true : null;
      }, "the default after a reload", 15000).catch(() => {
        throw new Error(`after a reload: "${kept}"`);
      });
      const member = await seatedMember(token, workspace.uuid, "takeoff", "c21-shift");
      const members = await apiCall(token, "GET", `${wsBase}/member`);
      const joined = (members.body ?? []).find((m) => m.email === member.email);
      expect(joined && joined.shift_uuid === shiftUuid, `the joined member: ${JSON.stringify(joined)}`);
      return `Takeoff → ${kept} (after a reload); ${member.email.split("@")[0]} joined on it`;
    },
  },
  {
    title: "Settings › Time Tracking: Manual clock in / out on, automatic off, saved",
    run: async ({ page }) => {
      await settings(page, "time-tracking");
      const manual = page.getByRole("switch", { name: "Manual clock in / out" });
      const auto = page.getByRole("switch", { name: "App use (automatic)" });
      await manual.waitFor({ timeout: 15000 });
      if (!(await manual.isChecked())) await manual.check();
      if (await auto.isChecked()) await auto.uncheck();
      await page.getByRole("button", { name: "Save time settings" }).click();
      let s;
      await waitFor(async () => {
        s = (await apiCall(token, "GET", `${wsBase}/report-settings`)).body;
        return s?.track_manual === true && s?.track_auto === false ? true : null;
      }, "the settings stored", 10000).catch(() => {
        throw new Error(`api: ${JSON.stringify(s)}`);
      });
      return `track_manual ${s.track_manual}, track_auto ${s.track_auto}, idle threshold ${s.idle_threshold_minutes} min`;
    },
  },
  {
    title: "Clock in: the header's Clock in opens a manual session and counts; the first minute's write records active time; clicking again clocks out",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
      const chip = page.locator("[data-work-timer]");
      await chip.waitFor({ timeout: 30000 });
      expect(/Clock in/.test((await chip.textContent()) ?? ""), `the chip reads "${await chip.textContent()}"`);
      const opened = page.waitForResponse((r) => r.url().endsWith("/work-session") && r.request().method() === "POST", { timeout: 15000 });
      await chip.click();
      const open = await opened;
      const sent = JSON.parse(open.request().postData() ?? "{}");
      expect(open.status() === 201 || open.status() === 200, `open: ${open.status()}`);
      expect(sent.source === "manual" && sent.project_uuid === project.uuid, `open body ${JSON.stringify(sent)}`);
      // The heartbeat's first write lands a minute after the open; input keeps the minute active.
      const beat = page.waitForResponse((r) => /\/work-session\/[0-9a-f-]+$/.test(r.url()) && r.request().method() === "PATCH", { timeout: 90000 });
      const nudge = setInterval(() => void page.mouse.move(200 + Math.random() * 50, 300).catch(() => undefined), 10000);
      let first;
      try {
        first = await beat;
      } finally {
        clearInterval(nudge);
      }
      const counted = JSON.parse(first.request().postData() ?? "{}");
      expect(counted.active_seconds >= 55 && counted.ended === false, `first beat ${JSON.stringify(counted)}`);
      const ticking = ((await chip.textContent()) ?? "").trim();
      expect(/1m/.test(ticking), `the running chip reads "${ticking}"`);
      const closed = page.waitForResponse((r) => /\/work-session\/[0-9a-f-]+$/.test(r.url()) && r.request().method() === "PATCH" && JSON.parse(r.request().postData() ?? "{}").ended === true, { timeout: 15000 });
      await chip.click();
      await closed;
      await chip.filter({ hasText: "Clock in" }).waitFor({ timeout: 10000 });
      return `opened (manual); first write ${counted.active_seconds} s active; chip "${ticking}"; clocked out`;
    },
  },
  {
    title: "Reports › Per Project: Clocked one shows about a minute tracked and active; Per Estimator shows the same under the owner",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      await enterWorkspace(page, workspace.uuid);
      await page.goto(`${APP}/reports?tab=time&sub=project`);
      const row = page.locator(`[data-time-row="Clocked one"]`);
      await row.waitFor({ timeout: 20000 });
      const cells = (await row.locator("td").allTextContents()).map((t) => t.trim());
      const [tracked, active] = [cells[5], cells[6]];
      expect(/^1m$|^1m /.test(tracked) || /^\d+m/.test(tracked), `Tracked "${tracked}" in ${JSON.stringify(cells)}`);
      expect(active && active !== "0m" && active !== "—", `Active "${active}" in ${JSON.stringify(cells)}`);
      await page.locator("nav[aria-label='Time & Activities']").getByRole("button", { name: "Per Estimator" }).click();
      const people = await page.locator("[data-time-row]").count();
      expect(people === 1, `${people} estimator rows`);
      const who = ((await page.locator("[data-time-row]").first().locator("td").nth(5).textContent()) ?? "").trim();
      expect(who === tracked, `Per Estimator tracked "${who}", Per Project "${tracked}"`);
      return `Per Project: tracked ${tracked}, active ${active}; Per Estimator: ${who}`;
    },
  },
]);

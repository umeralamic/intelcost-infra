// F4-S5: the project list, its status tabs and their counts, and sort. With it, the
// dashboard half of S3 and S4 that Block B carried here.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s5.mjs
//
// Counts come from the api over every project, never from the page on screen, which is
// why step 6 makes 60 projects and looks at a page of 50.
//
// Updated 2026-10-24 (D-314, D-315): the projects list is the All projects dialog.
// - Step 2: the tab is the dialog's own state, not the address (D-314 2: "Its state is its own:
//   takeoff's ?tab= is not a status tab"), so "?tab=won survives a reload" is retired with it;
//   the Won tab is picked in the dialog and read as selected. A row's name opens the project in
//   takeoff and closes the dialog (D-314 2); Project Home was removed (D-315 3), so the row is
//   proved by the takeoff address and the tab title "<project> · Takeoff" (D-314 2).
// - Step 3: the sort is #all-projects-sort in the dialog; that it survives a reload is retired
//   with the address-held state (D-314 2).
// - Step 4: the filter is set in the dialog's Filters bar (Client), not by `?client=` in the
//   address (D-314 2); the empty answer is the same sentence.
// - Step 6: "Show more" is gone; rows load fifty at a time as the list scrolls (D-314 2), so the
//   list is scrolled to its end.
// - Steps 2, 3, 7: the status strip is the dialog's "Project status" tablist; the takeoff behind
//   the dialog has tablists of its own (D-314 2).

import { APP, apiCall, enterWorkspace, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard, rowNames, settle, tabStrip } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S5 list");
const statusPath = `/api/workspace/${workspace.uuid}/project-status`;

/** The All projects dialog (D-314), and its status tablist. */
const dialogOf = (page) => page.getByRole("dialog", { name: "All projects" });
const statusTabs = (page) => dialogOf(page).getByRole("tablist", { name: "Project status" });

const alpha = await makeProject(token, base, { name: "Alpha bidding", client_name: "Harbor Partners", project_type: "commercial", bid_due_date: "2026-11-02" });
await makeProject(token, base, { name: "Bravo submitted" }, "submitted");
await makeProject(token, base, { name: "Charlie won", bid_due_date: "2026-10-05" }, "won");

const count = (strip, label) => strip.find((t) => t.label === label)?.count;

await run("f4-s5", [
  {
    title: "AC1 — tabs read Active 2 (Submitted is open), Submitted 1, Won 1, All 3; each lists its own",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await settle(page);
      const strip = await tabStrip(page);
      const labels = strip.map((t) => t.label).join(",");
      expect(labels === "Active,Submitted,Won,Lost,Archived,All", `strip: ${labels}`);
      expect(count(strip, "Active") === 2 && count(strip, "Submitted") === 1, `counts ${JSON.stringify(strip)}`);
      // Active holds every open status, Submitted among them (legacy's default strip).
      expect(count(strip, "Won") === 1 && count(strip, "All") === 3, `counts ${JSON.stringify(strip)}`);
      await page.getByRole("tab", { name: /^Won/ }).click();
      expect((await rowNames(page)).join() === "Charlie won", `Won lists ${await rowNames(page)}`);
      await page.getByRole("tab", { name: /^Submitted/ }).click();
      expect((await rowNames(page)).join() === "Bravo submitted", `Submitted lists ${await rowNames(page)}`);
      return strip.map((t) => `${t.label} ${t.count}`).join(" · ");
    },
  },
  {
    title: "AC2/AC5 — the Won tab is picked; a row opens the project in takeoff; the row reads right",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=won");
      expect((await statusTabs(page).getByRole("tab", { selected: true }).innerText()).startsWith("Won"), "Won not selected");
      await statusTabs(page).getByRole("tab", { name: /^All/ }).click();
      await settle(page);
      const subtitle = await page.locator('li[data-project="Alpha bidding"] [data-subtitle]').innerText();
      expect(/Harbor Partners/.test(subtitle) && /Commercial/.test(subtitle) && /Bid due Nov 2, 2026/.test(subtitle), `subtitle: ${subtitle}`);
      expect(/Unassigned/.test(subtitle) && !/—/.test(subtitle), `subtitle: ${subtitle}`);
      await dialogOf(page).getByRole("button", { name: /^Alpha bidding/ }).click();
      await page.waitForURL(new RegExp(`/project/${alpha.uuid}/takeoff`), { timeout: 20000 });
      await dialogOf(page).waitFor({ state: "detached", timeout: 20000 });
      await page.waitForFunction(() => document.title.startsWith("Alpha bidding · Takeoff"), undefined, { timeout: 20000 });
      return `subtitle "${subtitle.replace(/\s+/g, " ")}" · row opens the project in takeoff, dialog closed`;
    },
  },
  {
    title: "AC7 — sort by Bid due: soonest first, no date last",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await page.selectOption("#all-projects-sort", "bid_due");
      const names = await rowNames(page);
      expect(names.join() === "Charlie won,Alpha bidding,Bravo submitted", `order: ${names}`);
      return names.join(" → ");
    },
  },
  {
    title: "AC3 — a new workspace says so; a filter that matches nothing says so",
    run: async ({ page }) => {
      const empty = await freshWorkspace("F4-S5 empty");
      await openDashboard(page, empty.workspace.uuid);
      await page.getByText("Click New project to start your first estimate.").waitFor({ timeout: 15000 });
      // Harbor Partners' one project is Alpha bidding, which is not Won: nothing matches.
      // Already signed in: switch workspace and reopen the dialog, as openDashboard does.
      await enterWorkspace(page, workspace.uuid);
      await page.goto(`${APP}/?projects=open`);
      await statusTabs(page).waitFor({ timeout: 20000 });
      await statusTabs(page).getByRole("tab", { name: /^Won/ }).click();
      await dialogOf(page).getByRole("button", { name: "Filters" }).click();
      await page.selectOption("#filter-client", "Harbor Partners");
      await page.getByText("No projects match the current filters.").waitFor({ timeout: 15000 });
      return "empty workspace and empty filter each explain themselves";
    },
  },
  {
    title: "AC4 — the api failing shows the error with a retry, not a blank card",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await page.route(/\/project\?/, (route) => route.abort());
      await page.getByRole("tab", { name: /^Won/ }).click();
      await page.getByText("That did not load").waitFor({ timeout: 20000 });
      await page.unroute(/\/project\?/);
      await page.getByRole("button", { name: "Try again" }).click();
      expect((await rowNames(page)).join() === "Charlie won", "retry did not load the list");
      return "error state · Try again recovers";
    },
  },
  {
    title: "AC6 — with 60 projects the All count reads 60 while the page holds 50; scrolling loads the rest",
    run: async ({ page }) => {
      const big = await freshWorkspace("F4-S5 sixty");
      await Promise.all(
        Array.from({ length: 60 }, (_, i) =>
          makeProject(big.token, big.base, { name: `P${String(i + 1).padStart(2, "0")}` }),
        ),
      );
      await openDashboard(page, big.workspace.uuid, undefined, "/?tab=all");
      await settle(page);
      expect(count(await tabStrip(page), "All") === 60, "All count is not 60");
      expect((await rowNames(page)).length === 50, "first page is not 50");
      await page.getByText("Showing 50 of 60").waitFor();
      // D-314 2: rows load fifty at a time as the list scrolls.
      await page.locator("li[data-project]").last().scrollIntoViewIfNeeded();
      await page.getByText("Showing 60 of 60").waitFor({ timeout: 20000 });
      await settle(page);
      expect((await rowNames(page)).length === 60, "scrolling did not load 60");
      return "All 60 · page 50 · scrolled → 60";
    },
  },
  {
    title: "Carried from S3/S4 — renamed tab and badge, custom status counted by meaning, saved strip drawn",
    run: async ({ page }) => {
      const s = await freshWorkspace("F4-S5 carried");
      const sp = `/api/workspace/${s.workspace.uuid}/project-status`;
      await apiCall(s.token, "PATCH", `${sp}/bidding`, { label: "Out to bid" });
      const custom = await apiCall(s.token, "POST", sp, { label: "Lost, price", color: "red", bucket: "closed", reports_as: "lost" });
      expect(custom.status === 201, `custom status: ${custom.status}`);
      await makeProject(s.token, s.base, { name: "On bid" });
      await makeProject(s.token, s.base, { name: "Priced out" }, custom.body.key);
      const saved = await apiCall(s.token, "PUT", `${sp}/tab`, {
        tabs: [
          { key: "hot", label: "Hot", status_keys: ["bidding", "revision_required"], is_visible: true },
          { key: "lost", label: "Lost", status_keys: ["lost", "no_bid"], is_visible: true },
          { key: "won", label: "Won", status_keys: ["won"], is_visible: false },
        ],
      });
      expect(saved.status === 200, `tabs: ${saved.status}`);

      await openDashboard(page, s.workspace.uuid, undefined, "/?tab=all");
      await settle(page);
      const strip = await tabStrip(page);
      expect(strip.map((t) => t.label).join() === "Hot,Lost,All", `strip: ${strip.map((t) => t.label)}`);
      expect(count(strip, "Hot") === 1 && count(strip, "Lost") === 1, `counts: ${JSON.stringify(strip)}`);
      const badge = await page.locator('li[data-project="On bid"] [data-status-picker]').innerText();
      expect(/Out to bid/.test(badge), `badge reads ${badge}`);
      const priced = await page.locator('li[data-project="Priced out"] [data-status-picker]').innerText();
      expect(/Lost, price/.test(priced), `custom badge reads ${priced}`);

      await apiCall(s.token, "PUT", `${sp}/tab`, { tabs: [] });
      await page.reload();
      await statusTabs(page).waitFor({ timeout: 20000 });
      await settle(page);
      const alone = await tabStrip(page);
      expect(alone.map((t) => t.label).join() === "All", `strip after emptying: ${alone.map((t) => t.label)}`);
      return "Hot 1 · Lost 1 (custom counted by meaning) · hidden Won absent · badge \"Out to bid\" · All alone";
    },
  },
]);

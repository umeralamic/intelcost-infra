// F4-S5: the project list, its status tabs and their counts, and sort. With it, the
// dashboard half of S3 and S4 that Block B carried here.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s5.mjs
//
// Counts come from the api over every project, never from the page on screen, which is
// why step 6 makes 60 projects and looks at a page of 50.

import { APP, apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard, rowNames, settle, tabStrip } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S5 list");
const statusPath = `/api/workspace/${workspace.uuid}/project-status`;

await makeProject(token, base, { name: "Alpha bidding", client_name: "Harbor Partners", project_type: "commercial", bid_due_date: "2026-11-02" });
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
    title: "AC2/AC5 — ?tab=won survives a reload; a row opens its Project Home; the row reads right",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=won");
      expect((await page.getByRole("tab", { selected: true }).innerText()).startsWith("Won"), "Won not selected");
      await page.goto(`${APP}/?tab=all`);
      await settle(page);
      const subtitle = await page.locator('li[data-project="Alpha bidding"] [data-subtitle]').innerText();
      expect(/Harbor Partners/.test(subtitle) && /Commercial/.test(subtitle) && /Bid due Nov 2, 2026/.test(subtitle), `subtitle: ${subtitle}`);
      expect(/Unassigned/.test(subtitle) && !/—/.test(subtitle), `subtitle: ${subtitle}`);
      await page.getByRole("link", { name: "Alpha bidding" }).click();
      await page.waitForURL(/\/project\/[0-9a-f-]{36}$/);
      await page.getByRole("heading", { name: "Alpha bidding" }).waitFor();
      return `subtitle "${subtitle.replace(/\s+/g, " ")}" · row opens Project Home`;
    },
  },
  {
    title: "AC7 — sort by Bid due: soonest first, no date last, and it survives a reload",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await page.selectOption("#project-sort", "bid_due");
      const names = await rowNames(page);
      expect(names.join() === "Charlie won,Alpha bidding,Bravo submitted", `order: ${names}`);
      await page.reload();
      await page.getByRole("tablist").waitFor();
      expect((await page.inputValue("#project-sort")) === "bid_due", "sort lost on reload");
      return names.join(" → ");
    },
  },
  {
    title: "AC3 — a new workspace says so; a filter that matches nothing says so",
    run: async ({ page }) => {
      const empty = await freshWorkspace("F4-S5 empty");
      await openDashboard(page, empty.workspace.uuid);
      await page.getByText("Click New project to start your first estimate.").waitFor({ timeout: 15000 });
      await page.goto(`${APP}/?tab=all&client=Nobody%20Inc`);
      await page.selectOption("header select", workspace.uuid).catch(() => {});
      await page.goto(`${APP}/?tab=all&client=Nobody%20Inc`);
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
    title: "AC6 — with 60 projects the All count reads 60 while the page holds 50; Show more loads the rest",
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
      await page.getByRole("button", { name: "Show more" }).click();
      await settle(page);
      expect((await rowNames(page)).length === 60, "Show more did not load 60");
      return "All 60 · page 50 · Show more → 60";
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
      await page.getByRole("tablist").waitFor();
      await settle(page);
      const alone = await tabStrip(page);
      expect(alone.map((t) => t.label).join() === "All", `strip after emptying: ${alone.map((t) => t.label)}`);
      return "Hot 1 · Lost 1 (custom counted by meaning) · hidden Won absent · badge \"Out to bid\" · All alone";
    },
  },
]);

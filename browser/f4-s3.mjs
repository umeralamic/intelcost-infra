// F4-S3: project statuses (F3-S20's first half, built in F4).
//
//   docker compose --profile browser run --rm browser node scripts/f4-s3.mjs
//
// Ten built-ins in two fixed buckets, renameable, recolourable, reorderable, hideable,
// never deletable. A workspace's own statuses each report as one built-in in their
// bucket. Deleting one that projects carry asks where they go and moves them first.
//
// Runs in a throwaway workspace: renaming Bidding in Bench Construction would change
// what every other fixture reads. The dashboard half of S3's criteria (tabs, row badges,
// the status changer) is carried to S5 and S9, where those controls are drawn; here the
// same rules are proved through the settings screen and the api.

import {
  APP,
  SEEDED,
  activity,
  apiCall,
  apiLogin,
  createWorkspace,
  expect,
  run,
  seatedMember,
  signInAs,
} from "./lib/bench.mjs";

const ownerToken = await apiLogin();
const workspace = await createWorkspace(ownerToken, `F4-S3 statuses ${Date.now()}`);
const statusPath = `/api/workspace/${workspace.uuid}/project-status`;
const projectPath = `/api/workspace/${workspace.uuid}/project`;
const estimator = await seatedMember(ownerToken, workspace.uuid, "estimator", "f4s3");

const ACTIVE = ["Bidding", "Revision Required", "Waiting on Quotes", "Submitted", "Change Order"];
const CLOSED = ["Won", "Lost", "No bid", "Cancelled", "Archived"];

async function statuses() {
  const response = await apiCall(ownerToken, "GET", statusPath);
  expect(response.status === 200, `status list: ${response.status}`);
  return response.body;
}

async function project(tag, statusKey) {
  const made = await apiCall(ownerToken, "POST", projectPath, { name: `F4-S3 ${tag} ${Date.now()}` });
  expect(made.status === 201, `project: ${made.status}`);
  if (!statusKey) return made.body;
  const moved = await apiCall(ownerToken, "PATCH", `${projectPath}/${made.body.uuid}`, {
    status_key: statusKey,
  });
  expect(moved.status === 200, `put on ${statusKey}: ${moved.status} ${JSON.stringify(moved.body)}`);
  return moved.body;
}

/** The owner, on this fixture's workspace, on the Statuses page. */
async function openStatuses(page, email = SEEDED.email) {
  await signInAs(page, email, SEEDED.password);
  await page.selectOption("header select", workspace.uuid).catch(() => {});
  await page.goto(`${APP}/settings/statuses`);
  await page.getByRole("heading", { name: "Project statuses" }).waitFor({ timeout: 20000 });
  await page.locator("li[data-status]").first().waitFor();
}

const rowLabels = (page, bucketIndex) =>
  page
    .locator("#statuses-heading ~ div")
    .nth(bucketIndex)
    .locator("li[data-status] > span:first-child")
    .allInnerTexts();

await run("f4-s3", [
  {
    title: "AC1 — Active and Closed hold the ten built-ins, in shipped order and colour",
    run: async ({ page }) => {
      await openStatuses(page);
      const active = await rowLabels(page, 0);
      const closed = await rowLabels(page, 1);
      expect(active.join("|") === ACTIVE.join("|"), `active: ${active.join(", ")}`);
      expect(closed.join("|") === CLOSED.join("|"), `closed: ${closed.join(", ")}`);
      const bidding = page.locator('li[data-status="bidding"] > span').first();
      const won = page.locator('li[data-status="won"] > span').first();
      const [blue, green] = await Promise.all([
        bidding.evaluate((el) => getComputedStyle(el).color),
        won.evaluate((el) => getComputedStyle(el).color),
      ]);
      expect(blue !== green && blue !== "rgba(0, 0, 0, 0)", `badge colours ${blue} / ${green}`);
      return `active ${active.length} · closed ${closed.length} · Bidding ${blue}, Won ${green}`;
    },
  },
  {
    title: "AC2 — rename Bidding to \"Out to bid\"; a second tab sees it on focus",
    run: async ({ page, context }) => {
      await openStatuses(page);
      const other = await context.newPage();
      await other.goto(`${APP}/settings/statuses`);
      await other.locator('li[data-status="bidding"]').waitFor({ timeout: 20000 });

      await page.getByRole("button", { name: "Edit Bidding" }).click();
      await page.getByRole("dialog", { name: "Edit status" }).waitFor();
      await page.getByText("Renaming is display only. Reporting keeps the original meaning.").waitFor();
      expect((await page.locator("#status-reports-as").count()) === 0, "a built-in offers Reports as");
      await page.fill("#status-label", "Out to bid");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.locator('li[data-status="bidding"]', { hasText: "Out to bid" }).waitFor();

      // Focus as a browser reports it, the way f3-s8 does. TanStack Query v5 listens for
      // `visibilitychange` on window, and a synthetic event on document never reaches it.
      await other.bringToFront();
      await other.evaluate(() => {
        window.dispatchEvent(new Event("visibilitychange"));
        document.dispatchEvent(new Event("visibilitychange"));
        window.dispatchEvent(new Event("focus"));
      });
      await other.locator('li[data-status="bidding"]', { hasText: "Out to bid" }).waitFor({ timeout: 10000 });
      const read = (await statuses()).find((s) => s.key === "bidding");
      expect(read.label === "Out to bid" && read.reports_as === "bidding", `api: ${JSON.stringify(read)}`);
      return "renamed in the list · second tab updated on focus · still reports as bidding";
    },
  },
  {
    title: "AC3 — a closed \"Lost, price\" reporting as Lost; a project put on it reports lost",
    run: async ({ page }) => {
      await openStatuses(page);
      await page.getByRole("button", { name: "Add closed status" }).click();
      await page.getByRole("dialog", { name: "Add status" }).waitFor();
      await page.fill("#status-label", "Lost, price");
      await page.selectOption("#status-color", "red");
      await page.selectOption("#status-reports-as", "lost");
      const offered = await page.locator("#status-reports-as option").allInnerTexts();
      expect(offered.every((o) => !/Bidding|Submitted/.test(o)), `closed offers ${offered.join(", ")}`);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      const row = page.locator('li[data-status="c_lost_price"]');
      await row.waitFor({ timeout: 10000 });
      await row.getByText("custom, counts as Lost").waitFor();

      const put = await project("lost-price", "c_lost_price");
      expect(put.status === "lost" && put.custom_status_key === "c_lost_price", `project: ${put.status}/${put.custom_status_key}`);
      await page.reload();
      await page.locator('li[data-status="c_lost_price"]', { hasText: "1 project" }).waitFor({ timeout: 10000 });
      return "created in Closed · reports as lost · the project carries it · count reads 1";
    },
  },
  {
    title: "AC4 — reorder within a bucket; it holds across a reload and never crosses buckets",
    run: async ({ page }) => {
      await openStatuses(page);
      await page.getByRole("button", { name: "Move Revision Required up" }).click();
      await page.waitForFunction(() =>
        document.querySelector("li[data-status]")?.getAttribute("data-status") === "revision_required",
      );
      await page.reload();
      await page.locator("li[data-status]").first().waitFor();
      const active = await rowLabels(page, 0);
      expect(active[0] === "Revision Required", `after reload, first is ${active[0]}`);
      // Scoped: the tab strip below has a tab called Won with its own "Move Won up".
      const card = page.locator('section[aria-labelledby="statuses-heading"]');
      const wonUp = card.getByRole("button", { name: "Move Won up" });
      expect(await wonUp.isDisabled(), "the top Closed status can move up into Active");
      const lastActiveDown = card.getByRole("button", { name: `Move ${active[active.length - 1]} down` });
      expect(await lastActiveDown.isDisabled(), "the bottom Active status can move down into Closed");
      return `active now: ${active.join(", ")}`;
    },
  },
  {
    title: "AC5 — hide Change Order: marked hidden, not assignable, kept by projects already on it",
    run: async ({ page }) => {
      const keeper = await project("keeps-change-order", "change_order");
      await openStatuses(page);
      await page.getByRole("button", { name: "Hide Change Order" }).click();
      await page.locator('li[data-status="change_order"]', { hasText: "hidden" }).waitFor({ timeout: 10000 });

      const fresh = await project("wants-change-order");
      const refused = await apiCall(ownerToken, "PATCH", `${projectPath}/${fresh.uuid}`, {
        status_key: "change_order",
      });
      expect(refused.status === 409, `assigning a hidden status: ${refused.status}`);
      expect(/hidden/.test(refused.body?.detail ?? ""), `refusal: ${refused.body?.detail}`);
      const kept = await apiCall(ownerToken, "GET", `${projectPath}/${keeper.uuid}`);
      expect(kept.body.status === "change_order", `the keeper moved to ${kept.body.status}`);
      return `hidden · assignment refused: "${refused.body.detail}" · keeper still on change_order`;
    },
  },
  {
    title: "AC6 — a built-in has no Delete, and a hand-written delete is refused",
    run: async ({ page }) => {
      await openStatuses(page);
      expect((await page.getByRole("button", { name: /^Delete (Out to bid|Won|Lost)$/ }).count()) === 0, "a built-in offers Delete");
      const refused = await apiCall(ownerToken, "DELETE", `${statusPath}/won`);
      expect(refused.status === 409, `DELETE won: ${refused.status}`);
      expect(refused.body?.detail === "A built-in status can be hidden, not deleted.", `refusal: ${refused.body?.detail}`);
      return "no control · api 409 in words";
    },
  },
  {
    title: "AC7 — deleting a status two projects carry asks where they go, then moves them",
    run: async ({ page }) => {
      const made = await apiCall(ownerToken, "POST", statusPath, {
        label: "Awaiting drawings",
        color: "yellow",
        bucket: "active",
        reports_as: "bidding",
      });
      expect(made.status === 201, `create: ${made.status}`);
      const a = await project("awaiting-a", made.body.key);
      const b = await project("awaiting-b", made.body.key);

      await openStatuses(page);
      await page.getByRole("button", { name: "Delete Awaiting drawings" }).click();
      await page.getByRole("dialog", { name: 'Delete "Awaiting drawings"' }).waitFor();
      await page.getByText("2 projects are currently on this status. Pick where they should move.").waitFor();
      const chosen = await page.inputValue("#status-move-to");
      const target = (await statuses()).find((s) => s.key === chosen);
      expect(target?.bucket === "active", `default target ${chosen} is ${target?.bucket}`);
      await page.getByRole("button", { name: "Delete status" }).click();
      await page.getByText(`Status deleted. 2 projects moved to ${target.label}.`).waitFor({ timeout: 10000 });

      for (const p of [a, b]) {
        const now = (await apiCall(ownerToken, "GET", `${projectPath}/${p.uuid}`)).body;
        const key = now.custom_status_key ?? now.status;
        expect(key === chosen, `${p.name} is on ${key}, not ${chosen}`);
      }
      expect(!(await statuses()).some((s) => s.key === made.body.key), "the status survived");
      return `default ${target.label} (active) · both moved · status gone · toast in words`;
    },
  },
  {
    title: "AC8/AC12 — a duplicate name is refused, and a meaning cannot cross its bucket",
    run: async ({ page }) => {
      await openStatuses(page);
      await page.getByRole("button", { name: "Add closed status" }).click();
      await page.fill("#status-label", "won");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.getByRole("dialog").getByText("A status with that name already exists.").waitFor({ timeout: 10000 });

      const crossed = await apiCall(ownerToken, "POST", statusPath, {
        label: "Sure thing",
        color: "green",
        bucket: "active",
        reports_as: "won",
      });
      expect(crossed.status === 422, `active reporting as won: ${crossed.status}`);
      expect(
        crossed.body?.detail === "An active status must report as one of the active statuses.",
        `refusal: ${crossed.body?.detail}`,
      );
      return "duplicate refused in the dialog · Active-as-Won refused 422";
    },
  },
  {
    title: "AC11 — hiding the last visible status in a bucket is refused",
    run: async () => {
      const closed = (await statuses()).filter((s) => s.bucket === "closed" && !s.is_hidden);
      for (const s of closed.slice(1)) {
        const hid = await apiCall(ownerToken, "PATCH", `${statusPath}/${s.key}`, { is_hidden: true });
        expect(hid.status === 200, `hide ${s.key}: ${hid.status}`);
      }
      const last = await apiCall(ownerToken, "PATCH", `${statusPath}/${closed[0].key}`, { is_hidden: true });
      expect(last.status === 409, `hiding the last closed status: ${last.status}`);
      expect(/Keep at least one closed status visible/.test(last.body?.detail ?? ""), `refusal: ${last.body?.detail}`);
      for (const s of closed.slice(1)) {
        await apiCall(ownerToken, "PATCH", `${statusPath}/${s.key}`, { is_hidden: false });
      }
      return `"${last.body.detail}"`;
    },
  },
  {
    title: "AC9 — an estimator reads the page with no controls, and the api refuses the edit",
    run: async ({ page }) => {
      await openStatuses(page, estimator.email);
      await page.getByText("You can read this, but not change it.").waitFor({ timeout: 10000 });
      expect((await page.getByRole("button", { name: /Add (active|closed) status/ }).count()) === 0, "Add offered");
      expect((await page.getByRole("button", { name: /^Edit / }).count()) === 0, "Edit offered");
      const post = await apiCall(estimator.token, "POST", statusPath, {
        label: "Sneaky",
        color: "blue",
        bucket: "active",
        reports_as: "bidding",
      });
      expect(post.status === 403, `estimator create: ${post.status}`);
      expect(post.body?.detail === "Your role cannot change workspace settings.", `refusal: ${post.body?.detail}`);
      return "read-only note · no controls · api 403 in words";
    },
  },
  {
    title: "AC10 — every edit leaves one row in the activity feed, as a sentence",
    run: async ({ page }) => {
      const feed = await activity(ownerToken, workspace.uuid, { limit: 100 });
      const actions = new Set(feed.body.items.map((row) => row.action));
      for (const action of ["status.updated", "status.created", "status.reordered", "status.hidden", "status.deleted"]) {
        expect(actions.has(action), `no ${action} in the feed`);
      }
      await signInAs(page, SEEDED.email, SEEDED.password);
      await page.selectOption("header select", workspace.uuid).catch(() => {});
      await page.goto(`${APP}/settings/activity`);
      await page.getByText("changed the project status Out to bid").waitFor({ timeout: 20000 });
      await page.getByText("added the project status Lost, price").waitFor();
      await page.getByText("hid the project status Change Order").waitFor();
      await page.getByText(/deleted the project status Awaiting drawings, moving 2 projects to/).waitFor();
      return `${feed.body.items.length} rows · created, updated, reordered, hidden, deleted all present and in words`;
    },
  },
]);

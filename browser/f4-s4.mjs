// F4-S4: the dashboard tab strip (F3-S20's second half, built in F4).
//
//   docker compose --profile browser run --rm browser node scripts/f4-s4.mjs
//
// The default tabs everyone sees: Active, Submitted, Won, Lost, Archived, then All. A
// workspace adds, renames, reorders, hides and removes tabs, and picks each tab's
// statuses. All is always shown, always last, and not the workspace's to change.
//
// The strip is saved whole, All included, and that is what step 7 is for: a strip saved
// down to All alone must stay that way rather than read as "never saved" and bring the
// defaults back. The dashboard drawing the strip is S5; it is carried there.
//
// A throwaway workspace per run, so the strip starts at the defaults every time.

import {
  APP,
  SEEDED,
  apiCall,
  apiLogin,
  createWorkspace,
  expect,
  run,
  seatedMember,
  signInAs,
} from "./lib/bench.mjs";

const ownerToken = await apiLogin();
const workspace = await createWorkspace(ownerToken, `F4-S4 tabs ${Date.now()}`);
const tabPath = `/api/workspace/${workspace.uuid}/project-status/tab`;
const statusPath = `/api/workspace/${workspace.uuid}/project-status`;
const estimator = await seatedMember(ownerToken, workspace.uuid, "estimator", "f4s4");

const DEFAULTS = ["Active", "Submitted", "Won", "Lost", "Archived", "All"];

async function tabs(token = ownerToken) {
  const response = await apiCall(token, "GET", tabPath);
  expect(response.status === 200, `tabs: ${response.status}`);
  return response.body;
}

async function openTabs(page, email = SEEDED.email) {
  await signInAs(page, email, SEEDED.password);
  await page.selectOption("header select", workspace.uuid).catch(() => {});
  await page.goto(`${APP}/settings/statuses`);
  await page.getByRole("heading", { name: "Dashboard tabs" }).waitFor({ timeout: 20000 });
  await page.locator("li[data-tab]").first().waitFor();
}

const card = (page) => page.locator('section[aria-labelledby="tabs-heading"]');
const tabNames = async (page) => {
  const inputs = card(page).locator('li[data-tab] input[aria-label^="Tab name"]');
  return inputs.evaluateAll((els) => els.map((el) => el.value));
};

async function saveAndReload(page) {
  await card(page).getByRole("button", { name: "Save tabs" }).click();
  await page.getByText("Dashboard tabs saved").waitFor({ timeout: 10000 });
  await page.reload();
  await card(page).locator("li[data-tab]").first().waitFor({ timeout: 20000 });
}

await run("f4-s4", [
  {
    title: "Defaults — a workspace that never saved sees the shipped strip, All last",
    run: async ({ page }) => {
      const shipped = (await tabs()).map((t) => t.label);
      expect(shipped.join("|") === DEFAULTS.join("|"), `api: ${shipped.join(", ")}`);
      await openTabs(page);
      const shown = await tabNames(page);
      expect(shown.join("|") === DEFAULTS.slice(0, -1).join("|"), `screen: ${shown.join(", ")}`);
      await card(page).getByText("Every project. Always shown, always last.").waitFor();
      return shipped.join(", ");
    },
  },
  {
    title: "AC1 — add \"Hot\" holding Bidding and Revision Required; it survives a reload",
    run: async ({ page }) => {
      await openTabs(page);
      await card(page).getByRole("button", { name: "Add tab" }).click();
      const row = card(page).locator("li[data-tab]").last();
      await row.locator('input[aria-label^="Tab name"]').fill("Hot");
      await row.getByLabel("Bidding").check();
      await row.getByLabel("Revision Required").check();
      await saveAndReload(page);
      const hot = (await tabs()).find((t) => t.label === "Hot");
      expect(hot, "Hot not stored");
      expect(
        [...hot.status_keys].sort().join(",") === "bidding,revision_required",
        `Hot holds ${hot.status_keys}`,
      );
      expect(hot.key.startsWith("tab_"), `new tab key ${hot.key}`);
      expect((await tabNames(page)).includes("Hot"), "Hot not on screen after reload");
      return `stored as ${hot.key} · ${hot.status_keys.join(", ")}`;
    },
  },
  {
    title: "AC2 — rename and move up; the new name and order hold after a reload",
    run: async ({ page }) => {
      await openTabs(page);
      const hotRow = card(page).locator('li[data-tab="Hot"]');
      await hotRow.locator('input[aria-label^="Tab name"]').fill("Hot bids");
      const moveUp = card(page).getByRole("button", { name: "Move Hot bids up" });
      await moveUp.click();
      await moveUp.click();
      await saveAndReload(page);
      const names = await tabNames(page);
      expect(names.join("|") === "Active|Submitted|Won|Hot bids|Lost|Archived", `order: ${names.join(", ")}`);
      const labels = (await tabs()).map((t) => t.label);
      expect(labels.at(-1) === "All", `All is not last: ${labels.join(", ")}`);
      return names.join(", ");
    },
  },
  {
    title: "AC3/AC4 — hide Won and remove Archived: saved as hidden, and gone",
    run: async ({ page }) => {
      await openTabs(page);
      await card(page).locator('li[data-tab="Won"]').getByLabel("Shown").uncheck();
      await card(page).getByRole("button", { name: "Remove Archived" }).click();
      expect(!(await tabNames(page)).includes("Archived"), "Archived still in the draft");
      await card(page).getByText("Unsaved changes").waitFor();
      await saveAndReload(page);
      const stored = await tabs();
      const won = stored.find((t) => t.label === "Won");
      expect(won && won.is_visible === false, `Won: ${JSON.stringify(won)}`);
      expect(!stored.some((t) => t.label === "Archived"), "Archived survived the save");
      const shown = await card(page).locator('li[data-tab="Won"]').getByLabel("Shown").isChecked();
      expect(!shown, "Won reads shown in settings after reload");
      return `Won hidden and still listed · Archived removed · ${stored.map((t) => t.label).join(", ")}`;
    },
  },
  {
    title: "AC5 — All has no controls, and a save that sends All leaves it last and shown",
    run: async ({ page }) => {
      await openTabs(page);
      const allRow = card(page).locator("li:not([data-tab])").last();
      await allRow.getByText("Every project. Always shown, always last.").waitFor();
      expect((await allRow.locator("button, input").count()) === 0, "the All row has controls");

      const current = (await tabs()).filter((t) => t.key !== "all");
      const sneak = await apiCall(ownerToken, "PUT", tabPath, {
        tabs: [
          { key: "all", label: "Everything", status_keys: ["won"], is_visible: false },
          ...current.map(({ key, label, status_keys, is_visible }) => ({ key, label, status_keys, is_visible })),
        ],
      });
      expect(sneak.status === 200, `save with All: ${sneak.status} ${JSON.stringify(sneak.body)}`);
      const last = sneak.body.at(-1);
      expect(
        last.key === "all" && last.label === "All" && last.is_visible && last.status_keys === null,
        `All came back as ${JSON.stringify(last)}`,
      );
      return "no controls on All · a hand-written All is ignored, All stays last, shown, unfiltered";
    },
  },
  {
    title: "AC8 — a tab with no statuses, and two tabs with one name, are refused in words",
    run: async ({ page }) => {
      const empty = await apiCall(ownerToken, "PUT", tabPath, {
        tabs: [{ key: null, label: "Nothing", status_keys: [], is_visible: true }],
      });
      expect(empty.status === 422, `empty tab: ${empty.status}`);
      expect(empty.body?.detail === '"Nothing" needs at least one status.', `refusal: ${empty.body?.detail}`);
      const twins = await apiCall(ownerToken, "PUT", tabPath, {
        tabs: [
          { key: null, label: "Twin", status_keys: ["won"], is_visible: true },
          { key: null, label: "twin", status_keys: ["lost"], is_visible: true },
        ],
      });
      expect(twins.status === 409, `twins: ${twins.status}`);

      await openTabs(page);
      await card(page).getByRole("button", { name: "Add tab" }).click();
      await card(page).getByRole("button", { name: "Save tabs" }).click();
      await card(page).getByText('"New tab" needs at least one status.').waitFor({ timeout: 10000 });
      return `"${empty.body.detail}" · "${twins.body.detail}" · the screen shows the refusal`;
    },
  },
  {
    title: "AC9 — deleting a custom status takes it out of the tabs that held it",
    run: async () => {
      const made = await apiCall(ownerToken, "POST", statusPath, {
        label: "Pre-bid walk",
        color: "blue",
        bucket: "active",
        reports_as: "bidding",
      });
      expect(made.status === 201, `status: ${made.status}`);
      const key = made.body.key;
      const saved = await apiCall(ownerToken, "PUT", tabPath, {
        tabs: [
          { key: "walks", label: "Walks", status_keys: [key], is_visible: true },
          { key: "early", label: "Early", status_keys: [key, "bidding"], is_visible: true },
        ],
      });
      expect(saved.status === 200, `tabs: ${saved.status} ${JSON.stringify(saved.body)}`);
      const gone = await apiCall(ownerToken, "DELETE", `${statusPath}/${key}`);
      expect(gone.status === 200, `delete: ${gone.status} ${JSON.stringify(gone.body)}`);
      const after = await tabs();
      expect(!after.some((t) => t.key === "walks"), "a tab holding only the deleted status survived");
      const early = after.find((t) => t.key === "early");
      expect(early && early.status_keys.join(",") === "bidding", `Early holds ${early?.status_keys}`);
      return `Walks removed · Early now holds ${early.status_keys.join(", ")}`;
    },
  },
  {
    title: "AC7 — a strip saved down to All alone stays that way; the defaults do not return",
    run: async ({ page }) => {
      const saved = await apiCall(ownerToken, "PUT", tabPath, { tabs: [] });
      expect(saved.status === 200, `empty save: ${saved.status}`);
      const after = await tabs();
      expect(after.length === 1 && after[0].key === "all", `after: ${after.map((t) => t.label).join(", ")}`);
      await openTabs(page).catch(() => {});
      await page.getByRole("heading", { name: "Dashboard tabs" }).waitFor({ timeout: 20000 });
      expect((await tabNames(page)).length === 0, "the screen still lists tabs");
      return "All alone, stored and on screen";
    },
  },
  {
    title: "AC6 — an estimator reads the strip with no controls, and the api refuses a save",
    run: async ({ page }) => {
      await apiCall(ownerToken, "PUT", tabPath, {
        tabs: [{ key: "won", label: "Won", status_keys: ["won"], is_visible: true }],
      });
      await openTabs(page, estimator.email);
      expect((await card(page).getByRole("button", { name: "Save tabs" }).count()) === 0, "Save offered");
      expect((await card(page).getByRole("button", { name: "Add tab" }).count()) === 0, "Add offered");
      const input = card(page).locator('input[aria-label^="Tab name"]').first();
      expect(await input.isDisabled(), "the tab name is editable");
      const put = await apiCall(estimator.token, "PUT", tabPath, { tabs: [] });
      expect(put.status === 403, `estimator save: ${put.status}`);
      expect(put.body?.detail === "Your role cannot change workspace settings.", `refusal: ${put.body?.detail}`);
      return "read-only · api 403 in words";
    },
  },
]);

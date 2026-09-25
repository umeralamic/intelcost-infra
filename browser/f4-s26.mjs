// F4-S26: Settings > Trash. List, restore, delete permanently, and who may.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s26.mjs
//
// AC2 ("at the next daily purge", 31 days on) needs the database to age a row, so it is
// driven by f4-s27.sh, which already ages projects for the nightly job.

import { APP, apiCall, expect, members, run, seatedMember } from "./lib/bench.mjs";
import { folderPaths, freshWorkspace, makeProject, openDashboard, rowNames, seedFile } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S26 trash");
const empty = await freshWorkspace("F4-S26 empty");
const estimator = await seatedMember(token, workspace.uuid, "estimator", "f4s26");
const me = (await members(token, workspace.uuid)).find((m) => m.role === "owner");

const kept = await makeProject(token, base, { name: "Harbor restore", client_name: "Pier Co" }, "submitted");
await apiCall(token, "PUT", `${base}/${kept.uuid}/assignee`, { user_uuids: [me.user_uuid] });
const doomed = await makeProject(token, base, { name: "Harbor purge" });
const live = await makeProject(token, base, { name: "Harbor live" });

const trashUrl = `${base}/trash`;
const trashed = async () => (await apiCall(token, "GET", trashUrl)).body;

/** On Settings > Trash, its list or its empty state drawn. Signs in unless told the page
 *  already is: a second visit to /login on a signed-in page is redirected away. */
async function openTrash(page, ws = workspace.uuid, { signedIn = false } = {}) {
  if (!signedIn) await openDashboard(page, ws);
  await page.goto(`${APP}/settings/trash`);
  await page.getByRole("heading", { name: "Trash", exact: true }).waitFor({ timeout: 20000 });
  await page.locator("[data-trash-list]").or(page.getByText("Trash is empty")).first().waitFor({ timeout: 20000 });
}

let keptFile;
let doomedUrl;

await run("f4-s26", [
  {
    title: "AC7 — an empty trash says so",
    run: async ({ page }) => {
      await openTrash(page, empty.workspace.uuid);
      await page.getByText("Deleted projects appear here for recovery.").waitFor();
      return "Trash is empty · Deleted projects appear here for recovery.";
    },
  },
  {
    title: "AC1 — trash two projects: both listed, newest first, \"Permanently deleted in 30 days\"",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      const plans = (await folderPaths(token, base, kept.uuid)).get("Plans");
      keptFile = await seedFile(page, token, base, kept.uuid, plans.uuid, "A-101.pdf", Buffer.alloc(4096, 7));
      const specs = (await folderPaths(token, base, doomed.uuid)).get("Specs");
      const file = await seedFile(page, token, base, doomed.uuid, specs.uuid, "S-1.pdf", Buffer.alloc(4096, 8));
      doomedUrl = (await apiCall(token, "GET", `${base}/${doomed.uuid}/file/${file.uuid}/download`)).body.url;
      expect((await apiCall(token, "DELETE", `${base}/${kept.uuid}`)).status === 200, "trash kept");
      await page.waitForTimeout(50);
      expect((await apiCall(token, "DELETE", `${base}/${doomed.uuid}`)).status === 200, "trash doomed");

      await openTrash(page, workspace.uuid, { signedIn: true });
      const rows = await page.locator("[data-trash-row]").evaluateAll((els) => els.map((el) => el.getAttribute("data-trash-row")));
      expect(rows.join() === "Harbor purge,Harbor restore", `rows: ${rows.join(", ")}`);
      const fates = await page.locator("[data-trash-fate]").allInnerTexts();
      expect(fates.every((t) => t === "Permanently deleted in 30 days"), `fates: ${fates.join(" | ")}`);
      const line = await page.locator('[data-trash-row="Harbor restore"]').innerText();
      expect(/Pier Co/.test(line) && /Deleted .+ by /.test(line), `row: ${line}`);
      return `${rows.join(", ")} · ${fates[0]}`;
    },
  },
  {
    title: "AC3 — Restore: back on the dashboard with its status, assignee, folders and file",
    run: async ({ page }) => {
      await openTrash(page);
      await page.getByRole("button", { name: "Restore Harbor restore" }).click();
      await page.getByText("Project restored").waitFor({ timeout: 10000 });
      await page.locator('[data-trash-row="Harbor restore"]').waitFor({ state: "detached" });
      const back = (await apiCall(token, "GET", `${base}/${kept.uuid}`)).body;
      expect(back.status === "submitted", `status ${back.status}`);
      expect(back.assignee_uuids?.[0] === me.user_uuid, `assignees ${JSON.stringify(back.assignee_uuids)}`);
      const folders = [...(await folderPaths(token, base, kept.uuid)).keys()].sort().join();
      expect(folders === "Plans,Reports,Site Photos,Specs", `folders ${folders}`);
      const files = (await apiCall(token, "GET", `${base}/${kept.uuid}/file`)).body;
      expect(files.length === 1 && files[0].uuid === keptFile.uuid, `files ${files.length}`);
      await page.goto(`${APP}/?tab=all`);
      expect((await rowNames(page)).includes("Harbor restore"), "not on the dashboard");
      return "Submitted · assigned · 4 folders · A-101.pdf · on the dashboard";
    },
  },
  {
    title: "AC4 — Delete permanently: the dialog names what goes; gone, not found, storage empties",
    run: async ({ page }) => {
      await openTrash(page);
      // From the page: the presigned url names localhost, which only the browser maps.
      const object = () => page.evaluate(async (u) => (await fetch(u)).status, doomedUrl);
      expect((await object()) === 200, "object missing before the purge");
      await page.getByRole("button", { name: "Delete Harbor purge permanently" }).click();
      const dialog = page.getByRole("dialog", { name: 'Permanently delete "Harbor purge"?' });
      await dialog.waitFor();
      const text = await dialog.innerText();
      expect(
        text.includes("This erases the project and everything in it: sheets, takeoff items, estimate lines, notes and uploaded files. It cannot be restored, by you or by support."),
        `dialog: ${text}`,
      );
      await dialog.getByRole("button", { name: "Delete permanently" }).click();
      await page.getByText("Project permanently deleted").waitFor({ timeout: 10000 });
      await page.getByText("Trash is empty").waitFor({ timeout: 10000 });
      await page.goto(`${APP}/project/${doomed.uuid}`);
      await page.getByRole("heading", { name: "Project not found" }).waitFor({ timeout: 15000 });
      let status = 0;
      for (let i = 0; i < 30; i += 1) {
        status = await object();
        if (status === 404) break;
        await page.waitForTimeout(2000);
      }
      expect(status === 404, `object after purge: ${status}`);
      return "dialog in words · list empty · Project not found · object 200 → 404";
    },
  },
  {
    title: "Purged already — restore or purge it again says \"This project was permanently deleted.\"",
    run: async () => {
      for (const [method, path] of [["POST", "restore"], ["DELETE", "purge"]]) {
        const again = await apiCall(token, method, `${base}/${doomed.uuid}/${path}`);
        expect(again.status === 404 && again.body?.detail === "This project was permanently deleted.", `${path}: ${again.status} ${again.body?.detail}`);
      }
      return "404 in words, both ways";
    },
  },
  {
    title: "AC5 — a hand-written purge or restore of a live project is refused in words",
    run: async () => {
      const purge = await apiCall(token, "DELETE", `${base}/${live.uuid}/purge`);
      expect(purge.status === 409 && purge.body?.detail === "Move the project to Trash before deleting it permanently.", `purge: ${purge.status} ${purge.body?.detail}`);
      const restore = await apiCall(token, "POST", `${base}/${live.uuid}/restore`);
      expect(restore.status === 409 && restore.body?.detail === "This project is not in Trash.", `restore: ${restore.status} ${restore.body?.detail}`);
      expect((await apiCall(token, "GET", `${base}/${live.uuid}`)).status === 200, "the live project went");
      return "409 · 409 · still there";
    },
  },
  {
    title: "AC6 — an estimator: no Trash tab, the page refuses, and the api refuses list, restore and purge",
    run: async ({ page }) => {
      await apiCall(token, "DELETE", `${base}/${live.uuid}`);
      await openDashboard(page, workspace.uuid, estimator.email);
      await page.goto(`${APP}/settings/activity`);
      const nav = page.getByRole("navigation", { name: "Settings" });
      await nav.getByRole("link", { name: "Activity" }).waitFor({ timeout: 15000 });
      expect((await nav.getByRole("link", { name: "Trash" }).count()) === 0, "estimator sees a Trash tab");
      await page.goto(`${APP}/settings/trash`);
      await page.getByText("Your role cannot restore deleted items.").waitFor({ timeout: 15000 });
      const calls = [
        await apiCall(estimator.token, "GET", trashUrl),
        await apiCall(estimator.token, "POST", `${base}/${live.uuid}/restore`),
        await apiCall(estimator.token, "DELETE", `${base}/${live.uuid}/purge`),
      ];
      expect(calls.every((c) => c.status === 403 && c.body?.detail === "Your role cannot restore deleted items."), `estimator: ${calls.map((c) => c.status).join()}`);
      expect((await trashed()).some((p) => p.name === "Harbor live"), "estimator's purge went through");
      return "no tab · page refuses · 403 ×3 in words";
    },
  },
  {
    title: "AC8 — Activity reads the restore and the permanent delete as sentences",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await page.goto(`${APP}/settings/activity`);
      await page.getByText("restored the project Harbor restore from Trash").waitFor({ timeout: 20000 });
      await page.getByText("permanently deleted the project Harbor purge", { exact: false }).first().waitFor();
      return "both lines there";
    },
  },
]);

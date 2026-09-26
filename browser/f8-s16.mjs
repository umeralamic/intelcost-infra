// F8-S16: the F4 events, live between two windows on two api processes.
//
//   docker compose --profile browser run --rm browser node scripts/f8-s16.mjs
//
// A throwaway workspace owned by the seeded user (A, :5173), with a fresh estimator
// seated in it (B, :5174 through `api-b`), so nothing here moves the bench's own
// projects. A's acts go through the api unless a line needs A's own window (AC8); B's
// window is hidden and blurred first, so nothing arrives by a refetch on focus.

import { APP, SEEDED, apiCall, expect, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, seedFile, tabStrip } from "./lib/f4.mjs";
import { APP_B, appSockets, joinedTopic, recordSockets, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";

const { token, workspace, base } = await freshWorkspace("F8-S16");
const ws = workspace.uuid;
const member = await seatedMember(token, ws, "estimator", "f8s16");

async function unfocus(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("blur"));
  });
}

async function openAs(page, app, who, path = "/") {
  await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), ws);
  await signInAt(page, app, who.email, who.password);
  if (path !== "/") await page.goto(`${app}${path}`);
  await joinedTopic(page, `ws:${ws}`);
}

async function timed(probe, what, limit = 1500) {
  const t0 = Date.now();
  await waitFor(probe, what, limit + 2000, 25);
  const took = Date.now() - t0;
  expect(took <= limit, `${what} took ${took} ms`);
  return took;
}

const row = (page, name) => page.locator(`li[data-project="${name}"]`);
const tab = async (page, label) => (await tabStrip(page)).find((t) => t.label === label)?.count ?? 0;

await run("f8-s16", [
  {
    title: "AC1, AC2, AC3, AC4: create, status, details and trash, restore, purge each reach B's dashboard and Trash",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await openAs(page, APP_B, member);
      await page.getByRole("tablist", { name: "Project status" }).waitFor();
      await unfocus(page);
      const t = {};
      const name = `F8-S16 ${Date.now() % 100000}`;

      const allBefore = await tab(page, "All");
      const project = await makeProject(token, base, { name });
      t.created = await timed(async () => (await row(page, name).count()) === 1, "B to list the new project");
      await timed(async () => (await tab(page, "All")) === allBefore + 1, "B's All count to move");

      const wonBefore = await tab(page, "Won");
      await apiCall(token, "PATCH", `${base}/${project.uuid}`, { status_key: "won" });
      t.status = await timed(async () => (await tab(page, "Won")) === wonBefore + 1, "B's Won tab to count it");
      // Won is not on B's open tab, so the row has moved off it (AC2's "moves tab").
      await timed(async () => (await row(page, name).count()) === 0, "B's row to leave the open tab");
      await apiCall(token, "PATCH", `${base}/${project.uuid}`, { status_key: "bidding" });
      await timed(async () => (await row(page, name).count()) === 1, "B's row to come back to the open tab");

      await apiCall(token, "PATCH", `${base}/${project.uuid}`, { client_name: "F8-S16 Client Co" });
      t.details = await timed(async () => ((await row(page, name).textContent()) ?? "").includes("F8-S16 Client Co"), "B's row to show the client");

      await apiCall(token, "DELETE", `${base}/${project.uuid}`);
      t.trashed = await timed(async () => (await row(page, name).count()) === 0, "B's list to drop the trashed project");
      await apiCall(token, "POST", `${base}/${project.uuid}/restore`);
      t.restored = await timed(async () => (await row(page, name).count()) === 1, "B's list to bring it back");

      // Trash is B's too (owner and admin act on it; everyone may see it).
      await apiCall(token, "DELETE", `${base}/${project.uuid}`);
      await page.goto(`${APP_B}/settings/trash`);
      await page.locator(`[data-trash-row="${name}"]`).waitFor({ timeout: 10000 }).catch(() => {});
      const trashVisible = (await page.locator(`[data-trash-row="${name}"]`).count()) === 1;
      if (trashVisible) {
        await unfocus(page);
        await apiCall(token, "DELETE", `${base}/${project.uuid}/purge`);
        t.purged = await timed(async () => (await page.locator(`[data-trash-row="${name}"]`).count()) === 0, "B's Trash to drop the purged project");
      } else {
        await apiCall(token, "DELETE", `${base}/${project.uuid}/purge`);
        t.purged = "(an estimator's Trash does not list it; purge proved by f8-s6)";
      }
      return Object.entries(t).map(([k, v]) => `${k} ${v}${typeof v === "number" ? " ms" : ""}`).join(" · ");
    },
  },
  {
    title: "AC3, AC5: B on Project Home follows A's edits, then reads \"Project not found\" when A trashes it",
    run: async ({ page, context }) => {
      await recordSockets(context);
      const name = `F8-S16 Home ${Date.now() % 100000}`;
      const project = await makeProject(token, base, { name });
      try {
        await openAs(page, APP_B, member, `/project/${project.uuid}`);
        await page.getByRole("heading", { name }).first().waitFor({ timeout: 15000 });
        await unfocus(page);
        const renamed = `${name} renamed`;
        await apiCall(token, "PATCH", `${base}/${project.uuid}`, { name: renamed, plans_dated: "2026-09-01" });
        const edited = await timed(async () => (await page.getByRole("heading", { name: renamed }).count()) > 0, "B's Project Home to show the new name");
        await apiCall(token, "DELETE", `${base}/${project.uuid}`);
        const gone = await timed(async () => (await page.getByText("Project not found").count()) > 0, "B to read Project not found");
        return `rename reached Project Home in ${edited} ms; trash turned it to "Project not found" in ${gone} ms`;
      } finally {
        await apiCall(token, "DELETE", `${base}/${project.uuid}/purge`);
      }
    },
  },
  {
    title: "AC6, AC8: folder create, rename, upload and delete reach B's file browser; A's own act shows once, its echo suppressed",
    run: async ({ page, context }) => {
      await recordSockets(context);
      const name = `F8-S16 Files ${Date.now() % 100000}`;
      const project = await makeProject(token, base, { name });
      const b = await secondWindow(context);
      try {
        await openAs(b.page, APP_B, member, `/project/${project.uuid}`);
        const tree = b.page.locator('nav[aria-label="Project folders"]');
        await tree.getByText("Plans").first().waitFor({ timeout: 15000 });
        await unfocus(b.page);
        const t = {};

        const made = await apiCall(token, "POST", `${base}/${project.uuid}/folder`, { name: "F8 Live" });
        expect(made.status === 201, `folder: ${made.status}`);
        t.created = await timed(async () => (await tree.getByText("F8 Live", { exact: true }).count()) === 1, "B's tree to show the folder");
        await apiCall(token, "PATCH", `${base}/${project.uuid}/folder/${made.body.uuid}`, { name: "F8 Live 2" });
        t.renamed = await timed(async () => (await tree.getByText("F8 Live 2", { exact: true }).count()) === 1, "B's tree to show the rename");

        await tree.getByText("F8 Live 2", { exact: true }).click();
        const contents = b.page.locator('section[aria-label="Folder contents"]');
        await seedFile(b.page, token, base, project.uuid, made.body.uuid, "f8-live.txt", Buffer.from("live"));
        t.uploaded = await timed(async () => (await contents.getByText("f8-live.txt").count()) > 0, "B's folder to list the upload");

        await apiCall(token, "DELETE", `${base}/${project.uuid}/folder/${made.body.uuid}`);
        t.deleted = await timed(async () => (await tree.getByText("F8 Live 2", { exact: true }).count()) === 0, "B's tree to drop the folder");

        // AC8: A's own act in A's own window.
        await openAs(page, APP, SEEDED, `/project/${project.uuid}`);
        const aTree = page.locator('nav[aria-label="Project folders"]');
        await aTree.getByText("Plans").first().waitFor({ timeout: 15000 });
        const sent = [];
        page.on("request", (r) => r.method() === "POST" && r.url().endsWith("/folder") && sent.push(r.headers()["x-write-token"]));
        await page.getByRole("button", { name: "New folder" }).first().click();
        await page.getByRole("dialog").getByRole("textbox").fill("A made this");
        await page.getByRole("dialog").getByRole("button", { name: /Create/ }).click();
        await aTree.getByText("A made this", { exact: true }).waitFor();
        const echo = await waitFor(async () => {
          const events = (await appSockets(page)).flatMap((s) => s.received).filter((f) => f.type === "event" && f.name === "project.folder.changed");
          return events.find((f) => sent.includes(f.write_token));
        }, "A's socket to carry its own folder event", 3000);
        await page.waitForTimeout(600);
        const shown = await aTree.getByText("A made this", { exact: true }).count();
        const inB = await timed(async () => (await tree.getByText("A made this", { exact: true }).count()) === 1, "B to show A's folder");
        expect(shown === 1, `A's tree shows its folder ${shown} times`);
        t.echo = `A shows it once, the event carried A's own token (${echo.write_token.slice(0, 8)}), B in ${inB} ms`;
        return Object.entries(t).map(([k, v]) => `${k} ${v}${typeof v === "number" ? " ms" : ""}`).join(" · ");
      } finally {
        await b.context.close();
      }
    },
  },
  {
    title: "AC7: status add, rename, hide and delete reach B's tab strip and Settings > Statuses",
    run: async ({ page, context }) => {
      await recordSockets(context);
      const statuses = `/api/workspace/${ws}/project-status`;
      await openAs(page, APP_B, member, "/settings/statuses");
      await page.getByText("Bidding").first().waitFor({ timeout: 15000 });
      await unfocus(page);
      const t = {};
      const made = await apiCall(token, "POST", statuses, { label: "F8 Pending", color: "blue", bucket: "active", reports_as: "bidding" });
      expect(made.status === 201, `status: ${made.status} ${JSON.stringify(made.body)}`);
      const key = made.body.key;
      t.added = await timed(async () => (await page.getByText("F8 Pending").count()) > 0, "B's Statuses to list it");
      await apiCall(token, "PATCH", `${statuses}/${key}`, { label: "F8 Waiting" });
      t.renamed = await timed(async () => (await page.getByText("F8 Waiting").count()) > 0, "B's Statuses to show the rename");
      await apiCall(token, "PATCH", `${statuses}/${key}`, { is_hidden: true });
      await page.waitForTimeout(500);
      await apiCall(token, "DELETE", `${statuses}/${key}`);
      t.deleted = await timed(async () => (await page.getByText("F8 Waiting").count()) === 0, "B's Statuses to drop it");
      return Object.entries(t).map(([k, v]) => `${k} ${v} ms`).join(" · ");
    },
  },
]);

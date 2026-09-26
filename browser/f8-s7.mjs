// F8-S7: write tokens and echo suppression.
//
//   docker compose --profile browser run --rm browser node scripts/f8-s7.mjs
//
// Needs the realtime profile (window B on :5174).

import { APP, SEEDED, apiLogin, expect, firstWorkspace, run } from "./lib/bench.mjs";
import {
  APP_B,
  WINDOW_B,
  call,
  ensureWindowB,
  eventsOn,
  joinedTopic,
  recordSockets,
  secondWindow,
  signInAt,
  waitFor,
} from "./lib/realtime.mjs";

await ensureWindowB();
const token = await apiLogin();
const workspace = await firstWorkspace(token);
const original = workspace.name;
const topic = `ws:${workspace.uuid}`;
const headerName = (page) => page.$eval("header select", (s) => s.selectedOptions[0]?.text ?? "");
const restore = () => call(token, "PATCH", `/api/workspace/${workspace.uuid}`, { name: original });

/** Rename through Settings > General, as a person would. */
async function renameInSettings(page, app, name) {
  await page.goto(`${app}/settings/general`);
  const field = page.locator("#workspace-name-general");
  await field.waitFor();
  await field.fill(name);
  await page.getByRole("button", { name: /save/i }).first().click();
}

async function openAs(page, app, who) {
  await page.addInitScript((uuid) => {
    localStorage.setItem("intelcost.workspace", uuid);
    localStorage.setItem("intelcost.debug", "realtime");
  }, workspace.uuid);
  await signInAt(page, app, who.email, who.password);
  await joinedTopic(page, topic);
}

await run("f8-s7", [
  {
    title: "AC1: the writer's own event is suppressed and refetched once; the other window hears it",
    run: async ({ page, context }) => {
      await recordSockets(context);
      const debug = [];
      page.on("console", (m) => m.type() === "debug" && debug.push(m.text()));
      await openAs(page, APP, SEEDED);
      const b = await secondWindow(context);
      try {
        await openAs(b.page, APP_B, WINDOW_B);
        const renamed = `${original} (F8-S7 ${Date.now() % 100000})`;

        await renameInSettings(page, APP, "");
        await page.locator("#workspace-name-general").fill(renamed);
        const sent = [];
        const lists = [];
        page.on("request", (r) => {
          if (r.method() === "PATCH" && r.url().endsWith(`/api/workspace/${workspace.uuid}`)) {
            sent.push(r.headers()["x-write-token"]);
          }
          if (r.method() === "GET" && r.url().endsWith("/api/workspace")) lists.push(Date.now());
        });
        await page.getByRole("button", { name: /save/i }).first().click();

        await waitFor(async () => (await headerName(b.page)) === renamed, "window B to show the rename", 6000);
        await page.waitForTimeout(1500);
        const mine = await eventsOn(page, "workspace.settings.updated");
        const theirs = await eventsOn(b.page, "workspace.settings.updated");

        expect(sent.length === 1 && sent[0], "the PATCH carried no X-Write-Token");
        expect(mine.length === 1 && mine[0].write_token === sent[0], "A's echo did not carry A's token");
        expect(debug.some((line) => line.includes("echo suppressed workspace.settings.updated")), "A did not suppress its echo");
        // Settings > General reads the list twice by itself (its mutation invalidates it,
        // then the form calls refreshWorkspaces: F3 code). An echo that got through would
        // add a third read, 150 ms after the event.
        expect(lists.length === 2, `A re-read the workspace list ${lists.length} times; the form alone reads it twice`);
        expect(theirs.length === 1, `B heard ${theirs.length} events`);
        return `A sent token ${sent[0].slice(0, 8)}…, its echo came back with it and was suppressed; A made no extra read (2, both the form's own); B updated live`;
      } finally {
        await restore();
        await b.context.close();
      }
    },
  },
  {
    title: "AC2: the same person in two tabs: tab 1 renames, tab 2 updates live",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await openAs(page, APP, SEEDED);
      const tab2 = await context.newPage();
      try {
        await tab2.goto(`${APP}/`);
        await joinedTopic(tab2, topic);
        const renamed = `${original} (F8-S7 tabs ${Date.now() % 100000})`;
        await renameInSettings(page, APP, renamed);
        await waitFor(async () => (await headerName(tab2)) === renamed, "tab 2 to show the rename", 6000);
        const heard = await eventsOn(tab2, "workspace.settings.updated");
        expect(heard.length === 1, `tab 2 heard ${heard.length}`);
        return "tab 2 of the same user updated live; its tokens are its own";
      } finally {
        await restore();
      }
    },
  },
  {
    title: "AC3: an event with a stranger's token reaches every window, the writer's included",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await openAs(page, APP, SEEDED);
      const renamed = `${original} (F8-S7 stranger ${Date.now() % 100000})`;
      try {
        await call(token, "PATCH", `/api/workspace/${workspace.uuid}`, { name: renamed }, {
          "X-Write-Token": crypto.randomUUID(),
        });
        await waitFor(async () => (await headerName(page)) === renamed, "the page to show the rename", 6000);
        return "a write from outside this tab, with a token it never made, updated it";
      } finally {
        await restore();
      }
    },
  },
]);

// F8-S15: the F3 events, live between two windows on two api processes.
//
//   docker compose --profile browser run --rm browser node scripts/f8-s15.mjs
//
// A is the seeded owner. The person whose standing changes is a fresh member seated for
// the step (window B, on :5174 through `api-b`), so Sara W. keeps her seat for every
// other fixture. Every B window is hidden and blurred before the act: nothing may arrive
// by a refetch on focus, which is what F3 shipped with and what F8 replaces.

import {
  APP,
  SEEDED,
  apiCall,
  apiLogin,
  createWorkspace,
  expect,
  firstWorkspace,
  run,
  seatedMember,
  setRole,
} from "./lib/bench.mjs";
import {
  APP_B,
  WINDOW_B,
  appSockets,
  call,
  ensureWindowB,
  joinedTopic,
  recordSockets,
  secondWindow,
  signInAt,
  waitFor,
} from "./lib/realtime.mjs";
import { countItem, menuItem, openSheet, removeItem, riverside, setMode } from "./lib/takeoff.mjs";

await ensureWindowB();
const token = await apiLogin();
const workspace = await firstWorkspace(token);
const ws = workspace.uuid;
const topic = `ws:${ws}`;
const original = workspace.name;

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

async function unfocus(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("blur"));
  });
}

/** Open a window as someone, on a workspace, with its topic joined. */
async function openAs(page, app, who, workspaceUuid = ws, path = "/") {
  await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspaceUuid);
  await signInAt(page, app, who.email, who.password);
  if (path !== "/") await page.goto(`${app}${path}`);
  await joinedTopic(page, `ws:${workspaceUuid}`);
}

/** How long until `probe` holds, failing past `limit` ms. */
async function timed(probe, what, limit = 1500) {
  const t0 = Date.now();
  await waitFor(probe, what, limit + 1500, 25);
  const took = Date.now() - t0;
  expect(took <= limit, `${what} took ${took} ms`);
  return took;
}

const newProject = (page) => page.getByRole("button", { name: /New project/ }).first();
const mayCreate = async (page) => !(await newProject(page).isDisabled());

await run("f8-s15", [
  {
    title: "AC1, AC2, AC3: a role change, an override and a custom role each reach B's open, unfocused dashboard within a second",
    run: async ({ page, context }) => {
      const member = await seatedMember(token, ws, "estimator", "f8s15");
      const me = (await call(member.token, "GET", "/api/auth/me")).body;
      let custom = null;
      try {
        await recordSockets(context);
        await openAs(page, APP_B, member);
        await newProject(page).waitFor();
        expect(await mayCreate(page), "an estimator could not create a project to begin with");
        await unfocus(page);

        const times = [];
        // AC1: estimator to viewer, and back.
        expect((await setRole(token, ws, me.uuid, "viewer")).status === 200, "role change refused");
        times.push(await timed(async () => !(await mayCreate(page)), "B to lose New project (viewer)"));
        const reason = await page.locator("#new-project-refusal").textContent();
        await setRole(token, ws, me.uuid, "estimator");
        times.push(await timed(() => mayCreate(page), "B to regain New project"));

        // AC2: the estimator override.
        const off = await apiCall(token, "PUT", `/api/workspace/${ws}/override/estimator`, {
          capabilities: { canCreateProjects: false },
        });
        expect(off.status === 200, `override: ${off.status}`);
        times.push(await timed(async () => !(await mayCreate(page)), "B to follow the override"));
        await apiCall(token, "DELETE", `/api/workspace/${ws}/override/estimator`);
        times.push(await timed(() => mayCreate(page), "B to follow the cleared override"));

        // AC3: a custom role without it, assigned to B.
        const made = await apiCall(token, "POST", `/api/workspace/${ws}/custom-role`, {
          label: `F8-S15 Reader ${Date.now() % 100000}`,
          capabilities: { canEditTakeoff: true },
        });
        expect(made.status === 201, `custom role: ${made.status} ${JSON.stringify(made.body)}`);
        custom = made.body;
        const assigned = await apiCall(token, "PUT", `/api/workspace/${ws}/member/${me.uuid}/custom-role`, {
          custom_role_uuid: custom.uuid,
        });
        expect(assigned.status === 200, `assign: ${assigned.status}`);
        times.push(await timed(async () => !(await mayCreate(page)), "B to follow the custom role"));
        const standing = await page.locator("[data-standing]").textContent();
        expect(standing?.includes("F8-S15 Reader"), `B's header reads "${standing}"`);
        return `each within ${Math.max(...times)} ms (${times.join(", ")}); refusal read "${reason?.trim()}"; header "${standing}"`;
      } finally {
        await setRole(token, ws, me.uuid, "estimator");
        await apiCall(token, "DELETE", `/api/workspace/${ws}/override/estimator`);
        if (custom) await apiCall(token, "DELETE", `/api/workspace/${ws}/custom-role/${custom.uuid}`);
        await apiCall(token, "DELETE", `/api/workspace/${ws}/member/${me.uuid}`);
      }
    },
  },
  {
    title: "AC4, AC8: an invitation reaches a second admin window's pending list, and each act lands in its Activity feed",
    run: async ({ page, context }) => {
      const email = `f8s15-invitee-${Date.now()}@bench.intelcost.io`;
      await recordSockets(context);
      await openAs(page, APP_B, SEEDED, ws, "/settings/members");
      // The pending list has loaded: either its empty line, or a row with its actions.
      await page.getByText(/No invitations outstanding|Resend/).first().waitFor();
      await unfocus(page);
      let invitation = null;
      try {
        const made = await apiCall(token, "POST", `/api/workspace/${ws}/invitation`, { email, role: "viewer" });
        expect(made.status === 201, `invite: ${made.status}`);
        invitation = made.body;
        const invited = await timed(async () => (await page.getByText(email).count()) > 0, "the pending list to show the invitee");

        await page.goto(`${APP_B}/settings/activity`);
        await page.getByText(email).first().waitFor({ timeout: 10000 });
        await unfocus(page);
        await apiCall(token, "DELETE", `/api/workspace/${ws}/invitation/${invitation.uuid}`);
        invitation = null;
        const rows = () => page.getByText(email).count();
        const before = await rows();
        const fed = await timed(async () => (await rows()) > before, "the activity feed to show the withdrawal");
        return `pending list in ${invited} ms; the withdrawal's activity row in ${fed} ms`;
      } finally {
        if (invitation) await apiCall(token, "DELETE", `/api/workspace/${ws}/invitation/${invitation.uuid}`);
      }
    },
  },
  {
    title: "AC5: A renames the workspace and uploads a logo; B's top bar shows both, then the logo's removal",
    run: async ({ page, context }) => {
      await recordSockets(context);
      const b = await secondWindow(context);
      try {
        await openAs(b.page, APP_B, WINDOW_B);
        await unfocus(b.page);
        const renamed = `${original} (F8-S15 ${Date.now() % 100000})`;
        await call(token, "PATCH", `/api/workspace/${ws}`, { name: renamed });
        const name = await timed(
          async () => (await b.page.$eval("header select", (s) => s.selectedOptions[0]?.text ?? "")) === renamed,
          "B's header to show the new name",
        );

        await openAs(page, APP, SEEDED, ws, "/settings/general");
        await page.waitForSelector("[data-logo-choose]", { timeout: 20000 });
        await page.setInputFiles("#logo-file", { name: "logo.png", mimeType: "image/png", buffer: PNG });
        await page.waitForSelector("[data-logo-preview] img", { timeout: 20000 });
        const logo = await timed(async () => (await b.page.locator("[data-workspace-logo]").count()) === 1, "B's header to show the logo", 2500);
        await call(token, "DELETE", `/api/workspace/${ws}/logo`);
        const gone = await timed(async () => (await b.page.locator("[data-workspace-logo]").count()) === 0, "B's header to drop the logo");
        return `name in ${name} ms; logo in ${logo} ms (after A's confirm); removal in ${gone} ms`;
      } finally {
        await call(token, "PATCH", `/api/workspace/${ws}`, { name: original });
        await call(token, "DELETE", `/api/workspace/${ws}/logo`);
        await b.context.close();
      }
    },
  },
  {
    title: "AC6: A transfers ownership to B; both windows change role with no reload",
    run: async ({ page, context }) => {
      const own = await createWorkspace(token, `F8-S15 Handover ${Date.now() % 100000}`);
      const member = await seatedMember(token, own.uuid, "estimator", "f8s15own");
      const me = (await call(member.token, "GET", "/api/auth/me")).body;
      await recordSockets(context);
      const b = await secondWindow(context);
      try {
        await openAs(page, APP, SEEDED, own.uuid);
        await openAs(b.page, APP_B, member, own.uuid);
        const standing = (p) => p.locator("[data-standing]").textContent();
        expect((await standing(page)) === "Owner" && (await standing(b.page)) === "Estimator", "the roles did not start as owner and estimator");
        await unfocus(page);
        await unfocus(b.page);
        const done = await apiCall(token, "POST", `/api/workspace/${own.uuid}/ownership`, {
          user_uuid: me.uuid,
          confirm_name: own.name,
        });
        expect(done.status === 200, `transfer: ${done.status} ${JSON.stringify(done.body)}`);
        const bTook = await timed(async () => (await standing(b.page)) === "Owner", "B to read Owner");
        const aTook = await timed(async () => (await standing(page)) === "Admin", "A to read Admin");
        return `B read Owner in ${bTook} ms, A read Admin in ${aTook} ms`;
      } finally {
        await b.context.close();
      }
    },
  },
  {
    title: "AC7: A removes B; B is told, moves to its next workspace, and hears nothing more from the old one",
    run: async ({ page, context }) => {
      const member = await seatedMember(token, ws, "estimator", "f8s15gone");
      const me = (await call(member.token, "GET", "/api/auth/me")).body;
      // A second workspace of B's own, to move to.
      const home = await createWorkspace(member.token, `F8-S15 Home ${Date.now() % 100000}`);
      await recordSockets(context);
      await openAs(page, APP_B, member, ws, `/project/${(await riverside(token, ws)).project}`);
      await unfocus(page);
      const removed = await apiCall(token, "DELETE", `/api/workspace/${ws}/member/${me.uuid}`);
      expect(removed.status === 200, `remove: ${removed.status}`);
      const toast = page.getByText(`You no longer have access to ${original}.`);
      const told = await timed(async () => (await toast.count()) > 0, "B to be told");
      await waitFor(() => new URL(page.url()).pathname === "/", "B to land on the dashboard", 5000);
      const now = await waitFor(async () => {
        const text = await page.$eval("header select", (s) => s.selectedOptions[0]?.text ?? "");
        return text === home.name ? text : null;
      }, "B's header to show its next workspace", 5000);
      const socket = (await appSockets(page)).at(-1);
      const revokedAt = socket.received.find((f) => f.type === "revoked" && f.topic === topic)?.at;
      expect(revokedAt, "B's socket was never revoked from the workspace");

      // Anything A does now in the old workspace reaches B no more.
      await call(token, "PATCH", `/api/workspace/${ws}`, { name: `${original} (after)` });
      await page.waitForTimeout(1500);
      await call(token, "PATCH", `/api/workspace/${ws}`, { name: original });
      const late = (await appSockets(page))
        .flatMap((s) => s.received)
        .filter((f) => f.type === "event" && f.topic === topic && f.at > revokedAt);
      expect(late.length === 0, `B heard ${late.length} events after the revoke`);
      return `told in ${told} ms; on the dashboard of "${now}"; revoked, then 0 events from the old workspace`;
    },
  },
  {
    title: "AC9: A changes the collaboration mode; B's open takeoff page applies it on its next focus",
    run: async ({ page, context }) => {
      const r = await riverside(token, ws);
      const name = `F8-S15 mode ${Date.now() % 100000}`;
      const item = await countItem(token, r, name);
      await setMode(token, ws, "work_together");
      await recordSockets(context);
      const b = await secondWindow(context);
      try {
        await signInAt(page, APP, SEEDED.email, SEEDED.password);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await openSheet(page, r);
        await openSheet(b.page, r, APP_B);
        await unfocus(b.page);
        const reread = b.page.waitForResponse((res) => res.url().endsWith("/api/workspace") && res.request().method() === "GET", { timeout: 3000 });
        await setMode(token, ws, "one_at_a_time");
        await reread;
        await (await menuItem(page, name, "Add a shape")).click();
        const addB = await menuItem(b.page, name, "Add a shape");
        await waitFor(() => addB.isDisabled(), "B's Add a shape to be disabled under One at a time", 5000);
        const why = await b.page.getByRole("menu").textContent();
        expect(/is editing this item right now/.test(why ?? ""), `B's menu reads "${why}"`);
        return "B re-read the workspace on the event, and A's next hold made B's controls view-only";
      } finally {
        await b.context.close();
        await setMode(token, ws, "work_together");
        await removeItem(token, r, item.uuid);
      }
    },
  },
]);

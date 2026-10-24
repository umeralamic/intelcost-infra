// F8-S15: the F3 events, live between two windows on two api processes.
//
//   docker compose --profile browser run --rm browser node scripts/f8-s15.mjs
//
// A is the seeded owner. The person whose standing changes is a fresh member seated for
// the step (window B, on :5174 through `api-b`), so Sara W. keeps her seat for every
// other fixture. Every B window is hidden and blurred before the act: nothing may arrive
// by a refetch on focus, which is what F3 shipped with and what F8 replaces.
//
// Updated 2026-10-24 (D-311, D-314, D-619, D-625, D-72, D-81, D-87):
// - D-311 1, D-314: the dashboard is the "All projects" dialog (`/?projects=open`); step 1 watches its
//   New project button and the refusal under it (`#new-project-refusal`). Home opens the project's
//   takeoff behind the dialog, so the clock starts once its reads have finished (harness).
// - D-311 5, D-619, D-87: no page a member reaches draws the header's workspace select or the standing
//   badge (the takeoff pages are bare, Settings brings its own bar). Step 1's "the header names the
//   custom role" is retired with the badge. Step 3 reads the rename in Settings > General's name field
//   (filled from the session's workspace, D-87). Step 4 reads each window's role on Settings >
//   Ownership: the owner card says "(you)" for the owner, and anyone else reads "Only the owner can hand
//   this workspace over." Step 5 reads B's next workspace from the app's stored active workspace
//   (`intelcost.workspace`) once it is Home.
// - D-752: step 4's handover workspace is the run account's second, so its owner (window A) is the
//   throwaway extra owner lib/bench.mjs createWorkspace makes; the transfer is made with its token.
// - D-625: the logo is not in the members' header; step 3's logo and logo-removal halves are retired.
// - D-81, D-72: "Add a shape" left the row menu; step 6 holds the item by A's row Resume and checks B's
//   row Resume is disabled and says who has it.

import {
  APP,
  SEEDED,
  apiCall,
  apiLogin,
  createWorkspace,
  ownWorkspace,
  expect,
  firstWorkspace,
  quietFor,
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
import { riversideWorld } from "./lib/world.mjs";

// This run's own Riverside, under its own account, with Sara W. seated (lib/world.mjs).
const world = await riversideWorld();
const token = world.token;
const workspace = world.workspace;
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
async function openAs(page, app, who, workspaceUuid = ws, path = "/?projects=open") {
  await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspaceUuid);
  await signInAt(page, app, who.email, who.password);
  await page.goto(`${app}${path}`);
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

// The dashboard is the All projects dialog (D-314).
const newProject = (page) => page.getByRole("dialog", { name: "All projects" }).getByRole("button", { name: /New project/ }).first();
const mayCreate = async (page) => !(await newProject(page).isDisabled());

await run("f8-s15", [
  {
    title: "AC1, AC2, AC3: a role change, an override and a custom role each reach B's open, unfocused All projects within a second",
    run: async ({ page, context }) => {
      const member = await seatedMember(token, ws, "estimator", "f8s15");
      const me = (await call(member.token, "GET", "/api/auth/me")).body;
      let custom = null;
      try {
        await recordSockets(context);
        await openAs(page, APP_B, member);
        await newProject(page).waitFor({ timeout: 20000 });
        // Disabled until the member's capabilities arrive: wait for them, then it must allow.
        await waitFor(() => mayCreate(page), "an estimator to be able to create a project to begin with", 5000);
        // Home lands on the project's takeoff behind the dialog (D-311 1, D-314), whose own reads
        // would queue the refetch being timed; the clock starts once no read has finished for 2 s.
        await page.waitForFunction(
          () => {
            const done = performance.getEntriesByType("resource").length;
            const s = (window.__readsSettled ??= { done: -1, since: Date.now() });
            if (done !== s.done) Object.assign(s, { done, since: Date.now() });
            return Date.now() - s.since >= 2000;
          },
          undefined,
          { polling: 100, timeout: 45000 },
        );
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
        // The header's standing badge is retired (D-311 5, D-619): no page B reaches draws it.
        return `each within ${Math.max(...times)} ms (${times.join(", ")}); refusal read "${reason?.trim()}"`;
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
      await openAs(page, APP_B, world.owner, ws, "/settings/members");
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
    title: "AC5: A renames the workspace; B's open screen shows the new name",
    run: async ({ page, context }) => {
      await recordSockets(context);
      const b = await secondWindow(context);
      try {
        // Settings > General's name field follows the session's workspace (no header select, D-311 5).
        await openAs(b.page, APP_B, WINDOW_B, ws, "/settings/general");
        await b.page.locator("#workspace-name-general").waitFor({ timeout: 20000 });
        await unfocus(b.page);
        const renamed = `${original} (F8-S15 ${Date.now() % 100000})`;
        await call(token, "PATCH", `/api/workspace/${ws}`, { name: renamed });
        const name = await timed(
          async () => (await b.page.inputValue("#workspace-name-general")) === renamed,
          "B's screen to show the new name",
        );
        // The logo halves are retired: D-625 keeps the logo out of the members' header.
        return `name in ${name} ms`;
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
      // A workspace of this run's own account to hand over, never the seeded one's.
      const made = await ownWorkspace(`F8-S15 Handover ${Date.now() % 100000}`);
      const own = made.workspace;
      // D-752: the run's account already owns Riverside, so this workspace's real owner is the extra
      // owner lib/bench.mjs createWorkspace made (the run's account is its admin). A is that owner.
      const owner = own.extra_owner ? { email: own.extra_owner.email, password: SEEDED.password } : made.owner;
      const ownerToken = own.extra_owner ? own.extra_owner.token : made.token;
      const member = await seatedMember(ownerToken, own.uuid, "estimator", "f8s15own");
      const me = (await call(member.token, "GET", "/api/auth/me")).body;
      await recordSockets(context);
      const b = await secondWindow(context);
      try {
        // Each window's role, read on Settings > Ownership (the standing badge is gone, D-311 5, D-619):
        // the owner's card says "(you)" to the owner; anyone else is told only the owner hands it over.
        await openAs(page, APP, owner, own.uuid, "/settings/ownership");
        await openAs(b.page, APP_B, member, own.uuid, "/settings/ownership");
        const standing = async (p) => {
          const you = (await p.getByText("Current owner of").count()) > 0 && (await p.getByText("(you)").count()) > 0;
          const refused = (await p.getByText("Only the owner can hand this workspace over.").count()) > 0;
          return you && !refused ? "Owner" : refused && !you ? "Not owner" : "Unsettled";
        };
        await waitFor(async () => (await standing(page)) === "Owner" && (await standing(b.page)) === "Not owner", "the roles to start as owner and estimator", 15000);
        await unfocus(page);
        await unfocus(b.page);
        const done = await apiCall(ownerToken, "POST", `/api/workspace/${own.uuid}/ownership`, {
          user_uuid: me.uuid,
          confirm_name: own.name,
        });
        expect(done.status === 200, `transfer: ${done.status} ${JSON.stringify(done.body)}`);
        const bTook = await timed(async () => (await standing(b.page)) === "Owner", "B to read Owner");
        const aTook = await timed(async () => (await standing(page)) === "Not owner", "A to read that it is no longer the owner");
        return `B read Owner in ${bTook} ms, A read that it is no longer the owner in ${aTook} ms`;
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
      await openAs(page, APP_B, member, ws, `/project/${world.r.project}`);
      await unfocus(page);
      const removed = await apiCall(token, "DELETE", `/api/workspace/${ws}/member/${me.uuid}`);
      expect(removed.status === 200, `remove: ${removed.status}`);
      const toast = page.getByText(`You no longer have access to ${original}.`);
      const told = await timed(async () => (await toast.count()) > 0, "B to be told");
      await waitFor(() => new URL(page.url()).pathname === "/", "B to land on the dashboard", 5000);
      // The app's active workspace (no header select names it, D-311 5).
      const now = await waitFor(async () => {
        const active = await page.evaluate(() => localStorage.getItem("intelcost.workspace"));
        return active === home.uuid ? home.name : null;
      }, "B's app to move to its next workspace", 5000);
      const socket = (await appSockets(page)).at(-1);
      const revokedAt = socket.received.find((f) => f.type === "revoked" && f.topic === topic)?.at;
      expect(revokedAt, "B's socket was never revoked from the workspace");

      // Anything A does now in the old workspace reaches B no more.
      await call(token, "PATCH", `/api/workspace/${ws}`, { name: `${original} (after)` });
      await quietFor(1500); // B must hear nothing more from the old workspace
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
      const r = world.r;
      const name = `F8-S15 mode ${Date.now() % 100000}`;
      const item = await countItem(token, r, name);
      await setMode(token, ws, "work_together");
      await recordSockets(context);
      const b = await secondWindow(context);
      try {
        await signInAt(page, APP, world.owner.email, world.owner.password);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await openSheet(page, r);
        await openSheet(b.page, r, APP_B);
        await unfocus(b.page);
        const reread = b.page.waitForResponse((res) => res.url().endsWith("/api/workspace") && res.request().method() === "GET", { timeout: 3000 });
        await setMode(token, ws, "one_at_a_time");
        await reread;
        // "Add a shape" left the menu (D-81): A takes the item in hand by its row's Resume (D-72).
        await page.locator("[data-quantity-panel]").getByRole("button", { name: `Resume ${name}`, exact: true }).first().click();
        const resumeB = b.page.locator("[data-quantity-panel]").getByRole("button", { name: `Resume ${name}`, exact: true }).first();
        await waitFor(() => resumeB.isDisabled(), "B's Resume to be disabled under One at a time", 5000);
        const why = await resumeB.getAttribute("title");
        expect(/is editing this item right now|Being edited by/.test(why ?? ""), `B's Resume says "${why}"`);
        return "B re-read the workspace on the event, and A's next hold made B's controls view-only";
      } finally {
        await b.context.close();
        await setMode(token, ws, "work_together");
        await removeItem(token, r, item.uuid);
      }
    },
  },
]);

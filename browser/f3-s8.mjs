// F3-S8 — a permission change reaches an open tab.
//
//   docker compose --profile browser run --rm browser node scripts/f3-s8.mjs
//
// F8 builds the transport (D-13), so until then the event is NAMED and not emitted and
// the answer arrives on focus. That is the behaviour driven here: a tab that has been
// open across a change does not keep offering what the api will now refuse.
//
// The sharp criterion is AC2, and it is the one worth the trouble: a capability removed
// from under someone mid-action must be refused BY THE API, not merely hidden. A screen
// that only hides is a screen with a hole behind it, and the hole is widest exactly
// here — the control was legitimately drawn a moment ago.
//
// Focus is simulated the way a browser reports it, by dispatching visibilitychange and
// focus, because TanStack listens for those rather than for the window manager.

import {
  APP,
  apiCall,
  apiLogin,
  capabilities,
  createWorkspace,
  expect,
  firstWorkspace,
  members,
  run,
  seatedMember,
  setRole,
  signInAs,
} from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";
const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);

/** What a real browser fires when a tab is looked at again. */
async function refocus(page) {
  // On WINDOW, not document. TanStack Query v5's focusManager listens on window, and
  // dispatching only on document is a no-op that looks exactly like a broken refetch.
  await page.evaluate(() => {
    window.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
}

const uuidOf = async (email) =>
  (await members(ownerToken, workspace.uuid)).find((m) => m.email === email).user_uuid;

await run("f3-s8", [
  {
    title: "AC1 — a role change reaches a tab that was already open, on focus",
    run: async ({ page }) => {
      const seat = await seatedMember(ownerToken, workspace.uuid, "admin", "s8");
      await signInAs(page, seat.email);
      await page.goto(`${APP}/settings/members`);
      // An admin: the invite form is theirs.
      await page.waitForSelector("#invite-email", { timeout: 20000 });
      expect((await page.$("#invite-email")) !== null, "an admin has no invite form");

      // Demoted from another session entirely, while this tab sits there.
      const demoted = await setRole(ownerToken, workspace.uuid, await uuidOf(seat.email), "viewer");
      expect(demoted.status === 200, `demoting gave ${demoted.status}`);

      // Nothing has happened in the tab yet: no event, and no reason to have looked.
      expect((await page.$("#invite-email")) !== null, "the tab updated without being looked at");

      await refocus(page);
      await page.waitForFunction(() => !document.querySelector("#invite-email"), undefined, {
        timeout: 20000,
      });
      const body = await page.textContent("body");
      expect(!/Invited, not joined/.test(body), "the pending invitations section survived");
      return "admin tab → demoted elsewhere → invite form gone on focus, no reload";
    },
  },
  {
    title: "AC2 — a capability removed mid-action is refused by the api, and said out loud",
    run: async ({ page }) => {
      const seat = await seatedMember(ownerToken, workspace.uuid, "admin", "s8-mid");
      // Since F8 a role change reaches an open tab at once (F8-S15), so "the tab does not
      // find out" needs a tab whose realtime socket is down: the case this criterion is
      // really about, a screen drawn from an answer that has since stopped being true.
      await page.addInitScript(() => {
        window.WebSocket = class {
          constructor() {
            setTimeout(() => this.onclose?.({ code: 1006, reason: "" }), 10);
          }
          send() {}
          close() {}
        };
      });
      await signInAs(page, seat.email);
      await page.goto(`${APP}/settings/members`);
      await page.waitForSelector("#invite-email", { timeout: 20000 });

      // Demote them, and DO NOT let the tab find out. The control is still on screen,
      // drawn from an answer that was true when it was drawn.
      await setRole(ownerToken, workspace.uuid, await uuidOf(seat.email), "viewer");

      await page.fill("#invite-email", `s8-late-${Date.now()}@bench.intelcost.io`);
      await page.click('button[type="submit"]');

      // Refused by the api, and the screen says what happened rather than going quiet.
      // The message has to OUTLIVE the control: the form closes a moment later, and a
      // refusal that leaves with it tells the person nothing about why.
      await page.waitForFunction(() => !document.querySelector("#invite-email"), undefined, {
        timeout: 20000,
      });
      const alert = (await page.textContent('[role="alert"]')).trim();
      expect(/Your role cannot invite members/.test(alert), `the screen said "${alert}"`);
      // Nothing was created behind the refusal.
      const invitations = await apiCall(
        ownerToken,
        "GET",
        `/api/workspace/${workspace.uuid}/invitation`,
      );
      expect(
        !invitations.body.some((i) => i.email.startsWith("s8-late-")),
        "the refused invite was created anyway",
      );

      return `403, said after the form closed: "${alert}" · no invitation created`;
    },
  },
  {
    title: "AC3 — demoting yourself takes effect on your own screen",
    run: async ({ page }) => {
      // The case an implementation forgets, because the change arrives through the
      // same tab that made it rather than from somewhere else.
      const seat = await seatedMember(ownerToken, workspace.uuid, "admin", "s8-self");
      const uuid = await uuidOf(seat.email);
      await signInAs(page, seat.email);
      await page.goto(`${APP}/settings/members`);
      await page.waitForSelector("#invite-email", { timeout: 20000 });

      // Their own row, demoted by them. Since P-18 the invite form draws before the
      // member list arrives, so wait for the row itself: an index of -1 selects some
      // other member's row and demotes the wrong person.
      await page.locator("ul li", { hasText: seat.email }).first().waitFor({ timeout: 20000 });
      await page.selectOption(`ul li label select >> nth=${await rowIndex(page, seat.email)}`, "viewer");
      await page.waitForFunction(() => !document.querySelector("#invite-email"), undefined, {
        timeout: 20000,
      });

      const map = (await capabilities(seat.token, workspace.uuid)).capabilities;
      expect(map.canInviteMembers === false, "the api still grants the demoted caller invites");
      // The shell says what they are now, which is the other half of "took effect".
      await page.waitForFunction(
        () => document.querySelector("[data-standing]")?.textContent?.trim() === "Viewer",
        undefined,
        { timeout: 20000 },
      );
      const after = (await members(ownerToken, workspace.uuid)).find((m) => m.user_uuid === uuid);
      expect(after.role === "viewer", `the member row holds ${after.role}`);
      return "self-demoted admin → viewer: controls gone, shell reads Viewer, no reload";
    },
  },
  {
    title: "AC4 — two usePermissions() in one tree do not interfere",
    run: async ({ page }) => {
      // Legacy needed an instance id here: two callers shared a realtime channel name
      // and the second `.on()` crashed. Ours share a query key, which is the opposite
      // problem to have — but "they share it correctly" is still worth driving, and a
      // second caller now exists for a real reason (the standing badge in the shell).
      // Counted for one page load, the Roles page's: signing in loads the dashboard,
      // which asks once for itself. Since P-18 the Roles page is a lazy chunk whose
      // caller mounts after the shell's, and the answer is fresh until F8 says it moved,
      // so the two share one request.
      const requests = [];
      page.on("request", (r) => r.url().includes("/capability") && requests.push(r.url()));
      await signInAs(page, "estimator@bench.intelcost.io");
      await page.waitForLoadState("networkidle");
      requests.length = 0;
      await page.goto(`${APP}/settings/roles`);
      await page.waitForSelector("[data-capability]", { timeout: 20000 });
      await page.waitForFunction(
        () => (document.querySelector("[data-standing]")?.textContent?.trim().length ?? 0) > 0,
        undefined,
        { timeout: 20000 },
      );

      // Both callers rendered, and the answer was fetched once, not twice.
      const standing = (await page.textContent("[data-standing]")).trim();
      expect(standing === "Owner", `the shell reads "${standing}"`);
      // Built-in columns only; a workspace with custom roles renders more (F3-S7).
      const cells = await page.$$eval("[data-capability][data-role]", (nodes) => nodes.length);
      expect(cells === 225, `the matrix rendered ${cells} cells beside the shell`);
      expect(requests.length === 1, `${requests.length} capability requests for two callers`);

      // No console noise from the second mount, which is how the legacy collision showed.
      return `2 callers, ${requests.length} request, shell "${standing}", matrix ${cells} cells`;
    },
  },
]);

/** The index of a member's row among the roster selects. */
async function rowIndex(page, email) {
  return page.$$eval(
    "ul li",
    (nodes, target) =>
      nodes
        .filter((node) => node.querySelector("label select"))
        .findIndex((node) => node.textContent.includes(target)),
    email,
  );
}

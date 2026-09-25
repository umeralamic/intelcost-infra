// F3-S7 — custom roles.
//
//   docker compose --profile browser run --rm browser node scripts/f3-s7.mjs
//
// A custom role is a label, a capability map, and a **base role**: the built-in enum
// value written to `workspace_member.role`, so every rule written against the enum
// keeps working for a role the database has never heard of. Capabilities drive what
// the holder may do; the base role drives everything server-side.
//
// The base role is derived, never chosen, and D-22 is the reason step 3 exists.
// Legacy's `deriveBaseRole` returns admin, estimator, takeoff, pricing — and then falls
// off the end of the function, so a role granting none of those (a reviewer, a
// commenter, an auditor) returns undefined and writes a null role. Three of legacy's
// own nine roles have exactly that shape. Ours returns `viewer`, and the case that
// breaks legacy is the one driven here.
//
// D-25 again, because a custom role is the sharper version of it: a workspace that
// could grant `canGrantOwnerRole` to a role of its own invention would have routed
// around the ownership rule without touching it.

import {
  APP,
  apiCall,
  apiLogin,
  assignCustomRole,
  capabilities,
  createCustomRole,
  createWorkspace,
  deleteCustomRole,
  expect,
  firstWorkspace,
  listCustomRoles,
  matrix,
  members,
  run,
  seatedMember,
  setRole,
  signInAs,
} from "./lib/bench.mjs";

const SEED = "estimator@bench.intelcost.io";
const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);

// A clean slate: an earlier run may have left roles behind, and "delete is refused
// when held" is one of the things being driven, so leftovers change the answer.
for (const role of await listCustomRoles(ownerToken, workspace.uuid)) {
  if (role.label.startsWith("S7 ")) await deleteCustomRole(ownerToken, workspace.uuid, role.uuid);
}

await run("f3-s7", [
  {
    title: "AC1/AC2 — a custom role resolves its own map, and the member row holds its base",
    run: async () => {
      const created = await createCustomRole(ownerToken, workspace.uuid, `S7 Pricer ${Date.now()}`, {
        canEditPricing: true,
        canComment: true,
        canUploadDocuments: true,
      });
      expect(created.status === 201, `creating the role gave ${created.status}`);
      expect(created.body.base_role === "pricing", `base role is ${created.body.base_role}`);

      const seat = await seatedMember(ownerToken, workspace.uuid, "viewer", "s7");
      const row = (await members(ownerToken, workspace.uuid)).find((m) => m.email === seat.email);
      const assigned = await assignCustomRole(
        ownerToken,
        workspace.uuid,
        row.user_uuid,
        created.body.uuid,
      );
      expect(assigned.status === 200, `assigning gave ${assigned.status}`);
      // The member row holds the BASE role, so every rule written against the enum
      // keeps working. The screen names the custom role, which is the other half.
      expect(assigned.body.role === "pricing", `the member row holds ${assigned.body.role}`);
      expect(
        assigned.body.custom_role_label === created.body.label,
        `the member reads as ${assigned.body.custom_role_label}`,
      );

      const map = (await capabilities(seat.token, workspace.uuid)).capabilities;
      expect(map.canEditPricing === true, "the custom role's grant did not resolve");
      // A custom role IS its map: what it does not grant, it does not have. There is
      // no built-in role behind it to fall back through, unlike an override.
      expect(map.canEditTakeoff === false, "a capability the map omits resolved as granted");
      expect(map.canExportProposals === false, "the base role's map leaked through");
      return `"${created.body.label}" → base pricing · member row pricing · map is its own`;
    },
  },
  {
    title: "AC3 (D-22) — a review-only role derives viewer, never nothing",
    run: async () => {
      // The exact shape legacy's deriveBaseRole falls off the end of: neither
      // administration, nor takeoff, nor pricing. Legacy writes a null role here.
      const created = await createCustomRole(
        ownerToken,
        workspace.uuid,
        `S7 Reviewer ${Date.now()}`,
        { canReviewTakeoff: true, canReviewPricing: true, canComment: true },
      );
      expect(created.status === 201, `creating the role gave ${created.status}`);
      expect(
        created.body.base_role === "viewer",
        `a review-only role derived ${JSON.stringify(created.body.base_role)}`,
      );

      const seat = await seatedMember(ownerToken, workspace.uuid, "viewer", "s7-rev");
      const row = (await members(ownerToken, workspace.uuid)).find((m) => m.email === seat.email);
      const assigned = await assignCustomRole(
        ownerToken,
        workspace.uuid,
        row.user_uuid,
        created.body.uuid,
      );
      expect(assigned.body.role === "viewer", `the member row holds ${assigned.body.role}`);

      // Under-grants rather than over-grants: the floor is the safe direction.
      const map = (await capabilities(seat.token, workspace.uuid)).capabilities;
      expect(map.canReviewTakeoff === true, "the reviewer cannot review");
      expect(map.canEditTakeoff === false, "the reviewer can edit");
      expect(map.canManageWorkspace === false, "a review-only role administers");

      // And the base role is never admin for a role that does not administer.
      const administering = await createCustomRole(
        ownerToken,
        workspace.uuid,
        `S7 Lead ${Date.now()}`,
        { canInviteMembers: true, canComment: true },
      );
      expect(
        administering.body.base_role === "admin",
        `an inviting role derived ${administering.body.base_role}`,
      );
      await deleteCustomRole(ownerToken, workspace.uuid, administering.body.uuid);
      return "review-only → viewer (legacy writes null) · inviting → admin";
    },
  },
  {
    title: "AC5 (D-25) — a custom role can never grant ownership, by three separate means",
    run: async () => {
      // 1. The map. A hand-written request from the owner, claiming all six.
      const hostile = await createCustomRole(ownerToken, workspace.uuid, `S7 Usurper ${Date.now()}`, {
        canGrantOwnerRole: true,
        canTransferOwnership: true,
        canManageBilling: true,
        canManageWorkspace: true,
        canEditEstimates: true,
        canComment: true,
      });
      expect(hostile.status === 201, `creating gave ${hostile.status}`);
      expect(
        JSON.stringify(hostile.body.capabilities) === JSON.stringify({ canComment: true }),
        `the stored map is ${JSON.stringify(hostile.body.capabilities)}`,
      );
      // It derived viewer, not admin: canManageWorkspace was dropped before deriving,
      // so a map claiming administration does not buy an administrative base role.
      expect(hostile.body.base_role === "viewer", `it derived ${hostile.body.base_role}`);

      // 2. The resolution. A member holding it gets none of the six.
      const seat = await seatedMember(ownerToken, workspace.uuid, "viewer", "s7-usurp");
      const row = (await members(ownerToken, workspace.uuid)).find((m) => m.email === seat.email);
      await assignCustomRole(ownerToken, workspace.uuid, row.user_uuid, hostile.body.uuid);
      const map = (await capabilities(seat.token, workspace.uuid)).capabilities;
      for (const cap of [
        "canGrantOwnerRole",
        "canTransferOwnership",
        "canManageBilling",
        "canManageWorkspace",
      ]) {
        expect(map[cap] === false, `the custom role resolved ${cap} as true`);
      }
      // canEditEstimates is locked, so it follows the base role rather than the map:
      // viewer does not grant it, and the map claiming it changed nothing.
      expect(map.canEditEstimates === false, "a locked capability was granted by the map");

      // 3. The act itself. Holding it, they cannot hand ownership out.
      const attempt = await setRole(seat.token, workspace.uuid, row.user_uuid, "owner");
      expect(attempt.status === 403, `a custom-role holder got ${attempt.status} granting owner`);

      // And the database refuses the row even with the service bypassed — proven by
      // the constraint's own name, because the service never lets a bad map through.
      await setRole(ownerToken, workspace.uuid, row.user_uuid, "viewer");
      await deleteCustomRole(ownerToken, workspace.uuid, hostile.body.uuid);
      return "6 claimed, 1 stored · derived viewer, not admin · granting owner refused 403";
    },
  },
  {
    title: "AC7/AC8 — deleting a role someone holds is refused and names the count",
    run: async () => {
      const role = await createCustomRole(ownerToken, workspace.uuid, `S7 Held ${Date.now()}`, {
        canComment: true,
      });
      const seat = await seatedMember(ownerToken, workspace.uuid, "viewer", "s7-held");
      const row = (await members(ownerToken, workspace.uuid)).find((m) => m.email === seat.email);
      await assignCustomRole(ownerToken, workspace.uuid, row.user_uuid, role.body.uuid);

      const refused = await deleteCustomRole(ownerToken, workspace.uuid, role.body.uuid);
      expect(refused.status === 409, `deleting a held role gave ${refused.status}`);
      expect(
        /held by 1 person/.test(refused.body?.detail ?? ""),
        `the refusal read "${refused.body?.detail}"`,
      );
      // Still there, and still working: a refused delete that half-happened is worse
      // than one that did not happen.
      const still = await listCustomRoles(ownerToken, workspace.uuid);
      expect(
        still.some((r) => r.uuid === role.body.uuid),
        "the refused delete removed the role anyway",
      );
      expect(
        (await capabilities(seat.token, workspace.uuid)).capabilities.canComment === true,
        "the holder lost the role to a refused delete",
      );

      // Move them off, and now it goes.
      await setRole(ownerToken, workspace.uuid, row.user_uuid, "viewer");
      const after = (await members(ownerToken, workspace.uuid)).find(
        (m) => m.email === seat.email,
      );
      expect(after.custom_role_uuid === null, "moving to a built-in role kept the custom link");
      const gone = await deleteCustomRole(ownerToken, workspace.uuid, role.body.uuid);
      expect(gone.status === 200, `deleting an unheld role gave ${gone.status}`);
      return `held → 409 "${refused.body.detail}" · moved off → deleted`;
    },
  },
  {
    title: "AC9 — a custom role exists only inside its own workspace",
    run: async () => {
      const other = await createWorkspace(ownerToken, `S7 Other ${Date.now()}`);
      const mine = await listCustomRoles(ownerToken, workspace.uuid);
      expect(mine.length > 0, "this workspace has no custom roles to compare");

      const theirs = await listCustomRoles(ownerToken, other.uuid);
      expect(theirs.length === 0, `a new workspace already has ${theirs.length} custom roles`);

      const theirMatrix = await matrix(ownerToken, other.uuid);
      expect(
        theirMatrix.custom_columns.length === 0,
        `a new workspace's matrix has ${theirMatrix.custom_columns.length} custom columns`,
      );
      // And it cannot be assigned across the boundary, which is the part a uuid in a
      // URL makes tempting.
      const seat = await seatedMember(ownerToken, other.uuid, "viewer", "s7-cross");
      const row = (await members(ownerToken, other.uuid)).find((m) => m.email === seat.email);
      const crossed = await assignCustomRole(ownerToken, other.uuid, row.user_uuid, mine[0].uuid);
      expect(crossed.status === 404, `assigning across workspaces gave ${crossed.status}`);
      return `${mine.length} here, 0 there, cross-workspace assignment 404`;
    },
  },
  {
    title: "The screen: create a role, grant a capability, see it named on the roster",
    run: async ({ page }) => {
      await signInAs(page, SEED);
      await page.goto(`${APP}/settings/roles`);
      await page.waitForSelector("[data-new-role]", { timeout: 20000 });

      const label = `S7 Screen ${Date.now()}`;
      await page.click("[data-new-role]");
      await page.fill("#role-label", label);
      await page.click('button:has-text("Create role")');
      await page.waitForFunction(
        (name) => document.body.textContent.includes(name),
        label,
        { timeout: 20000 },
      );

      // It says what it acts as, because that is what every server-side rule reads.
      // An admin who builds a reviewer and sees "acts as viewer" has been told
      // something true, and it is how D-22's fix is visible rather than theoretical.
      const created = (await listCustomRoles(ownerToken, workspace.uuid)).find(
        (r) => r.label === label,
      );
      expect(created, "the role was not created");
      const header = await page.$eval(
        `[data-custom-header="${created.uuid}"]`,
        (node) => ({ base: node.dataset.baseRole, text: node.textContent.trim() }),
      );
      expect(header.base === "viewer", `a role granting nothing acts as ${header.base}`);
      expect(/acts as viewer/.test(header.text), `the header reads "${header.text}"`);

      // Grant one by clicking, and the api agrees.
      await page.click(`[data-custom-role="${created.uuid}"][data-capability="canComment"]`);
      await page.waitForFunction(
        (uuid) =>
          document
            .querySelector(`[data-custom-role="${uuid}"][data-capability="canComment"]`)
            ?.getAttribute("data-granted") === "yes",
        created.uuid,
        { timeout: 20000 },
      );
      const after = (await listCustomRoles(ownerToken, workspace.uuid)).find(
        (r) => r.uuid === created.uuid,
      );
      expect(after.capabilities.canComment === true, "the click did not reach the api");

      // A locked cell is not a button here either (D-25).
      const locked = await page.$eval(
        `[data-custom-role="${created.uuid}"][data-capability="canGrantOwnerRole"]`,
        (node) => node.tagName.toLowerCase(),
      );
      expect(locked === "span", `a locked cell on a custom role rendered as ${locked}`);

      // And the roster names the role, not the base role it resolves to.
      const seat = await seatedMember(ownerToken, workspace.uuid, "viewer", "s7-screen");
      const row = (await members(ownerToken, workspace.uuid)).find((m) => m.email === seat.email);
      await assignCustomRole(ownerToken, workspace.uuid, row.user_uuid, created.uuid);

      await page.goto(`${APP}/settings/members`);
      await page.waitForFunction(
        (email) => document.body.textContent.includes(email),
        seat.email,
        { timeout: 20000 },
      );
      // Wait for the custom-role optgroup: the roster loads members and custom roles
      // in two requests, and a select whose value matches no option yet renders the
      // first one — which reads as the member holding a role they do not hold.
      // `state: "attached"`, not the default: an optgroup inside a closed select is
      // never "visible", so waiting for visibility waits forever. Same trap the
      // workspace switcher set in F2.
      await page.waitForSelector("ul li label select optgroup", {
        state: "attached",
        timeout: 20000,
      });
      const shown = await page.$$eval("ul li label select", (nodes) =>
        nodes.map((node) => node.selectedOptions[0]?.text ?? ""),
      );
      expect(
        shown.includes(label),
        `the roster shows ${JSON.stringify(shown.slice(0, 6))}, not "${label}"`,
      );
      await deleteCustomRole(ownerToken, workspace.uuid, created.uuid).catch(() => {});
      return `created on screen · "acts as viewer" · click granted canComment · named on the roster`;
    },
  },
]);

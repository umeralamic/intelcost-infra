// F3-S2 — resolution: role default, override, custom role, plan mask, trial mask.
//
// Three of the five stages cannot be reached through a route yet: overrides and custom
// roles have no table until F3-S6 and F3-S7, and the plan is a constant until F16.
// Those rules are driven against the real module in the api container instead:
//
//   docker compose exec -T api sh -lc "cd /srv && python drives/f3-s2-resolution.py"
//
// What IS reachable is the trial mask and the platform-admin bypass, because both read
// real columns. Neither can be moved from a browser — only time or the database ages a
// trial, and nothing in the product makes someone staff — so this runs in two passes
// with one database step between them, the same shape as the expired invitation in
// f2-close.mjs:
//
//   docker compose --profile browser run --rm -e SETUP=1 browser node scripts/f3-s2.mjs
//   # prints WORKSPACE=<uuid> STAFF=<email>
//   docker compose exec -T postgres psql -U intelcost -d intelcost \
//     -c "update workspace set trial_started_at = now() - interval '30 days', \
//         trial_ends_at = now() - interval '1 day' where uuid = '<uuid>'" \
//     -c "update \"user\" set is_platform_admin = true where email = '<email>'"
//   docker compose --profile browser run --rm -e WORKSPACE=<uuid> -e STAFF=<email> \
//     browser node scripts/f3-s2.mjs

import {
  APP,
  apiCall,
  apiLogin,
  capabilities,
  createWorkspace,
  expect,
  firstWorkspace,
  run,
  seatedMember,
} from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";
const ownerToken = await apiLogin();

if (process.env.SETUP === "1") {
  const workspace = await createWorkspace(ownerToken, `S2 Trial ${Date.now()}`);
  const staff = await seatedMember(ownerToken, workspace.uuid, "takeoff", "s2-staff");
  console.log(`WORKSPACE=${workspace.uuid}`);
  console.log(`STAFF=${staff.email}`);
  process.exit(0);
}

const expiredUuid = process.env.WORKSPACE;
const staffEmail = process.env.STAFF;
if (!expiredUuid || !staffEmail) {
  console.error("Run the SETUP pass first; see the header.");
  process.exit(2);
}
const staffToken = await apiLogin(staffEmail, PASSWORD);
const live = await firstWorkspace(ownerToken);

await run("f3-s2", [
  {
    title: "AC5 — an expired trial strips everything but the keeps, for the owner",
    run: async () => {
      const map = (await capabilities(ownerToken, expiredUuid)).capabilities;
      const held = Object.entries(map).filter(([, on]) => on).map(([cap]) => cap).sort();
      // Administration and billing survive on purpose: a workspace locked out of
      // paying is a workspace that cannot unlock itself.
      const expected = [
        "canAssignRoles",
        "canComment",
        "canGrantOwnerRole",
        "canInviteMembers",
        "canManageBilling",
        "canManageWorkspace",
        "canRemoveMembers",
        "canTransferOwnership",
        "canViewWorkspaceActivity",
      ];
      expect(
        JSON.stringify(held) === JSON.stringify(expected),
        `the expired owner holds ${held.join(", ")}`,
      );
      expect(map.canEditTakeoff === false, "an expired trial still measures");
      expect(map.canCreateProjects === false, "an expired trial still creates projects");
      return `owner on an expired trial: ${held.length} of 25, all administration`;
    },
  },
  {
    title: "AC7 — the same workspace, the same instant: staff are not masked",
    run: async () => {
      const map = (await capabilities(staffToken, expiredUuid)).capabilities;
      expect(map.canEditTakeoff === true, "staff lost takeoff to a customer's expired trial");
      // And staff keep the role they hold, rather than being promoted by the bypass.
      expect(map.canManageWorkspace === false, "the bypass widened a takeoff seat to admin");
      expect(map.canEditPricing === false, "the bypass widened a takeoff seat to pricing");
      const standing = await capabilities(staffToken, expiredUuid);
      expect(standing.is_platform_admin === true, "the api does not report them as staff");
      expect(standing.is_workspace_admin === false, "a takeoff seat reads as a workspace admin");
      return "takeoff seat, unmasked by the expired trial, still only a takeoff seat";
    },
  },
  {
    title: "AC6 — a workspace with no trial window at all is not restricted",
    run: async () => {
      // D-18 stamps a null window when the resolved tier had no rule. Reading "we
      // never granted a trial" as "the trial ran out" would lock out every workspace
      // created during a geo outage, which is the fail-open rule inverted.
      const map = (await capabilities(ownerToken, live.uuid)).capabilities;
      const held = Object.values(map).filter(Boolean).length;
      expect(held === 25, `the owner of an untrialled workspace holds ${held} of 25`);
      return `${live.name}: no window, 25 of 25`;
    },
  },
  {
    title: "The app reads one answer: the screen matches the map the api returned",
    run: async ({ page }) => {
      // The chain is only worth anything if the screen is downstream of it. The
      // expired workspace keeps canInviteMembers, so the invite form is still there;
      // it loses canEditTakeoff, which no screen reads until F3-S3.
      await page.goto(`${APP}/login`);
      await page.fill("#email", "estimator@bench.intelcost.io");
      await page.fill("#password", PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });

      const answer = await page.evaluate(async (uuid) => {
        const raw = localStorage.getItem("intelcost.session");
        const token = JSON.parse(raw).accessToken;
        const response = await fetch(`http://localhost:8000/api/workspace/${uuid}/capability`, {
          headers: { authorization: `Bearer ${token}` },
        });
        return response.json();
      }, expiredUuid);

      expect(answer.capabilities.canEditTakeoff === false, "the browser sees an unmasked map");
      expect(answer.capabilities.canInviteMembers === true, "the browser lost administration");
      expect(answer.is_workspace_admin === true, "the owner does not read as a workspace admin");
      return "the browser and the api agree on the expired workspace";
    },
  },
  {
    title: "The mask bites on a real write path, not only in the map",
    run: async () => {
      // A map is a claim until a route honours it. Creating a project goes through
      // `require_write`, which after F3-S3 asks for canEditTakeoff rather than "not a
      // collaborator" — so the expired owner is refused, and the unmasked staff member
      // holding a plain takeoff seat is not. Same workspace, same instant.
      const blocked = await apiCall(ownerToken, "POST", `/api/workspace/${expiredUuid}/project`, {
        name: "Should not exist",
      });
      expect(blocked.status === 403, `the expired owner got ${blocked.status}`);
      expect(
        /^Your role cannot create/.test(blocked.body?.detail ?? ""),
        `the refusal read ${JSON.stringify(blocked.body)}`,
      );

      const allowed = await apiCall(staffToken, "POST", `/api/workspace/${expiredUuid}/project`, {
        name: `Staff probe ${Date.now()}`,
      });
      expect(allowed.status === 201, `staff got ${allowed.status} on the same workspace`);
      return "owner 403, staff 201 — the trial mask is enforced, and staff bypass it";
    },
  },
]);

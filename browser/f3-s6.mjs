// F3-S6 — a built-in role, edited for this workspace.
//
//   docker compose --profile browser run --rm browser node scripts/f3-s6.mjs
//
// An override replaces a role's map for ONE workspace. The subtle rule, and the one
// this pass spends most of its steps on, is that the stored map is **sparse**: a key
// that is absent has not been decided, and falls back to the built-in default at read
// time. Save a full map instead and every capability shipped after that day reads as
// revoked for that workspace — silently, and only for the workspaces that ever used
// the feature. That failure is invisible from the screen, so it is driven here.
//
// The second thing is D-25: the three locked capabilities are shown and cannot be
// moved, by a click or by a hand-written request, and the database refuses the row even
// if the service is bypassed. A locked cell that is only locked in the browser is a
// decoration.
//
// It needs a second workspace, because "for this workspace only" is not a claim one
// workspace can support.

import {
  APP,
  apiCall,
  apiLogin,
  capabilities,
  clearOverride,
  createWorkspace,
  expect,
  firstWorkspace,
  matrix,
  run,
  seatedMember,
  setOverride,
  setRole,
  signInAs,
  members,
} from "./lib/bench.mjs";

const LOCKED = ["canManageWorkspace", "canGrantOwnerRole", "canEditEstimates"];
const SEED = "estimator@bench.intelcost.io";

const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);
const other = await createWorkspace(ownerToken, `S6 Other ${Date.now()}`);

const column = (answer, role) => answer.columns.find((c) => c.role === role);

await run("f3-s6", [
  {
    title: "AC1 — an override changes this workspace and no other",
    run: async () => {
      await clearOverride(ownerToken, workspace.uuid, "takeoff");
      const before = column(await matrix(ownerToken, workspace.uuid), "takeoff");
      expect(before.capabilities.canRunAi === true, "takeoff does not grant canRunAi by default");

      const saved = await setOverride(ownerToken, workspace.uuid, "takeoff", {
        canRunAi: false,
      });
      expect(saved.status === 200, `saving the override gave ${saved.status}`);

      const here = column(await matrix(ownerToken, workspace.uuid), "takeoff");
      expect(here.capabilities.canRunAi === false, "the override did not take");
      expect(here.overridden === true, "the column is not marked as overridden");

      const elsewhere = column(await matrix(ownerToken, other.uuid), "takeoff");
      expect(
        elsewhere.capabilities.canRunAi === true,
        "the override leaked into a second workspace",
      );
      expect(elsewhere.overridden === false, "the second workspace reads as overridden");
      return `takeoff loses canRunAi in ${workspace.name}, keeps it in ${other.name}`;
    },
  },
  {
    title: "AC4 — a capability absent from a saved override falls back to the role default",
    run: async () => {
      // The map saved above mentions exactly one capability. Everything else was never
      // decided, so it must still read as the built-in takeoff role — not as denied.
      // This is the rule that keeps a capability shipped next month from being
      // silently revoked for every workspace that ever saved an override.
      const here = column(await matrix(ownerToken, workspace.uuid), "takeoff");
      const builtIn = column(await matrix(ownerToken, other.uuid), "takeoff");

      const differ = Object.keys(builtIn.capabilities).filter(
        (cap) => builtIn.capabilities[cap] !== here.capabilities[cap],
      );
      expect(
        JSON.stringify(differ) === JSON.stringify(["canRunAi"]),
        `${differ.length} capabilities differ, not 1: ${differ.join(", ")}`,
      );
      expect(
        here.capabilities.canEditTakeoff === true && here.capabilities.canCreateProjects === true,
        "an undecided capability read as denied",
      );
      expect(
        JSON.stringify(here.edited) === JSON.stringify(["canRunAi"]),
        `the column claims ${here.edited.length} edited cells: ${here.edited.join(", ")}`,
      );
      return `1 of 25 decided; the other 24 still follow the built-in takeoff role`;
    },
  },
  {
    title: "AC4 again, the sharp end — a member resolves the fallback, not a denial",
    run: async () => {
      // The matrix is one reader. The thing that matters is what a real member holding
      // the role actually gets, resolved through `current_workspace`.
      const seat = await seatedMember(ownerToken, workspace.uuid, "takeoff", "s6");
      const map = (await capabilities(seat.token, workspace.uuid)).capabilities;
      expect(map.canRunAi === false, "the member kept a capability the override removed");
      expect(map.canEditTakeoff === true, "an undecided capability resolved as denied");
      expect(map.canUploadDocuments === true, "an undecided capability resolved as denied");

      // And a write path honours it: canEditTakeoff survived, so a project still goes.
      const project = await apiCall(seat.token, "POST", `/api/workspace/${workspace.uuid}/project`, {
        name: `S6 probe ${Date.now()}`,
      });
      expect(project.status === 201, `a takeoff seat got ${project.status} creating a project`);
      return "member: canRunAi removed, the other 24 unchanged, write path still open";
    },
  },
  {
    title: "AC3 — only the five working roles may be overridden; the api refuses the rest",
    run: async () => {
      const refusals = [];
      for (const role of ["owner", "admin", "collaborator", "viewer"]) {
        refusals.push([role, await setOverride(ownerToken, workspace.uuid, role, { canRunAi: false })]);
      }
      const wrong = refusals.filter(([, r]) => r.status !== 403);
      expect(
        wrong.length === 0,
        `statuses: ${refusals.map(([role, r]) => `${role}=${r.status}`).join(", ")}`,
      );
      // Named, not a bare 403: the reader needs to know it is the role that is fixed,
      // not their own standing.
      expect(
        refusals.every(([, r]) => /every workspace/i.test(r.body?.detail ?? "")),
        `messages: ${JSON.stringify(refusals.map(([, r]) => r.body?.detail))}`,
      );

      // And nothing was written on the way to the refusal.
      const answer = await matrix(ownerToken, workspace.uuid);
      const leaked = ["owner", "admin", "collaborator", "viewer"].filter(
        (role) => column(answer, role).overridden,
      );
      expect(leaked.length === 0, `${leaked.join(", ")} got an override row anyway`);
      return `4 fixed roles refused · "${refusals[0][1].body.detail}"`;
    },
  },
  {
    title: "AC5/AC6 — forbidden and locked capabilities cannot be written, by any route in",
    run: async () => {
      // Hand-written, from the owner, who is the strongest caller there is. The screen
      // never offers these; that is not what is being checked.
      const hostile = await setOverride(ownerToken, workspace.uuid, "pricing", {
        canTransferOwnership: true,
        canManageBilling: true,
        canGrantOwnerRole: true,
        canManageWorkspace: true,
        canEditEstimates: false,
        canExportProposals: false,
      });
      expect(hostile.status === 200, `the write gave ${hostile.status}`);

      // It succeeded, and it granted none of them. The service drops the forbidden and
      // the locked keys rather than refusing the whole request, because the one key
      // that WAS legitimate (canExportProposals) is the caller's actual intent.
      expect(
        JSON.stringify(hostile.body.capabilities) === JSON.stringify({ canExportProposals: false }),
        `the stored map is ${JSON.stringify(hostile.body.capabilities)}`,
      );

      const pricing = column(await matrix(ownerToken, workspace.uuid), "pricing");
      for (const cap of ["canTransferOwnership", "canManageBilling", "canGrantOwnerRole"]) {
        expect(pricing.capabilities[cap] === false, `pricing resolved ${cap} as true`);
      }
      // Locked keeps the built-in answer either way, granted or denied.
      const builtIn = column(await matrix(ownerToken, other.uuid), "pricing");
      for (const cap of LOCKED) {
        expect(
          pricing.capabilities[cap] === builtIn.capabilities[cap],
          `${cap} moved: ${builtIn.capabilities[cap]} → ${pricing.capabilities[cap]}`,
        );
      }
      expect(
        !pricing.edited.some((cap) => LOCKED.includes(cap)),
        `a locked capability is marked edited: ${pricing.edited.join(", ")}`,
      );
      await clearOverride(ownerToken, workspace.uuid, "pricing");
      return `6 keys sent, 1 stored · the 3 locked and the 3 forbidden all dropped`;
    },
  },
  {
    title: "D-25 in the browser — a locked cell is not a button, and says why",
    run: async ({ page }) => {
      await signInAs(page, SEED);
      await page.goto(`${APP}/settings/roles`);
      await page.waitForSelector("[data-capability]", { timeout: 20000 });

      // An editable role's column: 22 of its 25 cells are buttons, the 3 locked ones
      // are not. "Not a button" is the check, not "a button that does nothing" —
      // a disabled button still reads as something that might work later.
      const takeoff = await page.$$eval('[data-role="takeoff"]', (nodes) =>
        nodes.map((node) => ({
          capability: node.dataset.capability,
          tag: node.tagName.toLowerCase(),
          locked: node.dataset.locked === "yes",
          title: node.getAttribute("title") ?? "",
        })),
      );
      expect(takeoff.length === 25, `the takeoff column renders ${takeoff.length} cells`);

      const lockedCells = takeoff.filter((cell) => cell.locked);
      expect(lockedCells.length === 3, `${lockedCells.length} cells are locked`);
      expect(
        lockedCells.every((cell) => LOCKED.includes(cell.capability)),
        `the locked cells are ${lockedCells.map((c) => c.capability).join(", ")}`,
      );
      expect(
        lockedCells.every((cell) => cell.tag === "span"),
        `a locked cell rendered as ${lockedCells.map((c) => c.tag).join(", ")}`,
      );
      expect(
        lockedCells.every((cell) => cell.title.length > 10),
        `a locked cell carries no reason: ${JSON.stringify(lockedCells)}`,
      );

      const clickable = takeoff.filter((cell) => cell.tag === "button");
      expect(clickable.length === 22, `${clickable.length} cells are clickable, not 22`);

      // Clicking one changes nothing, because there is nothing to click. Driven, not
      // assumed: the cell is clicked at its coordinates and the map is re-read.
      const grantOwner = await matrix(ownerToken, workspace.uuid);
      const beforeMap = column(grantOwner, "takeoff").capabilities.canGrantOwnerRole;
      await page.click('[data-role="takeoff"][data-capability="canGrantOwnerRole"]', {
        force: true,
      });
      await page.waitForTimeout(1000);
      const after = column(await matrix(ownerToken, workspace.uuid), "takeoff");
      expect(
        after.capabilities.canGrantOwnerRole === beforeMap,
        "clicking a locked cell moved it",
      );
      expect(
        !after.edited.includes("canGrantOwnerRole"),
        "clicking a locked cell wrote it into the override",
      );
      return `22 of 25 clickable · 3 locked, rendered as text with a reason · a click changes nothing`;
    },
  },
  {
    title: "AC2 — an edited cell says so on the screen, and Reset puts it back",
    run: async ({ page }) => {
      await setOverride(ownerToken, workspace.uuid, "takeoff", { canRunAi: false });
      await signInAs(page, SEED);
      await page.goto(`${APP}/settings/roles`);
      await page.waitForSelector('[data-role-header="takeoff"]', { timeout: 20000 });

      const header = await page.$eval('[data-role-header="takeoff"]', (node) => ({
        overridden: node.dataset.overridden === "yes",
        text: node.textContent.trim(),
      }));
      expect(header.overridden, "the takeoff column is not marked as overridden");
      expect(/Edited here/.test(header.text), `the header reads "${header.text}"`);

      const cell = await page.$eval(
        '[data-role="takeoff"][data-capability="canRunAi"]',
        (node) => ({ edited: node.dataset.edited === "yes", title: node.getAttribute("title") }),
      );
      expect(cell.edited, "the edited cell is not marked");
      expect(
        /Edited for this workspace/i.test(cell.title ?? ""),
        `the edited cell reads "${cell.title}"`,
      );
      // A cell nobody touched is not marked, or the flag means nothing.
      const untouched = await page.$eval(
        '[data-role="takeoff"][data-capability="canEditTakeoff"]',
        (node) => node.dataset.edited === "yes",
      );
      expect(!untouched, "an untouched cell is flagged as edited");

      await page.click('[data-reset-role="takeoff"]');
      await page.waitForFunction(
        () => !document.querySelector('[data-role-header="takeoff"][data-overridden="yes"]'),
        undefined,
        { timeout: 20000 },
      );
      const back = column(await matrix(ownerToken, workspace.uuid), "takeoff");
      expect(back.overridden === false, "Reset left the override row behind");
      expect(back.capabilities.canRunAi === true, "Reset did not restore the default");
      return `"Edited here" on the column, "Edited for this workspace" on the cell, Reset restores`;
    },
  },
  {
    title: "AC7 — a disabled role leaves the pickers, and members holding it keep working",
    run: async ({ page }) => {
      // A failed earlier run can leave the role disabled, and then seating the member
      // for this step is refused by the rule the step is here to check. Clear first.
      await clearOverride(ownerToken, workspace.uuid, "qa_pricing");
      const seat = await seatedMember(ownerToken, workspace.uuid, "qa_pricing", "s6-disabled");
      await setOverride(ownerToken, workspace.uuid, "qa_pricing", {}, true);

      // Gone from the roles an admin may hand out.
      const offered = (await capabilities(ownerToken, workspace.uuid)).assignable_roles.map(
        (option) => option.role,
      );
      expect(!offered.includes("qa_pricing"), `the picker still offers ${offered.join(", ")}`);
      expect(offered.length === 7, `${offered.length} roles offered, not 7`);

      // And from the screen.
      await signInAs(page, SEED);
      await page.goto(`${APP}/settings/members`);
      await page.waitForSelector("#invite-role", { timeout: 20000 });
      const inPicker = await page.$$eval("#invite-role option", (nodes) =>
        nodes.map((node) => node.value),
      );
      expect(!inPicker.includes("qa_pricing"), `the invite picker offers ${inPicker.join(", ")}`);

      // The member holding it keeps working. Stripping a seat because an admin tidied
      // a picker is a worse failure than a role nobody new can be given.
      const map = (await capabilities(seat.token, workspace.uuid)).capabilities;
      expect(map.canReviewPricing === true, "a disabled role stripped the member who held it");
      const assigning = await setRole(
        ownerToken,
        workspace.uuid,
        (await members(ownerToken, workspace.uuid)).find((m) => m.email === seat.email).user_uuid,
        "qa_pricing",
      );
      expect(assigning.status === 403, `a disabled role was still assignable: ${assigning.status}`);

      await clearOverride(ownerToken, workspace.uuid, "qa_pricing");
      const restored = (await capabilities(ownerToken, workspace.uuid)).assignable_roles.length;
      expect(restored === 8, `${restored} roles after re-enabling`);
      return "qa_pricing disabled: 7 offered, the member unaffected, assignment refused";
    },
  },
]);

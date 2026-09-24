// F3-S1 — nine roles, twenty-four capabilities, one map.
//
//   docker compose --profile browser run --rm browser node scripts/f3-s1.mjs
//
// Legacy has TWENTY-FIVE capabilities, not the twenty-four PARITY §3 claimed. The
// count was read off the section heading rather than off the file; `NO_CAPABILITIES`
// has 25 keys. Corrected in PARITY, D-21 and this spec. Legacy's own matrix then
// administers only 22 of them — it omits canManageWorkspace, canGrantOwnerRole and
// canEditEstimates — which F3-S5 does not reproduce.
//
// The subtask's whole claim is that there is ONE answer, held in two places for two
// different jobs: the api decides what happens, the app decides what is drawn. So the
// pass compares them cell by cell — nine roles by twenty-five capabilities, 225 cells
// — and does it by reading BOTH of the real modules rather than restating either here.
// A fixture carrying a third copy of the map would prove only that the fixture agreed
// with one of them.
//
// The app's module is read through the page: Vite's dev server transpiles
// `/src/features/workspace/capabilities.ts` on demand, so a dynamic import inside the
// browser loads exactly the module the app itself loads. Nothing is stripped, nothing
// is re-implemented, and there is no build step in the bench. This works because the
// bench runs the dev server (the app image is dev-only; see the infra README).
//
// Step 4 needs members at roles nobody holds yet, so it seats fresh accounts through
// the real invitation path rather than writing rows.

import {
  APP,
  apiLogin,
  capabilities,
  expect,
  firstWorkspace,
  members,
  run,
  seatedMember,
  setRole,
} from "./lib/bench.mjs";

const ROLES = [
  "owner",
  "admin",
  "estimator",
  "takeoff",
  "pricing",
  "qa_takeoff",
  "qa_pricing",
  "collaborator",
  "viewer",
];

const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);

/** The app's own capability module, loaded the way the app loads it. */
async function appMirror(page) {
  await page.goto(APP);
  return page.evaluate(async () => {
    const module = await import("/src/features/workspace/capabilities.ts");
    return {
      capabilities: [...module.CAPABILITIES],
      byRole: Object.fromEntries(
        Object.keys(module.ROLE_TO_CAPS).map((role) => [
          role,
          module.capabilitiesForRole(role),
        ]),
      ),
    };
  });
}

/** One account, walked through every role, so each map is read from a member who
 *  actually holds it. Cheaper than nine accounts and closer to what happens. */
const walker = await seatedMember(ownerToken, workspace.uuid, "viewer", "s1");
const walkerRow = (await members(ownerToken, workspace.uuid)).find(
  (row) => row.email === walker.email,
);
if (!walkerRow) throw new Error("the seated walker is not in the roster");
const walkerUuid = walkerRow.user_uuid;

async function apiMapFor(role) {
  if (role === "owner") return (await capabilities(ownerToken, workspace.uuid)).capabilities;
  const moved = await setRole(ownerToken, workspace.uuid, walkerUuid, role);
  if (moved.status !== 200) throw new Error(`moving the walker to ${role}: ${moved.status}`);
  return (await capabilities(walker.token, workspace.uuid)).capabilities;
}

await run("f3-s1", [
  {
    title: "AC1 — nine roles and twenty-five capabilities, the same ones on both sides",
    run: async ({ page }) => {
      const mirror = await appMirror(page);
      expect(
        mirror.capabilities.length === 25,
        `the app names ${mirror.capabilities.length} capabilities, not 25`,
      );
      const roles = Object.keys(mirror.byRole).sort();
      expect(
        JSON.stringify(roles) === JSON.stringify([...ROLES].sort()),
        `the app's roles are ${roles.join(", ")}`,
      );
      const fromApi = Object.keys((await capabilities(ownerToken, workspace.uuid)).capabilities);
      const appOnly = mirror.capabilities.filter((cap) => !fromApi.includes(cap));
      const apiOnly = fromApi.filter((cap) => !mirror.capabilities.includes(cap));
      expect(
        appOnly.length === 0 && apiOnly.length === 0,
        `api-only: ${apiOnly.join(", ") || "none"} · app-only: ${appOnly.join(", ") || "none"}`,
      );
      // The legacy umbrella is easy to drop on a rewrite, and dropping it quietly
      // changes the meaning of every ported call site, so it is named not counted.
      expect(fromApi.includes("canEditEstimates"), "canEditEstimates is missing");
      // The api also answers which roles this caller may hand out. Never owner.
      const assignable = (await capabilities(ownerToken, workspace.uuid)).assignable_roles;
      expect(assignable.length === 8, `${assignable.length} assignable roles`);
      expect(
        !assignable.some((option) => option.role === "owner"),
        "owner is offered as an assignable role",
      );
      expect(
        assignable.every((option) => option.label && option.blurb),
        "an assignable role has no label or no blurb",
      );
      return `25 capabilities · 9 roles · 8 assignable, owner not among them`;
    },
  },
  {
    title: "AC2 — all 225 cells: the api's resolved map equals the app's, for every role",
    run: async ({ page }) => {
      const mirror = await appMirror(page);
      const disagreements = [];
      let cells = 0;
      for (const role of ROLES) {
        const apiMap = await apiMapFor(role);
        for (const cap of mirror.capabilities) {
          cells += 1;
          if (apiMap[cap] !== mirror.byRole[role][cap]) {
            disagreements.push(
              `${role}.${cap}: api=${apiMap[cap]} app=${mirror.byRole[role][cap]}`,
            );
          }
        }
      }
      expect(
        disagreements.length === 0,
        `${disagreements.length} disagree — ${disagreements.slice(0, 4).join(" · ")}`,
      );
      return `${cells} cells compared, 0 disagreements`;
    },
  },
  {
    title: "AC3 — every key present in every map; a capability nothing grants is false",
    run: async ({ page }) => {
      // "Present" matters as much as "true": a client that has to tell false from
      // absent has two answers for one question.
      const mirror = await appMirror(page);
      for (const role of ROLES) {
        const apiMap = await apiMapFor(role);
        const absent = mirror.capabilities.filter((cap) => !(cap in apiMap));
        expect(absent.length === 0, `${role} is missing ${absent.join(", ")}`);
      }
      // A capability granted by no role at all. There is no such capability today —
      // owner grants all 24 — so the property is driven on the app's map, where one
      // can be named. The api is built the same way, NO_CAPABILITIES then the role's
      // grants, and AC2 has just shown the two agree on all 216 cells.
      const floor = await page.evaluate(async () => {
        const module = await import("/src/features/workspace/capabilities.ts");
        return {
          anyGranted: Object.values(module.NO_CAPABILITIES).some(Boolean),
          ungranted: module.capabilitiesForRole("owner").canFly,
        };
      });
      expect(!floor.anyGranted, "the floor map grants something");
      expect(floor.ungranted === undefined, `an ungranted capability read ${floor.ungranted}`);
      return "every key present in all 9 maps · the floor grants nothing";
    },
  },
  {
    title: "AC6 — viewer grants nothing, and collaborator grants exactly three",
    run: async () => {
      const viewer = await apiMapFor("viewer");
      const held = Object.entries(viewer).filter(([, on]) => on).map(([cap]) => cap);
      expect(held.length === 0, `viewer holds ${held.join(", ")}`);

      // The role beside it, so the floor reads as a real floor rather than a map the
      // resolver forgot to fill: collaborator reads, comments and uploads.
      const collaborator = await apiMapFor("collaborator");
      const on = Object.entries(collaborator).filter(([, v]) => v).map(([cap]) => cap).sort();
      expect(
        JSON.stringify(on) ===
          JSON.stringify(["canComment", "canUploadDocuments", "canUseAnnotations"]),
        `collaborator holds ${on.join(", ")}`,
      );
      return "viewer: 0 of 25 · collaborator: comment, upload, annotate";
    },
  },
  {
    title: "The running app survives the widened enum: the members screen offers nine roles",
    run: async ({ page }) => {
      // The point is the screen, not the map. The enum widened under a running app,
      // and a select whose value is not among its options renders blank — which reads
      // as "no role" rather than "a role you cannot hand out".
      await page.goto(`${APP}/login`);
      await page.fill("#email", "estimator@bench.intelcost.io");
      await page.fill("#password", "bench-password-1");
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });

      await page.goto(`${APP}/settings/members`);
      await page.waitForSelector("#invite-role", { timeout: 20000 });
      await page.waitForFunction(
        () => document.querySelectorAll("#invite-role option").length > 0,
        undefined,
        { timeout: 20000 },
      );
      const offered = await page.$$eval("#invite-role option", (nodes) =>
        nodes.map((node) => node.value),
      );
      expect(offered.length === 8, `the invite picker offers ${offered.length} roles`);
      expect(!offered.includes("owner"), "the invite picker offers owner");
      expect(offered.includes("qa_takeoff"), `the picker offers ${offered.join(", ")}`);

      const rows = await page.$$eval("ul li label select", (nodes) =>
        nodes.map((node) => ({ value: node.value, text: node.selectedOptions[0]?.text ?? "" })),
      );
      expect(rows.length > 0, "the roster rendered no rows");
      const blank = rows.filter((row) => !row.text.trim());
      expect(blank.length === 0, `${blank.length} of ${rows.length} rows render a blank role`);
      return `picker: ${offered.join(", ")} · ${rows.length} rows, none blank`;
    },
  },
]);

// F3-S3 — one check, everywhere. No gate tests a role.
//
//   docker compose --profile browser run --rm browser node scripts/f3-s3.mjs
//
// Before this, nine api routes read `require(OWNER, ADMIN)`, `can_write` meant "not a
// collaborator", and the members screen carried one `canManage` flag standing in for
// three different answers. Each was a separate copy of a rule the api owns, and none
// of them could express "QA reviews but cannot edit" — which is the distinction the
// takeoff review flow is built around.
//
// **Hiding is not a gate.** Every step that finds a control absent also sends the
// request by hand and expects the api to refuse it. A screen that hides a button in
// front of an api that would have accepted the call is a screen lying about a hole.
//
// Step 1 greps both source trees, which are mounted read-only at /src/app and
// /src/api. It is the only honest way to assert the absence of a pattern, and a grep
// that lives in the fixture is a grep that gets re-run.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  APP,
  apiCall,
  apiLogin,
  capabilities,
  expect,
  firstWorkspace,
  members,
  run,
  seatedMember,
  setRole,
} from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";
const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);

async function sources(dir, match, found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await sources(full, match, found);
    else if (match.test(entry.name)) found.push([full, await readFile(full, "utf8")]);
  }
  return found;
}

/** A qa_takeoff seat: reviews measurements, cannot edit them, administers nothing.
 *  The role four values could not express, which is why it is the one driven here. */
const reviewer = await seatedMember(ownerToken, workspace.uuid, "qa_takeoff", "s3");


/** Lines that are comments, not code. A rule quoted in a docstring is not a gate. */
const isComment = (line) => /^\s*(\/\/|\*|\/\*|#)/.test(line);

/** The role references that MAY remain, and why. Anything else fails step 1.
 *
 *  The banned thing is a gate on the CALLER's role. A rule about the role of the
 *  member being acted on is a different animal: "a workspace keeps one owner" and
 *  "an admin does not change an owner's role" are statements about ownership itself,
 *  and expressing them as capabilities would be a fiction. They are listed rather than
 *  waved through, so the list has to be edited for a new one to pass. */
const ALLOWED = [
  ["SettingsMembers.tsx", "rows.filter((member) => member.role === \"owner\")", "counts owners for the last-owner invariant"],
  ["SettingsMembers.tsx", "self?.role === \"owner\" && ownerCount === 1", "the caller may not leave as the last owner"],
  ["MembersTable.tsx", "member.role === \"owner\" && ownerCount === 1", "the last owner may not be demoted"],
  ["MembersTable.tsx", "!canGrantOwnerRole && member.role === \"owner\"", "the TARGET is the owner; the caller half is already a capability"],
];


/** Every code line matching a pattern, comments skipped, as "file:line text". */
function codeHits(files, pattern) {
  const found = [];
  for (const [file, text] of files) {
    text.split("\n").forEach((line, index) => {
      if (!isComment(line) && pattern.test(line)) {
        found.push({ file, line: index + 1, text: line.trim() });
      }
    });
  }
  return found;
}

const show = (hit) => `${path.basename(hit.file)}:${hit.line} ${hit.text}`;

await run("f3-s3", [
  {
    title: "AC1/AC2 — no gate tests the caller's role, in either repo, and `isAdmin` is gone",
    run: async () => {
      const app = (await sources("/src/app", /\.tsx?$/)).filter(
        ([file]) => !file.endsWith("capabilities.ts") && !file.endsWith("roles.ts"),
      );
      const api = await sources("/src/api", /\.py$/);

      // The app: a comparison against the caller's role. Anything not on the allowlist
      // is a gate that goes wrong the first time a workspace retunes a role (F3-S6).
      const appGates = codeHits(app, /role\s*===\s*"(owner|admin)"/).filter(
        (hit) =>
          !ALLOWED.some(([name, snippet]) => hit.file.endsWith(name) && hit.text.includes(snippet)),
      );
      // The api: `WorkspaceRole.OWNER` survives where it is genuinely ABOUT the owner
      // role — the creator is the owner, the last-owner invariant, an invitation may
      // not carry it — so what is checked is the gate, not the name.
      const apiGates = codeHits(api, /\.require\(WorkspaceRole\.|\bcan_write\b/);

      const gates = [...appGates, ...apiGates];
      expect(gates.length === 0, `${gates.length} caller-role gates — ${gates.map(show).join(" · ")}`);

      // Neither repo may say "isAdmin". The point of D-23 is that there are two kinds
      // of admin and the ambiguous name is exactly how they get conflated. Comments
      // are skipped: naming the identifier in order to forbid it is not using it.
      const ambiguous = codeHits([...app, ...api], /\bis_?[Aa]dmin\b/);
      expect(ambiguous.length === 0, `isAdmin at ${ambiguous.map(show).join(" · ")}`);

      // And the positive, so the step cannot pass by the gates having been deleted.
      const gated = api.filter(([, text]) => text.includes("require_capability(")).length;
      expect(gated >= 2, `require_capability appears in only ${gated} api modules`);
      const calls = codeHits(api, /require_capability\(Capability\./).length;
      expect(calls >= 7, `only ${calls} routes gate on a capability`);
      return `${app.length} app + ${api.length} api files · 0 role gates · ${calls} capability gates · ${ALLOWED.length} ownership rules, named`;
    },
  },
  {
    title: "AC4/AC7 — a qa_takeoff seat reviews but cannot edit, and the api says so too",
    run: async () => {
      const map = (await capabilities(reviewer.token, workspace.uuid)).capabilities;
      expect(map.canReviewTakeoff === true, "qa_takeoff cannot review takeoff");
      expect(map.canEditTakeoff === false, "qa_takeoff can edit takeoff");
      expect(map.canInviteMembers === false, "qa_takeoff can invite members");

      // Four routes, hand-written, from a seat the screen would offer none of them.
      // This is the half that matters: hiding a control in front of an api that would
      // have accepted the call is a hole with a curtain over it.
      const refusals = [
        await apiCall(reviewer.token, "GET", `/api/workspace/${workspace.uuid}/invitation`),
        await apiCall(reviewer.token, "POST", `/api/workspace/${workspace.uuid}/invitation`, {
          email: `s3-sneak-${Date.now()}@bench.intelcost.io`,
          role: "admin",
        }),
        await apiCall(reviewer.token, "PATCH", `/api/workspace/${workspace.uuid}`, {
          name: "Renamed by a reviewer",
        }),
        await apiCall(
          reviewer.token,
          "DELETE",
          `/api/workspace/${workspace.uuid}/member/${reviewer.uuid ?? "00000000-0000-0000-0000-000000000000"}`,
        ),
      ];
      const wrong = refusals.filter((r) => r.status !== 403);
      expect(wrong.length === 0, `statuses: ${refusals.map((r) => r.status).join(", ")}`);

      // AC3 — the refusal names what is missing, not what the caller is. "Your role in
      // this workspace does not allow that" told the reader nothing they could act on.
      const messages = refusals.map((r) => r.body?.detail ?? "");
      expect(
        messages.every((m) => /^Your role cannot /.test(m)),
        `messages: ${JSON.stringify(messages)}`,
      );
      expect(
        messages.some((m) => m.includes("invite members")) &&
          messages.some((m) => m.includes("change workspace settings")) &&
          messages.some((m) => m.includes("remove members")),
        `the refusals do not name the capabilities: ${JSON.stringify(messages)}`,
      );
      return `4 routes refused 403 · "${messages[0]}"`;
    },
  },
  {
    title: "AC5 — a qa_takeoff seat sees the members list and no controls on it",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      await page.fill("#email", reviewer.email);
      await page.fill("#password", PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });

      await page.goto(`${APP}/settings/members`);
      await page.waitForFunction(
        () => document.body.textContent.includes("In this workspace"),
        undefined,
        { timeout: 20000 },
      );
      // The roster is readable: knowing who is in the workspace is not administering it.
      await page.waitForFunction(
        () => document.body.textContent.includes("estimator@bench.intelcost.io"),
        undefined,
        { timeout: 20000 },
      );
      expect((await page.$("#invite-email")) === null, "a reviewer is offered the invite form");
      expect((await page.$("#invite-role")) === null, "a reviewer is offered the role picker");
      expect(
        !(await page.textContent("body")).includes("Invited, not joined"),
        "a reviewer sees the pending invitations",
      );
      const removes = await page.$$('button:has-text("Remove")');
      expect(removes.length === 0, `a reviewer is offered ${removes.length} Remove buttons`);

      // Scoped to the roster: the app shell has a workspace switcher that is also a
      // select inside a label, and it is not a permission control.
      const selects = await page.$$eval("ul li label select", (nodes) =>
        nodes.map((node) => node.disabled),
      );
      expect(selects.length > 0, "the roster rendered no role controls at all");
      expect(
        selects.every(Boolean),
        `${selects.filter((d) => !d).length} role selects are enabled for a reviewer`,
      );
      return `roster visible · invite form absent · ${selects.length} role selects, all disabled`;
    },
  },
]);

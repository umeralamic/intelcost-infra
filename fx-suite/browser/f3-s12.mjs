// F3-S12 — the activity feed, and F3-S9's AC8.
//
//   docker compose --profile browser run --rm browser node scripts/f3-s12.mjs
//
// The property that makes an audit trail worth having is that it cannot disagree with
// what happened. So the row is written in the SAME transaction as the act — the one
// place D-20 is deliberately not applied, because an audit row is a write and not a
// dispatch. A row that can be lost separately from the thing it records makes the feed
// claim a completeness it does not have.
//
// AC3 is the one worth the trouble: an act that FAILS writes no row. It is driven by
// forcing a refusal that happens after the audit call would have run, and then checking
// the feed is unchanged. Reading the code would have proven nothing.
//
// This also closes F3-S9 AC8, which could not be driven when S9 was built.
//
// Updated 2026-10-18 to today's screens (D-619): the settings tabs are two strips and Activity is in
// the second (D-87): every nav is read.
//
// Updated 2026-10-24 (D-752): an account owns one workspace and joins others by invitation.
// - Every workspace after the first is owned by a fresh fx. account that then acts in it, so the
//   feed holds only the step's acts and the owner's own acts (last-owner refusal, transfer) are
//   the owner's; the claims are unchanged.
// - AC2's second workspace is the same reader's second one, owned by a throwaway that seats it as
//   admin; the rows that seating writes are read first as the baseline, and the first
//   workspace's act must add none there.
//
// Updated 2026-10-24 (D-765 point 4, "AC2 counts against a baseline, provided it still fails if any
// row made by the first workspace appears in the second"): AC2 now asserts that condition explicitly,
// besides the count: both feeds are read whole; no row id of the first workspace's feed is in the
// second's; no row of the second is new since its baseline (by id, not only by count); and no row of
// the second carries the first's act (its "ONLY-HERE" value, its uuid or its name in target, before
// or after). The old `after.license_number` check is covered by the last.

import {
  fixtureOwner,
  ownWorkspace,
  enterWorkspace,
  APP,
  activity,
  apiCall,
  apiLogin,
  createWorkspace,
  expect,
  members,
  relinkInvitation,
  run,
  seatedMember,
  setRole,
  signInAs,
  transferOwnership,
  updateWorkspace,
  apiRegister,
  FIXTURE,
  OWNER_FULL_NAME,
  stamp,
} from "./lib/bench.mjs";

// The owner of the step running now: nothing of it lands in the seeded account. The first
// workspace is the run's own fixture owner's; ownedWorkspace swaps in a new owner after that.
let SEED = (await fixtureOwner()).email;
let ownerToken = (await fixtureOwner()).token;
let owned = 0;

/**
 * A workspace owned outright by the account that then acts in it. D-752: an account owns one
 * workspace, and these steps need the owner's own feed (no seating rows) or the owner's own acts
 * (last-owner refusal, transfer), so each workspace after the first gets a fresh fx. owner
 * (purged with the run's workspaces).
 */
async function ownedWorkspace(name) {
  owned += 1;
  if (owned > 1) {
    SEED = `fx.${FIXTURE}.own${owned}.${stamp()}@bench.intelcost.io`;
    await apiRegister(SEED, "bench-password-1", OWNER_FULL_NAME);
    ownerToken = await apiLogin(SEED, "bench-password-1");
  }
  return createWorkspace(ownerToken, name);
}

const actions = (feed) => feed.body.items.map((row) => row.action);
const uuidOf = async (ws, email) =>
  (await members(ownerToken, ws)).find((m) => m.email === email).user_uuid;

await run("f3-s12", [
  {
    title: "AC1 — every audited act writes exactly one row, with actor, target and both sides",
    run: async () => {
      const ws = await ownedWorkspace(`S12 Feed ${Date.now()}`);
      const email = `s12-${Date.now()}@bench.intelcost.io`;

      // A workspace that has just been created has no feed at all.
      const empty = await activity(ownerToken, ws.uuid);
      expect(empty.body.total === 0, `a new workspace has ${empty.body.total} rows`);

      // Five acts, each once.
      const created = await apiCall(ownerToken, "POST", `/api/workspace/${ws.uuid}/invitation`, {
        email,
        role: "estimator",
      });
      await relinkInvitation(ownerToken, ws.uuid, created.body.uuid);
      await apiCall(
        ownerToken,
        "DELETE",
        `/api/workspace/${ws.uuid}/invitation/${created.body.uuid}`,
      );
      await updateWorkspace(ownerToken, ws.uuid, { license_number: "LIC-9001" });
      await apiCall(ownerToken, "PUT", `/api/workspace/${ws.uuid}/override/takeoff`, {
        capabilities: { canRunAi: false },
        is_disabled: false,
      });

      const feed = await activity(ownerToken, ws.uuid);
      const seen = actions(feed);
      const expected = [
        "invitation.created",
        "invitation.relinked",
        "invitation.revoked",
        "workspace.settings_updated",
        "role.overridden",
      ];
      for (const action of expected) {
        const count = seen.filter((a) => a === action).length;
        expect(count === 1, `${action} appears ${count} times, not once`);
      }
      expect(feed.body.total === 5, `${feed.body.total} rows for 5 acts`);

      // Actor, target, and the change on both sides.
      const settings = feed.body.items.find((r) => r.action === "workspace.settings_updated");
      expect(settings.actor_name.length > 0, "the row names no actor");
      expect(settings.target === "license_number", `the target reads "${settings.target}"`);
      expect(
        settings.after?.license_number === "LIC-9001",
        `after reads ${JSON.stringify(settings.after)}`,
      );
      // "Changed" answers nothing on its own; the before is why the columns exist.
      expect("license_number" in (settings.before ?? {}), "the row carries no before");

      // A relink is its own action, not filed as a resend. A feed that called both the
      // same thing would hide which one killed a link (D-24).
      expect(seen.includes("invitation.relinked"), "a relink was filed as something else");
      expect(!seen.includes("invitation.resent"), "a relink was filed as a resend");
      return `5 acts → 5 rows, one each · actor, target, before and after all present`;
    },
  },
  {
    title: "AC5 — newest first, and paginated",
    run: async () => {
      const ws = await ownedWorkspace(`S12 Page ${Date.now()}`);
      for (let i = 0; i < 6; i += 1) {
        await updateWorkspace(ownerToken, ws.uuid, { license_number: `LIC-${i}` });
      }

      const feed = await activity(ownerToken, ws.uuid, { limit: 3, offset: 0 });
      expect(feed.body.total === 6, `${feed.body.total} rows for 6 acts`);
      expect(feed.body.items.length === 3, `${feed.body.items.length} returned for limit 3`);
      // Newest first: the last licence written is the first row read.
      expect(
        feed.body.items[0].after?.license_number === "LIC-5",
        `the first row is ${JSON.stringify(feed.body.items[0].after)}`,
      );
      const times = feed.body.items.map((r) => new Date(r.created_at).getTime());
      expect(
        times[0] >= times[1] && times[1] >= times[2],
        "the feed is not in descending order",
      );

      const second = await activity(ownerToken, ws.uuid, { limit: 3, offset: 3 });
      expect(
        second.body.items[0].after?.license_number === "LIC-2",
        `page two starts at ${JSON.stringify(second.body.items[0].after)}`,
      );
      // No overlap, or a reader sees the same act twice and believes it happened twice.
      const overlap = feed.body.items.filter((a) =>
        second.body.items.some((b) => b.uuid === a.uuid),
      );
      expect(overlap.length === 0, `${overlap.length} rows appear on both pages`);
      return "6 rows · 3 per page · newest first · no overlap between pages";
    },
  },
  {
    title: "AC3 — an act that fails writes no row, even though the audit call ran",
    run: async () => {
      const ws = await ownedWorkspace(`S12 Rollback ${Date.now()}`);
      const victim = await seatedMember(ownerToken, ws.uuid, "estimator", "s12-roll");
      const before = (await activity(ownerToken, ws.uuid)).body.total;

      // The owner is the last owner, so demoting themselves is refused by the
      // last-owner invariant — and that refusal comes from inside the service, AFTER
      // the route has already called `audit.record`. If the row survived the rollback,
      // the feed would claim a demotion that never happened.
      const ownerUuid = await uuidOf(ws.uuid, SEED);
      const refused = await setRole(ownerToken, ws.uuid, ownerUuid, "viewer");
      expect(refused.status === 409, `demoting the last owner gave ${refused.status}`);

      const after = (await activity(ownerToken, ws.uuid)).body.total;
      expect(after === before, `the failed act left ${after - before} rows behind`);

      // And the same act, succeeding, does write one — so the check above is not
      // passing because nothing is ever written.
      const victimUuid = await uuidOf(ws.uuid, victim.email);
      const ok = await setRole(ownerToken, ws.uuid, victimUuid, "viewer");
      expect(ok.status === 200, `a legitimate role change gave ${ok.status}`);
      const grew = await activity(ownerToken, ws.uuid);
      expect(grew.body.total === before + 1, `${grew.body.total - before} rows for one act`);
      const row = grew.body.items[0];
      expect(row.action === "member.role_changed", `the row reads ${row.action}`);
      // Before was read before the write, or the row says estimator → estimator.
      expect(
        row.before?.role === "estimator" && row.after?.role === "viewer",
        `the row reads ${JSON.stringify(row.before)} → ${JSON.stringify(row.after)}`,
      );
      return `refused act: ${before} rows unchanged · successful act: +1, estimator → viewer`;
    },
  },
  {
    title: "AC4 — the row outlives the actor being removed from the workspace",
    run: async () => {
      const ws = await ownedWorkspace(`S12 Outlive ${Date.now()}`);
      const admin = await seatedMember(ownerToken, ws.uuid, "admin", "s12-gone");

      // The admin does something worth recording, then leaves the workspace.
      const invited = `s12-by-admin-${Date.now()}@bench.intelcost.io`;
      const created = await apiCall(admin.token, "POST", `/api/workspace/${ws.uuid}/invitation`, {
        email: invited,
        role: "estimator",
      });
      expect(created.status === 201, `the admin's invite gave ${created.status}`);

      const theirs = await activity(ownerToken, ws.uuid);
      const mine = theirs.body.items.find((r) => r.target === invited);
      const actorName = mine.actor_name;
      expect(actorName.length > 0, "the row names no actor");

      await apiCall(
        ownerToken,
        "DELETE",
        `/api/workspace/${ws.uuid}/member/${await uuidOf(ws.uuid, admin.email)}`,
      );
      expect(
        (await members(ownerToken, ws.uuid)).every((m) => m.email !== admin.email),
        "the admin is still in the workspace",
      );

      // The person an audit trail gets consulted about is usually the one who has been
      // removed. A join that came back empty would turn this into a row about nobody.
      const after = await activity(ownerToken, ws.uuid);
      const still = after.body.items.find((r) => r.target === invited);
      expect(still !== undefined, "the row went with the member");
      expect(
        still.actor_name === actorName,
        `the actor now reads "${still.actor_name}", was "${actorName}"`,
      );
      return `"${actorName}" invited someone, then left — the row still names them`;
    },
  },
  {
    title: "F3-S9 AC8 — both ownership paths write an audit event",
    run: async () => {
      // Deferred from S9 because the audit log did not exist yet.
      const direct = await ownedWorkspace(`S12 Own A ${Date.now()}`);
      const heir = await seatedMember(ownerToken, direct.uuid, "admin", "s12-own");
      await transferOwnership(
        ownerToken,
        direct.uuid,
        { userUuid: await uuidOf(direct.uuid, heir.email) },
        direct.name,
      );
      const a = await activity(heir.token, direct.uuid);
      const transferred = a.body.items.find((r) => r.action === "ownership.transferred");
      expect(transferred !== undefined, `the direct path recorded ${actions(a).join(", ")}`);
      expect(transferred.target === heir.email, `it names ${transferred.target}`);
      expect(
        transferred.before?.owner === SEED,
        `before reads ${JSON.stringify(transferred.before)}`,
      );

      const queued = await ownedWorkspace(`S12 Own B ${Date.now()}`);
      const email = `s12-queued-${Date.now()}@bench.intelcost.io`;
      await transferOwnership(ownerToken, queued.uuid, { email }, queued.name);
      const b = await activity(ownerToken, queued.uuid);
      expect(
        actions(b).includes("ownership.queued"),
        `the queued path recorded ${actions(b).join(", ")}`,
      );
      // And cancelling is its own line, or the feed shows a transfer that never ended.
      await apiCall(ownerToken, "DELETE", `/api/workspace/${queued.uuid}/ownership`);
      const c = await activity(ownerToken, queued.uuid);
      expect(
        actions(c).includes("ownership.cancelled"),
        `cancelling recorded ${actions(c).join(", ")}`,
      );
      return "transferred, queued and cancelled each recorded, with who and to whom";
    },
  },
  {
    title: "AC2 — workspace-scoped, and only with canViewWorkspaceActivity",
    run: async () => {
      const mine = await ownedWorkspace(`S12 Scope A ${Date.now()}`);
      // D-752: the same account's second workspace is owned by a throwaway that seats it as
      // admin, and that seating writes its own rows there. They are read as the baseline.
      const theirs = await createWorkspace(ownerToken, `S12 Scope B ${Date.now()}`);
      const before = await activity(ownerToken, theirs.uuid);
      const baseline = before.body.total;
      expect(before.body.items.length === baseline, `the baseline is not read whole: ${before.body.items.length} of ${baseline}`);
      const baselineIds = new Set(before.body.items.map((r) => r.uuid));
      await updateWorkspace(ownerToken, mine.uuid, { license_number: "ONLY-HERE" });

      // Scoped: an act in one workspace does not appear in another.
      const other = await activity(ownerToken, theirs.uuid);
      expect(
        other.body.total === baseline,
        `the second workspace shows ${other.body.total - baseline} rows from the first`,
      );
      expect(other.body.items.length === other.body.total, `the second feed is not read whole: ${other.body.items.length} of ${other.body.total}`);
      const here = await activity(ownerToken, mine.uuid);
      expect(here.body.total === 1, `the first workspace shows ${here.body.total} rows`);
      // D-765 4: the baseline is allowed only because this still fails on any row the first
      // workspace made appearing in the second, by its id or by what it carries.
      const otherIds = new Set(other.body.items.map((r) => r.uuid));
      const leaked = here.body.items.filter((r) => otherIds.has(r.uuid));
      expect(leaked.length === 0, `rows of the first workspace in the second: ${leaked.map((r) => `${r.action} ${r.uuid}`).join(", ")}`);
      const added = other.body.items.filter((r) => !baselineIds.has(r.uuid));
      expect(added.length === 0, `rows new in the second workspace since its baseline: ${added.map((r) => `${r.action} ${r.uuid}`).join(", ")}`);
      const carriesFirst = other.body.items.filter((r) => {
        const text = JSON.stringify([r.target, r.before, r.after]);
        return text.includes("ONLY-HERE") || text.includes(mine.uuid) || text.includes(mine.name);
      });
      expect(carriesFirst.length === 0, `the second workspace's feed carries the first's act: ${carriesFirst.map((r) => `${r.action} ${r.uuid}`).join(", ")}`);

      // An estimator does not hold canViewWorkspaceActivity: admin does, estimator
      // does not, and the feed is where a workspace's private business is written down.
      const seat = await seatedMember(ownerToken, mine.uuid, "estimator", "s12-scope");
      const refused = await activity(seat.token, mine.uuid);
      expect(refused.status === 403, `an estimator got ${refused.status}`);
      expect(
        /cannot view workspace activity/i.test(refused.body?.detail ?? ""),
        `the refusal read "${refused.body?.detail}"`,
      );

      const admin = await seatedMember(ownerToken, mine.uuid, "admin", "s12-scope-admin");
      const allowed = await activity(admin.token, mine.uuid);
      expect(allowed.status === 200, `an admin got ${allowed.status}`);
      return `1 row here, none of it there (${baseline} baseline rows, same ids; no first-workspace id or value among them) · estimator 403 · admin 200`;
    },
  },
  {
    title: "The screen: sentences rather than action names, and the gate says why",
    run: async ({ page }) => {
      const ws = await ownedWorkspace(`S12 Screen ${Date.now()}`);
      const email = `s12-screen-${Date.now()}@bench.intelcost.io`;
      const created = await apiCall(ownerToken, "POST", `/api/workspace/${ws.uuid}/invitation`, {
        email,
        role: "qa_takeoff",
      });
      await relinkInvitation(ownerToken, ws.uuid, created.body.uuid);

      await signInAs(page, SEED);
      await enterWorkspace(page,ws.uuid);
      await page.goto(`${APP}/settings/activity`);
      await page.waitForSelector("[data-activity-line]", { timeout: 20000 });

      const lines = await page.$$eval("[data-activity-line]", (nodes) =>
        nodes.map((node) => node.textContent.trim()),
      );
      // "invitation.created" is what the database calls it. Nobody reads a feed to
      // learn our action names.
      expect(
        lines.every((line) => !/^[a-z_]+\.[a-z_]+$/.test(line)),
        `a raw action name reached the screen: ${JSON.stringify(lines)}`,
      );
      expect(
        lines.some((line) => line.includes(`invited ${email} as qa_takeoff`)),
        `the lines read ${JSON.stringify(lines)}`,
      );
      // The relink line has to say what it cost, because that is the whole of D-24.
      expect(
        lines.some((line) => /stopped the previous one working/.test(line)),
        `no line explains the relink: ${JSON.stringify(lines)}`,
      );
      const actors = await page.$$eval("[data-activity-actor]", (nodes) =>
        nodes.map((node) => node.textContent.trim()),
      );
      expect(actors.every((name) => name.length > 0), "a line names no actor");

      return `${lines.length} lines, all in words, and the relink says what it cost`;
    },
  },
  {
    title: "The gate on screen: an estimator is told why, not shown a blank page",
    run: async ({ page }) => {
      // Its own step, because a step reuses one browser context: signing in as a second
      // person inside one step lands on /login already authenticated, and there is no
      // form there to fill.
      const ws = await ownedWorkspace(`S12 Gate ${Date.now()}`);
      await updateWorkspace(ownerToken, ws.uuid, { license_number: "SOMETHING" });
      const seat = await seatedMember(ownerToken, ws.uuid, "estimator", "s12-gate");

      await signInAs(page, seat.email);
      await page.goto(`${APP}/settings/activity`);
      await page.waitForFunction(
        () => /cannot view workspace activity/i.test(document.body.textContent ?? ""),
        undefined,
        { timeout: 20000 },
      );
      expect((await page.$("[data-activity-line]")) === null, "an estimator sees the feed");
      // The tab stays. Hiding it leaves someone who knows the screen exists wondering
      // whether the product lost it, which is the argument the matrix already made.
      expect(
        /Activity/.test((await page.locator("nav").allTextContents()).join(" ")),
        "the Activity tab disappeared for a role that cannot read it",
      );
      return "estimator: no feed, a reason given, and the tab still visible";
    },
  },
]);

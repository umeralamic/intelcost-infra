# F3 — Workspace, roles and permissions

_Spec for the `MANAGER.md` F3 row. Closes [PARITY.md §2](../PARITY.md#2-workspace-settings)
(workspace settings, 25 lines) and [§3](../PARITY.md#3-permissions) (permissions, 9
lines)._

**Board:** [../../MANAGER.md](../../MANAGER.md) · **Rules of engagement:**
[../../DECISIONS.md](../../DECISIONS.md) · **Parity:** [../PARITY.md](../PARITY.md)

---

## Closed 2026-09-25

**S1 through S13 built and driven on the bench**, each against its acceptance criteria in
a real browser including the failure states. Fixtures `intelcost-infra/browser/f3-s1.mjs`
through `f3-s13.mjs`, plus `intelcost-infra/drives/` for the three checks a browser
cannot make (the resolution order at module level, a flag's DB state, and the production
bundle's contents). S14–S23 were specced here and handed on; the receiving feature is
named in its `MANAGER.md` row and on the PARITY line.

**PARITY:** §3 all 9 lines ticked. §2 9 of 25 ticked, 1 partial, 15 deferred.

**Five decisions, all logged before the code:** D-21 (port the model whole, resolution
first), D-22 (`derive_base_role` is total, `viewer` is the floor), D-23 (platform admin
resolved in the permission layer as a capability gate), D-24 (invite link shown once,
re-minted only by an explicit act), D-25 (three capabilities shown and locked).

**Two criteria carried forward rather than ticked quietly.** S4 AC6 — a platform admin's
unmasked capabilities visible on a screen — closes in **F5**, when the first control calls
`can()`. And §3's collaborator-plan line: the plan and trial masks are built and driven at
module level, but `Plan` is a constant `pro`, so no workspace can reach that state end to
end until **F16**. Both are on their inheriting `MANAGER.md` row.

**One divergence from legacy, deliberate:** a custom role **is** its map. Legacy resolves
a custom role's absent capabilities through its base role, which closes a loop, because
the base role is derived *from* the map — so every custom role collapses to its own base
role. Ours grants only what its map grants, with the three locked capabilities following
the base role. This is why `MANAGER.md` F17 carries a migration note: legacy custom roles
must be migrated as their full effective map, or migrated roles silently lose access.

**On the three §2 corrections in the table below.** Corrections 1 and 3 stand as written.
Correction 2 (Members — invite, copy link, resend, revoke) was true when this spec was
written and was superseded inside F3 itself: S11 built the link per D-24, so the line is
now **ported** rather than the **partial** the table proposed. The correction is recorded
here rather than edited away, because what the line said at spec time is the reason S11
existed.

**One incident worth keeping.** A `perl -0pi -e` edit on
`intelcost-app-react/src/features/workspace/api.ts` failed to rename its work file and
destroyed both the original and the temp copy. The file was rebuilt from `git show` plus
the day's additions, and the reconstruction was later proved by diffing it against the
last pre-F3 commit: purely additive, one widened import line, every pre-existing export
byte-identical, every added method with exactly one caller and a matching api route.
`CLAUDE.md` hard rule 7 now forbids in-place `perl -i` and `sed -i` on source files.

---

## The problem

Section 1 is closed: people can get into the product. Sections 2 and 3 are what they
find once they are in it, and almost none of it exists.

**Legacy runs on a capability model.** Nine roles, twenty-five capabilities, and one
map (`src/lib/permissions/capabilities.ts`) that both the runtime check and the
permissions matrix read, so the two cannot drift. On top of that sit three things a
workspace may change for itself: a **custom role** (its own label and capability map,
carrying a built-in base role so the database still understands it), an **override** of
a built-in working role for that workspace only, and a role **disabled** for that
workspace so it stops appearing at all. Then two masks cap everyone: the paid plan, and
the trial once it has expired.

**The new api has four roles and no capabilities.** `WorkspaceRole` is
`owner | admin | member | collaborator`, and its own docstring says custom roles and
overrides "are not ported here". Every gate is `role == "owner" or role == "admin"`,
which is exactly what legacy's own rules forbid in writing. Nothing reads a capability,
because there is no capability to read.

So F3 is not "add some settings screens". It is the permission model, and then the
surfaces that administer it.

### What exists today

| Piece | State |
|---|---|
| `WorkspaceRole` (4 values), `WorkspaceMember`, invitations | Built, driven in F2 |
| Workspace fields: name, company type, address, phone, licence, logo_url, accent, `enabled_classifications` | Columns exist; `PATCH /api/workspace/{uuid}` accepts most of them; **no screen edits any of them** |
| `GET /api/workspace/{uuid}/member`, role change, remove, leave, last-owner invariant | Built |
| `/settings/members` | Lists members, invites, resends, revokes, changes role, removes |
| `User.is_platform_admin` | A column nothing reads |
| Everything else in §2 and §3 | Does not exist |

---

## The decisions this spec is built on

All four were open questions in the first draft of this spec and are now settled.

| | Decision | What it binds |
|---|---|---|
| **D-21** | The capability model is ported **whole**, sequenced: resolution first, editing second. Nine roles, twenty-five capabilities, one shared map per repo, then custom roles and per-workspace overrides — all inside F3. | S1–S4 then S5–S7. Every existing `owner`/`admin` gate is replaced by a capability check in the same pass (S3). |
| **D-22** | `derive_base_role` is **total**: a map granting neither administration, takeoff nor pricing returns `viewer`, never nothing. Port the fix, not legacy's missing return. | S7 |
| **D-23** | **Platform admin exists** — our internal team — and is resolved in the same permission layer now, as a capability gate and never as a role. Screens come in F16; F10's Starter Pack and Library admin powers use this check. | S4 |
| **D-25** | All twenty-five capabilities appear in the matrix, but `canManageWorkspace`, `canGrantOwnerRole` and `canEditEstimates` render **locked** with a reason and cannot be moved by a custom role or an override. Legacy hid them; hiding them is what made them unadministrable. | S5, S6, S7 |
| **D-24** | The invite link is shown **once at creation** with a Copy control. A separate **"Get new link"** warns that the old link stops working, then re-mints. Never silently. | S11 |

---

## Scope, honestly

§2 is eleven tabs, and five of them are not workspace administration at all. They are
specced here, because a line with no spec is a line that gets forgotten, and they are
sequenced to the feature that owns them:

| Tab | Owned by | Why it is listed here |
|---|---|---|
| **Classification**, **Project Setup** (S14–S17), **Subcontractors** (S18) | **F6**, the item model. Classification is what a takeoff item is filed under, and a subcontractor is assigned classification scopes. | Configured in settings, consumed in takeoff. |
| **Trash** (S19) and **Statuses** (S20) | **F4**, the projects dashboard. | Both are lists of projects wearing a settings screen. |
| **Shifts**, **Time Tracking** (S21, S22) | **F15**, sharing, reports and time tracking. | Same. |
| **AI Credits** (S23) | **F14** for the credits, **F16** for the Stripe checkout behind the top-up. | It renders inside workspace settings. |

**F3 ships S1 through S13.** See [Sequencing](#sequencing). The one judgement call
inside that is classification: it could ship here, but F6 is what consumes it, and
building a tree nothing files against is how a settings screen gets driven as "it
saved" and called done.

---

## Corrections to PARITY §2, to apply as part of F3

Three lines say **ported** and are not, in the same shape F2-S14 found: the api accepts
something no screen sends, or the screen omits a column.

| Line | Reads | Should read |
|---|---|---|
| **Members.** List members with role, **shift and last activity** | ported | **partial** — the list shows email, name and role. There is no shift (no shifts feature) and no last activity (`last_sign_in_at` exists on the user and is not exposed by `MemberRead`). S11. |
| **Members.** Invite by email with a role, **copy the invite link**, resend, revoke | ported | **partial** — invite, resend and revoke are built and driven (F2-S2). The link is not: per **D-24** it is copyable at creation and re-mintable by an explicit act. S11. |
| **Members.** Change a member's role, or remove them | ported | **ported**, correct. Driven in F2 only as far as the last-owner invariant; S11 drives the rest. |

---

## Subtasks

Every §2 and §3 line that is **partial** or **missing** maps to exactly one subtask.
The [coverage table](#coverage) at the end is the proof that none was dropped.

They are ordered as D-21 requires: **resolution first** (S1–S4), then the surfaces that
**edit** the model (S5–S8), then the rest of workspace administration (S9–S13), then the
lines owned by other features (S14–S23).

Realtime events are named per **D-13**: published after the write commits (D-20), over
the api's WebSocket with Redis fan-out, carrying the client's write token so the sender
ignores its own echo. **F8 builds the transport.** Until it exists, every subtask ships
with the event *named and not emitted*, and its acceptance criterion is a refetch on
focus rather than a live update. The events are written down now so F8 has its input and
so nobody invents a second naming scheme later.

---

# Block A — Resolution

_The permission model itself. Nothing in Block B or C is built until all four of these
are driven, because every one of them gates on an answer these produce._

---

### F3-S1 — Nine roles, twenty-five capabilities, one map

> §3: "Every screen asks `can('<capability>')` rather than testing a role, so a custom
> role behaves like a built-in one everywhere" · **partial** · `src/hooks/usePermissions.ts`

**Legacy.** `capabilities.ts` is the single runtime source. `ROLE_TO_CAPS` maps each of
nine roles to a partial capability map, composed from `TAKEOFF_CAPS`, `PRICING_CAPS`,
`ADMIN_CAPS` and `OWNER_CAPS`. `capabilitiesForRole()` fills the gaps from
`NO_CAPABILITIES`, so a capability added tomorrow is false everywhere until a role
grants it. The matrix renders from the same map and carries labels only — the file says
so twice: "never restate a permission here".

**Work.**
- `api`: `app/features/workspace/capabilities.py` — the `Capability` enum (24 values),
  the nine-value `WorkspaceRole`, `ROLE_TO_CAPS`, `capabilities_for_role()`, the
  `CAPABILITY_GROUPS` labels and `ASSIGNABLE_ROLES` in display order. One module, the
  single source.
- `api`: an Alembic migration widening the `workspace_role` enum to nine values and
  mapping existing `member` rows to `estimator` (D-21).
- `app`: `src/features/workspace/capabilities.ts`, the same map, for UX only.
- `api`: `GET /api/workspace/{uuid}/capability` returns the caller's resolved map, the
  role, the custom role label when there is one, and `is_platform_admin`. The app never
  derives the answer a second way; it reads this.

**Acceptance criteria.**
1. The nine roles are exactly legacy's nine, and the twenty-five capabilities are
   exactly legacy's twenty-five, including `canEditEstimates` (the legacy umbrella).
2. For each of the nine roles, the api's resolved map equals the map the app computes
   for that role. A bench step compares all 216 cells, because D-05 keeps contracts in
   sync by hand and a promise needs a check.
3. A capability present in the enum but granted by no role reads false for every role,
   including owner.
4. `can()` answers false for an unknown capability name rather than throwing.
5. Existing members hold a valid role after the migration: every `member` row reads
   `estimator`, and owner, admin and collaborator are untouched.
6. `viewer` grants nothing: no comments, no uploads, no AI.

**Found while driving this.** Legacy has **twenty-five** capabilities, not the
twenty-four §3 claimed — the heading was counted, the file was not. Corrected here,
in `PARITY.md` and in D-21. Legacy's own matrix then covers only 22 of them: it omits
`canManageWorkspace`, `canGrantOwnerRole` and `canEditEstimates`, so three capabilities
are enforced there and reachable from no screen. Ours lists all twenty-five and S5
asserts it.

**Realtime events:** none of its own. It consumes S8's.

---

### F3-S2 — Resolution: role, override, custom role, plan mask, trial mask

> §3: "Capability resolves as role default, then workspace override, then custom role,
> then masked by the plan, then masked by the trial" · **missing**
> §3: "A capability added after a workspace saved its override falls back to the role
> default rather than reading as denied" · **missing**
> §3: "A `collaborator`-plan workspace loses the measure tools and keeps the markup
> tools" · **missing**

**Legacy.** The order is exact and each stage matters. `capabilitiesFromMap(map,
fallback)` is the subtle one: **an absent key is not a denial**, it is a map written
before that capability existed, so it falls back to the role default. An explicit
`false` still wins. Then `applyPlanMask` ANDs the workspace's paid plan, then
`applyTrialMask` — which bites **only** on expiry or an admin lock, never mid-trial,
because mid-trial Tier 3 limits are quantitative and enforced at write time. A platform
admin bypasses both masks (D-23), so plan state cannot lock staff out of a customer
workspace.

**Work.**
- `api`: `resolve()` in one function, with all five stages present from the start. The
  override and custom-role stages take `None` until S6 and S7 create their tables, so
  those subtasks fill a hole rather than reshaping the chain (D-21).
- `api`: `capabilities_from_map(map, fallback)` with the absent-key rule, and
  `FORBIDDEN_CAPS` (`canTransferOwnership`, `canManageBilling`, `canGrantOwnerRole`)
  forced off wherever a stored map is read.
- `api`: the plan mask (`collaborator` keeps comments, uploads and annotations; `pro`
  keeps everything) reading a constant `pro` until F16 supplies a value; the trial mask
  reading `trial_ends_at`, which F2-S5/S8 already stamp on the workspace (D-18).

**Acceptance criteria.**
1. A role default alone resolves correctly with no override and no custom role.
2. **A capability absent from a saved map falls back to the role default.** Save a map,
   add a capability to the enum, re-resolve: it reads as the role default, not denied.
3. An explicit `false` in a saved map stays false after the same change.
4. A `collaborator`-plan workspace loses `canEditTakeoff` and keeps `canUseAnnotations`,
   `canComment` and `canUploadDocuments`, whatever the role says.
5. An expired trial strips everything except the view-only keeps (workspace
   administration, billing, activity, comment); a trial with days left strips nothing.
6. A workspace with no trial window at all is never restricted (D-18: a missing
   `billing_tier_rule` yields a null window, and null is not expired).
7. A platform admin's map is unmasked by plan and by trial, and is still the map of the
   role they hold in that workspace.
8. The three forbidden capabilities are off in any map read from storage, even when the
   stored value says true.

**Realtime events:** consumes `workspace.permissions.changed` (S8).

---

### F3-S3 — One check, everywhere: no gate tests a role

> §3: "Every screen asks `can('<capability>')` rather than testing a role" ·
> **partial** — the half S1 does not cover

**Today.** Nine `workspace.require(OWNER, ADMIN)` calls in
`app/features/workspace/routes.py`, `can_write` on `WorkspaceContext`
(`role is not COLLABORATOR`), and in the app `canManage = role === "owner" || role ===
"admin"` in `SettingsMembers.tsx` and `MembersTable.tsx`, plus the role list in
`InviteForm.tsx`. Each is a separate copy of a rule nobody can change in one place.

**Work.**
- `api`: `WorkspaceContext.can(cap)` and `require_capability(cap)`. `require(*roles)` is
  deleted, not deprecated — a deprecated gate is a gate someone still calls.
- `api`: every one of the nine sites mapped to the capability it meant
  (`canManageWorkspace`, `canInviteMembers`, `canRemoveMembers`, `canAssignRoles`), and
  `require_write` becomes `canEditTakeoff`.
- `app`: `usePermissions(workspaceUuid)` exposing `can`, `role`, `isWorkspaceAdmin`,
  `isPlatformAdmin`, `loading`. Loading reads **false**, never true.
- `app`: the members screens re-gated on capabilities; the invite role picker offers
  `ASSIGNABLE_ROLES`, each with its blurb.

**Acceptance criteria.**
1. **No role test survives.** A grep in the bench pass finds no `role === "owner"`,
   `role === "admin"`, `WorkspaceRole.OWNER` comparison or `is not COLLABORATOR` outside
   the capability module and the ownership rules (S9) that are genuinely about the owner
   role itself.
2. The name `isAdmin` appears in neither repo (D-23).
3. Every refusal names what is missing rather than the role: an `estimator` refused an
   invite reads "Your role cannot invite members", not a bare 403.
4. A `qa_takeoff` member can review but cannot edit takeoff: the api refuses the write
   and the screen does not offer it. Both, not either.
5. A `viewer` sees the members list and no controls on it.
6. `isWorkspaceAdmin` (owner or admin, customer side) and `isPlatformAdmin` (staff) are
   separate values that never substitute for each other.
7. Hiding is never the only gate: for each re-gated route, a hand-written request from a
   role without the capability is refused by the api.

**Realtime events:** none.

---

### F3-S4 — Platform admin is a separate answer

> §3: "Workspace admin (`owner` or `admin`) and platform admin (Intelcost staff) are
> separate answers that never mix" · **missing**
> §3: "Platform-internal routes render the 404 page for a non-platform user, so internal
> tooling is invisible to customers" · **missing**

**Settled by D-23.** Platform admin exists, is our internal team, and is resolved here,
in the permission layer, as a capability gate.

**Legacy.** `PlatformRoute` renders `<NotFound />` — never a redirect, never a "you do
not have access" message, so internal tooling is indistinguishable from a wrong URL.

**Work.**
- `api`: `is_platform_admin` resolved beside the role, returned by
  `GET /api/workspace/{uuid}/capability`, and honoured by the mask bypass in S2.
- `app`: `PlatformRoute`, rendering the same `NotFound` component the router already
  uses for an unknown URL. One internal route is registered behind it so the guard is
  driven rather than merely written; F16 hangs the real screens there.

**Acceptance criteria.**
1. `isPlatformAdmin` comes from the api, never from a role name and never from a value
   the browser can set.
2. A platform route renders the ordinary 404 for a customer: same markup, same heading,
   same tab title, same "Back to projects" link as `/nope`.
3. A workspace **owner** who is not staff gets the 404 too. Owning a workspace is not
   staffing the platform.
4. A platform admin sees the route.
5. No screen gates a customer feature on `isPlatformAdmin`, and none gates an internal
   one on `isWorkspaceAdmin`.
6. A platform admin inside a customer workspace whose trial has expired still resolves
   unmasked capabilities (S2 AC7). **The api half is driven in F3; the on-screen half
   is not, and this line stays unticked until F5.** No control reads a masked
   capability yet — the first `can()` in a takeoff screen is F5's — so what F3 proves
   is that the mask reaches a real write path (the expired owner is refused a project,
   the unmasked staff member is not, same workspace, same instant) and that the browser
   receives the masked map. A screen that visibly withholds a control closes it.

**Realtime events:** none.

---

# Block B — Editing the model

_Custom roles and per-workspace overrides, and the matrix that edits them. D-21 puts
these after Block A on purpose: they are built against a resolution that has already
been driven._

---

### F3-S5 — The roles and permissions matrix

> §2 Roles & Permissions: "A matrix of every role against every capability. Click a cell
> to grant or remove." · **missing**

**Legacy.** Columns are the four fixed roles (owner, admin, collaborator, viewer), then
the five editable working roles, then any custom roles. Rows are the nine capability
groups. The file carries labels only.

**Work.** `app`: the matrix, rendering from the S1 map. Read-only until S6 and S7 land
the two tables it writes to — which is the read-only gap D-21 accepts.

**Acceptance criteria.**
1. Every capability appears exactly once, under its group heading; all **25**
   accounted for. Legacy's matrix reaches only 22 — `canManageWorkspace`,
   `canGrantOwnerRole` and `canEditEstimates` appear in no group — and that gap is not
   ported: a permission the runtime honours and the matrix cannot reach is a permission
   nobody can change.
2. Fixed roles render read-only with a reason on hover, not a dead cell.
3. **The three locked capabilities render locked in every column** (D-25), each with a
   short reason where the question is asked rather than in a footnote. Locked is
   visibly different from "this role does not have it": the cell shows the built-in
   answer and says it cannot move.
4. Owner's column is fully granted and cannot be edited.
5. A caller without `canAssignRoles` sees the matrix read-only rather than not at all.
6. **The matrix and the runtime check disagree nowhere**: a bench step compares every
   cell against the api's resolved map for that role.
7. The matrix restates no permission of its own: it holds labels, and a capability
   removed from the map disappears from the screen without the screen being edited.

**Realtime events:** consumes `workspace.permissions.changed`.

---

### F3-S6 — A built-in role edited for this workspace

> §2: "Edit a built-in role's capabilities for this workspace only. The cell is flagged
> 'Edited for this workspace'." · **missing**

**Legacy.** Overrides apply only to the five editable working roles (`estimator`,
`takeoff`, `pricing`, `qa_takeoff`, `qa_pricing`); owner, admin, collaborator and viewer
are fixed everywhere so their meaning stays predictable across workspaces. An override
row replaces that role's capability map **wholly** for that workspace. Legacy also
allows a role to be **disabled** for a workspace, stored as an override row with
`is_disabled`, which drops it from the matrix entirely — a fourth behaviour the parity
line does not mention, and it ships here or not at all.

**Work.** `api`: `workspace_role_override` (workspace, role, capabilities jsonb,
is_disabled), the stage S2 left open, and the forbidden-capability guard in the service
**and** as a database-level constraint, as legacy does in a trigger.

**Acceptance criteria.**
1. An override replaces that role's map wholly for that workspace, and for no other
   workspace: a second workspace on the same role is untouched.
2. An overridden cell is flagged "Edited for this workspace", and reset restores the
   built-in default.
3. Overriding owner, admin, collaborator or viewer is refused **by the api**, not merely
   hidden by the screen.
4. A capability absent from a saved override falls back to the role default (S2 AC2),
   driven here through the screen rather than through the resolver.
5. The three forbidden capabilities cannot be granted by the screen or by a hand-written
   request; the database refuses the row even if the service is bypassed.
6. **The three locked capabilities cannot be moved either way by an override** (D-25):
   a stored map naming them changes nothing, granted or denied, and the built-in
   answer stands.
7. A disabled role disappears from the matrix and from every role picker, and members
   already holding it keep working until they are moved.

**Realtime events:** `workspace.permissions.changed` →
`{workspace_uuid, kind: "override", role}`.

---

### F3-S7 — Custom roles

> §2: "Create a workspace-defined custom role from a base role, label it, edit its
> capabilities, and delete it when no member holds it." · **missing**

**Legacy.** A custom role is a label plus a capability map plus a **base role**: the
built-in enum value written to `user_roles.role`, so every server-side rule keeps working
for a role the database has never heard of. Capabilities drive the UI; the base role
drives the server.

**D-22 applies here.** `derive_base_role` is total: a map granting neither
administration, takeoff nor pricing returns `viewer`. Legacy's version falls off the end
of the function and writes null. Port the fix, not the bug, and leave the comment that
says which is which.

**Work.** `api`: `workspace_custom_role` (workspace, label, capabilities jsonb,
base_role), `WorkspaceMember.custom_role_id`, `derive_base_role`, and the custom-role
stage S2 left open.

**Acceptance criteria.**
1. Create a custom role from a base role, label it, grant capabilities; a member
   assigned it resolves exactly those capabilities.
2. `workspace_member.role` for that member holds the **base** role, and every existing
   server-side rule behaves for them as it does for that base role.
3. `derive_base_role` never returns `admin` for a map that does not administer, and
   returns `viewer` — never null — for a map granting neither takeoff nor pricing nor
   administration (D-22). Driven with a review-only map, which is the case legacy breaks
   on.
4. A custom role's map wins over the built-in default of its base role. **A custom
   role IS its map**: a capability it does not grant, it does not have, because there
   is no built-in role behind it to fall back through. This is a **deliberate
   divergence from legacy**, which falls back to the base role and so closes a loop —
   the base role is derived from the map, so a role granting `canEditPricing` derives
   `pricing` and inherits everything pricing grants. The locked three are the
   exception and follow the base role, which is what locked means (D-25); without
   that, `canEditEstimates` would be false for every custom role and a workspace's own
   "Pricer" could price nothing.
5. The three forbidden capabilities cannot be granted to a custom role, by the screen or
   by a hand-written request. **A custom role can never grant ownership**, and that is
   driven three ways: the capability is owner-only in the map, it is stripped from the
   stored map, and the cell does not accept a click (D-25).
6. The three locked capabilities are unmovable by a custom role too, and the screen
   says why rather than ignoring the click.
7. Deleting a custom role that a member holds is refused, naming the count.
8. Deleting one nobody holds succeeds, and the matrix loses its column.
9. A custom role is visible only inside its own workspace.

**Realtime events:** `workspace.permissions.changed` →
`{workspace_uuid, kind: "custom_role", role}`. Channels 8 and 9 of the legacy table
collapse into this event with S6.

---

### F3-S8 — A permission change reaches an open tab

> §3: "A role or permission change reaches an open tab live, with no reload." ·
> **missing** (legacy channel 6)

**Legacy.** One channel per (user, workspace) watching `user_roles`,
`workspace_custom_roles`, `workspace_role_overrides` and `workspace_billing`, each
re-reading the role on any change. The instance id in the channel name exists because
two `usePermissions()` callers in one tree would otherwise collide on the channel name
and crash on the second subscribe.

**Work.** Named now, emitted by F8. Until then the app refetches capabilities on window
focus and after any mutation that could change them.

**Acceptance criteria.**
1. An admin changes a member's role in one browser; the member's other tab reflects it
   without a reload (after F8) or on next focus (before F8).
2. **A capability removed from under someone mid-action is refused by the api**, not
   merely hidden, and the screen says what happened rather than failing silently.
3. Demoting yourself takes effect on your own screen.
4. Two `usePermissions()` callers in one tree do not interfere.

**Realtime events:** `workspace.permissions.changed`, `workspace.member.changed` →
`{workspace_uuid, user_uuid, role}`. Both workspace-scoped; a client joins only for
workspaces it belongs to (D-13).

---

# Block C — The administered surfaces

_Workspace administration proper, built on a permission model that is finished._

---

### F3-S9 — Only the owner grants ownership, and only by transfer

> §3: "Only the owner can grant the owner role, and only through a transfer." ·
> **missing**
> §2 Ownership: "Transfer ownership to a chosen member, queue a transfer to an invitee
> who has not joined yet, and cancel a queued transfer." · **missing**

**Legacy.** Two paths through one dialog: an existing member transfers immediately and
the outgoing owner drops to admin; an invitee who has not joined has the transfer
**queued** in `workspace_pending_ownership_transfers`, with an invitation created or
reused at admin role, and a trigger completes the swap the moment they accept. Both
paths write an audit event. The dialog demands the workspace name typed to confirm.

**Today.** F2 enforces "a workspace keeps at least one owner" on demote, remove and
leave. There is no transfer.

**Acceptance criteria.**
1. Only `canTransferOwnership` sees the control; an admin calling the api directly is
   refused.
2. Transfer to a member: they become owner, the previous owner becomes admin, in one
   transaction. Neither an ownerless nor a two-owner state is reachable.
3. Transfer to an address with no account: queued, an admin invitation goes out, and the
   swap happens on accept — not before.
4. A queued transfer can be cancelled, and cancelling leaves the invitation alone.
5. Only one transfer may be queued at a time.
6. The confirmation demands the workspace name typed, as legacy does.
7. Revoking the invitation behind a queued transfer cancels the transfer too, rather
   than leaving it waiting for someone who can never accept.
8. Both paths write an audit event. **Driven in S12**, not here: the audit log does not
   exist until then, so S9 ships with this criterion named and S12 closes it — which it
   does, for the direct path, the queued path and a cancellation.
9. `canGrantOwnerRole` is granted to owner alone and is unreachable through a custom
   role or an override (S6, S7).

**Realtime events:** `workspace.owner.changed` → `{workspace_uuid, owner_user_uuid}`.

---

### F3-S10 — General settings and the workspace logo

> §2 General: "Rename the workspace and set the licence number and default address." ·
> **missing**
> §2 General: "Upload a workspace logo (PNG, JPG, SVG, WebP, max 2 MB), replace it, or
> remove it, with a separate message per rejection reason." · **missing**

**Today.** Every field exists on the model and `PATCH /api/workspace/{uuid}` accepts
them. `logo_url` exists; nothing uploads to it.

**Acceptance criteria.**
1. Rename, licence number and address save and survive a reload.
2. Renaming does not change the slug of an existing workspace (a slug change breaks
   links), and the screen says so.
3. Only `canManageWorkspace` may save; the form is read-only otherwise, and a
   hand-written PATCH from a role without it is refused.
4. Logo upload accepts the four types under 2 MB, presigned per hard rule 5 — the
   browser never holds an S3 credential.
5. **A separate message per rejection**: wrong type, too large, and upload failed are
   three sentences, not one.
6. Replace swaps it; remove clears it and the old object is deleted.
7. The logo appears wherever the workspace is named.

**Realtime events:** `workspace.settings.updated` → `{workspace_uuid, fields}`.

---

### F3-S11 — The members list tells the truth

> §2 Members: list with role, shift and last activity · **partial** (correction above)
> §2 Members: invite, copy link, resend, revoke · **partial** (correction above)
> §2 Members: change role, remove · **ported**

**D-24 applies here.** The link is copyable once, at creation. "Get new link" warns that
the previous link stops working, then re-mints. Never silently.

**Work.** `api`: `last_sign_in_at` on `MemberRead`; `POST
/api/workspace/{uuid}/invitation/{uuid}/relink` returning a fresh raw token and
replacing `token_hash`. `app`: the creation dialog's Copy control, the "Get new link"
confirmation, and the role picker over all nine roles.

**Acceptance criteria.**
1. The list shows name, address, role and **last activity**; `MemberRead` carries it,
   and a member who has never signed in reads as such rather than as a blank cell.
2. Shift is shown only once S21 exists, and the column is **absent** rather than empty
   until then.
3. Creating an invitation shows the link once with a Copy control, and the copied link
   accepts the invitation (D-24).
4. "Get new link" states that the old link stops working **before** it acts; confirming
   mints a new link, and the old one then gets the same refusal an unknown token does.
5. Dismissing that confirmation changes nothing: the original link still works.
6. "Get new link" sends no mail. Resend does, and resend and relink are separate
   actions with separate effects.
7. Resend and revoke behave as F2-S2 drove them.
8. Role change and removal obey the last-owner invariant and the `canAssignRoles` /
   `canRemoveMembers` gates.
9. A member without `canAssignRoles` sees the list read-only.

**Realtime events:** `workspace.member.changed`.

---

### F3-S12 — The activity feed

> §2 Activity: "An audit feed of who did what in the workspace." · **missing** (legacy
> `log_audit_event`, table `audit_log`)

**Work.** `api`: an `audit_log` table and one service-side writer, called by the acts
that matter: role changes, ownership transfer, member removal, invitation lifecycle
(including a relink, D-24), settings changes, custom role and override changes.
Written **in the same transaction as the act** — an audit row that can be lost
separately from the thing it records is worse than none. This is the one place D-20 does
not apply: an audit row is a write, not a dispatch.

**Acceptance criteria.**
1. Every act above produces exactly one row: actor, action, target, before and after.
2. The feed is workspace-scoped and visible only with `canViewWorkspaceActivity`.
3. An act that fails writes no audit row — driven by forcing a failure after the audit
   write, not by reading the code.
4. The row survives the actor being removed from the workspace.
5. Paginated, newest first.

**Realtime events:** `workspace.activity.appended` → `{workspace_uuid}`. Low value live;
a refetch on focus is enough and F8 may skip it.

---

### F3-S13 — Feature flags are not permissions

> §3: "'Can the user do this' and 'is the feature shipped' stay separate gates, the
> second being a feature flag." · **missing**

**Legacy.** `useFeatureFlag` reads `feature_flags` and returns **false while loading**,
so the UI stays closed by default. The dev force-on override is gated behind
`import.meta.env.DEV` and is force-ON only: a client-side override that worked in
production would turn every flag from a gate into a suggestion.

**Acceptance criteria.**
1. A flag is a separate call from a capability, and no screen combines the two into one
   boolean.
2. Loading reads false, never true.
3. A capability granted with the flag off shows nothing; a flag on with the capability
   denied shows nothing. Neither substitutes for the other.
4. The dev override forces on only, only in a dev build, and warns loudly in the
   console.
5. A production build ignores the override entirely, proven against the **built bundle**
   and not the dev server. The whole override, warning included, sits inside the
   `import.meta.env.DEV` guard, so it folds away and is **absent from the file** rather
   than merely unreachable — a sharper thing to prove. `drives/f3-s13-bundle.sh` checks
   it as a contrast: the same patterns must be present in the source and absent from
   `dist/`, because finding nothing proves nothing on its own.
6. The flag ships **off globally**, on for the bench workspace, which is what makes any
   of this drivable: a freshly created workspace has the editing surface switched off
   while Bench Construction has it on. A flag that were on everywhere could only be
   tested by turning it off, and that would break every fixture that edits the matrix.
   `drives/f3-s13-flag.py` is how the bench says "shipped here"; F16 owns the real
   admin surface for it.

**Realtime events:** none.

---

# Block D — Specced here, owned elsewhere

_Every remaining §2 line. None of these is built in F3; each names the feature that owns
it, and its line stays unticked in `docs/PARITY.md` until that feature ships it. They
are written down because a line with no spec is a line that gets forgotten._

---

### F3-S14 — Classification systems on and off → **F6**

> §2 Project Setup: "Choose which classification systems the workspace uses (CSI
> MasterFormat, UniFormat, NRM 1, NRM 2, CESMM). At least one must stay on." ·
> **missing**

`Workspace.enabled_classifications` exists as a string array and `WorkspaceUpdate`
accepts it. Nothing writes it and nothing reads it. **Criteria.** All five listed with
their current state; turning the last one off is refused with a sentence saying why,
not a disabled control with no explanation; an unknown system key is refused by the api;
the setting survives a reload and is visible to a second member.
**Events:** `workspace.settings.updated`. **Gate:** `canManageTrades`.

---

### F3-S15 — The classification tree → **F6**

> §2 Classification: "Browse a system's divisions, add a division, add a scope and a
> sub-scope under it, rename and delete. 'This one is in use' refuses a delete that
> would orphan items." · **missing** (legacy `ClassificationTab.tsx`, 524 lines)

**Criteria.** Three levels per system, rendered as a tree; add and rename at each level;
delete a code nothing uses; a code an item uses refuses the delete, names the count, and
is still there afterwards; the refusal is a 409 carrying the reason, not a 500.
**Events:** `workspace.classification.changed` → `{workspace_uuid, system}`.

---

### F3-S16 — Archive instead of delete → **F6**

> §2 Classification: "Archive a code instead of deleting it, and toggle 'Show
> archived'." · **missing**

**Criteria.** Archiving a code in use succeeds where deleting it is refused; an archived
code leaves the tree and every picker; "Show archived" reveals it, visibly marked; an
item already filed under an archived code keeps its classification and says so;
un-archiving restores it everywhere. **Events:** as S15.

---

### F3-S17 — A duplicate code is refused, and a new workspace starts seeded → **F6**

> §2 Classification: "A duplicate code is refused with 'That code already exists in this
> system.'" · **missing**
> §2 Classification: "Seed a workspace from the CSI default template on first use." ·
> **missing** (legacy `load-csi-template`, table `csi_divisions`)

**Criteria.** A duplicate within one system is refused with that sentence, on the field;
the same code in a different system is accepted; a new workspace opening Classification
for the first time finds the CSI divisions already there; seeding twice does not double
the rows; a workspace that has edited its tree is never re-seeded. **Events:** as S15.

---

### F3-S18 — Subcontractors → **F6**

> §2: "Maintain the workspace subcontractor list and assign classification scopes to
> each." · **missing**

Depends on S15: a scope assignment is meaningless without the tree. **Criteria.** Add,
edit and remove a subcontractor; assign one or more scopes, the picker offering only
enabled, unarchived systems; removing one with assignments asks first; an archived scope
shows on an existing assignment, marked, rather than vanishing.
**Events:** `workspace.settings.updated`.

---

### F3-S19 — Trash → **F4**

> §2 Trash: "List soft-deleted projects, restore one, permanently delete one, and show
> 'Permanently deleted at the next daily purge'." · **partial** (the api has soft delete
> and restore; no screen, no purge)
> §2 Trash: "A nightly job hard-deletes projects soft-deleted 30+ days ago, retrying
> storage deletions that failed on an earlier run." · **missing**

Both halves belong to projects: the screen lists projects, and the job deletes project
storage. **Criteria.** Soft-deleted projects listed with when they were deleted and when
they will be purged; restore returns the project to the dashboard intact; permanent
delete asks first and names what goes with it; only `canRestoreDeletedItems` sees the
tab; the purge date is computed, not typed, and matches what the job would do; the job
retries storage deletions that failed on an earlier run rather than dropping them.
**Events:** `project.trashed`, `project.restored` → `{workspace_uuid, project_uuid}`.
**Note:** the bench runs no Celery beat (`intelcost-infra/README.md`, Known gaps), so
F4 adds one or drives the job by hand.

---

### F3-S20 — Project statuses and the dashboard tab strip → **F4**

> §2 Statuses: "Create, rename, reorder, hide and delete project statuses. Deleting one
> asks which status its projects move to." · **missing**
> §2 Statuses: "Configure the dashboard tab strip: add a tab, rename, move up or down,
> remove." · **missing**

**Criteria.** Create, rename, reorder and hide a status; deleting one **asks which
status its projects move to**, and moves them; deleting the last status is refused; a
hidden status keeps its projects and stops being offered; the tab strip saves, and is
driven against the dashboard that F4 builds. **Events:** `workspace.statuses.changed`.

---

### F3-S21 — Shifts → **F15**

> §2 Shifts: "Create a named shift with working days and hours, edit it, delete it, and
> set a per-role default shift." · **missing**

**Criteria.** A shift saves with days and hours and survives a reload; a per-role
default can be set and cleared; deleting a shift held as a default is refused or
reassigns, never silently orphaned; nothing enforces or records time yet and the screen
does not imply it does. **Events:** `workspace.shifts.changed` (legacy channel 10).
**Unblocks:** S11 AC2, the members list's shift column.

---

### F3-S22 — Time tracking → **F15**

> §2 Time Tracking: "Choose automatic app-use tracking or a manual clock in and out, set
> the idle threshold, and choose whether time reports are visible to admins only or to
> everyone." · **missing**
> §2 Time Tracking: "Turn on comparison against the member's shift schedule." ·
> **missing**

**Criteria.** The tracking mode, idle threshold and report visibility save and are read
back; shift comparison cannot be turned on before a shift exists (S21); report
visibility is enforced by the api and not only by the screen.

---

### F3-S23 — AI credits → **F14** (top-up checkout: **F16**)

> §2 AI Credits: "Show the workspace wallet balance, buy a top-up pack through Stripe,
> and land back with the pack credited." · **missing**
> §2 AI Credits: "Set a workspace-wide credit limit and a per-member limit, and return a
> member to the workspace default." · **missing**

A wallet, a credit ledger and per-member limits are **F14**, the AI feature that spends
them. The Stripe checkout and its webhook are **F16**, billing. The one thing F3 owes
them is the capability: `canManageBilling` is owner-only and already in the S1 map, and
`canRunAi` is what a member needs to spend a credit at all.

---

## Realtime events, collected

Named per D-13 for F8's input, published after commit per D-20. All are
workspace-scoped: a client joins only for a workspace it belongs to, checked on connect
and again on token refresh.

| Event | Payload | Replaces legacy channel | Subtask |
|---|---|---|---|
| `workspace.permissions.changed` | `{workspace_uuid, kind, role?}` | 6, 8, 9 | S6, S7, S8 |
| `workspace.member.changed` | `{workspace_uuid, user_uuid, role}` | 6 | S8, S11 |
| `workspace.owner.changed` | `{workspace_uuid, owner_user_uuid}` | — (legacy reloaded) | S9 |
| `workspace.settings.updated` | `{workspace_uuid, fields}` | — | S10, S14, S18 |
| `workspace.activity.appended` | `{workspace_uuid}` | — | S12 |
| `workspace.classification.changed` | `{workspace_uuid, system}` | — | S15, S16, S17 |
| `project.trashed` / `project.restored` | `{workspace_uuid, project_uuid}` | — | S19 |
| `workspace.statuses.changed` | `{workspace_uuid}` | — | S20 |
| `workspace.shifts.changed` | `{workspace_uuid}` | 10 | S21 |

Legacy channel 7 (`trial-state`) stays with F16. Channels 1–5 and 11–13 are takeoff and
estimating, and stay with their features.

---

## Sequencing

**F3 ships S1 through S13**, in that order, in three blocks:

| Block | Subtasks | What it is |
|---|---|---|
| **A — Resolution** | S1, S2, S3, S4 | The nine roles, the twenty-five capabilities, the one shared map, the resolution chain with its five stages, every `owner`/`admin` gate replaced by a capability check, and platform admin resolved in the same layer. |
| **B — Editing the model** | S5, S6, S7, S8 | The matrix, per-workspace overrides, custom roles, and a permission change reaching an open tab. |
| **C — Administered surfaces** | S9, S10, S11, S12, S13 | Ownership transfer, general settings and the logo, the members list, the audit feed, and feature flags kept separate from capabilities. |

**Block A is a reporting boundary.** It is driven and reported before Block B begins:
every later subtask, and every later feature, is written against the answers Block A
produces, so a fault in it is cheapest to find there.

**F3 does not ship S14–S23.** Each names its owning feature — **F6** (classification and
subcontractors), **F4** (trash and statuses), **F15** (shifts and time tracking),
**F14**/**F16** (AI credits and their checkout). Their §2 lines stay unticked, which is
the honest state: specced, not built, owner named.

**The judgement call inside that:** classification (S14–S17) could ship in F3, since it
is configured in workspace settings. It is sequenced to F6 because F6 is what files
items against it, and a tree nothing files against can only be driven as "it saved" —
which is exactly the kind of tick F2-S14 caught being wrong. Say so if you want it
earlier; it moves as a block.

---

## Definition of done

- **S1 through S13** are driven on the bench against their acceptance criteria, in a
  real browser, including the failure states. S14–S23 are not built here and their lines
  stay unticked.
- **One exception, named rather than glossed:** S4 AC6 (a platform admin's unmasked
  capabilities, visible on a screen) closes in **F5**, when the first control calls
  `can()`. Its §3 line ticks on the strength of S4's other five criteria; AC6 itself
  stays open and is listed in F5's spec as inherited.
- The four decisions this spec rests on — **D-21, D-22, D-23, D-24** — are logged in
  `DECISIONS.md`. They were, before any code was written.
- The three §2 Members corrections are applied to `docs/PARITY.md`.
- Every §2 and §3 line F3 ships is ticked; every line it defers names the feature that
  owns it, in the line itself.
- `cd intelcost-app-fastapi && ruff check . && mypy app` passes.
- `cd intelcost-app-react && npm run lint && npm run typecheck && npm run build` passes.
- The spec moves to `docs/archive/`, the F3 row leaves `MANAGER.md`, and the feature
  moves to the `FEATURES.md` ✅ Live table with its flow, files and spec link.
- `intelcost-infra/workspace/` is refreshed and committed in the same session, per the
  Git rule in `CLAUDE.md`.

**What F3 ticks:** all 9 of §3's lines, and 9 of §2's 25. **What it defers:** 15 §2 lines
whole, each to a named feature, plus "Members — list with role, shift and last activity",
which ticks when F15 gives it a shift column (S11 AC2).

---

## Coverage

Every §2 and §3 line that is partial or missing, the subtask that owns it, and whether
F3 builds it.

| § | Line | Subtask | Built in F3 |
|---|---|---|---|
| 2 | General — rename, licence, address | S10 | yes |
| 2 | General — logo upload, replace, remove | S10 | yes |
| 2 | Project Setup — classification systems | S14 | no → F6 |
| 2 | Classification — tree CRUD, in-use delete refusal | S15 | no → F6 |
| 2 | Classification — archive and show archived | S16 | no → F6 |
| 2 | Classification — duplicate code refused | S17 | no → F6 |
| 2 | Classification — CSI seed on first use | S17 | no → F6 |
| 2 | Members — list with role, shift, last activity | S11 | partly (shift → F15) |
| 2 | Members — invite, copy link, resend, revoke | S11 | yes (D-24) |
| 2 | Members — change role, remove | S11 | yes |
| 2 | Roles & Permissions — the matrix | S5 | yes |
| 2 | Roles & Permissions — custom roles | S7 | yes |
| 2 | Roles & Permissions — built-in overrides | S6 | yes |
| 2 | Ownership — transfer, queue, cancel | S9 | yes |
| 2 | Statuses — create, rename, reorder, hide, delete | S20 | no → F4 |
| 2 | Statuses — dashboard tab strip | S20 | no → F4 |
| 2 | Shifts | S21 | no → F15 |
| 2 | Time Tracking — mode, idle, visibility | S22 | no → F15 |
| 2 | Time Tracking — shift comparison | S22 | no → F15 |
| 2 | AI Credits — wallet and top-up | S23 | no → F14 / F16 |
| 2 | AI Credits — limits | S23 | no → F14 |
| 2 | Subcontractors | S18 | no → F6 |
| 2 | Trash — screen | S19 | no → F4 |
| 2 | Trash — nightly purge | S19 | no → F4 |
| 2 | Activity — audit feed | S12 | yes |
| 3 | `can()` everywhere, not role tests | S1, S3 | yes |
| 3 | Resolution order, and absent keys fall back | S2 | yes |
| 3 | Workspace admin vs platform admin | S4 | yes |
| 3 | Only the owner grants owner, by transfer | S9 | yes |
| 3 | A permission change reaches an open tab | S8 | yes |
| 3 | Capability and feature flag stay separate | S13 | yes |
| 3 | Collaborator plan loses measure, keeps markup | S2 | yes |
| 3 | Platform routes 404 for customers | S4 | yes |

25 §2 lines and 9 §3 lines, 34 in total, each owned by exactly one subtask. The two §3
resolution lines share one row above; every other row is one line. Three §2 lines marked
**ported** are corrected to **partial** above and are covered by S11.

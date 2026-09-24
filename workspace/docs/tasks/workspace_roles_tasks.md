# F3 — Workspace, roles and permissions

_Spec for the `MANAGER.md` F3 row. Closes [PARITY.md §2](../PARITY.md#2-workspace-settings)
(workspace settings, 25 lines) and [§3](../PARITY.md#3-permissions) (permissions, 9
lines)._

**Board:** [../../MANAGER.md](../../MANAGER.md) · **Rules of engagement:**
[../../DECISIONS.md](../../DECISIONS.md) · **Parity:** [../PARITY.md](../PARITY.md)

---

## The problem

Section 1 is closed: people can get into the product. Section 2 and 3 are what they
find when they are in it, and almost none of it exists.

**Legacy runs on a capability model.** Nine roles, twenty-four capabilities, and one
map (`src/lib/permissions/capabilities.ts`) that both the runtime check and the
permissions matrix read, so the two cannot drift. On top of that sit three things a
workspace may change for itself: a **custom role** (its own label and capability map,
carrying a built-in base role so the database still understands it), an **override** of
a built-in working role for that workspace only, and a role **disabled** for that
workspace so it stops appearing at all. Then two masks cap everyone: the paid plan,
and the trial once it has expired.

**The new api has four roles and no capabilities.** `WorkspaceRole` is
`owner | admin | member | collaborator`, and its own docstring says custom roles and
overrides "are not ported here. They belong with the estimating surfaces (F5)". Every
gate in the app is `role === "owner" || role === "admin"`, which is exactly what
legacy's own rules forbid in writing. Nothing reads a capability, because there is no
capability to read.

So F3 is not "add some settings screens". It is the decision about what the permission
model *is*, and then eleven tabs' worth of surface that depends on the answer.

### What exists today

| Piece | State |
|---|---|
| `WorkspaceRole` (4 values), `WorkspaceMember`, invitations | Built, driven in F2 |
| Workspace fields: name, company type, address, phone, licence, logo_url, accent, `enabled_classifications` | Columns exist; `PATCH /api/workspace/{uuid}` accepts most of them; **no screen edits any of them** |
| `GET /api/workspace/{uuid}/member`, role change, remove, leave, last-owner invariant | Built |
| `/settings/members` | Lists members, invites, resends, revokes, changes role, removes |
| Everything else in §2 and §3 | Does not exist |

---

## The decision this spec cannot make for itself

> **O-1. How many roles, and do capabilities come with them?**
> **Needs a `D-NN` in `DECISIONS.md` before F3-S2 starts.** Everything from F3-S2 to
> F3-S8 is shaped by the answer, and half of §2's remaining tabs assume it.

| Option | What it means | Cost |
|---|---|---|
| **A — Port the capability model whole.** Nine roles, twenty-four capabilities, custom roles, per-workspace overrides, disabled roles. | Parity, and the matrix screen legacy customers already know. Every later feature asks `can('canEditPricing')` and gets a true answer. | Five new tables, a resolution chain with five stages, and a matrix screen of 24 rows × 9+ columns. Most of it gates surfaces that do not exist yet (pricing, vendor quotes, proposals, AI). |
| **B — Capabilities now, custom roles and overrides later.** The 24 capabilities and the 9 roles ship; `workspace_custom_roles` and `workspace_role_overrides` wait. | The runtime answer is right from the start, so no screen built between now and then has to be revisited. A custom role is additive when it arrives. | The matrix screen ships read-only, which is a visible gap against legacy. |
| **C — Keep four roles, add capabilities as a thin map.** Four roles, 24 capabilities derived from them. | Smallest step. Nothing in the api changes shape. | Four roles cannot express QA-reviews-but-cannot-edit, which is the distinction the takeoff review flow (F5) is built around. Deferring it means re-tiering every existing member later. |

**Recommendation: B.** The expensive half of A is the editing surface, and the thing
every other feature depends on is the *resolution*, not the editing. B gets the
resolution right now — `can('...')` answers correctly on day one, so F4 through F8 are
written against the real thing — and leaves the two tables that only an admin screen
touches for when there is a workspace asking for them. A is the destination; B is A
minus the part nobody needs yet, and it does not paint us into a corner because both
missing tables are additive.

Whatever is chosen, one thing is not optional: **the role→capability map is written
once and read by both the runtime check and the matrix**, as legacy does. Two copies
is two answers.

### Smaller questions, same file

> **O-2.** Legacy's `deriveBaseRole()` has no return for the read-only cases, so a
> custom role granting neither takeoff nor pricing nor admin returns `undefined` and is
> written to `user_roles.role` as null. Port the function with a `viewer` fallback and
> record the fix; do not reproduce the bug.

> **O-3.** Does a **platform admin** (IntelCost staff) exist in the new api? Legacy has
> `is_platform_admin` and a `/platform/*` route tree that 404s for everyone else.
> `User.is_platform_admin` already exists as a column and nothing reads it. §3 has two
> lines about it, so F3 either uses it or the lines move to a later feature.

---

## Scope, honestly

§2 is eleven tabs, and four of them are not workspace administration at all:

| Tab | Really belongs to | Why it is listed here |
|---|---|---|
| **AI Credits** (F3-S17, F3-S18) | **F6 / P-15 billing.** Stripe checkout, a wallet, a credit ledger. | It renders inside workspace settings. |
| **Shifts**, **Time Tracking** (F3-S14, F3-S15, F3-S16) | **P-14**, time tracking and shifts. | Same. |
| **Trash** purge job (F3-S20) | **P-03**, projects. | The screen is in settings; the nightly job is not. |
| **Classification** (F3-S3 … F3-S6) | **P-05**, the item model. Classification is what a takeoff item is filed under. | Configured in settings, consumed in takeoff. |

They are specced here because the instruction is to cover every §2 and §3 line, and
because a line with no spec is a line that gets forgotten. **They should not all ship
in F3.** See [Sequencing](#sequencing) for what to cut and where it lands.

---

## Corrections to PARITY §2, to apply as part of F3

Three lines say **ported** and are not, in the same shape F2-S14 found: the api
accepts something no screen sends, or the screen omits a column.

| Line | Reads | Should read |
|---|---|---|
| **Members.** List members with role, **shift and last activity** | ported | **partial** — the list shows email, name and role. There is no shift (no shifts feature) and no last activity (`last_sign_in_at` exists on the user and is not exposed by `MemberRead`). F3-S13. |
| **Members.** Invite by email with a role, **copy the invite link**, resend, revoke | ported | **partial** — invite, resend and revoke are built and driven (F2-S2). Copying the link is not: the raw token is returned exactly once, at creation, and never stored, so "copy the link" for an existing invitation is not a screen change but a decision about whether to re-mint. F3-S13. |
| **Members.** Change a member's role, or remove them | ported | **ported**, correct. Driven in F2 only as far as the last-owner invariant; F3-S13 drives the rest. |

---

## Subtasks

Every §2 and §3 line that is **partial** or **missing** maps to exactly one subtask.
The [coverage table](#coverage) at the end is the proof that none was dropped.

Realtime events are named per **D-13**: published after the write commits, over the
api's WebSocket with Redis fan-out, carrying the client's write token so the sender
ignores its own echo. **F8 builds the transport.** Until it exists, every subtask below
ships with the event *named and not emitted*, and its acceptance criterion is a refetch
on focus rather than a live update. The events are written down now so F8 has its input
and so nobody invents a second naming scheme later.

---

### F3-S1 — The capability model

> §3: "Every screen asks `can('<capability>')` rather than testing a role" ·
> **partial** · `src/hooks/usePermissions.ts`

**Legacy.** `capabilities.ts` is the single runtime source: `ROLE_TO_CAPS` maps each of
nine roles to a partial capability map, built by composing `TAKEOFF_CAPS`,
`PRICING_CAPS`, `ADMIN_CAPS` and `OWNER_CAPS`. `capabilitiesForRole()` fills the gaps
from `NO_CAPABILITIES`, so a capability added tomorrow is false everywhere until a role
grants it. The matrix renders from the same map and carries labels only — the file says
so twice: "never restate a permission here".

**Work.**
- `api`: the capability enum and the role→capability map, in one module, as the single
  source. The api enforces; the app repeats it for UX only, exactly as F2's
  `roles.ts` does for role names.
- `api`: `GET /api/workspace/{uuid}/capability` returns the caller's resolved map, so
  the app never derives it a second way.
- `app`: `usePermissions(workspaceUuid)` exposing `can(cap)`, `role`,
  `isWorkspaceAdmin` and `isPlatformAdmin`.
- Both: the capability list lives in one place per repo and the two are checked equal
  by a bench step, not by hope.

**Acceptance criteria.**
1. Every capability in the map is reachable: for each of the nine roles, the api's
   resolved map equals the map the app computes for that role.
2. `can()` answers false for an unknown capability name rather than throwing.
3. A capability added to the map but granted by no role reads false for every role,
   including owner.
4. No component anywhere tests `role === "owner"`; a grep in the bench pass proves it.
5. `isWorkspaceAdmin` (owner or admin, customer side) and `isPlatformAdmin` (staff) are
   separate values and never substitute for each other.

**Realtime events:** none of its own. It consumes F3-S9's.

---

### F3-S2 — Capability resolution: role, override, custom role, plan, trial

> §3: "Capability resolves as role default, then workspace override, then custom role,
> then masked by the plan, then masked by the trial" · **missing**
> §3: "A capability added after a workspace saved its override falls back to the role
> default rather than reading as denied" · **missing**

**Legacy.** The order is exact and each stage matters. `capabilitiesFromMap(map,
fallback)` is the subtle one: **an absent key is not a denial**, it is a map written
before that capability existed, so it falls back to the role default. An explicit
`false` still wins. Then `applyPlanMask` ANDs the workspace's paid plan, then
`applyTrialMask` — which bites **only** on expiry or an admin lock, never mid-trial,
because mid-trial Tier 3 limits are quantitative and enforced at write time. A platform
admin bypasses both masks, so plan state cannot lock staff out of a customer workspace.

**Work.**
- `api`: the resolution chain, in the order above, in one function.
- `api`: forbidden capabilities (`canTransferOwnership`, `canManageBilling`,
  `canGrantOwnerRole`) forced off for any custom or overridden role, in the service
  **and** as a database-level guard, as legacy does in a trigger.
- The plan and trial masks read what F2-S5/S8 already record (`billing_tier`,
  `trial_ends_at`); the plan itself waits on F6 and resolves as `pro` until then.

**Acceptance criteria.**
1. A role default alone resolves correctly with no override and no custom role.
2. An override replaces that role's map **wholly** for that workspace, and not for any
   other workspace.
3. A custom role's map wins over the built-in default of its base role.
4. **A capability absent from a saved override falls back to the role default.** Save
   an override, add a capability to the map, re-resolve: it reads as the role default,
   not as denied.
5. An explicit `false` in a saved map stays false after the same change.
6. A `collaborator`-plan workspace loses `canEditTakeoff` and keeps `canUseAnnotations`,
   whatever the role says.
7. An expired trial strips everything except the view-only keeps; a trial with days
   left strips nothing.
8. A platform admin's map is unmasked by plan and trial.
9. Forbidden capabilities are off on a custom role even when the stored map says true.

**Realtime events:** consumes `workspace.permissions.changed` (F3-S9).

---

### F3-S3 — Classification systems on and off

> §2 Project Setup: "Choose which classification systems the workspace uses (CSI
> MasterFormat, UniFormat, NRM 1, NRM 2, CESMM). At least one must stay on." ·
> **missing**

**Today.** `Workspace.enabled_classifications` exists as a string array and
`WorkspaceUpdate` accepts it. Nothing writes it and nothing reads it.

**Work.** `api`: validate the set against the five known systems and refuse an empty
one. `app`: the Project Setup tab.

**Acceptance criteria.**
1. All five systems listed, current state shown.
2. Turning the last one off is refused, with a sentence saying why rather than a
   disabled control with no explanation.
3. An unknown system key is refused by the api.
4. The setting survives a reload and is visible to a second member.

**Realtime events:** `workspace.settings.updated` → `{workspace_uuid, fields}`.

---

### F3-S4 — The classification tree

> §2 Classification: "Browse a system's divisions, add a division, add a scope and a
> sub-scope under it, rename and delete. 'This one is in use' refuses a delete that
> would orphan items." · **missing** (legacy `ClassificationTab.tsx`, 524 lines)

**Work.** `api`: `workspace_classification` (workspace, system, code, label, parent,
level, archived), full CRUD, and a delete that refuses when any takeoff item references
the code. `app`: the tree with its three levels.

**Acceptance criteria.**
1. Divisions, scopes and sub-scopes render as a tree, three levels deep, per system.
2. Add at each level; rename at each level.
3. Delete a code nothing uses → gone.
4. Delete a code an item uses → refused, naming the count, and the code is still there
   afterwards.
5. The refusal is a 409 carrying the reason, not a 500.

**Realtime events:** `workspace.classification.changed` → `{workspace_uuid, system}`.

---

### F3-S5 — Archive instead of delete

> §2 Classification: "Archive a code instead of deleting it, and toggle 'Show archived'." ·
> **missing**

**Acceptance criteria.**
1. Archiving a code in use succeeds where deleting it is refused.
2. An archived code disappears from the tree by default and from every picker.
3. "Show archived" reveals it, visibly marked.
4. An item already filed under an archived code keeps its classification and says so.
5. Un-archiving restores it everywhere.

**Realtime events:** as F3-S4.

---

### F3-S6 — A duplicate code is refused, and a new workspace starts seeded

> §2 Classification: "A duplicate code is refused with 'That code already exists in this
> system.'" · **missing**
> §2 Classification: "Seed a workspace from the CSI default template on first use." ·
> **missing** (legacy `load-csi-template`, table `csi_divisions`)

**Work.** `api`: a uniqueness constraint per (workspace, system, code) and the seed,
which runs **once**, on first use, and is idempotent.

**Acceptance criteria.**
1. A duplicate code within one system is refused with that sentence, on the field.
2. The same code in a different system is accepted.
3. A new workspace opening Classification for the first time finds the CSI divisions
   already there.
4. Seeding twice does not double the rows.
5. A workspace that has edited its tree is never re-seeded.

**Realtime events:** as F3-S4.

---

### F3-S7 — The roles and permissions matrix

> §2 Roles & Permissions: "A matrix of every role against every capability. Click a cell
> to grant or remove." · **missing**

**Legacy.** Columns are the four fixed roles (owner, admin, collaborator, viewer) then
the five editable working roles, then any custom roles. Rows are the nine capability
groups. The file carries labels only.

**Work.** `app`: the matrix, rendering from the F3-S1 map. Editable only where the role
is editable and the caller has `canAssignRoles`.

**Acceptance criteria.**
1. Every capability appears exactly once, under its group heading.
2. Fixed roles render read-only, with a reason on hover rather than a dead cell.
3. Owner's column is fully granted and cannot be edited.
4. A cell click grants or removes, and the change is visible to `can()` without a
   reload (F3-S9).
5. A caller without `canAssignRoles` sees the matrix read-only rather than not at all.
6. The matrix and the runtime check disagree nowhere: a bench step compares every cell
   against the api's resolved map for that role.

**Realtime events:** consumes `workspace.permissions.changed`.

---

### F3-S8 — Custom roles, and built-in roles edited for this workspace

> §2: "Create a workspace-defined custom role from a base role, label it, edit its
> capabilities, and delete it when no member holds it." · **missing**
> §2: "Edit a built-in role's capabilities for this workspace only. The cell is flagged
> 'Edited for this workspace'." · **missing**

**Legacy.** A custom role is a label plus a capability map plus a **base role**, the
built-in enum value written to `user_roles.role` so every server-side rule keeps working
for a role the database has never heard of. `deriveBaseRole()` picks it and must never
over-grant. Overrides apply only to the five editable working roles; owner, admin and
viewer are fixed everywhere so their meaning stays predictable across workspaces.
Legacy also allows a role to be **disabled** for a workspace, stored as an override row
with `is_disabled`, which drops it from the matrix entirely — that is a fourth
behaviour the parity lines do not mention and it ships here or not at all.

**Acceptance criteria.**
1. Create a custom role from a base role, label it, grant capabilities; a member
   assigned it resolves those capabilities.
2. `user_roles.role` for that member holds the **base** role, and every existing
   server-side rule behaves as it does for that base role.
3. `deriveBaseRole` never returns admin for a role that does not administer, and
   returns a read-only role rather than nothing for a role granting neither (O-2).
4. The three forbidden capabilities cannot be granted to a custom role, by the screen
   or by a hand-written request.
5. Deleting a custom role that a member holds is refused, naming the count.
6. Overriding a built-in working role changes it in this workspace only; a second
   workspace is untouched.
7. An overridden cell is flagged "Edited for this workspace", and reset restores the
   default.
8. Overriding owner, admin or viewer is refused by the api, not merely hidden.
9. A disabled role disappears from the matrix and from every role picker, and members
   holding it keep working until moved.

**Realtime events:** `workspace.permissions.changed` →
`{workspace_uuid, kind: "custom_role" | "override", role}`. Channels 8 and 9 of the
legacy table collapse into this one.

---

### F3-S9 — A permission change reaches an open tab

> §3: "A role or permission change reaches an open tab live, with no reload." ·
> **missing** (legacy channel 6)

**Legacy.** One channel per (user, workspace) watching `user_roles`,
`workspace_custom_roles`, `workspace_role_overrides` and `workspace_billing`, each
re-reading the role on any change. The instance id in the channel name exists because
two `usePermissions()` callers in one tree would otherwise collide.

**Work.** Named now, emitted by F8. Until then the app refetches capabilities on window
focus and after any mutation that could change them.

**Acceptance criteria.**
1. An admin changes a member's role in one browser; the member's other tab reflects it
   without a reload (F8) or on next focus (before F8).
2. A capability removed from under someone mid-action is refused by the api, not merely
   hidden. The screen says what happened rather than failing silently.
3. Demoting yourself takes effect on your own screen.
4. Two `usePermissions()` callers in one tree do not interfere.

**Realtime events:** `workspace.permissions.changed`, `workspace.member.changed` →
`{workspace_uuid, user_uuid, role}`. Both are workspace-scoped; a client joins only for
workspaces it belongs to (D-13).

---

### F3-S10 — Platform admin is a separate answer

> §3: "Workspace admin and platform admin are separate answers that never mix." ·
> **missing**
> §3: "Platform-internal routes render the 404 page for a non-platform user." ·
> **missing**

**Legacy.** `PlatformRoute` renders `<NotFound />` — never a redirect, never a "you do
not have access" message, so internal tooling is indistinguishable from a wrong URL.

**Depends on O-3.**

**Acceptance criteria.**
1. `isPlatformAdmin` comes from the api, never from a role name.
2. A platform route renders the ordinary 404 for a customer, with the same markup and
   the same tab title as any other 404.
3. A workspace owner who is not staff gets the 404 too.
4. A platform admin sees the route.
5. No screen gates a customer feature on `isPlatformAdmin`, and none gates an internal
   one on `isWorkspaceAdmin`.

**Realtime events:** none.

---

### F3-S11 — Only the owner grants ownership, and only by transfer

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
1. Only the owner sees the transfer control; an admin calling the api directly is
   refused.
2. Transfer to a member: they become owner, the previous owner becomes admin, in one
   transaction. Neither an ownerless nor a two-owner state is reachable.
3. Transfer to an address with no account: queued, an admin invitation goes out, and
   the swap happens on accept — not before.
4. A queued transfer can be cancelled, and cancelling leaves the invitation alone.
5. Only one transfer may be queued at a time.
6. The confirmation demands the workspace name typed, as legacy does.
7. Revoking the invitation behind a queued transfer cancels the transfer too, rather
   than leaving it waiting for someone who can never accept.
8. Both paths write an audit event (F3-S21).

**Realtime events:** `workspace.owner.changed` → `{workspace_uuid, owner_user_uuid}`.

---

### F3-S12 — General settings and the workspace logo

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
3. Only a caller with `canManageWorkspace` may save; the form is read-only otherwise.
4. Logo upload accepts the four types under 2 MB, presigned per hard rule 5.
5. **A separate message per rejection**: wrong type, too large, and upload failed are
   three sentences, not one.
6. Replace swaps it; remove clears it and the old object is deleted.
7. The logo appears wherever the workspace is named.

**Realtime events:** `workspace.settings.updated`.

---

### F3-S13 — The members list tells the truth

> §2 Members: list with role, shift and last activity · **partial** (correction above)
> §2 Members: invite, copy link, resend, revoke · **partial** (correction above)
> §2 Members: change role, remove · **ported**

**Acceptance criteria.**
1. The list shows name, address, role and **last activity**; `MemberRead` carries it.
2. Shift is shown only once F3-S14 exists, and the column is absent rather than empty
   until then.
3. Copy-link: either the link is copyable at creation only (the token is never stored,
   so this is the honest option) or "copy link" re-mints and invalidates the previous
   one, said out loud on the screen. **Pick one and record it**; silently re-minting is
   the one unacceptable answer.
4. Resend and revoke behave as F2 drove them.
5. Role change and removal obey the last-owner invariant and the capability gate.
6. A member with no `canAssignRoles` sees the list read-only.

**Realtime events:** `workspace.member.changed`.

---

### F3-S14 — Shifts · F3-S15 — Time tracking · F3-S16 — Shift comparison

> §2 Shifts: "Create a named shift with working days and hours, edit it, delete it, and
> set a per-role default shift." · **missing**
> §2 Time Tracking: "Choose automatic app-use tracking or a manual clock in and out, set
> the idle threshold, and choose whether time reports are visible to admins only or to
> everyone." · **missing**
> §2 Time Tracking: "Turn on comparison against the member's shift schedule." ·
> **missing**

**These belong to P-14.** Specced here so the lines are not lost; see
[Sequencing](#sequencing). Acceptance criteria are deliberately thin until P-14 owns
them: settings that nothing consumes cannot be driven beyond "it saved".

**Acceptance criteria (settings only).**
1. A shift saves with days and hours and survives a reload.
2. A per-role default shift can be set and cleared.
3. Deleting a shift held as a default is refused or reassigns, not silently orphaned.
4. The tracking mode, idle threshold and report visibility save and are read back.
5. Nothing enforces or records time yet, and the screen does not imply it does.

**Realtime events:** `workspace.shifts.changed` (legacy channel 10).

---

### F3-S17 — AI credit wallet · F3-S18 — Credit limits

> §2 AI Credits: "Show the workspace wallet balance, buy a top-up pack through Stripe,
> and land back with the pack credited." · **missing**
> §2 AI Credits: "Set a workspace-wide credit limit and a per-member limit, and return a
> member to the workspace default." · **missing**

**These belong to F6 / P-15.** A Stripe checkout, a wallet, a credit ledger and a
webhook are a billing feature that happens to be rendered in settings. **Do not build
in F3.** The one thing F3 owes them is the capability: `canManageBilling` is
owner-only and already in the F3-S1 map.

---

### F3-S19 — Subcontractors

> §2: "Maintain the workspace subcontractor list and assign classification scopes to
> each." · **missing**

**Depends on F3-S4**: a scope assignment is meaningless without the classification tree.

**Acceptance criteria.**
1. Add, edit and remove a subcontractor.
2. Assign one or more classification scopes; the picker offers only enabled, unarchived
   systems.
3. Removing a subcontractor with assignments asks before it removes them.
4. An archived scope shows on an existing assignment, marked, rather than vanishing.

**Realtime events:** `workspace.settings.updated`.

---

### F3-S20 — Trash

> §2 Trash: "List soft-deleted projects, restore one, permanently delete one, and show
> 'Permanently deleted at the next daily purge'." · **partial** (api has soft delete and
> restore; no screen, no purge)
> §2 Trash: "A nightly job hard-deletes projects soft-deleted 30+ days ago, retrying
> storage deletions that failed on an earlier run." · **missing**

**The screen is F3. The nightly job belongs with projects (P-03)** — it deletes project
storage, and its retry log is a projects concern. Specced here, sequenced there.

**Acceptance criteria (screen).**
1. Soft-deleted projects listed with when they were deleted and when they will be
   purged.
2. Restore returns the project to the dashboard intact.
3. Permanent delete asks first and names what goes with it.
4. Only `canRestoreDeletedItems` sees the tab.
5. The purge date is computed, not typed, and matches what the job would do.

**Realtime events:** `project.trashed`, `project.restored` → `{workspace_uuid,
project_uuid}`.

---

### F3-S21 — The activity feed

> §2 Activity: "An audit feed of who did what in the workspace." · **missing** (legacy
> `log_audit_event`, table `audit_log`)

**Work.** `api`: an `audit_log` table and one service-side writer, called by the acts
that matter: role changes, ownership transfer, member removal, invitation lifecycle,
settings changes, classification deletes, trash purges. Written **in the same
transaction as the act** — an audit row that can be lost separately from the thing it
records is worse than none. Note this is the one place D-20 does not apply: an audit
row is a write, not a dispatch.

**Acceptance criteria.**
1. Every act above produces exactly one row: actor, action, target, before and after.
2. The feed is workspace-scoped and visible only with `canViewWorkspaceActivity`.
3. An act that fails writes no audit row.
4. The row survives the actor being removed from the workspace.
5. Paginated, newest first.

**Realtime events:** `workspace.activity.appended` → `{workspace_uuid}`. Low value
live; a refetch on focus is enough and F8 may skip it.

---

### F3-S22 — Feature flags are not permissions

> §3: "'Can the user do this' and 'is the feature shipped' stay separate gates, the
> second being a feature flag." · **missing**

**Legacy.** `useFeatureFlag` reads `feature_flags` and returns **false while loading**,
so the UI stays closed by default. The dev force-on override is gated behind
`import.meta.env.DEV` and is force-ON only: a client-side override that worked in
production would turn every flag from a gate into a suggestion.

**Acceptance criteria.**
1. A flag is a separate call from a capability, and no screen combines them into one
   boolean.
2. Loading reads false, never true.
3. A capability granted with the flag off shows nothing; a flag on with the capability
   denied shows nothing. Neither substitutes for the other.
4. The dev override forces on only, only in a dev build, and warns loudly in the
   console.
5. A production build ignores the override entirely, proven on the bench against the
   built bundle rather than the dev server.

**Realtime events:** none.

---

### F3-S23 — Project statuses and the dashboard tab strip

> §2 Statuses: "Create, rename, reorder, hide and delete project statuses. Deleting one
> asks which status its projects move to." · **missing**
> §2 Statuses: "Configure the dashboard tab strip: add a tab, rename, move up or down,
> remove." · **missing**

**Consumed by P-03**, the projects dashboard, which does not exist yet. The settings
half can ship first; the tab strip cannot be driven until there is a dashboard to strip.

**Acceptance criteria.**
1. Create, rename, reorder and hide a status.
2. Deleting a status **asks which status its projects move to**, and moves them.
3. Deleting the last status is refused.
4. A hidden status keeps its projects and stops being offered.
5. Tab strip configuration saves; driving it against the dashboard is P-03.

**Realtime events:** `workspace.statuses.changed`.

---

## Realtime events, collected

Named per D-13 for F8's input. All are workspace-scoped: a client joins only for a
workspace it belongs to, checked on connect and again on token refresh.

| Event | Payload | Replaces legacy channel | Subtask |
|---|---|---|---|
| `workspace.permissions.changed` | `{workspace_uuid, kind, role?}` | 6, 8, 9 | S8, S9 |
| `workspace.member.changed` | `{workspace_uuid, user_uuid, role}` | 6 | S9, S13 |
| `workspace.owner.changed` | `{workspace_uuid, owner_user_uuid}` | — (legacy reloaded) | S11 |
| `workspace.settings.updated` | `{workspace_uuid, fields}` | — | S3, S12, S19 |
| `workspace.classification.changed` | `{workspace_uuid, system}` | — | S4, S5, S6 |
| `workspace.statuses.changed` | `{workspace_uuid}` | — | S23 |
| `workspace.shifts.changed` | `{workspace_uuid}` | 10 | S14 |
| `workspace.activity.appended` | `{workspace_uuid}` | — | S21 |
| `project.trashed` / `project.restored` | `{workspace_uuid, project_uuid}` | — | S20 |

Legacy channel 7 (`trial-state`) stays with F16. Channels 1–5 and 11–13 are takeoff and
estimating, and stay with their features.

---

## Sequencing

**Ship in F3:** S1, S2, S7, S9, S10, S11, S12, S13, S21, S22. That is the permission
model, the surfaces that administer it, and the audit trail that records it — the
feature as its name describes it.

**Ship in F3 if the classification tree is wanted before takeoff:** S3, S4, S5, S6,
S19. Otherwise they move to P-05 whole.

**Do not ship in F3:** S14, S15, S16 (P-14), S17, S18 (F6/P-15), S23 (P-03), and the
nightly purge half of S20 (P-03). Their lines stay in §2 and stay unticked, which is
the honest state: specced, not built, and their owning feature named.

F3's definition of done below counts only the first group. A §2 line owned by another
feature is ticked when that feature ships it.

---

## Definition of done

- F3-S1, S2, S7, S9, S10, S11, S12, S13, S21 and S22 are driven on the bench against
  their acceptance criteria, in a real browser, including the failure states.
- **O-1 is settled in `DECISIONS.md` before F3-S2 is written.** O-2 and O-3 are settled
  before the subtasks that depend on them.
- The three §2 Members corrections are applied to `docs/PARITY.md`.
- Every §2 and §3 line this spec ships is ticked; every line it defers names the feature
  that owns it, in the line itself.
- `cd intelcost-app-fastapi && ruff check . && mypy app` passes.
- `cd intelcost-app-react && npm run lint && npm run typecheck && npm run build` passes.
- The spec moves to `docs/archive/`, the F3 row leaves `MANAGER.md`, and the feature
  moves to the `FEATURES.md` ✅ Live table.
- `intelcost-infra/workspace/` is refreshed and committed in the same session, per the
  Git rule in `CLAUDE.md`.

---

## Coverage

Every §2 and §3 line that is partial or missing, and the subtask that owns it.

| § | Line | Subtask |
|---|---|---|
| 2 | General — rename, licence, address | S12 |
| 2 | General — logo upload, replace, remove | S12 |
| 2 | Project Setup — classification systems | S3 |
| 2 | Classification — tree CRUD, in-use delete refusal | S4 |
| 2 | Classification — archive and show archived | S5 |
| 2 | Classification — duplicate code refused | S6 |
| 2 | Classification — CSI seed on first use | S6 |
| 2 | Members — list with role, shift, last activity | S13 |
| 2 | Members — invite, copy link, resend, revoke | S13 |
| 2 | Members — change role, remove | S13 |
| 2 | Roles & Permissions — the matrix | S7 |
| 2 | Roles & Permissions — custom roles | S8 |
| 2 | Roles & Permissions — built-in overrides | S8 |
| 2 | Ownership — transfer, queue, cancel | S11 |
| 2 | Statuses — create, rename, reorder, hide, delete | S23 |
| 2 | Statuses — dashboard tab strip | S23 |
| 2 | Shifts | S14 |
| 2 | Time Tracking — mode, idle, visibility | S15 |
| 2 | Time Tracking — shift comparison | S16 |
| 2 | AI Credits — wallet and top-up | S17 |
| 2 | AI Credits — limits | S18 |
| 2 | Subcontractors | S19 |
| 2 | Trash — screen | S20 |
| 2 | Trash — nightly purge | S20 |
| 2 | Activity — audit feed | S21 |
| 3 | `can()` everywhere, not role tests | S1 |
| 3 | Resolution order, and absent keys fall back | S2 |
| 3 | Workspace admin vs platform admin | S1, S10 |
| 3 | Only the owner grants owner, by transfer | S11 |
| 3 | A permission change reaches an open tab | S9 |
| 3 | Capability and feature flag stay separate | S22 |
| 3 | Collaborator plan loses measure, keeps markup | S2 |
| 3 | Platform routes 404 for customers | S10 |

25 §2 lines and 9 §3 lines. Three §2 lines marked **ported** are corrected to
**partial** above and are covered by S13.

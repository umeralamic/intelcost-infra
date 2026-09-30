# IntelCost — Parity checklist

_**Every user-facing behaviour of the legacy app, in one list, so the port cannot
miss one.** One section per surface. One checkbox per behaviour: what the user does,
what happens, and the legacy file that does it._
_Built: 2026-09-24, from legacy `intelcost/` at `12dd119b`. 24 sections, 595
behaviours. Every one of the 292 shipped plan files maps to a section; the
[appendix](#appendix-every-plan-file-mapped) is the proof._

**Board:** [../MANAGER.md](../MANAGER.md) · **Backlog:** [../FEATURES.md](../FEATURES.md) · **Rules of engagement:** [../DECISIONS.md](../DECISIONS.md)

---

## How to read this

Each line carries a status against the **new** repos (`intelcost-app-react` and
`intelcost-app-fastapi`), not against the legacy app:

| Status | Meaning |
|---|---|
| **ported** | The behaviour exists in the new repos. |
| **partial** | Some of it exists. The line says what is missing. Commonly: the api route exists and no screen calls it, or the screen exists with a fraction of the legacy behaviour. |
| **missing** | Nothing in the new repos does this. |

A line is ticked (`[x]`) only when it is **ported** *and* driven on the bench, per the
Done rule in [../MANAGER.md](../MANAGER.md). A line struck through and marked
**retired** is out of scope by a decision: it is ticked so its section can complete,
and it is not ported.

**Since D-68 (2026-09-28)** the fixture suite is archived at tag
`fixtures-archive-2026-09-28`. A line ticked before then keeps its tick and says *driven
by fixture, archived at tag fixtures-archive-2026-09-28*; the fixture names it cites
(`f4-s13`, `p19`) are in that tag, not the tree. A line ticked after it says
*smoke-checked (D-68)*: driven once by a throwaway check at the end of its block, and
owed a fixture-backed run in the full run required before any deploy to testers.

**Section 1 is complete** (F2, 2026-09-24): 21 lines, **19 ported and driven**, **2
retired** (D-15 OAuth consent, D-17 clear cached session). Every one was driven in a
real browser on the bench, including its failure states; the fixtures are archived at
tag `fixtures-archive-2026-09-28` in `intelcost-infra` (D-68).

**Section 3 is complete** (F3, 2026-09-25): all 9 lines ported and driven. **Section 2
is 9 of 25**, and the 16 it does not ship each name the feature that owns it, in the
line itself. Two ticked lines carry a named remainder rather than a clean close, and
both say so on the line: the platform-admin line owed F5 its on-screen half (**paid by
F5-S18, 2026-09-27**), and the collaborator-plan line is unreachable end to end until F16 supplies a plan value. One
§2 line, "Members — list with role, shift and last activity", stays **partial** on
purpose: last activity ships, the shift column waits for F15.

**Section 4 is complete** (F4, 2026-09-25): 19 lines, **18 ported and driven**, **1
retired** (New from folder, **D-31**). **Section 5 is 7 of 10**: the other three name
their owner on the line, the map and the geocoder **P-17** (**D-28**) and sheets from
project files **F5**. **Section 2 is 13 of 25** after F4 added the two Statuses and the
two Trash lines.

**F8 (realtime, 2026-09-26)** ticks **nine §10 lines** (the legacy soft-lock as One at a
time, write tokens, and seven of the eight collaboration lines beyond legacy; the eighth,
others' cursors, is **partial** until F7 draws them) and **one §24 line** (the
Collaboration preferences). §10's "see each other's items, geometries, calibrations and
folders" stays **partial**: items and geometries are live, calibrations are F5's and
folders F6's. §3's live-permissions line is now live rather than on focus. The realtime
table below gains its "New event" column.

**F5 (the takeoff shell, shipped 2026-09-27; every block checked by the founder, Block F
PASS).** 27 ticked lines now name F5: §5 1, §7 8, §9 6, §10 2 and §24 10. 10 lines stay open
with their remainder named on the line: six in §7 (the naming format, the page actions,
the bookmarks panel, a markup chip, JPG and TIFF, the panel's menu), §10's "see each
other's … folders" (folders are F6's; calibrations are live), §23's Takeoff panel
selection, and two §24 baselines (the fit tier's size and the cold-open targets).
Calibration and scale are measured in PDF points as legacy's (D-51). §3's platform-admin
line has its on-screen half (F5-S18).

**The proof backlog (overnight 2026-09-26).** Every line then marked **ported** and not
ticked (15 of them) was driven by `intelcost-infra/browser/proof-backlog.mjs`, with no
change to the app. **Nine passed and are ticked**: lock, analytic quantities, override,
the shape_meta invariant, pan, select, calibrate, tools disabled until a scale, and
space-drag. **Six did not, and their status is corrected** on the line with what was
found: the sheets panel's current row (partial), creating an item with a classification
(partial), layers' show and hide and the last-layer rule (partial), Count placing marks
into one item (partial; three clicks made three items all named alike), zoom to 3000%
(partial; the ceiling is 800%), and deduct pairing (missing: there are no deducts). No
line is now marked **ported** without being ticked.

No section beyond 1 to 5 has been verified, except the F8 and proof-backlog lines just
named, so an unticked line elsewhere means what its status says and nothing more.

**Scope.** Derived from `src/App.tsx` routes, every component under
`src/components/` and page under `src/pages/`, the 292 shipped plan files in
`.lovable/plan/`, the 20 live edge functions, and `docs/BACKEND-RETIREMENT.md`.
Anything under `src/retired/` (173 files), any route listed in
`src/config/hiddenSurfaces.tsx`, and the 29 functions in
`supabase/functions/_retired/` are **out of scope** and are not listed. So are the
marketing routes (`/`, `/features`, `/trades`, `/pricing`, `/customers`, `/privacy`,
`/terms`), which left for `intelcost-market-next` under D-02.

**Two caveats on the statuses.** First, they are read from source in the new repos,
not driven in a browser. Treat **ported** as "the code is there", and tick the box
only after the bench proves it. Second, `intelcost/` is the behaviour reference but
its structure is not the target (D-11), so a missing line is a behaviour to
reproduce, never a file to copy.

---

## Live route map

The routes that survive `hiddenSurfaces.tsx` and are not marketing:

| Route | Page | Surface |
|---|---|---|
| `/login` `/signup` `/forgot-password` `/reset-password` | `Login` `Signup` `ForgotPassword` `ResetPassword` | Auth |
| `/invite/:token` | `AcceptInvite` | Auth, Permissions |
| `/app` | `Dashboard` | Projects dashboard |
| `/projects/:id` | `ProjectDetail` mounting `ProjectHome` | Project Home |
| `/projects/:id/takeoff` | `ProjectTakeoff` (16,120 lines) | Takeoff, Estimating, Earthwork, Markup, Community |
| `/projects/:id/sheets/:sheetId/viewer` | `SheetViewer` | Takeoff (read-only viewer) |
| `/settings/workspace` | `WorkspaceSettings` | Workspace settings, Permissions |
| `/library` | `Library` | Library |
| `/reports` | `Reports` | Reports |
| `/s/:token` | `GuestProject` | Sharing |
| `/community` `/community/:section` `/community/:section/:postId` | `Community` `CommunityPost` | Community |
| `/platform/activity` `/platform/ai-economics` `/platform/billing-tiers` | three `Platform*` pages behind `PlatformRoute` | Platform admin |
| `/.lovable/oauth/consent` | `OAuthConsent` | Auth |
| `/files` `/takeoff` | redirect to `/app` | Projects dashboard |
| `*` | `NotFound` | |

The takeoff page carries six workspace tabs: **Takeoff**, **Earthwork**,
**Estimating**, **Collaborator**, **Community**, **Estimate**
(`src/components/takeoff/Toolbar.tsx`).

---

## 1. Auth

- [x] Sign in with email and password, landing on the app. `src/pages/Login.tsx` · **ported** (F2 close-out, driven on the bench. The landing route is `/`, not legacy's `/app`: this app is served from its own host, so the prefix legacy needed to share one is gone.) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A `?next=` parameter is honoured only when it is a same-origin relative path, so an open redirect is impossible. `src/core/utils/safe-next.ts`, `src/pages/Login.tsx` · **ported** (F2-S1; the backslash form `/\evil.com` is rejected too, which legacy's two tests let through) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A `?invite=` parameter on sign-in sends the user to the invitation instead of the dashboard, and takes precedence over `?next=`. The route is `/accept-invite?token=`, not legacy's `/invite/:token`; parity is the behaviour, not the URL. `src/pages/Login.tsx` · **ported** (F2-S2) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A network failure is reported differently from a bad password, and names the usual cause (ad blocker, privacy extension, stale session). `src/core/api/client.ts`, `src/features/auth/components/AuthFormError.tsx` · **ported** (F2-S3; a typed `NetworkError` rather than legacy's regex over the browser's error text) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] ~~"Clear cached session" signs out locally, sanitises auth storage and reloads, for a user wedged by a corrupt token.~~ `src/pages/Login.tsx`, `src/integrations/supabase/bootstrap.ts` · **retired** (D-17: a workaround for corrupted Supabase tokens, which D-03 removed. Not ported. The single clearing point it would have called, `clearTokens()`, already exists and is what F8 closes the socket from.)
- [x] Sign up with full name, email, password and optional job title. `src/pages/Signup.tsx`, `src/core/auth/session.tsx` · **ported** (F2-S14; the line read ported before the field existed. The api had accepted `job_title` since the first migration and nothing sent one, so the column was written by the seed script alone. Blank stays NULL rather than becoming an empty string.) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Signup is pre-checked against disposable and burner mailboxes and refused with "Use a permanent email address" **at every tier** (D-19 supersedes legacy's tier-3-only rule), and every layer of the check fails open. The tier resolved at signup is recorded and stamped onto the workspace (D-18). `app/features/auth/tier.py`, `app/features/billing/models.py`, tables `disposable_email_domain`, `billing_country_tier`, `billing_tier_rule` · **ported** (F2-S5) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Signing up with an address that already exists routes to `/login?email=` rather than failing opaquely, carrying `invite` and `next` with it. The address is prefilled and the password focused; the "already registered" claim itself rides in history state, never the query, so a hand-written URL cannot make the page assert an account exists. `src/pages/Signup.tsx`, `src/pages/Login.tsx` · **ported** (F2-S6) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A failed signup step leaves no orphaned account, so the address stays usable. `app/features/auth/service.py`, `app/core/routing.py`, `src/pages/Signup.tsx` · **ported by construction** (F2-S7: register is one transaction committed after the handler returns, so legacy's cleanup function has nothing to clean and is not ported. The orphan that can still form is one step along, an account with no seat after a failed accept: the signup screen now holds that state, names it, and retries the accept alone. Accepting twice answers with the workspace rather than a 409, so a lost reply cannot dead-end.)
- [x] The signup page shows the regional trial length ("14 days free. No card required.") resolved from the visitor's billing tier, and copy with **no number** whenever the lookup did not land. `app/features/auth/routes.py` (`GET /api/auth/trial-length`), `src/features/auth/hooks/use-trial-length.ts`, `src/pages/Signup.tsx`, tables `billing_country_tier`, `billing_tier_rule` · **ported** (F2-S8; one resolver serves both this and signup, so the advertised length and the granted one cannot drift. Legacy's precheck-agreement clause is satisfied by construction rather than ported.) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Reaching signup with `?invite=` previews the workspace in place: the heading names it, the subtitle names the inviter and the role, the email field is locked to the invited address, and the button names the workspace. No bounce to `/invite/:token`, which is what legacy does and what makes its own preview unreachable (F2-S9). `src/pages/Signup.tsx` · **ported** (F2-S9; the divergence is deliberate and is the better behaviour. The button truncates a long name and never the verb, and carries a real space between the two so the accessible name is not "join{workspace}".) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Forgot password sends a reset link and always answers "If that address has an account…", so the form cannot enumerate addresses. `src/pages/ForgotPassword.tsx`, `app/features/auth/routes.py` · **ported** (F2 close-out; driven with a registered and an unregistered address, whose answers are character-for-character identical. The api answers 202 either way.) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Reset password requires a length and a matching confirmation, then ends every session. `src/pages/ResetPassword.tsx` · **ported** with two deliberate divergences (F2 close-out). **Ten characters, not eight** — estimators share machines on site; the consequence for migrated accounts is on F17. **It does not sign the user in**: a reset revokes every session, so the screen says so and offers sign-in rather than pretending to a session it just destroyed. There is no recovery event to wait for either, since the token is a query parameter (see F2-S10). · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A dead reset link says "Link invalid or expired" with a path to request a new one, **before** the form is drawn. `app/features/auth/routes.py` (`GET /api/auth/password/reset/{token}`), `src/pages/ResetPassword.tsx` · **ported** (F2-S10; legacy's 2500ms timeout state was an artifact of the recovery session arriving in a URL hash and is deliberately not ported. The check reads and never spends, and the submit-time refusal is kept, because a link can be spent in another tab in between.) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Accepting an invitation previews the workspace and role, and reports expired, revoked and already-accepted links distinctly. `src/pages/AcceptInvite.tsx`, `app/features/workspace/service.py` · **ported** (F2 close-out; all three refusals driven and confirmed to be three different sentences, the expired one by ageing the row in psql. The route is `/accept-invite?token=`, not `/invite/:token`; parity is the behaviour, not the URL.) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] An invitee with no account creates one from the invitation and joins in a single step. `src/pages/AcceptInvite.tsx`, `src/pages/Signup.tsx` · **ported** (F2 close-out; driven end to end from the invitation link to a seated member. The account and the seat are two api calls, and F2-S7 owns what happens when the second one fails.) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] An invitee who already has an account signs in below the invitation and joins on submit. `src/pages/AcceptInvite.tsx` · **ported** (F2 close-out; driven. The address is fixed by the invitation and cannot be edited, because a forwarded link must not seat whoever opens it.) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] ~~The OAuth consent screen grants a third party access to the account.~~ `src/pages/OAuthConsent.tsx` · **retired** (D-15: a Lovable platform artifact, not a product feature. Not ported.)
- [x] Every page sets its own `document.title`. `src/core/hooks/use-document-title.ts`, `src/features/auth/components/AuthLayout.tsx`, `src/components/settings-layout.tsx`, `src/pages/*.tsx` · **ported** (F2-S12; called from the two layouts rather than from each page, because the heading a layout already renders is the title. Every route sets one, since a hook that restores nothing leaves a silent page wearing the last one's name.) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] An unknown URL renders the 404 page rather than a blank screen. `src/pages/NotFound.tsx` · **ported** (F2 close-out; driven, and the page measured rather than merely read, since "blank" is the failure being ruled out.) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A bundle that no longer exists recovers instead of white-screening, reloading **at most once**. `src/core/boot/stale-chunk.ts`, `src/main.tsx` · **ported** (F2-S13; the recovery without the code splitting, which the app does not have and which D-11 says is not auth's decision to make. The one-reload guard holds even where `sessionStorage` is refused, which legacy's does not.) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*

## 2. Workspace settings

`/settings/workspace`, eleven tabs. `src/pages/WorkspaceSettings.tsx` (639 lines).

- [x] **General.** Rename the workspace and set the licence number and default address. `src/pages/WorkspaceSettings.tsx` · **ported** (F3-S10) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **General.** Upload a workspace logo (PNG, JPG, SVG, WebP, max 2 MB), replace it, or remove it, with a separate message per rejection reason. `src/pages/WorkspaceSettings.tsx`, bucket `workspace-logos` · **ported** (F3-S10; the column is `logo_key` and holds an S3 key, presigned per response) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Project Setup.** Choose which classification systems the workspace uses (CSI MasterFormat, UniFormat, NRM 1, NRM 2, CESMM). At least one must stay on. `src/components/workspace-settings/ClassificationSystemsCard.tsx` · **ported** (F6-S10, D-58, `f6-d` step 3: Settings → Classification lists all five, on; unchecking every one says "At least one system must remain enabled." and greys Save; the api refuses none, 409 "Pick at least one classification system", and an unknown key, 422; NRM 2 off survives a reload; a seat without Manage classification reads, and is refused 403) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Classification.** Browse a system's divisions, add a division, add a scope and a sub-scope under it, rename and delete. "This one is in use" refuses a delete that would orphan items. `src/components/workspace-settings/ClassificationTab.tsx` (524 lines), table `workspace_classifications` · **ported** (F6-S11, `f6-d` steps 4 and 7: "System:", Division and Scope columns, "DIV 03 — Concrete"; "+ Add division", "+ Add scope", "Add sub-scope" (codes 99.01, 99.01.01, the next free one), Rename (the folders made from it follow); a node with two things filed under it: "This one is in use", "2 folder(s) or measurement(s) are filed under …", "Archive instead", and the api's 409; an unused one: `Delete "Studs"?`, "Delete permanently". A second window shows a new division without a reload, beyond legacy) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Classification.** Archive a code instead of deleting it, and toggle "Show archived" to see archived rows. `src/components/workspace-settings/ClassificationTab.tsx` · **ported** (F6-S12, `f6-d` step 7: archived leaves the tree and the picker, a new filing into it is refused, the item already filed keeps its classification; "Show archived" shows it faded; Restore) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Classification.** A duplicate code is refused with "That code already exists in this system." `src/components/workspace-settings/ClassificationTab.tsx` · **ported** (F6-S13, D-58, `f6-d` step 4: on the field, ignoring case, in Settings and the picker alike; the same code in UniFormat is accepted) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Classification.** Seed a workspace from the CSI default template on first use. `supabase/functions/load-csi-template/`, `src/lib/takeoff/classification/seed.ts`, table `csi_divisions` · **ported** (F6-S13, D-58, `f6-d` steps 2 and 8: legacy's five templates verbatim, CSI 1,833, UniFormat 635, NRM 1 401, NRM 2 361, CESMM 254, and the 54 default subcontractors with their packages, seeded the first time a system is read or turned on; read twice, never doubled; a deleted seeded division never comes back) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] **Members.** List members with role, shift and last activity. `src/components/share/WorkspaceUsersTab.tsx` · **partial** (F3-S11 ships role and last activity; there is no shift column because there is no shifts feature → **F15**)
- [x] **Members.** Invite by email with a role, copy the invite link, resend with a fresh link, or revoke. `src/components/share/WorkspaceUsersTab.tsx`, table `workspace_invitations` · **ported** (invite, resend, revoke F2-S2; the link per **D-24**, shown once at creation and re-minted only by an explicit act, F3-S11) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Members.** Change a member's role, or remove them from the workspace. `src/components/share/WorkspaceUsersTab.tsx` · **ported** (F2-S2 for the last-owner invariant, F3-S11 for the rest) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Roles & Permissions.** A matrix of every role against every capability. Click a cell to grant or remove. `src/components/share/RolesMatrixTab.tsx`, `src/lib/permissions/capabilities.ts` · **ported** (F3-S5; three capabilities are shown and locked against editing per **D-25**) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Roles & Permissions.** Create a workspace-defined custom role from a base role, label it, edit its capabilities, and delete it when no member holds it. `src/components/share/RolesMatrixTab.tsx`, table `workspace_custom_roles` · **ported** (F3-S7; a custom role IS its map, a deliberate divergence from legacy's fallback — see the spec) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Roles & Permissions.** Edit a built-in role's capabilities for this workspace only. The cell is flagged "Edited for this workspace". `src/hooks/useWorkspaceRoleOverrides.ts`, table `workspace_role_overrides` · **ported** (F3-S6; the stored map is sparse so a capability added later still falls back to the role default) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Ownership.** Transfer ownership to a chosen member, queue a transfer to an invitee who has not joined yet, and cancel a queued transfer. `src/components/workspace-settings/OwnershipTab.tsx`, rpc `transfer_workspace_ownership`, table `workspace_pending_ownership_transfers` · **ported** (F3-S9) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Statuses.** Create, rename, reorder, hide and delete project statuses. Deleting one asks which status its projects move to. `src/components/workspace-settings/StatusesTab.tsx`, table `workspace_project_statuses` · **ported** (F4-S3, `f4-s3`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Statuses.** Configure the dashboard tab strip: add a tab, rename, move up or down, remove. `src/components/workspace-settings/StatusesTab.tsx`, tables `workspace_status_tabs`, `user_status_tab_prefs` · **ported** (F4-S4, `f4-s4`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] **Shifts.** Create a named shift with working days and hours, edit it, delete it, and set a per-role default shift. `src/components/workspace-settings/ShiftsTab.tsx`, `ShiftDialog.tsx`, tables `workspace_shifts`, `workspace_role_default_shifts` · **missing** → **F15**
- [ ] **Time Tracking.** Choose automatic app-use tracking or a manual clock in and out, set the idle threshold, and choose whether time reports are visible to admins only or to everyone. `src/components/workspace-settings/TimeTrackingTab.tsx`, table `workspace_report_settings` · **missing** → **F15**
- [ ] **Time Tracking.** Turn on comparison against the member's shift schedule. `src/components/workspace-settings/TimeTrackingTab.tsx` · **missing** → **F15**
- [ ] **AI Credits.** Show the workspace wallet balance, buy a top-up pack through Stripe, and land back with the pack credited. `src/components/workspace-settings/AiCreditsTab.tsx`, `supabase/functions/create-topup-checkout/`, tables `workspace_wallet`, `ai_credit_packs`, `credit_ledger` · **missing** → **F14** (the wallet) and **F16** (the checkout)
- [ ] **AI Credits.** Set a workspace-wide credit limit and a per-member limit, and return a member to the workspace default. `src/components/workspace-settings/AiCreditsTab.tsx`, table `workspace_user_credit_limits` · **missing** → **F14**
- [x] **Subcontractors.** Maintain the workspace subcontractor list and assign classification scopes to each. `src/components/workspace-settings/SubcontractorsTab.tsx`, tables `workspace_subcontractors`, `workspace_subcontractor_scopes` · **ported** (F6-S15, `f6-d` step 9: Settings → Subcontractors, legacy's words; add, rename, delete with `Delete "…"? Scopes packaged to it become Unassigned across the workspace. …`; a scope packaged at any level, "Search classifications…", "Show legacy"; a child reads "Inherit (Fixture Glazing)" and "(inherited from Fixture Works)". The per-project overrides are Estimating's, F9) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Trash.** List soft-deleted projects, restore one, permanently delete one, and show "Permanently deleted in N days", or "at the next daily purge" once a project is past its 30 days. `src/components/workspace-settings/TrashTab.tsx`, rpcs `restore_project` and `purge_project_now` · **ported** (F4-S26, `f4-s26` and `f4-s27.sh`; gated on `canRestoreDeletedItems` per **D-26**. A permanent delete removes the rows at once, as legacy's did, and its storage right after the commit rather than at night. Corrected at close-out: the purge sentence belongs to a project past its window) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Trash.** A nightly job hard-deletes projects soft-deleted 30+ days ago, retrying storage deletions that failed on an earlier run. `supabase/functions/purge-trashed-projects/`, table `trash_purge_log` · **ported** (F4-S27, `f4-s27.sh`: two passes, retry then purge, a dry run, a log row per project, unfinished uploads aborted, and a storage outage retried on the next run. Driven on the bench's `beat`; production scheduling is Abdullah's, **D-11**) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Activity.** An audit feed of who did what in the workspace. `src/components/workspace-settings/ActivityTab.tsx`, rpc `log_audit_event`, table `audit_log` · **ported** (F3-S12; the row rides the act's own transaction, the one place **D-20** deliberately does not apply) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*

## 3. Permissions

Nine roles: `owner`, `admin`, `estimator`, `takeoff`, `pricing`, `qa_takeoff`,
`qa_pricing`, `collaborator`, `viewer`. Twenty-five capabilities.
`src/lib/permissions/capabilities.ts`, `src/hooks/usePermissions.ts`.

- [x] Every screen asks `can('<capability>')` rather than testing a role, so a custom role behaves like a built-in one everywhere. `src/hooks/usePermissions.ts` · **ported** (F3-S1, F3-S3; `require(*roles)` and `can_write` were deleted, so a role test is no longer available to write) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Capability resolves as role default, then workspace override, then custom role, then masked by the plan, then masked by the trial. `src/hooks/usePermissions.ts`, `src/lib/billing/planCapabilities.ts`, `src/lib/billing/trialLimits.ts` · **ported** (F3-S2; one `resolve()` in `app/features/workspace/capabilities.py`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A capability added after a workspace saved its override falls back to the role default rather than reading as denied. `src/hooks/usePermissions.ts` · **ported** (F3-S2; the stored override map is sparse and an absent key means undecided, never denied) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Workspace admin (`owner` or `admin`) and platform admin (Intelcost staff) are separate answers that never mix. `src/hooks/usePermissions.ts`, rpc `is_platform_admin` · **ported** (F3-S4, **D-23**; platform admin is a capability gate in the same layer, not a role. ~~**One criterion carried to F5:** a platform admin's unmasked capabilities are not yet visible on a screen, because no control calls `can()` until F5~~ **Closed by F5-S18, 2026-09-27:** takeoff's measure tools ask `can("canEditTakeoff")`, and `f5-s18` drives a platform admin measuring in a workspace whose trial has expired, where its owner and a viewer see the tools off and the api refuses them) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Only the owner can grant the owner role, and only through a transfer. `src/lib/permissions/capabilities.ts` · **ported** (F3-S9; `canGrantOwnerRole` is locked in the matrix per **D-25**, so no override and no custom role can hand it out) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A role or permission change reaches an open tab live, with no reload. `src/hooks/usePermissions.ts` · **ported** (F3-S8 on focus; **live since F8-S15**: a role change, an override and a custom role each reach an unfocused tab within a second, `f8-s15`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] "Can the user do this" and "is the feature shipped" stay separate gates, the second being a feature flag. `src/hooks/useFeatureFlag.ts`, table `feature_flags` · **ported** (F3-S13; two calls, two answers, ANDed only where a control is drawn, and the two refusals read differently) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A `collaborator`-plan workspace loses the measure tools and keeps the markup tools. `src/lib/billing/planCapabilities.ts`, `src/components/takeoff/Toolbar.tsx` · **ported** (F3-S2 — **the mask is built and driven at module level, and no workspace can reach it end to end**: the plan reads a constant `pro` until **F16** supplies a real value, and there are no measure tools to lose until F5. Re-drive this line in F16) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Platform-internal routes render the 404 page for a non-platform user, so internal tooling is invisible to customers. `src/components/route-guards/PlatformRoute.tsx` · **ported** (F3-S4; `RequirePlatformAdmin` renders `<NotFound/>`, anonymous callers included) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*

## 4. Projects dashboard

`/app`. `src/pages/Dashboard.tsx` (779 lines).

- [x] List the workspace's projects ~~as cards~~ as rows: name, project type, updated date, primary assignee +N, follow-up, status changer, takeoff and trash, fifty at a time. `src/pages/Dashboard.tsx` · **ported** (F4-S5, `f4-s5`; corrected at close-out: legacy lists rows, not cards) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Create a blank project, ~~choosing which seed folders it gets~~ always seeded with Plans, Specs, Reports and Site Photos, optionally uploading files in the same step; the drop zone ("Unsorted" in legacy) uploads to the project root. `src/components/projects/BlankProjectDialog.tsx`, rpc `create_blank_project` · **ported** (F4-S7, `f4-s7`; corrected at close-out: legacy never let you choose, and "Unsorted" is the root, not a folder. Every project gets the four, **D-31**) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] ~~Create a project from a folder on the computer, preserving the folder tree on upload.~~ `src/components/projects/NewProjectFromFolderDialog.tsx` · **retired** (**D-31**: New project is the one way to start a project. A folder goes into a project, tree preserved, through the file browser's Upload folder, F4-S17. `f4-s8` proves the button is gone)
- [x] A failed upload inside project creation offers Retry without losing the project. `src/components/projects/NewProjectFromFolderDialog.tsx` · **ported** (F4-S7 AC5, `f4-s7`: after **D-31** this is New project's Retry, which resumes a half-sent file from the parts S3 already holds) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Filter projects by status tab, construction type, project type, estimator, labor pricing basis, wage determination and trade scope, and by GC, created from/to and bid due from/to. `src/components/projects/ProjectFiltersBar.tsx` · **ported** (F4-S11, `f4-s11`; corrected at close-out to name the GC and date filters legacy has; "estimator" matches the creator) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Change a project's status inline from its card, with a link to manage the status list. `src/components/projects/ProjectStatusChanger.tsx`, `ProjectStatusBadge.tsx` · **ported** (F4-S9, `f4-s9`, with the Lost reason dialog) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Assign a project to a member, seeing each candidate's role beside their name, and remove an assignee. `src/components/projects/AssignedToPicker.tsx`, table `project_assignees` · **ported** (F4-S10, `f4-s10`; each candidate's email shows under the name, and a chip adds it when two chosen members share a name, which legacy could not tell apart) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Open a project's takeoff directly from its card ("Perform takeoff"), beside the project name. `src/pages/Dashboard.tsx` · **ported** (F4-S13, `f4-s13`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Move a project to Trash from the dashboard, with "Project moved to Trash". `src/pages/Dashboard.tsx`, rpc `soft_delete_project` · **ported** (F4-S15, `f4-s15`; owner and admin only, per **D-26**) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Edit project details (name, client, address, attributes, plans-dated) ~~without leaving the dashboard~~ from Project Home. `src/components/projects/EditProjectDetailsDialog.tsx` · **ported** (F4-S14, `f4-s14`; corrected at close-out: legacy's Edit details is on Project Home only) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A follow-up badge marks projects needing attention. `src/components/projects/FollowUpBadge.tsx` · **ported** (F4-S12, `f4-s12`; computed by the api so every client agrees) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] `/files` and `/takeoff` redirect to `/app`, so old bookmarks land somewhere useful. `src/App.tsx` · **ported** (F4-S16, `f4-s16`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Browse, create, rename, move and delete project folders and files, upload a whole folder, and download a file. `src/components/files/UnifiedFolderBrowser.tsx` (1,396 lines), buckets `project-files`, `project-takeoff` · **ported** (F4-S17, `f4-s17`; one file model, multipart uploads, **D-27**. Like legacy's, the browser has no drag and drop) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A folder cannot move into its own descendant, and a file cannot move between projects. `src/components/files/UnifiedFolderBrowser.tsx` · **ported** (F4-S18, `f4-s18`; refused in the dialog and in words by the api) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Each folder shows a count of what it holds. `src/components/files/FolderCountBadge.tsx` · **ported** (F4-S19, `f4-s19`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Files drop onto a zone at the top of ~~the browser~~ the New project dialog, with a steady upload progress bar rather than one that jumps. `.lovable/plan/add-files-drop-zone-on-top-steadier-upload-bar-2026-09-23.md` · **ported** (F4-S7, `f4-s7`; corrected at close-out: legacy's zone is in the dialog) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] ~~The dashboard panels are arranged in a fixed order~~, with the tab strip centred and no Customize tabs button. `.lovable/plan/reorganize-dashboard-panels-2026-08-29.md`, `.lovable/plan/remove-customize-tabs-button-center-the-dashboard-tab-strip-2026-08-29.md` · **ported** (F4-S6, `f4-s6`: the centred strip with no Customize tabs button. The panel order is **retired** by **D-31**: the dashboard shows projects only, with members and invitations in Settings > Members and branding in Settings > General) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] The workspace ruler button behaves like Perform Takeoff. `.lovable/plan/make-the-workspace-ruler-button-behave-like-perform-takeoff-2026-08-29.md` · **ported** (F4-S13, `f4-s13`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] The assignee dropdown shows each candidate's role next to their name. `.lovable/plan/show-role-next-to-assignee-name-in-the-assigned-to-dropdown-2026-08-29.md` · **ported** (F4-S10, `f4-s10`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*

## 5. Project Home

`/projects/:id`. `src/pages/ProjectHome.tsx` (349 lines), mounted by
`src/pages/ProjectDetail.tsx`.

- [x] Show the project header with name and status, and the Perform Takeoff and Estimating entry points beside the name. `src/pages/ProjectHome.tsx` · **ported** (F4-S20, `f4-s20`; Estimating is shown disabled with its reason on the page until F9 builds the tab) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Edit the project location inline, with address fields. `src/components/projects/ProjectAddressFields.tsx` · **ported** (F4-S21, `f4-s21`; split at close-out, as the spec planned: the inline editor never had a map) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Show a map of the project address. `ShowMapPopover.tsx` · **missing** → **P-17**, deferred by **D-28** (split from the line above at F4 close-out; legacy's "Show Map" is in the create and edit dialogs and never showed a map, because its geocoder returned no coordinates)
- [ ] Resolve a US street address to city, state, zip and county through the geocoder. `supabase/functions/geocode-address/` · **missing** → **P-17**, deferred by **D-28** (legacy's geocoder never returned coordinates)
- [x] Set "Plans Dated" from the same date picker the dashboard filters use. `src/components/projects/PlansDatedField.tsx` · **ported** (F4-S23, `f4-s23`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Write project notes and a scope of work in a rich-text panel (bold, italic, lists, quote, link), saved inline. `src/components/projects/ProjectTextPanel.tsx`, `src/lib/richtext/` · **ported** (F4-S24, `f4-s24`; cleaned in the browser and again by the api, capped at 50,000 characters) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Set project attributes: construction type, project type, labor pricing basis, wage determination. `src/components/projects/ProjectAttributeFields.tsx` · **ported** (F4-S14, `f4-s14`, in Edit details) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Assign the project to a member from the header. `src/components/projects/AssignedToPicker.tsx` · **ported** (F4-S10, `f4-s10`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] ~~Upload drawings and watch them become sheets.~~ Files uploaded to the project become takeoff sheets from takeoff. `src/pages/ProjectHome.tsx` · **ported** (F5 Block B, 2026-09-26: the Sheets block is gone from Project Home, driven by `f5-s9`; drawings go in through Files and load from takeoff) (re-worded at F4 close-out: legacy Project Home does not make sheets. The Sheets block with Upload drawings stays only as the bench's temporary path into takeoff, driven by `f4-s25`. **F5 replaces it** with the legacy "Load project files into takeoff" flow; see §7's Add sheets line) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A project id that does not resolve shows "Project not found" rather than an empty shell. `src/pages/ProjectHome.tsx` · **ported** (F4-S20, `f4-s20`; a page with a way back, where legacy toasted and redirected) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*

## 6. Sharing

- [x] Open the Share dialog from the project header. `src/components/share/ShareDialog.tsx` · **ported** (round 4 B7, D-99; `features/takeoff/share/ShareDialog.tsx`, before the theme toggle, legacy's three tabs in order) · *MCP smoke 2026-09-29*
- [x] **Workspace users tab.** Invite, copy link, resend, revoke, change role, remove, all from inside the project. `src/components/share/WorkspaceUsersTab.tsx` · **ported** (round 4 B7, D-99: the Members screen itself inside the dialog, `SettingsEmbedded`) · *MCP smoke 2026-09-29*
- [x] **Project users tab.** Give a workspace member access to this project only, and remove them from it. `src/components/share/ProjectUsersTab.tsx` · **ported** (round 4 B7, D-99: legacy's tab is `project_assignees`, labelling not access, in its words; our assignee picker; the link block above it is the line below) · *MCP smoke 2026-09-29*
- [x] **Roles matrix tab.** Reach the capability matrix from the share dialog. `src/components/share/RolesMatrixTab.tsx` · **ported** (round 4 B7, D-99: the Roles screen inside the dialog) · *MCP smoke 2026-09-29*
- [ ] Issue a public share link that anyone can open without an account. `src/components/share/ShareLinkBlock.tsx`, `src/hooks/useProjectShareLink.ts`, table `project_share_links` · **missing**
- [ ] Put a password on a share link, or clear it. rpc `set_share_password` · **missing**
- [ ] Scope a share link to all layers or to one layer. `src/components/share/ShareLinkBlock.tsx` · **missing**
- [ ] Rotate a share link, killing the old URL. `src/components/share/ShareLinkBlock.tsx` · **missing**
- [ ] A guest opens `/s/:token`, enters the password if one is set, and views the project read-only. `src/pages/GuestProject.tsx`, `supabase/functions/guest-project/` · **missing**
- [ ] A guest sees "This share link has expired." or "This share link is no longer available." rather than an error. `src/pages/GuestProject.tsx` · **missing**
- [ ] The guest endpoint is read-only by construction: the only surface an unauthenticated visitor can reach, hard-scoped to that link's project, with no write routes. `supabase/functions/guest-project/` · **missing**
- [ ] The owner is told when a share link is opened. `src/hooks/useShareBeacon.ts` · **missing**

## 7. Takeoff sheets panel

`src/components/takeoff/SheetTree.tsx` (2,644 lines).

- [x] List every sheet in the project as a tree of drawing folders, with an "Unfoldered" group. `src/components/takeoff/SheetTree.tsx`, tables `drawing_folders`, `drawing_sheets` · **ported** (F5 Block D, `f5-s13` AC1: nested under the folders mirrored from the project's files; a sheet in no folder sits "At root", legacy's own replacement for its retired "Unfoldered" group) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Search sheets by name and number, clear the search, and have the search follow the configured naming format. `src/components/takeoff/SheetTree.tsx` · **partial** (F5 Block D, `f5-s13` AC2: number, name and the names of the items on a sheet, "Clear search", No sheets match; the naming-format setting is not ported, so the label is legacy's default)
- [x] Click a sheet to open it on the canvas. The current row is highlighted in blue. `src/components/takeoff/SheetTree.tsx` · **ported** (F5 Block D, `f5-s13` AC1: the highlight follows the click) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Multi-select sheets with ctrl-click and shift-click range selection, and act on the whole selection. `src/components/takeoff/SheetTree.tsx` · **ported** (F5 Block D, `f5-s14` AC4: the selection's menu bookmarks, moves and deletes all of them; its print, duplicate and auto-name wait for their features) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Right-click, or the three-dot row menu, opens the page actions: open, open in new tab, preview window, rename, bookmark, duplicate, rotate, print, move to folder, delete. `src/components/takeoff/SheetTree.tsx` · **partial** (F5 Block D: both menus open with Properties (rename) and the bookmark; move and delete on a selection; the rest belong to F7, F11 and F12, as "Not in F5" names)
- [x] Rename a sheet by double-clicking its row. `src/components/takeoff/SheetTree.tsx` · **ported** (F5 Block D, `f5-s14` AC1: "A-101" and "Sheet name", Save; a second window follows within a second) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Auto-name a sheet by reading its title block with OCR. `supabase/functions/ocr-sheet-titleblock/` · **missing**
- [ ] Name a sheet from a page region the user drags, including applying it across a range of pages. `src/components/takeoff/NameFromRegionDialog.tsx`, `src/lib/takeoff/naming/` · **missing**
- [ ] Create, rename and delete drawing folders and subfolders, and move a folder. A non-empty folder refuses deletion with "Move or remove its contents first". `src/components/takeoff/SheetTree.tsx` · **missing**
- [x] Reorder pages by dragging in List view, with a hint when the current view cannot reorder. `src/components/takeoff/SheetTree.tsx`, `src/lib/takeoff/sheetOrder.ts` · **ported** (F5 Block D, `f5-s14` AC2: within a folder, persisted in one write; Thumbnails says "Switch to List view to reorder pages") · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Bookmark a page and remove the bookmark, with bookmarks listed in their own panel. `src/components/takeoff/SheetTree.tsx`, `src/components/takeoff/EvidencePanel.tsx` · **partial** (F5 Block D: bookmark and remove, one sheet or a selection, the star on the row; D-77, 2026-09-28: the Bookmarks pane under the Sheets panel lists them with Open sheet and Remove bookmark, *smoke-tested (D-70)*; its Duplicate, Print, Open in new tab, Sheet properties and Preview window wait for their owners)
- [ ] Each sheet row carries status chips for scale, takeoff and markup. `src/components/takeoff/SheetTree.tsx` · **partial** (F5 Block D, `f5-s13` AC3: the scale chip and the item count; markup has no chip until markups exist)
- [x] A sheet row with measurements has a chevron, "Show items on this sheet" / "Hide items on this sheet", listing its items under it, each with its colour, name and **this sheet's** quantity (a count counts marks on an unscaled sheet); a click selects the item and opens that sheet; selecting an item opens the sheets carrying it, and a search on an item's name opens its sheets. `src/components/takeoff/SheetItemList.tsx`, `SheetTree.tsx` · **ported** (F5 follow-up (a), the founder's finding of 2026-09-27, D-53, `f5-sheet-items` AC1, AC2, AC4, live on a scale change and a new item. The row's kebab, inline rename, eye and multi-select come with F6-S9's shared item row) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] The panel's ⋮ menu: Default Expand Level (None, Page (Default), Page > Takeoff), Hide Search Box and Hide Takeoffs, remembered per browser and workspace. `src/components/takeoff/SheetTree.tsx` (`PanelPrefs`) · **ported** (F5 follow-up (a), `f5-sheet-items` AC3; Expand All, Collapse All and the naming items are not yet) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Show or hide the takeoff items marked on a sheet, from the row menu. `src/components/takeoff/SheetTree.tsx` · **missing**
- [x] Add sheets by loading project files into takeoff, choosing which pages to load before the load starts. `src/components/takeoff/AddSheetsDialog.tsx` (719 lines) · **ported** (F5 Block B, 2026-09-26: the dialog, From Project Files with its folder tree, Choose pages with the worker's thumbnails (D-41: the browser never reads the set, since IDM takes those reads; legacy drew them with pdf.js from the whole file), Load N pages, and Add sheets with loaded pages locked, driven by `f5-s5`, `f5-s6` and `f5-s8`; page counts by ranged reads, `f5-count`. Before: upload created a sheet per page; no page chooser. **F5 Block A, 2026-09-26:** the api half is built and driven by `f5-s1`: `POST …/drawing/load` makes a drawing per project file, mirrors its folders, makes only the chosen pages and never a skipped one, and refuses a non-drawing by name; the worker splits, thumbnails and fit-renders each page, `f5-s2`. The dialog is Block B). **F5 ports the legacy flow and replaces Project Home's Sheets upload block with it:** Perform Takeoff opens "Load project files into takeoff" with two tabs, From Project Files and Upload drawing. The user ticks folders and files from the project's existing files, then "Choose pages" shows every page as a thumbnail, all ticked, untick to skip, and "Load N pages" opens takeoff. It is asked only once per project; later additions go through Add Sheets. Drawings are made from project files (D-27). F5 also brings route-level code splitting (P-18), so pdf.js and the canvas load only on the takeoff route. · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Sheets can be PDF, PNG, JPG or TIFF. `src/components/takeoff/AddSheetsDialog.tsx`, `src/lib/takeoff/pdf/imageToPdf.ts` · **partial** (F5 Block B: PDF and PNG driven by `f5-s7`, a PNG one sheet at its own aspect; JPG and TIFF are accepted and counted by the same path but not yet driven)
- [x] Project files load into takeoff automatically on first open. `src/pages/ProjectTakeoff.tsx` · **ported** (F5 Block B, 2026-09-26: Perform Takeoff on a project with files and nothing loaded asks "Load project files into takeoff"; after Skip a refresh does not ask again, but the next Perform Takeoff does while nothing is loaded; once a page is loaded it opens that page; driven by `f5-s4`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Create a new blank page at a chosen width and height, or a new page from the clipboard image. `src/components/takeoff/NewPageDialog.tsx` · **ported** (D-97, round 3 C14: legacy's dialog and page sizes from the Sheets panel's + menu, the page made by the api (`POST …/drawing/sheet/new`) in the open sheet's folder; a pasted image is flattened on white, since pdf.js here has no JBIG2 decoder for a soft mask; *smoke-tested (D-70)*)
- [ ] Duplicate a page, named "(copy)", optionally carrying its markups. `src/components/takeoff/DuplicateSheetDialog.tsx` · **missing**
- [x] Rotate pages in bulk from the panel menu, by relative turn or absolute rotation, including "All pages + Landscape". `src/components/takeoff/RotatePagesDialog.tsx` · **ported** (P-20a, 2026-09-27, `p20a` 8/8: "Rotate Pages…" under Page layout; Which pages, Layout, Current rotation, the counts, Turn by and Set to, legacy's summaries; only changed pages written, "Rotated 2 pages"; stored in `view_rotation`, 45 refused 422, a viewer 403; the page turns by CSS as legacy's, so a run drawn turned is stored unturned and reads its true 60 LF; the windowed raster covers the view at 488%; the thumbnail turns; a second window on the other api turns in 356 ms, beyond legacy. The canvas menu's Rotate and Mirror are F7's) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Crop a dragged region into a new page. `src/components/takeoff/RegionSelectMenu.tsx` · **ported** (F7-S31, D-86: cropped on the api with PyMuPDF, text and linework kept; a new project file, its sheet "{name} (Crop)" after the last of the source's folder, uncalibrated; legacy's toasts; the new sheet opens) · *smoke-tested (D-70)*
- [ ] Open a sheet in a floating preview window, and in a second browser tab. `src/components/takeoff/SheetPreviewWindow.tsx` · **missing**
- [ ] Overlay another sheet on the current one (Standard or Comparative), tint it, set its opacity, re-align it, hide it and delete it. `src/components/takeoff/OverlayDialog.tsx`, `src/hooks/useSheetOverlays.ts`, table `sheet_overlays` · **missing**
- [ ] The panel's three-dot menu controls thumbnails, row style, view mode and which panels are shown. `src/components/takeoff/SheetTree.tsx` · **partial** (F5 Block D: List or Thumbnails, kept per browser and workspace; thumbnails fetched only in view, `f5-s13` AC4)
- [x] Collapse and expand the sheets panel from a centred edge tab, and resize it by dragging. `src/components/takeoff/PanelEdgeTab.tsx`, `src/hooks/usePanelLayout.ts`, table `user_panel_layouts` · **ported** (D-77, 2026-09-28: "Hide panels" on the canvas's left edge puts the Sheets column with Bookmarks and Snippets away; its separator resizes it, 140 to 520 px (D-97, round 3 C12: legacy stops at 180; the Takeoff panel goes to 160 px), kept in the browser as legacy's `takeoff-left-column-width-v1`; *smoke-tested (D-70)*)
- [ ] Sheet thumbnails render the sheet with its markups on it. `src/components/takeoff/SheetThumbImage.tsx`, `src/lib/takeoff/thumbnails/thumbMarkup.ts` · **missing**
- [ ] Step between sheets with a previous and next stepper. `src/components/takeoff/SheetStepper.tsx` · **missing**
- [ ] The read-only sheet viewer opens one sheet, fits, zooms, shows or hides markups, refetches them, and splits into two panes. `src/pages/SheetViewer.tsx` (641 lines) · **missing**
- [ ] Open a different project from inside the takeoff workspace. `src/components/takeoff/OpenProjectDialog.tsx` · **missing**
- [x] Deleting a folder in bulk takes its emptied subfolders with its sheets. `.lovable/plan/bulk-delete-emptied-folders-go-with-their-sheets-2026-08-03.md` · **ported** (F5 Block D, D-48: a sheet delete takes the folders it empties, deepest first, and the confirm names them) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Folders sort in a defined order and carry file counters. `.lovable/plan/folder-order-file-counters-2026-08-29.md` · **missing**

**Panel and row presentation**

Two panels, Sheets and Takeoff, share one row system. Twenty-four shipped plan
files tune it, and the shared look is the feature: a row that does not match its
sibling panel reads as a bug to an estimator.

- [ ] The Sheets panel header matches the Takeoff panel header, and both use squared corners. `.lovable/plan/sheets-panel-header-match-the-takeoff-panel-2026-08-13.md`, `.lovable/plan/square-off-panel-corners-match-sheets-header-to-takeoff-head-2026-08-13.md` · **missing**
- [ ] The Sheets panel row menus match the Takeoff panel's item menus. `.lovable/plan/sheets-panel-match-the-takeoff-panel-s-item-menus-2026-09-07.md` · **missing**
- [ ] Bookmark and snippet rows match the Sheets panel row style, and row lines run the full panel width in both. `.lovable/plan/match-bookmarks-snippets-rows-to-the-sheets-panel-row-style-2026-08-03.md`, `.lovable/plan/full-width-row-lines-in-sheets-and-bookmarks-snippets-2026-08-22.md` · **missing**
- [ ] Tree guide lines align under the expand chevron, with one dot spacing shared by both panels, and no guide line runs through the chevron itself. `src/components/takeoff/TreeGuides.tsx` · **missing**
- [ ] Item and sub-item row lines reach the row edge rather than stopping short. `.lovable/plan/fix-item-sub-item-row-lines-in-the-sheets-panel-don-t-reach-2026-09-03.md` · **missing**
- [ ] Parent and sub-item rows trim their left spacing to 6px while the guides stay put. `.lovable/plan/trim-left-spacing-on-parent-items-sub-items-6px-guides-stay-2026-08-21.md` · **missing**
- [ ] Unit columns and colour circles align vertically across the Sheets and Takeoff panels. `.lovable/plan/vertically-align-unit-columns-and-color-circles-across-sheet-2026-09-03.md` · **missing**
- [ ] A selected row is blue, a current sheet row does not read as a solid black block, the type icon fill lightens on a selected row, and a custom panel text colour never hides the text on a highlighted row. `src/components/takeoff/ItemRowShared.tsx` · **missing**
- [ ] The item row puts the type icon on the left and the colour dot on the right. `.lovable/plan/item-row-redesign-type-icon-left-color-dot-right-2026-08-20.md` · **missing**
- [x] Each item type has its own resume glyph. `.lovable/plan/per-type-resume-glyphs-2026-08-23.md` · **ported** (F7-S21, D-72: legacy's three glyphs, a Linear run picked up, an open area ring, a count's pending marker, on every Resume entry of the menus; the action group's Resume button is F7-S23's, the row's glyph P-21's) · *smoke-checked (D-68)*
- [ ] The sheet label separator, and the spacing around it, are set once and applied everywhere the label is drawn. `.lovable/plan/replace-sheet-label-separator-2026-08-23.md` · **missing**
- [ ] The count pill sits next to the folder name in the folder card section. `.lovable/plan/move-count-pill-next-to-folder-name-folder-card-section-only-2026-08-29.md` · **missing**
- [ ] The Sheets panel scrollbar starts below the search bar rather than beside it. `.lovable/plan/sheets-panel-scrollbar-starts-below-the-search-bar-2026-08-01.md` · **missing**
- [x] One centred collapse or show tab per panel side, resizable by dragging the edge tab. `src/components/takeoff/PanelEdgeTab.tsx` · **ported** (D-77, 2026-09-28: "Hide panels" and "Hide Takeoff panel", 16 by 3 units; the panels resize by their separators, as legacy's do; *smoke-tested (D-70)*)
- [ ] The panel options menu, and the layers UI, are visible against every theme. `.lovable/plan/fix-the-invisible-sheets-panel-options-2026-08-13.md`, `.lovable/plan/fix-layers-ui-is-invisible-everywhere-2026-08-13.md` · **missing**
- [ ] An unfoldered parent row never disappears from the tree. `.lovable/plan/fix-unfoldered-parent-row-disappears-entirely-2026-08-08.md` · **missing**
- [ ] Loading skeletons never render above sub-items. `.lovable/plan/fix-loading-sections-showing-above-sub-items-2026-08-23.md` · **missing**

## 8. Takeoff items

`src/components/takeoff/QuantityTable.tsx` (1,803 lines),
`ItemRowShared.tsx` (1,326 lines), `src/hooks/useTakeoff.ts` (2,405 lines).

- [ ] Create a takeoff item of type Area (SF), Linear (LF) or Point Count (EA), naming it, colouring it, and filing it under a classification and a custom folder. `src/components/takeoff/NewItemDialog.tsx` (717 lines) · **partial** (F6-S1, `f6-a`: picking the tool asks "Name this LF measurement", name, colour from the palette, Custom or Randomize, and a Custom Folder, then the drawing makes the item; Rough measurement files under Rough Measurements. Preset Classification files under the node's folders, F6-S14, `f6-d` step 5)
- [x] The Takeoff panel lists **every item in the project**, whatever sheet is open; an item measured on other sheets says "Also measured on: A-101, …"; legacy has no current-sheet filter (its layer filter and search are the filters). `src/components/takeoff/QuantityTable.tsx`, `ItemRowShared.tsx:201` · **ported** (F6-S9 AC0, the founder's finding (c) of 2026-09-27, D-54: `f6-c` step 3, Door on page 2 listed while page 1 is open, "Also measured on: Page 2", and its click opens page 2; the layer filter, step 7. Search comes with the next line) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Items list in a tree by folder, with a search box and "Unfiled (no folder)" for the unclassified. `src/components/takeoff/QuantityTable.tsx` · **partial** (F6-S9: nested folders with their counts, then Unfiled, Rough Measurements last, sub-items under their parent, `f6-c`; renaming Unfiled makes it a real folder holding the unfiled items, step 6. No search box yet)
- [ ] Group the tree by classification first or by layer first, and collapse or expand every level. `src/components/takeoff/QuantityTable.tsx` · **partial** (D-77, 2026-09-28: the header's "Collapse one level" and "Expand one level" walk sub-items, items and folders; grouping by classification first is not built)
- [ ] Manual expand and collapse always beats the automatic header ladder. `.lovable/plan/manual-expand-collapse-always-wins-over-the-header-ladder-2026-08-23.md` · **missing**
- [ ] Rename an item by double-clicking the row, and open Properties by double-clicking elsewhere on it. `src/components/takeoff/ItemRowShared.tsx` · **ported** (D-77, 2026-09-28, legacy's `ItemRow`: a single click selects, a double-click on the row opens Properties, two clicks within 450 ms count, a double-click on the name renames in place; *smoke-tested (D-70)*)
- [ ] The row menu offers: change colour, move to layer, create sub-item, manage sub-items, show or hide markup, show or hide sections, show or hide sub-items, delete on this sheet, delete everywhere. `src/components/takeoff/ItemRowShared.tsx` · **partial** (F6-S9, `f6-c` step 9; D-77, 2026-09-28: legacy's More actions (⋮) in its order, Properties, Override quantity, Duplicate, Move to layer, Create or Edit sub-items, Lock, Delete, and "Delete on this sheet" in the Sheets panel; the colour dot's popover changes the colour; the eye shows or hides the markup; *smoke-tested (D-70)*. Show or hide sections and sub-items per row are not built)
- [ ] Delete a single run or a single section of an item, rather than the whole item. `src/components/takeoff/ItemRowShared.tsx` · **partial** (a geometry DELETE route exists; no per-run or per-section UI)
- [x] Lock an item so it refuses edits, and unlock it again. `src/components/takeoff/SelectionContextMenu.tsx` · **ported** (driven: a locked item offers no edit and the api refuses one, 403; Unlock restores them; D-06 governs the unlock payload; proof-backlog, overnight 2026-09-26) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Multi-select items in the panel and act on all of them. `.lovable/plan/takeoff-panel-multi-select-matching-the-sheets-panel-2026-08-03.md` · **ported** (F6-S9, `f6-c` step 10: a click then Ctrl-click picks two, "2 selected — right-click for actions", Shift-click a range; the menu moves them to a folder, Unfiled or a layer, or deletes them; a drag of a row, or of the selection, onto a folder files it) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Convert an item to a rough measurement, and insert reference quantities into it. `src/components/takeoff/QuantityTable.tsx`, `.lovable/plan/rename-to-rough-measurements-insert-reference-quantities-in-2026-09-11.md` · **missing**
- [x] Quantities are analytic, never sampled, and are recomputed as geometry changes. `src/lib/takeoff/engine/engine.ts` (4,607 lines), `src/lib/takeoff/services/quantityService.ts` · **ported** (driven: a 0.2 x 0.2 square reads 1,600.00 SF, 2,400.00 after a vertex move, a triangle 800.00 exactly; proof-backlog, overnight 2026-09-26. F7-S2, D-61: rectangles, ellipses and circles (πab, Ramanujan II) and arcs (r·|sweep|) from their parameters on the api and in the browser, proved equal on 319 shapes, `f7-a` step 2; an Area circle of radius 10 ft reads 314.16 SF and still does after a reload, a Linear 10 × 20 ft rectangle 60 LF, a Linear circle 10 ft across 31.42 LF, step 3; the Sheets panel's per-sheet figure and a sub-item's `AREA_SF` read the same net area, step 4) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Override an item's quantity with a typed figure and a reason, and clear the override. `src/components/takeoff/OverrideDialog.tsx`, table `takeoff_items` · **ported** (driven: no save without a reason; the figure and reason shown; Clear returns the measured figure; proof-backlog, overnight 2026-09-26) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Named dimensions are present the instant Properties opens, and the name box fills the dialog width. `src/components/takeoff/DimensionField.tsx`, `src/lib/takeoff/dimensions/` · **ported** (F6-S3: they come with the item's own read, so Properties opens with them; `f6-a` step 9) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Add a dimension to an item (depth, height, thickness, pitch), with presets and free entry. `src/lib/takeoff/dimensions/dimensionPresets.ts`, table `takeoff_item_dimensions` · **ported** (F6-S3, `f6-a` step 9: "+ Depth" twice is Depth and Depth (2), keys d1 and d2; after deleting d1 the next is d3; values stored as entered; the item's own quantity unchanged; a Cross is a marker and offers none, a Circle offers Dia, Height, Depth. The refusal when a sub-item reads a dimension, `f6-b` step 6: "Can't delete \"Depth\". It's used by: Concrete. Remove those references first." at the api, zero refused too, and in the dialog with its "used by 1" badge) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Enter a pitch as degrees, as a grade percentage, or as rise over run, each validated to its own range. `src/components/takeoff/PitchInput.tsx` · **ported** (F6-S2, `f6-a` step 7: 6/12, 26.565° and 50% on 100 SF all read 111.80 SF, named "Roof (100.0 SF @ 6/12)"; 95° shows "Angle must be between 0 and 90 degrees" and disables Save; the api computes the factor itself and refuses 95°, and height with pitch, 409; a height turns a run into SF, "Wall paint (40.0 LF, 7'-6\"H)" 300 SF, step 6; a second window on the other api has the figure in 146 ms, step 8) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Create sub-items under an item, each with its own name, unit, classification and formula. `src/components/takeoff/SubItemDialog.tsx` (2,021 lines), `src/lib/takeoff/subItems/` · **partial** (F6-S5, `f6-b`: "Create sub-items" and "Manage sub-items" from the item's menu, name, formula, unit, the live figure, "Will delete on save"; Mesh `PARENT * 1.05` on 1,000 SF is 1,050 SF, Perimeter form `PERIMETER` 130 LF, stored by the api; the parent's shape doubled and a second window read 2,100 SF in 449 ms; one level only, 409 (D-56); the per-row classification arrives with F6-S14)
- [x] Write a sub-item formula against parent tokens (`PARENT`, `AREA`, `LINEAR`, `COUNT`, `PERIM`, `PERIMETER`) from an Insert menu. `src/components/takeoff/SubItemDialog.tsx`, `src/lib/takeoff/subItems/formula.ts` · **ported** (F6-S4, S5: legacy's engine in the browser and its twin on the api, `f6-s4`: 965 rows, 368 numbers equal to the bit and 597 errors word for word, every injection probe an error value; the Insert menu offers the parent's quantity, perimeter, segments, points, area, linear, each dimension and each variable; `{qty:…}` derived tokens, `[Sibling]`, `{ref:…}` read by both) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] A sub-item's unit follows its formula where the formula implies one. `.lovable/plan/manage-sub-items-make-the-unit-follow-the-formula-more-often-2026-09-03.md` · **missing**
- [ ] Derived sub-items show readable formula text and the derived list follows the dimensions on screen. `src/lib/takeoff/subItems/derived.ts` · **missing**
- [x] An invalid formula blocks the save with "Fix the formula to continue", and an unnamed sub-item with "Name this sub-item to continue". `src/components/takeoff/SubItemDialog.tsx` · **ported** (F6-S5, `f6-b` step 3) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Seed a sub-item set from an existing assembly, filtered to the parent's type. `src/components/takeoff/SubItemDialog.tsx`, `.lovable/plan/seed-from-assembly-show-the-real-assemblies-filtered-by-pare-2026-09-02.md` · **missing**
- [ ] Sub-items nest and collapse level by level. `.lovable/plan/level-by-level-collapse-expand-nested-sub-items-2026-08-23.md` · **partial** (F6-S5: sub-items sit under their parent in the Takeoff panel; one level only by the spec (D-56), and collapse arrives with the item tree, F6-S9)
- [x] Create, edit and delete takeoff variables with a name, default value, unit, tags and enum options, and set a per-project value. `src/components/takeoff/VariableEditorForm.tsx`, `src/hooks/useTakeoffVariables.ts`, tables `takeoff_variables`, `takeoff_variable_values`, `takeoff_variable_prefs` · **ported** (F6-S6, `f6-b` steps 7 and 8: New variable, "Single quantity" or "List" with options, unit, tags, from Insert → Manage variables…; `{Wall Height}` shown by name and stored `{var:<uuid>}`; project 1's own 12 moved only project 1; Archive "It disappears from the Insert menu. 1 existing formula keeps resolving." and the formula kept its 24. Archived is not deleted; `takeoff_variable_prefs`, legacy's per-person pins, is not ported) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Editing a variable updates every sub-item quantity that reads it. `src/lib/takeoff/subItems/variables.ts` · **ported** (F6-S6, `f6-b` step 9: a new default recomputed project 2's Rail 30 → 45 FT on the api, in window B on the other api process in 455 ms, while project 1 kept its own value; beyond legacy it is live, `workspace.variable.changed`, D-36 F6 Q6) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Create layers and sub-layers, rename them, delete them (never the last one), and show or hide a layer on the sheet. `src/components/takeoff/LayerSelect.tsx`, table `takeoff_layers` · **ported** (F6-S8, `f6-c` steps 2, 7, 8: a new project has Base Bid, Alternate and Deferred Submittals; each layer's eye hides its shapes, per browser, kept after a reload; delete offers "Move contents and delete layer" or, once DELETE is typed, "Delete layer and all its measurements"; the last layer, whichever it is, is refused 409 "A project must keep at least one layer". The gap proof-backlog found on 2026-09-26 is closed) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] New measurements are filed under the active layer, and the active layer always shows. `src/components/takeoff/LayerSelect.tsx` · **ported** (F6-S8, `f6-c` step 7: on Alternate a new count files under Alternate, the tree shows Alternate's items and Base Bid's shapes leave the sheet until its eye is on; the active layer has no eye to turn off, "The active layer always shows"; the choice survives a reload) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Set a multiplier on a folder or a layer, edited from a popover, and hide the multiplier column until one is set. `src/components/takeoff/FolderPropertiesDialog.tsx`, `src/lib/takeoff/multipliers.ts` · **ported** (F6-S7, `f6-c` step 4: Folder Properties, Name and Multiplier, 0 refused "Enter a number greater than 0."; the folder shows "×2" and its rows "30 LF × 2 = 60 LF"; the stored quantity stays the measured 30 LF and the chain of folder and layer multipliers is what Estimating applies (D-57); a layer's multiplier from Edit layer) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Pick a classification from a searchable picker across five systems, with sub-scopes, archived codes hidden by default, and inline creation of a code. `src/components/takeoff/ClassificationPicker.tsx` (646 lines) · **ported** (F6-S14, D-59, `f6-d` step 5: Preset Classification in New Measurement, "System:" and "Locks after first save" until the first classified save, then "Locked for this project"; Division and Scope columns, any node pickable, "Show archived", "+ Add division", "+ Add scope", "Add Sub-Folder"; a search over code and name beyond legacy; "Selected: DIV 99 — Fixture Works › Wood Framing". The picker's own Rename and Archive menu is in Settings only) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Change an item's classification, moving it to the matching folder in the same step. `src/components/takeoff/ChangeClassificationDialog.tsx` · **partial** (F6-S14 AC3, `f6-d` step 6: Properties → Current folder → Change → pick: the item moves to "DIV 03 — Concrete" / its scope in one step, on the api. Legacy's "Change classification system" unlock dialog is not built, D-59)
- [ ] Duplicate an item, prompting for a new name, choosing which sections are copied, and optionally carrying sub-items. `src/components/takeoff/DuplicateItemDialog.tsx`, `src/lib/takeoff/services/duplicateService.ts` · **partial** (F6-S9, `f6-c` step 9: "Duplicate item" suggests "Wall (2)", then "Wall (3)", "Keep current classification" or "Assign new…", "Include sub-items (1)"; the copy has every shape, a new colour, the same quantity and its sub-items. Choosing which sections are copied is not built)
- [x] Enter costs for an item that has no sub-items, and see a costs view inside Manage Sub-items. `src/components/takeoff/ItemCostsDialog.tsx`, `ItemCostsGrid.tsx`, table `estimating_line_costs` · **ported** (F9-S4: "Costs…" from a takeoff item's menu, and from each saved row of Manage sub-items, legacy's fields and words, saved as each field is left; $4 on Rebar read $4,266.67 in Estimating) · *smoke-tested (D-70)*
- [x] One sentinel species per count item, with `vertices_json` and `shape_meta` staying parallel. `src/lib/takeoff/countSymbol.ts`, `src/lib/takeoff/engine/engine.ts` · **ported** (driven: vertices sent without their shape_meta are refused 409; a count item carries one symbol; proof-backlog, overnight 2026-09-26) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Choose a count symbol and its size, with sizes either fixed or scaled to the sheet's real-world scale. `src/components/takeoff/CountSymbolIcon.tsx`, `src/hooks/useCountSymbolRow.ts` · **ported** (F6-S1 stores them; D-97, round 3 B9: the canvas draws the item's symbol at legacy's size mode, tapered pixels, scaled with the sheet, or the plan extent of its dimensions through the scale; new items default to Size Pixels, 10 px, as legacy's columns; *smoke-tested (D-70)*)
- [ ] Reorder the count symbol row and choose which symbols appear in it. `.lovable/plan/count-symbol-row-reorder-and-let-the-estimator-choose-which-2026-09-03.md` · **missing**
- [ ] Every change to an item is recorded and readable as a history: created, edited, duplicated, deleted, override set and cleared, quantity recalculated, calibration changed, assembly linked and unlinked. `src/components/takeoff/HistoryDrawer.tsx`, `src/components/estimate/ItemHistoryDialog.tsx`, table `takeoff_item_history` · **missing**
- [x] The per-item status bar is always visible. `.lovable/plan/always-visible-item-status-bar-2026-08-22.md` · **ported** (F7-S23: legacy's status line along the bottom of the window for the selection, "{name} · SF · Calculated: … · Perimeter: … LF", as live legacy shows it) · *smoke-tested (D-70)*
- [ ] Bid layers never duplicate: every layer belongs to the workspace that made it. `.lovable/plan/bid-layers-stop-the-duplicates-make-every-layer-yours-2026-09-07.md` · **missing**
- [ ] A custom folder carries a three-dot row menu of its own. `.lovable/plan/custom-folder-wbs-three-dots-row-menu-2026-08-29.md` · **partial** (F6-S7: the folder's menu, Folder Properties, Rename, Change colour, Delete folder, opens on a right-click of its header; no three-dot button on the row yet)
- [x] The multiplier and total quantity columns stay hidden until a multiplier is actually set. `.lovable/plan/hide-multiplier-and-total-qty-until-a-multiplier-is-actually-2026-08-17.md` · **ported** (F6-S7: "×N" and "× N = total" appear only where a multiplier other than 1 applies, `f6-c` step 4) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Linking an assembly to a takeoff item works from the item row. `.lovable/plan/fix-link-assembly-on-takeoff-items-2026-09-01.md` · **missing**
- [x] Creating an item whose classification is missing fails with a named reason rather than "Cannot read properties of undefined". `.lovable/plan/fix-add-failed-cannot-read-properties-of-undefined-reading-s-2026-08-06.md` · **ported** (F6-S14: the api names it, 404 "No such classification.", 409 "That classification is archived. Restore it to file under it." or "This project is locked to CSI MasterFormat.", `f6-d` steps 5 and 7) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*

**Dialog behaviour**

- [x] The New Measurement dialog is compact, remembers its WBS filing mode, and carries a sub-items entry point with an Insert menu. `src/components/takeoff/NewItemDialog.tsx` · **ported** (F6-S1: opens when a tool is picked, "Name this LF measurement", "LF 1", Enter creates, and one tool run is one item (D-55); the WBS mode and its open state are on the person and survive a reload, `f6-a` steps 2 and 4. D-132: legacy's Sub-items bar in create mode, "Create sub-item" / "Edit sub-items" opening the sub-item editor over the dialog against the dimensions being typed, the draft rows listed with their units and "Sub-items are saved with this measurement when you press Create.", written once the first shape makes the item; *smoke-tested (D-70)*)
- [x] The New Measurement dialog exposes opacity and count symbol size alongside WBS and sub-items. `.lovable/plan/measurement-dialog-wbs-sub-items-opacity-count-symbol-size-2026-08-29.md` · **ported** (F6-S1: opacity, symbol and size beside the WBS, `f6-a` step 3; sub-items in both modes, D-77 and D-132)
- [ ] The Duplicate dialog is compact and anchored near the item it duplicates, prompts for a name, and offers sub-items optionally. `src/components/takeoff/DuplicateItemDialog.tsx` · **partial** (F6-S9: compact, a name and "Include sub-items (N)"; it opens centred, not anchored at the row)
- [x] A duplicate produces the same markups in a new colour, not a silent copy of the original colour. `.lovable/plan/fix-duplicate-exact-same-markups-new-color-2026-08-03.md` · **ported** (F6-S9, `f6-c` step 9: the copy's colour differs and its quantity is the original's) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] The Properties dialog shows existing sub-items and carries no pricing. `.lovable/plan/properties-dialog-no-pricing-show-existing-sub-items-2026-08-29.md` · **missing**
- [ ] Manage Sub-items opens fully drawn rather than painting in stages, and its shadows suit a non-dimming window. `.lovable/plan/manage-sub-items-opens-fully-drawn-2026-09-07.md` · **missing**
- [ ] The sub-items editor stays clickable when opened over the measurement dialog, and its dropdowns paint above it rather than behind. `.lovable/plan/sub-items-editor-is-dead-to-clicks-when-opened-over-the-meas-2026-09-02.md`, `.lovable/plan/sub-items-editor-dropdowns-painting-behind-the-dialog-2026-09-02.md` · **missing**
- [ ] The Insert dropdown inside the sub-items dialog is never clipped by the dialog edge. `.lovable/plan/insert-dropdown-in-sub-items-dialog-gets-cut-off-2026-09-11.md` · **missing**
- [ ] Creating a sub-item does not freeze the app. `.lovable/plan/why-create-sub-item-freezes-the-app-for-a-few-seconds-2026-09-02.md` · **missing**
- [ ] A new sub-item starts with an empty formula bar, and the formula field shows the whole formula while editing. `.lovable/plan/empty-formula-bar-for-new-sub-items-2026-08-04.md`, `.lovable/plan/formula-field-make-the-whole-formula-visible-while-editing-2026-07-31.md` · **missing**
- [ ] Insert values offers every remaining parent figure. `.lovable/plan/sub-items-insert-values-add-the-remaining-parent-figures-2026-08-04.md` · **missing**
- [ ] Sub-item costs split out equipment, and a sub-item can be created without closing the costs view. `.lovable/plan/sub-item-costs-split-equipment-create-sub-items-without-clos-2026-09-02.md` · **missing**
- [ ] Count-derived quantities are worded plainly rather than in formula language. `.lovable/plan/simpler-wording-for-count-derived-quantities-2026-09-07.md` · **missing**
- [ ] A sub-item's classification is optional when the item uses a custom folder. `.lovable/plan/sub-items-classification-optional-when-the-item-uses-a-custo-2026-09-03.md` · **missing**
- [ ] The colour picker stays open while colours are being tuned. `.lovable/plan/keep-the-color-picker-open-while-tuning-colors-2026-08-17.md` · **missing**

## 9. Canvas tools

`src/components/takeoff/Toolbar.tsx` (792 lines), `PdfCanvas.tsx` (3,915 lines).

- [x] **Pan (H).** Drag to move the sheet. `src/components/takeoff/Toolbar.tsx` · **ported** (D-66, 2026-09-28: legacy's own Pan tool, "Pan (H) — drag to move the sheet", armed by H; Select's drag now draws legacy's box; `f7-h` step 8 and proof-backlog §9) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Select (V).** Click a markup to select and edit it. `src/components/takeoff/Toolbar.tsx` · **ported** (driven: clicking a markup selects its item and opens its properties; the V key is §23's and absent; proof-backlog, overnight 2026-09-26. Since F7-S1, D-61, the pick follows legacy's rules, not the drawn stroke: within 0.008 of the page of a run, inside or near an area's edge, the topmost first, and a right-click picks the same way, `f7-a` steps 6 and 7) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Linear (L).** Measure a run, in Point to Point, Rectangle, Ellipse/Circle or Arc mode. `src/components/takeoff/drawModes.tsx` · **ported** (F7-S4, D-62, `f7-b` steps 2 and 3: the caret lists the four with legacy's hints, the current one marked, the button titled "Linear — Rectangle (change mode with ▾)"; a rectangle 60 LF, a circle 20 ft across 62.83 LF and an arc of radius 10 ft 31.42 LF, analytic (D-61); three collinear clicks a two-segment run. The L key is §23's) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Area (A).** Measure an area, in Point to Point, Rectangle or Ellipse/Circle mode. `src/components/takeoff/drawModes.tsx` · **ported** (F7-S5, `f7-b` step 4: a 20 × 30 ft rectangle 600 SF, a circle of radius 10 ft 314.16 SF; in Point to Point a press and drag of more than 5 px places a rectangle, as legacy's. The A key is §23's) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Segment.** Two clicks per segment, auto-committing and then placing the next. `src/components/takeoff/Toolbar.tsx` · **ported** (F7-S6, `f7-b` step 5: "Segment — two clicks per segment; auto-commits, then places the next"; each pair of clicks is a shape of the one item, which reads their sum) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] **Count (N).** Place count marks one by one. `src/components/takeoff/Toolbar.tsx` · **partial** (each click with Count makes a new item with one mark, and three quick clicks made three items all named "Count 11"; legacy places marks into one item. Marks join one item only through Add a shape; found by proof-backlog, overnight 2026-09-26. **Since F6-S1 (D-55) one Count run is one item, and since F7-S7 (D-62) Count with a count item selected adds its marks to it with no dialog**, `f7-b` step 6: four clicks joined Receptacles, 5 EA, no new item; "Delete this point" takes one mark back. Open: a sheet switch ending the session, D-62)
- [x] **Dimension (D).** Click two points to measure and verify the scale. `src/components/takeoff/Toolbar.tsx`, `VerifiedDimensionLayer.tsx` · **ported** (D-97, round 3 B11, brought forward from F11: the toolbar button beside Scale (round 4 A5, D-99, pending founder review: legacy's source has it after Count) and first in the canvas strip, D arming it when nothing is being drawn (round 4 A4), two clicks with ortho and snap, feet-inches to 1/16" or metres, "calibrate scale" unscaled, legacy's red line, ticks, arrows and boxed label in screen px, the action bar's Properties (one style per browser, `intelcost.toolStyles.v1`), Undo and Stop, never saved and gone with the sheet, as legacy's; *smoke-tested (D-70)*. The AI-verified witness, `VerifiedDimensionLayer`, came with the scale check, D-131)
- [ ] **Snapshot (S).** Drag a box to capture an area as a snippet. `src/components/takeoff/Toolbar.tsx` · **missing**
- [ ] **Dock.** Drag a rectangle to display a snapshot or sheet thumbnail on the sheet, optionally hyperlinked. `src/components/takeoff/DockLayer.tsx`, `DockSetupDialog.tsx`, table `takeoff_docks` · **missing**
- [ ] **Overlay.** Overlay another sheet on the current one. `src/components/takeoff/OverlayDialog.tsx` · **missing**
- [ ] **Highlight.** Drag a rectangle to place a translucent highlight, with a colour palette on the caret. `src/components/takeoff/HighlighterLayer.tsx`, `HighlighterColorPalette.tsx`, table `takeoff_highlights` · **missing**
- [ ] **Cloud.** Drag a box to place a revision cloud. `src/components/takeoff/ReviewMarkupLayer.tsx` · **missing**
- [ ] **Callout.** Drag from the point of interest to where the text sits. `src/components/takeoff/ReviewMarkupLayer.tsx` · **missing**
- [ ] **Arrow.** Drag from tail to head. `src/components/takeoff/ReviewMarkupLayer.tsx` · **missing**
- [ ] **Note.** Drag to place a text note, with colour, opacity and text colour on the caret. `src/components/takeoff/NoteLayer.tsx`, table `takeoff_notes` · **missing**
- [ ] **Print.** Print the current page with its markups, with a page chooser and options. `src/components/takeoff/PrintPagesDialog.tsx`, `src/lib/takeoff/print/renderSheetForPrint.ts` · **missing**
- [ ] **Find Text (Ctrl+F).** Search words printed on the drawings. `src/components/takeoff/FindTextDialog.tsx` (663 lines) · **missing**
- [x] **Undo (Ctrl+Z) and Redo (Ctrl+Shift+Z)** on the current sheet. `src/components/takeoff/Toolbar.tsx`, `src/lib/takeoff/history/sessionHistory.ts` · **ported** (F7-S22, D-71: legacy's one session history owned by the sheet of the latest commit, 50 entries, the toolbar's Undo and Redo with legacy's titles, off where there is nothing to do; a new item, a shape joining an item, a count session as one step, a deduct, an auto-merge and a delete (the item made again when it went) each undo as one shapes transaction and redo with fresh versions; a colleague's edit since asks first, naming them; in One at a time a colleague's hold refuses with legacy's "Can't undo") · *smoke-checked (D-68)*
- [x] **Zoom in, zoom out (to 3000%), and Fit.** `src/components/takeoff/CanvasZoomCluster.tsx`, `src/lib/takeoff/zoomLimits.ts` · **ported, beyond legacy** (F5 Block C, 2026-09-27: 50% to 4000% per D-35 from `lib/takeoff/pdf/zoom.ts`, legacy's step rule, the wheel and buttons stopping exactly at both ends, `f5-s11`; D-76, 2026-09-28: legacy's bottom-right zoom cluster (`ZoomCluster.tsx`: Zoom in, Zoom out, Zoom to fit, Zoom window), Fit as legacy's `fitToViewport` (the whole page, centred), a sheet opening fitted, the bare wheel zooming at the cursor at legacy's rate; round 4 A3 (D-99): legacy's wheel gesture, a GPU scale per frame and one commit 120 ms after the last tick, 35.9 → 18.7 ms a frame zooming in, 33.7 → 16.3 out; D-100: the handover is one swap, the sharp frame drawn before the landing and shown in the same commit, nothing moving (≤ 0.019 px), markups at their on-screen size through the gesture; D-102, round 5: 100% is 170 CSS px per inch of sheet, 10% to 4000%, Fit about 20% in a maximised window on a 2560 × 1440 monitor at 125%, × 1.25 a step; D-103: the zoom menu (Zoom to Fit, 100%, 50%, 25%, 10%) from the cluster's percentage and the canvas's; *smoke-tested (D-70)*)
- [ ] **Markups toggle and Legend toggle**, the legend floating with descriptions and quantities. `src/components/takeoff/LegendOverlay.tsx` · **partial** (round 4 B9, D-99: the Legend is ported, `features/takeoff/legend/LegendOverlay.tsx`, in the sheet's space, by folder, this sheet's quantities, drag, resize, box per sheet, text scaled to the card, toolbar toggle hidden by default as legacy's, region menu Show/Hide Legend, Legend on by default; *MCP smoke 2026-09-29*. The Markups toggle is not)
- [x] Calibrate the sheet scale from two points at a declared distance. `src/components/takeoff/CalibrationDialog.tsx`, table `sheet_calibrations` · **ported** (F5 Block E, `f5-s15`: in legacy's words: the "Calibrate" toast, "Set sheet scale", `parseFeet`'s "Interpreted as 25.50 ft (7.77 m)" or "Unrecognized format", "Save calibration", then "Scale set — verify with a known dimension". **The scale is feet per PDF point, as legacy's (D-51)**: a run across and a run down of one paper length read the same, which a scale in normalised units got wrong off-axis. Legacy's Verify action arms Dimension: the toast has it since D-97) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Pick a scale from the Architectural, Engineering or Metric presets, or "No scale". `src/components/takeoff/ScaleMenu.tsx`, `src/lib/takeoff/scales.ts` · **ported** (F5 Block E, `f5-s16`: legacy's 15, 25 and 23 presets, the architectural ones labelled `1/8" = 1'-0"` by the founder's ruling (D-52; legacy's read `1/8" = 1'`), the current one ticked, stored as feet per point with legacy's 1-point reference; an unscaled chip reads "Calibrate scale to compute LF / SF", legacy's "No scale" state) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] The toolbar's **Scale** button (the ruler over the word, after Select, before the drawing tools; "Scale — {label}") opens the same scale dropdown as the canvas chip: Calibrate Scale, Add Custom Scale, the three lists, the current one ticked. `src/components/takeoff/Toolbar.tsx`, `ScaleMenu.tsx` · **ported** (F5 follow-up (b), the founder's finding of 2026-09-27, D-53, `f5-scale-button`: the order, the menu, a preset from the toolbar stored as 1/18 ft per point, Calibrate Scale pressing the button; a viewer's is disabled, `f5-s18`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Enter a custom scale. `src/components/takeoff/CustomScaleDialog.tsx` · **ported** (F5 Block E, `f5-s16`: "Custom Scale", N in = M ft, "Preview: 1" = 45'"; legacy's metric variant is behind its flag, off, Q5) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Read the scale from a dragged region, apply it to one sheet or to every sheet, and be warned when the drawn dimensions disagree with the printed scale. `src/components/takeoff/ScaleFromRegionDialog.tsx` · **ported** (D-116 rounds 14, 19, 20 and D-131: every printed scale, the most used first, with Show; each checked against the sheet's drawn dimensions, vector ticks first and the band of three or more strings second (`lib/takeoff/scaleVerify.ts`, `find/sheetStrokes.ts`): Verified auto-applies, No dimensions offers, Conflict needs "Apply printed scale anyway"; the floating non-modal panel; the sweep's Verification column, conflicts unticked; `verify_status`, `verify_method`, `measured_feet_per_pt` stored. Left: legacy's AI fallback for a scale with no text layer, F14; *smoke-tested (D-70)*)
- [x] Scale evidence stays on the sheet, with the amber scale box persisting after an AI scale is applied. `src/components/takeoff/ScaleEvidenceMenu.tsx`, `src/lib/takeoff/scaleEvidence.ts` · **ported** (D-131: the purple witness and the amber scale boxes saved in `verify_evidence`, drawn with Show › Annotations, never printed; right-click Hide this marking, on this sheet, on all sheets; Show › Annotations brings them back. The AI-read scale's box waits for F14; *smoke-tested (D-70)*)
- [x] Measure tools are disabled until the sheet has a scale, and the panel's empty state says why. `src/components/takeoff/CalibrationRequiredDialog.tsx`, `EmptyTakeoffState.tsx` · **ported, as legacy does it** (F5 Block E, `f5-s16` AC3: Linear or Area on an unscaled sheet opens "Set a scale for this sheet" with "Calibrate now" or "Set scale directly" then "Pick a standard scale", and the tool arms once a scale is set; Count needs none. Before, the tools were greyed out, which legacy never did)
- [x] Changing a scale after items exist warns before it recomputes them. `src/components/takeoff/ScaleChangeGuardDialog.tsx` · **ported** (F5 Block E, `f5-s16` AC4: "Change scale on this sheet?", "This sheet has 1 measurement traced on it…", Cancel keeps the scale, "Change scale" applies it and every item recomputes; a first scale never asks. Legacy's earthwork clause is dropped until earthwork exists, F12) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Tools overflow into a menu when the toolbar is narrower than the tool row. `src/components/takeoff/ToolbarOverflow.tsx` · **ported** (F7-S23: the measure tools fold into "More" [{n} more tools] from the right when the toolbar is too narrow, and unfold when it widens) · *smoke-tested (D-70)*

## 10. Canvas interactions

- [ ] Draw modifiers Snap (S), Snap PDF (D) and Ortho (O) toggle mid-draw, with defaults in Settings. `src/lib/takeoff/engine/shortcuts.ts`, `src/components/takeoff/DrawModifiersOverlay.tsx` · **partial** (F7-S10, D-63, `f7-c` steps 2 and 4: Snap and Ortho on the canvas bar and S and O mid-draw; Snap PDF waits for the linework reader; the defaults in Settings are S27's)
- [ ] Snap PDF snaps new points to the drawing's own linework, read from the PDF vector data. `src/lib/takeoff/pdf/pdfSnapGeometry.ts`, `pdfPolylines.ts` (795 lines) · **missing**
- [x] Escape cancels in two stages while measuring, Enter finishes, Backspace removes the last point, Delete removes the selection. `src/lib/takeoff/engine/shortcuts.ts` · **ported** (F7-S8, `f7-b` step 7: two-stage Escape, Enter, Backspace; Delete removes the selected section, F7-S17, `f7-d` step 4) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] "A" mid-draw arms an inline arc segment, beating the Area tool binding. `src/lib/takeoff/engine/shortcuts.ts` · **partial** (F7-S9, `f7-c` step 5: A arms the arc mid-run, Backspace unwinds it, the figure analytic (D-39 Q5); with no point placed A does nothing yet, the Area binding is §23's)
- [x] The contextual action group offers Stop, Discard, New Section, Properties, Undo, Copy, Duplicate, Deduct, Delete and Resume, changing with the drawing, selection and cutout states. `src/components/takeoff/ContextActionGroup.tsx` (318 lines) · **ported** (F7-S23, D-74: legacy's amber group in the toolbar in its armed, draw, subtract, select and multi variants, legacy's buttons, titles and glyphs; a lock disables Start, Resume, Deduct and Delete with " — Item is locked"; a chip names the item when the Takeoff panel is hidden) · *smoke-tested (D-70)*
- [x] Right-click on an in-progress measurement opens a small action menu. `src/components/takeoff/ContextActionGroup.tsx` · **ported** (F7-S8: legacy's draw menu, New Section, Close, Stop and Discard; the action group carries the same acts since F7-S23) · *smoke-tested (D-70)*
- [ ] Right-click on empty sheet area opens the canvas menu: quick tools, bookmark this page, show or hide legend, and per-type markup visibility. `src/components/takeoff/SheetContextMenu.tsx` · **partial** (F7-S24, D-75: legacy's tool strip (Area, Linear, Segment, Count), Paste, Show All ▸ and Hide All ▸ by kind (All, Area, Linear, Segment, Count Markups), Rotate Page ▸, Zoom to Fit, Calibrate Scale, Bookmark This Page; *smoke-tested (D-70)*. The strip leads with Dimension since D-97. **Show Legend**, Print This Page, Mirror Page and the strip's Highlight and Note wait for their features, absent (D-39 Q9))
- [ ] Left-drag a region opens the region menu: New Snapshot, Auto Count, Extract Schedule, Ask AI, Scale, Page Name, Search as Text, Copy as Image, Copy as Text, Crop as New Page. `src/components/takeoff/RegionSelectMenu.tsx` · **partial** (F7-S31, D-86: a Select box over empty sheet, past 25 px, opens the menu at the pen with Crop as New Page; the tool strip and the other entries wait for F11 to F14) · *smoke-tested (D-70)*
- [x] Box-select markups, with a selection action bar and a selection right-click menu. `src/lib/takeoff/engine/boxSelect.ts` · **ported** (F7-S14, D-66, `f7-h`: a Select drag past 25 px selects what it wholly encloses; "{n} selected" with Copy, Paste (off, as legacy until a copy waits), Move, Rotate Left 90°, Rotate Right 90°, Flip Horizontal, Flip Vertical, Lock, Delete and legacy's toasts; the bar's Delete alone, "Delete everything in the selection"; turns in page points, figures unchanged on a 2:1 page; arrows nudge 0.001, Shift 0.01. **Hide** since F7-S24 (D-73): "Hidden — quantities are unchanged", *smoke-tested (D-70)*); the bar's Delete is the action group's since F7-S23
- [x] Ctrl+A selects every markup on the sheet. `.lovable/plan/ctrl-a-select-all-markups-on-the-sheet-2026-09-01.md` · **ported** (F7-S14, `f7-h` step 4; not mid-draw nor while cutting) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A left-click off any markup disarms the box selection. `.lovable/plan/left-click-off-any-markup-disarms-the-box-selection-2026-09-01.md` · **ported** (F7-S14, `f7-h` step 3, and Escape) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Copy a markup to another spot or another sheet, with two direct options and no reference-point click, for every item type. `src/lib/takeoff/engine/transformRuns.ts` · **ported** (F7-S16, D-67, `f7-i`: "Copy…", "Paste on this sheet" or "Paste on another sheet…", the ghost already under the cursor, "Paste copy" with Same item or New item; real-world size kept across sheets of another scale and shape, where legacy's is not; a section's hole comes with it; an unscaled target refused in legacy's words. Linear and Area driven; Count and Segment share the path); **D-73:** "New item" now opens the New Measurement dialog prefilled with "{name} copy", as legacy's, *smoke-tested (D-70)* · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Choose which sections get copied. `.lovable/plan/copy-choose-which-sections-get-copied-2026-08-17.md` · **ported** (F7-S16, `f7-i` step 5: "This section only", "All sections on this sheet (n)", "Choose sections…" with legacy's banner, Enter to go on) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] The move and copy ghost draws linear runs as lines, not shaded areas. `.lovable/plan/move-copy-ghost-draw-linear-runs-as-lines-not-shaded-areas-2026-08-03.md` · **partial** (the copy ghost, `f7-i` step 2: a run a dashed line, unfilled; Move drags the shape itself with no ghost, D-65)
- [ ] Cut a deduct (hole) out of an area, select the positive first then click inside a deduct, and merge overlapping holes. `src/lib/takeoff/engine/deductPairing.ts`, `edgeCut.ts` (640 lines) · **partial** (F7-S18, D-64: right-click an area, "Subtract from section", any Area mode; legacy's "Subtracted", "Applied to "{name}".", "Subtract has no overlap", "Deduction covers the whole area"; a bite over the edge counts only what it covers; overlapping holes counted once in the arithmetic, `f7-f`; D-76, 2026-09-28: a new interior deduct overlapping the section's deducts is unioned with them into one hole (`engine/merge.ts` `mergeDeducts`, one undo step), and a deduct draws as legacy's, the hole cut out of the fill with a 5/4 dashed outline; *smoke-tested (D-70)*. Clicking inside a deduct to pair it is not built)
- [ ] Deducts follow their area on delete, and the deduct tool stays armed. `.lovable/plan/deducts-follow-their-area-on-delete-deduct-tool-stays-armed-2026-08-23.md` · **partial** (F7-S2: a deduct's section is its `owner_geometry_id`, and deleting the section deletes its deducts by the database's rule, `f7-a` step 4. The deduct tool stays armed for the next box, `f7-f` step 2; and a section moved carries its deducts, D-65, `f7-e` step 5)
- [ ] Circles and ellipses still look like curves after a deduct. `.lovable/plan/keep-circles-and-ellipses-looking-like-curves-after-a-deduct-2026-08-23.md` · **missing**
- [ ] Pairing is not quantity: a deduct pairing never changes the measured figure by itself. `src/lib/takeoff/engine/deductPairing.ts` · **missing** (F7-S2, D-61: on the api, each deduct is clipped against the union of its item's sections on the sheet and subtracted once, whichever owns it; the shared table's three crossing rows, `f7-a` step 2. Drawing a deduct, and the ownership that pairing drives in the browser, arrive with F7-S18)
- [ ] Selected areas and linears show hollow white vertex points; dragging a handle reshapes a curve as a whole. `src/lib/takeoff/engine/shapes.ts` · **partial** (F7-S13: a selected section's corners drag, a double-click or "Insert point here" adds one, "Delete this point" removes one and is refused below the minimum in legacy's words, `f7-e`; no curve reshaping)
- [ ] Ellipses and circles show four handles, and arcs three per arc, rather than the whole bead chain. `.lovable/plan/ellipse-circle-show-4-handles-not-the-whole-bead-chain-2026-08-22.md` · **missing**
- [ ] Selecting a markup on the sheet highlights its row in the panel in blue, and vice versa. `.lovable/plan/selecting-a-markup-on-the-sheet-highlights-its-row-in-blue-2026-08-22.md` · **missing**
- [ ] Clicking anywhere on a count symbol selects it, and dragging works from the full visible symbol. `.lovable/plan/count-symbols-clicking-anywhere-on-the-symbol-should-select-2026-09-11.md` · **partial** (F7-S1, D-61, `f7-a` step 7: a mark is picked within at least 14 px of its centre at every zoom, legacy's ellipse test, 10 px picks and 25 px does not, at zoom 1 and 2. Dragging a mark arrives with move, F7-S15)
- [x] Hovering a markup shows a details panel with this section, this sheet and item total figures, configurable per markup type, delayed until the cursor rests. `src/lib/takeoff/hoverStats.ts` · **ported** (F7-S25, D-84, 2026-09-28: legacy's panel, lines, 5 px rest, placement and area highlight; *smoke-tested (D-70)*)
- [x] The hover panel lifts clear of the crosshair and hides the moment the cursor moves. `.lovable/plan/lift-the-hover-panel-clear-of-the-crosshair-2026-08-22.md` · **ported** (F7-S25, D-84, 2026-09-28: legacy's panel, lines, 5 px rest, placement and area highlight; *smoke-tested (D-70)*)
- [x] Hovering an area markup outlines the run under the cursor. `.lovable/plan/hover-highlight-on-area-markups-2026-08-22.md` · **ported** (F7-S25, D-84, 2026-09-28: legacy's panel, lines, 5 px rest, placement and area highlight; *smoke-tested (D-70)*)
- [x] Auto-scroll pans the sheet when the cursor nears the edge, stops at the canvas boundary, and stops the moment the cursor leaves the canvas. `src/pages/ProjectTakeoff.tsx` · **ported** (F7-S11, `f7-j`: with a measure tool armed, legacy's 48 px band, half a second, faster at the edge; off the canvas it stops at once; "Auto Scroll: On" in the canvas bar with legacy's title, Off and Select leave the sheet still. The band, delay and speed are Settings › Mouse since D-82, 2026-09-28) · *smoke-tested (D-70)*
- [x] Measuring continues past the edge of the sheet, and markups outside the sheet still show. `.lovable/plan/keep-measuring-past-the-edge-of-the-sheet-2026-08-23.md` · **ported** (F7-S11 AC1, `f7-k`: with a measure tool armed the grey margin takes the pen; a run ended there is stored past 1.0 and drawn past the paper, after a reload too) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Pan with the middle button and with the right button, everywhere on the canvas. `.lovable/plan/make-middle-button-and-right-button-panning-work-everywhere-2026-09-01.md` · **ported** (D-97, round 3 B3: the pan is legacy's free offset, unbounded at every zoom, fitted and zoomed out included; D-76, 2026-09-28: the middle button pans at once, the right button past 4 px, in every tool with a run in hand untouched, and a right-click that did not travel opens its menu; *smoke-tested (D-70)*)
- [x] The cursor reticle is configurable: crosshair lines, ring, centre dot, short ticks, clearance, shape, colours and thickness. `src/components/takeoff/settings/SettingsDialog.tsx` · **ported** (F7-S26, D-84: legacy's `paintCursor` from every Cursor setting; *smoke-tested (D-70)*)
- [ ] The move handle scales with zoom, stays anchored during zoom, hides while panning, hides while a dialog is open, and stays out from under dialogs and panels. `src/pages/ProjectTakeoff.tsx` · **partial** (F7-S15, D-65; D-97, round 3 B7, B8: an area's handle sits inside it, in its widest part and out of its deducts (beyond legacy's vertex mean), a run's at legacy's mean, none on a count mark, 18 to 28 px by how much of the canvas the page fills, as legacy's; hidden while panning, the name and quantity on rest; a drag under 4 px moves nothing; a deduct moved off is refused, "Move rejected", `f7-e`; hidden while a dialog is open, `f7-e` step 6. Staying out from under panels is not driven)
- [ ] Markups stay stable at maximum zoom, with no glitching. `.lovable/plan/maximum-zoom-markup-stability-2026-09-17.md`, `.lovable/plan/fix-zoom-glitching-for-measurement-markups-on-g101-2026-09-17.md` · **missing**
- [x] Resume a count or extend a run, picking up where the last session stopped, with per-type resume glyphs. `src/components/takeoff/ContextActionGroup.tsx` · **ported** (F7-S21, D-72: Resume on a row joins the next run to the item as a new shape (D-32), or goes on marking a count; an area's "New section" and a run's "Start" do the same; "Add more points" and a run's "Resume" continue the run itself from its last point, or from a point inserted on an edge, in one version-guarded write. Reached from the menus in legacy's words until the action group, line above, lands with S23) · *smoke-checked (D-68)*
- [x] While one user is actively marking an item on a sheet, other viewers are blocked from Resume and delete on that (item, sheet) pair. `src/hooks/useTakeoffPresence.ts`, `src/lib/takeoff/presence/gate.ts` · **ported** (**D-32:** this is the **One at a time** collaboration mode, not the default. Built and driven on today's takeoff page, F8-S11 and S12, `f8-s11`, `f8-s12`: delete, add, edit vertices, rename and override are view-only for others and refused 409 by the api. **Re-driven on Resume by F7-S21**: the owner resumes an item, a colleague's Resume reads "Fixture O. is editing this item right now." and her write is refused 409, *smoke-checked (D-68)*) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Two estimators editing the same project see each other's items, geometries, calibrations and folders appear live. `src/hooks/useTakeoffRealtime.ts` · **partial** (D-10, D-13: **items and geometries are live** on today's takeoff page since F8-S18, each within a second of the write, and F5 to F7 keep them. **Calibrations are live since F5 Block E**: `sheet.calibration.changed`, and a second window on the sheet shows the new scale chip in 195 ms and the recomputed quantities in 328 ms, `f5-s15` AC3; and in F5-S19's two-window check, across api processes, after a calibration made with the Scale tool, 642 and 816 ms from Save, `f5-s19`. A Load in one window adds its rows to the other's sheets panel, 764 ms, `drawing.sheet.changed`. **Folders and layers are live since F6 Block C**: `takeoff.folder.changed` and `takeoff.layer.changed`, and a second window on the other api process shows Unfiled renamed to Sitework without a reload, `f6-c` step 6; and a new item, its rename and its filing, `f6-e` step 1. Classifications, Settings to Settings, `f6-d` step 4)
- [x] Write tokens suppress the echo of a user's own realtime events. `src/lib/takeoff/realtime/writeTokens.ts` · **ported** (F8-S7, `core/realtime/tab.ts`: per tab, 512 kept, consumed on the echo; `f8-s7`, and `f8-s16` AC8 for A's own folder) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*

**Collaboration, beyond legacy (D-32, D-33).** New behaviours the founder added on
2026-09-25. There is no legacy file to cite; the decision is the reference.

- [x] **Collaboration mode.** An owner or admin sets the workspace's mode in Settings > Collaboration: Work together (the default) or One at a time (D-98; Warn me is each person's own since). One rule for everyone in the workspace; no "Ask to join". D-32 · **ported** (F8-S10, `f8-s10`; the change reaches open takeoff pages live, `f8-s15` AC9) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Work together.** Several estimators add shapes to one item at once and every shape survives, because each shape is its own row, and the item's quantity is the sum of all of them. D-32 · **ported** (F8-S9, `f8-s9`: two windows, and fifty simultaneous adds) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Same shape, same moment.** A concurrent edit of the same shape is refused with "{name} just changed this shape, showing their version", and the shape refreshes to the winner's. Never a silent loss. D-32 · **ported** (F8-S9, `f8-s9`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Warn me.** As Work together, plus a banner, "{name} is also working on this item". D-32 · **ported** (F8-S12, `f8-s12`; D-98, round 3 D15: each person's own switch in Takeoff Settings › Collaboration, "Warn me when someone else is working on my item", on by default, with the display choices moved there from Settings › Account; *smoke-tested (D-70)*) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **One at a time.** An atomic claim with a heartbeat; anyone else gets "{name} is editing this item right now" and the item is view-only for them until the claim clears, seconds after the holder's last heartbeat. The api refuses their writes with 409, not only the screen. D-32 · **ported** (F8-S11, S12, `f8-s11`, `f8-s12`; F6-S16 carries it to every F6 write, `f6-e` step 2: Properties, Rename, Create sub-item and Duplicate disabled with the holder's name, the tree's double-click rename and drag off, and a hand-written rename, sub-items, dimension or bulk write refused 409. Work together, `f6-e` step 3: a sub-item's formula and its parent's dimension written at once both land, and both windows read the same figure) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Live in-progress drawing.** While a colleague draws, others see the line, area or count growing in the colleague's colour with a small name tag, not saved until it finishes. D-33 · **ported**, **kept on the pdf.js canvas by F5-S17 and S19** (`f8-s13` 5/5 re-driven; `f5-s19` across api processes: the tag goes 107 ms after the colleague finishes and the saved row arrives in 282 ms; before, the tag lingered a second over the saved shape) (F8-S13 channel, drawn by `DraftLayer` per **D-34**, pending review; `f8-s13`: a run grows on B's sheet tagged "Bench E.", hands over to the saved shape, and ends at once when A's tab closes. A count grows by its saved marks, one per click. **On the pdf.js canvas since F5 Block C (2026-09-27): `f8-s13` 5/5 and `f8-s14` 4/4 pass over the new raster**) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Others' cursors** show on the sheet, named. D-33 · **ported** (channel F8-S13; drawn by F7-S28, D-85, 2026-09-28: `CursorLayer.tsx`, the sender's colour and "Sara W." tag, the five Collaboration preferences; two windows across api and api-b) · *smoke-tested (D-70)*
- [x] **Names read "Sara W."** (first name and last initial, or first name alone) everywhere a collaborator is named on the canvas and in lock or conflict messages. D-33 · **ported** (`core/names.py`, F8-S1; the item row, the Warn me banner, the lock and conflict messages, F8-S9 and S12; the draft tag, F8-S13. Kept on the pdf.js canvas, F5-S17 and S19; F6 and F7 keep it) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Canvas rendering can be switched to high resolution, with a perf HUD available. `src/components/takeoff/CanvasPerfHud.tsx`, `src/lib/takeoff/diagnostics/` · **missing**
- [ ] A reference sheet opens in a second canvas pane beside the working sheet. `src/components/takeoff/ReferenceCanvasPane.tsx` · **missing**

**Canvas chrome**

- [x] A canvas top bar shows the draw modifiers and the scale status, with on and off labels rather than unlabelled toggles. `.lovable/plan/canvas-top-bar-draw-modifiers-scale-status-2026-08-13.md`, `.lovable/plan/canvas-bar-on-off-labels-drop-freehand-and-verify-2026-08-13.md` · **ported** (F7-S23, D-74: the canvas bar "Ortho: On · Snap: On · Auto Merge: On · Auto Scroll: On" and the scale at its end, legacy's labels) · *smoke-tested (D-70)*
- [x] The canvas status bar is compact, with softer selected colours, and its height is fixed so the sheet never shifts when it changes. `.lovable/plan/canvas-status-bar-compact-height-softer-selected-colors-2026-08-13.md`, `.lovable/plan/plan-fix-bottom-bar-height-to-prevent-canvas-sheet-shift-2026-08-22.md` · **ported** (F7-S23, D-74: a row of fixed height across the top of the canvas, the scale at its right end; toggling never moves the sheet; Ortho on by default, as legacy's) · *smoke-tested (D-70)*
- [x] Every in-draw hint stays inside the canvas rather than being clipped at its edge. `.lovable/plan/keep-every-in-draw-hint-inside-the-canvas-2026-08-23.md` · **ported** (F7-S23, D-74: the hint drawn inside the canvas) · *smoke-tested (D-70)*
- [x] An in-progress markup action bar has a light yellow background so it reads as unfinished. `.lovable/plan/plan-light-yellow-background-for-in-progress-markup-action-b-2026-08-22.md` · **ported** (F7-S23, D-74; round 2 B, D-80: the amber group while drawing) · *smoke-tested (D-70)*
- [ ] The selection chip appears only on hover over the drag button. `.lovable/plan/selection-chip-only-on-hover-over-the-drag-button-2026-08-23.md` · **missing**
- [x] Unselected sections and positives are not dimmed. `.lovable/plan/stop-dimming-unselected-sections-and-positives-2026-08-23.md` · **ported** (F7-S12: a selected section is marked alone and the others keep their look, `f7-d` step 2) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Press and drag places a circle or an ellipse in one gesture, alongside the two-click mode. `.lovable/plan/press-and-drag-for-circle-ellipse-shape-modes-2026-08-23.md` · **ported** (F7-S4 AC5, `f7-b` step 4) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*; D-79, 2026-09-28: legacy's box-drag in Point to Point for Area, Linear (a closed box run) and Segment, never Arc, with its green dashed rubber band, *smoke-tested (D-70)*
- [x] A mode dropdown on the Linear and Area tools names the current mode, with one consistent label set shared by the toolbar and the contextual group. `src/components/takeoff/drawModes.tsx` · **ported** (F7-S23: the toolbar's carets and the action group's mode dropdown share legacy's mode labels) · *smoke-tested (D-70)*
- [x] Icons in the contextual action group are sized consistently, and toolbar button spacing is even. `.lovable/plan/fix-icon-sizing-in-the-contextual-action-group-2026-08-23.md`, `.lovable/plan/even-out-the-spacing-around-the-tool-buttons-2026-08-14.md` · **ported** (round 2 B, D-80: legacy's 24, 48 and 11 px toolbar sizes, 16 px carets, the action group's icons one size) · *smoke-tested (D-70)*
- [ ] The dock placement tip sits close to the cursor rather than far from it. `.lovable/plan/shrink-the-gap-between-cursor-and-the-dock-placement-tip-2026-08-25.md` · **missing**
- [x] The hover figure matches the shape being pointed at, not a neighbouring run. `.lovable/plan/why-the-hover-figure-doesn-t-match-the-shape-you-re-pointing-2026-08-21.md` · **ported** (F7-S25, D-84, 2026-09-28: legacy's panel, lines, 5 px rest, placement and area highlight; *smoke-tested (D-70)*)

## 11. Estimating

The Estimating tab. `src/components/estimate/ProjectEstimatingView.tsx` (5,138 lines).

- [x] The estimate table lists every takeoff item, synced live from Takeoff, with parent items bold and sub-items in takeoff order. `src/components/estimate/ProjectEstimatingView.tsx` · **ported** (F9 Block A, D-88, 2026-09-28: `lib/estimate/lines.ts` derives the rows from the takeoff screen's own queries, legacy's exclusions and order, Item No. 1..N; a classification set from outside the tab regrouped it without a reload) · *smoke-tested (D-70)*
- [x] Enter Rate, Unit Material Cost, Unit Man Hours, Unit Equipment and Per Hour Wage per line, and see Item Cost, Total Material Cost, Total Labor Cost, Total Man Hours, Total Equipment and TOTAL computed. `src/components/estimate/ProjectEstimatingView.tsx`, table `estimating_line_costs` · **ported** (F9 Block B, D-89: the rates on `estimate_line_item`, legacy's `costing.ts` in the browser; Wall 40 LF at 0.5 MH, $40/h, $3 material, $100 subcontract read $1,020.00, the group chip and TOTAL with it; a second window followed) · *smoke-tested (D-70)*
- [x] Entering a rate does not reload the table. `.lovable/plan/stop-the-estimating-table-reloading-on-every-rate-entry-2026-08-11.md` · **ported** (F9 Block B: the figure moves at once, then the one line's refetch; the grid never reloads) · *smoke-tested (D-70)*
- [x] Set a wastage percentage on one line or on every line, and see Qty with Wastage and Total Qty. `src/components/estimate/WastageDialog.tsx`, table `estimating_unit_wastage` · **ported** (F9-S5, D-89: legacy's dialog, four targets; LF 10 % to all lines lifted Wall to 44 and $1,112.00, in both windows) · *smoke-tested (D-70)*
- [x] Group by classification, layer, folder, subcontractor, or nothing, from one Group by control. `src/components/estimate/ProjectEstimatingView.tsx` · **ported** (F9 Block A, D-88: live legacy's one select, "Group rows by" Classification, Custom Folder, Scope, Sub-scope, Level 4, Subcontractor, Sheet, and "Layer tabs" Main layer per tab or All layers in one tab; groups by node, D-96 amending D-88 Q8; Sub-scope and Level 4 dropped from the menu by D-125, beyond legacy) · *smoke-tested (D-70)*
- [x] Group headers carry summary text that follows the header's text colour, with a spacer row before each and blank spacer rows around parent blocks. `src/components/estimate/ProjectEstimatingView.tsx` · **ported** (F9, 2026-09-29: the "(n) MH · cost" summary takes the header's own text colour, softened; the spacers as the line below) · *smoke-tested (D-70)*
- [x] Add, rename and remove custom columns. `table estimate_custom_columns`, `estimate_custom_values` · **ported** (F9-S8: legacy's Add custom column…, rename, remove with "Remove the column \"X\"? Everything typed into it on this project is deleted.", free-text cells per takeoff item; Supplier added, "Acme Hardware" kept across a reload, renamed Vendor, removed) · *smoke-tested (D-70)*
- [x] Add a Subcontract column and assign subcontractors per line, grouped by division. `src/components/estimate/SubcontractorsDialog.tsx` · **ported** (F9-S4 the Subcontract column, typed per line; F9-S9 legacy's Manage subcontractors…, This project or Workspace defaults, Reset to workspace default, grouping by the resolved package; Building Concrete repackaged to Masonry for the project, reset back to Concrete) · *smoke-tested (D-70)*
- [x] Insert a row above or below any row. `.lovable/plan/insert-a-row-in-the-estimating-table-2026-09-19.md` · **ported** (F9-S7, D-88 Q5: legacy's dialog, a shapeless count item with a "Manual line" override in the anchor's folder and layer, placed by renumbering the folder; "Allowance — fencing", 3 EA, landed below Doors with Takeoff Ref. 1) · *smoke-tested (D-70)*
- [x] Add a sub-item from the right-click menu, and quick-edit a sub-item from the table without opening the full dialog. `src/components/estimate/SubItemQuickEditDialog.tsx` (696 lines) · **ported** (F9-S7: Add Sub-item from the row menu; legacy's Edit sub-item on a double-click of Assembly, Qty or Unit, through F6's sub-items write; Rebar changed to LF and back) · *smoke-tested (D-70)*
- [x] Edit layer and folder multipliers from the estimating tab. `src/components/estimate/ProjectEstimatingView.tsx` · **ported** (F9-S6: legacy's "How this multiplier is built", the layer and folder chain, each step editable for a seat that can edit takeoff; Building Concrete ×2 put Wall at $2,124.00, back to 1 at $1,112.00, the Multiplier column hid again) · *smoke-tested (D-70)*
- [x] Leave a comment on a line and read it back. rpc `set_estimating_line_comment` · **ported** (F9-S7: `POST …/costs/{item}/comment`, legacy's "{text} — {name}, {date}" on a new line, `canComment` without pricing rights; read back in the Comments column) · *smoke-tested (D-70)*
- [ ] Show a line's change history, with who modified it and when. `src/components/estimate/ItemHistoryDialog.tsx` · **missing**
- [x] "Go to markup" and "Go To Page" jump from an estimate row to the measurement on the sheet. `src/components/estimate/ProjectEstimatingView.tsx` · **ported** (F9-S7: the row menu's "Go To Page {page}", or "Go To Page…" and each page, and the Takeoff Ref. link; 2026-09-29, legacy's `focusItem` handoff, which is what its code calls "Go to markup": each returns to Takeoff with Select armed and the line's item selected; Doors' Go To Page opened Page 1 with Doors chosen) · *smoke-tested (D-70)*
- [x] The format panel sets fonts, text and fill colours per header type, row heights in px per row type, decimals, thousands separator, zebra striping, grid lines, borders, frozen main header and tab colour. `src/components/estimate/FormatPanel.tsx`, table `estimating_format_themes` · **ported** (F9-S10, D-92: fonts, header and data sizes, fill and text per header type and parent rows, row heights for items, group headers and column headers, decimals, thousands, zebra, grid-line presets; the workbook follows. 2026-09-29: legacy's Grid & borders (Line weight, Line color, Header bottom border, Group header separator, Outline around table, in the grid and the workbook's lines), Empty row and Total row heights, and the open layer tab's colour; Medium and a green line turned every rule, the header and group rules and the frame green and heavier, and reset went back to the tokens. Then legacy's row heights per header species and for sub-items, "Group headers" setting all of them and reading "mixed" when they differ; Classification at 32 px and sub-items at 34 px moved only those rows. Frozen header: Freeze / Unfreeze Header (earlier). Not built, beyond this line: legacy's text-size deltas and default column width) · *smoke-tested (D-70)*
- [x] A format theme saves as "My formatting" or as the workspace format, and survives a refresh. `src/hooks/useEstimatingFormat.ts` · **ported** (F9-S10, D-92: Default read-only, Customise as My formatting, the workspace format for owners and admins, Share with teammates; kept across a reload) · *smoke-tested (D-70)*
- [x] Export to a live formula workbook, choosing visible or all columns and rows, grouping on or off, formulas on or off, grid lines on or off, and all layers in one tab or one tab per main layer. `src/components/estimate/ExportOptionsDialog.tsx` · **ported** (F9-S11, D-90: legacy's dialog and library; the exported "Base Bid" sheet read back with =D4*(1+G4), =H4*I4, =J4*K4, =L4+N4+P4+Q4 and a TOTAL of the lines only; "Riverside Medical Center - Estimate V1 - 2026-09-28.xlsx") · *smoke-tested (D-70)*
- [x] Live Excel formulas are written for derived sub-items, so the workbook recalculates. `.lovable/plan/live-excel-formulas-for-derived-sub-items-2026-09-03.md` · **ported** (F9, 2026-09-29: `lib/estimate/exportFormulas.ts`, legacy's `toExcelExpression`; legacy's own answers reproduced: `{qty:LINEAR.d1.d2@CY}` → 165.95*2*4/27, `{qty:LINEAR.d3@SY}` → 165.95*0.5/9, `2/{qty:LINEAR.d3@SF}` → 2/(165.95*0.5); an unknown dimension keeps the number. Every expression is kept only when our evaluator reproduces the stored quantity from the same environment, where legacy checks only plain arithmetic. The measured length, area or count is the owning item's quantity (the tab holds no sheet scales), so a `PERIMETER` or an area parent's `LINEAR` keeps the number. `AREA_SY`-style identifiers are written too, beyond legacy. The exported Rebar read `=1066.666667`) · *smoke-tested (D-70)*
- [x] A deleted takeoff item orphans its priced line rather than deleting it, and the line renders flagged. D-09, `src/components/estimate/ProjectEstimatingView.tsx` · **retired by D-50 (the founder, 2026-09-27)**: a deleted item's estimate line is deleted with it, so the estimate never shows a quantity that nothing measures. The delete's confirm names the item first. Driven by `f5-s14` AC3: after a sheet delete, the deleted items' lines are gone
- [x] Changes by another estimator reach an open estimate live. `src/components/estimate/ProjectEstimatingView.tsx` · **ported** (D-10; F9 Blocks A to D: takeoff's events regroup the tab, `estimate.line.changed` and `estimate.settings.changed` refetch rates, wastage, comments, columns and packages; a second window showed LF 10 % at once, beyond legacy's) · *smoke-tested (D-70)*

**Table presentation**

- [x] Parent rows are bold, sub-items sit in takeoff order beneath them, and a parent row always follows its own sub-items when the sort changes. `.lovable/plan/parent-items-bold-sub-items-in-takeoff-order-estimating-tab-2026-08-08.md`, `.lovable/plan/parent-rows-follow-their-sub-items-in-the-estimating-tab-2026-08-08.md` · **ported** (F9-S1: a parent leaves a group none of its sub-items reached, and a bold copy stands above them where they are; Rebar filed under DIV 03 took a bold Slab with it) · *smoke-tested (D-70)*
- [x] Blank spacer rows sit around parent blocks, and a spacer precedes each group header, with the total row matching. `.lovable/plan/blank-spacer-rows-around-parent-blocks-estimating-tab-2026-08-08.md`, `.lovable/plan/estimating-tab-spacer-before-group-headers-total-row-matches-2026-08-24.md` · **ported** (F9, 2026-09-29: `spacersAbove` in `lib/estimate/lines.ts`, legacy's 8 px blank above a parent block, below it before a separate line, and above a header that follows data rows, never two in a row, display only; TOTAL takes the column headers' Format fill and text; a red header theme turned TOTAL red with it) · *smoke-tested (D-70)*
- [x] Format colours are set separately for classification, scope and custom folder headers, one colour per real header type. `.lovable/plan/format-colors-separate-classification-scope-and-custom-folde-2026-08-17.md`, `.lovable/plan/format-panel-one-color-per-real-header-type-2026-08-17.md` · **ported** (F9-S10: one fill and text per real header type: layer, sub-layer, classification, scope, custom folder, subcontractor, sheet) · *smoke-tested (D-70)*
- [x] The frozen header's column divider lines do not flicker white while scrolling. `.lovable/plan/fix-frozen-header-s-column-divider-lines-flicker-white-while-2026-08-24.md` · **ported** (F9, 2026-09-29: legacy's fix, frozen header cells draw their divider as an inset shadow over their own fill; unfrozen keeps the borders; the header stayed pinned through a scroll with the cells painting their own lines. The flicker itself is paint timing: a click check) · *smoke-tested (D-70)*
- [x] Unselected layer tabs stay visible in the Estimating tab. `.lovable/plan/plan-make-unselected-layer-tabs-visible-in-estimating-2026-08-24.md` · **ported** (F9-S2: the open tab in the header slate, the others muted and readable) · *smoke-tested (D-70)*
- [x] Keeping an existing rate when the unit changes is offered rather than assumed. `src/components/estimate/ProjectEstimatingView.tsx` ("Keep this rate for the new unit") · **ported as live legacy behaves** (F9-S7: a unit change clears the unit rates entered per the old unit, flags them blinking with legacy's warning and toast, and retyping settles the flag; *smoke-tested (D-70)*. Legacy's "Keep" tick shows only on a flagged rate that still holds a value, and live legacy's unit change always clears, so the tick is unreachable there too: its own comment reads "A cleared rate has nothing to keep". Not built; nothing is assumed either way)

**Live legacy since 12dd119b (`UmeralamDEV`, D-96; `tasks/LEGACY_UMERALAMDEV_DIFF.md`)**

- [x] Deleting an item names the cost components it takes, and undo brings them back with their equipment usage and custom column text. **ported** (diff #1; beyond legacy, where components are not undoable) · *smoke-tested (D-70)*
- [x] A cost component's formulas read the full environment: variables, rough measurements, the item's primitives on every scaled sheet, dimensions, siblings, PARENT. **ported** (diff #2) · *smoke-tested (D-70)*
- [x] The workbook keeps a derived formula only when it gives the app's figure. **ported** (diff #3) · *smoke-tested (D-70)*
- [x] Removing a kind's last component asks: Keep as typed rates, Restore earlier rates, Clear rates. **ported** (diff #4) · *smoke-tested (D-70)*
- [x] An item with cost components takes no sub-items. **ported** (diff #5) · *smoke-tested (D-70)*
- [x] "No quantity" and "Formula error" chips on Item Cost; a formula error keeps the last good total. **ported** (diff #6, #10; D-97, round 3 A1: a labour component without a production rate keeps it too, on the row, its group and TOTAL; legacy drops that one to $0) · *smoke-tested (D-70)*
- [x] Costs… shows component-priced fields read-only, "From components". **ported** (diff #11) · *smoke-tested (D-70)*
- [x] Deleting sub-items asks, naming them and their components; Cancel in Manage sub-items keeps them and saves the rest. **ported** (diff #12) · *smoke-tested (D-70)*
- [x] A component formula has an Insert menu (values, variables with a list-value picker, siblings) and a live preview. **ported** (diff #13) · *smoke-tested (D-70)*
- [x] Cost components listed under their hosts in the Takeoff panel; Add cost component in the item menu and a sub-item row's $. **ported** (diff #14; D-97, round 3 B10: gone from the canvas menu, the founder's call, and before Costs… in the row menu, legacy's order) · *smoke-tested (D-70)*
- [x] In the Sheet pivot, component and shared rows show the sheet's share. **ported** (diff #17) · *smoke-tested (D-70)*
- [x] Components open per host with a chevron; a cost filter opens them all; the workbook writes only the open ones. **ported** (diff #18) · *smoke-tested (D-70)*
- [x] A machine's usage on an item outside its divisions is flagged on the row. **ported** (diff #19, the F9 part) · *smoke-tested (D-70)*
- [x] A host's components list in the order they were added. **ported** (diff #23) · *smoke-tested (D-70)*
- [x] A failed bid-layer read retries (0, 408, 429, 5xx), says why and offers Retry. **ported** (diff #15, F6) · *smoke-tested (D-70)*
- [x] The canvas shows the zoom percentage while zooming and two seconds after. **ported** (diff #16, F7; D-97: never for the fit a sheet opens with; D-103: a click on it opens the zoom menu) · *smoke-tested (D-70)*

## 12. Assemblies

`src/components/takeoff/AssembliesPanel.tsx` (1,343 lines).

- [ ] Browse assemblies in a folder tree with My Assemblies and Starter Pack sources. `src/components/takeoff/AssembliesPanel.tsx`, tables `assembly_templates`, `assembly_folders` · **missing**
- [ ] Search assemblies, and filter them by tag and type. `src/components/library/AssembliesFilterDropdown.tsx`, `AssemblyTagPicker.tsx` · **missing**
- [ ] Create an assembly folder and sub-folder, rename and delete. `src/components/takeoff/AssembliesPanel.tsx` · **missing**
- [ ] Create a starter assembly with a preset classification and a type (Area, Linear, Point Count). `src/components/takeoff/AssembliesPanel.tsx` · **missing**
- [ ] Assembly rows behave exactly like takeoff rows: same icons, same menus, single-click properties, fully editable. `.lovable/plan/match-assemblies-panel-rows-to-takeoff-panel-exactly-2026-08-29.md` · **missing**
- [ ] Add and manage sub-items on an assembly, with components priced per unit. `src/components/takeoff/AssemblyManagerDialog.tsx`, tables `assembly_template_children`, `assembly_template_costs` · **missing**
- [ ] An assembly component can be Measured, Fixed or Per item, with rounding Nearest, Round up or Round down. `src/components/takeoff/AssemblyManagerDialog.tsx` · **missing**
- [ ] "Use on sheet" places an assembly as a new takeoff item carrying its sub-items and costs. `src/lib/takeoff/assemblies/placeTemplate.ts` · **missing**
- [ ] Save an existing takeoff item as a new assembly, into a chosen or newly created folder. `src/components/takeoff/SaveAsAssemblyDialog.tsx`, `src/lib/takeoff/assemblies/saveTemplate.ts` · **missing**
- [ ] Link an assembly to a takeoff item, and unlink it, both recorded in the item history. `src/hooks/useTakeoffAssemblies.ts`, tables `takeoff_assemblies`, `takeoff_assembly_components` · **missing**
- [ ] Assembly properties match the takeoff item properties dialog. `.lovable/plan/assembly-properties-match-the-takeoff-item-properties-dialog-2026-08-29.md` · **missing**
- [ ] Assemblies mode carries the same header buttons as Takeoff, plus its own source dropdown. `.lovable/plan/assemblies-mode-same-header-buttons-as-takeoff-dedicated-dro-2026-08-29.md` · **missing**
- [ ] The assemblies row controls menu stays inside the panel at the extreme right rather than opening off-screen. `.lovable/plan/fix-assemblies-panel-row-controls-menu-at-extreme-right-no-s-2026-08-29.md` · **missing**
- [ ] Takeoff layers can be seeded from the Starter Pack. `.lovable/plan/takeoff-layers-assemblies-starter-pack-2026-08-13.md` · **missing**

## 13. Library

`/library`. `src/pages/Library.tsx` (797 lines).

- [ ] Browse the cost library: description, unit, material price, unit labor hours, make/model/MFR, subcontractor, CSI division, notes and two reference links. `src/pages/Library.tsx`, table `library_items` · **missing**
- [ ] Filter by CSI division and by subcontractor, and search. `src/pages/Library.tsx` · **missing**
- [ ] Select rows, select all on a page, and add selected items into an estimate. `src/pages/Library.tsx` · **missing**
- [ ] Override a library item's price for this workspace only. `src/pages/Library.tsx`, table `workspace_library_overrides` · **missing**
- [ ] Replace the whole library from an uploaded file, with per-row errors reported. `src/pages/Library.tsx` · **missing**
- [ ] Export the library, with a "Fetching all items, this may take a moment." progress state. `src/pages/Library.tsx` · **missing**
- [ ] Tag library assemblies and save the tags. `src/components/library/AssemblyTagPicker.tsx` · **missing**

## 14. Markup

The Collaborator tab, the $9.99 tier. `src/components/takeoff/ReviewMarkupLayer.tsx`
(826 lines), `NoteLayer.tsx` (764 lines), `HighlighterLayer.tsx`.

- [ ] Place a cloud, callout, arrow, note or highlight, and select it afterwards. `src/components/takeoff/ReviewMarkupLayer.tsx`, `src/hooks/useReviewMarkups.ts` · **missing**
- [ ] Move a markup, move a callout leader, move an arrow end, and resize a cloud, by dragging handles. `src/components/takeoff/ReviewMarkupLayer.tsx` · **missing**
- [ ] Edit callout and note text inline. `src/components/takeoff/ReviewMarkupLayer.tsx`, `NoteLayer.tsx` · **missing**
- [ ] Delete a markup with Delete or Backspace, and undo it with Ctrl+Z. `src/components/takeoff/ReviewMarkupLayer.tsx` · **missing**
- [ ] Change a markup's colour, background colour, opacity and text colour from its own palette. `src/components/takeoff/props/PropertiesPanel.tsx` · **missing**
- [ ] The always-on properties panel edits the selected markup: colour, fill, opacity, border, line width, line end, head size, font, font size, bold, italic, underline, text colour, text scale, label position, bubble size, and auto-fit or fixed size. `src/components/takeoff/props/PropertiesPanel.tsx` · **missing**
- [ ] "Scale with zoom" or fixed size, per markup. `src/components/takeoff/props/PropertiesPanel.tsx` · **missing**
- [ ] "Reset to defaults" restores a markup's style. `src/components/takeoff/props/PropertiesPanel.tsx` · **missing**
- [ ] The action bar for a selected markup sits next to the tools, not at the far right, and turns light yellow while a markup is in progress. `src/components/takeoff/DrawActionStrip.tsx` · **missing**
- [ ] Box-select several markups and act on all of them from one action bar. `.lovable/plan/box-select-markups-selection-action-bar-and-a-selection-righ-2026-09-01.md` · **missing**
- [ ] Highlights, notes and docks each arrive live for other viewers. `src/hooks/useHighlights.ts`, `useNotes.ts`, `useDocks.ts` · **missing** (D-10; the transport is built, F8. The events `takeoff.dock.changed`, `takeoff.highlight.changed` and `takeoff.note.changed` are named and F11 emits them)
- [ ] A collaborator-plan user gets the markup tools and not the measure tools. `src/components/takeoff/Toolbar.tsx` · **missing**

## 15. Evidence and snippets

`src/components/takeoff/EvidencePanel.tsx`, `src/hooks/useEvidence.ts`.

- [ ] Drag the Snapshot tool over an area to capture it as a snippet. `src/components/takeoff/Toolbar.tsx`, table `evidence_snippets` · **missing**
- [ ] Name, tag and annotate a snippet, with built-in and custom tag types. `src/components/takeoff/SnippetDetailsDialog.tsx`, `src/hooks/useEvidenceTagTypes.ts`, table `evidence_tag_types` · **missing**
- [ ] List snippets and bookmarks in their own panel, with a row menu on each. `src/components/takeoff/EvidencePanel.tsx` · **partial** (D-77, 2026-09-28: the Bookmarks | Snippets pane under the Sheets panel; Bookmarks with Open sheet and Remove bookmark; Snippets waits for the Snapshot tool, F11)
- [ ] Open a snippet in a floating preview window. `src/components/takeoff/SnippetPreviewWindow.tsx` · **missing**
- [ ] Snippets do not disappear when the page changes. `.lovable/plan/snippets-stop-them-disappearing-when-you-change-pages-2026-08-01.md` · **missing**
- [ ] Link a snippet to a takeoff item, and unlink it. `src/components/takeoff/LinkEvidenceToItemDialog.tsx`, `src/hooks/useEvidenceLinks.ts`, table `takeoff_item_evidence_links` · **missing**
- [ ] View every snippet linked to an item, searchable by title or tag. `src/components/takeoff/LinkedEvidenceViewerDialog.tsx` · **missing**
- [ ] Evidence links reach the Estimating tab live. `src/components/estimate/ProjectEstimatingView.tsx` · **missing** (D-10)
- [ ] Dock a snapshot or a sheet thumbnail onto a sheet, with a border colour and an optional hyperlink to another sheet. `src/components/takeoff/DockSetupDialog.tsx`, `DockLayer.tsx` · **missing**

## 16. Earthwork

The Earthwork tab. `src/lib/takeoff/earthwork/`.

**Drawing the surfaces**

- [ ] Trace a contour line, entering its elevation on Enter. `src/components/takeoff/EarthworkToolbarGroup.tsx`, `src/lib/takeoff/earthwork/trace/` · **missing**
- [ ] Place a spot elevation, entering the elevation per click. `src/components/takeoff/ElevationPopover.tsx` · **missing**
- [ ] Edit a spot elevation inline from the Quantity Table, using the same range and parse contract as the canvas popover. `src/lib/takeoff/earthwork/elevation.ts` · **missing**
- [ ] Elevations are stored in canonical feet on every sheet regardless of the sheet's display system, converting metric at entry and back at display. `src/lib/takeoff/earthwork/elevation.ts` · **missing**
- [ ] Tag a contour or spot as Existing ground (EG) or Proposed grade (FG). `src/components/takeoff/EarthworkToolbarGroup.tsx`, `src/lib/takeoff/earthwork/roles.ts` · **missing**
- [ ] Draw a work boundary that limits the calculation, a hard singleton per sheet. `src/lib/takeoff/earthwork/containers.ts` · **missing**
- [ ] Contours and spots do not create one item per drawn line: every new contour appends a run onto one container item per (sheet, surface), and spots onto the spot container. `src/lib/takeoff/earthwork/containers.ts` · **missing**
- [ ] A per-(item, sheet) FIFO commit queue serialises contour commits, so two rapid commits cannot collapse to last-write-wins on `vertices_json` and silently drop a run. `src/lib/takeoff/earthwork/commitQueue.ts` · **missing**
- [ ] When a queued commit is rejected the queue for that key halts, and every later job resolves as halted rather than running or being silently dropped. `src/lib/takeoff/earthwork/commitQueue.ts` · **missing**
- [ ] The first earthwork input on a blank project files itself under DIV 31 Earthwork, Earthwork & Grading, with mirrors per classification system, and never overwrites a folder the user chose. `src/lib/takeoff/earthwork/defaultFolder.ts` · **missing**
- [ ] Choose which earthwork markups an item gets when creating or copying it, including the classification choice on a duplicate. `.lovable/plan/choose-earthwork-markups-when-creating-or-copying-an-item-2026-08-17.md`, `.lovable/plan/earthwork-markups-folder-duplicate-classification-choice-2026-08-17.md` · **missing**
- [ ] The Area tool used from the Earthwork tab stays on Earthwork rather than jumping back to Takeoff. `.lovable/plan/fix-area-tool-from-earthwork-jumps-back-to-takeoff-and-hides-2026-08-17.md` · **missing**

**Auto Trace**

- [ ] Hovering the sheet with Trace armed highlights the contour under the cursor at full PDF resolution, so what is seen before clicking is exactly the PDF line. `src/lib/takeoff/earthwork/trace/contourTrace.ts` · **missing**
- [ ] Hit testing runs off a uniform grid over segments, so a hover query costs candidates-near-the-cursor rather than a sweep of every polyline on a dense civil sheet. `src/lib/takeoff/earthwork/trace/hitTest.ts` · **missing**
- [ ] The extractor pulls every styled stroked subpath from the sheet, then drops what cannot be a contour: too short, wrong style, title block rules, hatching, leaders, north arrows, property lines. Filters are conservative, because a contour wrongly dropped is invisible to the user. `src/lib/takeoff/earthwork/trace/contourTrace.ts` · **missing**
- [ ] The length filter is applied after stitching, so a contour chopped into short dashes survives it. `src/lib/takeoff/earthwork/trace/contourTrace.ts` · **missing**
- [ ] **Stitching rejoins the fragments of one contour**, handling both causes: an elevation label set into the line, and a dashed proposed contour arriving as dozens of subpaths. `src/lib/takeoff/earthwork/trace/stitch.ts` (607 lines) · **missing**
- [ ] The join test is tangent continuity, not collinearity, because a label sitting in a bend is exactly where a straight-line test fails. `src/lib/takeoff/earthwork/trace/stitch.ts` · **missing**
- [ ] A gap takes the dash path only when it matches the configured dash period, not merely when it is small. `src/lib/takeoff/earthwork/trace/stitch.ts` · **missing**
- [ ] **One trace profile per surface**, EG and FG, because existing grade is usually drawn broken and proposed grade continuous, and those two wants are not reconcilable in one set of numbers. The active profile follows the EG/FG toggle in the Earthwork toolbar. `src/lib/takeoff/settings/index.ts` (`TraceProfile`) · **missing**
- [ ] Per profile: simplify tolerance (sheet points), bridge gap tolerance, tangent angle tolerance (degrees), join across line styles, shortest line kept, dash rhythm, and measure the dash period off the sheet instead of trusting the typed value. `src/lib/takeoff/settings/index.ts`, `src/components/takeoff/settings/SettingsDialog.tsx` · **missing**
- [ ] A style filter limits the offer to lines that look like the one picked, or offers everything when null. `src/lib/takeoff/settings/index.ts` (`TraceStyleFilter`) · **missing**
- [ ] Adopting a traced contour simplifies it with Ramer-Douglas-Peucker, in sheet points rather than normalised units so a non-square page is not over-simplified on one axis, and before length is computed so the stored length always matches the stored geometry. `src/lib/takeoff/earthwork/trace/simplify.ts` · **missing**
- [ ] Extractor output is cached in IndexedDB per document and schema version, so reopening a project or returning to a sheet does not pay the "reading this sheet's lines" hang again. Stitching is deliberately not cached, because it depends on tuning the user can change. `src/lib/takeoff/earthwork/trace/traceStore.ts` · **missing**
- [ ] Arming Trace does not freeze the canvas. `.lovable/plan/auto-trace-stop-the-freeze-when-arming-trace-2026-08-28.md` · **missing**
- [ ] Intersecting contours show in blue on the canvas. `.lovable/plan/show-intersecting-contours-in-blue-on-the-canvas-2026-08-28.md` · **missing**

**TIN build**

- [ ] Inputs are collected per surface from contour and spot layers, splitting each layer's flat vertex array on the run sentinel, and emitting parallel point and constraint-edge arrays. `src/lib/takeoff/earthwork/tin/collect.ts` · **missing**
- [ ] Boundary layers are returned separately for render-time clipping, not added to the triangulation input. `src/lib/takeoff/earthwork/tin/collect.ts` · **missing**
- [ ] Preflight runs before triangulation in a fixed order: minimum points, colinearity, duplicate merge, crossing constraints on the merged input, then the flat-surface warning. The compute side never sees an input that would crash the triangulator. `src/lib/takeoff/earthwork/tin/preflight.ts` · **missing**
- [ ] A duplicate point whose elevations conflict is an error, not a silent merge. `src/lib/takeoff/earthwork/tin/preflight.ts` · **missing**
- [ ] Flat surface and points-outside-boundary are warnings that still render, not errors that stop the build. `src/lib/takeoff/earthwork/tin/index.ts` · **missing**
- [ ] A triangulator failure after preflight surfaces as a named engine failure rather than being swallowed. `src/lib/takeoff/earthwork/tin/compute.ts` · **missing**
- [ ] The TIN is cached per sheet and invalidated by a sheet-scoped version key that folds geometry versions, the strip version and the per-item role-depth tuples, so a same-turn depth swap between two items cannot leave the key unchanged. `src/hooks/useTinCache.ts`, `src/lib/takeoff/earthwork/versionKey.ts` · **missing**
- [ ] A TIN render can be toggled on the canvas. `src/components/takeoff/EarthworkToolbarGroup.tsx` · **missing**

**Cut and fill**

- [ ] Calculate guards first: a boundary is required, and both EG and FG must be present and valid. `src/lib/takeoff/earthwork/volume/index.ts` · **missing**
- [ ] EG and FG points are remapped into one index space with every constraint edge preserved, then merged. `src/lib/takeoff/earthwork/volume/index.ts` · **missing**
- [ ] Where a proposed contour crosses an existing one, the intersection is computed, inserted as a union vertex, and both edges split at it, because that crossing is expected input on a grading plan rather than a user error. `src/lib/takeoff/earthwork/volume/crossings.ts` · **missing**
- [ ] Δz is sampled barycentrically at every union vertex from both meshes; a vertex outside either hull is excluded and counted toward a partial-coverage warning. `src/lib/takeoff/earthwork/volume/index.ts` · **missing**
- [ ] Every mixed-sign triangle is split at the Δz=0 crossing, always, with no threshold. `src/lib/takeoff/earthwork/volume/split.ts` · **missing**
- [ ] Prism volume is area in square feet times mean Δz in feet, with positive Δz meaning FG above EG, that is fill. All length and area math converts through the sheet's calibration to canonical feet. `src/lib/takeoff/earthwork/volume/prisms.ts` · **missing**
- [ ] Triangles are clipped against the boundary, fan-triangulated, and accumulated per region. `src/lib/takeoff/earthwork/volume/index.ts` · **missing**
- [ ] Topsoil strip depth is applied per region, and role-tagged areas project their own depth into the calculation in z-order so the top item wins where they overlap. `src/lib/takeoff/earthwork/roles.ts` · **missing**
- [ ] Earthwork reads from the Area channel and never the reverse: area code imports nothing from earthwork. `src/lib/takeoff/earthwork/roles.ts` · **missing**
- [ ] Choose a borrow type (Structural Fill, Engineering Fill) when calculating. `src/components/takeoff/EarthworkCalculateDialog.tsx` · **missing**
- [ ] The volume panel lists Fill, Soil Export and Remaining Site, is resizable, and jumps to the matching row in the Quantity Table. `src/components/takeoff/EarthworkVolumePanel.tsx` · **missing**
- [ ] Volumes report "Volumes ready" or "Volumes computed with warnings", and TIN warnings surface as lines on the canvas. `src/components/takeoff/EarthworkToolbarGroup.tsx` · **missing**
- [ ] **Commit to items.** Per-region Cut, Fill, Net and Strip are materialised as engine-owned takeoff items so they flow through the same estimate mirror as any classified item, with no earthwork special-casing downstream. `src/lib/takeoff/earthwork/computeToItems.ts` · **missing**
- [ ] Computed items are pinned to `source_type = 'earthwork_computed'`, and canvas selection, edit and drag paths refuse them because they own no vertices. `src/lib/takeoff/earthwork/computeToItems.ts` · **missing**
- [ ] Recompute upserts on the key (project, sheet, region, role), so quantities update in place and no duplicates appear; a removed region's items are deleted and their estimate lines follow. `src/lib/takeoff/earthwork/computeToItems.ts` · **missing**
- [ ] Materialised items land in the same folder as the inputs on that sheet. `src/lib/takeoff/earthwork/defaultFolder.ts` · **missing**
- [ ] Earthwork rows sort in one canonical order shared by the Takeoff panel, the per-sheet list and the Estimating tab: source inputs, then Topsoil Stripping, then Topsoil Export, then labelled region Cut and Fill. `src/lib/takeoff/earthwork/sortRank.ts` · **missing**
- [ ] Source inputs (boundary, contours, spots) are excluded from the estimate mirror so they never surface in the Estimating tab, which is why the Scope column is empty for them. `src/lib/takeoff/earthwork/sortRank.ts`, `.lovable/plan/why-the-scope-column-is-empty-for-the-earthwork-rows-2026-08-08.md` · **partial** (F9-S1: boundary, contour and spot elevation items and the Earthwork Markups folder never reach the Estimating rows; not driven, no earthwork on the bench yet)
- [ ] The Calculate snapshot persists per (project, sheet) across refresh, tab switch and sheet switch, and a stale result is flagged by comparing the persisted version key against the live one. `src/lib/takeoff/earthwork/resultsStore.ts` · **missing**

## 17. Auto Count

`src/components/takeoff/AutoCountPanel.tsx` (900 lines),
`src/lib/takeoff/autoCount/` (image, vector and OpenCV matchers).

**Entry and scope**

- [ ] Drag a region over one printed symbol and search for every other instance of it. Auto Count is reached from the region menu. `src/components/takeoff/RegionSelectMenu.tsx`, `src/lib/takeoff/autoCount/scan.ts` (1,581 lines) · **missing**
- [ ] The panel previews the boxed symbol, and clicking the preview jumps back to the source sheet. `src/components/takeoff/AutoCountPanel.tsx` · **missing**
- [ ] **Pages scope:** Current page (default), All pages, or Choose, with a sheet filter box for the Choose case. `src/components/takeoff/AutoCountPanel.tsx` (`PageScope`) · **missing**
- [ ] The scan loops sheets through a refcounted PDF document cache, so a sheet is never opened twice, and yields between chunks so a 60-sheet image scan never freezes the canvas. `src/lib/takeoff/autoCount/scan.ts` · **missing**
- [ ] A running scan is cancellable from the panel through its scan handle. `src/lib/takeoff/autoCount/scan.ts` · **missing**
- [ ] Neither matcher spends AI credits: both are local math. `src/lib/takeoff/autoCount/vectorMatch.ts`, `imageMatch.ts` · **missing**

**Modes**

- [ ] **Vector mode (default).** Strokes intersecting the selection are rasterised into a fixed grid binary mask as the template signature; the page's strokes are union-find clustered into components and each is scored against it. `src/lib/takeoff/autoCount/vectorMatch.ts` (1,266 lines) · **missing**
- [ ] **Image mode.** For scanned sheets and raster symbols with no vector linework, scored with dilated-ink F1 rather than raw-pixel NCC (subpixel fragility) or recall-weighted coverage (saturation on walls and hatching). `src/lib/takeoff/autoCount/imageMatch.ts` (2,116 lines) · **missing**
- [ ] Image mode runs an OpenCV coarse pass over a grayscale page channel, with opencv.js dynamically imported so its ~13 MB never lands in the main bundle. `src/lib/takeoff/autoCount/opencvCoarse.worker.ts`, `grayPage.ts`, `opencvLoader.ts` · **missing**
- [ ] The grayscale channel is additive: the binary ink page the fine scorer consumes is unchanged, because thresholding destroys the sub-pixel hatching that separates two similar fixtures. `src/lib/takeoff/autoCount/grayPage.ts` · **missing**
- [ ] **Vector-only control:** PDF Layers, with an Auto mode that re-derives from retained tagged matcher output when the layer choice changes, without rescanning. `src/components/takeoff/AutoCountPanel.tsx` (`LayersMode`) · **missing**
- [ ] A sheet with no layers says "No layers found on this sheet." rather than offering an empty control. `src/components/takeoff/AutoCountPanel.tsx` · **missing**

**Scoring options**

- [ ] **Sensitivity slider (default 78).** Re-partitions checked and unchecked candidates with no rescan, and a card the user touched by hand keeps its choice. `src/components/takeoff/AutoCountPanel.tsx`, `resultPipeline.ts` · **missing**
- [ ] **Min spacing (NMS IoU, default 0.6, clamped 0.05 to 0.95).** How much two boxes may overlap before the weaker is suppressed. `src/lib/takeoff/autoCount/settings.ts` · **missing**
- [ ] **Include Mirror (default off).** Score the template flipped horizontally, vertically and both, keeping the best orientation. Vector only. `src/lib/takeoff/autoCount/settings.ts` · **missing**
- [ ] **Drop Unique Features (default on).** Suppress anchors on strokes whose normalised geometry occurs exactly once on the page, since those cannot be a repeated symbol. Vector only. `src/lib/takeoff/autoCount/settings.ts` · **missing**
- [ ] **Include Text (default on).** Use the text-glyph evidence channel for letters inside the symbol. Vector only. `src/lib/takeoff/autoCount/settings.ts` · **missing**
- [ ] **Search angles: 8 (45° steps), 4 (90°, default), 2 (0/180) or 1.** Image mode runs one pass per angle. `src/lib/takeoff/autoCount/settings.ts` (`anglesForRotations`) · **missing**
- [ ] **Scale variants: 3 (0.95x / 1.00x / 1.05x consensus, default) or 1 (exact size, faster).** Image only. `src/lib/takeoff/autoCount/settings.ts` · **missing**
- [ ] **Threads: 0 = auto (hardware concurrency minus one, capped at 6), up to 16.** `src/lib/takeoff/autoCount/settings.ts` · **missing**
- [ ] Settings apply to the next scan only and never mutate a finished result set. `src/lib/takeoff/autoCount/settings.ts` · **missing**
- [ ] Settings persist in `localStorage`, and a corrupt or hand-edited value falls back to its default rather than to false or zero, so a bad store cannot silently disable an evidence channel. `src/lib/takeoff/autoCount/settings.ts` (`normalizeAutoCountSettings`) · **missing**
- [ ] Every default equals the value the pre-settings pipeline used, so a fresh install behaves identically to the build before the settings existed. `src/lib/takeoff/autoCount/settings.ts` · **missing**
- [ ] Every matcher ends at candidate and score emission; NMS, threshold partition, saturation detection and funnel summaries live in one shared pipeline, so a mode-specific fix cannot strand the other mode. `src/lib/takeoff/autoCount/resultPipeline.ts` · **missing**

**Review flow**

- [ ] Candidates render as cards with a checkbox and a match percentage; clicking a card navigates to that sheet and position. `src/components/takeoff/AutoCountCandidateCard.tsx` · **missing**
- [ ] **Adaptive valley cut.** Unchecked candidates are sorted by score, the largest gap below the auto-check bar is found, and everything below it drops into a low-confidence drawer. Presentation only: nothing is rescored, re-admitted or suppressed, and every candidate stays reachable through the drawer. `src/lib/takeoff/autoCount/valleyCut.ts` · **missing**
- [ ] A near-bar guardrail (0.08) keeps any unchecked candidate close to the auto-check bar visible regardless of the cut. `src/lib/takeoff/autoCount/valleyCut.ts` · **missing**
- [ ] **Overlay paint has three states.** At rest checked boxes paint in the item colour and unchecked boxes are fully invisible; hover reveals an unchecked candidate in light blue with a darker border; a clicked card paints as hovered until the next click elsewhere. `src/lib/takeoff/autoCount/overlayPaint.ts`, `AutoCountOverlay.tsx` · **missing**
- [ ] **Progressive merge.** A later pass may only add candidates. An existing candidate is never moved, and a background pass can never override the user's own toggles. `src/components/takeoff/AutoCountPanel.tsx` (`mergeAutoCountPass`) · **missing**
- [ ] Pass progress is shown as completed of total, with a note that extra orientations still running can only add matches. `src/components/takeoff/AutoCountPanel.tsx` · **missing**
- [ ] **Create (N)** hands the accepted set to the standard count New Item dialog, and on confirm the points are stamped as one batch. `src/components/takeoff/AutoCountPanel.tsx` · **missing**
- [ ] The panel is draggable by its header, with a sheet filter and a Debug view showing raw matcher output ("junk included by design"). `src/components/takeoff/AutoCountPanel.tsx`, `panelDrag.ts` · **missing**

**Warnings and limits**

- [ ] A page that produced nothing says "Auto Count could not scan this page." and gives mode-specific advice: vector suggests Image mode or a tighter selection, image suggests lower sensitivity or fewer angles. `src/components/takeoff/AutoCountPanel.tsx` (`AutoCountZeroState`) · **missing**
- [ ] A scan stopped before its first pass completed says so and never renders sensitivity advice, because there is no result to advise on. `src/components/takeoff/AutoCountPanel.tsx` · **missing**
- [ ] Saturation on a pass is detected and reported rather than flooding the grid. `src/lib/takeoff/autoCount/resultPipeline.ts` · **missing**
- [ ] A sheet skipped by the canvas governor is reported ("1 sheet was not searched"). `src/components/takeoff/AutoCountPanel.tsx` · **missing**
- [ ] **Canvas governor.** The real per-engine canvas ceiling is probed once when the panel opens, cached for the tab's lifetime, and never re-probed mid-run, so a scan's admission decisions cannot shift underneath it. `src/lib/takeoff/autoCount/canvasProbe.ts` · **missing**
- [ ] **Raster memory contract.** Page rasters are read back in bands and budgeted per pixel, so image mode cannot trip "Out of memory at ImageData creation" on a large sheet. `src/lib/takeoff/autoCount/rasterBudget.ts` (670 lines) · **missing**
- [ ] A restart whose scan inputs are value-equal to the running scan is refused rather than duplicating work. `src/components/takeoff/AutoCountPanel.tsx` · **missing**
- [ ] A failed scan shows "Scan failed" with Retry and Run again. `src/components/takeoff/AutoCountPanel.tsx` · **missing**

## 18. AI tools

Metered against the workspace wallet before the model runs.

**Ask AI on a region**

- [ ] Drag a region and ask a free-text question about it; the crop plus the question go to the model, which answers in plain estimator language. `src/components/takeoff/RegionAskAiDialog.tsx`, `supabase/functions/region-ask-ai/` · **missing**
- [ ] Suggested prompts are offered: "What is in this region?", "Read this schedule as rows.", "List every callout and its quantity.", "What material and thickness is specified here?". `src/components/takeoff/RegionAskAiDialog.tsx` · **missing**
- [ ] The crop is shown beside the answer, and "Ask again" re-runs with a new question on the same crop. `src/components/takeoff/RegionAskAiDialog.tsx` · **missing**

**Extract Schedule**

- [ ] Drag a region over a schedule and extract its rows, with the model returning the printed column headings, one cell map per row, and a quantity only when the schedule actually carries one. `supabase/functions/region-extract-schedule/` · **missing**
- [ ] The detected schedule type is shown as a chip with the item type it maps to: door, window, fixture and equipment schedules become Count (EA); finish, flooring and ceiling schedules become Area (SF). `src/components/takeoff/ExtractScheduleDialog.tsx` · **missing**
- [ ] A column picker lists one checkbox per detected heading, with All and Clear quick actions, and the selection carries across batches. `src/components/takeoff/ExtractScheduleDialog.tsx` · **missing**
- [ ] The row table is scrollable with an opaque sticky header, one column per included heading, and a per-row include checkbox. `src/components/takeoff/ExtractScheduleDialog.tsx` · **missing**
- [ ] Item names compose from the checked cells, with a chosen separator; a cell whose printed text is only a dash or placeholder is dropped, and repeated or trailing separators never survive. `src/lib/takeoff/schedule/scheduleExtraction.ts` · **missing**
- [ ] When the schedule has a quantity column, the first batch asks whether to use the schedule quantities or start at zero and keep the printed figure as a note. `src/components/takeoff/ExtractScheduleDialog.tsx` · **missing**
- [ ] "Show existing items and modify" reveals rows already created; selecting them switches the primary button from Create to Modify, which updates the item name, and the quantity only when the schedule had one. `src/components/takeoff/ExtractScheduleDialog.tsx` · **missing**
- [ ] Create (N) opens a compact second step asking for a classification rather than a folder, which resolves to a folder through the project's system stamp. `src/components/takeoff/ExtractScheduleDialog.tsx` · **missing**
- [ ] **One extraction, many batches.** After a batch is created the dialog stays open on the same extracted result, created rows get a "Created" chip and are unchecked, and a running summary reads "12 of 30 rows created", so a second subset costs no further AI spend. `src/components/takeoff/ExtractScheduleDialog.tsx` · **missing**
- [ ] Each batch pushes its own undo entry, so undo peels batches one at a time. `src/components/takeoff/ExtractScheduleDialog.tsx` · **missing**
- [ ] Closing the dialog discards the extraction, and re-dragging the region costs a new call. `src/components/takeoff/ExtractScheduleDialog.tsx` · **missing**
- [ ] A region with no readable table says "No schedule rows found in that box." `src/components/takeoff/ExtractScheduleDialog.tsx` · **missing**
- [ ] A clickable marker sits over the extracted schedule region on the sheet. `src/components/takeoff/ScheduleMarkerLayer.tsx` · **missing**
- [ ] The extraction is stored so it can be reopened. table `schedule_extractions`, `src/hooks/useScheduleExtractions.ts` · **missing**

**Name and scale from a region**

- [ ] Read a sheet's title block with OCR and write `sheet_number` and `sheet_name` back onto the row. `supabase/functions/ocr-sheet-titleblock/` · **missing**
- [ ] Drag a sheet-number region and preview what it recovers, with Draw, Redraw and an optional sheet name field. `src/components/takeoff/NameFromRegionDialog.tsx` · **missing**
- [ ] Recovered lines are classified into number and name rather than pasted verbatim. `src/lib/takeoff/naming/classifyRegionLines.ts`, `regionText.ts` · **missing**
- [ ] Apply the same region across a range of pages, with per-page results marked Empty, Duplicate, Error or Not set, and "No pages in range." when the range is empty. `src/components/takeoff/NameFromRegionDialog.tsx` · **missing**
- [ ] A region with no text says "No text found in this region" instead of writing an empty name. `src/components/takeoff/NameFromRegionDialog.tsx` · **missing**
- [ ] Read a scale out of a dragged region and apply it to this sheet or to every sheet. `src/components/takeoff/ScaleFromRegionDialog.tsx` · **missing**
- [ ] When drawn dimensions disagree with the printed scale the dialog says so and offers "Apply printed scale anyway" rather than silently choosing. `src/components/takeoff/ScaleFromRegionDialog.tsx` · **missing**
- [ ] **Scale evidence stays on the sheet.** The amber scale box persists after an AI scale is applied, and is reachable from its own menu. `src/components/takeoff/ScaleEvidenceMenu.tsx`, `src/lib/takeoff/scaleEvidence.ts` · **missing**
- [ ] A verified dimension is drawn as its own layer on the sheet, so the evidence for a scale is visible next to it. `src/components/takeoff/VerifiedDimensionLayer.tsx` · **missing**

**Metering**

- [ ] Every AI action checks the workspace wallet before the model runs and is refused when credits are exhausted. `supabase/functions/region-ask-ai/`, tables `workspace_wallet`, `ai_action_credit_cost` · **missing**
- [ ] A low balance surfaces as a toast off the returned `credits_remaining` rather than a silent failure. `src/components/takeoff/ExtractScheduleDialog.tsx` · **missing**
- [ ] Each AI call is recorded with its action kind, token counts and credit cost. tables `ai_usage_events`, `credit_ledger`, `src/hooks/useAiCreditsBalance.ts` · **missing**
- [ ] A per-member credit limit is enforced on top of the workspace wallet. `src/hooks/useWorkspaceCreditPolicy.ts`, table `workspace_user_credit_limits` · **missing**

## 19. Reports

`/reports`. `src/pages/Reports.tsx`, two primary sections.

- [ ] **Time & Activities.** A time report per estimator and per project over a chosen range, showing tracked, active, idle and shift hours. `src/components/reports/TimeReportTable.tsx`, `src/hooks/useTimeReport.ts`, tables `work_sessions`, `work_session_daily` · **missing**
- [ ] Set the report range from shared range controls. `src/components/reports/RangeControls.tsx` · **missing**
- [ ] **Takeoff progress.** Sheets calibrated, calibrated percentage, items measured and last activity, per project. `src/components/reports/TakeoffProgressReport.tsx` · **missing**
- [ ] **AI usage.** Calls and credits per estimator, per project and per tool, exportable as CSV. `src/components/reports/AiUsageReport.tsx`, `src/hooks/useAiUsageReport.ts` · **missing**
- [ ] Time is tracked automatically from app use: one session per user, project and open tab, a heartbeat each minute, closed after 15 minutes hidden. `src/hooks/useWorkTracking.ts` · **missing**
- [ ] A manual timer clocks in and out on a project, and suppresses the automatic session while it runs so no minute is counted twice. `src/components/takeoff/WorkTimerChip.tsx`, `src/hooks/useWorkTracking.ts` · **missing**
- [ ] A session freezes the member's role at start, so a later role change never rewrites history. `src/hooks/useWorkTracking.ts` · **missing**
- [ ] A minute counts as active only when input landed inside the idle threshold and the tab was visible. `src/hooks/useWorkTracking.ts` · **missing**
- [ ] Reports honour the workspace visibility setting: admins only, or every member sees their own. `src/components/workspace-settings/TimeTrackingTab.tsx` · **missing**

## 20. Community

`/community`, plus the Community tab inside takeoff.

- [ ] Browse posts in four sections, filtered and searchable. `src/pages/Community.tsx`, `src/components/community/CommunityBoard.tsx`, table `community_posts` · **missing**
- [ ] Create a post with a title and a rich-text body. `src/components/community/NewPostDialog.tsx`, `src/components/community/editor/` · **missing**
- [ ] Attach an image or a file to a post, and attach a bug report. `src/components/community/BugAttachment.tsx`, bucket `community-attachments`, table `community_media` · **missing**
- [ ] Reply to a post, and delete a reply. `src/components/community/CommunityPostView.tsx`, rpc `soft_delete_community_reply`, table `community_replies` · **missing**
- [ ] Upvote a post and remove the upvote. table `community_votes` · **missing**
- [ ] Mark a reply as the answer, and unmark it. `src/components/community/CommunityPostView.tsx` · **missing**
- [ ] Set a post's status: Open, Under Review, Planned, In Progress, Completed. `src/components/community/StatusBadge.tsx` · **missing**
- [ ] Delete a post, with confirmation. rpc `soft_delete_community_post` · **missing**
- [ ] Links in the editor are universal, with no YouTube special case. `.lovable/plan/community-editor-drop-youtube-make-links-universal-2026-08-22.md` · **missing**
- [ ] Read and post to Community from inside the takeoff workspace. `src/components/community/CommunityPanel.tsx` · **missing**

## 21. Billing

Two plans: Collaborator ($9.99/mo, $99.99/yr) and Pro ($29.99/mo, $299.99/yr).
`src/lib/billing/plans.ts`.

- [ ] Start a Stripe Checkout subscription for a plan, a cadence and a seat count. `supabase/functions/create-checkout-session/`, `src/lib/billing/checkout.ts` · **missing**
- [ ] Stripe webhooks keep the workspace's plan in sync on checkout completion, subscription update and subscription deletion, with the signature verified first. `supabase/functions/stripe-webhook/`, table `workspace_billing` · **missing**
- [ ] A new signup is assigned a regional trial tier, with per-tier limits on projects, storage, measurements, AI credits and PDF throttle. `supabase/functions/trial-gate/`, tables `workspace_trial_state`, `billing_country_tiers`, `billing_tier_rules` · **missing**
- [ ] VPN and abuse signals force a stricter tier. `supabase/functions/trial-gate/`, table `account_signals` · **missing**
- [ ] The trial state masks capabilities live, and an expiring trial is visible in the app. `src/hooks/useTrialState.ts`, `src/lib/billing/trialLimits.ts` · **missing**
- [ ] The upgrade modal names what the current plan is missing and offers the upgrade. `src/components/upgrade/UpgradeModal.tsx`, `src/hooks/useUpgradeModal.ts` · **missing**
- [ ] An expired or locked workspace shows a blocking dialog rather than failing writes silently. `src/components/upgrade/WorkspaceLockedDialog.tsx`, `src/components/billing/WorkspaceLockPublisher.tsx`, `src/lib/billing/lockGuard.ts` · **missing**
- [ ] A trial workspace's PDF rendering is throttled by its tier. `src/lib/billing/pdfThrottle.ts` · **missing**
- [ ] The trial upgrade button sits in the app chrome throughout the trial. `src/components/upgrade/TrialUpgradeButton.tsx` · **missing**
- [ ] "Book a demo" submits a demo request from the marketing surface. `src/components/landing2/RequestDemoDialog.tsx`, rpc `submit_demo_request`, table `demo_requests` · **partial** (marketing owns this surface under D-02; the route exists there, the table does not)

## 22. Platform admin

Behind `PlatformRoute`, invisible to customers.

- [ ] **Activity.** Recent sign-ins across the platform, read with the service role. `src/pages/PlatformActivity.tsx`, `supabase/functions/platform-recent-signins/` · **missing**
- [ ] **AI economics.** Record provider pricing per model per million tokens, set a margin, and set a serving-cost target split into input and output anchors. `src/pages/PlatformAiEconomics.tsx`, rpc `platform_ai_economics`, tables `ai_provider_pricing`, `ai_credit_regimes` · **missing**
- [ ] **AI economics.** Define credit packs and link each to a Stripe price, or clear the link. `src/pages/PlatformAiEconomics.tsx`, table `ai_credit_packs` · **missing**
- [ ] **Billing tiers.** Edit per-tier trial limits: max projects, max storage MB, max measurements, AI credits and PDF throttle. `src/pages/PlatformBillingTiers.tsx`, table `billing_tier_rules` · **missing**
- [ ] **Billing tiers.** Map a two-letter country code to a tier, and remove the mapping so it falls back to Tier 3. `src/pages/PlatformBillingTiers.tsx`, table `billing_country_tiers` · **missing**
- [ ] **Billing tiers.** Add a domain to the disposable-email blocklist. `src/pages/PlatformBillingTiers.tsx`, table `disposable_email_domains` · **missing**
- [ ] **Billing tiers.** Override the limits for one named workspace, and lock or unlock a workspace. `src/pages/PlatformBillingTiers.tsx`, table `workspace_limit_overrides` · **missing**
- [ ] Billing secrets report presence only, never values. `supabase/functions/platform-secret-status/` · **missing**

**Admin-only powers inside customer screens**

These do not live on a `/platform/*` route. They are ordinary screens that grow
extra controls when the viewer is a platform admin, which is why they are easy to
miss in a port that only checks the three platform pages.

- [ ] **Starter Pack is editable by platform admins only.** A normal workspace reads the Starter Pack source; a platform admin creates, renames, reclassifies and deletes the assemblies inside it, and those edits reach every workspace. `src/components/takeoff/AssembliesPanel.tsx`, `.lovable/plan/assemblies-starter-pack-source-dropdown-2026-08-13.md` · **missing**
- [ ] The assemblies source dropdown offers Starter Pack alongside My Assemblies, and the write controls appear against Starter Pack only for a platform admin. `src/components/takeoff/AssembliesPanel.tsx` · **missing**
- [ ] **Library bulk replace.** Upload a file that replaces the whole shared library, with per-row errors reported and "No rows found in file" when it parses to nothing. Platform admin only. `src/pages/Library.tsx` · **missing**
- [ ] **Library export.** Export every library item, with a "Fetching all items, this may take a moment." progress state and an "Export failed" path. `src/pages/Library.tsx` · **missing**
- [ ] **Library bulk add.** Select rows, select all on a page, and add the selection into a project in one action. `src/pages/Library.tsx` · **missing**
- [ ] A workspace-level price override on a library item is visibly distinguished from the shared value ("Override for this workspace"), so an admin can tell which figure is theirs. `src/pages/Library.tsx`, table `workspace_library_overrides` · **missing**
- [ ] **Assembly tagging.** Tag library assemblies, with the tag list itself maintained by a platform admin, and filter the panel by tag. `src/components/library/AssemblyTagPicker.tsx`, `AssembliesFilterDropdown.tsx` · **missing**
- [ ] **Developer menu.** Platform-internal pages are reachable from a developer menu in the app chrome rather than by typing a URL, including the AI economics page. `.lovable/plan/surface-the-ai-economics-page-in-the-developer-menu-2026-08-25.md` · **missing**
- [ ] A named person can be granted platform admin and developer access. `.lovable/plan/give-touseef-dev-intelcostestimate-com-admin-developer-acces-2026-08-05.md`, table `platform_admins`, rpc `is_platform_admin` · **missing**
- [ ] Platform admin is distinct from super admin, and both are read through functions rather than a role string in a component. rpcs `is_platform_admin`, `is_super_admin` · **missing**
- [ ] The CSI default template loads once, idempotently, from a checksummed seed file. `supabase/functions/load-csi-template/` · **missing**
- [ ] A sheet whose tiler output is poisoned can be identified and re-rendered. `.lovable/plan/tiler-poisoned-sheets-verification-report-no-build-2026-08-23.md`, table `sheet_render_jobs` · **missing**

## 23. Keyboard and mouse

Every binding on the canvas and in the panels. The resolver ignores every key
while focus is in an `input`, a `textarea` or a `contentEditable` element, so
typing a name never fires a tool. `src/lib/takeoff/engine/shortcuts.ts`.

**Tool keys**

- [x] `V` selects the Select tool. `src/lib/takeoff/engine/shortcuts.ts` · **ported** (F7-S27, D-84, 2026-09-28; *smoke-tested (D-70)*)
- [x] `H` selects Pan (Hand). `src/lib/takeoff/engine/shortcuts.ts` · **ported** (F7-S27, D-84, 2026-09-28; *smoke-tested (D-70)*)
- [x] `L` selects Linear. `src/lib/takeoff/engine/shortcuts.ts` · **ported** (F7-S27, D-84, 2026-09-28; *smoke-tested (D-70)*)
- [x] `A` selects Area. `src/lib/takeoff/engine/shortcuts.ts` · **ported** (F7-S27, D-84, 2026-09-28; *smoke-tested (D-70)*)
- [x] `N` selects Count. `src/lib/takeoff/engine/shortcuts.ts` · **ported** (F7-S27, D-84, 2026-09-28; *smoke-tested (D-70)*)
- [ ] `S` selects Snapshot. `src/lib/takeoff/engine/shortcuts.ts` · **missing** (Snapshot is F11's)
- [ ] `D` selects Dimension. `src/components/takeoff/Toolbar.tsx` · **not ported, as legacy** (D-97: legacy's tooltip says "(D)", but no key arms it and D is Snap to drawing while drawing; ours leaves "(D)" out of the title)
- [x] Every tool key is case-insensitive. `src/lib/takeoff/engine/shortcuts.ts` · **ported** (F7-S27, D-84, 2026-09-28; *smoke-tested (D-70)*)

**While drawing**

- [ ] `S` toggles Snap, `D` toggles Snap PDF, `O` toggles Ortho, and these modifier bindings are live only while a Linear or Area tool is armed so they cannot collide with the tool keys elsewhere. `src/lib/takeoff/engine/shortcuts.ts` · **partial** (F7-S10: S and O mid-draw, `f7-c` step 4; D with Snap PDF)
- [x] `A` mid-draw arms an inline arc segment, claimed before the Area tool binding, and falls back to the tool switch when there is no draft point to arc from. `src/lib/takeoff/engine/shortcuts.ts` · **ported** (F7-S27, D-84, 2026-09-28; *smoke-tested (D-70)*)
- [x] `Enter` finishes the measurement. `src/lib/takeoff/engine/shortcuts.ts` · **ported** (F7-S8, `f7-b` step 7) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] `Backspace` removes the last placed point. `src/lib/takeoff/engine/shortcuts.ts` · **ported** (F7-S8, `f7-b` step 7) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] `Escape` cancels in two stages: the first press drops the in-progress run, the second disarms the tool. `.lovable/plan/two-stage-escape-while-measuring-2026-08-23.md` · **ported** (F7-S8, `f7-b` step 7: the first Escape keeps a run with enough points and drops one without, legacy's rule; the second puts the tool down) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] `Alt` is reserved for ortho fine-tuning during a draw and fires no other binding. `src/lib/takeoff/engine/shortcuts.ts` · **partial** (F7-S10: Alt tunes Ortho to 22.5° while drawing and S and O ignore it; not yet driven by a fixture)
- [ ] Double-click finishes a point-to-point run, the same as Enter. `src/components/takeoff/drawModes.tsx` · **missing**
- [ ] Double-clicking a perimeter or linear segment inserts a vertex there. `.lovable/plan/fix-double-click-on-a-perimeter-or-linear-segment-doesn-t-in-2026-08-22.md` · **missing**

**Selection and editing**

- [x] `Delete` removes the current selection. `src/lib/takeoff/engine/shortcuts.ts` · **ported** (F7-S17, `f7-d` step 4: the selected section, or a count's marks on this sheet; no confirm) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] `Backspace` also deletes a selected markup when not drawing. `src/components/takeoff/ReviewMarkupLayer.tsx`, `NoteLayer.tsx`, `HighlighterLayer.tsx`, `DockLayer.tsx` · **missing**
- [x] `Ctrl+A` selects every markup on the sheet. `.lovable/plan/ctrl-a-select-all-markups-on-the-sheet-2026-09-01.md` · **ported** (F7-S14, `f7-h` step 4) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] `Ctrl+Z` undoes and `Ctrl+Shift+Z` redoes, scoped to the current sheet. `src/components/takeoff/Toolbar.tsx`, `src/lib/takeoff/history/sessionHistory.ts` · **ported** (F7-S22, D-71: Ctrl+Y redoes too; mid-run Ctrl+Z takes the last point, mid count session the last mark, as legacy's order; in a text field the keys are the field's; a sheet that does not own the history does nothing) · *smoke-checked (D-68)*
- [ ] `Escape` closes the open dialog, popover or context menu. `src/components/takeoff/*Dialog.tsx` · **partial** (dialogs close on Escape; there is no canvas-wide handler)

**Find Text**

- [ ] `Ctrl+F` or `Cmd+F` opens Find Text, claimed before the generic modifier bail-out so the browser's own find never opens over the canvas. `src/lib/takeoff/engine/shortcuts.ts` · **missing**
- [ ] Find Text owns that chord only on the sheet-canvas tabs (Takeoff and Earthwork); on Estimating and Community the browser's find is left alone because it is genuinely useful on a grid and on threads. `src/lib/takeoff/engine/shortcuts.ts` · **missing**
- [ ] Mid-draw the chord still resolves so the handler can prevent the browser default, and then does nothing, so drawing continues uninterrupted. `src/lib/takeoff/engine/shortcuts.ts` · **missing**
- [ ] A setting returns `Ctrl+F` to the browser's own find. `src/lib/takeoff/settings/index.ts` (`general.useBrowserFind`) · **missing**

**Mouse**

- [ ] Left-drag on empty sheet area opens the region menu. `src/components/takeoff/RegionSelectMenu.tsx` · **missing**
- [x] Left-click off any markup disarms the box selection. `.lovable/plan/left-click-off-any-markup-disarms-the-box-selection-2026-09-01.md` · **ported** (F7-S14, `f7-h` step 3) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Right-click opens the context menu appropriate to what is under it: a selection, a markup mid-draw, a sheet row, or empty canvas. A multi-selection right-click owns every canvas right-click while it is live. `src/components/takeoff/SelectionContextMenu.tsx`, `SheetContextMenu.tsx` · **ported** (a selection's menu owns every canvas right-click while it is live, `f7-h` step 4; mid-draw, the draw menu, F7-S8; on a shape, legacy's area, Linear and count-mark menus, and on empty canvas the region menu, F7-S24, D-75, *smoke-tested (D-70)*)
- [ ] Middle-button (scroll wheel) drag pans, toggleable in Settings. `src/lib/takeoff/settings/index.ts` (`mouse.panMiddleClick`) · **partial** (D-76: the pan; the Settings toggle waits for F7-S27)
- [ ] Right-button drag pans, toggleable in Settings, and works everywhere on the canvas rather than only over empty areas. `src/lib/takeoff/settings/index.ts` (`mouse.panRightClick`) · **missing**
- [ ] Scroll wheel zooms, with a speed multiplier from 0.25 to 2.5 and an invert option. `src/lib/takeoff/settings/index.ts` (`mouse.zoomSpeed`, `invertScrollZoom`) · **partial** (D-76: the bare wheel zooms at the cursor at legacy's rate, a pinch firmer; the speed and invert settings wait for F7-S27)
- [x] Space-drag pans regardless of the armed tool. `src/features/takeoff/components/SheetCanvas.tsx` · **ported** (driven: with Linear armed, space-drag pans and places no point; proof-backlog, overnight 2026-09-26) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [ ] Edge auto-scroll pans while a drawing tool is armed, with a configurable edge band width, delay before the glide starts, and glide speed. `src/lib/takeoff/settings/index.ts` (`mouse.autoScroll*`) · **missing**
- [ ] Hovering a markup shows the hover panel after a configurable rest delay, and it hides the moment the cursor moves again. `src/lib/takeoff/settings/index.ts` (`general.hoverHintDelayMs`) · **missing**
- [x] Ctrl-click adds to a panel selection and shift-click selects a range, in both the Sheets panel and the Takeoff panel. `src/components/takeoff/SheetTree.tsx`, `QuantityTable.tsx` · **ported** (the Sheets panel, F5 Block D, `f5-s14` AC4; the Takeoff panel, F6-S9, `f6-c` step 10) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Double-click a panel row to rename it, and double-click elsewhere on the row to open Properties. `src/components/takeoff/ItemRowShared.tsx` · **ported** (D-77, 2026-09-28: the name renames, the row opens Properties; *smoke-tested (D-70)*)

## 24. App-wide

**Settings dialog.** One dialog, ten sections, persisted under
`takeoff.settings.v1` with an explicit Save, a per-section Reset and a Restore all
defaults. Same-tab updates broadcast through a window event; cross-tab updates
arrive through storage. `src/components/takeoff/settings/SettingsDialog.tsx`
(882 lines), `src/lib/takeoff/settings/index.ts` (837 lines).

- [ ] **General.** Hover hint on or off, hover delay, `Ctrl+F` handed to the browser, quantity decimal places, main tab text size (small, medium, large) and bold main tab labels. · **missing**
- [ ] **Mouse.** Zoom speed, invert scroll zoom, pan with middle button, pan with right button, auto scroll on or off, auto scroll delay, speed and edge band width. · **missing**
- [ ] **Cursor.** Crosshair show, auto-invert against what is under it, colour, thick lines, opacity, full-span or short ticks, and the gap left open around the click point. · **missing**
- [ ] **Cursor.** Four reticle ticks: show, thickness, opacity, distance from the click point where each starts, and length. · **missing**
- [ ] **Cursor.** Ring: show, auto-invert, colour, size, border width, opacity, shape (circle or square) and the clearance kept between the ring ends and any line crossing it. · **missing**
- [ ] **Cursor.** Centre dot: show, colour and size. · **missing**
- [ ] **Snapping.** Defaults for Snap, Snap PDF (off by default) and Ortho. · **missing**
- [ ] **Takeoffs.** Default Linear mode, default Area mode, legend visible when a project opens, numbered duplicate suffix ("Name (2)", on by default), auto-merge overlapping runs of the same item on commit, and the New Measurement dialog's remembered WBS mode and open or closed state for its WBS and Sub-items bars. · **partial** (F7-S20, D-69: auto-merge on commit, legacy's "Auto Merge: On" toggle in the canvas bar with its title, per session; an area's and a closed Linear box's own overlapping sections, a colleague's never; *smoke-checked (D-68)*. The rest of the line, and the setting's stored default, are F7-S27's)
- [ ] **Trace.** The two Auto Trace profiles, EG and FG, with every knob per profile. See §16. · **missing**
- [ ] **Toolbar.** Hide individual tools by id, and icon size (small 14px, medium 18px, large 24px, with button sizes 36, 40 and 48px). · **missing**
- [ ] **Panels.** Which of Sheets, Bookmarks and Snippets, and Measurements are shown. · **missing**
- [ ] **Sheets.** Sheet naming format (number, name, project, in several orders) and a two-line option putting the number on its own line. · **missing**
- [ ] **Text.** Font, size and colour per row class: sheet, folder, item, sub-item and capture rows. Leaving the colour empty follows the app theme. · **missing**
- [ ] **Rendering.** High-resolution re-raster of the visible area once the view settles, the delay after zoom or pan stops, and a fade-in duration. · **missing**
- [ ] **Hover.** Which fields appear in the hover panel per markup type (area, linear, segment, count), its text style, its background colour, and the blue outline painted over the area run under the cursor with its colour and thickness. · **missing**
- [ ] A section can be reset on its own, or every default restored at once. `src/components/takeoff/settings/SettingsDialog.tsx` · **missing**
- [x] **Collaboration (beyond legacy, D-33).** A section in the user's own settings: show others' drawing in progress (on, off), show names (always, on hover, off), show others' cursors (on, off), show others' work (all, only mine, fade others), colour others by (item colour, the default, or each colleague's own colour), live drawing line (solid, the default, or dashed). Kept on the user, stored sparse, so it follows them to another machine. **D-38 (2026-09-26) added the line style and made solid and item colour the defaults.** · **ported** (F8-S14, `f8-s14` 4/4: six kept across a reload and on another origin; a bad value refused naming the field; on the canvas, solid in the item's colour by default, dashed and each colleague's colour when chosen. Honoured today by the draft layer for drawing, names, others' work, colour by and the line; **cursors honoured by F7**, and F5 to F7 keep the rest) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*

**Shell and chrome**

- [ ] Light and dark mode toggle. One `dark` class on `<html>` flips every semantic token at once, so all routes, panels and dialogs follow. `src/hooks/useTheme.ts` · **missing**
- [ ] An inline script in `index.html` applies the stored theme before first paint, so a reload in dark mode never flashes white. `index.html`, `src/hooks/useTheme.ts` · **missing**
- [ ] Toggling the theme touches only the class and `localStorage`, so the active sheet, the selection and the armed tool survive a mid-session flip. `src/hooks/useTheme.ts` · **missing**
- [ ] The first-ever visit defaults to light; after that the last choice is restored. `src/hooks/useTheme.ts` · **missing**
- [ ] Panel layout (which panels, and their widths) persists per user. `src/hooks/usePanelLayout.ts`, table `user_panel_layouts` · **missing**
- [ ] The app window, panels and workspace tabs use squared corners and the tab strip sits flush with no gap above or to its left. `.lovable/plan/square-the-app-window-corners-2026-08-14.md`, `.lovable/plan/square-the-workspace-tab-edges-2026-08-13.md`, `.lovable/plan/remove-the-gap-above-and-left-of-the-workspace-tabs-2026-08-14.md` · **missing**
- [ ] The workspace tab is restored from `localStorage` on reopen. `src/components/takeoff/Toolbar.tsx` (`TAB_STORAGE_KEY`) · **missing**
- [ ] Toasts report success and failure for every write, with a distinct title per failure reason. `src/components/ui/sonner.tsx`, `src/hooks/use-toast.ts` · **partial** (a toast system exists; per-reason titles do not)

**Install and updates**

- [ ] The app installs from the browser as a PWA, standalone, with a clean app icon at 192, 512 and 512-maskable, an orange theme colour and a white background. `public/manifest.webmanifest` · **missing**
- [ ] A build stamp is printed to the console at boot so two browsers can be confirmed on the same bundle before any cross-browser test. `src/main.tsx` (`BUILD_STAMP`) · **missing**
- [ ] A stale Workbox service worker from an earlier deploy is unregistered from the page side on first load, and every cache it holds is deleted, so a client cannot be served an old `index.html` and old chunks indefinitely. `src/main.tsx`, `public/sw.js` · **missing**
- [ ] `public/sw.js` is a kill switch that replaces the old worker at the same URL, deletes every cache, unregisters itself and reloads controlled pages onto the live bundle. It must not be deleted, because removing it lets the stale worker survive. `public/sw.js` · **missing**
- [ ] **Stale-chunk guard.** After a redeploy the old `index.html` asks for chunk hashes that no longer exist; a failed lazy import is retried, and uncaught cases (module preloads, nested dynamic imports) are caught on `error` and `unhandledrejection` and reloaded once, rather than leaving a blank white page. `src/main.tsx`, `src/lib/lazyWithRetry.ts` · **missing**
- [ ] A debug flag registers `window.icDebug` at startup so diagnostics can be toggled from any console without loading a takeoff route. `src/lib/debugLog.ts` · **missing**
- [ ] The "preview, not published" banner is absent from the shipped app. `src/components/landing2/PreviewBanner.tsx`, `.lovable/plan/remove-the-preview-not-published-banner-2026-09-01.md` · **missing**

**Saving**

- [ ] Edits autosave on a debounce, collapsing rapid edits into one write, and surface an idle, saving, saved or failed status. `src/hooks/useAutosave.ts` · **missing**
- [ ] A failed autosave stays failed and retryable rather than silently dropping the payload. `src/hooks/useAutosave.ts` · **missing**
- [ ] A project draft survives a reload before it is saved. `src/hooks/useProjectDraft.ts` · **missing**

**Performance baselines**

These are measured numbers from the legacy repo, not aspirations. They are the
bar a ported screen has to clear, and the baselines D-14 commits to when rendering
moves to pdf.js in the browser for Auto Count, Auto Trace, Find Text, name from
region and vector snap.

- [ ] **Fit tier is 2048 px.** Measured at dpr 1.25: 2048 decodes and draws in 21.4 ms at 10.7 MB resident against 99.2 ms and 68.3 MB for the full tier on the same sheet. 1600 is only 4 to 18 ms faster and upscales 2.5x on a 2560-wide dpr-2 display; 2560 costs 35 to 38% more bytes and RAM for no measurable time. `RESULTS-PRERENDER-PHASE1.md`, `src/lib/takeoff/pdf/sheetImageSource.ts` · **ported** (the worker's 2048 px fit image paints first, then pdf.js over it, F5 Block C, `f5-s11` AC1)
- [x] The full tier is decoded at idle immediately after the fit paint when viewport CSS width times dpr exceeds 2048, not on zoom. `src/lib/takeoff/pdf/sheetImageSource.ts` (`needsFullTier`) · **ported, as pdf.js** (F5 Block C: there is no second image tier; pdf.js draws the page at the window's width times dpr as soon as the document opens, whatever the width)
- [ ] **Cold open targets, medians over three runs:** a light sheet opens in roughly 200 ms to first paint and 750 to 880 ms fully settled; a heavy sheet in roughly 165 ms to first paint, and the image path cuts its settled time from 2400 ms to 1199 ms. `RESULTS-PRERENDER-PHASE2.md` · **partial, measured** (F5 Block D, `f5-s11` AC4 on the bench's production build (D-49): the fit image paints at once, and the first pdf.js paint on a cold page is a median of 480 ms and 544 ms in two runs of three, 300 to 490 ms of it fetching and opening the page's PDF, against legacy's ~200 ms; the dev server's 1.9 s was the dev server. A page loaded through Add sheets is drawn sharp in a median of 1.2 to 2.1 s, preparation included, against legacy's ~4 s. A sheet drawn ahead by the prerender opens in 9 ms, `f5-s13`)
- [x] The pre-rendered image is a fallback for a cold document, not the default: when the PDF document is already open no image is fetched at all. `RESULTS-PRERENDER-PHASE2.md` §2 · **ported** (F5 Block C, `f5-s11` AC1: back to a sheet whose document is open and whose sharp frame is cached, no fit image is fetched) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Zoom range is 25% to 3000%** in legacy, from one source of truth that every clamp reads (wheel zoom, Fit, the zoom buttons, and Find Text jumps). `src/lib/takeoff/zoomLimits.ts` · **Beyond legacy (D-35, D-102): the new app's range is 10% to 4000% of a fixed 170 CSS px per inch** (the floor lowered to a sheet's fit when that is below 10%), from one module every clamp reads. **ported** (F5 Block C, `lib/takeoff/pdf/zoom.ts`, `f5-s11` AC2) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] The zoom button step is additive 0.25 below 2x for fine control near fit, and geometric 1.25x above it so the top of the range is a handful of clicks rather than seventy. `src/lib/takeoff/zoomLimits.ts` · **ported** (F5 Block C: 100% to 4000% in 19 presses, `f5-s11` AC2; **changed by D-102**: × 1.25 at every zoom, since + 0.25 on the new baseline jumps from 20% to 45%) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **Zoomed out, the sheet reads light (beyond legacy, D-104).** Below Fit pdf.js draws at 4 × (or 2 ×) and the bitmap is halved down, so hairlines average to grey instead of a full-dark device pixel. · **ported** (round 5: at 10% mean luminance 233 → 244, dark pixels 4.7% → 0.7% on a dense sheet; *smoke-tested (D-70)*)
- [x] **Sharp at every zoom up to 4000% (beyond legacy, D-35).** Once a zoom settles, the page on screen is a pdf.js raster at that zoom, never a CSS-scaled bitmap; a scaled frame is only the interim while the next raster draws (D-14). · **ported** (F5 Block C, `f5-s10` AC1 on a dpr-2 profile: at 100%, 400%, 2000% and 4000% the settled canvas's backing is its CSS size times 2, and a hairline is 1 device pixel wide at 4000%; a half-resolution pass then a full one after each zoom, `f5-s11` AC3) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Above the windowing threshold the sheet renders through the pdf.js window path, so rasterised pixels track the viewport rather than the page and deep zoom never allocates a full-page intermediate. `src/lib/takeoff/pdf/PdfPageRenderer.ts`, `zoomLimits.ts` · **ported** (F5 Block C: above 2.5× the window plus 35% margins, 3808 × 2524 device px at 4000% on a 1440 × 900 dpr-2 window, `f5-s10`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A PDF document is opened once and shared through a refcounted cache; no second copy of a file is ever held. `src/lib/takeoff/pdf/pdfDocCache.ts` · **ported** (F5 Block C, `lib/takeoff/pdf/doc-cache.ts`: one open per file, `f5-s10`; ticked late, in Block D) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] A memory budget governs how much raster the tab may hold at once. `src/lib/takeoff/pdf/memoryBudget.ts` · **ported** (F5 Block C, `lib/takeoff/pdf/memory-budget.ts`: a byte-bounded bitmap cache sized from `deviceMemory`, 64 MB at 4 GB, `f5-s10`; ticked late, in Block D) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] Sheets ahead of the current one are pre-rendered on a queue so stepping through a set does not pay a cold render each time. `src/lib/takeoff/pdf/prerenderQueue.ts` · **ported** (F5 Block D, `lib/takeoff/pdf/prerender-queue.ts`, legacy's rules: one job, two waiting, the open sheet first, hover after 150 ms. The next sheet opens with no fit image and no second fetch, `f5-s13`) · *driven by fixture, archived at tag fixtures-archive-2026-09-28*
- [x] **A sheet switch is never blank** (beyond legacy's single canvas, the same effect): the last sheet's picture holds until the next has its own; every sheet's fit image fetched ahead within a byte budget, neighbours and a hovered row decoded. · **ported** (D-101, round 5: 0 blank frames, first picture 106 to 169 ms for a neighbour or a hovered sheet on the bench's production build; *smoke-tested (D-70)*)
- [ ] A canvas performance HUD and zoom profiler are available for diagnosing a slow sheet. `src/components/takeoff/CanvasPerfHud.tsx`, `src/lib/takeoff/diagnostics/ZoomProfiler.tsx` · **missing**

---

## Supabase tables still in `public` that a live surface reads or writes

84 distinct tables, from `.from("…")` across `src/` with `src/retired/` excluded.
Grouped by the surface that owns them. Under D-03 none of these schemas is ported:
each is re-expressed as a SQLAlchemy model, and this list is the checklist of what
still needs one.

| Group | Tables |
|---|---|
| Identity and access | `profiles`, `user_roles`, `workspaces`, `workspace_members`, `workspace_invitations`, `workspace_custom_roles`, `workspace_role_overrides`, `workspace_pending_ownership_transfers` |
| Workspace configuration | `workspace_classifications`, `workspace_project_statuses`, `workspace_status_tabs`, `user_status_tab_prefs`, `workspace_shifts`, `workspace_role_default_shifts`, `workspace_report_settings`, `workspace_subcontractors`, `workspace_subcontractor_scopes`, `workspace_library_overrides`, `user_panel_layouts`, `feature_flags`, `csi_divisions` |
| Projects and files | `projects`, `project_folders`, `project_files`, `project_assignees`, `project_share_links`, `project_subcontractor_scope_overrides`, `project_intake_files` (legacy plan PDFs the viewer still opens) |
| Drawings | `drawing_files`, `drawing_folders`, `drawing_sheets`, `sheet_calibrations`, `sheet_overlays`, `sheet_render_jobs` |
| Takeoff | `takeoff_items`, `takeoff_geometries`, `takeoff_folders`, `takeoff_layers`, `takeoff_item_dimensions`, `takeoff_item_history`, `takeoff_variables`, `takeoff_variable_values`, `takeoff_variable_prefs`, `takeoff_notes`, `takeoff_highlights`, `takeoff_docks`, `takeoff_assemblies`, `takeoff_assembly_components`, `takeoff_item_evidence_links` |
| Assemblies and library | `assembly_templates`, `assembly_template_children`, `assembly_template_costs`, `assembly_folders`, `library_items` |
| Evidence | `evidence_snippets`, `evidence_tag_types`, `schedule_extractions` |
| Estimating | `estimate_line_items`, `estimating_line_costs`, `estimating_unit_wastage`, `estimating_format_themes`, `estimate_custom_columns`, `estimate_custom_values` |
| Billing and trials | `workspace_billing`, `workspace_wallet`, `workspace_plan_limits`, `workspace_limit_overrides`, `workspace_trial_state`, `workspace_user_credit_limits`, `credit_ledger`, `ai_credit_packs`, `ai_credit_regimes`, `ai_provider_pricing`, `ai_usage_events`, `billing_country_tiers`, `billing_tier_rules`, `disposable_email_domains`, `account_signals` |
| Time tracking | `work_sessions`, `work_session_daily` |
| Community | `community_posts`, `community_replies`, `community_votes`, `community_media` |
| Audit and presence | `audit_log`, `project_presence_beacons` |

**Storage buckets read or written by live code:** `project-files`, `project-takeoff`,
`workspace-logos`. `takeoff-uploads`, `community-attachments` and `project-intake`
are also live per `docs/BACKEND-RETIREMENT.md` §4. Under D-03 all of these become S3
prefixes.

**Live RPCs** (21): `accept_workspace_invitation`, `delete_project_folder`,
`effective_trial_limits`, `get_community_authors`, `get_invitation_by_token`,
`is_platform_admin`, `is_workspace_admin`, `log_audit_event`,
`platform_ai_economics`, `purge_project_now`, `restore_project`,
`set_estimating_line_comment`, `set_share_password`, `soft_delete_community_post`,
`soft_delete_community_reply`, `soft_delete_project`, `submit_demo_request`,
`transfer_workspace_ownership`, `workspace_credit_allowance`,
`workspace_member_credit_rows`, `workspace_seat_count`.

**Live edge functions** (20, excluding `_shared`): `accept-invite-signup`,
`create-checkout-session`, `create-topup-checkout`, `geocode-address`,
`guest-project`, `load-csi-template`, `ocr-sheet-titleblock`,
`platform-recent-signins`, `platform-secret-status`, `purge-trashed-projects`,
`region-ask-ai`, `region-extract-schedule`, `sheet-tiler` and its three byte-identical
clones `sheet-tiler-b/-c/-d`, `signup-cleanup`, `stripe-webhook`, `trial-gate`.
D-03 collapses the four tilers to one Celery task.

---

## Every place legacy uses Supabase realtime

Thirteen channels. D-03 removed the transport, D-10 made replacing it mandatory, and
**D-13 has now named the replacement**: a WebSocket on the api with Redis pub/sub
fan-out, events published after the write commits, writes staying on REST, echo
suppression on a write-token header, and the soft-lock as a Redis key with a short
TTL held by a heartbeat. The F8 spec maps each row below onto an event on that
transport, so this table is that spec's input. Presence is the hardest row: it is an
ephemeral soft-lock, not a data feed.

**F8 closed 2026-09-26.** The "New event" column is what each channel became on the
new transport, the topic it rides (`ws` is the workspace topic, `project` the project
topic) and its state.

| # | Channel | Watches | What it buys the user | File | New event (F8) |
|---|---|---|---|---|---|
| 1 | `takeoff-sync-${projectId}` | `takeoff_items`, `takeoff_geometries`, `sheet_calibrations`, `takeoff_folders` (all events) | Two estimators on one project see each other's measurements, folders and calibrations appear live | `src/hooks/useTakeoffRealtime.ts` | project: `takeoff.item.changed`, `takeoff.geometry.changed` **live** (F8-S18); `sheet.calibration.changed` **live** (F5 Block E, `f5-s15`, `f5-s19`); `takeoff.folder.changed`, `takeoff.layer.changed` **live** (F6 Block C, `f6-c`) |
| 2 | `takeoff:${projectId}` (**presence**, not postgres_changes) | presence payloads keyed by (itemId, sheetId) | Ephemeral soft-lock: blocks Resume and delete for other viewers while someone is actively marking, so a read-modify-write on `vertices_json` cannot silently drop a writer | `src/hooks/useTakeoffPresence.ts` | project: `item.focus`, `item.blur`, `presence`, `presence.changed`, `focus.granted`, `focus.refused` **live**, per the collaboration mode (D-32). Plus `draft` and `cursor`, beyond legacy (D-33) |
| 3 | `takeoff_docks:${projectId}` | `takeoff_docks` | Docked snapshots appear for other viewers | `src/hooks/useDocks.ts` | project: `takeoff.dock.changed`, named, **F11** |
| 4 | `takeoff_highlights:${projectId}` | `takeoff_highlights` | Highlights appear for other viewers | `src/hooks/useHighlights.ts` | project: `takeoff.highlight.changed`, named, **F11** |
| 5 | `takeoff_notes:${projectId}` | `takeoff_notes` | Notes appear for other viewers | `src/hooks/useNotes.ts` | project: `takeoff.note.changed`, named, **F11** |
| 6 | `user-roles-${userId}-${workspaceId}-${instanceId}` | `user_roles`, `workspace_custom_roles`, `workspace_role_overrides`, `workspace_billing` | A role, permission or plan change takes effect in an open tab with no reload | `src/hooks/usePermissions.ts` | ws: `workspace.member.changed`, `workspace.permissions.changed` **live** (F8-S15); `workspace.plan.changed` **F16** |
| 7 | `trial-state-${workspaceId}-${channelId}` | `workspace_trial_state`, `workspace_limit_overrides` | A trial expiring, or an admin lifting a limit, reaches the open tab | `src/hooks/useTrialState.ts` | ws: `workspace.trial.changed`, named, **F16** |
| 8 | `workspace-custom-roles-${workspaceId}` | `workspace_custom_roles` | The roles matrix updates while another admin edits it | `src/hooks/useWorkspaceCustomRoles.ts` | ws: `workspace.permissions.changed` kind `custom_role` **live** (F8-S15) |
| 9 | `workspace-role-overrides-${workspaceId}` | `workspace_role_overrides` | The same, for built-in role overrides | `src/hooks/useWorkspaceRoleOverrides.ts` | ws: `workspace.permissions.changed` kind `override` **live** (F8-S15) |
| 10 | `workspace-shifts-${workspaceId}` | `workspace_shifts`, `workspace_role_default_shifts` | Shift changes reach open member screens | `src/hooks/useWorkspaceShifts.ts` | ws: `workspace.shifts.changed`, named, **F15** |
| 11 | `estimating-evlinks-${projectId}` | `takeoff_item_evidence_links`, `takeoff_folders` (UPDATE), `takeoff_items` (UPDATE), `estimating_line_costs` | The estimate table stays live against takeoff edits and another estimator's rates | `src/components/estimate/ProjectEstimatingView.tsx` | project: `estimate.changed`, named, **F9**, plus channel 1's item and folder events |
| 12 | `subitem-costs-${projectId}-${parentId}` | `estimating_line_costs` | Sub-item costs stay in sync while the dialog is open | `src/components/takeoff/SubItemDialog.tsx` | project: `estimate.line_cost.changed`, named, **F9** |
| 13 | `file-source-${projectId}` | `project_files` (UPDATE), `project_intake_files` (UPDATE) | A file finishing its server-side render swaps the canvas source without a reload | `src/pages/ProjectTakeoff.tsx` | project: `drawing.source.changed`, from the render worker, named, **F5** (the worker publish path is built, F8-S6) |

**Beyond the thirteen, live since F8:** the F3 set on the workspace topic
(`workspace.owner.changed`, `workspace.settings.updated`, the new
`workspace.invitation.changed`) and the F4 set (`project.created`, `project.updated`,
`project.trashed`, `project.restored`, `project.purged` by hand and by the nightly
worker, `project.folder.changed`, `project.file.changed`, `workspace.statuses.changed`),
each driven between two windows on two api processes (`f8-s15`, `f8-s16`, `f8-s6`).

Two supporting details that have to survive the transport swap:

- **Echo suppression.** A writer must not re-apply its own event. Legacy does this
  with write tokens. `src/lib/takeoff/realtime/writeTokens.ts` **Kept (F8-S7).**
- **Auth priming.** Legacy re-authorises channel bindings on token refresh, because
  events on RLS-guarded tables are otherwise dropped silently. Under D-03 there is no
  RLS, but the token-refresh case still exists. `src/hooks/useTakeoffRealtime.ts`
  **Kept (F8-S3):** a refresh re-authorises the open socket and re-checks every topic;
  it never rebuilds the socket.

---

## Counts per surface

**ported / partial / missing** is the current state of each line. **driven** is how many
of them have been proved on the bench, and it is the only column that means finished.
A retired line counts as driven, because there is nothing left to drive.

| # | Surface | Behaviours | ported | partial | missing | driven | lines, prev build |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | Auth | 21 | 19 | 0 | 0 | **21** (19 + 2 retired) | 21 |
| 2 | Workspace settings | 25 | 13 | 1 | 11 | **13** | 25 |
| 3 | Permissions | 9 | 9 | 0 | 0 | **9** | 9 |
| 4 | Projects dashboard | 19 | 18 | 0 | 0 | **19** (18 + 1 retired) | 15 |
| 5 | Project Home | 10 | 8 | 0 | 2 | **8** | 9 |
| 6 | Sharing | 12 | 0 | 1 | 11 | 0 | 12 |
| 7 | Takeoff sheets panel | 47 | 8 | 6 | 33 | **8** | 27 |
| 8 | Takeoff items | 56 | 4 | 7 | 45 | **4** | 36 |
| 9 | Canvas tools | 28 | 8 | 3 | 17 | **8** | 28 |
| 10 | Canvas interactions | 56 | 9 | 5 | 42 | **9** | 37 |
| 11 | Estimating | 26 | 1 | 0 | 25 | **1** (retired by D-50) | 20 |
| 12 | Assemblies | 14 | 0 | 0 | 14 | 0 | 11 |
| 13 | Library | 7 | 0 | 0 | 7 | 0 | 7 |
| 14 | Markup | 12 | 0 | 0 | 12 | 0 | 12 |
| 15 | Evidence and snippets | 9 | 0 | 0 | 9 | 0 | 9 |
| 16 | Earthwork | 53 | 0 | 0 | 53 | 0 | 14 |
| 17 | Auto Count | 40 | 0 | 0 | 40 | 0 | 8 |
| 18 | AI tools | 30 | 0 | 0 | 30 | 0 | 10 |
| 19 | Reports | 9 | 0 | 0 | 9 | 0 | 9 |
| 20 | Community | 10 | 0 | 0 | 10 | 0 | 10 |
| 21 | Billing | 10 | 0 | 1 | 9 | 0 | 10 |
| 22 | Platform admin | 20 | 0 | 0 | 20 | 0 | 8 |
| 23 | Keyboard and mouse | 36 | 1 | 3 | 32 | **1** | new |
| 24 | App-wide | 47 | 11 | 2 | 34 | **10** | new |
| | **Total** | **606** | **109** | **29** | **465** | **111** | **347** |

**109 of 606 behaviours are ported, 18%. 111 are driven, 18%** (driven counts the four
retired lines) — and driven is the number that counts. One ported line is not yet driven:
§24's fit-tier size. (Recounted from the lines at F5's close, 2026-09-27: §10 carries
F8's eight collaboration lines beyond legacy, and rows 5, 8, 10, 23 and 24 had fallen
behind their ticks. 606, not 595: F4 split §5's location line in two, D-35 added §24's
"sharp at every zoom up to 4000%", and F8 added the collaboration lines.)

One line inside the 111 carries a named remainder rather than a clean close, and the line
itself says which: §3's collaborator-plan line is built and driven at module level but
unreachable end to end until **F16** supplies a plan value. §3's platform-admin line owed
**F5** its on-screen half, and F5-S18 paid it (`f5-s18`).

The 2 remaining retired lines (D-15, D-17) are counted as driven and not as ported.

Three patterns worth naming.

**The deep surfaces are much bigger than they looked.** Earthwork went from 14 lines
to 53, Auto Count from 8 to 40, AI tools from 10 to 30. Those three alone are 123
behaviours, 21% of the app, and not one line of any of them is started. The first pass
described them at the level of "compute cut and fill"; the source says cut and fill is
a guard, a union remap, a crossings arrangement, a barycentric sample, an always-split
rule, a prism integral, a boundary clip and an idempotent upsert, each with its own
failure behaviour.

**The presentation layer is a real surface, not polish.** 56 of the 292 plan files tune
how a row, a panel or a dialog looks and behaves, and the first pass had almost no
lines for them. They are now in §7, §8 and §10. An estimator who cannot tell a selected
row from a current row has a broken panel, whatever the quantities say.

**Sections 12 through 22 still have zero ported lines**: eleven consecutive surfaces,
now 214 behaviours between them, nothing started.

Two things this count is not. It is not an estimate: a line is one behaviour, not one
unit of work, and "split every mixed-sign triangle at Δz=0" is not the same size as
"the colour picker stays open while tuning colours". And the **ported** column is not a
verification: a box stays unticked until the behaviour is driven on the bench, which is
why 55 lines read ported and only 39 are ticked. The 16-line gap is not a backlog of
work, it is a backlog of proof.

---

## Appendix: every plan file, mapped

All **292** files in `intelcost/.lovable/plan/` map to a section above. Each is a
shipped feature or fix, so a plan with no line meant a behaviour this document had
missed. Section numbers, not line numbers: a plan usually lands on two or three
lines in its section.

Five files describe no user-facing behaviour and are mapped to **none** deliberately
rather than given invented lines. They are repo hygiene, and porting them would mean
copying legacy structure, which D-11 says not to do:

- `backend-cleanup-separate-what-s-live-from-what-s-retired-2026-08-11`
- `quarantine-pass-3-remaining-unused-code-in-the-main-tree-2026-08-05`
- `retired-code-quarantine-move-hidden-surfaces-into-src-retire-2026-08-04`
- `retired-code-quarantine-pass-2-2026-08-05`
- `rewrite-readme-md-to-match-the-shipping-architecture-2026-08-05`

| § | Surface | Plan files |
|---|---|---:|
| 02 | Workspace settings / Permissions | 14 |
| 04 | Projects dashboard / Project Home | 8 |
| 06 | Sharing | 2 |
| 07 | Takeoff sheets panel | 46 |
| 08 | Takeoff items | 55 |
| 09 | Canvas tools | 5 |
| 10 | Canvas interactions | 40 |
| 11 | Estimating | 32 |
| 12 | Assemblies | 12 |
| 14 | Markup | 22 |
| 15 | Evidence and snippets | 5 |
| 16 | Earthwork | 8 |
| 17 | Auto Count | 5 |
| 18 | AI tools | 9 |
| 19 | Reports | 1 |
| 20 | Community | 2 |
| 21 | Billing | 4 |
| 22 | Platform admin | 2 |
| 23 | Keyboard and mouse | 5 |
| 24 | App-wide | 10 |
| n/a | No user-facing behaviour (listed above) | 5 |
| | **Total** | **292** |

<details>
<summary>The full list, by section</summary>


**§02 Workspace settings / Permissions**

- `classification-tab-in-workspace-settings-2026-08-03`
- `custom-roles-workspace-defined-roles-with-editable-permissio-2026-08-14`
- `editable-project-statuses-filter-tabs-2026-08-29`
- `editing-existing-roles-2026-08-14`
- `fix-member-shift-changes-don-t-stick-2026-08-14`
- `fix-roles-permissions-dialog-overflow-2026-08-14`
- `make-the-shifts-tab-appear-2026-08-14`
- `ownership-transfer-ui-permanent-delete-from-trash-2026-08-29`
- `plan-fix-bottom-bar-height-to-prevent-canvas-sheet-shift-2026-08-22`
- `replace-x-with-trash-icon-widen-the-dimension-echo-separator-2026-09-07`
- `sheets-panel-shift-click-range-selection-with-items-takeoff-2026-09-01`
- `shift-management-in-workspace-settings-2026-08-14`
- `show-role-next-to-assignee-name-in-the-assigned-to-dropdown-2026-08-29`
- `subcontractors-tab-in-workspace-settings-2026-08-17`

**§04 Projects dashboard / Project Home**

- `add-files-drop-zone-on-top-steadier-upload-bar-2026-09-23`
- `make-the-workspace-ruler-button-behave-like-perform-takeoff-2026-08-29`
- `move-estimating-perform-takeoff-next-to-project-name-dashboa-2026-08-29`
- `plans-dated-use-the-same-date-picker-as-the-filters-2026-08-04`
- `project-filters-new-attributes-on-projects-2026-08-04`
- `project-home-inline-plans-dated-picker-editable-location-car-2026-08-29`
- `remove-customize-tabs-button-center-the-dashboard-tab-strip-2026-08-29`
- `reorganize-dashboard-panels-2026-08-29`

**§06 Sharing**

- `public-share-link-view-a-project-without-an-account-2026-08-14`
- `share-button-in-the-project-header-2026-08-14`

**§07 Takeoff sheets panel**

- `blue-selected-sheet-rows-in-the-sheets-panel-2026-08-22`
- `bulk-delete-emptied-folders-go-with-their-sheets-2026-08-03`
- `canvas-right-click-menu-empty-sheet-area-2026-08-22`
- `center-the-sheet-item-tree-line-under-the-sheet-chevron-2026-08-23`
- `collapse-expand-button-takeoff-and-sheets-panels-2026-08-01`
- `ctrl-a-select-all-markups-on-the-sheet-2026-09-01`
- `fix-current-sheet-row-reads-as-a-solid-black-block-2026-08-22`
- `fix-the-invisible-sheets-panel-options-2026-08-13`
- `fix-tree-line-running-through-the-sheet-expand-chevron-2026-08-23`
- `fix-unfoldered-parent-row-disappears-entirely-2026-08-08`
- `folder-order-file-counters-2026-08-29`
- `hover-figures-this-section-this-sheet-item-total-2026-08-22`
- `keep-measuring-past-the-edge-of-the-sheet-2026-08-23`
- `keep-the-page-chooser-scrollbar-inside-the-dialog-2026-09-23`
- `load-images-png-jpg-tiff-into-takeoff-not-just-pdf-2026-08-29`
- `manual-expand-collapse-always-wins-over-the-header-ladder-2026-08-23`
- `move-count-pill-next-to-folder-name-folder-card-section-only-2026-08-29`
- `one-centered-collapse-show-tab-per-side-2026-08-23`
- `panel-heading-styling-update-2026-08-03`
- `perform-takeoff-load-project-files-on-first-open-2026-08-15`
- `pick-pages-before-loading-drawings-into-takeoff-2026-09-23`
- `plan-widen-spacing-around-the-sheet-label-en-dash-2026-08-23`
- `print-button-icon-parity-2026-08-01`
- `print-caret-width-parity-2026-08-01`
- `print-tool-for-the-takeoff-canvas-2026-08-01`
- `replace-sheet-label-separator-2026-08-23`
- `resize-panel-edge-tabs-2026-08-23`
- `right-click-on-the-sheet-canvas-context-menu-rotate-page-2026-08-22`
- `rotate-pages-bulk-rotation-from-the-sheets-panel-menu-2026-08-23`
- `selecting-a-markup-on-the-sheet-highlights-its-row-in-blue-2026-08-22`
- `sheet-row-menu-3-dots-right-click-and-bookmarks-2026-08-01`
- `sheet-row-status-chips-scale-takeoff-markup-2026-08-01`
- `sheets-panel-3-dot-panel-menu-planswift-parity-markup-thumbn-2026-08-13`
- `sheets-panel-align-tree-lines-under-the-chevron-enlarge-the-2026-08-23`
- `sheets-panel-header-match-the-takeoff-panel-2026-08-13`
- `sheets-panel-match-the-takeoff-panel-s-item-menus-2026-09-07`
- `sheets-panel-multi-select-respec-sheets-only-right-click-dri-2026-08-03`
- `sheets-panel-one-menu-blank-and-clipboard-pages-2026-08-22`
- `sheets-panel-scrollbar-starts-below-the-search-bar-2026-08-01`
- `show-markups-that-sit-outside-the-sheet-2026-08-22`
- `square-off-panel-corners-match-sheets-header-to-takeoff-head-2026-08-13`
- `takeoff-panel-multi-select-matching-the-sheets-panel-2026-08-03`
- `two-fixes-dialog-width-jitter-and-portrait-page-tiles-2026-09-23`
- `unify-tree-guide-dot-spacing-between-sheets-and-takeoff-pane-2026-08-01`
- `vertically-align-unit-columns-and-color-circles-across-sheet-2026-09-03`
- `why-the-sheet-label-gap-didn-t-widen-2026-08-23`

**§08 Takeoff items**

- `all-layers-in-one-tab-group-by-layer-first-2026-08-17`
- `always-visible-item-status-bar-2026-08-22`
- `bid-layers-stop-the-duplicates-make-every-layer-yours-2026-09-07`
- `compact-the-new-measurement-dialog-2026-08-03`
- `count-markup-layout-fix-symbol-selector-2026-08-29`
- `count-symbol-row-reorder-and-let-the-estimator-choose-which-2026-09-03`
- `count-symbol-size-one-row-corrected-names-2026-09-03`
- `count-symbols-clicking-anywhere-on-the-symbol-should-select-2026-09-11`
- `count-symbols-make-size-scaled-lock-to-the-sheet-s-scale-2026-08-29`
- `count-symbols-size-scaled-stops-tracking-real-world-dimensio-2026-08-29`
- `custom-folder-wbs-three-dots-row-menu-2026-08-29`
- `derived-list-must-follow-the-dimensions-on-screen-not-the-sa-2026-09-03`
- `derived-quantities-readable-formula-text-automatic-sub-item-2026-09-02`
- `duplicate-dialog-compact-size-anchored-near-the-item-2026-08-01`
- `duplicate-item-name-prompt-optional-sub-items-2026-08-01`
- `editing-a-variable-doesn-t-update-sub-item-quantities-2026-08-01`
- `empty-formula-bar-for-new-sub-items-2026-08-04`
- `fix-add-failed-cannot-read-properties-of-undefined-reading-s-2026-08-06`
- `fix-count-symbol-dragging-from-the-full-visible-symbol-2026-09-11`
- `fix-count-symbol-edge-selection-2026-09-11`
- `fix-item-sub-item-row-lines-in-the-sheets-panel-don-t-reach-2026-09-03`
- `fix-layers-ui-is-invisible-everywhere-2026-08-13`
- `fix-loading-sections-showing-above-sub-items-2026-08-23`
- `fix-sub-items-using-perimeter-show-err-and-no-quantity-2026-07-31`
- `fix-variable-unit-not-sticking-after-save-2026-07-31`
- `folder-properties-folder-multipliers-in-the-takeoff-panel-2026-09-01`
- `formula-field-make-the-whole-formula-visible-while-editing-2026-07-31`
- `hide-multiplier-and-total-qty-until-a-multiplier-is-actually-2026-08-17`
- `icon-size-default-force-existing-users-to-large-2026-08-29`
- `insert-dropdown-in-sub-items-dialog-gets-cut-off-2026-09-11`
- `item-row-redesign-type-icon-left-color-dot-right-2026-08-20`
- `keep-the-color-picker-open-while-tuning-colors-2026-08-17`
- `level-by-level-collapse-expand-nested-sub-items-2026-08-23`
- `lighten-type-icon-fill-on-selected-rows-2026-08-22`
- `live-excel-formulas-for-derived-sub-items-2026-09-03`
- `manage-sub-items-make-the-unit-follow-the-formula-more-often-2026-09-03`
- `manage-sub-items-opens-fully-drawn-2026-09-07`
- `manage-sub-items-polish-shadows-on-non-dimming-windows-2026-09-03`
- `measurement-dialog-defaults-sub-items-entry-point-insert-men-2026-09-02`
- `measurement-dialog-wbs-sub-items-opacity-count-symbol-size-2026-08-29`
- `multiplier-popover-editable-folders-kind-labels-2026-09-01`
- `named-dimensions-make-the-name-box-fill-the-dialog-width-2026-09-03`
- `named-dimensions-should-be-there-the-instant-properties-open-2026-09-07`
- `per-type-resume-glyphs-2026-08-23`
- `rename-to-rough-measurements-insert-reference-quantities-in-2026-09-11`
- `simpler-wording-for-count-derived-quantities-2026-09-07`
- `sub-item-err-on-new-variables-tags-not-saving-2026-07-31`
- `sub-items-classification-optional-when-the-item-uses-a-custo-2026-09-03`
- `sub-items-editor-dropdowns-painting-behind-the-dialog-2026-09-02`
- `sub-items-editor-is-dead-to-clicks-when-opened-over-the-meas-2026-09-02`
- `sub-items-fix-create-now-timing-remove-don-t-create-option-2026-08-29`
- `sub-items-from-the-new-measurement-dialog-2026-08-03`
- `sub-items-insert-values-add-the-remaining-parent-figures-2026-08-04`
- `sub-scopes-in-the-classification-picker-2026-07-31`
- `why-create-sub-item-freezes-the-app-for-a-few-seconds-2026-09-02`

**§09 Canvas tools**

- `find-text-choose-pages-tree-always-visible-and-a-draggable-p-2026-08-13`
- `find-text-create-gives-two-choices-highlight-or-add-measurem-2026-08-13`
- `find-text-indent-hit-rows-under-their-sheet-header-2026-08-13`
- `find-text-precise-highlights-page-tree-and-create-takeoff-it-2026-08-13`
- `find-text-trace-the-real-sheet-fix-the-live-path-prove-it-vi-2026-08-13`

**§10 Canvas interactions**

- `arc-cleanup-3-handles-per-arc-no-straight-chord-while-drawin-2026-08-22`
- `auto-scroll-should-stop-at-the-canvas-boundary-2026-08-22`
- `auto-scroll-stops-the-moment-the-cursor-leaves-the-canvas-2026-08-23`
- `broken-ring-short-tick-controls-2026-08-22`
- `canvas-bar-on-off-labels-drop-freehand-and-verify-2026-08-13`
- `canvas-status-bar-compact-height-softer-selected-colors-2026-08-13`
- `canvas-top-bar-draw-modifiers-scale-status-2026-08-13`
- `contextual-action-group-drawing-selection-and-cutout-states-2026-08-23`
- `copy-choose-which-sections-get-copied-2026-08-17`
- `copy-two-direct-options-no-reference-point-click-all-item-ty-2026-08-17`
- `cursor-look-auto-scroll-fixes-2026-08-22`
- `cursor-reticle-defaults-look-2026-08-22`
- `cursor-reticle-ring-clearance-circle-square-shape-2026-08-22`
- `deduct-refinements-merge-overlapping-holes-in-canvas-message-2026-08-23`
- `deduct-selection-positive-first-then-one-click-inside-a-dedu-2026-08-22`
- `deducts-follow-their-area-on-delete-deduct-tool-stays-armed-2026-08-23`
- `ellipse-circle-show-4-handles-not-the-whole-bead-chain-2026-08-22`
- `even-out-the-spacing-around-the-tool-buttons-2026-08-14`
- `fix-icon-sizing-in-the-contextual-action-group-2026-08-23`
- `hide-the-canvas-move-handle-while-a-dialog-is-open-2026-08-11`
- `hide-the-move-handle-on-non-canvas-tabs-2026-08-11`
- `hide-the-move-handle-while-panning-2026-09-01`
- `hollow-white-vertex-points-on-selected-areas-and-linears-2026-08-22`
- `hover-tooltip-hides-the-moment-the-cursor-moves-again-2026-08-22`
- `inline-arc-segments-while-drawing-linear-or-area-2026-08-22`
- `keep-circles-and-ellipses-looking-like-curves-after-a-deduct-2026-08-23`
- `keep-every-in-draw-hint-inside-the-canvas-2026-08-23`
- `keep-the-move-handle-out-from-under-dialogs-and-panels-2026-08-29`
- `lift-the-hover-panel-clear-of-the-crosshair-2026-08-22`
- `move-copy-ghost-draw-linear-runs-as-lines-not-shaded-areas-2026-08-03`
- `multi-selection-right-click-owns-all-canvas-right-clicks-2026-09-01`
- `plan-delay-hover-tooltip-until-cursor-stops-0-5s-debounce-2026-08-22`
- `plan-move-handle-scales-with-zoom-smaller-when-zoomed-out-2026-09-19`
- `press-and-drag-for-circle-ellipse-shape-modes-2026-08-23`
- `properties-panel-fit-opacity-cleanup-2026-08-24`
- `right-click-on-an-in-progress-measurement-small-action-menu-2026-08-16`
- `selection-chip-only-on-hover-over-the-drag-button-2026-08-23`
- `shrink-the-gap-between-cursor-and-the-dock-placement-tip-2026-08-25`
- `stop-dimming-unselected-sections-and-positives-2026-08-23`
- `why-the-hover-figure-doesn-t-match-the-shape-you-re-pointing-2026-08-21`

**§11 Estimating**

- `add-sub-item-from-the-estimating-right-click-menu-2026-08-24`
- `blank-spacer-rows-around-parent-blocks-estimating-tab-2026-08-08`
- `cost-columns-in-the-estimating-tab-2026-08-08`
- `costs-for-items-with-no-sub-items-2026-08-11`
- `costs-view-in-manage-sub-items-2026-08-11`
- `edit-layer-multipliers-from-the-estimating-tab-2026-08-17`
- `estimating-export-options-dialog-live-formula-workbook-2026-08-24`
- `estimating-export-v2-additions-2026-08-24`
- `estimating-tab-grouping-people-columns-custom-columns-2026-09-07`
- `estimating-tab-one-group-by-control-subcontractors-2026-08-17`
- `estimating-tab-spacer-before-group-headers-total-row-matches-2026-08-24`
- `export-option-grouping-on-off-2026-08-24`
- `fix-format-theme-resets-to-default-on-refresh-and-the-grid-b-2026-08-17`
- `fix-frozen-header-s-column-divider-lines-flicker-white-while-2026-08-24`
- `fix-sub-item-cost-saving-and-two-way-sync-2026-08-11`
- `fix-sub-item-costs-don-t-save-2026-08-11`
- `format-colors-separate-classification-scope-and-custom-folde-2026-08-17`
- `format-panel-one-color-per-real-header-type-2026-08-17`
- `format-panel-row-heights-px-heading-empty-row-height-control-2026-08-24`
- `grid-borders-options-in-the-estimating-format-panel-2026-08-17`
- `group-header-summary-text-should-follow-the-header-s-text-co-2026-08-24`
- `group-scopes-by-division-in-the-estimating-tab-s-subcontract-2026-08-17`
- `insert-a-row-in-the-estimating-table-2026-09-19`
- `parent-items-bold-sub-items-in-takeoff-order-estimating-tab-2026-08-08`
- `parent-rows-follow-their-sub-items-in-the-estimating-tab-2026-08-08`
- `plan-make-unselected-layer-tabs-visible-in-estimating-2026-08-24`
- `quick-edit-a-sub-item-from-the-estimating-table-2026-08-24`
- `stop-the-estimating-table-reloading-on-every-rate-entry-2026-08-11`
- `sub-item-costs-split-equipment-create-sub-items-without-clos-2026-09-02`
- `sub-item-quick-editor-parent-context-insert-menu-2026-08-24`
- `subcontract-column-in-the-estimating-tab-2026-09-19`
- `trim-left-spacing-on-parent-items-sub-items-6px-guides-stay-2026-08-21`

**§12 Assemblies**

- `assemblies-mode-same-header-buttons-as-takeoff-dedicated-dro-2026-08-29`
- `assemblies-panel-same-rows-as-takeoff-fully-editable-2026-08-11`
- `assemblies-panel-takeoff-style-folder-tree-collapse-expand-n-2026-08-29`
- `assemblies-pre-priced-reusable-takeoff-items-2026-08-11`
- `assemblies-rows-matching-icons-single-click-properties-and-r-2026-08-29`
- `assemblies-starter-pack-source-dropdown-2026-08-13`
- `assembly-properties-match-the-takeoff-item-properties-dialog-2026-08-29`
- `fix-assemblies-panel-row-controls-menu-at-extreme-right-no-s-2026-08-29`
- `fix-link-assembly-on-takeoff-items-2026-09-01`
- `match-assemblies-panel-rows-to-takeoff-panel-exactly-2026-08-29`
- `seed-from-assembly-show-the-real-assemblies-filtered-by-pare-2026-09-02`
- `takeoff-layers-assemblies-starter-pack-2026-08-13`

**§14 Markup**

- `action-bar-callout-text-for-the-annotation-tools-2026-08-24`
- `action-bar-dot-callout-drag-handle-text-scale-fix-arrow-tuni-2026-08-24`
- `action-bar-for-selected-annotation-markups-2026-08-24`
- `action-bars-sit-next-to-the-tools-not-at-the-far-right-2026-08-25`
- `always-on-action-bar-tool-properties-panels-2026-08-24`
- `annotation-action-bar-cloud-selection-callout-flow-dimension-2026-08-24`
- `box-select-markups-selection-action-bar-and-a-selection-righ-2026-09-01`
- `cloud-defaults-single-color-button-callout-text-box-dimensio-2026-08-24`
- `collaborator-tab-annotations-the-support-tools-2026-08-24`
- `curved-markups-dragging-a-handle-reshapes-the-whole-curve-2026-08-22`
- `fix-custom-panel-text-color-hides-text-on-highlighted-rows-2026-08-22`
- `fix-dragged-markups-snap-back-to-their-old-position-2026-09-02`
- `fix-duplicate-exact-same-markups-new-color-2026-08-03`
- `fix-zoom-glitching-for-measurement-markups-on-g101-2026-09-17`
- `hover-details-settings-per-markup-type-2026-08-22`
- `hover-highlight-on-area-markups-2026-08-22`
- `keep-the-selected-markup-drag-button-anchored-during-zoom-2026-09-19`
- `left-click-off-any-markup-disarms-the-box-selection-2026-09-01`
- `maximum-zoom-markup-stability-2026-09-17`
- `plan-light-yellow-background-for-in-progress-markup-action-b-2026-08-22`
- `rename-annotations-to-markups-hide-the-markups-and-legend-bu-2026-08-25`
- `simplify-the-box-selection-action-bar-extend-right-click-off-2026-09-01`

**§15 Evidence and snippets**

- `fix-snippet-preview-blinking-blank-and-sharpen-preview-zoom-2026-08-03`
- `full-width-row-lines-in-sheets-and-bookmarks-snippets-2026-08-22`
- `match-bookmarks-snippets-rows-to-the-sheets-panel-row-style-2026-08-03`
- `rename-capture-tool-snapshot-captures-panel-snippets-2026-08-01`
- `snippets-stop-them-disappearing-when-you-change-pages-2026-08-01`

**§16 Earthwork**

- `auto-trace-stage-1-5-final-consolidated-2026-08-23`
- `auto-trace-stop-the-freeze-when-arming-trace-2026-08-28`
- `choose-earthwork-markups-when-creating-or-copying-an-item-2026-08-17`
- `earthwork-markups-folder-duplicate-classification-choice-2026-08-17`
- `fix-area-tool-from-earthwork-jumps-back-to-takeoff-and-hides-2026-08-17`
- `show-intersecting-contours-in-blue-on-the-canvas-2026-08-28`
- `trace-settings-one-profile-per-surface-eg-fg-2026-08-28`
- `why-the-scope-column-is-empty-for-the-earthwork-rows-2026-08-08`

**§17 Auto Count**

- `auto-count-a-production-evidence-folded-into-the-perf-work-2026-08-26`
- `auto-count-image-mode-final-close-out-2026-08-26`
- `auto-count-image-mode-memory-contract-repair-p1-p5-evidence-2026-08-27`
- `auto-count-symbol-search-batch-count-placement-2026-08-26`
- `auto-count-ux-build-1-hover-highlight-draggable-panel-click-2026-08-27`

**§18 AI tools**

- `extract-schedule-polish-remove-continue-an-existing-count-2026-08-29`
- `extract-schedule-region-drag-ai-schedule-rows-takeoff-items-2026-08-28`
- `extract-schedule-round-2-refinements-2026-08-29`
- `fix-corrupted-name-from-page-region-results-2026-08-08`
- `fix-name-from-page-region-always-reports-no-text-2026-08-08`
- `name-from-page-region-enable-the-range-option-for-a-single-s-2026-08-08`
- `region-menu-five-refinements-consolidated-2026-08-23`
- `scale-evidence-stays-on-the-sheet-2026-08-23`
- `the-amber-scale-box-should-stay-after-an-ai-scale-is-applied-2026-08-23`

**§19 Reports**

- `plan-reports-restructure-two-primary-sections-time-activitie-2026-08-25`

**§20 Community**

- `add-a-fourth-community-section-cool-stuff-2026-08-29`
- `community-editor-drop-youtube-make-links-universal-2026-08-22`

**§21 Billing**

- `ai-credits-usage-phases-1-2-4-final-v2-cost-anchored-2026-08-25`
- `properties-dialog-no-pricing-show-existing-sub-items-2026-08-29`
- `split-serving-cost-target-into-input-output-token-anchors-2026-08-25`
- `two-plan-pricing-collaborator-pro-own-stripe-checkout-2026-08-25`

**§22 Platform admin**

- `give-touseef-dev-intelcostestimate-com-admin-developer-acces-2026-08-05`
- `surface-the-ai-economics-page-in-the-developer-menu-2026-08-25`

**§23 Keyboard and mouse**

- `bring-back-the-mode-point-to-point-dropdown-and-one-consiste-2026-08-23`
- `fix-double-click-on-a-perimeter-or-linear-segment-doesn-t-in-2026-08-22`
- `make-middle-button-and-right-button-panning-work-everywhere-2026-09-01`
- `middle-click-scroll-wheel-panning-on-the-takeoff-canvas-2026-08-19`
- `two-stage-escape-while-measuring-2026-08-23`

**§24 App-wide**

- `fix-published-site-loads-a-blank-white-page-2026-08-01`
- `install-intelcost-from-the-browser-clean-app-icon-2026-08-27`
- `remove-the-gap-above-and-left-of-the-workspace-tabs-2026-08-14`
- `remove-the-preview-not-published-banner-2026-09-01`
- `settings-decimals-more-text-styling-and-explicit-save-2026-08-22`
- `settings-panel-text-styling-rendering-controls-2026-08-22`
- `settings-updates-tab-size-bold-icon-size-zoom-buttons-defaul-2026-08-29`
- `square-the-app-window-corners-2026-08-14`
- `square-the-workspace-tab-edges-2026-08-13`
- `tiler-poisoned-sheets-verification-report-no-build-2026-08-23`

</details>

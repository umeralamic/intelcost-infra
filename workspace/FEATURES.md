# IntelCost — Features
_**The backlog.** Every feature that is live, that we are working on, or that we intend
to build, in one list. Three sections: ✅ Live · 🔨 Working · 🗓 Planned._
_Updated: 2026-09-25_

**Board:** [MANAGER.md](MANAGER.md) · **Rules of engagement:** [DECISIONS.md](DECISIONS.md) · **Parity checklist:** [docs/PARITY.md](docs/PARITY.md)

> A feature enters as 🗓 Planned, moves to 🔨 Working when a spec exists in
> [docs/tasks/](docs/tasks/) and its task row is on the board, and lands in ✅ Live when
> it is shipped and verified on the bench. Live rows carry the flow and the files that
> implement it, so a bug report traces to code fast.

> **The legacy app is the behaviour reference.** Every feature is ported from the
> legacy `intelcost` repo. "Done" means every line of that surface in
> [docs/PARITY.md](docs/PARITY.md) is ticked, not that a screen renders.

> **Realtime is not optional (D-10).** Multi-estimator editing is live in the legacy
> app and must be live in the new one.

---

## ✅ Live

| # | Feature | Repo | Flow | Location |
|---|---------|------|------|----------|
| F2 (P-01) | Auth and accounts parity | both | Sign in (`?next=`, `?invite=`) · sign up (burner block, regional trial length, invited preview) · duplicate address → sign-in · forgot and reset password (dead link refused before the form) · invitation accept, new account or existing · session recovery → [PARITY.md §1](docs/PARITY.md#1-auth), **21 lines: 19 ported and driven, 2 retired** | **app:** `pages/{Login,Signup,ForgotPassword,ResetPassword,VerifyEmail,AcceptInvite,NotFound}.tsx`, `core/auth/{session.tsx,tokens.ts}`, `core/api/client.ts`, `core/hooks/use-document-title.ts`, `core/boot/stale-chunk.ts`, `features/auth/` · **api:** `features/auth/{routes,service,tier,schemas}.py`, `features/billing/models.py`, `features/workspace/service.py`, `core/{outbox,routing,mail}.py` · **bench:** `intelcost-infra/browser/f2-*.mjs` · **spec:** [auth_parity_tasks.md](docs/archive/auth_parity_tasks.md) |
| F3 (P-02) | Workspace, roles and permissions | both | One capability layer — nine roles, twenty-five capabilities, one map read by both the runtime check and the screen (D-21) · resolution order: role default → workspace override → custom role → plan mask → trial mask, with platform admin unmasking above it (D-23) · roles matrix, with `canManageWorkspace`, `canGrantOwnerRole` and `canEditEstimates` shown and locked (D-25) · per-workspace overrides, stored sparse so a capability added later still falls back · workspace-defined custom roles, each one its own map, resolving to a base role that is never null (D-22) · a role change reaching an open tab with no reload · ownership transfer to a member or queued to an invitee, gated on typing the workspace name · general settings and the workspace logo · members with last activity, and an invite link shown once with an explicit re-mint (D-24) · an audit feed that rides the act's own transaction · feature flags, held separate from capabilities and never ANDed into one value → [PARITY.md §2](docs/PARITY.md#2-workspace-settings) **9 of 25 lines, 1 partial, 15 deferred to named features**, [§3](docs/PARITY.md#3-permissions) **all 9 lines ported and driven** | **app:** `features/workspace/{capabilities.ts,api.ts,roles.ts}`, `features/workspace/hooks/use-{permissions,matrix,custom-roles,ownership,activity,workspace-settings,feature-flag,members,invitations}.ts`, `features/workspace/components/{RolesMatrix,MembersTable,PendingInvitations,InviteLink,InviteForm,WorkspaceLogo,ActivityFeed}.tsx`, `pages/Settings{Roles,Members,General,Ownership,Activity}.tsx`, `pages/Platform.tsx`, `components/{app-shell,settings-layout,route-guard}.tsx` · **api:** `features/workspace/{capabilities,routes,service,schemas,models}.py`, `features/audit/`, `features/flag/`, `features/platform/`, `core/{dependencies,storage}.py`, 7 migrations `c4a71f2b8e15`→`c93f4e28a710` · **bench:** `intelcost-infra/browser/f3-s{1..13}.mjs`, `intelcost-infra/drives/` · **spec:** [workspace_roles_tasks.md](docs/archive/workspace_roles_tasks.md) |
| F4 (P-03) | Projects dashboard, project creation, Project Home, files and folders | both | Workspace statuses with meanings, and the dashboard tab strip · the dashboard, projects only (D-31): rows with status changer, assignees, follow-up badge, takeoff and trash; tabs with counts; filters and sort in the URL · New project, the one way in: two steps, the four seed folders, a drop zone, multipart uploads that pause offline and Retry into the same project (D-20, D-27) · Edit details · gates by named capability (D-26), pricing creates projects (D-29) · the file browser: folders, files, upload a folder, download, move rules, counts · Project Home: header, "Project not found", inline location, Plans Dated, rich-text scope and notes (cleaned twice, capped), assignees with emails · Settings > Trash: restore, delete permanently, and the nightly purge with its retry log and a bench `beat` · every dialog fits the window · the bench worker restarts on a code change (D-30). Map and geocoder deferred to P-17 (D-28); sheets from project files are F5 → [PARITY.md §4](docs/PARITY.md#4-projects-dashboard) **19 of 19 (18 ported and driven, 1 retired)**, [§5](docs/PARITY.md#5-project-home) **7 of 10, 3 owned by P-17 and F5**, [§2](docs/PARITY.md#2-workspace-settings) **+4** (Statuses ×2, Trash ×2) | **app:** `pages/{Dashboard,ProjectHome,SettingsStatuses,SettingsTrash}.tsx`, `features/project/` (`components/`, `files/`, `hooks/`, `api.ts`, `richtext.ts`, `draft.ts`), `components/ui/{dialog,confirm-dialog,prompt-dialog,context-menu,menu,tabs,date-input,select,progress,toaster}.tsx` · **api:** `features/project/{models,routes,service,schemas,richtext,trash}.py`, `worker/tasks/{maintenance,storage,ops}.py`, `core/{storage,fingerprint}.py`, 5 migrations `95c121b3680c`→`c4e8a1f6b209` · **bench:** `intelcost-infra/browser/f4-s{1..27}.mjs`, `f4-s27.sh`, `f4-dialogs.mjs`, `bench-code.mjs`, `regress.sh`, `drives/f4-s{2-bundle.sh,12-age.py,27.py}`, the `beat` service · **spec:** [projects_tasks.md](docs/archive/projects_tasks.md) |

---

## 🔨 Working

| # | Feature | Repo | Flow | Spec |
|---|---------|------|------|------|
| _Nothing in progress_ | | | | |

---

## 🗓 Planned

> In build order. Each row links to its section in docs/PARITY.md.

| # | Feature | Repo | Note |
|---|---------|------|------|
| P-07 | Realtime multi-estimator collaboration | both | D-10. Transport per D-13 |
| P-04 | Takeoff shell: sheets panel, Add Sheets, rendering, calibration and scale | both | Rendering per D-14 |
| P-05 | Item model: measure tools, dimensions, sub-items, variables, folders, layers, classifications | both | |
| P-06 | Canvas interactions: selection, copy and move, deducts, snap, ortho, undo, menus, hover | app | |
| P-08 | Estimating tab and export | both | |
| P-09 | Assemblies, Starter Pack, Library | both | |
| P-10 | Collaborator markup, print, find text, snippets and bookmarks | both | The $9.99 tier |
| P-11 | Earthwork and Auto Trace | both | Rendering per D-14 (pdf.js provides the vector data) |
| P-12 | Auto Count | both | Rendering per D-14 (pdf.js provides the vector data) |
| P-13 | AI tools and AI credits | both | |
| P-14 | Sharing and guest view, Reports, time tracking and shifts, Community | both | |
| P-15 | Billing, trials, admin panel | both | |
| P-16 | Legacy data migration and cutover | infra | Abdullah (D-11) |
| P-17 | Project map and geocoder: Show Map on the project location, and resolve a US address to city, state, zip and county | both | Deferred out of F4 by D-28. Needs a provider decision (geocoding and map tiles) and a bench fake. Legacy's never returned coordinates |
| P-18 | App bundle size: route-level code splitting | app | The production bundle is one 513 kB chunk (2026-09-25, F4 Block A) and Vite warns over 500 kB. After F4 Block E it is 644 kB, plus a 394 kB TipTap chunk that is already lazy (loaded on the first rich-text Edit). Likely needed when F5 adds pdf.js: lazy-load the takeoff route and pdf.js so the dashboard does not pay for the canvas. The stale-chunk guard (F2-S13) already covers a split bundle. At F4's close it is 642 kB, D-31 having removed the team panels and New from folder. **F5 must do it** (MANAGER F5 row) |
| P-19 | The app at phone width | app | Found at F4's close-out, from before F4: on a 375px screen the top bar (workspace selector and account links) reaches 597px, so every page scrolls sideways, and the Settings tab row does not wrap. Dialogs are unaffected (F4 fixed them to the window). Making the tab row scroll clips the active tab's underline, which overlaps the row's border, so it wants a small design, not a class |

---

## Bug Triage

Bug reported → find the feature (`L-##` / `B-##`) → identify the flow step → note the
**Repo** column → go to that file. Establish which repo served the screen first: the
legacy app and the new app can show the same symptom.

# IntelCost — Features
_**The backlog.** Every feature that is live, that we are working on, or that we intend
to build, in one list. Three sections: ✅ Live · 🔨 Working · 🗓 Planned._
_Updated: 2026-09-24_

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

---

## 🔨 Working

| # | Feature | Repo | Flow | Spec |
|---|---------|------|------|------|
| F3 (P-02) | Workspace, roles and permissions | both | Capability model (nine roles, twenty-five capabilities, workspace overrides) · roles matrix · ownership transfer · general settings and logo · members · audit feed → [PARITY.md §2](docs/PARITY.md#2-workspace-settings), [§3](docs/PARITY.md#3-permissions) | [workspace_roles_tasks.md](docs/tasks/workspace_roles_tasks.md) |

---

## 🗓 Planned

> In build order. Each row links to its section in docs/PARITY.md.

| # | Feature | Repo | Note |
|---|---------|------|------|
| P-03 | Projects dashboard, project creation, Project Home, files and folders | both | |
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

---

## Bug Triage

Bug reported → find the feature (`L-##` / `B-##`) → identify the flow step → note the
**Repo** column → go to that file. Establish which repo served the screen first: the
legacy app and the new app can show the same symptom.

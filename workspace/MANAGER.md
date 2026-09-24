# IntelCost — Manager
_**The project board.** Three sections — In Progress, Blocked, Planned — so a glance
says which feature is under development right now._
_Updated: 2026-09-24_

**Backlog:** [FEATURES.md](FEATURES.md) · **Rules of engagement:** [DECISIONS.md](DECISIONS.md) · **Parity checklist:** [docs/PARITY.md](docs/PARITY.md)

> Each row is a **2-3 line problem → solution** story, the compressed version only.
> The full task description lives in its spec under [docs/tasks/](docs/tasks/).

> **Status legend:** ☐ Planned · ◐ In Progress · ⛔ Blocked · ☑ Shipped→archived
> **Scope legend:** `Be` = Backend · `Fe` = Frontend · `Infra`
> **Owners (D-11):** Umer ports every feature on `umer-dev`. Abdullah owns infra,
> AWS, data migration and promotion to `main`.

---

## In Progress

| # | Story (problem → solution) | Scope | Owner | Spec |
|---|----------------------------|-------|-------|------|
| F3 | The product behind the front door barely exists: of the 34 behaviours in PARITY sections 2 and 3, three are marked ported (and two of those are wrong), one is partial and the rest are missing. Legacy runs on nine roles and twenty-five capabilities with per-workspace overrides; the new api has four roles and every gate reads `role === 'owner'`, which legacy's own rules forbid in writing. → Port the model whole, sequenced (D-21): S1–S4 resolution, S5–S8 the surfaces that edit it, S9–S13 the rest of workspace administration; S14–S23 are specced and handed to F4, F6, F14 and F15. Corrects three stale statuses in section 2. | Be Fe | Umer | [workspace_roles_tasks.md](docs/tasks/workspace_roles_tasks.md) |

---

## Blocked

| # | Story (problem → solution) | Scope | Blocked on | Spec |
|---|----------------------------|-------|-----------|------|
| _Nothing blocked_ | | | | |

---

## Planned

| # | Story (problem → solution) | Scope | Owner | Spec |
|---|----------------------------|-------|-------|------|
| F4 | Projects dashboard, creation, Project Home, files and folders | Be Fe | Umer | _not yet specced_ |
| F8 | Realtime foundation: socket, auth, Redis fan-out, presence and soft-locks | Be Fe | Umer | _not yet specced_ |
| F5 | Takeoff shell: sheets panel, Add Sheets, rendering, calibration. Rendering per D-14 (pdf.js, split-source, thumbnails server-side). Emits realtime events (D-13). | Be Fe | Umer | _not yet specced_ |
| F6 | Item model: tools, dimensions, sub-items, variables, folders, layers, classifications. Emits realtime events (D-13). | Be Fe | Umer | _not yet specced_ |
| F7 | Canvas interactions. Emits realtime events (D-13). | Fe | Umer | _not yet specced_ |
| F9 | Estimating tab and export. Emits realtime events (D-13). | Be Fe | Umer | _not yet specced_ |
| F10 | Assemblies, Starter Pack, Library. Emits realtime events (D-13). | Be Fe | Umer | _not yet specced_ |
| F11 | Collaborator markup, print, find text, snippets and bookmarks. Emits realtime events (D-13). | Be Fe | Umer | _not yet specced_ |
| F12 | Earthwork and Auto Trace | Be Fe | Umer | _not yet specced_ |
| F13 | Auto Count | Be Fe | Umer | _not yet specced_ |
| F14 | AI tools and AI credits | Be Fe | Umer | _not yet specced_ |
| F15 | Sharing, guest view, Reports, time tracking, Community | Be Fe | Umer | _not yet specced_ |
| F16 | Billing, trials, admin panel | Be Fe | Umer | _not yet specced_ |
| F17 | Legacy data migration and cutover. Legacy passwords are Supabase bcrypt. Verify bcrypt on login and rehash to Argon2, or every migrated user must reset. Password length rule applies on set/change only, never on login. | Infra | Abdullah | _not yet specced_ |

---

## Workflow

| File | Role | Holds |
|---|---|---|
| [DECISIONS.md](DECISIONS.md) | Rules of engagement | Calls already made, binding until superseded |
| [FEATURES.md](FEATURES.md) | Backlog | Every feature: Live, Working, Planned |
| MANAGER.md | Project board | The tasks in flight, blocked, or queued |
| [docs/PARITY.md](docs/PARITY.md) | Parity checklist | Every legacy behaviour, ticked as it is ported |
| [docs/tasks/](docs/tasks/) | Task descriptions | One `<name>_tasks.md` spec per feature in flight |

- **Picking up a feature:** write `docs/tasks/<name>_tasks.md` from its PARITY.md
  section, move the row to In Progress, move the feature to 🔨 Working.
- **Done:** every PARITY.md line for that surface ticked and driven on the bench.
  Move the spec to [docs/archive/](docs/archive/), drop the row here, move the feature
  to ✅ Live.
- **Decision:** log it in [DECISIONS.md](DECISIONS.md) as the next `D-NN` **before**
  implementing it.

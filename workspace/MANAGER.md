# IntelCost — Manager
_**The project board.** Three sections — In Progress, Blocked, Planned — so a glance
says which feature is under development right now._
_Updated: 2026-09-25_

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
| F8 | D-03 removed the only realtime channel, and F3 and F4 shipped their events named but not emitted, so a second estimator's window is stale until it is refocused, and two estimators on one item can lose each other's work. → A WebSocket on the api with Redis fan-out across api processes and from workers (D-13): JWT on connect and re-auth on refresh, membership checked on join, events published after commit (D-20) with write-token echo suppression, and refetch on reconnect. Adds the workspace collaboration mode (D-32: Work together by default, Warn me, One at a time), with the row-per-shape write paths made safe, and live in-progress drawing (D-33). Wires the F3 and F4 events live and maps all 13 legacy channels. **Questions answered, D-32 and D-33 logged. Block A (S1 to S4) checked and pushed; Blocks B and C (S5 to S12) built and driven, awaiting the founder's check.** | Be Fe Infra | Umer | [realtime_tasks.md](docs/tasks/realtime_tasks.md) |

---

## Blocked

| # | Story (problem → solution) | Scope | Blocked on | Spec |
|---|----------------------------|-------|-----------|------|
| _Nothing blocked_ | | | | |

---

## Planned

| # | Story (problem → solution) | Scope | Owner | Spec |
|---|----------------------------|-------|-------|------|
| F5 | Takeoff shell: sheets panel, Add Sheets, rendering, calibration. Rendering per D-14 (pdf.js, split-source, thumbnails server-side). Emits realtime events (D-13). **Replaces Project Home's Sheets upload block** (the bench's temporary path into takeoff since F4) with the legacy flow: Perform Takeoff opens "Load project files into takeoff" with two tabs, From Project Files and Upload drawing. The user ticks folders and files from the project's existing files, then "Choose pages" shows every page as a thumbnail, all ticked, untick to skip, and "Load N pages" opens takeoff. Asked only once per project; later additions go through Add Sheets. Drawings are made from project files (D-27). **Must include route-level code splitting (P-18)** so pdf.js and the canvas load only on the takeoff route. **Inherits from F3:** S4 AC6, the on-screen half of platform admin — a platform admin's capabilities are unmasked in the permission layer and nothing yet shows it, because no control calls `can()` until here. The first control that does closes it. **Collaboration (D-32, D-33, from F8):** emits `sheet.calibration.changed`, keeps F8's live item and shape events (`useLiveItems`, F8-S18) working on the rebuilt canvas, and renders colleagues' in-progress drawing (F8's `draft` frames, through `useDrafts`) in each colleague's colour with a "Sara W." name tag, honouring the user's Collaboration preferences (`useCollaborationPrefs`). **Two-window live check:** window A calibrates sheet A-101 and window B, open on A-101, shows the new scale and the recomputed quantities with no reload; A draws a run slowly and B watches it grow, tagged with A's short name, then become a saved shape the moment A finishes. | Be Fe | Umer | _not yet specced_ |
| F6 | Item model: tools, dimensions, sub-items, variables, folders, layers, classifications. Emits realtime events (D-13). **Inherits from F3:** the whole classification block — which systems a workspace uses, the division/scope tree with its in-use delete refusal, archive and show-archived, the duplicate-code refusal, the CSI seed — plus the Subcontractors tab. Specced as F3 S14–S18 and sequenced here deliberately, because F6 is what files items against a classification, and a tree nothing files against can only be driven as "it saved". **Collaboration (D-32, D-33, from F8):** keeps and extends F8's `takeoff.item.changed` (live since F8-S18, from today's item routes, with `useLiveItems` refetching the one item) on every new item write, and emits `takeoff.folder.changed`; every item write keeps F8-S9's item-row lock and honours the workspace mode (One at a time refuses anyone but the holder). **Two-window live check:** window A creates, renames and re-folders an item and window B's item tree follows each change live; in One at a time, A holds an item and B's rename and delete of it are disabled with "{A} is editing this item right now" and refused by the api. | Be Fe | Umer | _not yet specced_ |
| F7 | Canvas interactions. Emits realtime events (D-13). **Collaboration (D-32, D-33, from F8):** keeps and extends F8's `takeoff.geometry.changed` (live since F8-S18) on every new shape write, Resume and Extend among them. **Ports Resume and Extend as new shape rows, never as appends to an existing shape's vertices (D-32).** Renders others' cursors, in-progress drawing and presence, and honours the "show others' work" and "colour others by" preferences. Re-drives the One at a time claim on Resume and Extend. **Two-window live check:** in Work together, A and B add shapes to one count item at once and both survive with the right total; A and B drag the same vertex together and the loser sees "{name} just changed this shape, showing their version"; B sees A's cursor and A's in-progress run, named, and each of B's preferences changes what B sees. | Fe | Umer | _not yet specced_ |
| F9 | Estimating tab and export. Emits realtime events (D-13). | Be Fe | Umer | _not yet specced_ |
| F10 | Assemblies, Starter Pack, Library. Emits realtime events (D-13). | Be Fe | Umer | _not yet specced_ |
| F11 | Collaborator markup, print, find text, snippets and bookmarks. Emits realtime events (D-13). | Be Fe | Umer | _not yet specced_ |
| F12 | Earthwork and Auto Trace | Be Fe | Umer | _not yet specced_ |
| F13 | Auto Count | Be Fe | Umer | _not yet specced_ |
| F14 | AI tools and AI credits. **Inherits from F3:** the AI Credits tab — the workspace wallet, per-workspace and per-member credit limits, and returning a member to the workspace default (F3 S23). The Stripe top-up checkout inside that tab belongs to F16. | Be Fe | Umer | _not yet specced_ |
| F15 | Sharing, guest view, Reports, time tracking, Community. **Inherits from F3:** the Shifts tab and the Time Tracking tab (F3 S21–S22), and with shifts, the one thing that makes PARITY §2's "Members — list with role, shift and last activity" tick. That line is **partial** until a member has a shift to show; role and last activity already ship. | Be Fe | Umer | _not yet specced_ |
| F16 | Billing, trials, admin panel. **Inherits from F3:** the plan value itself. F3 built and drove the plan and trial capability masks, but `Plan` is a constant `pro` everywhere, so PARITY §3's "a collaborator-plan workspace loses the measure tools" cannot be reached end to end — **re-drive that line here**, once a workspace can actually be on the collaborator plan. Also the Stripe top-up checkout in the AI Credits tab, and the platform-admin screens behind the F3 S4 gate (D-23). | Be Fe | Umer | _not yet specced_ |
| F17 | Legacy data migration and cutover. Legacy passwords are Supabase bcrypt. Verify bcrypt on login and rehash to Argon2, or every migrated user must reset. Password length rule applies on set/change only, never on login. Legacy custom roles resolve absent capabilities through their base role. Migration must write each legacy custom role's full effective map, or migrated roles silently lose access. | Infra | Abdullah | _not yet specced_ |

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

# IntelCost — Manager
_**The project board.** Three sections — In Progress, Blocked, Planned — so a glance
says which feature is under development right now._
_Updated: 2026-09-26_

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
| _Nothing in progress_ | | | | |

---

## Blocked

| # | Story (problem → solution) | Scope | Blocked on | Spec |
|---|----------------------------|-------|-----------|------|
| F5 | Takeoff needs its legacy way in and pdf.js rendering (D-14); today a drawing is a side-door PNG upload. → Perform Takeoff opens "Load project files into takeoff" once per project (Choose pages, Load N pages), then Add sheets; a worker splits and thumbnails; pdf.js renders in the browser to PARITY §24 baselines; the sheets panel, calibration and scale presets; the takeoff route in its own chunks; `sheet.calibration.changed`, `drawing.source.changed`, F8's drafts on the new canvas. **Specced overnight 2026-09-26.** | Be Fe | The founder's answers to Q1 to Q9 | [takeoff_shell_tasks.md](docs/tasks/takeoff_shell_tasks.md) |

---

## Planned

| # | Story (problem → solution) | Scope | Owner | Spec |
|---|----------------------------|-------|-------|------|
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

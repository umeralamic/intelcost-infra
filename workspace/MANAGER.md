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
| F5 | Takeoff needs its legacy way in and pdf.js rendering (D-14); today a drawing is a side-door PNG upload. → Perform Takeoff opens "Load project files into takeoff" once per project (Choose pages, Load N pages), then Add sheets; a worker splits, thumbnails and wraps images into PDFs; pdf.js renders in the browser to PARITY §24 baselines, sharp from 50% to 4000% (D-35); the sheets panel, calibration and scale presets; the takeoff route in its own chunks; `sheet.calibration.changed`, `drawing.source.changed`, `drawing.sheet.changed`, F8's drafts on the new canvas. **Answers in 2026-09-26 (D-36). Block A checked by the founder. Block B closed 2026-09-27: ranged page counts, Perform Takeoff, the Load dialog with the worker's thumbnails, Upload drawing, Add sheets, the old block retired. The browser never reads a plan set, and sheets reach pdf.js as bytes that aren't served as a PDF, so IDM leaves them alone (D-41, D-42). Thumbnails run on their own worker (D-43). Block C checked by the founder 2026-09-27 (D-47 accepted). Block D built 2026-09-27 and awaiting the founder's click check. The sheets panel: its tree, search, rows and thumbnails; rename, drag, select, bookmark, move, and delete with legacy's last-shape rule (D-48); legacy's prerender of the next sheets. A production build on the bench (D-49) measures cold open at ~0.5 s and a loaded page sharp in ~1.2 to 2.1 s (legacy ~0.2 s and ~4 s). Block E (calibration and scale) is next.** | Be Fe | Umer | [takeoff_shell_tasks.md](docs/tasks/takeoff_shell_tasks.md) |

---

## Blocked

| # | Story (problem → solution) | Scope | Blocked on | Spec |
|---|----------------------------|-------|-----------|------|
| F6 | An item today is only its shapes: no height, pitch, sub-items, variables or classification, and F3 left the classification block here. → The New Measurement and Properties dialog, height and pitch modifiers, named dimensions, sub-items with a formula engine run in both the browser and the api (kept equal by one shared table), workspace variables, folders with multipliers, legacy's three seeded layers with show and hide and the last one never deleted, the item tree, and F3-S14 to S18 (systems, the tree, archive, the CSI seed, subcontractors). Every item write keeps F8-S9's lock and the collaboration mode. Duplicates count up "(2)", "(3)" (D-36). **Specced overnight 2026-09-26.** | Be Fe | F5, whose canvas and panel it sits on (the questions are answered, D-36) | [item_model_tasks.md](docs/tasks/item_model_tasks.md) |
| F7 | Today's canvas has Linear, Area and Count only: no modes, no selection or editing, no deducts, no undo, and Count makes an item per click. → Every measure tool and canvas interaction ported to the pdf.js canvas: draw modes, Segment, Count adding to the selected item (one row per mark), inline arcs analytic, snap and ortho, select and vertex editing, box select, move, copy, deducts as rows cascading from their area (`shapely` on the api), auto-merge of one's own shapes only, Resume and Extend as new rows (D-32), undo recording every act, menus, hover, mouse and keys, canvas settings on the user; colleagues' cursors, and drafts drawn solid in the item's colour by default (D-38). Crop as New Page; the other page acts are P-20. **Specced 2026-09-26, answers D-39. Follows F6.** | Be Fe | F5 and F6: the pdf.js canvas and panel, and the New Measurement dialog and item tree it draws into | [canvas_tools_tasks.md](docs/tasks/canvas_tools_tasks.md) |

---

## Planned

| # | Story (problem → solution) | Scope | Owner | Spec |
|---|----------------------------|-------|-------|------|
| F9 | Estimating tab and export. Emits realtime events (D-13). | Be Fe | Umer | _not yet specced_ |
| F10 | Assemblies, Starter Pack, Library. Emits realtime events (D-13). | Be Fe | Umer | _not yet specced_ |
| F11 | Collaborator markup, print, find text, snippets and bookmarks. Emits realtime events (D-13). **Also owns, from F7 (D-39 Q9): Dimension, the Legend and Print.** Dimension is frequently used, so F11 should not slip far behind F7. | Be Fe | Umer | _not yet specced_ |
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

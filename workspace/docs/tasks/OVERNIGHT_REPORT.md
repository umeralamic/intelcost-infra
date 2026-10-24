# Night report, 2026-10-24: My equipment (F34) and the full fixture suite

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 01:42 UTC. Updated after every block.

## Part 1: My equipment

| Block | Status | Commit(s) | Gates | Quantity table | Smoke (throwaway) |
|---|---|---|---|---|---|
| A (D-760) | Done 02:10 UTC | api 8cdabab | ruff, ruff format, mypy (242 files), `alembic check` clean | passed: 344 rows, 71 equipment rows, unchanged | Through the api on "zz MyEq Night": bundle 628 classes, list empty, show all; 3 keys added; unknown key 404; type "Hydraulic excavator" in Earthwork +19 (21 of the type) then −21; a custom machine joined on create; in-use 28 starter tier classes + the custom one; mode on/off; starting list added 1, stamped offered, mode on; an activity's Show in suggestions off (not marked edited); 9 audit rows `library.*` |
| B | Done 02:35 UTC | app 539084e | eslint, tsc, build | passed: 344 rows, unchanged | Owner on "zz MyEq Night": ticked EX-CRAWL-17T and -30T in the grid and -20T in the class detail → "My equipment (3)", type bar 3 of 21; Show my equipment only → the starting list offered 29 classes in use (EX-CRAWL-20T "1 in estimates · 7 in earthwork tiers"), ADT-25T unticked → Save 28 → mode "mine"; Hydraulic excavator Take all off → "1 of these are used in estimates; they keep pricing" → 0 of 21; reload kept mode and 23. Second throwaway (estimator, "Manage workspace library" turned off for the role): radios disabled with "ask a workspace admin", 0 checkboxes, no bulk bar, "Yes" in the column, api write 403. Found and fixed: the checkbox waited for the bundle before it moved (now shown at once); "1 of these are" → "is" |
| C | Done 03:10 UTC | app a71d085, infra 0753b3c | eslint, tsc, build | passed: 344 rows, **76 equipment rows** (5 new: a default workspace is offered 628 classes, none under My equipment; mine-only with 3 on the list offers exactly those first, folded rest, full search 628 national + 1 custom = 629; EX-CRAWL-30T on the starter check $16,471.70 on the list, off it, and off it in mine-only mode) | Throwaway in mine-only mode with a list of 3 (EX-CRAWL-20T, ADT-30T, DZ-CRAWL-D5): Add Equipment on "TEST cut" listed exactly those 3 under My equipment with the company's rates, no library list until "Search the full library"; searched "loader wheel" (15), picked WL-MINI-07Y, "Add to my equipment" put it on the list (4). Shared equipment › New resource: focus listed the 4; "excavator" → My equipment EX-CRAWL-20T first, "Search the full library (34 more)"; a library pick showed "Add to my equipment". Tier editor (Excavate and load): 4 offered, 629 with "search the full library"; 9 tier machines off the list read "Not in your equipment list" with Add, the 9 on it nothing (Q4, built here for D). Found and fixed: the picker's hidden category/type narrowed My equipment after a pick; the rate summaries lost their "$" in the edit (fixed before commit) |
| D | Done 03:45 UTC | api bcf5e05, app 58f63f2, infra 17db4af | eslint, tsc, build; ruff, mypy | passed, plus the new row **hidden activities: 27 roles (18 mapped) at 3 quantities, priced the same** (a temporary workspace made and rolled back in one transaction; nothing left behind) | On "zz MyEq Night": A2 "Excavate and load (direct to haul-off trucks)" Show in suggestions off → the undercut role's own mapping reads "Starter: Excavate and load (direct to haul-off trucks) (not in suggestions)", the cut role is not offered A2, kept after a reload. Release banner: a bench-only release 3 adding one TEST class (TEST-REL3-EX), applied and rolled back within the check → "1 new machine in release 3, not in your list: review", the row's Add to my equipment cleared the line; bench back at release 2, 628 classes. Not driven in the browser: a hidden activity's lines priced on a real estimate (no earthwork lines on a throwaway tonight; the quantity-table row is the evidence) and the site-spread machine note (same component as the tier editor's, driven in C). Found and fixed: the Show in suggestions box waited for the server (now at once) |
| E | Done 03:55 UTC | infra (workspace mirror) | full: eslint, tsc, build; ruff, ruff format, mypy, `alembic check` | full table passed (344 rows, 76 equipment rows, hidden activities row) | End to end on "zz MyEq Night" back in "Show all": the component picker lists My equipment (4) first with nothing typed; "excavator" → EX-CRAWL-20T under My equipment, then "Library" with the other 34, the listed one not repeated, nothing folded (Q3). F34 is 🔨 Working in FEATURES and In Progress on MANAGER, awaiting the founder's check |

## Part 2: the fixture suite

**Restored** (04:00 UTC): `./fx-suite.sh setup` restored tag `fixtures-archive-2026-09-28` into `intelcost-infra/fx-suite`
(git-ignored), laid today's guarded helpers and `fx-suite-updates/` over it and retargeted it at the fx stack (D-611):
its own api (8020, 8030), worker, built apps (5176, 5177), database `intelcost_fx` (migrated to d759 on start), Redis
1, MinIO bucket `intelcost-fx`, MailHog only, its own Stripe fake. The isolation check passed. The api and app tags hold
no test files (they mark the archive commit only), so nothing was restored into those repos.

**The run** (started 04:05 UTC, `fx-suite/run-all.sh`): the standing list (`regress.sh full`, 102 fixtures, 9 skipped
by D-611) and then the 29 fixtures added since the tag (c03–c31, f9-*, m6, n2, n3, n11, proof-backlog, r1, r5, rv-rows).
Results and classification: below when it ends.

**Fixed in the app so far (category a):**
1. **Saving a site machine marked its unchanged count and work day as typed** (api 9f1ec9e). The change test compared
   Decimals as strings ("2" against the stored "2.0000"), so every save put `eq_units` and `eq_hours_per_day` in
   `own_fields`, and Apply tier then kept the old count in a tier that takes more machines (1,400–2,199 kept ADT-30T ×
   2 instead of × 3). Found by the new c32. *Data already saved before the fix keeps those entries*; see Questions.
2. **"Take all off" could run before the in-use counts loaded and skip the Q7 warning** (app 4fefdfa). Found by c34.

**New fixtures so far** (`fx-suite-updates/browser/`, each on its own throwaway accounts):
| Fixture | Covers | Last run |
|---|---|---|
| c32-site-typed | D-758 follow-up (the brief's item 4): typed rates on site machines, recalculation into another tier, Apply tier same classes / a class leaving | 5/5 |
| c33-invitations | D-749 (unverified sees none; banner; Accept joins; Decline shows on the inviter's list), D-752 (second owned workspace 409) | 4/4 |
| c34-my-equipment | F34 end to end: On my list, starting list, bulk-off warning, mine-only picker and Add, reader without the capability, hidden activity, prices unchanged | 6/7 before the Q7 fix; re-run after the main run (the fx app is a build) |

**The D-758 follow-up browser check (item 4), what c32 saw** on a 150 × 90 ft pad, A1 "Excavate and load (on-site
haul)" as one site spread:
- FG 82 → 9,000 BCY, 1,000 BCY/day, tier 900–1,399: EX-CRAWL-30T × 1 + ADT-30T × 2.
- Typed in Shared equipment: the excavator's week $7,000, the truck's day $900 → the spread reads edited.
- Recalculated at FG 55 → 22,500 BCY: the screen read "22,500 BCY over 1 line · tier 900–1,399 · default for 22,500
  BCY: 1,500/day · edited", with **Apply tier**; both typed rates kept.
- Apply tier (same classes) → tier 1,400–2,199: EX-CRAWL-30T × 1 + ADT-30T × 3; both typed values carried; no notice.
- Recalculated at FG 10 → 45,000 BCY, Apply tier → tier 2,200–3,199: EX-CRAWL-50T × 1 + ADT-30T × 3; the truck's $900
  carried, the new excavator bare, and the screen's note: "Your typed values for Excavate and load (on-site haul):
  Hydraulic excavator 30-36 t (~68,000-81,000 lb) were not used: it is not in the new tier."
- Before the fix above, the same-classes Apply tier kept ADT-30T × 2.

## Decisions taken overnight

1. **The mode on the workspace row, not an `eq_override` setting** (D-760). Alternative: a "setting" override, which
   would show in the Company rates export and Revert all.
2. **"Imported machine lists" in the starting list = machines with company values or custom machines** (D-760), since
   earlier imports left no other trace. Alternative: only machines imported from tonight on.

## Questions for the founder

1. **Site machines saved before tonight's fix may hold `own_fields` that equal their stored count and work day**
   (api 9f1ec9e). They price the same today; at the next Apply tier such a machine keeps its old count. Should a
   one-off clean-up drop the entries that equal the stored value (bench and, later, production), or leave them?
   Taken overnight: nothing changed in any data.

## Throwaway data made tonight

- Account `fx.equip.202610240152@bench.intelcost.io` (password only in the MCP browser context), workspace
  **zz MyEq Night** (76988959), custom machine "TEST Loader TEST 3 yd" (U-7A6C413C3A), project **zz MyEq project** (3c357c13) with shared machine "TEST excavator 20T" (EX-CRAWL-20T); second account `fx.equip.202610240152.b@bench.intelcost.io` (estimator there); the workspace's estimator role has "Manage workspace library" turned off.

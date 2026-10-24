# Night report, 2026-10-24: My equipment (F34) and the full fixture suite

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 01:42 UTC. Updated after every block.

## Part 1: My equipment

| Block | Status | Commit(s) | Gates | Quantity table | Smoke (throwaway) |
|---|---|---|---|---|---|
| A (D-760) | Done 02:10 UTC | api 8cdabab | ruff, ruff format, mypy (242 files), `alembic check` clean | passed: 344 rows, 71 equipment rows, unchanged | Through the api on "zz MyEq Night": bundle 628 classes, list empty, show all; 3 keys added; unknown key 404; type "Hydraulic excavator" in Earthwork +19 (21 of the type) then −21; a custom machine joined on create; in-use 28 starter tier classes + the custom one; mode on/off; starting list added 1, stamped offered, mode on; an activity's Show in suggestions off (not marked edited); 9 audit rows `library.*` |
| B | Done 02:35 UTC | app 539084e | eslint, tsc, build | passed: 344 rows, unchanged | Owner on "zz MyEq Night": ticked EX-CRAWL-17T and -30T in the grid and -20T in the class detail → "My equipment (3)", type bar 3 of 21; Show my equipment only → the starting list offered 29 classes in use (EX-CRAWL-20T "1 in estimates · 7 in earthwork tiers"), ADT-25T unticked → Save 28 → mode "mine"; Hydraulic excavator Take all off → "1 of these are used in estimates; they keep pricing" → 0 of 21; reload kept mode and 23. Second throwaway (estimator, "Manage workspace library" turned off for the role): radios disabled with "ask a workspace admin", 0 checkboxes, no bulk bar, "Yes" in the column, api write 403. Found and fixed: the checkbox waited for the bundle before it moved (now shown at once); "1 of these are" → "is" |
| C | Done 03:10 UTC | app a71d085, infra 0753b3c | eslint, tsc, build | passed: 344 rows, **76 equipment rows** (5 new: a default workspace is offered 628 classes, none under My equipment; mine-only with 3 on the list offers exactly those first, folded rest, full search 628 national + 1 custom = 629; EX-CRAWL-30T on the starter check $16,471.70 on the list, off it, and off it in mine-only mode) | Throwaway in mine-only mode with a list of 3 (EX-CRAWL-20T, ADT-30T, DZ-CRAWL-D5): Add Equipment on "TEST cut" listed exactly those 3 under My equipment with the company's rates, no library list until "Search the full library"; searched "loader wheel" (15), picked WL-MINI-07Y, "Add to my equipment" put it on the list (4). Shared equipment › New resource: focus listed the 4; "excavator" → My equipment EX-CRAWL-20T first, "Search the full library (34 more)"; a library pick showed "Add to my equipment". Tier editor (Excavate and load): 4 offered, 629 with "search the full library"; 9 tier machines off the list read "Not in your equipment list" with Add, the 9 on it nothing (Q4, built here for D). Found and fixed: the picker's hidden category/type narrowed My equipment after a pick; the rate summaries lost their "$" in the edit (fixed before commit) |
| D | ☐ | | | | |
| E | ☐ | | | | |

## Part 2: the fixture suite

(filled in as it runs)

## Decisions taken overnight

1. **The mode on the workspace row, not an `eq_override` setting** (D-760). Alternative: a "setting" override, which
   would show in the Company rates export and Revert all.
2. **"Imported machine lists" in the starting list = machines with company values or custom machines** (D-760), since
   earlier imports left no other trace. Alternative: only machines imported from tonight on.

## Questions for the founder

(none yet)

## Throwaway data made tonight

- Account `fx.equip.202610240152@bench.intelcost.io` (password only in the MCP browser context), workspace
  **zz MyEq Night** (76988959), custom machine "TEST Loader TEST 3 yd" (U-7A6C413C3A), project **zz MyEq project** (3c357c13) with shared machine "TEST excavator 20T" (EX-CRAWL-20T); second account `fx.equip.202610240152.b@bench.intelcost.io` (estimator there); the workspace's estimator role has "Manage workspace library" turned off.

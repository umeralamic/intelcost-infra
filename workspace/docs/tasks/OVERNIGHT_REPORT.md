# Night report, 2026-10-24: My equipment (F34) and the full fixture suite

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 01:42 UTC. Updated after every block.

## Part 1: My equipment

| Block | Status | Commit(s) | Gates | Quantity table | Smoke (throwaway) |
|---|---|---|---|---|---|
| A (D-760) | Done 02:10 UTC | api 8cdabab | ruff, ruff format, mypy (242 files), `alembic check` clean | passed: 344 rows, 71 equipment rows, unchanged | Through the api on "zz MyEq Night": bundle 628 classes, list empty, show all; 3 keys added; unknown key 404; type "Hydraulic excavator" in Earthwork +19 (21 of the type) then −21; a custom machine joined on create; in-use 28 starter tier classes + the custom one; mode on/off; starting list added 1, stamped offered, mode on; an activity's Show in suggestions off (not marked edited); 9 audit rows `library.*` |
| B | Done 02:35 UTC | app 539084e | eslint, tsc, build | passed: 344 rows, unchanged | Owner on "zz MyEq Night": ticked EX-CRAWL-17T and -30T in the grid and -20T in the class detail → "My equipment (3)", type bar 3 of 21; Show my equipment only → the starting list offered 29 classes in use (EX-CRAWL-20T "1 in estimates · 7 in earthwork tiers"), ADT-25T unticked → Save 28 → mode "mine"; Hydraulic excavator Take all off → "1 of these are used in estimates; they keep pricing" → 0 of 21; reload kept mode and 23. Second throwaway (estimator, "Manage workspace library" turned off for the role): radios disabled with "ask a workspace admin", 0 checkboxes, no bulk bar, "Yes" in the column, api write 403. Found and fixed: the checkbox waited for the bundle before it moved (now shown at once); "1 of these are" → "is" |
| C | ☐ | | | | |
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
  **zz MyEq Night** (76988959), custom machine "TEST Loader TEST 3 yd" (U-7A6C413C3A), project **zz MyEq project** (3c357c13) with shared machine "TEST excavator 20T" (EX-CRAWL-20T); second account  (estimator there); the workspace's estimator role has "Manage workspace library" turned off.

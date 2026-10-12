# F25's migrations write data on prod, not just schema

_For Abdullah, from F25 (D-405, D-406), 2026-10-12._

**The point:** two of F25's migrations change existing rows when they run. Nothing to do beyond
knowing it before the next promotion to `main`. Both write only where a value is empty, and
neither changes a quantity.

## `d405b3e1f7a2` (D-405): schema only

- New nullable columns on `takeoff_item`: `prep_method`, `stabilizer_agents` (JSONB) and
  `stabilizer_dry_pcf`, plus a check constraint on `prep_method`.
- `earthwork_assumptions.soil_dry_unit_weight_pcf`, `NOT NULL DEFAULT 110`. Every existing
  row takes 110.
- No row's other values change.

## `d406c2a8e4b1` (D-406): schema plus two data fills

1. **Calculate's sub-item quantities.** On every Calculate sub-item (`source_type =
   'EARTHWORK_COMPUTED' AND parent_item_id IS NOT NULL`) whose `formula_qty` is empty, it sets
   `formula_qty = calculated_quantity`. The Takeoff panel reads a sub-item's quantity from
   there, and showed "—" without it.
   - Only rows written by D-405's Calculate exist, so on a database that never ran D-405's code
     this touches 0 rows.
   - On the bench it filled 2 rows in 1 project. Both were empty: D-405's code never wrote the
     column, and no such row existed before D-405.
   - A quantity already there is never changed (`AND formula_qty IS NULL`).
2. **Lift thickness.** On every Site Feature with a stored lift count and no thickness, it sets
   `prep_lift_ft = prep_depth_ft / prep_lifts`.
   - The count reads back identically (`ceil(depth / thickness - 1e-9)`), so names and
     quantities don't change.
   - This one does reach older Site Features: every one with Option 2 (Prepare subgrade) on.
3. **Schema.** New `takeoff_item.prep_lift_ft` and `prep_compaction`. A new
   `project_fill_material.kind` (`'fill'` default; every existing row stays a fill). The unique
   index `uq_project_fill_material_name` is dropped and rebuilt with `kind` in it; the table is
   small.

## `d407e5b9c3f1` (D-407): schema only

- New nullable columns on `takeoff_item`: `undercut_native` (with a check constraint),
  `undercut_lift_ft`, `undercut_stabilizer_agents` (JSONB) and `undercut_stabilizer_dry_pcf`.
- **No row's values change.** Null means today's behaviour, so every existing undercut keeps its
  lines, names, balance and version key.
- Agents stored by D-405 / D-406 keep `{agent, pct}`, which still reads; a rate in lb/SY is a new
  `lb_sy` key on new agents only.

## `d410b8f3c1e5` (D-410): renames only

Renames the folders `d409c4e2a7b6` made from "Earthwork (Grading)" to "Earthwork", only where
the name is still exactly that. On prod `d409c4e2a7b6` already inserts "Earthwork", so this
touches 0 rows there.

## `d409c4e2a7b6` (D-409): schema plus one data fill

- New `takeoff_folder.is_earthwork_lines` (`false` default).
- **Data:** every project with a sheet's Calculate lines sitting in no custom folder (and not
  moved by hand) gets one folder, "Earthwork (Grading)", position 998000, custom tree. Those
  lines are filed into it.
  - It fills `folder_id` only where it was empty. The classification placement
    (`class_folder_id`) is untouched.
  - On the bench: 4 folders and 51 lines.
  - Site lines move at their site's next save, not in the migration.
- The downgrade unfiles those lines and deletes the folders.

## Before promoting

- Run `alembic upgrade head` as part of the deploy (see the 2026-10-02 note: the production
  image does not yet do it on start).
- A backup first is the usual care. The downgrade drops the new columns, but the two fills are
  not reversed (they only filled empty values).

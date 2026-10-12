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

## Before promoting

- Run `alembic upgrade head` as part of the deploy (see the 2026-10-02 note: the production
  image does not yet do it on start).
- A backup first is the usual care. The downgrade drops the new columns, but the two fills are
  not reversed (they only filled empty values).

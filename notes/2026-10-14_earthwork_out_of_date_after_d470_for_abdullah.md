# Earthwork results show "Out of date" after the arcs change (D-470)

_For Abdullah, from Umer. 2026-10-14._

**Nothing for you to run.** No migration, no script, no job. This note is so the "Out of date"
banners after the release don't come as a surprise.

## What changed

Calculate now reads every earthwork shape the way the takeoff measures it:
- **Arcs:** a Site Feature, the work boundary or a contour drawn with arcs is read along its curve. Before, its arcs were straight lines between the corners.
- **Subtract shapes:** a Site Feature's subtract shapes are holes in it. Before, they were ignored.

A project with arcs or subtract shapes in its earthwork gets different cut and fill. Its report, its workbook and its Estimating lines change at its next Calculate.

## What users will see after it reaches staging, then main

1. **Every saved earthwork result shows "Out of date"**, whether or not it has an arc. A result is saved with a version key, and the key's version moved: v5 to v6 for a sheet, v4 to v5 for a site.
   - The app works this out each time a result is read. **Nothing is written to any project to mark it.**
   - The usual stale flag on the Estimating lines is skipped for this case, because it would be a write.
   - When the sheet opens, the Volumes panel opens once and says: "Out of date: calculated before arcs and cut-out shapes were read as drawn. Press Calculate to update these quantities."
2. **Nothing is recalculated automatically.** The old result and its lines stay exactly as they were until the user presses Calculate.
3. **Only projects with arcs, subtract shapes or ellipses get new numbers** at that Calculate. On every other project, Calculate gives the same numbers as before; only the banner clears.
4. **Ordinary out-of-date marking is unchanged.** An edit to a contour, boundary or feature still flags the Estimating lines and shows the usual message, exactly as before.

## How many projects

I counted on the bench, read only. I can't reach staging or production; the query is below for whoever can.

| Bench, 2026-10-14 | Count |
|---|---|
| Projects with arcs in Site Features, boundaries or contours | **3**: Hidden Valley Rebid — 3D test, Hidden Valley Spec Building Rebid, Marketing Demo – Site |
| Projects with subtract shapes in them | **0** |
| ...all 3 hold a saved sheet result, so their numbers change at their next Calculate | 3 |
| Saved sheet results in total, before the change (all show "Out of date") | **4**, one per project: the 3 above and HIdden Valley Spec (no arcs, so its numbers stay the same) |
| Saved sheet results still out of date now (the 3D test copy was recalculated on 2026-10-14) | **3** |
| Saved site results | 0 |

Minmar is the one other project with a curve: an ellipse or a rectangle drawn as a Site
Feature, no arcs. It has no saved result, so nothing shows "Out of date" there. A rectangle reads
the same as before. An ellipse is now read every 1°, not every 5.6°, a change of at most 0.16 %
of its area.

The same count on another database, read only:

```sql
with hit as (
  select distinct g.project_id
  from takeoff_geometry g
  join takeoff_item i on i.id = g.takeoff_item_id
  where (i.is_site_feature or i.type in ('BOUNDARY', 'CONTOUR'))
    and ((g.shape_meta::jsonb ? 'arcs') or g.role = 'subtract'
         or g.shape_meta->>'kind' in ('ellipse', 'rectangle'))
)
select (select count(*) from hit) as projects_with_curves_or_cutouts,
       (select count(*) from hit where project_id in (select project_id from earthwork_result)) as of_which_with_a_sheet_result,
       (select count(*) from earthwork_result) as sheet_results_all_out_of_date,
       (select count(*) from earthwork_site_result) as site_results_all_out_of_date;
```

## If a customer asks

"The way Calculate reads curved and cut-out shapes was corrected. Press Calculate once on each
grading sheet. If the sheet has no curves or cut-outs, the numbers won't change."

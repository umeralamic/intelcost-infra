# T9: shapes Ortho pulled before the fix — a read-only check for staging and production

_For Abdullah. Written 2026-10-19. The SQL below has been run only on the local bench (read-only, in a
`begin transaction read only … rollback`). Please run it on staging and on production; I don't._

## What happened

Before D-620 (2026-10-18) and D-632 (2026-10-19), Ortho pulled clicks it should have left alone:
- **Rectangle and Ellipse / Circle** (Linear and Area): the far corner went onto the nearest 45° ray (22.5° with Alt).
  A 20 × 30 ft box came out a 25.5 ft square: 650 SF instead of 600, 101.98 LF instead of 100.
- **Arcs:** in Linear Arc mode, the through point and the end; inside a Point to Point run (the A key), the arc's
  through point and end. The arc drawn was not the one through the clicks, so its length (or the area it bounds)
  was wrong.

Only shapes drawn by clicking with Ortho on are affected. Press-and-drag boxes, Count, structures, Trace, Auto Count,
and straight edges (which Ortho is meant to turn) are not.

## How the SQL tells a pulled shape

| Shape | The mark Ortho leaves | Read from |
|---|---|---|
| Rectangle | width and height exactly equal in page points (or in the ratio tan 22.5° = 0.414214) | `shape_meta.corners` |
| Ellipse / Circle | the box's two diameters exactly equal in page points (or that ratio) | `shape_meta.rx`, `ry` |
| A-arc in a Point to Point run (Linear, Area, contour, boundary) | the chord from the arc's start vertex to its end lies exactly on a 22.5° multiple | `vertices_json`, `shape_meta.arcs[].i` |
| Arc mode | **not detectable**: the through point is not stored | counted only, as "review only" |

"Exactly" is 1e-6 relative (1e-6° for the chord), far tighter than a hand click. Page points are the sheet's
`width_pt` / `height_pt` times the stored fractions, the frame the pen worked in.

## The query

Counts only, per workspace, per tool, per kind: no names, no geometry leave the database. Deleted projects are left
out.

```sql
-- T9 / D-620 / D-632: shapes Ortho pulled before the fix. Read-only, counts only.
with excluded_workspaces as (
  -- Staging and production: leave empty. (The bench test excludes the founder's workspaces here.)
  select null::bigint as id where false
),
shapes as (
  select w.uuid as workspace_uuid, w.name as workspace, lower(i.type::text) as tool,
         g.shape_meta::jsonb as m, g.vertices_json::jsonb as v,
         s.width_pt::float8 as wpt, s.height_pt::float8 as hpt
  from takeoff_geometry g
  join takeoff_item i on i.id = g.takeoff_item_id
  join drawing_sheet s on s.id = g.sheet_id
  join project p on p.id = g.project_id
  join workspace w on w.id = g.workspace_id
  where p.deleted_at is null
    and i.type::text in ('LF', 'SF', 'CONTOUR', 'BOUNDARY')   -- Linear, Area, and the earthwork runs that borrow their pen
    and s.width_pt > 0 and s.height_pt > 0
    and g.workspace_id not in (select id from excluded_workspaces)
),
-- Rectangles and ellipses: the box's sides in page points.
boxes as (
  select workspace_uuid, workspace, tool, m->>'kind' as kind,
         case m->>'kind'
           when 'rectangle' then abs(((m->'corners'->2->>0)::float8 - (m->'corners'->0->>0)::float8) * wpt)
           else 2 * (m->>'rx')::float8 * wpt end as a,
         case m->>'kind'
           when 'rectangle' then abs(((m->'corners'->2->>1)::float8 - (m->'corners'->0->>1)::float8) * hpt)
           else 2 * (m->>'ry')::float8 * hpt end as b
  from shapes
  where m->>'kind' in ('rectangle', 'ellipse')
),
box_hits as (
  select workspace_uuid, workspace, tool, kind,
         count(*) as drawn,
         count(*) filter (where greatest(a, b) > 0 and (
           abs(a - b) <= 1e-6 * greatest(a, b)                                  -- a 45° pull: a square
           or abs(least(a, b) / greatest(a, b) - tan(radians(22.5))) <= 1e-6     -- an Alt 22.5° pull
         )) as hits
  from boxes group by 1, 2, 3, 4
),
-- A-arcs inside Point to Point runs: the chord from vertex i to the next lies exactly on a 45° (or 22.5°) ray.
arcs as (
  select sh.workspace_uuid, sh.workspace, sh.tool, sh.v, sh.wpt, sh.hpt, (a->>'i')::int as i, jsonb_array_length(sh.v) as n
  from shapes sh, jsonb_array_elements(sh.m->'arcs') a
  where jsonb_typeof(sh.m->'arcs') = 'array' and jsonb_typeof(sh.v) = 'array'
),
chords as (
  select workspace_uuid, workspace, tool,
         degrees(atan2(((v->((i + 1) % n)->>1)::float8 - (v->i->>1)::float8) * hpt,
                       ((v->((i + 1) % n)->>0)::float8 - (v->i->>0)::float8) * wpt)) as deg
  from arcs where i >= 0 and i < n
),
arc_hits as (
  select workspace_uuid, workspace, tool, 'a-arc in a run'::text as kind,
         count(*) as drawn,
         count(*) filter (where least(abs(mod(deg::numeric + 720, 22.5)), 22.5 - abs(mod(deg::numeric + 720, 22.5))) <= 1e-6) as hits
  from chords group by 1, 2, 3
),
-- Arc mode: the through point is not stored, so a pulled one cannot be told. Counted for review only.
arc_mode as (
  select workspace_uuid, workspace, tool, 'arc mode (review only)'::text as kind, count(*) as drawn, null::bigint as hits
  from shapes where m->>'kind' = 'arc' group by 1, 2, 3
)
select workspace_uuid, workspace, tool, kind, drawn, hits
from (select * from box_hits union all select * from arc_hits union all select * from arc_mode) t
order by hits desc nulls last, workspace, tool, kind;
```

## What a hit means

A hit is a shape whose clicks sit exactly where Ortho would have pulled them. It is **probably** a pulled shape, not
certainly:
- **A real square**, a true circle, or a chord exactly across, up or on a 45° line, drawn with snapping to existing
  points, also matches.
- **A hit with a sensible figure** (a 20 × 20 room, a manhole circle) is most likely fine.
- **A hit on a box that should not be square,** or an arc whose length looks off, is the bug.
- **Misses:** a shape moved or reshaped after it was drawn keeps its sides but can lose its mark; a rotated sheet
  view is not accounted for. Arc-mode arcs can't be told at all.

## What to do with hits

1. **Don't change any saved shape.** The fix stops new ones; the stored ones are the estimator's measurements, and only
   they know what was meant.
2. **Send me the counts**, per workspace, for staging and production, with how many hits each.
3. **If production has hits,** the founder decides whether to tell those workspaces' owners, with a list from a follow-up
   query naming the projects and sheets (one I'll write for that workspace only, if asked).
4. **Arc-mode counts** are not hits. They say how many arcs exist to review by eye if a workspace reports wrong arc lengths.

## On the bench, for reference

- **Bench, founder workspaces excluded:** 4 rectangles, 0 hits.
- **Tonight's BENCH DUP on its own:** 20 A-arcs, 1 rectangle and 1 Arc-mode arc, 0 hits. All of them were drawn after
  the fixes.

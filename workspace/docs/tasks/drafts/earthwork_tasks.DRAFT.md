# F12 — Earthwork (draft: the starting point from live legacy)

> **Draft, not adopted.** Written 2026-09-29 from `LEGACY_UMERALAMDEV_DIFF.md` items 7, 8,
> 9, 20 and 21 (D-96) as F12's starting point. **Nothing here is built.** When F12 is
> picked up, this becomes `docs/tasks/earthwork_tasks.md` with its stories, and PARITY §16
> is rewritten to it. §16 still describes the model legacy left: one strip thickness per
> sheet, depth on any area, and the scarify question. Auto Trace, F12's other half, is not
> covered here.

## Where legacy is now (`UmeralamDEV`, 2026-09-27)

Plan: `.lovable/plan/site-features-and-strip-area-earthwork-2026-09-27.md` (e25c5795).

The engine lives in `src/lib/takeoff/earthwork/`:
- `volume/index.ts` and `volume/types.ts`
- `siteFeatures.ts`, `makeSiteFeature.ts` and `computeToItems.ts`
- `roles.ts` and `versionKey.ts`

The screens:
- `SiteFeatureDialog.tsx`, `StripAreaDialog.tsx` and `StripAreaLayer.tsx`
- `EarthworkCalculateDialog.tsx` and `EarthworkToolbarGroup.tsx`
- `useStripAreas.ts`

The migrations are 20260927195839, 195859, 200210 and 210520.

### 1. Site Features are the only source of earthwork depth

**Creating one.**
- A "Site Features" button sits before EG/FG. Its dialog asks for:
  - a name and a colour;
  - "Proposed Grade to Subgrade Depth" (in or cm);
  - Option 1, undercut: depth, extend beyond the edge (ft or m), replacement material (five
    defaults and "+ Add material", saved per project) and spoil destination;
  - Option 2, prepare subgrade: depth and N lifts.
- The area is then drawn with the Area tool. The item is filed under Earthwork Markups
  with `is_site_feature`.

**What it changes.**
- Depth now comes only from Site Features that have a depth over 0 (`collectRoleAreas`).
- A plain area's old `role_depth_ft` is ignored.
- Finish-to-Subgrade Depth is gone from the Area tool, New Item and Properties. Our
  `MeasurementDialog.tsx` still defers that field to F12; legacy has dropped it.

**Undercut footprint.**
- The outline is offset in real feet, with the sheet's X and Y scales applied separately.
- Corners use a mitre join; one whose mitre runs past 4·d is cut to a bevel.
- The offset is unioned with the source outline and clipped to the boundary.
- Where features overlap, the one on top of the z-order wins, ties broken by id.

**Prepare subgrade:** the outline clipped to the boundary, the top feature winning, and
applied separately from undercut.

**Make Site Feature:** right-click a plain area. It copies the geometry (new ids, owners
remapped) into a new flagged item in Earthwork Markups. The source is never written, and
the two are independent afterwards.

### 2. Strip Areas replace the one strip thickness per sheet

**What a Strip Area is.**
- A sheet holds several, each with its own depth.
- The source is one of four: chosen Site Features, the whole boundary, "Remaining Site
  within Boundary" (the boundary less the unchecked features), or a drawn outline.
- A drawn outline is kept on the strip's own row, never as a takeoff item.

**The volume engine.** `computeVolumes` takes `stripAreas[]`, newest first:
- Each strip's polygons are unioned, less any excluded ones, then clipped to the boundary.
- Where strips overlap, the newest wins.
- Every region piece is split by the strips that own it, and each prism uses
  `dzShift = pieceStripDepth − roleDepth`.
- A newest strip that covers the whole boundary takes the old uniform path.
- Per strip, the result is an area in SF and `volumeCY = area × depth`.

**Worked test (legacy's e4):** Remaining Site with a 25 % cut-out gives 7,500 SF and
3750/27 CY, and the same amount shows up as fill.

**Breaking change:** with the flag on, a sheet with no Strip Area rows strips nothing, and
`strip_thickness_ft` is no longer read.

### 3. Estimate lines, CSI codes and the balance (`computeToItems.ts`, 9de4583f)

**Strip lines.** Each Strip Area makes "Strip Topsoil (d) — name" in BCY and one
destination line:
- Haul Off or Stockpile: bank × swell, in LCY.
- Re-use as Topsoil Fill: in BCY.
- Re-use as General Fill: bank × shrink, in CCY. The bank volume is added to the re-use
  supply.

**Site Feature lines.**
- Undercut Excavation (bank), and its spoil line under the same destination rules.
- "Undercut Replacement Fill: {material} (compacted in place)", equal to the bank volume
  with no shrink.
- Prepare Subgrade in SF (or m²), only when the area is over 0.5.

**Net balance.**
- Suitable soil: `cut + reuse × shrink − fill`.
- Unsuitable soil: `importNeed = fill − reuse × shrink`, and
  `export = cut + max(0, −importNeed)`.

**CSI codes per role.**
- 31.01.04: strip, strip stockpile, strip topsoil re-use, undercut stockpile.
- 31.03.05: strip haul, undercut haul.
- 31.03.03: strip re-use as fill, undercut re-use as fill.
- 31.05.03: undercut, and undercut replacement. Replacement becomes 31.05.04 when the
  material name contains "aggregate" or "crushed stone".
- 31.05.02: prep.
- Otherwise, the scope classification.

**Retired.** The old strip / Topsoil Export pair is dropped on the next recalculation.

### 4. The Calculate dialog, the version key, storage and screens

**Calculate dialog.**
- The sheet's "Scarify, moisture condition & compact" question is gone, with its thickness,
  feature list and Remaining Site. Prep now comes from each feature.
- A shrink factor is added (bank to compacted, default 1.00), stored on the project.

**Version key.** It folds in each Site Feature's parameters and each Strip Area's id,
version, depth, disposition, re-use kind and feature ids.

**Storage.**
- A new `earthwork_strip_areas` table.
- After a takeoff item is deleted, a trigger removes that feature from the strips'
  `feature_ids`, and deletes any feature-sourced strip left empty.

**Screens.**
- The canvas shows a hatched, dashed overlay.
- The tree shows virtual rows under Earthwork Markups, with Properties, Hide and Delete.
- Undo covers create and edit only. Delete is confirmed and final.
- After a delete, a prompt asks "Earthwork quantities have changed. Recalculate grading?"
  with Recalculate or Later.
- Rows merge live, guarded by version.

## Decide when F12 is picked up

1. **Disposition values: fix legacy's defect.** Legacy's code writes `reuse_fill` and
   `general_fill`, but its CHECK allows `reuse`, `general` and `reuse_general`, so a
   "Re-use" choice is refused by the database. Choose one set of values.
2. **Migrating old projects.** Legacy has no backfill in its migrations. The plan wants:
   - each area that carried a depth copied into a Site Feature;
   - each `strip_thickness_ft` seeded as a boundary Strip Area.

   Without it, old projects lose their strip and depths on the next recalculation. Our
   migration (F17) must decide.
3. **Where the volume engine runs.** It is in the browser in legacy. Hard rule 2 puts it
   in takeoff-core, and a Celery worker can run it too (F4's queue).
4. **The Site Feature delete confirm.** The plan wants it to name the Strip Areas it
   affects; no such UI was found in legacy.

## Already true in the new app

`lib/estimate/lines.ts` leaves out Earthwork Markups. So a Site Feature adds no area line
of its own to Estimating, which is legacy's rule too.

# Legacy `UmeralamDEV` since `12dd119b`: what changed, and what it means for the new app

_Written 2026-09-29 (D-95). Live legacy is `origin/UmeralamDEV` (HEAD `e99cddcb`,
2026-09-27); our checkout had stopped at `12dd119b` (2026-09-24). The range is 161 commits
(138 without merges) touching 73 files, +6,986 / −494 lines. Every commit is titled
"Changes", so this was read from the code, the migrations and the three plan files. Hashes
are the commits that touch the files named; single behaviours inside
`ProjectEstimatingView.tsx` and `ProjectTakeoff.tsx` cannot be tied to one commit._

_Three areas changed: **cost components and shared equipment** (F9, F10), **earthwork
site features and strip areas** (F12), and a few **takeoff-screen fixes** (F6, F7). No app
code was changed for any of this (the founder, 2026-09-29): every "differs" below is work
to schedule._

**Status key.** **Differs**: built in the new app and no longer matches legacy (flagged).
**Not built**: nothing in the new app yet. **Matches**: built and the same.

## Most important first

### 1. Deleting an item loses its cost components, and undo does not bring them back — **differs (data loss)**
- **Fixed 2026-09-29** (D-96, fastapi `8d645a0`, react `3007599`): undo keeps them; every delete names them.
- **Legacy:** every item delete path names what goes with it: bulk delete, delete
  everywhere, delete entire item and the sub-item prompt all add "It also removes N cost
  components ($X)." A single-sheet delete, normally silent and undoable, always asks first
  when the item or its sub-items host components, because components are not undoable.
  (`QuantityTable.tsx` 2d423518, b27e93de; `SheetTree.tsx` b27e93de; `ProjectTakeoff.tsx`
  `componentImpact`, around 9a0c5a75.)
- **New app:**
  - No delete message mentions components (`ProjectTakeoff.tsx` `confirmDeleteItem`, bulk
    delete, `deleteShapes`).
  - The api's undo snapshot (`app/features/takeoff/snapshot.py` `_TABLES`) covers the item,
    its dimensions, geometry and estimate line. It does not cover `takeoff_cost_component`,
    `project_equipment_usage` or `estimate_custom_value`, which cascade away with the item.
  - So Ctrl+Z restores the item without its components, equipment usage or custom column
    text, silently.
- **Maps to:** F9 × F7 (undo, D-73). **Importance:** high.

### 2. Cost component formulas see only QTY and PARENT — **differs (money)**
- **Fixed 2026-09-29** (D-96, react `3007599`): legacy's environment in `lib/estimate/componentEnv.ts`.
- **Legacy:** `costEnvFor` builds the component environment with `buildFormulaEnv`:
  - workspace variables and rough measurements (refs);
  - the host's primitives (LINEAR, AREA, PERIMETER, count), its dimensions and its
    sibling sub-items;
  - PARENT is the host's own quantity for a top-level item, and the parent's quantity for
    a sub-item host;
  - QTY is the host's net quantity.
  (Commits 9e1343c0 … c254a15f.)
- **New app:** `EstimatingView.tsx` `envFor` returns only `{ parent, qty }`, with `parent`
  0 for a top-level item. A component or usage formula that reads a variable, a dimension,
  a sibling or PARENT errors or prices differently. `lib/takeoff/subItems/env.ts
  buildFormulaEnv` already exists and is not used here.
- **Maps to:** F9. **Importance:** high.

### 3. The workbook's formulas can drop lumps when Excel recalculates — **differs (money in the file)**
- **Legacy:** `exportFormulas.verifiedFormula` (08286392, b1c232c1), through `setChecked`,
  keeps a derived cell's formula only when it reproduces the app's value from that row's
  cells; otherwise it writes the plain value.
- **New app:** `lib/estimate/workbook.ts` always writes `total_qty*unit_material`,
  `total_qty*unit_mh`, `total_mh*wage` and `total_qty*unit_equipment`. On recalculation
  these lose, among other things:
  - lump-mode component money;
  - a shared-equipment share on a unit-equipment item;
  - a blended crew wage;
  - the "No quantity" all-lump case.

  The file can then show totals that differ from the app.
- **Maps to:** F9 (Block E, D-90). **Importance:** high.

### 4. Removing the last component of a cost type: legacy asks what the rate becomes — **not built**
- **Legacy:** the first component of a type snapshots the typed rates
  (`estimating_line_costs.manual_rates_snapshot`, trigger
  `snapshot_manual_rates_on_first_component`). Removing the last component of that type
  asks for one of three: "Keep as typed rates" (the derived rate or lump written back),
  "Restore earlier rates" or "Clear rates". Every component delete confirms. It goes
  through the atomic `delete_cost_component` RPC. (`componentRemoval.ts` f6f30436;
  migrations 20260926145223 aa2af9ef, 20260926152316 2b4d4e88; `CostComponentsProvider`.)
- **New app:** `DELETE …/estimate/components/{uuid}` deletes with no confirmation and no
  choice. Whatever typed rates were stored before the components silently come back into
  the price. There is no snapshot column.
- **Maps to:** F9. **Importance:** high.

### 5. An item with cost components cannot take sub-items — **differs**
- **Legacy:** database triggers `ti_block_subitem_on_component_host` and
  `enforce_cost_component_host` block both directions. Opening Create sub-item on a
  component host closes with the toast "Cannot add sub-items — This item has cost
  components. Remove them before adding sub-items." (migration 20260926145223 aa2af9ef;
  `ProjectTakeoff.tsx` 9ddb6972.)
- **New app:** only one direction is blocked (a component on a parent is refused 409,
  `components.py` `NOT_A_HOST`). `set_sub_items` in `app/features/takeoff/service.py` has
  no reverse check, and the Manage sub-items dialog no block. A host that gains sub-items
  becomes a roll-up parent and its components silently stop counting.
- **Maps to:** F6 × F9. **Importance:** high.

### 6. "No quantity" and "Formula error" are not shown — **differs**
- **Legacy:** when a host's net quantity is 0 or less, or a component formula errors,
  Item Cost shows a red chip ("No quantity" / "Formula error", the error as its title).
  Derived unit cells show "—" when there is no quantity.
- **New app:** `costing.ts` sets the same `flags`, but `EstimatingView.tsx` `cell()` never
  reads them. The fallback total shows as a plain number.
- **Maps to:** F9. **Importance:** high.

### 7. Earthwork: Strip Areas replace the per-sheet strip thickness — **not built (F12 must start here)**
- **Legacy:**
  - A sheet holds several Strip Areas, each with its own depth. The source is one of four:
    chosen Site Features, the whole boundary, "Remaining Site within Boundary", or a drawn
    outline.
  - `computeVolumes` takes `stripAreas[]`, newest first. Each strip's polygons are
    unioned, minus the excluded ones (Remaining Site), then clipped to the boundary; where
    strips overlap, the newest wins.
  - Each region piece is split by the strips it owns, with
    `dzShift = pieceStripDepth − roleDepth`.
  - Per strip: area SF and `volumeCY = area × depth`.
  - With the flag on, a sheet with no Strip Area rows strips nothing:
    `strip_thickness_ft` is no longer read.
  (`volume/index.ts`, `volume/types.ts`: 2655b812 3b8f62b1 7fb74e86 bcfeceed 20f22ec4
  ed3b6add; plan `site-features-and-strip-area-earthwork-2026-09-27.md`, e25c5795.)
- **New app:** no earthwork engine yet (`lib/takeoff/earthwork/` does not exist). PARITY
  §16 describes the old model and must be rewritten when F12 is specced (lines 625, 637;
  no lines for Site Features, Strip Areas, shrink, undercut or prep).
- **Maps to:** F12. **Importance:** high for F12's spec.

### 8. Earthwork: Site Features are the only source of depth, with undercut and prep — **not built**
- **Legacy:**
  - A "Site Features" button before EG/FG asks for a name, a colour, "Proposed Grade to
    Subgrade Depth", and then, optionally, undercut (depth, extend beyond edge,
    replacement material, spoil destination) and/or prepare subgrade (depth, lifts).
  - You then draw it with the Area tool; it is filed under Earthwork Markups,
    `is_site_feature`.
  - Depth now comes only from Site Features: a plain area's old `role_depth_ft` is
    ignored, and Finish-to-Subgrade Depth is gone from the Area tool, New Item and
    Properties.
  - Undercut offsets the outline in real feet (mitre joins, bevel past 4·d), unions it
    with the source and clips it to the boundary; the top of the z-order wins.
  (`siteFeatures.ts` 2655b812 a58f936f; `roles.ts` 44312874; `SiteFeatureDialog.tsx`
  9c59a118; `EarthworkToolbarGroup.tsx` f8a61b6b; migration 20260927195839 d586f0e6.)
- **New app:** not built. The new app's `MeasurementDialog.tsx` still defers
  Finish-to-Subgrade Depth to F12, which legacy has now removed.
- **Maps to:** F12. **Importance:** high for F12.

### 9. Earthwork: new estimate lines, CSI codes and a shrink-aware net balance — **not built**
- **Legacy** (`computeToItems.ts` 9de4583f):
  - **Strip lines:** each Strip Area gives "Strip Topsoil (d) — name" in BCY, plus a
    destination line: Haul Off / Stockpile in LCY (× swell), Re-use as Topsoil Fill in
    BCY, or Re-use as General Fill in CCY (× shrink, added to the re-use supply).
  - **Site Feature lines:** Undercut Excavation, its spoil line,
    "Undercut Replacement Fill: {material}", and Prepare Subgrade (SF, when over 0.5).
  - **Net balance:** suitable soil: `cut + reuse×shrink − fill`; unsuitable soil: import
    and export are split.
  - **CSI codes per role:** 31.01.04, 31.03.05, 31.03.03, 31.05.03, and 31.05.04 for
    aggregate or crushed stone.
  - **Old lines dropped:** the old strip / Topsoil Export pair goes on the next recalc.
  - **Shrink:** the Calculate dialog drops the scarify question and adds a shrink factor
    (`projects.earthwork_shrink_factor`, default 1.00).
- **Maps to:** F12 (lines into F9's Estimating). **Importance:** high for F12.

### 10. A cost component's last good total is thrown away on a formula error — **differs**
- **Legacy:** saving a component whose formula errors keeps the prior saved `total`, which
  the engine then carries as a lump ("last good total").
- **New app:** `features/estimate/ComponentDialog.tsx` sends `total: null`, overwriting it,
  so the engine carries 0.
- **Maps to:** F9. **Importance:** medium-high (money).

## Then

### 11. Item "Costs…" lets you type rates that components override — **differs**
- **Legacy:** `ItemCostsGrid.tsx` (80681d4b) and `SubItemDialog.tsx` (c6a4d4bc, ce554963)
  show component-derived fields read-only and italic, titled "From components" ("—" with
  no quantity).
- **New app:** `ItemCostsDialog.tsx` keeps every field editable; only the Estimating grid
  shows "From components".
- **Maps to:** F9. **Importance:** medium.

### 12. Deleting a sub-item always asks, naming the components it takes — **differs**
- **Legacy:** one prompt, "Delete sub-item? / Delete N sub-items? <names> [and N cost
  components ($X)] will be removed. This cannot be undone.", on the row's delete, the
  Estimating row's delete, and on saving Manage sub-items with rows marked for deletion.
  In the last case, Cancel keeps those rows and the other edits still save. (9a0c5a75.)
- **New app:** the row delete asks with the item wording and no component line. Manage
  sub-items deletes marked rows on save without asking (`SubItemsDialog.tsx`).
- **Maps to:** F6 × F9. **Importance:** medium.

### 13. The component formula field has an Insert menu and a live preview — **differs**
- **Legacy:** `CostFormulaField.tsx` (721686fa) has an Insert ▾ menu (QTY, PARENT for
  sub-item hosts, variables with the list-value picker, siblings), converts variables
  between display and stored form, and previews the result as you type.
- **New app:** plain text inputs for the quantity and duration formulas
  (`ComponentDialog.tsx`).
- **Maps to:** F9. **Importance:** medium.

### 14. Cost component rows in the Takeoff panel and on the canvas item menu — **not built**
- **Legacy** (`ItemRowShared.tsx` f6e820a4):
  - one row per component under an item or sub-item (kind icon, name, $ total, unit or
    "LS"), clicked to edit;
  - "Add cost component ▸" (Labor, Material, Equipment, Subcontract) in the row's ⋮;
  - a hover $ on sub-item rows;
  - a four-icon strip in the canvas item right-click menu.
- **New app:** components live only in Estimating. P-21 lists "sub-item and cost rows
  inline".
- **Maps to:** F9 / P-21. **Importance:** medium.

### 15. "Couldn't load bid layers": retries, a specific message and Retry — **differs**
- **Legacy:**
  - The layers read retries up to three times (350 ms, then 700 ms) on status 0, 408, 429
    or 5xx, and ignores loads that finish out of order.
  - The toast depends on the status: 401 session expired, 403 no access, 404 contact
    support, temporary "…temporarily unavailable. Your measurements have not been
    changed."
  - The toast has a Retry action.
  (`useTakeoffLayers.ts` b00c6c35, 101bf86b; `toast.tsx` a6243630, 91cc0aff; plan
  `repeated-couldn-t-load-bid-layers-warning-2026-09-27.md`; e99cddcb.)
- **New app:** React Query retries twice on 5xx or network errors only, never 408 or 429.
  `useFolders.ts` never reads the layers query's error, so a failed read shows an empty
  layer list with no message and no Retry.
- **Maps to:** F6. **Importance:** medium.

### 16. A zoom percentage flashes in the canvas corner — **not built**
- **Legacy:** a small "NN%" at the canvas's top right while zooming (wheel, trackpad,
  buttons, Fit, zoom window), hidden 2 s after it settles. (`PdfCanvas.tsx` 91d1f2aa,
  0a80565d; plan `temporary-canvas-zoom-percentage-2026-09-26.md`.)
- **New app:** nothing shows the zoom level (`SheetCanvas.tsx`).
- **Maps to:** F7. **Importance:** medium.

### 17. Component and shared rows are prorated in the Sheet pivot — **differs (display)**
- **Legacy:** `costFilter.componentDisplayRows` shows qty and total × the row's sheet
  share.
- **New app:** component rows are evaluated at the sheet row's quantity, and lumps
  (quotes, mob/demob) and "Shared — machine" rows show in full on every sheet. The money
  totals are right; the detail rows are not.
- **Maps to:** F9. **Importance:** medium.

### 18. Expanding components works per host, and the export follows the screen — **differs**
- **Legacy:** a chevron on each host row plus Expand all / Collapse all. A cost filter
  expands automatically and disables the button. The export writes component rows only
  where they are expanded.
- **New app:** one global toggle, no automatic expansion, and `workbook.ts` `detailsOf`
  always writes component and shared rows.
- **Maps to:** F9. **Importance:** low-medium.

### 19. Warning triangles on host rows — **not built**
- **Legacy** (`templateCosts.uncoveredUsage`, `pendingFlagText`; `reconcile.isQuantityPending`
  37e7eeaa): an AlertTriangle for:
  - a usage row on an item outside the machine's divisions;
  - an assembly expecting a shared machine the project lacks;
  - a sub-item whose formula quantity is not yet calculated ("Quantity pending" instead
    of $0).
- **New app:** none. The last two only matter once F10 exists; the first applies now.
- **Maps to:** F9 / F10. **Importance:** low-medium.

### 20. Earthwork: storage, canvas, tree, undo and realtime for Strip Areas — **not built**
- **Legacy:**
  - **Storage:** an `earthwork_strip_areas` table. A drawn outline lives on the row, not as
    a takeoff item.
  - **Delete trigger:** after a takeoff item delete, a deleted feature is removed from
    `feature_ids`, and a strip left empty is deleted.
  - **Screen:** a hatched, dashed overlay on the canvas; virtual rows under Earthwork
    Markups; undo for create and edit only.
  - **After a delete:** "Earthwork quantities have changed. Recalculate grading?"
  - Live merges guarded by version.
  (`useStripAreas.ts`, `StripAreaDialog.tsx`, `StripAreaLayer.tsx`; migrations
  20260927195839, 195859, 210520.)
- **Also:**
  - "Make Site Feature" on a plain area (`makeSiteFeature.ts` e8f38c08) copies it into a
    new flagged item.
  - The version key folds Site Feature fields and Strip Areas (`versionKey.ts` 44312874).
- **Maps to:** F12. **Importance:** medium for F12.

### 21. Legacy defect to avoid when porting: earthwork disposition values
- **The mismatch:** the code writes `reuse_fill` and `general_fill`, but migration
  20260927195839's CHECK allows `reuse`, `general` and `reuse_general`.
- **Effect:** as committed, a "Re-use" strip or undercut would be refused by the database,
  with only a `console.warn`.
- **Unknowns:** no backfill migration moves old depth areas into Site Features or seeds a
  boundary Strip Area from `strip_thickness_ft`, so old projects may lose their strip on
  the next recalc. It is unknown whether the live database was changed by hand.
- **Maps to:** F12 (spec note). **Importance:** medium for F12.

### 22. Assemblies carry cost components and shared equipment — **not built (F10, as expected)**
- **Legacy:**
  - Templates hold components and equipment usage, with host rules enforced by triggers.
  - "Save as assembly" copies them, turning an override into a formula.
  - `apply_assembly` is one all-or-nothing call, with `apply_assembly_precheck` in plain
    words, an "Add to existing cost components?" confirmation, and "Assembly not applied …
    Nothing was changed".
  - `copy_template_costs` has a Retry toast.
  - Equipment links by name ignoring case, with pending links resolved by trigger and a
    "Shared equipment missing" toast.
  (`templateCosts.ts` 85d47d3c 9db64d1f; `saveTemplate.ts` 02c53ae8;
  `TemplateComponentsSection.tsx` 63180de5; `AssembliesPanel.tsx` b381caef; migrations
  20260926210336 f85c6e36, 213412 50d7d19a, 213818 e15f8a69.)
- **Maps to:** F10. **Importance:** for F10's spec.

### 23. Component order on a host — **differs (minor)**
- **Legacy:** components are ordered by position across all kinds, in insertion order.
- **New app:** `components.py` counts position per kind and lists by kind first.
- **Maps to:** F9. **Importance:** low.

## Built and matching

These were ported from this branch overnight and still match:
- **Component arithmetic:**
  - `components.ts` and `costing.ts` `applyComponents`: unit against lump, divided by the
    whole net quantity, blended wage;
  - QTY in the formula engine, for components only (`subItems/formula.ts`).
- **Shared equipment:**
  - allocation: largest-remainder cents, rental rounding, the four flags;
  - eligibility and usage resolution;
  - the Equipment dialog, with share acknowledgement and "2d" usage;
  - names unique per project.
- **Unallocated rows:** in the home division's group, and in the Sheet pivot's own group
  (D-94), with the workbook's first sheet.
- **Cost-type filter:**
  - projection;
  - hidden columns;
  - the "Labor cost" label;
  - the FILTERED banner;
  - the "(X only)" sheet and file suffixes;
  - rows without that money dropped.
- **Grid:** derived cells read-only; Add cost component on the Estimating right-click
  menu.
- **Export fixes:** a parent's SUM skips detail rows; sheet names cut to 31 characters.

The quantity table's new cost rows (D-95) check the first three against hand-worked
answers after every block.

## Not applicable

- **`previewAuthStorage.ts`** (ec808b1a): Lovable preview plumbing.
- **`roadmap.md`:** only records cost-component progress.
- **`quantityPending.test.ts`** and the other `src/test/*.test.ts` files: legacy's tests,
  read for behaviour only (hard rule 8).

## Could not settle

- **Excel recalculation:** whether Excel recalculates SheetJS formulas on open (item 3). It
  decides how visible the mismatch is, not whether it exists.
- **Earthwork backfill (item 21):** whether it ran against the live database.
- **Site Feature delete:** whether its confirmation names the Strip Areas affected. The
  plan says so; no such UI was found.
- **The new app, read not run:** these findings come from reading the new app's code, not
  from running it.

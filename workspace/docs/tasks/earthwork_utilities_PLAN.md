# Bores, soil layers, utilities, structures and over-excavation: what exists, and a plan (F29)

_Written 2026-10-15 for the founder, in Block 0. **Approved 2026-10-15 (D-526), not started; nothing is built.**
Block 0.5 (four existing issues, §7) is built first, then Blocks 1 to 5 in order. Nothing in "What could be cut"
is cut without asking._

- **Spec:** [earthwork_utilities.md](earthwork_utilities.md).
- **Answers:** Q1 to Q15 as recommended, with D-526's notes (§9). The defaults are in
  [pending_umer.md](pending_umer.md) as U-UT1 to U-UT52, answered in D-526. The trench-width rule (§3.6) replaces
  U-UT26 and extends U-UT27.
- **What was read for this plan:**
  - the earthwork engine, Calculate and storage;
  - the estimating lines, out-of-date flags, classification and folders;
  - the toolbar, the drawing tools, 3D, the report, guest view and metric;
  - the nine geotech reports in `fixtures/geotech/`, read as text with every log page checked against the drawn
    log.
- **Hand-worked numbers.** Each was worked twice: by hand, and by a scratch calculator (deleted after the run).
- **External values:**
  - **The 8" SDR-35 dimensions** come from manufacturers' sheets citing ASTM D3034. The founder accepts
    manufacturers' sheets, with the source on each catalog row (D-526).
  - **The OSHA bench limits** come from the official Appendix B (29 CFR 1926 Subpart P, CFR 2023 edition, Table
    B-1 and Figure B-1). LII's text of the appendix says "maximum bench dimensions as follows:" but carries no
    figures, so the sizes were read from the printed figures (§3.8).

---

## 1. What exists today, and what each block reuses or builds

### 1.1 The facts this plan stands on

**Surfaces and the TIN** (`intelcost-app-react/src/lib/takeoff/earthwork/`)
- **What a surface is made of.** Contours, spots and the work boundary are takeoff items. Each run carries
  `shape_meta {kind, surface, elevation}` (`surfaces.ts`).
- **The triangulation.** `computeTin(points, edges, frame)` (`tin/compute.ts`) is Delaunator then Constrainautor.
  - xy are page fractions, scaled to true proportions for the triangulation only (D-272).
  - z is feet.
- **Two surfaces only.**
  - `TinSurface` is `"EG" | "FG"` (`tin/types.ts`).
  - `runTinForSurface` (`tin/index.ts`) assembles the mesh inline.
  - **There is no public "points to mesh" builder for a third kind of surface.**
- **Sampling.** `sampleZAt(mesh, x, y)` (`volume/interp.ts`) scans every triangle, so a lookup costs O(T). Two
  indexed lookups already exist: `indexMesh`/`meshLevelAt` and `indexPrisms`/`prismAt` (`scene3d.ts`).

**Calculate**
- **Pipeline.** `computeVolumes` (`volume/index.ts`):
  1. merges the EG and FG points into one difference TIN;
  2. clips each triangle to the boundary;
  3. splits it among Site Features (newest wins) and Strip Areas;
  4. shifts it by strip less subgrade depth, and splits it at Δz = 0.
- **Prisms.** They carry `egA..C`/`fgA..C` (D-422 3D-1) and are never stored.
- **Where it runs.** In a Web Worker (`features/takeoff/earthwork/model.worker.ts`, `modelWorker.ts`, D-437),
  driven from `useVolumes.tsx`.
- **Saving.** One PUT saves the result and its lines together (`earthwork/routes.py`).

**Undercut and preparation**
- **Undercut.** `computeFeatureExtras` (`siteFeatures.ts`):
  - the outline is offset by a mitre offset in real feet;
  - **volume = area × depth, a flat slab**, with no reference to the existing ground or the proposed grade;
  - D-471's overlaps are stored as `features[].taken`.
- **Stabilization tons** come from `stabilization.ts` (D-405 5).
- **Where the fields live.** Site Feature fields are `takeoff_item` columns (`undercut_*`, `prep_*`,
  `stabilizer_*`), validated by `SITE_FEATURE_FIELDS` (`takeoff/service.py`).

**Strips, balance and assumptions**
- **Strip Areas** have their own table, `earthwork_strip_area`.
- **The balance** is `soilBalance` (`balance.ts`), fed by `balanceInputOf` (`lines.ts`).
- **The assumptions** (`earthwork_assumptions`): native suitable, fill type, swell 1.25, shrink 1.00 (as printed,
  D-177) and dry weight 110 pcf.

**Lines**
- **Making them.** The app builds 24 roles (`lines.ts`). The api writes them (`earthwork/lines.py`):
  - **Codes.** `CSI_BY_ROLE` hard-codes a CSI code per role. Other systems take one fallback node, `_SCOPE`.
  - **Key.** (sheet or site, `earthwork_region_id`, `earthwork_role`), with unique partial indexes.
  - **Folder.** "Earthwork", found by its flag (`ensure_lines_folder`, D-409, D-410).
- **Each Calculate:**
  - **overwrites** the name, unit and quantity;
  - **keeps** the row's id (so its rates), layer, notes and colour;
  - **keeps the placement** (folder, class folder and classification) only once `placed_by_hand` is set.
- **Rows Calculate no longer makes are deleted, and their rates go with them** (FK cascade).
- **Hand placement has a gap.** "Move items to…" (D-337) does not set `placed_by_hand`.

**Out of date**
- **The key.** `earthworkVersionKey` (`versionKey.ts`) gives `v6:` for a sheet and `v5:` for a site.
- **The prefix.** `olderEngine` compares the prefix alone; a different prefix makes a result out of date.
- **The flag.** Lines are flagged by `mark_stale` (`takeoff_item.is_stale`).
- **Where it shows.** The flag shows in the Takeoff panel (`ItemRow.tsx`) and the Volumes panel. **It does not
  show in Estimating** (D-142 says it should).

**Classification**
- **What a "scope" is.** A "scope" is a non-root classification node (`workspace_classification`). Estimating's
  "Scope" grouping is the second level of the tree.
- **One system per project.** `project.classification_system` is locked once anything is filed (D-337). There
  are five fixed systems and no custom one.
- **Three things the brief assumes do not exist:**
  - **there is no scope → classification mapping** and no work type;
  - **there is no price library** (D-287 6 parks legacy's Library);
  - the CSI tree is legacy's own numbering (`31.04.01` style, `classification/templates/csi-default-v1.txt`), not
    MasterFormat's `31 23 16`.

**Folders**
- **One table, two trees.** `takeoff_folder` holds both, `custom` and `classification`; an item has
  `folder_id` and `class_folder_id` (D-336).
- **System folders** are found by flags (`is_earthwork_lines`), so a rename keeps them.

**3D and the report**
- **3D meshes.** They come only from Calculate's prisms (`scene3d.ts` `displayMesh`, `view3d/terrainScene.ts`).
- **Exaggeration** is the group's y scale.
- **Picking** hits the terrain only.
- **The pane** opens only with a Calculate model.
- **The report.** `report/reportDoc.ts` defines the blocks once, for the screen and the PDF. Excel is built
  separately (`reportWorkbook.ts` `reportSheets`).

**The toolbar and drawing**
- **The toolbar.** `EarthworkToolbar.tsx` (`drawTool`, `afterBoundary`, `after`); the tool state is in
  `useEarthwork.tsx` (`MECHANICS`, `HINTS`, `KIND`).
- **The page.** `pages/ProjectTakeoff.tsx` is 8,903 lines. Its sheet layers mount in the canvas render prop,
  behind a gate condition that a new layer must join.
- **Snapping.** `SheetCanvas.tsx` (3,269 lines) owns the draft, the keys and `snapNear`. **Earthwork shapes are
  not snap targets** (`measuredItems` excludes them).

**Settings, guest and realtime**
- **Settings.** `TakeoffSettingsDialog.tsx`: "Contours and spots" is project-level and saved at once through
  `earthwork_review` (D-473). Calculate's assumptions are in `CalculateDialog.tsx`.
- **Guest.** `isGuest()`; the greyed tip is `VIEW_ONLY` = "Sign up for Professional to use this."
  (`features/share/view-only.ts`, D-508). The api allows guest reads of `earthwork` routes and refuses writes
  (`share/guest_session.py`).
- **Realtime.** `earthwork.*.changed` events, mapped to query keys in `features/drawing/realtime.ts`
  `drawingKeysFor`.

**Copying, checks, migrations and units**
- **Duplicate project** copies only the tables named in `COPIED` (`project/duplicate.py`). JSON uuids are
  rewritten.
- **The quantity table.** `intelcost-infra/quantity-table.sh` runs the earthwork rows in the bench's Chromium
  (`browser/lib/earthwork-cases.mjs`). **There is no Python twin of the TIN or volume engine.**
- **Alembic head:** `c9a5e7d2f4b6`.
- **Units.** `lib/measure.ts` `TO_METRIC`, `lib/takeoff/units/registry.ts` and
  `features/takeoff/earthwork/report/units.ts`. There is no VF unit.

**Legacy.** Live legacy (`intelcost/`, `UmeralamDEV`) has no bores, soil layers, trenches or utilities. This
feature is beyond legacy, so the legacy comparison has nothing to compare, and the new screens follow this app's
own patterns.

### 1.2 Reuse and new, block by block

| Block | Reused | Built new |
|---|---|---|
| 0.5 Four existing issues (built first) | `computeFeatureExtras`, `write_lines`, `move_items`, Estimating's sidebar filters | The undercut worked against the surfaces (Q13); `earthwork_retired` with its filter and delete (Q6); the stale mark in Estimating (U-UT38); placed by hand on "Move items to…" (U-UT39) |
| 1 Bores and the layer model | `computeTin` and its preflight (point TINs); `indexMesh`/`meshLevelAt` (sampling); `polygon-clipping` and `split.ts` (exact splits); the Calculate worker; `scene3d.ts`/`terrainScene.ts` (more meshes in the same group); the Strip Area pattern (own table, undoable CRUD, realtime); Spot's placement mechanics; the report's block model; the Contours and spots settings pattern | **api:** tables `earthwork_soil_layer`, `earthwork_bore`, `earthwork_bore_layer`, `earthwork_bore_water`; columns on `earthwork_assumptions`; `earthwork/geotech_routes.py`; schemas in `earthwork/schemas.py`. **app (pure):** `lib/takeoff/earthwork/geotech/{points,fields,water,split,clamp}.ts`. **app (UI):** `features/takeoff/earthwork/geotech/{BoresButton,BoreLayer,BoresPanel,SoilLayersTab,useBores}.tsx`, `section/SectionPane.tsx`, a settings section `SlopeRuleSection.tsx` |
| 2 Utilities | Linear's drawing (mechanics `lf`); item writes (`createItem`, `applyShapes`); F7's select, vertex edit and undo; F18's link (`register.ts` `mapRuns`) for utility sheets; Block 1's fields | **api:** table `utility_run`; `takeoff_item.is_utility`, `.earthwork_variant`, `.work_scope_id`, `.work_type`, `.work_kind`; tables `workspace_work_scope`, `workspace_scope_mapping` (with the CSI defaults); `takeoff_folder.auto_key`. **app (pure):** `lib/takeoff/earthwork/utilities/{catalog,breakpoints,section,protection,trench,quantities,lines}.ts`. **app (UI):** `features/takeoff/earthwork/utilities/{UtilitiesButton,RunPanel,RunLayer,ProfilePane,UtilitySettingsSection}.tsx`; a new snap source in `SheetCanvas.tsx` |
| 3 Structures | Spot's placement; the run engine's soil, water and protection | **api:** table `utility_structure`. **app:** `utilities/structures.ts` (pits, overlap), `StructurePanel.tsx`, structures in `RunLayer.tsx` and in 3D |
| 4 Over-excavation | `computeFeatureExtras`, `offsetNormRingFt`, D-471's overlaps, `StabilizationFields.tsx`, `SiteFeatureDialog.tsx` | **api:** `takeoff_item.undercut_mode`, `.undercut_layer_id`, `.undercut_elevation_ft`, `.undercut_slope_h`, `.undercut_fill_stack`, `.prep_geosynthetics`; `project_fill_material.compaction_pct`, `.compaction_standard`. **app:** `lib/takeoff/earthwork/overex.ts` |
| 5 Balance, Estimating, report | `soilBalance`, `write_lines`, `ensure_lines_folder`, `file_under`, Settings › Classification, the report | The balance's new inputs and before/after columns; Settings › Classification › Work scopes; "Map scope…"; today's 24 roles onto work scopes (Q5); the report sections and Excel sheets |

---

## 2. Data model

All new tables carry `ModelMixin` (id, uuid, timestamps) and `workspace_id`, as every table does (house style P2).
Every new project table joins `COPIED` in `project/duplicate.py`, so Duplicate project copies it.

### 2.1 New tables

**`earthwork_soil_layer`** (project). The project's list, top to bottom.

| Column | Type | Notes |
|---|---|---|
| `project_id` | FK project, CASCADE | |
| `position` | Integer | Order, top to bottom. Unique per project. |
| `name` | String(120) | Unique per project, matched case-insensitively. |
| `soil_group` | String(24) | topsoil, pavement_base, fill_engineered, fill_non_engineered, clay, silt, sand, gravel, cemented, hard_dig, weathered_rock, bedrock |
| `uscs` | String(16), null | |
| `osha_type` | String(8) | A, B, C or rock |
| `unsuitable`, `reuse_backfill`, `reuse_structural`, `expansive` | Boolean | |
| `swell_factor`, `shrink_factor` | Numeric(8,4) | As printed (D-177). |
| `color` | String(16) | |
| `interpolate` | String(12) | `depth` or `elevation` (Q1) |

**`earthwork_bore`** (sheet). One exploration.

| Column | Type | Notes |
|---|---|---|
| `project_id`, `sheet_id` | FK, CASCADE | |
| `point` | JSONB `[x, y]` | Page fractions, as `vertices_json`. |
| `code` | String(32) | B-1, TP-3. Unique per project. |
| `kind` | String(16) | boring, test_pit, hand_auger, cpt, other |
| `explored_on` | Date, null | |
| `source_report`, `source_page`, `notes` | Text, null | |
| `ground_elev_ft` | Numeric(14,6), null | Null: the existing surface at the bore. |
| `report_ground_elev_ft` | Numeric(14,6), null | |
| `total_depth_ft` | Numeric(14,6) | Over 0. |
| `termination` | String(12) | planned or refusal |
| `refusal_reason` | String(16), null | cemented, weathered_rock, bedrock, caving, obstruction |
| `cave_in_depth_ft` | Numeric(14,6), null | |
| `caving_observed`, `perched_water` | Boolean | |
| `version` | Integer | As strips have, for the replay check (D-501). |
| `created_by_id` | FK user, null | |

**`earthwork_bore_layer`** (bore). One log row.

| Column | Type | Notes |
|---|---|---|
| `bore_id` | FK, CASCADE | |
| `position` | Integer | |
| `soil_layer_id` | FK earthwork_soil_layer, RESTRICT | A layer in use cannot be deleted. |
| `depth_top_ft`, `depth_bottom_ft` | Numeric(14,6) | Contiguous from 0; checked on write. |
| `description` | Text | As written. |
| `uscs` | String(16), null | |
| `pi` | Numeric(6,2), null | |
| `open_bottom` | Boolean | True for a rock added below a refusal. |

**`earthwork_bore_water`** (bore). One groundwater reading.

| Column | Type | Notes |
|---|---|---|
| `bore_id` | FK, CASCADE | |
| `position` | Integer | |
| `kind` | String(20) | while_drilling, at_completion, after_hours, stabilized, seasonal_high, published |
| `hours` | Numeric(8,2), null | after_hours only. |
| `depth_ft` | Numeric(14,6), null | Null means not encountered. |
| `observed_on` | Date, null | |
| `source` | Text, null | published only. |

**`utility_run`** (one-to-one with a takeoff item of type `lf`).

| Column | Type | Notes |
|---|---|---|
| `takeoff_item_id` | FK, CASCADE, unique | |
| `project_id` | FK | |
| `utility_type` | String(16) | sanitary, storm, water, fire_water, force_main, gas, electric, telecom, subdrain, other |
| `catalog_key` | String(64), null | For example `pvc_d3034_sdr35:8`. |
| `material`, `pipe_class` | String(64) | |
| `nominal_in`, `od_in`, `id_in` | Numeric(8,3) | Copied from the catalog; editable. |
| `pipes`, `pipe_gap_in` | Integer, Numeric | |
| `vertical` | String(8) | inverts, slope or cover |
| `start_invert_ft`, `end_invert_ft`, `slope_pct`, `cover_ft` | Numeric(14,6), null | |
| `start_structure_id`, `end_structure_id` | FK takeoff_item, SET NULL | |
| `start_surface` | String(10) | proposed or existing |
| `section` | JSONB, null | Overrides of Utility settings. |
| `protection` | String(10) | auto, box, sloped, benched, vertical |
| `limited_width` | Boolean | |
| `bucket_in` | Numeric(6,2), null | Null: Auto. |
| `box_ref` | String(36), null | A box in the project's list (Utility settings). |
| `box_outside_ft` | Numeric(8,3), null | A typed outside width, when no listed box is picked. |
| `spec_max_width_in` | Numeric(6,2), null | Overrides the project's value for the pipe size. |
| `restoration` | JSONB, null | `{kind, width_ft}` |
| `segments` | JSONB | `[{from_ft, to_ft, overrides}]` |

**`utility_structure`** (one-to-one with a takeoff item of type `count`, one mark).

| Column | Type |
|---|---|
| `takeoff_item_id` | FK, CASCADE, unique |
| `project_id` | FK |
| `structure_type` | String(24) |
| `utility_type` | String(16) |
| `shape` | String(8): round or rect |
| `inside_dia_in` or `inside_l_ft`, `inside_w_ft` | Numeric |
| `wall_in` | Numeric |
| `rim_ft`, `floor_ft`, `sump_ft` | Numeric, null |
| `base_slab_in`, `base_stone_in` | Numeric |
| `overdig_ft` | Numeric, default 2 |
| `protection` | String(10) |
| `start_surface` | String(10) |

**`workspace_work_scope`** (workspace). The work scopes. Not copied with a project.

| Column | Type | Notes |
|---|---|---|
| `name` | String(120) | Unique per workspace, matched case-insensitively. |
| `key` | String(64), null | The stable key of a default scope (`site_utilities.sanitary`, `earthwork.dewatering`). Found by key, so a rename is kept. Null for one the user made. |
| `position` | Integer | |

**`workspace_scope_mapping`** (workspace). One row per scope, work type, kind and system.

| Column | Type | Notes |
|---|---|---|
| `work_scope_id` | FK, CASCADE | |
| `work_type` | String(40), null | Null: any work type. |
| `work_kind` | String(40), null | A structure type, a restoration surface or a replacement material. Null: any. |
| `system` | String(16) | csi, uniformat, nrm1, nrm2, cesmm |
| `classification_id` | FK workspace_classification, CASCADE | |

The unique key is (`work_scope_id`, `work_type`, `work_kind`, `system`), with nulls coalesced. The most specific
row wins.

### 2.2 New columns on existing tables

| Table | Columns | Block |
|---|---|---|
| `earthwork_assumptions` | `water_buffer_ft` Numeric(8,3), default 1.0; `slope_rule` JSONB, null (null means federal OSHA) | 1 |
| `earthwork_assumptions` | `utility_settings` JSONB, null (null means the defaults of U-UT27 and U-UT28). It also holds the default bucket, the project's box list (id, name, inside, outside and height) and spec max widths per pipe size. | 2 |
| `takeoff_item` | `is_utility` Boolean (kept out of Estimating as `is_site_feature` is, `lib/estimate/lines.ts`); `earthwork_variant` String(96); `work_scope_id` FK, SET NULL; `work_type` String(40); `work_kind` String(40) | 2 |
| `takeoff_item` | the two earthwork line indexes rebuilt on (sheet or site, region, role, coalesce(variant, '')) | 2 |
| `takeoff_item` | `earthwork_retired` Boolean (Q6) | 0.5 |
| `takeoff_folder` | `auto_key` String(64), null, unique per project (`utilities`, `utilities.sanitary`) | 2 |
| `takeoff_item` | `undercut_mode` String(10) (fixed, layer, elevation); `undercut_layer_id` FK, SET NULL; `undercut_elevation_ft`; `undercut_slope_h`; `undercut_fill_stack` JSONB; `prep_geosynthetics` JSONB `[{kind, overlap_pct}]` | 4 |
| `project_fill_material` | `compaction_pct` Numeric(5,2), null; `compaction_standard` String(8), null (D698 or D1557) | 4 |

### 2.3 Migrations, in order

Each id is 12 lowercase hex, starting `d<NNN>` with the decision that adopts it (house convention). Each revises
the one before, from head `c9a5e7d2f4b6`.

1. **Block 0.5, `earthwork_retired`:** `takeoff_item.earthwork_retired`.
2. **Block 1, `earthwork_geotech`:**
   - the four geotech tables;
   - `earthwork_assumptions.water_buffer_ft` and `.slope_rule`.
3. **Block 2, `earthwork_utilities`:**
   - `utility_run`, with the bucket, box and spec max columns;
   - the `takeoff_item` columns and the rebuilt line indexes;
   - `takeoff_folder.auto_key`;
   - `earthwork_assumptions.utility_settings`.
4. **Block 2, `work_scopes`:**
   - `workspace_work_scope` and `workspace_scope_mapping`.
   - No seed rows: defaults are made on first use per workspace, as the CSI tree is seeded on first use (D-58).
5. **Block 3, `utility_structures`:** `utility_structure`.
6. **Block 4, `earthwork_overex`:** the undercut and geosynthetic columns, and the compaction note columns.

No migration writes to existing rows (Q5: no backfill).

**Packages:** none new. three.js, Delaunator, Constrainautor, polygon-clipping and jsPDF are already in the app.
**For Abdullah:** six migrations, no new package, no new environment value.

### 2.4 What the stored result gains (`earthwork_result.result`, JSONB)

- **`materials`.** Cut by layer, per region:
  `[{regionId, layers: [{layerId, bankCY}], rockCY, unsuitableCY}]`.
- **`geotech`:**
  - each bore's design water and how it was worked;
  - clamps, as `[{layer, areaSF, maxFt, nearBore}]`;
  - notes;
  - the slope rule used.
- **`utilities`.** Per run: length, LF by range, excavation by layer, zones, protection LF, dewatering LF, rock,
  restoration, flags.
- **`structures`.** Per structure: pit by layer, stone, backfill, VF, range, flags.
- **`overex`.** Per feature: mode, by layer, stack.
- **`balance2`.** Before and after.

Station tables are not stored; the profile rebuilds them from the inputs, as 3D rebuilds prisms (D-422 Q1).

### 2.5 How it is versioned with the out-of-date keys

- **The key.** `earthworkVersionKey` gains one more part, **`geo:`**, the hash of:
  - the layer list;
  - every bore with its rows and readings;
  - `water_buffer_ft` and `slope_rule`;
  - `utility_settings`;
  - every run and structure with its fields and shape;
  - for Block 4, the new undercut fields of each feature.
- **Only when there is data.** The part is added **only when at least one of those exists**. The prefix stays
  `v6:` / `v5:`. So:
  - a project with none of this keeps exactly today's key;
  - its result stays current;
  - the 3D test copy's md5 does not move (U-UT40).
- **Edits mark lines stale.** An edit to a bore, a layer, a reading, a run, a structure or a setting moves the
  live key. The existing effect then marks the sheet's lines stale, as an edited contour does (D-142 Q10).
- **Q13 (yes; built first, Block 0.5)** adds a feature-key part only to features with an undercut, so only
  results with an undercut read out of date once. This is D-470's mechanism, worked out on read: nothing is
  written, so a stored result and its md5 do not change.

### 2.6 Sites, links, copies, realtime and guests

- **Sites (F19).** Bores, runs and structures on a member sheet map into the site frame through the join, as
  contours do. The site's Calculate reads them all.
- **Linked sheets (F18).**
  - A survey sheet's bores map through its link.
  - A utility sheet with no surfaces is linked to the grading sheet the same way, and its runs and structures map
    through that link (Q8).
- **Duplicate project.** The six project tables join `COPIED`. The work scope tables are workspace data, kept as
  they are.
- **Into another workspace** (D-384). `work_scope_id` is matched by key, then by name, to the viewer's work
  scopes; no match leaves none, as classification references are matched.
- **Realtime.**
  - A new `earthwork.geotech.changed` event covers bores, readings, layers, the slope rule and settings.
  - Runs and structures are items, so the existing item events carry them.
  - Each new event gets a case in `drawingKeysFor`.
- **Guests.** The new routes sit under `/project/{p}/earthwork/...`, which guests may read (`_NO_MONEY`). Every
  write is refused with 403 by the guard.

---

## 3. Formulas, each with a worked example

Conventions:
- **Coordinates** are true feet in the sheet's frame, as the TIN scales them (D-272).
- **Depths** are feet below the existing ground (EG) and **elevations** are feet.
- **Volumes:** CF ÷ 27 = CY, shown to 0.01. The engine keeps full precision.
- **Fixture placement.** Every fixture from a report uses that report's depths and readings. Because none of the
  nine reports gives coordinates or ground elevations on its logs, positions and ground are assumed and stated.

### 3.1 What each bore gives each layer (Q2)

For a bore b with total depth T, and the layers L1 … Ln of the project list, top to bottom:

| Case at bore b | Point for layer L's bottom |
|---|---|
| L logged, from t to d, and the bore continues below d | depth d |
| L not logged, but the bore logs a layer below L in the list | the bottom of the nearest logged layer above L (zero thickness). If there is none, 0. |
| The bore ends inside L at planned depth (d = T) | A point at T **only if** the surface built from the other bores is shallower than T there. Otherwise no point. |
| The bore ends above L (L not reached) | No point. |
| Refusal on weathered rock or bedrock at T | That rock's top is T, which is the bottom of the layer above it. |
| Refusal for caving or an obstruction | Treated as planned depth. No rock. |

The last layer in the list has no bottom surface.

**Worked example (Midway, test pits TP-1 to TP-3; pp.23–25).**
- **The logs:**
  - topsoil 0–0.5 ft in each pit (p.2: roots "(topsoil) to 6"" inside the fill);
  - silty clay fill below it, to 1.0, 1.5 and 1.0 ft;
  - natural granular soil below that (GM, GP/GM and GP, SM).
- **The list:** Topsoil, Fill (non-engineered), Natural granular (the last; no bottom).
- **The points:**
  - Topsoil bottom: 0.5, 0.5 and 0.5 ft.
  - Fill bottom: 1.0, 1.5 and 1.0 ft.
  - Each pit continues below its fill, so every point counts.

### 3.2 Each layer's surface: TIN, few points, outside the hull (Q1)

- **Values.** A layer that follows the ground is interpolated as a depth, D(x, y); its bottom elevation is
  EG(x, y) − D(x, y). A layer interpolated by elevation is interpolated as B(x, y) directly.
- **Three or more points** (not collinear): a TIN from `computeTin` (no constraint edges, the same scaling). The
  value is linear on each triangle.
- **One point:** constant everywhere.
- **Two points:** linear along the segment between them and constant across it; beyond the ends, the end value.
- **Outside the hull of the points:** the value at the nearest point of the hull's boundary.
  - Beyond an edge, that is linear along the edge and constant across it.
  - Beyond a vertex, it is the vertex's value.
  - The plane is therefore split into convex pieces, each carrying a linear function. This is what makes every
    split below exact.

**Worked example, three points.** TP-1 at (0, 0) with D = 6.0, TP-2 at (100, 0) with D = 8.0, TP-3 at (0, 100)
with D = 4.0. Inside the triangle, D = 6 + 0.02x − 0.02y.

| Point | Nearest hull feature | D |
|---|---|---|
| (50, −30) | Edge TP-1–TP-2, at (50, 0) | 6 + 0.02 × 50 = **7.00** |
| (−20, 50) | Edge TP-3–TP-1, at (0, 50) | 6 − 0.02 × 50 = **5.00** |
| (150, −50) | Vertex TP-2 | **8.00** |

**Soil-group defaults** (U-UT21; typical values for approval, which the geotech's or estimator's numbers replace):

| Group | OSHA | Unsuitable | Backfill | Structural | Swell (L/B) | Shrink (fill × cut) | Interpolate |
|---|---|---|---|---|---|---|---|
| Topsoil | C | yes (for fill) | no | no | 1.25 | 1.10 | depth |
| Pavement / base | C | yes | no | no | 1.30 | 1.00 | depth |
| Fill, engineered | C | no | yes | yes | 1.20 | 1.05 | depth |
| Fill, non-engineered | C | yes | no | no | 1.25 | 1.10 | depth |
| Clay | B | no | yes | no | 1.30 | 1.10 | depth |
| Silt | B | no | yes | no | 1.25 | 1.10 | depth |
| Sand | C | no | yes | yes | 1.15 | 1.05 | depth |
| Gravel | C | no | yes | yes | 1.12 | 1.05 | depth |
| Cemented / caliche | A | no | yes | no | 1.40 | 1.00 | depth |
| Hard dig | C | always exported | no | no | 1.35 | 1.00 | depth |
| Weathered rock | C | always exported | no | no | 1.50 | 0.90 | elevation |
| Bedrock | rock | always exported | no | no | 1.65 | 0.80 | elevation |

Hard dig, weathered rock and bedrock are always exported and never used as fill (the brief).

### 3.3 Layers never cross: clamping

**The rule.** From the top down:
- D′1 = max(D1, 0), so the first bottom is never above the ground;
- D′L = max(DL, D′L−1).

An elevation layer is clamped through D = EG − B. Where a clamp changes a value, the line D_L = D′_{L−1} splits
the piece, so the clamped surface stays piecewise linear.

**The report.** Each clamped layer gets the area where D′ > D, the largest D′ − D, and the nearest bore to that
largest point. Under 0.01 ft or 1 SF it is not listed.

**Worked example (synthetic, built on Midway's kind of pit).** Clay's bottom is known only at three bores, all at
5.0 ft, so it is constant at 5.0. Fill's bottom is 1.0 ft at the same three, B-1 (−20, −20), B-2 (100, 0) and B-3
(0, 100). A fourth pit, TP-4 at (100, 100), stopped at 7.0 ft still in fill. The other bores' fill surface gives
1.0 there, which is shallower than 7.0, so TP-4 adds a point at 7.0 (§3.1).
- **The triangle.** The triangulation contains B-2, TP-4, B-3. B-1 lies outside that triangle's circumcircle
  (centre (50, 50), radius 70.71; B-1 is 98.99 away).
- **Fill on that triangle:** 1 + 6λ, where λ is TP-4's barycentric share.
- **Where fill passes 5.0:** λ > ⅔, a triangle similar to the whole at ⅓ scale. Its area is (⅓)² × 5,000 =
  **555.56 SF**.
- **Deepest clamp:** 7.0 − 5.0 = **2.00 ft**, at TP-4.
- **The note:** "Clay kept under Fill over 555.56 SF, up to 2.00 ft, near TP-4."

### 3.4 The cut split by layer, exactly (Calculate)

**The bands.** Within a cut prism (Δz < 0 after the shift), at a point:
- the cut band is from depth d1 = strip to depth d2 = strip − Δz, in depths below EG;
- layer L occupies from D′L−1 to D′L (D′0 = 0, and the last layer runs to ∞).

**The part of L in the cut:**

  t_L = max(0, min(d2, D′L) − max(d1, D′L−1))

**Making it exact.**
1. Each prism triangle is intersected with every layer's convex pieces (polygon clipping, with a grid index over
   the pieces).
2. On each piece every value is linear, so t_L is piecewise linear, with kinks only on the lines d2 = D′L,
   d2 = D′L−1, d1 = D′L and d1 = D′L−1.
3. The piece is cut on those lines.
4. Each part is triangulated, and each triangle's volume is its area × the mean of its corner values.

The t_L add up to d2 − d1 everywhere, so **the layers add up to the total cut exactly**, whatever their shapes.

**Worked example (Midway pits, flat site).**
- **Setup:** EG level at 100.00, the proposed grade level at 98.80 (a 1.20 ft cut), no strip. The work boundary
  is the pits' triangle, 5,000 SF.
- **The fill bottom:** D = 1.0 + 0.005x.
- **Total:** 5,000 × 1.20 = 6,000 CF = **222.22 CY**.
- **Topsoil:** 5,000 × 0.50 = 2,500 CF = **92.59 CY**.
- **Granular** (below the fill bottom, inside the cut), where 1.2 > D, that is x < 40:
  ∫₀⁴⁰ (0.2 − 0.005x)(100 − x) dx = 800 − 560 + 106.67 = 346.67 CF = **12.84 CY**.
- **Fill:** 222.22 − 92.59 − 12.84 = **116.79 CY**. The direct sum, 0.7 × 5,000 − 346.67 = 3,153.33 CF, agrees.

**Variant with a 0.50 ft Strip Area** (stripping wins):
- strip line 92.59 CY;
- cut below the strip 129.63 CY = fill 116.79 + granular 12.84;
- no topsoil counted twice.

**Variant with the boundary as the square 0–100 × 0–100.** The triangle beyond the hypotenuse takes values from
the hypotenuse: D = 1.25 + 0.0025(x − y).
- total **444.44 CY**;
- topsoil **185.19 CY**;
- granular (346.67 + 106.67) CF = **16.79 CY**;
- fill **242.47 CY**.

A 2,000 × 2,000 grid integration gives the same to 0.01 CY.

### 3.5 Design water level (per bore) and the water surface

**The level** = the first of these that applies:
- **seasonal high:** min(seasonal high estimates);
- **measured:** max(0, min(measured readings) − buffer);
- **published:** the published value, labelled, and never shallower than the bore's own "not encountered"
  depth.

A bore with none of these, whose readings are all "not encountered", gives a **lower bound** at T, not a point.
The water surface is by elevation, W_b = G_b − level. Where the surface from the other bores would be above
G_b − T at such a bore, that bore adds the point G_b − T.

**Worked examples:**

| Case | Readings | Design level |
|---|---|---|
| Synthetic W-1 (checks rule order) | while drilling 7.50; at completion 6.00; after 24 h 5.20; seasonal high 4.00 | **4.00 ft** (seasonal high). Without it: 5.20 − 1.00 = **4.20 ft**. |
| Deland B-1 (p.21; p.8) | 6.0 ft, read 24 h or more after drilling; NRCS published seasonal high 18 to 24 in (p.4) | **5.00 ft** (6.00 − 1.00). The report's own rule, "approximately one foot above the measured level" (p.8), gives the same. The published figure is not used, because a measured reading exists, and the panel says so. |
| Maricopa (p.8) | All logs: no groundwater, the deepest to 31.5 ft; ADWR published 81.80 ft | No measured reading, so the published value applies, labelled. It is deeper than every not-encountered depth, so the bounds agree. **81.80 ft** |
| Manila Creek B-1 (p.24) | Not encountered to 41.5 ft; no other source | **No point.** Water lies below 41.5 ft there. With no water at any bore: "No groundwater in any bore". |
| Plain City B-13 / B-12 (p.36; p.35, p.12) | B-13: 5.0 at drilling. B-12: 7.0 in PVC after 12 days | **4.00 ft** and **6.00 ft**. Each bore's shallowest measured reading less the buffer. |
| Midway TP-3 (p.25, p.12) | Not encountered on 10/2; 4.0 ft on 10/11 (216 h) | **3.00 ft**. The later reading is measured; "not encountered" at excavation does not cancel it. |

### 3.6 The trench section at a station

At station s:
- **Start surface G:** where a proposed surface covers the station, the proposed subgrade (FG less the Site
  Feature's depth). Otherwise the existing grade, stated on the run. Otherwise the ground from rims or typed grades
  (Q7, D-526).
- **Bottom width W: the largest of these three** (the trench-width rule, D-526):
  - **the pipe width** P = n·OD + (n − 1)·g + 2c, at least W_min (one pipe gives OD + 2c);
  - **the bucket** B: the run's, or Auto, the smallest of 12, 18, 24, 30, 36, 42, 48 and 60 in that is at least
    P;
  - **the box's outside width** X, wherever a box or shoring is used. The box is the run's, or the smallest
    listed box whose inside width is at least P. With no list and no typed width the run is flagged.

  The run panel names the one that set W ("Width 36 in — bucket").
- **Spec max width S** (optional):
  - if W > S, the run is flagged "Wider than spec max — pay width may be limited";
  - every quantity is worked again with S in place of W, and shown beside the actual one;
  - W itself is never reduced.
- **Trench bottom:** TB = I − (OD − ID)/2 − t_b, where I is the invert and t_b the bedding.
- **Depths:**
  - trench depth h = G − TB, where G is the start surface;
  - invert depth = G − I.

**Section area by protection:**

| Protection | Area A(h) |
|---|---|
| Vertical, box | W·h |
| Sloped at k (H:V) | W·h + k·h² (each wall k·h²/2) |
| Benched (§3.8) | W·h + k·(h − v)(h + v − r), for equal benches r over a bottom vertical side v |
| Stable rock under soil (Q11): rock from TB up to RT, soil from RT to G, h_s = G − RT | W·h + k·h_s² (rock vertical, the soil sloped from the top of the rock) |

**Zones** (sloped case; width at height z above TB is W + 2kz):
- bedding, from 0 to t_b: area W·t_b + k·t_b²;
- pipe zone, from t_b to t_b + OD + t_z: W·Δz + k·(z2² − z1²) − n·π·OD²/4;
- backfill, from there to h.

The parts add up to A(h).

**Worked examples (reworked for the trench-width rule, D-526).**
- **The pipe:** 100 LF of 8" PVC SDR-35: OD 8.400 in, wall 0.240 in, ID 7.920 in, from manufacturers' sheets citing
  ASTM D3034.
- **The width:** the pipe width is 0.700 + 2 × 1.000 = 2.700 ft (32.4 in), so Auto picks the **36 in bucket**: W =
  **3.00 ft** ("Width 36 in — bucket").
- **The depth:** bedding 6 in; the zone runs to 12 in above the crown; the trench depth is **8.00 ft**, so the
  invert depth is 7.48 ft and the invert is 92.52 on flat ground at 100.00.

| Case | Soil, rule and width | A (SF) | Excavation | Bedding | Pipe zone (pipe deducted) | Backfill | Top width |
|---|---|---|---|---|---|---|---|
| (a) | Clay, Type B, OSHA sloped 1:1; 36 in bucket | 88.00 | **325.93 CY** | 6.48 | 34.46 | 283.56 | 19.00 ft |
| (a′) | Same, bucket typed 24 in, so the pipe width governs (32.4 in) | 85.60 | **317.04 CY** | 5.93 | 32.57 | 277.11 | 18.70 ft |
| (b) | Same in a box from the list, 6.00 ft outside (5.00 ft inside, 8 ft high): "Width 6.00 ft — box" | 48.00 | **177.78 CY** | 11.11 | 36.35 | 128.89 | 6.00 ft |
| (c) | Same, benched (§3.8): one 4 ft bench over a 4 ft vertical side | 56.00 | **207.41 CY** | 5.56 | 17.46 | 182.96 | 11.00 ft |
| (d) | Sand, Type C: benching refused; sloped 1½:1 | 120.00 | **444.44 CY** | 6.94 | 42.96 | 393.11 | 27.00 ft |
| (f) | 3 ft of clay (B) over sand (C): the flatter governs, 1½:1 | 120.00 | **444.44 CY** | 6.94 | 42.96 | 393.11 | 27.00 ft |
| (g) | Clay, the Utah template: cohesive up to 8 ft, 0.5:1 | 56.00 | **207.41 CY** | 6.02 | 25.96 | 174.00 | 11.00 ft |

- **Pipe area:** π × 0.7² ÷ 4 = 0.3848 SF/LF.
- **The box case.** In (b) the zones fill the trench's full 6.00 ft width.
- **A coincidence.** (c) and (g) give the same area: 24.0 + 32.0.
- **The OSHA note.** (g) also shows "Steeper than federal OSHA…", because 0.5 is under 1.0 for Type B.
- **Spec max 30 in on (a):**
  - the run shows "Wider than spec max — pay width may be limited";
  - at the spec width, A = 2.5 × 8 + 64 = 84.00 SF, so **311.11 CY**, shown beside the actual 325.93 CY.
- **If "8 ft" meant the invert depth in (a):** h = 8.52 and A = 3.0 × 8.52 + 8.52² = 98.15 SF, so **363.52 CY**.

### 3.7 Choosing the slope at a station

1. **Which layers.** The layers the trench passes through at s are those between G and TB, from the layer model.
   - In a fill area, the placed fill between EG and the proposed subgrade counts as a layer "Placed fill", Type C
     (U-UT22).
   - With no bores, one assumed layer of Type C applies.
2. **Water and caving.** A layer whose part in the trench is at or below the design water counts as C. So does
   every layer where the governing bore (the nearest one) logs caving.
3. **Federal OSHA.** k = the largest of A 0.75, B 1.0, C 1.5 among those layers. Stable rock counts 0, and is cut
   vertical under soil (Q11).
4. **Geotech table.** For each layer, find the row that matches its soil group and condition:
   - **Soil group:** "cohesive" means clay, silt, or USCS C… or M…; "granular" means sand, gravel, or USCS S…
     or G… (U-UT24).
   - **Depth:** the row with the smallest depth limit at or above h.
   - **Water:** the layer's water condition.
   - **The slope:** k is the largest slope among the matched rows.
   - **Shoring required:** a row that says so forces a box.
   - **No match:** a layer with no matching row uses federal OSHA, with the "No geotech rule…" note.
   - **Steeper than OSHA:** a row steeper than OSHA for the layer's type gives the "Steeper…" note.
5. **Forced box or shoring,** for depths of 5 to 20 ft, in any of these cases:
   - the trench bottom is below the design water in a granular layer;
   - caving governs: caving observed, or the trench bottom is below the cave-in depth;
   - a "shoring required" row matched.

**Worked examples (the Utah template, Midway TP-1, p.23 and p.12).**
- **The site.** GM gravel lies from 1.0 ft. The design water there is 5.20 − 1.00 = 4.20 ft. The bottom width is
  3.0 ft (a 36 in bucket).
- **4.00 ft trench:** granular, above water, up to 4 ft, so 0.5:1. A = 3 × 4 + 0.5 × 16 = **20.00 SF/LF**.
- **5.00 ft trench:** the bottom is 0.80 ft below the design water in granular soil, so a box is forced (the
  template's "saturated granular, shoring"). With a box 3.0 ft outside, A = 3 × 5 = **15.00 SF/LF**, flagged.

**Worked example (Bidwell B-1, cave-in at 7.0 ft after tools removed, p.45).** The soil is CH, which the report
classes as OSHA "Class B" (p.17).
- **6.0 ft trench:** sloped 1:1 is allowed.
- **8.0 ft trench:** the bottom is below the cave-in depth, so a box is forced and flagged.

### 3.8 Benching

Allowed only where every layer passed is A, or B and cohesive.

**Source (U-UT25).** The sizes and the geometry come from the official figures: 29 CFR 1926 Subpart P,
Appendix B, Figure B-1, as printed in the CFR (2023 edition). LII's text of the appendix says "maximum bench
dimensions as follows:" and carries no figures, so the sizes were read from the printed figures.

| Type | Figures | Bottom vertical side | Each further bench | Slope |
|---|---|---|---|---|
| A | Simple Bench, Multiple Bench | at most 4 ft | at most 5 ft | ¾:1 |
| B | Single Bench, Multiple Bench: "This bench allowed in cohesive soil only." | at most 4 ft | at most 4 ft | 1:1 |
| C | none | | | 1½:1, sloped only |

**The geometry.**
- **Where the benches sit.** The figures draw the maximum slope as a line from the toe of the trench, and put the
  back corner of every bench on that line. The steps stay inside the line, so a benched wall digs less than the
  simple slope:
  - the bottom vertical side leaves a wedge of k·v²/2 per wall;
  - each bench of height r leaves another k·r²/2.
- **What "Benched" means.** The multiple bench with the fewest benches the limits allow: v = min(4 ft, h), then
  n = ⌈(h − v)/r_max⌉ equal benches of height r = (h − v)/n. r_max is 5 ft in A and 4 ft in B.
- **The area.**
  - The bench levels are z1 = v, z2 = v + r, …, zn, and the ground is at h (zn+1 = h).
  - One wall digs k·Σ zj·(zj+1 − zj) beyond the bottom width.
  - For equal benches, both walls together give k·(h − v)(h + v − r).
  - The top width is W + 2k·zn.

**Worked examples.**
- **Case (c),** Type B: h = 8, v = 4, one bench of r = 4, k = 1, W = 3.0 (36 in bucket).
  - A = 3.0 × 8 + 1 × 4 × 8 = **56.00 SF/LF**, so **207.41 CY** per 100 LF.
  - The top width is 3.0 + 8 = 11.00 ft.
  - Because v = r here, Block 0's drawing (with the benches outside the line) gave the same area.
- **Type A, 14 ft deep:** v = 4, two benches of 5 ft, k = ¾, W = 3.0, so the levels are 4 and 9.
  - Both walls dig 2 × 0.75 × (4 × 5 + 9 × 5) = 97.50 SF, so A = 42.00 + 97.50 = **139.50 SF/LF**.
  - The top width is 3.0 + 2 × 0.75 × 9 = 16.50 ft.
  - The simple slope would be 189.00 SF/LF. Block 0's drawing gave 154.50 SF/LF; it is withdrawn.

**Changes in n.** n changes where h crosses v + j·r_max. Those depths are breakpoints (§3.10).

### 3.9 Pipe displacement and native or imported backfill

- **The pipe** deducts n·π·OD²/4 per LF from the pipe zone, the zone it sits in. No pipe sits in the bedding, and
  none in the backfill unless the zone is thinner than OD.
- **Native zones.** A zone set to native is filled from layers marked "reusable as backfill". That needs
  bank = compacted × shrink (by layer, U-UT21). Unsuitable, hard dig and rock layers never supply it.
- **Spoils** = excavation − native reused (bank). The suitable part goes to the balance (§3.14); unsuitable, hard
  dig and rock are always exported.

**Example (case a, 36 in bucket).**
- Native backfill 283.56 CCY needs 283.56 × 1.10 = 311.91 BCY of the clay.
- Spoils = 325.93 − 311.91 = **14.01 BCY**, suitable.
- Bedding 6.48 CCY and pipe zone 34.46 CCY are imported materials: listed apart, not soil import.

### 3.10 Along a run, exactly: breakpoints and the prismoidal rule (Q3)

**1. Breakpoints.** The run's length is cut at:
- every vertex and segment end;
- each structure's pit outline;
- each crossing with an edge of the EG and FG TINs, a layer's or the water's pieces, a Site Feature's outline
  (subgrade depth) and the work boundary;
- each crossing with a boundary between two bores' nearest-areas (the caving rule);
- inside each interval, the points where these linear functions meet:
  - the trench bottom with a layer bottom or the water;
  - h with 5 ft, 20 ft, a depth-range limit, or v + j·r;
  - the invert depth with a range limit.

**2. Between two breakpoints** every input is linear in s, and the protection, slope and layers passed are
constant.

**3. Per interval.** A(s) is a quadratic in s, and so is the area of each layer band and each zone. So:

  V = Δs/6 · (A(s0) + 4·A(s½) + A(s1))

This is exact for a quadratic. Lengths (LF in a range, dewatering, rock) are exact sums of intervals.

**Why not stations every 5 ft.** The average end area overstates by k·L·(h1 − h2)²/6 on a stretch whose depth
changes from h1 to h2.
- On a 100 ft sloped run (k = 1) whose depth goes from 6 to 10 ft, one interval overstates by 266.67 CF
  (9.88 CY).
- At 5 ft stations it overstates by 0.67 CF.

Close, but not exact, and the exact rule costs nothing more. Hard rule 3 says quantities are analytic. The profile
still shows a 5 ft station table for reading.

**Worked examples:**
- **LF by invert depth.** 200 ft of pipe on flat ground, the invert depth going from 6.0 to 10.0 ft:
  **100.00 LF in 6–8** and **100.00 LF in 8–10**.
- **Dewatering LF.** 100 ft with the trench bottom at 92.00 and the design water rising from 91.00 to 93.00
  along it. The bottom is below the water from s = 50, so **50.00 LF**, drawn blue for the second half.
- **Maricopa B-1** (CL to 10 ft, p.43; the report's "Type C", 1½(h):1(v), p.20). 2.0 ft bottom width (a 24 in bucket),
  6.0 ft deep: A = 2 × 6 + 1.5 × 36 = **66.00 SF/LF**, so 100 LF is **244.44 CY**. The published water is at
  81.80 ft, so dewatering is **0 LF**. The user sets the layer to C, overriding the B suggested for clay, as the
  report says.
- **Miami B-2** (fill 0.5–4.0, limestone from 4.0 ft, p.30). A trench in a box 3.0 ft outside, 8.0 ft deep, 100 LF:
  - total **88.89 CY**;
  - common, 0–4 ft: **44.44 CY**;
  - limestone, from the weathered rock layer (always exported): **44.44 CY**, with **100 LF** of trench in rock;
  - dewatering **100 LF**.

  The design water by our rule is 6.0 − 1.0 = 5.00 ft. The report's own analysis uses 6 ft (p.15); to follow it,
  the estimator types a seasonal high of 6.0.

### 3.11 Structure pits, and where a trench meets one

**The pit.**
- **Bottom:** E_b = floor − base slab − base stone.
- **Depth:** h = G − E_b.
- **Round:** R0 = OD/2 + o, and V = π·(R0²·h + R0·k·h² + k²·h³/3).
- **Rectangular,** with a bottom of L × W, outside dimensions plus 2o: V = L·W·h + k·h²·(L + W) + (4/3)·k²·h³.
- **With a box:** V = bottom area × h.
- **Layers** are taken level across the pit at their depths at its centre (U-UT30); each band is the same
  integral between its levels.
- **Base stone** = bottom area × stone depth.
- **Structure volume** (below the start surface) = outside footprint × (G − (E_b + stone)).
- **Backfill** = V − stone − structure.
- **Vertical feet** = rim − the lowest invert.

**Worked examples.**
- **48" sanitary manhole, Type B, sloped 1:1.**
  - **Inputs:** inside 4.00 ft; wall 5 in, so OD 4.833 ft; over-dig 2 ft, so R0 = 4.417 ft. Rim 100.00, lowest
    invert 90.00, floor 90.00, slab 0.50, stone 0.50.
  - **Pit:** E_b = 89.00, h = 11.00. V = π·(19.507·11 + 4.417·121 + 1331/3) = 3,746.85 CF = **138.77 CY**.
  - **Stone** **1.14 CY**; **structure** 192.65 CF; **backfill** **130.50 CY**.
  - **10.00 VF**, in the 10–12 range.
- **Rectangular lift station.**
  - **Inputs:** outside 10 × 12 ft; over-dig 2 ft, so the bottom is 14 × 16 ft; h = 16.00 (floor 86, slab 1.0,
    stone 1.0); clay.
  - **Water.** The design water is at 92.00. The floor is 6.0 ft under it, so the clay below the water counts as
    C (1½:1), and the pit carries a **dewatering flag**.
  - **Sloped:** V = 3,584 + 11,520 + 12,288 = 27,392 CF = **1,014.52 CY**; stone 8.30 CY; backfill **939.56 CY**.
  - **If the soil were sand,** shoring is forced: **132.74 CY**, backfill 57.78 CY.

**Where a trench meets a pit (no double counting, U-UT31).**
- **The cut-off.** The trench stops at the pit's bottom outline: R0 from a round pit's centre, or the face of a
  rectangular one.
- **The overlap.** Beyond that line, the part of the trench inside the pit's sloped sides is deducted. For each
  height z, the slice of trench inside the pit has a closed-form area:
  - for a disc of radius R(z) = R0 + k_p·(z − E_b) cut by the trench's strip, the area beyond R0 is
    b·√(R² − b²) + R²·asin(b/R) − 2·b·R0, with b = min(half the trench width, √(R² − R0²));
  - for a rectangular pit, the area is a polynomial.
- **Integrating the slices.** Up the height, the slices are integrated by a Gauss rule between the heights where
  the shapes change. That is exact for the polynomial pieces, and within 1e−6 CF for the round ones.

**Worked example.** The 48" manhole above, with the trench of case (a) leaving it: invert 90.00, so the trench
bottom is 89.48 and h = 10.52; 1:1, W = 3.0 (36 in bucket).
- **Overlap:** **859.20 CF = 31.82 CY**. Treating the pit wall as flat where the trench enters gives 37.42 CY,
  which would overstate the deduction.
- **The trench's own length** beyond the outline: 100 − 4.417 = 95.58 ft. 95.58 × 142.23 SF = 503.51 CY, less
  31.82 = **471.69 CY**.
- **Pit and trench:** **610.46 CY**.

### 3.12 Over-excavation (Block 4)

**The footprint.** F = the outline, less its holes, offset by e + s·d_max, with today's mitre offset in real feet
(`offsetNormRingFt`). It is clipped to the boundary, less what newer features take (D-471).
- e is the extension and s the outward slope (H:V).
- d_max is the deepest undercut below subgrade along the outline.
- So the excavation is the vertical-walled box at the full extent reached at the bottom (Q12).

**Bottom, top and volume.**
- **Bottom U**, by mode:
  - **fixed:** S − d, where S is the subgrade (FG − the feature's depth);
  - **layer:** the bottom of layer X (§3.2);
  - **elevation:** E.
- **Top** = min(EG, S): existing ground only (the new modes, and the fixed mode if Q13 is yes).
- **Volume** = ∫∫_F (top − U)⁺ dA, exact on the pieces where EG, FG, the layers and U are all linear. It is split
  by layer as in §3.4.
- **Replacement.** Filled from the bottom by the stack: each row's thickness counts up from U, and the last row
  takes the rest. Its volume equals the removed volume, in compacted CY.

**Worked examples:**
- **Heinsohn pad** (Table 3.1, pp.17–18).
  - **The pad:** the slab 90 × 60 ft (5,400 SF, the store's area, p.8), 5 ft beyond, so a 100 × 70 ft
    footprint. Over-excavation 6.5 ft below the slab (1" PVM). The slab bottom is put at existing grade, because
    the report gives no datum.
  - **Removal:** 7,000 × 6.5 = 45,500 CF = **1,685.19 CY** (CH, one layer).
  - **The stack:**
    - reconditioned native, 3.5 ft: **907.41 CY**;
    - select fill, the rest (3.0 ft): **777.78 CY**.
  - **Scarify 9 in at the base:** **777.78 SY**.
  - **The ½" PVM variant,** 8.5 ft: **2,203.70 CY**.
- **Bidwell Option B** (p.22). Remove 24 in under pavement and replace it with a moderately plastic cap, on an
  assumed 150 × 200 ft pavement: **2,222.22 CY** removed and **2,222.22 CCY** of cap.
- **Midway: remove all fill down to natural soil** (p.8, "remove fill"). Mode layer, X = Fill, over the pits'
  triangle, no grading, no extension:
  - volume = 5,000 × mean(1.0, 1.5, 1.0) = 5,833.33 CF = **216.05 CY**;
  - by layer: topsoil **92.59** and fill **123.46**, both unsuitable, so exported.
- **Bidwell footing undercut** (p.25; Figure 4, p.42). The footing is b = 1.5 ft wide; the undercut is d = 5.0 ft
  deep at ½H:1V outward, so the bottom is b + d = 6.5 ft wide.
  - The box (Q12, recommended): 6.5 × 5 = **32.50 SF/LF**, or **120.37 CY** per 100 LF.
  - The sloped zone only: (1.5 + 6.5)/2 × 5 = **20.00 SF/LF**, or **74.07 CY**.
- **Q13 in a fill area.** A 7,000 SF pad whose subgrade is 2.0 ft above existing ground, with a 6.5 ft undercut:
  - today: 7,000 × 6.5 = **1,685.19 CY**;
  - existing ground only: 7,000 × 4.5 = **1,166.67 CY**.

### 3.13 Subgrade treatment

- **Agent tons** (D-405 5): area SF × depth ft × dry pcf × % ÷ 100 ÷ 2000. Or lb/SY × SY ÷ 2000.
- **Geosynthetics** in SY: area ÷ 9 × (1 + overlap %).

**Worked examples.**
- **Bidwell lime,** 8 % at 16 in (p.21). The report gives **no dry unit weight**, so the project's 110 pcf
  (D-405 4) is used, and the line says so. 10,000 SF gives **1,111.11 SY** and **58.67 TON**.
- **Gallia's options** (p.11), at the same 16 in and 110 pcf: 5 % quicklime **36.67 TON**; 7 % lime kiln dust
  **51.33 TON**.
- **Geotextile** under 10,000 SF with a 10 % overlap: 1,111.11 × 1.10 = **1,222.22 SY**.

### 3.14 Spoils and the site balance

**With no bores** the balance is exactly today's (`soilBalance`).

**With layers:**
- **Yield.** Every suitable bank volume adds its compacted yield, bank_L ÷ shrink_L. That includes the site cut
  by layer and the suitable trench, structure and over-excavation spoils.
- **Demand.** The demand is the site fill, plus native backfill, plus today's native-undercut shortfall, all in
  compacted CY.
- **Surplus** = yield − demand.
  - **Over 0:** export bank = surplus × k̄, with k̄ = Σbank ÷ yield. Loose = bank × s̄, the bank-weighted swell.
  - **Under 0:** import, at the project's fill shrink and swell.

  With every layer at the project's factors this reduces to today's formula.
- **Always exported:** unsuitable, hard dig and rock, each at its own swell, on its own line.
- **Imported materials** (bedding, pipe zone, imported backfill, replacement fill) are listed apart, never as
  soil import.

**Worked example.** The project's factors are swell 1.25 and shrink 1.10.

| | Before | With trench (a) and Midway's fill removal |
|---|---|---|
| Site cut, suitable | 1,000.00 BCY | 1,000.00 BCY |
| Trench excavation, clay, suitable | none | 325.93 BCY |
| Site fill | 900.00 CCY | 900.00 CCY |
| Native trench backfill | none | 283.56 CCY |
| Surplus (bank) | 1,000 − 900 × 1.10 = **10.00 BCY** | (1,325.93 ÷ 1.10 − 1,183.56) × 1.10 = **24.01 BCY** |
| Soil export | **12.50 LCY** | **30.02 LCY** |
| Always exported | none | Undocumented fill 123.46 BCY → **154.32 LCY** |
| Imported materials (not soil import) | none | Bedding 6.48 CCY, pipe zone 34.46 CCY, replacement select fill 123.46 CCY |

### 3.15 Topsoil suggestion

The suggestion is the average topsoil thickness of the bores that log topsoil at the surface; bores with pavement
at the surface are left out. It is rounded to 0.05 ft.

**Example (Bidwell, pp.45–50).**
- B-1, B-2, B-4, B-5 and B-6 log 8, 7, 8, 4 and 3 in, an average of 6.0 in, so the suggestion is **0.50 ft**.
- B-3 has 2 in of asphalt at the surface and is left out.

### 3.16 A project with no grading (a requirement, D-526)

**The rule.** A project with no EG, no FG and no boundary still Calculates its runs and structures.
- Mass cut and fill are simply absent.
- The ground comes from rims and typed grades (spec §9.1).
- With no bores, the soil is Type C.

**Worked examples.** All use 8" PVC SDR-35 in a 36 in bucket (W = 3.0) at 1½:1.
- **A run with typed grades:** 100 ft, the ground from 100.00 to 99.00, the inverts from 92.00 to 91.00.
  - The trench depth is 8.52 all along: A = 3.0 × 8.52 + 1.5 × 8.52² = 134.45 SF, so **497.95 CY**.
  - Pipe: 100 LF at 8.00 ft (8–10). Protection: Sloped 1½:1, 8–10 ft, 100 LF.
  - The run says where its ground and soil came from: "No bores: Type C assumed."
- **Between two manholes.** Two 48" manholes (OD 4.833 ft, over-dig 2 ft): rims 100.00; floors and inverts 92.00;
  slab and stone 0.5 ft each; 100 ft centre to centre. The line is level, so the check is exact.
  - **Each pit:** h = 9.0, V = π·(19.507 × 9 + 4.417 × 1.5 × 81 + 2.25 × 729 ÷ 3) = **146.48 CY**; 8.00 VF (8–10).
  - **The trench between the pit outlines:** 100 − 2 × 4.417 = 91.17 ft × 134.45 SF = **453.96 CY**, less the two
    overlaps with the pits (§3.11), **37.51 CY** each.
  - **Total: 671.91 CY.** "Grade from rims: no surface here." and "No bores: Type C assumed."

---

## 4. Wireframes

### 4.1 The Earthwork row

```text
| Select Undo Redo |  PROPOSED  | +  | Contour Trace Spot Boundary Features Stripping [Bores] [Utilities] [Structures] Match | More |
|                  |  EXISTING  | 1' | ...                                                                                      |      |
| ... Linked EC  Calculate  3D VIEW/2D VIEW  EXIST. GRADE  PROP. GRADE  CUT & FILL  Report  Check grades                     |
```

The three new buttons sit after Stripping, in the same bordered group and style, and fold into More from the
right like the others.

### 4.2 Bores panel, a bore

```text
+- Bores ------------------------------------------------------------------ [ ] x -+
| (i) Bore data is your assumption for estimating. Geotech logs show conditions   |
|     at the bore locations only.                                                 |
| [Bores] [Soil layers]                                                           |
| +- List --------------+ +- B-1 -------------------------------------------------+|
| | * B-1  Boring  20.0 | | ID [B-1   ]  Type [Boring v]  Date [04/20/2026]        ||
| | * B-2  Boring  20.0 | | Source [Bidwell report      ]  Page [45 ]             ||
| | * TP-3 Pit      6.0 | | Ground  [        ] ft   712.40 from the existing surface||
| | + Place bores       | |         Report [711.90] ft  (0.50 ft lower)            ||
| +---------------------+ | Total depth [20.0] ft  End [Planned v] Refusal [-- v]  ||
|                         | Cave-in after tools [7.0] ft  [ ] Caving  [ ] Perched  ||
|                         | Water readings                              + Reading  ||
|                         |  Type              Depth          Date      Hours      ||
|                         |  At completion     not encountered 04/20               ||
|                         |  After N hours     12.50 ft       04/21      24        ||
|                         |  Design water level 11.50 ft (12.50 measured - 1.00)  ||
|                         | Layers         Copy from B-2 . Paste rows . + Row      ||
|                         |  From   To     Layer          Description     USCS  PI ||
|                         |  0.00   0.67   Topsoil v      Topsoil, 8 in   --       ||
|                         |  0.67  20.00   Fat clay v     Medium stiff to  CH   39 ||
|                         |                               very stiff, brown        ||
|                         |  Fat clay: Clay . OSHA B . backfill . expansive .      ||
|                         |  swell 1.30 . shrink 1.10   Applies to Fat clay in 6   ||
|                         |  bores                                                 ||
|                         +--------------------------------------------------------+|
+---------------------------------------------------------------------------------+
```

### 4.3 Soil layers tab

```text
| Soil layers, top to bottom                                         + Layer        |
|  ==  [#]  Topsoil             Topsoil        C    unsuitable   1.25 1.10  depth   |
|  ==  [#]  Fill, undocumented  Fill (non-eng) C    unsuitable   1.25 1.10  depth   |
|  ==  [#]  Fat clay            Clay           B    backfill     1.30 1.10  depth   |
|  ==  [#]  Limestone           Weathered rock C    always out   1.50 0.90  elev.   |
|  Fat clay  OSHA [B v]  Suggested: C — change if your geotech report says otherwise.|
```

### 4.4 Takeoff settings › Earthwork › Excavation slope rule

```text
| Excavation slope rule (this project)                                              |
| (o) Federal OSHA   A 3/4:1 . B 1:1 . C 1 1/2:1 . stable rock vertical             |
|                    Benching in A, and in B in cohesive soil only                  |
| ( ) From the geotech report     Source [Midway report, p.9          ]            |
|     [Load template v]                                                             |
|     Soil         Up to   Water          Slope H:V                                |
|     Cohesive     8 ft    above/below    0.5     ! Steeper than federal OSHA ...   |
|     Granular     4 ft    above          0.5     ! Steeper than federal OSHA ...   |
|     Granular     8 ft    above          1.0                                       |
|     Granular     any     below          Shoring required                          |
|     + Row            Deeper than every row: federal OSHA, flagged.                |
```

### 4.5 Takeoff settings › Earthwork › Utility settings

```text
| Utility settings (this project)                                                   |
| Side clearance [12] in each side   Minimum width [24] in                          |
| Bedding [6] in   Pipe zone to [12] in above the crown                             |
| Bedding   [#57 stone      ] (o) Imported ( ) Native  Density [   ] pcf  [98% D698] |
| Pipe zone [Sand           ] (o) Imported ( ) Native  Density [   ] pcf             |
| Backfill  [Native         ] ( ) Imported (o) Native                               |
| Trench from (o) Proposed subgrade ( ) Existing grade                              |
| Bucket [Auto v]  (smallest of 12 18 24 30 36 42 48 60 in at or above the pipe)   |
| Boxes                                  inside    outside   height       + Box     |
|   Box 4x8                              3.50 ft   4.00 ft   8.0 ft                 |
|   Box 6x8                              5.00 ft   6.00 ft   8.0 ft                 |
| Spec max width by size    8" [30] in   12" [36] in                 + Size        |
| Depth ranges [0 6 8 10 12 14 16] ft     Water buffer [1.0] ft                     |
```

### 4.6 Run panel

```text
+- SS-1 . Sanitary sewer ----------------------------------------------------- x -+
| Type [Sanitary sewer v]  Pipe [PVC SDR-35 (ASTM D3034) v]  Size [8" v]          |
| OD 8.400 in  ID 7.920 in  (catalog, edit)     Pipes [1]  Gap [--]                |
| Vertical (o) Inverts ( ) Start + slope ( ) Cover                                 |
|   Start invert [92.52] at MH-1     End invert [91.52] at MH-2                    |
| Trench from (o) Proposed subgrade ( ) Existing grade                             |
| Bucket [Auto v]   Box [Box 6x8 v]   Spec max [   ] in                            |
| Width 36 in — bucket  (pipe width 32.4 in)  bedding 6", zone 12" above crown     |
| Protection [Auto v]  [ ] Limited width / in street   Restoration [None v]       |
| Segments  0+00-0+40  Near building: clay backfill, no gravel bedding   + Segment |
| -- Last Calculate -------------------------------------------------------------- |
| Length 100.00 LF        6-8 ft 100.00 LF                                         |
| Excavation 325.93 BCY (Clay 325.93)     Rock 0                                   |
| Bedding 6.48 CCY  Zone 34.46 CCY  Backfill 283.56 CCY native                     |
| Sloped 1:1 (Type B), 8-10 ft 100.00 LF    Dewatering 0 LF                        |
| Spoils 14.01 BCY to the site balance                                             |
| ! notes                                        [Profile]  [Cross-section]        |
+----------------------------------------------------------------------------------+
```

### 4.7 Structure panel

```text
+- MH-1 . Sanitary manhole -------------------------------------------------- x -+
| Type [Sanitary manhole v]  Shape (o) Round ( ) Rectangular  Inside [48] in       |
| Wall [5] in   Rim [100.00] (proposed grade)   Floor [90.00]   Sump [   ]         |
| Inverts  In SS-0 90.20 . Out SS-1 90.00          Base slab [6] in  Stone [6] in  |
| Over-dig [2.0] ft   Protection [Auto v]   Pit from (o) Proposed ( ) Existing     |
| -- Last Calculate -------------------------------------------------------------- |
| Pit 138.77 BCY (Clay)   Stone 1.14 CCY   Backfill 130.50 CCY native             |
| 10.00 VF (10-12 ft)   Sloped 1:1 (Type B)   Dewatering: no   Rock: no           |
+----------------------------------------------------------------------------------+
```

### 4.8 Cross-section (split pane)

```text
| Section A-A' . 180 ft                                          [Pick run]   x  |
| 710 |       .--- existing ---.                                                 |
|     |  ____/                  `--- proposed ----                               |
| 705 |  ::::::: Topsoil ::::::::::::::::::::::::::::::                          |
|     |  ####### Fill ########                                                    |
| 700 |  %%%%%%%%%%%%%% Fat clay %%%%%%%%%%%%%%%%%%%%%%%                           |
|     |  ~ ~ ~ ~ ~ design water ~ ~ ~ ~ ~ ~ ~ ~ ~        o SS-1 (inv 692.52)       |
| 695 |  ....... Sand ..................................                          |
|     +----+-----------+-----------+-----------+------                            |
|         0+00        0+50        1+00        1+50          hover: EG 707.21 ...  |
```

### 4.9 Profile of a run (split pane)

```text
| Profile SS-1 . MH-1 to MH-2 . 100.00 ft                                     x  |
| 100 |=====================================================  ground (proposed)  |
|     | |MH-1|                                         |MH-2|                     |
|  95 | |    |  layers shaded behind, water dashed     |    |                     |
|     | |    |_______ crown ___________________________|    |                     |
|  92 | |    |_______ invert 92.52 to 91.52 ___________|    |                     |
|     |  trench bottom ......................................                     |
|     +---------------------------------------------------------                  |
|      [ Sloped 1:1 ..................... ][ Box (forced: water) ]  protection    |
|      [ 6-8 ft ......................... ][ 8-10 ft ............ ]  depth range   |
|  Stations every 5 ft: 0+00 EG 100.00 inv 92.52 depth 7.48 ...  (reading only)   |
```

### 4.10 Site Feature dialog: Option 1 and Option 2 additions

```text
| [x] Option 1: Undercut                                                         |
|   Remove (o) a fixed depth below subgrade [6.5] ft                             |
|          ( ) down to the bottom of layer [Fill, undocumented v]                |
|          ( ) to elevation [702.00] ft                                          |
|   Extend beyond edge [5.0] ft     Outward slope [0.0] H : 1 V                  |
|   Replacement, bottom up:  [Reconditioned native v] [3.5] ft                   |
|                            [Select fill v]           the rest                  |
|   Spoil: unsuitable layers always exported; others [Haul off v]                |
| [x] Option 2: Prepare subgrade   Method [Soil Stabilization v] ...             |
|   [ ] Geogrid  overlap [10] %    [x] Geotextile  overlap [10] %                |
```

### 4.11 Volumes panel additions

```text
| Cut by material          Pad      Remaining   Site                             |
|   Topsoil (in the cut)    0.00      0.00       0.00 BCY                        |
|   Fill, undocumented     12.30     40.10      52.40 BCY  (unsuitable: export)  |
|   Fat clay              980.10   2,103.20   3,083.30 BCY                       |
|   Limestone               0.00     55.00      55.00 BCY  (rock)                |
| Site balance                    Before utilities    With utilities             |
|   Soil export                         12.50 LCY          30.02 LCY             |
|   Always exported                        --            154.32 LCY             |
|   Imported materials: bedding 6.48 CCY . pipe zone 34.46 CCY . select 123.46 |
```

### 4.12 Estimating

```text
| v Utilities > Sanitary                                                          |
|   8" PVC SDR-35 Pipe, 6-8 ft deep — Sanitary Sewer         100.00 LF   33.03.01 |
|   Trench Excavation, Fat clay (bank) — Sanitary Sewer      325.93 BCY  33.11.01 |
|   Pipe Bedding, #57 stone (compacted) — Sanitary Sewer       6.48 CCY  33.11.02 |
|   Trench Protection, Sloped 8-10 ft — Sanitary Sewer       100.00 LF   31.09.01 |
| On an NRM2 project:                                                             |
|   Trench Excavation, Fat clay (bank) — Sanitary Sewer  325.93 BCY               |
|     Site Utilities — Sanitary Sewer . Not classified in NRM2   [Map scope...]    |
| Sidebar filter: [x] Not in the last Calculate (3)  ->  Select all . Delete       |
```

### 4.13 Settings › Classification › Work scopes

```text
| Work scopes                                              System [CSI v]          |
| Site Utilities — Sanitary Sewer                                     [Rename]     |
|    pipe              33.03.01 Gravity Main               [change]               |
|    trench excav.     33.11.01 Trench Excavation          [change]               |
|    structure: cleanout   33.03.04 Cleanouts              [change]               |
| Earthwork — Dewatering    dewatering   31.06 Dewatering  [change]               |
| Site Utilities — Other    pipe   Not mapped              [map]                  |
```

### 4.14 Takeoff panel, Folders tree

```text
| v Utilities                                                                     |
|   v Sanitary      SS-1, SS-2, MH-1, MH-2 and their Calculate lines              |
|   > Storm                                                                       |
| v Earthwork      cut, fill, strip, over-excavation, treatment, site balance     |
```

---

## 5. Estimating

### 5.1 Every line Calculate makes

**How the lines are built.**
- **Per sheet or per site.** One line per (sheet or site, region, work type, variant).
- **The region** for a utility line is `util:<type>`, so the lines add up across the runs of one utility type on
  one sheet (Q9). For a feature line it is the feature, as today.
- **Names** follow today's pattern, "… — <group>" (U-UT36).
- **Units** are written as stored; metric display follows `TO_METRIC`.

| Line (name pattern) | Unit | Work scope | Work type | Variant |
|---|---|---|---|---|
| `<size> <material> <class> Pipe[, n pipes], <range> deep — <Utility>` | LF | Site Utilities — <type> | `utility_pipe` | catalog key + range |
| `Trench Excavation, <layer> (bank) — <Utility>` | BCY | Site Utilities — <type> | `utility_trench_excavation` | `trench:` + layer |
| `Structure Excavation, <layer> (bank) — <Utility>` | BCY | Site Utilities — <type> | `utility_trench_excavation` | `structure:` + layer |
| `Rock Excavation, <layer> (bank) — <Utility>` | BCY | Earthwork — Rock / Hard Dig | `rock_hard_dig` | origin + layer |
| `Trench in Rock — <Utility>` | LF | Earthwork — Rock / Hard Dig | `rock_hard_dig` | `lf` |
| `Pipe Bedding, <material> (compacted) — <Utility>`, with a TON sub-item when a density is given | CCY | Site Utilities — <type> | `utility_bedding_pipe_zone` | `bedding:` + material + source |
| `Pipe Zone, <material> (compacted) — <Utility>`, with TON | CCY | Site Utilities — <type> | `utility_bedding_pipe_zone` | `zone:` + material + source |
| `Structure Base Stone, <material> — <Utility>`, with TON | CCY | Site Utilities — <type> | `utility_bedding_pipe_zone` | `stone:` + material |
| `Trench Backfill, <material> (compacted) — <Utility>`, with TON if imported | CCY | Site Utilities — <type> | `utility_backfill` | material + source |
| `Structure Backfill, <material> (compacted) — <Utility>` | CCY | Site Utilities — <type> | `utility_backfill` | `structure:` + material |
| `Trench Protection, <method> <range> — <Utility>` | LF | Earthwork — Trench Protection | `trench_protection` | method + range |
| `Trench Dewatering — <Utility>` | LF | Earthwork — Dewatering | `dewatering` | `trench` |
| `Structure Dewatering — <Utility>` | EA | Earthwork — Dewatering | `dewatering` | `structure` |
| `<Surface> Restoration, <width> wide — <Utility>` | SY | Site Restoration | `surface_restoration` | surface |
| `Utility Spoils Export, <class> (n BCY) — <Utility>` | LCY | Earthwork — Utility Spoils | `spoils_export` | unsuitable or rock |
| `<Structure type> <size>, <range> — <Utility>` | EA | Site Utilities — <type> | `utility_structure` | type + size + range |
| `Manhole Vertical Feet, <size> — <Utility>` | VF | Site Utilities — <type> | `utility_structure` | `vf:` + size |
| `Undercut Excavation, <layer> (bank) — <Feature>` | BCY | Earthwork — Over-excavation | `over_excavation` | layer |
| `Undercut Replacement, <material> (compacted) — <Feature>`, with TON | CCY | Earthwork — Over-excavation | `replacement_fill` | stack row |
| `<Feature> — Soil Stabilization…` (D-405's lines, with their sub-items) | SY / TON | Earthwork — Subgrade Treatment | `subgrade_treatment` | today's roles |
| `<Feature> — Geogrid` or `— Geotextile, n % overlap` | SY | Earthwork — Subgrade Treatment | `geosynthetics` | kind |
| `Rock Excavation, <layer> (bank) — <Feature or Remaining site>` | BCY | Earthwork — Rock / Hard Dig | `rock_hard_dig` | `site:` + layer |
| `Unsuitable Soil Export, <layer> (n BCY)` and `Rock Export, <layer> (n BCY)` | LCY | today's soil export role (Q5 decides its scope) | today's `soil_export` | class + layer |

**What does not change.** Today's lines are unchanged in name, unit and quantity. With layers present, the cut
line's quantity leaves out what moves to the rock lines, and the parts still add up to the total cut (§3.4).

### 5.2 Work types

The brief's fourteen:
- `utility_pipe`
- `utility_trench_excavation`
- `utility_bedding_pipe_zone`
- `utility_backfill`
- `trench_protection`
- `dewatering`
- `surface_restoration`
- `utility_structure`
- `spoils_export`
- `over_excavation`
- `replacement_fill`
- `subgrade_treatment`
- `geosynthetics`
- `rock_hard_dig`

**Today's 24 roles, if Q5 is yes.** They become work types under their own names (`cut`, `fill`, `strip_haul`…),
so their mappings can repeat today's codes exactly.

**The kind key** (`work_kind`) refines a mapping row:
- the structure type, for `utility_structure`;
- the surface, for `surface_restoration`;
- the material class, for `replacement_fill`: aggregate, select or other.

### 5.3 The default mapping: work scope × work type (× kind) → CSI

These are codes in the CSI tree we ship (`csi-default-v1.txt`), matched by code and title on first use in a
workspace. A workspace whose tree no longer has the code or title gets no mapping row, and the scope shows "Not
mapped" there.

| Work scope | Work type | Kind | Code | Title in our tree | Note |
|---|---|---|---|---|---|
| Site Utilities — Sanitary Sewer | utility_pipe | | 33.03.01 | Gravity Main | |
| Site Utilities — Force Main | utility_pipe | | 33.03.05 | Force Main | |
| Site Utilities — Storm | utility_pipe | | 33.05.01 | Storm Pipe | |
| Site Utilities — Water | utility_pipe | | 33.01.01 | Water Main | |
| Site Utilities — Fire Water | utility_pipe | | 21.02.05 | Underground Fire Line | Q15; alternative 33.01.01 Water Main |
| Site Utilities — Gas | utility_pipe | | 33.07.01 | Gas Main | |
| Site Utilities — Electric | utility_pipe | | 33.08.02 | Secondary Duct Bank | Q15; alternatives 33.08.01 Primary Duct Bank, 26.09.01 Underground Duct Bank |
| Site Utilities — Telecom | utility_pipe | | 33.09.01 | Telecom Duct Bank | |
| Site Utilities — Subdrain | utility_pipe | | 33.05.06 | Underdrains | |
| Site Utilities — Other | utility_pipe | | **none** | | Unmapped, listed |
| every Site Utilities — <type> | utility_trench_excavation | | 33.11.01 | Trench Excavation | Q15; alternative 31.04.03 Trench Excavation |
| every Site Utilities — <type> | utility_bedding_pipe_zone | | 33.11.02 | Bedding & Backfill | |
| every Site Utilities — <type> | utility_backfill | | 33.11.02 | Bedding & Backfill | |
| Site Utilities — Sanitary Sewer | utility_structure | sanitary_manhole | 33.03.03 | Manholes | |
| Site Utilities — Sanitary Sewer | utility_structure | cleanout | 33.03.04 | Cleanouts | |
| Site Utilities — Sanitary Sewer | utility_structure | lift_station | 33.03.06 | Lift Station | |
| Site Utilities — Storm | utility_structure | storm_manhole | 33.05.02.03 | Manholes | |
| Site Utilities — Storm | utility_structure | catch_basin | 33.05.02.01 | Catch Basins | |
| Site Utilities — Storm | utility_structure | curb_inlet | 33.05.02.02 | Inlets | |
| Site Utilities — Storm | utility_structure | area_drain | 33.05.02.02 | Inlets | Approximate: no Area Drain node |
| Site Utilities — Storm | utility_structure | junction_box | 33.05.02 | Structures | Approximate: the parent node |
| Site Utilities — Storm | utility_structure | headwall | 33.05.02.04 | Headwalls & Endwalls | |
| Site Utilities — Water | utility_structure | valve_vault | 33.01.04 | Valves & Boxes | |
| Site Utilities — Water | utility_structure | meter_vault | 33.01.06 | Meter & Vault | |
| Site Utilities — Electric | utility_structure | handhole_vault | 33.08.04 | Vaults & Pull Boxes | Q15; alternative 26.09.03 Pull Boxes & Handholes |
| Site Utilities — Telecom | utility_structure | handhole_vault | 33.09.02 | Handholes | |
| any | utility_structure | custom | **none** | | Unmapped, listed |
| Earthwork — Trench Protection | trench_protection | | 31.09.01 | Trench Boxes & Shielding | Sloped and benched have no node of their own: approximate |
| Earthwork — Dewatering | dewatering | | 31.06 | Dewatering | Q15; alternatives 31.06.02 Sump Pumping, 31.06.01 Well Points |
| Earthwork — Utility Spoils | spoils_export | | 31.04.08 | Export / Disposal | |
| Earthwork — Over-excavation | over_excavation | | 31.05.03 | Undercut & Replace | |
| Earthwork — Over-excavation | replacement_fill | | 31.05.03 | Undercut & Replace | |
| Earthwork — Over-excavation | replacement_fill | aggregate | 31.05.04 | Aggregate Base | Today's rule (D-142) |
| Earthwork — Over-excavation | replacement_fill | select | 31.04.05 | Select / Structural Fill | |
| Earthwork — Subgrade Treatment | subgrade_treatment | | 31.07.02 | Stabilization | 31.07.02.01 Lime and .02 Cement exist; 31.07.02 keeps D-405's lines where they are |
| Earthwork — Subgrade Treatment | geosynthetics | | 31.05.05 | Geotextile / Geogrid | Also 32.02.05 Geotextile |
| Earthwork — Rock / Hard Dig | rock_hard_dig | | 31.04.06 | Rock Excavation | |
| Site Restoration | surface_restoration | asphalt | 33.11.03 | Pavement Restoration | Alternative 32.01.03 Asphalt Patching |
| Site Restoration | surface_restoration | concrete | 33.11.03 | Pavement Restoration | Alternative 32.01.05 Concrete Panel Replacement |
| Site Restoration | surface_restoration | sod | 32.12.02.01 | Sod | |

**The brief's candidate codes, against our tree.** Our tree is legacy's own numbering, so none of the MasterFormat
numbers exists as written:

| Brief | Ours |
|---|---|
| 31 23 16 Excavation | 31.04.01 Mass Excavation (site); 31.04.03 Trench Excavation |
| 31 23 33 Trenching and Backfilling | 33.11.01 + 33.11.02 (or 31.04.03 + 31.04.04) |
| 31 23 19 Dewatering | 31.06 (.01–.04) |
| 31 23 23 Fill | 31.04.04 Backfill & Compaction; 31.04.05 Select / Structural Fill |
| 31 50 00 Excavation Support and Protection | 31.09; 31.09.01 Trench Boxes & Shielding |
| 31 32 xx Soil Stabilization | 31.07.02 |
| 31 05 19 Geosynthetics | 31.05.05 |
| Div 33 | water 33.01; sanitary 33.03; storm 33.05 (manholes 33.03.03 and 33.05.02.03); pumping station 33.03.06 Lift Station; gas 33.07; electrical 33.08; communications 33.09 |
| Fire water, both choices | **Div 21: 21.02.05 Underground Fire Line**, or **Div 33: 33.01.01 Water Main** |

**Missing or approximate** (listed in pending_umer): other pipe and custom structure (no node, as expected); area
drain and junction box (approximate); sloped and benched protection (approximate).

**Today's roles (Q5).**
- **CSI** gets one row per role, repeating `CSI_BY_ROLE`, including the aggregate rule.
- **The other four systems** get one row per scope, repeating `_SCOPE`: G1030, 8.1, 5.02 and E.04.
- The scopes are:
  - "Earthwork — Grading": cut, fill, soil import, soil export;
  - "Earthwork — Topsoil Strip": strip roles;
  - "Earthwork — Over-excavation": undercut roles;
  - "Earthwork — Subgrade Treatment": prep and stabilization.
- Nothing moves on any project.
- **Proved on duplicates first (D-526).** Every project total, every rate and the line count are compared before
  and after, on duplicates only.
- **No backfill.** No migration writes to existing lines; each line takes its scope on its next Calculate.
  Founder projects are never opened.

### 5.4 Sync rules

- **Created** on a successful Calculate, in the same transaction as the result (D-142).
- **Every Calculate writes:**
  - name, unit, quantity and bank quantity;
  - position;
  - sub-items (TON);
  - `is_stale` false.
- **Classification on write.** The scope's mapping for the project's system is resolved to the node:
  - `classification_ref_id` is set to it;
  - `class_folder_id` is set by `file_under(node)`, each line in its own code's folder.
- **Never overwritten, once placed by hand:** folder, class folder, classification and work scope. "Move items
  to…" now sets `placed_by_hand` (U-UT39).
- **Never the user's:** name and quantity (`CALCULATED_EDITABLE`, as today).
- **Kept because the row's id is kept:** rates (`estimate_line_item`, `takeoff_cost_component`), notes and layer.
- **A key that disappears** (Q6, D-526; built first, Block 0.5):
  - a row with any price or cost component is kept at 0, with `earthwork_retired` and "Not in the last
    Calculate";
  - a row without one is deleted, as today;
  - a kept row comes back to life when its key returns;
  - Estimating's sidebar filters to the retired rows, so they can be cleared in one go: filter, select all,
    Delete, one undo. A retired row can be deleted; a live Calculate line still cannot (`CALCULATED_EDITABLE`).
- **Unit costs** start empty. There is no price library to match (§1.1); a returning key keeps its old rates.
- **Mapping changes.** When a mapping row changes, every line in the workspace with that scope, type and kind is
  re-resolved, in projects on that system, unless placed by hand. Every project using the scope picks it up.
- **Out of date.** The same `is_stale` flag. Estimating shows the "Needs recalculating" mark (U-UT38).

### 5.5 Other systems

- **Nothing shipped.** No default mapping ships for UniFormat, NRM1, NRM2 or CESMM (the brief), except Q5's
  repeat of today's fallback for today's roles.
- **Until mapped.** A line shows its work scope and "Not classified in NRM2" (with the system's short name).
  Its Classification column reads "—" (Estimating's word for none), and it groups under "Unassigned".
- **Mapping once.** "Map scope…" opens the mapping for that scope in the project's system. One mapping serves
  every project.

---

## 6. Test plan

**Rule 8 and the brief.** Every check is a one-command, read-only bench check with the hand-worked numbers inside.
Nothing is a test suite.
- **Engine numbers** become **quantity-table rows**, because the engine is in the browser only and a Python check
  would need a second engine. The files are `intelcost-infra/browser/lib/earthwork-cases.mjs` and a new
  `utility-cases.mjs`, run by `./quantity-table.sh` with tolerance 1e−6 CY.
- **Data and api rules** become `intelcost-app-fastapi/scripts/check_<topic>.py` files: read-only, printing one
  line that ends passed or FAILED, as `check_share_as_member.py` does (D-524).
- **Where the brief asks for 0.5 %,** the rows hold 0.01 CY, which is tighter.

### 6.0 Block 0.5 (built first)

| # | Check | Expected | Source |
|---|---|---|---|
| 0.5a | Q13: a 7,000 SF pad whose subgrade is 2.0 ft above existing ground, with a 6.5 ft undercut | 1,166.67 CY (today 1,685.19); a pad in a cut area is unchanged (Heinsohn's 1,685.19) | synthetic; Heinsohn pp.17–18 |
| 0.5b | Q6: a priced line whose key disappears | kept at 0, "Not in the last Calculate", rates intact; back with its rates when the key returns; Estimating's filter lists it; select all and Delete removes the retired rows only, in one undo; a live Calculate line still cannot be deleted | `check_retired.py` and the smoke |
| 0.5c | U-UT38 | a stale Calculate line shows "Needs recalculating" in Estimating | the smoke |
| 0.5d | U-UT39 | "Move items to…" sets `placed_by_hand` on Calculate lines; the next Calculate leaves them where they were moved | `check_retired.py` |
| 0.5e | Nothing written | the 3D test copy's stored result and md5 (`fab4d151…`) unchanged. A result with an undercut reads out of date when read (D-470's mechanism); the copy's Building Pad has one, so the copy reads out of date until its next Calculate | the copy |

### 6.1 Block 1

| # | Check | Expected | Source |
|---|---|---|---|
| 1.1 | Midway pits, flat cut 1.20 ft over the triangle | total 222.22; topsoil 92.59; fill 116.79; granular 12.84 CY; sum = total | Midway pp.23–25, p.2 |
| 1.2 | 1.1 with a 0.50 ft strip | strip 92.59; cut below strip 129.63 = 116.79 + 12.84; no topsoil in the cut | same |
| 1.3 | 1.1 over the square (extrapolation) | 444.44 = 185.19 + 242.47 + 16.79 | same |
| 1.4 | Extrapolated values | D(50, −30) = 7.00; D(−20, 50) = 5.00; D(150, −50) = 8.00 | synthetic |
| 1.5 | Clamp: TP-4 ended in fill at 7.0 ft | Clay clamped over 555.56 SF, max 2.00 ft, near TP-4; at every piece vertex D′L ≥ D′L−1 | synthetic on Midway's pattern |
| 1.6 | Design water, W-1 | 4.00 ft; without the seasonal high 4.20 ft | synthetic |
| 1.7 | Design water, real | Deland 5.00; Maricopa 81.80 (published); Manila Creek B-1 none (below 41.5); Plain City B-13 4.00 and B-12 6.00; Midway TP-3 3.00 | Deland p.21, p.8; Maricopa p.8; Manila p.24; Plain City pp.35–36, p.12; Midway p.25, p.12 |
| 1.8 | Topsoil suggestion | 0.50 ft (6.0 in) | Bidwell pp.45–50 |
| 1.9 | No bores, no change | the 3D test copy's key equals its stored key; C-200 md5 `fab4d151…` unchanged | the copy |
| 1.10 | `check_geotech.py` | a log with a gap, an overlap or an out-of-order layer is refused with the row named; a layer in use is not deleted; a guest write gets 403 | api |

### 6.2 Block 2

| # | Check | Expected | Source |
|---|---|---|---|
| 2a | 100 LF of 8" PVC SDR-35, 8.00 ft trench, Type B, OSHA sloped, Auto bucket | "Width 36 in — bucket"; 325.93 CY; bedding 6.48; zone 34.46; backfill 283.56; pipe LF 6–8 100; protection Sloped 8–10 100 LF | manufacturers' sheets (ASTM D3034); OSHA App B |
| 2a′ | Same, bucket typed 24 in | the pipe width governs (32.4 in): 317.04 CY; 5.93 / 32.57 / 277.11 | same |
| 2b | Same, in a 6.00 ft outside box from the list (5.00 ft inside, 8 ft high) | "Width 6.00 ft — box"; 177.78 CY; 11.11 / 36.35 / 128.89 | same; D-526 |
| 2b′ | A box with no list and no typed width | the run is flagged "Box width not set: pick a box or type its outside width." until it is set | D-526 |
| 2c | Same, benched | 207.41 CY; top width 11.00 ft | OSHA App B Figure B-1 (Type B) |
| 2c′ | Type A, 14 ft deep, benched | two 5 ft benches over a 4 ft vertical side: 139.50 SF/LF; top width 16.50 ft | OSHA App B Figure B-1 (Type A) |
| 2d | Sand, Type C, benched | refused "Benching isn't allowed in this soil."; sloped 444.44 CY | OSHA |
| 2e | Water above the trench bottom | dewatering 50.00 LF (water 91 → 93, bottom 92) and 100.00 LF when fully under; box forced in granular | synthetic |
| 2f | Clay over sand | the flatter governs: 1½:1, 444.44 CY | synthetic |
| 2g | (a) with the Utah template | 207.41 CY and the "Steeper than federal OSHA…" note | Midway p.9 |
| 2h | Utah template at Midway TP-1 | 4 ft: 0.5:1, 20.00 SF/LF; 5 ft: box forced (below the 4.20 ft design water) | Midway p.9, p.23, p.12 |
| 2i | Maricopa B-1 Type C | 66.00 SF/LF, 244.44 CY; dewatering 0 | Maricopa p.20, p.43, p.8 |
| 2j | Miami B-2, shored | 88.89 CY: common 44.44, rock 44.44, rock 100 LF, dewatering 100 LF | Miami p.30, p.15 |
| 2k | Bidwell B-1 cave-in 7.0 ft | 6 ft trench sloped 1:1; 8 ft trench box forced, flagged | Bidwell p.45, p.17 |
| 2l | LF by invert depth | 6–8 100.00 LF, 8–10 100.00 LF | synthetic |
| 2m | Spoils | 14.01 BCY suitable to the balance | synthetic |
| 2n | Exact rule against 5-ft stations | depth 6 → 10 at 1:1: exact 266.67 CF under one-interval AEA, 0.67 CF under 5-ft AEA | synthetic |
| 2o | `check_utilities.py` | a run's fields are refused when out of range; a Calculate line keyed by variant keeps its id across Calculates; mapping resolution returns 33.03.01 on CSI and none on NRM2 | api |
| 2p | Spec max 30 in on (a) | "Wider than spec max — pay width may be limited"; 311.11 CY at the spec width beside the actual 325.93; the actual not reduced | D-526 |
| 2q | Utilities only: no EG, FG or boundary (a requirement) | run with typed grades 497.95 CY; two manholes from their rims 146.48 CY each, 8.00 VF each; the run between them 453.96 CY less two overlaps of 37.51; total 671.91 CY; "No bores: Type C assumed." | §3.16 |

### 6.3 Block 3

| # | Check | Expected | Source |
|---|---|---|---|
| 3a | 48" manhole, 10 VF, Type B, sloped | pit 138.77; stone 1.14; backfill 130.50 CY; 10.00 VF, range 10–12 | synthetic |
| 3b | Lift station, water above the floor | clay counts C below the water: 1,014.52 CY, dewatering flag; sand: shoring forced, 132.74 CY | synthetic |
| 3c | Trench into the manhole (36 in bucket) | overlap 31.82 CY deducted; trench 471.69 CY; pit + trench 610.46 CY | synthetic |

### 6.4 Block 4

| # | Check | Expected | Source |
|---|---|---|---|
| 4a | Heinsohn pad 6.5 ft, 5 ft beyond | 1,685.19 CY; reconditioned 907.41; select 777.78; scarify 777.78 SY; ½" PVM variant 2,203.70 | Heinsohn pp.17–18, p.8 |
| 4b | Bidwell 24 in under pavement | 2,222.22 CY removed and as cap | Bidwell p.22 |
| 4c | Bidwell lime 8 % at 16 in | 1,111.11 SY, 58.67 TON at the project's 110 pcf; Gallia 36.67 and 51.33 TON | Bidwell p.21; Gallia p.11 |
| 4d | Midway remove fill to natural soil | 216.05 CY: topsoil 92.59, fill 123.46, both exported | Midway pp.23–25 |
| 4e | Bidwell footing undercut | box 120.37 CY per 100 LF (zone 74.07 if Q12 is no) | Bidwell p.25, p.42 |
| 4g | Geotextile, 10 % | 1,222.22 SY | synthetic |

### 6.5 Block 5

| # | Check | Expected | Source |
|---|---|---|---|
| 5a | Balance before and after | 10.00 BCY / 12.50 LCY before; 24.01 BCY / 30.02 LCY after; always exported 154.32 LCY; imported materials listed apart | §3.14 |
| 5b | Default mapping on CSI | every line's code as in §5.3; "Other" and "custom" not mapped | `csi-default-v1.txt` |
| 5c | NRM2 project | "Not classified in NRM2" until mapped once; then every project on the scope shows the node; a line classified by hand keeps it | `check_scopes.py` |
| 5d | Renames and folders | a renamed work scope and a renamed "Utilities" folder are kept after Calculate | `check_scopes.py` |
| 5e | Retired priced row, utility lines | a priced 6–8 ft pipe line kept at 0 when the run gets deeper; back with its rate when it returns (the rule is Block 0.5's) | `check_scopes.py` |
| 5f | Today's lines (Q5, D-526) | on duplicates only, never a founder project: before and after, every project total, every rate and the line count identical, with every existing line keeping its code and folder; no migration writes to existing lines | the duplicates |

### 6.6 Every build block closes with

1. **The gates:** lint, typecheck and build in the app; ruff and mypy in the api.
2. **The quantity table** with the block's new rows. A mismatch is fixed first.
3. **The earthwork smoke:** Calculate on a **duplicate** of "Hidden Valley Rebid — 3D test" (deleted after the
   block), checked against the copy's figures.
4. **The original copy:** C-200's md5 (`fab4d151…`) unchanged.
5. **One Playwright smoke** on a throwaway account and the duplicate, with screenshots into the run's
   `morning-report-<date>` folder.
6. **Guest:** the duplicate's link opened as a guest; the new panels read-only, tools greyed with "Sign up for
   Professional to use this.", pricing off by default.
7. **Metric:** the project switched to metric and back. Every new quantity reads in m, m², m³, BCM, LCM, CCM or t,
   and every total is identical after the round trip.
8. **Commit and push** on `umer-dev`, then the workspace mirror's commit. Test data and browsers are removed.
   Nothing is uploaded: the duplicate's own sheets are used.

---

## 7. Blocks, with honest hours

**How the hours count.** Hours are counted as F26's plan counted them: 80 h, built in one overnight run plus
fixes. Each sub-block is committable on its own, so a run can stop at a sub-block boundary.

### Block 0.5: four existing issues, built first (about 11 h; D-526)

| Sub-block | What | Hours |
|---|---|---|
| 0.5A | **Q13: today's fixed undercut counts existing ground only.** The undercut is worked inside the model, against the surfaces. Features with an undercut get a feature-key part, so their results read out of date once (D-470's mechanism: nothing is written). | 5 |
| 0.5B | **Q6: priced rows are kept.** `takeoff_item.earthwork_retired` (migration). `write_lines` keeps a priced row at 0 and revives it when its key returns. Estimating gets the "Not in the last Calculate" filter, with select all and Delete in one undo; a retired row can be deleted. `check_retired.py`. | 4 |
| 0.5C | **U-UT38:** Estimating shows "Needs recalculating" on stale Calculate lines. | 1.5 |
| 0.5D | **U-UT39:** "Move items to…" sets `placed_by_hand` on Calculate lines. | 0.5 |

Block 0.5 closes as every block does (§6.6), with the checks in §6.0.

### Block 1: bores and the 3D layer model (about 46 h; the brief says 1–2 days)

| Sub-block | What | Hours |
|---|---|---|
| 1A | Tables, migration, routes, validation, the `geotech` event, `COPIED`, `check_geotech.py` | 6 |
| 1B | Bores button and icon, placement, the sheet layer, move, delete and undo; the Bores panel with readings, layer rows, the banner, copy, paste and tab-through; the Soil layers tab; the OSHA suggestion | 12 |
| 1C | The engine: points per layer (Q2), fields, the one- and two-point cases, extrapolation pieces, clamps and their notes, design water and the water surface | 8 |
| 1D | Calculate: the exact cut split, the stored `materials`, the Volumes panel rows, strip notes, the topsoil suggestion, the version key part | 7 |
| 1E | 3D: layer and water meshes, bore columns, toggles, scene bounds, picking | 6 |
| 1F | The cross-section tool in the split pane | 4 |
| 1G | Excavation slope rule settings, the template, the "Steeper…" note | 3 |

**Why it is bigger than the brief's estimate.** The exact split by layer (1C, 1D) and the bore form with paste and
tab-through (1B) are each about a day.

### Block 2: utilities (about 57 h; the brief says 2–3 days)

| Sub-block | What | Hours |
|---|---|---|
| 2A | `utility_run`, item columns, rebuilt line indexes, folder keys, work scope tables with the CSI defaults (no UI yet); Utility settings with the default bucket, the box list and spec max widths per size | 8 |
| 2B | The pipe catalog, with the source on every row (manufacturers' sheets accepted, D-526); blanks listed | 4 |
| 2C | Utilities button, drawing, snap to structures and runs (new snap source), the run panel with segments, bucket, box and spec max, the run layer (colours, labels), filing under Utilities › type | 12 |
| 2D | The engine: breakpoints, the trench-width rule, sections, protection selection, exact integration, zones, pipe displacement, native and imported, spoils, ranges, dewatering, restoration, the spec-width quantities | 16 |
| 2E | Utility sheets through a link (Q8); ground from rims and typed grades; utilities-only projects Calculate with no EG, FG or boundary (a requirement, D-526) | 6 |
| 2F | The profile pane; pipes in the cross-section | 5 |
| 2G | Results in the panel, the lines (classified by work scope), the report's Utilities section and Excel sheet, `check_utilities.py` | 6 |

### Block 3: structures (about 16 h; the brief says 1 day)

| Sub-block | What | Hours |
|---|---|---|
| 3A | `utility_structure`, routes, `COPIED` | 2 |
| 3B | Structures button, panel, sheet marks, connections and inverts | 6 |
| 3C | Pits (round and rectangular), protection, stone, backfill, VF, flags, the trench cut-off and slice overlap | 6 |
| 3D | Lines, report rows, 3D structures and pipes | 2 |

### Block 4: over-excavation and treatment (about 13 h; the brief says 1 day)

| Sub-block | What | Hours |
|---|---|---|
| 4A | Columns and migration; compaction notes | 2 |
| 4B | The engine: modes with existing ground, the extent box, the split by layer, stacks, geosynthetics (Q13's fix is Block 0.5's) | 5 |
| 4C | Site Feature dialog, Options 1 and 2; notes in Estimating and the report | 4 |
| 4D | Lines, the report section, the checks | 2 |

### Block 5: balance, Estimating, classification, folders, report (about 24 h; the brief says 1 day)

| Sub-block | What | Hours |
|---|---|---|
| 5A | The balance's new inputs, per-layer factors, before and after, the lines | 6 |
| 5B | Settings › Classification › Work scopes; "Map scope…"; "Not classified in <system>"; re-resolving on change | 8 |
| 5C | Today's 24 roles onto work scopes (Q5), reproducing every system's codes. Proved on duplicates first: every project total, rate and line count, before and after. No backfill. `check_scopes.py`. | 4 |
| 5D | Guest pass over everything; the report's Bores and layers, Cut by material and Over-excavation sections and Excel sheets; a final metric pass | 6 |

**Why it is bigger than the brief's estimate.** The brief assumed the scope mapping existed. It does not, so 5B
builds it.

**Total: about 167 h** (Block 0.5 11, Block 1 46, Block 2 57, Block 3 16, Block 4 13, Block 5 24). Block 0's
total of 156 h was mis-added: its Block 5 sub-blocks came to 26 h, not 28, so it was 154 h. As runs, roughly:
- Block 0.5: part of one day run;
- Block 1 and Block 2: one long day run each, possibly two;
- Block 3, Block 4 and Block 5: one each.

### What could be cut (nothing is cut without asking, D-526)

**Block 1**
- The cross-section tool: move it to Block 2, where it shares the profile's code.
- Paste rows.
- 3D bore columns.
- Elevation-interpolated layers (Q1: everything by depth).

**Block 2**
- The utility-sheet link (draw runs on the grading sheet).
- The geotech table (federal OSHA only).
- Benching.
- Segments.
- Duct banks (one pipe per run).
- Restoration.
- The profile pane (keep the panel's figures).

**Block 3**
- Rectangular pits.
- The slice overlap: use the flat-wall rule, which in §3.11's example overstates the deduction by 5.60 CY.

**Block 4**
- The outward slope.
- The elevation mode.
- Stacks (one replacement material).

**Block 5**
- Q5: today's roles stay on `CSI_BY_ROLE` for now.
- The mapping UI: lines read "Not classified" outside CSI.
- The "before" column.
- The Excel sheets.

---

## 8. Risks and unknowns

**The three biggest**
1. **The scope mapping the brief relies on does not exist.**
   - A "scope" here is a classification node, and there is no work type. Block 5 builds a workspace-level mapping
     that crosses projects: re-resolving lines when a mapping changes, and matching scopes on a copy into another
     workspace (D-384).
   - The word "Scope" is taken by the classification tree's second level, hence "work scope" (Q4).
2. **Our CSI is not MasterFormat.** It is legacy's tree with its own numbering, so the brief's candidate codes do
   not exist as written. The defaults are matched by title (§5.3), and a workspace that edited its tree may lose
   some.
3. **Calculate's guards need EG, FG and a boundary,** and a utilities-only project must Calculate anyway (a
   requirement, D-526).
   - The guards in `useVolumes` and `computeVolumes` change, and so does the "ground from rims" path (2E, check
     2q).
   - The version key rule and the md5 check guard against moving existing results.

**Engine and performance**

4. **The exact split costs time.** It is prisms × layer pieces, and C-200 has thousands of prisms. It runs in the
   worker with a grid index, and is measured on the duplicate. The fallback is a coarser index, never sampling.
5. **The TIN engine knows only EG and FG.** `TinSurface` needs a widened type or a wrapper. `sampleZAt` is O(T)
   per call, so stations must use the indexed lookups.
6. **Today's undercut ignores the ground.** It is a flat slab. The new modes need EG and the subgrade everywhere,
   which is a new path.
   - Q13 (Block 0.5) also changes the old path, so results with an undercut read out of date once. That includes
     the 3D test copy, whose Building Pad has one.
   - Nothing is written, so the copy's stored result and its md5 do not change.

**Lines and Estimating**

7. **Rates go when rows go.** Depth-range lines come and go with small design changes, and a deleted row's rates
   cascade away. Q6 keeps priced rows instead (Block 0.5).
8. **"Move items to…" does not set `placed_by_hand`,** so a Calculate re-files lines moved that way (fixed in
   Block 0.5).
9. **Estimating does not show `is_stale`** today, so the brief's "same out-of-date flags" is half invisible there
   (fixed in Block 0.5).

**Canvas, sheets and 3D**

10. **Snapping.** Earthwork shapes are not snap targets. A new snap source in `SheetCanvas.tsx` (3,269 lines)
    risks the canvas; it is smoke-tested on Linear and Contour as well.
11. **`ProjectTakeoff.tsx` is 8,903 lines.** The new tools, layers and panels go in their own hooks and modules;
    the page only mounts them, and the canvas layer gate must include them.
12. **Utility plans are separate sheets.** The surfaces are on the grading sheet, and EG often on a survey sheet
    through F18. Mapping runs and structures through a link is new (Q8), and so is mapping them through a site's
    join (F19).
13. **3D.**
    - The exaggeration is a non-uniform y scale, so pipes are drawn in their own group.
    - The scene's bounds, floor and camera assume EG and FG only.
    - Picking hits the terrain only.
    - The pane needs a Calculate model; bores without a Calculate need their own gate.

**External values and the reports**

14. **The pipe catalog.** ASTM and AWWA tables are not free to read.
    - Manufacturers' sheets are accepted, with the source on each row (D-526).
    - A value with no source stays blank and is listed.
    - Check (a) uses D3034's 8" (OD 8.400 in, wall 0.240 in) from those sheets.
15. **OSHA's bench sizes are drawn only in the figures.**
    - LII's text says "maximum bench dimensions as follows:" and has no figures.
    - The sizes were read from the official CFR's printed figures (2023 edition). Those figures also showed that
      the benches sit inside the slope line from the toe, which corrected Block 0's drawing (§3.8).
    - OSHA's other configurations are not offered: Type A's short-term ½:1 slope and unsupported vertical lower
      portion, and the shielded lower portion with a slope above.
16. **No report gives coordinates or ground elevations** on its logs (all nine). Bores are placed by eye from the
    report's location figure, and their ground comes from our EG. A report on its own datum stays informational.

**Process**

17. **Copies.** New tables must join `COPIED`, or Duplicate project drops them silently. Work scopes are workspace
    data and are not copied.
18. **The bench bucket.** The brief's "duplicate of the 3D test copy" copies its files inside the bench bucket
    (`umer-local-intelcost1`, D-259). "No writes to the shared AWS bucket" is read as the shared staging or
    production bucket, as earlier runs read it. The smoke tests upload nothing. If the copy has no utility sheet,
    runs are drawn on C-200.
19. **Lenses.** In a top-to-bottom list, an interbed or lens needs its own layer, logged as missing in every other
    bore (Gallia's CH lenses, Plain City's clay interbeds). Entry is heavier; the panel's order check guides it.
20. **Units.** VF is a new unit. The metric depth ranges are defaults (U-UT28). Elevations follow the sheet's unit
    (D-398) and must not drift on a round trip.

---

## 9. Questions, answered

**Answered 2026-10-15 (D-526): all fifteen yes, as recommended,** with these notes:
- **Q5:** built on a duplicate first, with every project total, rate and line count proved unchanged before and
  after. No backfill. Founder projects are never touched.
- **Q6:** plus an Estimating filter for "Not in the last Calculate", so those rows can be cleared in one go.
- **Q7:** where there is no proposed surface, the existing grade, stated on the run.
- **Q9:** the per-run breakdown stays in the run panel and the grading report.
- **Q12:** the box: 32.5 SF/LF on Bidwell's footing.

The questions as asked follow, unchanged.

**Q1. How are layer bottoms interpolated?**
Soils by **depth below the existing ground**, so they follow the terrain; weathered rock and bedrock by
**elevation**; water by elevation. Interpolating soils by elevation would put a 0.5 ft topsoil on a plane between
the bores: 3 ft thick under a rise and missing in a dip.
*Recommended: yes, as written (per layer, editable).*

**Q2. Should a bore that ends early ever make anything shallower?**
A bore that ends inside a layer says the layer goes at least that deep. A bore that ends above a layer says
nothing about it. So the model never invents shallower rock, a shallower layer or shallower water than a bore
shows. This is the brief's "never invent shallower water", applied to layers.
*Recommended: yes.*

**Q3. Exact volumes instead of 5 ft average end areas.**
The volume between breakpoints, where everything is linear, is exact by the prismoidal rule (hard rule 3). The
average end area overstates by k·L·Δh²/6. The 5 ft table stays in the profile, for reading.
*Recommended: yes.*

**Q4. Build work scopes, since no scope mapping exists.**
- A workspace list of **work scopes**.
- A mapping per classification system: scope + optional work type + optional kind → node, most specific wins.
- Items carry `work_scope_id`, `work_type` and `work_kind`.
- The UI says "Work scope", because "Scope" already names the second level of a classification tree.

*Recommended: yes.*

**Q5. Move today's 24 earthwork lines onto work scopes too.**
With mappings that repeat today's codes in all five systems (CSI's per role, the others' fallback node), so nothing
moves anywhere. Then no earthwork code is left in the feature's code.
*Recommended: yes, in Block 5.*

**Q6. Keep the rates when a Calculate line disappears.**
A priced row whose key is gone stays at 0, marked "Not in the last Calculate", and returns with its rates when the
key comes back. This applies to every Calculate line, today's included. Without it, a depth-range line that comes
and goes loses its rates.
*Recommended: yes.*

**Q7. Where does a trench start?**
The proposed subgrade by default (after mass grading), or the existing grade per run. In a cut area, a trench
started from the existing grade does not count again the part above the proposed subgrade, which is already in the
site cut.
*Recommended: yes.*

**Q8. Utility sheets and missing surfaces.**
- Runs and structures drawn on a utility sheet are read into the grading sheet through a control-point link, as
  linked EG is (F18).
- Where no surface covers a run, its ground runs from rim to rim.

*Recommended: yes.*

**Q9. Estimate lines added up, not one set per run.**
Lines per sheet, added up by utility type, material, size and range ("8" PVC SDR-35, 6–8 ft: 450 LF"), so a price
is typed once. Each run's own figures stay in its panel and in the report.
*Recommended: yes.*

**Q10. Which depth puts a line in a range?**
Pipe by **invert depth** (the cut to the invert, as pipe is usually priced). Protection by **trench depth**.
*Recommended: yes.*

**Q11. Stable rock under soil.**
The rock is cut vertical and the soil above is sloped from the top of the rock (OSHA's layered-soil case), instead
of the brief's flattest slope through the rock. On Miami's limestone, the flattest slope would multiply the rock
volume.
*Recommended: yes, for stable rock only. Every other mix uses the flattest slope, as the brief says.*

**Q12. Over-excavation with an outward slope.**
The excavation and the replacement are the vertical-walled box at the full extent reached at the bottom. On
Bidwell's footing detail that is 32.50 SF/LF; the sloped zone alone is 20.00 SF/LF. A contractor cannot undercut,
so the box is what is dug and refilled.
*Recommended: the box.*

**Q13. Today's fixed undercut in fill areas.**
Today it counts the band between the subgrade and the existing ground as removed soil, which overstates: 1,685.19
against 1,166.67 CY in §3.12. Count existing ground only. Results with an undercut read out of date once, as with
D-470.
*Recommended: correct it.*

**Q14. Subgrade treatment.**
Extend F25's Option 2 with geogrid and geotextile (SY, overlap %), instead of building a second treatment tool. A
treatment-only area is a Site Feature with no depth.
*Recommended: yes.*

**Q15. The ambiguous codes.**

| Item | Recommended | Or |
|---|---|---|
| Fire water pipe | 21.02.05 Underground Fire Line | 33.01.01 Water Main |
| Electric conduit | 33.08.02 Secondary Duct Bank | 33.08.01 Primary Duct Bank, or 26.09.01 Underground Duct Bank |
| Electric handholes and vaults | 33.08.04 Vaults & Pull Boxes | 26.09.03 Pull Boxes & Handholes |
| Utility trench excavation | 33.11.01 | 31.04.03 |
| Dewatering | 31.06 Dewatering (the parent, since the method is unknown) | 31.06.02 Sump Pumping, or 31.06.01 Well Points |

*Recommended: the first of each.*

---

## 10. What the reports contain that the plan still cannot represent

### 10.1 Corrections to the brief's expectations

| Report | What the brief expected | What the report says |
|---|---|---|
| Gallia | Bedrock refusal | **No bedrock and no refusal.** "Bedrock and groundwater were not encountered in any of the test borings" (p.10); all 13 borings end at 15.0 ft as planned. No report in the set has a rock refusal: Midway's refusals are caving, and Plain City B-10's is heaving sand. **The rock checks use Miami's limestone, and the clamp check is synthetic.** |
| Bidwell | Chemical treatment with a dry density | **Lime only**, 8 % at 16 in (p.21), with **no dry unit weight** anywhere. Tons use the project's 110 pcf and say so. Gallia offers 5 % quicklime or 7 % lime kiln dust at 16 in (p.11), also without a density. |
| Deland | Seasonal high per boring | **One boring.** The seasonal high is a rule, "approximately one foot above the measured level" (p.8). The 20 to 30 % shrinkage is "from its loose-dumped or hauled state" (p.11): loose to compacted, not bank to compacted. |
| Maricopa | Caliche | **None.** Every layer says "no cementation" (pp.43–50). Type C and the ADWR 81.80 ft are confirmed. |
| Miami | Limestone hard dig with detail | "Hard dig and/or weathered rock excavation" (p.3, p.11), with no rippability, hardness or OSHA type. Water was read at drilling only, in mud-rotary holes. |
| Utah (Midway, Manila Creek, Plain City) | A slope table | **Prose, not a table**, and nothing beyond 8 ft ("not anticipated"). Plain City drops "above the water table" from the granular sentences. |
| Heinsohn | 6.5–8.5 ft over-excavation, 5 ft beyond | Confirmed (pp.17–18). **No datum is stated** for the depth, and **no outward slope**. Water was read at 20 ft in 20 ft borings, the same depth as the bottom. |

### 10.2 What the model cannot represent

| Item | Where | How it is handled |
|---|---|---|
| Lenses and interbeds: clay seams of ½–3 in in sand; CH lenses at different depths; 2 in gravel layers | Plain City B-8 and B-10 to B-14; Gallia B-01, B-04, B-07, B-08 (pp.10–11); Manila B-1 | A lens is its own layer, logged as missing elsewhere; seams under a few inches are merged into their host. The model cannot draw a lens that pinches out at its own depth between two bores without the user splitting the host layer at the lens's horizon. |
| Topsoil inside a fill unit | Midway (roots to 6 in within the fill) | Entered as two layers. |
| Refusal for caving, heave in the augers | Midway TP-2, TP-3; Plain City B-8, B-10 | A refusal for caving is never a rock top. Heave is a note. |
| Expansive soil (PVM, swell %, EI) | Heinsohn (PVM 4¼ in, active zone 12 ft); Maricopa (swell 7.6 %, EI 36); Bidwell (PI ≥ 23 "High") | The "expansive" flag only. No movement is computed. A PVM-driven over-excavation depth is typed. |
| Collapse potential | Maricopa (0.44 % and 0.95 %, p.9) | A note. |
| Karst, sinkholes, mines, earth fissures | Deland (p.9), Miami (p.3), Bidwell (mines, karst "moderate", p.8, p.10), Maricopa (p.10) | Notes only. |
| Buried features from earlier use: foundations, septic tanks, cisterns, wells, abandoned pipe | Bidwell (p.16), Heinsohn (p.33), Midway (p.8) | Not modelled; entered as an over-excavation area if priced. |
| A bedrock depth from published maps | Bidwell, about elevation 650, 46–72 ft down (p.8) | There is no "published" rock reading. It can be entered as a layer by elevation with a typed point (a placeholder bore labelled published). |
| A loose-to-compacted shrinkage | Deland (p.11) | The estimator splits it into swell and shrink; the dialog explains. |
| Moisture-dependent suitability, and proof-roll failure allowances | Bidwell (pp.16, 19, 22); Gallia (p.11); Manila Creek (drying, p.9) | Flags. An allowance is an over-excavation area of an assumed size. |
| Rules tied to the water level | Plain City (no proof roll within 1 ft of water, stabilizing fill within 2 ft, slab at least 4 ft above water); Midway and Manila (slab at least 4 ft above water) | The water surface is shown; the rules are not computed. |
| Influence lines from existing foundations, and vibration distances | Deland (45° line, rollers 50 ft and 20 ft, p.10); Miami (1:1 line, p.62) | Not modelled. |
| Footing-specific over-excavation | Bidwell Figure 4 (d + b; 2V:1H; "d or b, whichever is greater"); Midway (a 1-ft pad under footings, width plus 1 ft per ft of fill); Gallia (½ ft per ft) | Footings are not drawn in earthwork. A footing strip can be a Site Feature with an undercut and an outward slope; the cross-section geometry is only approximate. |
| Location-based trench rules | Heinsohn: clay or flowable fill, no gravel bedding, from 2 ft inside to 4 ft beyond the building (p.19) | Supported as a segment, but the user draws it. The building edge is not found automatically: 6 LF at each crossing. |
| Compaction and testing frequencies | All | Material notes only (Block 4), never in quantities. |
| A strength inversion: hard limestone over very loose sand (N 3) | Miami B-4 (p.38) | Represented as layers. Rock is vertical only where it lies under soil (Q11), so a trench into the sand below the rock uses the sand's slope. |
| Water read only at drilling, in mud-rotary holes | Miami | Entered as "while drilling"; flagged as unreliable in the report's notes. |
| A design water the report fixes itself | Miami ("a groundwater level of 6 feet", p.15) | Our rule gives 5.0. To follow the report, the estimator types a seasonal high of 6.0. |
| Logs with latitude and longitude | Gallia | Bores are placed on the plan by hand; the sheet is not georeferenced. |
| Tank pits on a gravel level-up | Bidwell (15 ft, p.6); Heinsohn (8–10 ft, p.27) | A custom rectangular structure approximates one. |

### 10.3 Which report feeds which check

| Report | Checks |
|---|---|
| Midway | 1.1–1.3, 1.7, 2g, 2h, 4d; the Utah template |
| Manila Creek | 1.7 (no water); the template's wording (p.9) |
| Plain City | 1.7 (at drilling against stabilized); 10.2 (interbeds) |
| Bidwell | 1.8 (topsoil), 2k (cave-in), 4b, 4c, 4e |
| Gallia | 4c (agents); 10.1 (no rock); 10.2 (lenses) |
| Heinsohn | 4a; 10.2 (trench zone, PVM) |
| Deland | 1.7 (design water); 10.1 (loose-based shrinkage) |
| Miami | 2j (rock below water); 10.2 (water readings, inversion) |
| Maricopa | 1.7 (published water), 2i (Type C) |

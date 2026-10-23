# Equipment Library: size-class rates, production and mob/demob behind the Equipment cost component (plan)

_Plan written 2026-10-23. The locked decisions are the brief's Step 2 and are not reopened here. **Answered by Umer on
2026-10-23 and logged as D-718 to D-729** (Q1–Q6, the spread rule, changes 1–5, the night's order and the test copy).
Built overnight 2026-10-23 → 24: progress per block in `docs/tasks/OVERNIGHT_PLAN.md`, results in
`docs/tasks/OVERNIGHT_REPORT.md`._

**What the answers changed (read these first; the sections below are updated to them):**
- **Q1 → D-718:** a saved component's money never moves: snapshot, "Library rates changed: Update", "Update all".
- **Q2 → D-719:** location factor default `1 + equipment_amf` from the wage set; 1.00 without one.
- **Q3 → D-720:** a class opens on the basis it has a rate for (only operated → Operated; only bare/owned → Bare;
  both or neither → Operated; `CR-TOWER` rental).
- **Q4 → D-721:** FEMA ⚠ loads as published, flagged. **Q5 → D-722:** Settings › Equipment library.
- **Q6 → D-723:** fuel price starts empty and blocks; one-click catalog suggestions labelled on-highway.
- **D-724, the spread:** production drives the hours (company production per day, else catalog machine production);
  hours per work day (default 8); every library machine and the labour component run the spread hours; pacing
  machine; decimal machine counts; the rental solver works in whole work days with pro-rata overtime above 8 hr/day.
- **D-725:** mob counted more than once warns. **D-726:** rule 9 in the reference and seed. **D-727:** earthwork
  production settings, tiers and the two-way production ↔ spread link (Block 3.5). **D-728:** a company's machine list
  imports with a matching step (Block 4.2). **D-729:** order 1.1 … 4.3, P1, 5.1; the test copy and coverage.

**Inputs, read in full:**
- `docs/reference/equipment/IntelCost Equipment Catalog.xlsx`, all twelve sheets, read with both formulas and cached values
  (SheetJS in the bench app container).
- `docs/reference/equipment/Construction equipment catalog and rates.md`.

This plan names no software competitor (rule 9). The design document named ten estimating products; since D-726 it
calls them product A to H, "a rate-data publisher" and "a cost-data publisher", and withholds links that name them.

**The catalog's numbers are loaded as published.** No rate is changed, researched or filled in. A blank stays blank and
shows as missing (§3.2).

---

## 0. What the catalog holds (the data to load)

| Sheet | Rows | Formulas | What it becomes |
|---|---|---|---|
| Equipment | 628 size classes in 17 categories | 1,709 | `eq_class` (one row per class). Fuel, owned ex-fuel, the interpolated owned rates and the derived week and 4-week rates are **stored** as loaded. Mob/demob is **computed** (§2.4) |
| Activities | 104: 89 Production, 12 Duration, 3 Quantity/method | 0 | `eq_activity`, the names as-is (locked) |
| Production | 592 Equip_ID × Activity_ID pairs | 1,319 (364 rows driven by a formula) | `eq_production`. Formula rows are **computed** from a method and its inputs; fixed rows are stored (§2.4) |
| Mob_Demob | 9 transport classes, plus the calculator, legal limits and delivery norms | 9 | `eq_transport_class`; the calculator becomes engine code |
| Settings | 33 assumptions | 0 | `eq_setting` (national defaults that the workspace and the estimate can override) |
| Factors | 10 sections | 0 | `eq_soil_conversion` (4 soils × 6 conversions, structured); the rest stored as reference text |
| Duration_Norms | 16 groups, 13 delay/OT classes | 0 | `eq_reference` (shown in the picker as guidance; not used in v1 math) |
| Rental_Terms | 26 terms | 0 | `eq_reference` (8/40/160 is the solver's rule) |
| Location | 3-part method, evidence, EIA diesel by region | 15 | `eq_reference`; the regional diesel table is offered as fuel-price suggestions |
| Sources | 157 source IDs | 0 | `eq_source` |
| Gaps | 23 gaps plus live counts | 7 | Not loaded. The library page computes its own live counts |
| README | legend, column dictionary, caveats | 0 | Shown on the library page's About panel |

**Facts in the data that shape the design:**
- **Missing rental rates:** 341 of 628 classes have rental confidence D, which is a blank rate. 449 have no owned rate,
  564 carry a "Needs rate" flag and 289 a "Needs fuel gal/hr" flag. Blanks are normal, not an edge case.
- **Missing production:** 228 of 592 production rows are D. The haul and scraper rows stay blank until the haul speeds in
  Settings B22–B27 are entered. The catalog leaves those speeds empty on purpose ("NOT SOURCED - enter").
- **Rate basis:** 605 rows are bare, 22 operated, and one is "unspecified" (the tower crane).
- **Cranes are split into separate rows.** Each mobile-crane size has its own operated row (`CR-HYD-40T-OP`) and, where
  published, its own bare row (`CR-RT-50T-BARE`). They are not one row with two rate sets.
- **The formulas reduce to 14 shapes in 11 calculator families** (§3.3).
- **DOT daily bands exist as numbers only on DOT-basis production rows** (their own low/typ/high). For calculated activities
  (excavator cut and load, dozer push, haul) the catalog holds no structured DOT band: it gives prose for two activities
  only. No activity has both a calculated row and a DOT row. §8 covers what that means for the guardrails.

---

## 1. Where the library plugs in (what is built, with paths)

All paths are relative to the workspace root. API = `intelcost-app-fastapi/`, APP = `intelcost-app-react/src/`.

### 1.1 Cost components

- **Table:** `takeoff_cost_component`
  - Created by `API/alembic/versions/f1b6c4d8e2a9_takeoff_cost_components.py`. The model is `TakeoffCostComponent` in
    `API/app/features/estimate/models.py:208-258`.
  - `kind` is a plain `String(16)`, checked only by Pydantic (`estimate/schemas.py:218`) and the TypeScript union
    `CostComponentKind` (`APP/lib/estimate/components.ts:15`).
  - The equipment columns are `equip_rate`, `equip_basis` (hr|day|wk|mo|each), `duration_formula` and `mob_demob`.
  - Quantity comes from `qty_formula`. There are no equipment hours and no class reference.
- **The api never computes a cost.** It stores the `total` cache the browser sends (`estimate/components.py`).
  - `add_component` :111 refuses a host that has sub-items.
  - `snapshot_first_of_kind` :159 keeps the line's typed rates in `manual_rates_snapshot`.
  - `remove_component` :187 asks keep / restore / clear.
- **The math is in the browser:** `APP/lib/estimate/components.ts`, `evaluate` :167.
  - The equipment case (:184-192) is `equip_rate × duration + mob_demob`, or `rate × qty` for `each`.
  - A formula error carries the last good total (`errored` :155).
  - `APP/lib/estimate/costing.ts` then applies it: `applyComponents` :223 and `addSharedEquipment` :210.
- **The UI:** `APP/features/estimate/ComponentDialog.tsx` (equipment block :246-280: Rate, Per, Duration formula,
  Mob/demob), opened by `useComponentEditor.tsx:171`.
  - From Estimating's "Add cost component ▸" (`EstimatingView.tsx:2147`).
  - From the Takeoff row menus (`ProjectTakeoff.tsx:3658`, `:6026`, `:6105`, `:9866`).
  - From the sub-item button (`features/takeoff/components/ItemRow.tsx:726`).
- **Where the library plugs in:**
  - New nullable `eq_*` columns on `takeoff_cost_component`.
  - A new branch in `evaluate` for components with a class.
  - A picker step at the top of `ComponentDialog`'s equipment block.
  - A component without a class is today's hand-entered component and keeps today's path exactly (§8).

### 1.2 Shared equipment resources

- **Tables:** `project_equipment_resource` and `project_equipment_usage`.
  - Migration `API/alembic/versions/b7d3f1a5c9e2_project_shared_equipment.py`; models at `estimate/models.py:287-354`.
  - Resource columns: name (unique per project, ignoring case and spaces), `home_classification_id`,
    `extra_classification_uuids`, optional `subcontractor_id`, `rate`, `basis` (hr|day|wk|mo), `hours_per_day`,
    `days_per_week`, `weeks_per_month`, `rental_duration_override`, `mob_demob`, `allocation_basis`
    (usage_hours|quantity|manual_pct).
- **"One per division" is not a constraint.** A resource has one home division plus optional extra divisions.
- **The allocation is in the browser** (D-93): `APP/lib/estimate/equipmentAllocation.ts` (`allocateResource` :101).
  - Total = rate × rental + mob/demob, counted once.
  - The rental is the override, or ceil(Σusage ÷ hours per basis).
  - Each item's share is spread by usage, quantity or manual %, rounded to the cent by largest remainder.
  - Unallocated = total − Σ shares.
  - Membership and usage come from `APP/lib/estimate/sharedEquipment.ts` (`computeSharedEquipment` :95, `resolveUsage`
    :81). Usage is the override, else the host's labour crew-hours, else the formula.
- **Unallocated rows:** `APP/lib/estimate/lines.ts` (~600-635), filed under the machine's home classification (D-93).
- **UI:** `APP/features/estimate/EquipmentDialog.tsx`, rendered at `EstimatingView.tsx:2975`. `days_per_week` and
  `weeks_per_month` have no field in it (defaults only, :48-49).
- **Where the library plugs in:**
  - New nullable `eq_*` columns on the resource.
  - The library engine gives the resource its total: the work-day period solver over Σusage ÷ hours per work day
    (D-724), fuel over Σusage, mob/demob from the transport class × the resource's machine count.
  - **A host's usage on a library resource is its machine-hours** (D-724 rule 8): the count on the host's linked
    component × its spread hours, or its own production hours. The usage override stays. Hosts on a hand-entered
    resource keep today's order (override, crew-hours, formula), unchanged.
  - `allocateResource` then spreads that total unchanged. Mob/demob stays counted once.
  - **Mob counted twice warns** (D-725): one library class with mob included as a standalone component on more than one
    item of a division shows "Mob/demob counted N times — price as one shared machine?" on each.

### 1.3 Assemblies

- **Tables:** `assembly_template`, `assembly_child` and `assembly_component`.
  - Migrations: `API/alembic/versions/d2b8e4f73a91_assembly_library.py`, `d4f7b2a95e13_assembly_component.py`.
  - Models: `API/app/features/assembly/models.py:31`, `:75`, `:98-138`.
  - Copied fields are listed in `COMPONENT_COPY_FIELDS` :143.
- **Saving an item into an assembly:** `POST /from-item` (`assembly/routes.py:344`), components copied at :439-457. A
  labour crew is reduced to its makeup.
- **Applying an assembly:** `POST /{uuid}/apply` :825, then `_copy_host_components` :145. That runs
  `snapshot_first_of_kind` and prices labour at the project's saved rates (D-298).
- **Prerequisite gap: shared equipment is not linked to assemblies anywhere.** D-93 ends with "Not yet: assemblies' pending
  equipment links". No resource or usage is copied on save or apply. The only copy is in project duplicate
  (`API/app/features/project/duplicate.py:104`, `:139`, `:577`). This is Block P1.

### 1.4 Wage Calculator, Crews and location

- **Project location:** `project.city`, `state`, `postal_code`, `county`, `country` (`API/app/features/project/models.py:123-129`).
- **Saved wage set:** `project_wage_set` (`API/app/features/wage_calculator/models.py:113`), one current set per project.
  - It holds `zip`, `county_fips`, `state` and `location_set`.
  - **It also holds `equipment_amf` (`:142-144`), next to `labor_amf` and `material_amf`.**
- **An equipment location factor already exists, and nothing uses it.**
  - Global tables `refdata.ref_amf_zip` and `ref_amf_county` carry material, labor, equipment and total as fractions, by
    edition. They are loaded from `API/docs/wage-calculator/seed/ref_amf_*.csv`.
  - The county equipment column runs **−0.05 to +0.06** (factor 0.95–1.06), inside the catalog's 0.85–1.15 band.
  - `location_factors()` (`API/app/wagecalc/geo.py:58`) returns it.
  - `service.py:748-750` snapshots it on the wage set.
  - Only the labour factor is applied (`API/app/wagecalc/rates.py:242`). No estimate code in the api or the app reads
    `equipment_amf`.
  - The Wage Calculator spec already promises it: "Material and equipment apply to material and equipment costs in the
    estimate" (`API/docs/wage-calculator/spec.md:197`).
  - With no ZIP, every factor is 0 (`rates.py:236-241`).
- **Fuel price:** none, anywhere.
- **Project settings:** typed columns on `project` (`project/models.py:114-194`). The default-plus-override pattern for
  numbers is `estimate_bid_rates` (`estimate/models.py:357-395`): `project_id` NULL is the workspace default.
- **How labour gets its rate:**
  - A crew row has `craft_code` and `rate_source` "wage_set" (`estimate/schemas.py:187-200`).
  - `wage_calculator/labor.py` `follow()` :42 refreshes the wages, and `update_following()` :107 re-totals them when a new
    set is saved.
  - Crews UI: `APP/pages/SettingsCrews.tsx`, which wraps `APP/features/wage-calculator/CrewSettings.tsx`.
- **Where the library plugs in:**
  - The equipment location factor defaults from `1 + project_wage_set.equipment_amf` (Q2).
  - The operator is a labour crew row at the saved wage set. The library only suggests the craft.
  - The fuel price and haul distance are new estimate settings.

### 1.5 Estimating Excel export and the cost-type filter

- **Export: browser only, with `xlsx-js-style`** (`APP/lib/estimate/workbook.ts`: `buildWorkbook` :346, Bid Summary
  `appendBidSheet` :401, live formulas `APP/lib/estimate/exportFormulas.ts`), driven by `runExport` in
  `EstimatingView.tsx:2021-2108`.
  - `detailsOf` :1922 writes one display-only row per component, plus "Shared — machine" rows, for the items expanded on
    screen.
  - Unallocated rows go on the first sheet (:2004).
- **Filter:** `CostFilter` (`APP/features/estimate/reports.ts:6`): all | labor | material | equipment | subcontract |
  quantities.
  - `TYPE_COLUMNS` :163, `hiddenByFilter` :170, `reportKeeps` :174 and `projectCost` :407 in `EstimatingView.tsx`.
  - Shared rows show only under all or equipment (:1946, :2468).
  - The picker is in `EstimateSidebar.tsx:26-29`.
- **Where the library plugs in:**
  - Library components are still `kind = "equipment"`, so the filter and the type columns need no change.
  - The export gains the basis columns on equipment detail rows, an "Equipment basis" sheet and the missing-data banner.
  - Needs attention (D-127, `EstimatingView.tsx:1263`) gains the missing-data reasons.

### 1.6 How the classification template is seeded and "upgraded"

- **Seed files:** `API/app/features/classification/templates/{csi,uniformat,nrm1,nrm2,cesmm}-default-v1.txt`, parsed by
  `classification/templates.py` (`TEMPLATE_VERSION = 1` at :15).
- **Seeded on first use:** `ensure_seeded()` (`classification/service.py:84`) claims a `workspace_classification_seed` row
  (`models.py:62-71`; the system plus `template_version`) and copies the tree into the workspace (D-58).
- **There is no upgrade mechanism.** `template_version` is written and never read. A seeded system is "never seeded again"
  (`service.py:85-86`). The one upgrade so far was a hand-written migration that inserted two nodes into every seeded tree
  where the code was free (`API/alembic/versions/5b2e8c41f0a9_earthwork_lines_f12_block_f.py:30-49`).
- **The pattern that does fit Step 3 is the wage calculator's `refdata` schema.**
  - The data is global and keyed by `edition_id`.
  - It ships as data migrations from CSV, and the seed CSV is never edited (`d669a2c5e8f1_commercial_tile_crafts.py`).
  - Workspace changes live in separate `workspace_crew_*` tables.
  - The Starter Pack (`assembly_template.workspace_id` NULL) is the same idea for assemblies.
- **Consequence:** "upgrade the same way as the classification template" cannot be copied, because that mechanism does not
  exist. The library gets its own release mechanism (§2.3).
  - The national rows are global and read-only.
  - Workspace and estimate values are sparse override rows on top.
  - An upgrade ships as a data migration, so it reaches every workspace at once and cannot overwrite a user value.
  - This is what Step 3 asks for, and it is how `refdata` already works.

### 1.7 Prerequisite gaps

| # | Gap | Where it is handled |
|---|---|---|
| G1 | Assemblies do not link shared equipment (D-93 "Not yet") | **Block P1** |
| G2 | No template upgrade mechanism to copy | The library's own release table (Block 1.1), not retrofitted to classification |
| G3 | `equipment_amf` is captured and unused | Block 2.1 reads it (Q2) |
| G4 | No fuel price and no haul distance anywhere | Estimate settings in the override layer (Block 2.1) |
| G5 | No Excel import anywhere in either repo | Block 4.2: the browser reads the file with `xlsx-js-style`, the api validates |
| G6 | No "Lists" and no library page (F10's Library page is parked, D-287 6) | The library page is self-contained under Settings for now (Q5) |
| G7 | The api never computes cost (D-89) | The engine is pure TypeScript in `APP/lib/estimate/equipment/`; the api validates and stores |
| G8 | Shared resource `days_per_week` / `weeks_per_month` have no UI | Not needed: a library resource uses work days (D-724). Left as is |

### 1.8 Earthwork Calculate's lines (change 4, Step A; read from the code, 2026-10-23)

- **Built in the browser, written by the api.**
  - Grading lines come from `earthworkLines()` (`APP/lib/takeoff/earthwork/lines.ts:294`, roles typed `LineRole` :27-57).
  - Utility lines come from `utilityLines()` / `structureLines()` (`APP/lib/takeoff/earthwork/utilities/lines.ts:88`,
    `:181`), joined by `toWrite()` (`APP/features/takeoff/earthwork/linesFor.ts:83`).
  - They are sent from `useVolumes.tsx:477-483` (sheet), `:515` (utilities) and `site/SiteView.tsx:899` (site).
  - The api's `write_lines()` (`API/app/features/earthwork/lines.py:275`) is called by `routes.py:316` (PUT
    `/result/{sheet}`) and `site_routes.py:640`. The roles allowed are the `LineRole` literal in
    `API/app/features/earthwork/schemas.py:75-129`.
- **Every line is a `takeoff_item`** with `source_type = EARTHWORK_COMPUTED` (`API/app/features/takeoff/models.py:55`).
  - It is keyed by (`earthwork_region_id`, `earthwork_role`, `earthwork_variant`), unique per sheet or per site
    (`models.py:153-171`).
  - `earthwork_region_id` is the strip area, the Site Feature item, the region, `__soil_export__` / `__soil_import__`,
    or `util:<type>`. A soil layer appears only in the variant (`layer:<id>`).
- **The line roles and their units** (`lines.ts`):

| Role | Unit | | Role | Unit |
|---|---|---|---|---|
| `strip` (by strip area) | BCY | | `cut` (net of rock) | BCY |
| `strip_haul`, `strip_stockpile` | LCY | | `rock_hard_dig` (variant `site:<layer>`) | BCY |
| `strip_reuse_topsoil` | BCY | | `fill` | CCY |
| `strip_reuse_fill` | CCY | | `soil_export` (plus rock / unsuitable variants) | LCY |
| `undercut` | BCY | | `soil_import` | LCY |
| `undercut_haul`, `undercut_stockpile` | LCY | | `prep` (subgrade prep / compact / scarify) | SF |
| `undercut_reuse_fill` | CCY | | `stabilize` (parent), `stabilize_mix` | SY |
| `undercut_replace` | CCY | | `stabilize_agent_1/2` | TON |
| `undercut_native` (recompacted) | CY | | `geosynthetics` (geogrid / geotextile) | SY |
| `undercut_stabilize` (parent), `undercut_stabilize_mix` | CY | | `over_excavation` (variant `layer:<id>`) | BCY |
| `undercut_agent_1/2` | TON | | `replacement_fill` | CCY |

  - **Utilities:** `utility_pipe` (LF), `utility_trench_excavation` (BCY; structure excavation is this role with
    `structure:<layer>`), `rock_hard_dig` (BCY or LF), `utility_bedding_pipe_zone` (CCY), `utility_backfill` (CCY),
    `trench_protection` (LF), `dewatering` (LF; EA for structures), `surface_restoration` (SY), `spoils_export` (LCY),
    `utility_structure` (EA or VF).
- **The founder's list, against the code.**
  - **Matches the code:**
    - Strip Topsoil by strip area (BCY);
    - Haul Off, loose (LCY);
    - Undercut Excavation (BCY);
    - Undercut Spoil → Haul Off (LCY);
    - native undercut recompacted (CY);
    - Undercut Replacement Fill (CCY);
    - stabilization in SY, with sub-items mix (SY) and agents (TON).
  - **"→ Re-use" is not LCY in the code:** `strip_reuse_topsoil` is BCY and `strip_reuse_fill` is CCY. The code has
    both units; this is recorded as a finding, nothing is changed.
  - **The code also has:** cut, fill, soil export, soil import, rock hard dig, over-excavation, replacement fill, prep,
    geosynthetics, stockpile, and the utility roles.
- **Recalculation updates lines in place** (`write_lines`, `lines.py:386-498`).
  - Matched rows keep their uuid and take the new quantity.
  - New keys get new rows.
  - A key no longer produced is deleted, **unless the row is worth keeping** (`_worth_keeping` :140-176: an override,
    notes, any cost component, or a priced line). A kept row is set to quantity 0 with `earthwork_retired`, shown as
    "Not in the last Calculate".
- **So components survive a recalculation** without new matching. The cascade from `takeoff_cost_component` and
  `project_equipment_usage` (`API/app/features/estimate/models.py:220`, `:340`) never fires on a priced line.
- **Stale:** the browser compares the stored `version_key` (`useVolumes.tsx:185-188`), then `mark_stale()`
  (`lines.py:723`) sets `is_stale`. Estimating shows "Needs recalculating" (`EstimatingView.tsx:1258`).
- **Where components can go:**
  - Components may sit on any line except the two stabilization parents, which have sub-items (`NOT_A_HOST`,
    `API/app/features/estimate/components.py:119`). Their components go on `*_mix` and `*_agent_*`.
  - A line's quantity is the Calculate's quantity: the override is refused by `guard_calculated`
    (`API/app/features/takeoff/service.py:1376`). So a component's `QTY` is the line's `effective_quantity`.
- **Where Block 3.5 attaches:** after a line write, the browser receives the written rows' keys (`Written(created, …)`,
  `lines.py:523`). For each created or updated line whose role maps to a company activity, it attaches or retiers the
  spread (D-727).

---

## 2. Data model

### 2.1 Three layers, most specific wins

```
eq_* national rows (global, read-only, versioned by release)
   ↑ overridden by
eq_override  scope = 'workspace'  (company rates)
   ↑ overridden by
eq_override  scope = 'project'    (this estimate only; an estimate is the project's Estimating tab)
```

- A value resolves field by field. A project override wins over a workspace override, which wins over the national value.
- Custom rows that users add (equipment, size classes, activities, production) sit in workspace tables with the same
  columns. They join the national rows in every list and can be overridden per project like any other row.

### 2.2 Tables (api, new feature package `API/app/features/equipment/`)

**National (global schema `eqlib`, beside `refdata`; no workspace column):**

| Table | Key | Main columns |
|---|---|---|
| `eqlib.release` | `id` (int, 1, 2, …) | `title`, `released_at`, `source_file`, `source_sha256`, `row_counts` JSONB, `notes` |
| `eqlib.eq_class` | `equip_key` (the catalog's Equip_ID; stable and never reused, per README) | `category`, `type`, `sub_type`, `size_class`, `sort`, `defining_spec`, `spec_value`, `spec_unit`, `example_models`, `operating_weight_lb`, `net_hp`, `capacity`, `platform_height_ft`, `fuel_type`, `operator_craft_label`, `default_billing_basis` (text as loaded), `rent_day`, `rent_week`, `rent_4wk`, `rent_low_4wk`, `rent_high_4wk`, `rent_basis` (bare / operated / unspecified, as loaded), `default_mode` (rental / owned / operated, by the load rule in §2.5), `rent_hr_operated`, `operated_min_hr`, `rent_source_ids`, `rent_date`, `rent_confidence`, `fema_code`, `owned_rate_hr_incl_fuel`, `owned_rate_year`, `fuel_gph_low/med/high`, `fuel_source`, `owned_rate_hr_excl_fuel`, `owned_confidence`, `owned_excl_fuel_confidence`, `standby_rule`, `transport_class`, `transport_weight_lb`, `transport_width_ft`, `permit_likely`, `notes`, `flags`, `pricing_kind` (production / duration, from its activities), `release_id` (the release that last changed the row), `retired_in` (null while live) |
| `eqlib.eq_activity` | `activity_key` | `group`, `name` (as-is, locked), `output_unit`, `norm_basis`, `method_text`, `required_inputs`, `source_ids`, `activity_type` (Production / Duration / Quantity/method), `release_id` |
| `eqlib.eq_production` | (`equip_key`, `activity_key`) | `input_capacity`, `input_unit`, `method_id` (one of §3.3's families, or `fixed`), `method_params` JSONB (the constants read out of the formula), `prod_low/typ/high` (the catalog's cached values, kept for display and the check), `unit`, `basis`, `default_conditions`, `calc_shown`, `source_ids`, `confidence` (as loaded; recomputed when inputs change, §3.3), `flags`, `release_id` |
| `eqlib.eq_transport_class` | `transport_class` | `typical_equipment`, `per_mile_low/typ/high`, `min_low/typ/high`, `permit_per_state`, `permit_range_text`, `escort_per_mile`, `escorts_default`, `load_unload_hr`, `load_unload_rate`, `basis_text`, `confidence`, `release_id` |
| `eqlib.eq_setting` | `key` | `value` (numeric, nullable), `unit`, `label`, `note`, `editable` (bool), `release_id`. The 33 Settings rows: fuel diesel, back-out diesel, mob distance, efficiency, location factor, gasoline, fuel factors, load factors, multipliers, demob factor, permit states, haul speeds (blank), dozing speeds, compressor fractions, scraper and loading constants |
| `eqlib.eq_soil_conversion` | `soil` | `bank_loose`, `bank_compacted`, `loose_bank`, `loose_compacted`, `compacted_bank`, `compacted_loose`, `swell_pct`, `source_ids` (Factors §1, four soils) |
| `eqlib.eq_reference` | (`sheet`, `row`) | `cells` JSONB. Duration_Norms, Rental_Terms, Factors §1b–10, Location, Mob_Demob limits and delivery norms, README, kept as text for the picker's guidance and the About panel |
| `eqlib.eq_source` | `source_id` | `title`, `publisher`, `edition`, `url`, `supports` |
| `eqlib.eq_change` | `id` | `release_id`, `entity`, `entity_key`, `field`, `old_value`, `new_value`. Written by each release migration. Drives the "national value changed under your override" notice |

**Workspace and project (ordinary tables with the workspace mixin):**

| Table | Key | Columns |
|---|---|---|
| `eq_override` | `id`; unique (`workspace_id`, `project_id`, `entity`, `entity_key`, `field`) with `project_id` NULLs equal | `scope` (workspace / project), `project_id` (null for workspace), `entity` (class / production / activity / transport / setting), `entity_key`, `field`, `value_num`, `value_text`, `confirmed_none` (bool: the user confirmed "none / not applicable", §3.2), `national_at_set` (the national value when the override was made), `release_at_set`, `note`, `set_by_id`, `set_at`, `updated_by_id`, `updated_at` |
| `eq_custom_class` | `id`; `equip_key` = `U-` + short id, unique per workspace | the same columns as `eq_class`, plus `created_by_id` and `created_at` |
| `eq_custom_activity` | `id`; `activity_key` = `U-…` | the same columns as `eq_activity` |
| `eq_custom_production` | `id`; (`equip_key`, `activity_key`), each national or custom | the same columns as `eq_production`; a custom row is `method_id = fixed` |
| `eq_release_seen` | (`workspace_id`) | `release_id`, `seen_by_id`, `seen_at` (dismisses the workspace's upgrade notice) |

**Audit:** every override and custom-row write also goes through the existing audit feature (`API/app/features/audit/`), the
same way pricing writes do. `set_by_id` and `set_at` give "Source = User, who, when" without a join.

**What is not copied into the workspace:** the national rows. A workspace with no overrides reads release N directly, so
an upgrade reaches it immediately, with nothing to merge.

### 2.3 Releases and upgrades

- **Release 1** is the catalog as received, loaded by one data migration from CSVs committed under
  `API/app/features/equipment/seed/release_1/`.
- **Release N+1** is a new migration with its own CSVs. It updates changed national rows in place, inserts new keys, sets
  `retired_in` on removed keys (never deletes them) and writes every changed field to `eq_change`.
- **An upgrade never touches `eq_override` or the custom tables.** A user value cannot be overwritten, because it is not
  stored in the rows the release writes.
- **The notice:** when `eq_change` holds a field for which a workspace or project override exists, and that override's
  `national_at_set` differs from the new national value, the library page and the project show "The national value under
  your override changed: was X, now Y." The actions are keep mine, use national, and dismiss.
- **Existing components:** how they react to a release is Q1. The recommended answer is snapshot plus a notice.
- **A retired class** keeps resolving for components that already use it, labelled "Retired in release N". The picker no
  longer offers it.

### 2.4 Stored values and computed values (how the formulas land)

| Catalog formula | Count | Stored or computed | Why |
|---|---|---|---|
| Equipment `Fuel_gal_hr_low/med/high` from Net_HP × 0.0486 × load factor | 84 rows | **Stored** as loaded, with `fuel_source` "Derived (C)" | National derivation; its inputs are national constants. A user changes the gal/hr itself |
| `Owned_rate_hr_excl_fuel` = incl-fuel − gal/hr med × $3.66 | 175 | **Stored** | National back-out at the 2025 diesel price; not a project knob |
| `Owned_rate_hr_incl_fuel` interpolated by HP | 15 | **Stored**, confidence C as loaded | National derivation |
| `Rent_week` / `Rent_4wk` from day × 3.0 / 2.9, and one `Rent_day` | 5 / 5 / 1 | **Stored**, confidence as loaded | National derivation |
| `Default_mob_one_way` / `Default_demob_one_way` | 628 / 628 | **Computed** by the engine from the transport class × the project's haul distance. The catalog's 50-mile values are kept only to check the engine | Distance is a project input |
| Production `Prod_low/typ/high` formula cells | 311 / 364 / 290 | **Computed** by the engine from `method_id`, `method_params`, `input_capacity` and the resolved settings (efficiency, speeds, constants). Cached values stored for display and the check | Efficiency, capacity and speeds are user-editable at every level |
| Production `Confidence` = IF(typ = "", "D", "C") | 354 | **Computed** from whether the typical value resolves | Follows the inputs |
| Mob_Demob calculator | 9 | Becomes the engine's mob function | |
| Location and Gaps formulas | 15 / 7 | Not loaded (evidence and counts) | |

**The converter.** `API/app/features/equipment/seed/convert.py` is a one-off tool with openpyxl as a dev-only dependency.
- It reads the workbook twice, once with formulas and once with values.
- It writes the CSVs, including each production row's `method_id` and `method_params`, which it parses from the formula by
  family.
- It fails if a formula does not match one of the 14 shapes.
- The CSVs are committed. The migration reads only the CSVs, so no spreadsheet library is needed at runtime.

**The check that proves the load:** the shared quantity table (§7, every block from 1.2 on) recomputes every formula-driven
value from the stored inputs at release 1's settings. That is all 965 production cells and the 628 mob and demob pairs at
50 mi. Each must equal the catalog's cached value: to 1e-9 for production, and exactly after `ROUND(…, 0)` for mob.

### 2.5 Load rules (none changes a number)

1. **A blank stays NULL.** The converter never writes 0 for a blank. An explicit 0 in the catalog (for example
   `AW-TB-60E` fuel 0/0/0, electric) is loaded as 0.
2. **IDs are loaded unchanged**, including the lowercase `x` and `_` the README mentions.
3. **`default_mode`** is the per-row default rate basis (D-720), read from the rates a row can actually price with:
   rental (any of day / week / 4-week), owned (`owned_rate_hr_excl_fuel`; the fuel-included rate alone cannot price)
   and operated (`rent_hr_operated`).
   - only operated → `operated`;
   - only rental and/or owned → `rental` if it has a rental rate, else `owned`. This covers `CR-RT-*-BARE`,
     `DT-ROAD-*` and the crawler cranes with owned rates only;
   - both → `operated`;
   - neither → `operated` for a type the catalog sells operated (a type with at least one operated row: mobile cranes,
     boom trucks, concrete pumps, on-road dump trucks; for example `CR-AT-35T`, `CR-AT-60T`, `CN-PUMP-BOOM-63M`), else
     `rental` (shows "No data"). That scope is a decision taken overnight;
   - **`CR-TOWER` is `rental`**: bare plus its own operator (locked).
4. **Flags and FEMA ⚠ are loaded as text and shown.** How to treat ⚠ values is Q4.
5. **`pricing_kind`** is `production` if any of the class's activities is a Production activity with a production row,
   else `duration`. Lifts, cranes and support equipment come out as duration (locked).

### 2.6 New columns on existing tables (all nullable; nothing existing changes meaning)

**`takeoff_cost_component`** (and the same set on `assembly_component`):

| Column | Type | Meaning |
|---|---|---|
| `eq_class_key` | text | The library class. NULL = hand-entered component (today's path) |
| `eq_activity_key` | text | The activity served (production classes) |
| `eq_mode` | rental / owned / operated | Rate basis on this component (default from the class's `default_mode`) |
| `eq_period` | auto / day / wk / 4wk / hr | `auto` = cheapest combination (§3.4); `hr` only for owned and operated |
| `eq_units` | numeric > 0 (null = 1) | Number of machines; decimals allowed (0.25, 0.5, 2). Cost = count × one machine's cost (D-724 rule 5) |
| `eq_in_spread` | bool (null = true) | false = "Own production": the machine prices from its own catalog production, outside the spread |
| `eq_paces` | bool | The pacing machine of the item's spread (at most one; default the first production machine added) |
| `eq_hours_source` | spread / activity / crew / formula / manual | Where operating hours come from. `spread` on a spread item (D-724); `activity` = own production; `crew` = the host's crew-hours (duration equipment off a spread) |
| `eq_hours_formula` | text | Used when the source is `formula` (the existing formula engine, `QTY` in scope) |
| `eq_hours_manual` | numeric | Used when the source is `manual` |
| `eq_auto` | bool | Attached by an earthwork production tier (D-727); a user edit clears it |
| `eq_fuel_load` | low / med / high | Default `med` (catalog README: "Fuel_gal_hr_med (low/high by duty)") |
| `eq_soil` | text | Soil for unit conversion (default `Loam (common earth)`; the catalog's default mapping) |
| `eq_travel_hr` | numeric | Operated only: portal-to-portal travel hours (a job input, see §3.2) |
| `eq_include_mob` | bool | Standalone components only (default true). A component linked to a shared resource never carries mob |
| `eq_snapshot` | JSONB | The resolved inputs at last evaluation: each value, its source (national r1 / workspace / project / user), grade, and the release |

**Labour components** (`kind = labor`, same table): `spread_linked` bool (null = linked whenever the item has a spread;
false = "Unlink from spread", its own production rate back). Crew rows (JSONB) gain `paces` (a crew row that paces
production on a crew-only item) and `for_equipment` (the uuid of the machine component whose count an operator row
follows); both are optional and absent on every existing row. Crew counts may be decimal.

**`project_equipment_resource`:** `eq_class_key`, `eq_units`, `eq_mode`, `eq_period`, `eq_fuel_load`, `eq_travel_hr`,
`eq_snapshot`.
- When `eq_class_key` is set, the resource's `rate`, `basis` and `mob_demob` are filled from the engine and greyed.
- `rental_duration_override` keeps working as today.
- A host links to it through its machine component: `takeoff_cost_component.eq_resource_id` (nullable FK, SET NULL). A
  linked component carries no rental or mob of its own; its machine-hours are its usage on the resource.

**`assembly_component`:** the same `eq_*` set, including `eq_units`, `eq_in_spread`, `eq_paces`. **New
`assembly_equipment_link`** (Block P1): `template_id`, `child_id` (null means the host), `resource_name`,
`usage_formula`, `eq_class_key` (optional).

### 2.7 The spread and earthwork production (D-724, D-727)

| Table | Key | Columns |
|---|---|---|
| `estimate_item_spread` | `takeoff_item_id` (unique, CASCADE) | `project_id`, `prod_per_day` (numeric, null = catalog path), `prod_unit`, `company_activity_id` (null), `tier_id` (null), `user_edited` (bool), `note` (the last automatic change, shown on the line), `updated_by_id`, `updated_at` |
| `eq_company_activity` | `id`, workspace | `name`, `unit` (BCY, LCY, CCY, CY, SY, SF, LF, TON, EA), `soil` (for conversions), `position` |
| `eq_activity_line_map` | (`workspace_id`, `project_id` null = workspace default, `earthwork_role`) | `company_activity_id` (null = no automatic pricing) |
| `eq_production_tier` | `id` | `company_activity_id`, `from_per_day`, `to_per_day` (null = open-ended), `position` |
| `eq_tier_machine` | `id` | `tier_id`, `eq_class_key`, `units` (decimal), `paces`, `mode` (null = the class default), `position` |
| `eq_tier_crew` | `tier_id` | `crew` JSONB: makeup rows (role, count, craft_code, crew_code; no wages), priced at the project's saved wage set when attached (D-298) |
| `eq_default_production` | `id` | `company_activity_id`, `qty_from` (null = 0), `qty_to` (null = open), `prod_per_day` |

- **Settings:** "hours per work day" (`eq_setting` key `hours_per_work_day`, default 8; workspace and project overrides)
  and "earthwork production" on or off (project override, default on). These are the founder's defaults, not catalog
  values.
- **Ships empty** (D-727): no activity, tier or default row is seeded. The night's checks use rows named "TEST …".

**No CSI or classification codes in any of these tables.**
- A component inherits its host item's classification.
- A shared resource keeps `home_classification_id` (a workspace node id, any system).
- The library's Category and Type are equipment taxonomy, not cost classifications.

---

## 3. Calculation rules

### 3.1 The order (pure functions in `APP/lib/estimate/equipment/`)

```
resolve(values: national → workspace → project)            resolve.ts
  ↓
missing check (blocking vs advisory, §3.2)                 missing.ts
  ↓
0. the item's spread (D-724)                               spread.ts
     company production P per work day set (tier or typed):  days = Q (in P's unit) ÷ P
     else catalog:  hours = Q (machine unit) ÷ (pacing units × pacing machine production per hour),
                    days = hours ÷ hours per work day        (a DOT-basis per-day rate: days = Q ÷ (units × rate))
     spread hours S = days × hours per work day; no production machine and no company production = no spread
  ↓
1. operating hours H per machine                             hours.ts
     spread:    S (every library machine in the spread; duration equipment on a spread item)
     activity:  "Own production": Q → machine unit (soil matrix) ÷ (units × production per hour)
     crew:      the host's labour crew-hours (duration equipment on an item with no spread)
     formula / manual
     the labour component, linked: crew-hours = S; unlinked or no spread: its own production rate, as today
  ↓
2. rate basis, for one machine
     rental:    work-day solver over ⌈days⌉ (day, 5-day week, 20-day 4-week) + overtime  periods.ts
                overtime hours = max(0, H − 8 × billed days) at the periods' hourly equivalent
     owned:     owned ex-fuel $/hr × H
     operated:  max(H + travel, minimum hours) × operated $/hr
  ↓
3. × equipment location factor   (rental and owned only; never fuel, operator, haul or an operated rate)
  ↓
4. + fuel = gal/hr[load] × H × fuel price[fuel type]       (rental and owned only; operated includes fuel)
  ↓
5. operator: never added here; bare and owned prompt for a labour crew row; operated suppresses it
  ↓
6. + mob/demob, standalone only: one-way(class, miles) × (1 + demob factor)      mob.ts
     linked to a shared resource: mob sits on the resource, counted once, spread by the existing allocation
  ↓
7. × number of machines (`eq_units`), then total (the `total` cache; NULL when a blocking value is missing)
```

- **Operator rows** follow the machine count (`for_equipment`) for classes that need an operator (not operated
  services, not "Trade using it", not "None"). Their crew-hours are the spread hours like the rest of the crew.
- **The pacing machine** is the component with `eq_paces`; with none marked, the first production machine added. A crew
  row with `paces` sets the pace on a crew-only item. Its count is what scales production on the earthwork link (D-727).

- **Purity:** `APP/lib/estimate/equipment/` takes data in and returns data out, with no React and no network, as hard rule 2
  asks of `lib/takeoff`. Block 2.1 adds the folder to the quantity table's purity grep.
- **No Python twin** for now (D-89). The api validates and stores, as it does for every other cost.

### 3.2 Blanks are never zero

- **Blocking blanks** are any value that multiplies into money on the chosen path:
  - rental: the period rates the solver can use (all three blank blocks; one blank is advisory, see below);
  - owned: the owned ex-fuel rate;
  - operated: the operated rate;
  - fuel: gal/hr at the chosen load, when the fuel type burns fuel (not none, electric, solar, attachment, towed or air);
  - fuel: the fuel price for that fuel type;
  - production: the rate, when the hours source is `activity` (this includes haul rows with blank speeds);
  - mob: the transport-class figures, when mob is included.
- **What the user sees for a blocking blank:**
  - The field shows "No data, enter a value".
  - The component's total is NULL and shows "—", never $0.00.
  - The line carries a red "Missing data" flag with the field names.
  - Needs attention lists it.
  - Every group total and the Bid total that includes such a line shows "incomplete (N lines missing data)".
  - The export writes "MISSING: field" in the component row and a banner on the sheet (§5c).
- **"Confirm none":** a blank can also be confirmed as none (for example a self-propelled mob or an electric unit's fuel).
  That writes an override with `confirmed_none = true`, tagged User with who and when. It is never implied.
- **Advisory blanks** warn but price:
  - a missing minimum (for example the operated dump trucks, whose minimum is blank in the catalog);
  - one missing rental period (the solver uses the rest and says so);
  - a missing range;
  - load/unload hours, which the catalog itself excludes ("NOT SOURCED (blank = 0 in formulas)"; shown as "Load/unload
    not included");
  - travel hours on an operated service (a job input, shown as "Travel not added").
- **The transport classes with no figures** are `self-propelled` (catalog: "Mob = travel hours × (unit rate + operator);
  not computed here") and `crane-assembled` ("Quote only"). When mob is included, both are blocking blanks: "Enter a quote
  or confirm none".

### 3.3 Production: 11 calculator families from 14 formula shapes

| Family (`method_id`) | Rows | The catalog's formula (typical) |
|---|---|---|
| `dozer_cycle` | 56 | blade LCY × 60 ÷ (fixed + D ÷ (fwd mph × 88) + D ÷ (rev mph × 88)) × E × material × operator (low × 0.80; high slot × 1.20) |
| `dozer_cycle_gear` | 9 | as above with the machine's published gear speeds (D9–D11) |
| `clearing_hr_per_acre` | 6 | 1 ÷ hours per acre (handbook) |
| `excavator_cycle` | 90 | 3600 ÷ cycle s (14 below 1 CY, else 15) × bucket × fill × E × L→B × confinement |
| `bucket_pass` | 68 | capacity × fill ÷ cycle × E (loaders, backfill, stockpile) |
| `scraper_cycle_payload` / `scraper_cycle` | 15 / 6 | min(volume, payload limit) × E ÷ (fixed + haul ÷ speed + return ÷ speed) |
| `grader_fine` / `grader_rough` | 10 / 10 | speed × (blade × cos(angle) − overlap) × 5280 × E ÷ passes |
| `haul_cycle` | 49 | capacity × 60 × E ÷ (load + dump + d ÷ v_loaded + d ÷ v_empty) × L→B (BCY/hr per truck) |
| `compact_hand` | 4 | the catalog's hand-compactor constant × E |
| `compact_16_3` | 26 | 16.3 × W × S × L × E ÷ P |
| `hma_roller`, `mill` | 11 / 4 | as in the catalog |

- **Fixed rows** (`method_id = fixed`: DOT medians, practitioner ranges, handbook values) are stored values.
- **Recomputation:** when the user changes the efficiency (Settings B7), a haul speed, the capacity or a family constant at
  any level, the affected production values are recomputed and their grade becomes C. A value the user types directly is
  graded **U** (User).
- **Units:**
  - **Native units stay native:** LCY, BCY, CCY, SY, LF, acre.
  - A takeoff quantity in another unit is converted through `eq_soil_conversion` for the component's soil.
  - Example: a Fill quantity in CCY against a backfill rate in LCY/hr uses compacted → loose (Loam 1.39).
  - Units that cannot be converted (LF/day against a CY quantity) block, with "Units do not convert: choose another
    activity or enter hours".
- **DOT-basis rows** are rates per crew day: days = qty ÷ rate, and H = days × hours per day (8, Rental_Terms).
- **Guardrails** are warnings and never limits:
  - A production value outside its own row's low–high, or outside an activity band the user has entered, warns:
    "Outside the DOT band 300–1,500 LF/day".
  - Prose-only bands (EW-CLR, EW-SPREAD) are shown as text.
  - See §8 R6: the catalog has no structured DOT band for calculated earthwork.

### 3.4 The period solver in work days (day, 5-day week, 20-day 4-week; D-724 rule 6)

- **The search:** billed days N = ⌈days⌉ (at least 1). Over M four-weeks, W weeks and D days, minimise
  M × 4wk + W × wk + D × day subject to 20M + 5W + D ≥ N.
  - For each M from 0 to ⌈N/20⌉ and W from 0 to ⌈(N − 20M)/5⌉, D is the least that covers the rest.
  - This is exact and cheap.
- **Overtime (single shift, pro-rata):** overtime hours = max(0, H − 8 × N). They are billed at the hourly equivalent of
  the periods that cover the billed days (day ÷ 8, week ÷ 40, 4-week ÷ 160). With more than one period kind, the rate is
  the average of those equivalents weighted by the billed days each period covers, filled from the longest period down.
  With one period kind this is exactly that period's rate (decision taken overnight, report).
- **Rules:**
  - Ties go to the longer period.
  - A blank period rate is skipped (advisory).
  - The minimum rental is one day.
  - A user-fixed period (`day`, `wk`, `4wk`) gives ⌈N ÷ period days⌉ × that rate, plus overtime at that period's rate.
- **Not in v1:** double and triple shift multipliers, standby, and rental surcharges (damage waiver, environmental fee).
  The catalog holds them as reference (Rental_Terms, Duration_Norms) for a later block.
- **On a shared resource,** days = Σ machine-hours ÷ (machines × hours per work day). That replaces today's
  ⌈Σusage ÷ basis hours⌉ for library resources only.
- **The examples below at 8 hr per work day** price the same as the hour solver did: 61.22 hr is 7.65 days, so N = 8.
  The cheapest cover is 2 weeks ($5,854) against 1 week + 3 days ($6,047), with no overtime (61.22 < 80).

### 3.5 Worked example 1: 20–25 t excavator, bulk cut and load

The first table is the **catalog path at 8 hr per work day** (no company production; the one excavator paces at its
catalog production). The spread variant with company production follows it.

- **Pick:** `EX-CRAWL-20T`, "20-25 t (~48,500-62,800 lb)", activity `EW-CUTLOAD` "Bulk cut and load trucks (hydraulic
  excavator)".
- **The quantity:** a Cut line of 10,000 BCY on a throwaway project. Never Hidden Valley Spec.
- **Project settings:** diesel $6.276 (entered), location factor 1.00, haul 50 mi, efficiency 0.83.

| Step | Value | Source / grade |
|---|---|---|
| Production | 3600 ÷ 15 s × 1.025 CY × 1.0 fill × 0.83 E × 0.80 L→B × 1 = **163.344 BCY/hr** | catalog formula, **C** |
| Units | takeoff BCY = machine BCY, no conversion | |
| 1. Hours H | 10,000 ÷ 163.344 = **61.2205 hr** | |
| 2. Rental, cheapest | 2 weeks (80 hr) = 2 × $2,927 = **$5,854.00**. Against: 1 week + 3 days $6,047.00; one 4-week $7,950.00 | rent **A** (4 sources) |
| 3. Location | × 1.00 = $5,854.00 (with the spec's example −1 %: × 0.99 = $5,795.46) | wage set equipment AMF or user |
| 4. Fuel | diesel, medium 2.78 gal/hr × 61.2205 hr × $6.276 = **$1,068.13** | fuel source Cat telematics; price User |
| 5. Operator | not in equipment. Prompt: "Add operator: Operating Engineer - heavy equip. group (per WD), 61.22 crew-hours" (the labour component at the saved wage set) | |
| 6. Mob/demob | lowboy-legal: max($550 minimum, $4.75 × 50 mi) = $550 one way; demob × 1.00 = $550; **$1,100.00** | transport **B** |
| **7. Total** | $5,854.00 + $1,068.13 + $1,100.00 = **$8,022.13** ($0.80 per BCY) | |
| Owned instead | $97.76 ex-fuel × 61.2205 = $5,984.92 + $1,068.13 + $1,100.00 = **$8,153.05** | owned B, ex-fuel C, labelled "ceiling" |

**Shared variant.** The same machine is a shared resource that also serves a second item with 20.00 usage hours.
- Σ usage is 81.2205 hr.
- Solver: 2 weeks + 1 day = $6,894.00, against 3 weeks $8,781.00 and one 4-week $7,950.00.
- Fuel: 2.78 × 81.2205 × $6.276 = $1,417.08.
- Mob: $1,100.00, once.
- Resource total: **$9,411.08**.
- Spread by usage, largest remainder to the cent: item 1 (75.38 %) **$7,093.66**, item 2 **$2,317.42**. Unallocated is $0.00.

**Spread variant (D-724; TEST data).** Cut 10,000 BCY at company production 1,000 BCY/day, with a spread of
2 × `EX-CRAWL-20T` and its crew of 2 operators. Diesel $6.276, mob lowboy-legal at 50 mi, location factor 1.00.

| | 8-hr work day | 10-hr work day |
|---|---|---|
| Days | 10,000 ÷ 1,000 = 10 | 10 |
| Hours per machine (spread hours) | 80 | 100 |
| Rental per machine | 10 billed days = 2 weeks $5,854.00; overtime 80 − 80 = 0 | 2 weeks $5,854.00 + 20 overtime hr × ($2,927 ÷ 40) = $7,317.50 |
| Rental × 2 | **$11,708.00** | **$14,635.00** |
| Fuel | 2 × 2.78 × 80 × $6.276 = **$2,791.56** | 2 × 2.78 × 100 × $6.276 = **$3,489.46** |
| Mob/demob | 2 × $1,100 = **$2,200.00** | **$2,200.00** |
| **Equipment total** | **$16,699.56** | **$20,324.46** |
| Crew-hours (labour linked) | 80, crew of 2 operators | 100 |

### 3.6 Worked example 2: 60 ft articulating boom lift

On an item with a spread, the lift runs the spread hours. The example below is an item with no production equipment
and no company production, so the lift follows the host's crew-hours.

- **Pick:** `AW-AB-RT-60`, "60 ft engine w/ jib". Its only activity is `LF-AWP-DUR`, a Duration activity, so the picker
  skips the activity step.
- **The host:** an item whose labour component is an MEP rough-in crew of **64 crew-hours**.

| Step | Value | Source / grade |
|---|---|---|
| 1. Hours H | the host's crew-hours, **64 hr** | hours source `crew` |
| 2. Rental, cheapest | 2 weeks (80 hr) = 2 × $1,370 = **$2,740.00**. Against: 1 week + 3 days $3,059.00; one 4-week $2,766.00 | rent **A** |
| 3. Location | × 1.00 = $2,740.00 | |
| 4. Fuel | diesel, medium 1.88 gal/hr × 64 × $6.276 = **$755.13** (low duty 1.43: $574.38) | |
| 5. Operator | none. The class's craft label is "Trade using it (self-operated; no dedicated operator)", so there is no prompt | |
| 6. Mob/demob | delivered-by-supplier: $200 minimum each way = **$400.00** | transport **B** |
| **7. Total** | $2,740.00 + $755.13 + $400.00 = **$3,895.13** | |
| Owned instead | $52.22 × 64 = $3,342.08 + $755.13 + $400.00 = **$4,497.21** | owned B, ex-fuel C |

**Missing-data variant: `AW-AB-EL-60`** (60 ft electric/hybrid jib).
- Rental resolves: 2 weeks $2,746.00, against one 4-week $2,751.00.
- Its fuel type is "hybrid" and gal/hr is blank (flag "Needs fuel gal/hr"), so **fuel is a blocking blank**.
- The total shows "—" and the line is flagged "Missing data: fuel gal/hr".
- It prices only when the user enters a gal/hr or confirms "none".

---

## 4. API endpoints

**Library (workspace scope).**
- Prefix: `/api/workspace/{ws}/equipment-library`, in a new router at `API/app/features/equipment/routes.py`.
- Reads need workspace membership. Writes need the permission that edits Settings › Crews (to confirm in Block 1.2).

| Method | Path | Does |
|---|---|---|
| GET | `/release` | current release, row counts, this workspace's unseen changes under its overrides |
| POST | `/release/seen` | dismiss the upgrade notice |
| GET | `/classes?category=&type=&q=&has_rate=&page=` | resolved class list (national + custom, workspace layer applied), for the picker and the page |
| GET | `/classes/{equip_key}` | one class resolved, each field with `{value, national, source, grade, set_by, set_at}`; its production rows; its transport class |
| GET | `/facets` | category → type → sub_type counts |
| GET | `/activities` / `/activities/{key}` | activities (national + custom) |
| GET | `/settings` | the 33 settings resolved at workspace level |
| GET | `/reference/{sheet}` | Duration_Norms, Rental_Terms, Factors, Location, Mob_Demob limits, README, Sources |
| PUT | `/override` | `{entity, entity_key, field, value_num? \| value_text? \| confirmed_none?, note?}` at workspace scope; records `national_at_set` |
| DELETE | `/override/{id}` | revert to national (one click) |
| POST | `/override/revert` | revert many (`{ids}` or `{entity, entity_key}`) |
| POST/PUT/DELETE | `/custom/classes[/{key}]`, `/custom/activities[/{key}]`, `/custom/production[/{equip_key}/{activity_key}]` | custom rows |
| POST | `/import/validate` | body: rows parsed by the browser from the company-rates workbook; returns per-row accept / reject / unchanged with reasons, writes nothing |
| POST | `/import/apply` | the validated set, applied in one transaction (overrides and custom rows; one audit entry) |

**Estimate (project scope).** Prefix `/api/workspace/{ws}/project/{p}/estimate/equipment-library`, on the pricing gate
(`canEditEstimates`, as the other estimate writes).

| Method | Path | Does |
|---|---|---|
| GET | `/resolved?keys=` | classes resolved at project level (national → workspace → project), plus the project's equipment settings (fuel prices, haul miles, location factor and its source, efficiency) |
| PUT | `/override` / DELETE `/override/{id}` | project-scope override and revert |
| GET | `/notices` | components and resources whose snapshot differs from the current resolution (Q1), and national changes under this project's overrides |
| POST | `/refresh` | `{component_ids?, resource_ids?}`: re-resolve and store the new snapshot and total (Q1's one click) |

**Existing endpoints that gain fields:**
- `POST/PUT /components` takes and returns the `eq_*` columns (`estimate/schemas.py` `ComponentFields`).
- `POST/PUT /equipment` does the same for resources.
- The assembly component routes (`assembly/routes.py:618`, `:673`) and `from-item` / `apply` copy them (§6).

The api validates every `eq_*` value: the key exists or is a live custom key, the enums hold, and `eq_period = hr` is
refused for rental. It never computes the total; the total cache comes from the browser, as for every other component.

---

## 5. UI

### 5a. The picker inside an Equipment cost component (`ComponentDialog`)

The equipment block opens on **"From library" | "Enter by hand"**. "Enter by hand" is today's form, unchanged.

```
┌ Equipment ─────────────────────────────────────────────────────────────┐
│ ( From library ) ( Enter by hand )                                     │
│ Search [excavator 20            ]                                      │
│ Category  [Earthwork ▾]  Type [Hydraulic excavator ▾]                  │
│ Size class                                                             │
│  ○ 13-15 t (~30,000-34,000 lb)    $700 / $2,100 / $5,250   A           │
│  ● 20-25 t (~48,500-62,800 lb)    $1,040 / $2,927 / $7,950  A          │
│  ○ 30-36 t (~68,000-81,000 lb)    $1,424 / $4,019 / $10,850 A          │
│ Activity  [Bulk cut and load trucks (hydraulic excavator) ▾]           │
│   163.3 BCY/hr typical (130.7 – 179.7)  C   E 0.83 · Loam · bucket 1.025│
│ Rate basis ( Rental ) ( Owned ) ( Operated )                           │
│   Rental  day $1,040 · wk $2,927 · 4wk $7,950   range $… – $…   A      │
│   Owned   $97.76/hr ex-fuel (ceiling)   B · ex-fuel C                  │
│ Period  [Cheapest ▾]  → 2 weeks for 61.2 hr                            │
│ Hours from ( Activity ) ( Crew ) ( Formula ) ( Manual )   61.22 hr     │
│ Fuel  diesel · medium 2.78 gal/hr × $6.276 = $17.45/hr   [low|med|high]│
│ Location factor 1.00 (wage set: Equipment 0 %)                         │
│ Mob/demob  lowboy-legal · 50 mi · $550 + $550       B   [✓ include]    │
│ Operator  Operating Engineer - heavy equip. group  [Add to crew]       │
│ ─────────────────────────────────────────────────────────────────────  │
│ Rental $5,854.00 · Fuel $1,068.13 · Mob $1,100.00 = $8,022.13          │
└────────────────────────────────────────────────────────────────────────┘
```

**The steps:**
1. **Search, category, type, size class.** Each class shows its spec and example models, and its rental day / week /
   4-week with the rental grade.
2. **Activity** (production classes only). It shows native unit, low / typical / high, the grade and the inputs. An input
   that is editable here (capacity, efficiency, soil) writes a project override.
3. **Rate basis.**
   - Rental, owned and operated are side by side, each with its grade.
   - Owned is labelled "ceiling" or "proxy", as the catalog says.
   - Operated shows the minimum and travel.
   - Switching from operated to bare shows "Fuel is now priced separately and an operator comes from labour", and offers
     **Add to crew**.
4. **Period:** Cheapest (default) or a fixed day / week / 4-week (hour for owned and operated). It shows the combination
   chosen and the next-best.
5. **Hours source:**
   - The default is Activity for production classes and Crew for duration classes.
   - Crew reads the host's labour component, and shows "No labour component on this item" as a blocking blank when there
     is none.
   - **Use for crew** writes the activity's production into the host's labour component, so crew-hours and equipment
     hours stay one number. It is optional and asks first.
6. **Fuel, location factor and mob,** each with its source and grade.

**The spread (D-724), on the item, above its components:**
- **Production:** "1,000 BCY/day (company)" or "163.3 BCY/hr × 1 (catalog, pacing: Excavator 20-25 t)". It is editable
  on the line: type a number, or pick a tier (D-727). Hours per work day is shown with its source.
- **The capacity check** sits beside company production: "2 × Excavator 20-25 t ≈ 2,613 BCY/day at 8 hr, catalog C".
  It is a warning only.
- **Each machine row:** number of machines (decimal), "Paces production" (one per item), "Own production" (out of the
  spread), and its hours.
- **The labour component:** "Linked to spread: 80.0 crew-hr" with **Unlink from spread**. Unlinked, its own production
  field returns and **Link to spread** puts it back. Different hours show both with a warning: "Crew 64.0 hr, spread
  61.2 hr".
- **Operator rows** added by Add to crew follow the machine's count (`for_equipment`). Editing the count by hand breaks
  the follow, with a note.

**Every value has a grade badge.**
- A, B, C or D as loaded.
- **U** for a user value, with a tooltip: "Entered by name, 23 Oct 2026; national $1,040; Revert".
- A blank shows **No data, enter a value** inline, with "Confirm none" where that is allowed (§3.2).

**Shared resource.** The dialog's footer offers "Price as a shared machine…". It links the component's host to a project
resource of this class, creating one if there is none, and the component's equipment cost becomes the host's share (§5c).
- **Add to crew** opens the existing `CrewRows` editor (`APP/features/estimate/CrewRows.tsx`) on the host's labour
  component, with a new row whose role is the class's craft label. The user picks the wage-set craft; the library never
  maps labels to craft codes.

### 5b. The library page (Settings › Equipment library, `APP/pages/SettingsEquipmentLibrary.tsx`)

- **Left:** category → type tree with counts, and filters (has rental, has owned, has production, missing data, my
  overrides, custom).
- **Centre: a grid of size classes.**
  - Columns: rental day / week / 4-week, operated $/hr, minimum, owned ex-fuel, fuel low / med / high, transport, mob and
    demob at the workspace's haul distance, default basis.
  - Each cell shows its grade.
  - A user cell shows **U** with the national value beside it in muted text.
  - Editing a cell writes a workspace override. Delete or "Revert to national" removes it.
- **Detail drawer:**
  - the class's notes and flags, sources (linked to `eq_source`) and standby rule;
  - its production rows, each editable, with method inputs and DOT band;
  - the activity list;
  - "Add production for an activity".
- **Add custom:** "+ Equipment" (a new type or a size class under an existing type), "+ Activity", "+ Production rate".
- **Settings tab:** the 33 settings at workspace level. Fuel price defaults, haul distance, efficiency and haul speeds are
  editable; national derivation constants are shown read-only.
- **Release banner:** "Release 1, 23 Oct 2026". After an upgrade it reads "N national values changed under your
  overrides" and opens the change list with Keep mine / Use national.
- **Live gap counts:** rows with blank rental, blank owned, missing fuel, D production.
- **Import / Export company rates:**
  - **Export** writes a workbook in the browser with one sheet each for Classes, Production, Settings and Custom.
  - Every editable field is a column, alongside its national value and its source.
  - **Import** reads that workbook in the browser and posts the rows to `/import/validate`. It shows a diff (changed /
    unchanged / rejected with the reason), then `/import/apply`.
  - An empty cell in the import means "no override", never zero.

**Later as Lists:** the page is one component (`APP/features/equipment-library/LibraryPage.tsx`) and its route is the only
thing tied to Settings. Moving it under a Lists page beside Takeoff and Assemblies is a route change. This plan does not
change the data model for that. The only cost of doing it later is where the page sits now (Q5).

### 5c. In Estimating, the cost-type filter, shared equipment and the export

- **Rows:**
  - A library component is `kind = equipment`, so it shows wherever equipment shows today.
  - Under "Expand components", its detail row reads "Excavator 20-25 t · Rental 2 wk · 61.2 hr", with the grade of its
    weakest value.
  - A missing-data component shows "—" and a red marker.
  - The host line's Total Equipment shows its other equipment plus "+ incomplete".
- **Needs attention** (D-127) gains:
  - "Equipment: missing data (field)";
  - "Equipment: library rates changed (Q1)";
  - "Equipment: outside the DOT band".
- **The cost-type filter** needs no change: `TYPE_COLUMNS` and `reportKeeps` already carry equipment money. The equipment
  report also shows the basis and hours columns.
- **Shared equipment:** `EquipmentDialog` gains "From library" in the same shape as 5a.
  - Rate, Per and Mob/demob are filled and greyed when a class is set.
  - Rental shows the solver's combination over Σusage.
  - Unallocated stays as built.
- **The export (`workbook.ts`, `detailsOf`):**
  - Equipment detail rows gain columns for class key, size class, basis, period, hours, rate, fuel $, mob $, location
    factor and grade.
  - A new **Equipment basis** sheet lists every library component and resource: each resolved value with source and grade,
    plus the project's fuel price, haul distance, efficiency and factor.
  - A sheet with any missing-data line carries a banner: "Incomplete: N equipment lines have missing data and are not in
    the totals."
  - Hand-entered components export exactly as today.

---

## 6. Assemblies

- **Saving into an assembly** (`POST /from-item`, `assembly/routes.py:344`): a library component copies its `eq_*` columns
  (class, activity, mode, period, hours source and formula, fuel load, soil, travel, include-mob) to `assembly_component`.
  - **No resolved rate is copied.** An assembly stores the choice, not the money. This mirrors D-298, where a crew is
    makeup only and is priced at the project's rates when applied.
  - A hand-entered equipment component copies as today.
  - The item's link to a shared resource is saved as `assembly_equipment_link`: resource name, usage formula, and class
    key if the resource has one.
- **Applying an assembly** (`POST /{uuid}/apply` → `_copy_host_components`):
  - Components are created with the `eq_*` columns and resolved on first evaluation at **this project's** layers. A
    workspace override applies; a project override applies.
  - A class retired since the assembly was saved still resolves, labelled "Retired in release N".
  - A class key that no longer exists (a deleted custom class) applies as a hand-entered component with a red "Library
    class not found" flag and no total.
  - Each `assembly_equipment_link` links the new item to the project resource of the same name, matched ignoring case and
    spaces (the resource's existing uniqueness rule). If there is none, it creates the resource from the link's class with
    the item's division as home. With no class either, it creates a hand-entered resource with "No data, enter a value".
  - It never creates a zero-rate resource silently.
- **Template editor** (`APP/features/assembly/TemplateComponents.tsx` reuses `ComponentDialog`): the picker works there.
  It shows national and workspace values only, since there is no project; the total there is illustrative.
- **Starter Pack** templates (`workspace_id` NULL) may hold library components. They resolve in each workspace at that
  workspace's layers.

---

## 7. Phases and blocks (one Claude Code session each)

**The standard after every block** (CLAUDE.md, Proving work is done; hard rule 8):
1. **The gates, run in the containers:**
   - app: `npm run lint`, `npm run typecheck`, `npm run build`;
   - api: `poetry run ruff check .`, `poetry run mypy app`;
   - no prettier (rule 10);
   - no `from __future__ import annotations`.
2. **`./quantity-table.sh`** from `intelcost-infra/`, with its line reported.
3. **One Playwright MCP smoke test** on a throwaway account (never the seeded account) and a throwaway project. **Never
   Hidden Valley Spec.** For the night of 2026-10-23 (D-729), "Bench Construction Test" and "Hidden Valley Rebid — 3D
   test" are read-only sources. Block 3.5 and the coverage run use a copy of the 3D test in the throwaway account's own
   workspace.
4. Commit and push `umer-dev`, log the block's D-NN first, update `SINCE_ARCHIVE.md`, and refresh the workspace mirror.

**Quantity-table rows are added** in `intelcost-infra/browser/lib/equipment-cases.mjs`, run beside `cost-cases.mjs`. They
are rows compared against hand-worked or catalog answers; they are not a test suite (rule 8, D-78).

### Phase 1: reference data (api only)

**Block 1.1: converter, national schema, release 1 load**
- **Files:**
  - `API/app/features/equipment/__init__.py`, `models.py` (the `eqlib.*` tables);
  - `API/app/features/equipment/seed/convert.py` (dev-only openpyxl);
  - `API/app/features/equipment/seed/release_1/*.csv`;
  - `API/alembic/versions/<new>_eqlib_schema.py`, `<new>_eqlib_release_1.py`;
  - `pyproject.toml` (dev group).
- **Done when:** the migration loads exactly 628 classes, 104 activities, 592 production rows, 9 transport classes,
  33 settings, 4 soils and 157 sources.
- **Gates:** ruff, mypy. Quantity table: a new `eqlib-counts` row (the counts above), and one row per load rule in §2.5.
- **Check by hand** (psql in the bench `postgres` container):
  - `select count(*) from eqlib.eq_class` gives **628**.
  - `select rent_day, rent_week, rent_4wk, owned_rate_hr_excl_fuel, fuel_gph_med from eqlib.eq_class where
    equip_key='EX-CRAWL-20T'` gives **1040 / 2927 / 7950 / 97.76 / 2.78**.
  - `… where equip_key='DZ-CRAWL-D1'` gives rent_day **NULL** (not 0) and owned ex-fuel **41.18**.
  - `select prod_typ from eqlib.eq_production where equip_key='EX-CRAWL-20T' and activity_key='EW-CUTLOAD'` gives
    **163.344**.
  - `select default_mode from eqlib.eq_class where equip_key='CR-TOWER'` gives **rental**.

**Block 1.2: overrides, custom rows, resolve and the read API**
- **Files:**
  - `API/app/features/equipment/{models.py (eq_override, eq_custom_*, eq_release_seen), schemas.py, service.py
    (resolve), routes.py}`;
  - `API/app/main.py` (router);
  - migration `<new>_eq_overrides.py`;
  - the permission check;
  - audit hooks.
- **Gates:** standard. Quantity table: resolve rows (a national value; a workspace override wins; a project override
  wins; revert restores national; `confirmed_none` stays distinct from 0).
- **Check by hand** (the bench's api docs page at `/docs`, signed in as a throwaway):
  1. GET `/classes/EX-CRAWL-20T`: rent_day 1040, source national, grade A.
  2. PUT an override of rent_day to 980. GET again: 980, source workspace, `national` 1040, `set_by` you.
  3. DELETE it: back to 1040.

### Phase 2: the engine and the estimate settings

**Block 2.1: the engine core (rates, solver, location, fuel, operated, mob) and estimate settings**
- **Files:**
  - `APP/lib/estimate/equipment/{types,resolve,missing,periods,fuel,location,operated,mob,cost}.ts`;
  - `APP/features/equipment-library/api.ts`;
  - the project's equipment settings in Estimating's sidebar Setup: fuel price per fuel type, haul miles, location factor
    with its source (Q2), efficiency;
  - `intelcost-infra/quantity-table.sh` (purity grep extended to `lib/estimate/equipment`);
  - `intelcost-infra/browser/lib/equipment-cases.mjs`.
- **Quantity table:**
  - the 628 mob/demob pairs at 50 mi against the catalog's cached values;
  - the solver rows, including both worked examples' alternatives;
  - fuel and location rows;
  - blocking-blank rows (total NULL, never 0).
- **Gates:** standard.
- **Check by hand:**
  1. Estimating › Setup › Equipment: fuel diesel is empty with "No data, enter a value" (D-723) and the suggestion
     "US average $6.276 (on-highway, includes road taxes; off-road dyed diesel is usually lower)". Click it.
     - **Expected:** 6.276 tagged User.
  2. The location factor shows 1.00, "No wage set" (or "From the wage set: Equipment n %", D-719).
  3. Haul shows 50 mi; hours per work day shows 8.
- **Quantity table also:** the work-day solver and overtime rows: 10 days at 10 hr → 2 weeks + 20 overtime hr ×
  $2,927 ÷ 40 = $7,317.50 per machine; 7 days → 1 week + 2 days $5,007.00; 20 days → one 4-week $7,950.00.

**Block 2.2: the production engine**
- **Files:** `APP/lib/estimate/equipment/{production,families,soil,units,guardrails}.ts`.
- **Quantity table:**
  - **all 965 production formula cells** recomputed at release 1's settings and equal to the catalog's cached values to
    1e-9;
  - the 228 D rows resolve as blank (never 0);
  - an efficiency override recomputes (EX-CRAWL-20T EW-CUTLOAD at E = 0.75 gives 3600/15 × 1.025 × 0.75 × 0.80 =
    **147.60 BCY/hr**);
  - a CCY → LCY conversion row (Loam 1.39).
- **Gates:** standard.
- **Check by hand:** nothing on screen yet. Report the quantity-table line.

### Phase 3: estimate wiring

**Block 3.1: component columns and evaluation**
- **Files:**
  - migration `<new>_cost_component_eq_columns.py`;
  - `API/app/features/estimate/{models,schemas,components}.py` (validation only);
  - `APP/lib/estimate/components.ts` (a branch in `evaluate` when `eq_class_key` is set; the rest unchanged);
  - `APP/lib/estimate/costing.ts` (a missing-data flag passed through);
  - `APP/lib/estimate/componentDraft.ts`.
- **Gates:** standard. Quantity table: the existing cost rows unchanged (hand-entered components bit for bit), plus the
  worked examples as component rows ($8,022.13, $8,153.05, $3,895.13, $4,497.21, and the EL-60 variant NULL), the spread
  variant (2 × EX-CRAWL-20T at 1,000 BCY/day: $16,699.56 and crew-hours 80 at 8 hr; $20,324.46 and 100 at 10 hr), and
  a labour component on an item with no library equipment, bit for bit as before.
- **Also in this block:** `estimate_item_spread`, the spread columns (`eq_units`, `eq_in_spread`, `eq_paces`,
  `spread_linked`, crew-row `paces` and `for_equipment`) and `APP/lib/estimate/equipment/spread.ts`.
- **Check by hand:** create through the API docs page a component with `eq_class_key='EX-CRAWL-20T'`,
  `eq_activity_key='EW-CUTLOAD'` on a Cut item of 10,000 BCY, then open Estimating.
  - **Expected:** Total Equipment $8,022.13.
  - A hand-entered component on another item still shows its old total.
  - Set the item's company production to 1,000 BCY/day, the machine count to 2, and add a labour component with 2
    operators. **Expected:** equipment $16,699.56, crew-hours 80. Hours per work day 10: $20,324.46, crew-hours 100.

**Block 3.2: the picker**
- **Files:**
  - `APP/features/estimate/ComponentDialog.tsx` (equipment block);
  - new `APP/features/equipment-library/{Picker,ClassList,ActivityStep,RateBasis,GradeBadge,MissingValue}.tsx`;
  - `APP/features/estimate/CrewRows.tsx` (Add to crew).
- **Gates:** standard. The smoke test drives the picker.
- **Check by hand:**
  1. On a 10,000 BCY Cut item: Add cost component › Equipment › From library.
  2. Search "excavator", pick 20-25 t.
     - **Expected:** A badges, $1,040 / $2,927 / $7,950.
  3. Pick "Bulk cut and load trucks (hydraulic excavator)".
     - **Expected:** 163.3 BCY/hr C, 61.22 hr, period 2 weeks, total **$8,022.13**.
  4. Switch to Owned.
     - **Expected:** **$8,153.05** and the "ceiling" label.
  5. Fuel load Low.
     - **Expected:** fuel 2.18 × 61.2205 × 6.276 = **$837.60**.
  6. On another item with a 64 crew-hour labour component, pick Boom lift, articulating › 60 ft engine w/ jib.
     - **Expected:** no activity step, Hours from Crew 64, 2 weeks, **$3,895.13**.
  7. Pick 60 ft electric/hybrid jib.
     - **Expected:** fuel "No data, enter a value", total "—", Save allowed and the line flagged.
  8. Back on the Cut item: type production 1,000 BCY/day and set the excavator count to 2; Add to crew.
     - **Expected:** the capacity check "2 × Excavator 20-25 t ≈ 2,613 BCY/day at 8 hr, catalog C", equipment
       $16,699.56, an operator row of count 2 following the machine, crew-hours 80 ("Linked to spread").
  9. Unlink the labour component and give it 12.5 BCY/crew-hr.
     - **Expected:** crew 800 hr against spread 80 hr, with the warning; Link to spread puts 80 back.

**Block 3.3: shared resources from the library**
- **Files:**
  - migration `<new>_equipment_resource_eq_columns.py`;
  - `API/app/features/estimate/{models,schemas,equipment}.py`;
  - `APP/lib/estimate/sharedEquipment.ts` (resource total from the engine when a class is set);
  - `APP/features/estimate/EquipmentDialog.tsx`;
  - "Price as a shared machine…" in the picker.
- **Gates:** standard. Quantity table: the shared variant ($9,411.08 split $7,093.66 / $2,317.42).
- **Check by hand:**
  1. Make the excavator a shared resource on the Cut item's division, and give a second item in that division 20 usage
     hours.
     - **Expected:** rental 2 weeks + 1 day $6,894.00, fuel $1,417.08, mob $1,100.00, total $9,411.08, shares $7,093.66 and
       $2,317.42, Unallocated $0.00.
  2. Exclude item 2.
     - **Expected:** H = 61.22, total $8,022.13, all on item 1.
  3. Give a second item in the same division its own standalone EX-CRAWL-20T with mob included (D-725).
     - **Expected:** both show "Mob/demob counted 2 times — price as one shared machine?"; totals unchanged.

**Block 3.4: Estimating rows, Needs attention, filter, export**
- **Files:** `APP/features/estimate/EstimatingView.tsx` (detail labels, markers, incomplete totals),
  `APP/lib/estimate/lines.ts`, `APP/lib/estimate/workbook.ts` (columns, Equipment basis sheet, banner),
  `APP/features/estimate/EstimateSidebar.tsx`.
- **Gates:** standard.
- **Check by hand:**
  1. Filter Equipment.
     - **Expected:** the excavator, lift and shared rows, with basis labels.
  2. Needs attention.
     - **Expected:** the EL-60 line with "Equipment: missing data (fuel gal/hr)", and the Bid total marked incomplete
       (1 line).
  3. Export.
     - **Expected:** an Equipment basis sheet listing three library rows with grades, and the banner on the sheet with
       the EL-60 line.
  4. Open the export in a spreadsheet program.
     - **Expected:** the excavator row reads Rental · 2 wk · 61.22 hr · $8,022.13.

**Block 3.5: earthwork production settings; production and spread update each other (D-727)**
- **Files:**
  - migration `<new>_earthwork_production.py` (§2.7 tables);
  - `API/app/features/equipment/{models,schemas,production_routes,production_service}.py`;
  - `APP/lib/estimate/equipment/{tiers,spreadLink}.ts` (pure: tier lookup, default production by quantity, scaling on a
    pacing count, exact tier match);
  - `APP/features/equipment-library/EarthworkProduction.tsx` (the Settings tab: activities, line mapping, tiers with
    machines and crew, default production by quantity);
  - the line's production control in the spread UI;
  - the attach step after Calculate's write (`APP/features/takeoff/earthwork/useVolumes.tsx` and `site/SiteView.tsx`,
    after `write_lines` returns), never inside `lib/takeoff`.
- **Rules:** §2.7 and D-727.
  - Auto components carry `eq_auto`.
  - A user edit to production, a count or a component sets `estimate_item_spread.user_edited`.
  - Every automatic change writes the line's note.
  - A project switch turns earthwork production off.
- **TEST data (named "TEST …", never presented as rates):**
  - activity "TEST Cut to fill" (BCY), mapped from `cut`;
  - tiers 200–799 BCY/day = 1 × EX-CRAWL-20T + 1 operator, and 800+ BCY/day = 2 × EX-CRAWL-20T + 2 operators;
  - default production 1,000 BCY/day.
- **Gates:** standard. Quantity table: tier lookup, scaling (2 → 3 gives 1,500), an exact-match row, and the five check
  totals below.
- **Check by hand** (8-hr day unless stated; the throwaway project, then the 3D test copy, D-729):
  1. Cut 10,000 BCY.
     - **Expected:** 2 machines and 2 operators attach at 1,000 BCY/day: **$16,699.56**, crew-hours 80.
  2. Set a 10-hr day.
     - **Expected:** **$20,324.46**, crew-hours 100. Then set it back to 8.
  3. Set production to 500.
     - **Expected:** 1 machine, 20 days, 160 hr, rental one 4-week $7,950.00, fuel $2,791.56, mob $1,100.00, total
       **$11,841.56**.
  4. Set production back to 1,000, then the excavators 2 → 3.
     - **Expected:** production 1,500 with the note, 6.67 days, 53.33 hr per machine, rental per machine 1 week + 2 days
       = $5,007.00 × 3 = $15,021.00, fuel $2,791.56, mob $3,300.00, total **$21,112.56**, crew-hours 53.33 with 3
       operators.
  5. Add 0.5 water truck.
     - **Expected:** cost changes, production stays.
  6. Recalculate into another tier.
     - **Expected:** the edited line keeps its spread, with the "Apply tier" notice.
  7. The coverage run on the 3D test copy (D-729): every item and sub-item with a quantity priced, Calculate run and rerun
     with every component surviving, and the coverage table in the night report.

### Phase 4: the library page

**Block 4.1: browse, workspace overrides, revert, release banner**
- **Files:**
  - `APP/pages/SettingsEquipmentLibrary.tsx`;
  - `APP/features/equipment-library/{LibraryPage,Tree,ClassGrid,DetailDrawer,SettingsTab,ReleaseBanner}.tsx`;
  - `APP/App.tsx` (route `settings/equipment`);
  - `APP/pages/settings-pages.ts`.
- **Gates:** standard.
- **Check by hand:**
  1. Settings › Equipment library › Earthwork › Hydraulic excavator. Edit 20-25 t day to **980**.
     - **Expected:** a U badge, "national $1,040" beside it.
  2. Open the excavator component from Block 3.2.
     - **Expected:** a notice that library rates changed (Q1). After Update, the solver still picks 2 weeks ($5,854; day
       $980 does not change it), so the total is unchanged at $8,022.13.
  3. Edit the week rate to **3,200**.
     - **Expected:** after Update, the solver picks 1 week + 3 days = 3,200 + 3 × 980 = **$6,140.00** against 2 weeks
       $6,400. The total is 6,140 + 1,068.13 + 1,100 = **$8,308.13**.
  4. Revert both.
     - **Expected:** $8,022.13.

**Block 4.2: custom rows and import/export, including a company's machine list (D-728)**
- **Files:** `APP/features/equipment-library/{CustomForms,ImportDialog,exportWorkbook,importWorkbook}.ts(x)`, and the
  import routes in `API/app/features/equipment/routes.py`.
- **Gates:** standard.
- **Check by hand:**
  1. Add custom "Excavator 20-25 t, company unit" with owned $85.00/hr and fuel 2.78 med, and a production row for
     EW-CUTLOAD fixed at 150 BCY/hr.
     - **Expected in a component:** 10,000 ÷ 150 = 66.67 hr, owned $5,666.67 + fuel 2.78 × 66.6667 × 6.276 = $1,163.15 +
       mob (pick lowboy-legal) $1,100 = **$7,929.82**.
  2. Export company rates. In the file, change EX-CRAWL-20T week to 3,000, leave a cell empty and import.
     - **Expected:** the diff shows 1 changed. The empty cell is "no override", not 0.
  3. Apply. The grid shows the U badge.
- **A company's machine list (D-728):** the import also reads a sheet of the company's own machines.
  - The columns it reads: name, owned $/hr without fuel, gal/hr, and rental day / week / 4-week; any may be missing.
  - **Matching:** each row gets a suggested library class (category, type and size words, tonnage, horsepower or
    capacity read from the name, scored against the class names and specs). The user confirms it, picks another, or
    makes the row a custom class.
  - **Every row stays listed** as matched, custom or skipped by the user; none is dropped silently.
  - Confirmed rows land as workspace overrides tagged User on the matched class; custom rows land as custom classes.
  4. A 5-row list with names like "Excavator04, CAT 330" and "Truck, 30 Ton Artic".
     - **Expected:** each row gets a suggestion (for example a 30–36 t excavator, a 30 t class articulated truck).
       After confirming, the values land as workspace overrides tagged User, and no row is dropped.

**Block 4.3: release upgrades and notices**
- **Files:**
  - `API/app/features/equipment/service.py` (notice queries);
  - a **bench-only** release fixture migration that changes one value on a BENCH DUP database, never shipped or pushed as
    data;
  - `ReleaseBanner`;
  - the project notice in Estimating.
- **Gates:** standard.
- **Check by hand:** on the bench, apply the bench-only release that moves EX-CRAWL-20T day 1,040 → 1,100.
  - **Expected:** a workspace with an override on that field sees "national value changed under your override: was
    $1,040, now $1,100". A workspace without one sees the new national value.
  - Existing components show the Q1 notice, and their totals do not move until Update.
  - Roll the fixture back.

### Phase 5: assemblies with the library


**Block P1: assemblies link shared equipment (closes D-93's "Not yet")**
- **Files:**
  - `API/alembic/versions/<new>_assembly_equipment_link.py`, `API/app/features/assembly/{models,schemas,routes}.py`
    (`from-item`, `apply`, link CRUD);
  - `APP/features/assembly/{api.ts,TemplateComponents.tsx}`;
  - a "Shared equipment" section in the template editor;
  - `APP/features/estimate/EquipmentDialog.tsx` (shows linked hosts).
- **Rules:** §6, without the library: name and usage formula.
- **Gates:** standard. Quantity table: two seed rows (apply links to the existing resource; apply creates a missing one).
- **Check by hand:**
  1. In a throwaway project, make shared resource "Loader 3 yd" ($825/day, basis day, mob $0) on division A.
  2. Item 1 has labour with 16 crew-hours. Save item 1 as assembly "Pad prep" with the link.
  3. Make item 2 in division A and apply "Pad prep" to it.
  - **Expected:** Shared equipment lists both items at 16 hr each. Rental is ⌈32 ÷ 8⌉ = 4 days = $3,300.00. Each item gets
    $1,650.00. Unallocated is $0.00.
  4. Rename the resource "Loader 3yd" and apply again to item 3.
  - **Expected:** it links to the same resource (spaces ignored). No second resource is created.

**Block 5.1: library components in assemblies**
- **Files:**
  - migration `<new>_assembly_component_eq_columns.py`;
  - `API/app/features/assembly/{models.py (COMPONENT_COPY_FIELDS), routes.py (from-item, apply, _copy_host_components)}`;
  - `APP/features/assembly/TemplateComponents.tsx`.
- **Gates:** standard. Quantity table: a seed row in which an applied library component resolves at the target project's
  layers.
- **Check by hand:**
  1. Save the 10,000 BCY Cut item (excavator component and shared link) as assembly "Mass cut".
  2. In a second throwaway project with a project override of fuel $5.00, apply it to a 5,000 BCY Cut item.
     - **Expected:** 30.61 hr; rental 1 week ($2,927) against 4 days ($4,160); fuel 2.78 × 30.6102 × 5.00 = $425.48.
     - The shared link creates resource "Excavator 20-25 t …" in that project with mob $1,100 counted once.
     - The item's share is 100 %: $2,927.00 + $425.48 + $1,100.00 = **$4,452.48**.

**Totals: 5 phases, 14 blocks, built in this order (D-729):** 1.1, 1.2; 2.1, 2.2; 3.1 to 3.5; 4.1 to 4.3; P1, 5.1. Phases 1 to 3
give a usable library from the catalog with no page. Phase 4 gives control. Phase 5 gives reuse.

---

## 8. Risks and what could break existing estimates

| # | Risk | Guard |
|---|---|---|
| R1 | **Hand-entered equipment components, or labour, change value.** | Labour on an item with no library equipment and no company production keeps its own production rate exactly (D-724 rule 12); a quantity-table row proves it bit for bit. Every new column is nullable. `evaluate` branches only on `eq_class_key IS NOT NULL`, and the old path is untouched. The quantity table's existing cost rows must stay bit for bit (Block 3.1). The migration writes no data into existing rows. Shared resources without a class keep `⌈Σusage ÷ basis⌉` |
| R2 | **A release silently moves a saved bid.** | Snapshot plus notice plus one-click Update (Q1). `eq_snapshot` carries the release and every resolved value, so a component prices from its snapshot until the user updates |
| R3 | **A blank priced as $0** (564 classes need a rate). | Blocking blanks give NULL totals, an incomplete marker on totals, Needs attention and an export banner (§3.2). A quantity-table row asserts NULL, not 0 |
| R4 | **The operator counted twice** (operated rate plus a crew operator). | Operated suppresses the Add-to-crew prompt. Switching to bare offers it. An operated component on a host whose labour crew has a matching-label row warns "The operated rate includes the operator" |
| R5 | **Bank, loose and compacted mix-ups** (25–43 % errors). | Units are converted only through `eq_soil_conversion`; anything that does not convert blocks. The soil is shown on the component |
| R6 | **DOT guardrails expected on excavator cut** but the catalog has no structured band there. | Warnings fire where a band exists (DOT-basis rows' low–high, user-entered bands). The library page lists activities with no band. Say so in the release notes. No numbers are invented |
| R7 | **FEMA ⚠ values used without review.** | Shown with ⚠ and the catalog's flag text on every use (Q4) |
| R8 | **Owned rates read as competitive costs** (the catalog calls them reimbursement ceilings). | Labelled "ceiling" or "proxy" everywhere. Owned is never the default where a rental rate exists |
| R9 | **The location factor applied to the wrong part.** | Only to rental and owned ex-fuel (catalog Location sheet: "Do NOT apply the labor or total City Cost Index to equipment"). Never to fuel, the operator, mob, or an operated rate (an operated rate is a local quote). Outside 0.85–1.15 it warns, never clamps |
| R10 | **Earthwork Calculate lines change** because a component reads their quantity. | Components only read the host's quantity. Nothing writes to earthwork. **Hidden Valley Spec is never used for any check** (D-232) |
| R11 | **Assembly apply semantics change** for existing templates. | Templates without `eq_*` or links apply exactly as today. The link step runs only when links exist |
| R12 | **Purity:** the engine imports React or calls the api. | The quantity table's purity grep covers `lib/estimate/equipment` |
| R13 | **The upgrade leaves workspaces behind** (as the classification template did). | There is no copy to upgrade: national rows are read live, and only overrides are per workspace |
| R14 | **Rule 9 in seed text.** | The catalog was scanned and has no competitor names (the only "STACK" hits are trench-box IDs). The design document fails the scan (top of this plan) |

---

## 9. Open questions (answered 2026-10-23: D-718 to D-723; Q3 by Umer's own rule, D-720)

**Q1. When a library value changes under a saved estimate (an upgrade, or a workspace override edited later), does the
component's money move?** Blocks 3.1 and 4.3.
- **Recommended: no.** The component keeps its snapshot and shows "Library rates changed: Update". Projects get one
  "Update all" in Estimating.
- New picks always use the current values.
- This is how a bid stays the number that was sent. It differs from labour, which follows a new wage set automatically,
  because the estimator chose to save that set; nobody chooses a library release.

**Q2. The locked default location factor is 1.00, but the app already holds an equipment location factor per project
(`project_wage_set.equipment_amf`, −5 % to +6 %), and the Wage Calculator spec says it applies to equipment. Which is the
default?** Blocks 2.1 and 3.1.
- **Recommended:** `1 + equipment_amf` from the project's current wage set when it has a location, shown as "From the wage
  set: Equipment −1 %".
- 1.00 when there is no wage set or no ZIP.
- Workspace and project overrides as for every field.
- This keeps "one ZIP drives both" from the design basis.

**Q3. The rule "mobile cranes, boom pumps and hired dump trucks default to Operated" meets catalog rows that carry no
operated rate.**
- The rows: `CR-RT-50T/65T/85T/100T-BARE` (bare rental only), `CR-AT-35T`, `CR-AT-60T`, `CR-CRAWL-*` (owned or blank
  only), and the bare on-road dump truck rows.
- Blocks the load rule in 1.1.
- **Recommended:**
  - Rows the catalog labels bare in their own name (the four `-BARE` RT cranes) open Bare.
  - Every other row of those types opens Operated, showing "No data, enter a value" for the operated rate where it is
    blank, with Bare one click away.
  - That follows the rule and never invents a rate.

**Q4. FEMA ⚠ values (26 classes): load as published and flag, or hold back until verified against the PDF?** Blocks 1.1.
- The design document's Phase 1 says "no FEMA anomaly loads unverified". The brief says load the numbers as data and do
  not change them.
- **Recommended:** load as published (rule 1 of §2.5), with the ⚠ flag text shown beside the owned rate wherever it
  appears. Verification lands later as release 2 through §2.3.

**Q5. Where the library page lives until Lists exists.** Blocks 4.1.
- **Recommended:** Settings › Equipment library (`/settings/equipment`), self-contained so the later move to Lists is a
  route change.
- Building a Lists page now would revive F10's parked Library page (D-287 6) for one tab.

**Q6. The project fuel price when the user has entered none.** Blocks 2.1.
- The locked rule says a price the user enters, and blanks are never zero.
- **Recommended:** the field starts empty and blocks every fuel-burning library line until filled, with two one-click
  suggestions from catalog data:
  - "US average $6.276 (on-highway, week of Oct 19 2026)", for diesel; gasoline $4.284;
  - a pick from the Location sheet's regional diesel table.
- Either click records the price as a User value.
- A workspace default (Settings tab) prefills new projects.

---

_Not in this plan (catalog reference kept for later):_
- overtime and multi-shift billing;
- owned standby and delay factors for pooled idle time;
- rental surcharges (damage waiver, environmental fee);
- crane assembly and counterweight hauls;
- licensed data sources;
- a Python twin of the engine.

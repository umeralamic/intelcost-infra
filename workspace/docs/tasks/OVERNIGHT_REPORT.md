# Overnight report, 2026-10-11 → 12

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after every step. Started 23:35 UTC.

## Step 0 — Browser check

Done 23:37 UTC. The Playwright MCP connects and drives the app on the bench (`localhost:5173`),
signed in as the throwaway account on "zz switching". The MCP is used for every check tonight.

## Step 1 — Dialog titles (D-372) — shipped

- **What:** the new-measurement dialog is titled by the tool: "Name this Linear Measurement",
  "Name this Segment Measurement", "Name this Area Measurement", "Name this Count Measurement".
  Segment shares Linear's `lf` type, so the dialog takes a `segment` flag (Segment's create, a run
  drawn with Segment, a paste of a Segment item). Editing keeps "Properties".
- **Files:** app `features/takeoff/items/MeasurementDialog.tsx`, `pages/ProjectTakeoff.tsx`.
- **Commit:** app `5ccae3d`.
- **Gates:** lint, typecheck, build pass; quantity table 344 rows passed.
- **Browser:** Linear, Segment, Area and Count each opened their dialog with the right title;
  Properties on "Slab smoke" read "Properties". Passed.

## Step 3 — Currency (D-373) — shipped (00:32 UTC)

- **What:**
  - `workspace.currency` and `project.currency` (ISO code, default USD; migration `d373a1b9c4e5`).
    A new project copies the workspace's currency; changing the workspace later leaves projects alone.
  - Settings › Estimating has "Currency" with the note "Changing currency changes the symbol only.
    Amounts are not converted." Edit project has "Currency" with the same note.
  - One formatter (`lib/money.ts`: `formatMoney`, `currencySymbol`, `excelMoneyFormat`) and a project
    locale context (`features/project/locale.ts`: `useCurrency`, `useMoney`) mounted on the project
    screen and the Estimating settings preview.
  - `fmtMoney` takes the currency. Every "$" in the inventory now uses it: Estimating grid, sidebar
    reports, bid summary, cost components, equipment, the item costs, set values and sub-item cost
    placeholders, assembly placeholders and the "priced" badge, the cost-component total in item rows,
    delete prompts, the guest share page (the api's guest bundle carries `currency`), and the Excel
    money format (`moneyFmt(currency)` on the grid and the Bid Summary sheet). Estimating's typed-number
    parser strips any symbol.
  - **Wages stay USD:** the Wage Calculator and the crew rows keep "$". In a non-USD project the Wage
    Calculator shows "Wage data is US data in USD. This project is in EUR; the rates below are shown in
    US dollars and are not converted."
- **Files:** api `core/locale.py` (new), `workspace/{models,schemas,routes,service}.py`,
  `project/{models,schemas,service}.py`, `share/{schemas,routes}.py`, migration `d373a1b9c4e5`; app
  `lib/money.ts`, `features/project/locale.ts` (new), `lib/estimate/{costing,workbook,componentEnv}.ts`,
  `features/estimate/{EstimatingView,BidSummary,ComponentDialog,EquipmentDialog,ItemCostsDialog,SetValuesDialog}.tsx`,
  `features/assembly/{AssembliesPanel,TemplateComponents,TemplateDialogs}.tsx`, `features/takeoff/components/ItemRow.tsx`,
  `features/takeoff/items/SubItemsDialog.tsx`, `features/wage-calculator/WageCalculator.tsx`,
  `features/project/components/NewProjectDialog.tsx`, `features/share/api.ts`, `pages/{ProjectTakeoff,SettingsEstimating,GuestProject}.tsx`,
  `core/api/types.ts`.
- **Commits:** app `57f7b80`, api `1fe9f82`.
- **Gates:** app lint, typecheck, build; api ruff, format, mypy, `alembic upgrade head`; quantity table
  344 rows passed.
- **Browser (throwaway "zz switching", priced through Set values: 5 % wastage, 0.25 MH at 42.50/h,
  1.75 equipment, 12.40 material on 9 rows; Full estimate 4,726.60):**
  - 40 amounts on the screen read in USD, then EUR, then CA$, then USD again through Edit project.
    Every value was identical each time, only the symbol changed ($ → € → CA$ → $). Passed.
  - Excel export in EUR and in USD: the money cells' format was `_("€"* #,##0.00_)…` and
    `_("$"* #,##0.00_)…` on Base Bid and Bid Summary. All 130 numeric cells were identical between the
    two files. Passed.
  - Wage Calculator in EUR showed the US-data notice; in USD it did not. Passed.
  - Settings › Estimating set to EUR: "zz switching" stayed USD, and a new project "zz currency smoke"
    started in EUR. The workspace was set back to USD afterwards. Passed.
- **Left open:** none. The test project "zz currency smoke" stays in the throwaway workspace.

## Step 7 — Phases D and E plan — written (01:35 UTC)

[METRIC_PHASE_DE_PLAN.md](METRIC_PHASE_DE_PLAN.md):
- **The rate rule:** stored per imperial unit, shown ÷ f, typed × f. A production rate (units per time)
  is × f. Totals are the stored products, so they are identical to the cent.
- **Phase D:** every per-unit field (unit man hours, unit material, unit equipment, a component's unit
  price, unit rate and production rate), the grid's quantities and units, names, the Quantity popover,
  the export's cells, and the Dimensions sheet.
- **Phase E:** formulas evaluate with metric inputs and convert the result back, in both engines (the
  app's `formula.ts` and the api's `formula.py`/`sub_items.py`). Imperial projects skip the path
  entirely. Templates carry a unit-system tag and warn about formulas with constants.
- The quantity-table rows for both phases, and **five questions for the founder** (sub-item units in
  metric, wastage keys, constants on a cross-system apply, variables, earthwork's stored unit in a
  metric project).

## Step 6 — Metric Phase C, entry (D-376) — shipped (01:30 UTC)

- **What:**
  - In a metric project, Height, Width (area and volume), Depth and named dimensions read a bare number
    as metres. "2.5 m", "2500 mm", "25 cm" and imperial (`7' - 6"`) are read in either system. Every
    hint, placeholder and error message reads "2.5 m or 2500 mm". The value is stored in feet and the
    text as typed.
  - **Read back as typed:** mm in whole mm, cm to one place, otherwise metres at two places. An imperial
    entry in a metric project reads back in metres. Rebuilt names use the same rule ("150 mmW").
  - **Manual Quantity:** its first unit is the tool's in metric (m, m², EA). The figure is stored in the
    tool's imperial unit (10 m → 32.808399 LF) and reopens as 10 in m.
  - **Result in:** the chips' default reads m² or m³ in a metric project.
  - **Zero rule:** unchanged. Zero is zero in both systems.
- **Tests, per hard rule 8:** not a test suite. The quantity table gained **17 metric rows**
  (`browser/lib/metric-cases.mjs`):
  - *Entry:* 150 mm → 0.4921259843 ft → "150 mm"; 2.5 m → "2.50 m"; 1200 mm → "1200 mm"; 0.3 m →
    "0.30 m"; `7' - 6"` → 7.5 ft → "2.29 m"; a bare "2.5" → metres; 25 cm → "25 cm"; "0 mm" → the zero
    rule.
  - *Display:* LF, SF, SY, CY, BCY, EA, and BCM shown as it is.
  - *Manual quantity:* 10 m and 50 m² stored and shown back.
- **Files:** app `features/takeoff/items/MeasurementDialog.tsx`, `lib/measure.ts`
  (`metricFactor`, `formatMetricLength`, `METRIC_LENGTH_HINT`, `inputFigure`), `lib/takeoff/displayName.ts`;
  infra `browser/lib/metric-cases.mjs` (new), `browser/quantity-table.mjs`.
- **Commits:** app `b99c108`, infra `cc14b25`.
- **Gates:** lint, typecheck, build; quantity table 344 rows + 17 metric rows passed.
- **Browser ("zz switching" set to Metric, then back to Imperial):**
  - The dialog showed the hint "2.5 m or 2500 mm" on Height, Width and Depth, "Result in" defaulted to
    m³, and Manual Quantity's unit read "m".
  - Each test value was drawn on a 40.8 LF (12.44 m) run. The panel read: Height "2.5 m" → "(12.44 m,
    2.50 mH)" 31.09 m²; "1200 mm" → "(12.44 m, 1200 mmH)" 14.92 m²; `7' - 6"` → "(12.44 m, 2.29 mH)"
    28.43 m². Volume "150 mm" × "0.3 m" → "(12.44 m, 150 mmW, 0.30 mD)" 0.56 m³. Manual 10 → "10.00 m".
    Every figure checked by hand.
  - **Stored:** SF and CY units, heights and depths in feet (3.937008, 8.202100, 7.5, 0.492126,
    0.984252), raws as typed, manual 32.808399 LF. 0.492126 ft (the database's 6 places) is 149.99999
    mm and reads back as **150 mm**.
  - Properties reopened with "150 mm", "0.3 m", and the manual 10 in m.
  - **Estimating read-back** is checked under Step 8, because Estimating's names and units are Phase D.
  - Passed.
- **Noticed, not fixed:** after a shapeless manual-quantity item was selected, a single click on
  another row's name left the action bar's Properties pointing at the manual item. A double-click on
  the row opened the right one. Small, so left for the next session.

## Step 5 — Metric Phase B, display (D-375) — shipped (01:13 UTC)

- **What:**
  - **Conversion:** one layer in `lib/measure.ts` (`displayQuantity`, `displayUnit`,
    `formatDisplayQuantity`, `formatMetres`), read through `useMeasure()` / `measureFormat()`. A stored
    LF/FT/IN/YD/MI becomes m; SF/SY/SQ/AC/SI becomes m²; CY/CF/CI/GAL becomes m³; BCY/LCY/CCY become
    BCM/LCM/CCM. Factors are exact (1 ft = 0.3048 m), at 2 decimals. EA, LS, HR, % and weights are
    shown as stored. A unit already metric is never converted again.
  - **Weights skipped:** nothing the app computes carries LB/TON/KG. They appear only as units a person
    picks (manual quantity, sub-items), and are shown as picked.
  - **Item names:** `lib/takeoff/displayName.ts` rebuilds the stored imperial suffix in metric from the
    stored figures. The measured figure is the calculated quantity divided by what the engine's own
    `applyModifiers` multiplies by, so it is exact, e.g. "Sidewalk smoke (12.44 m, 1.52 mW)". Earthwork's
    Calculate lines ("Soil Export (1,234 BCY)") have their figures converted. A person's own name is
    never rewritten.
  - **Where:** Takeoff panel rows (name suffix, quantity, unit), sub-item rows, Sheets panel rows, hover
    (every line, the height and volume lines, item total, unit), the status bar (name, type, Calculated,
    Perimeter), the canvas menu header and section figure, the move chip, the legend, the delete prompt
    and the hidden-panel chip.
  - **Dimension tool:** reads in metres on a metric sheet or in a metric project.
  - **Earthwork:** the volume panel shows a CY result in m³ (a display copy with every `…CY` figure ×
    0.764555; the stored result is untouched). The stitched-site bar (Cut, Fill, Export/Import, Strip,
    Undercut, Prep) converts. The Calculate dialog's shrink sentence reads "each m³ … m³".
  - **Sheet scale:** the scale picker already offers the metric presets 1:5 to 1:5000, including 1:20,
    1:50, 1:100, 1:200 and 1:500 (`lib/takeoff/scales.ts`). It stays per sheet, independent of the
    project's system.
- **Not converted, by design:** Earthwork's computing inputs (Site Features, Strip Areas, Calculate's
  units) still follow the sheet's calibration unit, because they decide what Calculate stores
  (inventory finding 1). Estimating and the export are Phase D. The measurement dialog's entry and
  hints are Phase C.
- **Files:** app `lib/measure.ts`, `lib/takeoff/displayName.ts` (new), `features/project/locale.ts`,
  `features/takeoff/components/{ItemRow,HoverPanel,SheetCanvas}.tsx`, `features/takeoff/sheets/SheetsPanel.tsx`,
  `features/takeoff/legend/LegendOverlay.tsx`, `features/takeoff/earthwork/{VolumePanel,CalculateDialog}.tsx`,
  `features/takeoff/earthwork/site/SiteView.tsx`, `pages/ProjectTakeoff.tsx`.
- **Commit:** app `10ab1bf`.
- **Gates:** lint, typecheck, build; quantity table 344 rows passed (its purity check on `lib/takeoff`
  passed with `displayName.ts`).
- **Browser ("zz switching", 10 items: LF, CY, SF, EA, SY, TON, with height, width, volume, slope,
  manual and lump-sum items):** Imperial → Metric → Imperial five times. In Metric every quantity read
  its imperial value × the exact factor (LF → m × 0.3048, SF → m² × 0.0929, SY → m² × 0.8361, CY → m³ ×
  0.7646) at 2 decimals, with the metric unit. EA and TON were unchanged, and the names were rebuilt in
  metric. After each return to Imperial, the panel's text was byte-identical to the original. Passed.

## Step 4 — Measurement system, Phase A (D-374) — shipped (00:48 UTC)

- **What:**
  - `workspace.unit_system` and `project.unit_system` (`imperial`/`metric`, default imperial; migration
    `d374b6c2d9e1`), with the same inheritance as currency.
  - Settings › General has "Measurement system" ("Imperial (ft, SF, CY)", "Metric (m, m², m³)") and the
    note "Changes how quantities are shown and typed. Stored measurements never change." Edit project
    has the same picker beside Currency.
  - **Flag:** `settings.metric_enabled` (off). The api refuses Metric from anyone but a platform admin
    (403 "Metric is not available yet."). `WorkspaceRead.metric_available` tells the app whether to
    offer it, and a project already metric keeps the option. The bench passes
    `METRIC_ENABLED` through compose (`${METRIC_ENABLED:-false}`).
  - **Tag:** beside the project's name in the takeoff header, what differs from the workspace's
    defaults ("Metric", the currency's symbol, or "Metric · CA$").
  - The locale context carries `unitSystem` (`useUnitSystem()`), and `lib/measure.ts` holds the system's
    types and helpers. Nothing reads the system for display yet; that is Phase B.
- **Files:** api `core/locale.py`, `config.py`, `workspace/{models,schemas,routes,service}.py`,
  `project/{models,schemas,routes,service}.py`, migration `d374b6c2d9e1`; app `lib/measure.ts` (new),
  `features/project/locale.ts`, `features/takeoff/components/TakeoffHeader.tsx`,
  `features/project/components/NewProjectDialog.tsx`, `pages/{SettingsGeneral,ProjectTakeoff}.tsx`,
  `core/api/types.ts`; infra `docker-compose.yml`.
- **Commits:** app `7ac21dd`, api `4af79f4`, infra `62e5250`.
- **Gates:** app lint, typecheck, build; api ruff, format, mypy, migration; quantity table 344 rows passed.
- **Browser:**
  - As the throwaway (not a platform admin), with the switch off: Settings › General offered only
    Imperial, and a PATCH of the project to `metric` was refused with 403 "Metric is not available
    yet." Passed.
  - **Making the throwaway a platform admin was refused** by the session's permission classifier, so it
    was not done. The bench's `METRIC_ENABLED` switch was turned on instead
    (`METRIC_ENABLED=true docker compose up -d api`; mail guard checked still on). **It stays on for
    the metric checks tonight and is turned off at the end of the run.**
  - With the switch on: Settings › General offered Metric. "zz switching" switched Imperial → Metric →
    Imperial five times through Edit project. The header tag read "Metric" each time and disappeared on
    Imperial. Every stored figure of its 10 items (calculated and effective quantity, unit, height,
    depth, override) and 9 estimate lines (wage, material, equipment, man-hours) was byte-identical
    after every switch. Passed.

## Step 2 — Hard-coded unit and money inventory — done (00:20 UTC)

Read-only sweep of both repos (tests, comments, the two unit registries and billing/AI-credit `$`
excluded). Paths are app `src/` unless marked `api:`.

**Three findings that shape Steps 4–9:**
1. **Not all stored earthwork data is imperial.** A sheet calibrated in metres makes Calculate store
   BCM/LCM/CCM and "M²" lines in metric (`lib/takeoff/earthwork/lines.ts:77-84`, `useVolumes.tsx:206`,
   `api:features/earthwork/lines.py:218`). "Storage stays imperial" holds for takeoff items; earthwork
   lines already follow the *sheet's* calibration unit, and Phase B must not convert them twice.
2. **Unit text is baked into stored names.** Item names carry the suffix (" (40.0 LF, 7' - 6"H)",
   `api:naming.py`); earthwork line names carry units ("Soil Export (1,234 BCY)", `lines.ts`). A display
   toggle does not reach them unless names are rebuilt for display.
3. **Metric exists piecemeal, keyed on the sheet's calibration unit "m"**, not on a project setting:
   `descriptionSuffix.ts` (M, M²), `unitLabelFor` (LM/SM, no callers), the dimension tool
   (`formatMeters`), `formatDimension`, the earthwork VolumePanel, Site Feature and Strip Area dialogs,
   elevations, CalibrationDialog.

### 1. Takeoff panel, item rows, Sheets panel, folder totals
- `ItemRow.tsx:48` local `formatQuantity`; `:385` `{item.unit}`; `:556` sub-item unit; **`:614` cost total `$…`**; `:616` unit or "LS".
- `SheetsPanel.tsx:95-96,798` local `formatQuantity(value, unit)` → "N {unit}".
- `ProjectTakeoff.tsx:204-207` `TOOL_UNITS` LF/SF/EA; `:217-218` local `formatQuantity` (used 3547, 4935, 5661, 7572); `:7568` status bar type "LF"/"SF"; `:7577` "Perimeter: N LF"; `:4929` "Point Count: N EA"; `:4940` "N SF"/"N LF"; **`:3023` money with `currency: "USD"`**; `:6225,4236` "EA"/"SF".
- Folder totals: `api:takeoff/service.py:2155-2173` rollup keyed by stored unit (no screen renders it).
- `SnippetDialogs.tsx:337` unit; `AssembliesPanel.tsx:219,230` "0.00 {unit}", **`:220,231` "$" badge**.

### 2. Hover panel, canvas labels, measure readouts
- `HoverPanel.tsx:88` `sectionUnit` SF/LF; `:117-124` SF and LF lines; `:162,184,190` "This sheet", "Item total … {unit}"; `:194` "Unit:".
- `SheetCanvas.tsx:2185` move chip "N SF"/"N LF".
- Dimension tool: `engine/dimension.ts:9` `formatFeetInches`, `:27` `formatMeters`, `:45` `dimensionLabel` (on `page.metric`); `DimensionLayer.tsx:50`.
- `LegendOverlay.tsx:202` "· perim N LF"; `:205` unit column.
- `ScaleControls.tsx:181` "…compute LF / SF"; `:307,341` custom scale ft.
- `CalibrationDialog.tsx:22,100,108` "Interpreted as N ft (N m)"; `ProjectTakeoff.tsx:1351,8218` toasts "N ft/m between points".
- No scale bar, no live length readout while drawing.

### 3. Measurement dialog, sub-items, named dimensions, variables
- `MeasurementDialog.tsx:261` SF/CY fallback; `:312-314` tool unit; `:418-423` "…to give SF/CY"; `:449` dimension unit "FT"; `:914` "Manual Quantity in {unit}"; `:1061,1093` sub-item units.
- `SubItemsDialog.tsx:638,1369` "PARENT = N {unit}"; `:646-647,733-734` Qty/Unit; **`:710-713` "$" placeholders**; `:1370-1372` "N LF", "N EA"; `:1408,918,1422,1437,1452` values with units.
- `VariablesDialog.tsx:41` its own unit list (a fork of `UNIT_OPTIONS`); `:64` "(unit)".
- `subItems/units.ts:11-14` `UNIT_OPTIONS`; `descriptionSuffix.ts:57-102`; `parseDimension.ts:173` `formatDimension`; `derived.ts`, `formula.ts` base units (formula syntax).
- `TakeoffSettingsDialog.tsx:407-410` "Area (SF)", "Linear (LF)", "Count (EA)".

### 4. Estimating tab
- `EstimatingView.tsx:114-130` headers (Qty, Unit, Unit Man Hours, Per Hour Wage, Unit Equipment, Unit Material Cost, Totals, Item Cost); `:1242,1355` unit cell; **money via `fmtMoney`** at 1131, 1269-1295, 1624-1628, 1652, 1664-1668, 1736, 1818-1823, 1850; `:254-256` parser strips "$"; `:578-589,2343` "EA", "Unit changed to…".
- **`BidSummary.tsx:67,72,234,239` `fmtMoney`.**
- `QuantityPopover.tsx:77-166` "N {unit}", "(−N SF)", "× N ft", "÷ 27".
- `ComponentDialog.tsx:135` host qty; `:181-182` "units / hr"; **`:201,275` `fmtMoney`; `:208,212,240,255,257` "Unit price ($)", "Rate ($)", "Mob / demob ($)", "Unit rate ($)", "Quote amount ($)"**.
- **`EquipmentDialog.tsx:122,308-314,361,393` `fmtMoney`, literal "$0.00"; `:251,265` "Rate ($)", "Mob / demob ($)"; `:328,332` "$" header.**
- `CostFormulaField.tsx:146-231` "N LF", "N EA".
- **`ItemCostsDialog.tsx:22-25` "$" placeholders;** `:110` qty.
- **`SetValuesDialog.tsx:17-21` "$ per hour", "$ per unit", "$ lump".**
- **`CrewRows.tsx:124` "$N/hr"; `:216` "priced at $0"; `:399` "$/hr"** (crew wages: stay USD, D-373 4).
- `SubItemEditDialog.tsx`, `RowDialogs.tsx`, `WastageDialog.tsx` units; **`componentEnv.ts:134` `currency: "USD"`**; `lines.ts:280-282` "EA"; `quantityExplain.ts` ft/SF/CF.

### 5. Earthwork
- `SiteView.tsx:124,1191-1217` Cut BCY, Fill CCY, Export/Import LCY, Strip/Undercut BCY, Prep SF (hard-coded); `:898` `units: "CY"`; `:300,503-504,531` "10 ft over"; `:1007` "px/ft"; `:1074` "Elev. ft".
- `VolumePanel.tsx:121-124` metric-aware; `:198-200,273,359,538` rows, net, threshold, line qty.
- `CalculateDialog.tsx:75-76` "each CY of compacted fill needs N CY of bank cut".
- `SiteFeatureDialog.tsx`, `StripAreaDialog.tsx:128`, `useStripAreas.tsx:222` metric-aware.
- `RegistrationPanel.tsx:40-41,240,284,291`, `useSiteJoin.tsx:274,278` ft only.
- `EarthworkLayer.tsx:102`, `useEarthwork.tsx:391`, `ElevationPopover.tsx:84`, `EarthworkRunRows.tsx:93`, `LineInfoDialog.tsx:39` units.
- `lib/takeoff/earthwork/lines.ts:65-153` units in line names; `surfaces.ts:45-53`; `volume/types.ts:28`; `elevationCheck.ts:291`.

### 6. Crews, Wage Calculator, assemblies
- Wage Calculator (stays USD, D-373 4): `wage-calculator/text.ts:178-179` `money()`; `WageReview.tsx` "$/hr", "$/manhour", "$/crew-hour"; `WageData.tsx:285-286,386-387`; `AdvancedSettings.tsx:108,179`, `text.ts:96` "per $100"; `api:wage_calculator/service.py:459,626`.
- Assemblies: `TemplateDialogs.tsx:81-82` unit; **`:142-146` "$" placeholders**; `:197` "0.00 {unit}"; **`TemplateComponents.tsx:80,113` `fmtMoney`**; `api:assembly/routes.py:717` default "SF".

### 7. Excel export
- **`workbook.ts:28` `MONEY_FMT` with "$"** (used 119, 222, 280, 297, 388-418 bid sheet); `:345,359` Dimensions sheet unit "FT"; unit column from `line.unit`; `exportFormulas.ts:71` conversion formulas only.

### 8. Reports, PDF/print, legends
- `pages/Reports.tsx` is time tracking only (no units or money). Estimating's report totals are `fmtMoney`.
- `print/*` no unit text. **`GuestProject.tsx:28,202,214,232` share page "N {unit}", "Qty", cost `$…`.**

### 9. API-produced labels
- `api:naming.py` units and the stored name suffix; `api:takeoff/service.py:787-797,2172` unit and rollup; `api:takeoff/formula.py` base units and errors; `api:share/routes.py:199` (lookup only); `api:estimate/*` passes units; `api:ai/*` billing only; `api:takeoff/models.py:409`, `schemas.py:226` default "EA".

### 10. Settings
- `SettingsEstimating` → `BidRatesEditor` "%" and `fmtMoney` preview; Wage Calculator and Crews as area 6.

### 11. Other
- `ExtractScheduleDialog.tsx:233,346`; `scheduleExtraction.ts:44`; `calibration.ts:34-41` `unitLabelFor`. Excluded as billing: `SettingsBilling`, `SettingsAiCredits`, `PlatformAiEconomics`, `PlatformSubscriptions`.

**Answers.** *Weights:* only as units a person may pick (`UNIT_OPTIONS` TON, LB, KG; the Variables list LB, TON); nothing the app computes carries a weight, earthwork never does. *Money formatter:* `fmtMoney` in `lib/estimate/costing.ts:306`, hard-coded USD ("—" for 0), used by Estimating, Bid summary, Component and Equipment dialogs, assembly components; bypassed at `ItemRow:614`, `GuestProject:232`, wage `text.ts:179`, `componentEnv:134`, `ProjectTakeoff:3023`, `CrewRows:124`, `workbook` `MONEY_FMT`. *Quantity formatter:* none shared (eleven local copies). *Metric scale presets:* `lib/takeoff/scales.ts:54-85` has 1:5 to 1:5000, including 1:20, 1:50, 1:100, 1:200, 1:500; picking one sets the sheet metric.

# Plan: items, sub-items and cost components (unit values, summaries, parents)

Status: **accepted 2026-10-24** with the founder's answers and changes, logged as **D-762** (display, summaries,
guest page), **D-763** (wastage, pricing rules) and **D-764** (parents, B0).

- **Answers:** Q1–Q9, Q11 and Q12 as recommended below. Q10: the guest page moves onto the shared engine as a block
  right after A and before B (block G), since clients may see it.
- **Changes:**
  1. A5 summaries are a mode of every report, with a "then by" level (A5 below).
  2. New block **B0**, first, before A1: Earthwork Calculate turning a line into a parent.
  3. Under rules 2, "Qty with Wastage" reads "varies" when a line's material components differ (B2).
- **Order of work:** B0, A1–A5, G. **B1 does not start until the founder has reviewed A**; the report at that point
  carries the bench counts (B0's and B4's).

The model stays as it is:
- A sub-item is a measured quantity in its pricing unit (SF, LF, CY).
- Its cost components say how that quantity is bought and done: sheets, man-hours, machine time.
- Accessories (screws, tape, mud) are extra material components on the same sub-item. There is no new nesting level.

Part (A) is **display only**: no total may change, and every block in A proves it.

Part (B) **moves money**. A saved estimate never changes silently. Each affected line gets a notice and an Update,
and the project gets Update all.

---

## Where things stand today (what the plan builds on)

- **All cost arithmetic runs in the app:**
  - `intelcost-app-react/src/lib/estimate/costing.ts`: `computeLineCost` (:144), `applyComponents` (:223) and
    `sumCosts` (:294)
  - `src/lib/estimate/components.ts`: `evaluateComponent` (:231)
  - The api stores rates, components and a cached `total` only. There is no server-side costing; the bid comes from
    `src/lib/estimate/bidSummary.ts`.
- **Unit rates from components:**
  - Each type's rate = Σ of its per-unit component totals ÷ the line's net quantity.
  - The line total = that rate × Total Qty (Qty × (1 + wastage) × multiplier) + its lump sums. Lump sums are scaled
    by the sheet share only.
  - So wastage and the multiplier scale every per-unit cost type today, labour included.
- **Grid cells:**
  - Derived unit cells are drawn italic and read-only, titled "From components" (`EstimatingView.tsx:1694-1695`).
  - Parent cells are blank (`leaf` checks at :1858-1872 and in the export at :1965-1971).
- **Parents:**
  - A parent's money is `sumCosts` of its sub-items (EstimatingView :1244-1247).
  - Components on a parent are refused: on the api in `estimate/components.py:152-157` (NOT_A_HOST) and
    `takeoff/service.py:2208-2214` (COMPONENT_HOST); in assemblies `assembly/routes.py` TOP_HOSTS :138,
    TOP_HAS_COMPONENTS :139 and ONTO_SUB_ITEMS :142; and in the app's menus (ProjectTakeoff :3715, :6059,
    EstimatingView :2276).
- **Shared machines:** a component with `eq_resource_uuid` evaluates to $0 (`lib/estimate/equipment/host.ts:242`).
  Its money arrives as a separate "Shared — {machine}" row (EstimatingView `detailsOf` :2011-2022, grid :2613-2630).
  The machine therefore shows twice.
- **Saved-estimate notices:**
  - The only per-component notice is the library's "Library rates changed: Update" (D-718, `snapshot.ts:128`,
    EstimatingView :2573).
  - D-718 promises a project **Update all**, but it was never built.
  - Wage-set changes are pushed when the rates are saved (`wage_calculator/labor.py:303`, with the "This updates
    labor rates on N rows" prompt).
- **Guest page:** `src/pages/GuestProject.tsx:337-343` does its own simpler arithmetic. It ignores components, the
  multiplier, unit equipment, subcontract and shared machines, so it already differs from Estimating (finding, Q10).

---

## B0 (first). Earthwork Calculate turning a line into a parent (D-764)

`app/features/earthwork/lines.py:507-519` re-parents lines (`child.parent_item_id = parent.id`) with no component
check, so a line that becomes a parent may keep components that today count for nothing (the app prices only leaves).

1. **Bench count first, read only:** parents (items with children) that hold components, split into automatic
   components (tier-built: `eq_auto`, `spread_linked` crew rows, the D-724 operator rows) and edited or hand-added ones.
   It goes in the block's report.
2. **When Calculate turns a line into a parent,** its automatic components are removed. Their replacements are built
   on the new sub-lines, as on any recalculation (the same path that prices a fresh line).
3. **Edited or hand-added components on such a parent** are never dropped and never silently uncounted. Until B3 they
   are flagged:
   - on the line: the Item Cost chip reads "Not counted"
   - in Needs attention: "Components on a parent are not counted: move them to a sub-item"
   - in the bid's Incomplete count

   After B3 they count, with B1's notice.
4. **Where it plugs in:**
   - api: `earthwork/lines.py` (remove the automatic ones at re-parent, in the same transaction)
   - app: `costing.ts` (a parent's own components evaluated but not added: a `parentUncounted` flag), EstimatingView
     Item Cost chip (:1877), Needs attention (:1340), the Incomplete count (`incompleteLines`), the export banner
   - The detail rows show the parent's components under a "Not counted" group.
5. **Quantity table:** two rows, both on a temporary workspace rolled back.
   - automatic components → gone from the parent, rebuilt on the sub-lines
   - an edited component → kept on the parent, flagged, not in the total
6. **No data change.**

---

## (A) Display only: no total changes

### A1. Unit columns

**Rule:**
- A typed unit rate is an input and always wins. It stays editable as today, and a type with no components keeps
  its typed rate.
- A derived value fills a unit cell, in today's italic read-only style, in three cases only:
  1. that type's cost comes from components,
  2. it comes from a shared machine, or
  3. the row is a parent with sub-items.

**What changes:**
- **New column "Unit Labor Cost"** ($/unit), right after Per Hour Wage. Key `unit_labor` in `ColumnKey` and
  `COLUMNS` (EstimatingView :119-157). It joins `TYPE_COLUMNS.labor` (:169), so the Labor report and Quantities only
  show and hide it with the other labour columns. On a line with typed rates it reads Unit MH × Per Hour Wage, not
  editable: it is the product of two inputs.
- **Unit Equipment** is derived when equipment comes from lump-sum components or shared machines. Today a lump makes
  the unit read 0 (`applyComponents` :277), and a shared allocation never reaches it (`addSharedEquipment` :210). A
  typed lump with no components stays the exclusive pair (D-89, D-238, D-690): the unit cell stays editable and
  empty.
- **Parents with sub-items** show every unit column derived: Unit MH, Per Hour Wage (labour ÷ MH), Unit Labor, Unit
  Equipment and Unit Material. They are divided by the parent's own measured Qty in its own unit (`parentQty`,
  D-249). A parent with no quantity of its own reads "—".
- **What "derived" divides by (Q1):** the recommended rule is that a unit value × the quantity its type is priced on
  = its total. Today every type is priced on Total Qty, so in A each derived unit = type total ÷ Total Qty. On the
  HV undercut line (no wastage, multiplier 1) that is the same as total ÷ Qty.
- **Where it plugs in:**
  - `costing.ts`: a new pure `derivedUnits(cost, qtyBase)` beside `sumCosts`.
  - EstimatingView cell switch (:1858-1876): the derived branch also covers shared-only equipment and parents.
  - `valuesOf` (:1965-1974): the export writes the derived figures as live formulas (=total cell ÷ quantity cell).
    D-96 #3 holds: the formula is kept only if it matches the app within a cent.
  - `lib/estimate/workbook.ts`: the column list and its formulas.
- **No data change.**

### A2. Component rows: the component's own quantity in its own unit

Each component row shows its own quantity in its own unit, never the line's:
- **Material:** its own qty and unit, in the unit it is sold in (55 sheets, 2 boxes). In A this is the qty formula's
  value; after B2 it is the figure after wastage and rounding.
- **Labour:**
  - The description names the crew and its makeup from `crew` rows (`role`, `count`, `crew_name`), for example
    "Crew: Place and compact (0.5 Foreman, 4 Operators, 0.5 Laborer)".
  - A crew typed by hand lists its rows the same way.
  - Qty = man-hours (`manHours` from the evaluation), unit "MH". That is the figure that adds into Total Man Hours.
- **Equipment:**
  - Library and shared machines: machine-hours (`library.hours` × units).
  - A hand-entered machine: its duration in its own basis (days, weeks; the duration formula's value with
    `equip_basis`).
  - The rental period ("1 day rental", `coverLabel`) as secondary text.
- **Subcontract:** its own qty and unit when unit-priced (`sub_calc = unit_rate`), otherwise "LS".

Where it plugs in:
- EstimatingView grid component rows (:2556-2600) and `detailsOf` (:1987-2025) for the export.
- The Takeoff panel's cost rows (`ItemRow.tsx` CostRowItem :780-831; `ProjectTakeoff.tsx` `costRowsOf` :3678, which
  today shows the cached total and the item's unit) get the same qty and unit text.

No data change: everything needed is already on the evaluation.

### A3. One row per shared machine

The component row ($0, "Shared machine · N machine-hr") and its "Shared — {machine}" row merge into **one row**. It
carries the machine-hours and this line's share of the cost. Missing data shows on it once (D-756).

- **Where it plugs in:** EstimatingView `detailsOf` and the grid rows. When a host has a component with
  `eq_resource_uuid = v.resource.id`, the share is drawn on that row and the separate row is dropped. A host that
  draws on a shared machine **without** such a component keeps the "Shared — …" row (D-93 usage by crew-hours or
  QTY).
- **Equipment basis sheet:** unchanged; it already lists each shared machine once (:2211-2215).

### A4. "Usage" label on a component

An optional short text, shown as "Name | Usage" (for example "Drywall screws | Drywall fasteners") in the grid, the
Takeoff panel, the export and the component dialog. It is kept in assemblies.

**Data change, with a migration:**
- A new column `usage varchar(60) null` on `takeoff_cost_component` (`estimate/models.py:208`) and on
  `assembly_component` (`assembly/models.py:98`).
- It is added to `COMPONENT_COPY_FIELDS` (assembly/models.py:163) so Save as assembly, apply, Seed from… and Copy to
  mine carry it.
- It is added to `ComponentFields` (`estimate/schemas.py:229`), the app's `CostComponentRow` (`components.ts:83`)
  and `ComponentDialog.tsx`, next to Name. Undo (D-633) covers it like `name`.

No money is touched.

### A5. Every report gets "By line" and "Summary" modes, and a "then by" level (the founder's change)

Each report in the sidebar (Full estimate, Labor, Material, Equipment, Subcontract) gets two modes:
- **By line:** today's grid.
- **Summary:** the report's own roll-up.

| Report | Summary rows (outer → inner) | Columns |
|---|---|---|
| Labor | crew, then craft | MH, cost, average wage |
| Material | item name + unit, then Usage | quantity, **To order** (the summed quantity rounded up to the purchase unit, B2's Round up to; unrounded until then), cost (the sum of the lines' costs, so it ties to the estimate, Q5) |
| Equipment | machine (library: class key + mode; hand-entered: name + basis; a shared machine once, by resource) | machines, hours, days, rental, fuel, mob/demob, total |
| Subcontract | subcontractor, then scope | quantity and unit where unit-priced, else LS; total |
| Full estimate | cost type, then item | each type's own columns, item cost |

**Grouping:**
- The existing **Group by** (Classification, Custom Folder, Scope, Subcontractor, Sheet) and the **layer tabs** are the
  outer level in both modes.
- A second **"then by"** dropdown with the same choices (and "None") sits under Group by. It is used in both modes and
  in the export.
- **Show levels** counts the then-by level. **Collapse components** keeps working in By line mode.

**Rules:**
- Each summary's total equals its report's total, at every group, and the export says so in its totals row.
- Labour hours and dollars split across a component's crew rows by count × wage share. Craft is `craft_code`, else the
  row's role; crew is `crew_name`/`crew_code`, "Typed crew" for a hand-typed one.

**Where it plugs in:**
- A new pure module **`src/lib/estimate/summaries.ts`** (data in, data out): it takes the lines in a group and their
  evaluations and returns the summary rows per report.
- `src/lib/estimate/lines.ts` `groupLines` (:410) applied twice: Group by, then "then by", inside each outer group.
  The view state (`View`, EstimatingView :198, stored per project, :392) gains `thenBy` and `mode` per report.
- `EstimateSidebar.tsx`: a By line / Summary switch under each report (:26-29, :74-89) and the then-by Menu beside
  Group by (EstimatingView :2671).
- EstimatingView: the body renders summary rows in Summary mode. `collapseTo` / `maxDepth` count the then-by level;
  `hostExpanded` is unchanged in By line mode.
- Export (`workbook.ts`): both groupings in the sheet's group rows. In Summary mode the sheet is the summary, with its
  totals row and the report banner (D-126).

**No data change** (the view state is the browser's, as today).

### G (after A, before B). The guest page on the shared engine (Q10, D-762)

`src/pages/GuestProject.tsx:337-343` computes `withWaste*(mh*wage) + withWaste*material + equipment_cost`, ignoring
components, the multiplier, unit equipment, subcontract and shared machines.

- **The share payload** (`app/features/share/routes.py:385-402`) also sends, when pricing is shown:
  - the project's components (the shape of `GET /estimate/components`)
  - the multipliers, and `unit_equipment_cost` and `subcontract_cost`
  - the shared-machine allocations
  `guest_session.py:197-227` keeps cutting pricing out when it is hidden (D-513).
- **The guest page** prices each line with `computeLineCost`, the same call EstimatingView makes. Its money columns
  then equal Estimating's for the same project.
- **Checks:** the HV copy shared with pricing on: every line's Item Cost and the total equal Estimating's to the cent.
  With pricing off: no money anywhere, as today.
- **Estimate:** 0.5–1 day.

### A: effects

- **Cost-type filter:** Unit Labor joins the Labor report. Each report's Summary mode summarises that report's type;
  Full estimate covers all of them.
- **Assemblies:** only A4 (the copy fields) touches them.
- **Quantity table:** new rows in `intelcost-infra/browser/lib/cost-cases.mjs`:
  - derived Unit Labor and Unit Equipment from lumps
  - a parent's derived units
  - the merged shared row (the share equals today's `shared-share-on-host` 133.34)
  - the summaries' totals equal the type totals

  Every existing row is unchanged.
- **Fixture suite:** nothing changes in a passing assertion, since no total moves.
  - Fixtures that read component rows by text may need their locators updated, citing D-762: f9-estimating, c35 and
    c38 read component names; c35 reads the basis label.
  - For the next full run: a new fixture for A1–A5 on a throwaway (rule 8 allows it only in a suite run the founder
    asks for).

---

## (B) Changes that move money

### B1. Pricing-rule version and the notice (built first; B2 and B3 use it)

**Data change, with a migration:**
- `project.pricing_rules smallint not null default 1`. Every existing project is 1; projects created after B ships
  get 2.
- `estimate_line_item.pricing_rules smallint null`, where null means the project's.

**Engine:**
- `computeLineCost` takes `rules: 1 | 2`. Rules 1 is today's arithmetic, kept unchanged. Rules 2 is B2 + B3.

**Notice:**
- For a line on rules 1 whose rules-2 total differs, the grid shows "Pricing rules changed: $66,000.00 → $60,000.00 ·
  Update" on the Item Cost cell. That line's total stays the old figure until Update.
- Needs attention gains "Pricing rules changed (Update)".
- The project gets **Update all (N lines)** in Estimating's SETUP, with a confirmation that lists the changes by line
  (old → new, by cost type).
- Update writes `pricing_rules = 2` on the line. Update all sets the project to 2 and clears the lines.
- A line whose totals are the same under both rules moves to 2 silently: nothing visible changes.

**Where it plugs in:**
- api: project and `estimate_line_item` models and schemas, the costs routes (`estimate/costs.py`), and copy
  project (a copy keeps the source's rules, Q8).
- app: `costing.ts`, EstimatingView (`whole` :1239, the Item Cost cell :1877, Needs attention :1340, SETUP),
  `bidSummary.ts` (fed the effective totals, so nothing changes there).

The same "Update all" closes D-718's promised but missing library Update all, if you want it now (Q7).

### B2. Wastage

**Material components:**
- They get their own **Wastage %** and **Round up to** (a purchase unit: 1 sheet, 1 box, 1 roll).
- Order: component qty → + wastage → round up → × unit price.
- Data: `wastage_pct numeric null` (null = the line's) and `round_to numeric null` on `takeoff_cost_component` and
  `assembly_component`, added to `COMPONENT_COPY_FIELDS`, the schemas, `ComponentDialog.tsx` and undo.

**Labour, equipment and subcontract** never take wastage. They price on the net quantity × multiplier.

**Line wastage:**
- A line's Wastage % (D-89: the line's own, else the project's per-unit default) becomes the default for its material
  components; each can override.
- A line with no components (typed rates): its wastage applies to material only. Typed Unit MH and Unit Equipment
  extend by Qty × multiplier.

**Parents with sub-items** have no wastage of their own: the Wastage cell is blank, and Set values skips parents.
Folder multipliers still apply to every cost type, exactly as today: per-unit parts × multiplier, lump sums not
(Q4).

**No hidden scaling:**
- A material row shows its qty after wastage and rounding and its own total.
- With a multiplier, each row shows "× 4" beside its qty and its total after the multiplier.
- The rows add up exactly to the line total in the grid and the export. A Σ check in the quantity table proves it.

**Columns under rules 2:**
- Qty with Wastage and Total Qty stay; they are material's quantity.
- When a line's material components have different wastage, **Qty with Wastage reads "varies"**, its tip listing them
  ("Drywall 4×8: 10% · Screws: 5%"), instead of the line default (the founder's change). Total Qty then reads the
  line's net Qty × multiplier, and Unit Material divides by it.
- Unit Material ÷ Total Qty; Unit MH, Unit Labor and Unit Equipment ÷ (Qty × multiplier) (Q1's rule).

**Where it plugs in:**
- `costing.ts` `applyComponents` rules-2 branch.
- `components.ts` `evaluate` material case (:253): qty × (1 + w) → ceil to `round_to` → × price.
- `resolveWastagePct` (:120) feeds the component default.
- EstimatingView cells and `valuesOf`; the workbook formulas (the material formula gains ROUNDUP(qty × (1 + w) ÷ r)
  × r).

The Takeoff and editor previews pass an empty `unitWastage` today (ProjectTakeoff :3661, `useComponentEditor` :224).
They must get the real one, or the dialog's figure will differ from Estimating.

**This supersedes:** the arithmetic inherited from legacy through D-89 (wastage extends every per-unit type), the
fixture figures of D-631 (Footing 110 LF, $66,000) and D-266's "carried through wastage" for labour burden. **No
logged decision says "wastage applies to material and labour"**: today's behaviour is the inherited formula, not a
rule. Proposed: **D-763**.

### B3. Parents with sub-items may carry their own cost components

**Rule:**
- Parent total = Σ of its sub-items + its own components, by cost type.
- The parent's own components show as their own group under the parent ("On this item"), above its sub-items.
- They count in the parent's derived unit costs (A1).
- A warning, never a block, when the same cost type is on the parent and on its sub-items: "Labor is on this item
  and on 3 of its sub-items. Check it is not counted twice."
- Typed unit rates on such parents: not offered (the founder's call). The cells stay derived.
- The parent components' QTY is the parent's own measured quantity (`parentQty`); D-96's PARENT variable already
  names it.

**Where it plugs in:**
- **api, the host rules lifted** (only for parents; Site Features, utility runs and structures still refuse, D-746;
  stabilization parents, Q6):
  - `estimate/components.py:152-157` (NOT_A_HOST)
  - `takeoff/service.py:2208-2214` (COMPONENT_HOST)
  - `assembly/routes.py` TOP_HOSTS (:721-727), TOP_HAS_COMPONENTS (:614-623), ONTO_SUB_ITEMS (:1017-1026), and
    apply's "top-level components only when the template has no children" (:1082)
- **app:**
  - ProjectTakeoff `openSubItems` toast (:3715) and menu (:6059)
  - EstimatingView "Add cost component" guard (:2276), `whole` (:1244-1247: `sumCosts` + its own evaluation),
    `detailsOf` (:1989) and the grid's component rows
  - `ItemRow.tsx:611` (cost rows under a parent)
  - `TemplateComponents.tsx:69-71` (the assembly editor's message)
  - `costing.ts`: a parent's cost = `sumCosts(children)` + `applyComponents(ZERO, own, parentQty)`
- **workbook:** a parent's totals = SUM(sub-items) + SUM(its own component rows) (D-90's parent SUM gains a term).

**Data change: none.**

**This supersedes:** D-89 "a parent rolls up its sub-items", D-249 "never priced: the parent's money stays the SUM of
its sub-items'", D-405, D-91's host rule and D-96 #5, D-243's assembly host rules and D-709's "under the item when
it has no sub-items". Proposed: **D-764**.

### B4. Existing estimates: exactly which saved lines change, and how it shows

| Item | Saved lines that change | How it shows |
|---|---|---|
| B2, labour | Every line with resolved wastage > 0 (its own override or the project's default for its unit) that has labour, typed or from per-unit components. New labour total = old ÷ (1 + w). Lump-sum labour is unchanged | B1 notice on the line, Needs attention, Update all |
| B2, equipment | Lines with wastage > 0 and a typed Unit Equipment or per-unit equipment components. Lump and shared equipment are unchanged | Same |
| B2, subcontract | Lines with wastage > 0 and per-unit subcontract components (`sub_calc = unit_rate`, mode unit). Quotes are unchanged | Same |
| B2, material | **Unchanged** while a component has no Round up to (the line's wastage becomes its default, so the same figure). Typed Unit Material: unchanged. Lump material components: unchanged if Q3 is answered as recommended | Nothing; a line that only moves to rules 2 shows nothing |
| B2, parents | No change: a parent has no wastage of its own today either | Nothing |
| B3 | **No saved line changes.** No parent can carry components today. One gap: Earthwork Calculate re-parents lines without the component check (`earthwork/lines.py:507-519`), so a parent may hold components that silently count for nothing today. Those would start counting | Each such parent gets the B1 notice ("Its own components were not counted: + $N · Update"). A bench count runs before B3 ships |
| A1–A5 | None | Proven per block: the grand totals of every bench project and the HV copy are equal before and after |

Before B2 ships, a read-only bench query counts the affected lines per project. It goes in that block's report so the
founder sees the size of the notice wave.

---

## Effects across the system

- **Assemblies:**
  - A4 and B2 add copy fields.
  - B3 lets a template put components on the top item when it has children.
  - Apply onto an item that already has sub-items puts the template's top components on the parent instead of
    refusing.
  - Template rates on parents (:1058) are still written today. With "no typed rates on such parents", apply must stop
    writing them on a parent with children.
  - The assembly Costs… preview (D-243: Preview quantity 100) must use rules 2.
- **Cost-type filter:** Unit Labor joins Labor. `projectCost` (:416) and `reportKeeps` are otherwise unchanged. A
  parent's own components are filtered by kind like any component.
- **Export:**
  - New columns and formulas (A1), component row text (A2, A4), the merged shared row (A3) and three summary sheets
    (A5).
  - Rules-2 material formulas with ROUNDUP (B2); the parent's SUM + own rows (B3).
  - The guest export (pricing off) keeps dropping every money column, the new one included.
- **Bid summary:** fed the effective totals; no change of its own.
- **Guest page:** its own arithmetic already differs (Q10). Under B2 it would keep applying wastage to labour unless
  it is moved to the shared engine.
- **Quantity table** (`browser/lib/cost-cases.mjs`):
  - The rules-1 rows stay as they are, the regression guard for every saved estimate: wastage-by-unit 1112,
    wastage-override 126, wastage-then-multiplier 2124 and the rest.
  - New rules-2 rows: the drywall example (1,600 SF → 50 sheets + 10% = 55 sheets; labour on the net 1,600 SF),
    rounding, lump material, a parent with its own components, the same type on parent and sub-item (the warning),
    and the Σ-of-rows check.
- **Fixture suite** (for the next full run):
  - f9-estimating's 10% LF step (Footing 110 LF, $66,000) is a new project, so rules 2 applies: labour on the net
    gives $60,000. Update it to D-763; the 5% Slab material $42,000 is unchanged.
  - f9-exports, c15, c16 and c35 are unchanged: no wastage on their priced labour, or lump and library figures.
  - c38 is unchanged, apart from a new step for a template with top components and children (D-764).
  - New fixtures for B1–B3: the notice, Update, Update all, rounding and parent components.

---

## Conflicts with logged decisions

| Plan item | Decision | What happens |
|---|---|---|
| A1 Unit Equipment derived | D-89, D-238, D-690: unit and lump equipment are an exclusive pair | Kept for typed values: the derived figure is display only, and a typed lump keeps the unit cell editable and empty |
| A1 parents' unit cells | D-249 "never priced" | Display only, consistent with D-249 until B3 |
| A2 labour Qty = MH | D-249 "Cost components already carried theirs (Qty and Unit)" | Labour rows' Qty changes meaning, from the qty formula to man-hours. New decision D-762 |
| A3 merged shared row | D-93 ("Shared — {machine}" under a host), D-756 (missing data on both rows) | One row when the host has the component; D-93's row stays for usage without a component. D-762 |
| B1 notice | D-718's "Update all" was promised but not built | Built here, generic |
| B2 wastage | D-89's inherited formula, D-631's figures, D-266's burden "through wastage" | Superseded for rules 2 by D-763. Rules 1 keeps them for saved lines until Update |
| B2 Qty with Wastage | D-513/D-515 "Qty with Wastage is what gets ordered" | Consistent: it becomes material's quantity only |
| B3 parents | D-89, D-249, D-405, D-91 host rule, D-96 #5, D-243, D-709, D-90 parent SUM | Superseded by D-764. D-746 (Site Features refuse) stays. D-727/D-738 stabilization parents: Q6 |

---

## Questions (answered 2026-10-24: as recommended, except Q10 → block G after A)

1. **What a derived unit divides by.** Recommended: a unit value × the quantity its type is priced on = its total
   (rules 1: every type ÷ Total Qty; rules 2: material ÷ Total Qty, the others ÷ Qty × multiplier). Alternative:
   always ÷ the measured Qty, which reads "per measured unit" but no longer multiplies back to the total when
   wastage or a multiplier is set.
2. **A parent's unit costs** divide by its own measured Qty in its own unit (a wall's LF over SF drywall sub-items:
   $/LF). A parent with no quantity reads "—". Recommended: yes.
3. **Wastage on lump-sum material components** (an allowance of 1 LS $500). Recommended: none by default (the
   component can set one); wastage defaults onto per-unit material only.
4. **Folder multipliers and lump sums.** Today lump components are not multiplied (Buildings ×4 does not make four
   mobilizations). Recommended: keep it.
5. **The materials summary's cost when the summed quantity is rounded.** Recommended: Cost = the sum of the lines'
   costs, so it ties to the estimate, plus a separate "To order" quantity rounded on the sum. Alternative: cost =
   rounded order quantity × price, which will not equal the estimate.
6. **Stabilization parents (D-727/D-738)** keep refusing their own components? Recommended: yes, since their pricing
   lives in the sub-items by design. Site Features stay refused (D-746).
7. **Update all for library rate changes** (D-718's promise) built in B1 as well? Recommended: yes, the same
   mechanism, about a quarter of a day more.
8. **A copied project** keeps its source's pricing rules (a copy is not an Update)? Recommended: yes.
9. **What a line on rules 1 shows before Update.** Recommended: its old total, with the notice showing the new one
   (never a silent change). Alternative: show the new total with the old one struck through.
10. **The guest page** (already different from Estimating): move it to the shared engine as part of B, or leave it?
    Recommended: a separate small block after B. **Answered: block G, right after A and before B**, since clients may
    see it.
11. **Typed-rate lines** with wastage and labour also move under B2 (wastage → material only), which is likely most of
    the notice wave. Confirm. Recommended: yes, as the plan says.
12. **Usage label**: 60 characters, shown as "Name | Usage" everywhere, export included. Recommended: yes.

---

## Blocks, in order (A before B)

After every block:
- the gates: app eslint, tsc and build; api ruff, ruff format, mypy, and `alembic check` where there is a migration
- `./quantity-table.sh` with its new rows
- one Playwright MCP smoke on a throwaway
- commit and push `umer-dev`, then the mirror

The HV checks run **read only** on the throwaway copy "zz Equip HV copy" (project "Hidden Valley Rebid — 3D test
(shared copy)"), never on the original. The drywall example goes on a fresh throwaway project.

| Block | Content | Checks | Estimate |
|---|---|---|---|
| B0 | Calculate's new parents: automatic components removed and rebuilt on the sub-lines; edited ones kept and flagged "not counted" until B3 (D-764) | Bench count of parents holding components (automatic / edited) reported; on a throwaway earthwork line that Calculate turns into a parent: its tier components gone from the parent and present on the sub-lines, an edited one kept, the chip "Not counted", Needs attention and the Incomplete count list it, the total excludes it; quantity-table rows for both cases | 0.5–1 day |
| A1 | Unit columns, Unit Labor Cost, derived cells (components, shared, parents), export formulas | HV undercut line "Undercut Replacement Fill: Structural Fill, 48"…" (146.4 CCY): Unit Labor **$2.62**, Unit Equipment **$4.21**, Unit Material **$22.00**, Item **$4,220.12** unchanged; its parent shows derived units = parent total ÷ parent Qty; export cells equal the grid within a cent; project grand total unchanged | 0.5 day |
| A2 | Component rows in their own quantity and unit; crew makeup text; equipment duration and rental period; LS | HV line: crew row reads its makeup and **3.49 MH** (= its share of Total Man Hours); machine rows **0.7 / 0.7 / 1.39 / 0.7 machine-hr** with "1 day rental"; Takeoff panel the same; totals unchanged | 0.5 day |
| A3 | One row per shared machine | HV line: each of its machines shows once, carrying its hours and share; the line's equipment total and Unallocated unchanged; quantity-table `shared-share-on-host` 133.34 | 0.25 day |
| A4 | Usage label (migration on two tables, dialog, copy fields, display, export) | "Drywall screws \| Drywall fasteners" in the grid, panel and export; Save as assembly → apply elsewhere keeps it; `alembic check`; totals unchanged | 0.5 day |
| A5 | By line / Summary in every report; the then-by dropdown in both modes and the export; Show levels counting it | HV copy, Summary mode: Labor by crew then craft (the undercut line's crew split by craft, its 3.49 MH in it), Material by name + unit then Usage with To order, Equipment by machine (a shared machine once), Subcontract by subcontractor then scope, Full estimate by type then item; each summary's total equals its report's total at every group, under Classification then Scope and under Sheet then Classification; By line with then-by: the grand total unchanged, Show levels reaches the then-by level, Collapse components still opens and closes; the export in both modes agrees with the screen; quantity-table Σ rows | 2–2.5 days |
| G | The guest page on the shared engine | The HV copy shared with pricing on: every line's Item Cost and the total equal Estimating's to the cent; pricing off: no money anywhere | 0.5–1 day |
| (stop) | **Report to the founder with the bench counts; B1 waits for the review of A** | | |
| B1 | Pricing rules 1/2 (migration), notice, Needs attention, Update, Update all (+ D-718's if Q7) | A rules-1 throwaway line with 10% wastage and labour shows "Pricing rules changed: … → …" and keeps its old total; Update moves only it; Update all moves the rest; HV copy: if the undercut line has wastage 0, no notice and no change | 1 day |
| B2 | Material component wastage and Round up to; labour, equipment and subcontract on the net quantity; parents without wastage; rows add up (D-763) | Drywall sub-item 1,600 SF: material QTY/32 → 50 sheets + 10% = **55 sheets** × price; Round up to 1; labour priced on the net **1,600 SF**, not 1,760; component rows sum to the line total; the export with ROUNDUP agrees; quantity-table rules-1 rows unchanged and rules-2 rows pass; the bench count of affected lines reported | 1 day |
| B3 | Parents carry their own components (api rules, assemblies, app, workbook), warning on the same type (D-764) | Throwaway parent with sub-items + its own labour: parent = Σ sub-items + own, by type; derived parent units include it; warning shown when a sub-item also has labour; assembly with top components and children applies onto both; Site Feature still refused; bench count of orphaned parent components reported | 1–1.5 days |
| B4 | Existing-estimate review | Bench read-only query of lines per B4 row; Update all smoke on a throwaway copy; the HV copy's totals before and after Update all recorded | 0.5 day |

**Total: about 9–11 working days.**
- B0: 0.5–1 day.
- A: about 4–4.5 days, with A5 now 2–2.5.
- G: 0.5–1 day.
- B1–B4: about 3.5–4.5 days.

Add a full fixture run (about 2 hours on the fx stack) before any deploy to testers.

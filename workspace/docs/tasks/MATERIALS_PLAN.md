# Material cost components for earthwork and utility lines: the plan

> **Plan only, 2026-10-29 (the founder's brief of the same day). Nothing built: no code, no migrations, no
> data changed.** Every project was read only (SELECTs on the bench database; no browser was opened).
> Every open choice is a numbered question with a recommended answer (§9). On the founder's answers: the
> decisions logged as the next `D-NN`s, this file renamed `materials_tasks.md`, a row under In Progress.

## The problem

Calculate prices the crew and the machines of every earthwork and utility line and none of what the
contractor buys: no pipe, no stone, no manhole, no borrow, no tipping fee. An estimator adds each one by
hand, types its price, and converts LF to joints and CCY to tons on paper. A material component left
without a price counts $0.00 without a word.

**Problem → solution.** Calculate also writes the line's material components, each in the unit it is
sold in: joints of pipe, tons of stone, manhole sections, rolls of tape. Each is priced from the project's
own price, else the workspace's, else IntelCost's default × the project's material location factor, and
shows that basis and date. A recalculation moves quantities and keeps what the person typed, added,
edited or deleted. A component with no price reads "Missing price", never $0.

---

## 1. Why there is no material today, and the "Missing data" on the 3D test copy

### 1.1 Calculate never writes a material component

- **Lines** are built in the browser:
  - earthwork lines in `lib/takeoff/earthwork/lines.ts` (`earthworkLines`);
  - utility lines in `lib/takeoff/earthwork/utilities/lines.ts:91` (`utilityLines`) and `:182`
    (`structureLines`).
- **The api** stores them in `earthwork/lines.py:275` (`write_lines`), then calls `attach_lines`
  (`equipment/production.py:1316`).
- **The only code that writes components on a Calculate line is `swap_in_tier`**
  (`production.py:1076`). It writes one `equipment` component per tier machine (`:1108`) and one `labor`
  crew (`:1148`), both `eq_auto`, and stops.
- **A production tier has no material.**
  - `EqProductionTier` (`equipment/models.py:276-297`) has two JSONB columns, `machines` and `crew`.
  - The national starter (`ew_tier_machine`, `ew_tier_crew`, migration `d751a1c3e5f7`) has no material
    table.
  - D-727 defines a tier as "a spread … and a crew".
- **The starter map says so in words** (`seed/earthwork_1/ew_line_map.csv`):
  - `utility_bedding_pipe_zone` is "Inside the pipe crew; bedding stone as material by hand";
  - `stabilize_agent_1/_2` are "Material (cement, fly ash, lime)", mapped to no activity;
  - `geosynthetics` is "Material and labour by hand".
- **D-800** keeps "material components added by hand".

So the gap is by design: F33's production tiers carried labour and equipment, and material was left to
the person.

**Two related findings:**
- **Density is stored but unused.** `ZoneMaterial.density_pcf` (`utility_schemas.py:31`, `trench.ts:41-43`)
  is editable, and its tooltip promises "Density, pcf: gives tons. Blank: no tons."
  (`UtilitySettingsSection.tsx:94`). No code reads it.
- **One pipe crew for every kind.** `utility_pipe` maps to A12, "Pipe crew, gravity storm/sewer", for
  every utility kind: water and force main are priced with the gravity crew.

### 1.2 Why the 30–36 t excavator and the 1–1.25 yd wheel loader show "Missing data"

**The project.** 6467, "Hidden Valley Rebid — 3D test (shared copy)", workspace 3104 (Intelcost Team). It
is the only copy with 12" and 8" HDPE DR 11 at 0–6 and 6–8 ft (items 318265, 318266, 318272, 318273).

**What is on those lines.** Each line has tier 5586 (120–200 LF/day; the line is at 150 LF/day), activity
A12, with:
- `EX-CRAWL-30T` (paces);
- `WL-COMPACT-1Y`;
- the crew.

The machines are shared site resources 151 and 152, both in rental mode with no fuel load set, so "med".
Hours resolve, and there is no Hours or Production problem.

**What each machine is missing: one value, the project's diesel price.**

| Machine | Rates present | Missing |
|---|---|---|
| 30–36 t excavator | rent 1,424 / 4,019 / 10,850; owned 134.52; fuel 4.5 gal/hr (med); lowboy mob present | **Fuel price (diesel)** |
| 1–1.25 yd wheel loader | rent 400 / 1,200 / 3,240; owned 55.34; fuel 0.75 gal/hr (med); tilt-trailer mob present | **Fuel price (diesel)** |

**Why it happens:**
- **The check.** `machineCost` adds "Fuel price (diesel)" to `missing` when
  `lib.setting("fuel_price_diesel")` is null (`lib/estimate/equipment/cost.ts:191`). Through the shared
  resource (`sharedEquipment.ts:191-207`), that flags every line the machine serves.
- **D-723.** The project fuel price starts empty and blocks, so a missing price never prices as a
  silent $0.
- **The data.**
  - 6467 has no `eq_override` rows, and neither does workspace 3104.
  - The national table holds only `fuel_price_diesel_suggested` = 6.276, which pricing never reads.
  - The original (6432) and the later copies (6543, 6557, 6565) each have a project diesel price of
    6.276.
  - 6467 was copied on 2026-10-17, before F33 (10-23), and so never received one.

**Verdict.** This is not a catalog gap, not an id mismatch and not a resolution bug. It is a project
setting that was never filled. Setting the project's or the workspace's diesel price clears it, and the
same gap covers every diesel machine in 6467. **Nothing was changed.**

**A gap the brief did not ask about.** The workspace default only prefills new projects (D-723). Projects
copied or made before F33 that never had a fuel price keep blocking until someone opens Equipment.
Question 22 asks whether to offer the workspace price to them.

---

## 2. What a line creates

### 2.1 The rules for every material component

**Units:**
- The **takeoff quantity** stays on the line, in its own unit (LF, CCY, EA).
- The component carries a **sold quantity**: takeoff quantity × (1 + waste) × conversion, rounded up to
  the sold unit.
- Examples: LF → joints of 20 ft; CCY → TON at a density; SY → rolls of 500 SY.

**Where each component goes.** It sits on the line whose quantity it comes from:
- pipe on the `utility_pipe` LF line;
- stone on `utility_bedding_pipe_zone`;
- imported backfill on `utility_backfill`;
- structure parts on the structure EA line.

**Where rounding happens.** Rounding is **per pipe key and size across the project**, not per line (§2.3).
Every other component rounds on its own line (D-763's "Round up to").

**Every factor below is a default.** Each is editable per project (Utilities settings) and per workspace,
with no new hidden constant.

### 2.2 Which pipes each kind offers (from `catalog.ts`, 286 pickable sizes)

| Utility kind | Pipe families the tool offers |
|---|---|
| Gravity sewer (sanitary) | PVC SDR-35, SDR-26 (D3034); PVC PS 46, PS 115 (F679); RCP Wall B, C; HDPE dual wall (F2648); **and every pressure pipe** (the pressure list includes sanitary) |
| Storm | PVC SDR-35, SDR-26; F679; RCP Wall B, C; HDPE dual wall; CMP 18–8 ga |
| Water (and fire water) | PVC C900 DR 18, DR 14; PVCO C909 165, 235, 305; ductile iron C151 PC200–350; HDPE IPS DR 11, DR 17; copper Type K, L |
| Force main | C900; C909; ductile iron; HDPE IPS DR 11, DR 17 |

Gas, electric, telecom and subdrain are outside this brief (Question 19).

### 2.3 Pipe

**Sold in joints.** Sold quantity = ⌈Σ LF × (1 + waste %) ÷ joint length⌉ per pipe key and size,
summed over every line of the project, then rounded once.

**How each line carries its share:**
- A line's component holds its exact share, LF × (1 + waste) ÷ length, as a decimal.
- The rounding-up from the project total is spread over the lines by their share of LF, so the lines add
  up to the joints ordered.
- The estimate row shows "14.2 of 37 JT ordered".

**Joints counted for joining:** per run, ⌈run LF ÷ joint length⌉.

| Family | Joint (stick) length | Joining | Waste % | Source |
|---|---|---|---|---|
| PVC D3034 SDR-35/26 | **14 ft** (20 ft option) | integral bell, factory gasket | 2 % | M1, M2 |
| PVC F679 PS 46/115 | 14 ft (20 ft option) | bell, factory gasket | 2 % | M1 (assumed same family; check) |
| PVC C900 DR 18/14 | **20 ft** | integral bell, factory gasket | 2 % | M3, M4 |
| PVCO C909 | 20 ft (22 ft on request) | bell, gasket | 2 % | M4 |
| Ductile iron C151 | **18 ft** (3–42"); 20 ft at 4–30" also offered | push-on (C111), gasket supplied with the pipe | 2 % | M5, M6 |
| RCP C76 | **8 ft** | tongue-and-groove; gasket per joint (C443), bought separately | 1 % | M7 (distributor listings 12–54"; no ACPA table read) |
| HDPE IPS DR 11/17 | **40 ft** (50 ft at larger sizes; coils at small sizes) | butt fusion: **equipment**, not material | 2 % | M8 |
| HDPE dual wall F2648 | **20 ft** | bell, factory gasket | 2 % | M9 |
| CMP | 20 ft (not confirmed) | coupling band per joint | 2 % | **none found**; Contech's sheet to read |
| Copper Type K/L | 20 ft straight (60/100 ft coils) | couplings | 3 % | **not researched** (Question 19) |

**Waste % has no published source.** The 1–3 % figures are IntelCost's proposal for cut-offs and the
short pieces at structures. The founder decides them (Question 5).

### 2.4 Fittings

**Counted from the takeoff where it knows them.** It knows less than the brief assumes:

| Fitting | Does the takeoff know it today? | What the plan does |
|---|---|---|
| Joints | Yes (LF and joint length) | Gaskets and lube from the joint count (§2.5) |
| Angle points not at a structure | The vertices exist, used only for geometry (`trenchPlan.ts:40-75`) | **Pressure pipe:** each vertex's deflection rounded to a bend (11¼, 22½, 45, 90°), one bend EA per vertex. **Gravity pipe:** a vertex between structures is flagged "Bend between structures: check the drawing", never priced as a fitting |
| Pipe into a structure | Yes (runs connected within the outside radius + 1 ft, `calculate.ts:327-439`) | One boot or connector EA per connected pipe (§2.8) |
| Service connections (wyes, tees, taps) | **No**: a run has no services | New: "Services" on a run, a count with an optional click per service and the service size. Each makes a wye (gravity) or tap and saddle (pressure) EA (Question 8) |
| Valves, hydrants, tees between runs | No (no valve or hydrant structure) | Out of this plan (Question 9) |

**The fittings allowance:**
- Each pipe line also gets one component, "Fittings allowance", priced as **a % of the line's pipe
  material cost**.
- Defaults: 10 % gravity, 15 % pressure. These are IntelCost's proposal, with no published source
  (Question 6).
- It is editable on the line and as a project and workspace default.
- It covers what is not counted. A counted bend never also counts in the %.

### 2.5 Joining

| Pipe | Component | Kind | Quantity |
|---|---|---|---|
| PVC, PVCO, dual wall, ductile iron | Joint lubricant | material | joints ÷ the joints per container for the size. The table comes from the manufacturers' charts, **not yet read** (Question 7). The gasket is in the pipe |
| RCP | Gasket | material | 1 EA per joint, plus lube as above |
| CMP | Coupling band | material | 1 EA per joint |
| HDPE IPS | **Butt fusion machine** | **equipment** | joints × fusion cycle time ÷ 60 machine-hr. **The library has no fusion machine** (0 hits in release 1), so this needs a library release with fusion classes by size range and their cycle times (Question 10) |

### 2.6 Bedding and pipe-zone stone, and imported backfill

**From the CCY Calculate already writes** (`byMaterial[]`, by zone, material and source).

**Tons:** TON = CCY × 27 × density pcf ÷ 2000. The density is the zone material's own `densityPcf`
(today stored and unused), defaulted per material:

| Material | Default density | t per CCY | Waste % | Source |
|---|---|---|---|---|
| #57 stone (bedding, zone, structure base stone) | 111 pcf | **1.50** | 5 % | M10: 1.35–1.5 t/CY loose dry, "1.4 for planning". Placed is a little higher: IntelCost's proposal, check |
| Sand (zone) | 111 pcf | **1.50** | 5 % | M11: loose dry 1.30–1.35, compacted 1.4–1.6 t/CY |
| Aggregate base (crushed, compacted) | 147 pcf | **1.98** | 5 % | M12: VDOT Section 309, 110 lb per SY per inch = 3,960 lb/CY. Iowa DOT 1B-4 named in a search summary (135 pcf granular subbase), page refused (403) |
| Select / engineered fill (imported) | 120 pcf | 1.62 | 5 % | **No source**, IntelCost's proposal; ask the pit |
| Native | — | — | — | not bought, so no material component |

**Rules:**
- **Blank density:** the material is sold by the CY at its CCY, as the tooltip already promises ("Blank:
  no tons").
- **Imported backfill** is material only when its source is "imported". Native backfill's shortfall
  stays in the site balance, as today.
- **Waste %** is IntelCost's proposal for spillage and over-dig, with no published source.

### 2.7 Tracer wire, warning tape, and the water stretches

| Component | When | Quantity | Sold in |
|---|---|---|---|
| Tracer wire | non-metallic **pressure** pipe (PVC, PVCO, HDPE) by default; gravity off by default | run LF × 1.10 (splices and the rise at valves and boxes; IntelCost's proposal) | 500 or 1,000 ft rolls (Question 11) |
| Detectable warning tape | non-metallic pipe, every kind | run LF × 1.05 | 1,000 ft rolls |
| Foundation stone | where the trench bottom is below design water (`dewateringLF` stretches, `quantities.ts:420-425`) | stretch LF × trench width × depth (default 12") → CCY → TON at the stone's density | TON |
| Trench-bottom geotextile | the same stretches | stretch LF × (width + 2 × the stone depth) ÷ 9 × (1 + overlap 10 %) SY | rolls (Question 11) |

The 10 % overlap is the default F29 already uses for geosynthetics (`overex.ts:243-245`). The foundation
stone and the geotextile are **new quantities** in the engine (§8, block M4), each with a row in the
shared quantity table.

### 2.8 Structures (manholes, inlets)

**Calculate already knows per structure:** type, inside diameter or L×W, wall, rim, floor, sump, VF, base
slab, base stone and connected runs (`structures.ts:51-69`). The structure itself has **no frame, cover,
cone or riser field**.

**Components on the structure EA line:**

| Part | Rule | Unit |
|---|---|---|
| Precast base (with floor) | 1 per structure, base height default 4 ft | EA |
| Riser | VF − base − cone − adjustment, in stocked heights (default 2, 3, 4 ft; producers differ: one prints 2–6 ft, M13) | EA per height, or VF (Question 12) |
| Cone (eccentric) or flat top | 1, cone height default 3 ft; flat top when VF < 5 ft | EA |
| Adjustment (grade) rings | the remainder, up to 12", in 2–8" rings (M13) | EA |
| Frame and cover / grate | 1 | EA |
| Boot or connector | 1 per connected pipe (known) | EA |
| Steps | ⌊(VF − 1 ft) ÷ step spacing⌋, spacing default 12" (check against the local standard) | EA |
| Base stone | from `stoneCF` (already computed) → TON as §2.6 | TON |

**Defaults by structure type.** Inlets and catch basins are a precast box EA plus grate and frame EA,
with risers only for a deep box. A cleanout is a riser pipe and a cap.

**What still needs the founder.** The stocked heights, the cone height and the steps rule vary by
producer and by agency, so each one is a project and workspace setting. The founder's check of M13, and
of ASTM C478 or a regional producer's catalog, sets the defaults (Question 12).

### 2.9 Site lines

| Line (role) | Material component | Conversion | Sold in |
|---|---|---|---|
| Select borrow, import (`soil_import`, LCY) | Borrow at the pit | LCY × loose density (default 1.35 t/LCY, IntelCost's proposal) → TON; or LCY as is when the pit sells by the yard | TON or LCY (Question 13) |
| Export (`soil_export`, `spoils_export`, LCY) | Disposal / tipping fee | LCY × loose density (by layer; default 1.35) → TON; or a fee per load at truck capacity | TON or load |
| Aggregate base (`replacement_fill` and `undercut_replace` with an aggregate material, CCY) | Aggregate base | CCY × 1.98 t/CCY (M12) | TON |
| Lime or cement stabilization (`stabilize_agent_1/_2`, `undercut_agent_1/_2`, TON) | The agent | already TON (area × depth × dry pcf × % ÷ 2000, `stabilization.ts:24-27`) × (1 + waste 3 %, spreading loss, IntelCost's proposal) | TON |
| Geotextile / geogrid (`geosynthetics`, SY) | The fabric | already SY with overlap | rolls |

**Trucking stays equipment.** The haul for borrow and export (A7, A8) is already equipment.

---

## 3. Prices

### 3.1 The order

1. **The project's price.** Typed on the component, or set for the material key in the project.
2. **The workspace's price.** From Settings › Material prices.
3. **IntelCost's default × the project's material location factor.**

**The location factor:**
- It is `1 + project_wage_set.material_amf`, the factor the Wage Calculator already computes per ZIP and
  county (`wagecalc/geo.py:58-62`) and stores on every wage set (`wage_calculator/models.py:147`).
- **No pricing reads it today.** Only `equipment_amf` is wired (D-719).
- With no wage set or no ZIP, the factor is 1.00, shown as "No location: national".

**The resolution copies the equipment library's** (`equipment/service.py:271-308`): field by field, each
value carrying its source, who set it and when.

### 3.2 What a price shows

Each price shows its basis and date on the component, and only there:

- "Project price · typed by A. B. · 2026-10-29"
- "Workspace price · Quote, <supplier> · 2026-10-12 · valid to 2026-11-30"
- "IntelCost default, Material −3 % for 75201 · Oct 2026"

**Defaults stay out of sight, as the brief asks and as D-264 already does for wages:**
- They are **never shown as a list**, never with their source, and never exported.
- The api answers one material key per request, only for a key a component in the project uses.
- Settings › Material prices lists **only the workspace's own prices**.
- **This differs from the equipment library**, whose page shows the whole catalog (D-739). Question 14
  confirms the difference.

**Snapshot, as D-718 does for equipment:**
- A priced component stores the price it used, with its source and date.
- A workspace or default price changed later never moves it by itself.
- It shows "Price changed: Update", and the project gets Update all.

### 3.3 How a workspace saves its supplier prices

**Settings › Material prices.** One self-contained feature folder (`features/material-prices/`), so the
later move under Lists is a route change, as D-722 did for equipment.

**One row per material key:**
- unit price and sold unit;
- supplier (text);
- quote reference;
- quote date and valid-until date;
- note;
- who set it and when.

**Entering prices:**
- typed one by one, or
- **imported** from the supplier's sheet (CSV or Excel), with a matching step that maps each row to a
  material key, as D-728 does for a machine list.
- Rows that match nothing are offered as the workspace's own custom materials.

**An expired price.** A price past its valid-until date still prices, marked "Quote expired 2026-11-30",
and goes in Needs attention.

**The tables** (api, as F33):
- `matlib.mat_item`: the national material keys, read only; release-versioned like `eqlib`.
- `matlib.mat_default`: the default prices, never served as a list.
- `mat_price`: the workspace (and project) prices, one per scope and key; `project_id` NULL is the
  workspace.
- `mat_custom_item`: the workspace's own materials.

**How it joins the Lists library later:**
- Lists (F10, parked under D-287 6) becomes the page for Takeoff templates, Assemblies, Equipment and
  Materials.
- Material prices moves there as one tab.
- Assembly components gain a `mat_key`, so an assembly's material prices from the same resolution
  instead of its own typed `unit_price`.
- Nothing in this plan waits on Lists.

### 3.4 How many default prices, and how to build the starter set

| Group | Keys | Basis |
|---|---|---|
| Pipe, gravity sewer and storm (D3034, F679, RCP, dual wall, CMP) | 145 | the catalog's pickable sizes in those families |
| Pipe, pressure (C900, C909, DI, HDPE IPS) | 97 | the same |
| Copper Type K and L | 20 | if Question 19 keeps copper |
| Joining (lube by size band, RCP gaskets, CMP bands) | ~35 | by size band, not every size |
| Fittings counted (bends ×4 angles, wyes and taps, by size band) | ~40 | by size band |
| Structures (base, riser, cone, flat top, rings, frame and cover, grate, boot, steps; 48/60/72" and the box inlets) | ~45 | |
| Aggregates, borrow, tipping, stabilizers (7 agents), tracer wire, tape, geotextile, geogrid | ~25 | |
| **Total** | **≈ 400**, of which ≈ 330 without copper and with fittings by band | |

**The starter set** (Question 15):
- **Source:** one dated quote sheet per family, from a distributor in one reference market. Public list
  prices are rare: the distributor pages found for this plan read "call for price".
- **Normalising:** each quote is divided by that market's material factor, so the default is national
  and the location factor brings it back.
- **The gaps:** sizes between quoted ones are filled per family by price per LF against OD (or weight),
  fitted from the quoted sizes. A filled price is graded C; a quoted one, B.
- **What the row records:** its date and grade. The source stays internal and is never shown (D-726,
  rule 9).
- **No cost-data publisher's book** is copied: licensing and rule 9 both rule it out.
- **If the founder has no quotes:** the defaults start empty. Every material reads "Missing price" until
  the workspace prices it, which D-723 already does for fuel. That ships with no data work.

---

## 4. Recalculate

**What a recalculation does:**
- Quantities update.
- Prices the person typed are kept.
- Components they added, edited or deleted are kept as they left them.

**How each case is stored:**

| Case | Stored as | What a recalculation does |
|---|---|---|
| Written by Calculate, untouched | `auto_key` set (stable identity, e.g. `pipe:hdpe_ips_dr11:12`, `struct:frame_cover`, `bed:#57`), `user_fields` empty | rewrites quantity, conversion and name; re-resolves the price only if it came from the resolution and the person has not typed one |
| Price typed by the person | `user_fields` contains `unit_price` | quantity updates; price kept |
| Other fields edited (quantity, waste, unit, name) | `user_fields` lists each edited field | the edited fields are kept; the others update. An edited quantity shows "Calculate now has 412 LF: Apply" |
| Added by the person | `auto_key` NULL | never touched (as today) |
| Deleted by the person | a row in `takeoff_component_dismissed` (`takeoff_item_id`, `auto_key`, who, when) | not recreated; "Restore Calculate's materials (2)" on the line brings them back |
| No longer produced (the size changed, the tracer turned off) | — | an untouched auto component is removed; an edited one is kept and marked "No longer in Calculate" |

**Why this needs new storage.** It replaces the line-level `user_edited` switch, which only knows "the
person touched something". It also adds the tombstone that does not exist today: an auto component
deleted now leaves no record (`production.py:1088-1094` deletes every `eq_auto` row and re-adds).

**Equipment and labour under the same rules (Question 16):**
- Recommended: equipment and labour components move to the same `auto_key` / `user_fields` storage in
  block M6.
- `eq_auto` stays readable for the rows already saved.
- **A side finding:** the `eq_auto` docstring says "a user edit clears it" (`estimate/models.py:281-282`),
  but no server code clears it. What protects an edited line today is `estimate_item_spread.user_edited`.

---

## 5. Estimating

**The row:**
- A material component row shows **sold quantity, sold unit and unit price**: "37 JT × $412.00", "128.4
  TON × $38.50".
- Its takeoff quantity sits beside it in grey: "720 LF", "85.6 CCY".
- Pipe shows its share of the project order: "14.2 of 37 JT ordered".

**Where it feeds:**
- **The material column:** the line's Total and Unit Material Cost, through `pricedMaterial`
  (`costing.ts:243-248`).
- **Wastage:** the component's own `wastage_pct`, then rounding (D-763). Wastage applies before the
  conversion, so 2 % waste on 720 LF is 734.4 LF → 36.72 JT, and the order rounds up.
- **The bid summary's sales tax:** on the summed material cost after wastage and rounding (`bidSummary.ts:88`).
- **Pipe across the project:** the rounding-up spread over the lines (§2.3) keeps every report's total
  equal to the joints ordered.

**"Missing price":**
- A component with no price at any level reads **"Missing price"** in the unit-price and material cells,
  never $0.00 or "–".
- The line goes in Needs attention ("2 materials without a price").
- The line's material total and the bid summary read "Incomplete".
- A price typed as 0 is a price ("Confirm none"), and counts $0.

**Today's behaviour, for contrast.** A null `unit_price` counts 0 silently (`components.ts:268`,
`EstimatingView.tsx:3287`). "No rate" in Needs attention fires only when the whole line is $0
(`noneReason.ts:12-13`). Question 17 asks whether "Missing price" covers hand-added material components
too.

---

## 6. Sources (read 2026-10-29)

**How these were read.** Every row below is a web search result's summary of the page: **the page
itself was not opened** unless marked. The founder checks these before any factor is adopted. No
cost-data publisher is named (rule 9). Manufacturers and distributors are named as the pipe catalog
already names them (D-526).

| # | What it supports | Where |
|---|---|---|
| M1 | D3034 standard laying length 14 or 20 ft | Westlake certification PI-CL-014.1 (westlakepipe.com, 2024-10) |
| M2 | D3034 14 ft (submittal), 20 ft (Marion County OR spec), 13 or 20 ft (NMWD spec) | search summary, three agency/submittal PDFs |
| M3 | C900 20 ft ± 1" | San Antonio Water System IFB spec (apps.saws.org) |
| M4 | C900 IB lay length 20 ft (14 ft option); C909 22 ft on request | Westlake MU-PS-001 (2024-10), MU-PS-008 (2025-10) |
| M5 | DI 18 ft nominal 3–42"; 20 ft at 4–30" and 48–64" | U.S. Pipe TYTON JOINT product page (uspipe.com) |
| M6 | DI "18 or 20 feet", push-on per AWWA C111 | Johnstown CO Construction Spec 500 Water |
| M7 | RCP 8 ft, 12–54", ASTM C76 | Ferguson and Fortiline listings. **No ACPA joint-length table found** |
| M8 | HDPE IPS DR 11 40 ft sticks; 50 ft at larger sizes | Ferguson and First Supply listings (ASTM F714 / AWWA C906 cited) |
| M9 | Dual wall 20 ft lengths, 6–60" | First Supply and Consolidated Supply listings (AASHTO M294 / ASTM F2306) |
| M10 | #57 stone 1.35–1.5 t/CY dry, 1.4 for planning; 2,800 lb/CY | engineerfix.com guides; inchcalculator.com (rule of thumb only) |
| M11 | Sand loose dry 2,400–2,700 lb/CY; compacted 2,800–3,200 lb/CY | gambrick.com, hellogravel.com (rule of thumb only) |
| M12 | Aggregate base 110 lb per SY per inch (paid by the ton) | VDOT Section 309 via hrpdcva.gov. Iowa DOT Design Manual 1B-4 (densities for estimating) **returned 403, not read** |
| M13 | Manhole risers 24–72", grade rings 2–8" (one producer); eccentric cone (Wichita standard) | L.B. Foster CXT 60" manhole spec; Wichita public works standard |

**No source found:**
- every waste % and the fittings allowance %;
- the CMP stick length;
- the lube coverage per joint;
- fusion cycle times;
- copper lengths;
- loose borrow and export densities;
- the step spacing.

Each of these is marked "IntelCost's proposal" or "not researched" where it appears.

---

## 7. Data model, in one place

**`takeoff_cost_component`** gains:

| Column | Purpose |
|---|---|
| `auto_key` | Calculate's identity for the component |
| `user_fields` | JSONB list of the fields the person set |
| `mat_key` | the material it prices from |
| `sell_unit`, `sell_factor` | takeoff unit → sold unit |
| `round_scope` | `line` (default) or `project` (pipe) |
| `price_source`, `price_basis`, `price_date`, `price_snapshot` | what priced it, and when |
| `pct_of` | the fittings allowance: % of the line's material of `pct_of` kind |

**New tables:**
- `takeoff_component_dismissed`;
- `matlib.mat_item` and `matlib.mat_default` (release-versioned);
- `mat_price` (workspace and project);
- `mat_custom_item`.

**Pipe catalog** (`catalog.ts`) gains per entry: `jointLengthFt`, `joining` (`gasket_in_pipe`,
`gasket_per_joint`, `band`, `fusion`, `coupling`), `metallic`. Per size it gains `matKey`.

**Zone materials** get default densities (§2.6). Structures get the precast settings (§2.8).

**Rule 2 holds:** every new quantity (joints, bends, sections, tons, the water stretches) is pure in
`lib/takeoff/earthwork/utilities/`, with no React and no network.

**Prices and money stay where they are:** prices resolve in the api, and the arithmetic stays in
`lib/estimate/`.

---

## 8. Blocks, with day estimates

| Block | What | Days |
|---|---|---|
| M0 | The founder's answers logged; catalog fields (joint length, joining, metallic), zone densities, structure settings; quantity table rows for joints and tons | 1.5 |
| M1 | api: `matlib` schema and release, `mat_price`, `mat_custom_item`, resolution with the material factor, one-key routes, permissions, audit | 2.5 |
| M2 | Component model: `auto_key`, `user_fields`, sold unit and factor, project rounding, `pct_of`, "Missing price" in costing, the grid, Needs attention and the bid summary's Incomplete | 3 |
| M3 | Calculate writes materials: pipe, fittings allowance, joining, bedding, zone, imported backfill, tracer and tape (api `attach_materials` beside `attach_lines`) | 3 |
| M4 | New quantities in the engine: joints, pressure bends at vertices, gravity bend flag, boots from connections, precast parts from VF, foundation stone and geotextile in the water stretches; quantity table rows | 3 |
| M5 | Site lines: borrow, tipping, aggregate base, stabilizer agents, geosynthetics | 1.5 |
| M6 | Recalculate: keep rules, the tombstone and Restore, "Calculate now has …: Apply", "Price changed: Update / Update all"; equipment and labour moved to the same storage (if Question 16) | 2.5 |
| M7 | Settings › Material prices: the workspace list, import with the matching step, expiry; the project price in the component dialog with basis and date | 2.5 |
| M8 | HDPE fusion: fusion classes as a library release, hours from joints | 1.5 |
| M9 | Services on a run (count and clicks), wye/tap components (if Question 8) | 2 |
| M10 | The starter price set from the founder's quote sheets (data work, ≈ 330 keys) | 4–6 |
| | **Total** | **≈ 27–29** |

**A first cut of ≈ 13 days:** M0, M1, M2, M3, and M7 without the import. That gives pipe, allowance,
joining (no fusion), stone and backfill in tons, tracer and tape, workspace and project prices, and
"Missing price", with the defaults empty until M10.

**Each block ends** with the gates, the quantity table, and one smoke test on a throwaway account, never
on 6467 or another founder project.

---

## 9. Questions, each with the recommended answer

1. **Where do material components sit: on the existing lines, or on new material lines?**
   **Recommended: on the existing lines** (pipe on the pipe LF line, stone on the bedding CCY line), so
   each line's unit cost includes what it consumes and the reports group as today.
2. **Pipe rounding across the project, spread over the lines by LF share (§2.3)?** The alternative is one
   "Rounding to full joints" adjustment line per pipe size. **Recommended: spread**, so no line is a
   pure rounding row.
3. **Default joint lengths:** D3034 14 ft, C900 20 ft, DI 18 ft, RCP 8 ft, HDPE IPS 40 ft, dual wall
   20 ft, CMP 20 ft. **Recommended: as listed**, each editable per project and workspace. The founder
   checks M1–M9, and CMP before adoption.
4. **Does a joint length per size override the family's** (DI 20 ft at 4–30", HDPE 50 ft at large
   sizes)? **Recommended: one length per family, editable per size.**
5. **Waste %:** pipe 2 % (RCP 1 %), stone and fill 5 %, stabilizer 3 %. **Recommended: as listed**,
   marked as IntelCost's proposal.
6. **Fittings allowance: 10 % gravity, 15 % pressure, of pipe material cost?** **Recommended: yes**,
   editable; counted bends never also counted in the %.
7. **Joint lube:** a quantity per joint by size band from a manufacturer's chart, or a small % of pipe
   cost? **Recommended: by joint from the chart** (it is countable). Until the chart is read and
   approved, lube is in the fittings allowance.
8. **Services on a run (new takeoff):** build in this plan (M9), or leave wyes and taps to the allowance?
   **Recommended: build M9 after the first cut.** Services are the most-counted fitting on a sewer bid.
9. **Valves, hydrants and tees between runs:** **Recommended: out of this plan.** They need structure
   kinds of their own (valve, hydrant), a plan of their own.
10. **HDPE fusion as equipment:** fusion classes by size range in a library release, hours = joints ×
    cycle time? **Recommended: yes.** The cycle times come from the manufacturers' published fusion
    procedures, researched in M8, never typed in without a source.
11. **Roll sizes:** tracer wire 500 ft, tape 1,000 ft, geotextile 500 SY (e.g. 12.5 × 360 ft).
    **Recommended: as listed**, each a workspace setting.
12. **Precast manholes:** risers in stocked heights (2, 3, 4 ft), or priced per VF? **Recommended: per VF
    by default** (how most producers quote risers), with stocked heights as the option.
    - Cone 3 ft, base 4 ft and steps at 12" are the starting defaults, to be checked against the
      founder's producer.
13. **Borrow and tipping in TON or by the yard?** **Recommended: TON by default** at 1.35 t/LCY, with LCY
    and per load as the alternatives. The founder sets the loose density from the pit or landfill the
    company uses.
14. **Defaults never shown as a list, unlike the equipment library page?** **Recommended: yes, as the
    brief says.** Material prices change too fast to publish a list, and a price list is exactly the
    reference data D-264 keeps out of sight. The equipment page stays as built.
15. **The starter set:** built from the founder's dated quote sheets (one per family, one reference
    market), normalised by its material factor, gaps filled per family? Or ship with empty defaults?
    **Recommended: ship the first cut with empty defaults** ("Missing price", as fuel does under D-723),
    and add M10 when the quotes come.
16. **Move equipment and labour to the same `auto_key` / `user_fields` storage?** **Recommended: yes, in
    M6.** One rule for every automatic component; the line-level `user_edited` stays for the spread.
17. **"Missing price" for hand-added material components too, not only Calculate's?** **Recommended:
    yes.** A null price is never $0; a typed 0 still is.
18. **A price snapshot as D-718 (a changed workspace or default price never moves a saved component by
    itself)?** **Recommended: yes**, with Update and Update all.
19. **Scope of kinds and materials:** sanitary, storm, water, fire water and force main. Gas, electric,
    telecom, subdrain and copper come later. **Recommended: yes.** Copper and conduit can join M3 if the
    founder wants water services.
20. **Expired quotes:** keep pricing, flagged, or stop and read "Missing price"? **Recommended: keep
    pricing, flagged** in Needs attention.
21. **A pressure-pipe crew:** `utility_pipe` maps every kind to A12 ("gravity storm/sewer"). **Recommended:**
    out of this plan, but logged. A pressure pipe crew (and an HDPE fused crew) is a starter-library
    change to schedule next.
22. **Fuel on projects made before F33 (6467):** offer the workspace diesel price, or the suggestion, as
    a one-click fill on every project that has none? **Recommended: yes, a notice "No fuel price: use
    the workspace's $X"**. Never filled silently.

## Risks

- **Prices date fast.** Without the snapshot and the dates, an old quote prices a new bid quietly. Hence
  basis, date, expiry and Update.
- **Rounding across the project** puts a share of one line's order on another. The spread is by LF, and
  the row says "of 37 JT ordered", so it is visible.
- **New quantities** (joints, bends, sections, water stretches) add to the engine. Each gets a row in the
  shared quantity table before it prices.

# F38: Material cost components for earthwork and utility lines

> **Answered 2026-10-29 by the founder (D-858 to D-862, then D-863 to D-867); nothing built yet.** Written as
> a plan the same day (D-857, `MATERIALS_PLAN.md`), renamed here with the answers folded in. Every project was
> read only. The answers are in §9; the questions still open are in §10.

## The problem

Calculate prices the crew and the machines of every earthwork and utility line and none of what the
contractor buys: no pipe, no stone, no manhole, no borrow, no tipping fee. An estimator adds each one by
hand, types its price, and converts LF to joints and CCY to tons on paper. A material component left
without a price counts $0.00 without a word.

**Problem → solution.**
- **What Calculate writes.** It also writes each line's material components, in the unit each is sold
  in: pipe in LF rounded up to full joints, stone in tons, manhole parts, rolls of tape.
- **Prices.** Each component is priced from the project's own price, else the workspace's, else
  IntelCost's quarterly default × the project's material location factor. It shows that basis, its date
  and any source links.
- **Recalculation** moves quantities and keeps what the person typed, added, edited or deleted.
- **A component with no price** reads "Missing price", never $0.
- **Crews.** Water and force main stop pricing with the gravity pipe crew.

---

## 1. Why there is no material today, and the "Missing data" on the 3D test copy

### 1.1 Calculate never writes a material component

- **Where lines are built.** In the browser:
  - earthwork lines: `lib/takeoff/earthwork/lines.ts`;
  - utility lines: `lib/takeoff/earthwork/utilities/lines.ts:91` and `:182`.
- **Where they are stored.** The api stores them in `earthwork/lines.py:275` (`write_lines`), then calls
  `attach_lines` (`equipment/production.py:1316`).
- **The only writer of components.** `swap_in_tier` (`production.py:1076`) is the only code that writes
  components on a Calculate line: one `equipment` per tier machine (`:1108`) and one `labor` crew
  (`:1148`), both `eq_auto`.
- **A production tier has no material.**
  - `EqProductionTier` (`equipment/models.py:276-297`) holds `machines` and `crew` only.
  - The starter tables (migration `d751a1c3e5f7`) have no material table.
  - D-727 defines a tier as a spread and a crew.
- **The starter map says so** (`seed/earthwork_1/ew_line_map.csv`):
  - bedding: "bedding stone as material by hand";
  - stabilizer agents: "Material (cement, fly ash, lime)";
  - geosynthetics: "Material and labour by hand".
- **Related: a density nobody reads.**
  - `ZoneMaterial.density_pcf` (`utility_schemas.py:31`) is editable.
  - Its tooltip promises tons ("Blank: no tons", `UtilitySettingsSection.tsx:94`).
  - No code reads it.
- **Related: one pipe crew for every kind.** `utility_pipe` maps every utility kind to A12, "Pipe crew,
  gravity storm/sewer". Q21 fixes it (block P).

### 1.2 The 30–36 t excavator and the 1–1.25 yd wheel loader on 6467

**The project.** 6467, "Hidden Valley Rebid — 3D test (shared copy)" (workspace 3104). It has 12" and 8"
HDPE DR 11 at 0–6 and 6–8 ft (items 318265, 318266, 318272, 318273).

**What is on those lines.**
- Each line has tier 5586 (120–200 LF/day; the line is at 150), A12, with `EX-CRAWL-30T` and
  `WL-COMPACT-1Y`.
- The two machines are shared site resources 151 and 152, rental, fuel load "med".
- Hours and production resolve.

**What is missing.** Both machines lack **only the project's diesel price**.
- `machineCost` adds "Fuel price (diesel)" when `fuel_price_diesel` is null
  (`lib/estimate/equipment/cost.ts:191`).
- D-723 has the project fuel price start empty and block every fuel-burning machine until it is filled.

**What the data shows.**
- 6467 and workspace 3104 have no `eq_override` rows.
- The national table holds only `fuel_price_diesel_suggested` (6.276).
- 6467 was copied on 2026-10-17, before F33 (10-23). The original and the later copies each carry
  6.276.

**Verdict.** Not a catalog gap, an id mismatch or a resolution bug. Nothing was changed. Q22's notice
(§9) is the fix for every such project.

---

## 2. What a line creates

### 2.1 The rules for every material component

- **Two quantities.** The **takeoff quantity** stays on the line in its own unit. The component carries a
  **sold quantity**: takeoff quantity × (1 + waste) × conversion, rounded up to what is sold.
- **Where a component goes (D-858 Q1).** On the line its quantity comes from:
  - pipe on the `utility_pipe` LF line;
  - stone on `utility_bedding_pipe_zone`;
  - imported backfill on `utility_backfill`;
  - structure parts on the structure EA line.
- **Rounding.** Pipe rounds per pipe key and size **within each bid** (§2.3; D-864). Everything else rounds
  on its own line (D-763's "Round up to").
- **Defaults are editable.** Every factor below is a default, editable per project (Utilities settings)
  and per workspace.
- **Waste % (D-858 Q5)** is IntelCost's proposal, with no published source:
  - pipe 2 % (RCP 1 %);
  - stabilizer 3 %;
  - bedding, zone and foundation stone 10 %;
  - imported fill 5 %.

### 2.2 Pipes per utility kind (D-858 Q19, D-859 Q24)

**In scope:** sanitary, storm, water, fire water and force main. Gas, electric, telecom, subdrain and
copper come later.

**Under gravity sewer** the gravity families are listed first. Pressure pipe stays offered, in its own
group labelled **"Pressure pipe"** (Q24; today the two are one list).

| Utility kind | Families offered |
|---|---|
| Gravity sewer (sanitary) | PVC SDR-35, SDR-26 (D3034); PVC PS 46, PS 115 (F679); RCP Wall B, C; HDPE dual wall (F2648); then **Pressure pipe**: C900, C909, ductile iron, HDPE IPS |
| Storm | PVC SDR-35, SDR-26; F679; RCP Wall B, C; HDPE dual wall; CMP 18–8 ga |
| Water, fire water | PVC C900 DR 18, DR 14; PVCO C909 165, 235, 305; ductile iron C151 PC200–350; HDPE IPS DR 11, DR 17 |
| Force main | C900; C909; ductile iron; HDPE IPS DR 11, DR 17 |

### 2.3 Pipe: priced per LF, sold in full joints per bid (D-858 Q2–Q4, D-859 Q23, D-864 C1)

**What a bid is.** A bid is a main layer of the takeoff:
- **Base Bid** is the default layer (`takeoff_layer.is_default`); an item with no layer is in it.
- **Each alternate** is a top-level layer of its own.
- **A sub-layer** rounds inside its main layer (`takeoff_layer.parent_id` walked to the top; Q33, D-868).
- **A line moved to another layer** rounds with its new bid at the next pricing.

**The price and the order:**
- **The unit price is $/LF,** the way suppliers quote pipe.
- **The sold quantity** is LF rounded up to full joints, per pipe key and size, **within each bid**,
  over the lines of that bid only: ⌈Σ LF × (1 + waste) ÷ joint length⌉ × joint length.
- **Separate rounding.** The base bid and each alternate round separately, so an alternate never borrows
  the base bid's last joint.
- **The display** is "518 LF = 37 JT".

**How the lines carry it:**
- Each line's component carries its own LF × (1 + waste).
- The LF added by rounding up is spread over **that bid's** lines by their share of LF, so each bid's
  lines add up to the LF ordered for it (Q2).
- The row reads **"141.6 of 518 LF ordered in Base Bid (37 JT)"**.

**Joints per run for joining:** ⌈run LF ÷ joint length⌉.

**Joint lengths (D-858 Q3, Q4).** As listed below: one length per family, editable per size. CMP stays
**unconfirmed** until Contech's sheet is read, and its rows read "Joint length unconfirmed" in Needs
attention.

| Family | Joint length | Joining | Waste | Source |
|---|---|---|---|---|
| PVC D3034 SDR-35/26 | 14 ft | integral bell, factory gasket | 2 % | M1, M2 |
| PVC F679 PS 46/115 | 14 ft | bell, factory gasket | 2 % | M1 (assumed the same family) |
| PVC C900 DR 18/14 | 20 ft | integral bell, factory gasket | 2 % | M3, M4 |
| PVCO C909 | 20 ft | bell, gasket | 2 % | M4 |
| Ductile iron C151 | 18 ft | push-on (C111), gasket with the pipe | 2 % | M5, M6 |
| RCP C76 | 8 ft | tongue-and-groove, gasket per joint (C443) | 1 % | M7 |
| HDPE IPS DR 11/17 | 40 ft | butt fusion (equipment) | 2 % | M8 |
| HDPE dual wall F2648 | 20 ft | bell, factory gasket | 2 % | M9 |
| CMP | 20 ft, **unconfirmed** | coupling band per joint | 2 % | none yet: Contech's sheet |

### 2.4 Fittings (D-858 Q6–Q9)

| Fitting | Source in the takeoff | Component |
|---|---|---|
| Bends, pressure pipe | each vertex not at a structure, deflection rounded to 11¼, 22½, 45 or 90° | bend EA by size and angle, plus its restraint or thrust block (§2.5) |
| Bends, gravity pipe | the same vertices | none: "Bend between structures: check the drawing" |
| Tees, pressure pipe | a pressure run ending on another pressure run, not at a structure (new detection, M4a) | the restraint or thrust block (§2.5). The tee fitting itself stays in the 20 % allowance (Q9, Q30; D-863) |
| Pipe into a structure | the connected runs (`calculate.ts:327-439`) | boot or connector EA per pipe (§2.8) |
| Services | **new: "Services" on a run** (M9; Q8): a count, or a click per service, with its size | gravity: wye EA; pressure: tap and saddle EA |
| Valves, hydrants, tees between runs as fittings | — | out of this plan (Q9) |

**The fittings allowance (Q6):**
- One component per pipe line, "Fittings allowance".
- **5 % gravity, 20 % pressure, of the line's pipe material cost.** Editable on the line, per project
  and per workspace.
- A counted fitting is never also in the %.
- It also carries joint lube until the lube chart is read and approved (Q7).

### 2.5 Joining, restraint and encasement (D-858 Q7, Q10; D-859 Q25)

| Pipe | Component | Kind | Quantity |
|---|---|---|---|
| PVC, PVCO, dual wall, ductile iron | Joint lubricant | material | joints ÷ joints per container by size, **from the manufacturers' chart once read and approved (Q7)**. Until then it is in the allowance |
| RCP | Gasket | material | 1 EA per joint (+ lube as above) |
| CMP | Coupling band | material | 1 EA per joint |
| HDPE IPS | Butt fusion machine | **equipment** | joints × cycle time ÷ 60 Equipment Hours (EH). **Cycle times only from the manufacturers' published fusion procedures** (Q10). Fusion classes by size range come as an equipment library release (M8); the library has none today |
| Pressure pipe, per counted bend and per tee | **Restraint** (default) or **thrust block**, a project setting | material | restraint: one set EA per fitting by size. Thrust block: concrete CY per block by size and angle from a project table, reading "Enter the block's CY" in Needs attention until it has a value; the founder names the agency standard before M4a (Q31, D-863) |
| Ductile iron | **Polyethylene encasement** | material | run LF × (1 + overlap), the overlap a setting (default 10 %, IntelCost's proposal; AWWA C105 not read), sold in LF, rolls a setting |

### 2.6 Bedding and pipe-zone stone, and imported backfill

**Tons from the CCY Calculate writes:** TON = CCY × 27 × density pcf ÷ 2000.
- The density is the zone material's own `densityPcf` (stored today, read from now on).
- A blank density means the material is sold by the CY.

| Material | Density | t per CCY | Waste | Source |
|---|---|---|---|---|
| #57 stone (bedding, zone, structure base stone, foundation stone) | 111 pcf | 1.50 | 10 % | M10 (1.35–1.5 t/CY loose; the placed figure is IntelCost's proposal) |
| Sand (zone) | 111 pcf | 1.50 | 10 % | M11 |
| Aggregate base, compacted | 147 pcf | 1.98 | 5 % | M12 (VDOT 309, 110 lb per SY-inch) |
| Select / engineered fill, imported | 120 pcf | 1.62 | 5 % | no source, IntelCost's proposal |
| Native | — | — | — | not bought |

**Backfill.** Imported backfill is material only when its source is "imported". Native backfill's
shortfall stays in the site balance.

### 2.7 Tracer wire, warning tape, and the water stretches

| Component | When | Quantity | Sold in (Q11, workspace settings) |
|---|---|---|---|
| Tracer wire | non-metallic pressure pipe by default; gravity off | run LF × 1.10 | 500 ft rolls |
| Detectable warning tape | non-metallic pipe, every kind | run LF × 1.05 | 1,000 ft rolls |
| Foundation stone | trench bottom below design water (the `dewateringLF` stretches) | stretch LF × width × depth (default 12") → CCY → TON | TON |
| Trench-bottom geotextile | the same stretches | stretch LF × (width + 2 × the stone depth) ÷ 9 × 1.10 SY | 500 SY rolls |

### 2.8 Structures (D-862 Q28)

#### 2.8.1 What the Structures tool has today

Read from `features/takeoff/earthwork/utilities/api.ts:74-105` and `runDefaults.ts:125-150`.

**Thirteen types:**

| Type | Default shape and size |
|---|---|
| `sanitary_manhole` | round, 48" ID |
| `storm_manhole` | round, 48" ID |
| `catch_basin` | rect, 4 × 4 ft |
| `curb_inlet` | rect, 4 × 4 ft |
| `area_drain` | round, 48" |
| `junction_box` | rect, 4 × 4 ft |
| `headwall` | round, 48" (the default reads oddly for a headwall; noted, unchanged) |
| `cleanout` | round, 6" ID, 0.5" wall |
| `lift_station` | rect, 4 × 4 ft |
| `valve_vault` | rect, 4 × 4 ft |
| `meter_vault` | rect, 4 × 4 ft |
| `handhole_vault` | rect, 4 × 4 ft |
| `custom` | round, 48" |

**What Calculate knows for every type:**
- **As stored:** shape (round or rect), inside diameter or inside L × W, wall (6" default), rim, floor,
  sump depth, base slab (6"), base stone (6"), over-dig (2 ft), protection, start surface.
- **As computed:** depth h, VF (rim − lowest invert), excavation by layer, base stone CF, structure
  volume, backfill, dewatering, and the connected runs with their pipe sizes.
- **Not recorded anywhere:** frame, cover, grate, inlet kind, cone, riser, hood or construction method.

#### 2.8.2 Per-structure settings (new fields)

- **`construction`:** precast (default) or cast-in-place.
- **`pricing`:** parts (default) or whole structure. The default is set per structure, per project and
  per workspace.
- **`inlet_kind`:** for catch basins, curb inlets and area drains: grate, curb or combination. Defaults:
  catch basin = grate, curb inlet = curb, area drain = grate.
- **`hood`:** optional hood or trap, for catch basins and inlets.
- **`top`:** cone or flat top, for manholes. Default: cone, flat top when VF < 5 ft.
- **`riser_mode`:** per VF (default) or stocked heights (Q12).

#### 2.8.3 Parts rules (precast)

| Types | Components |
|---|---|
| Sanitary and storm manholes, custom (round) | base with floor EA (base 4 ft); riser VF beyond base + top + rings (or stocked heights 2/3/4 ft); cone EA (3 ft) or flat top EA; adjustment rings EA (the remainder up to 12"); frame and cover EA; boot EA per connected pipe; steps EA = ⌊(VF − 1) ÷ 1 ft⌋; base stone TON |
| Catch basins, curb inlets, area drains | precast box or base with its sump EA (box height default 4 ft); riser VF beyond the box; top slab EA; adjustment rings EA; frame and grate EA by `inlet_kind` (grate, curb, combination); boot EA per connected pipe; base stone TON; hood/trap EA when ticked. The same depth logic as manholes |
| Junction boxes | box EA; riser VF beyond the box; top slab EA; frame and cover EA; boot EA per pipe; base stone TON |
| Valve, meter and handhole vaults | vault EA by inside L × W; riser VF beyond its height; top slab with hatch EA; boot EA per pipe; base stone TON |
| Cleanouts (D-865 C2) | riser pipe LF (rim − invert) **at the cleanout's own diameter** (`inside_dia_in`, 6" default) **in the run's pipe family**, at that size's $/LF; wye EA **run size × cleanout size** (e.g. 8" × 6"); cap or plug EA; frame and cover box EA |
| Headwalls | **no parts rule yet:** one "Whole structure" component (below) |
| Lift stations | **no parts rule yet:** one "Whole structure" component (wet well only; pumps, controls and hatch-mounted equipment are out of this plan) |

#### 2.8.4 Cast-in-place (any type with walls)

From the structure's dimensions:
- concrete CY = base slab + walls (perimeter at mid-wall × wall thickness × height) + top slab
  (default 8");
- rebar lb = concrete CY × lb per CY (a setting, default 100 lb/CY, IntelCost's proposal);
- forms SFCA = inside wall area + outside wall area above the over-dig (the outside face dropped where it
  is cast against earth, a setting).

The frame, cover, grate, boots and steps are added as in precast.

#### 2.8.5 Whole structure (any type)

The way precasters quote:
- one EA price "to N ft" (the stated depth, a setting per key);
- plus a price per VF over that depth.

The components are "Whole structure (to 6 ft)" EA and "Extra depth" VF. The frame, cover or grate stays
its own component unless the quote says included (a tick).

#### 2.8.6 No structure without material

A type with no parts rule, or a structure whose rule cannot run (a custom with no size), gets one "Whole
structure" component reading "Missing price".

**Types the tool does not have yet:**
- flared end sections;
- outlet control structures;
- drop manholes;
- doghouse manholes over an existing line;
- grease interceptors;
- oil/water separators;
- trench drains;
- detention vaults and chambers;
- yard inlets distinct from area drains;
- valves and hydrants (Q9).

They are not built in this plan (Q29, D-863). A later plan takes them, flared end sections and drop manholes
first. A drop is an option on a manhole, not a type.

### 2.9 Site lines

| Line (role) | Component | Conversion | Sold in (Q13) |
|---|---|---|---|
| Select borrow (`soil_import`, LCY) | Borrow at the pit | LCY × 1.35 t/LCY → TON | TON by default; LCY or per load |
| Export (`soil_export`, `spoils_export`, LCY) | Disposal / tipping fee | LCY × 1.35 t/LCY → TON | TON by default; LCY or per load |
| Aggregate base (`replacement_fill`, `undercut_replace` with an aggregate) | Aggregate base | CCY × 1.98 | TON |
| Stabilization (`stabilize_agent_*`, `undercut_agent_*`, TON) | The agent | TON × 1.03 | TON |
| Geotextile / geogrid (`geosynthetics`, SY) | The fabric | SY with overlap | rolls |

Trucking stays equipment (A7, A8).

---

## 3. Prices

### 3.1 The order

1. **The project's price.**
2. **The workspace's price** (Settings › Material prices).
3. **IntelCost's default** from the latest quarterly release, × `1 + project_wage_set.material_amf`.

**The location factor:**
- It is computed per ZIP and county by the Wage Calculator (`wagecalc/geo.py:58-62`) and stored on every
  wage set, but unused today; only `equipment_amf` is wired (D-719).
- With no wage set or no ZIP the factor is 1.00, shown as "No location: national".

**The resolution** copies the equipment library's, field by field (`equipment/service.py:271-308`).

### 3.2 What a price shows (D-858 Q14, Q18; D-860 Q26)

**On the component:**
- "Project price · typed by A. B. · 2026-10-29 · 🔗 Supplier page (checked 2026-10-28)"
- "Workspace price · Quote, <supplier> · 2026-10-12 · valid to 2026-11-30 · 🔗 Quote PDF"
- "IntelCost price · Q4 2026 · grade B": **no source link, no source** (D-264, rule 9).

**Defaults are never shown as a list (Q14).** The api answers one material key per request, only for keys
the project uses. Settings › Material prices lists the workspace's own prices only.

**Snapshot (Q18).** A priced component stores its price, source, date, release and links. Nothing moves
it by itself:
- a workspace or project price changed later shows "Price changed: Update";
- a new IntelCost release shows §3.5's Review;
- the project gets Update all.

**Expired quotes (Q20).** A price past its valid-until date keeps pricing, flagged "Quote expired …" in
Needs attention.

### 3.3 Workspace supplier prices and their links (D-860 Q26)

**Settings › Material prices.** One feature folder (`features/material-prices/`), so the later move
under Lists is a route change, as D-722 did for equipment.

**A price row holds:**
- material key, $/sold unit, sold unit;
- supplier, quote reference, quote date, valid-until;
- note;
- who set it and when;
- **links** (below).

**Source links (Q26):**
- **Who can have them.** Every workspace and project price carries zero or more links, each with a label,
  a URL and the date it was checked.
- **What a link points to:** a supplier product page, an online quote, or **a quote file in Project
  files** (stored as the file's uuid, opened through the file route).
- **Where they show:** on the component's price basis, and in Settings › Material prices.
- **How they open:** in a new tab (`rel="noopener noreferrer"`).
- **Validation:** **http and https only**, checked in the api on write and again in the app before
  rendering.
- **IntelCost's defaults never carry a link.**

**Import:**
- The supplier sheet comes in as CSV or Excel, with a matching step as D-728 does for machines.
- A URL column becomes each row's link, dated the import day.
- Rows that match nothing are offered as custom materials.

**How it joins the Lists library later.** Material prices becomes one tab of Lists (F10, D-287 6).
Assembly components gain `mat_key`, so assemblies price from the same resolution.

### 3.4 How many default prices

| Group | Keys |
|---|---|
| Pipe, gravity sewer and storm (D3034, F679, RCP, dual wall, CMP) | 145 |
| Pipe, pressure (C900, C909, DI, HDPE IPS) | 97 |
| Joining (lube by size band, RCP gaskets, CMP bands) | ~35 |
| Fittings counted (bends × 4 angles, wyes, taps and saddles, by size band) | ~40 |
| Restraint sets (bend and tee, by size band) and DI encasement (by size band) | ~26 |
| **Structures, precast parts:** manholes at 48/60/72/84/96" (base, riser VF, cone, flat top, rings, frame and cover in 3 kinds, boots by pipe band, steps, hood) | ~36 |
| **Structures, precast parts:** inlets and boxes (box by 5 sizes, riser VF, top slab, frames and grates by inlet kind) | ~23 |
| **Structures, precast parts:** vaults (by 4 sizes, hatches) | ~11 |
| **Structures, precast parts:** cleanouts (cap, box) | ~2 |
| **Structures, cast-in-place** (concrete CY, rebar lb, forms SFCA) | 3 |
| **Structures, whole structure** (EA to the stated depth + VF over it, 13 types × about 2 sizes) | ~50 |
| Aggregates, borrow, tipping, 7 stabilizers, tracer wire, tape, geotextile, geogrid | ~25 |
| **Total, the full catalog** | **≈ 495** |

**The first release.**
- **Q15:** the first cut ships with **empty defaults**: every unpriced material reads "Missing price".
- **M10 (D-866 C3)** publishes a **core set** of the founder's dated quote sheets (one reference market):
  - each quote is normalised by its market's material factor;
  - every core key is quoted, never filled, and graded B;
  - the sources are kept internal.
- **M10 starts from the price research** in `docs/reference/Materials research/` (829 national prices from 4,437 source points, as of September 2026, not loaded into any table). Its "Core set (M10)" sheet maps 109 of the 123 core keys.
  - **The 14 gaps need the founder's quotes:** RCP gaskets, the 60" cone and whole 60" manhole, 15–24" boots, catch basin and curb inlet top slabs, the curb inlet box, the combination inlet casting.
  - **To check against the founder's waterworks quote:** 8" C900 DR18 at $21.48 rests on one Louisiana bid and looks high against 2026 TX and RI bids of $15.50–17.60 with the DR not stated. The research's derived 8" DR14 ($27.15) and DR25 ($15.72) scale from it, so they move with it.
  - **Decision needed:** the rule above says every core key is quoted and graded B, while the research is graded A–F from public bids. See section 10.
- **Everything outside the core** stays "Missing price" until a later quarterly release (M11).
- **The core set, not all 495, is required before any tester deploy** (MANAGER.md, "Before any tester
  deploy").

#### 3.4.1 The core set: the exact keys, by the quote sheet each comes from

The key names below are the release's `mat_key`s.

**Sheet 1: waterworks / utility pipe distributor (73 keys)**

| Keys | Count |
|---|---|
| PVC D3034 SDR-35 at 8, 10, 12, 15, 18, 21, 24" ($/LF) | 7 |
| PVC D3034 SDR-26 at 8, 10, 12, 15, 18, 21, 24" ($/LF) | 7 |
| PVC C900 DR 18 at 6, 8, 10, 12" ($/LF) | 4 |
| PVC C900 DR 14 at 6, 8, 10, 12" ($/LF) | 4 |
| Ductile iron C151 PC350 at 6, 8, 10, 12" ($/LF). The catalog has no other class at 6–12" | 4 |
| Polyethylene encasement for DI at 6, 8, 10, 12" ($/LF). It is part of DI pipe (D-859 Q25), so without it every DI line reads "Missing price" | 4 |
| Restraint set, C900, at 6, 8, 10, 12" (EA) | 4 |
| Restraint set, DI, at 6, 8, 10, 12" (EA) | 4 |
| Tracer wire (500 ft roll) | 1 |
| Detectable warning tape (1,000 ft roll) | 1 |
| Bends, C900, 11¼, 22½, 45 and 90° at 6, 8, 10, 12" (EA; Q34) | 16 |
| Bends, DI, 11¼, 22½, 45 and 90° at 6, 8, 10, 12" (EA; Q34) | 16 |
| Trench-bottom geotextile (500 SY roll; M4a writes it on every water stretch; Q34) | 1 |

**Sheet 2: precast concrete producer (39 keys)**

| Keys | Count |
|---|---|
| RCP C76 Wall B at 12, 15, 18, 21, 24" ($/LF). The catalog's RCP starts at 12" | 5 |
| RCP C76 Wall C at 12, 15, 18, 21, 24" ($/LF) | 5 |
| RCP gasket at 12, 15, 18, 21, 24" (EA per joint) | 5 |
| Manhole parts at 48" and at 60": base with floor (EA), riser (VF), eccentric cone (EA), flat top (EA) | 8 |
| Manhole adjustment rings (per inch of height) | 1 |
| Manhole steps (EA) | 1 |
| Manhole boots by pipe band: 8", 10–12", 15–18", 21–24" (EA) | 4 |
| Whole manhole at 48" and at 60": EA to 6 ft, and each VF over 6 ft | 4 |
| Catch basin, standard (4 × 4 ft box): box with sump (EA), riser (VF), top slab (EA) | 3 |
| Curb inlet, standard (4 × 4 ft box): box with sump (EA), riser (VF), top slab (EA) | 3 |

**Sheet 3: castings (frames, covers, grates) (5 keys)**

| Keys | Count |
|---|---|
| Manhole frame and cover, sanitary (EA) | 1 |
| Manhole frame and cover, storm (EA) | 1 |
| Catch basin frame and grate (EA) | 1 |
| Curb inlet frame, grate and curb box (EA) | 1 |
| Combination inlet frame, grate and curb box (EA) | 1 |

**Sheet 4: quarry / aggregate supplier (4 keys)**

| Keys | Count |
|---|---|
| #57 stone, delivered ($/TON; it has no haul line of its own) | 1 |
| Zone sand, delivered ($/TON; the default pipe-zone material; Q34) | 1 |
| Aggregate base, delivered ($/TON) | 1 |
| Select borrow at the pit ($/TON; the haul is A8, equipment) | 1 |

**Sheet 5: landfill / disposal site (2 keys)**

| Keys | Count |
|---|---|
| Tipping fee, clean soil ($/TON) | 1 |
| Tipping fee, unsuitable material ($/TON) | 1 |

**Total: 123 keys** (D-866, D-868):
- the brief's 89, which include DI encasement and the inlet castings;
- the 32 pressure bends, zone sand and trench-bottom geotextile (Q34).

**Outside the core, reading "Missing price":** the wyes and taps of M9, which wait for a later release.

### 3.5 IntelCost's quarterly price update (D-861 Q27)

**The page.** Developer › Material prices, **platform admins only** (the F16a admin guard; never
workspace owners).

**The steps:**
1. **Load** the quarter's set (CSV or Excel): material key, unit price, sold unit, grade, date, and an
   internal source per row. The source is never served outside the admin route.
2. **Preview** before publishing:
   - keys added, changed and removed;
   - the change by family (median and range);
   - **every price that moved more than ±15 % flagged** for a second look, with a tick per flag before
     Publish.
3. **Publish.** It becomes a new release named by quarter ("Q1 2027") in `matlib.release`, with its
   audit row. Every earlier release stays readable.

**After a release:**
- **New pricing** reads the latest release.
- **Saved components never move by themselves (Q18).** Every project with components priced from
  IntelCost's defaults shows **"IntelCost prices updated to Q1 2027: Review"**: old → new per
  component, and each line's total before and after, with Update and Update all.
- **Workspace and project prices are never touched** by a release.
- **Stale defaults.** A default from a release more than two quarters before the latest reads
  "IntelCost price · Q2 2026 · may be stale" and goes in Needs attention.

---

## 4. Recalculate (D-858 Q16)

**How each case is stored, and what a recalculation does.** The same storage covers material,
equipment and labour components:

| Case | Stored as | What a recalculation does |
|---|---|---|
| Written by Calculate, untouched | `auto_key` (e.g. `pipe:hdpe_ips_dr11:12`, `struct:frame_cover`, `bed:#57`), `user_fields` empty | rewrites quantity, conversion and name; re-resolves a resolved price |
| Price typed | `user_fields` ∋ `unit_price` | quantity updates, price kept |
| Other fields edited | `user_fields` lists each | edited fields kept, the rest update; an edited quantity shows "Calculate now has 412 LF: Apply" |
| Added by the person | `auto_key` NULL | never touched |
| Deleted by the person | `takeoff_component_dismissed` (item, `auto_key`, who, when) | not recreated; "Restore Calculate's components (2)" |
| No longer produced | — | untouched: removed; edited: kept, "No longer in Calculate" |

**Equipment and labour** move to `auto_key` / `user_fields` in M6. `eq_auto` stays readable for saved
rows.

**A side finding.** The `eq_auto` docstring says a user edit clears it, but no server code does
(`estimate/models.py:281-282`).

---

## 5. Estimating (D-858 Q17)

**The row:**
- A material component row shows **sold quantity, sold unit and unit price**: "518 LF = 37 JT ×
  $18.40/LF", "128.4 TON × $38.50".
- The takeoff quantity sits beside it in grey.
- Pipe also shows its share of its bid's order: "141.6 of 518 LF ordered in Base Bid (37 JT)" (D-864).
- An alternate's layer tab and the export's tab per main layer each total that bid's own rounded order.

**Where it feeds:**
- **The material column:** through `pricedMaterial` (`costing.ts:243-248`).
- **Wastage:** the component's own `wastage_pct` before the conversion and rounding (D-763).
- **Sales tax:** on material after wastage and rounding (`bidSummary.ts:88`).

**"Missing price":**
- **Where it reads:** for any material component with no price at any level, **including hand-added
  ones** (Q17). Never $0.00 or "–".
- **What it flags:**
  - Needs attention: "2 materials without a price";
  - the line total and the bid summary read "Incomplete".
- **A typed 0 is a price** ("Confirm none").

---

## 6. Sources (read 2026-10-29)

**How these were read.** Every row is a web search result's summary; **the page itself was not opened**
unless marked. The founder checks them before a factor is adopted. No cost-data publisher is named (rule
9).

| # | What it supports | Where |
|---|---|---|
| M1 | D3034 laying length 14 or 20 ft | Westlake certification PI-CL-014.1 (2024-10) |
| M2 | D3034 14 ft, 20 ft, 13 or 20 ft in three specs | North American Pipe submittal; Marion County OR; NMWD |
| M3 | C900 20 ft ± 1" | San Antonio Water System IFB spec |
| M4 | C900 IB 20 ft (14 ft option); C909 22 ft on request | Westlake MU-PS-001 (2024-10), MU-PS-008 (2025-10) |
| M5 | DI 18 ft 3–42"; 20 ft 4–30" and 48–64" | U.S. Pipe TYTON JOINT page |
| M6 | DI 18 or 20 ft, push-on per AWWA C111 | Johnstown CO Construction Spec 500 |
| M7 | RCP 8 ft, 12–54", ASTM C76 | Ferguson, Fortiline listings (no ACPA table found) |
| M8 | HDPE IPS DR 11 40 ft; 50 ft at large sizes | Ferguson, First Supply listings |
| M9 | Dual wall 20 ft, 6–60" | First Supply, Consolidated Supply listings |
| M10 | #57 stone 1.35–1.5 t/CY; 1.4 for planning | engineerfix.com; inchcalculator.com (rule of thumb) |
| M11 | Sand loose 2,400–2,700 lb/CY; compacted 2,800–3,200 | gambrick.com; hellogravel.com (rule of thumb) |
| M12 | Aggregate base 110 lb per SY-inch | VDOT Section 309 via hrpdcva.gov; Iowa DOT 1B-4 refused (403), not read |
| M13 | Manhole risers 24–72", grade rings 2–8"; eccentric cone | L.B. Foster CXT 60" spec; Wichita standard |

**No source found yet:** every waste %, the fittings allowance %, the CMP joint length, lube per joint,
fusion cycle times, loose borrow and export density, the step spacing, the encasement overlap, rebar
lb/CY, and the thrust block table.

---

## 7. Data model

**`takeoff_cost_component`** gains:

| Column | Purpose |
|---|---|
| `auto_key` | Calculate's identity for the component |
| `user_fields` | JSONB list of the fields the person set |
| `mat_key` | the material it prices from |
| `sell_unit`, `sell_factor` | takeoff unit → sold unit |
| `round_scope` | `line`, or `bid` (pipe: rounds with the lines of the same pipe key and size in its main layer, D-864) |
| `price_source`, `price_basis`, `price_date`, `price_release`, `price_snapshot` | what priced it, and when |
| `pct_of` | the allowance |

**New tables:**
- `takeoff_component_dismissed`;
- `matlib.release`, `matlib.mat_item`, `matlib.mat_default` (per release, with its internal source);
- `mat_price` (workspace and project);
- `mat_price_link` (price, label, url or project file uuid, checked_on);
- `mat_custom_item`;
- `matlib.release_audit`.

**The structure gains** `construction`, `pricing`, `inlet_kind`, `hood`, `top` and `riser_mode` (§2.8.2).

**The pipe catalog gains:**
- per entry: `jointLengthFt`, `jointLengthConfirmed`, `joining`, `metallic`, `group` (gravity or
  pressure, Q24);
- per size: `matKey` and an optional `jointLengthFt`.

**Rule 2 holds:** every new quantity is pure in `lib/takeoff/earthwork/utilities/`. Prices resolve in the
api, and the money arithmetic stays in `lib/estimate/`.

---

## 8. Blocks, with day estimates

**The order (D-867 C4):**
1. **P**, pressure and HDPE fused crews.
2. **The first cut:** M0, M1, M2, M3, and M7 without the import.
3. **M9**, services.
4. **The rest:** M4a, M4b, M5, M6, M8, M7's import, M10 (the core release), M11.

| Block | What | Days |
|---|---|---|
| **P** | **First.** Pressure pipe crews (Q21): starter activities "Pipe crew, pressure (PVC/DI)" and "Pipe crew, HDPE fused", their tiers, machines and crews as an earthwork starter release; the line map by utility kind and joining, so water and force main stop pricing with A12. A notice and Apply tier on saved lines | 2 |
| **M0** | Answers logged; catalog fields (joint length and its confirmation, joining, metallic, gravity/pressure group and the "Pressure pipe" group in the picker, Q24); zone densities; structure settings fields; quantity table rows for LF to joints **per bid** (the base bid and an alternate rounding apart) and for tons | 1.5 |
| **M1** | api: `matlib` releases, `mat_price`, `mat_price_link`, `mat_custom_item`, resolution with the material factor, one-key routes, permissions, audit | 2.5 |
| **M2** | Component model: `auto_key`, `user_fields`, the dismissed tombstone, sold unit and factor, rounding and spread per bid (the item's main layer), `pct_of`, "Missing price" for every material component (Q17), Needs attention, the bid summary's Incomplete | 3 |
| **M3** | Calculate writes materials: pipe at $/LF in full joints, fittings allowance, joining (no fusion), bedding, zone and imported backfill in tons, tracer, tape, DI encasement; every structure's "Whole structure" component (so no structure is left without material) | 4 |
| **M7** | Settings › Material prices: workspace and project prices, basis and date, source links (http/https, project files), expiry flags. The import with the matching step is the last half day, and can follow the first cut | 3 |
| **First cut** | **M0, M1, M2, M3, M7 without the import** (after P) | **13.5** |
| **M9** | Services on a run (Q8): a count or clicks with their size; wye or tap and saddle components | 2 |
| **M4a** | Pipe quantities in the engine: joints, pressure bends at vertices, the gravity bend flag, pressure tee detection (for the restraint or thrust block only, D-863 Q30), restraint sets by default or thrust blocks reading "Enter the block's CY" until the project table has a value (Q31; the founder names the agency standard before M4a), foundation stone and geotextile in the water stretches; quantity table rows for each | 3 |
| **M4b** | Structures (Q28): parts rules for manholes, inlets and catch basins (sump, risers per VF beyond the box, top slab, rings, frame and grate by inlet kind, boots, base stone, hood), junction boxes, vaults, cleanouts (the riser at the cleanout's own size, the wye run × cleanout, D-865); cast-in-place at 100 lb/CY rebar (Q32, checked by the founder before M4b); cast-in-place concrete, rebar and forms; whole structure (EA to depth + VF over); the structure settings in the Structures box; quantity table rows | 4.5 |
| **M5** | Site lines: borrow, tipping, aggregate base, stabilizers, geosynthetics | 1.5 |
| **M6** | Recalculate: "Calculate now has …: Apply", Restore, "Price changed: Update / Update all", equipment and labour moved to `auto_key` / `user_fields` (Q16) | 2.5 |
| **M8** | HDPE fusion: fusion classes as a library release, cycle times from the manufacturers' fusion procedures, hours from joints | 1.5 |
| **M10** | The first IntelCost release: **the core set** (§3.4.1, 123 keys), starting from the price research (§3.4; 109 keys mapped, 14 from the founder's quotes), loaded as release 1, normalised and checked, with a quantity table row priced at the core. **Required before any tester deploy** | 2.5 |
| **M11** | Developer › Material prices (Q27): load, preview with the ±15 % flags, publish by quarter, the per-project Review with old → new and Update all, stale defaults after two quarters. The rest of the 495 keys come through it | 3 |
| | **Total** | **≈ 36.5–37.5** |

**Each block ends** with the gates, the quantity table, and one smoke test on a throwaway account, never
on 6467 or another founder project.

---

## 9. The founder's answers (2026-10-29)

| # | Answer | Logged |
|---|---|---|
| Q1 | On the existing lines | D-858 |
| Q2 | Spread by LF share; the unit made LF by Q23 | D-858, D-859 |
| Q3 | Joint lengths as listed; CMP unconfirmed until Contech's sheet is read | D-858 |
| Q4 | One length per family, editable per size | D-858 |
| Q5 | Pipe 2 % (RCP 1 %), stabilizer 3 %, bedding, zone and foundation stone 10 %, imported fill 5 %; all IntelCost's proposal | D-858 |
| Q6 | Allowance 5 % gravity, 20 % pressure, of pipe material cost; editable; a counted fitting never also in the % | D-858 |
| Q7 | Lube by joint from the manufacturers' chart; in the allowance until read and approved | D-858 |
| Q8 | Services: yes, M9 right after the first cut | D-858 |
| Q9 | Valves, hydrants and tees between runs out; restraints and thrust blocks in (Q25) | D-858 |
| Q10 | Fusion as equipment; cycle times only from the manufacturers' published procedures | D-858 |
| Q11 | Roll sizes as listed, each a workspace setting | D-858 |
| Q12 | Per VF by default, stocked heights the option; cone 3 ft, base 4 ft, steps 12" | D-858 |
| Q13 | TON by default at 1.35 t/LCY; LCY and per load as alternatives | D-858 |
| Q14 | Defaults never shown as a list | D-858 |
| Q15 | First cut with empty defaults; M10 required before any tester deploy | D-858 |
| Q16 | Equipment and labour move to `auto_key` / `user_fields` in M6 | D-858 |
| Q17 | "Missing price" for hand-added material components too | D-858 |
| Q18 | Snapshot with Update and Update all | D-858 |
| Q19 | Sanitary, storm, water, fire water, force main | D-858 |
| Q20 | Expired quotes keep pricing, flagged | D-858 |
| Q21 | Pressure pipe crew and HDPE fused crew: block P right after the first cut | D-858 |
| Q22 | The fuel notice; never filled silently | D-858 |
| Q23 | Pipe priced $/LF; sold quantity LF rounded up to full joints, "518 LF = 37 JT"; project-wide rounding and spread | D-859 |
| Q24 | Gravity families first under gravity sewer; pressure pipe in its own "Pressure pipe" group | D-859 |
| Q25 | Restraint or thrust block (project setting) per counted bend and tee; PE encasement on DI | D-859 |
| Q26 | Source links on workspace and project prices; none on IntelCost's | D-860 |
| Q27 | Quarterly IntelCost release from Developer › Material prices; M11 | D-861 |
| Q28 | Material for every structure type: parts, cast-in-place, or whole structure | D-862 |
| Q29 | Missing structure types: a later plan; flared end sections and drop manholes first; a drop is an option on a manhole, not a type | D-863 |
| Q30 | Pressure tees detected (M4a) only for their restraint or thrust block; the tee fitting stays in the 20 % allowance | D-863 |
| Q31 | Restraint the default; a thrust block reads "Enter the block's CY" until the project table has a value; the founder names the agency standard before M4a | D-863 |
| Q32 | Rebar 100 lb/CY, a setting, IntelCost's proposal; the founder checks it before M4b | D-863 |
| C1 | Pipe rounds to full joints within each bid (base bid and each alternate apart), spread by LF share inside the bid | D-864 |
| C2 | Cleanout riser at its own diameter in the run's family; wye run size × cleanout size | D-865 |
| C3 | M10 narrowed to a core set; the core, not all 495, required before testers | D-866 |
| C4 | Block P first, then the first cut, then M9 and the rest | D-867 |
| Q33 | A sub-layer rounds with its main layer | D-868 |
| Q34 | The core adds the 32 pressure bends, zone sand and trench-bottom geotextile: 123 keys | D-868 |

---

## 10. Open questions

- **M10's grade rule.** D-866 C3 has every core key quoted and graded B; the research is national bid data graded A–F. **Recommended:** keep each key's research grade on the price, use the founder's quote where one exists, and read C3's "quoted, never filled" as "never an F-grade fitted or derived figure in the core".

## Risks

- **Prices date fast.** Hence the basis, the date, the links, expiry, the snapshot, the quarterly Review
  and the stale flag.
- **Rounding within a bid** puts a share of one line's order on another line of the same bid. The spread
  is by LF, and the row says "of 518 LF ordered in Base Bid". A bid never takes another bid's rounding.
- **New quantities** (joints, bends, tees, structure parts, water stretches) each get a row in the
  shared quantity table before they price.

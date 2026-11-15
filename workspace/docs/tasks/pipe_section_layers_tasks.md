# Pipe section layers and the live trench picture: the plan (D-1278)

**Status:** plan written 2026-11-16 (night run 2026-11-15 → 16, Part 6), reviewed by the founder (D-1278's answers and
the three-night build plan). **Night 1 (D-1280): tasks 1–4 built, no visible change**: the engine and the presets are
not wired into Calculate (night 2: tasks 5, 6, 9; night 3: tasks 7, 8, 10). The founder's brief is in
`intelcost-infra/morning-report-2026-11-16/BRIEF.md`, Part 6, items 1–5.

| # | Task | Status (D-1280) |
|---|---|---|
| 1 | `layers.ts` | Built: layer keys, thickness, top, width and compaction rules; `readLayers`, `resolveStack` (absent → `legacy`), `bellOf`, `sectionGeometry` |
| 2 | `sectionPresets.ts` | Built: 27 presets (the plan's 25 and the founder's two house presets, `c600_t4_house`, `c605_t4_house`), each with a source and grade; `defaultPreset` |
| 3 | Engine | Built: `section.ts:layerAreas` (bands, barrel and bell by circle segments), `runQuantities`' `layered` input (every band top cut, per-layer sums `RunQuantities.layers`, `sectionCheck`, rock bedding, segment stacks); with no `layered` input, today's path unchanged |
| 4 | Quantity-table rows | Built: the 26 hand rows (+ 3 more and a defaults row) as `section-layers` / `section-defaults` in `utility-cases.mjs`, all right |
| 5–10 | | Night 2 and night 3 |

**Reconciled with D-1275 before task 1 (D-1280):**
- **Minimum covers** stay `cover.ts:MIN_COVER` / `minCoverFt` (storm 2 ft and sanitary 3 ft grade C, editable in the
  library settings; pressure types the company's cover). The picture's red cover warning (task 8) and the mock-up row
  read `cover.ts:coverFlags`; the section engine adds no cover rule of its own.
- **Bedding:** the `legacy` preset keeps the project's bedding (6 in) and zone (12 in over the crown), so pressure
  bedding stays 6 in until night 2 wires the section in. The house pressure preset is C600/C605 Type 4 bedding,
  max(OD/8, 4 in), with the embedment to 12 in over the crown (D-1278 answer 1).
- **Depth:** unchanged rule; the trench bottom is the invert less the wall, the foundation and the bedding.

**Depends on D-1275 (Part 3, the same night).** Part 3 sets the trench depth: gravity is invert + bottom wall + bedding,
and pressure is cover + OD + bedding. It also adds a cover warning by type. When this plan was written, D-1275's body
was still empty. Section 1.2 shows that today's engine already works the depth that way. This plan takes
**Part 3's per-type minimum covers** as the warning's source. It also takes **Part 3's bedding thickness** as the
bedding layer's thickness for the legacy preset. Reconcile both with D-1275 before building task 1.

**Mock-up:** [trench-picture-mockup.svg](../../intelcost-infra/morning-report-2026-11-16/part6/trench-picture-mockup.svg).
A PNG render sits beside it. It is not in git (D-1259).

![Live trench picture mock-up](../../intelcost-infra/morning-report-2026-11-16/part6/trench-picture-mockup.svg)

---

## 1. Audit: today's section against the standards

### 1.1 What the standards require

**Confidence grades:**

| Grade | Meaning |
|---|---|
| A | Read in the standard, or in a maker's sheet that reproduces the standard's figure |
| B | Two or more secondary sources agree |
| C | One secondary source, or common practice |
| D | IntelCost's own assumption |

| Standard | Applies to | Bedding under the pipe | Haunch / embedment | Over the crown | Trench width | Compaction | Grade, source |
|---|---|---|---|---|---|---|---|
| **AWWA C150 / C600, laying conditions Types 1–5** | Ductile iron pressure | T1, T2: flat bottom, undisturbed earth, no bedding. T3: 4 in minimum of loose soil. T4: sand, gravel or crushed stone to OD/8, 4 in minimum. T5: compacted granular to the centerline, 4 in minimum under the pipe | T1: loose backfill. T2: lightly consolidated to the centerline. T3: lightly consolidated to the top of the pipe. T4: compacted to the top of the pipe. T5: compacted granular or select material to the top of the pipe | Nothing over the crown in any type | Not set by the figure | T4 ≈ 80 % SP (AASHTO T-99). T5 ≈ 90 % SP. "Loose soil" and "select" mean native soil free of rocks, foreign material and frozen earth. For 14 in and larger, use a type other than T1 | **A**: DIPRA laying-conditions figure as McWane reprints it [S1] |
| **AWWA C605, Types 1–5** | PVC and PVCO pressure (C900, C909, C905) | The same five types, worded as in C600. T4 bedding is OD/8 or 4 in, whichever is greater | As C600 | As C600 | Not confirmed | As C600 | **B**: Iowa DOT PVC bedding standard [S2], the C605 preview [S3] |
| **ASTM D2321** | Flexible thermoplastic gravity pipe (PVC sewer, HDPE, PP) | 4 in minimum, 6 in on a rock foundation. Leave the middle third under the pipe loose | Haunch to the springline | Initial backfill to at least 6 in over the crown | The greater of OD + 16 in and 1.25 × OD + 12 in | Class I placed and consolidated. II, III and IVA by % SP. The pairing of 85/90/95 % with each class is **C** | Width: **B** [S4][S5][S6]. Bedding and initial backfill: **B** from the 2005 edition's text [S7]. Compaction pairing: **C** |
| **ASTM C1479 / ACPA Standard Installations, Types 1–4** | RCP (C76) | T1–T3: Do/24, 3 in minimum. On rock, Do/12 with 6 in minimum. T4: no bedding, except on rock (Do/12, 6 in minimum). Middle bedding Do/3 wide, loosely placed and not compacted | Haunch and outer bedding to the springline. Lower side beside them | None: the overfill is native | Do/6 minimum clearance each side in a trench | Haunch and outer bedding: T1 95 % Cat I / 90 % II / 100 % III. T2 90 % I / 95 % II / 100 % III. T3 85 % I / 90 % II / 95 % III. T4 none (Cat III 85 %). Lower side: T1 90 % I, T2 85 % I, T3 85 % I, T4 none | **B**: ACPA DD 9M and the C1479 excerpts [S8][S9]. The exact lower-side figures need the table itself |
| **Legacy bedding Classes A / B / C / D** (ASCE / WEF practice, ASTM C12 for clay) | RCP and VCP specs that still cite them | B: 4 in or OD/8, whichever is greater (C12). C: the same. A: a concrete cradle | B: granular to the springline. C: granular to OD/6. A: the cradle up the sides | B: 12 in. C: 6 in. Both often select, hand-placed | Common details use OD + 24 in | Not set | Bedding: **B** for clay (C12) [S10]. RCP use and the over-crown figures: **C** |
| **30 TAC §217.54 (Texas wastewater)** | Every collection-system pipe in Texas | At least 6 in **below and on each side of the bell** | Haunch and initial backfill, as the "appropriate standards" | **At least 12 in above the crown** | Wide enough to lay, joint and compact. Wider than the compaction equipment. The engineering report states the maximum and minimum | To the maker's recommendations, giving the E′ the design needs | **A**: the rule's text [S11] |
| **NEC Table 300.5 (≤1000 V) / Table 305.15(A) (over 1000 V)** | Dry utilities | No bedding set by the code | Material with rock that could damage the raceway is not allowed (300.5(F)) | **Cover** by wiring method. Col 1, direct-burial cable: 24 in. Col 2, RMC/IMC: 6 in. Col 3, nonmetallic raceway: 18 in. Col 4, residential 120 V GFCI: 12 in. Col 5, irrigation/landscape ≤30 V: 6 in. Under streets, roads and parking: 24 in. Over 1000 V: Table 305.15(A) | — | — | **B**: secondary sources agree on columns 1–3 [S12][S13]. Streets 24 in and the concrete-encased figures need the adopted edition |
| **ASTM D2774** | Thermoplastic pressure (PE, PVC) and gas | Firm, stable, continuous support. 4 in where the bottom is rock or unstable | Embedment around the pipe | Initial backfill 6–12 in over the pipe | Narrow, enough to joint and compact | Not set | **C** (common practice; the text was not reached). Gas cover is 49 CFR 192.327: 24 in for a main, 18 in in rock (**A**, already cited in `types.ts`) |
| **Houston cement-stabilized sand** (City of Houston Std. Spec. 02317 / 02320) | Local spec, any pipe | CSS bedding, 6 in typical | CSS embedment, 12 in over the crown typical | Under pavement, CSS backfill to the pavement's subgrade (today: 12 in below the surface, D-1084) | Per spec | CSS 1.5 sack, compacted | **C** (D-1084 and D-1108 already use it; thicknesses as the house practice) |
| **Full-trench CLSM** (ACI 229R) | Any pipe in a street | None or a thin lift | CLSM, self-levelling | CLSM to the subgrade | Narrow (no compaction room needed) | None. 50–150 psi excavatable | **C**. Pipe flotation needs restraint or lifts |
| **Concrete cradle / encasement** | Class A cradle; duct banks; shallow crossings | Cradle: OD/4, 4 in minimum, under the pipe | Cradle to OD/4 up the sides. Encasement 6 in all round (common detail) | Encasement 6 in | Encasement against the walls, or formed | — | **C** |

### 1.2 Today's section model, and where it differs

**Engine.** The pure engine is in `intelcost-app-react/src/lib/takeoff/earthwork/utilities/`.

- `section.ts:zones` makes three zones from one bedding thickness `tb` and one "zone above crown" `tz`:
  - **bedding** from 0 to `tb`;
  - **pipe zone** from `tb` to `tb + OD + tz`, placed over the bottom width only (D-1080 B4), less the pipe's barrel circle;
  - **backfill** from there to the surface.
- `quantities.ts:runQuantities` puts the trench bottom `(OD − ID)/2 + tb` under the invert.
- `breakpoints.ts:runProfile` puts a cover run's invert `(OD + ID)/2` below `G − cover`.

So the **depth rule Part 3 asks for already holds**: gravity depth is (G − invert) + wall + bedding, and pressure
depth is cover + OD + bedding.

**Inputs.** `features/takeoff/earthwork/utilities/calculate.ts:calculateUtilities` feeds the engine:

- `section: { sideClearanceIn, minWidthIn, beddingIn: settings.beddingIn, zoneAboveCrownIn: settings.zoneAboveCrownIn }`;
- the width from `trench.ts:sectionFor` and `trench.ts:pipeWidthFt`;
- the materials from `calculate.ts:runMaterials` → `materials.ts:embedmentDefault`.

| # | Today (file:function) | What the standards want | Effect |
|---|---|---|---|
| G1 | **One bedding thickness for every pipe on the project**: `settings.beddingIn` = 6 in (`trench.ts:DEFAULT_UTILITY_SETTINGS`, passed in `calculate.ts:calculateUtilities`). Only a segment can change it (`segmentsOf`) | C600/C605 T1–T2 none, T3 4 in, T4 max(OD/8, 4 in). D2321 4 in (6 in on rock). C1479 max(OD/24, 3 in), rock max(OD/12, 6 in), T4 none. 30 TAC: 6 in under the **bell** | Pressure: 6 in against the standard's 4 in (8–32 in pipe). RCP 36 in: 6 in against 3 in. No "extra on rock" and no "none" |
| G2 | **One pipe-zone top for every pipe**: `zoneAboveCrownIn` = 12 in over the crown (`section.ts:zones`) | C600/C605 T4–T5: to the **top of the pipe** (0 in). T2: to the **centerline**. D2321: 6 in over. 30 TAC: 12 in over. C1479: the springline (the overfill above is native) | 8 in C900 at 4 ft cover: today's sand is 0.150 CY/LF, C605 T4's is 0.064 CY/LF (−58 %). RCP 36 in: today's zone runs 12 in over the crown in imported material, C1479 stops at the springline |
| G3 | **No haunch layer, no springline or centerline top** (`section.ts:zones` has three zones) | Haunch to the springline (D2321, C1479), to the centerline (C600 T2/T5), with its own compaction | No haunch line, no compaction split |
| G4 | **No loose middle bedding** | C1479: a middle strip Do/3 wide, loose and uncompacted. D2321: the middle third loose | Volume is the same, compaction effort differs. Report-only today |
| G5 | **Trench width is OD + 2 × clearance with a minimum**: 12 in a side and 24 in for gravity, 6 in a side and 18 in for pressure (`trench.ts:sectionFor`, `PRESSURE_SECTION`, `pipeWidthFt`) | D2321: max(OD + 16, 1.25·OD + 12). C1479: OD + 2·OD/6. 30 TAC: bell OD + 2 × 6 in at least | 36 in RCP: today 68 in, C1479 58.7 → 60 in bucket. 8 in SDR 35: today 32.4 → 36 in, D2321 24.4 → 30 in |
| G6 | **The bell is never in the volume.** `section.ts:pipeArea` and `zones` take the barrel circle. `catalog.ts` keeps the RCP bell as `bellOd`, shown only (D-568). `crossings.ts:bellOd` (factors 1.20 / 1.25, grade D) feeds only the casing | Bedding and embedment are net of the pipe **and the bell**. 30 TAC measures its 6 in from the bell | RCP 36 in: bell annulus 3.21 SF × 1 ft per 8 ft joint = 0.40 SF/LF (0.015 CY/LF) of embedment not displaced today |
| G7 | **No foundation / stabilization layer** under the bedding. Undercut exists only for Site Features (D-1061). Rock is only "rock LF" (`quantities.ts`, `rockLF`) | C1479 and D2321 require more bedding on rock. Unstable bottoms take a stabilization stone layer | Not priced |
| G8 | **Materials are two picks** (`section.bedding_choice`, `section.zone_choice`), plus CSS backfill under pavement to 12 in below the surface (`calculate.ts:runMaterials`, D-1084). There is **no compaction anywhere** | Every standard names compaction by layer | Compaction cannot be shown or priced |
| G9 | **No cover minimum by type**: `defaultCoverFt` only supplies a cover when none is typed. Part 3 (D-1275) adds the warning | NEC by wiring method; 49 CFR 192.327 / .361; the company's water cover (D-1106) | Part 3 adds the warning; the picture draws it |
| G10 | **Dry utilities and gas take the project's #57 bedding and sand zone** (`materials.ts:embedmentDefault` returns null outside pressure and flexible gravity) | NEC sets no bedding (rock-free backfill only). D2774: sand bedding and 6 in over | Dry runs buy stone and sand that no standard requires |
| G11 | **Concrete encasement is a W × H box** (`types.ts:encasementCyPerLf`; `crossings.ts` for F48) beside the section, not a layer of it. There is no cradle | Cradle (Class A) and encasement are section layers | Cradle not offered |
| G12 | **The cross-section view** (`features/.../TrenchCutView.tsx`) draws the three zones at a sheet section's crossing only. The run panel has no picture, and Estimating has none | Brief item 4 | — |

---

## 2. The layered section

### 2.1 Layers, bottom up

Every layer is optional. Each carries a **material** (`ZONE_CHOICES` plus custom name, source and density), a
**thickness rule** and a **compaction** (`{ pct, test: "SP" | "MP" } | "loose" | "consolidated" | "none" | "per_spec" }`).

| Key | Layer | Thickness rule (choices) | Placed over |
|---|---|---|---|
| `foundation` | Foundation / stabilization (undercut) | `none` · `fixed in`. It lowers the trench bottom by its thickness | Bottom width |
| `bedding` | Bedding | `none` · `fixed in` · `od_fraction {den, minIn}` (OD/8 ≥ 4, OD/24 ≥ 3) · `under_bell {clearIn}` (30 TAC: clearIn + (bellOD − OD)/2) · plus `rock {den, minIn}` where the trench bottom is rock (the run's rock pieces, `quantities.ts` `rock`) · `middle_loose {frac: 1/3}` (reported apart, same material) | Bottom width |
| `haunch` | Haunch (and lower side) | top at `springline` · `centerline` (the same height for a round pipe) · `od_fraction_above_bottom {den}` (Class C: OD/6) · `od4_cradle` | Bottom width |
| `embedment` | Embedment top | `top_of_pipe` · `above_crown {in}` | Bottom width |
| `initial` | Initial / select backfill band | `band {in}` over the embedment top | Bottom width |
| `final` | Final backfill to subgrade | to the surface less the paved cap (D-1084). Material: native · select · CSS · CLSM | Full width (sloped or benched walls) |
| `surface` | Surface | Pavement section (the restoration line's thickness, today `PAVED_CAP_IN` = 12 in) or topsoil. Its volume is shown; it is priced by the restoration line, as today | Full width |

The heights above the trench bottom, in order:

- `zf` = foundation;
- `zb = zf + bedding` = the pipe's bottom;
- springline = `zb + OD/2`;
- crown = `zb + OD`;
- then the embedment, initial and final tops.

A layer whose top falls below the one under it takes no thickness. This is not silent: the picture warns
("Haunch ends below the bedding top"). A top that lands above the surface or the paved cap is clipped and warned.

### 2.2 Trench width rules

The bottom width is the largest of:

- **the preset's width rule**:
  - `od_plus {sideIn}` (today);
  - `d2321` = max(OD + 16, 1.25·OD + 12);
  - `acpa` = OD + 2·OD/6;
  - `bell_plus {sideIn}` = bell OD + 2·side;
- the **minimum width**;
- the **bucket** and the **box** (`trench.ts:trenchWidth`, unchanged).

Several pipes side by side keep `pipeWidthFt`'s n·OD + (n − 1)·gap, with the rule applied to the outer pipes.

### 2.3 Wall support

The walls are unchanged: Auto, vertical, sloped, benched, box and slide rail (`protection.ts`, D-1080, D-1128).

- **New warning:** a box whose inside width is less than the preset's width rule, for example a 24 in box for a
  D2321 8 in pipe that needs 24.4 in.
- The bedding to initial layers stay over the bottom width (D-1080 B4). What a sloped or benched trench is wider by
  belongs to the final backfill, as today.

### 2.4 Volumes per layer

The width is piecewise linear in height and every band is fixed relative to the trench bottom, so each layer's area
is exact. Each layer's area at a station is:

- `areaBetween(walls, W_layer, z0, z1)`, where `W_layer` is the bottom width for the bedding to initial layers
  (clipped as `zones` clips it today);
- **minus the barrel** inside the band: `circleShare` over (z0 − zb, z1 − zb), which already exists in
  `section.ts`;
- **minus the bell** inside the band: the annulus of the bell circle (bell OD, concentric) less the barrel circle,
  times bell length ÷ joint length.
  - Bell OD: `crossings.ts:bellOd`, grade D (D-1272 10).
  - Bell length: 0.5 ft to 12 in, 0.75 ft for 14–30 in, 1.0 ft from 33 in (**grade D**, until the maker table).
  - Joint length: `materials.ts` `FAMILY_SPEC.jointFt`.
  - Fused, welded, compression and solvent-weld pipe have no bell.
- The bell's part below the trench bottom is a hand-dug bell hole. It is **not** counted, and the picture says so.

`runQuantities` adds each layer's top to the cut heights (`cuts`, as `tb` and `zoneTop` are today). Each piece
stays quadratic in s, so the prismoidal rule stays exact. The sum of the layers plus the pipe and bell equals the
excavation. The quantity-table rows check that identity.

---

## 3. Presets, defaults and existing runs

### 3.1 Presets

Each preset is a stack of layer rules plus a width rule, held in a pure module, `sectionPresets.ts`. Every row
carries its source and grade, shown on the run.

| Preset id | Bedding | Haunch | Embedment top | Initial band | Final (unpaved / paved) | Width | Compaction shown |
|---|---|---|---|---|---|---|---|
| `legacy` | project `beddingIn` (6 in) or Part 3's | — | crown + project `zoneAboveCrownIn` (12 in) | — | project backfill / CSS to 12 in under the pavement | today's `sectionFor` | — (today's words) |
| `c600_t1` … `c600_t5` | none / none / 4 in native loose / max(OD/8, 4) granular / 4 in granular compacted | T2: native to the centerline. T5: granular to the centerline | T3–T5: top of pipe | — | native / CSS | `od_plus 6` (min 18) | T1 loose; T2, T3 lightly consolidated; T4 ≈ 80 % SP; T5 ≈ 90 % SP |
| `c605_t1` … `c605_t5` | as C600 | as C600 | as C600 | — | as C600 | `od_plus 6` (min 18) | as C600 |
| `d2321` | 4 in, rock 6 in, middle third loose, Class I #57 | springline, #57 | 6 in over the crown, #57 | — | native / CSS | `d2321` | Class I consolidated (II 85 %, III 90 %, IVA 95 % SP, **C**) |
| `d2321_tx` (30 TAC §217.54) | max(4 in, 6 in under the bell) | springline | **12 in over the crown** | — | native / CSS | max(`d2321`, `bell_plus 6`) | as D2321 |
| `c1479_t1` … `c1479_t4` | max(OD/24, 3), rock max(OD/12, 6), middle OD/3 loose. T4: none (rock rule kept) | springline; haunch and lower side by type | — (overfill native) | — | native / CSS | `acpa` | by type, as in §1.1 |
| `class_b` / `class_c` / `class_a_cradle` | max(OD/8, 4) granular / the same / concrete max(OD/4, 4) | springline / OD/6 / concrete to OD/4, then granular to the springline | — | select 12 in / 6 in / 12 in over the crown | native | `od_plus 12` | **C** |
| `nec` | none | — | — | — | native, rock-free (300.5(F)). Option: sand 3 in under and over (**D**) | `od_plus 3`, min 12 in | — |
| `d2774` | 4 in sand | — | 6 in over the crown, sand | — | native / CSS | `od_plus 6` (min 18) | **C** |
| `houston_css` | 6 in CSS | — | 12 in over the crown, CSS | — | CSS / CSS to 12 in under the pavement | project's | per spec |
| `clsm_full` | none | — | — | — | CLSM to subgrade (cap kept) | `od_plus 6` | none |
| `encasement_6` | 6 in concrete | — | concrete to 6 in over the crown, against the walls | — | native | `od_plus 6` | — |

Every layer stays editable per run (material, thickness rule, compaction). The run says "AWWA C605 Type 4, edited:
bedding 6 in".

### 3.2 The default preset, by utility type and pipe family

`sectionPresets.ts:defaultPreset(type, family, projectState, settings)` picks it.

| Types (base) | Pipe family | Default |
|---|---|---|
| Water main, water service, hydrant lead, fire line, force main, storm force main, reclaimed, irrigation | ductile iron | `c600_t4` |
| (same) | PVC C900 / C909 / C905 / D2241 / Sch | `c605_t4` |
| (same) | HDPE IPS, PE CTS, copper | `d2774` |
| Sanitary main, service, grease waste (gravity) | flexible (PVC sewer, PP, HDPE, DWV) | `d2321`, **`d2321_tx` when the project's state is TX** |
| (same) | VCP, DI, C900 on gravity | VCP `class_b`; DI `c600_t4`; C900 `c605_t4`, with 30 TAC's 12 in over the crown in TX |
| Storm main, lead, culvert | RCP | `c1479_t2` |
| (same) | HDPE / PP dual wall, PVC sewer, CMP | `d2321` |
| Roof drain, subdrain, foundation drain | any | `d2321` |
| Gas main, gas service, fuel/oil, chilled water | any | `d2774` (the cover from 49 CFR 192 stays the type's, `types.ts`) |
| Electric primary/secondary, site lighting, telecom, traffic signal, low voltage | conduit | `nec` (the cover column from the type, `types.ts` `coverFt`) |
| Concrete encasement (type) | — | `encasement_6` |
| Casing (bored), Other | — | none (bored) / `legacy` |

Two of today's settings map onto these defaults, so a project's choice carries over:

- **Houston CSS:** the project's or company's `flexibleEmbedment = "css"` (D-1108) makes `houston_css` the flexible
  gravity default.
- **The project's own embedment:** `pressureEmbedment = "project"` (D-1100) keeps `legacy` for pressure.

### 3.3 Existing runs keep their section

The data goes in the run's existing `section` JSONB (`utility_run.section`, `models.py`), next to `addons`,
`crossing` and `restrained_pct`:

```ts
section.layers?: {
  v: 1;
  preset: "auto" | PresetId;          // "auto": the type and pipe's default, worked at Calculate (the pipe may change)
  edits?: Partial<Record<LayerKey, { material?: ZoneChoice | { name: string; source: "imported" | "native"; density_pcf: number | null };
                                    thickness?: ThicknessRule; compaction?: Compaction; off?: true }>>;
  width?: WidthRule;                  // over the preset's
  rock_bedding?: boolean;             // the rock rule where the bottom is rock (default true)
}
```

- **`section.layers` absent means `legacy`.** It is today's code path, unchanged, so a run drawn before (every one of
  the founder's runs) keeps its quantities to the cent. That is the D-1260 pattern for `addons`.
- **A new run writes `layers: { v: 1, preset: "auto" }`** in `types.ts:newRunSection`.
- **"Switch to <standard>"** on an old run shows the CY change by layer before it applies, and it can be undone.
- `bedding_choice` and `zone_choice` stay read for `legacy`, and are offered as the bedding and embedment
  materials' edits for the others.
- **No database migration.** `section` is JSONB, and `utility_schemas.py` passes it as `dict[str, object]`.
- **Project setting `section_presets: dict[type, PresetId]`.** This is the one schema touch: a field in the api's
  pydantic `UtilitySettingsWrite` (`utility_schemas.py`). It is still no migration, because `utility_settings` is
  JSONB. It is needed because `model_dump()` drops unknown keys.
- A company-wide preset per type waits. Library settings hold numbers only (`equipment/service.py`).

**Lines.** The estimate's line identity stays the same, so the founder's estimates do not move:

| Layer | Role | Variant | Line name |
|---|---|---|---|
| bedding | `utility_bedding_pipe_zone` | `bedding:<name>\|<source>` | "Pipe bedding, …" |
| haunch, embedment, initial | `utility_bedding_pipe_zone` | `zone:…` | "Pipe zone, …" |
| final | `utility_backfill` | as today | as today |
| foundation (new) | `utility_bedding_pipe_zone` | `foundation:<name>\|<source>` | "Trench foundation, …" |
| concrete layers | — | — | the encasement line of D-1260 / D-1269 |
| CLSM | — | — | D-1269's CLSM line |

Compaction goes in the line's note, not its identity (see open question 3).

---

## 4. The live trench picture

**Where.**

- **In the run panel** (`RunPanel.tsx`), a "Section" block under the Pipe fields: the preset select, "Edit layers…",
  and the picture with its table.
- **From Estimating**, the same component read-only. A run's row in a utility line's breakdown (the D-938 rows,
  `EstimatingView.tsx` ~l.1640, `assemblyGroups.ts`) gets a "Section" button.

**What it draws.** The new component is `TrenchSectionPicture.tsx`. It reuses `TrenchCutView`'s Dim, Label and
soil patterns. Everything is to scale:

- the trench walls (vertical, sloped from `from`, benched, box with panels, slide rail);
- the pipe at its OD and ID, and the bell dashed at its true OD;
- every layer filled and hatched by material, with its thickness labelled on the left;
- the surface: the pavement section or topsoil;
- the foundation or undercut;
- the dimensions:
  - bottom and top width, with what set the width (rule, bucket or box);
  - depth from finished grade;
  - cover over the crown;
  - invert and trench-bottom elevations;
- finished grade dashed.

**Which section.** A segmented control picks one of three, all taken from the same pieces the volumes integrate
(`RunQuantities.shape` → `trenchAt`):

| Choice | What it shows |
|---|---|
| **Average** | The section at the run's LF-weighted mean trench depth, labelled with that depth |
| **Deepest** | The station with the largest `h` (the pieces' ends) |
| **Shallowest** | The station with the smallest `h` |

Segments that change layers show the segment's own stack at its station.

**Behaviour.** It redraws as settings change. A field edit re-runs `runQuantities` for that run alone in the page,
debounced 150 ms; that takes milliseconds and needs no worker. It is the same function Calculate calls, so the
picture and the estimate cannot differ.

**States:**

| State | What shows |
|---|---|
| Loading | The run's Calculate inputs not yet loaded: a skeleton |
| Empty | No depth (no inverts, slope or cover) or no ground: the run's existing skip message, no picture |
| Error | The engine throws: "Couldn't draw this section" with the run kept editable |
| Read-only | Guest or Estimating: no controls but the section choice |
| Stale | Settings changed since the last Calculate: a "Calculate to update the estimate" chip. The picture is live, the lines are not |

**Warnings drawn on it:**

- **Red:**
  - cover over the crown below the type's minimum (from D-1275), with its dimension drawn red;
  - a layer that doesn't fit (its top above the surface or the paved cap; the haunch top under the bedding; the
    bedding + OD deeper than the trench);
  - a box narrower than the preset's width;
  - a trench wider than the spec maximum (existing flag).
- **Amber:**
  - the bell from IntelCost's factors (grade D);
  - stacked boxes not modelled (existing);
  - the bell hole not counted.

**Table beside it.** Per layer:

- thickness at the shown section;
- material and source;
- compaction;
- **CY/LF at the shown section**;
- **run CY**, the totals from `RunQuantities`, the very figures the estimate's lines carry;
- the pipe + bell displacement and the excavation, with a check line showing that the layers sum to the excavation.

For Estimating, Calculate stores a small summary with the run, `StoredRun.sections?`: the three sections' `h`, `W`,
walls, layer heights and per-layer CY/LF. Estimating then draws without the takeoff's inputs. A result from before
says "Calculate again to see the section".

---

## 5. Hand-worked quantity-table rows

**Common inputs:**

- 100 LF, constant depth, protection **vertical** typed (so the walls do not change the arithmetic), unpaved unless
  stated;
- bucket Auto: the bottom width is the larger of the rule and the next standard bucket (12 … 60 in);
- volumes are net of the barrel and the bell.

**Pipes:**

| Pipe | OD | ID | Bell OD | Bell length per joint |
|---|---|---|---|---|
| DI 8 in PC 350 | 9.05 | 8.55 | 11.31 (1.25 ×) | 0.5 ft / 18 ft |
| C900 8 in DR 18 | 9.05 | 8.044 | 10.86 (1.20 ×) | 0.5 ft / 20 ft |
| SDR 35 8 in | 8.40 | 7.92 | 10.08 | 0.5 ft / 14 ft |
| RCP 36 in Wall B | 44 | 36 | 50.25 (Rinker) | 1.0 ft / 8 ft |
| Conduit 4 in Sch 40 | 4.5 | 4.026 | no bell | — |
| PE 4 in IPS DR 11 | 4.5 | 3.682 | no bell | — |

**Formulas:**

- Barrel area: π·D²/4. 8 in C900/DI 0.4467 SF; SDR 35 0.3848; RCP 36 10.5592; 4 in 0.1104.
- Bell displacement per LF: (Lb/Lj)·π/4·(Db² − D²). DI 0.0070 SF; C900 0.0049; SDR 35 0.0060; RCP 0.4016.
- A band's pipe share is the circle segment between its heights: A(t) = r²·acos((r − t)/r) − (r − t)·√(2rt − t²).
- CY/LF = net SF ÷ 27. Run CY = CY/LF × 100.

**Rows.** "Gross" is the layer's width × thickness. "Net" is gross less the pipe and bell inside it.

| Row id | Case | W (rule → bucket) | h (ft) | Layer: thickness · gross SF − pipe − bell = net SF → CY/LF (100 LF CY) | Excavation CY |
|---|---|---|---|---|---|
| `sect-legacy` | Today's case (a), 8 in SDR 35 in clay, 8 ft | — | — | **identical to `util` case (a)'s expect, every field** (section.layers absent) | as (a) |
| `sect-c600-t1` | DI 8, cover 4.0 | 21.05 → 24 in | 4 + 0.7542 + 0 = 4.7542 | final native 57.05 in · 9.5083 − 0.4467 − 0.0060 = 9.0557 → 0.3354 (33.54). The bell below the bottom, 0.0010, not counted | 2.0 × 4.7542 ÷ 27 × 100 = 35.22 |
| `sect-c600-t2` | DI 8, cover 4.0 | 24 in | 4.7542 | haunch to centerline 4.525 in · 0.7542 − 0.2234 − 0.0025 = 0.5283 → 0.0196 (1.96); final 8.7542 − 0.2234 − 0.0035 = 8.5273 → 0.3158 (31.58) | 35.22 |
| `sect-c600-t3` | DI 8, cover 4.0 | 24 in | 4 + 0.7542 + 0.3333 = 5.0875 | bedding 4 in native loose · 0.6667 − 0 − 0.0010 = 0.6657 → 0.0247 (2.47); embedment to top 9.05 in · 1.5083 − 0.4467 − 0.0050 = 1.0567 → 0.0391 (3.91); final 48 in · 8.0000 − 0.0010 = 7.9990 → 0.2963 (29.63) | 37.69 |
| `sect-c600-t4` | DI 8, cover 4.0 | 24 in | 5.0875 | bedding max(9.05/8 = 1.13, 4) = 4 in sand → 0.0247 (2.47); embedment to top sand → 0.0391 (3.91); final → 0.2963 (29.63) | 37.69 |
| `sect-c600-t5` | DI 8, cover 4.0 | 24 in | 5.0875 | bedding 4 in → 0.0247 (2.47); haunch to centerline 4.525 in · 0.7542 − 0.2234 − 0.0025 = 0.5283 → 0.0196 (1.96); embedment centerline to top 4.525 in · 0.5283 → 0.0196 (1.96); final → 0.2963 (29.63) | 37.69 |
| `sect-c605-t1` | C900 8, cover 4.0 | 24 in | 4.7542 | final · 9.5083 − 0.4467 − 0.0043 = 9.0574 → 0.3355 (33.55) | 35.22 |
| `sect-c605-t2` | C900 8, cover 4.0 | 24 in | 4.7542 | haunch 0.7542 − 0.2234 − 0.0018 = 0.5290 → 0.0196 (1.96); final 8.7542 − 0.2234 − 0.0025 = 8.5284 → 0.3159 (31.59) | 35.22 |
| `sect-c605-t3` | C900 8, cover 4.0 | 24 in | 5.0875 | bedding 0.6667 − 0.0006 = 0.6660 → 0.0247 (2.47); embedment 1.5083 − 0.4467 − 0.0036 = 1.0580 → 0.0392 (3.92); final 8.0000 − 0.0006 = 7.9994 → 0.2963 (29.63) | 37.69 |
| `sect-c605-t4` | C900 8, cover 4.0 | 24 in | 5.0875 | as T3, sand: 0.0247 (2.47) / 0.0392 (3.92) / 0.2963 (29.63). Against today's legacy sand, bedding 6 in + zone 12 in over the crown: 0.1504 CY/LF, so **−58 %** | 37.69 (legacy 5.2542 ft: 38.92) |
| `sect-c605-t5` | C900 8, cover 4.0 | 24 in | 5.0875 | bedding 0.0247 (2.47); haunch 0.5290 → 0.0196 (1.96); embedment 0.5290 → 0.0196 (1.96); final 0.2963 (29.63) | 37.69 |
| `sect-d2321` | SDR 35 8, invert 8.00 ft below G | max(24.4, 22.5) = 24.4 → 30 in | 8 + 0.02 + 0.3333 = 8.3533 | bedding 4 in · 0.8333 − 0.0008 = 0.8325 → 0.0308 (3.08); haunch to springline 4.2 in · 0.875 − 0.1924 − 0.0022 = 0.6803 → 0.0252 (2.52); initial to 6 in over 10.2 in · 2.125 − 0.1924 − 0.0030 = 1.9296 → 0.0715 (7.15); final 81.84 in · 17.05 → 0.6315 (63.15) | 2.5 × 8.3533 ÷ 27 × 100 = 77.35 |
| `sect-d2321-tx` | as above, 30 TAC | max(24.4, 22.5, 10.08 + 12) → 30 in | 8 + 0.02 + 0.57 = 8.59 | bedding 6 + (10.08 − 8.4)/2 = 6.84 in · 1.425 − 0.0008 = 1.4242 → 0.0527 (5.27); haunch 0.6803 → 0.0252 (2.52); initial to 12 in over 16.2 in · 3.375 − 0.1924 − 0.0030 = 3.1796 → 0.1178 (11.78); final 75.84 in · 15.80 → 0.5852 (58.52) | 79.54 |
| `sect-c1479-t1` | RCP 36, invert 10.00 ft | 44 + 2·44/6 = 58.67 → 60 in | 10 + 0.3333 + 0.25 = 10.5833 | bedding max(44/24 = 1.83, 3) = 3 in · 1.25 − 0.0441 = 1.2059 → 0.0447 (4.47), of which middle 44/3 = 14.67 in loose: 0.3056 SF gross; haunch + lower side to springline 22 in · 9.1667 − 5.2796 − 0.1563 = 3.7307 → 0.1382 (13.82); overfill 102 in · 42.5 − 5.2796 − 0.2008 = 37.0196 → 1.3711 (137.11) | 5 × 10.5833 ÷ 27 × 100 = 195.99 |
| `sect-c1479-t2` | as T1 | 60 in | 10.5833 | as T1; compaction words 90 % / 85 % Cat I | 195.99 |
| `sect-c1479-t3` | as T1 | 60 in | 10.5833 | as T1; 85 % / 85 % | 195.99 |
| `sect-c1479-t4` | RCP 36, no bedding | 60 in | 10.3333 | haunch + lower side native 22 in · 3.7307 → 0.1382 (13.82); overfill 37.0196 → 1.3711 (137.11). The bell's 0.0441 below the bottom, not counted | 191.36 |
| `sect-class-b` | RCP 36, invert 10.00 ft | OD + 24 = 68 in | 10 + 0.3333 + 0.4583 = 10.7917 | bedding max(44/8 = 5.5, 4) = 5.5 in · 2.5972 − 0.0445 = 2.5528 → 0.0945 (9.45); haunch to springline 22 in · 10.3889 − 5.2796 − 0.1563 = 4.9529 → 0.1834 (18.34); initial 12 in over 34 in · 16.0556 − 5.2796 − 0.2008 = 10.5751 → 0.3917 (39.17); final 68 in · 32.1111 → 1.1893 (118.93) | 5.6667 × 10.7917 ÷ 27 × 100 = 226.49 |
| `sect-class-c` | as B | 68 in | 10.7917 | bedding 5.5 in → 0.0945 (9.45); haunch to OD/6 = 7.33 in · 3.4630 − 1.1568 − 0.0704 = 2.2358 → 0.0828 (8.28); initial to 6 in over · 20.1481 − 9.4025 − 0.2867 = 10.4589 → 0.3874 (38.74); final 74 in · 34.9444 → 1.2942 (129.42) | 226.49 |
| `sect-class-a` | as B, concrete cradle | 68 in | 10 + 0.3333 + 0.9167 = 11.25 | cradle max(44/4, 4) = 11 in under, to 11 in above the pipe bottom, 22 in · 10.3889 − 2.0643 − 0.1387 = 8.1858 → 0.3032 (30.32) concrete; haunch to springline 11 in · 5.1944 − 3.2153 − 0.0621 = 1.9171 → 0.0710 (7.10); initial 10.5751 → 0.3917 (39.17); final 1.1893 (118.93) | 236.11 |
| `sect-nec-col3` | 4 in Sch 40 conduit, cover 1.5 ft (col 3) | OD + 2·3 = 10.5 → min 12 → 12 in | 1.5 + 0.375 = 1.875 | final native rock-free 22.5 in · 1.875 − 0.1104 = 1.7646 → 0.0654 (6.54) | 6.94 |
| `sect-d2774` | PE 4 in DR 11 gas, cover 3.0 | 16.5 → 18 in | 3 + 0.375 + 0.3333 = 3.7083 | bedding 4 in sand 0.5 → 0.0185 (1.85); embedment to 6 in over 10.5 in · 1.3125 − 0.1104 = 1.2021 → 0.0445 (4.45); final 30 in · 3.75 → 0.1389 (13.89) | 20.60 |
| `sect-houston-css` | SDR 35 8, invert 8.00 ft, **paved** | OD + 24 = 32.4 → 36 in | 8 + 0.02 + 0.5 = 8.52 | bedding 6 in CSS 1.5 − 0.0008 = 1.4992 → 0.0555 (5.55); embedment to 12 in over 20.4 in · 5.1 − 0.3848 − 0.0053 = 4.7099 → 0.1744 (17.44); backfill CSS to 12 in under the pavement 63.84 in · 15.96 → 0.5911 (59.11); surface 12 in · 3.0 → 0.1111 (11.11, the restoration's) | 3 × 8.52 ÷ 27 × 100 = 94.67 |
| `sect-clsm` | C900 8, cover 4.0, paved | 24 in | 4.7542 | CLSM 45.05 in · 7.5083 − 0.4467 − 0.0043 = 7.0574 → 0.2614 (26.14); surface 12 in · 2.0 → 0.0741 (7.41) | 35.22 |
| `sect-encasement-6` | 4 in conduit, cover 2.0 | 16.5 → 18 in | 2 + 0.375 + 0.5 = 2.875 | concrete bottom 6 in · 0.75 → 0.0278 (2.78); concrete to 6 in over 10.5 in · 1.3125 − 0.1104 = 1.2021 → 0.0445 (4.45); final 18 in · 2.25 → 0.0833 (8.33). Concrete 0.0723 CY/LF against the walls (D-1260's formed 16.5 × 16.5: 0.0659) | 15.97 |
| `sect-mockup` | C900 8, **cover 3.0** (under the 4.0 minimum), C605 T4, paved | 24 in | 3 + 0.7542 + 0.3333 = 4.0875 | bedding 0.0247 (2.47); embedment 0.0392 (3.92); CSS 24 in · 4.0 − 0.0006 = 3.9994 → 0.1481 (14.81); surface 0.0741 (7.41); flag `cover_below_min` | 30.28. Check: 0.0741 + 0.1481 + 0.0392 + 0.0247 + (0.4467 + 0.0049)/27 = 0.3028 |

Every row also asserts: Σ layers + pipe + bell (inside the trench) = excavation, to 0.01 CY. The bell part below the
bottom is excluded.

The rows go in `intelcost-infra/browser/lib/utility-cases.mjs` as a new kind, `section-layers`
(pipe, depth or cover, preset, edits, paved → expect: W, h, per-layer CY, excavation CY, flags). The hand checks
were worked with a throwaway script outside the repos. The table above is the record.

---

## 6. Build estimate and order

| # | Task | Repo | Hours |
|---|---|---|---|
| 1 | `layers.ts` (pure): layer keys, thickness, width and compaction rules; resolve a run's stack from `section.layers`, the type, the family and the settings; `legacy` maps to today's three zones exactly | app | 6 |
| 2 | `sectionPresets.ts` (pure): the 25 presets with source and grade; `defaultPreset` by type, family, state and the D-1100/D-1108 settings | app | 5 |
| 3 | Engine: `section.ts` gains `layerAreas` (bands, barrel and bell by circle segment), `zones` kept as the legacy wrapper; `runQuantities` cuts at every layer top, sums per layer (`RunQuantities.layers`), drop = wall + foundation + bedding; segments override per layer; bell table (grade D) | app | 10 |
| 4 | Quantity-table rows (§5) as `section-layers`, the drive reading them; run it, all PASS | infra | 4 |
| 5 | `calculate.ts` and `lines.ts`: the resolved stack into `RunInput`; width rules into `pipeWidthFt`; lines by role and variant (legacy identical, `foundation:` new); compaction in the note; `StoredRun.sections` summary | app | 6 |
| 6 | Project setting `section_presets` (api pydantic field, no migration) and its Utility settings row per type | api, app | 4 |
| 7 | Run panel: the Section select, Edit layers dialog (material, thickness rule, compaction, off), "Switch from legacy" with the CY change by layer and undo | app | 8 |
| 8 | `TrenchSectionPicture.tsx`: to scale, walls by protection, pipe and bell, layers hatched (tokens: `--trench-bedding`, `--trench-zone`, `--soil-stabilized`, `--soil-native`, `--terrain-base`, new `--trench-foundation`, `--trench-concrete`, `--trench-clsm` light and dark), dimensions, Average/Deepest/Shallowest, warnings, table; live re-run debounced; the five states | app | 12 |
| 9 | Estimating: the run row's Section button, the picture read-only from `StoredRun.sections` | app | 4 |
| 10 | Gates, the quantity table, one MCP smoke on a throwaway (a C900 run switched legacy → C605 T4, the picture redraws, the lines move by the table's figures; a 36 in RCP on C1479 T2; Estimating read-only), FEATURES/DECISIONS/SINCE_ARCHIVE, mirror | all | 5 |
| | **Total** | | **64 h** (±25 %; the picture's label placement is the likeliest overrun) |

**Order:** 1 → 2 → 3 → 4 (prove the engine against the hand rows before any UI) → 5 → 6 → 7 → 8 → 9 → 10.

- Tasks 1–4 change no quantity on any existing run: `legacy` is the only path an existing run takes.
- Task 5 is the first that changes **new** runs' lines.

---

## 7. Open questions for the founder

1. **Pressure default C600/C605 Type 4.** It cuts an 8 in C900's sand by 58 % (0.150 → 0.064 CY/LF at 4 ft cover).
   The bedding is 4 in, not 6, and the embedment stops at the top of the pipe, not 12 in over it. Keep Type 4 as the
   default, or make the house standard Type 4 with 12 in over the crown?
2. **Texas 30 TAC §217.54.** Apply it automatically to every sanitary gravity run when the project's state is TX
   (12 in over the crown, 6 in under the bell), or only when chosen?
3. **Compaction.** Words only on the line (this plan), or priced: compactor passes per lift by % and material, a
   later block?
4. **The bell.** Length 0.5 / 0.75 / 1.0 ft by size, and the bell hole below the trench bottom not counted, both
   grade D until the maker table. Acceptable?
5. **Encasement.** Concrete placed against the trench walls (a layer, the trench's width), or D-1260's formed
   W × H box with native backfill beside it?

## Sources

- [S1] DIPRA laying conditions (Types 1–5), as reprinted by McWane Ductile: https://www.mcwaneductile.com/upl/downloads/catalog/products/pipe-laying-conditions-9f4064dc.pdf
- [S2] Iowa DOT, PVC pipe bedding standard (OD/8 or 4 in): https://ia.iowadot.gov/design/SRP/IndividualStandards/sw104.pdf
- [S3] AWWA C605-13 preview: https://webstore.ansi.org/preview-pages/awwa/preview_c605-2013.pdf
- [S4] ASPE, D2321 trench width: https://aspe.org/pipeline/?p=3180
- [S5] Charlotte Pipe, burying plastic pipe (D2321 width): https://www.charlottepipe.com/articles/burying-plastic-pipe-in-underground-dwv-applications
- [S6] Uni-Bell, PVC Pipe Design and Construction, chapter 12 (cited by search; the link was 404 when fetched): https://www.uni-bell.org/communication/images/pvcpdc_chapter12.pdf
- [S7] ASTM D2321 (2005 edition text, via Scribd): https://www.scribd.com/doc/248063011/ASTM-D-2321
- [S8] ACPA DD 9M, Standard Installations and Bedding Factors: https://old.concretepipe.org/wp-content/uploads/2014/09/DD9M_StandardInstallationsandBeddingFactorsfortheIndirectDesignMethod.pdf
- [S9] ACPA, Standard Installations: https://resources.concretepipe.org/standard-installations
- [S10] ASTM C12 (clay pipe installation; bedding classes): https://softbank.iust.ac.ir/Railway/Codes/ASTM-standard/ASTM_2004_Standards/ASTM%202004%20PART%20IB/ASTM%202004%20Volume%2004.05%20Chemical-Resistant%20Nonmetallic%20Materials_%20Vitrified%20Clay%20Pipe_%20Concrete%20Pipe_o/C%2012%20-%2001%20%20_QZEYLTAX.pdf
- [S11] 30 TAC §217.54, Criteria for Laying Pipe: https://www.law.cornell.edu/regulations/texas/30-Tex-Admin-Code-SS-217-54
- [S12] EC&M, Requirements for Underground Cables and Raceways (NEC 300.5): https://www.ecmweb.com/national-electrical-code/stumped-code-requirements-underground-cables-and-raceways
- [S13] NEC Table 300.5, a municipal reprint: https://colleyville.com/home/showpublisheddocument/126/636039493188130000
- 49 CFR 192.327 and 192.361 (gas cover), already cited in `types.ts`.

# Dewatering and weather: the plan (no code)

**Status:** plan written 2026-11-15 (the founder's planning brief, Plan A), research and writing only. No D-number yet:
main logs one when the founder adopts it. Brief: `intelcost-infra/morning-report-2026-11-16/plans/BRIEF-PLANS.md`.
Its companion is [equipment_library_improvements.md](equipment_library_improvements.md) (Plan B); the ranking of
every item in both plans and the build order across nights are in §10 of that file. This plan's own tasks and order
are in §9.

**Mock-up:** [site-water-mockup.svg](../../intelcost-infra/morning-report-2026-11-16/plans/site-water-mockup.svg).
A PNG render sits beside it. It is not in git (D-1259).

![Site water panel and a run's dewatering block](../../intelcost-infra/morning-report-2026-11-16/plans/site-water-mockup.svg)

**Confidence grades** (the pipe section plan's A–D, extended):

| Grade | Meaning |
|---|---|
| A | Read in the standard, rule, permit or government dataset itself (fetched and read for this plan) |
| B | Two or more secondary sources agree, or the primary source was seen only in part |
| C | One secondary source, or common practice |
| D | IntelCost's own assumption |
| E | Derived from other library figures (a ratio, a fit or a neighbour's rate), with no source of its own |
| F | A gap: no usable source; a quote is needed and no number is carried |

**Headline findings**

1. **The tabs pay dewatering separately, at a price the engineer sets.** 15 of the 16 Houston tabs (9 of the 10
   recent) carry an "as directed" dewatering item per LF of pipe, almost always bid at one figure by every bidder
   ($20 or $25/LF; median of 179 bids $23/LF). The harness already keeps them out (`bidtabs/gap-report.mjs` `NOT`).
   **So this plan moves the multiplier to the medians by $0.** Its value is the real bid: today a dewatering line is
   priced by hand (`production.py:STARTER_REASONS` `"dewatering": ("by_hand", None)`), so it shows $0 unless typed.
2. **Rain is the part of Plan A that moves the harness, and it moves it the wrong way.** Lost working days lengthen
   every rented spread. On the recent tabs, pipe crews' lost days (≈ 22 a year at IAH, 8.5 % of 260 work days) add
   ≈ $67 k of rental to our direct (k to the medians 0.997 → ≈ 0.989). It is a real cost the bidders carry too, not a
   lever.
3. **A lot exists already.** Bores per project, placed on a sheet, with water readings by kind and layers by USCS
   (`earthwork_bore`, `earthwork_bore_water`, `earthwork_bore_layer`); a design-water rule
   (`lib/takeoff/earthwork/geotech/water.ts:designWater`); the stretches of each run below it
   (`utilities/quantities.ts` `dewateringLF`, `dewatering`), drawn blue (D-578); a "Trench dewatering" LF line and a
   "Structure dewatering" EA line (`utilities/lines.ts`), foundation stone and geotextile on it (D-908); an undercut
   below water flagged (`earthwork/lines.ts`, "Undercut dewatering"). What is missing is the **method, the equipment,
   the 24 h clock and a price**, and every input when there is no geotech report.
4. **Free government data covers the no-report case, with no key.** NOAA NCEI's Access Data Service returns the
   1991–2020 monthly normals, including days ≥ 0.10, 0.50 and 1.00 in, with no token (fetched for IAH and Hobby). NRCS
   Soil Data Access returns the water table (annual minimum, April–June minimum, by month), drainage class, flooding,
   ponding and saturated conductivity at a point, also with no key. **Its limit: the survey describes only the top
   ≈ 2 m (6.5 ft)**, so it says little about a 12 ft trench bottom. USGS's Houston wells measure the deep Chicot and
   Evangeline aquifers (water levels from 301 ft below to 184 ft above NAVD 88): not the shallow water a trench meets.
5. **Wellpoint equipment has no published dealer price.** Every dealer page found (wellpoint pumps, PVC points,
   header) is "call for a quote". The library has six pumps with rental rates (2 to 6 in trash and self-priming) and
   none of the wellpoint gear. The library items in §8 are F until the estimator's quotes arrive.

---

## 1. Standards and practice

| Source | What it requires (quoted where read) | Grade |
|---|---|---|
| **UFC 3-220-05, Dewatering and Groundwater Control** (2004, superseding TM 5-818-5) [S1][S2] | **Sumps and ditches:** open-excavation sump pumping has the disadvantage of "slowness in drainage of the slopes"; "Excavations below the water table can sometimes be successfully made using sheeting and sump pumping." **Wellpoints (¶2-4a):** "installed in a line or ring at spacings between about 3 and 10 feet … with the risers connected to a common header"; "A wellpoint pump uses a combined vacuum and centrifugal pump connected to the header"; one stage "is capable of lowering the groundwater table about 15 feet"; "lowering the groundwater more than 15 feet generally requires a multistage installation of wellpoints." **Vacuum (¶2-4b):** "relatively little vacuum effect can be obtained with a wellpoint system if the lift is more than about 15 feet"; silts and sandy silts (k ≈ 0.1–10 × 10⁻⁴ cm/s) "cannot be drained successfully by gravity methods" but can often be stabilised by vacuum wellpoints. **Eductors (¶2-4c):** "lower the water table as much as 100 feet from the top of the excavation", "most advantageously used to dewater deep excavations". **Deep wells (¶2-5a):** "can be used to dewater pervious sand or rock formations" | **B**: read on a reprint of the UFC text (tpub), paragraph numbers inferred from the layout |
| **OSHA 29 CFR 1926.651(h)** [S3] | (h)(1) "Employees shall not work in excavations in which there is accumulated water, or in excavations in which water is accumulating, unless adequate precautions have been taken"; precautions "could include special support or shield systems … water removal to control the level of accumulating water, or use of a safety harness". (h)(2) "If water is controlled or prevented from accumulating by the use of water removal equipment, the water removal equipment and operations shall be monitored by a competent person." (h)(3) diversion ditches and dikes where the excavation interrupts natural drainage; a competent person's inspection after heavy rain | **A** for (h)(1)–(h)(2) wording (OSHA's page); (h)(3) labelling **B** |
| **City of Houston Standard Specification 01578, "Control of Ground and Surface Water"** (2026 General Requirements, listed in the City's table of contents) [S4] | The section exists under that title. **Its text could not be read**: the Houston Permitting Center returns 403 to an automated fetch, and working around that was refused. Houston-area specs written on the same pattern, read in full: **Deer Park Item 436 Well Pointing** (rev. 5/2022) [S5]: "capable of lowering and maintaining the groundwater to at least 3-feet below the bottom of the excavation"; "provide one (1) spare (connected) diesel powered pump"; "Dewatering and pressure relief shall be a continuous operation and interruptions due to power outages, or any other reason, shall not be permitted. A responsible operator … shall be on duty at all times"; a surveyor records "each well point and piezometer"; measured "by the linear foot of trench being dewatered … along the centerline of the trench". **Galveston 01578, Dewatering and Drainage** (rev. 6/2021) [S6]: observation wells (1 in Sch 80 PVC) as directed; no pipe or structure placed "until the readings … indicate that the groundwater has been lowered a minimum of 6 inch below the bottom of the final excavation"; pumping "shall be continuous"; "No additional payment will be made for dewatering and drainage" (in the unit prices) | Houston's 01578: **title A, content C** until the text is read (open question 1). Deer Park and Galveston: **A** (read) |
| **TCEQ TPDES Construction General Permit TXR150000** (effective March 5, 2023, expires March 5, 2028) [S7] | Part II.B.3(g): "uncontaminated ground water or spring water, including foundation or footing drains where flows are not contaminated with industrial materials such as solvents" is an eligible non-stormwater discharge. Part III.C, Dewatering: "Discharges from dewatering activities, including discharges from dewatering of trenches and excavations, are prohibited, unless managed by appropriate controls to address sediment and prevent erosion. Operators must observe and evaluate the dewatering controls once per day while the dewatering discharge occurs." Part III.F.7: a daily report within 24 h (date, who, times or "continuous", **gallons per day**, foam, oil sheen, odour, floating solids) | **A** (read in full from a copy of the 2023 permit) |
| **City of Houston discharge to its storm sewer** | The City's stormwater ordinance (Code ch. 47) prohibits non-stormwater discharges other than those allowed; a discharge covered by the CGP's list is the normal route. Not read for this plan | **C** (open question 2) |
| **Contaminated groundwater** | Not covered by the CGP: a separate TPDES permit or haul-off, and a sanitary-sewer discharge needs the utility's permit | **B** (the CGP's own scope, the 2023 response to comments) |

**What follows for the engine:**

- Drawdown target below the bottom: Deer Park 3 ft, Galveston 6 in. **Default 2 ft (D)**, a project setting, with the
  City spec's figure to replace it once read (open question 1).
- A **standby pump** connected on every wellpoint, eductor or deep-well system (Deer Park, A); none on rain sumps (D).
- **24 h operation** for groundwater systems (Deer Park, Galveston, A), with a **competent person / operator** on the
  off-shift hours (Deer Park "on duty at all times", A; OSHA (h)(2) "monitored by a competent person", A).
- **Sediment control** on every discharge (CGP III.C, A) and a **daily evaluation report** (CGP III.F.7, A): a filter
  bag per running pump by default; a settling (frac) tank when the soil is silty or fine sand (D).
- **No permit fee** for uncontaminated groundwater under the CGP (A); a "possible contamination" flag (a bore note, a
  site near a listed facility) turns the discharge into a haul-off or permit line priced by hand (D).

## 2. Inputs, in priority order

### 2.a Geotech report (exists today; a few fields to add)

| Field | Where it lives today | Add | Grade of the value |
|---|---|---|---|
| Boring location | `earthwork_bore.point` on `sheet_id` (placed on the drawing, BoresPanel) | — | as typed |
| Water depth, by kind | `earthwork_bore_water.kind` ∈ `while_drilling`, `at_completion`, `after_hours` (with `hours`, e.g. 24), `stabilized`, `seasonal_high`, `published`; `depth_ft`; `observed_on` | nothing; the 24 h reading is `after_hours` with `hours = 24` | A (the report) |
| Perched water, caving, cave-in depth | `earthwork_bore.perched_water`, `caving_observed`, `cave_in_depth_ft` | — | A |
| Layers | `earthwork_bore_layer` (`depth_top_ft`, `depth_bottom_ft`, `uscs`, `pi`, `description`) | **`k_cm_s`** (permeability, optional, typed from the report's lab or pump test) | A when typed; else from USCS (§3.1, C) |
| Design water | `water.ts:designWater` (seasonal high, else shallowest measured less `water_buffer_ft`, else published, else "below") | — | follows its reading |

So the user enters a report **per project, per boring placed on the drawing**, as today. The plan adds `k_cm_s` per
layer and nothing else to the bore model.

### 2.b No report: NRCS Soil Data Access at the project location

- **API (confirmed by calling it):** `POST https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest`, body
  `{"format":"JSON+COLUMNNAME","query":"<T-SQL>"}`. No key, no account. A point query uses
  `SDA_Get_Mukey_from_intersection_with_WktWgs84('point(<lon> <lat>)')`.
- **Fields (all read back for a test point in western Harris County):**

| Table.column | Meaning | Test point value |
|---|---|---|
| `muaggatt.wtdepannmin` | Water table depth, annual minimum, **cm** | 53 (1.74 ft) |
| `muaggatt.wtdepaprjunmin` | Water table depth, April–June minimum, cm | null |
| `cosoilmoist.soimoistdept_r` where `soimoiststat = 'Wet'`, by `comonth.month` | Top of the saturated zone by month, cm (the "by season" answer) | Jan 53, Feb 53, Mar–Dec none |
| `muaggatt.drclassdcd` | Drainage class, dominant | Poorly drained |
| `muaggatt.flodfreqdcd`, `flodfreqmax`; `comonth.flodfreqcl` | Flooding frequency | None |
| `muaggatt.pondfreqprs`; `comonth.pondfreqcl` | Ponding (percent of the map unit / class) | 0 / None |
| `muaggatt.hydgrpdcd` | Hydrologic group | B/D |
| `chorizon.ksat_r`, `hzdept_r`, `hzdepb_r`; `chtexture.texcl` | Saturated conductivity (µm/s), horizon depths (cm), texture | Loam, ksat 9 µm/s (9 × 10⁻⁴ cm/s), to 198 cm |

- **Terms:** a US government (USDA) service; SSURGO data are public, no fee [S8]. **Cost $0 (A).**
- **Limit:** horizons stop at ≈ 200 cm. Below that the survey says nothing, so a trench deeper than ≈ 6.5 ft has no
  soil data at its bottom. The engine uses the deepest horizon's ksat for the band below it and **grades it D**, and
  the run says "Soil survey below 6.5 ft: assumed as its deepest layer".
- **Use:** the design water = the shallowest wet depth in the **work window's months** (else `wtdepannmin`); none
  listed = "below 2 m (soil survey)", a bound, never a depth. Graded **C** (survey estimate) against a report's A.

### 2.c NOAA NCEI 1991–2020 normals at the nearest station

- **API (confirmed):** `GET https://www.ncei.noaa.gov/access/services/data/v1?dataset=normals-monthly-1991-2020&stations=<id>&dataTypes=MLY-PRCP-NORMAL,MLY-PRCP-AVGNDS-GE010HI,MLY-PRCP-AVGNDS-GE050HI,MLY-PRCP-AVGNDS-GE100HI&format=csv`.
  **No token is needed** for the Access Data Service (the older CDO v2 API needs one; we do not use it). Station list:
  NCEI's normals station inventory (a static file, loaded once).
- **Terms:** NOAA data are US government works, free of copyright; commercial use allowed [S9]. **Cost $0 (A).**
- **Houston IAH (USW00012960), as returned (A):**

| | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Year |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Normal precip, in | 3.76 | 2.97 | 3.47 | 3.95 | 5.01 | 6.00 | 3.77 | 4.84 | 4.71 | 5.46 | 3.87 | 4.03 | 51.84 |
| Days ≥ 0.10 in | 5.7 | 4.9 | 4.8 | 4.4 | 5.4 | 6.6 | 5.7 | 5.8 | 5.8 | 4.9 | 4.7 | 5.7 | 64.4 |
| Days ≥ 0.50 in | 2.6 | 2.3 | 2.1 | 2.3 | 2.8 | 3.6 | 2.3 | 2.7 | 2.6 | 2.9 | 2.3 | 2.6 | 31.1 |
| Days ≥ 1.00 in | 1.2 | 0.8 | 1.2 | 1.3 | 1.6 | 2.0 | 1.0 | 1.2 | 1.2 | 1.6 | 1.2 | 1.2 | 15.5 |

  Hobby (USW00012918) runs a little wetter (days ≥ 0.10 in: 65.8 a year; June 7.2).

### 2.d USGS groundwater levels: not used

USGS and the subsidence districts measure the Chicot and Evangeline aquifers each winter; the 2024 water-level
altitudes run from about 301 ft below to 184 ft above NAVD 88 [S10]. These are **confined, deep** aquifer heads, not
the perched and shallow water a 6–20 ft trench meets. **Do not use them** for dewatering (B). They are listed so
nobody wires them in later by mistake.

### 2.e Not used: Open-Meteo (its free tier is non-commercial; the founder's rule)

### 2.f For each API

| | NRCS SDA | NOAA NCEI ADS | Location (both need lat/lon) |
|---|---|---|---|
| Key | none | none | US Census geocoder: none |
| Caching | `site_water_source` row per project: the query, the answer JSON, `fetched_at`; refreshed only on request or when the location moves (the survey changes yearly at most) | the station's 12-month rows stored per station in `eqlib`-like reference table `wx_normals` (one fetch per station ever: normals are fixed until 2031) | geocode stored on the project |
| Offline fallback | the last stored answer; none → "No soil survey: enter the water depth or a bore" and the method falls back to the project's typed design water | seed the Houston-area stations (IAH, HOU, Sugar Land, Conroe, Galveston, Baytown) in the release; elsewhere the last stored answer | ZIP centroid (Census ZCTA gazetteer, public, seeded) |
| Down | the fetch is a Celery task with a 30 s timeout; the panel shows "Soil survey unreachable, retry" and nothing changes | same | same |
| Cost | $0 (A) | $0 (A) | $0 (A) |

No new key. Nothing goes in `.env.ai` for Plan A.

## 3. Method selection

### 3.1 Inputs at a station

- **H** = the water's height above the trench bottom (`StationSoil.waterZ`, already computed); H ≤ 0: no groundwater
  method.
- **k** of the bottom layer: typed `k_cm_s`, else from USCS (C, common order-of-magnitude tables): GW/GP 10⁻¹, SW/SP
  10⁻², SM 10⁻³, ML/SC 10⁻⁴, CL/CH/MH 10⁻⁶ cm/s; else the survey's ksat (µm/s × 10⁻⁴).
- **Lift** = depth from the header to the drawn-down water = trench depth + target − header depth (header at the
  ground unless a bench is cut).
- **Type:** a trench run (linear, open length staged), or a pond / mass excavation (an area, a perimeter).

### 3.2 The rule (first that applies)

| # | Condition | Method | Basis |
|---|---|---|---|
| 1 | H ≤ 0 | None (rain sumps only, §5) | — |
| 2 | k < 10⁻⁴ cm/s (clays, CL/CH) | **Sump pumping** in the trench, 24 h while open; flag "bottom heave check" when H > 10 ft | UFC: sumps where seepage is small; clays drain too slowly for wellpoints (B) |
| 3 | 10⁻⁴ ≤ k < 10⁻³ (silts, SM–ML) and lift ≤ 15 ft | **Vacuum wellpoints**, close spacing (3 ft) | UFC ¶2-4b (B) |
| 4 | 10⁻⁴ ≤ k < 10⁻³ and lift > 15 ft | **Eductors** (jet wells) | UFC ¶2-4c, to 100 ft (B) |
| 5 | k ≥ 10⁻³ and lift ≤ 15 ft | **Wellpoints**, one stage; spacing 5 ft (10⁻³–10⁻²), 8 ft (≥ 10⁻²) | UFC ¶2-4a, 3–10 ft (B); the split by k is D |
| 6 | k ≥ 10⁻³, lift > 15 ft, trench sloped or benched | Wellpoints with the **header on a bench** cut to lift − 15 + 1 ft | UFC ¶2-4a multistage (B); the bench rule D |
| 7 | k ≥ 10⁻³, lift > 15 ft, trench in a box or vertical | **Eductors**; a pond or mass dig takes a **second wellpoint stage** instead | UFC ¶2-4a, ¶2-4c (B) |
| 8 | Pond / mass excavation, k ≥ 10⁻², H > 15 ft or area > 1 acre | **Deep wells** around the perimeter | UFC ¶2-5a (B); thresholds D |
| — | Rows: **double row** when the bottom width > 6 ft or H > 10 ft, else single | the tabs' "no separate pay for double row" shows both are used (C); thresholds D |

The person can always pick the method on the run or in the Site water panel; the rule's choice is shown with its
reason ("Wellpoints, single row: sand (k 2 × 10⁻³ cm/s), lift 14.0 ft ≤ 15").

## 4. Quantities and cost per method

All in a new pure module `lib/takeoff/earthwork/water/` (hard rule 2: data in, data out), called by
`calculateUtilities` and the earthwork Calculate.

### 4.1 Duration from the run's own production

- The run's crew-days `wd` = its LF ÷ the pipe line's LF/day (the same `production.py` pace the estimate uses,
  brought back with the lines).
- A groundwater system runs from `ahead` days before the crew (drawdown time, default 2, D) to `behind` days after
  (backfill, default 1, D): **system work days = wd + ahead + behind**.
- **Calendar days = system work days × 7/5** (it runs through weekends, D: the average week).
- **Pump hours = calendar days × 24** per running pump: the 24 h clock, not the crew day.

### 4.2 Wellpoints (trench run)

| Quantity | Formula | Grade |
|---|---|---|
| Header LF (staged ahead of the crew) | min(run LF, LF/day × (ahead + 1 + behind)) × rows | D (the staging rule) |
| Points installed (jetted) | (⌈run LF ÷ spacing⌉ + 1) × rows | UFC spacing B, count D |
| Points on rent | (⌈header LF per row ÷ spacing⌉ + 1) × rows | D |
| Point length | the first of 15, 18, 21, 25, 30 ft ≥ drawdown depth − bench + 5 ft | D |
| Swing joints, risers | one each per point on rent | C |
| Running pumps | ⌈header LF ÷ 500⌉ | D (one 6 in wellpoint pump per ≈ 500 ft of header, to confirm with the dealer) |
| Standby pump | + 1 connected | A (Deer Park) |
| Fuel | running pumps × pump hours × gal/hr (`fuel_gph_med`) × the project's off-road diesel | library B/C, price A (EIA) |
| Jetting crew | points installed ÷ 60 a crew-day (jetting pump, 2 laborers, the excavator's time) | D until a dealer or crew figure |
| Removal | points ÷ 120 a crew-day | D |
| Discharge line | 300 ft per running pump (input), in 50 ft hose lengths (`HOSE-6IN`) | D |
| Pump watch | calendar days × 24 − system work days × crew hours (the off-shift hours), one operator | A (Deer Park "on duty at all times"); the hours D |
| Observation wells / piezometers | ⌈header LF per row ÷ 200⌉ + 1, re-used as the header moves | D (Galveston: "as directed") |
| Filter bags | running pumps × ⌈calendar days ÷ 3⌉ | D |
| Settling (frac) tank | one per discharge point when the bottom is SM/ML/SP-fine, for the system's calendar days | D |
| Daily CGP report | 0.25 h a calendar day (the foreman) | A (the report exists), the hours D |
| Mob | pumps: `pickup-towed`; points and header: `flatbed`, one load per 1,000 ft of header (D) | library B |
| Permits | $0 for uncontaminated groundwater (CGP II.B.3(g), A); a flagged site: a by-hand line | A / D |

### 4.3 Other methods

- **Sump (clay):** one 3 in trash pump per open heading, running 24 h over the open days (crew-days + 1) × 7/5; no
  standby; a filter bag per pump per 3 days. Grade D.
- **Eductors:** points at 10 ft (D), a supply pump and a return tank per 400 ft of header (D), 24 h; prices F.
- **Deep wells (pond):** perimeter ÷ 50 ft (D), one submersible each, + 1 standby per 10 (D); drilled to bottom +
  2 ft target + 10 ft sump (D); the drilling a subcontract by hand (F).
- **Structures:** a manhole or pit below water keeps today's "Structure dewatering" EA; it takes the run's system when
  on the run's header (no second price), else one sump pump for its days (D).
- **Pond / mass excavation below water (earthwork):** the area's perimeter drives the wellpoint ring (rows = stages);
  duration = the excavation activity's days below the water (the cut's own production), plus ahead and behind.

### 4.4 Lines and roles

| Line | Role / variant | Unit | Priced by |
|---|---|---|---|
| Groundwater control, wellpoints (per run) | `dewatering` / `trench:wellpoint` | LF of trench (as today and as the tabs pay) | a new activity, **"Dewatering, wellpoint system"**, its pumps on the 24 h clock, its points and header as duration rentals, its jetting crew, its watch labour |
| Groundwater control, sump | `dewatering` / `trench:sump` | LF | activity "Dewatering, sump" |
| Groundwater control, eductors / deep wells | `dewatering` / `trench:eductor`, `area:deepwell` | LF / LS | by hand until rates (F) |
| Rain water, open excavations | `dewatering` / `rain` | pump-day | activity "Rain sumps" (§5) |
| Foundation stone and geotextile (D-908) | stays on the dewatering line | ton / SY | unchanged |

MasterFormat **names only** in the UI ("Temporary Groundwater Control", "Surface Water Control"; no section number on
screen), filed under the existing `earthwork.dewatering` work scope.

## 5. Rain

### 5.a Perched and surface water in open excavations

- The work window: the project's start month and the schedule's duration (Estimating's crew-days → months), else
  the next 12 months.
- **Rain sump pump-days** = Σ over the window's months of (days ≥ 0.10 in) × open excavations × 2 (the rain day and
  the day after), where open excavations = the utility crews' headings + open pits + mass excavations below grade at
  that time (D: each heading is open the whole window).
- Rental: one trash pump per open excavation on site for the window (a duration rental); run hours = pump-days × 8
  (D); fuel = hours × gal/hr.

### 5.b Lost working days

| Work | Lost working days per month | Basis |
|---|---|---|
| Earthwork in Houston clays (mass grading, ponds, subgrade) | (days ≥ 0.50 in × 2 + days ≥ 1.00 in × 1) × 5/7: the rain day, one drying day, one more after an inch | TxDOT: "a half-inch of rain could delay a project with a large amount of earthwork for three or more days" [S11] (**C**); the split 2 + 1 is D. The 5/7 counts weekday events only (D) |
| Pipe crews (in a box, small open length) | days ≥ 0.50 in × 1 × 5/7 | D |
| Concrete flatwork, paving | days ≥ 0.10 in × 1 × 5/7 | D (ALDOT used > 0.2 in [S12], C) |

IAH gives ≈ 55.5 earthwork and ≈ 22.2 pipe working days lost a year (§6 rows). TxDOT plans on "16 to 17 working days"
a month [S11], about 5 lost of ≈ 21.7 weekdays: the earthwork figure (4.6 a month) sits inside it.

### 5.c How it flows

1. Each activity's crew-days grow by its lost days in the months it works (pro rata by days).
2. **Rented machines** bill the calendar: the spread's rental days = work days + lost days (the period solver as
   today, `periods.ts:solveRental`).
3. **Owned machines** take a standby rate on lost days (Plan B §8: the library's `standby_rule`, today text only).
4. **Labour**: no pay on a lost day (open shop), a show-up allowance setting (default 0 h, D).
5. Groundwater pumps run through rain days (they are on the 24 h clock already); rain sumps add pump-days (5.a).
6. Estimating shows "Weather: +6.6 lost days (June, IAH normals 1991–2020)" on each spread and a project total.

## 6. Hand-worked rows (quantity-table candidates)

Common inputs: off-road diesel $5.468/gal (PADD 3 on-highway $5.912 less 24.4 ¢ federal and 20.0 ¢ Texas, D-940,
week of 2026-11-02, A); gasoline TX $3.578 (A); target 2 ft (D); ahead 2, behind 1 (D); 8 h crew day
(`hours_per_work_day`). Library rates: `PMP-TRASH-3` $65 / $239 / $693, 0.65 gal/hr; `PMP-SP-6D` $380 / $1,112 /
$3,253, 1.7 gal/hr (A, 2025–2026, out-of-state dealers: Plan B re-rates them); `EX-CRAWL-20T` $1,040 / $2,927 /
$7,950 (A). The 6 in self-priming pump stands in for a wellpoint pump until quoted (E).

| Row id | Case | Inputs | Worked | Result |
|---|---|---|---|---|
| `dw-none` | Water below the bottom | SDR 35 8 in, trench bottom 8.35 ft, design water 10.0 ft | H = 8.35 − 10.0 = −1.65 | method none; dewatering LF 0 |
| `dw-sump-clay` | Clay bottom, sump | bottom 10.0 ft, water 6.0 ft, CL (k 10⁻⁶); 400 LF at 200 LF/day | H 4.0 → rule 2; wd 2; open 3; calendar 3 × 7/5 = 4.2 d; hours 4.2 × 24 = 100.8; fuel 100.8 × 0.65 = 65.52 gal × 3.578 | sump, 1 × PMP-TRASH-3; rental 1 week $239 (5 days × $65 = $325 is dearer); fuel $234.43 |
| `dw-wp-single` | Wellpoints, one row | SDR 35 8 in, bottom 12.0 ft, water 5.0 ft, SP (k 2 × 10⁻³), width 30 in; 600 LF at 150 LF/day | H 7.0; drawdown 12 + 2 = 14 ft; lift 14 ≤ 15 → rule 5, spacing 5 ft, single row (W ≤ 6 ft, H ≤ 10); wd 4; header min(600, 150 × 4) = 600; points ⌈600/5⌉ + 1 = 121; point length first ≥ 14 + 5 = 21 ft; pumps ⌈600/500⌉ = 2 + 1 standby; system days 4 + 3 = 7; calendar 9.8; pump hours 9.8 × 24 × 2 = 470.4; fuel 470.4 × 1.7 = 799.68 gal | 121 points (21 ft), 600 LF header, 3 pumps; fuel $4,372.65 |
| `dw-wp-single-labour` | the same, labour and parts | as above | jetting 121 ÷ 60 = 2.02 crew-days; removal 121 ÷ 120 = 1.01; watch 9.8 × 24 − 7 × 8 = 179.2 h; piezometers ⌈600/200⌉ + 1 = 4; hose 300 × 2 = 600 ft = 12 lengths; bags 2 × ⌈9.8/3⌉ = 8 | 2.02 + 1.01 crew-days, 179.2 watch h, 4 piezometers, 12 × HOSE-6IN, 8 bags |
| `dw-wp-single-pumps` | the pumps' rental on a 7-day calendar | 3 pumps, 9.8 calendar days | weeks: ⌈9.8/7⌉ × 1,112 = 2,224; 1 week + 3 days: 1,112 + 3 × 380 = 2,252; one 4-week 3,253 → 2,224 | $2,224 a pump, **$6,672** for 3 (E until a wellpoint pump is quoted) |
| `dw-wp-double` | Double row | as `dw-wp-single` but W 7 ft, H 12 | header 600 × 2 = 1,200; points 121 × 2 = 242; pumps ⌈1,200/500⌉ = 3 + 1; pump hours 9.8 × 24 × 3 = 705.6; fuel 1,199.52 gal; jetting 242 ÷ 60 = 4.03 | 242 points, 1,200 LF header, 4 pumps, 1,199.52 gal |
| `dw-wp-bench` | Lift over 15 ft, sloped trench | bottom 16 ft, water 4 ft, SP, sloped walls | drawdown 18; lift 18 > 15 → rule 6; bench 18 − 15 + 1 = 4 ft; lift on the bench 14; point length first ≥ 14 + 5 = 21 ft | wellpoints on a 4.0 ft bench, 21 ft points; the bench's cut joins the run's excavation |
| `dw-eductor` | Silt, deep, in a box | bottom 18 ft, water 6 ft, ML (k 2 × 10⁻⁴), box | lift 20 > 15, k in the silt band → rule 4 | eductors, flagged "price by hand (no rates)" |
| `dw-deepwell-pond` | Pond in coarse sand | pond 300 × 200 ft, bottom 20 ft, water 6 ft, SW (k 10⁻²) | H 14; area 1.38 ac > 1 → rule 8; perimeter 2 × (300 + 200) = 1,000 ft; wells 1,000 ÷ 50 = 20; standby ⌈20/10⌉ = 2; well depth 20 + 2 + 10 = 32 ft | 20 deep wells at 32 ft + 2 standby pumps; drilling by hand |
| `rain-june-ew` | June, earthwork | IAH June: ≥ 0.50 in 3.6, ≥ 1.00 in 2.0 | (3.6 × 2 + 2.0 × 1) × 5/7 = 9.2 × 0.7143 | **6.57** lost working days |
| `rain-june-pipe` | June, pipe crew | IAH June ≥ 0.50 in 3.6 | 3.6 × 5/7 | **2.57** days |
| `rain-q1` | Jan–Mar window | ≥ 0.50: 2.6 + 2.3 + 2.1 = 7.0; ≥ 1.00: 1.2 + 0.8 + 1.2 = 3.2 | earthwork (14.0 + 3.2) × 5/7; pipe 7.0 × 5/7 | **12.29** earthwork, **5.00** pipe |
| `rain-year` | A year at IAH | ≥ 0.50 31.1, ≥ 1.00 15.5 | earthwork (62.2 + 15.5) × 5/7; pipe 31.1 × 5/7 | **55.50**, **22.21** days |
| `rain-sump-q1` | Rain sumps, Jan–Mar, 2 headings | ≥ 0.10 in: 5.7 + 4.9 + 4.8 = 15.4 | pump-days 15.4 × 2 × 2 = 61.6; hours × 8 = 492.8; fuel × 0.65 = 320.32 gal × 3.578 | 61.6 pump-days, 320.32 gal, $1,146.10 gasoline |
| `rain-standby-ex20` | A rented 20 t excavator, 20 work days in June | lost 6.57 → 27 billed days (5-day basis) | 4-week + 1 week + 2 days = 7,950 + 2,927 + 2,080 = 12,957 (4-week + 2 weeks 13,804; two 4-weeks 15,900) | $12,957 against $7,950 dry: **+$5,007** |

Each row becomes a `dewatering` or `rain` kind in `intelcost-infra/browser/lib/` (new `water-cases.mjs`, the pure
module imported as `utility-cases.mjs` does). The hand checks were worked with a throwaway script outside the repos;
the table is the record.

## 7. Bid-tab evidence

Tabulation (outside git): `docs/reference/Bid tabs Houston 2026-11/dewatering-items-2026-11-15.md`. Aggregates only:

| Measure | Value |
|---|---|
| Tabs with a dewatering pay item | 15 of 16 (recent 9 of 10); the other carries wet sand only |
| Unit | LF of pipe (35 rows); coffer dam at an outfall LS / EA (5 rows); wet sand LF (6 rows) and EA (1) |
| Pricing | "as directed by the engineer", contingent quantity; 16 of 35 LF rows bid at one figure by every bidder |
| LF unit price | 179 bids: median **$23/LF**, low $0.01 (bid to nothing), high $80; the item medians' median $23.50; clusters at $20 and $25 |
| Wet sand | $5/LF as an extra (3 rows), $10/LF (1), $15–60/LF as bedding and backfill (1); $50 EA under a manhole |
| Coffer dam | medians $3,980–5,391, lows $500–3,000 |
| Recent quantity | 50,284 LF, ≈ $1.12 M at the medians (≈ 6 % of those tabs' median totals) |
| One tab's description | "includes conventional vacuum type well points, internal sumps and pumps, or any type of pumping" |

**How the harness checks us:**

1. Keep the rows out of the multiplier (as today).
2. Add a **dewatering check** to the harness's report, not its score: for each tab item, our dewatering line's
   $/LF on a synthetic run (the item's pipe and depth, a design water 4 ft below grade, SP soil) against the item's
   figure. Healthy: our wellpoint $/LF within 0.6–1.6 × the tab's figure (a single owner figure, so a wide band, D).
3. Report the **share of runs** where our method is "none" while the tab carries a quantity, to show whether we
   under-detect water (the tabs' quantity ÷ the pipe LF on that tab is the owner's own expectation).

## 8. Library items to add

Rates from dealer or rental sources only. None of the wellpoint gear has a published dealer price; every page is
"quote" (Sunbelt's PVC point pages; United's 8 and 12 in rotary wellpoint pumps "not available for online
ordering"). So each row is **F** until the estimator's quote sheet (Plan B §1) comes back.

| Key (proposed) | Item | Unit / billing | Today in the library | Rate |
|---|---|---|---|---|
| `PMP-WP-6D` | Wellpoint pump, 6 in, diesel, vacuum-assisted | day / week / 4-week, 24 h | none (6 in self-priming `PMP-SP-6D` A stands in, E) | F |
| `PMP-WP-8D` | Wellpoint pump, 8 in, diesel | as above | none | F |
| `PMP-WP-12D` | Wellpoint pump, 12 in, diesel (rotary) | as above | none (`PMP-12D` centrifugal, no rate) | F |
| `WP-POINT-15/18/21/25` | Wellpoint, PVC or steel, with riser | per point, 4-week | none | F |
| `WP-SWING` | Swing joint (riser to header) | per point, 4-week | none | F |
| `WP-HEADER-6/8` | Header pipe, 6 or 8 in, 20 ft lengths | per 20 ft, 4-week | none | F |
| `WP-JET-PUMP` | Jetting pump (high pressure, for installing points) | day / week | none | F |
| `EDU-SET` | Eductor (jet) well set: supply pump, header, return tank | 4-week | none | F |
| `DW-SUB-4/6` | Deep-well submersible 4 / 6 in | 4-week | `PMP-SUB-4E`, `-6E` owned rates only (D) | F (rental) |
| `PMP-TRASH-2/3/4`, `PMP-SP-4D/6D`, `PMP-SUB-2E/2G` | Sump and rain pumps | as now | rated (A/B), out-of-state | re-rate Houston (Plan B) |
| `HOSE-3/4/6/8IN` | Discharge hose, per 50 ft | 4-week | no rate (D) | F |
| `DW-FILTER-BAG` | Dewatering filter bag, 10 × 15 ft | each (material) | none | F (supplier) |
| `TANK-FRAC-21K` | Frac / settling tank, 21,000 gal | day / 4-week + delivery | none | F |
| `DW-PIEZO` | Observation well / piezometer, 1 in Sch 80 PVC (Galveston's) | each (material + 0.5 h install, D) | none | F |

## 9. Tasks, hours and order

| # | Task | Repo | Hours |
|---|---|---|---|
| A1 | Data model: `site_water` (project: method overrides, target below bottom, ahead/behind days, watch rule, discharge, window) in `earthwork_assumptions.utility_settings` JSONB (no migration) plus `earthwork_bore_layer.k_cm_s` and `site_water_source` cache table (one migration) | api | 6 |
| A2 | Location: geocode the project address (Census geocoder, no key), ZIP centroid fallback (ZCTA gazetteer seed) | api | 5 |
| A3 | NRCS SDA client (Celery task, 30 s, cache, the five fields and monthly wet depth, ksat by horizon) | api | 6 |
| A4 | NOAA normals: station inventory seed, nearest station, ADS fetch, `wx_normals` table, Houston stations seeded | api | 6 |
| A5 | Pure `water/` module: method rule, wellpoint / sump / eductor / deep-well quantities, rain lost days and sump days | app | 12 |
| A6 | Quantity-table rows (§6, 15 rows) as `water-cases.mjs`; run, all PASS | infra | 4 |
| A7 | Wire into `calculateUtilities` (per dewatering stretch) and earthwork Calculate (areas below water); lines by role and variant | app | 8 |
| A8 | Production: activities "Dewatering, wellpoint system", "Dewatering, sump", "Rain sumps" (24 h clock, duration rentals, watch labour, jetting crew); the job's pool shares pumps across runs open at once | api | 10 |
| A9 | Library release: §8 keys (F until quoted, flagged "Quote needed") and the existing pumps re-rated from quotes | api | 4 (+ the quotes) |
| A10 | Rain into durations: lost days per activity, the spreads' rental days, owned standby (with Plan B B8), Estimating's weather note | app, api | 8 |
| A11 | UI: project **Site water** panel (sources, design water, rain table, method overrides), the run panel's dewatering block, Needs attention ("Quote needed", "Soil survey below 6.5 ft") | app | 10 |
| A12 | Harness: the dewatering check and the under-detection share (§7), report only | infra | 3 |
| A13 | Gates, the quantity table, one MCP smoke (a throwaway with a bore at 5 ft in SP: the run turns wellpoints, lines priced or "Quote needed"; Site water fetched for a Houston ZIP), FEATURES/DECISIONS/SINCE_ARCHIVE, mirror | all | 5 |
| | **Total** | | **87 h** (±30 %: the 24 h clock in the spread pricing and the quotes are the likeliest overruns) |

**Order:** A1 → A5 → A6 (prove the module on the hand rows before any wiring) → A2 → A3 → A4 → A7 → A8 → A10 → A9 →
A11 → A12 → A13. Nights: (1) A1, A5, A6; (2) A2–A4, A7; (3) A8, A10; (4) A9 (after quotes), A11–A13.

## 10. Risks

1. **The money is in the as-directed item, not in our cost model.** If the founder's bids price dewatering at the
   owner's $20–25/LF, a precise wellpoint model changes only the bid's risk, not its total. Build the rain half and
   the method/quantity half first; leave the price half until the quotes exist.
2. **Soil survey depth.** SDA describes ≈ 6.5 ft; Houston trenches are 8–20 ft. Without a bore, the method below that
   is a guess (graded D, said on the run).
3. **Houston's 01578 unread.** The drawdown target and the standby rule come from neighbours' specs until it is read.
4. **24 h pricing meets a 5-day solver.** `periods.ts` bills 5-day weeks; pumps rent by the 7-day week. A second
   calendar basis in the solver touches every rental path: proven on rows first.
5. **Rain makes us dearer on the harness** (≈ +$67 k on the recent tabs). It is right, and it will read as going
   backwards.
6. **Wellpoint quantities are rule-of-thumb** (500 ft per pump, 60 points a crew-day). Two dealer conversations
   should replace them before any number is graded above D.

## 11. Questions for the founder

1. Houston 01578: can you send the City's current section (the Permitting Center blocks automated reads)? Until then:
   draw down **2 ft** below the bottom (between Galveston's 6 in and Deer Park's 3 ft)?
2. Discharge: assume the CGP covers it (no permit fee, a filter bag per pump, the daily report), and flag only sites
   you mark as possibly contaminated?
3. The as-directed item: should Estimating add the tab's dewatering quantity at the owner's price as its own line (a
   "pay item" line, not a cost), so a bid total matches the tab, while our own cost sits on the runs?
4. Rain rules: earthwork loses the rain day + 1 drying day after ≥ 0.5 in, + 1 more after ≥ 1 in; pipe crews lose
   only the rain day. Acceptable as defaults? And no labour paid on a lost day (open shop)?
5. Pump watch: a full-time operator on every off-shift hour (Deer Park's wording), or patrols (2 visits a night)?
6. Wellpoint quotes: which dewatering firms or dealers should the estimator ask (besides the five in Plan B)?

## Sources

- [S1] UFC 3-220-05, Dewatering and Groundwater Control (WBDG): https://www.wbdg.org/ffc/dod/unified-facilities-criteria-ufc/ufc-3-220-05
- [S2] UFC 3-220-05 text as reprinted (sumps, wellpoints, eductors, deep wells): https://buildingcriteria1.tpub.com/ufc_3_220_05/ufc_3_220_050014.htm and https://buildingcriteria1.tpub.com/ufc_3_220_05/ufc_3_220_050016.htm
- [S3] OSHA 29 CFR 1926.651: https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.651
- [S4] City of Houston, 2026 General Requirements (table of contents listing 01578): https://www.houstonpermittingcenter.org/media/3776/download
- [S5] City of Deer Park, Item 436 Well Pointing (rev. 5/19/2022): https://www.deerparktx.gov/DocumentCenter/View/13339/Spec-436-Well-Pointing
- [S6] City of Galveston, 01578 Dewatering and Drainage (rev. 6/2021): https://www.galvestontx.gov/DocumentCenter/View/12470/01578---Dewatering-and-Drainage-Rev-62021
- [S7] TCEQ TPDES Construction General Permit TXR150000 (2023), copy read: https://ehs.utexas.edu/sites/default/files/CGP_2023.pdf (TCEQ: https://www.tceq.texas.gov/downloads/permitting/stormwater/general/construction/txr150000-cgp.pdf)
- [S8] NRCS Soil Data Access: https://sdmdataaccess.sc.egov.usda.gov/ (query help: https://sdmdataaccess.sc.egov.usda.gov/QueryHelp.aspx)
- [S9] NOAA NCEI U.S. Climate Normals: https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals ; data called from https://www.ncei.noaa.gov/access/services/data/v1
- [S10] USGS SIR 2025-5028, water-level altitudes, Chicot and Evangeline aquifers, 2024: https://pubs.usgs.gov/publication/sir20255028
- [S11] Community Impact, "Poor weather conditions affect TxDOT projects" (TxDOT spokesperson, 2017): https://communityimpact.com/news/2017/11/06/poor-weather-conditions-affect-txdot-projects
- [S12] Auburn University / ALDOT, weather non-workday study: https://eng.auburn.edu/files/centers/hrc/aldot-930987-final1.pdf

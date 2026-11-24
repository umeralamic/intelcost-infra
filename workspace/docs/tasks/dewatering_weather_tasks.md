# Dewatering and weather: the plan (no code)

**Status:** plan written 2026-11-15 (the founder's planning brief, Plan A), research and writing only. **Revised
2026-11-15** (unattended run brief, step 2, `intelcost-infra/morning-report-2026-11-17/BRIEF.md`): split into
**A-lean (26 h)** and **A-later (61 h)**, with the founder's defaults taken (below). No D-number yet: main logs one when
the founder adopts it. Original brief: `intelcost-infra/morning-report-2026-11-16/plans/BRIEF-PLANS.md`. Its companion
is [equipment_library_improvements.md](equipment_library_improvements.md) (Plan B); the ranking of every item in both
plans and the build order across nights are in §10 of that file. This plan's own tasks and order are in §9; the
summary for the founder is `intelcost-infra/morning-report-2026-11-17/plans/PLAN-REVISION.md`.

**The split (the founder's brief, verbatim in substance):**

| Half | What | Hours |
|---|---|---:|
| **A-lean** | AL1 NOAA normals with the six Houston-area stations seeded (§2.c); AL2 rain lost days into durations, a drying day that is itself a rain day not counted twice (§5.b), with every production source checked for weather days already inside its rates (§5.d); AL3 "as directed" pay items as pay lines at the owner's quantity and price with our cost beside as a risk check (§4.5); AL4 the sump and wellpoint rule and quantities only, prices "Quote needed" (§3–§4) | **26** |
| **A-later** | NRCS SDA and the geocoder, eductors, deep wells, the priced wellpoint activities, the library release of the wellpoint gear, the full Site water panel, the harness dewatering check | **61** |

**Defaults taken (the founder's answers to the first version's questions 1, 2, 4, 5):** drawdown **2 ft** below the
bottom; the CGP covers the discharge, and only a site marked "suspected contamination" turns it into a by-hand line;
a **full-time attendant** on every hour a groundwater system runs off the crew's day, with a project setting for
**patrols** instead; **no labour pay on lost days** (open shop). Earthwork's drying days and pipe crews' rain-day-only
rule stand, with the overlap rule added (§5.b).

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

- **The six stations A-lean seeds** (ids and names as NCEI's Access Data Service returned them on 2026-11-15, with
  their days ≥ 0.50 in a year, A). The release carries each station's 12 months of the four data types above, its
  latitude and longitude (from the same service's station metadata, read at build time):

| Station id | NCEI name | Days ≥ 0.50 in, Jan–Dec | Year |
|---|---|---|---:|
| USW00012960 | HOUSTON INTERCONT AP, TX US | 2.6, 2.3, 2.1, 2.3, 2.8, 3.6, 2.3, 2.7, 2.6, 2.9, 2.3, 2.6 | 31.1 |
| USW00012918 | HOUSTON HOBBY AP, TX US | 2.8, 1.8, 2.0, 2.5, 2.9, 3.5, 2.8, 2.7, 3.3, 2.9, 2.3, 2.7 | 32.2 |
| USW00012977 | HOUSTON SUGARLAND MEM, TX US | 2.2, 1.9, 2.1, 2.0, 3.1, 2.6, 2.8, 3.2, 2.5, 3.0, 1.7, 1.8 | 28.9 |
| USW00012975 | HOUSTON CLOVER FLD, TX US (Pearland) | 2.5, 1.6, 1.5, 2.0, 2.3, 2.8, 3.1, 2.9, 3.0, 2.9, 2.2, 2.5 | 29.3 |
| USW00053902 | CONROE MONTGOMERY CO AP, TX US | 2.3, 1.9, 2.0, 2.0, 2.5, 2.8, 2.3, 1.7, 2.2, 2.6, 2.4, 2.5 | 27.2 |
| USW00012923 | GALVESTON SCHOLES FLD, TX US | 2.2, 1.3, 1.6, 1.6, 1.7, 2.6, 2.7, 2.5, 3.5, 3.0, 2.1, 2.1 | 26.9 |

  The first version's "Baytown" was not confirmed (no station id was found for it in this revision; Ellington,
  USW00012906, returned no normals), so it is replaced by Clover Field, which covers the south-east side. **Station choice in A-lean:** the nearest of the six to the project's ZIP centroid
  (a seeded ZIP centroid table for Texas ZIPs, Census ZCTA gazetteer, public), the person able to pick another; a
  project outside the seeded area reads "No climate normals for this location (A-later)" and takes no lost days, said
  in Needs attention, never a silent zero. Fetching other stations from the service is A-later.

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
| Offline fallback | the last stored answer; none → "No soil survey: enter the water depth or a bore" and the method falls back to the project's typed design water | the six Houston-area stations seeded in the release (IAH, Hobby, Sugar Land, Clover Field, Conroe, Galveston; §2.c); elsewhere the last stored answer (A-later) | ZIP centroid (Census ZCTA gazetteer, public, seeded) |
| Down | the fetch is a Celery task with a 30 s timeout; the panel shows "Soil survey unreachable, retry" and nothing changes | same | same |
| Cost | $0 (A) | $0 (A) | $0 (A) |

No new key. Nothing goes in `.env.ai` for Plan A.

## 3. Method selection

**A-lean scope:** rules 1, 2 (sump), 3, 5 and 6 (wellpoints, vacuum and one stage, the bench) are built with their
quantities (§4.1–§4.3's sump); rows 4, 7 and 8 (eductors, a second stage, deep wells) return "Outside the built
methods: price by hand" and carry no quantities until A-later. Every equipment and material price on a dewatering
line reads **"Quote needed"** (never $0, never a stand-in rate); the money in the bid is the pay line at the owner's
figure (§4.5).

**The sump pumps are the exception (the founder's answer, 2026-11-15, REPORT_2026-11-17 §1 Q17; D-1285):** a sump
pump (rule 2's groundwater sump in clay, and §5's rain sumps) is **priced from the library's trash pump**
(`PMP-TRASH-3`, its rental at the cheapest days / weeks / 4-weeks and its fuel, as `dw-sump-clay` and `rain-sump-q1`
work it), not "Quote needed". Wellpoints, eductors and deep wells stay "Quote needed" in A-lean. Recorded here only:
AL4 is the pure, unwired module, so tonight nothing prices it; the pricing is built when AL4 is wired (AL4/AT8), and
`dw-sump-clay`'s $ cells become A-lean's then.

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

**Order note (D-1288, AL4's pure module):** read literally, "first that applies" sends every pond with k ≥ 10⁻³ and
lift > 15 ft to row 7's second stage before row 8 is reached, so `dw-deepwell-pond` (§6) could never take deep wells.
The module reads **row 8 before row 7** (a trench never meets row 8, a pond never meets row 6), so a pond in coarse sand
with H > 15 ft or over an acre takes deep wells and any other deep pond the second stage. Also: a dual USCS symbol
reads as its first ("SP-SM" as SP); a k exactly on an edge (10⁻⁴, 10⁻³, 10⁻²) belongs to the band above, as the
table's "≤" says.

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
| Pump watch | **default, full-time attendant:** calendar days × 24 − system work days × crew hours (the off-shift hours), one operator. **Setting "Patrols":** calendar days × off-shift visits a day (default 2, D) × 1.0 h a visit (D) | A (Deer Park "on duty at all times"); the hours D |
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

### 4.5 "As directed" pay items (A-lean, AL3)

The tabs pay dewatering as an owner's contingent item, almost always at one figure (§7). So the bid carries it as the
owner wrote it, and our own model is a check on it, not its price.

- **Pay line:** Estimating gains a line kind **"Pay item (as directed)"**: description, unit, the owner's quantity and
  the owner's unit price, typed from the bid form (both required). Its total = quantity × price; it goes into the bid
  total as written, outside markup (the owner fixed it), and carries no cost components of its own.
- **Our cost beside it:** the line links to the project's dewatering lines (the runs' `dewatering` role) and shows, per
  unit of the pay item: our priced part (attendant or patrol labour at the project's wage, fuel at the project's
  diesel) and the count of parts still "Quote needed". Risk badge: **"Covered"** when our priced part ≤ 0.8 × the
  owner's price and nothing is "Quote needed"; **"Check"** when it is between 0.8 and 1.0 × or parts are unpriced;
  **"At risk"** above 1.0 × (D, the thresholds). Our LF below water against the owner's quantity is shown too
  ("Our runs: 1,240 LF below water; the item: 2,000 LF").
- **Not in the harness's multiplier:** the harness keeps the tab rows out (`bidtabs/gap-report.mjs` `NOT`), and the
  pay line is out of our side the same way, so k does not move.
- **Hand rows:** `pay-as-directed` (2,000 LF × $23.00 = **$46,000** in the bid, our attendant labour beside it) and
  `pay-risk` (our priced part $26.40/LF against $23.00 → 1.148 × → "At risk"; illustrative inputs).

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
| Earthwork in Houston clays (mass grading, ponds, subgrade) | (R + Dry × (1 − p)) × 5/7, where R = days ≥ 0.50 in, Dry = R + days ≥ 1.00 in (one drying day after each half inch, one more after an inch), p = R ÷ days in the month | TxDOT: "a half-inch of rain could delay a project with a large amount of earthwork for three or more days" [S11] (**C**); the split is D. The 5/7 counts weekday events only (D) |
| Pipe crews (in a box, small open length) | R × 5/7 (rain day only: no drying day, so no overlap) | D |
| Concrete flatwork, paving | days ≥ 0.10 in × 5/7 | D (ALDOT used > 0.2 in [S12], C) |

**A drying day that is itself a rain day is not counted twice.** The normals give counts, not the order of the days,
so the overlap is taken as the chance that a drying day falls on another rain day of the month, p = R ÷ days in the
month (independent days, D); that share of the drying days is already lost as a rain day and is dropped. June at IAH:
R 3.6, Dry 5.6, p 0.120, so 4.93 drying days count, not 5.6. Rain clusters in Houston (fronts, tropical systems), so
the true overlap is larger and the rule still overstates slightly; A-later can replace p with the station's own daily
series (NCEI GHCN-Daily, the same service, no key), counting each drying day once on the real calendar.

IAH gives ≈ **52.6** earthwork (was 55.5 before the overlap rule) and ≈ 22.2 pipe working days lost a year (§6 rows).
TxDOT plans on "16 to 17 working days" a month [S11], about 5 lost of ≈ 21.7 weekdays: the earthwork figure (4.4 a
month) sits inside it.

### 5.c How it flows

1. Each activity's crew-days grow by its lost days in the months it works (pro rata by days).
2. **Rented machines** bill the calendar: the spread's rental days = work days + lost days (the period solver as
   today, `periods.ts:solveRental`).
3. **Owned machines** take a standby rate on lost days (Plan B §8: the library's `standby_rule`, today text only).
4. **Labour: no pay on a lost day** (the founder's default, open shop): crew hours stay the production's; a show-up
   allowance setting exists at 0 h (D).
5. Groundwater pumps run through rain days (they are on the 24 h clock already); rain sumps add pump-days (5.a,
   A-later with the priced pumps).
6. Estimating shows "Weather: +6.1 lost days (June, IAH normals 1991–2020)" on each spread and a project total.
7. **No double count with the production rates:** a lost day is added only to an activity whose production source
   is per working day or per operating hour (§5.d). An activity marked `prod_includes_weather` (none today) takes none.

### 5.d The production sources, checked for weather days already in their rates

Every source the library's productions cite (bench `eqlib.eq_production.source_ids`, live rows; `eqlib.ew_default.basis`;
and `docs/reference/production_research_points.csv`, 629 points, which built the tier file `production_tiers_2026-11.csv`),
read only on 2026-11-15. "Per working day" = a day the work was done (an agency charges a weather day as a
non-working day, so its rate excludes it). The question for each: does its rate already spread lost weather days
over the days it counts?

| Source (library id or file) | Rows | Rate basis | Weather days inside the rate? | Grade |
|---|---:|---|---|---|
| FM 5-434 Earthmoving Operations (FM5434, FM5434-8), US Army | 219 / 90 | per operating hour × an efficiency factor (the 50-minute hour) | **No**: the factor covers delays inside a worked hour, not lost days | C (the manual's method, read earlier for the catalog; the weather clause not re-read) |
| KSU CE417/CE419 notes and tutorials (KSU-3, -4, -EQ, -T3, -T5, -T6, -T7) | 36–90 each | per hour, textbook cycle method with efficiency | No | C |
| Caterpillar productivity pages and spec pages (CAT-FILL, CAT-WL, CAT-WL-PG, CAT-DOZ-PG, CAT-SCR-PG, CAT-MG, CAT-GR-PG, CAT-TRK-PG, CAT-EXC-PG, CAT-PM310, CAT-420) | 2–79 each | per hour, cycle method | No | C |
| Other OEM and dealer spec sheets (DEERE-FLEET, DEERE-135P/-210P/-345P/-350P/-35G, KOM-PC360, VOLVO-ADT, ZIEGLER, ALLMACH-PC88, WN-BS60, WN-WP1550, ATE-PLATE, CARLETON-BKT) | 1–32 each | machine capacity per hour | No (capacities) | C |
| Exam and secondary sheets (OEP, EduRev, USMC-PE, Stormwater, Construction Equipment trencher, AI-ROLL, RB-HMA, PSU-SP, FCP-CONC, RER-TROWEL, MST-GE441, GEOM, WYDOT-RIP, DRILLER-BP, GTI-VAC, ACI-S21, CLEANER-PB, VTT-CRANE) | 1–49 each | per hour or per operation | No | C |
| FEMA Schedule of Equipment Rates 2025 (FEMA25) | 25 | an equipment cost rate, not a production | n/a | A |
| TxDOT Construction Production Rates 2024 (TXDOT) | 80 + 21 points | per working day, for contract time | **No**: TxDOT counts contract time in working days and does not charge a day lost to weather, so its rates are per day worked | C (the agency's working-day practice; the rate table's own note not re-read) |
| WisDOT FDM 19-10-30 production rate table (WISDOT) | 84 + 29 | per working day, for contract time | No (the FDM converts working days to calendar time separately) | C |
| NCDOT Contract Time Guidelines (NCDOT) | 43 + 94 | "per working day" (as the research file records it) | No | B (the file's own words, "per working day") |
| WSDOT M 22-31.10 App. 6 (WSDOT) | 56 + 65 | per 8 h working day | No | B (the file records the 8 h day) |
| FHWA Central Federal Lands contract time / CPM guidelines (FHWA-CFL) | 13 + 1 | per working day (8 h) | No | C |
| ADOT Production Rates Guidelines (in the research file) | 74 | "per working day" | No | B |
| INDOT (Jiang & Wu; Memo 97-27), IDOT District 5, MoDOT EPG 237.8, KY-CTDS, ODOT / Oklahoma State, Illinois ICT 15-011, MDT / Iowa State and Jeong et al. (effective rates from daily work reports), FDOT utility relocation manual, Savage 1988 survey (research file) | 6–44 each | per working day or per day with work reported | No: the daily-report studies divide quantity by the days work was reported, so days rained out are not in the denominator | C |
| CTR 0-4416-1, O'Connor et al. (TxDOT research; A32, A28, A18, A96's run-length models) | 34 + 11 + 6, and the D-1091 / D-1275 rows | per "standardized crew day" measured on the days the crews worked | **No** (measured on worked days) | C |
| `ew_default.basis` "IntelCost estimate (no published rate)" (21 activities: A11, A40, A61, A63, A69–A71, A73–A76, A80, A81, A83–A85, A89–A91, A93, A94) and the research file's "founder's provisional figure" | 21 + 6 | an assumption | No assumption of weather either way | D |
| `ew_default.basis` **"crew sheet, no published rate"** (14 activities: A22, A24, A25, A30, A31, A35, A37, A41, A42, A45, A46, A52–A54) and the tier file's "founder's crew sheet" rows | 14 + 15 | the founder's own crew sheets | **Unknown**: a contractor's sheet may be an average day over a season (weather inside) or a good day (outside) | **F: question 4** |

**Result:** no library production source is known to include lost weather days; every one is per worked hour or per
worked day. So A-lean adds the lost days to every activity's duration, except an activity the founder marks as
weather-inclusive (the crew-sheet rows, question 4). The flag `prod_includes_weather` (default false) lives on the
company activity and is shown on the crew's hover.

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
| `dw-wp-bench` | Lift over 15 ft, sloped trench | bottom 16 ft, water 4 ft, SP, sloped walls | drawdown 18; lift 18 > 15 → rule 6; bench 18 − 15 + 1 = 4 ft; lift on the bench 14; point length first ≥ 14 + 5 = 19 → 21 ft; H 12 > 10 → **double row**; SP from the USCS table k 10⁻² → 8 ft spacing (D-1288's note: the first version named neither) | wellpoints on a 4.0 ft bench, double row, 21 ft points; the bench's cut joins the run's excavation |
| `dw-eductor` | Silt, deep, in a box | bottom 18 ft, water 6 ft, ML (k 2 × 10⁻⁴), box | lift 20 > 15, k in the silt band → rule 4 | eductors, flagged "price by hand (no rates)" |
| `dw-deepwell-pond` | Pond in coarse sand | pond 300 × 200 ft, bottom 20 ft, water 6 ft, SW (k 10⁻²) | H 14; area 1.38 ac > 1 → rule 8; perimeter 2 × (300 + 200) = 1,000 ft; wells 1,000 ÷ 50 = 20; standby ⌈20/10⌉ = 2; well depth 20 + 2 + 10 = 32 ft | 20 deep wells at 32 ft + 2 standby pumps; drilling by hand |
| `rain-june-ew` | June, earthwork (overlap rule) | IAH June: ≥ 0.50 in 3.6, ≥ 1.00 in 2.0, 30 days | Dry 3.6 + 2.0 = 5.6; p 3.6/30 = 0.12; counted 5.6 × 0.88 = 4.928; (3.6 + 4.928) × 5/7 | **6.09** lost working days (6.0914; was 6.57 without the rule) |
| `rain-june-pipe` | June, pipe crew | IAH June ≥ 0.50 in 3.6 | 3.6 × 5/7 | **2.57** days |
| `rain-q1` | Jan–Mar window | Jan R 2.6, ≥ 1 in 1.2, 31 d; Feb 2.3, 0.8, 28 d; Mar 2.1, 1.2, 31 d | Jan (2.6 + 3.8 × (1 − 2.6/31)) × 5/7 = 4.3438; Feb (2.3 + 3.1 × (1 − 2.3/28)) × 5/7 = 3.6753; Mar (2.1 + 3.3 × (1 − 2.1/31)) × 5/7 = 3.6975; pipe 7.0 × 5/7 | **11.72** earthwork (was 12.29), **5.00** pipe |
| `rain-overlap` | A drying day on a rain day, one month | R 3.6 in 30 days | of 5.6 drying days, 5.6 × 0.12 = 0.672 fall on rain days and are dropped | 0.672 days not counted twice |
| `rain-year` | A year at IAH | months as above | earthwork Σ 12 months; pipe 31.1 × 5/7 | **52.60** (was 55.50), **22.21** days |
| `rain-sump-q1` | Rain sumps, Jan–Mar, 2 headings | ≥ 0.10 in: 5.7 + 4.9 + 4.8 = 15.4 | pump-days 15.4 × 2 × 2 = 61.6; hours × 8 = 492.8; fuel × 0.65 = 320.32 gal × 3.578 | 61.6 pump-days, 320.32 gal, $1,146.10 gasoline |
| `rain-standby-ex20` | A rented 20 t excavator, 20 work days in June | lost 6.09 → ⌈26.09⌉ = 27 billed days (5-day basis), unchanged by the overlap rule | 4-week + 1 week + 2 days = 7,950 + 2,927 + 2,080 = 12,957 (4-week + 2 weeks 13,804; two 4-weeks 15,900) | $12,957 against $7,950 dry: **+$5,007** |

In A-lean the `dw-*` rows check quantities only (the $ in `dw-sump-clay` and `dw-wp-single-pumps` is A-later's, when
the pumps are priced; A-lean shows those cells "Quote needed"); `dw-eductor` and `dw-deepwell-pond` check only the
"price by hand" outcome. The two pay rows are in §4.5.

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

## 9. Tasks, hours and order (revised: A-lean and A-later)

The first version's A1–A13 (87 h) are kept as the record of the whole; the revision splits them. Every A-lean task
is inside the first version's scope, cut down; the A-later rows are what is left of each.

### 9.1 A-lean (26 h, ±25 %)

| # | Task | From | Repo | Hours |
|---|---|---|---|---:|
| AL1 | NOAA normals: `wx_station` and `wx_normals` seeded with the six stations' 12 months × 4 data types (§2.c), the Texas ZIP centroid seed, nearest station on the project with a picker; the bore layer's `k_cm_s` in the same migration (one migration) | A4, A2 (ZIP part), A1 (column) | api | 4 |
| AL2 | Rain into durations: a pure `water/rain.ts` (lost days per month by work class, the overlap rule, the window from the project's start and the activities' days), each activity's crew-days + its lost days, the spread's rental days follow (`periods.ts:solveRental` unchanged), no labour pay on lost days, `prod_includes_weather` on the company activity (default false), Estimating's weather note; owned standby only if Plan B's B8 is in | A10, A5 (rain part) | app, api | 7 |
| AL3 | "As directed" pay lines (§4.5): the line kind, the owner's quantity and price, into the bid total outside markup, our priced part and "Quote needed" count beside it, the risk badge | new (the first version's question 3) | app, api | 4 |
| AL4 | The sump and wellpoint rule and quantities: the pure `water/` module's rules 1, 2, 3, 5, 6 and the double row (eductor and deep-well rows answer "price by hand"), §4.1–§4.3's sump quantities, the attendant / patrol setting and the 2 ft default in `utility_settings` (JSONB, no migration); the runs' dewatering stretches show the method, its reason and the quantities, every price "Quote needed"; the §6 quantity rows and the rain and pay rows as `water-cases.mjs` <br>**Pure part built 2026-11-16 (D-1288, night run step 4; founder to confirm; not Live, no visible change):** app `src/lib/takeoff/earthwork/water/` (`defaults.ts` the figures as constants, the 2 ft target and the attendant / patrol default included; `method.ts:selectMethod`, `permeability`, `kText`; `quantities.ts:systemDuration`, `waterQuantities`, `sumpQuantities`, `wellpointQuantities`, `priceText`; `rain.ts:dryingDays`, `lostDaysInMonth`, `lostDaysInWindow`, `rainSumps`; `pay.ts:payRisk`), imported by nothing but the quantity table; infra `browser/lib/water-cases.mjs` (33 rows). **Waits for the wiring:** the setting in `utility_settings`, the run panel's method, reason and quantities, `calculateUtilities` calling it, the sump pump priced from `PMP-TRASH-3` (Q17), AL2's durations (the activity's lost days and the rented spread's days) and AL3's pay line | A5, A6, A7 (utilities only), A1 (settings) | app, infra | 9 |
| AL5 | Gates, the quantity table, one MCP smoke on a throwaway (a Houston ZIP, a bore at 5 ft in SP: the run turns "Wellpoints, single row" with its quantities and "Quote needed"; a pay line at $23/LF with its badge; the spread's June weather note), docs, mirror | A13 | all | 2 |
| | **A-lean total** | | | **26 h** |

### 9.2 A-later (61 h, ±30 %)

| # | Task | From | Repo | Hours |
|---|---|---|---|---:|
| AT1 | The `site_water_source` cache table and the rest of the Site water settings (window, discharge, overrides) | A1 | api | 4 |
| AT2 | Geocode the project address (Census geocoder, no key) | A2 | api | 5 |
| AT3 | NRCS Soil Data Access client (Celery, 30 s, cache; the five fields, monthly wet depth, ksat by horizon) | A3 | api | 6 |
| AT4 | NOAA beyond the six: the station inventory, the Access Data Service fetch and cache; the daily series (GHCN-Daily) for the exact overlap | A4 | api | 3 |
| AT5 | Eductors, deep wells, the second wellpoint stage, the pond / mass excavation ring | A5 | app | 5 |
| AT6 | Their quantity rows | A6 | infra | 2 |
| AT7 | Earthwork Calculate (areas below water); the job's pool sharing pumps across runs open at once | A7 | app | 5 |
| AT8 | Priced activities: "Dewatering, wellpoint system", "Dewatering, sump", "Rain sumps" (24 h clock, 7-day pump weeks, duration rentals, attendant labour, jetting crew) | A8 | api | 10 |
| AT9 | Library release: §8 keys from the quotes (the five metros' medians, Plan B §1.2) and the existing pumps | A9 | api | 4 |
| AT10 | The full **Site water** panel (sources, design water, rain table, method overrides), the run panel's dewatering block, Needs attention | A11 | app | 10 |
| AT11 | The harness's dewatering check and the under-detection share (§7), report only | A12 | infra | 3 |
| AT12 | Gates, smoke, docs, mirror | A13 | all | 4 |
| | **A-later total** | | | **61 h** |

**Plan A in all: 87 h** (26 + 61), as before; the split moves no work out.

**Order:** A-lean first, in one night after Plan B's correctness night (Plan B §10.3 night 3): AL4's pure module and
rows can go a night earlier (no visible change), then AL1 → AL2 → AL3 → AL4's wiring → AL5. A-later after the wellpoint
quotes: AT1 → AT2 → AT3 → AT4 → AT5 → AT6 → AT7 → AT9 → AT8 → AT10 → AT11 → AT12 (four nights).

## 10. Risks

1. **The money is in the as-directed item, not in our cost model.** A-lean puts the owner's figure in the bid (the pay
   line) and our model beside it; the priced wellpoint model waits for the quotes (A-later).
2. **Soil survey depth.** SDA describes ≈ 6.5 ft; Houston trenches are 8–20 ft. A-lean uses bores and typed water only;
   with neither, the run says "No water data" and takes no method.
3. **Houston's 01578 unread.** The 2 ft drawdown and the standby rule come from neighbours' specs until it is read.
4. **24 h pricing meets a 5-day solver** (A-later's AT8). A-lean prices no pump, so the solver is untouched.
5. **Rain makes us dearer on the harness** (≈ +$67 k on the recent tabs, pipe crews; the overlap rule changes only
   earthwork). It is right, and it will read as going backwards: shown on its own rerun.
6. **The overlap rule assumes independent days**; Houston rain clusters, so earthwork lost days are still slightly
   high until AT4's daily series.
7. **Crew-sheet productions** (14 activities) may already carry weather (§5.d): until the founder answers, they take
   lost days like the rest.
8. **Wellpoint quantities are rule-of-thumb** (500 ft per pump, 60 points a crew-day), graded D on every row.

## 11. Questions for the founder

Answered by the brief (taken as defaults): drawdown 2 ft; CGP covers discharge, flag only suspected contamination; a
full-time attendant with a patrol setting; no labour pay on lost days; the as-directed item as a pay line.

1. **Pay line risk badge:** "Covered" at our priced part ≤ 0.8 × the owner's price, "At risk" above 1.0 ×: right
   thresholds? And does the pay line sit outside markup (as the owner fixed it)?
2. **Sump pumps in A-lean:** the 3 in trash pump has a library rate (out-of-state, A); may A-lean price sumps from it,
   or keep every dewatering price "Quote needed" until the Houston factor (Plan B) exists?
3. **Overlap rule:** independent days (p = rain days ÷ days in the month) until the daily series in A-later?
4. **The founder's crew sheets** (14 activities, §5.d): average days over a season (weather inside, no lost days added)
   or good days (lost days added)?
5. **Patrols:** 2 off-shift visits a day of 1 h each as the patrol setting's default?
6. Houston 01578: can you send the City's current section? (kept)
7. Wellpoint quotes: which dewatering firms should the estimator ask (besides the rental dealer branches of the quote
   sheet)? (kept)

## 12. D-1315 (night run from 2026-11-17 22:31, task 6): AL1–AL3 built in scratch, AL4's wiring designed

The founder's brief (morning-report-2026-11-21 `BRIEF.md` task 6) widened A-lean: the **Census geocoder** (was AT2) with
the ZIP centroid as fallback, **any station fetched once** (was AT4) with Houston-area and Gallia County, OH stations
seeded, **snowfall and frost days**, a 50 mi flag, a per-project override, and **proposed winter rules**.

**Status: AL1–AL3 built and proved in scratch, NOT in the repos** (NO-GO at 04:45 UTC 2026-11-18: AL4's wiring did not
fit and the founder should see the price changes whole). **Handover:
`intelcost-infra\morning-report-2026-11-21\d1315\HANDOVER.md`**: patches against app 330c4a3, api 1e367ff and infra
0640f3d, the files whole, the migration d1315c7a2e94 (to be re-chained onto the head of the day), the seeds, the fetch
scripts, the QT rows, the checker's brief and the Phase 2 runbook.

### 12.1 Data (AL1), read on 2026-11-18

- **Data types, NCEI's own names** (`Readme_By-Variable_By-Station_Normals_Files.txt`, normals-monthly 1991–2020 doc
  folder: "AVGNDS = average number of days meeting criteria given"; "GEnnnuu … HI (hundredths of an inch), TI (tenths of
  an inch)"; "LSTHnnn … less than or equal to the value nnn … whole degrees Fahrenheit"): `MLY-PRCP-AVGNDS-GE010HI`,
  `-GE050HI`, `-GE100HI` (days ≥ 0.10 / 0.50 / 1.00 in), `MLY-SNOW-AVGNDS-GE010TI` (days with snowfall ≥ 1.0 in),
  `MLY-TMIN-AVGNDS-LSTH032` (days with a minimum ≤ 32 °F), and `MLY-PRCP-NORMAL`. **A.**
- **Fetch (no token):** `GET https://www.ncei.noaa.gov/access/services/data/v1?dataset=normals-monthly-1991-2020&stations=<id>&dataTypes=MLY-PRCP-NORMAL,MLY-PRCP-AVGNDS-GE010HI,MLY-PRCP-AVGNDS-GE050HI,MLY-PRCP-AVGNDS-GE100HI,MLY-SNOW-AVGNDS-GE010TI,MLY-TMIN-AVGNDS-LSTH032&format=json`.
  Resolved directly tonight (no pinning needed).
- **The station list** (`wx.station`, 9,248 rows): every station of NCEI's by-variable precipitation archive (v1.0.1,
  c20230404) with all 12 months of the three rain counts, located by NCEI's `inventory_30yr.txt`; `has_snow` (5,709) and
  `has_frost` (6,003) from the precipitation and temperature archives (c20230403). 4,290 have all five series.
- **Seeds** (`wx.normals`, 34 stations × 12): the six airports of §2.c, every station within 40 mi of ZIP 77002's
  centroid, every one within 30 mi of ZIP 45614's (P08's Gallia County address, read only). Fetched once from the ADS
  and checked against the archives: **2,040 cells, 0 differences.**
- **ZIP centroids** (`wx.zip_centroid`, 33,791): Census Bureau 2024 ZCTA gazetteer internal points.
- **Geocoder:** `GET https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=<line>&benchmark=Public_AR_Current&format=json`
  (no key; first match's `coordinates.y/x`).
- **The pick:** the nearest station with the three rain counts (great circle, R 3,958.8 mi); a series the station lacks
  (snow, frost) is taken from the nearest station that has it, named with its distance; > 50 mi flagged in Needs
  attention; a person's override wins until cleared; a new location text places and picks again (on the next read).
  Examples: ZIP 77002 → HOUSTON HTS (USC00414321) 4.3 mi, frost from HOUSTON-PORT 5.2 mi; ZIP 45614 → GALLIPOLIS
  (USC00333029) 9.1 mi, snowfall from SALEM CTR 2 E 9.7 mi.

### 12.2 Lost days into durations (AL2)

`water/weather.ts` (pure): a month's lost share by rule, combined as independent days (`1 − Π(1 − share)`), so a day
lost to two causes counts once; with the winter rules off it equals §5.b to the digit. **An activity's window grows with
its own lost days** (D-1288 reading 5 answered): from the work start, L solves L = lost over (W + L) × 7/5 calendar days
(fixed point); with no start, the year's share f: L = W f ÷ (1 − f). The rule per starter activity is
`api weather/classes.py` (earthwork: A1–A11, A14–A17, A20, A21, A34–A39, A55–A60, A62, A63, A89, A90, A95; pipe and
site crews, rain day only: A12, A13, A18, A19, A22–A33, A45, A61, A64–A85 but A77, A78, A96; flatwork and paving:
A40–A44, A46–A54, A77, A78, A86–A88, A91, A92; none: A93, A94 and custom activities). **Rented machines** in a line's
spread or a site spread bill W + L (`cost.ts` → `periods.ts:solveRental`); **owned** stand by on L (B8); operated hires,
machines on site, pool riders and crew-carried classes take none; **crew hours never change** (no pay on lost days).
Estimating shows the note on the machine ("Weather: +7.1 lost days (Jun–Jul, HOUSTON INTERCONT AP normals)") and a
Setup line "Weather: <station>, <mi> mi"; Equipment Settings › Weather holds the station, override, work start and
the winter switch.

### 12.3 Winter rules, proposed (off until the founder adopts them; grade D for every threshold)

| Work | Rule | Basis |
|---|---|---|
| Earthwork | a day with snowfall ≥ 1 in is lost, and one clearing day after it (overlap as the drying day); in a month with ≥ 15 frost days the ground is taken as frozen and every frost day is lost | ODOT CMS 203.06: "Do not construct frozen embankment material or place embankment material on frozen ground" (**A**, read 2026-11-18); INDOT 203 (revised 2025) and Baltimore County 201.03.05 say the same (**B**); the 15-day threshold is **D** |
| Pipe crews | the snowfall day is lost; frost alone is not | **D** (crews in a box work cold mornings) |
| Flatwork and paving | the snowfall day and every frost day are lost (no placement on a day at or below freezing without heat and blankets, which are not priced) | ACI 306R "cold weather" (air below 40 °F during protection) (**C**, from memory of the guide: not re-read tonight); TxDOT's 2024 Item 360/420 text could not be fetched (DNS), so no Texas figure is cited |

Effect, 20 work days, year average: IAH earthwork 5.05 → 5.07, pipe 1.86 → 1.87, flatwork 4.28 → 4.98; Carpenter 2 S,
OH (nearest complete station to 45614) earthwork 4.09 → 14.81, pipe 1.64 → 2.08, flatwork 5.80 → 19.36. January at
Carpenter, earthwork: 19.16 of 22.14 weekdays lost with the rules on.

### 12.4 Pay items (AL3)

Table `estimate_pay_item` (owner's quantity and unit price, required; `link_role` "dewatering"); Estimating › Setup ›
"Pay items (as directed)". **Reading:** "outside markup" is taken as after profit and before the bond (the bond is on the
whole contract price, which includes the owner's items). The dewatering check: our trench dewatering lines' cost ÷ their
LF against the owner's unit price (`pay.ts:payRisk`), an unpriced line counted "Quote needed" (badge Check).

### 12.5 AL4's wiring: not built tonight (design and hours)

What blocks it is the duration: §4.1's crew-days need the run's LF/day, which is the api's production (the pipe line's
spread), not known at Calculate. Design: (1) `utilities/quantities.ts` keeps, per run, the dewatering stretch's worst
station as a `WaterSite` (bottom depth, design water, the bottom band's USCS, bottom width); (2) `calculate.ts` calls
`water/method.ts:selectMethod` and stores method, reason and flags on the run and the "Trench dewatering" line
(variant `trench:sump` / `trench:wellpoint`, note "…; Quote needed"); (3) Estimating computes `waterQuantities` with the
pipe line's spread LF/day and shows them on the dewatering line; (4) the api's starter for a `dewatering` line with method
sump becomes a library machine `PMP-TRASH-3` on the 24 h clock (calendar days × 7/5 work-day equivalents for the
solver: the spec's risk 4), fuel at gasoline, patrol and CGP hours at the wage; wellpoint gear stays "Quote needed";
(5) `utility_settings` gains `dewater_target_ft` and `dewater_watch` (JSONB, no migration); (6) the `dw-*` rows' $ cells.
**≈ 7 h** with its QT rows and smoke.

### 12.6 Next run

Build AL4's wiring first (§12.5), then the handover's `PHASE2.md` (≈ 3 h: bench migration, one api and one app copy
batch, gates, quantity table, smoke, independent check, one (a1) harness pass, commits), so task 6 lands whole.

### 12.7 Founder questions (readings taken)

1. Pay items: outside overhead, markups and profit, **after profit and before the bond** (the bond is on the whole price)?
2. Winter rules (§12.3), built and **off**: earthwork snow + clearing day and frost days in a ≥ 15-frost-day month (ODOT CMS
   203.06, A); pipe the snow day; flatwork snow and every frost day (ACI 306R, C). Turn on, change, or keep off?
3. An activity's lost days stretch its own window: 20 earthwork days from June 1 at IAH lose 7.07, a 20 t excavator bills
   28 days, **$13,804** (the flat-June reading of §6 `rain-standby-ex20` gave $12,957). Adopt?
4. Owned machines stand by on the lost days (B8); rented bill them; crews are not paid.
5. Small rentals round up per line (a 1-day spread with 0.1 lost days bills 2 days). Keep, or no extra billed day for
   under half a lost day?
6. No work start = the year's average share. Keep as the default?

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

### 12.x Founder answers of 2026-11-18 (D-1316, Q9), to build next night

- (a) **Pay items after profit, before the bond:** yes.
- (b) **Snow rules on:** earthwork snow day plus clearing day; pipe snow day; flatwork snow day.
  - Frost-day lost days are off.
  - Flatwork freezing is a cold-weather protection cost (ACI 306), not lost days: propose a priced line.
- (c) **Calendar days:** billed days are calendar days, and billing uses the cheapest mix of day, week and 4-week rates (confirm).
- (d) **Machines:** owned stand by, rented bill, crews are unpaid. Yes.
- (e) **Rounding:** once per machine across the project.
- (f) **No start date:** use the year average, with a Needs attention flag "Start date not set: average year used".
- **Existing projects never reprice silently:** they show "Weather days not applied · Apply". New projects apply by default.

### 12.8 D-1331 (night run from 2026-11-23 17:34, step 3): AL4 wired first

Built and committed on its own (the founder: "AL4 may ship on its own if proved"); AL1–AL3 follow, whole or not at all.
The design is §12.5's with one change: no migration and no new column. The method travels in the line's variant and
note, the pace in its spread.

- **Calendar rental of a 24 h machine** (`periods.ts` calendar mode): a day is 24 h, a week 7 days, a 4-week 28 days, the
  cheapest mix, no overtime. The work-day solver is unchanged for every other machine.
- **The sump line** (`trench:sump`): the library's `PMP-TRASH-3` (Q17) over the crew's days on the wet stretch + 1,
  through weekends (× 7/5), 24 h a calendar day, rented by calendar days; its fuel on every hour at the project's
  gasoline; one laborer on the patrols (2 visits × 1 h a calendar day) and the CGP report (0.25 h a calendar day), never
  an attendant (Q30); filter bags "Quote needed". `dw-sump-clay` now priced: one 7-day week $239, fuel $234.43, 9.45 h.
- **The wellpoint line** (`trench:wellpoint`): the run's pace on its spread, no component; Needs attention lists §4.2's
  quantities, every part "Quote needed".
- **Other methods** (eductors, deep wells, a second stage, no water data): the line stays `trench`, priced by hand, its
  note saying why.
- **Rows:** `browser/lib/dewater-cases.mjs` (14) and two utility rows (`util-2e2-dewatering-full`'s governing station,
  `util-2e3-no-dewater-site`).

### 12.9 D-1331 continued: AL4b and AL1–AL3, built whole (night run 2026-11-23/24; founder to confirm)

The full record is DECISIONS.md D-1331 and `intelcost-infra/morning-report-2026-11-24/REPORT_2026-11-24.md` §4.

- **AL4b (the founder's D-1328 addendum answers):**
  - **Rename in place** (api `earthwork/lines.py:write_lines`): a run type's trench dewatering line is one line whatever
    its method; Calculate's `trench`, `trench:sump` or `trench:wellpoint` adopts the region's existing dewatering row.
  - **A hand price is kept** (api `equipment/dewatering.py:hand_priced`, app `lib/estimate/dewatering.ts:handPriced`, one
    rule): a typed rate or a component a person added. Estimating shows "Calculate prices it at $X: your price kept".
  - **The soil group stands in for USCS**, named on the note ("Clay → low permeability → sump: …").
  - **Billing today (report only):** work days (1 / 5 / 20); calendar billing per founder project is REPORT_2026-11-24 Q1.
- **AL1, data:** migration `d1331c8a4e57` (revises `d1325e8b4f61`): the `wx` schema (NOAA 1991–2020 stations 9,248,
  normals 408 rows over 34 stations, ZIP centroids 33,791), `project_weather` (station, override, applied, start date,
  note), `estimate_pay_item`. The nearest station to the project's ZIP; a person may pick another.
- **AL2, lost days:** rain, snow and frost lost days by work class (§12.3 snow rules on; frost never a lost day) over the
  months worked, or the average year when no start date is set ("Start date not set: average year used").
  - **The founder's Q4 (supersedes the Q9 (c) and (e) readings):** each rented machine's whole time on rent priced once:
    extension = cheapest mix(base + lost) − cheapest mix(base), on that machine's own basis and rates (its typed or frozen
    rates, `MachineCost.rentalRates`), × units × location, with waiver, fee and taxable part; a site-spread or shared
    machine's share pro rata to its hosts (`lib/estimate/equipment/weatherExtension.ts`). Per-line rentals unchanged.
  - **Never silently:** a project that already had prices shows "Weather days not applied · Apply"; a new project
    applies from the start. On an applied project a station change, or normals read for the first time, is noted
    ("Weather station changed: A → B; weather days repriced") until Dismiss.
- **AL3, pay items:** "as directed" pay items typed per project, "Pay items (as directed)" between Profit and Bond; the
  dewatering pay check (`water/pay.ts:payCheck`): a line counts as pumped only with its pump or crew priced or a hand
  price; the ratio only for an LF pay item, else "compare by hand". A failed read says so in Needs attention.
- **Proof:** QT 14 dewatering rows, the AL4b rows and 29 weather rows, full QT 0 FAIL; smokes on throwaway copies;
  (a1) pass weather off/on (k all pipe 1.075 → 1.064 to the medians); independent check PASS after M1–M5 and Q4-R.
- **Known gaps:** a borrowed snow or frost station's change gets no note; the extension does not show in Project takeoff
  or the component editor (N4); the weather row is written by its GET, so two tabs could race (N6); a priced crew counts
  as pumping even when the pump errors (REPORT_2026-11-24 Q6).

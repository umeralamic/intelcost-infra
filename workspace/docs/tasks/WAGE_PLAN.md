# Wage plan (PLAN ONLY, not approved)

**Status:** plan for review (2026-11-06). Nothing below is built until Umer approves it. It replaces item 4 of
[PRICING_FIX_PLAN.md](PRICING_FIX_PLAN.md) (Q-P4).

**The case.** Benchmark A (copy of a real bid, an open-shop private site job in Harris County TX) prices labor at
national union-scale rates raised 17.8 % for Houston. Mohave County AZ on its heavy/highway wage determination (WD)
prices every operator from one WD line, so dozer and grader operators come out under that WD's own minimum. Both
are rule problems, not data typos. Rules W1-W12 are the founder's (2026-11-06); this plan says how each lands.

**Sources used for the worked tables** (all copies in the untracked `test-data-local/wage/`, never committed):
- `ref_craft_rate`, edition "2026 National Average", effective 2026-01-01 (bench database).
- BLS OEWS May 2025, through the BLS Public Data API (api.bls.gov; the bls.gov pages return 403). Series
  `OEU{M|S|N}{area}000000{SOC}{03,08,09}`.
- BLS ECI, construction, wages and salaries: `CIU2022300000000I` (Dec 2025 171.488, Sep 2026 175.430; 12-month
  change 3.0 % at Sep 2026).
- SAM.gov WD API: Mohave County AZ Highway AZ20260046 mod 1 and Heavy AZ20260058 mod 1, both 2026-05-18.
- State minimum wage 2026 (DOL state table, 2026-11-05): Arizona $15.15, Texas $7.25.
- **Not found:** workers' comp loss costs by class for AZ and TX (tdi.texas.gov refused the connection, azica.gov
  403). W8 waits for the filings (Q-W6).
- The founder's attachments (the Mohave WD PDF or DE workbook, and the all-crafts hand-check) were not attached to
  the message; the plan used the SAM.gov API instead. The hand-check is compared once it is in `test-data-local/`.

---

## What the engine does today

- **Tables.** `ref_craft` carries a residential (RC-xx) and a commercial (CC-xx) table. On residential rows
  `base_or_wage_benefits` is a true base wage; on commercial rows it is base + fringes, and the source book's
  commercial total is that figure × (1 + employer burden) (`alembic/versions/e2a7c9f4b1d6_wagecalc_refdata_schema.py:193-208`,
  comment :197). `direct_base_wage` on commercial rows is a seeded 0.8929 × that figure, `base_is_estimated = true`
  (`seed/ref_craft_rate.csv`, `d669a2c5e8f1_commercial_tile_crafts.py:57-58`): not a paycheck figure.
- **`table_for()`** (`app/wagecalc/rates.py:69-70`) returns residential only for residential projects; every other
  project type, private commercial open shop included, reads the commercial table. **Benchmark A's cause.**
- **Location factor.** County AMF over ZIP AMF (`wagecalc/geo.py:58-62`), applied as × (1 + labor) to national rates
  only (`rates.py:128,130`). No ZIP: factors 0, note L-08 (`rates.py:273-278`).
- **Burden engine** `wage_data_rate` (`rates.py:156-207`): company benefits 12 % on open shop only (:173); plan
  fringe added untaxed for prevailing/union (:174); cash fringe taxed (:175); FICA, Medicare (:177-178), FUTA with
  credit reduction (:179-181), SUTA (:143-153, 182-183), workers' comp on base (:184), GL 3 % on base (:185).
- **Workers' comp** `ref_wc_rate`: one national rate per craft (`e2a7…:279-286`, `data.py:218`), e.g. laborer
  14.50 per $100, operator 8.49. Workspace override per craft (`wage_calculator/models.py:52-55`).
- **Minimum wage:** no table, no api check; the app warns at the federal $7.25 only
  (`features/wage-calculator/text.ts:132-133`, `WageData.tsx:402`).
- **WD mapping** (`app/wagecalc/wd/mapping.py:90-113`): one WD line per app craft. Every operator kind collapses to
  "Equipment Operator" (crane apart, :22-27), every truck to "Truck Driver" (:28-29), every laborer to "Laborer"
  (:31-32). The WD rate is a floor and the higher of WD and national burdened × (1+F) wins (`rates.py:290-299`,
  R-01). Crafts missing from the WD take national × the entered crafts' median index, floored at national
  (`rates.py:301-319`, R-02). Foreman: the first WD line matching "FOREMAN" (`labor.py:145`). Parser: SAM.gov text
  and PDF upload (`wd/parser.py`, `service.py:1104-1170`); no link fetch.
- **Union:** no agreement entity; union rates are typed on the manual tab (`text.ts:23-26`, `WageData.tsx:383-389`),
  priced exactly as prevailing.
- **Your pay rates:** base/fringe per craft on `project_craft_rate`; never raised for open shop; "Your rate" R-04
  replaces the final rate (`service.py:617-635`).
- **Foreman:** the crew's highest-paid other craft × (1 + premium), premium the set's, else the company's, else 10 %
  (`labor.py:27, 76-82, 155-206`).
- **Saved sets:** `project_wage_set` snapshots edition, tax year, AMFs and WD (`models.py:115-201`);
  `project_craft_rate` the parts (`:204-241`). Recalc reruns saved inputs (`recalc.py:150-180`).
- **UI** (`intelcost-app-react/src/features/wage-calculator/`): basis cards "Location-Adjusted Rates" and "My wage
  data" (`WageBasis.tsx:15,21`), Calculate (`:82-83`); rate table Craft / Burdened / Note (`WageReview.tsx:161-165`);
  `WageStatusStrip.tsx:12`; `ForemanPremium.tsx`, `Overtime.tsx`.
- **No SOC map, no OEWS or ECI data, no escalation** anywhere.

---

## The rules, item by item

F is the project's labor factor (county AMF labor). "Escalated" is W12.

### W1 Open shop (residential and private commercial) on the residential table

**Change.** `table_for()` sends open-shop private commercial to the residential table too; public and prevailing
keep the commercial table. With no user rates, the base is the highest of:
- BLS OEWS for the craft's SOC, metro → state → national, **median** for residential, **75th percentile** for
  commercial, escalated;
- the residential base × (1 + F), escalated (option a) or × (1 + min(0, F)) (option b);
- the state minimum wage.

Burdened = that base through the burden engine, not below residential `hourly_rate` × (1 + F) (option a) or
× (1 + min(0, F)) (option b). The rate table names the winner.

**Data:** W9 (OEWS), W12 (ECI), state minimum wage table (W9's loader carries it, sourced from the DOL state table).
**Migration:** data (OEWS, ECI, minimum wage); no schema change for the table choice. **Risks:** every open-shop
commercial project's labor drops on "Update rates" (W11 makes it explicit).

**Harris County TX, open shop, private commercial (F = +17.771 %), bid date 2026-11-06.** National Estimator
escalated +2.61 % (Dec 2025 → bid date), OEWS May 2025 escalated +4.72 %. Burden as today's residential ratio
(hourly ÷ base, national WC until W8).

| Craft (SOC) | Today | OEWS p75 Houston, escalated | (a) res. base × (1+F) | (a) burdened | (a) rule won | (b) res. base | (b) burdened | (b) rule won |
|---|---|---|---|---|---|---|---|---|
| Laborer (47-2061) | 60.46 | 23.96 | 31.35 | **45.20** | Residential × (1+F) | 26.62 | **38.38** | Residential base |
| Excavator operator (47-2073) | 80.67 | 31.16 | 44.97 | **61.74** | Residential × (1+F) | 38.18 | **52.42** | Residential base |
| Dozer operator (47-2073) | 80.67 | 31.16 | 44.97 | **61.74** | Residential × (1+F) | 38.18 | **52.42** | Residential base |
| Motor grader operator (47-2073) | 80.67 | 31.16 | 44.97 | **61.74** | Residential × (1+F) | 38.18 | **52.42** | Residential base |
| Dump truck driver (53-3032) | 68.25 | 32.43 | 33.95 | **46.97** | Residential × (1+F) | 28.82 | **44.88** | OEWS p75 |
| Carpenter (47-2031) | 77.33 | 30.30 | 38.77 | **55.44** | Residential × (1+F) | 32.92 | **47.08** | Residential base |
| Plumber (47-2152) | 88.83 | 38.10 | 45.49 | **62.22** | Residential × (1+F) | 38.62 | **52.83** | Residential base |
| Painter (47-2141) | 74.70 | 25.04 | 39.99 | **54.85** | Residential × (1+F) | 33.95 | **46.57** | Residential base |
| Foreman, crew with an operator (47-1011) | 88.74 | 46.95 | — | **67.91** | Crew top × 1.10 | — | **64.47** | BLS 47-1011 |
| Foreman, laborer crew (47-1011) | 66.51 | 46.95 | — | **67.70** | BLS 47-1011 | — | **67.70** | BLS 47-1011 |

The residential table has one Equipment Operator, so (a) and (b) price every operator alike in open shop; OEWS
splits them only where a SOC does (47-2071 paving and surfacing equipment operators, Houston p75 $27.41). Under
(a) the founder's check holds: an operator's base is $43.82 before escalation (37.21 × 1.17771) against OEWS ~$28-30.

**Recommendation: (b).** A positive factor then cannot raise the floor above the residential base, so the market
figure (OEWS) and the residential table decide together; (a) keeps a +17.8 % all-industry index on top of a base
that is already a construction figure, which is the double count Benchmark A shows. (b) still never goes under the
residential base, and a negative factor (Mohave, −19.6 %) still lowers it. **Q-W1.**

### W2 The user's own pay rates (open shop)

**Change.** Used as entered, never raised (today's behaviour, kept). New flags per craft: "Below location-adjusted
rate" (under W1's rate) and "Below state minimum wage". A blank craft whose W1 rate is above the user's rates (it
then drives the foreman) prompts "Add your [craft] rate" on the review step. **Migration:** none. **Risks:** none on
prices; the flags must not block Calculate.

### W3 Prevailing: every craft to its own WD classification

**Change.** `wd/mapping.py` maps each app craft to its own classification group: operators by machine (dozer,
grader/blade, loader, roller, excavator, backhoe, scraper, crane…), trucks by type (dump, water, lowboy…), laborers
by group (general, grade setter, pipelayer, asphalt…). The app's operator and truck crafts gain those subtypes in the
crew library (a crew's operator is named by its machine, which `for_equipment` already carries). Burdened = WD base +
fringe through the engine (plan fringe untaxed), not below commercial `hourly_rate` × (1 + F). Paycheck (base + cash
fringe) ≥ max(WD base + fringe, commercial `base_or_wage_benefits` × (1 + F)); the paycheck base never drops below
the WD base. A WD line under the state minimum wage is flagged and priced at the floor.

**Data:** the WD (uploaded, or SAM.gov API by WD number: `sam.gov/api/prod/wdol/v1/wd/{WD}/{mod}`, which the plan's
research used). **Migration:** crew library subtypes (release), `workspace_wd_mapping` gains a group column.
**Risks:** a saved WD mapping per workspace re-resolves; remembered choices are kept.

**Mohave County AZ, Highway WD AZ20260046 mod 1 (F = −19.587 %).** Engine burden on base: FICA/Medicare 7.65 %,
FUTA 0.6 %, AZ SUTA 2.0 %, national WC (laborer 14.50 %, operator and truck 8.49 %, carpenter 5.04 %, plumber
5.74 %, painter 7.17 %), GL 3 %; fringe untaxed.

| Craft | WD classification | WD base + fringe | Today | WD burdened | Commercial × (1+F) | New | Rule won |
|---|---|---|---|---|---|---|---|
| Laborer | Laborer group 1 | 22.35 + 0.60 | 41.28 | 29.15 | 41.28 | **41.28** | Raised to minimum (commercial × (1+F)) |
| Excavator operator | Excavator | 31.27 + 6.90 | 55.08 | 44.97 | 55.08 | **55.08** | Raised to minimum |
| Dozer operator | Bulldozer | 35.56 + 18.12 | 55.08 | 61.41 | 55.08 | **61.41** | WD |
| Motor grader operator | Motor grader/blade | 36.64 + 18.12 | 55.08 | 62.73 | 55.08 | **62.73** | WD |
| Dump truck driver | Dump truck | 25.78 + 0.69 | 46.60 | 32.07 | 46.60 | **46.60** | Raised to minimum |
| Carpenter | Carpenter (non-formwork) | 35.89 + 14.98 | ≈57.43 | 57.43 | 52.80 | **57.43** | WD |
| Plumber | not listed: conformed to Laborer: Pipelayer (W4) | 30.88 + 9.26 | 60.66 | 46.00 | 60.66 | **60.66** | Raised to minimum |
| Painter | Painter: pavement marking only (W4: conformed) | 24.60 + 6.34 | 51.01 | 35.96 | 51.01 | **51.01** | Raised to minimum |
| Foreman | not listed (W7) | — | 60.59 | — | — | **69.00** | Crew top (grader) × 1.10; BLS 47-1011 Lake Havasu p75 47.32 |

Today every operator prices at 55.08 off the excavator line: the dozer and grader operators come out under their
own WD lines (61.41, 62.73), which is the "16 crafts below the WD" finding. The new mapping fixes those; the floor
(commercial × (1+F)) still decides most lines here, because Mohave's commercial national figures stay above its WD
even after −19.6 %. On the Heavy WD (AZ20260058) the excavator is 36.64 + 18.12 and the general laborer 27.41 + 9.26,
so more lines are WD-won there. Paycheck check, dozer: base 35.56 + fringe 18.12 = 53.68 ≥ max(53.68, 49.51 ×
0.80413 = 39.81): the WD wins.

### W4 Crafts missing from the WD

**Change.** Conformed to the closest listed classification at 1.0×, labelled "Conformed to [classification]", the
user can change the match (the mapping table's choice, remembered per workspace). The closest is found by a fixed
craft → candidate list (plumber → pipelayer, then laborer group 1; painter → painter of any scope, then laborer),
never by text similarity alone. Replaces R-02's median index. **Migration:** none. **Risks:** a conformance is a
compliance call: the label and "Review lines" make it visible (W10).

### W5 Union

**Change.** A union agreement entity (per workspace: name, local, effective dates, craft → base, fringe plan, fringe
cash); uploaded as CSV or entered by hand. Crafts it lacks use commercial × (1 + F). **Migration:** new table.
**Risks:** today's hand-typed union rows migrate into an agreement named "Entered rates".

### W6 Prevailing or union with nothing loaded

**Change.** Commercial × (1 + F), banner "No wage determination loaded. Rates are location-adjusted commercial.
Upload the WD before you bid." and "No WD loaded" on the status strip (union: "No union agreement loaded").
**Migration:** none.

### W7 Foreman

**Change.** A WD foreman line wins; else the higher of BLS 47-1011 (first-line supervisors), escalated, through the
engine, and the crew's top craft × (1 + premium). Shown in both tables above. **Data:** OEWS 47-1011 (W9).

### W8 Workers' comp by state and class

**Change.** `ref_wc_rate` gains `state_code` and the NCCI class (6217 excavation, 5403 carpentry, 5183 plumbing,
5474 painting, 7219 trucking, 5606 supervisors, 5022/5213 as needed), sourced and graded (A filing, B secondary);
Arizona and Texas first; the national set stays as the labelled fallback ("National workers' comp, no state rate
loaded"). The figure is a loss cost × a loss cost multiplier (LCM), the LCM a workspace setting (default from the
state's filing guidance). **Data:** the states' 2026 loss cost filings (TX TDI Commissioner's Bulletin B-0001-26,
effective 2026-07-01, average −3.8 %; AZ NCCI filing effective 2026-01-01, average −6.7 %). **Blocked for now:**
neither site served the class tables (Q-W6). **Migration:** schema + data. **Risks:** WC moves every burdened rate
a few points; the breakdown shows its source.

### W9 Data: OEWS loader, SOC map, refresh, source line

**Change.**
- `refdata.ref_oews` (survey month, area type metro/nonmetro/state/national, area code, SOC, mean, median, p75),
  loaded from the OEWS "All data" file, or the BLS API per series when the file is not dropped in.
- `refdata.ref_craft_soc`: each app craft (and W3's subtypes) → SOC (laborer 47-2061, operator 47-2073 or 47-2071 for
  paving/roller, truck 53-3032, carpenter 47-2031, plumber 47-2152, painter 47-2141, foreman 47-1011, …).
- ZIP → metro (CBSA) crosswalk for the metro → state → national fallback (`ref_zip_county` + a county → CBSA table).
- `refdata.ref_eci` (quarter, index) and `refdata.ref_state_min_wage` (state, effective date, rate, source).
- A yearly refresh task (Celery beat, the founder's call to schedule) that loads the new OEWS and the quarterly ECI.
- Every rate's breakdown ends with a source/date line: "OEWS May 2025, Houston metro, 75th percentile; escalated
  +4.72 % by ECI construction W&S to 2026-11-06".
- bls.gov blocked the HTML pages; the API worked for the plan's figures. If the bulk "All data" file is blocked too,
  the founder drops it into `test-data-local/` (his offer) and the loader reads it from there.

**Migration:** schema + data. **Risks:** the API is rate-limited (no key: 25 queries/day); the bulk file is the
production path.

### W10 UI: one wage basis

**Change** (`WageBasis.tsx`, `WageReview.tsx`, `WageStatusStrip.tsx`, `WageData.tsx`):
- The two basis cards become a "Location-adjusted rates · Always on" bar, then "Refine with your wage data
  (optional)" with three cards: **Wage determination** (SAM.gov: upload PDF, paste link or WD number, enter by hand;
  loaded: listed / conformed / not covered counts, Review lines, Replace, Remove), **Union agreement** (upload, enter
  rates), **Your pay rates** (enter, import CSV).
- Calculate reads "Calculate with location-adjusted rates" when nothing is loaded.
- The rate table gains a Source column (WD · Conformed to X · Union agreement · Your rate · Location-adjusted ·
  Raised to minimum · Foreman rule), filter chips with counts, and the W2/W3 flags.
- The status strip names the sources ("Location-adjusted + SAM.gov WD AZ20260046 mod 1").
- Foreman premium and overtime cards unchanged.

**Migration:** none. **Risks:** the wage page is used on every project: the smoke covers each card's empty,
loaded and error states.

### W11 Migration of saved sets

**Change.** Saved wage sets keep their stored rates; "Update rates" applies the new rules with a before/after per
craft, never silently. "Location-Adjusted Rates" sets open as they are; "My wage data" sets open as
location-adjusted + their data. Any change to the founder workspace's data is listed before it runs; Benchmark A's
source, Real bid B and every real bid are never touched (D-1023, D-1025). **Migration:** a `basis` column mapped
from today's two values.

### W12 Escalation, no flat uplifts

**Change.** Every wage source is escalated with ECI construction wages and salaries from its own effective date to
the bid date (National Estimator from 2026-01-01; OEWS from its survey month; a WD is not escalated, it is the law
on its date). Between published quarters the index is interpolated; past the latest quarter it is carried at the
latest 12-month change. Optional per-project "Escalate labor to construction midpoint" (months to midpoint, %/yr,
default off). The breakdown shows the % and both dates. No flat % on any table.

Today's figures: Dec 2025 → 2026-11-06 = +2.61 %; May 2025 → 2026-11-06 = +4.72 %.

---

## Benchmark A, labor before and after

Labor only, same crews and hours, the copy's own lines (the figures are in `test-data-local/wage/calc-out.txt`):

| Option | Labor change |
|---|---|
| (a) residential × (1+F) floor | **−23.7 %** |
| (b) residential × (1 + min(0, F)) floor (recommended) | **−34.4 %** |

The earlier estimate (−45 % to −55 %, PRICING_FIX_PLAN item 4) assumed an open-shop market base of $20-24; the
founder's W1 keeps the residential table as a floor, so the drop is smaller. The haul trucks' drivers are not in the
copy's labor crews (they price with the trucks' equipment lines), so they are outside this figure.

## Questions (with my recommended answer)

- **Q-W1:** W1 option (a) or (b)? *Recommend (b)* (above).
- **Q-W2:** OEWS percentile for public open-shop work (not prevailing)? *Recommend* the 75th, as commercial.
- **Q-W3:** W3's operator and truck subtypes: a fixed list of 12 operator and 5 truck kinds, or every WD group
  found? *Recommend* the fixed list, each WD group mapped onto it (unmapped ones listed under "not covered").
- **Q-W4:** W4 conformance list: do you want a plumber on a heavy/highway WD to conform to Pipelayer (my list) or to
  stay "not covered" and price at commercial × (1+F)? *Recommend* Pipelayer, labelled, so the user sees it.
- **Q-W5:** escalation past the latest ECI quarter: the latest 12-month change, or the 4-quarter average?
  *Recommend* the latest 12-month change (3.0 %), shown.
- **Q-W6:** WC filings: will you drop the TX and AZ 2026 loss cost tables into `test-data-local/`, or should W8 ship
  later with the national fallback labelled? *Recommend* ship W1-W7 first; W8 when the filings are in.
- **Q-W7:** the yearly OEWS refresh: automatic (beat) or a platform-admin button? *Recommend* the button, plus a
  banner when a newer survey exists.

## Build order and paper hours

| Order | Item | Hours |
|---|---|---|
| 1 | W9 data: OEWS, SOC map, CBSA crosswalk, ECI, minimum wage, loader, source line | 10 |
| 2 | W12 escalation (engine, breakdown, midpoint setting) | 5 |
| 3 | W1 open shop on the residential table, OEWS and floors | 8 |
| 4 | W7 foreman rule | 3 |
| 5 | W3 prevailing per-classification mapping, crew subtypes, paycheck check | 10 |
| 6 | W4 conformance | 4 |
| 7 | W6 nothing-loaded banner | 2 |
| 8 | W2 your-rate flags and prompt | 4 |
| 9 | W5 union agreements | 6 |
| 10 | W10 UI (bar, three cards, Source column, chips, strip) | 16 |
| 11 | W11 saved-set migration and Update rates | 4 |
| 12 | W8 workers' comp by state (when the filings are in) | 6 |
| | Proofs: the worked tables as quantity-table rows, Benchmark A before/after, release run | 6 |
| | **Total** | **84** |

Each item: decision first, gates, quantity-table rows for the Harris and Mohave tables above, a smoke on a copy,
push umer-dev.

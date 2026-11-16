# Equipment library improvements: the plan (no code)

**Status:** plan written 2026-11-15 (the founder's planning brief, Plan B), research and writing only. **Revised
2026-11-15** (unattended run brief, step 2, `intelcost-infra/morning-report-2026-11-17/BRIEF.md`): the library stays
national; Houston quotes source a location factor instead of library rates; B9 dropped (Q22's cheaper-of-two replaces
it); mob, sales tax and the damage waiver re-specified. No D-number yet: main logs one when the founder adopts it.
Original brief: `intelcost-infra/morning-report-2026-11-16/plans/BRIEF-PLANS.md`. Companion:
[dewatering_weather_tasks.md](dewatering_weather_tasks.md) (Plan A, now split into A-lean and A-later). §10 ranks
every item of both plans and gives the build order across nights; the summary for the founder is
`intelcost-infra/morning-report-2026-11-17/plans/PLAN-REVISION.md`.

**Mock-up:** [equipment-library-mockup.svg](../../intelcost-infra/morning-report-2026-11-16/plans/equipment-library-mockup.svg)
(a class row with its rate date and staleness, the rental extras and the tax line). A PNG sits beside it. Quote
sheets: [houston-quote-sheet.csv](../../intelcost-infra/morning-report-2026-11-16/plans/houston-quote-sheet.csv)
(the first draft) and, replacing it,
[quote-sheet-metros.csv](../../intelcost-infra/morning-report-2026-11-17/plans/quote-sheet-metros.csv) (Houston and four
other metros, long format). None is in git (D-1259).

![Equipment library: rate date, extras and tax](../../intelcost-infra/morning-report-2026-11-16/plans/equipment-library-mockup.svg)

**Confidence grades:** as Plan A: A read in the rule or dataset itself; B two sources agree or the primary seen in
part; C one secondary source or common practice; D IntelCost's assumption; E derived from other library figures;
F a gap (quote needed, no number carried).

**Where the money is (recent tabs, D-1273/D-1274):** our direct $8.04 M, equipment ≈ 13 % of it (≈ $1.05 M).
Healthy direct is the median ÷ 1.275; we sit at k 0.997 to the medians. Equipment's evidenced excess is the storm
spread's sizing (D-1279 Q6: $618.8 k as built against $441 k with the tier's 20 t and plate, over the 16 storm
spreads); the founder's Q22 (per-band excavators, then the cheaper-of-two finished in this run's step 1) is the answer
to it, so this plan no longer carries a sizing task. **Every item left in this plan is a correctness item that makes us
dearer, except the location factor, whose sign is unknown until the quotes come back**; §10 says which way each moves k.

**What changed in this revision**

| Item | Before | Now |
|---|---|---|
| Houston quotes (B1) | loaded as library rates and region rows (the median of the dealers per class) | **never library rates or region rows**: they derive and source the Houston **equipment location factor** (§1.4); the library stays the national average |
| Quote sheet | Houston only, five named dealers | Houston plus Atlanta, Chicago, Phoenix, Philadelphia; sources by type (rental dealer branches; heavy-haul carriers); `quote-sheet-metros.csv` |
| Mob (B4) | a `eq_transport_region` table of Houston hauler rows | national transport defaults × the location factor, and a local-flat / line-haul rule with a 50 mi cut-over (§4); no region table |
| B9 spread sizing | 10 h and its planning estimate | **dropped**, with its estimate, from every table; Q22's cheaper-of-two replaces it (its measured effect: +$3.6 k on the 16 storm spreads before the cheaper-of-two) |
| Sales tax (B2) | one Texas switch, not off on exempt jobs | a **state table**, Texas first; on unless the state's own rule exempts the job type; never switched off by the project's exempt checkbox (§2) |
| Damage waiver (B3) | default 0 % with own insurance, else 12 % | **company setting, default 12 %**, an "Own insurance" option at 0 % (§3) |
| Kept as written | | B3 (extras), B5 (shoring), B6 (diesel), B7 (rate dates), B8 (standby, ratios, owned), B10 (proof) |

**Headline findings**

1. **No rate in the library comes from a Texas rental dealer.** 308 of 642 live classes carry a rental rate; their
   sources are dealers in Utah, Ohio, Illinois, Minnesota, Missouri and New England, two state contracts (WA, PA) and
   national guides. The only Texas source (a North Texas crane sheet) covers 14 crane classes. The equipment location
   factor is 1.00 unless a wage set gives one (`cost.ts:locationFactor`). That factor, sourced from quotes, is now the
   Houston lever (§1.4), not new library rates.
2. **The unrated classes are not what our crews use.** 334 classes have no rental rate (215 have no rate at all), but
   only **6** of the classes the crews and tiers use lack a rental rate, and each has an owned (EP or FEMA) rate. The
   ≈ 20 classes the pipe crews and the sizing use are the ones to quote first; they also make the factor's basket.
3. **Texas taxes equipment rental to the contractor even on exempt (MUD) jobs, and we never charge it.** Rule 3.294,
   re-read for this revision: a rental without an operator is taxable, damage waivers are taxable ((d)(2)), the
   lessor's transportation charges are taxable ((d)(3)); (e)(1): the contractor renting for new nonresidential, or for
   residential construction, repair or remodeling, "owe[s] tax to the equipment rental company". The rule has no
   exempt-entity exception. Today the Bid summary taxes Material only by default (`bidSummary.ts:taxTicksOf`), and the
   harness runs at 0 % (D-1273). At Houston's 8.25 % on the taxable rental, ≈ **+$65 k** on the recent tabs.
4. **Rate dates are free text** (`eq_class.rent_date`: "2025-2026", "mixed: 3/2023-3/2024, Mar 2026", 22 forms), so
   nothing can say "stale". 262 of the 308 rated classes rest on at least one source older than 12 months.
5. **Live diesel is already built** (D-940: `worker/tasks/fuel.py:refresh_fuel_prices`, Tuesdays 04:00 UTC, the EIA key
   in `.env.ai`). Two gaps: a missed run is never made up, and the library's `fuel_price_diesel_suggested` is a static
   $6.276 (US average, Oct 19), not the weekly table.
6. **Slide rail, hydraulic shores and sheet pile have no rate; plates are rated but never placed.**
7. **Standby, wear parts and rain days are not modelled.** `standby_rule` is text on every class and nothing reads it.
8. **Owned (FEMA) and rented are not consistent.** FEMA 2025's 20–25 t excavator is $97.76/h without fuel, $782 an
   8 h day, against $397.50 a day at the library's 4-week rent.
9. **The engine's crew day is 8 h, the library's production basis 10 h, and the two are converted, not mixed, on every
   priced path** (the basis check, `PLAN-REVISION.md` §4). Four side paths read a fixed 8 h or 10 h; none changes a
   price on an 8 h project, which every bench estimate and the harness are. **D-1285 (Q19, the founder, 2026-11-15):**
   (a) the pool (`production.py:_job_pool`, `_leftover`, the storm bands' machine hours) and (d) the lost-tier fallback
   in `sync_site` now read the project's day and the tier file's basis; (f) labour overtime follows a spread's own
   hours a day (`overtime.ts:overtimeBySpread`); migration d1285c4a9e10 moved the 17 older company copies fixed at
   10 h to the 10 h basis. (b) `_separate_sub_hint` and (c) `note_fusion` are words only and stay as they are.
   **TxDOT 0-4416-1's crew day (Q18, the founder: keep it):** the storm, sanitary and pressure crews built on the study
   take its crew day as **8 h** (× 1.25 to the 10 h basis), **graded C**. The record disagrees on why: D-1091 calls it "a
   standard crew day of 8 h", D-1275 says the 8 h day is "not stated in the study". Both readings give the same
   figures; the grade C stands for the doubt. If the study's day was 10 h, those crews are 25 % fast and storm L + E is
   too cheap by `kinds-report.mjs` K3's figure.

---

## 1. Coverage, the quote sheet and the location factor

### 1.1 Today (bench `eqlib`, read only, 2026-11-15)

| Category | Live classes | No rental rate | No rate at all (no owned either) | Used by a crew or tier | Used and no rental rate |
|---|---:|---:|---:|---:|---:|
| Earthwork | 98 | 48 | 24 | 23 | 1 (`SC-631-34`) |
| Paving | 58 | 37 | 29 | 11 | 3 (`PV-STABILIZER-WR2400`, `PV-DIST-2000`, `PV-STRIPE-8440`) |
| Utilities & trenching | 49 | 33 | 32 | 2 | 0 |
| Lifting & material handling | 58 | 24 | 15 | 0 | 0 |
| Air & power | 49 | 24 | 4 | 1 | 0 |
| Trucks & vehicles | 24 | 23 | 5 | 1 | 0 |
| Hauling | 39 | 22 | 17 | 5 | 0 |
| Land clearing & forestry | 21 | 18 | 13 | 3 | 1 (`LC-GRIND-8621`) |
| Site & temporary facilities | 29 | 17 | 17 | 1 | 0 |
| Pumps & dewatering | 23 | 16 | 6 | 0 | 0 |
| Foundations & piling | 19 | 16 | 16 | 2 | 0 |
| Aerial work platforms | 68 | 15 | 10 | 0 | 0 |
| Concrete | 31 | 11 | 5 | 4 | 1 (`CN-CURB-MACHINE`) |
| Demolition & attachments | 32 | 10 | 10 | 6 | 0 |
| Compaction | 21 | 9 | 1 | 6 | 0 |
| Trailers | 8 | 8 | 8 | 0 | 0 |
| Traffic control | 2 | 2 | 2 | 0 | 0 |
| Pipe | 13 | 1 | 1 | 0 | 0 |
| **Total** | **642** | **334** | **215** | **66** | **6** |

"Used" = in `eqlib.ew_tier_machine` (475 rows, 102 activities) or the pipe kits (`seed/d1091_pipe_kits.json`,
`d1105_pressure_kits.json`) or named by the sizing code (`production.py:sized_excavator`, `sized_compactor`,
`pit_class`, `BOX_FT`/stackers).

**Rate sources of the 308 rated classes** (count of classes citing each): W25 Utah dealer 148, COSTARS (PA, 2023–24)
51, C25 Ohio 49, B25 Illinois 47, N25 Missouri 42, A26 New England 35, R25 Minnesota 32, national guides 40-odd, WA
DES contract 9, North Texas Crane 14. **Houston dealers: 0.**

**Ratios over the 276 classes with all three rates (A, computed):** week ÷ day median 2.90, 4-week ÷ week median 2.73.
The derivation settings are `rent_week_per_day` 3.0 and `rent_4wk_per_week` 2.9 (bench `eqlib.eq_setting`, read).

### 1.2 The quote order (unchanged in content; now the factor's basket)

| Tier | What | Classes | Why |
|---|---|---|---|
| 1 | Pipe crews, the pool and the sizing | `EX-CRAWL-13T/20T/30T/40T/50T`, `BH-STD-14FT`, `WL-COMPACT-1Y/2Y`, `SS-WHEEL-LARGE`, `CP-PLATE-REV`, `CP-TRENCH-ROLLER`, `TRK-PU-8808`, `TB-STL-8x20/8x24`, `TB-STACK-4x24`, `TB-MH-8x8`, `PLATE-8x20` (17 rated) + `SHORE-SLIDERAIL`, `SHORE-HYD` (no national rate) | Every utility line on the tabs prices through them |
| 2 | Earthwork tiers by use | `CP-SD-84-SM`, `WT-4000`, `DZ-CRAWL-D5/D6`, `GR-12FT-140`, `ADT-30T`, `WL-SMALL-3Y`, `AT-GPS-DOZER` (8) | The most-used components on the bench |
| 3 | Dewatering (Plan A) | `PMP-TRASH-3`, `PMP-SP-4D/6D`, and the new wellpoint, header, swing joint, jetting, frac tank and hose keys (11) | None has a dealer rate in Texas; the new keys none anywhere |
| 4 | Crew-used, owned rate only | `PV-STABILIZER-WR2400`, `LC-GRIND-8621`, `SC-631-34`, `CN-CURB-MACHINE`, `PV-DIST-2000`, `PV-STRIPE-8440` (6) | Priced at EP / FEMA today (D-811) |

Only the **25 tier 1–2 classes that carry a national rate** enter the factor (a ratio needs both sides). The classes
with no national rate (the two shoring rows, tier 3's new keys, tier 4) are quoted for Plan A and B5, and their
national rows are filled from the **median of all five metros' quotes** (a national figure, never a Houston one), so
the library stays national.

### 1.3 The quote sheet (`quote-sheet-metros.csv`)

Long format, one row per class and metro: 48 rows (44 classes, four hauler rows) × 5 metros = **240 rows**, 37
columns. Per row: the library's national day / week / 4-week, its source and date, then **three quote groups**
(source type, day, week, 4-week, quote date, branch ZIP), and the extras the source states (damage waiver %,
environmental fee % and cap, delivery one way within 50 mi, pickup, line haul $/loaded mile beyond 50 mi, the rental
tax % on the invoice). No price is filled: every quote cell is blank until the estimator's calls.

| Metro | CBSA | State | Market it stands for | Sources to call (by type) |
|---|---|---|---|---|
| Houston TX | 26420 | TX | the base metro, Gulf Coast | the five dealers named in the founder's brief (national chains, the OEM brand dealer, a regional chain); the sheet lists them by type |
| Atlanta GA | 12060 | GA | southeast | two national-chain rental branches; the OEM brand dealer's rental fleet or a regional independent |
| Chicago IL | 16980 | IL | midwest, union market | as Atlanta |
| Phoenix AZ | 38060 | AZ | west (the founder's Arizona reference files are in this market) | as Atlanta |
| Philadelphia PA | 37980 | PA | northeast | as Atlanta |
| (haul rows, every metro) | | | | two local heavy-haul carriers; the dealer's own delivery when it quotes one |

**Why four others:** the factor is a ratio to a national figure, and the national figure is itself built from
out-of-state dealers. Quotes from metros in four other markets show whether the library's national rows sit near a
national median (each metro's own factor near 1.00 on average) or carry a regional lean of their own. If the five
metros' factors average away from 1.00 by more than 5 %, the national rows are re-centred (a release with
`release_audit`), and Houston's factor is re-read against them.

**Refresh:** twice a year (January, July) for tiers 1–2 in every metro; tier 3–4 on use. Quotes stay outside git like
the bid tabs (dealer prices are the founder's); only the factors, their grades and counts go into a release.

### 1.4 The equipment location factor (new)

**Basis.** For each class c in the basket (§1.2) with at least one quote in metro m:

- H(m,c) = the **median** of metro m's quotes for c, on the **4-week** rate (the period our spreads bill most). A
  quote with week only: week × 2.73; day only: day × 2.90 × 2.73 (the library's medians, §1.1; E), marked derived.
- N(c) = the library's national 4-week rate for c (`eq_class.rent_4wk`).
- r(m,c) = H(m,c) ÷ N(c).

**Factor:** F(m) = the **median of r(m,c)** over the basket's quoted classes: "median Houston ÷ median national, same
classes" read class by class, so a dear class does not stand in for a cheap one. The **ratio of the sums**, Σ H ÷ Σ N
over the same classes, is reported beside it as a check; when the two differ by more than 0.05 the factor is held
(grade D) and the spread shown (question 1). Day and week factors are worked the same way and shown; the 4-week
factor is the one applied.

**Grading** (each class by its count of quotes, the factor by its basket):

| Class grade | Quotes for that class in that metro |
|---|---|
| A | 3 or more |
| B | 2 |
| C | 1 |

| Factor grade | Basket |
|---|---|
| A | ≥ 15 of the 25 classes quoted, each at A or B, at least 10 at A |
| B | ≥ 10 classes at A or B |
| C | ≥ 5 classes at any grade |
| D | fewer than 5 classes: **not applied**; the factor stays 1.00 and says "Houston factor: 3 classes quoted, not enough" |

A quote older than 12 months drops out (§7); a factor is recomputed at each refresh.

**Where it applies.** `eq_location_factor` (metro CBSA, factor, day / week / 4-week factors, classes, grade, quote
count, as-of, source ids `Q-<metro>-<YYYYMM>`), one migration. `cost.ts:locationFactor` reads, in order: the wage
set's `equipment_amf` (as today, when the project has a saved set), else the project's metro factor at grade C or
better (the project ZIP → CBSA, a seeded ZIP-to-CBSA table for the five metros' states), else 1.00. The factor scales
the rental and the owned rate (as `equipment_amf` does today) and the mob (§4); not fuel (EIA is already regional),
not operated hire (its own rate). The class row shows "National $7,950 × Houston 0.96 (B, 18 classes) = $7,632" (an
illustration of the label; 0.96 is not a quote).

## 2. Sales tax on equipment rental: a state table

### 2.1 The Texas rule (34 TAC §3.294, re-read 2026-11-15, A) [B1]

| § | Rule (quoted) | What it means for us |
|---|---|---|
| (c)(1) | "Receipts from the lease of tangible personal property without an operator are taxable." | Bare rental: taxable |
| (c)(2) | With an operator and a single charge, "presumed to be the performance of a service and no tax may be charged" | Operated hire on one rate: not taxed |
| (c)(3) | Separate charges: the separate charge for the property is taxable | Operated hire billed machine + operator: the machine part taxed |
| (d)(2) | "Damage waiver fees are subject to tax." | Taxed |
| (d)(3) | "All transportation charges billed by the lessor to the lessee related to the leased property are taxable." "Charges for transportation billed directly to the lessee by third-party carriers are not taxable." | Dealer delivery/pickup: taxed. Our own or a hauler's lowboy: not taxed |
| (e)(1) | Renters of equipment for new nonresidential construction, or for residential construction, repair or remodeling, "owe tax to the equipment rental company"; tax may not be collected from their customers on a separately stated charge | The tax is **our cost**, inside the unit prices |
| (e)(2) | Renters for repair or remodel of nonresidential real property also owe it, and tax "must also be collected from their customers on the total charge for the job" | Same cost to us; the job's own sales tax is a separate matter (question 3) |
| — | No paragraph addresses an exempt-entity job | **No exemption for a MUD, city or county job**: the exempt checkbox (which relieves incorporated materials under the contractor rule, 34 TAC §3.291, not re-read here, B) does not touch rentals |

Owned machines: no tax on the hourly cost (B). Fuel: motor fuels tax already in the EIA price (C). Rate: the project's
city rate (D-1139: Houston 8.25 %), else state + average local (A).

### 2.2 The table

`eq_rental_tax_state` (a release table, one migration): state, `taxes_rentals`, `operated_single_charge_exempt`,
`waiver_taxable`, `lessor_delivery_taxable`, `third_party_haul_taxable`, `exempt_job_types` (the job types the
**state's own rule** relieves; empty for Texas), the rule cited, its URL, read-on date, grade.

| State | Taxes bare rental | Waiver | Lessor delivery | Exempt job types | Source | Grade |
|---|---|---|---|---|---|---|
| **TX** | yes | taxable | taxable (third-party haul not) | **none** | 34 TAC §3.294 (c)–(e) | **A** |
| GA | to read | to read | to read | to read | Georgia Department of Revenue rental rules | F |
| IL | to read (the state's lease treatment differs from a sale; Chicago has a lease transaction tax of its own) | to read | to read | to read | Illinois Department of Revenue; City of Chicago | F (the note is C) |
| AZ | to read (transaction privilege tax, personal property rental classification) | to read | to read | to read | Arizona Department of Revenue | F (the note is C) |
| PA | to read | to read | to read | to read | Pennsylvania Department of Revenue | F |

A state at F charges nothing and says "Rental tax rule for GA not loaded: 0 %" in Needs attention, never a silent 0.

### 2.3 How it is charged

- Each machine's cost carries a **taxable part**: rental periods + damage waiver + environmental fee + the dealer's
  delivery and pickup; not fuel, not owned hours, not a single-charge operated rate, not a third-party haul
  (`cost.ts:machineCost` returns `taxable`; the spread sums it).
- A Bid summary row **"Sales tax on equipment rental"** at the project's rate, **on whenever the project's state taxes
  rentals**, off only when the project's job type is in that state's `exempt_job_types`. The project's `taxExempt`
  checkbox does **not** switch it off (Texas: no such rule). Material keeps its own row and exemption.
- The harness overlay gains `equipmentRentalTaxPct: 8.25` (an input).

## 3. Rental extras

| Extra | Typical | Source, grade | How to apply |
|---|---|---|---|
| Damage waiver | 10–14 % of rent (industry); 15 % on one dealer's plan | [B2] C; dealer plans exist, no % published | **Company setting `damage_waiver_pct`, default 12 %** (the range's middle, D), on the rental periods only; an **"Own insurance (0 %)"** choice beside it for a company that insures rented equipment itself; taxable where the state taxes waivers (TX: yes) |
| Environmental fee | ≈ 1.3 % of rent, capped ($75 reported) | C [B3][B4] | `env_fee_pct` 1.3 %, `env_fee_cap` $75 per contract line (D until quotes); taxable |
| Fuel refill by the dealer | dealer's $/gal premium | quotes (F) | Off by default (crews fuel) |
| Cleaning | flat per machine when returned dirty | quotes (F) | `cleaning_fee` per earthmoving machine in clay (D) |
| Delivery minimum | the transport class's `min_typ` | library B | §4 |

## 4. Mob: national defaults × the location factor, local flat or line haul

- **Today:** one way = max(min, $/loaded mile × miles) + permits + escorts + handling (`mob.ts:haul`), miles =
  `mob_distance_mi` 50, demob = one way × 1.0. Lowboy legal: max($550, $4.75 × 50) = $550 each way. Tilt trailer
  $500, flatbed $400, pickup-towed $200 (`eq_transport_class`, B, national guides). Houston evidence: national guides put
  local legal lowboy moves at $300–800 flat (C) [B5]; no Houston hauler publishes a rate (F).
- **Proposal (no region rows):**
  1. **Scale:** every transport figure (local flat, $/mi, permits, escorts) × the project's equipment location
     factor F (§1.4; 1.00 until graded C or better).
  2. **Cut-over:** `local_radius_mi`, default **50 mi one way** (the library's `mob_distance_mi` and the dealers'
     usual delivery zone, D).
  3. **Local (miles ≤ 50):** one way = the class's **local flat** (`min_typ`) × F, no per-mile part, no permit for a
     legal load.
  4. **Line haul (miles > 50):** one way = max(local flat, $/loaded mile × miles) × F + permits and escorts for a
     permitted load. The line haul is never cheaper than the local flat.
  5. **Dealer delivery wins** when the machine is rented with the dealer's delivery (it is then taxable, §2).
  6. The hauler rows of the quote sheet check the scaled defaults: if Houston's quoted local flats differ from
     `min_typ` × F by more than 15 % on two of the four transport classes, a separate transport factor is proposed
     (question 4); until then one factor serves both.

## 5. Shoring beyond trench boxes (kept, B5)

| System | In the library | In the engine today | Add | When the engine picks it |
|---|---|---|---|---|
| Steel boxes and stackers | `TB-STL-*`, `TB-STACK-*`, `TB-MH-*`, `TB-ALU-*` (W25/B25, B) | `protection.ts:protectionAt`; stackers to 20 ft (D-1144) | quotes (tier 1) feed the factor | As today |
| Slide rail | `SHORE-SLIDERAIL` (D, no rate) | D-1128: no box fits, to 24 ft, priced as the box line | Rates per bay (the five metros' median, F until quoted); bays open = ⌈open length ÷ bay length⌉ + 1 | No box wide enough; depth 20–24 ft; existing utilities crossing (a run tick); a structure within 1:1 of the bottom (a run tick) |
| Hydraulic shores | `SHORE-HYD` (D) | not picked | Rates (F); OSHA Subpart P App. D spacing | Narrow trenches (≤ 4 ft) in cohesive soil above water, ≤ 15 ft; manhole braces |
| Arch spreaders | `SHORE-ARCH` (D) | not picked | Rates (F) | With slide rail at wide pipe |
| Sheet pile | none | not picked | A subcontract line by hand (F) | Deeper than 24 ft, or below water in granular soil with no groundwater method |
| Road plates | `PLATE-5x10/8x12/8x20` (W25, B) | never placed | A plate rule | Urban runs and night traffic: plates = ⌈night-open length ÷ 20⌉ (default 40 ft), 8 × 20 when the top ≤ 6 ft wide |

## 6. Live diesel through the existing EIA key (kept, B6)

- Built (D-940): `worker/tasks/fuel.py`, EIA v2 weekly into `eqlib.eq_fuel_weekly`; Houston reads **Gulf Coast
  (PADD 3)**; off-road = on-highway less 24.4 ¢ federal and 20.0 ¢ Texas. Today: PADD 3 $5.912 → off-road **$5.468**.
- Add: catch-up on worker start and daily when the newest week is > 8 days old; an amber flag past 10 days; the
  suggested price from the weekly table; the release snapshot as the last fallback. Key `EIA_API_KEY` already in
  `intelcost-infra/.env.ai`; no new key.
- **Built 2026-11-16 (D-1286, night run step 2; founder to confirm).** `features/equipment/fuel.py`: `week_age`,
  `needs_catch_up` (> 8 days or no week), `is_stale` (> 10), `fuel_status`, `snapshot_diesel` (eq_setting
  `fuel_price_diesel_suggested`, its week from the note), `suggested_diesel` (the series for the state: state, else PADD,
  else US; off-road by `off_road`; else the snapshot, always flagged); `project_fuel` adds each week's age and flag.
  `worker/tasks/fuel.py:catch_up_fuel_prices`, sent on a worker's start by the worker serving the default queue only
  (`catch_up_on_start`), and daily at 05:10 UTC from beat (`celery_app.py`). The bundle carries `fuel_status`,
  `suggested_diesel`, `fuel_state`. Equipment Settings (off-road diesel) and Settings › Equipment library show the
  suggestion with "Use $x" (by hand) and the amber "n days old"; Needs attention names a stale diesel week once. On the
  bench the first catch-up (2026-11-16 01:36 UTC) took the table from the week of Nov 2 (14 days) to Nov 9.

## 7. Rate dates and staleness (kept, B7)

- `eq_class.rent_as_of date` (and `owned_as_of`), one migration parsing today's text (a range → its end; a year → its
  source's edition date; "mixed" → the oldest; every parse listed for review before it runs).
- Amber past 12 months, red past 24, on the class, the picker and the estimate line; Needs attention lists them once.
- Quotes carry their date; a quote older than 12 months leaves the location factor's basket (§1.4).
- **Built 2026-11-16 (D-1286, night run step 2; founder to confirm).** Migration `d1286b7c4f30` (revises d1285c4a9e10):
  the two date columns, the parse in the migration (`parse_rent`, `parse_owned`, the sources' editions in `SOURCE_DATES`;
  no text changed); 25 rental forms and 6 owned forms, every one read (list:
  `intelcost-infra/morning-report-2026-11-18/step2/B7-PARSE-LIST.md`, D-1286). App: `lib/estimate/equipment/rateAge.ts`
  (`rateAge`, `machineBasis`, `classRateAge`, `staleRates`), `RateAgeBadge` on the library grid, the class detail's
  Rental / Owned / Operated, the picker's sizes and picked machine, and each equipment component row of the estimate;
  Needs attention's "Equipment rates over 12 months old (n)", once per class and basis. A rate the company, the
  estimate or the line set has no library date and no badge. **Not built (B1):** quotes carrying their date and leaving
  the location factor's basket; no quote store exists yet.

## 8. Wear parts, standby and rain days, owned vs rented, ratios (kept, B8)

| Item | Today | Proposal | Grade |
|---|---|---|---|
| Wear parts and GET | not priced | per-hour allowance on breakers and rippers from the quotes | C / F |
| Standby, rented | the calendar period solver | Plan A-lean's lost days lengthen the rental | A |
| Standby, owned | none | owned rate (without fuel) × 0.22 on lost days, capped 8 h a day and 40 a week | D |
| Owned vs rented | owned at FEMA 2025 | owned mode reads the company's own rate (My equipment, D-760) first; FEMA labelled | A / D |
| Week/day, 4-week/week | settings 3.0 and 2.9 | the library's medians, 2.90 and 2.73 (E) | E |

## 9. Hand-worked rows (quantity-table candidates)

Common: Houston 8.25 % (D-1139, A); `EX-CRAWL-20T` $1,040 / $2,927 / $7,950, owned $97.76/h without fuel, 2.78 gal/h
(library, A); lowboy legal $4.75/mi, $550 minimum (B); PADD 3 diesel $5.912 (A). **F** = the location factor (1.00
until graded). Rows marked "illustrative" use made-up inputs to show the arithmetic; they are not quotes.

| Row id | Case | Worked | Result |
|---|---|---|---|
| `eq-tax-rental` | 20 t excavator, one 4-week rental, Houston | 7,950 × 0.0825 | tax **$655.88** |
| `eq-tax-exempt-job` | the same on a MUD (exempt-owner) job, TX | `exempt_job_types` empty; the project's checkbox does not apply | tax **$655.88** (not $0) |
| `eq-tax-untabled` | the same in GA before its row is read | GA at F | tax $0 and "Rental tax rule for GA not loaded" |
| `eq-tax-owned` | the same machine owned, 160 h | 160 × 97.76 = 15,641.60; no tax | tax **$0** |
| `eq-tax-delivery` | dealer delivery and pickup $550 + $550 | 1,100 × 0.0825; third-party hauler 0 | **$90.75** / $0 |
| `eq-tax-operated` | operated tri-axle on one hourly rate | §3.294(c)(2) | **$0** |
| `eq-waiver-default` | 12 % default waiver, 4-week rental | waiver 954.00; tax on rent 655.88 + on waiver 78.71 | **$9,638.58** (was $7,950) |
| `eq-waiver-own` | "Own insurance (0 %)" | 7,950 + 655.88 | **$8,605.88** |
| `eq-env-fee` | 1.3 %, cap $75 | 4-week 103.35 → cap **$75**; a 6 in pump week 1,112 × 0.013 = **$14.46** | $75 / $14.46 |
| `eq-locf-class` | illustrative: 20 t quoted at 7,400, 7,700, 8,100 | H = 7,700 (median of 3, A); r = 7,700 ÷ 7,950 | **0.9686** |
| `eq-locf-median` | illustrative: r over 11 classes 0.88, 0.91, 0.93, 0.95, 0.96, 0.97, 0.99, 1.00, 1.02, 1.05, 1.12 | median (6th of 11) | F = **0.97**; 11 classes at A/B → grade **B** |
| `eq-locf-few` | 4 classes quoted | below 5 | **not applied**, F = 1.00, grade D |
| `eq-locf-derived` | illustrative: a class quoted by the week only, $2,000 | 2,000 × 2.73 | 4-week **$5,460** (E) |
| `eq-mob-local` | lowboy legal, 30 mi, F = 1.00 | ≤ 50: 550 × 1.00 each way | **$1,100** a move |
| `eq-mob-local-f` | the same, illustrative F = 0.97 | 550 × 0.97 = 533.50 each way | **$1,067** a move |
| `eq-mob-line` | lowboy legal, 180 mi, F = 1.00 | > 50: max(550, 4.75 × 180 = 855) each way | **$1,710** a move |
| `eq-mob-cutover` | lowboy legal, 60 mi | > 50: max(550, 285) = 550 | **$1,100** (the floor holds past the cut-over) |
| `eq-stale` | as-of and age on 2026-11-15 | Mar 1 2025: 624 days; Oct 1 2026: 45; Mar 14 2024: 976 | stale / fresh / red |
| `eq-diesel-offroad` | Houston off-road diesel | 5.912 − 0.444 | **$5.468**/gal |
| `eq-fuel-cost` | 20 t, 160 h, medium load | 2.78 × 160 × 5.468 | **$2,432.17** |
| `eq-diesel-age` | newest week 2026-11-02 on 2026-11-15 | 13 > 10 | amber; catch-up (> 8) |
| `eq-ratio-derive` | day rate only, $500 | 500 × 2.90 = 1,450; × 2.73 = 3,958.50 | **$1,450** / **$3,958.50** |
| `eq-standby-owned` | owned 20 t, 6.091 rain days (Plan A `rain-june-ew`, revised) | 97.76 × 0.22 = 21.5072/h × 8 × 6.0914 | **$1,048.08** |
| `eq-plates` | urban run, 40 ft open at night, top 3 ft | ⌈40/20⌉ = 2 × PLATE-8x20; 2 × 186 | **$372** a week |
| `eq-stackers` | box to 17 ft (D-1144, check) | ⌈9/4⌉ = 3; 1 + 0.7312 × 3 | box days × **3.19** |

## 10. Ranking (both plans) and build order

### 10.1 By expected effect on the bid-tab gap

Basis: the 10 recent tabs, direct $8.04 M, equipment ≈ $1.05 M, the rented, taxable part ≈ 75 % (≈ $787 k, D).
Positive raises our direct (k to the medians falls from 0.997). B9 (spread sizing) is gone: Q22's cheaper-of-two
carries that design question, measured in its own pass.

| Rank | Item | Plan | Expected $ on recent direct | Δk (≈) | Effort h |
|---:|---|---|---:|---:|---:|
| 1 | Damage waiver, 12 % default | B §3 | **+$94 k** (+$102 k with its tax); $0 with own insurance | −0.012 | 4 |
| 2 | Houston equipment location factor (rentals and mob) | B §1.4, §4 | **±$80 k** (±10 % of the rented part; sign unknown) | ±0.010 | 8 + 4 + quotes |
| 3 | Rain lost days on rented spreads (pipe crews; the overlap rule changes earthwork only) | A-lean | +$67 k | −0.008 | 7 |
| 4 | Sales tax on rentals, 8.25 % | B §2 | +$65 k | −0.008 | 8 |
| 5 | Shoring: slide rail at its rate, plates on urban runs | B §5 | +$0–30 k | ≈ 0 | 12 |
| 6 | Environmental fee | B §3 | +$5 k | ≈ 0 | (in 1) |
| 7 | Diesel catch-up and suggested price | B §6 | ±$5 k | ≈ 0 | 3 |
| 8 | Local flat / line haul cut-over (the tabs are local) | B §4 | ≈ $0 | 0 | (in 2) |
| 9 | Ratios, owned standby, GET | B §8 | ≈ $0 | 0 | 5 |
| 10 | Rate dates and staleness | B §7 | $0 | 0 | 6 |
| 11 | As-directed pay lines | A-lean | $0 (the harness keeps those rows out on both sides) | 0 | 4 |
| 12 | Sump and wellpoint rule and quantities ("Quote needed") | A-lean | $0 | 0 | 9 |
| 13 | NOAA normals, Houston stations seeded | A-lean | $0 (feeds 3) | 0 | 4 |
| 14 | A-later: SDA, geocode, eductors, deep wells, priced wellpoints, Site water panel, harness check | A-later | $0 | 0 | 61 |

Items 1, 3, 4 and 6 together: ≈ **+$239 k** (k ≈ 0.997 → ≈ 0.968). They are real costs every bidder carries. Only the
location factor, if Houston quotes come in under the national rows, moves us toward the healthy band.

### 10.2 Plan B tasks (revised)

| # | Task | Repo | Hours |
|---|---|---|---|
| B1 | Location factor: `quote-sheet-metros.csv` (done in draft), `eq_location_factor` and a ZIP-to-CBSA seed (one migration), the derivation script (per-class medians, the ratio, the median, the ratio-of-sums check, the grades), `cost.ts:locationFactor` reads it, the class row's label; national rows for unrated classes from the five metros' medians | infra, api, app | 8 (+ quotes) |
| B2 | Sales tax: `eq_rental_tax_state` (Texas loaded, A; GA/IL/AZ/PA at F) (migration), project job type, `machineCost` taxable part, the Bid summary row on by state rule (not by the exempt checkbox), Needs attention for an unloaded state, harness config | api, app, infra | 8 |
| B3 | Rental extras: waiver company setting 12 % default with "Own insurance (0 %)", env fee, cleaning, refill; in `machineCost`; shown on the machine | api, app | 4 |
| B4 | Mob: × F on every transport figure, `local_radius_mi` 50, local flat vs line haul, dealer delivery taxable; no region table | app, api | 4 |
| B5 | Shoring (kept) | app, api | 12 |
| B6 | Diesel catch-up, flag, suggested price (kept). **Built 2026-11-16, D-1286** | api, app | 3 |
| B7 | `rent_as_of` (migration with the parse), badges, Needs attention (kept). **Built 2026-11-16, D-1286** (quotes' dates wait for B1) | api, app | 6 |
| B8 | Standby, GET field, ratios, owned mode reads My equipment first (kept) | api, app | 5 |
| ~~B9~~ | ~~Spread sizing per line~~: dropped, Q22's cheaper-of-two replaces it | | 0 |
| B10 | Gates, the §9 rows (25) as `equipment-cases.mjs`, one MCP smoke on a throwaway (a Houston utility job: tax row on an exempt job, 12 % waiver and own insurance, the factor's label, a 60 mi lowboy, stale badge, plates), docs and mirror (kept). B6/B7's rows and smoke done in D-1286 (`eq-stale`, `eq-diesel-offroad`, `eq-diesel-age` as `b7-*` / `b6-*`) | all | 6 |
| | **Total** | | **56 h** (±25 %; B1 waits on the quotes, B5's rules are the likeliest overrun) |

**Plans: A-lean 26 h + A-later 61 h + B 56 h = 143 h (±30 %).** (Was 87 + 64 = 151 h.)

### 10.3 Recommended build order across nights

| Night | Work | Hours | Why then |
|---|---|---:|---|
| 1 | B7 rate dates, B6 diesel; A-lean AL4's pure module and its rows (no visible change); the quote sheet goes out | 16 | No price moves; the quotes take days |
| 2 | B2 sales tax, B3 extras (waiver 12 %), B8; one harness rerun | 17 | The correctness items together, one rerun to show their sum (+≈ $170 k) |
| 3 | A-lean: AL1 normals, AL2 rain into durations, AL3 pay lines, AL4 wiring; rerun | 19 | A-lean done; rain's +$67 k shown on its own rerun |
| 4 | B1 location factor (quotes back), B4 mob × F and the cut-over; rerun | 12 | The one item that may lower us |
| 5 | B5 shoring, B10 rows and smoke | 18 | Rates for slide rail and shores from the quotes |
| 6–9 | A-later (§9 of Plan A), in its own order | 61 | After the wellpoint quotes |

## 11. Risks

1. **Quotes are the critical path** for B1 and every F rate. Without them the factor stays 1.00 (said on screen).
2. **The correctness items make us dearer** (≈ +$239 k). Show them on their own reruns.
3. **A factor hides class detail.** A Houston dealer cheap on excavators and dear on boxes averages out; the per-class
   ratios stay in the release audit so the spread can be seen.
4. **Dealer quotes are the founder's data**: outside git; only factors, counts and grades in a release.
5. **Tax on mixed bills** needs the quote's own lines; **states at F** charge 0 until read (flagged).
6. **Staleness parse**: 22 text forms, every parse listed before the migration runs.

## 12. Questions for the founder

1. **Location factor reading:** the median of per-class ratios (proposed), with the ratio of sums beside it as a check;
   4-week rates; applied at grade C or better (≥ 5 classes). Right reading of "median Houston ÷ median national"?
2. **Damage waiver 12 % default** on rental periods only (not fuel, mob or owned), taxable in Texas, and the harness at
   12 % too?
3. **Texas (e)(2):** on nonresidential repair or remodel jobs the customer is also taxed on the whole job. Out of scope
   for now (the bids are new work), or a job-type rule on the Bid summary later?
4. **Mob:** one factor for machines and hauls, unless Houston's hauler quotes differ from it by more than 15 %?
5. **Metros:** Atlanta, Chicago, Phoenix and Philadelphia for the other four markets, quoted twice a year?
6. **Owned machines:** owned mode requires the company's own rates, FEMA only as a labelled fallback? (kept)
7. **Slide rail triggers:** add the two run ticks? (kept)

## Sources

- [B1] 34 Tex. Admin. Code §3.294, Rental and Lease of Tangible Personal Property (re-read 2026-11-15): https://www.law.cornell.edu/regulations/texas/34-Tex-Admin-Code-SS-3-294
- 34 Tex. Admin. Code §3.291, Contractors (not re-read for this revision): https://www.law.cornell.edu/regulations/texas/34-Tex-Admin-Code-SS-3-291
- [B2] Wynne Systems, The Comprehensive Guide to Ancillary Fees (damage waiver 10–14 %): https://wynnesystems.com/wp-content/uploads/2018/05/The_Comprehensive_Guide_to_Ancillary_Fees.pdf
- [B3] Sunbelt Rentals, environmental fee page: https://sunbeltrentals.com/environmentalfee
- [B4] Herc Rentals, associated charges: https://www.hercrentals.com/services-associated-charges.html
- [B5] OTrucking, lowboy trucking rates: https://otrucking.com/resources/guides/lowboy-trucking-rates/
- EIA open data API v2, petroleum prices: https://www.eia.gov/opendata/
- FHWA MF-121T (state motor fuel excise), as loaded in `diesel_excise.csv` (D-940).
- OSHA 29 CFR 1926 Subpart P, Appendix D: https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926SubpartPAppD
- US Census Bureau, CBSA delineation files (metro codes used in the quote sheet).

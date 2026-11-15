# Equipment library improvements: the plan (no code)

**Status:** plan written 2026-11-15 (the founder's planning brief, Plan B), research and writing only. No D-number yet:
main logs one when the founder adopts it. Brief: `intelcost-infra/morning-report-2026-11-16/plans/BRIEF-PLANS.md`.
Companion: [dewatering_weather_tasks.md](dewatering_weather_tasks.md) (Plan A). §10 ranks every item of both plans
and gives the build order across nights.

**Mock-up:** [equipment-library-mockup.svg](../../intelcost-infra/morning-report-2026-11-16/plans/equipment-library-mockup.svg)
(a class row with its rate date and staleness, the rental extras and the tax line). A PNG sits beside it. The
estimator's quote sheet: [houston-quote-sheet.csv](../../intelcost-infra/morning-report-2026-11-16/plans/houston-quote-sheet.csv).
Neither is in git (D-1259).

![Equipment library: rate date, extras and tax](../../intelcost-infra/morning-report-2026-11-16/plans/equipment-library-mockup.svg)

**Confidence grades:** as Plan A: A read in the rule or dataset itself; B two sources agree or the primary seen in
part; C one secondary source or common practice; D IntelCost's assumption; E derived from other library figures;
F a gap (quote needed, no number carried).

**Where the money is (recent tabs, D-1273/D-1274):** our direct $8.04 M, equipment ≈ 13 % of it (≈ $1.05 M).
Healthy direct is the median ÷ 1.275; we sit at k 0.997 to the medians. Equipment's evidenced excess is the storm
spread's sizing (D-1279 Q6: $618.8 k as built against $441 k with the tier's 20 t and plate, over the 16 storm
spreads). **Most items in this plan are correctness items that make us dearer, not cheaper**; the table in §10 says
which way each one moves k.

**Headline findings**

1. **No rate in the library comes from a Texas rental dealer.** 308 of 642 live classes carry a rental rate; their
   sources are dealers in Utah, Ohio, Illinois, Minnesota, Missouri and New England, two state contracts (WA, PA) and
   national guides. The only Texas source (a North Texas crane sheet) covers 14 crane classes. The equipment location
   factor is 1.00 unless a wage set gives one.
2. **The unrated classes are not what our crews use.** 334 classes have no rental rate (215 have no rate at all), but
   only **6** of the classes the crews and tiers use lack a rental rate, and each has an owned (EP or FEMA) rate. So
   the Houston-first job is to **re-rate the ≈ 20 classes the pipe crews and the sizing use**, then the earthwork
   tiers, then the new dewatering and shoring gear: not to fill the 334.
3. **Texas taxes equipment rental to the contractor even on exempt (MUD) jobs, and we never charge it.** Rule 3.294:
   a rental without an operator is taxable, damage waivers are taxable, the lessor's delivery and pickup are taxable;
   (e)(1): the contractor "owe[s] tax to the equipment rental company". Today the Bid summary taxes Material only by
   default (`bidSummary.ts:taxTicksOf`), and the harness runs at 0 % (D-1273). At Houston's 8.25 % on the taxable
   rental, ≈ **+$65 k** on the recent tabs.
4. **Rate dates are free text** (`eq_class.rent_date`: "2025-2026", "mixed: 3/2023-3/2024, Mar 2026", 22 forms), so
   nothing can say "stale". 262 of the 308 rated classes rest on at least one source older than 12 months.
5. **Live diesel is already built** (D-940: `worker/tasks/fuel.py:refresh_fuel_prices`, Tuesdays 04:00 UTC, the EIA key
   in `.env.ai`). Two gaps: a missed run is never made up (the table's newest week is 2026-11-02 on 2026-11-15, 13 days,
   because the worker restarted after Tuesday's run), and the library's `fuel_price_diesel_suggested` is a static
   $6.276 (US average, Oct 19), not the weekly table.
6. **Slide rail, hydraulic shores and sheet pile have no rate; plates are rated but never placed.** D-1128's slide
   rail is priced "as the box line", i.e. at trench-box rates. `SHORE-SLIDERAIL`, `SHORE-HYD`, `SHORE-ARCH` are D with
   no rate; no sheet-pile class; `PLATE-5x10/8x12/8x20` are rated (W25, B) but no rule puts them on a line.
7. **Standby, wear parts and rain days are not modelled.** `standby_rule` is text on every class (USACE and Caltrans
   rules quoted) and nothing reads it. A rented machine bills the calendar, so rain days matter (Plan A §5).
8. **Owned (FEMA) and rented are not consistent.** FEMA 2025's 20–25 t excavator is $97.76/h without fuel, $782 an
   8 h day, against $397.50 a day at the library's 4-week rent. FEMA's schedule is a reimbursement rate, not an
   owner's cost; a company that owns its machines needs its own rates (My equipment, D-760), not FEMA's.

---

## 1. Coverage and a Houston-first rating order

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
`pit_class`, `BOX_FT`/stackers). Estimates on the bench (603 equipment components over 7 projects) use 43 classes,
two of them without a rental rate (the tub grinder and the stabilizer, at their owned rates).

**Rate sources of the 308 rated classes** (count of classes citing each): W25 Utah dealer 148, COSTARS (PA, 2023–24)
51, C25 Ohio 49, B25 Illinois 47, N25 Missouri 42, A26 New England 35, R25 Minnesota 32, national guides 40-odd, WA
DES contract 9, North Texas Crane 14. **Houston dealers: 0.**

**Ratios over the 276 classes with all three rates (A, computed):** week ÷ day median 2.90 (mean 2.92), 4-week ÷ week
median 2.73 (mean 2.65). The derivation settings are `rent_week_per_day` 3.0 and `rent_4wk_per_week` 2.9.

### 1.2 The rating order

| Tier | What | Classes | Why |
|---|---|---|---|
| 1 | Pipe crews, the pool and the sizing | `EX-CRAWL-13T/20T/30T/40T/50T`, `BH-STD-14FT`, `WL-COMPACT-1Y/2Y`, `SS-WHEEL-LARGE`, `CP-PLATE-REV`, `CP-TRENCH-ROLLER`, `TRK-PU-8808`, `TB-STL-8x20/8x24`, `TB-STACK-4x24`, `TB-MH-8x8`, `PLATE-8x20`, `SHORE-SLIDERAIL`, `SHORE-HYD` (19) | Every utility line on the tabs prices through them |
| 2 | Earthwork tiers by use | `CP-SD-84-SM` (101 uses), `WT-4000` (80), `DZ-CRAWL-D5/D6`, `GR-12FT-140`, `ADT-30T`, `WL-SMALL-3Y`, `AT-GPS-DOZER` (8) | The most-used components on the bench |
| 3 | Dewatering (Plan A) | `PMP-TRASH-3`, `PMP-SP-4D/6D`, and the new wellpoint, header, swing joint, jetting, frac tank and hose keys (11) | None has a Houston or dealer rate |
| 4 | Crew-used, owned rate only | `PV-STABILIZER-WR2400`, `LC-GRIND-8621`, `SC-631-34`, `CN-CURB-MACHINE`, `PV-DIST-2000`, `PV-STRIPE-8440` (6) | Priced at EP / FEMA today (D-811) |
| — | The other ≈ 300 unrated | leave | No crew uses them |

### 1.3 The quote sheet

`houston-quote-sheet.csv` (in the plans folder, out of git) lists the 44 classes of tiers 1–4 and four hauler rows.
Per class: the library's day / week / 4-week, source and date, then **five dealer column groups** (Mustang Cat,
Sunbelt, United, Herc, H&E), each day / week / 4-week, and the extras the dealer states: damage waiver %,
environmental fee % and cap, delivery one way within 50 mi, pickup, cleaning fee, fuel refill $/gal, the quote date and
the branch ZIP. Two hauler quotes per transport class (local flat within 50 mi, $/loaded mile beyond).

**Loading the answers:** a library release per batch; each rate is the **median of the dealers quoted** (3 or more:
A; 2: B; 1: C), `rent_source_ids` the quotes' ids (`HOU-<dealer>-<YYYYMM>`), `rent_as_of` the quote date (§7).
Quotes stay outside git like the bid tabs (dealer prices are the founder's, not public).

## 2. Texas sales tax on equipment rental

### 2.1 The rule (34 TAC §3.294, read, A) [B1]

| § | Rule (quoted) | What it means for us |
|---|---|---|
| (c)(1) | "Receipts from the lease of tangible personal property without an operator are taxable." | Bare rental: taxable |
| (c)(2) | With an operator and a single charge, "presumed to be the performance of a service and no tax may be charged" | Operated hire on one rate (dump trucks `DT-OP-*`, a crane with operator): not taxed |
| (c)(3) | Separate charges: "the receipts from the separate charge for the tangible personal property are taxable" | Operated hire billed as machine + operator: the machine part taxed |
| (d)(2) | "Damage waiver fees are subject to tax." | Taxed |
| (d)(3) | "All transportation charges billed by the lessor to the lessee related to the leased property are taxable." Charges "billed directly to the lessee by third-party carriers are not taxable." | Dealer delivery/pickup: taxed. Our own or a hauler's lowboy: not taxed |
| (e)(1) | Contractors renting equipment for new nonresidential (and residential) work "owe tax to the equipment rental company"; tax "may not be collected from their customers on a separately stated charge" | The tax is **our cost**, inside the unit prices, on every job, MUD (exempt-owner) jobs included |

- **Owned machines:** no tax on the hourly cost (tax was paid when bought; it sits inside the owned rate). (B)
- **Fuel:** diesel is taxed under the motor fuels tax, which the EIA price already includes; no sales tax added. (C:
  §3.294 is silent; off-road dyed diesel is outside this plan)
- **Rate:** the project's city rate (D-1139: Houston 8.25 %), else the state + average local. (A)

### 2.2 Today

- `bidSummary.ts`: one sales-tax % on the **ticked** costs, Material by default (`taxTicksOf` → `["material"]`); an
  Equipment tick exists but taxes **all** equipment (owned, fuel, operated, third-party mob included). Exempt projects
  zero it (`taxExempt`).
- The harness: 0 % on everything (D-1273, correct for MUD material, wrong for rentals).

### 2.3 Proposal

- Each machine's cost carries a **taxable part**: rental periods + damage waiver + environmental fee + the dealer's
  delivery; not fuel, not owned hours, not a single-charge operated rate, not a third-party haul.
  (`cost.ts:machineCost` returns `taxable`; the spread sums it.)
- A separate Bid summary row **"Sales tax on equipment rental"** at the project's rate, on by default where the state
  taxes rentals (TX: yes), **not** switched off by `taxExempt` (rule (e)(1)). Material keeps its own row and exemption.
- The harness's overlay config gains `equipmentRentalTaxPct: 8.25` (an input).

## 3. Rental extras

| Extra | Typical | Source, grade | How to apply |
|---|---|---|---|
| Damage waiver | 10–14 % of rent (industry); 15 % on one dealer's plan | rental-software vendor guide [B2] C; dealer plans exist (United RPP, Herc RPP) but no % published | Company setting `damage_waiver_pct`, **default 0 % with the company's own equipment insurance**, else 12 % (D, the range's middle); taxable |
| Environmental fee | ≈ 1.3 % of rent, capped ($75 reported) | a 2014 news item on one dealer C; Sunbelt and Herc publish the fee's existence, not its % [B3][B4] | `env_fee_pct` 1.3 %, `env_fee_cap` $75 per contract line (D until quotes); taxable |
| Fuel refill by the dealer | dealer's $/gal premium | quotes (F) | Off by default (crews fuel); on: refill $/gal × the machine's last-day gallons (D) |
| Cleaning | flat per machine when returned dirty | quotes (F) | `cleaning_fee` per earthmoving machine in clay (D: on when the bottom layer is CL/CH) |
| Delivery minimum | the transport class's `min_typ` | library B | Exists (`mob.ts:haul` takes `max(minimum, $/mi × mi)`); quotes replace it (§4) |

## 4. Mob: our defaults against Houston local rates

- **Today:** one way = max(min, $/loaded mile × miles) + permits + escorts + handling (`mob.ts:haul`), miles =
  `mob_distance_mi` 50, demob = one way × 1.0. Lowboy legal: max($550, $4.75 × 50 = $237.50) = **$550** each way
  ($1,100 a move). Tilt trailer $500, flatbed $400, pickup-towed $200 (`eq_transport_class`, B, national guides).
- **Houston evidence:** national guides put local (< 100 mi) legal lowboy moves at $300–800 flat and oversize at
  $800–2,500+ (C) [B5]; no Houston hauler publishes a rate (F). Our $550 sits inside the band.
- **Proposal:**
  1. The estimator gets **two hauler quotes per transport class** (the quote sheet's last rows): a local flat within
     `local_radius_mi` (default 50) and a $/loaded mile beyond.
  2. A region override table `eq_transport_region` (region `TX-HOU`: the class, local flat, $/mi, minimum, source,
     as-of), read before the national row when the project's ZIP is in the region.
  3. **Local vs line haul:** miles ≤ local radius → the local flat; beyond → max(minimum, $/mi × miles); the dealer's
     own delivery (on the rental) wins when the machine is rented with delivery (it is then taxable, §2).

## 5. Shoring beyond trench boxes

| System | In the library | In the engine today | Add | When the engine picks it |
|---|---|---|---|---|
| Steel boxes and stackers | `TB-STL-*`, `TB-STACK-*`, `TB-MH-*`, `TB-ALU-*` (W25/B25, B) | `protection.ts:protectionAt` (forced from 5 ft below water in granular, caving, a geotech rule); stackers to 20 ft (D-1144); a PE design past 20 ft | Houston rates (tier 1) | As today |
| Slide rail | `SHORE-SLIDERAIL` (D, no rate) | D-1128: when no box in the list fits, to 24 ft, **priced as the box line** | Rates per bay (panel + post sets, F) and a per-bay count: bays open = ⌈open length ÷ bay length⌉ + 1 | No box wide enough; depth 20–24 ft; **existing utilities crossing the trench** (a run tick, new); next to a structure within 1:1 of the trench bottom (a run tick, new) |
| Hydraulic shores (aluminium) | `SHORE-HYD` (D, no rate) | not picked | Rates (F); count per OSHA Subpart P Appendix D's spacing tables (B, to be read) | Narrow trenches (≤ 4 ft wide) in cohesive soil above water, ≤ 15 ft: services, small dry utilities; manhole braces |
| Arch spreaders | `SHORE-ARCH` (D) | not picked | Rates (F) | With slide rail at wide pipe (optional) |
| Sheet pile | none (vibro hammers `FD-VIBRO-*` without rates) | not picked | A subcontract line by hand (F) | Deeper than 24 ft, or below water in granular soil where no groundwater method is chosen (Plan A), or a coffer dam (the tabs' outfall items) |
| Road plates | `PLATE-5x10/8x12/8x20` (W25, B) | never placed | A plate rule | Urban runs (D-1097) and any run with "traffic over the trench at night": plates = ⌈night-open length ÷ 20⌉ (default open 40 ft, D), 8 × 20 when the trench top ≤ 6 ft wide (1 ft bearing a side, C), wider: F; rented for the run's calendar days |

## 6. Live diesel through the existing EIA key

- **Built (D-940):** `worker/tasks/fuel.py` reads EIA v2 `petroleum/pri/gnd` (diesel `EPD2D`, on-highway all types),
  gasoline and propane weekly into `eqlib.eq_fuel_weekly`; beat Tuesdays 04:00 UTC (EIA publishes Mondays); no key,
  no call; a failed series keeps its last week. `fuel.py:project_fuel` picks state → PADD → US; Texas has no state
  diesel series (EIA publishes state diesel for California only), so a Houston project reads **Gulf Coast (PADD 3)**;
  off-road = on-highway less 24.4 ¢ federal and 20.0 ¢ Texas (FHWA MF-121T, `diesel_excise.csv`).
- **Today's figure:** PADD 3 $5.912 (week of 2026-11-02) → off-road **$5.468** (A).
- **Add:**
  1. **Catch-up:** on worker start, and daily at 04:00, run the refresh when the newest week is more than 8 days old
     (EIA's Monday plus a day's slack).
  2. **Staleness flag:** a project's fuel field shows "EIA week of 2026-11-02, 13 days old" in amber past 10 days.
  3. **Suggested setting:** `fuel_price_diesel_suggested` reads the weekly table (PADD 3 for a TX workspace), not the
     static Oct 19 US average ($6.276) in `eq_setting`/`eq_fuel_region`.
  4. **Fallback:** no key or EIA down → the last stored week with its date (as today); none → the release's snapshot
     (`seed/eia_weekly/eia_weekly.csv`), labelled.
- **Key:** `EIA_API_KEY`, already in `intelcost-infra/.env.ai`. No new key.

## 7. Rate dates and staleness

- **Add** `eq_class.rent_as_of date` (and `owned_as_of`), one migration that parses today's text: a single date → it; a
  range ("3/2023-3/2024", "2024-2030") → its **end** for a dated list and the contract's **price-list date** for a
  contract (WA DES: the vendor list's date, C); a year ("2025") → its source's edition date from `eq_source`
  (W25: Mar 2025); "mixed: …" → the **oldest** date named (conservative); "read Oct 2026" → 2026-10-01.
- **Flag** a rate older than 12 months (amber "Rate from Mar 2025, 20 months old") on the class, the picker and the
  estimate line's equipment cell; older than 24 months red. Needs attention lists the estimate's stale machines once.
- **Refresh process:** twice a year (January, July) the estimator sends the quote sheet for tiers 1–2; tier 3–4 on use;
  a release per batch with `release_audit` old → new; the national rows stay as a fallback below the region's.

## 8. Wear parts, standby and rain days, owned vs rented, Houston ratios

| Item | Today | Proposal | Grade |
|---|---|---|---|
| Wear parts and GET (teeth, cutting edges, breaker bits) | not priced; a rented machine's wear is "in its rent" (`cost.ts` comment) | Rental: dealers bill GET and breaker tool wear by measure on return: a per-hour allowance on breakers and rippers only, from the quotes (F). Owned: inside FEMA/EP | C (common rental terms) / F |
| Standby, rented | the calendar period solver; rain days not added | Plan A §5: lost days lengthen the rental | A (the rental contract) |
| Standby, owned | none | owned rate (without fuel) × a class delay factor on lost days, default 0.22 (the top of the Caltrans band the library's `standby_rule` text cites), capped 8 h a day and 40 h a week | D (USACE's 0.5 × depreciation + FCCM needs the split the library does not hold) |
| Owned vs rented consistency | `default_mode` "rental" everywhere; owned at FEMA 2025 (`owned_rate_hr_excl_fuel`) | Owned mode reads the **company's own rate** (My equipment, D-760) first; FEMA only labelled "FEMA reimbursement rate (dearer than an owner's cost)"; a check row compares FEMA's 8 h day against the 4-week rent ÷ 20 | A (the figures) / D (the rule) |
| Houston week/day and 4-week/week | settings 3.0 and 2.9 (derivation only) | set to the library's medians now, 2.90 and 2.73 (E), then the Houston quotes' medians | E → A |

## 9. Hand-worked rows (quantity-table candidates)

Common: Houston 8.25 % (D-1139, A); `EX-CRAWL-20T` $1,040 / $2,927 / $7,950, owned $97.76/h without fuel, 2.78 gal/h
(library, A); lowboy legal $4.75/mi, $550 minimum (B); PADD 3 diesel $5.912 (A).

| Row id | Case | Worked | Result |
|---|---|---|---|
| `eq-tax-rental` | 20 t excavator, one 4-week rental, Houston | 7,950 × 0.0825 | tax **$655.88** |
| `eq-tax-owned` | the same machine owned, 160 h | 160 × 97.76 = 15,641.60; owned: no tax | tax **$0** |
| `eq-tax-delivery` | dealer delivery and pickup $550 + $550 | 1,100 × 0.0825 = 90.75; a third-party hauler: 0 | **$90.75** / $0 |
| `eq-tax-operated` | operated tri-axle on one hourly rate | §3.294(c)(2): a service | **$0** |
| `eq-waiver` | 12 % damage waiver on the 4-week rental | waiver 954.00; tax on rent 655.88 + on waiver 78.71; total 7,950 + 954 + 655.88 + 78.71 | **$9,638.58** (was $7,950) |
| `eq-env-fee` | 1.3 %, cap $75 | 4-week: 7,950 × 0.013 = 103.35 → cap **$75**; a 6 in pump week: 1,112 × 0.013 = **$14.46** | $75 / $14.46 |
| `eq-mob-local` | lowboy legal, 30 mi | max(550, 4.75 × 30 = 142.50) = 550 each way | **$1,100** a move |
| `eq-mob-line` | lowboy legal, 180 mi | max(550, 4.75 × 180 = 855) each way | **$1,710** a move |
| `eq-stale` | as-of and age on 2026-11-15 | Mar 1 2025: 624 days (stale); Oct 1 2026: 45 (fresh); "3/2023-3/2024" → Mar 14 2024: 976 (red, > 730) | stale / fresh / red |
| `eq-diesel-offroad` | Houston off-road diesel | 5.912 − (24.4 + 20.0)/100 | **$5.468**/gal |
| `eq-fuel-cost` | 20 t, 160 h at medium load | 2.78 × 160 × 5.468 | **$2,432.17** |
| `eq-diesel-age` | newest EIA week 2026-11-02, today 2026-11-15 | 13 days > 10 | amber flag; catch-up runs (> 8) |
| `eq-ratio-derive` | a class with a day rate only, $500 | today 500 × 3.0 = 1,500 week, × 2.9 = 4,350 4-week; proposed 500 × 2.90 = 1,450, × 2.73 = 3,958.50 | week **$1,450**, 4-week **$3,958.50** |
| `eq-standby-owned` | owned 20 t, 6.57 rain days (Plan A `rain-june-ew`) | 97.76 × 0.22 = 21.51/h × 8 h × 6.571 | **$1,130.59** |
| `eq-plates` | urban run, 40 ft open at night, top 3 ft wide | ⌈40/20⌉ = 2 × PLATE-8x20; a week 2 × 186 | 2 plates, **$372** a week |
| `eq-stackers` | box to 17 ft (D-1144, check) | ⌈(17 − 8)/4⌉ = 3; factor 1 + 0.7312 × 3 = 3.19 (0.7312 = 1,556 / 2,128) | 3 stackers, box days × 3.19 |

## 10. Ranking (both plans) and build order

### 10.1 By expected effect on the bid-tab gap

Basis: the 10 recent tabs, direct $8.04 M, equipment ≈ $1.05 M, of which the rented, taxable part ≈ 75 % (D). A
negative $ lowers our direct (toward the healthy 1.20–1.35); positive raises it. Δk is to the medians (0.997 today).

| Rank | Item | Plan | Expected $ on recent direct | Δk (≈) | Effort h |
|---:|---|---|---:|---:|---:|
| 1 | Spread sizing per line (the D-1279 Q6 design question: one sized excavator for the whole spread) | B §8 / D-1279 | **−$120 k** (−$178 k on all 16 storm spreads) | +0.015 | 10 |
| 2 | Houston dealer re-rate, tiers 1–2 | B §1 | **±$80 k** (±10 % of the rented part; sign unknown) | ±0.010 | 6 + quotes |
| 3 | Damage waiver (if charged) | B §3 | +$94 k (+$102 k with its tax); $0 with own insurance | −0.012 | 4 |
| 4 | Rain lost days on rented spreads | A §5 | +$67 k | −0.008 | 8 |
| 5 | Sales tax on rentals (8.25 %) | B §2 | +$65 k | −0.008 | 6 |
| 6 | Shoring: slide rail at its own rate, plates on urban runs | B §5 | +$0–30 k (few items; 60–72 in, urban) | ≈ 0 | 12 |
| 7 | Mob local flats from hauler quotes | B §4 | ±$20 k | ±0.002 | 6 |
| 8 | Environmental fee | B §3 | +$5 k | ≈ 0 | (in 3) |
| 9 | Diesel catch-up and suggested price | B §6 | ±$5 k | ≈ 0 | 3 |
| 10 | Week/day and 4-week/week ratios | B §8 | ≈ $0 (derived classes only) | 0 | 1 |
| 11 | Owned standby, GET | B §8 | ≈ $0 on the tabs (spreads rent) | 0 | 4 |
| 12 | Rate dates and staleness | B §7 | $0 | 0 | 6 |
| 13 | Dewatering method, quantities and price | A §3–4 | **$0** (the tabs pay it separately) | 0 | 59 |
| 14 | Site water sources (SDA, NOAA, geocode) | A §2 | $0 | 0 | 17 |
| 15 | Harness dewatering check | A §7 | $0 (report only) | 0 | 3 |

Items 3–5 and 8 together: ≈ +$230 k (k ≈ 0.997 → 0.970). They are real costs every bidder carries; leaving them out
flatters our gap. Only item 1 (and item 2 if Houston is cheaper) moves us toward the healthy band.

### 10.2 Plan B tasks

| # | Task | Repo | Hours |
|---|---|---|---|
| B1 | Coverage report script (read-only) and the quote sheet (done in draft: `houston-quote-sheet.csv`); load the first answers as a release | infra, api | 6 (+ quotes) |
| B2 | Sales tax on rentals: `machineCost` taxable part, spread sum, Bid summary row, exempt rule, harness config | app, infra | 6 |
| B3 | Rental extras: settings (waiver %, env fee % and cap, cleaning, refill), applied in `machineCost`, shown on the machine | api, app | 4 |
| B4 | Mob: `eq_transport_region` (migration), local vs line haul, quotes loaded | api, app | 6 |
| B5 | Shoring: slide rail per bay at its rate, hydraulic shores, plate rule, sheet pile by hand; the run ticks; rows | app, api | 12 |
| B6 | Diesel catch-up, staleness flag, suggested price from the weekly table | api, app | 3 |
| B7 | `rent_as_of` (migration with the parse), staleness badges, Needs attention, refresh note | api, app | 6 |
| B8 | Standby (owned delay factor), GET allowance field, ratios to the medians, owned mode reads My equipment first | api, app | 5 |
| B9 | Spread sizing per line (only if the founder says so, D-1279 Q6) | api | 10 |
| B10 | Gates, quantity-table rows (§9, 16 rows) as `equipment-cases.mjs`, one MCP smoke on a throwaway (a Houston utility job: tax row, waiver, stale badge, plates on an urban run), docs and mirror | all | 6 |
| | **Total** | | **64 h** (±25 %; B5's rules and B9 are the likeliest overruns) |

**Both plans: 87 h (A) + 64 h (B) = 151 h, ±30 %.**

### 10.3 Recommended build order across nights

| Night | Work | Why then |
|---|---|---|
| 1 | B7 rate dates, B6 diesel catch-up, B1 quote sheet sent; A5 + A6 the pure water module proven on its 15 rows (no visible change) | No price moves; the quotes take days to come back |
| 2 | B2 sales tax and B3 extras (waiver default per the founder's answer), B8 ratios; rerun the harness once | The correctness items land together, with one rerun to show their sum |
| 3 | B9 spread sizing (if yes), B4 mob local; rerun | The one lever that lowers our direct |
| 4 | A1–A4 site water sources, A10 rain into durations with B8 standby | Data first, then the durations |
| 5 | A7, A8 dewatering wired and priced (F rows read "Quote needed"), A11 UI | After the sources and durations |
| 6 | B1 / A9 the quoted rates as one release; B5 shoring; A12 the harness check; rerun | Prices from quotes, last |

## 11. Risks

1. **Quotes are the critical path.** Tiers 1–3 need five dealers' answers; without them items 2, 6 and Plan A's
   pricing stay F or out-of-state.
2. **The correctness items make us dearer** (≈ +$230 k). Show them on their own rerun so they are not mistaken for a
   regression.
3. **Dealer quotes are the founder's data**: keep them outside git like the tabs; only the medians and grades go in a
   release.
4. **Tax on mixed bills.** A dealer invoice can bundle delivery and fuel; the taxable split needs the quote's own lines.
5. **Staleness parse.** 22 text forms; a wrong parse marks a fresh rate stale. The migration lists every parse for
   review before it runs.

## 12. Questions for the founder

1. **Damage waiver:** does your company carry its own rented-equipment insurance (default 0 %), or should estimates
   take the dealer's waiver (12 % until quoted)?
2. **Sales tax on rentals:** charge 8.25 % on the taxable rental part on every Texas job, MUD jobs included (Rule
   3.294(e)(1)), and in the harness?
3. **Spread sizing (D-1279 Q6):** price each pipe line on the excavator its own size needs, rather than one excavator
   sized to the spread's largest pipe and deepest trench?
4. **Owned machines:** when a company owns its fleet, may owned mode require its own rates (My equipment), with FEMA
   only as a labelled fallback?
5. **Quote sheet:** the 44 classes and four hauler rows in `houston-quote-sheet.csv`: right list, and may the estimator
   ask all five dealers twice a year?
6. **Slide rail triggers:** add the two run ticks (existing utilities crossing; a structure close by)?

## Sources

- [B1] 34 Tex. Admin. Code §3.294, Rental and Lease of Tangible Personal Property: https://law.cornell.edu/regulations/texas/34-Tex-Admin-Code-SS-3-294
- [B2] Wynne Systems, The Comprehensive Guide to Ancillary Fees (damage waiver 10–14 %): https://wynnesystems.com/wp-content/uploads/2018/05/The_Comprehensive_Guide_to_Ancillary_Fees.pdf
- [B3] Sunbelt Rentals, environmental fee page: https://sunbeltrentals.com/environmentalfee
- [B4] Herc Rentals, associated charges (Emissions and Environmental Surcharge): https://www.hercrentals.com/services-associated-charges.html
- [B5] OTrucking, lowboy trucking rates (local flats, per-mile bands): https://otrucking.com/resources/guides/lowboy-trucking-rates/
- EIA open data API v2, petroleum prices (the key in `.env.ai`): https://www.eia.gov/opendata/
- FHWA MF-121T (state motor fuel excise), as loaded in `diesel_excise.csv` (D-940).
- OSHA 29 CFR 1926 Subpart P, Appendix D (aluminium hydraulic shoring) and Appendix E (alternatives): https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926SubpartPAppD

// The equipment library's rows of the shared table (F33, D-724, D-730 onward): the app's own
// `lib/estimate/equipment` engine against the catalog's cached values and the answers worked by
// hand in the plan (`docs/tasks/EQUIPMENT_LIBRARY_PLAN.md` §3.4 to §3.6) and the founder's brief.
//
// The national rows come from the bench database (`quantity-table.sh` dumps `eqlib` to
// .qt-eqlib.json); each row adds the overrides it needs (a project's fuel price, a location
// factor) the way the api's bundle carries them. Money is compared to the cent.

const DIESEL = { setting: { fuel_price_diesel: 6.276 } };
/** D-1353: when each pricing-rule change reached the bench (`pricing_rule_arrival`, set by migration d1353e5a9b71). */
const BENCH_ARRIVALS = { rental_billing: "2026-11-24T13:52:00Z", wages: "2026-11-25T05:41:42Z" };

// A host's components as the api keeps them (the fields the engine reads).
const comp = (id, kind, fields = {}) => ({
  id, takeoff_item_id: "host", kind, name: id, position: 0, qty_formula: null, unit: null, pricing_mode: kind === "equipment" ? "lump" : "unit",
  crew: null, production_rate: null, production_basis: null, crew_day_hours: null, unit_price: null, equip_rate: null, equip_basis: null,
  duration_formula: null, mob_demob: null, sub_calc: null, quote_amount: null, unit_rate: null, total: null, ...fields,
});
const excavator = (fields = {}) => comp("ex", "equipment", { position: 0, eq_class_key: "EX-CRAWL-20T", eq_activity_key: "EW-CUTLOAD", eq_mode: "rental", eq_period: "auto", eq_units: 2, eq_include_mob: true, ...fields });
const operators = (count = 2, fields = {}) => comp("crew", "labor", { position: 1, crew: [{ role: "TEST Operator", count, hourly_wage: 50, for_equipment: "ex" }], production_rate: 12.5, production_basis: "units_per_hr", ...fields });

export const EQUIPMENT_CASES = [
  // Every class's mob and demob at the catalog's 50 miles, as the workbook cached them (642 rows: the chainsaw class added in release 31, D-994).
  { id: "eq-mob-catalog-628", kind: "mob-catalog" },

  // The rental solver (D-724 rule 6, plan §3.4), by calendar days on rent since D-1336 (D-1335 Q1): picked up on the work
  //   start's weekday (none given: Monday), off rent at the END of the last work day (D-1344, D-1342 Q1: the days off
  //   between work days count, those after the last do not); periods 1 / 7 / 28 calendar days. From a Monday on a 5-day
  //   week, w = 5k + r work days are 7k + r days on rent, so the covers below are the work-day solver's (a 7-day week is
  //   5 work days, a 28-day 4-week 20) and these rows keep their values. Overtime per billed period (8 h a day, 40 a
  //   week, 160 a 4-week) at the cover's period cost ÷ its allowance.
  { id: "eq-solve-8-days", kind: "solve", rates: [1040, 2927, 7950], days: 7.6526, hours: 61.2205, expect: { cost: 5854, label: "2 weeks", alt: "1 week + 3 days", altCost: 6047 } },
  { id: "eq-solve-7-days", kind: "solve", rates: [1040, 2927, 7950], days: 6.6667, hours: 53.3333, expect: { cost: 5007, label: "1 week + 2 days" } },
  { id: "eq-solve-20-days", kind: "solve", rates: [1040, 2927, 7950], days: 20, hours: 160, expect: { cost: 7950, label: "one 4-week" } },
  { id: "eq-solve-10-days-10-hr", kind: "solve", rates: [1040, 2927, 7950], days: 10, hours: 100, expect: { cost: 7317.5, periodCost: 5854, overtimeHours: 20, overtimeCost: 1463.5, label: "2 weeks" } },
  { id: "eq-solve-11-days", kind: "solve", rates: [1040, 2927, 7950], days: 10.1526, hours: 81.2205, expect: { cost: 6894, label: "2 weeks + 1 day" } },
  { id: "eq-solve-lift-8-days", kind: "solve", rates: [563, 1370, 2766], days: 8, hours: 64, expect: { cost: 2740, label: "2 weeks", alt: "one 4-week", altCost: 2766 } },
  { id: "eq-solve-blank-week", kind: "solve", rates: [1040, null, 7950], days: 8, hours: 64, expect: { cost: 7950, label: "one 4-week", skipped: ["wk"] } },
  { id: "eq-solve-no-rates", kind: "solve", rates: [null, null, null], days: 8, hours: 64, expect: { none: true } },
  // D-1336 (D-1335 Q1), the founder's rows. eq-solve-4wk-10h-ot: 10 h × 20 work days = 200 h; from a Monday (no start
  //   date) to the 4th Friday, 26 days on rent (D-1344: was 28 with the weekend after) → one 4-week $7,950 (3 weeks +
  //   5 days $13,981) carrying 160 h: 40 h overtime × 7,950 ÷ 160 = $1,987.50 → $9,937.50.
  { id: "eq-solve-4wk-10h-ot", kind: "solve", rates: [1040, 2927, 7950], days: 20, hours: 200, expect: { cost: 9937.5, periodCost: 7950, billedDays: 26, startAssumed: true, allowanceHours: 160, overtimeHours: 40, overtimeCost: 1987.5, label: "one 4-week" } },
  // eq-solve-7-days-weekend: 7 work days from a Monday (start 2027-01-04) to the next Tuesday, the weekend inside: 9 days
  //   on rent: week + 2 days $5,007 (two weeks $5,854); 7 × 8 = 56 h against 40 + 16 = 56 h: no overtime.
  { id: "eq-solve-7-days-weekend", kind: "solve", rates: [1040, 2927, 7950], days: 7, hours: 56, start: "2027-01-04", expect: { startAssumed: false, cost: 5007, periodCost: 5007, billedDays: 9, allowanceHours: 56, overtimeHours: 0, label: "1 week + 2 days", alt: "2 weeks", altCost: 5854 } },
  // eq-solve-7-days-thursday: the same 7 work days from a Thursday (start 2027-01-07): Thu 7, Fri 8, the weekend between,
  //   Mon 11 – Fri 15, off rent at the end of that Friday (D-1344; D-1336 kept the weekend after: 11 days, two weeks):
  //   9 days on rent: week + 2 days $5,007 (two weeks $5,854); 56 h against 40 + 16 = 56 h: no overtime.
  { id: "eq-solve-7-days-thursday", kind: "solve", rates: [1040, 2927, 7950], days: 7, hours: 56, start: "2027-01-07", expect: { cost: 5007, periodCost: 5007, billedDays: 9, allowanceHours: 56, overtimeHours: 0, label: "1 week + 2 days", alt: "2 weeks", altCost: 5854, startAssumed: false } },
  // eq-solve-7-days-saturday: a Saturday start (2027-01-09) picks up on the Monday (Jan 11): 7 work days to Tue Jan 19,
  //   9 days on rent, week + 2 days $5,007, as from a Monday.
  { id: "eq-solve-7-days-saturday", kind: "solve", rates: [1040, 2927, 7950], days: 7, hours: 56, start: "2027-01-09", expect: { cost: 5007, billedDays: 9, allowanceHours: 56, overtimeHours: 0, label: "1 week + 2 days", startAssumed: false } },
  // eq-solve-5-days-fixed-day: picked by the day, 5 work days from a Monday (no start date) are Mon–Fri, 5 days on rent:
  //   5 × $1,040 = $5,200 (D-1344; D-1336 kept the weekend after the Friday: 7 days, $7,280); 40 h against 40 h.
  { id: "eq-solve-5-days-fixed-day", kind: "solve", rates: [1040, 2927, 7950], days: 5, hours: 40, fixed: "day", expect: { cost: 5200, billedDays: 5, allowanceHours: 40, overtimeHours: 0, label: "5 days", startAssumed: true } },
  // eq-solve-16-days-10h: 16 × 10 h = 160 h on the 4-week it already pays for (22 days on rent): 160 h allowance, no
  //   overtime (the work-day rule charged 160 − 8 × 16 = 32 h, $1,590).
  { id: "eq-solve-16-days-10h", kind: "solve", rates: [1040, 2927, 7950], days: 16, hours: 160, expect: { cost: 7950, billedDays: 22, allowanceHours: 160, overtimeHours: 0, label: "one 4-week" } },
  // eq-solve-3-days-10h-week: 3 × 10 h = 30 h on a week ($2,927 < 3 × $1,040): 40 h allowance, no overtime (was 6 h, $439.05).
  { id: "eq-solve-3-days-10h-week", kind: "solve", rates: [1040, 2927, 7950], days: 3, hours: 30, expect: { cost: 2927, billedDays: 3, allowanceHours: 40, overtimeHours: 0, label: "1 week" } },
  // eq-solve-7-days-10h: 7 × 10 h = 70 h against week + 2 days' 56 h: 14 h × 5,007 ÷ 56 = $1,251.75 → $6,258.75 (as before).
  { id: "eq-solve-7-days-10h", kind: "solve", rates: [1040, 2927, 7950], days: 7, hours: 70, expect: { cost: 6258.75, overtimeHours: 14, overtimeCost: 1251.75, label: "1 week + 2 days" } },

  // D-1285 Q19 (f): labour overtime at each spread's own work day (`overtime.ts:overtimeBySpread`), worked by hand. The
  // FLSA rule (D-961): over 40 h a week at time and a half, so the premium is labour x 0.5 x (overtime h / week h). 5 days.
  // ot-1: an 8 h project, no spread of its own day: 8 x 5 = 40 h, no overtime: $0 (as `overtimePremium` alone).
  { id: "ot-8h-project-no-spread-day", kind: "overtime", rule: { overtime: true, daily: false, daysPerWeek: 5 }, workDay: 8, labor: 10000, own: [], expect: { premium: 0, same: true } },
  // ot-2: an 8 h project with $4,000 of its $10,000 labour on spreads fixed at 10 h (the older copies): 50 h weeks, 10 h
  //   over: 4,000 x 0.5 x 10 / 50 = $400; the other $6,000 at 8 h: $0. Before (f): $0.
  { id: "ot-spread-10h-on-8h-project", kind: "overtime", rule: { overtime: true, daily: false, daysPerWeek: 5 }, workDay: 8, labor: 10000, own: [{ hoursPerDay: 10, labor: 4000 }, { hoursPerDay: 8, labor: 1000 }], expect: { premium: 400, same: false } },
  // ot-3: a 10 h project with $3,000 of $10,000 on an 8 h spread: 7,000 x 0.5 x 10 / 50 = $700; the 8 h spread $0. Before
  //   (f): 10,000 x 0.1 = $1,000.
  { id: "ot-spread-8h-on-10h-project", kind: "overtime", rule: { overtime: true, daily: false, daysPerWeek: 5 }, workDay: 10, labor: 10000, own: [{ hoursPerDay: 8, labor: 3000 }], expect: { premium: 700, same: false } },
  // ot-4: daily overtime too (over 8 h a day), an 8 h project, $5,000 of $6,000 on a 10 h spread: max(50 - 40, 2 x 5) = 10 h
  //   of 50: 5,000 x 0.5 x 0.2 = $500; the rest $0.
  { id: "ot-daily-spread-10h", kind: "overtime", rule: { overtime: true, daily: true, daysPerWeek: 5 }, workDay: 8, labor: 6000, own: [{ hoursPerDay: 10, labor: 5000 }], expect: { premium: 500, same: false } },
  // ot-5: overtime off: $0 whatever the spreads.
  { id: "ot-off", kind: "overtime", rule: { overtime: false, daily: false, daysPerWeek: 5 }, workDay: 8, labor: 10000, own: [{ hoursPerDay: 10, labor: 4000 }], expect: { premium: 0, same: true } },

  // D-1286 (B7): a library rate's age (`rateAge.ts`), amber past 12 calendar months, red past 24, worked by hand. Exactly
  // 12 (or 24) months is not yet over; one day more is. Days: 2025-11-16 → 2026-11-16 is 365 (2026 not a leap year).
  { id: "b7-age-12-months-exact", kind: "rate-age", asOf: "2025-11-16", today: "2026-11-16", expect: { level: "fresh", days: 365, months: 12 } },
  { id: "b7-age-12-months-one-day-over", kind: "rate-age", asOf: "2025-11-15", today: "2026-11-16", expect: { level: "amber", days: 366, months: 12 } },
  // 2024-11-16 → 2026-11-16: 365 + 365 = 730 days (no Feb 29 between).
  { id: "b7-age-24-months-exact", kind: "rate-age", asOf: "2024-11-16", today: "2026-11-16", expect: { level: "amber", days: 730, months: 24 } },
  { id: "b7-age-24-months-one-day-over", kind: "rate-age", asOf: "2024-11-15", today: "2026-11-16", expect: { level: "red", days: 731, months: 24 } },
  // The plan's eq-stale row (§9) on 2026-11-15: Mar 1 2025 is 624 days (amber), Oct 1 2026 45 (fresh), Mar 14 2024 976 (red).
  { id: "b7-eq-stale-mar-2025", kind: "rate-age", asOf: "2025-03-01", today: "2026-11-15", expect: { level: "amber", days: 624, months: 20 } },
  { id: "b7-eq-stale-oct-2026", kind: "rate-age", asOf: "2026-10-01", today: "2026-11-15", expect: { level: "fresh", days: 45, months: 1 } },
  { id: "b7-eq-stale-mar-2024", kind: "rate-age", asOf: "2024-03-14", today: "2026-11-15", expect: { level: "red", days: 976, months: 32 } },
  // A Feb 29 as-of: 12 months on is Feb 28 2025 (the month's last day), so that day is not over; Mar 1 is.
  { id: "b7-age-feb-29-exact", kind: "rate-age", asOf: "2024-02-29", today: "2025-02-28", expect: { level: "fresh", days: 365, months: 12 } },
  { id: "b7-age-feb-29-one-day-over", kind: "rate-age", asOf: "2024-02-29", today: "2025-03-01", expect: { level: "amber", days: 366, months: 12 } },
  { id: "b7-age-no-date", kind: "rate-age", asOf: null, today: "2026-11-16", expect: { none: true } },
  // A class's date by its basis, from the bench's release (migration d1286b7c4f30): WT-4000 rented, rent_as_of 2025-03-01
  // (`2025` on W25, Mar 2025): amber; AW-AB-RT-125 has no rental rate, so a rental prices owned (D-811): FEMA 2025,
  // owned_as_of 2025-07-01, 503 days, amber; AW-AB-EL-30 (`3/2023-3/2024` on COSTARS, to Mar 14 2024): red;
  // EX-CRAWL-20T rented (A26, read Oct 2026, 2026-10-01): fresh.
  { id: "b7-class-wt-4000-rental", kind: "class-age", key: "WT-4000", mode: "rental", today: "2026-11-16", expect: { basis: "rent", asOf: "2025-03-01", level: "amber" } },
  // D-1289 (Q26): FEMA 2025 is the newest FEMA edition the library holds, so its owned rate reads fresh (was amber).
  { id: "b7-class-owned-fallback", kind: "class-age", key: "AW-AB-RT-125", mode: "rental", today: "2026-11-16", expect: { basis: "owned", asOf: "2025-07-01", level: "fresh", days: 503, femaCurrent: 2025 } },
  // D-1289 (Q26): a newer FEMA edition (2026) loaded beside it: the 2025 rate is aged by its date again, 503 days, amber.
  { id: "q26-fema-newer-edition", kind: "class-age", key: "AW-AB-RT-125", mode: "rental", today: "2026-11-16", femaNewer: 2026, expect: { basis: "owned", asOf: "2025-07-01", level: "amber", days: 503, femaCurrent: null } },
  { id: "b7-class-costars-red", kind: "class-age", key: "AW-AB-EL-30", mode: "rental", today: "2026-11-16", expect: { basis: "rent", asOf: "2024-03-14", level: "red" } },
  { id: "b7-class-ex20-fresh", kind: "class-age", key: "EX-CRAWL-20T", mode: "rental", today: "2026-11-16", expect: { basis: "rent", asOf: "2026-10-01", level: "fresh" } },
  // D-1289 (Q27): a rate the estimate entered is aged by its own entry date (WT-4000 with a project 4-week rate entered
  //   today: fresh, the estimate's); entered 2025-06-01: 533 days, 17 months on 2026-11-16, amber. Was "no date, no badge".
  { id: "b7-class-own-rate-no-badge", kind: "class-age", key: "WT-4000", mode: "rental", today: "2026-11-16", classOverride: { field: "rent_4wk", value: 8000 }, expect: { basis: "rent", asOf: "2026-11-16", level: "fresh", own: "project" } },
  { id: "q27-own-rate-amber", kind: "class-age", key: "WT-4000", mode: "rental", today: "2026-11-16", classOverride: { field: "rent_4wk", value: 8000, at: "2025-06-01T00:00:00Z" }, expect: { basis: "rent", asOf: "2025-06-01", level: "amber", own: "project", days: 533 } },
  // D-1289 (Q27): its own Needs attention block, not the library's: WT-4000's own rate (2025-06-01) in the own list and out
  //   of the library list (which keeps PV-STABILIZER, EP 2022, red); EX-CRAWL-20T, fresh, in neither.
  { id: "q27-own-block", kind: "stale-own-list", today: "2026-11-16", classOverride: { key: "WT-4000", field: "rent_4wk", value: 8000, at: "2025-06-01T00:00:00Z" }, uses: [{ key: "WT-4000", basis: "rent" }, { key: "PV-STABILIZER-WR2400", basis: "owned" }, { key: "EX-CRAWL-20T", basis: "rent" }], expect: { own: ["WT-4000|rent|2025-06-01|amber"], library: ["PV-STABILIZER-WR2400|owned|2022-12-01|red"] } },
  // Needs attention lists each stale class once per basis, however many lines use it: WT-4000 rented on 24 lines, PV-STABILIZER
  // owned (EP 2022, red) twice, EX-CRAWL-20T (fresh) on 5: two entries, red first.
  { id: "b7-needs-attention-once", kind: "stale-list", today: "2026-11-16", uses: [...Array(24).fill({ key: "WT-4000", basis: "rent" }), { key: "PV-STABILIZER-WR2400", basis: "owned" }, { key: "PV-STABILIZER-WR2400", basis: "owned" }, ...Array(5).fill({ key: "EX-CRAWL-20T", basis: "rent" })], expect: { list: ["PV-STABILIZER-WR2400|owned|2022-12-01|red", "WT-4000|rent|2025-03-01|amber"] } },
  // eq-solve-fixed-day: picked by the day, 7.6526 → 8 work days from a Monday run Mon → the next Wed: 10 days on rent,
  //   the weekend BETWEEN work days on rent (D-1336, kept by D-1344): 10 × $1,040 = $10,400 (work-day basis 8 days, $8,320).
  { id: "eq-solve-fixed-day", kind: "solve", rates: [1040, 2927, 7950], days: 7.6526, hours: 61.2205, fixed: "day", expect: { cost: 10400, billedDays: 10, label: "10 days" } },

  // One machine, the plan's worked examples (8-hr day, catalog path): plan §3.5, §3.6.
  { id: "eq-ex1-rental", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 61.22049172298952, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 8022.13, equipment: 5854, fuel: 1068.13, mob: 1100 } },
  { id: "eq-ex1-owned", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "owned", period: "hr", hours: 61.22049172298952, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 8153.05 } },
  { id: "eq-ex1-low-fuel", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 61.22049172298952, fuelLoad: "low", units: 1, includeMob: true }, expect: { fuel: 837.6 } },
  { id: "eq-ex1-location-0.99", kind: "machine", setting: { fuel_price_diesel: 6.276 }, location: 0.99, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 61.22049172298952, fuelLoad: "med", units: 1, includeMob: true }, expect: { equipment: 5795.46, locationLabel: "From the wage set: Equipment −1 %" } },
  // D-811: a class with no rental rate prices at the catalog's owned rate (SC-631-34: $311.06/hr without fuel), 10 hr:
  // $3,110.60 + fuel 9.06 gal/hr × 10 × $6.276 = $568.61, $3,679.21; read "owned rate (no rental in catalog)". SC-637-34
  // has neither rate: Missing data, the rental rate named.
  { id: "eq-owned-fallback", kind: "machine", ...DIESEL, input: { classKey: "SC-631-34", mode: "rental", period: "auto", hours: 10, fuelLoad: "med", units: 1, includeMob: false }, expect: { total: 3679.21, equipment: 3110.6, fuel: 568.61, missing: [], fallback: true } },
  { id: "eq-no-rate-at-all", kind: "machine", ...DIESEL, input: { classKey: "SC-637-34", mode: "rental", period: "auto", hours: 10, fuelLoad: "med", units: 1, includeMob: false }, expect: { total: null, missing: ["rent_day"], fallback: false } },
  { id: "eq-ex2-lift", kind: "machine", ...DIESEL, input: { classKey: "AW-AB-RT-60", mode: "rental", period: "auto", hours: 64, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 3895.13, equipment: 2740, fuel: 755.13, mob: 400 } },
  { id: "eq-ex2-lift-owned", kind: "machine", ...DIESEL, input: { classKey: "AW-AB-RT-60", mode: "owned", period: "hr", hours: 64, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 4497.21 } },
  { id: "eq-ex2-electric-missing-fuel", kind: "machine", ...DIESEL, input: { classKey: "AW-AB-EL-60", mode: "rental", period: "auto", hours: 64, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: null, equipment: 2746, missing: ["fuel_gph_med"] } },
  { id: "eq-no-fuel-price", kind: "machine", setting: {}, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 61.22049172298952, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: null, missing: ["fuel_price_diesel"] } },
  { id: "eq-operated-crane-minimum", kind: "machine", setting: {}, input: { classKey: "CR-HYD-40T-OP", mode: "operated", period: "hr", hours: 2, fuelLoad: "med", units: 1, includeMob: false }, expect: { total: 980 } },

  // The production engine (Block 2.2, plan §3.3): every formula cell of the catalog recomputed from
  // its stored inputs at release 1's settings, equal to the workbook's cached value; the D rows blank.
  { id: "eq-prod-catalog-cells", kind: "prod-catalog", expect: { cells: 965 } },
  { id: "eq-prod-d-rows-blank", kind: "prod-d", expect: { d: 228, notBlank: 0 } },
  { id: "eq-prod-efficiency-0.75", kind: "prod-one", setting: { job_efficiency: 0.75 }, equip: "EX-CRAWL-20T", activity: "EW-CUTLOAD", expect: { typ: 147.6, grade: "C" } },
  { id: "eq-prod-national", kind: "prod-one", setting: {}, equip: "EX-CRAWL-20T", activity: "EW-CUTLOAD", expect: { typ: 163.344, grade: "C", source: "national" } },
  { id: "eq-prod-haul-no-speeds", kind: "prod-one", setting: {}, equip: "DT-OP-3AXLE", activity: "EW-HAUL-TRK-05", expect: { typ: null, grade: "D" } },
  { id: "eq-convert-ccy-lcy", kind: "convert", qty: 1000, from: "CCY", to: "LCY", expect: { value: 1390 } },
  { id: "eq-convert-bcy-lcy", kind: "convert", qty: 1000, from: "BCY", to: "LCY", expect: { value: 1250 } },
  { id: "eq-pace-10000-bcy", kind: "pace", qty: 10000, unit: "BCY", rate: 163.344, rateUnit: "BCY/hr", units: 1, expect: { hours: 61.22049172298952 } },
  { id: "eq-pace-dot-per-day", kind: "pace", qty: 2400, unit: "LF", rate: 800, rateUnit: "LF/day", units: 1, expect: { hours: 24, days: 3 } },
  { id: "eq-pace-units-no-convert", kind: "pace", qty: 100, unit: "CY", rate: 800, rateUnit: "LF/day", units: 1, expect: { error: true } },

  // A host's components priced together (Block 3.1, D-724): the spread runs together.
  { id: "eq-host-spread-8hr", kind: "host", setting: { fuel_price_diesel: 6.276 }, qty: 10000, unit: "BCY", spread: { prod_per_day: 1000, prod_unit: "BCY" }, rows: [excavator(), operators()], expect: { equipment: 16699.56, crewHours: 80, labor: 8000 } },
  { id: "eq-host-spread-10hr", kind: "host", setting: { fuel_price_diesel: 6.276, hours_per_work_day: 10 }, qty: 10000, unit: "BCY", spread: { prod_per_day: 1000, prod_unit: "BCY" }, rows: [excavator(), operators()], expect: { equipment: 20324.46, crewHours: 100, labor: 10000 } },
  { id: "eq-host-catalog-path", kind: "host", setting: { fuel_price_diesel: 6.276 }, qty: 10000, unit: "BCY", rows: [excavator({ eq_units: 1 }), operators(1)], expect: { equipment: 8022.13, crewHours: 61.22049172298952 } },
  { id: "eq-host-operators-follow", kind: "host", setting: { fuel_price_diesel: 6.276 }, qty: 10000, unit: "BCY", spread: { prod_per_day: 1000, prod_unit: "BCY" }, rows: [excavator({ eq_units: 3 }), operators(2)], expect: { crewHours: 80, labor: 12000 } },
  { id: "eq-host-unlinked-labour", kind: "host", setting: { fuel_price_diesel: 6.276 }, qty: 10000, unit: "BCY", spread: { prod_per_day: 1000, prod_unit: "BCY" }, rows: [excavator(), operators(2, { spread_linked: false })], expect: { crewHours: 800, warning: "Crew 800.0 hr, spread 80.0 hr" } },
  { id: "eq-host-lift-crew-hours", kind: "host", setting: { fuel_price_diesel: 6.276 }, qty: 6400, unit: "SF", rows: [comp("lift", "equipment", { eq_class_key: "AW-AB-RT-60", eq_mode: "rental", eq_include_mob: true }), comp("crew", "labor", { position: 1, crew: [{ role: "TEST Electrician", count: 2, hourly_wage: 60 }], production_rate: 100, production_basis: "units_per_hr" })], expect: { equipment: 3895.13, crewHours: 64 } },
  { id: "eq-host-hand-entered-unchanged", kind: "host-same", qty: 120, unit: "LF", rows: [comp("eq", "equipment", { equip_rate: 450, equip_basis: "day", duration_formula: "QTY / 40", mob_demob: 300 }), comp("crew", "labor", { position: 1, crew: [{ role: "Laborer", count: 3, hourly_wage: 41.5 }], production_rate: 15, production_basis: "units_per_hr" })] },
  // Earthwork production tiers (Block 3.5, D-738): the spreads a tier swap and a count change
  // leave on the 10,000 BCY line (the tier lookup itself is the api's, driven in the smoke).
  { id: "eq-host-tier-500", kind: "host", setting: { fuel_price_diesel: 6.276 }, qty: 10000, unit: "BCY", spread: { prod_per_day: 500, prod_unit: "BCY" }, rows: [excavator({ eq_units: 1 }), operators(1)], expect: { equipment: 11841.56, crewHours: 160, labor: 8000 } },
  { id: "eq-host-scaled-3-of-2", kind: "host", setting: { fuel_price_diesel: 6.276 }, qty: 10000, unit: "BCY", spread: { prod_per_day: 1500, prod_unit: "BCY" }, rows: [excavator({ eq_units: 3 }), operators(1)], expect: { equipment: 21112.56, crewHours: 53.333333333333336 } },
  { id: "eq-host-snapshot-holds", kind: "host-snapshot", setting: { fuel_price_diesel: 6.276 }, qty: 10000, unit: "BCY", newDay: 900, newWeek: 2500, expect: { before: 8022.13, after: 8022.13, changed: true } },

  // A shared machine from the library (Block 3.3, D-736): the engine's total over the hosts'
  // machine-hours, spread by the existing allocation; the plan's shared variant.
  { id: "eq-shared-two-hosts", kind: "shared", setting: { fuel_price_diesel: 6.276 }, hosts: [{ id: "h1", machineHours: 61.22049172298952 }, { id: "h2", override: 20 }], expect: { total: 9411.08, h1: 7093.66, h2: 2317.42, unallocated: 0 } },
  { id: "eq-shared-one-excluded", kind: "shared", setting: { fuel_price_diesel: 6.276 }, hosts: [{ id: "h1", machineHours: 61.22049172298952 }, { id: "h2", override: 20, excluded: true }], expect: { total: 8022.13, h1: 8022.13, unallocated: 0 } },

  // A company machine and its own production (Block 4.2, D-740): 10,000 BCY at 150 BCY/hr owned.
  { id: "eq-custom-company-unit", kind: "machine", ...DIESEL, custom: { classes: [{ equip_key: "U-QT", category: "Company equipment", type: "TEST Excavator 20-25 t", size_class: "company unit", fuel_type: "diesel", transport_class: "lowboy-legal", default_mode: "owned", pricing_kind: "production", owned_rate_hr_excl_fuel: 85, fuel_gph_med: 2.78 }], activities: [], production: [{ equip_key: "U-QT", activity_key: "EW-CUTLOAD", method_id: "", prod_typ: 150, unit: "BCY/hr", basis: "Company rate", confidence: "U" }] }, input: { classKey: "U-QT", mode: "owned", period: "hr", hours: 10000 / 150, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 7929.82, fuel: 1163.15, mob: 1100 } },
  // A company machine list read against the library (Block 4.2, D-728): the plan's names.
  { id: "eq-match-machine-list", kind: "match", names: ["Excavator04, CAT 330", "Truck, 30 Ton Artic", "Dozer 12, CAT D6", "Loader 3, CAT 972", "Roller 7, 84 in smooth drum"], expect: { keys: ["EX-CRAWL-30T", "ADT-30T", "DZ-CRAWL-D6", "WL-MED-972", "CP-SD-84-SM"] } },

  // An assembly's shared-machine link (Block P1, D-742): the loader the plan links two pads to, and the one an
  // apply makes where none of that name exists. Hand-entered: $825/day, usage = each pad's 16 crew-hours.
  { id: "eq-p1-linked-two-pads", kind: "shared", setting: {}, resource: { name: "Loader 3 yd", rate: 825, basis: "day", eq_class_key: null, eq_units: null, eq_mode: null }, hosts: [{ id: "h1", crewHours: 16 }, { id: "h2", crewHours: 16 }], expect: { total: 3300, h1: 1650, h2: 1650, unallocated: 0 } },
  { id: "eq-p1-made-one-pad", kind: "shared", setting: {}, resource: { name: "Loader 3 yd", rate: 825, basis: "day", eq_class_key: null, eq_units: null, eq_mode: null }, hosts: [{ id: "h1", crewHours: 16 }], expect: { total: 1650, h1: 1650, unallocated: 0 } },

  // A library component applied from an assembly (Block 5.1, D-743): it resolves at the target project's layers
  // (fuel $5.00 there), on the shared machine the link made: 5,000 BCY at 163.344 BCY/hr = 30.6102 machine-hr.
  { id: "eq-5.1-mass-cut-applied", kind: "shared", setting: { fuel_price_diesel: 5 }, hosts: [{ id: "h1", machineHours: 5000 / 163.344 }], expect: { total: 4452.48, h1: 4452.48, unallocated: 0 } },

  // One site spread (Block 3.6, D-744): the founder's two Cut lines of 6,000 and 4,000 BCY in one division, 10,000
  // BCY at the 800+ tier's 1,000 BCY/day: lines of 48 and 32 hr on 2 × EX-CRAWL-20T shared (96 and 64 machine-hr,
  // 80 hr per machine). The same lines per line: each its own tier (6,000 → 1,000/day, 2 machines; 4,000 → 500/day, 1).
  { id: "eq-3.6-site-spread", kind: "shared", ...DIESEL, resource: { name: "TEST Cut to fill: Excavator", eq_units: 2 }, hosts: [{ id: "h1", machineHours: 48 * 2 }, { id: "h2", machineHours: 32 * 2 }], expect: { total: 16699.56, h1: 10019.74, h2: 6679.82, unallocated: 0 } },
  { id: "eq-3.6-per-line-6000", kind: "host", ...DIESEL, qty: 6000, unit: "BCY", spread: { prod_per_day: 1000, prod_unit: "BCY" }, rows: [excavator(), operators()], expect: { equipment: 11808.94, crewHours: 48 } },
  // The 4,000 BCY line per line: the TEST default under 5,000 BCY (500/day, D-738) puts it in the 200-799 tier: 1 machine,
  // 8 days, 64 hr: rental 2 weeks $5,854.00 + fuel $1,116.63 + mob $1,100.00 = $8,070.63 (the founder's corrected figure;
  // the brief's $9,170.63 was withdrawn, Day fixes 2026-10-23).
  { id: "eq-3.6-per-line-4000", kind: "host", ...DIESEL, qty: 4000, unit: "BCY", spread: { prod_per_day: 500, prod_unit: "BCY" }, rows: [excavator({ eq_units: 1 }), operators(1)], expect: { equipment: 8070.63, crewHours: 64 } },
  // An assembly's crew role with no rate at the project's wage set (D-747): missing data, never $0; one typed by hand
  // at $0 prices as before.
  { id: "eq-d747-wage-missing", kind: "host", setting: {}, qty: 100, unit: "SF", rows: [comp("crew", "labor", { crew: [{ role: "TEST Laborer", count: 2, hourly_wage: 0, rate_missing: true }], production_rate: 10, production_basis: "units_per_hr" })], expect: { labor: 0, errors: ["Missing data: wage for TEST Laborer"] } },
  { id: "eq-d747-typed-zero-unchanged", kind: "host", setting: {}, qty: 100, unit: "SF", rows: [comp("crew", "labor", { crew: [{ role: "TEST Laborer", count: 2, hourly_wage: 0 }], production_rate: 10, production_basis: "units_per_hr" })], expect: { labor: 0, crewHours: 10 } },

  // The earthwork starter's worked check (D-751): 10,000 BCY at A1's default 1,000 BCY/day, tier 900-1,399 (1 ×
  // EX-CRAWL-30T + 2 × ADT-30T), the activity's 10-hr day, diesel 6.276: 10 days, 100 hr a machine. By hand: EX 2 weeks
  // $8,038.00 + overtime 20 hr $2,009.50 + fuel 100 × 4.5 × 6.276 $2,824.20 + mob $3,600.00 = $16,471.70; ADT × 2
  // weeks $23,056.00 + overtime $5,764.00 + fuel 200 × 4.38 × 6.276 $5,497.78 + mob $7,200.00 = $41,517.78.
  { id: "eq-751-ex30-10hr", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-30T", mode: "rental", period: "auto", hours: 100, workDays: 10, hoursPerDay: 10, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 16471.70, fuel: 2824.20, mob: 3600 } },
  { id: "eq-751-adt30-10hr", kind: "machine", ...DIESEL, input: { classKey: "ADT-30T", mode: "rental", period: "auto", hours: 100, workDays: 10, hoursPerDay: 10, fuelLoad: "med", units: 2, includeMob: true }, expect: { total: 41517.78, fuel: 2748.89, mob: 3600 } },
  // (The breakdown's fuel and mob are one machine's: $2,748.89 and $3,600.00, × 2 in the total.)
  // The site machines on the activity's own work day (eq_hours_per_day 10, the library's 8 untouched).
  { id: "eq-751-site-ex30", kind: "shared", ...DIESEL, resource: { name: "Excavate and load: EX-CRAWL-30T", eq_class_key: "EX-CRAWL-30T", eq_units: 1, eq_hours_per_day: 10 }, hosts: [{ id: "h1", machineHours: 100 }], expect: { total: 16471.70, h1: 16471.70, unallocated: 0 } },
  { id: "eq-751-site-adt30", kind: "shared", ...DIESEL, resource: { name: "Excavate and load: ADT-30T", eq_class_key: "ADT-30T", eq_units: 2, eq_hours_per_day: 10 }, hosts: [{ id: "h1", machineHours: 200 }], expect: { total: 41517.78, h1: 41517.78, unallocated: 0 } },
  // A line on its activity's work day: 10,000 BCY at 1,000/day, 10 hr → 100 crew-hr (8 without it → 80).
  { id: "eq-751-line-10hr", kind: "host", ...DIESEL, qty: 10000, unit: "BCY", spread: { prod_per_day: 1000, prod_unit: "BCY", hours_per_day: 10 }, rows: [excavator({ eq_class_key: "EX-CRAWL-30T", eq_units: 1 }), operators(1)], expect: { equipment: 16471.70, crewHours: 100 } },

  // A hired operated machine's mob is in its hourly rate (D-756): DT-OP-3AXLE 100 hr × $106.14 = $10,614.00, never
  // missing; five shared over 500 machine-hr, $53,070.00. A road vehicle drives to site (Q175, D-996, release 32):
  // WT-2000 40 hr over 5 days is 1 week $1,752.00 + fuel 4.42 gal/hr × 40 hr × $6.276 = $1,109.60, mob none: $2,861.60.
  // A self-propelled BARE machine that does not drive in keeps the rule: PV-DIST-550's mob is missing (its rates too),
  // and a shared one flags every line it serves, never a silent $0.
  // WT-4000 (D-892): 40 hr over 5 days is 1 week $3,067.00, fuel low 5.95 gal/hr × 40 hr × $6.276 = $1,493.69, mob none: $4,560.69.
  // On fine grade (D-894 Q4) at A11's tier 3, × 0.5: half of $4,560.688 = $2,280.34; its flag is off (the starter's optional count is 10).
  { id: "eq-894-wt4000-fine-grade", kind: "machine", ...DIESEL, input: { classKey: "WT-4000", mode: "rental", period: "auto", hours: 40, workDays: 5, fuelLoad: "low", units: 0.5, includeMob: true }, expect: { total: 2280.344, mob: 0, missing: [] } },
  { id: "eq-892-wt4000", kind: "machine", ...DIESEL, input: { classKey: "WT-4000", mode: "rental", period: "auto", hours: 40, workDays: 5, fuelLoad: "low", units: 1, includeMob: true }, expect: { total: 4560.69, mob: 0, missing: [] } },
  { id: "eq-756-operated-no-mob", kind: "machine", setting: {}, input: { classKey: "DT-OP-3AXLE", mode: "operated", period: "hr", hours: 100, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 10614, mob: 0, missing: [] } },
  { id: "eq-996-drives-in", kind: "machine", ...DIESEL, input: { classKey: "WT-2000", mode: "rental", period: "auto", hours: 40, workDays: 5, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 2861.6, mob: 0, missing: [] } },
  { id: "eq-756-bare-self-propelled", kind: "machine", ...DIESEL, input: { classKey: "PV-DIST-550", mode: "rental", period: "auto", hours: 40, workDays: 5, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: null, missing: ["rent_day", "mob"] } },
  { id: "eq-756-shared-trucks", kind: "shared", setting: {}, resource: { name: "Haul off: DT-OP-3AXLE", eq_class_key: "DT-OP-3AXLE", eq_units: 5, eq_mode: "operated", eq_hours_per_day: 10 }, hosts: [{ id: "h1", machineHours: 300 }, { id: "h2", machineHours: 200 }], expect: { total: 53070, h1: 31842, h2: 21228, unallocated: 0, flagged: 0 } },
  { id: "eq-756-shared-missing-flags", kind: "shared", ...DIESEL, resource: { name: "TEST distributor", eq_class_key: "PV-DIST-550", eq_units: 1, eq_mode: "rental" }, hosts: [{ id: "h1", machineHours: 24 }, { id: "h2", machineHours: 16 }], expect: { total: 0, flagged: 2, unflagged: 0 } },
  // An assembled crane is the exception (D-756): operated, crane-assembled, its mob/demob is a required quote.
  // CR-HYD-165T-OP 10 hr × $520 = $5,200.00; with a $6,000.00 quote, $11,200.00. Shared, it flags both its lines.
  { id: "eq-756-crane-quote-required", kind: "machine", setting: {}, input: { classKey: "CR-HYD-165T-OP", mode: "operated", period: "hr", hours: 10, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: null, missing: ["mob"] } },
  { id: "eq-756-crane-quoted", kind: "machine", setting: {}, input: { classKey: "CR-HYD-165T-OP", mode: "operated", period: "hr", hours: 10, fuelLoad: "med", units: 1, includeMob: true, mobQuote: 6000 }, expect: { total: 11200, mob: 6000, missing: [] } },
  { id: "eq-756-crane-shared-flags", kind: "shared", setting: {}, resource: { name: "TEST assembled crane", eq_class_key: "CR-HYD-165T-OP", eq_units: 1, eq_mode: "operated" }, hosts: [{ id: "h1", machineHours: 6 }, { id: "h2", machineHours: 4 }], expect: { total: 0, flagged: 2, unflagged: 0 } },
  // Every operated crane-assembled class in the catalog asks for the quote (5 today); no other operated class does.
  { id: "eq-756-crane-catalog", kind: "crane-catalog", setting: {}, expect: { cranes: 5, cranesWithoutQuote: 0, othersAsking: 0 } },
  // A library machine on the user's own values (D-758): RDT-772 has no rental rates in the library; own day $1,000,
  // week $3,000, 4 weeks $9,000 and a $2,000 mob quote, 40 machine-hr at 8 hr a day = 5 days: 1 week $3,000 + fuel
  // 40 x 7.6 (the library's) x $6.276 = $1,907.90 + mob $2,000 = $6,907.90. Without them the library has no rate.
  { id: "eq-758-own-values", kind: "shared", ...DIESEL, resource: { name: "TEST rigid truck", eq_class_key: "RDT-772", eq_units: 1, eq_mode: "rental", eq_snapshot: { release: 1, at: "", classKey: "RDT-772", activityKey: null, class: {}, production: null, transport: null, own: { rent_day: 1000, rent_week: 3000, rent_4wk: 9000, mob_quote: 2000 } } }, hosts: [{ id: "h1", machineHours: 24 }, { id: "h2", machineHours: 16 }], expect: { total: 6907.9, h1: 4144.74, h2: 2763.16, flagged: 0 } },
  { id: "eq-758-library-only", kind: "shared", ...DIESEL, resource: { name: "TEST rigid truck", eq_class_key: "RDT-772", eq_units: 1, eq_mode: "rental" }, hosts: [{ id: "h1", machineHours: 24 }, { id: "h2", machineHours: 16 }], expect: { total: 0, flagged: 2, unflagged: 0 } },
  // Every catalog class as a shared machine on two lines (D-756): any with missing data flags both lines.
  { id: "eq-756-shared-flag-catalog", kind: "shared-flag-catalog", ...DIESEL, expect: { unflagged: 0 } },

  // My equipment (F34, D-759): the list orders and filters what pickers offer, never a price. (1) A default
  // workspace (empty list, show all) is offered every live class, 642, none under My equipment. (2) Mine-only with
  // three on the list (one a custom machine) offers exactly those three first, and the full search still reaches
  // all 642 national classes plus the custom one. (3) EX-CRAWL-30T on the starter's worked check prices $16,471.70
  // on the list, off it, and off it in mine-only mode.
  { id: "eq-759-default-offers-all", kind: "suggest", setting: {}, expect: { mine: 0, offered: 642, folded: false } },
  { id: "eq-759-mine-only", kind: "suggest", setting: {}, myEquipment: ["EX-CRAWL-30T", "ADT-30T", "U-TEST1"], mineOnly: true, custom: { classes: [{ equip_key: "U-TEST1", category: "Company equipment", type: "TEST Loader", size_class: "TEST 3 yd", pricing_kind: "duration", custom: true }], activities: [], production: [] }, expect: { mine: 3, mineKeys: ["ADT-30T", "EX-CRAWL-30T", "U-TEST1"], folded: true, full: 643, fullNational: 642 } },
  { id: "eq-759-on-list-prices", kind: "machine", ...DIESEL, myEquipment: ["EX-CRAWL-30T"], input: { classKey: "EX-CRAWL-30T", mode: "rental", period: "auto", hours: 100, workDays: 10, hoursPerDay: 10, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 16471.70, fuel: 2824.20, mob: 3600 } },
  { id: "eq-759-off-list-prices", kind: "machine", ...DIESEL, myEquipment: ["ADT-30T"], input: { classKey: "EX-CRAWL-30T", mode: "rental", period: "auto", hours: 100, workDays: 10, hoursPerDay: 10, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 16471.70, fuel: 2824.20, mob: 3600 } },
  { id: "eq-759-off-list-mine-only-prices", kind: "machine", ...DIESEL, myEquipment: ["ADT-30T"], mineOnly: true, input: { classKey: "EX-CRAWL-30T", mode: "rental", period: "auto", hours: 100, workDays: 10, hoursPerDay: 10, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 16471.70, fuel: 2824.20, mob: 3600 } },

  // The founder's spread numbers at machine level (2 × EX-CRAWL-20T; the spread itself is Block 3.1).
  { id: "eq-spread-8hr", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 80, workDays: 10, hoursPerDay: 8, fuelLoad: "med", units: 2, includeMob: true }, expect: { total: 16699.56 } },
  { id: "eq-spread-10hr", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 100, workDays: 10, hoursPerDay: 10, fuelLoad: "med", units: 2, includeMob: true }, expect: { total: 20324.46 } },
  { id: "eq-spread-500", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 11841.56 } },
  { id: "eq-spread-3-machines", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 53.333333333333336, workDays: 6.666666666666667, hoursPerDay: 8, fuelLoad: "med", units: 3, includeMob: true }, expect: { total: 21112.56 } },

  // --- Clearing by class (D-1039, release 37): heavy and medium differ from light in machines and crew ----------
  // Each class's tier as the starter holds it: its dozers, its other machines, the laborers, and the operators the
  // starter adds (one per machine whose class an operating engineer runs, none for a saw the crew runs or an
  // attachment). Its machines' rental for one 5-day week (40 hr at 8 hr/day), diesel $6.276, gasoline $4.00, no mob.
  // By hand: the large dozer, week $12,092 (5 days at $4,170 = $20,850) + 8.59 gal/hr × 40 × $6.276 = $2,156.43:
  // $14,248.43 (light: that alone).
  // Medium: + 20-25 t excavator week $2,927 + 2.78 × 40 × $6.276 = $697.89 ($3,624.89), its box grapple week $975 (no
  // fuel), 2 chainsaws at week $224 = $448 + 0.25 × 40 × 2 × $4.00 = $80 ($528): $14,248.43 + $3,624.89 + $975 + $528 =
  // $19,376.32 (19,376.3248).
  // Heavy: + 30-36 t excavator week $4,019 + 4.5 × 40 × $6.276 = $1,129.68 ($5,148.68), its thumb week $701, 3
  // chainsaws $672 + 0.25 × 40 × 3 × $4.00 = $120 ($792): $14,248.43 + $5,148.68 + $701 + $792 = $20,890.11 (20,890.1136).
  { id: "clearing-light-spread", kind: "starter-spread", activity: "A55", setting: { fuel_price_diesel: 6.276, fuel_price_gasoline: 4 }, input: { hours: 40, workDays: 5, hoursPerDay: 8 }, expect: { dozers: 1, others: "", laborers: 1, operators: 1, rental: 14248.43, missing: [] } },
  { id: "clearing-medium-spread", kind: "starter-spread", activity: "A56", setting: { fuel_price_diesel: 6.276, fuel_price_gasoline: 4 }, input: { hours: 40, workDays: 5, hoursPerDay: 8 }, expect: { dozers: 1, others: "AT-GRAPPLE-20T×1 EX-CRAWL-20T×1 LC-CHAINSAW-18×2 (crew runs)", laborers: 2, operators: 2, rental: 19376.32, missing: [] } },
  { id: "clearing-heavy-spread", kind: "starter-spread", activity: "A57", setting: { fuel_price_diesel: 6.276, fuel_price_gasoline: 4 }, input: { hours: 40, workDays: 5, hoursPerDay: 8 }, expect: { dozers: 1, others: "AT-THUMB-30T×1 EX-CRAWL-30T×1 LC-CHAINSAW-18×3 (crew runs)", laborers: 3, operators: 2, rental: 20890.11, missing: [] } },
  // Debris haul-off with a loader (D-1039), without the spotter (D-1043, release 39): clearing_haul maps to A95 "Load
  // and haul off debris (from piles)", a haul activity (the D-1035 cycle runs A6, A7, A8 and A95) copied from A6: its
  // first tier (the 0-499 LCY band's) loads 2 trucks with a 3 yd wheel loader, the foreman's 0.25 share, no spotter
  // (A6's tier 1 has a 0.5 spotter). Topsoil haul-off keeps A6 as it is: the same loader and trucks, the foreman's 0.25
  // and the 0.5 spotter.
  { id: "clearing-haul-loader", kind: "starter-role", role: "clearing_haul", tier: 1, expect: { activity: "A95", haul: true, loaders: "WL-SMALL-3Y×1", trucks: 2, foremen: 0.25, spotters: 0 } },
  { id: "strip-haul-keeps-a6", kind: "starter-role", role: "strip_haul", tier: 1, expect: { activity: "A6", haul: true, loaders: "WL-SMALL-3Y×1", trucks: 2, foremen: 0.25, spotters: 0.5 } },
  // Its top tier (2,521 LCY/day and up) as A6's: the 4.5 yd loader, 22 trucks, the foreman's 0.5 share, no spotter.
  { id: "clearing-haul-top-tier", kind: "starter-role", role: "clearing_haul", tier: 11, expect: { activity: "A95", loaders: "WL-MED-45Y×1", trucks: 22, foremen: 0.5, spotters: 0 } },

  // --- D-1287 (Plan B B2, B3, B8): the rental's extras, the sales tax on equipment rental, the ratios, owned standby -------
  // Worked by hand from docs/tasks/equipment_library_improvements.md §9 and 34 TAC §3.294 (read 2026-11-16). Common: the
  // 20-25 t excavator EX-CRAWL-20T, day $1,040 / week $2,927 / 4-week $7,950, owned $97.76/hr without fuel (library, A);
  // one 4-week rental is 160 hr over 20 work days at 8 hr; Houston 8.25 % (D-1139). The Texas rule as the bench's
  // eqlib.eq_rental_tax_state row holds it (checked against the row by `quantity-table.py d1287`). The tax is the Bid
  // summary's own line: the machines' taxable parts summed, then taxed and rounded to the cent once (bidSummary.ts
  // `toCents`), so the §9 waiver row reads 8,904 x 0.0825 = 734.58, not 655.88 + 78.71 = 734.59 rounded per part.
  // Each row sets the extras it needs (an estimate's own values, as the api's bundle would carry them); a row that sets
  // none prices as before D-1287 (no setting in the hand-built bundle is read as off).
  //
  // eq-tax-rental: one 4-week rental, no waiver or fee: 7,950 x 0.0825 = 655.875 -> $655.88; taxable 7,950.
  { id: "eq-tax-rental", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 0 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { equipment: 7950, taxable: 7950, tax: 655.88, applies: true } },
  // eq-tax-exempt-job: the same on a MUD's job (Public, New construction: an exempt owner, the project's Tax exempt on):
  //   Texas lists no exempt job type, and the checkbox does not reach rentals (§3.294(e)): still $655.88; the material
  //   tax line is $0 (exempt). Not $0.
  { id: "eq-tax-exempt-job", kind: "rental", ...DIESEL, rule: "TX", jobType: "nonresidential_new", taxExempt: true, extras: { waiver: 0, env: 0 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { taxable: 7950, tax: 655.88, materialTaxPct: 0, applies: true } },
  // eq-tax-untabled: the same in Georgia before its row is read (grade F): $0, and Needs attention's words.
  { id: "eq-tax-untabled", kind: "rental", ...DIESEL, rule: "GA", extras: { waiver: 0, env: 0 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { taxable: 0, tax: 0, applies: false, notLoaded: "Rental tax rule for GA not loaded: 0 %" } },
  // eq-tax-owned: the machine owned, 160 hr: 160 x 97.76 = 15,641.60, no lease, no tax; the 12 % waiver is not taken on it.
  { id: "eq-tax-owned", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 12, env: 1.3, cap: 75 }, input: { classKey: "EX-CRAWL-20T", mode: "owned", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { equipment: 15641.6, waiver: 0, envFee: 0, taxable: 0, tax: 0 } },
  // eq-tax-delivery: the dealer's delivery and pickup, $550 + $550 (a typed mob of $1,100): (d)(3), 1,100 x 0.0825 = $90.75;
  //   the rental's own taxable 7,950 beside it (all taxed 9,050 x 0.0825 = 746.625 -> $746.63).
  { id: "eq-tax-delivery", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 0, byDealer: 1 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: true, mobQuote: 1100 }, expect: { delivery: 1100, deliveryTax: 90.75, taxable: 9050, tax: 746.63 } },
  // eq-tax-delivery-hauler: the same haul billed by a third-party carrier: not taxable, $0; the rental's 655.88 alone.
  { id: "eq-tax-delivery-hauler", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 0, byDealer: 0 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: true, mobQuote: 1100 }, expect: { delivery: 0, deliveryTax: 0, taxable: 7950, tax: 655.88, deliveredBy: "third_party" } },
  // D-1289 (Q14): IntelCost's setting 2, delivery by the transport class. EX-CRAWL-20T is lowboy-legal (a hauler): its
  //   $1,100 not taxed, as eq-tax-delivery-hauler. AW-1MAN-12 is delivered-by-supplier (the dealer): 20 work days on the
  //   4-week $466 (electric, no fuel), a typed $300 delivery taxed: 466 + 300 = 766 x 0.0825 = 63.195 -> $63.20.
  { id: "q14-class-lowboy-hauler", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 0, byDealer: 2 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: true, mobQuote: 1100 }, expect: { delivery: 0, taxable: 7950, tax: 655.88, deliveredBy: "third_party" } },
  { id: "q14-class-supplier-dealer", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 0, byDealer: 2 }, input: { classKey: "AW-1MAN-12", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: true, mobQuote: 300 }, expect: { equipment: 466, delivery: 300, deliveryTax: 24.75, taxable: 766, tax: 63.2, deliveredBy: "dealer" } },
  // D-1289 (Q14, the founder's correction, 2026-11-16 16:35): IntelCost's 3, delivery by ownership. EX-CRAWL-20T rented
  //   (a lowboy class): the dealer's $1,100 delivery taxed, as eq-tax-delivery (9,050 x 0.0825 = 746.625 -> $746.63);
  //   owned, 160 hr at 97.76 with the same $1,100 move: the company's own trucks or a hauler, nothing taxed.
  { id: "q14-ownership-rented", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 0, byDealer: 3 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: true, mobQuote: 1100 }, expect: { delivery: 1100, taxable: 9050, tax: 746.63, deliveredBy: "dealer" } },
  { id: "q14-ownership-owned", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 0, byDealer: 3 }, input: { classKey: "EX-CRAWL-20T", mode: "owned", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: true, mobQuote: 1100 }, expect: { delivery: 0, taxable: 0, tax: 0, deliveredBy: "own" } },
  // D-1289 (Q12, the founder 2026-11-16 16:35): the exported lines' tax spread by largest remainder. Three equal shares of
  //   $0.10: 3.33 cents each, floors 3 + 3 + 3, the cent left to the earliest: 0.04, 0.03, 0.03. Four lines (the waiver
  //   row's 8,904, a dealer delivery's 1,100, none, the shared excavator's 2,333.07) at 8.25 %: the sheet's fold
  //   toCents(12,337.07 x 0.0825 = 1,017.808275) = 1,017.81; parts 734.58, 90.75, 0, 192.478275 -> floors 734.58, 90.75,
  //   0, 192.47, the cent left to the largest remainder (the last): 192.48; they add to 1,017.81 exactly.
  { id: "q12-spread-ties", kind: "spread", shares: [1, 1, 1], total: 0.1, expect: { parts: [0.04, 0.03, 0.03], sum: 0.1 } },
  { id: "q12-spread-lines", kind: "spread", shares: [8904, 1100, 0, 2333.07], total: 1017.81, expect: { parts: [734.58, 90.75, 0, 192.48], sum: 1017.81 } },
  // D-1289 (Q14): the company's 1 (the dealer) over the class: the lowboy's $1,100 taxed again, as eq-tax-delivery.
  { id: "q14-company-dealer-over-class", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 0, byDealer: 1 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: true, mobQuote: 1100 }, expect: { delivery: 1100, taxable: 9050, tax: 746.63, deliveredBy: "dealer" } },
  // D-1289 (Q18): no project state, the company's (TX, the api's from: "workspace"): taxed as eq-tax-delivery-hauler, flagged;
  //   no state anywhere: 0, and the flag asks for a default state.
  { id: "q18-company-state", kind: "rental", ...DIESEL, rule: "TX", ruleFrom: "workspace", extras: { waiver: 0, env: 0 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { taxable: 7950, tax: 655.88, applies: true, companyState: "No state on the project: the company's state (TX) is used for the sales tax on equipment rental", notLoaded: null } },
  { id: "q18-no-state", kind: "rental", ...DIESEL, rule: "none", extras: { waiver: 0, env: 0 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { tax: 0, applies: false, companyState: null, notLoaded: "No state on the project or the company: sales tax on equipment rental not charged. Set the company's default state (Settings › General), or the project's" } },
  // D-1289 (Q12): the exported bid folds the tax into the line: the waiver row's taxable 8,904 x 0.0825 = 734.58 on the
  //   line's equipment (withRentalTax), Direct cost up by the same 734.58, no line of its own, the Bid total unchanged.
  { id: "q12-fold-into-unit-price", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 12, env: 0 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { tax: 734.58, lineTaxDelta: 734.58, foldDirectDelta: 734.58, foldHasLine: false, foldTotalSame: true } },
  // eq-tax-operated: an operated tri-axle dump truck on one hourly rate, 8 hr: $106.14 x 8 = $849.12, a service under
  //   §3.294(c)(2): $0; no waiver or fee on it.
  { id: "eq-tax-operated", kind: "rental", setting: {}, rule: "TX", extras: { waiver: 12, env: 1.3, cap: 75 }, input: { classKey: "DT-OP-3AXLE", mode: "operated", period: "hr", hours: 8, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: true, travelHours: 0 }, expect: { equipment: 849.12, waiver: 0, envFee: 0, taxable: 0, tax: 0 } },
  // eq-waiver-default: the 12 % default waiver on the 4-week: 954.00; taxable 7,950 + 954 = 8,904; tax 734.58; rent + waiver +
  //   tax $9,638.58 (was $7,950). The fee off here (it has its own row).
  { id: "eq-waiver-default", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 12, env: 0 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { waiver: 954, taxable: 8904, tax: 734.58, rentWaiverTax: 9638.58 } },
  // eq-waiver-own: "Own insurance (0 %)": 7,950 + 655.88 = $8,605.88.
  { id: "eq-waiver-own", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 0 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { waiver: 0, rentWaiverTax: 8605.88 } },
  // eq-env-fee: 1.3 % capped at $75 a line: the 4-week 7,950 x 0.013 = 103.35 -> $75 (capped); the 6 in self-priming
  //   diesel trash pump PMP-SP-6D one week (5 days, 40 hr), $1,112 x 0.013 = 14.456 -> $14.46 (under the cap). Taxable
  //   with the rental (the lessor's fee, read under §3.294(d), C): 7,950 + 75 = 8,025 -> 662.06; 1,126.456 -> 92.93.
  { id: "eq-env-fee", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 1.3, cap: 75 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { envFee: 75, envCapped: true, taxable: 8025, tax: 662.06 } },
  { id: "eq-env-fee-pump-week", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 1.3, cap: 75 }, input: { classKey: "PMP-SP-6D", mode: "rental", period: "auto", hours: 40, workDays: 5, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { equipment: 1112, envFee: 14.46, envCapped: false, taxable: 1126.46, tax: 92.93 } },
  // eq-ratio-derive (B8): a company machine rated by the day only, $500: week 500 x 2.90 = $1,450; 4-week 1,450 x 2.73 =
  //   $3,958.50 (the library's medians, release 47's settings); priced by the week and by the 4-week (fixed periods).
  { id: "eq-ratio-derive-week", kind: "rental", setting: {}, custom: { classes: [{ equip_key: "U-TEST-DAY", category: "Company equipment", type: "TEST Compactor", size_class: "TEST day only", rent_day: 500, fuel_type: "None", pricing_kind: "duration", default_mode: "rental", custom: true }], activities: [], production: [] }, input: { classKey: "U-TEST-DAY", mode: "rental", period: "wk", hours: 40, workDays: 5, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { equipment: 1450, derived: ["wk", "4wk"] } },
  { id: "eq-ratio-derive-4wk", kind: "rental", setting: {}, custom: { classes: [{ equip_key: "U-TEST-DAY", category: "Company equipment", type: "TEST Compactor", size_class: "TEST day only", rent_day: 500, fuel_type: "None", pricing_kind: "duration", default_mode: "rental", custom: true }], activities: [], production: [] }, input: { classKey: "U-TEST-DAY", mode: "rental", period: "4wk", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { equipment: 3958.5, derived: ["wk", "4wk"] } },
  // The ratios the library carries since migration d1287c6e2a91 (release 47): 2.90 and 2.73.
  { id: "eq-ratio-settings", kind: "ratios", expect: { weekPerDay: 2.9, fourWeekPerWeek: 2.73 } },
  // A monthly-only class (a 12 x 60 site office, $675 a 4-week) is never priced by a derived day: 5 days still bill the 4-week.
  { id: "eq-ratio-no-shorter", kind: "rental", setting: {}, input: { classKey: "OFF-12x60", mode: "rental", period: "auto", hours: 40, workDays: 5, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { equipment: 675, derived: [] } },
  // eq-standby-owned (B8): the owned 20 t on Plan A's rain-june-ew lost days, (3.6 + 4.928) x 5/7 = 6.0914 (exact 42.64 / 7),
  //   over June's 30/7 weeks: 97.76 x 0.22 = 21.5072/hr x 8 hr x 6.0914 = $1,048.08 (48.73 hr, under 40 a week).
  { id: "eq-standby-owned", kind: "standby", rate: 97.76, lostDays: 42.64 / 7, hoursPerDay: 8, weeks: 30 / 7, expect: { rate: 21.5072, hours: 48.73, cost: 1048.08 } },
  // The week's cap: 7 lost days in one week: 56 hr capped at 40: 21.5072 x 40 = $860.29.
  { id: "eq-standby-owned-week-cap", kind: "standby", rate: 97.76, lostDays: 7, hoursPerDay: 8, weeks: 1, expect: { hours: 40, cost: 860.29 } },
  // Wired, and $0 until lost days exist: the owned machine with no lost days prices exactly as eq-tax-owned (no standby).
  { id: "eq-standby-owned-none-yet", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 12, env: 1.3, cap: 75 }, input: { classKey: "EX-CRAWL-20T", mode: "owned", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false }, expect: { equipment: 15641.6, standby: null } },
  // B8 (c): the owned rate's source: the library's FEMA 2025 schedule is named a reimbursement rate; a company's own rate
  //   (My equipment's page, the workspace layer) is read first and named so.
  { id: "eq-owned-fema-label", kind: "owned-source", key: "EX-CRAWL-20T", expect: { source: "FEMA reimbursement rate", rate: 97.76 } },
  { id: "eq-owned-company-first", kind: "owned-source", key: "EX-CRAWL-20T", company: 85, expect: { source: "Company rate", rate: 85 } },

  // The independent check's additions (D-1287, Phase C).
  // eq-tax-shared-adds-back: a shared 20 t excavator (rented, the defaults: waiver 12 %, fee 1.3 % capped $75, delivery by the
  //   dealer) serving two lines, 96 + 64 = 160 machine-hours: one 4-week. Its taxable part 7,950 + 954 + 75 + its delivery
  //   and pickup 1,100 (lowboy, 50 mi) = 10,079; waiver 954; fee 75. The lines' shares add back to the machine's own.
  { id: "eq-tax-shared-adds-back", kind: "shared-parts", ...DIESEL, rule: "TX", extras: { waiver: 12, env: 1.3, cap: 75, byDealer: 1 }, pooled: false, expect: { machineTaxable: 10079, hostsTaxable: 10079, hostsWaiver: 954, hostsEnv: 75 } },
  // eq-tax-pooled-adds-back: the same 160 hours as a host (96 h) and a machine pooled onto it (64 h): the group's booking is
  //   the host's extended to 160 h, so the group carries the same taxable part, 10,079, spread over its two machines' lines.
  { id: "eq-tax-pooled-adds-back", kind: "shared-parts", ...DIESEL, rule: "TX", extras: { waiver: 12, env: 1.3, cap: 75, byDealer: 1 }, pooled: true, expect: { hostsTaxable: 10079, hostsWaiver: 954, hostsEnv: 75 } },
  // eq-tax-no-double: Equipment ticked on the general sales tax beside Material: $1,000 material, $10,000 equipment of which
  //   $8,000 is the rentals' taxable part, taxed on its own line: general (1,000 + 2,000) x 0.0825 = 247.50; rentals
  //   8,000 x 0.0825 = 660.00; never 1,072.50 + 660.
  { id: "eq-tax-no-double", kind: "bid-ticks", totals: { directCost: 11000, materialCost: 1000, equipmentCost: 10000, rentalTax: { taxable: 8000, applies: true } }, ticks: ["material", "equipment"], expect: { tax: 247.5, rental: 660 } },
  // eq-env-fee-six-pumps: six 6 in pumps on one line for a week: the fee is capped per machine's booking, 6 x 14.456 =
  //   86.736 -> $86.74 (a cap per dealer contract line holding all six would give $75: the founder's question). Taxable
  //   6 x 1,126.456 = 6,758.736; tax 557.60.
  { id: "eq-env-fee-six-pumps", kind: "rental", ...DIESEL, rule: "TX", extras: { waiver: 0, env: 1.3, cap: 75 }, input: { classKey: "PMP-SP-6D", mode: "rental", period: "auto", hours: 40, workDays: 5, hoursPerDay: 8, fuelLoad: "med", units: 6, includeMob: false }, expect: { lineEnvFee: 86.74, taxable: 6758.74, tax: 557.6 } },

  // --- Small quantities on machines already on site (D-1040, release 38; the api's choice is `onsite` above) -----
  // A machine on site lends a small line its hours at its hourly rate (`period: "site"`): no period, no minimum, no
  // mob. The 20-25 t excavator, 0.4 hr: day $1,040 ÷ 8 = $130/hr × 0.4 = $52.00 + fuel 2.78 gal/hr × 0.4 × $6.276 =
  // $6.98 (6.978912): $58.98, mob none (asked for, still none). Today's tier on the same 0.4 hr bills a day, $1,040 +
  // $6.98 + its mob $1,100 = $2,146.98. An operated road dump truck on site, 1.5 hr: $106.14 × 1.5 = $159.21.
  { id: "onsite-machine-rental", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "site", hours: 0.4, workDays: 0.05, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 58.98, equipment: 52, fuel: 6.98, mob: null } },
  { id: "onsite-machine-tier-today", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 0.4, workDays: 0.05, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 2146.98, equipment: 1040, mob: 1100 } },
  { id: "onsite-machine-operated", kind: "machine", setting: {}, input: { classKey: "DT-OP-3AXLE", mode: "operated", period: "site", hours: 1.5, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 159.21, equipment: 159.21, mob: null } },
  // A 20 CCY fill line at 400 CCY/day (0.05 day, 0.4 hr at 8 hr/day), by machines on site: the excavator $58.98 and
  // the 84 in roller (day $700 ÷ 8 = $87.50 × 0.4 = $35.00 + 2.91 × 0.4 × $6.276 = $7.31, 7.305264) = $101.28
  // (101.284176); the crew at the api's half-day for the small lines (crew production 20 ÷ 0.5 = 40 CCY/day): 0.4 ×
  // 400 ÷ 40 = 4 hr × ($50 + $50 + $40) = $560, "Minimum half day". Today's tier on the same line (the excavator
  // alone, a day and its mob): $2,146.98; its crew at its own half-day floor, 4 hr × ($50 + $40) = $360.
  { id: "onsite-host-small-fill", kind: "host", ...DIESEL, qty: 20, unit: "CCY", spread: { prod_per_day: 400, prod_unit: "CCY", crew_prod_per_day: 40, note: "By machines on site: Cut to fill: excavator, Subgrade: roller" }, rows: [comp("ex", "equipment", { eq_class_key: "EX-CRAWL-20T", eq_mode: "rental", eq_period: "site", eq_units: 1, eq_fuel_load: "med", eq_include_mob: false }), comp("roller", "equipment", { position: 1, eq_class_key: "CP-SD-84-SM", eq_mode: "rental", eq_period: "site", eq_units: 1, eq_fuel_load: "med", eq_include_mob: false }), comp("crew", "labor", { position: 2, crew: [{ role: "TEST Operator", count: 1, hourly_wage: 50, for_equipment: "ex" }, { role: "TEST Operator", count: 1, hourly_wage: 50, for_equipment: "roller" }, { role: "TEST Laborer", count: 1, hourly_wage: 40 }], production_rate: 12.5, production_basis: "units_per_hr" })], expect: { equipment: 101.28, crewHours: 4, labor: 560, warning: "Minimum half day" } },
// D-1345 (the founder's D-1342 Q3, D-1343): the one-time "Pricing rule changed (rental billing, …)" note. The kept
  //   pre-D-1336 solver (`equipment/periodsBefore.ts`, work days 1 / 5 / 20, overtime over 8 h × billed days) against
  //   today's, and the amount: now less before. EX-CRAWL-20T $1,040 / $2,927 / $7,950.
  // rule-solve-16d-10h: 16 work days × 10 h = 160 h. Now: 22 days on rent, one 4-week $7,950 carrying 160 h, no
  //   overtime. Before: 16 billed work days, one 4-week $7,950 (3 weeks + 1 day $9,821), 160 − 8 × 16 = 32 h overtime at
  //   the 4-week's $7,950 ÷ 160 = $49.6875 = $1,590 → $9,540. Now less before: −$1,590.00.
  { id: "rule-solve-16d-10h", kind: "rule-solve", rates: [1040, 2927, 7950], days: 16, hours: 160, expect: { nowCost: 7950, beforeCost: 9540, beforeBilledDays: 16, beforeOvertimeHours: 32, beforeOvertimeCost: 1590, beforeLabel: "one 4-week", delta: -1590 } },
  // rule-solve-7d-10h-same: 7 × 10 h = 70 h. Now: 9 days, week + 2 days $5,007 carrying 56 h, 14 h × 5,007 ÷ 56 =
  //   $1,251.75. Before: 7 billed days, week + 2 days $5,007, 70 − 56 = 14 h at (5 × 2,927 ÷ 40 + 2 × 1,040 ÷ 8) ÷ 7 =
  //   $89.41071 = $1,251.75. Both $6,258.75: nothing moved, $0 (no note).
  { id: "rule-solve-7d-10h-same", kind: "rule-solve", rates: [1040, 2927, 7950], days: 7, hours: 70, expect: { nowCost: 6258.75, beforeCost: 6258.75, beforeBilledDays: 7, beforeOvertimeHours: 14, beforeLabel: "1 week + 2 days", delta: 0 } },
  // rule-solve-friday-fixed-day: by the day, 3 work days from a Friday (start 2027-01-08). Now: Fri, Sat, Sun, Mon, Tue,
  //   5 days on rent, $5,200. Before: 3 billed days (no start weekday), $3,120. Now less before: +$2,080.00.
  { id: "rule-solve-friday-fixed-day", kind: "rule-solve", rates: [1040, 2927, 7950], days: 3, hours: 24, fixed: "day", start: "2027-01-08", expect: { nowCost: 5200, beforeCost: 3120, beforeBilledDays: 3, beforeOvertimeHours: 0, beforeLabel: "3 days", delta: 2080 } },
  // rule-machine-16d-10h: the whole machine through `machineCost`, the library priced as before only by
  //   `pricedBefore(lib, "rental_billing")`: rent $7,950 now, $9,540 before; the 12 % waiver moves with it ($954 now,
  //   $1,144.80 before); the 1.3 % environmental fee is capped at $75 both ways ($103.35, $124.02); fuel and mob the
  //   same. Now less before: −1,590 − 190.80 = −$1,780.80. The page's library is left as it was.
  { id: "rule-machine-16d-10h", kind: "rule-machine", ...DIESEL, extras: { waiver: 12, env: 1.3, cap: 75 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 16, hoursPerDay: 10, fuelLoad: "med", units: 1, includeMob: true }, expect: { nowEquipment: 7950, beforeEquipment: 9540, nowWaiver: 954, beforeWaiver: 1144.8, nowEnv: 75, beforeEnv: 75, fuelSame: true, mobSame: true, delta: -1780.8, libUntouched: true, beforeFlag: true } },
  // rule-machine-2-units-location: the same on 2 machines at a 1.01 location factor: rent (7,950 − 9,540) × 1.01 × 2 =
  //   −$3,211.80, its waiver × 12 % = −$385.416, the fee $75 a machine both ways: −$3,597.216 → −$3,597.22.
  { id: "rule-machine-2-units-location", kind: "rule-machine", ...DIESEL, location: 1.01, extras: { waiver: 12, env: 1.3, cap: 75 }, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 16, hoursPerDay: 10, fuelLoad: "med", units: 2, includeMob: true }, expect: { delta: -3597.22, fuelSame: true, mobSame: true } },
  // rule-machine-owned: an owned machine has no rental: $0 either way.
  { id: "rule-machine-owned", kind: "rule-machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "owned", period: "hr", hours: 160, workDays: 16, hoursPerDay: 10, fuelLoad: "med", units: 1, includeMob: true }, expect: { delta: 0 } },
  // The one-time rule (`ruleChanges.ts`). Owed: the estimate priced something before the change reached this environment
  //   (D-1353: its arrival as the api recorded it; on the bench rental billing 2026-11-24 13:52 UTC), and no record yet.
  //   A record, a project first priced after, or one never priced: none.
  { id: "rule-note-owed", kind: "rule-note", owed: true, firstPricedAt: "2026-10-13T17:18:26Z", records: [], arrivals: BENCH_ARRIVALS, expect: { owed: ["rental_billing"] } },
  { id: "rule-note-recorded", kind: "rule-note", owed: true, firstPricedAt: "2026-10-13T17:18:26Z", records: [{ key: "rental_billing", delta: 0, shown_at: "2026-11-25T04:00:00Z" }], arrivals: BENCH_ARRIVALS, expect: { owed: [] } },
  { id: "rule-note-priced-after", kind: "rule-note", owed: true, firstPricedAt: "2026-11-24T13:52:01Z", records: [], arrivals: BENCH_ARRIVALS, expect: { owed: [] } },
  { id: "rule-note-never-priced", kind: "rule-note", owed: true, firstPricedAt: null, records: [], arrivals: BENCH_ARRIVALS, expect: { owed: [] } },
  // D-1353 (the founder's Q5): the cut-off is the change's arrival in THAT environment. A project first priced
  //   2026-11-30 09:00 UTC is after rental billing reached the bench (2026-11-24 13:52) but before it reached a staging
  //   that deploys it 2026-12-01 15:00: owed there, not on the bench. A change with no arrival recorded: owed nowhere.
  { id: "rule-note-arrival-later-env", kind: "rule-note", owed: true, firstPricedAt: "2026-11-30T09:00:00Z", records: [], arrivals: { rental_billing: "2026-12-01T15:00:00Z", wages: "2026-12-01T15:00:00Z" }, expect: { owed: ["rental_billing"] } },
  { id: "rule-note-arrival-bench", kind: "rule-note", owed: true, firstPricedAt: "2026-11-30T09:00:00Z", records: [], arrivals: BENCH_ARRIVALS, expect: { owed: [] } },
  { id: "rule-note-no-arrival", kind: "rule-note", owed: true, firstPricedAt: "2026-10-13T17:18:26Z", records: [], arrivals: {}, expect: { owed: [] } },
  //   The wages note keeps its own test (D-1350, the founder's Q18: P10 like P01 and P05): owed when the api answers the
  //   rates before and after Update rates moved the set to wage rules 7, whatever the arrival; a record ends it.
  { id: "rule-note-wages-moved", kind: "rule-note", owed: true, firstPricedAt: "2026-10-13T17:16:59Z", records: [{ key: "rental_billing", delta: -6396.64, shown_at: "2026-11-26T09:00:00Z" }], arrivals: BENCH_ARRIVALS, wageMoves: { wages: { movedAt: "2026-11-27T09:00:00Z", rates: { "CC-01": [81.62, 47.7] } } }, expect: { owed: ["wages"] } },
  { id: "rule-note-wages-not-moved", kind: "rule-note", owed: true, firstPricedAt: "2026-10-13T17:16:59Z", records: [], arrivals: BENCH_ARRIVALS, wageMoves: {}, expect: { owed: ["rental_billing"] } },
  // D-1360 (the founder's Q3/Q6): wage rules 8 has its own note, "wage rules 8", owed when the api's `wage_moves` names it
  //   (a set moved from rules 7 to 8 with the same inputs); a 6 -> 8 move is named "wages" alone (one note per move, the
  //   whole amount: never counted twice; `drives/qt-rulenote-d1360.py` checks which key the api names); a record ends it.
  { id: "rule-note-wages8-moved", kind: "rule-note", owed: true, firstPricedAt: "2026-10-13T17:16:59Z", records: [{ key: "rental_billing", delta: 0, shown_at: "2026-11-26T09:00:00Z" }], arrivals: { ...BENCH_ARRIVALS, wages_8: "2026-11-25T11:43:21Z" }, wageMoves: { wages_8: { movedAt: "2026-11-27T09:00:00Z", rates: { "CC-10": [64.97, 65.04] } } }, expect: { owed: ["wages_8"] } },
  { id: "rule-note-wages-6-to-8-one-note", kind: "rule-note", owed: true, firstPricedAt: "2026-10-13T17:16:59Z", records: [{ key: "rental_billing", delta: 0, shown_at: "2026-11-26T09:00:00Z" }], arrivals: { ...BENCH_ARRIVALS, wages_8: "2026-11-25T11:43:21Z" }, wageMoves: { wages: { movedAt: "2026-11-25T20:25:50Z", rates: { "CC-10": [64.97, 65.04] } } }, expect: { owed: ["wages"] } },
  { id: "rule-note-wages8-recorded", kind: "rule-note", owed: true, firstPricedAt: "2026-10-13T17:16:59Z", records: [{ key: "rental_billing", delta: 0, shown_at: "2026-11-26T09:00:00Z" }, { key: "wages_8", delta: -1.25, shown_at: "2026-11-27T09:10:00Z" }], arrivals: { ...BENCH_ARRIVALS, wages_8: "2026-11-25T11:43:21Z" }, wageMoves: { wages_8: { movedAt: "2026-11-27T09:00:00Z", rates: { "CC-10": [64.97, 65.04] } } }, expect: { owed: [] } },
  // D-1369 (the founder's Q6): every move not yet shown keeps its note. The api answers each owed move under its own key
  //   (`drives/qt-rulenote-d1369.py` checks which); Real bid A after an Update rates before any open: "wages" (6 -> 8,
  //   534 -> 680, not the current set) and "wage rules 9" (8 -> 10, the current set): both owed; once "wages" is recorded
  //   only "wage rules 9" is.
  { id: "rule-note-two-moves-owed", kind: "rule-note", owed: true, firstPricedAt: "2026-11-05T09:57:17Z", records: [{ key: "rental_billing", delta: 0, shown_at: "2026-11-25T10:36:54Z" }], arrivals: BENCH_ARRIVALS, wageMoves: { wages: { movedAt: "2026-11-25T20:25:50Z", rates: { "CC-10": [64.97, 65.04] }, current: false }, wages_9: { movedAt: "2026-11-26T06:30:00Z", rates: { "CC-10": [65.04, 65.05] }, current: true } }, expect: { owed: ["wages", "wages_9"] } },
  { id: "rule-note-two-moves-one-recorded", kind: "rule-note", owed: true, firstPricedAt: "2026-11-05T09:57:17Z", records: [{ key: "rental_billing", delta: 0, shown_at: "2026-11-25T10:36:54Z" }, { key: "wages", delta: 118.26, shown_at: "2026-11-26T06:40:00Z" }], arrivals: BENCH_ARRIVALS, wageMoves: { wages_9: { movedAt: "2026-11-26T06:30:00Z", rates: { "CC-10": [65.04, 65.05] }, current: true } }, expect: { owed: ["wages_9"] } },
  // D-1369: each move's amount is its own (`wagesBeforeComponents`, the labour rows that follow the set at each side's rate,
  //   from the current set's), so the parts add to the whole chain and none is counted twice. A crew of 2 at CC-10, 10 h:
  //   now 65.05. "wages" (64.97 -> 65.04, not current): 2 x 10 x 0.07 = +$1.40; "wage rules 9" (65.04 -> 65.05, current):
  //   2 x 10 x 0.01 = +$0.20; together 2 x 10 x (65.05 - 64.97) = $1.60.
  {
    id: "rule-note-chain-amounts",
    kind: "rule-note",
    wagePass: {
      hours: 10,
      components: [{ crew: [{ role: "Operator", count: 2, hourly_wage: 65.05, craft_code: "CC-10", rate_source: "wage_set" }] }],
      context: { now: { rates: { "CC-10": 65.05 } }, machines: {} },
      moves: [
        { movedAt: "2026-11-25T20:25:50Z", rates: { "CC-10": [64.97, 65.04] }, current: false },
        { movedAt: "2026-11-26T06:30:00Z", rates: { "CC-10": [65.04, 65.05] }, current: true },
      ],
    },
    expect: { amounts: [1.4, 0.2], total: 1.6 },
  },
  // D-1369 (the founder's Q7): a machine's own rate counts. An excavator operator (CC-11, follows machine m1, an excavator)
  //   at the excavator subtype, now 48.30; the craft rate does not move (39.78), the subtype does (48.29 -> 48.30): 1 x 100 h
  //   x 0.01 = +$1.00 (D-1364: $0 when only the craft was read). Its foreman (53.13 = 48.30 x 1.10) takes the top row's
  //   scale: 53.13 x 100 x 0.01 / 48.30 = +$1.10; together +$2.10. A row typed by hand: nothing. Next row: a pipelayer
  //   (rate_as, CC-16 flat 33.57, its group 34.52 -> 34.56, now 34.56) x 50 h: +$2.00.
  {
    id: "rule-note-machine-only-move",
    kind: "rule-note",
    wagePass: {
      hours: 100,
      components: [
        {
          crew: [
            { role: "Excavator operator", count: 1, hourly_wage: 48.3, craft_code: "CC-11", rate_source: "wage_set", for_equipment: "m1" },
            { role: "Foreman", count: 1, hourly_wage: 53.13, craft_code: "CC-11", rate_source: "wage_set", foreman: true },
            { role: "Laborer", count: 1, hourly_wage: 30, craft_code: "CC-16", rate_source: "manual" },
          ],
        },
      ],
      context: { now: { rates: { "CC-11": 39.78, "CC-16": 33.57 }, subtypes: { "CC-11": { excavator: 48.3 }, "CC-16": { pipelayer: 34.56 } } }, machines: { m1: "excavator" } },
      moves: [{ movedAt: "2026-11-26T06:30:00Z", rates: { "CC-11": [39.78, 39.78], "CC-16": [33.57, 33.57] }, subtypes: { "CC-11": { excavator: [48.29, 48.3] }, "CC-16": { pipelayer: [34.52, 34.56] } }, current: true }],
    },
    expect: { amounts: [2.1], total: 2.1 },
  },
  {
    id: "rule-note-pipelayer-group-move",
    kind: "rule-note",
    wagePass: {
      hours: 50,
      components: [{ crew: [{ role: "Pipelayer", count: 1, hourly_wage: 34.56, craft_code: "CC-16", rate_source: "wage_set", rate_as: "Pipelayer" }] }],
      context: { now: { rates: { "CC-16": 33.57 }, subtypes: { "CC-16": { pipelayer: 34.56 } } }, machines: {} },
      moves: [{ movedAt: "2026-11-26T06:30:00Z", rates: { "CC-16": [33.57, 33.57] }, subtypes: { "CC-16": { pipelayer: [34.52, 34.56] } }, current: true }],
    },
    expect: { amounts: [2], total: 2 },
  },
  // D-1375 part b (the founder's D-1378 1): the foreman priced from the stored rows. P08's two crews (D-1376), 100 h each:
  //   the operator 39.25 -> 42.61 and its foreman, 15 % (the set's): before 39.25 x 1.15 = 45.1375 -> 45.14, now 49.00; the
  //   excavator operator (its subtype 47.66 -> 51.74) and its foreman 54.81 -> 59.50. (3.36 + 3.86 + 4.08 + 4.69) x 100 =
  //   +$1,599.00. (By the old top-row ratio the foremen were 45.1361 and 54.8083: +$1,599.56, the $1.41 kind of gap.) The
  //   move crossed "wages" and no rule changed a figure: "Rates updated", the whole move (D-1371 Q4b).
  {
    id: "rule-note-d1375b-foreman-stored",
    kind: "rule-note",
    wagePass: {
      hours: 100,
      components: [
        { crew: [{ role: "Operator", count: 1, hourly_wage: 42.61, craft_code: "CC-11", rate_source: "wage_set" }, { role: "Foreman", count: 1, hourly_wage: 49, craft_code: "CC-11", rate_source: "wage_set", foreman: true }] },
        { crew: [{ role: "Excavator operator", count: 1, hourly_wage: 51.74, craft_code: "CC-11", rate_source: "wage_set", for_equipment: "m1" }, { role: "Foreman", count: 1, hourly_wage: 59.5, craft_code: "CC-11", rate_source: "wage_set", foreman: true }] },
      ],
      context: { now: { rates: { "CC-11": 42.61, "CC-16": 38.52 }, subtypes: { "CC-11": { excavator: 51.74 } }, derived: { premium: 0.15, laborer: 38.52, determination: null, roleLines: {} } }, machines: { m1: "excavator" } },
      moves: [
        {
          key: "wages",
          movedAt: "2026-11-26T15:00:52Z",
          rates: { "CC-11": [39.25, 42.61], "CC-16": [32.37, 38.52] },
          subtypes: { "CC-11": { excavator: [47.66, 51.74] } },
          current: true,
          derived: [{ premium: 0.15, laborer: 32.37, determination: null, roleLines: {} }, { premium: 0.15, laborer: 38.52, determination: null, roleLines: {} }],
          ruleEffect: false,
        },
      ],
    },
    expect: { amounts: [1599], total: 1599, parts: [0], lines: [["Rates updated (escalation/data, Nov 26, 2026): this estimate changed by +$1,599.00"]] },
  },
  // D-1375 part b: the foreman's top row is chosen in each set. The crane (44.62 -> 37.83) out-earned the operator (39.25 ->
  //   42.61) before: the foreman was 44.62 x 1.15 = 51.313 -> 51.31, now 42.61 x 1.15 = 49.00. 10 h: (-6.79 + 3.36 - 2.31)
  //   x 10 = -$57.40 (the old top-row ratio took the operator's: 45.14, +$4.80 instead of the foreman's -$23.10).
  {
    id: "rule-note-d1375b-foreman-top-changes",
    kind: "rule-note",
    wagePass: {
      hours: 10,
      components: [{ crew: [{ role: "Crane operator", count: 1, hourly_wage: 37.83, craft_code: "CC-07", rate_source: "wage_set" }, { role: "Operator", count: 1, hourly_wage: 42.61, craft_code: "CC-11", rate_source: "wage_set" }, { role: "Foreman", count: 1, hourly_wage: 49, craft_code: "CC-11", rate_source: "wage_set", foreman: true }] }],
      context: { now: { rates: { "CC-07": 37.83, "CC-11": 42.61 }, derived: { premium: 0.15, laborer: null, determination: null, roleLines: {} } }, machines: {} },
      moves: [{ key: "wages", movedAt: "2026-11-26T15:00:52Z", rates: { "CC-07": [44.62, 37.83], "CC-11": [39.25, 42.61] }, current: true, derived: [{ premium: 0.15, laborer: null, determination: null, roleLines: {} }, { premium: 0.15, laborer: null, determination: null, roleLines: {} }], ruleEffect: false }],
    },
    expect: { amounts: [-57.4], total: -57.4 },
  },
  // D-1375 part b: a foreman with no other craft is paid over the set's Laborer (10 %): 33.52 -> 36.872 -> 36.87 before,
  //   33.57 -> 36.927 -> 36.93 now; 10 h: +$0.60 (the old pass scaled it by 1: $0).
  {
    id: "rule-note-d1375b-foreman-alone",
    kind: "rule-note",
    wagePass: {
      hours: 10,
      components: [{ crew: [{ role: "Foreman", count: 1, hourly_wage: 36.93, craft_code: "CC-16", rate_source: "wage_set", foreman: true }] }],
      context: { now: { rates: { "CC-16": 33.57 }, derived: { premium: 0.1, laborer: 33.57, determination: null, roleLines: {} } }, machines: {} },
      moves: [{ movedAt: "2026-11-26T15:00:52Z", rates: { "CC-16": [33.52, 33.57] }, current: true, derived: [{ premium: 0.1, laborer: 33.52, determination: null, roleLines: {} }, { premium: 0.1, laborer: 33.57, determination: null, roleLines: {} }] }],
    },
    expect: { amounts: [0.6], total: 0.6 },
  },
  // D-1375 part b (the founder's D-1371 Q4b): the note named by its cause. An operator, 100 h. A rule-only move: Davis
  //   84041's Equipment Operator by rules 10 (33.25) and 11 (32.64), D-1374, no escalation: the after set less the rule's
  //   own change is the before set, so the rule carries the whole -$61.00. A mixed move: a day's escalation too (after
  //   32.70; without the rule 32.70 + 0.61 = 33.31): the rule -$61.00, "Rates updated" +$6.00, together -$55.00 (the real
  //   move). A pure escalation move that crossed the wages_11 key (32.64 -> 32.70): "Rates updated" +$6.00, the rule $0.
  //   A move whose inputs could not be priced again (the api answers no cause): the rule's name, the whole amount.
  ...[
    ["rule-only", 32.64, [33.25, 32.64], { ruleEffect: true, withoutRule: { rates: { "CC-11": 33.25 } } }, { amounts: [-61], parts: [-61], lines: [["Pricing rule changed (wage rules 11, Nov 26, 2026): this estimate changed by −$61.00"]] }],
    ["mixed", 32.7, [33.25, 32.7], { ruleEffect: true, withoutRule: { rates: { "CC-11": 33.31 } } }, { amounts: [-55], parts: [-61], lines: [["Pricing rule changed (wage rules 11, Nov 26, 2026): this estimate changed by −$61.00", "Rates updated (escalation/data, Nov 26, 2026): this estimate changed by +$6.00"]] }],
    ["escalation-only", 32.7, [32.64, 32.7], { ruleEffect: false }, { amounts: [6], parts: [0], lines: [["Rates updated (escalation/data, Nov 26, 2026): this estimate changed by +$6.00"]] }],
    ["cause-not-known", 32.7, [32.64, 32.7], {}, { amounts: [6], parts: [null], lines: [["Pricing rule changed (wage rules 11, Nov 26, 2026): this estimate changed by +$6.00"]] }],
  ].map(([name, now, pair, cause, expect]) => ({
    id: `rule-note-d1375b-${name}`,
    kind: "rule-note",
    wagePass: {
      hours: 100,
      components: [{ crew: [{ role: "Operator", count: 1, hourly_wage: now, craft_code: "CC-11", rate_source: "wage_set" }] }],
      context: { now: { rates: { "CC-11": now } }, machines: {} },
      moves: [{ key: "wages_11", movedAt: "2026-11-26T16:00:00Z", rates: { "CC-11": pair }, current: true, ...cause }],
    },
    expect,
  })),
  // D-1375 part b: a recorded note's lines. Real bid A's owed "wages" (534 -> 680, rules 6 -> 8): rules 6 and 8 price set
  //   680's inputs identically (read only, 2026-11-26 16:42 UTC), so it reads "Rates updated" with its +$116.11 (D-1369's
  //   figure, D-1375a: the move is escalation). P08's copy (D-1376's +$14,330.61, Update rates on the copy 2026-11-26). A
  //   record made before (no moved_at): as it always was. Mixed: two lines, adding to the move. A rule's part of the whole
  //   move: one line. No cause known (rule_delta null): the rule's name, the whole amount.
  {
    id: "rule-note-d1375b-recorded-lines",
    kind: "rule-note",
    lines: [
      [{ key: "wages", delta: 116.11, rule_delta: 0, moved_at: "2026-11-25T20:25:50.53153Z", shown_at: "2026-11-26T17:00:00Z" }],
      [{ key: "wages", delta: 14330.61, rule_delta: 0, moved_at: "2026-11-26T17:05:00Z", shown_at: "2026-11-26T17:06:00Z" }],
      [{ key: "wages", delta: -8.47, shown_at: "2026-11-26T09:00:00Z" }],
      [{ key: "wages_11", delta: -55, rule_delta: -61, moved_at: "2026-11-26T16:00:00Z", shown_at: "2026-11-26T16:10:00Z" }],
      [{ key: "wages_11", delta: -61, rule_delta: -61, moved_at: "2026-11-26T16:00:00Z", shown_at: "2026-11-26T16:10:00Z" }],
      [{ key: "wages_11", delta: 6, rule_delta: null, moved_at: "2026-11-26T16:00:00Z", shown_at: "2026-11-26T16:10:00Z" }],
    ],
    expect: {
      lines: [
        [["Rates updated (escalation/data, Nov 25, 2026): this estimate changed by +$116.11"]],
        [["Rates updated (escalation/data, Nov 26, 2026): this estimate changed by +$14,330.61"]],
        [["Pricing rule changed (wages, Nov 25, 2026): this estimate changed by −$8.47"]],
        [["Pricing rule changed (wage rules 11, Nov 26, 2026): this estimate changed by −$61.00", "Rates updated (escalation/data, Nov 26, 2026): this estimate changed by +$6.00"]],
        [["Pricing rule changed (wage rules 11, Nov 26, 2026): this estimate changed by −$61.00"]],
        [["Pricing rule changed (wage rules 11, Nov 26, 2026): this estimate changed by +$6.00"]],
      ],
    },
  },
  // D-1375 part b: the foreman's cent, half to even as the api's `Decimal.quantize` (`drives/qt-rulenote-d1375b.py` checks
  //   the api's own figures): 39.25 x 1.10 = 43.175 -> 43.18; 39.35 x 1.10 = 43.285 -> 43.28; 45.14; 54.81; 49.00.
  { id: "rule-note-d1375b-cents", kind: "rule-note", cents: [[39.25, 1.1], [39.35, 1.1], [39.25, 1.15], [47.66, 1.15], [42.61, 1.15]], expect: { cents: [43.18, 43.28, 45.14, 54.81, 49] } },
  // D-1353 (the founder's Q4): Needs attention lists a record until it is dismissed, at every open; $0 never shows.
  //   P10's expected rental note (D-1345: rent −$5,711.29 + its 12 % waiver), then dismissed, then a $0 record, then the
  //   P01-copy wages note of D-1350's smoke (−$8.47).
  {
    id: "rule-note-shown-until-dismissed",
    kind: "rule-note",
    shown: [
      [{ key: "rental_billing", delta: -6396.64, shown_at: "2026-11-26T09:00:00Z", dismissed_at: null }],
      [{ key: "rental_billing", delta: -6396.64, shown_at: "2026-11-26T09:00:00Z", dismissed_at: "2026-11-26T09:05:00Z" }],
      [{ key: "rental_billing", delta: 0, shown_at: "2026-11-26T09:00:00Z", dismissed_at: null }],
      [{ key: "wages", delta: -8.47, shown_at: "2026-11-26T09:00:00Z" }],
    ],
    expect: { shown: [["Pricing rule changed (rental billing, Nov 24, 2026): this estimate changed by −$6,396.64"], [], [], ["Pricing rule changed (wages, Nov 25, 2026): this estimate changed by −$8.47"]] },
  },
  // D-1360 (the founder's Q5): Dismiss is per person. The api answers each record's `dismissed_at` for the member asking:
  //   the member who dismissed the wages note sees only the rule 8 note; the other member, whose answer carries no
  //   dismissal, sees both. The rule 8 note's words: no D-number.
  {
    id: "rule-note-dismissed-per-person",
    kind: "rule-note",
    shown: [
      [{ key: "wages", delta: -8.47, shown_at: "2026-11-26T09:00:00Z", dismissed_at: "2026-11-26T09:05:00Z" }, { key: "wages_8", delta: 12.5, shown_at: "2026-11-27T09:00:00Z", dismissed_at: null }],
      [{ key: "wages", delta: -8.47, shown_at: "2026-11-26T09:00:00Z", dismissed_at: null }, { key: "wages_8", delta: 12.5, shown_at: "2026-11-27T09:00:00Z", dismissed_at: null }],
    ],
    expect: { shown: [["Pricing rule changed (wage rules 8, Nov 25, 2026): this estimate changed by +$12.50"], ["Pricing rule changed (wages, Nov 25, 2026): this estimate changed by −$8.47", "Pricing rule changed (wage rules 8, Nov 25, 2026): this estimate changed by +$12.50"]] },
  },
  // D-1353 (the founder's Q2): the rental line's words, the days on rent then the cover (EX-CRAWL-20T $1,040 / $2,927 /
  //   $7,950). 7 work days from Thursday 2027-01-07 = Thu → the next Fri, 9 days: week + 2 days $5,007. 1 work day: 1 day.
  //   20 work days from a Monday = 26 days: one 4-week $7,950 (3 weeks + 5 days $13,981).
  { id: "rule-rent-label", kind: "rule-note", rentLabels: [[7, "2027-01-07"], [1, null], [20, null]], expect: { rentLabels: ["9 days on rent: 1 week + 2 days", "1 day on rent: 1 day", "26 days on rent: one 4-week"] } },
  // The words (D-1343: no D-number on screen; the date as the app writes dates, the amount signed in its money format);
  //   nothing moved, or less than half a cent: no note.
  { id: "rule-note-words", kind: "rule-note", texts: [-1780.8, 2080, 0, 0.004, -5711], expect: { texts: ["Pricing rule changed (rental billing, Nov 24, 2026): this estimate changed by −$1,780.80", "Pricing rule changed (rental billing, Nov 24, 2026): this estimate changed by +$2,080.00", null, null, "Pricing rule changed (rental billing, Nov 24, 2026): this estimate changed by −$5,711.00"] } },
  // The amount to the cent; a figure not known is no amount (never a made-up number).
  { id: "rule-note-delta", kind: "rule-note", deltas: [[220792.123, 226503.127], [5, Number.NaN], [1.0000001, 1], [null, 1]], expect: { deltas: [-5711, null, 0, null] } },
  { id: "onsite-host-small-fill-tier", kind: "host", ...DIESEL, qty: 20, unit: "CCY", spread: { prod_per_day: 400, prod_unit: "CCY" }, rows: [comp("ex", "equipment", { eq_class_key: "EX-CRAWL-20T", eq_mode: "rental", eq_period: "auto", eq_units: 1, eq_fuel_load: "med", eq_include_mob: true }), comp("crew", "labor", { position: 1, crew: [{ role: "TEST Operator", count: 1, hourly_wage: 50, for_equipment: "ex" }, { role: "TEST Laborer", count: 1, hourly_wage: 40 }], production_rate: 12.5, production_basis: "units_per_hr" })], expect: { equipment: 2146.98, crewHours: 4, labor: 360, warning: "Minimum half day" } },
];

/** The bundle the api would send, from the dumped national rows and a case's overrides. */
export function bundleFor(eqlib, c = {}) {
  const x = c.extras ?? {};
  const extraSettings = Object.fromEntries(
    [["damage_waiver_pct", x.waiver], ["env_fee_pct", x.env], ["env_fee_cap", x.cap], ["rental_delivery_by_dealer", x.byDealer]].filter(([, v]) => v !== undefined),
  );
  const overrides = Object.entries({ ...(c.setting ?? {}), ...extraSettings }).map(([key, value], i) => ({
    uuid: `qt-${i}`,
    scope: "project",
    entity: "setting",
    entity_key: key,
    field: "value",
    value_num: value,
    value_text: null,
    confirmed_none: false,
    national_at_set: null,
    release_at_set: 1,
    note: null,
    set_by: "quantity table",
    set_at: "2026-10-23T00:00:00Z",
    updated_by: "quantity table",
    updated_at: "2026-10-23T00:00:00Z",
  }));
  const app = ["fuel_price_diesel", "fuel_price_gasoline", "fuel_price_propane", "earthwork_production"].map((key) => ({ key, value: null, label: key, editable: true }));
  return {
    release: 1,
    // D-1289 (Q26): each class's FEMA edition, as the api's national.py reads it from `owned_rate_year`.
    classes: eqlib.classes.map((k) => {
      const y = /^FEMA (\d{4})\b/.exec(String(k.owned_rate_year ?? ""));
      return { ...k, owned_fema_edition: y ? Number(y[1]) : null };
    }),
    production: eqlib.production,
    activities: eqlib.activities,
    transport: eqlib.transport,
    settings: [...eqlib.settings, ...app],
    soils: eqlib.soils,
    fuel_regions: [],
    custom: c.custom ?? { classes: [], activities: [], production: [] },
    overrides,
    location: { factor_from_wage_set: c.location ?? null, equipment_amf: c.location == null ? null : c.location - 1, zip: c.location == null ? null : "00000", location_set: c.location != null },
    my_equipment: c.myEquipment ?? [],
    // D-1287: the state's rental rule, the bench row's fields (TX) or a state not read (GA).
    // D-1289 (Q18): "none", no state on the project or the company; `ruleFrom`, where TX came from.
    ...(c.rule === "none" ? { rental_tax: { state: null, from: "none", listed: false, loaded: false, job_type: null } } : {}),
    ...(c.rule && c.rule !== "none" ? { rental_tax: c.rule === "TX" ? { state: "TX", from: c.ruleFrom ?? "project", name: "Texas", listed: true, loaded: true, grade: "A", taxes_rentals: true, operated_single_charge_exempt: true, waiver_taxable: true, lessor_delivery_taxable: true, third_party_haul_taxable: false, lessor_fees_taxable: true, exempt_job_types: [], job_type: c.jobType ?? null, rule_cited: "34 TAC §3.294 (c)(1)-(3), (d)(1)-(3), (e)(1)-(2)" } : { state: c.rule, listed: true, loaded: false, grade: "F", job_type: c.jobType ?? null } } : {}),
    mine_only: Boolean(c.mineOnly),
  };
}

/** Run every row in the page through the app's engine; returns one answer per case. */
export async function runEquipment(page, eqlib) {
  return page.evaluate(
    async ([cases, eqlib, bundleSrc]) => {
      const resolve = await import("/src/lib/estimate/equipment/resolve.ts");
      const periods = await import("/src/lib/estimate/equipment/periods.ts");
      const cost = await import("/src/lib/estimate/equipment/cost.ts");
      const mob = await import("/src/lib/estimate/equipment/mob.ts");
      const prod = await import("/src/lib/estimate/equipment/production.ts");
      const comps = await import("/src/lib/estimate/components.ts");
      const host = await import("/src/lib/estimate/equipment/host.ts");
      const snap = await import("/src/lib/estimate/equipment/snapshot.ts");
      const se = await import("/src/lib/estimate/sharedEquipment.ts");
      const match = await import("/src/lib/estimate/equipment/match.ts");
      const sug = await import("/src/lib/estimate/equipment/suggest.ts");
      const ot = await import("/src/lib/estimate/overtime.ts");
      const age = await import("/src/lib/estimate/equipment/rateAge.ts");
      const rx = await import("/src/lib/estimate/equipment/rentalExtras.ts");
      const bid = await import("/src/lib/estimate/bidSummary.ts");
      const costing = await import("/src/lib/estimate/costing.ts");
      const rc = await import("/src/lib/estimate/ruleChanges.ts");
      const pb = await import("/src/lib/estimate/equipment/periodsBefore.ts");
      const bundleFor = new Function(`return ${bundleSrc}`)();
      return cases.map((c) => {
        if (c.kind === "mob-catalog") {
          const lib = resolve.library(bundleFor(eqlib, {}));
          const bad = [];
          let checked = 0;
          for (const cls of eqlib.classes) {
            const t = cls.transport_class ? lib.transport(cls.transport_class) : undefined;
            const tn = (f) => (t ? lib.num("transport", t.transport_class, f).value : null);
            const h = mob.haul({ transport: t, perMile: tn("per_mile_typ"), minimum: tn("min_typ"), permitPerState: tn("permit_per_state"), escortPerMile: tn("escort_per_mile"), escorts: tn("escorts_default"), loadUnloadHr: tn("load_unload_hr"), loadUnloadRate: tn("load_unload_rate"), permitLikely: cls.permit_likely ?? null, miles: 50, permitStates: 1, demobFactor: 1 });
            const want = cls.catalog_mob_one_way ?? null;
            const wantDemob = cls.catalog_demob_one_way ?? null;
            const got = h ? h.oneWay : null;
            const gotDemob = h ? h.demob : null;
            checked++;
            if (got !== want || gotDemob !== wantDemob) bad.push(`${cls.equip_key}: ${got}/${gotDemob}, catalog ${want}/${wantDemob}`);
          }
          return { checked, bad };
        }
    if (c.kind === "suggest") {
          // What a picker offers with nothing typed (every live class), split by the list.
          const lib = resolve.library(bundleFor(eqlib, c));
          const live = lib.classes().filter((x) => !x.retired_in);
          const s = sug.suggest(live, lib);
          return { mine: s.mine.length, mineKeys: s.mine.map((x) => x.equip_key).sort(), folded: s.restFolded, offered: s.restFolded ? s.mine.length : s.mine.length + s.rest.length, full: s.mine.length + s.rest.length, fullNational: [...s.mine, ...s.rest].filter((x) => !x.custom).length };
        }
    if (c.kind === "prod-catalog" || c.kind === "prod-d") {
          const lib = resolve.library(bundleFor(eqlib, {}));
          let cells = 0;
          let d = 0;
          let notBlank = 0;
          const bad = [];
          for (const row of eqlib.production) {
            const v = prod.productionValue(lib, row);
            if (row.confidence === "D") {
              d++;
              if (v.typ != null) notBlank++;
            }
            for (const [f, cached, got] of [["formula_low", row.prod_low, v.low], ["formula_typ", row.prod_typ, v.typ], ["formula_high", row.prod_high, v.high]]) {
              if (!row[f]) continue;
              cells++;
              const want = cached ?? null;
              const ok = want == null ? got == null : got != null && Math.abs(got - want) <= 1e-9 * Math.max(1, Math.abs(want));
              if (!ok) bad.push(row.equip_key + " " + row.activity_key + " " + f + ": " + got + ", catalog " + want);
            }
          }
          return { cells, d, notBlank, bad };
        }
        if (c.kind === "prod-one") {
          const lib = resolve.library(bundleFor(eqlib, c));
          const v = prod.productionValue(lib, lib.production(c.equip, c.activity));
          return { typ: v.typ, grade: v.grade, source: v.source };
        }
        if (c.kind === "convert") {
          const lib = resolve.library(bundleFor(eqlib, {}));
          return { value: prod.convertQuantity(lib, c.qty, c.from, c.to)?.value ?? null };
        }
        if (c.kind === "pace") {
          const lib = resolve.library(bundleFor(eqlib, {}));
          const p = prod.paceFor(lib, c.qty, c.unit, c.rate, c.rateUnit, c.units, 8);
          return "error" in p ? { error: true } : { hours: p.hours, days: p.days };
        }
        if (c.kind === "host" || c.kind === "host-same" || c.kind === "host-snapshot") {
          const env = { qty: c.qty, parent: c.qty };
          if (c.kind === "host-same") {
            const a = c.rows.map((r) => comps.evaluateComponent(r, env));
            const b = host.evaluateHost(c.rows, env, { lib: null, qtyUnit: c.unit });
            return { same: JSON.stringify(a) === JSON.stringify(b), totals: b.map((e) => e.total) };
          }
          if (c.kind === "host-snapshot") {
            const bundle = bundleFor(eqlib, c);
            const priced = { id: "ex", takeoff_item_id: "host", kind: "equipment", name: "ex", position: 0, qty_formula: null, unit: null, pricing_mode: "lump", crew: null, production_rate: null, production_basis: null, crew_day_hours: null, unit_price: null, equip_rate: null, equip_basis: null, duration_formula: null, mob_demob: null, sub_calc: null, quote_amount: null, unit_rate: null, eq_class_key: "EX-CRAWL-20T", eq_activity_key: "EW-CUTLOAD", eq_mode: "rental", eq_units: 1, eq_include_mob: true, eq_snapshot: snap.takeSnapshot(bundle, "EX-CRAWL-20T", "EW-CUTLOAD") };
            const before = host.evaluateHost([priced], env, { lib: resolve.library(bundle), qtyUnit: c.unit })[0];
            // The company edits its rates afterwards (workspace layer): the saved machine keeps its money.
            const later = { ...bundle, overrides: [...bundle.overrides, ...[["rent_day", c.newDay], ["rent_week", c.newWeek]].map(([field, v], i) => ({ uuid: "ws-" + i, scope: "workspace", entity: "class", entity_key: "EX-CRAWL-20T", field, value_num: v, value_text: null, confirmed_none: false, national_at_set: null, release_at_set: 1, note: null, set_by: "qt", set_at: "", updated_by: "qt", updated_at: "" }))] };
            const after = host.evaluateHost([priced], env, { lib: resolve.library(later), qtyUnit: c.unit })[0];
            return { before: before.total, after: after.total, changed: after.library?.changed ?? null };
          }
          const lib = resolve.library(bundleFor(eqlib, c));
          const evals = host.evaluateHost(c.rows, env, { lib, spread: c.spread ?? null, qtyUnit: c.unit });
          const labor = evals.find((e) => e.kind === "labor");
          return {
            equipment: evals.filter((e) => e.kind === "equipment").reduce((s, e) => s + e.total, 0),
            labor: labor?.total ?? null,
            crewHours: labor?.crewHours ?? null,
            warning: labor?.spread?.warning ?? null,
            errors: evals.map((e) => e.error).filter(Boolean),
          };
        }
        if (c.kind === "shared") {
          const lib = resolve.library(bundleFor(eqlib, c));
          const res = { id: "r1", name: "TEST shared excavator", home_classification_id: "div", extra_classification_ids: [], subcontractor_id: null, rate: 0, basis: "day", hours_per_day: 8, days_per_week: 5, weeks_per_month: 4.33, rental_duration_override: null, mob_demob: 0, allocation_basis: "usage_hours", notes: null, eq_class_key: "EX-CRAWL-20T", eq_units: 1, eq_mode: "rental", ...(c.resource ?? {}) };
          const machineHours = new Map(c.hosts.filter((h) => h.machineHours != null).map((h) => ["r1:" + h.id, h.machineHours]));
          const usage = c.hosts.filter((h) => h.override != null || h.excluded).map((h) => ({ resource_id: "r1", takeoff_item_id: h.id, usage_formula: null, usage_hours_override: h.override ?? null, manual_pct: null, excluded: Boolean(h.excluded), last_share: null }));
          const hosts = c.hosts.map((h) => ({ id: h.id, name: h.id, effNode: "div", qty: 0, unit: "BCY", laborCrewHours: h.crewHours ?? null, env: { qty: 0 }, hasSubcontract: false }));
          const out = se.computeSharedEquipment({ resources: [res], usage, hosts, ancestorPath: (n) => [n], subForNode: () => null, library: { lib, machineHours } });
          const v = out.views[0];
          const served = v.hosts.filter((h) => !h.excluded && (h.usageHours ?? 0) > 0);
          const flagged = served.filter((h) => out.missingByHost.has(h.id)).length;
          return { total: v.result.total, h1: out.allocByHost.get("h1") ?? 0, h2: out.allocByHost.get("h2") ?? 0, unallocated: v.result.unallocated, flagged, unflagged: v.library?.missing.length ? served.length - flagged : 0 };
        }
        if (c.kind === "crane-catalog") {
          const lib = resolve.library(bundleFor(eqlib, c));
          let cranes = 0;
          let cranesWithoutQuote = 0;
          let othersAsking = 0;
          for (const cls of eqlib.classes) {
            if (cls.default_mode !== "operated") continue;
            const m = cost.machineCost(lib, { classKey: cls.equip_key, mode: "operated", period: "hr", hours: 10, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: true });
            const asks = m.missing.some((x) => x.field === "mob");
            if (cls.transport_class === "crane-assembled") {
              cranes++;
              if (!asks || !m.missing.some((x) => x.label === "Mob/demob (assembled crane: enter a quote)")) cranesWithoutQuote++;
            } else if (asks) othersAsking++;
          }
          return { cranes, cranesWithoutQuote, othersAsking };
        }
        if (c.kind === "shared-flag-catalog") {
          const lib = resolve.library(bundleFor(eqlib, c));
          let missing = 0;
          let unflagged = 0;
          const bad = [];
          for (const cls of eqlib.classes) {
            const res = { id: "r1", name: cls.equip_key, home_classification_id: "div", extra_classification_ids: [], subcontractor_id: null, rate: 0, basis: "day", hours_per_day: 8, days_per_week: 5, weeks_per_month: 4.33, rental_duration_override: null, mob_demob: 0, allocation_basis: "usage_hours", notes: null, eq_class_key: cls.equip_key, eq_units: 1, eq_mode: cls.default_mode ?? "rental" };
            const hosts = ["h1", "h2"].map((id) => ({ id, name: id, effNode: "div", qty: 0, unit: "BCY", laborCrewHours: null, env: { qty: 0 }, hasSubcontract: false }));
            const out = se.computeSharedEquipment({ resources: [res], usage: [], hosts, ancestorPath: (n) => [n], subForNode: () => null, library: { lib, machineHours: new Map([["r1:h1", 24], ["r1:h2", 16]]) } });
            const v = out.views[0];
            if (!v.library?.missing.length) continue;
            missing++;
            const off = ["h1", "h2"].filter((h) => !out.missingByHost.has(h)).length;
            if (off) {
              unflagged += off;
              bad.push(cls.equip_key + ": " + v.library.missing.join("; "));
            }
          }
          return { missing, unflagged, bad };
        }
        if (c.kind === "starter-spread" || c.kind === "starter-role") {
          // A starter tier as release rows hold it (D-1039): its machines, its crew, and the operators the starter adds.
          const key = c.kind === "starter-role" ? (eqlib.line_map ?? []).find((m) => m.earthwork_role === c.role)?.activity_key ?? null : c.activity;
          const ofKey = (rows) => (rows ?? []).filter((r) => r.activity_key === key);
          const tierNo = c.tier ?? Math.min(...ofKey(eqlib.starter_machines).map((m) => m.tier_no));
          const machines = ofKey(eqlib.starter_machines).filter((m) => m.tier_no === tierNo);
          const crew = ofKey(eqlib.starter_crew).filter((r) => r.tier_no === tierNo);
          const word = (m) => `${m.equip_key}×${Number(m.units)}${m.crew_runs === "Y" ? " (crew runs)" : ""}`;
          if (c.kind === "starter-role") {
            return {
              activity: key,
              // The api's HAUL_ACTIVITIES (D-1035; A95 the debris's load and haul off, D-1043).
              haul: ["A6", "A7", "A8", "A95"].includes(key),
              foremen: crew.filter((r) => /^foreman/i.test(r.role)).reduce((t, r) => t + Number(r.count), 0),
              spotters: crew.filter((r) => /spotter/i.test(r.role)).reduce((t, r) => t + Number(r.count), 0),
              loaders: machines.filter((m) => m.equip_key.startsWith("WL-")).map(word).sort().join(" "),
              trucks: machines.filter((m) => m.equip_key.startsWith("DT-")).reduce((t, m) => t + Number(m.units), 0),
            };
          }
          const classes = new Map(eqlib.classes.map((x) => [x.equip_key, x]));
          const operators = machines
            .filter((m) => m.crew_runs !== "Y" && classes.get(m.equip_key)?.default_mode !== "operated" && /operating engineer/i.test(classes.get(m.equip_key)?.operator_craft_label ?? ""))
            .reduce((t, m) => t + Number(m.units), 0);
          const lib = resolve.library(bundleFor(eqlib, c));
          let rental = 0;
          const missing = [];
          for (const m of machines) {
            const r = cost.machineCost(lib, { classKey: m.equip_key, mode: "rental", period: "auto", fuelLoad: "med", units: Number(m.units), includeMob: false, ...c.input });
            if (r.total == null) missing.push(m.equip_key + ": " + r.missing.map((x) => x.field).join(","));
            else rental += r.total;
          }
          return {
            dozers: machines.filter((m) => m.equip_key.startsWith("DZ-")).reduce((t, m) => t + Number(m.units), 0),
            others: machines.filter((m) => !m.equip_key.startsWith("DZ-")).map(word).sort().join(" "),
            laborers: crew.filter((r) => /^laborer/i.test(r.role)).reduce((t, r) => t + Number(r.count), 0),
            operators,
            rental,
            missing,
          };
        }
        // D-1285 Q19 (f): the premium by spread, and whether it equals the one-day premium on the whole labour.
        if (c.kind === "overtime") {
          const premium = ot.overtimeBySpread(c.rule, c.workDay, c.labor, c.own);
          return { premium, same: Math.abs(premium - ot.overtimePremium(c.rule, c.workDay, c.labor)) < 0.005 };
        }
        // D-1286 (B7): a rate's age, a class's by its basis, and Needs attention's list once per class.
        if (c.kind === "rate-age") {
          const a = age.rateAge(c.asOf, c.today);
          return a ? { level: a.level, days: a.days, months: a.months } : { none: true };
        }
        if (c.kind === "class-age" || c.kind === "stale-list" || c.kind === "stale-own-list") {
          const b = bundleFor(eqlib, {});
          // D-1289 (Q27): an override entered on `at` (else 2026-11-16); Q26: a newer FEMA edition loaded beside the class.
          const at = c.classOverride?.at ?? "2026-11-16T00:00:00Z";
          if (c.classOverride) b.overrides.push({ ...(b.overrides[0] ?? {}), uuid: "qt-class", scope: "project", entity: "class", entity_key: c.classOverride.key ?? c.key, field: c.classOverride.field, value_num: c.classOverride.value, value_text: null, confirmed_none: false, national_at_set: null, release_at_set: 1, note: null, set_by: "quantity table", set_at: at, updated_by: "quantity table", updated_at: at });
          if (c.femaNewer) b.classes = [...b.classes, { equip_key: "QT-FEMA-NEWER", type: "QT", owned_fema_edition: c.femaNewer }];
          const lib = resolve.library(b);
          const row = (s) => `${s.key}|${s.basis}|${s.age.asOf}|${s.age.level}`;
          if (c.kind === "stale-list") return { list: age.staleRates(lib, c.uses, c.today).map(row) };
          if (c.kind === "stale-own-list") return { own: age.staleOwnRates(lib, c.uses, c.today).map(row), library: age.staleRates(lib, c.uses, c.today).map(row) };
          const basis = age.machineBasis(lib, c.key, c.mode);
          const a = age.classRateAge(lib, c.key, basis, c.today);
          return a ? { basis, asOf: a.asOf, level: a.level, days: a.days, own: a.own ?? null, femaCurrent: a.femaCurrent ?? null } : { basis, none: true };
        }
        // D-1289 (Q12): the largest-remainder spread of the exported lines' tax, and its sum to the cent.
        if (c.kind === "spread") {
          const parts = bid.spreadCents(c.shares, c.total);
          return { parts, sum: bid.toCents(parts.reduce((s, x) => s + x, 0)) };
        }
        // D-1287: one machine through the engine, its extras and taxable part, and the Bid summary's tax line on it.
        if (c.kind === "rental") {
          const lib = resolve.library(bundleFor(eqlib, c));
          const m = cost.machineCost(lib, { hoursPerDay: 8, ...c.input });
          const rule = rx.ruleOf(lib);
          const applies = rx.rentalTaxApplies(rule);
          const totals = { directCost: m.total ?? 0, materialCost: 0, equipmentCost: m.total ?? 0, rentalTax: { taxable: m.parts.taxable, applies } };
          const summary = bid.computeBid(totals, { taxPct: 8.25, overheadPct: 0, profitPct: 0, bondPct: 0, extra: [], taxExempt: Boolean(c.taxExempt) });
          const line = (k) => summary.lines.find((l) => l.key === k);
          const tax = line("tax_rental")?.amount ?? null;
          // D-1289 (Q12): the export's fold, and the line's equipment with its tax (`costing.ts:withRentalTax`).
          const bidRates = { taxPct: 8.25, overheadPct: 0, profitPct: 0, bondPct: 0, extra: [], taxExempt: Boolean(c.taxExempt) };
          const folded = bid.computeBid(totals, bidRates, { foldRentalTax: true });
          const lineTaxed = costing.withRentalTax({ equipmentCost: m.total ?? 0, itemCost: m.total ?? 0, equipmentParts: m.parts }, bid.rentalTaxRate(totals, bidRates));
          return {
            deliveredBy: m.deliveredBy,
            companyState: rx.companyStateText(rule),
            lineTaxDelta: bid.toCents(lineTaxed.equipmentCost - (m.total ?? 0)),
            foldDirectDelta: bid.toCents(folded.lines[0].amount - summary.lines[0].amount),
            foldHasLine: folded.lines.some((l) => l.key === "tax_rental"),
            foldTotalSame: folded.total === summary.total,
            equipment: m.equipment, waiver: m.extras?.waiver ?? 0, envFee: m.extras?.envFee ?? 0, envCapped: m.extras?.envCapped ?? false,
            taxable: m.parts.taxable, delivery: m.tax.delivery, deliveryTax: bid.toCents(m.tax.delivery * 0.0825), tax, applies,
            materialTaxPct: line("tax")?.pct ?? null, notLoaded: rx.notLoadedText(rule), derived: m.derived, standby: m.standby,
            rentWaiverTax: bid.toCents((m.equipment ?? 0) + (m.extras?.waiver ?? 0) + (m.extras?.envFee ?? 0) + (tax ?? 0)), missing: m.missing.map((x) => x.field),
            lineEnvFee: m.parts.envFee,
          };
        }
        // D-1287: a shared machine's (or a pool group's) taxable parts, spread over the lines it serves, add back to its own.
        if (c.kind === "shared-parts") {
          const lib = resolve.library(bundleFor(eqlib, c));
          const base = { home_classification_id: "div", extra_classification_ids: [], subcontractor_id: null, rate: 0, basis: "day", hours_per_day: 8, days_per_week: 5, weeks_per_month: 4.33, rental_duration_override: null, mob_demob: 0, allocation_basis: "usage_hours", notes: null, eq_class_key: "EX-CRAWL-20T", eq_units: 1, eq_mode: "rental" };
          const resources = c.pooled
            ? [{ ...base, id: "r1", name: "TEST host" }, { ...base, id: "r2", name: "TEST pooled", eq_period: "pool", eq_pool_host_uuid: "r1" }]
            : [{ ...base, id: "r1", name: "TEST shared" }];
          const machineHours = new Map(c.pooled ? [["r1:h1", 96], ["r2:h2", 64]] : [["r1:h1", 96], ["r1:h2", 64]]);
          const usage = c.pooled ? [{ resource_id: "r1", takeoff_item_id: "h2", usage_formula: null, usage_hours_override: null, manual_pct: null, excluded: true, last_share: null }, { resource_id: "r2", takeoff_item_id: "h1", usage_formula: null, usage_hours_override: null, manual_pct: null, excluded: true, last_share: null }] : [];
          const hosts = ["h1", "h2"].map((id) => ({ id, name: id, effNode: "div", qty: 0, unit: "BCY", laborCrewHours: null, env: { qty: 0 }, hasSubcontract: false }));
          const out = se.computeSharedEquipment({ resources, usage, hosts, ancestorPath: (n) => [n], subForNode: () => null, library: { lib, machineHours } });
          const sum = (k) => [...out.partsByHost.values()].reduce((t, p) => t + p[k], 0) + out.views.reduce((t, v) => t + (v.partsPerDollar ? v.partsPerDollar[k] * v.result.unallocated : 0), 0);
          return { machineTaxable: out.views[0].library?.machine.parts.taxable ?? null, hostsTaxable: sum("taxable"), hostsWaiver: sum("waiver"), hostsEnv: sum("envFee"), totals: out.views.map((v) => v.result.total) };
        }
        if (c.kind === "bid-ticks") {
          const summary = bid.computeBid(c.totals, { taxPct: 8.25, overheadPct: 0, profitPct: 0, bondPct: 0, extra: [], taxTicks: c.ticks });
          return { tax: summary.lines.find((l) => l.key === "tax")?.amount ?? null, rental: summary.lines.find((l) => l.key === "tax_rental")?.amount ?? null };
        }
        if (c.kind === "ratios") return rx.ratiosOf(resolve.library(bundleFor(eqlib, {})));
        if (c.kind === "standby") return rx.ownedStandby(c.rate, c.lostDays, c.hoursPerDay, c.weeks);
        if (c.kind === "owned-source") {
          const b = bundleFor(eqlib, {});
          if (c.company != null) b.overrides.push({ uuid: "qt-company", scope: "workspace", entity: "class", entity_key: c.key, field: "owned_rate_hr_excl_fuel", value_num: c.company, value_text: null, confirmed_none: false, national_at_set: null, release_at_set: 1, note: null, set_by: "quantity table", set_at: "2026-11-16T00:00:00Z", updated_by: "quantity table", updated_at: "2026-11-16T00:00:00Z" });
          const lib = resolve.library(b);
          const m = cost.machineCost(lib, { classKey: c.key, mode: "owned", period: "auto", hours: 1, workDays: 0.125, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false });
          return { source: m.owned?.source ?? null, rate: m.owned?.rate ?? null };
        }
        if (c.kind === "match") return { keys: c.names.map((n) => match.suggest(n, eqlib.classes)[0]?.equip_key ?? null) };
        // D-1345: the kept pre-D-1336 solver against today's, the machine both ways, and the one-time rule.
        if (c.kind === "rule-solve") {
          const [day, week, fourWeek] = c.rates;
          const o = c.start ? { startWeekday: periods.weekdayOf(c.start) } : {};
          const n = periods.solveRental({ day, week, fourWeek }, c.days, c.hours, c.fixed, o);
          const b = pb.solveRentalBefore({ day, week, fourWeek }, c.days, c.hours, c.fixed, o);
          return { nowCost: n.cost, beforeCost: b.cost, beforeBilledDays: b.billedDays, beforeOvertimeHours: b.overtimeHours, beforeOvertimeCost: b.overtimeCost, beforeLabel: periods.coverLabel(b), delta: rc.ruleDelta(n.cost, b.cost) };
        }
        if (c.kind === "rule-machine") {
          const lib = resolve.library(bundleFor(eqlib, c));
          const before = rc.pricedBefore(lib, "rental_billing");
          const n = cost.machineCost(lib, c.input);
          const b = cost.machineCost(before, c.input);
          return {
            nowEquipment: n.equipment, beforeEquipment: b.equipment, nowWaiver: n.extras?.waiver ?? 0, beforeWaiver: b.extras?.waiver ?? 0, nowEnv: n.extras?.envFee ?? 0, beforeEnv: b.extras?.envFee ?? 0,
            fuelSame: (n.fuel?.cost ?? null) === (b.fuel?.cost ?? null), mobSame: (n.mob?.total ?? null) === (b.mob?.total ?? null),
            delta: rc.ruleDelta(n.total, b.total), libUntouched: !rc.isBefore(lib, "rental_billing"), beforeFlag: rc.isBefore(before, "rental_billing"),
          };
        }
        if (c.kind === "rule-note") {
          if (c.owed) return { owed: rc.changesOwed(c.firstPricedAt, c.records, c.arrivals, rc.RULE_CHANGES, c.wageMoves ?? {}).map((x) => x.key) };
          // D-1369: each move's amount, the labour rows at its after set (the rows as they stand when it is the current set)
          //   less the same at its before set; crew cost = wage x count x hours.
          if (c.wagePass) {
            const { hours, components, context, moves } = c.wagePass;
            const cost = (comps) => comps.reduce((t, comp) => t + comp.crew.reduce((u, r) => u + Number(r.hourly_wage) * Number(r.count) * hours, 0), 0);
            const after = (m) => cost(m.current === false ? rc.wagesBeforeComponents(components, m, context, 1) : components);
            const amounts = moves.map((m) => rc.ruleDelta(after(m), cost(rc.wagesBeforeComponents(components, m, context, 0))));
            // D-1375 part b: each move's rule part (`rulePart`) and the note's lines by cause, as the open records them.
            const parts = moves.map((m) => rc.rulePart(m, after(m), () => cost(rc.wagesBeforeComponents(components, m, context, "rule"))));
            const lines = moves.map((m, i) => (m.key ? rc.ruleNoteLines(rc.RULE_CHANGES.find((x) => x.key === m.key), { delta: amounts[i], rule_delta: parts[i], moved_at: m.movedAt }, "USD") : null));
            return { amounts, total: rc.ruleDelta(amounts.reduce((t, a) => t + a, 0), 0), parts, lines };
          }
          // D-1353: the notes Needs attention lists, and the rental line's words. D-1375 part b: each note's own lines.
          if (c.shown) return { shown: c.shown.map((records) => rc.notesShown(records, "USD").map((n) => n.text)) };
          if (c.lines) return { lines: c.lines.map((records) => rc.notesShown(records, "USD").map((n) => n.lines)) };
          if (c.cents) return { cents: c.cents.map(([amount, factor]) => rc.timesToCent(amount, factor)) };
          if (c.rentLabels) return { rentLabels: c.rentLabels.map(([d, start]) => periods.rentLabel(periods.solveRental({ day: 1040, week: 2927, fourWeek: 7950 }, d, d * 8, undefined, start ? { startWeekday: periods.weekdayOf(start) } : {}))) };
          if (c.texts) return { texts: c.texts.map((d) => rc.ruleNoteText(rc.RULE_CHANGES[0], d, "USD")) };
          return { deltas: c.deltas.map(([a, b]) => rc.ruleDelta(a, b)) };
        }
        if (c.kind === "solve") {
          const [day, week, fourWeek] = c.rates;
          const r = periods.solveRental({ day, week, fourWeek }, c.days, c.hours, c.fixed, c.start ? { startWeekday: periods.weekdayOf(c.start) } : {});
          if (!r) return { none: true };
          return { cost: r.cost, periodCost: r.periodCost, billedDays: r.billedDays, allowanceHours: r.allowanceHours, startAssumed: r.startAssumed, overtimeHours: r.overtimeHours, overtimeCost: r.overtimeCost, label: periods.coverLabel(r), alt: r.alternatives[0]?.label, altCost: r.alternatives[0]?.cost, skipped: r.skipped };
        }
        const lib = resolve.library(bundleFor(eqlib, c));
        const m = cost.machineCost(lib, { hoursPerDay: 8, ...c.input });
        return { total: m.total, equipment: m.equipment, fuel: m.fuel?.cost ?? null, mob: m.mob?.total ?? null, missing: m.missing.map((x) => x.field), locationLabel: m.location.label, fallback: m.ownedFallback };
      });
    },
    [EQUIPMENT_CASES, eqlib, bundleFor.toString()],
  );
}

const cents = (x) => Math.round(x * 100);

/** Compare the answers with the expectations; push each wrong row's line. */
export function checkEquipment(answers, wrong) {
  for (const [i, c] of EQUIPMENT_CASES.entries()) {
    const got = answers[i];
    if (c.kind === "shared-flag-catalog") for (const line of (got.bad ?? []).slice(0, 10)) wrong.push(c.id + ": unflagged " + line);
    if (c.kind === "prod-catalog" || c.kind === "prod-d") {
      for (const line of (got.bad ?? []).slice(0, 10)) wrong.push(c.id + ": " + line);
      if ((got.bad ?? []).length > 10) wrong.push(c.id + ": and " + (got.bad.length - 10) + " more");
    }
    if (c.kind === "host-same") {
      if (!got.same) wrong.push(c.id + ": a host with no library machine priced differently from evaluateComponent " + JSON.stringify(got.totals));
      continue;
    }
    if (c.kind === "host" && got.errors?.length && !c.expect.errors) wrong.push(c.id + ": " + got.errors.join("; "));
    if (c.kind === "mob-catalog") {
      if (got.checked !== 642) wrong.push(`${c.id}: checked ${got.checked} classes, expected 642`);
      for (const line of got.bad.slice(0, 10)) wrong.push(`${c.id}: ${line}`);
      if (got.bad.length > 10) wrong.push(`${c.id}: and ${got.bad.length - 10} more`);
      continue;
    }
    for (const [field, want] of Object.entries(c.expect)) {
      const have = got[field];
      if (typeof want === "number") {
        if (typeof have !== "number" || cents(have) !== cents(want)) wrong.push(`${c.id}.${field}: ${have}, expected ${want}`);
      } else if (JSON.stringify(have ?? null) !== JSON.stringify(want)) wrong.push(`${c.id}.${field}: ${JSON.stringify(have)}, expected ${JSON.stringify(want)}`);
    }
  }
}

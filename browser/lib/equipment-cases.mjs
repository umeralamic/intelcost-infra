// The equipment library's rows of the shared table (F33, D-724, D-730 onward): the app's own
// `lib/estimate/equipment` engine against the catalog's cached values and the answers worked by
// hand in the plan (`docs/tasks/EQUIPMENT_LIBRARY_PLAN.md` §3.4 to §3.6) and the founder's brief.
//
// The national rows come from the bench database (`quantity-table.sh` dumps `eqlib` to
// .qt-eqlib.json); each row adds the overrides it needs (a project's fuel price, a location
// factor) the way the api's bundle carries them. Money is compared to the cent.

const DIESEL = { setting: { fuel_price_diesel: 6.276 } };

// A host's components as the api keeps them (the fields the engine reads).
const comp = (id, kind, fields = {}) => ({
  id, takeoff_item_id: "host", kind, name: id, position: 0, qty_formula: null, unit: null, pricing_mode: kind === "equipment" ? "lump" : "unit",
  crew: null, production_rate: null, production_basis: null, crew_day_hours: null, unit_price: null, equip_rate: null, equip_basis: null,
  duration_formula: null, mob_demob: null, sub_calc: null, quote_amount: null, unit_rate: null, total: null, ...fields,
});
const excavator = (fields = {}) => comp("ex", "equipment", { position: 0, eq_class_key: "EX-CRAWL-20T", eq_activity_key: "EW-CUTLOAD", eq_mode: "rental", eq_period: "auto", eq_units: 2, eq_include_mob: true, ...fields });
const operators = (count = 2, fields = {}) => comp("crew", "labor", { position: 1, crew: [{ role: "TEST Operator", count, hourly_wage: 50, for_equipment: "ex" }], production_rate: 12.5, production_basis: "units_per_hr", ...fields });

export const EQUIPMENT_CASES = [
  // Every class's mob and demob at the catalog's 50 miles, as the workbook cached them (628 rows).
  { id: "eq-mob-catalog-628", kind: "mob-catalog" },

  // The work-day solver (D-724 rule 6, plan §3.4).
  { id: "eq-solve-8-days", kind: "solve", rates: [1040, 2927, 7950], days: 7.6526, hours: 61.2205, expect: { cost: 5854, label: "2 weeks", alt: "1 week + 3 days", altCost: 6047 } },
  { id: "eq-solve-7-days", kind: "solve", rates: [1040, 2927, 7950], days: 6.6667, hours: 53.3333, expect: { cost: 5007, label: "1 week + 2 days" } },
  { id: "eq-solve-20-days", kind: "solve", rates: [1040, 2927, 7950], days: 20, hours: 160, expect: { cost: 7950, label: "one 4-week" } },
  { id: "eq-solve-10-days-10-hr", kind: "solve", rates: [1040, 2927, 7950], days: 10, hours: 100, expect: { cost: 7317.5, periodCost: 5854, overtimeHours: 20, overtimeCost: 1463.5, label: "2 weeks" } },
  { id: "eq-solve-11-days", kind: "solve", rates: [1040, 2927, 7950], days: 10.1526, hours: 81.2205, expect: { cost: 6894, label: "2 weeks + 1 day" } },
  { id: "eq-solve-lift-8-days", kind: "solve", rates: [563, 1370, 2766], days: 8, hours: 64, expect: { cost: 2740, label: "2 weeks", alt: "one 4-week", altCost: 2766 } },
  { id: "eq-solve-blank-week", kind: "solve", rates: [1040, null, 7950], days: 8, hours: 64, expect: { cost: 7950, label: "one 4-week", skipped: ["wk"] } },
  { id: "eq-solve-no-rates", kind: "solve", rates: [null, null, null], days: 8, hours: 64, expect: { none: true } },
  { id: "eq-solve-fixed-day", kind: "solve", rates: [1040, 2927, 7950], days: 7.6526, hours: 61.2205, fixed: "day", expect: { cost: 8320, label: "8 days" } },

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
  // missing; five shared over 500 machine-hr, $53,070.00. A self-propelled BARE machine keeps the rule: WT-2000's
  // mob is missing (its fuel burn too: the catalog has none), and a shared one flags every line it serves, never a silent $0.
  // WT-4000 (D-892): 40 hr over 5 days is 1 week $3,067.00, fuel low 5.95 gal/hr × 40 hr × $6.276 = $1,493.69, mob none: $4,560.69.
  // On fine grade (D-894 Q4) at A11's tier 3, × 0.5: half of $4,560.688 = $2,280.34; its flag is off (the starter's optional count is 10).
  { id: "eq-894-wt4000-fine-grade", kind: "machine", ...DIESEL, input: { classKey: "WT-4000", mode: "rental", period: "auto", hours: 40, workDays: 5, fuelLoad: "low", units: 0.5, includeMob: true }, expect: { total: 2280.344, mob: 0, missing: [] } },
  { id: "eq-892-wt4000", kind: "machine", ...DIESEL, input: { classKey: "WT-4000", mode: "rental", period: "auto", hours: 40, workDays: 5, fuelLoad: "low", units: 1, includeMob: true }, expect: { total: 4560.69, mob: 0, missing: [] } },
  { id: "eq-756-operated-no-mob", kind: "machine", setting: {}, input: { classKey: "DT-OP-3AXLE", mode: "operated", period: "hr", hours: 100, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 10614, mob: 0, missing: [] } },
  { id: "eq-756-bare-self-propelled", kind: "machine", ...DIESEL, input: { classKey: "WT-2000", mode: "rental", period: "auto", hours: 40, workDays: 5, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: null, missing: ["fuel_gph_med", "mob"] } },
  { id: "eq-756-shared-trucks", kind: "shared", setting: {}, resource: { name: "Haul off: DT-OP-3AXLE", eq_class_key: "DT-OP-3AXLE", eq_units: 5, eq_mode: "operated", eq_hours_per_day: 10 }, hosts: [{ id: "h1", machineHours: 300 }, { id: "h2", machineHours: 200 }], expect: { total: 53070, h1: 31842, h2: 21228, unallocated: 0, flagged: 0 } },
  { id: "eq-756-shared-missing-flags", kind: "shared", ...DIESEL, resource: { name: "TEST water truck", eq_class_key: "WT-2000", eq_units: 1, eq_mode: "rental" }, hosts: [{ id: "h1", machineHours: 24 }, { id: "h2", machineHours: 16 }], expect: { total: 0, flagged: 2, unflagged: 0 } },
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
  // workspace (empty list, show all) is offered every live class, 628, none under My equipment. (2) Mine-only with
  // three on the list (one a custom machine) offers exactly those three first, and the full search still reaches
  // all 628 national classes plus the custom one. (3) EX-CRAWL-30T on the starter's worked check prices $16,471.70
  // on the list, off it, and off it in mine-only mode.
  { id: "eq-759-default-offers-all", kind: "suggest", setting: {}, expect: { mine: 0, offered: 628, folded: false } },
  { id: "eq-759-mine-only", kind: "suggest", setting: {}, myEquipment: ["EX-CRAWL-30T", "ADT-30T", "U-TEST1"], mineOnly: true, custom: { classes: [{ equip_key: "U-TEST1", category: "Company equipment", type: "TEST Loader", size_class: "TEST 3 yd", pricing_kind: "duration", custom: true }], activities: [], production: [] }, expect: { mine: 3, mineKeys: ["ADT-30T", "EX-CRAWL-30T", "U-TEST1"], folded: true, full: 629, fullNational: 628 } },
  { id: "eq-759-on-list-prices", kind: "machine", ...DIESEL, myEquipment: ["EX-CRAWL-30T"], input: { classKey: "EX-CRAWL-30T", mode: "rental", period: "auto", hours: 100, workDays: 10, hoursPerDay: 10, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 16471.70, fuel: 2824.20, mob: 3600 } },
  { id: "eq-759-off-list-prices", kind: "machine", ...DIESEL, myEquipment: ["ADT-30T"], input: { classKey: "EX-CRAWL-30T", mode: "rental", period: "auto", hours: 100, workDays: 10, hoursPerDay: 10, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 16471.70, fuel: 2824.20, mob: 3600 } },
  { id: "eq-759-off-list-mine-only-prices", kind: "machine", ...DIESEL, myEquipment: ["ADT-30T"], mineOnly: true, input: { classKey: "EX-CRAWL-30T", mode: "rental", period: "auto", hours: 100, workDays: 10, hoursPerDay: 10, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 16471.70, fuel: 2824.20, mob: 3600 } },

  // The founder's spread numbers at machine level (2 × EX-CRAWL-20T; the spread itself is Block 3.1).
  { id: "eq-spread-8hr", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 80, workDays: 10, hoursPerDay: 8, fuelLoad: "med", units: 2, includeMob: true }, expect: { total: 16699.56 } },
  { id: "eq-spread-10hr", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 100, workDays: 10, hoursPerDay: 10, fuelLoad: "med", units: 2, includeMob: true }, expect: { total: 20324.46 } },
  { id: "eq-spread-500", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 160, workDays: 20, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 11841.56 } },
  { id: "eq-spread-3-machines", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 53.333333333333336, workDays: 6.666666666666667, hoursPerDay: 8, fuelLoad: "med", units: 3, includeMob: true }, expect: { total: 21112.56 } },
];

/** The bundle the api would send, from the dumped national rows and a case's overrides. */
export function bundleFor(eqlib, c = {}) {
  const overrides = Object.entries(c.setting ?? {}).map(([key, value], i) => ({
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
    classes: eqlib.classes,
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
        if (c.kind === "match") return { keys: c.names.map((n) => match.suggest(n, eqlib.classes)[0]?.equip_key ?? null) };
        if (c.kind === "solve") {
          const [day, week, fourWeek] = c.rates;
          const r = periods.solveRental({ day, week, fourWeek }, c.days, c.hours, c.fixed);
          if (!r) return { none: true };
          return { cost: r.cost, periodCost: r.periodCost, overtimeHours: r.overtimeHours, overtimeCost: r.overtimeCost, label: periods.coverLabel(r), alt: r.alternatives[0]?.label, altCost: r.alternatives[0]?.cost, skipped: r.skipped };
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
      if (got.checked !== 628) wrong.push(`${c.id}: checked ${got.checked} classes, expected 628`);
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

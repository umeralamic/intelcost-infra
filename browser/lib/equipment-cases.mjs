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
          return { total: v.result.total, h1: out.allocByHost.get("h1") ?? 0, h2: out.allocByHost.get("h2") ?? 0, unallocated: v.result.unallocated };
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
        return { total: m.total, equipment: m.equipment, fuel: m.fuel?.cost ?? null, mob: m.mob?.total ?? null, missing: m.missing.map((x) => x.field), locationLabel: m.location.label };
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
    if (c.kind === "prod-catalog" || c.kind === "prod-d") {
      for (const line of (got.bad ?? []).slice(0, 10)) wrong.push(c.id + ": " + line);
      if ((got.bad ?? []).length > 10) wrong.push(c.id + ": and " + (got.bad.length - 10) + " more");
    }
    if (c.kind === "host-same") {
      if (!got.same) wrong.push(c.id + ": a host with no library machine priced differently from evaluateComponent " + JSON.stringify(got.totals));
      continue;
    }
    if (c.kind === "host" && got.errors?.length) wrong.push(c.id + ": " + got.errors.join("; "));
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

// The equipment library's rows of the shared table (F33, D-724, D-730 onward): the app's own
// `lib/estimate/equipment` engine against the catalog's cached values and the answers worked by
// hand in the plan (`docs/tasks/EQUIPMENT_LIBRARY_PLAN.md` §3.4 to §3.6) and the founder's brief.
//
// The national rows come from the bench database (`quantity-table.sh` dumps `eqlib` to
// .qt-eqlib.json); each row adds the overrides it needs (a project's fuel price, a location
// factor) the way the api's bundle carries them. Money is compared to the cent.

const DIESEL = { setting: { fuel_price_diesel: 6.276 } };

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
  { id: "eq-ex1-rental", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 61.22050885738075, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 8022.13, equipment: 5854, fuel: 1068.13, mob: 1100 } },
  { id: "eq-ex1-owned", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "owned", period: "hr", hours: 61.22050885738075, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 8153.05 } },
  { id: "eq-ex1-low-fuel", kind: "machine", ...DIESEL, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 61.22050885738075, fuelLoad: "low", units: 1, includeMob: true }, expect: { fuel: 837.6 } },
  { id: "eq-ex1-location-0.99", kind: "machine", setting: { fuel_price_diesel: 6.276 }, location: 0.99, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 61.22050885738075, fuelLoad: "med", units: 1, includeMob: true }, expect: { equipment: 5795.46, locationLabel: "From the wage set: Equipment −1 %" } },
  { id: "eq-ex2-lift", kind: "machine", ...DIESEL, input: { classKey: "AW-AB-RT-60", mode: "rental", period: "auto", hours: 64, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 3895.13, equipment: 2740, fuel: 755.13, mob: 400 } },
  { id: "eq-ex2-lift-owned", kind: "machine", ...DIESEL, input: { classKey: "AW-AB-RT-60", mode: "owned", period: "hr", hours: 64, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: 4497.21 } },
  { id: "eq-ex2-electric-missing-fuel", kind: "machine", ...DIESEL, input: { classKey: "AW-AB-EL-60", mode: "rental", period: "auto", hours: 64, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: null, equipment: 2746, missing: ["fuel_gph_med"] } },
  { id: "eq-no-fuel-price", kind: "machine", setting: {}, input: { classKey: "EX-CRAWL-20T", mode: "rental", period: "auto", hours: 61.22050885738075, fuelLoad: "med", units: 1, includeMob: true }, expect: { total: null, missing: ["fuel_price_diesel"] } },
  { id: "eq-operated-crane-minimum", kind: "machine", setting: {}, input: { classKey: "CR-HYD-40T-OP", mode: "operated", period: "hr", hours: 2, fuelLoad: "med", units: 1, includeMob: false }, expect: { total: 980 } },

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
    custom: { classes: [], activities: [], production: [] },
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

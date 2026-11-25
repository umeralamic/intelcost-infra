// Plan A-lean AL4 wired (D-1331): a run's dewatering line by its method, the sump's 24 h clock and calendar rental,
// a sump line priced through the app's own host engine (the library's PMP-TRASH-3, its fuel, the patrols and CGP report
// at the wage), and a wellpoint line's Needs attention words ("Quote needed"). Each row worked by hand in its comment
// (the spec's §6 inputs: `dw-sump-clay`, `dw-wp-single`); numbers to the cent or 1e-9 relative, text exactly.
//
// Library rates (A, eqlib release on the bench): PMP-TRASH-3 $65 / $239 / $693, 0.65 gal/hr gas, pickup-towed;
// PMP-SP-6D 1.7 gal/hr (the wellpoint pump's stand-in, E). Gasoline typed at $3.578 (TX, spec §6).

import { bundleFor } from "./equipment-cases.mjs";

const comp = (id, kind, fields) => ({ id, takeoff_item_id: "dw", kind, name: id, position: 0, qty_formula: null, unit: null, pricing_mode: kind === "labor" ? "unit" : "lump", crew: null, production_rate: null, production_basis: null, crew_day_hours: null, unit_price: null, equip_rate: null, equip_basis: null, duration_formula: null, mob_demob: null, sub_calc: null, quote_amount: null, unit_rate: null, ...fields });
const pump = () => comp("pump", "equipment", { position: 0, eq_class_key: "PMP-TRASH-3", eq_mode: "rental", eq_period: "auto", eq_units: 1, eq_include_mob: true, eq_auto: true, auto_key: "eq:PMP-TRASH-3:0" });
const patrol = () => comp("crew", "labor", { position: 1, crew: [{ role: "Laborer", count: 1, hourly_wage: 34.05 }], production_basis: "units_per_hr", eq_auto: true, auto_key: "crew" });
const SUMP_NOTE = "Sump pumping, 24 h: at the run's pipe crew pace, 200.0 LF a day";

export const DEWATER_CASES = [
  // --- The line a run's stretches below the water go on (lines.ts:dewaterLine) ------------------------------------------
  // dw-line-sump: bottom 10 ft, water 6 ft (4.0 ft above the bottom), CL (k 10⁻⁶ from the USCS table) → rule 2, a sump:
  //   "trench:sump", "Trench dewatering, sump pumping", the reason as method.ts words it.
  { id: "dw-line-sump", kind: "dw-line", site: { bottomDepthFt: 10, waterDepthFt: 6, heightFt: 4, uscs: "CL", bottomWidthFt: 2.5, walls: "box" }, expect: { variant: "trench:sump", name: "Trench dewatering, sump pumping", reason: "Sump pumping: clay (k 10⁻⁶ cm/s), water 4.0 ft above the bottom" } },
  // dw-line-sump-heave: the same with the water 12 ft above a 16 ft bottom: the sump and the heave check on its note.
  { id: "dw-line-sump-heave", kind: "dw-line", site: { bottomDepthFt: 16, waterDepthFt: 4, heightFt: 12, uscs: "CH", bottomWidthFt: 2.5, walls: "box" }, expect: { variant: "trench:sump", flagged: true } },
  // dw-line-wellpoint: bottom 12, water 5 (H 7), SP (10⁻²): drawdown 14 ≤ 15 → rule 5, wellpoints, one row, 8 ft
  //   (k ≥ 10⁻²): "trench:wellpoint", its reason and "Wellpoint gear: Quote needed".
  { id: "dw-line-wellpoint", kind: "dw-line", site: { bottomDepthFt: 12, waterDepthFt: 5, heightFt: 7, uscs: "SP", bottomWidthFt: 2.5, walls: "box" }, expect: { variant: "trench:wellpoint", name: "Trench dewatering, wellpoints", quoteNeeded: true } },
  // dw-line-eductor: bottom 18, water 6, ML (10⁻⁴), a box: lift 20 > 15 in the silt band → rule 4, eductors: not built,
  //   the line stays "trench" (priced by hand), its note saying so.
  { id: "dw-line-eductor", kind: "dw-line", site: { bottomDepthFt: 18, waterDepthFt: 6, heightFt: 12, uscs: "ML", bottomWidthFt: 2.5, walls: "box" }, expect: { variant: "trench", name: "Trench dewatering", byHand: true } },
  // dw-line-none: no stretch below the water: the line as before, "trench", no words.
  { id: "dw-line-none", kind: "dw-line", site: null, expect: { variant: "trench", name: "Trench dewatering", reason: "" } },
  // dw-line-group-note (AL4b, the founder's answer 2): the dw-line-sump site with its USCS the soil group's stand-in
  //   (GROUP_USCS clay → CL): the note names the mapping first, "Clay → low permeability → sump" (k 10⁻⁶ < 10⁻⁴).
  { id: "dw-line-group-note", kind: "dw-line", site: { bottomDepthFt: 10, waterDepthFt: 6, heightFt: 4, uscs: "CL", bottomWidthFt: 2.5, walls: "box", fromGroup: "clay" }, expect: { variant: "trench:sump", reason: "Clay → low permeability → sump: Sump pumping: clay (k 10⁻⁶ cm/s), water 4.0 ft above the bottom" } },
  // dw-line-group-sand: SP from the sand group (k 10⁻² ≥ 10⁻³): "Sand → high permeability → wellpoints: …".
  { id: "dw-line-group-sand", kind: "dw-line", site: { bottomDepthFt: 12, waterDepthFt: 5, heightFt: 7, uscs: "SP", bottomWidthFt: 2.5, walls: "box", fromGroup: "sand" }, expect: { variant: "trench:wellpoint", startsWith: "Sand → high permeability → wellpoints: Wellpoints, single row" } },

  // --- The sump's 24 h clock and its calendar rental ----------------------------------------------------------------------
  // dw-clock-2: 400 LF at 200 LF a day = 2 crew days; open 2 + 1 = 3; calendar 3 × 7/5 = 4.2; pump 4.2 × 24 = 100.8 h;
  //   patrols 4.2 × 2 visits × 1 h = 8.4 h; CGP report 4.2 × 0.25 = 1.05 h (sumpQuantities' `dw-sump-clay`).
  { id: "dw-clock-2", kind: "dw-clock", workDays: 2, expect: { openDays: 3, calendarDays: 4.2, pumpHoursEach: 100.8, watchHours: 8.4, cgpReportHours: 1.05 } },
  // dw-rent-5-calendar: PMP-TRASH-3 over 4.2 calendar days → 5 billed: 5 days $325 against one 7-day week $239: $239, no
  //   overtime on the 100.8 h clock (spec §6 `dw-sump-clay`).
  { id: "dw-rent-5-calendar", kind: "dw-solve", rates: [65, 239, 693], days: 4.2, hours: 100.8, expect: { cost: 239, billedDays: 5, overtimeHours: 0, weeks: 1, days: 0, fourWeeks: 0 } },
  // dw-rent-30-calendar: 30 calendar days: one 28-day 4-week + 2 days = 693 + 130 = $823 (4-week + week 932; 5 weeks
  //   1,195; 30 days 1,950).
  { id: "dw-rent-30-calendar", kind: "dw-solve", rates: [65, 239, 693], days: 30, hours: 720, expect: { cost: 823, billedDays: 30, overtimeHours: 0, fourWeeks: 1, weeks: 0, days: 2 } },
  // dw-rent-work-days-unchanged: the same 30 days as WORK days (any machine off the 24 h clock): from a Monday (no start
  //   date), 6 work weeks to the 6th Friday, off rent at its end (D-1344; D-1336 kept that weekend: 42): 40 calendar days
  //   on rent, one 4-week + 2 weeks = 693 + 478 = $1,171 as before (4-week + week + 5 days $1,257; 2 × 4-week $1,386);
  //   240 h against 160 + 80 = 240 h: no overtime.
  { id: "dw-rent-work-days-unchanged", kind: "dw-solve", rates: [65, 239, 693], days: 30, hours: 240, workDayBasis: true, expect: { cost: 1171, billedDays: 40, overtimeHours: 0, fourWeeks: 1, weeks: 2, days: 0 } },

  // --- A sump line priced through the host engine -------------------------------------------------------------------------
  // dw-host-sump: 400 LF on a sump line at the run's 200 LF a day (the api's spread, SUMP_NOTE): 2 crew days → the clock
  //   above. The pump: rent one 7-day week $239 × location 1.00; fuel 100.8 h × 0.65 gal/hr × $3.578 = $234.43; its
  //   rental extras (D-1287) and mob are the machine's as for any rental, checked by the equipment rows, not here.
  //   The crew: one laborer on the patrols and the report, 8.4 + 1.05 = 9.45 h × $34.05 = $321.77; no half-day floor.
  { id: "dw-host-sump", kind: "dw-host", setting: { fuel_price_gasoline: 3.578 }, qty: 400, unit: "LF", spread: { prod_per_day: 200, prod_unit: "LF", note: SUMP_NOTE }, rows: [pump(), patrol()], expect: { rent: 239, billedDays: 5, overtimeHours: 0, fuel: 234.43, pumpHours: 100.8, workDays: 4.2, crewHours: 9.45, labor: 321.77, label24: true } },
  // dw-host-not-sump: the same rows on an ordinary spread (no SUMP_NOTE): the work-day path as before, 2 days × 8 h =
  //   16 h, 2 billed days $130, the crew 16 h: proves only the sump's note turns the clock on.
  { id: "dw-host-not-sump", kind: "dw-host", setting: { fuel_price_gasoline: 3.578 }, qty: 400, unit: "LF", spread: { prod_per_day: 200, prod_unit: "LF" }, rows: [pump(), patrol()], expect: { rent: 130, billedDays: 2, pumpHours: 16, crewHours: 16, label24: false } },

  // --- A wellpoint line's words (lib/estimate/dewatering.ts) ----------------------------------------------------------------
  // dw-words-wellpoint: one run, 600 LF below the water at 150 LF a day, the `dw-line-wellpoint` site (H 7 ≤ 10, width
  //   2.5 ≤ 6: one row; SP 10⁻² → 8 ft): as `wellpointQuantities` works §4.2 (`dw-wp-single`'s figures at 8 ft):
  //   wd 4; system 4 + 2 + 1 = 7 days; calendar 9.8; header min(600, 150 × 4) = 600 LF; points ⌈600/8⌉ + 1 = 76, 21 ft
  //   (first ≥ 14 + 5); pumps ⌈600/500⌉ = 2 + 1 standby; 9.8 × 24 × 2 = 470.4 h; × 1.7 = 799.68 gal. "Quote needed".
  { id: "dw-words-wellpoint", kind: "dw-words", variant: "trench:wellpoint", runs: [{ site: { bottomDepthFt: 12, waterDepthFt: 5, heightFt: 7, uscs: "SP", bottomWidthFt: 2.5, walls: "box" }, lf: 600 }], lfPerDay: 150, gph: 1.7, expect: { starts: "Wellpoints, Quote needed: 76 wellpoints installed (21 ft)", has: ["600 LF of header", "2 wellpoint pumps + 1 standby, 470.4 pump-hours, 799.68 gal diesel"] } },
  // dw-words-sump: 400 LF at 200 LF a day: calendar 4.2 → ⌈4.2 / 3⌉ = 2 filter bags, "Quote needed".
  { id: "dw-words-sump", kind: "dw-words", variant: "trench:sump", runs: [{ site: { bottomDepthFt: 10, waterDepthFt: 6, heightFt: 4, uscs: "CL", bottomWidthFt: 2.5, walls: "box" }, lf: 400 }], lfPerDay: 200, gph: null, expect: { equals: "Sump pumping: 2 filter bags, Quote needed" } },
  // dw-words-no-pace: a wellpoint line before its pipe lines are priced: says so, never a number.
  // --- A hand-priced line (AL4b, the founder's answer 1) ------------------------------------------------------------------
  // dw-hand-sump: a sump line a person priced with a $5,000 subcontract lump: handPriced true, its price $5,000 kept
  //   (computeLineCost on the typed input, no component), and Calculate's figure beside it the dw-host-sump line priced
  //   whole: the pump's week $239 + its fuel $234.43 + its mob $200 out and $200 back (no waiver or fee in the bundle) +
  //   the crew $321.77 = $1,195.20, the same total as the
  //   api's own pump and crew priced through the host engine, so the figure shown is what Calculate would put there.
  //   Calculate's components alone (the pump and crew edited, the foundation stone edited) are not a hand price; a
  //   component a person added (no Calculate key) is.
  { id: "dw-hand-sump", kind: "dw-hand", setting: { fuel_price_gasoline: 3.578 }, qty: 400, pace: 200, wage: 34.05, typed: { subcontract_cost: 5000 }, expect: { handTyped: true, handAutos: false, handOwn: true, handStone: false, kept: 5000, matches: true, computed: 1195.20 } },
  // dw-hand-wellpoint: a hand-priced wellpoint line: Calculate prices none of its gear, so the figure beside the kept
  //   price says "wellpoint gear Quote needed".
  { id: "dw-hand-wellpoint", kind: "dw-hand", variant: "trench:wellpoint", qty: 400, pace: 200, wage: 34.05, typed: { subcontract_cost: 5000 }, expect: { kept: 5000, words: "wellpoint gear Quote needed" } },
  { id: "dw-words-no-pace", kind: "dw-words", variant: "trench:wellpoint", runs: [{ site: { bottomDepthFt: 12, waterDepthFt: 5, heightFt: 7, uscs: "SP", bottomWidthFt: 2.5, walls: "box" }, lf: 600 }], lfPerDay: null, gph: 1.7, expect: { starts: "Wellpoints: No crew pace yet" } },
];

export async function runDewater(page, eqlib) {
  return page.evaluate(
    async ([cases, eqlib, bundleSrc]) => {
      const lines = await import("/src/lib/takeoff/earthwork/utilities/lines.ts");
      const qty = await import("/src/lib/takeoff/earthwork/water/quantities.ts");
      const periods = await import("/src/lib/estimate/equipment/periods.ts");
      const resolve = await import("/src/lib/estimate/equipment/resolve.ts");
      const host = await import("/src/lib/estimate/equipment/host.ts");
      const dw = await import("/src/lib/estimate/dewatering.ts");
      const costing = await import("/src/lib/estimate/costing.ts");
      const bundleFor = new Function(`return ${bundleSrc}`)();
      return cases.map((c) => {
        if (c.kind === "dw-line") {
          const l = lines.dewaterLine(c.site ? { dewaterSite: c.site } : {});
          return { variant: l.variant, name: l.name, reason: l.reason, startsWith: c.expect.startsWith && l.reason.startsWith(c.expect.startsWith) ? c.expect.startsWith : l.reason, flagged: /heave/i.test(l.reason), quoteNeeded: l.reason.endsWith("Wellpoint gear: Quote needed"), byHand: /price by hand/i.test(l.reason) };
        }
        if (c.kind === "dw-clock") return qty.sumpClock(c.workDays);
        if (c.kind === "dw-solve") {
          const [day, week, fourWeek] = c.rates;
          const r = periods.solveRental({ day, week, fourWeek }, c.days, c.hours, undefined, c.workDayBasis ? {} : { calendar: true });
          return r && { cost: r.cost, billedDays: r.billedDays, overtimeHours: r.overtimeHours, fourWeeks: r.fourWeeks, weeks: r.weeks, days: r.days };
        }
        if (c.kind === "dw-host") {
          const lib = resolve.library(bundleFor(eqlib, c));
          const evals = host.evaluateHost(c.rows, { qty: c.qty, parent: c.qty }, { lib, spread: c.spread, qtyUnit: c.unit });
          const p = evals.find((e) => e.kind === "equipment");
          const m = p?.library?.breakdown;
          const crew = evals.find((e) => e.kind === "labor");
          return {
            rent: m?.rental?.cost ?? null,
            billedDays: m?.rental?.billedDays ?? null,
            overtimeHours: m?.rental?.overtimeHours ?? null,
            fuel: m?.fuel?.cost ?? null,
            pumpHours: m?.hours ?? null,
            workDays: m?.workDays ?? null,
            waiver: m?.extras?.waiver ?? null,
            crewHours: crew?.crewHours ?? null,
            labor: crew?.total ?? null,
            label24: /24 h clock/.test(p?.library?.label ?? ""),
            errors: evals.map((e) => e.error).filter(Boolean),
          };
        }
        if (c.kind === "dw-hand") {
          const variant = c.variant ?? "trench:sump";
          const lib = resolve.library(bundleFor(eqlib, c));
          const env = { qty: c.qty, parent: c.qty };
          const laborer = { craft_code: "LAB", rate: c.wage };
          const autos = dw.sumpRows("dw", laborer);
          const input = { wastage_pct_override: null, unit_man_hours: null, hourly_wage: null, equipment_cost: null, unit_equipment_cost: null, unit_material_cost: null, subcontract_cost: null, ...c.typed };
          const kept = costing.computeLineCost({ quantity: c.qty, unit: "LF", input, unitWastage: new Map(), netQty: c.qty, rules: 2 }).itemCost;
          const r = dw.calculatePrice({ others: [], variant, itemId: "dw", qty: c.qty, unit: "LF", pace: c.pace, lib, env, laborer, unitWastage: new Map(), rules: 2 });
          const spread = { prod_per_day: c.pace, prod_unit: "LF", note: `${host.SUMP_NOTE} at the run's pipe crew pace, ${c.pace.toFixed(1)} LF a day` };
          const whole = costing.computeLineCost({ quantity: c.qty, unit: "LF", input: undefined, unitWastage: new Map(), components: host.evaluateHost(autos, env, { lib, spread, qtyUnit: "LF" }), netQty: c.qty, rules: 2 }).itemCost;
          return {
            handTyped: dw.handPriced(input, autos),
            handAutos: dw.handPriced(undefined, autos.map((a) => ({ ...a, user_fields: ["eq_units"] }))),
            handOwn: dw.handPriced(undefined, [...autos, { auto_key: null, eq_auto: null }]),
            handStone: dw.handPriced(undefined, [...autos, { auto_key: "stone:foundation", eq_auto: null, user_fields: ["unit_price"] }]),
            kept,
            ...("total" in r ? { computed: r.total, matches: Math.abs(r.total - whole) < 1e-9 } : { words: r.words }),
          };
        }
        if (c.kind === "dw-words") {
          const s = dw.dewateringAttention(c.variant, c.runs.map((r) => ({ q: { dewaterSite: r.site }, lf: r.lf })), c.lfPerDay, c.gph);
          return { text: s };
        }
        return { error: `unknown kind ${c.kind}` };
      });
    },
    [DEWATER_CASES, eqlib, bundleFor.toString()],
  );
}

const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const cents = (x) => Math.round(x * 100 + 1e-7 * Math.sign(x));

export function checkDewater(answers, wrong) {
  for (const [i, c] of DEWATER_CASES.entries()) {
    const got = answers[i];
    if (got?.error) {
      wrong.push(`${c.id}: ${got.error}`);
      continue;
    }
    if (got?.errors?.length) wrong.push(`${c.id}: ${got.errors.join("; ")}`);
    if (c.kind === "dw-words") {
      const t = got?.text ?? "";
      if (c.expect.equals !== undefined && t !== c.expect.equals) wrong.push(`${c.id}: "${t}", expected "${c.expect.equals}"`);
      if (c.expect.starts && !t.startsWith(c.expect.starts)) wrong.push(`${c.id}: "${t.slice(0, 120)}", expected to start "${c.expect.starts}"`);
      for (const h of c.expect.has ?? []) if (!t.includes(h)) wrong.push(`${c.id}: "${t.slice(0, 200)}" lacks "${h}"`);
      continue;
    }
    for (const [field, want] of Object.entries(c.expect)) {
      const have = got?.[field];
      if (typeof want === "number") {
        const ok = typeof have === "number" && (c.kind === "dw-host" || c.kind === "dw-hand" ? cents(have) === cents(want) : close(have, want));
        if (!ok) wrong.push(`${c.id}.${field}: ${have}, expected ${want}`);
      } else if (JSON.stringify(have ?? null) !== JSON.stringify(want)) wrong.push(`${c.id}.${field}: ${JSON.stringify(have)}, expected ${JSON.stringify(want)}`);
    }
  }
}

// Plan A-lean AL4's rows of the shared table (D-1288): the app's pure `lib/takeoff/earthwork/water` module (method,
// quantities, rain, pay) against the answers worked by hand in the spec (`docs/tasks/dewatering_weather_tasks.md` §6,
// §4.5) and a few edges of the rule. Quantities only: the module prices nothing (wellpoint gear "Quote needed", the
// sump pump from the library's trash pump once wired, fuel and the watch at the project's price and wage), so a $ in a
// comment is the wiring's, not checked here. Numbers to 1e-9 relative; text exactly.
//
// Common inputs (§6): target 2 ft, ahead 2, behind 1 (D); an 8 h crew day; PMP-TRASH-3 0.65 gal/hr, PMP-SP-6D 1.7 gal/hr
// (the wellpoint pump's stand-in). IAH (USW00012960) 1991–2020 normals, as §2.c returned them.

import { EQUIPMENT_CASES } from "./equipment-cases.mjs";

// Days >= 0.10, 0.50, 1.00 in, Jan to Dec.
const GE010 = [5.7, 4.9, 4.8, 4.4, 5.4, 6.6, 5.7, 5.8, 5.8, 4.9, 4.7, 5.7];
const GE050 = [2.6, 2.3, 2.1, 2.3, 2.8, 3.6, 2.3, 2.7, 2.6, 2.9, 2.3, 2.6];
const GE100 = [1.2, 0.8, 1.2, 1.3, 1.6, 2.0, 1.0, 1.2, 1.2, 1.6, 1.2, 1.2];
export const IAH = GE010.map((ge010, i) => ({ ge010, ge050: GE050[i], ge100: GE100[i] }));
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// One month's earthwork lost days by the §5.b rule, written out so each row's arithmetic reads in its comment.
const ew = (m) => (GE050[m] + (GE050[m] + GE100[m]) * (1 - GE050[m] / DAYS[m])) * 5 / 7;

const SP_RUN = { lf: 600, lfPerDay: 150, pumpGph: 1.7 };
const SP_SINGLE = { kind: "trench", bottomDepthFt: 12, waterDepthFt: 5, soil: { kCmS: 2e-3, uscs: "SP" }, bottomWidthFt: 2.5, walls: "box" };

export const WATER_CASES = [
  // --- The method (§3.2) and the run's quantities (§4.1–§4.3) ---------------------------------------------------------
  // dw-none: SDR 35 8 in, bottom 8.35 ft, design water 10.0 ft: H = 8.35 − 10.0 = −1.65 ≤ 0 → rule 1, none (rain sumps only).
  { id: "dw-none", kind: "dw", site: { kind: "trench", bottomDepthFt: 8.35, waterDepthFt: 10, soil: { uscs: "SM" } }, run: SP_RUN, expect: { m: { method: "none", rule: 1, heightFt: 8.35 - 10, built: false, priceByHand: false }, q: { kind: "none" } } },
  // dw-sump-clay: bottom 10, water 6, CL (k 10⁻⁶ from the USCS table) → H 4.0, k < 10⁻⁴ → rule 2, sump, no heave flag
  //   (H ≤ 10). 400 LF at 200 LF/day: wd 2; open 2 + 1 = 3; calendar 3 × 7/5 = 4.2; hours 4.2 × 24 = 100.8 (one heading,
  //   one pump); fuel 100.8 × 0.65 = 65.52 gal; bags 1 × ⌈4.2/3⌉ = 2. Priced once wired (Q17): rental 1 week $239
  //   (5 days × $65 = $325 is dearer), fuel 65.52 × $3.578 = $234.43.
  {
    id: "dw-sump-clay", kind: "dw",
    site: { kind: "trench", bottomDepthFt: 10, waterDepthFt: 6, soil: { uscs: "CL" }, bottomWidthFt: 2.5 },
    run: { lf: 400, lfPerDay: 200, pumpGph: 0.65 },
    expect: {
      m: { method: "sump", rule: 2, heightFt: 4, kCmS: 1e-6, kSource: "uscs", built: true, priceByHand: false, flags: [], reason: "Sump pumping: clay (k 10⁻⁶ cm/s), water 4.0 ft above the bottom" },
      q: { kind: "sump", workDays: 2, openDays: 3, calendarDays: 4.2, pumps: 1, pumpHoursEach: 100.8, pumpHours: 100.8, fuelGal: 65.52, filterBags: 2, permit: "none" },
      prices: { "sump-pump": "From the library (PMP-TRASH-3) once wired", "sump-fuel": "At the project's gasoline", "filter-bags": "Quote needed" },
    },
  },
  // dw-sump-heave: CH, bottom 14, water 2 → H 12 > 10: sump with the heave flag. 500 LF at 125 LF/day, two headings: wd 4;
  //   open 5; calendar 5 × 7/5 = 7; 7 × 24 = 168 h a pump, 2 pumps 336 h; fuel 336 × 0.65 = 218.4 gal; bags 2 × ⌈7/3⌉ = 6.
  {
    id: "dw-sump-heave", kind: "dw",
    site: { kind: "trench", bottomDepthFt: 14, waterDepthFt: 2, soil: { uscs: "CH" }, bottomWidthFt: 3 },
    run: { lf: 500, lfPerDay: 125, pumpGph: 0.65, headings: 2 },
    expect: {
      m: { method: "sump", rule: 2, heightFt: 12, flags: ["Bottom heave check: water 12.0 ft above the bottom"] },
      q: { kind: "sump", workDays: 4, openDays: 5, calendarDays: 7, pumps: 2, pumpHoursEach: 168, pumpHours: 336, fuelGal: 218.4, filterBags: 6 },
    },
  },
  // dw-wp-single: SDR 35 8 in, bottom 12, water 5, SP (typed k 2 × 10⁻³), 30 in wide; 600 LF at 150 LF/day. H 7.0;
  //   drawdown 12 + 2 = 14; lift 14 ≤ 15, k ≥ 10⁻³ → rule 5, spacing 5 ft (10⁻³ ≤ k < 10⁻²), single row (W 2.5 ≤ 6, H 7
  //   ≤ 10); wd 600/150 = 4; system 4 + 2 + 1 = 7; calendar 7 × 7/5 = 9.8; header min(600, 150 × (2 + 1 + 1)) = 600;
  //   points (⌈600/5⌉ + 1) × 1 = 121, on rent (⌈600/5⌉ + 1) = 121; length first ≥ 14 + 5 = 19 → 21 ft; pumps ⌈600/500⌉
  //   = 2 + 1 standby; hours 9.8 × 24 = 235.2 a pump, × 2 = 470.4; fuel 470.4 × 1.7 = 799.68 gal (once wired × $5.468 =
  //   $4,372.65). The reason is the spec's own example (§3.2).
  {
    id: "dw-wp-single", kind: "dw", site: SP_SINGLE, run: SP_RUN,
    expect: {
      m: { method: "wellpoint", rule: 5, heightFt: 7, drawdownDepthFt: 14, liftFt: 14, spacingFt: 5, rows: 1, built: true, reason: "Wellpoints, single row: sand (k 2 × 10⁻³ cm/s), lift 14.0 ft ≤ 15" },
      q: { kind: "wellpoint", workDays: 4, systemWorkDays: 7, calendarDays: 9.8, headerLf: 600, pointsInstalled: 121, pointsOnRent: 121, pointLengthFt: 21, runningPumps: 2, standbyPumps: 1, pumpHoursEach: 235.2, pumpHours: 470.4, fuelGal: 799.68 },
    },
  },
  // dw-wp-single-labour: the same run's labour and parts. Jetting 121/60 = 2.02 crew-days; removal 121/120 = 1.01; watch
  //   (attendant) 9.8 × 24 − 7 × 8 = 179.2 h; piezometers ⌈600/200⌉ + 1 = 4; hose 300 × 2 = 600 ft = 12 lengths; bags 2 ×
  //   ⌈9.8/3⌉ = 8; swing joints 121; CGP report 0.25 × 9.8 = 2.45 h; mob 3 towed + ⌈600/1,000⌉ = 1 flatbed; SP not fine:
  //   no settling tank; no contamination: no permit line.
  {
    id: "dw-wp-single-labour", kind: "dw", site: SP_SINGLE, run: SP_RUN,
    expect: {
      q: { jettingCrewDays: 121 / 60, removalCrewDays: 121 / 120, watch: "attendant", watchHours: 179.2, piezometers: 4, dischargeFt: 600, hoseLengths: 12, filterBags: 8, swingJoints: 121, cgpReportHours: 2.45, towedLoads: 3, flatbedLoads: 1, fracTanks: 0, fracTankDays: 0, permit: "none" },
      prices: { "wp-watch": "At the project's wage", "wp-fuel": "At the project's diesel", "wp-mob-pumps": "The library's pickup-towed haul once wired" },
    },
  },
  // dw-wp-patrols: the same with the "Patrols" setting: 9.8 calendar days × 2 visits × 1.0 h = 19.6 h.
  { id: "dw-wp-patrols", kind: "dw", site: SP_SINGLE, run: { ...SP_RUN, watch: "patrols" }, expect: { q: { watch: "patrols", watchHours: 19.6 } } },
  // dw-wp-single-pumps: the 3 pumps (2 running + 1 standby) for 9.8 calendar days, every one "Quote needed". Once quoted
  //   (A-later, a 7-day calendar): ⌈9.8/7⌉ × $1,112 = $2,224 a pump (1 week + 3 days 2,252; one 4-week 3,253), $6,672 for 3.
  {
    id: "dw-wp-single-pumps", kind: "dw", site: SP_SINGLE, run: SP_RUN,
    expect: { q: { runningPumps: 2, standbyPumps: 1, calendarDays: 9.8 }, prices: { "wp-pump": "Quote needed", "wp-pump-standby": "Quote needed", "wp-points": "Quote needed", "wp-header": "Quote needed", "wp-hose": "Quote needed" }, days: { "wp-pump": 9.8, "wp-pump-standby": 9.8 } },
  },
  // dw-wp-double: as dw-wp-single but 7 ft wide and H 12 (water at the ground): double row (W > 6, H > 10). Header 600 ×
  //   2 = 1,200; points 121 × 2 = 242 (on rent 242); pumps ⌈1,200/500⌉ = 3 + 1; hours 9.8 × 24 × 3 = 705.6; fuel 705.6 ×
  //   1.7 = 1,199.52 gal; jetting 242/60 = 4.03 crew-days.
  {
    id: "dw-wp-double", kind: "dw", site: { ...SP_SINGLE, waterDepthFt: 0, bottomWidthFt: 7 }, run: SP_RUN,
    expect: {
      m: { method: "wellpoint", rule: 5, heightFt: 12, rows: 2, reason: "Wellpoints, double row: sand (k 2 × 10⁻³ cm/s), lift 14.0 ft ≤ 15" },
      q: { headerLf: 1200, pointsInstalled: 242, pointsOnRent: 242, runningPumps: 3, standbyPumps: 1, pumpHours: 705.6, fuelGal: 1199.52, jettingCrewDays: 242 / 60 },
    },
  },
  // dw-wp-bench: bottom 16, water 4, SP (k 10⁻² from the table), sloped walls. Drawdown 18; lift 18 > 15, sloped → rule 6;
  //   bench 18 − 15 + 1 = 4 ft; lift on the bench 14; length first ≥ 14 + 5 = 19 → 21 ft. H 12 > 10: double row. k 10⁻²
  //   → 8 ft spacing. On 600 LF at 150: points (⌈600/8⌉ + 1) × 2 = (75 + 1) × 2 = 152; header 600 × 2 = 1,200; pumps 3 + 1.
  {
    id: "dw-wp-bench", kind: "dw", site: { kind: "trench", bottomDepthFt: 16, waterDepthFt: 4, soil: { uscs: "SP" }, bottomWidthFt: 2.5, walls: "sloped" }, run: SP_RUN,
    expect: {
      m: { method: "wellpoint_bench", rule: 6, liftFt: 18, benchFt: 4, headerLiftFt: 14, spacingFt: 8, rows: 2, kCmS: 1e-2, built: true, reason: "Wellpoints on a 4.0 ft bench, double row: sand (k 10⁻² cm/s), lift 18.0 ft > 15, 14.0 ft from the bench" },
      q: { kind: "wellpoint", pointLengthFt: 21, pointsInstalled: 152, headerLf: 1200, runningPumps: 3, standbyPumps: 1 },
    },
  },
  // dw-vacuum-silt: bottom 10, water 4, ML (k 10⁻⁴ from the table: the silt band's lower edge), 300 LF at 100 LF/day.
  //   Lift 12 ≤ 15 → rule 3, vacuum wellpoints at 3 ft, single row (H 6). wd 3; system 6; calendar 8.4; header min(300,
  //   100 × 4) = 300; points ⌈300/3⌉ + 1 = 101; length first ≥ 12 + 5 = 17 → 18 ft; pumps ⌈300/500⌉ = 1 + 1; hours 8.4 ×
  //   24 = 201.6; fuel × 1.7 = 342.72 gal; ML is fine: 1 settling tank for 8.4 days; bags 1 × ⌈8.4/3⌉ = 3; piezometers
  //   ⌈300/200⌉ + 1 = 3; attendant 8.4 × 24 − 6 × 8 = 153.6 h.
  {
    id: "dw-vacuum-silt", kind: "dw", site: { kind: "trench", bottomDepthFt: 10, waterDepthFt: 4, soil: { uscs: "ML" }, bottomWidthFt: 2.5 }, run: { lf: 300, lfPerDay: 100, pumpGph: 1.7 },
    expect: {
      m: { method: "vacuum_wellpoint", rule: 3, spacingFt: 3, rows: 1, reason: "Vacuum wellpoints at 3 ft, single row: silt (k 10⁻⁴ cm/s), lift 12.0 ft ≤ 15" },
      q: { workDays: 3, systemWorkDays: 6, calendarDays: 8.4, headerLf: 300, pointsInstalled: 101, pointLengthFt: 18, runningPumps: 1, pumpHours: 201.6, fuelGal: 342.72, fracTanks: 1, fracTankDays: 8.4, filterBags: 3, piezometers: 3, watchHours: 153.6 },
    },
  },
  // dw-k-survey: no k typed, no USCS, the soil survey's ksat 10 µm/s × 10⁻⁴ = 10⁻³ cm/s (rule 5's edge, k ≥ 10⁻³):
  //   bottom 10, water 5, lift 12 → wellpoints at 5 ft.
  {
    id: "dw-k-survey", kind: "dw", site: { kind: "trench", bottomDepthFt: 10, waterDepthFt: 5, soil: { ksatUmS: 10 }, bottomWidthFt: 2.5 }, run: SP_RUN,
    expect: { m: { method: "wellpoint", rule: 5, kSource: "survey", kCmS: 1e-3, spacingFt: 5, reason: "Wellpoints, single row: sand (k 10⁻³ cm/s), lift 12.0 ft ≤ 15" } },
  },
  // dw-eductor: silt, deep, in a box: bottom 18, water 6, ML (typed k 2 × 10⁻⁴); lift 20 > 15 in the silt band → rule 4.
  {
    id: "dw-eductor", kind: "dw", site: { kind: "trench", bottomDepthFt: 18, waterDepthFt: 6, soil: { kCmS: 2e-4, uscs: "ML" }, walls: "box" }, run: SP_RUN,
    expect: { m: { method: "eductor", rule: 4, built: false, priceByHand: true, reason: "Eductors: silt (k 2 × 10⁻⁴ cm/s), lift 20.0 ft > 15. Outside the built methods: price by hand" }, q: { kind: "by_hand" } },
  },
  // dw-box-sand-deep: SP (10⁻²), bottom 16, water 4, a box: lift 18 > 15, not sloped → rule 7, eductors, by hand.
  {
    id: "dw-box-sand-deep", kind: "dw", site: { kind: "trench", bottomDepthFt: 16, waterDepthFt: 4, soil: { uscs: "SP" }, walls: "box" }, run: SP_RUN,
    expect: { m: { method: "eductor", rule: 7, priceByHand: true, reason: "Eductors: sand (k 10⁻² cm/s), lift 18.0 ft > 15, the trench in a box or vertical. Outside the built methods: price by hand" }, q: { kind: "by_hand" } },
  },
  // dw-deepwell-pond: pond 300 × 200 ft = 60,000 SF, bottom 20, water 6, SW (typed 10⁻²): H 14; 60,000 / 43,560 = 1.38 ac
  //   > 1 → rule 8 (read before 7's second stage). A-later's quantities (perimeter 1,000 ft, 20 wells at 32 ft + 2
  //   standby) are by hand tonight.
  {
    id: "dw-deepwell-pond", kind: "dw", site: { kind: "pond", bottomDepthFt: 20, waterDepthFt: 6, soil: { kCmS: 1e-2, uscs: "SW" }, areaSf: 60000 }, run: SP_RUN,
    expect: { m: { method: "deep_well", rule: 8, heightFt: 14, priceByHand: true, reason: "Deep wells round the perimeter: sand (k 10⁻² cm/s), water 14.0 ft above the bottom, 1.38 ac. Outside the built methods: price by hand" }, q: { kind: "by_hand" } },
  },
  // dw-pond-second-stage: a pond in SW (10⁻²), bottom 20, water 8 (H 12 ≤ 15), 20,000 SF (0.46 ac ≤ 1): not rule 8;
  //   lift 22 > 15 → rule 7, a second wellpoint stage, by hand.
  {
    id: "dw-pond-second-stage", kind: "dw", site: { kind: "pond", bottomDepthFt: 20, waterDepthFt: 8, soil: { kCmS: 1e-2, uscs: "SW" }, areaSf: 20000 }, run: SP_RUN,
    expect: { m: { method: "second_stage", rule: 7, priceByHand: true }, q: { kind: "by_hand" } },
  },
  // dw-no-water: no bore and no typed water: no method, said (spec §10 risk 2).
  { id: "dw-no-water", kind: "dw", site: { kind: "trench", bottomDepthFt: 10, waterDepthFt: null, soil: { uscs: "SP" } }, run: SP_RUN, expect: { m: { method: "no_data", rule: null, reason: "No water data: a bore or a typed design water is needed" }, q: { kind: "none" } } },
  // dw-no-production: the run has no LF a day: no system days, so no quantities, said.
  { id: "dw-no-production", kind: "dw", site: SP_SINGLE, run: { ...SP_RUN, lfPerDay: 0 }, expect: { q: { kind: "no_production", reason: "No production: the run's LF a day is needed for the system's days" } } },
  // dw-contamination: dw-wp-single on a site marked "suspected contamination": the discharge turns into a by-hand line.
  { id: "dw-contamination", kind: "dw", site: SP_SINGLE, run: { ...SP_RUN, suspectedContamination: true }, expect: { q: { permit: "by_hand", flags: ["Suspected contamination: the discharge is a permit or haul-off, priced by hand"] } } },

  // --- Rain (§5.a, §5.b) -------------------------------------------------------------------------------------------
  // rain-june-ew: IAH June, R 3.6 (≥ 0.50), 2.0 (≥ 1.00), 30 days. Dry 3.6 + 2.0 = 5.6; p 3.6/30 = 0.12; counted 5.6 ×
  //   0.88 = 4.928; (3.6 + 4.928) × 5/7 = 42.64/7 = 6.0914286 lost working days (6.571 without the overlap rule). The same
  //   through a window of June's 30 days. Plan B's eq-standby-owned uses this figure (checked below).
  { id: "rain-june-ew", kind: "rain-month", month: 6, work: "earthwork", expect: { lost: 42.64 / 7, dry: 5.6, p: 0.12, counted: 4.928 }, window: { start: "2026-06-01", days: 30, lost: 42.64 / 7 } },
  // rain-june-pipe: R × 5/7 = 3.6 × 5/7 = 2.5714 (the rain day only).
  { id: "rain-june-pipe", kind: "rain-month", month: 6, work: "pipe", expect: { lost: 3.6 * 5 / 7 } },
  // rain-june-flatwork: days ≥ 0.10 in × 5/7 = 6.6 × 5/7 = 4.7143.
  { id: "rain-june-flatwork", kind: "rain-month", month: 6, work: "flatwork", expect: { lost: 6.6 * 5 / 7 } },
  // rain-overlap: of June's 5.6 drying days, 5.6 × 0.12 = 0.672 fall on rain days and are not counted twice.
  { id: "rain-overlap", kind: "rain-month", month: 6, work: "earthwork", expect: { overlap: 0.672 } },
  // rain-q1: 2027-01-01 for 90 days (Jan 31 + Feb 28 + Mar 31). Jan (2.6 + 3.8 × (1 − 2.6/31)) × 5/7 = 4.3438; Feb (2.3 +
  //   3.1 × (1 − 2.3/28)) × 5/7 = 3.6753; Mar (2.1 + 3.3 × (1 − 2.1/31)) × 5/7 = 3.6975: 11.7165 earthwork (12.29 without
  //   the overlap rule); pipe (2.6 + 2.3 + 2.1) × 5/7 = 7.0 × 5/7 = 5.00.
  { id: "rain-q1", kind: "rain-window", start: "2027-01-01", days: 90, expect: { earthwork: ew(0) + ew(1) + ew(2), pipe: 5, months: 3 } },
  // rain-year: 2027-01-01 for 365 days: earthwork Σ the 12 months = 52.597 (55.50 without the overlap rule); pipe 31.1 ×
  //   5/7 = 22.214; flatwork 64.4 × 5/7 = 46.00.
  { id: "rain-year", kind: "rain-window", start: "2027-01-01", days: 365, expect: { earthwork: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].reduce((s, m) => s + ew(m), 0), pipe: 31.1 * 5 / 7, flatwork: 64.4 * 5 / 7, months: 12 } },
  // rain-window-prorata: 2026-06-16 for 30 days: June's last 15 of 30 and July's first 15 of 31. July (2.3 + 3.3 × (1 −
  //   2.3/31)) × 5/7 = 3.8251; 15/30 × 6.0914 + 15/31 × 3.8251 = 3.0457 + 1.8509 = 4.8966.
  { id: "rain-window-prorata", kind: "rain-window", start: "2026-06-16", days: 30, expect: { earthwork: (15 / 30) * ew(5) + (15 / 31) * ew(6), months: 2 } },
  // rain-leap-feb: 2028-02-01 for 29 days (a leap February): the whole month, 29/29 of Feb's 3.6753 (p on the normals' 28).
  { id: "rain-leap-feb", kind: "rain-window", start: "2028-02-01", days: 29, expect: { earthwork: ew(1), months: 1 } },
  // rain-no-normals: a station without twelve months: no lost days (the caller says "No climate normals ...", never 0).
  { id: "rain-no-normals", kind: "rain-window", start: "2027-01-01", days: 90, normals: [], expect: { earthwork: null } },
  // rain-sump-q1: rain sumps, 2027-01-01 for 90 days, 2 open headings: days ≥ 0.10 in 5.7 + 4.9 + 4.8 = 15.4; pump-days
  //   15.4 × 2 × 2 = 61.6; hours × 8 = 492.8; fuel × 0.65 = 320.32 gal (once wired × $3.578 = $1,146.10 gasoline).
  { id: "rain-sump-q1", kind: "rain-sump", start: "2027-01-01", days: 90, open: 2, gph: 0.65, expect: { rainDays: 15.4, pumpDays: 61.6, runHours: 492.8, fuelGal: 320.32, pumpsOnRent: 2, libraryKey: "PMP-TRASH-3" } },
  // rain-standby-ex20: a rented 20 t excavator ($1,040 / $2,927 / $7,950), 20 work days in June at 8 h: + June's 6.0914
  //   lost days = 26.0914 → 27 billed days (5-day basis): 4-week + 1 week + 2 days = 7,950 + 2,927 + 2,080 = $12,957
  //   (4-week + 2 weeks 13,804; two 4-weeks 15,900) against $7,950 dry: +$5,007. Without the overlap rule 6.5714 → 26.57,
  //   also 27 days: unchanged. Through the app's own solver (`periods.ts:solveRental`); the lost days are this module's.
  { id: "rain-standby-ex20", kind: "rain-rental", month: 6, workDays: 20, hours: 160, rates: [1040, 2927, 7950], expect: { wet: 12957, dry: 7950, extra: 5007, noOverlap: 12957 } },

  // --- The "as directed" pay item's badge (§4.5) -----------------------------------------------------------------------
  // pay-risk: our priced part $26.40/LF against the owner's $23.00 → 26.40 / 23.00 = 1.148 × > 1.0 → "At risk".
  { id: "pay-risk", kind: "pay", ours: 26.4, owner: 23, quoteNeeded: 0, expect: { ratio: 26.4 / 23, badge: "At risk" } },
  // pay-covered-edge: $18.40 against $23.00 = 0.80 × exactly, nothing unpriced → "Covered" (≤ 0.8).
  { id: "pay-covered-edge", kind: "pay", ours: 18.4, owner: 23, quoteNeeded: 0, expect: { ratio: 0.8, badge: "Covered" } },
  // pay-check-unpriced: $10.00 against $23.00 (0.43 ×) but 2 parts "Quote needed" → "Check".
  { id: "pay-check-unpriced", kind: "pay", ours: 10, owner: 23, quoteNeeded: 2, expect: { ratio: 10 / 23, badge: "Check" } },
  // pay-check-at-one: $23.00 against $23.00 = 1.0 ×, not above → "Check".
  { id: "pay-check-at-one", kind: "pay", ours: 23, owner: 23, quoteNeeded: 0, expect: { ratio: 1, badge: "Check" } },
];

export async function runWater(page) {
  return page.evaluate(
    async ([cases, iah]) => {
      const method = await import("/src/lib/takeoff/earthwork/water/method.ts");
      const qty = await import("/src/lib/takeoff/earthwork/water/quantities.ts");
      const rain = await import("/src/lib/takeoff/earthwork/water/rain.ts");
      const pay = await import("/src/lib/takeoff/earthwork/water/pay.ts");
      const periods = await import("/src/lib/estimate/equipment/periods.ts");
      return cases.map((c) => {
        if (c.kind === "dw") {
          const m = method.selectMethod(c.site);
          const q = qty.waterQuantities(m, c.run);
          const items = q.items ?? [];
          const { items: _drop, ...qOnly } = q;
          void _drop;
          return { m, q: qOnly, prices: Object.fromEntries(items.map((i) => [i.key, qty.priceText(i.price)])), days: Object.fromEntries(items.filter((i) => i.days !== undefined).map((i) => [i.key, i.days])) };
        }
        if (c.kind === "rain-month") {
          const n = iah[c.month - 1];
          const d = rain.NORMAL_MONTH_DAYS[c.month - 1];
          const dry = rain.dryingDays(n, d);
          const out = { lost: rain.lostDaysInMonth(n, d, c.work), ...dry };
          if (c.window) out.windowLost = rain.lostDaysInWindow(iah, c.work, rain.parseDay(c.window.start), c.window.days)?.lostDays ?? null;
          return out;
        }
        if (c.kind === "rain-window") {
          const normals = c.normals ?? iah;
          const at = (work) => rain.lostDaysInWindow(normals, work, rain.parseDay(c.start), c.days);
          const e = at("earthwork");
          return { earthwork: e?.lostDays ?? null, pipe: at("pipe")?.lostDays ?? null, flatwork: at("flatwork")?.lostDays ?? null, months: e?.months.length ?? 0 };
        }
        if (c.kind === "rain-sump") return rain.rainSumps(iah, rain.parseDay(c.start), c.days, c.open, c.gph);
        if (c.kind === "rain-rental") {
          const n = iah[c.month - 1];
          const d = rain.NORMAL_MONTH_DAYS[c.month - 1];
          const [day, week, fourWeek] = c.rates;
          const solve = (days) => periods.solveRental({ day, week, fourWeek }, days, c.hours)?.cost ?? null;
          const lost = rain.lostDaysInMonth(n, d, "earthwork");
          const wet = solve(c.workDays + lost);
          const dry = solve(c.workDays);
          return { wet, dry, extra: wet - dry, noOverlap: solve(c.workDays + (n.ge050 + n.ge050 + n.ge100) * 5 / 7) };
        }
        if (c.kind === "pay") return pay.payRisk(c.ours, c.owner, c.quoteNeeded);
        return { error: `unknown kind ${c.kind}` };
      });
    },
    [WATER_CASES, IAH],
  );
}

const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

function compare(id, got, want, wrong) {
  for (const [field, w] of Object.entries(want)) {
    const g = got?.[field];
    if (typeof w === "number") {
      if (typeof g !== "number" || !close(g, w)) wrong.push(`${id}.${field}: ${g}, expected ${w}`);
    } else if (w !== null && typeof w === "object" && !Array.isArray(w)) compare(`${id}.${field}`, g, w, wrong);
    else if (JSON.stringify(g ?? null) !== JSON.stringify(w)) wrong.push(`${id}.${field}: ${JSON.stringify(g)}, expected ${JSON.stringify(w)}`);
  }
}

export function checkWater(answers, wrong) {
  for (const [i, c] of WATER_CASES.entries()) {
    const got = answers[i];
    if (got?.error) {
      wrong.push(`${c.id}: ${got.error}`);
      continue;
    }
    compare(c.id, got, c.expect, wrong);
    if (c.window && !close(got.windowLost, c.window.lost)) wrong.push(`${c.id}: through the window ${got.windowLost}, expected ${c.window.lost}`);
  }
  // Plan B's owned standby (eq-standby-owned, D-1287) prices Plan A's June earthwork lost days: the two rows must agree.
  const june = answers[WATER_CASES.findIndex((c) => c.id === "rain-june-ew")]?.lost;
  const standby = EQUIPMENT_CASES.find((c) => c.id === "eq-standby-owned")?.lostDays;
  if (typeof june !== "number" || typeof standby !== "number" || !close(june, standby)) wrong.push(`rain-june-ew: ${june} lost days, eq-standby-owned uses ${standby}`);
}

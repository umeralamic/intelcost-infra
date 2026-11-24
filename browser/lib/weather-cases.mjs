// Plan A-lean AL1–AL3's rows of the shared table (D-1331, built in scratch under D-1315): lost working days by the
// founder's D-1316 Q9 rules (rain; snow on: earthwork a snow day and a clearing day, pipe and flatwork the snow day;
// frost never a lost day), an activity's window, rented machines billing the lost days ONCE per machine class for the
// project in calendar days at the cheapest day / 7-day week / 28-day 4-week (Q9 (c), (e)), an owned machine's standby,
// existing projects not repriced until Apply (Q9 (f)), and the "as directed" pay items after profit, before the bond
// (Q9 (a)). Each row worked by hand in its comment; numbers to 1e-9 relative or the cent, text exactly.
//
// Normals: NOAA NCEI 1991–2020 monthly, as the Access Data Service returned them on 2026-11-18 (seeded in migration
// d1331c8a4e57): IAH (USW00012960) and Carpenter 2 S, OH (USC00331288, nearest with snowfall and frost to ZIP 45614).
// Weekday share 5/7; the normals' February has 28 days.

import { bundleFor } from "./equipment-cases.mjs";
import { IAH } from "./water-cases.mjs";

const SNOW_IAH = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1];
const FROST_IAH = [4.1, 1.7, 0.7, 0, 0, 0, 0, 0, 0, 0, 0.7, 2.9];
/** IAH with its snowfall days zeroed: the rain rule alone (rain.ts's months, digit for digit). */
export const IAH_RAIN = IAH.map((m, i) => ({ ...m, snow1: 0, frost: FROST_IAH[i] }));
export const IAH_WX = IAH.map((m, i) => ({ ...m, snow1: SNOW_IAH[i], frost: FROST_IAH[i] }));
// Carpenter 2 S, OH: days ≥ 0.10 / 0.50 / 1.00 in, snowfall ≥ 1.0 in, minimum ≤ 32 °F.
const C = [
  [7.5, 2.5, 0.6, 2.8, 24.9], [6.6, 1.7, 0.5, 1.5, 23], [7.5, 2.6, 0.7, 1.3, 19.3], [7.9, 2.3, 0.9, 0.1, 8.1],
  [8.2, 2.9, 1.1, 0, 1.2], [7, 2.5, 1.1, 0, 0], [8.1, 2.9, 1.1, 0, 0], [6, 2.1, 1, 0, 0],
  [5.7, 2.3, 0.9, 0, 0.1], [5.5, 1.9, 1, 0, 7.9], [6.5, 2.1, 0.5, 0.4, 15.6], [5.6, 1.8, 0.3, 1.2, 23.5],
];
export const CARPENTER = C.map(([ge010, ge050, ge100, snow1, frost]) => ({ ge010, ge050, ge100, snow1, frost }));

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const WEEKDAYS = (365 * 5) / 7;
const ew = (m) => (IAH[m].ge050 + (IAH[m].ge050 + IAH[m].ge100) * (1 - IAH[m].ge050 / DAYS[m])) * 5 / 7;
const EW_YEAR = DAYS.reduce((t, _d, m) => t + ew(m), 0); // 52.5969…
const PIPE_YEAR = (IAH.reduce((t, m) => t + m.ge050, 0) * 5) / 7; // 22.2143
// The same with December's 0.1 snowfall day: December 31 × (1 − (1 − 2.6/31)(1 − 0.1/31)) in place of its 2.6.
const PIPE_YEAR_SNOW = ((IAH.reduce((t, m) => t + m.ge050, 0) - 2.6 + 31 * (1 - (1 - 2.6 / 31) * (1 - 0.1 / 31))) * 5) / 7;

/** A project's weather as the bundle carries it (`weather/service.py:state`): IAH's months, applied or not. */
const weatherOf = (applied, start = null) => ({
  point: { lat: 29.98, lon: -95.36, source: "zip" },
  station: { id: "USW00012960", name: "HOUSTON INTERCONT AP", state: "TX", miles: 4.3, override: false },
  auto_station_id: "USW00012960",
  months: IAH_WX.map((m, i) => ({ month: i + 1, prcp_in: null, ge010: m.ge010, ge050: m.ge050, ge100: m.ge100, snow_ge1: m.snow1, frost_le32: m.frost })),
  borrowed: { snow: null, frost: null },
  far: false,
  work_start: start,
  applied,
  note: null,
  flags: [],
  classes: { 12: "pipe", 1: "earthwork" },
});

export const WEATHER_CASES = [
  // --- The month's lost share (weather.ts) ----------------------------------------------------------------------------
  // wx-rain-equals-rain-ts: with no snowfall, every IAH month and rule equals rain.ts's §5.b figure (max |diff| 0).
  { id: "wx-rain-equals-rain-ts", kind: "wx-same", expect: { maxDiff: 0 } },
  // wx-june-ew-month: IAH June earthwork: (3.6 + 5.6 × 0.88) × 5/7 = 42.64/7 = 6.0914286 (no snow in June).
  { id: "wx-june-ew-month", kind: "wx-month", normals: "IAH_WX", month: 6, rule: "earthwork", expect: { lost: 42.64 / 7 } },
  // wx-snow-gallia-ew: Carpenter, January, earthwork. Rain (2.5 + 3.1 × (1 − 2.5/31)) / 31 = 0.172581; snow and its
  //   clearing day (2.8 + 2.8 × (1 − 2.8/31)) / 31 = 0.172487; 1 − 0.827419 × 0.827513 = 0.315300 → × 31 × 5/7 = 6.9817.
  //   The 24.9 frost days are no lost day (Q9 (b)).
  { id: "wx-snow-gallia-ew", kind: "wx-month", normals: "CARPENTER", month: 1, rule: "earthwork", expect: { lost: (1 - (1 - (2.5 + 3.1 * (1 - 2.5 / 31)) / 31) * (1 - (2.8 + 2.8 * (1 - 2.8 / 31)) / 31)) * 31 * 5 / 7 } },
  // wx-snow-gallia-pipe: January, pipe: rain 2.5/31, the snow day 2.8/31: 1 − (28.5/31)(28.2/31) = 0.163684 → 3.6244.
  { id: "wx-snow-gallia-pipe", kind: "wx-month", normals: "CARPENTER", month: 1, rule: "pipe", expect: { lost: (1 - (28.5 / 31) * (28.2 / 31)) * 31 * 5 / 7 } },
  // wx-snow-gallia-flat: January, flatwork: rain 7.5/31, the snow day 2.8/31: 1 − (23.5/31)(28.2/31) = 0.310405 → 6.8733.
  { id: "wx-snow-gallia-flat", kind: "wx-month", normals: "CARPENTER", month: 1, rule: "flatwork", expect: { lost: (1 - (23.5 / 31) * (28.2 / 31)) * 31 * 5 / 7 } },
  // wx-frost-days: Carpenter, January: 24.9 frost days × 5/7 = 17.7857 weekdays a cold-weather protection line would be
  //   priced on (ACI 306, proposed); never lost days.
  { id: "wx-frost-days", kind: "wx-frost", normals: "CARPENTER", month: 1, expect: { days: (24.9 * 5) / 7 } },

  // --- An activity's lost days ----------------------------------------------------------------------------------------
  // wx-year-ew: no start, the year's average (rain only): f = 52.5970 / 260.7143 = 0.201742; 20 work days stretch to
  //   20 ÷ (1 − f) = 25.0546: +5.0546.
  { id: "wx-year-ew", kind: "wx-activity", normals: "IAH_RAIN", rule: "earthwork", workDays: 20, start: null, expect: { lost: (20 * (EW_YEAR / WEEKDAYS)) / (1 - EW_YEAR / WEEKDAYS), basis: "year", share: EW_YEAR / WEEKDAYS } },
  // wx-year-pipe: f = 22.2143 / 260.7143 = 0.085205; 20 × f ÷ (1 − f) = 1.8628.
  { id: "wx-year-pipe", kind: "wx-activity", normals: "IAH_RAIN", rule: "pipe", workDays: 20, start: null, expect: { lost: (20 * (PIPE_YEAR / WEEKDAYS)) / (1 - PIPE_YEAR / WEEKDAYS), basis: "year" } },
  // wx-june-pipe-5: 5 work days from 2027-06-01, pipe: June loses 3.6/30 = 0.12 of its weekdays: L = 0.12 × (5 + L) →
  //   0.6/0.88 = 0.681818. "Weather: +0.7 lost days (June, HOUSTON INTERCONT AP normals)".
  { id: "wx-june-pipe-5", kind: "wx-activity", normals: "IAH_WX", rule: "pipe", workDays: 5, start: "2027-06-01", station: "HOUSTON INTERCONT AP", expect: { lost: 0.6 / 0.88, basis: "window", months: [6], note: "Weather: +0.7 lost days (June, HOUSTON INTERCONT AP normals)" } },
  // wx-june-ew-20: 20 earthwork days from 2027-06-01: June's 6.0914 in 30 days, the window (20 + L) × 7/5 into July
  //   (3.8251 in 31): L (1 − 1.4 × 3.8251/31) = 6.0914 − 2 × 3.8251/31 → 7.0652; "(Jun–Jul, …)".
  { id: "wx-june-ew-20", kind: "wx-activity", normals: "IAH_WX", rule: "earthwork", workDays: 20, start: "2027-06-01", station: "HOUSTON INTERCONT AP", expect: { lost: (ew(5) - (2 * ew(6)) / 31) / (1 - (1.4 * ew(6)) / 31), basis: "window", months: [6, 7], note: "Weather: +7.1 lost days (Jun–Jul, HOUSTON INTERCONT AP normals)" } },
  // wx-no-normals: a station without 12 months: no lost days (null), never a zero.
  { id: "wx-no-normals", kind: "wx-activity", normals: "NONE", rule: "pipe", workDays: 20, start: null, expect: { none: true } },

  // --- Rented machines bill the lost days: each machine's time on rent priced once (weatherExtension.ts; the founder's
  //     Q4, 2026-11-24): extension = cheapest mix(base + lost) − cheapest mix(base), on the machine's own basis or its
  //     fixed period. EX-CRAWL-20T $1,040 / $2,927 / $7,950, location 1.00, no waiver in the bundle.
  //     D-1336 (D-1335 Q1): the basis is now calendar days on rent (1 / 7 / 28: from the work start's weekday, Monday
  //     here with no start date, to the last work day and the days off after it), for the rental and the extension
  //     together. From a Monday the period covers are the work-day ones, so the values stand (each row names its days
  //     on rent) except wx-ext-fixed-day, where 5 work days by the day now pay the weekend after their Friday.
  // wx-ext-absorbed: 16 work days (22 days on rent, one 4-week $7,950) + 1.64 lost = 17.64 → 18 (24 days): still one
  //   4-week $7,950 → $0.
  { id: "wx-ext-absorbed", kind: "wx-ext", machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":16,"lost":1.64,"shares":[{"host":"a","k":1}]}], expect: { total: 0, a: null } },
  // wx-ext-cross: 20 work days (28 days on rent) + 2 = 22 (30 days): one 4-week + 2 days $10,030 (against 4-week + week
  //   $10,877) − $7,950 = $2,080.
  { id: "wx-ext-cross", kind: "wx-ext", machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":20,"lost":2,"shares":[{"host":"a","k":1}]}], expect: { total: 2080, a: 2080 } },
  // wx-ext-no-pool: line A 16 days (no lost days), line B 3 days + 2 lost: B's 3 days are a week already ($2,927 < 3 ×
  //   $1,040), 5 days still a week → B's extension $0; nothing pooled with A's 4-week (the per-class reading gave $1,040).
  { id: "wx-ext-no-pool", kind: "wx-ext", machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":16,"lost":0,"shares":[{"host":"a","k":1}]}, {"id":"b","classKey":"EX-CRAWL-20T","units":1,"baseDays":3,"lost":2,"shares":[{"host":"b","k":1}]}], expect: { total: 0, a: null, b: null } },
  // wx-ext-two-units: 2 machines, 20 + 2 each: 2 × $2,080 = $4,160, all on the line.
  { id: "wx-ext-two-units", kind: "wx-ext", machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":2,"baseDays":20,"lost":2,"shares":[{"host":"a","k":1}]}], expect: { total: 4160, a: 4160 } },
  // wx-ext-fixed-day: picked by the day, 3 + 2 (no week on a fixed day period): 3 days on rent $3,120; 5 work days from a
  //   Monday end on Friday and keep the weekend: 7 days $7,280 → $4,160 (D-1336; on the work-day basis 5 − 3 days $2,080).
  { id: "wx-ext-fixed-day", kind: "wx-ext", machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":3,"lost":2,"shares":[{"host":"a","k":1}],"fixed":"day"}], expect: { total: 4160, a: 4160 } },
  // wx-ext-site-share: a site spread's machine 20 + 2 → $2,080, to its lines 25 % / 75 %: $520 and $1,560.
  // wx-ext-typed-rates (Q4-R): the machine's own typed rates ($700 / $2,000 / $6,000), not the catalogue's: 20 + 2 = one
  //   4-week + 2 days $7,400 (4-week + week $8,000) − $6,000 = $1,400 (the catalogue would give $2,080).
  { id: "wx-ext-typed-rates", kind: "wx-ext", machines: [{ "id": "a", "classKey": "EX-CRAWL-20T", "units": 1, "baseDays": 20, "lost": 2, "rates": { "day": 700, "week": 2000, "fourWeek": 6000 }, "shares": [{ "host": "a", "k": 1 }] }], expect: { total: 1400, a: 1400 } },
  // wx-ext-frozen-rates (Q4-R): rates frozen at pick ($1,000 / $2,800 / $7,600, the library has moved since) and the
  //   machine's location factor 1.10: 20 + 2 → 2 days $2,000 × 1.10 = $2,200.
  { id: "wx-ext-frozen-rates", kind: "wx-ext", machines: [{ "id": "a", "classKey": "EX-CRAWL-20T", "units": 1, "baseDays": 20, "lost": 2, "rates": { "day": 1000, "week": 2800, "fourWeek": 7600 }, "location": 1.1, "shares": [{ "host": "a", "k": 1 }] }], expect: { total: 2200, a: 2200 } },
  { id: "wx-ext-site-share", kind: "wx-ext", machines: [{ "id": "site", "classKey": "EX-CRAWL-20T", "units": 1, "baseDays": 20, "lost": 2, "shares": [{ "host": "a", "k": 0.25 }, { "host": "b", "k": 0.75 }] }], expect: { total: 2080, a: 520, b: 1560 } },
  // wx-line-rental-unchanged: the line's own 20 t excavator rental (20 work days, 160 h) is today's with the weather
  //   applied: one 4-week $7,950; the machine reports its lost days (pipe rule, the year's average with December's 0.1
  //   snow day: 20 × f ÷ (1 − f) = 1.8688) for the project's extension. Activity 12 is a pipe crew.
  { id: "wx-line-rental-unchanged", kind: "wx-machine", mode: "rental", activity: 12, applied: true, workDays: 20, hours: 160, expect: { rent: 7950, lost: (20 * (PIPE_YEAR_SNOW / WEEKDAYS)) / (1 - PIPE_YEAR_SNOW / WEEKDAYS) } },
  // wx-not-applied: the same on an existing project not applied (Q9 (f)): no lost days, nothing extended.
  { id: "wx-not-applied", kind: "wx-machine", mode: "rental", activity: 12, applied: false, workDays: 20, hours: 160, expect: { rent: 7950, lost: null } },

  // --- AL3: the pay items in the bid (§4.5; Q9 (a)) --------------------------------------------------------------------
  // pay-as-directed: 2,000 LF × $23.00 = $46,000 as written. Direct $100,000, overhead 10 % (110,000), profit 10 %
  //   (121,000), the pay items after profit (167,000), bond 1 % on the whole: 167,000 / 0.99 − 167,000 = $1,686.87 →
  //   $168,686.87.
  { id: "pay-as-directed", kind: "pay-bid", totals: { directCost: 100000, materialCost: 0, payItems: 2000 * 23 }, rates: { taxPct: 0, overheadPct: 10, profitPct: 10, bondPct: 1, extra: [] }, expect: { pay: 46000, bond: 1686.87, total: 168686.87, keys: ["direct", "tax", "overhead", "profit", "pay_items", "bond"] } },
  // pay-none: no pay items: the bid's lines exactly as before (no "pay_items" line): 121,000 / 0.99 = $122,222.22.
  // --- The check fixes (D-1331 M1, M2, M5) ----------------------------------------------------------------------------
  // pay-check-materials-only (M1): the smoke's two trench lines, 50 LF, $23.77/LF of stone and geotextile, no pumping
  //   and no hand price, against 200 LF × $45: 23.77 / 45 = 0.528 ≤ 0.8 but 2 lines carry no pumping → "Check", never
  //   "Covered", and the text names them.
  { id: "pay-check-materials-only", kind: "pay-check", unit: "LF", qty: 200, price: 45, lines: [{ lf: 13.72, cost: 326.12, variant: "trench", hand: false, comps: [], evals: [] }, { lf: 36.28, cost: 862.38, variant: "trench", hand: false, comps: [], evals: [] }], expect: { badge: "Check", ratio: 0.528222, has: "2 lines have no pumping priced (stone and geotextile only)" } },
  // pay-check-pumping (M1): the same 50 LF, one sump line with its pump and crew priced and one hand-priced line: both
  //   priced → 0.528 ≤ 0.8 → "Covered".
  { id: "pay-check-pumping", kind: "pay-check", unit: "LF", qty: 200, price: 45, lines: [{ lf: 13.72, cost: 326.12, variant: "trench:sump", hand: false, comps: ["pump", "crew"], evals: [{ total: 180 }, { total: 120 }] }, { lf: 36.28, cost: 862.38, variant: "trench", hand: true, comps: [], evals: [] }], expect: { badge: "Covered", ratio: 0.528222, hasNot: "no pumping" } },
  // pay-check-wellpoint (M1): a wellpoint line with no hand price is "Quote needed" → "Check".
  { id: "pay-check-wellpoint", kind: "pay-check", unit: "L.F.", qty: 200, price: 45, lines: [{ lf: 50, cost: 1188.5, variant: "trench:wellpoint", hand: false, comps: [], evals: [] }], expect: { badge: "Check", has: "1 line has wellpoints, Quote needed" } },
  // pay-check-unit-day (M2): a pay item per DAY: no ratio across units, compared by hand.
  { id: "pay-check-unit-day", kind: "pay-check", unit: "DAY", qty: 30, price: 450, lines: [{ lf: 50, cost: 1188.5, variant: "trench:sump", hand: false, comps: ["pump", "crew"], evals: [{ total: 700 }, { total: 488.5 }] }], expect: { badge: "Check", ratio: null, text: "Check: unit DAY, compare by hand" } },
  // pay-check-unit-ft (M2): "FT" reads as linear feet.
  { id: "pay-check-unit-ft", kind: "pay-check", unit: "FT", qty: 200, price: 45, lines: [{ lf: 50, cost: 1188.5, variant: "trench:sump", hand: false, comps: ["pump", "crew"], evals: [{ total: 700 }, { total: 488.5 }] }], expect: { badge: "Covered", ratio: 0.528222 } },
  // --- D-1337 (D-1335 Q6): pumping priced means the PUMP priced, never the crew alone --------------------------------
  // Each line runs through `pumpingOf` with the line's components (Calculate's pump and crew by their real auto keys,
  //   `lib/estimate/dewatering.ts`) and their evaluations, as EstimatingView feeds it. One 50 LF sump line, $1,188.50
  //   ($23.77/LF) against 200 LF × $45: 0.528 ≤ 0.8.
  // pay-check-crew-only-pump-error: the crew priced ($488.50), the pump errors ("Missing price", a last good $700 kept as
  //   a lump): no error is part of priced, so the pump is not → "Check", never "Covered", and the text says why.
  { id: "pay-check-crew-only-pump-error", kind: "pay-check", unit: "LF", qty: 200, price: 45, lines: [{ lf: 50, cost: 1188.5, variant: "trench:sump", hand: false, comps: ["pump", "crew"], evals: [{ total: 700, error: "Missing price" }, { total: 488.5 }] }], expect: { badge: "Check", ratio: 0.528222, has: "pump not priced on 1 line (Missing price), crew only" } },
  // pay-check-pump-zero: the pump at $0 with no error is not priced either ("$0" said); the crew errors too, so no "crew only".
  { id: "pay-check-pump-zero", kind: "pay-check", unit: "LF", qty: 200, price: 45, lines: [{ lf: 50, cost: 1188.5, variant: "trench:sump", hand: false, comps: ["pump", "crew"], evals: [{ total: 0 }, { total: 0, error: "Missing data: wage" }] }], expect: { badge: "Check", has: "pump not priced on 1 line ($0)", hasNot: "crew only" } },
  // pay-check-pump-priced: the pump priced ($700), the crew erroring: the pump is the pumping → "Covered".
  { id: "pay-check-pump-priced", kind: "pay-check", unit: "LF", qty: 200, price: 45, lines: [{ lf: 50, cost: 1188.5, variant: "trench:sump", hand: false, comps: ["pump", "crew"], evals: [{ total: 700 }, { total: 0, error: "Missing data: wage" }] }], expect: { badge: "Covered", ratio: 0.528222, hasNot: "pump" } },
  // pay-check-hand-priced: the pump erroring and the crew priced, but a person priced the line (`hand`) → "Covered".
  { id: "pay-check-hand-priced", kind: "pay-check", unit: "LF", qty: 200, price: 45, lines: [{ lf: 50, cost: 1188.5, variant: "trench:sump", hand: true, comps: ["pump", "crew"], evals: [{ total: 700, error: "Missing price" }, { total: 488.5 }] }], expect: { badge: "Covered", ratio: 0.528222, hasNot: "pump" } },
  // pay-check-no-pump-crew-only: the pump removed from the line, the crew priced → "Check", "no pump (crew only)".
  { id: "pay-check-no-pump-crew-only", kind: "pay-check", unit: "LF", qty: 200, price: 45, lines: [{ lf: 50, cost: 1188.5, variant: "trench:sump", hand: false, comps: ["crew"], evals: [{ total: 488.5 }] }], expect: { badge: "Check", has: "1 line has no pump (crew only)" } },
  // pay-check-wellpoint-crew: a wellpoint line with a priced crew and no hand price stays "Quote needed" → "Check".
  { id: "pay-check-wellpoint-crew", kind: "pay-check", unit: "LF", qty: 200, price: 45, lines: [{ lf: 50, cost: 1188.5, variant: "trench:wellpoint", hand: false, comps: ["crew"], evals: [{ total: 488.5 }] }], expect: { badge: "Check", has: "1 line has wellpoints, Quote needed" } },
  // wx-changed (M5): an applied project's station changed under it: Needs attention names it first.
  { id: "wx-changed", kind: "wx-attention", weather: { changed: "Weather station changed: HOUSTON HTS → HOUSTON INTERCONT AP; weather days repriced", applied: true, months: [1], work_start: "2027-06-01", flags: [], far: false, station: { name: "HOUSTON INTERCONT AP", miles: 17.3 }, point: { lat: 1, lon: 1 } }, expect: { lines: ["Weather station changed: HOUSTON HTS → HOUSTON INTERCONT AP; weather days repriced"] } },
  { id: "pay-none", kind: "pay-bid", totals: { directCost: 100000, materialCost: 0 }, rates: { taxPct: 0, overheadPct: 10, profitPct: 10, bondPct: 1, extra: [] }, expect: { pay: 0, bond: 1222.22, total: 122222.22, keys: ["direct", "tax", "overhead", "profit", "bond"] } },
];

export async function runWeather(page, eqlib) {
  return page.evaluate(
    async ([cases, normals, eqlib, bundleSrc, weatherOn, weatherOff]) => {
      const wx = await import("/src/lib/takeoff/earthwork/water/weather.ts");
      const rain = await import("/src/lib/takeoff/earthwork/water/rain.ts");
      const resolve = await import("/src/lib/estimate/equipment/resolve.ts");
      const cost = await import("/src/lib/estimate/equipment/cost.ts");
      const ext = await import("/src/lib/estimate/equipment/weatherExtension.ts");
      const bid = await import("/src/lib/estimate/bidSummary.ts");
      const pay = await import("/src/lib/takeoff/earthwork/water/pay.ts");
      const dewater = await import("/src/lib/estimate/dewatering.ts");
      const wxApi = await import("/src/features/equipment-library/weatherApi.ts");
      const bundleFor = new Function(`return ${bundleSrc}`)();
      const of = (k) => normals[k] ?? [];
      return cases.map((c) => {
        if (c.kind === "wx-same") {
          let maxDiff = 0;
          for (const rule of ["earthwork", "pipe", "flatwork"])
            for (let i = 0; i < 12; i++) maxDiff = Math.max(maxDiff, Math.abs(wx.lostInMonth(normals.IAH_RAIN[i], rain.NORMAL_MONTH_DAYS[i], rule) - rain.lostDaysInMonth(normals.IAH_RAIN[i], rain.NORMAL_MONTH_DAYS[i], rule)));
          return { maxDiff: maxDiff < 1e-12 ? 0 : maxDiff };
        }
        if (c.kind === "wx-month") return { lost: wx.lostInMonth(of(c.normals)[c.month - 1], rain.NORMAL_MONTH_DAYS[c.month - 1], c.rule) };
        if (c.kind === "wx-frost") return { days: wx.frostDays(of(c.normals)[c.month - 1]) };
        if (c.kind === "wx-activity") {
          const a = wx.activityLostDays(of(c.normals), c.rule, c.workDays, c.start ? rain.parseDay(c.start) : null);
          if (!a) return { none: true };
          return { ...a, ...(c.station ? { note: wx.weatherNote(a, c.station) } : {}) };
        }
        if (c.kind === "wx-ext") {
          const lib = resolve.library(bundleFor(eqlib, {}));
          const e = ext.weatherExtension(lib, c.machines);
          return { total: e.total, a: e.allocByHost.get("a") ?? null, b: e.allocByHost.get("b") ?? null };
        }
        if (c.kind === "wx-machine") {
          const lib = resolve.library({ ...bundleFor(eqlib, {}), weather: c.applied ? weatherOn : weatherOff });
          const m = cost.machineCost(lib, { classKey: "EX-CRAWL-20T", mode: c.mode, period: "auto", hours: c.hours, workDays: c.workDays, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false, weatherActivityId: c.activity });
          return { rent: m.rental?.cost ?? null, lost: m.weather?.lost ?? null };
        }
        if (c.kind === "pay-check") {
          // D-1337: each line's pumping read from its components and their evaluations, as EstimatingView does.
          const keys = { pump: dewater.SUMP_PUMP_KEY, crew: dewater.SUMP_CREW_KEY };
          const states = c.lines.map(({ comps, evals, ...l }) => ({ ...l, ...pay.pumpingOf(comps.map((k) => ({ auto_key: keys[k] })), evals, keys) }));
          const r = pay.payCheck({ unit: c.unit, owner_quantity: c.qty, owner_unit_price: c.price }, pay.ourDewatering(states));
          return { badge: r.badge, ratio: r.ratio == null ? null : Math.round(r.ratio * 1e6) / 1e6, text: r.text, has: c.expect.has && r.text.includes(c.expect.has) ? c.expect.has : r.text, hasNot: c.expect.hasNot && !r.text.includes(c.expect.hasNot) ? c.expect.hasNot : r.text };
        }
        if (c.kind === "wx-attention") return { lines: wxApi.weatherAttention(c.weather) };
        if (c.kind === "pay-bid") {
          const s = bid.computeBid(c.totals, c.rates);
          const amount = (k) => s.lines.find((l) => l.key === k)?.amount ?? 0;
          return { pay: amount("pay_items"), bond: amount("bond"), total: s.total, keys: s.lines.map((l) => l.key) };
        }
        return { error: `unknown kind ${c.kind}` };
      });
    },
    [WEATHER_CASES, { IAH_RAIN, IAH_WX, CARPENTER, NONE: [] }, eqlib, bundleFor.toString(), weatherOf(true), weatherOf(false)],
  );
}

const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const cents = (x) => Math.round(x * 100 + 1e-7 * Math.sign(x));

export function checkWeather(answers, wrong) {
  for (const [i, c] of WEATHER_CASES.entries()) {
    const got = answers[i];
    if (got?.error) {
      wrong.push(`${c.id}: ${got.error}`);
      continue;
    }
    for (const [field, want] of Object.entries(c.expect)) {
      const g = got?.[field];
      if (typeof want === "number") {
        const ok = typeof g === "number" && (c.kind === "wx-ext" || c.kind === "wx-machine" || c.kind === "pay-bid" ? (field === "lost" ? close(g, want) : cents(g) === cents(want)) : close(g, want));
        if (!ok) wrong.push(`${c.id}.${field}: ${g}, expected ${want}`);
      } else if (JSON.stringify(g ?? null) !== JSON.stringify(want)) wrong.push(`${c.id}.${field}: ${JSON.stringify(g)}, expected ${JSON.stringify(want)}`);
    }
  }
}

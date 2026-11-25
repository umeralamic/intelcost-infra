// Plan A-lean AL1–AL3's rows of the shared table (D-1331, built in scratch under D-1315): lost working days by the
// founder's D-1316 Q9 rules (rain; snow on: earthwork a snow day and a clearing day, pipe and flatwork the snow day;
// frost never a lost day), an activity's window, rented machines billing the lost days ONCE per machine class for the
// project in calendar days at the cheapest day / 7-day week / 28-day 4-week (Q9 (c), (e)), an owned machine's standby,
// existing projects not repriced until Apply (Q9 (f)), and the "as directed" pay items after profit, before the bond
// (Q9 (a)). Each row worked by hand in its comment; numbers to 1e-9 relative or the cent, text exactly.
//
// Normals: NOAA NCEI 1991–2020 monthly, as the Access Data Service returned them on 2026-11-18 (seeded in migration
// d1331c8a4e57): IAH (USW00012960) and Carpenter 2 S, OH (USC00331288, nearest with snowfall and frost to ZIP 45614).
// Weekday share 5/7 (D-1346: N/7 on a project week of N days, the rows marked -6day / -7day); the normals' February has
// 28 days.

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
// D-1347: Carpenter 2 S's days with a maximum ≤ 32 °F (MLY-TMAX-AVGNDS-LSTH032, the Access Data Service, 2026-11-25; seeded
// in migration d1347a5c9e21).
const ICEMAX_CARPENTER = [9.5, 5.2, 1.5, 0.1, 0, 0, 0, 0, 0, 0, 0.3, 6.2];
export const CARPENTER_T = CARPENTER.map((m, i) => ({ ...m, icemax: ICEMAX_CARPENTER[i] }));
// D-1347: a cold wet month made up to show the no-double-count rule: 31 days, 10 days ≥ 0.50 in, 5 ≥ 1.00 in, 10 snow
// days, 20 days that stay at or below 32 °F. Their parts alone sum past the month (1.83 of it).
const HARSH = [{ ge010: 14, ge050: 10, ge100: 5, snow1: 10, frost: 28, icemax: 20 }];
// D-1347: the Galveston District's Addicks and Barker table (W912HY20B0004, 7-day week = calendar days), D-1341.
const USACE_HOU = [11, 8, 6, 6, 7, 9, 7, 10, 13, 10, 9, 10];

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const WEEKDAYS = (365 * 5) / 7;
const ew = (m) => (IAH[m].ge050 + (IAH[m].ge050 + IAH[m].ge100) * (1 - IAH[m].ge050 / DAYS[m])) * 5 / 7;
const EW_YEAR = DAYS.reduce((t, _d, m) => t + ew(m), 0); // 52.5969…
const PIPE_YEAR = (IAH.reduce((t, m) => t + m.ge050, 0) * 5) / 7; // 22.2143
// The same with December's 0.1 snowfall day: December 31 × (1 − (1 − 2.6/31)(1 − 0.1/31)) in place of its 2.6.
const PIPE_YEAR_SNOW = ((IAH.reduce((t, m) => t + m.ge050, 0) - 2.6 + 31 * (1 - (1 - 2.6 / 31) * (1 - 0.1 / 31))) * 5) / 7;
// D-1347: earthwork on clay, a month's rain share: (R + (R + 2 × D100)(1 − R/days)) ÷ days, IAH's months.
const ewClay = (m) => (IAH[m].ge050 + (IAH[m].ge050 + 2 * IAH[m].ge100) * (1 - IAH[m].ge050 / DAYS[m])) / DAYS[m];
const EW_CLAY_YEAR = DAYS.reduce((t, d, m) => t + ewClay(m) * d * 5 / 7, 0);
// The same with December's 0.1 snowfall day and its clearing day: (0.1 + 0.1 × (1 − 0.1/31)) ÷ 31, independent of the rain.
const EW_CLAY_YEAR_SNOW = EW_CLAY_YEAR - ewClay(11) * 31 * 5 / 7 + (1 - (1 - ewClay(11)) * (1 - (0.1 + 0.1 * (1 - 0.1 / 31)) / 31)) * 31 * 5 / 7;
// D-1347: the contract table's year: f = 106 / 365 for every rule (USACE days × 5/7 over the year's days × 5/7).
const USACE_F = 106 / 365;

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
  //     here with no start date, to the END of the last work day, D-1344: the days off between work days count, those
  //     after the last do not), for the rental and the extension together. From a Monday the period covers are the
  //     work-day ones (5k + r work days are 7k + r days), so the values stand (each row names its days on rent).
  // wx-ext-absorbed: 16 work days (22 days on rent, one 4-week $7,950) + 1.64 lost = 17.64 → 18 (24 days): still one
  //   4-week $7,950 → $0.
  { id: "wx-ext-absorbed", kind: "wx-ext", machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":16,"lost":1.64,"shares":[{"host":"a","k":1}]}], expect: { total: 0, a: null } },
  // wx-ext-cross: 20 work days (26 days on rent) + 2 = 22 (30 days): one 4-week + 2 days $10,030 (against 4-week + week
  //   $10,877) − $7,950 = $2,080.
  { id: "wx-ext-cross", kind: "wx-ext", machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":20,"lost":2,"shares":[{"host":"a","k":1}]}], expect: { total: 2080, a: 2080 } },
  // wx-ext-no-pool: line A 16 days (no lost days), line B 3 days + 2 lost: B's 3 days are a week already ($2,927 < 3 ×
  //   $1,040), 5 days still a week → B's extension $0; nothing pooled with A's 4-week (the per-class reading gave $1,040).
  { id: "wx-ext-no-pool", kind: "wx-ext", machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":16,"lost":0,"shares":[{"host":"a","k":1}]}, {"id":"b","classKey":"EX-CRAWL-20T","units":1,"baseDays":3,"lost":2,"shares":[{"host":"b","k":1}]}], expect: { total: 0, a: null, b: null } },
  // wx-ext-two-units: 2 machines, 20 + 2 each: 2 × $2,080 = $4,160, all on the line.
  { id: "wx-ext-two-units", kind: "wx-ext", machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":2,"baseDays":20,"lost":2,"shares":[{"host":"a","k":1}]}], expect: { total: 4160, a: 4160 } },
  // wx-ext-fixed-day: picked by the day, 3 + 2 (no week on a fixed day period), from a Monday (no start date): Mon–Wed,
  //   3 days on rent $3,120; 5 work days Mon–Fri, off rent at the end of the Friday: 5 days $5,200 → $2,080 (D-1344, the
  //   pre-D-1336 value; D-1336 kept the weekend after the Friday: 7 days, $4,160). The span crosses no weekend.
  { id: "wx-ext-fixed-day", kind: "wx-ext", machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":3,"lost":2,"shares":[{"host":"a","k":1}],"fixed":"day"}], expect: { total: 2080, a: 2080 } },
  // wx-ext-fixed-day-friday: the same by-the-day pick from a Friday (work starts 2027-01-08), 1 + 2: base Fri, 1 day
  //   $1,040; base + lost 3 work days Fri, Mon, Tue: Fri → Tue with the weekend BETWEEN on rent, 5 days $5,200 → $4,160.
  { id: "wx-ext-fixed-day-friday", kind: "wx-ext", start: "2027-01-08", machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":1,"lost":2,"shares":[{"host":"a","k":1}],"fixed":"day"}], expect: { total: 4160, a: 4160 } },
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
  // --- D-1346 (the founder's D-1342 Q4): the project's own work week (the current rate set's days a week, 5 with none;
  //     the bundle's weather `work_days_per_week`). A week of N days works the first N weekdays from Monday. Rates
  //     EX-CRAWL-20T $1,040 / $2,927 / $7,950; overtime per billed period (8 / 40 / 160 h) at the cover's cost ÷ allowance.
  // wk-solve-default-5: no week given prices as before: 7 work days from a Monday (no start) to the next Tuesday, 9 days
  //   on rent, week + 2 days $5,007, 56 h against 56 h (eq-solve-7-days-weekend's figures).
  { id: "wk-solve-default-5", kind: "wk-solve", rates: [1040, 2927, 7950], days: 7, hours: 56, expect: { cost: 5007, billedDays: 9, workWeek: 5, startAssumed: true, label: "1 week + 2 days" } },
  // wk-solve-6day-7: 6-day week, 7 work days from a Monday (no start): Mon–Sat (6), the Sunday between, Mon (7th): 8
  //   calendar days on rent. Week + 1 day $3,967 (2 weeks $5,854; 8 days $8,320; 4-week $7,950); 56 h against 40 + 8 = 48 h:
  //   8 h overtime × 3,967 ÷ 48 = $661.17 → $4,628.17.
  { id: "wk-solve-6day-7", kind: "wk-solve", rates: [1040, 2927, 7950], days: 7, hours: 56, week: 6, expect: { cost: 3967 + (8 * 3967) / 48, periodCost: 3967, billedDays: 8, allowanceHours: 48, overtimeHours: 8, workWeek: 6, startAssumed: true, label: "1 week + 1 day" } },
  // wk-solve-7day-7: 7-day week, 7 work days = 7 days on rent: one week $2,927; 56 h against 40 h: 16 h × 2,927 ÷ 40 =
  //   $1,170.80 → $4,097.80.
  { id: "wk-solve-7day-7", kind: "wk-solve", rates: [1040, 2927, 7950], days: 7, hours: 56, week: 7, expect: { cost: 4097.8, periodCost: 2927, billedDays: 7, allowanceHours: 40, overtimeHours: 16, overtimeCost: 1170.8, workWeek: 7, label: "1 week" } },
  // wk-solve-6day-sunday: 6-day week, work starts Sunday 2027-01-10 (a non-work day): picked up Monday Jan 11; 6 work days
  //   Mon–Sat Jan 16: 6 days on rent: one week $2,927 (6 × $1,040 = $6,240); 48 h against 40 h: 8 h × 2,927 ÷ 40 = $585.40
  //   → $3,512.40.
  { id: "wk-solve-6day-sunday", kind: "wk-solve", rates: [1040, 2927, 7950], days: 6, hours: 48, week: 6, start: "2027-01-10", expect: { cost: 3512.4, periodCost: 2927, billedDays: 6, allowanceHours: 40, overtimeHours: 8, startAssumed: false, label: "1 week" } },
  // wk-solve-5day-sunday: the same Sunday start on a 5-day week: Mon Jan 11 – Fri 15 and Mon 18, the weekend between:
  //   8 days on rent: week + 1 day $3,967; 48 h against 48 h: no overtime.
  { id: "wk-solve-5day-sunday", kind: "wk-solve", rates: [1040, 2927, 7950], days: 6, hours: 48, week: 5, start: "2027-01-10", expect: { cost: 3967, billedDays: 8, allowanceHours: 48, overtimeHours: 0, label: "1 week + 1 day" } },
  // wk-solve-6day-saturday: 6-day week, work starts Saturday 2027-01-09, a work day: picked up the Saturday; 2 work days
  //   Sat, (Sun between), Mon: 3 days on rent: one week $2,927 (3 × $1,040 = $3,120); 16 h against 40 h.
  { id: "wk-solve-6day-saturday", kind: "wk-solve", rates: [1040, 2927, 7950], days: 2, hours: 16, week: 6, start: "2027-01-09", expect: { cost: 2927, billedDays: 3, overtimeHours: 0, label: "1 week" } },
  // wk-solve-6day-20: 6-day week, 20 work days from a Monday: 3 weeks Mon–Sat (18, through day 20), Sun, Mon, Tue: 23
  //   days on rent (26 on a 5-day week): one 4-week $7,950 (3 weeks + 2 days $10,861); 160 h against 160 h.
  { id: "wk-solve-6day-20", kind: "wk-solve", rates: [1040, 2927, 7950], days: 20, hours: 160, week: 6, expect: { cost: 7950, billedDays: 23, allowanceHours: 160, overtimeHours: 0, label: "one 4-week" } },
  // wx-june-ew-month-6day / -7day: IAH June earthwork, the month's lost share × 30 days × N/7: 42.64/7 × 6/5 = 7.3097 on a
  //   6-day week; 42.64/5 = 8.528 on a 7-day week (5/7: 6.0914, wx-june-ew-month).
  { id: "wx-june-ew-month-6day", kind: "wx-month", normals: "IAH_WX", month: 6, rule: "earthwork", week: 6, expect: { lost: (42.64 * 6) / 35 } },
  { id: "wx-june-ew-month-7day", kind: "wx-month", normals: "IAH_WX", month: 6, rule: "earthwork", week: 7, expect: { lost: 42.64 / 5 } },
  // wx-year-pipe-6day / -7day: no start, the year's share f = lost work days ÷ work days: both scale by N/7, so f and
  //   the lost days are wx-year-pipe's for every week: f = 0.085205, 20 × f ÷ (1 − f) = 1.8628.
  { id: "wx-year-pipe-6day", kind: "wx-activity", normals: "IAH_RAIN", rule: "pipe", workDays: 20, start: null, week: 6, expect: { lost: (20 * (PIPE_YEAR / WEEKDAYS)) / (1 - PIPE_YEAR / WEEKDAYS), basis: "year", share: PIPE_YEAR / WEEKDAYS } },
  { id: "wx-year-pipe-7day", kind: "wx-activity", normals: "IAH_RAIN", rule: "pipe", workDays: 20, start: null, week: 7, expect: { lost: (20 * (PIPE_YEAR / WEEKDAYS)) / (1 - PIPE_YEAR / WEEKDAYS), basis: "year" } },
  // wx-june-ew-20-6day: 20 earthwork days from 2027-06-01 on a 6-day week: June's lost 6.0914 × 6/5 in its 30 days, the
  //   window (20 + L) × 7/6 into July (3.8251 × 6/5 in 31): L = 1.2 × 6.0914 + (1.2 × 3.8251/31)((20 + L) × 7/6 − 30) →
  //   L (1 − 1.4 × 3.8251/31) = 1.2 × 6.0914 − 8 × 3.8251/31 → 7.6429 (window 32.25 days); "+7.6 lost days (Jun–Jul, …)".
  //   More than the 5-day week's 7.0651: the shorter calendar span sits more in June, wetter than July.
  { id: "wx-june-ew-20-6day", kind: "wx-activity", normals: "IAH_WX", rule: "earthwork", workDays: 20, start: "2027-06-01", week: 6, station: "HOUSTON INTERCONT AP", expect: { lost: (1.2 * ew(5) - (8 * ew(6)) / 31) / (1 - (1.4 * ew(6)) / 31), basis: "window", months: [6, 7], note: "Weather: +7.6 lost days (Jun–Jul, HOUSTON INTERCONT AP normals)" } },
  // wx-june-ew-20-7day: the same on a 7-day week: June's 6.0914 × 7/5 = 8.528 in 30 days, the window 20 + L: L = 8.528 ×
  //   (20 + L)/30 → L = (28 × 6.0914/30) ÷ (1 − 8.528/30) = 7.9434 (window 27.94 days, June only); "+7.9 lost days (June, …)".
  { id: "wx-june-ew-20-7day", kind: "wx-activity", normals: "IAH_WX", rule: "earthwork", workDays: 20, start: "2027-06-01", week: 7, station: "HOUSTON INTERCONT AP", expect: { lost: ((28 * ew(5)) / 30) / (1 - (1.4 * ew(5)) / 30), basis: "window", months: [6], note: "Weather: +7.9 lost days (June, HOUSTON INTERCONT AP normals)" } },
  // wx-ext-fixed-day-friday-6day: by the day from a Friday (2027-01-08) on a 6-day week, 1 + 2: base Fri $1,040; 3 work
  //   days Fri, Sat, Mon: Fri → Mon, the Sunday between, 4 days $4,160 → $3,120 (the 5-day week: Fri → Tue 5 days, $4,160).
  { id: "wx-ext-fixed-day-friday-6day", kind: "wx-ext", start: "2027-01-08", week: 6, machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":1,"lost":2,"shares":[{"host":"a","k":1}],"fixed":"day"}], expect: { total: 3120, a: 3120 } },
  // wx-ext-cross-6day: 20 + 2 on a 6-day week from a Monday: 23 and 25 days on rent, both one 4-week $7,950 → $0 (the
  //   5-day week's 26 → 30 days gave $2,080, wx-ext-cross).
  { id: "wx-ext-cross-6day", kind: "wx-ext", week: 6, machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":20,"lost":2,"shares":[{"host":"a","k":1}]}], expect: { total: 0, a: null } },
  // wx-ext-7day: 26 + 4 on a 7-day week: 26 days, one 4-week $7,950; 30 days, one 4-week + 2 days $10,030 (4-week + week
  //   $10,877) → $2,080.
  { id: "wx-ext-7day", kind: "wx-ext", week: 7, machines: [{"id":"a","classKey":"EX-CRAWL-20T","units":1,"baseDays":26,"lost":4,"shares":[{"host":"a","k":1}]}], expect: { total: 2080, a: 2080 } },
  // wx-line-rental-6day: the line's own rental (20 work days, 160 h, pipe, applied) on a 6-day week: 23 days on rent, one
  //   4-week $7,950; its lost days the year's average, wx-line-rental-unchanged's 1.8688 (the year's share does not move).
  { id: "wx-line-rental-6day", kind: "wx-machine", mode: "rental", activity: 12, applied: true, week: 6, workDays: 20, hours: 160, expect: { rent: 7950, days: 23, lost: (20 * (PIPE_YEAR_SNOW / WEEKDAYS)) / (1 - PIPE_YEAR_SNOW / WEEKDAYS) } },
  // --- D-1347 (the founder's D-1342 Q6): earthwork's freezing days, a clay drying day, a contract's USACE table ---------
  // wx-freeze-ew-jan: Carpenter, January, earthwork, with its 9.5 days at or below 32 °F all day: rain 0.172581 and snow
  //   0.172487 (wx-snow-gallia-ew), freezing 9.5/31 = 0.306452; independent: 1 − 0.827419 × 0.827513 × 0.693548 = 0.525127
  //   → × 31 × 5/7 = 11.6278 lost working days (6.9817 before the freezing days).
  { id: "wx-freeze-ew-jan", kind: "wx-month", normals: "CARPENTER_T", month: 1, rule: "earthwork", expect: { lost: (1 - (1 - (2.5 + 3.1 * (1 - 2.5 / 31)) / 31) * (1 - (2.8 + 2.8 * (1 - 2.8 / 31)) / 31) * (1 - 9.5 / 31)) * 31 * 5 / 7 } },
  // wx-freeze-pipe-jan / -flat-jan: the freezing days are earthwork's only: pipe and flatwork read as before (wx-snow-gallia-*).
  { id: "wx-freeze-pipe-jan", kind: "wx-month", normals: "CARPENTER_T", month: 1, rule: "pipe", expect: { lost: (1 - (28.5 / 31) * (28.2 / 31)) * 31 * 5 / 7 } },
  { id: "wx-freeze-flat-jan", kind: "wx-month", normals: "CARPENTER_T", month: 1, rule: "flatwork", expect: { lost: (1 - (23.5 / 31) * (28.2 / 31)) * 31 * 5 / 7 } },
  // wx-freeze-no-double: the made-up harsh month. Rain (10 + 15 × (1 − 10/31)) / 31 = 0.650364, snow (10 + 10 × (1 −
  //   10/31)) / 31 = 0.541103, freezing 20/31 = 0.645161: 1.836628 of the month added up, 1 − 0.349636 × 0.458897 × 0.354839
  //   = 0.943067 combined (29.24 of its 31 days), never more than the month.
  { id: "wx-freeze-no-double", kind: "wx-share", normals: "HARSH", month: 1, days: 31, rule: "earthwork", expect: { rain: (10 + 15 * (1 - 10 / 31)) / 31, snow: (10 + 10 * (1 - 10 / 31)) / 31, freeze: 20 / 31, share: 1 - (1 - (10 + 15 * (1 - 10 / 31)) / 31) * (1 - (10 + 10 * (1 - 10 / 31)) / 31) * (1 - 20 / 31), within: true } },
  // wx-frost-night-off: the frost nights (minimum ≤ 32 °F, 28 in HARSH) add nothing: with the freezing days taken out the
  //   share is the rain and snow alone, 1 − 0.349636 × 0.458897 = 0.839552.
  { id: "wx-frost-night-off", kind: "wx-share", normals: "HARSH", noIce: true, month: 1, days: 31, rule: "earthwork", expect: { freeze: 0, share: 1 - (1 - (10 + 15 * (1 - 10 / 31)) / 31) * (1 - (10 + 10 * (1 - 10 / 31)) / 31) } },
  // wx-clay-june-ew: IAH June earthwork on clay: Dry = 3.6 + 2 × 2.0 = 7.6, (3.6 + 7.6 × 0.88) × 5/7 = 10.288 × 5/7 =
  //   7.348571 (6.091429 off clay, wx-june-ew-month).
  { id: "wx-clay-june-ew", kind: "wx-month", normals: "IAH_WX", month: 6, rule: "earthwork", clay: true, expect: { lost: (10.288 * 5) / 7 } },
  // wx-clay-june-pipe: clay changes earthwork only: June pipe 3.6 × 5/7 = 2.571429.
  { id: "wx-clay-june-pipe", kind: "wx-month", normals: "IAH_WX", month: 6, rule: "pipe", clay: true, expect: { lost: (3.6 * 5) / 7 } },
  // wx-clay-year-ew: no start, the year on clay: f = Σ ewClay × days × 5/7 ÷ 260.7143; 20 × f ÷ (1 − f).
  { id: "wx-clay-year-ew", kind: "wx-activity", normals: "IAH_RAIN", rule: "earthwork", clay: true, workDays: 20, start: null, expect: { lost: (20 * (EW_CLAY_YEAR / WEEKDAYS)) / (1 - EW_CLAY_YEAR / WEEKDAYS), basis: "year", share: EW_CLAY_YEAR / WEEKDAYS } },
  // wx-contract-year: the Addicks and Barker table typed in: f = 106/365 = 0.290411 for every rule; 20 × f ÷ (1 − f) =
  //   20 × 106/259 = 8.185328 (the normals' earthwork gave 5.0546, pipe 1.8628).
  { id: "wx-contract-year-ew", kind: "wx-activity", normals: "IAH_RAIN", rule: "earthwork", contract: USACE_HOU, workDays: 20, start: null, expect: { lost: (20 * USACE_F) / (1 - USACE_F), basis: "year", share: USACE_F } },
  { id: "wx-contract-year-pipe", kind: "wx-activity", normals: "IAH_RAIN", rule: "pipe", contract: USACE_HOU, workDays: 20, start: null, expect: { lost: (20 * USACE_F) / (1 - USACE_F), basis: "year" } },
  // wx-contract-no-clay: the table already counts wet ground: clay adds nothing on top (8.185328).
  { id: "wx-contract-no-clay", kind: "wx-activity", normals: "IAH_RAIN", rule: "earthwork", clay: true, contract: USACE_HOU, workDays: 20, start: null, expect: { lost: (20 * USACE_F) / (1 - USACE_F) } },
  // wx-contract-no-normals: a table prices with no station months at all (8.185328).
  { id: "wx-contract-no-normals", kind: "wx-activity", normals: "NONE", rule: "pipe", contract: USACE_HOU, workDays: 20, start: null, expect: { lost: (20 * USACE_F) / (1 - USACE_F) } },
  // wx-contract-june-20: 20 earthwork days from 2027-06-01: June 9 adverse days × 5/7 = 6.428571 lost work days in 30, July
  //   7 × 5/7 = 5 in 31; the window (20 + L) × 7/5 passes June: L = 6.428571 + 5/31 × ((20 + L) × 1.4 − 30) → L × 24/31 =
  //   6.428571 − 10/31 → 7.886905 (window 39.04 days). "Weather: +7.9 lost days (Jun–Jul, contract weather table (USACE))".
  { id: "wx-contract-june-20", kind: "wx-activity", normals: "IAH_WX", rule: "earthwork", contract: USACE_HOU, workDays: 20, start: "2027-06-01", station: "HOUSTON INTERCONT AP", expect: { lost: (45 / 7 - 10 / 31) / (24 / 31), basis: "window", months: [6, 7], note: "Weather: +7.9 lost days (Jun–Jul, contract weather table (USACE))" } },
  // wx-contract-cleared: the table cleared (null): the normals again, wx-year-ew's 5.0546.
  { id: "wx-contract-cleared", kind: "wx-activity", normals: "IAH_RAIN", rule: "earthwork", contract: null, workDays: 20, start: null, expect: { lost: (20 * (EW_YEAR / WEEKDAYS)) / (1 - EW_YEAR / WEEKDAYS), basis: "year" } },
  // wx-contract-machine: through the bundle (the api's `contract_days`), the line's rented excavator on a pipe crew,
  //   applied, no start: 8.185328 lost days, the note names the table; the rental itself stays one 4-week $7,950.
  { id: "wx-contract-machine", kind: "wx-machine", mode: "rental", activity: 12, applied: true, extra: { contract_days: USACE_HOU }, workDays: 20, hours: 160, expect: { rent: 7950, lost: (20 * USACE_F) / (1 - USACE_F), note: "Weather: +8.2 lost days (year average, contract weather table (USACE))" } },
  // wx-clay-machine: the bundle's soil is clay (the top working layer): an earthwork activity (1) reads the clay year with
  //   December's snow day: 20 × f ÷ (1 − f), f = EW_CLAY_YEAR_SNOW / 260.7143. The same machine on silt reads off clay.
  { id: "wx-clay-machine", kind: "wx-machine", mode: "rental", activity: 1, applied: true, extra: { soil: { group: "clay", layer: "Layer 2" } }, workDays: 20, hours: 160, expect: { rent: 7950, lost: (20 * (EW_CLAY_YEAR_SNOW / WEEKDAYS)) / (1 - EW_CLAY_YEAR_SNOW / WEEKDAYS) } },
  // wx-contract-attention: a contract table on a project with no station: Needs attention says only the missing start
  //   date (the table prices the lost days; no "Lost days are not added").
  { id: "wx-contract-attention", kind: "wx-attention", weather: { contract_days: USACE_HOU, applied: true, months: null, work_start: null, flags: ["no_station"], far: false, station: null, point: { lat: 1, lon: 1 } }, expect: { lines: ["Start date not set: average year used"] } },
  // wx-contract-label: Setup's line names the table.
  { id: "wx-contract-label", kind: "wx-label", weather: { contract_days: USACE_HOU, applied: true, months: null, station: null, flags: [] }, expect: { label: "Weather: contract weather table (USACE) used" } },
  // The validation (the panel's and the api's `contract_error`, the same rule): 12 months, each 0 to the month's days
  //   (February 28).
  { id: "wx-contract-ok", kind: "wx-contract-check", days: USACE_HOU, expect: { message: null } },
  { id: "wx-contract-11", kind: "wx-contract-check", days: USACE_HOU.slice(0, 11), expect: { message: "A contract weather table needs 12 months (January to December), not 11." } },
  { id: "wx-contract-feb-29", kind: "wx-contract-check", days: [11, 29, 6, 6, 7, 9, 7, 10, 13, 10, 9, 10], expect: { message: "February: the adverse weather days must be 0 to 28." } },
  { id: "wx-contract-negative", kind: "wx-contract-check", days: [-1, 8, 6, 6, 7, 9, 7, 10, 13, 10, 9, 10], expect: { message: "January: the adverse weather days must be 0 to 31." } },
  { id: "wx-contract-sep-31", kind: "wx-contract-check", days: [11, 8, 6, 6, 7, 9, 7, 10, 31, 10, 9, 10], expect: { message: "September: the adverse weather days must be 0 to 30." } },
  // wx-contract-paste: a row pasted with tabs, commas and spaces reads as the 12 numbers; a word reads as not a number.
  { id: "wx-contract-paste", kind: "wx-contract-check", text: "11\t8 6,6 7  9 7 10 13 10 9 10\n", expect: { days: USACE_HOU, message: null } },
  { id: "wx-contract-word", kind: "wx-contract-check", text: "11 8 six 6 7 9 7 10 13 10 9 10", expect: { message: "March: the adverse weather days must be 0 to 31." } },
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
      const periods = await import("/src/lib/estimate/equipment/periods.ts");
      const bundleFor = new Function(`return ${bundleSrc}`)();
      const of = (k) => normals[k] ?? [];
      return cases.map((c) => {
        if (c.kind === "wx-same") {
          let maxDiff = 0;
          for (const rule of ["earthwork", "pipe", "flatwork"])
            for (let i = 0; i < 12; i++) maxDiff = Math.max(maxDiff, Math.abs(wx.lostInMonth(normals.IAH_RAIN[i], rain.NORMAL_MONTH_DAYS[i], rule) - rain.lostDaysInMonth(normals.IAH_RAIN[i], rain.NORMAL_MONTH_DAYS[i], rule)));
          return { maxDiff: maxDiff < 1e-12 ? 0 : maxDiff };
        }
        if (c.kind === "wx-month") return { lost: wx.lostInMonth(of(c.normals)[c.month - 1], rain.NORMAL_MONTH_DAYS[c.month - 1], c.rule, c.week, { clay: Boolean(c.clay) }) };
        if (c.kind === "wx-share") {
          // D-1347: a month's parts and its combined share; `within`: the combined share never passes the month.
          const m = of(c.normals)[c.month - 1];
          const r = wx.lostShare(c.noIce ? { ...m, icemax: null } : m, c.days, c.rule, { clay: Boolean(c.clay) });
          return { ...r, within: r.share <= 1 && r.share < r.rain + r.snow + r.freeze };
        }
        if (c.kind === "wx-contract-check") {
          const days = c.text != null ? wx.parseContractTable(c.text) : c.days;
          return { days, message: wx.contractTableError(days) };
        }
        if (c.kind === "wx-label") return { label: wxApi.weatherSetupLabel(c.weather) };
        if (c.kind === "wx-frost") return { days: wx.frostDays(of(c.normals)[c.month - 1]) };
        if (c.kind === "wx-activity") {
          const a = wx.activityLostDays(of(c.normals), c.rule, c.workDays, c.start ? rain.parseDay(c.start) : null, c.week, { clay: Boolean(c.clay), contract: c.contract ?? null });
          if (!a) return { none: true };
          return { ...a, ...(c.station ? { note: wx.weatherNote(a, c.station, Boolean(wx.contractTable(c.contract ?? null))) } : {}) };
        }
        if (c.kind === "wx-ext") {
          // D-1344: a row with a start date puts it in the bundle's weather (Weather settings' "Work starts"); D-1346: a
          //   row's work week too (the rate set's days a week, `work_days_per_week`).
          const lib = resolve.library(c.start || c.week ? { ...bundleFor(eqlib, {}), weather: { ...weatherOff, work_start: c.start ?? null, ...(c.week ? { work_days_per_week: c.week } : {}) } } : bundleFor(eqlib, {}));
          const e = ext.weatherExtension(lib, c.machines);
          return { total: e.total, a: e.allocByHost.get("a") ?? null, b: e.allocByHost.get("b") ?? null };
        }
        if (c.kind === "wx-machine") {
          const lib = resolve.library({ ...bundleFor(eqlib, {}), weather: { ...(c.applied ? weatherOn : weatherOff), ...(c.week ? { work_days_per_week: c.week } : {}), ...(c.extra ?? {}) } });
          const m = cost.machineCost(lib, { classKey: "EX-CRAWL-20T", mode: c.mode, period: "auto", hours: c.hours, workDays: c.workDays, hoursPerDay: 8, fuelLoad: "med", units: 1, includeMob: false, weatherActivityId: c.activity });
          return { rent: m.rental?.cost ?? null, days: m.rental?.billedDays ?? null, lost: m.weather?.lost ?? null, note: m.weather?.note ?? null };
        }
        if (c.kind === "wk-solve") {
          // D-1346: the rental solver on a row's work week (none: the default 5).
          const [day, week, fourWeek] = c.rates;
          const r = periods.solveRental({ day, week, fourWeek }, c.days, c.hours, c.fixed, { ...(c.start ? { startWeekday: periods.weekdayOf(c.start) } : {}), ...(c.week ? { workWeek: c.week } : {}) });
          if (!r) return { none: true };
          return { cost: r.cost, periodCost: r.periodCost, billedDays: r.billedDays, allowanceHours: r.allowanceHours, startAssumed: r.startAssumed, overtimeHours: r.overtimeHours, overtimeCost: r.overtimeCost, workWeek: r.workWeek, label: periods.coverLabel(r) };
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
    [WEATHER_CASES, { IAH_RAIN, IAH_WX, CARPENTER, CARPENTER_T, HARSH, NONE: [] }, eqlib, bundleFor.toString(), weatherOf(true), weatherOf(false)],
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

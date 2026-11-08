// F18's registration rows (D-188): the app's lib/takeoff/earthwork/register.ts against the
// api's earthwork/register.py on the same pairs, both against the answer worked by hand.
// A sheet's scale is [feet per PDF point, width pt, height pt]; a pair is
// [[source x, y], [target x, y]] in fractions of each page. Numbers to 1e-9.
//
// Output fields: ok, reason (when refused), rotationDeg, scale, maxResidualFt, diffPct,
// level, probe (a source point mapped to the target, "x,y").

const IN = 72;
/** 1" = 20' and 1" = 30' on a 1000 × 1000 pt page. */
const S20 = [20 / IN, 1000, 1000];
const S30 = [30 / IN, 1000, 1000];
const TENTH = [0.1, 1000, 1000];

export const REGISTER_CASES = [
  {
    // A 100 ft square surveyed at 1" = 20', turned 90°, against the same square at 1" = 30'.
    // Source feet (50,150) (50,50) (150,50) (150,150) → turned +90° and moved (250, 50) →
    // target feet (100,100) (200,100) (200,200) (100,200).
    id: "reg-square-turned-90",
    src: S20,
    tgt: S30,
    pairs: [
      [[0.18, 0.54], [0.24, 0.24]],
      [[0.18, 0.18], [0.48, 0.24]],
      [[0.54, 0.18], [0.48, 0.48]],
      [[0.54, 0.54], [0.24, 0.48]],
    ],
    probe: [0.36, 0.36],
    expect: { ok: true, rotationDeg: 90, scale: 1, maxResidualFt: 0, diffPct: 0, level: "ok", probe: "0.36,0.36" },
  },
  {
    // The source's distances 1 / 0.95 of the target's: 5.263 % off, so Confirm needs the
    // fitted scale.
    id: "reg-distance-5pct-requires-choice",
    src: TENTH,
    tgt: TENTH,
    pairs: [
      [[0.1, 0.1], [0.095, 0.095]],
      [[0.2, 0.1], [0.19, 0.095]],
      [[0.2, 0.2], [0.19, 0.19]],
    ],
    expect: { ok: true, scale: 1, diffPct: 100 / 19, level: "require" },
  },
  {
    // The same pairs with "Fit the scale too": 0.95, no rotation, no miss.
    id: "reg-distance-5pct-scale-fitted",
    src: TENTH,
    tgt: TENTH,
    fitScale: true,
    pairs: [
      [[0.1, 0.1], [0.095, 0.095]],
      [[0.2, 0.1], [0.19, 0.095]],
      [[0.2, 0.2], [0.19, 0.19]],
    ],
    probe: [0.4, 0.3],
    expect: { ok: true, rotationDeg: 0, scale: 0.95, maxResidualFt: 0, level: "require", probe: "0.38,0.285" },
  },
  {
    // 101 ft against 100 ft: a 1 % miss warns and is allowed.
    id: "reg-distance-1pct-warns",
    src: TENTH,
    tgt: TENTH,
    pairs: [
      [[0.1, 0.1], [0.1, 0.1]],
      [[0.201, 0.1], [0.2, 0.1]],
    ],
    expect: { ok: true, diffPct: 1, level: "warn" },
  },
  {
    // A third pair mirrored in x: refused.
    id: "reg-mirrored-refused",
    src: TENTH,
    tgt: TENTH,
    pairs: [
      [[0.1, 0.1], [0.9, 0.1]],
      [[0.3, 0.1], [0.7, 0.1]],
      [[0.1, 0.4], [0.9, 0.4]],
    ],
    expect: { ok: false, reason: "mirrored" },
  },
  {
    id: "reg-too-few",
    src: TENTH,
    tgt: TENTH,
    pairs: [[[0.1, 0.1], [0.2, 0.2]]],
    expect: { ok: false, reason: "too_few" },
  },
  {
    id: "reg-uncalibrated",
    src: [0, 1000, 1000],
    tgt: TENTH,
    pairs: [
      [[0.1, 0.1], [0.1, 0.1]],
      [[0.2, 0.1], [0.2, 0.1]],
    ],
    expect: { ok: false, reason: "uncalibrated" },
  },
];

// GPS Export's coordinates (D-672): lib/takeoff/earthwork/export/georef.ts against the api's
// earthwork/georef.py, on the same picked points with their typed northing and easting, both
// against the answer worked here by hand. A point is [x, y, n, e]: x and y in fractions of the
// page, n and e in the case's units. Plan coordinates: easting x × page feet, northing −y × page
// feet, in the units (US survey feet × 1200/3937 ÷ 0.3048 is 0.999998; metres × 0.3048).
// Output fields: ok, reason, rotationDeg, scale, maxResidual, rms, probe ("n,e" of a picked point).
const PAGE_FT = 1000 * (20 / IN);
const US = 0.3048 / (1200 / 3937);
/** The grid made by hand: plan (in the units) turned `deg`, scaled `k`, moved to (n0, e0). */
const gridOf = ([x, y], { deg, k = 1, e0, n0, per = 1 }) => {
  const [e, n] = [x * PAGE_FT * per, -y * PAGE_FT * per];
  const r = (deg * Math.PI) / 180;
  return [n0 + k * (Math.sin(r) * e + Math.cos(r) * n), e0 + k * (Math.cos(r) * e - Math.sin(r) * n)];
};
const picked = [[0.1, 0.9], [0.9, 0.9], [0.5, 0.1]];
const pointsFor = (how) => picked.map((p) => [...p, ...gridOf(p, how)]);
const near = (v) => +v.toFixed(9);
const probeFor = (how) => gridOf([0.5, 0.5], how).map(near).join(",");
const TURNED = { deg: 30, e0: 2_000_000, n0: 500_000 };
const GRID_FACTOR = { deg: -12.5, k: 1.0004, e0: 1_300_000, n0: 600_000 };

export const GEOREF_CASES = [
  // Three monuments, turned 30° and moved to state-plane-sized values, international feet.
  { id: "geo-turned-30", kind: "georef", scale: S20, units: "intl-ft", points: pointsFor(TURNED), probe: [0.5, 0.5], expect: { ok: true, rotationDeg: 30, scale: 1, maxResidual: 0, rms: 0, probe: probeFor(TURNED) } },
  // The same ground typed in US survey feet: the fit's scale stays 1 once plan feet are taken as US feet.
  { id: "geo-us-survey-feet", kind: "georef", scale: S20, units: "us-ft", points: pointsFor({ ...TURNED, per: US }), probe: [0.5, 0.5], expect: { ok: true, rotationDeg: 30, scale: 1, maxResidual: 0, probe: probeFor({ ...TURNED, per: US }) } },
  // Metres.
  { id: "geo-metres", kind: "georef", scale: S20, units: "m", points: pointsFor({ ...TURNED, per: 0.3048 }), probe: [0.5, 0.5], expect: { ok: true, rotationDeg: 30, scale: 1, maxResidual: 0, probe: probeFor({ ...TURNED, per: 0.3048 }) } },
  // A grid scale factor of 1.0004 and a turn of −12.5°: the fitted scale takes the factor.
  { id: "geo-grid-factor", kind: "georef", scale: S20, units: "us-ft", points: pointsFor({ ...GRID_FACTOR, per: US }), probe: [0.5, 0.5], expect: { ok: true, rotationDeg: -12.5, scale: 1.0004, maxResidual: 0, probe: probeFor({ ...GRID_FACTOR, per: US }) } },
  // Northing and easting typed swapped: mirrored, refused.
  { id: "geo-swapped-mirrored", kind: "georef", scale: S20, units: "intl-ft", points: pointsFor(TURNED).map(([x, y, n, e]) => [x, y, e, n]), expect: { ok: false, reason: "mirrored" } },
  // Two points fit exactly: no residuals to show.
  { id: "geo-two-exact", kind: "georef", scale: S20, units: "intl-ft", points: pointsFor(TURNED).slice(0, 2), probe: [0.5, 0.5], expect: { ok: true, rotationDeg: 30, scale: 1, maxResidual: 0, rms: 0, probe: probeFor(TURNED) } },
  // One point: too few.
  { id: "geo-one-point", kind: "georef", scale: S20, units: "intl-ft", points: pointsFor(TURNED).slice(0, 1), expect: { ok: false, reason: "too_few" } },
  // A fourth point typed 0.30 ft north of where it is: both engines agree on the misses (no hand figure).
  { id: "geo-one-off", kind: "georef", scale: S20, units: "intl-ft", points: [...pointsFor(TURNED), ((p) => [p[0], p[1], p[2] + 0.3, p[3]])([0.9, 0.1, ...gridOf([0.9, 0.1], TURNED)])], expect: { ok: true } },
  // The fourth-monument check (D-674): a fourth point marked check, read through the three's fit, never in it.
  // On the transform: the fit is the three's and the check misses by 0.
  { id: "geo-check-on", kind: "georef", scale: S20, units: "intl-ft", points: [...pointsFor(TURNED), [0.9, 0.1, ...gridOf([0.9, 0.1], TURNED), true]], probe: [0.5, 0.5], expect: { ok: true, rotationDeg: 30, scale: 1, rms: 0, checkMiss: 0, probe: probeFor(TURNED) } },
  // Typed 0.30 ft north: the fit does not move (rms 0, the same probe) and the check misses by 0.30 exactly.
  { id: "geo-check-off", kind: "georef", scale: S20, units: "intl-ft", points: [...pointsFor(TURNED), ((p) => [p[0], p[1], p[2] + 0.3, p[3], true])([0.9, 0.1, ...gridOf([0.9, 0.1], TURNED)])], probe: [0.5, 0.5], expect: { ok: true, rotationDeg: 30, scale: 1, rms: 0, checkMiss: 0.3, probe: probeFor(TURNED) } },
  // One point in the fit and one check: too few in the fit.
  { id: "geo-check-too-few", kind: "georef", scale: S20, units: "intl-ft", points: [pointsFor(TURNED)[0], [...pointsFor(TURNED)[1], true]], expect: { ok: false, reason: "too_few" } },
  // An uncalibrated sheet.
  { id: "geo-uncalibrated", kind: "georef", scale: [0, 1000, 1000], units: "intl-ft", points: pointsFor(TURNED), expect: { ok: false, reason: "uncalibrated" } },
];

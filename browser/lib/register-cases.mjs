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

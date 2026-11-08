// F13's rows in the shared quantity table (D-189): the app's lib/takeoff/autoCount on
// synthetic sheets, each against the answer worked by hand. Browser only (the matcher has no
// Python twin; it runs in the browser, D-189 Q1).
//
// The symbol is asymmetric, so every one of its eight orientations is a different drawing:
// a 24-sided circle (r 6 pt), an "L" inside it, a stem out to the right and a tick up at the
// stem's end. Instances are the template turned clockwise and/or mirrored (mirror first),
// placed on a 2000 × 1000 pt page (aspect 2, so a turned box is not a plain swap in
// normalised units). A decoy is the bare circle with a "T" where the symbol has its "L"
// and no stem: legacy's adjunct rule sinks such a look-alike (a decoy that keeps the stem
// and tick but changes a stroked letter stays above the bar by legacy's own design).

const W = 2000;
const H = 1000;

const circle = Array.from({ length: 24 }, (_, k) => [6 * Math.cos((k * Math.PI) / 12), 6 * Math.sin((k * Math.PI) / 12)]);
const SYMBOL = [
  { pts: circle, closed: true },
  // The letter: drawn forwards on a mirrored instance, as CAD prints text in a mirrored block.
  { pts: [[-2, -3.5], [-2, 3], [3, 3]], closed: false, letter: true },
  { pts: [[6, 0], [16, 0]], closed: false },
  { pts: [[16, 0], [16, -5]], closed: false },
];
const DECOY = [
  { pts: circle, closed: true },
  { pts: [[-3, -3], [3, -3]], closed: false },
  { pts: [[0, -3], [0, 3]], closed: false },
];

/** Mirror first (x → −x), then turn clockwise on the page (y down). */
const orient = ([x, y], turn, mirrored) => {
  const mx = mirrored ? -x : x;
  if (turn === 90) return [-y, mx];
  if (turn === 180) return [-mx, -y];
  if (turn === 270) return [y, -mx];
  return [mx, y];
};

const place = (strokes, cx, cy, turn = 0, mirrored = false) =>
  strokes.map((s) => ({ closed: s.closed, pts: s.pts.map((p) => orient(p, turn, mirrored && !s.letter)).map(([x, y]) => [(cx + x) / W, (cy + y) / H]) }));

const INSTANCES = [
  { name: "asDrawn", cx: 200, cy: 200, turn: 0, mirrored: false },
  { name: "turned90", cx: 500, cy: 200, turn: 90, mirrored: false },
  { name: "turned180", cx: 800, cy: 200, turn: 180, mirrored: false },
  { name: "turned270", cx: 1100, cy: 200, turn: 270, mirrored: false },
  { name: "mirrored", cx: 1400, cy: 200, turn: 0, mirrored: true },
  { name: "mirrored90", cx: 200, cy: 600, turn: 90, mirrored: true },
];
const DECOYS = [{ name: "decoyT", cx: 800, cy: 600 }];

const page = [
  ...INSTANCES.flatMap((i) => place(SYMBOL, i.cx, i.cy, i.turn, i.mirrored)),
  ...DECOYS.flatMap((d) => place(DECOY, d.cx, d.cy)),
];
/** The template box around the as-drawn instance: x −9..19 pt, y −9..9 pt. */
const BOX = { x: (200 - 9) / W, y: (200 - 9) / H, w: 28 / W, h: 18 / H };

const probes = [...INSTANCES, ...DECOYS].map((i) => ({ name: i.name, x: i.cx / W, y: i.cy / H }));

export const AUTOCOUNT_CASES = [
  {
    // D-189 Q6: quarter turns and the mirror, each found above the 78 % bar with the
    // orientation it was drawn in; the decoy with the wrong letter stays below it.
    id: "autocount-vector-turns-and-mirror",
    page,
    box: BOX,
    aspect: W / H,
    opts: { rotations: 4, includeMirror: true },
    probes,
    expect: {
      asDrawn: "0", turned90: "90", turned180: "180", turned270: "270", mirrored: "m0", mirrored90: "m90",
      instancesAboveBar: 6, decoyAboveBar: false,
    },
  },
  {
    // Legacy's search (as drawn only, no mirror): none of the three turned copies clears the
    // bar, which is what the turn search adds. The mirrored copy still does: its circle and
    // its forwards letter match, and its stem on the other side only costs legacy's adjunct
    // factor.
    id: "autocount-vector-as-drawn-only",
    page,
    box: BOX,
    aspect: W / H,
    opts: { rotations: 1, includeMirror: false },
    probes,
    expect: { asDrawn: "0", instancesAboveBar: 2, decoyAboveBar: false, above: "asDrawn,mirrored" },
  },
  {
    // The template box's own window scores itself at 1 (legacy's self-instance honesty).
    id: "autocount-vector-self-score",
    page,
    box: BOX,
    aspect: W / H,
    opts: { rotations: 4, includeMirror: true },
    probes: [probes[0]],
    expect: { selfScore: 1 },
  },
];

// The shared pipeline (legacy's resultPipeline and valleyCut, ported unchanged).
export const AUTOCOUNT_PIPELINE_CASES = [
  {
    // NMS, score first: B's centre is 3 from A's, under half A's side (5): suppressed. C is clear.
    id: "autocount-nms",
    kind: "nms",
    candidates: [
      { id: "A", bbox: { x: 0, y: 0, w: 10, h: 10 }, score: 0.9 },
      { id: "B", bbox: { x: 3, y: 0, w: 10, h: 10 }, score: 0.8 },
      { id: "C", bbox: { x: 20, y: 0, w: 10, h: 10 }, score: 0.7 },
    ],
    expect: { survivors: "A,C" },
  },
  { id: "autocount-autocheck", kind: "check", expect: { at78: true, under78: false, nearOneAt100: true } },
  {
    // 60 tied at the top with nothing under them: saturated. 60 tied over a clear valley: a plateau of true matches.
    id: "autocount-saturation",
    kind: "saturation",
    expect: { flat: true, separated: false },
  },
  {
    // Checked 0.95, 0.90; unchecked 0.75, 0.72, 0.50, 0.45 under the 78 bar: the largest gap is
    // 0.72 → 0.50 (0.22 ≥ 0.06), so 0.75 and 0.72 stay visible and 0.50, 0.45 go to the drawer.
    id: "autocount-valley-cut",
    kind: "valley",
    scores: [[0.95, true], [0.9, true], [0.75, false], [0.72, false], [0.5, false], [0.45, false]],
    expect: { mode: "valley", visible: "0.75,0.72", drawer: "0.5,0.45" },
  },
  {
    // Legacy's stored minSpacing read as Overlap allowed; a bad vector rotation and a
    // non-boolean mirror fall back to their defaults; image mode's 8 means 8 angles. The
    // sensitivity default is 70 since D-299 (the panel opens there every run).
    id: "autocount-settings-normalise",
    kind: "settings",
    raw: { minSpacing: 0.3, rotations: 8, vectorRotations: 2, includeMirror: "yes" },
    expect: { overlapAllowed: 0.3, rotations: 8, vectorRotations: 4, includeMirror: true, sensitivity: 70, angles: 8 },
  },
];

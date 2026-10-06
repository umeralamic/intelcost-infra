// F19's site rows (D-231): the app's lib/takeoff/earthwork/site.ts and, for the join's fit
// and a member's placement, the api's earthwork/site.py, both against answers worked by
// hand. A sheet's scale is [feet per PDF point, width pt, height pt]; lines and points are
// fractions of each page. Numbers to 1e-9.
//
// The ground: sheet A (the anchor, 1" = 20', its page is the site frame: ground feet = A's
// feet) and sheet B (1" = 30', its page origin at ground (50, −20), so B feet = ground −
// (50, −20)). The match line is the ground line x = 100 from y = 0 to y = 100: on A
// (0.36, 0)–(0.36, 0.36), on B (0.12, 0.048)–(0.12, 0.288). A is the west sheet (its
// drawing's centre (0.18, 0.18), ground (50, 50)); B the east (its centre (0.36, 0.2),
// ground (200, 63.333)).

const IN = 72;
const S20 = [20 / IN, 1000, 1000];
const S30 = [30 / IN, 1000, 1000];
const A_LINE = [[0.36, 0], [0.36, 0.36]];
const B_LINE = [[0.12, 0.048], [0.12, 0.288]];
const A_CENTRE = [0.18, 0.18];
const B_CENTRE = [0.36, 0.2];

/** Both engines: fitJoin / fit_join (and placeMember / place_member). */
export const SITE_JOIN_CASES = [
  {
    // B joined to A: B's feet move by (50, −20), no turn; B's centre lands at ground
    // (200, 63.333), A's (0.72, 0.228).
    id: "site-halves-two-scales",
    kind: "join",
    src: S30,
    tgt: S20,
    source: B_LINE,
    target: A_LINE,
    sourceCentre: B_CENTRE,
    targetCentre: A_CENTRE,
    probe: [0.36, 0.2],
    expect: { ok: true, reversed: false, rotationDeg: 0, scale: 1, missFt: 0, diffPct: 0, level: "ok", probe: "0.72,0.228" },
  },
  {
    // The same line drawn the other way on B: the same placement, found reversed.
    id: "site-line-drawn-backwards",
    kind: "join",
    src: S30,
    tgt: S20,
    source: [...B_LINE].reverse(),
    target: A_LINE,
    sourceCentre: B_CENTRE,
    targetCentre: A_CENTRE,
    probe: [0.36, 0.2],
    expect: { ok: true, reversed: true, rotationDeg: 0, scale: 1, missFt: 0, diffPct: 0, level: "ok", probe: "0.72,0.228" },
  },
  {
    // A bent line, ground (100, 0) (100, 50) (130, 100), on a B turned 90°: B feet =
    // (−y, x) of the ground + (150, 0), so B's points are (150, 100) (100, 100) (50, 130),
    // at 1" = 30' (0.36, 0.24) (0.24, 0.24) (0.12, 0.312). The fit turns −90°, misses 0,
    // and maps B's (0.24, 0.24) to ground (100, 50), A's (0.36, 0.18).
    id: "site-bent-line-turned",
    kind: "join",
    src: S30,
    tgt: S20,
    source: [[0.36, 0.24], [0.24, 0.24], [0.12, 0.312]],
    target: [[0.36, 0], [0.36, 0.18], [0.468, 0.36]],
    probe: [0.24, 0.24],
    expect: { ok: true, reversed: false, rotationDeg: -90, scale: 1, missFt: 0, diffPct: 0, level: "ok", probe: "0.36,0.18" },
  },
  {
    // B's line 1 % long (101 ft against 100): warned, allowed.
    id: "site-line-1pct-long-warns",
    kind: "join",
    src: S30,
    tgt: S20,
    source: [[0.12, 0.048], [0.12, 0.2904]],
    target: A_LINE,
    sourceCentre: B_CENTRE,
    targetCentre: A_CENTRE,
    expect: { ok: true, reversed: false, rotationDeg: 0, scale: 1, diffPct: 1, level: "warn" },
  },
  {
    // A member placed on a partner turned 90° at (100, 0): the join's (50, −20) turns to
    // (20, 50) and moves to (120, 50); the turn adds up.
    id: "site-place-member-composed",
    kind: "place",
    base: { rotationDeg: 90, scale: 1, tx: 100, ty: 0 },
    fit: { rotationDeg: 0, scale: 1, tx: 50, ty: -20 },
    expect: { rotationDeg: 90, scale: 1, tx: 120, ty: 50 },
  },
];

/** Browser only: the shapes across the join, on the two members above (B placed by the
 *  first row's fit). Points in the site frame are ground feet. */
export const SITE_SHAPE_CASES = [
  {
    // A keeps the west of its line (x < 0.36 of its page), B the east of its own.
    id: "site-visible-regions",
    kind: "region",
    expect: { aArea: 0.36, bArea: 0.88 },
  },
  {
    // A run at y = 50 from x = 50 to 200: 50 ft on A, 100 ft on B, meeting at x = 100.
    id: "site-split-run",
    kind: "split",
    run: [[50, 50], [200, 50]],
    expect: { pieces: 2, members: "0,1", lengthsFt: "50,100", totalFt: 150 },
  },
  {
    // A 150 × 60 rectangle across the line: 3,000 sf on A, 6,000 on B; a 40 × 20 deduct
    // across it: 400 and 400.
    id: "site-clip-area-and-deduct",
    kind: "clip",
    polygon: [[50, 20], [200, 20], [200, 80], [50, 80]],
    deduct: [[80, 30], [120, 30], [120, 50], [80, 50]],
    expect: { areasSf: "3000,6000", totalSf: 9000, deductSf: "400,400" },
  },
  {
    // The split run's pieces, given back B first and turned round: one run again, 150 ft.
    id: "site-rejoin-runs",
    kind: "rejoin",
    run: [[50, 50], [200, 50]],
    expect: { chains: 1, totalFt: 150, ends: "50,50 200,50" },
  },
  {
    // A join point dragged to (105, 40) goes back onto the line at (100, 40).
    id: "site-slide-join-point",
    kind: "slide",
    point: [105, 40],
    line: [[100, 0], [100, 100]],
    expect: { point: "100,40" },
  },
];

// The Calculate rows: a 100 × 100 ft square, A (0.1 ft/pt, 100 ft pages) its west half,
// B (0.2 ft/pt, 200 ft pages, origin at ground (0, −50)) its east half, joined at x = 50.
const P01 = [0.1, 1000, 1000];
const P02 = [0.2, 1000, 1000];
const onA = ([gx, gy]) => [gx / 100, gy / 100];
const onB = ([gx, gy]) => [gx / 200, (gy + 50) / 200];
const WEST = [[0, 0], [50, 0], [50, 100], [0, 100]];
const EAST = [[50, 0], [100, 0], [100, 100], [50, 100]];
const spots = (surface, side, z, pts, on) => pts.map((p, i) => ({ item: surface + side + i, kind: "spot_elevation", surface, elevation: z(p), points: [on(p)] }));
const halves = (eg, fg) => ({
  a: [...spots("EG", "a", eg, WEST, onA), ...spots("FG", "a", fg, WEST, onA), { item: "boundary", kind: "boundary", surface: null, elevation: null, points: WEST.map(onA) }],
  b: [...spots("EG", "b", eg, EAST, onB), ...spots("FG", "b", fg, EAST, onB), { item: "boundary", kind: "boundary", surface: null, elevation: null, points: EAST.map(onB) }],
});
export const SITE_HALVES = { P01, P02, aLine: [[0.5, 0], [0.5, 1]], bLine: [[0.25, 0], [0.25, 1]], aCentre: [0.25, 0.5], bCentre: [0.6, 0.5], bPlacement: { rotation: 0, scale: 1, tx: 0, ty: -50 } };

// Auto Trace rows: three contours across ground x = 100 at y = 40, 60, 80, from x = 20 on A
// to x = 180 on B, in each sheet's points (A: 3.6 pt per ft; B: 2.4 pt per ft of its own
// feet, ground − (50, −20)). A null elevation on B leaves that piece out.
const tracePieces = (elevA, elevB) => ({
  a: elevA.map((z, i) => ({ id: i + 1, surface: "EG", elevation: z, pts: [[20 * 3.6, (40 + 20 * i) * 3.6], [100 * 3.6, (40 + 20 * i) * 3.6]] })),
  b: elevB.flatMap((z, i) => (z === null ? [] : [{ id: i + 1, surface: "EG", elevation: z, pts: [[(100 - 50) * 2.4, (40 + 20 * i + 20) * 2.4], [(180 - 50) * 2.4, (40 + 20 * i + 20) * 2.4]] }])),
});

SITE_SHAPE_CASES.push(
  {
    // The plane z = 100 + 2x + 2y (x, y as shares of 100 ft) against FG 103 over the two
    // halves: the one-sheet answer, cut 10,000 / 24 / 27 and fill 250,000 / 24 / 27 CY.
    id: "site-volume-plane-over-halves",
    kind: "site-volume",
    halves: halves(([x, y]) => 100 + (2 * x) / 100 + (2 * y) / 100, () => 103),
    expect: { ok: true, cutCY: 10000 / 24 / 27, fillCY: 250000 / 24 / 27, boundarySF: 10000 },
  },
  {
    // West all cut, east all fill, 500 CY each (FG = 100 + 5.4 (x − 50) / 50 under EG 100):
    // alone, the west exports 500 and the east imports 500; the site balances, neither line.
    id: "site-balance-nets-out",
    kind: "site-balance",
    halves: halves(() => 100, ([x]) => 100 + (5.4 * (x - 50)) / 50),
    expect: { siteCutCY: 500, siteFillCY: 500, westExport: 500, eastImport: 500, siteExport: null, siteImport: null },
  },
  { id: "stitch-three-joined", kind: "stitch", pieces: tracePieces([700, 705, 710], [700, 705, 710]), expect: { joined: 3, flags: "" } },
  { id: "stitch-one-mismatch", kind: "stitch", pieces: tracePieces([700, 705, 710], [700, 705, 711]), expect: { joined: 2, flags: "mismatch:Elevation differs across the match line (710 / 711)" } },
  { id: "stitch-one-unpartnered", kind: "stitch", pieces: tracePieces([700, 705, 710], [700, null, 710]), expect: { joined: 2, flags: "unpartnered:No partner across the match line" } },
);

export const SITE_GROUND = { S20, S30, A_LINE, B_LINE, A_CENTRE, B_CENTRE };

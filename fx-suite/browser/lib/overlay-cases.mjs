// Overlay's Highlight changes in the shared quantity table (overlay plan §3.1, task 11): the app's
// lib/takeoff/overlay/difference.ts on hand-drawn rasters, each against the answer worked by hand. Browser only (the
// difference has no Python twin; it runs in a Web Worker on the page).
//
// A raster is white paper (RGBA 255) with marks in it: `row` is a horizontal line y, x0..x1 inclusive; `px` is a list
// of pixels. A mark is black (luminance 0, opaque) unless it says otherwise. The ink threshold is 204: under it, ink.
// A pixel is near the other sheet's ink when its squared distance to it is at most (r + 0.5)², r the tolerance in
// pixels: so at r = 1 the eight neighbours count (a diagonal step is √2 ≤ 1.5), and at r = 2 two rows apart count
// (2 ≤ 2.5) and four do not (4 > 2.5).

const W = 40;
const H = 24;
/** 30 pixels: x 5..34 on row y. */
const line = (y, extra = {}) => ({ row: { y, x0: 5, x1: 34 }, ...extra });

export const OVERLAY_MASK_CASES = [
  // A line on the new sheet only: all 30 of its pixels are added.
  { id: "overlay-line-added", w: W, h: H, old: [], next: [line(10)], radiusPx: 1, expect: { added: 30, removed: 0, unchanged: 0 } },
  // A line on the old sheet only: all 30 removed.
  { id: "overlay-line-removed", w: W, h: H, old: [line(10)], next: [], radiusPx: 1, expect: { added: 0, removed: 30, unchanged: 0 } },
  // The same line on both: 30 unchanged, nothing coloured.
  { id: "overlay-line-unchanged", w: W, h: H, old: [line(10)], next: [line(10)], radiusPx: 1, expect: { added: 0, removed: 0, unchanged: 30 } },
  // Moved down 2 px at a 2 px tolerance: 2 ≤ 2.5, so both lines (60 pixels) read unchanged.
  { id: "overlay-offset-within", w: W, h: H, old: [line(10)], next: [line(12)], radiusPx: 2, expect: { added: 0, removed: 0, unchanged: 60 } },
  // Moved down 4 px at a 2 px tolerance: 4 > 2.5, so the new line is added and the old one removed.
  { id: "overlay-offset-beyond", w: W, h: H, old: [line(10)], next: [line(14)], radiusPx: 2, expect: { added: 30, removed: 30, unchanged: 0 } },
  // The default 0.01 in on a 36 in (2592 pt) sheet's 2048 px fit image is 0.57 px, so the floor of 1 px holds:
  // a 1 px move is within (1 ≤ 1.5).
  { id: "overlay-min-px-within", w: W, h: H, old: [line(10)], next: [line(11)], tol: { inches: 0.01, rasterPx: 2048, pagePt: 2592 }, expect: { radiusPx: 1, added: 0, removed: 0, unchanged: 60 } },
  // ... and a 2 px move is beyond it (2 > 1.5).
  { id: "overlay-min-px-beyond", w: W, h: H, old: [line(10)], next: [line(12)], tol: { inches: 0.01, rasterPx: 2048, pagePt: 2592 }, expect: { radiusPx: 1, added: 30, removed: 30, unchanged: 0 } },
  // A diagonal step of one pixel (right 1, down 1) at 1 px: √2 ≤ 1.5, all 60 unchanged.
  { id: "overlay-diagonal-step", w: W, h: H, old: [line(10)], next: [{ row: { y: 11, x0: 6, x1: 35 } }], radiusPx: 1, expect: { added: 0, removed: 0, unchanged: 60 } },
  // Scan noise at luminance 230 (5 pixels, over the 204 threshold) is paper; a grey line at 150 (10 pixels) is ink.
  {
    id: "overlay-noise-threshold",
    w: W,
    h: H,
    old: [],
    next: [{ px: [[2, 2], [8, 3], [20, 20], [30, 5], [37, 18]], lum: 230 }, { row: { y: 15, x0: 10, x1: 19 }, lum: 150 }],
    radiusPx: 1,
    expect: { added: 10, removed: 0, unchanged: 0 },
  },
  // Black pixels with no alpha (the fit image's clear margin) are paper: nothing added.
  { id: "overlay-clear-margin", w: W, h: H, old: [], next: [{ row: { y: 0, x0: 0, x1: 7 }, alpha: 0 }], radiusPx: 1, expect: { added: 0, removed: 0, unchanged: 0 } },
];

// The paint: one pixel of each class, 4 px apart (beyond a 1 px tolerance): x 0 new only, x 4 old only, x 8 both,
// x 12 paper. Colours pure blue, red, black on white. Fade takes black to grey (0.5: 128) and to the paper (1).
const PAINT_RASTER = { w: 13, h: 1, old: [{ px: [[4, 0], [8, 0]] }], next: [{ px: [[0, 0], [8, 0]] }], radiusPx: 1 };
export const OVERLAY_PAINT_CASES = [
  { id: "overlay-paint-as-drawn", ...PAINT_RASTER, fade: 0, expect: { pixels: "0,0,255|255,0,0|0,0,0|255,255,255" } },
  { id: "overlay-paint-fade-grey", ...PAINT_RASTER, fade: 0.5, expect: { pixels: "0,0,255|255,0,0|128,128,128|255,255,255" } },
  { id: "overlay-paint-fade-hidden", ...PAINT_RASTER, fade: 1, expect: { pixels: "0,0,255|255,0,0|255,255,255|255,255,255" } },
];

// The tolerance on paper, the image placement and the matched points' residual.
export const OVERLAY_NUMBER_CASES = [
  // 0.01 in at 1" = 40' (40/72 ft per pt) is 0.01 × 72 × 40/72 = 0.4 ft; at 1" = 20', 0.2 ft.
  { id: "overlay-tolerance-feet-40", kind: "feet", inches: 0.01, feetPerPt: 40 / 72, expect: { value: 0.4 } },
  { id: "overlay-tolerance-feet-20", kind: "feet", inches: 0.01, feetPerPt: 20 / 72, expect: { value: 0.2 } },
  // 0.05 in on a 36 in sheet at 2048 px: 0.05 × 2048 / 36 = 2.8444… px.
  { id: "overlay-tolerance-px", kind: "px", inches: 0.05, rasterPx: 2048, pagePt: 2592, expect: { value: (0.05 * 2048) / 36 } },
  // Base image 2592 × 1728 px of a 2592 × 1728 pt page (1 px per pt); overlay image 1296 × 864 px of the same page
  // size (2 pt per px); matrix a translation of (10, 20) pt: the overlay's pixels go ×2 then (10, 20).
  {
    id: "overlay-image-transform",
    kind: "transform",
    matrix: { a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 },
    base: { widthPx: 2592, heightPx: 1728, widthPt: 2592, heightPt: 1728 },
    over: { widthPx: 1296, heightPx: 864, widthPt: 2592, heightPt: 1728 },
    expect: { value: "2,0,0,2,10,20" },
  },
  // Two pairs on two 1000 × 500 pt sheets, each landing (3, 4) pt off under the matrix: the RMS is 5 pt.
  {
    id: "overlay-residual",
    kind: "residual",
    pairs: [
      { source: [0.1, 0.1], target: [0.1, 0.1] },
      { source: [0.5, 0.8], target: [0.5, 0.8] },
    ],
    matrix: { a: 1, b: 0, c: 0, d: 1, e: 3, f: 4 },
    size: { w: 1000, h: 500 },
    expect: { value: 5 },
  },
  // Zoom recompute (task 9, D-1262): lib/takeoff/overlay/zoomView.ts. Answers as "x,y,outW,outH,factor,radiusPx".
  // Zoomed in: 400 × 300 pt seen at (1000, 500) of a 2592 × 1728 pt sheet, 2 device px per pt (the bucket 2^(4/4) = 2),
  // 0.01 in. The 12 % margin: 952..1448 by 464..836 (496 × 372 pt), 992 × 744 px; one px per 0.01 in wants 1.389 px/pt,
  // under 2, so factor 1; the tolerance 0.01 × 72 × 2 = 1.44 px.
  { id: "overlay-zoom-plan-in", kind: "zoomPlan", visible: { x: 1000, y: 500, w: 400, h: 300 }, pagePt: { w: 2592, h: 1728 }, screen: 2, inches: 0.01, coarse: 2048 / 2592, expect: { value: "952,464,992,744,1,1.44" } },
  // At fit: the whole sheet at 0.3 px/pt, bucket 2^(-6/4) = 0.35355. 917 × 611 px whole; 1.389 / 0.35355 × 0.9 = 3.54,
  // factor 4 = 8,964,592 px over the 8 M cap, so 3 (5,042,583). Kept on the page: 916 × 610 (floor 2592 × 0.35355 =
  // 916.4). Worked at 1.0607 px/pt, 0.01 in is 0.76 px: the floor of 1 px.
  { id: "overlay-zoom-plan-fit", kind: "zoomPlan", visible: { x: 0, y: 0, w: 2592, h: 1728 }, pagePt: { w: 2592, h: 1728 }, screen: 0.3, inches: 0.01, coarse: 2048 / 2592, expect: { value: "0,0,916,610,3,1" } },
  // No sharper than the fit image: 0.25 px/pt (bucket 0.25) at 0.25 in wants 0.056 px/pt, factor 1; 0.25 ≤ 0.79 × 1.1.
  { id: "overlay-zoom-plan-none", kind: "zoomPlan", visible: { x: 0, y: 0, w: 2592, h: 1728 }, pagePt: { w: 2592, h: 1728 }, screen: 0.25, inches: 0.25, coarse: 2048 / 2592, expect: { value: "none" } },
  // The overlay's PDF into the area: matrix a shift (10, 20), the area at (100, 50) at 2 px/pt: 2 × (10 − 100) = −180,
  // 2 × (20 − 50) = −60.
  { id: "overlay-zoom-transform-shift", kind: "regionTransform", rect: { x: 100, y: 50, w: 10, h: 10 }, scale: 2, ptPerUnit: 1, matrix: { a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 }, expect: { value: "2,0,0,2,-180,-60" } },
  // A quarter turn and 0.5 pt per viewport unit: M after K is (0, 0.5, −0.5, 0, 500, 0); then the area: (0, 1, −1, 0,
  // 2 × (500 − 100), 2 × (0 − 50)).
  { id: "overlay-zoom-transform-turn", kind: "regionTransform", rect: { x: 100, y: 50, w: 10, h: 10 }, scale: 2, ptPerUnit: 0.5, matrix: { a: 0, b: 1, c: -1, d: 0, e: 500, f: 0 }, expect: { value: "0,1,-1,0,800,-100" } },
  // Painted down 2 × 2 to 1 px: a block holding one added pixel (new ink only at (0, 0), 2 px from the old ink at
  // (2, 0)) is pure blue, the change kept in full colour; a block of two unchanged black pixels and two of paper is
  // their average, 127.5 → 128 grey.
  { id: "overlay-zoom-paint-down", kind: "paintDown", w: 4, h: 2, old: [{ px: [[2, 0], [3, 0]] }], next: [{ px: [[0, 0], [2, 0], [3, 0]] }], radiusPx: 1, factor: 2, expect: { value: "0,0,255|128,128,128" } },
];

export const OVERLAY_CASES = [...OVERLAY_MASK_CASES, ...OVERLAY_PAINT_CASES, ...OVERLAY_NUMBER_CASES];

/** In the page: the app's difference on each row. */
export async function runOverlay([masks, paints, numbers]) {
  const d = await import("/src/lib/takeoff/overlay/difference.ts");
  const mf = await import("/src/lib/takeoff/overlay/matchFit.ts");
  const zv = await import("/src/lib/takeoff/overlay/zoomView.ts");
  const raster = (w, h, marks) => {
    const data = new Uint8ClampedArray(w * h * 4).fill(255);
    for (const m of marks) {
      const pixels = m.row ? Array.from({ length: m.row.x1 - m.row.x0 + 1 }, (_, k) => [m.row.x0 + k, m.row.y]) : m.px;
      for (const [x, y] of pixels) {
        const i = (y * w + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = m.lum ?? 0;
        data[i + 3] = m.alpha ?? 255;
      }
    }
    return { width: w, height: h, data };
  };
  const radiusOf = (c) => (c.tol ? d.toleranceRadiusPx(c.tol.inches, c.tol.rasterPx, c.tol.pagePt) : c.radiusPx);
  const colours = { added: [0, 0, 255], removed: [255, 0, 0], unchanged: [0, 0, 0], paper: [255, 255, 255] };
  return {
    masks: masks.map((c) => {
      const r = radiusOf(c);
      const diff = d.differenceOf(raster(c.w, c.h, c.old), raster(c.w, c.h, c.next), r);
      return { radiusPx: r, ...d.countChanges(diff.classes) };
    }),
    paints: paints.map((c) => {
      const diff = d.differenceOf(raster(c.w, c.h, c.old), raster(c.w, c.h, c.next), c.radiusPx);
      const rgba = d.paintChanges(diff, colours, c.fade);
      return { pixels: [0, 4, 8, 12].map((x) => `${rgba[x * 4]},${rgba[x * 4 + 1]},${rgba[x * 4 + 2]}`).join("|") };
    }),
    numbers: numbers.map((c) => {
      if (c.kind === "feet") return { value: d.toleranceFeet(c.inches, c.feetPerPt) };
      if (c.kind === "px") return { value: d.toleranceRadiusPx(c.inches, c.rasterPx, c.pagePt) };
      if (c.kind === "transform") return { value: d.imageTransform(c.matrix, c.base, c.over).map((v) => Math.round(v * 1e9) / 1e9).join(",") };
      if (c.kind === "residual") return { value: mf.placementResidualPt(c.pairs, c.matrix, c.size, c.size) };
      const r4 = (v) => Math.round(v * 1e4) / 1e4;
      if (c.kind === "zoomPlan") {
        const p = zv.planSharp({ visible: c.visible, pagePt: c.pagePt, screenPxPerPt: c.screen, toleranceIn: c.inches, coarsePxPerPt: c.coarse });
        return { value: p ? [r4(p.rect.x), r4(p.rect.y), p.outWidth, p.outHeight, p.factor, r4(p.radiusPx)].join(",") : "none" };
      }
      if (c.kind === "regionTransform") return { value: zv.regionTransform(c.rect, c.scale, c.ptPerUnit, c.matrix).map((v) => r4(v) + 0).join(",") };
      if (c.kind === "paintDown") {
        const diff = d.differenceOf(raster(c.w, c.h, c.old), raster(c.w, c.h, c.next), c.radiusPx);
        const rgba = d.paintChangesDown(diff, colours, 0, c.factor);
        const out = [];
        for (let i = 0; i < rgba.length; i += 4) out.push(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`);
        return { value: out.join("|") };
      }
      return { error: c.kind };
    }),
  };
}

/** Each named field against the hand-worked answer (numbers to `close`). */
export function checkOverlay(got, close, wrong) {
  for (const [list, results] of [[OVERLAY_MASK_CASES, got?.masks], [OVERLAY_PAINT_CASES, got?.paints], [OVERLAY_NUMBER_CASES, got?.numbers]]) {
    for (const [i, c] of list.entries()) {
      for (const [field, want] of Object.entries(c.expect)) {
        const value = results?.[i]?.[field];
        const ok = typeof want === "number" ? typeof value === "number" && close(value, want) : value === want;
        if (!ok) wrong.push(`${c.id}.${field}: ${JSON.stringify(value)}, expected ${JSON.stringify(want)}`);
      }
    }
  }
}

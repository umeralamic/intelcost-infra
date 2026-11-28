// Sheet viewports (D-1412, viewports Run A; spec docs/tasks/viewports_spec.md): which viewport each shape takes, whether
// it crosses a box edge, and the item's quantity with each shape at its own scale, on both engines (the api's
// app/features/takeoff/viewport.py through drives/qt-viewports-d1412.py, the app's src/lib/takeoff/viewports.ts here),
// each against the answer worked by hand.
//
// The sheet: 1440 x 720 pt (20 in x 10 in), so 0.1 across = 144 pt = 2 in and 0.1 down = 72 pt = 1 in.
// Its scale 1" = 30' (30/72 ft per pt). Viewports:
// - D "Detail A" [0.5, 0.1, 0.9, 0.9] at 1" = 10' (10/72);
// - N "Detail B" [0.6, 0.5, 0.8, 0.8], fully inside D, at 1" = 5' (5/72): inside it, it wins;
// - U "Section C" [0.05, 0.6, 0.3, 0.9], no scale yet: its shapes read the sheet scale.
// Every figure below is inches on paper times feet per inch.

const PAGE = [1440, 720];
const SHEET = 30 / 72;
const D = { uuid: "vp-d", name: "Detail A", box: [0.5, 0.1, 0.9, 0.9], fpp: 10 / 72 };
const N = { uuid: "vp-n", name: "Detail B", box: [0.6, 0.5, 0.8, 0.8], fpp: 5 / 72 };
const U = { uuid: "vp-u", name: "Section C", box: [0.05, 0.6, 0.3, 0.9], fpp: null };
const ALL = [D, N, U];
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

const OUTSIDE = { vertices: [[0.1, 0.1], [0.3, 0.1]] }; // 4 in
const IN_D = { vertices: [[0.55, 0.2], [0.85, 0.2]] }; // 6 in
const IN_N = { vertices: [[0.65, 0.6], [0.75, 0.6]] }; // 2 in
const ACROSS_D = { vertices: [[0.4, 0.3], [0.6, 0.3]] }; // 4 in, half outside D

export const VIEWPORT_CASES = [
  // Plain shapes: each in its own place, at its own scale.
  { id: "vp-line-sheet", note: "outside every box: 4 in at 1\" = 30' = 120 LF", type: "lf", shapes: [OUTSIDE], expect: { quantity: 120, stale: false, places: [[null, null]] } },
  { id: "vp-line-detail", note: "inside Detail A: 6 in at 1\" = 10' = 60 LF", type: "lf", shapes: [IN_D], expect: { quantity: 60, stale: false, places: [["vp-d", null]] } },
  { id: "vp-line-nested", note: "inside Detail B, inside Detail A: the inner wins, 2 in at 1\" = 5' = 10 LF", type: "lf", shapes: [IN_N], expect: { quantity: 10, stale: false, places: [["vp-n", null]] } },
  { id: "vp-line-unscaled-box", note: "inside Section C, no scale yet: the sheet's, 2 in at 1\" = 30' = 60 LF", type: "lf", shapes: [{ vertices: [[0.1, 0.7], [0.2, 0.7]] }], expect: { quantity: 60, stale: false, places: [["vp-u", null]] } },
  { id: "vp-line-mixed", note: "the four lines of one item: 120 + 60 + 10 + 60 = 250 LF", type: "lf", shapes: [OUTSIDE, IN_D, IN_N, { vertices: [[0.1, 0.7], [0.2, 0.7]] }], expect: { quantity: 250, stale: false, places: [[null, null], ["vp-d", null], ["vp-n", null], ["vp-u", null]] } },
  // Crossing shapes: flagged, never split, measured at the sheet scale.
  { id: "vp-cross-edge", note: "half in Detail A: crosses, 4 in at the sheet's 1\" = 30' = 120 LF", type: "lf", shapes: [ACROSS_D], expect: { quantity: 120, stale: false, places: [[null, "crosses"]] } },
  { id: "vp-cross-nested", note: "in Detail A, reaching into Detail B: crosses, 3 in at 1\" = 30' = 90 LF", type: "lf", shapes: [{ vertices: [[0.55, 0.6], [0.7, 0.6]] }], expect: { quantity: 90, stale: false, places: [["vp-d", "crosses"]] } },
  { id: "vp-cross-through", note: "both ends in Detail A outside Detail B, the line through B: crosses, 6 in at 1\" = 30' = 180 LF", type: "lf", shapes: [{ vertices: [[0.55, 0.55], [0.85, 0.55]] }], expect: { quantity: 180, stale: false, places: [["vp-d", "crosses"]] } },
  { id: "vp-cross-encloses", note: "an area in Detail A holding all of Detail B: crosses, 6 in x 4 in at 1\" = 30' = 180 x 120 = 21,600 SF", type: "sf", shapes: [{ vertices: rect(0.55, 0.45, 0.85, 0.85) }], expect: { quantity: 21600, stale: false, places: [["vp-d", "crosses"]] } },
  { id: "vp-cross-arc", note: "a half circle r 1 in across Detail A's left edge: crosses, pi x 1 in at 1\" = 30' = 30 pi LF", type: "lf", shapes: [{ vertices: [[0.55, 0.3], [0.5, 0.4], [0.45, 0.3]], meta: { kind: "arc", cx: 0.5, cy: 0.3, rx: 0.05, ry: 0.1, a0: 0, sweep: Math.PI } }], expect: { quantity: 30 * Math.PI, stale: false, places: [[null, "crosses"]] } },
  { id: "vp-touch-arc", note: "a half circle r 1 in touching Detail A's edge only at its ends: not crossing, 30 pi LF", type: "lf", shapes: [{ vertices: [[0.5, 0.4], [0.45, 0.3], [0.5, 0.2]], meta: { kind: "arc", cx: 0.5, cy: 0.3, rx: 0.05, ry: 0.1, a0: Math.PI / 2, sweep: Math.PI } }], expect: { quantity: 30 * Math.PI, stale: false, places: [[null, null]] } },
  // Areas, deducts, curves and counts.
  { id: "vp-area-deduct", note: "Detail A: 4 in x 2 in = 40 x 20 = 800 SF less 1 in x 0.5 in = 10 x 5 = 50 SF: 750 SF", type: "sf", shapes: [{ vertices: rect(0.55, 0.15, 0.75, 0.35) }, { vertices: rect(0.6, 0.2, 0.65, 0.25), role: "subtract" }], expect: { quantity: 750, stale: false, places: [["vp-d", null], ["vp-d", null]] } },
  { id: "vp-deduct-apart", note: "a section outside (4 x 2 in = 120 x 60 = 7,200 SF), its deduct in Detail A: apart, subtracts nothing", type: "sf", shapes: [{ vertices: rect(0.1, 0.1, 0.3, 0.3) }, { vertices: rect(0.6, 0.2, 0.65, 0.25), role: "subtract" }], expect: { quantity: 7200, stale: false, places: [[null, null], ["vp-d", null]], apart: [1] } },
  { id: "vp-circle-detail", note: "a circle r 1 in in Detail A: r 10 ft, 100 pi SF", type: "sf", shapes: [{ vertices: [], meta: { kind: "ellipse", cx: 0.7, cy: 0.3, rx: 0.05, ry: 0.1 } }], expect: { quantity: 100 * Math.PI, stale: false, places: [["vp-d", null]] } },
  { id: "vp-count-detail", note: "three marks in Detail A: 3 EA", type: "count", shapes: [{ vertices: [[0.6, 0.2], [0.7, 0.3], [0.85, 0.4]] }], expect: { quantity: 3, stale: false, places: [["vp-d", null]] } },
  { id: "vp-count-split", note: "marks in and out of Detail A: no shared viewport, never crossing, 3 EA", type: "count", shapes: [{ vertices: [[0.6, 0.2], [0.1, 0.1], [0.85, 0.4]] }], expect: { quantity: 3, stale: false, places: [[null, null]] } },
  // A sheet with viewports and no sheet scale: outside every scaled box, nothing, and stale.
  { id: "vp-no-sheet-scale", note: "no sheet scale: the outside line adds 0, the one in Detail A 60 LF; stale", sheetFpp: null, type: "lf", shapes: [OUTSIDE, IN_D], expect: { quantity: 60, stale: true, places: [[null, null], ["vp-d", null]] } },
  { id: "vp-no-sheet-scale-cross", note: "no sheet scale: a crossing line adds 0; stale", sheetFpp: null, type: "lf", shapes: [ACROSS_D], expect: { quantity: 0, stale: true, places: [[null, "crosses"]] } },
  // A sheet with no viewport: as today.
  { id: "vp-none", note: "no viewport on the sheet: 4 in at 1\" = 30' = 120 LF, as before", viewports: [], type: "lf", shapes: [OUTSIDE], expect: { quantity: 120, stale: false, places: [[null, null]] } },
].map((c) => ({ page: PAGE, sheetFpp: SHEET, viewports: ALL, ...c }));

// Boxes: a box fully inside another, or holding it, or apart, is kept; a partial overlap or the same box is refused.
export const VIEWPORT_BOX_CASES = [
  { id: "vp-box-nested", name: "Detail E", box: [0.65, 0.2, 0.85, 0.4], refused: false },
  { id: "vp-box-holds", name: "Plan", box: [0.4, 0.05, 0.95, 0.95], refused: false },
  { id: "vp-box-apart", name: "Detail F", box: [0.32, 0.1, 0.45, 0.3], refused: false },
  { id: "vp-box-partial", name: "Detail G", box: [0.4, 0.2, 0.6, 0.4], refused: "Viewports can't partly overlap: move or resize Detail G, or put it fully inside Detail A." },
  { id: "vp-box-same", name: "Detail H", box: [0.6, 0.5, 0.8, 0.8], refused: "Detail H would be the same box as Detail B: move or resize it." },
].map((c) => ({ viewports: ALL, ...c }));

const close = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));

export async function runViewports(page) {
  return page.evaluate(
    async ([cases, boxes]) => {
      const v = await import("/src/lib/takeoff/viewports.ts");
      const vps = (list) => list.map((p) => ({ uuid: p.uuid, name: p.name, box: p.box, feetPerPt: p.fpp }));
      const rows = cases.map((c) => {
        const frame = { page: { widthPt: c.page[0], heightPt: c.page[1] }, feetPerPt: c.sheetFpp, viewports: vps(c.viewports) };
        const places = c.shapes.map((s) => v.placeShape(c.type, s.vertices, s.meta ?? null, frame.viewports));
        const placed = c.shapes.map((s, i) => ({ sheet: "s", geomType: c.type, vertices: s.vertices, shapeMeta: s.meta ?? null, role: s.role ?? "add", viewportUuid: places[i][0], flag: places[i][1] }));
        const m = v.measureShapes(placed, { s: frame });
        return { places, quantity: m.quantity, unscaled: m.unscaled, apart: m.apart };
      });
      const refusals = boxes.map((b) => v.overlapRefusal(b.name, b.box, vps(b.viewports)) ?? false);
      return { rows, refusals };
    },
    [VIEWPORT_CASES, VIEWPORT_BOX_CASES],
  );
}

export function checkViewports(web, api, wrong) {
  const apiRows = new Map((api?.rows ?? []).map((r) => [r.id, r]));
  const apiBoxes = new Map((api?.boxes ?? []).map((r) => [r.id, r.refused]));
  for (const [i, c] of VIEWPORT_CASES.entries()) {
    const engines = [["browser", web?.rows?.[i]], ["api", apiRows.get(c.id)]];
    for (const [name, got] of engines) {
      if (!got) {
        wrong.push(`${c.id}: no answer from the ${name} engine`);
        continue;
      }
      if (JSON.stringify(got.places) !== JSON.stringify(c.expect.places)) wrong.push(`${c.id} (${name}): places ${JSON.stringify(got.places)}, expected ${JSON.stringify(c.expect.places)}`);
      if (!close(got.quantity, c.expect.quantity)) wrong.push(`${c.id} (${name}): ${got.quantity}, expected ${c.expect.quantity} (${c.note})`);
      if (got.unscaled !== c.expect.stale) wrong.push(`${c.id} (${name}): stale ${got.unscaled}, expected ${c.expect.stale}`);
      if (JSON.stringify(got.apart) !== JSON.stringify(c.expect.apart ?? [])) wrong.push(`${c.id} (${name}): apart ${JSON.stringify(got.apart)}, expected ${JSON.stringify(c.expect.apart ?? [])}`);
    }
    const [w, a] = [web?.rows?.[i], apiRows.get(c.id)];
    if (w && a && !(Math.abs(w.quantity - a.quantity) <= 1e-9 * Math.max(1, Math.abs(a.quantity)))) wrong.push(`${c.id}: the engines differ, browser ${w.quantity}, api ${a.quantity}`);
  }
  for (const [i, c] of VIEWPORT_BOX_CASES.entries()) {
    for (const [name, got] of [["browser", web?.refusals?.[i]], ["api", apiBoxes.get(c.id)]]) {
      if (got !== c.refused) wrong.push(`${c.id} (${name}): ${JSON.stringify(got)}, expected ${JSON.stringify(c.refused)}`);
    }
  }
}

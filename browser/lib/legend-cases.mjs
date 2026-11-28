// Legend rows (D-1405, the founder's D-1404 item 3: "legends must show every takeoff item on the sheet"). One sheet
// with every kind drawn on it goes through the app's own `legendRows` (src/lib/takeoff/legend.ts), the function the
// card shows; each kind must get its row, in its group, with its quantity.
//
// The sheet: a page 1000 x 500 pt at 0.5 ft per point, so x spans 500 ft and y 250 ft.
// - Its own rows, as the api lists them (one per item with a shape here, any kind): a line, an area net of its deduct,
//   a count, a utility run (LF) and structure (count), a Site Feature, the sheet's contour and work boundary, an item
//   resumed from another sheet. Passed through as they are.
// - A Site Prep strip: the square 0.1 x 0.1 of the page = 50 ft x 25 ft = 1,250 SF.
// - A strip with a hole: outer 0.2 x 0.2 (100 x 50 = 5,000 SF), hole 0.05 x 0.05 (25 x 12.5 = 312.5 SF) run the other
//   way, as polygon-clipping gives them: 5,000 - 312.5 = 4,687.5 SF.
// - Linked sheet "V-1" draws its existing-grade contour item here (its own 840 LF), linked sheet "C-3" its markups:
//   a line (120.5 LF) and a count (7 EA); "C-3" listed twice (EG and markups) shows each item once.
// - On an unscaled sheet a strip's area is "—" (null); a linked item keeps its own sheet's quantity.

const OWN = [
  ["line", "Line", "lf", "LF", 118.85],
  ["area", "Area less deduct", "sf", "SF", 11562.41],
  ["count", "Count", "count", "EA", 3],
  ["run", "12in pipe run", "lf", "LF", 231.14],
  ["structure", "Manhole", "count", "EA", 1],
  ["feature", "Building Pad", "sf", "SF", 14831.2],
  ["contour", "Proposed Grade", "contour", "LF", 14167.87],
  ["boundary", "Work Boundary", "boundary", "SF", 196696.85],
  ["resumed", "Resumed from C-100", "lf", "LF", 99.34],
].map(([uuid, name, type, unit, quantity]) => ({ key: uuid, uuid, name, color: "#336699", type, unit, quantity, folderUuid: null, countSymbol: null }));

const SQUARE = [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2], [0.1, 0.2]].map(([x, y]) => ({ x, y }));
const OUTER = [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]].map(([x, y]) => ({ x, y }));
const HOLE = [[0.45, 0.45], [0.45, 0.5], [0.5, 0.5], [0.5, 0.45]].map(([x, y]) => ({ x, y }));
const STRIPS = [
  { id: "s1", name: "Strip square", color: "#6b8e23", rings: [SQUARE] },
  { id: "s2", name: "Strip with hole", color: "#6b8e23", rings: [OUTER, HOLE] },
];
const SHEETS = {
  v1: [{ uuid: "eg", name: "Existing Grade", color: "#884400", type: "contour", unit: "LF", quantity: 840 }],
  c3: [
    { uuid: "c3line", name: "Water line", color: "#0044aa", type: "lf", unit: "LF", quantity: 120.5 },
    { uuid: "c3count", name: "Valve", color: "#0044aa", type: "count", unit: "EA", quantity: 7 },
  ],
};
const LINKED = [
  { sheet: "v1", sheetName: "V-1", items: ["eg"] },
  { sheet: "c3", sheetName: "C-3", items: ["c3line", "c3count"] },
  { sheet: "c3", sheetName: "C-3", items: ["c3line"] },
];
const FRAME = { feetPerPt: 0.5, widthPt: 1000, heightPt: 500 };

const ownExpect = Object.fromEntries(OWN.map((r) => [r.uuid, { group: null, quantity: r.quantity }]));

export const LEGEND_CASES = [
  {
    id: "legend-every-kind",
    input: { own: OWN, strips: STRIPS, frame: FRAME, linked: LINKED },
    expect: {
      count: OWN.length + 2 + 3,
      rows: {
        ...ownExpect,
        "strip:s1": { group: "site-prep", quantity: 1250, unit: "SF" },
        "strip:s2": { group: "site-prep", quantity: 4687.5, unit: "SF" },
        "eg@v1": { group: "other-sheets", quantity: 840, name: "Existing Grade · V-1" },
        "c3line@c3": { group: "other-sheets", quantity: 120.5, name: "Water line · C-3" },
        "c3count@c3": { group: "other-sheets", quantity: 7, name: "Valve · C-3" },
      },
    },
  },
  {
    id: "legend-unscaled-sheet",
    input: { own: OWN.filter((r) => r.type === "count"), strips: STRIPS.slice(0, 1), frame: null, linked: LINKED.slice(1, 2) },
    expect: {
      count: 2 + 1 + 2,
      rows: {
        count: { group: null, quantity: 3 },
        structure: { group: null, quantity: 1 },
        "strip:s1": { group: "site-prep", quantity: null },
        "c3line@c3": { group: "other-sheets", quantity: 120.5 },
        "c3count@c3": { group: "other-sheets", quantity: 7 },
      },
    },
  },
];

export async function runLegend(page) {
  return page.evaluate(
    async ([cases, sheets]) => {
      const lg = await import("/src/lib/takeoff/legend.ts");
      return cases.map((c) => {
        try {
          const rows = lg.legendRows({ ...c.input, rowsOfSheet: (s) => sheets[s] });
          return { rows: rows.map((r) => ({ key: r.key, group: r.group ?? null, quantity: r.quantity, unit: r.unit, name: r.name })) };
        } catch (error) {
          return { error: String(error?.message ?? error) };
        }
      });
    },
    [LEGEND_CASES, SHEETS],
  );
}

export function checkLegend(answers, wrong) {
  for (const [i, c] of LEGEND_CASES.entries()) {
    const got = answers?.[i];
    if (!got || got.error) {
      wrong.push(`${c.id}: ${got?.error ?? "no answer"}`);
      continue;
    }
    if (got.rows.length !== c.expect.count) wrong.push(`${c.id}: ${got.rows.length} rows, expected ${c.expect.count}`);
    for (const [key, want] of Object.entries(c.expect.rows)) {
      const row = got.rows.find((r) => r.key === key);
      if (!row) {
        wrong.push(`${c.id}: no row ${key}`);
        continue;
      }
      for (const [field, value] of Object.entries(want)) {
        const have = row[field];
        const ok = typeof value === "number" ? typeof have === "number" && Math.abs(have - value) < 1e-6 : have === value;
        if (!ok) wrong.push(`${c.id}.${key}.${field}: ${JSON.stringify(have)}, expected ${JSON.stringify(value)}`);
      }
    }
  }
}

// The raster text check's test sheet (D-708): one 36 × 24 in page holding the two kinds of text the
// low-zoom fault was seen on. Made on the spot; never client data.
//
//   CAD   thin CAD stroke text: letters drawn as 0.65 pt strokes (the measured width on the CCCP notes),
//         7 pt high, the letters the fault turned into one another (S B G 8 6) among others
//   SPEC  dense spec text: Helvetica 5.7 pt on a 6.8 pt leading (the A010.3 specifications' size)
//
// `CROPS` are the 100 × 40 pt areas the check reads, as fractions of the page (top-left origin).

export const PAGE = { width: 2592, height: 1728 };

// A stroke font on a 4 × 6 grid (x right, y up): each letter a list of polylines.
const GLYPHS = {
  S: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3], [3, 3], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]],
  B: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]], [[3, 3], [4, 2], [4, 1], [3, 0], [0, 0]]],
  G: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 3], [2, 3]]],
  8: [[[1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3]]],
  6: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]],
  L: [[[0, 6], [0, 0], [4, 0]]],
  U: [[[0, 6], [0, 1], [1, 0], [3, 0], [4, 1], [4, 6]]],
  M: [[[0, 0], [0, 6], [2, 3], [4, 6], [4, 0]]],
  P: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  A: [[[0, 0], [0, 4], [2, 6], [4, 4], [4, 0]], [[0, 3], [4, 3]]],
  E: [[[4, 6], [0, 6], [0, 0], [4, 0]], [[0, 3], [3, 3]]],
  C: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1]]],
  O: [[[1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0]]],
  N: [[[0, 0], [0, 6], [4, 0], [4, 6]]],
  R: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]], [[2, 3], [4, 0]]],
  T: [[[0, 6], [4, 6]], [[2, 6], [2, 0]]],
  D: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 1], [3, 0], [0, 0]]],
  I: [[[1, 6], [3, 6]], [[2, 6], [2, 0]], [[1, 0], [3, 0]]],
  "3": [[[0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [2, 3]], [[3, 3], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]],
  "0": [[[1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0]]],
  "5": [[[4, 6], [0, 6], [0, 3], [3, 3], [4, 2], [4, 1], [3, 0], [0, 0]]],
  ".": [[[2, 0], [2, 0.4]]],
};

const CAD_LINES = [
  "SLUMP SHALL BE 3 IN 5 IN",
  "BEG 86 SB G8 6S B8 G6",
  "CONCRETE SHALL BE PLACED",
  "GRADE 60 REBAR SPACING 8",
  "BASE SHALL BE COMPACTED",
];
const SPEC_LINES = [
  "1.01 SUMMARY A. Section includes cold-formed metal framing, with anchorage and bracing.",
  "B. Related Requirements: Section 054000 Cold-Formed Metal Framing for exterior walls.",
  "1.02 SUBMITTALS A. Product Data: for each type of product, including installation details.",
  "B. Shop Drawings: show layout, spacings, sizes, thicknesses and types of framing members.",
  "1.03 QUALITY ASSURANCE A. Installer Qualifications: an employer of workers trained and",
  "approved by the manufacturer, who employs only persons trained and certified by it.",
  "2.01 MATERIALS A. Steel sheet: ASTM A1003, structural grade 33 (230), type H, G60 coating.",
  "B. Fasteners: corrosion-resistant self-drilling, self-tapping steel drill screws, ASTM C1513.",
  "3.01 EXECUTION A. Examine supporting substrates and abutting structural framing for compliance.",
  "B. Proceed with installation only after unsatisfactory conditions have been corrected.",
  "C. Install framing members in one-piece lengths unless splice connections are indicated.",
  "D. Fasten each member at each end with the fasteners indicated on the shop drawings.",
];

const CAD_AT = { x: 600, top: 400 }; // pt from the page's left and top
const SPEC_AT = { x: 1400, top: 400 };
const CAP = 7; // pt, a CAD letter's height
const PITCH = 6.2; // pt from one CAD letter to the next
// As dense as the CCCP general notes (ink 33 of 255 in a 100 × 40 pt area at 100%).
const LEADING_CAD = 18;
const SPEC_SIZE = 5.7;
const LEADING_SPEC = 6.8;

/** The two areas the check reads: 100 × 40 pt, as fractions of the page. */
export const CROPS = {
  cad: { x: CAD_AT.x / PAGE.width, y: (CAD_AT.top - 10) / PAGE.height, wPt: 100, hPt: 40 },
  spec: { x: SPEC_AT.x / PAGE.width, y: (SPEC_AT.top - 8) / PAGE.height, wPt: 100, hPt: 40 },
};

const n = (x) => Number(x.toFixed(3));

function cadText() {
  const ops = ["0 0 0 RG 0.65 w 1 J 1 j"];
  CAD_LINES.forEach((text, row) => {
    const baseline = PAGE.height - (CAD_AT.top + row * LEADING_CAD);
    [...text].forEach((ch, i) => {
      for (const line of GLYPHS[ch] ?? []) {
        const pts = line.map(([gx, gy]) => [CAD_AT.x + i * PITCH + (gx * CAP) / 6, baseline + (gy * CAP) / 6]);
        ops.push(`${n(pts[0][0])} ${n(pts[0][1])} m ${pts.slice(1).map(([x, y]) => `${n(x)} ${n(y)} l`).join(" ")} S`);
      }
    });
  });
  return ops.join("\n");
}

function specText() {
  const esc = (s) => s.replace(/[()\\]/g, (c) => `\\${c}`);
  const ops = ["BT", `/F1 ${SPEC_SIZE} Tf`, `${LEADING_SPEC} TL`, `${SPEC_AT.x} ${n(PAGE.height - SPEC_AT.top)} Td`];
  for (const line of SPEC_LINES) ops.push(`(${esc(line)}) Tj T*`);
  ops.push("ET");
  return ops.join("\n");
}

/** The sheet as PDF bytes. */
export function makeRasterTextPdf() {
  const body = `${cadText()}\n${specText()}\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(body, "latin1")} >>\nstream\n${body}endstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets = objects.map((obj, i) => {
    const at = Buffer.byteLength(out, "latin1");
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    return at;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

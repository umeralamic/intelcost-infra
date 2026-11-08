// The canvas position check's test sheets (M6, D-689): one PDF, four pages, each a grid of labelled
// reference crosses at known fractions of the page as it is shown, in the four page layouts a sheet
// arrives in. Made on the spot; never client data.
//
//   L  landscape 36 × 24 in (2592 × 1728 pt)
//   P  portrait 24 × 36 in (1728 × 2592 pt)
//   R  landscape stored as a portrait page turned by /Rotate 90 (MediaBox 1728 × 2592)
//   C  landscape 36 × 24 in shown through a CropBox offset inside a larger MediaBox
//
// Every cross is drawn so that, on the page as shown (top-left origin, the CropBox when there is one,
// /Rotate applied), its centre is exactly at (u × width, v × height). `REFS` lists them.

export const FRACTIONS = [0.05, 0.25, 0.5, 0.75, 0.95];
export const REFS = FRACTIONS.flatMap((v) => FRACTIONS.map((u) => ({ u, v, label: `${u * 100},${v * 100}` })));

// The CropBox of page C inside its MediaBox, in points: offset unequally on each side on purpose.
const CROP = { x0: 200, y0: 120, w: 2592, h: 1728, mediaW: 2880, mediaH: 2016 };

export const SHEETS = [
  { key: "L", name: "POS-L landscape 36x24", width: 2592, height: 1728 },
  { key: "P", name: "POS-P portrait 24x36", width: 1728, height: 2592 },
  { key: "R", name: "POS-R landscape as Rotate 90", width: 2592, height: 1728, rotate: 90 },
  { key: "C", name: "POS-C landscape CropBox offset", width: 2592, height: 1728, crop: CROP },
];

const n = (x) => Number(x.toFixed(3));

/** One page's content stream: crosses and labels at the shown page's fractions. */
function content(sheet) {
  const { width: W, height: H } = sheet;
  // Shown (X, Y), top-left origin, to PDF user space.
  const user = sheet.rotate === 90
    ? (X, Y) => [Y, X] // /Rotate 90 turns the stored page clockwise: shown (X, Y) is stored (Y, X)
    : sheet.crop
      ? (X, Y) => [sheet.crop.x0 + X, sheet.crop.y0 + sheet.crop.h - Y]
      : (X, Y) => [X, H - Y];
  // Text upright as shown: turned a quarter anticlockwise on a /Rotate 90 page.
  const tm = (x, y) => (sheet.rotate === 90 ? `0 1 -1 0 ${n(x)} ${n(y)} Tm` : `1 0 0 1 ${n(x)} ${n(y)} Tm`);
  const out = [];
  const line = (a, b) => {
    const [x1, y1] = user(...a);
    const [x2, y2] = user(...b);
    out.push(`${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`);
  };
  const text = (X, Y, size, s) => {
    const [x, y] = user(X, Y);
    out.push(`BT /F1 ${size} Tf ${tm(x, y)} (${s}) Tj ET`);
  };
  // The shown page's border, 1 pt inside its edge, and its name.
  out.push("1 w");
  line([1, 1], [W - 1, 1]);
  line([W - 1, 1], [W - 1, H - 1]);
  line([W - 1, H - 1], [1, H - 1]);
  line([1, H - 1], [1, 1]);
  text(W * 0.3, H * 0.13, 48, `${sheet.name}  ${W} x ${H} pt shown`);
  // Each reference: a cross 120 pt across in hairlines (one device pixel at any zoom), so even at Fit
  // its arms run clear of the ring; a ring 12 pt across; its label "u,v" in percent, well up and right.
  for (const { u, v, label } of REFS) {
    const X = u * W;
    const Y = v * H;
    out.push("0 w");
    line([X - 60, Y], [X + 60, Y]);
    line([X, Y - 60], [X, Y + 60]);
    out.push("0.5 w");
    const r = 6;
    const k = 0.5523 * r;
    const [cx, cy] = user(X, Y);
    out.push(
      `${n(cx + r)} ${n(cy)} m ${n(cx + r)} ${n(cy + k)} ${n(cx + k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)} c ` +
        `${n(cx - k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + k)} ${n(cx - r)} ${n(cy)} c ` +
        `${n(cx - r)} ${n(cy - k)} ${n(cx - k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)} c ` +
        `${n(cx + k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - k)} ${n(cx + r)} ${n(cy)} c S`,
    );
    text(X + 24, Y - 24, 14, label);
  }
  // Page C: a solid band in the MediaBox outside the CropBox, which must never be shown.
  if (sheet.crop) {
    const c = sheet.crop;
    out.push(`0.85 0.1 0.1 rg 0 0 ${c.mediaW} ${c.y0 - 2} re f 0 0 ${c.x0 - 2} ${c.mediaH} re f 0 0 0 rg`);
  }
  return out.join("\n") + "\n";
}

/** The PDF: one page per entry of `SHEETS`, hand-assembled with a correct cross-reference table. */
export function makePositionPdf(sheets = SHEETS) {
  const objects = [];
  const add = (body) => objects.push(body) && objects.length;
  const catalog = add(null);
  const tree = add(null);
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const kids = [];
  for (const sheet of sheets) {
    const body = content(sheet);
    const stream = add(`<< /Length ${Buffer.byteLength(body, "latin1")} >>\nstream\n${body}endstream`);
    const media = sheet.rotate === 90 ? [sheet.height, sheet.width] : sheet.crop ? [sheet.crop.mediaW, sheet.crop.mediaH] : [sheet.width, sheet.height];
    const crop = sheet.crop ? ` /CropBox [${sheet.crop.x0} ${sheet.crop.y0} ${sheet.crop.x0 + sheet.crop.w} ${sheet.crop.y0 + sheet.crop.h}]` : "";
    const rotate = sheet.rotate ? ` /Rotate ${sheet.rotate}` : "";
    kids.push(
      add(
        `<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 ${media[0]} ${media[1]}]${crop}${rotate} ` +
          `/Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${stream} 0 R >>`,
      ),
    );
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${tree} 0 R >>`;
  objects[tree - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let out = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => {
    const at = Buffer.byteLength(out, "latin1");
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return at;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

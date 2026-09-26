// Drawings made on the spot for F5's fixtures: real PDFs and PNGs, never client data.
//
// A PDF here is hand-assembled, with a correct cross-reference table, so PyMuPDF and
// pdf.js both open it without repair. Each page carries its label in large type and a
// box, so a thumbnail or a fit image is visibly that page.

import { deflateSync } from "node:zlib";

import { APP, SEEDED, apiCall, expect, signInAs } from "./bench.mjs";
import { folderPaths, seedFile } from "./f4.mjs";

/** A PDF with one page per entry: `{ width, height, label }` in points. */
export function makePdf(pages) {
  const objects = [];
  const add = (body) => objects.push(body) && objects.length;
  const catalog = add(null);
  const tree = add(null);
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const kids = [];
  for (const { width, height, label } of pages) {
    const content =
      `BT /F1 48 Tf 72 ${height - 120} Td (${label}) Tj ET\n` +
      `2 w 72 72 m ${width - 72} 72 l ${width - 72} ${height - 160} l 72 ${height - 160} l h S\n` +
      `0.5 w 72 72 m ${width - 72} ${height - 160} l S\n`;
    const stream = add(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`);
    kids.push(
      add(
        `<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 ${width} ${height}] ` +
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

/** Letter-size pages labelled "{prefix} 1", "{prefix} 2"… */
export const letterPages = (count, prefix = "Page") =>
  Array.from({ length: count }, (_, i) => ({ width: 612, height: 792, label: `${prefix} ${i + 1}` }));

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, tail]);
};

/** A white RGB PNG with a dark border and a diagonal, `width` x `height` pixels. */
export function makePng(width, height) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3, 255);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const edge = x < 4 || y < 4 || x >= width - 4 || y >= height - 4;
      const diagonal = Math.abs(Math.round((x * height) / width) - y) < 2;
      if (edge || diagonal) row.fill(30, 1 + x * 3, 4 + x * 3);
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Upload files into a project through the multipart path, from a signed-in page (the
 * page, not Node, can reach the storage host). `files` is `[{ name, buffer, folder }]`,
 * `folder` a path such as "Plans" or "Plans/Addenda" (made if missing) or null for the
 * root. Returns the uploaded files by name.
 */
export async function uploadAll(page, token, base, projectUuid, files, workspaceUuid) {
  await signInAs(page, SEEDED.email, SEEDED.password);
  await page.selectOption("header select", workspaceUuid).catch(() => {});
  await page.goto(`${APP}/project/${projectUuid}`);
  const out = {};
  for (const { name, buffer, folder, parts } of files) {
    let folderUuid = null;
    if (folder) {
      let paths = await folderPaths(token, base, projectUuid);
      if (!paths.has(folder)) {
        const [parent, leaf] = [folder.split("/").slice(0, -1).join("/"), folder.split("/").at(-1)];
        const made = await apiCall(token, "POST", `${base}/${projectUuid}/folder`, {
          name: leaf,
          parent_uuid: parent ? paths.get(parent).uuid : null,
        });
        expect(made.status === 201, `folder ${folder}: ${made.status} ${JSON.stringify(made.body)}`);
        paths = await folderPaths(token, base, projectUuid);
      }
      folderUuid = paths.get(folder).uuid;
    }
    out[name] = await seedFile(page, token, base, projectUuid, folderUuid, name, buffer, { parts });
  }
  return out;
}

/** Load pages into takeoff: `choices` is `[[projectFileUuid, [pages]]]`. */
export function loadPages(token, base, projectUuid, choices) {
  return apiCall(token, "POST", `${base}/${projectUuid}/drawing/load`, {
    files: choices.map(([uuid, pages]) => ({ project_file_uuid: uuid, pages })),
  });
}

/** The project's sheets, from the api. */
export async function sheetsOf(token, base, projectUuid) {
  const listed = await apiCall(token, "GET", `${base}/${projectUuid}/drawing/sheet`);
  expect(listed.status === 200, `sheets: ${listed.status}`);
  return listed.body;
}

/** Wait until every sheet of `fileUuid` reads ready, or throw naming what did not. */
export async function preparedSheets(token, base, projectUuid, fileUuid, timeout = 90000) {
  const until = Date.now() + timeout;
  for (;;) {
    const mine = (await sheetsOf(token, base, projectUuid)).filter((s) => s.file_uuid === fileUuid);
    if (mine.length && mine.every((s) => s.render_status === "ready")) return mine;
    if (Date.now() > until) {
      throw new Error(`not prepared in ${timeout / 1000} s: ${mine.map((s) => `p${s.page_number} ${s.render_status}`).join(", ")}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

// A workbook read without a spreadsheet library (D-631): an .xlsx is a zip, so its parts are
// found in the zip's central directory and inflated with node's zlib. Enough for a fixture to
// read sheet names, shared strings and a sheet's cells as text; no formulas are evaluated.

import { inflateRawSync } from "node:zlib";

/** The zip's parts by name, as text. */
export function zipParts(buffer) {
  const buf = Buffer.from(buffer);
  let end = buf.length - 22;
  while (end >= 0 && buf.readUInt32LE(end) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error("not a zip: no end of central directory");
  const count = buf.readUInt16LE(end + 10);
  let at = buf.readUInt32LE(end + 16);
  const parts = {};
  for (let i = 0; i < count; i += 1) {
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString("utf8", at + 46, at + 46 + nameLen);
    const dataAt = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataAt, dataAt + size);
    parts[name] = method === 0 ? raw : inflateRawSync(raw);
    at += 46 + nameLen + extraLen + commentLen;
  }
  return parts;
}

const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** The workbook: its sheet names in order, and each sheet's rows as arrays of cell text. */
export function readWorkbook(buffer) {
  const parts = zipParts(buffer);
  const text = (name) => (parts[name] ? parts[name].toString("utf8") : "");
  const shared = [...text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => unescape([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  const names = [...text("xl/workbook.xml").matchAll(/<sheet [^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g)].map((m) => ({ name: unescape(m[1]), rid: m[2] }));
  const rels = Object.fromEntries([...text("xl/_rels/workbook.xml.rels").matchAll(/<Relationship [^>]*Id="([^"]*)"[^>]*Target="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const col = (ref) => [...ref.replace(/\d+/g, "")].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const sheets = names.map(({ name, rid }) => {
    const target = rels[rid] ?? "";
    const xml = text(target.startsWith("/") ? target.slice(1) : `xl/${target}`);
    const rows = [];
    for (const r of xml.matchAll(/<row [^>]*r="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const row = [];
      for (const c of (r[2] ?? "").matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const type = /t="([^"]*)"/.exec(c[2])?.[1];
        const body = c[3] ?? "";
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1];
        row[col(c[1])] = type === "s" ? shared[Number(v)] : type === "inlineStr" ? unescape(inline ?? "") : v === undefined ? "" : unescape(v);
      }
      rows[Number(r[1]) - 1] = row;
    }
    return { name, rows };
  });
  return { sheets, media: Object.keys(parts).filter((p) => p.startsWith("xl/media/")) };
}

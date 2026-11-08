// node archive-zip.mjs <base dir> <list file> <out.zip> (D-1059, archive-old.sh): a zip of every listed file (paths relative to base, UTF-8
// names, deflate), then read back: each entry's CRC and size checked against the file on disk. Exits 1 on any
// mismatch, leaving the originals alone. Zip64 is not written: refuses past 4 GB or 65,535 entries.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [base, listFile, out] = process.argv.slice(2);
const names = fs.readFileSync(listFile, "utf8").split("\n").map((s) => s.replace(/\r$/, "")).filter(Boolean);
if (names.length > 65535) throw new Error("too many entries for a plain zip");
if (fs.existsSync(out)) throw new Error(`${out} exists`);
const fd = fs.openSync(out, "w");
let offset = 0;
const central = [];
const write = (buf) => {
  fs.writeSync(fd, buf);
  offset += buf.length;
};
const dosTime = (d) => {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return [time, date];
};
for (const name of names) {
  const file = path.join(base, name);
  const data = fs.readFileSync(file);
  const crc = zlib.crc32(data) >>> 0;
  const packed = zlib.deflateRawSync(data, { level: 6 });
  const stored = packed.length >= data.length;
  const body = stored ? data : packed;
  const nameBuf = Buffer.from(name.split(path.sep).join("/"), "utf8");
  const [t, d] = dosTime(fs.statSync(file).mtime);
  if (offset + body.length > 0xfffffff0) throw new Error("past 4 GB: zip64 not written");
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(stored ? 0 : 8, 8);
  local.writeUInt16LE(t, 10);
  local.writeUInt16LE(d, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  const at = offset;
  write(local);
  write(nameBuf);
  write(body);
  const c = Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50, 0);
  c.writeUInt16LE(20, 4);
  c.writeUInt16LE(20, 6);
  c.writeUInt16LE(0x0800, 8);
  c.writeUInt16LE(stored ? 0 : 8, 10);
  c.writeUInt16LE(t, 12);
  c.writeUInt16LE(d, 14);
  c.writeUInt32LE(crc, 16);
  c.writeUInt32LE(body.length, 20);
  c.writeUInt32LE(data.length, 24);
  c.writeUInt16LE(nameBuf.length, 28);
  c.writeUInt32LE(at, 42);
  central.push(Buffer.concat([c, nameBuf]));
}
const cdStart = offset;
for (const c of central) write(c);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(central.length, 8);
end.writeUInt16LE(central.length, 10);
end.writeUInt32LE(offset - cdStart, 12);
end.writeUInt32LE(cdStart, 16);
write(end);
fs.closeSync(fd);

// Read back: every entry inflated and checked against the file it came from.
const zip = fs.readFileSync(out);
let p = zip.readUInt32LE(zip.length - 22 + 16);
let ok = 0;
for (let i = 0; i < central.length; i++) {
  const method = zip.readUInt16LE(p + 10);
  const crc = zip.readUInt32LE(p + 16);
  const csize = zip.readUInt32LE(p + 20);
  const nlen = zip.readUInt16LE(p + 28);
  const xlen = zip.readUInt16LE(p + 30);
  const clen = zip.readUInt16LE(p + 32);
  const lo = zip.readUInt32LE(p + 42);
  const name = zip.subarray(p + 46, p + 46 + nlen).toString("utf8");
  const start = lo + 30 + zip.readUInt16LE(lo + 26) + zip.readUInt16LE(lo + 28);
  const raw = zip.subarray(start, start + csize);
  const data = method === 8 ? zlib.inflateRawSync(raw) : raw;
  const disk = fs.readFileSync(path.join(base, name));
  if ((zlib.crc32(data) >>> 0) !== crc || !data.equals(disk)) {
    console.error(`mismatch: ${name}`);
    process.exit(1);
  }
  ok++;
  p += 46 + nlen + xlen + clen;
}
if (ok !== names.length) {
  console.error(`read back ${ok} of ${names.length}`);
  process.exit(1);
}
console.log(`${out}: ${ok} files, ${(zip.length / 1048576).toFixed(1)} MB, every entry read back and equal to its file`);

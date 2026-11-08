// A database step from a fixture running in the browser container, which has no docker and no Postgres client.
// The fixture writes its statement to ./.host-sql/<id>.sql in its scripts folder (mounted from the host) and waits;
// the fixture's .sh wrapper (browser/c40-delete-protection.sh) runs each statement with psql on the fx database
// (intelcost_fx, never the bench's) and writes <id>.done with psql's output, or <id>.failed.

import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", ".host-sql");

/** Run one SQL statement on the fx database through the wrapper; resolves with psql's output. */
export async function hostSql(sql, { timeout = 30000 } = {}) {
  if (!process.env.HOST_SQL) throw new Error("hostSql needs the fixture's .sh wrapper (HOST_SQL is not set): run it by name through fx-suite.sh");
  mkdirSync(DIR, { recursive: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  writeFileSync(join(DIR, `${id}.sql.tmp`), sql);
  // Renamed into place whole, so the wrapper never reads half a statement.
  const { renameSync } = await import("node:fs");
  renameSync(join(DIR, `${id}.sql.tmp`), join(DIR, `${id}.sql`));
  const deadline = Date.now() + timeout;
  for (;;) {
    if (existsSync(join(DIR, `${id}.done`))) return readFileSync(join(DIR, `${id}.done`), "utf8");
    if (existsSync(join(DIR, `${id}.failed`))) throw new Error(`host SQL failed: ${readFileSync(join(DIR, `${id}.failed`), "utf8")}`);
    if (Date.now() > deadline) throw new Error(`host SQL not run in ${timeout / 1000} s: ${sql}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

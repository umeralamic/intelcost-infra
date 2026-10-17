// The archived fixture suite, retargeted at the fx stack (D-611). Run by ./fx-suite.sh setup on the
// copy it restores into ./fx-suite (git-ignored), never on the repo's own files:
//
//   node fx-suite-patch.mjs fx-suite <minio host>
//
// - Every address moves to the fx stack: the api 8000 → 8020 (window B's 8010 → 8030), the app
//   5173 → 5176 (window B's 5174 → 5177), MinIO localhost:9000 → the host gateway's address, which
//   the fx api signs its links with (path-style). The harness's own calls go by service name.
// - Every service: browser → browser-fx, api → api-fx, the database intelcost → intelcost_fx,
//   Redis database 0 → 1.
// - regress.sh: window B's pair is the fx pair; the previews worker is worker-fx; the seeded
//   account's snapshot and check, and bench-tidy (which signs in as it), are left out; the
//   fixtures that stop, restart or recreate a service, or need what the fx stack does not run,
//   are skipped and named (SKIPPED below).

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [root, s3Host = "192.168.65.254"] = process.argv.slice(2);
if (!root) throw new Error("usage: node fx-suite-patch.mjs <restored suite dir> [minio host]");

/** Fixtures not run on the fx stack, and why (D-611). */
export const SKIPPED = {
  "f8-s2": "stops and restarts the api",
  "f8-s3": "recreates the api on 2-minute tokens",
  "f8-s5": "stops Redis, which the running bench shares",
  "f8-s8": "restarts window B's api",
  "f8-s12": "restarts the api",
  "f5-s2": "stops the worker and drops its queue",
  "f4-s27": "stops MinIO, which the running bench shares",
  "f5-s9": "runs today's seed.py --reset with a flag it no longer takes",
  "d27-uploads": "needs the beat scheduler, which the fx stack does not run",
};

const ADDRESSES = [
  ["localhost:8000", "localhost:8020"],
  ["localhost:8010", "localhost:8030"],
  ["localhost:5173", "localhost:5176"],
  ["localhost:5174", "localhost:5177"],
  ["localhost:9000", `${s3Host}:9000`],
  ["host.docker.internal:9000", `${s3Host}:9000`],
];
const SERVICES = [
  [/--profile browser\b/g, "--profile fx"],
  [/ browser node /g, " browser-fx node "],
  [/exec -T api /g, "exec -T api-fx "],
  [/-d intelcost\b(?!_)/g, "-d intelcost_fx"],
  [/redis-cli(?! -n)/g, "redis-cli -n 1"],
];

const swap = (text, pairs) => pairs.reduce((t, [a, b]) => (typeof a === "string" ? t.split(a).join(b) : t.replace(a, b)), text);
let touched = 0;
const patch = (file, fn) => {
  const before = readFileSync(file, "utf8");
  const after = fn(before);
  if (after !== before) {
    writeFileSync(file, after);
    touched++;
  }
};

const browser = path.join(root, "browser");
for (const dir of [browser, path.join(browser, "lib")]) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (name.endsWith(".mjs")) patch(file, (t) => swap(t, ADDRESSES));
    if (name.endsWith(".sh")) patch(file, (t) => swap(swap(t, ADDRESSES), SERVICES));
  }
}

// The harness's own calls, by service name: the fx apis.
patch(path.join(browser, "lib", "bench.mjs"), (t) => t.replace('"localhost:8020": "api:8000"', '"localhost:8020": "api-fx:8000"').replace('"localhost:8030": "api-b:8000"', '"localhost:8030": "api-fx-b:8000"'));

patch(path.join(root, "regress.sh"), (t) => {
  let s = swap(swap(t, ADDRESSES), SERVICES);
  s = s.replace("docker compose --profile realtime up -d api-b app-b >/dev/null 2>&1", "docker compose --profile fx up -d --no-deps api-fx-b app-fx-b >/dev/null 2>&1");
  s = s.replace("docker compose up -d worker-previews >/dev/null 2>&1", "true  # worker-fx serves every queue, previews included (D-611)");
  // The seeded account is the founder's on the running bench, and absent from the fx database.
  s = s.replace(/seeded_before=\$\(drive_ws snapshot[^\n]*\n/, "seeded_before=  # D-611: no seeded-account snapshot on the fx database\n");
  s = s.replace(/docker compose --profile fx run --rm browser-fx node scripts\/bench-tidy\.mjs[^\n]*\n[^\n]*\n/, "# D-611: bench-tidy signs in as the seeded account; not run on the fx stack.\n");
  s = s.replace(/seeded_check=\$\(drive_ws check "\$seeded_before"\)/, 'seeded_check="skipped on the fx stack (D-611)"');
  // The skipped fixtures, named in the run's output.
  const skip = Object.keys(SKIPPED).join(" | ");
  s = s.replace("      f4-s12 | f5-demo | *-outage | *-restart) continue ;;", `      f4-s12 | f5-demo | *-outage | *-restart) continue ;;\n      ${skip}) echo "SKIP $name" >&2; continue ;;`);
  s = s.replace(/^d27-uploads\b.*$/m, "");
  s = s.replace('  echo d27-uploads   # D-27\'s sweep of abandoned uploads (a drive, no browser)', "  # d27-uploads: skipped on the fx stack (D-611)");
  return s;
});

console.log(`fx-suite patch: ${touched} files retargeted at the fx stack; ${Object.keys(SKIPPED).length} fixtures skipped`);
for (const [name, why] of Object.entries(SKIPPED)) console.log(`  skip ${name}: ${why}`);

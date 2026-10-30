// The archived fixture suite, retargeted at the fx stack (D-611). Run by ./fx-suite.sh setup on the
// copy it restores into ./fx-suite (git-ignored), never on the repo's own files:
//
//   node fx-suite-patch.mjs fx-suite <minio host>
//
// It is safe to run again on a patched suite (`./fx-suite.sh refresh`): every swap is a no-op the
// second time.
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

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [root, s3Host = "192.168.65.254"] = process.argv.slice(2);
if (!root) throw new Error("usage: node fx-suite-patch.mjs <restored suite dir> [minio host]");

/** Fixtures not run on the fx stack, and why (D-611). */
export const SKIPPED = {
  "f8-s5": "stops Redis, which the running bench shares",
  "f4-s27": "stops MinIO, which the running bench shares",
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
  // The fixtures that stop, restart or recreate an api stop the fx stack's own (2026-10-24, D-761): never the
  // bench's. f5-s2 (it reads beat) and the Redis and MinIO ones stay skipped above.
  [/docker compose (stop|start|restart) api(?=[\s>])/g, "docker compose --profile fx $1 api-fx"],
  [/docker compose up -d api(?=[\s>])/g, "docker compose --profile fx up -d --no-deps api-fx"],
  [/docker compose --profile realtime restart api-b(?=[\s>])/g, "docker compose --profile fx restart api-fx-b"],
  // f5-s2 stops and starts the fx stack's worker, and f5-s2 and d27-uploads read the fx stack's beat (D-770);
  // f5-s9's seed runs as it is (its flags are today's, D-770).
  [/docker compose (stop|start) worker(?=[\s>])/g, "docker compose --profile fx $1 worker-fx"],
  [/exec -T beat /g, "exec -T beat-fx "],
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

// Ports written as numbers, which the address swap above misses (D-614): realtime.mjs's `call`
// (port = 8000 by default), its socket probe and its login, and the fixtures that pass a port.
// Unswapped, those requests reached the running bench's own api, which refused every one (401,
// 403): the fx stack's accounts do not exist there. A timeout of 8000 ms becomes 8020: harmless.
const PORT_FILES = ["lib/realtime.mjs", "f3-s10.mjs", "f4-s20.mjs", "f8-s5.mjs", "f8-s9.mjs", "load-probe.mjs"];
const PORTS = [
  [/(?<![\w.-])8000(?![\w.-])/g, "8020"],
  [/(?<![\w.-])8010(?![\w.-])/g, "8030"],
];
for (const name of PORT_FILES) {
  const file = path.join(browser, name);
  if (existsSync(file)) patch(file, (t) => swap(t, PORTS));
}

// The harness's own calls, by service name: the fx apis.
patch(path.join(browser, "lib", "bench.mjs"), (t) => t.replace('"localhost:8020": "api:8000"', '"localhost:8020": "api-fx:8000"').replace('"localhost:8030": "api-b:8000"', '"localhost:8030": "api-fx-b:8000"'));

const B_PAIR =
  'docker compose --profile fx up -d --no-build --pull never --no-deps api-fx-b >/dev/null 2>&1; [ "$(docker compose ps -q app-fx-b-prod 2>/dev/null)" ] || docker compose --profile fx up -d --no-build --pull never --no-deps app-fx-b >/dev/null 2>&1';
patch(path.join(root, "regress.sh"), (t) => {
  let s = swap(swap(t, ADDRESSES), SERVICES);
  // Window B's pair, offline (D-841): the images are the setup's or prepare's; its dev server only while the built
  // app is not on its port (it fails there, and was started into that failure on every built-app run).
  s = s.replace("docker compose --profile realtime up -d api-b app-b >/dev/null 2>&1", B_PAIR);
  s = s.replace("docker compose --profile fx up -d --no-deps api-fx-b app-fx-b >/dev/null 2>&1", B_PAIR);
  s = s.replace("docker compose up -d worker-previews >/dev/null 2>&1", "true  # worker-fx serves every queue, previews included (D-611)");
  // The seeded account is the founder's on the running bench, and absent from the fx database.
  s = s.replace(/seeded_before=\$\(drive_ws snapshot[^\n]*\n/, "seeded_before=  # D-611: no seeded-account snapshot on the fx database\n");
  s = s.replace(/docker compose --profile fx run --rm browser-fx node scripts\/bench-tidy\.mjs[^\n]*\n[^\n]*\n/, "# D-611: bench-tidy signs in as the seeded account; not run on the fx stack.\n");
  s = s.replace(/seeded_check=\$\(drive_ws check "\$seeded_before"\)/, 'seeded_check="skipped on the fx stack (D-611)"');
  // The skipped fixtures, named in the run's output (once: `refresh` patches a patched suite again).
  const skip = Object.keys(SKIPPED).join(" | ");
  // A patched suite's skip line is written again from SKIPPED (refresh), so a fixture taken off the list runs.
  s = s.replace(/^ {6}[a-z0-9| -]+\) echo "SKIP \$name" >&2; continue ;;$/m, `      ${skip}) echo "SKIP $name" >&2; continue ;;`);
  if (!s.includes('echo "SKIP $name"')) s = s.replace("      f4-s12 | f5-demo | *-outage | *-restart) continue ;;", `      f4-s12 | f5-demo | *-outage | *-restart) continue ;;\n      ${skip}) echo "SKIP $name" >&2; continue ;;`);
  // d27-uploads runs on the fx stack since D-770 (its beat is beat-fx).
  // The two 520 MB sets run one at a time (D-870): side by side they shared the api's memory and the worker's prepare
  // queue, and f5-big's 10 s Load waited 29 s behind the other fixtures' prepares; neither failed alone.
  s = s.replace(/^SERIAL=\((?![^)]*f5-big)([^)]*)\)$/m, "SERIAL=($1 f5-big f5-count)");
  return s;
});

console.log(`fx-suite patch: ${touched} files retargeted at the fx stack; ${Object.keys(SKIPPED).length} fixtures skipped`);
for (const [name, why] of Object.entries(SKIPPED)) console.log(`  skip ${name}: ${why}`);

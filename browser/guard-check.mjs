// The guard check (D-542, D-601): every reader of the guard's protected list holds the same list, and
// no guard file carries a listed id or a founder account. The list is one file outside git, named by
// INTELCOST_GUARD_LIST; there are no copies to keep in step, so the check compares its readers:
//   - lib/protected.mjs (the bench helpers' and bench-session-serve's loader), read here;
//   - drives/guard_list.py in the api container (the drives' guard and the fingerprint), at the
//     path the compose file mounts;
//   - the list bench-session-serve.mjs serves to mcp-guard.js, when it is running.
// Run by ../fingerprint.sh at the start and end of every run. Reads files only.
//
//   node browser/guard-check.mjs

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FOUNDER_EMAILS, FOUNDER_WORKSPACES, GUARD_LIST_DIGEST, PROTECTED_PROJECTS, TEST_COPY } from "./lib/protected.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const infra = path.resolve(here, "..");
let bad = 0;
const fail = (why) => {
  bad += 1;
  console.log(`FAIL ${why}`);
};

// The list lives outside every repository.
const file = process.env.INTELCOST_GUARD_LIST;
try {
  execFileSync("git", ["-C", path.dirname(file), "rev-parse", "--show-toplevel"], { stdio: "pipe" });
  fail("the guard list sits inside a git repository");
} catch {
  // Not in a repository: as it should be.
}

// The drives' reader, in the api container.
let drives = null;
try {
  const out = execFileSync("docker", ["compose", "exec", "-T", "api", "sh", "-lc", "cd /srv && python drives/guard_list.py"], {
    cwd: infra,
    env: { ...process.env, MSYS_NO_PATHCONV: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  }).toString();
  drives = out.match(/guard list ([0-9a-f]{16})/)?.[1] ?? null;
  if (drives !== GUARD_LIST_DIGEST) fail(`drives/guard_list.py in the api holds ${drives ?? "no list"}, lib/protected.mjs ${GUARD_LIST_DIGEST}`);
} catch (error) {
  fail(`drives/guard_list.py in the api: ${String(error.stderr || error.message).trim().split("\n").pop()}`);
}

// The MCP guard's list, as served.
let served = "not running (mcp-guard.js fetches it from bench-session-serve.mjs when it is)";
try {
  const response = await fetch("http://127.0.0.1:5199/guard-list");
  const digest = response.ok ? (await response.json()).digest : null;
  served = digest ?? `answered ${response.status}`;
  if (digest !== GUARD_LIST_DIGEST) fail(`the list served to mcp-guard.js is ${served}, lib/protected.mjs ${GUARD_LIST_DIGEST}`);
} catch {
  // Not running: nothing to compare.
}

// No guard file names a listed project, workspace or founder account.
const GUARD_FILES = [
  "browser/lib/protected.mjs",
  "browser/mcp-guard.js",
  "browser/guard-check.mjs",
  "browser/bench-session-serve.mjs",
  "drives/guard.py",
  "drives/guard_list.py",
  "drives/project_fingerprint.py",
  "drives/purge-bench-accounts.py",
  "drives/purge-bench-dups.py",
  "drives/bench-tidy.py",
  "drives/bench-workspaces.py",
  "drives/bench-session.py",
  "drives/copy-3d-test.py",
  "fingerprint.sh",
];
const needles = [...Object.keys(PROTECTED_PROJECTS), ...Object.keys(FOUNDER_WORKSPACES), ...FOUNDER_EMAILS];
for (const rel of GUARD_FILES) {
  const text = readFileSync(path.join(infra, rel), "utf8").toLowerCase();
  const hits = needles.filter((n) => text.includes(n));
  if (hits.length) fail(`${rel} names ${hits.length} listed id(s) or founder account(s)`);
}

console.log(
  `guard check: list ${GUARD_LIST_DIGEST}, ${Object.keys(PROTECTED_PROJECTS).length} protected projects ` +
    `(test copy ${PROTECTED_PROJECTS[TEST_COPY]}), ${Object.keys(FOUNDER_WORKSPACES).length} founder workspaces, ` +
    `${FOUNDER_EMAILS.length} founder accounts; drives ${drives ?? "none"}, served ${served}; ` +
    `${GUARD_FILES.length} guard files clean of ids; ` +
    (bad ? `${bad} problem(s), FAILED` : "every reader holds the same list"),
);
process.exit(bad ? 1 : 0);

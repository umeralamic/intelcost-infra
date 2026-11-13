#!/usr/bin/env bash
# Is the founder using the bench right now (D-1252)? Run it before restarting or changing anything the
# founder's browser uses: the app dev server, the api, the workers, a migration, or an api source save that
# reloads it. Reads the api log for the last N minutes (default 10) and reports each request on a founder
# workspace or a protected project, by label only (the guard list: the private file INTELCOST_GUARD_LIST
# names). Read only.
#
#   ./founder-active.sh          (the last 10 minutes)
#   ./founder-active.sh 30       (the last 30)
#
# Exit 0: quiet. Exit 1: the founder is active (say so, and wait or ask). Exit 2: it could not tell (no
# guard list, no api log): treat it as active.

set -u
cd "$(dirname "$0")"
minutes="${1:-10}"
list="${INTELCOST_GUARD_LIST:-}"
if [ -z "$list" ] || [ ! -f "$list" ]; then
  echo "founder-active: INTELCOST_GUARD_LIST is not set or not found; treat the founder as active"
  exit 2
fi
log="$(docker compose logs api --since "${minutes}m" --timestamps 2>/dev/null)" || {
  echo "founder-active: no api log; treat the founder as active"
  exit 2
}
printf '%s\n' "$log" | node -e '
const fs = require("fs");
const guard = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const minutes = process.argv[2];
const workspaces = new Set(Object.keys(guard.founder_workspaces ?? {}));
const projects = guard.protected_projects ?? {};
const seen = new Map();
for (const line of fs.readFileSync(0, "utf8").split("\n")) {
  const m = line.match(/(\d{4}-\d\d-\d\dT[\d:]+)\S* .*"(GET|POST|PUT|PATCH|DELETE) \/api\/workspace\/([0-9a-f-]{36})(?:\/project\/([0-9a-f-]{36}))?/);
  if (!m) continue;
  const [, at, method, ws, pj] = m;
  const label = pj && projects[pj] ? projects[pj] : workspaces.has(ws) ? "a founder workspace" : null;
  if (!label) continue;
  const s = seen.get(label) ?? { n: 0, writes: 0, last: at };
  s.n += 1;
  if (method !== "GET") s.writes += 1;
  s.last = at;
  seen.set(label, s);
}
if (seen.size === 0) {
  console.log(`founder-active: quiet (no founder request in the last ${minutes} min)`);
  process.exit(0);
}
for (const [label, s] of seen) console.log(`founder-active: ACTIVE ${label}: ${s.n} requests (${s.writes} writes), last ${s.last.slice(11, 19)} UTC`);
console.log("Say so, and wait or ask before restarting or changing what the founder is using (D-1252).");
process.exit(1);
' "$list" "$minutes"

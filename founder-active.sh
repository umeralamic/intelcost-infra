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
#
# The gate's stamp (D-1266): a quiet answer over at least the default 10 minutes writes the UTC epoch to
# the stamp file (E:\Intelcost\.private\founder-quiet.stamp, outside git; INTELCOST_FOUNDER_STAMP overrides
# it); any other answer removes it. The PreToolUse hook .claude/hooks/founder-gate.sh refuses an app or api
# source save, or a bench migration, unless that stamp is at most 120 s old.

set -u
cd "$(dirname "$0")"
minutes="${1:-10}"
stamp="${INTELCOST_FOUNDER_STAMP:-$(cd .. && pwd)/.private/founder-quiet.stamp}"
finish() {
  if [ "$1" -eq 0 ] && [ "$minutes" -ge 10 ] 2>/dev/null; then
    mkdir -p "$(dirname "$stamp")" 2>/dev/null
    date -u +%s >"$stamp" 2>/dev/null
  else
    rm -f "$stamp" 2>/dev/null
  fi
  exit "$1"
}
list="${INTELCOST_GUARD_LIST:-}"
if [ -z "$list" ] || [ ! -f "$list" ]; then
  echo "founder-active: INTELCOST_GUARD_LIST is not set or not found; treat the founder as active"
  finish 2
fi
log="$(docker compose logs api --since "${minutes}m" --timestamps 2>/dev/null)" || {
  echo "founder-active: no api log; treat the founder as active"
  finish 2
}
printf '%s\n' "$log" | node -e '
const fs = require("fs");
const guard = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const minutes = process.argv[2];
const workspaces = new Set(Object.keys(guard.founder_workspaces ?? {}));
const projects = guard.protected_projects ?? {};
// An open tab writes on its own: a work session opened (POST) and its heartbeat each minute (PATCH), and a project
// visit. Those say a tab is open, not that the founder is editing; any other write is an edit.
const heartbeat = (path) => /\/work-session(\/|$)|\/visit$/.test(path);
const seen = new Map();
for (const line of fs.readFileSync(0, "utf8").split("\n")) {
  const m = line.match(/(\d{4}-\d\d-\d\dT[\d:]+)\S* .*"(GET|POST|PUT|PATCH|DELETE) (\/api\/workspace\/([0-9a-f-]{36})(?:\/project\/([0-9a-f-]{36}))?[^ ?]*)/);
  if (!m) continue;
  const [, at, method, path, ws, pj] = m;
  const label = pj && projects[pj] ? projects[pj] : workspaces.has(ws) ? "a founder workspace" : null;
  if (!label) continue;
  const s = seen.get(label) ?? { n: 0, edits: 0, lastEdit: null, last: at };
  s.n += 1;
  if (method !== "GET" && !heartbeat(path)) {
    s.edits += 1;
    s.lastEdit = at;
  }
  s.last = at;
  seen.set(label, s);
}
const editing = [...seen].filter(([, s]) => s.edits > 0);
if (editing.length === 0) {
  const open = [...seen].map(([label, s]) => `${label} (last ${s.last.slice(11, 19)} UTC)`).join(", ");
  console.log(`founder-active: quiet (no founder edit in the last ${minutes} min)${open ? `; a tab is open: ${open}` : ""}`);
  process.exit(0);
}
for (const [label, s] of editing) console.log(`founder-active: ACTIVE ${label}: ${s.edits} edits, the last ${s.lastEdit.slice(11, 19)} UTC (${s.n} requests)`);
console.log("Tell the founder and wait instead of saving or restarting (D-1252, D-1254).");
process.exit(1);
' "$list" "$minutes"
finish $?

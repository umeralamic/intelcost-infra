#!/usr/bin/env bash
# D-27: the nightly sweep of abandoned uploads in live projects (abort_stale_uploads).
#
#   ./browser/d27-uploads.sh       (from intelcost-infra/; regress.sh runs it too)
#
# No browser: an abandoned upload is invisible on a screen. The drive makes its own
# workspace with four uploads (old and new, finished and not, one in a trashed project),
# runs the job through the worker twice, checks rows and MinIO, and removes what it made.
# Then beat is checked for the schedule entry.

set -u
cd "$(dirname "$0")/.."

total=0
passed=0
step() {  # step "title" command...
  local title=$1
  shift
  total=$((total + 1))
  local out
  out=$("$@" 2>&1)
  local status=$?
  if [ $status -eq 0 ] && ! grep -qE '^FAIL' <<<"$out"; then
    passed=$((passed + 1))
    echo "PASS  $total. $title"
  else
    echo "FAIL  $total. $title"
  fi
  grep -E '^(setup|ran|rows|minio|again|clean|beat|FAIL)|Traceback|Error' <<<"$out" | sed 's/^/      /'
}

drive() { docker compose exec -T api sh -lc "cd /srv && python drives/d27-stale-uploads.py"; }
beat_entry() {
  docker compose exec -T beat python -c "import shelve
s = shelve.open('/tmp/celerybeat-schedule')
e = s['entries']['abort-stale-uploads']
print('beat  entry', e.task, 'at', e.schedule)"
}

echo
echo "=== d27-uploads ==="
step "an upload unfinished for 24 h in a live project is aborted and its row dropped; the rest stay" drive
step "beat carries the sweep on its schedule" beat_entry

echo
echo "$passed/$total passed"
[ "$passed" -eq "$total" ]

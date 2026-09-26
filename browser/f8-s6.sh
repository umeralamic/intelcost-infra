#!/usr/bin/env bash
# F8-S6: the nightly purge, on the worker, publishing to an open Trash.
#
#   ./browser/f8-s6.sh      (from intelcost-infra/; regress.sh runs it too)
#
# Runs browser/f8-s6.mjs and, on its cues, ages its project and runs the purge through
# the worker (dry, then real). Each finished phase leaves a marker file the fixture
# waits on; the markers are removed at the end. Needs the realtime profile.

set -u
cd "$(dirname "$0")/.."

LOG="${REGRESS_LOG:-./.regress}"
mkdir -p "$LOG"
log="$LOG/f8-s6-run.log"
marker() { touch "browser/.f8-s6-$1-done"; }
cleanup() { rm -f browser/.f8-s6-*-done; }
trap cleanup EXIT
cleanup

drive() { docker compose exec -T api sh -lc "cd /srv && python drives/f8-bench.py $*" 2>&1 | grep -E '^(aged|ran|FAIL)|Traceback'; }

docker compose --profile browser run --rm browser node scripts/f8-s6.mjs >"$log" 2>&1 &
fixture=$!

wait_for() {
  for _ in $(seq 1 240); do
    grep -q "PHASE $1" "$log" 2>/dev/null && return 0
    sleep 0.5
  done
  return 1
}

if wait_for age; then
  uuid=$(grep -o 'PHASE age [0-9a-f-]*' "$log" | awk '{print $3}')
  drive age "$uuid" >/dev/null && marker age
fi
wait_for dry && drive purge dry >/dev/null && marker dry
wait_for purge && drive purge >/dev/null && marker purge

wait $fixture
status=$?
grep -v -e '^ Container' -e '^PHASE' "$log"
exit $status

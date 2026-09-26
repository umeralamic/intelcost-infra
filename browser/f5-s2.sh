#!/usr/bin/env bash
# F5-S2: preparation on the worker. Runs browser/f5-s2.mjs and answers its cues: checks
# MinIO through a drive, stops and starts the worker, drops the queued jobs to stand for
# a killed run, and ages a file past the sweep's window then runs the sweep. The n-th cue
# answered leaves `.f5-s2-<n>-done`, which the fixture waits on; the markers go at the
# end, and the worker is always started again.
#
#   ./browser/f5-s2.sh      (from intelcost-infra/; regress.sh runs it too)

set -u
cd "$(dirname "$0")/.."

LOG="${REGRESS_LOG:-./.regress}"
mkdir -p "$LOG"
log="$LOG/f5-s2-run.log"
clear_markers() { rm -f browser/.f5-s2-*-done; }
finish() { clear_markers; docker compose start worker >/dev/null 2>&1; }
trap finish EXIT
clear_markers

drive() { docker compose exec -T api sh -lc "cd /srv && python drives/f5-bench.py $*" 2>&1 | grep -E '^(objects|aged|swept|beat|FAIL)|Traceback|Error'; }

answer() {  # answer n "PHASE name [detail]"
  local n=$1
  set -- $2
  local phase=$2 detail=${3:-} ok=1
  case "$phase" in
    objects) drive objects "$detail" || ok=0 ;;
    stop-worker) docker compose stop worker >/dev/null 2>&1 && echo "worker stopped" ;;
    start-worker) docker compose start worker >/dev/null 2>&1 && echo "worker started" ;;
    lose-queue) docker compose exec -T redis redis-cli del celery >/dev/null && echo "queued jobs dropped" ;;
    sweep) drive age "$detail" && drive sweep || ok=0 ;;
  esac
  # A failed drive still answers, so the fixture does not hang; its FAIL line is the report.
  [ "$ok" -eq 1 ] || { echo "FAIL  the $phase drive"; drives_failed=1; }
  touch "browser/.f5-s2-$n-done"
}

docker compose --profile browser run --rm browser node scripts/f5-s2.mjs >"$log" 2>&1 &
fixture=$!

drives_failed=0
handled=0
while kill -0 "$fixture" 2>/dev/null; do
  cues=$(grep -c '^PHASE' "$log" 2>/dev/null || true)
  while [ "${cues:-0}" -gt "$handled" ]; do
    handled=$((handled + 1))
    answer "$handled" "$(grep '^PHASE' "$log" | sed -n "${handled}p")"
  done
  sleep 0.5
done

wait $fixture
status=$?
beat_entry=$(docker compose exec -T beat python -c "import shelve
s = shelve.open('/tmp/celerybeat-schedule')
e = s['entries']['sweep-unprepared-drawings']
print('beat  entry', e.task, 'every', e.schedule)" 2>&1) || status=1
echo "$beat_entry" | tail -1
[ "$drives_failed" -eq 0 ] || status=1
grep -v -e '^ Container' -e '^PHASE' "$log"
exit $status

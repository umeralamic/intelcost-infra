#!/usr/bin/env bash
# F8-S12: the three collaboration modes on the takeoff page, and a hold that outlives a
# restart.
#
#   ./browser/f8-s12.sh     (from intelcost-infra/; regress.sh runs it too)
#
#   1. f8-s12.mjs           Work together, Warn me, One at a time, a closed tab, two tabs
#   2. f8-s12-restart.mjs   restarts `api` on its cue while window A holds an item (AC5)
#
# Needs the realtime profile. `api` is down for about ten seconds.

set -u
cd "$(dirname "$0")/.."

LOG="${REGRESS_LOG:-./.regress}"
mkdir -p "$LOG"
restart_log="$LOG/f8-s12-restart.log"
status=0

docker compose --profile browser run --rm browser node scripts/f8-s12.mjs 2>&1 | grep -v '^ Container'
[ "${PIPESTATUS[0]}" -eq 0 ] || status=1

docker compose --profile browser run --rm browser node scripts/f8-s12-restart.mjs >"$restart_log" 2>&1 &
fixture=$!
for _ in $(seq 1 240); do
  if grep -q "PHASE restart-api" "$restart_log" 2>/dev/null; then
    docker compose restart api >/dev/null 2>&1
    break
  fi
  sleep 0.5
done
wait $fixture || status=1
grep -v -e '^ Container' -e '^PHASE' "$restart_log"
exit $status

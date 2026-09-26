#!/usr/bin/env bash
# F8-S8: reconnect refetches, no replay. Restarts api-b on the fixture's cue.
#
#   ./browser/f8-s8.sh      (from intelcost-infra/; regress.sh runs it too)
#
# Needs the realtime profile. api-b is down for about ten seconds.

set -u
cd "$(dirname "$0")/.."

LOG="${REGRESS_LOG:-./.regress}"
mkdir -p "$LOG"
log="$LOG/f8-s8-run.log"

docker compose --profile browser run --rm browser node scripts/f8-s8.mjs >"$log" 2>&1 &
fixture=$!
for _ in $(seq 1 240); do
  if grep -q "PHASE restart-api-b" "$log" 2>/dev/null; then
    docker compose --profile realtime restart api-b >/dev/null 2>&1
    break
  fi
  sleep 0.5
done
wait $fixture
status=$?
grep -v -e '^ Container' -e '^PHASE' "$log"
exit $status

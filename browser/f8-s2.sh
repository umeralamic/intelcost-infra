#!/usr/bin/env bash
# F8-S2, with F8-S1 AC5: the socket tied to the session, and the api going away.
#
#   ./browser/f8-s2.sh      (from intelcost-infra/; regress.sh runs it too)
#
#   1. f8-s2.mjs          the login page, sign out, a failed refresh (AC1, AC2, AC4)
#   2. f8-s2-outage.mjs   a tab stays open while this script, on its cue:
#        stop-api         stops the api for 30 s, then starts it (S2 AC3)
#        restart-api      restarts it (S1 AC5)
#
# The api is down for about half a minute. Run nothing else against the bench meanwhile.

set -u
cd "$(dirname "$0")/.."

LOG="${REGRESS_LOG:-./.regress}"
mkdir -p "$LOG"
outage_log="$LOG/f8-s2-outage.log"

status=0
docker compose --profile browser run --rm browser node scripts/f8-s2.mjs 2>&1 | grep -v '^ Container' || true
[ "${PIPESTATUS[0]}" -eq 0 ] || status=1

cue() {  # cue <phase>: wait for the fixture to print "PHASE <phase>"
  for _ in $(seq 1 240); do
    grep -q "PHASE $1" "$outage_log" 2>/dev/null && return 0
    sleep 0.5
  done
  echo "FAIL  the outage fixture never reached $1"
  return 1
}

docker compose --profile browser run --rm browser node scripts/f8-s2-outage.mjs >"$outage_log" 2>&1 &
fixture=$!

if cue stop-api; then
  docker compose stop api >/dev/null 2>&1
  sleep 30
  docker compose start api >/dev/null 2>&1
fi
if cue restart-api; then
  docker compose restart api >/dev/null 2>&1
fi

wait $fixture || status=1
grep -v -e '^ Container' -e '^PHASE' "$outage_log"
exit $status

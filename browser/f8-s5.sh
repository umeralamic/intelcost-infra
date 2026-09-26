#!/usr/bin/env bash
# F8-S5: publish after commit, and the Redis fan-out across api processes.
#
#   ./browser/f8-s5.sh      (from intelcost-infra/; regress.sh runs it too)
#
#   1. f8-s5.mjs            one change, two windows on two api processes (AC1)
#   2. drives/f8-bench.py   a rolled-back publish never arrives; a committed one does (AC2)
#   3. f8-s5-outage.mjs     Redis stopped for 10 s with both windows open (AC3)
#
# Needs `docker compose --profile realtime up -d`, and stops Redis for ten seconds, which
# the worker and beat also notice. Run nothing else against the bench meanwhile.

set -u
cd "$(dirname "$0")/.."

LOG="${REGRESS_LOG:-./.regress}"
mkdir -p "$LOG"
outage_log="$LOG/f8-s5-outage.log"
status=0

docker compose --profile browser run --rm browser node scripts/f8-s5.mjs 2>&1 | grep -v '^ Container'
[ "${PIPESTATUS[0]}" -eq 0 ] || status=1

workspace=$(docker compose exec -T postgres psql -U intelcost -d intelcost -Atc \
  "select w.uuid from workspace w join \"user\" u on u.id = w.owner_id where u.email = 'estimator@bench.intelcost.io' order by w.id limit 1")
echo
echo "=== f8-s5 AC2 (drive) ==="
out=$(docker compose exec -T api sh -lc "cd /srv && python drives/f8-bench.py rollback $workspace" 2>&1)
if grep -q '^silent' <<<"$out"; then
  echo "PASS  AC2: a publish registered on a transaction that fails never arrives; a committed one does"
  echo "1/1 passed"
else
  grep -E '^FAIL|Traceback|Error' <<<"$out"
  echo "0/1 passed"
  status=1
fi

cue() {
  for _ in $(seq 1 240); do
    grep -q "PHASE $1" "$outage_log" 2>/dev/null && return 0
    sleep 0.5
  done
  echo "FAIL  the outage fixture never reached $1"
  return 1
}

docker compose --profile browser run --rm browser node scripts/f8-s5-outage.mjs >"$outage_log" 2>&1 &
fixture=$!
if cue stop-redis; then
  docker compose stop redis >/dev/null 2>&1
  sleep 10
  docker compose start redis >/dev/null 2>&1
fi
wait $fixture || status=1
grep -v -e '^ Container' -e '^PHASE' "$outage_log"
exit $status

#!/usr/bin/env bash
# The bench's check of rollout.sh (D-842): the deploy stack as its own compose project (intelcost-deploytest),
# beside the bench and touching none of it, on the bench's Postgres and Redis (Redis database 3), plain HTTP on
# localhost:8091. Requests go through Caddy every 50 ms, to /openapi.json and every
# twentieth to /health (the database, Redis and the bucket), while the api is rolled out twice (blue to green, green to blue); every answer that is not a 200 is counted.
# Then the project is taken down. Not a test suite (hard rule 8): one command that says whether a deploy drops a
# request.
#
#   ./deploy/bench-check.sh        (from intelcost-infra/)

set -uo pipefail
cd "$(dirname "$0")"
export COMPOSE_PROJECT_NAME=intelcost-deploytest HTTP_PORT=8091 HTTPS_PORT=8444 API_SITE=":80" API_IMAGE=intelcost-deploytest-api:latest DRAIN_SECONDS=8
{ [ -f .env ] || [ -d live ]; } && { echo "deploy/.env or deploy/live/ exists: this check writes its own; move them aside first"; exit 1; }
# The api's own settings, with the bench's addresses (the api's .env holds the storage and mail values).
{
  cat ../../intelcost-app-fastapi/.env
  echo
  echo "ENVIRONMENT=local"
  echo "DEBUG=true"
  echo "DATABASE_URL=postgresql+asyncpg://intelcost:intelcost@host.docker.internal:5433/intelcost"
  echo "REDIS_URL=redis://host.docker.internal:6380/3"
  echo "JWT_SECRET=bench-only-secret-not-for-anything-real"
  echo "MAIL_ALLOWLIST=[\"@bench.intelcost.io\"]"
  echo "SMTP_HOST=host.docker.internal"
  echo "SMTP_PORT=1025"
} >.env
cleanup() {
  [ -n "${load:-}" ] && touch load.stop && wait "$load" 2>/dev/null
  rm -f load.log load.stop
  docker compose -f compose.yml down --remove-orphans >/dev/null 2>&1
  rm -rf .env live
}
trap cleanup EXIT

echo "$(date -u +%H:%M:%S) == first deploy (blue)"
./rollout.sh || exit 1
for _ in $(seq 1 30); do curl -sf -o /dev/null localhost:8091/health && break; sleep 1; done

# The load: one request every 50 ms through Caddy until stopped; one line per answer that is not a 200.
node -e '
const fs = require("fs");
let sent = 0, done = 0, bad = 0; const codes = {};
const tick = async () => {
  sent++;
  try { const deep = sent % 20 === 0; const r = await fetch(`http://localhost:8091${deep ? "/health" : "/openapi.json"}`); const body = await r.text(); if (r.status !== 200 || (deep && !/"status": ?"ok"/.test(body))) { bad++; codes[r.status] = (codes[r.status] ?? 0) + 1; console.log(`${new Date().toISOString().slice(11, 23)} not ok: ${r.status} ${body.slice(0, 120)}`); } }
  catch (e) { bad++; codes.error = (codes.error ?? 0) + 1; console.log(`${new Date().toISOString().slice(11, 23)} error: ${e.cause?.code ?? e.message}`); }
  done++;
};
const timer = setInterval(() => {
  if (fs.existsSync("load.stop")) {
    clearInterval(timer);
    const end = () => (done < sent ? setTimeout(end, 100) : (console.log(`load: ${sent} requests, ${bad} not ok ${JSON.stringify(codes)}`), process.exit(0)));
    return end();
  }
  void tick();
}, 50);
' >load.log 2>&1 &
load=$!
sleep 5
echo "$(date -u +%H:%M:%S) == rollout to green under load"
./rollout.sh || exit 1
sleep 5
echo "$(date -u +%H:%M:%S) == rollout back to blue under load"
./rollout.sh || exit 1
sleep 5
touch load.stop; wait "$load" 2>/dev/null; load=
# The first and last few failures, with their times against the rollout's steps (timed below).
grep -v "^load:" load.log | head -5
grep -v "^load:" load.log | tail -3
grep "^load:" load.log
rm -f load.log load.stop

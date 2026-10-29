#!/usr/bin/env bash
# A deploy of the api without downtime (D-842): the new api starts and passes its health check before the old one
# stops, and Caddy moves to it between the two, so no request is dropped.
#
#   ./deploy/rollout.sh            build the api image from ../intelcost-app-fastapi (API_SOURCE) and roll it out
#   API_IMAGE=registry/intelcost-api:<tag> ./deploy/rollout.sh --pull    pull a built image instead
#   ./deploy/rollout.sh --status   which colour is live, and both colours' health
#
# The order, every step waiting on the one before:
#   1. the image: built, or pulled
#   2. migrations: `alembic upgrade head` once, in a one-off container of the new image, while the old colour
#      serves. A migration therefore has to suit the old code too (add first, remove in a later deploy)
#   3. the idle colour started on the new image, and waited for until Docker reports it healthy: its own /health
#      says "status": "ok", database, Redis and storage included. Not healthy in time: it is stopped, the live
#      colour was never touched, and the deploy fails
#   4. Caddy sent to the new colour: live/upstream.caddy rewritten and `caddy reload`, which is graceful, and read
#      back inside Caddy: the old colour is not stopped until Caddy itself names the new one
#   5. the old colour left DRAIN_SECONDS to finish what it had, then stopped (SIGTERM: uvicorn finishes in-flight
#      requests and closes sockets with 1012, and the app reconnects at once, to the new colour)
#   6. the worker restarted on the new image (Celery's warm shutdown: a task in hand finishes; queued ones wait)
#
# A first deploy on an empty box starts blue. Postgres and Redis are never restarted here.

set -euo pipefail
cd "$(dirname "$0")"
COMPOSE=(docker compose -f compose.yml)
# Each step with its time (UTC), so a dropped request can be set against it.
say() { echo "rollout $(date -u +%H:%M:%S): $*"; }
DRAIN_SECONDS=${DRAIN_SECONDS:-15}
HEALTHY_WITHIN=${HEALTHY_WITHIN:-180}

UPSTREAM=live/upstream.caddy
live_colour() { sed -n 's/^to api-\(blue\|green\):8000$/\1/p' "$UPSTREAM"; }
health() { docker inspect --format '{{.State.Health.Status}}' "$("${COMPOSE[@]}" ps -q "api-$1" 2>/dev/null)" 2>/dev/null || echo "not running"; }

if [ "${1:-}" = "--status" ]; then
  echo "live: api-$(live_colour)"
  for c in blue green; do echo "api-$c: $(health $c)"; done
  exit 0
fi

# The live colour lives in live/upstream.caddy, on the box only (git-ignored); a first deploy starts blue.
mkdir -p live
[ -f "$UPSTREAM" ] || printf 'to api-blue:8000\n' >"$UPSTREAM"
live=$(live_colour)
[ -n "$live" ] || { echo "$UPSTREAM names no colour"; exit 1; }
running=$("${COMPOSE[@]}" ps -q "api-$live" 2>/dev/null || true)
if [ -z "$running" ]; then
  # A first deploy: nothing serves yet, so the colour $UPSTREAM names is the one started.
  next=$live
else
  next=$([ "$live" = blue ] && echo green || echo blue)
fi
say "live api-$live, starting api-$next"

# 1. The image.
if [ "${1:-}" = "--pull" ]; then "${COMPOSE[@]}" pull "api-$next"; else "${COMPOSE[@]}" build "api-$next"; fi

# 2. Migrations, once, before the new colour serves.
"${COMPOSE[@]}" run --rm --no-deps "api-$next" sh -c "python -m app.core.at_head || alembic upgrade head"

# 3. The new colour, healthy or the deploy stops here.
"${COMPOSE[@]}" up -d --no-deps --force-recreate "api-$next"
started=$(date +%s)
until [ "$(health "$next")" = healthy ]; do
  if [ $(($(date +%s) - started)) -ge "$HEALTHY_WITHIN" ]; then
    say "api-$next not healthy within ${HEALTHY_WITHIN} s ($(health "$next")): stopped; api-$live still serves"
    "${COMPOSE[@]}" logs --tail 40 "api-$next" || true
    "${COMPOSE[@]}" stop "api-$next"
    exit 1
  fi
  sleep 1
done
say "api-$next healthy in $(($(date +%s) - started)) s"

# 4. Caddy to the new colour (a first deploy also starts Caddy).
printf 'to api-%s:8000\n' "$next" >"$UPSTREAM"
if [ -z "$("${COMPOSE[@]}" ps -q caddy 2>/dev/null)" ]; then
  "${COMPOSE[@]}" up -d --no-deps caddy
else
  # MSYS_NO_PATHCONV: Git Bash on Windows (the bench) would turn the container's path into a Windows one.
  MSYS_NO_PATHCONV=1 "${COMPOSE[@]}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
fi
# Read back inside Caddy: the old colour stops only once Caddy has the new one.
seen=$(MSYS_NO_PATHCONV=1 "${COMPOSE[@]}" exec -T caddy cat /etc/caddy/live/upstream.caddy | tr -d '\r')
if [ "$seen" != "to api-$next:8000" ]; then
  say "Caddy reads '$seen', not api-$next: api-$live left serving, api-$next left up; nothing stopped"
  exit 1
fi
say "Caddy sends to api-$next"

# 5. The old colour drains, then stops.
if [ "$next" != "$live" ]; then
  sleep "$DRAIN_SECONDS"
  "${COMPOSE[@]}" stop "api-$live"
  say "api-$live stopped after ${DRAIN_SECONDS} s to drain"
fi

# 6. The worker on the new image.
"${COMPOSE[@]}" up -d --no-deps --force-recreate worker
say "done, api-$next live"

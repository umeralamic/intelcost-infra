#!/usr/bin/env bash
# The archived fixture suite (tag fixtures-archive-2026-09-28), run safely beside the bench (D-611).
#
# The suite loads drawings, and the bench's storage is the real bucket (D-259); its serial group
# stopped and restarted the bench's services. So it runs on the fx stack (docker-compose.yml, the
# "fx" profile): its own database (intelcost_fx), Redis database 1, MinIO's bucket intelcost-fx,
# MailHog only, no AI keys. The running api, workers and app are never stopped, restarted or
# pointed elsewhere, and nothing reaches the AWS bucket. Fixtures that stop or restart a service,
# or need what the fx stack does not run, are skipped and named (fx-suite-patch.mjs, SKIPPED).
#
#   ./fx-suite.sh setup      restore the tag into ./fx-suite (git-ignored), lay the fixtures updated
#                            since (./fx-suite-updates, D-614) over it, retarget it, make the
#                            database and the bucket, start the fx services
#   ./fx-suite.sh refresh    lay today's helpers and ./fx-suite-updates over a set-up suite again,
#                            and retarget them (after editing an updated fixture)
#   ./fx-suite.sh check      fail closed: every fx service stores in MinIO, mails to MailHog only,
#                            and runs on intelcost_fx
#   ./fx-suite.sh run [...]  check, then the suite's own regress.sh (its arguments: full, quick,
#                            or fixture names); output in ./fx-suite/.regress
#   ./fx-suite.sh stop       stop the fx services (the database and the bucket stay)

set -u
cd "$(dirname "$0")"
TAG=fixtures-archive-2026-09-28
FX_SERVICES="api-fx api-fx-b worker-fx app-fx app-fx-b"
# The host gateway's address, which the api, the worker and the containerised browser all reach
# MinIO at (Docker Desktop: host.docker.internal).
host=$(docker compose exec -T api python -c "import socket; print(socket.gethostbyname('host.docker.internal'))" 2>/dev/null | tr -d '\r' | tail -1)
export FX_S3_HOST="${FX_S3_HOST:-${host:-192.168.65.254}}"
# The suite's runners call `docker compose` from inside ./fx-suite: this file is theirs too.
export COMPOSE_FILE="$PWD/docker-compose.yml"

check() {
  local bad=0 svc out
  for svc in api-fx worker-fx; do
    out=$(docker compose exec -T "$svc" python -c "
from app.config import settings
from app.core.storage import _client
print(_client().meta.endpoint_url, settings.s3_bucket, settings.database_url.rsplit('/', 1)[-1], repr(settings.mail_allowlist), settings.smtp_host)" 2>/dev/null | tr -d '\r' | tail -1)
    if [ "$out" != "http://$FX_S3_HOST:9000 intelcost-fx intelcost_fx '' mailhog" ]; then
      echo "FAIL $svc: $out (want http://$FX_S3_HOST:9000 intelcost-fx intelcost_fx '' mailhog)"
      bad=1
    else
      echo "ok   $svc: storage http://$FX_S3_HOST:9000/intelcost-fx, database intelcost_fx, mail to MailHog only"
    fi
  done
  return $bad
}

case "${1:-}" in
  setup)
    rm -rf fx-suite && mkdir fx-suite
    git archive "$TAG" browser drives regress.sh | tar -x -C fx-suite
    # Today's guarded helpers over the tag's (lib/protected.mjs refuses the protected projects and
    # the founder's sign-ins); the tag's own formula-cases.mjs and shipped.sh stay.
    cp browser/lib/*.mjs fx-suite/browser/lib/
    # The fixtures updated to today's screens since the tag (D-614), over the tag's own.
    [ -d fx-suite-updates ] && cp -r fx-suite-updates/. fx-suite/
    node fx-suite-patch.mjs fx-suite "$FX_S3_HOST"
    docker compose exec -T postgres psql -U intelcost -d postgres -tc "select 1 from pg_database where datname = 'intelcost_fx'" | grep -q 1 \
      || docker compose exec -T postgres psql -U intelcost -d postgres -c "create database intelcost_fx owner intelcost" >/dev/null
    docker compose exec -T minio sh -c "mc alias set local http://localhost:9000 minioadmin minioadmin >/dev/null && mc mb --ignore-existing local/intelcost-fx" >/dev/null
    # --no-deps: the bench's own services are never recreated.
    docker compose --profile fx up -d --no-deps $FX_SERVICES
    docker compose --profile fx build browser-fx >/dev/null
    for _ in $(seq 1 90); do curl -sf localhost:8020/health >/dev/null && curl -sf localhost:8030/health >/dev/null && break; sleep 2; done
    check
    ;;
  check) check ;;
  refresh)
    [ -d fx-suite ] || { echo "Run ./fx-suite.sh setup first."; exit 1; }
    cp browser/lib/*.mjs fx-suite/browser/lib/
    [ -d fx-suite-updates ] && cp -r fx-suite-updates/. fx-suite/
    node fx-suite-patch.mjs fx-suite "$FX_S3_HOST"
    ;;
  run)
    shift
    check || { echo "The fx stack is not isolated: nothing was run."; exit 1; }
    # Both fx apps' dev servers compile on their first page: loaded once here, so a fixture's 30 s
    # page load meets a warm server, as on the bench.
    docker compose --profile fx run --rm browser-fx node --input-type=module -e "
import { openBrowser } from '/drive/scripts/lib/bench.mjs';
const b = await openBrowser();
for (const app of ['http://localhost:5176', 'http://localhost:5177']) {
  const p = await b.newPage();
  const t = Date.now();
  await p.goto(app + '/login', { timeout: 300000 });
  await p.waitForSelector('#email', { timeout: 300000 });
  console.log('warm ' + app + ' in ' + Math.round((Date.now() - t) / 1000) + ' s');
  await p.close();
}
await b.close();" 2>&1 | grep -E '^warm|Error'
    (cd fx-suite && ./regress.sh "$@")
    ;;
  prod)
    # The fx apps built (the "fx-prod" profile) in place of the dev servers, on the same ports.
    docker compose --profile fx stop app-fx app-fx-b
    docker compose --profile fx-prod up -d --build --no-deps app-fx-prod app-fx-b-prod
    ;;
  stop) docker compose --profile fx --profile fx-prod stop $FX_SERVICES app-fx-prod app-fx-b-prod ;;
  *)
    sed -n '2,20p' "$0"
    exit 2
    ;;
esac

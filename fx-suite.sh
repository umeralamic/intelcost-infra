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
#   ./fx-suite.sh release    every fixture, each in the mode it needs (D-814): the built apps 3 at a
#                            time, then the dev-server fixtures, then each failure again alone in its
#                            own mode; one summary in ./fx-suite/.regress/release-<time>/summary.txt.
#                            The run before any deploy to testers and any promotion to main
#   ./fx-suite.sh prepare    build every image a run uses and check every other is here (D-841): the
#                            release does this first and then reaches no registry
#   ./fx-suite.sh prod       the built apps in place of the dev servers, on the same ports
#   ./fx-suite.sh dev        the dev servers back
#   ./fx-suite.sh stop       stop the fx services (the database and the bucket stay)

set -u
cd "$(dirname "$0")"
TAG=fixtures-archive-2026-09-28
FX_SERVICES="api-fx api-fx-b worker-fx worker-fx-previews worker-fx-ocr beat-fx app-fx app-fx-b stripe-fake-fx"
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
print(_client().meta.endpoint_url, settings.s3_bucket, settings.database_url.rsplit('/', 1)[-1], repr(settings.mail_allowlist), settings.smtp_host, settings.stripe_api_base)" 2>/dev/null | tr -d '\r' | tail -1)
    # Stripe is the fx stack's own fake (N10, D-660): a fixture that pays never reaches the bench's.
    if [ "$out" != "http://$FX_S3_HOST:9000 intelcost-fx intelcost_fx '' mailhog http://stripe-fake-fx:12111" ]; then
      echo "FAIL $svc: $out (want http://$FX_S3_HOST:9000 intelcost-fx intelcost_fx '' mailhog http://stripe-fake-fx:12111)"
      bad=1
    else
      echo "ok   $svc: storage http://$FX_S3_HOST:9000/intelcost-fx, database intelcost_fx, mail to MailHog only, Stripe the fx fake"
    fi
  done
  return $bad
}

# --- the release run (D-814) ---------------------------------------------------------
# Fixtures that need the dev servers: they import the app's own modules (/src/...), drive the
# component gallery at /dev/ui, or check the dev override. Any other fixture that imports from /src
# or drives /dev/ui is found by name too, so a new one cannot be run in the wrong mode.
DEV_FIXTURES="f3-s1 f3-s13 f4-s2 f5-s3 f6-s4 f7-a r1-raster-text"
needs_dev() {
  case " $DEV_FIXTURES " in *" $1 "*) return 0 ;; esac
  local f="fx-suite/browser/$1.mjs"
  [ -f "$f" ] && grep -qE "import\(\s*[\"'\`]/src/|/dev/ui" "$f"
}
# Every fixture: the tag's standing ones and every one written since. Not fixtures: the harness's
# own (bench-code, bench-tidy), measurements and setups (load-probe, proof-backlog, rv-vol2-load,
# walkthrough-setup), f4-s12's three phases and the outage and restart phases (their runners'), and
# what the fx stack cannot run (fx-suite-patch.mjs, SKIPPED).
release_list() {
  local f name
  for f in fx-suite/browser/*.mjs fx-suite/browser/*.sh; do
    name=$(basename "$f"); name=${name%.mjs}; name=${name%.sh}
    case "$name" in
      bench-code | bench-tidy | load-probe | proof-backlog | rv-vol2-load | walkthrough-setup) continue ;;
      f4-s12 | f5-demo | *-outage | *-restart | f8-s5 | f4-s27) continue ;;
    esac
    echo "$name"
  done | sort -u
}
# Offline (D-841): set by the release once `prepare` has built and checked every image, so nothing after it builds,
# pulls or resolves an image. Every compose call of the run's own takes these.
OFFLINE_FLAGS=${FX_OFFLINE:+--no-build --pull never}
# The fx and fx-prod services a release starts, builds and runs.
BUILT="api-fx api-fx-b worker-fx worker-fx-previews worker-fx-ocr beat-fx app-fx app-fx-b app-fx-prod app-fx-b-prod browser-fx"
# What a compose log says when it reached a registry or built: none of it may follow `prepare` in a release.
REGISTRY_RE='load metadata for|resolve image config|Pulling|pulling from|Image .* (Building|Built)|failed to fetch|auth\.docker\.io'

# The fixtures a run's summary line names as failed: "N of M failed: a b c".
failed_in() { grep -h " failed: " "$@" | sed 's/.* failed: //' | tr ' ' '\n' | grep -v '^$' | sort -u; }
tail_line() { grep -E "^(all [0-9]+ passed|[0-9]+ of [0-9]+ failed)" "$1" | tail -1; }

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
    # Bench only: commits without the disk flush (D-699, README "Commits without the disk flush").
    docker compose exec -T postgres psql -U intelcost -d postgres -c "alter database intelcost_fx set synchronous_commit = off" >/dev/null
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
  prepare)
    # Every image the run uses, built from today's source or found here, before anything runs (D-841). The only step
    # of a release that may reach a registry; it fails the release rather than letting a run start without them.
    docker compose --profile fx --profile fx-prod build $BUILT || { echo "prepare: a build failed: nothing was run"; exit 1; }
    missing=0
    for img in $(docker compose --profile fx --profile fx-prod config --images 2>/dev/null | sort -u); do
      docker image inspect "$img" >/dev/null 2>&1 || docker pull -q "$img" >/dev/null 2>&1 || { echo "prepare: missing $img"; missing=1; }
    done
    [ "$missing" -eq 0 ] || exit 1
    echo "prepare: every image built or present"
    ;;
  run)
    shift
    check || { echo "The fx stack is not isolated: nothing was run."; exit 1; }
    # Both fx apps' dev servers compile on their first page: loaded once here, so a fixture's 30 s
    # page load meets a warm server, as on the bench.
    docker compose --profile fx run --rm ${FX_OFFLINE:+--pull never} browser-fx node --input-type=module -e "
import { openBrowser } from '/drive/scripts/lib/bench.mjs';
const b = await openBrowser();
for (const app of ['http://localhost:5176', 'http://localhost:5177']) {
  const p = await b.newPage();
  const t = Date.now();
  await p.goto(app + '/login', { timeout: 300000 });
  await p.waitForSelector('#email', { timeout: 300000 });
  // The settings pages too: each compiles on its first visit, past a fixture's 20 s wait (f3-s1 in the release, D-850).
  await p.evaluate(() => import('/src/pages/settings-pages.ts').then((m) => Promise.all(Object.values(m.settingsPages).map((load) => load()))));
  console.log('warm ' + app + ' in ' + Math.round((Date.now() - t) / 1000) + ' s');
  await p.close();
}
await b.close();" 2>&1 | grep -E '^warm|Error'
    (cd fx-suite && ./regress.sh "$@")
    ;;
  prod)
    # The fx apps built (the "fx-prod" profile) in place of the dev servers, on the same ports.
    docker compose --profile fx stop app-fx app-fx-b
    # Offline in a release (D-841): the images `prepare` built, started. Alone, built from today's source, a build
    # that cannot reach a registry tried once more (D-839). Either way done only when both ports serve.
    if [ -n "${FX_OFFLINE:-}" ]; then
      docker compose --profile fx-prod up -d $OFFLINE_FLAGS --no-deps app-fx-prod app-fx-b-prod || { echo "built apps would not start"; exit 1; }
    else
      docker compose --profile fx-prod up -d --build --no-deps app-fx-prod app-fx-b-prod \
        || { sleep 20; docker compose --profile fx-prod up -d --build --no-deps app-fx-prod app-fx-b-prod; } \
        || { echo "built apps would not build or start"; exit 1; }
    fi
    for _ in $(seq 1 60); do curl -sf -o /dev/null localhost:5176/ && curl -sf -o /dev/null localhost:5177/ && break; sleep 2; done
    curl -sf -o /dev/null localhost:5176/ && curl -sf -o /dev/null localhost:5177/ \
      || { echo "built apps not serving on 5176/5177"; exit 1; }
    ;;
  dev)
    # The dev servers back in place of the built apps (D-814), once they serve the app's own modules.
    docker compose --profile fx-prod stop app-fx-prod app-fx-b-prod
    docker compose --profile fx up -d $OFFLINE_FLAGS --no-deps app-fx app-fx-b
    # Docker Desktop can start a container while the port the built app just let go of is still held,
    # and then never publishes it (D-829): recreated once if 5176 or 5177 has no host binding.
    for c in app-fx app-fx-b; do
      [ "$(docker inspect "$(docker compose ps -q $c)" --format '{{len (index .NetworkSettings.Ports "5173/tcp")}}' 2>/dev/null)" = 0 ] \
        && { sleep 3; docker compose --profile fx up -d $OFFLINE_FLAGS --no-deps --force-recreate $c; }
    done
    for _ in $(seq 1 120); do curl -sf -o /dev/null localhost:5176/src/main.tsx && curl -sf -o /dev/null localhost:5177/src/main.tsx && break; sleep 2; done
    curl -sf -o /dev/null localhost:5176/src/main.tsx && curl -sf -o /dev/null localhost:5177/src/main.tsx \
      || { echo "dev servers not serving on 5176/5177"; exit 1; }
    ;;
  release)
    # Every fixture, each in the mode it needs, in one command (D-814). The run before any deploy to
    # testers and any promotion to main.
    shift
    [ -d fx-suite ] || { echo "Run ./fx-suite.sh setup first."; exit 1; }
    "$0" refresh
    out="fx-suite/.regress/release-$(date +%Y%m%d-%H%M)"
    mkdir -p "$out"
    # 0. Everything built and pulled first (D-841); from here on no step builds, pulls or resolves an image.
    "$0" prepare 2>&1 | tee "$out/0-prepare.log" | tail -1
    [ "${PIPESTATUS[0]}" -eq 0 ] || { echo "release: prepare failed (see $out/0-prepare.log): nothing was run" | tee "$out/summary.txt"; exit 1; }
    export FX_OFFLINE=1
    mapfile -t all < <(release_list)
    built=()
    devs=()
    for n in "${all[@]}"; do if needs_dev "$n"; then devs+=("$n"); else built+=("$n"); fi; done
    echo "release: ${#built[@]} fixtures on the built apps, ${#devs[@]} on the dev servers (${devs[*]})" | tee "$out/summary.txt"
    # 1. The built apps, 3 at a time: timings are the product's there (f5-s11, f5-s13).
    "$0" prod >"$out/0-prod.log" 2>&1 || { echo "release: the built apps would not start (see $out/0-prod.log): nothing was run" | tee -a "$out/summary.txt"; exit 1; }
    "$0" run "${built[@]}" 2>&1 | tee "$out/1-built.log"
    # 2. The dev servers: the fixtures that import the app's own modules, drive /dev/ui or its dev override.
    "$0" dev >"$out/0-dev.log" 2>&1
    "$0" run "${devs[@]}" 2>&1 | tee "$out/2-dev.log"
    # 3. Every failure again, alone and in its own mode: passing alone is timing, failing alone is looked at.
    mapfile -t again < <(failed_in "$out/1-built.log" "$out/2-dev.log")
    alone_pass=()
    alone_fail=()
    not_run=()
    for mode in dev prod; do
      batch=()
      for n in "${again[@]}"; do
        if { [ "$mode" = dev ] && needs_dev "$n"; } || { [ "$mode" = prod ] && ! needs_dev "$n"; }; then batch+=("$n"); fi
      done
      [ ${#batch[@]} -eq 0 ] && continue
      # A mode that will not come up runs none of its batch: those are reported as not run, not as failed (D-839).
      if ! "$0" "$mode" >>"$out/0-$mode.log" 2>&1; then not_run+=("${batch[@]}"); continue; fi
      for n in "${batch[@]}"; do
        if REGRESS_JOBS=1 "$0" run "$n" 2>&1 | tee -a "$out/3-alone.log" | grep -q "^all 1 passed"; then alone_pass+=("$n"); else alone_fail+=("$n"); fi
      done
    done
    # The built apps stay up: the bench's usual mode for a run.
    [ "$(docker compose ps -q app-fx-prod 2>/dev/null)" ] || "$0" prod >>"$out/0-prod.log" 2>&1
    {
      echo "built apps:   $(tail_line "$out/1-built.log")"
      echo "dev servers:  $(tail_line "$out/2-dev.log")"
      echo "alone, passed (timing): ${alone_pass[*]:-none}"
      echo "alone, failed (look at): ${alone_fail[*]:-none}"
      [ ${#not_run[@]} -gt 0 ] && echo "alone, not run (the mode would not come up, see 0-*.log): ${not_run[*]}"
      # Nothing after `prepare` reached a registry or built (D-841): the run's own logs say so.
      reached=$(cat "$out"/0-prod.log "$out"/0-dev.log "$out"/1-built.log "$out"/2-dev.log "$out"/3-alone.log 2>/dev/null | grep -cE "$REGISTRY_RE")
      echo "registry after prepare: $([ "$reached" -eq 0 ] && echo "none reached" || echo "$reached lines, see the 0-*.log files")"
      echo "logs: $out (one per fixture in fx-suite/.regress)"
    } | tee -a "$out/summary.txt"
    [ ${#alone_fail[@]} -eq 0 ] && [ ${#not_run[@]} -eq 0 ]
    ;;
  stop) docker compose --profile fx --profile fx-prod stop $FX_SERVICES app-fx-prod app-fx-b-prod ;;
  *)
    sed -n '2,20p' "$0"
    exit 2
    ;;
esac

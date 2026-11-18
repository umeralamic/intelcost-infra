#!/usr/bin/env bash
# The bench's health during a fixture run (D-1320, the founder's Q19): a bench service that exits stops the run and
# raises an alert, instead of only being logged (2026-11-18 08:47:49, worker and worker-pages died of watchfiles
# ENOMEM during m6-position's 27-minute run and nobody saw it for 20 minutes: morning-report-2026-11-21/fixtures/
# LATE-RUN.md). fx-suite.sh starts it for every `run` and `release`; it is not meant to be run by hand but --once.
#
#   ./fx-health-watch.sh --once                    check now: exit 0 if every watched service runs and the api's
#                                                  /docs answers 200 (retried for up to a minute: a save reloads it)
#   ./fx-health-watch.sh <run pid> <state file>    watch until <run pid> is gone (fx-suite.sh's own shell)
#
# Every FX_WATCH_INTERVAL seconds (default 12) it reads each watched container's state (docker inspect), and the api's
# /docs. A container that is not running (exited, restarting, removed or recreated: its id is the one recorded at the
# start) is an alert at once. /docs not 200 is an alert only once it has been down FX_WATCH_API_GRACE seconds (default
# 120): a source save reloads the api for 40-50 s with its container running, and that is not an outage.
#
# On an alert it:
#   1. writes fx-suite/.regress/ALERT-<UTC>.txt (the service, its state, exit code and exit time, its last log
#      lines) and that file's path into <state file>, which every fx-suite.sh shell of the run reads on exit;
#   2. prints a loud ALERT block on stderr;
#   3. sends TERM to the run's shell (it exits 3 after the command in hand), TERM to every process below it (the
#      fixture driver regress.sh, its fixtures, their compose clients) but this watch and the capture, and stops
#      each running browser-fx container (an fx service, D-1051), so the fixture in hand ends with it.
# It never restarts a bench service: that is the founder-gated exception, done by the main session after
# founder-active (CLAUDE.md rule 12).
#
# It stops when the run's pid is gone, and fx-suite.sh's exit trap kills it by pid: it is never left behind.
#
# Environment:
#   FX_WATCH_SERVICES    bench services watched (default "api app worker worker-pages beat")
#   FX_WATCH_CONTAINERS  test only: container names watched instead of the bench services (the D-1320 proof watched a
#                        throwaway container it stopped itself, never a bench service)
#   FX_WATCH_API_URL     the api's page (default http://localhost:8000/docs); empty: not checked
#   FX_WATCH_INTERVAL    seconds between polls (default 12)
#   FX_WATCH_API_GRACE   seconds /docs may be down before it is an alert (default 120)

set -u
cd "$(dirname "$0")"
INTERVAL=${FX_WATCH_INTERVAL:-12}
GRACE=${FX_WATCH_API_GRACE:-120}
API_URL=${FX_WATCH_API_URL-http://localhost:8000/docs}
ALERTS=fx-suite/.regress
mkdir -p "$ALERTS"

# label=container id, one per line: the ids recorded once, so a recreated container is a different one. One docker
# call each (the CLI takes 1-3 s a call here).
targets() {
  local c s all
  if [ -n "${FX_WATCH_CONTAINERS:-}" ]; then
    all=$(docker inspect -f '{{.Name}}={{.Id}}' $FX_WATCH_CONTAINERS 2>/dev/null | tr -d '\r/')
    for c in $FX_WATCH_CONTAINERS; do echo "$c=$(sed -n "s/^$c=//p" <<<"$all")"; done
  else
    all=$(docker compose ps -a --format '{{.Service}}={{.ID}}' 2>/dev/null | tr -d '\r')
    for s in ${FX_WATCH_SERVICES:-api app worker worker-pages beat}; do echo "$s=$(sed -n "s/^$s=//p" <<<"$all" | head -1)"; done
  fi
}

# Every recorded container's "id|status|restarting|exit code|oom killed|finished at", in one call.
STATES=
read_states() {
  local ids
  ids=$(cut -d= -f2 <<<"$TARGETS" | grep -v '^$' | tr '\n' ' ')
  STATES=
  [ -n "$ids" ] && STATES=$(docker inspect -f '{{.Id}}|{{.State.Status}}|{{.State.Restarting}}|{{.State.ExitCode}}|{{.State.OOMKilled}}|{{.State.FinishedAt}}' $ids 2>/dev/null | tr -d '\r')
  return 0
}
# One container's "status|restarting|exit code|oom killed|finished at" from the last read, or "missing" when gone.
state_of() {
  local l
  [ -n "$1" ] && l=$(grep -m1 "^$1" <<<"$STATES")
  [ -n "${l:-}" ] && echo "${l#*|}" || echo "missing"
}

api_code() { [ -n "$API_URL" ] && curl -s -m 10 -o /dev/null -w "%{http_code}" "$API_URL"; }

BAD_LABEL= BAD_ID= BAD_WHY= BAD_STATE=
api_down_since=
# One poll: 0 when healthy, 1 with BAD_* set.
poll() {
  local line label id st code now
  read_states
  while IFS= read -r line; do
    label=${line%%=*}
    id=${line#*=}
    st=$(state_of "$id")
    case "$st" in
      running\|false\|*) ;;
      *)
        BAD_LABEL=$label BAD_ID=$id BAD_STATE=$st
        case "$st" in
          missing) BAD_WHY="has no container (removed or recreated since the run started)" ;;
          restarting*) BAD_WHY="is restarting" ;;
          *) BAD_WHY="is ${st%%|*}" ;;
        esac
        return 1
        ;;
    esac
  done <<<"$TARGETS"
  [ -n "$API_URL" ] || return 0
  code=$(api_code)
  now=$(date +%s)
  if [ "$code" = 200 ]; then
    api_down_since=
    return 0
  fi
  [ -n "$api_down_since" ] || api_down_since=$now
  if [ $((now - api_down_since)) -ge "$GRACE" ]; then
    BAD_LABEL="api" BAD_ID=$(echo "$TARGETS" | sed -n 's/^api=//p') BAD_STATE=$(state_of "$BAD_ID")
    BAD_WHY="does not answer: $API_URL gave ${code:-no answer} for $((now - api_down_since)) s (container ${BAD_STATE%%|*})"
    return 1
  fi
  return 0
}

summary() {
  read_states
  echo "$TARGETS" | while IFS= read -r line; do printf '%s=%s ' "${line%%=*}" "$(state_of "${line#*=}" | cut -d'|' -f1)"; done
  [ -n "$API_URL" ] && printf 'api/docs=%s' "$(api_code)"
}

# Every pid below $1 (ps's PID and PPID columns; a leading status letter is dropped).
descendants() {
  ps -l 2>/dev/null | awk -v root="$1" '
    NR > 1 { sub(/^[^ 0-9]/, ""); split($0, f, " "); parent[f[1]] = f[2] }
    END {
      want[root] = 1; changed = 1
      while (changed) { changed = 0; for (p in parent) if (!(p in want) && (parent[p] in want)) { want[p] = 1; changed = 1 } }
      for (p in want) if (p != root) print p
    }'
}

stop_run() {
  local run_pid=$1 keep p c
  # Not stopped by the run's exit trap while it stops the run (the trap waits for it).
  trap '' TERM INT
  kill -TERM "$run_pid" 2>/dev/null
  # This watch and the capture (it ends by itself once the run's pid is gone) are left to end on their own.
  keep=" $$ $(descendants $$ | tr '\n' ' ') ${FX_CAPTURE_PID:-} $( [ -n "${FX_CAPTURE_PID:-}" ] && descendants "$FX_CAPTURE_PID" | tr '\n' ' ') "
  for p in $(descendants "$run_pid"); do
    case "$keep" in *" $p "*) continue ;; esac
    kill -TERM "$p" 2>/dev/null
  done
  # The fixture's own browser (compose run --rm browser-fx): stopped so the fixture ends with the run.
  for c in $(docker ps -q --filter label=com.docker.compose.service=browser-fx 2>/dev/null); do
    docker stop -t 10 "$c" >/dev/null 2>&1 && echo "health watch: stopped the fixture's browser container ${c:0:12}" >&2
  done
}

alert() {
  local run_pid=$1 state=$2 at file st exit_code oom finished
  at=$(date -u +%Y%m%dT%H%M%SZ)
  file="$ALERTS/ALERT-$at.txt"
  IFS='|' read -r st _ exit_code oom finished <<<"$BAD_STATE"
  {
    echo "ALERT $(date -u +%FT%TZ): bench service $BAD_LABEL $BAD_WHY (D-1320)"
    echo "container:  ${BAD_ID:0:12}"
    echo "state:      ${st:-missing}, exit code ${exit_code:-?}, OOM-killed ${oom:-?}, exited at ${finished:-?}"
    echo "every watched service now: $(summary)"
    echo "run:        fx-suite.sh pid $run_pid, stopped by the health watch: its fixtures and their browser containers"
    echo "            were stopped; nothing more runs"
    echo "NOT restarted: restarting a bench service is the main session's call, after founder-active (CLAUDE.md rule 12)."
    echo "  e.g. docker compose start $BAD_LABEL   (the same container, never up/recreate), then check it came back"
    echo "last log lines of $BAD_LABEL:"
    if [ -n "$BAD_ID" ]; then docker logs --tail 40 --timestamps "$BAD_ID" 2>&1 | tail -40 | sed 's/^/  /'; else echo "  (no container)"; fi
  } >"$file"
  echo "$file" >"$state"
  {
    echo
    echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    echo "ALERT  bench service $BAD_LABEL $BAD_WHY; exited at ${finished:-?} (exit ${exit_code:-?}). The run is stopped."
    grep -iE "allocate memory|out of memory|oom|killed|error" "$file" | grep -v '^ALERT\|^state\|^NOT' | tail -3 | sed 's/^ */ALERT  log: /'
    echo "ALERT  file: $file (D-1320). Not restarted: the main session restarts it after founder-active."
    echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  } >&2
}

TARGETS=$(targets)

if [ "${1:-}" = "--once" ]; then
  # No grace here: /docs must answer, though it is given a minute (a save's reload); a container that is not
  # running is final at once.
  GRACE=0
  for i in 1 2 3 4 5 6 7; do
    poll && { echo "health: ok   $(summary)"; exit 0; }
    { [ "$BAD_LABEL" = api ] && [ "${BAD_STATE%%|*}" = running ] && [ "$i" -lt 7 ]; } || break
    api_down_since=
    sleep 10
  done
  echo "health: DOWN bench service $BAD_LABEL $BAD_WHY ($(summary))"
  exit 1
fi

run_pid=${1:?usage: fx-health-watch.sh --once | <run pid> <state file>}
state=${2:?usage: fx-health-watch.sh <run pid> <state file>}
echo "health watch: pid $$ watching $(echo "$TARGETS" | cut -d= -f1 | tr '\n' ' ')${API_URL:+and $API_URL }every $INTERVAL s for run pid $run_pid" >&2
while kill -0 "$run_pid" 2>/dev/null; do
  if ! poll; then
    alert "$run_pid" "$state"
    stop_run "$run_pid"
    exit 1
  fi
  for _ in $(seq 1 "$INTERVAL"); do kill -0 "$run_pid" 2>/dev/null || exit 0; sleep 1; done
done
exit 0

#!/usr/bin/env bash
# Run browser fixtures as a regression, bench-code first (D-30), independent fixtures in
# parallel, then the ones that stop or restart a service, one at a time.
#
#   ./regress.sh                     the full list: every fixture (feature close-out, overnight)
#   ./regress.sh full                the same
#   ./regress.sh quick [name...]     the core smoke set, plus the fixtures a block touched
#                                    (end of each block)
#   ./regress.sh name [name...]      just these
#
#   REGRESS_JOBS=N   fixtures at a time in the parallel group (default 3: at 4 the host's
#                    CPU sat above 90% for most of the run; see "Measured")
#   REGRESS_CPU=1    sample the host's CPU every 5 s into $REGRESS_LOG/cpu.csv, and report it
#
# **Parallel.** Every fixture builds its own world: its own throwaway accounts (the owner,
# its seats, and window B's person), its own workspaces, and it reads only the mail sent to
# its own addresses (browser/lib/bench.mjs, "running beside other fixtures"). So fixtures
# run side by side, longest first (by the last run's times, in $REGRESS_LOG/times.tsv).
#
# **Serial, at the end.** A fixture in SERIAL stops, restarts or recreates a service every
# other fixture needs (api, api-b, Redis, MinIO, the worker) or drops the worker's queue.
# Those run one at a time, with nothing else running, after the parallel group.
#
# bench-code goes first and a failure stops the run: a fixture driven against a worker or
# an api still running older code reports on code that is not on disk, and every pass or
# fail after it would be about the wrong thing. Each fixture's full output is kept under
# $REGRESS_LOG (default ./.regress, git-ignored), one file per fixture, so a failure is
# read from what it printed rather than from a summary line.
#
# f4-s12 is left out: it has three phases with a database drive in the middle, run as its
# header describes. The *-outage and *-restart phases are run by their runners, never on
# their own. f4-s13 moved to f5-s4 and f4-s25 was retired with the Sheets block (F5-S9).
#
# Measured (2026-09-27, i7-8850H, 6 cores / 12 threads, Docker given about 15 GB): see
# intelcost-infra/README.md, "Run a regression".

set -u
cd "$(dirname "$0")"

LOG="${REGRESS_LOG:-./.regress}"
JOBS="${REGRESS_JOBS:-3}"
mkdir -p "$LOG"

# One run at a time. Each run ends by deleting every fixture account's workspaces
# (fx-cleanup), and its serial group stops the api, Redis and the worker: a second run
# beside it has its fixtures' data and services taken away mid-step (2026-09-27, when
# two runs' serial groups overlapped). The lock is a directory, which mkdir makes or
# refuses atomically; a lock left by a run that died is named, with its pid.
LOCK=./.regress.lock
if ! mkdir "$LOCK" 2>/dev/null; then
  holder=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
    echo "Another regress.sh is running (pid $holder). One at a time: wait for it to end."
    exit 2
  fi
  echo "Taking over a lock left by pid ${holder:-unknown}, which is not running."
fi
echo $$ >"$LOCK/pid"
cpu_pid=
trap 'rm -rf "$LOCK"; [ -n "$cpu_pid" ] && kill "$cpu_pid" 2>/dev/null' EXIT

# Stop, restart or recreate a shared service, or drop the worker's queue; or measure time.
#   f8-s2   stops the api for 30 s and restarts it     f8-s3   recreates the api on 2-minute tokens
#   f8-s5   stops Redis for 10 s                       f8-s8   restarts api-b
#   f8-s12  restarts the api                           f5-s2   stops the worker, drops its queue
#   f4-s27  stops MinIO for about three minutes
#   f5-s11  measures time (cold open, Load to sharp paint): pdf.js's work is CPU-bound,
#           and beside other browsers it measured the contention (1.9 s alone, 4.0 s in
#           parallel), so it runs alone and its numbers are the product's
#   f5-s15  measures time: a scale set in A reaches B's chip and quantities within a
#           second (723 ms alone, 1,243 ms beside two other fixtures at 92% CPU)
#   f5-s19  measures time: A's calibration reaches B within 2 s of Save (642 ms alone,
#           2,176 ms in the F5 close's full tier at 85% mean CPU)
SERIAL=(f8-s2 f8-s3 f8-s5 f8-s8 f8-s12 f5-s2 f4-s27 f5-s11 f5-s15 f5-s19)

# The core smoke set: one or two fixtures per surface, fast, run at the end of each block.
# f5-d51 is the founder's standing check (2026-09-27): equal runs across and down a
# landscape and a portrait sheet read the same (D-51).
QUICK=(f2-s3 f2-s9 f3-s1 f3-s8 f4-s5 f4-s7 f4-s17 f4-dialogs f5-s4 f5-s6 f5-s8 f5-d51 f8-s7 f8-s13 f8-s18 d37-links p19)

# Every standing fixture, by feature.
full_list() {
  local f name
  for f in browser/f2-*.mjs browser/f3-*.mjs browser/f4-*.mjs browser/f5-*.mjs browser/f8-*.mjs; do
    name=$(basename "$f" .mjs)
    case "$name" in
      f4-s12 | f5-demo | *-outage | *-restart) continue ;;
    esac
    echo "$name"
  done
  echo p19
  echo p20a
  echo d37-links
  echo d27-uploads   # D-27's sweep of abandoned uploads (a drive, no browser)
}

# --- what to run -------------------------------------------------------------------

mode=full
if [ $# -gt 0 ]; then
  case "$1" in
    full) shift ;;
    quick) mode=quick; shift ;;
    *) mode=named ;;
  esac
fi
case "$mode" in
  full) mapfile -t list < <(full_list) ;;
  quick) list=("${QUICK[@]}" "$@") ;;
  named) list=("$@") ;;
esac
# Once each, in the order given.
mapfile -t list < <(printf '%s\n' "${list[@]}" | awk '!seen[$0]++')

is_serial() { local s; for s in "${SERIAL[@]}"; do [ "$s" = "$1" ] && return 0; done; return 1; }
parallel=()
serial=()
for name in "${list[@]}"; do
  if is_serial "$name"; then serial+=("$name"); else parallel+=("$name"); fi
done

# Longest first, by the last run's times, so the long ones don't start last.
TIMES="$LOG/times.tsv"
if [ -s "$TIMES" ] && [ ${#parallel[@]} -gt 1 ]; then
  mapfile -t parallel < <(
    for name in "${parallel[@]}"; do
      printf '%s\t%s\n' "$(awk -F'\t' -v n="$name" '$1 == n { t = $2 } END { print t + 0 }' "$TIMES")" "$name"
    done | sort -t$'\t' -k1,1nr | cut -f2
  )
fi

# --- one fixture -------------------------------------------------------------------

# Runs one fixture into its log, then prints its result as one block, so lines from
# fixtures finishing together never interleave.
one() {
  local name=$1 started status summary
  started=$(date +%s)
  if [ -x "browser/$name.sh" ]; then
    # A phased fixture: its runner puts the database, storage and service steps between phases.
    "browser/$name.sh" >"$LOG/$name.log" 2>&1
  else
    docker compose --profile browser run --rm browser node "scripts/$name.mjs" >"$LOG/$name.log" 2>&1
  fi
  status=$?
  local took=$(($(date +%s) - started))
  summary=$(printf '%-14s %4ss  %s\n' "$name" "$took" "$(grep -E 'passed$' "$LOG/$name.log" | tail -1)"
    grep -A1 '^FAIL' "$LOG/$name.log" | sed 's/^/                    /')
  echo "$summary"
  printf '%s\t%s\t%s\n' "$name" "$took" "$status" >>"$LOG/.times.new"
  [ "$status" -eq 0 ] || echo "$name" >>"$LOG/.failed"
  return "$status"
}

# --- the run -----------------------------------------------------------------------

# F8 from S5 on needs window B's app and api (the realtime profile). Idempotent.
docker compose --profile realtime up -d api-b app-b >/dev/null 2>&1
# Choose pages' thumbnails run on their own worker (D-43). Idempotent.
docker compose up -d worker-previews >/dev/null 2>&1

drive_ws() { docker compose exec -T api sh -lc "cd /srv && python drives/bench-workspaces.py $*" 2>&1 | grep -E '^(snapshot|uuids|check|purged|FAIL)|Traceback'; }
# What the seeded account is in before the run: a fixture must never add to it. Kept
# here, on the host, because the outage fixtures restart the api container.
seeded_before=$(drive_ws snapshot | sed -n 's/^uuids //p')

rm -f "$LOG/.failed" "$LOG/.times.new"
if ! one bench-code >/dev/null; then
  echo "bench-code failed: the api or the worker runs old code. Nothing else was run."
  cat "$LOG/bench-code.log"
  exit 1
fi

# bench-code has checked the code: each fixture's own check may now wait longer for a
# busy worker (the browser service passes REGRESS through, lib/bench.mjs codeIsCurrent).
export REGRESS=1

if [ "${REGRESS_CPU:-0}" = "1" ] && command -v typeperf >/dev/null 2>&1; then
  typeperf "\\Processor(_Total)\\% Processor Time" -si 5 >"$LOG/cpu.csv" 2>/dev/null &
  cpu_pid=$!
fi

run_started=$(date +%s)
echo "${#list[@]} fixtures ($mode): ${#parallel[@]} in parallel, $JOBS at a time; then ${#serial[@]} one at a time"
echo

# The fixtures' own pids, never a bare `wait`: that also waits for the CPU sampler,
# which never ends, and hung two runs after their parallel group (2026-09-27).
pids=()
for name in "${parallel[@]}"; do
  while [ "$(jobs -rp | grep -cvx "${cpu_pid:-none}")" -ge "$JOBS" ]; do
    wait -n "${pids[@]}" 2>/dev/null
  done
  one "$name" &
  pids+=($!)
done
[ ${#pids[@]} -gt 0 ] && wait "${pids[@]}"
parallel_took=$(($(date +%s) - run_started))

# The bench is whole again: both apis answer and run the code on disk. A runner's
# `docker compose restart` returns before the api inside has finished starting (it runs
# its migrations first), and the next fixture once began against a half-started api.
bench_ready() {
  for _ in $(seq 1 120); do
    if curl -sf localhost:8000/health >/dev/null && curl -sf localhost:8010/health >/dev/null \
      && curl -sf localhost:8000/health/code | grep -q '"current":true'; then
      return 0
    fi
    sleep 1
  done
  echo "the bench did not come back healthy within 120 s"
  return 1
}

if [ ${#serial[@]} -gt 0 ]; then
  echo
  echo "--- one at a time: they stop or restart a service ---"
  for name in "${serial[@]}"; do
    bench_ready || { echo "$name" >>"$LOG/.failed"; continue; }
    one "$name"
  done
  bench_ready
fi
run_took=$(($(date +%s) - run_started))

if [ -n "$cpu_pid" ]; then
  kill "$cpu_pid" 2>/dev/null
  # typeperf writes quoted CSV, "time","value", after a header. Mean, 90th percentile, peak.
  cpu=$(awk -F'","' 'NF == 2 && $2 ~ /^[0-9.]+"?$/ { gsub(/"/, "", $2); print $2 + 0 }' "$LOG/cpu.csv" | sort -n \
    | awk '{ v[NR] = $1; s += $1; if ($1 > 90) hot++ } END { if (NR) { p = int(NR * 0.9); if (p < 1) p = 1; printf "host CPU over %d samples (5 s): mean %.0f%%, 90th percentile %.0f%%, peak %.0f%%, above 90%% in %d%% of samples", NR, s / NR, v[p], v[NR], 100 * hot / NR } }')
fi

# Fixtures that still seat members in the seeded workspace leave them; this removes
# them, and any fixture project, by name only (browser/bench-tidy.mjs says what it takes).
docker compose --profile browser run --rm browser node scripts/bench-tidy.mjs >"$LOG/bench-tidy.log" 2>&1 \
  && printf '%-14s %s\n' "bench-tidy" "$(grep -E '^removed' "$LOG/bench-tidy.log")"

# Every workspace a fixture's own account made goes, and the seeded account must not have
# gained one (the founder's switcher once held 860). A gain fails the run.
printf '%-14s %s\n' "fx-cleanup" "$(drive_ws purge-fx)"
seeded_check=$(drive_ws check "$seeded_before")
printf '%-14s %s\n' "seeded-ws" "$seeded_check"

# This run's times become the next run's order, keeping any fixture it did not run.
if [ -s "$LOG/.times.new" ]; then
  { cut -f1-2 "$LOG/.times.new"; [ -s "$TIMES" ] && awk -F'\t' 'NR == FNR { ran[$1] = 1; next } !($1 in ran)' "$LOG/.times.new" "$TIMES"; } \
    | grep -v '^bench-code' >"$TIMES.tmp" && mv "$TIMES.tmp" "$TIMES"
fi

failed=0
[ -s "$LOG/.failed" ] && failed=$(wc -l <"$LOG/.failed")
grep -q '^FAIL' <<<"$seeded_check" && failed=$((failed + 1))

echo
printf 'wall clock %dm%02ds (parallel group %dm%02ds, %s at a time)\n' \
  $((run_took / 60)) $((run_took % 60)) $((parallel_took / 60)) $((parallel_took % 60)) "$JOBS"
[ -n "${cpu:-}" ] && echo "$cpu"
if [ "$failed" -gt 0 ]; then
  echo "$failed of ${#list[@]} failed: $(tr '\n' ' ' <"$LOG/.failed" 2>/dev/null)"
else
  echo "all ${#list[@]} passed"
fi
echo "Full output: $LOG/"
[ "$failed" -eq 0 ]

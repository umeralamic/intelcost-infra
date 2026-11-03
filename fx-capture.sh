#!/usr/bin/env bash
# What a fixture run keeps of the stack, in its own folder, so a recreate erases nothing. Started by
# fx-suite.sh before the first fixture and stopped with it.
#
#   ./fx-capture.sh <folder> <the run's pid>
#
#   <service>.log   every api, worker and app container's log, timestamped; a new container appends
#   events.log      Docker's container events (die, oom, restart, start, destroy)
#   health.log      each api's /health, one line per change, with how long it was down
#   memory.tsv      every container's memory at the start, after every 25 fixtures and at the end
#   rss.tsv         at the same moments, each api and worker process's RSS and command line
#
# It stops when the run's pid is gone, and stops only the followers it started.

set -u
dir=$1
run_pid=$2
regress=fx-suite/.regress
mkdir -p "$dir"
stamp="$dir/.started"
: >"$stamp"

SERVICES="api-fx api-fx-b worker-fx worker-fx-previews worker-fx-ocr beat-fx app-fx app-fx-b app-fx-prod app-fx-b-prod"
PREFIX=intelcost-bench-
declare -A id_of pid_of left_at

docker events --filter type=container --filter "name=$PREFIX" \
  --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}} exit={{.Actor.Attributes.exitCode}}' 2>&1 \
  | grep --line-buffered -vE ' exec_' >>"$dir/events.log" &
events_pid=$!

sample() {
  local at
  at=$(date -u +%H:%M:%S)
  docker stats --no-stream --format '{{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' 2>/dev/null \
    | sed "s/^$PREFIX//; s/^/$at\t$1\t/" >>"$dir/memory.tsv"
  docker exec "${PREFIX}postgres-1" sh -c "grep -E '^(MemAvailable|SwapFree)' /proc/meminfo" 2>/dev/null \
    | awk -v at="$at" -v n="$1" '{printf "%s\t%s\tvm-%s\t%d MiB\n", at, n, $1, $2/1024}' >>"$dir/memory.tsv"
  # Each api and worker process's own RSS (Q121, D-967): read from /proc, no tracing.
  local svc
  for svc in api-fx api-fx-b worker-fx worker-fx-previews worker-fx-ocr; do
    docker exec "${PREFIX}${svc}-1" sh -c 'for p in /proc/[0-9]*; do
        r=$(awk "/^VmRSS/{print \$2}" $p/status 2>/dev/null); [ -n "$r" ] || continue
        c=$(tr "\0" " " <$p/cmdline 2>/dev/null | cut -c1-80); printf "%s\t%d MiB\t%s\n" "${p#/proc/}" $((r / 1024)) "$c"
      done' 2>/dev/null | awk -v at="$at" -v n="$1" -v s="$svc" '{printf "%s\t%s\t%s\t%s\n", at, n, s, $0}' >>"$dir/rss.tsv"
  done
}

finish() {
  sample end
  kill "$events_pid" 2>/dev/null
  for s in $SERVICES; do
    [ -n "${pid_of[$s]:-}" ] && kill "${pid_of[$s]}" 2>/dev/null
  done
}
trap finish EXIT

probe() {
  local name=$1 port=$2 was now file="$dir/health.log" since_var="down_$1"
  curl -sf -m 2 "http://localhost:$port/health" >/dev/null && now=up || now=down
  was=$(eval echo "\${state_$name:-}")
  if [ "$now" != "$was" ]; then
    if [ "$now" = down ]; then
      eval "$since_var=$(date +%s)"
      echo "$(date -u +%H:%M:%S) $name down" >>"$file"
    elif [ -n "$was" ]; then
      echo "$(date -u +%H:%M:%S) $name up after $(($(date +%s) - $(eval echo "\$$since_var"))) s" >>"$file"
    else
      echo "$(date -u +%H:%M:%S) $name up" >>"$file"
    fi
    eval "state_$name=$now"
  fi
}

sample start
done_at=0
while kill -0 "$run_pid" 2>/dev/null; do
  running=$(docker ps --no-trunc --format '{{.Names}} {{.ID}}' --filter "name=$PREFIX")
  for s in $SERVICES; do
    id=$(echo "$running" | awk -v n="$PREFIX$s-1" '$1 == n {print $2}')
    pid=${pid_of[$s]:-}
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      pid=""
      pid_of[$s]=""
      left_at[$s]=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    fi
    [ -n "$id" ] || continue
    # Followed already, or the same container coming back: from where this one stopped being read.
    if [ -z "$pid" ] || [ "$id" != "${id_of[$s]:-}" ]; then
      [ -n "$pid" ] && kill "$pid" 2>/dev/null
      since=()
      [ "$id" = "${id_of[$s]:-}" ] && since=(--since "${left_at[$s]:-}")
      docker logs -f --timestamps "${since[@]}" "$id" >>"$dir/$s.log" 2>&1 &
      pid_of[$s]=$!
      id_of[$s]=$id
    fi
  done
  probe api_fx 8020
  probe api_fx_b 8030
  finished=$(find "$regress" -maxdepth 1 -name '*.log' -newer "$stamp" 2>/dev/null | wc -l)
  if [ "$((finished / 25))" -gt "$((done_at / 25))" ]; then
    sample "$finished" &
  fi
  done_at=$finished
  sleep 2
done

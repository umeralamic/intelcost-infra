#!/usr/bin/env bash
# Run browser fixtures as a regression, bench-code first (D-30).
#
#   ./regress.sh                     every f4 fixture, f4-dialogs, f3-s1, f3-s3, f3-s12, then f8
#                                    (f8-s2 stops the api and f8-s3 retokens it: ~10 minutes)
#   ./regress.sh f4-s17 f4-s18       just these
#
# bench-code goes first and a failure stops the run: a fixture driven against a worker or
# an api still running older code reports on code that is not on disk, and every pass or
# fail after it would be about the wrong thing. Each fixture's full output is kept under
# $REGRESS_LOG (default ./.regress, git-ignored), one file per fixture, so a failure is
# read from what it printed rather than from a summary line.
#
# f4-s12 is left out of the default list: it has three phases with a database drive in
# the middle, run as its header describes. f4-s27 has phases too, and a runner that does
# them in order (browser/f4-s27.sh), so it is in the list and runs through that. It stops
# MinIO for about three minutes on purpose: run nothing else against the bench meanwhile.

set -u
cd "$(dirname "$0")"

LOG="${REGRESS_LOG:-./.regress}"
mkdir -p "$LOG"

fixture() {
  docker compose --profile browser run --rm browser node "scripts/$1.mjs" >"$LOG/$1.log" 2>&1
  local status=$?
  printf '%-12s %s\n' "$1" "$(grep -E 'passed$' "$LOG/$1.log" | tail -1)"
  grep -A1 '^FAIL' "$LOG/$1.log" | sed 's/^/             /'
  return $status
}

if ! fixture bench-code; then
  echo "bench-code failed: the api or the worker runs old code. Nothing else was run."
  exit 1
fi

if [ $# -gt 0 ]; then
  list=("$@")
else
  # Every F4 fixture in subtask order, then the F3 ones F4's gates lean on.
  list=()
  for f in $(ls browser/f4-s*.mjs | sort -t s -k3 -n); do
    name=$(basename "$f" .mjs)
    [ "$name" = "f4-s12" ] && continue
    list+=("$name")
  done
  # f4-dialogs: every dialog at a short window and a phone (not a subtask, so not f4-sN).
  list+=(f4-dialogs f3-s1 f3-s3 f3-s12)
  # F8 in subtask order. f8-s2 and f8-s3 have runners (the api stopped, restarted, and
  # put on 2-minute tokens), so they take the .sh path below; f8-s2-outage is run by
  # f8-s2.sh, never on its own.
  list+=(f8-s1 f8-s2 f8-s3 f8-s4)
fi

failed=0
for name in "${list[@]}"; do
  if [ -x "browser/$name.sh" ]; then
    # A phased fixture: its runner puts the database and storage steps between phases.
    "browser/$name.sh" >"$LOG/$name.log" 2>&1
    status=$?
    printf '%-12s %s\n' "$name" "$(grep -E 'passed$' "$LOG/$name.log" | tail -1)"
    grep -A1 '^FAIL' "$LOG/$name.log" | sed 's/^/             /'
    [ $status -eq 0 ] || failed=$((failed + 1))
  else
    fixture "$name" || failed=$((failed + 1))
  fi
done

echo
echo "$failed of ${#list[@]} fixtures failed. Full output: $LOG/"
[ "$failed" -eq 0 ]

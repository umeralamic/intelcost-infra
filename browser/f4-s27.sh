#!/usr/bin/env bash
# F4-S27: the nightly purge, end to end. Browser phases, database and storage steps,
# and one storage outage, in the order the acceptance criteria need them.
#
#   ./browser/f4-s27.sh            (from intelcost-infra/; regress.sh runs it too)
#
#   1. setup      three projects with files, one unfinished upload, two trashed
#   2. age        Old trash 31 days in Trash, Recent trash 5
#   3. before     Settings > Trash reads "at the next daily purge" / "in 25 days" (S26 AC2)
#   4. dry run    nothing deleted, one dry-run log row (AC3)
#   5. outage     MinIO stopped, the job runs: rows gone, failure logged, objects stay (AC2)
#   6. retry      MinIO back, the job runs: pass 1 clears it, 0 failed (AC1, AC2)
#   7. after      Trash and Activity in the browser
#   8. beat       the scheduler is up with the purge on its schedule (AC4)
#
# The storage failure is an outage rather than the spec's bucket policy: on MinIO the
# root credentials the bench uses are not subject to bucket policies, so a policy that
# denies delete would deny nothing. An unreachable store is the failure that happens.

set -u
cd "$(dirname "$0")/.."

node_phase() { docker compose --profile browser run --rm browser node scripts/f4-s27.mjs "$1" 2>&1; }
# The bench echoes SQL; keep the drive's own lines, and anything that went wrong. The exit
# status is the drive's, not grep's.
drive() {
  local out status
  out=$(docker compose exec -T api sh -lc "cd /srv && python drives/f4-s27.py $*" 2>&1)
  status=$?
  grep -E '^(aged|ran|dry|fail|clear|FAIL|[a-z-]+/[0-9a-f-]{36}/)|Traceback|Error' <<<"$out"
  return $status
}

total=0
passed=0
step() {  # step "title" command...
  local title=$1
  shift
  total=$((total + 1))
  local out
  out=$("$@")
  local status=$?
  # A browser phase exits 1 on a failed step, and the drive exits 1 with a FAIL line.
  if [ $status -eq 0 ] && ! grep -qE '^FAIL' <<<"$out"; then
    passed=$((passed + 1))
    echo "PASS  $total. $title"
  else
    echo "FAIL  $total. $title"
  fi
  sed 's/^/      /' <<<"$out" | grep -vE '^\s+(shot:|Container )' | grep -vE '^\s*$' | tail -6
}

# Stopped, not removed: the container keeps its data, as a store that went away and came
# back does. `--wait` returns once its healthcheck passes.
minio_up() { docker compose start minio >/dev/null 2>&1 && docker compose up -d --wait minio >/dev/null 2>&1; }

dry_run() { drive run dry && drive expect-dry; }
cleared() { drive run && drive expect-cleared $upload; }
beat_entry() {
  docker compose exec -T beat python -c "import shelve
s = shelve.open('/tmp/celerybeat-schedule')
e = s['entries']['purge-trashed-projects']
print('beat  entry', e.task, 'at', e.schedule)" 2>&1
}

echo
echo "=== f4-s27 ==="
step "setup: Old trash (a file and an unfinished upload), Recent trash, Live" node_phase setup
step "age: Old trash 31 days in Trash, Recent trash 5" drive age
step "S26 AC2: the Trash tab reads the ages" node_phase before
upload=$(drive upload | tail -1)
step "AC3: a dry run deletes nothing and logs dry_run" dry_run
docker compose stop minio >/dev/null 2>&1
step "AC2: storage down: rows gone, failure logged" drive run
minio_up || echo "      MinIO did not come back"
step "AC2: the failure left the objects in place" drive expect-failed
step "AC1/AC2: storage back, run again: pass 1 clears it, 0 failed" cleared
step "after: Trash tab and Activity" node_phase after
step "AC4: beat is up with the purge on its schedule" beat_entry

echo
echo "$passed/$total passed"
[ "$passed" -eq "$total" ]

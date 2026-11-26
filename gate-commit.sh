#!/usr/bin/env bash
# Gate and commit (D-1367): run a repo's full gates, read every exit code, and commit only when all are 0.
#
#   ./gate-commit.sh app --owner D-1368 -m "D-1368 (app): ..." [-m "..."]
#   ./gate-commit.sh api --owner D-1368 -F message.txt
#   ./gate-commit.sh app --owner D-1368 --dry-run          (the gates and the stamp, no commit)
#
# app: npm run lint, npm run typecheck, npm run build (host). api: ruff check ., ruff format --check ., mypy app and
# alembic heads = exactly one head, in the bench api container after its own founder-active quiet (poetry on the
# host instead, when it exists). Each gate runs with pipefail and its exit code is read; the first non-zero stops.
#
# Refuses before any gate: a branch other than umer-dev; an unstaged change to a tracked file or an untracked file
# that is not ignored (the gates read the working tree, so it must be the staged tree); nothing staged (unless
# --dry-run); a quantity table running. Holds the heavy lock (adopted if --owner already holds it) for the gates.
#
# All 0: writes the pass stamp E:\Intelcost\.private\gate-pass\<repo>-<tree> (tree = git write-tree of the index)
# and commits. The founder gate hook refuses a plain `git commit` in the app or api repo unless such a stamp exists
# for exactly the staged tree, so a commit after a failing gate, or after staging something new, is refused.

set -u
set -o pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"
PASS_DIR="${INTELCOST_GATE_PASS:-$root/.private/gate-pass}"

die() { echo "gate-commit: REFUSED: $*" >&2; exit 1; }

repo_kind="${1:-}"
shift || true
case "$repo_kind" in
  app) repo="$root/intelcost-app-react" ;;
  api) repo="$root/intelcost-app-fastapi" ;;
  *) echo "usage: gate-commit.sh app|api --owner D-NNNN [--dry-run] (-m msg ... | -F file)" >&2; exit 2 ;;
esac
owner=''
dry=''
msg=()
while [ $# -gt 0 ]; do
  case "$1" in
    --owner) owner="${2:-}"; shift 2 ;;
    --dry-run) dry=1; shift ;;
    -m|-F) [ -n "${2:-}" ] || die "$1 needs a value"; msg+=("$1" "$2"); shift 2 ;;
    *) die "unknown argument '$1' (only --owner, --dry-run, -m, -F)" ;;
  esac
done
[ -n "$owner" ] || die "--owner D-NNNN is required (the heavy lock's owner)"
[ -n "$dry" ] || [ ${#msg[@]} -gt 0 ] || die "a commit message is required (-m or -F), or --dry-run"

cd "$repo" || die "no repo at $repo"
branch="$(git branch --show-current)"
[ "$branch" = "umer-dev" ] || die "$repo_kind is on '$branch', not umer-dev"
unstaged="$(git diff --name-only)"
[ -z "$unstaged" ] || die "unstaged changes to tracked files (the gates would read them, the commit would not):
$unstaged"
untracked="$(git ls-files --others --exclude-standard)"
[ -z "$untracked" ] || die "untracked files that are not ignored (the gates would read them, the commit would not):
$untracked"
if [ -z "$dry" ] && git diff --cached --quiet; then die "nothing staged"; fi
tree="$(git write-tree)" || die "git write-tree failed (a conflict in the index?)"

qt="$(bash "$here/lock.sh" qt-running)" && die "$qt; wait for it to finish (./lock.sh status)"
lk="$(bash "$here/lock.sh" acquire heavy "$owner")" || die "heavy lock: $lk"
case "$lk" in acquired*) took_heavy=1 ;; *) took_heavy='' ;; esac
finish() {
  local rc=$?
  [ -n "$took_heavy" ] && bash "$here/lock.sh" release heavy "$owner" >/dev/null
  exit "$rc"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

start="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
summary=''
# gate <name> <command...>: run it, print its exit code, stop the run on non-zero.
gate() {
  local name="$1" rc
  shift
  echo "== gate $name: $*"
  "$@"
  rc=$?
  echo "== gate $name: exit $rc"
  summary="$summary $name=$rc"
  [ "$rc" -eq 0 ] || die "gate $name exited $rc: no pass stamp, no commit"
}

if [ "$repo_kind" = app ]; then
  gate lint npm run lint
  gate typecheck npm run typecheck
  gate build npm run build
elif command -v poetry >/dev/null 2>&1; then
  gate ruff_check poetry run ruff check .
  gate ruff_format poetry run ruff format --check .
  gate mypy poetry run mypy app
  heads="$(poetry run alembic heads 2>&1)"
  rc=$?
  echo "$heads"
  [ "$rc" -eq 0 ] || die "alembic heads exited $rc"
  n="$(printf '%s\n' "$heads" | grep -c '(head)')"
  [ "$n" -eq 1 ] || die "alembic heads shows $n heads, not exactly one"
  summary="$summary alembic_heads=1"
else
  # The bench api container: one exec after its own quiet (hard rule 12; the stamp is spent at once).
  ( cd "$here" && INTELCOST_GUARD_LIST="${INTELCOST_GUARD_LIST:-$root/.private/guard-list.json}" ./founder-active.sh ) ||
    die "founder-active did not answer quiet: no exec into the api container; wait and run it again"
  rm -f "$root/.private/founder-quiet.stamp"
  out="$(cd "$here" && docker compose exec -T api sh -c 'cd /srv
ruff check .; a=$?
ruff format --check .; b=$?
mypy app; c=$?
h=$(alembic heads 2>&1); d=$?
printf "%s\n" "$h"
n=$(printf "%s\n" "$h" | grep -c "(head)")
echo "GATES ruff_check=$a ruff_format=$b mypy=$c alembic_heads_exit=$d heads=$n"' 2>&1)"
  rc=$?
  printf '%s\n' "$out"
  [ "$rc" -eq 0 ] || die "the exec into the api container exited $rc"
  line="$(printf '%s\n' "$out" | grep '^GATES ' | tail -1)"
  [ -n "$line" ] || die "the container printed no gate exit codes"
  for kv in ${line#GATES }; do
    k="${kv%%=*}"
    v="${kv#*=}"
    case "$k" in
      heads) [ "$v" = 1 ] || die "alembic heads shows $v heads, not exactly one" ;;
      *) [ "$v" = 0 ] || die "gate $k exited $v: no pass stamp, no commit" ;;
    esac
  done
  summary="${line#GATES }"
fi

# Every gate 0. The tree must still be the one the gates read.
[ "$(git write-tree)" = "$tree" ] || die "the index changed during the gates"
[ -z "$(git diff --name-only)$(git ls-files --others --exclude-standard)" ] || die "the working tree changed during the gates"
mkdir -p "$PASS_DIR"
find "$PASS_DIR" -maxdepth 1 -type f -mtime +2 -delete 2>/dev/null
printf 'gate pass %s tree %s head %s, %s to %s, owner %s:%s\n' "$repo_kind" "$tree" "$(git rev-parse HEAD)" "$start" \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$owner" "$summary" >"$PASS_DIR/$repo_kind-$tree"
echo "gate-commit: every gate exited 0 (${summary# }); pass stamp $repo_kind-${tree:0:12}"
if [ -n "$dry" ]; then
  echo "gate-commit: --dry-run, no commit (a plain git commit of exactly this staged tree now passes the hook)"
  exit 0
fi
git commit "${msg[@]}"

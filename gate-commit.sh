#!/usr/bin/env bash
# Gate and commit (D-1367): run a repo's full gates, read every exit code, and commit only when all are 0.
#
#   ./gate-commit.sh app --owner D-1368 -m "D-1368 (app): ..." [-m "..."]
#   ./gate-commit.sh api --owner D-1368 -F message.txt
#   ./gate-commit.sh app --owner D-1368 --dry-run          (the gates and the stamp, no commit)
#   ./gate-commit.sh app --owner D-1368 --verify-head      (D-1373: the gates on a clean HEAD and its stamp, no
#                                                           commit; what a push needs after a merge, cherry-pick,
#                                                           revert or rebase; gate-push.sh calls it)
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
#
# D-1400 (the founder's D-1397 10: a gate change voids older pass stamps of its kind): every stamp this writes has a
# second line "gates <hash>", the hash of the gate scripts that produced it (`qt-key.sh --gates`: gate-commit.sh,
# gate-push.sh and qt-key.sh as on disk). The hook and gate-push.sh count a stamp only when that line equals the
# current hash, so a stamp made before a change to any of them no longer counts. A gate script that changes while the
# gates run leaves no stamp.
#
# --verify-head (D-1373) also refuses when anything is staged or a merge, rebase, cherry-pick, revert or am is in
# progress, so the working tree the gates read is exactly HEAD's tree; the stamp is then HEAD's tree, which the hook
# needs before a `git push` of umer-dev.
#
# D-1381 (the founder's D-1380 Q9): infra and market (intelcost-market-next) take --verify-head only (their commits
# stay plain `git commit`; their gate is at the push, gate-push.sh):
#   ./gate-commit.sh infra --owner D-1381 --verify-head
#   ./gate-commit.sh market --owner D-1381 --verify-head
# infra: bash -n of every tracked *.sh; node --check of every tracked *.js, *.mjs, *.cjs; a Python syntax check
# (ast.parse, nothing written) of every tracked *.py in a throwaway python:3.14-slim container (--pull never,
# --network none, the repo mounted read-only; python is not on the host); the names scan (names_scan below: every
# tracked path, text file and office file, substring, any case, against the client and book lists; since D-1387 every
# hit refuses, already-pushed ones too, and so does any office file or (D-1400) CSV tracked under workspace/docs/reference/; counts
# only, the file list in E:\Intelcost\.private\gate-scan-infra.txt); no private file tracked (.private/, .locks/, the
# guard list, the denylists, the stamps, a .env other than *.example); and, when the pushed range
# (origin/umer-dev..HEAD) touches a quantity-table input, a QT pass for HEAD's files (qt-<qt-key.sh --index>, at most
# 24 h old).
# market: the same names scan (D-1388, the founder's D-1384 Q5; list in .private/gate-scan-market.txt), npm run lint,
# npm run build (never prettier). The bench's marketing service runs `next dev` with .next in a container volume, so
# a host build reloads nothing it serves.

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
  infra) repo="$here" ;;
  market) repo="$root/intelcost-market-next" ;;
  *) echo "usage: gate-commit.sh app|api --owner D-NNNN [--dry-run | --verify-head] (-m msg ... | -F file)
       gate-commit.sh infra|market --owner D-NNNN --verify-head" >&2; exit 2 ;;
esac
owner=''
dry=''
verify_head=''
msg=()
while [ $# -gt 0 ]; do
  case "$1" in
    --owner) owner="${2:-}"; shift 2 ;;
    --dry-run) dry=1; shift ;;
    --verify-head) dry=1; verify_head=1; shift ;;
    -m|-F) [ -n "${2:-}" ] || die "$1 needs a value"; msg+=("$1" "$2"); shift 2 ;;
    *) die "unknown argument '$1' (only --owner, --dry-run, --verify-head, -m, -F)" ;;
  esac
done
[ -n "$owner" ] || die "--owner D-NNNN is required (the heavy lock's owner)"
[ -n "$dry" ] || [ ${#msg[@]} -gt 0 ] || die "a commit message is required (-m or -F), or --dry-run"
[ -z "$verify_head" ] || [ ${#msg[@]} -eq 0 ] || die "--verify-head makes no commit: no -m or -F"
case "$repo_kind" in
  infra|market) [ -n "$verify_head" ] || die "$repo_kind takes --verify-head only (its commits are plain git commits; its gate runs at the push, gate-push.sh)" ;;
esac

gates_hash="$(bash "$here/qt-key.sh" --gates)" && [ -n "$gates_hash" ] || die "qt-key.sh --gates gave no hash of the gate scripts"
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
if [ -n "$verify_head" ]; then
  git diff --cached --quiet || die "--verify-head: changes are staged (HEAD's tree is not what the gates would read)"
  gd="$(git rev-parse --git-dir)"
  for op in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply; do
    [ -e "$gd/$op" ] && die "--verify-head: a merge, cherry-pick, revert, rebase or am is in progress ($op)"
  done
  [ "$tree" = "$(git rev-parse 'HEAD^{tree}')" ] || die "--verify-head: the index is not HEAD's tree"
fi

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

# ---- the infra gate (D-1381) ------------------------------------------------------------------------------
infra_sh() { # bash -n of every tracked *.sh
  local f n=0 bad=0
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    n=$((n + 1))
    bash -n "$f" || { echo "  bash -n failed: $f"; bad=$((bad + 1)); }
  done < <(git -c core.quotePath=false ls-files -- '*.sh')
  echo "  $n shell scripts, $bad with a syntax error"
  [ "$n" -gt 0 ] && [ "$bad" -eq 0 ]
}
infra_js() { # node --check of every tracked *.js, *.mjs, *.cjs (8 at a time)
  local n bad out
  n=$(git ls-files -- '*.js' '*.mjs' '*.cjs' | grep -c .)
  out=$(git ls-files -z -- '*.js' '*.mjs' '*.cjs' |
    xargs -0 -P 8 -n 1 sh -c 'node --check "$1" >/dev/null 2>&1 || echo "NODECHECKFAIL $1"' _)
  bad=$(printf '%s\n' "$out" | grep -c '^NODECHECKFAIL ')
  printf '%s\n' "$out" | grep '^NODECHECKFAIL ' | sed 's/^NODECHECKFAIL /  node --check failed: /'
  echo "  $n script files, $bad with a syntax error"
  [ "$n" -gt 0 ] && [ "$bad" -eq 0 ]
}
infra_py() { # ast.parse of every tracked *.py, in a throwaway python container (python is not on the host)
  local img=python:3.14-slim
  docker image inspect "$img" >/dev/null 2>&1 || { echo "  no local image $img (docker pull it once)"; return 1; }
  git -c core.quotePath=false ls-files -- '*.py' |
    MSYS_NO_PATHCONV=1 docker run --rm -i --pull never --network none -v "$(cygpath -m "$repo"):/src:ro" -w /src "$img" \
      python -c '
import ast, sys
names = [l for l in sys.stdin.read().splitlines() if l]
bad = 0
for p in names:
    try:
        with open(p, "rb") as f:
            ast.parse(f.read(), p)
    except (SyntaxError, ValueError) as e:
        bad += 1
        print("  syntax error: %s line %s" % (p, getattr(e, "lineno", "?")))
print("  %d python files, %d with a syntax error" % (len(names), bad))
sys.exit(1 if bad or not names else 0)'
}
names_scan() { # <infra|market>: the client and book names in HEAD. Counts only on screen, the file list in .private
  # (never a term). D-1381; D-1387: every hit refuses, already-pushed ones too (no WARN path); D-1388: marketing too.
  #   - every tracked path and every tracked text file of HEAD, substring, any case, against both lists;
  #   - office files (xlsx, xlsm, xlsb, docx, pptx, ods, odt, odp unpacked; xls, doc, ppt read raw), the same;
  #   - the book list reads a package-lock.json with its "integrity": "sha...-<base64>" values blanked (D-1388: a
  #     random hash can hold any three letters); the client list reads it raw, like every other file.
  #   - infra (D-1387, D-1400): no office file and no CSV tracked under workspace/docs/reference/ at all.
  local kind="$1" scan n_path n_text n_office n_ref f c list lock
  local priv="${INTELCOST_PRIVATE:-$root/.private}"
  local OFFICE='\.(xlsx|xlsm|xlsb|xls|ods|docx|doc|odt|pptx|ppt|odp)$'
  scan="$priv/gate-scan-$kind.txt"
  local pc pb
  pc=$(mktemp)
  pb=$(mktemp)
  for list in client book; do
    f="$priv/$list-denylist.txt"
    [ -s "$f" ] || { rm -f "$pc" "$pb"; echo "  missing or empty name list: ${f##*/}"; return 1; }
    tr -d '\r' <"$f" | grep -v '^[[:space:]]*#' | sed 's/[[:space:]]*$//' | grep -v '^$' >"$([ "$list" = client ] && echo "$pc" || echo "$pb")"
  done
  [ -s "$pc" ] && [ -s "$pb" ] || { rm -f "$pc" "$pb"; echo "  a name list has no terms"; return 1; }
  # The names live only in those private files (no name is written here; the client list holds every one ordered).
  {
    echo "# D-1381/D-1387/D-1388 names scan of $kind HEAD $(git rev-parse --short HEAD), $(date -u +%Y-%m-%dT%H:%M:%SZ): files only"
    git -c core.quotePath=false ls-files | grep -i -F -f "$pc" | sed 's/^/path (client list): /'
    git -c core.quotePath=false ls-files | grep -i -F -f "$pb" | sed 's/^/path (book list): /'
    git -c core.quotePath=false grep -l -I -i -F -f "$pc" HEAD -- . | sed 's/^HEAD:/text (client list): /'
    git -c core.quotePath=false grep -l -I -i -F -f "$pb" HEAD -- . ':(exclude,glob)**/package-lock.json' |
      sed 's/^HEAD:/text (book list): /'
    while IFS= read -r lock; do
      [ -n "$lock" ] || continue
      git show "HEAD:$lock" | sed -E 's/"integrity": *"sha[0-9]+-[A-Za-z0-9+/=]+"/"integrity": ""/' |
        grep -q -i -F -f "$pb" && echo "text (book list, integrity hashes blanked): $lock"
    done < <(git -c core.quotePath=false ls-files -- 'package-lock.json' '**/package-lock.json')
  } >"$scan"
  n_path=$(grep -c '^path ' "$scan")
  n_text=$(grep -c '^text ' "$scan")
  n_office=0
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    if unzip -l "$f" >/dev/null 2>&1; then
      c=$(unzip -p "$f" 2>/dev/null | grep -a -o -i -F -f "$pc" -f "$pb" | grep -c .)
    else
      c=$(grep -a -o -i -F -f "$pc" -f "$pb" "$f" | grep -c .)
    fi
    [ "$c" -gt 0 ] || continue
    n_office=$((n_office + 1))
    echo "office ($c hits): $f" >>"$scan"
  done < <(git -c core.quotePath=false ls-files | grep -i -E "$OFFICE")
  n_ref=0
  local ref_note=''
  if [ "$kind" = infra ]; then
    # D-1400 (the founder's D-1397 7): CSV there too.
    git -c core.quotePath=false ls-files -- workspace/docs/reference | grep -i -E "$OFFICE|\\.csv\$" |
      sed 's/^/office or CSV file tracked under docs\/reference (D-1387, D-1400: never tracked): /' >>"$scan"
    n_ref=$(grep -c '^office or CSV file tracked under docs/reference' "$scan")
    ref_note="; $n_ref office or CSV files tracked under workspace/docs/reference"
  fi
  rm -f "$pc" "$pb"
  echo "  names: $n_path paths, $n_text text files, $n_office office files with a listed name$ref_note; list: .private/${scan##*/}"
  [ "$n_path" -eq 0 ] && [ "$n_text" -eq 0 ] && [ "$n_office" -eq 0 ] && [ "$n_ref" -eq 0 ]
}
infra_names() { names_scan infra; }
infra_private() { # nothing private tracked
  local hits
  hits=$(git -c core.quotePath=false ls-files |
    grep -E -i '(^|/)\.(private|locks)(/|$)|(^|/)(guard-list[^/]*\.json(\.bak[^/]*)?|client-denylist[^/]*|book-denylist[^/]*|founder-quiet\.stamp|founder-gate\.log|catalog-convert-patterns\.json|screen-names\.json|fx-protected-ids\.json)$|(^|/)\.env($|\.)' |
    grep -v -E '\.example$')
  if [ -n "$hits" ]; then
    printf '  tracked private file: %s\n' $hits
    return 1
  fi
  echo "  no .private/, .locks/, private list, stamp or .env (other than *.example) tracked"
}
infra_qt() { # a QT pass for HEAD's files when the pushed range touches a quantity-table input
  local base key
  base=$(git rev-parse --verify -q refs/remotes/origin/umer-dev)
  if [ -n "$base" ]; then
    if ! git diff --name-only "$base" HEAD | bash "$here/qt-key.sh" --names-touch; then
      echo "  the pushed range (origin/umer-dev ${base:0:12}..HEAD) touches no quantity-table input"
      return 0
    fi
  fi
  key=$(bash "$here/qt-key.sh" --index) || { echo "  qt-key.sh --index failed"; return 1; }
  if fresh_pass "$PASS_DIR/qt-$key"; then
    echo "  the pushed range touches quantity-table inputs; a QT passed on HEAD's files (qt-${key:0:12})"
    return 0
  fi
  echo "  the pushed range ${base:+(origin/umer-dev ${base:0:12}..HEAD) }touches quantity-table inputs and no quantity table"
  echo "  passed (exit 0, 0 FAIL) on HEAD's files in the last 24 h (key ${key:0:12}). Run from intelcost-infra/:"
  echo "    QT_OWNER=<your D-number> ./quantity-table.sh"
  return 1
}
fresh_pass() { # <file>: exists and at most 24 h old (the hook's own test)
  [ -f "$1" ] || return 1
  local t
  t=$(date -r "$1" +%s 2>/dev/null) || return 1
  [ $(($(date -u +%s) - t)) -le 86400 ]
}

if [ "$repo_kind" = infra ]; then
  gate shell_syntax infra_sh
  gate node_check infra_js
  gate python_syntax infra_py
  gate names infra_names
  gate private_files infra_private
  gate qt_pass infra_qt
elif [ "$repo_kind" = market ]; then
  gate names names_scan market
  gate lint npm run lint
  gate build npm run build
elif [ "$repo_kind" = app ]; then
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
[ "$(bash "$here/qt-key.sh" --gates)" = "$gates_hash" ] || die "a gate script (gate-commit.sh, gate-push.sh, qt-key.sh) changed during the gates: no pass stamp"
mkdir -p "$PASS_DIR"
find "$PASS_DIR" -maxdepth 1 -type f -mtime +2 -delete 2>/dev/null
printf 'gate pass %s tree %s head %s, %s to %s, owner %s:%s\ngates %s\n' "$repo_kind" "$tree" "$(git rev-parse HEAD)" "$start" \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$owner" "$summary" "$gates_hash" >"$PASS_DIR/$repo_kind-$tree"
echo "gate-commit: every gate exited 0 (${summary# }); pass stamp $repo_kind-${tree:0:12}, gates ${gates_hash:0:12}"
if [ -n "$verify_head" ]; then
  echo "gate-commit: --verify-head, no commit (HEAD $(git rev-parse --short HEAD), tree ${tree:0:12}: a git push of it now passes the hook)"
  exit 0
fi
if [ -n "$dry" ]; then
  echo "gate-commit: --dry-run, no commit (a plain git commit of exactly this staged tree now passes the hook)"
  exit 0
fi
git commit "${msg[@]}"

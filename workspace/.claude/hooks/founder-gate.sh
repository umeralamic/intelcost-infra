#!/usr/bin/env bash
# PreToolUse gate (D-1266, CLAUDE.md hard rule 12): no app or api source save and no bench migration without a
# fresh "quiet" from intelcost-infra/founder-active.sh.
#
# A save reloads what the founder's browser uses (the app dev server, the api, the workers), and a migration
# changes the database under him. founder-active.sh writes the UTC epoch to the stamp file on a quiet answer
# (E:\Intelcost\.private\founder-quiet.stamp, outside git; INTELCOST_FOUNDER_STAMP overrides it) and removes it
# on active or unknown. This gate lets a gated call through only while the stamp is at most 120 s old, and
# spends it (D-1284): every gated call needs its own fresh quiet, so a batch re-checks before each save.
#
# What is gated is decided by founder-gate.js beside this file (the .js of this script's own name): Edit/Write/
# MultiEdit/NotebookEdit on app or api source, shell writes into the same paths, git commands that rewrite the app
# or api working tree, a bench migration, and (D-1279) a docker exec or docker cp into a bench app or api
# container (compose services api, app, worker*; read-only execs such as the ruff/mypy gates included), and (Q27) a
# docker compose run of those services or a docker run/create of their intelcost-bench-* images. Workspace
# docs, infra, the scratchpad, test data, fx containers and every other read pass untouched.
#
# D-1367 (the founder's D-1365 "enforce, don't just state"):
#   - While a running quantity table holds the app lock (its live marks in E:\Intelcost\.locks\app.lock, written by
#     intelcost-infra/lock.sh; INTELCOST_LOCKS overrides the folder), every gated call above is refused, before the
#     stamp is read: a fresh quiet does not lift it and is not spent. Marks of a dead QT (stale) do not refuse.
#   - A `git commit` in the app or api repo is refused unless intelcost-infra/gate-commit.sh left a pass stamp
#     (E:\Intelcost\.private\gate-pass\<app|api>-<tree>, at most 24 h old; INTELCOST_GATE_PASS overrides the folder)
#     for exactly the staged tree (`git write-tree`); -a, -i, -o and a pathspec are refused (another tree). An infra
#     commit whose staged files touch the QT's inputs needs the QT's pass stamp qt-<key> (intelcost-infra/qt-key.sh).
#
# D-1373 (the founder's D-1371 Q7, Q9):
#   - A `git push` in the app or api repo is refused unless it is exactly `git push [-n|--dry-run|-v|-q|--porcelain]
#     origin umer-dev` and a gate pass stamp <app|api>-<tree> at most 24 h old exists for the tree of the local
#     umer-dev (the commit the push sends). A merge, cherry-pick, revert or rebase leaves a tree no gate read, so its
#     push waits for `intelcost-infra/gate-push.sh app|api --owner D-NNNN` (gates on HEAD, then the push).
#   - The QT inputs of the infra commit rule now include lock.sh, gate-commit.sh, gate-push.sh, qt-key.sh and the
#     hook mirror workspace/.claude/hooks/ (qt-key.sh hashes these live hooks under their mirror paths).
#
# D-1381 (the founder's D-1380 Q9): the push rule above covers all four repos: app, api, infra (the workspace mirror
# is in it) and the marketing site (intelcost-market-next), with stamps infra-<tree> and market-<tree> written by
# `intelcost-infra/gate-push.sh infra|market --owner D-NNNN` (gate-commit.sh --verify-head lists their gates).
#
# D-1388 (the founder's D-1384 Q6): every git push in the legacy repo (intelcost/, read-only: fetch and pull only)
# is refused, in any form, --dry-run included.
#
# Reads the tool call as JSON on stdin and blocks (exit 2, reason on stderr), as the rule 7 and D-592 hooks do.
# Each refusal is appended to .private/founder-gate.log.

input=$(cat)
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
stamp="${INTELCOST_FOUNDER_STAMP:-$root/.private/founder-quiet.stamp}"
locks="${INTELCOST_LOCKS:-$root/.locks}"
pass="${INTELCOST_GATE_PASS:-$root/.private/gate-pass}"
max_age=120

# Nothing names the app, the api, alembic, docker or a commit: not gated (the common case, decided without node).
shopt -s nocasematch
case "$input" in
  *intelcost-app-*|*alembic*|*docker*|*commit*|*push*) ;;
  *) exit 0 ;;
esac
shopt -u nocasematch

refuse() { # <log line> <message>
  mkdir -p "$root/.private" 2>/dev/null
  local tool
  tool=$(printf '%s' "$input" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
  printf '%s refused %s: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${tool:-?}" "$1" >>"$root/.private/founder-gate.log" 2>/dev/null
  printf '%s\n' "$2" >&2
  exit 2
}

out=''
if command -v node >/dev/null 2>&1; then
  out=$(printf '%s' "$input" | node "$here/$(basename "$0" .sh).js" 2>/dev/null)
else
  out='?'
fi
what="${out%%$'\n'*}"
commits=''
case "$out" in *$'\n'*) commits="${out#*$'\n'}" ;; esac
if [ "$what" = '?' ]; then
  # The call could not be read: a plain pattern check, which leans to refusing.
  if printf '%s' "$input" | grep -Eiq 'intelcost-app-react[\\/]+(src|public)[\\/]|intelcost-app-react[\\/]+(index\.html|package\.json|vite\.config|tailwind\.config|postcss\.config|tsconfig)|intelcost-app-fastapi[\\/]+(app[\\/]|main\.py|alembic[\\/])|alembic[[:space:]]+(upgrade|downgrade|stamp)|docker(-compose|[[:space:]]+compose)?[^"]*[[:space:]](exec|cp|run|create)[[:space:]][^"]*(api|app|worker)'; then
    what='a gated path or a migration (the call could not be read exactly)'
  else
    what=''
  fi
  if printf '%s' "$input" | grep -Eiq 'intelcost-(app-react|app-fastapi|infra)' && printf '%s' "$input" | grep -Eiq '\bgit\b[^"]*\bcommit\b'; then
    refuse "a git commit (the call could not be read)" \
      "Blocked by D-1367: a git commit in the app, api or infra repo, and this hook could not read the call to check its gate pass. Commit with intelcost-infra/gate-commit.sh (app, api) or as a plain git commit the hook can read."
  fi
  if printf '%s' "$input" | grep -Eiq 'intelcost-(app-react|app-fastapi|infra|market-next)' && printf '%s' "$input" | grep -Eiq '\bgit\b[^"]*\bpush\b'; then
    refuse "a git push (the call could not be read)" \
      "Blocked by D-1373/D-1381: a git push in the app, api, infra or marketing repo, and this hook could not read the call to check its gate pass. Push with intelcost-infra/gate-push.sh app|api|infra|market --owner <your D-number>."
  fi
  if printf '%s' "$input" | grep -Eiq 'intelcost[\\/]+intelcost([\\/"[:space:]]|$)' && printf '%s' "$input" | grep -Eiq '\bgit\b[^"]*\bpush\b'; then
    refuse "a git push in the legacy repo (the call could not be read)" \
      "Blocked by D-1388: a git push naming the legacy repo (intelcost/), and this hook could not read the call. Legacy is read-only: fetch and pull only."
  fi
fi

# ---- D-1367: a commit needs its pass stamp ----------------------------------------------------------------
fresh() { # <file>: exists and at most 24 h old
  [ -f "$1" ] || return 1
  local t
  t=$(date -r "$1" +%s 2>/dev/null) || return 1
  [ $(($(date -u +%s) - t)) -le 86400 ]
}
if [ -n "$commits" ]; then
  while IFS=$'\t' read -r tag kind arg; do
    [ -n "$tag" ] || continue
    if [ "$tag" = COMMITBAD ]; then
      refuse "git commit in $kind with $arg" \
        "Blocked by D-1367: a git commit in the $kind repo with $arg commits a tree other than the staged one, which no gate read. Stage by name, then commit the staged tree (app, api: intelcost-infra/gate-commit.sh)."
    fi
    if [ "$tag" = PUSHLEGACY ]; then
      refuse "git push in the legacy repo" \
        "Blocked by D-1388: a git push in the legacy repo (intelcost/). Legacy is read-only: fetch and pull only, never
a push, in any form (--dry-run included). The live legacy branch is read from origin/UmeralamDEV."
    fi
    if [ "$tag" = PUSHBAD ]; then
      refuse "git push in $kind with $arg" \
        "Blocked by D-1373/D-1381: a git push in the $kind repo with $arg. The only push the gate reads is
  git push origin umer-dev            (or with --dry-run, -v, -q, --porcelain; never a force, never another ref)
and it needs a gate pass on the tree it sends. From intelcost-infra/ run:
  ./gate-push.sh $kind --owner <your D-number> [--dry-run]"
    fi
    if [ "$tag" = PUSH ]; then
      tree=$(git -C "$arg" rev-parse --verify -q 'umer-dev^{tree}' 2>/dev/null)
      if [ -z "$tree" ] || ! fresh "$pass/$kind-$tree"; then
        refuse "git push in $kind, no gate pass for umer-dev's tree ${tree:-?}" \
          "Blocked by D-1373/D-1381: a git push in the $kind repo needs every gate to have exited 0 on exactly the tree it sends
(umer-dev's tree ${tree:0:12}), and there is no pass for it in the last 24 h: a merge, cherry-pick, revert or rebase
made a commit no gate read, or the gates have not run on it. From intelcost-infra/ run:
  ./gate-push.sh $kind --owner <your D-number> [--dry-run]
It runs the full gates on a clean HEAD with every exit code read and pushes origin umer-dev only when all are 0."
      fi
      continue
    fi
    [ "$tag" = COMMIT ] || continue
    if [ "$kind" = infra ]; then
      top=$(git -C "$arg" rev-parse --show-toplevel 2>/dev/null) || continue
      git -C "$top" diff --cached --name-only 2>/dev/null |
        grep -Eq '^(quantity-table\.sh|browser/quantity-table\.mjs|browser/lib/|drives/|lock\.sh|gate-commit\.sh|gate-push\.sh|qt-key\.sh|workspace/\.claude/hooks/)' || continue
      key=''
      [ -f "$top/qt-key.sh" ] && key=$(bash "$top/qt-key.sh" --index 2>/dev/null)
      if [ -z "$key" ] || ! fresh "$pass/qt-$key"; then
        refuse "git commit in infra touching the QT's inputs, no QT pass for key ${key:-?}" \
          "Blocked by D-1367/D-1373: this infra commit stages quantity-table inputs (quantity-table.sh, browser/quantity-table.mjs, browser/lib/, drives/) or enforcement files (lock.sh, gate-commit.sh, gate-push.sh, qt-key.sh, the hook mirror workspace/.claude/hooks/), and no quantity table passed (exit 0, 0 FAIL) on exactly these files in the last 24 h (key ${key:0:12}). The QT's key reads the live hooks in E:/Intelcost/.claude/hooks/, so the staged hook mirror must equal them. From intelcost-infra/ run QT_OWNER=<your D-number> ./quantity-table.sh with these files as staged, then commit."
      fi
      continue
    fi
    tree=$(git -C "$arg" write-tree 2>/dev/null)
    if [ -z "$tree" ] || ! fresh "$pass/$kind-$tree"; then
      refuse "git commit in $kind, no gate pass for tree ${tree:-?}" \
        "Blocked by D-1367: a git commit in the $kind repo needs every gate to have exited 0 on exactly the staged tree (${tree:0:12}), and there is no pass for it: a gate failed, the gates were not run through the helper, or something was staged after them. From intelcost-infra/ run:
  ./gate-commit.sh $kind --owner <your D-number> -m \"<message>\"
It runs the full gates with every exit code read and commits only when all are 0."
    fi
  done <<<"$commits"
fi

[ -z "$what" ] && exit 0

# ---- D-1367: no gated action while a quantity table holds the app lock --------------------------------------
qd="$locks/app.lock"
if [ -e "$qd/qt.pid" ]; then
  qp=$(cat "$qd/qt.pid" 2>/dev/null)
  qw=$(cat "$qd/qt.winpid" 2>/dev/null)
  running=''
  if [ -z "$qp" ] || [ -z "$qw" ]; then
    running='unreadable'
  elif [ -r "/proc/$qp/winpid" ] && [ "$(cat "/proc/$qp/winpid" 2>/dev/null)" = "$qw" ]; then
    running='yes'
  fi
  if [ -n "$running" ]; then
    qo=$(cat "$qd/owner" 2>/dev/null)
    qs=$(cat "$qd/qt.since" 2>/dev/null)
    note=''
    [ "$running" = unreadable ] && note='; its marks are unreadable, so it is taken as running'
    refuse "${what} (a quantity table holds the app lock: owner ${qo:-?}, pid ${qp:-?})" \
      "Blocked by D-1367: ${what}.
A quantity table is running and holds the app lock (owner ${qo:-?}, pid ${qp:-?}, since ${qs:-?} UTC${note}).
No app or api save, bench migration, git checkout/pull/stash/merge in those repos, or docker exec / cp / run into
or of an app or api container until it finishes and releases the lock. A fresh founder quiet does not lift this.
Check: bash /e/Intelcost/intelcost-infra/lock.sh status (a dead QT shows STALE; ./lock.sh clear-stale removes it,
nothing is killed)."
  fi
fi

now=$(date -u +%s)
at=''
[ -f "$stamp" ] && at=$(tr -dc '0-9' <"$stamp" 2>/dev/null)
if [ -n "$at" ]; then
  age=$((now - at))
  if [ "$age" -ge -5 ] && [ "$age" -le "$max_age" ]; then
    # D-1284: one quiet, one save. The stamp is spent here, so the next save in a batch runs
    # founder-active again, and stops the batch if the founder became active.
    rm -f "$stamp" 2>/dev/null
    exit 0
  fi
  state="${age} s old"
else
  state="missing"
fi

refuse "${what} (stamp ${state})" "Blocked by D-1266 (founder gate, hard rule 12): ${what}.
An app or api source save, a bench migration, or a docker exec / cp / run into or of an app or api container
(D-1279) needs a \"quiet\" from founder-active at most ${max_age} s old (the stamp is ${state}). From
intelcost-infra/ run:
  INTELCOST_GUARD_LIST=\"E:/Intelcost/.private/guard-list.json\" ./founder-active.sh
Quiet (exit 0): retry within 2 minutes. Active or unknown: tell the founder and wait (D-1252, D-1254).
The rule (not this hook) asks the same quiet before an npm install in the app (D-1276)."

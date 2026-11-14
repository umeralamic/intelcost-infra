#!/usr/bin/env bash
# PreToolUse gate (D-1266, CLAUDE.md hard rule 12): no app or api source save and no bench migration without a
# fresh "quiet" from intelcost-infra/founder-active.sh.
#
# A save reloads what the founder's browser uses (the app dev server, the api, the workers), and a migration
# changes the database under him. founder-active.sh writes the UTC epoch to the stamp file on a quiet answer
# (E:\Intelcost\.private\founder-quiet.stamp, outside git; INTELCOST_FOUNDER_STAMP overrides it) and removes it
# on active or unknown. This gate lets a gated call through only while the stamp is at most 120 s old.
#
# What is gated is decided by founder-gate.js beside this file: Edit/Write/MultiEdit/NotebookEdit on app or api
# source, shell writes into the same paths, git commands that rewrite the app or api working tree, and a bench
# migration. Workspace docs, infra, the scratchpad, test data and every read pass untouched.
#
# Reads the tool call as JSON on stdin and blocks (exit 2, reason on stderr), as the rule 7 and D-592 hooks do.
# Each refusal is appended to .private/founder-gate.log.

input=$(cat)
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
stamp="${INTELCOST_FOUNDER_STAMP:-$root/.private/founder-quiet.stamp}"
max_age=120

# Nothing names the app, the api or alembic: not gated (the common case, decided without starting node).
shopt -s nocasematch
case "$input" in
  *intelcost-app-*|*alembic*) ;;
  *) exit 0 ;;
esac
shopt -u nocasematch

what=''
if command -v node >/dev/null 2>&1; then
  what=$(printf '%s' "$input" | node "$here/founder-gate.js" 2>/dev/null)
else
  what='?'
fi
if [ "$what" = '?' ]; then
  # The call could not be read: a plain pattern check, which leans to refusing.
  if printf '%s' "$input" | grep -Eiq 'intelcost-app-react[\\/]+(src|public)[\\/]|intelcost-app-react[\\/]+(index\.html|package\.json|vite\.config|tailwind\.config|postcss\.config|tsconfig)|intelcost-app-fastapi[\\/]+(app[\\/]|main\.py|alembic[\\/])|alembic[[:space:]]+(upgrade|downgrade|stamp)'; then
    what='a gated path or a migration (the call could not be read exactly)'
  else
    what=''
  fi
fi
[ -z "$what" ] && exit 0

now=$(date -u +%s)
at=''
[ -f "$stamp" ] && at=$(tr -dc '0-9' <"$stamp" 2>/dev/null)
if [ -n "$at" ]; then
  age=$((now - at))
  if [ "$age" -ge -5 ] && [ "$age" -le "$max_age" ]; then
    exit 0
  fi
  state="${age} s old"
else
  state="missing"
fi

mkdir -p "$root/.private" 2>/dev/null
tool=$(printf '%s' "$input" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
printf '%s refused %s: %s (stamp %s)\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${tool:-?}" "$what" "$state" \
  >>"$root/.private/founder-gate.log" 2>/dev/null

cat >&2 <<MSG
Blocked by D-1266 (founder gate, hard rule 12): ${what}.
An app or api source save, or a bench migration, needs a "quiet" from founder-active at most ${max_age} s old
(the stamp is ${state}). From intelcost-infra/ run:
  INTELCOST_GUARD_LIST="E:/Intelcost/.private/guard-list.json" ./founder-active.sh
Quiet (exit 0): retry within 2 minutes. Active or unknown: tell the founder and wait (D-1252, D-1254).
MSG
exit 2

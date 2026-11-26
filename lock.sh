#!/usr/bin/env bash
# Shared locks between sessions (night runs since 2026-11-21; durable and versioned since D-1367).
#
#   ./lock.sh acquire <lock> <owner> [wait-seconds]   waits (polling 20 s) up to wait-seconds (default 3600)
#   ./lock.sh release <lock> <owner>
#   ./lock.sh status
#   ./lock.sh clear-stale [<lock>]                     removes the marks of a quantity table that died
#
# Locks: heavy (any build, the quantity table, an image build, the harness), app (an app save batch through its
# commit), api (a migration or an api save batch through its commit), mcp (the Playwright MCP browser). Take them in
# the order heavy -> app -> api -> mcp; release as soon as done. Owner: your D-number.
#
# Where: E:\Intelcost\.locks\ (outside every repo and the mirror; INTELCOST_LOCKS overrides it). A lock is a folder
# <lock>.lock (mkdir is atomic) with `owner` and `since`. A running quantity table adds its process marks to the
# folders it holds (qt.pid, qt.winpid, qt.since; qt.acquired when the QT took the lock itself rather than adopting
# its owner's): the founder gate hook refuses app and api saves while app.lock carries live marks (D-1367).
#
# Stale: marks whose process is gone (/proc/<pid>/winpid missing or not the recorded Windows pid). `status` shows
# them STALE; `clear-stale` and the next `acquire` remove them (a lock the QT acquired is freed, an adopted one keeps
# its owner). Nothing here ever stops a process (hard rule 13).
#
# The quantity table calls the internal verbs `qt-hold <lock> <owner> <pid> [wait]` and `qt-drop <lock> <owner> <pid>`;
# `qt-running` exits 0 (and says who) while app.lock carries live marks.

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
D="${INTELCOST_LOCKS:-$(cd "$here/.." && pwd)/.locks}"
mkdir -p "$D" 2>/dev/null
LOG="$D/locks.log"
now() { date -u +%H:%M:%S; }
log() { echo "$(now) $*" >>"$LOG"; }

# The process a QT mark names is alive: same msys pid and the same Windows pid behind it.
alive() {
  local pid="$1" win="$2"
  [ -n "$pid" ] && [ -n "$win" ] && [ -r "/proc/$pid/winpid" ] && [ "$(cat "/proc/$pid/winpid" 2>/dev/null)" = "$win" ]
}

# 0: the lock carries QT marks of a live process. 1: no marks. 2: marks of a dead process (stale).
qt_state() {
  local d="$D/$1.lock"
  [ -e "$d/qt.pid" ] || return 1
  alive "$(cat "$d/qt.pid" 2>/dev/null)" "$(cat "$d/qt.winpid" 2>/dev/null)" && return 0
  return 2
}

# Remove a dead QT's marks from one lock; free the lock if that QT had acquired it.
clear_one() {
  local name="$1" d="$D/$1.lock"
  qt_state "$name"
  [ $? -eq 2 ] || return 1
  local pid owner acquired=''
  pid=$(cat "$d/qt.pid" 2>/dev/null)
  owner=$(cat "$d/owner" 2>/dev/null)
  [ -e "$d/qt.acquired" ] && acquired=1
  rm -f "$d/qt.pid" "$d/qt.winpid" "$d/qt.since" "$d/qt.acquired"
  if [ -n "$acquired" ]; then
    rm -f "$d/owner" "$d/since"
    rmdir "$d" 2>/dev/null
    log "clear-stale $name $owner (QT pid $pid gone; lock freed)"
    echo "cleared $name: the QT (pid $pid) is gone; lock freed"
  else
    log "clear-stale $name $owner (QT pid $pid gone; lock kept for $owner)"
    echo "cleared $name: the QT (pid $pid) is gone; lock still held by $owner"
  fi
  return 0
}

# acquire <lock> <owner> [wait]; prints "acquired" or "already held by <owner>". Exit 1 on timeout.
acquire() {
  local name="$1" owner="$2" wait="${3:-3600}" start held
  [ -n "$name" ] && [ -n "$owner" ] || { echo "usage: acquire <lock> <owner> [wait-seconds]"; return 2; }
  start=$(date +%s)
  while ! mkdir "$D/$name.lock" 2>/dev/null; do
    clear_one "$name" >&2 && continue
    held=$(cat "$D/$name.lock/owner" 2>/dev/null)
    if [ "$held" = "$owner" ]; then
      echo "already held by $owner"
      return 0
    fi
    if [ $(($(date +%s) - start)) -ge "$wait" ]; then echo "TIMEOUT: $name held by ${held:-?}"; return 1; fi
    sleep 20
  done
  echo "$owner" >"$D/$name.lock/owner"
  now >"$D/$name.lock/since"
  log "acquire $name $owner"
  echo "acquired $name"
}

release() {
  local name="$1" owner="$2" held
  held=$(cat "$D/$name.lock/owner" 2>/dev/null)
  [ -n "$owner" ] && [ "$held" = "$owner" ] || { echo "not held by $owner (held by '$held')"; return 1; }
  rm -f "$D/$name.lock/owner" "$D/$name.lock/since" "$D/$name.lock"/qt.*
  rmdir "$D/$name.lock"
  log "release $name $owner"
  echo "released $name"
}

status() {
  local l d line
  for l in heavy app api mcp; do
    d="$D/$l.lock"
    if [ -d "$d" ]; then
      line="$l: $(cat "$d/owner" 2>/dev/null) since $(cat "$d/since" 2>/dev/null)"
      qt_state "$l"
      case $? in
        0) line="$line; a quantity table is running (pid $(cat "$d/qt.pid"), since $(cat "$d/qt.since" 2>/dev/null))" ;;
        2) line="$line; STALE: the quantity table (pid $(cat "$d/qt.pid" 2>/dev/null)) is gone (./lock.sh clear-stale)" ;;
      esac
      echo "$line"
    else
      echo "$l: free"
    fi
  done
}

# qt-hold <lock> <owner> <pid> [wait]: acquire (or adopt, when <owner> already holds it) and mark it with the QT's
# process. A lock whose live marks name another QT is waited on like any held lock.
qt_hold() {
  local name="$1" owner="$2" pid="$3" wait="${4:-3600}" d="$D/$1.lock" out win start
  win=$(cat "/proc/$pid/winpid" 2>/dev/null)
  [ -n "$win" ] || { echo "qt-hold: no process $pid"; return 2; }
  start=$(date +%s)
  while :; do
    out=$(acquire "$name" "$owner" "$wait") || { echo "$out"; return 1; }
    qt_state "$name"
    if [ $? -eq 0 ] && [ "$(cat "$d/qt.pid" 2>/dev/null)" != "$pid" ]; then
      # Our owner holds it, but another live QT of the same owner is marked on it: wait for that one.
      if [ $(($(date +%s) - start)) -ge "$wait" ]; then echo "TIMEOUT: $name marked by QT pid $(cat "$d/qt.pid")"; return 1; fi
      sleep 20
      continue
    fi
    break
  done
  case "$out" in acquired*) : >"$d/qt.acquired" ;; esac
  echo "$pid" >"$d/qt.pid"
  echo "$win" >"$d/qt.winpid"
  now >"$d/qt.since"
  log "qt-hold $name $owner pid $pid (${out%% *})"
  case "$out" in acquired*) echo "acquired $name" ;; *) echo "adopted $name (held by $owner)" ;; esac
}

# qt-drop <lock> <owner> <pid>: remove the QT's marks; release the lock if the QT acquired it.
qt_drop() {
  local name="$1" owner="$2" pid="$3" d="$D/$1.lock"
  [ "$(cat "$d/qt.pid" 2>/dev/null)" = "$pid" ] || return 0
  if [ -e "$d/qt.acquired" ]; then
    release "$name" "$owner"
  else
    rm -f "$d/qt.pid" "$d/qt.winpid" "$d/qt.since"
    log "qt-drop $name $owner pid $pid (lock kept for $owner)"
    echo "dropped the QT's marks on $name (still held by $owner)"
  fi
}

# Sourced (by quantity-table.sh or gate-commit.sh): define the functions only.
if [ "${BASH_SOURCE[0]}" != "$0" ]; then return 0 2>/dev/null; fi

cmd="${1:-}"
shift || true
case "$cmd" in
  acquire) acquire "$@" ;;
  release) release "$@" ;;
  status) status ;;
  clear-stale)
    if [ -n "${1:-}" ]; then clear_one "$1" || echo "$1: nothing stale"; else
      any=''
      for l in heavy app api mcp; do clear_one "$l" && any=1; done
      [ -n "$any" ] || echo "nothing stale"
    fi
    exit 0 ;;
  qt-hold) qt_hold "$@" ;;
  qt-drop) qt_drop "$@" ;;
  qt-running)
    qt_state app
    [ $? -eq 0 ] || exit 1
    echo "a quantity table holds the app lock (owner $(cat "$D/app.lock/owner" 2>/dev/null), pid $(cat "$D/app.lock/qt.pid"), since $(cat "$D/app.lock/qt.since" 2>/dev/null) UTC)" ;;
  *) echo "usage: lock.sh acquire|release <lock> <owner> [wait] | status | clear-stale [<lock>]"; exit 2 ;;
esac

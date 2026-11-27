#!/usr/bin/env bash
# The quantity table's input key (D-1367, D-1373): one hash over the files the QT reads from this repo and the
# enforcement files (the lock and gate helpers, the hooks), so a QT pass can be tied to exactly the files an infra
# commit stages.
#
#   ./qt-key.sh --worktree   the files as they are on disk (tracked and untracked, not ignored): what a QT run reads.
#                            The hooks are read LIVE from E:\Intelcost\.claude\hooks\ (the ones running during the QT)
#                            under their mirror paths workspace/.claude/hooks/<name>.
#   ./qt-key.sh --index      the files as staged: what a commit would record (the hooks as the staged mirror copies)
#   ./qt-key.sh --touches    exit 0 when the staged changes touch one of these files (else 1)
#   ./qt-key.sh --names-touch   exit 0 when a path on stdin is one of these files (D-1381, the infra push gate)
#
# A QT that exits 0 with 0 FAIL lines writes E:\Intelcost\.private\gate-pass\qt-<key> (its --worktree key, the same
# at its start and its end); the founder gate hook lets an infra commit that touches one of these files through only
# when that stamp exists for the --index key. So a commit of a hook change needs the staged mirror to equal the live
# hooks the QT ran with.

set -u
cd "$(dirname "$0")" || exit 2
INPUTS=(quantity-table.sh browser/quantity-table.mjs browser/lib drives lock.sh gate-commit.sh gate-push.sh qt-key.sh)
HOOKS_MIRROR=workspace/.claude/hooks
HOOKS_LIVE="${INTELCOST_HOOKS_LIVE:-../.claude/hooks}"
RE='^(quantity-table\.sh|browser/quantity-table\.mjs|browser/lib/|drives/|lock\.sh|gate-commit\.sh|gate-push\.sh|qt-key\.sh|workspace/\.claude/hooks/)'

case "${1:-}" in
  --worktree)
    # Each file's blob id as `git add` would store it, beside its path.
    # One git process hashes them all (a process per file takes seconds on Windows).
    files=$(git ls-files -co --exclude-standard -- "${INPUTS[@]}" | while IFS= read -r p; do [ -f "$p" ] && echo "$p"; done)
    hooks=$(for p in "$HOOKS_LIVE"/*; do [ -f "$p" ] && echo "$p"; done)
    [ -n "$hooks" ] || { echo "qt-key: no live hooks in $HOOKS_LIVE" >&2; exit 2; }
    {
      paste -d' ' <(printf '%s\n' "$files" | git hash-object --stdin-paths) <(printf '%s\n' "$files")
      paste -d' ' <(printf '%s\n' "$hooks" | git hash-object --stdin-paths) \
        <(printf '%s\n' "$hooks" | while IFS= read -r p; do echo "$HOOKS_MIRROR/${p##*/}"; done)
    } | LC_ALL=C sort -u -k2 | git hash-object --stdin ;;
  --index)
    git ls-files -s -- "${INPUTS[@]}" "$HOOKS_MIRROR" | while read -r _mode blob _stage p; do
      printf '%s %s\n' "$blob" "$p"
    done | LC_ALL=C sort -u -k2 | git hash-object --stdin ;;
  --touches)
    git diff --cached --name-only | grep -Eq "$RE" ;;
  --names-touch)
    # D-1381: exit 0 when one of the repo paths on stdin (one a line) is one of these files (the infra push gate
    # reads the pushed range's names this way).
    grep -Eq "$RE" ;;
  *) echo "usage: qt-key.sh --worktree | --index | --touches | --names-touch"; exit 2 ;;
esac

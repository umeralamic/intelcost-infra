#!/usr/bin/env bash
# The quantity table's input key (D-1367): one hash over the files the QT reads from this repo, so a QT pass can be
# tied to exactly the files an infra commit stages.
#
#   ./qt-key.sh --worktree   the files as they are on disk (tracked and untracked, not ignored): what a QT run reads
#   ./qt-key.sh --index      the files as staged: what a commit would record
#   ./qt-key.sh --touches    exit 0 when the staged changes touch a QT input (else 1)
#
# A QT that exits 0 with 0 FAIL lines writes E:\Intelcost\.private\gate-pass\qt-<key> (its --worktree key, the same
# at its start and its end); the founder gate hook lets an infra commit that touches a QT input through only when
# that stamp exists for the --index key.

set -u
cd "$(dirname "$0")" || exit 2
INPUTS=(quantity-table.sh browser/quantity-table.mjs browser/lib drives)
RE='^(quantity-table\.sh|browser/quantity-table\.mjs|browser/lib/|drives/)'

case "${1:-}" in
  --worktree)
    # Each file's blob id as `git add` would store it, beside its path.
    # One git process hashes them all (a process per file takes seconds on Windows).
    files=$(git ls-files -co --exclude-standard -- "${INPUTS[@]}" | while IFS= read -r p; do [ -f "$p" ] && echo "$p"; done)
    paste -d' ' <(printf '%s\n' "$files" | git hash-object --stdin-paths) <(printf '%s\n' "$files") \
      | LC_ALL=C sort -u -k2 | git hash-object --stdin ;;
  --index)
    git ls-files -s -- "${INPUTS[@]}" | while read -r _mode blob _stage p; do
      printf '%s %s\n' "$blob" "$p"
    done | LC_ALL=C sort -u -k2 | git hash-object --stdin ;;
  --touches)
    git diff --cached --name-only | grep -Eq "$RE" ;;
  *) echo "usage: qt-key.sh --worktree | --index | --touches"; exit 2 ;;
esac

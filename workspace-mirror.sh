#!/usr/bin/env bash
# The workspace mirror (CLAUDE.md "Git"; D-1372, D-1387): compare or refresh intelcost-infra/workspace/ from the
# workspace root (the four files CLAUDE.md, DECISIONS.md, FEATURES.md, MANAGER.md, and docs/ and .claude/).
#
#   ./workspace-mirror.sh --check    list what differs; exit 0 when the mirror equals the root except the skips
#   ./workspace-mirror.sh --apply    copy every new or changed root file that is not skipped, then --check
#
# Skipped: every root file whose mirror path this repo's .gitignore ignores (`git check-ignore`): the bid tabs and
# client inputs (D-1372), the spreadsheets and office files under docs/reference (D-1387), and the CSV files there
# (D-1400, the founder's D-1397 7). They are printed as
# expected "Only in" counts per .gitignore line, never by name (a file name can carry a name from the private lists).
# --apply never deletes: a file only in the mirror, or an ignored file sitting in the mirror on disk, is reported for
# a person to remove. Staging and committing the mirror stays a separate, deliberate step (stage by name).

set -u
set -o pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"
mirror="$here/workspace"
mode="${1:-}"
case "$mode" in --check|--apply) ;; *) echo "usage: workspace-mirror.sh --check | --apply" >&2; exit 2 ;; esac
cd "$here" || exit 2

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Root files, as paths relative to the root (the mirror path is workspace/<that>).
( cd "$root" && { for f in CLAUDE.md DECISIONS.md FEATURES.md MANAGER.md; do [ -f "$f" ] && echo "$f"; done
  find docs .claude -type f; } ) | LC_ALL=C sort >"$tmp/root"
( cd "$mirror" && find . -type f | sed 's|^\./||' ) | LC_ALL=C sort >"$tmp/mirror"

# check-ignore -v -n: "<source>:<line>:<pattern>\t<path>" for an ignored path, "::\t<path>" for one that is not.
# --no-index: the rule alone decides, whether or not the path is tracked today.
sed 's|^|workspace/|' "$tmp/root" | git check-ignore --no-index --stdin -v -n >"$tmp/ci" || true
awk -F'\t' '$1 != "::" { split($1, a, ":"); print a[2] }' "$tmp/ci" | sort -n | uniq -c >"$tmp/skipped"
awk -F'\t' '$1 == "::" { sub(/^workspace\//, "", $2); print $2 }' "$tmp/ci" | LC_ALL=C sort >"$tmp/kept"
awk -F'\t' '$1 != "::" { sub(/^workspace\//, "", $2); print $2 }' "$tmp/ci" | LC_ALL=C sort >"$tmp/ignored"

compare() { # new or changed kept files -> $tmp/new, $tmp/changed (one git process hashes each side's raw bytes)
  : >"$tmp/new"
  : >"$tmp/changed"
  : >"$tmp/both"
  while IFS= read -r f; do
    if [ -f "$mirror/$f" ]; then echo "$f" >>"$tmp/both"; else echo "$f" >>"$tmp/new"; fi
  done <"$tmp/kept"
  [ -s "$tmp/both" ] || return 0
  # Relative paths (from intelcost-infra/): git on Windows does not read a /e/... path given on stdin.
  paste -d' ' <(sed 's|^|../|' "$tmp/both" | git hash-object --no-filters --stdin-paths) \
    <(sed 's|^|workspace/|' "$tmp/both" | git hash-object --no-filters --stdin-paths) |
    paste -d' ' - "$tmp/both" | awk '$1 != $2 { sub(/^[^ ]+ [^ ]+ /, ""); print }' >"$tmp/changed"
}
compare

if [ "$mode" = --apply ]; then
  n=0
  while IFS= read -r f; do
    mkdir -p "$(dirname "$mirror/$f")" && cp -p "$root/$f" "$mirror/$f" || { echo "workspace-mirror: copy failed: $f" >&2; exit 1; }
    n=$((n + 1))
  done < <(cat "$tmp/new" "$tmp/changed")
  echo "workspace-mirror: copied $n file(s) into workspace/ (nothing deleted)"
  compare
fi

rc=0
while read -r count line; do
  echo "Only in the root, skipped as expected (.gitignore line $line): $count file(s)"
done <"$tmp/skipped"
# An ignored file present in the mirror on disk (a copy made before its rule, at the root or not): counted, never
# named. A file only in the mirror that is not ignored (removed or renamed at the root) is named.
LC_ALL=C comm -13 "$tmp/root" "$tmp/mirror" >"$tmp/mirror_only"
sed 's|^|workspace/|' "$tmp/mirror_only" | git check-ignore --no-index --stdin -v -n >"$tmp/ci2" || true
awk -F'\t' '$1 == "::" { sub(/^workspace\//, "", $2); print $2 }' "$tmp/ci2" >"$tmp/only_mirror"
present=$(( $(LC_ALL=C comm -12 "$tmp/ignored" "$tmp/mirror" | grep -c .) + $(awk -F'\t' '$1 != "::"' "$tmp/ci2" | grep -c .) ))
if [ "$present" -gt 0 ]; then
  echo "NOT IN SYNC: $present ignored file(s) sit in workspace/ on disk; remove them (git check-ignore lists them)"; rc=1
fi
while IFS= read -r f; do echo "NOT IN SYNC, only in workspace/: $f"; rc=1; done <"$tmp/only_mirror"
while IFS= read -r f; do echo "NOT IN SYNC, new at the root: $f"; rc=1; done <"$tmp/new"
while IFS= read -r f; do echo "NOT IN SYNC, changed at the root: $f"; rc=1; done <"$tmp/changed"
[ "$rc" -eq 0 ] && echo "workspace-mirror: workspace/ equals the root ($(grep -c . "$tmp/kept") files), skips as listed"
exit "$rc"

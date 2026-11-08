#!/usr/bin/env bash
# Retention (D-1059): run output older than 7 days moves to E:\Intelcost\archive\<YYYY-MM>\, one zip per category
# (screenshots, logs, reports, test-results), each file at its path relative to E:\Intelcost; a file is removed only
# after its zip was read back entry by entry and found equal (archive-zip.mjs). report-dir.sh runs it at the start of
# every run. Moved: the morning-report-<date> folders (the workspace root's; intelcost-infra's untracked files only),
# fx-suite/.regress's release-* and capture-* run folders, test-data-local/screenshots-<date>. Never: a tracked file,
# test-data-local's inputs, docs/reference, a .env, the fixture suite itself, anything a script reads.
#
#   ./archive-old.sh            # archive what is older than 7 days
#   ./archive-old.sh --dry-run  # list it only
set -euo pipefail
cd "$(dirname "$0")/.."
dry=${1:-}
limit=$(date -d '7 days ago' +%Y%m%d)
stamp=$(date +%Y%m%d-%H%M)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# One line per file: <yyyymm> <category> <path>, the month from the folder's own date.
emit() { # <yyyymmdd> <path>: every file under it, by category
  local day=$1 dir=$2 tracked=${3:-}
  find "$dir" -type f | while IFS= read -r f; do
    if [ -n "$tracked" ] && grep -qxF "${f#intelcost-infra/}" "$tracked"; then continue; fi
    case "${f,,}" in
      *.png | *.jpg | *.jpeg | *.webp | *.gif) cat=screenshots ;;
      *.log) cat=logs ;;
      *) [ "$4" = results ] && cat=test-results || cat=reports ;;
    esac
    printf '%s\t%s\t%s\n' "${day:0:6}" "$cat" "$f"
  done
}
git -C intelcost-infra ls-files 'morning-report-*' >"$work/tracked"
{
  for d in morning-report-????-??-?? intelcost-infra/morning-report-????-??-??; do
    [ -d "$d" ] || continue
    day=$(basename "$d" | sed 's/morning-report-//; s/-//g')
    [ "$day" -lt "$limit" ] || continue
    case "$d" in intelcost-infra/*) emit "$day" "$d" "$work/tracked" reports ;; *) emit "$day" "$d" "" reports ;; esac
  done
  for d in intelcost-infra/fx-suite/.regress/release-* intelcost-infra/fx-suite/.regress/capture-*; do
    [ -d "$d" ] || continue
    day=$(basename "$d" | grep -oE '[0-9]{8}' | head -1)
    [ -n "$day" ] && [ "$day" -lt "$limit" ] || continue
    emit "$day" "$d" "" results
  done
  for d in test-data-local/screenshots-????-??-??; do
    [ -d "$d" ] || continue
    day=$(basename "$d" | sed 's/screenshots-//; s/-//g')
    [ "$day" -lt "$limit" ] || continue
    emit "$day" "$d" "" reports
  done
} | sort >"$work/all"

n=$(wc -l <"$work/all")
if [ "$n" -eq 0 ]; then
  echo "archive-old: nothing older than 7 days"
  exit 0
fi
if [ "$dry" = --dry-run ]; then
  cut -f1,2 "$work/all" | sort | uniq -c | sed 's/^/archive-old (dry run): /'
  exit 0
fi
base=$(cygpath -m "$(pwd)")
for group in $(cut -f1,2 "$work/all" | sort -u | tr '\t' ':'); do
  month=${group%%:*}
  cat=${group#*:}
  out="archive/${month:0:4}-${month:4:2}"
  mkdir -p "$out"
  awk -F'\t' -v m="$month" -v c="$cat" '$1 == m && $2 == c { print $3 }' "$work/all" >"$work/list"
  node "$base/intelcost-infra/archive-zip.mjs" "$base" "$(cygpath -m "$work/list")" "$base/$out/$cat-$stamp.zip" \
    || { echo "archive-old: $out/$cat-$stamp.zip not verified: its files stay"; continue; }
  while IFS= read -r f; do rm -f -- "$f"; done <"$work/list"
  cat "$work/list" >>"$out/manifest.txt"
done
# The folders the moves emptied.
for d in morning-report-????-??-?? intelcost-infra/morning-report-????-??-?? intelcost-infra/fx-suite/.regress/release-* \
  intelcost-infra/fx-suite/.regress/capture-* test-data-local/screenshots-????-??-??; do
  [ -d "$d" ] && find "$d" -depth -type d -empty -delete
done
echo "archive-old: $n files older than 7 days moved to archive/"

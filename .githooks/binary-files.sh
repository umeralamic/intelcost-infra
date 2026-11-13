#!/bin/sh
# D-1259: refuses a commit that adds or changes a spreadsheet, an image, a PDF (.xlsx, .png, .jpg, .jpeg, .pdf) or
# anything under morning-report-*/, unless it is explicitly allowed. Reports, exports and screenshots carry project
# names and bid figures; they stay on disk, out of git. A deletion is never refused (untracking stays possible).
#
# Allowed:
#   - a path matching a line of .githooks/commit-allow (shell globs, # comments): a standing exception, reviewed in
#     its own commit;
#   - a one-off: INTELCOST_ALLOW_COMMIT="path [path ...]" (globs too) on the commit's command line.
root=$(git rev-parse --show-toplevel)
allow_file="$root/.githooks/commit-allow"
allowed() {
  for pattern in ${INTELCOST_ALLOW_COMMIT:-}; do
    case "$1" in $pattern) return 0 ;; esac
  done
  if [ -f "$allow_file" ]; then
    while IFS= read -r pattern || [ -n "$pattern" ]; do
      pattern=$(printf '%s' "$pattern" | tr -d '\r' | sed 's/[[:space:]]*$//')
      case "$pattern" in '' | '#'*) continue ;; esac
      case "$1" in $pattern) return 0 ;; esac
    done < "$allow_file"
  fi
  return 1
}
refused=""
# Added, copied, modified or renamed: what the commit puts into git, one path a line (unquoted, spaces kept whole).
list=$(mktemp)
git -c core.quotePath=false diff --cached --name-only --diff-filter=ACMR > "$list"
while IFS= read -r path || [ -n "$path" ]; do
  case "$path" in
    morning-report-*/* | *.[xX][lL][sS][xX] | *.[pP][nN][gG] | *.[jJ][pP][gG] | *.[jJ][pP][eE][gG] | *.[pP][dD][fF])
      allowed "$path" || refused="$refused
  $path"
      ;;
  esac
done < "$list"
rm -f "$list"
if [ -n "$refused" ]; then
  echo "binary-files: refused (a spreadsheet, image, PDF or morning report; D-1259):$refused" >&2
  echo "Keep it on disk, out of git: git restore --staged <path>. If it truly belongs in git, allow it in" >&2
  echo ".githooks/commit-allow (its own reviewed commit) or once with INTELCOST_ALLOW_COMMIT=\"<path>\"." >&2
  exit 1
fi
exit 0

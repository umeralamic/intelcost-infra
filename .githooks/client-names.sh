#!/bin/sh
# D-1153: blocks a commit that adds a client or project name. The names live outside git, one per line (# comments),
# in the file named by INTELCOST_DENYLIST; without it the check is skipped with a warning. Matches whole words,
# any case, in the lines the commit adds, the files it adds or renames, and (commit-msg) its message.
list="${INTELCOST_DENYLIST:-}"
if [ -z "$list" ] || [ ! -f "$list" ]; then
  echo "client-names: INTELCOST_DENYLIST is not set or its file is missing; check skipped" >&2
  exit 0
fi
pats=$(mktemp)
tr -d '\r' < "$list" | grep -v '^[[:space:]]*#' | sed 's/[[:space:]]*$//' | grep -v '^$' > "$pats"
if [ ! -s "$pats" ]; then
  rm -f "$pats"
  exit 0
fi
if [ -n "$1" ]; then
  where="commit message"
  hits=$(grep -v '^#' "$1" | grep -i -w -F -f "$pats")
else
  where="staged changes"
  hits=$({
    git diff --cached --name-only --diff-filter=AR
    git diff --cached -U0 --no-color --diff-filter=ACMR | grep '^+' | grep -v '^+++'
  } | grep -i -w -F -f "$pats")
fi
rm -f "$pats"
if [ -n "$hits" ]; then
  echo "client-names: a client or project name in the $where:" >&2
  printf '%s\n' "$hits" | cut -c1-160 >&2
  echo "Write a placeholder (Real bid A, Real bid B) instead." >&2
  exit 1
fi
exit 0

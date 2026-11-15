#!/bin/sh
# D-1153: blocks a commit that adds a client or project name. The names live outside git, one per line (# comments),
# in the file named by INTELCOST_DENYLIST. Without it (unset, missing or empty) the commit is refused (D-1279 Q25:
# fail closed). Matches whole words, any case, in the lines the commit adds, the files it adds or renames, and
# (commit-msg) its message.
list="${INTELCOST_DENYLIST:-}"
refuse() {
  echo "client-names: $1, so the commit is refused (D-1279 Q25)." >&2
  echo "  Set the user environment variable INTELCOST_DENYLIST to the client-name block list, one name a line:" >&2
  echo "    INTELCOST_DENYLIST=E:\\Intelcost\\.private\\client-denylist.txt  (the workspace's .private/client-denylist.txt)" >&2
  echo "  The file is outside git and is sent separately, like the keys; ask the founder for it." >&2
  exit 1
}
[ -n "$list" ] || refuse "INTELCOST_DENYLIST is not set"
[ -f "$list" ] || refuse "INTELCOST_DENYLIST names a missing file ($list)"
pats=$(mktemp)
tr -d '\r' < "$list" | grep -v '^[[:space:]]*#' | sed 's/[[:space:]]*$//' | grep -v '^$' > "$pats"
if [ ! -s "$pats" ]; then
  rm -f "$pats"
  refuse "INTELCOST_DENYLIST names a file with no names ($list)"
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

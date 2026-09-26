#!/usr/bin/env bash
# PreToolUse guard for CLAUDE.md hard rule 7: no in-place `sed -i` or `perl -i` edits.
#
# In-place rewriting writes a temp file and renames it over the original. On Windows that
# rename can fail while the file is held open, and it has already destroyed one file in
# this workspace, original and temp copy both. Edit source with the editor tool; a
# whole-file rewrite through a heredoc is acceptable.
#
# Reads the tool call as JSON on stdin and blocks (exit 2, reason on stderr) when the
# command contains `sed` or `perl` with an in-place flag: -i, -i.bak, -Ei, -ni, -pi,
# -pi.bak, --in-place, including after other flags (`sed -n -i`, `perl -p -i`).
# Strict on purpose: it blocks the command wherever the file lives.

input=$(cat)

pattern='(^|[^[:alnum:]_.-])(sed|perl)[[:space:]]+(-[^[:space:]"]+[[:space:]]+)*(-[[:alnum:]]*i|--in-place)'

if printf '%s' "$input" | grep -Eq "$pattern"; then
  cat >&2 <<'MSG'
Blocked by CLAUDE.md hard rule 7: no in-place `sed -i`, `perl -i` or `perl -pi`.
In-place rewriting renames a temp file over the original; on Windows that rename can
fail while the file is open, and it has already destroyed a file in this workspace.
Edit source with the editor tool (Edit), or rewrite the whole file through a heredoc.
MSG
  exit 2
fi
exit 0

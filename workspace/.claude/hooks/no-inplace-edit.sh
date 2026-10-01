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
# -pi.bak, --in-place, including after other flags or arguments (`sed -n -i`,
# `perl -p -i`, `sed -e 's/a/b/' -i f`), on ANY line of a multi-line command.
# Strict on purpose: it blocks the command wherever the file lives.
#
# The command arrives JSON-encoded, so a newline is the two characters `\n` and the
# pattern's guard would never see a line start. The command is therefore decoded first:
# with node when it is installed (exact), and the raw input is also checked with its
# `\n`, `\r` and `\t` escapes turned back into real ones. Either match blocks.

input=$(cat)

# sed or perl as a word, then any arguments up to a command separator, then an in-place flag.
pattern='(^|[^[:alnum:]_.-])(sed|perl)([[:space:]]+[^[:space:];|&]+)*[[:space:]]+(-[[:alnum:]]*i[^[:space:]]*|--in-place[^[:space:]]*)([[:space:]]|$)'

decoded=''
if command -v node >/dev/null 2>&1; then
  decoded=$(printf '%s' "$input" | node -e '
    let s = ""
    process.stdin.on("data", (c) => (s += c))
    process.stdin.on("end", () => {
      try {
        const t = JSON.parse(s).tool_input || {}
        process.stdout.write(String(t.command ?? ""))
      } catch {}
    })
  ' 2>/dev/null)
fi

unescaped=${input//\\n/$'\n'}
unescaped=${unescaped//\\r/$'\n'}
unescaped=${unescaped//\\t/$'\t'}

if printf '%s\n' "$decoded" | grep -Eq "$pattern" || printf '%s\n' "$unescaped" | grep -Eq "$pattern"; then
  cat >&2 <<'MSG'
Blocked by CLAUDE.md hard rule 7: no in-place `sed -i`, `perl -i` or `perl -pi`.
In-place rewriting renames a temp file over the original; on Windows that rename can
fail while the file is open, and it has already destroyed a file in this workspace.
Edit source with the editor tool (Edit), or rewrite the whole file through a heredoc.
MSG
  exit 2
fi
exit 0

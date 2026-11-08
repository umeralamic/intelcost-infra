#!/usr/bin/env bash
# f3-s6 edits the roles matrix on screen, so it runs in a workspace of its own with the
# editing flag shipped: see browser/lib/shipped.sh.
exec "$(dirname "$0")/lib/shipped.sh" f3-s6

#!/usr/bin/env bash
# The founder's projects' fingerprint (D-542): taken at the start and the end of every run, and the
# two "founder digest" lines compared. Every project on the guard list, each with its own digest (every
# table holding its rows: row count, latest change; every stored earthwork result's md5), and every
# project in the founder's own workspaces checked against the list. The guard check runs first (every
# reader of the guard list holds the same list, browser/guard-check.mjs). Read only
# (drives/project_fingerprint.py, one read-only transaction). The list is the one file outside git that
# INTELCOST_GUARD_LIST names; the api container reads it at the path the compose file mounts.
#
#   ./fingerprint.sh                                  (every protected project: the run's start and end)
#   ./fingerprint.sh <project uuid> [--since <ISO>]   (one project; rows changed since then)

set -u
cd "$(dirname "$0")"
node browser/guard-check.mjs || echo "FAIL the guard check"
echo
if [ $# -eq 0 ]; then set -- --founder; fi
MSYS_NO_PATHCONV=1 docker compose exec -T api sh -lc "cd /srv && PYTHONPATH=/srv python drives/project_fingerprint.py $*"

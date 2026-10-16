#!/usr/bin/env bash
# The protected projects' fingerprint (D-542): taken at the start and the end of every run and
# reported, in place of the one result's md5. For the 3D test copy by default: every table holding
# its rows (row count, latest change), every stored earthwork result's md5 (sheets and sites), and
# one digest over them. People's own activity in it (last open sheet, work sessions) is listed
# apart, out of the digest. Read only (scripts/project_fingerprint.py, one read-only transaction).
#
#   ./fingerprint.sh                                  (the 3D test copy)
#   ./fingerprint.sh <project uuid> [--since <ISO>]   (another project; rows changed since then)

set -u
cd "$(dirname "$0")"
project="${1:-042c8817-4a65-47ba-95d8-686ecf986246}"
[ $# -gt 0 ] && shift
docker compose exec -T api sh -lc "cd /srv && PYTHONPATH=/srv python scripts/project_fingerprint.py $project $*"

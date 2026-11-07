#!/usr/bin/env bash
# The morning report's folder for a run, named from the host's clock (D-1033): never from a queue's
# label or a plan's date, which ran ahead of the calendar (morning-report-2026-11-09 held a run of 6 Nov).
# A run that starts in the evening keeps the date it started on.
#
#   dir=$(./report-dir.sh)        # morning-report-2026-11-06, created if missing
#   ./report-dir.sh 2026-11-06T22:10   # the folder for a run that started then (a resumed run)
set -eu
cd "$(dirname "$0")"
if [ $# -gt 0 ]; then day=$(date -d "$1" +%F); else day=$(date +%F); fi
mkdir -p "morning-report-$day"
echo "morning-report-$day"

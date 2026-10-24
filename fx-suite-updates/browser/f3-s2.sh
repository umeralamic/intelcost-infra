#!/usr/bin/env bash
# F3-S2: the trial mask and the platform-admin bypass. Two passes with one database step
# between them (the trial aged, the staff flag set), as browser/f3-s2.mjs's header
# describes; the stages no route reaches are driven by drives/f3-s2-resolution.py first.
#
#   ./browser/f3-s2.sh      (from intelcost-infra/; regress.sh runs it too)
#
# Updated 2026-10-24 (D-752): the untrialled workspace is the owner's second, so it is made by a
# throwaway extra owner (lib/bench.mjs createWorkspace) who is its real owner; the setup pass prints
# that owner as UNTRIALLED_OWNER and this runner hands it to the main pass.

set -u
cd "$(dirname "$0")/.."

echo "=== f3-s2 resolution (drive) ==="
docker compose exec -T api sh -lc "cd /srv && python drives/f3-s2-resolution.py" 2>&1 | grep -vE '^\s*$' | tail -20
drive=${PIPESTATUS[0]}

setup=$(docker compose --profile browser run --rm -e SETUP=1 browser node scripts/f3-s2.mjs 2>&1)
workspace=$(grep -oE '^WORKSPACE=.*' <<<"$setup" | cut -d= -f2)
staff=$(grep -oE '^STAFF=.*' <<<"$setup" | cut -d= -f2)
untrialled=$(grep -oE '^UNTRIALLED=.*' <<<"$setup" | cut -d= -f2)
owner=$(grep -oE '^OWNER=.*' <<<"$setup" | cut -d= -f2)
untrialled_owner=$(grep -oE '^UNTRIALLED_OWNER=.*' <<<"$setup" | cut -d= -f2)
if [ -z "$workspace" ] || [ -z "$staff" ] || [ -z "$untrialled" ] || [ -z "$owner" ] || [ -z "$untrialled_owner" ]; then
  echo "FAIL  0. SETUP printed no WORKSPACE, UNTRIALLED, STAFF, OWNER or UNTRIALLED_OWNER"
  echo "$setup" | tail -5
  echo "0/1 passed"
  exit 1
fi
echo "setup WORKSPACE=$workspace UNTRIALLED=$untrialled STAFF=$staff OWNER=$owner"
docker compose exec -T postgres psql -U intelcost -d intelcost -q \
  -c "update workspace set trial_started_at = now() - interval '30 days', trial_ends_at = now() - interval '1 day' where uuid = '$workspace'" \
  -c "update workspace set trial_started_at = null, trial_ends_at = null where uuid = '$untrialled'" \
  -c "update \"user\" set is_platform_admin = true where email = '$staff'"
docker compose --profile browser run --rm -e WORKSPACE="$workspace" -e STAFF="$staff" \
  -e UNTRIALLED="$untrialled" -e OWNER="$owner" -e UNTRIALLED_OWNER="$untrialled_owner" browser node scripts/f3-s2.mjs 2>&1 | grep -v '^ *Container '
status=${PIPESTATUS[0]}
[ "$drive" -eq 0 ] && [ "$status" -eq 0 ]

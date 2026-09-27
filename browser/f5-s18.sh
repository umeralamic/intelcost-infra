#!/usr/bin/env bash
# F5-S18: a platform admin's measure tools in a locked workspace (F3-S4 AC6). Two passes
# with one database step between them (the trial aged, the staff flag set), as
# browser/f5-s18.mjs's header describes.
#
#   ./browser/f5-s18.sh      (from intelcost-infra/; regress.sh runs it too)

set -u
cd "$(dirname "$0")/.."

setup=$(docker compose --profile browser run --rm -e SETUP=1 browser node scripts/f5-s18.mjs 2>&1)
value() { grep -oE "^$1=.*" <<<"$setup" | cut -d= -f2; }
owner=$(value OWNER)
locked=$(value LOCKED)
open=$(value OPEN)
staff=$(value STAFF)
viewer=$(value VIEWER)
if [ -z "$owner" ] || [ -z "$locked" ] || [ -z "$open" ] || [ -z "$staff" ] || [ -z "$viewer" ]; then
  echo "FAIL  0. SETUP printed no OWNER, LOCKED, OPEN, STAFF or VIEWER"
  echo "$setup" | tail -5
  echo "0/1 passed"
  exit 1
fi
echo "setup OWNER=$owner LOCKED=$locked OPEN=$open STAFF=$staff VIEWER=$viewer"
docker compose exec -T postgres psql -U intelcost -d intelcost -q \
  -c "update workspace set trial_started_at = now() - interval '30 days', trial_ends_at = now() - interval '1 day' where uuid = '${locked%%/*}'" \
  -c "update \"user\" set is_platform_admin = true where email = '$staff'"
docker compose --profile browser run --rm -e FX_OWNER="$owner" -e LOCKED="$locked" -e OPEN="$open" \
  -e STAFF="$staff" -e VIEWER="$viewer" browser node scripts/f5-s18.mjs 2>&1 | grep -v '^ *Container '
exit "${PIPESTATUS[0]}"

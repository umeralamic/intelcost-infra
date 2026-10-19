#!/usr/bin/env bash
# C30: billing on the bench's Stripe fake. Two passes with one database step between them on the
# fx database only (intelcost_fx): the expired trial aged, the capped trial put on the restricted
# tier 3, and a throwaway seat made platform staff (to comp two workspaces), as
# browser/c30-billing.mjs's header describes.
#
#   ./browser/c30-billing.sh      (from intelcost-infra/fx-suite; regress.sh runs it by name)

set -u
cd "$(dirname "$0")/.."

setup=$(docker compose --profile fx run --rm -e SETUP=1 browser-fx node scripts/c30-billing.mjs 2>&1)
value() { grep -oE "^$1=.*" <<<"$setup" | cut -d= -f2; }
owner=$(value OWNER)
expired=$(value EXPIRED)
pro=$(value PRO)
ess=$(value ESS)
capped=$(value CAPPED)
staff=$(value STAFF)
if [ -z "$owner" ] || [ -z "$expired" ] || [ -z "$pro" ] || [ -z "$ess" ] || [ -z "$capped" ] || [ -z "$staff" ]; then
  echo "FAIL  0. SETUP printed no OWNER, EXPIRED, PRO, ESS, CAPPED or STAFF"
  echo "$setup" | tail -5
  echo "0/1 passed"
  exit 1
fi
echo "setup OWNER=$owner EXPIRED=$expired PRO=$pro ESS=$ess CAPPED=$capped STAFF=$staff"
docker compose exec -T postgres psql -U intelcost -d intelcost_fx -q \
  -c "update workspace set trial_started_at = now() - interval '30 days', trial_ends_at = now() - interval '1 day' where uuid = '$expired'" \
  -c "update workspace set billing_tier = 3, trial_started_at = now(), trial_ends_at = now() + interval '5 days' where uuid = '$capped'" \
  -c "update \"user\" set is_platform_admin = true where email = '$staff'"
docker compose --profile fx run --rm -e FX_OWNER="$owner" -e EXPIRED="$expired" -e PRO="$pro" -e ESS="$ess" \
  -e CAPPED="$capped" -e STAFF="$staff" browser-fx node scripts/c30-billing.mjs 2>&1 | grep -v '^ *Container '
exit "${PIPESTATUS[0]}"

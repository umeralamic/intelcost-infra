#!/usr/bin/env bash
# C20: the Forum. Two passes with one database step between them on the fx database only
# (intelcost_fx): a throwaway seat is made platform staff, so the staff Reports board can remove
# and restore the reported post, as browser/c20-forum.mjs's header describes.
#
#   ./browser/c20-forum.sh      (from intelcost-infra/fx-suite; regress.sh runs it by name)

set -u
cd "$(dirname "$0")/.."

setup=$(docker compose --profile fx run --rm -e SETUP=1 browser-fx node scripts/c20-forum.mjs 2>&1)
value() { grep -oE "^$1=.*" <<<"$setup" | cut -d= -f2; }
owner=$(value OWNER)
replier=$(value REPLIER)
staff=$(value STAFF)
if [ -z "$owner" ] || [ -z "$replier" ] || [ -z "$staff" ]; then
  echo "FAIL  0. SETUP printed no OWNER, REPLIER or STAFF"
  echo "$setup" | tail -5
  echo "0/1 passed"
  exit 1
fi
echo "setup OWNER=$owner REPLIER=$replier STAFF=$staff"
docker compose exec -T postgres psql -U intelcost -d intelcost_fx -q \
  -c "update \"user\" set is_platform_admin = true where email = '$staff'"
docker compose --profile fx run --rm -e FX_OWNER="$owner" -e REPLIER="$replier" -e STAFF="$staff" \
  browser-fx node scripts/c20-forum.mjs 2>&1 | grep -v '^ *Container '
exit "${PIPESTATUS[0]}"

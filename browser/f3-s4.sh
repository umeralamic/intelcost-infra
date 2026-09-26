#!/usr/bin/env bash
# F3-S4: platform admin is a separate answer (D-23). Two passes with the staff flag set
# in the database between them, as browser/f3-s4.mjs's header describes.
#
#   ./browser/f3-s4.sh      (from intelcost-infra/; regress.sh runs it too)

set -u
cd "$(dirname "$0")/.."

setup=$(docker compose --profile browser run --rm -e SETUP=1 browser node scripts/f3-s4.mjs 2>&1)
staff=$(grep -oE '^STAFF=.*' <<<"$setup" | cut -d= -f2)
if [ -z "$staff" ]; then
  echo "FAIL  0. SETUP printed no STAFF"
  echo "$setup" | tail -5
  echo "0/1 passed"
  exit 1
fi
echo "setup STAFF=$staff"
docker compose exec -T postgres psql -U intelcost -d intelcost -q \
  -c "update \"user\" set is_platform_admin = true where email = '$staff'"
docker compose --profile browser run --rm -e STAFF="$staff" browser node scripts/f3-s4.mjs 2>&1 | grep -v '^ *Container '
exit "${PIPESTATUS[0]}"

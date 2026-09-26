#!/usr/bin/env bash
# Run a fixture that needs roles-matrix editing shipped in a workspace of its own
# (`shippedWorkspace` in lib/bench.mjs): a setup pass makes the workspace as the run's own
# account, the F3-S13 flag drive rolls the flag out to it, then the fixture runs.
#
#   browser/lib/shipped.sh <fixture>      (the fixture's own .sh calls this)

set -u
cd "$(dirname "$0")/../.."
fixture=$1

FX_OWNER="fx.${fixture}.$(date +%s%3N)@bench.intelcost.io"
setup=$(docker compose --profile browser run --rm -e SETUP=1 -e FX_OWNER="$FX_OWNER" browser node "scripts/$fixture.mjs" 2>&1)
shipped=$(grep -oE '^SHIPPED=.*' <<<"$setup" | cut -d= -f2-)
if [ -z "$shipped" ]; then
  echo "FAIL  0. the setup pass printed no SHIPPED"
  echo "$setup" | tail -5
  echo "0/1 passed"
  exit 1
fi
docker compose exec -T api sh -lc "cd /srv && python drives/f3-s13-flag.py '$shipped'" 2>&1 | grep -E 'is on|No '
docker compose --profile browser run --rm -e FX_OWNER="$FX_OWNER" -e SHIPPED="$shipped" \
  browser node "scripts/$fixture.mjs" 2>&1 | grep -v '^ *Container '
exit "${PIPESTATUS[0]}"

#!/bin/sh
# F4-S2 AC5: the dev-only UI gallery (`/dev/ui`) is not in a production build.
#
#   sh intelcost-infra/drives/f4-s2-bundle.sh
#
# Run from the host, against the app container, because `dist/` lives in the app image
# and only `src` is bind-mounted (see f3-s13-bundle.sh for why that is deliberate).
#
# A contrast, not an absence: each pattern must be present in the gallery's SOURCE and
# absent from the BUNDLE, so a typo in a pattern cannot pass by finding nothing anywhere.
set -eu
cd "$(dirname "$0")/.."

fail=0
check() {
  pattern="$1"
  in_src=$(docker compose exec -T app sh -lc "grep -c '$pattern' /app/src/pages/DevUiGallery.tsx /app/src/App.tsx | awk -F: '{s+=\$2} END {print s}'")
  in_dist=$(docker compose exec -T app sh -lc "grep -oh '$pattern' /app/dist/assets/*.js 2>/dev/null | wc -l")
  in_src=$(printf '%s' "$in_src" | tr -dc '0-9')
  in_dist=$(printf '%s' "$in_dist" | tr -dc '0-9')
  if [ "${in_src:-0}" -gt 0 ] && [ "${in_dist:-0}" -eq 0 ]; then
    printf 'PASS  %-36s source %s · bundle %s\n' "$pattern" "$in_src" "$in_dist"
  else
    printf 'FAIL  %-36s source %s · bundle %s\n' "$pattern" "$in_src" "$in_dist"
    fail=1
  fi
}

echo "=== f4-s2 AC5: the UI gallery is absent from the production bundle ==="
docker compose exec -T app sh -lc "npm run build >/dev/null 2>&1"
check '/dev/ui'
check 'UI primitives'
check 'Saving takes two seconds'

# The primitives themselves ARE in the bundle, because real screens use them. Without
# this the check could pass on a build that dropped everything.
shipped=$(docker compose exec -T app sh -lc "grep -oh 'Your role cannot create projects' /app/dist/assets/*.js | wc -l" | tr -dc '0-9')
if [ "${shipped:-0}" -gt 0 ]; then
  printf 'PASS  %-36s %s\n' 'the New project screen is shipped' "$shipped"
else
  printf 'FAIL  %-36s %s\n' 'the New project screen is shipped' "$shipped"
  fail=1
fi

exit "$fail"

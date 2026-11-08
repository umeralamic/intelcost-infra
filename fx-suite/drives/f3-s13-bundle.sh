#!/bin/sh
# F3-S13 AC5 — the dev force-on override is not in a production build.
#
#   sh intelcost-infra/drives/f3-s13-bundle.sh
#
# Run from the host, against the app container, because `dist/` lives in the app image:
# node_modules and the build output are the image's, and only `src` is bind-mounted, so
# there is no host copy to grep. That is deliberate (a host install for another platform
# cannot leak in) and it is why this is a script rather than a browser step.
#
# The check is a contrast, not an absence. Finding nothing in `dist/` proves little on
# its own — a typo in the pattern finds nothing too. So the same patterns are looked for
# in the SOURCE, where they must be present, and in the bundle, where they must not.
set -eu
cd "$(dirname "$0")/.."

fail=0
check() {
  pattern="$1"
  in_src=$(docker compose exec -T app sh -lc "grep -rc '$pattern' /app/src/features/workspace/hooks/use-feature-flag.ts || true")
  in_dist=$(docker compose exec -T app sh -lc "grep -oh '$pattern' /app/dist/assets/*.js 2>/dev/null | wc -l")
  in_src=$(printf '%s' "$in_src" | tr -dc '0-9')
  in_dist=$(printf '%s' "$in_dist" | tr -dc '0-9')
  if [ "${in_src:-0}" -gt 0 ] && [ "${in_dist:-0}" -eq 0 ]; then
    printf 'PASS  %-24s source %s · bundle %s\n' "$pattern" "$in_src" "$in_dist"
  else
    printf 'FAIL  %-24s source %s · bundle %s\n' "$pattern" "$in_src" "$in_dist"
    fail=1
  fi
}

echo "=== f3-s13 AC5: the dev override is absent from the production bundle ==="
docker compose exec -T app sh -lc "npm run build >/dev/null 2>&1"
check 'FORCE_FF'
check 'ff override active'

# And the bundle is real, so a missing file cannot pass everything above by default.
bytes=$(docker compose exec -T app sh -lc "cat /app/dist/assets/*.js | wc -c" | tr -dc '0-9')
if [ "${bytes:-0}" -gt 100000 ]; then
  printf 'PASS  %-24s %s bytes\n' 'bundle exists' "$bytes"
else
  printf 'FAIL  %-24s %s bytes\n' 'bundle exists' "$bytes"
  fail=1
fi

exit "$fail"

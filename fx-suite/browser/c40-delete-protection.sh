#!/usr/bin/env bash
# C40: delete protection (browser/c40-delete-protection.mjs). Its two expiry steps backdate a delete request, which
# the browser container cannot do: this runs the fixture and, while it runs, each statement it leaves in
# browser/.host-sql (lib/host-sql.mjs) with psql on the fx database only (intelcost_fx).
#
#   ./browser/c40-delete-protection.sh      (from intelcost-infra/fx-suite; regress.sh runs it by name)

set -u
cd "$(dirname "$0")/.."
q=browser/.host-sql
rm -rf "$q"
mkdir -p "$q"

# The fixture's own exit status, not grep's, kept in a file: a backgrounded pipeline's status is its last command's.
(
  docker compose --profile fx run --rm -e HOST_SQL=1 browser-fx node scripts/c40-delete-protection.mjs 2>&1 | grep -v '^ *Container '
  echo "${PIPESTATUS[0]}" >"$q/status"
) &
runner=$!

serve() {
  local f id out
  for f in "$q"/*.sql; do
    [ -e "$f" ] || continue
    id=$(basename "$f" .sql)
    if out=$(docker compose exec -T postgres psql -U intelcost -d intelcost_fx -v ON_ERROR_STOP=1 -q -c "$(cat "$f")" 2>&1); then
      printf '%s' "$out" >"$q/$id.done"
    else
      printf '%s' "$out" >"$q/$id.failed"
    fi
    rm -f "$f"
  done
}
while kill -0 "$runner" 2>/dev/null; do
  serve
  sleep 0.3
done
wait "$runner"
status=$(cat "$q/status" 2>/dev/null || echo 1)
rm -rf "$q"
exit "$status"

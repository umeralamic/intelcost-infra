#!/usr/bin/env bash
# F8-S3: re-auth on token refresh, driven on 2-minute access tokens.
#
#   ./browser/f8-s3.sh      (from intelcost-infra/; regress.sh runs it too)
#
# Recreates the api with ACCESS_TOKEN_MINUTES=2, runs browser/f8-s3.mjs (about six
# minutes), then recreates it on the default 30 whatever happened. Every other fixture
# assumes 30, so run nothing else meanwhile.

set -u
cd "$(dirname "$0")/.."

# 120 s, not 60 (D-925): the recreate is about 30 s idle, and 46 to 66 s past `up` beside the bench
# under a release's load even with the bytecode kept.
healthy() {
  for _ in $(seq 1 120); do
    curl -sf -m 2 http://localhost:8020/health >/dev/null && return 0
    sleep 1
  done
  echo "FAIL  the api did not come back"
  return 1
}

restore() {
  docker compose --profile fx up -d --no-deps api-fx >/dev/null 2>&1
  healthy
}
trap restore EXIT

ACCESS_TOKEN_MINUTES=2 docker compose --profile fx up -d --no-deps api-fx >/dev/null 2>&1
healthy || exit 1

docker compose --profile fx run --rm browser-fx node scripts/f8-s3.mjs 2>&1 | grep -v '^ Container'
exit "${PIPESTATUS[0]}"

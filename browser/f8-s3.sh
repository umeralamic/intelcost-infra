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

healthy() {
  for _ in $(seq 1 60); do
    curl -sf http://localhost:8000/health >/dev/null && return 0
    sleep 1
  done
  echo "FAIL  the api did not come back"
  return 1
}

restore() {
  docker compose up -d api >/dev/null 2>&1
  healthy
}
trap restore EXIT

ACCESS_TOKEN_MINUTES=2 docker compose up -d api >/dev/null 2>&1
healthy || exit 1

docker compose --profile browser run --rm browser node scripts/f8-s3.mjs 2>&1 | grep -v '^ Container'
exit "${PIPESTATUS[0]}"

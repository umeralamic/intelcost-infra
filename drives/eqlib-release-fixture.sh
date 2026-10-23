#!/usr/bin/env bash
# Bench only (F33 Block 4.3, D-741): a pretend national release 2 that moves one value, to see
# release notices work, and its rollback. Never shipped, never a migration: it writes the bench
# database of this compose project and nothing else, and `rollback` puts release 1 back exactly.
#
#   drives/eqlib-release-fixture.sh apply      # EX-CRAWL-20T rent_day 1,040 -> 1,100 as release 2
#   drives/eqlib-release-fixture.sh rollback   # back to 1,040, release 2 and its change row gone
#   drives/eqlib-release-fixture.sh status
set -euo pipefail
cd "$(dirname "$0")/.."
[ "$(docker compose ps --services --status running | grep -cx postgres)" = 1 ] || { echo "the bench postgres is not running"; exit 1; }
psql() { docker compose exec -T postgres sh -lc 'psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'; }

case "${1:-status}" in
  apply)
    psql <<'SQL'
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM eqlib.release WHERE id = 2) THEN RAISE EXCEPTION 'release 2 already exists'; END IF;
  IF (SELECT rent_day FROM eqlib.eq_class WHERE equip_key = 'EX-CRAWL-20T') <> 1040 THEN RAISE EXCEPTION 'EX-CRAWL-20T rent_day is not 1040'; END IF;
END $$;
INSERT INTO eqlib.release (id, title, source_file, source_sha256, row_counts, notes)
SELECT 2, 'BENCH FIXTURE release 2 (never shipped)', 'bench fixture', 'bench-fixture', row_counts,
       'F33 Block 4.3 check: EX-CRAWL-20T rent_day 1,040 -> 1,100. Roll back with drives/eqlib-release-fixture.sh rollback.'
FROM eqlib.release WHERE id = 1;
UPDATE eqlib.eq_class SET rent_day = 1100 WHERE equip_key = 'EX-CRAWL-20T';
INSERT INTO eqlib.eq_change (release_id, entity, entity_key, field, old_value, new_value)
VALUES (2, 'class', 'EX-CRAWL-20T', 'rent_day', '1040', '1100');
COMMIT;
SQL
    echo "release 2 applied" ;;
  rollback)
    psql <<'SQL'
BEGIN;
UPDATE eqlib.eq_class SET rent_day = 1040 WHERE equip_key = 'EX-CRAWL-20T';
DELETE FROM eqlib.eq_change WHERE release_id = 2;
DELETE FROM eqlib.release WHERE id = 2;
COMMIT;
SQL
    echo "rolled back to release 1" ;;
  status)
    psql <<'SQL'
SELECT (SELECT max(id) FROM eqlib.release) AS release, (SELECT rent_day FROM eqlib.eq_class WHERE equip_key = 'EX-CRAWL-20T') AS ex20_rent_day, (SELECT count(*) FROM eqlib.eq_change) AS changes;
SQL
    ;;
  *) echo "usage: $0 apply|rollback|status"; exit 2 ;;
esac

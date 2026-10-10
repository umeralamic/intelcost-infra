"""Bench only: delete the bucket objects that no row names AND whose workspace no longer exists
(D-341). Lists by default; deletes only with `--delete`, printing each key it removes.

    docker compose exec -T api sh -lc "cd /srv && python drives/delete-orphans.py"
    docker compose exec -T api sh -lc "cd /srv && python drives/delete-orphans.py --delete"

The weekly report (`report_storage_orphans`) only lists. An orphan under a workspace that still
exists is left alone here too: it may be a row to put back, not bytes to drop.
"""

import sys
from datetime import UTC, datetime
from typing import get_args

from sqlalchemy import text

import app.models_registry  # noqa: F401
from app.config import settings
from app.core import storage
from app.database import SyncSessionFactory
from app.worker.tasks.storage import ORPHAN_GRACE, referenced_keys


def main(delete: bool) -> None:
    with SyncSessionFactory() as session:
        known = referenced_keys(session)
        sheets = {str(u) for u in session.execute(text("select uuid from drawing_sheet")).scalars()}
        workspaces = {str(u) for u in session.execute(text("select uuid from workspace")).scalars()}
    client = storage._client()
    cutoff = datetime.now(UTC) - ORPHAN_GRACE
    doomed: list[tuple[str, int]] = []
    kept = 0
    for area in (*get_args(storage.Area), "community"):
        pages = client.get_paginator("list_objects_v2").paginate(
            Bucket=settings.s3_bucket, Prefix=f"{area}/"
        )
        for page in pages:
            for obj in page.get("Contents", []):
                key = obj["Key"]
                parts = key.split("/")
                if key in known or obj["LastModified"] > cutoff:
                    continue
                if len(parts) > 4 and parts[4] == "symbols" and parts[3] in sheets:
                    continue
                if area == "community" or parts[1] in workspaces:
                    kept += 1
                    continue
                doomed.append((key, int(obj.get("Size", 0))))
    total = sum(size for _, size in doomed)
    print(f"orphans in workspaces that no longer exist: {len(doomed)} ({total} bytes)")
    print(f"orphans left alone (their workspace exists, or community): {kept}")
    for key, size in doomed:
        if delete:
            storage.delete_object(key)
        print(f"{'deleted' if delete else 'would delete'} {key} {size}")


if __name__ == "__main__":
    main("--delete" in sys.argv[1:])

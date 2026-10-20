"""Bench only: put back in the bench bucket the objects the bench database names that only the
old MinIO store still has (D-339, D-340).

    docker compose exec -T api sh -lc "cd /srv && python drives/restore-from-minio.py dry-run"
    docker compose exec -T api sh -lc \
        "cd /srv && python drives/restore-from-minio.py copy" > log.csv
    … dry-run|copy --exclude-project "Umer plans test"   (repeatable; by project name)

D-259 moved the bench from MinIO to the real bucket on 2026-10-05 and copied nothing over, so the
rows made before it name keys the bucket never had. This copies exactly those:

- **Scope:** every value of every text column named `…key` or `…path` in the bench database
  that has the storage key scheme (`<area>/<uuid>/…`), missing from the bucket and present in
  MinIO. Nothing else of MinIO's.
- **Never overwrites:** each put is conditional (`If-None-Match: *`), after a head that found
  nothing; a key the bucket has is left alone and counted.
- **Verified:** the copy's size and MD5 against MinIO's; a mismatch is reported and the run fails.
- **Logged:** `copy` prints one CSV line per key copied (key, bytes, md5) on stdout, the summary
  on stderr.

Reads MinIO, writes only to the bucket in the api's own settings. Never deletes anything.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import hashlib
import re
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date
from typing import Any, get_args

import boto3
from botocore.exceptions import ClientError
from sqlalchemy import text

from app.config import settings
from app.core import storage
from app.database import SyncSessionFactory

MINIO = {
    "endpoint_url": "http://minio:9000",
    "aws_access_key_id": "minioadmin",
    "aws_secret_access_key": "minioadmin",
    "region_name": "us-east-1",
}
MINIO_BUCKET = "intelcost-local"
AREAS = (*get_args(storage.Area), "community")
KEY = re.compile(r"^(" + "|".join(re.escape(a) for a in AREAS) + r")/[0-9a-f-]{36}/.+[^/]$")
WINDOW = (date(2026, 9, 30), date(2026, 10, 5))


@dataclass
class Ref:
    key: str
    table: str
    workspace_id: int | None
    project_id: int | None
    made: date | None


def say(*parts: object) -> None:
    print(*parts, file=sys.stderr, flush=True)


def references() -> list[Ref]:
    """Every stored key the database names, with the row's workspace, project and date."""
    out: dict[str, Ref] = {}
    with SyncSessionFactory() as session:
        columns = session.execute(
            text(
                """select c.table_name, c.column_name
                   from information_schema.columns c
                   join information_schema.tables t
                     on t.table_name = c.table_name and t.table_schema = c.table_schema
                   where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
                     and c.data_type in ('character varying', 'text')
                     and (c.column_name like '%key' or c.column_name like '%path')"""
            )
        ).all()
        have = defaultdict(set)
        for table, column in session.execute(
            text(
                "select table_name, column_name from information_schema.columns "
                "where table_schema = 'public'"
            )
        ).all():
            have[table].add(column)
        for table, column in columns:
            ws = "workspace_id" if "workspace_id" in have[table] else "null::bigint"
            pr = "project_id" if "project_id" in have[table] else "null::bigint"
            made = "created_at::date" if "created_at" in have[table] else "null::date"
            rows = session.execute(
                text(
                    f'select "{column}", {ws}, {pr}, {made} from "{table}" '
                    f"where \"{column}\" ~ '^[a-z-]+/[0-9a-f-]{{36}}/'"
                )
            ).all()
            for key, ws_id, pr_id, d in rows:
                if KEY.match(key) and key not in out:
                    out[key] = Ref(key, table, ws_id, pr_id, d)
    return list(out.values())


def head(client: Any, bucket: str, key: str) -> dict[str, Any] | None:
    try:
        return dict(client.head_object(Bucket=bucket, Key=key))
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
            return None
        raise


def names() -> tuple[dict[int, str], dict[int, str]]:
    with SyncSessionFactory() as session:
        workspaces = {r[0]: r[1] for r in session.execute(text("select id, name from workspace"))}
        projects = {r[0]: r[1] for r in session.execute(text("select id, name from project"))}
    return workspaces, projects


def plan() -> tuple[list[tuple[Ref, int, str]], dict[str, int]]:
    """What to copy: (ref, MinIO size, MinIO content type). And the counts behind it."""
    bucket = storage._client()
    minio = boto3.client("s3", **MINIO)
    refs = references()

    def look(ref: Ref) -> tuple[Ref, str, int, str]:
        if head(bucket, settings.s3_bucket, ref.key) is not None:
            return ref, "in-bucket", 0, ""
        found = head(minio, MINIO_BUCKET, ref.key)
        if found is None:
            return ref, "lost", 0, ""
        return ref, "restore", int(found["ContentLength"]), str(found.get("ContentType") or "")

    with ThreadPoolExecutor(24) as pool:
        looked = list(pool.map(look, refs))
    counts: dict[str, int] = defaultdict(int)
    todo: list[tuple[Ref, int, str]] = []
    for ref, state, size, kind in looked:
        counts[state] += 1
        if state == "restore":
            todo.append((ref, size, kind))
        if state == "lost":
            say(f"lost (in neither): {ref.table} {ref.key}")
    counts["referenced"] = len(refs)
    return todo, counts


def report(todo: list[tuple[Ref, int, str]], counts: dict[str, int]) -> None:
    workspaces, projects = names()
    gb = sum(size for _, size, _ in todo) / 1e9
    say(
        f"referenced {counts['referenced']}  in bucket {counts['in-bucket']}  "
        f"to restore {counts['restore']} ({gb:.3f} GB)  in neither {counts['lost']}"
    )
    by_project: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    by_date: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    window: dict[tuple[str, str, str], list[int]] = defaultdict(lambda: [0, 0])
    for ref, size, _ in todo:
        ws = workspaces.get(ref.workspace_id or -1, "(no workspace)")
        pr = projects.get(ref.project_id or -1, "(workspace-level)")
        by_project[(ws, pr)][0] += 1
        by_project[(ws, pr)][1] += size
        d = str(ref.made or "unknown")
        by_date[d][0] += 1
        by_date[d][1] += size
        if ref.made and WINDOW[0] <= ref.made <= WINDOW[1]:
            window[(d, ws, pr)][0] += 1
            window[(d, ws, pr)][1] += size
    say("--- by workspace / project ---")
    for (ws, pr), (n, size) in sorted(by_project.items()):
        say(f"{ws} | {pr}: {n} objects, {size / 1e6:.1f} MB")
    say("--- by the row's date ---")
    for d, (n, size) in sorted(by_date.items()):
        say(f"{d}: {n} objects, {size / 1e6:.1f} MB")
    say(f"--- {WINDOW[0]} to {WINDOW[1]} ---")
    for (d, ws, pr), (n, size) in sorted(window.items()):
        say(f"{d} {ws} | {pr}: {n} objects, {size / 1e6:.1f} MB")
    if not window:
        say("nothing in the window is missing")


def copy(todo: list[tuple[Ref, int, str]]) -> None:
    bucket = storage._client()
    minio = boto3.client("s3", **MINIO)
    print("key,bytes,md5", flush=True)
    failures: list[str] = []
    skipped = 0

    def one(item: tuple[Ref, int, str]) -> tuple[str, str, int, str]:
        ref, size, kind = item
        # Never over an object the bucket has (it may have arrived since the plan).
        if head(bucket, settings.s3_bucket, ref.key) is not None:
            return ref.key, "skipped", 0, ""
        body = minio.get_object(Bucket=MINIO_BUCKET, Key=ref.key)["Body"].read()
        # MD5 as an integrity check, as S3's own ETag is, not for security.
        md5 = hashlib.md5(body).hexdigest()
        if len(body) != size:
            return ref.key, f"FAIL read {len(body)} of {size} bytes", 0, ""
        try:
            put = bucket.put_object(
                Bucket=settings.s3_bucket,
                Key=ref.key,
                Body=body,
                ContentType=kind or "application/octet-stream",
                IfNoneMatch="*",
            )
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            if code in ("PreconditionFailed", "ConditionalRequestConflict"):
                return ref.key, "skipped", 0, ""
            return ref.key, f"FAIL put {exc}", 0, ""
        after = head(bucket, settings.s3_bucket, ref.key)
        etag = str(put.get("ETag", "")).strip('"')
        if after is None or int(after["ContentLength"]) != size:
            return ref.key, "FAIL size after copy", 0, ""
        if etag != md5:
            # An encrypted bucket's ETag is not the MD5: read the copy back and compare.
            back = hashlib.md5(
                bucket.get_object(Bucket=settings.s3_bucket, Key=ref.key)["Body"].read()
            ).hexdigest()
            if back != md5:
                return ref.key, "FAIL checksum after copy", 0, ""
        return ref.key, "copied", size, md5

    copied = 0
    total = 0
    with ThreadPoolExecutor(12) as pool:
        for key, state, size, md5 in pool.map(one, todo):
            if state == "copied":
                copied += 1
                total += size
                print(f"{key},{size},{md5}", flush=True)
            elif state == "skipped":
                skipped += 1
            else:
                failures.append(f"{key}: {state}")
    say(
        f"copied {copied} ({total / 1e9:.3f} GB)  "
        f"skipped (already in the bucket) {skipped}  failed {len(failures)}"
    )
    for f in failures:
        say(f"FAIL {f}")
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else ""
    if step not in ("dry-run", "copy"):
        say(__doc__)
        raise SystemExit(2)
    args = sys.argv
    excluded = {args[i + 1] for i, a in enumerate(args[:-1]) if a == "--exclude-project"}
    todo, counts = plan()
    if excluded:
        _, project_names = names()
        held = [t for t in todo if project_names.get(t[0].project_id or -1) in excluded]
        todo = [t for t in todo if t not in held]
        counts["restore"] = len(todo)
        held_gb = sum(t[1] for t in held) / 1e9
        say(f"held back ({', '.join(sorted(excluded))}): {len(held)} objects, {held_gb:.3f} GB")
    report(todo, counts)
    if step == "copy":
        copy(todo)

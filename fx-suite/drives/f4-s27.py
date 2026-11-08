"""F4-S27: the nightly purge, driven where only the database and storage can see it.

    docker compose exec -T api sh -lc "cd /srv && python drives/f4-s27.py <step>"

Run by `browser/f4-s27.sh`, which says the order. Every step works on the newest
workspace named "F4-S27 purge", which `f4-s27.mjs setup` makes, and its three projects:
"Old trash", "Recent trash" and "Live". Each step prints one line saying what it saw, and
exits 1 with the reason when that is not what S27 says.

    age            Old trash went to Trash 31 days ago, Recent trash 5 days ago.
    run [dry]      Queue the job through Redis to the worker, as beat does, and wait.
    expect-dry     Nothing deleted; one dry-run log row, for Old trash only.
    expect-failed  Old trash's rows gone; its log row counts failures; its objects remain.
    expect-cleared That row reads 0 failed; its objects and its open upload are gone;
                   Recent trash and Live untouched; the activity feed has the purge.
"""

import asyncio
import sys
from datetime import UTC, datetime, timedelta

from botocore.exceptions import ClientError
from sqlalchemy import select

import app.models_registry  # noqa: F401  (relationships resolve by name)
from app.config import settings
from app.core import storage
from app.database import SessionFactory
from app.features.audit.models import AuditLog
from app.features.project.models import Project, ProjectFile, TrashPurgeLog
from app.features.workspace.models import Workspace
from app.worker.celery_app import celery_app

NAME = "F4-S27 purge"
TASK = "app.worker.tasks.maintenance.purge_trashed_projects"


def fail(message: str) -> None:
    print(f"FAIL  {message}")
    raise SystemExit(1)


def objects(prefix: str) -> int:
    client = storage._client()
    listed = client.list_objects_v2(Bucket=settings.s3_bucket, Prefix=prefix)
    return int(listed.get("KeyCount", 0))


def upload_open(key: str, upload_id: str) -> bool:
    try:
        storage.list_parts(key, upload_id)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "NoSuchUpload":
            return False
        raise
    return True


async def workspace_and_projects(session):  # type: ignore[no-untyped-def]
    workspace = await session.scalar(
        select(Workspace).where(Workspace.name.startswith(NAME)).order_by(Workspace.id.desc())
    )
    if workspace is None:
        fail("no F4-S27 purge workspace. Run `f4-s27.mjs setup` first.")
    projects = {
        p.name: p
        for p in await session.scalars(select(Project).where(Project.workspace_id == workspace.id))
    }
    return workspace, projects


async def logs(session, workspace):  # type: ignore[no-untyped-def]
    return list(
        await session.scalars(
            select(TrashPurgeLog)
            .where(TrashPurgeLog.workspace_id == workspace.id)
            .order_by(TrashPurgeLog.id)
        )
    )


async def age() -> None:
    async with SessionFactory() as session:
        _, projects = await workspace_and_projects(session)
        now = datetime.now(UTC)
        for name, days in (("Old trash", 31), ("Recent trash", 5)):
            if name not in projects or projects[name].deleted_at is None:
                fail(f"{name} is not in Trash")
            projects[name].deleted_at = now - timedelta(days=days)
        await session.commit()
    print("aged  Old trash 31 days, Recent trash 5 days")


def run(dry: bool) -> None:
    result = celery_app.send_task(TASK, kwargs={"dry_run": dry}).get(timeout=300)
    print(f"ran   {'dry run' if dry else 'purge'}: {result}")


async def expect(step: str) -> None:
    async with SessionFactory() as session:
        workspace, projects = await workspace_and_projects(session)
        rows = await logs(session, workspace)
        names = sorted(projects)
        mine = [r for r in rows if not r.dry_run]

        if step == "expect-dry":
            if names != ["Live", "Old trash", "Recent trash"]:
                fail(f"a dry run deleted something: left {names}")
            dry = [r for r in rows if r.dry_run]
            if [r.project_name for r in dry] != ["Old trash"] or mine:
                fail(f"log rows: {[(r.project_name, r.dry_run) for r in rows]}")
            if dry[0].purged_at is not None or dry[0].file_count != 1:
                fail(f"dry row purged_at {dry[0].purged_at}, files {dry[0].file_count}")
            print("dry   nothing deleted · one row, Old trash, dry_run true, 1 file")
            return

        if not mine or mine[-1].project_name != "Old trash":
            fail(f"no purge row for Old trash: {[(r.project_name, r.dry_run) for r in rows]}")
        log = mine[-1]
        if names != ["Live", "Recent trash"]:
            fail(f"projects left: {names}")
        orphans = await session.scalar(
            select(ProjectFile.id).where(
                ProjectFile.workspace_id == workspace.id,
                ProjectFile.storage_key.contains(str(log.project_uuid)),
            )
        )
        if orphans is not None:
            fail("Old trash's file rows survived its project")
        stored = sum(objects(p) for p in log.prefixes)

        if step == "expect-failed":
            if log.prefixes_failed == 0 or not log.error:
                fail(f"no failure recorded: failed {log.prefixes_failed}, error {log.error!r}")
            if stored == 0:
                fail("the objects went although storage was down")
            if not log.open_uploads:
                fail("the open upload was dropped from the row before it was aborted")
            print(
                f"fail  rows gone · log: {log.prefixes_failed} left to do, "
                f"{len(log.open_uploads)} upload to abort · {stored} object(s) still stored"
            )
            return

        if step == "expect-cleared":
            if log.prefixes_failed != 0 or log.failed_prefixes or log.open_uploads:
                fail(f"row still has work: {log.prefixes_failed}, {log.failed_prefixes}")
            if log.storage_cleared_at is None:
                fail("storage_cleared_at not stamped")
            if stored != 0:
                fail(f"{stored} object(s) left under Old trash's prefixes")
            key, upload_id = OPEN_UPLOAD[0], OPEN_UPLOAD[1]
            if upload_open(key, upload_id):
                fail("the unfinished upload was never aborted")
            for name in ("Recent trash", "Live"):
                keys = await session.scalars(
                    select(ProjectFile.storage_key).where(
                        ProjectFile.project_id == projects[name].id,
                        ProjectFile.uploaded_at.is_not(None),
                    )
                )
                for k in keys:
                    try:
                        storage._client().head_object(Bucket=settings.s3_bucket, Key=k)
                    except ClientError:
                        fail(f"{name} lost {k}")
            said = await session.scalar(
                select(AuditLog).where(
                    AuditLog.workspace_id == workspace.id,
                    AuditLog.action == "project.purged",
                    AuditLog.target == "Old trash",
                )
            )
            if said is None or said.actor_name != "IntelCost" or (said.after or {}).get("by") != "nightly":
                fail("no nightly purge line in the activity feed")
            print(
                "clear 0 left · storage_cleared_at stamped · 0 objects · upload aborted · "
                "Recent trash and Live intact · activity: IntelCost permanently deleted Old trash"
            )
            return
    fail(f"unknown step {step}")


OPEN_UPLOAD: list[str] = []


async def remember_upload() -> None:
    """The unfinished upload's key and id, read before the purge takes its row."""
    async with SessionFactory() as session:
        _, projects = await workspace_and_projects(session)
        row = await session.execute(
            select(ProjectFile.storage_key, ProjectFile.upload_id).where(
                ProjectFile.project_id == projects["Old trash"].id,
                ProjectFile.uploaded_at.is_(None),
            )
        )
        found = row.first()
        if found is None or found[1] is None:
            fail("Old trash has no unfinished upload")
        print(f"{found[0]} {found[1]}")


def main() -> None:
    step = sys.argv[1] if len(sys.argv) > 1 else ""
    if step == "age":
        asyncio.run(age())
    elif step == "run":
        run(dry=len(sys.argv) > 2 and sys.argv[2] == "dry")
    elif step == "upload":
        asyncio.run(remember_upload())
    elif step.startswith("expect-"):
        if step == "expect-cleared":
            # Handed over by the shell, from `upload` before the purge.
            if len(sys.argv) < 4:
                fail("expect-cleared needs the upload's key and id")
            OPEN_UPLOAD.extend([sys.argv[2], sys.argv[3]])
        asyncio.run(expect(step))
    else:
        print(__doc__)
        raise SystemExit(2)


main()

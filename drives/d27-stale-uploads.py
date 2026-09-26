"""D-27: the nightly sweep of abandoned uploads, driven where only the database and
storage can see it.

    docker compose exec -T api sh -lc "cd /srv && python drives/d27-stale-uploads.py"

Makes its own workspace, "D-27 stale uploads <stamp>", and removes it at the end, so the
seeded Bench Construction is never touched. Four unfinished or finished uploads, each
with a real multipart upload open in MinIO where it is unfinished:

    Live · Old unfinished   25 hours old, never completed    → aborted, row gone
    Live · New unfinished   1 hour old                        → left alone
    Live · Old finished     25 hours old, completed           → left alone
    Trashed · Old unfinished  25 hours old, project in Trash  → left alone (the purge's)

Then the job runs through Redis to the worker, as beat queues it, and a second run shows
the sweep is idempotent. Prints one line per check and exits 1 on the first failure.
"""

import asyncio
import sys
import uuid as uuid_module
from datetime import UTC, datetime, timedelta

from botocore.exceptions import ClientError
from sqlalchemy import delete, select

import app.models_registry  # noqa: F401  (relationships resolve by name)
from app.core import storage
from app.database import SessionFactory
from app.features.auth.models import User
from app.features.project.models import Project, ProjectFile
from app.features.workspace.models import Workspace
from app.worker.celery_app import celery_app

TASK = "app.worker.tasks.maintenance.abort_stale_uploads"
SEEDED = "estimator@bench.intelcost.io"


def fail(message: str) -> None:
    print(f"FAIL  {message}")
    raise SystemExit(1)


def upload_open(key: str, upload_id: str) -> bool:
    try:
        storage.list_parts(key, upload_id)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "NoSuchUpload":
            return False
        raise
    return True


async def setup() -> tuple[int, dict[str, tuple[str, str | None]]]:
    """The workspace id, and each file's (key, upload_id) by label."""
    stamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S%f")
    now = datetime.now(UTC)
    old = now - timedelta(hours=25)
    files: dict[str, tuple[str, str | None]] = {}
    async with SessionFactory() as session:
        owner = await session.scalar(select(User).where(User.email == SEEDED))
        if owner is None:
            fail("the seeded owner is missing")
        workspace = Workspace(
            name=f"D-27 stale uploads {stamp}", slug=f"d27-{stamp}", owner_id=owner.id
        )
        session.add(workspace)
        await session.flush()
        live = Project(workspace_id=workspace.id, name="Live", created_by_id=owner.id)
        trashed = Project(
            workspace_id=workspace.id, name="Trashed", created_by_id=owner.id, deleted_at=now
        )
        session.add_all([live, trashed])
        await session.flush()

        plan = (
            ("old-unfinished", live, old, False),
            ("new-unfinished", live, now - timedelta(hours=1), False),
            ("old-finished", live, old, True),
            ("trashed-unfinished", trashed, old, False),
        )
        for label, project, created, finished in plan:
            key = f"project-files/{workspace.uuid}/{project.uuid}/{uuid_module.uuid4()}/{label}.pdf"
            upload_id = await asyncio.to_thread(storage.create_multipart, key, "application/pdf")
            session.add(
                ProjectFile(
                    workspace_id=workspace.id,
                    project_id=project.id,
                    file_name=f"{label}.pdf",
                    storage_key=key,
                    content_type="application/pdf",
                    byte_size=1,
                    part_size=5 * 1024 * 1024,
                    upload_id=None if finished else upload_id,
                    uploaded_by_id=owner.id,
                    uploaded_at=created if finished else None,
                    created_at=created,
                )
            )
            if finished:
                # A finished file has no open upload; its object is what S3 holds.
                await asyncio.to_thread(storage.abort_multipart, key, upload_id)
                files[label] = (key, None)
            else:
                files[label] = (key, upload_id)
        await session.commit()
        print(f"setup {workspace.name}: 4 files, 3 uploads open in MinIO")
        return workspace.id, files


async def rows(workspace_id: int) -> set[str]:
    async with SessionFactory() as session:
        names = await session.scalars(
            select(ProjectFile.file_name).where(ProjectFile.workspace_id == workspace_id)
        )
        return {name.removesuffix(".pdf") for name in names}


async def cleanup(workspace_id: int, files: dict[str, tuple[str, str | None]]) -> None:
    for key, upload_id in files.values():
        if upload_id and upload_open(key, upload_id):
            storage.abort_multipart(key, upload_id)
    async with SessionFactory() as session:
        await session.execute(delete(ProjectFile).where(ProjectFile.workspace_id == workspace_id))
        await session.execute(delete(Project).where(Project.workspace_id == workspace_id))
        await session.execute(delete(Workspace).where(Workspace.id == workspace_id))
        await session.commit()
    print("clean the drive's workspace, projects, rows and uploads removed")


def run() -> dict[str, int]:
    result: dict[str, int] = celery_app.send_task(TASK).get(timeout=120)
    print(f"ran   abort_stale_uploads: {result}")
    return result


async def main() -> None:
    workspace_id, files = await setup()
    try:
        first = run()
        if first.get("failed"):
            fail(f"the sweep reported failures: {first}")
        left = await rows(workspace_id)
        expected = {"new-unfinished", "old-finished", "trashed-unfinished"}
        if left != expected:
            fail(f"rows left {sorted(left)}, wanted {sorted(expected)}")
        print("rows  the old unfinished upload's row is gone; the other three stay")

        key, upload_id = files["old-unfinished"]
        if upload_id is None or upload_open(key, upload_id):
            fail("the old unfinished upload is still open in MinIO")
        for label in ("new-unfinished", "trashed-unfinished"):
            key, upload_id = files[label]
            if upload_id is None or not upload_open(key, upload_id):
                fail(f"{label}'s upload was aborted, and it should not have been")
        print("minio the old upload aborted; the recent one and the trashed project's still open")

        run()
        if await rows(workspace_id) != expected:
            fail("a second run changed the rows")
        print("again a second run leaves the same three")
    finally:
        await cleanup(workspace_id, files)


if __name__ == "__main__":
    asyncio.run(main())
    sys.exit(0)

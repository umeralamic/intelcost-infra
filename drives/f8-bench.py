"""F8 bench drives: what only the database and Redis can see.

    docker compose exec -T api sh -lc "cd /srv && python drives/f8-bench.py <step> [args]"

    age <project uuid>     Put a trashed project 31 days into Trash, so the nightly purge
                           takes it (F8-S6). Prints "aged".
    purge [dry]            Queue the purge through Redis to the worker, as beat does, and
                           wait for it. Prints "ran" and the counts.
    rollback <workspace>   Register a publish on a session whose transaction fails, and
                           listen on the workspace's channel for 3 s. Prints "silent" if
                           nothing arrived (F8-S5 AC2), "FAIL" if something did.
"""

import asyncio
import sys
import time
import uuid
from datetime import UTC, datetime, timedelta

import redis
from sqlalchemy import select

import app.models_registry  # noqa: F401  (relationships resolve by name)
from app.config import settings
from app.core import outbox
from app.database import SessionFactory
from app.features.project.models import Project
from app.features.realtime import publish as realtime
from app.worker.celery_app import celery_app

TASK = "app.worker.tasks.maintenance.purge_trashed_projects"


def fail(message: str) -> None:
    print(f"FAIL  {message}")
    raise SystemExit(1)


async def age(project_uuid: str) -> None:
    async with SessionFactory() as session:
        project = await session.scalar(select(Project).where(Project.uuid == uuid.UUID(project_uuid)))
        if project is None or project.deleted_at is None:
            fail(f"{project_uuid} is not a trashed project")
        project.deleted_at = datetime.now(UTC) - timedelta(days=31)
        await session.commit()
    print(f"aged {project_uuid}")


def purge(dry: bool) -> None:
    result = celery_app.send_task(TASK, kwargs={"dry_run": dry}).get(timeout=60)
    print(f"ran {'dry ' if dry else ''}{result}")


async def rollback(workspace_uuid: str) -> None:
    listener = redis.Redis.from_url(str(settings.redis_url)).pubsub(ignore_subscribe_messages=True)
    listener.subscribe(realtime.channel(realtime.topic_for(uuid.UUID(workspace_uuid))))
    try:
        async with SessionFactory() as session:
            realtime.publish(session, uuid.UUID(workspace_uuid), "bench.rollback", {})
            # What TransactionalRoute does with a handler that raises: no commit, no
            # drain. The registration dies with the session.
            raise RuntimeError("the handler failed")
    except RuntimeError:
        pass
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        message = listener.get_message(timeout=0.2)
        if message and message.get("type") == "message":
            fail(f"a rolled-back publish arrived: {message['data'][:120]!r}")
    # And the positive control: the same registration, committed, does arrive.
    async with SessionFactory() as session:
        realtime.publish(session, uuid.UUID(workspace_uuid), "bench.committed", {})
        await session.commit()
        await outbox.adrain(session)
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        message = listener.get_message(timeout=0.2)
        if message and message.get("type") == "message":
            print("silent: the rolled-back publish never arrived; the committed one did")
            return
    fail("the committed control publish did not arrive either")


def main() -> None:
    step, *args = sys.argv[1:] or ["?"]
    if step == "age" and args:
        asyncio.run(age(args[0]))
    elif step == "purge":
        purge(dry=args[:1] == ["dry"])
    elif step == "rollback" and args:
        asyncio.run(rollback(args[0]))
    else:
        fail(__doc__ or "usage")


if __name__ == "__main__":
    main()

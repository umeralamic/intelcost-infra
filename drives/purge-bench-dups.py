"""Bench only: purge the bench's duplicates of the 3D test copy (D-634).

    docker compose exec -T api sh -lc "cd /srv && python drives/purge-bench-dups.py"
    docker compose exec -T api sh -lc "cd /srv && python drives/purge-bench-dups.py --purge"

The first lists, the second purges. A project goes only when its name is exactly
"BENCH DUP <yyyy-mm-dd hh:mm> — delete me", the name the MCP guard gives every copy it sees
made (D-544). Anything else is never touched, and a matching name is still refused when the
project is on the guard's protected list or sits in the founder's own workspace (D-542, D-601):
those are printed REFUSED and left.

Signs in as no one: it runs the nightly purge's own steps (`purge_trashed_projects`, pass 2)
on each project. Each purge writes a `trash_purge_log` row and an audit entry ("by":
"bench-dup-purge") in the same transaction as the row delete, then clears the project's storage
in the bench bucket and writes the outcome back on the log row. Each is printed, one line each.
"""

import re
import sys
from datetime import UTC, datetime

from sqlalchemy import delete, select

import app.models_registry  # noqa: F401
from app.core import outbox
from app.database import SyncSessionFactory
from app.features.audit import service as audit
from app.features.project import trash
from app.features.project.models import Project
from app.features.realtime import publish as realtime
from app.features.workspace.models import Workspace
from app.worker.tasks.storage import clear_purged

NAME = re.compile(r"^BENCH DUP \d{4}-\d{2}-\d{2} \d{2}:\d{2} — delete me$")

# The guard's protected projects (browser/mcp-guard.js, lib/protected.mjs): never purged.
PROTECTED = {
    "042c8817-4a65-47ba-95d8-686ecf986246": "Hidden Valley Rebid — 3D test",
    "9c348237-1ca6-42d0-bd8c-712d7cf915c1": "HIdden Valley Spec",
    "bd8fc5b0-34ca-4186-99f0-7278c43b4c1c": "Hidden Valley Spec Building Rebid",
    "51e474d2-b55b-40d2-ab46-09433ffc5add": "Waxing City",
    "09f1fc14-42f4-4140-9726-bcaf3056ea87": "Minmar",
    "90cb3a75-3553-4de0-aac4-1693c7d18d57": "Miramar Cove Vault Buildings",
    "c1770e62-715a-4d1d-8be5-aa2f23ecdeed": "11",
    "4df73dc7-901b-4933-b2bb-fafc327b01f0": "Hidden Valley Rebid — 3D test (shared copy)",
}
# The founder's own workspace (Intelcost Team): nothing in it is ever purged from here.
FOUNDER_WORKSPACES = {"04df326a-6dba-41df-ac98-095bf841f910": "Intelcost Team"}


def main() -> None:
    purge = "--purge" in sys.argv[1:]
    now = datetime.now(UTC)
    purged = refused = would = 0
    with SyncSessionFactory() as session:
        rows = session.execute(
            select(Project, Workspace.uuid, Workspace.name)
            .join(Workspace, Workspace.id == Project.workspace_id)
            .where(Project.name.like("BENCH DUP %"))
            .order_by(Project.created_at)
        ).all()
        for project, workspace_uuid, workspace_name in rows:
            if not NAME.match(project.name):
                continue
            uuid = str(project.uuid)
            if uuid in PROTECTED or str(workspace_uuid) in FOUNDER_WORKSPACES:
                print(f"REFUSED  {uuid}  {project.name!r} in {workspace_name}: protected (D-601)")
                refused += 1
                continue
            if not purge:
                print(f"would purge  {uuid}  {project.name!r} in {workspace_name}")
                would += 1
                continue
            if project.deleted_at is None:
                project.deleted_at = now
            file_count, open_uploads = trash.tally(
                session.execute(trash.files_of(project.workspace_id, project.id)).all()
            )
            log = trash.snapshot(
                project,
                workspace_uuid,
                file_count=file_count,
                open_uploads=open_uploads,
                purged_at=now,
                purged_by_id=None,
            )
            session.add(log)
            audit.record(
                session,
                project.workspace_id,
                None,
                audit.Action.PROJECT_PURGED,
                target=project.name,
                after={"by": "bench-dup-purge", "files": file_count},
            )
            realtime.publish(session, workspace_uuid, "project.purged", {"project_uuid": uuid})
            # The database cascades to folders, files, drawings, sheets and takeoff.
            session.execute(delete(Project).where(Project.id == project.id))
            outbox.commit_and_drain(session)
            clear_purged(log)
            session.commit()
            purged += 1
            print(
                f"purged  {uuid}  {project.name!r} in {workspace_name}: {file_count} files, "
                f"log {log.uuid}, storage failures {log.prefixes_failed}"
            )
    done = purged if purge else would
    print(f"{'purged' if purge else 'would purge'}: {done}, refused: {refused}")


if __name__ == "__main__":
    main()

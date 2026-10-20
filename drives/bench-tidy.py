"""Bench only: clear fixture clutter from the seeded workspace, Bench Construction Test (slug
"bench-construction"), in the api's process, signed in as no one (T2, D-662). It replaces
browser/bench-tidy.mjs, which signed in as the workspace's owner, an account no run may use.

    docker compose exec -T api sh -lc "cd /srv && PYTHONPATH=/srv python drives/bench-tidy.py"
    docker compose exec -T api sh -lc "cd /srv && PYTHONPATH=/srv python drives/bench-tidy.py --tidy"

The first lists, the second clears. Fixtures used to make their projects and seat their members
in the seeded workspace and leave them there; they now make fresh workspaces and discard them.
This clears what the old runs left, matched by name, never by age, so nothing a person made by
hand is touched:
  - a project named "<fixture prefix> <13-digit timestamp>" (the prefixes below), live or in the
    trash: purged with the nightly purge's own steps, as drives/purge-bench-dups.py does;
  - a member whose address is "<tag>-<role>-<13-digit timestamp>@bench.intelcost.io", the form
    `seatedMember` makes, never the owner and never a founder account: their seat removed;
  - Sara W. (window-b@bench.intelcost.io) put back to Estimator if a check left her on another
    role.
Only that one workspace; the guard's protected projects never, whatever their name.
"""

import re
import sys
from datetime import UTC, datetime

from sqlalchemy import delete, select

import app.models_registry  # noqa: F401
from app.core import outbox
from app.database import SyncSessionFactory
from app.features.audit import service as audit
from app.features.auth.models import User
from app.features.project import trash
from app.features.project.models import Project
from app.features.realtime import publish as realtime
from app.features.workspace.capabilities import WorkspaceRole
from app.features.workspace.models import Workspace, WorkspaceMember
from app.worker.tasks.storage import clear_purged

SLUG = "bench-construction"
PROJECT_PREFIXES = ["F4-S1 ", "F4-S2 dialog ", "F8-S4 topic ", "F8-S8 made while B was away ", "S6 probe "]
FIXTURE_PROJECT = re.compile(rf"^({'|'.join(re.escape(p) for p in PROJECT_PREFIXES)}).*\d{{13}}$")
FIXTURE_SEAT = re.compile(r"^[a-z0-9]+-[a-z_]+-\d{13}@bench\.intelcost\.io$")
SARA = "window-b@bench.intelcost.io"
FOUNDER = {"estimator@bench.intelcost.io", "umeralam.q@gmail.com"}
# The guard's protected projects (browser/mcp-guard.js, lib/protected.mjs): never touched.
PROTECTED = {
    "042c8817-4a65-47ba-95d8-686ecf986246",
    "9c348237-1ca6-42d0-bd8c-712d7cf915c1",
    "bd8fc5b0-34ca-4186-99f0-7278c43b4c1c",
    "51e474d2-b55b-40d2-ab46-09433ffc5add",
    "09f1fc14-42f4-4140-9726-bcaf3056ea87",
    "90cb3a75-3553-4de0-aac4-1693c7d18d57",
    "c1770e62-715a-4d1d-8be5-aa2f23ecdeed",
    "4df73dc7-901b-4933-b2bb-fafc327b01f0",
}


def main() -> None:
    tidy = "--tidy" in sys.argv[1:]
    now = datetime.now(UTC)
    with SyncSessionFactory() as session:
        workspace = session.scalar(select(Workspace).where(Workspace.slug == SLUG))
        if workspace is None:
            raise SystemExit(f"no {SLUG} workspace")
        projects = session.scalars(select(Project).where(Project.workspace_id == workspace.id)).all()
        doomed = [p for p in projects if FIXTURE_PROJECT.match(p.name) and str(p.uuid) not in PROTECTED]
        kept = sorted({p.name for p in projects if p not in doomed})
        for project in doomed:
            if not tidy:
                print(f"would purge project  {project.uuid}  {project.name!r}")
                continue
            if project.deleted_at is None:
                project.deleted_at = now
            file_count, open_uploads = trash.tally(session.execute(trash.files_of(workspace.id, project.id)).all())
            log = trash.snapshot(project, workspace.uuid, file_count=file_count, open_uploads=open_uploads, purged_at=now, purged_by_id=None)
            session.add(log)
            audit.record(session, workspace.id, None, audit.Action.PROJECT_PURGED, target=project.name, after={"by": "bench-tidy", "files": file_count})
            realtime.publish(session, workspace.uuid, "project.purged", {"project_uuid": str(project.uuid)})
            session.execute(delete(Project).where(Project.id == project.id))
            outbox.commit_and_drain(session)
            clear_purged(log)
            session.commit()
            print(f"purged project  {project.uuid}  {project.name!r}: {file_count} files, storage failures {log.prefixes_failed}")

        members = session.execute(
            select(WorkspaceMember, User.email).join(User, User.id == WorkspaceMember.user_id).where(WorkspaceMember.workspace_id == workspace.id)
        ).all()
        seats = [
            (member, email)
            for member, email in members
            if member.role != WorkspaceRole.OWNER and email not in FOUNDER and email != SARA and FIXTURE_SEAT.match(email)
        ]
        for member, email in seats:
            if not tidy:
                print(f"would remove seat  {email}  ({member.role})")
                continue
            audit.record(session, workspace.id, None, audit.Action.MEMBER_REMOVED, target=email, before={"role": str(member.role)}, after={"by": "bench-tidy"})
            session.delete(member)
        sara = next((member for member, email in members if email == SARA), None)
        note = f"Sara W. is {sara.role}" if sara else "Sara W. is not a member"
        if sara and sara.role != WorkspaceRole.ESTIMATOR:
            if tidy:
                audit.record(session, workspace.id, None, audit.Action.MEMBER_ROLE_CHANGED, target=SARA, before={"role": str(sara.role)}, after={"role": "estimator", "by": "bench-tidy"})
                note = f"Sara W. put back to estimator (was {sara.role})"
                sara.role = WorkspaceRole.ESTIMATOR
            else:
                note = f"Sara W. would be put back to estimator (is {sara.role})"
        session.commit()
    verb = "removed" if tidy else "would remove"
    print(f"{verb} {len(doomed)} fixture projects and {len(seats)} fixture seats from {workspace.name}")
    print(f"kept projects: {len(kept)}")
    print(note)


if __name__ == "__main__":
    main()

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
Only that one workspace, and only projects whose names start with a fixture prefix are read; the
protected projects never, whatever their name, refused by the drives' guard (D-667) before any read.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import re
import sys
from datetime import UTC, datetime

from sqlalchemy import delete, func, or_, select

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
FOUNDER = set(guard.FOUNDER_EMAILS)
# The guard's protected projects (scripts/protected.py, as lib/protected.mjs): never touched.
PROTECTED = set(guard.PROTECTED)


def main() -> None:
    tidy = "--tidy" in sys.argv[1:]
    now = datetime.now(UTC)
    with SyncSessionFactory() as session:
        workspace = session.scalar(select(Workspace).where(Workspace.slug == SLUG))
        if workspace is None:
            raise SystemExit(f"no {SLUG} workspace")
        # Only rows named like a fixture's are read; the workspace's other projects only counted.
        named = or_(*(Project.name.startswith(prefix, autoescape=True) for prefix in PROJECT_PREFIXES))
        projects = session.scalars(select(Project).where(Project.workspace_id == workspace.id, named)).all()
        doomed = [p for p in projects if FIXTURE_PROJECT.match(p.name) and str(p.uuid) not in PROTECTED]
        kept = session.scalar(select(func.count()).select_from(Project).where(Project.workspace_id == workspace.id)) - len(doomed)
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
    print(f"kept projects: {kept}")
    print(note)


if __name__ == "__main__":
    main()

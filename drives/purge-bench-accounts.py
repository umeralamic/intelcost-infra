"""Bench only: purge the bench's throwaway accounts (Q149, the founder's queue of 2026-11-04).

    docker compose exec -T api sh -lc \n        "cd /srv && PYTHONPATH=/srv python drives/purge-bench-accounts.py [--purge]"

A dry run by default: it prints every account it would delete, one line each, and the ones it
refuses. `--purge` deletes them. An account goes only when its email matches a throwaway pattern:

  - a session's or a fixture's own account, `fx.<name>.<12 or 13 digit stamp>@bench.intelcost.io`;
  - a seat a fixture made, `<tag>-<role>-<13 digit stamp>@bench.intelcost.io`.

Anything else is never touched (window-b, walkthrough, the seeded account, a person's). A matching
account is still REFUSED when it is on the fingerprint's founder list (scripts/protected.py), owns
a workspace holding a protected project, sits in one of the founder's own workspaces, or owns or sits in
a workspace the founder keeps for tests (KEEP_WORKSPACES).

An account goes with the workspaces it owns: their objects in storage first, by prefix, then the
workspace rows, which cascade (as bench-workspaces.py purge-fx). Then its user row, each in its own
savepoint: an account another workspace's rows still name (a project it made there) is KEPT and
printed with the reason, never forced.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import asyncio
import re
import sys
from collections import defaultdict
from typing import get_args

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

import app.models_registry  # noqa: F401  (relationships resolve by name)
from app.core import storage
from app.database import SessionFactory
from app.features.auth.models import User
from app.features.project.models import Project
from app.features.workspace.models import Workspace, WorkspaceMember
from protected import FOUNDER_EMAILS  # scripts/protected.py, the fingerprint's list

THROWAWAY = (
    re.compile(r"^fx\.[a-z0-9-]+(?:\.[a-z0-9-]+)*\.\d{12,13}@bench\.intelcost\.io$"),
    re.compile(r"^[a-z0-9]+(?:-[a-z0-9_]+)+-\d{13}@bench\.intelcost\.io$"),
)
PROTECTED = set(guard.PROTECTED)
FOUNDER_WORKSPACES = set(guard.FOUNDER_WORKSPACE_UUIDS)
KEEP_WORKSPACES = {
    # The Stitch sheets and site view test project, "zz Stitch 10793 copy 2" (the founder, 2026-10-28).
    "67577761-76f2-48de-be7b-05b2bd0a113c",
    # The quantity table's "zz MyEq project" (drives/quantity-table.py `parents`), made again on
    # 2026-11-04 after the first purge took it with its throwaway owner (D-980).
    "34be6ba5-ddfd-4d5d-ba4d-03a0aaf1b5a0",
}


def throwaway(email: str) -> bool:
    return any(p.match(email) for p in THROWAWAY)


async def plan() -> tuple[list[tuple[User, list[Workspace]]], list[tuple[str, str]]]:
    async with SessionFactory() as session:
        users = [u for u in (await session.scalars(select(User))).all() if throwaway(u.email)]
        owned: dict[int, list[Workspace]] = defaultdict(list)
        for w in (await session.scalars(select(Workspace))).all():
            owned[w.owner_id].append(w)
        held = {
            ws
            for ws, project in (
                await session.execute(
                    select(Workspace.uuid, Project.uuid).join(
                        Project, Project.workspace_id == Workspace.id
                    )
                )
            ).all()
            if str(project) in PROTECTED
        }
        members = (
            await session.execute(
                select(WorkspaceMember.user_id, Workspace.uuid).join(
                    Workspace, Workspace.id == WorkspaceMember.workspace_id
                )
            )
        ).all()
        seated = {uid for uid, ws in members if str(ws) in FOUNDER_WORKSPACES}
        kept_seats = {uid for uid, ws in members if str(ws) in KEEP_WORKSPACES}
    go: list[tuple[User, list[Workspace]]] = []
    refused: list[tuple[str, str]] = []
    for u in sorted(users, key=lambda x: x.email):
        if u.email.lower() in FOUNDER_EMAILS:
            refused.append((u.email, "on the founder list"))
        elif any(w.uuid in held for w in owned[u.id]):
            refused.append((u.email, "owns a workspace holding a protected project"))
        elif any(str(w.uuid) in FOUNDER_WORKSPACES for w in owned[u.id]) or u.id in seated:
            refused.append((u.email, "in one of the founder's workspaces"))
        elif any(str(w.uuid) in KEEP_WORKSPACES for w in owned[u.id]) or u.id in kept_seats:
            refused.append((u.email, "in a workspace the founder keeps for tests"))
        else:
            go.append((u, owned[u.id]))
    return go, refused


async def purge(go: list[tuple[User, list[Workspace]]]) -> tuple[int, int, list[tuple[str, str]]]:
    areas = get_args(storage.Area)
    users = workspaces = 0
    kept: list[tuple[str, str]] = []
    for u, owned in go:
        async with SessionFactory() as session:
            try:
                async with session.begin():
                    if owned:
                        ids = [w.id for w in owned]
                        r = await session.execute(delete(Workspace).where(Workspace.id.in_(ids)))
                        workspaces += int(r.rowcount or 0)  # type: ignore[attr-defined]
                    await session.execute(delete(User).where(User.id == u.id))
                users += 1
            except IntegrityError as e:
                kept.append((u.email, str(e.orig).splitlines()[0][:160]))
                continue
        # The rows are gone: their objects follow (a failed account keeps both).
        for w in owned:
            for area in areas:
                storage.delete_prefix(f"{area}/{w.uuid}/", workspace_uuid=w.uuid)  # type: ignore[arg-type]
    return users, workspaces, kept


async def main() -> None:
    go, refused = await plan()
    for u, owned in go:
        verb = "DELETE" if "--purge" in sys.argv else "would delete"
        names = ", ".join(w.name for w in owned) or "-"
        print(f"{verb}  {u.email}  workspaces {len(owned)}: {names}")
    for email, why in refused:
        print(f"REFUSED  {email}  {why}")
    total = len(go) + len(refused)
    print(f"accounts matching a throwaway pattern: {total}; to delete {len(go)}; refused {len(refused)}")
    if "--purge" not in sys.argv:
        print("dry run: nothing deleted (--purge deletes)")
        return
    users, workspaces, kept = await purge(go)
    for email, why in kept:
        print(f"KEPT  {email}  {why}")
    print(f"deleted {users} accounts and {workspaces} workspaces; kept {len(kept)}")


if __name__ == "__main__":
    asyncio.run(main())

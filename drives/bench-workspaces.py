"""The seeded account's workspaces, kept to what a person made (the founder, 2026-09-26).

    docker compose exec -T api sh -lc "cd /srv && python drives/bench-workspaces.py <step>"

    report                  the seeded account's workspaces, by kind
    purge-fixture-made      one-off: delete every workspace in the seeded account that a
                            fixture or a bench script made (by name, below), keeping
                            Bench Construction, the F5 Block A demo and anything else
    purge-fx                delete every workspace owned by a fixture's own account
                            (`fx.<fixture>.<stamp>@bench.intelcost.io`) or by a seat a
                            fixture made (`<tag>-<role>-<stamp>@…`); regress.sh ends
                            with this. Bench Construction is never one of them
    snapshot                print the seeded account's workspace uuids, comma-joined,
                            on a line starting `uuids `
    check <uuids>           FAIL if the seeded account is in a workspace not in <uuids>
    purge-owner <email>     delete the workspaces one account owns (a `seed.py --reset`
                            made for a check); never the seeded account's

A workspace goes by deleting its row: every table that names a workspace cascades from
it. Its objects in storage go first, by prefix, area by area. Nothing here touches Bench
Construction (slug `bench-construction`).

Fixture-made names are the ones fixtures and bench scripts write, each with a 13-digit
stamp (or F8-S15's short one) or a fixed fixture name; the list is explicit so a
workspace a person named is never matched by accident.
"""

import asyncio
import re
import sys
from typing import get_args

from sqlalchemy import delete, select

import app.models_registry  # noqa: F401  (relationships resolve by name)
from app.core import storage
from app.database import SessionFactory
from app.features.auth.models import User
from app.features.workspace.models import Workspace, WorkspaceMember

SEEDED = "estimator@bench.intelcost.io"
KEEP_SLUG = "bench-construction"
KEEP_NAMES = (re.compile(r"^F5 Block A demo \d\d:\d\d$"),)
FIXTURE_MADE = (
    # A fixture's tag, then a 13-digit millisecond stamp.
    re.compile(r"^(F\d-S\d+[a-z]?|S\d+|F\d|Proof|Walkthrough)\b.* \d{13}$"),
    # F8-S15's short stamp.
    re.compile(r"^F8-S15 (Handover|Home) \d{1,5}$"),
    # Fixed names fixtures reuse run to run.
    re.compile(r"^(F4-S12 follow-up|F8-S4 second workspace)$"),
)
FX_OWNER = re.compile(
    # A fixture's own account, or a seat `seatedMember` made (which may come to own a
    # workspace by a handover, or make one of its own).
    r"^(fx\.[a-z0-9-]+\.\d{13}|[a-z0-9]+-[a-z_-]+-\d{13})@bench\.intelcost\.io$"
)


def fail(message: str) -> None:
    print(f"FAIL  {message}")
    raise SystemExit(1)


async def seeded_workspaces() -> list[Workspace]:
    async with SessionFactory() as session:
        return list(
            await session.scalars(
                select(Workspace)
                .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
                .join(User, User.id == WorkspaceMember.user_id)
                .where(User.email == SEEDED)
                .order_by(Workspace.id)
            )
        )


def kind(workspace: Workspace) -> str:
    if workspace.slug == KEEP_SLUG or any(p.match(workspace.name) for p in KEEP_NAMES):
        return "keep"
    if any(p.match(workspace.name) for p in FIXTURE_MADE):
        return "fixture"
    return "person"


async def delete_workspaces(uuids: list[object]) -> int:
    areas = get_args(storage.Area)
    for uuid in uuids:
        for area in areas:
            storage.delete_prefix(f"{area}/{uuid}/")
    async with SessionFactory() as session:
        result = await session.execute(delete(Workspace).where(Workspace.uuid.in_(uuids)))
        await session.commit()
    return int(result.rowcount or 0)  # type: ignore[attr-defined]


async def report() -> None:
    by_kind: dict[str, list[str]] = {"keep": [], "fixture": [], "person": []}
    for workspace in await seeded_workspaces():
        by_kind[kind(workspace)].append(workspace.name)
    print(f"report keep {len(by_kind['keep'])}: {', '.join(by_kind['keep'])}")
    print(f"report fixture-made {len(by_kind['fixture'])}")
    print(f"report not recognised {len(by_kind['person'])}: {', '.join(by_kind['person']) or 'none'}")


async def purge_fixture_made() -> None:
    doomed = [w for w in await seeded_workspaces() if kind(w) == "fixture"]
    if any(w.slug == KEEP_SLUG for w in doomed):
        fail("Bench Construction matched a fixture pattern")
    gone = await delete_workspaces([w.uuid for w in doomed])
    print(f"purged {gone} fixture-made workspaces from {SEEDED}")
    await report()


async def purge_fx() -> None:
    async with SessionFactory() as session:
        owned = list(
            await session.execute(
                select(Workspace.uuid, User.email)
                .join(User, User.id == Workspace.owner_id)
                .where(Workspace.slug != KEEP_SLUG)
            )
        )
    doomed = [uuid for uuid, email in owned if FX_OWNER.match(email) and email != SEEDED]
    gone = await delete_workspaces(doomed)
    print(f"purged {gone} workspaces owned by fixture accounts")


async def purge_owner(email: str) -> None:
    """Delete every workspace one named account owns: a `seed.py --reset` run made for a
    check. Never the seeded account."""
    if email == SEEDED:
        fail("the seeded account's workspaces are never purged")
    async with SessionFactory() as session:
        uuids = list(
            await session.scalars(
                select(Workspace.uuid)
                .join(User, User.id == Workspace.owner_id)
                .where(User.email == email, Workspace.slug != KEEP_SLUG)
            )
        )
    print(f"purged {await delete_workspaces(uuids)} workspaces owned by {email}")


async def snapshot() -> None:
    # Printed, not written in the container: the F8 outage fixtures restart `api`, and a
    # file in its /tmp would not survive to the check.
    uuids = [str(w.uuid) for w in await seeded_workspaces()]
    print(f"snapshot {len(uuids)} workspaces for {SEEDED}")
    print(f"uuids {','.join(uuids)}")


async def check(before: str) -> None:
    known = {uuid for uuid in before.split(",") if uuid}
    gained = [w for w in await seeded_workspaces() if str(w.uuid) not in known]
    if gained:
        fail(f"{SEEDED} gained {len(gained)} workspace(s) during the run: {', '.join(w.name for w in gained)}")
    print(f"check {SEEDED} gained no workspace")


if __name__ == "__main__":
    step, *args = sys.argv[1:]
    steps = {
        "report": report,
        "purge-fixture-made": purge_fixture_made,
        "purge-fx": purge_fx,
    }
    if step in steps:
        asyncio.run(steps[step]())
    elif step == "purge-owner":
        asyncio.run(purge_owner(args[0]))
    elif step == "snapshot":
        asyncio.run(snapshot())
    elif step == "check":
        asyncio.run(check(args[0] if args else ""))
    else:
        fail(f"no step {step}")

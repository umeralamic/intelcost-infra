"""Bench only, the night of 2026-10-23 (D-729): copy "Hidden Valley Rebid — 3D test" into a throwaway
account's own workspace, reading the original and writing only to the copy's workspace.

    docker compose exec -T api sh -lc "cd /srv && PYTHONPATH=/srv python drives/copy-3d-test.py \
        fx.equip.202610230651@bench.intelcost.io 4abc4fb3-c834-491f-abe7-53a75c452937"
    docker compose exec -T api sh -lc "cd /srv && PYTHONPATH=/srv python drives/copy-3d-test.py --count"
    (--source <project uuid> first copies another project the founder named, 2026-10-27)

The copy is the app's own cross-workspace copier (`duplicate.duplicate` with `Into`, D-384): it reads
every row of the project and its stored files, and inserts the rows under the target workspace and the
files under the target's keys. Nothing is written to the original or its workspace:
  - the drives' guard (D-667) refuses any statement that would write naming the test copy;
  - the one place the copier writes to the source workspace, the clean-up log of a copy that fails
    after its files went (`_forget_objects`), is pointed at the target workspace here, whose keys they
    are;
  - the target must be a workspace the throwaway account owns, never Bench Construction Test or a
    founder workspace, and the account must be an `fx.` throwaway.
Before and after the copy the original's row counts and its latest `updated_at` are printed; they must
match.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import asyncio
import json
import sys
from typing import Any

from sqlalchemy import select, text

import app.models_registry  # noqa: F401  (every model, so the copier's tables resolve)
from app.database import SessionFactory, SyncSessionFactory
from app.features.auth.models import User
from app.features.project import duplicate
from app.features.project import service as project_service
from app.features.project.models import Project
from app.features.workspace.models import Workspace, WorkspaceMember

SOURCE = "042c8817-4a65-47ba-95d8-686ecf986246"
"""The project copied; `--source <uuid>` names another the founder asked for by name (2026-10-27:
"10793 SBR" for Stitch sheets), read only like this one."""
BENCH_CONSTRUCTION_TEST = "69a35a11-ad9f-4a93-8f97-7f3f89f7d6b9"

COUNTED = (
    "drawing_sheet",
    "sheet_markup",
    "takeoff_item",
    "takeoff_cost_component",
    "estimate_line_item",
    "earthwork_result",
    "earthwork_site_result",
    "earthwork_strip_area",
    "earthwork_soil_layer",
    "earthwork_bore",
    "earthwork_assumptions",
    "utility_run",
    "utility_structure",
)


async def _first_status(workspace_id: int) -> Any:
    """Where a copy starts: the target workspace's first active status, as the app picks it."""
    async with SessionFactory() as session:
        return await project_service.first_active_status(workspace_id, session)


def counts(session: Any) -> dict[str, Any]:
    """The original's rows by table, sub-items apart, and the latest updated_at among them."""
    pid = session.execute(text("SELECT id FROM project WHERE uuid = :u"), {"u": SOURCE}).scalar_one()
    out: dict[str, Any] = {}
    latest: list[str] = []
    for table in COUNTED:
        has = session.execute(
            text(
                "SELECT count(*) FROM information_schema.columns "
                "WHERE table_name = :t AND column_name = 'project_id'"
            ),
            {"t": table},
        ).scalar_one()
        if not has:
            continue
        row = session.execute(
            text(f"SELECT count(*), max(updated_at)::text FROM {table} WHERE project_id = :p"),
            {"p": pid},
        ).one()
        out[table] = row[0]
        if row[1]:
            latest.append(row[1])
    subs = session.execute(
        text(
            "SELECT count(*) FROM takeoff_item WHERE project_id = :p AND parent_item_id IS NOT NULL"
        ),
        {"p": pid},
    ).scalar_one()
    out["takeoff_item (of which sub-items)"] = subs
    project_updated = session.execute(
        text("SELECT updated_at::text FROM project WHERE id = :p"), {"p": pid}
    ).scalar_one()
    out["project.updated_at"] = project_updated
    out["latest updated_at"] = max([*latest, project_updated])
    return out


def main(argv: list[str]) -> int:
    global SOURCE
    if argv[:1] == ["--source"]:
        SOURCE, argv = argv[1], argv[2:]
    with SyncSessionFactory() as session:
        before = counts(session)
        print(json.dumps({"before": before}, indent=1))
        if argv[:1] == ["--count"]:
            return 0
        email, target_uuid = argv[0], argv[1]
        if not email.startswith("fx.") or not email.endswith("@bench.intelcost.io"):
            print("copy-3d-test: refused, the actor must be an fx. throwaway account", file=sys.stderr)
            return 1
        if target_uuid == BENCH_CONSTRUCTION_TEST:
            print("copy-3d-test: refused, never into Bench Construction Test", file=sys.stderr)
            return 1
        actor = session.scalar(select(User).where(User.email == email))
        target = session.scalar(select(Workspace).where(Workspace.uuid == target_uuid))
        if actor is None or target is None:
            print("copy-3d-test: no such account or workspace", file=sys.stderr)
            return 1
        member = session.scalar(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == target.id, WorkspaceMember.user_id == actor.id
            )
        )
        if member is None or str(getattr(member, "role", "")).lower().split(".")[-1] != "owner":
            print("copy-3d-test: refused, the target is not the throwaway's own workspace", file=sys.stderr)
            return 1
        source = session.scalar(select(Project).where(Project.uuid == SOURCE))
        assert source is not None
        first = asyncio.run(_first_status(target.id))
        reports_as, custom_key = first.reports_as.value, (None if first.is_builtin else first.key)
        name, source_id = source.name, source.id
        actor_id, target_id = actor.id, target.id
        session.rollback()

    forget = duplicate._forget_objects
    duplicate._forget_objects = lambda s, _ws, keys: forget(s, target_id, keys)

    def progress(step: str, done: int, total: int) -> None:
        if total and (done == total or done % 200 == 0):
            print(f"  {step}: {done}/{total}", flush=True)

    with SyncSessionFactory() as session:
        project = duplicate.duplicate(
            session,
            source_id,
            actor_id,
            reports_as,
            custom_key,
            progress,
            into=duplicate.Into(workspace_id=target_id, name=name, include_pricing=True),
        )
        print(json.dumps({"copy": {"uuid": str(project.uuid), "name": project.name, "workspace": target_uuid}}))
    with SyncSessionFactory() as session:
        after = counts(session)
        print(json.dumps({"after": after, "equal": after == before}, indent=1))
        return 0 if after == before else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

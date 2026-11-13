"""Bench only: Move inputs to Utility Inputs (D-1247) on every test project, in the api's process,
signed in as no one.

    docker compose exec -T api sh -lc "cd /srv && python drives/move-utility-inputs.py"
    docker compose exec -T api sh -lc "cd /srv && python drives/move-utility-inputs.py --apply"

The first lists (the default, a dry run: nothing written), the second moves. A project's drawn
utility runs and structures (a `utility_run` or `utility_structure` row, unlocked) sitting in the
Utilities tree (a folder marked `utilities` or `utilities.<system>`, wherever moved and however
renamed, or a folder below one) go to Utility Inputs > their system, by the api's own
`utilities.move_inputs`, the endpoint's service; Calculate's lines stay where they are. One
transaction per project.

The founder's projects are never moved from here (D-1247: they get the one-click, undoable "Move
inputs to Utility Inputs" in the panel): a project on the guard's protected list, or in a founder
workspace, is counted and left, by label only. The guard (D-667) refuses any statement naming one
and any load of one's row, before it is sent. Open tabs are not told (no realtime event): a reload
shows the move.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import asyncio
import sys

from sqlalchemy import text

import app.models_registry  # noqa: F401
from app.database import SessionFactory, SyncSessionFactory
from app.features.earthwork.utilities import move_inputs

PROTECTED = guard.PROTECTED
FOUNDER_WORKSPACES = guard.FOUNDER_WORKSPACE_UUIDS

# Every project's drawn utility items in its Utilities tree, read with Core so no project row is
# loaded; the protected ones are dropped below, before anything is done with them.
CANDIDATES = text(
    """
    WITH RECURSIVE tree AS (
        SELECT id FROM takeoff_folder
        WHERE tree = 'custom' AND (auto_key = 'utilities' OR auto_key LIKE 'utilities.%')
        UNION
        SELECT f.id FROM takeoff_folder f JOIN tree t ON f.parent_id = t.id WHERE f.tree = 'custom'
    )
    SELECT p.id, p.workspace_id, p.uuid::text, w.uuid::text, p.deleted_at IS NOT NULL,
           count(*) FILTER (WHERE r.id IS NOT NULL), count(*) FILTER (WHERE s.id IS NOT NULL)
    FROM takeoff_item i
    JOIN tree t ON t.id = i.folder_id
    JOIN project p ON p.id = i.project_id
    JOIN workspace w ON w.id = p.workspace_id
    LEFT JOIN utility_run r ON r.takeoff_item_id = i.id
    LEFT JOIN utility_structure s ON s.takeoff_item_id = i.id
    WHERE i.is_utility AND NOT i.is_locked AND (r.id IS NOT NULL OR s.id IS NOT NULL)
    GROUP BY p.id, p.workspace_id, p.uuid, w.uuid, p.deleted_at
    ORDER BY p.id
    """
)


async def apply(rows: list[tuple[int, int, str]]) -> tuple[int, int]:
    moved = projects = 0
    for project_id, workspace_id, uuid in rows:
        async with SessionFactory() as session:
            done = await move_inputs(workspace_id, session, project_id)
            await session.commit()
        systems = ", ".join(f"{s.name} {s.count}" for s in done.by_system) or "nothing"
        print(f"moved     {uuid}  {done.filed}: {systems}")
        moved += done.filed
        projects += 1 if done.filed else 0
    return moved, projects


def main() -> None:
    write = "--apply" in sys.argv[1:]
    with SyncSessionFactory() as session:
        found = session.execute(CANDIDATES).all()
    todo: list[tuple[int, int, str]] = []
    skipped: dict[str, int] = {}
    runs = structures = 0
    for project_id, workspace_id, uuid, workspace_uuid, trashed, n_runs, n_structures in found:
        if uuid in PROTECTED or workspace_uuid in FOUNDER_WORKSPACES:
            label = PROTECTED.get(uuid, "(founder workspace)")
            skipped[label] = skipped.get(label, 0) + n_runs + n_structures
            continue
        todo.append((project_id, workspace_id, uuid))
        runs += n_runs
        structures += n_structures
        if not write:
            note = " (in the trash)" if trashed else ""
            print(f"would move  {uuid}  {n_runs} runs, {n_structures} structures{note}")
    for label, count in sorted(skipped.items()):
        print(f"left (founder's, D-1247)  {label}: {count} items")
    if write:
        moved, projects = asyncio.run(apply(todo))
        print(f"moved {moved} items in {projects} test projects; founder's left: {len(skipped)}")
    else:
        print(
            f"dry run: {runs} runs and {structures} structures in {len(todo)} test projects would"
            f" move; founder's left: {len(skipped)} projects. --apply moves them."
        )


if __name__ == "__main__":
    main()

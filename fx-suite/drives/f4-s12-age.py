"""F4-S12: age the follow-up fixture's submissions, which only the database can do.

    docker compose exec -T api sh -lc "cd /srv && python drives/f4-s12-age.py"

Run between `f4-s12.mjs setup` and `f4-s12.mjs check`. It touches only projects in the
newest workspace named "F4-S12 follow-up", by name, and prints what it moved.
"""

import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

import app.models_registry  # noqa: F401  (relationships resolve by name)
from app.database import SessionFactory
from app.features.project.models import Project
from app.features.workspace.models import Workspace

AGES = {"Aged 8 days": 8, "Aged 6 days": 6, "Aged then won": 8, "Custom aged 8": 8}


async def main() -> None:
    async with SessionFactory() as session:
        workspace = await session.scalar(
            select(Workspace).where(Workspace.name == "F4-S12 follow-up").order_by(Workspace.id.desc())
        )
        if workspace is None:
            raise SystemExit("No F4-S12 follow-up workspace. Run the setup phase first.")
        now = datetime.now(UTC)
        for project in await session.scalars(
            select(Project).where(Project.workspace_id == workspace.id, Project.name.in_(AGES))
        ):
            project.submitted_at = now - timedelta(days=AGES[project.name])
            print(f"aged  {project.name:<16} submitted {AGES[project.name]} days ago")
        await session.commit()


asyncio.run(main())

"""D-51: recompute every stored item quantity once, after the scale became feet per point.

    docker compose exec -T api sh -lc "cd /srv && python drives/d51-recompute.py"

The migration `d51a7c3e9b24` converts each calibration; this runs the api's own
recompute for every item on every workspace, so the numbers stored are the numbers the
api now computes. Idempotent: a second run changes nothing. Prints how many items moved.
"""

import asyncio

from sqlalchemy import select

import app.models_registry  # noqa: F401  (relationships resolve by name)
from app.database import SessionFactory
from app.features.takeoff import service as takeoff_service
from app.features.takeoff.models import TakeoffItem


async def main() -> None:
    async with SessionFactory() as session:
        items = list((await session.execute(select(TakeoffItem))).scalars().all())
        moved = 0
        for item in items:
            before = float(item.calculated_quantity or 0)
            await takeoff_service.recompute_item(item.workspace_id, session, item)
            if abs(float(item.calculated_quantity or 0) - before) > 1e-6:
                moved += 1
        await session.commit()
        print(f"PASS  {len(items)} items recomputed, {moved} changed")


asyncio.run(main())

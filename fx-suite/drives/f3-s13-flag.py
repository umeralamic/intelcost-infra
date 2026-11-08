"""Roll the matrix-editing flag out to one workspace, by name (F3-S13).

    docker compose exec -T api sh -lc "cd /srv && python drives/f3-s13-flag.py 'Bench Construction'"
    docker compose exec -T api sh -lc "cd /srv && python drives/f3-s13-flag.py --off 'Bench Construction'"

There is no api route for this on purpose: rolling a feature out is an operator act and
F16 owns the admin surface for it. Until then the bench needs a way to say "this is
shipped here", and a drive in the bench repo is the honest place for it rather than a
migration that names a bench workspace or an endpoint nobody should have.

The flag stays **off globally**, so a freshly created workspace has the editing surface
switched off — which is what makes F3-S13's separation drivable at all. A flag that were
on everywhere could only be tested by turning it off, and then every other fixture that
edits the matrix would break.
"""

import asyncio
import sys

from sqlalchemy import select

import app.models_registry  # noqa: F401  -- every mapper, or a relationship cannot resolve
from app.database import SessionFactory
from app.features.flag.models import FeatureFlag
from app.features.workspace.models import Workspace

KEY = "roles_matrix_editing"


async def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--off"]
    turning_off = "--off" in sys.argv
    if not args:
        print(__doc__)
        return 2
    name = args[0]

    async with SessionFactory() as session:
        workspace = await session.scalar(select(Workspace).where(Workspace.name == name))
        if workspace is None:
            print(f"No workspace named {name!r}.")
            return 1

        flag = await session.scalar(select(FeatureFlag).where(FeatureFlag.key == KEY))
        if flag is None:
            print(f"No flag {KEY!r}. Has the migration run?")
            return 1

        ids = set(flag.enabled_for_workspace_ids or [])
        ids.discard(workspace.id) if turning_off else ids.add(workspace.id)
        flag.enabled_for_workspace_ids = sorted(ids)
        await session.commit()

    state = "off for" if turning_off else "on for"
    print(f"{KEY} is {state} {name} (globally: off)")
    return 0


raise SystemExit(asyncio.run(main()))

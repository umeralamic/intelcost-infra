"""Bench only: a signed-in session for one of the bench's test members, made in the api's process, so a
Playwright MCP session signs in without a password (night run 2026-10-20, item 3, D-651).

    docker compose exec -T api sh -lc "cd /srv && PYTHONPATH=/srv python drives/bench-session.py window-b@bench.intelcost.io"

Prints one line of JSON, `{"accessToken": ..., "refreshToken": ...}`, the shape the app keeps under
`intelcost.session` (`core/auth/tokens.ts`). `browser/mcp-signin.js` puts it in the page's storage.

The passwords of window-b@ and walkthrough@ were rotated (D-651) and are kept only in the Windows credential
store; no session knows them. A session made here is an ordinary one: a refresh-token row the api can revoke,
an access token that lapses with the access lifetime.

Refused: any account not in MEMBERS, and anything but the local bench (ENVIRONMENT=local). The founder's
accounts are never in MEMBERS (D-542, D-601).
"""

import asyncio
import json
import sys

from sqlalchemy import select

import app.models_registry  # noqa: F401  (every model, so the account's relations resolve)
from app.config import settings
from app.database import SessionFactory
from app.features.auth.models import User
from app.features.auth.service import issue_tokens

MEMBERS = {"window-b@bench.intelcost.io", "walkthrough@bench.intelcost.io"}
FOUNDER = {"estimator@bench.intelcost.io", "umeralam.q@gmail.com"}


async def main(email: str) -> int:
    if email in FOUNDER or email not in MEMBERS:
        print(f"bench-session: refused, {email} is not one of the bench's test members", file=sys.stderr)
        return 1
    if str(getattr(settings, "environment", "")).lower() != "local":
        print("bench-session: refused, this is not the local bench", file=sys.stderr)
        return 1
    async with SessionFactory() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        access, refresh, _ = await issue_tokens(session, user, "bench-session (MCP)")
        await session.commit()
    print(json.dumps({"accessToken": access, "refreshToken": refresh}))
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main(sys.argv[1])))

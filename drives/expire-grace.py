"""Bench only: end one throwaway's 30-day deletion grace now and erase it (D-1407), for a smoke.

    docker compose exec -T api sh -lc "cd /srv && python drives/expire-grace.py --workspace <uuid>"
    docker compose exec -T api sh -lc "cd /srv && python drives/expire-grace.py --account <email>"

Never an api route: the grace ends early only here, on the local bench, for a throwaway. Refused, before
anything is read: ENVIRONMENT not local; any id or address on the guard list (founder workspaces and
accounts, protected and test projects, kept workspaces, the test copy, the seeded account; the guard
module refuses a founder id on the command line at import as well); a workspace whose name, or an
account whose address, does not start with `fx.`; a subject not deleted. Then it sets that subject's
`erase_after` (and for an account, its own deleted workspaces') to now and runs the erasure for that
subject alone: files first, rows after, its deletion record kept. Prints the record, no name or address.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import sys
import uuid as uuid_module
from datetime import UTC, datetime, timedelta

from guard_list import _DATA, FOUNDER_EMAILS, FOUNDER_OWNER, FOUNDER_WORKSPACES, KEEP_WORKSPACES  # noqa: E402
from guard_list import PROTECTED_PROJECTS, SEEDED_EMAIL, TEST_COPY  # noqa: E402

REFUSED_IDS = {
    *FOUNDER_WORKSPACES,
    *KEEP_WORKSPACES,
    *PROTECTED_PROJECTS,
    *(k.lower() for k in _DATA.get("test_projects", {})),
    TEST_COPY,
}
REFUSED_EMAILS = {*FOUNDER_EMAILS, FOUNDER_OWNER, SEEDED_EMAIL}


def refuse(why: str) -> int:
    print(f"expire-grace: refused, {why}", file=sys.stderr)
    return 1


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[0] not in ("--workspace", "--account"):
        return refuse("usage: --workspace <uuid> | --account <email>")
    kind, value = argv[0], argv[1].strip().lower()
    if value in REFUSED_IDS or value in REFUSED_EMAILS:
        return refuse("that id or address is on the guard list")

    from sqlalchemy import select, update

    import app.models_registry  # noqa: F401
    from app.config import settings
    from app.database import SyncSessionFactory
    from app.features.auth.models import User
    from app.features.deletion import erase
    from app.features.deletion.models import DeletionRecord
    from app.features.workspace.models import Workspace

    if str(getattr(settings, "environment", "")).lower() != "local":
        return refuse("this is not the local bench")
    now = datetime.now(UTC)
    with SyncSessionFactory() as session:
        if kind == "--workspace":
            workspace = session.scalar(select(Workspace).where(Workspace.uuid == uuid_module.UUID(value)))
            if workspace is None or not workspace.name.startswith("fx."):
                return refuse("no throwaway workspace (named fx.) with that id")
            owner = session.scalar(select(User.email).where(User.id == workspace.owner_id)) or ""
            if owner.lower() in REFUSED_EMAILS or str(workspace.uuid) in REFUSED_IDS:
                return refuse("its owner is on the guard list")
            if workspace.deleted_at is None:
                return refuse("that workspace is not deleted")
            subject = workspace.uuid
            workspace.erase_after = now - timedelta(seconds=1)
        else:
            user = session.scalar(select(User).where(User.email == value))
            if user is None or not value.startswith("fx."):
                return refuse("no throwaway account (fx.) with that address")
            if user.deleted_at is None:
                return refuse("that account is not deleted")
            owned = session.scalars(select(Workspace).where(Workspace.owner_id == user.id)).all()
            if any(str(w.uuid) in REFUSED_IDS or not w.name.startswith("fx.") for w in owned):
                return refuse("it owns a workspace that is not a throwaway")
            subject = user.uuid
            user.erase_after = now - timedelta(seconds=1)
            session.execute(
                update(Workspace)
                .where(Workspace.owner_id == user.id, Workspace.deleted_at.is_not(None))
                .values(erase_after=now - timedelta(seconds=1))
            )
        session.commit()
        counts = erase.erase_due(session, now, only=subject)
        record = session.scalar(
            select(DeletionRecord).where(DeletionRecord.subject_uuid == subject).order_by(DeletionRecord.id.desc()).limit(1)
        )
        print(f"expire-grace: erased {counts}")
        if record is not None:
            print(
                f"record {record.uuid}: kind {record.kind}, subject {record.subject_uuid}, erased {record.erased_at:%Y-%m-%d %H:%M:%S} UTC, "
                f"outcome {record.outcome}, files deleted {record.files_deleted}, prefixes failed {len(record.failed_prefixes)}"
            )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

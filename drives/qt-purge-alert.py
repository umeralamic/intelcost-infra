"""D-1325 (the founder's D-1321 10a), a quantity-table row set: the nightly purge's retry of the same files
fails on DNS four times and then clears; the platform admins are told at the third failed retry only, once per
log row. Storage is never reached and the whole run is rolled back. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-purge-alert.py"
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import sys


def _raised(make, cause: BaseException | None = None) -> BaseException:  # type: ignore[no-untyped-def]
    """An error as a library raises it: with its cause chained, as `raise ... from` leaves it."""
    try:
        if cause is None:
            raise make()
        try:
            raise cause
        except BaseException as inner:
            raise make() from inner
    except BaseException as exc:
        return exc


def _dns_error() -> BaseException:
    """What C16 hit on 2026-11-13: botocore's endpoint error over a DNS failure."""
    import socket

    from botocore.exceptions import EndpointConnectionError

    return _raised(lambda: EndpointConnectionError(endpoint_url="https://bench-bucket.s3.us-east-2.amazonaws.com/takeoff/x"), socket.gaierror(-2, "Name or service not known"))


def purge_alert() -> int:
    """D-1325 (the founder's D-1321 10a): the nightly purge's retry tells the platform admins after the third
    failed retry of the same files, once. A purged project's log row and a file delete's log row, on zz MyEq
    project's workspace, each retried five times through the real `clear_purged` / `clear_logged` and the
    nightly job's `note_retry`: retries 1-4 fail on DNS (injected), retry 5 succeeds. Expected: failed_retries 1,
    2, 3, 4, 4; told only at retry 3 (a log line, and one notification per platform admin per row); cleared at
    retry 5. Storage is never reached (both deletes are replaced), and the whole run is rolled back, so no
    row and no notification is left (no real admin's inbox is written)."""
    import logging
    import uuid as uuid_module
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import func, select

    from app.core import storage
    from app.database import SyncSessionFactory
    from app.features.auth.models import User
    from app.features.notification.models import Notification
    from app.features.project.models import Project, StorageClearLog, TrashPurgeLog
    from app.features.workspace.models import Workspace
    from app.worker.tasks import maintenance
    from app.worker.tasks.storage import clear_logged, clear_purged

    wrong: list[str] = []
    rows = 0
    fake = uuid_module.uuid4()
    real_prefix, real_object = storage.delete_prefix, storage.delete_object
    fail = [True]

    def flaky_prefix(prefix: str, **kwargs: object) -> int:
        if str(fake) not in prefix:
            raise AssertionError(f"purge alert rows reached a real prefix: {prefix}")
        if fail[0]:
            raise _dns_error()
        return 0

    def flaky_object(key: str) -> None:
        if str(fake) not in key:
            raise AssertionError(f"purge alert rows reached a real key: {key}")
        if fail[0]:
            raise _dns_error()

    told: list[str] = []

    class Catch(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            if record.levelno >= logging.ERROR and "qt purge alert" in record.getMessage():
                told.append(record.getMessage())

    catch = Catch()
    maintenance.logger.addHandler(catch)
    # The storage task's own warnings on the injected errors are expected; the rows say what happened.
    from app.worker.tasks import storage as storage_tasks

    storage_tasks.logger.disabled = True
    storage.delete_prefix, storage.delete_object = flaky_prefix, flaky_object  # type: ignore[assignment]
    try:
        with SyncSessionFactory() as session:
            project = session.scalar(select(Project).where(Project.name == "zz MyEq project"))
            if project is None:
                print("FAIL  purge alert: the throwaway project zz MyEq project is missing")
                return 1
            ws_uuid = session.scalar(select(Workspace.uuid).where(Workspace.id == project.workspace_id))
            admins = session.scalar(select(func.count()).select_from(User).where(User.is_platform_admin.is_(True))) or 0
            now = datetime.now(UTC)
            prefix = f"takeoff/{ws_uuid}/{fake}/"
            purged = TrashPurgeLog(
                workspace_id=project.workspace_id, project_uuid=fake, project_name="qt purge alert",
                purged_at=now - timedelta(days=3), prefixes=[prefix], failed_prefixes=[prefix],
                prefixes_attempted=1, prefixes_failed=1, open_uploads=[], file_count=1, dry_run=False,
            )
            filed = StorageClearLog(
                workspace_id=project.workspace_id, what="file qt purge alert.pdf",
                keys=[f"{prefix}qt-purge-alert.pdf"], prefixes=[], open_uploads=[],
            )
            session.add_all([purged, filed])
            session.flush()
            base = session.scalar(select(func.count()).select_from(Notification).where(Notification.kind == "storage.purge_stuck")) or 0
            for night in range(1, 6):
                fail[0] = night <= 4
                before = len(told)
                clear_purged(purged)
                a = maintenance.note_retry(session, purged, purged.storage_cleared_at is not None, now)
                clear_logged(session, filed)
                b = maintenance.note_retry(session, filed, filed.cleared_at is not None, now)
                session.flush()
                notices = (session.scalar(select(func.count()).select_from(Notification).where(Notification.kind == "storage.purge_stuck")) or 0) - base
                want_count = min(night, 4)
                want_alert = night == 3
                want_notices = 2 * admins if night >= 3 else 0
                want_cleared = night == 5
                got = (purged.failed_retries, filed.failed_retries, a, b, notices, len(told) - before, purged.storage_cleared_at is not None, filed.cleared_at is not None)
                want = (want_count, want_count, want_alert, want_alert, want_notices, 2 if want_alert else 0, want_cleared, want_cleared)
                rows += 1
                label = f"retry {night} ({'DNS fails' if fail[0] else 'bucket answers'})"
                if got != want:
                    wrong.append(f"FAIL  purge alert {label}: (retries purged, retries file, told purged, told file, notices, log lines, cleared purged, cleared file) {got}, expected {want}")
            if purged.retry_alerted_at is None or filed.retry_alerted_at is None:
                wrong.append("FAIL  purge alert: retry_alerted_at not set on both rows")
            rows += 1
            session.rollback()
    finally:
        storage.delete_prefix, storage.delete_object = real_prefix, real_object  # type: ignore[assignment]
        maintenance.logger.removeHandler(catch)
        storage_tasks.logger.disabled = False
    for line in wrong:
        print(line)
    print(f"purge alert: {rows} rows (5 nightly retries of a purged project's and a file delete's log, DNS failing 4 times; told at the 3rd only, {admins} platform admins; rolled back), {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(purge_alert())

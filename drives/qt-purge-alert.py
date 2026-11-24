"""D-1325 (the founder's D-1321 10a), a quantity-table row set: the nightly purge's retry of the same files
fails on DNS four times and then clears; the platform admins are told at the third failed retry only, once per
log row. D-1333 (the founder's D-1328.2): at that same moment each platform admin is emailed once per log row, never at
retries 1, 2, 4 or 5; the send is captured here (the worker's `send_mail.delay` replaced), so nothing reaches a broker
or an inbox, and a failed send or a failed queue still leaves the in-app alert and the counts. Storage is never reached
and the whole run is rolled back. `./quantity-table.sh` runs it:

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

    from app.core import mail, outbox, storage
    from app.database import SyncSessionFactory
    from app.features.auth.models import User
    from app.features.notification.models import Notification
    from app.features.project.models import Project, StorageClearLog, TrashPurgeLog
    from app.features.workspace.models import Workspace
    from app.worker.tasks import maintenance
    from app.worker.tasks.mail import send_mail
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
    # D-1333: the emails, captured where the worker would be handed them. No address is printed: the recipients are
    # compared as a set, and outbox's own failure line (which names the address) is counted, never shown.
    sent: list[tuple[str, str, dict[str, object]]] = []
    deliver = ["ok"]

    labels: list[str | None] = []

    def fake_delay(to: str, template: str, context: dict[str, object], who: str | None = None) -> None:
        if deliver[0] == "fails":
            raise OSError("injected: the relay refused the message")
        sent.append((to, template, context))
        labels.append(who)  # D-1339: how the log names the recipient (the admin's user id)

    dropped: list[str] = []

    class Count(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            dropped.append(record.levelname)

    queue_lines: list[str] = []

    class QueueCatch(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            if "stuck-files email" in record.getMessage():
                queue_lines.append(record.getMessage())

    count, queue_catch = Count(), QueueCatch()
    real_delay = send_mail.__dict__.get("delay")
    real_queue = mail.queue
    outbox_propagate = outbox.log.propagate
    outbox.log.addHandler(count)
    outbox.log.propagate = False
    maintenance.logger.addHandler(queue_catch)
    send_mail.delay = fake_delay  # type: ignore[method-assign]
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
            admin_emails = set(session.scalars(select(User.email).where(User.is_platform_admin.is_(True))).all())
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
                mails_before = len(sent)
                clear_purged(purged)
                a = maintenance.note_retry(session, purged, purged.storage_cleared_at is not None, now)
                clear_logged(session, filed)
                b = maintenance.note_retry(session, filed, filed.cleared_at is not None, now)
                session.flush()
                outbox.drain(session)  # as commit_and_drain does, without the commit (rolled back)
                emails = len(sent) - mails_before
                notices = (session.scalar(select(func.count()).select_from(Notification).where(Notification.kind == "storage.purge_stuck")) or 0) - base
                want_count = min(night, 4)
                want_alert = night == 3
                want_notices = 2 * admins if night >= 3 else 0
                want_cleared = night == 5
                got = (purged.failed_retries, filed.failed_retries, a, b, notices, len(told) - before, emails, purged.storage_cleared_at is not None, filed.cleared_at is not None)
                want = (want_count, want_count, want_alert, want_alert, want_notices, 2 if want_alert else 0, 2 * admins if want_alert else 0, want_cleared, want_cleared)
                rows += 1
                label = f"retry {night} ({'DNS fails' if fail[0] else 'bucket answers'})"
                if got != want:
                    wrong.append(f"FAIL  purge alert {label}: (retries purged, retries file, told purged, told file, notices, log lines, emails, cleared purged, cleared file) {got}, expected {want}")
            if purged.retry_alerted_at is None or filed.retry_alerted_at is None:
                wrong.append("FAIL  purge alert: retry_alerted_at not set on both rows")
            rows += 1
            # D-1333: one email per admin per row, to the platform admins only, naming what is stuck and /platform.
            if {to for to, _, _ in sent} != admin_emails or len(sent) != 2 * admins:
                wrong.append(f"FAIL  purge alert email: {len(sent)} emails, not one per platform admin per row ({2 * admins})")
            # D-1339: each queued email names its admin by user id for the log, never by address.
            admin_labels = {f"user {i}" for i in session.scalars(select(User.id).where(User.is_platform_admin.is_(True)))}
            if set(labels) != admin_labels:
                wrong.append(f"FAIL  purge alert email: the log labels are not the admins' user ids ({len(set(labels))} distinct)")
            rows += 1
            seen = set()
            for _to, template, context in sent:
                rendered = mail.render(mail.MailTemplate(template), context)
                seen.add(str(context["log"]))
                bits = (
                    template == "purge_stuck",
                    "/platform" in rendered.text and "/platform" in rendered.html,
                    rendered.subject == "Storage clean-up: files still not deleted" and "Files of " in rendered.text and "qt purge alert" in rendered.text,
                    "Nightly retries: 3" in rendered.text,
                    str(context["log"]) in rendered.text,
                    "First failed: " in rendered.text and "not recorded" not in rendered.text,
                )
                if not all(bits):
                    wrong.append(f"FAIL  purge alert email: the {context['log']} email renders without (template, /platform, what, retries 3, log row, first failure) {bits}")
            if seen != {str(purged.uuid), str(filed.uuid)}:
                wrong.append("FAIL  purge alert email: the emails do not name the two log rows")
            rows += 1
            # D-1333: a send that fails (the relay or the broker refuses) and a queue that fails each still leave the
            # in-app alert, retry_alerted_at and the count; the failure is logged, never raised into the pass.
            for mode in ("send", "queue"):
                bad = StorageClearLog(
                    workspace_id=project.workspace_id, what=f"file qt purge alert {mode}.pdf",
                    keys=[f"{prefix}qt-purge-alert-{mode}.pdf"], prefixes=[], open_uploads=[],
                )
                session.add(bad)
                session.flush()
                fail[0] = True
                deliver[0] = "fails" if mode == "send" else "ok"
                if mode == "queue":
                    def broken_queue(*args: object, **kwargs: object) -> None:
                        raise RuntimeError("injected: the queue refused")

                    mail.queue = broken_queue  # type: ignore[assignment]
                    maintenance.logger.propagate = False  # the injected traceback is counted, not printed
                mails_before, dropped_before, queue_before = len(sent), len(dropped), len(queue_lines)
                told_at = []
                raised: BaseException | None = None
                for _night in range(1, 4):
                    clear_logged(session, bad)
                    told_at.append(maintenance.note_retry(session, bad, bad.cleared_at is not None, now))
                    session.flush()
                    try:
                        outbox.drain(session)
                    except BaseException as exc:
                        raised = exc
                mail.queue = real_queue  # type: ignore[assignment]
                maintenance.logger.propagate = True
                deliver[0] = "ok"
                line = f"Files of {bad.what} still not deleted after 3 nightly retries"
                notices = session.scalar(select(func.count()).select_from(Notification).where(Notification.kind == "storage.purge_stuck", Notification.line == line)) or 0
                logged = (len(dropped) - dropped_before) if mode == "send" else (len(queue_lines) - queue_before)
                got = (told_at, bad.failed_retries, bad.retry_alerted_at is not None, notices, len(sent) - mails_before, logged, raised is None)
                want = ([False, False, True], 3, True, admins, 0, admins, True)
                rows += 1
                if got != want:
                    wrong.append(f"FAIL  purge alert email, a {mode} that fails: (told per retry, retries, alerted_at, notices, emails, failures logged, not raised) {got}, expected {want}")
            session.rollback()
    finally:
        storage.delete_prefix, storage.delete_object = real_prefix, real_object  # type: ignore[assignment]
        maintenance.logger.removeHandler(catch)
        maintenance.logger.removeHandler(queue_catch)
        maintenance.logger.propagate = True
        storage_tasks.logger.disabled = False
        mail.queue = real_queue  # type: ignore[assignment]
        if real_delay is None:
            del send_mail.delay
        else:
            send_mail.delay = real_delay  # type: ignore[method-assign]
        outbox.log.removeHandler(count)
        outbox.log.propagate = outbox_propagate
    for line in wrong:
        print(line)
    print(f"purge alert: {rows} rows (5 nightly retries of a purged project's and a file delete's log, DNS failing 4 times; told at the 3rd only, {admins} platform admins; emailed once per admin per row at the 3rd only, captured; a failed send and a failed queue keep the alert; rolled back), {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(purge_alert())

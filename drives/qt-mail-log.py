"""D-1339 (the founder's D-1335 Q7), a quantity-table row set: the shared mail path's log lines name the recipient
by user id (or, for an invitee with no account, a keyed stand-in), never by email address. Each row sends through
the real path, `mail.queue` -> outbox -> the worker's `send_mail` (run in this process, eagerly, retries included) ->
`mail.send`, with SMTP replaced by an in-process capture: nothing reaches the relay, MailHog or an inbox. A throwaway
user is inserted for the run and everything is rolled back. Every log record of the api's and Celery's loggers in the
run is captured, formatted with its traceback, and checked: no address-shaped text anywhere, the recipient's label
present. No address is ever printed. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-mail-log.py"
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import sys


def mail_log() -> int:
    import ast
    import logging
    import pathlib
    import re
    import smtplib
    from datetime import UTC, datetime

    from sqlalchemy import text

    from app.config import settings
    from app.core import log_redact, mail, outbox
    from app.database import SyncSessionFactory
    from app.features.auth.models import User
    from app.worker.tasks.mail import send_mail

    address = re.compile(r"[^\s<>()\[\]{}'\",;:]+@[^\s<>()\[\]{}'\",;:]+\.[A-Za-z]{2,}")
    stamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    to = f"qt.maillog.{stamp}@example.test"
    invitee = f"qt.invitee.{stamp}@example.test"
    inviter = f"qt.inviter.{stamp}@example.test"
    secrets_ = (to, invitee, inviter, to.split("@")[0], invitee.split("@")[0], inviter.split("@")[0])

    records: list[str] = []
    formatter = logging.Formatter("%(name)s %(levelname)s %(message)s")

    class Catch(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            records.append(formatter.format(record))  # the message and any traceback, as a log file would hold it

    smtp_mode = ["ok"]
    smtp_seen: list[str] = []

    class FakeSMTP:
        """Stands in for `smtplib.SMTP`: the message is taken, never sent."""

        def __init__(self, host: str, port: int, timeout: float = 0) -> None:
            self.host = host

        def __enter__(self) -> "FakeSMTP":
            return self

        def __exit__(self, *exc: object) -> None:
            return None

        def starttls(self) -> None:
            return None

        def login(self, user: str, password: str) -> None:
            return None

        def send_message(self, message: object) -> None:
            rcpt = str(message["To"])  # type: ignore[index]
            if smtp_mode[0] == "refuse":
                # As a relay refuses: the error is keyed by the address and its text repeats it.
                raise smtplib.SMTPRecipientsRefused({rcpt: (550, f"5.1.1 <{rcpt}>: no such user".encode())})
            smtp_seen.append("capture" if self.host == settings.mail_capture_host else "relay")

    dispatch = ["apply"]

    def fake_delay(*args: object, **kwargs: object) -> object:
        if dispatch[0] == "broken":
            raise OSError("injected: the broker is unreachable")
        return send_mail.apply(args=args, kwargs=kwargs)  # the real task, eagerly, its retries included

    catch = Catch(logging.DEBUG)
    watched = [logging.getLogger(n) for n in ("app", "celery", "sqlalchemy")]
    saved = [(lg, lg.level, lg.propagate) for lg in watched]
    real_smtp = smtplib.SMTP
    real_delay = send_mail.__dict__.get("delay")
    real_guard, real_allow = settings.mail_guard, settings.mail_allowlist
    wrong: list[str] = []
    rows = 0

    def row(name: str, before: int, label: str | None, must: str) -> None:
        nonlocal rows
        rows += 1
        got = records[before:]
        leaked = sum(1 for r in got if address.search(r) or any(s in r for s in secrets_))
        named = label is None or any(label in r for r in got)
        has = any(must in r for r in got)
        if leaked or not named or not has:
            wrong.append(f"FAIL  mail log {name}: {len(got)} records, {leaked} with an address, label {'present' if named else 'MISSING'}, '{must}' {'present' if has else 'MISSING'}")

    for lg in watched:
        lg.addHandler(catch)
        lg.setLevel(logging.INFO)
        lg.propagate = False
    smtplib.SMTP = FakeSMTP  # type: ignore[misc,assignment]
    send_mail.delay = fake_delay  # type: ignore[method-assign]
    try:
        with SyncSessionFactory() as session:
            user = User(email=to, password_hash="x", full_name=None)
            session.add(user)
            session.flush()
            who = mail.user_label(user.id)
            verify = {"token": "qt-mail-log", "name": None}

            def send(template: mail.MailTemplate, context: dict[str, object], label: str, rcpt: str = to) -> None:
                mail.queue(session, rcpt, template, context, who=label)
                outbox.drain(session)  # as the route's commit would, without the commit (rolled back)

            # 1. The bench's guard on, the address off the allowlist: captured, "mail captured (guard) ... to user N".
            settings.mail_guard, settings.mail_allowlist = True, ""
            b, s = len(records), len(smtp_seen)
            send(mail.MailTemplate.EMAIL_VERIFY, verify, who)
            row("guard capture", b, who, "mail captured (guard)")
            if smtp_seen[s:] != ["capture"]:
                wrong.append(f"FAIL  mail log guard capture: the message went {smtp_seen[s:]}, expected the capture")

            # 2. On the allowlist (or the guard off, production): the relay, "mail sent ... to user N".
            settings.mail_allowlist = to
            b, s = len(records), len(smtp_seen)
            send(mail.MailTemplate.PASSWORD_CHANGED, {"name": None}, who)
            row("relay sent", b, who, "mail sent:")
            if smtp_seen[s:] != ["relay"]:
                wrong.append(f"FAIL  mail log relay sent: the message went {smtp_seen[s:]}, expected the relay")
            settings.mail_allowlist = ""

            # 3. The relay refuses the address, every time: send_mail's warning per try, Celery's retry and final
            #    failure lines, all with the address redacted from the error's text.
            smtp_mode[0] = "refuse"
            b = len(records)
            send(mail.MailTemplate.EMAIL_VERIFY, verify, who)
            smtp_mode[0] = "ok"
            row("refused, retried", b, who, "send_mail: delivery failed for")
            tries = sum(1 for r in records[b:] if "send_mail: delivery failed for" in r)
            rows += 1
            if tries != 1 + send_mail.max_retries or not any("<address>" in r for r in records[b:]):
                wrong.append(f"FAIL  mail log refused: {tries} delivery warnings (expected {1 + send_mail.max_retries}), redaction {'seen' if any('<address>' in r for r in records[b:]) else 'NOT seen'}")

            # 4. The hand-off to the worker fails: outbox's "after-commit dispatch failed: mail ... to user N".
            dispatch[0] = "broken"
            b = len(records)
            send(mail.MailTemplate.PASSWORD_RESET, {"token": "qt", "name": None, "expires_minutes": 30}, who)
            dispatch[0] = "apply"
            row("dispatch failed", b, who, "after-commit dispatch failed: mail")

            # 5. A template that cannot render (a context key missing): "cannot render ... for user N".
            b = len(records)
            send(mail.MailTemplate.EMAIL_VERIFY, {"name": None}, who)
            row("unrenderable", b, who, "send_mail: cannot render")

            # 6. A share invite to an address with no account, from an inviter with no name (the subject then carries
            #    the inviter's address): the invitee's keyed stand-in, the subject redacted.
            share = mail.invitee_label("share", invitee)
            settings.mail_guard = False
            b = len(records)
            send(
                mail.MailTemplate.SHARE_INVITE,
                {"token": "qt", "inviter": inviter, "workspace": "qt", "project": "qt mail log", "has_password": False},
                share,
                invitee,
            )
            settings.mail_guard = True
            row("share invitee", b, share, "mail sent:")
            rows += 1
            again = mail.invitee_label("share", invitee.upper())
            if not re.fullmatch(r"share invitee [0-9a-f]{12}", share) or again != share or mail.invitee_label("workspace", invitee) == share:
                wrong.append("FAIL  mail log invitee stand-in: not 12 hex, not stable across case, or the same for both kinds")

            # 7. A database error on an address: the engine hides its bound parameters, but Postgres echoes the value it
            #    refused, so the raw error does name it. Logged with its traceback through a handler on the root logger
            #    after `log_redact.install()` (as the api's main and the workers' setup install it): the line written
            #    names no address.
            rows += 1
            root = logging.getLogger()
            root_catch = Catch(logging.DEBUG)
            root.addHandler(root_catch)
            installed = log_redact.install()
            b = len(records)
            raw = ""
            try:
                try:
                    with session.begin_nested():
                        session.execute(text("select cast(:e as integer)"), {"e": to})
                except Exception as exc:  # noqa: BLE001
                    raw = str(exc)
                    logging.getLogger("qt.maillog").error("qt mail log: database error %s", exc, exc_info=True)
            finally:
                root_catch.removeFilter(installed)
                root.removeHandler(root_catch)
            got = records[b:]
            hidden = "parameters hidden" in raw
            echoed = to in raw  # the vector is real: never printed, only counted
            clean = bool(got) and not any(address.search(r) or any(s in r for s in secrets_) for r in got) and any("<address>" in r for r in got)
            if not (hidden and echoed and clean):
                wrong.append(f"FAIL  mail log database error: parameters hidden {hidden}, value echoed by the database {echoed}, the written line clean and redacted {clean}")

            session.rollback()

        # 8. Every caller names its recipient: each `mail.queue(...)` in the api passes `who=`.
        rows += 1
        missing = []
        for path in pathlib.Path("/srv/app").rglob("*.py"):
            for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "queue" and ast.unparse(node.func.value) == "mail":
                    if not any(k.arg == "who" for k in node.keywords):
                        missing.append(f"{path.relative_to('/srv')}:{node.lineno}")
        if missing:
            wrong.append(f"FAIL  mail log callers: mail.queue without who= at {', '.join(missing)}")
    finally:
        smtplib.SMTP = real_smtp  # type: ignore[misc]
        if real_delay is None:
            del send_mail.delay
        else:
            send_mail.delay = real_delay  # type: ignore[method-assign]
        settings.mail_guard, settings.mail_allowlist = real_guard, real_allow
        for f in list(catch.filters):
            catch.removeFilter(f)
        for lg, level, propagate in saved:
            lg.removeHandler(catch)
            lg.setLevel(level)
            lg.propagate = propagate

    rows += 1
    leaked = sum(1 for r in records if address.search(r) or any(s in r for s in secrets_))
    if leaked:
        wrong.append(f"FAIL  mail log: {leaked} of {len(records)} records name an address")
    for line in wrong:
        print(line)
    print(f"mail log: {rows} rows ({len(records)} log records of the real queue -> outbox -> send_mail -> send path: guard capture, relay, a refusal retried {send_mail.max_retries} times, a failed hand-off, an unrenderable template, a share invitee, a database error; every mail.queue names who; SMTP captured in-process, rolled back), {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(mail_log())

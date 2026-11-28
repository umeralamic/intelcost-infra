"""D-1407 (the founder's D-1404 item 5), a quantity-table row set: account and workspace deletion, driven through the
api in the api's own process (httpx over ASGI, the real routes, the real database, the real bench bucket) on
throwaways made here and removed at the end (`fx.qtdel<tag>.<stamp>@bench.intelcost.io`, workspaces
`fx.qt-del.<n>.<stamp>`). Billing through the bench's Stripe fake. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-deletion-d1407.py"

Rows: an owner with a member is refused deleting their account (409); a member is refused deleting the workspace
(403); a wrong name is refused (422); the owner deletes it: its subscription cancelled at the fake, its links off,
the member refused (403 workspace_deleted), the workspace in the owner's deleted list; restored within the grace;
deleted again and erased after a forced grace end: its file gone from the bucket, its row gone, the record kept
with ids only. An account deleted: sign-in answers account_deleted, its access token refused, its own workspace
deleted with it; restored with its password; deleted and erased: the user row gone. An account whose work another
workspace keeps is anonymized, not deleted. A failed file delete is retried nightly and the platform admins told
once at the third failed retry (captured, rolled back: no one is told). The guard refuses a founder id first.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import asyncio
import logging
import random
import re
import secrets
import sys
import uuid as uuid_module
from datetime import UTC, datetime, timedelta
from typing import Any

FOUNDER = {e.lower() for e in guard.FOUNDER_EMAILS}
FAKE = "http://stripe-fake:12111"


async def run() -> int:
    import httpx
    from sqlalchemy import delete, select

    import app.models_registry  # noqa: F401
    from app.core import storage
    from app.database import SessionFactory, SyncSessionFactory
    from app.features.auth.models import User
    from app.features.billing.models import WorkspaceSubscription
    from app.features.deletion import erase
    from app.features.deletion.models import DeletionRecord
    from app.features.project.models import Project
    from app.features.share.models import ProjectShareLink
    from app.features.workspace.models import Workspace
    from app.main import app

    # No debug or info lines from any library (Stripe, httpcore, celery, httpx): they name the throwaway ids.
    logging.disable(logging.INFO)
    logging.getLogger("celery").setLevel(logging.WARNING)
    logging.getLogger("app.features.auth.tier").setLevel(logging.ERROR)  # no country on the bench: expected
    # The injected failures below log a warning and, at the third, the alert line: counted by the rows, not shown.
    logging.getLogger("app.features.deletion.erase").setLevel(logging.CRITICAL)
    stamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    wrong: list[str] = []
    n = 0

    def check(rid: str, got: object, want: object) -> None:
        nonlocal n
        n += 1
        if got != want:
            wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")

    transport = httpx.ASGITransport(app=app, client=(f"192.0.2.{random.randint(1, 254)}", 4000))
    client = httpx.AsyncClient(transport=transport, base_url="http://qt", timeout=60)
    fake = httpx.AsyncClient(base_url=FAKE, timeout=60)
    made_users: list[str] = []
    made_workspaces: list[str] = []
    passwords: dict[str, str] = {}

    async def account(tag: str) -> tuple[dict[str, str], str]:
        email = f"fx.qtdel{tag}.{stamp}@bench.intelcost.io"
        if email in FOUNDER:
            raise SystemExit("qt-deletion: a founder account")
        password = "Qt-" + secrets.token_urlsafe(18)
        made = await client.post("/api/auth/register", json={"email": email, "password": password, "full_name": f"QT {tag}"})
        if made.status_code != 201:
            raise RuntimeError(f"register {tag}: {made.status_code}")
        made_users.append(made.json()["uuid"])
        passwords[email] = password
        return await login(email), email

    async def login(email: str) -> dict[str, str]:
        r = await client.post("/api/auth/login", json={"email": email, "password": passwords[email]})
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    async def workspace(headers: dict[str, str], n_: int) -> tuple[str, str]:
        name = f"fx.qt-del.{n_}.{stamp}"
        r = await client.post("/api/workspace", headers=headers, json={"name": name})
        made_workspaces.append(r.json()["uuid"])
        return r.json()["uuid"], name

    async def join(owner: dict[str, str], w: str, email: str, headers: dict[str, str], role: str) -> None:
        inv = await client.post(f"/api/workspace/{w}/invitation", headers=owner, json={"email": email, "role": role})
        token = re.search(r"token=([^&]+)", inv.json()["link"])[1]  # type: ignore[index]
        from urllib.parse import unquote

        r = await client.post(f"/api/invitation/{unquote(token)}/accept", headers=headers)
        if r.status_code != 200:
            raise RuntimeError(f"accept {role}: {r.status_code}")

    async def remove(w: str, headers: dict[str, str], name: str) -> httpx.Response:
        return await client.post(f"/api/workspace/{w}/delete", headers=headers, json={"confirm_name": name})

    def force(subject: str) -> dict[str, int]:
        """The bench drive's forced grace end, for one subject (as drives/expire-grace.py)."""
        now = datetime.now(UTC)
        with SyncSessionFactory() as s:
            sid = uuid_module.UUID(subject)
            user = s.scalar(select(User).where(User.uuid == sid))
            if user is not None:
                user.erase_after = now - timedelta(seconds=1)
                for w in s.scalars(select(Workspace).where(Workspace.owner_id == user.id, Workspace.deleted_at.is_not(None))):
                    w.erase_after = now - timedelta(seconds=1)
            for w in s.scalars(select(Workspace).where(Workspace.uuid == sid)):
                w.erase_after = now - timedelta(seconds=1)
            s.commit()
            return erase.erase_due(s, now, only=sid)

    async def record_of(subject: str) -> DeletionRecord | None:
        async with SessionFactory() as s:
            return await s.scalar(select(DeletionRecord).where(DeletionRecord.subject_uuid == uuid_module.UUID(subject)).order_by(DeletionRecord.id.desc()).limit(1))

    try:
        owner, owner_email = await account("owner")
        member, member_email = await account("member")
        w1, w1_name = await workspace(owner, 1)
        await join(owner, w1, member_email, member, "collaborator")
        p1 = (await client.post(f"/api/workspace/{w1}/project", headers=owner, json={"name": "fx.qt-del project"})).json()["uuid"]
        check("d1407-link-on", (await client.post(f"/api/workspace/{w1}/project/{p1}/share-link", headers=owner)).status_code, 201)
        # Billing: Checkout at the fake, paid; the subscription arrives by the webhook.
        co = await client.post(f"/api/workspace/{w1}/billing/checkout", headers=owner, json={"plan": "professional", "cadence": "monthly", "seats": 1})
        session_id = co.json()["url"].rstrip("/").split("/")[-1]
        await fake.post(f"/_fake/sessions/{session_id}/complete")
        sub_id, status = None, None
        for _ in range(30):
            async with SessionFactory() as s:
                sub = await s.scalar(select(WorkspaceSubscription).join(Workspace).where(Workspace.uuid == uuid_module.UUID(w1)))
                if sub is not None and sub.stripe_subscription_id:
                    sub_id, status = sub.stripe_subscription_id, sub.status
                    break
            await asyncio.sleep(1)
        check("d1407-subscribed", (sub_id is not None, str(status) if sub_id else None), (True, "active"))

        check_ = (await client.get("/api/auth/me/deletion", headers=owner)).json()
        check("d1407-owner-blocked-check", (check_["can_delete"], [x["name"] for x in check_["blocking"]]), (False, [w1_name]))
        refused = await client.post("/api/auth/me/delete", headers=owner, json={"password": passwords[owner_email]})
        check("d1407-owner-with-members-409", (refused.status_code, refused.json().get("code")), (409, "owner_has_members"))
        check("d1407-member-cannot-delete-403", (await remove(w1, member, w1_name)).status_code, 403)
        check("d1407-wrong-name-422", (await remove(w1, owner, w1_name + "x")).status_code, 422)
        gone = await remove(w1, owner, w1_name)
        check("d1407-workspace-deleted", gone.status_code, 200)
        async with SessionFactory() as s:
            sub = await s.scalar(select(WorkspaceSubscription).where(WorkspaceSubscription.stripe_subscription_id == sub_id))
            link = await s.scalar(select(ProjectShareLink).join(Project).where(Project.uuid == uuid_module.UUID(p1)))
            check("d1407-billing-cancelled-row", str(sub.status) if sub else None, "canceled")
            check("d1407-link-off", link.enabled if link else None, False)
        at_fake = await fake.get(f"/v1/subscriptions/{sub_id}", headers={"Authorization": "Bearer sk_bench_qt"})
        check("d1407-billing-cancelled-fake", at_fake.json().get("status"), "canceled")
        member_try = await client.get(f"/api/workspace/{w1}", headers=member)
        check("d1407-member-refused-403", (member_try.status_code, member_try.json().get("code")), (403, "workspace_deleted"))
        check("d1407-gone-from-list", w1 in [x["uuid"] for x in (await client.get("/api/workspace", headers=member)).json()], False)
        listed = (await client.get("/api/account/deleted-workspace", headers=owner)).json()
        check("d1407-owner-deleted-list", [x["uuid"] for x in listed], [w1])
        check("d1407-member-cannot-restore", (await client.post(f"/api/account/deleted-workspace/{w1}/restore", headers=member)).status_code, 404)
        check("d1407-restore-workspace", (await client.post(f"/api/account/deleted-workspace/{w1}/restore", headers=owner)).status_code, 200)
        check("d1407-member-back", (await client.get(f"/api/workspace/{w1}", headers=member)).status_code, 200)
        # Erasure after a forced grace end: a file under the workspace in the real bucket first.
        key = storage.build_key("project-file", uuid_module.UUID(w1), uuid_module.UUID(p1), "qt-d1407-probe.txt")
        storage.put_bytes(key, b"qt d1407 probe", "text/plain")
        check("d1407-probe-stored", storage.list_keys(f"project-file/{w1}/"), [key])
        check("d1407-deleted-again", (await remove(w1, owner, w1_name)).status_code, 200)
        counts = force(w1)
        check("d1407-erase-counts", (counts["workspaces"], counts["files_failed"]), (1, 0))
        check("d1407-file-gone", storage.list_keys(f"project-file/{w1}/"), [])
        async with SessionFactory() as s:
            check("d1407-workspace-row-gone", await s.scalar(select(Workspace.id).where(Workspace.uuid == uuid_module.UUID(w1))), None)
            check("d1407-project-row-gone", await s.scalar(select(Project.id).where(Project.uuid == uuid_module.UUID(p1))), None)
        rec = await record_of(w1)
        check("d1407-record-kept", (rec is not None and rec.erased_at is not None, rec.outcome if rec else None, rec.files_deleted if rec else None), (True, "deleted", 1))
        names = {c.name for c in DeletionRecord.__table__.columns}
        check("d1407-record-no-personal", sorted(names & {"name", "email", "full_name", "workspace_name"}), [])

        # An account with its own workspace (no other member): deleted, refused at sign-in, restored, erased.
        solo, solo_email = await account("solo")
        w2, _ = await workspace(solo, 2)
        c2 = (await client.get("/api/auth/me/deletion", headers=solo)).json()
        check("d1407-solo-check", (c2["can_delete"], [x["uuid"] for x in c2["with_account"]]), (True, [w2]))
        check("d1407-wrong-password-422", (await client.post("/api/auth/me/delete", headers=solo, json={"password": "not-it"})).status_code, 422)
        check("d1407-account-deleted", (await client.post("/api/auth/me/delete", headers=solo, json={"password": passwords[solo_email]})).status_code, 200)
        sign = await client.post("/api/auth/login", json={"email": solo_email, "password": passwords[solo_email]})
        check("d1407-signin-refused", (sign.status_code, sign.json().get("code")), (401, "account_deleted"))
        check("d1407-token-refused", (await client.get("/api/auth/me", headers=solo)).status_code, 401)
        back = await client.post("/api/auth/restore", json={"email": solo_email, "password": passwords[solo_email]})
        check("d1407-account-restored", back.status_code, 200)
        solo = {"Authorization": f"Bearer {back.json()['access_token']}"}
        check("d1407-own-workspace-back", (await client.get(f"/api/workspace/{w2}", headers=solo)).status_code, 200)
        check("d1407-account-deleted-again", (await client.post("/api/auth/me/delete", headers=solo, json={"password": passwords[solo_email]})).status_code, 200)
        solo_uuid = made_users[-1]
        counts = force(solo_uuid)
        check("d1407-account-erased", (counts["workspaces"], counts["accounts"], counts["anonymized"]), (1, 1, 0))
        async with SessionFactory() as s:
            check("d1407-user-row-gone", await s.scalar(select(User.id).where(User.uuid == uuid_module.UUID(solo_uuid))), None)
        rec = await record_of(solo_uuid)
        check("d1407-account-record", (rec.kind, rec.outcome) if rec else None, ("account", "deleted"))

        # Work another workspace keeps: the account is anonymized, never deleted under it.
        host, _ = await account("host")
        worker, worker_email = await account("worker")
        w3, _ = await workspace(host, 3)
        await join(host, w3, worker_email, worker, "estimator")
        p3 = (await client.post(f"/api/workspace/{w3}/project", headers=worker, json={"name": "fx.qt-del kept"})).json()["uuid"]
        check("d1407-worker-deleted", (await client.post("/api/auth/me/delete", headers=worker, json={"password": passwords[worker_email]})).status_code, 200)
        worker_uuid = made_users[-1]
        counts = force(worker_uuid)
        check("d1407-anonymized", counts["anonymized"], 1)
        async with SessionFactory() as s:
            row = await s.scalar(select(User).where(User.uuid == uuid_module.UUID(worker_uuid)))
            kept = await s.scalar(select(Project.id).where(Project.uuid == uuid_module.UUID(p3)))
            check("d1407-anonymized-row", (row.email == f"erased-{worker_uuid}@erased.invalid", row.full_name, row.is_active) if row else None, (True, None, False))
            check("d1407-their-work-kept", kept is not None, True)

        # A file delete that fails: retried nightly, the admins told once at the third failure. Rolled back.
        probe = uuid_module.uuid4()
        told: list[str] = []
        real_delete, real_drain, real_queue = storage.delete_prefix, erase.outbox.commit_and_drain, erase.mail.queue
        fail = [True]

        def flaky(prefix: str, **_: object) -> int:
            if str(probe) not in prefix:
                raise AssertionError("the failure rows reached a real prefix")
            if fail[0]:
                raise OSError("injected: the bucket is not reachable")
            return 0

        with SyncSessionFactory() as s:
            try:
                storage.delete_prefix = flaky  # type: ignore[assignment]
                erase.outbox.commit_and_drain = lambda sess: sess.flush()  # type: ignore[assignment,attr-defined]
                erase.mail.queue = lambda *a, **k: told.append("mail")  # type: ignore[assignment,attr-defined]
                rec = DeletionRecord(kind="workspace", subject_uuid=probe, requested_at=datetime.now(UTC), erase_after=datetime.now(UTC), erased_at=datetime.now(UTC), prefixes=[f"project-file/{probe}/"], failed_prefixes=[f"project-file/{probe}/"])
                s.add(rec)
                s.flush()
                seen = []
                for night in range(1, 6):
                    fail[0] = night < 5
                    out = erase.retry_files(s, datetime.now(UTC), only=probe)
                    seen.append((rec.failed_retries, out["alerted"], rec.files_cleared_at is not None))
                check("d1407-retry-nights", seen, [(1, 0, False), (2, 0, False), (3, 1, False), (4, 0, False), (4, 0, True)])
                admins = s.scalar(select(__import__("sqlalchemy").func.count()).select_from(User).where(User.is_platform_admin.is_(True))) or 0
                check("d1407-told-once-each", len(told), admins)
            finally:
                storage.delete_prefix, erase.outbox.commit_and_drain, erase.mail.queue = real_delete, real_drain, real_queue  # type: ignore[assignment,attr-defined]
                s.rollback()
    except Exception as exc:  # a setup failure is a failed row set, never a pass
        wrong.append(f"FAIL  d1407-setup: {type(exc).__name__}: {str(exc)[:200]}")
    finally:
        await client.aclose()
        await fake.aclose()
        # Removed: what is left of the throwaways (workspaces first: they cascade), then the accounts, then the QT's own records.
        async with SessionFactory() as s:
            for w in made_workspaces:
                await s.execute(delete(Workspace).where(Workspace.uuid == uuid_module.UUID(w), Workspace.name.like("fx.qt-del.%")))
            for u in made_users:
                row = await s.scalar(select(User).where(User.uuid == uuid_module.UUID(u)))
                if row is not None and row.email not in FOUNDER and (row.email.startswith("fx.qtdel") or row.email.startswith("erased-")):
                    await s.execute(delete(User).where(User.id == row.id))
            await s.execute(delete(DeletionRecord).where(DeletionRecord.subject_uuid.in_([uuid_module.UUID(x) for x in made_users + made_workspaces])))
            await s.commit()
            left = (await s.execute(select(User.id).where(User.email.like(f"fx.qtdel%.{stamp}@bench.intelcost.io")))).all()
        for w in made_workspaces:
            for p in erase.workspace_prefixes(uuid_module.UUID(w)):
                storage.delete_prefix(p, workspace_uuid=uuid_module.UUID(w))
        check("d1407-throwaways-removed", len(left), 0)
    for line in wrong:
        print(line)
    print(f"account and workspace deletion (D-1407): {n} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))

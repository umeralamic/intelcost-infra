"""D-1403 (the founder's parts a and b), a quantity-table row set: who may share a project, driven through the api
in the api's own process (httpx over ASGI, the real routes, the real database) on throwaways made here and removed
at the end. One throwaway workspace `fx.qt-share.<stamp>`, its owner, an admin, an estimator, a collaborator and a
viewer (`fx.qtshare<n>.<stamp>@bench.intelcost.io`, registered through the api with a random password kept in this
process), each joining by the api's own invitation link. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-share-d1403.py"

Rows: the default lets the estimator and the collaborator share and refuses the viewer (403); "Owner and admins
only" refuses the estimator and the collaborator; "Specific members" lets the ticked estimator and refuses the
collaborator; a viewer cannot be ticked (422); "Members may share pricing" off refuses the estimator's Show
pricing on (403) and lets the admin; a member cannot change the setting (403); the list names the creator and
who changed it; the admin turns off the estimator's link; then a creator who left reads "(left the workspace)".
Nothing touches a founder's row: the guard is imported first and refuses any founder id before it is sent.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import asyncio
import random
import re
import secrets
import sys
from datetime import UTC, datetime
from typing import Any

FOUNDER = {e.lower() for e in guard.FOUNDER_EMAILS}


async def run() -> int:
    import logging

    import httpx
    from sqlalchemy import delete, select

    logging.getLogger("httpx").setLevel(logging.WARNING)  # no request lines: they name the throwaway ids

    import app.models_registry  # noqa: F401
    from app.database import SessionFactory
    from app.features.auth.models import User
    from app.features.workspace.models import Workspace
    from app.main import app

    stamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    wrong: list[str] = []
    n = 0

    def check(rid: str, got: object, want: object) -> None:
        nonlocal n
        n += 1
        if got != want:
            wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")

    # A TEST-NET address per run, so the signup limit per address is not spent by the bench's own.
    transport = httpx.ASGITransport(app=app, client=(f"192.0.2.{random.randint(1, 254)}", 4000))
    client = httpx.AsyncClient(transport=transport, base_url="http://qt")
    emails: list[str] = []
    workspace_uuid = ""

    async def account(tag: str) -> dict[str, str]:
        email = f"fx.qtshare{tag}.{stamp}@bench.intelcost.io"
        if email in FOUNDER:  # never: the pattern cannot be a founder's, refused all the same
            raise SystemExit("qt-share: a founder account")
        password = "Qt-" + secrets.token_urlsafe(18)
        made = await client.post("/api/auth/register", json={"email": email, "password": password, "full_name": f"QT {tag}"})
        if made.status_code != 201:
            raise RuntimeError(f"register {tag}: {made.status_code}")
        emails.append(email)
        tokens = (await client.post("/api/auth/login", json={"email": email, "password": password})).json()
        return {"Authorization": f"Bearer {tokens['access_token']}"}

    try:
        owner = await account("owner")
        made = await client.post("/api/workspace", headers=owner, json={"name": f"fx.qt-share.{stamp}"})
        workspace_uuid = made.json()["uuid"]
        w = f"/api/workspace/{workspace_uuid}"
        seats: dict[str, dict[str, str]] = {}
        for role in ("admin", "estimator", "collaborator", "viewer"):
            headers = await account(role)
            email = emails[-1]
            inv = await client.post(f"{w}/invitation", headers=owner, json={"email": email, "role": role})
            if inv.status_code != 201:
                raise RuntimeError(f"invite {role}: {inv.status_code} {inv.text[:160]}")
            token = re.search(r"token=([^&]+)", inv.json()["link"])[1]  # type: ignore[index]
            from urllib.parse import unquote

            ok = await client.post(f"/api/invitation/{unquote(token)}/accept", headers=headers)
            if ok.status_code != 200:
                raise RuntimeError(f"accept {role}: {ok.status_code} {ok.text[:160]}")
            seats[role] = headers
        seats["owner"] = owner
        projects = {}
        for who in ("estimator", "collaborator", "viewer", "admin"):
            p = await client.post(f"{w}/project", headers=owner, json={"name": f"fx.qt-share {who}"})
            projects[who] = p.json()["uuid"]

        def link(who: str) -> str:
            return f"{w}/project/{projects[who]}/share-link"

        async def turn_on(who: str, as_: str) -> int:
            return (await client.post(link(who), headers=seats[as_])).status_code

        # The default: everyone but a viewer.
        pol = (await client.get(f"{w}/share-policy", headers=seats["viewer"])).json()
        check("d1403-default-mode", (pol["mode"], pol["members_share_pricing"], pol["can_share"]), ("all_but_viewers", True, False))
        check("d1403-default-estimator", await turn_on("estimator", "estimator"), 201)
        check("d1403-default-collaborator", await turn_on("collaborator", "collaborator"), 201)
        viewer_try = await client.post(link("viewer"), headers=seats["viewer"])
        check("d1403-default-viewer-403", (viewer_try.status_code, viewer_try.json().get("code")), (403, "share_viewer"))
        viewer_patch = await client.patch(link("estimator"), headers=seats["viewer"], json={"allow_presence": True})
        check("d1403-viewer-change-403", viewer_patch.status_code, 403)
        check("d1403-collaborator-change", (await client.patch(link("collaborator"), headers=seats["collaborator"], json={"allow_presence": True})).status_code, 200)

        async def put(as_: str, body: dict[str, Any]) -> httpx.Response:
            return await client.put(f"{w}/share-policy", headers=seats[as_], json=body)

        check("d1403-member-cannot-set", (await put("estimator", {"mode": "admins"})).status_code, 403)
        # Owner and admins only.
        check("d1403-admins-set", (await put("admin", {"mode": "admins", "members_share_pricing": True})).status_code, 200)
        refused = await client.patch(link("estimator"), headers=seats["estimator"], json={"allow_presence": False})
        check("d1403-admins-estimator-403", (refused.status_code, refused.json().get("code")), (403, "share_not_allowed"))
        check("d1403-admins-collaborator-403", (await client.patch(link("collaborator"), headers=seats["collaborator"], json={"allow_presence": False})).status_code, 403)
        check("d1403-admins-admin", await turn_on("admin", "admin"), 201)
        # Specific members: the estimator ticked, the collaborator not; a viewer cannot be ticked.
        members = (await client.get(f"{w}/member", headers=owner)).json()
        by_role = {m["role"]: m["user_uuid"] for m in members}
        check("d1403-viewer-untickable", (await put("owner", {"mode": "specific", "members_share_pricing": True, "member_uuids": [by_role["viewer"]]})).status_code, 422)
        check("d1403-specific-set", (await put("owner", {"mode": "specific", "members_share_pricing": True, "member_uuids": [by_role["estimator"]]})).status_code, 200)
        check("d1403-specific-estimator", (await client.patch(link("estimator"), headers=seats["estimator"], json={"allow_presence": False})).status_code, 200)
        check("d1403-specific-collaborator-403", (await client.patch(link("collaborator"), headers=seats["collaborator"], json={"allow_presence": False})).status_code, 403)
        # Pricing kept to admins.
        check("d1403-pricing-off-set", (await put("owner", {"mode": "all_but_viewers", "members_share_pricing": False})).status_code, 200)
        priced = await client.patch(link("estimator"), headers=seats["estimator"], json={"show_pricing": True})
        check("d1403-pricing-estimator-403", (priced.status_code, priced.json().get("code")), (403, "share_pricing_admins"))
        check("d1403-pricing-estimator-other", (await client.patch(link("estimator"), headers=seats["estimator"], json={"allow_save_copy": True})).status_code, 200)
        check("d1403-pricing-admin", (await client.patch(link("estimator"), headers=seats["admin"], json={"show_pricing": True})).json().get("show_pricing"), True)
        check("d1403-pricing-estimator-turns-off", (await client.patch(link("estimator"), headers=seats["estimator"], json={"show_pricing": False})).json().get("show_pricing"), False)
        # The list: owner and admin only; who made each, who changed it.
        check("d1403-list-member-403", (await client.get(f"{w}/share-link", headers=seats["estimator"])).status_code, 403)
        rows = {r["project_name"]: r for r in (await client.get(f"{w}/share-link", headers=seats["admin"])).json()}
        est = rows.get("fx.qt-share estimator", {})
        check("d1403-list-rows", sorted(rows), ["fx.qt-share admin", "fx.qt-share collaborator", "fx.qt-share estimator"])
        check("d1403-list-creator", (est.get("created_by"), est.get("changed_by"), est.get("allow_save_copy")), ("QT estimator", "QT estimator", True))
        # The estimator leaves; the admin turns their link off from the list.
        check("d1403-estimator-leaves", (await client.delete(f"{w}/member/me", headers=seats["estimator"])).status_code, 200)
        rows = {r["project_name"]: r for r in (await client.get(f"{w}/share-link", headers=seats["admin"])).json()}
        check("d1403-list-left", rows["fx.qt-share estimator"]["created_by"], "QT estimator (left the workspace)")
        off = await client.post(f"{w}/share-link/{rows['fx.qt-share estimator']['uuid']}/off", headers=seats["admin"])
        check("d1403-admin-turns-off", off.status_code, 200)
        after = (await client.get(link("estimator"), headers=owner)).json()
        check("d1403-off-kept", (after["enabled"], sorted(r["project_name"] for r in (await client.get(f"{w}/share-link", headers=owner)).json())), (False, ["fx.qt-share admin", "fx.qt-share collaborator"]))
    except Exception as exc:  # a setup failure is a failed row set, never a pass
        wrong.append(f"FAIL  d1403-setup: {type(exc).__name__}: {str(exc)[:200]}")
    finally:
        await client.aclose()
        # Removed: the throwaway workspace (its rows cascade), then the accounts. Nothing was uploaded.
        async with SessionFactory() as session:
            if workspace_uuid:
                await session.execute(delete(Workspace).where(Workspace.uuid == workspace_uuid, Workspace.name.like("fx.qt-share.%")))
            for email in emails:
                if email.startswith("fx.qtshare") and email not in FOUNDER:
                    await session.execute(delete(User).where(User.email == email))
            await session.commit()
            left = (await session.execute(select(User.id).where(User.email.like(f"fx.qtshare%.{stamp}@bench.intelcost.io")))).all()
        check("d1403-throwaways-removed", len(left), 0)
    for line in wrong:
        print(line)
    print(f"who may share a project (D-1403): {n} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))

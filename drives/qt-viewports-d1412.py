"""D-1412 (viewports Run A, D-1410), quantity-table rows. Two parts, both run by `./quantity-table.sh`:

    python drives/qt-viewports-d1412.py pure  < viewports.json > viewports-py.json
    python drives/qt-viewports-d1412.py api

**pure:** the cases of `browser/lib/viewport-cases.mjs` through the api's own `app/features/takeoff/viewport.py`
(each shape placed, then the item measured with each shape at its own scale; the boxes' refusals). The browser compares
them with the app's `src/lib/takeoff/viewports.ts` and with the answers worked by hand. Nothing is read or written.

**api:** the same rules through the real routes, in the api's own process (httpx over ASGI, the real database, the real
bench bucket for the blank page), on throwaways made here and removed at the end (account
`fx.qtvp.<stamp>@bench.intelcost.io`, workspace `fx.qt-vp.<stamp>`; the page's files deleted under that workspace's
prefixes). One 20 x 10 in blank page (drawn on once its size is read) at 1" = 30': a line outside every box, one in Detail A, one in Detail B (nested in
A), one across A's edge, an area with a deduct in A, a count in A. Rows: a new unscaled viewport changes no quantity
(before = after for each touched item); A at 1" = 10' and B at 1" = 5' each recompute only their shapes; a partial
overlap is refused 422; the sheet lists its viewports; the crossing line is flagged and counted on its sheet row; A
resized so its line crosses (60 -> 180 LF); B deleted, its line back to A's scale; the sheet scale taken away (outside
0 and stale); A's scale undone alone; a second sheet with no viewport measures as before. The guard is imported first.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import asyncio
import json
import math
import random
import secrets
import sys
import uuid as uuid_module
from datetime import UTC, datetime
from typing import Any

FOUNDER = {e.lower() for e in guard.FOUNDER_EMAILS}


def pure() -> int:
    from app.features.takeoff import viewport as vp

    body = json.load(sys.stdin)
    rows = []
    for c in body["cases"]:
        viewports = tuple(vp.Viewport(v["uuid"], tuple(v["box"]), v["fpp"], v["name"]) for v in c["viewports"])
        frame = vp.Frame((float(c["page"][0]), float(c["page"][1])), c["sheetFpp"], viewports)
        places = [vp.place(c["type"], s["vertices"], s.get("meta"), viewports) for s in c["shapes"]]
        placed = [
            vp.Placed(1, c["type"], s["vertices"], s.get("meta"), s.get("role", "add"), places[i][0], places[i][1])
            for i, s in enumerate(c["shapes"])
        ]
        quantity, unscaled, apart = vp.measure(placed, {1: frame})
        rows.append({"id": c["id"], "places": [list(p) for p in places], "quantity": quantity, "unscaled": unscaled, "apart": apart})
    boxes = []
    for b in body["boxes"]:
        others = [vp.Viewport(v["uuid"], tuple(v["box"]), v["fpp"], v["name"]) for v in b["viewports"]]
        boxes.append({"id": b["id"], "refused": vp.overlap_refusal(b["name"], tuple(b["box"]), others) or False})
    json.dump({"rows": rows, "boxes": boxes}, sys.stdout)
    return 0


async def remove(workspace_uuids: list[str], emails: list[str]) -> tuple[int, int, int]:
    """The throwaways gone: each `fx.qt-vp.` workspace's page preparation settled (no file written after its prefixes
    are cleared), every prefix of it cleared, its row deleted (its rows cascade); then each `fx.qtvp.` account. Returns
    the files, accounts and workspaces left."""
    from sqlalchemy import delete, select

    from app.core import storage
    from app.database import SessionFactory
    from app.features.auth.models import User
    from app.features.deletion import erase
    from app.features.drawing.models import RenderJobState, SheetRenderJob
    from app.features.workspace.models import Workspace

    files = 0
    ids = [uuid_module.UUID(str(u)) for u in workspace_uuids]
    async with SessionFactory() as session:
        found = (
            await session.execute(select(Workspace.id, Workspace.uuid, Workspace.name).where(Workspace.uuid.in_(ids)))
        ).all() if workspace_uuids else []
        for ws_id, ws_uuid, name in found:
            if not name.startswith("fx.qt-vp."):
                continue
            for _ in range(90):
                busy = await session.scalar(
                    select(SheetRenderJob.id)
                    .where(SheetRenderJob.workspace_id == ws_id, SheetRenderJob.state.in_([RenderJobState.QUEUED, RenderJobState.RUNNING]))
                    .limit(1)
                )
                if busy is None:
                    break
                await asyncio.sleep(2)
            prefixes = erase.workspace_prefixes(ws_uuid)
            for prefix in prefixes:
                storage.delete_prefix(prefix, workspace_uuid=ws_uuid)
            files += sum(len(storage.list_keys(prefix)) for prefix in prefixes)
            await session.execute(delete(Workspace).where(Workspace.id == ws_id))
        for email in emails:
            if email.startswith("fx.qtvp.") and email.lower() not in FOUNDER:
                await session.execute(delete(User).where(User.email == email))
        await session.commit()
        left = len((await session.execute(select(User.id).where(User.email.in_(emails)))).all()) if emails else 0
        left_ws = len((await session.execute(select(Workspace.id).where(Workspace.uuid.in_(ids)))).all()) if workspace_uuids else 0
    return files, left, left_ws


async def clean() -> int:
    """Every `fx.qt-vp.` workspace and `fx.qtvp.` account a run that stopped short left behind."""
    from sqlalchemy import select

    import app.models_registry  # noqa: F401
    from app.database import SessionFactory
    from app.features.auth.models import User
    from app.features.workspace.models import Workspace

    async with SessionFactory() as session:
        spaces = [str(u) for u in (await session.scalars(select(Workspace.uuid).where(Workspace.name.like("fx.qt-vp.%"))))]
        emails = list(await session.scalars(select(User.email).where(User.email.like("fx.qtvp.%@bench.intelcost.io"))))
    files, left, left_ws = await remove(spaces, emails)
    print(f"viewport throwaways removed: {len(spaces)} workspaces, {len(emails)} accounts; left {left_ws} workspaces, {left} accounts, {files} files")
    return 0 if (files, left, left_ws) == (0, 0, 0) else 1


async def api() -> int:
    import logging

    import httpx

    logging.disable(logging.INFO)  # no request lines: they name the throwaway ids
    logging.getLogger("app.features.auth.tier").setLevel(logging.ERROR)  # no country on the bench: expected

    import app.models_registry  # noqa: F401
    from app.main import app

    stamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    wrong: list[str] = []
    n = 0

    def check(rid: str, got: object, want: object) -> None:
        nonlocal n
        n += 1
        ok = got == want
        if isinstance(got, float) and isinstance(want, int | float):
            ok = math.isclose(got, want, rel_tol=1e-9, abs_tol=1e-9)
        if not ok:
            wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")

    transport = httpx.ASGITransport(app=app, client=(f"192.0.2.{random.randint(1, 254)}", 4000))
    client = httpx.AsyncClient(transport=transport, base_url="http://qt", timeout=120)
    email = f"fx.qtvp.{stamp}@bench.intelcost.io"
    workspace_uuid = ""
    if email in FOUNDER:
        raise SystemExit("qt-viewports: a founder account")
    try:
        password = "Qt-" + secrets.token_urlsafe(18)
        made = await client.post("/api/auth/register", json={"email": email, "password": password, "full_name": "QT viewports"})
        if made.status_code != 201:
            raise RuntimeError(f"register: {made.status_code}")
        token = (await client.post("/api/auth/login", json={"email": email, "password": password})).json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        r = await client.post("/api/workspace", headers=h, json={"name": f"fx.qt-vp.{stamp}"})
        workspace_uuid = r.json()["uuid"]
        p = (await client.post(f"/api/workspace/{workspace_uuid}/project", headers=h, json={"name": "fx.qt-vp project"})).json()["uuid"]
        base = f"/api/workspace/{workspace_uuid}/project/{p}"

        async def sheet(name: str) -> str:
            r = await client.post(f"{base}/drawing/sheet/new", headers=h, json={"name": name, "width_in": 20, "height_in": 10})
            if r.status_code != 201:
                raise RuntimeError(f"new page: {r.status_code} {r.text[:120]}")
            made = str(r.json()["sheet_uuid"])
            # Its size in points is read when the page is prepared: shapes are drawn once it is known.
            for _ in range(60):
                rows = (await client.get(f"{base}/drawing/sheet", headers=h)).json()
                if any(s["uuid"] == made and s["width_pt"] for s in rows):
                    return made
                await asyncio.sleep(2)
            raise RuntimeError("the new page has no size after 120 s")

        async def scale(s: str, fpp: float, label: str, viewport: str | None = None) -> int:
            q = f"?viewport_uuid={viewport}" if viewport else ""
            r = await client.put(f"{base}/drawing/sheet/{s}/scale{q}", headers=h, json={"feet_per_pt": fpp, "label": label})
            return r.status_code

        async def item(s: str, name: str, kind: str, unit: str, vertices: list[Any], meta: dict[str, Any] | None = None) -> str:
            geometry: dict[str, Any] = {"geom_type": kind, "vertices_json": vertices, "sheet_uuid": s}
            if meta is not None:
                geometry["shape_meta"] = meta
            r = await client.post(f"{base}/takeoff/item", headers=h, json={"name": name, "type": kind, "unit": unit, "sheet_uuid": s, "geometry": geometry})
            if r.status_code != 201:
                raise RuntimeError(f"item {name}: {r.status_code} {r.text[:160]}")
            return str(r.json()["uuid"])

        async def detail(i: str) -> dict[str, Any]:
            return (await client.get(f"{base}/takeoff/item/{i}", headers=h)).json()

        async def qty(i: str) -> tuple[float, bool]:
            d = await detail(i)
            return round(float(d["calculated_quantity"]), 6), bool(d["is_stale"])

        def changes(body: dict[str, Any]) -> dict[str, tuple[float, float]]:
            return {c["item_uuid"]: (round(c["before"], 6), round(c["after"], 6)) for c in body["changes"]}

        rect = lambda x0, y0, x1, y1: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]  # noqa: E731
        s1 = await sheet("fx viewports")
        check("d1412-api-scale", await scale(s1, 30 / 72, '1" = 30\''), 200)
        line_out = await item(s1, "Outside", "lf", "LF", [[0.1, 0.1], [0.3, 0.1]])
        line_a = await item(s1, "In A", "lf", "LF", [[0.55, 0.2], [0.85, 0.2]])
        line_b = await item(s1, "In B", "lf", "LF", [[0.65, 0.6], [0.75, 0.6]])
        line_x = await item(s1, "Across A", "lf", "LF", [[0.4, 0.3], [0.6, 0.3]])
        area = await item(s1, "Slab", "sf", "SF", rect(0.55, 0.15, 0.75, 0.35))
        owner = (await detail(area))["geometries"][0]["uuid"]
        r = await client.post(f"{base}/takeoff/item/{area}/geometry", headers=h, json={"geom_type": "sf", "vertices_json": rect(0.6, 0.2, 0.65, 0.25), "role": "subtract", "owner_uuid": owner})
        check("d1412-api-deduct", r.status_code, 201)
        count = await item(s1, "Bollards", "count", "EA", [[0.6, 0.2], [0.7, 0.3], [0.85, 0.4]])
        # The sheet scale alone: 4 in = 120, 6 in = 180, 2 in = 60, 4 in = 120 LF; 4 x 2 in less 1 x 0.5 in = 7,200 - 450.
        check("d1412-api-before", [await qty(i) for i in (line_out, line_a, line_b, line_x, area, count)], [(120.0, False), (180.0, False), (60.0, False), (120.0, False), (6750.0, False), (3.0, False)])

        # A new viewport with no scale: every shape it holds re-derived, no quantity moves (falls back to the sheet's).
        r = await client.post(f"{base}/drawing/sheet/{s1}/viewport", headers=h, json={"name": "Detail A", "box": [0.5, 0.1, 0.9, 0.9]})
        check("d1412-api-create", r.status_code, 201)
        vp_a = r.json()["viewport"]["uuid"]
        got = changes(r.json())
        check("d1412-api-create-touched", sorted(got), sorted([line_a, line_b, line_x, area, count]))
        check("d1412-api-create-unmoved", all(b == a for b, a in got.values()), True)
        # Detail A at 1" = 10': only its shapes recomputed. 6 in = 60, 2 in = 20 LF; 800 - 50 = 750 SF; across stays 120.
        check("d1412-api-scale-a", await scale(s1, 10 / 72, '1" = 10\'', vp_a), 200)
        check("d1412-api-after-a", [await qty(i) for i in (line_out, line_a, line_b, line_x, area, count)], [(120.0, False), (60.0, False), (20.0, False), (120.0, False), (750.0, False), (3.0, False)])
        # Detail B nested in A at 1" = 5': the inner wins, 2 in = 10 LF.
        r = await client.post(f"{base}/drawing/sheet/{s1}/viewport", headers=h, json={"name": "Detail B", "box": [0.6, 0.5, 0.8, 0.8]})
        check("d1412-api-nested", r.status_code, 201)
        vp_b = r.json()["viewport"]["uuid"]
        check("d1412-api-nested-unmoved", changes(r.json()), {line_b: (20.0, 20.0)})
        check("d1412-api-scale-b", await scale(s1, 5 / 72, '1" = 5\'', vp_b), 200)
        check("d1412-api-after-b", await qty(line_b), (10.0, False))
        # A partial overlap is refused with the spec's sentence.
        r = await client.post(f"{base}/drawing/sheet/{s1}/viewport", headers=h, json={"name": "Detail G", "box": [0.4, 0.2, 0.6, 0.4]})
        check("d1412-api-partial", (r.status_code, "partly overlap" in r.text), (422, True))
        # The sheet lists them, each with its scale.
        listed = [s for s in (await client.get(f"{base}/drawing/sheet", headers=h)).json() if s["uuid"] == s1][0]["viewports"]
        check("d1412-api-listed", [(v["name"], v["has_calibration"], round(v["feet_per_norm"], 12)) for v in listed], [("Detail A", True, round(10 / 72, 12)), ("Detail B", True, round(5 / 72, 12))])
        # The crossing line: flagged on its shape, counted on its sheet row, measured at the sheet scale.
        shape = (await detail(line_x))["geometries"][0]
        check("d1412-api-cross-flag", (shape["viewport_uuid"], shape["viewport_flag"]), (None, "crosses"))
        inner = (await detail(line_b))["geometries"][0]
        check("d1412-api-inner-place", (inner["viewport_uuid"], inner["viewport_flag"]), (vp_b, None))
        rows = {i["uuid"]: i for s in (await client.get(f"{base}/drawing/sheet/items", headers=h)).json() for i in s["items"]}
        check("d1412-api-cross-row", (rows[line_x]["crossing"], rows[line_a]["crossing"]), (1, 0))
        check("d1412-api-row-qty", (round(rows[line_a]["quantity"], 6), round(rows[line_b]["quantity"], 6), round(rows[area]["quantity"], 6)), (60.0, 10.0, 750.0))
        # Detail A resized so its line crosses: 60 -> 180 LF (the sheet scale), the line in B unmoved.
        r = await client.patch(f"{base}/drawing/sheet/{s1}/viewport/{vp_a}", headers=h, json={"box": [0.58, 0.1, 0.9, 0.9]})
        check("d1412-api-resize", r.status_code, 200)
        got = changes(r.json())
        check("d1412-api-resize-cross", (got.get(line_a), got.get(line_b)), ((60.0, 180.0), (10.0, 10.0)))
        # Detail B deleted with its scale: its line falls back to A's, 2 in = 20 LF.
        r = await client.delete(f"{base}/drawing/sheet/{s1}/viewport/{vp_b}", headers=h)
        check("d1412-api-delete", (r.status_code, changes(r.json()).get(line_b)), (200, (10.0, 20.0)))
        # Detail A's scale undone on its own: its shapes back to the sheet's, 2 in = 60 LF.
        r = await client.put(f"{base}/drawing/sheet/{s1}/calibration/restore?viewport_uuid={vp_a}", headers=h, json={"calibration": None})
        check("d1412-api-undo-a", (r.status_code, await qty(line_b)), (200, (60.0, False)))
        check("d1412-api-undo-a-sheet-kept", (await client.get(f"{base}/drawing/sheet/{s1}/calibration", headers=h)).json()["label"], '1" = 30\'')
        check("d1412-api-scale-a-again", await scale(s1, 10 / 72, '1" = 10\'', vp_a), 200)
        # The sheet scale taken away: outside every scaled box nothing, and stale; in A still 20 LF, and stale on the
        # item only when one of its shapes has no scale.
        r = await client.put(f"{base}/drawing/sheet/{s1}/calibration/restore", headers=h, json={"calibration": None})
        check("d1412-api-no-sheet-scale", r.status_code, 200)
        check("d1412-api-no-sheet-scale-qty", [await qty(i) for i in (line_out, line_b, line_x, count)], [(0.0, True), (20.0, False), (0.0, True), (3.0, False)])
        # A second sheet with no viewport: as before (and its shape placed nowhere).
        s2 = await sheet("fx no viewports")
        check("d1412-api-plain-scale", await scale(s2, 30 / 72, '1" = 30\''), 200)
        plain = await item(s2, "Plain", "lf", "LF", [[0.55, 0.2], [0.85, 0.2]])
        got_plain = (await detail(plain))["geometries"][0]
        check("d1412-api-plain", (await qty(plain), got_plain["viewport_uuid"], got_plain["viewport_flag"]), ((180.0, False), None, None))
        check("d1412-api-plain-listed", [s["viewports"] for s in (await client.get(f"{base}/drawing/sheet", headers=h)).json() if s["uuid"] == s2], [[]])
    except Exception as exc:  # a setup failure is a failed row set, never a pass
        wrong.append(f"FAIL  d1412-api-setup: {type(exc).__name__}: {str(exc)[:200]}")
    finally:
        await client.aclose()
        left_files, left, left_ws = await remove([workspace_uuid] if workspace_uuid else [], [email])
        check("d1412-api-throwaways-removed", (left, left_ws, left_files), (0, 0, 0))
    for line in wrong:
        print(line)
    print(f"viewports through the api (D-1412): {n} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "pure":
        sys.exit(pure())
    if mode == "api":
        sys.exit(asyncio.run(api()))
    if mode == "clean":
        sys.exit(asyncio.run(clean()))
    print("usage: qt-viewports-d1412.py pure|api|clean")
    sys.exit(2)

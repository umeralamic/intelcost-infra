"""Bench only: grow a BENCH DUP to a given number of items, for timing the takeoff panel and
Estimating at size (row virtualisation, D-646).

    docker compose exec -T api sh -lc "cd /srv && python drives/gen-items.py <project uuid> <total> [sheet]"

Adds Linear items on one sheet (A101 by default) until the project holds <total> items, each a copy
of the first Linear item drawn on that sheet: its columns, its quantity and its shapes, moved to a
spot of its own on the sheet so the canvas draws them spread out. They are filed round-robin into 50
folders "GEN-01".."GEN-50", made once. The api's own writes run at about 10 items a second; this
writes rows straight into the bench database, thousands a second.

A project is taken only when its name is exactly "BENCH DUP <yyyy-mm-dd hh:mm> — delete me" (the
name the MCP guard gives every copy, D-544), it is not on the guard's protected list and it is not in
the founder's own workspace (D-542, D-601). Anything else is refused and nothing is written. The
purge script (drives/purge-bench-dups.py) removes the DUP and everything in it at wrap-up.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import copy
import json
import random
import re
import sys
import uuid

from sqlalchemy import text

import app.models_registry  # noqa: F401
from app.database import SyncSessionFactory

NAME = re.compile(r"^BENCH DUP \d{4}-\d{2}-\d{2} \d{2}:\d{2} — delete me$")
PROTECTED = set(guard.PROTECTED)
FOUNDER_WORKSPACES = set(guard.FOUNDER_WORKSPACE_UUIDS)
FOLDERS = 50
SKIP = {"id", "uuid", "name", "folder_id", "position", "created_at", "updated_at", "name_base"}


def columns(session, table: str) -> list[str]:
    rows = session.execute(
        text("select column_name from information_schema.columns where table_name = :t order by ordinal_position"),
        {"t": table},
    )
    return [r[0] for r in rows]


def moved(points, dx: float, dy: float):
    """Every [x, y] pair (or {x, y}) in the shape moved by (dx, dy), in page fractions."""
    if isinstance(points, dict):
        out = dict(points)
        if isinstance(out.get("x"), (int, float)) and isinstance(out.get("y"), (int, float)):
            out["x"] += dx
            out["y"] += dy
        for key, value in points.items():
            if isinstance(value, (list, dict)):
                out[key] = moved(value, dx, dy)
        return out
    if isinstance(points, list):
        if len(points) == 2 and all(isinstance(v, (int, float)) for v in points):
            return [points[0] + dx, points[1] + dy]
        return [moved(p, dx, dy) for p in points]
    return points


def main() -> None:
    project_uuid, total = sys.argv[1], int(sys.argv[2])
    sheet_name = sys.argv[3] if len(sys.argv) > 3 else "A101"
    random.seed(646)
    with SyncSessionFactory() as session:
        project = session.execute(
            text(
                "select p.id, p.name, p.workspace_id, w.uuid::text from project p join workspace w on w.id = p.workspace_id where p.uuid = :u"
            ),
            {"u": project_uuid},
        ).one_or_none()
        if project is None:
            sys.exit("REFUSED: no such project")
        pid, name, workspace_id, workspace_uuid = project
        if project_uuid in PROTECTED or workspace_uuid in FOUNDER_WORKSPACES or not NAME.match(name):
            sys.exit(f"REFUSED: {name!r} is not a BENCH DUP outside the founder's workspace")

        sheet = session.execute(
            text("select id from drawing_sheet where project_id = :p and (sheet_number = :s or sheet_name = :s) order by id limit 1"),
            {"p": pid, "s": sheet_name},
        ).scalar_one_or_none()
        if sheet is None:
            sys.exit(f"no sheet {sheet_name}")
        template = session.execute(
            text(
                "select i.id from takeoff_item i where i.project_id = :p and i.sheet_id = :s and i.type = 'LF' "
                "and i.parent_item_id is null and exists (select 1 from takeoff_geometry g where g.takeoff_item_id = i.id) order by i.id limit 1"
            ),
            {"p": pid, "s": sheet},
        ).scalar_one_or_none()
        if template is None:
            sys.exit(f"no Linear item with shapes on {sheet_name} to copy")

        have = session.execute(text("select count(*) from takeoff_item where project_id = :p"), {"p": pid}).scalar_one()
        add = total - have
        if add <= 0:
            print(f"{name}: {have} items already, nothing added")
            return

        # The 50 folders, made once, each a copy of the template's own folder row's settings.
        folder_cols = [c for c in columns(session, "takeoff_folder") if c not in {"id", "uuid", "name", "position", "created_at", "updated_at", "parent_id", "classification_ref_id", "auto_key"}]
        folders = []
        for n in range(1, FOLDERS + 1):
            label = f"GEN-{n:02d}"
            fid = session.execute(
                text("select id from takeoff_folder where project_id = :p and name = :n and tree = 'custom'"), {"p": pid, "n": label}
            ).scalar_one_or_none()
            if fid is None:
                fid = session.execute(
                    text(
                        f"insert into takeoff_folder (uuid, name, position, created_at, updated_at, {', '.join(folder_cols)}) "
                        f"select :u, :n, :pos, now(), now(), {', '.join(folder_cols)} from takeoff_folder "
                        "where project_id = :p and tree = 'custom' and not is_reference and not is_earthwork_markup and not is_earthwork_lines "
                        "order by id limit 1 returning id"
                    ),
                    {"u": uuid.uuid4(), "n": label, "pos": 1000 + n, "p": pid},
                ).scalar_one()
            folders.append(fid)

        item_cols = [c for c in columns(session, "takeoff_item") if c not in SKIP]
        geom_cols = [c for c in columns(session, "takeoff_geometry") if c not in {"id", "uuid", "takeoff_item_id", "vertices_json", "created_at", "updated_at", "owner_geometry_id"}]
        shapes = session.execute(
            text("select vertices_json from takeoff_geometry where takeoff_item_id = :t and owner_geometry_id is null order by id"), {"t": template}
        ).all()

        done = 0
        while done < add:
            batch = min(1000, add - done)
            for k in range(batch):
                n = have + done + k + 1
                item_id = session.execute(
                    text(
                        f"insert into takeoff_item (uuid, name, name_base, folder_id, position, created_at, updated_at, {', '.join(item_cols)}) "
                        f"select :u, :n, null, :f, :pos, now(), now(), {', '.join(item_cols)} from takeoff_item where id = :t returning id"
                    ),
                    {"u": uuid.uuid4(), "n": f"GEN-L-{n:05d}", "f": folders[n % FOLDERS], "pos": n, "t": template},
                ).scalar_one()
                dx, dy = random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3)
                for (vertices,) in shapes:
                    session.execute(
                        text(
                            f"insert into takeoff_geometry (uuid, takeoff_item_id, vertices_json, created_at, updated_at, {', '.join(geom_cols)}) "
                            f"select :u, :i, cast(:v as json), now(), now(), {', '.join(geom_cols)} from takeoff_geometry "
                            "where takeoff_item_id = :t and owner_geometry_id is null order by id limit 1"
                        ),
                        {"u": uuid.uuid4(), "i": item_id, "v": json.dumps(moved(copy.deepcopy(vertices), dx, dy)), "t": template},
                    )
            session.commit()
            done += batch
            print(f"{name}: {have + done} items")
        session.execute(text("update project set updated_at = now() where id = :p"), {"p": pid})
        session.commit()


if __name__ == "__main__":
    main()

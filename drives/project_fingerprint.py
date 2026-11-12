"""The founder's projects' fingerprint, read only: what a bench run compares before and after itself.

For one project: every table that holds its rows (a `project_id` column, or a key to such a table,
two levels down), the row count and the latest `updated_at` (else `created_at`); every stored
earthwork result's md5 (sheets and sites); and one digest over all of it. People's own activity in
the project (their last open sheet, their work sessions) is listed apart and left out of the digest,
so opening the project does not change it.

`--founder` (the default of `../fingerprint.sh`): every project on the guard list, each with its own
digest, and one digest over them all, the line a run compares at its start and its end. Then every
project in a workspace the founder's own account owns, checked against the list (D-601): one missing
from it is a FAIL. A protected project is shown by its label, never its name (D-1025).

With `--since <ISO time>` (one project), every row created or updated since then is listed too, with
the people its `*_by_id` and `user_id` columns name.

The list is the one file `INTELCOST_GUARD_LIST` names (guard_list.py). Not a drive: it does not import
the drives' guard, which would refuse the founder's projects; it runs in one read-only transaction
and writes nothing. A bench check like the quantity table, not a test suite (hard rule 8):

    ./fingerprint.sh                                 (from intelcost-infra: the guard check, then --founder)
    ./fingerprint.sh <project uuid> [--since <ISO>]  (one project)
"""

import asyncio
import hashlib
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guard_list import FOUNDER_OWNER, PROTECTED_PROJECTS, digest as list_digest  # noqa: E402

from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

from app.database import SessionFactory  # noqa: E402

ACTIVITY = frozenset({"project_visit", "work_session", "time_entry", "notification"})
"""A person's own activity in the project, not its content: listed, but not in the digest."""


async def _columns(session: AsyncSession) -> dict[str, set[str]]:
    rows = await session.execute(
        text("select table_name, column_name from information_schema.columns where table_schema = 'public'")
    )
    out: dict[str, set[str]] = {}
    for table, column in rows:
        out.setdefault(str(table), set()).add(str(column))
    return out


async def _keys(session: AsyncSession) -> list[tuple[str, str, str]]:
    """Single-column foreign keys: (child table, its column, parent table)."""
    rows = await session.execute(
        text(
            "select c.conrelid::regclass::text, a.attname, c.confrelid::regclass::text "
            "from pg_constraint c join pg_attribute a "
            "on a.attrelid = c.conrelid and a.attnum = c.conkey[1] "
            "where c.contype = 'f' and array_length(c.conkey, 1) = 1 "
            "order by 1, 2"
        )
    )
    return [(str(t).strip('"'), str(col), str(p).strip('"')) for t, col, p in rows]


def _sources(columns: dict[str, set[str]], keys: list[tuple[str, str, str]]) -> dict[str, str]:
    """Each table's rows of one project, as SQL after `select ... `: `from ... where ...`."""
    direct = {t for t, cols in columns.items() if "project_id" in cols and t != "project"}
    out = {t: f'from "{t}" t where t.project_id = :pid' for t in sorted(direct)}
    # A key to a table with the project, then a key to one of those.
    for _ in range(2):
        found: dict[str, str] = {}
        for child, column, parent in keys:
            if child in out or child in found or parent not in out or child == parent:
                continue
            inner = out[parent].removeprefix("from ")
            found[child] = f'from "{child}" t where t."{column}" in (select t.id {"from " + inner})'
        out.update(found)
    return out


def _order(cols: set[str]) -> str:
    return "t.updated_at" if "updated_at" in cols else "t.created_at"


class Schema:
    def __init__(self, columns: dict[str, set[str]], sources: dict[str, str]) -> None:
        self.columns = columns
        self.sources = sources


async def _schema(session: AsyncSession) -> Schema:
    columns = await _columns(session)
    return Schema(columns, _sources(columns, await _keys(session)))


async def _one(session: AsyncSession, schema: Schema, project_uuid: str, verbose: bool) -> str | None:
    """One project's digest, or None when there is no such project. Prints its tables when verbose."""
    row = (
        await session.execute(text("select id, name, updated_at, deleted_at from project where uuid = :u"), {"u": project_uuid})
    ).first()
    if row is None:
        return None
    pid, name, project_updated, deleted = row
    label = PROTECTED_PROJECTS.get(project_uuid)
    lines: list[str] = []
    activity: list[str] = []
    for table in sorted(schema.sources):
        cols = schema.columns.get(table, set())
        stamp = _order(cols) if {"updated_at", "created_at"} & cols else "null"
        count, latest = (
            await session.execute(text(f"select count(*), max({stamp}) {schema.sources[table]}"), {"pid": pid})
        ).one()
        if count == 0:
            continue
        line = f"{table:<36} {count:>7}  {latest}"
        (activity if table in ACTIVITY else lines).append(line)
    results: list[str] = []
    for sql in (
        "select 'sheet ' || coalesce(s.sheet_number, s.uuid::text), md5(r.result::text), "
        "r.computed_at from earthwork_result r join drawing_sheet s on s.id = r.sheet_id "
        "where r.project_id = :pid order by 1",
        "select 'site ' || si.name, md5(r.result::text), r.computed_at "
        "from earthwork_site_result r join site si on si.id = r.site_id "
        "where si.project_id = :pid order by 1",
    ):
        for result_label, md5, at in await session.execute(text(sql), {"pid": pid}):
            results.append(f"{result_label:<36} {md5}  {at}")
    # The project row itself: its updated_at and whether it is in Trash.
    head = f"project updated_at {project_updated}, {'in Trash since ' + str(deleted) if deleted else 'live'}"
    digest = hashlib.sha256("\n".join([head, *lines, *results]).encode()).hexdigest()[:16]
    if verbose:
        shown = f'"{label}"' if label else f'"{name}"'
        print(f"project {shown} ({project_uuid}, id {pid}), {head.removeprefix('project ')}")
        print("\ncontent tables (rows, latest change)")
        print("\n".join(lines) or "(none)")
        if activity:
            print("\npeople's own activity (not in the digest)")
            print("\n".join(activity))
        print("\nstored results (md5 of the saved result, computed at)")
        print("\n".join(results) or "(none)")
        print(f"\ndigest {digest}")
    return digest


async def _owned(session: AsyncSession) -> int:
    """Every project of the founder's own account's workspaces, checked against the list (D-601)."""
    print("\nprojects in workspaces the founder's own account owns, against the list")
    owned = await session.execute(
        text(
            "select p.uuid::text from project p join workspace w on w.id = p.workspace_id "
            'join "user" u on u.id = w.owner_id where lower(u.email) = :owner order by p.created_at'
        ),
        {"owner": FOUNDER_OWNER},
    )
    missing = 0
    count = 0
    for (uuid,) in owned:
        count += 1
        if uuid in PROTECTED_PROJECTS:
            continue
        missing += 1
        # The list's own label, never the project's name (D-1025).
        print(f"FAIL {uuid}  not on the list, name withheld")
    print(f"{count} project(s); {'all on the list' if not missing else f'{missing} not on the list'}")
    return missing


async def founder() -> int:
    async with SessionFactory() as session:
        await session.execute(text("set transaction read only"))
        schema = await _schema(session)
        print(f"guard list {list_digest()}: {len(PROTECTED_PROJECTS)} protected projects\n")
        digests: list[str] = []
        failed = 0
        for uuid, label in PROTECTED_PROJECTS.items():
            one = await _one(session, schema, uuid, verbose=False)
            if one is None:
                failed += 1
                print(f"FAIL {label:<28} {uuid}  no such project")
                one = "missing"
            else:
                print(f"     {label:<28} {uuid}  {one}")
            digests.append(f"{uuid} {one}")
        missing = await _owned(session)
        total = hashlib.sha256("\n".join(digests).encode()).hexdigest()[:16]
        print(f"\nfounder digest {total}  ({len(digests)} projects)")
        await session.rollback()
    return 1 if failed or missing else 0


async def single(project_uuid: str, since: datetime | None) -> int:
    async with SessionFactory() as session:
        await session.execute(text("set transaction read only"))
        schema = await _schema(session)
        if await _one(session, schema, project_uuid, verbose=True) is None:
            print(f"FAIL no project {project_uuid}")
            return 1
        if since is not None:
            pid = (await session.execute(text("select id from project where uuid = :u"), {"u": project_uuid})).scalar_one()
            print(f"\nrows created or updated since {since.isoformat()}")
            for table in sorted(schema.sources):
                cols = schema.columns.get(table, set())
                stamps = [c for c in ("created_at", "updated_at") if c in cols]
                if not stamps:
                    continue
                people = sorted(c for c in cols if c.endswith("_by_id") or c == "user_id")
                who = ", ".join(f'(select u.email from "user" u where u.id = t."{c}") as "{c}"' for c in people)
                ident = "t.uuid::text" if "uuid" in cols else "t.id::text"
                cond = " or ".join(f"t.{c} >= :since" for c in stamps)
                sql = (
                    f"select {ident}, {', '.join('t.' + c for c in stamps)}"
                    f"{', ' + who if who else ''} {schema.sources[table]} and ({cond}) order by {_order(cols)}"
                )
                for r in await session.execute(text(sql), {"pid": pid, "since": since}):
                    values = list(r)
                    head = f"{table}  {values[0]}  " + "  ".join(
                        f"{c}={v}" for c, v in zip(stamps, values[1 : 1 + len(stamps)], strict=True)
                    )
                    tail = "  ".join(
                        f"{c}={v}" for c, v in zip(people, values[1 + len(stamps) :], strict=True) if v is not None
                    )
                    print(f"{head}  {tail}".rstrip())
        await _owned(session)
        await session.rollback()
    return 0


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    if args[0] == "--founder":
        return asyncio.run(founder())
    since = None
    if "--since" in args:
        i = args.index("--since")
        since = datetime.fromisoformat(args[i + 1].replace("Z", "+00:00"))
        args = args[:i] + args[i + 2 :]
    return asyncio.run(single(args[0].strip().lower(), since))


if __name__ == "__main__":
    sys.exit(main())

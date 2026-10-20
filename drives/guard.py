"""The drives' guard (A1, D-667): every script run in the api's process refuses the protected projects
as the browser's guard does (`browser/lib/protected.mjs`), before any read or write.

Imported first by every drive, before anything from `app`:

    import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

A script fed on stdin (`python - < x.py`) puts the folder on its path first:
`sys.path.insert(0, "/srv/drives")`. The list is the api scripts' own (`scripts/protected.py`), which
`browser/guard-check.mjs` holds equal to `lib/protected.mjs` and `mcp-guard.js`.

The rules, as `lib/protected.mjs`'s:
  - **On the command line** (at import, before the database is loaded): a protected project other than
    the 3D test copy, a founder workspace, or a founder account, named in any argument, stops the drive.
  - **Every SQL statement,** checked before it is sent (`before_cursor_execute`, every engine, async ones
    included): a statement whose text or parameters name a protected project other than the test copy,
    or a founder workspace, is refused, a read too (`openRefusal`). One naming the test copy is refused
    unless it is a read (`writeRefusal`).
  - **Every project row loaded** through the models: a protected project other than the test copy stops
    the drive the moment it is loaded, before the drive can use it or its id.
A refusal ends the drive (`SystemExit`, exit code 1, which `except Exception` does not catch) and prints
how many statements were sent before it; a refused statement is never sent.

**Not caught:** a statement naming a protected project only by its integer id, or a Core listing
(`text("select … from project")`) that returns its row. A drive learns that id only by reading the
project; reading it by uuid is refused, and a model load is refused, so neither is how a drive is
written. `scripts/project_fingerprint.py` is not a drive: it is the read-only fingerprint (D-542).

For a proof without touching a protected project, `DRIVE_GUARD_EXTRA` (uuids, comma separated) adds
projects to the list for one run; it can only add.
"""

import os
import re
import sys
import uuid as uuid_module
from typing import Any

sys.path.insert(0, "/srv/scripts")
from protected import FOUNDER_EMAILS, FOUNDER_WORKSPACES, PROTECTED_PROJECTS, TEST_COPY  # noqa: E402

PROTECTED: dict[str, str] = dict(PROTECTED_PROJECTS)
for extra in filter(None, (u.strip().lower() for u in os.environ.get("DRIVE_GUARD_EXTRA", "").split(","))):
    PROTECTED.setdefault(extra, "added for this run (DRIVE_GUARD_EXTRA)")
"""uuid → name: every project no drive opens (the test copy is read only)."""

FOUNDER_WORKSPACE_UUIDS: dict[str, str] = dict(FOUNDER_WORKSPACES)

_NEVER_OPENED = {u: n for u, n in PROTECTED.items() if u != TEST_COPY} | FOUNDER_WORKSPACE_UUIDS
_READ = re.compile(r"^\s*(?:select|with|show|explain)\b", re.IGNORECASE)
_WRITE_IN_READ = re.compile(r"\b(?:insert|update|delete|merge|truncate)\b", re.IGNORECASE)

sent = 0
"""Statements this drive has sent: each passed the guard."""


def _refuse(why: str, unsent: str = "; this one not sent") -> None:
    raise SystemExit(f"REFUSED by the drives' guard (D-667): {why}. Statements sent before it: {sent}{unsent}.")


def _texts(value: Any) -> list[str]:
    """Every string a parameter holds, uuids written out, through lists, tuples and dicts."""
    if isinstance(value, uuid_module.UUID):
        return [str(value)]
    if isinstance(value, (str, bytes)):
        return [value.decode(errors="ignore") if isinstance(value, bytes) else value]
    if isinstance(value, dict):
        return [t for v in value.values() for t in _texts(v)]
    if isinstance(value, (list, tuple, set, frozenset)):
        return [t for v in value for t in _texts(v)]
    return []


def statement_refusal(statement: str, parameters: Any) -> str | None:
    """Why a statement is refused, or None: `lib/protected.mjs`'s `openRefusal` and `writeRefusal`."""
    text = " ".join([statement, *_texts(parameters)]).lower()
    for uuid, name in _NEVER_OPENED.items():
        if uuid in text:
            return f'the statement names "{name}" ({uuid}), never opened from here (D-601)'
    if TEST_COPY in text and not (_READ.match(statement) and not _WRITE_IN_READ.search(statement)):
        return f'a write names "{PROTECTED[TEST_COPY]}" ({TEST_COPY}), which drives never write to (D-542)'
    return None


def argv_refusal(argv: list[str]) -> str | None:
    """Why the command line is refused, or None: a founder project, workspace or account named."""
    text = " ".join(argv).lower()
    for uuid, name in _NEVER_OPENED.items():
        if uuid in text:
            return f'the command line names "{name}" ({uuid}), never opened from here (D-601)'
    for email in FOUNDER_EMAILS:
        if email in text:
            return f"the command line names {email}, a founder account never acted for from here (D-601)"
    return None


def _install() -> None:
    from sqlalchemy import event
    from sqlalchemy.engine import Engine

    def before(_conn: Any, _cursor: Any, statement: str, parameters: Any, _context: Any, _many: bool) -> None:
        global sent
        why = statement_refusal(statement, parameters)
        if why:
            _refuse(why)
        sent += 1

    event.listen(Engine, "before_cursor_execute", before)

    import app.models_registry  # noqa: F401  (the Project model, mapped)
    from app.features.project.models import Project

    def loaded(project: Any, _context: Any) -> None:
        uuid = str(project.uuid).lower()
        if uuid in _NEVER_OPENED:
            _refuse(f'a project row loaded is "{_NEVER_OPENED[uuid]}" ({uuid}), never opened from here (D-601)', "; the drive stopped as it loaded")

    event.listen(Project, "load", loaded)


_why = argv_refusal(sys.argv[1:])
if _why:
    _refuse(_why)
_install()

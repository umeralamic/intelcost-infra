"""The guard's protected list (D-542, D-601), loaded from the one file that holds it.

The list lives in one JSON file outside git, named by the `INTELCOST_GUARD_LIST` environment variable
(as the client-name denylist is named by `INTELCOST_DENYLIST`). In the api container the compose file
mounts it read-only and sets the variable to the mounted path. Every guard and the fingerprint reads
this one file: `drives/guard.py` and the drives through it, `drives/project_fingerprint.py`,
`browser/lib/protected.mjs`, and `browser/mcp-guard.js` (through `bench-session-serve.mjs`, its sandbox
cannot read a file). There is no second copy to keep in step, and no id, email or name in a repo file.

Fails closed: an unset variable, a missing file or a malformed list stops whoever imports this, before
anything reads or writes.

The file's keys: `test_copy`, `founder_owner`, `seeded_email`, `founder_emails`, `founder_workspaces`
(uuid → label), `protected_projects` (uuid → label), `copy_sources` (uuid → label, projects the copier
alone may read), `keep_workspaces` (uuid → label, bench test workspaces the account purge keeps).
Labels only (P01, Real bid A…), never a project's name (D-1025).
"""

import hashlib
import json
import os
import re
import uuid as uuid_module
from typing import Any

PATH = os.environ.get("INTELCOST_GUARD_LIST", "").strip()
_UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def _stop(why: str) -> None:
    raise SystemExit(f"REFUSED by the guard list (fail closed): {why}")


def _load() -> dict[str, Any]:
    if not PATH:
        _stop("INTELCOST_GUARD_LIST is not set")
    if not os.path.isfile(PATH):
        _stop(f"INTELCOST_GUARD_LIST names no file ({PATH})")
    try:
        with open(PATH, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError) as error:
        _stop(f"the list cannot be read: {error}")
    for key in ("protected_projects", "founder_workspaces", "copy_sources", "keep_workspaces"):
        table = data.get(key)
        if not isinstance(table, dict) or (key != "copy_sources" and key != "keep_workspaces" and not table):
            _stop(f"{key} is missing or empty")
        bad = [u for u in table if not _UUID.match(u)]
        if bad:
            _stop(f"{key} holds a malformed uuid")
    emails = data.get("founder_emails")
    if not isinstance(emails, list) or not emails or not all(isinstance(e, str) and "@" in e for e in emails):
        _stop("founder_emails is missing or malformed")
    for key in ("test_copy", "founder_owner", "seeded_email"):
        if not isinstance(data.get(key), str) or not data[key]:
            _stop(f"{key} is missing")
    if data["test_copy"] not in data["protected_projects"]:
        _stop("the test copy is not on the protected list")
    if any(u not in data["protected_projects"] for u in data["copy_sources"]):
        _stop("a copy source is not on the protected list")
    return data


_DATA = _load()

TEST_COPY: str = _DATA["test_copy"].lower()
FOUNDER_OWNER: str = _DATA["founder_owner"].lower()
SEEDED_EMAIL: str = _DATA["seeded_email"].lower()
FOUNDER_EMAILS: frozenset[str] = frozenset(e.lower() for e in _DATA["founder_emails"])
"""The founder's accounts: never signed in as, never acted for (D-592, D-601)."""
FOUNDER_WORKSPACES: dict[str, str] = {k.lower(): v for k, v in _DATA["founder_workspaces"].items()}
"""Workspaces of the founder's own: never opened from here (D-601, D-891)."""
PROTECTED_PROJECTS: dict[str, str] = {k.lower(): v for k, v in _DATA["protected_projects"].items()}
"""uuid → label: every project no bench script writes to; all but the test copy never opened."""
COPY_SOURCES: dict[str, str] = {k.lower(): v for k, v in _DATA["copy_sources"].items()}
"""Projects the copier alone may read, for one copy (`copy-3d-test.py --source <uuid>`)."""
KEEP_WORKSPACES: dict[str, str] = {k.lower(): v for k, v in _DATA["keep_workspaces"].items()}
"""Bench test workspaces the account purge keeps with their throwaway owner."""
PROTECTED_UUIDS: frozenset[uuid_module.UUID] = frozenset(uuid_module.UUID(u) for u in PROTECTED_PROJECTS)


def digest() -> str:
    """One short digest of the list, the same in every reader (the guard check compares them)."""
    canonical = {
        "test_copy": TEST_COPY,
        "founder_emails": sorted(FOUNDER_EMAILS),
        "founder_workspaces": sorted(FOUNDER_WORKSPACES),
        "protected_projects": sorted(PROTECTED_PROJECTS),
        "copy_sources": sorted(COPY_SOURCES),
    }
    return hashlib.sha256(json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:16]


def refuse(project_uuid: str) -> None:
    """Stop the script when it was pointed at a protected project."""
    label = PROTECTED_PROJECTS.get(str(project_uuid).strip().lower())
    if label is not None:
        raise SystemExit(f'Refused: "{label}" is protected (D-542). Run this on a duplicate of the 3D test copy.')


if __name__ == "__main__":
    print(
        f"guard list {digest()}: {len(PROTECTED_PROJECTS)} protected projects, {len(FOUNDER_WORKSPACES)} founder "
        f"workspaces, {len(FOUNDER_EMAILS)} founder accounts, {len(COPY_SOURCES)} copy sources"
    )

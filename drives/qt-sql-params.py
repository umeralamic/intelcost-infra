"""D-1348 (the founder's D-1342 Q5), a quantity-table row set: `SQL_LOG_PARAMS_DEV`, the dev-only switch that shows
bound SQL parameters in logs. Both engines hide them by default (D-1339); the switch turns that off for the async and
the sync engine, honoured only under a development environment (`ENVIRONMENT=local` or `development`), and settings
load refuses it under production, staging (any other environment) or `PRODUCTION=true`, as `SIGNUP_THROTTLE_OFF` is
refused (D-1314). The address filter (`log_redact`) stays on whatever the switch says.

Each case is a separate python process in the api container with its own environment: the running api is never
touched, never restarted, its environment never changed. A case that loads runs one failing read on each engine
(`select cast(:e as integer)` with an address-shaped value, nothing written) and reports only booleans: the raw error
text, which names the value, is never printed. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-sql-params.py"
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import json
import os
import subprocess
import sys

PHRASE = "SQL_LOG_PARAMS_DEV is development only (D-1348)"

# The child: settings first (a refusal ends it before the database), then the guard, then one failing read per engine.
CHILD = r'''
import asyncio, io, json, logging, sys
marker = sys.argv[1]
out = {"refused": False}
try:
    from app.config import settings
except Exception as exc:  # pydantic's ValidationError, carrying the validator's message
    message = str(exc)
    out.update(refused=True, phrase=sys.argv[2] in message,
               staging="Unsafe staging settings:" in message, production="Unsafe production settings:" in message)
    print(json.dumps(out))
    sys.exit(0)
sys.path.insert(0, "/srv/drives")
import guard  # noqa: F401
from sqlalchemy import text
from app.core import log_redact
from app.database import engine, sync_engine

def shown(raw: str) -> bool:
    """The bound value in SQLAlchemy's `[parameters: ...]` tail: a dict for psycopg, a tuple for asyncpg."""
    return "[parameters: " in raw and f"'{marker}'" in raw.split("[parameters: ", 1)[1]
out.update(switch=settings.sql_log_params_dev, async_hide=engine.sync_engine.hide_parameters, sync_hide=sync_engine.hide_parameters)
sync_exc = None
with sync_engine.connect() as connection:
    try:
        connection.execute(text("select cast(:e as integer)"), {"e": marker})
    except Exception as exc:
        sync_exc = exc
async def failing() -> str:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("select cast(:e as integer)"), {"e": marker})
    except Exception as exc:
        return str(exc)
    finally:
        await engine.dispose()
    return ""
async_raw = asyncio.run(failing())
sync_raw = str(sync_exc or "")
out.update(sync_hidden="hide_parameters=True" in sync_raw, sync_shown=shown(sync_raw),
           async_hidden="hide_parameters=True" in async_raw, async_shown=shown(async_raw))
# The address filter, on whatever the switch says: the error logged with its traceback through the root's handler.
stream = io.StringIO()
handler = logging.StreamHandler(stream)
logging.getLogger().addHandler(handler)
log_redact.install()
logging.getLogger("qt.sqlparams").error("qt sql params: database error %s", sync_exc, exc_info=sync_exc)
written = stream.getvalue()
out.update(written=bool(written), written_clean=marker not in written and "<address>" in written and not log_redact.ADDRESS.search(written))
print(json.dumps(out))
'''


def sql_params() -> int:
    from datetime import UTC, datetime

    from app.config import settings
    from app.database import engine, sync_engine

    marker = f"qt.sqlparams.{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}@example.test"
    wrong: list[str] = []
    rows = 0

    # 0. This process has the bench api's own environment: the switch off, both engines hiding.
    rows += 1
    if settings.sql_log_params_dev or not engine.sync_engine.hide_parameters or not sync_engine.hide_parameters:
        wrong.append(f"FAIL  sql params bench api: switch {settings.sql_log_params_dev}, async hides {engine.sync_engine.hide_parameters}, sync hides {sync_engine.hide_parameters}")

    def child(name: str, **env: str) -> dict[str, object]:
        environ = {k: v for k, v in os.environ.items() if k.upper() not in {"SQL_LOG_PARAMS_DEV", "PRODUCTION", "ENVIRONMENT"}}
        environ.update(env)
        done = subprocess.run([sys.executable, "-c", CHILD, marker, PHRASE], cwd="/srv", env=environ, capture_output=True, text=True, timeout=300)
        try:
            return dict(json.loads(done.stdout.strip().splitlines()[-1]))
        except (IndexError, ValueError):
            # Never echo the child's output: a traceback would carry the marker.
            wrong.append(f"FAIL  sql params {name}: the child exited {done.returncode} with no result")
            return {}

    def hidden(name: str, **env: str) -> None:
        nonlocal rows
        rows += 1
        got = child(name, **env)
        if got and not (got.get("refused") is False and got.get("switch") is False and got.get("async_hide") is True and got.get("sync_hide") is True
                        and got.get("sync_hidden") and got.get("async_hidden") and not got.get("sync_shown") and not got.get("async_shown") and got.get("written_clean")):
            wrong.append(f"FAIL  sql params {name}: expected hidden on both engines, got {got}")

    def shown(name: str, **env: str) -> None:
        nonlocal rows
        rows += 1
        got = child(name, **env)
        if got and not (got.get("refused") is False and got.get("switch") is True and got.get("async_hide") is False and got.get("sync_hide") is False
                        and got.get("sync_shown") and got.get("async_shown") and not got.get("sync_hidden") and not got.get("async_hidden") and got.get("written_clean")):
            wrong.append(f"FAIL  sql params {name}: expected shown on both engines and the written line redacted, got {got}")

    def refused(name: str, prefix: str, **env: str) -> None:
        nonlocal rows
        rows += 1
        got = child(name, **env)
        if got and not (got.get("refused") is True and got.get("phrase") is True and got.get(prefix) is True):
            wrong.append(f"FAIL  sql params {name}: expected refused at settings load, 'Unsafe {prefix} settings: {PHRASE}', got {got}")

    # 1-4. Default off, under local and development: hidden. On, under local and development: shown, the filter on.
    hidden("local, unset", ENVIRONMENT="local")
    hidden("development, off", ENVIRONMENT="development", SQL_LOG_PARAMS_DEV="0")
    shown("local, on", ENVIRONMENT="local", SQL_LOG_PARAMS_DEV="1")
    shown("development, on", ENVIRONMENT="development", SQL_LOG_PARAMS_DEV="1")
    # 5-7. On beside a production or staging marker: settings load refuses it, naming it.
    refused("production, on", "production", ENVIRONMENT="production", SQL_LOG_PARAMS_DEV="1")
    refused("staging, on", "staging", ENVIRONMENT="staging", SQL_LOG_PARAMS_DEV="1")
    refused("local with PRODUCTION=true, on", "production", ENVIRONMENT="local", PRODUCTION="true", SQL_LOG_PARAMS_DEV="1")
    # 8-9. The contrasts: staging with it off loads (hidden); production with it off is refused for the bench's own
    #      values (D-882), but never names the switch.
    hidden("staging, off", ENVIRONMENT="staging")
    rows += 1
    got = child("production, off", ENVIRONMENT="production")
    if got and not (got.get("refused") is True and got.get("phrase") is False):
        wrong.append(f"FAIL  sql params production, off: expected refused for the bench values without naming the switch, got {got}")

    for line in wrong:
        print(line)
    print(f"sql params: {rows} rows (SQL_LOG_PARAMS_DEV, D-1348: the bench api off and hiding; unset or off hidden on both engines; on under local and development shown on both, the address filter still redacting; on under production, staging and PRODUCTION=true refused at settings load; separate processes, the running api untouched, nothing written), {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(sql_params())

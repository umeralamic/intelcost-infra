"""D-1385 and D-1386 (items 1 and 2 of the 2026-12-02 night run), a quantity-table row set: BLS requests packed to 50
series, the BLS data file and its import, and BLS called from the bench only. Through the api's own loader against the
bench's tables; read only (nothing is saved, no BLS request is made: `httpx.post` is replaced first). `./quantity-table.sh`
runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-bls-d1386.py"

Worked by hand (DECISIONS D-1385, D-1386):
1. Packing: 34 mapped SOCs x median and p75 = 68 series an area. 171 metros = 11,628 series = 233 calls, every one of
   50 but the last (28); the D-1382 batches of 10 areas took 240 (17 x 14 + 2). A full survey (every area the refresh
   knows with no survey loaded: 528 defined, 51 states, national = 580) = 39,440 series = 789 calls, 790 with the one
   ECI and newer-survey call.
2. A packed load straddles areas: 3 areas = 204 series = calls of 50, 50, 50, 50, 4. Refused at the third call (the
   daily limit), it writes the 1 area whose 68 series were all asked in the first two (100 series), says why it
   stopped, and makes no more calls.
3. The data file in the api's tree (`app/wagecalc/seed/bls_refdata.json`) matches the checksum beside it, carries the
   six tables in order, and each table's columns, count and digest equal the bench's tables now (the file is current).
4. A copy with one character changed is refused by the checksum before anything is read into the database.
5. Bench only: under staging settings (`ENVIRONMENT=staging`), production (`ENVIRONMENT=production`) and
   `PRODUCTION=true` on local, `calls_allowed` is False and `bls.series` and the refresh refuse with the bench-only
   words before any request (the key as the bench holds it); on the bench's own settings it is True. The script's
   import refuses on the bench without `--on-bench`.
6. A refusal that quotes the key ("... allocated to the user with registration key <key> has been reached.") reads
   "... with registration key (the key) has been reached." once, the key nowhere; a refresh whose first call is refused
   says the areas still waiting are left (171 before the metro load), not none.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import contextlib
import shutil
import sys
from pathlib import Path


def check(wrong: list[str], rid: str, got: object, want: object) -> None:
    if got != want:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


def main() -> int:
    import httpx

    def no_request(*_a: object, **_k: object) -> None:
        raise AssertionError("a BLS request was made")

    httpx.post = no_request  # nothing below may reach BLS

    from app.config import settings
    from app.database import sync_engine
    from app.wagecalc import bls, bls_load

    wrong: list[str] = []
    rows = 0
    with sync_engine.connect() as conn:
        socs = bls_load.mapped_socs(conn)
        everything = bls_load.pending_areas(conn, None)

    # 1
    per_area = len(socs) * len(bls_load.PRICED)
    metros = [("M", f"{n:07d}") for n in range(171)]
    calls = bls_load.pack(bls_load.oews_ids(metros, socs, bls_load.PRICED))
    old = sum(-(-len(bls_load.oews_ids(metros[i:i + 10], socs, bls_load.PRICED)) // 50) for i in range(0, 171, 10))
    check(wrong, "d1386-pack-per-area", (len(socs), per_area), (34, 68))
    check(wrong, "d1386-pack-171", (len(calls), {len(c) for c in calls[:-1]}, len(calls[-1]), old), (233, {50}, 28, 240))
    check(wrong, "d1386-pack-full-survey", (len(everything), bls_load.calls_needed(len(everything) * per_area) + 1),
          (580, 790))
    rows += 3

    # 2
    asked: list[int] = []

    def fake_series(ids: list[str], start: int, end: int) -> dict:
        asked.append(len(ids))
        if len(asked) == 3:
            raise bls.BlsError("daily threshold reached for registration key (the key)")
        return {sid: [(str(end - 1), "A01", 20.0)] for sid in ids}

    written: list[tuple[int, int]] = []

    def fake_write(_conn: object, found: dict, area_count: int, _wanted: list, _source: str) -> int:
        written.append((area_count, len(found)))
        return len(found) // 2

    class _Engine:
        @contextlib.contextmanager
        def begin(self):
            yield None

    real_series, real_write = bls.series, bls_load._write_oews
    bls.series, bls_load._write_oews = fake_series, fake_write
    try:
        three = [("M", "0000001"), ("M", "0000002"), ("M", "0000003")]
        out = bls_load.load_oews_packed(_Engine(), three, socs, bls_load.PRICED)  # type: ignore[arg-type]
        sizes = [len(c) for c in bls_load.pack(bls_load.oews_ids(three, socs, bls_load.PRICED))]
    finally:
        bls.series, bls_load._write_oews = real_series, real_write
    check(wrong, "d1386-pack-straddle", sizes, [50, 50, 50, 50, 4])
    check(wrong, "d1386-packed-stop", (asked, out.calls, out.areas, written, out.rows),
          ([50, 50, 50], 2, 1, [(1, 68)], 34))
    check(wrong, "d1386-packed-stop-said", (out.stopped or "").startswith("BlsError: daily threshold"), True)
    rows += 3

    # 3
    body = bls_load.verify_file(bls_load.DATA_FILE)
    with sync_engine.begin() as conn:
        now = bls_load.table_digests(conn)
        cols = {t: bls_load._columns(conn, t) for t, _ in bls_load.DATA_TABLES}
    check(wrong, "d1386-file-tables", [t["name"] for t in body["tables"]], [t for t, _ in bls_load.DATA_TABLES])
    check(wrong, "d1386-file-equals-bench",
          [(t["name"], t["columns"] == cols[t["name"]], t["count"], t["digest"]) for t in body["tables"]],
          [(t, True, *now[t]) for t, _ in bls_load.DATA_TABLES])
    rows += 2

    # 4
    bad = Path("/tmp/qt-bls-d1386.json")
    data = bls_load.DATA_FILE.read_bytes()
    at = data.index(b"Abilene")
    bad.write_bytes(data[:at] + b"X" + data[at + 1:])
    shutil.copyfile(bls_load.checksum_path(bls_load.DATA_FILE), bls_load.checksum_path(bad))
    try:
        bls_load.verify_file(bad)
        refused = "not refused"
    except ValueError as exc:
        refused = str(exc)
    finally:
        bad.unlink(missing_ok=True)
        bls_load.checksum_path(bad).unlink(missing_ok=True)
    check(wrong, "d1386-file-tampered-refused", refused, "qt-bls-d1386.json does not match its checksum: not imported")
    rows += 1

    # 5
    def refusals() -> tuple[bool, str, str]:
        said = []
        for call in (lambda: bls.series(["OEUN000000000000047206108"], 2025, 2025),
                     lambda: bls_load.refresh(sync_engine)):
            try:
                call()
                said.append("not refused")
            except bls.BlsError as exc:
                said.append(str(exc))
        return bls.calls_allowed(), said[0], said[1]

    words = "BLS is called from the bench only: this server takes the BLS data file (import)"
    env, prod = settings.environment, settings.production
    seen = {}
    try:
        for name, e, p in (("staging", "staging", False), ("production", "production", False),
                           ("local-production", "local", True)):
            settings.environment, settings.production = e, p
            seen[name] = refusals()
    finally:
        settings.environment, settings.production = env, prod
    check(wrong, "d1386-bench-only-refused", seen, {n: (False, words, words) for n in
                                                    ("staging", "production", "local-production")})
    check(wrong, "d1386-bench-allowed", (env, prod, bls.calls_allowed(), bls.has_key()), ("local", False, True, True))
    sys.path.insert(0, "/srv/scripts")
    import bls_load as script  # the script, not the module: /srv/scripts first

    check(wrong, "d1386-import-refused-on-bench", script._import([]), 2)
    rows += 3

    # 6
    secret = settings.bls_api_key.get_secret_value() if settings.bls_api_key else "no-key"

    class _Answer:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"status": "REQUEST_NOT_PROCESSED", "message": [
                f"Request could not be serviced, as the daily threshold for total number of requests allocated to "
                f"the user with registration key {secret} has been reached."]}

    httpx.post = lambda *_a, **_k: _Answer()
    try:
        bls.series(["OEUN000000000000047206108"], 2025, 2025)
        said = "not refused"
    except bls.BlsError as exc:
        said = str(exc)
    finally:
        httpx.post = no_request
    check(wrong, "d1386-refusal-redacted-once", (secret in said, said),
          (False, "Request could not be serviced, as the daily threshold for total number of requests allocated to "
                  "the user with registration key (the key) has been reached."))

    def refused_fetch(*_a: object, **_k: object) -> dict:
        raise bls.BlsError("daily threshold reached")

    real_fetch = bls_load._fetch
    bls_load._fetch = refused_fetch
    try:
        out1 = bls_load.refresh(sync_engine)
    finally:
        bls_load._fetch = real_fetch
    with sync_engine.connect() as conn:
        from sqlalchemy import text

        latest = conn.execute(text("SELECT max(survey_month) FROM refdata.ref_oews")).scalar()
        waiting = len(bls_load.pending_areas(conn, latest))
    check(wrong, "d1386-refresh-refused-left", (out1.left, out1.calls, out1.oews, (out1.stopped or "")[:8]),
          (waiting, 0, 0, "BlsError"))
    rows += 2

    for w in wrong:
        print(w)
    print(f"BLS packed calls and the data file (D-1385, D-1386): {rows} rows, "
          f"{'all right' if not wrong else f'{len(wrong)} wrong'} (171 metros 240 -> 233 calls; full survey "
          f"{len(everything)} areas 790 calls; file {len(data)} bytes, {sum(t['count'] for t in body['tables'])} rows)")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(main())

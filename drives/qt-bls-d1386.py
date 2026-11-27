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

D-1392 (2026-12-03, item 1): OEWS from BLS's published May 2025 files (`test-data-local/wage/bls/oesm25ma.zip`,
`oesm25st.zip`), no BLS call:
7. The files' verify against every row loaded (read only): 579 areas loaded and in the files (51 states, 135 nonmetro,
   393 metros), 9,510 rows compared (6,741 loaded by the API + 2,769 loaded from the files), 0 differences; the one
   loaded area the files lack is the national (no national file placed: its 34 API rows kept).
8. The 171 metros came from the files: one load record of kind oews whose source names the files and "171 areas", 2,769
   rows, survey May 2025; median and p75 only: the metro rows carrying a mean stay the 295 the API loaded before.
9. Areas still to load for May 2025: 0 (the card's "0 still to load").
10. The data file re-exported after the load is current: an export to /tmp gives byte for byte the committed file, and
    its sha256 is the one in `bls_refdata.json.sha256`.
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

    # 7-10 (D-1392): the published files, read only
    from datetime import date

    may25 = date(2025, 5, 1)
    files = [p for p, s in bls_load.oews_files() if s == may25]
    found: dict = {}
    for path in files:
        found.update(bls_load.read_oews_file(path, socs)[1])
    with sync_engine.connect() as conn:
        fc = bls_load.verify_oews_file(conn, may25, found)
        kinds = dict(conn.execute(text(
            "SELECT kind, count(*) FROM refdata.ref_oews_area a WHERE vintage = (SELECT max(vintage) FROM "
            "refdata.ref_oews_area) AND EXISTS (SELECT 1 FROM refdata.ref_oews o WHERE o.area_type = 'M' AND "
            "o.area_code = a.area_code AND o.survey_month = :m) GROUP BY kind"), {"m": may25}).all())
        states = conn.execute(text("SELECT count(DISTINCT area_code) FROM refdata.ref_oews WHERE area_type = 'S' "
                                   "AND survey_month = :m"), {"m": may25}).scalar()
        rec = conn.execute(text(
            "SELECT kind, rows, data_as_of, source LIKE '%, 171 areas' FROM refdata.ref_bls_load "
            "WHERE source LIKE 'BLS file %' ORDER BY id")).all()
        means = conn.execute(text("SELECT count(*) FROM refdata.ref_oews WHERE area_type = 'M' AND mean IS NOT NULL "
                                  "AND survey_month = :m"), {"m": may25}).scalar()
        left = len(bls_load.pending_areas(conn, may25))
    check(wrong, "d1392-file-verify",
          (sorted(p.name for p in files), fc.areas, states, kinds, fc.rows, fc.differences, fc.not_in_files),
          (["oesm25ma.zip", "oesm25st.zip"], 579, 51, {"metro": 393, "nonmetro": 135}, 9510, 0, [("N", "0000000")]))
    check(wrong, "d1392-file-loaded-metros", ([tuple(r) for r in rec], means), ([("oews", 2769, may25, True)], 295))
    check(wrong, "d1392-areas-left", left, 0)
    rows += 3

    out_path = Path("/tmp/qt-bls-d1392.json")
    try:
        with sync_engine.begin() as conn:
            checksum, _ = bls_load.export_file(conn, out_path)
        same = out_path.read_bytes() == data
    finally:
        out_path.unlink(missing_ok=True)
        bls_load.checksum_path(out_path).unlink(missing_ok=True)
    committed = bls_load.checksum_path(bls_load.DATA_FILE).read_text(encoding="utf-8").split()[0]
    check(wrong, "d1392-file-export-checksum", (same, checksum == committed), (True, True))
    rows += 1

    for w in wrong:
        print(w)
    print(f"BLS packed calls, the data file and the published May files (D-1385, D-1386, D-1392): {rows} rows, "
          f"{'all right' if not wrong else f'{len(wrong)} wrong'} (171 metros 240 -> 233 calls; full survey "
          f"{len(everything)} areas 790 calls; file {len(data)} bytes, {sum(t['count'] for t in body['tables'])} rows; "
          f"May 2025 files: {fc.rows} rows equal, {left} areas left, sha256 {committed[:12]})")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(main())

"""D-1396 (NOAA normals from NCEI's by-station archive), a quantity-table row set. Reads the archive the founder
placed (the api's read-only mount) and the bench's `wx` tables; writes nothing (every session is rolled back) and makes
no NOAA request (the HTTP client is replaced before anything runs). `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-noaa-d1396.py"

Worked by hand (the 2026-11-27 load):
    the archive: 15,616 station files, all read; its sha256 is the one the load row records.
    verify: every stored station (9,248) equals the archive, 12 months x 7 columns = 776,832 cells, 0 differ; the 43
        stored before the load (34 seed, 9 ads) among them, 3,612 cells.
    stored: 9,248 stations with 12 months each (110,976 rows), 0 `wx.station` stations without months; sources
        file 9,205, seed 34, ads 9; one load row: 9,205 stations, 110,460 rows, 43 verified, 3,612 cells.
    no fallback: a file station (USW00014922), a seeded station (USW00012960) and an ads station (US1OHFR0003) read with fetch (as the weather route does), and
        the nearest frost and snow series for a Houston point (29.98, -95.36): 12 months each, 0 ADS calls.
    the fallback still works: a station with no stored months reads through `fetch_ads` once (a stub answer, no
        request), the call counted 1 and logged.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

ARCHIVE = (
    "/test-data-local/weather/noaa/"
    "us-climate-normals_1991-2020_v1.0.1_monthly_multivariate_by-station_c20230404.tar.gz"
)


def check(wrong: list[str], rid: str, got: object, want: object) -> None:
    if got != want:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


def main() -> int:
    import asyncio
    from pathlib import Path
    from typing import Any

    import httpx
    from sqlalchemy import text

    from app.database import SessionFactory, sync_engine
    from app.features.weather import normals_file, service

    class NoRequest(httpx.AsyncClient):
        def __init__(self, *_a: object, **_k: object) -> None:
            raise AssertionError("a NOAA request was attempted")

    real_client = service.httpx.AsyncClient
    service.httpx.AsyncClient = NoRequest  # type: ignore[misc]

    wrong: list[str] = []
    rows = 0
    archive = normals_file.read_archive(Path(ARCHIVE))
    check(wrong, "d1396-archive-members", (archive.members, archive.skipped), (15616, 0))
    rows += 1
    with sync_engine.connect() as conn:
        have = normals_file.stored(conn)
        v = normals_file.verify(have, archive)
        check(wrong, "d1396-verify-0-differ", (v.differences, v.examples), (0, []))
        check(wrong, "d1396-verify-count", (v.stations, v.cells), (9248, 9248 * 12 * 7))
        before = {s for s, in conn.execute(text(
            "SELECT station_id FROM wx.station WHERE normals_source IN ('seed', 'ads')"))}
        v43 = normals_file.verify({s: have[s] for s in before if s in have}, archive)
        check(wrong, "d1396-verify-api-stations", (v43.stations, v43.cells, v43.differences), (43, 3612, 0))
        rows += 3
        n = conn.execute(text(
            "SELECT count(*), count(DISTINCT station_id) FROM wx.normals")).one()
        check(wrong, "d1396-stored-rows", tuple(n), (110976, 9248))
        left = conn.scalar(text(
            "SELECT count(*) FROM wx.station s WHERE (SELECT count(*) FROM wx.normals n"
            " WHERE n.station_id = s.station_id) <> 12"))
        check(wrong, "d1396-stations-without-months", left, 0)
        src = dict(conn.execute(text(
            "SELECT coalesce(normals_source, 'none'), count(*) FROM wx.station GROUP BY 1")).all())
        check(wrong, "d1396-sources", src, {"file": 9205, "seed": 34, "ads": 9})
        loads = conn.execute(text(
            "SELECT sha256, stations, month_rows, verified_stations, verified_cells FROM wx.normals_load")).all()
        check(wrong, "d1396-load-record", [tuple(r) for r in loads], [(archive.sha256, 9205, 110460, 43, 3612)])
        rows += 4

    async def reads() -> tuple[list[Any], int]:
        out: list[Any] = []
        start = service.ADS_CALLS["calls"]
        async with SessionFactory() as session:
            try:
                for sid in ("USW00014922", "USW00012960", "US1OHFR0003"):
                    months = await service.normals(session, sid, True)
                    out.append(len(months) if months else None)
                for flag in ("has_frost", "has_snow"):
                    s = await service._series(session, 29.98, -95.36, flag, True)
                    out.append(len(s["months"]) if s else None)
            finally:
                await session.rollback()
        return out, service.ADS_CALLS["calls"] - start

    got, calls = asyncio.run(reads())
    check(wrong, "d1396-no-fallback-reads", got, [12, 12, 12, 12, 12])
    check(wrong, "d1396-fallback-not-called", calls, 0)
    rows += 2

    # The fallback path, with no stored months and a stub answer: one counted call, no request.
    class Stub:
        def __init__(self, *_a: object, **_k: object) -> None:
            pass

        async def __aenter__(self) -> "Stub":
            return self

        async def __aexit__(self, *_a: object) -> None:
            return None

        async def get(self, _url: str, params: dict[str, str]) -> Any:
            months = [
                {"DATE": f"{m:02d}", "MLY-PRCP-NORMAL": "1.00", "MLY-PRCP-AVGNDS-GE010HI": "5.0",
                 "MLY-PRCP-AVGNDS-GE050HI": "2.0", "MLY-PRCP-AVGNDS-GE100HI": "1.0"}
                for m in range(1, 13)
            ]

            class R:
                def raise_for_status(self) -> None:
                    return None

                def json(self) -> list[dict[str, str]]:
                    return months

            return R()

    service.httpx.AsyncClient = Stub  # type: ignore[misc,assignment]
    start = service.ADS_CALLS["calls"]
    fetched = asyncio.run(service.fetch_ads("ZZZ00000001"))
    check(wrong, "d1396-fallback-stub", (len(fetched), fetched[0]["ge050"], service.ADS_CALLS["calls"] - start),
          (12, 2.0, 1))
    rows += 1
    service.httpx.AsyncClient = real_client  # type: ignore[misc]

    for w in wrong:
        print(w)
    print(f"NOAA normals from the by-station archive (D-1396): {rows} rows, "
          f"{'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(main())

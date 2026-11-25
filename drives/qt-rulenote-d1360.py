"""D-1360 (item 2 of the 2026-11-28 night run), a quantity-table row set: which wage note a rate set's move owes (wage
rules 8's own "Pricing rule changed" note key, the founder's Q3/Q6), through the api's own function. Pure: nothing is read
from or written to the database. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-rulenote-d1360.py"

`rule_notes.wage_move(current, older)` (older: the project's earlier sets, newest first), worked by hand from
`WAGE_NOTES` (wages 7, wages_8 8). One note per move, under the first key the set before the move had not had (the
lowest rules N with before < N <= now); a re-save (same inputs, same rules) is skipped; other inputs end the walk:
    6 -> 8                         -> "wages"   (rules 7 and 8 in one note: never counted twice)
    none (null) -> 8               -> "wages"
    7 -> 8                         -> "wages_8"
    6 -> 7                         -> "wages"   (D-1350, unchanged)
    6 -> 8 -> 8 (Real bid A's chain, sets 534 / 679 / 680) -> "wages", before = the rules 6 set, moved at the first rules 8
                                      set (20:25:50); D-1350 compared 680 with 679 and owed nothing
    7 -> 8 -> 8                    -> "wages_8", before = the rules 7 set
    8 alone, 8 -> 8                -> nothing (no move)
    6 (other ZIP) -> 8             -> nothing (the inputs moved it)
    6 (other ZIP) -> 8 -> 8        -> nothing (the re-save is skipped, then other inputs end the walk)
    8 -> 7 (rules went down)       -> nothing
    6 -> 9                         -> "wages"   (the first key crossed, whatever later rules exist)
    no current set                 -> nothing
And the registry: `KNOWN` holds "wages_8" (the api records its arrival at a start with it and accepts its record).
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

from datetime import UTC, datetime
from types import SimpleNamespace


def check(wrong: list[str], rid: str, got: object, want: object) -> None:
    if got != want:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


def ws(rules: int | None, at: str, zip_code: str = "77571") -> SimpleNamespace:
    """A rate set with Real bid A's inputs (open shop, burdened, national average, no WD, no agreement)."""
    return SimpleNamespace(
        wage_rules=rules,
        created_at=datetime.fromisoformat(at).replace(tzinfo=UTC),
        zip=zip_code,
        county_fips="48201",
        project_type="commercial",
        wage_determination="open_shop",
        pricing_basis="burdened",
        basis="national_average",
        wd_import_id=None,
        union_agreement_id=None,
    )


def main() -> int:
    from app.features.estimate.rule_notes import KNOWN, WAGE_NOTES, wage_move

    wrong: list[str] = []
    rows = 0
    s534 = ws(6, "2026-11-12T06:20:34")
    s679 = ws(8, "2026-11-25T20:25:50")
    s680 = ws(8, "2026-11-25T20:27:59")
    s7 = ws(7, "2026-11-25T08:00:00")
    s7b = ws(7, "2026-11-25T09:00:00")
    s8 = ws(8, "2026-11-25T21:00:00")
    s8b = ws(8, "2026-11-25T21:30:00")
    other6 = ws(6, "2026-11-12T06:20:34", zip_code="45614")

    def key(current: object, older: list[object]) -> tuple[str, object, datetime] | None:
        return wage_move(current, older)  # type: ignore[arg-type]

    for rid, current, older, want in (
        ("d1360-move-6-to-8-wages", s8, [s534], ("wages", s534, s8.created_at)),
        ("d1360-move-null-to-8-wages", s8, [ws(None, "2026-10-13T17:16:59")], "wages"),
        ("d1360-move-7-to-8-wages8", s8, [s7], ("wages_8", s7, s8.created_at)),
        ("d1360-move-6-to-7-wages", s7, [s534], "wages"),
        ("d1360-real-bid-a-chain", s680, [s679, s534], ("wages", s534, s679.created_at)),
        ("d1360-move-7-8-8-wages8", s8b, [s8, s7b, s534], ("wages_8", s7b, s8.created_at)),
        ("d1360-8-alone-none", s8, [], None),
        ("d1360-8-8-none", s8b, [s8], None),
        ("d1360-other-inputs-none", s8, [other6], None),
        ("d1360-resave-then-other-inputs-none", s8b, [s8, other6], None),
        ("d1360-rules-down-none", s7b, [s8], None),
        ("d1360-move-6-to-9-first-key", ws(9, "2026-11-26T00:00:00"), [s534], "wages"),
        ("d1360-no-current-none", None, [s534], None),
    ):
        got = key(current, older)
        if isinstance(want, str):
            check(wrong, rid, got[0] if got else None, want)
        else:
            check(wrong, rid, got, want)
        rows += 1
    check(wrong, "d1360-wage-notes", WAGE_NOTES.get("wages_8"), 8)
    check(wrong, "d1360-known-wages8", "wages_8" in KNOWN and "wages" in KNOWN, True)
    rows += 2

    for w in wrong:
        print(w)
    print(f"rule notes (D-1360): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(main())

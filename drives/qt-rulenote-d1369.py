"""D-1369 (item 3 of the 2026-11-29 night run), a quantity-table row set: every wage note a rate set's moves owe is kept
through later moves until it is shown (the founder's Q6), through the api's own function. Pure: nothing is read from or
written to the database. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-rulenote-d1369.py"

`rule_notes.wage_move_chain(current, older)` (older: the project's earlier sets, newest first), worked by hand from
`WAGE_NOTES` (wages 7, wages_8 8, wages_9 9, wages_10 10). Runs of equal rules (a re-save is in its run), each step to a
newer run a move, ONE note per move under the lowest key it crosses; a step that crosses no key owes nothing and the walk
goes on; other inputs end it. Newest first, each (key, before, after, moved at):
    6 -> 8 -> 10, no open between      -> wages_9 (8 -> 10: 680 -> the new set), wages (6 -> 8: 534 -> 680, moved at
                                          679): the first note is still owed after the second move (D-1364's order case)
    6 -> 8 -> 9                        -> wages_9, wages
    6 -> 8 -> 9 -> 10                  -> wages_10, wages_9, wages (three moves, three keys, each once)
    Real bid A's stored chain, as read 2026-11-26 05:50 UTC (sets 237, 238 blank and direct; 257 blank; 270, 271 rules 4;
    316, 534 rules 6; 679, 680 rules 8, current), then Update rates (rules 10):
                                       -> wages_9 (680 -> new), wages (534 -> 680, moved at 679, 20:25:50); blank -> 4 and
                                          4 -> 6 cross no key; the direct sets end the walk
    the same chain, no Update rates    -> wages alone (D-1360's answer)
    6 -> 8 -> 8 -> 10 -> 10 (re-saves) -> wages_9 (before the newer rules 8 set, after the newest rules 10 set, moved at
                                          the first rules 10 set), wages (after the newer rules 8 set)
    6 (other ZIP) -> 8 -> 10           -> wages_9 alone (the other inputs end the walk)
    6 -> 7 -> 6 -> 7 (rules down, up)  -> wages once, the newest move's (a key is never owed twice)
    10 alone, 10 -> 10                 -> nothing
And `wage_move` (D-1360's drive) is the newest move: 6 -> 8 -> 10 gives (wages_9, 680, the new set's time). The note's
pass reads each set's W3 subtype rates as the labour sync does (`_subtypes`: a subtype with no rate is left out).
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace


def check(wrong: list[str], rid: str, got: object, want: object) -> None:
    if got != want:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


def ws(rules: int | None, at: str, zip_code: str = "77571", basis: str = "burdened", sid: int = 0) -> SimpleNamespace:
    """A rate set with Real bid A's inputs (open shop, national average, no WD, no agreement)."""
    return SimpleNamespace(
        id=sid,
        wage_rules=rules,
        created_at=datetime.fromisoformat(at).replace(tzinfo=UTC),
        zip=zip_code,
        county_fips="48201",
        project_type="commercial",
        wage_determination="open_shop",
        pricing_basis=basis,
        basis="national_average",
        wd_import_id=None,
        union_agreement_id=None,
        subtype_rates=None,
    )


def main() -> int:
    from app.features.estimate.rule_notes import _subtypes, wage_move, wage_move_chain

    wrong: list[str] = []
    rows = 0
    s237 = ws(None, "2026-11-05T09:57:17", basis="direct", sid=237)
    s238 = ws(None, "2026-11-05T09:57:31", basis="direct", sid=238)
    s257 = ws(None, "2026-11-06T08:07:15", sid=257)
    s270 = ws(4, "2026-11-07T13:24:58", sid=270)
    s271 = ws(4, "2026-11-07T13:26:34", sid=271)
    s316 = ws(6, "2026-11-09T12:54:04", sid=316)
    s534 = ws(6, "2026-11-12T06:20:34", sid=534)
    s679 = ws(8, "2026-11-25T20:25:50", sid=679)
    s680 = ws(8, "2026-11-25T20:27:59", sid=680)
    new10 = ws(10, "2026-11-26T06:30:00", sid=900)
    new10b = ws(10, "2026-11-26T06:31:00", sid=901)
    new9 = ws(9, "2026-11-26T06:00:00", sid=902)
    real_a = [s680, s679, s534, s316, s271, s270, s257, s238, s237]

    def chain(current: object, older: list[object]) -> list[tuple[str, int, int, datetime]]:
        steps = wage_move_chain(current, older)  # type: ignore[arg-type]
        return [(s.key, s.before.id, s.after.id, s.moved_at) for s in steps]

    for rid, current, older, want in (
        (
            "d1369-6-8-10-both-owed",
            new10,
            [s680, s679, s534],
            [("wages_9", 680, 900, new10.created_at), ("wages", 534, 680, s679.created_at)],
        ),
        (
            "d1369-6-8-9-both-owed",
            new9,
            [s680, s679, s534],
            [("wages_9", 680, 902, new9.created_at), ("wages", 534, 680, s679.created_at)],
        ),
        (
            "d1369-6-8-9-10-three",
            new10,
            [new9, s680, s679, s534],
            [
                ("wages_10", 902, 900, new10.created_at),
                ("wages_9", 680, 902, new9.created_at),
                ("wages", 534, 680, s679.created_at),
            ],
        ),
        (
            "d1369-real-bid-a-update-rates-first",
            new10,
            real_a,
            [("wages_9", 680, 900, new10.created_at), ("wages", 534, 680, s679.created_at)],
        ),
        ("d1369-real-bid-a-stored", s680, real_a[1:], [("wages", 534, 680, s679.created_at)]),
        (
            "d1369-resaves-skipped",
            new10b,
            [new10, s680, s679, s534],
            [("wages_9", 680, 901, new10.created_at), ("wages", 534, 680, s679.created_at)],
        ),
        (
            "d1369-other-inputs-end",
            new10,
            [s680, s679, ws(6, "2026-11-12T06:20:34", zip_code="45614", sid=77)],
            [("wages_9", 680, 900, new10.created_at)],
        ),
        (
            "d1369-key-once",
            ws(7, "2026-11-26T04:00:00", sid=13),
            [ws(6, "2026-11-26T03:00:00", sid=12), ws(7, "2026-11-26T02:00:00", sid=11), ws(6, "2026-11-26T01:00:00", sid=10)],
            [("wages", 12, 13, datetime(2026, 11, 26, 4, tzinfo=UTC))],
        ),
        ("d1369-10-alone-none", new10, [], []),
        ("d1369-10-10-none", new10b, [new10], []),
        ("d1369-no-current-none", None, [s534], []),
    ):
        check(wrong, rid, chain(current, older), want)
        rows += 1

    got = wage_move(new10, [s680, s679, s534])  # type: ignore[arg-type]
    check(wrong, "d1369-wage-move-newest", (got[0], got[1].id, got[2]) if got else None, ("wages_9", 680, new10.created_at))
    rows += 1
    subs = ws(8, "2026-11-25T20:27:59")
    subs.subtype_rates = {"CC-11": {"excavator": {"rate": 48.29}, "dozer": {"rate": None}}, "CC-16": {"pipelayer": {"rate": "34.56"}}}
    check(wrong, "d1369-subtypes-read", _subtypes(subs), {"CC-11": {"excavator": Decimal("48.29")}, "CC-16": {"pipelayer": Decimal("34.56")}})  # type: ignore[arg-type]
    rows += 1

    for w in wrong:
        print(w)
    print(f"rule notes kept through moves (D-1369): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(main())

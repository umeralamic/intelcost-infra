"""D-1354 (item 3 of the 2026-11-27 night run), a quantity-table row set: the project's own work week, set beside "Work
starts" when it has no rate set (the founder's Q6), through the api's own functions. Pure: nothing is read from or written
to the database. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-workweek-d1354.py"

Which week rules (`weather/service.py:work_week`), worked by hand:
    a rate set at 6, the project's own 7       -> 6, "rate_set"  (the rate set always rules, D-1346)
    a rate set at 5, the project's own 7       -> 5, "rate_set"
    a rate set at 4 (its 1-7 overtime field)   -> 4, "rate_set"
    no rate set, the project's own 6           -> 6, "project"
    no rate set, the project's own 7           -> 7, "project"
    no rate set, never set                     -> 5, "default"   (as before D-1354)
    no rate set, a stored 3 (refused by the check; read defensively) -> 5, "default"
What the save refuses (`work_week_error`, a 422):
    5, 6, 7 and null (clears) without a rate set -> accepted; 4, 8, 0 -> "The work week is 5, 6 or 7 days.";
    anything while a rate set rules (even 6)     -> the rate set's message.
The first rate set's days a week (`first_set_days`):
    no set before, the project's own 6 -> 6 (saving rates keeps the week); no set before, never set -> 5;
    a set before at 7, the project's own 6 -> 7 (a later set carries the previous set's, D-961).
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)


def check(wrong: list[str], rid: str, got: object, want: object) -> None:
    if got != want:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


def main() -> int:
    from app.features.weather.service import (
        WORK_WEEK_ERROR,
        WORK_WEEK_RATE_SET,
        first_set_days,
        work_week,
        work_week_error,
    )

    wrong: list[str] = []
    rows = 0
    for rid, args, want in (
        ("d1354-week-rate-set-6-over-project-7", (6, 7), (6, "rate_set")),
        ("d1354-week-rate-set-5-over-project-7", (5, 7), (5, "rate_set")),
        ("d1354-week-rate-set-4", (4, None), (4, "rate_set")),
        ("d1354-week-project-6", (None, 6), (6, "project")),
        ("d1354-week-project-7", (None, 7), (7, "project")),
        ("d1354-week-default-5", (None, None), (5, "default")),
        ("d1354-week-project-3-not-read", (None, 3), (5, "default")),
    ):
        check(wrong, rid, work_week(*args), want)
        rows += 1
    for rid, args, want in (
        ("d1354-save-5", (5, False), None),
        ("d1354-save-6", (6, False), None),
        ("d1354-save-7", (7, False), None),
        ("d1354-save-null-clears", (None, False), None),
        ("d1354-save-4-refused", (4, False), WORK_WEEK_ERROR),
        ("d1354-save-8-refused", (8, False), WORK_WEEK_ERROR),
        ("d1354-save-0-refused", (0, False), WORK_WEEK_ERROR),
        ("d1354-save-with-rate-set-refused", (6, True), WORK_WEEK_RATE_SET),
    ):
        check(wrong, rid, work_week_error(*args), want)
        rows += 1
    for rid, args, want_days in (
        ("d1354-first-set-from-project-6", (None, 6), 6),
        ("d1354-first-set-default-5", (None, None), 5),
        ("d1354-later-set-carries-7", (7, 6), 7),
    ):
        check(wrong, rid, first_set_days(*args), want_days)
        rows += 1
    check(wrong, "d1354-error-words", WORK_WEEK_ERROR, "The work week is 5, 6 or 7 days.")
    rows += 1

    for w in wrong:
        print(w)
    print(f"work week (D-1354): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(main())

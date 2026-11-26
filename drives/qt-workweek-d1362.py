"""D-1362 (item 4 of the 2026-11-28 night run), a quantity-table row set: a 4 to 7 day work week, both beside "Work
starts" and on the rate set's own days a week (the founder's Q7 on the 11-27 report), through the api's own functions
and schemas. Pure: nothing is read from or written to the database. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-workweek-d1362.py"

Worked by hand:
    beside "Work starts" (`work_week_error`): 4 and 7 accepted; 3, 8 and 0 -> "The work week is 4, 5, 6 or 7 days.";
        4 while a rate set rules -> the rate set's message (D-1354, unchanged).
    which week rules (`work_week`): the project's own 4 -> 4, "project"; a rate set at 4 over the project's 7 -> 4;
        a rate set at 7 over the project's 4 -> 7; a project 8 (never stored: the check refuses it) -> 5, "default".
        A set saved before tonight reads 1 to 7 as it did (a stored 3 -> 3, "rate_set"; an 8 -> 5), so no saved set
        changes price.
    the first rate set (`first_set_days`): no set before, the project's own 4 -> 4.
    the rate set's own days a week (`OvertimeWrite`, the Overtime row's save): 4 and 7 accepted; 3 and 8 refused (422).
    the model's check (`ck_project_weather_work_days_per_week`, migration d1362b7e4f21): IN (4, 5, 6, 7).
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)


def check(wrong: list[str], rid: str, got: object, want: object) -> None:
    if got != want:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


def main() -> int:
    from pydantic import ValidationError
    from sqlalchemy import CheckConstraint

    from app.features.wage_calculator.schemas import OvertimeWrite
    from app.features.weather.models import ProjectWeather
    from app.features.weather.service import (
        WORK_WEEK_ERROR,
        WORK_WEEK_RATE_SET,
        WORK_WEEKS,
        first_set_days,
        work_week,
        work_week_error,
    )

    wrong: list[str] = []
    rows = 0
    for rid, args, want in (
        ("d1362-save-4", (4, False), None),
        ("d1362-save-7-bound", (7, False), None),
        ("d1362-save-3-refused", (3, False), WORK_WEEK_ERROR),
        ("d1362-save-8-refused", (8, False), WORK_WEEK_ERROR),
        ("d1362-save-0-refused", (0, False), WORK_WEEK_ERROR),
        ("d1362-save-4-with-rate-set-refused", (4, True), WORK_WEEK_RATE_SET),
    ):
        check(wrong, rid, work_week_error(*args), want)
        rows += 1
    for rid, args, want in (
        ("d1362-week-project-4", (None, 4), (4, "project")),
        ("d1362-week-rate-set-4-over-project-7", (4, 7), (4, "rate_set")),
        ("d1362-week-rate-set-7-over-project-4", (7, 4), (7, "rate_set")),
        ("d1362-week-project-8-not-read", (None, 8), (5, "default")),
        ("d1362-week-old-set-3-read-as-stored", (3, None), (3, "rate_set")),
        ("d1362-week-set-8-reads-5", (8, None), (5, "rate_set")),
    ):
        check(wrong, rid, work_week(*args), want)
        rows += 1
    check(wrong, "d1362-first-set-from-project-4", first_set_days(None, 4), 4)
    rows += 1
    for rid, days, ok in (
        ("d1362-overtime-4", 4, True),
        ("d1362-overtime-7-bound", 7, True),
        ("d1362-overtime-3-refused", 3, False),
        ("d1362-overtime-8-refused", 8, False),
    ):
        try:
            got = OvertimeWrite(days_per_week=days).days_per_week == days
        except ValidationError:
            got = False
        check(wrong, rid, got, ok)
        rows += 1
    check(wrong, "d1362-weeks", WORK_WEEKS, (4, 5, 6, 7))
    rows += 1
    check(wrong, "d1362-error-words", WORK_WEEK_ERROR, "The work week is 4, 5, 6 or 7 days.")
    rows += 1
    checks = {
        c.name: str(c.sqltext)
        for c in ProjectWeather.__table__.constraints
        if isinstance(c, CheckConstraint)
    }
    check(
        wrong,
        "d1362-model-check",
        checks.get("ck_project_weather_work_days_per_week"),
        "work_days_per_week IS NULL OR work_days_per_week IN (4, 5, 6, 7)",
    )
    rows += 1

    for w in wrong:
        print(w)
    print(f"work week 4 to 7 (D-1362): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(main())

"""D-1368 (item 2 of the 2026-11-29 night run), a quantity-table row set: wage rules 10, each worked by hand through
the api's own engine. Read only: nothing is saved, no SAM.gov call is made. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1368.py"

All on open shop, Pinal 85138, commercial, direct, bid 2026-11-25 (as the D-1359 drive). "Bare" is the same project
with no WD line at all (BLS alone, the minimum and the blend): its operator, truck driver and laborer bases. f24 is the
ECI factor from 2024-11-19 to the bid.
(a) The founder's Q1: a craft's own row drops a survey line that names one machine (or one truck type or laborer
    group) and prices on BLS.
    - "POWER EQUIPMENT OPERATOR: SCRAPER" (SUAZ2023-010, 11/19/2024, 60.00), the Pinal form: rules 10 the Equipment
      Operator row = bare's operator base, said "names only the scraper: not read for the equipment operator's own
      rate"; rules 9 = 60.00 x f24 (the line, over BLS and the national rate). The scraper on its own line = 60.00 x f24
      by both; the dozer = bare's; the excavator = bare's x 1.215 (no line of its own, the company default).
    - "TRUCK DRIVER: DUMP TRUCK" (60.00): rules 10 the Truck Driver row = bare's truck base; rules 9 = 60.00 x f24;
      the dump truck on its own line = 60.00 x f24 by both.
    - "LABORER: PIPELAYER" (50.00): rules 10 the Laborer row = bare's laborer base; rules 9 = 50.00 x f24.
    - A general line, "POWER EQUIPMENT OPERATOR" (60.00), names no machine: the row reads it by both (60.00 x f24).
    - The Utah shared line, "OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE" (SUUT2018-004, 05/07/2020, 45.00), names two
      machines: rules 10 = rules 9 (the row reads it; the backhoe and the excavator on it, no premium; the dozer bare's).
(b) The founder's Q2/Q3: a machine's premium is dropped only when its own survey line is used. The split pairs are the
    county's Heavy then Highway WD's (the class line, the machine's line, the WD), given by hand here.
    - The Yuma form: the governing WD has only the scraper line; the Highway pair for the excavator is its own line
      twice ("POWER EQUIPMENT OPERATOR: EXCAVATOR/TRACKHOE", SUAZ2023-027, 2024, 31.96). Rules 9: 0 %, the excavator =
      bare's. Rules 10: no split ("is the excavator's own line, not a class line"), the default +21.5 %: bare's x 1.215.
    - The Florida form: the governing WD's own excavator line "OPERATOR: TRACKHOE" is 2009 (SUFL2009-164, skipped); the
      Highway pair is "OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE" twice (SUFL2022-029, 06/27/2024, 20.00). Rules 9: the
      excavator = bare's; rules 10 = bare's x 1.215. The dozer's pair (that shared class line, "OPERATOR: BULLDOZER"
      20.89) is a real split: +4.45 % (20.89 / 20.00 - 1) by both.
    - A class line naming one machine: the dozer's pair ("POWER EQUIPMENT OPERATOR: EXCAVATOR/TRACKHOE" 30.00,
      "POWER EQUIPMENT OPERATOR: BULLDOZER" 33.00): rules 9 +10 %; rules 10 no split, the dozer's default 0 %: bare's.
    - A real pair ("POWER EQUIPMENT OPERATOR" 30.00, "POWER EQUIPMENT OPERATOR: EXCAVATOR" 33.00): +10 % by both.
The note (D-1360's pattern): "wages_10" is a wage note about rules 10 (`WAGE_NOTES`, `KNOWN`); a set moved 9 -> 10 owes
    "wages_10", 8 -> 10 owes "wages_9", 6 -> 10 owes "wages" (one note per move, the first key the set had not had).
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import asyncio
from datetime import UTC, date, datetime
from types import SimpleNamespace

BID = date(2026, 11, 25)
OP, TRUCK, LAB = "CC-11", "CC-31", "CC-16"


def line(rate_id: str, dated: str, title: str, base: float, fringe: float = 0.0) -> dict:
    return dict(classification=title, base=base, fringe=fringe, fringe_raw=f"{fringe:.2f}", fringe_type="$",
                rate_id=rate_id, rate_id_date=dated, rate_kind="survey", note=None)


def near(got: object, want: object, cents: float) -> bool:
    if isinstance(want, tuple) and isinstance(got, tuple) and len(got) == len(want):
        return all(near(g, w, cents) for g, w in zip(got, want, strict=True))
    if isinstance(want, float) and isinstance(got, (int, float)):
        return abs(round(got * 100) - round(want * 100)) <= round(cents * 100)
    return got == want


def check(wrong: list[str], rid: str, got: object, want: object, cents: float = 0.0) -> None:
    """Money to the cent; a row worked from a rounded base x a ratio within `cents` (the engine multiplies the
    unrounded base). Tuples element by element."""
    same = near(got, want, cents)
    if not same:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


def said(v: dict, words: str) -> bool:
    return any(words in s for s in v.get("source") or [])


async def main() -> int:
    from app.features.estimate.rule_notes import KNOWN, WAGE_NOTES, wage_move
    from app.features.wage_calculator import service
    from app.features.wage_calculator.schemas import RateRequest
    from app.wagecalc import w14
    from app.wagecalc.data import RefData
    from app.wagecalc.market import load_market
    from app.wagecalc.rates import PREMIUM_RULES, WAGE_RULES, Settings

    ref, market = RefData(), load_market()
    wrong: list[str] = []
    rows = 0
    # Rules 10's own number (D-1374 moved WAGE_RULES on to 11; every row below names its rules).
    check(wrong, "d1368-rules", (WAGE_RULES >= 10, PREMIUM_RULES), (True, 10))
    rows += 1

    def sl(rate_id: str, dated: date, title: str, base: float) -> w14.SurveyLine:
        return w14.SurveyLine(title=title, base=base, fringe=0.0, rate_id=rate_id, dated=dated)

    def os(rules: int, wd_rates: list, split: dict | None = None) -> dict:
        project = SimpleNamespace(id=-1, postal_code="85138", county=None, state=None, bid_due_date=BID,
                                  work_type="site_civil", project_type="commercial")
        body = RateRequest(project_type="commercial", wage_determination="open_shop", pricing_basis="direct",
                           zip="85138", county_fips="04021")
        wd = service._W14Wd("D-1368 drive WD" if wd_rates else None, None, split or {}, None)
        return service._compute(ref, project, body, Settings(), market, rules=rules, wd_rates=wd_rates, wd=wd).rs

    bare = os(10, [])
    b_op, b_truck, b_lab = (bare["crafts"][c]["base"] for c in (OP, TRUCK, LAB))
    f24 = market.escalate(date(2024, 11, 19), BID).factor
    f20 = market.escalate(date(2020, 5, 7), BID).factor

    # (a) The craft's own row.
    scraper = [line("SUAZ2023-010", "11/19/2024", "POWER EQUIPMENT OPERATOR: SCRAPER", 60.00)]
    s10, s9 = os(10, scraper), os(9, scraper)
    lvl = round(60.00 * f24, 2)
    check(wrong, "d1368-operator-scraper-line-r10", s10["crafts"][OP]["base"], b_op)
    check(wrong, "d1368-operator-scraper-line-said",
          said(s10["crafts"][OP], "names only the scraper: not read for the equipment operator's own rate."), True)
    check(wrong, "d1368-operator-scraper-line-r9", s9["crafts"][OP]["base"], lvl)
    check(wrong, "d1368-scraper-own-line", (s10["subtypes"][OP]["scraper"]["base"],
                                            s9["subtypes"][OP]["scraper"]["base"]), (lvl, lvl))
    check(wrong, "d1368-pinal-dozer", s10["subtypes"][OP]["dozer"]["base"], b_op)
    check(wrong, "d1368-pinal-excavator", s10["subtypes"][OP]["excavator"]["base"], round(b_op * 1.215, 2), 0.01)
    rows += 6
    dump = [line("SUAZ2023-010", "11/19/2024", "TRUCK DRIVER: DUMP TRUCK", 60.00)]
    d10, d9 = os(10, dump), os(9, dump)
    check(wrong, "d1368-truck-dump-line-r10", d10["crafts"][TRUCK]["base"], b_truck)
    check(wrong, "d1368-truck-dump-line-r9", d9["crafts"][TRUCK]["base"], lvl)
    check(wrong, "d1368-dump-own-line", d10["subtypes"][TRUCK]["dump"]["base"], lvl)
    rows += 3
    pipe = [line("SUAZ2023-012", "11/19/2024", "LABORER: PIPELAYER", 50.00)]
    p10, p9 = os(10, pipe), os(9, pipe)
    check(wrong, "d1368-laborer-pipelayer-line-r10", p10["crafts"][LAB]["base"], b_lab)
    check(wrong, "d1368-laborer-pipelayer-line-r9", p9["crafts"][LAB]["base"], round(50.00 * f24, 2))
    rows += 2
    general = [line("SUAZ2023-010", "11/19/2024", "POWER EQUIPMENT OPERATOR", 60.00)]
    check(wrong, "d1368-general-line", (os(10, general)["crafts"][OP]["base"], os(9, general)["crafts"][OP]["base"]),
          (lvl, lvl))
    rows += 1
    shared = [line("SUUT2018-004", "05/07/2020", "OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE", 45.00)]
    u10, u9 = os(10, shared), os(9, shared)
    cls = u10["crafts"][OP]["base"]
    check(wrong, "d1368-shared-class", (cls, u9["crafts"][OP]["base"]), (round(45.00 * f20, 2), cls))
    check(wrong, "d1368-shared-backhoe-excavator", (u10["subtypes"][OP]["backhoe"]["base"],
                                                    u10["subtypes"][OP]["excavator"]["base"]), (cls, cls))
    check(wrong, "d1368-shared-dozer", u10["subtypes"][OP]["dozer"]["base"], b_op)
    rows += 3

    # (b) The premium.
    yuma_line = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR: EXCAVATOR/TRACKHOE", 31.96)
    yuma = {OP: {"excavator": [(yuma_line, yuma_line, "AZ20260050 (Highway)")]}}
    y10, y9 = os(10, scraper, yuma), os(9, scraper, yuma)
    check(wrong, "d1368-yuma-excavator-r10", y10["subtypes"][OP]["excavator"]["base"], round(b_op * 1.215, 2), 0.01)
    check(wrong, "d1368-yuma-excavator-said",
          said(y10["subtypes"][OP]["excavator"], "is the excavator's own line, not a class line: no split."), True)
    check(wrong, "d1368-yuma-excavator-r9", y9["subtypes"][OP]["excavator"]["base"], b_op)
    rows += 3
    fl_old = [line("SUFL2009-164", "06/24/2009", "OPERATOR: TRACKHOE", 20.92)]
    fl_cls = sl("SUFL2022-029", date(2024, 6, 27), "OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE", 20.00)
    fl_doz = sl("SUFL2022-029", date(2024, 6, 27), "OPERATOR: BULLDOZER", 20.89)
    fl = {OP: {"excavator": [(fl_cls, fl_cls, "FL20260260 (Highway)")],
               "dozer": [(fl_cls, fl_doz, "FL20260260 (Highway)")]}}
    g10, g9 = os(10, fl_old, fl), os(9, fl_old, fl)
    check(wrong, "d1368-florida-excavator-r10", g10["subtypes"][OP]["excavator"]["base"], round(b_op * 1.215, 2), 0.01)
    check(wrong, "d1368-florida-excavator-r9", g9["subtypes"][OP]["excavator"]["base"], b_op)
    check(wrong, "d1368-florida-dozer-split", (g10["subtypes"][OP]["dozer"]["base"], g9["subtypes"][OP]["dozer"]["base"]),
          (round(b_op * (20.89 / 20.00), 2), round(b_op * (20.89 / 20.00), 2)), 0.01)
    rows += 3
    one_cls = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR: EXCAVATOR/TRACKHOE", 30.00)
    one_doz = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR: BULLDOZER", 33.00)
    one = {OP: {"dozer": [(one_cls, one_doz, "Highway")]}}
    check(wrong, "d1368-one-machine-class-pair",
          (os(10, [], one)["subtypes"][OP]["dozer"]["base"], os(9, [], one)["subtypes"][OP]["dozer"]["base"]),
          (b_op, round(b_op * 1.10, 2)), 0.01)
    rows += 1
    real_cls = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR", 30.00)
    real_exc = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR: EXCAVATOR", 33.00)
    real = {OP: {"excavator": [(real_cls, real_exc, "Highway")]}}
    check(wrong, "d1368-real-pair",
          (os(10, [], real)["subtypes"][OP]["excavator"]["base"], os(9, [], real)["subtypes"][OP]["excavator"]["base"]),
          (round(b_op * 1.10, 2), round(b_op * 1.10, 2)), 0.01)
    rows += 1

    # The note: "wages_10" (D-1360's table), one note per move.
    def ws(rules: int, at: str) -> SimpleNamespace:
        return SimpleNamespace(wage_rules=rules, created_at=datetime.fromisoformat(at).replace(tzinfo=UTC),
                               zip="77571", county_fips="48201", project_type="commercial",
                               wage_determination="open_shop", pricing_basis="burdened", basis="national_average",
                               wd_import_id=None, union_agreement_id=None)

    check(wrong, "d1368-note-key", (WAGE_NOTES.get("wages_10"), "wages_10" in KNOWN), (10, True))
    s10n = ws(10, "2026-11-26T06:00:00")
    for rid, before, want in (("9-to-10", 9, "wages_10"), ("8-to-10", 8, "wages_9"), ("6-to-10", 6, "wages")):
        got = wage_move(s10n, [ws(before, "2026-11-25T08:00:00")])  # type: ignore[arg-type]
        check(wrong, f"d1368-note-move-{rid}", got[0] if got else None, want)
    rows += 4

    for w in wrong:
        print(w)
    print(f"wage rules 10 (D-1368): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}"
          f" (f24 {f24:.5f}; bare operator {b_op:.2f}, truck {b_truck:.2f}, laborer {b_lab:.2f})")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

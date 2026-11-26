"""D-1374 (item 2 of the 2026-11-30 night run), a quantity-table row set: wage rules 11, each worked by hand through
the api's own engine. Read only: nothing is saved, no SAM.gov call is made. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1374.py"

All on open shop, Pinal 85138, commercial, direct, bid 2026-11-25 (as the D-1359 and D-1368 drives). "Bare" is the
same project with no WD line at all (BLS alone, the minimum and the blend): its operator, truck driver and laborer
bases. f20 and f24 are the ECI factors from 2020-05-07 and 2024-11-19 to the bid.
(a) The founder's D-1371 Q1: a craft's own row drops ANY survey line that names machines (truck types, laborer groups),
    one or several, and prices on BLS.
    - The Utah shared line, "OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE" (SUUT2018-004, 05/07/2020, 45.00): rules 11 the
      Equipment Operator row = bare's, said "names the backhoe and the excavator: not read for the equipment
      operator's own rate."; rules 10 = 45.00 x f20 (the row read it). The backhoe and the excavator read it as their
      own line by both, no premium: 45.00 x f20 (D-1365, "Utah's shared line stays (no premium there)"). The dozer
      (not named) = bare's by both.
    - "TRUCK DRIVER: DUMP, WATER TRUCK" (60.00): rules 11 the Truck Driver row = bare's; rules 10 = 60.00 x f24;
      the dump and water trucks on it = 60.00 x f24 by 11.
    - "LABORER: PIPELAYER, FLAGGER" (50.00): rules 11 the Laborer row = bare's; rules 10 = 50.00 x f24.
    - One machine's line ("POWER EQUIPMENT OPERATOR: SCRAPER", 60.00): dropped by 11 as by 10, rules 10's words
      ("names only the scraper"); the scraper on it = 60.00 x f24.
    - A general line, "POWER EQUIPMENT OPERATOR" (60.00), names no machine: the row reads it by 11 (60.00 x f24).
(b) The founder's D-1371 Q2: everything else in rules 10 stays. The split pairs, given by hand:
    - The Florida form: the dozer's pair ("OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE" 20.00 as the class line,
      "OPERATOR: BULLDOZER" 20.89) is a real pair by 11: +4.45 % over the class level (now bare's). The excavator's
      self pair is no split: bare's x 1.215.
    - The Yuma form (the excavator's own line twice): no split by 11, bare's x 1.215.
    - A real pair ("POWER EQUIPMENT OPERATOR" 30.00, "... : EXCAVATOR" 33.00): +10 % by 11.
The note (D-1360's pattern): "wages_11" is a wage note about rules 11 (`WAGE_NOTES`, `KNOWN`); a set moved 10 -> 11 owes
    "wages_11", 9 -> 11 "wages_10", 8 -> 11 "wages_9", 6 -> 11 "wages" (one note per move, the first key not had).
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
    if not near(got, want, cents):
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
    from app.wagecalc.rates import MACHINE_LINE_RULES, WAGE_RULES, Settings

    ref, market = RefData(), load_market()
    wrong: list[str] = []
    rows = 0
    check(wrong, "d1374-rules", (WAGE_RULES >= 11, MACHINE_LINE_RULES), (True, 11))
    rows += 1

    def sl(rate_id: str, dated: date, title: str, base: float) -> w14.SurveyLine:
        return w14.SurveyLine(title=title, base=base, fringe=0.0, rate_id=rate_id, dated=dated)

    def os(rules: int, wd_rates: list, split: dict | None = None) -> dict:
        project = SimpleNamespace(id=-1, postal_code="85138", county=None, state=None, bid_due_date=BID,
                                  work_type="site_civil", project_type="commercial")
        body = RateRequest(project_type="commercial", wage_determination="open_shop", pricing_basis="direct",
                           zip="85138", county_fips="04021")
        wd = service._W14Wd("D-1374 drive WD" if wd_rates else None, None, split or {}, None)
        return service._compute(ref, project, body, Settings(), market, rules=rules, wd_rates=wd_rates, wd=wd).rs

    bare = os(11, [])
    b_op, b_truck, b_lab = (bare["crafts"][c]["base"] for c in (OP, TRUCK, LAB))
    f24 = market.escalate(date(2024, 11, 19), BID).factor
    f20 = market.escalate(date(2020, 5, 7), BID).factor
    l20, l24 = round(45.00 * f20, 2), round(60.00 * f24, 2)

    # (a) The craft's own row drops a line naming several machines.
    shared = [line("SUUT2018-004", "05/07/2020", "OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE", 45.00)]
    u11, u10 = os(11, shared), os(10, shared)
    check(wrong, "d1374-utah-operator-r11", u11["crafts"][OP]["base"], b_op)
    check(wrong, "d1374-utah-operator-said",
          said(u11["crafts"][OP], "names the backhoe and the excavator: not read for the equipment operator's own rate."),
          True)
    check(wrong, "d1374-utah-operator-r10", u10["crafts"][OP]["base"], l20)
    check(wrong, "d1374-utah-backhoe-excavator-r11", (u11["subtypes"][OP]["backhoe"]["base"],
                                                      u11["subtypes"][OP]["excavator"]["base"]), (l20, l20))
    check(wrong, "d1374-utah-backhoe-excavator-r10", (u10["subtypes"][OP]["backhoe"]["base"],
                                                      u10["subtypes"][OP]["excavator"]["base"]), (l20, l20))
    check(wrong, "d1374-utah-dozer", (u11["subtypes"][OP]["dozer"]["base"], u10["subtypes"][OP]["dozer"]["base"]),
          (b_op, b_op))
    rows += 6
    trucks = [line("SUAZ2023-010", "11/19/2024", "TRUCK DRIVER: DUMP, WATER TRUCK", 60.00)]
    t11, t10 = os(11, trucks), os(10, trucks)
    check(wrong, "d1374-truck-row-r11", t11["crafts"][TRUCK]["base"], b_truck)
    check(wrong, "d1374-truck-row-r10", t10["crafts"][TRUCK]["base"], l24)
    check(wrong, "d1374-dump-water-own-line", (t11["subtypes"][TRUCK]["dump"]["base"],
                                               t11["subtypes"][TRUCK]["water"]["base"]), (l24, l24))
    rows += 3
    labs = [line("SUAZ2023-012", "11/19/2024", "LABORER: PIPELAYER, FLAGGER", 50.00)]
    a11, a10 = os(11, labs), os(10, labs)
    check(wrong, "d1374-laborer-row-r11", a11["crafts"][LAB]["base"], b_lab)
    check(wrong, "d1374-laborer-row-r10", a10["crafts"][LAB]["base"], round(50.00 * f24, 2))
    rows += 2
    scraper = [line("SUAZ2023-010", "11/19/2024", "POWER EQUIPMENT OPERATOR: SCRAPER", 60.00)]
    s11 = os(11, scraper)
    check(wrong, "d1374-one-machine-r11", (s11["crafts"][OP]["base"], s11["subtypes"][OP]["scraper"]["base"]),
          (b_op, l24))
    check(wrong, "d1374-one-machine-said",
          said(s11["crafts"][OP], "names only the scraper: not read for the equipment operator's own rate."), True)
    general = [line("SUAZ2023-010", "11/19/2024", "POWER EQUIPMENT OPERATOR", 60.00)]
    check(wrong, "d1374-general-line-r11", os(11, general)["crafts"][OP]["base"], l24)
    rows += 3

    # (b) The split pairs, as rules 10.
    fl_old = [line("SUFL2009-164", "06/24/2009", "OPERATOR: TRACKHOE", 20.92)]
    fl_cls = sl("SUFL2022-029", date(2024, 6, 27), "OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE", 20.00)
    fl_doz = sl("SUFL2022-029", date(2024, 6, 27), "OPERATOR: BULLDOZER", 20.89)
    fl = {OP: {"excavator": [(fl_cls, fl_cls, "FL20260260 (Highway)")],
               "dozer": [(fl_cls, fl_doz, "FL20260260 (Highway)")]}}
    g11 = os(11, fl_old, fl)
    check(wrong, "d1374-florida-dozer-real-pair", g11["subtypes"][OP]["dozer"]["base"],
          round(b_op * (20.89 / 20.00), 2), 0.01)
    check(wrong, "d1374-florida-excavator", g11["subtypes"][OP]["excavator"]["base"], round(b_op * 1.215, 2), 0.01)
    yuma_line = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR: EXCAVATOR/TRACKHOE", 31.96)
    yuma = {OP: {"excavator": [(yuma_line, yuma_line, "AZ20260050 (Highway)")]}}
    check(wrong, "d1374-yuma-excavator", os(11, scraper, yuma)["subtypes"][OP]["excavator"]["base"],
          round(b_op * 1.215, 2), 0.01)
    real_cls = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR", 30.00)
    real_exc = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR: EXCAVATOR", 33.00)
    real = {OP: {"excavator": [(real_cls, real_exc, "Highway")]}}
    check(wrong, "d1374-real-pair", os(11, [], real)["subtypes"][OP]["excavator"]["base"], round(b_op * 1.10, 2), 0.01)
    rows += 4

    # The note: "wages_11", one note per move.
    def ws(rules: int, at: str) -> SimpleNamespace:
        return SimpleNamespace(wage_rules=rules, created_at=datetime.fromisoformat(at).replace(tzinfo=UTC),
                               zip="77571", county_fips="48201", project_type="commercial",
                               wage_determination="open_shop", pricing_basis="burdened", basis="national_average",
                               wd_import_id=None, union_agreement_id=None)

    check(wrong, "d1374-note-key", (WAGE_NOTES.get("wages_11"), "wages_11" in KNOWN), (11, True))
    s11n = ws(11, "2026-11-26T16:00:00")
    for rid, before, want in (("10-to-11", 10, "wages_11"), ("9-to-11", 9, "wages_10"), ("8-to-11", 8, "wages_9"),
                              ("6-to-11", 6, "wages")):
        got = wage_move(s11n, [ws(before, "2026-11-26T08:00:00")])  # type: ignore[arg-type]
        check(wrong, f"d1374-note-move-{rid}", got[0] if got else None, want)
    rows += 5

    for w in wrong:
        print(w)
    print(f"wage rules 11 (D-1374): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}"
          f" (f20 {f20:.5f}, f24 {f24:.5f}; bare operator {b_op:.2f}, truck {b_truck:.2f}, laborer {b_lab:.2f})")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

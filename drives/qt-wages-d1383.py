"""D-1383 (item 3 of the 2026-12-01 night run), a quantity-table row set: wage rules 13, each worked by hand through
the api's own engine. Read only: nothing is saved, no SAM.gov call is made. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1383.py"

All on open shop, commercial, direct, bid 2026-11-26 (D-1374's probe date). "Bare" is the same project with no WD line at
all (BLS alone, the minimum and the blend): its Equipment Operator base, the class level.
The founder's D-1380 Q4: a split pair whose class line names several machines is no split.
1. `WAGE_RULES >= 13`, `SHARED_PAIR_RULES == 13`.
2. Florida's Highway pair, by hand ("OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE" 20.00 as the class line, "OPERATOR:
   BULLDOZER" 20.89, survey 2024-06-27), on Miami-Dade 33131: by rules 12 a real pair, the dozer at bare x 20.89/20.00
   (+4.45 %); by rules 13 no split, the dozer at bare (the class level), said "names the backhoe and the excavator, not
   a class line: no split."; the class level itself the same by 12 and 13. The Miami dozer's class level at this date:
   $29.01, the Equipment Operator's, as the founder's Q4 named it.
3. The same pair with a company default dozer premium of 5 %: by 13 the default, bare x 1.05.
4. Unaffected by 13: a single-machine class line ("POWER EQUIPMENT OPERATOR: SCRAPER" 30.00 against "... : EXCAVATOR"
   33.00) is no split by 12 and 13 (rules 10's words "names only the scraper"), the excavator at the company default
   bare x 1.215; a real pair ("POWER EQUIPMENT OPERATOR" 30.00 against "... : EXCAVATOR" 33.00) is split by 13,
   bare x 1.10; the excavator's self pair (its own line twice) no split, bare x 1.215.
5. The note: "wages_13" is a wage note about rules 13 (`WAGE_NOTES`, `KNOWN`); a set moved 12 -> 13 owes "wages_13",
   11 -> 13 "wages_12", 6 -> 13 "wages" (one note per move, the lowest key crossed); filed by its cause
   (`_filed_under`): a move 11 -> 13 whose figures only rules 13 changed is "wages_13", only rules 12 "wages_12", both
   the lowest key; 6 -> 13 changed only by 13 "wages_13", changed before 11 "wages".
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import asyncio
from datetime import UTC, date, datetime
from types import SimpleNamespace

BID = date(2026, 11, 26)
OP = "CC-11"
MIAMI = ("33131", "12086")


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
    from app.features.estimate import rule_notes
    from app.features.estimate.rule_notes import KNOWN, WAGE_NOTES, wage_move, wage_move_chain
    from app.features.wage_calculator import service
    from app.features.wage_calculator.schemas import RateRequest
    from app.wagecalc import w14
    from app.wagecalc.data import RefData
    from app.wagecalc.market import load_market
    from app.wagecalc.rates import SHARED_PAIR_RULES, WAGE_RULES, Settings

    ref, market = RefData(), load_market()
    wrong: list[str] = []
    rows = 0
    # 1
    check(wrong, "d1383-rules", (WAGE_RULES >= 13, SHARED_PAIR_RULES), (True, 13))
    rows += 1

    def sl(rate_id: str, dated: date, title: str, base: float) -> w14.SurveyLine:
        return w14.SurveyLine(title=title, base=base, fringe=0.0, rate_id=rate_id, dated=dated)

    def os(rules: int, wd_rates: list, split: dict | None = None, where: tuple[str, str] = ("85138", "04021"),
           settings: Settings | None = None) -> dict:
        project = SimpleNamespace(id=-1, postal_code=where[0], county=None, state=None, bid_due_date=BID,
                                  work_type="site_civil", project_type="commercial")
        body = RateRequest(project_type="commercial", wage_determination="open_shop", pricing_basis="direct",
                           zip=where[0], county_fips=where[1])
        wd = service._W14Wd("D-1383 drive WD" if wd_rates else None, None, split or {}, None)
        return service._compute(ref, project, body, settings or Settings(), market, rules=rules, wd_rates=wd_rates,
                                wd=wd).rs

    # 2 Florida's Highway pair on Miami-Dade.
    fl_old = [line("SUFL2009-164", "06/24/2009", "OPERATOR: TRACKHOE", 20.92)]
    fl_cls = sl("SUFL2022-029", date(2024, 6, 27), "OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE", 20.00)
    fl_doz = sl("SUFL2022-029", date(2024, 6, 27), "OPERATOR: BULLDOZER", 20.89)
    fl = {OP: {"excavator": [(fl_cls, fl_cls, "FL20260260 (Highway)")],
               "dozer": [(fl_cls, fl_doz, "FL20260260 (Highway)")]}}
    bare12, bare13 = os(12, [], where=MIAMI), os(13, [], where=MIAMI)
    b12, b13 = bare12["crafts"][OP]["base"], bare13["crafts"][OP]["base"]
    m12, m13 = os(12, fl_old, fl, MIAMI), os(13, fl_old, fl, MIAMI)
    check(wrong, "d1383-miami-class-level-12-13", (m12["crafts"][OP]["base"], m13["crafts"][OP]["base"], b12), (b13, b13, b13))
    check(wrong, "d1383-miami-dozer-r12-real-pair", m12["subtypes"][OP]["dozer"]["base"], round(b12 * (20.89 / 20.00), 2),
          0.01)
    check(wrong, "d1383-miami-dozer-r13-class-level", m13["subtypes"][OP]["dozer"]["base"], b13)
    check(wrong, "d1383-miami-dozer-r13-said",
          said(m13["subtypes"][OP]["dozer"], "names the backhoe and the excavator, not a class line: no split."), True)
    check(wrong, "d1383-miami-dozer-29.01", m13["subtypes"][OP]["dozer"]["base"], 29.01)
    check(wrong, "d1383-miami-excavator-self-pair", m13["subtypes"][OP]["excavator"]["base"], round(b13 * 1.215, 2), 0.01)
    rows += 6

    # 3 A company default dozer premium.
    five = Settings(policy=w14.Policy(split_premiums={"excavator": 0.215, "dozer": 0.05}))
    d13 = os(13, fl_old, fl, MIAMI, five)
    check(wrong, "d1383-miami-dozer-r13-company-default", d13["subtypes"][OP]["dozer"]["base"], round(b13 * 1.05, 2),
          0.01)
    rows += 1

    # 4 Pairs rules 13 leaves as they were (Pinal 85138).
    bare = os(13, [])
    b_op = bare["crafts"][OP]["base"]
    scr = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR: SCRAPER", 30.00)
    exc = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR: EXCAVATOR", 33.00)
    one = {OP: {"excavator": [(scr, exc, "Highway")]}}
    o12, o13 = os(12, [], one), os(13, [], one)
    check(wrong, "d1383-one-machine-class-line-no-split",
          (o12["subtypes"][OP]["excavator"]["base"], o13["subtypes"][OP]["excavator"]["base"]),
          (round(b_op * 1.215, 2), round(b_op * 1.215, 2)), 0.01)
    check(wrong, "d1383-one-machine-said",
          said(o13["subtypes"][OP]["excavator"], "names only the scraper, not a class line: no split."), True)
    gen = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR", 30.00)
    real = {OP: {"excavator": [(gen, exc, "Highway")]}}
    check(wrong, "d1383-real-pair-still-split", os(13, [], real)["subtypes"][OP]["excavator"]["base"],
          round(b_op * 1.10, 2), 0.01)
    yuma_line = sl("SUAZ2023-027", date(2024, 11, 19), "POWER EQUIPMENT OPERATOR: EXCAVATOR/TRACKHOE", 31.96)
    yuma = {OP: {"excavator": [(yuma_line, yuma_line, "AZ20260050 (Highway)")]}}
    check(wrong, "d1383-self-pair-no-split", os(13, [], yuma)["subtypes"][OP]["excavator"]["base"],
          round(b_op * 1.215, 2), 0.01)
    rows += 4

    # 5 The note.
    def ws(rules: int, at: str) -> SimpleNamespace:
        return SimpleNamespace(wage_rules=rules, created_at=datetime.fromisoformat(at).replace(tzinfo=UTC),
                               zip="33131", county_fips="12086", project_type="commercial",
                               wage_determination="open_shop", pricing_basis="burdened", basis="national_average",
                               wd_import_id=None, union_agreement_id=None)

    check(wrong, "d1383-note-key", (WAGE_NOTES.get("wages_13"), "wages_13" in KNOWN), (13, True))
    s13 = ws(13, "2026-11-27T02:00:00")
    for rid, before, want in (("12-to-13", 12, "wages_13"), ("11-to-13", 11, "wages_12"), ("6-to-13", 6, "wages")):
        got = wage_move(s13, [ws(before, "2026-11-26T08:00:00")])  # type: ignore[arg-type]
        check(wrong, f"d1383-note-move-{rid}", got[0] if got else None, want)
    a, b, c = ({"CC-11": 1}, {}), ({"CC-11": 1}, {"CC-11": {"dozer": 2}}), ({"CC-11": 3}, {"CC-11": {"dozer": 2}})
    step11 = wage_move_chain(s13, [ws(11, "2026-11-26T08:00:00")])[0]  # type: ignore[arg-type]
    check(wrong, "d1383-cause-11-to-13",
          (rule_notes._filed_under(step11, [(11, a), (12, a), (13, b)]),
           rule_notes._filed_under(step11, [(11, a), (12, b), (13, b)]),
           rule_notes._filed_under(step11, [(11, a), (12, b), (13, c)]),
           rule_notes._filed_under(step11, [(11, a), (12, a), (13, a)])),
          ("wages_13", "wages_12", "wages_12", "wages_12"))
    step6 = wage_move_chain(s13, [ws(6, "2026-11-12T08:00:00")])[0]  # type: ignore[arg-type]
    check(wrong, "d1383-cause-6-to-13",
          (rule_notes._filed_under(step6, [(6, a), (11, a), (12, a), (13, b)]),
           rule_notes._filed_under(step6, [(6, a), (11, b), (12, b), (13, b)])),
          ("wages_13", "wages"))
    rows += 6

    for w in wrong:
        print(w)
    print(f"shared machine lines, wage rules 13 (D-1383): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}"
          f" (Miami class level {b13:.2f}; dozer by 12 {m12['subtypes'][OP]['dozer']['base']:.2f},"
          f" by 13 {m13['subtypes'][OP]['dozer']['base']:.2f}; Pinal class level {b_op:.2f})")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

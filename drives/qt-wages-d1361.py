"""D-1361 (item 3 of the 2026-11-28 night run, the founder's Q4 on REPORT_2026-11-27), a quantity-table row set: the
wording of the wage breakdown lines, each worked by hand through the api's own engine. Pure and read only: nothing is
saved, no SAM.gov call is made, no database is read. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1361.py"

The lines are D-1352's copy of OH20260001 mod 5 (Athens County 45778, Heavy and Highway; union-coded) plus four
hand-made survey lines (SU..., not union-coded) for the other WD rules.

A WD fringe reads "Fringe per WD", one line, the plan and cash fringe together, on either basis:
    the carpenter helper on LABO0265-008 Group 1 "CARPENTER TENDER" (union-coded, rule wd_union_line), prevailing,
    direct: Base wage 35.52 + Fringe per WD 14.45 = 49.97 (before D-1361: "Raised to minimum +$14.45"); burdened: the
    same fringe line, 14.45, among the burden parts; union (union_cba), direct: 35.52 + 14.45. The dozer on ENGI0018-004
    Group 2: 44.02 + 16.41 = 60.43. A survey line (rule wd), the electrician: 45.00 base raised to the open-shop base,
    + Fringe per WD 20.00. The laborer on a survey line under the open-shop figure (rule w14_prevailing, the WD fringe
    as written): Fringe per WD 3.00; on union (w14_union): the same 3.00.
"Raised to minimum" only when the base was raised (hand-made rates, through `breakdown` alone):
    a rate with the below_state_min flag, base 10.00, rate 12.00 direct: Base wage 10.00 + Raised to minimum 2.00;
    the same gap without the flag (rule location_adjusted): Unexplained difference 2.00, never "Raised to minimum";
    an agreement's rate (union_agreement) base 30.00 + plan fringe 5.00 = 35.00 direct: Fringe (plan) 5.00, no raise;
    a union-scale raise (rule raised_to_minimum) base 30.00 + fringe 5.00, rate 40.00 direct: Base wage 30.00 + Fringe
    per WD 5.00 + Raised to national union scale 5.00 (unchanged).
Every craft and machine, rules 6 and 9, prevailing, union and open shop, direct and burdened, both line sets: no
    "Raised to minimum" anywhere, the parts add to the rate, and open shop shows no "Fringe per WD".
Labels only: no rate moves (the rates are the engine's, untouched), so no wage rules number and no note key.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import asyncio
import importlib.util
import sys
from types import SimpleNamespace

_spec = importlib.util.spec_from_file_location("qt_wages_d1352", "/srv/drives/qt-wages-d1352.py")
d1352 = importlib.util.module_from_spec(_spec)
sys.modules["qt_wages_d1352"] = d1352
_spec.loader.exec_module(d1352)
line = d1352.line

SURVEY = [
    line("SUOH2024-001", "05/01/2024", "CARPENTER", 30.00, 8.00),
    line("SUOH2024-001", "05/01/2024", "LABORER: COMMON OR GENERAL", 8.00, 3.00),
    line("SUOH2024-001", "05/01/2024", "POWER EQUIPMENT OPERATOR: BULLDOZER", 40.00, 10.00),
    line("SUOH2024-001", "05/01/2024", "ELECTRICIAN", 45.00, 20.00),
]
WD_FRINGE = "Fringe per WD"
RAISED = "Raised to minimum"


def check(wrong: list[str], rid: str, got: object, want: object) -> None:
    if got != want:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


async def main() -> int:
    from app.features.wage_calculator import service
    from app.features.wage_calculator.schemas import RateRequest
    from app.wagecalc.data import RefData
    from app.wagecalc.market import load_market
    from app.wagecalc.rates import WAGE_RULES, Settings, breakdown

    ref, market = RefData(), load_market()
    wrong: list[str] = []
    rows = 0
    project = SimpleNamespace(id=-1, postal_code="45778", county=None, state=None, bid_due_date=d1352.BID,
                              work_type="site_civil", project_type="public")

    def priced(rules: int, wd_rates: list, wd_type: str, basis: str) -> dict:
        body = RateRequest(project_type="public", wage_determination=wd_type, pricing_basis=basis, zip="45778",
                           county_fips="39009")
        wd = service._W14Wd("OH20260001 mod 5, Heavy and Highway", None, {}, None)
        return service._compute(ref, project, body, Settings(), market, rules=rules, wd_rates=wd_rates, wd=wd).rs

    def parts(code: str, v: dict, basis: str) -> list[tuple[str, float]]:
        return [(p["label"], p["amount"]) for p in breakdown(ref, code, v, basis == "direct", 0.0, Settings())]

    def labels(ps: list[tuple[str, float]]) -> list[str]:
        return [label for label, _ in ps]

    def fringe(ps: list[tuple[str, float]]) -> list[tuple[str, float]]:
        return [(label, a) for label, a in ps if label.startswith(("Fringe", "Raised", "Unexplained"))]

    # Labels only: D-1361 moved no rules number (D-1359 put it at 9, D-1368 at 10; every row below names its rules).
    check(wrong, "d1361-rules", WAGE_RULES >= 9, True)
    rows += 1

    # A WD fringe reads "Fringe per WD".
    pd = priced(9, d1352.GOVERNING, "prevailing_federal", "direct")
    helper = parts("CC-34", pd["crafts"]["CC-34"], "direct")
    check(wrong, "d1361-helper-direct", helper, [("Base wage", 35.52), (WD_FRINGE, 14.45)])
    check(wrong, "d1361-helper-direct-rate", pd["crafts"]["CC-34"]["rate"], 49.97)
    pb = priced(9, d1352.GOVERNING, "prevailing_federal", "burdened")
    hb = parts("CC-34", pb["crafts"]["CC-34"], "burdened")
    check(wrong, "d1361-helper-burdened", fringe(hb), [(WD_FRINGE, 14.45)])
    check(wrong, "d1361-helper-burdened-adds", round(sum(a for _, a in hb), 2), pb["crafts"]["CC-34"]["rate"])
    ud = priced(9, d1352.GOVERNING, "union_cba", "direct")
    check(wrong, "d1361-helper-union-direct", parts("CC-34", ud["crafts"]["CC-34"], "direct"),
          [("Base wage", 35.52), (WD_FRINGE, 14.45)])
    check(wrong, "d1361-dozer-direct", parts("CC-11", pd["subtypes"]["CC-11"]["dozer"], "direct"),
          [("Base wage", 44.02), (WD_FRINGE, 16.41)])
    rows += 6
    sd = priced(9, SURVEY, "prevailing_federal", "direct")
    elec = sd["crafts"]["CC-09"]
    check(wrong, "d1361-survey-wd", (elec["rule"], fringe(parts("CC-09", elec, "direct"))), ("wd", [(WD_FRINGE, 20.0)]))
    lab = sd["crafts"]["CC-01"]
    check(wrong, "d1361-survey-w14-prevailing", (lab["rule"], fringe(parts("CC-01", lab, "direct"))),
          ("w14_prevailing", [(WD_FRINGE, 3.0)]))
    su = priced(9, SURVEY, "union_cba", "direct")["crafts"]["CC-01"]
    check(wrong, "d1361-survey-w14-union", (su["rule"], fringe(parts("CC-01", su, "direct"))),
          ("w14_union", [(WD_FRINGE, 3.0)]))
    rows += 3

    # "Raised to minimum" only when the base was raised.
    def v(rule: str, base: float, rate: float, plan: float = 0.0, flags: tuple = ()) -> dict:
        return dict(rule=rule, base=base, fringe_plan=plan, fringe_cash=0.0, rate=rate, payable=rate,
                    origin="wage_data", flags=list(flags))

    check(wrong, "d1361-raised-state-min", parts("CC-01", v("union_agreement", 10.0, 12.0, flags=("below_state_min",)),
                                                 "direct"), [("Base wage", 10.0), (RAISED, 2.0)])
    check(wrong, "d1361-not-raised-unexplained", parts("CC-01", v("location_adjusted", 10.0, 12.0), "direct"),
          [("Base wage", 10.0), ("Unexplained difference", 2.0)])
    check(wrong, "d1361-agreement-plan-fringe", parts("CC-01", v("union_agreement", 30.0, 35.0, plan=5.0), "direct"),
          [("Base wage", 30.0), ("Fringe (plan)", 5.0)])
    check(wrong, "d1361-union-scale-raise", parts("CC-01", v("raised_to_minimum", 30.0, 40.0, plan=5.0), "direct"),
          [("Base wage", 30.0), (WD_FRINGE, 5.0), ("Raised to national union scale", 5.0)])
    rows += 4

    # Every craft and machine: no "Raised to minimum", the parts add to the rate, open shop without a WD fringe.
    for rules in (6, 9):
        for name, wd_rates in (("union-coded", d1352.GOVERNING), ("survey", SURVEY)):
            for wd_type in ("prevailing_federal", "union_cba", "open_shop"):
                for basis in ("direct", "burdened"):
                    rs = priced(rules, wd_rates, wd_type, basis)
                    items = [(c, "", r) for c, r in rs["crafts"].items()]
                    items += [(c, k, r) for c, s in rs["subtypes"].items() for k, r in s.items()]
                    bad = []
                    for code, key, r in items:
                        ps = parts(code, r, basis)
                        if RAISED in labels(ps) or abs(sum(a for _, a in ps) - r["rate"]) > 0.005:
                            bad.append(f"{code}{':' + key if key else ''} {ps}")
                        if wd_type == "open_shop" and WD_FRINGE in labels(ps):
                            bad.append(f"{code}{':' + key if key else ''} open shop {ps}")
                    check(wrong, f"d1361-sweep-r{rules}-{name}-{wd_type}-{basis} ({len(items)} rates)", bad[:3], [])
                    rows += 1

    for w in wrong:
        print(w)
    print(f"wage breakdown words (D-1361): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

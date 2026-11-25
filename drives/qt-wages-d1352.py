"""D-1352 (item 1 of the 2026-11-27 night run), a quantity-table row set: wage rules 8, the founder's Q14 and Q15, each
worked by hand on lines copied from OH20260001 mod 5 (Heavy and Highway, Athens County 45778) as SAM.gov publishes them,
plus three hand-made laborer lines for the helper's tender class, through the api's own engine. Read only: nothing is
saved, no SAM.gov call is made. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1352.py"

Q14 each machine on its own WD line (prevailing, direct). The operator's level is ENGI0018-004 Group 1, 44.14 + 16.41 =
    60.55 (union-coded, used as it is, over the open-shop base). Group 2 lists BULLDOZER, ENDLOADER, POWER GRADER and
    POWER SCRAPER: 44.02 + 16.41 = 60.43 for the dozer, loader, motor grader and scraper; Group 3 lists ROLLER, ASPHALT:
    42.98 + 16.41 = 59.39 for the roller. Rules 8 prices each on its own line (60.43, 59.39); rules 7 holds each at the
    level (60.55, D-1089). The excavator (Group 1's WHEEL EXCAVATOR) stays 60.55; the crane is the Crane Operator
    craft's rate, 60.55 (one rate per craft). Union: the dozer on the union-coded Group 2 line, 60.43 (rules 7: 60.55).
    Open shop: every craft and subtype the same by 8 as by 7.
Q15 a helper on its tender line. The carpenter helper on LABO0265-008 Group 1 "CARPENTER TENDER" (remaining counties):
    35.52 + 14.45 = 49.97 by 7 and by 8; rules 8 labels it "Wage determination" (rules 7: "Helper not on WD: paid as
    journeyman", the words wrong). With no carpenter tender item on the laborer lines it takes the journeyman's
    CARP0200-002: 35.94 + 23.59 = 59.53, "Helper not on WD: paid as journeyman". The plasterer helper on a WD listing
    "LABORERS: MASON TENDER" (31.00 + 14.00) before "LABORERS: PLASTER TENDER" (32.00 + 14.00, the TX20260067 form):
    rules 8 its own trade's line, 46.00; rules 7 the mason tender, 45.00. The electrician helper with a line "LABORER
    GROUP 4- ELECTRICIAN TENDER" (33.00 + 14.45; no colon, so the item reads after its "GROUP 4-"): rules 8 that line,
    47.45; rules 7 the journeyman's ELEC0972-002, 40.00 + 33.32 = 73.32.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import asyncio
from datetime import date
from types import SimpleNamespace

BID = date(2026, 11, 25)
ATHENS_OPERATOR_COUNTIES = (
    "(ADAMS, ALLEN, ASHLAND, ATHENS, AUGLAIZE, BELMONT, BROWN, BUTLER, CARROLL, CHAMPAIGN, CLARK, CLERMONT, CLINTON, "
    "COSHOCTON, CRAWFORD, DARKE, DEFIANCE, DELAWARE, FAIRFIELD, FAYETTE, FRANKLIN, FULTON, GALLIA, GREENE, GUERNSEY, "
    "HAMILTON, HANCOCK, HARDIN, HARRISON, HENRY, HIGHLAND, HOCKING, HOLMES, HURON, JACKSON, JEFFERSON, KNOX, LAWRENCE, "
    "LICKING, LOGAN, LUCAS, MADISON, MARION, MEIGS, MERCER, MIAMI, MONROE, MONTGOMERY, MORGAN, MORROW, MUSKINGUM, NOBLE, "
    "OTTAWA, PAULDING, PERRY, PICKAWAY, PIKE, PREBLE, PTNAM, RICHLAND, ROSS, SANDUSKY, SCIOTO, SENECA, SHELBY, STARK, "
    "TUSCARAWAS, UNION, VAN WERT, VINTON, WARREN, WASHINGTON, WAYNE, WILLIAMS, WOOD, AND YANDOT COUNTIES)"
)


def line(rate_id: str, dated: str, title: str, base: float, fringe: float) -> dict:
    kind = "survey" if rate_id.startswith("SU") else "union"
    return dict(classification=title, base=base, fringe=fringe, fringe_raw=f"{fringe:.2f}", fringe_type="$",
                rate_id=rate_id, rate_id_date=dated, rate_kind=kind, note=None)


LABORER_1 = ("LABORER GROUP 1- ASPHALT LABORER; CARPENTER TENDER; LABORER (CONSTRUCTION); FLAGPERSON.  "
             "(REMAINING COUNTIES OF OHIO)")
BASE = [
    line("CARP0200-002", "05/01/2025", "CARPENTER (ADAMS, ATHENS, DELAWARE, FAIRFIELD, FAYETTE, FRANKLIN, GALLIA, "
         "GUERNSEY, HIGHLAND, HOCKING, JACKSON, LAWRENCE, LICKING, MADISON, MARION, MEIGS, MORGAN, MUSKINGUM, NOBLE, "
         "PERRY, PICKAWAY, PIKE, ROSS, SCIOTO, UNION, VINTON AND WASHINGTON COUNTIES)", 35.94, 23.59),
    line("ELEC0972-002", "06/01/2025", "ELECTRICIAN (ATHENS, MEIGS, MONROE, MORGAN, NOBLE, VINTON (BROWN, KNOX "
         "TOWNSHIPS) AND WASHINGTON COUNTIES)", 40.00, 33.32),
    line("ENGI0018-004", "05/01/2024", "POWER EQUIPMENT OPERATOR: GROUP 1- AIR COMPRESSOR ON STEEL ERECTION; CRANE "
         "(ALL TYPES, INCLUDING BOOM TRUCK, CHERRY PICKER); DERRICK; HOE (ALL TYPES); HOISTING ENGINE ON SHAFT OR "
         "TUNNEL WORK; TUNNEL MACHINE AND/OR MINING MACHINE; AND WHEEL EXCAVATOR. " + ATHENS_OPERATOR_COUNTIES, 44.14,
         16.41),
    line("ENGI0018-004", "05/01/2024", "POWER EQUIPMENT OPERATOR: GROUP 2- ASPHALT PAVER; AUTOMATIC SUBGRADER MACHINE, "
         "SELF-PROPELLED (CMI TYPE); BORING MACHINE MRE THAN 48\"; BULLDOZER; ENDLOADER; HYDRO MILLING MACHINE; "
         "KOLMAN-TYPE LOADER (PRODUCTION TYPE-DIRT); LEAD GREASEMAN; PETTIBONE-RAIL EQUIPMENT; POWER GRADER; POWER "
         "SCRAPER; PUSH CAT; TRENCH MACHINE (24' WIDE & UNDER); AND VERMEER TYPE CONCRETE SAW.  "
         + ATHENS_OPERATOR_COUNTIES, 44.02, 16.41),
    line("ENGI0018-004", "05/01/2024", "POWER EQUIPMENT OPERATOR: GROUP 3- A-FRAME; MATERIAL HOIST/ELEVATOR; ROLLER, "
         "ASPHALT. " + ATHENS_OPERATOR_COUNTIES, 42.98, 16.41),
    line("TEAM0377-003", "05/01/2025", "TRUCK DRIVER: GROUP 1- ASPHALT DISTRIBUTOR; BATCH; 4-WHEEL DUMP; OIL "
         "DISTRIBUTOR & TANDEM   (STATEWIDE, EXCEPT CUYAHOGA, GEAUGA & LAKE)", 34.26, 18.85),
]
GOVERNING = [*BASE, line("LABO0265-008", "05/01/2024", LABORER_1, 35.52, 14.45)]
NO_TENDER = [*BASE, line("LABO0265-008", "05/01/2024", LABORER_1.replace("CARPENTER TENDER; ", ""), 35.52, 14.45)]
PLASTER = [
    *GOVERNING,
    line("LABO0265-020", "05/01/2024", "LABORERS: MASON TENDER", 31.00, 14.00),
    line("LABO0265-021", "05/01/2024", "LABORERS: PLASTER TENDER", 32.00, 14.00),
]
ELECTRICIAN_TENDER = [
    *GOVERNING,
    line("LABO0265-030", "05/01/2024", "LABORER GROUP 4- ELECTRICIAN TENDER", 33.00, 14.45),
]
JOURNEYMAN = "Helper not on WD: paid as journeyman"


def check(wrong: list[str], rid: str, got: object, want: object) -> None:
    same = round(got * 100) == round(want * 100) if isinstance(want, float) else got == want
    if not same:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


async def main() -> int:
    from app.features.wage_calculator import service
    from app.features.wage_calculator.schemas import RateRequest
    from app.wagecalc.data import RefData
    from app.wagecalc.market import load_market
    from app.wagecalc.rates import WAGE_RULES, Settings

    ref, market = RefData(), load_market()
    wrong: list[str] = []
    rows = 0
    check(wrong, "d1352-rules", WAGE_RULES, 8)
    rows += 1
    project = SimpleNamespace(id=-1, postal_code="45778", county=None, state=None, bid_due_date=BID, work_type="site_civil",
                              project_type="public")

    def priced(rules: int, wd_rates: list, wd_type: str = "prevailing_federal") -> dict:
        body = RateRequest(project_type="public", wage_determination=wd_type, pricing_basis="direct", zip="45778",
                           county_fips="39009")
        wd = service._W14Wd("OH20260001 mod 5, Heavy and Highway", None, {}, None)
        return service._compute(ref, project, body, Settings(), market, rules=rules, wd_rates=wd_rates, wd=wd).rs

    # Q14: each machine on its own WD line.
    r8, r7 = priced(8, GOVERNING), priced(7, GOVERNING)
    ops8, ops7 = r8["subtypes"]["CC-11"], r7["subtypes"]["CC-11"]
    check(wrong, "d1352-q14-level", (r8["crafts"]["CC-11"]["payable"], r7["crafts"]["CC-11"]["payable"]), (60.55, 60.55))
    rows += 1
    for key in ("dozer", "loader", "motor_grader", "scraper"):
        check(wrong, f"d1352-q14-{key}-r8", ops8[key]["payable"], 60.43)
        check(wrong, f"d1352-q14-{key}-r7", ops7[key]["payable"], 60.55)
        rows += 2
    check(wrong, "d1352-q14-dozer-line", "GROUP 2-" in (ops8["dozer"].get("classification") or ""), True)
    check(wrong, "d1352-q14-dozer-said", any(s.startswith("Under the class level $60.55: priced on its own WD line")
                                             for s in ops8["dozer"]["source"]), True)
    check(wrong, "d1352-q14-roller-r8", ops8["roller"]["payable"], 59.39)
    check(wrong, "d1352-q14-roller-r7", ops7["roller"]["payable"], 60.55)
    check(wrong, "d1352-q14-excavator", (ops8["excavator"]["payable"], ops7["excavator"]["payable"]), (60.55, 60.55))
    check(wrong, "d1352-q14-crane-one-rate", (ops8["crane"]["payable"], r8["crafts"]["CC-07"]["payable"]), (60.55, 60.55))
    check(wrong, "d1352-q14-rules-line", ops8["dozer"]["source"][-1], "Priced by wage rules 8 (Nov 2026).")
    rows += 7
    u8, u7 = priced(8, GOVERNING, "union_cba"), priced(7, GOVERNING, "union_cba")
    check(wrong, "d1352-q14-union-dozer", (u8["subtypes"]["CC-11"]["dozer"]["payable"],
                                           u7["subtypes"]["CC-11"]["dozer"]["payable"]), (60.43, 60.55))
    rows += 1
    o8, o7 = priced(8, GOVERNING, "open_shop"), priced(7, GOVERNING, "open_shop")

    def pays(rs: dict) -> dict:
        return {**{c: v["payable"] for c, v in rs["crafts"].items()},
                **{f"{c}:{k}": v["payable"] for c, s in rs["subtypes"].items() for k, v in s.items()}}

    check(wrong, "d1352-q14-open-shop-same", pays(o8), pays(o7))
    rows += 1

    # Q15: a helper on its tender line, the journeyman's only where there is none.
    helper8, helper7 = r8["crafts"]["CC-34"], r7["crafts"]["CC-34"]
    check(wrong, "d1352-q15-carpenter-helper-r8", (helper8["payable"], helper8["label"]), (49.97, "Wage determination"))
    check(wrong, "d1352-q15-carpenter-helper-r7", (helper7["payable"], helper7["label"]), (49.97, JOURNEYMAN))
    check(wrong, "d1352-q15-tender-line", "CARPENTER TENDER" in (helper8.get("classification") or ""), True)
    rows += 3
    alone = priced(8, NO_TENDER)["crafts"]["CC-34"]
    check(wrong, "d1352-q15-no-tender-journeyman", (alone["payable"], alone["label"]), (59.53, JOURNEYMAN))
    rows += 1
    p8, p7 = priced(8, PLASTER)["crafts"]["CC-24"], priced(7, PLASTER)["crafts"]["CC-24"]
    check(wrong, "d1352-q15-plaster-tender-r8", (p8["payable"], p8["label"]), (46.00, "Wage determination"))
    check(wrong, "d1352-q15-plaster-tender-r7", p7["payable"], 45.00)
    rows += 2
    e8, e7 = priced(8, ELECTRICIAN_TENDER)["crafts"]["CC-32"], priced(7, ELECTRICIAN_TENDER)["crafts"]["CC-32"]
    check(wrong, "d1352-q15-electrician-tender-r8", (e8["payable"], e8["label"]), (47.45, "Wage determination"))
    check(wrong, "d1352-q15-electrician-tender-r7", (e7["payable"], e7["label"]), (73.32, JOURNEYMAN))
    rows += 2

    for w in wrong:
        print(w)
    print(f"wage rules 8 (D-1352): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

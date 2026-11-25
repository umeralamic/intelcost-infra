"""D-1350 (item 7 of the 2026-11-26 night run), a quantity-table row set: wage rules 7, the fixes B1-B6, each worked by
hand on lines copied from the WDs as SAM.gov publishes them (OH20260001 mod 5, Heavy and Highway; OH20260041, Building,
Athens County), through the api's own engine. Read only: nothing is saved, no SAM.gov call is made. `./quantity-table.sh`
runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1350.py"

B1  the county's own lines, matched exactly: Athens County (45778, 39009) keeps CARP0200-002 (its list names Athens),
    LABO0265-008 "remaining counties" (no sibling names Athens), TEAM0377-003 "statewide, except Cuyahoga, Geauga &
    Lake", ENGI0018-004 Group 1 (its list names Athens); it drops CARP0171-001 (Mahoning & Trumbull), the Cuyahoga
    laborer and truck lines and the Columbiana Group 4 "hydraulic manipulator crane". Prevailing, union-coded lines used
    as they are (each over the open-shop base): carpenter 35.94 + 23.59 = 59.53, laborer 35.52 + 14.45 = 49.97, truck
    34.26 + 18.85 = 53.11, crane (Group 1's "crane (all types ...)" item) 44.14 + 16.41 = 60.55; the elevator mechanic
    is on no line of the county (licensed: not covered). Rules 6 keeps its old reading: the "material hoist/elevator"
    operator line is the elevator mechanic's.
B2  never below the open-shop base: a union-coded line 27.04 + 11.72 with an open-shop base of 30.00 is base 30.00,
    payable 41.72 (rules 6: 27.04, 38.76, the AZ elevator case); a survey line 20.00 + 15.00 under a $22.00 minimum
    with an open-shop base of 25.00 (laborer, premium 14 %: 28.50 < 37.00): base max(37.00 - 15.00, 20.00) = 22.00 ->
    25.00, payable 40.00 (rules 6: 22.00, 37.00).
B3  the local metro: Salt Lake County 49035 reads OEWS area M0041620, Franklin County OH 39049 M0018140, Athens 39009
    (a micropolitan county, no OEWS area) the state's, S3900000.
B4  the elevator mechanic reads SOC 47-4021 (CC-10, RC-29); "Power equipment operator: group 1 ... elevator hoist" is
    not its line on rules 7.
B5  the Building WD line: the elevator mechanic, on no line of OH20260001, takes OH20260041's ELEV0011-002, 57.41 +
    38.44 = 95.85 (union-coded, over the open-shop base), noted "Not on OH20260001: Building WD line used (conformance
    may be needed)."
B6  a helper with no class on the WD: the electrician helper on the county's electrician line ELEC0972-002, 40.00 +
    33.32 = 73.32, "Helper not on WD: paid as journeyman".
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


GOVERNING = [
    line("CARP0171-001", "05/01/2025", "CARPENTER (MAHONING & TRUMBULL)", 33.19, 25.02),
    line("CARP0200-002", "05/01/2025", "CARPENTER (ADAMS, ATHENS, DELAWARE, FAIRFIELD, FAYETTE, FRANKLIN, GALLIA, "
         "GUERNSEY, HIGHLAND, HOCKING, JACKSON, LAWRENCE, LICKING, MADISON, MARION, MEIGS, MORGAN, MUSKINGUM, NOBLE, "
         "PERRY, PICKAWAY, PIKE, ROSS, SCIOTO, UNION, VINTON AND WASHINGTON COUNTIES)", 35.94, 23.59),
    line("ELEC0972-002", "06/01/2025", "ELECTRICIAN (ATHENS, MEIGS, MONROE, MORGAN, NOBLE, VINTON (BROWN, KNOX "
         "TOWNSHIPS) AND WASHINGTON COUNTIES)", 40.00, 33.32),
    line("ENGI0018-004", "05/01/2024", "POWER EQUIPMENT OPERATOR: GROUP 1- AIR COMPRESSOR ON STEEL ERECTION; CRANE "
         "(ALL TYPES, INCLUDING BOOM TRUCK, CHERRY PICKER); DERRICK; HOE (ALL TYPES); HOISTING ENGINE ON SHAFT OR "
         "TUNNEL WORK; TUNNEL MACHINE AND/OR MINING MACHINE; AND WHEEL EXCAVATOR. " + ATHENS_OPERATOR_COUNTIES, 44.14,
         16.41),
    line("ENGI0018-004", "05/01/2024", "POWER EQUIPMENT OPERATOR: GROUP 3- A-FRAME; MATERIAL HOIST/ELEVATOR; ROLLER, "
         "ASPHALT. " + ATHENS_OPERATOR_COUNTIES, 42.98, 16.41),
    line("ENGI0066-030", "05/01/2025", "POWER EQUIPMENT OPERATOR: ALL OTHER WORK  GROUP 4 - COMPRESSOR; HYDRAULIC "
         "MANIUPLATOR CRANE; PUMP. (COLUMBIANA, MAHONING & TRUMBULL COUNTIES)", 28.77, 24.30),
    line("LABO0265-008", "05/01/2024", "LABORER GROUP 1- ASPHALT LABORER; CARPENTER TENDER; LABORER (CONSTRUCTION); "
         "FLAGPERSON.  (REMAINING COUNTIES OF OHIO)", 35.52, 14.45),
    line("LABO0265-008", "05/01/2024", "LABORER GROUP 1- ASPHALT LABORER; CARPENTER TENDER; LABORER (CONSTRUCTION); "
         "FLAGPERSON.  (CUYAHOGA, GEAUGA & LAKE COUNTIES)", 37.18, 14.45),
    line("TEAM0377-003", "05/01/2025", "TRUCK DRIVER: GROUP 1- ASPHALT DISTRIBUTOR; BATCH; 4-WHEEL DUMP; OIL "
         "DISTRIBUTOR & TANDEM   (STATEWIDE, EXCEPT CUYAHOGA, GEAUGA & LAKE)", 34.26, 18.85),
    line("TEAM0436-002", "05/01/2025", "TRUCK DRIVER: GROUP 1- STRAIGHT & DUMP, STRAIGHT FUEL   (CUYAHOGA, GEAUGA & "
         "LAKE)", 34.92, 19.30),
]
BUILDING = [
    line("ELEV0011-002", "01/01/2026", "ELEVATOR MECHANIC", 57.41, 38.44),
    line("CARP0200-028", "05/01/2025", "CARPENTER", 30.00, 20.00),
]
KEPT_ATHENS = ["CARP0200-002", "ELEC0972-002", "ENGI0018-004", "ENGI0018-004", "LABO0265-008", "TEAM0377-003"]


def check(wrong: list[str], rid: str, got: object, want: object) -> None:
    same = round(got * 100) == round(want * 100) if isinstance(want, float) else got == want
    if not same:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


async def main() -> int:
    from app.features.wage_calculator import service
    from app.features.wage_calculator.schemas import RateRequest
    from app.wagecalc import w14
    from app.wagecalc.data import RefData
    from app.wagecalc.market import load_market
    from app.wagecalc.rates import Settings, w14_prevailing
    from app.wagecalc.wd.counties import for_county
    from app.wagecalc.wd.mapping import classify, map_wd

    ref, market = RefData(), load_market()
    wrong: list[str] = []
    rows = 0

    # B1: the county's own lines.
    ohio = [c["county_name"] for c in ref.counties.values() if c["state_code"] == "OH"]
    kept = for_county(GOVERNING, "Athens County", ohio)
    check(wrong, "d1350-b1-athens-lines", [r["rate_id"] for r in kept], KEPT_ATHENS)
    rows += 1
    old, _ = map_wd(GOVERNING)
    check(wrong, "d1350-b1-rules6-elevator-kept", "MATERIAL HOIST/ELEVATOR" in old["Elevator Mechanic"]["classification"],
          True)
    rows += 1
    project = SimpleNamespace(id=-1, postal_code="45778", county=None, state=None, bid_due_date=BID, work_type="site_civil",
                              project_type="public")
    body = RateRequest(project_type="public", wage_determination="prevailing_federal", pricing_basis="direct",
                       zip="45778", county_fips="39009")

    def priced(rules: int, building: list | None) -> dict:
        wd = service._W14Wd("OH20260001 mod 5, Heavy and Highway", None, {},
                            ("OH20260041", building) if building is not None else None)
        return service._compute(ref, project, body, Settings(), market, rules=rules, wd_rates=GOVERNING, wd=wd).rs

    rs = priced(7, None)
    for rid, code, want in (("carpenter", "CC-05", 59.53), ("laborer", "CC-16", 49.97), ("truck", "CC-31", 53.11),
                            ("crane", "CC-07", 60.55)):
        check(wrong, f"d1350-b1-{rid}", rs["crafts"][code]["payable"], want)
        rows += 1
    check(wrong, "d1350-b1-elevator-not-covered", rs["crafts"]["CC-10"]["flags"], ["not_covered"])
    rows += 1

    # B2: never below the open-shop base.
    coded = w14.SurveyLine("POWER EQUIPMENT OPERATOR: GROUP 1 ... ELEVATOR HOIST", 27.04, 11.72, "ENGI0428-002", None)
    for exact, base, pay in ((True, 30.00, 41.72), (False, 27.04, 38.76)):
        got = w14_prevailing(ref, "CC-10", {"base": 30.00}, (27.04, 11.72, 0.0), coded, None, "AZ", "prevailing_federal",
                             True, Settings(), 25.00, "", exact=exact)
        check(wrong, f"d1350-b2-coded-{'r7' if exact else 'r6'}", (got["base"], got["payable"]), (base, pay))
        rows += 1
    for exact, base, pay in ((True, 25.00, 40.00), (False, 22.00, 37.00)):
        got = w14_prevailing(ref, "CC-16", {"base": 25.00}, (20.00, 15.00, 0.0), None, None, "AZ", "prevailing_federal",
                             True, Settings(), 22.00, "Company minimum $22.00", "LABORER: GENERAL", exact=exact)
        check(wrong, f"d1350-b2-survey-{'r7' if exact else 'r6'}", (got["base"], got["payable"]), (base, pay))
        rows += 1

    # B3: the local metro, else the state.
    for rid, county, state, code in (("salt-lake", "49035", "49", "0041620"), ("columbus", "39049", "39", "0018140"),
                                     ("athens-state", "39009", "39", "3900000")):
        found = market.oews_for("47-2061", county, state, "median")
        check(wrong, f"d1350-b3-{rid}", found.area_code if found else None, code)
        rows += 1

    # B4: the elevator mechanic's own code and line.
    check(wrong, "d1350-b4-soc", (market.craft_soc.get("CC-10"), market.craft_soc.get("RC-29")), ("47-4021", "47-4021"))
    hoist = "POWER EQUIPMENT OPERATOR: GROUP 1 A-FRAME BOOM TRUCK, ELEVATOR HOIST (HUSKY AND SIMILAR), OILER"
    check(wrong, "d1350-b4-hoist-r7", "Elevator Mechanic" in (classify(hoist, exact=True)[0] or {}), False)
    check(wrong, "d1350-b4-own-line", "Elevator Mechanic" in (classify("ELEVATOR MECHANIC", exact=True)[0] or {}), True)
    rows += 3

    # B5: the county's Building WD line.
    rs = priced(7, BUILDING)
    elevator = rs["crafts"]["CC-10"]
    check(wrong, "d1350-b5-elevator", elevator["payable"], 95.85)
    check(wrong, "d1350-b5-note", (elevator.get("source") or [""])[0],
          "Not on OH20260001: Building WD line used (conformance may be needed). OH20260041, Elevator mechanic.")
    check(wrong, "d1350-b5-carpenter-stays", rs["crafts"]["CC-05"]["payable"], 59.53)
    rows += 3

    # B6: a helper on its journeyman's line.
    helper = rs["crafts"]["CC-32"]
    check(wrong, "d1350-b6-electrician-helper", (helper["payable"], helper["label"]),
          (73.32, "Helper not on WD: paid as journeyman"))
    rows += 1

    for w in wrong:
        print(w)
    print(f"wage rules 7 (D-1350): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

"""D-1359 (items 1 and 1b of the 2026-11-28 night run), a quantity-table row set: wage rules 9, each worked by hand
through the api's own engine. Read only: nothing is saved, no SAM.gov call is made. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1359.py"

Item 1, whole names (the founder's Q2). The three ENGI0018-004 operator lines of OH20260001 mod 5 (Heavy and Highway,
    Athens County 45778) exactly as SAM.gov publishes them, union-coded, prevailing, direct. Group 1 (44.14 + 16.41 =
    60.55) lists "ELEVATING GRADER OR EUCLID LOADER", "PRENTICE LOADER" and "MULTIPLE SCRAPER" (other machines), "HOE
    (ALL TYPES)" and "WHEEL EXCAVATOR"; Group 2 (44.02 + 16.41 = 60.43) lists "BULLDOZER", "ENDLOADER", "POWER GRADER",
    "POWER SCRAPER" and a skid steer loader; Group 3 (42.98 + 16.41 = 59.39) "ROLLER, ASPHALT". Rules 9: the loader and
    the scraper on Group 2, 60.43 (rules 8: Group 1, 60.55, through "EUCLID LOADER" and "MULTIPLE SCRAPER"); the dozer and
    motor grader 60.43, the roller 59.39, the backhoe and excavator 60.55 by both. Item rows: the names one item gives.
Item 1b (a), open shop, a machine reads only its own survey line (Pinal 85138, commercial, direct, bid 2026-11-25).
    "Bare" is the same project with no WD line at all (BLS alone). (i) The Pinal and Yuma form: one operator survey line,
    "POWER EQUIPMENT OPERATOR: SCRAPER", SUAZ2023-010 of 11/19/2024, base 60.00. The craft's level reads it: 60.00 x the
    ECI factor from 2024-11-19 to the bid. Rules 9: the scraper on its own line = that level; the dozer and backhoe at
    bare's operator base (BLS), the excavator bare's x 1.215 (the company default, rounded to the cent), each said
    "another machine's: not read"; the dozer under the class rate keeps its own figure ("priced on its own figure").
    Rules 8: the dozer at the level (held), the excavator at the level x 1.215. (ii) The Utah form: one line
    "OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE", SUUT2018-004 of 05/07/2020, base 45.00 (the class line too): rules 9 the
    backhoe and the excavator both on it (the class base, no premium), the dozer at bare's (BLS); rules 8 the excavator
    at the class x 1.215 and the dozer at the class. (iii) An own line older than ten years ("OPERATOR: BULLDOZER",
    SUFL2009-164 of 06/24/2009): the dozer the same by 9 as by 8.
Item 1b (b), the pipelayer (Laborer, Pinal). Survey lines "LABORER: COMMON OR GENERAL" (SUAZ2023-012, 11/19/2024,
    20.00) and "LABORER: PIPELAYER" (same survey, 50.00): rules 9 the pipelayer is its own line, 50.00 x the same ECI
    factor (over BLS 47-2151, the minimum and the national rate); rules 8 it reads BLS 47-2151 only, lower. With the
    pipelayer's line dated 06/24/2009 (older than ten years) rules 9 equals rules 8.
The note (D-1360's pattern): "wages_9" is a wage note about rules 9 (`WAGE_NOTES`, `KNOWN`); a set moved 8 -> 9 owes
    "wages_9", 7 -> 9 owes "wages_8", 6 -> 9 owes "wages" (one note per move, the first key the set had not had).
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import asyncio
from datetime import UTC, date, datetime
from types import SimpleNamespace

BID = date(2026, 11, 25)
GROUP_1 = (
    "POWER EQUIPMENT OPERATOR: GROUP 1- AIR COMPRESSOR ON STEEL ERECTION; BARRIER MOVING MACHINE; BOILER OPER"
    "ATOR ON COMPRESSOR OR GENERATOR WHEN MOUNTED ON A RIG; CABLEWAY; COMBINATION CONCRETE MIXER & TOWER; CON"
    "CRETE PLANT (OVER 4 YD. CAPACITY); CONCRETE PUMP; CRANE (ALL TYPES, INCLUDING BOOM TRUCK, CHERRY PICKER)"
    "; CRANE-COMPACT, TRACK OR RUBBER OVER 4,000 LBS. CAPACITY; CRANES-SELF-ERECTING, STATIONARY, TRACK OR TR"
    "UCK (ALL CONFIGURATIONS); DERRICK; DRAGLINE; DREDGE (DIPPER, CLAM OR SUCTION); ELEVATING GRADER OR EUCLI"
    "D LOADER; FLOATING EQUIPMENT (ALL TYPES); GRADALL; HELICOPTER CREW (OPERATOR-HOIST OR WINCH); HOE (ALL T"
    "YPES); HOISTING ENGINE ON SHAFT OR TUNNEL WORK; HYDRAULIC GANTRY (LIFTING SYSTEM); INDUSTRIAL-TYPE TRACT"
    "OR; JET ENGINE DRYER (D8 OR D9) DIESEL TRACTOR; LOCOMOTIVE (STANDARD GAUGE); MAINTENANCE OPERATOR CLASS "
    "A; MIXER, PAVING 9SINGLE OR DOUBLE DRUM); MUCKING MACHINE; MULTIPLE SCRAPER; PILEDRIVING MACHINE (ALL TY"
    "PES); POWER SHOVEL; PRENTICE LOADER; QUAD 9 (DOUBLE PUSHER); RAIL TAMPER (WITH AUTO LIFTING & ALIGNING D"
    "EVICE); REFRIGERATING MACHINE (FREEZER OPERATORON); ROTARY DRILL, ON CAISSON WORK; ROUGH TERRAIN FORK LI"
    "FT WITH WINCH/HOIST; SIDE-BOOM; SLIP-FORM PAVER; TOWER DERRICK; TREE SHREDDER; TRENCH MACHINE (OVER 24' "
    "WIDE); TRUCK MOUNTED CONCRETE PUMP; TUG BOAT; TUNNEL MACHINE AND/OR MINING MACHINE; AND WHEEL EXCAVATOR."
    " (ADAMS, ALLEN, ASHLAND, ATHENS, AUGLAIZE, BELMONT, BROWN, BUTLER, CARROLL, CHAMPAIGN, CLARK, CLERMONT, "
    "CLINTON, COSHOCTON, CRAWFORD, DARKE, DEFIANCE, DELAWARE, FAIRFIELD, FAYETTE, FRANKLIN, FULTON, GALLIA, G"
    "REENE, GUERNSEY, HAMILTON, HANCOCK, HARDIN, HARRISON, HENRY, HIGHLAND, HOCKING, HOLMES, HURON, JACKSON, "
    "JEFFERSON, KNOX, LAWRENCE, LICKING, LOGAN, LUCAS, MADISON, MARION, MEIGS, MERCER, MIAMI, MONROE, MONTGOM"
    "ERY, MORGAN, MORROW, MUSKINGUM, NOBLE, OTTAWA, PAULDING, PERRY, PICKAWAY, PIKE, PREBLE, PTNAM, RICHLAND,"
    " ROSS, SANDUSKY, SCIOTO, SENECA, SHELBY, STARK, TUSCARAWAS, UNION, VAN WERT, VINTON, WARREN, WASHINGTON,"
    " WAYNE, WILLIAMS, WOOD, AND YANDOT COUNTIES)"
)
GROUP_2 = (
    "POWER EQUIPMENT OPERATOR: GROUP 2- ASPHALT PAVER; AUTOMATIC SUBGRADER MACHINE, SELF-PROPELLED (CMI TYPE)"
    "; BOBCAT TYPE AND/OR SKID STEER LOADER WITH HOE ATTACHMENT GREATER THAN 7,000 LBS.; BORING MACHINE MRE T"
    "HAN 48\"\"; BULLDOZER; ENDLOADER; HYDRO MILLING MACHINE; HORIZONTAL DIRECTIONAL DRILL (OVER 50,000 FT. LBS"
    ". THURUST); KOLMAN-TYPE LOADER (PRODUCTION TYPE-DIRT); LEAD GREASEMAN; LIGHTING & TRAFFIC SIGNAL INSTALL"
    "ATION EQUIPMENT (INCLUDES ALL GROUPS OR CLASSIFICATIONS); MATERIAL TRANSFER EQUIPMENT (SHUTTLE BUGGY); A"
    "SHPHALT; PETTIBONE-RAIL EQUIPMENT; POWER GRADER; POWER SCRAPER; PUSH CAT; ROTOMILL (ALL), GRINDERS & PLA"
    "NERS OF ALL TYPES; TRENCH MACHINE (24' WIDE & UNDER); AND VERMEER TYPE CONCRETE SAW. (ADAMS, ALLEN, ASHL"
    "AND, ATHENS, AUGLAIZE, BELMONT, BROWN, BUTLER, CARROLL, CHAMPAIGN, CLARK, CLERMONT, CLINTON, COSHOCTON, "
    "CRAWFORD, DARKE, DEFIANCE, DELAWARE, FAIRFIELD, FAYETTE, FRANKLIN, FULTON, GALLIA, GREENE, GUERNSEY, HAM"
    "ILTON, HANCOCK, HARDIN, HARRISON, HENRY, HIGHLAND, HOCKING, HOLMES, HURON, JACKSON, JEFFERSON, KNOX, LAW"
    "RENCE, LICKING, LOGAN, LUCAS, MADISON, MARION, MEIGS, MERCER, MIAMI, MONROE, MONTGOMERY, MORGAN, MORROW,"
    " MUSKINGUM, NOBLE, OTTAWA, PAULDING, PERRY, PICKAWAY, PIKE, PREBLE, PTNAM, RICHLAND, ROSS, SANDUSKY, SCI"
    "OTO, SENECA, SHELBY, STARK, TUSCARAWAS, UNION, VAN WERT, VINTON, WARREN, WASHINGTON, WAYNE, WILLIAMS, WO"
    "OD, AND YANDOT COUNTIES)"
)
GROUP_3 = (
    "POWER EQUIPMENT OPERATOR: GROUP 3- A-FRAME; AIR COMPRESSOR ON TUNNEL WORK (LOW PRESSURE); ASPHALT PLANT "
    "ENGINEER; BOBCAT-TYPE AND/OR SKID STEER LOADER WITH OR WITHOUT ATTACHMENTS; HIGHWAY DRILLS (ALL TYPES); "
    "LOCOMOTIVE (NARROW GAUGE); MATERIAL HOIST/ELEVATOR; MIXER, CONCRETE (MORE THAN ONE BAG CAPACITY); MIXER,"
    " ONE BAG CAPACITY (SIDE LOADER); POWER BOILER (OVER 15 LBS. PRESSURE) PUMP OPERATOR INSTALLING & OPERATI"
    "NG WELL POINTS; PUMP (4' & OVER DISCHARGE); RAILROAD TIE INSERTER/REMOVER; ROLLER, ASPHALT; ROTOVATOR (L"
    "IME SOIL STABILIZER); SWITCH & TIE TAMPERS (WITHOUT LIFTING & ALIGNING DEVICE); UTILITY OPERATOR (SMALL "
    "EQUIPMENT); AND WELDING MACHINES: ARTICULATING/STRAIGHT BED END DUMPS IF ASSIGNED (MINUS $4.00 PER HOUR)"
    ". (ADAMS, ALLEN, ASHLAND, ATHENS, AUGLAIZE, BELMONT, BROWN, BUTLER, CARROLL, CHAMPAIGN, CLARK, CLERMONT,"
    " CLINTON, COSHOCTON, CRAWFORD, DARKE, DEFIANCE, DELAWARE, FAIRFIELD, FAYETTE, FRANKLIN, FULTON, GALLIA, "
    "GREENE, GUERNSEY, HAMILTON, HANCOCK, HARDIN, HARRISON, HENRY, HIGHLAND, HOCKING, HOLMES, HURON, JACKSON,"
    " JEFFERSON, KNOX, LAWRENCE, LICKING, LOGAN, LUCAS, MADISON, MARION, MEIGS, MERCER, MIAMI, MONROE, MONTGO"
    "MERY, MORGAN, MORROW, MUSKINGUM, NOBLE, OTTAWA, PAULDING, PERRY, PICKAWAY, PIKE, PREBLE, PTNAM, RICHLAND"
    ", ROSS, SANDUSKY, SCIOTO, SENECA, SHELBY, STARK, TUSCARAWAS, UNION, VAN WERT, VINTON, WARREN, WASHINGTON"
    ", WAYNE, WILLIAMS, WOOD, AND YANDOT COUNTIES)"
)


def line(rate_id: str, dated: str, title: str, base: float, fringe: float) -> dict:
    kind = "survey" if rate_id.startswith("SU") else "union"
    return dict(classification=title, base=base, fringe=fringe, fringe_raw=f"{fringe:.2f}", fringe_type="$",
                rate_id=rate_id, rate_id_date=dated, rate_kind=kind, note=None)


ATHENS = [
    line("ENGI0018-004", "05/01/2024", GROUP_1, 44.14, 16.41),
    line("ENGI0018-004", "05/01/2024", GROUP_2, 44.02, 16.41),
    line("ENGI0018-004", "05/01/2024", GROUP_3, 42.98, 16.41),
]
SCRAPER_ONLY = [line("SUAZ2023-010", "11/19/2024", "POWER EQUIPMENT OPERATOR: SCRAPER", 60.00, 0.00)]
SHARED = [line("SUUT2018-004", "05/07/2020", "OPERATOR: BACKHOE/EXCAVATOR/TRACKHOE", 45.00, 0.00)]
OLD_OWN = [line("SUFL2009-164", "06/24/2009", "OPERATOR: BULLDOZER", 70.00, 0.00)]
PIPE = [
    line("SUAZ2023-012", "11/19/2024", "LABORER: COMMON OR GENERAL", 20.00, 0.00),
    line("SUAZ2023-012", "11/19/2024", "LABORER: PIPELAYER", 50.00, 0.00),
]
PIPE_OLD = [PIPE[0], line("SUAZ2009-012", "06/24/2009", "LABORER: PIPELAYER", 50.00, 0.00)]
OTHER = "is another machine's: not read for this one."
OWN_FIGURE = "priced on its own figure."


def check(wrong: list[str], rid: str, got: object, want: object, cents: float = 0.0) -> None:
    if isinstance(want, float) and isinstance(got, (int, float)):
        same = abs(round(got * 100) - round(want * 100)) <= round(cents * 100)
    else:
        same = got == want
    if not same:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


def said(v: dict, words: str) -> bool:
    return any(words in s for s in v.get("source") or [])


async def main() -> int:
    from app.features.wage_calculator import service
    from app.features.wage_calculator.schemas import RateRequest
    from app.wagecalc.data import RefData
    from app.wagecalc.market import load_market
    from app.wagecalc.rates import OWN_SURVEY_RULES, WAGE_RULES, Settings
    from app.wagecalc.wd.mapping import whole_subtypes

    ref, market = RefData(), load_market()
    wrong: list[str] = []
    rows = 0
    check(wrong, "d1359-rules", (WAGE_RULES, OWN_SURVEY_RULES), (9, 9))
    rows += 1

    # Item 1: the names one item gives (whole names, whole words).
    op, truck = "Equipment Operator", "Truck Driver"
    for rid, craft, item, want in (
        ("endloader", op, "ENDLOADER", ["loader"]),
        ("power-scraper", op, "POWER SCRAPER", ["scraper"]),
        ("prentice-loader", op, "PRENTICE LOADER", []),
        ("euclid-loader", op, "ELEVATING GRADER OR EUCLID LOADER", []),
        ("euclid-elevating", op, "EUCLID/ELEVATING LOADER", []),
        ("multiple-scraper", op, "MULTIPLE SCRAPER", []),
        ("front-end", op, "LOADER, FRONT END", ["loader"]),
        ("shared-line", op, "BACKHOE/EXCAVATOR/TRACKHOE", ["backhoe", "excavator"]),
        ("hoe", op, "HOE (ALL TYPES)", ["backhoe"]),
        ("wheel-excavator", op, "AND WHEEL EXCAVATOR.", ["excavator"]),
        ("subgrader", op, "SUB-GRADER", []),
        ("skid-steer", op, "BOBCAT TYPE AND/OR SKID STEER LOADER WITH HOE ATTACHMENT", ["skid_steer"]),
        ("boiler", op, "BOILER OPERATOR", []),
        ("dumpsters", truck, "DUMPSTERS", []),
        ("dump", truck, "4-WHEEL DUMP", ["dump"]),
    ):
        check(wrong, f"d1359-item-{rid}", whole_subtypes(craft, item), want)
        rows += 1

    def priced(rules: int, wd_rates: list, wd_type: str, zip5: str, county: str, ptype: str) -> dict:
        project = SimpleNamespace(id=-1, postal_code=zip5, county=None, state=None, bid_due_date=BID,
                                  work_type="site_civil", project_type=ptype)
        body = RateRequest(project_type=ptype, wage_determination=wd_type, pricing_basis="direct", zip=zip5,
                           county_fips=county)
        name = "D-1359 drive WD" if wd_rates else None
        wd = service._W14Wd(name, None, {}, None)
        return service._compute(ref, project, body, Settings(), market, rules=rules, wd_rates=wd_rates, wd=wd).rs

    # Item 1 on the real Athens lines (prevailing, direct).
    a9 = priced(9, ATHENS, "prevailing_federal", "45778", "39009", "public")
    a8 = priced(8, ATHENS, "prevailing_federal", "45778", "39009", "public")
    ops9, ops8 = a9["subtypes"]["CC-11"], a8["subtypes"]["CC-11"]
    for key, want9, want8 in (("loader", 60.43, 60.55), ("scraper", 60.43, 60.55), ("dozer", 60.43, 60.43),
                              ("motor_grader", 60.43, 60.43), ("roller", 59.39, 59.39), ("backhoe", 60.55, 60.55),
                              ("excavator", 60.55, 60.55)):
        check(wrong, f"d1359-athens-{key}", (ops9[key]["payable"], ops8[key]["payable"]), (want9, want8))
        rows += 1
    check(wrong, "d1359-athens-loader-line", "GROUP 2-" in (ops9["loader"].get("classification") or ""), True)
    check(wrong, "d1359-athens-scraper-line", "GROUP 2-" in (ops9["scraper"].get("classification") or ""), True)
    check(wrong, "d1359-athens-rules-line", ops9["loader"]["source"][-1], "Priced by wage rules 9 (Nov 2026).")
    rows += 3

    # Item 1b (a): open shop, Pinal 85138.
    def os(rules: int, wd_rates: list) -> dict:
        return priced(rules, wd_rates, "open_shop", "85138", "04021", "commercial")

    bare = os(9, [])
    bare_op = bare["crafts"]["CC-11"]["base"]
    f24 = market.escalate(date(2024, 11, 19), BID).factor
    s9, s8 = os(9, SCRAPER_ONLY), os(8, SCRAPER_ONLY)
    level = round(60.00 * f24, 2)
    sub9, sub8 = s9["subtypes"]["CC-11"], s8["subtypes"]["CC-11"]
    check(wrong, "d1359-pinal-level", (s9["crafts"]["CC-11"]["base"], s8["crafts"]["CC-11"]["base"]), (level, level))
    check(wrong, "d1359-pinal-scraper-own-line", sub9["scraper"]["base"], level)
    check(wrong, "d1359-pinal-dozer-r9", sub9["dozer"]["base"], bare_op)
    check(wrong, "d1359-pinal-backhoe-r9", sub9["backhoe"]["base"], bare_op)
    check(wrong, "d1359-pinal-excavator-r9", sub9["excavator"]["base"], round(bare_op * 1.215, 2), 0.01)
    check(wrong, "d1359-pinal-dozer-said", (said(sub9["dozer"], OTHER), said(sub9["dozer"], OWN_FIGURE)), (True, True))
    check(wrong, "d1359-pinal-dozer-r8", sub8["dozer"]["base"], level)
    check(wrong, "d1359-pinal-excavator-r8", sub8["excavator"]["base"], round(level * 1.215, 2), 0.01)
    rows += 8
    u9, u8 = os(9, SHARED), os(8, SHARED)
    cls9, cls8 = u9["crafts"]["CC-11"]["base"], u8["crafts"]["CC-11"]["base"]
    v9, v8 = u9["subtypes"]["CC-11"], u8["subtypes"]["CC-11"]
    check(wrong, "d1359-shared-class", cls9, cls8)
    check(wrong, "d1359-shared-backhoe-excavator-r9", (v9["backhoe"]["base"], v9["excavator"]["base"]), (cls9, cls9))
    check(wrong, "d1359-shared-dozer-r9", v9["dozer"]["base"], bare_op)
    check(wrong, "d1359-shared-excavator-r8", v8["excavator"]["base"], round(cls8 * 1.215, 2), 0.01)
    check(wrong, "d1359-shared-dozer-r8", v8["dozer"]["base"], cls8)
    rows += 5
    o9, o8 = os(9, OLD_OWN), os(8, OLD_OWN)
    check(wrong, "d1359-old-own-dozer", o9["subtypes"]["CC-11"]["dozer"]["base"], o8["subtypes"]["CC-11"]["dozer"]["base"])
    rows += 1

    # Item 1b (b): the pipelayer's own survey line beside BLS 47-2151.
    p9, p8 = os(9, PIPE)["subtypes"]["CC-16"]["pipelayer"], os(8, PIPE)["subtypes"]["CC-16"]["pipelayer"]
    check(wrong, "d1359-pipelayer-r9", p9["base"], round(50.00 * f24, 2))
    check(wrong, "d1359-pipelayer-r8-lower", p8["base"] < p9["base"], True)
    q9, q8 = os(9, PIPE_OLD)["subtypes"]["CC-16"]["pipelayer"], os(8, PIPE_OLD)["subtypes"]["CC-16"]["pipelayer"]
    check(wrong, "d1359-pipelayer-old-line", q9["base"], q8["base"])
    rows += 3

    # The note: "wages_9" (D-1360's table), one note per move.
    from app.features.estimate.rule_notes import KNOWN, WAGE_NOTES, wage_move

    def ws(rules: int, at: str) -> SimpleNamespace:
        return SimpleNamespace(wage_rules=rules, created_at=datetime.fromisoformat(at).replace(tzinfo=UTC),
                               zip="77571", county_fips="48201", project_type="commercial",
                               wage_determination="open_shop", pricing_basis="burdened", basis="national_average",
                               wd_import_id=None, union_agreement_id=None)

    check(wrong, "d1359-note-key", (WAGE_NOTES.get("wages_9"), "wages_9" in KNOWN), (9, True))
    s9 = ws(9, "2026-11-26T00:00:00")
    for rid, before, want in (("8-to-9", 8, "wages_9"), ("7-to-9", 7, "wages_8"), ("6-to-9", 6, "wages")):
        got = wage_move(s9, [ws(before, "2026-11-25T08:00:00")])  # type: ignore[arg-type]
        check(wrong, f"d1359-note-move-{rid}", got[0] if got else None, want)
    rows += 4

    for w in wrong:
        print(w)
    print(f"wage rules 9 (D-1359): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}"
          f" (ECI factor 2024-11-19 to the bid {f24:.5f}; bare operator base {bare_op:.2f})")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

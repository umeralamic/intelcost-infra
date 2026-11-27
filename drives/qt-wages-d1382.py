"""D-1382 (item 2 of the 2026-12-01 night run), a quantity-table row set: wage rules 12, local wage areas, through the
api's own engine and the bench's loaded BLS definitions and OEWS rows. Read only: nothing is saved. `./quantity-table.sh`
runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-wages-d1382.py"

Worked by hand (the founder's D-1378 2, D-1380 1-5; spec docs/tasks/bls_nonmetro_areas_tasks.md section 7):
1. `WAGE_RULES >= 12`, `NONMETRO_RULES == 12`.
2. The definitions (BLS May 2025, 528 areas: 393 metro, 135 nonmetro; 3,222 counties): every nonmetro area has a
   county; Southern Ohio nonmetro 3900004 is exactly Adams, Athens, Clinton, Fayette, Gallia, Highland, Jackson, Meigs,
   Pike, Ross, Scioto and Vinton; no area code is a micropolitan CBSA's; every Census metro county is on its own metro
   ('00' + CBSA, 0 differ); Connecticut's areas are planning regions 09110-09190 only.
3. Gallia 39053, Construction Laborers 47-2061, median: rules 12 -> 23.96 from 3900004; rules 11 -> the Ohio statewide row
   (3900000).
4. An occupation 3900004 does not publish: rules 12 -> Ohio x the area's ratio (median over SOC 47- of area / state,
   printed), its source "no figure for the Southern Ohio local wage area: Ohio median $X x 0.NNN".
5. A metro county (Harris 48201) gives the same figure under rules 11 and 12, every mapped SOC, median and p75.
6. A pre-2022 Connecticut county (09001) at ZIP 06825 takes the ZIP's planning region 09120 (Bridgeport metro), said
   so; American Samoa 60010 (no OEWS area, no state row) goes national.
7. Saved sets keep their rules: Gallia and Harris priced by rules 11 with the market as loaded equal the same with every
   nonmetro area's rows and the definitions taken out (the load moves no rules-11 figure there), every craft and
   subtype to the cent.
8. A county whose metro was not loaded before tonight (Hamilton OH 39061, Cincinnati 0017140) is on its metro by 12.
9. The note: `wages_12` (rules 12) in `WAGE_NOTES` and `KNOWN`; 11 -> 12 owes wages_12; 6 -> 12's chain key is "wages";
   `_cause_key` files a 6 -> 12 move under wages_12 when only rules 12 changed its figures, keeps "wages" otherwise.
10. Words: Gallia's source "Local market (Southern Ohio local wage area): BLS May 2025 survey, median $23.96.", its
   market area "Southern Ohio local wage area", the sentence "Southern Ohio market rate for laborers, ...".
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import copy
from datetime import UTC, date, datetime
from types import SimpleNamespace

BID = date(2026, 11, 26)
SOUTHERN_OHIO = "3900004"
SO_COUNTIES = {"39001", "39009", "39027", "39047", "39053", "39071", "39079", "39105", "39131", "39141", "39145",
               "39163"}


def check(wrong: list[str], rid: str, got: object, want: object) -> None:
    if got != want:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


def main() -> int:
    from app.features.estimate import rule_notes
    from app.features.estimate.rule_notes import KNOWN, WAGE_NOTES, wage_move, wage_move_chain
    from app.features.wage_calculator import service
    from app.features.wage_calculator.schemas import RateRequest
    from app.wagecalc import w14
    from app.wagecalc.bls_load import mapped_socs
    from app.wagecalc.data import RefData
    from app.wagecalc.market import load_market
    from app.wagecalc.rates import NONMETRO_RULES, WAGE_RULES, MarketContext, Settings
    from app.database import sync_engine

    ref, market = RefData(), load_market()
    with sync_engine.connect() as conn:
        socs = mapped_socs(conn)
    wrong: list[str] = []
    rows = 0

    # 1
    check(wrong, "d1382-rules", (WAGE_RULES >= 12, NONMETRO_RULES), (True, 12))
    rows += 1

    # 2
    kinds = [k for _, k in market.area_names.values()]
    check(wrong, "d1382-defs-shape", (market.area_vintage, len(market.area_names), kinds.count("metro"),
                                      kinds.count("nonmetro"), len(market.county_area)),
          (date(2025, 5, 1), 528, 393, 135, 3222))
    used = set(market.county_area.values())
    check(wrong, "d1382-defs-nonmetro-has-county",
          sorted(c for c, (_, k) in market.area_names.items() if k == "nonmetro" and c not in used), [])
    check(wrong, "d1382-defs-southern-ohio", {f for f, c in market.county_area.items() if c == SOUTHERN_OHIO},
          SO_COUNTIES)
    micro = {"00" + c for c, _, k in market.county_cbsa.values() if k == "micro"}
    check(wrong, "d1382-defs-no-micro", sorted(micro & set(market.area_names)), [])
    differ = sorted(f for f, (c, _, k) in market.county_cbsa.items() if k == "metro"
                    and market.county_area.get(f) != "00" + c)
    check(wrong, "d1382-defs-census-metros-same", differ, [])
    ct = sorted(f for f in market.county_area if f.startswith("09"))
    check(wrong, "d1382-defs-connecticut-regions", ct, [f"091{n}0" for n in range(1, 10)])
    rows += 6

    # 3
    g12 = market.oews_for("47-2061", "39053", "39", "median", True)
    g11 = market.oews_for("47-2061", "39053", "39", "median", False)
    ohio = market.oews.get(("S", "3900000", "47-2061"))
    check(wrong, "d1382-gallia-laborer-r12", (g12.area_type, g12.area_code, round(g12.value, 2)) if g12 else None,
          ("M", SOUTHERN_OHIO, 23.96))
    check(wrong, "d1382-gallia-laborer-r11", (g11.area_type, g11.area_code, g11.value) if g11 else None,
          ("S", "3900000", ohio[1] if ohio else None))
    rows += 2

    # 4
    missing = next(s for s in socs if s.startswith("47-") and ("M", SOUTHERN_OHIO, s) not in market.oews
                   and (market.oews.get(("S", "3900000", s)) or (None, None))[1] is not None)
    state = market.oews[("S", "3900000", missing)]
    ratio = market.metro_ratio(SOUTHERN_OHIO, "3900000", state[0], "median")
    sc = market.oews_for(missing, "39053", "39", "median", True)
    check(wrong, "d1382-scaled-state", (sc.area_code, round(sc.value, 6)) if sc else None,
          (SOUTHERN_OHIO, round(state[1] * ratio, 6) if ratio else None))
    check(wrong, "d1382-scaled-said",
          bool(sc) and "(no figure for the Southern Ohio local wage area: Ohio median $" in sc.plain(), True)
    rows += 2

    # 5
    diff = [(s, p) for s in socs for p in ("median", "p75")
            if (lambda a, b: (a.value if a else None) != (b.value if b else None))(
                market.oews_for(s, "48201", "48", p, True), market.oews_for(s, "48201", "48", p, False))]
    check(wrong, "d1382-harris-same-11-12", diff, [])
    rows += 1

    # 6
    def compute(rules: int, zip5: str, county: str, mk: object = market) -> dict:
        project = SimpleNamespace(id=-1, postal_code=zip5, county=None, state=None, bid_due_date=BID,
                                  work_type="site_civil", project_type="commercial")
        body = RateRequest(project_type="commercial", wage_determination="open_shop", pricing_basis="direct",
                           zip=zip5, county_fips=county)
        wd = service._W14Wd(None, None, {}, None)
        return service._compute(ref, project, body, Settings(), mk, rules=rules, wd_rates=[], wd=wd).rs

    ctp = market.oews_for("47-2061", "09001", "09", "median", True, "09120")
    check(wrong, "d1382-ct-old-county-region", (ctp.area_code, ctp.via) if ctp else None,
          ("0014860", "the ZIP's planning region"))
    ct12 = compute(12, "06825", "09001")
    check(wrong, "d1382-ct-old-county-priced", any("the ZIP's planning region" in s
                                                 for s in ct12["crafts"]["CC-16"].get("source") or []), True)
    sam = market.oews_for("47-2061", "60010", "60", "median", True)
    check(wrong, "d1382-american-samoa-national", sam.area_type if sam else None, "N")
    rows += 3

    # 7
    bare = copy.copy(market)
    nonmetro = {c for c, (_, k) in market.area_names.items() if k == "nonmetro"}
    bare.oews = {k: v for k, v in market.oews.items() if not (k[0] == "M" and k[1] in nonmetro)}
    bare.county_area, bare.area_names = {}, {}

    def rates(rs: dict) -> tuple:
        return ({c: v.get("rate") for c, v in rs["crafts"].items()},
                {c: {s: x.get("rate") for s, x in subs.items()} for c, subs in (rs.get("subtypes") or {}).items()})

    for name, zip5, county in (("gallia", "45614", "39053"), ("harris", "77571", "48201")):
        check(wrong, f"d1382-r11-unmoved-{name}", rates(compute(11, zip5, county)) == rates(compute(11, zip5, county,
                                                                                                    bare)), True)
    rows += 2

    # 8
    ham = market.oews_for("47-2061", "39061", "39", "median", True)
    check(wrong, "d1382-new-metro-hamilton", (ham.area_type, ham.area_code) if ham else None, ("M", "0017140"))
    rows += 1

    # 9
    def ws(rules: int, at: str) -> SimpleNamespace:
        return SimpleNamespace(wage_rules=rules, created_at=datetime.fromisoformat(at).replace(tzinfo=UTC),
                               zip="45614", county_fips="39053", project_type="commercial",
                               wage_determination="open_shop", pricing_basis="burdened", basis="national_average",
                               wd_import_id=None, union_agreement_id=None)

    now12 = ws(12, "2026-11-26T23:00:00")
    check(wrong, "d1382-note-key", (WAGE_NOTES.get("wages_12"), "wages_12" in KNOWN), (12, True))
    got = wage_move(now12, [ws(11, "2026-11-26T08:00:00")])  # type: ignore[arg-type]
    check(wrong, "d1382-note-11-to-12", got[0] if got else None, "wages_12")
    step = wage_move_chain(now12, [ws(6, "2026-11-12T08:00:00")])[0]  # type: ignore[arg-type]
    a, b = ({"CC-16": 1}, {}), ({"CC-16": 2}, {})
    check(wrong, "d1382-note-6-to-12-cause",
          (step.key, rule_notes._cause_key(step, a, a, b), rule_notes._cause_key(step, a, b, b),
           rule_notes._cause_key(step, a, None, a)),
          ("wages", "wages_12", "wages", "wages"))
    rows += 3

    # 10
    check(wrong, "d1382-words-source", g12.plain() if g12 else None,
          "Local market (Southern Ohio local wage area): BLS May 2025 survey, median $23.96.")
    ctx = MarketContext(market=market, bid_date=BID, edition_date=date(2026, 1, 1), county_fips="39053", state="OH",
                        state_fips="39", nonmetro=True)
    hctx = MarketContext(market=market, bid_date=BID, edition_date=date(2026, 1, 1), county_fips="48201", state="TX",
                         state_fips="48", nonmetro=True)
    check(wrong, "d1382-words-area", (ctx.market_area(), hctx.market_area()),
          ("Southern Ohio local wage area", "Houston metro"))
    check(wrong, "d1382-words-sentence", w14.market_sentence(ctx.market_area(), "Laborer", BID),
          "Southern Ohio market rate for laborers, updated to Nov 2026.")
    g = compute(12, "45614", "39053")
    check(wrong, "d1382-words-gallia-laborer", any("Local market (Southern Ohio local wage area)" in s
                                                  for s in g["crafts"]["CC-16"].get("source") or []), True)
    rows += 4

    for w in wrong:
        print(w)
    print(f"local wage areas, wage rules 12 (D-1382): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}"
          f" (scaled {missing}: Ohio {state[1]:.2f} x {ratio:.4f}; {len(market.area_names)} areas,"
          f" {len(market.county_area)} counties, vintage {market.area_vintage})")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(main())

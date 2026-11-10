"""The shared quantity table through the api's quantity engine (D-61, kept by D-68).

Reads the cases on stdin (written by `browser/quantity-table.mjs` with GEN=1), prints each
row's figure as the api stores it. Pure: no database, no network. `./quantity-table.sh`
runs both halves.

    docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py" <cases.json

With `register`, it reads F18's registration rows instead and fits each through the api's
`earthwork/register.py` (D-188). With `site`, F19's join and placement rows through
`earthwork/site.py` (D-231). With `credits`, F14's credit rows through the api's
`ai/meter.py` (D-236): metering, the estimate, holds, settlement, refunds and refills. With
`seed`, the assembly seed rows through the api's component copy (D-243). With `subitems`,
the sub-item formula rows through `sub_items.py` and `formula.py` (D-244, D-245). With
`scaleundo`, the scale undo rows (D-642): the one mode that opens the database, for a temporary
table of the calibration column's own type, never committed. With `roles`, the wage roles a
determination lists (D-753 option C): its rows are here, it reads no stdin, and it prints one line.
With `wages`, the wage core (D-1032: W1 open shop, W7 foreman, W12 escalation) on Harris County TX,
read from the bench's loaded BLS tables (it reads the database, never writes); one line, as `roles`.
With `prevailing`, prevailing wage by classification (D-1038: W3 subtypes and the operator that follows
its machine, W4 not covered, W7 foreman) on Mohave County AZ's Highway WD; one line, as `wages`.
With `union`, union agreements (D-1041: W5, an agreement's craft through the burden engine, cash fringe
taxed and plan fringe not, a craft not in it at commercial x (1 + F)) in Mohave County AZ; one line.
With `hidden`, an earthwork activity hidden from suggestions (D-759): on a temporary workspace made
and rolled back in one transaction, every starter line role maps to the same activity, default
production and tier with its activity hidden as shown; it reads no stdin and prints one line.
With `onsite`, small quantities on machines already on site (D-1040) through `equipment/on_site.py`:
under and over the threshold, with and without a machine able to do the work; pure, one line.
With `pool`, one equipment pool per job (D-1115) through `equipment/pool.py` and the leftover hour; pure, one line.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import json
import math
import sys
from decimal import Decimal
from types import SimpleNamespace

from app.features.ai import meter
from app.features.assembly.models import COMPONENT_COPY_FIELDS as COPY_FIELDS
from app.features.assembly.models import AssemblyComponent, component_fields
from app.features.earthwork import georef, register, site
from app.features.estimate.models import TakeoffCostComponent
from app.features.takeoff import formula_system, quantity, sub_items
from app.features.takeoff.formula import FormulaEnv, evaluate
from app.features.takeoff.models import TakeoffItemType


def figure(case: dict) -> float:
    page = (float(case["page"][0]), float(case["page"][1]))
    fpp = float(case["fpp"])
    kind = TakeoffItemType(case["type"])
    shapes = case["shapes"]
    if kind is TakeoffItemType.SF:
        positives = [(s["vertices"], s["meta"]) for s in shapes if s.get("role") != "subtract"]
        deducts = [(s["vertices"], s["meta"]) for s in shapes if s.get("role") == "subtract"]
        base = quantity.area_on_sheet(positives, deducts, fpp, page)
    else:
        base = sum(quantity.compute(kind, s["vertices"], s["meta"], fpp, page) for s in shapes)
    mods = case.get("mods")
    if not mods:
        return base
    # A row with `mods` (D-360): the measured figure through the item's modifiers.
    return quantity.apply_modifiers(
        base,
        item_type=kind,
        height_ft=mods.get("heightFt"),
        pitch_factor=mods.get("pitchFactor"),
        folder_multiplier=1.0,
        layer_multiplier=1.0,
        volume_width_ft=mods.get("volumeWidthFt"),
        volume_depth_ft=mods.get("volumeDepthFt"),
        result_unit=mods.get("resultUnit"),
    )


def coordinates(case: dict) -> dict:
    """GPS Export's coordinates rows (D-672) through the api's `earthwork/georef.py`."""
    s = case["scale"]
    scale = georef.Scale(float(s[0]), float(s[1]), float(s[2]))
    points = [
        georef.ControlPoint(f"CP-{i + 1}", p[0], p[1], p[2], p[3], len(p) > 4 and bool(p[4]))
        for i, p in enumerate(case["points"])
    ]
    try:
        fit = georef.fit_georef(points, scale, case["units"], case.get("fitScale") is not False)
    except georef.FitError as error:
        return {"ok": False, "reason": error.reason}
    degrees = math.degrees(fit.rotation) % 360
    out: dict = {
        "ok": True,
        "rotationDeg": degrees - 360 if degrees > 180 else degrees,
        "scale": fit.scale,
        "maxResidual": max(fit.residuals),
        "rms": fit.rms,
    }
    # The fourth-monument check (D-674): the largest check point's miss.
    checks = [r for r, p in zip(fit.residuals, points, strict=True) if p.check]
    if checks:
        out["checkMiss"] = max(checks)
    if case.get("probe"):
        e, n = georef.plan_of(case["probe"][0], case["probe"][1], scale, case["units"])
        cos, sin = math.cos(fit.rotation) * fit.scale, math.sin(fit.rotation) * fit.scale
        grid_e, grid_n = cos * e - sin * n + fit.e0, sin * e + cos * n + fit.n0
        out["probe"] = f"{_short(grid_n)},{_short(grid_e)}"
    return out


def registration(case: dict) -> dict:
    if case.get("kind") == "georef":
        return coordinates(case)

    def scale(s: list) -> register.SheetScale:
        return register.SheetScale(float(s[0]), float(s[1]), float(s[2]))

    src, tgt = scale(case["src"]), scale(case["tgt"])
    pairs = [register.Pair((p[0][0], p[0][1]), (p[1][0], p[1][1])) for p in case["pairs"]]
    try:
        fit = register.fit_rigid(pairs, src, tgt, fit_scale=bool(case.get("fitScale")))
    except register.FitError as error:
        return {"ok": False, "reason": error.reason}
    degrees = math.degrees(fit.rotation) % 360
    out: dict = {
        "ok": True,
        "rotationDeg": degrees - 360 if degrees > 180 else degrees,
        "scale": fit.scale,
        "maxResidualFt": max(fit.residuals_ft),
    }
    if fit.distance is not None:
        out["diffPct"] = fit.distance.diff_pct
        out["level"] = fit.distance.level
    if case.get("probe"):
        x, y = register.map_point((case["probe"][0], case["probe"][1]), fit, src, tgt)
        out["probe"] = f"{_short(x)},{_short(y)}"
    return out


def site_row(case: dict) -> dict:
    """F19's join and placement rows through the api's `earthwork/site.py` (D-231)."""

    def scale(s: list) -> register.SheetScale:
        return register.SheetScale(float(s[0]), float(s[1]), float(s[2]))

    def degrees(rotation: float) -> float:
        d = math.degrees(rotation) % 360
        return d - 360 if d > 180 else d

    if case["kind"] == "place":
        b, f = case["base"], case["fit"]
        placed = site.place_member(
            site.Placement(math.radians(b["rotationDeg"]), b["scale"], b["tx"], b["ty"]),
            site.Placement(math.radians(f["rotationDeg"]), f["scale"], f["tx"], f["ty"]),
        )
        return {"rotationDeg": degrees(placed.rotation), "scale": placed.scale, "tx": placed.tx, "ty": placed.ty}
    src, tgt = scale(case["src"]), scale(case["tgt"])
    points = lambda line: [(float(x), float(y)) for x, y in line]  # noqa: E731
    centre = lambda key: tuple(case[key]) if case.get(key) else (0.5, 0.5)  # noqa: E731
    try:
        join = site.fit_join(
            points(case["source"]),
            src,
            points(case["target"]),
            tgt,
            fit_scale=bool(case.get("fitScale")),
            source_centre=centre("sourceCentre"),
            target_centre=centre("targetCentre"),
        )
    except register.FitError as error:
        return {"ok": False, "reason": error.reason}
    fit = join.fit
    out: dict = {
        "ok": True,
        "reversed": join.reversed,
        "rotationDeg": degrees(fit.rotation),
        "scale": fit.scale,
        "missFt": join.miss_ft,
    }
    if fit.distance is not None:
        out["diffPct"] = fit.distance.diff_pct
        out["level"] = fit.distance.level
    if case.get("probe"):
        x, y = register.map_point((case["probe"][0], case["probe"][1]), fit, src, tgt)
        out["probe"] = f"{_short(x)},{_short(y)}"
    return out


def _short(v: float) -> str:
    """As the browser's `+v.toFixed(9)` prints it."""
    text = f"{round(v, 9):.9f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def _four(value: Decimal) -> str:
    return str(value.quantize(meter.FOUR))


def credit(case: dict) -> dict:
    def price(p: list) -> meter.Price:
        return meter.Price(Decimal(p[0]), Decimal(p[1]))

    if case["kind"] == "price":
        regime = meter.Regime(Decimal(case["regime"][0]), Decimal(case["regime"][1]))
        return {"credits": _four(meter.credits(case["tokensIn"], case["tokensOut"], price(case["price"]), regime))}
    if case["kind"] == "cost":
        cost = meter.cost_usd(case["tokensIn"], case["tokensOut"], price(case["price"]))
        return {"costUsd": str(cost.quantize(Decimal("0.00000001")))}
    if case["kind"] == "estimate":
        regime = meter.Regime(Decimal(case["regime"][0]), Decimal(case["regime"][1]))
        tokens_in = meter.input_tokens(case["provider"], case["promptChars"], case["width"], case["height"])
        est = meter.estimate(case["tool"], tokens_in, case["typicalOut"], price(case["price"]), regime)
        return {"tokensIn": tokens_in, "estimate": _four(est.estimate), "ceiling": _four(est.ceiling)}
    if case["kind"] == "chain":
        regime = meter.Regime(Decimal(case["regime"][0]), Decimal(case["regime"][1]))
        chain = [(name, price(p)) for name, p in case["chain"]]
        tokens_in, est = meter.chain_estimate(case["tool"], case["promptChars"], case["width"], case["height"], case["typicalOut"], chain, regime)
        return {"tokensIn": tokens_in, "estimate": _four(est.estimate), "ceiling": _four(est.ceiling)}
    if case["kind"] == "attempts":
        # The service's loop (D-252 5): each model in order until one answers.
        regime = meter.Regime(Decimal(case["regime"][0]), Decimal(case["regime"][1]))
        charges: list[str] = []
        answered = None
        for i, (tokens, p) in enumerate(zip(case["attempts"], case["prices"], strict=True)):
            charges.append(_four(meter.attempt_charge(tuple(tokens) if tokens else None, price(p), regime)))
            if tokens is not None:
                answered = i
                break
        return {"charges": charges, "answered": answered}
    inc, pur, held = (Decimal(v) for v in case["start"])
    wallet = meter.Wallet(inc, pur, held)
    charged = Decimal(0)
    refused = None
    for op in case["ops"]:
        if op[0] == "hold":
            caps = op[2] if len(op) > 2 else {}
            room = meter.Room(
                limit_left=Decimal(caps["limitLeft"]) if "limitLeft" in caps else None,
                trial_left=Decimal(caps["trialLeft"]) if "trialLeft" in caps else None,
            )
            try:
                wallet = meter.hold(wallet, Decimal(op[1]), room)
            except meter.RefusedError as error:
                refused = refused or error.reason
        elif op[0] == "settle":
            done = meter.settle(wallet, Decimal(op[1]), Decimal(op[2]))
            wallet, charged = done.wallet, charged + done.charged
        elif op[0] == "release":
            wallet = meter.release(wallet, Decimal(op[1]))
        elif op[0] == "refill":
            # Seats x the plan's credits per seat: Professional's 100 unless the row says (D-281).
            wallet = meter.refill(wallet, int(op[1]), Decimal(op[2] if len(op) > 2 else 100))
    return {
        "included": _four(wallet.included),
        "purchased": _four(wallet.purchased),
        "held": _four(wallet.held),
        "charged": _four(charged),
        "refused": refused,
    }


def seed(case: dict) -> list[dict]:
    """Seed from… an assembly (D-243): each template component through the api's copy, as
    `_copy_host_components` writes it onto the seeded sub-item."""
    out = []
    for row in case["template"]:
        template = AssemblyComponent(**{k: row[k] for k in COPY_FIELDS if k in row})
        copied = TakeoffCostComponent(**component_fields(template))
        out.append({k: _plain(getattr(copied, k)) for k in COPY_FIELDS})
    return out


def _plain(value: object) -> object:
    return float(value) if isinstance(value, Decimal) else value


def subitem(case: dict) -> float | dict:
    """A sub-item's formula against its drawn parent, as `recompute_children` reads it
    (D-244, D-245)."""
    kind = TakeoffItemType(case["type"])
    dims = {key: float(feet) for key, feet in case["dims"].items()}
    if kind is TakeoffItemType.COUNT:
        env = FormulaEnv(parent=float(case["count"]), count_ea=float(case["count"]), dims=dims)
    else:
        page = (float(case["page"][0]), float(case["page"][1]))
        runs = [
            SimpleNamespace(vertices_json=s, shape_meta={"closed": True} if kind is TakeoffItemType.SF else None, sheet_id=1, role="add", geom_type=kind)
            for s in case["shapes"]
        ]
        prims = sub_items.parent_primitives(kind, runs, {1: (float(case["fpp"]), page)})  # type: ignore[arg-type]
        parent = prims["area_sf"] if kind is TakeoffItemType.SF else prims["linear_ft"]
        env = FormulaEnv(parent=parent, dims=dims, **prims)  # type: ignore[arg-type]
    result = evaluate(case["formula"], env)
    return result.value if result.ok and result.value is not None else {"error": result.error}


def fx_system(case: dict) -> object:
    """A sub-item formula in the project's system (metric Phase E), as recompute reads it."""
    def floats(key: str) -> dict[str, float]:
        return {k: float(v) for k, v in (case.get(key) or {}).items()}

    env = FormulaEnv(
        parent=float(case["parent"]), dims=floats("dims"), subs=floats("subs"), refs=floats("refs")
    )
    result = formula_system.evaluate_in_system(
        case["formula"],
        env,
        system=case["system"],
        parent_unit=case.get("parentUnit"),
        result_unit=case.get("resultUnit"),
        sub_units=case.get("subUnits") or {},
        ref_units=case.get("refUnits") or {},
    )
    return result.value if result.ok and result.value is not None else {"error": result.error}


async def scale_undo(rows: list[dict]) -> list[dict]:
    """D-642: each scale stored and read back as the calibration's own column does it (a temporary
    table of the same type, on the app's own driver; nothing else is touched), the undo's value
    sent through the restore schema and JSON, and each figure through the api's engine."""
    from sqlalchemy import Column, MetaData, Numeric, Table, insert, select
    from sqlalchemy import text as sql

    from app.database import SessionFactory
    from app.features.drawing.schemas import CalibrationRestore

    held = Table("qt_scale", MetaData(), Column("v", Numeric(24, 12)), prefixes=["TEMPORARY"])
    out = []
    async with SessionFactory() as session:
        await session.execute(sql("CREATE TEMPORARY TABLE qt_scale (v numeric(24,12))"))

        async def stored(value: float) -> float:
            await session.execute(sql("DELETE FROM qt_scale"))
            await session.execute(insert(held).values(v=value))
            return float(await session.scalar(select(held.c.v)))

        def through_undo(value: float) -> float:
            # The app sends what it read; the api validates it into the restore schema.
            body = json.loads(json.dumps({"feet_per_norm": value}))
            return CalibrationRestore(
                p1_x_norm=0, p1_y_norm=0, p2_x_norm=1, p2_y_norm=0, real_distance_ft=1, **body
            ).feet_per_norm

        for row in rows:
            page = row["page"]
            (x1, y1), (x2, y2) = row["a"]["points"]
            # set_calibration's own arithmetic: feet over the points' distance in points.
            fpp_a = row["a"]["feet"] / math.hypot((x2 - x1) * page[0], (y2 - y1) * page[1])
            a = await stored(fpp_a)
            b = await stored(float(row["b"]["fpp"]))
            a_back = await stored(through_undo(a))
            b_again = await stored(through_undo(b))
            out.append(
                {
                    "id": row["id"],
                    "value": {
                        "fppA": a,
                        "fppB": b,
                        "fppA2": a_back,
                        "fppB2": b_again,
                        "qA": figure({**row, "fpp": a}),
                        "qB": figure({**row, "fpp": b}),
                        "qA2": figure({**row, "fpp": a_back}),
                        "qB2": figure({**row, "fpp": b_again}),
                    },
                }
            )
        await session.rollback()
    return out


# D-753 option C on zz WD check (D-753): AR20260046 (Heavy), Boone County AR (labour -27.431 %),
# Davis-Bacon, burdened, company defaults. Laborer's determination line $12.50 + $1.18; Pipelayer's
# $12.56 + $1.19. By hand: Pipelayer floor 12.56 + 1.19 + taxes (12.56 x 7.65 % + FUTA 0.021 +
# SUTA 0.07 = 1.0518) + workers' comp 14.50 % x 12.56 (1.8212) + insurance 3 % x 12.56 (0.3768) =
# $17.00; market $37.26 x 12.56 / 12.50 = $37.44; "higher of" prices $37.44; the determination
# alone ("wd_only") prices the floor $17.00. Laborer stays $37.26 (national 51.34 x 0.72569 over
# its $16.91 floor).
ROLE_CASES = [
    {"id": "role-c-pipelayer", "policy": "higher_of", "line": (12.56, 1.19, 0.0), "expect": {"floor": 17.00, "market": 37.44, "rate": 37.44}},
    {"id": "role-c-pipelayer-wd-only", "policy": "wd_only", "line": (12.56, 1.19, 0.0), "expect": {"floor": 17.00, "market": 37.44, "rate": 17.00}},
    {"id": "role-c-laborer-stays", "policy": "higher_of", "line": (12.50, 1.18, 0.0), "expect": {"floor": 16.91, "market": 37.26, "rate": 37.26}},
]


def roles() -> int:
    from app.wagecalc.data import RefData
    from app.wagecalc.rates import Settings, role_rate

    ref = RefData()
    wrong = []
    for c in ROLE_CASES:
        got = role_rate(ref, "CC-16", c["line"], 12.50, -0.27431, "AR", "prevailing_federal", False, Settings(public_policy=c["policy"]))
        for k, want in c["expect"].items():
            if round(got[k] * 100) != round(want * 100):
                wrong.append(f"FAIL  {c['id']}.{k}: {got[k]}, expected {want}")
    # D-1056: the pipelayer as the WD's Laborer group (W3) prices as D-753's role, max(WD $17.00,
    # $37.26 x 12.56 / 12.50) = $37.44; the Laborer's own line stays $37.26.
    from app.wagecalc.rates import prevailing_rate

    s = Settings(public_policy="higher_of")
    grouped = prevailing_rate(ref, "CC-16", (12.56, 1.19, 0.0), -0.27431, "AR", "prevailing_federal", False, s, 7.25, "LABORER: PIPELAYER", ratio=12.56 / 12.50)
    own = prevailing_rate(ref, "CC-16", (12.50, 1.18, 0.0), -0.27431, "AR", "prevailing_federal", False, s, 7.25, "LABORER: COMMON OR GENERAL")
    for rid, got_rate, want in (("role-group-pipelayer", grouped["rate"], 37.44), ("role-group-laborer", own["rate"], 37.26)):
        if round(got_rate * 100) != round(want * 100):
            wrong.append(f"FAIL  {rid}: {got_rate}, expected {want}")
    for w in wrong:
        print(w)
    print(f"wage roles: {len(ROLE_CASES) + 2} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


# The wage core (WAGE_PLAN W1, W7, W12; D-1032), Harris County TX (ZIP 77002, county 48201, labour
# F = +17.771 %), open shop, private commercial, burdened, company defaults, bid date 2026-11-06, on the
# bench's loaded BLS tables (ECI CIU2022300000000I to 2026 Q3, OEWS May 2025). By hand: ECI Dec 2025
# 171.488 (2026-01-01 is 1/31 month into Q1: 171.4924), Sep 2026 175.430 carried 37 days at the 12-month
# 3.0 % = 175.9635: the National Estimator table +2.61 %; May 2025 = Q1 + 2/3 (Q2 - Q1) = 168.0367:
# OEWS +4.72 %. Base = max(residential base x (1 + min(0, F)) x 1.0261, OEWS p75 Houston x 1.0472, TX
# 7.25): laborer 25.94 -> 26.62, operator 37.21 -> 38.18, truck p75 30.97 -> 32.43 (residential 28.82),
# carpenter 32.08 -> 32.92, plumber 37.64 -> 38.62, painter 33.09 -> 33.95. Burdened = the burden engine
# on that base, not below the residential burdened rate x 1.0261: the floor wins for all but the truck
# (laborer 37.40 -> 38.38, operator 51.09 -> 52.42, carpenter 45.88 -> 47.08, plumber 51.49 -> 52.83,
# painter 45.39 -> 46.57); the truck's engine figure 32.43 + benefits 12 % 3.89 + taxes 2.78 + WC
# 8.49 % 2.75 + GL 3 % 0.97 = 42.83 (the plan's 44.88 used the residential ratio 38.87 / 28.09 instead).
# Foreman (W7): crew top x 1.10, operator crew 52.42 -> 57.66, laborer crew 38.38 -> 42.22; a crew's
# own 15 % on the operator crew 60.28.
WAGE_CASES = [
    {"id": "wage-laborer", "craft": "CC-16", "expect": {"base": 26.62, "burdened": 38.38, "rule": "residential_base"}},
    {"id": "wage-operator", "craft": "CC-11", "expect": {"base": 38.18, "burdened": 52.42, "rule": "residential_base"}},
    {"id": "wage-truck", "craft": "CC-31", "expect": {"base": 32.43, "burdened": 42.83, "rule": "oews_p75"}},
    {"id": "wage-carpenter", "craft": "CC-05", "expect": {"base": 32.92, "burdened": 47.08, "rule": "residential_base"}},
    {"id": "wage-plumber", "craft": "CC-25", "expect": {"base": 38.62, "burdened": 52.83, "rule": "residential_base"}},
    {"id": "wage-painter", "craft": "CC-20", "expect": {"base": 33.95, "burdened": 46.57, "rule": "residential_base"}},
]
WAGE_ESCALATION = {"ne_pct": 2.61, "oews_pct": 4.72}
# W14 (D-1087), the same place and date, direct, no WD lines (BLS alone), company defaults. By hand: the national
# open-shop laborer 25.94 x 1.17771 x 1.0261 = 31.3471; local BLS 19.88 x 1.0472 = 20.82, under the $22.00 minimum:
# 22.00; gap 42.49 %, weight 1/3 - 0.1249 x 0.0833 / 0.2 = 0.2813; base 22 + 9.3471 x 0.2813 = 24.63. Prevailing, no
# WD line: 24.6294 x 1.14 = 28.08. Union, nothing entered: 28.0775 x 1.14 = 32.01 (cap 38.04 x 1.17771 = 44.80).
W14_LABORER = {
    "open_shop": (24.63, "w14_open_shop"),
    "prevailing_federal": (28.08, "w14_prevailing"),
    "union_cba": (32.01, "w14_union"),
}
# D-1090: the pipelayer's open shop from its own BLS occupation, 47-2151 (Pipelayers). By hand: Houston metro median
# 21.71 x 1.0472 = 22.73 (over the $22.00 minimum); national 31.3471, gap 37.9 %, weight 1/3 - 0.0790 x 0.0833 / 0.2
# = 0.3004; base 22.734 + 8.613 x 0.3004 = 25.32 (the laborer's level is 24.63).
W14_PIPELAYER = 25.32
# D-1090: the WD truck driver is the Teamsters' general line, over a "DUMP TRUCK ONLY" line and over another craft's
# truck-driver line; a footnote's weekly benefit ($438.61 a week) adds to the fringe at 40 h: 15.09 + 10.97 = 26.06.
WD_TRUCK_LINES = [
    {"classification": "ELECTRICIAN: GROUND MAN TRUCK DRIVER", "base": 40.10, "fringe": 20.00},
    {"classification": "TRUCK DRIVERS:: DUMP TRUCK ONLY", "base": 32.00, "fringe": 0.0},
    {"classification": "TRUCK DRIVERS:: INCLUDES DUMP TRUCK, TRACTOR TRAILER (ERIE COUNTY)", "base": 47.18, "fringe": 15.09},
]
WD_WEEKLY = ("HEALTH AND WELFARE $438.61 PER WEEK", 15.09, 26.06)
WAGE_FOREMEN = [
    {"id": "foreman-operator-crew", "crew": ["CC-11", "CC-16"], "premium": None, "expect": 57.66},
    {"id": "foreman-laborer-crew", "crew": ["CC-16"], "premium": None, "expect": 42.22},
    {"id": "foreman-own-premium", "crew": ["CC-11", "CC-16"], "premium": 0.15, "expect": 60.28},
]


# D-1047 items 2 and 13, for every craft (and subtype) each wage mode prices, on both bases: (a) the
# breakdown's parts add to the rate within $0.01, with no "Unexplained difference" line (a raise to a
# minimum is its own named line); (b) a helper or tender is never paid more than its trade.
WAGE_HELPERS = [
    ("CC-36", "CC-35", "tile finisher <= tile setter"),
    ("CC-04", "CC-03", "bricklayer tender <= bricklayer"),
    ("CC-34", "CC-05", "carpenter helper <= carpenter"),
    ("CC-32", "CC-09", "electrician helper <= electrician"),
    ("CC-33", "CC-25", "pipe trades helper <= plumber"),
    ("CC-33", "CC-22", "pipe trades helper <= pipefitter"),
]


def wage_gates(ref, name: str, build) -> tuple[int, list[str]]:
    """`build(pricing_basis)` returns a rate set; one parts row and one helpers row per basis."""
    from app.wagecalc.rates import UNEXPLAINED, breakdown

    rows, wrong = 0, []
    for basis in ("burdened", "direct"):
        rs = build(basis)
        direct, lf = basis == "direct", rs["location"]["labor"]
        items = [(code, code, v) for code, v in rs["crafts"].items()]
        items += [(f"{code}:{key}", code, v) for code, subs in rs["subtypes"].items() for key, v in subs.items()]
        for label, code, v in items:
            parts = breakdown(ref, code, v, direct, lf)
            total = sum(part["amount"] for part in parts)
            if abs(total - v["rate"]) > 0.0101 or any(part["label"] == UNEXPLAINED for part in parts):
                shown = "; ".join(f"{part['label']} {part['amount']:.2f}" for part in parts)
                wrong.append(f"FAIL  {name}-parts-{basis}.{label}: {total:.2f} ({shown}), rate {v['rate']:.2f}")
        for helper, trade, said in WAGE_HELPERS:
            h, t = rs["crafts"][helper]["rate"], rs["crafts"][trade]["rate"]
            if h > t + 0.005:
                wrong.append(f"FAIL  {name}-helper-{basis}: {said}: {h:.2f} > {t:.2f}")
        rows += 2
    return rows, wrong


# The tile finisher on an open shop (D-1047 item 13): no national open-shop rate, so its own SOC's local
# market figure, BLS 47-3011 (helpers of tile and marble setters); Houston has no metro row, so Texas p75
# $21.35 x OEWS escalation 1.0472 = $22.36, through the burden engine, no national floor (it read the
# union-scale table's $32.26 before, above the tile setter's $30.89 base).
# D-1095: Houston has no metro row for 47-3011: Texas p75 $21.35 x Houston's construction ratio to Texas at p75 (1.007) =
# $21.50 x 1.0472 = $22.51, labelled as the metro's.
WAGE_TILE_FINISHER = {"base": 22.51, "rule": "oews_p75", "source": "Local market (Houston metro):"}


def wages() -> int:
    from datetime import date
    from decimal import Decimal

    from app.features.wage_calculator.labor import ForemanContext, price_foremen
    from app.wagecalc.data import RefData
    from app.wagecalc.market import load_market, month_end
    from app.wagecalc.rates import build_rate_set

    ref, market = RefData(), load_market()
    bid = date(2026, 11, 6)
    wrong = []
    esc = {
        "ne_pct": market.escalate(market.editions[ref.edition_id], bid).pct,
        "oews_pct": market.escalate(month_end(date(2025, 5, 1)), bid).pct,
    }
    for k, want in WAGE_ESCALATION.items():
        if round(esc[k] * 100) != round(want * 100):
            wrong.append(f"FAIL  wage-escalation.{k}: {esc[k]:.4f}, expected {want}")
    # The W1 rows price by rules 4, the rules a set saved before W14 keeps (D-1087).
    rs = build_rate_set(ref, project_type="commercial", zip5="77002", county_fips="48201", wage_determination="open_shop",
                        pricing_basis="burdened", market=market, bid_date=bid, edition_date=market.editions[ref.edition_id], rules=4)
    for wd_type, want in W14_LABORER.items():
        w = build_rate_set(ref, project_type="commercial", zip5="77002", county_fips="48201", wage_determination=wd_type,
                           pricing_basis="direct", market=market, bid_date=bid, edition_date=market.editions[ref.edition_id])
        got = w["crafts"]["CC-16"]
        if round(got["payable"] * 100) != round(want[0] * 100) or got["rule"] != want[1]:
            wrong.append(f"FAIL  w14-laborer-{wd_type}: {got['payable']} {got['rule']}, expected {want[0]} {want[1]}")
        # D-1089: no survey here, so the excavator is the operator's level x 1.215 (the company default) and every
        # other machine at the level; the crane is the Crane Operator craft's rate.
        subs, op = w["subtypes"]["CC-11"], w["crafts"]["CC-11"]
        if wd_type == "open_shop" and round(subs["excavator"]["base"] * 100) != round(op["base_exact"] * 1.215 * 100):
            wrong.append(f"FAIL  w14-excavator-{wd_type}: base {subs['excavator']['base']}, expected {op['base_exact']:.4f} x 1.215")
        if subs["dozer"]["payable"] != op["payable"]:
            wrong.append(f"FAIL  w14-dozer-{wd_type}: {subs['dozer']['payable']}, expected the level {op['payable']}")
        crane = w["crafts"][ref.craft_code("commercial", "Crane Operator")]
        if subs["crane"]["payable"] != crane["payable"]:
            wrong.append(f"FAIL  w14-crane-{wd_type}: {subs['crane']['payable']}, expected the Crane Operator's {crane['payable']}")
        pipe = w["subtypes"]["CC-16"]["pipelayer"]
        if wd_type == "open_shop" and round(pipe["payable"] * 100) != round(W14_PIPELAYER * 100):
            wrong.append(f"FAIL  w14-pipelayer-{wd_type}: {pipe['payable']}, expected {W14_PIPELAYER} (BLS 47-2151)")
    from app.wagecalc.wd.mapping import TRUCK, map_wd
    from app.wagecalc.wd.parser import WEEKLY_RE

    truck = map_wd(WD_TRUCK_LINES)[0][TRUCK]
    if truck["base"] != 47.18:
        wrong.append(f"FAIL  wd-truck-line: {truck['classification']} {truck['base']}, expected the general line 47.18")
    weekly = sum(float(x) for x in WEEKLY_RE.findall(WD_WEEKLY[0]))
    if round(WD_WEEKLY[1] + weekly / 40, 2) != WD_WEEKLY[2]:
        wrong.append(f"FAIL  wd-weekly-fringe: {WD_WEEKLY[1]} + {weekly}/40, expected {WD_WEEKLY[2]}")
    for c in WAGE_CASES:
        got = rs["crafts"][c["craft"]]
        for k, want in c["expect"].items():
            if (got.get(k) != want) if isinstance(want, str) else round(got[k] * 100) != round(want * 100):
                wrong.append(f"FAIL  {c['id']}.{k}: {got.get(k)}, expected {want}")
    for c in WAGE_FOREMEN:
        crew = [{"craft_code": code, "count": 1, "hourly_wage": rs["crafts"][code]["rate"]} for code in c["crew"]]
        crew.append({"foreman": True, "count": 1, "rate_source": "wage_set", **({"foreman_premium": c["premium"]} if c["premium"] is not None else {})})
        context = ForemanContext(premium=Decimal("0.10"), laborer=Decimal(str(rs["crafts"]["CC-16"]["rate"])), determination=None)
        got = (price_foremen(crew, context) or [])[-1]["hourly_wage"]
        if round(got * 100) != round(c["expect"] * 100):
            wrong.append(f"FAIL  {c['id']}: {got}, expected {c['expect']}")
    tile = rs["crafts"]["CC-36"]
    if round(tile["base"] * 100) != round(WAGE_TILE_FINISHER["base"] * 100) or tile["rule"] != WAGE_TILE_FINISHER["rule"] \
            or not (tile.get("source") or [""])[0].startswith(WAGE_TILE_FINISHER["source"]):
        wrong.append(f"FAIL  wage-tile-finisher: {tile['base']} {tile['rule']} {(tile.get('source') or [''])[0]!r}, expected {WAGE_TILE_FINISHER}")
    gate_rows, gate_wrong = wage_gates(ref, "wages", lambda basis: build_rate_set(
        ref, project_type="commercial", zip5="77002", county_fips="48201", wage_determination="open_shop",
        pricing_basis=basis, market=market, bid_date=bid, edition_date=market.editions[ref.edition_id]))
    wrong += gate_wrong
    for w in wrong:
        print(w)
    rows = len(WAGE_CASES) + len(WAGE_FOREMEN) + len(WAGE_ESCALATION) + 1 + 3 + gate_rows
    print(f"wages: {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


# Prevailing wage by classification (WAGE_PLAN W3, W4, W7; D-1038), Mohave County AZ (ZIP 85360, county
# 04015, labour F = -19.587 %), Davis-Bacon, public, burdened, company defaults, on Highway WD AZ20260046
# mod 1 (SAM.gov, 2026-05-18; its lines below as the parser reads them). Engine burden on base: Social
# Security 6.2 % + Medicare 1.45 %, FUTA 0.6 % on the first $7,000 and AZ SUTA 2.0 % on the first $8,000 (a
# year of 2,000 hours: 0.021 + 0.08 = $0.101/hr), workers' comp per craft (laborer 14.50 %, operator and
# truck 8.49 %, carpenter 5.04 %), insurance 3 %; fringe untaxed. By hand:
#   dozer 35.56 + 18.12 + taxes 2.8213 + WC 3.0190 + GL 1.0668 = 60.59 (WD; over 55.08);
#   motor grader 36.64 + 18.12 + 2.9040 + 3.1107 + 1.0992 = 61.87 (WD);
#   carpenter (excludes formwork) 35.89 + 14.98 + 2.8466 + 1.8089 + 1.0767 = 56.60 (WD; over 52.80);
#   laborer 22.35 + 0.60 -> 28.67, excavator 31.27 + 6.90 -> 44.26, dump truck 25.78 + 0.69 -> 31.51: each
#   raised to the commercial rate x (1 + F), 41.28, 55.08, 46.60; plumber not listed (licensed, never
#   conformed): not covered, 60.66 = commercial x (1 + F); foreman = crew top (grader 61.87) x 1.10 = 68.06.
# The plan's 61.41, 62.73, 57.43 and 69.00 took FUTA and SUTA on the whole base (2.6 % uncapped): the engine
# caps them at their wage bases, $0.82 to $0.94 less. Paychecks: dozer 35.56 + 18.12 = 53.68 (over
# commercial base 49.51 x 0.80413 = 39.81), laborer 22.95 raised to commercial 38.04 x 0.80413 = 30.59.
MOHAVE_46 = [
    ("CARPENTER, EXCLUDES FORMWORK CONCRETE", 35.89, 14.98),
    ("POWER EQUIPMENT OPERATOR: BULLDOZER", 35.56, 18.12),
    ("POWER EQUIPMENT OPERATOR: BOBCAT/SKID STEER/SKID LOADER", 32.29, 18.12),
    ("POWER EQUIPMENT OPERATOR: MOTOR GRADER/BLADE", 36.64, 18.12),
    ("LABORER: GRADE SETTER", 29.91, 9.26),
    ("LABORER: PIPELAYER", 30.88, 9.26),
    ("CARPENTER: FORMWORK CONCRETE", 31.98, 9.26),
    ("TRUCK DRIVER: WATER", 30.88, 9.26),
    ("TRUCK DRIVER: DUMP", 25.78, 0.69),
    ("POWER EQUIPMENT OPERATOR: LOADER/FRONT END LOADER", 30.15, 0.81),
    ("POWER EQUIPMENT OPERATOR: EXCAVATOR/TRACKHOE", 31.27, 6.90),
    ("PAINTER: PAVEMENT MARKING", 24.60, 6.34),
    ("LABORER: GENERAL", 22.35, 0.60),
    ("ELECTRICIAN", 29.00, 7.58),
]
PREVAILING_CASES = [
    {"id": "pw-laborer", "craft": "CC-16", "expect": {"rate": 41.28, "payable": 30.59, "rule": "raised_to_minimum"}},
    {"id": "pw-excavator", "craft": "CC-11", "expect": {"rate": 55.08, "rule": "raised_to_minimum"}},
    {"id": "pw-dozer", "craft": "CC-11", "subtype": "dozer", "expect": {"rate": 60.59, "payable": 53.68, "rule": "wd"}},
    {"id": "pw-motor-grader", "craft": "CC-11", "subtype": "motor_grader", "expect": {"rate": 61.87, "rule": "wd"}},
    {"id": "pw-dump-truck", "craft": "CC-31", "expect": {"rate": 46.60, "rule": "raised_to_minimum"}},
    {"id": "pw-carpenter", "craft": "CC-05", "expect": {"rate": 56.60, "rule": "wd"}},
    {"id": "pw-plumber", "craft": "CC-25", "expect": {"rate": 60.66, "rule": "not_covered"}},
]
PREVAILING_CREW = [
    # An operator row follows its machine (D-724 rule 5): the machine's subtype prices it (W3).
    {"id": "pw-crew-dozer", "machine": "DZ-CRAWL-D6", "craft": "CC-11", "expect": 60.59},
    {"id": "pw-crew-grader", "machine": "GR-14FT-160", "craft": "CC-11", "expect": 61.87},
    {"id": "pw-crew-excavator", "machine": "EX-CRAWL-30T", "craft": "CC-11", "expect": 55.08},
]
PREVAILING_FOREMAN = 68.06
# A union agreement loaded on the Mohave prevailing job (D-1047 item 1), the higher of the agreement and
# the WD line, the WD alone (never raised to national union scale: the agreement is the contractor's
# scale). Carpenter 40.00 + plan 15.00 -> 61.38 (the union mode's figure) over the WD's 56.60: the
# agreement. Laborer 25.00 + cash 8.00 -> 40.00 over the WD general laborer 22.35 + 0.60 (28.67
# unraised): the agreement, under the 41.28 national union scale it replaces. Electrician 25.00 + plan
# 5.00: 25.00 + 5.00 + taxes 1.9125 + 0.101 = 2.0135 + WC + GL 0.75 under the WD's 29.00 + 7.58 line
# (licensed, listed): the WD line, not raised, rule "wd".
PREVAILING_AGREEMENT = {"CC-05": (40.00, 15.00, 0.0), "CC-16": (25.00, 0.0, 8.00), "CC-09": (25.00, 5.00, 0.0)}
PREVAILING_AGREEMENT_CASES = [
    {"id": "pw-agreement-carpenter", "craft": "CC-05", "expect": {"rate": 61.38, "rule": "union_agreement"}},
    {"id": "pw-agreement-laborer", "craft": "CC-16", "expect": {"rate": 40.00, "rule": "union_agreement"}},
    {"id": "pw-agreement-electrician", "craft": "CC-09", "expect": {"rule": "wd"}},
]


def prevailing() -> int:
    from datetime import date
    from decimal import Decimal

    from app.features.wage_calculator.labor import ForemanContext, price_foremen
    from app.wagecalc.data import RefData
    from app.wagecalc.market import load_market
    from app.wagecalc.rates import build_rate_set
    from app.wagecalc.wd.mapping import machine_subtype, map_groups, map_wd

    ref, market = RefData(), load_market()
    lines = [{"classification": t, "base": b, "fringe": f} for t, b, f in MOHAVE_46]
    mapped, _ = map_wd(lines)
    entries, labels = {}, {}
    for name, m in mapped.items():
        try:
            code = ref.craft_code("commercial", name)
        except KeyError:
            continue
        entries[code] = (m["base"], m["fringe"] or 0.0, 0.0)
        labels[code] = m["classification"]
    found, _ = map_groups(lines)
    groups: dict = {}
    for (name, key), g in found.items():
        groups.setdefault(ref.craft_code("commercial", name), {})[key] = (g["classification"], (g["base"], g["fringe"] or 0.0, 0.0))
    def build(basis: str, data: str = "wage_data", agreement: dict | None = None):
        return build_rate_set(ref, project_type="public", zip5="85360", county_fips="04015", wage_determination="prevailing_federal",
                              pricing_basis=basis, basis=data, entries=entries if data == "wage_data" else None, market=market,
                              bid_date=date(2026, 11, 6), edition_date=market.editions[ref.edition_id], labels=labels, groups=groups,
                              agreement="Test agreement" if agreement else None, agreement_entries=agreement,
                              rules=4 if data == "wage_data" else 5)  # D-1038 / D-1047 rows: rules 4 (D-1087)

    rs = build("burdened")
    wrong = []
    if round(rs["location"]["labor"] * 100000) != -19587:
        wrong.append(f"FAIL  pw-labor-factor: {rs['location']['labor']}, expected -0.19587")
    for c in PREVAILING_CASES:
        got = rs["subtypes"][c["craft"]][c["subtype"]] if c.get("subtype") else rs["crafts"][c["craft"]]
        for k, want in c["expect"].items():
            if (got.get(k) != want) if isinstance(want, str) else round(got[k] * 100) != round(want * 100):
                wrong.append(f"FAIL  {c['id']}.{k}: {got.get(k)}, expected {want}")
    subtypes = {code: {k: Decimal(str(v["rate"])) for k, v in subs.items()} for code, subs in rs["subtypes"].items()}
    machines = {f"m{i}": machine_subtype(c["machine"]) or "" for i, c in enumerate(PREVAILING_CREW)}
    crew = [{"role": "Operator: Equipment Operator", "craft_code": c["craft"], "count": 1, "rate_source": "wage_set",
             "hourly_wage": rs["crafts"][c["craft"]]["rate"], "for_equipment": f"m{i}"} for i, c in enumerate(PREVAILING_CREW)]
    crew.append({"role": "Laborer", "craft_code": "CC-16", "count": 1, "rate_source": "wage_set", "hourly_wage": rs["crafts"]["CC-16"]["rate"]})
    crew.append({"role": "Foreman", "foreman": True, "count": 0.5, "rate_source": "wage_set"})
    context = ForemanContext(premium=Decimal("0.10"), laborer=Decimal(str(rs["crafts"]["CC-16"]["rate"])), determination=None,
                             subtypes=subtypes, machines=machines)
    priced = price_foremen(crew, context) or []
    for i, c in enumerate(PREVAILING_CREW):
        if round(priced[i]["hourly_wage"] * 100) != round(c["expect"] * 100):
            wrong.append(f"FAIL  {c['id']}: {priced[i]['hourly_wage']}, expected {c['expect']}")
    if round(priced[-1]["hourly_wage"] * 100) != round(PREVAILING_FOREMAN * 100):
        wrong.append(f"FAIL  pw-foreman: {priced[-1]['hourly_wage']}, expected {PREVAILING_FOREMAN}")
    # A union agreement on prevailing (D-1047 item 1): each craft it lists at max(agreement, WD line).
    both = build("burdened", agreement=PREVAILING_AGREEMENT)
    for c in PREVAILING_AGREEMENT_CASES:
        got = both["crafts"][c["craft"]]
        for k, want in c["expect"].items():
            if (got.get(k) != want) if isinstance(want, str) else round(got[k] * 100) != round(want * 100):
                wrong.append(f"FAIL  {c['id']}.{k}: {got.get(k)}, expected {want}")
    gate_rows = 0
    for name, data, agreement in (("prevailing", "wage_data", None), ("prevailing-no-wd", "national_average", None),
                                  ("prevailing-agreement", "wage_data", PREVAILING_AGREEMENT)):
        n, w = wage_gates(ref, name, lambda basis, d=data, a=agreement: build(basis, d, a))
        gate_rows += n
        wrong += w
    for w in wrong:
        print(w)
    rows = 1 + len(PREVAILING_CASES) + len(PREVAILING_CREW) + 1 + len(PREVAILING_AGREEMENT_CASES) + gate_rows
    print(f"prevailing: {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


# Union agreements (WAGE_PLAN W5; D-1041), Mohave County AZ (ZIP 85360, county 04015, labour F = -19.587 %),
# public, union, burdened, company defaults. An agreement's craft goes through the burden engine as a WD line
# (plan fringe untaxed, cash fringe a taxable wage) and is not raised to a market rate; a craft the agreement
# lacks is the commercial rate x (1 + F). Engine burden on base: Social Security 6.2 % + Medicare 1.45 % on
# the taxable wage (base + cash fringe), FUTA 0.6 % of $7,000 and AZ SUTA 2.0 % of $8,000 over 2,000 hours
# ($0.021 + $0.08 = $0.101/hr), workers' comp on base (carpenter 5.04 %, operator 8.49 %, laborer 14.50 %),
# insurance 3 % of base. By hand:
#   carpenter 40.00 + plan 15.00: taxes 2.48 + 0.58 + 0.101 = 3.161, WC 2.016, GL 1.20 -> 61.38;
#   operator 38.00 + plan 20.00: taxes 2.356 + 0.551 + 0.101 = 3.008, WC 3.2262, GL 1.14 -> 65.37;
#   laborer 25.00 + cash 8.00: taxable 33.00, taxes 2.046 + 0.4785 + 0.101 = 2.6255, WC 3.625, GL 0.75 -> 40.00
#   (under the commercial 41.28: the agreement's own figure, not raised);
#   laborer 25.00 + plan 8.00 (a second agreement): taxable 25.00, taxes 1.55 + 0.3625 + 0.101 = 2.0135 -> 39.39,
#   0.61 under the cash case: 7.65 % of the $8.00 fringe;
#   plumber and dump truck driver, not in the agreement: commercial x (1 + F), 60.66 and 46.60.
UNION_CASH = {"CC-05": (40.00, 15.00, 0.0), "CC-11": (38.00, 20.00, 0.0), "CC-16": (25.00, 0.0, 8.00)}
UNION_PLAN = {"CC-16": (25.00, 8.00, 0.0)}
UNION_CASES = [
    {"id": "un-carpenter", "set": "cash", "craft": "CC-05", "expect": {"rate": 61.38, "taxes": 3.16, "rule": "union_agreement"}},
    {"id": "un-operator", "set": "cash", "craft": "CC-11", "expect": {"rate": 65.37, "rule": "union_agreement"}},
    {"id": "un-laborer-cash-fringe", "set": "cash", "craft": "CC-16", "expect": {"rate": 40.00, "taxes": 2.63, "rule": "union_agreement"}},
    {"id": "un-laborer-plan-fringe", "set": "plan", "craft": "CC-16", "expect": {"rate": 39.39, "taxes": 2.01, "rule": "union_agreement"}},
    {"id": "un-plumber-not-in", "set": "cash", "craft": "CC-25", "expect": {"rate": 60.66, "rule": "not_in_agreement"}},
    {"id": "un-dump-truck-not-in", "set": "cash", "craft": "CC-31", "expect": {"rate": 46.60, "rule": "not_in_agreement"}},
]


def union() -> int:
    from datetime import date

    from app.wagecalc.data import RefData
    from app.wagecalc.market import load_market
    from app.wagecalc.rates import build_rate_set

    ref, market = RefData(), load_market()
    sets = {
        key: build_rate_set(ref, project_type="public", zip5="85360", county_fips="04015", wage_determination="union_cba",
                            pricing_basis="burdened", basis="wage_data", entries=entries, market=market, bid_date=date(2026, 11, 6),
                            edition_date=market.editions[ref.edition_id], agreement=f"Test agreement {key}", rules=4)
        for key, entries in (("cash", UNION_CASH), ("plan", UNION_PLAN))
    }
    wrong = []
    for c in UNION_CASES:
        got = sets[c["set"]]["crafts"][c["craft"]]
        for k, want in c["expect"].items():
            if (got.get(k) != want) if isinstance(want, str) else round(got[k] * 100) != round(want * 100):
                wrong.append(f"FAIL  {c['id']}.{k}: {got.get(k)}, expected {want}")
    first = (sets["cash"]["crafts"]["CC-05"].get("source") or [""])[0]
    if not first.startswith("Union agreement Test agreement cash:"):
        wrong.append(f"FAIL  un-source-line: {first!r}, expected it to name the agreement")
    gate_rows = 0
    for name, data in (("union", "wage_data"), ("union-no-agreement", "national_average")):
        n, w = wage_gates(ref, name, lambda basis, d=data: build_rate_set(
            ref, project_type="public", zip5="85360", county_fips="04015", wage_determination="union_cba", pricing_basis=basis,
            basis=d, entries=UNION_CASH if d == "wage_data" else None, market=market, bid_date=date(2026, 11, 6),
            edition_date=market.editions[ref.edition_id], agreement="Test agreement cash"))
        gate_rows += n
        wrong += w
    for w in wrong:
        print(w)
    rows = len(UNION_CASES) + 1 + gate_rows
    print(f"union: {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


# Typed values on a site machine across Apply tier (D-758 follow-up): A1's spread was EX-CRAWL-30T +
# ADT-30T with a typed week $7,000 on the excavator and day $900 + work day 9 on the truck.
TYPED_EX = {"own": {"rent_week": 7000}}
TYPED_ADT = {"own": {"rent_day": 900}, "own_fields": {"eq_hours_per_day": 9}}
OLD_SPREAD = [("EX-CRAWL-30T", "A1: EX-CRAWL-30T", TYPED_EX), ("ADT-30T", "A1: ADT-30T", TYPED_ADT)]
TYPED_CASES = [
    # Both classes stay (the new tier adds a second truck): each carries its values, the new truck none.
    {"id": "typed-stays", "new": ["EX-CRAWL-30T", "ADT-30T", "ADT-30T"], "expect": {"carried": {0: TYPED_EX, 1: TYPED_ADT}, "notice": None}},
    # The excavator's class leaves (the new tier has EX-CRAWL-45T): the truck carries, the excavator is named.
    {"id": "typed-leaves", "new": ["EX-CRAWL-45T", "ADT-30T"], "expect": {"carried": {1: TYPED_ADT}, "notice": "Your typed values for A1: EX-CRAWL-30T were not used: it is not in the new tier."}},
]


def typed() -> int:
    from app.features.equipment.production import LEFT_TIER, _not_used, carry_typed

    wrong = []
    for c in TYPED_CASES:
        carried, gone = carry_typed(OLD_SPREAD, c["new"])
        got = {"carried": carried, "notice": _not_used(gone, LEFT_TIER)}
        for k, want in c["expect"].items():
            if got[k] != want:
                wrong.append(f"FAIL  {c['id']}.{k}: {got[k]!r}, expected {want!r}")
    for w in wrong:
        print(w)
    print(f"site typed values: {len(TYPED_CASES)} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


# Small quantities on machines already on site (D-1040, release 38): the api's `equipment/on_site.py`.
# The starter's first tiers, as release rows hold them: place and compact (A3, threshold 50 CCY) a small crawler
# dozer that paces, a single-drum roller and a quarter water truck; strip topsoil (A4, 100 BCY) one crawler dozer;
# haul off (A7, 50 LCY) two operated on-road dump trucks. A needed family is the dozer-or-excavator, the roller,
# or the machine's own type; the water truck is support, never needed and never priced on site.
_DOZER = {"eq_class_key": "QT-DOZER-SM", "units": 1, "paces": True, "category": "Earthwork", "type": "Crawler dozer"}
_ROLLER = {"eq_class_key": "QT-ROLLER", "units": 1, "category": "Compaction", "type": "Single-drum vibratory roller"}
_WATER = {"eq_class_key": "QT-WATER", "units": 0.25, "category": "Hauling", "type": "Water truck / tank"}
_TRUCKS = {"eq_class_key": "QT-TRUCK", "units": 2, "paces": True, "category": "Hauling", "type": "On-road dump truck"}
FILL_TIER = [_DOZER, _ROLLER, _WATER]
STRIP_TIER = [_DOZER]
EXPORT_TIER = [_TRUCKS]


def _on(key: str, category: str, type_: str, name: str, mode: str = "rental") -> dict:
    return {"eq_class_key": key, "eq_mode": mode, "name": name, "category": category, "type": type_}


SITE_EXCAVATOR = _on("QT-EX-20T", "Earthwork", "Hydraulic excavator", "Cut to fill: excavator")
SITE_DOZER = _on("QT-DOZER-MD", "Earthwork", "Crawler dozer", "Strip topsoil: dozer")
SITE_ROLLER = _on("QT-ROLLER-84", "Compaction", "Single-drum vibratory roller", "Subgrade: roller")
SITE_TRENCH_ROLLER = _on("QT-TRENCH", "Compaction", "Trench roller", "Storm: trench roller")
SITE_TRUCK = _on("QT-TRUCK-OP", "Hauling", "On-road dump truck", "Import: dump trucks", "operated")
SITE_ADT = _on("QT-ADT", "Hauling", "Articulated dump truck (ADT)", "Cut to fill: ADT")
ON_SITE_CASES = [
    # 20 CCY of fill, under 50, an excavator and a roller on other lines: the excavator stands in for the dozer
    # (one family), the roller for the roller, the water truck is left out. Basis "By machines on site: …".
    {"id": "onsite-fill-under-with", "qty": 20, "threshold": 50, "tier": FILL_TIER, "site": [SITE_EXCAVATOR, SITE_ROLLER],
     "expect": {"keys": ["QT-EX-20T", "QT-ROLLER-84", None], "modes": ["rental", "rental", None], "note": "By machines on site: Cut to fill: excavator, Subgrade: roller"}},
    # At the threshold is not under it, and over it: today's tier.
    {"id": "onsite-fill-at-threshold", "qty": 50, "threshold": 50, "tier": FILL_TIER, "site": [SITE_EXCAVATOR, SITE_ROLLER], "expect": {"keys": None}},
    {"id": "onsite-fill-over-with", "qty": 400, "threshold": 50, "tier": FILL_TIER, "site": [SITE_EXCAVATOR, SITE_ROLLER], "expect": {"keys": None}},
    # No soil roller on site: "a roller if any" (D-1040), the excavator alone, the roller left out.
    {"id": "onsite-fill-under-no-roller", "qty": 20, "threshold": 50, "tier": FILL_TIER, "site": [SITE_EXCAVATOR], "expect": {"keys": ["QT-EX-20T", None, None]}},
    # A walk-behind trench roller is not a soil roller: the excavator alone as well.
    {"id": "onsite-fill-under-trench-roller", "qty": 20, "threshold": 50, "tier": FILL_TIER, "site": [SITE_EXCAVATOR, SITE_TRENCH_ROLLER], "expect": {"keys": ["QT-EX-20T", None, None]}},
    # Under, nothing on site: today's tier.
    {"id": "onsite-fill-under-without", "qty": 20, "threshold": 50, "tier": FILL_TIER, "site": [], "expect": {"keys": None}},
    # 80 BCY of strip, under 100, a dozer on site: that dozer. 150 BCY: today's tier.
    {"id": "onsite-strip-under-with", "qty": 80, "threshold": 100, "tier": STRIP_TIER, "site": [SITE_DOZER],
     "expect": {"keys": ["QT-DOZER-MD"], "modes": ["rental"], "note": "By machines on site: Strip topsoil: dozer"}},
    {"id": "onsite-strip-over-with", "qty": 150, "threshold": 100, "tier": STRIP_TIER, "site": [SITE_DOZER], "expect": {"keys": None}},
    # 30 LCY of export, under 50, operated dump trucks on the import: those trucks, operated, at the tier's count
    # (the haul cycle sets it). Only an ADT on site (off-road, not a road truck): today's tier.
    {"id": "onsite-export-under-with", "qty": 30, "threshold": 50, "tier": EXPORT_TIER, "site": [SITE_ADT, SITE_TRUCK],
     "expect": {"keys": ["QT-TRUCK-OP"], "modes": ["operated"], "units": [2.0], "note": "By machines on site: Import: dump trucks"}},
    {"id": "onsite-export-under-adt-only", "qty": 30, "threshold": 50, "tier": EXPORT_TIER, "site": [SITE_ADT], "expect": {"keys": None}},
    # An activity with no threshold (every other one): off, whatever is on site.
    {"id": "onsite-no-threshold", "qty": 5, "threshold": None, "tier": STRIP_TIER, "site": [SITE_DOZER], "expect": {"keys": None}},
]


def onsite() -> int:
    from app.features.equipment import on_site

    wrong = []
    for c in ON_SITE_CASES:
        site = [on_site.SiteMachine(m["eq_class_key"], m["eq_mode"], m["name"], on_site.family(m["category"], m["type"])) for m in c["site"]]
        got_plan = on_site.plan(c["qty"], c["threshold"], c["tier"], site)
        got = {
            "keys": None if got_plan is None else [p["eq_class_key"] if p else None for p in got_plan],
            "modes": None if got_plan is None else [p["eq_mode"] if p else None for p in got_plan],
            "units": None if got_plan is None else [p["units"] for p in got_plan if p],
            "note": None if got_plan is None else on_site.note([p["name"] for p in got_plan if p]),
        }
        for k, want in c["expect"].items():
            if got[k] != want:
                wrong.append(f"FAIL  {c['id']}.{k}: {got[k]!r}, expected {want!r}")
    for w in wrong:
        print(w)
    print(f"machines on site: {len(ON_SITE_CASES)} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


# One equipment pool per job (D-1115): the api's `equipment/pool.py` and `production._leftover`. Machines by kind,
# operating weight (lb), spread hours and rates; a needed machine pools into a host of its kind, equal or larger,
# suitable (a pipe crew's excavator at most the 36-45 t class, earthwork only when one sub does both) and no dearer
# than on its own. The 45-55 t rates are the release's (day 2,250, week 5,600, 4-week 14,000, mob 3,300).
_EX50 = {"day": 2250.0, "week": 5600.0, "four_week": 14000.0, "owned": 174.5, "gph": 8.02, "mob": 3300.0}
_EX20 = {"day": 950.0, "week": 2800.0, "four_week": 7000.0, "owned": 80.0, "gph": 4.5, "mob": 1100.0}
_D5 = {"day": 1300.0, "week": 4210.0, "four_week": 11000.0, "owned": 110.0, "gph": 5.0, "mob": 1200.0}
_D8 = {"day": 3200.0, "week": 9600.0, "four_week": 26000.0, "owned": 250.0, "gph": 12.0, "mob": 2600.0}
_PIPE_CAP = 90000.0


def _m(uuid, act, kind, weight, hours, rates, need=None, pipe=False, may_pool=True):  # type: ignore[no-untyped-def]
    return {"uuid": uuid, "act": act, "kind": kind, "weight": weight, "hours": hours, "rates": rates,
            "need": need or uuid, "pipe": pipe, "may_pool": may_pool}


_HOST50 = _m("EX-50T", 1, "hydraulic excavator", 106000.0, 210.08, _EX50)
POOL_CASES = [
    # Real bid A's 3 BCY cut: a 20-25 t excavator, 0.06 h, onto the 45-55 t loading the export (same 27 days booked).
    {"id": "pool-small-cut-onto-big", "machines": [_HOST50, _m("EX-20T", 2, "hydraulic excavator", 55000.0, 0.06, _EX20)],
     "expect": {"EX-20T": "EX-50T"}},
    # A pipe crew's 20 t excavator never onto the 45-55 t (over the 36-45 t cap), even when one sub does both.
    {"id": "pool-pipe-over-cap", "machines": [_HOST50, _m("PIPE-20T", 3, "hydraulic excavator", 55000.0, 7.0, _EX20, pipe=True)],
     "with_earthwork": True, "expect": {}},
    # Under the cap: onto the earthwork's 30-36 t when one sub does both; its own machine when not.
    {"id": "pool-pipe-under-cap-one-sub", "machines": [_m("EX-30T", 1, "hydraulic excavator", 75000.0, 40.0, _EX20), _m("PIPE-20T", 3, "hydraulic excavator", 55000.0, 7.0, _EX20, pipe=True)],
     "with_earthwork": True, "expect": {"PIPE-20T": "EX-30T"}},
    {"id": "pool-pipe-two-subs", "machines": [_m("EX-30T", 1, "hydraulic excavator", 75000.0, 40.0, _EX20), _m("PIPE-20T", 3, "hydraulic excavator", 55000.0, 7.0, _EX20, pipe=True)],
     "with_earthwork": False, "expect": {}},
    # The biggest of a kind is planned first: the D5 on the job hosts the D3's 30 h, never the other way round
    # (a smaller host is refused by `fits`, the row after the plan rows).
    {"id": "pool-smaller-onto-larger", "machines": [_m("D3", 1, "crawler dozer", 22000.0, 30.0, _D5), _m("D5", 2, "crawler dozer", 40000.0, 3.0, _D5)],
     "expect": {"D3": "D5"}},
    # Another kind never: a roller is not a dozer.
    {"id": "pool-other-kind", "machines": [_m("D8", 1, "crawler dozer", 80000.0, 100.0, _D8), _m("RL", 2, "single-drum vibratory roller", 20000.0, 3.0, _D5)],
     "expect": {}},
    # Not a pooled kind (a truck's fleet follows its cycle, D-1093): never planned.
    {"id": "pool-truck-not-pooled", "machines": [_m("ADT-1", 1, None, 50000.0, 100.0, _D8), _m("ADT-2", 2, None, 50000.0, 4.0, _D8)],
     "expect": {}},
    # The cost guard: a D5's 30 h onto a D8 booked for exactly 4 weeks costs a week of the D8 (9,600) and its fuel,
    # dearer than the D5's own week, fuel and delivery (4,210 + 1,200 + fuel): its own machine.
    {"id": "pool-cost-guard", "machines": [_m("D8", 1, "crawler dozer", 80000.0, 160.0, _D8), _m("D5", 2, "crawler dozer", 40000.0, 30.0, _D5)],
     "fuel": 3.5, "expect": {}},
    # The same D5 onto a D8 with room in its booking (150 h of 160): pooled.
    {"id": "pool-room-in-booking", "machines": [_m("D8", 1, "crawler dozer", 80000.0, 150.0, _D8), _m("D5", 2, "crawler dozer", 40000.0, 8.0, _D5)],
     "fuel": 3.5, "expect": {"D5": "D8"}},
    # The clearing's shared spread (D-972) is a host only.
    {"id": "pool-clearing-host-only", "machines": [_HOST50, _m("CLR-20T", 4, "hydraulic excavator", 55000.0, 6.0, _EX20, may_pool=False)],
     "expect": {}},
    # The same line twice on one spread is never its own host; two spreads of one class: the one with more hours hosts.
    {"id": "pool-same-class-more-hours", "machines": [_m("A", 1, "crawler dozer", 40000.0, 5.0, _D5, need="DZ-D5"), _m("B", 2, "crawler dozer", 40000.0, 36.0, _D5, need="DZ-D5")],
     "expect": {"A": "B"}},
]
# D-1121: the borrow-or-own weighing each machine with a suitable host carries, by hand. The cost guard: the D8's 160 h
# are 20 days, one 4-week (26,000); with the D5's 30 h, 190 h are 24 days, a 4-week and a week (35,600): extension
# 9,600, fuel 12 x 3.5 x 30 = 1,260, borrow 10,860. The D5's own: 30 h are 4 days, a week (4,210), fuel 5 x 3.5 x 30
# = 525, delivery and pickup 1,200: 5,935, its own machine. Room in the booking: 150 h and 158 h are 19 and 20 days,
# both the 4-week (26,000): extension 0, fuel 12 x 3.5 x 8 = 336; its own a day (1,300), fuel 140, 1,200: 2,640.
POOL_CHOICES = [
    ("pool-cost-guard", "D5", {"host": "D8", "extension": 9600.0, "borrow_fuel": 1260.0, "rental": 4210.0, "own_fuel": 525.0, "mob": 1200.0, "borrowed": False}),
    ("pool-room-in-booking", "D5", {"host": "D8", "extension": 0.0, "borrow_fuel": 336.0, "rental": 1300.0, "own_fuel": 140.0, "mob": 1200.0, "borrowed": True}),
]
# The cheapest days, weeks and 4-weeks covering the hours (8 h days, 5-day weeks, 20-day 4-weeks), on the 45-55 t.
POOL_RENTALS = [(0.0, 0.0), (0.06, 2250.0), (8.0, 2250.0), (8.01, 4500.0), (40.0, 5600.0), (48.0, 7850.0),
                (160.0, 14000.0), (210.08, 24100.0), (210.14, 24100.0)]
# The leftover hour (D-1115 item 3): a pooled pacing machine and the spread's work under an hour at its production.
POOL_LEFTOVERS = [
    {"id": "leftover-3bcy", "qty": 3.0, "prod": 4000.0, "pooled": [0], "expect": True},
    {"id": "leftover-1000bcy", "qty": 1000.0, "prod": 4000.0, "pooled": [0], "expect": False},
    {"id": "leftover-not-pooled", "qty": 3.0, "prod": 4000.0, "pooled": [], "expect": False},
    {"id": "leftover-only-a-truck-pooled", "qty": 3.0, "prod": 4000.0, "pooled": [1], "expect": False},
]


def pooled() -> int:
    from app.features.equipment import pool, production

    wrong = []
    plans = {}
    for c in POOL_CASES:
        ms = [pool.Machine(uuid=m["uuid"], activity_id=m["act"], position=0, need_key=m["need"], kind=m["kind"],
                           weight=m["weight"], hours=m["hours"], pipe=m["pipe"], mode="rental",
                           rates=pool.Rates(**m["rates"]), may_pool=m["may_pool"]) for m in c["machines"]]
        plans[c["id"]] = pool.plan(ms, _PIPE_CAP, c.get("with_earthwork", True), c.get("fuel", 0.0))
        got = plans[c["id"]].host
        if got != c["expect"]:
            wrong.append(f"FAIL  {c['id']}: {got!r}, expected {c['expect']!r}")
    for case, uuid, want_c in POOL_CHOICES:
        ch = plans[case].choice.get(uuid)
        got_c = None if ch is None else {k: getattr(ch, k) for k in want_c}
        if got_c is None or any(abs(got_c[k] - v) > 0.005 if isinstance(v, float) else got_c[k] != v for k, v in want_c.items()):
            wrong.append(f"FAIL  {case}-choice: {got_c!r}, expected {want_c!r}")
    small = pool.Machine(uuid="D3", activity_id=1, position=0, need_key="D3", kind="crawler dozer", weight=22000.0,
                         hours=30.0, pipe=False, mode="rental", rates=pool.Rates(**_D5))
    big = pool.Machine(uuid="D5", activity_id=2, position=0, need_key="D5", kind="crawler dozer", weight=40000.0,
                       hours=3.0, pipe=False, mode="rental", rates=pool.Rates(**_D5))
    if pool.fits(big, small, _PIPE_CAP, True):
        wrong.append("FAIL  pool-fits-smaller-host: a D3 hosts a D5's work")
    for hours, want in POOL_RENTALS:
        got_r = pool.rental(hours, pool.Rates(**{k: _EX50[k] for k in ("day", "week", "four_week")}))
        if got_r is None or abs(got_r - want) > 0.005:
            wrong.append(f"FAIL  pool-rental-{hours}h: {got_r!r}, expected {want!r}")
    tier = SimpleNamespace(machines=[{"paces": True}, {"paces": False}])
    act = SimpleNamespace(hours_per_day=8)
    for c in POOL_LEFTOVERS:
        got_l = production._leftover(act, tier, [(None, c["qty"], None)], {i: None for i in c["pooled"]}, c["prod"])  # type: ignore[arg-type]
        if got_l != c["expect"]:
            wrong.append(f"FAIL  {c['id']}: {got_l!r}, expected {c['expect']!r}")
    for w in wrong:
        print(w)
    n = len(POOL_CASES) + len(POOL_CHOICES) + 1 + len(POOL_RENTALS) + len(POOL_LEFTOVERS)
    print(f"equipment pool: {n} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


# Quantities a line of each role is priced at (the starter's ranges: small, mid and large jobs).
HIDDEN_QTYS = (500.0, 10000.0, 250000.0)


async def hidden() -> int:
    """D-759: "Show in suggestions" off changes what is offered, never what prices. Resolves each
    starter role's activity, default production and tier on a workspace made for the check, with
    every activity shown and then hidden, inside one transaction that is rolled back."""
    import uuid as uuid_module

    from sqlalchemy import update

    from app.database import SessionFactory
    from app.features.auth.models import User
    from app.features.equipment import production as ew
    from app.features.equipment.models import EqCompanyActivity
    from app.features.workspace.models import Workspace

    async def resolve(session, ws_id: int, roles: list[str]) -> list[tuple]:
        out = []
        for role in roles:
            act = await ew._activity_for_role(ws_id, session, 0, role)
            if act is None:
                out.append((role, None))
                continue
            tiers = await ew._tiers(session, act.id)
            for q in HIDDEN_QTYS:
                prod = await ew._default_production(session, act.id, q)
                tier = ew.tier_for(tiers, prod) if prod is not None else None
                out.append((role, act.name, q, prod, ew.tier_label(tier) if tier else None))
        return out

    async with SessionFactory() as session:
        try:
            stamp = uuid_module.uuid4().hex[:10]
            user = User(email=f"qt.hidden.{stamp}@bench.invalid", password_hash="!", full_name="quantity table")
            session.add(user)
            await session.flush()
            ws = Workspace(name="quantity table (rolled back)", slug=f"qt-hidden-{stamp}", owner_id=user.id)
            session.add(ws)
            await session.flush()
            ws_id = ws.id
            await ew.adopt_starter(ws_id, session)
            st = await ew.starter(session)
            roles = sorted({m["earthwork_role"] for m in (st["ew_line_map"] if st else [])})
            shown = await resolve(session, ws_id, roles)
            await session.execute(
                update(EqCompanyActivity).where(EqCompanyActivity.workspace_id == ws_id).values(in_suggestions=False)
            )
            await session.flush()
            session.expire_all()
            hid = await resolve(session, ws_id, roles)
        finally:
            await session.rollback()
    mapped = sum(1 for r in shown if r[1] is not None and r[2] == HIDDEN_QTYS[0])
    wrong = [f"FAIL  hidden {a[0]}: shown {a[1:]}, hidden {b[1:]}" for a, b in zip(shown, hid, strict=True) if a != b]
    if mapped == 0:
        wrong.append("FAIL  hidden: no starter role mapped to an activity")
    for w in wrong:
        print(w)
    print(f"hidden activities: {len(roles)} roles ({mapped} mapped) at {len(HIDDEN_QTYS)} quantities, {'priced the same' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


async def parents() -> int:
    """D-764 B0: a line Calculate turns into a parent gives up its automatic components and its
    untouched spread; a person's own component stays on it. Two rows on the throwaway project "zz
    MyEq project" inside one transaction that is rolled back: a parent with an automatic and an edited
    component, and the release that Calculate runs."""
    from sqlalchemy import select

    from app.database import SessionFactory
    from app.features.drawing.models import DrawingSheet
    from app.features.equipment import production as ew
    from app.features.estimate.models import EstimateItemSpread, TakeoffCostComponent
    from app.features.project.models import Project
    from app.features.takeoff.models import TakeoffItem, TakeoffItemType

    wrong: list[str] = []
    async with SessionFactory() as session:
        try:
            project = await session.scalar(select(Project).where(Project.name == "zz MyEq project"))
            sheet = await session.scalar(select(DrawingSheet).where(DrawingSheet.project_id == project.id)) if project else None
            if project is None or sheet is None:
                print("FAIL  parents: the throwaway project zz MyEq project (or its sheet) is missing")
                return 1
            item = dict(workspace_id=project.workspace_id, project_id=project.id, sheet_id=sheet.id, created_by_id=project.created_by_id, type=TakeoffItemType.CY, unit="CY")
            parent = TakeoffItem(name="qt parent", **item)
            session.add(parent)
            await session.flush()
            child = TakeoffItem(name="qt sub-line", parent_item_id=parent.id, **item)
            session.add(child)
            comp = dict(workspace_id=project.workspace_id, project_id=project.id, takeoff_item_id=parent.id, pricing_mode="lump", created_by_id=project.created_by_id)
            session.add(TakeoffCostComponent(kind="equipment", name="qt tier machine", eq_auto=True, position=0, **comp))
            session.add(TakeoffCostComponent(kind="labor", name="qt edited crew", eq_auto=False, position=1, **comp))
            session.add(EstimateItemSpread(workspace_id=project.workspace_id, project_id=project.id, takeoff_item_id=parent.id, user_edited=False))
            await session.flush()
            gone = await ew.release_parents(project.workspace_id, session, project.id, [parent.id])
            left = [c.name for c in await session.scalars(select(TakeoffCostComponent).where(TakeoffCostComponent.takeoff_item_id == parent.id))]
            spread = await session.scalar(select(EstimateItemSpread).where(EstimateItemSpread.takeoff_item_id == parent.id))
            if gone != 1 or "qt tier machine" in left:
                wrong.append(f"FAIL  parents-automatic: {gone} removed, left {left}; expected the tier machine removed")
            if spread is not None:
                wrong.append("FAIL  parents-automatic: the untouched spread stayed on the parent")
            if left != ["qt edited crew"]:
                wrong.append(f"FAIL  parents-edited: left {left}; expected the edited crew kept, shown not counted")
        finally:
            await session.rollback()
    for w in wrong:
        print(w)
    print(f"parents: 2 rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


async def rebuild() -> int:
    """D-1110, D-1114: one Calculate settles the bid. The rebuild a choice applied in the results panel writes (the
    grading's lines alone, D-899) deletes only the lines the grading built (D-1114: each line carries its builder).
    For every choice that rebuilds (each method, both liner materials, proof roll, undercut), a Calculate's full line
    set, then the rebuild to another choice, must equal a full Calculate of that choice line for line. The lines
    other builders wrote (the construction layout, a tree removal Count's tree and stump, a section's clearing, a
    utility run) and a line no builder tagged must stay live. Before D-1110 the rebuild retired the layout and the
    trees ($1,514.66 on Real bid B with site soil); before D-1114 an allow-list kept the roles it named and retired an
    untagged line. On the throwaway "zz MyEq project", rolled back."""
    from sqlalchemy import select

    from app.database import SessionFactory
    from app.features.drawing.models import DrawingSheet
    from app.features.earthwork import lines as earthwork_lines
    from app.features.earthwork.schemas import LineWrite
    from app.features.project.models import Project
    from app.features.takeoff.models import TakeoffItem

    def line(region: str, role: str, name: str, qty: float, unit: str, **more: object) -> LineWrite:
        return LineWrite(region_id=region, role=role, name=name, quantity=qty, unit=unit, **more)

    def grade(*rows: tuple[str, ...] | tuple[str, str, float, str, str]) -> list[LineWrite]:
        return [line("qt:grade", r[0], r[1], r[2], r[3], variant=r[4] if len(r) > 4 else None, builder="grading") for r in rows]

    excavator = (("cut", "Cut", 1200.0, "BCY"), ("fill", "Fill", 800.0, "CCY"), ("cut_export", "Cut to export", 400.0, "BCY"))
    choices = {
        "method-excavator": grade(*excavator),
        "method-dozer-push": grade(("cut_push", "Cut, dozer push", 1200.0, "BCY"), ("fill_push", "Fill, dozer push", 800.0, "CCY"), ("cut_export", "Cut to export", 400.0, "BCY")),
        "method-scraper": grade(("cut_scraper", "Cut, scraper", 1200.0, "BCY"), ("fill_scraper", "Fill, scraper", 800.0, "CCY"), ("cut_export", "Cut to export", 400.0, "BCY")),
        "liner-site": grade(*excavator, ("replacement_fill", "Clay liner, site soil", 1019.0, "CCY", "liner:site"), ("liner_testing", "Liner testing", 1.0, "LS")),
        "liner-import": grade(*excavator, ("replacement_fill", "Clay liner, imported", 1019.0, "CCY", "liner:import"), ("soil_import", "Import clay", 1100.0, "LCY"), ("liner_testing", "Liner testing", 1.0, "LS")),
        "proof-roll": grade(*excavator, ("proof_roll", "Proof roll", 2.0, "ACRE")),
        "undercut": grade(*excavator, ("undercut_haul", "Undercut, haul off", 90.0, "BCY"), ("undercut_replace", "Undercut, replace", 90.0, "CCY")),
    }
    others = [
        line("layout:site", "layout_staking", "Construction layout, own crew: mass grading", 2.4, "HR", variant="own_crew", builder="layout"),
        line("layout:utilities", "layout_staking", "Construction layout, own crew: 50 LF of pipe", 0.4, "HR", variant="own_crew", builder="layout"),
        line("qt:trees", "tree_removal", "Tree removal, 12 in", 3.0, "EA", variant="count", size_in=12.0, builder="section"),
        line("qt:trees", "stump_removal", "Stump removal, 12 in", 3.0, "EA", variant="count", size_in=12.0, builder="section"),
        line("qt:clear", "clearing_haul", "Clearing debris, haul off", 40.0, "LCY", variant="clearing", builder="clearing"),
        line("util:storm", "utility_pipe", '24" RCP Wall B, 0-6 ft deep', 50.0, "LF", variant="rcp_c76_wall_b:24|1|0-6 ft", utility="storm", folder="utilities", run_lf=50.0, builder="utilities"),
        # A water main: D-1110's keep list left pressure and fused pipe off, so a rebuild retired it.
        line("util:water", "utility_pipe_pressure", '8" DI PC 350, 4 ft cover', 120.0, "LF", variant="di_c151_pc350:8|1|0-6 ft", utility="water", folder="utilities", run_lf=120.0, builder="utilities"),
        # A line no builder tagged (a line written before D-1114, here a site feature's silt fence): not the grading's.
        line("qt:other", "line_silt_fence", "Silt fence, no builder tagged", 300.0, "LF"),
    ]
    wrong: list[str] = []
    rows = 0
    async with SessionFactory() as session:
        try:
            project = await session.scalar(select(Project).where(Project.name == "zz MyEq project"))
            sheet = await session.scalar(select(DrawingSheet).where(DrawingSheet.project_id == project.id)) if project else None
            if project is None or sheet is None:
                print("FAIL  rebuild: the throwaway project zz MyEq project (or its sheet) is missing")
                return 1
            pid, sid, wid = project.id, sheet.id, project.workspace_id

            async def live() -> set[tuple[str | None, str | None, str, float]]:
                found = await session.scalars(
                    select(TakeoffItem).where(TakeoffItem.project_id == pid, TakeoffItem.sheet_id == sid, TakeoffItem.earthwork_role.is_not(None), TakeoffItem.earthwork_retired.is_(False))
                )
                return {(r.earthwork_role, r.earthwork_variant, r.name, round(float(r.calculated_quantity or 0), 4)) for r in found}

            uid = project.created_by_id

            async def calculate(lines: list[LineWrite], keep: bool = False) -> None:
                await earthwork_lines.write_lines(wid, session, project=project, sheet_id=sid, layer_id=None, user_id=uid, lines=lines, keep_utilities=keep)
                await session.flush()

            async def undo(nested) -> None:  # type: ignore[no-untyped-def]
                await nested.rollback()
                await session.refresh(project)

            # Each choice's full Calculate, once, in a savepoint rolled back.
            full: dict[str, set[tuple[str | None, str | None, str, float]]] = {}
            for name, grading in choices.items():
                nested = await session.begin_nested()
                await calculate([*grading, *others])
                full[name] = await live()
                await undo(nested)
                if len(full[name]) != len(grading) + len(others):
                    wrong.append(f"FAIL  rebuild-calculate-{name}: {len(full[name])} lines written, expected {len(grading) + len(others)}")
            # The base choice's Calculate, then the rebuild to each other choice and back, one after another (a write
            # here is about 30 s): each rebuild equals the full Calculate of the choice it rebuilt to.
            base = next(iter(choices))
            nested = await session.begin_nested()
            await calculate([*choices[base], *others])
            for other in list(choices)[1:]:
                for end in (other, base):
                    await calculate(choices[end], keep=True)
                    rebuilt = await live()
                    rows += 1
                    if rebuilt != full[end]:
                        wrong.append(f"FAIL  rebuild-to-{end} (via {other}): lost {sorted(map(str, full[end] - rebuilt))}, kept {sorted(map(str, rebuilt - full[end]))}")
            await undo(nested)
        finally:
            await session.rollback()
    for w in wrong:
        print(w)
    print(f"rebuild: {len(choices)} choices, {rows} rebuilds against a full Calculate, {len(others)} other lines, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


# D-1091: order-size tiers on the defaults, by hand. RCP 24 in at its bulk base $41.70: 120 LF Small x1.20 = 50.04;
# 300 LF Standard x1.10 = 45.87; 800 LF Bulk 41.70. #57 stone $37.12: 6 t Small, one load short of the 10 t least
# load, x1.10 x 10 / 6 = 68.05; 30 t, two loads, the last 8 t billed at 10, x1.10 x 32 / 30 = 43.55. Concrete
# $163.46: 13 CY Small, two trucks, the last 3 CY short of 6, x1.10 + 3 x $40 / 13 = 189.04; 25 CY Standard x1.05 =
# 171.63. The compactor: a plate under 24 in, a trench roller from 24 in. Types: RCP rigid, PVC plastic, #57
# aggregate, cast-in-place concrete; a clay liner none.
ORDER_TIERS = [
    ("pipe:rcp_c76_wall_b:24", 41.70, 120, 50.04, "Small"),
    ("pipe:rcp_c76_wall_b:24", 41.70, 300, 45.87, "Standard"),
    ("pipe:rcp_c76_wall_b:24", 41.70, 800, 41.70, "Bulk"),
    ("stone:_57_stone", 37.12, 6, 68.05, "Small"),
    ("stone:_57_stone", 37.12, 30, 43.55, "Small"),
    ("cip:concrete", 163.46, 13, 189.04, "Small"),
    ("cip:concrete", 163.46, 25, 171.63, "Standard"),
]
ORDER_TYPES = {
    "pipe:rcp_c76_wall_b:24": "pipe_rigid",
    "pipe:pvc_d3034_sdr26:8": "pipe_plastic",
    "stone:_57_stone": "aggregate",
    "cip:concrete": "concrete",
    "fill:clay": None,
}


def orders() -> int:
    from types import SimpleNamespace

    from app.features.equipment.production import sized_compactor
    from app.features.materials import tiers

    wrong = []
    for key, base, total, want, name in ORDER_TIERS:
        kind = tiers.type_of(key)
        t = tiers.tier_for(kind or "", total)
        got = round(base * t.multiplier + t.add, 2)
        if got != want or t.name != name:
            wrong.append(f"FAIL  order-{key}-{total}: {got} {t.name}, expected {want} {name}")
    for key, kind in ORDER_TYPES.items():
        if tiers.type_of(key) != kind:
            wrong.append(f"FAIL  order-type-{key}: {tiers.type_of(key)}, expected {kind}")
    # The quantity formulas Calculate writes, read for the project total (QTY, ceil; nothing else runs).
    for text, qty, want in (("QTY", 49.74, 49.74), ("ceil(QTY / 8)", 49.74, 7.0), ("QTY * 27 * 108 / 2000", 2.0, 2.916), ("__import__(1)", 1.0, None)):
        got = tiers.line_qty(text, qty)
        if (got is None) != (want is None) or (got is not None and want is not None and round(got, 6) != want):
            wrong.append(f"FAIL  order-qty-{text}: {got}, expected {want}")
    # D-1097: the site condition. Urban at 0.55 (TxDOT 0-4416-1, 75 / 136 LF a day); a run's own over the project's;
    # 36 in RCP at 12-14 ft urban: 0.68 x 0.55 x 2/3 = 0.249333.
    from app.features.equipment.production import pipe_pace

    for variant, default, want in (
        ("rcp_c76_wall_b:24|1|0-6 ft|urban", False, 0.55),
        ("rcp_c76_wall_b:24|1|0-6 ft|open", True, 1.0),
        ("rcp_c76_wall_b:24|1|0-6 ft", True, 0.55),
        ("rcp_c76_wall_b:36|1|12-14 ft|urban", False, 0.249333),
    ):
        got = round(pipe_pace(SimpleNamespace(earthwork_variant=variant, earthwork_crew=None), default), 6)
        if got != want:
            wrong.append(f"FAIL  site-condition-{variant}-{default}: {got}, expected {want}")
    # D-1105: a pressure main's pace by its own size and depth tables, never the storm drain's. 8 in PVC at 0-6 ft the
    # crew's rate; 12 in at 6-8 ft 0.97 x 0.85; ductile iron 12 in 0.34 (Michigan DOT, VDOT); 24 in 0.19; 30 in PVC
    # 0.53 (no 0.68 large-pipe pace); 8 in at 12-14 ft urban 0.55 x 0.55; fused 8 in at 8-10 ft 0.7.
    for variant, crew, want in (
        ("pvc_c900_dr18:8|1|0-6 ft", "pressure", 1.0),
        ("pvc_c900_dr18:12|1|6-8 ft", "pressure", 0.8245),
        ("di_c151_pc350:12|1|0-6 ft", "pressure", 0.34),
        ("di_c151_pc350:24|1|0-6 ft", "pressure", 0.19),
        ("pvc_c900_dr18:30|1|0-6 ft", "pressure", 0.53),
        ("pvc_c900_dr18:8|1|12-14 ft|urban", "pressure", 0.3025),
        ("hdpe_ips_dr11:8|1|8-10 ft", "fused", 0.7),
    ):
        got = round(pipe_pace(SimpleNamespace(earthwork_variant=variant, earthwork_crew=crew), False), 6)
        if got != want:
            wrong.append(f"FAIL  pressure-pace-{variant}: {got}, expected {want}")
    # D-1105: release 43's pressure kits: A18's production by run length (10 h day) and its short-run backhoe.
    from sqlalchemy import text as sql_text

    from app.database import sync_engine as rows_engine

    with rows_engine.connect() as conn:
        prod = [float(v) for (v,) in conn.execute(sql_text("SELECT prod_per_day FROM eqlib.ew_default WHERE activity_key = 'A18' ORDER BY qty_from")).all()]
        short = sorted(k for (k,) in conn.execute(sql_text("SELECT equip_key FROM eqlib.ew_tier_machine WHERE activity_key = 'A18' AND tier_no = 0")).all())
        # D-1112 (release 44): the basis graded as its sources are; VDOT from a wiki copy and ADOT's storm rule at C.
        basis = {b for (b,) in conn.execute(sql_text("SELECT DISTINCT basis FROM eqlib.ew_default WHERE activity_key IN ('A18', 'A19')")).all()}
    if prod != [180.0, 280.0, 340.0, 380.0, 400.0, 420.0] or short != ["BH-STD-14FT", "CP-PLATE-REV", "TRK-PU-8808"]:
        wrong.append(f"FAIL  release-43-a18: {prod} {short}, expected 180-420 LF a day and a backhoe loader's short-run kit")
    if basis != {"D-1112: WSDOT B; VDOT wiki copy C; ADOT storm C, run length"}:
        wrong.append(f"FAIL  release-44-basis: {basis}")
    # D-1095: a metro with no row for an occupation scales the state's by its construction ratio: Lake Havasu's
    # pipelayer, Arizona median 30.16 x 0.888 = 26.78 (the median of the metro's 47- occupations over the state's).
    from app.wagecalc.market import load_market

    lh = load_market().oews_for("47-2151", "04015", None, "median")
    if lh is None or round(lh.value, 2) != 26.78 or not (lh.scaled_from or "").startswith("Arizona median $30.16 x 0.888"):
        wrong.append(f"FAIL  metro-scaled-pipelayer: {lh and lh.value} {lh and lh.scaled_from}, expected 26.78 from Arizona x 0.888")
    # D-1094: the Houston area's dump fees, clean soil and rubble $0, mixed C&D $34.17 a ton; others national.
    from sqlalchemy import text as sql

    from app.database import sync_engine

    with sync_engine.connect() as conn:
        got_fees = dict(conn.execute(sql("SELECT mat_key, unit_price FROM matlib.mat_region_default WHERE cbsa = '26420'")).all())
    if {k: float(v) for k, v in got_fees.items()} != {"disposal:clean_soil": 0.0, "disposal:rubble": 0.0, "disposal:mixed_cd": 34.17}:
        wrong.append(f"FAIL  houston-dump-fees: {got_fees}")
    for size, want in ((8, "CP-PLATE-REV"), (18, "CP-PLATE-REV"), (24, "CP-TRENCH-ROLLER"), (48, "CP-TRENCH-ROLLER")):
        got = sized_compactor([SimpleNamespace(earthwork_variant=f"rcp_c76_wall_b:{size}|1|6-8 ft")])
        if got != want:
            wrong.append(f"FAIL  compactor-{size}: {got}, expected {want}")
    for w in wrong:
        print(w)
    print(f"order sizes: {len(ORDER_TIERS) + len(ORDER_TYPES) + 14} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


def main() -> None:
    if sys.argv[1:] == ["orders"]:
        sys.exit(orders())
    if sys.argv[1:] == ["parents"]:
        import asyncio

        sys.exit(asyncio.run(parents()))
    if sys.argv[1:] == ["hidden"]:
        import asyncio

        sys.exit(asyncio.run(hidden()))
    if sys.argv[1:] == ["rebuild"]:
        import asyncio

        sys.exit(asyncio.run(rebuild()))
    if sys.argv[1:] == ["roles"]:
        sys.exit(roles())
    if sys.argv[1:] == ["wages"]:
        sys.exit(wages())
    if sys.argv[1:] == ["prevailing"]:
        sys.exit(prevailing())
    if sys.argv[1:] == ["union"]:
        sys.exit(union())
    if sys.argv[1:] == ["typed"]:
        sys.exit(typed())
    if sys.argv[1:] == ["onsite"]:
        sys.exit(onsite())
    if sys.argv[1:] == ["pool"]:
        sys.exit(pooled())
    cases = json.load(sys.stdin)
    if sys.argv[1:] == ["scaleundo"]:
        import asyncio

        print(json.dumps(asyncio.run(scale_undo(cases))))
        return
    if sys.argv[1:] == ["fxsystem"]:
        print(json.dumps([{"id": c["id"], "value": fx_system(c)} for c in cases]))
        return
    if sys.argv[1:] == ["subitems"]:
        print(json.dumps([{"id": c["id"], "value": subitem(c)} for c in cases]))
        return
    if sys.argv[1:] == ["seed"]:
        print(json.dumps([{"id": c["id"], "value": seed(c)} for c in cases]))
        return
    if sys.argv[1:] == ["credits"]:
        print(json.dumps([{"id": c["id"], "value": credit(c)} for c in cases]))
        return
    if sys.argv[1:] == ["site"]:
        print(json.dumps([{"id": c["id"], "value": site_row(c)} for c in cases]))
        return
    if sys.argv[1:] == ["register"]:
        print(json.dumps([{"id": c["id"], "value": registration(c)} for c in cases]))
        return
    print(json.dumps([{"id": c["id"], "value": figure(c)} for c in cases]))


if __name__ == "__main__":
    main()

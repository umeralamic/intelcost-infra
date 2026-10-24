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
    for w in wrong:
        print(w)
    print(f"wage roles: {len(ROLE_CASES)} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


def main() -> None:
    if sys.argv[1:] == ["roles"]:
        sys.exit(roles())
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

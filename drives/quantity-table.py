"""The shared quantity table through the api's quantity engine (D-61, kept by D-68).

Reads the cases on stdin (written by `browser/quantity-table.mjs` with GEN=1), prints each
row's figure as the api stores it. Pure: no database, no network. `./quantity-table.sh`
runs both halves.

    docker compose exec -T api sh -lc "cd /srv && python drives/quantity-table.py" <cases.json

With `register`, it reads F18's registration rows instead and fits each through the api's
`earthwork/register.py` (D-188). With `credits`, F14's credit rows through the api's
`ai/meter.py` (D-236): metering, the estimate, holds, settlement, refunds and refills.
"""

import json
import math
import sys
from decimal import Decimal

from app.features.ai import meter
from app.features.earthwork import register
from app.features.takeoff import quantity
from app.features.takeoff.models import TakeoffItemType


def figure(case: dict) -> float:
    page = (float(case["page"][0]), float(case["page"][1]))
    fpp = float(case["fpp"])
    kind = TakeoffItemType(case["type"])
    shapes = case["shapes"]
    if kind is TakeoffItemType.SF:
        positives = [(s["vertices"], s["meta"]) for s in shapes if s.get("role") != "subtract"]
        deducts = [(s["vertices"], s["meta"]) for s in shapes if s.get("role") == "subtract"]
        return quantity.area_on_sheet(positives, deducts, fpp, page)
    return sum(quantity.compute(kind, s["vertices"], s["meta"], fpp, page) for s in shapes)


def registration(case: dict) -> dict:
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
            wallet = meter.refill(wallet, int(op[1]))
    return {
        "included": _four(wallet.included),
        "purchased": _four(wallet.purchased),
        "held": _four(wallet.held),
        "charged": _four(charged),
        "refused": refused,
    }


def main() -> None:
    cases = json.load(sys.stdin)
    if sys.argv[1:] == ["credits"]:
        print(json.dumps([{"id": c["id"], "value": credit(c)} for c in cases]))
        return
    if sys.argv[1:] == ["register"]:
        print(json.dumps([{"id": c["id"], "value": registration(c)} for c in cases]))
        return
    print(json.dumps([{"id": c["id"], "value": figure(c)} for c in cases]))


if __name__ == "__main__":
    main()

"""F7-S2's shared table through the api's quantity engine (D-61).

Reads the cases on stdin (written by `browser/f7-s2.mjs` with GEN=1), prints each row's
figure as the api stores it. Pure: no database, no network.

    docker compose exec -T api sh -lc "cd /srv && python drives/f7-quantity.py" <cases.json
"""

import json
import sys

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


def main() -> None:
    cases = json.load(sys.stdin)
    print(json.dumps([{"id": c["id"], "value": figure(c)} for c in cases]))


if __name__ == "__main__":
    main()

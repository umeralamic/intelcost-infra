"""F7-S2's shared table through the api's quantity engine (D-61).

Reads the cases on stdin (written by `browser/f7-s2.mjs` with GEN=1), prints each row's
figure as the api stores it. Pure: no database, no network.

    docker compose exec -T api sh -lc "cd /srv && python drives/f7-quantity.py" <cases.json

Updated 2026-10-19 (D-619): the shared case table gained rows with `mods` (D-360), whose worked
answer is the measured figure through the item's modifiers. They go through `apply_modifiers`
here, as the shared quantity table's own drive does; the figures are the table's, unchanged.
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
        base = quantity.area_on_sheet(positives, deducts, fpp, page)
    else:
        base = sum(quantity.compute(kind, s["vertices"], s["meta"], fpp, page) for s in shapes)
    mods = case.get("mods")
    if not mods or base is None:
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


def main() -> None:
    cases = json.load(sys.stdin)
    print(json.dumps([{"id": c["id"], "value": figure(c)} for c in cases]))


if __name__ == "__main__":
    main()

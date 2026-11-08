"""F6-S4's shared table through the api's formula engine.

Reads the rows as JSON on stdin (`browser/f6-s4.mjs` with GEN=1 writes them), evaluates
each with `app.features.takeoff.formula`, and prints the answers as JSON on stdout, for
the fixture to compare with the browser's engine. Run by `browser/f6-s4.sh`:

    docker compose exec -T api sh -lc "cd /srv && python drives/f6-formula.py" < cases.json
"""

import json
import sys

from app.features.takeoff.formula import FormulaEnv, evaluate

FIELDS = {
    "parent": "parent",
    "perimeter": "perimeter",
    "segmentCount": "segment_count",
    "pointCount": "point_count",
    "countEA": "count_ea",
    "baseUnavailableMessage": "base_unavailable_message",
    "areaSF": "area_sf",
    "areaBeforeDeductsSF": "area_before_deducts_sf",
    "deductAreaSF": "deduct_area_sf",
    "linearFT": "linear_ft",
    "linearBeforeDeductsFT": "linear_before_deducts_ft",
    "wallAreaSF": "wall_area_sf",
    "volumeCF": "volume_cf",
    "subs": "subs",
    "vars": "vars",
    "dims": "dims",
    "refs": "refs",
}


def main() -> None:
    rows = json.load(sys.stdin)
    out = []
    for row in rows:
        env = FormulaEnv(**{FIELDS[key]: value for key, value in row["env"].items()})
        result = evaluate(row["formula"], env)
        answer = {"id": row["id"], "ok": result.ok}
        if result.ok:
            answer["value"] = result.value
        else:
            answer["error"] = result.error
        out.append(answer)
    json.dump(out, sys.stdout)


main()

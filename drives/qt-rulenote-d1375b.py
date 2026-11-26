"""D-1375 part b (item 3b of the 2026-11-30 night run), a quantity-table row set: the owed wage note named by its cause
(the founder's D-1371 Q4b) and its foreman priced from the stored rows (D-1378 1), through the api's own functions. Pure:
nothing is read from or written to the database. `./quantity-table.sh` runs it:

    docker compose exec -T api sh -lc "cd /srv && python drives/qt-rulenote-d1375b.py"

Worked by hand:
- `rule_notes.rule_effect_of(was, now)`: the after inputs' rates by the before rules (`was`) and by the after rules
  (`now`), crafts then subtypes. Equal to the cent -> False (no rule changed a figure: "Rates updated"). Davis 84041's
  Equipment Operator by rules 10 (33.25) and 11 (32.64), D-1374 -> the rule's change CC-11 -0.61. Only a subtype differs
  (an excavator 47.66 -> 47.71) -> CC-11 0.00 and the excavator +0.05.
- `rule_notes.without_rule(after, ...)`: the after set less the rule's own change. After CC-11 32.70 (32.64 plus a day's
  escalation 0.06), CC-16 25.00, the rule CC-11 -0.61 -> CC-11 33.31, CC-16 25.00, the Laborer (the foreman's base with
  no other craft) 25.00. A rule that moved the Laborer +0.50 -> 24.50 there.
- The record keeps the rule's part and the move's time (`rule_delta`, `moved_at`): the model's columns, the payload.
- `labor.price_foremen`, the api's own foreman (the app's `foremanIn` must equal it): P08's operator crew at 39.25 and a
  15 % premium -> 39.25 x 1.15 = 45.1375 -> 45.14 (D-1376: the stored foreman); the excavator crew at 47.66 -> 54.809 ->
  54.81; at 42.61 -> 49.0015 -> 49.00; a 10 % premium at 39.25 -> 43.175 -> 43.18 and at 39.35 -> 43.285 -> 43.28 (half
  to even, `Decimal.quantize`); a crew whose crane (44.62) out-earns its operator (39.25) -> 51.313 -> 51.31; a foreman
  with no other craft over the Laborer's 33.52 at 10 % -> 36.872 -> 36.87.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

from datetime import UTC, datetime
from decimal import Decimal


def check(wrong: list[str], rid: str, got: object, want: object) -> None:
    if got != want:
        wrong.append(f"FAIL  {rid}: {got!r}, expected {want!r}")


def D(v: str) -> Decimal:
    return Decimal(v)


def main() -> int:
    from app.features.estimate.models import EstimateRuleNote
    from app.features.estimate.rule_notes import RuleEffect, rule_effect_of, without_rule
    from app.features.estimate.schemas import RuleNoteRecord, SetDerived, WagesBefore
    from app.features.wage_calculator.labor import ForemanContext, price_foremen

    wrong: list[str] = []
    rows = 0

    same = ({"CC-11": D("32.70"), "CC-16": D("25.00")}, {"CC-11": {"excavator": D("39.73")}})
    check(wrong, "d1375b-escalation-only-no-rule", rule_effect_of(same, same, "CC-16"), False)
    rows += 1
    r10 = ({"CC-11": D("33.25"), "CC-16": D("24.72")}, {})
    r11 = ({"CC-11": D("32.64"), "CC-16": D("24.72")}, {})
    check(wrong, "d1375b-rule-changes-a-craft", rule_effect_of(r10, r11, "CC-16"), RuleEffect({"CC-11": D("-0.61"), "CC-16": D("0.00")}, {}, "CC-16"))
    rows += 1
    s_was = ({"CC-11": D("39.25")}, {"CC-11": {"excavator": D("47.66")}})
    s_now = ({"CC-11": D("39.25")}, {"CC-11": {"excavator": D("47.71")}})
    check(wrong, "d1375b-rule-changes-a-subtype", rule_effect_of(s_was, s_now, None), RuleEffect({"CC-11": D("0.00")}, {"CC-11": {"excavator": D("0.05")}}, None))
    rows += 1

    derived = SetDerived(premium=D("0.10"), laborer=D("25.00"))
    out = without_rule({"CC-11": D("32.70"), "CC-16": D("25.00")}, {}, derived, RuleEffect({"CC-11": D("-0.61"), "CC-16": D("0.00")}, {}, "CC-16"))
    check(wrong, "d1375b-without-rule-rates", (out.rates, out.derived.laborer if out.derived else None), ({"CC-11": D("33.31"), "CC-16": D("25.00")}, D("25.00")))
    rows += 1
    out = without_rule({"CC-16": D("25.00")}, {"CC-11": {"excavator": D("47.71")}}, derived, RuleEffect({"CC-16": D("0.50")}, {"CC-11": {"excavator": D("0.05")}}, "CC-16"))
    check(wrong, "d1375b-without-rule-laborer-and-subtype", (out.rates, out.subtypes, out.derived.laborer if out.derived else None), ({"CC-16": D("24.50")}, {"CC-11": {"excavator": D("47.66")}}, D("24.50")))
    rows += 1

    cols = set(EstimateRuleNote.__table__.c.keys())
    check(wrong, "d1375b-record-columns", {"rule_delta", "moved_at"} <= cols, True)
    rows += 1
    rec = RuleNoteRecord.model_validate({"key": "wages", "delta": "116.11", "rule_delta": "0.00", "moved_at": "2026-11-25T20:25:50Z"})
    check(wrong, "d1375b-record-payload", (rec.delta, rec.rule_delta, rec.moved_at), (D("116.11"), D("0.00"), datetime(2026, 11, 25, 20, 25, 50, tzinfo=UTC)))
    rows += 1
    old = RuleNoteRecord.model_validate({"key": "wages", "delta": "-8.47"})
    check(wrong, "d1375b-record-before-shows-as-before", (old.rule_delta, old.moved_at), (None, None))
    rows += 1
    wire = WagesBefore.model_validate(
        {
            "moved_at": "2026-11-26T16:00:00Z",
            "rates": {"CC-11": ["33.25", "32.70"]},
            "derived": [{"premium": "0.15", "laborer": "32.37"}, {"premium": "0.15", "laborer": "38.52"}],
            "rule_effect": True,
            "without_rule": {"rates": {"CC-11": "33.31"}, "derived": {"premium": "0.15"}},
        }
    )
    check(wrong, "d1375b-move-wire", (wire.rule_effect, wire.without_rule.rates if wire.without_rule else None, [d.laborer for d in wire.derived]), (True, {"CC-11": D("33.31")}, [D("32.37"), D("38.52")]))
    rows += 1

    def foreman(top: list[tuple[str, float]], premium: str, laborer: str | None = None) -> float | None:
        crew = [{"role": r, "count": 1, "hourly_wage": w, "rate_source": "wage_set"} for r, w in top]
        crew.append({"role": "Foreman", "count": 1, "hourly_wage": 0, "rate_source": "wage_set", "foreman": True})
        context = ForemanContext(premium=D(premium), laborer=D(laborer) if laborer else None, determination=None)
        priced = price_foremen(crew, context) or []
        return next((r["hourly_wage"] for r in priced if r.get("foreman")), None)

    for rid, top, premium, laborer, want in (
        ("d1375b-foreman-p08-operator", [("Operator", 39.25)], "0.15", None, 45.14),
        ("d1375b-foreman-p08-excavator", [("Operator", 47.66)], "0.15", None, 54.81),
        ("d1375b-foreman-p08-now", [("Operator", 42.61)], "0.15", None, 49.00),
        ("d1375b-foreman-half-even-up", [("Operator", 39.25)], "0.10", None, 43.18),
        ("d1375b-foreman-half-even-stays", [("Operator", 39.35)], "0.10", None, 43.28),
        ("d1375b-foreman-top-is-the-crane", [("Crane", 44.62), ("Operator", 39.25)], "0.15", None, 51.31),
        ("d1375b-foreman-alone-on-laborer", [], "0.10", "33.52", 36.87),
    ):
        check(wrong, rid, foreman(top, premium, laborer), want)
        rows += 1

    for w in wrong:
        print(w)
    print(f"wage note by its cause (D-1375 part b): {rows} rows, {'all right' if not wrong else f'{len(wrong)} wrong'}")
    return 1 if wrong else 0


if __name__ == "__main__":
    raise SystemExit(main())

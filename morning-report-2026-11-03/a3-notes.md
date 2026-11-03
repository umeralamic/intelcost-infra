# A3: one operator per ride-on machine, one driver per truck, laborers on hand-guided equipment

Plan file: `a3-plan.csv`, one row for each of the 432 machine rows, built by `a3.js`.

## Sources

The rule sources are the 58 `operator_rule` rows in `production_research_points_2026-11b.csv`. They are cited by their 0-based data-row index, 728 to 785.

The research names no operator rule for pickups. For trucks, it has no truck-specific row: trucks rely on the founder's rule and on 763 (Washington: all self-propelled equipment falls to the operating engineer).

## Classification counts

| Classification | Machine rows | What changes |
|---|---|---|
| Operator: ride-on or self-propelled machines and trucks | 312 | 275 already get their own operator row. The other 37 had crew_runs Y, which is now removed. |
| Laborer: hand-guided equipment | 57 | 43 have crew_runs Y, which is kept because a crew laborer runs them. 14 have no crew_runs, so the app adds a laborer per unit; they are left as they are. |
| Support: TRK-PU-8808 pickups | 30 | Crew_runs Y is kept. The foreman drives the pickup, so there is no dedicated driver. This is a judgment call: removing Y would add a Truck Driver row to 30 crews. |
| Attachment: GPS kit, breakers, thumb, trench boxes, skid-steer broom and roller attachments | 33 | No person is needed either way. |

## People before and after, by activity and tier

How the people are counted:

- **Before** is the operator and driver rows the app adds today. That is one per unit of every operator-class machine without crew_runs. DT-OP-3AXLE counts as already having its driver, because the driver is inside the operated rate.
- **After** is one per unit of every operator-class machine.
- Every activity and tier not listed below is unchanged.

| Activity | Tier | Operators/drivers before | After | Change | Detail |
|---|---|---|---|---|---|
| A18 Pipe crew, pressure (PVC/DI) | 1 | 1 | 2 | +1 | +1 operator for WL-COMPACT-2Y (loader) |
| A18 Pipe crew, pressure (PVC/DI) | 2 | 1 | 2 | +1 | +1 operator for WL-COMPACT-2Y (loader) |
| A19 Pipe crew, HDPE fused | 1 | 1 | 2 | +1 | +1 operator for WL-COMPACT-2Y (loader) |
| A19 Pipe crew, HDPE fused | 2 | 1 | 2 | +1 | +1 operator for WL-COMPACT-2Y (loader) |
| A22 Water fittings, per each | 1 | 1 | 2 | +1 | +1 operator for WL-COMPACT-2Y (loader) |
| A23 Water service | 1 | 0 | 1 | +1 | +1 operator for BH-STD-14FT (backhoe). Nobody in the crew could run it before. |
| A26 Castings adjusted | 1 | 0 | 0.5 | +0.5 | +0.5 operator for BH-STD-14FT (backhoe) |
| A27 Structure setting (storm, per each) | 1 | 1 | 3 | +2 | +1 operator for WL-COMPACT-2Y (loader); +1 operator for CP-SD-84-SM (roller) |
| A28 Pipe crew, sewer main | 1 | 1 | 5 | +4 | +1 operator for the second EX-CRAWL-30T (two excavators); +1 for WL-COMPACT-2Y (loader); +1 for CP-SD-84-SM (roller); +1 for DZ-CRAWL-D4 (dozer) |
| A28 Pipe crew, sewer main | 2 | 2 | 5 | +3 | +1 operator for WL-COMPACT-2Y (loader); +1 for DZ-CRAWL-D4 (dozer); +1 for CP-SD-66-SM (roller) |
| A32 Pipe crew, storm | 1 | 1 | 3 | +2 | +1 operator for WL-COMPACT-2Y (loader); +1 for CP-SD-66-SM (roller) |
| A32 Pipe crew, storm | 2 | 1 | 3 | +2 | +1 operator for WL-COMPACT-2Y (loader); +1 for CP-SD-66-SM (roller) |
| A32 Pipe crew, storm | 3 | 2 | 4 | +2 | +1 operator for WL-COMPACT-2Y (loader); +1 for CP-SD-66-SM (roller) |
| A33 Roof drains | 1 | 0 | 1 | +1 | +1 operator for BH-STD-14FT (backhoe) |
| A38 Stone base, hauled in | 1 | 1.5 | 3.5 | +2 | +1 operator for GR-12FT-140 (grader); +1 for CP-SD-84-SM (roller) |
| A39 Stone base, on site | 1 | 2.5 | 3.5 | +1 | +1 operator for GR-12FT-140 (grader) |
| A40 Sidewalk, by hand | 1 | 0 | 1 | +1 | +1 operator for SS-WHEEL-LARGE (skid steer) |
| A41 Sidewalk rework | 1 | 0.3 | 1.3 | +1 | +1 operator for SS-WHEEL-LARGE (skid steer). The AT-BRK-MINI breaker rides on it, so it needs no extra person. |
| A42 ADA ramp | 1 | 0 | 0.5 | +0.5 | +0.5 operator for SS-WHEEL-LARGE (skid steer) |
| A43 Curb, by machine | 1 | 0 | 1 | +1 | +1 operator for CN-CURB-MACHINE (curb machine) |
| A44 Curb, by hand | 1 | 0 | 1 | +1 | +1 operator for SS-WHEEL-LARGE (skid steer) |
| A46 Build forms | 1 | 0 | 0.5 | +0.5 | +0.5 operator for BH-STD-14FT (backhoe) |
| A47 Asphalt paving | 1 | 3 | 4 | +1 | +1 operator for SS-WHEEL-LARGE (skid steer, which carries the broom) |
| A47 Asphalt paving | 2 | 3 | 4 | +1 | same as tier 1 |
| A47 Asphalt paving | 3 | 3 | 4 | +1 | same as tier 1 |
| A61 (name not in my map) | 1 | 1 | 3 | +2 | +1 operator for WL-COMPACT-2Y (loader); +1 for CP-SD-84-SM (roller) |

Total: **+35.5 operators across 26 activity-tiers**, from 37 crew_runs flags removed.

## Crew_runs kept, with reasons

**Ride-on machines: none kept.** In every crew where a ride-on machine had crew_runs, it runs at the same time as another ride-on machine, or it is the crew's only machine and nobody else in the crew is an operator. Some examples:

- A pipe crew's loader feeds bedding while the excavator lays pipe.
- The trench or structure roller compacts lifts while the loader places them.
- The grader spreads stone while the roller compacts it.

**Attachments that cannot run at the same time as their host machine.** These are kept as they are, and they need no person anyway:

| Activity | Attachment | Host machine | Reason |
|---|---|---|---|
| A41 | AT-BRK-MINI | SS-WHEEL-LARGE | The breaker sits on the skid steer, so the skid steer cannot use its bucket while breaking. |
| A47 tiers 1-3 | PV-BROOM-SSL | SS-WHEEL-LARGE | The broom sits on the skid steer, so it is one machine at a time. |

**Hand-guided equipment run by a crew laborer (43 rows).** Kept as founder rule:

- CP-PLATE-REV, rule rows 729, 737, 742, 762 and 785.
- CP-TRENCH-ROLLER, rule rows 739, 762, 737 and 742.
- CN-SAW-WB-14 and CN-SAW-EARLY, rule rows 782 and 739.
- CN-SCREED-VIB-10, rule rows 728, 739 and 767.
- LC-CHIP-8201, rule rows 740 and 741.

**Pickups (30 rows).** Kept as support, as a judgment call (see the classification table).

## Laborer check: at least one laborer per hand-guided machine with crew_runs Y

Only rows whose role is exactly "Laborer" were counted. Spotters, pipelayers and cement masons were left out.

**Short:**

- **A22 Water fittings:** 1 laborer, 2 hand-guided machines (trench roller and plate). The 2 pipelayers could cover, but the rule says laborers run hand-guided equipment. Either add 1 laborer, or clear crew_runs on one of the two so the app adds a laborer.
- **A23 Water service:** same as A22. It has 1 laborer and 2 pipelayers.

**Exactly enough, with no spare laborer for hand work:**

- **A37 Foundation prep:** 2 plates, 2 laborers.
- **A46 Build forms:** 2 plates and 1 saw, 3 laborers.
- **A54 Joint sawing:** 1 saw, 1 laborer.
- **A18 and A19, both tiers:** 2 machines, 2 laborers. The pipelayers lay the pipe.

**Every other crew** has more laborers than hand-guided machines.

## Other findings

- **A36 Scarify/tilling.** The crew sheet lists "Equipment Operator (tractor)", but the crew has no machine row. A wheel tractor needs an operator (rule 734, AZ Power Equipment Operator Group 1), so the tractor is missing from the starter crew.
- **A47 "Equipment Operator (screed)".** This is the asphalt paver's screedman, a person. It is not the concrete vibratory screed (CN-SCREED-VIB-10), which is laborer-run, so it is left as it is.
- **DT-OP-3AXLE.** The class says the driver is "included in operated rate". I assumed the app does not add a second driver row for it, but I have not checked that in code.

## Uncertain

**Rule rows that disagree:**

- **Trench roller.** Ohio rule 773 classes "vibratory compactors with integral power" as operating-engineer work. California rules 737, 739 and 742 and Minnesota rule 762 put it with laborers. I followed the founder (laborer).
- **Brush chipper.** Minnesota rule 754 and Ohio rule 774 class it as an operator machine. California rules 740 and 741 class it as laborer work. I followed the founder (laborer).
- **Small self-propelled packer.** Minnesota rule 761 classes it under a truck-driver class. That makes no difference here: it is still one person per machine.

**Possible founder exceptions.** These crews could arguably share one operator, but I removed crew_runs on them per the founder's rule:

- A27 and A61: the roller might alternate with the excavator.
- A26 and A46: the backhoe is used half the day (0.5 units). It gets a 0.5 operator.

**Fractional units.** Units of 0.5 and 0.25 were treated as a fractional person.

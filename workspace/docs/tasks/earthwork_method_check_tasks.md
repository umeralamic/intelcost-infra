# Earthwork method check: pits, vertical cuts and undercuts (next run)

Status: Planned (the founder, 2026-11-16). Investigate first, then fix; about 5–7 h. Not started.
Replaces the first version of this file (same day): 11166 is not on the bench, so there is no copy and no guard-list
change.

## The founder's brief, verbatim

Next run, earthwork method check: pits, vertical cuts and undercuts (investigate first, then fix; ~5–7 h).

INPUT: the founder's files in morning-report-2026-11-19/inputs/11166/ (grading report PDF + XLSX, estimate XLSX) for project 11166 (sheet C103). Read the files only. Look-alike test on a throwaway account: a site with existing grade sloping ~628–642 ft, a ~1,800 SF building pad cut to a flat elevation 9–10 ft below the surrounding grade with vertical edges, plus a variant with a 4 ft undercut under a pad extending 5 ft past the pad edges. Never touch founder projects.

1. Pits and vertical cuts: detect cut areas bounded by steep or vertical proposed-grade edges (a feature below the surrounding proposed grade, e.g. a basement pad) deeper than a threshold (propose one, ~4–5 ft, with a source). For those, ALL cut (to export AND to fill) is excavator: dig and load, haul (trucks or loader carry) to the fill areas, spread there. Dozer push only where the cut can be worked out on a ramp. Show it in the Methods table with the reason (e.g. "vertical edge 9.4 ft: excavator"). In the 11166 estimate, 41.3 BCY of the building pad was priced as "Cut, dozer push" (D8), which this rule must move to excavator.
2. Undercuts: the same rule applies to undercut excavation (e.g. 4 ft below a pad, extending 5 ft past its edges, vertical sides): excavator removal; replacement fill placed and compacted in lifts inside the pit with equipment that fits (small dozer/skid steer + roller or plate), not the open-site fill spread. Where pad cut + undercut together exceed 5 ft, apply OSHA sloping/shoring at the edges (or flag it).
3. Dozer on grade: confirm dozer push production adjusts for uphill/downhill grade (cite the basis); the 11166 zone was 13.9 % uphill, 47 ft.
4. Basement/pit over-excavation: propose an option on a below-grade feature: working space (default 2 ft) + side slope by OSHA soil type (or shoring), giving extra excavation and wall backfill quantities; flag it in Needs attention when the feature is deeper than 5 ft and the option is off. Report the quantities for the look-alike pad.
5. Dozer sizing: why a D8 (363 hp) on a ~0.4 acre site (pooled with clearing)? Propose sizing by job size and volume.
Report before/after quantities and $ on the look-alike test (and what the rule would do to the 11166 lines, from the files), and add quantity-table rows for the pit and undercut rules.

## Notes for the run

- Inputs: `intelcost-infra/morning-report-2026-11-19/inputs/11166/` (git-ignored). Read only. Nothing from the files
  (names, quantities, prices) goes into a repo file beyond what the rule needs; refer to the project as 11166. If the
  folder is missing, stop and ask (it did not exist when this file was written).
- The test site is built from scratch on a throwaway account (`fx.<name>.<YYYYMMDDHHMMSS UTC>`), purged at the end.
  No founder project is opened, copied or written.
- Takeoff invariants (CLAUDE.md hard rule 3) and the pure `takeoff-core` rule (hard rule 2) apply: thresholds with
  sources, the Methods-table reason text and the quantity-table rows are written into this spec before code. Log a
  D-number before implementing.
- 2026-11-16, later: the inputs folder is present with 3 files (estimate XLSX V1 2026-11-16, grading report PDF,
  grading report XLSX). File names carry the project's name: never copy them into a repo file; say "11166".

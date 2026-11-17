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

### STAGE 1 spec (D-1297, night run of 2026-11-16, step 2): written before any code

The investigation, with the file:function trace and the sources, is in
`intelcost-infra/morning-report-2026-11-20/step2/INVESTIGATION.md` (git-ignored). This section is what Stage 2 builds.

**What the engine does today (11166, from the founder's files).**
- The Building Slab's 41.28 BCY of cut to fill was "Cut, dozer push" on the D8 because a person chose Dozer push on its
  729 CY pocket in the Methods table, and a pocket's choice becomes one site-wide share applied to every region
  (`suggest.ts:pocketShares`, `lines.ts:methodsOf`). Nothing in the engine looks at depth or walls: D-920 says
  "depth enters the words, never the rule". This spec makes depth enter the rule for pits only, and supersedes that line
  of D-920 for them.
- The push's grade factor exists (`production.py:_grade_factor`, CPH 49 p.19-63 chart points, D-919), but it is one
  site-wide grade, soil-weighted over the dozer pockets: 11166's 13.9 % pocket was priced at the blended +10.09 %
  (factor 0.788, not 0.696), over a centroid line that crosses a vertical wall no dozer can climb.
- The D8 is the clearing spread's machine (D-958: a heavy dozer on every clearing class and area); the push's own D6
  (A14 tier 1) pooled onto it (D-1115).

**1. Pit threshold: 5.0 ft.** OSHA 29 CFR 1926.652(a)(1)(ii): a protective system is required unless the excavation is
less than 5 ft deep. A cut with a vertical edge of 5 ft or more cannot stay vertical while a machine and its crew work
its floor, so it is dug from the top by an excavator (FM 5-434 (2000) ¶8-2: the hoe's two kinds of excavation are
trenching and basement, area-type; ¶8-22: its cycle basis is an 8-12 ft depth of cut), and a loader or dozer working
inside one needs a built ramp (FM 5-434 ¶5-11). The same 5.0 ft is the sloping/shoring threshold (item 6), so one number
serves both; a workspace setting (`pit_wall_ft`). 4 ft (1926.651(c)(2), egress) is the alternative, not proposed.

**2. Detection (pure, analytic, `lib/takeoff/earthwork/volume/pits.ts`, from the result's prisms).**
- *Wall at a feature edge.* For each region (a Site Feature's own shape) walk its boundary: the edges of its prisms
  whose ε-outward neighbour (point location, a predicate, not a quantity) is another region or the remaining site;
  the site boundary is not a wall. On each such edge both sides' Δz are linear, so the wall height
  h = min(0, Δz_out) − Δz_in (Δz post-strip and post-section, as `PrismRow` stores it) is piecewise linear: split at the
  outside prisms' edge crossings, at Δz_out = 0 and at h = threshold. Exact per region: the maximum and minimum h, the
  length with h ≥ 5.0 ft and the face area ∫h ds. A Building pad with an FFE (D-821) or a section depth makes this
  step a true discontinuity in the prisms.
- *Steep proposed face.* Cut prisms whose proposed plane (`fgA..fgC`) is 1:1 or steeper (100 %, the steepest OSHA
  Type B allows, App. B Table B-1) form faces by shared corners; a face's height is its proposed max less min (exact at
  vertices). A face of 5.0 ft or more inside a cut pocket makes that pocket's part in its region a pit ("steep edge").
- *A pit* is a region (or a remaining-site part of a pocket) with h ≥ 5.0 ft over any length, or a steep face ≥ 5.0 ft.
  Stored in the result's `figures` (outside the version key, as D-918's figures): `figures.pits[]` = { regionId,
  kind "edge" | "steep", wallMaxFt, wallMinFt, wallLf, faceSF }, and per pocket `byRegion` (each region's cut CY in it)
  and `pitCY`. A result from before reads "Calculate again to check for pits"; nothing reprices until a Calculate.

**3. Excavator path.** A pit region's cut, to export and to fill, is excavator: to export stays "Cut to export" (A2);
to fill becomes "Cut" (A1: excavator loads, trucks or a loader carry on site) whatever the pocket's or project's choice,
and its fill is spread as trucked fill ("Fill", A3). Shares become per region (`lines.ts:methodsOf` by `byRegion`), so a
person's dozer choice on a pocket still moves the non-pit regions of that pocket, and never a pit's.

**4. Dozer-on-ramp exception.** Dozer push stays allowed on a pit only where the cut can be worked out on a ramp:
automatically when the straight haul (cut centroid to fill centroid, as `haulsOf`) leaves the pit across an edge whose
wall there is under 5.0 ft (an open side) and its grade is at most +20 % (`ramp_max_pct`; CPH 49's factor 0.55 at
+20 %; no published limit, the founder's call), or when a person ticks "Worked out on a ramp" on the pit's Methods row
(`pocket_methods[..].ramp`, api `PocketMethod.ramp`).

**5. Undercut in a pit.** Removal is excavator (`lines.ts`: a dozer or scraper dig on a pit's undercut is refused, with
a note). The replacement is placed and compacted in lifts inside the pit by the confined spread (A3C: compact track
loader + skid-steer vibratory roller, or plate), new role `undercut_replace_pit`, when the feature is a pit or the
undercut is confined by D-922's test (under 20 ft wide or 5,000 SF). Pit reading of the band past the pad's edge (Q2):
its bottom is the pad's own undercut bottom (subgrade − d), dug from the surface, not D-895's "d below existing" there.

**6. OSHA past 5 ft.** Where the dig at a pit's edge (wall + undercut) reaches 5.0 ft and the over-excavation option
(item 7) is off, the pit's cut line carries Needs attention: "<feature>: dig X.X-Y.Y ft deep at its edges: past 5 ft
OSHA 1926.652 needs sloping, benching or shoring. Turn on Over-excavation for walls, or price shoring." Past 20 ft it
also says the protective system needs a registered professional engineer's design (1926.652(b)(3), (c)(3)).
D-1149's 1:1 undercut sides stay for features that are not pits; on a pit item 7 replaces them (never both).

**7. Over-excavation option** (`site_choices.pits[featureId]` = { overex, work_ft, protection }, off by default):
- Working space `work_ft` 2 ft (the founder's default; public floor: Ohio DOT CMS 503 measures structure excavation 1 ft
  outside the footing or wall), the bottom widened flat by max(work_ft, the undercut's offset).
- Protection by OSHA soil type, App. B Table B-1: A ¾:1, B 1:1, C 1½:1; unclassified 1½:1 (1926.652(b)(1)(i)); or
  shoring: vertical at the working space, the shoring's face SF its own line (`pit_shoring`, no activity: Quote needed).
- Volumes exact: the dug surface outside the widened bottom is the facets rising at 1/s from it (mitred hips at convex
  corners, tie-in style, D-1152), integrated against the lower of existing ground and the outside subgrade over the
  prisms; corners included (no perimeter × d²/2 shortcut).
- Lines: "Over-excavation for walls, <feature>, 2 ft working space, OSHA Type B 1:1" (BCY, `over_excavation_onsite`,
  A1); "Wall backfill, <feature>, compacted in lifts" (CCY, `wall_backfill`, A3C), the same geometric volume; shoring
  (SF). The dug soil joins the balance like undercut soil re-used (D-896).

**8. Dozer sizing (proposal only, item 5; a national release that reprices founder projects, so not built tonight).**
- Clearing: light (A55) D6 class to 5 ac, D8 above; medium (A56) D6 to 2 ac, D8 above; heavy (A57) D8. Basis FM 5-434
  Table 2-1 (light clearing: medium tractor 2.5 h/ac, heavy 1.5 h/ac) and ¶2-7 (a medium tractor clears about 0.25 ac of
  brush and small trees an hour). The acre limits are the founder's call.
- Push (A14), by the cut it pushes: under 1,000 BCY D5; 1,000-4,999 D6; 5,000-19,999 D8; 20,000+ two D8s (FM 5-434
  Figs 2-13 and 2-14, production by class). The smallest class that finishes in 5 working days at its catalog rate.
- 11166 estimate: the D8 $7,928.15 (1-day rental $4,128.43, fuel $199.73, mob/demob $3,600) for 6.7 h; a D6 about
  $3,380 (rental $2,089.95, fuel about $186, mob/demob $1,100): about -$4,550 (estimate, grade C).

**9. Methods-table reason text** (`suggest.ts:bandsOf`, the report's Methods sheet the same):
- pit by edge: `vertical edge 11.0 ft: excavator` (the wall's maximum, one decimal);
- pit by face: `steep edge (1:1 or steeper) 9.4 ft: excavator`;
- ramp: `open side 1.5 ft, 6.2 % downhill: dozer on a ramp`; by a person: `vertical edge 11.0 ft; ramp by the estimator`;
- a pocket partly in a pit: `vertical edge 10.6 ft: excavator for 621 of 729 BCY`.

**10. Look-alike, worked by hand** (throwaway; feet; no strip; shrink 1.00, swell 1.25; native suitable):
- Boundary x 0-180, y 0-140 (25,200 SF). Existing z = 628 + 0.1 y (contours 628-642 every 10 ft of y); proposed contours
  the same (proposed = existing outside the features).
- Building pad x 30-90, y 75-105 (1,800 SF), Building pad ticked, FFE 628.5, depth 1.0 (subgrade 627.5). Existing over
  it 635.5-638.5, mean 637.0: cut 1,800 × 9.5 = 17,100 CF = **633.333 BCY**.
- Terrace (fill) x 120-170, y 105-125 (1,000 SF), FFE 641.0, depth 0: fill 13 − 0.1 y, 2.5 to 0.5, mean 1.5:
  1,500 CF = **55.556 CCY**.
- Walls: south 8.0 ft × 60, north 11.0 × 60, west and east 8.0 to 11.0 × 30 each: **180 LF at 5 ft or more, max 11.0,
  min 8.0, face 1,710 SF**.
- Lines, dozer chosen (today): Cut to export 577.778 BCY; **Cut, dozer push 55.556 BCY**; **Fill, dozer push
  55.556 CCY**; Soil Export 722.222 LCY. Methods: `633 CY, 9.5 ft average | dozer | 89 ft, 8.3 % uphill`.
- After: Cut to export 577.778; **Cut 55.556 BCY** (A1); **Fill 55.556 CCY** (A3); Soil Export 722.222 LCY. Methods:
  `excavator | vertical edge 11.0 ft: excavator`. Needs attention (option off): dig 8.0-11.0 ft at the edges.
- Over-excavation option, 2 ft working space, bottom 627.5: flat ring 376 SF × 9.5 = 3,572 CF = 132.296 BCY; wedges
  Type A 284.863, Type B 396.454, Type C 650.060 BCY; totals **A 417.160, B 528.751, C 782.356 BCY**, wall backfill the
  same in CCY. Shoring instead: 132.296 BCY, backfill 132.296 CCY, shoring face **1,862 SF** (196 ft × 9.5 mean).
- Undercut variant, 4 ft below the pad, 5 ft past its edges (x 25-95, y 70-110, 2,800 SF), vertical sides:
  - today (D-895, fixed): 2,800 × 4 = 11,200 CF = **414.815 BCY**; replacement 414.815 CCY on A3; no D-1149 sides (4 ft
    is not over 4);
  - pit reading (bottom 623.5 throughout): under the pad 1,800 × 4 = 7,200 CF; the band 1,000 SF × 13.5 mean =
    13,500 CF; **766.667 BCY**, excavator. Replacement in lifts on A3C: 11,200 CF = **414.815 CCY** below the subgrade;
    the band above the subgrade 9,500 CF = **351.852 CCY** wall backfill;
  - dig at the edge 11.5-15.5 ft, over 5: flagged; with the option, Type B wedges from the 623.5 bottom
    **914.291 BCY** (A 653.247, C 1,514.712; C daylights 2.35 ft past the west boundary, flagged); shoring face
    2,970 SF.
- 11166, from the files: the Building Slab's 41.28 BCY "Cut, dozer push" (estimate line: 41 BCY, $543.43) moves to
  "Cut" (A1); the two stair slabs (5.77 and 2.22 BCY; max cut 5.60 and 5.35 ft) move too if their edge walls reach
  5.0 ft (the edge heights are not in the files). The fill's dozer share goes from 100 % to 83.8 % (80.6 % with the
  stairs), the rest "Fill" on A3. The push reading drops the pit's soil: blended grade +10.09 % to +0.67 % (+4.45 % with the pad alone).

**11. Quantity-table rows** (`intelcost-infra/browser/lib/earthwork-cases.mjs`, kind `pit`, on the look-alike runs):

| Row | Input | Expected |
|---|---|---|
| pit-walls | look-alike, pad FFE 628.5 | pad: pit edge, wallMax 11.0, wallMin 8.0, wallLf 180, faceSF 1,710; terrace: none |
| pit-lines-dozer-chosen | + pocket_methods cut-1 dozer | cut:pad 55.556, no cut_push; fill:terrace 55.556, no fill_push; cut_export 577.778; soil_export 722.222 |
| pit-why | the same | method excavator, why "vertical edge 11.0 ft: excavator" |
| pit-threshold-at-5 | FFE 634.5 (subgrade 633.5, walls 2.0-5.0) | pit; wallLf 60 (the north edge at 5.0) |
| pit-shallow | FFE 635.0 (subgrade 634.0, walls 1.5-4.5) | not a pit; cut_push:pad 55.556 kept; pad cut 200 BCY |
| pit-ramp-open-side | pad x 30-90, y 40-80, FFE 631.5, depth 1.0 (walls 1.5-5.5); fill x 30-90, y 5-25 at 630.5 (44.444 CCY) | pit (north wall 5.5); the haul leaves over the south wall (1.5): ramp, dozer kept, why "open side 1.5 ft, …downhill: dozer on a ramp" |
| pit-overex | option on, 2 ft, Type A / B / C / shoring | 417.160 / 528.751 / 782.356 BCY; backfill equal CCY; shoring 132.296 BCY + 1,862 SF |
| pit-undercut | undercut 4 ft, offset 5 | non-pit feature unchanged 414.815; pit 766.667 BCY, undercut_replace_pit 414.815 CCY, wall_backfill 351.852 CCY, flag 11.5-15.5 ft |
| pit-undercut-sloped | + option Type B | wedge 914.291 BCY |

**Not changed:** a feature whose walls are all under 5.0 ft, the remaining site without steep faces, and every result
until its next Calculate. The engine's volumes do not move: only the method, the lines' roles and the new optional lines

### STAGE 2: built (2026-11-17, founder to confirm)

The founder's answers to the four questions came through the main session (BRIEF R19): 5.0 ft; the pit reading
(766.667 BCY); OSHA Type C 1½:1 when no soil class is set; a +20 % ramp (grade D); the core first.

**What was built:**
- The rule, as specified (items 1 to 7 and 9).
- Shares by region (`byRegion`).
- The confined spread for small undercuts too.
- The protection line, priced by hand. It is the Needs attention flag while the over-excavation is off.

**Departures from the spec:**
- **pit-threshold-at-5:** the haul leaves over the east wall at 4.4 ft, which is an open side, so the ramp stands and
  the person's dozer push is kept. The row asserts that.
- **The working space:** fixed at 2 ft, or the undercut's offset where that is wider. `work_ft` is stored but not
  typed yet.
- **The dozer sizing (item 8):** a proposal only.

**Smoke** (throwaway, Harris County TX20260031 mod 1 Heavy, open shop, burdened):
- Methods read "vertical edge 11.0 ft: excavator", and Pits read "walls 8 ft to 11 ft, face 1,710 SF". With the over-excavation off, the Type C quantity reads 782 BCY.
- The bid moves from $25,019.98 to $38,312.76:
  - before: dozer push, which is what "Worked out on a ramp" now gives;
  - after: excavator;
  - +$13,292.78, nearly all from two 26.5 t articulated dump trucks at a day's rental ($11,508.79), carrying 55.6 BCY.
- The undercut variant reads: 414.815 BCY dug; 414.815 CCY of Select Fill on A3C at $41.31 a CCY; 351.852 BCY of the band dug and backfilled; protection 2,970 SF, flagged.
- With Type B over-excavation, the over-excavation is 1,266.143 BCY at $20.09 a BCY and the wall backfill 1,266.143 CCY at $4.51 a CCY.

**Found and fixed during the smoke:** Calculate's dialog dropped `site_choices.pits`. `CalculateDialog.tsx` now keeps
it.

**Open:** a pit's small cut to fill (55.6 BCY, just over D-1115's 1 h leftover) brings A1's two articulated dump
trucks for a day. Two options for the founder:
- a short carry inside a pit by the excavator's swing or a loader;
- a higher leftover threshold..

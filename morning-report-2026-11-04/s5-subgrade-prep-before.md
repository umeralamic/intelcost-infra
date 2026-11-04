# Step 5, first report: what Subgrade Prep priced before the rework (2026-11-04)

Paths under `intelcost-app-react/src` unless marked. Activity data from the bench `eqlib` tables (release 27).

**A11, "Fine grade / subgrade prep"** (SF, one site spread, 10-hour basis): tier 1 compact track loader and half an 84 in
roller, 1/4 foreman, 2 laborers; tier 2 12 ft grader, half roller, 1/4 water truck, 1/2 foreman, 2 laborers, 1/2 grade
checker; tier 3 adds half a backhoe and half a water truck; tier 4 14 ft grader, a roller, half a backhoe, half a water
truck, 1 foreman, 2 laborers, 1 grade checker. Default 15,000 / 30,000 / 45,000 SF a day by job size. The tier reads the
sum of every A11 line in the project, so a duplicate line also pushes the tier up.

| Option | Line | Role / variant | Quantity | Activity | Material | Code |
|---|---|---|---|---|---|---|
| Fine grade subgrade | Fine grade subgrade | prep_fine_grade / subgrade | section SF | A11 | none | lib/takeoff/earthwork/siteSection.ts:293 |
| Proof roll | Proof roll subgrade | proof_roll / subgrade | SF / 9 | A34 (one operated tandem truck) | none | siteSection.ts:294 |
| Fine grade base | Fine grade <layer> | prep_fine_grade / base:N, one per aggregate layer | section SF | A11 | none | siteSection.ts:313 |
| Geotextile, geogrid (section) | Geotextile / Geogrid | geosynthetics | SY x (1 + overlap) | no activity | geotextile:site, geogrid:site (500 SY roll) | siteSection.ts:295-296 |
| Option 1 undercut, fixed depth | Undercut excavation; spoil haul, stockpile or reuse; replacement fill in lifts; proof roll of the bottom; geotextile at the bottom | undercut (A2/A14/A15), undercut_haul (A7), undercut_replace (A3), proof_roll (A34), geosynthetics | BCY, LCY, CCY, SY | A2, A7, A3, A34 | fill:<material> | lib/takeoff/earthwork/utilities/lines.ts:558-688 |
| Option 1, native soil | Undercut excavation, native; undercut and recompact native | undercut_native_dig (A2), undercut_native (A3) | BCY, CY | A2, A3 | none | lines.ts:639-641 |
| Option 2, compact | Compacted subgrade, d (spec) | prep | prep SF less the undercut | **A11** | none | lines.ts:691-735 |
| Option 2, scarify | Scarify, moisture condition and compact, d in L lifts | prep | SF | **A11** | none | lines.ts:732-735 |
| Option 2, stabilize | Soil stabilization, mix and compact; agents | stabilize, stabilize_mix, stabilize_agent_n | SY, TON | none (usually subcontracted) | agent:<name> | lines.ts:707-723 |

**Double counts found:**
1. **Option 2's compaction and Fine grade subgrade** (both A11) on nearly the same SF: the same crew and machine-hours
   twice. On the DUP: Standard Duty Asphalt "Compacted subgrade, 6" 3,604.22 and "Fine grade subgrade" 3,604.20; Heavy
   Duty Asphalt 3,597.16 and 3,604.25. Four regions on the bench.
2. **Fine grade base** is another A11 pass at the full area for each aggregate layer (two layers: two passes).
3. **The section ignores the undercut:** Option 2's line subtracts the undercut area, the section's fine grade and proof
   roll do not, so the undercut footprint is filled and compacted (A3) and then fine graded and proof rolled again.
4. **Treat in place** (A21) with the section's fine grade (A11) on the same SF.
5. **Two proof rolls** over the undercut footprint (the section's and the undercut bottom's).
6. Geosynthetics: the section's and Option 2's could both apply; none on the bench.

**Saved items on the bench:** Option 2 on 20 (compact 8, scarify 4, stabilize 8); sections 13 (fine grade subgrade 10,
proof roll 8, fine grade base 10, geogrid 0, geotextile 0); Option 2 geosynthetics non-empty 0; undercut 15; Option 2 and
a section's fine grade together 4.

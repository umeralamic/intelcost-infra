# Curb lines: undercut, excavation beside paving, backfill behind curb (PLAN ONLY, for the founder's review)

> Written 2026-11-12, the founder's follow-up item B (B3, replaced by the undercut item; B4, B5, B6). Nothing here is
> built. B1, B2, 2a and 2b were built in this run (D-1215). On approval this becomes the next D-NN and an `F` row.

## What a curb line computes today (`lib/takeoff/earthwork/siteSection.ts`, `lineLines`)

| Line | Today | Note |
|---|---|---|
| **Curb excavation** | footprint width × (section depth + Base depth) × LF, CY | Full depth everywhere, even where paving beside the curb already digs most of it |
| **Subgrade compaction under the curb** | LF | |
| **Base** | Base width × Base depth × LF, in tons: aggregate at 140 pcf, cement-stabilized sand at its own 120 pcf (D-1216) | Directly under the curb. Default width = curb + gutter width, depth 4 in |
| **Backfill behind curb** | Until D-1216: LF only, the material bought per LF (a unit error). **Now (interim, D-1216):** CY = LF × width × the curb's total height, bought in the material's own unit (tons by its loose weight); the line is labelled "interim: width × curb height" | Native soil buys nothing (D-1215). §6 replaces the interim rule |

**Does Base cover part of the stabilized layer?** Only directly under the curb, at the curb's width. The founder's
detail wants a layer wider than the curb: Base width + 12 in beyond the back of curb ("12" MIN (TYP.)"). That is the
Undercut below.

## 3. Undercut and replace on curb lines (replaces the first B3)

The same "Undercut and replace" section the area features have (P), on a Line:

- **Remove:** a fixed depth below the curb's bottom (default 8 in), or down to an elevation.
- **Width:** the curb's width, plus extensions:
  - beyond the back of curb, default 12 in (the founder's detail);
  - beyond the face, default 0.
- **Replacement:**
  - stabilize in place (lime, cement);
  - native soil recompacted;
  - imported (cement-stabilized sand, select fill, common fill, fill sand, other).
- **Clipping:** the area undercut's own rules.
  - With "Subtract curbs and other line features" on the paving: where the curb meets paving that has its own undercut, the curb's footprint is the curb's and nothing is counted twice.
  - Where two features' undercuts overlap: the newest takes it.
- **Only where the curb is drawn.** A curb ending mid-edge stops its undercut there; the paving's own undercut covers the rest of the edge.
- **The dialog names the three layers apart:**
  - Base: directly under the curb, at the curb's width.
  - Undercut: below the base, at the curb's width plus the extensions.
  - Backfill behind curb: soil beside the curb, above subgrade.

## 4. Excavation choices

| Choice | What is dug |
|---|---|
| **Full** | Today's: footprint × (section depth + Base) |
| **Only below the paving section** | Only the part of the curb and its base deeper than the paving section beside it. Example: the default curb and gutter (D-1216), 16 in deep below TC, a 6 in curb over a 10 in gutter, against an asphalt section 10 in deep below the pavement: the curb's bottom is level with the section's, so only the 4 in base below it is dug. |
| **Off** | Nothing |

**Default:** "Only below the paving section" when the line lies on or inside a paving feature (its footprint within
the paving's outline, or on its edge); else Full.

## 6. Backfill behind curb

**Today:** LF only, as above. Width is the "in" field; there is no depth, and a material is bought per LF.

**Proposed.** CY = LF × width × depth, with the depth by where the curb sits:

- **Outside any graded area** (nothing places ground behind the curb): the reveal. Behind the curb, the ground is
  brought up to the top of curb from the pavement side.
- **Inside a graded area:** the earthwork's proposed grade already places the fill behind the curb. Only the over-dig
  for the forms comes back: its width (default 6 in) × the curb's back height (from its bottom up to the proposed
  grade).

The material is bought in its own unit: CY, or tons by its weight (`importFill`'s tons per CCY). Native soil buys
nothing (D-1215).

## 5. Hand-worked quantity-table rows

The page is 100 ft a side. The default curb and gutter (D-1216, the founder's detail): 16 in deep, a 6 in curb (the
reveal) over a 10 in gutter, footprint 30 in (2.5 ft), Base 4 in at 2.5 ft. Rows B and E reworked for it on
2026-11-12 (they were worked at 18 in deep with a 6 in gutter); A, C, D and F do not depend on the depth.

| Row | Setup | Expected |
|---|---|---|
| **A. Undercut beside asphalt** | 100 LF of curb beside a 100 × 30 ft asphalt feature, Undercut 8 in, 12 in beyond the back | Undercut 100 × (2.5 + 1) × 0.667 = 233.3 CF = 8.64 CY |
| **B. Excavation, only below the section** | Asphalt section 10 in below the pavement; the curb bottom is 16 − 6 = 10 in below the pavement (gutter level), level with the section, so only the 4 in Base | 100 × 2.5 × 4 / 12 = 83.3 CF = 3.09 CY (Full: 100 × 2.5 × (16 + 4) / 12 = 416.7 CF = 15.43 CY) |
| **B2. The same against a thinner section** | Asphalt section 6 in below the pavement: 10 − 6 = 4 in of curb below it, plus the 4 in Base | 100 × 2.5 × 8 / 12 = 166.7 CF = 6.17 CY |
| **C. Curb ending mid-edge** | 60 LF of curb along the 100 ft edge | Undercut 60 × 3.5 × 0.667 = 140 CF; the paving deducts only the 60 ft footprint (D-1163); the paving's own undercut covers the other 40 ft, and nothing is counted twice |
| **D. Backfill, outside grading** | 100 LF, 12 in wide, reveal 6 in | 100 × 1 × 0.5 = 50 CF = 1.85 CY |
| **E. Backfill, inside grading** | 100 LF, a 6 in over-dig, back height 16 in (bottom to top of curb, the proposed grade behind it at TC) | 100 × 0.5 × 16 / 12 = 66.7 CF = 2.47 CY, and the earthwork's fill behind the curb is not counted again |
| **F. Overlap** | A curb undercut overlapping a newer pad's undercut | The pad takes the overlap; the curb keeps the rest |

## Estimate, hours of my own work, by task

| # | Task | Hours |
|---|---|---|
| 1 | Undercut section on a Line, in the dialog: depth or to elevation, beyond back (12 in) and face (0), replacement choices; Base / Undercut / Backfill named apart | 1.5 |
| 2 | Undercut quantities on a Line: the strip polygon (curb width + extensions) along the drawn run only, removal CY and replacement (stabilize, recompact, imported in its own unit) | 1.5 |
| 3 | Clipping: against the paving's own undercut where "Subtract curbs" is on, newest-takes where undercuts overlap (the area undercut's rules) | 2 |
| 4 | Excavation choices Full / Only below the paving section / Off; the paving section depth beside the curb read from the paving feature's layers | 1.5 |
| 5 | Default excavation by the line lying on or inside a paving feature (footprint within its outline or on its edge) | 1.5 |
| 6 | Backfill behind curb by volume: outside grading width × reveal; inside grading the forms' over-dig × back height; the graded-area test | 2 |
| 7 | Backfill bought in its own unit (done for the interim rule in D-1216; carried to the new rule) | 0.5 |
| 8 | Quantity-table rows A–F and B2 (hand-worked above, at the 16 in default) | 2 |
| 9 | Gates, smoke on a throwaway copy | 1 |
| | **Total** | **about 13.5 hours** |

(CSS weighed at its own density in Base was done in D-1216, so it leaves the estimate.)

**Reworked 2026-11-12 for the 16 in default (D-1216):** the hours stand at about 13.5. Rows B and E change their
answers, not their work; B2 is added because, at 16 in, B against a 10 in section digs only the Base and no longer
shows the part of the curb below the section. Task 4's default ("Only below the paving section" beside paving) now
removes most of a curb's excavation on a typical 10 in asphalt section: 3.09 CY a 100 LF against Full's 15.43.

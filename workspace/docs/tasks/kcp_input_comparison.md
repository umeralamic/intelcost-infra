# Rebid earthwork: the reference file's inputs against ours

_Study only, 2026-10-13. Nothing in any project was changed. The reference file
(`Hidden_Valley_Spec_Building.kcp`, another program's project file) was read in a scratch
folder and never copied into a repo. Ours was read from the bench database in read-only
transactions._

**The question.** Our Calculate on "Hidden Valley Spec Building Rebid" (C-200) gives cut
11,483.74 CY and fill 9,596.09 CY after the strip. The reference report gives 11,689.54 and
9,329.73. How much of that gap comes from different **inputs** (what was drawn and typed), and
how much from a different **method** (how the surfaces and volumes are built)?

**How it was answered.** The reference file is a zip of XML: coordinates and levels in metres,
plus the placement of each drawing page in its frame. Its C-200 page (page 6 of the bid set,
our C-200 too) is placed 310.896 m × 201.168 m, which is 1,020 × 660 ft, a 34 × 22 in sheet at
1" = 30'. So every reference coordinate maps onto our C-200 page directly. We then ran **our own
engine** (`computeVolumes`, the same code Calculate runs, bundled for Node) on our inputs and
then on theirs, swapping one input at a time.

**Answer in short.**
- **The inputs differ a lot, and in opposite directions.** Their existing ground is a much
  coarser survey trace, their paving outlines are drawn differently, and their slabs are flat
  platforms. With their inputs in our engine, cut is **236.57 CY lower** and fill is
  **451.23 CY lower** than ours.
- **Two method differences then add volume back:** their surfaces reach the whole limit of work
  (ours stop where the contours stop), and their proposed surface meets existing ground at the
  limit. Together they add **470.25 CY of cut and 151.13 CY of fill**.
- **What is left is 27.87 CY of cut and 33.74 CY of fill (0.24 % and 0.36 %).** That is the
  surface interpolation itself, which we can't see inside their program.
- **Every reference element then agrees with ours to within a few percent.**

---

## 1. Placement: proof that the two frames line up

Their outlines, mapped onto our C-200 page, compared with what we drew:

| Element | Ours SF | Theirs SF | Shared SF | IoU |
|---|---|---|---|---|
| Building Pad vs both slabs | 14,831 | 14,889 | 14,795 | **0.991** |
| Heavy Duty Concrete Pavement | 5,381 | 5,335 | 5,321 | **0.986** |
| Heavy Duty Aggregate Pavement | 42,561 | 44,772 | 42,497 | 0.948 |
| Concrete Sidewalk | 2,607 | 2,669 | 2,528 | 0.920 |
| Heavy Duty Asphalt Pavement | 22,071 | 19,799 | 19,705 | 0.889 |
| Standard Duty Asphalt Pavement | 20,596 | 15,144 | 14,425 | 0.677 |
| Work boundary vs their limit ("Features" outline) | 196,697 | 195,708 | 192,096 | 0.959 |

The building and the concrete pads overlap at 0.99. Two people tracing the same rectangle
can't do better than that, so the frames agree to about a foot. The low scores further down
are real drawing differences (§2.5), not misplacement.

Our areas here are in true feet, the way Calculate reads them (D-272). The panel's stored item
quantities differ slightly; Standard Duty Asphalt's, for example, is 20,432 SF.

## 2. Every input, side by side

### 2.1 Existing ground contours

| | Ours | Theirs |
|---|---|---|
| Source | V-100 (1" = 60'), linked to C-200 (offset 0, scale not fitted) | Their own trace, in the project frame |
| Contours | **97** | **14** |
| Vertices | 1,683 | 493 |
| Levels | every foot from 696 to 729 (34 levels; 725 not drawn) | **11 levels:** 696, 697, 698, 700, 703, 705, 707, 710, 714, 715, 720 |
| Levels they don't have | — | 699, 701, 702, 704, 706, 708, 709, 711–713, 716–719, 721–729 |
| Extent | the contours' own hull | a drawn outline of 283,208 SF; the surface reaches it (§3.2) |

Their existing ground is interpolated straight across 3- to 4-foot gaps (700 → 703 → 705,
710 → 714). One of their 697 ft loops crosses itself, which their program accepts and ours
refuses; the comparison dropped its last vertex (under 0.1 m).

### 2.2 Proposed contours and spots

| | Ours | Theirs |
|---|---|---|
| Contours | **42**, 969 vertices | **15**, 630 vertices |
| Levels | every foot from 696 to 709, plus 702.75 and 702.77 | **8 levels:** 696, 699, 700, 701, 702, 703, 705, 710 |
| Levels they don't have | — | 697, 698, 704, 706, 707, 708, 709, 702.75, 702.77 |
| Levels we don't have | 710 | — |
| Spot elevations | **27**, 703.00–704.00 (the building pad) | **none** |
| At the limit of work | the surface ends where the contours end | the outline is tied to existing ground (§3.1) |

### 2.3 Building slabs

| | Ours | Theirs |
|---|---|---|
| Model | one Site Feature, "Building Pad": proposed grade − 1.00 ft | two flat platforms at fixed levels |
| 6" slab | — | **703.000 ft** over 11,958 SF |
| 4" slab | — | **703.330 ft** over 2,931 SF |
| Subgrade | from the FG spots (703.00–704.00) − 1.00 ft: 702.00–703.00, area-weighted **702.994 ft** | area-weighted **703.065 ft** |
| Area | 14,831 SF (one outline) | 14,889 SF (two outlines) |

Their subgrade is about 0.07 ft higher on average. The 4" slab area is where it differs:
703.33 there, against our 703.00 under a 704.00 finished floor.

The undercut is ours alone: 4 ft under the Building Pad, offset 5 ft, 2,599.79 CY on its own
line. It is not in the cut total and has no counterpart in the reference.

### 2.4 Pavement and sidewalk depths

| Element | Ours (stored) | Theirs | Same? |
|---|---|---|---|
| Standard Duty Asphalt | 0.816667 ft (9.80") | 0.8125 ft (**9.75"**) | **No:** 0.05" deeper here |
| Heavy Duty Asphalt | 1.000000 ft | 1.0000 ft (12") | Yes |
| Heavy Duty Aggregate | 0.666667 ft | 0.6667 ft (8") | Yes |
| Heavy Duty Concrete | 1.166667 ft | 1.1667 ft (14") | Yes |
| Concrete Sidewalk | 0.666667 ft | 0.6667 ft (8") | Yes |

Both models measure these depths down from the proposed surface. Ours does it as a Site
Feature's depth; theirs reduces from its "Features" surface.

### 2.5 Feature outlines

From §1:
- **Standard Duty Asphalt:** ours covers 6,170 SF that theirs doesn't.
- **Heavy Duty Asphalt:** ours covers 2,367 SF more.
- **Heavy Duty Aggregate:** theirs covers 2,275 SF more.
- **Concrete Sidewalk:** the two differ by about 140 SF.

**Correction to the plan (§7, cause 3).** The plan put the per-feature area shifts down to the
overlap rule. They aren't caused by it: features overlap by only 69 SF in ours and 44 SF in
theirs. The shifts come from the outlines being drawn differently. Applying their overlap order
in our engine moves 0.09 CY (§4, M2).

### 2.6 Topsoil strip

| | Ours | Theirs |
|---|---|---|
| Depth | 0.5 ft (6") | 0.5 ft (6", 0.1524 m) |
| Measured from | existing ground | existing ground ("from Ground") |
| Drawn area | the work boundary | a 379,759 SF rectangle |
| Area stripped | **196,697 SF** (the work boundary) | **283,208 SF** (its rectangle clipped to the existing-ground outline) |
| Volume | 3,642.53 CY | 5,244.59 CY |

(283,208 − 196,697) × 0.5 / 27 = **1,602.06 CY**, which is the whole topsoil difference. The
depth is the same; only the area differs, and that is an input. Both programs then measure
cut and fill from the stripped ground (§4, S3 onward keeps our uniform 0.5 ft strip over the
limit).

### 2.7 Limit of work

| | Ours | Theirs |
|---|---|---|
| Limit | Work Boundary, 22 vertices, 196,697 SF | "Features" outline, 34 vertices, 195,708 SF; report: 195,527 SF disturbed |
| Shared | 192,096 SF | |
| Only ours | 4,601 SF | |
| Only theirs | | 3,612 SF |

### 2.8 Not compared

Shrink and swell (1.10 / 1.15), the balance and the Soil Export line are ours alone; the
reference reports bank volumes only.

## 3. Method differences

### 3.1 The proposed surface tied to the ground at the limit

Their proposed outline has `LevelType=Ground`: at the limit, proposed equals existing. Ours has
no such tie, so wherever no proposed contour reaches the limit there is no proposed surface,
and that area counts as zero. To model it, the comparison put proposed spots every 3 m along
their limit at the existing level there (an estimator could do the same by hand with FG spots).

### 3.2 Existing ground carried out to its outline

Their existing outline is `Automatic`. Their surface reaches the outline and covers the whole
limit, while ours stops at the hull of the contours. The comparison models it with existing
spots every 10 m along their outline, each at the nearest contour vertex's level. We can't see
their actual rule, so treat this step as an estimate of its size.

### 3.3 Overlap order

The newest feature wins an overlap in ours. In theirs, the element first in its list wins. The
features barely overlap, so the effect is negligible (0.09 CY of cut).

### 3.4 Surface interpolation

Ours is a constrained Delaunay TIN on the contour vertices (the contours are the only
breaklines), with Δz linear on the union of the two surfaces. Theirs is its own surface model,
which we can't see. This is what remains in §4.

## 4. The gap, step by step through our engine

Each row adds one change to the row above it and runs our engine again.

**Inputs** (rows R0 to S5): what was drawn and typed.

| Step | Change | Cut CY | Fill CY | Δ cut | Δ fill |
|---|---|---|---|---|---|
| R0 | ours, as stored (reproduces Calculate exactly) | 11,483.74 | 9,596.09 | | |
| S1 | their Standard Duty Asphalt depth (9.75") | 11,482.82 | 9,598.34 | −0.93 | +2.25 |
| S2 | their feature outlines | 11,447.13 | 9,748.99 | −35.69 | +150.64 |
| S3 | their limit as the boundary | 11,464.41 | 9,734.97 | +17.29 | −14.02 |
| S4 | their existing ground (14 contours) | 11,200.33 | 9,203.65 | **−264.08** | **−531.31** |
| S5 | their proposed (15 contours, slabs flat at 703.00 / 703.33) | 11,247.17 | 9,144.86 | +46.84 | −58.80 |
| | **All input differences** | | | **−236.57** | **−451.23** |

**Method** (rows M1 to M3): how the surfaces and volumes are built.

| Step | Change | Cut CY | Fill CY | Δ cut | Δ fill |
|---|---|---|---|---|---|
| M1 | proposed tied to ground at the limit (§3.1) | 11,280.74 | 9,200.28 | +33.58 | +55.43 |
| M2 | their overlap order (§3.3) | 11,280.83 | 9,200.51 | +0.09 | +0.22 |
| M3 | existing carried out to its outline (§3.2, modelled) | 11,717.41 | 9,295.99 | **+436.58** | **+95.48** |
| | **All method differences** | | | **+470.25** | **+151.13** |

**Against the reference:**

| | Cut CY | Fill CY | Δ cut | Δ fill |
|---|---|---|---|---|
| Reference report | 11,689.54 | 9,329.73 | | |
| **Unexplained:** the reference − M3 (surface interpolation, §3.4) | | | **−27.87** | **+33.74** |
| **Total gap** (reference − ours) | | | **+205.80** | **−266.36** |

The rows add up exactly: for cut, −236.57 + 470.25 − 27.87 = +205.81; for fill, −451.23 +
151.13 + 33.74 = −266.36. The size of each row depends on the order the swaps were made in
(the inputs interact). The totals by group don't.

Coverage, as in the plan:
- **R0 (ours):** 93.8 % of the boundary is computed. 3,605 SF has no EG, 5,422 SF no FG,
  2,805 SF neither, and 325 SF is edge.
- **M1:** 95.6 %.
- **M3:** 99.9 %.

## 5. Per element after M3, against the reference report

The reference's two slabs are one Building Pad here.

| Element | Ref area SF | M3 area SF | Ref cut / fill | M3 cut / fill |
|---|---|---|---|---|
| Remainder ("Features") | 92,963 | 93,012 | 7,189 / 3,650 | 7,194 / 3,656 |
| Building Pad (6" + 4" slabs) | 14,877 | 14,889 | 0 / 2,346 | 0 / 2,292 |
| Standard Duty Asphalt | 15,127 | 15,140 | 970 / 1,756 | 976 / 1,804 |
| Heavy Duty Asphalt | 19,789 | 19,797 | 1,666 / 442 | 1,707 / 431 |
| Heavy Duty Aggregate | 44,768 | 44,756 | 1,684 / 754 | 1,661 / 704 |
| Heavy Duty Concrete | 5,335 | 5,332 | 118 / 69 | 119 / 76 |
| Concrete Sidewalk | 2,669 | 2,650 | 62 / 312 | 60 / 333 |

The remainder now matches to 5 CY on 93,000 SF. The larger per-element differences that remain
(the pad's fill −54 and the aggregate's fill −50) are in the cut/fill transition zones, where
two linear surfaces built differently disagree most.

## 6. What this means

1. **Most of the gap is inputs, not arithmetic.** The largest single item is the existing
   ground. Their 14-contour trace is much coarser than our 97 contours at every foot. Over this
   site the difference is 264 CY of cut and 531 CY of fill. **Ours is the more faithful trace of
   V-100.**
2. **The method difference that matters is coverage.** Their surfaces cover the whole limit;
   ours stop at the contours, and the gap counts as zero (the stored warning says so). The plan's
   default for open question 7 stands: no extrapolation in the engine; report and map the
   gap. The grading report (R-3) should show the uncovered area beside the totals, so an
   estimator can see it and extend the contours or add spots. A "tie proposed to existing at the
   boundary" option could come later as an explicit input. It isn't in this plan.
3. **The overlap rule doesn't explain any of it.** Keep the newest-wins rule (the founder's
   call, D-422) and state it in the report.
4. **One real input difference to raise with the estimator:** Standard Duty Asphalt is
   0.816667 ft here and 9.75" (0.8125 ft) there. It moves under 3 CY. The stored value looks
   like 9.8" typed as 0.8167, against the 9.75" on the plans.
5. **Topsoil differs only in its area basis.** Theirs strips the whole surveyed extent
   (283,208 SF); ours strips the work boundary (196,697 SF).

## 7. Reproducing this

The harness lived in the session's scratch folder and is not kept. To redo it:
- Unzip the file into an empty folder.
- Read `root.xml` (existing contours and the page placements) and `phases/3.xml` ("Features"
  contours, platforms and reduces).
- Map metres to our page with page 6's `TopLeft` (−317.966, 66.603) and its 310.896 × 201.168 m
  size, with y flipped.
- Convert levels to feet (× 3.280839895).
- Run `computeVolumes` on the swapped inputs.
- Check that R0 reproduces the stored result to the last decimal before trusting any other row.

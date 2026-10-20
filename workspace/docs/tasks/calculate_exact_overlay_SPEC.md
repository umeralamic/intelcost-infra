# Calculate on the exact overlay of EG and FG (spec, not built)

_Written in the night run of 2026-10-20 (Step 5, pending_umer A6). **Not built.** Hard rule 3 holds until Umer approves
this spec: Calculate's engine is unchanged. The numbers below come from a scratch copy of the engine's pipeline run in
the browser on BENCH DUP 7bb1fa52 (read only, nothing saved), never committed._

## 1. The problem

Calculate's difference surface is not the exact difference of the two TINs it is given. On C-200 (the bare EG and FG
inside the boundary, no Site Features, no strip):

| | Cut CY | Fill CY |
|---|---|---|
| Calculate's engine today | 11,971.7 | 9,958.8 |
| The exact overlay of the same two TINs | 11,975.0 | 10,002.6 |
| Engine against exact | −0.03 % | **−0.44 %** |
| GPS Export's `volumeBetween` (separate code, D-665) | 11,975.0 | 10,002.6 |
| 250,000 samples of the two TINs (D-665) | within 0.01 % of exact | within 0.01 % of exact |

Two independent exact computations and the sampling agree; the engine is the odd one out.

## 2. Why the difference TIN is 0.44 % under on fill

**How the engine works today** (`lib/takeoff/earthwork/volume/index.ts`):
1. It takes the union of EG's and FG's **input points** and **constraint edges** (the drawn contours), inserts a vertex
   where an EG contour crosses an FG contour, and samples Δz = FG − EG exactly at every union vertex.
2. It builds a **new** constrained Delaunay triangulation of that union.
3. Inside each new triangle it takes Δz as **linear** between its three corners, then clips, splits at zero and sums
   prisms.

**What that misses:** each surface is linear only inside its **own** triangles. EG's and FG's own triangle edges
(the Delaunay edges between contours and spots, which are not constraints) are folds in the true Δz. The union's new
triangles cut across those folds, so step 3 replaces the true, bent Δz by a straight chord between the corners. The
answer is exact only where the union's triangulation happens to contain every fold, which is why every flat-pad and
single-plane case agrees to the last digit and a real contour sheet does not.

**Why fill and not cut, on C-200:** across a fold the chord lies under the true Δz where the fold is a crest of Δz and
over it where it is a trough. The likely reading (not proved fold by fold): C-200's fill lies over the existing
ground's swales, EG folds that are valleys, where Δz = FG − EG has crests, so the chord is below and fill reads short;
the cut is hillside cut to planes, where EG's folds are of both kinds and largely cancel. The measured split is what
the spec relies on, not this reading.

**A second, smaller part, coverage:** the engine drops a union vertex that falls outside either hull, and with it the
sliver of the boundary next to it. The exact overlay covers every point both TINs cover: 184,865 SF against the
engine's 184,541 SF (+324 SF, 0.18 %).

**Is cut affected anywhere?** Yes, in principle everywhere a fold is crossed; the sign follows the fold, not the cut or
fill. On C-200 the totals hardly move (−0.03 % bare, −0.04 % with features and strip), but single regions do: Site
Feature `8a865fb1` (1.17 ft subgrade) reads cut 94.6 → **100.4** CY (+6.1 %) and fill 117.9 → **81.8** CY (−30.6 %).
The smaller the region, the larger its share of crossed folds.

**A hand-worked case** (the new quantity-table row, §6): a 100 ft square; EG a ridge, 0 ft along both sides and 10 ft
along the centre line (spots at the four corners at 0 and at the ridge's two ends at 10); FG flat at 10 ft (four
corner spots), plus two FG spots at 10 ft at (30, 50) and (70, 50) ft.
- **By hand:** EG averages 5 ft, so the fill is 100 × 100 × (10 − 5) = **50,000 CF = 1,851.852 CY**, cut 0.
- **Engine today:** 52,666.667 CF (+5.33 %): the two FG spots pull the union's triangles across the ridge.
- **Exact overlay:** 50,000 CF. Without the two FG spots, both give 50,000.

## 3. The change

**Replace steps 1 to 3's parent triangles by the overlay's pieces:** every EG triangle intersected with every FG
triangle (two convex polygons, so a convex piece), each with both planes, so Δz is linear on it **exactly**. Everything
after the parent pieces stays as it is today, line for line: the boundary clip, the Site Feature partition (newest
wins, subtract shapes as holes), the Strip Area partition, earcut, the split at Δz = 0, the prism sum, the region
statistics, the "without strip" comparison, the prisms handed to the 3D view, the 2D bands and geotech.

- **Same contract:** `computeVolumes(inputs, runs, labels)` keeps its signature and result shape; hard rule 2 holds
  (pure, no React, no network).
- **Errors unchanged:** the crossing checks, the missing boundary, absent or failed surfaces, "surfaces do not overlap
  enough" (no piece inside the boundary) give the same codes and words.
- **Each prism's `parentTriangleIndex`** becomes the piece's index; nothing outside the engine reads it as an EG or FG
  triangle (to confirm in the build: the 3D view's picking and the readout).
- **Analytic, never sampled** (hard rule 3): the pieces are exact polygon intersections and every volume is a prism
  of a linear Δz, as today.
- **Speed:** in the scratch run the bare overlay took 1.7 s against the engine's 3.0 s (11,211 pieces; the overlay
  itself 142 ms with a grid index). With 19 Site Feature areas and 2 Strip Areas it took 28.7 s against 14.2 s, because
  each piece is clipped against every feature. The build adds a bounding-box test before each feature and strip clip
  (a piece wholly inside or outside one skips the clip). **Acceptance: no slower than today's engine on C-200 and on the
  20,000-shape DUP's earthwork sheet, in the worker.**
- **Sites (F19):** a joined site's Calculate calls the same engine in the site's frame, so it moves too.

## 4. Saved results: marked out of date, nothing recalculated or rewritten

As D-272 and D-470 did:
- **The key's version moves:** a sheet's `v6` becomes `v7`, a site's `v5` becomes `v6` (`versionKey.ts`, and the
  site's key in `siteKey.ts`). The `u` undercut suffix keeps its meaning (`v7u`).
- **`olderEngine` and `outdatedBy`** already treat a stored key with another version as worked out by an earlier
  engine: the panel says so, and Estimating shows "Needs recalculating" on the Calculate lines (U-UT38).
- **Nothing is written** to any stored result, line or linked item by the change itself; **nothing is recalculated**
  until someone presses Calculate. A guest sees the out-of-date state with "The owner must Calculate again first".
- The 3D test copy's stored result keeps its md5 and the fingerprint is unchanged; it reads out of date on open.
- A note for Abdullah: no migration; every saved result in production reads out of date once, by design.

## 5. C-200, before and after (BENCH DUP 7bb1fa52, the copy's saved Calculate of 2026-10-20 03:47 UTC)

**Totals** (13 Site Features, 19 feature areas, 2 Strip Areas):

| | Cut CY | Fill CY |
|---|---|---|
| Today, as saved (with strip) | 11,583.9 | 9,463.5 |
| Exact, with strip | 11,588.1 (+0.04 %) | 9,514.2 (+0.54 %) |
| Today, without strip (D-295's comparison) | 13,361.9 | 7,844.2 |
| Exact, without strip | 13,376.2 (+0.11 %) | 7,899.0 (+0.70 %) |
| **The engineer's** | **14,263** | **8,727** |

**Against the engineer's:**

| | Cut | Fill |
|---|---|---|
| Today, without strip | −6.32 % | −10.12 % |
| Exact, without strip | −6.22 % | −9.49 % |
| Today, with strip | −18.78 % | +8.44 % |
| Exact, with strip | −18.75 % | +9.02 % |

The exact overlay moves C-200 toward the engineer's figures without strip, by 0.1 and 0.6 points. It does not close
the C-200 gap (D-232: parked; the remaining gap is the drawing's, not the engine's).

**Regions that move most** (cut and fill CY, today → exact):

| Region | Cut | Fill |
|---|---|---|
| Remaining site | 6,629.7 → 6,641.1 | 1,800.5 → 1,836.6 (+2.0 %) |
| `f2a3a7a3` (0.82 ft) | 1,710.6 → 1,714.3 | 2,362.4 → 2,409.7 (+2.0 %) |
| `70bb3a94` (1.0 ft) | 1,552.4 → 1,545.5 | 497.2 → 498.5 |
| `4b210825` (0.67 ft) | 1,230.6 → 1,225.3 | 1,250.4 → 1,246.3 |
| `8a865fb1` (1.17 ft) | 94.6 → 100.4 | 117.9 → 81.8 (−30.6 %) |
| `5e8946c4` (1.0 ft) | 27.6 → 23.7 | 19.9 → 22.3 |

## 6. GPS Export's +0.76 % fill gap, once Calculate is exact

GPS Export's proof (plan d.2) compares exported EG to exported subgrade with Calculate without strip. On C-200:

| | Cut CY | Fill CY |
|---|---|---|
| Exported EG to exported subgrade | 13,372.6 | 7,903.9 |
| Calculate today, without strip | 13,361.9 (export +0.08 %) | 7,844.2 (export **+0.76 %**) |
| Calculate exact, without strip | 13,376.2 (export −0.03 %) | 7,899.0 (export **+0.06 %**) |

**The +59.7 CY of fill, broken down:**
- **+54.8 CY (0.70 %): Calculate's engine** (§2): gone once Calculate is exact.
- **+4.9 CY (0.06 %): the 0.1 ft face** (G2). Inside each Site Feature's edge the export ramps the depth over 0.1 ft
  where Calculate steps it, so on that band the export cuts less below grade (cut −3.6 CY) and fills more (fill
  +4.9 CY). The face's whole volume is at most perimeter × 0.1 ft × depth ÷ 2 = 10.2 CY over C-200's 13 features
  (6,838 ft of edge).
- **What remains** once Calculate is exact is the face alone, as designed: within the plan's 0.1 % with room.

## 7. Everything the change moves

**Numbers shown or stored from a Calculate** (each moves only when the user next presses Calculate):
- **Takeoff › Earthwork panel** (`VolumePanel.tsx`): cut, fill, net, the strip line's comparison ("Compare without
  topsoil strip"), each region's cut and fill and averages (D-293), the balance (swell and shrink).
- **Calculate's lines** (`lib/takeoff/earthwork/lines.ts`): the linked takeoff items' quantities in the Takeoff panel,
  the Estimating lines (cut, fill, import, export, per feature and remaining site), the bid summary, the Excel export
  of the estimate and its linked formulas, a guest's Estimating and Excel.
- **CUT & FILL** on the 2D canvas (the bands from the prisms) and the **3D view** (`scene3d.ts`: the cut and fill
  solids and the readout).
- **The grading report:** the PDF (`reportDoc.ts`), the workbook (`reportWorkbook.ts`), its images and plans
  (`reportImage.ts`, `reportPlans.ts`), and the printed sheets (`printSheets.ts`).
- **Geotech (F29):** the cut split by layer (`geotech/materials.ts`, read from the prisms), the cross-sections
  (`geotech/section.ts`), placed fill (`features/takeoff/earthwork/geotech/placed.ts`).
- **Sites (F19):** the site view's results (`SiteView.tsx`).
- **GPS Export:** its proof figure (§6) tightens; its files do not change (they never read the difference TIN).

**Not moved:** utility trench and pit volumes (they read the surfaces, not the difference TIN), the topsoil strip line
(boundary area × depth), undercut and subgrade prep areas (polygon areas), every non-earthwork quantity.

## 8. The quantity-table rows that prove it

- **No existing row moves.** All 41 computable volume and strip rows of `earthwork-cases.mjs` (legacy's F1–F11, Q30,
  E4, the strip, undercut, geotech-by-layer, stats and readout rows) give the same cut, fill and strip under the exact
  overlay as today, to 1e-9 relative (checked in the scratch run). The two error rows (`vol-f6-absent-surface`,
  `vol-f7-no-boundary`) are unchanged by construction.
- **New rows:**
  - `vol-exact-ridge`: §2's ridge: fill 1,851.852 CY, cut 0 (today's engine 1,950.617 CY).
  - `vol-exact-ridge-no-pull`: the same without the two FG spots: 1,851.852 CY (today's engine agrees).
  - `vol-exact-valley`: the ridge upside down (EG 10 ft along the sides, 0 along the centre line) over FG flat at 0
    with the same two pulling spots: cut 50,000 CF by hand (today's engine 52,666.667 CF), so a crest and a trough of
    Δz are both proved.
  - `vol-exact-coverage`: EG and FG with different hulls inside a larger boundary: the covered area is the
    intersection of the two hulls inside the boundary, by hand.
  - `vol-exact-feature-fold`: the ridge with a Site Feature 1 ft deep over half of it: the feature's region by hand.
- **Rows that move with the engine** and are re-baselined in the build, each with the before and after in its
  commit: the C-200 acceptance rows (`regaccept`, `site-accept`), and any `synthsite` and `realshape` row the build's
  first run reports changed. Their figures come from the engine, not from a hand answer, so the new figure is checked
  against GPS Export's `volumeBetween` (an independent exact computation) to 0.01 %.
- **Kept:** "both engines equal" is not affected; the earthwork engine is the browser's only (U-UT41).

## 9. Build, when approved

1. `volume/overlay.ts` (new, pure): EG ∩ FG pieces with a grid index; `computeVolumes` takes its parent pieces from it.
2. The bounding-box skips in the feature and strip partitions (§3, speed).
3. `versionKey.ts` and the site key: `v7`, `v6`.
4. The quantity-table rows of §8, and the re-baselined C-200 rows.
5. Checks: gates, the quantity table, the C-200 numbers of §5 reproduced on a fresh BENCH DUP, a Calculate in the
   browser on the DUP (panel, Estimating lines, 3D, CUT & FILL, report), a stored result reading out of date before
   Calculate (member and guest), the speed on C-200 and the 20,000-shape DUP.

About 6 h.

## 10. Questions for Umer

1. Approve the change and the version bump (every saved result reads out of date once, nothing rewritten)?
2. Show the engineer comparison without strip (today's D-295 figure) as the one to judge C-200 by, as here?
3. Keep the per-region outlier (`8a865fb1`, fill −30.6 %) as a check in the build's C-200 proof?

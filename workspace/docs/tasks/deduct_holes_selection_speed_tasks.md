# Deduct-area holes, selection and order, drawing speed for every tool (next run)

Status: Planned (the founder, 2026-11-16). About 5–7 h. Not started; logged only before the 2026-11-19 push.

## The founder's brief, verbatim

Next run: deduct-area holes, selection and drawing speed (~5–7 h).
Input: my files in morning-report-2026-11-19/inputs/11170/ (grading report PDF + XLSX); refer to the project only as "11170"; files stay outside git. All testing on throwaway look-alikes; never my projects.

PART A: deducted holes (deduct-area tool) not honoured
Symptoms (11170):
- Features 2D (app and PDF): Feature 1 (Heavy Duty Aggregate Pavement) is drawn over its deducted holes; features 2–5 show blended over it. Feature 1's label anchor sits inside a hole (centroid of the outer outline).
- Remaining-site thumbnail: the holes are painted as remaining site although features 2–5 fill them.
- Totals add up (97,784 + 54,583 = 152,367 SF), but that may only be because "newest feature wins the overlap" (features 2–5 are newer).
Reproduce: a large feature over the whole site with 3 holes made by the deduct-area tool; (a) hole 1 filled by a NEWER feature, (b) hole 2 filled by an OLDER feature (drawn before the big one), (c) hole 3 left EMPTY.
A1. Quantities: report each feature's and the remaining site's area, cut, fill, strip and subgrade prep for (a), (b), (c). Expected: the big feature never owns a deducted hole; (b) belongs to the older feature; (c) belongs to remaining site. Fix the engine if any case is wrong.
A2. Drawing: every view (Features 2D in app and PDF, remaining-site thumbnail/highlight, 3D views, feature thumbnails) draws each feature's final shape with its holes; the remaining site = boundary minus the union of all final feature shapes.
A3. Labels: place each feature's label at a point inside its final shape (e.g. pole of inaccessibility), not the outer outline's centroid.

PART B: selection and order
Symptom: with a big feature that has deducted holes, clicking a feature drawn inside a hole selects the big feature (or nothing), so the inner features can't be selected. Right-click › Order › Send to back does not help.
B1. Hit-testing uses each item's final shape: a click inside a deducted hole never hits the feature that owns the hole.
B2. When shapes overlap, the click picks the topmost by draw order, and Bring to front / Send to back / Forward / Backward change that order for BOTH drawing and hit-testing, saved with the takeoff. Check every takeoff type that can overlap (site features, strip areas, boundaries, areas, utility runs, contours).
B3. Report what was wrong (hit-test on outer outline? order not applied to hit-testing? order not saved?).

PART C: drawing speed for site features and utility runs
The D-1294 contour fix (no React commit per pointer move; in-progress shape on its own overlay layer) must apply to every drawing tool, not just contours: site features, deduct areas, strip areas, boundaries, utility runs, and the generic Linear/Area/Segment tools.
C1. Profile drawing a site feature and a utility run on a dense sheet (dev AND production build, 1× and 4× CPU): commits per move, frames dropped, p95 frame, p95 move.
C2. Apply the same fix where needed; report before/after with the same measures.

CHECKS: drawn area equals reported area per feature and for the remaining site (within 0.1 %); quantity-table rows for (a), (b), (c); results unchanged to the cent where the bug wasn't involved. Report before/after for the look-alikes, and what changes (if anything) for 11170's numbers.

## Notes for the run

- Inputs: `intelcost-infra/morning-report-2026-11-19/inputs/11170/` (git-ignored). Read only; refer to the project
  only as "11170"; nothing from the files (names, quantities beyond what the brief quotes) goes into a repo file. The
  folder did not exist when this file was written: if it is still missing, stop and ask.
- Test sites are look-alikes built on throwaway accounts (`fx.<name>.<YYYYMMDDHHMMSS UTC>`), purged at the end. No
  founder project is opened, copied or written.
- Part A touches takeoff invariants (CLAUDE.md hard rule 3; quantities analytic, never sampled) and pure
  `takeoff-core` (hard rule 2): write the expected (a)/(b)/(c) results and the quantity-table rows here before code,
  and log a D-number before implementing.
- Part C builds on D-1294 (app 0cb6b49: pen and snap in refs, the live layer painted by requestAnimationFrame, no
  React commit per move) and measures the same way (dev and production build, 1× and 4× CPU).

### Stage 1 findings (night run 2026-11-16, D-1298; read only, engine-level reproduction)

Full write-up: `intelcost-infra/morning-report-2026-11-20/step3/INVESTIGATION.md`.

**What is wrong today**

- **Quantities: cases (a), (b) and (c) are already right for grading, undercut and prep.**
  - `volume/index.ts:computeVolumes` subtracts a feature's holes from its role before the newest-first partition.
  - `siteFeatures.ts:computeFeatureExtras` works on `lessHoles(…)` per feature.
  - So an older feature in a hole keeps it, and an empty hole is Remaining site.
- **Strips are a quantity bug.** It affects only "Selected Site Features" and "Remaining Site" strips.
  - `strips.ts:stripInputs` flattens the set's outlines and holes, and `stripPieces` and the engine's strip loop take
    `union(outlines) − all holes`.
  - So a hole of one feature that another feature in the same set fills is dropped from a features strip.
  - In a remaining strip, that hole is stripped although its filler is unticked.
  - A within-boundary strip (the uniform path) is never affected.
- **Drawing is wrong in three places:**
  - `siteFeatures.ts:remainingSiteRings` paints every hole as Remaining site even where another feature fills it. It
    feeds the key map in the app and the PDF.
  - `report/reportPlans.ts:featuresPlan` fills outer rings with holes ignored. This is Features 2D in the app and the
    PDF.
  - `reportPlans.ts:insidePoint` anchors the label at the outer ring's centroid, which can be in a hole.
- **3D and the sheet canvas already honour holes.** 3D draws outlines only, holes included. The canvas cuts deducts out
  with even-odd fills in SVG and WebGL.
- **Hit-testing and Order are wrong:**
  - `engine/hit.ts:hitItem` hits a positive inside its outer outline, and a deduct only on its outline (legacy, D-61).
  - `ProjectTakeoff.tsx:reorder` changes `z_index` only among the item's own shapes. Draw order across items is the
    Takeoff list's position.
  - There is no Forward or Backward.
- **Part C: every drawing tool already shares D-1294's path.** Linear, Area, Segment, site features, deduct areas,
  drawn strip areas, boundaries, contours and utility runs all draw through `SheetCanvas.tsx:handleMove`'s refs and
  live layer. Two per-move commits remain outside it:
  - `ProjectTakeoff.tsx:onPointer` → `setPointer`, only with colleagues' names on hover;
  - `ReadoutCard.tsx:Readout2D`, on the Earthwork tab with the grade view shown.
  - Stage 2 measures before fixing either.

**Planned changes (file:function)**

- **A, takeoff-core:**
  - `siteFeatures.ts:remainingSiteRings(boundary, features)`: the boundary less the union of each feature's
    `featureShape`.
  - `strips.ts`: `StripInput` carries the chosen and the unticked features' final shapes as multipolygons
    (`shape`, `excludedShape`).
  - Update `stripInputs`, `holesOf`, `stripPieces` and `ownPieces` to match.
  - `volume/index.ts` strip loop and `site.ts` strip mapping read those shapes.
  - A key mark joins a strip's key only when the case applies, so no other saved result turns stale. A read-only bench
    sweep comes first.
- **A, drawing:**
  - `reportPlans.ts:featuresPlan` and `featuresPlanBands` draw `featureShape` rings, even-odd.
  - Their labels move to `lib/takeoff/engine/interiorPoint.ts:interiorPoint`, the pole of inaccessibility with holes,
    already used for area handles. It runs on the final shape's largest polygon.
  - `reportDoc.ts` key maps use the final shapes and the new `remainingSiteRings`.
  - The 3D prop types carry `holes`.
- **B:**
  - `hit.ts`: a pure `drawOrder(items)`, a stable sort by `z_index`. `hitTest` goes topmost shape first. A positive is
    not hit inside its own item's deducts. `cycleHit`: a click inside a hole picks what lies beneath, and with nothing
    beneath, the hole itself.
  - `SheetCanvas.tsx`: `drawnShapes` and `looks` (SVG and WebGL) follow `drawOrder`.
  - `ProjectTakeoff.tsx:reorder`: front and back across every shape on the sheet, plus Forward and Backward.
  - `printSheets.ts` and `ReferencePane.tsx` follow `drawOrder` too.
- **C:** profile first. If needed, move `setPointer` to a pointer bus, and keep `Readout2D` from committing per move.

**Expected (a)/(b)/(c) quantities: the look-alike, worked by hand**

The look-alike:

- **Page:** a unit page, 1 normalised unit = 100 ft.
- **Boundary:** the whole page, 10,000 SF.
- **Surfaces:** EG flat at 100.0, FG flat at 100.5.
- **Big feature F:** depth 1.0 ft, x and y 0.1–0.9 (6,400 SF), with three deduct holes of 400 SF each:
  - H1, x 0.2–0.4, y 0.2–0.4: **(a)** filled by A, which is **newer** (depth 0.5);
  - H2, x 0.6–0.8, y 0.2–0.4: **(b)** filled by B, which is **older** (depth 2.0);
  - H3, x 0.4–0.6, y 0.6–0.8: **(c)** empty.
- **Prep:** every feature has surface compaction.

| Figure | F | (a) A in H1 | (b) B in H2 | (c) Remaining site (H3 in it) | Total |
|---|---|---|---|---|---|
| Area, SF | 5,200 | 400 | 400 | 4,000 | 10,000 |
| Cut, CF (no strip) | 2,600 | 0 | 600 | 0 | 3,200 |
| Fill, CF (no strip) | 0 | 0 | 0 | 2,000 | 2,000 |
| Subgrade prep, SF | 5,200 | 400 | 400 | none | |
| Strip "Remaining Site" (all unticked), 0.5 ft | none | none | none | 4,000 SF, 2,000 CF | cut 3,200, fill 4,000 |
| Strip "Selected Site Features" F, A, B, 0.5 ft | 5,200 SF; cut and fill 0 | 400 SF; fill 200 | 400 SF; cut 400 | not stripped; fill 2,000 | 6,000 SF, 3,000 CF; cut 400, fill 2,200 |
| Remaining-site drawing, SF | | | | 4,000 | |
| Click at the hole's middle picks | | A | B | nothing; with F selected, the hole | |

**The engine today on the same inputs:**

- Grading, prep and own areas are as above.
- The Remaining-site drawing is 4,800 SF.
- The "Remaining Site" strip is 4,800 SF / 2,400 CF, with cut 3,000 and fill 4,200.
- The features strip is 5,200 SF / 2,600 CF, with cut 600 and fill 2,000.
- All three clicks pick F.

**Quantity-table rows (stage 2: `intelcost-infra/browser/lib/earthwork-cases.mjs`, runner `quantity-table.mjs`)**

1. **`d1298-holes-grading`** (`realshape`, with the runner extended to give each region's area, cut and fill, the
   Remaining-site ring area and the prep):
   - `feature:F:areaSF` 5,200, `feature:A:areaSF` 400, `feature:B:areaSF` 400;
   - `region:F:cutCF` 2,600, `region:A:cutCF` 0, `region:B:cutCF` 600, `region:null:fillCF` 2,000;
   - `remainingDrawnSF` 4,000;
   - `prep:F` 5,200, `prep:A` 400, `prep:B` 400;
   - cut 3,200 CF, fill 2,000 CF.
2. **`d1298-holes-strip-remaining`** (`strips` with runs, all unticked):
   - strip piece 4,000 SF, 2,000 CF;
   - cut 3,200, fill 4,000.
3. **`d1298-holes-strip-features`** (`strips` with runs, F, A and B ticked):
   - strip piece 6,000 SF, 3,000 CF;
   - cut 400, fill 2,200.
4. **`d1298-hit-h1`, `-h2`, `-h3`** (a new `hit` kind through `engine/hit.ts` with `drawOrder`):
   - A, B, and nothing;
   - with F selected, H3 gives F's deduct.
5. **Controls, unchanged:**
   - `real-shape-feature-subtract` (3,200);
   - a strip of F alone (5,200 SF);
   - "Remaining Site" with F ticked (9,200 SF);
   - a within-boundary strip (10,000 SF, cut 400, fill 4,200).

**Drawn area equals reported area (within 0.1 %)**

- **Each feature:** the area of the rings the views draw, `featureShape` ∩ boundary less newer features' final shapes,
  against its result region's area.
- **The Remaining site:** the area of `remainingSiteRings` against the `null` region.
- **How:** computed with the same exported functions the views call (QT row 1 carries the Remaining-site figure). The
  key map's SVG path is also read back in the MCP smoke on the throwaway look-alikes.
- **Expected:** F 5,200 / 5,200, A 400 / 400, B 400 / 400, Remaining 4,000 / 4,000. Today the Remaining site is 4,800
  against 4,000, which is +20 %.

**11170:** the fix changes none of its numbers. 97,784 + 54,583 = 152,367 SF stands, and so does every other figure, to
the cent:

- grading and prep already honour the holes;
- its strip is within the boundary, which the strip bug cannot reach.

What changes is the Features 2D picture and its label anchor, the Remaining-site key map, and the selection of the
features inside the holes.

### Stage 2 results (night run 2026-11-17, D-1298; app e3a5c1c; built, founder to confirm)

The app save was one gated copy of 14 files at 04:29:57 UTC. No api change and no migration. Smoke, screenshots and
profiles are on throwaway `fx.equip.20261117033828`, in a copy of the 3D test project. The figures and pictures are in
`intelcost-infra/morning-report-2026-11-20/step3/`.

**Look-alike on C-100 of the copy** (1" = 30'):

- **Boundary:** 136,274 SF.
- **Surfaces:** flat EG 100.0, flat FG 100.5, from spots.
- **Features:** B (24 in, older), then F (12 in) with three deduct holes of 5,793.95 SF each, then A (6 in, newer)
  filling hole 1. Every feature has compaction.
- **Strips:** two 6 in Site Prep areas, "Remaining Site" with no feature ticked, and "Selected Site Features" with F, A
  and B ticked.
- **Grading rule:** spots only, so the proposed grade applies inside the features (D-1151).

| Figure | Before | After | Hand |
|---|---|---|---|
| F · A · B plan area, SF | 86,909 · 5,794 · 5,794 | the same | 104,291 − 3 × 5,794 = 86,909 |
| Cut · fill | 215 BCY · 126 CCY | the same | (unchanged by design) |
| Subgrade prep F · A · B, SF | 86,909 · 5,794 · 5,794 | the same | |
| Strip "Selected Site Features" | 86,909 SF, 1,609 BCY | **98,497 SF, 1,824 BCY** | F + A + B = 98,497 |
| Strip "Remaining Site" | 49,364 SF, 914 BCY | **37,777 SF, 700 BCY** | 136,274 − 98,497 = 37,777 |
| Remaining-site key map, drawn | 49,364 SF (holes 1 and 2 painted) | **37,777 SF** | 37,777 (0.0 %) |
| F key map, drawn | 86,909 SF (even-odd) | 86,909 SF (its final shape) | = plan area (0.0 %) |
| Features 2D | F painted over all three holes; hole 3 hidden; A and B blended on F | F with its holes cut out; hole 3 empty; A and B in their own colours; F's leader inside F, clear of the holes | |
| Click in hole 1 · 2 · 3 | F · F · F; Send to back on F still F | **A · B · F's deduct (the hole)** | |
| Order | per item; Bring to front / Send to back only | sheet-wide; four steps; after a reload, C stays above F where they overlap; Bring forward on F puts F over C | |

**Drawing speed** (dev build, C-200 of the copy, CUT & FILL on so the 2D readout is live, Snap on, 900 moves 8 ms
apart, 10 clicks). A ~10 h fixture run was going on the same machine throughout, so before and after ran under the same
background load.

| Tool | CPU | Commits per move, before → after | Frames p50 / p95, ms | Dropped (> 25 ms) | Move p50 / p95 / max, ms |
|---|---|---|---|---|---|
| Site feature | 1× | 0.986 → **0.007** | 16.7 / 16.8 → 16.7 / 16.8 | 43 → 28 | 0.9 / 1.8 / 7.0 → 0.8 / 1.7 / 3.3 |
| Site feature | 4× | 0.966 → **0.007** | 66.6 / 133.1 → 50.0 / 116.6 | 901 → 864 | 9.0 / 20.9 / 46.4 → 8.1 / 17.9 / 72.6 |
| Utility run | 1× | 0.989 → **0.010** | 16.7 / 17.0 → 16.7 / 16.8 | 64 → 26 | 0.9 / 2.0 / 6.1 → 0.8 / 1.5 / 6.5 |
| Utility run | 4× | 0.959 → **0.010** | 66.6 / 116.6 → 49.9 / 83.3 | 902 → 862 | 9.3 / 19.3 / 66.5 → 7.7 / 13.8 / 56.5 |

- **Control.** With the grade view off, before, the readout is absent: 0.008 commits per move at 1×.
- **Coverage.** Every tool already drew through D-1294's refs. The one commit per move left was `Readout2D`, now painted
  per animation frame.
- **Not fixed.** `ProjectTakeoff.tsx:onPointer` → `setPointer` re-renders the page per move only while colleagues are
  online with names on hover. It was not measured (it needs two live sessions) and is left as is.
- **Production build.** Not measured this run: memory was tight and the fixture run was going.

**Gates and the quantity table.**

- **App gates** (lint, typecheck, build) all pass. Lint's 4 warnings were all there before.
- **Quantity table:** exit 0 and 0 FAIL. "quantity table: 344 rows, both engines equal to 1e-9 on 340; … 389 earthwork
  rows right …". It includes the nine D-1298 rows:
  - `d1298-holes-grading`;
  - `d1298-holes-strip-remaining` and `d1298-holes-strip-features`;
  - three controls: F alone, remaining with F ticked, within the boundary;
  - `d1298-holes-strip-keys`;
  - `d1298-pick-holes` and `d1298-pick-sent-back`.
- **Existing row updated.** `sf-remaining-site` passes `remainingSiteRings` its features as final shapes; the answer is
  unchanged at 7,500 SF.
- **11170:** no figure changes. Its features are already owned correctly, and its strip is within the boundary.

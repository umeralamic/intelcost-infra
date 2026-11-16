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

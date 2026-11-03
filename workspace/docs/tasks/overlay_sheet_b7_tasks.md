# Overlay a sheet with linked markups (B7): tasks

**State:** specced, not built. The queue of 2026-11-03 allowed B7 to be left unfinished so that the closing
release (Part C) could run. Pending founder review: this spec.

## The estimator's need

A site, utility or landscape sheet often repeats the grading sheet's plan. The estimator wants to lay one sheet
over another and see both sets of markups in one place, without measuring the same pipe or curb twice.

## What exists

- **Overlay a sheet** in Stitch sheets (renamed in D-966) lays a survey sheet over the grading sheet for its existing
  grade: control points clicked on both sheets in Split view, fitted by the api
  (`features/takeoff/earthwork/registration/RegistrationPanel.tsx`, F18). It brings the contours, not the
  markups.

## To build

1. **Any sheet, not only surveys.** "Overlay a sheet" takes any calibrated sheet of the project. The fit is the
   existing control-point fit (2 pairs, residuals from 3), stored as it is today.
2. **Faded image.** The overlaid sheet draws under the host's markups at an opacity the estimator sets (default
   50 %), with a toggle to hide it. The overlay's image is its own rendered page, transformed by the fit.
3. **Linked markups.** The overlaid sheet's markups draw on the host through the fit, in their item colours and
   read-only, each tagged with its source sheet. Clicking one opens it on its own sheet.
4. **Count once.** A linked markup is a view, never a copy. Quantities, the takeoff tables, the estimate and the
   exports count the markup on its own sheet only. The host's totals do not change when an overlay is added or
   removed. (Proof: the bid on a DUP before and after adding an overlay.)
5. **Source sheet replaced.** When the overlaid sheet is replaced by a new revision (to check when built: whether
   the replace flow keeps the sheet's uuid, or the link must be carried to the new one), the link follows the sheet and its markups. When the sheet is deleted or its page no longer
   matches (its size changes), the link shows "Overlay broken: re-pick the points" and draws nothing until it is
   re-fitted.
6. **Takeoff invariants.** Nothing in `vertices_json` or `shape_meta` changes; the transform is applied at draw
   time only (hard rule 3).

## Not decided

- Whether a linked markup may be copied to the host as its own markup (then it counts on the host and the
  source's is excluded). Recommended: not in the first cut.
- Snap to a linked markup's vertices while drawing on the host. Recommended: yes, as Snap PDF does.

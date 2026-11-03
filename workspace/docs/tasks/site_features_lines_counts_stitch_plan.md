# Plan: Site Feature lines and counts, the dialog width, stitch ways, Overlay a sheet

**Status:** plan only, not started (2026-11-03). Nothing built. Each part gets its D-NN and its own task file when picked up.

## 1. A Line's inputs follow its type

**Now:** the Type select loads the type's numbers (Sidewalk strip loads Curb 0 × 0, Gutter 60 × 4), but every type shows the same two rows, "Curb" and "Gutter", because every profile is stored as two rectangles (`CurbProfile` in `lib/takeoff/earthwork/siteSection.ts`; the fields in `SiteSectionFields.tsx` `LineFields`).

**Plan:** each type shows its own inputs and labels:

| Type | Inputs |
|---|---|
| Barrier, mountable, ribbon/header curb | Top width, base width, height |
| Curb and gutter | The curb as above, plus gutter width, lip thickness and edge thickness |
| Valley gutter | Width, edge thickness, dish depth |
| Sidewalk strip, mow strip | Width × thickness |
| Custom | A shape the estimator defines (see 2) |

The drawing beside the inputs shows the actual shape.

## 2. Profiles that are not rectangles

Real curbs have a sloped back face and gutters a sloped pan, so two rectangles overstate the concrete.

**Plan:**
- The profile is stored as an outline: corner points, inches. Its cross-section area is computed exactly from the outline (analytic, hard rule 3).
- The preset types build the outline from the inputs in 1.
- Custom offers two ways in: type the cross-section area (SF) and the formed face height, or enter the corner points in a small table.
- Form area comes from the formed edges; excavation from the outline's width and depth.
- Existing saved features convert to the same rectangle, so no current price moves.

**Spec needed first:** this changes how a quantity is computed (hard rule 3).

## 3. Missing Line types

**Concrete Mow Strip is missing.** Add it, with concrete swale/flume and landscape edging.

Silt fence and fence are not concrete profiles, so Line gets a family choice first:
- **Concrete profile:** the current curb types plus mow strip and swale.
- **Fence:**
  - Silt fence: standard, wire-backed, super silt fence.
  - Construction fence: orange safety fence, temporary chain-link panels.
  - Permanent fence by type and height: chain link, wood, ornamental, split rail.
- **Erosion control:** wattles/straw logs, compost filter sock.
- **Other linear items:** guardrail, trench drain, pavement striping.

**Blocker: pricing.** The Q4 2026 release and `docs/reference/Materials research/` have no keys for silt fence, fencing, mow strip or erosion control, and no crews for them. Without sourced prices these lines would show "no price" in Needs attention. No invented figures: a price research pass comes first.

## 4. Count: flag pole base and round bases

**Now:** a built-in-place Count is always a rectangle (length × width × thickness). Only a bought bollard has a round footing (`footingDiaIn`).

**Plan:**
- A **Shape** choice: rectangular pad, round pad (diameter × thickness), round pier (diameter × depth), or pier with pad.
- Add **Flag pole base**. It and Light pole base start as round piers.
- Other common counts to consider: transformer pad, dumpster pad, gate, sign post, bench or bike rack (bought and set), inlet protection, rock check dam.

## 5. Dialog width

The Site Features dialog is `size="lg"` (about 510 px), and the Joints row already wraps ("ft, expansion every" on its own line). One size up (about 575 px) fits each row on one line. On narrow screens it stays full width.

## 6. Stitch sheets: Matching points only

Match line, Matching points and Control points are all point pairs. Two differences survive the merge:
- **Match line** also trims each sheet at the line. It becomes a tick under Matching points: "Points 1 and 2 are on the match line: trim the sheets there."
- **Control points** match points to typed coordinates (N/E) instead of another sheet. They become optional N/E fields on any point; the pick help already suggests this. The Coordinates panel stays, because GPS export uses it.
- Sheets already stitched by match line or control points still open and edit as before.

## 7. "Lay a survey sheet over" becomes "Overlay a sheet"

**Now:** it carries only existing grade from a survey sheet (F18). Site features, utilities and structures usually sit on separate sheets.

**Recommended:** link the markups, not just the image. The estimator marks items on the sheet where they are drawn, and the overlay maps them onto the grading sheet through the matching points, as existing grade comes in now. One Calculate uses them. Each item is still counted once, on its own sheet. The overlaid image can show faded behind as a visual aid; quantities come only from the linked markups.

## Order

1. Dialog width.
2. Per-type inputs and outline profiles (spec first).
3. Mow strip, round count shapes, flag pole base.
4. Stitch: Matching points only.
5. Overlay a sheet with linked markups (the largest piece).
6. Fence, silt fence and erosion control, once sourced prices exist.

## Questions for the founder

- Price research for fence, silt fence, erosion control and mow strip: who sources it, or research from public sources?
- Should a pole base have a starting size, or stay blank until the estimator types one?
- Overlay a sheet: which items come in first? Recommended: site features and utilities.

# B2: a Line's inputs follow its type; profiles as outlines (spec, D-963)

**Status:** specced 2026-11-03 for the founder's queue, Part B2. Hard rule 3: a change to how a quantity is computed needs a spec first. Pending founder review.

## Problem

Every Line type shows the same two rows, "Curb" and "Gutter", because a profile is stored as two rectangles (`CurbProfile`: curb width × height above a gutter pan width × depth). A sidewalk strip reads "Curb 0 × 0, Gutter 60 × 4". A real curb has a sloped back face, and a curb and gutter has a lip and an edge thickness, so two rectangles overstate the concrete.

## The shape, per type (inches)

| Type | Inputs |
|---|---|
| Barrier, mountable, ribbon/header curb | Total height, reveal (exposed height), top width, base width, back batter |
| Curb and gutter | The curb's five, plus gutter width, lip thickness, edge thickness |
| Valley gutter | Width, edge thickness, dish depth |
| Sidewalk strip, mow strip | Width × thickness |
| Custom | The cross-section area (SF) and the formed face height; or corner points in a table, with its area in SF beside it |

Stored as `LineSection.shape` (the inputs) and `LineSection.outline` (corner points, inches, x across the line from the back of the curb, y up from its bottom), worked out from the shape on every edit. `profile` stays for a feature saved before (read only).

### The outlines

- **Curb** (H total height, t top width, w base width, b back batter): (0,0), (b,H), (b+t,H), (w,0). The reveal is the face above the pavement or the flow line; it changes no concrete.
- **Curb and gutter** (curb as above with w the curb's width at the flow line; gutter width g, lip L, edge e): the flow line is at y_f = H − reveal and the gutter's bottom at y_b = y_f − L. Points: (0,0), (b,H), (b+t,H), (w,y_f), (w+g, y_b+e), (w+g, y_b), (w, y_b), (w,0). A curb deeper than the gutter keeps its foot below the pan.
- **Valley gutter** (W, edge e, dish d): (0,0), (0,e), (W/2, e−d), (W,e), (W,0).
- **Strip** (W × T): a rectangle.
- **Custom**: the table's points; or, typed as an area, no outline (the area stands for it).

## Quantities (analytic)

- **Concrete** CY = outline area (shoelace, sq in) ÷ 144 × length ÷ 27 × (1 + waste).
- **Forms**, by hand only (a slipformed curb has none): SF = length × 2 × (H + the gutter's edge thickness) ÷ 12 for curbs and curb and gutter, × 2 × T for a strip, × 2 × e for a valley gutter, the formed face height typed for Custom. This is the formula a saved feature already has, so no saved price moves.
- **Excavation and base** take the outline's width (its x extent) and depth (its y extent), as the two rectangles' footprint and curb height did.

## Saved features

A feature saved before B2 has `profile` and no `shape`: it reads as the same rectangles. A curb is H = curb height, t = w = curb width, b = 0, reveal = H. A curb and gutter is the same curb with the gutter pan at its foot: y_f = gutter depth, reveal = H − gutter depth, lip = edge = gutter depth, g = gutter width. A valley gutter is e = depth, d = 0, and a strip is width × depth. Its concrete, forms and excavation come out the same to the cent. Prove it on the DUP: a hand curb and gutter and a machine barrier curb drawn before B2, priced before and after.

## Defaults for a new feature

The profiles a type starts with today, put in the new inputs: barrier 6 × 18, mountable 8 × 10, ribbon 6 × 12 (b = 0, t = w, reveal = H); curb and gutter 6 × 18 curb, 24 in gutter, 6 in lip and edge, 12 in reveal; valley 36 in, 6 in edge, no dish; sidewalk strip 60 × 4; mow strip 6 × 4 (new, B3). An estimator reads the detail and types the batter and dish.

## Not in B2

The Fence, Erosion control and Other families and their materials (B3, B4).

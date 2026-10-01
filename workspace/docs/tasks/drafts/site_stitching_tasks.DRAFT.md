# Site stitching: several grading sheets as one continuous site (draft spec, questions open)

> **Draft, written overnight 2026-10-01 (task 3 of the plan). Nothing is built.** The
> founder's design is written in below as **decided**. Every other choice is a question at
> the end, with a recommendation; none is decided here. Sources:
> - the founder's design (the overnight plan of 2026-10-01);
> - F18's registration engine as built (D-188, D-190, D-192);
> - the canvas as built (F5's pdf.js canvas, D-35, D-41, D-42);
> - the earthwork engine (F12, D-136 to D-187, D-191).
>
> Legacy has no such feature. Its earthwork is strictly per sheet (see the F18 spec, "Legacy
> today"), so there is nothing to drive live.

## The problem

A large site is drawn over several grading sheets, split at **match lines** ("MATCH LINE —
SEE SHEET C-201"). Today each sheet is a separate Calculate (D-136 Q14).
- **Contours stop at the sheet edge.** Each sheet's TIN ends at its match line, so its edge
  triangles are extrapolated or missing.
- **The site balance is wrong.** Each sheet gets its own import or export. A site that cuts
  on its west sheet and fills on its east sheet shows an export and an import, where in truth
  the soil moves across the line and nothing leaves the site.
- **The overlap is drawn twice.** Sheets overlap past their match lines, so anything drawn
  across both is counted twice.

**Problem → solution.** Draw the match line on one sheet, then the same line on the other.
The second sheet joins the first, aligned by the two lines. The joined sheets show as **one
continuous drawing**, each the actual sheet cut at its match line. One boundary, contours
across the join, and one Calculate give one cut, one fill and one site balance.

## The founder's design (decided)

1. **Joining by match lines.**
   - The person draws the match line on one sheet, then the same match line on the other.
   - The second sheet joins onto the first, aligned by the two lines: their ends give
     position and rotation, and each sheet's calibration gives scale.
2. **One continuous drawing.** The joined sheets show as one seamless canvas to pan and zoom
   across.
3. **Each joined sheet is the actual sheet, not an overlay picture.**
   - Its own PDF page is drawn live by pdf.js, placed and clipped, with its real vector lines
     and text.
   - So Auto Trace, Snap PDF, Find Text and measuring work on every joined sheet's side.
4. **Everything beyond each sheet's match line is hidden,** so the overlap is never shown or
   counted twice.
5. **One boundary and contours across the joined sheets.** One Calculate gives one cut, one
   fill and one site balance: import or export once, for the whole site.
6. **Auto Trace on the stitched drawing:**
   - traces each sheet's visible part;
   - joins contours that meet at the match line when their elevations agree;
   - flags unpartnered or mismatched contours.
7. **It reuses the registration engine from F18** (`register.ts` and its Python twin).
8. **Acceptance test.** Crop C-200 into overlapping west and east halves (Crop as New Page),
   draw the match line on both, stitch, trace and Calculate. Cut, fill and export must equal
   C-200 as one sheet.

## Terms

- **Site:** a named set of joined sheets with one coordinate frame (the "site frame").
- **Member:** a sheet in a site, placed in the site frame by a rigid motion (rotation and
  translation in feet, no scale: each sheet's own calibration supplies the scale), and
  clipped to its **visible region**.
- **Match line:** a polyline drawn on a sheet, two points or more. Its pair on the other sheet
  is the same line. Legacy's plans usually draw it as a straight line; a bent one is allowed
  (Q4).
- **Anchor sheet:** the first member. Its page frame, in feet, is the site frame.

## How joining works

1. **Draw the match line on sheet A.** It is a new tool, "Match line", on the Earthwork row,
   in the Takeoff tab too (Q2). Two clicks or more, Snap PDF on, as F18's picking. The line
   is labelled "Match line 1".
2. **Draw the same match line on sheet B.** A prompt asks which line it matches when A has
   more than one. The order of the clicks may run the other way: the engine pairs the ends
   both ways and keeps the fit with the smaller miss.
3. **The fit (F18's engine):**
   - The two lines' ends are two control pairs. `fitRigid` gives the rotation and
     translation in feet.
   - A bent line adds its interior vertices as pairs (by arc length along each line).
   - **The distance check** compares the two lines' lengths in feet, with F18's 0.5 % and
     2 % rules. "Fit the scale too" is offered as in F18 (Q5).
   - **The residuals** come from three points on.
   - **The match score:** the share of B's linework within a few points of A's, along a band
     either side of the line where the sheets overlap. It catches a line drawn on the wrong
     feature.
4. **The join is saved.** B becomes a member of A's site (or the site is created with A as its
   anchor), placed by the fit composed with A's own placement.
5. **The visible region.** Each sheet keeps the side of its match line that holds its own
   drawing (its sheet border's centre decides, Q6). Everything beyond the line is clipped:
   not drawn, not snapped to, not traced, not measured.
6. **More sheets** join the same way, to any member. A sheet belongs to one site at most
   (Q3).

## One continuous drawing (rendering)

**The canvas today (F5):** one sheet per canvas. A fit WebP first, then pdf.js renders a
half and then a full pass; above 2.5× it renders windows of the page (D-35). Shapes are
stored normalised to their own page (0..1).

**The stitched canvas:**
- **A new view, "Site",** next to the sheet view: the Sheets panel lists a site as a row with
  its members under it (Q1). Opening the site opens the stitched canvas.
- **Each member is a positioned layer:**
  - its own fit image and its own pdf.js renders;
  - transformed by its placement (a CSS transform: rotate and translate, scaled by the ratio
    of its feet per point to the anchor's);
  - clipped by its visible region (an SVG `clipPath` or a CSS `clip-path` polygon in its own
    page space, so the clip turns with it).
- **Fast with several large sheets:**
  - **Only what is on screen renders.** Each member's window render (D-35) is computed in
    its own page space from the screen rectangle mapped back through its placement, so a
    pan over a four-sheet site renders the few tiles in view, not four pages.
  - **Members off screen** keep only their fit image (tens of KB) and drop their pdf.js
    rasters.
  - **The pdf.js documents** are opened through the existing refcounted cache
    (`pdf/caches`). At most N rasters are held (Q8).
  - **Zoom levels** are the canvas's (D-102). Each member renders at the screen's pixel
    density times its own scale ratio, so line weights match across the join.
- **Turned sheets (P-20a):** a member's `view_rotation` is display only in the sheet view. In
  the site view the placement replaces it: the site frame decides what is up (Q7).

## Editing across the join

- **Coordinates.** A shape drawn in the site view is stored **on the member it falls in**,
  normalised to that member's page, as today. A shape that crosses the match line is
  **split at the line** into one piece per member. The pieces share a `site_shape` id (a
  `shape_meta` key), so they select, move and delete together and read as one.
  - This keeps every sheet's own view, its quantities, the Sheets panel's per-sheet rows and
    the estimate's sheet chips true. A piece on a sheet is a shape on that sheet.
  - Quantities are analytic and per piece (hard rule 3), so the sum is the whole: no
    sampling.
- **A contour across the join** is two runs, one per member, each with the same elevation
  and the same `site_shape` id. In the site TIN they are one run again: the engine rejoins
  them at the line (their shared point).
- **Snap, Snap PDF and Find Text** read every member's visible part. Snap PDF's index
  (`pdfSnap.ts`) is built per member and queried through its placement.
- **Vertex drag across the line:** the piece's vertex is clamped to its own visible region;
  dragging a shared join point moves both pieces' copies (Q9).
- **Undo** records the pieces as one step (the session history already takes a batch).
- **Realtime:** the existing shape events, per member sheet. A colleague in a member's sheet
  view sees the pieces on that sheet.

## Calculate on a site

- **One Calculate per site** (beyond D-136 Q14, which stays for a lone sheet).
- **The inputs:** every member's EG and FG runs, mapped into the site frame by its placement
  and clipped to its visible region, merged into one EG TIN and one FG TIN. Pieces sharing a
  `site_shape` id are rejoined.
- **The boundary:** one boundary for the site, drawn in the site view. It is stored as
  pieces per member, like any shape across the join, and rejoined into one ring.
- **Site Features and Strip Areas** may sit on any member; they map into the site frame the
  same way.
- **The result:** one row per site, with the totals and one site balance (one import or one
  export), and lines filed per site. Each line's source chip names the site (Q10).
- **The version key** folds every member's runs, placement and clip, and both scales of
  every join, so any edit on any member shows the site stale.
- **Units:** the site frame is in feet; the volume engine takes a calibration of 1 ft per
  unit in that frame.

## Interaction with F18's survey link

- **A survey linked to one member** (F18) feeds the site through that member: its EG is mapped
  onto the member, then into the site frame by the member's placement.
- **A survey spanning several members:** link it to the anchor or to any one member. The
  engine maps it once into the site frame; it is not repeated per member (Q11).
- **Crossings between a survey's EG and a member's own EG** show F18's chips, naming the
  sheet.
- **Registrations and joins share one table.** A join is a `sheet_registration` row with
  `kind = 'join'` and its two match lines; a survey link is `kind = 'survey'` (Q12).

## Data and api

- **`site`:** `project_id`, `name`, `anchor_sheet_id`, `created_by`.
- **`site_member`:** `site_id`, `sheet_id` (unique: one site per sheet), and the placement
  (rotation, translation in feet, any fitted scale), the visible-region polygon in the
  member's page space, and `sort_order`.
- **`sheet_registration`** gains `kind` (`survey` | `join`) and, for a join,
  `match_line_source` and `match_line_target` (normalised polylines). The fit, checks and
  match score are stored as today.
- **Routes:**
  - `GET …/site`, `POST …/site` (create with an anchor), `PATCH …/site/{uuid}`
    (rename), `DELETE …/site/{uuid}`;
  - `PUT …/site/{uuid}/member/{sheet}` (join: the match lines and the choice of fitted
    scale; the api fits the pairs again with the Python twin), `DELETE …/member/{sheet}`;
  - `PUT …/earthwork/site-result/{site}`, `POST …/site-result/{site}/stale`.
  - Events: `site.changed`, `earthwork.site-result.changed`.
- **Who may stitch:** anyone who may edit earthwork (F18 Q9's rule).
- **Deleting a member sheet** removes it from its site; a site left with one member is
  dissolved (Q13).

## Engine (pure, hard rule 2)

`lib/takeoff/earthwork/site.ts`, data in and data out:
- `matchLinePairs(lineA, lineB)`: the control pairs from two polylines by arc length, both
  directions tried, the better kept;
- `placeMember(anchorPlacement, fit)`: the composed placement;
- `visibleRegion(page, matchLines, borderCentre)`: the clip polygon;
- `toSite(points, member)` and `fromSite(point, members)`: points between a member's page and
  the site frame, and which member a site point falls in;
- `splitAtJoins(polyline, members)`: a drawn shape into pieces per member;
- `rejoinRuns(runs)`: pieces with one `site_shape` id back into one run, in order;
- `siteRuns(members, runsBySheet)`: every member's runs in the site frame, clipped and
  rejoined;
- `stitchTrace(tracesByMember, members, tolerancePt)`: Auto Trace's lines per member, joined
  where they meet at a match line with equal elevations, with flags for an unpartnered end
  or a mismatched elevation.

The Python twin covers `matchLinePairs`, `placeMember` and the fit (the api checks them); the
TIN and volumes stay in the browser, as today.

## Auto Trace on the stitched drawing (decided, with its mechanics)

- **Each member is traced on its own visible part:** `readSheet.ts` and the trace worker
  (D-143), the read clipped to the region.
- **Joining at the match line:** an end within a few points of the line on one member,
  facing an end on the other member's side, same elevation (label or suggestion), and close
  in the site frame, is joined. The two traced runs become one adopted contour stored as
  pieces with one `site_shape` id.
- **Flags:**
  - "No partner across the match line" (an end at the line with nothing facing it);
  - "Elevation differs across the match line (709 / 710)".

  These are listed in the trace panel and drawn amber, as D-143's flags are.

## Quantity-table rows (hand-worked)

- **Two halves of a square at different scales,** joined by a straight match line: the
  placement puts B's corners on A's to 1e-9; their lengths are equal (0.0 %).
- **A match line drawn in the opposite direction on B:** the same placement.
- **A bent match line (three points):** residuals 0; a 1 % stretch warns.
- **`splitAtJoins`:** a run across the line gives two pieces meeting at the line, with
  lengths summing to the whole.
- **`rejoinRuns`:** the pieces rejoin into the original run.
- **Volume:** the plane z = 100 + 2x + 2y over two joined halves, against FG flat 103,
  equals the one-sheet answer (cut 10,000 / 24 / 27, fill 250,000 / 24 / 27).
- **The site balance:** a west half all cut (500 CY) and an east half all fill (500 CCY at
  shrink 1.00). Two separate Calculates give an export of 500 and an import of 500; the site
  gives a net 0 and neither line.
- **`stitchTrace`:** two halves of three contours: three joined, no flags; one elevation
  changed gives one mismatch flag; one deleted gives one unpartnered flag.
- **The acceptance row:** C-200 cropped into overlapping west and east halves, stitched,
  traced and calculated. Cut, fill and export equal C-200 as one sheet (to the cent, when
  both are traced from the same linework).

## Blocks (proposed)

- **A. Engine and data:** `site.ts` and its twin, the tables and routes, the quantity rows
  above except the acceptance row.
- **B. Joining:** the Match line tool, the join flow and its checks, the Sheets panel's site
  row.
- **C. The stitched canvas:** members placed and clipped, per-member window renders, pan and
  zoom across, Snap and Snap PDF and Find Text across members.
- **D. Editing across the join:** split and rejoin, selection, move and delete as one, vertex
  rules, undo.
- **E. Calculate on a site:** one result, one balance, the lines, stale.
- **F. Auto Trace stitched:** per-member trace, the join and its flags; the acceptance row on
  C-200's halves.

## Questions for the founder (each with a recommendation; none decided)

1. **Where the site lives in the Sheets panel.** *Recommend:* a site row at the top of the
   panel ("Site: Hidden Valley grading, 2 sheets") with its members under it. A member keeps
   its own row in its folder too, with a small "in site" chip.
2. **Where the Match line tool sits.** *Recommend:* the Earthwork row, next to Boundary.
   Stitching is for grading, and the Takeoff tab's toolbar is full.
3. **Can a sheet belong to two sites?** *Recommend:* no, one at most; a second join to another
   site offers to merge the two sites.
4. **Straight or bent match lines.** *Recommend:* any polyline, matched by arc length. Real
   match lines are usually straight, but some follow a road.
5. **"Fit the scale too" for a join.** *Recommend:* allow it with F18's 0.5 % / 2 % rules and
   the warning on every result. Two sheets of one set at different stated scales are common;
   one misprinted scale is rare.
6. **Which side of the line a sheet keeps.** *Recommend:* the side holding the centre of the
   sheet's drawing area (its border), with a "Keep the other side" switch for the rare case.
7. **What is up in the site view.** *Recommend:* the anchor sheet's up (its `view_rotation`
   applied), with the canvas's Rotate acting on the whole site.
8. **How many full-resolution members are held.** *Recommend:* the members on screen plus
   one; the rest keep their fit image. Measure on a four-sheet set (each sheet's raster is
   about 60 MB at full zoom).
9. **Dragging a shared join point.** *Recommend:* it moves both pieces' copies along the
   match line only, so the pieces stay joined; off the line it is refused.
10. **What a site Calculate leaves on the members' own sheet Calculates.** *Recommend:* a
    member's own sheet result is kept but marked "Superseded by Site X", and its lines
    hidden from Estimating while the site's exist, so nothing is priced twice.
11. **A survey linked to several members.** *Recommend:* link it once, to the site. A survey
    linked to one member feeds the site through that member, and a second link of the same
    survey to another member of the same site is refused as a duplicate.
12. **One table for joins and survey links.** *Recommend:* yes, `sheet_registration` with a
    `kind`. F11's Overlay can then draw either.
13. **Removing a member.** *Recommend:* allowed; pieces of shapes across its join stay on
    their sheets, their `site_shape` id dropped. A site left with one member dissolves, and
    its result goes stale.
14. **The site view in Estimating and Reports.** *Recommend:* lines grouped under the site's
    name, each still carrying its member sheets' chips where a line comes from one sheet.
15. **Measuring (Linear, Area, Count) in the site view, beyond earthwork.** *Recommend:* yes,
    with the same split-at-the-join storage. It is the same mechanism, and the founder's
    design asks that measuring work on every joined sheet's side.
16. **The acceptance crop's overlap.** *Recommend:* about 10 % of C-200's width each way
    past the match line, which is what real sheet sets show. Draw the match line on a printed
    feature both halves carry (a grid line or a road edge), so the clicks land on the same
    ground.

## Progress

- [x] Draft written overnight 2026-10-01 with the founder's design decided.
- [ ] The founder's answers.
- [ ] Adopted as `docs/tasks/site_stitching_tasks.md`; a feature number and board row.

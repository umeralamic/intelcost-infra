# F19 (F12 addition): Site stitching, several grading sheets as one continuous site

> **Spec, adopted 2026-10-02 with the founder's answers (D-231). Planned, ready to build.
> Nothing is built.** Written from the overnight draft of 2026-10-01
> (`docs/tasks/drafts/site_stitching_tasks.DRAFT.md`, removed). Sources:
> - the founder's design (the overnight plan of 2026-10-01);
> - F18's registration engine as built (D-188, D-190, D-192);
> - the canvas as built (F5's pdf.js canvas, D-35, D-41, D-42);
> - the earthwork engine (F12, D-136 to D-187, D-191).
>
> Legacy has no such feature. Its earthwork is strictly per sheet (see the F18 spec, "Legacy
> today"), so there is nothing to drive live.
>
> **The founder's changes to the draft's recommendations (D-231):**
> - **Q2:** the Match line tool sits on the Earthwork row **and** in the sheet's ⋮ menu as
>   "Join to another sheet at match line…".
> - **Q10:** a member's own sheet result is marked "Superseded by Site X" and its lines are
>   hidden from Estimating while the site's lines exist.
> - **Q15:** Linear, Area and Count work across joined sheets, with the same split-at-the-join
>   storage.

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

## The answers (D-231)

| # | Question | Answer |
|---|---|---|
| 1 | Where the site lives in the Sheets panel | **A site row at the top** ("Site: Hidden Valley grading, 2 sheets") with its members under it. A member keeps its own row in its folder too, with a small "in site" chip. |
| 2 | Where the Match line tool sits | **Changed: both.** The Earthwork row, next to Boundary, **and** the sheet's ⋮ menu as **"Join to another sheet at match line…"**. |
| 3 | A sheet in two sites | **No, one at most.** A join to a sheet already in another site offers to merge the two sites. |
| 4 | Straight or bent match lines | **Any polyline,** matched by arc length. |
| 5 | "Fit the scale too" for a join | **Allowed,** with F18's 0.5 % / 2 % rules and the warning on every result. |
| 6 | Which side of the line a sheet keeps | **The side holding the centre of the sheet's drawing area** (its border), with a "Keep the other side" switch. |
| 7 | What is up in the site view | **The anchor sheet's up** (its `view_rotation` applied); the canvas's Rotate turns the whole site. |
| 8 | Full-resolution members held | **Those on screen plus one;** the rest keep their fit image. Measured on a four-sheet set. |
| 9 | Dragging a shared join point | **Along the match line only,** moving both pieces' copies; off the line it is refused. |
| 10 | A site Calculate and the members' own Calculates | **A member's own sheet result is marked "Superseded by Site X"** and its lines are hidden from Estimating while the site's lines exist, so nothing is priced twice. |
| 11 | A survey linked to several members | **Link it once, to the site.** A survey linked to one member feeds the site through that member; a second link of the same survey to another member of the same site is refused as a duplicate. |
| 12 | One table for joins and survey links | **Yes:** `sheet_registration` with a `kind`. F11's Overlay can draw either. |
| 13 | Removing a member | **Allowed.** Pieces of shapes across its join stay on their sheets, their `site_shape` id dropped. A site left with one member dissolves, and its result goes stale. |
| 14 | The site in Estimating and Reports | **Lines grouped under the site's name,** each still carrying its member sheets' chips where a line comes from one sheet. |
| 15 | Linear, Area and Count in the site view | **Yes,** across joined sheets, with the same split-at-the-join storage. |
| 16 | The acceptance crop's overlap | **About 10 % of C-200's width each way** past the match line, the match line drawn on a printed feature both halves carry (a grid line or a road edge). |

## Terms

- **Site:** a named set of joined sheets with one coordinate frame (the "site frame").
- **Member:** a sheet in a site, placed in the site frame by a rigid motion (rotation and
  translation in feet, no scale: each sheet's own calibration supplies the scale), and
  clipped to its **visible region**.
- **Match line:** a polyline drawn on a sheet, two points or more (Q4). Its pair on the other
  sheet is the same line. Plans usually draw it straight; some follow a road.
- **Anchor sheet:** the first member. Its page frame, in feet, is the site frame.

## How joining works

1. **Draw the match line on sheet A.** The tool "Match line" has two entries (Q2):
   - the Earthwork row, next to Boundary;
   - the sheet's ⋮ menu in the Sheets panel, **"Join to another sheet at match line…"**,
     which opens that sheet's Earthwork tab with the tool armed.

   Two clicks or more, Snap PDF on, as F18's picking. The line is labelled "Match line 1".
2. **Draw the same match line on sheet B.** A prompt asks which line it matches when A has
   more than one. The order of the clicks may run the other way: the engine pairs the ends
   both ways and keeps the fit with the smaller miss.
3. **The fit (F18's engine):**
   - The two lines' ends are two control pairs. `fitRigid` gives the rotation and
     translation in feet.
   - A bent line adds its interior vertices as pairs (by arc length along each line).
   - **The distance check** compares the two lines' lengths in feet, with F18's 0.5 % and
     2 % rules. "Fit the scale too" is offered as in F18, with its warning on every result
     (Q5).
   - **The residuals** come from three points on.
   - **The match score:** the share of B's linework within a few points of A's, along a band
     either side of the line where the sheets overlap. It catches a line drawn on the wrong
     feature. Under 30 % it warns, as F18's (D-188 Q8).
4. **The join is saved.** B becomes a member of A's site (or the site is created with A as its
   anchor), placed by the fit composed with A's own placement.
5. **The visible region (Q6).** Each sheet keeps the side of its match line that holds the
   centre of its drawing area (its sheet border). A "Keep the other side" switch on the join
   covers the rare case. Everything beyond the line is clipped: not drawn, not snapped to,
   not traced, not measured.
6. **More sheets** join the same way, to any member. **A sheet belongs to one site at most
   (Q3).** A join between sheets already in two different sites offers to merge the sites
   ("C-201 is in Site East. Merge Site East into Site West?"); declining cancels the join.

## One continuous drawing (rendering)

**The canvas today (F5):** one sheet per canvas. A fit WebP first, then pdf.js renders a
half and then a full pass; above 2.5× it renders windows of the page (D-35). Shapes are
stored normalised to their own page (0..1).

**The stitched canvas:**
- **A new view, "Site",** next to the sheet view. **The Sheets panel (Q1)** lists each site as
  a row at the top of the panel ("Site: Hidden Valley grading, 2 sheets") with its members
  under it. A member keeps its own row in its folder too, with a small "in site" chip.
  Opening the site row opens the stitched canvas.
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
  - **Full resolution for the members on screen plus one (Q8);** the rest keep only their
    fit image (tens of KB) and drop their pdf.js rasters. Measured on a four-sheet set (each
    sheet's raster is about 60 MB at full zoom).
  - **The pdf.js documents** are opened through the existing refcounted cache
    (`pdf/caches`).
  - **Zoom levels** are the canvas's (D-102). Each member renders at the screen's pixel
    density times its own scale ratio, so line weights match across the join.
- **What is up (Q7):** the anchor sheet's up, its `view_rotation` (P-20a) applied. Every other
  member's `view_rotation` is display only in its own sheet view and plays no part here: its
  placement decides. The canvas's Rotate turns the whole site.

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
- **Vertex drag (Q9):** a piece's own vertex is clamped to its visible region. **A shared join
  point moves along the match line only,** carrying both pieces' copies with it, so the
  pieces stay joined; a drag off the line is refused.
- **Undo** records the pieces as one step (the session history already takes a batch).
- **Realtime:** the existing shape events, per member sheet. A colleague in a member's sheet
  view sees the pieces on that sheet.

## Measuring across the join (Q15)

**Linear, Area and Count work in the site view**, beyond earthwork, with the same storage as
contours:
- **Linear:** a run across the match line is split there into one piece per member, sharing
  a `site_shape` id. Each piece's length is analytic on its own sheet; the item's total is the
  sum, equal to the run's length in the site frame (a quantity-table row).
- **Area:** a polygon across the line is clipped by each member's visible region into one
  piece per member (an area on each side), sharing a `site_shape` id. The pieces' areas sum to
  the whole; deducts are split the same way and cascade from their own piece (F7's rule).
- **Count:** a mark is a point, so it falls in exactly one member and is never split. A mark
  on the line itself goes to the anchor-nearest member (the lower `sort_order`).
- **One item across members.** The pieces belong to the one item that was active, which spans
  sheets as any item does (D-189 Q15's rule, already true of Count). The Takeoff panel's sheet
  rows and the estimate's sheet chips show each sheet's share.
- **Select, move, copy and delete** act on every piece of a `site_shape` at once; a move that
  carries a piece over the line re-splits the shape.
- **Every measure tool's modes** (Segment, arcs, Ortho, Snap) work in the site frame; the
  split happens when the shape is saved, so arcs are split analytically at the line
  (hard rule 3), never sampled.

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
  export), and lines filed per site.
- **The members' own results (Q10):** a member's own sheet result is kept but marked
  **"Superseded by Site X"** wherever it shows (the volume panel, the sheet's result row, the
  Calculate dialog). **Its lines are hidden from Estimating while the site's lines exist,** so
  nothing is priced twice. Removing the site's result (or dissolving the site) shows them
  again.
- **Estimating and Reports (Q14):** the site's lines are grouped under the site's name, each
  still carrying its member sheets' chips where a line comes from one sheet.
- **The version key** folds every member's runs, placement and clip, and both scales of
  every join, so any edit on any member shows the site stale.
- **Units:** the site frame is in feet; the volume engine takes a calibration of 1 ft per
  unit in that frame.

## Interaction with F18's survey link (Q11, Q12)

- **A survey is linked once, to the site.** Its EG is mapped once into the site frame and not
  repeated per member.
- **A survey linked to one member** before the join feeds the site through that member: its
  EG is mapped onto the member, then into the site frame by the member's placement.
- **A second link of the same survey to another member of the same site is refused** as a
  duplicate ("Page 3 already feeds Site West through C-200").
- **Crossings between a survey's EG and a member's own EG** show F18's chips, naming the
  sheet.
- **Registrations and joins share one table (Q12).** A join is a `sheet_registration` row with
  `kind = 'join'` and its two match lines; a survey link is `kind = 'survey'`. F11's Overlay
  can draw either.

## Data and api

- **`site`:** `project_id`, `name`, `anchor_sheet_id`, `created_by`.
- **`site_member`:** `site_id`, `sheet_id` (unique: one site per sheet, Q3), and the placement
  (rotation, translation in feet, any fitted scale), the visible-region polygon in the
  member's page space, `keep_other_side` (Q6), and `sort_order`.
- **`sheet_registration`** gains `kind` (`survey` | `join`) and, for a join,
  `match_line_source` and `match_line_target` (normalised polylines). The fit, checks and
  match score are stored as today.
- **`earthwork_result`** gains `superseded_by_site_id` (null for a lone sheet), set while a
  site result covering the sheet exists (Q10).
- **Routes:**
  - `GET …/site`, `POST …/site` (create with an anchor), `PATCH …/site/{uuid}`
    (rename), `DELETE …/site/{uuid}`;
  - `PUT …/site/{uuid}/member/{sheet}` (join: the match lines and the choice of fitted
    scale; the api fits the pairs again with the Python twin), `DELETE …/member/{sheet}`;
  - `POST …/site/{uuid}/merge/{other}` (Q3);
  - `PUT …/earthwork/site-result/{site}`, `POST …/site-result/{site}/stale`.
  - Events: `site.changed`, `earthwork.site-result.changed`.
- **Who may stitch:** anyone who may edit earthwork (F18 Q9's rule).
- **Removing a member (Q13)** is allowed. Pieces of shapes across its join stay on their
  sheets, their `site_shape` id dropped. A site left with one member dissolves, and its result
  goes stale. Deleting a member sheet removes it from its site the same way.

## Engine (pure, hard rule 2)

`lib/takeoff/earthwork/site.ts`, data in and data out:
- `matchLinePairs(lineA, lineB)`: the control pairs from two polylines by arc length, both
  directions tried, the better kept;
- `placeMember(anchorPlacement, fit)`: the composed placement;
- `visibleRegion(page, matchLines, borderCentre, keepOtherSide)`: the clip polygon;
- `toSite(points, member)` and `fromSite(point, members)`: points between a member's page and
  the site frame, and which member a site point falls in;
- `splitAtJoins(polyline, members)` and `clipAreaToMembers(polygon, members)`: a drawn shape
  into pieces per member (Q15);
- `rejoinRuns(runs)`: pieces with one `site_shape` id back into one run, in order;
- `slideOnMatchLine(point, line)`: a dragged join point held on its match line (Q9);
- `siteRuns(members, runsBySheet)`: every member's runs in the site frame, clipped and
  rejoined;
- `stitchTrace(tracesByMember, members, tolerancePt)`: Auto Trace's lines per member, joined
  where they meet at a match line with equal elevations, with flags for an unpartnered end
  or a mismatched elevation.

The Python twin covers `matchLinePairs`, `placeMember` and the fit (the api checks them); the
TIN and volumes stay in the browser, as today.

## Auto Trace on the stitched drawing (decided, with its mechanics)

- **Each member is traced on its own visible part:** `readSheet.ts` and the trace worker
  (D-143), the read clipped to the region. The IndexedDB cache (D-196) is per member sheet.
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
- **`clipAreaToMembers` (Q15):** a rectangle across the line gives two areas summing to the
  whole; a deduct across the line splits with it.
- **`rejoinRuns`:** the pieces rejoin into the original run.
- **`slideOnMatchLine` (Q9):** a point dragged off the line is projected back onto it.
- **Volume:** the plane z = 100 + 2x + 2y over two joined halves, against FG flat 103,
  equals the one-sheet answer (cut 10,000 / 24 / 27, fill 250,000 / 24 / 27).
- **The site balance:** a west half all cut (500 CY) and an east half all fill (500 CCY at
  shrink 1.00). Two separate Calculates give an export of 500 and an import of 500; the site
  gives a net 0 and neither line.
- **Superseded (Q10):** with a site result present, the members' own lines are left out of
  the estimate rows; with it removed, they return.
- **`stitchTrace`:** two halves of three contours: three joined, no flags; one elevation
  changed gives one mismatch flag; one deleted gives one unpartnered flag.
- **The acceptance row (Q16):** C-200 cropped into overlapping west and east halves, about
  10 % of its width past the match line each way, the match line on a printed feature both
  halves carry, stitched, traced and calculated. Cut, fill and export equal C-200 as one
  sheet (to the cent, when both are traced from the same linework).

## Blocks

- **A. Engine and data:** `site.ts` and its twin, the tables and routes, the quantity rows
  above except the acceptance row.
- **B. Joining:** the Match line tool on the Earthwork row and "Join to another sheet at match
  line…" in the sheet's ⋮ menu (Q2), the join flow and its checks, the merge offer (Q3), the
  Sheets panel's site row and "in site" chips (Q1).
- **C. The stitched canvas:** members placed and clipped, per-member window renders, pan and
  zoom across, Snap and Snap PDF and Find Text across members, the anchor's up (Q7).
- **D. Editing and measuring across the join:** split and rejoin, Linear, Area and Count in
  the site view (Q15), selection, move and delete as one, the join-point slide (Q9), undo.
- **E. Calculate on a site:** one result, one balance, the lines grouped under the site
  (Q14), the members' results superseded (Q10), stale.
- **F. Auto Trace stitched:** per-member trace, the join and its flags; the acceptance row on
  C-200's halves (Q16).

## Progress

- [x] Draft written overnight 2026-10-01 with the founder's design decided.
- [x] The founder's answers (D-231, 2026-10-02).
- [x] Adopted as `docs/tasks/site_stitching_tasks.md`; F19 on the board, Planned, ready to
  build.
- [x] Block A1 (overnight 2026-10-06): the engine `lib/takeoff/earthwork/site.ts` and its Python twin
  `earthwork/site.py` (`matchLinePairs`, `fitJoin`, `placeMember`), with 10 quantity rows (5 on both
  engines). A straight match line fits exactly both ways round; the way that puts the two
  sheets either side of the line is kept (D-271).
- [x] Block A2 (overnight 2026-10-06): migration `a7d2f9c4e816` (`site`, `site_member`,
  `sheet_registration.kind` and the match lines, `earthwork_result.superseded_by_site_id`) and the
  routes under `…/project/{uuid}/site`: list, create, rename, delete, join a member (merge with
  `merge: true`), regions, remove a member (dissolve at one, re-base when the anchor leaves). F18's
  routes read survey links only (D-271). The site result routes come with Block E.
- [x] Block B (overnight 2026-10-06): "Match line" on the Earthwork row and "Join to another sheet at
  match line…" in the sheet's ⋮ (Q2), the Join panel (this sheet left, the other in Split view,
  the line clicked on each, the checks, Fit the scale too, Keep the other side), the merge
  question (Q3), the Sheets panel's site rows and "in site" chips (Q1), Remove from the site
  (Q13). Opening a site row's stitched canvas is Block C. D-271 5 to 7.
- [x] Block C1 (overnight 2026-10-06), the stitched view read-only: a site row opens it over the
  canvas; each member's fit image placed by its placement (a CSS matrix in feet), clipped to its
  visible region in its own page space (the clip turns with it), pan, wheel and button zoom,
  Fit, Rotate (the anchor's `view_rotation` first, Q7), a member's label opens its sheet.
- [x] Block A3 (overnight 2026-10-06), the rest of Block A's engine: `siteRuns` (every member's runs
  in the site frame, kept to its territory, a contour's pieces rejoined at the line, spots on the
  line kept once, the members' boundaries united into one) and `stitchTrace` (joins, "No partner
  across the match line", "Elevation differs across the match line (710 / 711)", one flag a pair),
  with the spec's rows: the plane over two joined halves equals the one-sheet answer; west cut
  and east fill export and import alone and net to neither line as a site; three contours
  joined, one mismatch, one unpartnered. The Superseded row waits for Block E.
- [x] Block E1 (overnight 2026-10-06), Calculate a site as a preview: Calculate in the site view runs
  one Calculate over the members' EG, FG and boundaries (`siteRuns`), one TIN per surface
  across the joins, and shows one cut, one fill and one balance with the project's assumptions.
  Not saved, no lines: Site Features and Strip Areas, the site result, the members' results
  marked Superseded (Q10) and the lines grouped under the site (Q14) are Block E2.
- [x] Block E2 (overnight 2026-10-06): "Save to estimate" in the site view keeps the site's result
  and writes its lines (on the anchor sheet, named "[site]: …"); the members' own results read
  "Superseded by Site X" and their own lines stay out of Estimating while the site's lines exist
  (Q10); "Remove result" gives them back; dissolving or a member leaving does too (D-271 9 to
  12). Still open: Site Features and Strip Areas across members, Q14's group in Estimating.
- [x] Block E3 (overnight 2026-10-06): the site's saved result goes stale when a member's drawing
  changes (checked while a member sheet is open, D-271 13).
- [x] Block C2 (overnight 2026-10-06), live renders: each member on screen is drawn by pdf.js over
  its fit image through the canvas's caches, the whole page up to 4,096 px and the window the
  screen shows above it, mapped back through the view's turn and the member's placement; a
  member off screen holds no raster. Snap, Snap PDF and Find Text across members belong with
  drawing in the site view (Block D).
- [x] Block D1 (overnight 2026-10-06): Linear, Area and Count drawn across the join in the site
  view into a chosen item, straight segments; a run split at the match lines, an area clipped to
  each member, a mark on the member it falls in, the pieces saved on the members' own sheets with
  one `site_shape` id (Q15); the members' shapes shown in the view, clipped to their sides.
- [x] Block D2a (overnight 2026-10-06): EG and FG contours (at a typed elevation) and the work
  boundary drawn across the join in the site view; contour pieces into their surface's container,
  the boundary replacing each member's own; the site Calculate reads them as one contour and one
  boundary (D-271 14, 15).
- [x] Block E4 (overnight 2026-10-06): Site Features and Strip Areas in a site's Calculate: each
  member's mapped into the site frame and kept to its territory, a feature across the join one
  feature (D-271 16); two quantity rows (a strip on each half strips the whole site; a feature
  across the join, its undercut, prep and a strip made from it on one member).
- [x] Block E5 (overnight 2026-10-06), Q14: the site's lines filed in a folder of its name
  (Estimating groups them under it; renamed with the site, dropped with its lines), each line's
  Takeoff Ref. the sheets it comes from (D-271 17).
- [ ] D2b (select, move, copy and delete a `site_shape` as one, the join point slide (Q9), undo as
  one step, arcs, Ortho, Snap and Snap PDF across members), then F's rest (Auto Trace on the stitched drawing, the C-200 acceptance row).

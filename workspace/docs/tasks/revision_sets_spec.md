# F21: Revisions of a drawing set, paired, carried over and compared

> **Draft spec, overnight 2026-10-11. Not adopted, nothing built.** Written from the founder's
> overnight brief. Its decision is logged as the next `D-NN` when the founder answers the
> questions at the end. The 🗓 row is in FEATURES.md (F21); on adoption, the F21 row on
> MANAGER.md and this file renamed `revision_sets_tasks.md`.
>
> Sources, read for this draft:
> - the sheet and load model as built: `drawing_sheet`, `drawing_file`, `sheet_calibration`,
>   `drawing_naming_template` (`app/features/drawing/models.py`), the Load (`drawing/load.py`,
>   D-308, D-310), the page pool and reads on load (D-321 to D-326), the Review flag on the row
>   (D-331);
> - takeoff as built: `takeoff_item` (home `sheet_id`), `takeoff_geometry` (its own `sheet_id`,
>   so an item can already span sheets), the sheet delete rule (`drawing/service.py`
>   `delete_sheets`, D-48), item history (`takeoff/history.py`, D-115), the item snapshot and
>   restore (`takeoff/snapshot.py`, D-73);
> - Overlay as built (D-195, D-239, D-297): `lib/takeoff/overlay/alignment.ts`, the matrix kept
>   on `sheet_registration.overlay` (old page points to new page points), `OverlayDialog.tsx`,
>   `OverlayBar.tsx`, `OverlaySubRows.tsx`;
> - the shape transforms that keep invariant 2 (`lib/takeoff/engine/{transform,selection}.ts`);
> - Estimating: `estimate_line_item` is one line per item, cascading with it (D-50); Needs
>   attention (D-127); the Excel export (`workbook.ts`).
>
> **Legacy has no such feature.** Its only revision notion is the retired trade-scope work's
> `addendum` change kind (`src/retired/`), which never touched sheets. Nothing to drive live;
> the Overlay steps reused here are legacy's (D-195).

## The problem

Bids move while they are being priced. The estimator receives an addendum (a handful of
changed sheets) or a full reissue (every sheet again, some changed). Today the only way in is
another Load, which makes new, empty sheets beside the old ones:
- **the takeoff stays on the old sheets.** Nothing says which new sheet replaces which, and
  the estimator redraws every measurement or leaves the estimate priced off superseded paper;
- **nothing says what changed.** Overlay can lay one sheet on another (D-195), one pair at a
  time, aligned by four clicks, and nothing ties its picture to a measurement;
- **the estimate has no memory.** A quantity that changed with the addendum looks like any
  other quantity; nobody can answer "what did Addendum 2 cost us".

**Problem → solution.** "Load a revision…" loads the new pages as a Load does (prepare, read
name and scale), pairs each new sheet with the current sheet it replaces by sheet number,
with the title as a check, and shows the pairing for review. Apply moves every measurement to
its new sheet through the pair's alignment (the Overlay matrix), keeps the old sheet read-only
as the previous revision, and flags each measurement whose drawing changed under it. Compare
is Overlay, already aligned, with a revision picker. Estimating follows the current revision;
every item records its old and new quantity, and "Revision changes" lists what moved.

## Goals and non-goals

**Goals**
1. One flow from the new file to a carried-over takeoff, reviewed, with nothing redrawn that
   did not change.
2. Pairing that is right without help for a well-numbered set, and fully correctable by hand.
3. Every carried measurement keeps its identity: its estimate line, pricing, cost components,
   assemblies, sub-items, folder and classification, comments and history follow it.
4. A "may have moved" flag a person can trust: concrete reasons, shown on the shape and on the
   sheet row, cleared one by one.
5. The old sheet kept exactly as it was, read-only, viewable and comparable.
6. A per-item change record and a per-revision report in Estimating.

**Non-goals (v1)**
- Moving a measurement to follow the change (re-snapping a moved wall). v1 flags; the person
  redraws or edits.
- More than one alignment per sheet (a plan and its details moving apart on one page). v1
  aligns the drawing's largest consensus and flags what sits outside it (Q15).
- Reading the title block's revision block or delta symbols as data (Q9 covers the label).
- Revisions of a single measurement outside a sheet revision (that is item history).
- A frozen or "submitted" estimate state. None exists today (Q8).

## Terms

- **Revision:** one act of loading new pages against the current set, numbered per project
  (Rev 1, Rev 2, …; the first Load is Rev 0), with a label the person types ("Addendum 2").
- **Lineage:** every revision of one sheet (A-101 Rev 0, Rev 1, Rev 2). One is **current**.
- **Pair:** an old current sheet and the new sheet that replaces it, with a kind and a
  confidence. A pair can also have only a new sheet (**new**) or only an old one (**not in this
  revision**).
- **Alignment:** the similarity (move, turn, uniform scale) from the old page to the new page,
  in page points: the Overlay matrix (`alignment.ts` `Matrix`).
- **Carry-over:** moving a pair's measurements, markups and links from the old sheet to the new
  one through its alignment.
- **Flag:** a carried shape's "may have moved", with its reasons.

## The flow

1. **Load a revision.** Two ways in:
   - the Sheets panel's + menu, "Load a revision…";
   - the load screen (D-310), a tick under the file list: "These pages revise sheets already in
     takeoff", with the label field ("Revision label", prefilled from the file name).
   Both open the load screen with the tick on. The person picks the file and its pages as on a
   Load (size preselection, D-310); one revision may span several files. The api makes the
   `drawing_revision` row and the new `drawing_sheet` rows (`is_current = false` until Apply),
   and the page pool prepares and reads them exactly as on Load (D-321 to D-326).
2. **Pairing review** (a full-height dialog, `lg`, opened at once with the load progress view's
   rows). Pairing runs as each new sheet's read lands; rows fill in live. See "The pairing
   screen".
3. **Alignment.** Each confident pair is aligned automatically on the server once both pages
   are prepared; a pair that cannot be aligned shows "Align by hand", which opens Overlay's
   step 3 (two points, nudges) in Split view on that pair.
4. **Apply.** "Carry takeoff to N sheets" runs the carry-over, pair by pair, in the worker,
   with a progress strip. Each pair is its own transaction. The new sheets become current, the
   old ones read-only revisions.
5. **Review flags.** Flagged sheets carry the red ⚠ Review on their row (D-331's place and
   look), with "Changed in Rev 2" among its reasons. Opening the sheet draws each flagged
   shape's outline amber with its reason on hover, and a strip under the toolbar: "7
   measurements may have moved · Next · Accept · Accept all on this sheet".
6. **Compare.** The sheet's ⋮ "Compare with an earlier revision…" or the row's revision chip
   opens Overlay in Comparative mode with the old sheet already aligned, and a revision picker
   in the Overlay bar.

## The pairing screen

One row per pair, grouped: **Needs a decision** first, then **Matched**, **New sheets**,
**Not in this revision**. Columns: old sheet (number – title, thumbnail), → , new sheet, kind,
confidence (High, Check, Low, as a word, not a percentage), what it found ("Title changed:
FIRST FLOOR PLAN → LEVEL 1 PLAN"), alignment state, and a carry tick.

- **Re-pair by hand:** each side is a picker ("Search sheets…", the same list Overlay uses),
  with "No earlier sheet (new)" and "Not replaced"; a thumbnail hover shows both pages side by
  side. A hand pair has confidence "Set by you" and is never changed by a later read.
- **Bulk:** "Accept all High" and the carry tick per row; Apply carries ticked rows only. A
  "Check" or "Low" row is unticked until the person ticks or re-pairs it.
- **Full reissue** (a switch at the top, off by default, Q1): unpaired old sheets become "Not
  in this revision" and are withdrawn on Apply; off, they stay current untouched (an addendum
  carries only its changed sheets).
- **Footer:** "Carry takeoff to N sheets" · "Save and close" (the revision stays open, one per
  project at a time, reopened from the Sheets panel's banner "Addendum 2 is not applied yet") ·
  "Discard revision" (deletes its new sheets, confirms with the count).

## Pairing algorithm (`drawing/revision_pair.py`, pure)

Runs on the server after each new sheet's read (`read_state` null) and again on any rename.
Inputs: the current sheets and the new sheets, each with `sheet_number`, `sheet_name`,
`width_pt`/`height_pt`, `name_source`, page order, and a 64-bit perceptual hash of the
thumbnail (computed by the page pool when it writes the thumbnail).

1. **Number key.** Uppercase; drop a trailing revision mark printed with the number (`REV 2`,
   `(R1)`, `-R3`, `Δ2`); drop spaces, dashes, underscores and dots between the discipline
   letters and the first digit (`A-101`, `A 101`, `A.101` → `A101`); keep dots between digits
   (`A1.01` stays `A1.01`, never `A101`); drop leading zeros of a digit group only when that
   leaves the group non-empty (`A-0101` → `A101`); keep a trailing letter (`A101A` ≠ `A101B`).
   An empty key (no number read) skips to step 5.
2. **Title score.** Both titles normalised (uppercase, words only, `&` → `AND`, common
   abbreviations expanded from a short list: FL/FLR → FLOOR, ELEV → ELEVATION, …), then the
   larger of token Jaccard and character-trigram similarity, 0 to 1.
3. **Look score.** 1 − Hamming(hash) / 64, a check only, never enough to pair alone.
4. **Candidates and confidence.**
   - **Same key, title ≥ 0.6:** kind `same`, **High**.
   - **Same key, title < 0.6:** `same`, **Check**, "Title changed: X → Y".
   - **Key absent from the old set, title ≥ 0.85 against exactly one old sheet whose own key is
     absent from the new set, look ≥ 0.7:** `renumbered`, **Check**, "Renumbered? A-101 →
     A-1.01".
   - **One old key, two or more new keys with that key plus a letter or part suffix** (`A101`
     → `A101A`, `A101B`; titles ending PART 1/2, EAST/WEST): `split`, **Check**, every new
     sheet in the group paired to the old one.
   - **Two new sheets with one key:** `duplicate`, **Needs a decision**: the higher title +
     look score is proposed, the other stays unpaired until chosen. Two current old sheets with
     one key: the same, from the other side.
   - **No candidate:** `new` (a new sheet) or `not_in_revision` (an old one).
5. **No number on either side** (scans unread, NTS sheets): pair within one page-size set by
   page order and look ≥ 0.8, **Low**, always for review.
6. **One to one** except `split`: a greedy pass by confidence, then score, takes the best pair
   first; a sheet used once is not offered again by the engine (the person can still pick it).

## Alignment (`drawing/revision_align.py`, pure, run in the page pool)

The matrix maps old page points to new page points, the same convention as Overlay's
(`alignment.ts`: source to target). It is stored on the pair's `sheet_registration` row
(`source` = old, `target` = new, `overlay` column, D-195), so Compare opens aligned and the
survey-link rules of D-195 hold.

1. **Text anchors** (sheets with a text layer). From both pages' text spans (PyMuPDF, as
   `reading.py` reads them): words of 3 or more characters, or grid bubbles, that occur exactly
   once on each page, outside the title block (the naming template's number and name boxes and
   its `constants`, D-323, grown to the title block's edge). Matched by string, a RANSAC over
   two-pair hypotheses (`similarityFromPairs`'s Python twin), inliers within 2 pt.
   **Accepted** with at least 6 inliers and an RMS residual under 1 pt; method `text`.
2. **Identity** when the pages are the same size and step 1 found too few anchors but the old
   strokes overlay the new within 2 pt for at least 70 % of their length (the grid index
   `reading.py` already builds); method `identity`.
3. **Otherwise** "Align by hand" (Overlay's two-point step and nudges, D-195); method `manual`.
   A scan (no text layer) is identity when same-sized and its raster overlap passes, else by
   hand (Q12).
4. **A second consensus.** When the RANSAC's second-best cluster (outside the first's inliers)
   holds at least 6 anchors on a different transform, the pair is marked "Part of this sheet
   moved separately", and every shape inside that cluster's hull is flagged (non-goal: two
   alignments).
5. **Scale check.** With `s` the matrix's scale and both sheets scaled, real feet are preserved
   when `new feet_per_pt × s = old feet_per_pt`. A difference over 0.5 % flags the pair: "The
   new sheet's scale disagrees with the alignment by 2.1 %". The new sheet's own scale is what
   measures; nothing is rewritten to hide the disagreement.

## Carry-over

One Celery task per revision (`carry_revision`), one transaction per pair, under a Redis lease
as the page pool's (D-326). While a pair carries, its old sheet refuses edits ("Addendum 2 is
being applied; this sheet is read-only for a moment"), so no colleague's write is lost between
the snapshot and the move.

**Per pair, in order:**
1. **Snapshot** every row the old sheet holds or anchors (its geometries, the items whose home
   it is, their dimensions, sub-items and sub-item shapes, markups, calibration, registrations,
   site membership), as `snapshot.py` does it (`row_to_json`), into `drawing_revision_archive`.
   The archive is what the old revision shows and what Roll back restores.
2. **Move the geometries.** Each `takeoff_geometry` on the old sheet keeps its id and uuid; its
   `sheet_id` becomes the new sheet's, and `vertices_json` and `shape_meta` are transformed
   **together** (invariant 2): norm → old page points → matrix → new page points → norm.
   `shape_meta`'s centres, corners and inline arcs move as `transform.ts` moves them; radii
   scale by `s` and are recomputed in the new page's fractions; angles turn by the matrix's
   turn (as `selection.ts` `turnArc` does). Arcs stay arcs: a similarity keeps a circle a
   circle (D-275). `geometry_version` + 1.
   - **Deducts follow their section** (D-39 Q2): a subtract shape goes to its owner's new
     sheet. Pairing is not quantity: the clip is recomputed from whatever positives sit on the
     new sheet.
   - **Split pairs:** each shape goes to the new sheet whose drawing area holds its centroid
     after that sheet's own alignment; a shape across the split is placed with its larger part
     and flagged "Crosses the split"; one in neither is left on the old sheet, flagged "Not on
     any new sheet", and its item is listed in the report.
3. **Count items.** Marks move like any point. The item's `count_symbol`, sizes and mode are
   never touched, so one sentinel species per count item holds (invariant 1). An Auto Count item
   is a count item like any other: each mark is checked by the change detection; Auto Count
   leaves no sample on the item today, so a rescan of the new sheet is the person's (Q14).
4. **Items.** An item whose home is the old sheet takes the new sheet as home (the
   `delete_sheets` rule). Its quantity is recomputed by the api's engine (`compute_item`), from
   the new sheet's scale: analytic, never sampled. Earthwork lines (`EARTHWORK_COMPUTED`) move
   home and go stale; Calculate is never run for the person (D-272's stale rule).
5. **Scale.** The new sheet keeps what its read found (D-321 to D-326). When it found no scale
   (or only unapplied boxes), the old sheet had one, and the scale check passes: the old
   calibration is carried, its points through the matrix, `feet_per_pt` divided by `s`,
   `verify_method = "revision"`, evidence "Carried from Rev 1", and the row shows the scale as
   applied, not verified (Q10). A carried scale never replaces one the read verified.
6. **Markups** (`sheet_markup`) move through the matrix, unflagged. **Snippets** stay with the
   old sheet (they are pictures of it). **Bookmarks** and `view_rotation` copy across when the
   matrix's turn is under 1°.
7. **Links.** `sheet_registration` rows naming the old sheet (survey links, joins, overlays laid
   by someone) are re-pointed to the new sheet, their matrix composed with the alignment, their
   EG result and any site result marked stale; `site_member` follows the sheet. Nothing is
   recalculated. (On the bench, never on Hidden Valley Spec's earthwork sheets: D-232.)
8. **Old sheet:** `is_current = false`, `superseded_by_sheet_id` set; it leaves the Sheets
   panel's tree and lives under its successor's history. Its file stays undeletable while a
   revision uses it (the existing file rule).
9. **Record** a `revision_item_change` row per touched item (old and new effective quantity,
   unit, sheets, kind), an item history event `revision_carried`, and queue change detection.

**Not carried:** unticked pairs (the old sheet stays current, the new one is left as a new,
unpaired sheet), and `not_in_revision` sheets, which stay current in an addendum and, in a full
reissue, are withdrawn: read-only, their items kept, listed in the report as "On a withdrawn
sheet" and flagged on the item in Estimating. A withdrawn sheet's measurements are never
deleted for the person.

## "May have moved": change detection (`drawing/revision_diff.py`, pure)

Runs in the page pool per carried pair, after the move, as its own task on the `reads` queue.

- **Footprint** of each carried shape, in new page points: a linear run's band (±6 pt), an
  area's outline band (±6 pt) plus a 24 pt grid of interior samples, a count mark's symbol box
  grown by a fifth.
- **Vector sheets.** Both pages' strokes (`get_cdrawings`, as the reader takes them), the old
  ones through the matrix, into the grid index. In each footprint: old ink length, new ink
  length, and the length of each within 2 pt of the other's. **Change** = 1 − matched ÷ the
  larger ink. Flagged at **0.15** or more (a call, tuned on the bench, Q5). Reasons are named:
  "Linework changed under this measurement (34 %)", "Nothing drawn here any more".
- **Text in the footprint.** A dimension or tag string inside it that changed or vanished
  ("12'-0"" → "14'-6"", "D3 → D4"): flagged at any change, reason "Dimension changed".
- **Revision clouds.** On the new page, a closed run of eight or more consecutive curve
  segments of similar radius is a cloud; any carried shape meeting a cloud's hull is flagged
  "Inside a revision cloud", whatever its ink score.
- **Scans.** The fit WebPs, the old warped through the matrix, both binarised (Otsu), dilated
  2 px, XOR inside the footprint; flagged at the same 0.15, reason worded "Image changed under
  this measurement", marked as an image comparison.
- **Count marks:** a mark whose symbol box lost its ink is "Symbol gone here"; new ink matching
  nothing nearby is not reported (that is a new fixture to count, the person's Auto Count).
- **Sheet total:** the share of ink changed over the whole page, shown on the pairing row
  ("18 % of the drawing changed") once known.

A flag is cleared by **Accept** (kept as carried), by editing the shape (any geometry write
clears its flag), or by deleting it. `revision_geometry_flag` keeps the reasons; the item's row
in the Takeoff panel shows the ⚠ while any of its shapes is flagged.

## Revision storage and history

- A sheet's lineage is `lineage_uuid` (every revision of A-101 shares it; set to the sheet's
  own uuid on migration). Exactly one sheet per lineage has `is_current = true`.
- **Every list the takeoff draws from reads current sheets only**: the Sheets panel, Overlay's
  page list (except the revision picker), Auto Count's "the set", Find across the set, the
  sheet items list, exports, naming templates' reads, Scale All. An old revision is reached
  only through its lineage.
- **The row's revision chip** ("Rev 2", neutral like the scale chip, D-331) opens the history:
  each revision with label, date, who applied it and its counts; Open (read-only), Compare.
- **An old revision opens read-only:** a banner, "A-101, Rev 1 (Addendum 1), superseded
  2026-10-12 by Rev 2. Read-only." with Open current and Compare. Its takeoff is drawn from the
  archive in the canvas's view-only mode (F16's lapse view), every tool disabled. The api
  refuses any write on a non-current sheet with that sentence.
- **Deleting a current sheet** deletes its earlier revisions with it, named in the confirm
  ("and its 2 earlier revisions"). Deleting a project purges them with it (F4's purge).

## Compare

Overlay, unchanged in its picture (D-195: Standard or Comparative, colours, opacity), with:
- **already aligned:** the revision's matrix is the overlay's; no four clicks;
- **a revision picker** in the Overlay bar, "Compare with: Rev 0 · Rev 1", listing the
  lineage's older sheets only; switching swaps the overlay sheet and its matrix;
- **flags drawn over it** when "Show changes" is on (default on in Comparative): the amber
  outlines of flagged shapes, so the person sees the change and the measurement together;
- the overlay saved as any overlay (a sub-row under the base sheet, D-239), removable.

## Reads on the new sheets

Exactly as on Load: the page pool prepares and reads name and scale (D-321 to D-326), the first
ticked first, the AI only for scans, charged to the loader (D-321 2), flags on the row (D-331).
Two additions:
- **The naming template is inherited** *(call)*: when a new sheet's page size matches the old
  set's, the old set's template is copied to the new set as its first try; a sheet it reads
  nothing valid for is read on its own (D-323's rule). This keeps the numbers, and so the
  pairing, consistent across revisions.
- **Pairing waits on the number.** The pairing row shows "Reading sheet number…" until the read
  lands; a failed read leaves the row Low and pickable by hand.

## Estimating

- **Quantities follow the current revision** with no new arithmetic: a carried item keeps its
  estimate line (one line per item, D-50), so its rates, components, packages and sub-items
  stay, and its quantity is the recomputed one.
- **The change record:** `revision_item_change`, one row per item per revision: old and new
  effective quantity and unit, old and new sheet, kind (`unchanged`, `changed`, `flagged`,
  `withdrawn`, `not_carried`), and its flag state. The item history (D-115) gains
  `revision_carried` with before `{quantity, sheet}` and after `{quantity, sheet, revision}`.
- **In the grid:** Needs attention (D-127) gains "Changed in the latest revision" and "Flagged
  by a revision" as reasons; a "Δ Rev" column (hidden by default, in the Format panel) shows
  the quantity change.
- **"Revision changes"** joins the Reports list (F9c): pick a revision; per item, sheet, item,
  old → new quantity, Δ, unit, Δ cost at today's rates (computed by `lib/estimate/`, as every
  cost is), flag state; totals by classification or folder (the panel's current view, D-336).
  The Excel export gains a "Revision changes" sheet for the revision picked.
- **Before Apply** *(Q8)*: a tick "Save the estimate as it stands to Project files", on by
  default, builds the export as the Export button does and files it as "Estimate before
  Addendum 2.xlsx".
- **Review state** *(Q6)*: an item whose quantity changed or that is flagged goes back to
  `unreviewed` from `reviewed` or `approved`, recorded in its history. A locked item (`is_locked`)
  is carried with its lock kept, and flagged "Locked, carried by Addendum 2" (Q7).

## Permissions, audit, realtime, undo

- **Load a revision, Apply, Roll back:** `canUploadDocuments` and `canEditTakeoff`, on a plan
  that edits takeoff (Q13). **View old revisions and Compare:** anyone who can view the project.
- **Trial caps** (D-282): carried items are not new items and count nothing; the new pages
  count against storage at upload, as any Load.
- **Audit** (`audit_log`, in the act's transaction): `revision.created`, `revision.applied`
  (pairs, items carried, flags), `revision.rolled_back`, `revision.discarded`.
- **Realtime:** `drawing.revision.changed` (state, pairs) to every open tab of the project; the
  existing `drawing.sheet.changed` and item events, batched as Load's are (D-321 6). A colleague
  on an old sheet that gets carried sees the read-only banner and "Open current".
- **One open revision per project** at a time; a second "Load a revision…" opens the open one.
- **Undo:** a revision is not on the canvas's undo stack. **Roll back** (revision history, while
  it is the latest revision of those sheets) restores each pair's archive (the rows under their
  own ids, as `snapshot.py` restores), makes the old sheets current again and the new ones
  unpaired. Shapes drawn or edited on the new sheets since Apply are listed in its confirm and
  lost (Q17). Roll back of one pair is the same, per row.

## Data model sketch (one migration, additive)

```text
drawing_revision                      -- one act of loading a revision
  id, uuid, workspace_id, project_id (FK CASCADE), created_at, updated_at
  number         int  not null        -- per project; unique (project_id, number); first Load = 0, implicit
  label          varchar(120) not null
  issued_on      date null
  full_reissue   bool not null default false
  state          varchar(16) not null -- open | carrying | applied | rolled_back | discarded
  created_by_id, applied_by_id (FK user SET NULL), applied_at timestamptz null
  counts         jsonb not null default '{}'  -- pairs, carried, flagged, withdrawn
  partial unique index: one row per project with state in (open, carrying)

drawing_sheet  (+ columns)
  lineage_uuid            uuid not null          -- backfill: = uuid; index (project_id, lineage_uuid)
  is_current              bool not null default true; index (project_id, is_current)
  revision_id             FK drawing_revision SET NULL   -- null = Rev 0
  superseded_by_sheet_id  FK drawing_sheet SET NULL
  withdrawn_in_revision_id FK drawing_revision SET NULL
  look_hash               bigint null            -- thumbnail perceptual hash, written by the pool
  partial unique index: (lineage_uuid) where is_current

drawing_revision_pair
  id, uuid, workspace_id, revision_id (FK CASCADE)
  old_sheet_id   FK drawing_sheet SET NULL null
  new_sheet_id   FK drawing_sheet CASCADE null
  kind           varchar(16)  -- same | renumbered | split | duplicate | new | not_in_revision
  confidence     varchar(8)   -- high | check | low | user
  scores         jsonb        -- number key both sides, title, look, notes ("Title changed …")
  registration_id FK sheet_registration SET NULL   -- the alignment (overlay matrix) lives there
  align_method   varchar(8) null  -- text | identity | manual
  align_quality  jsonb null       -- inliers, rms_pt, second_cluster, scale_check_pct
  carry          bool not null default false
  state          varchar(12)  -- proposed | aligned | carried | rolled_back | skipped
  ink_changed_pct numeric(6,3) null

drawing_revision_archive              -- the old sheet exactly as it was, per pair
  id, workspace_id, pair_id (FK CASCADE), old_sheet_id
  rows           jsonb not null       -- {table: [row_to_json …]} as snapshot.py's
  created_at

revision_geometry_flag
  id, workspace_id, pair_id (FK CASCADE), geometry_id (FK takeoff_geometry CASCADE)
  score numeric(6,4) null, reasons jsonb not null, method varchar(8)  -- vector | text | cloud | image
  state varchar(10) -- open | accepted | cleared ; resolved_by_id, resolved_at

revision_item_change
  id, workspace_id, revision_id (FK CASCADE), item_uuid uuid not null
  item_id FK takeoff_item SET NULL, old_sheet_id, new_sheet_id (FK SET NULL)
  old_qty numeric(20,6), new_qty numeric(20,6), unit varchar(16)
  kind varchar(12)  -- unchanged | changed | flagged | withdrawn | not_carried
  unique (revision_id, item_uuid)

sheet_calibration.verify_method  gains the value "revision" (no schema change)
takeoff_item_event.action        gains "revision_carried", "revision_rolled_back"
```

**How existing rows map:** every sheet gets `lineage_uuid = uuid`, `is_current = true`,
`revision_id = null`; no geometry, item or estimate row is touched. Downgrade drops the tables
and columns; it is refused while any revision is applied (it would leave two current sheets
per lineage). **Migration check:** on a throwaway copy of a real project, every item's
calculated and effective quantity before and after the upgrade, identical (as D-336's).

## api sketch (`app/features/drawing/revision_routes.py`, prefix `…/project/{uuid}/drawing`)

- `POST /revision` `{label, issued_on, full_reissue}` → the open revision (or the existing open
  one, 200).
- `POST /load` gains `revision_uuid`: the pages load as the revision's, `is_current = false`.
- `GET /revision/{uuid}` → the revision, its pairs with scores, alignment and read state.
- `PATCH /revision/{uuid}` → label, issued_on, full_reissue.
- `PUT /revision/{uuid}/pair` `{old_sheet_uuid | null, new_sheet_uuid | null}` → a hand pair
  (confidence `user`); `PATCH /revision/{uuid}/pair/{pair}` `{carry}`.
- `PUT /revision/{uuid}/pair/{pair}/alignment` `{matrix, pairs}` → a hand alignment (written to
  the pair's `sheet_registration.overlay`, as Overlay's PUT).
- `POST /revision/{uuid}/apply` → 202, the carry task; progress by `drawing.revision.changed`.
- `POST /revision/{uuid}/rollback` (whole) and `…/pair/{pair}/rollback`; both 409 when a later
  revision covers the sheet, with the reason.
- `DELETE /revision/{uuid}` → discard an open revision and its new sheets.
- `GET /sheet/{uuid}/revisions` → the lineage; `GET /sheet/{uuid}/archive` → an old revision's
  takeoff, shaped like the live sheet items list, read-only.
- `POST /revision/flag/{flag}/accept`, `POST /sheet/{uuid}/flags/accept` (all on a sheet).
- `GET /revision/{uuid}/changes` → `revision_item_change` rows for the report.
- `GET /sheet?revisions=all` for the revision picker; the default stays current only.

## Engine (pure, hard rule 2)

- **App:** `lib/takeoff/engine/transform.ts` gains `similarityShape(vertices, meta, matrix,
  fromPage, toPage)`, vertices and every `shape_meta` parameter together, for the preview of a
  hand alignment; `lib/takeoff/revision/pairKey.ts` (the number key, for the screen's search
  and hand-pair hints). No network, no React.
- **api:** `takeoff/transform.py`, the twin of `similarityShape` (it does the carry);
  `drawing/revision_pair.py`, `drawing/revision_align.py`, `drawing/revision_diff.py`, data in
  and data out, called by the routes and the page pool.

## Quantity-table rows (hand-worked, added to `quantity-table.sh`)

- A 100 × 50 ft rectangle on a 1/8" sheet carried with `s = 2`, no turn, to a 1/4" sheet:
  5,000 SF both engines, to 1e-9.
- The same carried with a 90° turn and a move: 5,000 SF; its 300 LF outline 300 LF.
- An arc of radius 20 ft, 90° sweep, carried by `s = 0.5` to a sheet at half the feet per
  point: 31.4159 LF before and after.
- An area with a deduct carried together: net area unchanged; the deduct on its section's sheet.
- A count item of 12 marks carried: 12 EA, symbol unchanged.
- A 1 % scale disagreement: the quantity follows the new sheet's scale (+2.01 % on an area) and
  the pair carries the scale-check flag.

## UI states

| State | Pairing screen | Old revision view | Revision changes report |
|---|---|---|---|
| Loading | rows Queued / Preparing / Reading sheet number (the load view's stages, D-321 5); Apply disabled with "Waiting for N sheets to be read" | the archive loading under the banner | "Gathering changes…" in the report frame |
| Carrying | a strip "Carrying 12 of 40 sheets"; Close keeps it running (tray) | — | — |
| Empty | no current sheets: "This project has no sheets yet. Use Load instead." with Load | — | "No revisions yet." / "Nothing changed in this revision." |
| Error | a failed page: Failed with its reason and Retry (as Load); a failed pair carry: its row says why, the rest carry, Retry on the row | "This revision could not be opened" with Try again | the error line with Try again |
| Unauthorized | the + menu entry and the load-screen tick hidden without the capabilities; a direct call 403 with "Loading a revision needs takeoff editing." | always viewable by project viewers | as Estimating's own rule |
| Conflict | an open revision by someone else: "Addendum 2 is open (Sara W.). Open it" | — | — |

## Risks

- **A list query that misses `is_current`** shows an old sheet twice or measures it. Mitigation:
  one `current_sheets()` filter in `drawing/service.py` used everywhere, a grep of every
  `DrawingSheet` select in Block D, and the archive (not live rows) behind old revisions, so a
  missed list shows a sheet with no takeoff rather than doubling quantities.
- **A wrong alignment moves every measurement.** Mitigation: the acceptance thresholds, the
  scale check, the sheet-level ink change on the pairing row, "Align by hand", and Roll back.
- **Flag noise** (a re-plotted set with new line weights flags everything). Mitigation: ink
  measured by length within a tolerance, not pixel identity; the threshold tuned on real
  addenda on the bench (Q5); "Accept all on this sheet".
- **Big sets:** 100+ sheets with thousands of shapes. Per-pair transactions in the worker; the
  diff in the page pool's cap (D-326 8).
- **Earthwork links** re-pointed through a composed matrix: stale, never recomputed. Hidden
  Valley Spec's earthwork is never used in a smoke (D-232).
- **Storage:** every revision keeps its pages. Counted against the plan's storage as any file.

## Blocks

Each block passes the gates, the quantity table and one Playwright MCP smoke on a throwaway
account (hard rule 8), on a revised copy of a real set made by hand (a moved viewport, a
changed dimension, a cloud, a renumbered sheet).

| Block | What ships | Estimate |
|---|---|---|
| **A. Data and pairing** | the migration, `revision_pair.py`, the look hash in the page pool, `POST/GET/PATCH /revision`, `/load`'s `revision_uuid`, hand pairs; `current_sheets()` used by every sheet list | 1.5 days (12 h) |
| **B. Load a revision and the pairing screen** | the + menu entry and the load-screen tick, the pairing dialog with its groups, pickers, ticks, full reissue, save and discard, live rows; all its UI states | 2 days (16 h) |
| **C. Alignment** | `revision_align.py` (text anchors, identity, second cluster, scale check) in the page pool; the matrix on `sheet_registration`; "Align by hand" through Overlay's step 3 | 1.5 days (12 h) |
| **D. Carry-over** | `transform.py` and `similarityShape`, the carry task (archive, geometries, deducts, splits, counts, items, scale, markups, links, old sheet read-only), the quantity-table rows, the read-only refusals | 3 days (24 h) |
| **E. Change detection and flags** | `revision_diff.py` (vector, text, clouds, scans), flags on the row (D-331), amber outlines and the flag strip, Accept, the item ⚠ | 2.5 days (20 h) |
| **F. History and Compare** | the revision chip and history, the old revision read-only from the archive, Overlay's revision picker, "Show changes" | 1.5 days (12 h) |
| **G. Estimating** | `revision_item_change`, history events, review state reset, Needs attention reasons, the Δ Rev column, the Revision changes report and Excel sheet, the save-before-apply export | 1.5 days (12 h) |
| **H. Roll back, audit, realtime** | whole and per-pair Roll back, audit rows, `drawing.revision.changed`, the banners for colleagues, the one-open-revision rule; legacy comparison of the Overlay parts at the end | 1.5 days (12 h) |

**Total about 15 working days (120 h).** A first useful cut is **A + B + C + D** (8.5 days):
pairing, alignment and carry-over with the old sheet kept, no flags yet; E is what makes it
safe to trust and should follow at once.

## Open questions for the founder (each with a recommended default)

1. **Addendum or full reissue by default?** An addendum carries only changed sheets, so an
   unpaired old sheet must not be withdrawn. **Default:** addendum; "Full reissue" is a switch
   on the pairing screen.
2. **Which pairs carry on Apply?** **Default:** High pairs ticked, Check and Low unticked until
   the person ticks or re-pairs them.
3. **Move the measurements or copy them?** Moving keeps each item's estimate line, pricing,
   history and links; copying would make new items and new lines. **Default:** move, with the
   old sheet's takeoff kept in its archive.
4. **How long are old revisions kept?** **Default:** for the life of the project, read-only,
   counted in storage; deleted with their current sheet or the project.
5. **Flag sensitivity.** **Default:** a fixed 15 % ink change under a measurement, any changed
   dimension text, anything in a revision cloud; tuned on the first real addenda; no slider in
   v1.
6. **Reviewed or approved items whose quantity changed or that are flagged.** **Default:** back
   to unreviewed, recorded in the item's history.
7. **Locked items** (`is_locked`). **Default:** carried, lock kept, flagged "Locked, carried by
   Addendum 2", so the lock holder reviews it.
8. **A frozen estimate.** No submitted or locked estimate exists today. Should a revision wait
   for one? **Default:** no new state; "Save the estimate as it stands to Project files" on
   Apply, ticked by default, plus the Revision changes report.
9. **The revision label.** **Default:** typed by the person, prefilled from the file name;
   reading each sheet's own revision block is later.
10. **Carry the old scale onto an unscaled new sheet?** **Default:** yes, when the alignment
    scale check passes, shown as applied (not verified) with "Carried from Rev 1"; never over a
    scale the read verified.
11. **Where an unpaired new sheet goes in the Sheets panel.** **Default:** beside its discipline
    neighbours, in the folder where most of the revision's paired sheets sit; else the file's
    own folder (D-308).
12. **Scans.** **Default:** identity for same-sized scans when the raster overlap passes, else
    align by hand; automatic image alignment on the server later.
13. **Plans.** **Default:** loading and applying a revision on Professional and trials;
    viewing old revisions and Compare on every plan that can open the project.
14. **Auto Count items.** **Default:** flag mark by mark in v1; keep the Auto Count sample on
    the item later so a revision can offer a rescan of the new sheet.
15. **Parts of a sheet that move separately** (a plan and its details). **Default:** v1 flags
    every measurement in the part that moved differently; a second alignment per sheet later.
16. **AI credits for scanned revision pages.** **Default:** as on Load, charged to the person
    who loads (D-321 2), with the footer's "Uses AI credits".
17. **Roll back after edits.** **Default:** allowed while it is the latest revision of those
    sheets; work done on the new sheets since Apply is listed in the confirm and lost.
18. **Earthwork on a revised sheet.** **Default:** contours, spots and boundaries carry as
    shapes; survey links, joins and results are re-pointed and marked stale; Calculate is the
    person's.

## Progress

- [x] Draft written 2026-10-11 (overnight) from the founder's brief.
- [ ] The founder's answers, logged as the next `D-NN`; the spec adopted.
- [ ] Blocks A to H.

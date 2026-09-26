# F7: Canvas tools and interactions (DRAFT)

> **DRAFT, not adopted.** Written 2026-09-26 by a side session while the main session
> worked on F5. It is not on the board: `MANAGER.md`, `FEATURES.md` and `DECISIONS.md`
> are unchanged. The main session adopts it by moving it to
> `docs/tasks/canvas_tools_tasks.md`, logging the answers to the questions at the end as
> the next `D-NN`, and moving the F7 row to In Progress when F5 and F6 allow.

_Spec for the `MANAGER.md` F7 row (backlog P-06). Ports every measure tool and every
canvas interaction: the draw modes, finishing and cancelling, inline arcs, snap and
ortho, selection, vertex editing, box select, copy and move, deducts, auto-merge,
Resume and Extend, undo and redo, the keyboard and mouse bindings, hover, the context
menus and the action bar. Makes Count add to the selected item (overnight finding 2),
adds the missing deducts (finding 4), draws colleagues' cursors (**D-33**), and carries
the collaboration mode onto every new write (**D-32**)._

**Board:** [../../../MANAGER.md](../../../MANAGER.md) · **Rules of engagement:**
[../../../DECISIONS.md](../../../DECISIONS.md) (D-06, D-13, D-20, D-21, D-26, D-32, D-33,
D-34, D-35, D-36) · **Parity:** [../../PARITY.md](../../PARITY.md) §9 (the measure tools,
undo, markups toggle, toolbar overflow), §10 (all but the collaboration lines F8 ticked),
§23 (every binding), §24 (the Mouse, Cursor, Snapping, Takeoffs and Hover settings) ·
**Sits on:** [takeoff_shell_tasks.md](../takeoff_shell_tasks.md) (F5: the pdf.js canvas,
the sheets panel, calibration), [item_model_tasks.md](../item_model_tasks.md) (F6: the
New Measurement dialog, the item tree, layers) · **Inherited from:**
[realtime_tasks.md](../../archive/realtime_tasks.md) (cursors, drafts, the modes)

_Written from legacy `intelcost/` at `12dd119b`, and from the new repos as they stand on
2026-09-26. **Status: draft; nine questions for the founder at the end.**_

---

## The problem

Today's canvas can do five things: select, pan, calibrate, and draw a point-to-point
Linear, Area or Count shape (`features/takeoff/components/SheetCanvas.tsx:30`). It has:

- no Escape, Enter, Delete, Backspace or tool keys, and no way to cancel a draft other
  than switching tool;
- no undo, and every delete says "This cannot be undone" (`ProjectTakeoff.tsx:341`);
- no snap, no ortho, no rectangle, ellipse, arc or segment mode;
- no box select, no copy, no move, no deducts. There is no deduct column in the model at
  all;
- vertex editing that moves an existing point only, reached only from the menu's "Edit
  vertices";
- no hover panel, no canvas menu on empty sheet space, and no action bar;
- a Count tool that makes a new item on every click. Three quick clicks made three items
  all named "Count 11" (PARITY §9, finding 2);
- colleagues' cursors received and never drawn (`use-drafts.ts` returns them; nothing
  renders them).

The hit-test helpers exist (`lib/takeoff/engine/geometry.ts`: `hitPolyline`,
`hitPolygon`, `pickVertex`) and nothing calls them. The page reads no capabilities: a
viewer gets enabled tools and a 403 on write.

Legacy does all of this, in about 25,000 lines spread over `ProjectTakeoff.tsx`,
`PdfCanvas.tsx` and `lib/takeoff/engine/`. What follows is what it does, and then how the
new stack carries it.

### What legacy does

**Terms.** Legacy keeps **one geometry row per (item, sheet)**. `vertices_json` is a flat
array of runs separated by a non-finite sentinel (persisted `{x:null, y:null}`), and
`shape_meta` is a parallel array, one entry per run. A **run** is one sub-array. A
**section** is a positive run. A **deduct** is a run whose meta says
`role: "subtract"`, paired to its section by `owner_id`
(`engine/deductPairing.ts`, `transformRuns.ts:10`, `useTakeoff.ts:66-86`).

**Tools and keys** (`engine/shortcuts.ts`, `Toolbar.tsx`, `engine.ts:36-41`):
- V Select, H Pan, L Linear, A Area, N Count, S Snapshot; D Dimension from the toolbar.
  Segment has a toolbar button and no key. Keys are case-insensitive.
- While Linear or Area is armed, S, D and O toggle Snap, Snap PDF and Ortho instead, and A
  arms an inline arc. A falls back to the Area tool when there is no draft point to arc
  from.
- Keys are ignored in an input, a textarea or a `contentEditable`. Alt is reserved for
  ortho fine-tuning. Ctrl/Cmd chords return nothing except Ctrl+F.

**Draw modes** (`drawModes.tsx`, `engine.ts:2185-2415`):

| Tool | Mode | Clicks | Stored as |
|---|---|---|---|
| Linear | Point to Point | click, click…, Enter or double-click | polyline |
| Linear | Rectangle | two opposite corners | 4 corners plus the start again; `{kind:"rectangle", corners}`; measures perimeter |
| Linear | Ellipse / Circle | two, the bounding box | 64 samples, closed; `{kind:"ellipse", cx, cy, rx, ry, circle}`; analytic perimeter |
| Linear | Arc | three: start, through, end | 48 samples; `{kind:"arc", cx, cy, r, a0, sweep}`; analytic length; collinear falls back to a 3-point polyline |
| Area | Point to Point | click…, Enter or double-click | polygon |
| Area | Rectangle | two opposite corners | 4 corners |
| Area | Ellipse / Circle | two, the bounding box | analytic area πab |
| Segment | (fixed) | two per segment | a 2-point Linear run, auto-committed; the next segment starts at once |

- **Press and drag** places a rectangle, or an ellipse in Ellipse mode, in one gesture,
  once the pointer moves 5 px (`BOX_DRAG_PX`, `engine.ts:381`). Ortho is suppressed during
  the drag. Never in Arc mode.
- The mode dropdown on the Linear and Area buttons, and "Mode ▾" in the action group, read
  one list, so they cannot drift. Each mode carries a hint ("Two clicks — opposite
  corners; measures perimeter").
- Changing mode or tool clears the draft (`engine.ts:1646-1668`).
- An unscaled sheet refuses Linear, Area and Segment with the calibration prompt, then
  re-arms the tool after calibration.

**Finishing and cancelling** (`engine.ts:1746-1803`, PT:5840-5880, 6216-6240):
- Enter and double-click finish (at least 2 points for Linear, 3 for Area). Double-click
  does nothing in Rectangle, Ellipse and Arc modes.
- **Escape is two-stage.** The first press steps back: an armed inline arc, then a press
  and drag, then any active draw, which is committed if it has enough points and dropped
  if not. The tool stays armed. The second press, with nothing in progress, returns to
  Select.
- **Backspace** unwinds the inline arc first, then the last point. In a count session it
  removes the last marker. With nothing in progress it undoes.
- **Right-click while drawing** opens "New Section", "Stop", "Discard" (Discard red,
  ruled off). Escape closes only that menu and keeps the draft.
- **Stop** commits and returns to Select; **Discard** drops everything and returns to
  Select; **New Section** commits this run and keeps marking the same item; **Close**
  (Area) closes the ring and commits, needing 3 or more points.

**Inline arc** (`engine.ts:2000-2008`, `2311-2339`, `shapes.ts:161-182`): A mid-draw arms
it (Linear or Area, Point to Point, at least one point); two more clicks, through and end,
from the last point. The arc is fitted through three points, taking the long way round
when the middle click is not on the short arc. It is stored as **120 samples** in the run,
with `arcSpans: [{i0, iMid, i1}]` in the meta as a handle hint. **Its quantity is the
sampled polyline or polygon, not analytic** (`quantityService.ts:163-164`), unlike the
standalone Arc mode. See Q5.

**Snap and ortho** (`engine.ts:599-883`, `DrawModifiersOverlay.tsx`):
- **Snap** catches your own measurements: every vertex and edge on the sheet, the draft
  itself, dimension ends and the calibration point. **Snap PDF** catches lines printed on
  the sheet (corners, line ends, crossings) from the PDF's vector data. The two are
  independent.
- Tolerance 12 screen px. Priority: vertex, then midpoint, then intersection, then the
  nearest point on an edge. At each rank your own markup beats the PDF's.
- **Ortho** locks the angle from the last point to 45° steps, 22.5° while Alt is held.
  Ortho applies first, so a snap can override it.
- Defaults: Snap on, Snap PDF off, Ortho on (`settings/index.ts:380`).
- The canvas bar shows "Ortho: On", "Snap: Off", "Snap PDF: On" (a spinner while the
  linework loads), "Auto Merge: On", "Auto Scroll: On", each a labelled toggle with a
  title naming its key.

**Selection** (`engine.ts:1361-1371`, `2792-2852`, `boxSelect.ts`, PT:9434-9463):
- A selection is an item plus, for Linear and Area, one run. A count selects its item.
- Hit tolerance 0.008 of the page for a line. An area hits on its interior or perimeter;
  positives are tested before deducts. A count hits anywhere on its drawn symbol, at least
  14 px each way.
- The first click selects the section; a second click inside a hole selects that deduct;
  further clicks step through the other holes there and wrap back to the section.
- **Box select** is a window, never a crossing: it takes what it encloses, not what it
  grazes. It is a Select-tool left-drag on empty sheet past 25 px. If nothing is enclosed,
  the drag opens the region menu instead. **Ctrl+A** selects every markup on the sheet
  (not while drawing or deducting). A left-click off any markup clears the box selection.
  While a box selection is live it owns every right-click. Arrow keys nudge it by 0.001
  of the page, 0.01 with Shift.
- Selecting on the sheet highlights the row in the panel, opening its folder and
  scrolling it into view; selecting a row selects on the sheet, opening the item's first
  sheet if it is not on this one.

**Vertex editing** (`engine.ts:1922-2160`, `shapes.ts`, PT:9973-10013, 14165-14272):
- A selected Area or Linear shows hollow white vertex handles (tolerance 0.012 of the
  page). Drag one to move it.
- **Insert:** double-click an edge with Select (10 px, not within the end 5% of an edge),
  or right-click, "Insert point here".
- **Delete:** right-click a vertex, "Delete this point". Refused below the minimum: "Can't
  delete point", "A {LF|SF} run needs at least {2|3} points. Delete the whole run
  instead."
- **Curves reshape as curves.** An ellipse shows four quadrant handles; dragging one moves
  that side with the opposite side fixed. An arc shows three (start, through, end), refit
  through three points. An inline arc shows one handle at its middle.

**Copy and move** (PT:4464-4552, 5393-5534, 15034-15646):
- **Copy.** Right-click, "Copy…". With more than one section on the sheet: "Copy — what
  to take": "This section only", "All sections on this sheet (N)", "Choose sections…".
  Then "Copy — where to paste": "Paste on this sheet" or "Paste on another sheet…". **No
  reference-point click:** the right-click point is the anchor. "Click where you want to
  place it. Esc to cancel." A ghost follows the cursor, **drawing Linear runs as lines,
  not shaded areas**, scaled by the two sheets' scales. The click asks "Paste into
  "{name}" or create a new item?": Back, Cancel, New item, Same item, with a note when the
  scale differs. An uncalibrated target: "Target sheet is not calibrated". Deducts travel
  with their section.
- **Move.** Right-click, "Move": "Press and drag the markup to its new position." Or the
  **move handle**, a round button at the selected run's centroid, 18 to 28 px as the zoom
  grows, repositioned without a render during zoom, hidden while panning, while a dialog
  is open, or when its anchor leaves the canvas; a chip after 1 s names the item and its
  quantity. A drag under 4 px cancels. A deduct moved off its area: "Move rejected", "The
  moved subtraction no longer overlaps any positive region. Original position
  restored."
- **Box selection menu:** "{n} selected", Copy, Paste, Move, Rotate Left 90°, Rotate Right
  90°, Flip Horizontal, Flip Vertical, Lock or Unlock, Hide, Delete. Rotate and flip are
  rigid: lengths, areas and counts never change.

**Deducts** (`edgeCut.ts`, `deductPairing.ts`, `quantityService.ts:94-190`, PT:5968-6058,
14447-14491):
- Right-click an area, "Subtract from section", then "Polygon (point to point)",
  "Rectangle" or "Ellipse / Circle"; or Deduct in the action group.
- On finish: the section it overlaps most owns it. No overlap: "Subtract has no overlap",
  "The shape doesn't intersect any positive region." A shape that overhangs the edge
  **bites the section's outline** rather than becoming a hole. One that would leave
  nothing: "Deduction covers the whole area", "Nothing would be left of the marked area."
  Overlapping holes merge into one. Otherwise: "Subtracted", "Applied to "{name}"."
- **The deduct tool stays armed** after every outcome, until Escape, leaving Area, a sheet
  switch, or the item going.
- **Quantity is union-clip:** each deduct is clipped against the union of all the item's
  positives on the sheet and subtracted once, whoever owns it. **Pairing is ownership
  only** (selection, move, copy, delete) and never changes a figure. The code says "Do NOT
  consolidate" (`deductPairing.ts:1-16`).
- Deleting a section deletes its deducts; deleting a deduct deletes only itself.
- **Circles stay curves after a cut:** the surviving curve samples are marked
  (`smoothIdx`) so their handles stay hidden.

**Auto-merge** (`edgeCut.ts:503-640`, PT:6071-6103): on by default. When a new section of
the same item overlaps existing ones (an area, or a closed Linear box), they are unioned
into one outline; the largest keeps its identity; holes are re-clipped. A merged Linear
box measures the merged perimeter. One undo entry.

**Resume, Start and Extend** (PT:10086-10119, 6061-6124, 5575-5646):
- **Resume** on a count re-enters its marking session; on a Linear or Area it appends the
  next run to the item. **Start** begins another section of the selected item.
- "Add more points": click the last vertex to continue from the end, or the edge to
  insert and continue from there.
- Per-type resume glyphs.

**Count** (PT:5820-5825, 5939-5950, 6189-6205): arming Count opens the New Measurement
dialog first; the first click creates the item and starts a session; later clicks append
marks to it. An existing item takes marks only through Resume. Switching sheet ends the
session. A count marker's menu: "Delete this point", "Delete all points on this sheet",
"Copy…".

**Undo and redo** (`history/sessionHistory.ts`, PT:2419-3848):
- **One history for the session, owned by the scope of the latest commit** (a sheet). A
  commit on another sheet discards both stacks; merely visiting another sheet keeps them;
  on a sheet that does not own the history, undo does nothing. 50 entries. Session only.
- Recorded: a new item, a Resume or Extend run, a whole count session (one entry), a
  deduct cut or merge, an auto-merge, a delete (a snapshot, re-creating the item if it
  went). **Not recorded:** move, vertex drag and insert, copy, rotate, flip, nudge.
- Undo writes the inverse through the api. If the shape has been changed since, it asks:
  "This item was also edited by someone else since then — undoing will remove their work
  too." If a colleague holds the item: "Can't undo", "{name} is locked by {holder} (on
  {sheet})", and the entry stays.
- **Ctrl+Z order:** the last draft point, then the last count marker, then the history.
  Ctrl+Shift+Z and Ctrl+Y redo. Toolbar: "Undo last measurement on this sheet (Ctrl+Z)",
  "Redo — bring back the last undone measurement on this sheet (Ctrl+Shift+Z)". Keys are
  left to the browser in a text field.

**Delete** (PT:5886-5907): Delete, or Backspace with nothing drawing, removes the selected
run, else the item on this sheet only, with no confirm (undo is the way back).

**The action group** (`ContextActionGroup.tsx`; `DrawActionStrip.tsx` is dead code). One
amber-backed group in the toolbar, in five variants:

| Variant | When | Buttons |
|---|---|---|
| armed | a tool is armed, nothing drawn | Properties, Stop ("Put the tool away — Esc"), the mode dropdown |
| draw | a draft, a count session or an extend session | Properties, Stop ("Commit and stop — Enter"), Discard ("… — Esc"), New Section, Close (Area), Arc ("Bend the next segment into an arc — A"), Undo ("Undo the last point — Backspace or Ctrl+Z"), mode |
| subtract | a deduct is armed | Properties, Stop, Discard, Undo, mode |
| select | a measurement is selected | Properties, Start (not count), Resume, Deduct (Area), Copy, Delete; on a locked item Start, Resume, Deduct and Delete disable with " — Item is locked" |
| multi | a box selection | Delete ("Delete everything in the selection") |

A chip with the item's name and quantity shows only when the Takeoff panel is hidden.

**Right-click, by what is under it** (PC:3255-3369): a live box selection owns it; a
right-drag that panned swallows it; mid-draw, the draw menu; with Select, a count marker,
a vertex, a Linear or an Area each have their own menu; empty sheet opens the **sheet
menu**: a tool strip (Dimension, Area, Linear, Segment, Count, Highlight, Note), Paste,
Show All and Hide All by kind (All, Area, Linear, Segment, Count, Annotations), Rotate
Page (Left, Right, 180°, Mirror, Reset: a view transform only), Show or Hide Legend, Zoom
to Fit, Calibrate Scale, Print This Page, Bookmark This Page.

**The region menu** (`RegionSelectMenu.tsx`): Page Name, Sheet #, Scale (each with an
"All" range variant), Ask AI, Extract Schedule, Auto Count, Copy as Text, Copy as Image,
Search as Text, New Snapshot, Crop as New Page, and the tool strip. AI-capable rows carry
a glyph.

**Hover** (PC:620-684, 2069-2101, 3431-3558, `hoverStats.ts`):
- After the cursor rests `hoverHintDelayMs` (1000 ms default, 0 to 3 s), a panel shows
  the run under it: "Section #n of m" ("Marker", "Segment"), "This sheet (N):", "Without
  deducts", "Deducts", "After deducts", "Perimeter", "All segments", "Average segment",
  "Longest segment", "Shortest segment", "Points:", "Segments:", "Pitch factor:", or
  "Sheet not scaled — measurements on it count as 0."
- It hides the moment the cursor moves more than 5 px, and on pan, region drag and leave.
  It sits above the cursor, clear of the reticle (`max(22, ring/2 + tick)`), flipping
  below near the top.
- The figure is the run the hit test found, never a neighbour.
- An area run under the cursor gets a blue outline (`#1e6bff`, 1.6 px on a white casing),
  with Select or Pan, never mid-draw; a selected run never turns blue.

**Mouse** (PC:731-1125, 2774-2837):
- Middle-drag pans at once. Right-drag pans past 4 px; a right-click that did not move
  still opens its menu. Both work over every canvas layer and are settings, on by
  default.
- The wheel zooms at the cursor: `exp(-delta × 0.0015 × speed)` (0.0025 on a pinch),
  speed 0.25 to 2.5, with an invert option. Shift+wheel is ignored.
- **Edge auto-scroll** while a draw tool is armed: a 48 px band, 500 ms before it starts
  from rest, speed 2; gentle at the band's inner edge and full at the canvas edge; only
  while the pointer is over the canvas, stopping the moment it leaves, on pointer-up
  outside, and on a tool or zoom change.
- **Past the sheet edge:** points may go up to 1.5 page widths beyond the paper, and ink
  outside the sheet still shows ("the paper edge is never a wall").
- **The reticle** replaces the system cursor on the canvas (not with Pan): full-span
  crosshair lines stopping short of a gap, four ticks, a square or round ring broken
  where the ticks cross it, a centre dot, and an optional white halo. Every part is a
  setting (§24 Cursor).
- Space-drag pans in the new app today (ticked); legacy has no space handler.

**The collaboration lock** (`useTakeoffPresence.ts`, `presence/gate.ts`): legacy blocks
Resume and delete on an (item, sheet) someone else is marking. The new app's One at a
time mode replaces it (D-32), per item.

### What exists today

| Piece | State |
|---|---|
| Tools | Select, Scale, Linear, Area, Count; point to point only; Count makes an item per click |
| Keys | Space pans, `+` `-` `0` zoom; nothing else |
| Selection | One item uuid, by `onClick` on its path; no tolerance, no runs, no box |
| Vertex edit | Move only, from the menu's "Edit vertices", with a Done banner; one write on release, version-guarded |
| Add a shape | Menu entry; the next shape joins the item as a new geometry row |
| Menus | Item, folder and layer menus; right-click on a shape selects it first; nothing on empty sheet |
| Model | `TakeoffGeometry`: `vertices_json`, `shape_meta`, `geometry_version`, `updated_by_id`, `client_uuid` idempotency; **one row per shape** (D-32); no deduct |
| Routes | `POST /item`, `POST /item/{uuid}/geometry`, `PATCH /geometry/{uuid}`, `DELETE /geometry/{uuid}`, all `canEditTakeoff` plus the mode guard, each publishing `takeoff.item.changed` or `takeoff.geometry.changed` |
| Realtime | Drafts drawn (`DraftLayer`, D-34) for Linear and Area; cursors sent and received, **never drawn**; `show_cursors` read nowhere |
| Capabilities | The takeoff page reads none |
| Engine | `lib/takeoff/engine/{coords,geometry,calibration}.ts`, `quantity.ts`, `units/`; data in, data out |

---

## Design

### One shape, one row (D-32), so legacy's runs become rows

D-32 made the row-per-shape model load-bearing: no write may read, modify and write a
whole item's vertices. Legacy's flat, sentinel-separated array does exactly that on every
Resume, deduct and count click. So the port translates, and never copies, legacy's
storage:

| Legacy | Here |
|---|---|
| A run in an (item, sheet) row | A `takeoff_geometry` row |
| A section (positive run) | A row with `role = add` |
| A deduct run, `shape_meta.role = "subtract"`, `owner_id` | A row with `role = subtract` and `owner_geometry_id` pointing at its section (Q2) |
| Resume or Extend: append `[…, SENTINEL, …new]` | Insert a new row (D-32's consequence, verbatim) |
| A count session: append points to one run | **One row per mark** (Q1) |
| Delete a run: splice it out of the array | Delete the row; its deducts go with it by `ON DELETE CASCADE` |
| Add more points, insert, delete a vertex | A version-guarded `PATCH` of that one row, as today |
| Edge cut, auto-merge, merge holes | One atomic multi-row write (below) |

The sentinel invariant holds by construction: a new row never carries a sentinel, and
`vertices_json` and `shape_meta` stay parallel within the row. The api keeps refusing
vertices without their meta (`service.py:497-499`).

### The shape transaction

Several legacy acts touch more than one shape at once: a deduct that bites its section's
outline and dissolves the holes it touches; an auto-merge that unions three sections into
one; a paste of twelve runs; a box delete; undoing any of those. Each must land whole or
not at all.

- **`POST …/takeoff/item/{uuid}/shapes`**, body `{create: [...], update: [{uuid,
  geometry_version, vertices_json, shape_meta}], delete: [{uuid, geometry_version}]}`.
  Every row belongs to the one item. The api takes the item-row lock (F8-S9), checks
  every version atomically, runs the mode guard, applies the lot, recomputes the item's
  quantity, commits, then publishes **one** event (D-20). A stale version anywhere refuses
  the lot with F8's "{name} just changed this shape, showing their version".
- Creates carry `client_uuid`, so a retried paste never doubles.
- A paste as a new item is `POST /item` then this. Cross-item acts (a box delete across
  six items) are one call per item, in sequence; each is atomic, the set is not, and the
  toast says which failed.
- The single-row routes stay for single-row acts.

The browser computes the geometry (the cut, the union, the transformed copy) with the
ported engine. The api validates and stores it, and **computes the quantity itself**.

### Quantities: analytic, decided on the api

D-32 says anything derived from all of an item's shapes is decided on the api under the
item lock. With deducts and curves that means the api needs legacy's quantity rules, not
only the polygon sums it has today:

- Rectangle, ellipse (πab; perimeter by the analytic series legacy uses) and standalone
  arc (`r × |sweep|`) from `shape_meta`, never from samples.
- Area deducts by union-clip: each subtract clipped against the union of the item's
  positives on the sheet, subtracted once. Pairing never enters it.
- Inline arcs: see Q5.

`lib/takeoff/engine` holds the TypeScript twin for the live figure while drawing (hard
rule 2). The two are proved equal by one shared table of shapes and answers that both
suites run, the arrangement F6-S4 uses for formulas. Polygon clipping in Python needs a
library (Q3).

### The engine, ported as data in, data out

Legacy's `engine.ts` (4,607 lines) is an imperative canvas object. The port lifts its
**rules**, not its structure (D-11), into `src/lib/takeoff/engine/` with no React and no
network (hard rule 2):

- `tools.ts`: the tool and draw-mode state machine as a reducer (`state, event → state,
  effects`). Two-stage Escape, Backspace, finish rules and the inline arc live here, so
  every one is testable without a canvas.
- `shapes.ts`, `arc.ts`: rectangle corners, ellipse and arc sampling, `arcFrom3`, the
  handle masks (4 for an ellipse, 3 for an arc, `smoothIdx`).
- `hit.ts`: hit-testing with legacy's tolerances, positive before deduct, the hole
  cycle, count symbols at 14 px minimum. Extends today's unused `geometry.ts`.
- `snap.ts`: the snap index (12 px, the 24 px bucket grid, the priority order, own before
  PDF) and ortho (45°, 22.5° with Alt).
- `deduct.ts`: the pairing (ownership), edge cut, hole merge, positive merge, ported
  from `deductPairing.ts` and `edgeCut.ts` with their "do not consolidate" note kept.
- `transform.ts`: translate, rotate 90°, flip, scale between sheets; analytic shapes stay
  analytic.
- `history.ts`: legacy's session history rules (below), payloads opaque.
- `keys.ts`: `resolveShortcut`, as legacy's, plus Ctrl+A and Ctrl+Z.
- `hover.ts`: `hoverStats`, reading the api's per-shape figures.

`features/takeoff/` owns the canvas component, pointer capture, the reticle canvas, the
menus and the api calls. PdfCanvas's pointer handling is re-expressed there over F5's
pdf.js canvas and viewport, not lifted.

### Undo and redo

Legacy's model is kept, because its rules were argued for and written down: one history
owned by the sheet of the latest commit, discarded by a commit elsewhere, kept by mere
navigation, inert on another sheet, 50 entries, session only.

Each entry is a **shape transaction and its inverse**, both captured at commit time with
the resulting `geometry_version`s. Undo sends the inverse through `…/shapes`:

- A version that has moved on means someone changed the shape since. The confirm names
  them: "Sara W. also edited this since then — undoing will remove their work too."
- In One at a time, a colleague's claim refuses the undo with legacy's "Can't undo" and
  the holder's name; the entry stays.
- Undoing a create whose item then has no shapes deletes the item only if this session
  created it.
- Redo re-applies the forward transaction with fresh versions.

Legacy records creates, Resume, count sessions, cuts, merges and deletes, and **not**
move, vertex edits, copy, rotate, flip or nudge. See Q6.

### Settings

F7 brings §24's Mouse, Cursor, Snapping, Hover and part of Takeoffs and General:

- General: hover hint on or off, hover delay.
- Mouse: zoom speed, invert, pan with the middle button, pan with the right button, auto
  scroll on, delay, speed, edge band.
- Cursor: crosshair, ticks, ring, dot, every knob.
- Snapping: defaults for Snap, Snap PDF and Ortho.
- Takeoffs: default Linear and Area modes, auto-merge.
- Hover: which fields per markup type, text style, background, the area outline's
  colour and thickness.

Legacy keeps these in the browser (`takeoff.settings.v1`, `localStorage`) with a Save, a
per-section Reset and Restore all defaults. Where they live here is Q7.

### Capabilities per action (D-21, D-26)

Every control reads `can()` and disables with the capability's phrase; the api refuses a
hand-written request. Hiding is never the only gate.

| Act | Capability | Also |
|---|---|---|
| Open the sheet, pan, zoom, hover, select, box select, Ctrl+A, copy to the clipboard, view rotation, Show and Hide by kind | membership | none of these writes |
| Arm Linear, Area, Segment, Count; draw; New Section, Stop, Close, Arc | `canEditTakeoff` | the sheet must be scaled; the collaborator plan mask removes it (§3) |
| Resume, Start, Extend, Add more points | `canEditTakeoff` | item not locked (D-06); **One at a time:** claims the item, refused 409 to anyone else |
| Vertex move, insert, delete; curve reshape | `canEditTakeoff` | not locked; the mode guard; `geometry_version` |
| Deduct, auto-merge | `canEditTakeoff` | as above, one transaction |
| Move, rotate, flip, nudge | `canEditTakeoff` | as above, per item |
| Paste (same item, new item, another sheet) | `canEditTakeoff` | target sheet scaled; a new item is `POST /item` |
| Delete (Delete key, menus, box) | `canEditTakeoff` | as above |
| Undo and redo | the capability of the act being inverted | the item's current lock and claim, not the original's |
| Lock and Unlock from the selection menu | `canEditTakeoff` | D-06's unlock payload |
| Calibrate Scale, Bookmark This Page (sheet menu) | `canEditTakeoff` | F5 owns the acts; F7 only reaches them |
| Region menu rows | their owners' (below) | shown only when their feature has shipped |
| Sending cursor and draft frames | project membership | as F8 built it; no capability check on frames |

A viewer sees every measure tool disabled with the phrase for `canEditTakeoff`, and can
still select, hover and copy a figure.

### Realtime (D-13, D-20, D-32, D-33)

| Event or frame | Topic | Payload | Published by | Heard by |
|---|---|---|---|---|
| `takeoff.geometry.changed` | project | as F8: `{project_uuid, item_uuid, sheet_uuid, kind, geometry_uuid}`, kind `created\|updated\|deleted` | every single-row write | `useLiveItems`: refetch the one item |
| `takeoff.geometry.changed`, kind `batch` (**new**) | project | `{…, item_uuid, sheet_uuid, kind: "batch", geometry_uuids: [...]}` | every `…/shapes` transaction | the same: one refetch of the item, not one per row |
| `takeoff.item.changed` | project | as F8 | a paste or count that creates an item; an item deleted with its last shape | `useLiveItems`, the tree |
| `draft` frame | project | as F8, `tool` gains `segment`; the points of a rectangle, ellipse or arc sent as their outline; **new optional `role: "subtract"`** | the drawing tab, 10 a second | `DraftLayer`: a deduct draft draws dashed, hatched, in the item's colour |
| `cursor` frame | project | as F8 | every tab, throttled as today | **the new `CursorLayer`** |
| `item.focus`, `item.blur`, `focus.granted`, `focus.refused` | project | as F8 | Resume, Extend, Start, a deduct session, a move drag, a vertex drag, a paste into an item | the mode guard; the item's controls |

Every write carries the tab's write token, so the writer ignores its own echo (F8-S7).
Undo and redo are ordinary writes and publish the same way.

**Cursors (D-33).** A `CursorLayer` over the sheet, beside `DraftLayer`, in normalised
sheet space so it survives zoom and pan:
- A small pointer in the colleague's colour (derived from their user uuid, the same on
  every screen), with a "Sara W." tag, honouring `show_names` (always, on hover, off) as
  `DraftLayer` does.
- Drawn only when `show_cursors` is on; faded under "fade others"; hidden under "only
  mine".
- Only colleagues on this sheet. Gone the moment a `gone` frame arrives, and after 5 s of
  silence (`STALE_MS`).
- Never your own tab's cursor. Your own other tab's cursor is drawn, tagged with your own
  name, since it is a different place you are working.

---

## Subtasks

Every criterion is checked by clicking, in two windows where it names B, and driven by a
fixture. Window A is the owner on `:5173`; window B is Sara W. on `:5174` (the `realtime`
profile). Riverside Medical Center, sheet A-101, calibrated so that 0.2 of the page is 40
ft (the seed's 1,600.00 SF square).

# Block A: Foundations

### F7-S1: The engine, ported

**Work.** The modules in the Design, with their unit tests, and the canvas rewired to the
reducer. Nothing new is visible yet except tolerance.

**Acceptance criteria.**
1. Clicking 2 px beside a hairline Linear run selects it; clicking 30 px away does not.
2. Clicking inside the seed square selects it; clicking on its edge from outside selects
   it too.
3. A count symbol selects from anywhere on its drawn shape, at every zoom.
4. `lib/takeoff` still imports no React and makes no network call (the bench greps it, as
   it does for hard rule 2 today).

### F7-S2: Shape roles, the transaction, and the api's quantities

**Work.** The `role` and `owner_geometry_id` columns (Q2); `POST …/item/{uuid}/shapes`;
the api's analytic quantities and union-clip (Q3); the shared table; the `batch` event.

**Acceptance criteria.**
1. An Area circle drawn with radius 10 ft reads 314.16 SF, and after a reload still reads
   314.16 SF, not a 64-gon's figure.
2. A Linear rectangle 10 ft by 20 ft reads 60.00 LF; a Linear circle of diameter 10 ft
   reads 31.42 LF.
3. The shared table gives the same figure in the browser and the api for every row.
4. A transaction with one stale version changes nothing, and names who changed it.

### F7-S3: Capabilities on the canvas

**Acceptance criteria.**
1. As a viewer, every measure tool, the action group's edit buttons and the edit rows of
   every menu are disabled with the reason; select, hover and pan work.
2. A hand-written `POST …/shapes` from the viewer is refused 403.
3. As the owner, all are enabled. A platform admin in a collaborator-plan workspace sees
   them enabled (F5-S18, kept).

# Block B: The measure tools

### F7-S4: Linear modes

**Acceptance criteria.**
1. The Linear button's dropdown lists Point to Point, Rectangle, Ellipse / Circle and Arc,
   each with its hint; the current mode is marked, and the button names it.
2. Rectangle: two clicks draw a closed box that measures its perimeter.
3. Ellipse / Circle: two clicks give the bounding box; the figure is the analytic
   perimeter.
4. Arc: three clicks, start, through, end; the figure is the arc's length. Three
   collinear clicks give a two-segment line.
5. Press and drag in Rectangle or Ellipse mode places the shape in one gesture.
6. The default Linear mode setting decides the mode a fresh session starts in.

### F7-S5: Area modes

**Acceptance criteria.**
1. Point to Point, Rectangle and Ellipse / Circle, as S4, for areas.
2. A 20 ft by 30 ft rectangle reads 600.00 SF; a circle of radius 10 ft 314.16 SF.
3. Press and drag places a rectangle; in Point to Point, a press and drag of more than
   5 px places a rectangle too, as legacy's.

### F7-S6: Segment

**Acceptance criteria.**
1. Segment's title reads "Segment — two clicks per segment; auto-commits, then places the
   next".
2. Two clicks commit a segment; the next click starts the next one at once, with no
   Enter.
3. Each segment is its own shape of the same item; the item's figure is their sum.

### F7-S7: Count adds to the selected item (finding 2)

**Acceptance criteria.**
1. With the count item "Receptacles" selected, press N and click five times: five marks
   join Receptacles, which reads 5 EA. No new item appears.
2. With nothing selected (or a Linear selected), N opens the New Measurement dialog for a
   count first (F6-S1); its first click creates the item and later clicks join it.
3. Three quick clicks never make three items.
4. Right-click a mark: "Delete this point" removes one; "Delete all points on this sheet"
   removes the item's marks here only.
5. Switching sheet ends the session; Resume on the item continues it.

### F7-S8: Finishing, cancelling and the draw menu

**Acceptance criteria.**
1. Enter and double-click finish a Point to Point run; double-click does nothing in
   Rectangle mode.
2. The first Escape mid-run commits it if it has enough points (drops it if not) and
   keeps the tool armed; the second Escape returns to Select.
3. Backspace removes the last point, one at a time, back to none.
4. Right-click mid-run opens New Section, Stop and Discard; Escape closes only the menu
   and the run is still there.
5. New Section commits and keeps marking the same item; Stop commits and returns to
   Select; Discard drops the run and returns to Select.
6. Close on an Area with two points is disabled; with three it closes and commits.
7. Linear on an unscaled sheet opens F5's "Set a scale for this sheet", and after a scale
   is set, Linear is armed.

### F7-S9: Inline arcs

**Acceptance criteria.**
1. Mid-run, A arms an arc; the next two clicks bend the segment through the middle click
   to the end click, and the run continues.
2. A again, before the second click, disarms it; Backspace unwinds it first.
3. With no point placed, A arms the Area tool instead.
4. A selected run with an arc shows one handle at the arc's middle; dragging it refits
   the arc.
5. The figure is the one Q5 decides.

### F7-S10: Snap, Snap PDF and Ortho

**Acceptance criteria.**
1. The canvas bar reads "Ortho: On", "Snap: On", "Snap PDF: Off", "Auto Merge: On",
   "Auto Scroll: On" on a fresh profile, each toggling on click, each with its title.
2. With Snap on, a click within 12 px of a vertex lands on it; near a midpoint, on the
   midpoint; near two crossing edges of your own, on the crossing.
3. With Snap PDF on, a click near a printed wall corner lands on it; the toggle shows a
   spinner while the linework loads. Your own vertex beats a printed one at the same
   distance.
4. With Ortho on, the rubber band locks to 45°; holding Alt, to 22.5°.
5. Mid-draw, S, D and O toggle the three; with no tool armed, S picks Snapshot's key
   (disabled until F11) and D does nothing measurable.

### F7-S11: Past the edge, and auto-scroll

**Acceptance criteria.**
1. A run can be drawn off the paper onto the grey margin, and its ink outside the sheet
   still shows after a reload.
2. With Linear armed, resting the cursor inside the canvas's edge band starts the sheet
   gliding after half a second; it is faster at the very edge.
3. The glide stops the moment the cursor leaves the canvas, even mid-run.
4. The Auto Scroll toggle, and its delay, speed and band settings, change it.

# Block C: Selection and editing

### F7-S12: Select, and the panel both ways

**Acceptance criteria.**
1. On an item with three sections, a click selects one section; its row in the panel is
   blue and scrolled into view, its folder opened.
2. Clicking the row of an item on another sheet opens that sheet with the item selected.
3. With a deduct inside a section: the first click selects the section, the second
   selects the deduct, the third returns to the section.
4. Selected areas and linears show hollow white vertex handles; unselected sections are
   not dimmed.

### F7-S13: Vertices and curves

**Acceptance criteria.**
1. Dragging a handle reshapes the run, the figure following live; B's copy follows within
   a second of release.
2. Double-clicking an edge inserts a vertex there; "Insert point here" does the same.
3. "Delete this point" on a four-point area removes one; on a three-point area it refuses:
   "Can't delete point", "A SF run needs at least 3 points. Delete the whole run
   instead."
4. A circle shows four handles; dragging the east handle stretches it east with the west
   side fixed, and it stays an ellipse with an analytic figure.
5. An arc shows three handles; dragging the middle one bends it.
6. Double-click an edge, then Ctrl+Z: the vertex goes (per Q6).

### F7-S14: Box select, Ctrl+A and the selection menu

**Acceptance criteria.**
1. A Select-tool drag over two whole runs and half of a third selects only the two.
2. A drag over empty sheet with nothing inside opens the region menu instead.
3. Ctrl+A selects every markup on the sheet; it does nothing mid-draw.
4. The action group shows only Delete; right-click shows "{n} selected" and Copy, Paste,
   Move, Rotate Left 90°, Rotate Right 90°, Flip Horizontal, Flip Vertical, Lock, Hide,
   Delete.
5. Rotate and flip move the markups and leave every figure unchanged.
6. Arrow keys nudge the selection; Shift nudges ten times further.
7. A left-click off any markup clears the selection; Escape does too.

### F7-S15: Move

**Acceptance criteria.**
1. Selecting a run shows the move handle at its centre; it grows from 18 to 28 px as the
   zoom rises and stays on the centre while zooming.
2. It hides while panning and while a dialog is open.
3. Resting on it for a second shows the item's name and quantity.
4. Dragging it moves the run; a drag under 4 px moves nothing.
5. Right-click, Move: "Press and drag the markup to its new position."
6. Moving a deduct off its area is refused with "Move rejected" and legacy's text, and it
   goes back.

### F7-S16: Copy and paste

**Acceptance criteria.**
1. Right-click an item with three sections, "Copy…": "This section only", "All sections
   on this sheet (3)", "Choose sections…".
2. Then "Paste on this sheet" or "Paste on another sheet…", with no reference-point
   click: the ghost is already under the cursor.
3. The ghost draws a Linear run as a line, never as a shaded area.
4. The click asks "Paste into "{name}" or create a new item?"; Same item adds the copies
   to it; New item makes a new item (F6's dialog) holding them.
5. On another sheet at a different scale the copy keeps its real-world size, and the
   dialog says the scales differ.
6. An uncalibrated target reads "Target sheet is not calibrated".
7. A section's deducts come with it.
8. Every item type copies: Linear, Area, Segment and Count.

### F7-S17: Delete

**Acceptance criteria.**
1. With a section selected, Delete removes that section only.
2. With a count item selected, Delete removes its marks on this sheet only; its marks on
   A-102 remain.
3. Backspace does the same when nothing is being drawn.
4. There is no confirm; Ctrl+Z brings it back (S22).

# Block D: Deducts, merge, Resume

### F7-S18: Deducts (finding 4)

**Acceptance criteria.**
1. Right-click the seed square, "Subtract from section", "Rectangle": a 10 ft by 10 ft box
   inside it reads the item as 1,500.00 SF. "Subtracted", "Applied to "{name}"."
2. The tool stays armed: a second box cuts again without re-arming.
3. A box outside every section: "Subtract has no overlap", and nothing changes.
4. A box overhanging the edge bites the outline, and the item reads the right figure; a
   box covering it all: "Deduction covers the whole area".
5. Two overlapping holes merge into one, and the overlap is subtracted once.
6. A circular hole cut across a circle's edge leaves a curve with no bead chain of
   handles.
7. The hover panel shows "Without deducts", "Deducts", "After deducts" for the section.

### F7-S19: Deducts follow their area; pairing is not quantity

**Acceptance criteria.**
1. Deleting a section deletes its deducts; deleting a deduct deletes only itself.
2. Moving a section moves its deducts; copying it copies them.
3. Two sections overlapping one hole: the item's figure subtracts the hole's area once,
   whichever section owns it. Re-pairing it to the other section (by moving the other)
   leaves the figure unchanged.
4. A hand-written request making a deduct's owner a shape of another item is refused.

### F7-S20: Auto-merge

**Acceptance criteria.**
1. With Auto Merge on, a new section overlapping an existing one of the same item merges
   into one outline, and the overlap counts once.
2. Two Linear boxes that overlap merge into one run measuring the merged perimeter.
3. Holes in the absorbed section survive, re-clipped.
4. With Auto Merge off, they stay two sections and the overlap counts twice.
5. One Ctrl+Z undoes the whole merge.
6. The Q8 rule on colleagues' shapes holds.

### F7-S21: Resume, Start, Extend and Add more points

**Acceptance criteria.**
1. Resume on a Linear item: the next run joins the item as a new shape; its figure adds.
2. Resume on a count continues marking it.
3. Start on a selected area begins another section of it.
4. "Add more points": clicking the end vertex continues the run itself.
5. Each item type shows its own resume glyph.
6. In One at a time, while A resumes an item, B's Resume, Start and Delete on it are
   disabled with "Bench E. is editing this item right now"; a hand-written request from
   B is refused 409. (MANAGER row: the claim re-driven on Resume and Extend.)

# Block E: Undo and redo

### F7-S22: The session history

**Acceptance criteria.**
1. Draw a run, Ctrl+Z: it goes; Ctrl+Shift+Z: it returns; Ctrl+Y also redoes.
2. The toolbar's Undo and Redo carry legacy's titles and disable when there is nothing to
   do.
3. Mid-run, Ctrl+Z removes the last point first; mid count session, the last mark.
4. A whole count session undoes as one step.
5. Delete an item's last shape here, Ctrl+Z: the item and its shape return.
6. Draw on A-101, visit A-102 without drawing, return: undo still works. Draw on A-102:
   A-101's history is gone.
7. On A-102 while A-101 owns the history, Ctrl+Z does nothing.
8. B edits A's run; A presses Ctrl+Z on it: "Sara W. also edited this since then —
   undoing will remove their work too."
9. In a text field, Ctrl+Z undoes the typing, not the sheet.

# Block F: Chrome, menus, hover, mouse and keys

### F7-S23: The action group and the canvas bar

**Acceptance criteria.**
1. The group shows the armed, draw, subtract, select and multi variants with legacy's
   buttons and titles, on a light yellow background that reads as unfinished.
2. On a locked item, Start, Resume, Deduct and Delete disable with " — Item is locked".
3. With the Takeoff panel hidden, a chip shows the item's name and quantity.
4. The canvas bar has a fixed height: toggling anything never moves the sheet.
5. A narrow window folds the tools into an overflow menu.
6. Every in-draw hint stays inside the canvas.

### F7-S24: The context menus

**Acceptance criteria.**
1. Right-click empty sheet: the tool strip, Paste, Show All and Hide All by kind, Rotate
   Page, Show Legend (per Q9), Zoom to Fit, Calibrate Scale, Print This Page (disabled
   until F11), Bookmark This Page.
2. Rotate Page turns the view only; every figure, and B's view, are unchanged.
3. Hide All, Area Markups hides areas on this sheet in this browser; Show All brings
   them back.
4. Area, Linear, count-mark and vertex menus each offer legacy's rows, disabled with
   reasons as the capability and lock say.
5. After a right-drag pan, no menu opens; a still right-click opens one.
6. The region menu lists only the rows whose feature has shipped (per Q9), with the tool
   strip.

### F7-S25: Hover

**Acceptance criteria.**
1. Resting on a section for a second shows its panel: "Section #2 of 3", the sheet's
   total, perimeter and segments, and deduct figures for an area.
2. Moving 6 px hides it at once; it returns after the next rest.
3. It sits clear of the reticle, above the cursor, below it near the top edge.
4. On two adjacent runs, the figure is always the run under the cursor.
5. Hovering an area outlines that run in blue; a selected run never turns blue; no
   outline mid-draw.
6. The hover settings turn it off, change the delay, and choose the fields per type.
7. On an unscaled sheet: "Sheet not scaled — measurements on it count as 0."

### F7-S26: Mouse and reticle

**Acceptance criteria.**
1. Middle-drag pans with any tool armed, over every layer; right-drag pans too.
2. Each can be turned off in settings.
3. Zoom speed 2× zooms twice as far per notch; invert reverses it; Shift+wheel does
   nothing.
4. The reticle replaces the cursor over the canvas, not with Pan and not over the panels;
   its crosshair, ticks, ring and dot follow every Cursor setting.
5. Markups stay put at 4000% (D-35) while zooming and panning, with no jitter.

### F7-S27: Every key, and the settings

**Acceptance criteria.**
1. V, H, L, A, N, S and D pick their tools, in either case; none fires while typing a
   name.
2. Every §23 binding behaves as its line says, driven one by one.
3. The settings sections F7 brings (per Q7) save, reset per section and restore all
   defaults, and a change reaches the open canvas at once.

# Block G: Collaboration

### F7-S28: Colleagues' cursors (D-33)

**Acceptance criteria.**
1. B moves over A-101; A sees B's pointer in B's colour, tagged "Sara W.", following within
   a tenth of a second.
2. B moves to A-102; B's pointer leaves A's A-101 at once. B closes the tab; it goes at
   once.
3. A turns "show others' cursors" off: B's pointer goes; on: it returns.
4. Names on hover: the tag shows only while A's pointer is near B's.
5. Others' work "fade": B's pointer is faded; "only mine": hidden.
6. A's own other tab's pointer shows, tagged with A's name.

### F7-S29: Drafts for every new tool; the modes on every new write

**Acceptance criteria.**
1. A draws a rectangle, an ellipse, an arc and a segment slowly; B watches each grow,
   tagged, and become the saved shape.
2. A draws a deduct; B sees it dashed and hatched, then the section's figure drop.
3. In One at a time, A's move drag, vertex drag, deduct session and paste each claim the
   item; B's controls on it disable with the reason, and B's hand-written write is refused
   409.
4. In Warn me, B sees "Bench E. is also working on this item" while A resumes it.

### F7-S30: The two-window live check (the MANAGER row)

1. In Work together, A and B add marks to one count item at once, ten clicks each: both
   windows end on 20 EA.
2. A and B drag the same vertex at the same moment: one wins; the other sees "{name} just
   changed this shape, showing their version", and the shape shows the winner's.
3. B sees A's cursor and A's in-progress run, named; each of B's five Collaboration
   preferences changes what B sees.
4. A deducts from a section; B's figure drops within a second.
5. A pastes six sections onto A-102; B, on A-102, sees all six appear at once.
6. A undoes; B sees the undo.
7. A box-deletes across three items; B sees all three change.

# Block H: What F5 handed to F7 (D-36 Q7)

F5's "Not in F5" table, accepted by the founder, gives F7 these. They are sheet-panel
acts rather than canvas interactions; see Q4.

### F7-S31: New pages

New Blank Page at a chosen width and height; New Page From Clipboard; Duplicate page,
named "(copy)", optionally with its markups; Crop a dragged region into a new page (the
region menu's "Crop as New Page").

### F7-S32: Rotate pages

Rotate pages in bulk from the panel menu, by a relative turn or an absolute rotation,
including "All pages + Landscape". Stored rotation, unlike the sheet menu's view turn.

### F7-S33: Getting around

The sheet stepper; open another project from inside takeoff; the panel layout per user,
the centred edge tabs and resizing by drag.

---

## Not in F7

| Legacy behaviour | Owner |
|---|---|
| Snapshot (S), Highlight, Note, Cloud, Callout, Arrow, Dock, Overlay, Print | F11 (markup and evidence; `canUseAnnotations`) |
| Dimension (D) and scale verification | F11 with the annotations (Q9) |
| Find Text (Ctrl+F) and its key rules | F11 |
| Region menu: Page Name, Sheet #, Scale, and their "All" variants | F12 |
| Region menu: Auto Count | F13 |
| Region menu: Ask AI, Extract Schedule | F14 |
| Region menu: Copy as Text, Copy as Image, Search as Text | F11 |
| Verify mode (review numbered points before commit) | F11 with Dimension |
| The Legend (Markups toggle, Legend toggle) | Q9 |
| Earthwork tools and their vertex rules | F12 |
| High-resolution toggle, perf HUD, reference pane | F11 |
| Estimating tab's undo scope | F9 |

---

## Sequencing

| Block | Subtasks | What it is |
|---|---|---|
| **A: Foundations** | S1 to S3 | The engine, the model and the transaction, the gates. **Reporting boundary** |
| **B: Measure tools** | S4 to S11 | Modes, Segment, Count, finishing, arcs, snap, the edge |
| **C: Selection and editing** | S12 to S17 | Select, vertices, box, move, copy, delete |
| **D: Deducts, merge, Resume** | S18 to S21 | The deduct model and its rules |
| **E: Undo** | S22 | The history over every act before it |
| **F: Chrome** | S23 to S27 | Action group, menus, hover, mouse, keys, settings |
| **G: Collaboration** | S28 to S30 | Cursors, drafts, modes, the two-window check |
| **H: From F5** | S31 to S33 | Page acts (Q4) |

F7 starts when F5's canvas (S10) and panel (S13) exist, and F6's New Measurement dialog
(S1) and tree (S9), since Count and paste-as-new-item open it. Block B's S7 waits for F6-S1.
Block E is last among the editing blocks because it inverts every act before it. S28
(cursors) needs only F5-S10 and can go early.

## Bench

- Fixtures `browser/f7-s{1..33}.mjs`. `lib/takeoff.mjs` gains the helpers it lacks today:
  draw a polyline, press and drag, double-click, a key chord, right-click at a point, and
  read a figure from the panel.
- The shared quantity table runs in both suites.
- Gates: `ruff`, `mypy`, `lint`, `typecheck`, `build`. The full regression at each block's
  end: F7 rewires the canvas every takeoff fixture drives.

## Definition of done

- S1 to S33 driven, two windows where named, with loading, empty, error and unauthorised
  states.
- PARITY §9's measure-tool and undo lines, §10's lines not owned elsewhere, §23's lines,
  and §24's Mouse, Cursor, Snapping, Hover and F7's Takeoffs lines ticked; §10's cursor
  line ticked.
- The spec archived, the MANAGER row dropped, F7 in FEATURES ✅ Live, the mirror
  refreshed.

---

## Questions for the founder

| # | Question | Recommendation |
|---|---|---|
| Q1 | **A count mark: its own shape row, or one row per counting session?** Legacy appends marks to one run. D-32 forbids reading and rewriting a shape's points to append. | **One row per mark.** Two estimators counting one item at once can never lose a mark, and `f8-s9` already proved fifty simultaneous adds. A 400-mark item is 400 small rows; the item's figure is their count, decided on the api. A session undoes as one step through the transaction |
| Q2 | **A deduct: a row with `role` and `owner_geometry_id` columns, or `shape_meta` keys as legacy?** | **Columns**, with `ON DELETE CASCADE` on the owner, so "deducts follow their area" is the database's rule and not a client's. Same item only, checked by the api. F17 splits legacy runs into rows and maps `owner_id` |
| Q3 | **The api's union-clip needs polygon clipping in Python.** | **Add `shapely`** to the api (a wheel exists for Python 3.14 on x86, the D-08 target). Kept equal to the browser's `polygon-clipping` by the shared table, as F6-S4 keeps formulas equal |
| Q4 | **Block H: page acts F5 handed to F7 (D-36 Q7).** They are sheet-panel work, not canvas interactions, and they make F7 the largest spec yet. | **Split them into their own small feature after F7**, P-20 "Sheet page acts". F7 keeps only "Crop as New Page", since the region menu reaches it. Needs a `FEATURES.md` row; this draft does not add one |
| Q5 | **Inline arcs are measured from 120 samples in legacy**, not analytically, unlike the standalone Arc mode. The invariant says quantities are analytic. | **Make them analytic**: store each span's centre, radius and sweep in `shape_meta` and sum the arc lengths and circular-segment areas exactly. The difference from legacy is below a hundredth of a percent at 120 samples, and it keeps the invariant true. F17 recomputes legacy rows on import |
| Q6 | **Undo in legacy skips move, vertex edits, copy, rotate, flip and nudge.** | **Record them all**, beyond legacy. Each is one shape transaction with a known inverse, and "Ctrl+Z did nothing after I moved it" is the first thing an estimator will report |
| Q7 | **Where the canvas settings live.** Legacy: per browser, `localStorage`. The Collaboration preferences live on the user (D-33). | **On the user, stored sparse, beside Collaboration**, so the reticle and mouse settings follow an estimator to another machine. Legacy's Save, per-section Reset and Restore all defaults are kept |
| Q8 | **Auto-merge in Work together** can absorb a colleague's overlapping section of the same item. | **Merge only shapes the merging person drew in this session**, and leave a colleague's overlapping section alone. The overlap then counts twice until one of them merges it by hand (Resume on the section), which is visible in the hover figure; silently rewriting a colleague's shape under them is the worse failure. Legacy's default, on, is kept |
| Q9 | **Four pieces with no clear owner:** the Legend (Show or Hide Legend, the Markups toggle), Dimension, the region menu's rows whose features are unbuilt, and Print in the sheet menu. | **Legend to F11 with Print**, and Show Legend in the sheet menu appears when it lands. **Dimension to F11** with the annotations it is gated with (`canUseAnnotations`). **Unbuilt region rows hidden**, not disabled, until their feature lands, so the menu never offers a dead end; Print likewise |

# F31 — Arc points on Linear, Segment and Area runs

**Status:** 🔨 Working. Asked 2026-10-22 by Umer; choices answered the same day (D-713).

## The need

An estimator traces a curved wall, a radius curb or a round-cornered slab after the fact, or finds a run
traced with straight edges where the drawing bends. Today the only arc is one drawn with A while the run is
being placed, and a run that has one can no longer be edited point by point: its corners take no handles.
The estimator needs to bend an edge of a saved run, turn a corner into a curve, take a curve out again, and go
on editing the run's points with its curves kept.

## What an arc point is (D-713 Q1)

An arc point is a handle that bends the edge between two corners: the edge from corner `i` to `i + 1` becomes an
arc through it. It is stored as the run already stores an arc drawn with A (F7-S9, D-275):
`shape_meta.arcs = [{ i, cx, cy, rx, ry, a0, sweep }]`, a circle in true feet. The corners do not change, so a
Segment stays a two-point segment with a curved edge. Both quantity engines already measure this form; neither
changes (hard rule 3: the stored form, the pairing of `vertices_json` and `shape_meta` and the analytic
quantity are all as they are).

The handle sits at the middle of its arc. Dragging it pulls the arc's middle in or out across the chord: the
arc is fitted through the two corners and the handle's place projected onto the chord's perpendicular through
its middle (in true feet), so the handle stays under the hand along that line and never jumps on release. A
drag back to the chord straightens the edge (the arc goes).

## Acts

On the selected run (Linear, Segment, an Area's perimeter; never a count, never a rectangle, ellipse or
three-click arc shape):

| Where | Menu entry | What it does |
|---|---|---|
| A straight edge | **Insert arc point here** (D-713 Q2) | An arc handle appears at the edge's middle; the edge stays straight until the handle is dragged, bending live; saved on release. Esc, or a click elsewhere, drops it with nothing saved. |
| A corner with a corner on each side | **Convert to arc point** | The corner goes; the edge between its two neighbours becomes the arc through where it was. The run keeps at least its least corners (2 for a Linear, 3 for an Area). A corner in line with its neighbours (D-714): a pending arc point on the edge between them, the corner taken out with the bend in one write once it is dragged. |
| A picked corner | **A** key (D-713 Q4) | As Convert to arc point. A plain click on a corner (no drag) picks it, drawn larger; Esc or a pick elsewhere lets it go. With no corner picked, A arms Area as before. |
| An arc handle | **Arc point ✓** (D-713 Q3) | Unticking turns it back into a corner where the handle is: the edge becomes two straight edges meeting there. |
| An arc handle | **Straighten edge** | The arc goes; the edge is straight between its corners. |
| An edge that is an arc | Insert point here, Break line here | As on a straight edge; the arc is split along the same circle. |

Every act is one write of the run (`vertices_json` and `shape_meta` together, version guarded) and one undo
step. A locked item, or one a colleague holds, refuses with the item menu's reason.

## Runs with arcs become editable

A run with arcs now takes handles on its corners (not on its curve's samples) and every point edit keeps its
arcs: a corner dragged refits the arcs at it through their new ends (the run's middle carried, `carryArcs`,
as the earthwork runs already do); a point inserted on an arc splits it along its circle; a point deleted
straightens the arcs that met at it; a break keeps each half's arcs. The live quantity while dragging reads
the carried arcs.

"Add more points" stays off on a run with arcs (its write replaces the arcs list).

## Blocks

- **A — core (`lib/takeoff/engine/arcPoints.ts`, data in and out):** the handle, the bend from a pen point,
  corner to arc, arc to corner, straighten, a break that keeps arcs.
- **B — runs with arcs editable:** corner handles from the corners, drag with arcs carried (preview and
  write), insert and delete with arcs carried, edge hit along arcs, break with arcs.
- **C — arc points:** arc handles drawn and dragged, the menu entries, the pending handle, the picked corner
  and A.

Each block: the gates, the shared quantity table, one Playwright MCP smoke on a BENCH DUP (hard rule 8).

# Multi-sheet utility runs — plan (D-1246, no code yet)

**Status:** plan for the founder. Today (D-1243, D-1246) a pipe that crosses a match line is two runs: the
original "SS-1" on C10 and a continuation "SS-1 · C11" on C11, linked by `utility_run.continues_run_id`. This plan
is for the next step: **one run, with a section on each sheet it crosses.**

## 1. What the estimator gets

- One run, "SS-1", in the Takeoff panel and the run box, whichever sheet it is opened from. Under it, one line per
  sheet it crosses: "C10 · 212 LF", "C11 · 148 LF". Its total is 360 LF.
- One set of pipe fields (type, size, material, class, trench settings). Change the size once, every section follows.
- Inverts that run on: the invert where SS-1 leaves C10 is the invert where it enters C11, always, not a copy made
  at the moment Resume was pressed.
- One profile across the sheets, with a tick at each match line.

## 2. Data

- **The run stays one `utility_run` row on one LF takeoff item.** The takeoff model already lets an item have shapes
  on several sheets: each `takeoff_geometry` row has its own `sheet_id`, and the item's `sheet_id` is its home sheet.
  So no new item type is needed; the run's item gets one geometry per sheet.
- **A section** is that geometry plus a small record in the run's JSON (new `utility_run.sections`, a list): the
  geometry uuid, its sheet, its order along the run (1, 2, 3…), and optional typed inverts at its two ends. Order is
  stored, never guessed from coordinates, because sheets have their own coordinate frames (unless stitched, F19).
- **Inverts:** the run keeps its start and end inverts (or slope, or cover). A section's end invert is worked out
  along the whole run's length (start invert + slope × length so far), unless that end is typed or sits on a
  structure, which wins (as today). The joint between sections is one point in two places: its invert is one number.
- **Ends and structures:** the run's start structure is on section 1's sheet, its end structure on the last
  section's. A manhole at a match line is optional; without one, the joint is just a joint.

## 3. Quantities

- **Per sheet:** each section's length from its own sheet's scale (analytic, as every quantity is). The Sheets panel
  and a sheet's Calculate see only that sheet's section; this is the same rule as any item measured on several sheets.
- **Total:** the sum, in the run's unit. The Takeoff panel shows the total; the run box shows both.
- **Calculate stays per sheet** (D-575, and Q14 in the earthwork decisions): each sheet's Calculate works out the
  trench for its own section against its own surface, with the section's inverts taken from the whole run. The
  utility lines stay one per (sheet, type, size, depth band), so pricing does not change. A stitched site (F19) can
  later work the whole run at once, since its sheets share a frame.
- **Trench details** that span the joint (a box stretch, dewatering) split at the match line; each half is priced on
  its sheet. Tolerable: crews do not price a match line.
- **Estimating:** no change to how lines are built. The run box and the Calculate report gain a per-run breakdown
  ("SS-1: C10 212 LF, C11 148 LF").

## 4. Moving today's continuations over

- A one-time, undoable step per project (as "Move inputs to Utility Inputs", D-1247), never a silent migration on
  the founder's projects: each chain of continuations (SS-1 → SS-1 · C11 → SS-1 · C12) becomes one run. The
  continuation's geometry moves onto the original's item as section 2, 3…; its item is deleted; the original keeps its
  name and fields.
- **Only when they agree:** same type, size, material and pipe count, and the continuation's start invert equals the
  original's end invert (or is empty). Where they differ (someone changed a size on C11 on purpose), the pair stays as
  two runs and the step says so ("SS-1 · C11 kept apart: 10" pipe, SS-1 is 8"").
- A continuation's own structures, notes, sub-items and estimate rates move with it or are listed if they cannot.
- Test projects get it directly; founder projects by the button, with the row-by-row compare (D-1244 style).

## 5. Drawing and editing

- **Resume on another sheet** adds a section to the same run (instead of a new run), starting from the run's end
  invert. Continue drawing on the run's own sheet extends its last section there, as today.
- **The run box** lists the sections ("1 · C10 · 212 LF", "2 · C11 · 148 LF"); picking one opens its sheet and frames
  it. A section can be deleted (the run closes the gap in its invert line), reordered, or split off into its own run.
- **On the sheet**, a section ends at the match line with a small arrow and "continues on C11"; clicking it opens C11
  framed on the next section.
- **Undo** is one step per section added, moved or deleted, as it is per shape now.

## 6. Risks

- **Invert surprises:** today a continuation's inverts are its own; after the change, editing the original's start
  invert moves every section's inverts. Correct, but visible in prices. The box should say "inverts carried from C10".
- **Calculate staleness:** a change on C10 now makes C11's utility result stale too. The version key has to include
  the whole run, or C11 prices from old inverts.
- **Per-sheet code paths:** several places read "the run's sheet" as one sheet (the run list's `sheet_uuid`, the run
  box's sheet filter, Calculate's first-geometry-on-its-sheet, the link Q8 rules). Each must learn "a section on this
  sheet". This is most of the work.
- **Linked sheets (Q8, D-575)** already rework a run onto the grading sheet. A run with a section on both the source
  and the grading sheet must not be counted twice.
- **Project copy and share** copy geometries by item already; the sections JSON names geometry uuids, which the
  copier rewrites, so this should hold — check it.

## 7. Open questions for the founder

1. When the continuation's settings differ from the original's (a size change at a match line), is it one run with
   a changed section, or two runs? This plan says two runs.
2. Is a manhole required at every match line, or is a joint enough? This plan says a joint is enough.
3. Should the Takeoff panel show one row per run (total) with sections underneath, or one row per sheet section?
4. Move continuations over by button only, or automatically on the test projects too? This plan says button for the
   founder's projects, directly for test projects.
5. Should a stitched site's Calculate work a multi-sheet run in one pass (better trench at the joint), or stay per
   sheet like the rest?

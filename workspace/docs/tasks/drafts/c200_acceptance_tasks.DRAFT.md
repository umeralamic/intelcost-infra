# Closing the C-200 acceptance gap (draft spec, nothing built)

> **Draft, written 2026-10-02 at the founder's request. SPEC ONLY: nothing is built.** It
> spans three features:
> - **F12** (Auto Trace and Site Features): parts A and C;
> - **F18** Block C (label transfer): part B;
> - **the test data** on Hidden Valley Spec: part D.
>
> It closes when the acceptance row `regaccept-c200-from-page-3` meets D-188 Q12: C-200's cut
> and fill within ±5 % of the engineer's.
>
> **Sources:**
> - the overnight report of 2026-10-02 (task 2);
> - D-143 (Auto Trace), D-144 (suggested elevations), D-140 (Site Features), D-177 (units),
>   D-192 (F18 as built);
> - **the set's own text, read 2026-10-02:** C-200's earthwork table and drainage areas,
>   C-100's pavement legend, C-001's pavement details and general note 19, S101's slab
>   sections, and C-900's "Limits of Disturbance".

## Where it stands

| | Ours (D-192, through the link) | Engineer (C-200's table) | Short by | ±5 % band |
|---|---|---|---|---|
| Cut | 9,185 BCY | 14,263 | 5,078 (−35.6 %) | 13,550 to 14,976 |
| Fill | 7,706 CCY | 8,727 | 1,021 (−11.7 %) | 8,291 to 9,163 |

- **The link is exact:** 0.0 % on distance, misses of 0.02 to 0.05 ft, and page 3's lines land
  on C-200's dashed EG.
- **The inputs are short.** The reasons, largest first:
  1. 22 of C-200's 37 FG labels were never adopted.
  2. No subgrade is modelled.
  3. The boundary is the FG hull.

**What the engineer's table says** (C-200, "ESTIMATED QUANTITIES"):
- **Unadjusted:** 14,263 CY excavation, 8,727 CY embankment.
- **Factors:** shrink 1.10, swell 1.15.
- **Adjusted:** 16,402 and 9,599. Total 6,803 CY, export.
- **Its note:** "Stripped topsoil has not been considered in earthwork quantities." So the
  acceptance runs with **no Strip Area.**

**What the plan says about grades.** C-001 general note 19: "All proposed grades shown on the
plans are finished surface elevations, unless noted." The engineer's volumes are therefore
almost certainly to **subgrade**: finished grade less each pavement or slab section.

**The paved and built areas** (C-200's post-development drainage table):

| Area | SF |
|---|---|
| Building | 14,888 |
| Asphalt and concrete | 42,854 |
| Aggregate | 42,949 |
| Grass | 106,936 |
| Total | 321,838 |

### A rough split of the gap (an estimate to steer the work, not a result)

**Subgrade.** At the section depths below, subgrade under these areas is about
14,888 × 1.0 + 42,854 × 0.8 to 1.0 + 42,949 × 0.67 ft³, which is **about 2,900 to 3,200 CY**.
- **It adds cut** wherever the pavement sits in cut.
- **It takes fill away** wherever it sits in fill.
- **So subgrade can close at most about 60 % of the cut gap,** and it widens the fill gap.

**The FG contours not adopted carry the rest:**
- **the pond** (696, 698): a detention pond, almost all **cut**;
- **the outer ring** (705, 710) and the 700 to 704 lines: the embankment edges, mostly
  **fill**.

**So part A comes first.** The acceptance cannot be met by subgrade alone.

## Part A: adopt the rest of C-200's FG, with suggested elevations (F12, Auto Trace)

**Today (D-143, D-144):**
- "Adopt N labelled" takes only **unflagged labelled** lines.
- Five crossings among labelled FG contours are flagged ("crosses-same-surface"). They are
  tight convergences at curbs, where 701, 702 and 703 meet within 10 pt, so those lines are
  left out on purpose.
- 8 label boxes have no line through them: the contour ends at its label, or meets a line of
  the other kind there.
- **Suggestions** (`infer.ts`) come from FG neighbours. Tie-ins only go **EG ← FG**.
- **A suggestion pre-fills the popover; it is never adopted on its own** (the founder's rule).
  Each one takes its own click and Enter.

**Proposed:**

### A1. Curb crossings, resolved instead of skipped

- **Where the crossing is.** At a curb, the top-of-curb contour and the gutter contour run
  within a curb's width (6 in, a few points at 1" = 30'). Where the drafting touches or
  crosses, the TIN cannot take both.
- **The rule.** The **lower** contour is trimmed back at each crossing to a gap of the curb's
  width, so the TIN builds the curb face across the gap.
  - The trimmed piece is shown amber, with the reason "trimmed at a curb crossing with 702".
  - It is adopted only by a click, as any flagged line.
- **The volume error is negligible.** It is the curb face's sliver: under 1 CY per 100 ft of
  curb.
- **"Adopt N at curbs"** takes every curb-trimmed line of the active surface, after the list
  is shown. One undo step per run, as "Adopt labelled".
- A crossing that is **not** a convergence stays flagged and is left for the person. A
  convergence means the lines run within the curb width of each other for at least 20 pt on
  both sides of the crossing.

### A2. More suggestions for unlabelled FG lines

- **Tie-in through the link (new).**
  - **The evidence:** an unlabelled FG line ending on an EG line.
  - **Why it works:** the EG elevation is now known at every point of C-200 through the F18
    link (the mapped EG TIN).
  - **The suggestion:** that elevation, rounded to the FG interval. Only when it lies within
    0.25 ft of a contour value, and both ends agree when both tie in.
  - **Its chip:** "suggested 705 (tie-in, page 3)".
  - **This is where the outer ring's 705 and 710 lines get theirs:** they daylight on the
    existing ground.
- **Nested closed loops (the pond).**
  - **The evidence:** a closed unlabelled FG loop inside a labelled one.
  - **The suggestion:** it steps by the interval toward the loop's interior low or high. The
    side is taken from a spot grade inside, or from a labelled loop around it, when one
    exists.
  - **Its chip:** "suggested 696 (pond, from 698)".
- **The neighbours rule (D-144) is unchanged.** A line reached with two values still
  suggests nothing.

### A3. Reviewing suggestions in bulk

- **"Review N suggested"** steps through the suggested lines one at a time:
  - the canvas centres on each;
  - Enter accepts the value, a typed value replaces it, and Tab skips.
- **"Accept the N where the evidence agrees"** adopts only lines whose suggestion has two
  independent sources that agree (a tie-in and neighbours, for one), after the list is shown.
- **Both are a person's explicit act**, so the founder's rule holds: nothing is adopted on its
  own (Q7 asks).

### A4. Printed spot grades, adopted as FG spots

- **Where they are.** C-200 prints its spot grades as two-decimal numbers ("701.56",
  "703.79"). D-143 already reads them as spots, never as a contour's label.
- **"Adopt N spots"** places an FG spot at each spot's printed marker:
  - the nearest small cross, dot or leader end within 12 pt of the label;
  - with no marker, the label's anchor, flagged "no marker found".
- **The overnight check placed C-200's 58 spots by hand.** This makes that one press.
- **A spot on pavement is a finished surface.** Part C's subgrade lowers it with the
  pavement, as the plan's note 19 says.

### A's quantity-table rows

- a curb convergence: the lower line trimmed to the gap, with no crossing left;
- a tie-in through a link giving 705;
- a nested pond loop giving one interval down;
- a spot label with its cross, and one without (flagged).

### A's target on C-200

- **All 37 labelled FG contours** are adopted, or left out with a named reason.
- The FG length adopted is reported against the FG length traced.

## Part B: F18 Block C, label transfer (already specced)

[eg_from_survey_tasks.md](../eg_from_survey_tasks.md) Block C, as specced:
- **What it does.** C-200's own 195 dashed EG lines take the elevations of page 3's mapped
  contours they coincide with, through D-144's suggestion machinery: "suggested 709 (from
  page 3)", confirmed one by one or all at once.
- **The match:**
  - a dashed line takes a value when at least 80 % of its length lies within 2 ft (in real
    feet) of mapped contours of **one** elevation;
  - two candidate elevations give none;
  - a line matched for only part of its length is flagged.
- **Added here: switching EG to C-200's own lines.**
  - Once C-200's own EG is labelled, keeping the link's EG too would put every contour in
    twice (crossings everywhere).
  - Block C ends with **"Use this sheet's own existing grade"**. It sets the link's
    `eg_source` to false (the column exists, D-192), so the link stays for alignment and
    Overlay. One click turns it back.
- **Why it matters for the acceptance.** The engineer computed against **his** EG linework,
  the dashed lines on C-200. Page 3's survey lines are close (the match score is 34 %, and
  that is mostly coverage), but not the same lines. Computing on C-200's own lines removes
  that difference.
- **Quantity rows**, from the spec:
  - a dashed line on a mapped contour takes its value;
  - a line between two contours takes none;
  - switching the source leaves the volume of a duplicated surface unchanged.

## Part C: pavement and building-pad subgrade through Site Features (F12)

**Today (D-140):**
- A Site Feature's "Proposed Grade to Subgrade Depth" lowers FG inside it. The newest feature
  wins an overlap.
- The undercut and prep follow the outline.
- The depth is typed as one number.

### C1. Pavement sections as presets (proposed)

**Each project keeps a list of sections:** a name, and its layers, each with a thickness and a
material. In the Site Feature dialog:
- "Section" picks one;
- the depth becomes the layers' sum, shown as a sum ("1.75 + 2 + 6 = 9.75 in");
- the depth can still be typed.

**The sections on this set, as I read them** (Q1 asks you to confirm each). The PDF text
interleaves the details, so the grouping is my reading.

| Section (C-100 legend) | Layers (C-001 details; S101 for slabs) | Depth |
|---|---|---|
| 1 Concrete sidewalk | 4" ODOT 451 concrete on 4" (min.) ODOT 411 | 8 in |
| 2 Standard duty asphalt | 1.75" ODOT 441 surface, 2" ODOT 441 intermediate, 6" ODOT 304 aggregate base | 9.75 in |
| 3 Heavy duty asphalt | 2" ODOT 441 surface, 2" ODOT 441 intermediate, 8" ODOT 304 aggregate base | 12 in |
| 4 Heavy duty concrete | 8" ODOT 451 concrete on 6" (min.) ODOT 411 | 14 in |
| 5 Heavy duty aggregate | 2" ODOT 411 on 6" ODOT 304 | 8 in |
| Building slab, 6" | 6" slab, 6" compacted granular limestone base (S101) | 12 in |
| Building slab, 4" (office) | 4" slab, 4" compacted granular limestone base (S101) | 8 in |

**Each layer's volume** (area × thickness) can become its own estimate line, under its
material ("Aggregate Base" is already a built-in material, D-140). That is how the plan's
table prices them. Q2 asks whether that is wanted now or later.

### C2. Drawing the pavement and pad areas

- **Where:** on C-200, with Snap PDF on the curb and edge lines, as a Site Feature per section
  (Q3).
  - **Why not C-100's hatches:** they would need features read through a link, which is new.
  - **Recommended:** C-200, with C-100 in Split view as the guide.
- **The building pad:**
  - the footprint as a Site Feature at the slab section's depth;
  - and **a flat FG at the finished floor**: a closed FG contour on the footprint at the floor
    elevation, so the TIN does not interpolate across the building from the contours around
    it.
  - C-200's text does not print an absolute floor elevation (S100 reads "FIN FLR 100'-0"",
    a relative datum), so Q4 asks for it.

### C's quantity-table rows

- a section's layers summing to its depth;
- a pad at a flat FG with a 1 ft depth adding its area × 1 / 27 of cut;
- a pavement in fill reducing the fill by its area × depth / 27.

## Part D: the inputs on Hidden Valley, then the re-run

1. **The boundary:**
   - C-900's **Limits of Disturbance**, traced on C-200 (or carried from C-900 through a link,
     if C-900 is the same base), in place of the FG hull (Q5);
   - **no Strip Area** (the table's note).
2. **The FG:** part A run on C-200. Your 5 hand-drawn FG contours are kept, and the 10 adopted
   overnight too.
3. **The EG:**
   - part B on C-200's own dashed lines;
   - computed **both ways** (through the link, and on C-200's own lines) and both reported
     (Q8).
4. **The subgrade:** part C's features for the five pavement sections and the pad.
5. **Calculate,** then compare the unadjusted cut and fill against 14,263 and 8,727, ±5 %.
   - The row `regaccept-c200-from-page-3` is re-pinned from a snapshot of the new inputs.
   - The adjusted figures and the export are reported beside the engineer's in D-177's units,
     not accepted on.
6. **If it still misses:**
   - the report splits the miss by cause, with the run repeated without the subgrade, without
     the newly adopted contours, and on the hull;
   - each difference is named;
   - nothing is tuned to hit the number.

## Blocks (proposed)

- **A. FG adoption** (F12, Auto Trace): A1 curb trims, A2 suggestions (tie-in through the
  link, nested loops), A3 review and accept-agreeing, A4 spots; the quantity rows.
- **B. F18 Block C:** label transfer and "Use this sheet's own existing grade".
- **C. Sections** (F12, Site Features): the project's section list, the dialog's picker, the
  layer lines (if Q2 says now).
- **D. The run on Hidden Valley:** inputs drawn, Calculate both ways, the row re-pinned, the
  report.

The order is A, B and D's first pass (the size of the FG effect is measured before C), then C
and D's final pass.

## What I need from you (questions, each with a recommendation)

1. **The section thicknesses.** Confirm the table in C1, which I read from C-001's details and
   S101's notes; the PDF text interleaves the details. In particular:
   - which hatch on C-100's legend is which section;
   - whether the concrete sections' "4" (min.)" and "6" (min.)" ODOT 411 are taken at the
     minimum.

   *Recommend:* at the minimum, as an engineer's take-off would.
2. **Layer lines now or later.** Should each section's layers become their own estimate lines
   (aggregate base, asphalt, concrete) now, or only the depth for the earthwork?
   *Recommend:* the depth only now; the layer lines with F10's assemblies.
3. **Where the pavement areas are drawn.** *Recommend:* on C-200 with Snap PDF, C-100 beside
   it in Split view. The alternative, C-100's areas read through a link, is new machinery.
4. **The building's finished floor elevation, and its pad section.**
   - C-200's text gives no absolute floor elevation. Is it printed as a graphic on C-200, or
     on another sheet?
   - Which slab governs the pad? 6" on 6" base for the warehouse, 4" on 4" for the office.
   - Is there any over-excavation under the building, from a geotechnical report the set does
     not carry?

   *Recommend:* each slab over its own footprint, no over-excavation unless a report says so.
5. **The work boundary.** *Recommend:* C-900's Limits of Disturbance, traced onto C-200.
   Confirm that is the limit the engineer computed to.
6. **The curb rule (A1).** Trim the lower contour at a curb convergence, adopted by a click or
   by "Adopt N at curbs". *Recommend:* yes.
7. **Accepting suggestions in bulk (A3).** "Accept the N where the evidence agrees" is an
   explicit press over a shown list, never automatic. Does that keep your rule, "flag what
   cannot be labelled, never guess"? *Recommend:* yes, with single sources still one by one.
8. **Which EG the acceptance is judged on.** *Recommend:* C-200's own dashed lines with
   transferred labels (the engineer's linework). Report the link figure beside it as a check.
9. **Printed spots (A4).** Should "Adopt N spots" be a tool? It is beyond legacy, which places
   spots by hand. *Recommend:* yes, it is how the overnight check needed 58 of them.
10. **Writing on Hidden Valley Spec.** May the build leave its boundary, features and adopted
    lines on C-200 for your click check, as the overnight link was left? *Recommend:* yes,
    listed in the report, with everything else cleaned up.
11. **Topsoil.** The engineer's table excludes stripped topsoil. *Recommend:* the acceptance
    runs with no Strip Area; the strip is priced separately, as the plan's note says.

## Progress

- [x] Draft written 2026-10-02 (spec only, nothing built).
- [ ] The founder's answers.
- [ ] Blocks A to D.

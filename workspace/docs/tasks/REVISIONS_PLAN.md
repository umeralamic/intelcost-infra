# Revised plan sets: the plan

> **Plan only, 2026-10-29 (the founder's item 5). Nothing built.** It brings the F21 draft,
> [revision_sets_spec.md](revision_sets_spec.md) (2026-10-11, not adopted), up to what the readers do
> today, and puts every open choice as a question with a recommended answer. The draft's detail (pairing
> rules, alignment, carry-over steps, data model, api) stands unless this plan says otherwise; the two are
> read together. On the founder's answers: the decision logged as the next `D-NN`, the draft renamed
> `revision_sets_tasks.md`, F21 to In Progress.

## The problem

A bid's drawings change while it is priced: an addendum of a few sheets, or a full reissue. Today a
revised file is just another Load. It makes new, empty sheets beside the old ones (the 2026-10-29 run:
the same file loaded again keeps its names and scales; a revised one starts from nothing). So:

- the takeoff stays on superseded sheets, or is redrawn by hand;
- nothing says which new sheet replaces which, or what changed on it;
- the estimate has no memory of what the revision did to it.

**Problem → solution.** A Load whose pages revise sheets already in the project is offered as a
revision. Each new sheet is matched to the sheet it replaces by number, title and how the page looks;
the person reviews the matches; Apply moves every measurement onto its new sheet through the two pages'
alignment, keeps the old sheet read-only as the earlier revision, and flags each measurement whose
drawing changed under it. Compare lays the two revisions over each other, already aligned. Estimating
follows the current revision and lists what each revision changed.

## What is different since the draft (2026-10-11)

1. **Sheet numbers are read well enough to pair by.** On the 103-sheet answer key: numbers right on
   98 % of sheets (every scan with the AI); titles 96 % (D-843, D-847, D-853). The draft's number key is now the right first test, and the title a real check.
2. **A sheet's image can be read as text** (Tesseract, D-852). A scan's or a drawn title block's
   number can be read on the server, not only by the AI, and its dimension strings give the change
   detection text to compare on scans too.
3. **The person's own number wins.** A number typed by hand (`name_source = "user"`) is the sheet's
   key for pairing, never the read one; a new sheet's read never renames an old one.
4. **Overlay is built and aligned by hand** (D-195, D-239, D-297): its matrix (old page to new page) is
   the alignment every carried measurement goes through. The draft's automatic alignment fills it in.
5. **The page pool and its workers** (D-321 to D-326, D-845, D-849, the OCR worker of D-852) carry the
   new pages' preparing, reading, hashing, alignment and change detection: no new kind of worker.

## The flow

1. **Load, recognised as a revision.** On the load screen, once the chosen pages' numbers are read,
   if half or more of them match current sheets: "These pages revise 14 sheets already in takeoff.
   Load as a revision" with the revision label (prefilled from the file name, "Addendum 2"). Ticked
   by default when the match is that strong, never applied without the person (Q1). "Load a
   revision…" in the Sheets panel's + menu opens the same screen with the tick on.
2. **Matching review**: one row per pair, grouped Needs a decision, Matched, New sheets, Not in this
   revision. Each row: old sheet, new sheet, how sure (High, Check, Low, Set by you), why ("Title
   changed: FIRST FLOOR PLAN → LEVEL 1 PLAN", "Renumbered?"), the share of the drawing that changed
   once known, the alignment's state, and a carry tick. Either side re-pickable by hand.
3. **Alignment** of each match on the server, automatically (text anchors, else the same page
   unchanged); one it cannot align says "Align by hand", Overlay's two-point step on that pair.
4. **Apply**: "Carry takeoff to 14 sheets". The measurements move; the new sheets become current; the
   old ones read-only revisions under them. Each pair in its own transaction.
5. **What changed**: a measurement whose drawing changed under it is flagged on the shape and the
   sheet's row (the ⚠ Review chip, D-331), with its reason; Accept, edit or delete clears it.
6. **Compare**: Overlay in Comparative mode, aligned, with a revision picker.
7. **Estimating**: quantities follow the current revision; "Revision changes" lists, per item, old →
   new quantity and cost.

## Matching (the draft's `revision_pair.py`, changed where marked)

- **Number key**: as the draft (case, separators between letters and digits, leading zeros, a printed
  revision mark dropped; dots between digits kept, `A1.01` ≠ `A101`; a trailing letter kept).
- **Title score**: token and character similarity of the normalised titles, 0 to 1.
- **Page similarity** *(new: two measures, not one)*: a 64-bit perceptual hash of the thumbnail
  (cheap, every page), and for a pair that needs it, the share of unique words on both pages (outside
  the title block) at matching places after alignment. Never enough on its own to pair.
- **How sure**:
  - same number, title ≥ 0.6: **High**;
  - same number, title below: **Check**, "Title changed";
  - a number new to the set whose title matches one old sheet alone that is missing from the new set,
    and the pages look alike: **Check**, "Renumbered?";
  - one old number, several new with a letter or part suffix: **Check**, a split;
  - two new sheets with one number: **Needs a decision**, the better match proposed;
  - no number either side: by page order within one page size and look, **Low**;
  - *(new)* same number, page hash within 2 bits and under 1 % of the drawing changed: **Unchanged**,
    carried with no flags (a reissue's untouched sheets).
- One to one, best first; the person can override anything, and a hand match is never changed by a
  later read.

## Carrying the takeoff over

As the draft, in short:

- **Moved, not copied**: each measurement keeps its id, so its estimate line, pricing, assemblies,
  sub-items, comments and history follow it. `vertices_json` and `shape_meta` go through the alignment
  together (invariant 2); arcs stay arcs; deducts follow their section; count marks move and their
  item's symbol is untouched (invariant 1).
- **Quantities are recomputed** on the new sheet from its own scale, analytic, never sampled
  (invariant 3). Earthwork results go stale; Calculate stays the person's.
- **The old sheet is archived exactly as it was** (its rows, as the item snapshot keeps them), read-only,
  and is what Roll back restores.
- **The scale**: the new sheet keeps what its read found. An unscaled new sheet takes the old one's
  through the alignment only when the alignment's own scale agrees within 0.5 %, shown as "Carried from
  Rev 1", never over a scale the read proved (Q8).
- **Links** (survey links, joins, overlays) are re-pointed through the alignment and marked stale;
  nothing is recalculated. Never on Hidden Valley Spec's earthwork in a smoke (D-232).

## Showing what changed

- **Under each carried measurement**: its footprint on both pages, old through the alignment. Vector
  sheets: the drawn ink within 2 pt of the other page's, the share changed; text: a dimension or tag
  string in it that changed or went; a revision cloud the shape meets. Scans: the two images compared
  inside the footprint, and *(new)* their OCR'd dimension text. Flagged at 15 % ink changed, any changed
  dimension, or inside a cloud (Q5).
- **On the sheet's row and the matching screen**: the share of the whole drawing that changed.
- **In Compare**: the flagged outlines drawn over the two revisions.

## Keeping the old revision

Every revision of a sheet shares a lineage; one is current. Every list (Sheets panel, Find, Auto Count's
set, exports, Scale All, naming) reads current sheets only, through one filter. The row's "Rev 2" chip
opens the sheet's history: each revision's label, date, who applied it, Open (read-only, drawn from its
archive) and Compare. The api refuses any write to an old revision, and says why.

## Estimating

The carried item keeps its line, so rates and packages stay and its quantity is the new one. Each
revision records, per item, old and new quantity, sheet and kind (unchanged, changed, flagged, withdrawn,
not carried). Needs attention gains "Changed in the latest revision" and "Flagged by a revision"; a hidden
"Δ Rev" column; a "Revision changes" report and Excel sheet with old → new quantity and Δ cost at today's
rates. Before Apply, the estimate as it stands is saved to Project files (Q7).

## Blocks

Each block: the gates, the shared quantity table (with the draft's carry rows: a 100 × 50 ft area
carried at twice the scale and turned, 5,000 SF both engines; an arc carried at half scale; a deduct;
12 count marks), and one smoke on a throwaway account on a hand-made revision of a copy of a real set
(a moved viewport, a changed dimension, a cloud, a renumbered sheet).

| Block | What ships | Estimate |
|---|---|---|
| A. Data and matching | lineage, current flag, revision, pair and archive tables (one additive migration); the number key and title score; the page hash in the page pool; the current-sheets filter used by every list | 1.5 days |
| B. Recognised on Load, the matching screen | the load screen's offer and label, "Load a revision…", the review dialog with its groups, pickers, ticks, full reissue, save and discard; every UI state | 2 days |
| C. Alignment | text anchors, identity, the scale check, a second moving part noted; the matrix on the pair's Overlay row; "Align by hand" | 1.5 days |
| D. Carry-over | the shape transform (app and api twins), the carry task, archive, deducts, splits, counts, items, scale, links, read-only old sheets | 3 days |
| E. What changed | ink, text, clouds, scans (images and OCR text); flags on the shape and row; Accept; the item's ⚠ | 2.5 days |
| F. History and Compare | the revision chip and history, the old revision read-only, Overlay's revision picker and "Show changes" | 1.5 days |
| G. Estimating | the change record, review state, Needs attention, Δ Rev, the report and Excel sheet, the save before Apply | 1.5 days |
| H. Roll back, audit, realtime | whole and per pair; audit rows; the colleague's banner; one open revision a project | 1.5 days |

**About 15 working days.** A first useful cut is **A to D** (8 days): matched, aligned and carried, the
old sheet kept, no flags yet. **E should follow at once**: without it a carried measurement on a changed
drawing looks right and is not.

## Questions, each with the recommended answer

1. **How is a revision started?** *Recommended:* offered on Load when half or more of the chosen
   pages' numbers match current sheets (ticked then, the person can untick), and by "Load a
   revision…". Never carried without the person's Apply.
2. **Addendum or full reissue by default?** *Recommended:* addendum: an old sheet with no match stays
   current, untouched. "Full reissue" is a switch on the matching screen; on, unmatched old sheets are
   withdrawn (read-only, their items kept and listed).
3. **Which matches carry on Apply?** *Recommended:* High and Unchanged ticked; Check and Low unticked
   until the person ticks or re-matches them.
4. **Move the measurements, or copy them onto the new sheets?** *Recommended:* move, so each item keeps
   its estimate line, pricing and history; the old sheet's takeoff is kept in its archive.
5. **How sensitive is "may have moved"?** *Recommended:* fixed in v1: 15 % of the ink under a
   measurement changed, any changed dimension text, anything in a revision cloud; tuned on the first
   real addenda; no slider.
6. **Reviewed, approved or locked items that changed.** *Recommended:* changed or flagged items go back
   to unreviewed, recorded in their history; a locked item is carried with its lock and flagged for its
   holder.
7. **Freeze the estimate before a revision?** *Recommended:* no new estimate state; Apply saves the
   estimate as it stands to Project files ("Estimate before Addendum 2.xlsx", ticked by default), and
   the Revision changes report says what moved.
8. **Carry the old scale onto an unscaled new sheet?** *Recommended:* yes, only when the alignment's
   scale agrees within 0.5 %, shown as "Carried from Rev 1", flagged Check scale, never over a scale
   the read proved.
9. **The revision's label.** *Recommended:* typed by the person, prefilled from the file name; reading
   each sheet's revision block later.
10. **How long are old revisions kept?** *Recommended:* for the project's life, read-only, counted in
    storage; deleted with their current sheet or the project.
11. **Scans.** *Recommended:* matched by their OCR'd or AI-read number; aligned as the same page when
    same-sized and their images agree, else by hand; changes from the images and their OCR'd text.
12. **A sheet whose parts moved separately** (a plan and its details). *Recommended:* v1 aligns the
    largest part and flags every measurement in the part that moved differently; two alignments per
    sheet later.
13. **Auto Count items.** *Recommended:* marks flagged one by one in v1; later, the item keeps its
    sample so a revision can offer a rescan of the new sheet.
14. **Roll back after work on the new sheets.** *Recommended:* allowed while it is the latest revision
    of those sheets; the work done since Apply is listed in the confirm and lost.
15. **Earthwork on a revised sheet.** *Recommended:* contours, spots and boundaries carry as shapes;
    survey links, joins and results re-pointed and marked stale; Calculate is the person's.
16. **Who may load and apply a revision?** *Recommended:* whoever can upload documents and edit takeoff,
    on a plan that edits takeoff; viewing old revisions and Compare for anyone who can open the project.
17. **AI credits for a revision's scanned pages.** *Recommended:* as on Load (D-321 2), charged to the
    person loading, said in the footer; the OCR read is free.
18. **Unchanged sheets in a reissue** *(new)*. *Recommended:* matched as Unchanged (same number, page
    hash within 2 bits, under 1 % of the drawing changed), carried silently with no flags, still shown
    on the matching screen.
19. **Where a new, unmatched sheet goes in the Sheets panel.** *Recommended:* in the folder most of the
    revision's matched sheets are in, beside its discipline's neighbours; else the file's own folder.

## Risks

- **A list that misses "current only"** shows an old sheet twice or measures it twice. One filter used
  everywhere, every sheet query checked in Block A, and old revisions drawn from their archive.
- **A wrong alignment moves every measurement on a sheet.** The acceptance thresholds, the scale check,
  the sheet's changed share on the matching row, Align by hand, Roll back.
- **Flag noise** from a set re-plotted with new line weights: ink compared by length within a tolerance,
  "Accept all on this sheet", the threshold tuned on real addenda.
- **Large sets** (100+ sheets, thousands of shapes): one transaction per pair in the worker; change
  detection in the page pool's cap.

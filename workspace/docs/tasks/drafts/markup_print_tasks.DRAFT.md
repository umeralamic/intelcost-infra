# F11: Markups, Dimension, Legend, Print, Find Text, snapshots and history (DRAFT)

> **Draft, written overnight 2026-09-27 for the founder's review.** Nothing here is
> decided until the questions at the end are answered and logged. Written from legacy's
> source: `Toolbar.tsx`, `ReviewMarkupLayer.tsx`, `HighlighterLayer.tsx`, `NoteLayer.tsx`,
> `LegendOverlay.tsx`, `lib/takeoff/print/renderSheetForPrint.ts`, `FindTextDialog.tsx`,
> `lib/takeoff/search/textSearch.ts`, `EvidencePanel.tsx`, `HistoryDrawer.tsx`, and the
> tables `review_markups`, `takeoff_highlights`, `takeoff_notes`, `evidence_snippets`,
> `takeoff_item_evidence_links`, `takeoff_item_history`. D-39 Q9 moved Legend, Print and
> Dimension here; D-36 Q5 moved item history here.

## The problem

Takeoff is measuring; a set of drawings also needs marking up for the team: a cloud
round a change, a callout, a highlight, a note, a dimension to check the scale, a legend
of what was measured, a printout, a search for words on the sheets, and snapshots of
details linked to the items they explain. Legacy has all of them. The new app has none.

**Problem → solution.** Estimators cannot mark up, print or search the drawings. →
Legacy's six annotation tools (Dimension, Highlight, Cloud, Callout, Arrow, Note), its
Legend, Print, Find Text with "Create" from the hits, snapshots linked to items, and item
history, on the pdf.js canvas, stored and live through the api.

## What legacy does

**Vocabulary.** Legacy says "markups" for takeoff geometry and, since 2026-08-25, also
for the annotation family on the toolbar toggle; Print, the sheet menu and the permission
still say "Annotations" (Q1).

### The annotation tools

| Tool | Tooltip | Where |
|---|---|---|
| Dimension | "Dimension (D) — click two points to measure & verify scale" | every tab |
| Highlight (split) | "Highlight — drag a rectangle to place a translucent highlight (click ▾ to change color)" | takeoff |
| Cloud | "Cloud — drag a box to place a revision cloud" | Collaborator tab |
| Callout | "Callout — drag from the point of interest to where the text should sit" | Collaborator tab |
| Arrow | "Arrow — drag from tail to head" | Collaborator tab |
| Note (split) | "Note — drag to place a text note (click ▾ to change color / opacity / text color)" | takeoff |

- **Storage:** `review_markups` (cloud `{x,y,w,h}`, arrow `{x1,y1,x2,y2}`, callout
  `{tipX,tipY,boxX,boxY}`, with colour, line width, bubble size, head size, font, size,
  bold/italic/underline, line end, border, background, text colour, radius, opacity,
  font scaling); `takeoff_highlights` (rect, colour #FFEB3B, opacity 0.35);
  `takeoff_notes` (rect, colour, opacity 0.9, text, text colour, size, auto-fit). All in
  normalised page units. A cloud's scallops are a fixed 9 pt; resizing changes their
  count.
- **Style defaults** in the browser (`intelcost.toolStyles.v1`): cloud #E53935, 6, 24;
  callout #E53935, Arial 12; arrow #E53935, 5, head 30; highlight #FFEB3B 0.35; note
  #FFD54F 0.9. The database defaults differ.
- **Properties panel** per kind ("Color", "Line width", "Bubble size", "Head size",
  "Font", "Font size", "Style", "Line end", "Border", "Background", "Text scale": "Fixed
  size" / "Scale with zoom", …).
- **Editing:** move, 8-handle resize, endpoint and tip drags, double-click edits text,
  Enter commits, Esc cancels; Delete. Cloud, callout and arrow delete without asking and
  undo; highlights and notes ask ("Delete highlight?", "Delete note?"). An empty note
  deletes itself.
- **Visibility:** one "Markups" toggle (hidden from the toolbar by default) and the
  sheet menu's "Show All" / "Hide All" → "Annotations".
- **Permission:** `canUseAnnotations` ("Use annotation tools"), every seat but viewer;
  the database checks "not a viewer" instead.
- **Realtime:** highlights, notes and docks are live; clouds, callouts and arrows are not
  (a legacy gap).

### Dimension

Two clicks draw a measured line: ticks or arrowheads, a label box above, inside or below,
the length at the sheet's scale in feet-inches ("calibrate scale" when unscaled). Style:
"Color", "Line width", "Heads" (Arrows/Ticks/Both/None), "Head size", "Text size",
"Label". **Not stored**: cleared on a sheet change, never printed, never shared. After a
calibration, "Scale set — verify with a known dimension" offers "Verify", which arms it.

### Legend

A floating box on the sheet ("Legend (N)"): the active sheet's measured items, grouped by
folder, each with its swatch or symbol, name, "· perim N LF" for areas, and this sheet's
quantity. Dragged and resized; its place per sheet in the browser. Off by default ("Show
the legend when a project opens"). **Not printed.**

### Print

"Print" (the current page), and "Print Current View", "Print Multiple Pages…", "Print All
Pages with Takeoffs", "… with Annotations", "… with Takeoffs or Annotations". "Print
Multiple Pages" lists sheets with "Takeoffs" / "Annotations" badges, "All", "None",
"Other ▾", "{n} selected", "Next". Each page is rastered at 2000 px with its takeoff and
annotations and handed to `window.print()`; the browser picks paper or PDF. Takeoff
prints only when shown; annotations always; no legend, dimensions or title block.

### Find Text

"Find Text (Ctrl+F) — search words printed on the drawings": pdf.js text, no OCR ("No
searchable text (scanned sheet)"). "Current Page" / "All Pages" / "Choose Pages";
"Keywords (All)", "Keywords (Any)", "Phrase", "RegEx"; "Contains", "Starts With", "Whole
Words"; "Case Sensitive". Hits grouped by sheet, checkboxes, "{n} match(es) on {m}
page(s)". **"Create ({n})"**: "Highlight" (a highlight per hit) or "Measurement" (a New
Measurement dialog, count by default, that makes an item with no shapes: the hits' boxes
are dropped, a legacy fault).

### Snapshots and evidence

"Snapshot (S) — drag a box to capture an area": a PNG in storage with a name, a tag (16
kinds and custom), notes; the "Bookmarks | Snippets" panel; "Link Screenshot (n)" on an
item's menu links snapshots to items (many to many). Estimating's "Details Ref." lists
the linked snapshots' sheets (F9). Legacy also stored OCR text and AI summaries of
snapshots.

### Item history

`takeoff_item_history` with eleven action types, of which legacy writes three
(calibration changed, duplicated, quantity recalculated): "Item history", "No history
yet.", and Estimating's "Change history" (When, Who, Change).

## Design

- **Tables:** `sheet_markup` (one table, `kind` cloud / callout / arrow / highlight / note
  / dimension, `geometry`, `style` JSON, `text`, `z_index`, `author_id`), so every kind is
  stored, live and permissioned the same way (Q2); `snapshot` and `snapshot_link`;
  `takeoff_item_event` for history, written by the api on every item write (Q6).
- **Geometry and hit rules** in `lib/takeoff/markup/` (data in, data out), beside F7's
  engine; clouds' scallops from legacy's `review/geometry.ts`.
- **Print** rendered in the browser from pdf.js as legacy's, or on the api worker as a
  PDF (Q4).
- **Realtime:** `sheet.markup.changed` on the project topic for every kind (beyond legacy
  for clouds, callouts and arrows).
- **Permission:** `canUseAnnotations`, enforced by the api (legacy checked "not a
  viewer" in the database, contradicting custom roles).

## Subtasks

# Block A: Markups
- **F11-S1** Highlight and Note: draw, select, move, resize, text, style, delete.
- **F11-S2** Cloud, Callout, Arrow: the same, with their handles and properties.
- **F11-S3** Visibility, selection with takeoff (box select, Ctrl+A), undo; live.

# Block B: Dimension and Legend
- **F11-S4** Dimension (Q3), and "Verify" after a calibration.
- **F11-S5** Legend.

# Block C: Print
- **F11-S6** Print the page, the view, several pages, and the three "All pages with …".

# Block D: Find Text
- **F11-S7** The search panel and its modes, highlighting hits.
- **F11-S8** Create → Highlight, and Create → Measurement (Q5).

# Block E: Snapshots and history
- **F11-S9** Snapshot, the Snippets panel, Link Screenshot.
- **F11-S10** Item history (Q6).

# Block F: Collaboration
- **F11-S11** Two windows: every markup kind appears live; a viewer's tools are off and
  the api refuses them.

## Not in F11

| Legacy behaviour | Owner |
|---|---|
| Snapshot OCR and AI summaries | F14 (AI tools) |
| The "AI Verified" scale witness | F14 |
| Docks (a snapshot pinned on another sheet) | with Q2's answer |

## Questions for the founder

1. **One word.** "Markups" or "Annotations" for the family? Recommendation:
   **"Markups"**, the toolbar's current word, everywhere.
2. **One table for every kind** (legacy has three, with different permissions and only
   some live). Recommendation: **one `sheet_markup` table**, all live.
3. **Dimensions stored?** Legacy's vanish on a sheet change. D-39 Q9 says Dimension is
   frequently used. Recommendation: **store them** as markups (shared, printed, live).
4. **Print: browser or PDF?** Legacy rasters in the browser and calls `window.print()`,
   no paper size, no legend. Recommendation: **legacy's browser print** first, adding the
   legend when shown; a server PDF later.
5. **Find Text → Measurement** drops the hits in legacy. Recommendation: **a count mark
   at each checked hit's centre** (a Count item of N marks), so the quantity is the hits.
6. **History.** Legacy writes 3 of its 11 kinds. Recommendation: the api writes an event
   on every item write (created, edited, deleted, override set and cleared, duplicated,
   recalculated, classification and folder changes), since every write already passes
   through it.
7. **The Collaborator tab.** Legacy shows Cloud, Callout and Arrow only there, and arming
   Highlight, Note or Dimension jumps to the takeoff tab; Find Text does not open there.
   Recommendation: every markup tool on the takeoff page for any seat with
   `canUseAnnotations`; the Collaborator plan's mask is F16's (billing and plans).
8. **Style defaults per browser** (legacy). Recommendation: on the user, sparse, as D-39
   Q7 put the canvas settings; the legend's place per sheet stays per browser.

# F13: Auto Count

> **Spec, adopted 2026-10-01 with the founder's answers (D-189).** Build order: Blocks A,
> B, C, D, F (Vector), then E (Image).
> - **Sources:** legacy's source on `UmeralamDEV` (e99cddcb, read in full), its plan files,
>   and live legacy driven at 1440 × 900.
> - **Written from the draft** `docs/tasks/drafts/auto_count_tasks.DRAFT.md` (removed). The
>   main changes: **rotation search in Vector mode** (Q6), **"Overlap allowed"** (Q12),
>   **Create honours every dialog field** (Q13), **one undo of exactly the batch** (Q17) and
>   **"Add to the selected count item"** (Q18).
> - PARITY §17 is rewritten against legacy's code (see "PARITY §17 against the code").

## The problem

Counting fixtures by hand means a click per symbol on every sheet: hundreds of clicks per
set, easy to miss one. Legacy finds every instance of a symbol for you. You box one symbol,
it scans the page or the set, you review the matches, and they become one count item. None
of that exists in the new app.

**Problem → solution.** One click per symbol. → Legacy's Auto Count, with the founder's
changes:
- the region menu's "Auto Count" opens a panel that scans at once (Vector by default,
  Image for scans);
- Vector finds the symbol **turned by quarter turns and mirrored** too (Q6);
- the matches are shown as cards, checked above a sensitivity bar;
- the person reviews them;
- **Create (N)** makes one count item with a mark at each match, or adds the marks to the
  selected count item (Q18), undone as one step.
- It is local math only: no AI, no credits.

## The answers (D-189)

| # | Question | Answer |
|---|---|---|
| 1 | Where matching runs | Pure `lib/takeoff/autoCount/`, run in a browser **Web Worker**. A Celery twin only if whole sets must scan in the background. |
| 2 | Modes in v1 | **Vector first** (Blocks A to D, F); **Image as Block E right after**, with a speed target measured on real scans. |
| 3 | OpenCV coarse arm | **Dropped.** |
| 4 | Memory contract and canvas probe | Keep **reject-never-clamp**; measure the budget on the bench; exclusions independent of the browser. |
| 5 | The source sheet when navigating | **Pinned for the panel's life.** Card navigation never rescans; "click to navigate to source" goes to the source. |
| 6 | Rotation search | **Changed: Vector searches 0°, 90°, 180° and 270°, plus the mirror.** Image's "8" searches all 8 angles. |
| 7 | Image scale tolerance | Legacy's: 0.95, 1.00, 1.05. |
| 8 | Sensitivity default and persistence | 78, **remembered per person**; ≥ 0.999 always checked. |
| 9 | Fixed floors | Kept fixed: vector 0.15, image 0.45, drawer 0.40. |
| 10 | Valley cut and drawer | Kept: 0.06 gap, 0.08 near-bar band, 20 shown, display only. |
| 11 | Saturation | **Kept as a block**, with a message: select the symbol more tightly. |
| 12 | Min Match Spacing | **"Overlap allowed"**, higher keeps more; **the Layers re-filter uses it.** |
| 13 | Dialog fields Create honours | **Every one:** symbol, size, opacity, evidence links, cost row, dimensions, sub-items, rough measurement, folder, layer, colour, name. |
| 14 | Run shape | One shape row per mark (D-32). No sentinels. |
| 15 | One item or one per sheet | One item, marks on each sheet. |
| 16 | Mark position | The matched window's centre. |
| 17 | Undo | **One step removes exactly the batch's marks.** A new item goes with them; marks added by hand since stay. |
| 18 | Append to an existing count item | **Yes:** "Add to the selected count item" when one is selected. |
| 19 | Overlay colour while reviewing | The colour the item will get. |
| 20 | Auto-rescan or a Scan button | Scan on open; settings rescan on closing the gear. |
| 21 | Esc | Stops a running scan; a second Esc closes the panel. |
| 22 | Entry points | The region menu now; "Auto Count this symbol" on a count item's menu later (Ideas). |
| 23 | Where settings persist | **Per person on the api,** with the Takeoff Settings (D-82). |
| 24 | Threads | Behind Auto; a setting only if measurements show a need. |
| 25 | Layers control | Auto by default, hidden without PDF layers. |
| 26 | Debug strip | A developer flag, never shown to users. |
| 27 | The unbuilt backlog | **Out of F13.** The reference editor and several references go under Ideas. |

**Spec details decided overnight (D-189, pending founder review):**
- **Vector orientations are exact.** A vector symbol turned a quarter turn or mirrored is the
  same strokes under an exact transform, so the template's strokes are transformed and
  re-rasterised, never resampled from pixels.
- **The Rotation search control shows in both modes.** Vector: 4 (90° steps, the default)
  or 1. Image: 8, 4 (the default), 2 or 1.
- **Include Mirror is on by default in Vector** (legacy's off), by Q6's "plus mirror". It adds
  the mirrored template at each searched angle. Its amber warning stays when on.
- **Each card names its orientation** in the tooltip: "Rotated 90°", "Mirrored, 270°".

## How legacy was read and driven

- **Source** (`src/lib/takeoff/autoCount/`):
  - `scan`, `vectorMatch`, `imageMatch` and its worker, `resultPipeline`, `valleyCut`,
    `settings`;
  - `overlayPaint`, `panelDrag`, `rasterBudget`, `canvasProbe*`, `grayPage`, the OpenCV arm
    (`opencvCoarse*`, `opencvLoader`);
  - the UI files `AutoCountPanel`, `AutoCountCandidateCard`, `AutoCountSettingsPopover`,
    `AutoCountOverlay`, `RegionSelectMenu`;
  - the handlers in `ProjectTakeoff.tsx`.
- **Plans:** `auto-count-symbol-search-batch-count-placement-2026-08-26`,
  `auto-count-a-production-evidence-folded-into-the-perf-work-2026-08-26`,
  `auto-count-image-mode-final-close-out-2026-08-26`,
  `auto-count-image-mode-memory-contract-repair-p1-p5-evidence-2026-08-27`,
  `auto-count-ux-build-1-hover-highlight-draggable-panel-click-2026-08-27`. Where a plan and
  the code disagree, the code is what legacy does.
- **Driven live** (the "Bench comparison" project, page 1, 1440 × 900):
  - A Select drag on empty sheet opened the region menu: the tool strip, Page Name / Sheet #
    / Scale each with ALL, Ask AI, Extract Schedule, **Auto Count**, Copy as Text, Copy as
    Image, Search as Text, New Snapshot, Crop as New Page.
  - Auto Count opened its panel and scanned at once (Mode Vector, Search pages Current page,
    Sensitivity 78 %). The box held only text, so it said "No vector linework found inside
    your selection — this sheet is likely a scan. Switch to **Image mode** to match the
    printed pixels instead."
  - The link switched to Image (Rotation search "4 — 90° steps"), which showed "Scanning
    page…" with Stop. **It was still scanning 74 s later**, on a simple one-page sheet.
  - The gear opened "Auto Count Settings — Changes apply to the next scan.": SHARED Min
    Match Spacing 60 %; VECTOR Include Mirror (off), Drop Unique Features (on), Include Text
    (on); Reset to Defaults; Save as Default.

## What exists in the new app

- The region menu exists (F11): Page Name, Sheet # and Scale with their All-pages sweeps,
  Copy as Text, Copy as Image, Search as Text, New Snapshot, Crop as New Page. Legacy puts
  Ask AI, Extract Schedule and Auto Count between Scale and Copy as Text; the first two
  belong to F14, so F13 adds **Auto Count** there alone.
- Count items and marks exist: one shape row per mark (D-32), count symbols and sizes
  (F6/F7). The session history takes a batch as one undo step (F7-S22).
- Sheets are one-page PDFs (D-42). The pdf.js stroke walk is `find/sheetStrokes.ts` and Auto
  Trace's `readSheet.ts` (D-143); the text walk is `find/sheetText.ts`.
- A Web Worker pattern exists (Auto Trace's `trace.worker.ts`, D-143).

## The behaviour

**Entry.**
- The region menu's "Auto Count" row: a Select drag past 25 px on empty sheet. No shortcut,
  no toolbar button.
- The panel is a 300 px floating, draggable panel on the right. It **scans on open**; there
  is no Scan button.
- A change of mode, pages, angles or committed settings rescans and clears the results.
- **The source sheet is pinned (Q5)** for the panel's life: the box always means the sheet
  it was drawn on.

**Panel, top to bottom.**
1. The selection preview: "Your selection — click to navigate to source".
2. Mode: Vector or Image, each with its help line.
3. Search pages: Current page, All pages, or Choose… (a filter "Filter sheets…", a checkbox
   per sheet, "No sheets match.").
4. Layers (Vector only, when the sheet has PDF layers): Auto, All layers or Specific
   ("Layer {ref} ({n} strokes)"). Changing it **does not rescan**; it re-filters the hits
   it kept, **at the "Overlap allowed" setting** (Q12).
5. Rotation search: Vector 4 or 1 (default 4); Image 8, 4, 2 or 1 (default 4).
6. Sensitivity: 10–100, default 78 or the person's last value (Q8), "Matches at or above
   {n}% are checked. Your manual checks are kept when this moves." No rescan.
7. The results grid (3 columns of cards), then "Show / Hide {n} low-confidence matches".
8. When a count item is selected: **"Add to the selected count item ({name})"** (Q18), a
   checkbox above Create, off by default.
9. **Create ({n})**, disabled when nothing is checked or the scan is saturated.

**The gear's settings** (per person on the api, Q23):
- **Shared:** **Overlap allowed** (5–95 %, default 60 %, Q12). It is legacy's Min Match
  Spacing value unchanged (the NMS IoU threshold, which already keeps more when higher); only
  its name and hint change, since legacy's hint says the opposite.
- **Vector:** Include Mirror (**on**, its amber warning when on), Drop Unique Features (on),
  Include Text (on).
- **Image:** Scale variants (3 or 1, default 3). Threads stay Auto (Q24).
- **Footer:** Reset to Defaults. Changes are saved for the person when the gear closes, and a
  change rescans then (Q20).

**States** (legacy's words, and the founder's):
- **Saturated:** "Scores look saturated — results unreliable. Select the symbol more
  tightly, then scan again." Create stays disabled (Q11).
- "Pass {k} of {N}" or "Scanning sheet {i} of {n}…" or "Scanning page…", with a bar and
  Stop. In Image mode: "Extra orientations still running — they can only add matches."
- "{n} sheets were not searched", with one reason each.
- "Scan failed" with Retry.
- No vector ink: "No vector linework found inside your selection — this sheet is likely a
  scan. Switch to **Image mode** to match the printed pixels instead." Image mode never
  shows it (legacy's defect 8).
- "Stopped before the first pass completed — no results yet" with Run again.
- "Found: 0" with advice, or Try Image mode.
- "Stopped early — {n} pass(es) completed…".

**Keys (Q21):** Esc stops a running scan; with no scan running, Esc closes the panel.

**Vector matcher.**
- **Template:** the box's strokes rasterised to 48 × 48, density-weighted.
- **Anchor:** the box's dominant closed element.
- **Sub-templates:** glyph, adjunct, interior (96 × 96) and the interior text.
- **Orientations (Q6):** the template's strokes are turned 0°, 90°, 180° and 270° about the
  box centre (Rotation search 4), and with Include Mirror each is also mirrored, exactly.
  Each orientation is scored; a window keeps its best.
- **Windows** are placed where the page has similar closed elements (0.5–2× size), plus
  generic stroke anchors. A quarter-turned window swaps width and height. A unique-stroke
  filter (Drop Unique Features) skips singletons.
- **Score:** a tolerant density-weighted F1 with ±6 % nudges, multiplied by modifiers for
  the adjunct, matching or differing interior text, and an empty interior.
- **Layer provenance** tags hits and does not drop them; Auto drops the tags.

**Image matcher (Block E).**
- **Raster:** the template is rendered at 300 DPI. A working raster is sized so the
  symbol's stroke is 3 px, frozen from the source sheet.
- **Coarse JS shortlist:** recall ≥ 0.35 at stride 6.
- **Fine pass:** stride 5, refined at stride 2, in Web Workers on row bands.
- **Score** = coverage × precision, zeroed by density, core, spread and hole gates.
- **Scale consensus:** 2 of 3 scales (0.95, 1.00, 1.05) must agree.
- **Angles:** 0° first; "8" searches all 8 (Q6).
- **Memory contract:** a modelled peak against a budget measured on the bench, rejected,
  never clamped (Q4).
- **No OpenCV** (Q3).
- **Speed target (Q2):** measured on the bench's real scans and recorded in Block E.

**Results.**
- **Shared pipeline:** NMS (centre distance 0.5 or 1/3 of the box side, or IoU above the
  overlap allowed), with **no display cap**.
- **Auto-check** when score ≥ sensitivity or ≥ 0.999.
- **Saturation:** over 50 tied at the top, with no clear gap, latches and blocks Create.
- **Valley cut** (display only): unchecked cards below the largest gap under the bar go to
  the low-confidence drawer; 0.06 minimum gap, 0.08 near-bar band, at most 20 shown,
  fallback floor 0.40.
- **Cards:** a thumbnail and "{score}%", with tooltips for match, coverage, recall,
  precision, orientation and scale.
- **Interaction:** a click checks or unchecks a card. Hover is linked both ways with the
  plan box. Boxes paint in the colour the item will get (Q19).
- **Card navigation** goes to the sheet and zooms to the match, **without rescanning** (Q5).

**Create.**
- **New item:** the standard New Measurement dialog opens (type count, name "Count"). On
  confirm, **every field is honoured** (Q13): name, folder, layer, colour, symbol, size,
  opacity, evidence links, cost row, dimensions, sub-items, rough measurement.
- **Add to the selected count item (Q18):** no dialog; the marks join that item.
- Either way:
  - one shape row per mark at each match's box centre (Q14, Q16), on each sheet;
  - **one undo step removes exactly the batch's marks** (Q17). A new item goes with them;
    marks added by hand since stay, and the item stays if any do;
  - the panel closes;
  - toast "Counted {n} symbol(s) — {name} — Ctrl+Z to undo."

## Legacy defects, and what we do

| # | Legacy | Ours |
|---|---|---|
| 1 | Clicking a card on another sheet rescans the same box on the wrong sheet; checks lost | Source pinned; navigation never rescans (Q5) |
| 2 | "8 — 45° steps" searches 4 angles (`.slice(0, 4)`) | 8 searches 8 (Q6) |
| 3 | Min Match Spacing's hint is backwards | "Overlap allowed", higher keeps more (Q12) |
| 4 | Layers re-filter at a fixed 0.6 | Uses the setting (Q12) |
| 5 | Create ignores most dialog fields | Every field honoured (Q13) |
| 6 | Review boxes always amber | The item's colour (Q19) |
| 7 | A sentinel between every mark | One shape row per mark (Q14) |
| 8 | Image mode can show the vector message | Never |
| 9 | Exclusions depend on the browser; the memory budget "not yet justified" | Measured on the bench, browser-independent (Q4) |
| 10 | Image mode still scanning at 74 s on one page | A measured speed target (Q2) |
| 11 | Stale doc headers contradict the code | PARITY §17 rewritten against the code |

## PARITY §17 against the code

Rewritten in [PARITY.md §17](../PARITY.md#17-auto-count) on adoption:
- **Vector mode:** windows anchored on the dominant closed element plus generic stroke
  anchors, scored by tolerant density-weighted F1. Not "union-find clustered components".
- **Image mode:** coverage × precision with gates, after scale consensus. Not "dilated-ink
  F1".
- **OpenCV:** dev-only and off in legacy; dropped in ours (Q3).
- **Layers:** every mode change re-derives. The control is hidden on sheets without layers,
  so "No layers found on this sheet." cannot show.
- **Rotation search:** in the panel body, not settings; legacy's "8" searches 4 angles.
- **Settings:** closing the gear with a change rescans at once.
- **Threads:** the UI offers Auto, 1–6 and 8, not "up to 16".
- **Overlay:** legacy's never takes the item colour.
- **States:** the zero state is "Found: 0" with advice; "Auto Count could not scan this
  page." is only the error fallback. A failure shows Retry only; "Run again" belongs to the
  stopped state.
- **Saturation** shows a warning and disables Create; the grid still shows every candidate.

## Design

- **Hard rule 2.** The matchers, the orientations, NMS, saturation and the valley cut are pure
  TypeScript under `lib/takeoff/autoCount/`: data in (strokes, text, a raster as bytes),
  data out (scored boxes). The pdf.js walks and rasterisation sit under
  `features/takeoff/autoCount/`, and the scan runs in a Web Worker (as Auto Trace, D-143), so
  the canvas never freezes.
- **The quantity table** gains each scoring and pipeline rule as rows, checked by hand: NMS,
  auto-check, saturation, the valley cut, settings normalisation, and the vector score on
  synthetic symbols, **including the same symbol turned 90°, 180° and 270° and mirrored,
  each found**.
- **Writing:**
  - one count item through the api's existing create and shapes endpoints, one shape row
    per mark (Q14), or the marks added to the selected item (Q18);
  - one undo step through the session history, removing exactly the batch (Q17);
  - realtime as any count.
- **Settings (Q23):** stored on the person's takeoff settings on the api (D-82), under
  `autoCount`.

## Blocks

Each is gated, quantity-tabled and smoke-tested.
- **A. Entry and panel shell:** the region-menu row, the panel (drag, close, preview, mode,
  pages, Choose, rotation), the states and Stop, Esc; a no-op matcher.
- **B. Vector matcher:** template, anchors, windows, the four quarter turns and the mirror,
  layers and provenance, run in a worker.
- **C. Review:** cards and thumbnails, check and uncheck, sensitivity, the valley-cut drawer,
  hover links, the overlay in the item's colour, card navigation without rescanning.
- **D. Create:** the dialog with every field honoured, "Add to the selected count item", one
  undo of exactly the batch, the toast.
- **F. Settings:** the popover, "Overlap allowed", persistence per person on the api.
- **E. Image matcher:** in workers, all 8 angles, scale consensus, the memory contract and
  exclusions, a measured time per page.

## Ideas (not F13)

- **A reference editor** (an erase pencil on the template) and **several reference symbols**
  per scan (Q27).
- **"Auto Count this symbol"** on a count item's menu, boxing its first mark (Q22).
- Per-card +/− examples, Checked / Unchecked / All tabs, rescan with delta review (legacy's
  plans only).

## Progress

- [x] Draft written overnight 2026-10-01 from legacy's source, plans and a live drive.
- [x] The founder's answers (D-189); spec adopted.
- [x] PARITY §17 rewritten.
- [x] Block A (D-193)
- [x] Block B (D-193): turns and mirror; three fixes beyond legacy (turn-invariant signatures, closed strokes as their own elements, tie-breaks)
- [x] Block C (D-193)
- [x] Block D (D-193)
- [x] Block F (D-193)
- [x] Block E (D-194): Image mode; measured 126 s to the first pass and 454 s a page on E102 (4 angles × 3 scales); the speed target is not met yet
